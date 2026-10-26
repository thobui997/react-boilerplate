import { cn } from './cn'

describe('cn', () => {
  it('gộp class Tailwind xung đột, giữ class cuối', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
  })

  it('bỏ qua giá trị falsy', () => {
    const hidden = false as boolean
    expect(cn('a', hidden && 'b', undefined, 'c')).toBe('a c')
  })
})
