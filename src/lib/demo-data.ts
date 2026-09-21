// Sample workspace shown by the interface while no wallet is connected.
//
// The two payment records below are real Arc mainnet settlements, not mock ups:
//   block 21995547, 2026 09 21 10:34 UTC, 3.50 USDC, full settlement
//     https://explorer.arc.io/tx/0x783440022c6c7d437ec9ed11ca2f3a81006b89062de15bfd71d2521173d340aa
//   block 21996007, 2026 09 21 10:38 UTC, 2.22 USDC, part payment
//     https://explorer.arc.io/tx/0xf9cb51fe20c32f02f2a10ef1f9a1ac984e83350e2c88c65d258a032656ef0f03
//
// Both carry a memo reference to the Arc Memo contract and are verified by the
// same module the running app uses. The remaining requests stay open and carry
// no payment record.
import type { DashboardStats, PaymentRequest } from './types';

export const demoRequests: PaymentRequest[] = [
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
        receivedAt: '2026-09-21T10:34:00.000Z',
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
        receivedAt: '2026-09-21T10:38:00.000Z',
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

export const demoStats: DashboardStats = {
  outstanding: '39.78',
  collected: '5.72',
  paidCount: 1,
  averageSettlement: '14m'
};
