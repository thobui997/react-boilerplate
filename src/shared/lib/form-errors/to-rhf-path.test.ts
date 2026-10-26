import { fieldErrorsFromApi, toRhfPath } from './to-rhf-path'

describe('toRhfPath', () => {
  test('đổi chỉ mục ngoặc vuông sang dấu chấm', () => {
    expect(toRhfPath('items[0].tags[2].label')).toBe('items.0.tags.2.label')
    expect(toRhfPath('items[10].title')).toBe('items.10.title')
  })

  test('chuỗi không có ngoặc vuông giữ nguyên', () => {
    expect(toRhfPath('newPassword')).toBe('newPassword')
  })
})

test('fieldErrorsFromApi lấy thông điệp đầu của mỗi khoá và đổi đường dẫn', () => {
  const result = fieldErrorsFromApi({
    'items[0].title': [
      { code: 'required', message: 'Cần nhập tên.' },
      { code: 'max', message: 'Quá dài.' },
    ],
    'items[1].tags[0].text': [{ code: 'required', message: 'Cần nhập nội dung.' }],
  })

  expect(result).toEqual([
    { path: 'items.0.title', message: 'Cần nhập tên.' },
    { path: 'items.1.tags.0.text', message: 'Cần nhập nội dung.' },
  ])
})

test('fieldErrorsFromApi với undefined trả mảng rỗng', () => {
  expect(fieldErrorsFromApi(undefined)).toEqual([])
})
