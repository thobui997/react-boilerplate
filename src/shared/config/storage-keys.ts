// Tiền tố chung cho mọi khóa localStorage của ứng dụng.
export const STORAGE_PREFIX = 'app'

// Khoá localStorage đã có dữ liệu thật ở trình duyệt người dùng: đổi giá trị là mất phiên, theme.
// `public/theme-init.js` đọc `app:theme` bằng chuỗi trần (chạy trước khi bundle tải) nên phải giữ khớp với `Theme`.
export const STORAGE_KEYS = {
  Session: `${STORAGE_PREFIX}:session`,
  SessionLock: `${STORAGE_PREFIX}:session-lock`,
  Theme: `${STORAGE_PREFIX}:theme`,
} as const

// Tên BroadcastChannel giữa các tab về phiên đăng nhập.
export const AUTH_CHANNEL = 'app-auth'
// Tên Web Lock cho refresh single-flight liên tab.
export const REFRESH_LOCK_NAME = 'app-refresh'
