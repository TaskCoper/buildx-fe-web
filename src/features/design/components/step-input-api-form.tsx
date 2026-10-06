'use client'

import { useQuery } from '@tanstack/react-query'
import { AlertCircle, ImagePlus, Loader2, Palette, RefreshCw, X } from 'lucide-react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { toast } from 'sonner'

import { Link } from '@/i18n/navigation'
import { FieldLabel, SearchableSelect } from '@/shared/components/common'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { Textarea } from '@/shared/components/ui/textarea'
import { ROUTES } from '@/shared/constants/routes'
import { cn } from '@/shared/lib/utils'
import { acceptAttribute, checkFile, uploadImage } from '@/shared/media'
import { designKeys } from '../api/design.keys'
import { estimateInputApi } from '../api/estimate-input.api'
import { useAddressActions } from '../hooks/use-address-actions'
import { takeAddressSeed } from '../services/address-seed.storage'
import { useEstimateInput, type SaveStatus } from '../hooks/use-estimate-input'
import { startErrorKind, useStartGeneration } from '../hooks/use-start-generation'
import {
  areaProblem,
  DESCRIPTION_MAX_LENGTH,
  descriptionLength,
  selectedType,
  stylesFor,
  visibleFields
} from '../services/estimate-input.logic'
import { ChoiceCards, type ChoiceOption } from './choice-cards'
import { EstimateAddressField } from './estimate-address-field'

const MISSING_FIELD_KEYS = [
  'imageOrDescription',
  'areaM2',
  'buildingTypeId',
  'provinceCode',
  'wardCode',
  'finishPackage',
  'floorCount',
  'hasTum',
  'architectureStyleId',
  'interiorStyleId',
  'addressDetail',
  'location'
] as const
type MissingFieldKey = (typeof MISSING_FIELD_KEYS)[number]

interface StepInputApiFormProps {
  projectId: string
  onSubmit: () => void
}

/** Thẻ nhóm trường: số thứ tự + tiêu đề, nội dung chia lưới đều. */
function SectionCard({ index, title, children }: { index: number; title: string; children: ReactNode }) {
  return (
    <section className='bg-card rounded-2xl border p-5 shadow-xs sm:p-6'>
      <header className='mb-5 flex items-center gap-3'>
        <span className='bg-primary/10 text-primary flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold'>
          {index}
        </span>
        <h2 className='text-base font-semibold'>{title}</h2>
      </header>
      {children}
    </section>
  )
}

/** Thẻ chọn phong cách (kiến trúc / nội thất) ở cột phải. */
function StyleCard({ id, title, hint, children }: { id: string; title: string; hint: string; children: ReactNode }) {
  return (
    <section id={id} className='bg-card rounded-2xl border p-5 shadow-xs sm:p-6'>
      <h2 className='text-base font-semibold'>{title}</h2>
      <p className='text-muted-foreground mt-1 mb-4 text-sm'>{hint}</p>
      {children}
    </section>
  )
}

/** Dòng trạng thái tự lưu: chỉ báo "Đã lưu" sau khi BE xác nhận (BR-PROJ-003 khoản 8). */
function SaveIndicator({
  status,
  message,
  onRetry
}: {
  status: SaveStatus
  message: string | null
  onRetry: () => void
}) {
  const t = useTranslations('design.inputApi.status')
  if (status === 'idle') return null
  if (status === 'error' || status === 'denied' || status === 'conflict') {
    return (
      <p className='text-destructive flex flex-wrap items-center justify-center gap-2 text-xs' role='status'>
        <AlertCircle className='size-3.5' />
        {status === 'conflict' ? t('conflict') : status === 'denied' ? (message ?? t('denied')) : t('error')}
        {status === 'error' || status === 'conflict' ? (
          <button type='button' onClick={onRetry} className='inline-flex items-center gap-1 font-medium underline'>
            <RefreshCw className='size-3' />
            {status === 'conflict' ? t('reloadSaved') : t('retry')}
          </button>
        ) : null}
      </p>
    )
  }
  return (
    <p className='text-muted-foreground flex items-center justify-center gap-1.5 text-xs' role='status'>
      {status === 'saved' ? null : <Loader2 className='size-3 animate-spin' />}
      {status === 'saved' ? t('saved') : status === 'saving' ? t('saving') : t('pending')}
    </p>
  )
}

/**
 * Bước 1 — Nhập liệu, nối BMT API (TDD-PROJ-001). Các trường bám đúng DTO của BE: ảnh HOẶC mô tả, tỉnh/xã + địa chỉ,
 * loại công trình (danh mục ghim của bản), diện tích, số tầng, tum, gói hoàn thiện và phong cách (theo loại công
 * trình đang chọn). Tự lưu sau mỗi lần sửa; nút "Nhận dự toán ngay" lưu nốt rồi mới sang bước sau.
 */
export function StepInputApiForm({ projectId, onSubmit }: StepInputApiFormProps) {
  const t = useTranslations('design.inputApi')
  const tInput = useTranslations('design.input')
  const input = useEstimateInput(projectId)
  const start = useStartGeneration(projectId)
  const { draft, catalog, provinces, wards } = input
  const address = useAddressActions(input)
  // Chữ địa chỉ gõ tay chưa chọn gợi ý: chưa có toạ độ cho nó nên chưa cho sang bước sau.
  const [addressUnconfirmed, setAddressUnconfirmed] = useState(false)
  // Địa chỉ đã chọn ở cửa sổ Tạo dự án: ghi vào bản nhập MỘT lần khi bản nhập đã nạp xong và còn trống địa chỉ.
  const seededRef = useRef(false)
  const ready = Boolean(input.draft)
  const emptyAddress = input.draft?.addressDetail === ''
  useEffect(() => {
    if (!ready || seededRef.current) return
    seededRef.current = true
    if (!emptyAddress) return
    const seed = takeAddressSeed(projectId)
    if (seed)
      void address.pick({ text: seed.text, latitude: seed.latitude, longitude: seed.longitude, region: seed.region })
  }, [address, emptyAddress, projectId, ready])
  const missing = addressUnconfirmed ? [...input.missing, 'location'] : input.missing
  const quota = useQuery({
    queryKey: [...designKeys.quota(), 'api'],
    queryFn: () => estimateInputApi.getDesignQuota(),
    staleTime: 0
  })

  const [showErrors, setShowErrors] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const submittingRef = useRef(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  if (input.detail.isError || catalog.isError) {
    return (
      <div className='mx-auto w-full max-w-2xl px-4 py-5 text-center'>
        <p className='text-muted-foreground mb-4 text-sm'>{t('loadError')}</p>
        <Button
          variant='outline'
          onClick={() => {
            void input.detail.refetch()
            void catalog.refetch()
          }}
        >
          {t('reload')}
        </Button>
      </div>
    )
  }

  if (!draft || !catalog.data || input.detail.isPending) {
    return (
      <div className='text-muted-foreground flex min-h-64 items-center justify-center'>
        <Loader2 className='size-5 animate-spin' />
      </div>
    )
  }

  const type = selectedType(catalog.data, draft)
  const fields = visibleFields(type)
  const lockReason = input.lock
  const locked = lockReason !== null
  const disabled = locked || submitting
  const invalid = (field: string) => showErrors && missing.includes(field)
  const areaError = draft.areaM2 !== '' && areaProblem(draft.areaM2) !== null

  const floorOptions: ChoiceOption[] = (type?.floorCounts ?? []).map((count) => ({
    value: String(count),
    label: t('floorCount.option', { count })
  }))
  const styleOptions = (group: 'architecture' | 'interior'): ChoiceOption[] =>
    stylesFor(catalog.data, type, group).map((style) => ({
      value: style.styleId,
      label: style.name,
      imageUrl: style.imageUrl
    }))

  async function pickImage(file: File | undefined) {
    if (!file) return
    const problem = checkFile(file)
    if (problem) {
      toast.error(problem === 'UnsupportedType' ? t('image.errorType') : t('image.errorSize'))
      return
    }
    setUploading(true)
    try {
      // Ảnh cũ giữ nguyên cho tới khi ảnh mới tải xong (BR-PROJ-002 khoản 8): chỉ ghi vào form sau khi thành công.
      const uploaded = await uploadImage(file)
      input.patch({ inputImageUrl: uploaded.url })
    } catch {
      toast.error(t('image.errorUpload'))
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleSubmit() {
    if (submittingRef.current || uploading || locked) return
    submittingRef.current = true
    setShowErrors(true)
    setSubmitting(true)
    let releaseEdits: (() => void) | undefined
    try {
      const saved = await input.flush()
      if (!saved) return
      releaseEdits = input.freezeEdits()
      // BE là nguồn chính thức về trường còn thiếu.
      const fresh = await input.detail.refetch()
      if (fresh.isError || !fresh.data) {
        toast.error(t('loadError'))
        return
      }
      const serverMissing = fresh.data.missingFields ?? []
      if (missing.length > 0 || serverMissing.length > 0) {
        const first = missing[0] ?? serverMissing[0]
        if (first) document.getElementById(`field-${first}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        toast.error(t('missing.title'))
        return
      }
      // Gửi AI: giữ một lượt thiết kế và khoá đầu vào. Tác vụ đã chạy / đã xong thì cứ sang Bước 2.
      try {
        await start.mutateAsync(fresh.data?.inputVersion)
      } catch (error) {
        if (startErrorKind(error) !== 'alreadyRunning') {
          toast.error(start.messageOf(error))
          return
        }
      }
      onSubmit()
    } finally {
      releaseEdits?.()
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  // Tên trường còn thiếu cho người dùng; tên BE trả mà chưa có nhãn thì hiện nguyên.
  const missingLabels = missing.map((field) =>
    (MISSING_FIELD_KEYS as readonly string[]).includes(field) ? t(`missing.fields.${field as MissingFieldKey}`) : field
  )
  const outOfQuota = quota.data
    ? quota.data.hasSubscription && !quota.data.unlimited && (quota.data.available ?? 0) <= 0
    : false

  return (
    <div className='mx-auto w-full max-w-[90rem] px-4 pt-5 pb-5 lg:px-8'>
      {locked ? (
        <div
          role='alert'
          className='border-warning/40 bg-warning/10 mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 text-sm'
        >
          <p className='min-w-0 flex-1 text-pretty'>{t(`lock.${lockReason}`)}</p>
          {lockReason === 'noEdit' ? (
            <Button asChild size='sm'>
              <Link href={ROUTES.PLANS}>{t('lock.plans')}</Link>
            </Button>
          ) : (
            <Button size='sm' onClick={onSubmit}>
              {t('lock.next')}
            </Button>
          )}
        </div>
      ) : null}

      <fieldset disabled={disabled} className='m-0 min-w-0 border-0 p-0'>
        <div className='grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_26rem]'>
          {/* ── Cột TRÁI: ba thẻ xếp dọc, mỗi thẻ chia lưới 2 cột đều nhau ───────────── */}
          <div className='space-y-6'>
            <SectionCard index={1} title={t('groups.scope')}>
              <div className='grid gap-5 sm:grid-cols-2'>
                <div id='field-buildingTypeId' className='space-y-2'>
                  <FieldLabel htmlFor='building-type' hint={tInput('buildingType.hint')} required>
                    {t('buildingType.label')}
                  </FieldLabel>
                  <Select
                    disabled={disabled}
                    value={draft.buildingTypeId ?? ''}
                    onValueChange={input.chooseBuildingType}
                  >
                    <SelectTrigger
                      id='building-type'
                      className={cn('w-full', invalid('buildingTypeId') && 'border-destructive')}
                    >
                      <SelectValue placeholder={t('buildingType.placeholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {catalog.data.buildingTypes.map((option) => (
                        <SelectItem key={option.buildingTypeId} value={option.buildingTypeId}>
                          {option.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div id='field-areaM2' className='space-y-2'>
                  <FieldLabel htmlFor='area' hint={t('area.hint')} required>
                    {t('area.label')}
                  </FieldLabel>
                  <div className='relative'>
                    <Input
                      id='area'
                      inputMode='decimal'
                      value={draft.areaM2}
                      placeholder={t('area.placeholder')}
                      aria-invalid={areaError || invalid('areaM2')}
                      className={cn('pr-10', (areaError || invalid('areaM2')) && 'border-destructive')}
                      onChange={(event) => input.patch({ areaM2: event.target.value.replace(',', '.') })}
                    />
                    <span className='text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm'>
                      {t('area.unit')}
                    </span>
                  </div>
                  {areaError ? <p className='text-destructive text-xs'>{t('area.invalid')}</p> : null}
                </div>

                {fields.floors ? (
                  <div id='field-floorCount' className='space-y-2'>
                    <FieldLabel hint={tInput('floorCount.hint')} required>
                      {t('floorCount.label')}
                    </FieldLabel>
                    <ChoiceCards
                      compact
                      options={floorOptions}
                      value={draft.floorCount === null ? null : String(draft.floorCount)}
                      onChange={(value) => input.patch({ floorCount: Number(value) })}
                      invalid={invalid('floorCount')}
                    />
                  </div>
                ) : null}

                {fields.tum ? (
                  <div id='field-hasTum' className='space-y-2'>
                    <FieldLabel hint={tInput('attic.hint')} required>
                      {t('tum.label')}
                    </FieldLabel>
                    <ChoiceCards
                      compact
                      options={[
                        { value: 'yes', label: t('tum.yes') },
                        { value: 'no', label: t('tum.no') }
                      ]}
                      value={draft.hasTum === null ? null : draft.hasTum ? 'yes' : 'no'}
                      onChange={(value) => input.patch({ hasTum: value === 'yes' })}
                      invalid={invalid('hasTum')}
                    />
                  </div>
                ) : null}
              </div>
            </SectionCard>

            <SectionCard index={2} title={t('groups.location')}>
              <div className='grid gap-5 sm:grid-cols-2'>
                <div id='field-provinceCode' className='space-y-2'>
                  <FieldLabel htmlFor='province' hint={t('province.hint')} required>
                    {t('province.label')}
                  </FieldLabel>
                  <SearchableSelect
                    id='province'
                    disabled={disabled}
                    value={draft.provinceCode ?? ''}
                    onValueChange={(provinceCode) => void address.changeRegion({ provinceCode })}
                    options={(provinces.data?.provinces ?? []).map((province) => ({
                      value: province.code,
                      label: province.name
                    }))}
                    placeholder={provinces.isPending ? t('loading') : t('province.placeholder')}
                    invalid={invalid('provinceCode')}
                  />
                </div>

                <div id='field-wardCode' className='space-y-2'>
                  <FieldLabel htmlFor='ward' hint={t('ward.hint')} required>
                    {t('ward.label')}
                  </FieldLabel>
                  <SearchableSelect
                    id='ward'
                    value={draft.wardCode ?? ''}
                    onValueChange={(wardCode) =>
                      void address.changeRegion({ provinceCode: draft.provinceCode ?? '', wardCode })
                    }
                    disabled={disabled || !draft.provinceCode}
                    options={(wards.data ?? []).map((ward) => ({ value: ward.code, label: ward.name }))}
                    placeholder={
                      !draft.provinceCode
                        ? t('ward.needProvince')
                        : wards.isPending
                          ? t('loading')
                          : t('ward.placeholder')
                    }
                    invalid={invalid('wardCode')}
                  />
                </div>

                <EstimateAddressField
                  disabled={disabled}
                  value={draft.addressDetail}
                  latitude={draft.latitude}
                  longitude={draft.longitude}
                  context={[
                    wards.data?.find((ward) => ward.code === draft.wardCode)?.name,
                    provinces.data?.provinces.find((province) => province.code === draft.provinceCode)?.name
                  ]
                    .filter(Boolean)
                    .join(', ')}
                  onPick={address.pick}
                  onPinMove={(latitude, longitude) => void address.movePin(latitude, longitude)}
                  onUnconfirmedChange={setAddressUnconfirmed}
                  invalid={invalid('addressDetail') || invalid('location')}
                />
              </div>
              {provinces.isError ? (
                <p className='text-destructive mt-3 text-xs'>
                  {t('province.loadError')}{' '}
                  <button type='button' className='font-medium underline' onClick={() => void provinces.refetch()}>
                    {t('reload')}
                  </button>
                </p>
              ) : null}
            </SectionCard>

            <SectionCard index={3} title={t('groups.media')}>
              <div className='grid gap-5 md:grid-cols-2'>
                <div id='field-imageOrDescription' className='space-y-2'>
                  <FieldLabel hint={t('image.hint')}>{t('image.label')}</FieldLabel>
                  {draft.inputImageUrl ? (
                    <div className='group relative h-52 overflow-hidden rounded-xl border'>
                      <Image
                        src={draft.inputImageUrl}
                        alt={t('image.label')}
                        width={800}
                        height={600}
                        className='h-52 w-full object-cover'
                        unoptimized
                      />
                      <div className='absolute top-2 right-2 flex gap-1.5'>
                        <Button
                          type='button'
                          variant='secondary'
                          size='sm'
                          className='h-8 rounded-full px-3 text-xs'
                          onClick={() => fileRef.current?.click()}
                        >
                          {t('image.replace')}
                        </Button>
                        <Button
                          type='button'
                          variant='secondary'
                          size='icon'
                          aria-label={t('image.remove')}
                          onClick={() => input.patch({ inputImageUrl: null })}
                          className='size-8 rounded-full'
                        >
                          <X className='size-4' />
                        </Button>
                      </div>
                      {uploading ? (
                        <span className='bg-background/70 absolute inset-0 flex items-center justify-center'>
                          <Loader2 className='size-5 animate-spin' />
                        </span>
                      ) : null}
                    </div>
                  ) : (
                    <button
                      type='button'
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      className={cn(
                        'text-muted-foreground hover:bg-muted/50 flex h-52 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-sm transition-colors',
                        invalid('imageOrDescription') && 'border-destructive'
                      )}
                    >
                      {uploading ? <Loader2 className='size-6 animate-spin' /> : <ImagePlus className='size-6' />}
                      {uploading ? t('image.uploading') : t('image.upload')}
                    </button>
                  )}
                  <input
                    ref={fileRef}
                    type='file'
                    accept={acceptAttribute()}
                    className='hidden'
                    onChange={(event) => void pickImage(event.target.files?.[0])}
                  />
                  <p className='text-muted-foreground text-xs'>{t('image.hint')}</p>
                </div>

                <div className='space-y-2'>
                  <FieldLabel htmlFor='description' hint={t('description.hint')}>
                    {t('description.label')}
                  </FieldLabel>
                  <Textarea
                    id='description'
                    value={draft.description}
                    placeholder={t('description.placeholder')}
                    className='h-52 resize-none'
                    onChange={(event) => {
                      // Giới hạn theo ký tự Unicode như BE (đếm rune, không đếm UTF-16).
                      const next = [...event.target.value].slice(0, DESCRIPTION_MAX_LENGTH).join('')
                      input.patch({ description: next })
                    }}
                  />
                  <p className='text-muted-foreground text-right text-xs'>
                    {descriptionLength(draft.description)}/{DESCRIPTION_MAX_LENGTH}
                  </p>
                </div>
              </div>
            </SectionCard>
          </div>

          {/* ── Cột PHẢI: phong cách thiết kế, tách HAI thẻ (mỗi nhóm bật/tắt riêng theo loại công trình) ── */}
          <div className='space-y-6'>
            {!type ? (
              <section className='bg-card flex min-h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed p-8 text-center'>
                <Palette className='text-muted-foreground size-8' strokeWidth={1.5} />
                <h2 className='text-base font-semibold'>{t('extra.title')}</h2>
                <p className='text-muted-foreground max-w-xs text-sm text-pretty'>{t('extra.empty')}</p>
              </section>
            ) : !fields.architecture && !fields.interior ? (
              <section className='bg-card rounded-2xl border p-5 shadow-xs sm:p-6'>
                <h2 className='text-base font-semibold'>{t('extra.title')}</h2>
                <p className='text-muted-foreground mt-1 text-sm'>{t('extra.none')}</p>
              </section>
            ) : null}

            {fields.architecture ? (
              <StyleCard
                id='field-architectureStyleId'
                title={t('style.architecture')}
                hint={t('style.architectureHint')}
              >
                <ChoiceCards
                  className='grid-cols-2 sm:grid-cols-2'
                  options={styleOptions('architecture')}
                  value={draft.architectureStyleId}
                  onChange={(value) => input.patch({ architectureStyleId: value })}
                  invalid={invalid('architectureStyleId')}
                />
              </StyleCard>
            ) : null}

            {fields.interior ? (
              <StyleCard id='field-interiorStyleId' title={t('style.interior')} hint={t('style.interiorHint')}>
                <ChoiceCards
                  className='grid-cols-2 sm:grid-cols-2'
                  options={styleOptions('interior')}
                  value={draft.interiorStyleId}
                  onChange={(value) => input.patch({ interiorStyleId: value })}
                  invalid={invalid('interiorStyleId')}
                />
              </StyleCard>
            ) : null}
          </div>
        </div>
      </fieldset>

      {/* ── Khối hành động căn giữa: trường còn thiếu, trạng thái lưu, hạn mức, nút gửi ── */}
      <div className='mx-auto mt-8 w-full max-w-xl space-y-3'>
        {showErrors && missingLabels.length > 0 ? (
          <p className='text-destructive text-center text-xs'>
            {t('missing.title')}: {missingLabels.join(', ')}
          </p>
        ) : null}
        <SaveIndicator status={input.status} message={input.errorMessage} onRetry={() => void input.retry()} />
        {quota.data ? (
          <p className='text-muted-foreground text-center text-xs'>
            {!quota.data.hasSubscription
              ? t('quota.none')
              : quota.data.unlimited
                ? t('quota.unlimited')
                : t('quota.plan', { remaining: quota.data.available ?? 0, total: quota.data.limit ?? 0 })}
          </p>
        ) : null}

        {outOfQuota ? (
          <Button asChild size='lg' className='w-full'>
            <Link href={ROUTES.PLANS}>{tInput('quota.upgrade')}</Link>
          </Button>
        ) : (
          <Button
            size='lg'
            className='w-full'
            onClick={() => void handleSubmit()}
            disabled={submitting || uploading || locked}
          >
            {submitting ? <Loader2 className='size-4 animate-spin' /> : null}
            {tInput('submit')}
          </Button>
        )}
      </div>
    </div>
  )
}
