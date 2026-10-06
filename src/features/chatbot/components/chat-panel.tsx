'use client'

import { useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { AnimatePresence, motion } from 'motion/react'
import { Bot, SendHorizonal, User } from 'lucide-react'

import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Card } from '@/shared/components/ui/card'
import { useChat } from '../hooks/use-chat'
import { SUGGESTIONS } from '../api/chatbot.mock'
import { useChatbotStore } from '../store/chatbot.store'

export function ChatPanel() {
  const t = useTranslations('chatbot')
  const { messages, send, isReplying, dailyLimit, limitReached } = useChat()
  const input = useChatbotStore((state) => state.draft)
  const setInput = useChatbotStore((state) => state.setDraft)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth'
    })
  }, [messages, isReplying])

  function handleSend() {
    send(input)
    setInput('')
  }

  // Gợi ý chỉ hiện khi người dùng chưa nói gì (câu AI tự nói không tính).
  const showSuggestions = !messages.some((m) => m.role === 'user') && !isReplying && !limitReached

  return (
    // `h-full`: khung chat lấp đầy đúng chiều cao mà drawer dành cho nó — cao
    // cố định sẽ chừa một mảng trắng ở đáy.
    <Card className='flex h-full min-h-0 flex-col overflow-hidden p-0'>
      {/* Messages */}
      <div ref={scrollRef} className='flex-1 space-y-4 overflow-y-auto p-4'>
        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className={cn('flex items-start gap-3', m.role === 'user' && 'flex-row-reverse')}
            >
              <div
                className={cn(
                  'flex size-8 shrink-0 items-center justify-center rounded-full',
                  m.role === 'assistant' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                )}
              >
                {m.role === 'assistant' ? <Bot className='size-4' /> : <User className='size-4' />}
              </div>
              <div
                className={cn(
                  'max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap',
                  m.role === 'assistant' ? 'bg-muted' : 'bg-primary text-primary-foreground'
                )}
              >
                {m.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isReplying ? (
          <div className='flex items-start gap-3'>
            <div className='bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-full'>
              <Bot className='size-4' />
            </div>
            <div className='bg-muted flex items-center gap-1 rounded-lg px-3 py-3'>
              <span className='bg-muted-foreground/50 size-2 animate-bounce rounded-full [animation-delay:-0.3s]' />
              <span className='bg-muted-foreground/50 size-2 animate-bounce rounded-full [animation-delay:-0.15s]' />
              <span className='bg-muted-foreground/50 size-2 animate-bounce rounded-full' />
            </div>
          </div>
        ) : null}
      </div>

      {/* Suggestions */}
      {showSuggestions ? (
        <div className='flex flex-wrap gap-2 px-4 pb-2'>
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type='button'
              onClick={() => send(s)}
              className='border-border hover:bg-accent rounded-full border px-3 py-1.5 text-xs transition-colors'
            >
              {s}
            </button>
          ))}
        </div>
      ) : null}

      {/* Limit-reached notice */}
      {limitReached ? (
        <div className='border-t px-4 py-3'>
          <p className='text-destructive text-sm font-medium'>{t('limitReached', { limit: dailyLimit })}</p>
        </div>
      ) : null}

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleSend()
        }}
        className='border-t p-3'
      >
        <div className='flex items-center gap-2'>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('placeholder')}
            disabled={isReplying || limitReached}
            autoComplete='off'
          />
          <Button type='submit' size='icon' disabled={isReplying || limitReached || !input.trim()}>
            <SendHorizonal className='size-4' />
            <span className='sr-only'>{t('send')}</span>
          </Button>
        </div>
      </form>
    </Card>
  )
}
