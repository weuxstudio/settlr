import { browser } from '$app/environment';
import {
  ARC_CHAIN_ID,
  ARC_EXPLORER_URL,
  ARC_MEMO_ADDRESS,
  ARC_RPC_URL,
  ARC_USDC_ADDRESS
} from '$lib/config';
import { encodePaymentCall, erc20Abi, memoAbi } from '$core/index';
import { encodeFunctionData } from 'viem';

type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}

export function getProvider() {
  return browser ? window.ethereum : undefined;
}

export async function connectWallet() {
  const provider = getProvider();
  if (!provider)
    throw new Error(
      'No browser wallet found. Install MetaMask or Rabby to continue.'
    );
  const accounts = (await provider.request({
    method: 'eth_requestAccounts'
  })) as string[];
  return accounts[0];
}

export async function signInWithEthereum(address: string) {
  const provider = getProvider();
  if (!provider)
    throw new Error(
      'No browser wallet found. Install MetaMask or Rabby to continue.'
    );

  const challengeResponse = await fetch('/api/auth/challenge', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ address })
  });
  const challenge = (await challengeResponse.json()) as {
    message?: string;
    nonce?: string;
    error?: string;
  };
  if (!challengeResponse.ok || !challenge.message || !challenge.nonce) {
    throw new Error(challenge.error ?? 'Could not prepare the wallet sign in.');
  }

  const signature = (await provider.request({
    method: 'personal_sign',
    params: [challenge.message, address]
  })) as string;
  const verifyResponse = await fetch('/api/auth/verify', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      message: challenge.message,
      signature,
      nonce: challenge.nonce
    })
  });
  if (!verifyResponse.ok) {
    const result = (await verifyResponse.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(result?.error ?? 'Wallet sign in was declined.');
  }
  return address;
}

export async function switchToArc() {
  const provider = getProvider();
  if (!provider) throw new Error('No browser wallet found.');
  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${ARC_CHAIN_ID.toString(16)}` }]
    });
  } catch (error) {
    const code = (error as { code?: number })?.code;
    if (code !== 4902) throw error;
    await provider.request({
      method: 'wallet_addEthereumChain',
      params: [
        {
          chainId: `0x${ARC_CHAIN_ID.toString(16)}`,
          chainName: 'Arc',
          nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
          rpcUrls: [ARC_RPC_URL],
          blockExplorerUrls: [ARC_EXPLORER_URL]
        }
      ]
    });
  }
}

export async function sendMemoPayment(
  recipient: `0x${string}`,
  amount: bigint,
  memoId: `0x${string}`
) {
  const provider = getProvider();
  if (!provider) throw new Error('No browser wallet found.');
  await switchToArc();
  const accounts = (await provider.request({
    method: 'eth_accounts'
  })) as string[];
  const sender = accounts[0];
  if (!sender) throw new Error('Connect a wallet before paying.');
  const code = (await provider.request({
    method: 'eth_getCode',
    params: [sender, 'latest']
  })) as string;
  if (code && code !== '0x')
    throw new Error(
      'Smart contract wallets are not supported for Arc memo payments.'
    );
  const call = encodePaymentCall(recipient, amount, memoId);
  const data = encodeFunctionData({
    abi: memoAbi,
    functionName: 'memo',
    args: call.args
  });
  const tx = { from: sender, to: ARC_MEMO_ADDRESS, data };
  const estimatedGas = BigInt(
    (await provider.request({
      method: 'eth_estimateGas',
      params: [tx]
    })) as string
  );
  const gasPrice = BigInt(
    (await provider.request({ method: 'eth_gasPrice' })) as string
  );
  const balanceData = encodeFunctionData({
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [sender as `0x${string}`]
  });
  const balance = BigInt(
    (await provider.request({
      method: 'eth_call',
      params: [{ to: ARC_USDC_ADDRESS, data: balanceData }, 'latest']
    })) as string
  );
  if (balance < amount)
    throw new Error('Insufficient USDC balance for this payment.');
  const nativeBalance = BigInt(
    (await provider.request({
      method: 'eth_getBalance',
      params: [sender, 'latest']
    })) as string
  );
  if (nativeBalance < amount * 1_000_000_000_000n + estimatedGas * gasPrice)
    throw new Error('Insufficient USDC balance including the network fee.');
  return (await provider.request({
    method: 'eth_sendTransaction',
    params: [tx]
  })) as string;
}
