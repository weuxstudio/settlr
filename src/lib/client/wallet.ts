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

type Eip6963Announcement = {
  info?: { name?: string };
  provider?: Eip1193Provider;
};

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}

export function getProvider() {
  return browser ? window.ethereum : undefined;
}

async function resolveProvider() {
  const injected = getProvider();
  if (injected) return injected;
  if (!browser) return undefined;

  return new Promise<Eip1193Provider | undefined>((resolve) => {
    let settled = false;
    const finish = (provider?: Eip1193Provider) => {
      if (settled) return;
      settled = true;
      window.removeEventListener(
        'eip6963:announceProvider',
        handleAnnouncement
      );
      resolve(provider);
    };
    const handleAnnouncement = (event: Event) => {
      const announcement = (event as CustomEvent<Eip6963Announcement>).detail;
      finish(announcement?.provider);
    };
    window.addEventListener('eip6963:announceProvider', handleAnnouncement);
    window.dispatchEvent(new Event('eip6963:requestProvider'));
    window.setTimeout(() => finish(), 350);
  });
}

function walletError(error: unknown, fallback: string) {
  const code = (error as { code?: number })?.code;
  if (code === 4001) return new Error('Wallet request was rejected.');
  if (code === -32002)
    return new Error(
      'A wallet request is already open. Check the wallet extension.'
    );
  if (error instanceof Error && error.message) return error;
  return new Error(fallback);
}

function missingProviderError() {
  return new Error(
    'No wallet found. Open MemoMatch in MetaMask or Rabby, or install a wallet extension.'
  );
}

export async function connectWallet() {
  const provider = await resolveProvider();
  if (!provider) throw missingProviderError();
  try {
    const accounts = (await provider.request({
      method: 'eth_requestAccounts'
    })) as string[];
    if (!accounts[0]) throw new Error('The wallet did not return an account.');
    return accounts[0];
  } catch (error) {
    throw walletError(error, 'Wallet connection failed.');
  }
}

export async function switchWalletAccount() {
  const provider = await resolveProvider();
  if (!provider) throw missingProviderError();
  try {
    await provider.request({
      method: 'wallet_requestPermissions',
      params: [{ eth_accounts: {} }]
    });
  } catch (error) {
    const code = (error as { code?: number })?.code;
    if (code !== -32601 && code !== 4200) {
      throw walletError(error, 'Wallet account switch was cancelled.');
    }
  }
  return connectWallet();
}

export async function signInWithEthereum(address: string) {
  const provider = await resolveProvider();
  if (!provider) throw missingProviderError();

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

  let signature: string;
  try {
    signature = (await provider.request({
      method: 'personal_sign',
      params: [challenge.message, address]
    })) as string;
  } catch (error) {
    throw walletError(error, 'Wallet sign in was declined.');
  }
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
  const provider = await resolveProvider();
  if (!provider) throw missingProviderError();
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
  const provider = await resolveProvider();
  if (!provider) throw missingProviderError();
  await switchToArc();
  const accounts = (await provider.request({
    method: 'eth_accounts'
  })) as string[];
  const sender = accounts[0];
  if (!sender) throw new Error('Connect a wallet before paying.');
  if (sender.toLowerCase() === recipient.toLowerCase()) {
    throw new Error(
      'Use a different wallet to pay this request. The recipient wallet cannot pay itself.'
    );
  }
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
