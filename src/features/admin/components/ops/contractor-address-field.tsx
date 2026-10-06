'use client'

import { useQuery } from '@tanstack/react-query'
import { Alert, Button, Form, Input, InputNumber, Select, Space, Typography, type FormInstance } from 'antd'
import { useTranslations } from 'next-intl'
import { useEffect, useRef, useState } from 'react'
import { LocationMap } from '@/shared/components/common'
import { useDebouncedValue } from '@/shared/hooks'
import { locationApi } from '@/shared/locations'

const text = (v: unknown) => (typeof v === 'string' ? v.normalize('NFC').trim() : '')
export function contractorAddressKey(values: Record<string, unknown>): string {
  return JSON.stringify([
    text(values.provinceCode),
    text(values.wardCode),
    text(values.locationDatasetVersion),
    text(values.addressDetail)
  ])
}

export function ContractorAddressField({ form, visible }: { form: FormInstance; visible: boolean }) {
  const t = useTranslations('admin.contractorsAdmin.addressParts')
  const active = Form.useWatch('_structuredAddress', form) === true
  const province = Form.useWatch('provinceCode', form) as string | null | undefined
  const ward = Form.useWatch('wardCode', form) as string | null | undefined
  const detail = Form.useWatch('addressDetail', form) as string | undefined
  const dataset = Form.useWatch('locationDatasetVersion', form) as string | null | undefined
  const coordinateKey = Form.useWatch('_addressCoordinateKey', form) as string | undefined
  const latitude = Form.useWatch('latitude', form) as number | null | undefined
  const longitude = Form.useWatch('longitude', form) as number | null | undefined
  const key = contractorAddressKey({
    provinceCode: province,
    wardCode: ward,
    addressDetail: detail,
    locationDatasetVersion: dataset
  })
  const provinces = useQuery({
    queryKey: ['locations', 'provinces'],
    queryFn: ({ signal }) => locationApi.provinces(signal),
    retry: false
  })
  const wards = useQuery({
    queryKey: ['locations', 'wards', province, dataset],
    queryFn: ({ signal }) => locationApi.wards(province!, dataset!, signal),
    enabled: active && Boolean(province && dataset),
    retry: false
  })
  const controller = useRef<AbortController | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(
    () => () => {
      controller.current?.abort()
    },
    [key]
  )

  const storedProvince =
    form.getFieldValue('_originalProvinceCode') === province &&
    form.getFieldValue('_originalDatasetVersion') === dataset
  const storedWard = storedProvince && form.getFieldValue('_originalWardCode') === ward
  const provinceName =
    (storedProvince ? text(form.getFieldValue('_provinceName')) : '') ||
    provinces.data?.provinces.find((p) => p.code === province)?.name ||
    ''
  const wardName =
    (storedWard ? text(form.getFieldValue('_wardName')) : '') ||
    wards.data?.wards.find((w) => w.code === ward)?.name ||
    ''
  const provinceOptions = provinces.data?.provinces.map((p) => ({ value: p.code, label: p.name })) ?? []
  const wardOptions = wards.data?.wards.map((w) => ({ value: w.code, label: w.name })) ?? []
  if (province && provinceName && !provinceOptions.some((p) => p.value === province))
    provinceOptions.push({ value: province, label: provinceName })
  if (ward && wardName && !wardOptions.some((w) => w.value === ward)) wardOptions.push({ value: ward, label: wardName })
  const address = [text(detail), wardName, provinceName].filter(Boolean).join(', ')
  const complete = Boolean(province && ward && dataset && text(detail) && provinceName && wardName)
  const needsCoordinates = complete && coordinateKey !== key
  const validCoordinates =
    typeof latitude === 'number' &&
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    typeof longitude === 'number' &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180
  const searchText = useDebouncedValue(address, 400)
  const canSearch = active && complete && text(detail).length >= 2 && address.length <= 500
  // TDD-CTR-003 / ST-CTR-045: search results and coordinates belong to the current address only.
  const search = useQuery({
    queryKey: ['locations', 'address-search', key, searchText],
    queryFn: ({ signal }) => locationApi.search(searchText, signal),
    enabled: canSearch && needsCoordinates && searchText === address,
    staleTime: 5 * 60 * 1000,
    retry: false
  })
  const searching = canSearch && needsCoordinates && (searchText !== address || search.isFetching)
  const suggestions = canSearch && needsCoordinates && searchText === address ? (search.data ?? []) : []

  async function locate(refId: string) {
    const requestKey = key
    controller.current?.abort()
    const next = new AbortController()
    controller.current = next
    setBusy(true)
    setError('')
    try {
      const result = await locationApi.place(refId, next.signal)
      if (next.signal.aborted || contractorAddressKey(form.getFieldsValue(true)) !== requestKey) return
      confirmCoordinates(result.latitude, result.longitude)
    } catch {
      if (!next.signal.aborted) setError(t('mapError'))
    } finally {
      // The finally of an older request must not clear the loading flag of its replacement.
      if (controller.current === next) setBusy(false)
    }
  }
  function invalidate() {
    form.setFieldsValue({ latitude: null, longitude: null, _addressCoordinateKey: '' })
    controller.current?.abort()
    setBusy(false)
    setError('')
  }
  function confirmCoordinates(lat: number, lng: number) {
    controller.current?.abort()
    setBusy(false)
    setError('')
    form.setFieldsValue({ latitude: lat, longitude: lng, _addressCoordinateKey: key })
    void form.validateFields(['addressDetail']).catch(() => {})
  }
  function activate() {
    const stored = form.getFieldValue('locationDatasetVersion')
    form.setFieldsValue({
      _structuredAddress: true,
      locationDatasetVersion: stored ?? provinces.data?.datasetVersion ?? null
    })
  }
  return (
    <Space orientation='vertical' style={{ width: '100%' }}>
      {!active ? (
        <>
          <Alert type='info' title={t('legacy')} description={text(form.getFieldValue('address')) || t('noAddress')} />
          <Button onClick={activate} disabled={provinces.isPending || provinces.isError}>
            {t('add')}
          </Button>
        </>
      ) : (
        <>
          <div className='grid gap-x-3 sm:grid-cols-2'>
            <Form.Item name='provinceCode' label={t('province')}>
              <Select
                allowClear
                showSearch
                optionFilterProp='label'
                loading={provinces.isPending}
                disabled={provinces.isError}
                options={provinceOptions}
                onChange={() => {
                  invalidate()
                  form.setFieldsValue({
                    wardCode: null,
                    locationDatasetVersion: provinces.data?.datasetVersion ?? null
                  })
                }}
              />
            </Form.Item>
            <Form.Item name='wardCode' label={t('ward')}>
              <Select
                allowClear
                showSearch
                optionFilterProp='label'
                loading={wards.isPending}
                disabled={!province || wards.isPending || wards.isError}
                options={wardOptions}
                onChange={invalidate}
              />
            </Form.Item>
          </div>
          <Form.Item
            name='addressDetail'
            label={t('street')}
            dependencies={['provinceCode', 'wardCode', '_addressCoordinateKey', 'latitude', 'longitude']}
            rules={[
              {
                validator: async () => {
                  const v = form.getFieldsValue(true)
                  if (!v._structuredAddress) return
                  const entered = [v.provinceCode, v.wardCode, v.addressDetail].some((x) => Boolean(text(x)))
                  if (!entered) {
                    if (visible) throw new Error(t('required'))
                    return
                  }
                  if (
                    ![v.provinceCode, v.wardCode, v.locationDatasetVersion, v.addressDetail].every((x) =>
                      Boolean(text(x))
                    )
                  )
                    throw new Error(t('required'))
                  if (text(v.addressDetail).length > 500) throw new Error(t('tooLong'))
                  if (
                    v._addressCoordinateKey !== contractorAddressKey(v) ||
                    typeof v.latitude !== 'number' ||
                    !Number.isFinite(v.latitude) ||
                    Math.abs(v.latitude) > 90 ||
                    typeof v.longitude !== 'number' ||
                    !Number.isFinite(v.longitude) ||
                    Math.abs(v.longitude) > 180
                  )
                    throw new Error(t('coordinatesRequired'))
                }
              }
            ]}
          >
            <Input
              autoComplete='off'
              aria-controls='contractor-location-suggestions'
              placeholder={t('streetPlaceholder')}
              onChange={invalidate}
            />
          </Form.Item>
          {searching || busy ? <Typography.Text role='status'>{t('searching')}</Typography.Text> : null}
          {suggestions.length > 0 && !busy ? (
            <ul
              id='contractor-location-suggestions'
              className='max-h-64 overflow-y-auto rounded-lg border'
              aria-label={t('selectLocation')}
            >
              {suggestions.map((suggestion) => (
                <li key={suggestion.refId}>
                  <Button
                    type='text'
                    block
                    style={{ height: 'auto', whiteSpace: 'normal', textAlign: 'left', justifyContent: 'flex-start' }}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => void locate(suggestion.refId)}
                  >
                    <span className='min-w-0 py-1'>
                      <span className='block font-medium'>{suggestion.name || suggestion.display}</span>
                      <span className='text-muted-foreground block text-xs'>{suggestion.address}</span>
                    </span>
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
          <Typography.Text>
            {t('fullAddress')}: {address || t('noAddress')}
          </Typography.Text>
          {validCoordinates ? (
            <div className='space-y-2'>
              <LocationMap
                latitude={latitude}
                longitude={longitude}
                onChange={complete ? confirmCoordinates : undefined}
              />
              <Typography.Text type='secondary'>{t('mapAdjust')}</Typography.Text>
            </div>
          ) : (
            <Typography.Text type='secondary'>{t('mapHint')}</Typography.Text>
          )}
          {canSearch && needsCoordinates && searchText === address && search.isError ? (
            <Alert
              type='error'
              title={t('mapError')}
              action={<Button onClick={() => void search.refetch()}>{t('retry')}</Button>}
            />
          ) : null}
          {canSearch &&
          needsCoordinates &&
          searchText === address &&
          search.isSuccess &&
          !searching &&
          !suggestions.length ? (
            <Typography.Text type='secondary'>{t('noResult')}</Typography.Text>
          ) : null}
          {complete && address.length > 500 ? (
            <Typography.Text type='warning'>{t('searchTooLong')}</Typography.Text>
          ) : null}
          {error ? <Alert type='error' title={error} /> : null}
          {!visible ? (
            <Button
              onClick={() => {
                invalidate()
                form.setFieldsValue({
                  provinceCode: null,
                  wardCode: null,
                  locationDatasetVersion: null,
                  addressDetail: null,
                  address: null
                })
              }}
            >
              {t('clear')}
            </Button>
          ) : null}
        </>
      )}
      {provinces.isError || wards.isError ? (
        <Alert
          type='error'
          title={t('catalogError')}
          action={
            <Button
              onClick={() => {
                void provinces.refetch()
                if (province && dataset) void wards.refetch()
              }}
            >
              {t('reload')}
            </Button>
          }
        />
      ) : null}
      {wards.isError ? (
        <Button
          onClick={() => {
            invalidate()
            form.setFieldsValue({ locationDatasetVersion: provinces.data?.datasetVersion ?? null, wardCode: null })
          }}
        >
          {t('selectAgain')}
        </Button>
      ) : null}
      <Form.Item name='locationDatasetVersion' hidden>
        <Input />
      </Form.Item>
      <Form.Item name='address' hidden>
        <Input />
      </Form.Item>
      <Form.Item name='latitude' hidden>
        <InputNumber />
      </Form.Item>
      <Form.Item name='longitude' hidden>
        <InputNumber />
      </Form.Item>
      {!active ? (
        <Form.Item name='provinceCode' hidden>
          <Input />
        </Form.Item>
      ) : null}
      <Form.Item name='_structuredAddress' hidden>
        <Input />
      </Form.Item>
      <Form.Item name='_addressCoordinateKey' hidden>
        <Input />
      </Form.Item>
    </Space>
  )
}
