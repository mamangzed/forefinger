import { defineConfig, type Options } from 'tsup'

const shared: Partial<Options> = {
  entry: { fp: 'src/index.ts' },
  outDir: 'dist',
  minify: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  target: 'es2020'
}

export default defineConfig([
  {
    ...shared,
    format: ['esm'],
    outExtension: () => ({ js: '.esm.js' }),
    dts: true
  },
  {
    ...shared,
    format: ['cjs'],
    outExtension: () => ({ js: '.cjs.js' }),
    clean: false
  },
  {
    ...shared,
    format: ['iife'],
    globalName: 'FP',
    outExtension: () => ({ js: '.min.js' }),
    clean: false
  }
])
