'use client'

import {
  DeleteOutlined,
  LeftOutlined,
  LockOutlined,
  PlusOutlined,
  RightOutlined,
  UnlockOutlined
} from '@ant-design/icons'
import {
  App,
  Button,
  Card,
  Checkbox,
  DatePicker,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Segmented,
  Skeleton,
  Space,
  Switch,
  Tag,
  TimePicker,
  Tooltip,
  Typography
} from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

import {
  isActiveSurvey,
  isSurveyDayClosed,
  isSurveySlotClosed,
  nextSurveySlotId,
  surveySlotRange,
  type CmsContractorInvitation,
  type CmsSurveySchedule,
  type CmsSurveySlot
} from '@/shared/cms'
import { useAdminCollection, useAdminDocument, useSaveAdminDocument } from '../../hooks/use-admin-data'
import { newAdminId } from '../../services/admin.service'
import { AdminPage } from '../common/admin-page'
import { MockApiNotice } from '../common/mock-api-notice'

const { Text } = Typography

/** Thứ Hai đứng đầu tuần theo lịch Việt Nam; giá trị theo `Date.getDay()`. */
const WEEKDAYS = [1, 2, 3, 4, 5, 6, 0] as const
type Weekday = (typeof WEEKDAYS)[number]

type ViewMode = 'day' | 'week'

interface SlotRow {
  id: string
  range: [Dayjs, Dayjs]
  active: boolean
}

interface ConfigValues {
  workingDays: number[]
  windowDays: number
  slots: SlotRow[]
}

/** Đang khóa gì: cả ngày (`slotId: null`) hoặc một khung. */
interface LockTarget {
  date: string
  slotId: string | null
  closureId?: string
}

const toRow = (slot: CmsSurveySlot): SlotRow => ({
  id: slot.id,
  range: [dayjs(slot.start, 'HH:mm'), dayjs(slot.end, 'HH:mm')],
  active: slot.active
})

/**
 * LỊCH KHẢO SÁT NHÀ THẦU (spec admin #13, STORY-029).
 *
 * Ba việc trên một màn: cấu hình ngày làm việc + số ngày khách được chọn + danh
 * sách khung giờ; xem lịch khảo sát đã đặt theo ngày / tuần; khóa một ngày hoặc
 * một khung giờ. Khóa không tự hủy lịch đã đặt — ngày / khung còn lịch thì phải
 * xử lý lịch ở màn Lời mời nhà thầu trước. Khung giờ đã có lịch đặt không xóa
 * được, chỉ tắt để ngừng nhận lịch mới.
 */
export function SurveyScheduleManager() {
  const t = useTranslations('admin')
  const { message } = App.useApp()
  const [form] = Form.useForm<ConfigValues>()
  const [lockForm] = Form.useForm<{ reason?: string }>()
  const { data: schedule, isPending } = useAdminDocument('surveySchedule')
  const save = useSaveAdminDocument('surveySchedule')
  const { data: invitations = [] } = useAdminCollection('contractorInvitations')

  const [mode, setMode] = useState<ViewMode>('week')
  const [anchor, setAnchor] = useState<Dayjs>(() => dayjs())
  const [locking, setLocking] = useState<LockTarget | null>(null)

  useEffect(() => {
    if (schedule) {
      form.setFieldsValue({
        workingDays: schedule.workingDays,
        windowDays: schedule.windowDays,
        slots: schedule.slots.map(toRow)
      })
    }
  }, [schedule, form])

  if (isPending || !schedule) return <Skeleton active paragraph={{ rows: 12 }} />

  const active = invitations.filter(isActiveSurvey)
  const bookingsAt = (date: string, slotId?: string) =>
    active.filter((item) => item.survey.date === date && (slotId === undefined || item.survey.slotId === slotId))
  const everBooked = (slotId: string) => invitations.some((item) => item.survey.slotId === slotId)

  // Thứ Hai của tuần chứa ngày đang xem.
  const monday = anchor.subtract((anchor.day() + 6) % 7, 'day').startOf('day')
  const days =
    mode === 'week' ? Array.from({ length: 7 }, (_, index) => monday.add(index, 'day')) : [anchor.startOf('day')]
  const step = mode === 'week' ? 7 : 1

  const saveConfig = async () => {
    const values = await form.validateFields().catch(() => null)
    if (!values) return
    const rows = (form.getFieldsValue(true) as ConfigValues).slots
    const slots: CmsSurveySlot[] = rows
      .map((row) => ({
        id: row.id,
        start: row.range[0].format('HH:mm'),
        end: row.range[1].format('HH:mm'),
        active: row.active
      }))
      .sort((a, b) => a.start.localeCompare(b.start))
    await save.mutateAsync({ ...schedule, workingDays: values.workingDays, windowDays: values.windowDays, slots })
    message.success(t('feedback.saved'))
  }

  const openLock = (target: LockTarget) => {
    lockForm.resetFields()
    setLocking(target)
  }

  const submitLock = async () => {
    if (!locking) return
    const next: CmsSurveySchedule = locking.closureId
      ? { ...schedule, closures: schedule.closures.filter((closure) => closure.id !== locking.closureId) }
      : {
          ...schedule,
          closures: [
            // Khóa cả ngày thì gộp các khung lẻ đã khóa của ngày đó vào một bản ghi.
            ...schedule.closures.filter((closure) => !(locking.slotId === null && closure.date === locking.date)),
            {
              id: newAdminId('scl'),
              date: locking.date,
              slotId: locking.slotId,
              reason: lockForm.getFieldValue('reason')?.trim() || undefined
            }
          ]
        }
    await save.mutateAsync(next)
    message.success(t(locking.closureId ? 'surveySchedule.unlockedToast' : 'surveySchedule.lockedToast'))
    setLocking(null)
  }

  const lockBlocked = locking && !locking.closureId ? bookingsAt(locking.date, locking.slotId ?? undefined) : []

  const bookingChip = (item: CmsContractorInvitation) => (
    <Tooltip key={item.id} title={`${item.id} · ${item.projectName} · ${item.contractorName} · ${item.survey.phone}`}>
      <Tag
        color={item.survey.status === 'confirmed' ? 'green' : 'gold'}
        style={{ marginInlineEnd: 0, maxWidth: '100%' }}
      >
        <span className='block truncate'>{item.contractorName}</span>
      </Tag>
    </Tooltip>
  )

  return (
    <AdminPage title={t('nav.surveySchedule')} description={t('surveySchedule.description')}>
      <MockApiNotice />
      <Card
        title={t('surveySchedule.configTitle')}
        extra={
          <Space>
            <Button
              onClick={() =>
                form.setFieldsValue({
                  workingDays: schedule.workingDays,
                  windowDays: schedule.windowDays,
                  slots: schedule.slots.map(toRow)
                })
              }
            >
              {t('actions.revert')}
            </Button>
            <Button type='primary' loading={save.isPending} onClick={saveConfig}>
              {t('actions.save')}
            </Button>
          </Space>
        }
      >
        <Form form={form} layout='vertical'>
          <div className='flex flex-wrap gap-x-8'>
            <Form.Item
              name='workingDays'
              label={t('surveySchedule.workingDays')}
              rules={[{ required: true, type: 'array', min: 1, message: t('surveySchedule.workingDaysRule') }]}
            >
              <Checkbox.Group
                options={WEEKDAYS.map((day) => ({ value: day, label: t(`surveySchedule.weekdays.${day}`) }))}
              />
            </Form.Item>
            <Form.Item
              name='windowDays'
              label={t('surveySchedule.windowDays')}
              extra={t('surveySchedule.windowHint')}
              rules={[{ required: true, type: 'integer', min: 1, max: 60, message: t('surveySchedule.windowRule') }]}
            >
              <InputNumber
                min={1}
                max={60}
                precision={0}
                suffix={t('surveySchedule.daysUnit')}
                style={{ width: 180 }}
              />
            </Form.Item>
          </div>

          <Text strong style={{ display: 'block', marginBottom: 8 }}>
            {t('surveySchedule.slots')}
          </Text>
          <Form.List
            name='slots'
            rules={[
              {
                validator: async (_, rows?: SlotRow[]) => {
                  if (!rows?.some((row) => row.active)) throw new Error(t('surveySchedule.slotsRule'))
                  const sorted = [...rows].sort((a, b) => a.range[0].diff(b.range[0]))
                  for (let index = 1; index < sorted.length; index += 1) {
                    const previous = sorted[index - 1]
                    const current = sorted[index]
                    if (previous && current && current.range[0].isBefore(previous.range[1])) {
                      throw new Error(t('surveySchedule.overlapRule'))
                    }
                  }
                }
              }
            ]}
          >
            {(fields, { add, remove }, { errors }) => (
              <Space orientation='vertical' size={8} style={{ width: '100%' }}>
                {fields.map((field) => {
                  const row = form.getFieldValue(['slots', field.name]) as SlotRow | undefined
                  const booked = row ? everBooked(row.id) : false
                  return (
                    <div key={field.key} className='flex flex-wrap items-center gap-3'>
                      <Form.Item
                        name={[field.name, 'range']}
                        noStyle
                        rules={[
                          { required: true, message: t('fields.requiredMessage') },
                          {
                            validator: (_, value?: [Dayjs, Dayjs]) =>
                              value && !value[1].isAfter(value[0])
                                ? Promise.reject(new Error(t('surveySchedule.rangeRule')))
                                : Promise.resolve()
                          }
                        ]}
                      >
                        <TimePicker.RangePicker format='HH:mm' minuteStep={15} order={false} />
                      </Form.Item>
                      <Form.Item name={[field.name, 'active']} valuePropName='checked' noStyle>
                        <Switch
                          checkedChildren={t('surveySchedule.slotOn')}
                          unCheckedChildren={t('surveySchedule.slotOff')}
                        />
                      </Form.Item>
                      <Tooltip title={booked ? t('surveySchedule.slotInUse') : t('actions.removeRow')}>
                        <Button
                          type='text'
                          danger
                          disabled={booked}
                          icon={<DeleteOutlined />}
                          aria-label={t('actions.removeRow')}
                          onClick={() => remove(field.name)}
                        />
                      </Tooltip>
                    </div>
                  )
                })}
                <Form.ErrorList errors={errors} />
                <Button
                  type='dashed'
                  icon={<PlusOutlined />}
                  onClick={() => {
                    const rows = (form.getFieldValue('slots') as SlotRow[] | undefined) ?? []
                    // Mã mới lớn hơn mọi mã đang có VÀ mọi mã đã lưu — không tái dùng mã cũ.
                    const draftIds = rows.map((item) => ({ id: item.id, start: '', end: '', active: true }))
                    const id = nextSurveySlotId({ ...schedule, slots: [...schedule.slots, ...draftIds] })
                    const last = rows.at(-1)?.range[1] ?? dayjs('08:00', 'HH:mm')
                    add({ id, range: [last, last.add(1, 'hour')], active: true })
                  }}
                  style={{ width: 220 }}
                >
                  {t('surveySchedule.addSlot')}
                </Button>
              </Space>
            )}
          </Form.List>
        </Form>
      </Card>

      <Card
        title={t('surveySchedule.calendarTitle')}
        extra={
          <Space wrap>
            <Segmented<ViewMode>
              value={mode}
              onChange={setMode}
              options={[
                { value: 'day', label: t('surveySchedule.dayView') },
                { value: 'week', label: t('surveySchedule.weekView') }
              ]}
            />
            <Button icon={<LeftOutlined />} onClick={() => setAnchor(anchor.subtract(step, 'day'))} />
            <DatePicker
              value={anchor}
              allowClear={false}
              format='DD/MM/YYYY'
              onChange={(value) => value && setAnchor(value)}
            />
            <Button icon={<RightOutlined />} onClick={() => setAnchor(anchor.add(step, 'day'))} />
            <Button onClick={() => setAnchor(dayjs())}>{t('surveySchedule.today')}</Button>
          </Space>
        }
      >
        <Text type='secondary' style={{ display: 'block', marginBottom: 12, fontSize: 12 }}>
          {t('surveySchedule.calendarHint')}
        </Text>
        {schedule.slots.length ? (
          <div className='overflow-x-auto'>
            <table className='w-full border-collapse text-sm' style={{ minWidth: mode === 'week' ? 900 : 360 }}>
              <thead>
                <tr>
                  <th className='w-28 border-b p-2 text-left font-medium'>{t('surveySchedule.slotColumn')}</th>
                  {days.map((day) => {
                    const key = day.format('YYYY-MM-DD')
                    const working = schedule.workingDays.includes(day.day())
                    const closure = schedule.closures.find((item) => item.date === key && item.slotId === null)
                    const past = day.isBefore(dayjs(), 'day')
                    return (
                      <th key={key} className='border-b p-2 text-left align-top font-medium'>
                        <div>{t(`surveySchedule.weekdays.${day.day() as Weekday}`)}</div>
                        <Text type='secondary' style={{ fontSize: 12 }}>
                          {day.format('DD/MM')}
                        </Text>
                        <div className='mt-1'>
                          {!working ? (
                            <Tag>{t('surveySchedule.dayOff')}</Tag>
                          ) : closure ? (
                            <Button
                              size='small'
                              icon={<UnlockOutlined />}
                              disabled={past}
                              onClick={() => openLock({ date: key, slotId: null, closureId: closure.id })}
                            >
                              {t('surveySchedule.unlockDay')}
                            </Button>
                          ) : (
                            <Button
                              size='small'
                              icon={<LockOutlined />}
                              disabled={past}
                              onClick={() => openLock({ date: key, slotId: null })}
                            >
                              {t('surveySchedule.lockDay')}
                            </Button>
                          )}
                        </div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {schedule.slots.map((slot) => (
                  <tr key={slot.id}>
                    <td className='border-b p-2 align-top whitespace-nowrap'>
                      <Text delete={!slot.active}>{surveySlotRange(slot)}</Text>
                      {!slot.active ? (
                        <Text type='secondary' style={{ display: 'block', fontSize: 11 }}>
                          {t('surveySchedule.slotOff')}
                        </Text>
                      ) : null}
                    </td>
                    {days.map((day) => {
                      const key = day.format('YYYY-MM-DD')
                      const working = schedule.workingDays.includes(day.day())
                      const bookings = bookingsAt(key, slot.id)
                      const dayClosed = isSurveyDayClosed(schedule, key)
                      const slotClosure = schedule.closures.find((item) => item.date === key && item.slotId === slot.id)
                      const closed = isSurveySlotClosed(schedule, key, slot.id)
                      const past = day.isBefore(dayjs(), 'day')
                      const background = !working || dayClosed || closed ? 'var(--admin-placeholder)' : undefined
                      return (
                        <td key={key} className='border-b p-1.5 align-top' style={{ background }}>
                          <div className='flex min-h-9 flex-col gap-1'>
                            {bookings.map(bookingChip)}
                            {working && !dayClosed && !past ? (
                              slotClosure ? (
                                <Button
                                  size='small'
                                  type='text'
                                  icon={<UnlockOutlined />}
                                  onClick={() => openLock({ date: key, slotId: slot.id, closureId: slotClosure.id })}
                                >
                                  {t('surveySchedule.locked')}
                                </Button>
                              ) : (
                                <Tooltip title={t('surveySchedule.lockSlot')}>
                                  <Button
                                    size='small'
                                    type='text'
                                    icon={<LockOutlined />}
                                    aria-label={t('surveySchedule.lockSlot')}
                                    onClick={() => openLock({ date: key, slotId: slot.id })}
                                  />
                                </Tooltip>
                              )
                            ) : closed && working ? (
                              <Text type='secondary' style={{ fontSize: 12 }}>
                                {t('surveySchedule.locked')}
                              </Text>
                            ) : null}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty description={t('surveySchedule.noSlots')} />
        )}
      </Card>

      <Modal
        open={locking !== null}
        title={
          locking
            ? t(locking.closureId ? 'surveySchedule.unlockTitle' : 'surveySchedule.lockTitle', {
                target: locking.slotId
                  ? `${dayjs(locking.date).format('DD/MM/YYYY')} · ${surveySlotRange(
                      schedule.slots.find((slot) => slot.id === locking.slotId) ?? { start: '', end: '' }
                    )}`
                  : dayjs(locking.date).format('DD/MM/YYYY')
              })
            : ''
        }
        okText={locking?.closureId ? t('surveySchedule.unlock') : t('surveySchedule.lock')}
        okButtonProps={{ disabled: lockBlocked.length > 0, loading: save.isPending }}
        cancelText={t('actions.cancel')}
        onOk={submitLock}
        onCancel={() => setLocking(null)}
      >
        {locking && !locking.closureId ? (
          lockBlocked.length ? (
            <Space orientation='vertical' size={6} style={{ width: '100%' }}>
              <Text type='danger'>{t('surveySchedule.lockBlocked', { count: lockBlocked.length })}</Text>
              {lockBlocked.map((item) => (
                <Text key={item.id} type='secondary' style={{ fontSize: 12 }}>
                  {item.id} · {item.contractorName} · {item.projectName}
                </Text>
              ))}
            </Space>
          ) : (
            <Form form={lockForm} layout='vertical'>
              <Text type='secondary' style={{ display: 'block', marginBottom: 12 }}>
                {t('surveySchedule.lockHint')}
              </Text>
              <Form.Item name='reason' label={t('surveySchedule.reason')}>
                <Input maxLength={200} />
              </Form.Item>
            </Form>
          )
        ) : locking ? (
          <Text>
            {t('surveySchedule.unlockHint', {
              reason: schedule.closures.find((item) => item.id === locking.closureId)?.reason ?? '-'
            })}
          </Text>
        ) : null}
      </Modal>
    </AdminPage>
  )
}
