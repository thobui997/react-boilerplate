// Kiểu hợp của mọi giá trị trong một object `as const`; đặt cùng tên với object để dùng như enum.
export type ValueOf<T> = T[keyof T]
