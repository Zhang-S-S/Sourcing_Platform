import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const apiProxy = {
  '/api': { target: process.env.SOURCING_API_TARGET || 'http://127.0.0.1:8080', changeOrigin: true },
}

export default defineConfig({
  plugins: [vue()],
  server: { host: '127.0.0.1', port: 5173, strictPort: true, proxy: apiProxy },
  preview: { host: '127.0.0.1', port: 4173, strictPort: true, proxy: apiProxy },
})
