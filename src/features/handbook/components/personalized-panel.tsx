'use client'

import { memo, useRef, useState } from 'react'
import { BookOpen, Info, LayoutGrid, Minimize2, Newspaper } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'motion/react'

import { useChatContextStore } from '@/shared/chat-context'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { cn } from '@/shared/lib/utils'
import { useHandbookArticles, usePersonalizedTemplates, useWaitingTemplates } from '../hooks/use-handbook'
import { useHandbookPanelStore } from '../store/handbook-panel.store'
import type {
  HandbookArticle,
  HandbookFilter,
  HandbookPanelTab,
  HandbookTemplate,
  HandbookTemplateKind,
  LibraryMatchCriteria
} from '../types/handbook.types'
import { ArticleCard } from './article-card'
import { ArticleDetailDialog } from './article-detail-dialog'
import { TemplateCard } from './template-card'
import { TemplateQuickView } from './template-quick-view'

interface PersonalizedPanelProps {
  /** Tag filter dựng từ các trường Bước 1 bởi lớp app. */
  filter: HandbookFilter
  /** `2d` (mẫu bản vẽ) cho màn chờ Bước 2, `3d` (mẫu nội thất) cho màn chờ Bước 3. */
  kind: HandbookTemplate['kind']
  /**
   * Dòng ghi rõ căn cứ lọc, ví dụ "Mẫu bản vẽ 2D phù hợp với Nhà phố Trệt + 1
   * lầu của bạn" (Phần 1.1). Nhãn đã dịch do lớp app dựng, vì `features/handbook`
   * không biết vocabulary của Bước 1.
   */
  filterLabel?: string
  /**
   * Điều kiện của dự toán thật đang được AI lập. Có thì lưới mẫu lấy từ `POST /design-templates/matches` (2D và 3D khớp
   * đúng đầu vào đã gửi AI) thay cho việc chọn ngẫu nhiên theo tag.
   */
  matchCriteria?: LibraryMatchCriteria | null
  /** Chủ đề bài viết: kiến trúc (Bước 2) hoặc nội thất (Bước 3). */
  topic: 'architecture' | 'interior'
  longWait?: boolean
  /**
   * Màn chờ của luồng bốn chặng chỉ hiện mẫu khớp. Khi bật, lúc điều kiện khớp còn đang tải thì hiện khung chờ thay cho lưới
   * mẫu ngẫu nhiên (tránh lưới đổi hẳn sau nửa giây) và không tải trang 100 mẫu.
   */
  matchedOnly?: boolean
}

/**
 * Bảng "Cẩm nang cá nhân hóa" (mục III.3a, tái dùng ở mục III.4b).
 *
 * Thanh công cụ dọc bên trái panel với 2 mục, vùng nội dung bên phải hiển thị
 * theo mục đang chọn. Bấm thu nhỏ → panel co thành nút nổi ở góc màn hình;
 * bấm nút nổi để mở lại bất cứ lúc nào.
 */
export const PersonalizedPanel = memo(function PersonalizedPanel({
  filter,
  kind,
  topic,
  filterLabel,
  matchCriteria = null,
  longWait = false,
  matchedOnly = false
}: PersonalizedPanelProps) {
  const t = useTranslations('handbook.panel')
  const tab = useHandbookPanelStore((s) => s.tab)
  const setTab = useHandbookPanelStore((s) => s.setTab)
  const minimized = useHandbookPanelStore((s) => s.minimized)
  const setMinimized = useHandbookPanelStore((s) => s.setMinimized)
  const chatOpen = useChatContextStore((s) => s.panelOpen)
  const reduced = useReducedMotion()
  const scrollRef = useRef<HTMLDivElement>(null)
  const scrollPositions = useRef<Record<HandbookPanelTab, number>>({ templates: 0, articles: 0 })
  const displayedTab = useRef<HandbookPanelTab>(kind === '3d' ? tab : 'templates')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)

  // Popup xem chi tiết là state cục bộ: nó chỉ sống trong lúc panel đang mở,
  // không cần giữ qua các bước như trạng thái thu nhỏ / mục đang chọn.
  const [selectedTemplate, setSelectedTemplate] = useState<HandbookTemplate | null>(null)
  const [selectedArticle, setSelectedArticle] = useState<HandbookArticle | null>(null)

  // Màn chờ của dự toán thật chỉ dùng mẫu khớp, nên không tải thêm cả trang 100 mẫu để chọn ngẫu nhiên.
  const matchedMode = matchedOnly || Boolean(matchCriteria)
  const { templates, isPending: templatesPending } = usePersonalizedTemplates(filter, kind, { enabled: !matchedMode })
  const { data: articles, isPending: articlesPending } = useHandbookArticles(topic)
  const waiting = useWaitingTemplates(matchCriteria, kind)
  // Lưới mẫu đang hiện lấy từ đâu thì đợi đúng nguồn đó: query 100 mẫu bị tắt ở màn chờ nên luôn `isPending`.
  const gridPending = matchedMode ? !matchCriteria || waiting.isPending : templatesPending

  // Màn chờ của dự toán thật mà thư viện không có mẫu nào (khớp đủ hay cùng loại công trình), hoặc tải lỗi: chỉ hiện tiến
  // độ, không hiện phần mẫu tham khảo (STORY-LIB-002/AC-013, ST-LIB-047).
  if (matchCriteria && !waiting.isPending && waiting.items.length === 0) return null

  if (minimized) {
    return (
      <Button
        data-handbook-panel-fab
        data-long-wait={longWait}
        size='lg'
        onClick={() => setMinimized(false)}
        aria-label={t('restore')}
        tabIndex={chatOpen ? -1 : undefined}
        className={cn(
          // Xếp ngay trên nút chatbot ở cùng góc phải dưới.
          'fixed right-6 bottom-24 z-40 rounded-full shadow-lg transition-all duration-300',
          // Khung chat mở thì rút nút đi hẳn, y như nút chatbot. Trước đây nút
          // được dịch sang trái đúng 380px cho khớp bề rộng drawer, nhưng con số
          // đó nằm ở file khác nên không có gì giữ cho hai bên bằng nhau — chỉ
          // cần drawer đổi bề rộng, hoặc màn hẹp lại, là nút văng khỏi chỗ.
          chatOpen && 'pointer-events-none translate-y-2 opacity-0'
        )}
      >
        <BookOpen className='size-5' />
        <span className='hidden sm:inline'>{t('restore')}</span>
      </Button>
    )
  }

  const tabs: { id: HandbookPanelTab; icon: typeof LayoutGrid }[] = [
    { id: 'templates', icon: LayoutGrid },
    { id: 'articles', icon: Newspaper }
  ]

  // Hình 1 (Bước 2) không có thanh công cụ dọc, Hình 4 (Bước 3) có. Khi ẩn
  // thanh này thì panel luôn hiện lưới mẫu, bất kể `tab` đang lưu là gì.
  const showTabs = kind === '3d'
  const activeTab: HandbookPanelTab = showTabs ? tab : 'templates'

  return (
    <>
      <section
        data-handbook-panel
        data-long-wait={longWait}
        aria-label={t('title')}
        // Panel không bao giờ cao hơn khung nhìn (trừ thanh công cụ + stepper) và
        // tự cuộn bên trong. Để nó dài tự do thì cột phải kéo dài gấp mấy lần cột
        // trái, `sticky` mất tác dụng và người dùng phải cuộn cả trang mới xem hết
        // mẫu. Chỉ áp từ `lg`: dưới đó panel xếp dọc, tự giãn cao vừa đủ chứa hết thẻ, không cuộn trong.
        className='bg-card flex flex-col lg:max-h-[calc(100svh-11rem)] overflow-hidden rounded-2xl border lg:flex-row'
      >
        {/* Thanh công cụ bên trái panel — chỉ có ở Bước 3 (Hình 4). Dưới `lg` nó thành THANH NGANG ở đầu
            panel (hai tab chia đều bề ngang): cột dọc 176px cũ chiếm gần nửa màn hình điện thoại nên nội
            dung (nhất là "Bài tư vấn") bị bóp còn ~140px. */}
        {showTabs ? (
          <LayoutGroup id={`handbook-panel-${kind}`}>
            <nav className='bg-muted/40 flex shrink-0 gap-1 border-b p-2 lg:w-44 lg:flex-col lg:border-r lg:border-b-0'>
              {tabs.map(({ id, icon: Icon }) => (
                <button
                  key={id}
                  type='button'
                  onClick={() => {
                    if (scrollRef.current) scrollPositions.current[displayedTab.current] = scrollRef.current.scrollTop
                    setTab(id)
                  }}
                  aria-current={tab === id ? 'true' : undefined}
                  className={cn(
                    'relative flex flex-1 items-center justify-center gap-2 overflow-hidden rounded-lg px-3 py-2.5 text-sm transition-colors lg:flex-none lg:justify-start lg:text-left',
                    tab === id
                      ? 'text-accent-foreground font-medium'
                      : 'text-muted-foreground hover:bg-foreground/[0.06]'
                  )}
                >
                  {tab === id ? (
                    <motion.span
                      layoutId='handbook-panel-tab'
                      className='bg-accent absolute inset-0'
                      transition={{ type: 'spring', stiffness: 420, damping: 38 }}
                    />
                  ) : null}
                  <Icon className='relative z-10 size-4 shrink-0' />
                  <span className='relative z-10 truncate'>{t(`tabs.${id}`)}</span>
                </button>
              ))}
            </nav>
          </LayoutGroup>
        ) : null}

        {/* Vùng nội dung bên phải panel */}
        <div className='flex min-w-0 flex-1 flex-col'>
          <header className='flex shrink-0 items-center justify-between gap-2 border-b px-4 py-3'>
            <div className='min-w-0'>
              {/* Hình 1: dòng nhãn nhỏ màu thương hiệu nằm trên tiêu đề panel. */}
              <p className='text-primary truncate max-md:text-xs text-[0.7rem] font-semibold tracking-wide uppercase'>
                {t('eyebrow')}
              </p>
              <h2 className='truncate text-base font-semibold'>{t('title')}</h2>
              <p className='text-muted-foreground truncate text-xs'>
                {activeTab === 'articles'
                  ? t('tabs.articles')
                  : matchedMode
                    ? t('matched.label')
                    : (filterLabel ?? t(kind === '2d' ? 'fallback2d' : 'fallback3d'))}
              </p>
            </div>
            <Button variant='ghost' size='icon' aria-label={t('minimize')} onClick={() => setMinimized(true)}>
              <Minimize2 className='size-4' />
            </Button>
          </header>

          <div className='flex min-h-0 flex-1 flex-col'>
            <AnimatePresence mode='wait' initial={false}>
              <motion.div
                key={activeTab}
                className='min-h-0 flex-1 overflow-y-auto p-4'
                onScroll={(event) => {
                  if (activeTab === 'templates' ? gridPending : articlesPending) return
                  scrollPositions.current[activeTab] = event.currentTarget.scrollTop
                }}
                ref={(node) => {
                  if (!node) return
                  scrollRef.current = node
                  displayedTab.current = activeTab
                  node.scrollTop = scrollPositions.current[activeTab]
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduced ? 0 : 0.18 }}
              >
                {activeTab === 'templates' && matchedMode && !matchCriteria ? (
                  <PanelSkeleton />
                ) : activeTab === 'templates' && matchCriteria ? (
                  <MatchedTemplates
                    kind={kind}
                    waiting={waiting}
                    selectedId={selectedTemplateId}
                    onOpen={(value) => {
                      setSelectedTemplateId(value.id)
                      setSelectedTemplate(value)
                    }}
                  />
                ) : activeTab === 'templates' ? (
                  templatesPending ? (
                    <PanelSkeleton />
                  ) : (
                    /* Lưới 3×2 đúng Hình 1 / Hình 4 — sáu mẫu, không phải danh sách dọc. */
                    <div data-handbook-panel-grid className='grid grid-cols-2 gap-3 lg:grid-cols-3'>
                      {templates.map((template, index) => (
                        <div
                          key={template.id}
                          data-panel-card
                          style={{ '--panel-card-delay': `${index * 65}ms` } as React.CSSProperties}
                        >
                          <TemplateCard
                            template={template}
                            variant='panel'
                            selected={selectedTemplateId === template.id}
                            onOpen={(value) => {
                              setSelectedTemplateId(value.id)
                              setSelectedTemplate(value)
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )
                ) : articlesPending ? (
                  <PanelSkeleton />
                ) : (
                  <div className='space-y-3'>
                    {articles?.map((article) => (
                      <ArticleCard key={article.id} article={article} onOpen={setSelectedArticle} />
                    ))}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Dòng gợi ý dưới lưới mẫu — chỉ Bước 3 (Hình 4) */}
          {activeTab === 'templates' && kind === '3d' ? (
            <p className='text-muted-foreground flex shrink-0 items-center gap-1.5 border-t px-4 py-2.5 text-xs'>
              <Info className='size-3.5 shrink-0' />
              {t('cardHint')}
            </p>
          ) : null}
        </div>
      </section>

      <TemplateQuickView template={selectedTemplate} onClose={() => setSelectedTemplate(null)} />
      <ArticleDetailDialog article={selectedArticle} onClose={() => setSelectedArticle(null)} />
    </>
  )
})

/**
 * Mẫu thư viện ở màn chờ của dự toán đang lập, đúng loại của chặng đang chạy (2D khi chạy 2D, 3D khi chạy Dự toán và 3D).
 * Mẫu cùng loại công trình có nhãn riêng để khách biết chưa khớp đủ thông tin dự toán (BR-LIB-001 khoản 16).
 */
function MatchedTemplates({
  kind,
  waiting,
  selectedId,
  onOpen
}: {
  kind: HandbookTemplateKind
  waiting: { items: HandbookTemplate[]; totalCount: number; source: 'match' | 'sameType' | null; isPending: boolean }
  selectedId: string | null
  onOpen: (template: HandbookTemplate) => void
}) {
  const t = useTranslations('handbook.panel.matched')
  if (waiting.isPending) return <PanelSkeleton />
  const sameType = waiting.source === 'sameType'
  return (
    <div className='space-y-5'>
      <section className='space-y-3'>
        <h3 className='text-sm font-semibold'>
          {t(sameType ? (kind === '2d' ? 'sameType2d' : 'sameType3d') : kind === '2d' ? 'title2d' : 'title3d')}
          <span className='text-muted-foreground ml-1.5 font-normal'>{t('count', { count: waiting.totalCount })}</span>
        </h3>
        <div data-handbook-panel-grid className='grid grid-cols-2 gap-3 lg:grid-cols-3'>
          {waiting.items.map((template, index) => (
            <div
              key={template.id}
              data-panel-card
              style={{ '--panel-card-delay': `${index * 65}ms` } as React.CSSProperties}
            >
              <TemplateCard template={template} variant='panel' selected={selectedId === template.id} onOpen={onOpen} />
            </div>
          ))}
        </div>
      </section>
      <p className='text-muted-foreground flex items-center gap-1.5 text-xs'>
        <Info className='size-3.5 shrink-0' />
        {t(sameType ? 'sameTypeNote' : 'note')}
      </p>
    </div>
  )
}

function PanelSkeleton() {
  return (
    <div className='space-y-3'>
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className='h-28 w-full rounded-xl' />
      ))}
    </div>
  )
}
