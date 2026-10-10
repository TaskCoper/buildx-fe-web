'use client'

import { DeleteOutlined, PictureOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Form, Input } from 'antd'
import { useTranslations } from 'next-intl'
import { useCallback, useRef } from 'react'
import { CONSULT_LIMITS } from '../../api/bmt/consult.api'
import { ImagePicker } from '../common/image-upload-button'

export function ArchitectDesignProjectsField() {
  const ta = useTranslations('admin.architects')
  const t = useTranslations('admin')
  const uploading = useRef(new Set<string>())
  const setUploading = useCallback((key: string, busy: boolean) => {
    if (busy) uploading.current.add(key)
    else uploading.current.delete(key)
  }, [])
  return (
    <Form.List
      name='designProjects'
      rules={[
        {
          validator: async () => {
            if (uploading.current.size) throw new Error(ta('designImagesUploading'))
          }
        }
      ]}
    >
      {(projects, { add, remove }, { errors }) => (
        <div className='space-y-5'>
          {projects.length === 0 && (
            <div className='flex flex-col items-center rounded-xl border border-dashed border-border bg-muted/20 px-5 py-8 text-center'>
              <span
                className='bg-primary/10 text-primary mb-3 flex size-12 items-center justify-center rounded-xl text-xl'
                aria-hidden='true'
              >
                <PictureOutlined />
              </span>
              <p className='text-sm font-medium'>{ta('noDesignProjects')}</p>
              <p className='text-muted-foreground mt-1 max-w-sm text-sm leading-relaxed'>
                {ta('noDesignProjectsHint')}
              </p>
            </div>
          )}
          {projects.map((project, index) => (
            <div key={project.key} className='overflow-hidden rounded-xl border border-border'>
              <div className='flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/30 px-4 py-3'>
                <h3 className='flex items-center gap-2 text-sm font-semibold'>
                  <PictureOutlined className='text-primary' />
                  {ta('designProjectIndex', { index: index + 1 })}
                </h3>
                <Button danger type='text' icon={<DeleteOutlined />} onClick={() => remove(project.name)}>
                  {ta('removeDesignProject')}
                </Button>
              </div>
              <div className='p-4 sm:p-5'>
                <Form.Item
                  name={[project.name, 'name']}
                  label={ta('designProjectName')}
                  rules={[
                    { required: true, whitespace: true, message: t('fields.requiredMessage') },
                    {
                      max: CONSULT_LIMITS.designProjectName,
                      message: t('fields.maxLength', { max: CONSULT_LIMITS.designProjectName })
                    }
                  ]}
                >
                  <Input maxLength={CONSULT_LIMITS.designProjectName} placeholder={ta('placeholders.projectName')} />
                </Form.Item>
                <Form.List
                  name={[project.name, 'imageUrls']}
                  rules={[
                    {
                      validator: async (_, images: unknown) => {
                        if (!Array.isArray(images) || images.length === 0) throw new Error(ta('designImagesRequired'))
                      }
                    }
                  ]}
                >
                  {(images, { add: addImage, remove: removeImage }, { errors }) => (
                    <div className='space-y-3'>
                      <div className='architect-project-images grid gap-4'>
                        {images.map((image, imageIndex) => (
                          <div key={image.key}>
                            <Form.Item
                              name={image.name}
                              label={ta('designImageIndex', { index: imageIndex + 1 })}
                              rules={[{ required: true, message: ta('designImagesRequired') }]}
                            >
                              <DesignImagePicker
                                uploadKey={`${project.key}:${image.key}`}
                                onUploadingChange={setUploading}
                                onRemove={() => removeImage(image.name)}
                                removeLabel={ta('removeDesignImage')}
                              />
                            </Form.Item>
                          </div>
                        ))}
                      </div>
                      <Form.ErrorList errors={errors} />
                      <Button icon={<PlusOutlined />} onClick={() => addImage('')}>
                        {ta('addDesignImage')}
                      </Button>
                    </div>
                  )}
                </Form.List>
              </div>
            </div>
          ))}
          <Form.ErrorList errors={errors} />
          <Button
            type='dashed'
            block
            size='large'
            icon={<PlusOutlined />}
            onClick={() => add({ name: '', imageUrls: [''] })}
          >
            {ta('addDesignProject')}
          </Button>
        </div>
      )}
    </Form.List>
  )
}

function DesignImagePicker({
  uploadKey,
  onUploadingChange,
  onRemove,
  removeLabel,
  value,
  onChange
}: {
  uploadKey: string
  onUploadingChange: (key: string, busy: boolean) => void
  onRemove: () => void
  removeLabel: string
  value?: string
  onChange?: (url: string | undefined) => void
}) {
  const onUploading = useCallback((busy: boolean) => onUploadingChange(uploadKey, busy), [uploadKey, onUploadingChange])
  return (
    <ImagePicker
      variant='card'
      value={value}
      onChange={onChange}
      onUploadingChange={onUploading}
      onRemove={onRemove}
      removeLabel={removeLabel}
    />
  )
}
