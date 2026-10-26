import { render, screen } from '@testing-library/react'
import { makeUser } from '@/test/fixtures/user'
import { ProfileSection } from './profile-section'

test('hiện tên hiển thị, tên đăng nhập và "Vai trò: <role>"', () => {
  render(
    <ProfileSection
      user={makeUser({ displayName: 'Trần Thị Bình', username: 'binh.tt', role: 'admin' })}
    />,
  )

  expect(screen.getByRole('heading', { name: 'Hồ sơ' })).toBeInTheDocument()
  expect(screen.getByText('Trần Thị Bình')).toBeInTheDocument()
  expect(screen.getByText('binh.tt')).toBeInTheDocument()
  expect(screen.getByText('Vai trò: admin')).toBeInTheDocument()
})
