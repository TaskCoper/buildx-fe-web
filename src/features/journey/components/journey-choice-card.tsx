'use client'

import { ArrowRight, Check, type LucideIcon } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'

import { Photo } from '@/shared/components/common'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib'

type Tone = 'green' | 'orange'

interface JourneyChoiceCardProps {
  tone: Tone
  imageSrc: string
  imageAlt: string
  Icon: LucideIcon
  title: string
  description: string
  bullets: readonly string[]
  info: string
  infoTone: Tone
  cta: string
  onClick: () => void
  disabled?: boolean
  order: number
}

export function JourneyChoiceCard({
  tone,
  imageSrc,
  imageAlt,
  Icon,
  title,
  description,
  bullets,
  info,
  infoTone,
  cta,
  onClick,
  disabled,
  order
}: JourneyChoiceCardProps) {
  const reduceMotion = useReducedMotion()
  const orange = tone === 'orange'

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 22, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: reduceMotion ? 0 : 0.5,
        delay: reduceMotion ? 0 : 0.18 + order * 0.1,
        ease: [0.16, 1, 0.3, 1]
      }}
      className='flex'
    >
      <motion.article
        whileHover={reduceMotion ? undefined : { y: -5, scale: 1.004 }}
        transition={{ duration: reduceMotion ? 0 : 0.18, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          'group flex min-h-[490px] w-full flex-col rounded-[18px] border-2 bg-card p-4 transition-[border-color,box-shadow] duration-[180ms] max-[899px]:min-h-0 max-[899px]:p-3',
          orange
            ? 'border-brand-orange/90 hover:shadow-[0_18px_44px_-30px_var(--brand-orange)]'
            : 'border-primary/30 hover:border-primary/50 hover:shadow-[0_18px_44px_-32px_var(--primary)]'
        )}
      >
        <div className='relative'>
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, scale: 1.025, filter: 'blur(5px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            transition={{ duration: reduceMotion ? 0 : 0.62, delay: reduceMotion ? 0 : 0.24 + order * 0.1 }}
          >
            <Photo
              src={imageSrc}
              alt={imageAlt}
              sizes='(max-width: 768px) 100vw, 500px'
              className='h-[150px] rounded-[12px] sm:h-[156px] max-[899px]:h-[132px]'
              imageClassName='transition-transform duration-[180ms] ease-out group-hover:scale-[1.035]'
            />
          </motion.div>

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, scale: 0.72, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{
              duration: reduceMotion ? 0 : 0.38,
              delay: reduceMotion ? 0 : 0.46 + order * 0.1,
              ease: [0.2, 1.35, 0.4, 1]
            }}
            className={cn(
              'absolute -bottom-6 left-3 flex size-12 items-center justify-center rounded-full bg-background shadow-md ring-1',
              orange ? 'text-brand-orange ring-brand-orange/10' : 'text-primary ring-primary/10'
            )}
          >
            <Icon className='size-6' strokeWidth={1.9} />
          </motion.div>
        </div>

        <div className='flex flex-1 flex-col pt-9'>
          <h3
            className={cn(
              'text-center text-[23px] leading-tight font-extrabold max-[899px]:text-[18px]',
              orange ? 'text-brand-orange' : 'text-primary-strong'
            )}
          >
            {title}
          </h3>
          <p className='text-muted-foreground mx-auto mt-1.5 min-h-[40px] max-w-[400px] text-center text-[15px] leading-relaxed max-[899px]:min-h-0 max-[899px]:text-[13px]'>
            {description}
          </p>

          <ul className='mt-4 space-y-2'>
            {bullets.map((bullet, index) => (
              <motion.li
                key={bullet}
                initial={reduceMotion ? false : { opacity: 0, x: -9 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  duration: reduceMotion ? 0 : 0.34,
                  delay: reduceMotion ? 0 : 0.5 + order * 0.1 + index * 0.06
                }}
                className='flex items-center gap-2.5 text-[15px] leading-snug'
              >
                <span
                  className={cn(
                    'flex size-5 shrink-0 items-center justify-center rounded-full border-2',
                    orange
                      ? 'border-brand-orange bg-brand-orange text-brand-orange-foreground'
                      : 'border-primary text-primary'
                  )}
                >
                  <Check className='size-3' strokeWidth={3} />
                </span>
                <span>{bullet}</span>
              </motion.li>
            ))}
          </ul>

          <div className='mt-auto pt-4'>
            <div
              className={cn(
                'flex min-h-9 items-center justify-center rounded-lg px-3 text-center text-[14px] font-bold',
                infoTone === 'orange' ? 'bg-brand-orange-soft text-brand-orange' : 'bg-accent text-primary-strong'
              )}
            >
              {info}
            </div>
            <Button
              type='button'
              size='lg'
              disabled={disabled}
              onClick={onClick}
              className={cn(
                'group/button mt-3 h-12 w-full rounded-full text-[16px] font-bold transition-[transform,filter,box-shadow] duration-[180ms] active:scale-[0.985]',
                orange ? 'brand-orange-button' : 'brand-green-button'
              )}
            >
              {cta}
              <ArrowRight className='ml-1 size-4.5 transition-transform duration-150 group-hover/button:translate-x-1' />
            </Button>
          </div>
        </div>
      </motion.article>
    </motion.div>
  )
}
