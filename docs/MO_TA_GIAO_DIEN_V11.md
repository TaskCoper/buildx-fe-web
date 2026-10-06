# SAVI · Bộ giao diện chuẩn — mô tả sơ bộ cho dev (v1.1)

> Nguồn: Google Docs "SAVICO_Mo ta giao dien" — `SAVI · BỘ GIAO DIỆN CHUẨN - MÔ TẢ SƠ BỘ CHO DEV`, v1.1, người lập: Lâm (PO).
> Link: <https://docs.google.com/document/d/1xV1PlIjxm4qeXZ1g8keX0JR9A9Xy7_MXuflRB-_wSbI/mobilebasic>
> — bản `/mobilebasic` nạp thẳng 25 ảnh demo vào DOM (`document.images`), ảnh S08 là `images[7]`;
> CSP của Google Docs chặn POST ra `localhost` nên không lưu ảnh về repo được, phải đo tại chỗ bằng canvas.
> Chép lại vào repo ngày 2026-09-05 để code có bản tham chiếu offline. Bản trong doc là bản gốc; khi hai bên lệch nhau thì **doc thắng**.
>
> v1.1 so với bản trước: thêm S18 Lời mời báo giá · "Chọn cách quản lý thi công" link tới Gói đăng ký › Gói giám sát · **bỏ thanh toán thẻ/Visa, chỉ còn QR** · bỏ phụ lục bản trước.
>
> Số liệu, giá, tên mẫu trên ảnh demo là **dữ liệu minh họa**; admin sửa được không cần deploy. Ảnh demo trong doc do AI sinh ra ở nhiều thời điểm khác nhau nên **không nhất quán giữa các hình** — chỉ dùng ảnh để đọc BỐ CỤC, còn nội dung và quy tắc bám theo phần chữ.

---

## 1. Luồng tổng thể & quy tắc

Luồng end-to-end: **A** mua gói / **B** tự tạo hồ sơ → Tìm nhà thầu → Sau khảo sát → Chọn cách quản lý thi công → Bảng điều khiển giám sát.

| Mã | Quy tắc |
| --- | --- |
| **R1** | Mỗi dự án mời **tối đa 3 nhà thầu**; không có bước so sánh báo giá. |
| **R2** | **Không hiển thị giá/báo giá của nhà thầu** trên web (giá gói dịch vụ SAVICO thì hiển thị bình thường). |
| **R3** | Sau khi khách gửi lịch khảo sát: khảo sát · báo giá · thương thảo · hợp đồng **làm ngoài web**. |
| **R4** | Màn theo dõi lời mời: đơn giản — đã mời ai + thanh trạng thái; **khách chỉ xem**; Ops cập nhật trạng thái. |
| **R5** | Giám sát: **6 giai đoạn cố định** (Hồ sơ pháp lý · Móng & khởi công · Phần thô – kết cấu · Hệ thống kỹ thuật & chống thấm · Hoàn thiện · Nghiệm thu & bàn giao). Giám sát xác nhận → hồ sơ khóa; sau khóa chỉ đổi qua **Yêu cầu sửa đổi** được bên kia duyệt; nhà thầu chỉ xem. |
| **R6** | Bảng điều khiển giám sát nằm trong Tài khoản của tôi › Dự án của tôi; **không có tab "Hạng mục cần xử lý"**; nhắc "còn X ngày / % tiến độ" ở mọi chỗ. |
| **R7** | Hai luồng vào (A có gói – hồ sơ sẵn / B tự tạo hồ sơ miễn phí) gặp nhau ở popup **"Bạn muốn bắt đầu như thế nào?"**. |
| **R8** | Nút "Chọn cách quản lý thi công" **link thẳng** tới Gói đăng ký › Gói giám sát (S19), không popup; sau khi mua gói, banner trên trang dự án đổi thành nút "Bảng điều khiển giám sát". |
| **R9** | Khách tải ảnh/tài liệu **kèm tên** = giai đoạn hoàn thành (**không checklist bắt buộc**); bảng lịch trình đặt phía trên danh sách giai đoạn. |
| **R10** | Thanh toán **chỉ bằng QR chuyển khoản** — bỏ thanh toán thẻ / Visa / cổng thanh toán ở mọi màn (gói thiết kế và gói giám sát). |

### Danh mục màn hình

| # | Màn hình | Luồng |
| --- | --- | --- |
| S01 | Bảng giá gói thiết kế | Mua gói |
| S02 | Popup Quà tặng đặc biệt | Mua gói |
| S03 | Xác nhận đơn hàng | Mua gói |
| S04 | Thanh toán QR | Mua gói |
| S05 | *(Bỏ)* Đang chuyển tới cổng thanh toán | Mua gói |
| S06 | Đang xác nhận chuyển khoản | Mua gói |
| S07 | Chưa nhận được thanh toán | Mua gói |
| S08 | Hoàn tất + popup "Bạn muốn bắt đầu như thế nào?" | Mua gói → chọn hướng |
| S09 | Landing Tìm nhà thầu | Tìm nhà thầu |
| S10 | Tự tạo hồ sơ dự án – Bước 1 | Tìm nhà thầu (B) |
| S11 | Kiểm tra hồ sơ dự án – Bước 2 | Tìm nhà thầu (B) |
| S12 | Nhà thầu được đề xuất | Tìm nhà thầu |
| S13 | Hồ sơ nhà thầu – Tổng quan | Tìm nhà thầu |
| S14 | Hồ sơ nhà thầu – Hợp tác SAVICO | Tìm nhà thầu |
| S15 | So sánh hồ sơ nhà thầu | Tìm nhà thầu |
| S16 | Chọn thời gian khảo sát | Tìm nhà thầu |
| S17 | Đã gửi lời mời & đăng ký khảo sát | Tìm nhà thầu |
| S18 | Lời mời báo giá (theo dõi lời mời đã gửi) | Tìm nhà thầu |
| S19 | Trang Gói giám sát thi công | Giám sát |
| S20 | Bảng điều khiển giám sát – giai đoạn đang thực hiện + modal Tải hồ sơ | Giám sát |
| S21 | Bảng điều khiển – giai đoạn sắp tới | Giám sát |
| S22 | Bảng điều khiển – giai đoạn đã xác nhận, có Yêu cầu sửa đổi chờ duyệt | Giám sát |
| S23 | Bảng điều khiển – giai đoạn v2 sau Yêu cầu sửa đổi của khách | Giám sát |
| S24 | Tài khoản của tôi (Giám sát của tôi) | Giám sát |
| PL | Cẩm nang – dấu (+) trên dòng bài viết | Phụ lục |

---

## 2. Mua gói thiết kế (S01–S08)

**S01 · Bảng giá gói thiết kế (trang công khai).** Menu "Bảng giá" (chưa đăng nhập) / "Gói đăng ký" (đã đăng nhập). Tab chuyển "Gói thiết kế | Gói giám sát" (tab Gói giám sát mở S19). 3 thẻ BASIC 399.000đ (Bắt đầu nhanh) · PLUS 1.490.000đ (Chọn đúng – Phổ biến nhất) · PRO 3.990.000đ (Tối ưu ngân sách): ảnh, câu phù hợp, giá thanh toán 1 lần, danh sách tính năng, nút (Bắt đầu ngay / Lập kế hoạch / Triển khai ngay); thẻ PRO có khối "Quà tặng đặc biệt". Dải CTA "Đăng ký ngay". Bảng "So sánh chi tiết 3 gói" (Quyền lợi chính · Tính năng thiết kế & dự toán · So sánh & tối ưu · Hỗ trợ · Đặc quyền gói PRO) với 3 nút chọn gói. Bảng "Giá trị khách hàng nhận được". 3 ghi chú cuối trang. Bấm chọn gói → S03; chưa đăng nhập → đăng nhập rồi quay lại đúng gói. **Lưu ý:** ghi chú "Thanh toán qua QR chuyển khoản hoặc cổng thanh toán" → chỉ ghi "QR chuyển khoản" (R10).

**S02 · Popup "Quà tặng đặc biệt".** Hiện trên trang Bảng giá khi bấm khối quà tặng ở thẻ PRO. Icon hộp quà; "Bộ thiết bị vệ sinh châu Âu trị giá 100 triệu đồng"; khối "+ Ưu đãi thêm" (phí gói 3.990.000đ khấu trừ vào giá trị hợp đồng khi ký hợp đồng thi công trọn gói); nút "Tôi đã hiểu"; dòng điều kiện áp dụng.

**S03 · Xác nhận đơn hàng (bước 2/4).** Stepper 4 bước: Chọn gói ✓ → Xác nhận đơn hàng → Thanh toán → Hoàn tất. Thông tin người mua (họ tên, SĐT, email – chỉnh sửa được). Hình thức thanh toán: **chỉ QR chuyển khoản** (tự động xác nhận 1–5 phút) — bỏ ô "Cổng thanh toán (thẻ, Visa, ví)" đang có trên ảnh (R10). Xuất hóa đơn (toggle + thông tin công ty). Cột phải "Đơn hàng của bạn": gói, quyền lợi, ô mã giảm giá (VD KHAITRUONG −15%), tạm tính, giảm giá, tổng thanh toán, nút "Tiến hành thanh toán", cam kết hoàn 100% trong 24h nếu chưa dùng.

**S04 · Thanh toán QR (bước 3/4).** Khung "Đang chờ thanh toán" + đếm ngược 15:00. Mã QR + nút Tải mã QR / Sao chép. Thông tin chuyển khoản (ngân hàng, số tài khoản, tên, số tiền, nội dung – có nút sao chép từng dòng). Hướng dẫn 3 bước. Nút "Tôi đã chuyển khoản" + "Cần hỗ trợ". Hệ thống tự nhận giao dịch → S08; bấm "Tôi đã chuyển khoản" → S06; hết 15 phút → cho tạo lại mã QR.

**S05 · (Bỏ).** Không dùng — đã bỏ thanh toán thẻ/Visa/cổng thanh toán (R10). Giữ số thứ tự để các tham chiếu không đổi.

**S06 · Đang xác nhận chuyển khoản.** Icon đồng hồ; mã đơn hàng, số tiền, nội dung chuyển khoản, thời gian; "Thường mất 1–5 phút"; nút "Tải lại trạng thái"; link "Tôi đã chuyển nhưng chưa thấy cập nhật" → Zalo hỗ trợ. Nhận được tiền → S08; quá thời gian → S07.

**S07 · Chưa nhận được thanh toán.** Icon "!"; mã đơn; các lý do có thể (sai nội dung chuyển khoản, giao dịch chưa hoàn tất, ngân hàng chậm); nút "Thử lại thanh toán", "Liên hệ hỗ trợ"; đơn hàng được giữ 24h. **Bỏ nút "Đổi hình thức thanh toán"** (chỉ còn QR, R10). Thử lại → S04.

**S08 · Hoàn tất + popup "Bạn muốn bắt đầu như thế nào?".** Bước 4/4 sau thanh toán thành công. Popup này cũng dùng cho luồng B sau S11 (R7). Nền: stepper 4 bước ✓, "Đã kích hoạt gói PLUS!", thẻ Gói của tôi, nút Xem biên nhận / Vào dự án của tôi. Popup 3 lựa chọn: (1) Tìm nhà thầu phù hợp; (2) Triển khai trọn gói cùng SAVICO (phổ biến nhất, quà tặng 100 triệu, khấu trừ phí gói); (3) Nói chuyện với chuyên gia. Tìm nhà thầu → S12; Đăng ký triển khai → form đăng ký, Ops liên hệ; Đặt lịch tư vấn → trang Tư vấn 1:1. **Lưu ý:** R1/R2 — mời tối đa 3 nhà thầu; báo giá nhận trực tiếp từ nhà thầu sau khảo sát, web không so sánh báo giá.

---

## 3. Tìm nhà thầu (S09–S18)

**S09 · Landing "Tìm nhà thầu" (trang công khai).** Hero + nút Tạo hồ sơ / Xem nhà thầu. 4 cam kết (Miễn phí cho chủ nhà · Nhà thầu đã xác minh · So sánh minh bạch · Thông tin liên hệ được bảo vệ). Khối "Tìm đúng người theo đúng tiêu chí" (6 tiêu chí) + danh sách xếp hạng 4 tab (Phù hợp nhất / Gần nhất / Đánh giá tốt nhất / Khảo sát sớm nhất) + chú thích cách xếp hạng. Bảng "So sánh minh bạch". "An toàn & minh bạch" (3 thẻ). "Ranh giới dịch vụ". FAQ 5 câu. CTA "Đã có hồ sơ thiết kế? Tạo hồ sơ". Dải "Bạn là nhà thầu? Trở thành đối tác". **Lưu ý:** R1 — tối đa 3 nhà thầu/dự án, áp dụng cho cả câu trả lời FAQ và nội dung so sánh.

**S10 · Tự tạo hồ sơ dự án – Bước 1 (luồng B, không mua gói).** Badge "MIỄN PHÍ · KHÔNG CẦN ĐĂNG KÝ GÓI". Stepper: Thông tin & nhu cầu → Kiểm tra hồ sơ. Thông tin công trình (Tên dự án, Loại công trình, Diện tích đất, Hiện trạng, Quy mô, Tỉnh/TP, Địa chỉ, Ngân sách dự kiến, Dự kiến khởi công). Nhu cầu thi công (4 thẻ phạm vi: Thi công trọn gói / Phần thô / Hoàn thiện / Nội thất; ô mô tả). Tài liệu hiện có (kéo thả PDF/JPG/PNG/XLSX ≤ 10 MB). Ghi chú hồ sơ tự tạo không gồm bản vẽ/dự toán do SAVICO phát hành. Nút Lưu nháp / "Tiếp tục: Kiểm tra hồ sơ".

**S11 · Kiểm tra hồ sơ dự án – Bước 2.** Tóm tắt Thông tin công trình / Nhu cầu thi công / Tài liệu đính kèm (mỗi khối có Chỉnh sửa, Thêm tệp). Cột phải: thẻ dự án, "Hồ sơ đã sẵn sàng" (3 tick), checkbox xác nhận, nút "Hoàn tất & tìm nhà thầu", "Lưu nháp và thoát". Hoàn tất → popup 3 lựa chọn (S08) → chọn Tìm nhà thầu → S12 (R7).

**S12 · Nhà thầu được đề xuất.** Header dự án + Bán kính tìm kiếm (5/10/20/50 km). Tab vùng Bắc/Trung/Nam. Chip sắp xếp (Phù hợp nhất · Gần công trình · Đánh giá tốt · Khảo sát sớm). Thẻ nhà thầu: checkbox So sánh, logo, tên, đánh giá, dự án tương tự, khoảng cách, khu vực phục vụ, khảo sát trong 24h, đang nhận dự án; nút "Xem hồ sơ" / "Mời báo giá". Panel phải "Đã chọn so sánh (n/3)" + nút "So sánh n nhà thầu"; khối "Vì sao SAVICO đề xuất?". **Lưu ý:** R1 — đủ 3 thì các nút mời còn lại bị khóa.

**S13 · Hồ sơ nhà thầu – tab Tổng quan.** Header: logo, tên, badge xác minh, đánh giá, dự án tương tự, khoảng cách, phục vụ; nút Mời báo giá, ♡ lưu, ⋯. Tab: Tổng quan / Dự án đã thực hiện / Năng lực pháp lý / Hợp tác SAVICO. Giới thiệu, Thế mạnh (chip), ảnh công trình. Cột phải: Thông tin hoạt động, nút Mời báo giá, ghi chú "Thông tin liên hệ được mở sau khi lịch khảo sát được xác nhận", link Báo cáo hồ sơ.

**S14 · Hồ sơ nhà thầu – tab Hợp tác SAVICO.** Khối "Đối tác hợp tác cùng SAVICO" (đã xác minh, hợp tác từ tháng/năm). Bản scan hợp đồng hợp tác: viewer + thumbnail trang, nút Tải bản PDF / Xem toàn màn hình. Cột phải "Thỏa thuận hợp tác": Mã hồ sơ, Ngày ký, Số trang, Trạng thái; ghi chú bản scan đã đối chiếu. Các tab dùng chung header.

**S15 · So sánh hồ sơ nhà thầu.** Bảng 3 cột × tiêu chí: Đánh giá · Dự án tương tự · Khoảng cách · Thời gian khảo sát · Phạm vi phục vụ · Hồ sơ pháp lý · Bảo hành · Đang nhận dự án. Hàng nút "Chọn nhà thầu". Thanh dưới: "Quay lại danh sách" / "Mời nhà thầu đã chọn báo giá". **Lưu ý:** R1 — cho chọn tối đa 3 nhà thầu (không giới hạn 1). R2 — bảng không có thông tin giá.

**S16 · Chọn thời gian khảo sát.** Thẻ nhà thầu. Lịch tháng + khung giờ (08:00–17:00, T2–T7). Ô "Ghi chú cho buổi khảo sát". Thông tin liên hệ nhận xác nhận. Nút "Đề xuất ghi chú", "Hủy", "Xác nhận thời gian khảo sát". Dòng "Nhà thầu sẽ liên hệ trước 30 phút". Mời nhiều nhà thầu → lặp màn này cho từng nhà thầu.

**S17 · Đã gửi lời mời & đăng ký khảo sát.** Icon gửi; Mã yêu cầu (KS-2026-…). Chi tiết yêu cầu: nhà thầu, trạng thái Đã gửi, ngày giờ khảo sát, địa điểm, ghi chú. Khối "Đội ngũ hỗ trợ SAVICO sẽ liên hệ với bạn". Nút "Theo dõi yêu cầu" / "Quay lại danh sách nhà thầu". Sau màn này mọi việc diễn ra ngoài web (R3). Khi mời nhiều nhà thầu, khối Chi tiết yêu cầu liệt kê tất cả (≤ 3).

**S18 · Lời mời báo giá (theo dõi lời mời đã gửi).** Vào từ nút "Theo dõi yêu cầu" ở S17, thẻ dự án, hoặc menu Tìm nhà thầu khi dự án đã gửi lời mời. Header dự án. Tiêu đề + ô đếm "Đã mời 3/3 nhà thầu tối đa". Mỗi nhà thầu một thẻ: logo, tên, badge xác minh, đánh giá, dự án tương tự, khoảng cách; nhãn trạng thái; nút "Xem hồ sơ"; dòng Mã lời mời (INV-2026-…), Gửi lúc, Hồ sơ v1 · số tệp, "Cập nhật … · đội hỗ trợ SAVICO"; thanh 4 nấc **Đã gửi → Đã tiếp nhận → Nhà thầu đã nhận → Hoàn tất**. Cột phải: "Ý nghĩa trạng thái"; "Hồ sơ đã gửi" (v1, ghi chú hồ sơ không chứa ngân sách hay thông tin giá); "Đội hỗ trợ SAVICO". **Lưu ý:** R4 — khách chỉ xem; R2/R3 — không có số tiền, đổi lịch/ngừng lời mời qua đội hỗ trợ.

---

## 4. Gói giám sát thi công (S19–S24)

**S19 · Trang Gói giám sát thi công (trang công khai).** Tab "Gói giám sát" trên trang Bảng giá; nút "Chọn cách quản lý thi công" từ dự án nhảy thẳng vào trang này (R8). 3 thẻ: Tự quản lý 0đ · SVC CHECK 8.900.000đ/dự án · SVC CONTROL 18.900.000đ/dự án (khuyến nghị cho nhà ở). Dòng chi phí giám sát ≈ 0,6–1,3% giá trị công trình. Bảng "So sánh chi tiết 3 lựa chọn". "Add-on & phụ phí". "Nguyên tắc phạm vi dịch vụ". "Hành trình khách hàng" 8 bước. "Giá trị khách hàng nhận được". 3 ghi chú (thanh toán, phạm vi 3 tầng/300 m², bán kính 30 km). Chọn gói → checkout 4 bước như mua gói thiết kế (chỉ QR, R10), đơn hàng gắn với dự án → Hoàn tất → nút "Bảng điều khiển giám sát". **Lưu ý:** trong bảng điều khiển, gói hiển thị là "Gói An Tâm" (= SVC CHECK) / "Gói Toàn Diện" (= SVC CONTROL). Quyền lợi diễn đạt theo 6 giai đoạn (R5).

**S20 · Bảng điều khiển giám sát – giai đoạn đang thực hiện + modal "Tải hồ sơ".** Vào từ Tài khoản của tôi › Dự án của tôi › thẻ dự án › nút "Bảng điều khiển giám sát" (R6). Tiêu đề + dòng dẫn; nút "Về dự án". Banner "Còn 16 ngày – Giai đoạn 4…" + nút "Tải hồ sơ giai đoạn 4" / "Đến giai đoạn 4". Thẻ dự án + 5 ô: Tiến độ 6 giai đoạn · Giai đoạn hiện tại · Hạn hoàn thành · Bàn giao dự kiến · Lượt kiểm tra kỹ sư. Sợi chỉ 6 giai đoạn có mốc HÔM NAY. Bảng "Lịch trình 6 giai đoạn" đặt trên danh sách giai đoạn (R9). Cột trái: 6 thẻ giai đoạn. Cột phải: Ảnh & tài liệu, Nhận xét & trao đổi, Kết quả kiểm tra của Giám sát, Lịch sử & phiên bản. Modal "Tải hồ sơ": Loại, Tệp ≤ 10 MB, Tên/ghi chú, nút Hủy / "Tải lên & hoàn thành giai đoạn"; ghi chú người tải + thời gian chụp (EXIF) + thời gian tải.

**S21 · Giai đoạn sắp tới.** Tag Sắp tới, "Bắt đầu sau 17 ngày", lịch kế hoạch; khối "Chưa đến giai đoạn này… Gợi ý chuẩn bị: …"; Lịch sử. Chưa cho tải hồ sơ.

**S22 · Giai đoạn đã xác nhận, có Yêu cầu sửa đổi chờ khách duyệt.** Tag Đã xác nhận · v1 · "Yêu cầu sửa đổi CR-02". Banner "Giám sát đề xuất sửa đổi hồ sơ đã xác nhận (CR-02) – cần bạn duyệt trước …; từ chối thì giữ nguyên v1" + nút "Xem & duyệt". Ảnh & tài liệu (nhãn KH/GS, ghi chú "Đã khóa ở v1"). Nhận xét (đã khóa). Kết quả kiểm tra. Lịch sử & phiên bản.

**S23 · Giai đoạn v2 sau Yêu cầu sửa đổi của khách.** Tag Đã xác nhận · v2. Nút "Yêu cầu sửa đổi". Banner xanh "hồ sơ khóa v2; muốn bổ sung… gửi yêu cầu sửa đổi để Giám sát duyệt". Ảnh có nhãn "thêm ở v2". Nhận xét có tag CR-01. Lịch sử & phiên bản (chip v1 · v2). Bản ghi CR-01: người đề xuất, thời điểm, "Đã áp dụng → v2", lý do, phản hồi.

**S24 · Tài khoản của tôi (có "Giám sát của tôi").** Cột trái: thẻ hồ sơ; "GÓI CỦA TÔI"; "GIÁM SÁT CỦA TÔI" (gói, tên dự án, mã SVG-…, tiến độ 6 giai đoạn %, giai đoạn hiện tại, còn X ngày, lượt kiểm tra kỹ sư, hạn gói, bàn giao, nút "Bảng điều khiển giám sát"). Chính: tab "Dự án của tôi" / "Dự án yêu thích"; thẻ dự án + khối "GÓI AN TÂM · GIÁM SÁT". Dự án đã có nhà thầu khảo sát nhưng chưa có gói → nút "Chọn cách quản lý thi công" → S19 (R8).

---

## 5. Ghi chú điều hướng & màn làm sau

- "Chọn cách quản lý thi công" (nút trên S18 / thẻ dự án / trang dự án) → link thẳng tới Gói đăng ký › tab Gói giám sát (S19), **không popup, không dựng trang riêng** (R8). Chọn Tự quản lý → về trang dự án, thẻ ghi "Tự quản lý", giữ nút nâng cấp.
- Sau khi mua gói: banner đổi thành nút "Bảng điều khiển giám sát"; đội hỗ trợ phân công kỹ sư, mở 6 giai đoạn.
- **Cổng nhà thầu (làm sau):** nhà thầu đăng nhập chỉ xem các giai đoạn đã xác nhận của dự án mình thi công; không sửa, không duyệt, không thấy giai đoạn đang soạn (R5).

## Phụ lục · Cẩm nang – dấu (+) trên dòng bài viết

Bấm dấu (+) **hoặc bất kỳ đâu trên dòng** → dòng mở nhẹ tại chỗ (~¼ giây), hiện sapo 1–2 câu + link "Xem chi tiết →"; dấu + xoay thành ×, bấm lại để đóng; **không rời trang, không đổi URL**. Chỉ khi bấm "Xem chi tiết" mới mở trọn bài. Áp dụng cho mọi dòng bài ở mọi chuyên mục. Mobile: dòng bài thành thẻ, chạm cả thẻ để mở. *Hiện trạng cần sửa: bấm (+) đang nhảy thẳng sang trang bài viết.*

Nội dung cẩm nang: <https://drive.google.com/drive/u/1/folders/1MbQNZaWazh1l07RENY3fQhvVFxoiRbh0> (chưa có quyền truy cập tại thời điểm dựng khung).

---

## Số đo lấy từ ảnh demo

Đo trực tiếp trên pixel của ảnh trong doc (canvas + dò biên), không ước lượng bằng
mắt. Ảnh gốc **800×533**; cột "khổ thật" quy đổi theo hệ số 1.979 (= bề ngang phần
nội dung của bản dựng 1480px chia cho 748px đo được trên ảnh).

**Hình S08** — `images[7]`, 800×533:

| Chỗ | Trên ảnh (px) | Tỉ lệ | Khổ thật |
| --- | --- | --- | --- |
| Phần nội dung | x = 20…767 → 748 | 93.5% bề ngang trang | `w-[93.5%]` |
| Cột trái (thẻ gói) | x = 20…209 → 190 | 25.4% phần nội dung | 376px |
| Khe giữa hai cột | 28.5 | 3.81% | 56px |
| Cột phải (3 thẻ) | x = 237.5…767 → 529.5 | 70.79% | 1048px |
| Khe giữa hai thẻ | 13.25 | 2.5% cột phải | 26px |
| Thẻ lựa chọn | 157 × 341 (thẻ 1) | cao/rộng = 2.17 | 332 × 715 |
| Lề trong thẻ | 8 | 5.2% bề ngang thẻ | 16px (`p-4`) |
| Khung ảnh minh hoạ | 139 × 103 (thẻ 1) | **4:3**, chiếm 30% chiều cao thẻ | 4:3, `max-h-[40%]` |
| — thẻ 3 (4 ý thay vì 6) | 161 × 136 | 41% chiều cao thẻ | ảnh CO GIÃN theo chỗ trống |
| Nút đáy thẻ | 139 × 25 | | 274 × 50 |
| Vòng tròn tick | Ø 39 | 20.5% bề ngang cột trái | 77px (`size-20`) |
| Tiêu đề "Đã kích hoạt…" | 15/dòng, 2 dòng | | `text-3xl` |
| Thẻ gói xanh | 190 × 188 | cao/rộng = **0.99** (gần vuông) | 376 × 372 |
| — hàng quyền lợi | bước 30 | | 59px (`py-5`) |
| Hai nút dưới thẻ gói | cao 27 | | 53px (`h-13`) |

**Ba chỗ ảnh TỰ MÂU THUẪN**, không sao chép được nguyên xi:

1. Ba thẻ lựa chọn rộng **khác nhau** (157 / 172 / 178px) — bản dựng chia đều ba cột.
2. Khung ảnh minh hoạ mỗi thẻ một chiều cao (103 / — / 136px) vì AI vẽ cho vừa chỗ
   trống còn lại. Quy luật rút ra: **ảnh giãn để lấp chỗ trống**, danh sách ý giữ
   nguyên chiều cao tự nhiên — nên trong code khung ảnh là phần tử `grow`, còn `<ul>`
   thì KHÔNG `flex-1`, và nút được ghim đáy bằng `mt-auto`.
3. Lề dưới của thẻ chỉ còn ~8px trong khi lề trên là 20px.

---

## Điểm lệch — quyết định khi dựng khung

Những chỗ code **cố ý khác** ảnh demo hoặc bổ sung so với phần chữ. Mỗi mục đều có lý do; nếu PO không đồng ý thì sửa ở đây trước rồi sửa code.

| # | Chỗ | Quyết định | Vì sao |
| --- | --- | --- | --- |
| 1 | Menu chính | Một bộ duy nhất: Thiết kế & Dự toán · **Tìm nhà thầu** · Cẩm nang · Hướng dẫn · Gói đăng ký · Tư vấn 1:1, dùng chung cho khách và người đã đăng nhập | Ảnh demo có ba biến thể menu khác nhau; khung app chỉ nên có một. |
| 2 | S04 | **Giữ nút "Tôi đã chuyển khoản"** | Phần chữ yêu cầu (đường vào S06) nhưng ảnh không vẽ; thiếu nó thì khách không báo được là đã chuyển. |
| 3 | S04, S07 | Bỏ "Đổi hình thức thanh toán" và bỏ lý do "giao dịch bị hủy ở cổng thanh toán" | R10 — không còn cổng thanh toán nào để đổi hay để hủy. |
| 4 | S06, S07 | Stepper dừng ở nấc "Thanh toán", có trạng thái lỗi riêng | Ảnh tô xanh cả 4 nấc kể cả khi tiền chưa về / đã thất bại. |
| 5 | S08 | Ba lựa chọn hiển thị **inline** trong trang Hoàn tất; bản **hộp thoại** dùng ở S11 | Phần chữ gọi là popup, ảnh vẽ là trang. Một component, hai bối cảnh (R7). |
| 6 | S12 | Gộp bán kính + sắp xếp thành **một hàng** bộ lọc, bỏ tab vùng Bắc/Trung/Nam | Ba tầng điều khiển đẩy nhà thầu đầu tiên xuống quá sâu; bán kính tính từ công trình đã khoanh vùng rồi. |
| 7 | S12, S13, S15, S18 | Panel phải **sticky** | Danh sách dài, mà "Đã chọn so sánh (n/3)" và nút "Mời báo giá" là hành động chính. |
| 8 | S15, S19, S01 | Bảng rộng nằm trong khung cuộn ngang, cột tiêu chí `sticky left-0` | Phần chữ không nói gì về màn hình hẹp. |
| 9 | S16 | Thêm chỉ báo "Nhà thầu 2/3" và gom lịch của cả lượt vào **một** mã yêu cầu | Mời 3 nhà thầu là lặp màn này 3 lần; không có chỉ báo thì người dùng mất phương hướng. |
| 10 | S18 | Mỗi thẻ lời mời hiện thêm **lịch khảo sát đã đặt** | Sau S17 không còn chỗ nào xem lại được lịch đã hẹn. |
| 11 | S14 | Chỉ hiện siêu dữ liệu đã xác minh + khung xem bản scan **đã che**; không cho tải hợp đồng nguyên bản | Hợp đồng có chữ ký và con dấu của hai pháp nhân, không nên nằm trên trang công khai. Cần PO/pháp lý xác nhận. |
| 12 | S10/S11 vs S18 | Ngân sách là trường bắt buộc nhưng **không** nằm trong hồ sơ gửi nhà thầu. Trước đây có ghi chú ngay tại ô nhập; **đã BỎ ghi chú** theo yêu cầu của khách (Hình S10 không vẽ dòng nào ở đó) | Hai màn nói hai điều khác nhau; code vẫn chốt theo S18 nhưng nay KHÔNG còn nói với người dùng. **Cần PO xác nhận ngân sách có nằm trong hồ sơ gửi nhà thầu hay không.** |
| 13 | S19 | Bỏ dòng "xem báo giá nhà thầu" ở gói Tự quản lý và bỏ dòng "checklist theo từng giai đoạn" | Trái R2 và R9. |
| 14 | S20–S23 | Bảng lịch trình **gấp lại được**, mặc định đóng; chọn giai đoạn thì cuộn phần chi tiết vào tầm nhìn | Vẫn nằm trên danh sách giai đoạn (R9) nhưng không đẩy vùng làm việc xuống dưới màn hình đầu. |
| 15 | S20 modal Tải hồ sơ | Cho chọn **nhiều tệp** trước khi bấm hoàn thành giai đoạn | Một giai đoạn thi công có nhiều ảnh hiện trường. |
| 16 | S20–S23 | Banner đổi sang trạng thái cảnh báo khi **quá hạn** | "Còn X ngày" với X âm là vô nghĩa. |
| 17 | S24 | Khối "Giám sát của tôi" chỉ dựng **một lần**, đặt trên lưới dự án | Phần chữ đặt nó ở cả cột trái lẫn trong thẻ dự án với gần như cùng một bộ số. |
| 18 | S19 vs S20/S24 | Hiển thị **cả hai tên**: "SVC CHECK — Gói An Tâm" | Một gói mang hai tên ở hai màn thì khách tưởng là hai thứ. |
| 19 | Toàn bộ | Tên gói thiết kế hiển thị BASIC/PLUS/PRO qua i18n, **mã gói giữ nguyên** `basic`/`advanced`/`pro` | Đổi tên thương mại là việc nội dung, không phải migration dữ liệu. |

### Còn thiếu / chờ chốt

- ~~**Form "Đăng ký triển khai"** (từ S08) chưa có trong danh mục màn~~ — ĐÃ DỰNG: hộp thoại thu họ tên / SĐT / email / nhu cầu, tự điền theo tài khoản. Bản mô tả không liệt kê trường nào nên bộ trường lấy theo tiền lệ S16 (liên hệ nhận xác nhận) và S17 (Ops gọi để làm rõ nhu cầu). Gửi xong mới chỉ báo đã ghi nhận — chờ endpoint .NET.
- ~~**Luồng đánh giá nhà thầu**~~ — ĐÃ DỰNG: nút "Đánh giá nhà thầu" trên thẻ ở S18, chỉ hiện khi lời mời đã ở nấc "Hoàn tất" (đúng câu S09 quảng cáo), mỗi lời mời một lần. Form thu 1–5 sao + nhận xét; đánh giá xong thẻ đổi thành "Đã đánh giá n/5". Mock chặn cả ở tầng dữ liệu để backend chỉ việc lặp lại luật. Nấc "Hoàn tất" nay do màn Ops bên dưới đẩy, nên luồng chạy được trọn vẹn trong bản demo.
- ~~**Màn admin cho Ops** cập nhật 4 nấc trạng thái lời mời (R4) và kết quả kiểm tra của Giám sát~~ — ĐÃ DỰNG, hai màn trong nhóm *Vận hành*:
  - **Lời mời báo giá** (`/admin/invitations`) — đẩy trạng thái từng nấc một, không nhảy cóc và không lùi; mỗi lần bấm ghi thêm một mốc vào `steps` để dòng thời gian ở S18 là bản ghi chứ không phải suy ra. Đúng R4: khách chỉ xem.
  - **Giám sát thi công** (`/admin/inspections`) — kỹ sư ghi kết quả kiểm tra (người xác nhận, có tới công trình hay không, nội dung). Xác nhận làm ba việc cùng lúc vì thực tế chúng là một: khóa giai đoạn, mở giai đoạn kế tiếp, ghi mốc vào lịch sử (R5). `inspectionsUsed` chỉ tăng khi có tới công trình.
  - Kèm theo đó, lời mời và dự án giám sát chuyển sang sống ở `shared/cms` (`contractorInvitations`, `supervisionProjects`) — khu quản trị ghi và trang khách đọc cùng MỘT kho, vì `features/admin` không được import hai feature kia.
- **Cổng nhà thầu** — giai đoạn 2 theo phần chữ.
- **Nội dung Cẩm nang** trong thư mục Google Drive — chưa có quyền truy cập.
