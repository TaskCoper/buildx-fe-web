---
name: savico-integrate-api
description: Nối hoặc sửa tích hợp REST API .NET từ bmt-be vào savico-ai, thay mock bằng API thật và xử lý DTO, cookie auth, lỗi, query cache theo bmt-documentation. Dùng khi thêm endpoint client hoặc sửa luồng dữ liệu frontend; không dùng cho việc chỉ viết endpoint backend.
---

# Tích hợp API backend vào SAVICO AI

Triển khai client API trong `savico-ai` theo contract có căn cứ, giữ luồng giao diện hiện có. Các đường dẫn repository tính từ gốc `savico-ai/`.

## Đọc tài liệu và xác minh contract

1. Đọc hướng dẫn repository và thực hiện đầy đủ [quy trình đọc tài liệu](../savico-implement-feature/references/documentation-workflow.md) trước khi sửa code. Không bỏ qua vì yêu cầu chỉ là “nối API” hoặc “thay mock”. Nếu đã đọc trong cùng tác vụ và nguồn không đổi, không cần đọc lại.
2. Kiểm tra `src/shared/lib/api/`, cấu hình môi trường và feature tương tự để hiểu HTTP helper đang trả dữ liệu ở mức nào. Đọc API module, types, schema, query keys, hooks, mock và các màn hình gọi API bị tác động.
3. Đối chiếu TDD với code trong `../bmt-be/src/bmt-be.presentation/apis/`, `bmt-be.contract/services/`, validator và handler liên quan. Kiểm tra OpenAPI của môi trường đích khi truy cập được; URL từng được ghi trong dự án là `https://bmt-api.vnzdna.com/swagger/index.html`, cần xác minh môi trường hiện tại trước khi dùng. Không coi Swagger truy cập được là bằng chứng mọi endpoint đã chạy đúng.
4. Ghi contract cho các thao tác cần nối: HTTP method, route/version, auth/permission, query/body, trường bắt buộc/null, enum, request/response, lớp bọc kết quả, phân trang, status và mã lỗi. Ghi thêm upload/download, thời gian, đơn vị tiền hoặc job/polling khi endpoint có dùng.
5. Nếu tài liệu, backend source và môi trường đích lệch nhau, nêu điểm lệch. Không đoán API hoặc nới kiểu dữ liệu để bỏ qua lỗi. Khi cần quyết định nghiệp vụ, hỏi phần đó và tiếp tục phần độc lập.

## Thông báo tác động tới giao diện

- Nếu thay đổi hoặc xoá/ẩn giao diện, báo trước màn hình/route, trường/nút/luồng bị tác động, lý do và hành vi trước → sau. Báo lại thay đổi thực tế khi bàn giao. Đọc tài liệu UI trước khi sửa màn hình.
- Không xoá trường hoặc màn hình vì API chưa có dữ liệu. Nêu phần backend còn thiếu và phương án giữ UI; thay đổi ngoài phạm vi phải được người dùng quyết định trước. Thay đổi đã được giao thì thông báo và làm, không yêu cầu duyệt lại.
- Nếu chỉ đổi nguồn dữ liệu mà không đổi giao diện, ghi rõ trong kết quả.

## Triển khai API client

- Dùng `http`/`httpClient` từ barrel `@/shared/lib/api`; không tạo Axios instance khác, không gọi HTTP trực tiếp trong component. Feature API là hàm mỏng, DTO và phần ánh xạ về model giao diện nằm đúng feature. Không thêm backend vào Next.js để bù endpoint thiếu.
- Xác minh lớp bọc `Result<T>`/phân trang từ code và response thật; tránh bóc `data` hai lần. Kiểm tra null, enum, ngày giờ và đơn vị; không dùng ép kiểu hoặc `any` để che khác biệt contract. Thêm validation runtime ở ranh giới cần thiết theo mẫu dự án.
- Giữ cookie httpOnly do backend cấp, credentials và cơ chế refresh single-flight hiện có. Không lưu access/refresh token vào localStorage, Zustand hay biến `NEXT_PUBLIC_*`. Frontend guard chỉ hỗ trợ UX; quyền thực tế do backend kiểm tra. Không giả định tên role/permission backend giống nhãn UI.
- Chuẩn hoá lỗi qua `ApiError`, ánh xạ lỗi trường vào form và thông báo vào cả vi/en. Xử lý 401/403/validation/conflict/rate limit theo endpoint, không biến mọi lỗi thành danh sách rỗng hay thông báo thành công.
- Query keys phải chứa tham số làm thay đổi dữ liệu: bộ lọc, trang, ID, locale khi có. Invalidate đúng nhóm sau mutation; chỉ optimistic update khi có cách rollback phù hợp. Không tự retry mutation có thể tạo thanh toán/đơn/job lặp nếu contract chưa bảo đảm chống trùng.
- Giữ hủy request, timeout, upload và polling theo khả năng API khi cần. Không áp đặt polling hoặc retry cho endpoint không yêu cầu.
- Giữ mock và API thật cùng kiểu/hành vi contract. Dùng cờ môi trường hiện có; không tự bật mock hoặc trả dữ liệu giả khi API thật lỗi. Endpoint chưa có phải được báo là chưa tích hợp; chỉ giữ mock trong chế độ mock rõ ràng.
- Không sửa toàn bộ auth/HTTP/CMS dùng chung để giải quyết một endpoint riêng. Nếu cần sửa lớp dùng chung, kiểm tra các bên gọi bị ảnh hưởng và giữ kiến trúc `app → features → shared`.

## Kiểm chứng và bàn giao

- Chạy `pnpm typecheck`, `pnpm lint`, `pnpm format:check` và kiểm tra luồng màn hình liên quan theo AC/UT/ST đã đọc.
- Nếu có backend test/local và tài khoản phù hợp, tắt các cờ mock liên quan rồi kiểm tra request thực tế: URL, method, body/query, credentials, response, hiển thị và cache sau thao tác. Với lỗi, chọn các nhánh có trong contract. Không đưa cookie/token hay dữ liệu nhạy cảm vào báo cáo.
- Không tự gọi thao tác ghi trên production để thử API. Nếu chỉ có production hoặc thiếu tài khoản/backend, hoàn thành kiểm tra khả thi và nêu rõ phần tích hợp thật chưa xác minh; không coi mock/build thành công là kiểm thử end-to-end.
- Báo endpoint đã nối, nguồn contract và tài liệu đã đọc, mock còn lại, thay đổi/xoá UI, kiểm tra đã chạy và thiếu sót backend/môi trường. Chỉ nói đã tích hợp hoàn chỉnh khi luồng cần thiết thực sự được kiểm chứng.
