---
name: savico-implement-feature
description: Triển khai hoặc sửa tính năng trên frontend savico-ai dựa trên tài liệu bmt-documentation và backend bmt-be. Dùng cho luồng màn hình, form, trạng thái, phân quyền và tính năng nối API; thông báo khi thay đổi hoặc xoá giao diện. Không dùng cho yêu cầu chỉ triển khai backend.
---

# Triển khai tính năng SAVICO AI

Hoàn thành luồng người dùng trong `savico-ai`, bám theo nghiệp vụ đã thống nhất và API thực tế. Đường dẫn repository trong skill tính từ gốc `savico-ai/`; liên kết Markdown tính từ file chứa liên kết.

## Đọc trước khi viết code

1. Đọc `AGENTS.md`/`CLAUDE.md` áp dụng, `docs/ARCHITECTURE.md` và code của tính năng hiện có. Đọc toàn bộ [quy trình đọc tài liệu](references/documentation-workflow.md) và thực hiện trước khi sửa code, kể cả khi yêu cầu chỉ là sửa một hành vi.
2. Với thay đổi màn hình, đọc `docs/MO_TA_GIAO_DIEN.md`, `docs/TRANG_THAI_DUNG_KHUNG.md`, route và component hiện tại. Phân biệt phần đã nối API với mock, stub hoặc dữ liệu CMS lưu cục bộ.
3. Tóm tắt tài liệu đã đọc, AC/BR cần đáp ứng, màn hình và API bị ảnh hưởng. Chỉ hỏi phần nghiệp vụ chưa rõ; không hỏi lại yêu cầu đã được người dùng chốt. Tiếp tục phần độc lập nếu một contract còn thiếu.
4. Khi viết tài liệu hoặc báo cáo, áp dụng `../bmt-be/.claude/skills/vietnamese-clear-writing/SKILL.md` hoặc bản `.codex` tương ứng. Nếu nguồn thiếu, tìm bản khác và báo chính xác phần chưa đọc được.

## Thông báo khi thay đổi hoặc xoá giao diện

- Trước khi sửa, thông báo màn hình/route nào bị tác động, thành phần nào sẽ thêm, đổi, ẩn hoặc xoá, lý do và tác động tới thao tác người dùng. Kể cả đổi trường nhập, nhãn, nút, điều hướng, điều kiện hiển thị hoặc trạng thái loading/error đều cần nêu khi liên quan.
- Yêu cầu tích hợp API không mặc nhiên cho phép thiết kế lại hoặc xoá màn hình. Nếu API thiếu dữ liệu, báo phần thiếu và giữ cấu trúc hiện có; không âm thầm bỏ trường, nút hay luồng để khớp backend.
- Thông báo không đồng nghĩa với yêu cầu duyệt lại. Thay đổi đã được giao rõ thì thông báo rồi thực hiện. Nếu việc xoá hoặc đổi luồng nằm ngoài phạm vi, trình bày phương án cụ thể và hỏi trước khi làm phần đó; tiếp tục phần độc lập đã được giao.
- Khi bàn giao, nêu thay đổi giao diện theo trước → sau và phần đã xoá/ẩn. Nếu không thay đổi giao diện, ghi rõ điều đó.

## Triển khai

- Ánh xạ từng AC vào route, component, form, hook, service và trạng thái cần xử lý. Giữ luồng thay thế, ngoại lệ, quyền và điều kiện chuyển trạng thái; không chỉ làm trường hợp thành công.
- Giữ `app → features → shared`, không import chéo feature; dùng barrel cho bề mặt công khai. Ghép nhiều feature tại app bằng composition/slot. Không thêm backend hoặc Next.js API route để thay thế API .NET.
- Dữ liệu server dùng TanStack Query và query-key factory của feature; Zustand chỉ giữ trạng thái giao diện. Quy tắc nghiệp vụ thuần đặt trong `services/`; không đưa HTTP vào component hoặc service thuần.
- Khi nối API, đọc và áp dụng [savico-integrate-api](../savico-integrate-api/SKILL.md). Nếu quy trình tài liệu đã hoàn tất và nguồn không đổi, dùng tiếp kết quả đã đọc.
- Dùng React Hook Form + Zod theo mẫu hiện có. Cập nhật cả `messages/vi.json` và `messages/en.json`, điều hướng theo locale, dùng token và primitive hiện có. Giữ khả năng sửa nội dung qua CMS; kiểm tra quyền sở hữu namespace trong cấu hình admin nếu thêm namespace.
- Giữ public site dùng Tailwind/shadcn và Ant Design trong admin. Tái sử dụng `ResourceManager`, `DocumentEditor`, `OverrideEditor` nếu phù hợp; không mở rộng thành tái thiết kế admin.

## Kiểm chứng và bàn giao

- Chạy `pnpm typecheck`, `pnpm lint`, `pnpm format:check`. Chạy build khi thay đổi route, cấu hình hoặc ranh giới server/client cần kiểm chứng thêm.
- Kiểm tra luồng chính và các nhánh AC/BR bị tác động: validation, loading, empty, lỗi, thiếu quyền, hết phiên và thao tác lặp khi có. Với UI, kiểm tra locale vi/en, màn hình nhỏ/lớn và bàn phím ở phần thay đổi; báo rõ nếu không có công cụ/môi trường để kiểm tra.
- Đối chiếu đặc tả UT/ST; chỉ thêm test khi kiểm chứng hành vi có ý nghĩa và dùng hạ tầng phù hợp. Chưa có test runner thì không báo unit test đã đạt. Mock không chứng minh tích hợp backend thật.
- Cập nhật bản đồ trạng thái màn hình khi mức độ hoàn thiện thay đổi. Nếu cần sửa tài liệu nghiệp vụ, đọc template và hướng dẫn trong `bmt-documentation`; không sửa tài liệu để hợp thức hoá lỗi code.
- Báo chức năng hoàn thành, nguồn tài liệu, file chính, thay đổi/xoá giao diện, kết quả kiểm tra và phần còn thiếu. Phân biệt đã code, đã chạy mock và đã kiểm chứng với API thật.
