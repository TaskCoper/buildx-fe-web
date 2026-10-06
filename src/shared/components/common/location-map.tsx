'use client'

import '@vietmap/vietmap-gl-js/dist/vietmap-gl.css'

import type * as VietmapNamespace from '@vietmap/vietmap-gl-js/dist/vietmap-gl'
import { useEffect, useRef } from 'react'

import { env } from '@/shared/config/env'
import { cn } from '@/shared/lib/utils'

type VietmapGl = typeof VietmapNamespace
type MapInstance = InstanceType<VietmapGl['Map']>
type MarkerInstance = InstanceType<VietmapGl['Marker']>

interface LocationMapProps {
  latitude: number | null
  longitude: number | null
  /** Có thì ghim kéo được và bấm lên bản đồ để đặt lại ghim; không có thì chỉ xem. */
  onChange?: (latitude: number, longitude: number) => void
  className?: string
}

/**
 * Lấy SDK sau khi `import()`. Bản dựng của VietMap là UMD đặt trong package `"type": "module"`: tuỳ bundler (webpack dev
 * khác Turbopack production) mà các lớp nằm ở `default`, ngay trên module, hoặc chỉ gắn vào `window.vietmapgl` và module
 * trống. Thử cả ba nơi thay vì đoán, vì chỉ có một nơi đúng trong mỗi môi trường.
 */
function resolveSdk(module: unknown): VietmapGl | null {
  const hasMap = (value: unknown): value is VietmapGl =>
    Boolean(value) && typeof (value as { Map?: unknown }).Map === 'function'
  const fromModule = module as { default?: unknown }
  if (hasMap(fromModule.default)) return fromModule.default
  if (hasMap(module)) return module
  const fromWindow = (window as unknown as { vietmapgl?: unknown }).vietmapgl
  return hasMap(fromWindow) ? fromWindow : null
}

/** Tâm mặc định khi chưa có toạ độ: nhìn toàn Việt Nam, không ghim. */
const VIETNAM_CENTER: [number, number] = [106.0, 16.0]
const FOCUSED_ZOOM = 16

/**
 * Bản đồ tương tác (VietMap GL JS + TileMap) có ghim vị trí.
 *
 * Khoá dùng là `NEXT_PUBLIC_VIETMAP_API_KEY` — khoá TileMap riêng cho trình duyệt (chỉ bật bản đồ, giới hạn theo tên
 * miền); khoá tìm/tra địa chỉ nằm ở backend. Chưa cấu hình khoá thì không vẽ gì, form vẫn dùng được bằng ô địa chỉ.
 * SDK dùng thứ tự `[kinh độ, vĩ độ]`, ngược với các props ở đây (vĩ độ trước) nên đổi ở một chỗ duy nhất.
 *
 * SDK cần WebGL và `window` nên chỉ nạp ở client, sau khi component đã mount.
 */
export function LocationMap({ latitude, longitude, onChange, className }: LocationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapInstance | null>(null)
  const markerRef = useRef<MarkerInstance | null>(null)
  const sdkRef = useRef<VietmapGl | null>(null)
  // Luôn đọc props mới nhất trong handler của SDK mà không phải dựng lại bản đồ.
  const onChangeRef = useRef(onChange)
  const coordsRef = useRef({ latitude, longitude })
  const apiKey = env.NEXT_PUBLIC_VIETMAP_API_KEY

  useEffect(() => {
    onChangeRef.current = onChange
    markerRef.current?.setDraggable(Boolean(onChange))
    coordsRef.current = { latitude, longitude }
  })

  // Dựng bản đồ một lần.
  useEffect(() => {
    if (!apiKey || !containerRef.current) return
    let cancelled = false

    void import('@vietmap/vietmap-gl-js/dist/vietmap-gl').then((module) => {
      if (cancelled || !containerRef.current) return
      const vietmapgl = resolveSdk(module)
      if (!vietmapgl) {
        console.error('VietMap GL JS không nạp được: không tìm thấy lớp Map')
        return
      }
      sdkRef.current = vietmapgl
      const { latitude: lat, longitude: lng } = coordsRef.current
      const hasPin = lat !== null && lng !== null

      const map = new vietmapgl.Map({
        container: containerRef.current,
        style: `https://maps.vietmap.vn/maps/styles/tm/style.json?apikey=${apiKey}`,
        center: hasPin ? [lng, lat] : VIETNAM_CENTER,
        zoom: hasPin ? FOCUSED_ZOOM : 4.5
      })
      map.addControl(new vietmapgl.NavigationControl({ showCompass: false }), 'top-right')
      mapRef.current = map

      map.on('click', (event) => {
        if (!onChangeRef.current) return
        onChangeRef.current(event.lngLat.lat, event.lngLat.lng)
      })

      if (hasPin) placeMarker(lat, lng)
    })

    return () => {
      cancelled = true
      markerRef.current?.remove()
      markerRef.current = null
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [apiKey])

  /** Đặt (hoặc dời) ghim; ghim kéo được khi có `onChange`. */
  function placeMarker(lat: number, lng: number) {
    const sdk = sdkRef.current
    const map = mapRef.current
    if (!sdk || !map) return
    if (!markerRef.current) {
      const marker = new sdk.Marker({ draggable: Boolean(onChangeRef.current) }).setLngLat([lng, lat]).addTo(map)
      marker.on('dragend', () => {
        const position = marker.getLngLat()
        onChangeRef.current?.(position.lat, position.lng)
      })
      markerRef.current = marker
    } else {
      markerRef.current.setLngLat([lng, lat])
    }
  }

  // Toạ độ đổi từ bên ngoài (chọn gợi ý, kéo ghim, bấm bản đồ): dời ghim và đưa bản đồ tới đó.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (latitude === null || longitude === null) {
      markerRef.current?.remove()
      markerRef.current = null
      return
    }
    placeMarker(latitude, longitude)
    const center = map.getCenter()
    const moved = Math.abs(center.lat - latitude) > 1e-6 || Math.abs(center.lng - longitude) > 1e-6
    if (moved) map.flyTo({ center: [longitude, latitude], zoom: Math.max(map.getZoom(), FOCUSED_ZOOM) })
  }, [latitude, longitude])

  if (!apiKey) return null

  return <div ref={containerRef} className={cn('bg-muted h-72 w-full overflow-hidden rounded-xl border', className)} />
}
