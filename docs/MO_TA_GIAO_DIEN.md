# MÔ TẢ GIAO DIỆN WEB — SẢN PHẨM WEB SAVICO AI

> Tài liệu nguồn do khách hàng cung cấp. Đây là bản chép nguyên văn dùng làm
> chuẩn khi dựng giao diện. Mọi mã nguồn trong repo này tham chiếu tới tài liệu
> bằng số mục (ví dụ `mục III.2, trường 4`).

## I. THÔNG TIN CHUNG

- **Mục đích**: mô tả từ đầu, đầy đủ giao diện và hành vi của từng màn hình trên web SAVICO AI để đội phát triển thực hiện. Tài liệu tự đứng độc lập: đọc tài liệu này là đủ để dựng toàn bộ giao diện.
- **Vị trí tài liệu**: tài liệu độc lập, xếp sau Biên bản nghiệm thu (ngày 10/7/2026), Phụ lục 01 - Feedback web và Phụ lục 02 - Mô tả hệ thống AI - Luồng hoạt động tối ưu 3 bước (bản cập nhật 14/7/2026). Phân công nội dung: Phụ lục 02 quy định luồng nghiệp vụ, nội dung AI sinh và cấu trúc dữ liệu; tài liệu này quy định giao diện, bố cục và hành vi trên màn hình. Nếu có khác biệt về giao diện thì theo tài liệu này.
- **Nguyên tắc giao diện chung** (thống nhất với Phụ lục 01, mục 3): tông màu sáng, nhấn màu thương hiệu SAVICO; bố cục cân đối, lấp đầy khoảng trống, mỗi màn hình một nhiệm vụ chính; cỡ chữ đủ lớn, phân cấp rõ tiêu đề - nội dung - ghi chú; hiệu ứng đơn giản, ưu tiên tốc độ; nút thao tác chính to, rõ, dễ thấy; người dùng phổ thông lần đầu dùng được ngay.
- **Quy ước xuyên suốt**:
  1. mọi trường nhập liệu đều có biểu tượng (i) bên cạnh nhãn — di chuột / chạm vào hiện tooltip giải thích ngắn phải nhập gì (nội dung tooltip quy định tại bảng mục III.2);
  2. chatbox AI nổi ở góc phải dưới trên mọi màn hình;
  3. footer mọi trang: nền tối, hiển thị Hotline và Zalo.

## II. THANH CÔNG CỤ VÀ CÁC TRANG CHUNG

### 1. Thanh công cụ (menu điều hướng)

- **Vị trí**: thanh ngang cố định trên cùng mọi trang, nền sáng.
- **Bên trái**: logo SAVICO — bấm vào quay về trang chủ (giữ vai trò mục Home).
- **Ở giữa — 3 mục điều hướng**: Thiết kế & Dự toán · Cẩm nang · Hướng dẫn. Mục đang mở được đánh dấu (gạch chân / tô vàng). Đầy đủ thanh công cụ theo thứ tự: Home (logo) → Thiết kế & Dự toán → Cẩm nang → Hướng dẫn.
- **Bên phải**: nút chính "Tạo dự án mới" (nút vàng, bo tròn, kèm dấu +) và biểu tượng tài khoản (avatar) — bấm mở Cửa sổ cá nhân (mục IV).

### 2. Trang chủ (Home)

- **Khối hero chia 2 cột.** Cột trái: thông điệp chính, dòng mô tả ngắn "AI tạo bản vẽ, phối cảnh và dự toán chỉ trong vài phút"; 2 nút: "Tạo dự án mới" (nút chính) và "Xem hướng dẫn" (nút phụ); dải 3 điểm cam kết: Nhanh chóng · Chính xác · Bảo mật.
- **Cột phải — khung minh họa sản phẩm TƯƠNG TÁC**: một khung lớn trình diễn kết quả mẫu, phía dưới khung có 4 tab nhỏ: Mặt bằng · Phối cảnh 3D · Hồ sơ · Dự toán. Bấm tab nào, nội dung khung đổi đúng nội dung đó: "Mặt bằng" hiện bản vẽ mặt bằng 2D mẫu; "Phối cảnh 3D" hiện ảnh phối cảnh mẫu; "Hồ sơ" hiện trang bìa bộ hồ sơ mẫu; "Dự toán" hiện bảng dự toán mẫu (hạng mục + thành tiền + tổng cộng). Tab đang chọn được tô vàng; nội dung là dữ liệu tĩnh minh họa, có hiệu ứng chuyển mượt, nhẹ.
- **Dải giới thiệu 3 bước** (dưới hero): ba thẻ nối bằng mũi tên:
  1. Nhập liệu — "Chụp ảnh lô đất, nhập thông tin nhu cầu và phong cách mong muốn";
  2. Nhận dự toán — "AI tạo bản vẽ, phối cảnh 3D và dự toán chi phí chi tiết";
  3. Hồ sơ thi công — "Render và nhận đầy đủ hồ sơ thiết kế, dự toán để thi công".
- **Khu "Hướng dẫn sử dụng"**: 3 thẻ video hướng dẫn nổi bật (ảnh bìa, thời lượng, tiêu đề, mô tả 1 dòng) + liên kết "Xem tất cả" mở trang Hướng dẫn.

### 3. Trang Cẩm nang (mục riêng trên thanh công cụ)

- **Vai trò**: trang tổng hợp để người dùng chủ động tra cứu toàn bộ cẩm nang; dùng nguồn dữ liệu tĩnh (admin biên soạn).

### 4. Trang Hướng dẫn

- **Nội dung**: chỉ chứa tài liệu hướng dẫn sử dụng: ô tìm kiếm; lưới video hướng dẫn ngắn 20–60 giây cho từng thao tác chính, sắp theo bước (chụp ảnh lô đất đúng cách, nhập liệu, cách đọc bảng dự toán, bộ hồ sơ gồm những gì, chia sẻ hồ sơ…); các bài hướng dẫn dạng chữ kèm ảnh.
- **Liên kết với khung hướng dẫn trong luồng**: nút "?" trên các màn hình của luồng 3 bước mở đúng video / bài hướng dẫn tương ứng trong trang này (theo Phụ lục 01, mục 5).

## III. LUỒNG THIẾT KẾ & DỰ TOÁN (3 BƯỚC)

**Thanh tiến trình (stepper)**: cố định trên đầu mọi màn hình của luồng, gồm 3 nấc: 1 Nhập liệu → 2 Nhận dự toán → 3 Hồ sơ thi công. Nấc đang làm tô vàng, nấc đã xong đánh dấu tích.

### 1. Cửa sổ Tạo dự án (hiện trước Bước 1)

- **Kích hoạt**: bấm "Tạo dự án mới" (thanh công cụ hoặc trang chủ), hoặc vào mục Thiết kế & Dự toán khi chưa có dự án nào đang mở.
- **Nội dung modal**: ô "Tên dự án" (bắt buộc; (i): gợi ý đặt tên gợi nhớ, VD "Nhà phố Tân Lợi 3 tầng") và ô "Mô tả" (tùy chọn, textarea ngắn; (i): ghi chú riêng về dự án). Nút "Tạo dự án" (nút chính) và "Hủy".
- **Hành vi**: bấm Tạo dự án → hệ thống sinh Project ID, lưu vào danh sách dự án của tài khoản và mở ngay màn hình Bước 1 — Nhập liệu.

### 2. Bước 1 — Nhập liệu (một màn hình, bố cục 2 cột)

- Toàn bộ việc nhập liệu gói gọn trong MỘT màn hình, MỘT form duy nhất (không chia chế độ nhập nhanh / chi tiết). Không có ô nhập kích thước lô đất — hình dạng, tỷ lệ lô đất do AI tự nhận diện từ ảnh người dùng tải lên.
- **Cột TRÁI** (thứ tự từ trên xuống): (1) Ảnh lô đất; (2) Địa chỉ công trình; (3) Loại công trình (dropdown); (4) khối trường hiện sau khi chọn loại công trình: Quy mô - số tầng, Tum, Gói hoàn thiện & nội thất.
- **Cột PHẢI — "Thông tin bổ sung"**: khi chưa chọn loại công trình hiển thị khung trống mờ kèm dòng nhắc "Chọn loại công trình để hiển thị các lựa chọn phù hợp". Sau khi chọn: Nhà ở / Nhà phố → hiện Kiểu kiến trúc (thẻ ảnh), Phong cách nội thất (thẻ ảnh), Mô tả mong muốn (textarea); Căn hộ → chỉ hiện Phong cách nội thất và Mô tả mong muốn (không có Kiểu kiến trúc).
- **Nút hành động**: "Nhận dự toán ngay" — nút lớn, full-width dưới đáy màn hình. Chỉ kích hoạt khi đã nhập đủ các trường bắt buộc; khi thiếu, nút mờ và bấm vào sẽ cuộn tới trường còn thiếu kèm viền đỏ nhắc. Dữ liệu lưu nháp tự động — thoát ra vào lại vẫn còn nguyên.

#### Bảng trường nhập liệu, điều kiện hiển thị và nội dung tooltip (i)

| # | Trường | Kiểu nhập | Hiển thị / bắt buộc | Nội dung tooltip (i) |
|---|--------|-----------|---------------------|----------------------|
| 1 | Ảnh lô đất | Chụp ảnh hoặc kéo-thả / bấm tải ảnh; preview ngay sau khi tải; JPG, PNG, HEIC tối đa 10MB | Luôn hiện, đầu cột trái. Bắt buộc. Căn hộ: đổi nhãn thành "Ảnh mặt bằng căn hộ hiện trạng" | "Chụp hoặc tải ảnh mặt bằng khu đất (nhìn rõ ranh giới, đủ sáng). AI tự nhận diện hình dạng, tỷ lệ lô đất - không cần nhập kích thước." Căn hộ: "Tải ảnh mặt bằng căn hộ (bản vẽ / sơ đồ từ chủ đầu tư) để AI nhận diện các phòng." |
| 2 | Địa chỉ công trình | Ô nhập có gợi ý địa chỉ (autocomplete) | Luôn hiện. Bắt buộc | "Nhập địa chỉ xây dựng (đường, xã/phường, tỉnh/TP). Hệ thống dùng địa chỉ để áp dụng đơn giá vật liệu, nhân công theo khu vực." |
| 3 | Loại công trình | Dropdown: Nhà ở / Nhà phố / Căn hộ | Luôn hiện. Bắt buộc. Quyết định các trường phía sau | "Chọn loại công trình. Các lựa chọn tiếp theo (số tầng, kiểu kiến trúc...) sẽ hiển thị phù hợp với loại bạn chọn." |
| 4 | Quy mô (số tầng) | Nút chọn nhanh: Trệt / Trệt + 1 lầu / Trệt + 2 lầu / ... | Hiện khi chọn Nhà ở / Nhà phố. Bắt buộc. Căn hộ: ẩn (hệ thống khóa 1 mặt sàn) | "Chọn số tầng dự kiến xây. Dùng để tính tổng diện tích sàn và dự toán." |
| 5 | Tum | Nút chọn: Có tum / Không tum | Hiện khi chọn Nhà ở / Nhà phố. Bắt buộc. Căn hộ: ẩn (mặc định Không tum) | "Tum là tầng nhỏ trên cùng che cầu thang, có thể làm sân phơi / kho. Chọn Có nếu muốn xây thêm tum." |
| 6 | Gói hoàn thiện & nội thất | Thanh kéo (slider) 3 nấc: Cơ bản - Tiêu chuẩn - VIP; mặc định Tiêu chuẩn | Hiện sau khi chọn loại công trình (mọi loại). Bắt buộc | "Một gói chung cho cả vật liệu hoàn thiện và nội thất, quyết định đơn giá dự toán. Kéo để chọn Cơ bản - Tiêu chuẩn - VIP." |
| 7 | Kiểu kiến trúc | Thẻ ảnh chọn nhanh: Nhà mái (Thái / Nhật / ngói truyền thống); Nhà phố hiện đại; Nhà tân cổ điển | Cột phải. Hiện khi chọn Nhà ở / Nhà phố. Bắt buộc. Căn hộ: ẩn | "Chọn kiểu dáng bên ngoài của công trình. Bản vẽ và phối cảnh sẽ được tạo theo kiểu kiến trúc này." |
| 8 | Phong cách nội thất | Thẻ ảnh chọn nhanh: Hiện đại; Tối giản; Tân cổ điển; Indochine... (danh mục do admin cấu hình) | Cột phải. Hiện với mọi loại công trình sau khi chọn loại. Bắt buộc | "Chọn phong cách không gian bên trong. Dùng để bố trí nội thất, tính dự toán nội thất và gợi ý mẫu trong cẩm nang." |
| 9 | Mô tả mong muốn | Textarea tự do, tối đa 500 ký tự, có placeholder ví dụ | Cột phải, dưới cùng. Hiện với mọi loại công trình sau khi chọn loại. Tùy chọn | "Mô tả thêm mong muốn: số phòng ngủ, chỗ đậu ô tô, hướng nhà, không gian mở, tông màu... AI đọc hiểu để tùy chỉnh kết quả." |

**Ghi chú**: Nhà ở và Nhà phố dùng chung bộ trường (khác nhau ở dữ liệu AI xử lý); Căn hộ ẩn Số tầng, Tum, Kiểu kiến trúc và khóa các giá trị tương ứng ngay trên giao diện (ẩn / disable, không báo lỗi sau khi bấm nút). Đổi loại công trình giữa chừng: trường không còn áp dụng bị ẩn và xóa giá trị, các trường còn lại giữ nguyên.

### 3. Bước 2 — Nhận dự toán

#### a) Màn hình chờ AI sinh dự toán — chia 2 phần

- **Phần TRÁI — tiến độ AI**: vòng tròn tiến độ % ở giữa, tiêu đề lớn "AI đang phân tích và lập dự toán..." và dòng mô tả trạng thái đang xử lý gì (đọc bản vẽ, phân tích khối lượng, tính chi phí...). Chatbox AI tự động trò chuyện trong lúc chờ, nói theo dữ liệu thật của dự án (khu vực, loại công trình, quy mô, ảnh đã tải).
- **Phần PHẢI — bảng "Cẩm nang cá nhân hóa"**: panel gồm thanh công cụ dọc bên trái panel với 2 mục, vùng nội dung bên phải panel hiển thị theo mục đang chọn:
  1. **Mẫu bố trí nội thất** — 3 mẫu lấy NGẪU NHIÊN từ dữ liệu tĩnh trong database, lọc theo các trường đã nhập ở Bước 1 (loại công trình, số tầng, tum, kiểu kiến trúc, phong cách nội thất); mỗi mẫu là 1 thẻ: ảnh + tên mẫu + tag phong cách, kèm nút ♥ Yêu thích (bấm để lưu, bấm lại để bỏ; đồng bộ vào mục Dự án yêu thích — mục IV);
  2. **Bài viết tư vấn về kiến trúc** — bài viết tĩnh chọn theo loại công trình / kiểu kiến trúc đã chọn.
- **Khi AI sinh xong**: thông báo cho người dùng (toast "Dự toán đã sẵn sàng" + tiến độ chuyển 100%) và hiện màn hình kết quả. Người dùng bấm nút đóng / thu nhỏ trên panel cẩm nang để đọc dự toán → panel THU NHỎ thành nút nổi ở góc màn hình (icon cẩm nang); bấm nút nổi để mở lại panel bất cứ lúc nào; trạng thái thu nhỏ / mở giữ nguyên khi cuộn trang.

#### b) Màn hình kết quả dự toán — thứ tự từ trên xuống

1. **Khối bảng dự toán**: hàng trên cùng gồm tiêu đề "Dự toán" và ô "Tổng dự toán" (tổng cả 3 phần, luôn hiển thị, nổi bật); hàng tab: Phần thô · Phần hoàn thiện · Phần nội thất (tab đang chọn tô vàng); thân bảng hiện các hạng mục lớn + thành tiền của tab đang xem (không liệt kê chi tiết); cuối bảng: dòng "Tổng" của tab đang xem, nút "XEM CHI TIẾT" và liên kết "Tải bảng dự toán Excel (.xlsx)" — cả hai cùng tải file Excel đầy đủ hạng mục con về máy.
2. **Biểu đồ tròn tỷ trọng**: ngay dưới bảng, thể hiện tỷ trọng chi phí 3 phần thô - hoàn thiện - nội thất theo gói đang chọn; số % hiển thị TRỰC TIẾP trên từng phần của hình tròn; chú thích bên cạnh ghi đủ: chấm màu + tên phần + % + số tiền (VNĐ) của từng phần.
3. **Đoạn văn tư vấn cá nhân hóa**: khung văn bản dưới biểu đồ, nội dung là văn mẫu soạn sẵn điền biến theo dự án (mẫu văn và ghi chú bắt buộc theo Phụ lục 02, mục II.3); xưng hô theo tên khách hàng.
4. **Nút cuối trang**: "Nhận hồ sơ thi công" — nút chính, full-width → chuyển sang Bước 3; các lựa chọn của dự án được lưu để dùng cho bộ hồ sơ.

### 4. Bước 3 — Hồ sơ thi công

#### a) Trạng thái CHƯA render (màn hình vào bước 3)

- **Đầu trang — khối THÔNG TIN DỰ ÁN**: tên khách hàng; tên dự án (Project ID); số điện thoại; địa chỉ công trình; ngày lập; quy mô: loại công trình, số tầng (có / không tum), tổng diện tích sàn (AI ước tính); gói đã chọn; kiểu kiến trúc; phong cách nội thất.
- **Giữa trang**: dải thẻ xem trước 4 thành phần của bộ hồ sơ, xếp lớp cạnh nhau: trang bìa hồ sơ · bản vẽ mặt bằng 2D · phối cảnh ngoại thất · bảng dự toán chi tiết (ở trạng thái xem trước).
- **Cột PHẢI**: nút chính "Render hồ sơ" (nút vàng lớn, trên cùng cột). Bên dưới là các nút Tải hồ sơ PDF / Tạo link chia sẻ / Gửi email / QR Code ở trạng thái mờ (disabled) kèm tooltip "Bấm Render hồ sơ trước", chỉ kích hoạt sau khi render xong.

#### b) Màn hình chờ render (sau khi bấm "Render hồ sơ")

- Bố cục GIỐNG màn hình chờ của Bước 2 — chia 2 phần: trái là tiến độ render (vòng %, tiêu đề "Đang render bộ hồ sơ thi công...", dòng trạng thái); phải là bảng cẩm nang cá nhân hóa nhưng nội dung về NỘI THẤT: (1) Mẫu nội thất lấy theo các trường đã nhập ở Bước 1 (ưu tiên phong cách nội thất, loại công trình, quy mô), mỗi mẫu có nút ♥ Yêu thích; (2) Bài viết tư vấn tĩnh về nội thất. Cơ chế thông báo khi xong, thu nhỏ về góc / mở lại giống hệt Bước 2.

#### c) Trạng thái ĐÃ render xong

- Tiêu đề lớn "Bộ hồ sơ thi công của bạn đã sẵn sàng" kèm lời cảm ơn; kích hoạt các nút: Tải hồ sơ PDF (hiển thị dung lượng file), Tạo link chia sẻ (xem online không cần đăng nhập), Gửi email, QR Code (dẫn tới link dự án); khối ghi chú bảo mật "Hồ sơ chỉ bạn và người được chia sẻ mới xem được".
- **Khối chuyển đổi cuối trang**: "Liên hệ SAVICO để được kiến trúc sư tư vấn trực tiếp, miễn phí" với 2 nút: Gọi ngay (hotline) và Chat Zalo.

## IV. CỬA SỔ CÁ NHÂN (tài khoản người dùng)

- **Truy cập**: bấm biểu tượng tài khoản (avatar) góc phải thanh công cụ.
- **Gồm 3 khu vực**: (1) Thông tin tài khoản — tên, số điện thoại, email, nút chỉnh sửa; (2) Dự án của tôi — danh sách dự án đã tạo: tên dự án, Project ID, ngày tạo, trạng thái đang ở bước nào (1/2/3), bấm vào mở tiếp dự án; (3) Dự án yêu thích — lưới toàn bộ mẫu người dùng đã bấm ♥ trong cẩm nang (màn hình chờ Bước 2, Bước 3 và trang Cẩm nang).
- **Mỗi thẻ trong Dự án yêu thích**: ảnh mẫu, tên mẫu, tag (phong cách nội thất / kiểu kiến trúc / loại công trình), ngày lưu; bấm thẻ mở xem chi tiết mẫu; nút ♥ để bỏ yêu thích (thẻ biến mất khỏi danh sách).
- **Đồng bộ**: bấm ♥ ở bất kỳ đâu thì mục Dự án yêu thích cập nhật ngay; trạng thái ♥ của một mẫu hiển thị nhất quán ở mọi màn hình.

## V. DANH MỤC MÀN HÌNH (bảng tổng hợp cho dev)

| # | Màn hình | Thành phần chính | Điểm vào |
|---|----------|------------------|----------|
| 1 | Trang chủ | Hero 2 cột (thông điệp + khung minh họa 4 tab tương tác); dải 3 bước; khu video hướng dẫn; footer | Logo / mở web |
| 2 | Trang Cẩm nang | 2 tab: Mẫu tham khảo (thẻ có ♥) / Bài viết tư vấn; bộ lọc; tìm kiếm | Menu "Cẩm nang" |
| 3 | Trang Hướng dẫn | Tìm kiếm; lưới video hướng dẫn; bài hướng dẫn thao tác | Menu "Hướng dẫn"; "Xem tất cả" ở trang chủ; nút "?" trong luồng |
| 4 | Modal Tạo dự án | Tên dự án (bắt buộc) + Mô tả (tùy chọn); nút Tạo dự án / Hủy | Nút "Tạo dự án mới"; menu Thiết kế & Dự toán khi chưa có dự án |
| 5 | Bước 1 — Nhập liệu | Form 2 cột, 9 trường theo bảng mục III.2; (i) tooltip; nút "Nhận dự toán ngay" | Sau khi tạo dự án; mở lại từ Dự án của tôi |
| 6 | Bước 2 — màn hình chờ | Tiến độ AI (vòng %); panel Cẩm nang cá nhân hóa (3 mẫu bố trí nội thất ♥ + bài viết kiến trúc); chatbox | Bấm "Nhận dự toán ngay" |
| 7 | Bước 2 — kết quả | Bảng dự toán (Tổng + 3 tab + Xem chi tiết / tải Excel); biểu đồ tròn (% trên hình, chú thích màu + tiền); văn tư vấn; nút "Nhận hồ sơ thi công" | AI sinh xong |
| 8 | Bước 3 — chưa render | Khối Thông tin dự án; thẻ xem trước 4 thành phần hồ sơ; nút "Render hồ sơ"; các nút tải / chia sẻ disabled | Bấm "Nhận hồ sơ thi công" |
| 9 | Bước 3 — màn hình chờ render | Tiến độ render; panel Cẩm nang nội thất (mẫu nội thất ♥ + bài viết nội thất) | Bấm "Render hồ sơ" |
| 10 | Bước 3 — hoàn tất | Tiêu đề sẵn sàng; Tải PDF / link chia sẻ / email / QR Code; ghi chú bảo mật; khối liên hệ kiến trúc sư | Render xong |
| 11 | Cửa sổ cá nhân | Thông tin tài khoản; Dự án của tôi; Dự án yêu thích (bỏ ♥ được, đồng bộ mọi nơi) | Avatar trên thanh công cụ |

## VI. GHI CHÚ DỮ LIỆU VÀ HÀNH VI

- **Yêu thích (favorite)**: lưu theo tài khoản (user_id, mã mẫu, thời điểm lưu); một cơ chế toggle dùng chung cho mọi vị trí có nút ♥ (màn chờ Bước 2, Bước 3, trang Cẩm nang); là nguồn hiển thị của mục Dự án yêu thích trong Cửa sổ cá nhân.
- **Cẩm nang cá nhân hóa**: dữ liệu tĩnh do admin biên soạn, gắn tag theo: loại công trình, số tầng, tum, kiểu kiến trúc, phong cách nội thất. Màn chờ Bước 2 lọc theo tag khớp các trường Bước 1 rồi lấy ngẫu nhiên 3 mẫu; nếu không đủ 3 mẫu khớp hết tag thì nới lỏng dần tiêu chí (đề xuất thứ tự bỏ: tum → số tầng → kiểu kiến trúc) để luôn đủ 3 mẫu. Bước 3 tương tự nhưng ưu tiên tag phong cách nội thất.
- **Điều kiện kích hoạt nút "Nhận dự toán ngay"**: ảnh + địa chỉ + loại công trình + gói + phong cách nội thất; thêm số tầng, tum, kiểu kiến trúc nếu là Nhà ở / Nhà phố. Mô tả mong muốn không bắt buộc.
- **Nội dung nghiệp vụ theo Phụ lục 02** (bản 14/7/2026): cấu trúc bảng dự toán và file Excel chi tiết, mẫu đoạn văn tư vấn, thành phần và cấu trúc bộ hồ sơ PDF, chia sẻ link / email / QR, chatbox AI hiểu ngữ cảnh, khung hướng dẫn và video — thực hiện đúng theo Phụ lục 02, tài liệu này không lặp lại chi tiết.
