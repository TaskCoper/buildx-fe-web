'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowRight, FileUp, Gift, Hammer, LoaderCircle, X } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm, type FieldPath } from 'react-hook-form'
import { useRouter } from '@/i18n/navigation'
import { useAuthStore } from '@/shared/auth'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Textarea
} from '@/shared/components/ui'
import { contractorReviewRoute, ROUTES } from '@/shared/constants/routes'
import { isApiError } from '@/shared/lib/api'
import { LocationMap } from '@/shared/components/common'
import { cn } from '@/shared/lib/utils'
import { constructionSitesApi } from '../api/construction-sites.api'
import { allConstructionSites } from '../api/construction-briefs.api'
import { briefDrafts, requireBriefUserId, siteToBrief } from '../api/brief-drafts'
import { contractorKeys } from '../api/contractors.keys'
import { useBrief } from '../hooks/use-brief'
import { useConstructionScopes } from '../hooks/use-construction-scopes'
import {
  useSiteLocations,
  useSiteOptions,
  useSiteSource,
  useSiteSources,
  useWriteConstructionSite
} from '../hooks/use-construction-sites'
import {
  applicableSiteFields,
  createSiteFormSchema,
  matchesPendingCreation,
  moneyDecimal,
  positiveDecimal,
  SITE_FILE_ACCEPT,
  SITE_FILE_LIMIT,
  SITE_FILE_MAX_BYTES,
  siteAddressKey,
  toSiteProfile
} from '../services/construction-site.service'
import type {
  AttachmentGroup,
  CreateSiteRequest,
  PendingSiteFile,
  SiteDetail,
  SiteDraft,
  SiteFormValues,
  SiteSource
} from '../types/construction-site.types'
import type { ProjectBrief } from '../types/contractor.types'
import { BriefSteps, BRIEF_STEP_TRANSITION_KEY } from './brief-steps'
import { SiteStyleField } from './site-style-field'

const EMPTY: SiteFormValues = {
  name: '',
  conditionId: '',
  budgetVnd: '',
  plannedStart: 'Within1To3Months',
  sourceEstimateId: '',
  areaM2: '',
  provinceCode: '',
  wardCode: '',
  locationDatasetVersion: '',
  addressDetail: '',
  buildingTypeId: '',
  floorCount: null,
  hasTum: null,
  architectureStyleId: null,
  interiorStyleId: null,
  scope: '',
  scopeNote: ''
}
const ERROR_CODES = [
  'ConstructionSiteNameTaken',
  'ConstructionSiteCatalogChanged',
  'ConstructionSiteConditionUnavailable',
  'ConstructionSiteSourceUnavailable',
  'ConstructionSiteSourceNotFound',
  'ConstructionSiteSourceDataInvalid',
  'ConstructionSiteSourceLocked',
  'ConstructionSiteVersionConflict',
  'ConstructionSiteHasSupervision',
  'LocationDatasetChanged',
  'DependencyUnavailable',
  'AccessForbidden',
  'ValidationError',
  'ConstructionSiteUploadUnavailable',
  'ConstructionSiteAttachmentLimitExceeded',
  'ConstructionSiteFileTooLarge',
  'ConstructionSiteFileInspectionUnavailable',
  'StoragePutFailed',
  'MapServiceUnavailable'
] as const
type StringField = Exclude<keyof SiteFormValues, 'floorCount' | 'hasTum'>

/** S10 / STORY-SITE-001,004: browser draft → atomic server creation → S11. */
export function ConstructionSiteForm({ projectId }: { projectId: string }) {
  const userId = useAuthStore((state) => state.user?.id)
  const t = useTranslations('contractors.siteForm')
  const old = useTranslations('contractors.brief')
  const scopes = useConstructionScopes()
  const starts = useTranslations('contractors.startWindow')
  const validation = useTranslations('validation')
  const locale = useLocale()
  const router = useRouter()
  const search = useSearchParams()
  const client = useQueryClient()
  const briefQuery = useBrief(projectId)
  const site = briefQuery.data?.constructionSite
  const [persistedId, setPersistedId] = useState<string>()
  const siteId = site?.constructionSiteId ?? persistedId ?? briefQuery.data?.constructionSiteId
  const pinnedOptions = useSiteOptions(siteId)
  const currentOptions = useSiteOptions()
  const [selectedSource, setSelectedSource] = useState('')
  const sources = useSiteSources(!siteId)
  const sourceQuery = useSiteSource(selectedSource, !siteId)
  const source = sourceQuery.data
  const [draftSource, setDraftSource] = useState<SiteSource>()
  const catalog = source?.catalog ?? (selectedSource ? draftSource?.catalog : undefined) ?? pinnedOptions.data
  const activeCatalog = useMemo(
    () =>
      catalog
        ? {
            ...catalog,
            conditions: [
              ...(currentOptions.data?.conditions ?? catalog.conditions),
              ...(site &&
              !(currentOptions.data?.conditions ?? catalog.conditions).some((item) => item.id === site.conditionId)
                ? [
                    {
                      id: site.conditionId,
                      name: site.conditionName,
                      displayOrder: -1,
                      isSelectable: false,
                      version: 1
                    }
                  ]
                : [])
            ]
          }
        : undefined,
    [catalog, currentOptions.data, site]
  )
  const formSchema = useMemo(
    () =>
      createSiteFormSchema(
        activeCatalog,
        {
          required: validation('required'),
          area: t('areaError'),
          budget: t('budgetError'),
          max: (max) => validation('maxLength', { max })
        },
        [
          ...scopes.options.map((option) => option.id),
          briefQuery.data?.scope ?? '',
          briefQuery.data?.siteDraft?.values.scope ?? ''
        ].filter(Boolean)
      ),
    [activeCatalog, scopes.options, briefQuery.data?.scope, briefQuery.data?.siteDraft?.values.scope, validation, t]
  )
  const form = useForm<SiteFormValues>({ defaultValues: EMPTY, resolver: zodResolver(formSchema) })
  // RHF owns the form state; these subscriptions intentionally bypass React Compiler memoization.
  // eslint-disable-next-line react-hooks/incompatible-library
  const values = form.watch()
  const { isDirty } = form.formState
  const applies = applicableSiteFields(catalog?.types.find((type) => type.id === values.buildingTypeId))
  const locked = Boolean(site && (!site.canEdit || site.sourceEstimateId)) || Boolean(selectedSource)
  const disabled = Boolean(site && !site.canEdit)
  const locations = useSiteLocations(values.provinceCode, values.locationDatasetVersion, !locked && !disabled)
  const [uploads, setUploads] = useState<PendingSiteFile[]>([])
  const [location, setLocation] = useState<SiteDraft['location']>()
  const [pendingCreation, setPendingCreation] = useState<SiteDraft['pendingCreation']>()
  const [suggestions, setSuggestions] = useState<Awaited<ReturnType<typeof constructionSitesApi.search>>>([])
  const [geoBusy, setGeoBusy] = useState(false)
  const [geoError, setGeoError] = useState('')
  const [busy, setBusy] = useState(false)
  const [fileBusy, setFileBusy] = useState(false)
  const [error, setError] = useState('')
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [versionConflict, setVersionConflict] = useState(false)
  const saving = useWriteConstructionSite()
  const formLoaded = useRef(false)
  const latestValues = useRef(values)
  latestValues.current = values
  const geoController = useRef<AbortController | null>(null)
  const uploadLock = useRef(false)
  const submitLock = useRef(false)
  const sourceApplied = useRef('')
  const key = siteAddressKey(values)
  const addressNames = locked
    ? {
        province: site?.provinceName ?? source?.provinceName ?? draftSource?.provinceName,
        ward: site?.wardName ?? source?.wardName ?? draftSource?.wardName
      }
    : {
        province: locations.provinces.data?.provinces.find((item) => item.code === values.provinceCode)?.name,
        ward: locations.wards.data?.wards.find((item) => item.code === values.wardCode)?.name
      }
  const addressText = [values.addressDetail.trim(), addressNames.ward, addressNames.province].filter(Boolean).join(', ')

  const explainError = (problem: unknown): string => {
    const code = isApiError(problem)
      ? (problem.code ?? problem.messageCode)
      : problem instanceof Error
        ? problem.message
        : undefined
    const known = ERROR_CODES.find((item) => item === code)
    return known
      ? t(`errors.${known}`)
      : isApiError(problem) && problem.status === 403
        ? t('errors.AccessForbidden')
        : t('errors.generic')
  }

  useEffect(() => {
    if (!briefQuery.data || formLoaded.current) return
    formLoaded.current = true
    const brief = briefQuery.data
    const draft = brief.siteDraft
    const detail = brief.constructionSite
    if (detail) {
      form.reset({
        ...EMPTY,
        ...detail.profile,
        name: detail.name,
        conditionId: detail.conditionId,
        budgetVnd: detail.budgetVnd,
        plannedStart: detail.plannedStart,
        sourceEstimateId: detail.sourceEstimateId ?? '',
        scope: brief.scope,
        scopeNote: brief.scopeNote
      })
      setLocation({
        addressKey: siteAddressKey(detail.profile),
        latitude: detail.latitude,
        longitude: detail.longitude,
        display: detail.address
      })
    } else if (draft) {
      form.reset(draft.values)
      setSelectedSource(draft.values.sourceEstimateId)
      setDraftSource(draft.source)
      setLocation(draft.location)
      setUploads(draft.uploads)
      setPendingCreation(draft.pendingCreation)
    } else form.reset({ ...EMPTY, name: brief.name, scope: brief.scope, scopeNote: brief.scopeNote })
  }, [briefQuery.data, form])

  useEffect(() => {
    if (!source || source.estimateId !== selectedSource || sourceApplied.current === selectedSource) return
    sourceApplied.current = selectedSource
    const current = form.getValues()
    form.reset({ ...current, ...source.profile, sourceEstimateId: selectedSource }, { keepDirty: true })
    setDraftSource(source)
    setLocation(undefined)
    setSuggestions([])
  }, [source, selectedSource, form])

  useEffect(() => {
    geoController.current?.abort()
    setSuggestions([])
    setGeoError('')
    setGeoBusy(false)
    // Coordinates are keyed to all address parts; a late response never authorizes a changed address.
  }, [key])
  // Chỉ tìm sau khi người dùng gõ; phản hồi cũ không được xác nhận địa chỉ mới.
  useEffect(() => {
    if (disabled || site?.sourceEstimateId || location?.addressKey === key) return
    if (!values.addressDetail.trim() || !values.provinceCode || !values.wardCode) return
    const text = addressText.trim()
    if (text.length < 3 || text.length > 500) return
    const controller = new AbortController()
    geoController.current?.abort()
    geoController.current = controller
    const timer = window.setTimeout(async () => {
      if (controller.signal.aborted) return
      setGeoBusy(true)
      setGeoError('')
      try {
        const results = await constructionSitesApi.search(text, controller.signal)
        if (controller.signal.aborted || siteAddressKey(latestValues.current) !== key) return
        setSuggestions(results)
        if (!results.length) setGeoError(t('noLocation'))
      } catch {
        if (!controller.signal.aborted) setGeoError(t('errors.MapServiceUnavailable'))
      } finally {
        if (!controller.signal.aborted) setGeoBusy(false)
      }
    }, 400)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [
    addressText,
    key,
    disabled,
    site?.sourceEstimateId,
    location?.addressKey,
    values.addressDetail,
    values.provinceCode,
    values.wardCode,
    t
  ])
  useEffect(() => () => geoController.current?.abort(), [])
  useEffect(() => {
    const focus = search.get('focus')
    if (!briefQuery.isPending && focus) document.getElementById(`site-${focus}`)?.scrollIntoView({ block: 'center' })
  }, [search, briefQuery.isPending])

  function localBrief(draftValues = form.getValues(), nextSite?: SiteDetail): ProjectBrief {
    requireBriefUserId(userId)
    const current = briefDrafts.get(projectId) ?? briefQuery.data ?? briefDrafts.empty(projectId)
    const next: ProjectBrief = {
      ...current,
      userId,
      name: draftValues.name,
      buildingType: catalog?.types.find((type) => type.id === draftValues.buildingTypeId)?.name ?? current.buildingType,
      landArea: Number(draftValues.areaM2.replace(',', '.')) || 0,
      budget: Number(moneyDecimal(draftValues.budgetVnd)) || 0,
      hasAttic: draftValues.hasTum,
      selfCreated: !draftValues.sourceEstimateId,
      address: {
        provinceCode: draftValues.provinceCode ? Number(draftValues.provinceCode) : null,
        wardCode: draftValues.wardCode ? Number(draftValues.wardCode) : null,
        provinceName: addressNames.province ?? current.address.provinceName,
        wardName: addressNames.ward ?? current.address.wardName,
        street: draftValues.addressDetail
      },
      scope: draftValues.scope,
      scopeName: draftValues.scope
        ? scopes.label(draftValues.scope, draftValues.scope === current.scope ? current.scopeName : undefined)
        : undefined,
      scopeNote: draftValues.scopeNote,
      constructionSiteId: nextSite?.constructionSiteId ?? siteId,
      siteDraft: { values: draftValues, catalog, source: source ?? draftSource, location, uploads, pendingCreation },
      updatedAt: new Date().toISOString()
    }
    return nextSite
      ? {
          ...siteToBrief(nextSite, next, projectId, userId),
          siteDraft: { ...next.siteDraft!, uploads: [], pendingCreation: undefined }
        }
      : next
  }
  function saveDraft() {
    try {
      briefDrafts.put(localBrief())
      return true
    } catch {
      setError(t('errors.localSave'))
      return false
    }
  }

  async function searchAddress() {
    if (!values.addressDetail.trim() || !values.provinceCode || !values.wardCode) {
      setGeoError(t('addressFirst'))
      return
    }
    if (!addressText.trim() || addressText.trim().length > 500) {
      setGeoError(t('searchLength'))
      return
    }
    geoController.current?.abort()
    const controller = new AbortController()
    geoController.current = controller
    const addressKey = key
    setGeoBusy(true)
    setGeoError('')
    try {
      const results = await constructionSitesApi.search(addressText.trim(), controller.signal)
      if (controller.signal.aborted || siteAddressKey(latestValues.current) !== addressKey) return
      setSuggestions(results)
      if (!results.length) setGeoError(t('noLocation'))
    } catch (problem) {
      if (!controller.signal.aborted) setGeoError(explainError(problem))
    } finally {
      if (!controller.signal.aborted) setGeoBusy(false)
    }
  }
  async function choosePlace(refId: string) {
    geoController.current?.abort()
    const controller = new AbortController()
    geoController.current = controller
    const addressKey = key
    setGeoBusy(true)
    setGeoError('')
    try {
      const result = await constructionSitesApi.place(refId, controller.signal)
      if (controller.signal.aborted || siteAddressKey(latestValues.current) !== addressKey) return
      setLocation({ addressKey, latitude: result.latitude, longitude: result.longitude, display: result.display })
      setSuggestions([])
    } catch (problem) {
      if (!controller.signal.aborted) setGeoError(explainError(problem))
    } finally {
      if (!controller.signal.aborted) setGeoBusy(false)
    }
  }
  async function refreshSite(id: string) {
    const detail = await constructionSitesApi.detail(id)
    const brief = briefDrafts.put(localBrief(form.getValues(), detail))
    client.setQueryData(contractorKeys.brief(projectId, userId), brief)
    return detail
  }
  async function finish(id: string) {
    setPersistedId(id)
    await refreshSite(id)
    setUploads([])
    setPendingCreation(undefined)
    sessionStorage.setItem(BRIEF_STEP_TRANSITION_KEY, projectId)
    router.push(contractorReviewRoute(projectId))
  }
  async function submit(input: SiteFormValues) {
    if (submitLock.current || fileBusy || pendingCreation || versionConflict) return
    if (scopes.isPending || scopes.isError) {
      setError(t('scopeLoadError'))
      return
    }
    if (
      !catalog ||
      (selectedSource && (sourceQuery.isFetching || sourceQuery.isError || sourceApplied.current !== selectedSource))
    ) {
      setError(t('sourceNotReady'))
      return
    }
    if (!site?.sourceEstimateId && (!location || location.addressKey !== siteAddressKey(input) || geoBusy)) {
      setGeoError(t('chooseLocation'))
      document.getElementById('site-location')?.scrollIntoView({ block: 'center' })
      return
    }
    submitLock.current = true
    setBusy(true)
    setError('')
    let creationStarted = false
    try {
      const draft = localBrief(input)
      briefDrafts.put(draft)
      if (siteId) {
        if (!site) {
          await finish(siteId)
          return
        }
        if (disabled) {
          await finish(siteId)
          return
        }
        await saving.mutateAsync({
          kind: 'update',
          id: siteId,
          request: {
            name: input.name.trim(),
            conditionId: input.conditionId,
            budgetVnd: moneyDecimal(input.budgetVnd),
            plannedStart: input.plannedStart,
            expectedVersion: site.version,
            ...(site.sourceEstimateId
              ? {}
              : {
                  profile: toSiteProfile(input, catalog),
                  latitude: location!.latitude,
                  longitude: location!.longitude
                })
          }
        })
        await finish(siteId)
        return
      }
      const request: CreateSiteRequest = {
        name: input.name.trim(),
        conditionId: input.conditionId,
        budgetVnd: moneyDecimal(input.budgetVnd),
        plannedStart: input.plannedStart,
        latitude: location!.latitude,
        longitude: location!.longitude,
        uploadIds: uploads.map((item) => item.uploadId),
        ...(selectedSource
          ? { sourceEstimateId: selectedSource }
          : { profile: toSiteProfile(input, catalog), expectedCatalogRevisionId: catalog.catalogRevisionId })
      }
      const attempt = { request, startedAt: new Date().toISOString() }
      briefDrafts.put({ ...draft, siteDraft: { ...draft.siteDraft!, pendingCreation: attempt } })
      setPendingCreation(attempt)
      creationStarted = true
      const created = await saving.mutateAsync({ kind: 'create', request })
      // Persist the server identity before reading detail or navigating, to avoid a second POST.
      setPersistedId(created.constructionSiteId)
      briefDrafts.put({
        ...draft,
        constructionSiteId: created.constructionSiteId,
        siteDraft: { ...draft.siteDraft!, pendingCreation: undefined }
      })
      setPendingCreation(undefined)
      await finish(created.constructionSiteId)
    } catch (problem) {
      const message = explainError(problem)
      setError(message)
      const definitiveFailure = isApiError(problem) && problem.status >= 400 && problem.status < 500
      if (creationStarted && definitiveFailure) {
        setPendingCreation(undefined)
        const draft = briefDrafts.get(projectId)
        if (draft?.siteDraft)
          briefDrafts.put({ ...draft, siteDraft: { ...draft.siteDraft, pendingCreation: undefined } })
      }
      if (isApiError(problem)) {
        if (problem.code === 'ConstructionSiteNameTaken') form.setError('name', { message })
        if (
          problem.code === 'ConstructionSiteCatalogChanged' ||
          problem.code === 'ConstructionSiteConditionUnavailable'
        ) {
          await pinnedOptions.refetch()
          await currentOptions.refetch()
        }
        if (problem.code === 'LocationDatasetChanged') {
          await locations.provinces.refetch()
          form.setValue('provinceCode', '')
          form.setValue('wardCode', '')
          form.setValue('locationDatasetVersion', '')
          setLocation(undefined)
        }
        if (problem.code === 'ConstructionSiteSourceUnavailable') {
          await sources.refetch()
          await sourceQuery.refetch()
        }
        if (problem.code === 'ConstructionSiteVersionConflict') setVersionConflict(true)
        if (problem.code === 'ConstructionSiteHasSupervision') await briefQuery.refetch()
        for (const [field, messages] of Object.entries(problem.errors ?? {})) {
          const name = field.replace(/^profile\./i, '').replace(/^./, (char) => char.toLowerCase())
          if (name in EMPTY) form.setError(name as FieldPath<SiteFormValues>, { message: messages.join(' ') })
        }
      }
    } finally {
      submitLock.current = false
      setBusy(false)
    }
  }
  async function reconcile() {
    if (!pendingCreation || submitLock.current) return
    submitLock.current = true
    setBusy(true)
    setError('')
    try {
      const sites = await allConstructionSites()
      const recovered = sites.find((item) =>
        matchesPendingCreation(item, pendingCreation.request, pendingCreation.startedAt)
      )
      if (recovered) await finish(recovered.constructionSiteId)
      else {
        setPendingCreation(undefined)
        const draft = briefDrafts.get(projectId)
        if (draft?.siteDraft)
          briefDrafts.put({ ...draft, siteDraft: { ...draft.siteDraft, pendingCreation: undefined } })
        setError(t('notCreated'))
      }
    } catch (problem) {
      setError(explainError(problem))
    } finally {
      submitLock.current = false
      setBusy(false)
    }
  }
  async function addFiles(files: FileList | null) {
    if (!files || uploadLock.current || disabled || pendingCreation || busy) return
    uploadLock.current = true
    setFileBusy(true)
    setError('')
    const added: PendingSiteFile[] = []
    try {
      let count = (site?.files.length ?? 0) + uploads.length
      let currentSite = site
      for (const file of Array.from(files)) {
        if (count >= SITE_FILE_LIMIT) {
          setError(t('files.limit'))
          break
        }
        const extension = '.' + (file.name.split('.').pop()?.toLowerCase() ?? '')
        const group: AttachmentGroup = SITE_FILE_ACCEPT.ConditionPhoto.split(',').includes(extension)
          ? 'ConditionPhoto'
          : 'Drawing'
        if (!SITE_FILE_ACCEPT[group].split(',').includes(extension) || file.size <= 0) {
          setError(t('files.type'))
          continue
        }
        if (file.size > SITE_FILE_MAX_BYTES) {
          setError(t('files.size'))
          continue
        }
        const result = await constructionSitesApi.upload(file, group, siteId)
        if (siteId) {
          if (!currentSite) currentSite = await constructionSitesApi.detail(siteId)
          await constructionSitesApi.attach(siteId, result.uploadId, currentSite.version)
          currentSite = await refreshSite(siteId)
        } else added.push(result)
        count++
      }
    } catch (problem) {
      setError(explainError(problem))
      if (siteId) await briefQuery.refetch()
    } finally {
      if (added.length) {
        const next = [...uploads, ...added]
        setUploads(next)
        try {
          const draft = localBrief()
          briefDrafts.put({ ...draft, siteDraft: { ...draft.siteDraft!, uploads: next } })
        } catch {
          setError(t('errors.localSave'))
        }
      }
      uploadLock.current = false
      setFileBusy(false)
    }
  }
  async function removeFile(id: string, attached: boolean) {
    if (uploadLock.current || pendingCreation || disabled || busy) return
    uploadLock.current = true
    setFileBusy(true)
    try {
      if (attached && site) {
        await constructionSitesApi.removeFile(site.constructionSiteId, id, site.version)
        await refreshSite(site.constructionSiteId)
      } else {
        const next = uploads.filter((item) => item.uploadId !== id)
        setUploads(next)
        const draft = localBrief()
        briefDrafts.put({ ...draft, siteDraft: { ...draft.siteDraft!, uploads: next } })
      }
    } catch (problem) {
      setError(explainError(problem))
      if (siteId) await briefQuery.refetch()
    } finally {
      uploadLock.current = false
      setFileBusy(false)
    }
  }

  function textField(
    name: StringField,
    label: string,
    options: {
      placeholder?: string
      disabled?: boolean
      maxLength?: number
      inputMode?: 'decimal' | 'numeric'
      multiline?: boolean
    } = {}
  ) {
    return (
      <FormField
        key={name}
        control={form.control}
        name={name}
        render={({ field }) => (
          <FormItem id={`site-field-${name}`}>
            <FormLabel>
              {label}
              <span className='text-destructive' aria-hidden>
                {' '}
                *
              </span>
            </FormLabel>
            <FormControl>
              {options.multiline ? (
                <Textarea
                  {...field}
                  value={String(field.value ?? '')}
                  maxLength={options.maxLength}
                  placeholder={options.placeholder}
                  disabled={options.disabled}
                  rows={8}
                  className='min-h-44'
                />
              ) : (
                <Input {...field} value={String(field.value ?? '')} {...options} />
              )}
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    )
  }
  function selectField(
    name: keyof SiteFormValues,
    label: string,
    options: { value: string; label: string }[],
    isDisabled = false
  ) {
    return (
      <FormField
        key={name}
        control={form.control}
        name={name}
        render={({ field }) => (
          <FormItem id={`site-field-${name}`}>
            <FormLabel>
              {label}
              <span className='text-destructive' aria-hidden>
                {' '}
                *
              </span>
            </FormLabel>
            <Select
              value={field.value === null ? '' : String(field.value)}
              disabled={isDisabled}
              onValueChange={(value) => {
                field.onChange(name === 'floorCount' ? Number(value) : name === 'hasTum' ? value === 'true' : value)
                if (name === 'provinceCode') {
                  form.setValue('wardCode', '')
                  form.setValue('locationDatasetVersion', locations.provinces.data?.datasetVersion ?? '')
                }
                if (name === 'buildingTypeId') {
                  form.setValue('floorCount', null)
                  form.setValue('hasTum', null)
                  form.setValue('architectureStyleId', null)
                  form.setValue('interiorStyleId', null)
                }
              }}
            >
              <FormControl>
                <SelectTrigger className='w-full'>
                  <SelectValue placeholder={t('select')} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {options.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    )
  }

  if (briefQuery.isPending || pinnedOptions.isPending)
    return (
      <div className='mx-auto max-w-[90rem] px-4 py-8'>
        <Skeleton className='h-96 rounded-2xl' />
      </div>
    )
  if (briefQuery.isError || pinnedOptions.isError || !catalog)
    return (
      <div className='mx-auto max-w-[90rem] space-y-4 px-4 py-8' role='alert'>
        <p>{explainError(briefQuery.error ?? pinnedOptions.error)}</p>
        <Button
          onClick={() => {
            void briefQuery.refetch()
            void pinnedOptions.refetch()
          }}
        >
          {t('retry')}
        </Button>
      </div>
    )
  const startLabels = {
    ASAP: 'asap',
    Within1To3Months: 'in-1-3-months',
    Within3To6Months: 'in-3-6-months',
    Undecided: 'undecided'
  } as const
  const buildingType = catalog.types.find((type) => type.id === values.buildingTypeId)
  const allBusy = busy || fileBusy
  const totalFiles = uploads.length + (site?.files.length ?? 0)
  const progressFields = [
    Boolean(values.name.trim()),
    Boolean(values.buildingTypeId),
    positiveDecimal(values.areaM2, 'area'),
    Boolean(values.conditionId),
    Boolean(values.provinceCode),
    Boolean(values.wardCode),
    Boolean(values.addressDetail.trim()),
    positiveDecimal(values.budgetVnd, 'money'),
    Boolean(values.scopeNote.trim()),
    Boolean(location?.addressKey === key)
  ]
  if (applies.floor) progressFields.push(values.floorCount !== null)
  if (applies.tum) progressFields.push(values.hasTum !== null)
  if (applies.architecture) progressFields.push(Boolean(values.architectureStyleId))
  if (applies.interior) progressFields.push(Boolean(values.interiorStyleId))
  const sourceItems = sources.data?.pages.flatMap((page) => page.items) ?? []

  return (
    <div className='mx-auto w-full max-w-[90rem] space-y-6 px-4 py-5 lg:px-8'>
      <div className='flex items-center justify-between'>
        <span className='bg-accent text-primary-strong inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium'>
          <Gift className='size-4' />
          {old('badge')}
        </span>
        <Button variant='ghost' size='icon' aria-label={old('close')} onClick={() => setLeaveOpen(true)}>
          <X className='size-4' />
        </Button>
      </div>
      <header className='space-y-1'>
        <h1 className='text-2xl font-semibold sm:text-3xl'>{old('title')}</h1>
        <p className='text-muted-foreground'>{old('subtitle')}</p>
      </header>
      <BriefSteps current={1} progress={progressFields.filter(Boolean).length / progressFields.length} />
      {disabled ? (
        <p className='bg-muted rounded-xl p-4' role='status'>
          {t('locked')}
        </p>
      ) : null}
      <Form {...form}>
        <form
          onBlur={() => {
            if (isDirty && !submitLock.current && !fileBusy && !pendingCreation) saveDraft()
          }}
          onSubmit={form.handleSubmit(submit, (errors) => {
            const name = Object.keys(errors)[0]
            document.getElementById(`site-field-${name}`)?.scrollIntoView({ block: 'center' })
          })}
          className='bg-card rounded-2xl border p-5 shadow-sm sm:p-6'
        >
          <fieldset
            disabled={allBusy || Boolean(pendingCreation) || versionConflict}
            className='grid min-w-0 gap-8 lg:grid-cols-2'
          >
            <section id='site-site' className='min-w-0 space-y-5 lg:border-r lg:pr-8'>
              <div>
                <h2 className='font-semibold uppercase'>{t('projectTitle')}</h2>
                <p className='text-muted-foreground text-sm'>{t('requiredHint')}</p>
              </div>
              <div className='space-y-2'>
                <FormLabel htmlFor='site-source'>{t('source')}</FormLabel>
                <Select
                  value={selectedSource || values.sourceEstimateId || 'none'}
                  disabled={Boolean(siteId) || sources.isPending}
                  onValueChange={(value) => {
                    const next = value === 'none' ? '' : value
                    setSelectedSource(next)
                    sourceApplied.current = ''
                    setDraftSource(undefined)
                    setLocation(undefined)
                    setSuggestions([])
                    form.reset(
                      {
                        ...form.getValues(),
                        areaM2: '',
                        provinceCode: '',
                        wardCode: '',
                        locationDatasetVersion: '',
                        addressDetail: '',
                        buildingTypeId: '',
                        floorCount: null,
                        hasTum: null,
                        architectureStyleId: null,
                        interiorStyleId: null,
                        sourceEstimateId: next
                      },
                      { keepDirty: true }
                    )
                  }}
                >
                  <SelectTrigger id='site-source' className='w-full'>
                    <SelectValue placeholder={t('independent')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='none'>{t('independent')}</SelectItem>
                    {sourceItems.map((item) => (
                      <SelectItem key={item.estimateId} value={item.estimateId}>
                        {item.name}
                      </SelectItem>
                    ))}
                    {site?.sourceEstimateId &&
                    !sourceItems.some((item) => item.estimateId === site.sourceEstimateId) ? (
                      <SelectItem value={site.sourceEstimateId}>{t('linkedSource')}</SelectItem>
                    ) : null}
                  </SelectContent>
                </Select>
                {sources.hasNextPage ? (
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    disabled={sources.isFetchingNextPage}
                    onClick={() => void sources.fetchNextPage()}
                  >
                    {t('moreSources')}
                  </Button>
                ) : null}
                <p className='text-muted-foreground text-xs'>
                  {selectedSource || site?.sourceEstimateId ? t('sourceLocked') : t('sourceHint')}
                </p>
                {sources.isError ? (
                  <p role='alert' className='text-destructive text-sm'>
                    {explainError(sources.error)}{' '}
                    <Button type='button' variant='link' onClick={() => void sources.refetch()}>
                      {t('retry')}
                    </Button>
                  </p>
                ) : null}
                {sourceQuery.isFetching ? <p role='status'>{t('sourceLoading')}</p> : null}
                {sourceQuery.isError ? (
                  <p role='alert' className='text-destructive text-sm'>
                    {explainError(sourceQuery.error)}{' '}
                    <Button
                      type='button'
                      variant='link'
                      onClick={() => {
                        sourceApplied.current = ''
                        void sourceQuery.refetch()
                      }}
                    >
                      {t('retry')}
                    </Button>
                  </p>
                ) : null}
              </div>
              <div className='grid gap-4 sm:grid-cols-2'>
                {textField('name', t('name'), { maxLength: 200, placeholder: t('namePlaceholder'), disabled })}
                {selectField(
                  'buildingTypeId',
                  t('buildingType'),
                  catalog.types.map((type) => ({ value: type.id, label: type.name })),
                  locked
                )}
              </div>
              {textField('areaM2', t('area'), { inputMode: 'decimal', placeholder: '120', disabled: locked })}
              <FormField
                control={form.control}
                name='conditionId'
                render={({ field }) => (
                  <FormItem id='site-field-conditionId'>
                    <FormLabel>
                      {t('condition')}
                      <span className='text-destructive' aria-hidden>
                        {' '}
                        *
                      </span>
                    </FormLabel>
                    <div role='group' aria-label={t('condition')} className='flex flex-wrap gap-2'>
                      {activeCatalog?.conditions.map((condition) => (
                        <Button
                          type='button'
                          key={condition.id}
                          variant={field.value === condition.id ? 'secondary' : 'outline'}
                          disabled={disabled || (!condition.isSelectable && condition.id !== site?.conditionId)}
                          aria-pressed={field.value === condition.id}
                          className='h-auto max-w-full whitespace-normal text-left'
                          onClick={() => field.onChange(condition.id)}
                        >
                          {condition.name}
                        </Button>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {applies.floor || applies.tum ? (
                <div className='grid gap-4 sm:grid-cols-2'>
                  {applies.floor
                    ? selectField(
                        'floorCount',
                        t('floors'),
                        (buildingType?.floorCounts ?? []).map((value) => ({
                          value: String(value),
                          label: t('floorLabel', { count: value })
                        })),
                        locked
                      )
                    : null}
                  {applies.tum
                    ? selectField(
                        'hasTum',
                        t('tum'),
                        [
                          { value: 'true', label: t('yesTum') },
                          { value: 'false', label: t('noTum') }
                        ],
                        locked
                      )
                    : null}
                </div>
              ) : null}
              <div className='grid gap-4 sm:grid-cols-2'>
                {locked ? (
                  <>
                    <div>
                      <p className='text-sm font-medium'>{t('province')}</p>
                      <p className='bg-muted mt-2 rounded-lg border px-3 py-2 text-sm'>{addressNames.province}</p>
                    </div>
                    <div>
                      <p className='text-sm font-medium'>{t('ward')}</p>
                      <p className='bg-muted mt-2 rounded-lg border px-3 py-2 text-sm'>{addressNames.ward}</p>
                    </div>
                  </>
                ) : (
                  <>
                    {selectField(
                      'provinceCode',
                      t('province'),
                      locations.provinces.data?.provinces.map((item) => ({ value: item.code, label: item.name })) ?? [],
                      locations.provinces.isPending
                    )}
                    {selectField(
                      'wardCode',
                      t('ward'),
                      locations.wards.data?.wards.map((item) => ({ value: item.code, label: item.name })) ?? [],
                      !values.provinceCode || locations.wards.isPending
                    )}
                  </>
                )}
              </div>
              {locations.provinces.isError || locations.wards.isError ? (
                <p role='alert' className='text-destructive text-sm'>
                  {t('locationsError')}{' '}
                  <Button
                    type='button'
                    variant='link'
                    onClick={() => {
                      void locations.provinces.refetch()
                      if (values.provinceCode) void locations.wards.refetch()
                    }}
                  >
                    {t('retry')}
                  </Button>
                </p>
              ) : null}
              <FormField
                control={form.control}
                name='addressDetail'
                render={({ field }) => (
                  <FormItem id='site-field-addressDetail'>
                    <FormLabel htmlFor='site-address-detail'>
                      {t('street')}{' '}
                      <span className='text-destructive' aria-hidden>
                        *
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        id='site-address-detail'
                        maxLength={500}
                        placeholder={t('streetPlaceholder')}
                        disabled={locked}
                        autoComplete='off'
                        aria-controls='site-location-suggestions'
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault()
                            void searchAddress()
                          }
                          if (event.key === 'Escape') {
                            geoController.current?.abort()
                            setGeoBusy(false)
                            setSuggestions([])
                          }
                        }}
                        onChange={(event) => {
                          geoController.current?.abort()
                          setGeoBusy(false)
                          setSuggestions([])
                          setGeoError('')
                          setLocation(undefined)
                          field.onChange(event)
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div id='site-location' className='space-y-2'>
                {geoBusy ? (
                  <p role='status' className='text-muted-foreground text-xs'>
                    {t('locating')}
                  </p>
                ) : null}
                {suggestions.length ? (
                  <ul
                    id='site-location-suggestions'
                    aria-label={t('locationSearch')}
                    className='max-h-64 space-y-1 overflow-y-auto rounded-xl border bg-background p-2'
                  >
                    {suggestions.map((item) => (
                      <li key={item.refId}>
                        <Button
                          className='h-auto w-full justify-start whitespace-normal text-left'
                          variant='ghost'
                          type='button'
                          onClick={() => void choosePlace(item.refId)}
                          disabled={geoBusy}
                        >
                          {item.display}
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <LocationMap
                  latitude={location?.addressKey === key ? location.latitude : null}
                  longitude={location?.addressKey === key ? location.longitude : null}
                  onChange={
                    !disabled && !site?.sourceEstimateId && !geoBusy && location?.addressKey === key
                      ? (latitude, longitude) => {
                          setLocation((current) =>
                            current?.addressKey === siteAddressKey(latestValues.current)
                              ? { ...current, latitude, longitude }
                              : current
                          )
                        }
                      : undefined
                  }
                />
                <p className='text-muted-foreground text-xs'>
                  {t(
                    disabled || site?.sourceEstimateId
                      ? 'mapReadOnly'
                      : location?.addressKey === key
                        ? 'mapAdjustHint'
                        : 'addressSearchHint'
                  )}
                </p>
                {geoError ? (
                  <p role='alert' className='text-destructive text-sm'>
                    {geoError}
                  </p>
                ) : null}
              </div>
              <div className='grid gap-4 sm:grid-cols-2'>
                {textField('budgetVnd', t('budget'), { inputMode: 'numeric', placeholder: '1.850.000.000', disabled })}
                {selectField(
                  'plannedStart',
                  t('start'),
                  catalog.plannedStarts.map((value) => ({ value, label: starts(startLabels[value]) })),
                  disabled
                )}
              </div>
              <section id='site-documents' className='space-y-3'>
                <h3 className='text-sm font-semibold uppercase'>
                  {t('files.title')}{' '}
                  <span className='text-muted-foreground font-normal normal-case'>{t('optional')}</span>
                </h3>
                <p className='text-muted-foreground text-xs'>{t('files.hint', { count: totalFiles })}</p>
                <div className='rounded-xl border border-dashed p-4'>
                  <Input
                    id='site-files'
                    aria-label={t('files.title')}
                    aria-describedby='site-files-formats'
                    type='file'
                    accept={SITE_FILE_ACCEPT.Drawing}
                    multiple
                    className='hidden'
                    disabled={disabled || totalFiles >= SITE_FILE_LIMIT || fileBusy}
                    onChange={(event) => {
                      void addFiles(event.target.files)
                      event.target.value = ''
                    }}
                  />
                  <Button
                    type='button'
                    variant='outline'
                    disabled={disabled || totalFiles >= SITE_FILE_LIMIT || fileBusy}
                    onClick={() => document.getElementById('site-files')?.click()}
                  >
                    <FileUp className='size-4' />
                    {t('files.choose')}
                  </Button>
                  <p id='site-files-formats' className='text-muted-foreground mt-2 text-xs'>
                    {t('files.formats')}
                  </p>
                </div>
                {fileBusy ? (
                  <p className='flex items-center gap-2 text-sm' role='status'>
                    <LoaderCircle className='size-4 animate-spin' />
                    {t('files.uploading')}
                  </p>
                ) : null}
                <ul className='space-y-2'>
                  {[
                    ...(site?.files.map((file) => ({
                      id: file.id,
                      name: file.originalName,
                      sizeBytes: file.sizeBytes,
                      group: file.attachmentGroup,
                      attached: true
                    })) ?? []),
                    ...uploads.map((file) => ({
                      id: file.uploadId,
                      name: file.name,
                      sizeBytes: file.sizeBytes,
                      group: file.attachmentGroup,
                      attached: false
                    }))
                  ].map((file) => (
                    <li key={file.id} className='flex min-w-0 items-center gap-2 rounded-lg border p-3'>
                      <div className='min-w-0 flex-1'>
                        <p className='truncate text-sm' title={file.name}>
                          {file.name}
                        </p>
                        <p className='text-muted-foreground text-xs'>
                          {t(`files.${file.group}`)} ·{' '}
                          {new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(
                            file.sizeBytes / 1_000_000
                          )}{' '}
                          MB
                        </p>
                      </div>
                      <Button
                        type='button'
                        variant='ghost'
                        size='icon'
                        aria-label={t('files.remove', { name: file.name })}
                        disabled={disabled || fileBusy}
                        onClick={() => void removeFile(file.id, file.attached)}
                      >
                        <X className='size-4' />
                      </Button>
                    </li>
                  ))}
                </ul>
              </section>
            </section>
            <div className='min-w-0 space-y-8'>
              <section id='site-styles' className='space-y-5' aria-label={t('stylesTitle')}>
                <h2 className='font-semibold uppercase'>{t('stylesTitle')}</h2>
                {buildingType ? (
                  (['Architecture', 'Interior'] as const).map((group) => {
                    const apply = group === 'Architecture' ? applies.architecture : applies.interior
                    const ids =
                      group === 'Architecture' ? buildingType.architectureStyleIds : buildingType.interiorStyleIds
                    const label = t(group === 'Architecture' ? 'architecture' : 'interior')
                    return apply ? (
                      <SiteStyleField
                        key={group}
                        control={form.control}
                        name={group === 'Architecture' ? 'architectureStyleId' : 'interiorStyleId'}
                        label={label}
                        options={catalog.styles.filter((style) => style.group === group && ids.includes(style.id))}
                        disabled={locked}
                      />
                    ) : (
                      <div key={group} className='space-y-2'>
                        <p className='text-sm font-medium'>{label}</p>
                        <p className='text-muted-foreground text-sm'>{t('styleNotApplicable')}</p>
                      </div>
                    )
                  })
                ) : (
                  <p className='bg-muted text-muted-foreground rounded-xl p-4 text-sm'>{t('stylePrompt')}</p>
                )}
              </section>
              <section id='site-needs' className='min-w-0 space-y-5'>
                <div>
                  <h2 className='font-semibold uppercase'>{t('needsTitle')}</h2>
                  <p className='text-muted-foreground text-sm'>{t('needsSubtitle')}</p>
                </div>
                <FormField
                  control={form.control}
                  name='scope'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('scope')}
                        <span className='text-destructive' aria-hidden>
                          {' '}
                          *
                        </span>
                      </FormLabel>
                      {scopes.isPending ? <Skeleton className='h-24 w-full' /> : null}
                      {scopes.isError ? (
                        <div role='alert' className='space-y-2'>
                          <p className='text-destructive text-sm'>{t('scopeLoadError')}</p>
                          <Button type='button' variant='outline' size='sm' onClick={() => void scopes.refetch()}>
                            {t('retry')}
                          </Button>
                        </div>
                      ) : !scopes.isPending && scopes.options.length === 0 ? (
                        <p className='text-muted-foreground text-sm'>{t('scopeEmpty')}</p>
                      ) : null}
                      <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
                        {scopes.options.map((option) => (
                          <button
                            key={option.id}
                            type='button'
                            aria-pressed={field.value === option.id}
                            onClick={() => field.onChange(option.id)}
                            className={cn(
                              'flex min-h-24 min-w-0 flex-col items-center justify-center gap-3 rounded-xl border px-2 py-3 text-center text-sm transition-colors',
                              field.value === option.id
                                ? 'border-primary bg-accent text-primary-strong'
                                : 'hover:border-primary/50'
                            )}
                          >
                            <Hammer className='text-primary size-6' aria-hidden />
                            {option.name}
                          </button>
                        ))}
                        {field.value && !scopes.options.some((option) => option.id === field.value) ? (
                          <div className='border-primary bg-accent text-primary-strong flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border px-2 py-3 text-center text-sm'>
                            <span>{scopes.label(field.value, briefQuery.data?.scopeName)}</span>
                            <span className='text-muted-foreground text-xs'>{t('scopeHistorical')}</span>
                          </div>
                        ) : null}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {textField('scopeNote', t('description'), {
                  multiline: true,
                  maxLength: 1000,
                  placeholder: t('descriptionPlaceholder')
                })}
                <p className='text-muted-foreground text-right text-xs'>
                  {t('descriptionCount', { count: values.scopeNote.length })}
                </p>
                <p className='text-muted-foreground text-xs'>{t('needsLocal')}</p>
              </section>
            </div>
          </fieldset>
          {pendingCreation ? (
            <div className='bg-muted mt-6 space-y-3 rounded-xl p-4' role='alert'>
              <p>{t('uncertain')}</p>
              <Button type='button' onClick={() => void reconcile()} disabled={allBusy}>
                {t('checkCreation')}
              </Button>
            </div>
          ) : null}
          {error ? (
            <p role='alert' className='text-destructive mt-5 text-sm'>
              {error}
            </p>
          ) : null}
          {versionConflict ? (
            <Button
              type='button'
              variant='outline'
              disabled={allBusy}
              onClick={() => {
                formLoaded.current = false
                void briefQuery.refetch().then((result) => {
                  if (result.isSuccess) {
                    setVersionConflict(false)
                    setError('')
                  }
                })
              }}
            >
              {t('reloadLatest')}
            </Button>
          ) : null}
          <div className='mt-6 flex justify-end border-t pt-6'>
            <Button
              type='submit'
              disabled={
                allBusy ||
                Boolean(pendingCreation) ||
                versionConflict ||
                sourceQuery.isFetching ||
                sourceQuery.isError ||
                scopes.isPending ||
                scopes.isError
              }
            >
              {allBusy ? <LoaderCircle className='size-4 animate-spin' /> : null}
              {old('continue')}
              <ArrowRight className='size-4' />
            </Button>
          </div>
        </form>
      </Form>
      <Dialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{old('leaveTitle')}</DialogTitle>
            <DialogDescription>{t('leaveDescription')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant='ghost' onClick={() => setLeaveOpen(false)}>
              {old('keepEditing')}
            </Button>
            <Button variant='outline' onClick={() => router.push(ROUTES.CONTRACTORS)}>
              {old('leaveWithoutSaving')}
            </Button>
            <Button
              onClick={() => {
                if (saveDraft()) router.push(ROUTES.CONTRACTORS)
              }}
              disabled={allBusy || Boolean(pendingCreation)}
            >
              {old('saveDraftAndLeave')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
