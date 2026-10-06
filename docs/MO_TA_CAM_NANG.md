# MÔ TẢ CHỨC NĂNG CẨM NANG — SAVICO AI

> Tài liệu nguồn do khách hàng cung cấp (`MotachucnangCamnang.docx`). Phần I là
> bản chép nguyên văn dùng làm chuẩn khi dựng giao diện. Phần II ghi lại các
> quyết định khi tài liệu này lệch với [MO_TA_GIAO_DIEN.md](./MO_TA_GIAO_DIEN.md)
> hoặc lệch với chính bộ ảnh minh họa đi kèm.
>
> Đánh số riêng: **Phần 1–3**, **Hình 1–12** (không có Hình 3 — tài liệu gốc nhảy số).

## I. BẢN CHÉP NGUYÊN VĂN

Cẩm nang là phần nội dung bổ sung cho SAVICO AI, gồm thư viện mẫu bản vẽ, thư viện mẫu 3D và kho bài viết kiến thức về xây nhà. Người dùng vào xem trực tiếp từ mục Cẩm nang trên thanh điều hướng, hoặc nhìn thấy nội dung gợi ý ngay trong lúc chờ hệ thống lập dự toán và kết xuất hồ sơ.

Tài liệu mô tả mười màn hình dựa trên bộ giao diện ý tưởng đã có. Các con số hiển thị trong ảnh chỉ là dữ liệu minh hoạ.

### Phần 1. Cẩm nang trong luồng dự án

Hai bước xử lý của dự án đều mất thời gian chờ. Thay vì để trống, màn hình chia làm hai cột: bên trái là mẫu gợi ý phù hợp với chính dự án đang xử lý, bên phải là tiến độ. Người dùng vừa chờ vừa tham khảo được.

#### 1.1. Màn chờ lập dự toán (bước 2) — Hình 1

Cột trái hiển thị năm mẫu bản vẽ 2D được lọc theo loại công trình và số tầng mà người dùng đã khai ở bước 1. Dòng mô tả ghi rõ căn cứ lọc, ví dụ "Mẫu bản vẽ 2D phù hợp với Nhà phố Trệt + 1 lầu của bạn". Nút "Xem mẫu khác" trên web chính thức sẽ bị lược bỏ.

Cột phải hiển thị vòng tiến độ theo phần trăm và ba mốc xử lý: đọc dữ liệu ảnh và mô tả, phân tích khối lượng, tính chi phí theo đơn giá khu vực. Mốc đã xong có dấu tích, mốc đang chạy có chấm tròn đặc, mốc chưa tới để trống.

- Nhấn vào một thẻ để xem nhanh mẫu đó.
- Nhấn biểu tượng trái tim để lưu mẫu lại dùng sau.
- Xử lý xong thì tự chuyển sang màn kết quả dự toán.

#### 1.2. Xem nhanh mẫu bản vẽ — Hình 2

Nhấn vào một thẻ mẫu sẽ mở hộp thoại xem nhanh, người dùng không phải rời khỏi trang đang chờ. Hộp thoại gồm ảnh bản vẽ, nút chuyển tầng, khung thông tin bản vẽ và đoạn mô tả bố trí công năng. Ai muốn xem kỹ hơn thì bấm "Mở trang đầy đủ" để sang trang chi tiết.

#### 1.3. Màn chờ kết xuất hồ sơ (bước 3) — Hình 4

Sang bước 3, nội dung gợi ý chuyển từ mặt bằng sang mẫu nội thất, lọc theo phong cách mà người dùng đã chọn. Cột phải tách thành ba tiến trình chạy lần lượt: xử lý bản vẽ, render phối cảnh, đóng gói PDF. Mỗi tiến trình có thanh phần trăm riêng và số lượng đã xử lý trên tổng số.

### Phần 2. Thư viện mẫu

Thư viện mẫu mở cho mọi người xem, không cần tạo dự án. Có hai loại nội dung dùng chung một khung giao diện, chuyển qua lại bằng công tắc ở góc trái.

#### 2.1. Thư viện mẫu bản vẽ 2D — Hình 5

Người dùng lọc theo loại công trình và quy mô số tầng, hoặc gõ tìm theo tên và kích thước. Mỗi thẻ hiển thị ảnh mặt bằng, tên mẫu và dòng thông số gồm kích thước lô, diện tích và số tầng — đủ để chọn mà không cần mở chi tiết. Dưới lưới có dòng đếm kết quả và điều hướng trang.

Góc phải thanh lọc có huy hiệu số lượt tra cứu còn lại trong ngày. Hết lượt thì mời người dùng nâng cấp gói.

#### 2.2. Thư viện mẫu bản vẽ 3D — Hình 6

Cùng khung với thư viện 2D nhưng phục vụ nhu cầu khác: tìm cảm hứng thẩm mỹ thay vì tìm công năng. Bộ lọc thứ hai đổi từ quy mô sang phong cách kiến trúc, ô tìm kiếm cũng đổi gợi ý theo. Thẻ hiển thị ảnh phối cảnh, tên mẫu kèm phong cách và số lượng ảnh 3D có trong bộ.

#### 2.3. Chi tiết mẫu bản vẽ 2D — Hình 7

Trang chi tiết cho xem đủ các tầng của một mẫu. Người dùng chuyển tầng bằng nhóm nút phía dưới ảnh hoặc bằng dải ảnh xem trước. Bản vẽ có ghi kích thước và đóng dấu bản quyền SAVICO.

Cột phải gồm khung thông tin bản vẽ, đoạn mô tả bố trí công năng từng tầng, dòng nhắc số lượt xem chi tiết còn lại trong ngày và nút đặt lịch tư vấn 1:1. Cuối trang là bốn mẫu tương tự để người dùng xem tiếp.

#### 2.4. Chi tiết mẫu nội thất 3D — Hình 8

Bố cục giống trang chi tiết mẫu 2D nhưng ảnh chiếm vai trò chính. Khung thông tin ghi loại công trình, phong cách và quy mô; phần mô tả nói về vật liệu, tông màu và cảm giác không gian thay vì kích thước kỹ thuật. Người dùng chuyển giữa các tầng để xem hết bộ ảnh của mẫu.

### Phần 3. Kiến thức và tin tức

Phần nội dung chữ gồm hai loại. Cẩm nang nền tảng là bộ kiến thức có cấu trúc cố định theo ba giai đoạn xây nhà, dùng để tra cứu. Tin tức là dòng bài cập nhật liên tục theo thời điểm.

#### 3.1. Trang Cẩm nang — Hình 9, Hình 10

Đầu trang là băng giới thiệu "Cẩm nang bắt buộc cho xây nhà" với nút bắt đầu đọc. Bên dưới là ba thẻ tương ứng ba giai đoạn: Phần thô, Phần hoàn thiện, Trang trí nội thất. Cuối trang là khối tin tức mới nhất.

Cho phép mở từng giai đoạn ngay tại trang. Khi mở, hệ thống hiện bảng các chủ đề của giai đoạn đó kèm số bài — ví dụ Phần thô có tám chủ đề từ Móng, Cọc, Cột dầm sàn cho tới Nghiệm thu — rồi hiện tiếp danh sách bài của chủ đề đang chọn. Cách này giúp người dùng thấy ngay độ dày của kho kiến thức.

#### 3.2. Bản tin và danh sách bài viết — Hình 11

Khối trên cùng là khối cẩm nang, sau đó ở dưới sẽ là bản tin do đội nội dung chọn bài đẩy lên, gồm một bài nổi bật lớn, ba bài phụ và cột bài liên quan bên phải. Khối dưới là danh sách đầy đủ, lọc theo chuyên mục, kèm ô tìm kiếm và phân trang.

#### 3.3. Trang bài viết — Hình 12

Bài viết có đường dẫn phân cấp bốn cấp theo đúng cấu trúc giai đoạn, chủ đề và bài, kèm ngày cập nhật và thời lượng đọc. Nội dung chia mục đánh số, xen ảnh minh hoạ.

Cột phải liệt kê các bài cùng chủ đề để người dùng đọc tiếp mà không rời chủ đề, phía dưới là khối mời tạo dự án và liên kết đặt lịch tư vấn. Cuối trang là ba bài viết liên quan.

## II. QUYẾT ĐỊNH KHI TÀI LIỆU LỆCH NHAU

Nguyên tắc: **chữ thắng ảnh** — tài liệu tự ghi "các con số hiển thị trong ảnh chỉ là dữ liệu minh hoạ".

| # | Điểm lệch | Đã chọn |
|---|-----------|---------|
| 1 | Chữ nói "năm mẫu", Hình 1 và Hình 4 vẽ sáu thẻ | 5 mẫu (`PERSONALIZED_TEMPLATE_COUNT`) |
| 2 | Chữ nói bỏ nút "Xem mẫu khác", ảnh vẫn có nút | Bỏ nút |
| 3 | Hình 1 không có thanh công cụ dọc, Hình 4 có (Mẫu / Bài tư vấn) | Giữ thanh công cụ 2 mục ở cả hai bước — bám mục III.3a của spec cũ |
| 4 | 2.2 gọi "mẫu bản vẽ 3D", 2.4 gọi "mẫu nội thất 3D" | Dùng "Mẫu bản vẽ 3D" ở công tắc thư viện, nội dung là phối cảnh nội thất |
| 5 | 3.1 và 3.2 mô tả như hai trang, ảnh cho thấy cùng một tab "Tin tức" | Một tab, cuộn dọc: Cẩm nang nền tảng → Bản tin → Tất cả bài viết |
| 6 | Thứ tự hai tab lớn khác nhau giữa Hình 5/6/11 và Hình 9/10 | Theo **Hình 9**: "Tin tức" trước và là tab mặc định; thư viện mẫu ở `?tab=library` |
| 7 | Spec cũ (mục IV/VI) gom ♥ từ trang Cẩm nang, ảnh mới không có ♥ ở lưới | Giữ ♥ trên thẻ lưới — nếu bỏ thì mục "Dự án yêu thích" mất nguồn |
| 8 | Bấm thẻ mẫu mở popup hay sang trang chi tiết? | **Popup chỉ ở màn chờ** (1.2 nêu lý do: "không phải rời khỏi trang đang chờ"). Ở lưới thư viện, bấm thẻ đi thẳng sang trang chi tiết — 2.1 nói thẻ đã "đủ để chọn mà không cần mở chi tiết" |

## III. ĐIỂM CÒN CHỜ KHÁCH CHỐT

1. **Hạn mức theo ngày** — tài liệu nói "còn lại trong ngày" và tách hai counter (tra cứu lưới / xem chi tiết), trong khi gói đăng ký hiện đếm một hạn mức theo gói. Đang dựng theo tài liệu (`HandbookQuota`, hai counter, reset ngày); backend phải trả đúng dạng này.
2. **Khách chưa đăng nhập** — thư viện "mở cho mọi người" nhưng vẫn hiện lượt còn lại và lời mời nâng cấp gói. Chưa định nghĩa cách đếm lượt cho khách.
3. **Căn cứ lọc cho Căn hộ** — 1.1 lọc theo loại công trình + số tầng, nhưng Bước 1 ẩn hẳn số tầng với Căn hộ.
4. **Tìm mẫu "theo kích thước"** — Bước 1 cố ý không có ô kích thước lô đất, nên không có số đo của dự án để đối chiếu khi gợi ý.
5. **Đặt lịch tư vấn 1:1** — spec cũ chỉ có hotline / Zalo. Đang dựng hộp thoại đặt lịch (họ tên, SĐT, khung giờ, ghi chú) gửi qua `POST /handbook/consultations`; cần khách xác nhận quy trình và nơi nhận yêu cầu.
6. **Ảnh và bản vẽ thật** — mẫu 2D đang vẽ bằng SVG, ảnh 3D và ảnh giai đoạn đang dùng ảnh stock. Cần bộ ảnh + file bản vẽ do admin tải lên.
7. **"Đủ 5 mẫu" chọi "đúng phong cách"** — hai yêu cầu này mâu thuẫn khi kho mẫu của một phong cách có ít hơn 5 mẫu. Đang xử lý: giữ toàn bộ mẫu khớp (đứng trước), chỉ bù thêm mẫu lệch tiêu chí cho đủ 5. Kho mẫu thật cần tối thiểu 5 mẫu mỗi phong cách × mỗi loại công trình thì panel mới luôn đúng gợi ý.
