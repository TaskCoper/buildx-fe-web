'use client'

import { Loader2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import type { ReactNode } from 'react'

import { Link } from '@/i18n/navigation'
import { useAuthStore } from '@/shared/auth'
import { ROUTES } from '@/shared/constants/routes'
import { Button } from '@/shared/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/shared/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { Textarea } from '@/shared/components/ui/textarea'
import { usePageEntrance } from '@/shared/hooks'
import { cn } from '@/shared/lib/utils'
import { WISHES_MAX_LENGTH } from '../constants/design.constants'
import {
  buildingTypeChangeLosses,
  composeAddress,
  EMPTY_DESIGN_INPUT,
  isSavedFloorCount,
  missingRequiredFields,
  sanitizeDesignInput,
  visibleFields,
  type RequiredInputField
} from '../services/design-input.service'
import { useDesignCatalog } from '../hooks/use-design-catalog'
import { useDesignQuota } from '../hooks/use-design-quota'
import { useFloorCountLabel } from '../hooks/use-floor-count-label'
import { useSaveInput } from '../hooks/use-save-input'
import { useSavedInput } from '../hooks/use-saved-input'
import { useDesignStore } from '../store/design.store'
import type { BuildingType, DesignStyle } from '../types/design.types'
import { AddressField } from './address-field'
import { ChoiceCards, type ChoiceOption } from './choice-cards'
import { FieldLabel } from '@/shared/components/common'
import { LandPhotoField } from './land-photo-field'
import { PackageSlider } from './package-slider'
import { PhonePromptDialog } from './phone-prompt-dialog'

interface StepInputFormProps {
  projectId: string
  onSubmit: () => void
}

/** Nhãn nhóm đánh số trong cột trái (Hình 04): "1 · HÌNH ẢNH & MÔ TẢ". */
function GroupHeading({ index, children }: { index: number; children: ReactNode }) {
  return (
    <h2 className='text-muted-foreground mb-3 max-md:text-xs text-[11px] font-semibold tracking-[0.1em] uppercase'>
      {index} · {children}
    </h2>
  )
}

/**
 * Bước 1 — Nhập liệu (mục IV.3, Hình 04).
 *
 * Cột trái là một tấm thẻ gồm 3 nhóm đánh số: HÌNH ẢNH & MÔ TẢ (ảnh lô đất và
 * mô tả đứng cạnh nhau) → VỊ TRÍ CÔNG TRÌNH → LOẠI CÔNG TRÌNH & QUY MÔ. Cột
 * phải là thẻ "Thông tin bổ sung" chứa trường Kiểu kiến trúc & phong cách.
 * Đáy màn hình: dòng hạn mức lượt + nút full-width "Nhận dự toán ngay".
 *
 * Danh sách trường bám đúng Phụ lục A — 8 trường, không thêm ô ngân sách và
 * không có ô kích thước lô đất (AI tự nhận diện từ ảnh).
 */
export function StepInputForm({ projectId, onSubmit }: StepInputFormProps) {
  const t = useTranslations('design.input')
  const draft = useDesignStore((s) => s.drafts[projectId] ?? EMPTY_DESIGN_INPUT)
  const patchDraft = useDesignStore((s) => s.patchDraft)
  const setBuildingType = useDesignStore((s) => s.setBuildingType)
  const saveInput = useSaveInput(projectId)
  // Bản đã lưu: loại / phương án admin đã ngừng vẫn giữ trên hồ sơ cũ (epic ConstructionTypeManagement §8).
  const { data: saved = null } = useSavedInput(projectId)
  // Loại công trình + phong cách do admin cấu hình (mục X, #6).
  const catalog = useDesignCatalog(draft.buildingType, saved?.buildingType ?? null)
  const floorLabel = useFloorCountLabel()
  const { data: quota } = useDesignQuota()
  const phone = useAuthStore((s) => s.user?.phone)
  // M03 opening choreography is intentionally staged rather than overlapped:
  // stepper finishes first, then the left column, then the right column.
  const { rootRef, entranceState, entranceStyle } = usePageEntrance(`design.${projectId}.input-form`, { offsetMs: 880 })

  // Chỉ hiện viền đỏ sau lần bấm nút đầu tiên, không nhắc lỗi khi đang gõ.
  const [showErrors, setShowErrors] = useState(false)
  const [validationRun, setValidationRun] = useState(false)
  const [readySweep, setReadySweep] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [phoneOpen, setPhoneOpen] = useState(false)
  // Loại công trình đang chờ xác nhận vì đổi sang nó sẽ xóa Số tầng / Tum đã chọn (§7).
  const [pendingType, setPendingType] = useState<{
    value: BuildingType
    losses: Array<'floorCount' | 'hasAttic'>
  } | null>(null)
  const wasReadyRef = useRef(false)
  const missing = useMemo(() => missingRequiredFields(draft, saved), [draft, saved])
  const fields = visibleFields(draft.buildingType)
  const canSubmit = missing.length === 0
  const invalid = (field: RequiredInputField) => showErrors && missing.includes(field)

  const outOfQuota = quota ? quota.remaining <= 0 : false

  useEffect(() => {
    if (canSubmit && !wasReadyRef.current) {
      wasReadyRef.current = true
      setReadySweep(true)
      const timer = window.setTimeout(() => setReadySweep(false), 900)
      return () => window.clearTimeout(timer)
    }
  }, [canSubmit])

  const floorOptions: ChoiceOption[] = fields.floorOptions.map((value) => ({ value, label: floorLabel(value) }))
  // Phương án đã ngừng nhưng là giá trị đã lưu của hồ sơ này → vẫn hiện, không chọn mới được (§3).
  if (draft.floorCount && !fields.floorOptions.includes(draft.floorCount) && isSavedFloorCount(draft, saved)) {
    floorOptions.push({
      value: draft.floorCount,
      label: `${floorLabel(draft.floorCount)} ${t('inactiveSuffix')}`,
      disabled: true
    })
  }
  const atticOptions: ChoiceOption[] = [
    { value: 'yes', label: t('attic.options.yes') },
    { value: 'no', label: t('attic.options.no') }
  ]
  // Thẻ ảnh chọn nhanh — danh mục đổi theo loại công trình (Phụ lục A).
  const styleOptions: ChoiceOption[] = catalog.styles

  /** Ghi Bước 1 lên server rồi mới sang màn chờ Bước 2. */
  function save() {
    // Trường không áp dụng cho cấu hình hiện tại thì không gửi giá trị ngầm (§7).
    saveInput.mutate(sanitizeDesignInput(draft), {
      onSuccess: () => {
        setLeaving(true)
        window.setTimeout(onSubmit, 460)
      },
      // Cấu hình vừa đổi phía admin → đánh dấu lại các trường phải chọn lại (§8).
      onError: () => setShowErrors(true)
    })
  }

  function handleSubmit() {
    if (!canSubmit) {
      setShowErrors(true)
      setValidationRun(false)
      window.requestAnimationFrame(() => setValidationRun(true))
      window.setTimeout(() => setValidationRun(false), 1_050)
      // Bấm khi thiếu → cuộn tới trường còn thiếu đầu tiên kèm viền đỏ nhắc.
      const first = missing[0]
      if (first) document.getElementById(`field-${first}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    // Chưa có SĐT thì hỏi trước (mục IV.3.d) — hồ sơ Bước 3 và SMS đều cần số này.
    if (!phone) {
      setPhoneOpen(true)
      return
    }
    save()
  }

  function chooseBuildingType(buildingType: BuildingType) {
    // Giá trị Số tầng / Tum không còn hợp lệ với loại mới → hỏi trước khi xóa (§7).
    const losses = buildingTypeChangeLosses(draft, buildingType)
    if (losses.length > 0) {
      setPendingType({ value: buildingType, losses })
      return
    }
    applyBuildingType(buildingType)
  }

  function applyBuildingType(buildingType: BuildingType) {
    setBuildingType(projectId, buildingType)
    window.setTimeout(() => {
      const target = document.getElementById('scope-options') ?? document.getElementById('field-style')
      target?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, 180)
  }

  return (
    <div
      ref={rootRef}
      data-page-entrance={entranceState}
      data-validation-run={validationRun}
      data-flow-leaving={leaving}
      style={entranceStyle}
      className='mx-auto w-full max-w-[90rem] px-4 pt-5 pb-5 lg:px-8'
    >
      <div className='grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]'>
        {/* ── Cột TRÁI — 3 nhóm đánh số ─────────────────────────────── */}
        <div data-entrance-step='0' data-entrance-from='left' className='bg-card space-y-7 rounded-2xl border p-5'>
          <section>
            <GroupHeading index={1}>{t('groups.media')}</GroupHeading>
            <div className='grid gap-5 md:grid-cols-2'>
              <div
                id='field-landPhotoUrl'
                data-missing={missing.includes('landPhotoUrl')}
                style={{ '--missing-delay': '0ms' } as React.CSSProperties}
                className='space-y-1.5'
              >
                <LandPhotoField
                  value={draft.landPhotoUrl}
                  onChange={(landPhotoUrl) => patchDraft(projectId, { landPhotoUrl })}
                  buildingType={draft.buildingType}
                  invalid={invalid('landPhotoUrl')}
                />
                <p className='text-muted-foreground text-xs'>
                  {draft.landPhotoUrl ? t('landPhoto.uploadedNote') : t('landPhoto.fallbackNote')}
                </p>
              </div>

              <div
                data-character-counter-warning={draft.wishes.length >= WISHES_MAX_LENGTH * 0.88}
                className='space-y-2'
              >
                <FieldLabel htmlFor='wishes' hint={t('wishes.hint')}>
                  {t('wishes.label')}
                </FieldLabel>
                <Textarea
                  id='wishes'
                  rows={7}
                  maxLength={WISHES_MAX_LENGTH}
                  value={draft.wishes}
                  placeholder={t('wishes.placeholder')}
                  onChange={(e) => patchDraft(projectId, { wishes: e.target.value })}
                />
                <p data-character-counter className='text-muted-foreground text-right text-xs transition-colors'>
                  {draft.wishes.length}/{WISHES_MAX_LENGTH}
                </p>
              </div>
            </div>
          </section>

          <section
            id='field-address'
            data-missing={missing.includes('address')}
            style={{ '--missing-delay': '95ms' } as React.CSSProperties}
          >
            <GroupHeading index={2}>{t('groups.location')}</GroupHeading>
            <AddressField
              value={draft.addressDetail}
              invalid={invalid('address')}
              onChange={(addressDetail) =>
                // `address` là chuỗi đã ghép gửi lên API; `addressDetail` giữ
                // lựa chọn để mở lại bản nháp vẫn đúng.
                patchDraft(projectId, { addressDetail, address: composeAddress(addressDetail) })
              }
            />
          </section>

          <section className='space-y-5'>
            <GroupHeading index={3}>{t('groups.scope')}</GroupHeading>

            <div
              id='field-buildingType'
              data-missing={missing.includes('buildingType')}
              style={{ '--missing-delay': '190ms' } as React.CSSProperties}
              className='space-y-2'
            >
              <FieldLabel htmlFor='building-type' hint={t('buildingType.hint')} required>
                {t('buildingType.label')}
              </FieldLabel>
              {/* Chuỗi rỗng, không phải `undefined`: `undefined` khiến Radix coi
                  đây là select không kiểm soát rồi cảnh báo khi có giá trị. */}
              <Select
                value={draft.buildingType ?? ''}
                onValueChange={(value) => chooseBuildingType(value as BuildingType)}
              >
                <SelectTrigger
                  id='building-type'
                  className={cn('w-full', invalid('buildingType') && 'border-destructive')}
                >
                  <SelectValue placeholder={t('buildingType.placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  {catalog.buildingTypes.map((option) => (
                    <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Số tầng và Tum đứng chung một hàng như Hình 04. */}
            {fields.floorCount || fields.attic ? (
              <div id='scope-options' data-scope-reveal className='flex flex-wrap items-start gap-x-6 gap-y-4'>
                {fields.floorCount ? (
                  <div
                    id='field-floorCount'
                    data-missing={missing.includes('floorCount')}
                    style={{ '--missing-delay': '285ms' } as React.CSSProperties}
                    className='space-y-2'
                  >
                    <FieldLabel hint={t('floorCount.hint')} required={fields.floorRequired}>
                      {t('floorCount.label')}
                    </FieldLabel>
                    <ChoiceCards
                      compact
                      options={floorOptions}
                      value={draft.floorCount}
                      onChange={(value) => patchDraft(projectId, { floorCount: value as typeof draft.floorCount })}
                      invalid={invalid('floorCount')}
                    />
                  </div>
                ) : null}

                {fields.attic ? (
                  <div
                    id='field-hasAttic'
                    data-missing={missing.includes('hasAttic')}
                    style={{ '--missing-delay': '380ms' } as React.CSSProperties}
                    className='space-y-2'
                  >
                    <FieldLabel hint={t('attic.hint')} required={fields.atticRequired}>
                      {t('attic.label')}
                    </FieldLabel>
                    <ChoiceCards
                      compact
                      options={atticOptions}
                      value={draft.hasAttic === null ? null : draft.hasAttic ? 'yes' : 'no'}
                      onChange={(value) => patchDraft(projectId, { hasAttic: value === 'yes' })}
                      invalid={invalid('hasAttic')}
                    />
                  </div>
                ) : null}
              </div>
            ) : null}

            <PackageSlider
              value={draft.packageTier}
              onChange={(packageTier) => patchDraft(projectId, { packageTier })}
            />
          </section>
        </div>

        {/* ── Cột PHẢI — Thông tin bổ sung ─────────────────────────── */}
        <aside
          data-entrance-step='3'
          data-entrance-from='right'
          className='bg-card h-fit rounded-2xl border p-5 lg:self-start'
        >
          <h2 className='mb-4 font-semibold'>{t('extra.title')}</h2>

          {!draft.buildingType ? (
            <div className='text-muted-foreground flex min-h-64 items-center justify-center rounded-xl border border-dashed p-8 text-center text-sm'>
              {t('extra.empty')}
            </div>
          ) : (
            <div
              id='field-style'
              data-extra-reveal
              data-missing={missing.includes('style')}
              style={{ '--missing-delay': '475ms' } as React.CSSProperties}
              className='space-y-2'
            >
              <FieldLabel hint={t('style.hint')} required>
                {t('style.label')}
              </FieldLabel>
              <ChoiceCards
                className='grid-cols-2 sm:grid-cols-2'
                options={styleOptions}
                value={draft.style}
                onChange={(value) => patchDraft(projectId, { style: value as DesignStyle })}
                invalid={invalid('style')}
                entranceStep={2}
              />
            </div>
          )}
        </aside>
      </div>

      {/* Hạn mức lượt + nút lớn full-width dưới đáy màn hình (mục IV.3.c). */}
      <div data-entrance-step='4' className='mt-6 space-y-2'>
        {quota ? (
          <p data-quota-message data-ready-pulse={readySweep} className='text-muted-foreground text-center text-xs'>
            {quota.total === null
              ? t('quota.free', { count: quota.remaining })
              : t('quota.plan', { remaining: quota.remaining, total: quota.total })}
          </p>
        ) : null}

        {outOfQuota ? (
          // Hết lượt → nút chuyển trạng thái, dẫn sang trang Gói đăng ký (mục IV.3.c).
          <Button asChild size='lg' className='w-full'>
            <Link href={ROUTES.PLANS}>{t('quota.upgrade')}</Link>
          </Button>
        ) : (
          <Button
            data-estimate-submit
            data-primary-ready={canSubmit}
            data-ready-sweep={readySweep}
            size='lg'
            onClick={handleSubmit}
            aria-disabled={!canSubmit}
            disabled={saveInput.isPending || leaving}
            className={cn('w-full', !canSubmit && 'opacity-50')}
          >
            {saveInput.isPending ? <Loader2 className='size-4 animate-spin' /> : null}
            {t('submit')}
          </Button>
        )}
      </div>

      <PhonePromptDialog open={phoneOpen} onOpenChange={setPhoneOpen} onConfirmed={save} />

      <Dialog open={pendingType !== null} onOpenChange={(open) => (open ? undefined : setPendingType(null))}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>{t('typeChange.title')}</DialogTitle>
            <DialogDescription className='text-pretty'>
              {t('typeChange.description', {
                fields: (pendingType?.losses ?? [])
                  .map((field) => (field === 'floorCount' ? t('floorCount.label') : t('attic.label')))
                  .join(', ')
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant='outline' onClick={() => setPendingType(null)}>
              {t('typeChange.cancel')}
            </Button>
            <Button
              onClick={() => {
                if (pendingType) applyBuildingType(pendingType.value)
                setPendingType(null)
              }}
            >
              {t('typeChange.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
