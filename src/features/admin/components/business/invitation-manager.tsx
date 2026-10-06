'use client'

import {
  ArrowRightOutlined,
  CalendarOutlined,
  CheckOutlined,
  CloseOutlined,
  PhoneOutlined,
  StopOutlined,
  UndoOutlined
} from '@ant-design/icons'
import {
  Alert,
  App,
  Button,
  DatePicker,
  Descriptions,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Segmented,
  Select,
  Space,
  Steps,
  Tag,
  Timeline,
  Tooltip,
  Typography
} from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useLocale, useTranslations } from 'next-intl'
import { useMemo, useState, type CSSProperties } from 'react'

import type { Locale } from '@/i18n/routing'
import { env } from '@/shared/config/env'
import { QuotationManager } from './quotation-manager'
import {
  isActiveSurvey,
  isSurveyDayClosed,
  isSurveySlotClosed,
  surveySlotLabel,
  surveySlotRange,
  type CmsContractorInvitation,
  type CmsSurveyStatus
} from '@/shared/cms'
import { useAdminCollection, useAdminDocument, useSaveAdminItem } from '../../hooks/use-admin-data'
import {
  INVITATION_STATUS_ORDER,
  advanceInvitation,
  invitationNeedsAction,
  isInvitationClosed,
  rejectInvitation,
  nextInvitationStatus,
  previousInvitationStatus,
  relativeTime,
  revertInvitation,
  surveyStatusOf,
  updateSurvey
} from '../../services/ops.service'
import { ResourceManager } from '../common/resource-manager'

const { Text } = Typography

const SURVEY_TAG: Record<CmsSurveyStatus, string> = {
  requested: 'gold',
  rescheduled: 'orange',
  confirmed: 'green',
  cancelled: 'default'
}

type View = 'action' | 'open' | 'done' | 'rejected' | 'all'
type SurveyAction = 'confirm' | 'reschedule' | 'cancel'

interface SurveyFormValues {
  date?: Dayjs
  slotId?: string
  note: string
}

/** Bề ngang cố định của các nút — mọi dòng có đủ nút, không dùng được thì mờ. */
const SURVEY_BUTTON = 92
const ADVANCE_BUTTON = 116
const UNDO_BUTTON = 96

const FIXED = (width: number): CSSProperties => ({ width, justifyContent: 'flex-start', overflow: 'hidden' })

/**
 * LỜI MỜI & KHẢO SÁT — một dòng cho mỗi nhà thầu khách đã mời (S16–S18).
 *
 * Lời mời và lịch khảo sát là CÙNG MỘT bản ghi: khách mời nhà thầu nào thì chọn
 * luôn giờ khảo sát cho nhà thầu đó. Trong thực tế vận hành xử lý cả hai trong
 * cùng một cuộc gọi — gọi nhà thầu vừa chuyển lời mời vừa chốt giờ khảo sát —
 * nên cả hai nằm trên cùng một dòng thay vì hai màn phải nhảy qua lại.
 *
 * Mỗi dòng có hai khối thao tác:
 *
 * - **Khảo sát** — việc nội bộ, khách không thấy: Chốt / Đổi giờ / Hủy, kèm ghi
 *   chú (R3: buổi khảo sát diễn ra ngoài web).
 * - **Tiến trình** — thanh 4 nấc khách thấy ở S18 (R4): "Chuyển nấc" đi tới một
 *   nấc, "Hoàn tác" lùi một nấc và gỡ mốc bấm nhầm khỏi dòng thời gian của khách.
 *
 * Số điện thoại của khách và đầu mối nhà thầu đứng cạnh nhau — hai cuộc gọi đầu
 * tiên không phải mở thêm màn nào. Mọi nút luôn có mặt, cùng bề ngang, để cột
 * không nhảy theo trạng thái.
 *
 * R2/R3 — không có trường tiền, không có "báo giá đã nhận".
 */
function MockInvitationManager() {
  const t = useTranslations('admin')
  const tMeaning = useTranslations('contractors.statusMeaning')
  const locale = useLocale() as Locale
  const { message } = App.useApp()
  const [form] = Form.useForm<SurveyFormValues>()

  const [view, setView] = useState<View>('action')
  const [pending, setPending] = useState<{ action: SurveyAction; invitation: CmsContractorInvitation } | null>(null)
  const [rejecting, setRejecting] = useState<CmsContractorInvitation | null>(null)
  const [rejectForm] = Form.useForm<{ reason: string }>()
  const tScope = useTranslations('contractors.scope')
  const tScale = useTranslations('contractors.scale')
  const tStart = useTranslations('contractors.startWindow')

  const { data: invitations = [] } = useAdminCollection('contractorInvitations')
  const { data: contractors = [] } = useAdminCollection('contractors')
  const save = useSaveAdminItem('contractorInvitations')
  const { data: schedule } = useAdminDocument('surveySchedule')
  const rescheduleDate = Form.useWatch('date', form) as Dayjs | undefined

  const contactOf = useMemo(() => {
    const map = new Map(contractors.map((contractor) => [contractor.id, contractor.contact]))
    return (contractorId: string) => map.get(contractorId)
  }, [contractors])

  const matchesView = (item: CmsContractorInvitation, target: View) => {
    if (target === 'action') return invitationNeedsAction(item)
    if (target === 'open') return !isInvitationClosed(item)
    if (target === 'done') return item.status === 'done'
    if (target === 'rejected') return item.status === 'rejected'
    return true
  }

  /* ---- Tiến trình (khách thấy) ---- */

  const advance = async (invitation: CmsContractorInvitation) => {
    const updated = advanceInvitation(invitation)
    await save.mutateAsync(updated)
    message.success(
      t('invitations.advancedToast', { code: invitation.id, status: t(`invitationStatus.${updated.status}`) })
    )
  }

  const revert = async (invitation: CmsContractorInvitation) => {
    const updated = revertInvitation(invitation)
    await save.mutateAsync(updated)
    message.success(
      t('invitations.revertedToast', { code: invitation.id, status: t(`invitationStatus.${updated.status}`) })
    )
  }

  const submitReject = async () => {
    const values = await rejectForm.validateFields().catch(() => null)
    if (!values || !rejecting) return
    await save.mutateAsync(rejectInvitation(rejecting, values.reason))
    message.success(t('invitations.rejectedToast', { code: rejecting.id }))
    setRejecting(null)
  }

  const stamp = (value?: string) => (value ? dayjs(value).format('DD/MM/YYYY HH:mm') : '-')

  /** Ngăn kéo "Xem chi tiết": hồ sơ dự án đã gửi + mốc thời gian từng trạng thái (spec admin #14). */
  const renderView = (record: CmsContractorInvitation) => {
    const dossier = record.dossier
    return (
      <Space orientation='vertical' size={16} style={{ width: '100%' }}>
        <Descriptions
          size='small'
          column={1}
          bordered
          title={t('invitations.summary')}
          items={[
            { key: 'code', label: t('invitations.code'), children: record.id },
            {
              key: 'project',
              label: t('invitations.project'),
              children: `${record.projectName} · ${record.projectId}`
            },
            {
              key: 'customer',
              label: t('invitations.customer'),
              children: [record.customerName, record.survey.phone, record.survey.email].filter(Boolean).join(' · ')
            },
            { key: 'contractor', label: t('invitations.contractor'), children: record.contractorName },
            {
              key: 'status',
              label: t('invitations.status'),
              children: (
                <Tag color={record.status === 'rejected' ? 'red' : record.status === 'done' ? 'green' : 'blue'}>
                  {t(`invitationStatus.${record.status}`)}
                </Tag>
              )
            },
            ...(record.status === 'rejected'
              ? [{ key: 'reason', label: t('invitations.rejectReason'), children: record.rejectReason || '-' }]
              : [])
          ]}
        />

        <div>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>
            {t('invitations.timeline')}
          </Text>
          <Timeline
            items={record.steps.map((step) => ({
              color: step.status === 'rejected' ? 'red' : 'blue',
              content: (
                <span>
                  <Text strong>{t(`invitationStatus.${step.status}`)}</Text>{' '}
                  <Text type='secondary'>{stamp(step.at)}</Text>
                </span>
              )
            }))}
          />
        </div>

        <div>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>
            {t('invitations.dossierTitle', { version: record.dossierVersion, files: record.fileCount })}
          </Text>
          {dossier ? (
            <Descriptions
              size='small'
              column={1}
              bordered
              items={[
                {
                  key: 'type',
                  label: t('invitations.dossierFields.buildingType'),
                  children: dossier.buildingType || '-'
                },
                {
                  key: 'scale',
                  label: t('invitations.dossierFields.scale'),
                  children: [
                    t('invitations.dossierFields.area', { area: dossier.landArea }),
                    tScale.has(dossier.scale as 'ground') ? tScale(dossier.scale as 'ground') : dossier.scale,
                    dossier.hasAttic ? t('invitations.dossierFields.attic') : null
                  ]
                    .filter(Boolean)
                    .join(' · ')
                },
                { key: 'address', label: t('invitations.dossierFields.address'), children: dossier.address || '-' },
                {
                  key: 'scope',
                  label: t('invitations.dossierFields.scope'),
                  children: `${tScope.has(dossier.scope as 'turnkey') ? tScope(dossier.scope as 'turnkey') : dossier.scope}${
                    dossier.scopeNote ? ` — ${dossier.scopeNote}` : ''
                  }`
                },
                {
                  key: 'start',
                  label: t('invitations.dossierFields.start'),
                  children: tStart.has(dossier.startWindow as 'asap')
                    ? tStart(dossier.startWindow as 'asap')
                    : dossier.startWindow
                },
                {
                  key: 'docs',
                  label: t('invitations.dossierFields.documents'),
                  children: dossier.documents.length
                    ? dossier.documents.map((doc) => (
                        <div key={doc.name}>
                          {doc.name}{' '}
                          <Text type='secondary' style={{ fontSize: 12 }}>
                            {`(${(doc.sizeBytes / 1024 / 1024).toFixed(1)} MB)`}
                          </Text>
                        </div>
                      ))
                    : '-'
                },
                { key: 'note', label: t('invitations.dossierFields.surveyNote'), children: record.survey.note || '-' }
              ]}
            />
          ) : (
            <Empty description={t('invitations.noDossier')} />
          )}
        </div>
      </Space>
    )
  }

  /* ---- Khảo sát (nội bộ) ---- */

  function openSurvey(action: SurveyAction, invitation: CmsContractorInvitation) {
    form.setFieldsValue({ date: dayjs(invitation.survey.date), slotId: invitation.survey.slotId, note: '' })
    setPending({ action, invitation })
  }

  async function submitSurvey() {
    if (!pending) return
    // Form sai thì antd reject kèm lỗi từng ô — đã hiện dưới ô, không cần ném tiếp.
    const values = await form.validateFields().catch(() => null)
    if (!values) return
    const status: CmsSurveyStatus =
      pending.action === 'confirm' ? 'confirmed' : pending.action === 'cancel' ? 'cancelled' : 'rescheduled'

    await save.mutateAsync(
      updateSurvey(pending.invitation, {
        status,
        note: values.note,
        ...(pending.action === 'reschedule' && values.date
          ? { date: values.date.format('YYYY-MM-DD'), ...(values.slotId ? { slotId: values.slotId } : {}) }
          : {})
      })
    )
    message.success(t(`surveys.toast.${pending.action}`, { code: pending.invitation.id }))
    setPending(null)
  }

  return (
    <>
      <ResourceManager
        collection='contractorInvitations'
        title={t('nav.invitations')}
        description={t('invitations.description')}
        allowDelete={false}
        allowEdit={false}
        searchText={(item) =>
          `${item.id} ${item.projectId} ${item.projectName} ${item.customerName ?? ''} ${item.contractorName} ${item.survey.phone} ${item.survey.email}`
        }
        renderView={renderView}
        filterItems={(item) => matchesView(item, view)}
        banner={
          <Segmented<View>
            value={view}
            onChange={setView}
            options={(['action', 'open', 'done', 'rejected', 'all'] as const).map((value) => ({
              value,
              label: `${t(`invitations.views.${value}`)} (${invitations.filter((item) => matchesView(item, value)).length})`
            }))}
          />
        }
        columns={[
          {
            title: t('invitations.project'),
            key: 'project',
            width: 230,
            render: (_, record) => (
              <div style={{ minWidth: 0 }}>
                <Text strong style={{ display: 'block' }}>
                  {record.projectName}
                </Text>
                <Text type='secondary' style={{ display: 'block', fontSize: 12 }}>
                  {record.projectId} · {record.id}
                </Text>
                {record.customerName ? (
                  <Text type='secondary' style={{ display: 'block', fontSize: 12 }}>
                    {record.customerName}
                  </Text>
                ) : null}
                <Text copyable={{ text: record.survey.phone }} type='secondary' style={{ fontSize: 12 }}>
                  <PhoneOutlined /> {record.survey.phone}
                </Text>
              </div>
            )
          },
          {
            title: t('invitations.contractor'),
            key: 'contractor',
            width: 210,
            render: (_, record) => {
              const contact = contactOf(record.contractorId)
              return (
                <div style={{ minWidth: 0 }}>
                  <Text strong style={{ display: 'block' }}>
                    {record.contractorName}
                  </Text>
                  {contact?.phone ? (
                    <Text copyable={{ text: contact.phone }} type='secondary' style={{ fontSize: 12 }}>
                      {contact.person} · {contact.phone}
                    </Text>
                  ) : (
                    <Text type='warning' style={{ fontSize: 12 }}>
                      {t('surveys.noContact')}
                    </Text>
                  )}
                </div>
              )
            }
          },
          {
            title: t('invitations.survey'),
            key: 'survey',
            width: SURVEY_BUTTON * 3 + 24,
            sorter: (a, b) => `${a.survey.date}${a.survey.slotId}`.localeCompare(`${b.survey.date}${b.survey.slotId}`),
            render: (_, record) => {
              const status = surveyStatusOf(record)
              const closed = status === 'cancelled' || record.status === 'rejected'
              return (
                <div>
                  <Space size={6} style={{ marginBottom: 6 }}>
                    <Text strong>{dayjs(record.survey.date).format('DD/MM/YYYY')}</Text>
                    <Text type='secondary'>{surveySlotLabel(record.survey.slotId)}</Text>
                    <Tag color={SURVEY_TAG[status]} style={{ marginInlineEnd: 0 }}>
                      {t(`surveyStatus.${status}`)}
                    </Tag>
                  </Space>
                  {record.survey.opsNote ? (
                    <Text
                      type='secondary'
                      style={{ display: 'block', fontSize: 12, marginBottom: 6 }}
                      ellipsis={{ tooltip: record.survey.opsNote }}
                    >
                      {record.survey.opsNote}
                    </Text>
                  ) : null}
                  <div className='flex items-center gap-1.5 whitespace-nowrap'>
                    <Button
                      size='small'
                      icon={<CheckOutlined />}
                      disabled={closed || status === 'confirmed'}
                      style={FIXED(SURVEY_BUTTON)}
                      onClick={() => openSurvey('confirm', record)}
                    >
                      {t('surveys.confirm')}
                    </Button>
                    <Button
                      size='small'
                      icon={<CalendarOutlined />}
                      disabled={closed}
                      style={FIXED(SURVEY_BUTTON)}
                      onClick={() => openSurvey('reschedule', record)}
                    >
                      {t('surveys.reschedule')}
                    </Button>
                    <Button
                      size='small'
                      danger
                      icon={<CloseOutlined />}
                      disabled={closed}
                      style={FIXED(SURVEY_BUTTON)}
                      onClick={() => openSurvey('cancel', record)}
                    >
                      {t('surveys.cancel')}
                    </Button>
                  </div>
                </div>
              )
            }
          },
          {
            title: t('invitations.status'),
            key: 'progress',
            width: 400,
            render: (_, record) => {
              const next = nextInvitationStatus(record.status)
              const previous = previousInvitationStatus(record.status)
              const rejected = record.status === 'rejected'
              const stampOf = (status: string) => record.steps.findLast((step) => step.status === status)?.at
              // Bị từ chối: Steps dừng ở nấc cuối đã đi qua và tô lỗi.
              const reached = rejected
                ? INVITATION_STATUS_ORDER.indexOf(
                    record.steps.findLast((step) => step.status !== 'rejected')?.status ?? 'sent'
                  )
                : INVITATION_STATUS_ORDER.indexOf(record.status)
              return (
                <div style={{ minWidth: 370 }}>
                  {rejected ? (
                    <Tag color='red' style={{ marginBottom: 6 }}>
                      {t('invitationStatus.rejected')} · {stamp(stampOf('rejected'))}
                    </Tag>
                  ) : null}
                  <Steps
                    size='small'
                    current={reached}
                    status={rejected ? 'error' : record.status === 'done' ? 'finish' : 'process'}
                    items={INVITATION_STATUS_ORDER.map((status) => {
                      const at = stampOf(status)
                      return {
                        title: (
                          <Tooltip title={tMeaning(status as 'sent')}>
                            <span style={{ fontSize: 12 }}>{t(`invitationStatus.${status}`)}</span>
                          </Tooltip>
                        ),
                        // Ghi nhận thời gian của từng trạng thái (spec admin #14).
                        content: at ? <span style={{ fontSize: 11 }}>{dayjs(at).format('DD/MM HH:mm')}</span> : null
                      }
                    })}
                  />
                  <div className='mt-1.5 flex items-center gap-1.5 whitespace-nowrap'>
                    {next ? (
                      <Popconfirm
                        title={t('invitations.advanceConfirmTitle', { status: t(`invitationStatus.${next}`) })}
                        description={
                          <div style={{ maxWidth: 280 }}>
                            {t('invitations.advanceConfirmBody', { meaning: tMeaning(next) })}
                          </div>
                        }
                        okText={t(`invitations.advanceTo.${next as 'received'}`)}
                        cancelText={t('actions.cancel')}
                        onConfirm={() => advance(record)}
                      >
                        <Button size='small' type='primary' icon={<ArrowRightOutlined />} style={FIXED(ADVANCE_BUTTON)}>
                          <span className='truncate'>{t(`invitations.advanceTo.${next as 'received'}`)}</span>
                        </Button>
                      </Popconfirm>
                    ) : (
                      <Button size='small' disabled icon={<CheckOutlined />} style={FIXED(ADVANCE_BUTTON)}>
                        <span className='truncate'>
                          {rejected ? t('invitationStatus.rejected') : t('invitations.finished')}
                        </span>
                      </Button>
                    )}
                    <Popconfirm
                      disabled={!previous}
                      title={
                        previous
                          ? t('invitations.revertConfirmTitle', { status: t(`invitationStatus.${previous}`) })
                          : ''
                      }
                      description={<div style={{ maxWidth: 280 }}>{t('invitations.revertConfirmBody')}</div>}
                      okText={t('invitations.revert')}
                      cancelText={t('actions.cancel')}
                      onConfirm={() => revert(record)}
                    >
                      <Button size='small' icon={<UndoOutlined />} disabled={!previous} style={FIXED(UNDO_BUTTON)}>
                        {t('invitations.revert')}
                      </Button>
                    </Popconfirm>
                    <Tooltip title={t('invitations.reject')}>
                      <Button
                        size='small'
                        danger
                        icon={<StopOutlined />}
                        disabled={isInvitationClosed(record)}
                        aria-label={t('invitations.reject')}
                        onClick={() => {
                          rejectForm.resetFields()
                          setRejecting(record)
                        }}
                      />
                    </Tooltip>
                    <Text type='secondary' style={{ fontSize: 12 }}>
                      {t('invitations.updatedAgo', { time: relativeTime(record.updatedAt, locale) })}
                    </Text>
                  </div>
                </div>
              )
            }
          }
        ]}
        renderForm={() => null}
      />

      <Modal
        open={rejecting !== null}
        onCancel={() => setRejecting(null)}
        onOk={submitReject}
        confirmLoading={save.isPending}
        okText={t('invitations.reject')}
        okButtonProps={{ danger: true }}
        cancelText={t('actions.cancel')}
        title={rejecting ? t('invitations.rejectTitle', { code: rejecting.id }) : ''}
        destroyOnHidden
      >
        <Form form={rejectForm} layout='vertical' preserve={false}>
          <Alert type='warning' showIcon style={{ marginBottom: 16 }} title={t('invitations.rejectHint')} />
          <Form.Item
            name='reason'
            label={t('invitations.rejectReason')}
            rules={[{ required: true, whitespace: true, message: t('invitations.rejectReasonRequired') }]}
          >
            <Input.TextArea rows={3} maxLength={500} showCount />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={pending !== null}
        onCancel={() => setPending(null)}
        onOk={submitSurvey}
        confirmLoading={save.isPending}
        okText={pending ? t(`surveys.${pending.action}`) : ''}
        okButtonProps={{ danger: pending?.action === 'cancel' }}
        cancelText={t('actions.cancel')}
        title={pending ? t(`surveys.modalTitle.${pending.action}`, { code: pending.invitation.id }) : ''}
        destroyOnHidden
      >
        {pending ? (
          <Form form={form} layout='vertical'>
            <Alert
              type={pending.action === 'cancel' ? 'warning' : 'info'}
              showIcon
              style={{ marginBottom: 16 }}
              title={t(`surveys.modalHint.${pending.action}`, {
                contractor: pending.invitation.contractorName,
                phone: pending.invitation.survey.phone
              })}
            />
            {pending.action === 'reschedule' ? (
              <Space size={12} style={{ width: '100%' }} wrap>
                <Form.Item
                  name='date'
                  label={t('surveys.newDate')}
                  rules={[{ required: true, message: t('fields.requiredMessage') }]}
                >
                  <DatePicker
                    format='DD/MM/YYYY'
                    disabledDate={(day) =>
                      day.isBefore(dayjs(), 'day') ||
                      !(schedule?.workingDays ?? []).includes(day.day()) ||
                      (schedule ? isSurveyDayClosed(schedule, day.format('YYYY-MM-DD')) : false)
                    }
                    onChange={() => form.setFieldValue('slotId', undefined)}
                  />
                </Form.Item>
                <Form.Item
                  name='slotId'
                  label={t('surveys.newSlot')}
                  rules={[{ required: true, message: t('fields.requiredMessage') }]}
                >
                  <Select
                    style={{ minWidth: 180 }}
                    options={(schedule?.slots ?? [])
                      .filter((slot) => slot.active)
                      .map((slot) => {
                        const date = rescheduleDate?.format('YYYY-MM-DD') ?? ''
                        // Khung bị khóa hoặc nhà thầu đã có lịch khác đúng khung đó thì không chọn được.
                        const taken = invitations.some(
                          (item) =>
                            item.id !== pending.invitation.id &&
                            item.contractorId === pending.invitation.contractorId &&
                            item.survey.date === date &&
                            item.survey.slotId === slot.id &&
                            isActiveSurvey(item)
                        )
                        return {
                          value: slot.id,
                          label: surveySlotRange(slot),
                          disabled: taken || (schedule ? isSurveySlotClosed(schedule, date, slot.id) : false)
                        }
                      })}
                  />
                </Form.Item>
              </Space>
            ) : null}
            <Form.Item
              name='note'
              label={t('surveys.opsNote')}
              rules={pending.action === 'confirm' ? [] : [{ required: true, message: t('surveys.noteRequired') }]}
            >
              <Input.TextArea rows={2} placeholder={t('surveys.opsNotePlaceholder')} />
            </Form.Item>
          </Form>
        ) : null}
      </Modal>
    </>
  )
}

export function InvitationManager() {
  return env.NEXT_PUBLIC_USE_MOCK_API ? <MockInvitationManager /> : <QuotationManager />
}
