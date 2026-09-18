export type PaymentStatus = 'Open' | 'Partially paid' | 'Paid' | 'Overpaid';
export type VerificationState = 'verified' | 'pending' | 'delayed' | 'rejected';

export type Payment = {
  id: string;
  amountMicroUsdc?: string;
  /** @deprecated use amountMicroUsdc for persistence and APIs. */
  amount: string;
  payer: string;
  transactionHash: string;
  logIndex?: number;
  blockNumber: number;
  receivedAt: string;
  explorerUrl: string;
  verification: VerificationState;
};

export type PaymentRequest = {
  id: string;
  token: string;
  memoId: string;
  owner?: string;
  title: string;
  /** Public purpose shown to the payer. The private work label remains title. */
  publicDescription?: string;
  /** Public requester name shown to the payer. */
  requesterName?: string;
  /** Optional payer-facing invoice or order reference. */
  publicReference?: string;
  /** Optional ISO date defining when the request is due. */
  dueDate?: string;
  amountMicroUsdc?: string;
  paidMicroUsdc?: string;
  remainingMicroUsdc?: string;
  overpaidMicroUsdc?: string;
  amount: string;
  paid: string;
  recipient: string;
  createdAt: string;
  closedAt?: string;
  payments: Payment[];
};

export type DashboardStats = {
  outstanding: string;
  collected: string;
  paidCount: number;
  averageSettlement: string;
};
