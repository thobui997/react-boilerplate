// Tiền tố chung cho mọi khóa localStorage của ứng dụng.
export const STORAGE_PREFIX = 'app'

// Dự án đã triển khai mà đổi giá trị các khóa này thì người dùng mất phiên đăng nhập và theme đã lưu
// (dữ liệu cũ nằm dưới khóa cũ). Đổi tiền tố khi khởi tạo dự án, trước lần triển khai đầu tiên.
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
