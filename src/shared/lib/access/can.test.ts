import { Roles } from './access.config'
// <example-item>
import { Permissions } from './access.config'
// </example-item>
import { can, canAny, hasRole } from './can'

const user = {
  role: Roles.Member,
  permissions: ['custom:read', 'custom:write'] as readonly string[],
}

describe('can', () => {
  test('true khi người dùng có quyền', () => {
    expect(can(user, 'custom:read')).toBe(true)
  })

  test('false khi người dùng không có quyền', () => {
    expect(can(user, 'custom:delete')).toBe(false)
  })

  test('false khi danh sách quyền rỗng', () => {
    expect(can({ permissions: [] }, 'custom:read')).toBe(false)
  })

  // <example-item>
  test('dùng được hằng số Permissions của ví dụ', () => {
    expect(can({ permissions: [Permissions.ItemRead] }, Permissions.ItemRead)).toBe(true)
    expect(can({ permissions: [Permissions.ItemRead] }, Permissions.ItemWrite)).toBe(false)
  })
  // </example-item>
})

describe('canAny', () => {
  test('true khi có ít nhất một quyền trong danh sách', () => {
    expect(canAny(user, ['custom:delete', 'custom:write'])).toBe(true)
  })

  test('false khi không có quyền nào trong danh sách', () => {
    expect(canAny(user, ['custom:delete', 'custom:admin'])).toBe(false)
  })

  test('danh sách rỗng trả false', () => {
    expect(canAny(user, [])).toBe(false)
  })
})

describe('hasRole', () => {
  test('true khi vai trò nằm trong danh sách', () => {
    expect(hasRole(user, [Roles.Admin, Roles.Member])).toBe(true)
  })

  test('false khi vai trò không nằm trong danh sách', () => {
    expect(hasRole(user, [Roles.Admin])).toBe(false)
  })

  test('danh sách rỗng trả false', () => {
    expect(hasRole(user, [])).toBe(false)
  })
})
