'use client'

import { BarChartOutlined, FileTextOutlined, PictureOutlined, UserOutlined } from '@ant-design/icons'
import { Col, Form, Input, InputNumber, Row, Select, Tabs } from 'antd'
import { useTranslations } from 'next-intl'
import type { ReactNode } from 'react'
import { CONSULT_LIMITS } from '../../api/bmt/consult.api'
import { ImagePicker } from '../common/image-upload-button'
import { ArchitectDesignProjectsField } from './architect-design-projects-field'

export type ArchitectProfileTab = 'profile' | 'projects'

export function ArchitectProfileForm({
  categories,
  activeTab,
  onTabChange
}: {
  categories: { id: string; name: string }[]
  activeTab: ArchitectProfileTab
  onTabChange: (tab: ArchitectProfileTab) => void
}) {
  const t = useTranslations('admin')
  const ta = useTranslations('admin.architects')
  const required = { required: true, whitespace: true, message: t('fields.requiredMessage') }
  const maxLength = (max: number) => ({ max, message: t('fields.maxLength', { max }) })

  return (
    <div className='architect-editor'>
      <Form.Item name='expectedVersion' hidden>
        <Input />
      </Form.Item>
      <Tabs
        activeKey={activeTab}
        onChange={(key) => onTabChange(key === 'projects' ? 'projects' : 'profile')}
        destroyOnHidden={false}
        items={[
          {
            key: 'profile',
            label: ta('tabs.profile'),
            icon: <UserOutlined />,
            forceRender: true,
            children: (
              <div className='space-y-8'>
                <ProfileSection
                  icon={<UserOutlined />}
                  title={ta('sections.identity')}
                  description={ta('sections.identityHint')}
                >
                  <div className='grid gap-6 md:grid-cols-[200px_minmax(0,1fr)]'>
                    <div className='architect-avatar min-w-0'>
                      <Form.Item
                        name='avatarUrl'
                        label={ta('avatar')}
                        rules={[{ required: true, message: t('fields.requiredMessage') }]}
                      >
                        <ImagePicker variant='card' />
                      </Form.Item>
                      <p className='text-muted-foreground text-xs leading-relaxed'>{ta('avatarHint')}</p>
                    </div>
                    <div className='min-w-0'>
                      <Row gutter={16}>
                        <Col xs={24} sm={12}>
                          <Form.Item
                            name='fullName'
                            label={ta('name')}
                            rules={[required, maxLength(CONSULT_LIMITS.fullName)]}
                          >
                            <Input maxLength={CONSULT_LIMITS.fullName} placeholder={ta('placeholders.name')} />
                          </Form.Item>
                        </Col>
                        <Col xs={24} sm={12}>
                          <Form.Item
                            name='title'
                            label={ta('title')}
                            rules={[required, maxLength(CONSULT_LIMITS.title)]}
                          >
                            <Input maxLength={CONSULT_LIMITS.title} placeholder={ta('placeholders.title')} />
                          </Form.Item>
                        </Col>
                      </Row>
                      <Form.Item name='companyName' label={ta('companyName')}>
                        <Input maxLength={CONSULT_LIMITS.companyName} placeholder={ta('placeholders.company')} />
                      </Form.Item>
                      <Form.Item
                        name='categoryIds'
                        label={ta('categories')}
                        extra={categories.length ? ta('categoriesHint') : ta('noCategories')}
                        rules={[{ required: true, type: 'array', min: 1, message: ta('categoryRequired') }]}
                      >
                        <Select
                          mode='multiple'
                          placeholder={ta('placeholders.categories')}
                          optionFilterProp='label'
                          options={categories.map((category) => ({ value: category.id, label: category.name }))}
                        />
                      </Form.Item>
                    </div>
                  </div>
                </ProfileSection>

                <ProfileSection
                  icon={<FileTextOutlined />}
                  title={ta('sections.about')}
                  description={ta('sections.aboutHint')}
                >
                  <Form.Item
                    name='shortDescription'
                    label={ta('shortDescription')}
                    extra={ta('shortDescriptionHint')}
                    rules={[maxLength(CONSULT_LIMITS.shortDescription)]}
                  >
                    <Input.TextArea
                      rows={3}
                      maxLength={CONSULT_LIMITS.shortDescription}
                      showCount
                      placeholder={ta('placeholders.shortDescription')}
                    />
                  </Form.Item>
                  <Form.Item
                    name='introduction'
                    label={ta('intro')}
                    rules={[required, maxLength(CONSULT_LIMITS.introduction)]}
                  >
                    <Input.TextArea
                      rows={5}
                      maxLength={CONSULT_LIMITS.introduction}
                      showCount
                      placeholder={ta('placeholders.introduction')}
                    />
                  </Form.Item>
                </ProfileSection>

                <ProfileSection
                  icon={<BarChartOutlined />}
                  title={ta('sections.experience')}
                  description={ta('sections.experienceHint')}
                >
                  <Row gutter={16}>
                    <Col xs={12} sm={12} lg={6}>
                      <Form.Item
                        name='yearsExperience'
                        label={ta('experience')}
                        rules={[{ required: true, type: 'integer', min: 0, message: ta('nonNegative') }]}
                      >
                        <InputNumber min={0} precision={0} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col xs={12} sm={12} lg={6}>
                      <Form.Item
                        name='projectCount'
                        label={ta('projectCount')}
                        rules={[{ required: true, type: 'integer', min: 0, message: ta('nonNegative') }]}
                      >
                        <InputNumber min={0} precision={0} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col xs={12} sm={12} lg={6}>
                      <Form.Item name='rating' label={ta('rating')}>
                        <InputNumber min={0} max={5} step={0.1} precision={1} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col xs={12} sm={12} lg={6}>
                      <Form.Item name='reviewCount' label={ta('reviewCount')}>
                        <InputNumber min={0} precision={0} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                  </Row>
                  <div className='flex flex-col gap-4 rounded-xl border border-border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between'>
                    <div className='min-w-0'>
                      <p className='text-sm font-medium'>{ta('sections.visibility')}</p>
                      <p className='text-muted-foreground mt-1 text-xs leading-relaxed'>
                        {ta('sections.visibilityHint')}
                      </p>
                    </div>
                    <Form.Item
                      className='architect-visibility-field'
                      name='isVisible'
                      label={ta('status')}
                      rules={[{ required: true, message: ta('statusRequired') }]}
                    >
                      <Select
                        placeholder={ta('pickStatus')}
                        options={[
                          { value: true, label: ta('shown') },
                          { value: false, label: ta('hidden') }
                        ]}
                      />
                    </Form.Item>
                  </div>
                </ProfileSection>
              </div>
            )
          },
          {
            key: 'projects',
            label: ta('tabs.projects'),
            icon: <PictureOutlined />,
            forceRender: true,
            children: (
              <ProfileSection
                icon={<PictureOutlined />}
                title={ta('designProjects')}
                description={ta('designProjectsHint')}
                optional={ta('optional')}
              >
                <ArchitectDesignProjectsField />
              </ProfileSection>
            )
          }
        ]}
      />
    </div>
  )
}

function ProfileSection({
  icon,
  title,
  description,
  optional,
  children
}: {
  icon: ReactNode
  title: string
  description: string
  optional?: string
  children: ReactNode
}) {
  return (
    <section className='min-w-0 border-b border-border pb-8 last:border-0 last:pb-0' aria-label={title}>
      <div className='mb-5 flex items-start gap-3'>
        <span
          className='bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg text-base'
          aria-hidden='true'
        >
          {icon}
        </span>
        <div className='min-w-0'>
          <div className='flex flex-wrap items-center gap-2'>
            <h2 className='text-base font-semibold'>{title}</h2>
            {optional && (
              <span className='bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-xs'>{optional}</span>
            )}
          </div>
          <p className='text-muted-foreground mt-1 text-sm leading-relaxed'>{description}</p>
        </div>
      </div>
      {children}
    </section>
  )
}
