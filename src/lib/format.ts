export const USDC_SCALE = 1_000_000n;
export const MAX_UINT256 = (1n << 256n) - 1n;

export function parseUsdc(value: string | number): bigint {
  const raw = String(value).trim();
  if (!/^\d+(\.\d{1,6})?$/.test(raw)) throw new Error('Invalid USDC amount');
  const [whole, fraction = ''] = raw.split('.');
  return BigInt(whole) * USDC_SCALE + BigInt(fraction.padEnd(6, '0'));
}

export function parseUsdcInput(value: string | number): bigint {
  const parsed = parseUsdc(value);
  if (parsed <= 0n || parsed > MAX_UINT256)
    throw new Error('USDC amount is outside the supported range');
  return parsed;
}

export function formatUsdcBaseUnits(value: string | bigint) {
  const baseUnits = typeof value === 'bigint' ? value : BigInt(value);
  const negative = baseUnits < 0n;
  const absolute = negative ? -baseUnits : baseUnits;
  const whole = absolute / USDC_SCALE;
  const fraction = (absolute % USDC_SCALE)
    .toString()
    .padStart(6, '0')
    .replace(/0+$/, '');
  const grouped = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${negative ? '-' : ''}${grouped}.${(fraction || '').padEnd(2, '0')}`;
}

export function formatUsdc(value: string | number | bigint) {
  if (typeof value === 'bigint') return formatUsdcBaseUnits(value);
  return formatUsdcBaseUnits(parseUsdc(String(value).replaceAll(',', '')));
}

export function formatDate(value: string | number | Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(value));
}

export function formatRelative(value: string | number | Date) {
  const difference = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.floor(difference / 60000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
