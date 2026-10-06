'use client'

import { ChevronDown, Facebook, Instagram, Youtube } from 'lucide-react'
import { motion } from 'motion/react'
import { useTranslations } from 'next-intl'
import { useId, useState, type CSSProperties, type ReactNode } from 'react'

import { Link } from '@/i18n/navigation'
import { cmsText, useCmsDocument } from '@/shared/cms'
import { HotlineLink, TikTokIcon, Logo, TurnkeyRequestDialog, ZaloIcon } from '@/shared/components/common'
import { siteConfig } from '@/shared/config/site'
import { cn } from '@/shared/lib/utils'
import { FOOTER_ABOUT_LINKS, FOOTER_PRODUCT_LINKS, FOOTER_SUPPORT_LINKS, type FooterLink } from './site-footer.config'

/**
 * Mot muc trong cot link. `href: null` = trang chua dung: hien mo, khong bam
 * duoc thay vi tro toi route chet (xem `site-footer.config.ts`).
 */
function FooterNavLink({
  link,
  label,
  pendingLabel,
  index,
  onAction,
  plain = false
}: {
  link: FooterLink
  label: string
  pendingLabel: string
  index: number
  onAction?: (action: NonNullable<FooterLink['action']>) => void
  /** Trong mục xếp lại (accordion mobile): không hiệu ứng vào khung nhìn — vùng đang đóng chưa từng "vào khung". */
  plain?: boolean
}) {
  if (plain) {
    if (link.action && onAction) {
      const action = link.action
      return (
        <li>
          <button
            type='button'
            onClick={() => onAction(action)}
            className='footer-animated-link text-footer-foreground relative inline-block text-left text-sm transition-colors'
          >
            {label}
          </button>
        </li>
      )
    }
    if (!link.href) {
      return (
        <li>
          <span
            aria-disabled='true'
            title={pendingLabel}
            className='text-footer-foreground/50 cursor-default text-sm select-none'
          >
            {label}
          </span>
        </li>
      )
    }
    return (
      <li>
        <Link
          href={link.href}
          className='footer-animated-link text-footer-foreground relative inline-block text-sm transition-colors'
        >
          {label}
        </Link>
      </li>
    )
  }

  if (link.action && onAction) {
    const action = link.action
    return (
      <motion.li
        initial={{ opacity: 0, y: 6 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.44, delay: 0.18 + index * 0.07, ease: [0.22, 1, 0.36, 1] }}
      >
        <button
          type='button'
          onClick={() => onAction(action)}
          className='footer-animated-link text-footer-foreground relative inline-block text-left text-sm transition-colors'
        >
          {label}
        </button>
      </motion.li>
    )
  }

  if (!link.href) {
    return (
      <motion.li
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.42, delay: 0.18 + index * 0.07 }}
      >
        <span
          aria-disabled='true'
          title={pendingLabel}
          className='text-footer-foreground/50 cursor-default text-sm select-none'
        >
          {label}
        </span>
      </motion.li>
    )
  }

  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.44, delay: 0.18 + index * 0.07, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link
        href={link.href}
        className='footer-animated-link text-footer-foreground relative inline-block text-sm transition-colors'
      >
        {label}
      </Link>
    </motion.li>
  )
}

/** Tiêu đề cột — in hoa, đậm và giãn chữ. */
function ColumnTitle({ children }: { children: ReactNode }) {
  return <h2 className='mb-4 text-sm font-bold tracking-[0.12em] uppercase'>{children}</h2>
}

/** Mot cot lien ket. */
function LinkColumn({
  title,
  links,
  pendingLabel,
  onAction
}: {
  title: string
  links: readonly FooterLink[]
  pendingLabel: string
  onAction?: (action: NonNullable<FooterLink['action']>) => void
}) {
  const t = useTranslations('footer')
  return (
    <nav aria-label={title}>
      <ColumnTitle>{title}</ColumnTitle>
      <ul className='space-y-2.5 text-sm leading-5'>
        {links.map((link, index) => (
          <FooterNavLink
            key={link.labelKey}
            link={link}
            label={t(`links.${link.labelKey}`)}
            pendingLabel={pendingLabel}
            index={index}
            onAction={onAction}
          />
        ))}
      </ul>
    </nav>
  )
}

/**
 * Mobile (< sm): bốn mục lớn thu gọn, chỉ hiện tiêu đề + mũi tên bên phải; bấm một
 * mục mới sổ nội dung của nó (mở một mục thì mục đang mở tự đóng). PC / tablet giữ
 * nguyên dạng cột.
 */
function FooterAccordion({ sections }: { sections: { key: string; title: string; content: ReactNode }[] }) {
  const baseId = useId()
  const [openKey, setOpenKey] = useState<string | null>(null)

  return (
    <div className='border-footer-foreground/15 divide-footer-foreground/15 divide-y border-y sm:hidden'>
      {sections.map((section) => {
        const open = openKey === section.key
        const panelId = `${baseId}-${section.key}`
        return (
          <section key={section.key}>
            <h2>
              <button
                type='button'
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpenKey(open ? null : section.key)}
                className='flex w-full items-center justify-between gap-3 py-4 text-left text-sm font-bold tracking-[0.12em] uppercase'
              >
                {section.title}
                <ChevronDown
                  aria-hidden
                  className={cn('size-5 shrink-0 transition-transform duration-300', open && 'rotate-180')}
                />
              </button>
            </h2>
            <div
              id={panelId}
              inert={!open}
              className={cn(
                'grid transition-[grid-template-rows] duration-300 ease-out',
                open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
              )}
            >
              <div className='overflow-hidden'>
                <div className='pb-5'>{section.content}</div>
              </div>
            </div>
          </section>
        )
      })}
    </div>
  )
}

/**
 * Footer dung chung cho moi trang (quy uoc xuyen suot, muc I).
 *
 * Dung theo anh mockup khach gui: nen toi, nam cot - thuong hieu (logo, mo ta,
 * mang xa hoi), San pham, Ho tro, Ve SAVICO, Lien he - va mot hang day chi con
 * dong ban quyen.
 *
 * Cot lien he la chu thuan chu khong phai danh sach icon: trong anh no la ba
 * dong "Hotline / Email / Dia chi" xep nhu mot cot chu, cung nhip voi ba cot
 * lien ket ben canh.
 */
export function SiteFooter() {
  const t = useTranslations('footer')
  const tNav = useTranslations('nav')
  const year = new Date().getFullYear()
  const { contact, social } = siteConfig
  // Noi dung lien he / mang xa hoi do admin sua (muc X). Chua sua thi roi ve
  // hang so trong `shared/config/site.ts` va ban dich i18n.
  const settings = useCmsDocument('settings')
  const [turnkeyOpen, setTurnkeyOpen] = useState(false)

  const hotline = cmsText(settings.hotline, contact.hotline)
  const email = cmsText(settings.email, contact.email)

  const socialLinks = [
    {
      href: cmsText(settings.facebookUrl, social.facebookUrl),
      label: t('social.facebook'),
      icon: <Facebook className='size-4' />
    },
    {
      href: cmsText(settings.youtubeUrl, social.youtubeUrl),
      label: t('social.youtube'),
      icon: <Youtube className='size-4' />
    },
    { href: cmsText(settings.tiktokUrl, social.tiktokUrl), label: t('social.tiktok'), icon: <TikTokIcon /> },
    { href: cmsText(settings.zaloUrl, social.zaloOaUrl), label: t('social.zaloOa'), icon: <ZaloIcon /> },
    { href: social.instagramUrl, label: t('social.instagram'), icon: <Instagram className='size-4' /> }
  ]

  const pendingLabel = t('comingSoon')

  // Nội dung các mục trong accordion mobile — cùng dữ liệu với cột PC, bỏ hiệu ứng vào khung nhìn.
  const linkList = (links: readonly FooterLink[]) => (
    <ul className='space-y-2.5 text-sm leading-5'>
      {links.map((link, index) => (
        <FooterNavLink
          key={link.labelKey}
          link={link}
          label={t(`links.${link.labelKey}`)}
          pendingLabel={pendingLabel}
          index={index}
          onAction={() => setTurnkeyOpen(true)}
          plain
        />
      ))}
    </ul>
  )
  const contactList = (
    <ul className='text-footer-foreground space-y-2.5 text-sm leading-5'>
      <li>
        {t('hotline')}:{' '}
        <HotlineLink hotline={hotline} className='footer-animated-link relative inline-block transition-colors'>
          {hotline}
        </HotlineLink>
      </li>
      <li>
        {t('emailLabel')}:{' '}
        <a href={`mailto:${email}`} className='footer-animated-link relative inline-block transition-colors'>
          {email}
        </a>
      </li>
      <li>
        {t('addressLabel')}: {cmsText(settings.address, t('address'))}
      </li>
    </ul>
  )

  return (
    // Nen toi o ca light lan dark (quy uoc xuyen suot, muc I).
    <footer className='bg-footer text-footer-foreground mt-auto'>
      <div className='footer-brand-bg'>
        <div className='mx-auto grid w-full max-w-[90rem] gap-10 px-4 pt-10 pb-14 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr_1.2fr] lg:gap-10 lg:px-8 lg:pt-14'>
          {/* Cot 1 - Thuong hieu */}
          <motion.div
            className='max-lg:order-1'
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.58, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Dải trắng lấy bề ngang theo logo và dòng mô tả, kéo tới cuối chữ AI. */}
            <div className='inline-flex max-w-full flex-col items-start'>
              <div className='footer-logo-tab'>
                <Logo onDark className='h-12 max-w-full max-lg:h-14' />
              </div>
              <p className='text-footer-foreground mt-4 max-w-xs text-sm leading-relaxed'>
                {cmsText(settings.tagline, tNav('brandTagline'))}
              </p>
            </div>

            <ul className='mt-5 flex gap-2.5'>
              {socialLinks.map((item) => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    target='_blank'
                    rel='noreferrer'
                    aria-label={item.label}
                    className={cn(
                      'footer-social-link',
                      'bg-white/15 text-white flex size-9 items-center justify-center rounded-full',
                      'hover:bg-brand-orange hover:text-white transition-colors'
                    )}
                  >
                    {item.icon}
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>

          <FooterAccordion
            sections={[
              { key: 'about', title: t('aboutTitle'), content: linkList(FOOTER_ABOUT_LINKS) },
              { key: 'product', title: t('productTitle'), content: linkList(FOOTER_PRODUCT_LINKS) },
              { key: 'support', title: t('supportTitle'), content: linkList(FOOTER_SUPPORT_LINKS) },
              { key: 'contact', title: t('contactTitle'), content: contactList }
            ]}
          />

          {[
            { title: t('productTitle'), links: FOOTER_PRODUCT_LINKS, order: 'max-lg:order-3' },
            { title: t('supportTitle'), links: FOOTER_SUPPORT_LINKS, order: 'max-lg:order-4' },
            { title: t('aboutTitle'), links: FOOTER_ABOUT_LINKS, order: 'max-lg:order-2' }
          ].map((column, index) => (
            <motion.div
              key={column.title}
              className='max-sm:hidden'
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.58, delay: (index + 1) * 0.14, ease: [0.22, 1, 0.36, 1] }}
            >
              <LinkColumn
                onAction={() => setTurnkeyOpen(true)}
                title={column.title}
                links={column.links}
                pendingLabel={pendingLabel}
              />
            </motion.div>
          ))}

          {/* Cot 5 - Lien he */}
          <motion.div
            className='max-lg:order-5 max-sm:hidden'
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.58, delay: 0.56, ease: [0.22, 1, 0.36, 1] }}
            style={{ '--footer-contact-delay': '0.56s' } as CSSProperties}
          >
            <ColumnTitle>{t('contactTitle')}</ColumnTitle>
            <ul className='text-footer-foreground space-y-2.5 text-sm leading-5'>
              <motion.li
                initial={{ opacity: 0, y: 5 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.42, delay: 0.74, ease: [0.22, 1, 0.36, 1] }}
              >
                {t('hotline')}:{' '}
                <HotlineLink hotline={hotline} className='footer-animated-link relative inline-block transition-colors'>
                  {hotline}
                </HotlineLink>
              </motion.li>
              <motion.li
                initial={{ opacity: 0, y: 5 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.42, delay: 0.81, ease: [0.22, 1, 0.36, 1] }}
              >
                {t('emailLabel')}:{' '}
                <a href={`mailto:${email}`} className='footer-animated-link relative inline-block transition-colors'>
                  {email}
                </a>
              </motion.li>
              <motion.li
                initial={{ opacity: 0, y: 5 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.42, delay: 0.88, ease: [0.22, 1, 0.36, 1] }}
              >
                {t('addressLabel')}: {cmsText(settings.address, t('address'))}
              </motion.li>
            </ul>
          </motion.div>
        </div>
      </div>

      {/* Hang day - chi con dong ban quyen (anh mockup). */}
      <div className='border-footer-foreground/15 border-t'>
        {/* `pe-*` chua cho cho chatbox noi goc phai duoi (muc II.3). */}
        <div className='text-footer-foreground/60 mx-auto w-full max-w-[90rem] px-4 py-5 pb-24 text-xs sm:pb-5 sm:pe-44 lg:px-8 lg:pe-52'>
          <p>
            © {year} {cmsText(settings.brandName, siteConfig.name)}. {t('rights')}
          </p>
        </div>
      </div>
      <TurnkeyRequestDialog open={turnkeyOpen} onOpenChange={setTurnkeyOpen} />
    </footer>
  )
}
