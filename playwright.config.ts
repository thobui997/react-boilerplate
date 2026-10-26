import { defineConfig, devices } from '@playwright/test'
import { loadEnv } from 'vite'

// Không cần API thật: mọi request dưới VITE_API_BASE (mặc định `/api/v1`) được giả lập bằng page.route trong
// e2e/support/mock-api.ts. Dev server đọc VITE_API_BASE từ `.env`, nên nạp cùng giá trị vào process.env cho mock.
const viteApiBase = loadEnv('development', process.cwd(), 'VITE_').VITE_API_BASE
if (!process.env.VITE_API_BASE && viteApiBase) process.env.VITE_API_BASE = viteApiBase

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev -- --port 5173 --strictPort',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
})
