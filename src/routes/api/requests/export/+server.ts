import { getSession } from '$lib/server/auth';
import { listRequests } from '$lib/server/store';
import { deriveStatus } from '$core/index';

function csvCell(value: string | number) {
  const text = String(value).replace(/[\r\n]/g, ' ');
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}

export async function GET({ cookies, platform }) {
  let session;
  try {
    session = await getSession(
      platform?.env.DB,
      cookies.get('memomatch_session')
    );
  } catch {
    return new Response('Authentication storage is temporarily unavailable.', {
      status: 503
    });
  }
  if (!session)
    return new Response('Connect a wallet and sign in first.', { status: 401 });
  let requests;
  try {
    requests = await listRequests(platform?.env.DB, session.address);
  } catch {
    return new Response('Request storage is temporarily unavailable.', {
      status: 503
    });
  }
  const rows = [
    [
      'Request',
      'Public token',
      'Amount micro USDC',
      'Paid micro USDC',
      'Status',
      'Created',
      'Recipient',
      'Verified payments'
    ],
    ...requests.map((request) => [
      request.title,
      request.token,
      request.amountMicroUsdc ?? '0',
      request.paidMicroUsdc ?? '0',
      deriveStatus(
        BigInt(request.amountMicroUsdc ?? '0'),
        BigInt(request.paidMicroUsdc ?? '0')
      ),
      request.createdAt,
      request.recipient,
      request.payments.length
    ])
  ];
  const csv = `${rows.map((row) => row.map((cell) => csvCell(cell)).join(',')).join('\n')}\n`;
  return new Response(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="memomatch-requests.csv"',
      'cache-control': 'no-store'
    }
  });
}
