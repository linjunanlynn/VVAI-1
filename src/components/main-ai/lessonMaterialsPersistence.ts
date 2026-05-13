/**
 * 课程子 CUI · 资料卡 · 教师上传持久层
 *
 * 设计动机
 * ----------------------------------------------------
 * - fixture（`lessonMaterialsDemo`）只承载"AI 已归档 / AI 已生成 / 同事共享"等
 *   不可编辑来源；教师手动上传的「我的上传」由本模块负责。
 * - 真实接入云盘前，demo 用 sessionStorage + in-memory store 模拟"上传到云盘"，
 *   保证：(a) 同会话内多次进入资料卡看到相同清单；(b) 切到其它子 CUI 再回来不丢；
 *   (c) 浏览器刷新后元数据仍在（blob preview URL 失效，UI 自然降级到占位）。
 *
 * 边界
 * ----------------------------------------------------
 * - key = `${role}::${lessonKey}`（不同身份的"我的上传"互相隔离）
 * - 仅持久化元数据；blob URL 是会话内对象 URL（`URL.createObjectURL`），
 *   保留在 in-memory map 里，刷新即失效，回放/预览时改用 placeholder。
 *
 * Pub/Sub
 * ----------------------------------------------------
 * 暴露 subscribe + getSnapshot 给 React useSyncExternalStore，
 * 资料卡内任意一次上传 / 删除都触发 cards 重新渲染。
 */

import {
  type LessonMaterialFile,
  type LessonMaterialGroup,
  type LessonMaterialSource,
  type LessonMaterialFileType,
} from "./lessonMaterialsDemo"
import type { EduLessonAttendingRole } from "./homeScenarioLayout"

const STORAGE_PREFIX = "vvai.aiClassroom.materials.uploads.v1"

/* ============================================================
 * Pub/Sub
 * ============================================================ */

type Listener = () => void
const listeners = new Set<Listener>()

function notify() {
  for (const l of Array.from(listeners)) {
    try {
      l()
    } catch {
      /* noop */
    }
  }
}

export function subscribeLessonMaterials(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/* ============================================================
 * Storage 层
 * ----------------------------------------------------
 * 序列化时去掉 previewUrl（blob:），反序列化后 previewUrl 字段为空，
 * 由 UI 在缺失 previewUrl 时自动降级到"占位预览"。
 * ============================================================ */

interface PersistableUpload {
  id: string
  name: string
  type: LessonMaterialFileType
  sizeText: string
  group: LessonMaterialGroup
  source: LessonMaterialSource
  uploadedAt: string
  uploaderName?: string
}

function storageKey(role: EduLessonAttendingRole, lessonKey: string): string {
  return `${STORAGE_PREFIX}::${role}::${lessonKey}`
}

function safeStorage(): Storage | null {
  if (typeof window === "undefined") return null
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

function readPersisted(role: EduLessonAttendingRole, lessonKey: string): PersistableUpload[] {
  const s = safeStorage()
  if (!s) return []
  try {
    const raw = s.getItem(storageKey(role, lessonKey))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (it): it is PersistableUpload =>
        it &&
        typeof it === "object" &&
        typeof it.id === "string" &&
        typeof it.name === "string",
    )
  } catch {
    return []
  }
}

function writePersisted(
  role: EduLessonAttendingRole,
  lessonKey: string,
  items: PersistableUpload[],
) {
  const s = safeStorage()
  if (!s) return
  try {
    if (items.length === 0) {
      s.removeItem(storageKey(role, lessonKey))
    } else {
      s.setItem(storageKey(role, lessonKey), JSON.stringify(items))
    }
  } catch {
    /* noop */
  }
}

/* ============================================================
 * In-memory：blob URL 临时挂载层（不持久）
 * ============================================================ */

/** key = upload id */
const blobUrlMap = new Map<string, { previewUrl?: string; videoPosterUrl?: string }>()

/* ============================================================
 * 对外 API
 * ============================================================ */

/**
 * 拉取当前 (role, lessonKey) 下的全部"我的上传"清单（合并 storage 元数据 + in-memory blob URL）。
 * 顺序：最新上传在前。
 */
export function getLessonMaterialUploads(
  role: EduLessonAttendingRole,
  lessonKey: string,
): LessonMaterialFile[] {
  const persisted = readPersisted(role, lessonKey)
  return persisted.map((it) => {
    const blob = blobUrlMap.get(it.id)
    return {
      ...it,
      previewUrl: blob?.previewUrl,
      videoPosterUrl: blob?.videoPosterUrl,
    }
  })
}

/**
 * 追加一个上传记录（最新在前）。
 *
 * @param previewUrl 可选 object URL（图片 / 视频 / PDF），用于会话内预览
 */
export function addLessonMaterialUpload(input: {
  role: EduLessonAttendingRole
  lessonKey: string
  file: LessonMaterialFile
  previewUrl?: string
  videoPosterUrl?: string
}): void {
  const persistable: PersistableUpload = {
    id: input.file.id,
    name: input.file.name,
    type: input.file.type,
    sizeText: input.file.sizeText,
    group: input.file.group,
    source: input.file.source,
    uploadedAt: input.file.uploadedAt,
    uploaderName: input.file.uploaderName,
  }
  if (input.previewUrl || input.videoPosterUrl) {
    blobUrlMap.set(input.file.id, {
      previewUrl: input.previewUrl,
      videoPosterUrl: input.videoPosterUrl,
    })
  }
  const next = [persistable, ...readPersisted(input.role, input.lessonKey)]
  writePersisted(input.role, input.lessonKey, next)
  notify()
}

/** 删除单个上传（同时回收对应 blob URL，避免内存泄漏） */
export function removeLessonMaterialUpload(input: {
  role: EduLessonAttendingRole
  lessonKey: string
  id: string
}): void {
  const next = readPersisted(input.role, input.lessonKey).filter((it) => it.id !== input.id)
  writePersisted(input.role, input.lessonKey, next)
  const blob = blobUrlMap.get(input.id)
  if (blob?.previewUrl?.startsWith("blob:")) {
    try {
      URL.revokeObjectURL(blob.previewUrl)
    } catch {
      /* noop */
    }
  }
  blobUrlMap.delete(input.id)
  notify()
}
