export interface ExampleItem {
  id: string
  name: string
  description: string
  // Chuỗi ISO 8601 như API gửi; định dạng hiển thị là việc của giao diện.
  createdAt: string
}

export interface ExampleItemInput {
  name: string
  description: string
}
