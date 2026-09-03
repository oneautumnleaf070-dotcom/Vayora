import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    strictPort: true,
  },
  preview: {
    port: 3000,
    strictPort: true,
  },
  build: {
    // Split heavy vendors into their own cacheable chunks instead of one 2 MB bundle
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          maps: ['leaflet', 'react-leaflet'],
          charts: ['recharts'],
          qr: ['html5-qrcode', 'qrcode.react'],
        },
      },
    },
    chunkSizeWarningLimit: 900,
  },
})
