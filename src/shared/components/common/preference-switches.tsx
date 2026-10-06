'use client'

import { Languages, Monitor, Moon, Sun, type LucideIcon } from 'lucide-react'
import { useSyncExternalStore, useTransition } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useTheme } from 'next-themes'

import { usePathname, useRouter } from '@/i18n/navigation'
import { LOCALES, type Locale } from '@/i18n/routing'
import { ToggleGroup, ToggleGroupItem } from '@/shared/components/ui/toggle-group'
import { cn } from '@/shared/lib/utils'

/** Stable no-op subscribe so `useSyncExternalStore` only distinguishes SSR vs client. */
const emptySubscribe = () => () => {}

/** Tạm ẩn chọn ngôn ngữ (mặc định tiếng Việt). Đổi thành `true` để bật lại. */
const SHOW_LANGUAGE_TOGGLE = false

/** Tạm ẩn chọn giao diện (khóa nền sáng — xem `theme-provider`). `true` để bật lại. */
const SHOW_THEME_TOGGLE = false

const THEME_MODES = ['light', 'dark', 'system'] as const
type ThemeMode = (typeof THEME_MODES)[number]
const THEME_ICON: Record<ThemeMode, LucideIcon> = { light: Sun, dark: Moon, system: Monitor }

const isThemeMode = (value: string | undefined): value is ThemeMode =>
  value === 'light' || value === 'dark' || value === 'system'

/**
 * Ngôn ngữ và giao diện dưới dạng hai dải chọn (segmented) — mỗi ô là một giá
 * trị, không phải công tắc bật/tắt: giao diện có ba chế độ (Sáng · Tối · Hệ
 * thống) nên bật/tắt không diễn tả được, và ngôn ngữ đọc rõ hơn khi thấy cả hai
 * lựa chọn cùng lúc.
 *
 * Nhúng vào dropdown tài khoản trên thanh công cụ: đây là tuỳ chọn cá nhân,
 * không phải mục điều hướng.
 */
export function PreferenceSwitches({ className }: { className?: string }) {
  const tTheme = useTranslations('theme')
  const tLanguage = useTranslations('language')

  const { theme, setTheme } = useTheme()
  const activeLocale = useLocale() as Locale
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  // Gate on hydration so SSR and first paint agree on which item is selected.
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  )
  const currentTheme: ThemeMode = mounted && isThemeMode(theme) ? theme : 'system'

  // Cả hai công tắc đang tạm ẩn → không hiện ô rỗng trong dropdown.
  const hasContent = SHOW_LANGUAGE_TOGGLE || SHOW_THEME_TOGGLE
  if (!hasContent) return null

  return (
    <div className={cn('space-y-3 px-2 py-2', className)}>
      {/* Toggle ngôn ngữ TẠM ẨN (mặc định tiếng Việt) — bật lại: đổi cờ thành true. */}
      {SHOW_LANGUAGE_TOGGLE && (
        <Field icon={<Languages className='size-3.5' />} label={tLanguage('label')}>
          <ToggleGroup
            type='single'
            value={activeLocale}
            disabled={isPending}
            onValueChange={(value) => {
              if (!value || value === activeLocale) return
              // `pathname` from next-intl navigation is already locale-agnostic.
              startTransition(() => router.replace(pathname, { locale: value as Locale }))
            }}
            className='bg-muted grid w-full grid-cols-2 gap-0.5 rounded-lg p-0.5'
          >
            {LOCALES.map((locale) => (
              <ToggleGroupItem key={locale} value={locale} className={segmentClasses}>
                {tLanguage(locale)}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Field>
      )}

      {/* Toggle giao diện TẠM ẨN (khóa nền sáng) — bật lại: đổi cờ thành true. */}
      {SHOW_THEME_TOGGLE && (
        <Field icon={<Sun className='size-3.5' />} label={tTheme('label')}>
          <ToggleGroup
            type='single'
            value={currentTheme}
            onValueChange={(value) => value && setTheme(value)}
            className='bg-muted grid w-full grid-cols-3 gap-0.5 rounded-lg p-0.5'
          >
            {THEME_MODES.map((mode) => {
              const Icon = THEME_ICON[mode]
              return (
                <ToggleGroupItem key={mode} value={mode} aria-label={tTheme(mode)} className={segmentClasses}>
                  <Icon className='size-3.5' />
                  <span className='truncate'>{tTheme(mode)}</span>
                </ToggleGroupItem>
              )
            })}
          </ToggleGroup>
        </Field>
      )}
    </div>
  )
}

/** Ô được chọn nổi lên như một thẻ trắng trên nền rãnh xám. */
const segmentClasses = cn(
  'h-8 min-w-0 gap-1.5 rounded-md px-2 text-xs font-medium',
  'data-[state=on]:bg-card data-[state=on]:text-foreground data-[state=on]:shadow-sm',
  'data-[state=off]:text-muted-foreground'
)

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className='space-y-1.5'>
      <p className='text-muted-foreground flex items-center gap-1.5 px-0.5 text-xs font-medium'>
        {icon}
        {label}
      </p>
      {children}
    </div>
  )
}
