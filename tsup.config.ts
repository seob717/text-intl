import { defineConfig } from 'tsup';

export default defineConfig([
  // Core library (index.ts)
  {
    entry: {
      index: 'src/index.ts',
    },
    format: ['esm', 'cjs'],
    dts: true, // TypeScript 소스에서 자동 타입 생성
    outDir: 'dist',
    clean: true,
    sourcemap: true,
    treeshake: true,
    splitting: false,
    external: ['intl-messageformat'],
  },
  // React adapter (react.tsx)
  {
    entry: {
      react: 'src/react.tsx',
    },
    format: ['esm', 'cjs'],
    dts: true, // TypeScript 소스에서 자동 타입 생성
    outDir: 'dist',
    clean: false,
    sourcemap: true,
    treeshake: false, // React import 유지를 위해 treeshake 비활성화
    splitting: false,
    external: ['react', 'intl-messageformat'],
    banner: {
      js: '"use client";\n',
    },
    esbuildOptions(options) {
      // JSX를 React.createElement로 트랜스파일
      options.jsx = 'transform';
      options.jsxFactory = 'React.createElement';
      options.jsxFragment = 'React.Fragment';
    },
  },
  // Config (config.ts)
  {
    entry: {
      config: 'src/config.ts',
    },
    format: ['esm', 'cjs'],
    dts: true, // TypeScript 소스에서 자동 타입 생성
    outDir: 'dist',
    clean: false,
    sourcemap: true,
    treeshake: true,
    splitting: false,
  },
  // Errors (errors.ts)
  {
    entry: {
      errors: 'src/errors.ts',
    },
    format: ['esm', 'cjs'],
    dts: true, // TypeScript 소스에서 자동 타입 생성
    outDir: 'dist',
    clean: false,
    sourcemap: true,
    treeshake: true,
    splitting: false,
  },
]);
