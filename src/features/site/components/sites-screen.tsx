'use client'

import { CalendarClock, MapPin, Plus } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useMemo, useState, type FormEvent } from 'react'
import { toast } from 'sonner'

import type { Locale } from '@/i18n/routing'
import { AddressAutocomplete } from '@/shared/components/common'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/shared/components/ui/dialog'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { isApiError } from '@/shared/lib/api'
import { formatDisplayDate } from '@/shared/utils'
import { useAssignGrant, useCreateSite, useDeleteSite, useGrants, useSites, useUpdateSite } from '../hooks/use-sites'
import type { ConstructionSite, SupervisionGrant } from '../types/site.types'

/**
 * "Công trình của tôi" (STORY-SITE-001) — CRUD công trình + gán gói giám sát
 * (STORY-SUB-004) vào công trình. Nối thẳng `/me/construction-sites` +
 * `/me/supervision-grants`. Công trình đang có gói giám sát thì không sửa/xoá
 * được (BE trả 409).
 */
export function SitesScreen() {
  const t = useTranslations('account.sites')
  const locale = useLocale() as Locale
  const sites = useSites()
  const grants = useGrants()
  const createSite = useCreateSite()
  const updateSite = useUpdateSite()
  const deleteSite = useDeleteSite()
  const assignGrant = useAssignGrant()

  const [editing, setEditing] = useState<ConstructionSite | 'new' | null>(null)
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  // Toạ độ chỉ có khi người dùng CHỌN một gợi ý địa chỉ; gõ tay thì về null.
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null)
  const [deleting, setDeleting] = useState<ConstructionSite | null>(null)
  const [assignChoice, setAssignChoice] = useState<Record<string, string>>({})

  const siteItems = sites.data?.items ?? []
  const unassignedGrants = useMemo(
    () => (grants.data?.items ?? []).filter((g) => g.state === 'Unassigned'),
    [grants.data?.items]
  )

  function openNew() {
    setEditing('new')
    setName('')
    setAddress('')
    setCoords(null)
  }
  function openEdit(site: ConstructionSite) {
    setEditing(site)
    setName(site.name)
    setAddress(site.address)
    setCoords(
      typeof site.latitude === 'number' && typeof site.longitude === 'number'
        ? { latitude: site.latitude, longitude: site.longitude }
        : null
    )
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim() || !address.trim()) return
    // BE từ chối khi thiếu toạ độ, nên chặn ngay ở đây và nói rõ phải làm gì —
    // để gửi đi rồi mới báo lỗi thì người dùng không hiểu mình sai chỗ nào.
    if (!coords) {
      toast.error(t('needCoordinates'))
      return
    }
    const body = { name: name.trim(), address: address.trim(), ...coords }
    const onDone = () => {
      toast.success(t('saved'))
      setEditing(null)
    }
    const onErr = (err: unknown) => toast.error(isApiError(err) ? err.message : t('error'))
    if (editing === 'new') createSite.mutate(body, { onSuccess: onDone, onError: onErr })
    else if (editing)
      updateSite.mutate(
        { id: editing.constructionSiteId, body: { ...body, expectedVersion: editing.version } },
        { onSuccess: onDone, onError: onErr }
      )
  }

  function onDelete() {
    if (!deleting) return
    deleteSite.mutate(deleting.constructionSiteId, {
      onSuccess: () => {
        toast.success(t('deleted'))
        setDeleting(null)
      },
      onError: (err) => toast.error(isApiError(err) ? err.message : t('error'))
    })
  }

  function onAssign(grant: SupervisionGrant) {
    const siteId = assignChoice[grant.grantId]
    if (!siteId) return
    assignGrant.mutate(
      { grantId: grant.grantId, siteId, expectedVersion: grant.version },
      {
        onSuccess: () => toast.success(t('assignedOk')),
        onError: (err) => toast.error(isApiError(err) ? err.message : t('error'))
      }
    )
  }

  const grantTone: Record<string, string> = {
    Assigned: 'bg-success/10 text-success',
    Completed: 'bg-primary/10 text-primary-strong',
    CanceledByStaff: 'bg-muted text-muted-foreground'
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between gap-3'>
        <p className='text-muted-foreground text-sm text-pretty'>{t('subtitle')}</p>
        <Button size='sm' onClick={openNew}>
          <Plus className='size-4' />
          {t('add')}
        </Button>
      </div>

      {sites.isPending ? (
        <div className='grid gap-3 sm:grid-cols-2'>
          <Skeleton className='h-28 rounded-xl' />
          <Skeleton className='h-28 rounded-xl' />
        </div>
      ) : siteItems.length ? (
        <div className='grid gap-3 sm:grid-cols-2'>
          {siteItems.map((site) => (
            <Card key={site.constructionSiteId}>
              <CardHeader className='pb-2'>
                <CardTitle className='text-base'>{site.name}</CardTitle>
                <p className='text-muted-foreground flex items-center gap-1.5 text-sm'>
                  <MapPin className='size-3.5 shrink-0' />
                  {site.address}
                </p>
              </CardHeader>
              <CardContent className='space-y-3'>
                {site.supervisionGrants.length ? (
                  <div className='flex flex-wrap gap-1.5'>
                    {site.supervisionGrants.map((g) => (
                      <span
                        key={g.grantId}
                        className={`rounded-full px-2 py-0.5 max-md:text-xs text-[11px] font-medium ${grantTone[g.state] ?? 'bg-muted'}`}
                      >
                        {g.planName} · {t(`grantState.${g.state}`)}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className='text-muted-foreground text-xs'>{t('noGrant')}</p>
                )}
                <div className='flex gap-2'>
                  <Button size='sm' variant='outline' onClick={() => openEdit(site)}>
                    {t('edit')}
                  </Button>
                  <Button size='sm' variant='ghost' className='text-destructive' onClick={() => setDeleting(site)}>
                    {t('delete')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : sites.isError ? (
        /* Gọi hỏng (hay gặp: 403 vì tài khoản không phải khách hàng) — KHÔNG được
           rơi vào ô "chưa có công trình", vì đó là nói sai: dữ liệu chưa đọc được
           chứ không phải rỗng. */
        <Card>
          <CardContent className='py-10 text-center'>
            <p className='font-semibold'>{t('error')}</p>
            <p className='text-muted-foreground mx-auto mt-1 max-w-md text-sm'>
              {isApiError(sites.error) ? sites.error.message : ''}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className='py-10 text-center'>
            <MapPin className='text-primary mx-auto size-8' strokeWidth={1.5} />
            <p className='mt-3 font-semibold'>{t('empty.title')}</p>
            <p className='text-muted-foreground mx-auto mt-1 max-w-md text-sm'>{t('empty.description')}</p>
          </CardContent>
        </Card>
      )}

      {/* Gói giám sát chưa gán → chọn công trình để gán (STORY-SUB-004). */}
      {unassignedGrants.length ? (
        <section className='space-y-3'>
          <h2 className='text-sm font-semibold'>{t('grantsTitle')}</h2>
          <div className='space-y-2'>
            {unassignedGrants.map((grant) => (
              <div key={grant.grantId} className='bg-card flex flex-wrap items-center gap-3 rounded-xl border p-3'>
                <div className='min-w-0 flex-1'>
                  <p className='text-sm font-medium'>{grant.grantId.slice(0, 8)}</p>
                  {grant.assignmentDeadlineUtc ? (
                    <p className='text-muted-foreground flex items-center gap-1.5 text-xs'>
                      <CalendarClock className='size-3.5' />
                      {t('assignBy', { date: formatDisplayDate(grant.assignmentDeadlineUtc, locale) })}
                    </p>
                  ) : null}
                </div>
                <Select
                  value={assignChoice[grant.grantId]}
                  onValueChange={(v) => setAssignChoice((s) => ({ ...s, [grant.grantId]: v }))}
                >
                  <SelectTrigger className='w-48'>
                    <SelectValue placeholder={t('pickSite')} />
                  </SelectTrigger>
                  <SelectContent>
                    {siteItems.map((site) => (
                      <SelectItem key={site.constructionSiteId} value={site.constructionSiteId}>
                        {site.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size='sm'
                  disabled={!assignChoice[grant.grantId] || assignGrant.isPending}
                  onClick={() => onAssign(grant)}
                >
                  {t('assign')}
                </Button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>{editing === 'new' ? t('add') : t('editTitle')}</DialogTitle>
            <DialogDescription>{t('formHint')}</DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='site-name'>{t('name')}</Label>
              <Input id='site-name' value={name} onChange={(e) => setName(e.target.value)} maxLength={200} />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='site-address'>{t('address')}</Label>
              <AddressAutocomplete
                id='site-address'
                value={address}
                maxLength={500}
                onChange={setAddress}
                onResolved={(found) => {
                  setAddress(found.display)
                  setCoords({ latitude: found.latitude, longitude: found.longitude })
                }}
                onCleared={() => setCoords(null)}
              />
              <p className='text-muted-foreground text-xs'>{coords ? t('coordinatesReady') : t('addressHint')}</p>
            </div>
            <DialogFooter>
              <Button type='button' variant='outline' onClick={() => setEditing(null)}>
                {t('cancel')}
              </Button>
              <Button type='submit' disabled={createSite.isPending || updateSite.isPending}>
                {t('save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent className='sm:max-w-sm'>
          <DialogHeader>
            <DialogTitle>{t('deleteConfirmTitle', { name: deleting?.name ?? '' })}</DialogTitle>
            <DialogDescription>{t('deleteConfirmBody')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant='outline' onClick={() => setDeleting(null)}>
              {t('cancel')}
            </Button>
            <Button variant='destructive' disabled={deleteSite.isPending} onClick={onDelete}>
              {t('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
