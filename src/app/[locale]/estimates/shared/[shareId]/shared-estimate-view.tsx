'use client'

import { useEffect, useState } from 'react'

import { SharedDossierView } from '@/features/design'
import { LoadingSpinner } from '@/shared/components/common'

/**
 * Token của link chia sẻ nằm ở fragment (`#token=…`) để không lọt vào log máy chủ hay referrer; chỉ trình duyệt đọc
 * được, nên phải lấy ở client rồi mới gọi API (gửi qua header `X-Estimate-Share-Token`).
 */
export function SharedEstimateView({ shareId }: { shareId: string }) {
  // `undefined` = chưa đọc fragment (SSR / lần render đầu); chuỗi rỗng = link không có token.
  const [token, setToken] = useState<string | undefined>(undefined)

  useEffect(() => {
    const value = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('token')
    // eslint-disable-next-line react-hooks/set-state-in-effect -- đọc fragment của trình duyệt, chỉ có ở client
    setToken(value ?? '')
  }, [])

  if (token === undefined) {
    return (
      <div className='flex justify-center py-24'>
        <LoadingSpinner />
      </div>
    )
  }

  return <SharedDossierView token='' share={{ shareId, token }} />
}
