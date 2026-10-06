import { BUILDING_IMAGE, INTERIOR_IMAGE, TOPIC_IMAGE } from '@/shared/lib/imagery'
import type { GuideArticle, GuideVideo } from '../cms.types'

/**
 * Danh sách video khởi điểm theo mục VI — tiêu đề, thứ tự và thời lượng đúng
 * như spec. Admin thêm / sửa / sắp thứ tự và chọn video nổi bật (mục X, #3).
 */
const VIDEOS: GuideVideo[] = [
  {
    id: 'vid-01',
    status: 'visible',
    createdAt: '2026-08-01T02:00:00.000Z',
    topic: 'land-photo',
    title: 'Chụp ảnh lô đất đúng cách',
    description: 'Góc chụp, ánh sáng và cách lấy trọn ranh giới lô đất.',
    thumbnailUrl: TOPIC_IMAGE.site,
    videoUrl: '',
    durationSeconds: 45,
    featured: true
  },
  {
    id: 'vid-02',
    status: 'visible',
    createdAt: '2026-08-02T02:00:00.000Z',
    topic: 'input',
    title: 'Nhập liệu tạo dự án',
    description: 'Điền thông tin công trình và chọn gói hoàn thiện.',
    thumbnailUrl: BUILDING_IMAGE.townhouse,
    videoUrl: '',
    durationSeconds: 58
  },
  {
    id: 'vid-03',
    status: 'visible',
    createdAt: '2026-08-03T02:00:00.000Z',
    topic: 'read-estimate',
    title: 'Cách đọc bảng dự toán',
    description: 'Hiểu ba phần chi phí và tỷ trọng của từng phần.',
    thumbnailUrl: INTERIOR_IMAGE.modern,
    videoUrl: '',
    durationSeconds: 60
  },
  {
    id: 'vid-04',
    status: 'visible',
    createdAt: '2026-08-04T02:00:00.000Z',
    topic: 'input',
    title: 'Chọn phong cách phù hợp',
    description: 'So sánh các phong cách và ảnh hưởng tới dự toán nội thất.',
    thumbnailUrl: INTERIOR_IMAGE.indochine,
    videoUrl: '',
    durationSeconds: 40
  },
  {
    id: 'vid-05',
    status: 'visible',
    createdAt: '2026-08-05T02:00:00.000Z',
    topic: 'dossier',
    title: 'Bộ hồ sơ gồm những gì',
    description: 'Trang bìa, mặt bằng 2D, phối cảnh và bảng dự toán chi tiết.',
    thumbnailUrl: BUILDING_IMAGE.garden,
    videoUrl: '',
    durationSeconds: 52
  },
  {
    id: 'vid-06',
    status: 'visible',
    createdAt: '2026-08-06T02:00:00.000Z',
    topic: 'share',
    title: 'Chia sẻ hồ sơ cho người thân',
    description: 'Tạo link, gửi email hoặc quét QR để xem online.',
    thumbnailUrl: BUILDING_IMAGE.villa,
    videoUrl: '',
    durationSeconds: 35
  }
]

const ARTICLES: GuideArticle[] = [
  {
    id: 'gart-01',
    topic: 'land-photo',
    title: 'Checklist ảnh lô đất đạt chuẩn',
    excerpt: 'Đủ sáng, thấy rõ ranh giới, tránh ngược sáng và vật che khuất.',
    imageUrl: TOPIC_IMAGE.site
  },
  {
    id: 'gart-02',
    topic: 'read-estimate',
    title: 'Dự toán khác báo giá thi công thế nào',
    excerpt: 'Phạm vi, độ chi tiết và những khoản thường phát sinh ngoài dự toán.',
    imageUrl: TOPIC_IMAGE.blueprint
  }
]

export const GUIDE_VIDEOS_SEED: GuideVideo[] = VIDEOS
export const GUIDE_ARTICLES_SEED: GuideArticle[] = ARTICLES
