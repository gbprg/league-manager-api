import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['test/flow.e2e-spec.ts', 'test/tournament-flow.e2e-spec.ts', 'test/hardening.e2e-spec.ts', 'test/phases-flow.e2e-spec.ts'],
    fileParallelism: false,
    testTimeout: 30_000,
    bail: 1,
  },
});
