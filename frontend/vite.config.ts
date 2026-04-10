import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import checker from 'vite-plugin-checker'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    checker({
      typescript: true,
      overlay: false,
    }),
  ],

  // 路径别名：支持 @/ 导入
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  // API 代理：/api -> localhost:3001
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },

  // 构建优化：代码分割 + chunk 大小控制
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          // 框架核心（几乎不变，长期缓存）
          'react-vendor': ['react', 'react-dom'],
          // 路由
          'router-vendor': ['react-router-dom'],
          // 动画
          'motion-vendor': ['framer-motion'],
          // 图标
          'icons-vendor': ['lucide-react'],
          // 国际化
          'i18n-vendor': ['i18next', 'react-i18next'],
        },
      },
    },
  },
})
