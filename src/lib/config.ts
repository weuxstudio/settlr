import { arc, arcTestnet } from 'viem/chains';
import { PUBLIC_ARC_NETWORK, PUBLIC_ARC_RPC_URL } from '$env/static/public';

export type ArcEnvironment = 'testnet' | 'mainnet';
export const ARC_ENVIRONMENT: ArcEnvironment =
  (PUBLIC_ARC_NETWORK ?? 'testnet') === 'mainnet'
    ? 'mainnet'
    : 'testnet';
export const ARC_CHAIN = ARC_ENVIRONMENT === 'mainnet' ? arc : arcTestnet;
export const ARC_CHAIN_ID = ARC_CHAIN.id;
export const ARC_EXPLORER_URL =
  ARC_ENVIRONMENT === 'mainnet'
    ? 'https://explorer.arc.io'
    : 'https://explorer.testnet.arc.io';
export const ARC_RPC_URL =
  PUBLIC_ARC_RPC_URL ??
  (ARC_ENVIRONMENT === 'mainnet'
    ? 'https://rpc.mainnet.arc.io'
    : 'https://rpc.testnet.arc.io');
export const ARC_USDC_ADDRESS =
  '0x3600000000000000000000000000000000000000' as `0x${string}`;
export const ARC_MEMO_ADDRESS =
  '0x5294E9927c3306DcBaDb03fe70b92e01cCede505' as `0x${string}`;
export const demoRecipient = '0x7B2a••••••e91F';

export const shortenAddress = (address: string, start = 6, end = 4) =>
  address.length > start + end + 3
    ? `${address.slice(0, start)}…${address.slice(-end)}`
    : address;

export const explorerTransaction = (hash: string) =>
  `${ARC_EXPLORER_URL}/tx/${hash}`;
