/**
 * 微盘 · 教育微盘 · 教学资料浏览卡（3 层视图）
 *
 * 在闭环演示中的角色
 * ----------------------------------------------------
 * 这是"微盘端"的教学资料根入口；与"AI 课堂子 CUI · 资料卡"共享同一份 store
 * （`eduCoursesPersistence`），任何一端的"上传 / 删除 / 创建课程 / 上传大纲"
 * 都会即时同步到另一端。
 *
 * 3 层视图
 * ----------------------------------------------------
 *  L1（root）：教学资料根目录 → 列出当前空间下所有课程文件夹
 *  L2（course）：进入某个课程 → 教学大纲 + 课次目录 + 课程级零散文件
 *  L3（lesson）：进入某个课次 → 文件 tile 网格（5 tab：全部/文档/视频/音频/图片）
 *
 * 三个层级共用：路径面包屑 / 上传区 / ⋯ 操作菜单。
 *
 * 教学大纲特例
 * ----------------------------------------------------
 *  - 课程根级支持「上传教学大纲」按钮（占位卡）
 *  - 上传 → store.uploadCourseOutline() → 立即标记 parsing → 1.5s 后自动建立 N 个课次目录
 *  - 浏览卡订阅 store，看到 outline.parsed 切到 true 后立刻刷新出课次列表
 *
 * Marker 协议
 * ----------------------------------------------------
 * `<<<RENDER_EDU_TEACHING_MATERIALS_BROWSER_CARD>>>:{json}`
 *   payload: { spaceOrgId, spaceScenario? }
 */

import * as React from "react"
import {
  ChevronRight,
  File as FileGenericIcon,
  FileSpreadsheet,
  FileText,
  FileType2,
  FolderArchive,
  FolderOpen,
  Image as ImageIcon,
  Loader2,
  MoreHorizontal,
  Music,
  Plus,
  Sparkles,
  Trash2,
  UploadCloud,
  Video as VideoIcon,
  type LucideIcon,
} from "lucide-react"
import { cn } from "../ui/utils"
import {
  formatBytes,
  inferLessonMaterialFileType,
  isAllowedLessonMaterialFile,
  LESSON_MATERIAL_ACCEPT_ATTR,
  LESSON_MATERIAL_MAX_BYTES,
  type LessonMaterialFileType,
} from "./lessonMaterialsDemo"
import {
  buildWeDiskFileFromBrowserFile,
  deleteFile as storeDeleteFile,
  getCourse,
  listCourses,
  listFiles as storeListFiles,
  subscribeEduCourses,
  uploadCourseOutline,
  uploadFile as storeUploadFile,
  type CourseRecord,
  type SpaceContext,
  type WeDiskFile,
} from "./eduCoursesPersistence"
import { LessonMaterialPreviewModal } from "./LessonMaterialPreviewModal"

/* ============================================================
 * Marker
 * ============================================================ */

export const RENDER_EDU_TEACHING_MATERIALS_BROWSER_CARD_MARKER =
  "<<<RENDER_EDU_TEACHING_MATERIALS_BROWSER_CARD>>>"

export interface EduTeachingMaterialsBrowserMarkerPayload {
  spaceOrgId: string
  spaceScenario?: string
  /** 进入时可选定位到某个课程（如教育卡里"在微盘打开"传递） */
  focusCourseId?: string
  /** 进一步定位到某个课次 */
  focusLessonKey?: string
}

export function buildEduTeachingMaterialsBrowserMarkerContent(
  payload: EduTeachingMaterialsBrowserMarkerPayload,
): string {
  return `${RENDER_EDU_TEACHING_MATERIALS_BROWSER_CARD_MARKER}:${JSON.stringify(payload)}`
}

export function parseEduTeachingMaterialsBrowserMarkerContent(
  content: string,
): EduTeachingMaterialsBrowserMarkerPayload | null {
  if (typeof content !== "string") return null
  if (
    !content.startsWith(`${RENDER_EDU_TEACHING_MATERIALS_BROWSER_CARD_MARKER}:`)
  ) return null
  try {
    const json = content.slice(
      `${RENDER_EDU_TEACHING_MATERIALS_BROWSER_CARD_MARKER}:`.length,
    )
    const parsed = JSON.parse(json) as EduTeachingMaterialsBrowserMarkerPayload
    if (!parsed || typeof parsed.spaceOrgId !== "string") return null
    return parsed
  } catch {
    return null
  }
}

/* ============================================================
 * 文件类型 → icon / tone（与资料卡保持一致）
 * ============================================================ */

const TYPE_ICON: Record<LessonMaterialFileType, LucideIcon> = {
  pdf: FileText,
  doc: FileType2,
  xls: FileSpreadsheet,
  image: ImageIcon,
  video: VideoIcon,
  audio: Music,
  zip: FolderArchive,
  other: FileGenericIcon,
}

const TYPE_TONE: Record<LessonMaterialFileType, string> = {
  pdf: "text-[var(--color-error,#ef4444)]",
  doc: "text-[var(--color-info,#3b82f6)]",
  xls: "text-[var(--color-success,#22c55e)]",
  image: "text-[var(--color-warning,#f59e0b)]",
  video: "text-[var(--color-primary)]",
  audio: "text-[var(--color-purple,#8b5cf6)]",
  zip: "text-text-secondary",
  other: "text-text-secondary",
}

/* ============================================================
 * Tab：按文件类型筛选（lesson 层）
 * ============================================================ */

type FileTabId = "all" | "doc" | "video" | "audio" | "image"

const FILE_TABS: { id: FileTabId; label: string }[] = [
  { id: "all", label: "全部" },
  { id: "doc", label: "文档" },
  { id: "video", label: "视频" },
  { id: "audio", label: "音频" },
  { id: "image", label: "图片" },
]

function fileMatchTab(file: WeDiskFile, tab: FileTabId): boolean {
  if (tab === "all") return true
  if (tab === "doc")
    return (
      file.type === "pdf" ||
      file.type === "doc" ||
      file.type === "xls" ||
      file.type === "zip" ||
      file.type === "other"
    )
  if (tab === "video") return file.type === "video"
  if (tab === "audio") return file.type === "audio"
  if (tab === "image") return file.type === "image"
  return true
}

/* ============================================================
 * 主组件
 * ============================================================ */

type ViewState =
  | { kind: "root" }
  | { kind: "course"; courseId: string }
  | { kind: "lesson"; courseId: string; lessonKey: string }

export interface EduTeachingMaterialsBrowserCardProps {
  payload: EduTeachingMaterialsBrowserMarkerPayload
  /** 卡内文本动作 → 推一条 AI 回执（由父级 push 到当前会话） */
  onPickPrompt?: (prompt: string) => void
}

export function EduTeachingMaterialsBrowserCard({
  payload,
  onPickPrompt,
}: EduTeachingMaterialsBrowserCardProps) {
  const ctx: SpaceContext = React.useMemo(
    () => ({ orgId: payload.spaceOrgId, scenario: payload.spaceScenario }),
    [payload.spaceOrgId, payload.spaceScenario],
  )

  /** 初始 view：依 payload.focus* 选 root / course / lesson */
  const [view, setView] = React.useState<ViewState>(() => {
    if (payload.focusLessonKey && payload.focusCourseId) {
      return {
        kind: "lesson",
        courseId: payload.focusCourseId,
        lessonKey: payload.focusLessonKey,
      }
    }
    if (payload.focusCourseId) {
      return { kind: "course", courseId: payload.focusCourseId }
    }
    return { kind: "root" }
  })

  /** 订阅 store；任何变化触发刷新 */
  const snap = useStoreSnapshot(ctx)
  /** 课程列表（订阅后每次重读，确保创建立即出现） */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const courses = React.useMemo(() => listCourses(ctx), [snap, ctx])

  return (
    <div className="flex w-full max-w-[min(100%,720px)] flex-col">
      <div className="relative flex w-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-border bg-bg shadow-elevation-sm">
        {/* ====== A. 卡头 + 面包屑 ====== */}
        <BrowserBreadcrumb view={view} courses={courses} onNavigate={setView} />

        {/* ====== B. 主体 ====== */}
        {view.kind === "root" ? (
          <RootView
            courses={courses}
            onEnter={(courseId) => setView({ kind: "course", courseId })}
          />
        ) : view.kind === "course" ? (
          <CourseView
            courseId={view.courseId}
            ctx={ctx}
            snap={snap}
            onEnterLesson={(lessonKey) =>
              setView({ kind: "lesson", courseId: view.courseId, lessonKey })
            }
            onBack={() => setView({ kind: "root" })}
            onPickPrompt={onPickPrompt}
          />
        ) : (
          <LessonView
            courseId={view.courseId}
            lessonKey={view.lessonKey}
            ctx={ctx}
            snap={snap}
            onBack={() => setView({ kind: "course", courseId: view.courseId })}
            onPickPrompt={onPickPrompt}
          />
        )}

        {/* ====== C. 卡尾 ====== */}
        <footer className="flex shrink-0 items-center gap-[var(--space-150)] border-t border-border bg-[var(--color-bg-subtle)] px-[var(--space-350)] py-[var(--space-200)]">
          <p className="m-0 text-[length:var(--font-size-xs)] text-text-tertiary">
            存于教育微盘 · 与 AI 课堂子 CUI 资料卡实时同步
          </p>
        </footer>
      </div>
    </div>
  )
}

/* ============================================================
 * 子：面包屑
 * ============================================================ */
function BrowserBreadcrumb({
  view,
  courses,
  onNavigate,
}: {
  view: ViewState
  courses: CourseRecord[]
  onNavigate: (next: ViewState) => void
}) {
  const segments: { label: string; onClick?: () => void }[] = [
    { label: "教学资料", onClick: () => onNavigate({ kind: "root" }) },
  ]
  if (view.kind === "course" || view.kind === "lesson") {
    const c = courses.find((x) => x.id === view.courseId)
    if (c) {
      segments.push({
        label: c.name,
        onClick:
          view.kind === "lesson"
            ? () => onNavigate({ kind: "course", courseId: view.courseId })
            : undefined,
      })
    }
  }
  if (view.kind === "lesson") {
    const c = courses.find((x) => x.id === view.courseId)
    const l = c?.lessons.find((x) => x.lessonKey === view.lessonKey)
    if (l) {
      segments.push({ label: `第 ${l.lessonNumber} 节《${l.title}》` })
    }
  }
  return (
    <header className="flex shrink-0 items-center gap-[var(--space-150)] border-b border-border px-[var(--space-350)] py-[var(--space-300)]">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
        <FolderOpen className="size-[18px]" strokeWidth={1.8} />
      </span>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-[var(--space-100)] text-[length:var(--font-size-sm)] text-text-secondary">
        {segments.map((seg, idx) => (
          <React.Fragment key={`${seg.label}-${idx}`}>
            {idx > 0 ? (
              <ChevronRight
                className="size-3 shrink-0 text-text-tertiary"
                strokeWidth={2}
              />
            ) : null}
            {seg.onClick ? (
              <button
                type="button"
                onClick={seg.onClick}
                className="min-w-0 truncate text-text-secondary transition-colors hover:text-text"
              >
                {seg.label}
              </button>
            ) : (
              <span className="min-w-0 truncate font-[var(--font-weight-semibold)] text-text">
                {seg.label}
              </span>
            )}
          </React.Fragment>
        ))}
      </div>
    </header>
  )
}

/* ============================================================
 * 子：根视图（课程文件夹列表）
 * ============================================================ */
function RootView({
  courses,
  onEnter,
}: {
  courses: CourseRecord[]
  onEnter: (courseId: string) => void
}) {
  return (
    <div className="flex flex-col gap-[var(--space-300)] px-[var(--space-350)] py-[var(--space-300)]">
      <p className="m-0 text-[length:var(--font-size-sm)] text-text-secondary">
        共 {courses.length} 个课程文件夹。点击进入查看课次目录与教学资料。
      </p>
      {courses.length > 0 ? (
        <ul className="m-0 grid grid-cols-1 gap-[var(--space-200)] list-none p-0 sm:grid-cols-2">
          {courses.map((c) => (
            <CourseFolderTile key={c.id} course={c} onEnter={() => onEnter(c.id)} />
          ))}
        </ul>
      ) : (
        <div className="flex w-full flex-col items-start gap-[var(--space-150)] rounded-[var(--radius-md)] border border-dashed border-border px-[var(--space-300)] py-[var(--space-300)]">
          <p className="m-0 text-[length:var(--font-size-sm)] text-text-secondary">
            当前空间下还没有课程文件夹。请先到「教育 → 课程商品」创建课程。
          </p>
        </div>
      )}
    </div>
  )
}

function CourseFolderTile({
  course,
  onEnter,
}: {
  course: CourseRecord
  onEnter: () => void
}) {
  const fileCount = React.useMemo(() => {
    let n = course.rootFiles.length
    for (const l of course.lessons) n += l.files.length
    return n
  }, [course])

  const status = course.outline?.parsed
    ? `${course.lessons.length} 课次 · ${fileCount} 文件`
    : course.outline
      ? "AI 解析教学大纲中…"
      : "尚未上传教学大纲"

  return (
    <li className="list-none">
      <button
        type="button"
        onClick={onEnter}
        className="flex w-full min-w-0 items-start gap-[var(--space-200)] rounded-[var(--radius-md)] border border-border bg-bg px-[var(--space-300)] py-[var(--space-250)] text-left transition-colors hover:border-[var(--color-primary)]/35 hover:bg-bg-secondary/40"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-bg-secondary text-[var(--color-primary)]">
          <FolderOpen className="size-[18px]" strokeWidth={1.8} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-[var(--space-100)]">
          <span className="w-full truncate text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-text">
            {course.name}
          </span>
          <span className="w-full truncate text-[length:var(--font-size-xs)] text-text-tertiary">
            {status}
          </span>
        </div>
        <ChevronRight className="size-4 shrink-0 self-center text-text-tertiary" />
      </button>
    </li>
  )
}

/* ============================================================
 * 子：课程视图（教学大纲 + 课次目录 + 课程级零散文件）
 * ============================================================ */
function CourseView({
  courseId,
  ctx,
  snap,
  onEnterLesson,
  onBack: _onBack,
  onPickPrompt,
}: {
  courseId: string
  ctx: SpaceContext
  snap: string
  onEnterLesson: (lessonKey: string) => void
  onBack: () => void
  onPickPrompt?: (prompt: string) => void
}) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const course = React.useMemo(() => getCourse(ctx, courseId), [snap, ctx, courseId])
  void _onBack

  /** 上传教学大纲 */
  const outlineInputRef = React.useRef<HTMLInputElement>(null)

  /** 课程级零散文件上传 */
  const rootFilesInputRef = React.useRef<HTMLInputElement>(null)

  const handleOutlineUpload = React.useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return
      const f = files[0]!
      if (!isAllowedLessonMaterialFile(f.name)) {
        alert(`不支持的格式：${f.name}\n仅支持 PDF / Word / Excel / 图片 / 视频 / 音频`)
        return
      }
      uploadCourseOutline({
        ctx,
        courseId,
        fileName: f.name,
      })
      onPickPrompt?.(`已上传《${course?.name ?? "该课程"}》教学大纲，AI 正在解析…`)
    },
    [ctx, courseId, course?.name, onPickPrompt],
  )

  const handleRootFilesUpload = React.useCallback(
    (files: FileList | null) => {
      if (!files) return
      for (const f of Array.from(files)) {
        if (!isAllowedLessonMaterialFile(f.name)) {
          alert(`不支持的格式：${f.name}`)
          continue
        }
        if (f.size > LESSON_MATERIAL_MAX_BYTES) {
          alert(`文件过大：${f.name}（>${formatBytes(LESSON_MATERIAL_MAX_BYTES)}）`)
          continue
        }
        const built = buildWeDiskFileFromBrowserFile({
          file: f,
          uploaderName: "你",
          uploaderId: "me",
          uploaderRole: "teacher",
        })
        storeUploadFile({
          ctx,
          courseId,
          lessonKey: null,
          file: built.file,
          previewUrl: built.previewUrl,
        })
      }
    },
    [ctx, courseId],
  )

  const [previewing, setPreviewing] = React.useState<WeDiskFile | null>(null)

  if (!course) {
    return (
      <div className="px-[var(--space-350)] py-[var(--space-400)]">
        <p className="m-0 text-[length:var(--font-size-sm)] text-text-secondary">
          课程不存在或已被删除。请返回上层。
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-[var(--space-400)] px-[var(--space-350)] py-[var(--space-300)]">
      {/* === 教学大纲块 === */}
      <section className="flex flex-col gap-[var(--space-200)]">
        <h4 className="m-0 text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-text">
          教学大纲
        </h4>
        {course.outline ? (
          course.outline.parsed ? (
            <div className="flex w-full items-center gap-[var(--space-200)] rounded-[var(--radius-md)] border border-border bg-bg px-[var(--space-300)] py-[var(--space-250)]">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-bg-secondary text-[var(--color-error,#ef4444)]">
                <FileText className="size-4" strokeWidth={1.8} />
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="w-full truncate text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)] text-text">
                  {course.outline.fileName}
                </span>
                <span className="text-[length:var(--font-size-xs)] text-text-tertiary">
                  AI 解析完成 · 已生成 {course.lessons.length} 个课次目录 ·{" "}
                  {course.outline.uploadedAt}
                </span>
              </div>
              <button
                type="button"
                onClick={() => outlineInputRef.current?.click()}
                className="inline-flex h-7 shrink-0 items-center rounded-[var(--radius-sm)] border border-border bg-bg px-[var(--space-250)] text-[length:var(--font-size-xs)] text-text-secondary transition-colors hover:bg-[var(--black-alpha-11)] hover:text-text"
              >
                替换大纲
              </button>
            </div>
          ) : (
            <div className="flex w-full items-center gap-[var(--space-200)] rounded-[var(--radius-md)] border border-[var(--color-info)]/35 bg-[var(--color-info)]/4 px-[var(--space-300)] py-[var(--space-250)]">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-info)]/10 text-[var(--color-info)]">
                <Loader2 className="size-4 animate-spin" strokeWidth={1.8} />
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="w-full truncate text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)] text-text">
                  {course.outline.fileName}
                </span>
                <span className="text-[length:var(--font-size-xs)] text-[var(--color-info)]">
                  AI 正在解析教学大纲，预计 1-2 秒…
                </span>
              </div>
            </div>
          )
        ) : (
          <div className="flex w-full flex-col items-start gap-[var(--space-200)] rounded-[var(--radius-md)] border border-dashed border-[var(--color-primary)]/45 bg-[var(--color-primary)]/4 px-[var(--space-300)] py-[var(--space-300)]">
            <div className="flex w-full items-center gap-[var(--space-150)]">
              <Sparkles className="size-4 text-[var(--color-primary)]" strokeWidth={1.8} />
              <p className="m-0 text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)] text-text">
                上传教学大纲后，AI 会自动解析并建立课次目录
              </p>
            </div>
            <p className="m-0 text-[length:var(--font-size-xs)] text-text-tertiary">
              支持 PDF / Word / Excel · 解析时间约 1-2 秒
            </p>
            <button
              type="button"
              onClick={() => outlineInputRef.current?.click()}
              className="inline-flex h-9 items-center gap-[var(--space-150)] rounded-[var(--radius-md)] bg-[var(--color-primary)] px-[var(--space-350)] text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-white transition-colors hover:bg-[var(--color-primary)]/90"
            >
              <UploadCloud className="size-3.5" />
              上传教学大纲
            </button>
          </div>
        )}
        <input
          ref={outlineInputRef}
          type="file"
          accept={LESSON_MATERIAL_ACCEPT_ATTR}
          className="hidden"
          onChange={(e) => {
            handleOutlineUpload(e.target.files)
            e.target.value = ""
          }}
        />
      </section>

      {/* === 课次目录 === */}
      <section className="flex flex-col gap-[var(--space-200)]">
        <h4 className="m-0 text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-text">
          课次目录{course.lessons.length > 0 ? `（${course.lessons.length}）` : ""}
        </h4>
        {course.lessons.length > 0 ? (
          <ul className="m-0 grid grid-cols-1 gap-[var(--space-200)] list-none p-0 sm:grid-cols-2">
            {course.lessons.map((l) => (
              <li key={l.lessonKey} className="list-none">
                <button
                  type="button"
                  onClick={() => onEnterLesson(l.lessonKey)}
                  className="flex w-full min-w-0 items-start gap-[var(--space-200)] rounded-[var(--radius-md)] border border-border bg-bg px-[var(--space-300)] py-[var(--space-250)] text-left transition-colors hover:border-[var(--color-primary)]/35 hover:bg-bg-secondary/40"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-bg-secondary text-[var(--color-primary)]">
                    <FolderOpen className="size-[18px]" strokeWidth={1.8} />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-[var(--space-100)]">
                    <span className="w-full truncate text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)] text-text">
                      第 {l.lessonNumber} 节 · {l.title}
                    </span>
                    <span className="w-full truncate text-[length:var(--font-size-xs)] text-text-tertiary">
                      {l.scheduleLabel ? `${l.scheduleLabel} · ` : ""}
                      {l.files.length} 个文件
                    </span>
                  </div>
                  <ChevronRight className="size-4 shrink-0 self-center text-text-tertiary" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="m-0 text-[length:var(--font-size-xs)] text-text-tertiary">
            {course.outline && !course.outline.parsed
              ? "AI 解析完成后会自动列出课次目录。"
              : "上传教学大纲后会自动生成课次目录。"}
          </p>
        )}
      </section>

      {/* === 课程级零散文件 === */}
      <section className="flex flex-col gap-[var(--space-200)]">
        <div className="flex items-center justify-between gap-[var(--space-200)]">
          <h4 className="m-0 text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-text">
            课程级文件{course.rootFiles.length > 0 ? `（${course.rootFiles.length}）` : ""}
          </h4>
          <button
            type="button"
            onClick={() => rootFilesInputRef.current?.click()}
            className="inline-flex h-7 items-center gap-[var(--space-100)] rounded-[var(--radius-sm)] border border-border bg-bg px-[var(--space-250)] text-[length:var(--font-size-xs)] text-text-secondary transition-colors hover:bg-[var(--black-alpha-11)] hover:text-text"
          >
            <Plus className="size-3" /> 上传
          </button>
        </div>
        {course.rootFiles.length > 0 ? (
          <ul className="m-0 grid grid-cols-1 gap-[var(--space-200)] list-none p-0 sm:grid-cols-2">
            {course.rootFiles.map((f) => (
              <FileTile
                key={f.id}
                file={f}
                onPreview={() => setPreviewing(f)}
                onRemove={() =>
                  storeDeleteFile({ ctx, courseId, lessonKey: null, fileId: f.id })
                }
              />
            ))}
          </ul>
        ) : (
          <p className="m-0 text-[length:var(--font-size-xs)] text-text-tertiary">
            课程级零散文件（如全期总结、整学期日程表）可以上传到这里。
          </p>
        )}
        <input
          ref={rootFilesInputRef}
          type="file"
          multiple
          accept={LESSON_MATERIAL_ACCEPT_ATTR}
          className="hidden"
          onChange={(e) => {
            handleRootFilesUpload(e.target.files)
            e.target.value = ""
          }}
        />
      </section>

      <LessonMaterialPreviewModal
        file={previewing}
        onClose={() => setPreviewing(null)}
      />
    </div>
  )
}

/* ============================================================
 * 子：课次视图（文件 tile 网格 + tab + 上传删除）
 * ============================================================ */
function LessonView({
  courseId,
  lessonKey,
  ctx,
  snap,
  onBack: _onBack,
  onPickPrompt: _onPickPrompt,
}: {
  courseId: string
  lessonKey: string
  ctx: SpaceContext
  snap: string
  onBack: () => void
  onPickPrompt?: (prompt: string) => void
}) {
  void _onBack
  void _onPickPrompt
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const files = React.useMemo(
    () => storeListFiles({ ctx, courseId, lessonKey }),
    [snap, ctx, courseId, lessonKey],
  )

  const [activeTab, setActiveTab] = React.useState<FileTabId>("all")

  const visibleFiles = React.useMemo(
    () => files.filter((f) => fileMatchTab(f, activeTab)),
    [files, activeTab],
  )

  const tabCounts = React.useMemo(() => {
    const counts: Record<FileTabId, number> = {
      all: files.length,
      doc: 0,
      video: 0,
      audio: 0,
      image: 0,
    }
    for (const f of files) {
      if (fileMatchTab(f, "doc")) counts.doc += 1
      if (fileMatchTab(f, "video")) counts.video += 1
      if (fileMatchTab(f, "audio")) counts.audio += 1
      if (fileMatchTab(f, "image")) counts.image += 1
    }
    return counts
  }, [files])

  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [previewing, setPreviewing] = React.useState<WeDiskFile | null>(null)

  const handleFiles = React.useCallback(
    (browserFiles: FileList | null) => {
      if (!browserFiles) return
      for (const f of Array.from(browserFiles)) {
        if (!isAllowedLessonMaterialFile(f.name)) {
          alert(`不支持的格式：${f.name}`)
          continue
        }
        if (f.size > LESSON_MATERIAL_MAX_BYTES) {
          alert(`文件过大：${f.name}（>${formatBytes(LESSON_MATERIAL_MAX_BYTES)}）`)
          continue
        }
        const built = buildWeDiskFileFromBrowserFile({
          file: f,
          uploaderName: "你",
          uploaderId: "me",
          uploaderRole: "teacher",
        })
        storeUploadFile({
          ctx,
          courseId,
          lessonKey,
          file: built.file,
          previewUrl: built.previewUrl,
        })
      }
    },
    [ctx, courseId, lessonKey],
  )

  /** 推断文件类型 → debugValue */
  React.useDebugValue(inferLessonMaterialFileType)

  return (
    <div className="flex flex-col">
      {/* Tab */}
      <div className="flex shrink-0 items-center gap-[var(--space-300)] overflow-x-auto border-b border-border px-[var(--space-350)] pt-[var(--space-200)]">
        {FILE_TABS.map((tab) => {
          const active = activeTab === tab.id
          const count = tabCounts[tab.id]
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "relative shrink-0 pb-[var(--space-200)] text-[length:var(--font-size-sm)] transition-colors",
                active
                  ? "font-[var(--font-weight-semibold)] text-text"
                  : "text-text-tertiary hover:text-text-secondary",
              )}
            >
              <span className="inline-flex items-center gap-[2px]">
                {tab.label}
                {count > 0 ? (
                  <span
                    className={cn(
                      "ml-[2px] text-[length:var(--font-size-xs)] tabular-nums",
                      active ? "text-text-secondary" : "text-text-tertiary",
                    )}
                  >
                    ({count})
                  </span>
                ) : null}
              </span>
              {active ? (
                <span
                  aria-hidden
                  className="absolute bottom-0 left-1/2 h-[2px] w-6 -translate-x-1/2 rounded-full bg-[var(--color-primary)]"
                />
              ) : null}
            </button>
          )
        })}
      </div>

      {/* 文件 tile 网格 */}
      <div className="px-[var(--space-350)] py-[var(--space-300)]">
        {visibleFiles.length > 0 ? (
          <ul className="m-0 grid grid-cols-1 gap-[var(--space-200)] list-none p-0 sm:grid-cols-2">
            {visibleFiles.map((f) => (
              <FileTile
                key={f.id}
                file={f}
                onPreview={() => setPreviewing(f)}
                onRemove={() =>
                  storeDeleteFile({ ctx, courseId, lessonKey, fileId: f.id })
                }
              />
            ))}
          </ul>
        ) : (
          <p className="m-0 text-[length:var(--font-size-xs)] text-text-tertiary">
            {activeTab === "all"
              ? "本节课暂无文件，可在下方上传。"
              : "当前类型暂无内容，可切换其他 Tab 或在下方上传。"}
          </p>
        )}
      </div>

      {/* 上传区 */}
      <div className="flex shrink-0 flex-col gap-[var(--space-150)] border-t border-border bg-bg px-[var(--space-350)] py-[var(--space-300)]">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex h-9 items-center justify-center gap-[var(--space-150)] rounded-[var(--radius-sm)] border border-dashed border-[var(--color-primary)]/45 bg-[var(--color-primary)]/4 px-[var(--space-350)] text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)] text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)]/10"
        >
          <UploadCloud className="size-3.5" /> 上传文件到本节
        </button>
        <p className="m-0 text-[length:var(--font-size-xs)] text-text-tertiary">
          支持 PDF / Word / Excel / 图片 / 视频 / 音频 · 单文件 ≤ 200MB
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={LESSON_MATERIAL_ACCEPT_ATTR}
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files)
            e.target.value = ""
          }}
        />
      </div>

      <LessonMaterialPreviewModal
        file={previewing}
        onClose={() => setPreviewing(null)}
      />
    </div>
  )
}

/* ============================================================
 * 子：通用文件 tile（与资料卡保持一致风格）
 * ============================================================ */
function FileTile({
  file,
  onPreview,
  onRemove,
}: {
  file: WeDiskFile
  onPreview: () => void
  onRemove: () => void
}) {
  const Icon = TYPE_ICON[file.type]
  const [moreOpen, setMoreOpen] = React.useState(false)

  return (
    <li className="group relative min-w-0 list-none">
      <button
        type="button"
        onClick={onPreview}
        className="flex w-full min-w-0 items-center gap-[var(--space-200)] rounded-[var(--radius-md)] border border-border bg-bg px-[var(--space-250)] py-[var(--space-200)] text-left transition-colors hover:border-[var(--color-primary)]/35 hover:bg-bg-secondary/40"
      >
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-bg-secondary",
            TYPE_TONE[file.type],
          )}
        >
          <Icon className="size-4" strokeWidth={1.8} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
          <span className="w-full truncate text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)] text-text">
            {file.name}
          </span>
          <span className="flex min-w-0 items-center gap-[var(--space-150)] text-[length:var(--font-size-xs)] text-text-tertiary">
            <span className="shrink-0">{file.sizeText}</span>
            <span className="shrink-0">·</span>
            <span className="shrink-0 truncate">{file.uploaderName}</span>
            <span className="shrink-0">·</span>
            <span className="shrink-0 truncate">{file.uploadedAt}</span>
          </span>
        </div>
        <span aria-hidden className="size-7 shrink-0" />
      </button>

      <div className="absolute right-[var(--space-150)] top-1/2 -translate-y-1/2">
        <button
          type="button"
          aria-label="更多操作"
          onClick={(e) => {
            e.stopPropagation()
            setMoreOpen((v) => !v)
          }}
          className="flex size-7 items-center justify-center rounded-[var(--radius-sm)] text-text-secondary transition-colors hover:bg-[var(--black-alpha-11)] hover:text-text"
        >
          <MoreHorizontal className="size-4" />
        </button>
        {moreOpen ? (
          <div className="absolute right-0 top-full z-20 mt-[var(--space-100)] min-w-[140px] overflow-hidden rounded-[var(--radius-md)] border border-border bg-bg shadow-[0_8px_24px_rgba(15,23,42,0.12)]">
            <button
              type="button"
              onClick={() => {
                onRemove()
                setMoreOpen(false)
              }}
              className="flex w-full items-center gap-[var(--space-150)] px-[var(--space-300)] py-[var(--space-200)] text-left text-[length:var(--font-size-sm)] text-[var(--color-error,#ef4444)] transition-colors hover:bg-[var(--color-error,#ef4444)]/8"
            >
              <Trash2 className="size-3.5 shrink-0" />
              删除文件
            </button>
          </div>
        ) : null}
      </div>
    </li>
  )
}

/* ============================================================
 * 子：useSyncExternalStore 包装（通用 store snapshot）
 * ============================================================ */
function useStoreSnapshot(ctx: SpaceContext): string {
  const subscribe = React.useCallback(
    (l: () => void) => subscribeEduCourses(l),
    [],
  )
  const getServerSnapshot = React.useCallback(() => "", [])
  /** snapshot 用 courses 的 hash 表示：每个课程的 id + outline.parsed + lessons.length + 所有文件总数 */
  return React.useSyncExternalStore(
    subscribe,
    () => {
      const list = listCourses(ctx)
      return list
        .map((c) => {
          let total = c.rootFiles.length
          for (const l of c.lessons) total += l.files.length
          return `${c.id}:${c.outline?.parsed ? "p" : c.outline ? "u" : "n"}:${c.lessons.length}:${total}`
        })
        .join("|")
    },
    getServerSnapshot,
  )
}
