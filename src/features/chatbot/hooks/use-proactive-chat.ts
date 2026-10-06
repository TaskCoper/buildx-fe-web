'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'

import { useChatContextStore } from '@/shared/chat-context'
import { proactiveScript, scriptKey } from '../services/proactive.service'
import { useChatbotStore } from '../store/chatbot.store'

/**
 * Trong lúc chờ AI sinh, chatbox tự trò chuyện theo dữ liệu thật của dự án —
 * khu vực, loại công trình, quy mô, ảnh đã tải (mục III.3a).
 *
 * Gắn ĐÚNG MỘT lần trong cây component (ở `ChatDock`), vì nó ghi vào hội thoại
 * dùng chung; gắn hai nơi sẽ nói lặp.
 */
export function useProactiveChat(): void {
  const t = useTranslations('chatbot.proactive')
  const context = useChatContextStore((s) => s.context)
  const waitingFlow = useChatContextStore((s) => s.waitingFlow)
  const append = useChatbotStore((s) => s.append)
  const markScriptPlayed = useChatbotStore((s) => s.markScriptPlayed)

  useEffect(() => {
    // M08 messages are emitted by its active render task, not this timer script.
    if (!context || !waitingFlow || waitingFlow === 'dossier') return

    const key = scriptKey(context, waitingFlow)
    if (useChatbotStore.getState().playedScript === key) return
    markScriptPlayed(key)

    const timers = proactiveScript(context, waitingFlow).map((line) =>
      setTimeout(() => {
        append({ role: 'assistant', content: t(line.key, line.values), proactive: true })
      }, line.delayMs)
    )

    return () => timers.forEach(clearTimeout)
  }, [context, waitingFlow, append, markScriptPlayed, t])
}
