'use client'

import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  DeleteOutlined,
  FilePdfOutlined,
  PlusOutlined,
  UploadOutlined
} from '@ant-design/icons'
import { App, Button, DatePicker, Form, Image, Input, InputNumber, Tooltip, Typography, Upload } from 'antd'
import type { UploadProps } from 'antd'
import dayjs from 'dayjs'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { acceptAttribute, uploadFile, type MediaPurpose } from '@/shared/media'
import { useContractorErrorMessage } from './contractor-errors'
import {
  MAX_IMAGES_PER_SET,
  SINGLE_KINDS,
  addImage,
  emptyLicense,
  imagesOfKind,
  legacyAssetPath,
  licenseProblems,
  moveImage,
  partnershipDateOrderInvalid,
  removeImage,
  IMAGE_KINDS,
  type LicenseDraft,
  type PartnershipDraft,
  type ProfileImageDraft
} from './contractor-form.logic'

const { Text } = Typography

const DATE_FORMAT = 'DD/MM/YYYY'

/**
 * Các ô tải tệp của form nhà thầu: ảnh hồ sơ, bản quét giấy phép / hợp tác, ảnh dự án.
 *
 * Tệp đi qua MEDIA presign (`shared/media`): người vận hành CHỌN TỆP, không dán URL; backend
 * xác minh rồi trả URL cố định và form giữ URL đó ngầm. Tải lên CHƯA lưu gì vào hồ sơ — tệp chỉ
 * được giữ khi bấm Lưu thành công (không thì bị dọn sau 24 giờ, BR-MEDIA-002).
 *
 * Các ô tải là BẤT ĐỒNG BỘ nên khi tải xong phải đọc giá trị MỚI NHẤT của form
 * (`form.getFieldValue`) chứ không dùng `value` của lần vẽ lúc bấm chọn tệp — không thì việc
 * người dùng gõ tiếp các ô khác trong lúc chờ sẽ bị ghi đè bằng bản cũ.
 */

/* ===== Nút tải tệp dùng chung ===== */

function useUploader(purpose: MediaPurpose, onUploaded: (url: string) => void) {
  const { message } = App.useApp()
  const describe = useContractorErrorMessage()
  const [pending, setPending] = useState(0)

  const customRequest: UploadProps['customRequest'] = async ({ file, onSuccess, onError }) => {
    setPending((count) => count + 1)
    try {
      const uploaded = await uploadFile(file as File, purpose)
      onUploaded(uploaded.url)
      onSuccess?.('ok')
    } catch (error) {
      message.error(describe(error))
      onError?.(error as Error)
    } finally {
      setPending((count) => count - 1)
    }
  }

  return { busy: pending > 0, customRequest, accept: acceptAttribute(purpose) }
}

/* ===== Dải ảnh: xem trước, đổi chỗ, xoá, tải thêm ===== */

export interface StripItem {
  key: string
  src: string
}

interface ImageStripProps {
  items: StripItem[]
  max: number
  /** Ô đơn (Logo/Cover): đã có ảnh vẫn cho tải để THAY. */
  replaceWhenFull?: boolean
  onUploaded: (url: string) => void
  onRemove: (key: string) => void
  onMove?: (key: string, delta: -1 | 1) => void
}

export function ImageStrip({ items, max, replaceWhenFull, onUploaded, onRemove, onMove }: ImageStripProps) {
  const t = useTranslations('admin.contractorsAdmin.files')
  const uploader = useUploader('ContractorImage', onUploaded)
  const canUpload = replaceWhenFull || items.length < max

  return (
    <div className='flex flex-wrap items-start gap-3'>
      {items.map((item, index) => (
        <div key={item.key} className='flex flex-col items-center gap-1'>
          <div className='h-[72px] w-24 overflow-hidden rounded-lg border border-[var(--admin-border)]'>
            <Image src={item.src} alt='' width={96} height={72} style={{ objectFit: 'cover' }} />
          </div>
          <div className='flex items-center gap-0.5'>
            {onMove ? (
              <>
                <Tooltip title={t('moveLeft')}>
                  <Button
                    size='small'
                    type='text'
                    disabled={index === 0}
                    icon={<ArrowLeftOutlined />}
                    aria-label={t('moveLeft')}
                    onClick={() => onMove(item.key, -1)}
                  />
                </Tooltip>
                <Tooltip title={t('moveRight')}>
                  <Button
                    size='small'
                    type='text'
                    disabled={index === items.length - 1}
                    icon={<ArrowRightOutlined />}
                    aria-label={t('moveRight')}
                    onClick={() => onMove(item.key, 1)}
                  />
                </Tooltip>
              </>
            ) : null}
            <Button
              size='small'
              type='text'
              danger
              icon={<DeleteOutlined />}
              aria-label={t('remove')}
              onClick={() => onRemove(item.key)}
            />
          </div>
        </div>
      ))}
      {canUpload ? (
        <Upload
          accept={uploader.accept}
          showUploadList={false}
          multiple={max > 1}
          customRequest={uploader.customRequest}
        >
          <Button icon={<UploadOutlined />} loading={uploader.busy}>
            {replaceWhenFull && items.length > 0 ? t('replace') : t('upload')}
          </Button>
        </Upload>
      ) : null}
    </div>
  )
}

/* ===== Bản quét (giấy phép, hợp tác) ===== */

interface ScanFieldProps {
  url?: string
  assetId?: string
  contractorId?: string
  /** `{}` = gỡ tệp; `{scanUrl}` = tệp mới (thay cả tệp cũ). */
  onChange: (next: { scanUrl?: string }) => void
}

const isImageUrl = (url?: string) => Boolean(url && /\.(png|jpe?g)$/i.test(url))

function ScanField({ url, assetId, contractorId, onChange }: ScanFieldProps) {
  const t = useTranslations('admin.contractorsAdmin.files')
  const uploader = useUploader('ContractorScan', (next) => onChange({ scanUrl: next }))
  const hasFile = Boolean(url || assetId)
  // Tệp mới có URL công khai; tệp CŨ chỉ xem được qua route admin tương thích.
  const href = url ?? (assetId && contractorId ? legacyAssetPath(contractorId, assetId) : undefined)

  return (
    <div className='flex flex-wrap items-center gap-2'>
      {hasFile ? (
        <>
          {isImageUrl(url) ? (
            <Image src={url} alt='' width={40} height={40} style={{ objectFit: 'cover', borderRadius: 6 }} />
          ) : null}
          {href ? (
            <a href={href} target='_blank' rel='noreferrer' className='inline-flex items-center gap-1 text-sm'>
              {isImageUrl(url) ? null : <FilePdfOutlined />}
              {t('scanView')}
            </a>
          ) : (
            <Text type='secondary'>{t('scanUploaded')}</Text>
          )}
          <Button
            size='small'
            type='text'
            danger
            icon={<DeleteOutlined />}
            aria-label={t('remove')}
            onClick={() => onChange({})}
          />
        </>
      ) : null}
      <Upload accept={uploader.accept} showUploadList={false} multiple={false} customRequest={uploader.customRequest}>
        <Button size='small' icon={<UploadOutlined />} loading={uploader.busy}>
          {hasFile ? t('replace') : t('uploadScan')}
        </Button>
      </Upload>
      <Text type='secondary' style={{ fontSize: 12 }}>
        {t('scanHint')}
      </Text>
    </div>
  )
}

/* ===== Ảnh hồ sơ: Logo, Cover, Office, Team ===== */

interface ContractorImagesFieldProps {
  /** Tên trường trong form — để đọc giá trị MỚI NHẤT khi tải xong (xem ghi chú đầu file). */
  fieldName: string
  value?: ProfileImageDraft[]
  onChange?: (next: ProfileImageDraft[]) => void
  contractorId?: string
}

export function ContractorImagesField({ fieldName, value, onChange, contractorId }: ContractorImagesFieldProps) {
  const t = useTranslations('admin.contractorsAdmin.files')
  const form = Form.useFormInstance()
  const drafts = value ?? []
  const fresh = (): ProfileImageDraft[] => (form.getFieldValue(fieldName) as ProfileImageDraft[] | undefined) ?? []
  const commit = (next: ProfileImageDraft[]) => onChange?.(next)

  const srcOf = (draft: ProfileImageDraft): string =>
    draft.url ?? (draft.assetId && contractorId ? legacyAssetPath(contractorId, draft.assetId) : '')

  return (
    <div className='grid gap-5'>
      {IMAGE_KINDS.map((kind) => {
        const single = SINGLE_KINDS.includes(kind)
        const items = imagesOfKind(drafts, kind)
          .map((draft) => ({ key: draft.key, src: srcOf(draft) }))
          .filter((item) => item.src !== '')
        return (
          <div key={kind} className='grid gap-2'>
            <div>
              <Text strong>{t(`kind.${kind}`)}</Text>
              <Text type='secondary' style={{ fontSize: 12, marginLeft: 8 }}>
                {t(`kindHint.${kind}`)}
                {single ? '' : ` · ${t('count', { count: items.length, max: MAX_IMAGES_PER_SET })}`}
              </Text>
            </div>
            <ImageStrip
              items={items}
              max={single ? 1 : MAX_IMAGES_PER_SET}
              replaceWhenFull={single}
              onUploaded={(url) => commit(addImage(fresh(), kind, url))}
              onRemove={(key) => commit(removeImage(fresh(), key))}
              onMove={single ? undefined : (key, delta) => commit(moveImage(fresh(), key, delta))}
            />
          </div>
        )
      })}
    </div>
  )
}

/* ===== Giấy phép ===== */

interface ContractorLicensesFieldProps {
  fieldName: string
  value?: LicenseDraft[]
  onChange?: (next: LicenseDraft[]) => void
  contractorId?: string
}

const toDayjs = (value: string) => (value ? dayjs(value) : null)

export function ContractorLicensesField({ fieldName, value, onChange, contractorId }: ContractorLicensesFieldProps) {
  const t = useTranslations('admin.contractorsAdmin.files.licenses')
  const form = Form.useFormInstance()
  const rows = value ?? []
  const fresh = (): LicenseDraft[] => (form.getFieldValue(fieldName) as LicenseDraft[] | undefined) ?? []
  const commit = (next: LicenseDraft[]) => onChange?.(next)
  const patch = (key: string, change: Partial<LicenseDraft>) =>
    commit(fresh().map((row) => (row.key === key ? { ...row, ...change } : row)))
  const problems = licenseProblems(rows)

  return (
    <div className='grid gap-3'>
      {rows.length === 0 ? <Text type='secondary'>{t('empty')}</Text> : null}
      {rows.map((row, index) => (
        <div key={row.key} className='grid gap-3 rounded-lg border border-[var(--admin-border)] p-3'>
          <div className='flex items-center justify-between'>
            <Text strong>{t('rowTitle', { n: index + 1 })}</Text>
            <Button
              size='small'
              type='text'
              danger
              icon={<DeleteOutlined />}
              aria-label={t('remove')}
              onClick={() => commit(fresh().filter((item) => item.key !== row.key))}
            />
          </div>
          <div className='grid gap-3 sm:grid-cols-2'>
            <div className='grid gap-1'>
              <Text type='secondary'>{t('type')}</Text>
              <Input
                value={row.licenseType}
                maxLength={100}
                onChange={(event) => patch(row.key, { licenseType: event.target.value })}
              />
            </div>
            <div className='grid gap-1'>
              <Text type='secondary'>{t('number')}</Text>
              <Input
                value={row.licenseNumber}
                maxLength={100}
                onChange={(event) => patch(row.key, { licenseNumber: event.target.value })}
              />
            </div>
            <div className='grid gap-1 sm:col-span-2'>
              <Text type='secondary'>{t('issuer')}</Text>
              <Input
                value={row.issuer}
                maxLength={200}
                onChange={(event) => patch(row.key, { issuer: event.target.value })}
              />
            </div>
            <div className='grid gap-1'>
              <Text type='secondary'>{t('issuedOn')}</Text>
              <DatePicker
                className='w-full'
                format={DATE_FORMAT}
                value={toDayjs(row.issuedOn)}
                onChange={(date) => patch(row.key, { issuedOn: date ? date.format('YYYY-MM-DD') : '' })}
              />
            </div>
            <div className='grid gap-1'>
              <Text type='secondary'>{t('expiresOn')}</Text>
              <DatePicker
                className='w-full'
                format={DATE_FORMAT}
                value={toDayjs(row.expiresOn)}
                onChange={(date) => patch(row.key, { expiresOn: date ? date.format('YYYY-MM-DD') : '' })}
              />
            </div>
          </div>
          <div className='grid gap-1'>
            <Text type='secondary'>{t('scan')}</Text>
            <ScanField
              url={row.scanUrl}
              assetId={row.assetId}
              contractorId={contractorId}
              onChange={(next) => patch(row.key, { scanUrl: next.scanUrl, assetId: undefined })}
            />
          </div>
          {problems
            .filter((item) => item.index === index)
            .map((item) => (
              <Text key={item.problem} type='danger' style={{ fontSize: 12 }}>
                {t(`problem.${item.problem}`)}
              </Text>
            ))}
        </div>
      ))}
      <div>
        <Button size='small' icon={<PlusOutlined />} onClick={() => commit([...fresh(), emptyLicense()])}>
          {t('add')}
        </Button>
      </div>
    </div>
  )
}

/* ===== Hợp tác BuildX ===== */

interface ContractorPartnershipFieldProps {
  fieldName: string
  value?: PartnershipDraft
  onChange?: (next: PartnershipDraft) => void
  contractorId?: string
}

export function ContractorPartnershipField({
  fieldName,
  value,
  onChange,
  contractorId
}: ContractorPartnershipFieldProps) {
  const t = useTranslations('admin.contractorsAdmin.files.partnership')
  const form = Form.useFormInstance()
  const draft: PartnershipDraft = value ?? { startsOn: '', endsOn: '', signedOn: '', recordCode: '', pageCount: null }
  const fresh = (): PartnershipDraft => (form.getFieldValue(fieldName) as PartnershipDraft | undefined) ?? draft
  const patch = (change: Partial<PartnershipDraft>) => onChange?.({ ...fresh(), ...change })

  return (
    <div className='grid gap-3'>
      <Text type='secondary' style={{ fontSize: 12 }}>
        {t('hint')}
      </Text>
      <div className='grid gap-3 sm:grid-cols-3'>
        <div className='grid gap-1'>
          <Text type='secondary'>{t('startsOn')}</Text>
          <DatePicker
            className='w-full'
            format={DATE_FORMAT}
            value={toDayjs(draft.startsOn)}
            onChange={(date) => patch({ startsOn: date ? date.format('YYYY-MM-DD') : '' })}
          />
        </div>
        <div className='grid gap-1'>
          <Text type='secondary'>{t('endsOn')}</Text>
          <DatePicker
            className='w-full'
            format={DATE_FORMAT}
            value={toDayjs(draft.endsOn)}
            onChange={(date) => patch({ endsOn: date ? date.format('YYYY-MM-DD') : '' })}
          />
        </div>
        <div className='grid gap-1'>
          <Text type='secondary'>{t('signedOn')}</Text>
          <DatePicker
            className='w-full'
            format={DATE_FORMAT}
            value={toDayjs(draft.signedOn)}
            onChange={(date) => patch({ signedOn: date ? date.format('YYYY-MM-DD') : '' })}
          />
        </div>
        <div className='grid gap-1 sm:col-span-2'>
          <Text type='secondary'>{t('recordCode')}</Text>
          <Input
            value={draft.recordCode}
            maxLength={100}
            onChange={(event) => patch({ recordCode: event.target.value })}
          />
        </div>
        <div className='grid gap-1'>
          <Text type='secondary'>{t('pageCount')}</Text>
          <InputNumber
            className='w-full'
            min={0}
            precision={0}
            value={draft.pageCount}
            onChange={(next) => patch({ pageCount: typeof next === 'number' ? next : null })}
          />
        </div>
      </div>
      <div className='grid gap-1'>
        <Text type='secondary'>{t('scan')}</Text>
        <ScanField
          url={draft.scanUrl}
          assetId={draft.assetId}
          contractorId={contractorId}
          onChange={(next) => patch({ scanUrl: next.scanUrl, assetId: undefined })}
        />
      </div>
      {partnershipDateOrderInvalid(draft) ? (
        <Text type='danger' style={{ fontSize: 12 }}>
          {t('dateOrder')}
        </Text>
      ) : null}
    </div>
  )
}
