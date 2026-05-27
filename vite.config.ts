import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      build: {
        rollupOptions: {
          external: [
            /^(node:)?(fs|path|os|crypto|child_process|util|url|module|worker_threads|tty|buffer)$/,
            'fsevents',
            'rollup',
            'tsx',
            'get-tsconfig',
            /node_modules\/rollup/,
            /node_modules\/tsx/,
            /node_modules\/get-tsconfig/,
            /node_modules\/esbuild/
          ],
          onwarn(warning, defaultHandler) {
            if (warning.code === 'MODULE_LEVEL_DIRECTIVE') {
              return;
            }
            if (defaultHandler) {
              defaultHandler(warning);
            } else {
              console.warn(warning);
            }
          },
        },
      },
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },

      test: {
        globals: true,
        environment: 'node',
        include: ['tests/**/*.test.ts'],
        coverage: {
          provider: 'v8',
          reporter: ['text', 'html'],
          include: ['controllers/**', 'lib/**', 'middlewares/**'],
          exclude: ['store/**', 'components/**'],
          thresholds: {
            lines: 70,
            functions: 70,
            branches: 70,
            statements: 70
          }
        }
      }
    };
});
