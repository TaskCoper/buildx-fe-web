import {
  createLibraryTemplate,
  createTemplateDraft,
  deleteTemplateDraft,
  detachTemplateAsset,
  getTemplateVersions,
  publishTemplateVersion,
  saveTemplateVersion,
  setTemplateVisibility,
  type AdminVersionItem,
  type TemplateContent,
  type VersionCreated
} from './library.api'
import { createSection, listSectionAssets, listSections, renameSection, setVersionCover } from './library-sections.api'
import { chainEditVersion, nextPosition, resolveFileType } from './library-sections.logic'
import { uploadFileToSection } from './library-upload'

/**
 * Thêm / sửa mẫu thư viện bằng MỘT form. BE tách thành nhiều API (mẫu → phiên bản → section → tệp → ảnh đại
 * diện → công bố, mỗi bước một khoá lạc quan `editVersion`), còn người dùng chỉ thấy một bảng có Thêm / Sửa /
 * Xoá: mọi bước nối tiếp nhau nằm ở file này.
 */

/** Một tệp đã có trong section (đang lưu trên BE). */
export interface FormAsset {
  assetId: string
  name: string
  url: string
  isImage: boolean
  position: number
}

/** Một tầng/phần trong form: tên (Tầng 1, Tầng 2…), tệp đã lưu và tệp mới chọn. */
export interface FormSection {
  key: string
  /** Có = section đã tồn tại trên BE (Sửa). */
  sectionId?: string
  originalName?: string
  name: string
  /** Tệp mới, chưa tải lên. */
  files: File[]
  /** Tệp đã lưu còn giữ lại. */
  assets: FormAsset[]
  /** Tệp đã lưu mà người dùng bỏ đi — gỡ khỏi phiên bản khi bấm Lưu. */
  removed: FormAsset[]
}

export interface CreateFlowProgress {
  /** Số tệp đã xong / tổng số tệp. */
  done: number
  total: number
}

export interface SaveFlowResult {
  /** Đã công bố (trong lần lưu này) chưa. Xin công bố mà BE từ chối thì mẫu ở lại dạng nháp. */
  published: boolean
  /** Lý do công bố không được (thường là `LibraryValidationError` kèm danh sách thiếu gì). */
  publishError?: unknown
  /** Đã công bố nhưng mẫu vẫn đang ẩn với khách (không bỏ ẩn được) — người dùng cần bấm Chuyển trạng thái. */
  stillHidden?: boolean
}

interface SaveOptions {
  publish: boolean
  onProgress?: (progress: CreateFlowProgress) => void
}

/** Mẫu ĐÃ được tạo/lưu nhưng chưa gắn hết tệp — người dùng chỉ cần mở Sửa và thêm lại phần còn thiếu. */
export class InitialContentError extends Error {
  constructor(
    readonly reason: unknown,
    /** Số tệp chưa tải lên được. */
    readonly missingFiles: number
  ) {
    super('InitialContentError')
    this.name = 'InitialContentError'
  }
}

/**
 * Bỏ nhóm trống hoàn toàn (mới, không tên, không tệp). Nhóm mới có tệp mà chưa đặt tên lấy tên mặc định;
 * nhóm đã lưu để trống tên thì giữ tên cũ (BE không cho section hiện hành mất tên).
 */
export function normalizeSections(
  sections: readonly FormSection[],
  defaultName: (index: number) => string
): FormSection[] {
  return sections
    .map((section, index) => ({
      ...section,
      name:
        section.name.trim() ||
        section.originalName ||
        (section.files.length || section.assets.length ? defaultName(index + 1) : '')
    }))
    .filter((section) => section.sectionId || section.name !== '' || section.files.length > 0)
}

const countFiles = (sections: readonly FormSection[]) => sections.reduce((sum, s) => sum + s.files.length, 0)

/** Tải các tệp mới vào một section, nối `editVersion`; ảnh đầu tiên lấp chỗ ảnh đại diện còn thiếu. */
async function uploadInto(
  ids: { templateId: string; versionId: string; sectionId: string },
  files: readonly File[],
  startPosition: number,
  state: { editVersion: number; coverPending: boolean; done: number },
  total: number,
  onProgress?: (progress: CreateFlowProgress) => void
) {
  for (const [index, file] of files.entries()) {
    const isImage = resolveFileType(file.name)?.kind === 'Image'
    const result = await uploadFileToSection({
      ...ids,
      file,
      editVersion: state.editVersion,
      position: startPosition + index,
      setAsCover: state.coverPending && isImage
    })
    state.editVersion = result.editVersion
    if (state.coverPending && isImage) state.coverPending = false
    state.done += 1
    onProgress?.({ done: state.done, total })
  }
}

async function tryPublish(
  templateId: string,
  versionId: string,
  body: { expectedTemplateVersion: number; expectedEditVersion: number; expectedCurrentVersionId: string | null }
): Promise<SaveFlowResult> {
  // BE từ chối (thiếu kích thước, phong cách…) thì mẫu ở lại dạng nháp, không ném lỗi: người dùng đã có mẫu
  // và chỉ cần bổ sung phần thiếu.
  try {
    await publishTemplateVersion(templateId, versionId, body)
  } catch (publishError) {
    return { published: false, publishError }
  }

  // Lần công bố ĐẦU TIÊN của một mẫu mới: "công bố" phải nghĩa là khách thấy được. Công bố chỉ đổi phiên bản hiện
  // hành, còn cờ ẩn/hiện là của mẫu — nếu mẫu đang ẩn thì phải bỏ ẩn, không thì bảng vẫn báo "Đang ẩn" dù API
  // công bố trả thành công. Mẫu đã công bố từ trước (sửa / bản mới) giữ nguyên lựa chọn ẩn/hiện của người quản lý.
  if (body.expectedCurrentVersionId !== null) return { published: true }
  try {
    const detail = await getTemplateVersions(templateId)
    if (detail.isHidden) await setTemplateVisibility(templateId, detail.templateVersion, false)
    return { published: true }
  } catch {
    return { published: true, stillHidden: true }
  }
}

/**
 * THÊM: tạo mẫu (kèm nháp đầu) → từng section + tệp, TUẦN TỰ vì mỗi lần ghi tăng `editVersion` → công bố nếu
 * được yêu cầu. Lỗi sau khi mẫu đã tạo được ném dưới dạng `InitialContentError` để không tạo trùng khi thử lại.
 */
export async function createTemplateWithSections(
  content: TemplateContent,
  sections: readonly FormSection[],
  options: SaveOptions
): Promise<SaveFlowResult> {
  const total = countFiles(sections)
  const created: VersionCreated = await createLibraryTemplate(content)
  const { templateId, versionId } = created

  const state = { editVersion: created.editVersion, coverPending: true, done: 0 }
  options.onProgress?.({ done: 0, total })

  try {
    for (const section of sections) {
      const saved = await createSection(templateId, versionId, state.editVersion, section.name)
      state.editVersion = chainEditVersion(state.editVersion, saved)
      await uploadInto(
        { templateId, versionId, sectionId: saved.sectionId },
        section.files,
        1,
        state,
        total,
        options.onProgress
      )
    }
  } catch (reason) {
    throw new InitialContentError(reason, total - state.done)
  }

  if (!options.publish) return { published: false }
  return tryPublish(templateId, versionId, {
    expectedTemplateVersion: created.templateVersion,
    expectedEditVersion: state.editVersion,
    expectedCurrentVersionId: null
  })
}

/** Mẫu đang sửa: phiên bản hiển thị (hiện hành, chưa có thì nháp) cùng section và tệp của nó. */
export interface EditTarget {
  templateId: string
  templateVersion: number
  currentVersionId: string | null
  version: AdminVersionItem
  editVersion: number
  coverAssetId: string | null
  sections: FormSection[]
}

export async function loadEditTarget(
  templateId: string,
  keyOf: (index: number) => string,
  versionId?: string
): Promise<EditTarget> {
  const detail = await getTemplateVersions(templateId)
  const version = versionId
    ? detail.versions.find((item) => item.versionId === versionId)
    : (detail.versions.find((item) => item.isCurrent) ?? detail.versions.find((item) => item.state === 'Draft'))
  if (!version) throw new Error('LibraryVersionMissing')

  const listed = await listSections(templateId, version.versionId)
  const sections = await Promise.all(
    listed.sections.map(async (section, index): Promise<FormSection> => {
      const { assets } = await listSectionAssets(templateId, version.versionId, section.sectionId)
      return {
        key: keyOf(index),
        sectionId: section.sectionId,
        originalName: section.name ?? '',
        name: section.name ?? '',
        files: [],
        assets: assets.map((asset) => ({
          assetId: asset.assetId,
          name: asset.originalName,
          url: asset.url,
          isImage: asset.kind === 'Image',
          position: asset.position
        })),
        removed: []
      }
    })
  )

  return {
    templateId,
    templateVersion: detail.templateVersion,
    currentVersionId: detail.currentVersionId,
    version,
    editVersion: listed.editVersion,
    coverAssetId: listed.coverAssetId,
    sections
  }
}

/**
 * SỬA (tại chỗ, không tạo phiên bản mới): metadata → đổi tên / tạo section + tải tệp mới → đặt lại ảnh đại
 * diện nếu ảnh cũ bị bỏ → gỡ tệp đã bỏ → công bố nếu đang là nháp và được yêu cầu. Tệp mới tải TRƯỚC khi gỡ tệp
 * cũ để section không bao giờ trống giữa chừng (BE từ chối gỡ tệp cuối của section đang phục vụ khách).
 */
export async function updateTemplateWithSections(
  target: EditTarget,
  content: TemplateContent,
  sections: readonly FormSection[],
  options: SaveOptions
): Promise<SaveFlowResult> {
  const { templateId } = target
  const versionId = target.version.versionId
  const total = countFiles(sections)
  const coverRemoved = sections.some((section) =>
    section.removed.some((asset) => asset.assetId === target.coverAssetId)
  )
  const state = { editVersion: target.editVersion, coverPending: !target.coverAssetId || coverRemoved, done: 0 }
  options.onProgress?.({ done: 0, total })

  const saved = await saveTemplateVersion(templateId, versionId, state.editVersion, content)
  state.editVersion = chainEditVersion(state.editVersion, saved)

  try {
    for (const section of sections) {
      let sectionId = section.sectionId
      if (!sectionId) {
        const created = await createSection(templateId, versionId, state.editVersion, section.name)
        state.editVersion = chainEditVersion(state.editVersion, created)
        sectionId = created.sectionId
      } else if (section.name !== section.originalName) {
        const renamed = await renameSection(templateId, versionId, sectionId, state.editVersion, section.name)
        state.editVersion = chainEditVersion(state.editVersion, renamed)
      }
      const start = nextPosition([...section.assets, ...section.removed].map((asset) => asset.position))
      await uploadInto({ templateId, versionId, sectionId }, section.files, start, state, total, options.onProgress)
    }

    // Ảnh đại diện cũ bị bỏ mà chưa có ảnh mới thay: lấy ảnh đầu tiên còn lại.
    if (state.coverPending) {
      const keep = sections.flatMap((section) => section.assets).find((asset) => asset.isImage)
      if (keep) {
        const covered = await setVersionCover(templateId, versionId, state.editVersion, keep.assetId)
        state.editVersion = chainEditVersion(state.editVersion, covered)
      }
    }

    for (const asset of sections.flatMap((section) => section.removed)) {
      const detached = await detachTemplateAsset(templateId, versionId, asset.assetId, state.editVersion)
      state.editVersion = chainEditVersion(state.editVersion, detached)
    }
  } catch (reason) {
    throw new InitialContentError(reason, total - state.done)
  }

  if (!options.publish || target.version.isCurrent) return { published: false }
  return tryPublish(templateId, versionId, {
    expectedTemplateVersion: target.templateVersion,
    expectedEditVersion: state.editVersion,
    expectedCurrentVersionId: target.currentVersionId
  })
}

/** Gắn các thay đổi trong form (theo id của bản hiện hành) sang section / tệp tương ứng của bản nháp vừa sao. */
function mapToDraft(
  original: readonly FormSection[],
  edited: readonly FormSection[],
  draft: readonly FormSection[]
): FormSection[] {
  return edited.map((section) => {
    if (!section.sectionId) return section
    const index = original.findIndex((item) => item.sectionId === section.sectionId)
    const source = original[index]
    const twin = draft[index]
    if (!source || !twin) throw new Error('LibraryDraftMismatch')
    const twinOf = (asset: FormAsset): FormAsset => {
      const found = twin.assets[source.assets.findIndex((item) => item.assetId === asset.assetId)]
      if (!found) throw new Error('LibraryDraftMismatch')
      return found
    }
    return {
      ...section,
      sectionId: twin.sectionId,
      originalName: twin.originalName,
      assets: section.assets.map(twinOf),
      removed: section.removed.map(twinOf)
    }
  })
}

/** Bỏ nháp vừa tạo khi phát hành không thành: không để nháp mồ côi tích lại. Lỗi khi dọn thì bỏ qua. */
async function discardDraft(templateId: string, versionId: string) {
  try {
    const detail = await getTemplateVersions(templateId)
    const draft = detail.versions.find((item) => item.versionId === versionId)
    if (draft) await deleteTemplateDraft(templateId, versionId, draft.editVersion)
  } catch {
    // Giữ nguyên: nháp thừa không ảnh hưởng khách.
  }
}

/**
 * LƯU VÀ PHÁT HÀNH PHIÊN BẢN MỚI: sao bản hiện hành thành nháp → áp các chỉnh sửa trong form vào nháp → công bố.
 * Bản cũ không bị sửa: nó chuyển sang lịch sử và thôi hiển thị cho khách; khách đã xem bản cũ phải mở bản mới
 * bằng một lượt mới (BR-LIB-003 khoản 5). Thất bại ở bất kỳ bước nào thì bỏ nháp vừa tạo và ném lỗi — bản hiện
 * hành giữ nguyên, form ở lại để sửa tiếp, không có gì được lưu một nửa.
 */
export async function releaseNewVersion(
  target: EditTarget,
  content: TemplateContent,
  sections: readonly FormSection[],
  keyOf: (index: number) => string,
  onProgress?: (progress: CreateFlowProgress) => void
): Promise<void> {
  const { templateId } = target
  const draft = await createTemplateDraft(templateId, target.templateVersion, target.version.versionId)
  try {
    const draftTarget = await loadEditTarget(templateId, keyOf, draft.versionId)
    const mapped = mapToDraft(target.sections, sections, draftTarget.sections)
    const result = await updateTemplateWithSections(draftTarget, content, mapped, { publish: true, onProgress })
    if (!result.published) throw result.publishError ?? new Error('LibraryPublishFailed')
  } catch (error) {
    await discardDraft(templateId, draft.versionId)
    throw error instanceof InitialContentError ? error.reason : error
  }
}
