import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('$app/environment', () => ({ browser: true }));
import { ARC_CHAIN_ID } from '$lib/config';
import { connectWallet, signInWithEthereum, switchToArc } from './wallet';

const address = `0x${'ab'.repeat(20)}`;
let request: ReturnType<typeof vi.fn>;
let fetcher: ReturnType<typeof vi.fn>;
beforeEach(() => {
  request = vi.fn();
  fetcher = vi.fn();
  vi.stubGlobal('window', { ethereum: { request } });
  vi.stubGlobal('fetch', fetcher);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('wallet sign-in progress', () => {
  it('reports signature and verification as separate steps without sending a transaction', async () => {
    const steps: string[] = [];
    fetcher
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ message: 'Sign in message', nonce: '12345678' })
        )
      )
      .mockResolvedValueOnce(new Response('{}'));
    request.mockImplementation(async ({ method }) => {
      expect(method).toBe('personal_sign');
      expect(steps).toEqual(['signature']);
      return '0xsignature';
    });
    expect(
      await signInWithEthereum(address, (phase) => steps.push(phase))
    ).toBe(address);
    expect(steps).toEqual(['signature', 'verifying']);
    expect(fetcher.mock.calls[1][0]).toBe('/api/auth/verify');
    expect(request).toHaveBeenCalledTimes(1);
  });
  it('does not verify a rejected signature', async () => {
    fetcher.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'Sign in', nonce: '12345678' }))
    );
    request.mockRejectedValue({ code: 4001 });
    const phase = vi.fn();
    await expect(signInWithEthereum(address, phase)).rejects.toThrow(
      'rejected'
    );
    expect(phase).toHaveBeenCalledExactlyOnceWith('signature');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('surfaces connection rejection and does not start sign-in', async () => {
    request.mockRejectedValue({ code: 4001 });
    await expect(connectWallet()).rejects.toThrow('rejected');
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('skips a network prompt when already on Arc', async () => {
    request.mockResolvedValue(`0x${ARC_CHAIN_ID.toString(16)}`);
    const onSwitch = vi.fn();
    await switchToArc(onSwitch);
    expect(onSwitch).not.toHaveBeenCalled();
    expect(request).toHaveBeenCalledExactlyOnceWith({ method: 'eth_chainId' });
  });
  it('reports a network change before asking the wallet to switch', async () => {
    const onSwitch = vi.fn();
    request
      .mockResolvedValueOnce('0x1')
      .mockImplementationOnce(async ({ method }) => {
        expect(method).toBe('wallet_switchEthereumChain');
        expect(onSwitch).toHaveBeenCalledTimes(1);
      });
    await switchToArc(onSwitch);
  });
  it('stops sign-in when the network switch is declined', async () => {
    request.mockResolvedValueOnce('0x1').mockRejectedValueOnce({ code: 4001 });
    await expect(switchToArc()).rejects.toMatchObject({ code: 4001 });
    expect(fetcher).not.toHaveBeenCalled();
  });
});
