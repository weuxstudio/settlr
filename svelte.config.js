import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const arcNetwork = process.env.PUBLIC_ARC_NETWORK === 'mainnet' ? 'mainnet' : 'testnet';
const wranglerConfig = arcNetwork === 'mainnet' ? 'wrangler.jsonc' : 'wrangler.testnet.jsonc';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      config: wranglerConfig,
      platformProxy: {
        configPath: wranglerConfig,
        persist: true
      }
    }),
    alias: {
      $core: './packages/arc-payment-core/src'
    }
  }
};

export default config;
