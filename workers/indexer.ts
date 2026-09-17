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
      const network = isTestnet ? 'arc-testnet' : 'arc-mainnet';
      const client = createPublicClient({
        chain: isTestnet ? arcTestnet : arc,
        transport: http(
          env.ARC_RPC_URL ??
            (isTestnet
              ? 'https://rpc.testnet.arc.io'
              : 'https://rpc.mainnet.arc.io')
        )
      });
      const state = await env.DB.prepare(
        'SELECT last_block FROM sync_state WHERE network = ?'
      )
        .bind(network)
        .first<{ last_block: number }>();
      const configuredStart = Number(env.ARC_START_BLOCK);
      if (!Number.isSafeInteger(configuredStart) || configuredStart < 0)
        throw new Error('ARC_START_BLOCK must be configured');
      const latest = await client.getBlockNumber();
      const fromBlock = BigInt((state?.last_block ?? configuredStart - 1) + 1);
      if (fromBlock > latest) return;
      const toBlock = fromBlock + 2000n > latest ? latest : fromBlock + 2000n;
      const memoLogs = await client.getLogs({
        address: ARC_MEMO_ADDRESS,
        event: memoEvent,
        fromBlock,
        toBlock
      });
      const chainId = await client.getChainId();

      for (const memoLog of memoLogs) {
        const memoId = memoLog.args.memoId;
        const transactionHash = memoLog.transactionHash;
        if (!memoId || !transactionHash) continue;
        const normalizedTransactionHash = transactionHash.toLowerCase();
        const request = await env.DB.prepare(
          'SELECT id, recipient_address, amount_micro_usdc FROM payment_requests WHERE memo_id = ?'
        )
          .bind(memoId)
          .first<{
            id: string;
            recipient_address: string;
            amount_micro_usdc: string;
          }>();
        if (!request) continue;
        const [receipt, transaction] = await Promise.all([
          client.getTransactionReceipt({ hash: transactionHash }),
          client.getTransaction({ hash: transactionHash })
        ]);
        const senderCode =
          (await client.getBytecode({ address: transaction.from })) ?? '0x';
        const result = verifyReceipt(
          receipt,
          {
            memoId,
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
            `INSERT INTO verification_attempts(request_id, network, transaction_hash, state, reason, attempts, next_attempt_at, created_at, updated_at)
            VALUES (?, ?, ?, 'rejected', ?, 1, ?, ?, ?)
            ON CONFLICT(network, transaction_hash) DO UPDATE SET state = 'rejected', reason = excluded.reason, attempts = verification_attempts.attempts + 1, updated_at = excluded.updated_at`
          )
            .bind(
              request.id,
              network,
              transactionHash.toLowerCase(),
              result.reason,
              Date.now() + 300_000,
              new Date().toISOString(),
              new Date().toISOString()
            )
            .run();
          continue;
        }
        const block = await client.getBlock({
          blockNumber: receipt.blockNumber ?? 0n
        });
        const amountMicroUsdc = result.transfer.value / 1_000_000_000_000n;
        await env.DB.prepare(
          `INSERT OR IGNORE INTO payments
          (id, request_id, transaction_hash, log_index, payer_address, amount_micro_usdc, block_number, block_timestamp, received_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(
            `${network}:${transactionHash.toLowerCase()}:${result.transfer.logIndex}`,
            request.id,
            normalizedTransactionHash,
            result.transfer.logIndex,
            result.transfer.from,
            amountMicroUsdc.toString(),
            Number(receipt.blockNumber ?? 0n),
            new Date(Number(block.timestamp) * 1000).toISOString(),
            new Date().toISOString()
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
