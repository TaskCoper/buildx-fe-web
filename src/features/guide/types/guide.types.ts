/**
 * Kiểu dữ liệu của trang Hướng dẫn (mục VI).
 *
 * Video và bài hướng dẫn là nội dung admin biên soạn (mục X, #3) nên type nằm ở
 * `shared/cms`; đây chỉ re-export để barrel của feature không đổi.
 */
export type { GuideArticle, GuideTopic, GuideVideo } from '@/shared/cms'
