'use client'

import { EyeOutlined, SafetyCertificateFilled } from '@ant-design/icons'
import { Avatar, Select, Space, Tag, Typography } from 'antd'
import { useTranslations } from 'next-intl'
import { useMemo, useState } from 'react'

import { Link, useRouter } from '@/i18n/navigation'
import { useAuthStore } from '@/shared/auth'
import type { CmsContractor, CmsServiceRegion } from '@/shared/cms'
import { adminContractorRoute } from '@/shared/constants'
import { useAdminCollection } from '../../hooks/use-admin-data'
import { newAdminId, todayKey } from '../../services/admin.service'
import {
  CONTRACTOR_SCOPES,
  derivePublicFields,
  legalStatusOf,
  normalizeProfile,
  partnershipStatusOf,
  projectCounts,
  visibilityProblem,
  withHistory,
  type LegalStatus
} from '../../services/contractor.service'
import { ResourceManager } from '../common/resource-manager'
import type { RowAction } from '../common/row-actions-menu'
import { ContractorFields, PHOTO_SLOTS, useOpenInvitations } from './contractor-fields'

const { Text } = Typography

const REGIONS: CmsServiceRegion[] = ['north', 'central', 'south']
const LEGAL_STATUSES: LegalStatus[] = ['none', 'pending', 'verified', 'needsMore']
const PARTNERSHIP_STATUSES = ['none', 'pending', 'verified', 'paused', 'ended'] as const

export const LEGAL_TAG: Record<LegalStatus, string> = {
  none: 'default',
  pending: 'gold',
  verified: 'green',
  needsMore: 'red'
}

interface Filters {
  region?: CmsServiceRegion
  specialty?: string
  buildingType?: string
  scope?: string
  legal?: LegalStatus
  partnership?: string
  accepting?: 'on' | 'off'
  visibility?: 'shown' | 'hidden'
}

export function blankContractor(): CmsContractor {
  return {
    id: newAdminId('ctr'),
    name: '',
    kind: '',
    verified: false,
    rating: 0,
    reviewCount: 0,
    similarProjects: 0,
    completedProjects: 0,
    distanceKm: 0,
    serviceAreas: [],
    region: 'south',
    surveyCapable: false,
    surveyWithinHours: 0,
    // Nhà thầu mới mặc định Tạm ngừng nhận dự án và Ẩn để hoàn thiện hồ sơ trước (§1, §3).
    acceptingProjects: false,
    hidden: true,
    intro: '',
    strengths: [],
    buildingTypeIds: [],
    scopes: [],
    photos: [],
    foundedYear: new Date().getFullYear(),
    teamSize: 0,
    officeAddress: '',
    warrantyMonths: 12,
    legalChecks: [],
    featuredProjects: [],
    verifiedProjects: 0,
    headquarters: {
      provinceCode: null,
      provinceName: '',
      wardCode: null,
      wardName: '',
      street: '',
      lat: null,
      lng: null,
      radiusKm: null
    },
    branches: [],
    partnership: { verified: false, status: 'none', since: '', contractCode: '', signedAt: '', pageCount: 0 },
    contact: { person: '', phone: '', email: '' },
    history: []
  }
}

/**
 * Chuẩn hóa + suy trường công khai + ghi lịch sử cho một lần lưu hồ sơ — dùng
 * chung cho form ở danh sách và ở trang chi tiết.
 */
export function useProfileCommit() {
  const t = useTranslations('admin')
  const admin = useAuthStore((state) => state.user?.name ?? 'Admin')
  const captions = PHOTO_SLOTS.map((slot) => t(`contractors.photoSlots.${slot}`))

  return (values: Record<string, unknown>, current: CmsContractor, isNew: boolean): CmsContractor => {
    let next = normalizeProfile({ ...current, ...values } as CmsContractor, captions)
    const entries: { group: 'profile' | 'visibility'; action: string }[] = [
      { group: 'profile', action: isNew ? 'created' : 'updated' }
    ]
    if (!isNew && Boolean(current.hidden) !== Boolean(next.hidden)) {
      entries.push({ group: 'visibility', action: next.hidden ? 'hidden' : 'shown' })
    }
    if (!isNew && current.acceptingProjects !== next.acceptingProjects) {
      entries.push({ group: 'profile', action: next.acceptingProjects ? 'acceptingOn' : 'acceptingOff' })
    }
    for (const entry of entries) next = withHistory(next, { ...entry, by: admin })
    return derivePublicFields(next, todayKey())
  }
}

/**
 * DANH SÁCH NHÀ THẦU (epic ContractorManagement §1).
 *
 * Số dự án và trạng thái hồ sơ pháp lý do hệ thống tính — không sửa ở đây. Trạng
 * thái nhận dự án không bật/tắt trên bảng, chỉ đổi trong form hoặc trang chi
 * tiết. Dự án, pháp lý và hợp tác quản lý ở trang chi tiết, không thành nút riêng
 * trên từng dòng.
 */
export function ContractorManager() {
  const t = useTranslations('admin')
  const router = useRouter()
  const [filters, setFilters] = useState<Filters>({})
  const { data: contractors = [] } = useAdminCollection('contractors')
  const { data: buildingTypes = [] } = useAdminCollection('buildingTypes')
  const openInvitations = useOpenInvitations()
  const commit = useProfileCommit()
  const today = todayKey()

  const specialties = useMemo(
    () => [...new Set(contractors.flatMap((item) => item.strengths))].sort((a, b) => a.localeCompare(b, 'vi')),
    [contractors]
  )

  const set =
    <K extends keyof Filters>(key: K) =>
    (value: Filters[K]) =>
      setFilters((prev) => ({ ...prev, [key]: value }))

  const matches = (item: CmsContractor) =>
    (!filters.region || item.region === filters.region) &&
    (!filters.specialty || item.strengths.includes(filters.specialty)) &&
    (!filters.buildingType || (item.buildingTypeIds ?? []).includes(filters.buildingType)) &&
    (!filters.scope || (item.scopes ?? []).includes(filters.scope as (typeof CONTRACTOR_SCOPES)[number])) &&
    (!filters.legal || legalStatusOf(item, today) === filters.legal) &&
    (!filters.partnership || partnershipStatusOf(item.partnership) === filters.partnership) &&
    (!filters.accepting || item.acceptingProjects === (filters.accepting === 'on')) &&
    (!filters.visibility || Boolean(item.hidden) === (filters.visibility === 'hidden'))

  const select = <K extends keyof Filters>(
    key: K,
    placeholder: string,
    options: { value: string; label: string }[]
  ) => (
    <Select
      allowClear
      showSearch={{ optionFilterProp: 'label' }}
      placeholder={placeholder}
      value={filters[key]}
      onChange={set(key) as (value: string | undefined) => void}
      options={options}
      style={{ minWidth: 170 }}
    />
  )

  return (
    <ResourceManager
      collection='contractors'
      title={t('nav.contractors')}
      description={t('contractors.description')}
      drawerWidth={820}
      createItem={blankContractor}
      searchText={(item) => item.name}
      filterItems={matches}
      filterKey={JSON.stringify(filters)}
      fromFormValues={(values, current) => commit(values, current, !contractors.some((item) => item.id === current.id))}
      validate={(next) => (visibilityProblem(next) ? t('contractors.visibleNeedsCapability') : null)}
      // Thao tác trên từng dòng chỉ gồm Xem chi tiết và Chỉnh sửa (§1); xóa nằm ở trang chi tiết (§11).
      allowDelete={false}
      banner={
        <Space wrap size={8}>
          {select(
            'region',
            t('contractors.region'),
            REGIONS.map((value) => ({ value, label: t(`contractors.regions.${value}`) }))
          )}
          {select(
            'specialty',
            t('contractors.specialties'),
            specialties.map((value) => ({ value, label: value }))
          )}
          {select(
            'buildingType',
            t('contractors.buildingTypes'),
            buildingTypes.map((type) => ({ value: type.id, label: type.label }))
          )}
          {select(
            'scope',
            t('contractors.scopes'),
            CONTRACTOR_SCOPES.map((value) => ({ value, label: t(`contractorScope.${value}`) }))
          )}
          {select(
            'legal',
            t('contractors.legalStatus'),
            LEGAL_STATUSES.map((value) => ({ value, label: t(`contractorLegal.${value}`) }))
          )}
          {select(
            'partnership',
            t('contractors.partnershipStatus'),
            PARTNERSHIP_STATUSES.map((value) => ({ value, label: t(`contractorPartnership.${value}`) }))
          )}
          {select('accepting', t('contractors.accepting'), [
            { value: 'on', label: t('contractors.acceptingOn') },
            { value: 'off', label: t('contractors.acceptingOff') }
          ])}
          {select('visibility', t('contractors.visibility'), [
            { value: 'shown', label: t('contractors.visible') },
            { value: 'hidden', label: t('contractors.hiddenTag') }
          ])}
        </Space>
      }
      rowActions={(item): RowAction[] => [
        {
          key: 'view',
          label: t('contractors.viewDetail'),
          icon: <EyeOutlined />,
          onClick: () => router.push(adminContractorRoute(item.id))
        }
      ]}
      columns={[
        {
          title: t('contractors.info'),
          dataIndex: 'name',
          render: (_, record) => (
            <Space size={10}>
              <Avatar shape='square' src={record.logoUrl} size={40}>
                {record.name.slice(0, 1)}
              </Avatar>
              <div style={{ minWidth: 0 }}>
                <Link href={adminContractorRoute(record.id)}>
                  <Text strong>
                    {record.name || t('contractors.unnamed')}{' '}
                    {record.verified ? (
                      <SafetyCertificateFilled style={{ color: '#2a753f' }} aria-label={t('contractors.verified')} />
                    ) : null}
                  </Text>
                </Link>
                <Text type='secondary' style={{ display: 'block', fontSize: 12 }}>
                  {record.kind}
                </Text>
              </div>
            </Space>
          )
        },
        {
          title: t('contractors.region'),
          key: 'region',
          width: 120,
          render: (_, record) => (record.region ? t(`contractors.regions.${record.region}`) : '—')
        },
        {
          title: t('contractors.projects'),
          key: 'projects',
          width: 140,
          render: (_, record) => {
            const counts = projectCounts(record)
            return (
              <div>
                <Text style={{ display: 'block' }}>{t('contractors.projectTotal', { count: counts.total })}</Text>
                {counts.total > 0 ? (
                  <Text type='secondary' style={{ fontSize: 12 }}>
                    {t('contractors.projectVerified', { count: counts.verified })}
                  </Text>
                ) : null}
              </div>
            )
          }
        },
        {
          title: t('contractors.legalStatus'),
          key: 'legal',
          width: 150,
          render: (_, record) => {
            const status = legalStatusOf(record, today)
            return <Tag color={LEGAL_TAG[status]}>{t(`contractorLegal.${status}`)}</Tag>
          }
        },
        {
          title: t('contractors.accepting'),
          key: 'accepting',
          width: 170,
          render: (_, record) => (
            <Tag color={record.acceptingProjects ? 'green' : 'default'}>
              {record.acceptingProjects ? t('contractors.acceptingOn') : t('contractors.acceptingOff')}
            </Tag>
          )
        },
        {
          title: t('contractors.visibility'),
          key: 'visibility',
          width: 130,
          render: (_, record) => (
            <Tag color={record.hidden ? 'default' : 'blue'}>
              {record.hidden ? t('contractors.hiddenTag') : t('contractors.visible')}
            </Tag>
          )
        }
      ]}
      renderForm={(form) => <ContractorFields form={form} openInvitations={openInvitations} />}
    />
  )
}
