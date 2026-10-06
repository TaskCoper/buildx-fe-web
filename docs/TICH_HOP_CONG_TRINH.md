# Tích hợp tạo công trình — S10/S11

Cập nhật ngày 03/10/2026. Màn `/contractors/[projectId]/profile` tạo công trình SITE khi người dùng bấm **Tiếp tục: Kiểm tra hồ sơ** và hồ sơ đã hợp lệ. Mở form hoặc lưu thông tin chưa đủ chỉ ghi bản nhập liệu trên thiết bị, theo tài khoản; không tạo hồ sơ thiếu dữ liệu ở backend.

## Căn cứ và phạm vi

- UI: [MO_TA_GIAO_DIEN.md](MO_TA_GIAO_DIEN.md), [MO_TA_GIAO_DIEN_V11.md](MO_TA_GIAO_DIEN_V11.md), S10/S11, và ảnh người dùng cung cấp.
- Nghiệp vụ: `../bmt-documentation/userstory/STORY-SITE-001.md`, `STORY-SITE-004.md`; `businessrule/BR-SITE-001.md` đến `BR-SITE-007.md` và `tdd/TDD-SITE-001.md` đến `TDD-SITE-005.md`. Các mở rộng hồ sơ, danh mục hiện trạng và tệp theo TDD-SITE-003/004/005 thay contract tên/địa chỉ cũ. Địa chỉ dùng PROJ, tra tọa độ dùng MAP.
- Contract thực tế: `../bmt-be/src/bmt-be.presentation/apis/constructionSite/`, `bmt-be.contract/services/constructionSite/`, policy/handler tương ứng và OpenAPI tại [Swagger BMT](https://bmt-api.vnzdna.com/swagger/index.html). Code backend dùng `catalogRevisionId` và `profile.locationDatasetVersion`; không gửi các tên minh họa khác trong TDD.

| Yêu cầu                                                                                | Contract và code frontend                                                                                   | Kiểm tra liên quan                                             |
| -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Hồ sơ bắt buộc, không gọi AI/gói, tên tối đa 200, địa chỉ chi tiết tối đa 500          | `construction-site.service.ts`, `ConstructionSiteForm`, POST SITE                                           | STORY-SITE-001; BR-SITE-001/002; TDD-SITE-003; UT-SITE-045/046 |
| Tầng/tum/phong cách theo danh mục đã ghim; không áp dụng gửi null, Không tum gửi false | options/catalog, schema và `toSiteProfile`                                                                  | BR-SITE-005; TDD-SITE-003; kiểm tra logic thuần và trình duyệt |
| Nguồn dự toán hoàn tất; chỉ gửi sourceEstimateId, khóa trường kế thừa                  | estimate-sources/list/detail, form chọn nguồn                                                               | BR-SITE-004; TDD-SITE-003; ST-SITE-046/047                     |
| Địa chỉ đủ tỉnh/xã/dataset và tọa độ của địa chỉ hiện tại                              | PROJ locations; MAP search/place; khóa địa chỉ của phản hồi geocode                                         | BR-SITE-001; TDD-SITE-002/003 và TDD-MAP-001                   |
| Hiện trạng lấy từ backend; giữ tên lịch sử của công trình                              | create-options/catalog/detail; không dùng ba mã CMS để ghi SITE                                             | BR-SITE-006; TDD-SITE-004                                      |
| Tối đa 9 tệp, mỗi tệp 10.000.000 byte; không có URL công khai                          | Ticket SITE → signed PUT → complete; uploadIds trong POST tạo                                               | STORY-SITE-004; BR-SITE-007; TDD-SITE-005                      |
| Mất phản hồi không tự tạo lại; sửa/tệp dùng version, không tự retry mutation           | Lưu dấu lần tạo trước POST, đối chiếu danh sách; chặn sửa sau xung đột đến khi người dùng tải phiên bản mới | TDD-SITE-003/005                                               |

## API đã nối

Các đường dẫn dưới đây tương đối với `/api/v1`, qua `http` dùng chung cookie, refresh và chuẩn hóa lỗi. Chỉ signed PUT staging gửi trực tiếp đến kho bằng fetch, `credentials: omit`.

- GET `/me/construction-sites/create-options` và `/{siteId}/catalog`.
- GET `/me/construction-sites/estimate-sources?pageIndex=&pageSize=20` và `/estimate-sources/{estimateId}`.
- POST `/me/construction-sites`; PUT `/{siteId}` với expectedVersion; GET danh sách/chi tiết. Danh sách đọc đủ các trang khi đối chiếu kết quả tạo.
- GET `/estimate-locations/provinces`; GET `/estimate-locations/provinces/{provinceCode}/wards?datasetVersion=`.
- GET `/maps/search?address=`; GET `/maps/place?refId=`. Đổi tỉnh/xã/đường làm tọa độ cũ mất hiệu lực; phản hồi của địa chỉ cũ bị bỏ.
- POST `/me/construction-site-uploads` với Idempotency-Key; POST `/{uploadId}/complete`; GET `/{uploadId}` khi đang xác minh.
- POST `/me/construction-sites/{siteId}/attachments`; DELETE `/{attachmentId}?expectedVersion=` khi chỉnh hồ sơ đã tạo.
- GET `/construction-sites/{siteId}/attachments/{attachmentId}/content` qua client có xác thực ở S11.

Diện tích và ngân sách gửi chuỗi thập phân invariant, không chuyển qua Number. S11 hiển thị tiền bằng BigInt để giữ đủ chữ số. Những trường Number trong model hồ sơ cũ chỉ phục vụ các màn tương thích, không dùng xây request ghi SITE.

ID bản nhập liệu trên URL có thể khác GUID công trình. Khi tạo thành công, lưu GUID ngay trước khi đọc chi tiết/điều hướng; tải lại trang sẽ đọc SITE thật. Draft và query cache được tách theo tài khoản. Chế độ mock là lựa chọn rõ ràng bằng `NEXT_PUBLIC_USE_MOCK_API=true`; API thật lỗi không tự chuyển sang dữ liệu mẫu.

## Thay đổi giao diện

Giữ form hai cột, chọn phạm vi, mô tả nhu cầu, nút đóng và bước kiểm tra hồ sơ. Giữ stepper dùng chung S10/S11. Theo yêu cầu người dùng, bỏ nút “Lưu trên thiết bị”, thông báo lưu bên cạnh và khối cảnh báo dưới nút “Tiếp tục: Kiểm tra hồ sơ”, gồm liên kết xem gói thiết kế.

- Thêm chọn dự toán nguồn, tầng/tum, phong cách kiến trúc/nội thất theo loại công trình, và tra/chọn vị trí. Nội dung tra vị trí có thể rút gọn về tối đa 500 ký tự mà không sửa địa chỉ công trình.
- Hai nhóm phong cách nằm ở cột phải, phía trên Nhu cầu thi công, thay dropdown bằng thẻ chọn có ảnh từ danh mục API. Chưa chọn loại thì hiện lời nhắc; nhóm không áp dụng hiện Không áp dụng. Mỗi nhóm chọn một phong cách; hồ sơ có nguồn giữ lựa chọn và khóa thao tác. Nếu danh mục chưa có ảnh, thẻ hiển thị Chưa có ảnh minh họa.
- Hiện trạng và danh mục lấy từ backend, thay lựa chọn CMS trong phần ghi SITE. Khi chọn nguồn, các trường kế thừa được khóa; chỉ có thể đổi/bỏ nguồn trước khi tạo.
- Gộp Bản vẽ và Ảnh hiện trạng thành một vùng chọn tệp ở S10. Khi gửi backend, PDF/DWG/DXF thuộc nhóm Bản vẽ; JPG/JPEG/PNG/WebP thuộc nhóm Ảnh hiện trạng. Tệp đã lưu giữ nguyên nhóm. Bỏ hỗ trợ XLSX ở S10; thêm DWG/DXF/WebP theo contract SITE. S11 có nút tải tệp qua API có xác thực.
- Bản nhập liệu chưa đủ vẫn tự lưu khi rời trường. Hộp thoại khi đóng form vẫn có lựa chọn lưu rồi rời trang. Backend không có trạng thái nháp SITE.
- Thêm thông báo lỗi tại form, trạng thái tải/xác minh, xử lý tên trùng, đổi danh mục/địa chỉ, nguồn không còn hợp lệ và kiểm tra kết quả tạo chưa rõ.
- Bấm “Chọn” trong hộp thoại, hoàn tất hồ sơ tại S11 hoặc mở URL dự án hợp lệ ở S12–S18 đều lưu mã và thông tin tóm tắt vào localStorage (`savico.selected-contractor-projects`), tách theo tài khoản. Khôi phục dữ liệu đã lưu trước khi ghi lựa chọn từ màn hoàn tất. Trang `/contractors` ưu tiên dự án đã lưu sau khi tải lại và cập nhật tóm tắt bằng dữ liệu hiện tại. Chỉ thay/bỏ lựa chọn khi danh sách đã tải thành công và xác nhận dự án bị xóa, chốt thầu hoặc thiếu thông tin bắt buộc; không dùng cache đang tải lại hoặc lỗi API để kết luận. Khi chưa có lựa chọn hợp lệ, lưu hồ sơ đủ điều kiện mới nhất làm mặc định; không lưu hồ sơ thiếu thông tin. Thao tác chọn không gửi lời mời và không ghi trạng thái lên backend.
- Sửa hồ sơ đang chọn cập nhật tên, địa chỉ và tóm tắt đã lưu; sửa hồ sơ khác không đổi lựa chọn. Đồng bộ lựa chọn giữa các tab qua sự kiện `storage` và khi quay lại cửa sổ. URL có mã dự án cụ thể giữ ngữ cảnh của trang đang mở khi tab khác đổi lựa chọn. Xóa khóa lưu trữ làm sạch lựa chọn trong bộ nhớ; dữ liệu sai cấu trúc hoặc sai chủ tài khoản không được khôi phục.
- Hồ sơ cục bộ và lựa chọn dự án lưu `userId` cùng `ownershipVersion: 1` khi tạo mới hoặc sau response SITE thuộc tài khoản. Không tự xác nhận chủ từ tên, khóa localStorage hoặc `userId` từng được tự bổ sung bằng cơ chế cũ. Bản cục bộ chưa rõ chủ được giữ nguyên nhưng không xuất hiện trong danh sách và không mở/sửa/chọn được bằng URL. Bản đã có `constructionSiteId` chỉ được khôi phục sau GET danh sách/chi tiết `/me/construction-sites` xác nhận quyền; không dùng dữ liệu cục bộ chưa xác nhận để thay cho API. Phản hồi tải/lưu đến sau khi đổi tài khoản bị chặn trước khi ghi sang tài khoản mới. Hai trường cục bộ không được gửi làm chủ sở hữu trong body SITE/RFQ; backend vẫn kiểm chủ từ phiên đăng nhập.
- Mở hoặc F5 `/contractors/preview/matches` khôi phục lựa chọn từ localStorage, đọc hồ sơ hiện tại rồi chuyển sang `/contractors/[projectId]/matches`. Trong lúc khôi phục hiện trạng thái tải; chỉ hiện dải xem thử khi chưa chọn hoặc hồ sơ đã bị xóa, chốt thầu hay thiếu thông tin bắt buộc. Lỗi tải hồ sơ hiện nút Thử lại và giữ lựa chọn đã lưu. URL đã có mã dự án cụ thể giữ đúng dự án đó.

## Kiểm chứng và phần còn lại

Đã kiểm tra logic thuần bằng script tạm: giới hạn số, độ chính xác, null khi không áp dụng, false cho Không tum, địa chỉ thay đổi, đối chiếu lần tạo và lỗi validator .NET dạng camelCase/PascalCase. Đây không phải test suite mới trong repository.

Kiểm thử trình duyệt dùng Chrome headless với phiên thử riêng, mock auth và chặn request bằng fixture contract; không ghi lên backend production. Các nhánh được kiểm tra gồm tạo độc lập, tạo từ nguồn, diện tích sai, tọa độ cũ, tên trùng, tải/hoàn tất tệp và gửi uploadIds, xem lại sau reload, ngân sách vượt Number.MAX_SAFE_INTEGER, đối chiếu khi mất phản hồi và màn hình nhỏ. Tiếng Anh vẫn bị proxy chuyển về tiếng Việt theo cấu hình có sẵn; đã bổ sung đủ hai bộ message, chưa bật lại giao diện tiếng Anh.

Kiểm tra bổ sung bằng fixture xác nhận F5 tại `preview/matches` khôi phục hồ sơ đã chọn và các liên kết dùng đúng mã dự án; lựa chọn tách theo tài khoản. Đã kiểm tra màn hình nhỏ, URL dự án cụ thể, hồ sơ bị xóa/đã chốt thầu/chưa đủ thông tin, giữ lựa chọn khi API lỗi và dùng bàn phím bấm Thử lại.

Ngày 06/10/2026: bổ sung 12 regression test chạy bằng `node --test scripts/project-selection.test.mjs`, kiểm tra lựa chọn đầu tiên, ID cục bộ/GUID cùng công trình, giữ lựa chọn khi có hồ sơ mới hơn, cập nhật tóm tắt, xóa/không đủ điều kiện, tách tài khoản, phản hồi muộn, khôi phục giữa tab, dữ liệu cũ/sai cấu trúc và rollback khi ghi localStorage thất bại. Trình duyệt dùng mock auth và response fixture đã xác nhận hoàn tất S11 → S12 đánh dấu đúng dự án, đổi hồ sơ, khôi phục qua landing/preview, mở URL cụ thể, F5, cập nhật tóm tắt, đồng bộ hai tab và giữ lựa chọn khi API danh sách trả 500. Không thay đổi bố cục hoặc xóa/ẩn thành phần giao diện; chưa kiểm chứng luồng này bằng phiên backend thật.

Typecheck, lint, format:check và build production đã đạt. Build lần đầu trong sandbox không tải được font Google; chạy lại ngoài sandbox đã thành công. Kiểm tra trình duyệt bổ sung cũng xác nhận sửa công trình dùng expectedVersion, chỉ tải phiên bản mới khi người dùng chọn xem lại sau xung đột, và hồ sơ có nguồn không gửi lại profile/tọa độ khi sửa.

Chưa kiểm chứng POST bằng tài khoản và dữ liệu thử trên backend thật; chưa kiểm chứng parser CAD/PDF và chính sách riêng tư/CORS của bucket thật. Swagger chứng minh endpoint được công bố, không chứng minh toàn bộ luồng đã chạy thành công.

Phạm vi và mô tả nhu cầu thi công không thuộc DTO SITE. Hai trường vẫn được giữ và lưu trên thiết bị, chưa đồng bộ giữa thiết bị hoặc gửi cho nhà thầu. Luồng mời/khảo sát RFQ đã nối API riêng; xem [Tích hợp lời mời báo giá](TICH_HOP_LOI_MOI_BAO_GIA.md). Đăng ký triển khai và giám sát ngoài S10/S11 giữ mức tích hợp hiện có. Tạo công trình không có nghĩa lời mời đã được gửi. Chưa deploy thay đổi lên Vercel.

## Bản đồ và tìm địa chỉ (03/10/2026)

Form hồ sơ hiển thị VietMap bằng `LocationMap` dùng chung với dự toán. Ô tìm vị trí tự truy vấn sau khi ngừng gõ 400 ms, hiện danh sách gợi ý; Enter cho phép tìm lại; đã bỏ nút tra vị trí theo yêu cầu ngày 04/10/2026. Chọn kết quả để đặt ghim; kéo ghim/bấm bản đồ điều chỉnh tọa độ sau khi đã chọn. Hồ sơ khóa hoặc đã tạo từ nguồn chỉ xem bản đồ. Thay địa chỉ hoặc gõ truy vấn mới bỏ xác nhận vị trí cũ; phản hồi cũ bị hủy. API tìm/tra địa chỉ vẫn là `/maps/search` và `/maps/place`, không đổi contract lưu hồ sơ.

Kiểm tra bổ sung đạt: typecheck, lint, format, production build. Trình duyệt với API và nền bản đồ giả lập đã xác nhận gợi ý tự động, chọn bằng bàn phím, VietMap canvas/ghim, bấm bản đồ cập nhật tọa độ trong request tạo, chặn tọa độ cũ sau đổi địa chỉ và giao diện 390 px không tràn ngang. Script tạm: `/private/tmp/savico-site-map-browser.mjs`. Đã thêm chữ vi/en; `/en` hiện được proxy của ứng dụng chuyển về `/vi`, nên chưa kiểm giao diện tiếng Anh riêng. Chưa kiểm chứng dịch vụ tìm địa chỉ và tile VietMap thật trong ca này.

Ngày 04/10/2026: gộp tìm địa chỉ vào ô Số nhà, đường; bỏ ô tra vị trí riêng, tiêu đề Vị trí công trình và dòng xác nhận lặp địa chỉ. Gợi ý dùng số nhà–đường cùng tỉnh/phường đã chọn; giữ bản đồ chỉnh ghim và một dòng hướng dẫn ngắn. Địa chỉ nguồn vẫn khóa, danh sách gợi ý tự tra theo địa chỉ nguồn khi tạo.

## Hồ sơ công trình phía quản trị (04/10/2026)

`/vi/admin/construction-sites` đã bổ sung chi tiết diện tích đất, hiện trạng, địa chỉ ba phần, ngân sách, khởi công, loại, tầng/tum, phong cách, tham chiếu dự toán nguồn, tệp và VietMap chỉ đọc. Dữ liệu lấy từ hai GET `/admin/construction-sites` và `/admin/construction-sites/{id}` theo STORY-SITE-002 AC-011–013, BR-SITE-003/007, TDD-SITE-003/005 và `Response.StaffConstructionSiteItem`. Số tiền dùng chuỗi decimal và BigInt khi định dạng để không mất độ chính xác. Trường không áp dụng hiện rõ; không suy thành giá trị 0.

Tải tệp qua GET `/construction-sites/{siteId}/attachments/{attachmentId}/content` bằng HTTP client có cookie/refresh; kiểm số byte trước tải, không sử dụng URL kho công khai. API kiểm quyền từng lần. Chỉ hiển thị mã dự toán nguồn, không mở route kết quả riêng của khách. Lỗi đọc chi tiết 403/404 hoặc lỗi khác ẩn dữ liệu cũ và cho thử lại. Không thêm sửa/xóa hồ sơ hay tệp trong admin.

Kiểm chứng admin: typecheck/lint/format/build đạt; OpenAPI môi trường trả 200 và có ba route đọc danh sách, chi tiết, nội dung tệp. Trình duyệt trên production build với API/tile fixture đã kiểm đủ trường, số tiền 28 chữ số không mất chính xác, null/false, nguồn, bản đồ chỉ xem, tải thành công, tải bị 403 không sinh tệp, lỗi chi tiết 403 ẩn dữ liệu cũ và drawer ở 390 px không tràn. Script tạm `/private/tmp/savico-admin-site-browser.mjs`. Chưa kiểm chứng tài khoản admin thật, dữ liệu DB hoặc quyền kho tệp trên môi trường thật.
