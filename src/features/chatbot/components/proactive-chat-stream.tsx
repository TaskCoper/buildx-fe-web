'use client'

import { Bot } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { memo, useEffect, useRef } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'

import { useChatContextStore } from '@/shared/chat-context'
import { Button } from '@/shared/components/ui/button'
import { useChatbotStore } from '../store/chatbot.store'

/**
 * Dòng "AI tự trò chuyện" trên màn chờ Bước 2 / Bước 3 (mục III.3a).
 *
 * Hiển thị vài câu gần nhất của cùng cuộc trò chuyện đang có trong khung chat
 * nổi — người dùng thấy AI nói ngay tại chỗ đang nhìn, mở khung nổi để trả lời.
 */
export const ProactiveChatStream = memo(function ProactiveChatStream({
  dossierStage,
  sessionKey
}: {
  dossierStage?: 'drawings' | 'renders' | 'package' | 'error'
  sessionKey?: string
} = {}) {
  const t = useTranslations('chatbot')
  const messages = useChatbotStore((s) => s.messages)
  const scriptStartIndex = useChatbotStore((s) => s.scriptStartIndex)
  const setPanelOpen = useChatContextStore((s) => s.setPanelOpen)
  const append = useChatbotStore((s) => s.append)
  const markScriptPlayed = useChatbotStore((s) => s.markScriptPlayed)
  const spoken = useRef<string | null>(null)
  const reduced = useReducedMotion()
  const stageText = dossierStage ? t(`renderStages.${dossierStage}`) : null

  useEffect(() => {
    if (!dossierStage || !stageText) return
    const key = `render:${sessionKey}`
    if (useChatbotStore.getState().playedScript !== key) markScriptPlayed(key)
    if (spoken.current === stageText) return
    const timer = window.setTimeout(
      () => {
        spoken.current = stageText
        append({ role: 'assistant', content: stageText, proactive: true })
      },
      dossierStage === 'error' ? 0 : 350
    )
    return () => window.clearTimeout(timer)
  }, [append, dossierStage, markScriptPlayed, sessionKey, stageText])

  // Chỉ lấy câu AI nói TRONG lượt chờ này — câu của bước trước không còn đúng
  // ngữ cảnh. 3 câu gần nhất là vừa đủ cho khu vực dưới vòng tiến độ.
  const recent = messages
    .slice(scriptStartIndex)
    .filter((message) => message.role === 'assistant')
    .slice(-3)
  return (
    <div className='mt-8 w-full max-w-md space-y-2 text-left'>
      <p className='text-muted-foreground flex items-center gap-2 text-xs'>
        <Bot className='size-3.5' />
        {t('waitingHint')}
      </p>

      {recent.length === 0 ? (
        <p
          data-chat-thinking
          className='bg-card/70 flex w-fit items-center gap-1 rounded-2xl rounded-bl-sm border px-4 py-3'
        >
          {[0, 1, 2].map((index) => (
            <span
              key={index}
              style={{ '--dot-delay': `${index * 160}ms` } as React.CSSProperties}
              className='bg-muted-foreground/55 size-1.5 rounded-full'
            />
          ))}
        </p>
      ) : dossierStage ? (
        <AnimatePresence initial={false} mode='wait'>
          {recent.slice(-1).map((message) => (
            <motion.p
              key={message.id}
              initial={{ opacity: 0, y: reduced ? 0 : 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduced ? 0 : -8 }}
              transition={{ duration: reduced ? 0 : 0.2 }}
              className='bg-card/70 rounded-2xl rounded-bl-sm border px-4 py-3 text-sm leading-relaxed'
            >
              {message.content.split(/(?<=[.!?…])\s+/).map((chunk, index) => (
                <motion.span
                  key={index}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: reduced ? 0 : 0.2, delay: reduced ? 0 : index * 0.18 }}
                >
                  {chunk}{' '}
                </motion.span>
              ))}
            </motion.p>
          ))}
        </AnimatePresence>
      ) : (
        recent.map((message, index) => (
          <p
            key={message.id}
            data-chat-message
            className='bg-card/70 animate-in fade-in slide-in-from-bottom-1 rounded-2xl rounded-bl-sm border px-4 py-3 text-sm leading-relaxed duration-500'
            // Câu cũ mờ dần để mắt bám vào câu mới nhất.
            style={{ opacity: 1 - (recent.length - 1 - index) * 0.25 }}
          >
            {message.content}
          </p>
        ))
      )}

      <Button variant='link' size='sm' className='h-auto px-0 text-xs' onClick={() => setPanelOpen(true)}>
        {t('openPanel')}
      </Button>
    </div>
  )
})
