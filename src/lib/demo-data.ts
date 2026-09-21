// Sample workspace shown by the interface while no wallet is connected.
//
// Every payment record below is a real Arc mainnet settlement:
//   block 21995547, 2026 09 21 10:34:28 UTC, 3.50 USDC, full settlement, memo tag memomatch:v1
//     https://explorer.arc.io/tx/0x783440022c6c7d437ec9ed11ca2f3a81006b89062de15bfd71d2521173d340aa
//   block 21996007, 2026 09 21 10:38:21 UTC, 2.22 USDC, part payment, memo tag memomatch:v1
//     https://explorer.arc.io/tx/0xf9cb51fe20c32f02f2a10ef1f9a1ac984e83350e2c88c65d258a032656ef0f03
//   block 22005266, 2026 09 21 11:56:38 UTC, 1.50 USDC, full settlement, memo tag settlr:v1
//     https://explorer.arc.io/tx/0xaedc5b0392164cd655be7aa2d0785e8d0cc67bd4aba5a9cf69b456b6bac873b2
//   block 22011190, 2026 09 21 12:46:44 UTC, 5.00 USDC of 33.65, part payment, memo tag settlr:v1
//     https://explorer.arc.io/tx/0x3ca832f46977b3109601e22eabf8c8c464a47c44953bb28e65fef59c1326a9c5
//
// All four carry a memo reference to the Arc Memo contract and were verified by
// the same module the running app uses. Payment times and on chain values are
// taken from those transactions. The creation times of the two older requests
// are placeholders. The Willow Labs and Liquid Solution Studios requests use the
// creation times, tokens and public fields returned by the running app.
// Requests without a payment record stay open and claim nothing.
import { deriveStatus } from '$core/index';
import { formatUsdcBaseUnits, parseUsdc } from '$lib/format';
import type { DashboardStats, PaymentRequest } from './types';

export const demoRequests: PaymentRequest[] = [
  {
    id: 'req_9af72d',
    token: '0x9af72d21d82e0cb6a95aa6430492c33ee09ab000231f36f28e62bbcacf2b8a01',
    memoId:
      '0xcc02f26ea318817338dbae0ce2660b9b563d255a60a25bfc0a76479c7aebff8e',
    title: 'Website Redesign',
    publicDescription: 'Website Redesign',
    requesterName: 'Liquid Solution Studios',
    amount: '33.65',
    paid: '5.00',
    recipient: '0xe0a52194a79da1c44ed14167c2ee0b8f934dd13c',
    createdAt: '2026-09-21T12:46:09.000Z',
    payments: [
      {
        id: 'payment_4',
        amount: '5.00',
        payer: '0x0053f2e91ab1c70f72048e6e27ba884156dc0298',
        transactionHash:
          '0x3ca832f46977b3109601e22eabf8c8c464a47c44953bb28e65fef59c1326a9c5',
        logIndex: 35,
        blockNumber: 22011190,
        receivedAt: '2026-09-21T12:46:44.000Z',
        explorerUrl:
          'https://explorer.arc.io/tx/0x3ca832f46977b3109601e22eabf8c8c464a47c44953bb28e65fef59c1326a9c5',
        verification: 'verified'
      }
    ]
  },
  {
    id: 'req_7d2f10',
    token: 'pay_demo_7d2f10',
    memoId:
      '0x931a757b660c147089ce4f69672c7c59039c977ca769d856d5eeb9f7a7da082d',
    title: 'Website Design',
    publicDescription: 'Website Design',
    requesterName: 'Willow Labs',
    publicReference: 'INV-2026-09-002',
    amount: '1.50',
    paid: '1.50',
    recipient: '0x0053f2e91ab1c70f72048e6e27ba884156dc0298',
    createdAt: '2026-09-21T11:55:53.000Z',
    payments: [
      {
        id: 'payment_3',
        amount: '1.50',
        payer: '0xe0a52194a79da1c44ed14167c2ee0b8f934dd13c',
        transactionHash:
          '0xaedc5b0392164cd655be7aa2d0785e8d0cc67bd4aba5a9cf69b456b6bac873b2',
        logIndex: 8,
        blockNumber: 22005266,
        receivedAt: '2026-09-21T11:56:38.000Z',
        explorerUrl:
          'https://explorer.arc.io/tx/0xaedc5b0392164cd655be7aa2d0785e8d0cc67bd4aba5a9cf69b456b6bac873b2',
        verification: 'verified'
      }
    ]
  },
  {
    id: 'req_8f3a1d',
    token: 'pay_demo_8f3a1d',
    memoId:
      '0x92a292f056a58a6f020d6060c198144e6eac05a7833499ed9a477aea66ebfefd',
    title: 'Website audit, Sept. 2026',
    publicDescription: 'Website audit, September 2026',
    requesterName: 'Settlr Labs',
    publicReference: 'INV-2026-26-005',
    dueDate: '2026-09-30',
    amount: '3.50',
    paid: '3.50',
    recipient: '0x0053f2e91ab1c70f72048e6e27ba884156dc0298',
    createdAt: '2026-09-21T10:20:00.000Z',
    payments: [
      {
        id: 'payment_1',
        amount: '3.50',
        payer: '0xe0a52194a79da1c44ed14167c2ee0b8f934dd13c',
        transactionHash:
          '0x783440022c6c7d437ec9ed11ca2f3a81006b89062de15bfd71d2521173d340aa',
        blockNumber: 21995547,
        receivedAt: '2026-09-21T10:34:28.000Z',
        explorerUrl:
          'https://explorer.arc.io/tx/0x783440022c6c7d437ec9ed11ca2f3a81006b89062de15bfd71d2521173d340aa',
        verification: 'verified'
      }
    ]
  },
  {
    id: 'req_a27c9e',
    token: 'pay_demo_a27c9e',
    memoId:
      '0x8e80c34118efa31d678b51bd9b4ff92c40604839dd6187d8d021bd081e58d3d5',
    title: 'Arc integration sprint',
    publicDescription: 'Arc integration sprint, September 2026',
    requesterName: 'Settlr Labs',
    publicReference: 'INV-2026-26-004',
    dueDate: '2026-09-28',
    amount: '10.00',
    paid: '2.22',
    recipient: '0xe0a52194a79da1c44ed14167c2ee0b8f934dd13c',
    createdAt: '2026-09-21T10:22:00.000Z',
    payments: [
      {
        id: 'payment_2',
        amount: '2.22',
        payer: '0x0053f2e91ab1c70f72048e6e27ba884156dc0298',
        transactionHash:
          '0xf9cb51fe20c32f02f2a10ef1f9a1ac984e83350e2c88c65d258a032656ef0f03',
        blockNumber: 21996007,
        receivedAt: '2026-09-21T10:38:21.000Z',
        explorerUrl:
          'https://explorer.arc.io/tx/0xf9cb51fe20c32f02f2a10ef1f9a1ac984e83350e2c88c65d258a032656ef0f03',
        verification: 'verified'
      }
    ]
  },
  {
    id: 'req_c51b8e',
    token: 'pay_demo_c51b8e',
    memoId:
      '0xb8a43139d6cec73ef2da88623044de37022239d9ddade3600c44af22c803a376',
    title: 'Design system review',
    publicDescription: 'Design system review',
    requesterName: 'Settlr Labs',
    publicReference: 'DS-REVIEW-03',
    dueDate: '2026-09-30',
    amount: '8.00',
    paid: '0.00',
    recipient: '0x0053f2e91ab1c70f72048e6e27ba884156dc0298',
    createdAt: '2026-09-15T12:18:00.000Z',
    payments: []
  },
  {
    id: 'req_32de44',
    token: 'pay_demo_32de44',
    memoId:
      '0x7734903b24504dd9fdee6663687dbf3db0372bb6a2b2712a592ff42a71671789',
    title: 'Mainnet workshop deposit',
    publicDescription: 'Mainnet workshop deposit',
    requesterName: 'Settlr Labs',
    publicReference: 'WORKSHOP-2026',
    dueDate: '2026-09-22',
    amount: '24.00',
    paid: '0.00',
    recipient: '0x0053f2e91ab1c70f72048e6e27ba884156dc0298',
    createdAt: '2026-09-13T10:05:00.000Z',
    payments: []
  }
];

/**
 * The headline figures are derived from the requests above, so the preview can
 * never show a total that contradicts the payment records it lists.
 */
function summarize(requests: PaymentRequest[]): DashboardStats {
  let collected = 0n;
  let outstanding = 0n;
  let paidCount = 0;
  const settlementMinutes: number[] = [];

  for (const request of requests) {
    const amount = parseUsdc(request.amount);
    const paid = parseUsdc(request.paid);
    collected += paid;
    if (amount > paid) outstanding += amount - paid;
    const status = deriveStatus(amount, paid);
    if (status === 'Paid' || status === 'Overpaid') paidCount += 1;
    const latest = request.payments[request.payments.length - 1];
    if (latest) {
      const minutes =
        (new Date(latest.receivedAt).getTime() -
          new Date(request.createdAt).getTime()) /
        60_000;
      if (Number.isFinite(minutes) && minutes >= 0)
        settlementMinutes.push(minutes);
    }
  }

  const average = settlementMinutes.length
    ? Math.max(
        1,
        Math.round(
          settlementMinutes.reduce((total, value) => total + value, 0) /
            settlementMinutes.length
        )
      )
    : 0;

  return {
    outstanding: formatUsdcBaseUnits(outstanding),
    collected: formatUsdcBaseUnits(collected),
    paidCount,
    averageSettlement: average ? `${average}m` : 'No settlements yet'
  };
}

export const demoStats: DashboardStats = summarize(demoRequests);
