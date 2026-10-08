/**
 * Nội dung trang "Tìm nhà thầu" do admin biên tập: các khối của trang `contractors` mà backend lưu
 * (GET /pages/contractors/sections). Chỉ khai báo khóa trang; việc đọc khối dùng chung helper của trang chủ
 * (`home-sections.ts`) vì cùng cơ chế khối chữ: khối nào chưa lưu hoặc trường nào để trống thì trang dùng nội dung có sẵn
 * trong ứng dụng.
 */

/** Khóa trang trên backend. */
export const CONTRACTORS_PAGE_KEY = 'contractors'
