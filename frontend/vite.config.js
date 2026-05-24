import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    // Vite ya maneja historyApiFallback automáticamente para SPAs
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/estadisticas': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  // Build producción: `vite build` fija mode=production (minify, sin HMR).
  build: {
    outDir: 'build',
    sourcemap: false,
    target: 'es2020',
    chunkSizeWarningLimit: 700,
    esbuild: {
      drop: ['console', 'debugger'],
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-charts': ['chart.js', 'react-chartjs-2', 'recharts'],
          'vendor-stripe': ['@stripe/stripe-js'],
        },
      },
    },
  },
})
