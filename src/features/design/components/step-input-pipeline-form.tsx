'use client'

import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Loader2, Palette } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { Link } from '@/i18n/navigation'
import { FieldLabel, SearchableSelect } from '@/shared/components/common'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { Textarea } from '@/shared/components/ui/textarea'
import { ROUTES, designPlanRoute } from '@/shared/constants/routes'
import { cn } from '@/shared/lib/utils'
import { designKeys } from '../api/design.keys'
import { estimateInputApi } from '../api/estimate-input.api'
import { PACKAGE_TIERS } from '../constants/design.constants'
import { useAddressActions } from '../hooks/use-address-actions'
import { useEstimateDetail } from '../hooks/use-estimate-detail'
import { useEstimateInput, type LockReason } from '../hooks/use-estimate-input'
import { useLotVerification } from '../hooks/use-lot-verification'
import { useStageRun } from '../hooks/use-stage-run'
import { useStages } from '../hooks/use-stages'
import { takeAddressSeed } from '../services/address-seed.storage'
import {
  BEDROOMS_MAX,
  BEDROOMS_MIN,
  DEFAULT_ENTRANCE_SIDE,
  descriptionLength,
  ENTRANCE_SIDES,
  lotSizeProblem,
  PIPELINE_DESCRIPTION_MAX_LENGTH,
  selectedType,
  stylesFor,
  visibleFields,
  type EntranceSide,
  type FinishPackage
} from '../services/estimate-input.logic'
import { isStageActive, lotVerificationPassed, stageOf } from '../services/pipeline.logic'
import type { PackageTier } from '../types/design.types'
import { ChoiceCards, type ChoiceOption } from './choice-cards'
import { EstimateAddressField } from './estimate-address-field'
import { SaveIndicator, SectionCard, StyleGroup } from './input-form-parts'
import { LotImageField } from './lot-image-field'
import { LotVerificationStatus } from './lot-verification-status'
import { PackageSlider } from './package-slider'

/** Trường thiếu có câu riêng; trường BE trả mà chưa có nhãn thì hiện nguyên tên. */
const MISSING_FIELD_KEYS = [
  'inputImageUrl',
  'lotVerification',
  'desiredBedrooms',
  'lotSize',
  'buildingTypeId',
  'provinceCode',
  'wardCode',
  'addressDetail',
  'location',
  'finishPackage',
  'floorCount',
  'hasTum',
  'architectureStyleId',
  'interiorStyleId',
  'catalogMapping',
  'pricingRegion'
] as const
type MissingFieldKey = (typeof MISSING_FIELD_KEYS)[number]

/** Ô nào cần cuộn tới khi BE báo thiếu trường không có ô riêng. */
const FIELD_ANCHOR: Partial<Record<string, string>> = {
  lotVerification: 'inputImageUrl',
  catalogMapping: 'buildingTypeId',
  pricingRegion: 'provinceCode'
}

const PACKAGE_OF_TIER: Record<PackageTier, FinishPackage> = { basic: 'Basic', standard: 'Standard', vip: 'Vip' }
const tierOf = (value: FinishPackage | null): PackageTier =>
  PACKAGE_TIERS.find((tier) => PACKAGE_OF_TIER[tier] === value) ?? 'standard'

interface StepInputPipelineFormProps {
  projectId: string
  /** Chặng 2D đã được tiếp nhận (hoặc đang chạy / đã xong): sang màn Bản vẽ 2D. */
  onStageStarted: () => void
}

/**
 * Bước 1 của luồng bốn chặng (STORY-PROJ-001, TDD-PROJ-007 mục A–D). So với biểu mẫu cũ: bỏ Diện tích, thêm kích
 * thước lô (mặt tiền × chiều sâu), cạnh có cửa vào, số phòng ngủ, gara; ảnh lô bắt buộc và được AI soi; mô tả không
 * bắt buộc, tối đa 4.000 ký tự. Tự lưu như cũ; nút cuối bấm chạy chặng Bản vẽ 2D (giữ một lượt cho cả bộ).
 */
export function StepInputPipelineForm({ projectId, onStageStarted }: StepInputPipelineFormProps) {
  const t = useTranslations('design.pipeline.input')
  const tApi = useTranslations('design.inputApi')
  const tInput = useTranslations('design.input')

  const stages = useStages(projectId)
  const plan2d = stageOf(stages.data, 'Plan2d')
  const stageLock: LockReason =
    plan2d?.status === 'Succeeded' ? 'generated' : isStageActive(plan2d?.status) ? 'generating' : null

  // Ảnh ĐÃ LƯU của bản: chỉ ảnh này mới soi được (BE đọc ảnh từ bản dự toán, không nhận ảnh từ form).
  const detailQuery = useEstimateDetail(projectId)
  const savedImageUrl = detailQuery.data?.input.inputImageUrl ?? null
  const verification = useLotVerification(projectId, savedImageUrl, { enabled: !stageLock })
  const passed = lotVerificationPassed(verification.current.data)

  const input = useEstimateInput(projectId, { pipeline: true, stageLock, lotVerificationPassed: passed })
  const run = useStageRun(projectId, 'Plan2d')
  const { draft, catalog, provinces, wards } = input
  const address = useAddressActions(input)
  const [addressUnconfirmed, setAddressUnconfirmed] = useState(false)
  const [showErrors, setShowErrors] = useState(false)
  const [serverMissing, setServerMissing] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const submittingRef = useRef(false)

  // Địa chỉ đã chọn ở cửa sổ Tạo dự án: ghi vào bản nhập MỘT lần khi bản còn trống địa chỉ (như biểu mẫu cũ).
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

  // Ảnh vừa lưu mà chưa từng soi thì tự gửi yêu cầu soi MỘT lần cho ảnh đó (BR-PROJ-015: soi ngay khi tải lên).
  const requestedForRef = useRef<string | null>(null)
  const requestVerification = verification.request.mutate
  const noVerificationYet = verification.current.isSuccess && verification.current.data === null
  useEffect(() => {
    if (!savedImageUrl || stageLock || !noVerificationYet || requestedForRef.current === savedImageUrl) return
    requestedForRef.current = savedImageUrl
    requestVerification(undefined, { onError: (error) => toast.error(verification.messageOf(error)) })
  }, [noVerificationYet, requestVerification, savedImageUrl, stageLock, verification])

  const quota = useQuery({
    queryKey: [...designKeys.quota(), 'api'],
    queryFn: () => estimateInputApi.getDesignQuota(),
    staleTime: 0
  })

  if (input.detail.isError || catalog.isError) {
    return (
      <div className='mx-auto w-full max-w-2xl px-4 py-5 text-center'>
        <p className='text-muted-foreground mb-4 text-sm'>{tApi('loadError')}</p>
        <Button
          variant='outline'
          onClick={() => {
            void input.detail.refetch()
            void catalog.refetch()
          }}
        >
          {tApi('reload')}
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
  const lock = input.lock
  const locked = lock !== null
  const disabled = locked || submitting
  const missing = [
    ...new Set([...(addressUnconfirmed ? [...input.missing, 'location'] : input.missing), ...serverMissing])
  ]
  const invalid = (field: string) => showErrors && missing.includes(field)
  const lotProblem = lotSizeProblem(draft.lotFrontageM, draft.lotDepthM)
  const imageSaving = draft.inputImageUrl !== savedImageUrl
  const entranceShown = Boolean(draft.inputImageUrl) && passed && !imageSaving

  const floorOptions: ChoiceOption[] = (type?.floorCounts ?? [])
    .filter((count) => count >= 1 && count <= 4)
    .map((count) => ({ value: String(count), label: tApi('floorCount.option', { count }) }))
  const styleOptions = (group: 'architecture' | 'interior'): ChoiceOption[] =>
    stylesFor(catalog.data, type, group).map((style) => ({
      value: style.styleId,
      label: style.name,
      imageUrl: style.imageUrl
    }))

  const missingLabels = missing.map((field) =>
    (MISSING_FIELD_KEYS as readonly string[]).includes(field) ? t(`missing.${field as MissingFieldKey}`) : field
  )
  const scrollTo = (field: string | undefined) => {
    if (!field) return
    document
      .getElementById(`field-${FIELD_ANCHOR[field] ?? field}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  async function handleSubmit() {
    if (submittingRef.current || locked) return
    submittingRef.current = true
    setShowErrors(true)
    setServerMissing([])
    setSubmitting(true)
    let releaseEdits: (() => void) | undefined
    try {
      const saved = await input.flush()
      if (!saved) return
      releaseEdits = input.freezeEdits()
      const fresh = await input.detail.refetch()
      if (fresh.isError || !fresh.data) {
        toast.error(tApi('loadError'))
        return
      }
      if (missing.length > 0) {
        scrollTo(missing[0])
        toast.error(t('missingTitle'))
        return
      }
      try {
        await run.mutateAsync(fresh.data.inputVersion)
      } catch (error) {
        const kind = run.kindOf(error)
        // Chặng đã chạy / đã xong: không phải lỗi, sang màn chặng để xem.
        if (kind === 'inProgress' || kind === 'alreadySucceeded') {
          onStageStarted()
          return
        }
        if (kind === 'invalidInput') {
          const fieldsFromServer = run.invalidFieldsOf(error)
          setServerMissing(fieldsFromServer)
          scrollTo(fieldsFromServer[0])
        }
        toast.error(run.messageOf(error))
        return
      }
      onStageStarted()
    } finally {
      releaseEdits?.()
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  const outOfQuota = quota.data
    ? quota.data.hasSubscription && !quota.data.unlimited && (quota.data.available ?? 0) <= 0
    : false

  return (
    <div className='mx-auto w-full max-w-[90rem] px-4 pt-5 pb-5 lg:px-8'>
      {!input.pipelineSupported ? (
        <div role='alert' className='border-warning/40 bg-warning/10 mb-5 flex gap-3 rounded-2xl border p-4 text-sm'>
          <AlertTriangle className='text-warning-strong size-4 shrink-0' />
          <p className='text-pretty'>{t('notSupported')}</p>
        </div>
      ) : null}

      {locked ? (
        <div
          role='alert'
          className='border-warning/40 bg-warning/10 mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 text-sm'
        >
          <p className='min-w-0 flex-1 text-pretty'>{t(`lock.${lock}`)}</p>
          {lock === 'noEdit' ? (
            <Button asChild size='sm'>
              <Link href={ROUTES.PLANS}>{tApi('lock.plans')}</Link>
            </Button>
          ) : (
            <Button asChild size='sm'>
              <Link href={designPlanRoute(projectId)}>{t('lock.viewPlan')}</Link>
            </Button>
          )}
        </div>
      ) : null}

      <fieldset disabled={disabled} className='m-0 min-w-0 border-0 p-0'>
        <div className='grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_26rem]'>
          <div className='space-y-6'>
            <SectionCard index={1} title={t('groups.lot')}>
              <div className='space-y-6'>
                <div
                  className={cn('grid gap-5', draft.inputImageUrl && 'md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]')}
                >
                  <LotImageField
                    estimateId={projectId}
                    value={draft.inputImageUrl}
                    disabled={disabled}
                    invalid={invalid('inputImageUrl') || invalid('lotVerification')}
                    entranceSide={entranceShown ? (draft.entranceSide ?? DEFAULT_ENTRANCE_SIDE) : null}
                    onUploaded={(url) => input.patch({ inputImageUrl: url })}
                    onRemove={() => input.patch({ inputImageUrl: null })}
                  />
                  {draft.inputImageUrl ? (
                    // Cùng hàng với ảnh: kết quả soi rồi tới bước xác nhận cạnh có cửa vào; nhãn trống phía trên để thẳng
                    // hàng với khung ảnh (nhãn "Ảnh lô đất" nằm ở cột trái).
                    <div className='space-y-4 md:pt-7'>
                      <LotVerificationStatus
                        view={imageSaving ? null : verification.current.data}
                        loading={!imageSaving && verification.current.isPending}
                        loadError={!imageSaving && verification.current.isError}
                        requesting={verification.request.isPending}
                        waitingForSave={imageSaving}
                        locked={locked}
                        onRequest={() =>
                          verification.request.mutate(undefined, {
                            onError: (error) => toast.error(verification.messageOf(error))
                          })
                        }
                        onReload={() => void verification.current.refetch()}
                      />
                      {entranceShown ? (
                        // Khối "Xác nhận trước khi vẽ" của app demo (BR-PROJ-002 khoản 5): cạnh cửa vào trên bản vẽ lô.
                        // Chưa bấm thì hiện Trái là mặc định nhưng không gửi; BE dùng cạnh trái và ghi nhận là mặc định.
                        // Cạnh đang áp dụng được tô ngay trên khung ảnh bên trái.
                        <div id='field-entranceSide' className='space-y-2'>
                          <p className='text-muted-foreground text-xs font-medium tracking-wide uppercase'>
                            {t('entrance.title')}
                          </p>
                          <FieldLabel hint={t('entrance.hint')}>{t('entrance.label')}</FieldLabel>
                          <ChoiceCards
                            compact
                            options={ENTRANCE_SIDES.map((side) => ({ value: side, label: t(`entrance.${side}`) }))}
                            value={draft.entranceSide ?? DEFAULT_ENTRANCE_SIDE}
                            onChange={(value) => input.patch({ entranceSide: value as EntranceSide })}
                          />
                          <p className='text-muted-foreground text-xs text-pretty'>
                            {draft.entranceSide
                              ? t('entrance.chosen', { side: t(`entrance.${draft.entranceSide}`).toLowerCase() })
                              : t('entrance.default', { side: t(`entrance.${DEFAULT_ENTRANCE_SIDE}`).toLowerCase() })}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div className='space-y-5'>
                  <div id='field-lotSize' className='max-w-md space-y-2'>
                    <FieldLabel hint={t('lotSize.hint')}>{t('lotSize.label')}</FieldLabel>
                    <div className='flex items-center gap-2'>
                      <div className='relative flex-1'>
                        <Input
                          inputMode='decimal'
                          aria-label={t('lotSize.frontage')}
                          placeholder={t('lotSize.frontage')}
                          value={draft.lotFrontageM}
                          aria-invalid={Boolean(lotProblem) || invalid('lotSize')}
                          className={cn('pr-8', (lotProblem || invalid('lotSize')) && 'border-destructive')}
                          onChange={(event) => input.patch({ lotFrontageM: event.target.value.replace(',', '.') })}
                        />
                        <span className='text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm'>
                          {t('lotSize.unit')}
                        </span>
                      </div>
                      <span className='text-muted-foreground'>×</span>
                      <div className='relative flex-1'>
                        <Input
                          inputMode='decimal'
                          aria-label={t('lotSize.depth')}
                          placeholder={t('lotSize.depth')}
                          value={draft.lotDepthM}
                          aria-invalid={Boolean(lotProblem) || invalid('lotSize')}
                          className={cn('pr-8', (lotProblem || invalid('lotSize')) && 'border-destructive')}
                          onChange={(event) => input.patch({ lotDepthM: event.target.value.replace(',', '.') })}
                        />
                        <span className='text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm'>
                          {t('lotSize.unit')}
                        </span>
                      </div>
                    </div>
                    {lotProblem ? <p className='text-destructive text-xs'>{t(`lotSize.${lotProblem}`)}</p> : null}
                  </div>

                  <div id='field-description' className='space-y-2'>
                    <FieldLabel htmlFor='description' hint={t('description.hint')}>
                      {t('description.label')}
                    </FieldLabel>
                    <Textarea
                      id='description'
                      value={draft.description}
                      placeholder={t('description.placeholder')}
                      className='h-32 resize-none'
                      onChange={(event) => {
                        // Giới hạn theo ký tự Unicode như BE (đếm rune, không đếm UTF-16).
                        const next = [...event.target.value].slice(0, PIPELINE_DESCRIPTION_MAX_LENGTH).join('')
                        input.patch({ description: next })
                      }}
                    />
                    <p className='text-muted-foreground text-right text-xs'>
                      {descriptionLength(draft.description)}/{PIPELINE_DESCRIPTION_MAX_LENGTH}
                    </p>
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard index={2} title={t('groups.scope')}>
              <div className='grid gap-5 sm:grid-cols-2'>
                <div id='field-buildingTypeId' className='space-y-2'>
                  <FieldLabel htmlFor='building-type' hint={tInput('buildingType.hint')} required>
                    {tApi('buildingType.label')}
                  </FieldLabel>
                  <Select
                    disabled={disabled}
                    value={draft.buildingTypeId ?? ''}
                    onValueChange={input.chooseBuildingType}
                  >
                    <SelectTrigger
                      id='building-type'
                      className={cn(
                        'w-full',
                        (invalid('buildingTypeId') || invalid('catalogMapping')) && 'border-destructive'
                      )}
                    >
                      <SelectValue placeholder={tApi('buildingType.placeholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {catalog.data.buildingTypes.map((option) => (
                        <SelectItem
                          key={option.buildingTypeId}
                          value={option.buildingTypeId}
                          disabled={option.aiAvailable === false}
                        >
                          {option.name}
                          {option.aiAvailable === false ? ` — ${t('notSupported')}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {invalid('catalogMapping') ||
                  catalog.data.buildingTypes.find((item) => item.buildingTypeId === draft.buildingTypeId)
                    ?.aiAvailable === false ? (
                    <p className='text-destructive text-xs'>{t('missing.catalogMapping')}</p>
                  ) : null}
                </div>

                <div id='field-desiredBedrooms' className='space-y-2'>
                  <FieldLabel htmlFor='bedrooms' hint={t('bedrooms.hint')} required>
                    {t('bedrooms.label')}
                  </FieldLabel>
                  <Select
                    disabled={disabled}
                    value={draft.desiredBedrooms === null ? '' : String(draft.desiredBedrooms)}
                    onValueChange={(value) => input.patch({ desiredBedrooms: Number(value) })}
                  >
                    <SelectTrigger
                      id='bedrooms'
                      className={cn('w-full', invalid('desiredBedrooms') && 'border-destructive')}
                    >
                      <SelectValue placeholder={t('bedrooms.placeholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: BEDROOMS_MAX - BEDROOMS_MIN + 1 }, (_, i) => BEDROOMS_MIN + i).map(
                        (count) => (
                          <SelectItem key={count} value={String(count)}>
                            {t('bedrooms.option', { count })}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {fields.floors ? (
                  <div id='field-floorCount' className='space-y-2'>
                    <FieldLabel hint={tInput('floorCount.hint')} required>
                      {tApi('floorCount.label')}
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
                      {tApi('tum.label')}
                    </FieldLabel>
                    <ChoiceCards
                      compact
                      options={[
                        { value: 'yes', label: tApi('tum.yes') },
                        { value: 'no', label: tApi('tum.no') }
                      ]}
                      value={draft.hasTum === null ? null : draft.hasTum ? 'yes' : 'no'}
                      onChange={(value) => input.patch({ hasTum: value === 'yes' })}
                      invalid={invalid('hasTum')}
                    />
                  </div>
                ) : null}

                <div id='field-hasGarage' className='space-y-2'>
                  <FieldLabel hint={t('garage.hint')}>{t('garage.label')}</FieldLabel>
                  <ChoiceCards
                    compact
                    options={[
                      { value: 'yes', label: t('garage.yes') },
                      { value: 'no', label: t('garage.no') }
                    ]}
                    value={draft.hasGarage ? 'yes' : 'no'}
                    onChange={(value) => input.patch({ hasGarage: value === 'yes' })}
                  />
                </div>

                {/* Lưới 2 cột ghép từng cặp; số ô lẻ (loại không có tum hoặc số tầng) thì gói hoàn thiện chiếm cả hàng. */}
                <div
                  id='field-finishPackage'
                  className={cn((Number(fields.floors) + Number(fields.tum)) % 2 === 1 && 'sm:col-span-2')}
                >
                  <PackageSlider
                    value={tierOf(draft.finishPackage)}
                    onChange={(tier) => input.patch({ finishPackage: PACKAGE_OF_TIER[tier] })}
                  />
                </div>
              </div>
            </SectionCard>

            <SectionCard index={3} title={tApi('groups.location')}>
              <div className='grid gap-5 sm:grid-cols-2'>
                <div id='field-provinceCode' className='space-y-2'>
                  <FieldLabel htmlFor='province' hint={tApi('province.hint')} required>
                    {tApi('province.label')}
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
                    placeholder={provinces.isPending ? tApi('loading') : tApi('province.placeholder')}
                    invalid={invalid('provinceCode') || invalid('pricingRegion')}
                  />
                  {invalid('pricingRegion') ? (
                    <p className='text-destructive text-xs'>{t('missing.pricingRegion')}</p>
                  ) : null}
                </div>

                <div id='field-wardCode' className='space-y-2'>
                  <FieldLabel htmlFor='ward' hint={tApi('ward.hint')} required>
                    {tApi('ward.label')}
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
                        ? tApi('ward.needProvince')
                        : wards.isPending
                          ? tApi('loading')
                          : tApi('ward.placeholder')
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
                  {tApi('province.loadError')}{' '}
                  <button type='button' className='font-medium underline' onClick={() => void provinces.refetch()}>
                    {tApi('reload')}
                  </button>
                </p>
              ) : null}
            </SectionCard>
          </div>

          {/* Cột phải "Thông tin bổ sung" (mục III.2): một thẻ duy nhất, bám theo khi cuộn để không để trống nửa trang. */}
          <aside className='lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto lg:overscroll-contain lg:rounded-2xl'>
            {!type ? (
              <section className='bg-card flex min-h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed p-8 text-center'>
                <Palette className='text-muted-foreground size-8' strokeWidth={1.5} />
                <h2 className='text-base font-semibold'>{tApi('extra.title')}</h2>
                <p className='text-muted-foreground max-w-xs text-sm text-pretty'>{tApi('extra.empty')}</p>
              </section>
            ) : (
              <section className='bg-card rounded-2xl border p-5 shadow-xs sm:p-6'>
                <h2 className='text-base font-semibold'>{tApi('extra.title')}</h2>
                {!fields.architecture && !fields.interior ? (
                  <p className='text-muted-foreground mt-1 text-sm'>{tApi('extra.none')}</p>
                ) : (
                  <div className='mt-5 space-y-6'>
                    {fields.architecture ? (
                      <StyleGroup
                        id='field-architectureStyleId'
                        title={tApi('style.architecture')}
                        hint={tApi('style.architectureHint')}
                      >
                        <ChoiceCards
                          className='grid-cols-2 sm:grid-cols-2'
                          options={styleOptions('architecture')}
                          value={draft.architectureStyleId}
                          onChange={(value) => input.patch({ architectureStyleId: value })}
                          invalid={invalid('architectureStyleId')}
                        />
                      </StyleGroup>
                    ) : null}
                    {fields.architecture && fields.interior ? <hr className='border-border' /> : null}
                    {fields.interior ? (
                      <StyleGroup
                        id='field-interiorStyleId'
                        title={tApi('style.interior')}
                        hint={tApi('style.interiorHint')}
                      >
                        <ChoiceCards
                          className='grid-cols-2 sm:grid-cols-2'
                          options={styleOptions('interior')}
                          value={draft.interiorStyleId}
                          onChange={(value) => input.patch({ interiorStyleId: value })}
                          invalid={invalid('interiorStyleId')}
                        />
                      </StyleGroup>
                    ) : null}
                  </div>
                )}
              </section>
            )}
          </aside>
        </div>
      </fieldset>

      <div className='mx-auto mt-8 w-full max-w-xl space-y-3'>
        {showErrors && missingLabels.length > 0 ? (
          <p className='text-destructive text-center text-xs'>
            {t('missingTitle')}: {missingLabels.join(', ')}
          </p>
        ) : null}
        {/* Trạng thái lưu nháp và lượt thiết kế còn lại chung một hàng. */}
        <div className='flex flex-wrap items-center justify-center gap-x-3 gap-y-1'>
          <SaveIndicator status={input.status} message={input.errorMessage} onRetry={() => void input.retry()} />
          {quota.data ? (
            <p className='text-foreground text-center text-xs font-medium'>
              {!quota.data.hasSubscription
                ? tApi('quota.none')
                : quota.data.unlimited
                  ? tApi('quota.unlimited')
                  : tApi('quota.plan', { remaining: quota.data.available ?? 0, total: quota.data.limit ?? 0 })}
            </p>
          ) : null}
        </div>
        <p className='text-muted-foreground text-center text-xs'>{t('quotaNote')}</p>

        {outOfQuota ? (
          <Button asChild size='lg' className='w-full'>
            <Link href={ROUTES.PLANS}>{tInput('quota.upgrade')}</Link>
          </Button>
        ) : (
          <Button
            size='lg'
            className='w-full'
            onClick={() => void handleSubmit()}
            disabled={submitting || locked || imageSaving || !input.pipelineSupported}
          >
            {submitting ? <Loader2 className='size-4 animate-spin' /> : null}
            {t('submit')}
          </Button>
        )}
      </div>
    </div>
  )
}
