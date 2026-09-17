import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const arcNetwork = process.env.PUBLIC_ARC_NETWORK === 'mainnet' ? 'mainnet' : 'testnet';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      config: arcNetwork === 'mainnet' ? 'wrangler.jsonc' : 'wrangler.testnet.jsonc',
      platformProxy: { persist: true }
    }),
    alias: {
      $core: './packages/arc-payment-core/src'
    }
  }
};

export default config;
