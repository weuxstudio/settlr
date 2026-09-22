import { createPublicClient, http, getAddress, parseAbiItem } from 'viem';
import { arc, arcTestnet } from 'viem/chains';
import {
  ARC_MEMO_ADDRESS,
  verifyReceipt
} from '../packages/arc-payment-core/src/index';

export interface IndexerEnv {
  DB: D1Database;
  ARC_RPC_URL?: string;
  ARC_START_BLOCK?: string;
  ARC_NETWORK?: string;
}

const memoEvent = parseAbiItem(
  'event Memo(address indexed sender, address indexed target, bytes32 callDataHash, bytes32 indexed memoId, bytes memo, uint256 memoIndex)'
);

export default {
  async scheduled(_controller: ScheduledController, env: IndexerEnv) {
    const lockOwner = crypto.randomUUID();
    const acquired = await env.DB.prepare(
      `INSERT INTO worker_locks(name, owner, expires_at) VALUES ('arc-indexer', ?, ?)
      ON CONFLICT(name) DO UPDATE SET owner = excluded.owner, expires_at = excluded.expires_at WHERE worker_locks.expires_at < ?`
    )
      .bind(lockOwner, Date.now() + 55_000, Date.now())
      .run();
    if ((acquired.meta?.changes ?? 0) !== 1) return;
    try {
      await env.DB.batch([
        env.DB.prepare(
          'DELETE FROM auth_challenges WHERE expires_at <= ?'
        ).bind(Date.now()),
        env.DB.prepare('DELETE FROM sessions WHERE expires_at <= ?').bind(
          Date.now()
        ),
        env.DB.prepare('DELETE FROM rate_limits WHERE window_start < ?').bind(
          Math.floor(Date.now() / 1000) - 3600
        )
      ]);
      const isTestnet = env.ARC_NETWORK === 'testnet';
      const network = isTestnet ? 'testnet' : 'mainnet';
      const legacyNetwork = isTestnet ? 'arc-testnet' : 'arc-mainnet';
      const client = createPublicClient({
        chain: isTestnet ? arcTestnet : arc,
        transport: http(
          env.ARC_RPC_URL ??
            (isTestnet
              ? 'https://rpc.testnet.arc.io'
              : 'https://rpc.mainnet.arc.io'),
          { timeout: 10_000, retryCount: 3, retryDelay: 1_000 }
        )
      });
      let state = await env.DB.prepare(
        'SELECT last_block FROM sync_state WHERE network = ?'
      )
        .bind(network)
        .first<{ last_block: number }>();
      if (!state && legacyNetwork !== network) {
        state = await env.DB.prepare(
          'SELECT last_block FROM sync_state WHERE network = ?'
        )
          .bind(legacyNetwork)
          .first<{ last_block: number }>();
      }
      const configuredStart = Number(env.ARC_START_BLOCK);
      if (!Number.isSafeInteger(configuredStart) || configuredStart < 0)
        throw new Error('ARC_START_BLOCK must be configured');
      const chainId = await client.getChainId();

      type RequestRow = {
        id: string;
        memo_id: `0x${string}`;
        recipient_address: string;
        amount_micro_usdc: string;
      };
      const retryAttempt = async (
        request: RequestRow,
        transactionHash: `0x${string}`
      ) => {
        let receipt;
        let transaction;
        let senderCode;
        let block;
        try {
          receipt = await client.getTransactionReceipt({
            hash: transactionHash
          });
          transaction = await client.getTransaction({
            hash: transactionHash
          });
          senderCode =
            (await client.getBytecode({ address: transaction.from })) ?? '0x';
          block = await client.getBlock({
            blockNumber: receipt.blockNumber ?? 0n
          });
        } catch (error) {
          console.warn(
            'Arc transaction verification delayed by the RPC provider',
            error
          );
          await env.DB.prepare(
            `UPDATE verification_attempts
             SET state = 'delayed', reason = ?, attempts = attempts + 1,
                 next_attempt_at = ?, updated_at = ?
             WHERE request_id = ? AND transaction_hash = ? AND network IN (?, ?)`
          )
            .bind(
              'Transaction not committed yet',
              Date.now() + 30_000,
              new Date().toISOString(),
              request.id,
              transactionHash.toLowerCase(),
              network,
              legacyNetwork
            )
            .run();
          return;
        }
        const result = verifyReceipt(
          receipt,
          {
            memoId: request.memo_id,
            recipient: getAddress(request.recipient_address),
            amount: BigInt(request.amount_micro_usdc)
          },
          chainId,
          {
            hash: transaction.hash,
            from: transaction.from,
            fromCode: senderCode,
            to: transaction.to,
            input: transaction.input
          }
        );
        if (!result.ok) {
          await env.DB.prepare(
            `UPDATE verification_attempts
             SET state = 'rejected', reason = ?, attempts = attempts + 1,
                 next_attempt_at = ?, updated_at = ?
             WHERE request_id = ? AND transaction_hash = ? AND network IN (?, ?)`
          )
            .bind(
              result.reason,
              Date.now() + 300_000,
              new Date().toISOString(),
              request.id,
              transactionHash.toLowerCase(),
              network,
              legacyNetwork
            )
            .run();
          return;
        }
        const amountMicroUsdc =
          result.transfer.decimals === 18
            ? result.transfer.value / 1_000_000_000_000n
            : result.transfer.value;
        await env.DB.prepare(
          `INSERT OR IGNORE INTO payments
          (id, request_id, transaction_hash, log_index, payer_address, amount_micro_usdc, block_number, block_timestamp, received_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(
            `${network}:${transactionHash.toLowerCase()}:${result.transfer.logIndex}`,
            request.id,
            transactionHash.toLowerCase(),
            result.transfer.logIndex,
            result.transfer.from,
            amountMicroUsdc.toString(),
            Number(receipt.blockNumber ?? 0n),
            new Date(Number(block.timestamp) * 1000).toISOString(),
            new Date().toISOString()
          )
          .run();
        await env.DB.prepare(
          `UPDATE verification_attempts
           SET state = 'verified', reason = NULL, next_attempt_at = ?,
               updated_at = ?
           WHERE request_id = ? AND transaction_hash = ? AND network IN (?, ?)`
        )
          .bind(
            Date.now(),
            new Date().toISOString(),
            request.id,
            transactionHash.toLowerCase(),
            network,
            legacyNetwork
          )
          .run();
        await env.DB.prepare(
          `INSERT INTO verification_attempts(request_id, network, transaction_hash, state, reason, attempts, next_attempt_at, created_at, updated_at)
           VALUES (?, ?, ?, 'verified', NULL, 1, ?, ?, ?)
           ON CONFLICT(network, transaction_hash) DO UPDATE SET state = 'verified', reason = NULL, updated_at = excluded.updated_at`
        )
          .bind(
            request.id,
            network,
            transactionHash.toLowerCase(),
            Date.now(),
            new Date().toISOString(),
            new Date().toISOString()
          )
          .run();
      };

      const dueAttempts = await env.DB.prepare(
        `SELECT request_id, transaction_hash FROM verification_attempts
         WHERE network IN (?, ?) AND state IN ('pending', 'delayed')
           AND next_attempt_at <= ? ORDER BY next_attempt_at ASC LIMIT 50`
      )
        .bind(network, legacyNetwork, Date.now())
        .all<{ request_id: string; transaction_hash: `0x${string}` }>();
      for (const attempt of dueAttempts.results ?? []) {
        const request = await env.DB.prepare(
          'SELECT id, memo_id, recipient_address, amount_micro_usdc FROM payment_requests WHERE id = ?'
        )
          .bind(attempt.request_id)
          .first<RequestRow>();
        if (request) await retryAttempt(request, attempt.transaction_hash);
      }

      // Recovery attempts must run before the block scan. A provider limit on
      // eth_getLogs must never prevent a submitted payment from being retried.
      const latest = await client.getBlockNumber();
      const fromBlock = BigInt((state?.last_block ?? configuredStart - 1) + 1);
      const maxBlocksPerScan = 500n;
      const toBlock =
        fromBlock > latest
          ? latest
          : fromBlock + maxBlocksPerScan - 1n > latest
            ? latest
            : fromBlock + maxBlocksPerScan - 1n;
      let memoLogs: Awaited<ReturnType<typeof client.getLogs>> = [];
      if (fromBlock <= latest) {
        try {
          memoLogs = await client.getLogs({
            address: ARC_MEMO_ADDRESS,
            event: memoEvent,
            fromBlock,
            toBlock
          });
        } catch (error) {
          console.warn('Arc memo log scan delayed by the RPC provider', error);
          return;
        }
      }

      for (const memoLog of memoLogs) {
        const memoId = memoLog.args.memoId;
        const transactionHash = memoLog.transactionHash;
        if (!memoId || !transactionHash) continue;
        const normalizedTransactionHash = transactionHash.toLowerCase();
        const request = await env.DB.prepare(
          'SELECT id, memo_id, recipient_address, amount_micro_usdc FROM payment_requests WHERE memo_id = ?'
        )
          .bind(memoId)
          .first<RequestRow>();
        if (!request) continue;
        await env.DB.prepare(
          `INSERT OR IGNORE INTO verification_attempts
          (request_id, network, transaction_hash, state, reason, attempts, next_attempt_at, created_at, updated_at)
          VALUES (?, ?, ?, 'pending', NULL, 0, ?, ?, ?)`
        )
          .bind(
            request.id,
            network,
            normalizedTransactionHash,
            Date.now(),
            new Date().toISOString(),
            new Date().toISOString()
          )
          .run();
        await retryAttempt(request, transactionHash);
      }

      const refreshed = await env.DB.prepare(
        'UPDATE worker_locks SET expires_at = ? WHERE name = ? AND owner = ? AND expires_at > ?'
      )
        .bind(Date.now() + 55_000, 'arc-indexer', lockOwner, Date.now())
        .run();
      if ((refreshed.meta?.changes ?? 0) !== 1) return;

      await env.DB.prepare(
        'INSERT INTO sync_state(network, last_block, updated_at) VALUES (?, ?, ?) ON CONFLICT(network) DO UPDATE SET last_block = excluded.last_block, updated_at = excluded.updated_at'
      )
        .bind(network, Number(toBlock), new Date().toISOString())
        .run();
    } finally {
      await env.DB.prepare(
        "DELETE FROM worker_locks WHERE name = 'arc-indexer' AND owner = ?"
      )
        .bind(lockOwner)
        .run();
    }
  }
};
