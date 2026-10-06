'use client'

import { useTranslations } from 'next-intl'

import { useProject } from '@/features/design'
import { OrderConfirm, isApiOrderId, type OfferKey, type OrderKind } from '@/features/checkout'
import { usePlans } from '@/features/plans'
import { useSupervisionPackageList } from '@/features/supervision'
import { LoadingSpinner } from '@/shared/components/common'

interface ConfirmViewProps {
  productId: string
  kind: OrderKind
  projectId?: string
  offer?: string
}

const OFFER_KEYS: readonly OfferKey[] = ['Month', 'Year', 'ConstructionSite']

function toOfferKey(offer?: string): OfferKey | undefined {
  return OFFER_KEYS.find((key) => key === offer)
}

/**
 * Cầu nối tầng app cho màn Xác nhận đơn (S03).
 *
 * Gói ĐẾN TỪ API (planId là UUID) không nằm trong kho CMS mà `OrderConfirm` đọc, nên ở
 * đây — tầng được phép chạm cả `features/plans`, `features/supervision` lẫn
 * `features/checkout` — tra gói rồi truyền bản chụp xuống. Gói mock (id không phải
 * UUID) bỏ qua nhánh này, `OrderConfirm` tự đọc CMS như cũ.
 *
 * `kind` KHÔNG suy từ `?project=`: mua gói giám sát không cần công trình (BR-PAY-001
 * khoản 4), nên khách vào từ tab Bảng giá sẽ không có tham số đó mà vẫn mua giám sát.
 * Loại đơn lấy từ chính gói: có trong danh sách gói giám sát thì là giám sát.
 */
export function ConfirmView({ productId, kind, projectId, offer }: ConfirmViewProps) {
  const t = useTranslations('checkout.confirm')
  const { data: plans, isPending: plansPending } = usePlans()
  const { packages, isPending: packagesPending } = useSupervisionPackageList()
  // Chỉ hiện TÊN dự án, không bao giờ hiện mã (uuid) — chưa tải xong thì ẩn dòng này.
  const { data: project } = useProject(projectId ?? '')

  const isApi = isApiOrderId(productId)
  const pkg = packages.find((item) => item.id === productId)
  const resolvedKind: OrderKind = pkg ? 'supervision' : isApi ? 'design' : kind

  const apiPackage = isApi ? pkg : undefined
  const apiPlan = isApi && !pkg ? plans?.find((plan) => plan.id === productId) : undefined

  // Chờ danh sách gói từ API về mới quyết định — nếu không, màn sẽ nháy "không tìm
  // thấy gói" trong lúc gói còn đang tải.
  if (isApi && !apiPackage && !apiPlan && (plansPending || packagesPending)) {
    return <LoadingSpinner className='py-24' label={t('loadingProduct')} />
  }

  const offerKey = toOfferKey(offer)

  // Gói thiết kế có giá và hạn mức RIÊNG theo chu kỳ (tháng 20 phương án / năm 240…). Lấy đúng
  // offer đang mua; gói API mà không có offer đó thì không có gì để bán → coi như không tìm thấy,
  // thay vì hiện giá tháng cho đơn năm.
  const cycle = offerKey === 'Year' ? 'Year' : 'Month'
  const cycleOffer = apiPlan?.cycles?.[cycle]
  const planForOffer = apiPlan && (!apiPlan.cycles || cycleOffer) ? apiPlan : undefined

  const apiProduct = apiPackage
    ? {
        name: apiPackage.name,
        tierTag: null,
        popular: Boolean(apiPackage.recommended),
        price: apiPackage.price,
        benefits: apiPackage.benefits,
        // Gói giám sát không có chu kỳ: điều kiện thật là phải gán vào công trình trong một năm.
        validity: t('validityAssign')
      }
    : planForOffer
      ? {
          name: planForOffer.name,
          tierTag: null,
          popular: Boolean(planForOffer.popular),
          price: cycleOffer?.price ?? planForOffer.price,
          // Chỉ những gì BE có: hai hạn mức (phương án thiết kế, tra cứu thư viện) và quyền
          // phối cảnh 3D nếu bật. KHÔNG có "lượt chỉnh sửa" — BE không có hạn mức đó, đừng suy
          // ra từ số phương án.
          benefits: [
            `${cycleOffer?.designCredits ?? planForOffer.designCredits} phương án thiết kế`,
            `${cycleOffer?.libraryCredits ?? planForOffer.libraryCredits} lượt tra cứu thư viện mẫu`,
            ...(planForOffer.benefits.toggles.render3d.enabled && planForOffer.benefits.toggles.render3d.text
              ? [planForOffer.benefits.toggles.render3d.text]
              : [])
          ],
          // Lượt thuộc KỲ mua (tháng/năm) và hết kỳ thì không dùng được nữa (BR-SUB-014/021) —
          // câu "lượt không hết hạn" của bản mock là sai với gói thật.
          validity: t(cycle === 'Year' ? 'validityYear' : 'validityMonth')
        }
      : undefined

  return (
    <OrderConfirm
      productId={productId}
      kind={resolvedKind}
      projectId={projectId}
      projectName={project?.name}
      offerKey={offerKey}
      apiProduct={apiProduct}
    />
  )
}
