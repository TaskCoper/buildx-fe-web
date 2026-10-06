'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'

import { useFloorCountLabel, type DesignInput } from '@/features/design'
import { usePublishChatContext, type ChatFlow, type ProjectChatContext } from '@/shared/chat-context'

/**
 * Công bố ngữ cảnh dự án cho chatbox AI (mục III.3a).
 *
 * Đây là chỗ nối hai feature không được import lẫn nhau: `features/design` giữ
 * dữ liệu Bước 1, `features/chatbot` cần nhãn đã bản địa hóa. Lớp app dịch nhãn
 * rồi đẩy vào `shared/chat-context`.
 *
 * `waitingFlow` khác `null` khi đang chờ AI sinh — lúc đó chatbot tự trò chuyện.
 */
export function useProjectChatContext(
  projectName: string,
  input: DesignInput | undefined,
  waitingFlow: ChatFlow | null
): void {
  const t = useTranslations('design.input')
  const floorLabel = useFloorCountLabel()

  const context = useMemo<ProjectChatContext | null>(() => {
    if (!input) return null

    const { wardName, provinceName } = input.addressDetail
    return {
      projectName,
      // Chỉ phường/xã + tỉnh/thành: chatbot nói về khu vực, không đọc số nhà.
      area: [wardName, provinceName].filter(Boolean).join(', '),
      buildingLabel: input.buildingType ? t(`buildingType.options.${input.buildingType}`) : '',
      scaleLabel: input.floorCount
        ? `${floorLabel(input.floorCount)}${input.hasAttic ? ` · ${t('attic.options.yes')}` : ''}`
        : '',
      packageLabel: t(`packageTier.options.${input.packageTier}`),
      interiorStyleLabel: input.style ? t(`style.options.${input.style}`) : '',
      hasLandPhoto: Boolean(input.landPhotoUrl)
    }
  }, [projectName, input, t, floorLabel])

  usePublishChatContext(context, waitingFlow)
}
