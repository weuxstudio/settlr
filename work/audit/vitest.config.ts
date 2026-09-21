import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  resolve: {
    alias: {
      $lib: fileURLToPath(new URL('../../src/lib', import.meta.url)),
      $core: fileURLToPath(
        new URL('../../packages/arc-payment-core/src', import.meta.url)
      ),
      '$app/environment': fileURLToPath(
        new URL('./environment.ts', import.meta.url)
      )
    }
  },
  test: { include: ['work/audit/*.test.ts'], environment: 'node' }
});
