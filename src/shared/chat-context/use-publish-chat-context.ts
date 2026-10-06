'use client'

import { useEffect } from 'react'

import { useChatContextStore } from './chat-context.store'
import type { ChatFlow, ProjectChatContext } from './chat-context.types'

/**
 * Công bố ngữ cảnh dự án cho chatbox AI trong lúc màn hình còn hiển thị, và dọn
 * sạch khi rời màn hình (mục III.3a).
 *
 * `waitingFlow` khác `null` nghĩa là đang chờ AI sinh — chatbox sẽ tự trò chuyện.
 */
export function usePublishChatContext(context: ProjectChatContext | null, waitingFlow: ChatFlow | null): void {
  const setContext = useChatContextStore((s) => s.setContext)
  const setWaitingFlow = useChatContextStore((s) => s.setWaitingFlow)

  // So sánh theo nội dung: caller dựng object mới mỗi lần render.
  const signature = context ? JSON.stringify(context) : null

  useEffect(() => {
    setContext(signature ? (JSON.parse(signature) as ProjectChatContext) : null)
  }, [signature, setContext])

  useEffect(() => {
    setWaitingFlow(waitingFlow)
  }, [waitingFlow, setWaitingFlow])

  useEffect(
    () => () => {
      setContext(null)
      setWaitingFlow(null)
    },
    [setContext, setWaitingFlow]
  )
}
