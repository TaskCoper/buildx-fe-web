'use client'

import { Drawer, Grid } from 'antd'

import { ArticleLabelManager } from './article-label-manager'

/**
 * Danh mục tin tức mở ngay trên màn Bài viết bằng một Drawer — đồng nhất cách
 * vào sửa danh mục với "Quản lý danh mục" của màn Tư vấn (KTS), thay vì bắt vào
 * một mục menu riêng. Tái dùng nguyên `ArticleLabelManager` (cây danh mục nhiều
 * cấp); header của màn con đủ làm tiêu đề nên Drawer chỉ để nút đóng.
 */
export function ArticleCategoryDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const screens = Grid.useBreakpoint()
  return (
    <Drawer
      open={open}
      onClose={onClose}
      size={screens.lg ? undefined : '100%'}
      width={screens.lg ? 780 : undefined}
      destroyOnHidden
    >
      <ArticleLabelManager />
    </Drawer>
  )
}
