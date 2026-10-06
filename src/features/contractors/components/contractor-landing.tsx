'use client'

import Image from 'next/image'
import {
  ArrowLeftRight,
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarClock,
  ClipboardCheck,
  Coins,
  ChevronRight,
  ClipboardList,
  FileLock2,
  Handshake,
  House,
  Lock,
  MapPin,
  Shield,
  ShieldCheck,
  Star,
  Users,
  X
} from 'lucide-react'
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react'
import { useLocale, useTranslations } from 'next-intl'
import { useEffect, useRef, useState } from 'react'

import { Link, useRouter } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { useAuth, useAuthDialogStore } from '@/shared/auth'
import { isContractorEligible, useCmsCollection, useCmsDocument, useSiteImage } from '@/shared/cms'
import { revealContainerVariants, revealEase, revealItemVariants } from '@/shared/components/common'
import { Alert, AlertDescription, Button, Skeleton } from '@/shared/components/ui'
import { env } from '@/shared/config/env'
import {
  CONTRACTOR_PREVIEW_ID,
  contractorFirmRoute,
  contractorMatchesRoute,
  contractorPreviewRoute
} from '@/shared/constants/routes'
import { useDwellNudge } from '@/shared/hooks'
import { cn } from '@/shared/lib/utils'
import { formatNumber } from '@/shared/utils'
import {
  EXPERIENCE_LEVELS,
  LANDING_SORTS,
  MATCHES_PINNED_CONTRACTOR_KEY,
  PROJECT_SCALES,
  RATING_LEVELS,
  SURVEY_WINDOWS
} from '../constants/contractors.constants'
import { useBriefs, useCreateBrief } from '../hooks/use-brief'
import { useContractorDirectory, useContractorFilterOptions } from '../hooks/use-contractors'
import { useSelectedProject } from '../hooks/use-selected-project'
import { filterContractors, type ContractorCriteria } from '../services/contractor-list.service'
import { resolveSelectedProject } from '../services/project-selection.service'
import type { Contractor, ContractorSort, SearchRadiusKm } from '../types/contractor.types'
import { ContractorLogo } from './contractor-logo'
import { PartnerRegistrationDialog } from './partner-registration-dialog'
import { ProjectPickerDialog } from './project-picker-dialog'
import { useProjectPickerStore } from '../store/project-picker.store'

/**
 * Bề ngang phần nội dung của S09.
 *
 * Đo trên Hình S09 (ảnh gốc 450px): nội dung chạy từ x=13 đến x=437, tức
 * 424/450 = 94% bề ngang trang — gần y hệt Hình S08 (93.5%). `max-w-6xl` của
 * bản trước chỉ cho 1088px nội dung, hẹp hơn ảnh gần 25% nên mọi khối bên trong
 * đều bị bóp lại.
 *
 * Trần chốt ở **76rem (1216px)** chứ không phải 1480px: hero đã được thu về khổ
 * này theo yêu cầu của khách, nên các khối bên dưới phải cùng khổ thì cả trang
 * mới thẳng lề và cùng một cỡ. Mọi số đo bên trong đều là PHẦN TRĂM của bề ngang
 * này, nên đổi trần không làm sai tỉ lệ nào — chỉ thu nhỏ đều toàn bộ.
 */
const PAGE_CONTAINER = 'mx-auto w-full max-w-[90rem] px-4 lg:px-8'

/**
 * Id danh sách xếp hạng mà `useDwellNudge` theo dõi.
 *
 * Mảng id phải là hằng số NGOÀI component: hook đặt nó vào deps của effect, nên
 * một mảng viết thẳng trong render là mảng mới ở mỗi lần render → effect chạy
 * lại và bộ đếm 4,5 giây bị đặt về 0 mỗi khi rê chuột đổi thẻ nổi bật hay bấm
 * đổi tiêu chí lọc.
 */
const RANKED_LIST_ID = 'contractor-ranked-list'
/** Danh sách xếp hạng chỉ hiện tối đa chừng này nhà thầu khớp bộ lọc. */
const RANKED_LIMIT = 3
const DWELL_SECTION_IDS = [RANKED_LIST_ID] as const

/** Ba thẻ của khối "An toàn & minh bạch" (Hình S09), theo đúng thứ tự trong ảnh. */
const SAFETY_CARDS = [{ key: 'privacy' }, { key: 'record' }, { key: 'review' }] as const

/**
 * Hình minh hoạ của một thẻ "An toàn & minh bạch".
 *
 * Ảnh vẽ ba hình mà lucide không có sẵn glyph tương đương, nên ghép lại:
 * - `privacy`: cái KHIÊN lồng Ổ KHOÁ → chồng `Lock` vào giữa `Shield`;
 * - `record`: tài liệu có ổ khoá → `FileLock2` khớp sẵn;
 * - `review`: NĂM NGÔI SAO cam nằm trên một NHÓM NGƯỜI → xếp hàng sao rồi tới
 *   `Users`. Dùng mỗi `Star` như bản trước thì mất hẳn phần "khách hàng thật",
 *   mà đó mới là ý của thẻ.
 *
 * Cỡ icon đo được là 24.4% bề ngang thẻ. Chữ trong ảnh demo lớn hơn khổ thật
 * khoảng 1.4 lần (xem ghi chú ở hero), nên bê nguyên 24.4% thì icon át hết chữ;
 * dùng 17.5% bề ngang thẻ = 24.4% × 0.72, đúng hệ số đã áp cho hero.
 *
 * Viết thành `w-[20.6%]` chứ không phải `w-[17.5%]`: phần trăm ở đây tính theo
 * HỘP NỘI DUNG của thẻ (đã trừ lề 7.4% mỗi bên), nên 17.5% bề ngang thẻ tương
 * đương 20.6% hộp nội dung.
 */
function SafetyIcon({ kind }: { kind: (typeof SAFETY_CARDS)[number]['key'] }) {
  const reduceMotion = useReducedMotion()
  return (
    // Ô vuông có kích thước XÁC ĐỊNH là bắt buộc: icon lucide mang sẵn thuộc
    // tính `height="24"`, nên nếu chỉ đặt `w-[…%]` thì bề ngang co giãn còn
    // chiều cao đứng nguyên 24px và hình bị dẹt. Cho ô bọc `aspect-square` rồi
    // để icon bên trong đo bằng `size-*` (đặt cả hai chiều) thì mới đúng.
    <motion.span
      aria-hidden
      // Mục 5: icon vẽ nét sau khi thẻ đứng yên — `strokeDasharray`/`-offset`
      // là thuộc tính SVG được KẾ THỪA, đặt trên span cha thì path con nhận
      // luôn mà không cần biết hình dạng cụ thể (giống kỹ thuật ở "4 cam kết").
      initial={reduceMotion ? false : { strokeDashoffset: 90 }}
      whileInView={{ strokeDashoffset: 0 }}
      viewport={{ once: true, amount: 0.6 }}
      transition={{ duration: 0.7, delay: 0.4, ease: revealEase }}
      style={{ strokeDasharray: 90 }}
      className='relative flex aspect-square w-[20.6%] min-w-12 shrink-0 items-center justify-center'
    >
      {kind === 'record' ? (
        <FileLock2
          className='text-primary transition-colors duration-300 group-hover:text-brand-orange size-full'
          strokeWidth={1.25}
        />
      ) : null}

      {kind === 'review' ? (
        <span className='flex size-full flex-col items-center justify-center gap-1'>
          {/* Cỡ sao để CỐ ĐỊNH chứ không theo %: hàng sao không có chiều cao xác
              định nên `size-[14%]` không phân giải được chiều cao và sao biến
              mất. Mục 6: mỗi sao phóng vào với nảy nhẹ, lần lượt, sau khi thẻ hiện. */}
          <span className='flex gap-0.5'>
            {[0, 1, 2, 3, 4].map((star) => (
              <motion.span
                key={star}
                initial={reduceMotion ? false : { opacity: 0, scale: 0.3 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, amount: 0.6 }}
                transition={{ type: 'spring', stiffness: 380, damping: 14, delay: 0.5 + star * 0.08 }}
              >
                <Star className='text-warning size-3 fill-current' />
              </motion.span>
            ))}
          </span>
          <Users
            className='text-primary transition-colors duration-300 group-hover:text-brand-orange size-[72%]'
            strokeWidth={1.25}
          />
        </span>
      ) : null}

      {kind === 'privacy' ? (
        <>
          <Shield
            className='text-primary transition-colors duration-300 group-hover:text-brand-orange size-full'
            strokeWidth={1.25}
          />
          {/* Mục 5 (★ thẻ 1): quai khoá hạ xuống một nhịp khi rê thẻ — gợi cảm
              giác "đóng" lại. `group` nằm ở thẻ <li> bao ngoài. */}
          <Lock
            className='text-primary group-hover:text-brand-orange absolute size-[32%] transition-[transform,color] duration-300 group-hover:translate-y-[15%]'
            strokeWidth={1.75}
          />
        </>
      ) : null}
    </motion.span>
  )
}

/** Một dòng trong khối "Tìm đúng người theo đúng tiêu chí". */
interface CriterionItem {
  key: 'area' | 'type' | 'scale' | 'experience' | 'rating' | 'schedule'
  icon: typeof MapPin
}

/** Một lựa chọn của tiêu chí: `value` để lọc, `label` để hiển thị. */
interface CriterionOption {
  value: string
  label: string
}

/**
 * Sáu tiêu chí của khối "Tìm đúng người theo đúng tiêu chí" (mục 5).
 *
 * Icon đọc từ ảnh phóng 5.8× của Hình S09: ghim bản đồ · ngôi nhà · bảng kê ·
 * toà nhà · ngôi sao · lịch+đồng hồ. Bản trước dùng mũ bảo hộ cho "Loại công
 * trình" và thước cho "Quy mô công trình" — không có cái nào trong ảnh.
 */
const CRITERIA_ITEMS: readonly CriterionItem[] = [
  { key: 'area', icon: MapPin },
  { key: 'type', icon: House },
  { key: 'scale', icon: ClipboardList },
  { key: 'experience', icon: Building2 },
  { key: 'rating', icon: Star },
  { key: 'schedule', icon: CalendarClock }
] as const

/**
 * Dải logo nhà thầu chạy liên tục một chiều như dải thương hiệu ở trang chủ
 * (`animate-marquee`): danh sách được nhân đôi rồi trượt đúng nửa bề ngang nên
 * vòng lặp liền mạch. Rê chuột / chạm thì dừng. Ít nhà thầu thì lặp nửa đầu cho
 * đủ dài hơn khung, nếu không sẽ hở ở điểm nối.
 */
function ContractorLogoMarquee({ contractors }: { contractors: Contractor[] }) {
  const [paused, setPaused] = useState(false)
  // Lặp NGUYÊN cả danh sách (không cắt lẻ): cắt lẻ làm phần đệm cuối trùng logo đầu nên hai logo giống nhau đứng cạnh nhau ở điểm nối.
  const half = Array.from({ length: Math.ceil(10 / contractors.length) }, () => contractors).flat()
  const items = [...half, ...half]

  return (
    <div
      className='mt-2 overflow-hidden border-t pt-4'
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
    >
      <ul className={cn('animate-marquee flex w-max items-center gap-6', paused && 'paused')}>
        {items.map((contractor, index) => (
          <li
            key={`${contractor.id}-${index}`}
            title={contractor.name}
            aria-hidden={index >= half.length || undefined}
            className='size-24 shrink-0'
          >
            <ContractorLogo contractor={contractor} className='size-full' />
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * Landing "Tìm nhà thầu" (S09) — trang công khai, khách chưa đăng nhập cũng xem
 * được.
 *
 * Nội dung theo bản mô tả: hero → 4 cam kết → tiêu chí ghép → danh sách xếp hạng
 * 4 tab → so sánh minh bạch → an toàn & minh bạch → ranh giới dịch vụ → FAQ →
 * CTA → dải đối tác.
 *
 * Hai chỗ bám sát QUY TẮC chứ không bám ảnh demo:
 * - R1: câu trả lời FAQ nói rõ tối đa 3 nhà thầu, không phải "gửi càng nhiều
 *   càng dễ so sánh".
 * - R2/R3: khối "So sánh minh bạch" chỉ đối chiếu NĂNG LỰC, và có một dòng dẫn
 *   nói thẳng báo giá đến từ nhà thầu sau khảo sát, không nằm trên web.
 */

export function ContractorLanding() {
  const t = useTranslations('contractors.landing')
  const tRankTabs = useTranslations('contractors.landing.ranking.tabs')
  const tCommon = useTranslations('contractors.common')
  const tScale = useTranslations('contractors.scale')
  const tGlobal = useTranslations('common')
  const tPicker = useTranslations('contractors.picker')

  const locale = useLocale() as Locale
  const reduceMotion = useReducedMotion()

  const { isAuthenticated } = useAuth()
  const openAuthDialog = useAuthDialogStore((s) => s.open)
  const createBrief = useCreateBrief()
  const router = useRouter()

  const [sort, setSort] = useState<ContractorSort>('rating')

  // Banner hero theo sheet góp ý BuildX; admin vẫn thay được ở màn "Hình ảnh site".
  const mapImage = useSiteImage('map.contractors')
  const mock = env.NEXT_PUBLIC_USE_MOCK_API
  // CMS chỉ là nguồn nhà thầu cho chế độ mock. API thật quyết định hồ sơ công khai.
  const matching = useCmsDocument('contractorMatching')
  const today = new Date().toISOString().slice(0, 10)
  const mockDirectory = useCmsCollection('contractors').filter((contractor) =>
    isContractorEligible(contractor, matching, today)
  )
  const rankingSectionRef = useRef<HTMLElement>(null)
  // Tới dải CTA cuối trang thì thanh đáy tự ẩn — hai lời mời giống nhau chồng lên nhau.
  const ctaSectionRef = useRef<HTMLElement>(null)
  const ctaInView = useInView(ctaSectionRef, { amount: 0.2 })
  const [leavingForBrief, setLeavingForBrief] = useState(false)

  // Thẻ "phù hợp nhất" ở hero chỉ MỞ KHOÁ số liệu khi tài khoản đã có ít nhất
  // một hồ sơ dự án — chưa có thì SAVICO không có gì để ghép, số liệu thật sẽ
  // gây hiểu lầm (mục 3).
  const briefsQuery = useBriefs(isAuthenticated)
  const { data: briefs } = briefsQuery
  const hasBrief = isAuthenticated && Boolean(briefs?.length)
  // Ưu tiên dự án người dùng đã chọn; khi chưa có thì dùng hồ sơ đủ thông tin mới nhất.
  const { userId, selectedProject, isReady, isError: selectionError, refetch: refetchSelection } = useSelectedProject()
  const briefsByNewest = hasBrief ? [...(briefs ?? [])].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)) : []
  const savedBrief = userId ? resolveSelectedProject(briefsByNewest, selectedProject, userId) : undefined
  const currentBrief = isReady ? (savedBrief ?? briefsByNewest[0]) : undefined
  const openPicker = useProjectPickerStore((s) => s.openPicker)

  /**
   * Danh sách hiển thị tối đa ba nhà thầu khớp bộ lọc, xếp theo tab đang bật.
   * Chế độ thật gửi loại/bán kính/số tầng/số dự án tương tự tới API.
   * Mỗi mục chỉ chọn được một lựa chọn; bấm lại lựa chọn đang chọn để bỏ.
   * `criterionSelections` lưu GIÁ TRỊ của lựa chọn (không phải nhãn hiển thị) để
   * lọc không phụ thuộc bản dịch.
   */
  const [openCriterion, setOpenCriterion] = useState<CriterionItem['key'] | null>(null)
  const radiusOptions = matching.radiusOptions
  const widestRadius = radiusOptions.at(-1) ?? 50
  const [radiusChoice, setRadiusKm] = useState<SearchRadiusKm | null>(null)
  const [criterionSelections, setCriterionSelections] = useState<Partial<Record<CriterionItem['key'], string>>>({})
  const filterOptions = useContractorFilterOptions()
  const siteId = isAuthenticated ? currentBrief?.constructionSiteId : undefined
  const canFilterRadius = mock || Boolean(siteId)
  const radiusApplied = canFilterRadius && radiusChoice !== null
  const selectedScale = PROJECT_SCALES.find((key) => key === criterionSelections.scale)
  // FloorCount tính cả trệt, cùng cách lưu trên hồ sơ và dự án nhà thầu.
  const floorCount =
    selectedScale === undefined ? undefined : selectedScale === 'ground' ? 1 : Number(selectedScale.split('+')[1]) + 1
  const experience = criterionSelections.experience
  const liveDirectory = useContractorDirectory({
    ...(criterionSelections.type ? { buildingTypeIds: [criterionSelections.type] } : {}),
    ...(floorCount !== undefined ? { floorCount } : {}),
    ...(experience === 'junior' ? { minSimilarProjects: 0, maxSimilarProjects: 4 } : {}),
    ...(experience === 'mid' ? { minSimilarProjects: 5, maxSimilarProjects: 15 } : {}),
    ...(experience === 'senior' ? { minSimilarProjects: 16 } : {}),
    ...(siteId && radiusApplied ? { constructionSiteId: siteId, radiusKm: radiusChoice } : {})
  })
  const directory = mock ? mockDirectory : liveDirectory.isError ? [] : (liveDirectory.data ?? [])
  // Dải logo bên dưới là dải thương hiệu của MỌI nhà thầu, không đổi theo bộ lọc (bộ lọc chỉ tác động lên danh sách).
  // Không lọc thì cùng khoá với `liveDirectory` nên không tốn thêm lượt gọi.
  const allDirectory = useContractorDirectory()
  const brandContractors = mock ? mockDirectory : (allDirectory.data ?? [])
  const directoryPending = !mock && liveDirectory.isPending
  const directoryError = !mock && liveDirectory.isError

  const cmsBuildingTypes = useCmsCollection('buildingTypes')
  const criterionOptions: Record<CriterionItem['key'], CriterionOption[]> = {
    area: radiusOptions.map((km) => ({ value: String(km), label: tCommon('distanceShort', { km }) })),
    // Cùng danh mục "Loại công trình" với Bước 1 của luồng thiết kế/hồ sơ, nên
    // admin bật/tắt hay đổi tên ở một chỗ là đổi cả hai.
    type: mock
      ? [...cmsBuildingTypes]
          .filter((option) => option.status === 'active')
          .sort((a, b) => a.order - b.order)
          .map((option) => ({ value: option.id, label: option.label }))
      : (filterOptions.data?.buildingTypes ?? []).map((option) => ({ value: option.id, label: option.name })),
    scale: PROJECT_SCALES.map((key) => ({ value: key, label: tScale(key) })),
    experience: EXPERIENCE_LEVELS.map((key) => ({ value: key, label: t(`criteria.experienceOptions.${key}`) })),
    rating: RATING_LEVELS.map((key) => ({ value: key, label: t(`criteria.ratingOptions.${key}`) })),
    // Thời gian khảo sát của nhà thầu (24h / 48h / 72h / hơn 72h), không phải mốc khởi công của dự án.
    schedule: SURVEY_WINDOWS.map((key) => ({ value: key, label: t(`criteria.surveyOptions.${key}`) }))
  }

  const criteria: ContractorCriteria = {
    buildingTypeId: criterionSelections.type,
    scale: mock ? PROJECT_SCALES.find((key) => key === criterionSelections.scale) : undefined,
    experience: mock ? EXPERIENCE_LEVELS.find((key) => key === criterionSelections.experience) : undefined,
    rating: RATING_LEVELS.find((key) => key === criterionSelections.rating),
    surveyWindow: SURVEY_WINDOWS.find((key) => key === criterionSelections.schedule)
  }

  const filtered = filterContractors(
    directory,
    {
      radiusKm: mock ? (radiusChoice ?? widestRadius) : Number.POSITIVE_INFINITY,
      sort: sort === 'distance' && !radiusApplied && !mock ? null : sort
    },
    criteria
  )
  const ranked = filtered.slice(0, RANKED_LIMIT)

  /**
   * Đứng ở danh sách xếp hạng lâu không bấm gì → thanh "Tạo hồ sơ dự án - miễn
   * phí" trượt lên dính đáy màn (mục 7).
   */
  const { nudgeSectionId, dismiss: dismissNudge } = useDwellNudge({
    sectionIds: DWELL_SECTION_IDS,
    sessionKey: 'savico.contractor-list-nudge'
  })
  const showStickyNudge = nudgeSectionId === RANKED_LIST_ID

  /** "Tạo hồ sơ" cần tài khoản: chưa đăng nhập thì mở popup đăng nhập trước. */
  const createAndOpenBrief = () => {
    setLeavingForBrief(true)
    window.setTimeout(() => {
      createBrief.mutate(undefined, { onError: () => setLeavingForBrief(false) })
    }, 160)
  }

  const startBrief = () => {
    if (!isAuthenticated) {
      // Đăng nhập xong thì chạy tiếp đúng việc người dùng đang định làm, không
      // bắt họ bấm lại "Tạo hồ sơ" lần nữa.
      openAuthDialog('login', createAndOpenBrief)
      return
    }
    createAndOpenBrief()
  }

  const openContractorDetail = (contractorId: string) => {
    dismissNudge()
    router.push(contractorFirmRoute(CONTRACTOR_PREVIEW_ID, contractorId))
  }

  const chooseContractor = (contractorId: string) => {
    dismissNudge()
    const brief = currentBrief
    if (!brief) {
      startBrief()
      return
    }
    window.sessionStorage.setItem(MATCHES_PINNED_CONTRACTOR_KEY, contractorId)
    router.push(contractorMatchesRoute(brief.id))
  }

  /** FAQ (mục 10): loé dòng khi mở trang bằng liên kết #faq-N. */
  const [faqFlashIndex, setFaqFlashIndex] = useState<number | null>(null)
  const [partnerDialogOpen, setPartnerDialogOpen] = useState(false)
  const flashFaqRow = (index: number) => {
    setFaqFlashIndex(index)
    window.setTimeout(() => setFaqFlashIndex((current) => (current === index ? null : current)), 900)
  }
  useEffect(() => {
    const match = /^#faq-(\d)$/.exec(window.location.hash)
    if (!match) return
    const index = Number(match[1])
    const row = document.getElementById(`faq-${index}`)
    if (!row) return
    window.setTimeout(() => {
      row.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' })
      flashFaqRow(index)
    }, 300)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ chạy một lần khi trang tải với #faq-N trên URL.
  }, [])

  // Nhịp dọc đo trên Hình S09: các khoảng hở giữa hai khối liền nhau chỉ 12–14px
  // trên ảnh 450px = 41–48px ở khổ thật, còn `space-y-16` (64px) của bản trước
  // đẩy trang dài ra và làm mỗi khối trôi ra xa nhau hơn ảnh.
  return (
    <div className='space-y-5 sm:space-y-11 pb-5'>
      {/* Hero — ảnh phủ toàn banner, lớp blur bên trái tan dần trên ảnh. */}
      <section data-contractor-hero className='relative isolate overflow-hidden'>
        {/* Không chia cột ảnh: chỉ mask lớp blur, giữ ảnh gốc liền mạch. */}
        <div aria-hidden className='absolute inset-0 -z-10'>
          <Image
            src={mapImage}
            alt=''
            fill
            priority
            sizes='100vw'
            className='object-cover object-right lg:object-[right_30%]'
          />
          <div className='absolute inset-0 hidden lg:left-[15%] lg:block [mask-image:linear-gradient(to_right,transparent,black_30%)]'>
            <Image src={mapImage} alt='' fill priority sizes='85vw' className='object-cover object-[right_40%]' />
          </div>
          <div
            data-contractor-hero-blur
            className='absolute inset-0 backdrop-blur-[8px] [mask-image:linear-gradient(to_right,black_20%,transparent_65%)] lg:[mask-image:linear-gradient(to_right,black_12%,transparent_45%)]'
          />
          <div className='from-background/95 via-background/85 absolute inset-0 bg-gradient-to-r from-15% via-45% to-transparent to-85% lg:from-background/90 lg:from-0% lg:via-background/70 lg:via-30% lg:to-50%' />
        </div>
        <div className={cn(PAGE_CONTAINER, 'py-5 lg:py-24')}>
          <div className='max-w-[38rem]'>
            {/* Cỡ chữ hero.
              Đo trên Hình S09 rồi quy theo % bề ngang phần nội dung (424px) →
              khổ thật ~1447px cho ra: tiêu đề 64px, câu dẫn 26px, nút cao 80px.
              Nhưng ảnh demo được AI vẽ ở khổ trang hẹp hơn (bám các mốc khác
              trong ảnh thì hệ số quy đổi rơi vào khoảng 2.0 chứ không phải 3.4),
              nên bê nguyên số đó lên khổ 1440 thì chữ TO quá — khách xem bản
              dựng đã yêu cầu hạ xuống. Giữ đúng NHỊP của ảnh (tỉ lệ giữa tiêu
              đề · câu dẫn · nút và các khoảng hở) rồi nhân đều 0.72 — khách
              xem bản dựng đã yêu cầu thu nhỏ hai lần, đây là nấc thứ hai:
              - tiêu đề 46px, bước dòng 1.14;
              - câu dẫn 18px, bước dòng 1.65;
              - tiêu đề → câu dẫn 26px; câu dẫn → nút 38px;
              - nút cao 56px, rộng tối thiểu 200px, cách nhau 32px.
              Bản đầu tiên (`text-[2.75rem]`/`text-lg`/`h-14`) thì ngược lại —
              khối chữ chỉ cao 16% bề ngang nội dung trong khi ảnh là 30%. */}
            <motion.div
              variants={revealContainerVariants}
              initial='hidden'
              animate={leavingForBrief ? { opacity: 0, y: -24 } : 'show'}
              transition={{ duration: 0.28, ease: revealEase }}
            >
              <motion.h1
                className='text-primary-strong text-[clamp(1.05rem,5.4vw,1.875rem)] leading-[1.15] font-bold tracking-tight text-balance sm:text-4xl lg:text-[2.2rem]'
                aria-label={t('hero.title')}
              >
                <motion.span variants={revealItemVariants} className='block'>
                  {t('hero.titleLine1')}
                </motion.span>
                <motion.span variants={revealItemVariants} className='block'>
                  {t('hero.titleLine2')}
                </motion.span>
              </motion.h1>
              {/* Hình S09: câu dẫn ngắt đúng BA dòng và rộng bằng ~88% cột chữ, hẹp
                hơn tiêu đề một chút. Cỡ chữ ở đây đã hạ theo yêu cầu nên phải
                chặn bề ngang mới ra đúng ba dòng như ảnh. */}
              <motion.p
                variants={revealItemVariants}
                className='text-muted-foreground mt-4 max-w-[30rem] text-base text-pretty sm:mt-[26px]'
              >
                {t('hero.subtitle')}
              </motion.p>
              {/* Hình S09: hai nút cùng cỡ, nút phụ nền trắng viền xanh, và nút
                chính KHÔNG có mũi tên. */}
              <motion.div
                variants={revealItemVariants}
                className='mt-4 flex flex-col gap-3 sm:mt-[38px] sm:flex-row sm:flex-wrap'
              >
                <Button
                  className='h-11 rounded-full px-8 text-base hover:-translate-y-0.5 active:translate-y-0'
                  onClick={startBrief}
                  disabled={createBrief.isPending}
                >
                  {t('hero.createBrief')}
                </Button>
                <Button
                  variant='outline'
                  className='border-primary text-primary-strong bg-card/85 h-11 rounded-full px-8 text-base hover:-translate-y-0.5 active:translate-y-0'
                  asChild
                >
                  {/* Dẫn sang trang danh sách nhà thầu đầy đủ (góp ý BuildX); 3 nhà thầu bên
                    dưới trang này chỉ là phần xem trước. */}
                  <Link href={contractorPreviewRoute()}>{t('hero.viewContractors')}</Link>
                </Button>
              </motion.div>
              {selectionError ? (
                <div role='alert' className='mt-4 space-y-2 text-sm'>
                  <p>{tPicker('loadSelectionError')}</p>
                  <Button variant='outline' onClick={() => void refetchSelection()}>
                    {tPicker('retrySelection')}
                  </Button>
                </div>
              ) : null}
              {currentBrief ? (
                <motion.button
                  variants={revealItemVariants}
                  type='button'
                  onClick={openPicker}
                  className='text-primary-strong mt-4 inline-flex items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline'
                >
                  <ArrowLeftRight className='size-4 max-sm:size-5' />
                  {t('switchBrief')}
                </motion.button>
              ) : null}
            </motion.div>
          </div>
        </div>
      </section>

      {/* 4 cam kết — Hình S09, dải x=13…437, y=204…249.

          Ba thứ bản trước làm khác ảnh:
          - ICON: ảnh vẽ ① chồng đồng xu (miễn phí), ② khiên + tick (đã xác
            minh), ③ khiên + tài liệu có tick (so sánh minh bạch), ④ khiên + ổ
            khoá (thông tin được bảo vệ). Bản trước là hộp quà / cái cân / tệp
            khoá — sai nghĩa lẫn hình. Lucide không có "khiên lồng ổ khoá" nên
            ④ dùng ổ khoá trần, giữ đúng ý còn hình thì gần nhất có được.
          - KHÔNG có ô nền sau icon: ảnh vẽ icon nét trần màu xanh, bản trước
            bọc trong ô vuông `bg-accent` 40px.
          - Mỗi mục CANH GIỮA ô của nó: đo bốn cụm chữ ở x=27…103, 133…210,
            241…308, 331…428 — chia 424px thành 4 cột đều 106px thì cả bốn cụm
            đều nằm giữa cột của mình, không phải canh trái. */}
      <motion.section
        className={PAGE_CONTAINER}
        initial={reduceMotion ? false : { opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.5, ease: revealEase }}
      >
        <motion.ul
          variants={revealContainerVariants}
          initial={reduceMotion ? false : 'hidden'}
          whileInView='show'
          viewport={{ once: true, amount: 0.4 }}
          className='bg-card grid grid-cols-1 overflow-hidden rounded-2xl border max-sm:shadow-lg sm:grid-cols-2 sm:gap-4 sm:p-6 lg:grid-cols-4'
        >
          {(
            [
              { key: 'free', icon: Coins },
              { key: 'verified', icon: ShieldCheck },
              { key: 'transparent', icon: ClipboardCheck },
              { key: 'privacy', icon: Lock }
            ] as const
          ).map((item) => (
            <motion.li
              key={item.key}
              variants={revealItemVariants}
              className='group flex items-center gap-3 max-sm:border-t max-sm:px-3.5 max-sm:py-3.5 max-sm:first:border-t-0 sm:justify-center'
            >
              <motion.span
                aria-hidden
                initial={reduceMotion ? false : { strokeDashoffset: 64 }}
                whileInView={{ strokeDashoffset: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.75, delay: 0.12, ease: revealEase }}
                style={{ strokeDasharray: 64 }}
                className='text-primary shrink-0 transition-[transform,color] duration-200 group-hover:-translate-y-0.5 group-hover:text-brand-orange'
              >
                <item.icon className='size-5 sm:size-7' strokeWidth={1.5} />
              </motion.span>
              <span className='text-sm font-medium text-pretty'>{t(`promises.${item.key}`)}</span>
            </motion.li>
          ))}
        </motion.ul>
      </motion.section>

      {/* Tiêu chí + danh sách xếp hạng.

          Hình S09, đo trên phần nội dung 424px: cột tiêu chí 13…148 (31.8%),
          khe 12px (2.8%), khung danh sách 160…436 (65.3%). Bản trước để cột
          trái 300px cứng (20% trên khổ 1480) nên tiêu đề khối bị gãy hai dòng
          còn khung phải thì rộng quá. */}
      <motion.section
        ref={rankingSectionRef}
        className={cn(PAGE_CONTAINER, 'scroll-mt-24')}
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.12 }}
        transition={{ duration: 0.45, ease: revealEase }}
      >
        <div className='grid gap-6 lg:grid-cols-[31.8%_minmax(0,1fr)] lg:gap-x-[2.8%]'>
          <div>
            <h2 className='text-foreground text-[clamp(1.05rem,5.7vw,1.6rem)] font-bold tracking-tight whitespace-nowrap sm:text-2xl sm:tracking-wide sm:uppercase lg:text-[clamp(0.95rem,1.4vw,1.5rem)]'>
              {t('criteria.title')}
            </h2>
            <ul className='mt-4 space-y-2'>
              {CRITERIA_ITEMS.map((item) => {
                const open = openCriterion === item.key
                const options = criterionOptions[item.key]
                const selectedValue =
                  item.key === 'area' && !canFilterRadius ? undefined : criterionSelections[item.key]
                const selected = options.find((option) => option.value === selectedValue)?.label
                const catalogCriterion = !mock && item.key === 'type'
                return (
                  // Hình S09: mỗi ô cao 20/135 = 14.8% bề ngang cột tiêu chí,
                  // tức thoáng hơn hẳn `py-3` của bản trước.
                  <li key={item.key} className='bg-card overflow-hidden rounded-xl border'>
                    <button
                      type='button'
                      onClick={() => setOpenCriterion(open ? null : item.key)}
                      aria-expanded={open}
                      className='flex w-full items-start gap-3 px-4 py-4 text-left'
                    >
                      <item.icon className='text-primary mt-0.5 size-5 shrink-0' strokeWidth={1.5} />
                      {/* Hình S09: nhãn tiêu chí màu XANH thương hiệu, chỉ dòng
                          gợi ý bên dưới mới là chữ mờ. */}
                      <span className='text-primary-strong min-w-0 flex-1 text-sm font-medium'>
                        <span className='flex items-center gap-2'>
                          {t(`criteria.${item.key}`)}
                          {/* Mỗi bộ lọc có bộ đếm riêng. Key không phụ thuộc option để đổi
                              lựa chọn trong cùng bộ lọc không phát lại hiệu ứng phóng. */}
                          <AnimatePresence initial={false}>
                            {selected ? (
                              <motion.span
                                key={`criterion-count-${item.key}`}
                                aria-hidden
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0, opacity: 0 }}
                                transition={{ type: 'spring', bounce: 0.6, duration: 0.4 }}
                                className='bg-primary text-primary-foreground flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-bold'
                              >
                                1
                              </motion.span>
                            ) : null}
                          </AnimatePresence>
                        </span>
                        {/* Dòng tóm tắt lựa chọn — hiện dần dưới tên mục (mục 5). */}
                        <AnimatePresence>
                          {selected ? (
                            <motion.span
                              key={selected}
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className='text-muted-foreground block overflow-hidden text-xs font-normal'
                            >
                              {selected}
                            </motion.span>
                          ) : null}
                        </AnimatePresence>
                      </span>
                      <motion.span
                        animate={{ rotate: open ? 90 : 0 }}
                        transition={{ duration: 0.2 }}
                        className='mt-0.5 shrink-0'
                      >
                        <ChevronRight aria-hidden className='text-muted-foreground size-4' />
                      </motion.span>
                    </button>

                    {/* Mở rộng tại chỗ — mục khác đang mở tự thu lại (chỉ một
                        `openCriterion` cho cả danh sách) (mục 5). Chọn một lựa
                        chọn KHÔNG đóng mục: khách còn đổi lựa chọn khác hoặc
                        bấm lại để bỏ, và thấy danh sách bên phải đổi ngay. */}
                    <AnimatePresence initial={false}>
                      {open ? (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: revealEase }}
                          className='overflow-hidden'
                        >
                          <div className='flex flex-wrap gap-2 px-4 pb-4'>
                            {catalogCriterion && filterOptions.isPending ? <Skeleton className='h-8 w-full' /> : null}
                            {catalogCriterion && filterOptions.isError ? (
                              <Alert variant='destructive'>
                                <AlertDescription>{t('criteria.loadError')}</AlertDescription>
                                <Button size='sm' variant='outline' onClick={() => void filterOptions.refetch()}>
                                  {t('ranking.retry')}
                                </Button>
                              </Alert>
                            ) : null}
                            {options.map((option) => {
                              const isSelected = option.value === selectedValue
                              const disabled = item.key === 'area' && !canFilterRadius
                              return (
                                <button
                                  key={option.value}
                                  type='button'
                                  disabled={disabled}
                                  aria-pressed={isSelected}
                                  onClick={() => {
                                    setCriterionSelections((current) => {
                                      if (!isSelected) return { ...current, [item.key]: option.value }

                                      const next = { ...current }
                                      delete next[item.key]
                                      return next
                                    })
                                    if (item.key === 'area') {
                                      if (isSelected) {
                                        setRadiusKm(null)
                                      } else {
                                        const km = radiusOptions.find((value) => String(value) === option.value)
                                        if (km) setRadiusKm(km)
                                      }
                                    }
                                  }}
                                  className={cn(
                                    'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                                    isSelected
                                      ? 'border-primary bg-accent text-primary-strong'
                                      : 'hover:border-primary/40'
                                  )}
                                >
                                  {option.label}
                                </button>
                              )
                            })}
                          </div>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </li>
                )
              })}
            </ul>
          </div>

          <div className='bg-card relative min-w-0 self-start overflow-hidden rounded-2xl border p-5'>
            {/* Hình S09: KHÔNG có tiêu đề "Nhà thầu tiêu biểu" — hàng tab nằm
                ngay mép trên khung. Và bốn tab TRẢI ĐỀU hết bề ngang khung
                (đo: bốn cụm chữ ở 175…212, 238…262, 287…333, 359…409 — khoảng
                hở giữa chúng đều ~26px dù chữ dài ngắn khác nhau), không phải
                dồn về bên trái. */}
            <div className='flex flex-wrap justify-between gap-x-6 gap-y-2 border-b'>
              {LANDING_SORTS.map((key) => (
                <button
                  key={key}
                  type='button'
                  onClick={() => setSort(key)}
                  aria-pressed={key === sort}
                  className={cn(
                    'relative -mb-px border-b-2 border-transparent pb-2.5 text-sm font-medium transition-colors',
                    key === sort ? 'text-primary-strong' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {tRankTabs(key)}
                  {/* Gạch chân trượt sang tab mới (mục 6) — cùng vị trí và màu
                      của `border-primary` ở trên, chỉ chuyển sang overlay dùng
                      chung `layoutId` để trượt được giữa các tab. */}
                  {key === sort ? (
                    <motion.span
                      layoutId='sort-tab-underline'
                      transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
                      className='border-primary pointer-events-none absolute inset-x-0 bottom-0 border-b-2'
                    />
                  ) : null}
                </button>
              ))}
            </div>
            {sort === 'distance' && !mock && !radiusApplied ? (
              <div className='mt-4 space-y-2'>
                <p className='text-muted-foreground text-sm'>{t('criteria.distanceNeedsRadius')}</p>
                <Button size='sm' variant='outline' onClick={() => setOpenCriterion('area')}>
                  {t('criteria.configureRadius')}
                </Button>
              </div>
            ) : null}

            {/* Hình S09: mỗi dòng chia BỐN cột cố định — ô logo (10.1% bề
                ngang khung) · tên + chỉ số (32.5%) · lịch khảo sát (13.7%) ·
                hai nút (18.8%) — và phần dôi ra chia đều vào ba khe. Bản trước
                gộp tên + mọi chỉ số vào một cột rồi để hai nút NẰM NGANG; ảnh
                thì tách riêng cột lịch khảo sát và XẾP CHỒNG hai nút.
                Chỉ số trong ảnh chỉ có đánh giá và số dự án tương tự — khoảng
                cách nằm ở S12 chứ không ở landing. */}
            {/* Thanh nhắc nổi không thay đổi chiều cao danh sách hoặc đẩy dải logo bên dưới. */}
            <ul id={RANKED_LIST_ID} className='mt-4 divide-y'>
              {directoryPending ? (
                <li aria-label={t('ranking.loading')} className='space-y-4 py-4'>
                  {[0, 1, 2].map((row) => (
                    <Skeleton key={row} className='h-24 w-full' />
                  ))}
                </li>
              ) : null}
              {directoryError ? (
                <li className='py-4'>
                  <Alert variant='destructive'>
                    <AlertDescription>{t('ranking.loadError')}</AlertDescription>
                    <Button size='sm' variant='outline' onClick={() => void liveDirectory.refetch()}>
                      {t('ranking.retry')}
                    </Button>
                  </Alert>
                </li>
              ) : null}
              {!directoryPending && !directoryError && ranked.length === 0 ? (
                <li className='text-muted-foreground py-10 text-center text-sm text-pretty'>{t('ranking.empty')}</li>
              ) : null}
              {ranked.map((contractor) => (
                <motion.li
                  key={contractor.id}
                  layout
                  variants={revealItemVariants}
                  initial='hidden'
                  whileInView='show'
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ layout: { duration: 0.35, ease: revealEase } }}
                  className='group grid grid-cols-[10.1%_32.5%_13.7%_18.8%] items-center justify-between gap-x-4 gap-y-3 rounded-lg py-4 transition-colors max-sm:grid-cols-1 hover:bg-accent/30'
                >
                  <ContractorLogo contractor={contractor} className='size-full aspect-square' />

                  <div className='min-w-0'>
                    <p className='flex flex-wrap items-center gap-2 font-medium'>{contractor.name}</p>
                    <span className='text-muted-foreground mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs'>
                      <span className='flex items-center gap-1.5'>
                        <Star className='text-warning size-3.5 shrink-0 fill-current' />
                        <span className='text-foreground font-semibold'>
                          {contractor.ratingKnown === false
                            ? tCommon('ratingUnknown')
                            : formatNumber(contractor.rating, locale, { minimumFractionDigits: 1 })}
                        </span>
                        {contractor.reviewCountKnown !== false
                          ? tCommon('reviewCount', { count: contractor.reviewCount })
                          : null}
                      </span>
                      <span className='flex items-center gap-1.5'>
                        <BadgeCheck className='text-primary size-3.5 shrink-0' />
                        {tCommon('similarProjects', {
                          count: contractor.completedProjects ?? contractor.similarProjects
                        })}
                      </span>
                    </span>
                  </div>

                  <p className='text-foreground/75 text-xs font-medium text-pretty'>
                    {contractor.surveyTimeKnown === false
                      ? tCommon('informationUnknown')
                      : t('ranking.surveyWithin', { hours: contractor.surveyWithinHours })}
                  </p>

                  {/* Cùng việc cùng nhãn với trang Đề xuất (góp ý BuildX): "Xem hồ sơ"
                      nền xanh đặc nằm trên, "Mời báo giá" viền nằm dưới. */}
                  <div className='flex flex-col gap-2'>
                    <Button
                      size='sm'
                      onClick={() => openContractorDetail(contractor.id)}
                      className='group-hover:brightness-110'
                    >
                      {tCommon('viewProfile')}
                    </Button>
                    <Button size='sm' variant='outline' onClick={() => chooseContractor(contractor.id)}>
                      {tCommon('invite')}
                    </Button>
                  </div>
                </motion.li>
              ))}
            </ul>

            {/* Dải logo mọi nhà thầu: chạy liên tục như dải thương hiệu ở trang
                chủ, rê chuột thì dừng, KHÔNG đổi theo bộ lọc. Dải có chiều cao
                cố định nên mở rộng cột trái không làm đổi cột phải. */}
            {brandContractors.length > 0 ? <ContractorLogoMarquee contractors={brandContractors} /> : null}
          </div>
        </div>
      </motion.section>

      {/* Dừng lại đủ lâu ở danh sách xếp hạng mà chưa bấm gì → thanh nhắc
          trượt lên dính đáy màn (mục 7). Dùng `useDwellNudge` sẵn có (đang
          nhắc trợ lý AI ở trang chủ) với `sectionIds`/`sessionKey` riêng cho
          khối này, không đụng tới nơi gọi khác. */}
      <AnimatePresence>
        {showStickyNudge && !ctaInView ? (
          <motion.div
            initial={{ y: 96, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 96, opacity: 0 }}
            transition={{ duration: 0.35, ease: revealEase }}
            className='pointer-events-none fixed inset-x-0 bottom-[90px] z-40 flex justify-center px-3 sm:bottom-6 sm:px-6'
          >
            <div className='bg-card pointer-events-auto flex w-full max-w-[570px] items-center justify-between gap-4 rounded-[22px] border px-4 py-3 shadow-lg sm:px-5'>
              <p className='min-w-0 truncate text-sm font-medium'>{t('ranking.stickyNudge')}</p>
              <div className='flex shrink-0 items-center gap-2'>
                {currentBrief ? (
                  <Button size='sm' variant='outline' onClick={openPicker}>
                    {t('switchBrief')}
                  </Button>
                ) : null}
                <Button size='sm' onClick={startBrief} disabled={createBrief.isPending}>
                  {t('hero.createBrief')}
                </Button>
                <button
                  type='button'
                  onClick={dismissNudge}
                  aria-label={tGlobal('close')}
                  className='text-muted-foreground hover:text-foreground p-1'
                >
                  <X className='size-4' />
                </button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* An toàn & minh bạch — Hình S09.

          Ba khác biệt so với bản trước: tiêu đề section IN HOA màu xanh; icon
          nằm BÊN TRÁI chữ (bản trước đặt trên đầu) và là hình nét TRẦN cỡ lớn,
          không có ô vuông nền xanh nhạt; tiêu đề mỗi thẻ màu xanh, ngắt hai
          dòng. */}
      <section className={PAGE_CONTAINER}>
        <h2 className='text-foreground text-center text-2xl font-bold tracking-tight text-balance sm:text-lg sm:tracking-wide sm:text-wrap sm:uppercase'>
          {t('safety.title')}
        </h2>
        {/* Số đo trên Hình S09 (phần nội dung 424px): ba thẻ 14…148, 158…288,
            298…436 → mỗi thẻ 135px (31.8%), khe 10px (**2.36%**, bản trước để
            `gap-4` = 1.1% nên ba thẻ dính nhau hơn ảnh).
            Trong thẻ: lề 10px (7.4%) · icon 33px (24.4%) · khe icon→chữ 12px
            (8.9%) · cột chữ 72px (53.3%). Icon canh GIỮA chiều cao thẻ. */}
        <motion.ul
          variants={revealContainerVariants}
          initial={reduceMotion ? false : 'hidden'}
          whileInView='show'
          viewport={{ once: true, amount: 0.3 }}
          className='mt-5 grid gap-[2.36%] gap-y-4 md:grid-cols-3'
        >
          {SAFETY_CARDS.map((item) => (
            <motion.li
              key={item.key}
              variants={revealItemVariants}
              // Mục 5: rê thẻ → nhấc lên + bóng rộng + viền xanh nhạt (viền/bóng
              // này CHƯA từng có ở trạng thái nghỉ, chỉ thêm cho hover).
              className='group bg-card flex items-center gap-[8.9%] rounded-2xl border p-[7.4%] transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg sm:p-5 md:p-[7.4%]'
            >
              <SafetyIcon kind={item.key} />
              <div className='min-w-0 flex-1'>
                {/* Hình S09: tiêu đề thẻ ngắt HAI dòng — cột chữ chỉ rộng
                    53.3% bề ngang thẻ nên chữ phải đủ lớn mới gãy dòng như ảnh. */}
                <h3 className='text-primary-strong text-xl leading-snug font-bold text-balance transition-colors duration-300 group-hover:text-brand-orange'>
                  {t(`safety.${item.key}Title`)}
                </h3>
                <p className='text-muted-foreground mt-2 text-[15px] leading-relaxed text-pretty'>
                  {t(`safety.${item.key}Body`)}
                </p>
              </div>
            </motion.li>
          ))}
        </motion.ul>
      </section>

      {/* FAQ — Hình S09.

          Ảnh dựng khối này khác hẳn bản trước: KHÔNG bó vào `max-w-3xl` mà chạy
          hết bề ngang nội dung, nằm trong MỘT khung bo góc có viền, và mỗi dòng
          chia hai cột — câu hỏi (đậm) chiếm 33.5% bề ngang, câu trả lời (chữ
          mờ) nằm ngay bên phải trên CÙNG MỘT DÒNG.

          Không còn accordion: câu trả lời đã hiện sẵn thì không có gì để bấm mở
          ra nữa. Dấu ⊕ trong ảnh cũng bỏ luôn — một dấu cộng không làm gì khi
          bấm thì người dùng tưởng hỏng. Đổi lại câu trả lời được xuống dòng đầy
          đủ thay vì cắt cụt một dòng như ảnh.

          Nội dung câu 3 CỐ Ý khác ảnh: ảnh trả lời "gửi đến nhiều nhà thầu để
          so sánh", trái R1 (tối đa 3 nhà thầu/dự án). Phần chữ của bản mô tả
          thắng ảnh ở chỗ này. */}
      <section id='faq' className={cn(PAGE_CONTAINER, 'scroll-mt-24')}>
        <h2 className='text-foreground text-center text-2xl font-bold tracking-tight text-balance sm:text-lg sm:tracking-wide sm:text-wrap sm:uppercase'>
          {t('faq.title')}
        </h2>
        <motion.dl
          variants={revealContainerVariants}
          initial={reduceMotion ? false : 'hidden'}
          whileInView='show'
          viewport={{ once: true, amount: 0.2 }}
          className='bg-card mt-5 rounded-2xl border px-[3%]'
        >
          {([1, 2, 3, 4, 5, 6, 7] as const).map((index) => (
            <motion.div
              key={index}
              id={`faq-${index}`}
              variants={revealItemVariants}
              className={cn(
                'group/faq relative grid scroll-mt-24 items-baseline gap-x-4 gap-y-1 border-b py-4 px-3 -mx-3 transition-colors duration-500 last:border-b-0 md:grid-cols-[33.5%_minmax(0,1fr)]',
                faqFlashIndex === index ? 'bg-primary/15' : 'hover:bg-accent/30'
              )}
            >
              {/* Mục 10: vạch xanh bên trái vẽ từ trên xuống khi rê dòng. */}
              <span className='bg-primary absolute inset-y-0 left-0 w-0.5 origin-top scale-y-0 transition-transform duration-300 group-hover/faq:scale-y-100' />
              <dt className='group-hover/faq:text-primary-strong font-semibold transition-colors'>
                {t(`faq.q${index}`)}
              </dt>
              <dd className='text-muted-foreground text-sm text-pretty'>
                {t.rich(`faq.a${index}`, {
                  // "3 nhà thầu": font-weight 400, không highlight nền.
                  mark: (chunks) => <span className='normal-case'>{chunks}</span>
                })}
              </dd>
            </motion.div>
          ))}
        </motion.dl>
      </section>

      {/* CTA + dải đối tác — Hình S09, hai dải cuối trang.

          Dải xanh: y=755…779 (cao 25/424 = 5.9% bề ngang nội dung), chạy hết bề
          ngang, màu nền đo được (0,91,48) — cùng tông xanh đậm với nút "Tạo hồ
          sơ" ở hero, KHÔNG phải `--primary` xanh tươi mà bản trước dùng. Nút bên
          phải nền TRẮNG, chữ xanh đậm.

          Dải đối tác: nền be/cam nhạt (247,241,229) chứ không phải nền trắng
          viền nét đứt; icon bắt tay và link "Trở thành đối tác" đều màu cam. */}
      <section ref={ctaSectionRef} className={cn(PAGE_CONTAINER, 'space-y-3')}>
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.5, ease: revealEase }}
          className='bg-primary-strong text-primary-foreground relative flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-2xl px-4 py-4 max-sm:flex-col max-sm:items-stretch max-sm:gap-3 sm:px-7 sm:py-6'
        >
          {/* Mục 11: quầng sáng xanh non hiện chậm ở góc phải — thuần trang trí,
              không đụng tới bố cục hay màu nền hiện có. */}
          <motion.span
            aria-hidden
            initial={reduceMotion ? false : { opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 1.4, delay: 0.2, ease: revealEase }}
            className='bg-primary/40 pointer-events-none absolute -top-10 -right-10 size-40 rounded-full blur-3xl'
          />
          <p className='relative text-sm font-bold text-pretty sm:text-base sm:font-semibold'>{t('cta.title')}</p>
          <div className='relative flex flex-wrap items-center gap-2 max-sm:flex-col max-sm:items-stretch max-sm:gap-3'>
            {currentBrief ? (
              <Button
                variant='outline'
                className='ring-primary-foreground/60 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground bg-transparent bg-none shadow-none before:hidden after:hidden max-sm:h-11 max-sm:w-full max-sm:rounded-full max-sm:px-8 max-sm:text-base'
                onClick={openPicker}
              >
                {t('switchBrief')}
              </Button>
            ) : null}
            <Button
              className='bg-background text-primary-strong hover:bg-background/90 relative border-0 bg-none shadow-sm transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-md max-sm:h-11 max-sm:rounded-full max-sm:px-8 max-sm:text-base'
              onClick={startBrief}
              disabled={createBrief.isPending}
            >
              <span className='relative overflow-hidden'>
                {/* Mục 11: một vệt sáng lướt qua nút đúng một lần khi dải vào tầm nhìn. */}
                <motion.span
                  aria-hidden
                  initial={reduceMotion ? false : { x: '-150%' }}
                  whileInView={{ x: '150%' }}
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{ duration: 0.9, delay: 0.5, ease: 'easeInOut' }}
                  className='absolute inset-y-0 left-0 w-1/3 -skew-x-12 bg-white/40'
                />
                <span className='relative'>{t('cta.action')}</span>
              </span>
            </Button>
          </div>
        </motion.div>

        {/* Mục 12: hiện dần sau dải CTA. */}
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.5, delay: 0.2, ease: revealEase }}
          className='group bg-brand-orange-soft/70 text-muted-foreground flex flex-wrap items-center justify-between gap-3 rounded-2xl px-7 py-4 text-sm transition-colors duration-300 hover:bg-brand-orange-soft'
        >
          <span className='inline-flex items-center gap-2'>
            <Handshake className='text-brand-orange size-6 shrink-0 max-sm:size-5' strokeWidth={1.75} />
            {t('partner.text')}
          </span>
          <button
            type='button'
            onClick={() => setPartnerDialogOpen(true)}
            className='text-brand-orange inline-flex cursor-pointer items-center gap-1.5 font-semibold'
          >
            {t('partner.action')}
            <ArrowRight className='size-3.5 transition-transform duration-300 group-hover:translate-x-1' />
          </button>
        </motion.div>
      </section>

      <PartnerRegistrationDialog open={partnerDialogOpen} onOpenChange={setPartnerDialogOpen} />

      {/* Thanh đáy đang hiện → chừa đúng chiều cao của nó để không che nội dung cuối trang. */}

      <ProjectPickerDialog currentProjectId={currentBrief?.id} />

      {/* Hình S09 kết thúc ngay sau dải đối tác — mực in cuối cùng ở y=797 trên
          ảnh cao 800px. Dòng nhắc "BuildX không hiển thị báo giá…" là của bản
          dựng, không có trong ảnh, nên bỏ; R2 vẫn được nói thẳng ở câu hỏi 4
          của FAQ và ở dòng dẫn của bảng so sánh. */}
    </div>
  )
}
