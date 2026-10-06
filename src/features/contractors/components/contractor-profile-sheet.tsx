'use client'

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/shared/components/ui'
import { BadgeCheck, CircleCheck } from 'lucide-react'
import { motion } from 'motion/react'
import { useTranslations } from 'next-intl'
import { revealEase } from '@/shared/components/common'
import type { Contractor } from '../types/contractor.types'
import { ContractorLogo } from './contractor-logo'

export function ContractorProfileSheet({
  contractor,
  onOpenChange
}: {
  contractor: Contractor | null
  onOpenChange: (open: boolean) => void
}) {
  const t = useTranslations('contractors.invitations')
  const tFirm = useTranslations('contractors.firm')

  return (
    <Sheet open={Boolean(contractor)} onOpenChange={onOpenChange}>
      <SheetContent className='w-[94vw] overflow-y-auto sm:max-w-lg'>
        {contractor ? (
          <>
            <SheetHeader className='pr-10'>
              <div className='flex items-center gap-3'>
                <ContractorLogo contractor={contractor} className='size-14 rounded-xl' />
                <div className='min-w-0'>
                  <SheetTitle className='flex items-center gap-1.5'>
                    <span className='truncate'>{contractor.name}</span>
                    {contractor.verified ? <BadgeCheck className='text-primary size-4 shrink-0' /> : null}
                  </SheetTitle>
                  <SheetDescription>{t('profilePanelDescription')}</SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <motion.div
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, ease: revealEase }}
              className='space-y-5 px-4 pb-6'
            >
              <dl className='grid grid-cols-2 gap-2 text-sm'>
                <div className='bg-muted/40 rounded-xl p-3'>
                  <dt className='text-muted-foreground text-xs'>{t('profileRating')}</dt>
                  <dd className='mt-1 font-semibold'>{contractor.rating}/5</dd>
                </div>
                <div className='bg-muted/40 rounded-xl p-3'>
                  <dt className='text-muted-foreground text-xs'>{t('profileSimilar')}</dt>
                  <dd className='mt-1 font-semibold'>{contractor.similarProjects}</dd>
                </div>
              </dl>

              <section>
                <h3 className='font-semibold'>{tFirm('introTitle')}</h3>
                <p className='text-muted-foreground mt-2 text-sm leading-relaxed text-pretty'>{contractor.intro}</p>
                <div className='mt-3 flex flex-wrap gap-2'>
                  {contractor.strengths.map((strength) => (
                    <span key={strength} className='bg-primary/10 text-primary-strong rounded-md px-2.5 py-1 text-xs'>
                      {strength}
                    </span>
                  ))}
                </div>
              </section>

              <section>
                <h3 className='font-semibold'>{tFirm('featured')}</h3>
                <ul className='mt-2 space-y-2'>
                  {contractor.featuredProjects.map((project) => (
                    <li key={project.id} className='bg-muted/40 flex justify-between gap-3 rounded-xl p-3 text-sm'>
                      <span className='font-medium'>{project.name}</span>
                      <span className='text-muted-foreground shrink-0'>{project.year}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section>
                <h3 className='font-semibold'>{tFirm('legalTitle')}</h3>
                <ul className='mt-2 space-y-2'>
                  {contractor.legalChecks.map((check) => (
                    <li key={check} className='flex items-start gap-2 text-sm'>
                      <CircleCheck className='text-primary mt-0.5 size-4 shrink-0' />
                      <span className='text-muted-foreground'>{check}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </motion.div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
