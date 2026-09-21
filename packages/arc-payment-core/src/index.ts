import {
  decodeEventLog,
  decodeFunctionData,
  encodeFunctionData,
  getAddress,
  hexToString,
  keccak256,
  parseAbi,
  toHex,
  type Address,
  type Hex,
  type Log,
  type TransactionReceipt
} from 'viem';

export const ARC_CHAIN_ID = 5042;
export const ARC_TESTNET_CHAIN_ID = 5042002;
export const ARC_USDC_ADDRESS =
  '0x3600000000000000000000000000000000000000' as Address;
export const ARC_MEMO_ADDRESS =
  '0x5294E9927c3306DcBaDb03fe70b92e01cCede505' as Address;
export const MEMO_FORMAT = 'settlr:v1' as const;
export const LEGACY_MEMO_FORMAT = 'memomatch:v1' as const;
export const SUPPORTED_MEMO_FORMATS = [MEMO_FORMAT, LEGACY_MEMO_FORMAT] as const;
export const ARC_SYSTEM_USDC_EMITTER =
  '0xffffFFFfFFffffffffffffffFfFFFfffFFFfFFfE' as Address;
export const TRANSFER_TOPIC =
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef' as Hex;

export const memoAbi = parseAbi([
  'function memo(address target, bytes data, bytes32 memoId, bytes memoData)',
  'event Memo(address indexed sender, address indexed target, bytes32 callDataHash, bytes32 indexed memoId, bytes memo, uint256 memoIndex)'
]);

export const erc20Abi = parseAbi([
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address owner) view returns (uint256)'
]);

export type ArcPaymentStatus = 'Open' | 'Partially paid' | 'Paid' | 'Overpaid';

export type TransferCandidate = {
  emitter: Address;
  from: Address;
  to: Address;
  value: bigint;
  decimals: 6 | 18;
  logIndex: number;
};

export type PaymentRequestForVerification = {
  memoId: Hex;
  recipient: Address;
  expectedPayer?: Address;
  amount?: bigint;
};

export type PaymentTransaction = {
  hash: Hex;
  from: Address;
  fromCode: Hex;
  to?: Address;
  input: Hex;
};

export type VerifiedTransfer = TransferCandidate & {
  transactionHash: Hex;
  blockNumber: bigint;
  decimals: 6 | 18;
};

export type VerificationResult =
  { ok: true; transfer: VerifiedTransfer } | { ok: false; reason: string };

export function makeMemoId(): Hex {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `0x${Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('')}` as Hex;
}

export function makePaymentCall(recipient: Address, amount: bigint) {
  const data = encodeFunctionData({
    abi: erc20Abi,
    functionName: 'transfer',
    args: [getAddress(recipient), amount]
  });

  return {
    target: ARC_USDC_ADDRESS,
    data,
    memoId: makeMemoId(),
    memoData: toHex(MEMO_FORMAT)
  };
}

export function encodePaymentCall(
  recipient: Address,
  amount: bigint,
  memoId: Hex,
  memoData = toHex(MEMO_FORMAT)
) {
  return {
    address: ARC_MEMO_ADDRESS,
    abi: memoAbi,
    functionName: 'memo' as const,
    args: [
      ARC_USDC_ADDRESS,
      encodeFunctionData({
        abi: erc20Abi,
        functionName: 'transfer',
        args: [getAddress(recipient), amount]
      }),
      memoId,
      memoData
    ] as const
  };
}

function decodeTransferLog(
  log: Log,
  decimals: 6 | 18
): TransferCandidate | null {
  if (
    !log.topics?.[0] ||
    log.topics[0] !== TRANSFER_TOPIC ||
    log.topics.length < 3
  )
    return null;
  try {
    const from = getAddress(`0x${log.topics[1]?.slice(-40)}`);
    const to = getAddress(`0x${log.topics[2]?.slice(-40)}`);
    const value = BigInt(log.data);
    return {
      emitter: getAddress(log.address),
      from,
      to,
      value,
      decimals,
      logIndex: Number(log.logIndex ?? 0)
    };
  } catch {
    return null;
  }
}

export function extractUniqueTransfers(
  receipt: TransactionReceipt
): TransferCandidate[] {
  const systemTransfers = receipt.logs
    .filter(
      (log) =>
        log.address.toLowerCase() === ARC_SYSTEM_USDC_EMITTER.toLowerCase()
    )
    .map((log) => decodeTransferLog(log, 18))
    .filter((log): log is TransferCandidate => Boolean(log));

  return systemTransfers;
}

export function deriveStatus(
  expectedAmount: bigint,
  paidAmount: bigint
): ArcPaymentStatus {
  if (paidAmount === 0n) return 'Open';
  if (paidAmount < expectedAmount) return 'Partially paid';
  if (paidAmount === expectedAmount) return 'Paid';
  return 'Overpaid';
}

export function verifyReceipt(
  receipt: TransactionReceipt,
  request: PaymentRequestForVerification,
  chainId: number,
  transaction?: PaymentTransaction
): VerificationResult {
  if (chainId !== ARC_CHAIN_ID && chainId !== ARC_TESTNET_CHAIN_ID)
    return { ok: false, reason: 'Unsupported network' };
  if (receipt.status !== 'success')
    return { ok: false, reason: 'Transaction reverted' };
  if (receipt.transactionHash.toLowerCase() !== transaction?.hash.toLowerCase())
    return { ok: false, reason: 'Receipt does not match transaction' };

  if (
    !transaction ||
    transaction.to?.toLowerCase() !== ARC_MEMO_ADDRESS.toLowerCase()
  ) {
    return { ok: false, reason: 'Memo transaction details unavailable' };
  }
  if (transaction.fromCode !== '0x')
    return { ok: false, reason: 'Contract wallets are not supported' };

  let outerCall: { functionName: string; args?: readonly unknown[] };
  try {
    outerCall = decodeFunctionData({ abi: memoAbi, data: transaction.input });
  } catch {
    return { ok: false, reason: 'Unsupported memo transaction' };
  }
  if (
    outerCall.functionName !== 'memo' ||
    !outerCall.args ||
    outerCall.args.length !== 4
  ) {
    return { ok: false, reason: 'Unsupported memo transaction' };
  }
  const [outerTarget, outerData, outerMemoId, outerMemoData] =
    outerCall.args as [Address, Hex, Hex, Hex];
  if (
    outerTarget.toLowerCase() !== ARC_USDC_ADDRESS.toLowerCase() ||
    outerMemoId.toLowerCase() !== request.memoId.toLowerCase()
  ) {
    return { ok: false, reason: 'Memo call does not match request' };
  }
  let memoFormat: string;
  try {
    memoFormat = hexToString(outerMemoData);
  } catch {
    return { ok: false, reason: 'Unsupported memo format' };
  }
  if (!(SUPPORTED_MEMO_FORMATS as readonly string[]).includes(memoFormat)) {
    return { ok: false, reason: 'Unsupported memo format' };
  }
  if (transaction.from.toLowerCase() === request.recipient.toLowerCase()) {
    return { ok: false, reason: 'Self payment is not supported' };
  }

  const memoEvents = receipt.logs
    .filter(
      (log) => log.address.toLowerCase() === ARC_MEMO_ADDRESS.toLowerCase()
    )
    .map((log) => {
      try {
        return decodeEventLog({
          abi: memoAbi,
          data: log.data,
          topics: log.topics
        });
      } catch {
        return null;
      }
    })
    .filter(
      (event) =>
        event?.eventName === 'Memo' &&
        event.args.memoId?.toLowerCase() === request.memoId.toLowerCase()
    );

  if (memoEvents.length !== 1)
    return {
      ok: false,
      reason:
        memoEvents.length === 0
          ? 'Memo reference not found'
          : 'Ambiguous memo reference'
    };
  const memo = memoEvents[0];
  if (!memo) return { ok: false, reason: 'Memo reference not found' };

  const memoArgs = memo.args as {
    sender?: Address;
    target?: Address;
    callDataHash?: Hex;
    memoId?: Hex;
    memo?: Hex;
  };
  if (
    memoArgs.sender?.toLowerCase() !== transaction.from.toLowerCase() ||
    memoArgs.target?.toLowerCase() !== ARC_USDC_ADDRESS.toLowerCase()
  ) {
    return { ok: false, reason: 'Unsupported memo target' };
  }
  if (
    !memoArgs.callDataHash ||
    memoArgs.callDataHash.toLowerCase() !== keccak256(outerData).toLowerCase()
  ) {
    return { ok: false, reason: 'Memo calldata hash mismatch' };
  }
  if (memoArgs.memo?.toLowerCase() !== outerMemoData.toLowerCase()) {
    return { ok: false, reason: 'Memo data mismatch' };
  }

  let call: { functionName: string; args?: readonly unknown[] };
  try {
    call = decodeFunctionData({ abi: erc20Abi, data: outerData });
  } catch {
    return { ok: false, reason: 'Unsupported memo call' };
  }

  if (
    call.functionName !== 'transfer' ||
    !call.args ||
    call.args.length !== 2
  ) {
    return { ok: false, reason: 'Unsupported memo call' };
  }

  const [callRecipient, callAmount] = call.args as [Address, bigint];
  if (
    callRecipient.toLowerCase() !== request.recipient.toLowerCase() ||
    callAmount <= 0n
  ) {
    return { ok: false, reason: 'Memo call does not match request' };
  }

  const transfers = extractUniqueTransfers(receipt);
  const matchingTransfers = transfers.filter(
    (item) =>
      item.to.toLowerCase() === request.recipient.toLowerCase() &&
      item.value === callAmount * 1_000_000_000_000n &&
      item.from.toLowerCase() === transaction.from.toLowerCase() &&
      (!request.expectedPayer ||
        item.from.toLowerCase() === request.expectedPayer.toLowerCase())
  );

  if (matchingTransfers.length !== 1)
    return {
      ok: false,
      reason:
        matchingTransfers.length === 0
          ? 'Matching transfer not found'
          : 'Ambiguous transfer'
    };
  const [transfer] = matchingTransfers;

  return {
    ok: true,
    transfer: {
      ...transfer,
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber ?? 0n,
      decimals: transfer.decimals
    }
  };
}

export function dedupeKey(
  network: string,
  transactionHash: string,
  logIndex: number
) {
  return `${network}:${transactionHash.toLowerCase()}:${logIndex}`;
}
