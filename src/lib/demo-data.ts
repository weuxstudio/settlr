import type { DashboardStats, PaymentRequest } from './types';

export const demoRequests: PaymentRequest[] = [
  {
    id: 'req_8f3a1d',
    token: 'pay_demo_8f3a1d',
    memoId:
      '0xd46fbf2d3c44f4e49b6e5c5a4e7417e2cf4e38ae418ff5cdca0bcce86e5f7531',
    title: 'Arc integration sprint',
    publicDescription: 'Arc integration sprint, September 2026',
    requesterName: 'Settlr Labs',
    publicReference: 'INV-2026-0917',
    dueDate: '2026-09-30',
    amount: '4800.00',
    paid: '4800.00',
    recipient: '0x4D11a3E1Cef8bC8cf92D71c4df0e6c8C6b8a2F90',
    createdAt: '2026-09-17T08:52:00.000Z',
    payments: [
      {
        id: 'payment_1',
        amount: '4800.00',
        payer: '0xB0b4A4A8dF8e2d0E1cB7e68a0EdeFf4A91eC1B8A',
        transactionHash:
          '0x2cc1f4f9c8b3a2e842bde6c3fd32e17e746147fd7fd6b2d2f8a67b3b67b1c4ab',
        blockNumber: 124982,
        receivedAt: '2026-09-17T09:10:00.000Z',
        explorerUrl:
          'https://explorer.arc.io/tx/0x2cc1f4f9c8b3a2e842bde6c3fd32e17e746147fd7fd6b2d2f8a67b3b67b1c4ab',
        verification: 'verified'
      }
    ]
  },
  {
    id: 'req_a27c9e',
    token: 'pay_demo_a27c9e',
    memoId:
      '0x5b45c4cc1fe413775b17adcc82c7b7a2201b42d2fdb7ec7af0ab9af0d77e58bc',
    title: 'Settlement test batch',
    publicDescription: 'Settlement test batch',
    requesterName: 'Settlr Labs',
    publicReference: 'BATCH-2026-09',
    amount: '1250.00',
    paid: '750.00',
    recipient: '0x4D11a3E1Cef8bC8cf92D71c4df0e6c8C6b8a2F90',
    createdAt: '2026-09-16T15:24:00.000Z',
    payments: [
      {
        id: 'payment_2',
        amount: '750.00',
        payer: '0x1c65c62a0bf0d9ea0ef2a47fa9b27bd3b62aa20c',
        transactionHash:
          '0x9d3a71e5e6bdaea3fd07dc9c15722a1c6d8f1e5dc348e48f7860d9eea6d624d0',
        blockNumber: 124801,
        receivedAt: '2026-09-16T16:02:00.000Z',
        explorerUrl:
          'https://explorer.arc.io/tx/0x9d3a71e5e6bdaea3fd07dc9c15722a1c6d8f1e5dc348e48f7860d9eea6d624d0',
        verification: 'verified'
      }
    ]
  },
  {
    id: 'req_c51b8e',
    token: 'pay_demo_c51b8e',
    memoId:
      '0xd2b72ffde34331a0e74a329fc30ea2c3643e6c98ed27ea8b2c862f1a9a0a9514',
    title: 'Design system review',
    publicDescription: 'Design system review',
    requesterName: 'Settlr Labs',
    publicReference: 'DS-REVIEW-03',
    amount: '900.00',
    paid: '0.00',
    recipient: '0x4D11a3E1Cef8bC8cf92D71c4df0e6c8C6b8a2F90',
    createdAt: '2026-09-15T12:18:00.000Z',
    payments: []
  },
  {
    id: 'req_32de44',
    token: 'pay_demo_32de44',
    memoId:
      '0x8421d4eb4535f980c28c9df8f1f3209e9ad087c61e6c80d3cf2bdfe4ce8bc229',
    title: 'Mainnet workshop deposit',
    publicDescription: 'Mainnet workshop deposit',
    requesterName: 'Settlr Labs',
    publicReference: 'WORKSHOP-2026',
    amount: '300.00',
    paid: '300.00',
    recipient: '0x4D11a3E1Cef8bC8cf92D71c4df0e6c8C6b8a2F90',
    createdAt: '2026-09-13T10:05:00.000Z',
    payments: [
      {
        id: 'payment_3',
        amount: '300.00',
        payer: '0x53e4bb4d5df7b63cb6a7c6d42a3d59f5b92aa19e',
        transactionHash:
          '0x38dce9f77ad1f49f31b8e49dc01f8ec73e2ab1e0d8fcbf8c09d96dd0e2364a22',
        blockNumber: 124602,
        receivedAt: '2026-09-13T10:07:00.000Z',
        explorerUrl:
          'https://explorer.arc.io/tx/0x38dce9f77ad1f49f31b8e49dc01f8ec73e2ab1e0d8fcbf8c09d96dd0e2364a22',
        verification: 'verified'
      }
    ]
  }
];

export const demoStats: DashboardStats = {
  outstanding: '2150.00',
  collected: '5100.00',
  paidCount: 2,
  averageSettlement: '14m'
};
