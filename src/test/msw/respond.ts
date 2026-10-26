// Phản hồi tuỳ biến cho lần gọi thứ `index` (từ 0); `undefined` thì dùng phản hồi thành công mặc định.
export type RespondTo<T> = (
  call: T,
  index: number,
) => Response | undefined | Promise<Response | undefined>
