import { describe, expect, it } from 'vitest';
import {
  ARC_CHAIN_ID,
  ARC_MEMO_ADDRESS,
  ARC_SYSTEM_USDC_EMITTER,
  ARC_USDC_ADDRESS,
  LEGACY_MEMO_FORMAT,
  MEMO_FORMAT,
  TRANSFER_TOPIC,
  dedupeKey,
  deriveStatus,
  encodePaymentCall,
  extractUniqueTransfers,
  makeMemoId,
  verifyReceipt
} from '$core/index';
import type { TransactionReceipt } from 'viem';
import {
  encodeAbiParameters,
  encodeEventTopics,
  encodeFunctionData,
  keccak256,
  toHex
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { formatUsdcBaseUnits, parseUsdc } from '$lib/format';

describe('Arc payment core', () => {
  it('derives payment statuses from integer amounts', () => {
    expect(deriveStatus(10_000_000n, 0n)).toBe('Open');
    expect(deriveStatus(10_000_000n, 4_000_000n)).toBe('Partially paid');
    expect(deriveStatus(10_000_000n, 10_000_000n)).toBe('Paid');
    expect(deriveStatus(10_000_000n, 10_000_001n)).toBe('Overpaid');
  });

  it('creates independent memo references and idempotency keys', () => {
    expect(makeMemoId()).toMatch(/^0x[0-9a-f]{64}$/);
    expect(makeMemoId()).not.toBe(makeMemoId());
    expect(dedupeKey('arc-mainnet', '0xABC', 2)).toBe('arc-mainnet:0xabc:2');
  });

  it('recognizes the Arc system transfer unit separately from ERC-20 units', () => {
    const from = '0x1111111111111111111111111111111111111111';
    const to = '0x2222222222222222222222222222222222222222';
    const receipt = {
      status: 'success',
      transactionHash: `0x${'ab'.repeat(32)}`,
      blockNumber: 5042n,
      logs: [
        {
          address: ARC_SYSTEM_USDC_EMITTER,
          topics: [
            TRANSFER_TOPIC,
            `0x${from.slice(2).padStart(64, '0')}`,
            `0x${to.slice(2).padStart(64, '0')}`
          ],
          data: `0x${250_000_000_000_000_000n.toString(16).padStart(64, '0')}`,
          logIndex: 3
        }
      ]
    } as unknown as TransactionReceipt;

    const [transfer] = extractUniqueTransfers(receipt);
    expect(transfer.decimals).toBe(18);
    expect(transfer.value).toBe(250_000_000_000_000_000n);
  });

  it('keeps six-decimal USDC values exact in the UI formatter', () => {
    const amount = parseUsdc('1000000000000.000001');
    expect(amount).toBe(1_000_000_000_000_000_001n);
    expect(formatUsdcBaseUnits(amount)).toBe('1,000,000,000,000.000001');
  });

  it('verifies a partial native Arc memo transfer against transaction calldata', () => {
    const sender = privateKeyToAccount(`0x${'11'.repeat(32)}`);
    const recipient =
      '0x2222222222222222222222222222222222222222' as `0x${string}`;
    const memoId = `0x${'ab'.repeat(32)}` as `0x${string}`;
    const amount = 4_000_000n;
    const call = encodePaymentCall(recipient, amount, memoId);
    const input = encodeFunctionData({
      abi: call.abi,
      functionName: call.functionName,
      args: call.args
    });
    const nativeValue = amount * 1_000_000_000_000n;
    const receipt = {
      status: 'success',
      transactionHash: `0x${'cd'.repeat(32)}`,
      blockNumber: 12n,
      logs: [
        {
          address: ARC_SYSTEM_USDC_EMITTER,
          topics: [
            TRANSFER_TOPIC,
            toHex(BigInt(sender.address), { size: 32 }),
            toHex(BigInt(recipient), { size: 32 })
          ],
          data: toHex(nativeValue, { size: 32 }),
          logIndex: 0
        },
        {
          address: ARC_MEMO_ADDRESS,
          topics: encodeEventTopics({
            abi: call.abi,
            eventName: 'Memo',
            args: { sender: sender.address, target: ARC_USDC_ADDRESS, memoId }
          }),
          data: encodeAbiParameters(
            [{ type: 'bytes32' }, { type: 'bytes' }, { type: 'uint256' }],
            [keccak256(call.args[1]), toHex(MEMO_FORMAT), 0n]
          ),
          logIndex: 1
        }
      ]
    } as unknown as TransactionReceipt;
    const result = verifyReceipt(
      receipt,
      { memoId, recipient, amount: 10_000_000n },
      ARC_CHAIN_ID,
      {
        hash: receipt.transactionHash,
        from: sender.address,
        fromCode: '0x',
        to: ARC_MEMO_ADDRESS,
        input
      }
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.transfer.value).toBe(nativeValue);
  });

  it('rejects memo calldata hash tampering and duplicate matching transfers', () => {
    const sender = privateKeyToAccount(`0x${'12'.repeat(32)}`);
    const recipient =
      '0x3333333333333333333333333333333333333333' as `0x${string}`;
    const memoId = `0x${'bc'.repeat(32)}` as `0x${string}`;
    const call = encodePaymentCall(
      recipient,
      1_000_000n,
      memoId,
      toHex(LEGACY_MEMO_FORMAT)
    );
    const input = encodeFunctionData({
      abi: call.abi,
      functionName: call.functionName,
      args: call.args
    });
    const topics = encodeEventTopics({
      abi: call.abi,
      eventName: 'Memo',
      args: { sender: sender.address, target: ARC_USDC_ADDRESS, memoId }
    });
    const transfer = {
      address: ARC_SYSTEM_USDC_EMITTER,
      topics: [
        TRANSFER_TOPIC,
        toHex(BigInt(sender.address), { size: 32 }),
        toHex(BigInt(recipient), { size: 32 })
      ],
      data: toHex(1_000_000_000_000_000_000n, { size: 32 }),
      logIndex: 0
    };
    const receipt = {
      status: 'success',
      transactionHash: `0x${'ef'.repeat(32)}`,
      blockNumber: 13n,
      logs: [
        transfer,
        transfer,
        {
          address: ARC_MEMO_ADDRESS,
          topics,
          data: encodeAbiParameters(
            [{ type: 'bytes32' }, { type: 'bytes' }, { type: 'uint256' }],
            [`0x${'00'.repeat(32)}`, toHex('memomatch:v1'), 0n]
          ),
          logIndex: 1
        }
      ]
    } as unknown as TransactionReceipt;
    expect(
      verifyReceipt(receipt, { memoId, recipient }, ARC_CHAIN_ID, {
        hash: receipt.transactionHash,
        from: sender.address,
        fromCode: '0x',
        to: ARC_MEMO_ADDRESS,
        input
      })
    ).toEqual({ ok: false, reason: 'Memo calldata hash mismatch' });
  });
});
