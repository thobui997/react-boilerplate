import { useBlocker } from 'react-router'
import { useBeforeUnload } from './use-before-unload'

// Điều hướng do app tự thực hiện (hết phiên → trang đăng nhập, bắt đổi mật khẩu → trang đổi mật khẩu) không được hỏi "bỏ thay đổi?":
// người dùng không còn lựa chọn ở lại, và hộp hỏi bị gỡ cùng trang khi cache bị xoá nên lần điều hướng sẽ rơi mất.
export const FORCED_NAVIGATION_STATE = { forcedByApp: true } as const

function isForced(state: unknown): boolean {
  return typeof state === 'object' && state !== null && 'forcedByApp' in state
}

// Chặn rời trang khi còn thay đổi chưa lưu: điều hướng trong app qua useBlocker, đóng tab qua beforeunload.
export function useLeaveConfirm(when: boolean) {
  const blocker = useBlocker(({ nextLocation }) => when && !isForced(nextLocation.state))
  useBeforeUnload(when)

  return {
    blocked: blocker.state === 'blocked',
    confirm: () => {
      if (blocker.state === 'blocked') blocker.proceed()
    },
    cancel: () => {
      if (blocker.state === 'blocked') blocker.reset()
    },
  }
}
