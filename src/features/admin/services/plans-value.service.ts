import { legacyValueItems, readValueItems } from '@/shared/cms/plans-value-content'
import { plansCopyPath } from '@/shared/cms/plans-sections'
import { defaultText, type HomeSectionDef } from './home-sections.service'

export const valueContentAdapter: NonNullable<HomeSectionDef['contentAdapter']> = {
  formValues: (saved, messages) => ({
    title:
      typeof saved?.title === 'string' && saved.title.trim()
        ? saved.title.trim()
        : defaultText(messages, plansCopyPath('value', 'title')),
    items: readValueItems(saved?.items) ?? legacyValueItems(saved ?? undefined, messages)
  }),
  buildContent: (values, messages) => {
    const content: Record<string, unknown> = { items: readValueItems(values.items) ?? values.items }
    const title = typeof values.title === 'string' ? values.title.trim() : ''
    if (title && title !== defaultText(messages, plansCopyPath('value', 'title')).trim()) content.title = title
    return content
  }
}
