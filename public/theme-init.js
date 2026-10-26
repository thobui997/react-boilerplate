// Đặt data-theme trước khi vẽ để không nháy nền sáng khi người dùng chọn giao diện tối.
// Là file tĩnh (không inline) để CSP không cần 'unsafe-inline' cho script.
try {
  var theme = null
  try {
    theme = localStorage.getItem('app:theme')
  } catch {
    // localStorage bị chặn (chế độ riêng tư): dùng giao diện theo hệ thống.
  }
  if (theme !== 'light' && theme !== 'dark') {
    theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  document.documentElement.dataset.theme = theme
} catch {
  // Không đặt được data-theme thì giữ giao diện mặc định.
}
