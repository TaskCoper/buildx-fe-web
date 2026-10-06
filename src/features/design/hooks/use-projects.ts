'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useRef } from 'react'
import { useAuth } from '@/shared/auth'
import { useTranslations } from 'next-intl'

import { useRouter } from '@/i18n/navigation'
import { designInputRoute } from '@/shared/constants/routes'
import { isApiError } from '@/shared/lib/api'
import { designApi, type CreateProjectPayload } from '../api/design.api'
import { designKeys } from '../api/design.keys'
import { useDesignStore } from '../store/design.store'

/** Danh sách "Dự án của tôi" trong Cửa sổ cá nhân (mục IV). */
export function useProjects(enabled = true) {
  const { user, isAuthenticated, isInitialized } = useAuth()
  return useQuery({
    queryKey: [...designKeys.projects(), 'owner', user?.id],
    queryFn: () => designApi.listProjects(),
    enabled:
      enabled &&
      isInitialized &&
      isAuthenticated &&
      user?.accountKind === 'Customer' &&
      !user.mustChangePassword &&
      user.emailVerified !== false
  })
}

export function useProject(projectId: string) {
  return useQuery({
    queryKey: designKeys.project(projectId),
    queryFn: () => designApi.getProject(projectId),
    enabled: Boolean(projectId)
  })
}

/**
 * Modal Tạo dự án (mục III.1): sinh Project ID, lưu vào danh sách dự án của
 * tài khoản và mở ngay màn hình Bước 1 — Nhập liệu.
 */
export function useCreateProject(onCreated?: (projectId: string) => void) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const closeCreateDialog = useDesignStore((s) => s.closeCreateDialog)
  const t = useTranslations('errors')

  const request = useRef<{ body: string; key: string } | null>(null)
  return useMutation({
    mutationFn: (payload: CreateProjectPayload) => {
      const body = JSON.stringify(payload)
      if (request.current?.body !== body) request.current = { body, key: crypto.randomUUID() }
      return designApi.createProject(payload, request.current.key)
    },
    onSuccess: (project) => {
      request.current = null
      queryClient.invalidateQueries({ queryKey: designKeys.projects() })
      if (onCreated) {
        onCreated(project.id)
        return
      }
      closeCreateDialog()
      router.push(designInputRoute(project.id))
    },
    onError: (error) => {
      toast.error(isApiError(error) ? error.message : t('generic'))
    }
  })
}

/** Menu ⋮ → Đổi tên trên thẻ dự án (mục IV.1). */
export function useRenameProject() {
  const queryClient = useQueryClient()
  const t = useTranslations('errors')
  const tProjects = useTranslations('design.projects')

  return useMutation({
    mutationFn: ({ projectId, name }: { projectId: string; name: string }) => designApi.renameProject(projectId, name),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: designKeys.projects() })
      queryClient.invalidateQueries({ queryKey: designKeys.project(project.id) })
      toast.success(tProjects('rename.success', { name: project.name }))
    },
    onError: (error) => {
      toast.error(isApiError(error) ? error.message : t('generic'))
    }
  })
}

/**
 * Menu ⋮ → Xóa (mục IV.1). Chỉ chạy sau khi người dùng xác nhận ở hộp thoại —
 * hook không tự hỏi lại.
 */
export function useDeleteProject() {
  const queryClient = useQueryClient()
  const clearDraft = useDesignStore((s) => s.clearDraft)
  const t = useTranslations('errors')
  const tProjects = useTranslations('design.projects')

  return useMutation({
    mutationFn: (projectId: string) => designApi.deleteProject(projectId),
    onSuccess: (_data, projectId) => {
      // Bản nháp Bước 1 nằm ở localStorage, xóa dự án mà bỏ quên nháp thì mã
      // dự án cũ vẫn chiếm chỗ và có thể bị dùng lại nhầm.
      clearDraft(projectId)
      queryClient.invalidateQueries({ queryKey: designKeys.projects() })
      toast.success(tProjects('delete.success'))
    },
    onError: (error) => {
      const code = isApiError(error) ? (error.messageCode ?? error.code) : null
      toast.error(
        code === 'Processing' || code === 'ConstructionSiteInUse'
          ? tProjects(`delete.${code}`)
          : isApiError(error)
            ? error.message
            : t('generic')
      )
    }
  })
}
