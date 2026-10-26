import type { ExampleItem, ExampleItemInput } from '../model/example-item'
import type { ExampleItemDto, ExampleItemInputDto } from './dto'

export function fromExampleItemDto(dto: ExampleItemDto): ExampleItem {
  return {
    id: dto.id,
    name: dto.name,
    description: dto.description,
    createdAt: dto.created_at,
  }
}

// Chọn từng trường để dữ liệu thừa của form không lọt lên dây.
export function toExampleItemInputDto(input: ExampleItemInput): ExampleItemInputDto {
  return { name: input.name, description: input.description }
}
