/**
 * Nội dung năm trang pháp lý ở chân trang — chép từ các file docs Bên A gửi:
 * IMG): Điều khoản sử dụng nền tảng, Chính sách bảo vệ dữ liệu cá nhân, Điều khoản sử
 * dụng AI, Quy chế TMĐT & Đối tác và Thanh toán, hủy dịch vụ & hoàn tiền.
 *
 * Giữ định dạng của file gốc: màu chữ từng đoạn, đậm/nghiêng, cỡ chữ, canh đều/giữa,
 * khung ghi chú (viền + nền). `base` là màu/cỡ chữ thân bài của file (nửa điểm, 21 = 10,5pt);
 * `LegalRun` không ghi `c`/`z` nghĩa là dùng theo `base`.
 *
 * Đây là bản tiếng Việt (bản có giá trị pháp lý); bản tiếng Anh nằm ở `legal-docs.en.ts` với cùng
 * cấu trúc từng khối. Các ô `[ĐANG CẬP NHẬT]` là chỗ Bên A chưa điền trong file gốc — điền khi có
 * thông tin chính thức (cả hai file).
 */
import { LEGAL_PARTNERS } from './legal-partners'

export interface LegalRun {
  t: string
  b?: boolean
  i?: boolean
  /** Màu hex 6 ký tự, không có dấu thăng. */
  c?: string
  /** Cỡ chữ theo nửa điểm (Word `w:sz`). */
  z?: number
}

export interface LegalParagraph {
  k: 'title' | 'h2' | 'h3' | 'p' | 'li'
  /** j = canh đều, c = giữa, r = phải. */
  a?: 'j' | 'c' | 'r'
  r: LegalRun[]
}

export interface LegalNote {
  k: 'note'
  fill?: string
  /** Viền từng cạnh: [màu hex, độ dày px]. */
  sides: Partial<Record<'top' | 'right' | 'bottom' | 'left', [string, number]>>
  ps: LegalParagraph[]
}

export type LegalBlock = LegalParagraph | LegalNote

export interface LegalDoc {
  base: { c: string; z: number }
  blocks: readonly LegalBlock[]
}

export type LegalDocKey = 'terms' | 'privacy' | 'aiTerms' | 'ecommerce' | 'payment'

export const LEGAL_DOCS: Record<LegalDocKey, LegalDoc> = {
  terms: {
    base: { c: '334155', z: 21 },
    blocks: [
      { k: 'p', a: 'c', r: [{ t: 'ĐIỀU KHOẢN SỬ DỤNG NỀN TẢNG BUILD X', b: true, c: '15803d', z: 36 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Build X là nền tảng kết nối và cung cấp toàn diện các giải pháp về thiết kế, dự toán, thi công, giám sát, pháp lý, vật liệu - nội ngoại thất, tài chính và quản lý bất động sản.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Thông tin đơn vị vận hành', b: true, c: '15803d', z: 25 }] },
      { k: 'p', a: 'j', r: [{ t: 'Thông tin chi tiết về đơn vị chủ quản và vận hành hệ thống Build X:' }] },
      { k: 'li', a: 'j', r: [{ t: 'Tên pháp nhân vận hành: ', b: true }, { t: '[ĐANG CẬP NHẬT]' }] },
      { k: 'li', a: 'j', r: [{ t: 'Mã số thuế / Mã số doanh nghiệp:  ', b: true }, { t: '[ĐANG CẬP NHẬT]' }] },
      { k: 'li', a: 'j', r: [{ t: 'Trụ sở chính: ', b: true }, { t: '[ĐANG CẬP NHẬT]' }] },
      { k: 'li', a: 'j', r: [{ t: 'Tổng đài hotline:  ', b: true }, { t: '[ĐANG CẬP NHẬT]' }] },
      { k: 'li', a: 'j', r: [{ t: 'Hòm thư điện tử:  ', b: true }, { t: '[ĐANG CẬP NHẬT]' }] },
      { k: 'li', a: 'j', r: [{ t: 'Cổng thông tin điện tử: ', b: true }, { t: '[ĐANG CẬP NHẬT]' }] },
      { k: 'h2', r: [{ t: 'Điều 1. Giải thích thuật ngữ', b: true, c: '15803d', z: 25 }] },
      {
        k: 'li',
        a: 'j',
        r: [
          { t: 'Build X / Nền tảng: ', b: true, c: '15803d' },
          {
            t: 'Thương hiệu, ứng dụng di động (iOS/Android), website và các giải pháp công nghệ do đơn vị vận hành Build X quản lý.'
          }
        ]
      },
      {
        k: 'li',
        a: 'j',
        r: [
          { t: 'Người dùng / Khách hàng: ', b: true, c: '15803d' },
          { t: 'Cá nhân hoặc tổ chức truy cập, đăng ký tài khoản hoặc sử dụng dịch vụ trên Build X.' }
        ]
      },
      {
        k: 'li',
        a: 'j',
        r: [
          { t: 'Đối tác: ', b: true, c: '15803d' },
          {
            t: 'Nhà thầu, kiến trúc sư, kỹ sư, nhà cung cấp vật liệu, chuyên gia pháp lý, tổ chức tài chính và đơn vị BĐS tham gia hệ sinh thái.'
          }
        ]
      },
      {
        k: 'li',
        a: 'j',
        r: [
          { t: 'Dịch vụ trực tiếp: ', b: true, c: '15803d' },
          { t: 'Dịch vụ do Build X trực tiếp cam kết triển khai và chịu trách nhiệm pháp lý.' }
        ]
      },
      {
        k: 'li',
        a: 'j',
        r: [
          { t: 'Dịch vụ kết nối: ', b: true, c: '15803d' },
          { t: 'Dịch vụ Build X làm trung gian công nghệ kết nối Khách hàng với Đối tác độc lập.' }
        ]
      },
      {
        k: 'li',
        a: 'j',
        r: [
          { t: 'Ngày làm việc: ', b: true, c: '15803d' },
          { t: 'Từ Thứ Hai đến Thứ Sáu, trừ Thứ Bảy, Chủ Nhật và các ngày Lễ, Tết theo quy định pháp luật Việt Nam.' }
        ]
      },
      { k: 'h2', r: [{ t: 'Điều 2. Đối tượng sử dụng', b: true, c: '15803d', z: 25 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Build X dành cho mọi cá nhân, tổ chức có nhu cầu tham khảo và sử dụng giải pháp thuộc các lĩnh vực nhà ở, xây dựng, nội thất, pháp lý, tài chính và bất động sản.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Nội dung công khai có thể truy cập tự do. Đối với các giao dịch phát sinh chi phí hoặc hợp đồng ràng buộc, người dùng phải có đầy đủ năng lực hành vi dân sự hoặc thực hiện qua người đại diện hợp pháp.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Điều 3. Phân loại dịch vụ minh bạch', b: true, c: '15803d', z: 25 }] },
      { k: 'p', a: 'j', r: [{ t: 'Build X hiển thị minh bạch nhóm dịch vụ trước thời điểm xác nhận giao dịch:' }] },
      { k: 'li', a: 'j', r: [{ t: 'Dịch vụ do Build X chịu trách nhiệm cung cấp trực tiếp; hoặc' }] },
      { k: 'li', a: 'j', r: [{ t: 'Dịch vụ Build X đóng vai trò trung gian kết nối.' }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Thông tin hiển thị trên giao diện, báo giá hoặc hợp đồng là căn cứ pháp lý xác định vai trò và trách nhiệm tương ứng của Build X.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Điều 4. Dịch vụ do Build X trực tiếp cung cấp', b: true, c: '15803d', z: 25 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          { t: 'Phạm vi: ', b: true, c: '15803d' },
          {
            t: 'Thiết kế bản vẽ, bóc tách dự toán, thi công/cải tạo trọn gói, giám sát độc lập, tư vấn 1:1 với kiến trúc sư và các dịch vụ chỉ định khác.'
          }
        ]
      },
      { k: 'p', a: 'j', r: [{ t: 'Trách nhiệm của Build X:', b: true, c: '15803d' }] },
      { k: 'li', a: 'j', r: [{ t: 'Tổ chức, quản lý và đảm bảo chất lượng dịch vụ theo đúng cam kết hợp đồng.' }] },
      {
        k: 'li',
        a: 'j',
        r: [{ t: 'Được quyền huy động nhân sự nội bộ hoặc nhà thầu phụ đủ năng lực triển khai từng hạng mục.' }]
      },
      {
        k: 'li',
        a: 'j',
        r: [
          { t: 'Việc hợp tác với bên thứ ba không làm giảm bớt trách nhiệm trực tiếp của Build X đối với khách hàng.' }
        ]
      },
      { k: 'h2', r: [{ t: 'Điều 5. Dịch vụ chuyên môn và quy chuẩn pháp lý', b: true, c: '15803d', z: 25 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Các công việc bắt buộc có chứng chỉ hành nghề hoặc giấy phép hoạt động (thẩm tra kết cấu, đo đạc, xin phép xây dựng) phải do cá nhân/tổ chức có đủ tư cách pháp lý thực hiện hoặc phê duyệt.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          { t: 'Lưu ý pháp lý: ', b: true, c: '15803d' },
          {
            t: 'Build X không phải là tổ chức hành nghề luật sư. Các dịch vụ tư vấn pháp lý có điều kiện sẽ do luật sư hoặc tổ chức hành nghề luật sư đáp ứng đủ điều kiện thực hiện theo hợp đồng riêng với khách hàng.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Điều 6. Thi công trọn gói', b: true, c: '15803d', z: 25 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Build X chịu trách nhiệm về tiến độ, chất lượng, an toàn lao động và các nghĩa vụ đã cam kết trong hợp đồng thi công trọn gói.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Chi tiết về chủng loại vật liệu, đơn giá, kế hoạch thanh toán, tạm ứng, phát sinh, nghiệm thu và bảo hành được quy định riêng tại Hợp đồng thi công của từng dự án.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Điều 7. Dịch vụ đóng vai trò kết nối', b: true, c: '15803d', z: 25 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          { t: 'Phạm vi: ', b: true, c: '15803d' },
          {
            t: 'Kết nối khách hàng với nhà thầu địa phương, nhà cung cấp vật liệu, đơn vị nội thất và giải pháp tín dụng.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          { t: 'Vận hành: ', b: true, c: '15803d' },
          {
            t: 'Cung cấp công cụ số hỗ trợ tra cứu hồ sơ năng lực, đối soát báo giá, trao đổi thông tin và theo dõi tiến độ.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          { t: 'Ràng buộc: ', b: true, c: '15803d' },
          {
            t: 'Hợp đồng dịch vụ và nghĩa vụ thanh toán được xác lập trực tiếp giữa Khách hàng và Đối tác. Build X giữ vai trò hỗ trợ kết nối, điều phối và hòa giải trung gian.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Điều 8. Xác minh và quản trị đối tác', b: true, c: '15803d', z: 25 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Build X xác thực thông tin pháp lý, giấy phép, chứng chỉ hành nghề và hồ sơ năng lực của đối tác trước khi cho phép hoạt động trên nền tảng.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Xác thực danh tính là tiêu chí tham khảo năng lực, không cấu thành cam kết bảo lãnh vô điều kiện của Build X đối với mọi hành vi hay sự cố từ phía đối tác.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Điều 9. Quản lý tài khoản người dùng', b: true, c: '15803d', z: 25 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Người dùng có trách nhiệm cung cấp thông tin chính xác và tự bảo mật tài khoản, mật khẩu cũng như mã OTP.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Build X áp dụng các phương thức xác thực và bảo vệ tài khoản tương ứng với mức độ rủi ro (OTP, quản lý phiên đăng nhập).'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Khi nghi ngờ tài khoản bị xâm nhập, người dùng cần liên hệ ngay bộ phận CSKH để hỗ trợ tạm khóa tài khoản.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Điều 10. Xác lập giao dịch điện tử', b: true, c: '15803d', z: 25 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Nền tảng hiển thị đầy đủ thông tin dịch vụ, chi phí, phương thức thanh toán và chính sách hủy/hoàn tiền trước khi khách hàng xác nhận giao dịch.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Giao dịch chỉ xác lập khi Khách hàng chủ động xác nhận (chạm nút xác nhận hoặc thanh toán). Khách hàng có thể tra cứu, tải về chứng từ/hợp đồng điện tử sau khi hoàn tất.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Build X lưu trữ nhật ký giao dịch phục vụ đối soát, giải quyết khiếu nại và chứng minh giao dịch theo quy định.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Điều 11. Ứng dụng trí tuệ nhân tạo (AI Build X)', b: true, c: '15803d', z: 25 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          { t: 'Công dụng AI: ', b: true, c: '15803d' },
          {
            t: 'Hỗ trợ gợi ý ý tưởng thiết kế, phân tích không gian, dựng hình ảnh 3D mô phỏng, bóc tách khối lượng và dự toán sơ bộ.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Build X hiển thị nhãn nhận biết đối với các tính năng hoặc nội dung tạo bởi AI. Việc quản lý rủi ro và xử lý dữ liệu AI tuân thủ pháp luật và Chính sách Quyền riêng tư.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Điều 12. Quyền sử dụng kết quả tạo bởi AI', b: true, c: '15803d', z: 25 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Người dùng được quyền sử dụng kết quả do AI tạo ra cho mục đích hợp pháp, đồng thời phải tôn trọng quyền sở hữu trí tuệ và quyền riêng tư của các bên liên quan.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Quyền sử dụng kết quả AI không bao gồm việc chuyển giao quyền sở hữu trí tuệ đối với mã nguồn, thuật toán hay công nghệ của Build X.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          { t: 'Do đặc thù Generative AI, kết quả đầu ra không đảm bảo tính độc bản hay bản quyền tác giả riêng biệt.' }
        ]
      },
      { k: 'h2', r: [{ t: 'Điều 13. Khuyến cáo chuyên môn đối với kết quả AI', b: true, c: '15803d', z: 25 }] },
      {
        k: 'note',
        fill: 'fef2f2',
        sides: { left: ['b91c1c', 4.7] },
        ps: [
          {
            k: 'p',
            a: 'j',
            r: [
              { t: 'Cảnh báo: ', b: true, c: 'b91c1c' },
              {
                t: 'Kết quả từ AI chỉ mang tính tham khảo ban đầu, không thay thế cho bản vẽ thi công, hồ sơ xin phép hay thẩm định chuyên môn của kiến trúc sư/kỹ sư có chứng chỉ hành nghề.',
                c: '7f1d1d'
              }
            ]
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Người dùng cần kiểm tra kết quả AI với chuyên gia trước khi áp dụng thực tế. Build X miễn trừ trách nhiệm đối với thiệt hại phát sinh từ việc bỏ qua khuyến cáo này, trừ trường hợp luật định.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Điều 14. Quyền sở hữu đối với nội dung tải lên', b: true, c: '15803d', z: 25 }] },
      {
        k: 'p',
        a: 'j',
        r: [{ t: 'Người dùng giữ toàn quyền sở hữu đối với hình ảnh, bản vẽ và tài liệu tự tải lên hệ thống.' }]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Khi tải nội dung lên, người dùng cấp quyền phi độc quyền cho Build X lưu trữ, xử lý kỹ thuật và hiển thị để phục vụ các chức năng được yêu cầu. Người dùng cam kết có đủ quyền hợp pháp đối với nội dung tải lên.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Điều 15. Dữ liệu cá nhân & Định danh người dùng', b: true, c: '15803d', z: 25 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Việc thu thập và xử lý dữ liệu cá nhân thực hiện nghiêm ngặt theo Chính sách Quyền riêng tư của Build X và quy định pháp luật.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Build X không yêu cầu tải lên căn cước/giấy tờ định danh trong quy trình chuẩn. Người dùng nên che bớt thông tin định danh không cần thiết trên hồ sơ tài liệu nhà đất trước khi chia sẻ.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Điều 16. Giá và thanh toán', b: true, c: '15803d', z: 25 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          { t: 'Dịch vụ trực tiếp: ', b: true, c: '15803d' },
          { t: 'Thanh toán trực tiếp cho Build X qua cổng thanh toán tích hợp.' }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          { t: 'Dịch vụ kết nối: ', b: true, c: '15803d' },
          { t: 'Thanh toán trực tiếp cho Đối tác theo mốc tiến độ hợp đồng.' }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [{ t: 'Đối với phiên bản ứng dụng phân phối qua Apple App Store:', b: true, c: '15803d' }]
      },
      {
        k: 'li',
        a: 'j',
        r: [
          { t: 'Thanh toán In-App (Apple): ', b: true, c: '15803d' },
          {
            t: 'Áp dụng cho mua lượt AI hoặc tính năng số trong ứng dụng iOS theo quy định của Apple. Lượt credit mua không có thời hạn hết hạn.'
          }
        ]
      },
      {
        k: 'li',
        a: 'j',
        r: [
          { t: 'Dịch vụ thực tế: ', b: true, c: '15803d' },
          {
            t: 'Đối với khảo sát, thi công, giám sát, vật liệu..., thanh toán qua kênh ngoài In-App theo hướng dẫn chính thức.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Điều 17. Kết nối giải pháp tài chính & Tín dụng', b: true, c: '15803d', z: 25 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Build X kết nối thông tin giữa khách hàng có nhu cầu vay vốn xây nhà với các ngân hàng, tổ chức tài chính uy tín.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Build X không phải tổ chức tín dụng, không duyệt hồ sơ hay quy định lãi suất. Quan hệ tín dụng do khách hàng và ngân hàng trực tiếp thỏa thuận.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Build X không cam kết phê duyệt hay hạn mức vay. Nghĩa vụ trả nợ và rủi ro tín dụng tuân thủ theo hợp đồng tín dụng giữa hai bên.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Điều 18. Dịch vụ bất động sản (Build X Property)', b: true, c: '15803d', z: 25 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Các tính năng quản lý, môi giới hoặc giao dịch BĐS áp dụng theo Điều khoản Build X Property riêng và triển khai khi đáp ứng đủ điều kiện pháp lý.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Điều 19. Sở hữu trí tuệ nền tảng', b: true, c: '15803d', z: 25 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Thương hiệu, phần mềm, giao diện, quy trình và tài sản trí tuệ thuộc sở hữu của Build X. Nghiêm cấm sao chép, cào dữ liệu hoặc đảo ngược mã nguồn trái phép.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Điều 20. Các hành vi nghiêm cấm', b: true, c: '15803d', z: 25 }] },
      { k: 'p', a: 'j', r: [{ t: 'Các hành vi bị cấm bao gồm:', b: true, c: '15803d' }] },
      { k: 'li', a: 'j', r: [{ t: 'Giả mạo danh tính, gian lận tài chính.' }] },
      { k: 'li', a: 'j', r: [{ t: 'Phát tán mã độc, gây ảnh hưởng an toàn hệ thống Build X.' }] },
      { k: 'li', a: 'j', r: [{ t: 'Khai thác trái phép dữ liệu cá nhân hoặc báo giá bảo mật.' }] },
      { k: 'li', a: 'j', r: [{ t: 'Đăng tải nội dung vi phạm pháp luật, thuần phong mỹ tục hoặc bản quyền.' }] },
      { k: 'h3', r: [{ t: 'Cơ chế Thông báo và Gỡ bỏ (Notice & Takedown)', b: true, c: '166534', z: 22 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Chủ thể quyền có thể gửi yêu cầu gỡ bỏ nội dung vi phạm bản quyền qua kênh CSKH của Build X kèm chứng cứ chứng minh hợp lệ.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Khi có thông báo hợp lệ, Build X sẽ tạm ẩn/gỡ nội dung để rà soát. Người đăng tải có quyền giải trình phản hồi; nội dung sẽ được phục hồi nếu khiếu nại không đủ căn cứ.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Điều 21. Xóa tài khoản và chấm dứt dịch vụ', b: true, c: '15803d', z: 25 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Người dùng có thể yêu cầu xóa tài khoản trực tiếp trong ứng dụng. Hệ thống sẽ cảnh báo chi tiết các hệ quả trước khi người dùng xác nhận.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Sau xác nhận, dữ liệu cá nhân sẽ được xóa hoặc ẩn danh, ngoại trừ các chứng từ/dữ liệu giao dịch bắt buộc lưu trữ theo quy định pháp luật.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Build X có quyền khóa tài khoản nếu phát hiện vi phạm nghiêm trọng và sẽ thông báo lý do cùng cơ chế khiếu nại phù hợp cho người dùng.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Điều 22. Tiếp nhận khiếu nại và Hỗ trợ hòa giải', b: true, c: '15803d', z: 25 }] },
      { k: 'p', a: 'j', r: [{ t: 'Khách hàng liên hệ phản hồi/khiếu nại qua:' }] },
      {
        k: 'li',
        a: 'j',
        r: [{ t: 'Chat trực tiếp: ', b: true, c: '15803d' }, { t: 'Tính năng CSKH trên ứng dụng Build X.' }]
      },
      { k: 'li', a: 'j', r: [{ t: 'Hotline: ', b: true, c: '15803d' }, { t: '[HOTLINE]' }] },
      { k: 'li', a: 'j', r: [{ t: 'Zalo CSKH: ', b: true, c: '15803d' }, { t: '[KÊNH ZALO CSKH]' }] },
      { k: 'li', a: 'j', r: [{ t: 'Email: ', b: true, c: '15803d' }, { t: '[EMAIL]' }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Build X trực tiếp giải quyết khiếu nại Dịch vụ trực tiếp và hỗ trợ đối soát/hòa giải với Dịch vụ kết nối. Thời gian phản hồi thương lượng tối đa trong 07 ngày làm việc theo Luật Bảo vệ quyền lợi người tiêu dùng.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Điều 23. Trách nhiệm của Build X', b: true, c: '15803d', z: 25 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Build X chịu trách nhiệm pháp lý cho Dịch vụ trực tiếp. Với Dịch vụ kết nối, Build X chịu trách nhiệm trong phạm vi quản trị nền tảng; nghĩa vụ thực hiện hợp đồng thuộc về Đối tác độc lập.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [{ t: 'Các điều khoản này không làm loại trừ quyền lợi hợp pháp của Người tiêu dùng theo luật định.' }]
      },
      { k: 'h2', r: [{ t: 'Điều 24. Sự kiện bất khả kháng', b: true, c: '15803d', z: 25 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Các sự cố mạng, máy chủ hoặc gián đoạn viễn thông diện rộng chỉ được xem là sự kiện bất khả kháng khi đáp ứng đủ điều kiện pháp lý và không đến từ lỗi bảo mật của Build X. Các bên có trách nhiệm thông báo và phối hợp giảm thiểu thiệt hại.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Điều 25. Thứ tự áp dụng văn bản', b: true, c: '15803d', z: 25 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Khi có sự khác biệt giữa các văn bản, thứ tự ưu tiên áp dụng như sau (không loại trừ quy định bắt buộc của pháp luật):'
          }
        ]
      },
      { k: 'li', a: 'j', r: [{ t: 'Hợp đồng / Đơn đặt hàng dịch vụ cụ thể đã được xác lập.' }] },
      { k: 'li', a: 'j', r: [{ t: 'Điều khoản phân hệ riêng (AI, Property).' }] },
      { k: 'li', a: 'j', r: [{ t: 'Chính sách Thanh toán – Hủy – Hoàn trả.' }] },
      { k: 'li', a: 'j', r: [{ t: 'Quy chế hoạt động nền tảng TMĐT & Quy tắc Đối tác.' }] },
      { k: 'li', a: 'j', r: [{ t: 'Điều khoản sử dụng chung này.' }] },
      { k: 'li', a: 'j', r: [{ t: 'Chính sách Quyền riêng tư (ưu tiên về xử lý dữ liệu).' }] },
      { k: 'h2', r: [{ t: 'Điều 26. Cập nhật và sửa đổi điều khoản', b: true, c: '15803d', z: 25 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Build X sẽ thông báo trước các thay đổi quan trọng đối với Điều khoản sử dụng trong thời gian hợp lý. Việc cập nhật không làm ảnh hưởng đến các quyền và hợp đồng đã xác lập trước đó.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Điều 27. Luật điều chỉnh và Giải quyết tranh chấp', b: true, c: '15803d', z: 25 }] },
      { k: 'p', a: 'j', r: [{ t: 'Chính sách được điều chỉnh và giải thích theo pháp luật Việt Nam.' }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Mọi tranh chấp ưu tiên giải quyết qua thương lượng, hòa giải. Trường hợp không thể thỏa thuận, vụ việc sẽ do Tòa án có thẩm quyền giải quyết theo quy định.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Điều 28. Quy chế hoạt động nền tảng thương mại điện tử', b: true, c: '15803d', z: 25 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Build X tuân thủ đầy đủ các quy định về kinh doanh thương mại điện tử trực tiếp và trung gian theo Luật Thương mại điện tử số 122/2025/QH15, Nghị định 248/2026/NĐ-CP và công bố Quy chế hoạt động nền tảng riêng theo luật định.'
          }
        ]
      }
    ]
  },
  privacy: {
    base: { c: '334155', z: 20 },
    blocks: [
      { k: 'title', a: 'c', r: [{ t: 'CHÍNH SÁCH BẢO VỆ DỮ LIỆU CÁ NHÂN - BUILD X', b: true, c: '15803d', z: 40 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Chính sách này quy định chi tiết cách thức Build X thu thập, xử lý, lưu trữ và bảo vệ dữ liệu cá nhân của người dùng, tuân thủ Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15, Nghị định 356/2025/NĐ-CP và các tiêu chuẩn bảo mật hiện hành.'
          }
        ]
      },
      { k: 'p', a: 'j', r: [{ t: 'Điều 1. Đơn vị kiểm soát và xử lý dữ liệu', b: true, c: '15803d', z: 23 }] },
      { k: 'p', r: [{ t: 'Đơn vị vận hành: ', b: true, c: '0f172a' }, { t: '[TÊN PHÁP NHÂN_GHI CHÚ]' }] },
      { k: 'p', r: [{ t: 'Địa chỉ trụ sở: ', b: true, c: '0f172a' }, { t: '[ĐỊA CHỈ TRỤ SỞ]' }] },
      { k: 'p', r: [{ t: 'Email phụ trách Dữ liệu: ', b: true, c: '0f172a' }, { t: '[EMAIL]' }] },
      { k: 'p', r: [{ t: 'Hotline hỗ trợ: ', b: true, c: '0f172a' }, { t: '[HOTLINE]' }] },
      { k: 'h2', r: [{ t: 'Điều 2. Phạm vi điều chỉnh', b: true, c: '15803d', z: 23 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Áp dụng cho toàn bộ Người dùng, Khách hàng và Đối tác khi truy cập, đăng ký tài khoản, giao dịch hoặc sử dụng bất kỳ dịch vụ, tiện ích nào trên hệ sinh thái Build X.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Điều 3. Các loại dữ liệu Build X thu thập và xử lý', b: true, c: '15803d', z: 23 }] },
      {
        k: 'li',
        r: [
          { t: 'Định danh & Liên hệ: ', b: true, c: '0f172a' },
          {
            t: 'Họ và tên, số điện thoại, địa chỉ email, địa chỉ liên hệ. Đối với Đối tác/người bán, dữ liệu có thể bao gồm số định danh cá nhân hoặc tổ chức, thông tin người đại diện, giấy phép, chứng chỉ và thông tin xác thực khác khi pháp luật hoặc quy trình đăng ký yêu cầu.'
          }
        ]
      },
      {
        k: 'li',
        r: [
          { t: 'Hồ sơ dự án: ', b: true, c: '0f172a' },
          {
            t: 'Địa chỉ thực tế công trình, diện tích đất, quy mô xây dựng, công năng, ngân sách, phong cách kiến trúc.'
          }
        ]
      },
      {
        k: 'li',
        r: [
          { t: 'Tài liệu tải lên: ', b: true, c: '0f172a' },
          {
            t: 'Ảnh hiện trạng mặt bằng, bản vẽ kỹ thuật, sơ đồ thiết kế, hồ sơ thửa đất người dùng tự nguyện cung cấp.'
          }
        ]
      },
      {
        k: 'li',
        r: [
          { t: 'Tương tác AI: ', b: true, c: '0f172a' },
          { t: 'Câu lệnh (prompt), mô tả yêu cầu, thông số diện tích và kết quả gợi ý không gian.' }
        ]
      },
      {
        k: 'li',
        r: [
          { t: 'Kỹ thuật & Thiết bị: ', b: true, c: '0f172a' },
          {
            t: 'Địa chỉ IP, mã thiết bị, hệ điều hành, phiên bản ứng dụng, nhật ký truy cập, nhật ký sự cố, cookies và dữ liệu kỹ thuật tương tự.'
          }
        ]
      },
      {
        k: 'li',
        r: [
          { t: 'Giao dịch: ', b: true, c: '0f172a' },
          { t: 'Thông tin gói dịch vụ, giá trị đơn hàng, mã giao dịch, lịch sử thanh toán / hoàn tiền.' }
        ]
      },
      {
        k: 'li',
        r: [
          { t: 'Vị trí địa lý: ', b: true, c: '0f172a' },
          {
            t: 'Địa chỉ do người dùng cung cấp hoặc vị trí thiết bị (chỉ khi người dùng chủ động bật và cho phép). Dữ liệu vị trí được bảo vệ nghiêm ngặt theo quy định dữ liệu nhạy cảm.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Điều 4. Thu thập giấy tờ định danh cá nhân', b: true, c: '15803d', z: 23 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Build X không thu thập bản chụp CCCD/Hộ chiếu đối với tài khoản thông thường. Trường hợp cần xác minh danh tính cho các thủ tục pháp lý (công chứng, xin cấp phép, tài chính), thủ tục sẽ được thực hiện trực tiếp bởi cơ quan/đối tác có thẩm quyền. Đối với Đối tác/người bán, thông tin định danh sẽ được thu thập đúng phạm vi pháp luật yêu cầu.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Điều 5. Nguồn thu thập dữ liệu', b: true, c: '15803d', z: 23 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Dữ liệu cá nhân có thể được thu thập hoặc tiếp nhận từ các nguồn phù hợp với pháp luật và mục đích xử lý đã công bố, bao gồm:'
          }
        ]
      },
      { k: 'li', r: [{ t: 'Sự cung cấp chủ động của người dùng trên ứng dụng.' }] },
      { k: 'li', r: [{ t: 'Hoạt động thực tế phát sinh trong quá trình sử dụng dịch vụ.' }] },
      {
        k: 'li',
        r: [{ t: 'Đối tác khi người dùng chủ động yêu cầu kết nối hoặc khi việc chia sẻ có căn cứ pháp lý phù hợp.' }]
      },
      {
        k: 'li',
        r: [
          {
            t: 'Nhà cung cấp công nghệ, AI, dịch vụ điện toán đám mây, đơn vị thanh toán hoặc nhà cung cấp dịch vụ hỗ trợ trong phạm vi cần thiết cho việc cung cấp dịch vụ.'
          }
        ]
      },
      {
        k: 'li',
        r: [
          {
            t: 'Nguồn hợp pháp khác trong trường hợp pháp luật cho phép và Build X thực hiện thông báo hoặc cơ chế cần thiết theo quy định.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Điều 6. Mục đích xử lý dữ liệu', b: true, c: '15803d', z: 23 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          { t: 'Dữ liệu được xử lý trong phạm vi cần thiết cho các mục đích hợp pháp đã được công bố, có thể bao gồm:' }
        ]
      },
      { k: 'li', r: [{ t: 'Khởi tạo bản vẽ, bóc tách dự toán khối lượng và triển khai hợp đồng xây dựng.' }] },
      { k: 'li', r: [{ t: 'Xử lý dữ liệu đầu vào cho các thuật toán AI mô phỏng không gian.' }] },
      {
        k: 'li',
        r: [{ t: 'Chuyển tiếp nhu cầu khảo sát/báo giá đến các đối tác theo đúng chỉ định chủ động của người dùng.' }]
      },
      { k: 'li', r: [{ t: 'Xác nhận và đối soát thanh toán giao dịch.' }] },
      { k: 'li', r: [{ t: 'Tiếp nhận và hỗ trợ chăm sóc khách hàng, xử lý khiếu nại.' }] },
      { k: 'li', r: [{ t: 'Bảo mật hệ thống, phát hiện và ngăn chặn gian lận.' }] },
      { k: 'li', r: [{ t: 'Quản lý tài khoản, xác thực người dùng/đối tác và hỗ trợ vận hành dịch vụ.' }] },
      { k: 'li', r: [{ t: 'Xác minh, quản trị người bán/đối tác và thực hiện nghĩa vụ tuân thủ pháp luật áp dụng.' }] },
      {
        k: 'li',
        r: [
          {
            t: 'Phân tích hiệu năng, độ ổn định và mức sử dụng tính năng để cải thiện sản phẩm trong phạm vi dữ liệu thực tế được thu thập và căn cứ xử lý phù hợp.'
          }
        ]
      },
      {
        k: 'li',
        r: [
          {
            t: 'Gửi thông tin tiếp thị chỉ khi có căn cứ xử lý phù hợp và/hoặc sự lựa chọn riêng của người dùng theo quy định áp dụng.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Điều 7. Cơ chế lấy sự đồng ý của người dùng', b: true, c: '15803d', z: 23 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Build X thu thập sự đồng ý thông qua thao tác xác nhận chủ động từ người dùng. Hệ thống không mặc định tích chọn sẵn và không coi sự im lặng là đồng ý.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Các quyền hạn (nhận tiếp thị, vị trí, thư viện ảnh, chia sẻ bên thứ ba) được tách biệt rõ ràng để người dùng tùy chọn hoặc từ chối độc lập. Lịch sử đồng ý của người dùng được lưu trữ đầy đủ để làm căn cứ pháp lý.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Điều 8. Xử lý dữ liệu AI và Bên thứ ba', b: true, c: '15803d', z: 23 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Khi sử dụng các tính năng AI, dữ liệu đầu vào (câu lệnh, bản vẽ, hình ảnh) chỉ được gửi tới bên thứ ba khi có sự đồng ý trước của người dùng. Tên bên cung cấp dịch vụ và mục đích xử lý sẽ được hiển thị minh bạch tại màn hình xin cấp quyền.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Nếu người dùng từ chối, dữ liệu sẽ không được gửi đi và tính năng AI tương ứng có thể bị giới hạn. Build X yêu cầu các đối tác AI tuân thủ đầy đủ các tiêu chuẩn bảo vệ dữ liệu theo chính sách này.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Điều 9. Chính sách về huấn luyện dữ liệu AI', b: true, c: '15803d', z: 23 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Build X không sử dụng dữ liệu riêng tư, bản vẽ hoặc dự án của người dùng để huấn luyện mô hình AI ngoài mục đích cung cấp dịch vụ trực tiếp. Mọi thay đổi về mục đích sử dụng dữ liệu AI đều phải thông báo và được người dùng đồng ý.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Điều 10. Chuyển dữ liệu xuyên biên giới', b: true, c: '15803d', z: 23 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Trường hợp dữ liệu được chuyển ra ngoài Việt Nam (lưu trữ đám mây, hạ tầng máy chủ), Build X cam kết tuân thủ đầy đủ các thủ tục đánh giá tác động và biện pháp an toàn theo Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15 và Nghị định 356/2025/NĐ-CP.'
          }
        ]
      },
      {
        k: 'h2',
        r: [{ t: 'Điều 11. Chia sẻ dữ liệu và phân quyền theo từng giai đoạn', b: true, c: '15803d', z: 23 }]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Build X tuyệt đối không mua bán dữ liệu cá nhân. Việc chia sẻ dữ liệu chỉ thực hiện với các đối tác liên quan (đơn vị AI, thanh toán, nhà thầu) theo đúng nguyên tắc phân quyền tối thiểu theo từng giai đoạn:'
          }
        ]
      },
      {
        k: 'li',
        r: [
          { t: 'Giai đoạn tham khảo/tìm kiếm: ', b: true, c: '0f172a' },
          {
            t: 'Đối tác chỉ được tiếp cận thông tin tổng quan cần thiết của dự án, như khu vực dự án, loại công trình hoặc nhu cầu cơ bản.'
          }
        ]
      },
      {
        k: 'li',
        r: [
          { t: 'Giai đoạn yêu cầu báo giá chi tiết: ', b: true, c: '0f172a' },
          { t: 'Cung cấp thêm diện tích và thông số kỹ thuật sơ bộ.' }
        ]
      },
      {
        k: 'li',
        r: [
          { t: 'Giai đoạn giao kết hợp đồng: ', b: true, c: '0f172a' },
          {
            t: 'Cung cấp số điện thoại liên hệ và địa chỉ chính xác khi khách hàng chủ động xác nhận đồng ý làm việc trực tiếp với đối tác đó.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Điều 12. Quyền truy cập thiết bị di động', b: true, c: '15803d', z: 23 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Ứng dụng Build X trên iOS/Android chỉ yêu cầu các quyền truy cập tối thiểu phục vụ trực tiếp cho tính năng mà người dùng kích hoạt:'
          }
        ]
      },
      {
        k: 'li',
        r: [
          { t: 'Quyền Camera: ', b: true, c: '0f172a' },
          { t: 'Chỉ được yêu cầu khi người dùng bấm chụp ảnh hiện trạng trực tiếp từ ứng dụng.' }
        ]
      },
      {
        k: 'li',
        r: [
          { t: 'Quyền Thư viện ảnh (Photo Library): ', b: true, c: '0f172a' },
          { t: 'Chỉ được kích hoạt khi người dùng tự tay chọn ảnh hoặc tài liệu bản vẽ để tải lên công trình.' }
        ]
      },
      {
        k: 'li',
        r: [
          { t: 'Quyền Vị trí: ', b: true, c: '0f172a' },
          {
            t: 'Chỉ được yêu cầu khi người dùng chủ động sử dụng tính năng cần xác định vị trí dự án hoặc dịch vụ gần vị trí hiện tại. Build X không truy cập vị trí thiết bị khi chức năng không cần và không theo dõi vị trí liên tục theo mặc định.'
          }
        ]
      },
      {
        k: 'li',
        r: [
          { t: 'Quyền thông báo: ', b: true, c: '0f172a' },
          {
            t: 'Build X có thể gửi thông báo liên quan đến tiến độ dự án, trạng thái đơn hàng, lịch tư vấn hoặc cảnh báo bảo mật. Người dùng có thể quản lý quyền thông báo trong cài đặt hệ điều hành và lựa chọn nhận nội dung tiếp thị theo cơ chế riêng khi áp dụng.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Điều 13. Thời hạn lưu trữ dữ liệu', b: true, c: '15803d', z: 23 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Dữ liệu chỉ được lưu trữ trong thời gian cần thiết để thực hiện dịch vụ, đáp ứng nghĩa vụ pháp lý, kế toán hoặc giải quyết tranh chấp. Khi hết thời hạn hoặc hết mục đích sử dụng, dữ liệu sẽ được xóa bỏ hoặc ẩn danh hoàn toàn.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Điều 14. Biện pháp an toàn và bảo mật thông tin', b: true, c: '15803d', z: 23 }] },
      { k: 'p', a: 'j', r: [{ t: 'Build X áp dụng các biện pháp an ninh mạng tối ưu để bảo vệ dữ liệu:' }] },
      {
        k: 'li',
        r: [
          {
            t: 'Mã hóa dữ liệu khi truyền và/hoặc lưu trữ trong trường hợp phù hợp, cùng các cơ chế bảo vệ phiên truy cập và thông tin xác thực.'
          }
        ]
      },
      {
        k: 'li',
        r: [
          {
            t: 'Kiểm soát truy cập, phân quyền, xác thực phù hợp, ghi nhật ký hệ thống, tường lửa và giám sát an toàn thông tin theo nhu cầu vận hành, trên nguyên tắc giới hạn quyền truy cập cần thiết.'
          }
        ]
      },
      {
        k: 'li',
        r: [
          {
            t: 'Sao lưu, rà soát lỗ hổng, đánh giá nhà cung cấp và kiểm tra an toàn thông tin định kỳ hoặc khi có thay đổi đáng kể đối với hệ thống.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Điều 15. Quy trình ứng phó sự cố dữ liệu', b: true, c: '15803d', z: 23 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Khi phát hiện sự cố an toàn dữ liệu, Build X sẽ lập tức cô lập, khắc phục và thực hiện thông báo cho người dùng cũng như cơ quan chức năng theo đúng thời hạn pháp luật quy định.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Điều 16. Quyền của chủ thể dữ liệu', b: true, c: '15803d', z: 23 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          { t: 'Theo Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15 và pháp luật áp dụng, người dùng có các quyền sau:' }
        ]
      },
      { k: 'li', r: [{ t: 'Quyền được biết về hoạt động thu thập và xử lý dữ liệu của mình.' }] },
      { k: 'li', r: [{ t: 'Quyền đồng ý hoặc từ chối, rút lại sự đồng ý đã cấp trước đó.' }] },
      { k: 'li', r: [{ t: 'Quyền truy cập, xem và yêu cầu cung cấp bản sao dữ liệu cá nhân.' }] },
      { k: 'li', r: [{ t: 'Quyền yêu cầu chỉnh sửa, cập nhật thông tin không chính xác.' }] },
      {
        k: 'li',
        r: [
          {
            t: 'Quyền yêu cầu xóa dữ liệu cá nhân, hạn chế hoặc phản đối việc xử lý trong trường hợp pháp luật cho phép; quyền khiếu nại, tố cáo, khởi kiện, yêu cầu bồi thường và các quyền khác theo quy định pháp luật.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Điều 17. Thực hiện quyền Rút lại sự đồng ý', b: true, c: '15803d', z: 23 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Người dùng có thể rút lại sự đồng ý xử lý dữ liệu bất kỳ lúc nào qua cài đặt ứng dụng hoặc liên hệ CSKH. Việc này không ảnh hưởng đến tính hợp pháp của các dữ liệu đã xử lý trước đó.'
          }
        ]
      },
      {
        k: 'h2',
        r: [{ t: 'Điều 18. Cơ chế Xóa dữ liệu và Hủy tài khoản trong ứng dụng', b: true, c: '15803d', z: 23 }]
      },
      {
        k: 'p',
        a: 'j',
        r: [{ t: 'Người dùng có thể yêu cầu xóa tài khoản trực tiếp trong ứng dụng. Sau khi xác nhận:' }]
      },
      {
        k: 'li',
        r: [
          {
            t: 'Sau khi quy trình xóa hoàn tất, tài khoản không còn khả năng truy cập và được xử lý theo cơ chế xóa tài khoản của Build X.'
          }
        ]
      },
      {
        k: 'li',
        r: [
          {
            t: 'Dữ liệu hồ sơ cá nhân, bản vẽ và lịch sử tương tác AI được xóa, ẩn danh hoặc tách khỏi tài khoản trong phạm vi Build X không có nghĩa vụ hoặc căn cứ hợp pháp để tiếp tục lưu giữ.'
          }
        ]
      },
      {
        k: 'li',
        r: [
          {
            t: 'Chứng từ thanh toán, kế toán và các dữ liệu cần lưu theo pháp luật, giao dịch chưa hoàn tất hoặc tranh chấp được lưu riêng trong phạm vi, mục đích và thời hạn cần thiết; khi hết căn cứ lưu giữ, dữ liệu được xử lý theo quy trình lưu trữ và xóa dữ liệu áp dụng.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Điều 19. Bảo vệ người chưa thành niên', b: true, c: '15803d', z: 23 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Các hoạt động đăng ký tài khoản hoặc giao dịch liên quan đến người chưa thành niên bắt buộc phải có sự đồng ý hoặc xác nhận của người đại diện theo pháp luật theo quy định.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Điều 20. Cập nhật chính sách quyền riêng tư', b: true, c: '15803d', z: 23 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Chính sách này được cập nhật định kỳ và công khai trên ứng dụng. Mọi thay đổi về mục đích xử lý dữ liệu mới sẽ được thông báo để xin ý kiến người dùng trước khi áp dụng.'
          }
        ]
      },
      {
        k: 'h2',
        r: [{ t: 'Điều 21. Thông tin liên hệ phụ trách bảo vệ dữ liệu cá nhân', b: true, c: '15803d', z: 23 }]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Nếu có bất kỳ câu hỏi, yêu cầu thực thi quyền dữ liệu hoặc phản ánh về quyền riêng tư, người dùng vui lòng liên hệ:'
          }
        ]
      },
      {
        k: 'p',
        r: [
          { t: 'Bộ phận phụ trách quyền riêng tư và an toàn thông tin: ', b: true, c: '0f172a' },
          { t: '[BỘ PHẬN PHỤ TRÁCH QUYỀN RIÊNG TƯ]' }
        ]
      },
      { k: 'p', r: [{ t: 'Email chuyên trách: ', b: true, c: '0f172a' }, { t: '[EMAIL]' }] },
      { k: 'p', r: [{ t: 'Địa chỉ trụ sở: ', b: true, c: '0f172a' }, { t: '[ĐỊA CHỈ TRỤ SỞ]' }] },
      { k: 'p', r: [{ t: 'Hotline hỗ trợ: ', b: true, c: '0f172a' }, { t: '[HOTLINE]' }] }
    ]
  },
  ecommerce: LEGAL_PARTNERS,
  aiTerms: {
    base: { c: '2d3748', z: 21 },
    blocks: [
      { k: 'title', a: 'c', r: [{ t: 'ĐIỀU KHOẢN SỬ DỤNG AI BUILD X', b: true, c: '15803d', z: 32 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Điều khoản này quy định việc sử dụng các tính năng AI trên Build X, được áp dụng đồng thời với Điều khoản sử dụng, Chính sách quyền riêng tư, Chính sách thanh toán – hủy – hoàn tiền và các quy định liên quan.',
            i: true
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Điều 1. Phạm vi tính năng AI', b: true, c: '2d6a4f', z: 24 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'AI Build X hỗ trợ gợi ý thiết kế, phân tích bố cục, mô phỏng hình ảnh, bóc tách sơ bộ, dự toán tham khảo và tìm kiếm thông tin theo các chức năng được công bố trên nền tảng.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Mức độ tự động hóa, mô hình kỹ thuật và nhà cung cấp dịch vụ có thể được điều chỉnh tùy thuộc vào từng tính năng cụ thể.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Điều 2. Minh bạch khi tương tác với AI', b: true, c: '2d6a4f', z: 24 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Build X hiển thị thông báo rõ ràng khi người dùng tương tác với AI hoặc khi nội dung được tạo/chỉnh sửa đáng kể bởi AI theo quy định pháp luật. Trường hợp pháp luật yêu cầu nhận biết nội dung do AI tạo ra, Build X sẽ áp dụng các cơ chế nhãn đánh dấu phù hợp để xác định nguồn gốc nội dung.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Điều 3. Phân loại và quản trị rủi ro AI', b: true, c: '2d6a4f', z: 24 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Trước khi triển khai tính năng AI, Build X thực hiện đánh giá, phân loại và quản trị rủi ro theo đúng quy định pháp luật hiện hành.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Các biện pháp quản trị bao gồm kiểm thử kỹ thuật, giới hạn phạm vi hoạt động, phát cảnh báo, giám sát hệ thống, ghi nhận sự cố và kiểm tra chuyên môn bởi con người.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Việc cung cấp tính năng AI không cấu thành cam kết đáp ứng mọi mục đích sử dụng hoặc thay thế các quyết định chuyên môn độc lập.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Điều 4. Dữ liệu đầu vào và quyền của người dùng', b: true, c: '2d6a4f', z: 24 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Người dùng chỉ tải lên hoặc cung cấp dữ liệu mà mình có quyền sở hữu hợp pháp hoặc có đầy đủ quyền cấp phép xử lý cho Build X.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Nghiêm cấm cung cấp bí mật kinh doanh, dữ liệu cá nhân của bên thứ ba, tài liệu bảo mật hoặc nội dung xâm phạm quyền sở hữu trí tuệ khi chưa được phép.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [{ t: 'Người dùng chịu trách nhiệm toàn bộ về tính hợp pháp, chính xác và trung thực của dữ liệu đầu vào.' }]
      },
      { k: 'h2', r: [{ t: 'Điều 5. Nhà cung cấp AI bên thứ ba', b: true, c: '2d6a4f', z: 24 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Một số tính năng AI trên Build X có thể tích hợp hạ tầng, mô hình hoặc dịch vụ từ các nhà cung cấp bên thứ ba.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Trường hợp cần chuyển dữ liệu cá nhân, bản vẽ hoặc tài liệu sang bên thứ ba, Build X sẽ minh bạch thông tin đối tác, nhóm dữ liệu, mục đích xử lý và xin sự đồng ý của người dùng.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Tính năng tương ứng có thể tạm ngưng hoạt động nếu người dùng từ chối việc chuyển dữ liệu bắt buộc này.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Điều 6. Sử dụng dữ liệu cho huấn luyện hoặc tinh chỉnh AI', b: true, c: '2d6a4f', z: 24 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Build X không tự động sử dụng dữ liệu cá nhân, hình ảnh hoặc tài liệu của người dùng để huấn luyện hay tinh chỉnh mô hình AI cho mục đích khác ngoài việc cung cấp dịch vụ theo yêu cầu.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Khi có kế hoạch khai thác dữ liệu cho mục đích huấn luyện mới, Build X sẽ thông báo trước và thu thập sự đồng ý theo quy định.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          { t: 'Build X cam kết ràng buộc các nhà cung cấp AI tuân thủ nghiêm ngặt nghĩa vụ bảo vệ dữ liệu tương ứng.' }
        ]
      },
      { k: 'h2', r: [{ t: 'Điều 7. Quyền sử dụng kết quả AI', b: true, c: '2d6a4f', z: 24 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Người dùng được quyền khai thác kết quả do AI tạo ra cho các mục đích hợp pháp trong phạm vi được Build X cấp quyền.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Kết quả do AI tạo ra có thể trùng lặp hoặc tương tự giữa nhiều người dùng và không mặc nhiên bảo đảm đủ điều kiện để bảo hộ sở hữu trí tuệ.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Quyền khai thác kết quả AI không bao gồm việc chuyển giao quyền sở hữu đối với mã nguồn, mô hình, thuật toán hay tài sản trí tuệ thuộc Build X và bên cấp phép.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Điều 8. Kiểm tra quyền sở hữu trí tuệ và quyền bên thứ ba', b: true, c: '2d6a4f', z: 24 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Người dùng có nghĩa vụ tự rà soát quyền sở hữu trí tuệ, quyền hình ảnh, quyền riêng tư và các khía cạnh pháp lý liên quan trước khi công bố hoặc khai thác thương mại kết quả AI.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Dù Build X áp dụng các kỹ thuật lọc và cảnh báo rủi ro, hệ thống không bảo đảm loại bỏ triệt để mọi nguy cơ vi phạm quyền của bên thứ ba.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Điều 9. Không thay thế chuyên môn có điều kiện', b: true, c: '2d6a4f', z: 24 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Các kết quả AI về thiết kế, kết cấu, dự toán, pháp lý hoặc tài chính chỉ mang tính chất tham khảo, trừ trường hợp đã được chuyên gia có thẩm quyền kiểm tra và phê duyệt.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Không sử dụng kết quả AI để thay thế cho bản vẽ thi công, hồ sơ xin phép, thẩm định chuyên môn hay dịch vụ tư vấn độc lập khi quy định pháp luật yêu cầu nhân sự có chứng chỉ hành nghề.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Điều 10. Kiểm tra bởi con người', b: true, c: '2d6a4f', z: 24 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Đối với các quyết định có tác động lớn đến quyền lợi, an toàn hoặc tài sản của người dùng, Build X duy trì cơ chế đánh giá bởi con người theo quy định pháp luật.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Người dùng có thể phản ánh hoặc yêu cầu hỗ trợ kiểm tra kết quả AI qua kênh Chăm sóc khách hàng khi kết quả đó ảnh hưởng trực tiếp đến giao dịch thực tế.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Điều 11. Các hành vi bị cấm', b: true, c: '2d6a4f', z: 24 }] },
      {
        k: 'li',
        a: 'j',
        r: [
          {
            t: 'Nghiêm cấm sử dụng AI Build X vào mục đích lừa đảo, giả mạo, vi phạm quyền riêng tư, xâm phạm sở hữu trí tuệ, phát tán mã độc hoặc gây hại cho hệ thống.'
          }
        ]
      },
      {
        k: 'li',
        a: 'j',
        r: [
          { t: 'Nghiêm cấm sử dụng AI để tạo hồ sơ, giấy phép, chứng nhận hoặc thông tin năng lực chuyên môn giả mạo.' }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Build X có quyền tạm ngưng hoặc giới hạn dịch vụ khi phát hiện vi phạm, đồng thời xử lý khiếu nại theo đúng Điều khoản sử dụng.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Điều 12. Độ chính xác và giới hạn kỹ thuật', b: true, c: '2d6a4f', z: 24 }] },
      {
        k: 'note',
        fill: 'f8f9fa',
        sides: { top: ['d97706', 1.3], left: ['d97706', 4.0], bottom: ['d97706', 1.3], right: ['d97706', 1.3] },
        ps: [
          {
            k: 'p',
            a: 'j',
            r: [
              { t: '“Ảo giác AI” (AI Hallucination)', b: true, c: 'b45309' },
              {
                t: ' là hiện tượng AI đưa ra thông tin, số liệu hoặc kết quả sai lệch nhưng được trình bày một cách hợp lý. Hệ thống AI Build X có thể phát sinh hiện tượng này hoặc các hạn chế kỹ thuật khác.'
              }
            ]
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Người dùng có trách nhiệm đối chiếu các thông tin quan trọng với các nguồn uy tín hoặc ý kiến chuyên gia trước khi áp dụng vào thực tế.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Build X không bảo đảm tuyệt đối tính chính xác của mọi kết quả AI. Trong phạm vi pháp luật cho phép, Build X miễn trừ trách nhiệm đối với các thiệt hại do người dùng phụ thuộc hoàn toàn vào AI; các trách nhiệm khác được xác định theo quy định pháp luật và cam kết dịch vụ.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Điều 13. Sự cố và báo cáo nội dung AI', b: true, c: '2d6a4f', z: 24 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Người dùng có thể báo cáo sự cố khi phát hiện kết quả AI có sai sót nghiêm trọng, có nguy cơ gây nguy hại hoặc vi phạm pháp luật.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Build X sẽ tiếp nhận, đánh giá và chủ động điều chỉnh, gỡ bỏ thông tin hoặc xử lý theo quy trình quản trị rủi ro.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Điều 14. Tạm ngừng hoặc thay đổi tính năng AI', b: true, c: '2d6a4f', z: 24 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Build X có quyền thay đổi, giới hạn hoặc tạm ngưng các tính năng AI nhằm mục đích bảo trì, tối ưu hóa rủi ro hoặc tuân thủ pháp luật.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Mọi quyền lợi đã thanh toán bị ảnh hưởng do việc thay đổi dịch vụ sẽ được giải quyết theo Chính sách thanh toán – hủy – hoàn tiền.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Điều 15. Trách nhiệm liên quan đến AI', b: true, c: '2d6a4f', z: 24 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Build X chịu trách nhiệm pháp lý trong phạm vi các nghĩa vụ, cam kết dịch vụ và quy định pháp luật áp dụng.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Build X miễn trừ trách nhiệm đối với tổn thất phát sinh do người dùng cố ý lạm dụng AI trái với các cảnh báo hoặc bỏ qua các bước thẩm định chuyên môn bắt buộc.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [{ t: 'Điều khoản này không loại trừ các quyền bắt buộc của người tiêu dùng theo quy định của pháp luật.' }]
      },
      { k: 'h2', r: [{ t: 'Điều 16. Cập nhật Điều khoản AI', b: true, c: '2d6a4f', z: 24 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Build X có thể cập nhật Điều khoản này để phù hợp với sự phát triển của công nghệ hoặc những thay đổi về mặt pháp lý.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Các thay đổi quan trọng ảnh hưởng trực tiếp đến quyền và nghĩa vụ của người dùng sẽ được thông báo trước khi chính thức áp dụng.'
          }
        ]
      }
    ]
  },
  payment: {
    base: { c: '1e293b', z: 21 },
    blocks: [
      { k: 'title', a: 'c', r: [{ t: 'THANH TOÁN, HỦY DỊCH VỤ VÀ HOÀN TIỀN BUILD X', b: true, c: '15803d', z: 32 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Chính sách này áp dụng cho các giao dịch trên Build X và được đọc cùng Điều khoản sử dụng, Chính sách quyền riêng tư, hợp đồng/đơn hàng cùng điều kiện riêng của từng dịch vụ.',
            i: true,
            c: '334155'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Điều 1. Phạm vi và nguyên tắc áp dụng', b: true, c: '166534', z: 24 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Chính sách này điều chỉnh việc niêm yết giá, thanh toán, đặt cọc/tạm ứng, hủy dịch vụ, hoàn tiền và đối soát giao dịch đối với Dịch vụ trực tiếp và Dịch vụ kết nối trên Build X.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Quyền lợi hợp pháp của người tiêu dùng luôn được ưu tiên áp dụng. Không điều khoản nào trong Chính sách này loại trừ hoặc hạn chế các quyền khiếu nại, chấm dứt hợp đồng, hoàn tiền hay bồi thường theo quy định pháp luật.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Quy định cụ thể tại hợp đồng, đơn hàng hoặc điều kiện riêng của từng dịch vụ sẽ được ưu tiên áp dụng, trừ khi làm giảm quyền lợi hợp pháp của người tiêu dùng.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Điều 2. Phân loại giao dịch thanh toán', b: true, c: '166534', z: 24 }] },
      {
        k: 'li',
        r: [
          { t: 'Dịch vụ trực tiếp: ', b: true, c: '0f172a' },
          {
            t: 'Build X trực tiếp cung cấp hoặc chịu trách nhiệm; Khách hàng thanh toán cho Build X theo phương thức được công bố.'
          }
        ]
      },
      {
        k: 'li',
        r: [
          { t: 'Dịch vụ kết nối: ', b: true, c: '0f172a' },
          {
            t: 'Hợp đồng và nghĩa vụ thanh toán xác lập trực tiếp giữa Khách hàng và Đối tác, trừ khi có thỏa thuận Build X thu hộ hoặc cung cấp trực tiếp.'
          }
        ]
      },
      {
        k: 'li',
        r: [
          { t: 'Nội dung/tính năng số: ', b: true, c: '0f172a' },
          { t: 'Gồm lượt dùng AI, credit, tính năng phần mềm cao cấp, nội dung hoặc quyền truy cập số trong ứng dụng.' }
        ]
      },
      {
        k: 'li',
        r: [
          { t: 'Hàng hóa/dịch vụ thực tế: ', b: true, c: '0f172a' },
          {
            t: 'Gồm khảo sát, thiết kế, thi công, giám sát, vật liệu, nội ngoại thất và các dịch vụ thực hiện ngoài ứng dụng.'
          }
        ]
      },
      {
        k: 'li',
        r: [
          { t: 'Đặt cọc/tạm ứng: ', b: true, c: '0f172a' },
          { t: 'Khoản tiền trả trước nhằm bảo đảm thực hiện hợp đồng hoặc để triển khai công việc theo thỏa thuận.' }
        ]
      },
      { k: 'h2', r: [{ t: 'Điều 3. Minh bạch giá và thông tin trước thanh toán', b: true, c: '166534', z: 24 }] },
      {
        k: 'p',
        a: 'j',
        r: [{ t: 'Trước khi Khách hàng xác nhận thanh toán, Build X công khai đầy đủ các thông tin sau:' }]
      },
      { k: 'li', r: [{ t: 'Tên dịch vụ/sản phẩm và bên cung cấp.' }] },
      { k: 'li', r: [{ t: 'Phạm vi công việc.' }] },
      { k: 'li', r: [{ t: 'Giá, thuế/phí (nếu có) và số tiền phải thanh toán.' }] },
      { k: 'li', r: [{ t: 'Lịch hoặc mốc thanh toán.' }] },
      { k: 'li', r: [{ t: 'Điều kiện hủy/hoàn tiền.' }] },
      { k: 'li', r: [{ t: 'Các chi phí có thể phát sinh.' }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Không thu bất kỳ khoản phí nào ngoài danh mục đã công bố hoặc thiếu căn cứ pháp lý. Mọi thay đổi về giá hoặc chi phí phát sinh phải xử lý theo thỏa thuận hợp pháp và quy định pháp luật.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          { t: 'Đối với giao dịch điện tử, Khách hàng phải chủ động xác nhận trước khi phát sinh nghĩa vụ thanh toán.' }
        ]
      },
      { k: 'h2', r: [{ t: 'Điều 4. Phương thức thanh toán', b: true, c: '166534', z: 24 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Build X hỗ trợ các phương thức thanh toán hợp pháp như chuyển khoản, cổng thanh toán, thẻ, ví điện tử, Apple In-App Purchase hoặc phương thức khác phù hợp với từng giao dịch.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Phương thức thanh toán được hiển thị tại thời điểm đặt hàng và có thể tùy thuộc vào từng loại dịch vụ.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Build X không yêu cầu Khách hàng chuyển tiền vào tài khoản cá nhân không được công bố chính thức trên nền tảng hoặc hợp đồng.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Điều 5. Thanh toán đối với Dịch vụ trực tiếp', b: true, c: '166534', z: 24 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Đối với Dịch vụ trực tiếp, Khách hàng thanh toán cho Build X theo giá, tiến độ và điều kiện trong báo giá, đơn hàng hoặc hợp đồng.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [{ t: 'Build X ghi nhận khoản thanh toán và xuất hóa đơn/chứng từ theo đúng quy định pháp luật.' }]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Quy trình thanh toán trước, thanh toán theo giai đoạn hoặc tạm giữ tiền chờ nghiệm thu thực hiện theo thỏa thuận cụ thể.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Điều 6. Thanh toán đối với Dịch vụ kết nối', b: true, c: '166534', z: 24 }] },
      {
        k: 'p',
        a: 'j',
        r: [{ t: 'Trừ khi có quy định khác, Khách hàng thanh toán trực tiếp cho Đối tác đối với Dịch vụ kết nối.' }]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Build X không mặc nhiên giữ tiền, bảo lãnh thanh toán hoặc chịu trách nhiệm hoàn tiền cho khoản thanh toán trực tiếp giữa Khách hàng và Đối tác.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Build X hỗ trợ đối soát và giải quyết khiếu nại trong phạm vi nền tảng. Trường hợp Build X thu hộ, vai trò, thời điểm chuyển tiền, điều kiện hoàn tiền và trách nhiệm các bên sẽ được công bố trước khi thanh toán.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Điều 7. Nội dung số, AI credit và In-App Purchase', b: true, c: '166534', z: 24 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Trên hệ điều hành iOS, nội dung/tính năng số được thanh toán qua In-App Purchase theo yêu cầu của Apple. Credit/lượt dùng mua qua In-App Purchase không có thời hạn hết hạn, trừ khi pháp luật hoặc Apple quy định khác.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Yêu cầu hoàn tiền In-App Purchase do Apple xử lý theo chính sách App Store. Build X hỗ trợ cung cấp thông tin và cập nhật quyền lợi tương ứng theo xác nhận từ Apple.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Khi Apple xác nhận hoàn tiền, Build X có quyền thu hồi hoặc điều chỉnh quyền lợi số tương ứng theo quy định.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Nội dung số đã mở khóa hoặc sử dụng vẫn có thể được hoàn tiền nếu quy định của Apple hoặc pháp luật có cho phép.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Điều 8. Đặt cọc và tạm ứng', b: true, c: '166534', z: 24 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Khoản đặt cọc/tạm ứng chỉ được thu khi mục đích, giá trị, điều kiện sử dụng, hoàn trả hoặc xử lý hủy bỏ được công khai rõ ràng trong báo giá, đơn hàng hoặc hợp đồng.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Đối với Dịch vụ trực tiếp, Build X chỉ khấu trừ các chi phí hợp lý, thực tế và có căn cứ như công việc đã hoàn thành hoặc chi phí bên thứ ba không thể hoàn lại theo thỏa thuận.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Không áp dụng khoản phạt hay khấu trừ không công bố trước, thiếu căn cứ pháp lý hoặc làm xâm phạm quyền lợi người tiêu dùng.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Điều 9. Hủy Dịch vụ trực tiếp trước khi bắt đầu thực hiện', b: true, c: '166534', z: 24 }] },
      { k: 'p', a: 'j', r: [{ t: 'Khách hàng có thể hủy Dịch vụ trực tiếp trước khi Build X triển khai công việc.' }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Nếu chưa phát sinh chi phí không thể thu hồi, Build X hoàn lại toàn bộ số tiền ứng với phần dịch vụ chưa thực hiện.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Nếu đã phát sinh chi phí chuẩn bị thực tế và hợp lý theo yêu cầu của Khách hàng, Build X sẽ khấu trừ phần chi phí này dựa trên chứng từ minh bạch.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Mốc thời gian hủy miễn phí hoặc chi phí hủy riêng biệt (nếu có) sẽ được công bố rõ trước khi Khách hàng xác nhận dịch vụ.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Điều 10. Hủy Dịch vụ trực tiếp sau khi đã bắt đầu', b: true, c: '166534', z: 24 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Trường hợp hủy sau khi dịch vụ đã bắt đầu, số tiền hoàn lại bằng giá trị dịch vụ chưa sử dụng trừ đi phần công việc đã thực hiện và các chi phí hợp lý, không thể thu hồi.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [{ t: 'Build X sẽ cung cấp bảng đối soát công việc và khoản khấu trừ khi Khách hàng yêu cầu.' }]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Nếu việc hủy dịch vụ do lỗi từ Build X, việc hoàn tiền và bồi thường được xử lý theo hợp đồng và pháp luật; Khách hàng không phải chịu chi phí do lỗi của Build X.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Điều 11. Lịch tư vấn, khảo sát và dịch vụ theo thời gian', b: true, c: '166534', z: 24 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Đối với dịch vụ đặt theo khung giờ (tư vấn, khảo sát), quy định đổi/hủy lịch hoặc vắng mặt phải được hiển thị trước khi xác nhận đặt lịch.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Nếu không có quy định riêng công bố trước, Build X không thu phí hủy hay tịch thu tiền thanh toán khi Khách hàng đổi lịch.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Trường hợp chuyên gia hoặc Build X không thể cung cấp dịch vụ đúng hẹn và Khách hàng không chấp nhận lịch thay thế, tiền dịch vụ chưa thực hiện sẽ được hoàn lại.'
          }
        ]
      },
      {
        k: 'h2',
        r: [{ t: 'Điều 12. Thi công, giám sát, thiết kế triển khai và vật liệu', b: true, c: '166534', z: 24 }]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Đối với dịch vụ thi công, giám sát, thiết kế triển khai hay cung ứng vật liệu, việc hủy, tạm dừng, quyết toán và hoàn tiền căn cứ theo hợp đồng dự án, khối lượng nghiệm thu, vật tư đã đặt và quy định pháp luật chuyên ngành.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Chính sách này không thay thế các cơ chế nghiệm thu, bảo hành, xử lý phát sinh, đặt cọc hay chấm dứt hợp đồng đã thỏa thuận trong hợp đồng dự án.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [{ t: 'Các khoản khấu trừ phải dựa trên chứng từ chi phí thực tế và bảo đảm quyền lợi người tiêu dùng.' }]
      },
      {
        k: 'h2',
        r: [
          {
            t: 'Điều 13. Trường hợp Build X chủ động hủy hoặc không thể cung cấp Dịch vụ trực tiếp',
            b: true,
            c: '166534',
            z: 24
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Nếu Build X chủ động hủy hoặc không thể cung cấp Dịch vụ trực tiếp do lỗi của mình, Khách hàng sẽ được hoàn lại tiền tương ứng với phần dịch vụ chưa nhận.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [{ t: 'Việc chuyển sang phương án thay thế chỉ thực hiện khi có sự đồng ý của Khách hàng.' }]
      },
      {
        k: 'p',
        a: 'j',
        r: [{ t: 'Quyền bồi thường thiệt hại (nếu có) được xác định theo hợp đồng và quy định pháp luật.' }]
      },
      {
        k: 'h2',
        r: [
          {
            t: 'Điều 14. Quyền chấm dứt trong giao dịch từ xa khi thông tin bắt buộc không đầy đủ hoặc không chính xác',
            b: true,
            c: '166534',
            z: 24
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Trong giao dịch từ xa, nếu Build X cung cấp thiếu hoặc không chính xác thông tin bắt buộc, người tiêu dùng có quyền đơn phương chấm dứt hợp đồng theo thời hạn luật định.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Khi chấm dứt hợp đồng theo căn cứ trên, người tiêu dùng không phải trả chi phí chấm dứt, ngoại trừ phần sản phẩm/dịch vụ đã sử dụng.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Build X sẽ hoàn lại tiền cho phần dịch vụ chưa sử dụng trong thời hạn 30 ngày kể từ ngày nhận thông báo chấm dứt. Quá thời hạn này, Build X phải trả thêm lãi chậm trả theo luật định.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Tiền hoàn trả được chuyển qua phương thức thanh toán ban đầu, trừ khi có thỏa thuận khác hoặc phương thức cũ không thực hiện được.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Điều 15. Phương thức và thời gian hoàn tiền', b: true, c: '166534', z: 24 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Đối với giao dịch do Build X trực tiếp thu đủ điều kiện hoàn tiền, lệnh hoàn tiền sẽ được khởi tạo trong vòng 07 ngày làm việc kể từ khi xác nhận đầy đủ thông tin, trừ khi có quy định khác.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Thời gian tiền về tài khoản Khách hàng phụ thuộc vào quy trình của ngân hàng, trung gian thanh toán hoặc Apple.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [{ t: 'Trường hợp pháp luật quy định thời hạn bắt buộc khác, thời hạn pháp luật sẽ ưu tiên áp dụng.' }]
      },
      {
        k: 'p',
        a: 'j',
        r: [{ t: 'Giao dịch qua In-App Purchase tuân thủ thời gian và phương thức hoàn tiền theo cơ chế của Apple.' }]
      },
      {
        k: 'h2',
        r: [
          {
            t: 'Điều 16. Giao dịch trùng, sai số tiền hoặc thanh toán không nhận diện được',
            b: true,
            c: '166534',
            z: 24
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Khách hàng cần thông báo cho Build X khi có sự cố trừ tiền trùng, sai số tiền hoặc giao dịch chưa ghi nhận.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          { t: 'Build X sẽ đối soát và hoàn trả hoặc điều chỉnh nếu xác định có sai sót thuộc trách nhiệm của mình.' }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Khách hàng cung cấp mã giao dịch hoặc chứng từ liên quan để hỗ trợ đối soát; Build X tuyệt đối không yêu cầu mật khẩu, mã PIN hay OTP.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Điều 17. Mã ưu đãi, điểm thưởng và quyền lợi khuyến mại', b: true, c: '166534', z: 24 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Mã giảm giá, điểm thưởng hoặc ưu đãi không có giá trị quy đổi thành tiền mặt, trừ khi chương trình có quy định khác.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Khi hủy giao dịch và hoàn tiền, các ưu đãi đi kèm sẽ được điều chỉnh hoặc khôi phục theo thể lệ chương trình.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [{ t: 'Việc áp dụng ưu đãi không làm hạn chế các quyền lợi hoàn tiền theo luật định của người tiêu dùng.' }]
      },
      { k: 'h2', r: [{ t: 'Điều 18. Chargeback, gian lận và lạm dụng hoàn tiền', b: true, c: '166534', z: 24 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Khách hàng nên ưu tiên liên hệ kênh hỗ trợ của Build X hoặc nhà cung cấp thanh toán để xử lý trước khi yêu cầu tra soát/chargeback.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Build X có quyền xác minh hành vi gian lận hoặc lạm dụng cơ chế hoàn tiền. Nếu phát hiện vi phạm cố ý nhằm trục lợi, Build X có thể tạm khóa hoặc chấm dứt tài khoản theo Điều khoản sử dụng.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Các biện pháp xử lý được áp dụng minh bạch, có căn cứ và luôn có kênh tiếp nhận khiếu nại. Yêu cầu hoàn tiền chính đáng sẽ không phải là căn cứ để khóa tài khoản.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Điều 19. Hồ sơ yêu cầu hủy và hoàn tiền', b: true, c: '166534', z: 24 }] },
      {
        k: 'p',
        a: 'j',
        r: [{ t: 'Khách hàng gửi yêu cầu hủy/hoàn tiền qua ứng dụng hoặc các kênh CSKH chính thức của Build X.' }]
      },
      { k: 'p', a: 'j', r: [{ t: 'Thông tin xác minh cần cung cấp gồm:' }] },
      { k: 'li', r: [{ t: 'Mã đơn hàng/giao dịch.' }] },
      { k: 'li', r: [{ t: 'Dịch vụ liên quan.' }] },
      { k: 'li', r: [{ t: 'Lý do yêu cầu.' }] },
      { k: 'li', r: [{ t: 'Chứng từ thanh toán.' }] },
      { k: 'li', r: [{ t: 'Thông tin cần thiết khác theo từng trường hợp.' }] },
      {
        k: 'p',
        a: 'j',
        r: [{ t: 'Build X tuyệt đối không yêu cầu cung cấp mật khẩu, mã PIN, OTP hay thông tin thẻ đầy đủ.' }]
      },
      {
        k: 'p',
        a: 'j',
        r: [{ t: 'Kết quả xử lý sẽ được phản hồi qua tài khoản, email, điện thoại hoặc kênh liên hệ đã đăng ký.' }]
      },
      { k: 'h2', r: [{ t: 'Điều 20. Tranh chấp thanh toán trong Dịch vụ kết nối', b: true, c: '166534', z: 24 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Đối với giao dịch thanh toán trực tiếp cho Đối tác, Đối tác chịu trách nhiệm hoàn tiền theo hợp đồng giữa hai bên.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Build X hỗ trợ tiếp nhận thông tin, đối soát và hòa giải nhưng không gánh chịu nghĩa vụ tài chính thay Đối tác.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Trường hợp Đối tác vi phạm quy định nền tảng, Build X có thể xử lý vi phạm đối tác độc lập với tranh chấp tài chính của Khách hàng.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Điều 21. Khiếu nại và giải quyết tranh chấp', b: true, c: '166534', z: 24 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          { t: 'Khách hàng có quyền khiếu nại về giao dịch, hủy dịch vụ hoặc hoàn tiền qua các kênh CSKH chính thức.' }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Build X tiếp nhận, xử lý và phản hồi khiếu nại theo thời hạn quy định, tuân thủ Luật Bảo vệ quyền lợi người tiêu dùng.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Nếu thương lượng không thành công, tranh chấp được giải quyết theo Điều khoản sử dụng và pháp luật áp dụng.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Điều 22. Cập nhật chính sách và ngày hiệu lực', b: true, c: '166534', z: 24 }] },
      {
        k: 'p',
        a: 'j',
        r: [{ t: 'Build X có thể cập nhật Chính sách này để phù hợp với quy định pháp luật và mô hình hoạt động.' }]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          { t: 'Các sửa đổi không làm ảnh hưởng đến quyền lợi đã xác lập trước thời điểm chính sách mới có hiệu lực.' }
        ]
      },
      { k: 'p', r: [{ t: 'Phiên bản áp dụng và ngày hiệu lực sẽ được niêm yết công khai trên ứng dụng Build X.' }] }
    ]
  }
}
