import { deriveStatus } from '$core/index';
import type { PaymentRequest } from '$lib/types';

export function publicPayment(request: PaymentRequest) {
  const amountMicroUsdc = request.amountMicroUsdc ?? '0';
  const paidMicroUsdc = request.paidMicroUsdc ?? '0';
  const remainingMicroUsdc = request.remainingMicroUsdc ?? '0';
  const overpaidMicroUsdc = request.overpaidMicroUsdc ?? '0';
  return {
    token: request.token,
    memoId: request.memoId,
    publicDescription: request.publicDescription ?? '',
    requesterName: request.requesterName ?? '',
    publicReference: request.publicReference ?? '',
    dueDate: request.dueDate,
    createdAt: request.createdAt,
    recipient: request.recipient,
    amountMicroUsdc,
    paidMicroUsdc,
    remainingMicroUsdc,
    overpaidMicroUsdc,
    status: deriveStatus(BigInt(amountMicroUsdc), BigInt(paidMicroUsdc)),
    closedAt: request.closedAt,
    payments: request.payments.map((payment) => ({
      amountMicroUsdc: payment.amountMicroUsdc ?? '0',
      payer: payment.payer,
      transactionHash: payment.transactionHash,
      logIndex: payment.logIndex,
      blockNumber: payment.blockNumber,
      receivedAt: payment.receivedAt,
      explorerUrl: payment.explorerUrl,
      verification: payment.verification
    }))
  };
}
