import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(() => {
  const isProd = process.env.NODE_ENV === 'production';

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      // Strictly disable source maps in production to prevent exposing raw TypeScript source code
      sourcemap: false,
      minify: 'esbuild' as const,
      target: 'es2022',
      rollupOptions: {
        output: {
          // Obfuscate chunk file structure with non-guessable hash digests
          chunkFileNames: 'assets/c-[hash].js',
          entryFileNames: 'assets/e-[hash].js',
          assetFileNames: 'assets/a-[hash].[ext]',
        },
      },
    },
    esbuild: {
      // Strip debug logs and debugger breakpoints from production client bundle
      drop: isProd ? (['console', 'debugger'] as ('console' | 'debugger')[]) : [],
      legalComments: 'none' as const,
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify - file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
