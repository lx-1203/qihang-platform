import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import checker from 'vite-plugin-checker'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const cdnUrl = env.VITE_CDN_URL

  return {
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

    // 生产环境使用 CDN 作为静态资源基础路径
    base: mode === 'production' && cdnUrl ? cdnUrl : '/',

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
      sourcemap: false, // 禁用 sourcemap 减少内存占用
      minify: 'esbuild', // 使用更快的 esbuild 压缩
      rollupOptions: {
        output: {
          manualChunks: {
            // 框架核心（几乎不变，长期缓存）
            'react-vendor': ['react', 'react-dom'],
            // 路由
            'router-vendor': ['react-router-dom'],
            // 动画
            'motion-vendor': ['framer-motion'],
            // 国际化
            'i18n-vendor': ['i18next', 'react-i18next'],
          },
        },
      },
    },

    // 测试配置（Vitest）
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
      css: false,
    },
  }
})
