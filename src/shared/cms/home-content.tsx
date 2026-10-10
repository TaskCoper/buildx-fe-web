'use client'

import { createContext, useContext, useMemo, type ReactNode } from 'react'

import { EMPTY_HOME_ICON_NODES, EMPTY_HOME_SECTIONS, type HomeIconNodes, type HomeSections } from './home-sections'

interface HomeContentValue {
  sections: HomeSections
  iconNodes: HomeIconNodes
}

const EMPTY: HomeContentValue = { sections: EMPTY_HOME_SECTIONS, iconNodes: EMPTY_HOME_ICON_NODES }

const HomeContentContext = createContext<HomeContentValue>(EMPTY)

/**
 * Đưa nội dung các khối trang chủ (đã lấy ở server) xuống các section. Section nào cũng đọc qua
 * {@link useHomeSections} rồi rơi về nội dung có sẵn khi khối chưa được admin lưu.
 */
export function HomeContentProvider({
  sections,
  iconNodes,
  children
}: {
  sections: HomeSections
  iconNodes: HomeIconNodes
  children: ReactNode
}) {
  const value = useMemo(() => ({ sections, iconNodes }), [sections, iconNodes])
  return <HomeContentContext.Provider value={value}>{children}</HomeContentContext.Provider>
}

/** Nội dung các khối của trang chủ; rỗng khi dùng ngoài {@link HomeContentProvider} hoặc chưa có khối nào. */
export function useHomeSections(): HomeSections {
  return useContext(HomeContentContext).sections
}

/** Dữ liệu vẽ của các icon admin đã đặt (theo khóa kebab-case); rỗng khi chưa đặt icon nào. */
export function useHomeIconNodes(): HomeIconNodes {
  return useContext(HomeContentContext).iconNodes
}
