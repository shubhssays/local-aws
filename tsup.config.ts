import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: { server: 'src/server.ts' },
    format: ['esm'],
    target: 'node20',
    sourcemap: true,
    clean: true,
    splitting: false,
    outDir: 'dist',
  },
  {
    entry: { 'electron/main': 'src/electron/main.ts' },
    format: ['cjs'],
    target: 'node20',
    sourcemap: true,
    clean: false,
    splitting: false,
    outDir: 'dist',
    platform: 'node',
    // Never bundle electron — it uses dynamic require() and must load from node_modules.
    external: ['electron'],
    outExtension: () => ({ js: '.cjs' }),
  },
]);
