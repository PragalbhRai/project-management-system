import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

export default defineConfig({
  test: {
    include: ['test/**/*.e2e-spec.ts'],
    globals: true,
    environment: 'node',
    testTimeout: 30000,
  },
  plugins: [swc.vite()],
});
