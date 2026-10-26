interface ImportMetaEnv {
  // Gốc URL của API; mặc định `/api/v1` (cùng origin, qua proxy).
  readonly VITE_API_BASE?: string
  // Đích proxy `/api` khi chạy dev/preview; chỉ `vite.config.ts` đọc.
  readonly VITE_DEV_API_TARGET?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
