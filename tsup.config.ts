import { defineConfig } from 'tsup';

export default defineConfig([
  // Core library (index.js)
  {
    entry: {
      index: 'src/index.js',
    },
    format: ['esm', 'cjs'],
    dts: false, // 수동으로 작성된 .d.ts 파일 사용
    outDir: 'dist',
    clean: true,
    sourcemap: true,
    treeshake: true,
    splitting: false,
    external: ['intl-messageformat'],
  },
  // React adapter (react.jsx)
  {
    entry: {
      react: 'src/react.jsx',
    },
    format: ['esm', 'cjs'],
    dts: false, // 수동으로 작성된 .d.ts 파일 사용
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
  // Config (config.js)
  {
    entry: {
      config: 'src/config.js',
    },
    format: ['esm', 'cjs'],
    dts: false, // 수동으로 작성된 .d.ts 파일 사용
    outDir: 'dist',
    clean: false,
    sourcemap: true,
    treeshake: true,
    splitting: false,
  },
  // Errors (errors.js)
  {
    entry: {
      errors: 'src/errors.js',
    },
    format: ['esm', 'cjs'],
    dts: false, // 수동으로 작성된 .d.ts 파일 사용
    outDir: 'dist',
    clean: false,
    sourcemap: true,
    treeshake: true,
    splitting: false,
  },
]);
