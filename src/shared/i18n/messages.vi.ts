// Chuỗi UI dùng chung. Mỗi nhóm khóa do slice/trang sở hữu thêm vào nhóm riêng của mình.
export const messages = {
  errors: {
    network: 'Không có kết nối mạng. Kiểm tra mạng rồi thử lại.',
    fallback: 'Có lỗi xảy ra. Vui lòng thử lại.',
    sessionMissing: 'Không còn phiên đăng nhập.',
    sessionChanged: 'Phiên đăng nhập đã thay đổi.',
  },
  auth: {
    sessionExpired: 'Phiên đã hết hạn',
  },
  signOut: {
    action: 'Đăng xuất',
  },
  changePassword: {
    page: {
      eyebrow: 'Bước bắt buộc · lần đăng nhập đầu',
      title: 'Đổi mật khẩu tạm',
      reminder: (displayName: string) =>
        `${displayName} cần đặt mật khẩu riêng trước khi dùng ứng dụng.`,
    },
    currentRequired: 'Cần nhập mật khẩu hiện tại',
    failed: 'Không đổi được mật khẩu. Thử lại sau.',
    labels: {
      temporary: 'Mật khẩu tạm',
      current: 'Mật khẩu hiện tại',
      next: 'Mật khẩu mới',
      confirm: 'Nhập lại mật khẩu mới',
    },
    rules: {
      title: 'Yêu cầu mật khẩu',
      met: 'đạt',
      minLength: (min: number) => `Tối thiểu ${min} ký tự`,
      differentFromUsername: 'Khác tên đăng nhập',
      differentFromCurrent: 'Khác mật khẩu hiện tại',
      differentFromTemporary: 'Khác mật khẩu tạm',
      matches: 'Hai lần nhập trùng nhau',
    },
    actions: {
      cancel: 'Huỷ',
      saving: 'Đang lưu…',
      saveForced: 'Lưu mật khẩu mới',
      save: 'Lưu mật khẩu',
    },
  },
  theme: {
    dark: 'Chế độ tối',
  },
  routeError: {
    title: 'Có lỗi xảy ra',
    fallback: 'Không mở được trang này. Thử lại, nếu vẫn lỗi hãy báo cho người quản trị.',
    retry: 'Thử lại',
  },
  shell: {
    loading: 'Đang tải…',
    loadingLabel: 'Đang tải ứng dụng',
    mainNav: 'Điều hướng chính',
  },
  nav: {
    settings: 'Cài đặt',
  },
  settings: {
    title: 'Cài đặt',
    profile: {
      title: 'Hồ sơ',
      role: (role: string) => `Vai trò: ${role}`,
    },
    appearance: {
      title: 'Giao diện',
    },
    password: {
      title: 'Mật khẩu',
      open: 'Đổi mật khẩu',
      changed: 'Đã đổi mật khẩu',
    },
    account: {
      title: 'Tài khoản',
      signOutLabel: 'Đăng xuất tài khoản',
    },
  },
  login: {
    title: 'Đăng nhập',
    username: 'Tên đăng nhập',
    usernamePlaceholder: 'Ví dụ: an.nv',
    usernameRequired: 'Cần nhập tên đăng nhập',
    password: 'Mật khẩu',
    passwordRequired: 'Cần nhập mật khẩu',
    submit: 'Đăng nhập',
    submitting: 'Đang đăng nhập…',
    forgotPassword: 'Quên mật khẩu: liên hệ quản trị viên để được cấp mật khẩu tạm.',
    passwordChanged: 'Đã đổi mật khẩu, hãy đăng nhập lại',
    errors: {
      networkTitle: 'Không có kết nối mạng',
      networkMessage: 'Cần có mạng để đăng nhập.',
      invalidCredentialsTitle: 'Sai tên đăng nhập hoặc mật khẩu',
      invalidCredentialsMessage: 'Kiểm tra lại chữ hoa, chữ thường và bộ gõ tiếng Việt.',
      tooManyRequestsTitle: 'Thử đăng nhập quá nhiều lần',
      retryAfter: (seconds: number) => `Thử lại sau ${seconds} giây.`,
      retryLater: 'Chờ một lúc rồi thử lại.',
      failedTitle: 'Không đăng nhập được',
    },
  },
  notFound: {
    title: 'Không tìm thấy trang',
    description: 'Đường dẫn này không có hoặc đã bị đổi.',
    backHome: 'Về trang chủ',
  },
} as const
