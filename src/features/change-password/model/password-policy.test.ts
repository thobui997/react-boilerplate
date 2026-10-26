import { evaluatePasswordPolicy } from './password-policy'

const BASE = {
  newPassword: 'matkhau-moi-1',
  confirm: 'matkhau-moi-1',
  username: 'an.nv',
  current: 'mat-khau-tam',
}
const rule = (input: typeof BASE, id: string) =>
  evaluatePasswordPolicy(input).find((r) => r.id === id)

test('tối thiểu 6 ký tự: 5 sai, 6 đúng', () => {
  expect(rule({ ...BASE, newPassword: 'abcde', confirm: 'abcde' }, 'minLength')?.ok).toBe(false)
  expect(rule({ ...BASE, newPassword: 'abcdef', confirm: 'abcdef' }, 'minLength')?.ok).toBe(true)
})

test('khác tên đăng nhập, không phân biệt hoa thường', () => {
  expect(
    rule({ ...BASE, newPassword: 'AN.NV', confirm: 'AN.NV' }, 'differentFromUsername')?.ok,
  ).toBe(false)
  expect(rule(BASE, 'differentFromUsername')?.ok).toBe(true)
})

test('chưa gõ mật khẩu mới thì các luật "khác …" chưa đạt', () => {
  const empty = { ...BASE, newPassword: '', confirm: '', current: '' }

  expect(rule(empty, 'differentFromUsername')?.ok).toBe(false)
  expect(rule(empty, 'differentFromCurrent')?.ok).toBe(false)
})

test('khác mật khẩu hiện tại', () => {
  expect(rule({ ...BASE, current: BASE.newPassword }, 'differentFromCurrent')?.ok).toBe(false)
  expect(rule(BASE, 'differentFromCurrent')?.ok).toBe(true)
})

test('hai lần nhập trùng nhau', () => {
  expect(rule({ ...BASE, confirm: 'khac-hoan-toan' }, 'matches')?.ok).toBe(false)
  expect(rule(BASE, 'matches')?.ok).toBe(true)
})

test('cả bốn luật đúng khi hợp lệ, theo đúng thứ tự và nhãn', () => {
  expect(evaluatePasswordPolicy(BASE)).toEqual([
    { id: 'minLength', label: 'Tối thiểu 6 ký tự', ok: true },
    { id: 'differentFromUsername', label: 'Khác tên đăng nhập', ok: true },
    { id: 'differentFromCurrent', label: 'Khác mật khẩu hiện tại', ok: true },
    { id: 'matches', label: 'Hai lần nhập trùng nhau', ok: true },
  ])
})

test('mật khẩu mới rỗng: không luật nào được coi là đúng "tình cờ"', () => {
  const rules = evaluatePasswordPolicy({ ...BASE, newPassword: '', confirm: '' })

  expect(rules.find((r) => r.id === 'minLength')?.ok).toBe(false)
  expect(rules.find((r) => r.id === 'matches')?.ok).toBe(false)
})

test('chế độ bắt buộc đổi nhãn luật thành "mật khẩu tạm"', () => {
  expect(
    evaluatePasswordPolicy(BASE, { mode: 'forced' }).find((r) => r.id === 'differentFromCurrent')
      ?.label,
  ).toBe('Khác mật khẩu tạm')
})
