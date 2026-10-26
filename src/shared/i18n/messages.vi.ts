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
} as const
