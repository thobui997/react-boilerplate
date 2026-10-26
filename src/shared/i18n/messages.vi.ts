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
} as const
