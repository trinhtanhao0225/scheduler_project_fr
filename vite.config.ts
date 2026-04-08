import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import path from 'path'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://140.115.59.61:8888',
        changeOrigin: true,
        secure: false,
        // Rewrite rõ ràng - xóa /api trước khi gửi sang backend
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
