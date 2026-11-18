import { fc, test } from '@fast-check/vitest'
import { evaluatePasswordPolicy, PASSWORD_MIN_LENGTH } from './password-policy'

// Mật khẩu dài, ký tự in được; tên đăng nhập chỉ ASCII để đổi hoa/thường không dính chuyện chữ đặc biệt (ß → SS).
const text = fc.string({ unit: 'grapheme-ascii', maxLength: 30 })
const username = fc.string({ unit: 'grapheme-ascii', minLength: 1, maxLength: 12 })
const mode = fc.constantFrom('forced', 'voluntary' as const)
const input = fc.record({ newPassword: text, confirm: text, username, current: text })

const RULE_IDS = ['minLength', 'differentFromUsername', 'differentFromCurrent', 'matches']
const okFlags = (rules: ReturnType<typeof evaluatePasswordPolicy>) => rules.map((rule) => rule.ok)

test.prop([input, mode])('luôn trả đủ bốn luật theo đúng thứ tự, mọi đầu vào', (value, m) => {
  const rules = evaluatePasswordPolicy(value, { mode: m })

  expect(rules.map((rule) => rule.id)).toEqual(RULE_IDS)
  expect(rules.every((rule) => rule.label.length > 0)).toBe(true)
})

test.prop([input])('chế độ chỉ đổi nhãn, không đổi kết quả đạt hay không', (value) => {
  expect(okFlags(evaluatePasswordPolicy(value, { mode: 'forced' }))).toEqual(
    okFlags(evaluatePasswordPolicy(value, { mode: 'voluntary' })),
  )
})

test.prop([input], { numRuns: 200 })(
  'mật khẩu mới rỗng: không luật nào đạt (không có luật đúng "tình cờ")',
  (value) => {
    const rules = evaluatePasswordPolicy({ ...value, newPassword: '', confirm: '' })

    expect(rules.every((rule) => !rule.ok)).toBe(true)
  },
)

test.prop([input])('đổi hoa/thường của tên đăng nhập không đổi kết quả', (value) => {
  expect(
    okFlags(evaluatePasswordPolicy({ ...value, username: value.username.toUpperCase() })),
  ).toEqual(okFlags(evaluatePasswordPolicy({ ...value, username: value.username.toLowerCase() })))
})

test.prop([input])(
  '"hai lần nhập trùng nhau" đối xứng khi đổi chỗ mật khẩu mới và nhập lại',
  (value) => {
    const matches = (v: typeof value) =>
      evaluatePasswordPolicy(v).find((rule) => rule.id === 'matches')?.ok

    expect(matches({ ...value, newPassword: value.confirm, confirm: value.newPassword })).toBe(
      matches(value),
    )
  },
)

// Mật khẩu hợp lệ dựng sẵn: đủ dài, khác tên đăng nhập và mật khẩu hiện tại, hai lần nhập trùng.
const validCase = fc
  .record({
    newPassword: fc.string({
      unit: 'grapheme-ascii',
      minLength: PASSWORD_MIN_LENGTH,
      maxLength: 30,
    }),
    username,
    current: text,
  })
  .filter(
    ({ newPassword, username: u, current }) =>
      newPassword.toLowerCase() !== u.toLowerCase() && newPassword !== current,
  )

test.prop([validCase, mode], { numRuns: 200 })(
  'mật khẩu hợp lệ dựng sẵn thì cả bốn luật đều đạt',
  ({ newPassword, username: u, current }, m) => {
    const rules = evaluatePasswordPolicy(
      { newPassword, confirm: newPassword, username: u, current },
      { mode: m },
    )

    expect(rules.every((rule) => rule.ok)).toBe(true)
  },
)
