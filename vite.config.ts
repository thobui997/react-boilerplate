import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

export default defineConfig(({ mode }) => {
  // `.env` chỉ nạp biến VITE_* vào mã chạy trên trình duyệt; cấu hình Vite phải tự đọc để dùng được VITE_DEV_API_TARGET.
  const devApiTarget =
    loadEnv(mode, process.cwd(), '').VITE_DEV_API_TARGET || 'http://127.0.0.1:8080'
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: {
      // API dev mặc định ở 127.0.0.1:8080; đổi bằng VITE_DEV_API_TARGET nếu cần.
      proxy: { '/api': devApiTarget },
    },
    preview: {
      // `vite preview` cũng cần proxy `/api` như dev để cùng origin.
      proxy: { '/api': devApiTarget },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['src/test/setup.ts'],
      css: false,
      // Test đầu tiên của mỗi file trang nạp (transform) route lazy nên chậm khi cả bộ chạy song song; 5s mặc định hay đỏ.
      testTimeout: 15_000,
      exclude: ['e2e/**', 'node_modules/**'],
      // Trong Vitest `react-router` (CJS) và `react-router/dom` (ESM) bị nạp thành hai bản riêng (dual-package hazard)
      // nên context của Router không chung: useNavigate báo thiếu <Router>. Ép cả hai về bản ESM để dùng chung một bản.
      alias: [
        {
          find: /^react-router$/,
          replacement: fileURLToPath(
            new URL('./node_modules/react-router/dist/development/index.mjs', import.meta.url),
          ),
        },
        {
          find: /^react-router\/dom$/,
          replacement: fileURLToPath(
            new URL('./node_modules/react-router/dist/development/dom-export.mjs', import.meta.url),
          ),
        },
      ],
      server: { deps: { inline: [/react-router/] } },
    },
  }
})
