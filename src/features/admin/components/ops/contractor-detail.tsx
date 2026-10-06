'use client'

import {
  ArrowLeftOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  DeleteOutlined,
  EditOutlined,
  SafetyCertificateFilled,
  StopOutlined
} from '@ant-design/icons'
import {
  Alert,
  App,
  Avatar,
  Button,
  Card,
  Descriptions,
  Drawer,
  Empty,
  Form,
  Image,
  Input,
  List,
  Modal,
  Popconfirm,
  Result,
  Skeleton,
  Space,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography
} from 'antd'
import dayjs from 'dayjs'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { Link, useRouter } from '@/i18n/navigation'
import type { CmsContractorHistoryEntry } from '@/shared/cms'
import { ADMIN_ROUTES } from '@/shared/constants'
import { useAdminCollection, useDeleteAdminItem } from '../../hooks/use-admin-data'
import { useContractorSave } from '../../hooks/use-contractor-save'
import { todayKey } from '../../services/admin.service'
import {
  CONTRACTOR_HISTORY_ACTIONS,
  composeLocation,
  hasRelatedData,
  hasValidCoordinates,
  licenseStatusOf,
  verificationGaps,
  visibilityProblem,
  type ContractorHistoryAction,
  type VerificationGap
} from '../../services/contractor.service'
import { AdminPage } from '../common/admin-page'
import { MockApiNotice } from '../common/mock-api-notice'
import { ContractorFields, PHOTO_SLOTS, useOpenInvitations } from './contractor-fields'
import { ContractorLegal } from './contractor-legal'
import { useProfileCommit } from './contractor-manager'
import { ContractorPartnership } from './contractor-partnership'
import { ContractorProjects } from './contractor-projects'

const { Text, Paragraph } = Typography

const GAPS: VerificationGap[] = ['basicInfo', 'location', 'capability', 'legalEntity', 'license']

function stamp(value?: string): string {
  return value ? dayjs(value).format('DD/MM/YYYY HH:mm') : '-'
}

/**
 * TRANG CHI TIẾT NHÀ THẦU (epic ContractorManagement §2, §9, §13).
 *
 * Bốn tab theo spec + lịch sử quản trị chỉ đọc. Xác minh hồ sơ và bật hiển thị
 * là hai thao tác độc lập: xác minh chỉ bấm được khi danh sách điều kiện chưa
 * đạt rỗng; hủy xác minh bắt buộc lý do.
 */
export function ContractorDetail({ id }: { id: string }) {
  const t = useTranslations('admin')
  const { message } = App.useApp()
  const contractors = useAdminCollection('contractors')
  const { data: buildingTypes = [] } = useAdminCollection('buildingTypes')
  const openInvitations = useOpenInvitations()
  const { commit, isPending } = useContractorSave()
  const profileCommit = useProfileCommit()
  const remove = useDeleteAdminItem('contractors')
  const router = useRouter()
  const [form] = Form.useForm()
  const [reasonForm] = Form.useForm<{ reason: string }>()
  const [editing, setEditing] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [unverifying, setUnverifying] = useState(false)
  const [tab, setTab] = useState('overview')

  if (contractors.isPending) return <Skeleton active paragraph={{ rows: 12 }} />

  const contractor = (contractors.data ?? []).find((item) => item.id === id)
  if (!contractor) {
    return (
      <Result
        status='404'
        title={t('contractors.notFound')}
        extra={
          <Link href={ADMIN_ROUTES.CONTRACTORS}>
            <Button>{t('contractors.backToList')}</Button>
          </Link>
        }
      />
    )
  }

  const today = todayKey()
  const gaps = verificationGaps(contractor, today)
  const licenseExpired = licenseStatusOf(contractor.legalProfile, today) === 'expired'
  const deleteBlocked = hasRelatedData(contractor, openInvitations.all.get(contractor.id) ?? 0)
  const typeLabel = (typeId: string) => {
    const type = buildingTypes.find((item) => item.id === typeId)
    if (!type) return typeId
    return type.status === 'active' ? type.label : `${type.label} (${t('catalogStatus.inactive')})`
  }

  const saveProfile = async () => {
    const values = await form.validateFields().catch(() => null)
    if (!values) return
    const next = profileCommit(form.getFieldsValue(true) as Record<string, unknown>, contractor, false)
    if (visibilityProblem(next)) {
      message.error(t('contractors.visibleNeedsCapability'))
      return
    }
    // `profileCommit` đã suy trường công khai + ghi lịch sử — lưu thẳng, không ghi thêm dòng.
    await commit(next)
    message.success(t('contractors.savedToast'))
    setEditing(false)
  }

  const verify = async () => {
    await commit(
      { ...contractor, verified: true, unverifyReason: undefined },
      { group: 'verification', action: 'verified' }
    )
    message.success(t('contractors.verifiedToast'))
    setVerifying(false)
  }

  // Chỉ xóa khi chưa phát sinh dự án, xác minh, lời mời hay hợp tác; ngược lại dùng Ẩn (§11).
  const deleteContractor = async () => {
    await remove.mutateAsync(contractor.id)
    message.success(t('contractors.deletedToast'))
    router.push(ADMIN_ROUTES.CONTRACTORS)
  }

  const submitUnverify = async () => {
    const values = await reasonForm.validateFields().catch(() => null)
    if (!values) return
    const reason = values.reason.trim()
    await commit(
      { ...contractor, verified: false, unverifyReason: reason },
      { group: 'verification', action: 'unverified', reason }
    )
    setUnverifying(false)
  }

  const survey =
    contractor.surveyCapable === undefined
      ? t('contractors.surveyUnknown')
      : contractor.surveyCapable && contractor.surveyWithinHours > 0
        ? t('contractors.surveyLine', { hours: contractor.surveyWithinHours })
        : t('contractors.surveyNo')

  const overview = (
    <Space orientation='vertical' size={16} style={{ width: '100%' }}>
      <Card title={t('contractors.sections.capability')}>
        <Descriptions
          size='small'
          column={{ xs: 1, md: 2 }}
          items={[
            { key: 'kind', label: t('contractors.kind'), children: contractor.kind || '-' },
            {
              key: 'exp',
              label: t('contractors.experienceYears'),
              children:
                contractor.experienceYears === undefined
                  ? '-'
                  : t('contractors.experienceLine', { years: contractor.experienceYears })
            },
            {
              key: 'types',
              label: t('contractors.buildingTypes'),
              children: contractor.buildingTypeIds?.length ? (
                <Space size={4} wrap>
                  {contractor.buildingTypeIds.map((typeId) => (
                    <Tag key={typeId}>{typeLabel(typeId)}</Tag>
                  ))}
                </Space>
              ) : (
                '-'
              )
            },
            {
              key: 'scopes',
              label: t('contractors.scopes'),
              children: contractor.scopes?.length ? (
                <Space size={4} wrap>
                  {contractor.scopes.map((scope) => (
                    <Tag key={scope}>{t(`contractorScope.${scope}`)}</Tag>
                  ))}
                </Space>
              ) : (
                '-'
              )
            },
            {
              key: 'specialties',
              label: t('contractors.specialties'),
              children: contractor.strengths.length ? (
                <Space size={4} wrap>
                  {contractor.strengths.map((item) => (
                    <Tag key={item} color='blue'>
                      {item}
                    </Tag>
                  ))}
                </Space>
              ) : (
                '-'
              )
            },
            {
              key: 'rating',
              label: t('contractors.rating'),
              children: contractor.reviewCount
                ? t('contractors.ratingValue', {
                    rating: contractor.rating.toFixed(1),
                    count: contractor.reviewCount
                  })
                : t('contractors.noReviews')
            },
            {
              key: 'areas',
              label: t('contractors.serviceAreas'),
              children: contractor.serviceAreas.length ? (
                <Paragraph style={{ margin: 0 }} ellipsis={{ rows: 1, expandable: 'collapsible' }}>
                  {contractor.serviceAreas.join(', ')}
                </Paragraph>
              ) : (
                '-'
              )
            },
            { key: 'survey', label: t('contractors.surveyCapable'), children: survey },
            {
              key: 'accepting',
              label: t('contractors.accepting'),
              children: (
                <Tag color={contractor.acceptingProjects ? 'green' : 'default'}>
                  {contractor.acceptingProjects ? t('contractors.acceptingOn') : t('contractors.acceptingOff')}
                </Tag>
              )
            }
          ]}
        />
      </Card>

      <Card title={t('contractors.introTitle')}>
        <Paragraph style={{ whiteSpace: 'pre-wrap' }}>{contractor.intro || '-'}</Paragraph>
        <Descriptions
          size='small'
          column={{ xs: 1, md: 3 }}
          items={[
            {
              key: 'founded',
              label: t('contractors.foundedYear'),
              children: t('contractors.foundedLine', { year: contractor.foundedYear })
            },
            {
              key: 'team',
              label: t('contractors.teamSize'),
              children: t('contractors.teamLine', { count: contractor.teamSize })
            },
            {
              key: 'office',
              label: t('contractors.office'),
              children: composeLocation(contractor.headquarters) || contractor.officeAddress || '-'
            }
          ]}
        />
      </Card>

      <Card title={t('contractors.sections.photos')}>
        <Space wrap size={16}>
          {PHOTO_SLOTS.map((slot, index) => (
            <div key={slot} style={{ width: 200 }}>
              <Image
                src={contractor.photos[index]?.url}
                alt=''
                width={200}
                height={130}
                style={{ objectFit: 'cover', borderRadius: 8 }}
                fallback='data:image/gif;base64,R0lGODlhAQABAAAAACw='
              />
              <Text type='secondary' style={{ display: 'block', marginTop: 4, fontSize: 12 }}>
                {t(`contractors.photoSlots.${slot}`)}
              </Text>
            </div>
          ))}
        </Space>
      </Card>

      <Card title={t('contractors.sections.coverage')}>
        <Descriptions
          size='small'
          column={1}
          items={[
            {
              key: 'hq',
              label: t('contractors.headquarters'),
              children: contractor.headquarters?.provinceCode ? (
                <Space size={6} wrap>
                  <Text>
                    {t('contractors.locationLine', {
                      address: composeLocation(contractor.headquarters),
                      radius: contractor.headquarters.radiusKm ?? '-'
                    })}
                  </Text>
                  {hasValidCoordinates(contractor.headquarters) ? null : (
                    <Tag color='orange'>{t('contractors.coordsInvalid')}</Tag>
                  )}
                </Space>
              ) : (
                '-'
              )
            },
            ...(contractor.branches ?? []).map((branch) => ({
              key: branch.id,
              label: branch.name,
              children: (
                <Space size={6} wrap>
                  <Text>
                    {t('contractors.locationLine', {
                      address: composeLocation(branch),
                      radius: branch.radiusKm ?? '-'
                    })}
                  </Text>
                  {branch.active ? null : <Tag>{t('contractors.branchInactive')}</Tag>}
                  {hasValidCoordinates(branch) ? null : <Tag color='orange'>{t('contractors.coordsInvalid')}</Tag>}
                </Space>
              )
            }))
          ]}
        />
      </Card>

      <Card title={t('contractors.sections.contact')}>
        <Descriptions
          size='small'
          column={{ xs: 1, md: 3 }}
          items={[
            { key: 'person', label: t('contractors.person'), children: contractor.contact?.person || '-' },
            { key: 'phone', label: t('contractors.phone'), children: contractor.contact?.phone || '-' },
            { key: 'email', label: 'Email', children: contractor.contact?.email || '-' }
          ]}
        />
      </Card>
    </Space>
  )

  const history = (
    <Card>
      <Table<CmsContractorHistoryEntry>
        rowKey='id'
        size='small'
        dataSource={contractor.history ?? []}
        locale={{ emptyText: <Empty description={t('contractors.noHistory')} /> }}
        pagination={{ pageSize: 20, hideOnSinglePage: true }}
        columns={[
          { title: t('contractors.historyAt'), dataIndex: 'at', width: 160, render: (value: string) => stamp(value) },
          { title: t('contractors.historyBy'), dataIndex: 'by', width: 150 },
          {
            title: t('contractors.historyGroup'),
            dataIndex: 'group',
            width: 140,
            render: (value: CmsContractorHistoryEntry['group']) => t(`contractorHistoryGroup.${value}`)
          },
          {
            title: t('contractors.historyAction'),
            dataIndex: 'action',
            render: (value: string, entry) => (
              <Space orientation='vertical' size={0}>
                <Text>
                  {(CONTRACTOR_HISTORY_ACTIONS as readonly string[]).includes(value)
                    ? t(`contractorHistoryAction.${value as ContractorHistoryAction}`)
                    : value}
                </Text>
                {entry.after ? (
                  <Text type='secondary' style={{ fontSize: 12 }}>
                    {entry.before ? `${entry.before} → ` : ''}
                    {entry.after}
                  </Text>
                ) : null}
              </Space>
            )
          },
          { title: t('contractors.reason'), dataIndex: 'reason', render: (value?: string) => value || '-' }
        ]}
      />
    </Card>
  )

  return (
    <AdminPage
      title={contractor.name}
      description={t('contractors.detailDescription')}
      actions={
        <>
          <Link href={ADMIN_ROUTES.CONTRACTORS}>
            <Button icon={<ArrowLeftOutlined />}>{t('contractors.backToList')}</Button>
          </Link>
          <Button
            icon={<EditOutlined />}
            onClick={() => {
              form.setFieldsValue({ ...contractor })
              setEditing(true)
            }}
          >
            {t('contractors.editProfile')}
          </Button>
          {contractor.verified ? (
            <Button danger icon={<StopOutlined />} onClick={() => setUnverifying(true)}>
              {t('contractors.unverify')}
            </Button>
          ) : (
            <Button type='primary' icon={<SafetyCertificateFilled />} onClick={() => setVerifying(true)}>
              {t('contractors.verify')}
            </Button>
          )}
          {deleteBlocked ? (
            <Tooltip title={t('contractors.deleteBlocked')}>
              <Button danger icon={<DeleteOutlined />} disabled>
                {t('contractors.delete')}
              </Button>
            </Tooltip>
          ) : (
            <Popconfirm
              title={t('contractors.deleteConfirm', { name: contractor.name })}
              okText={t('actions.confirm')}
              okButtonProps={{ danger: true, loading: remove.isPending }}
              cancelText={t('actions.cancel')}
              onConfirm={deleteContractor}
            >
              <Button danger icon={<DeleteOutlined />}>
                {t('contractors.delete')}
              </Button>
            </Popconfirm>
          )}
        </>
      }
    >
      <MockApiNotice />
      <Card>
        <div className='flex flex-wrap items-center gap-4'>
          <Avatar shape='square' size={72} src={contractor.logoUrl}>
            {contractor.name.slice(0, 1)}
          </Avatar>
          <div className='min-w-0 flex-1'>
            <Text strong style={{ fontSize: 18 }}>
              {contractor.name}{' '}
              {contractor.verified ? (
                <SafetyCertificateFilled style={{ color: '#2a753f' }} aria-label={t('contractors.verified')} />
              ) : null}
            </Text>
            {contractor.shortDescription ? (
              <Text type='secondary' style={{ display: 'block' }}>
                {contractor.shortDescription}
              </Text>
            ) : null}
            <Space size={4} wrap style={{ marginTop: 8 }}>
              <Tag color={contractor.verified ? 'green' : 'gold'}>
                {contractor.verified ? t('contractors.verified') : t('contractors.unverified')}
              </Tag>
              <Tag color={contractor.hidden ? 'default' : 'blue'}>
                {contractor.hidden ? t('contractors.hiddenTag') : t('contractors.visible')}
              </Tag>
            </Space>
            {!contractor.verified && contractor.unverifyReason ? (
              <Text type='secondary' style={{ display: 'block', marginTop: 6, fontSize: 12 }}>
                {t('contractors.lastUnverifyReason', { reason: contractor.unverifyReason })}
              </Text>
            ) : null}
          </div>
        </div>
      </Card>

      {licenseExpired ? <Alert type='warning' showIcon title={t('contractors.licenseExpiredWarning')} /> : null}

      <Tabs
        activeKey={tab}
        onChange={setTab}
        type='card'
        items={[
          { key: 'overview', label: t('contractors.tabs.overview'), children: overview },
          {
            key: 'projects',
            label: t('contractors.tabs.projects'),
            children: <ContractorProjects contractor={contractor} />
          },
          { key: 'legal', label: t('contractors.tabs.legal'), children: <ContractorLegal contractor={contractor} /> },
          {
            key: 'partnership',
            label: t('contractors.tabs.partnership'),
            children: <ContractorPartnership contractor={contractor} />
          },
          { key: 'history', label: t('contractors.tabs.history'), children: history }
        ]}
      />

      <Drawer
        open={editing}
        title={t('contractors.editProfile')}
        size={820}
        onClose={() => setEditing(false)}
        extra={
          <Space>
            <Button onClick={() => setEditing(false)}>{t('actions.cancel')}</Button>
            <Button type='primary' loading={isPending} onClick={saveProfile}>
              {t('actions.save')}
            </Button>
          </Space>
        }
      >
        <Form form={form} layout='vertical'>
          <ContractorFields form={form} openInvitations={openInvitations} />
        </Form>
      </Drawer>

      <Modal
        open={verifying}
        title={t('contractors.verifyTitle', { name: contractor.name })}
        okText={t('contractors.verify')}
        okButtonProps={{ disabled: gaps.length > 0, loading: isPending }}
        cancelText={t('actions.cancel')}
        onOk={verify}
        onCancel={() => setVerifying(false)}
      >
        <Paragraph type='secondary'>{t('contractors.verifyHint')}</Paragraph>
        <List
          size='small'
          dataSource={GAPS}
          renderItem={(gap) => (
            <List.Item>
              <Space>
                {gaps.includes(gap) ? (
                  <CloseCircleFilled style={{ color: '#dc2626' }} />
                ) : (
                  <CheckCircleFilled style={{ color: '#2a753f' }} />
                )}
                <Text>{t(`contractors.gaps.${gap}`)}</Text>
                <Text type='secondary'>
                  {gaps.includes(gap) ? t('contractors.gapMissing') : t('contractors.gapOk')}
                </Text>
              </Space>
            </List.Item>
          )}
        />
      </Modal>

      <Modal
        open={unverifying}
        title={t('contractors.unverifyTitle', { name: contractor.name })}
        okText={t('contractors.unverify')}
        okButtonProps={{ danger: true, loading: isPending }}
        cancelText={t('actions.cancel')}
        onOk={submitUnverify}
        onCancel={() => setUnverifying(false)}
        destroyOnHidden
      >
        <Form form={reasonForm} layout='vertical' preserve={false}>
          <Form.Item
            name='reason'
            label={t('contractors.reason')}
            rules={[{ required: true, whitespace: true, message: t('contractors.reasonRequired') }]}
          >
            <Input.TextArea rows={3} maxLength={500} showCount />
          </Form.Item>
        </Form>
      </Modal>
    </AdminPage>
  )
}
