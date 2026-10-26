import '@testing-library/jest-dom/vitest'
import { configure } from '@testing-library/react'

// Mặc định 1s là quá chặt khi cả bộ test chạy song song trên máy/CI bận: vài test findBy/waitFor đỏ ngẫu nhiên.
// Nới trần chờ; test xanh vẫn xong ngay khi điều kiện đúng.
configure({ asyncUtilTimeout: 4000 })
