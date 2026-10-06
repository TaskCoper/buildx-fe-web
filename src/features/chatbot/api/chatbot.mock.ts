import type { ProjectChatContext } from '@/shared/chat-context'
import { mockDelay } from '@/shared/lib'

/** Quick-start prompts offered before the user types anything. */
export const SUGGESTIONS = [
  'Vì sao phần thô chiếm nhiều chi phí nhất?',
  'Làm sao giảm chi phí mà vẫn giữ thẩm mỹ?',
  'Bộ hồ sơ thi công gồm những gì?'
]

/**
 * Canned, keyword-based replies — stands in for the real AI endpoint. Câu trả
 * lời chèn dữ liệu thật của dự án khi có ngữ cảnh (mục III.3a).
 */
function generateReply(text: string, context: ProjectChatContext | null): string {
  const q = text.toLowerCase()
  const project = context?.projectName ? `dự án "${context.projectName}"` : 'dự án của bạn'

  if (q.includes('phần thô') || q.includes('móng') || q.includes('kết cấu')) {
    const scale = context?.scaleLabel ? ` quy mô ${context.scaleLabel}` : ''
    return `Với ${project}${scale}, phần thô gồm móng/cọc, khung – sàn – mái và xây tô. Nhóm này phụ thuộc số tầng và điều kiện nền đất nên thường chiếm tỷ trọng lớn nhất. Giảm số tầng hoặc đơn giản hóa mái là hai cách hạ chi phí rõ rệt nhất.`
  }
  if (q.includes('giảm') || q.includes('tối ưu') || q.includes('tiết kiệm')) {
    const tier = context?.packageLabel
      ? ` Bạn đang ở gói ${context.packageLabel}; hạ một bậc gói sẽ thấy chênh lệch ngay ở phần hoàn thiện.`
      : ''
    return `Có ba hướng thường hiệu quả: (1) giữ nguyên kết cấu, đổi nhóm vật liệu hoàn thiện sang thương hiệu khác cùng phân khúc; (2) chia nội thất làm hai giai đoạn — gỗ cố định trước, đồ rời bổ sung sau; (3) rà lại số phòng vệ sinh và diện tích ban công.${tier}`
  }
  if (q.includes('hồ sơ') || q.includes('pdf') || q.includes('bản vẽ')) {
    return 'Bộ hồ sơ thi công gồm trang bìa, bản vẽ mặt bằng 2D, phối cảnh ngoại thất và bảng dự toán chi tiết. Sau khi render xong bạn có thể tải PDF, tạo link chia sẻ, gửi email hoặc quét QR để mở trên điện thoại.'
  }
  if (q.includes('dự toán') || q.includes('chi phí') || q.includes('giá')) {
    return `Bảng dự toán của ${project} chia làm 3 phần: phần thô, phần hoàn thiện và phần nội thất. Bấm "XEM CHI TIẾT" để tải file Excel đầy đủ hạng mục con kèm khối lượng và đơn giá từng đầu việc.`
  }
  if (q.includes('khu vực') || q.includes('đơn giá') || q.includes('vật tư')) {
    return context?.area
      ? `Đơn giá đang áp theo mặt bằng giá vật tư và nhân công khu vực ${context.area} tại thời điểm lập. Giá thép, xi măng biến động theo quý nên con số cuối có thể lệch — báo giá chính xác cần kiến trúc sư BuildX khảo sát thực tế.`
      : 'Đơn giá được áp theo mặt bằng giá khu vực công trình tại thời điểm lập dự toán. Bạn nhập địa chỉ ở Bước 1 để tôi áp đúng khung giá địa phương.'
  }
  return 'Tôi đã ghi nhận câu hỏi của bạn. (Đây là phản hồi mẫu — khi kết nối backend AI thật, câu trả lời sẽ dựa trên dữ liệu dự án và đơn giá thực tế.)'
}

export const mockChatbotApi = {
  async sendMessage(text: string, context: ProjectChatContext | null): Promise<string> {
    await mockDelay(900)
    return generateReply(text, context)
  }
}
