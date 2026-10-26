import { fromExampleItemDto, toExampleItemInputDto } from './mappers'

test('fromExampleItemDto đổi created_at thành createdAt và giữ các trường còn lại', () => {
  expect(
    fromExampleItemDto({
      id: 'i1',
      name: 'Mục A',
      description: 'Mô tả A',
      created_at: '2026-10-01T08:00:00Z',
    }),
  ).toEqual({
    id: 'i1',
    name: 'Mục A',
    description: 'Mô tả A',
    createdAt: '2026-10-01T08:00:00Z',
  })
})

test('toExampleItemInputDto chỉ gửi name và description', () => {
  const input = { name: 'Mục A', description: 'Mô tả A', extra: 'x' }

  expect(toExampleItemInputDto(input)).toEqual({ name: 'Mục A', description: 'Mô tả A' })
})
