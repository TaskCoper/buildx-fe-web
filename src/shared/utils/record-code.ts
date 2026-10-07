/**
 * Mã dự toán `BUILDX-YYYYMMDD-XXXXXX` và mã hồ sơ công trình `BUILDX-HS-YYYYMMDD-XXXXXX` do backend cấp. Frontend
 * không tự cấp mã cho dữ liệu thật; hàm sinh ở đây chỉ phục vụ bản mock để màn hình hiển thị đúng định dạng.
 */

/** 31 ký tự, bỏ 0 O 1 I L vì dễ đọc nhầm với nhau — cùng bảng ký tự backend dùng. */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000

/** Ngày theo giờ Việt Nam dạng YYYYMMDD. */
function vietnamDate(at: Date): string {
  return new Date(at.getTime() + VIETNAM_OFFSET_MS).toISOString().slice(0, 10).replaceAll('-', '')
}

function randomPart(length: number): string {
  return Array.from({ length }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join('')
}

/** Mã mẫu cho dữ liệu mock: `estimate` → `BUILDX-YYYYMMDD-XXXXXX`, `site` → `BUILDX-HS-YYYYMMDD-XXXXXX`. */
export function sampleRecordCode(kind: 'estimate' | 'site', createdAt: Date | string = new Date()): string {
  const prefix = kind === 'site' ? 'BUILDX-HS' : 'BUILDX'
  return `${prefix}-${vietnamDate(new Date(createdAt))}-${randomPart(6)}`
}
