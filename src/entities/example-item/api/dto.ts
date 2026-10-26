// Hình dạng dây của /example-items đúng như API gửi (snake_case). Không xuất qua index.ts: ESLint cấm import ngoài api/.
export interface ExampleItemDto {
  id: string
  name: string
  description: string
  created_at: string
}

// Thân POST/PUT.
export interface ExampleItemInputDto {
  name: string
  description: string
}
