/**
 * 课程子 CUI · 资料卡
 *
 * 数据模型
 * ----------------------------------------------------
 * 完全从 `eduCoursesPersistence`（统一 store）取数。卡片定位 = 该课次微盘目录的轻量视图：
 *
 *   微盘 / 教学资料 / {课程名} / 第 N 节《课次名》/  ← 这就是这张卡的内容来源
 *
 * 与微盘端 `EduTeachingMaterialsBrowserCard` / 备课卡共享同一个 store + pub/sub，
 * 任何一端的"上传 / 删除"立即在另一端反映。
 *
 * 触发链路
 * ----------------------------------------------------
 * 用户在子 CUI 输入框上方点「资料」→ panel 内 `handleRecommendedPrompt` 截获 →
 * push 一条 AI 气泡：
 *   `<<<RENDER_AIC_MATERIAL_CARD>>>:{json}`
 *
 * 关键交互（最新版）
 * ----------------------------------------------------
 *  1) 老师 / 学生 / 家长共用同一张资料卡；按 `viewerRole` 做：
 *     - 可见性过滤：老师仅看见 admin 公共 + 自己上传；学生/家长看见 admin + 老师班级共享 + 自己上传
 *     - 操作收敛：上传 / 删除仅老师可用；删除限「我自己上传的」
 *  2) item 设计：icon · 文件名 · 大小 · 归属者 · 上传时间
 *  3) 视图切换：列表 / 图标 两种浏览模式
 *  4) 上传：「本地上传」+「从教育微盘选择」二选一
 */

import * as React from "react"
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  File as FileGenericIcon,
  FileSpreadsheet,
  FileText,
  FileType2,
  FolderArchive,
  FolderOpen,
  HardDrive,
  Image as ImageIcon,
  LayoutGrid,
  List as ListIcon,
  MoreHorizontal,
  Music,
  Plus,
  Send,
  Share2,
  Trash2,
  UploadCloud,
  Video as VideoIcon,
  X as XIcon,
  type LucideIcon,
} from "lucide-react"
import { createPortal } from "react-dom"
import { ChatPromptButton } from "../chat/ChatPromptButton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu"
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
  deleteMaterialFile as storeDeleteMaterial,
  findCourseAndLessonByLessonKey,
  isFileVisibleToViewer,
  listCourses as storeListCourses,
  listMaterialFiles as storeListMaterials,
  pickWeDiskFileIntoMaterials as storePickIntoMaterials,
  subscribeEduCourses,
  uploadMaterialFile as storeUploadMaterial,
  type CourseRecord,
  type SpaceContext,
  type WeDiskFile,
  type WeDiskUploaderRole,
} from "./eduCoursesPersistence"
import { LessonMaterialPreviewModal } from "./LessonMaterialPreviewModal"

/* ============================================================
 * Marker 协议
 * ============================================================ */

export const RENDER_AIC_MATERIAL_CARD_MARKER = "<<<RENDER_AIC_MATERIAL_CARD>>>"

/**
 * 观看者身份（用于资料卡内的「可见性过滤 / 删除自有判定」）：
 * - `teacher`：仅看到 admin 公共 + 自己上传的；可上传 / 删除自己上传
 * - `student` / `parent`：可看到 admin 公共 + 老师发布给班级的 + 自己上传的；只读
 * - `admin`：全部可见
 */
export type LessonMaterialsViewerRole = "teacher" | "student" | "parent" | "admin"

export interface LessonMaterialsMarkerPayload {
  /** 课次唯一 key（与子 CUI lessonId 同 id） */
  lessonKey: string
  lessonTitle: string
  /** 系列名（卡头第一行） */
  seriesName?: string
  /** 第 N 节 */
  lessonNumber?: number
  /** 系列总节数 */
  totalLessons?: number
  /** outline 是否已结课（透传给后续卡内逻辑） */
  isPast?: boolean
  /** 机构名（卡尾文案） */
  organizationName?: string
  /**
   * 当前空间上下文（必填，用于跨表面同 store 寻址）：
   * - 子 CUI 进入资料卡时，由 panel 从当前 currentOrg + scenario 注入
   */
  spaceOrgId: string
  spaceScenario?: string
  /**
   * 课程 id（可选）：
   * - 当 panel 已经知道当前课次属于哪个课程时直接传入，省一次 store 反查
   * - 不传时，store 会用 lessonKey 反查
   */
  courseId?: string
  /**
   * 观看者身份：由 panel 注入。缺省 `teacher`（向后兼容）。
   * - `viewerId` 用于「这份文件是不是我上传的」判定，默认 `"me"`。
   */
  viewerRole?: LessonMaterialsViewerRole
  viewerId?: string
}

export function buildLessonMaterialsMarkerContent(
  payload: LessonMaterialsMarkerPayload,
): string {
  return `${RENDER_AIC_MATERIAL_CARD_MARKER}:${JSON.stringify(payload)}`
}

export function parseLessonMaterialsMarkerContent(
  content: string,
): LessonMaterialsMarkerPayload | null {
  if (typeof content !== "string") return null
  if (!content.startsWith(`${RENDER_AIC_MATERIAL_CARD_MARKER}:`)) return null
  try {
    const json = content.slice(`${RENDER_AIC_MATERIAL_CARD_MARKER}:`.length)
    const parsed = JSON.parse(json) as LessonMaterialsMarkerPayload
    if (!parsed || typeof parsed.lessonKey !== "string") return null
    if (typeof parsed.lessonTitle !== "string") return null
    if (typeof parsed.spaceOrgId !== "string") return null
    return parsed
  } catch {
    return null
  }
}

/* ============================================================
 * 文件类型 → icon / tone
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
 * Tab：按文件类型筛选
 * ============================================================ */

type LessonMaterialTabId = "all" | "doc" | "video" | "audio" | "image"

const TABS: { id: LessonMaterialTabId; label: string }[] = [
  { id: "all", label: "全部" },
  { id: "doc", label: "文档" },
  { id: "video", label: "视频" },
  { id: "audio", label: "音频" },
  { id: "image", label: "图片" },
]

function fileMatchTab(file: WeDiskFile, tab: LessonMaterialTabId): boolean {
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
 * 视图模式
 * ============================================================ */

type LessonMaterialViewMode = "grid" | "list"

/* ============================================================
 * 主组件
 * ============================================================ */

export interface LessonMaterialsCardProps {
  payload: LessonMaterialsMarkerPayload
  /** 卡内推荐指令 / ⋯ 菜单 → 触发新一轮 AI 回复（由父级把指令 push 到当前会话） */
  onPickPrompt: (prompt: string) => void
}

export function LessonMaterialsCard({
  payload,
  onPickPrompt,
}: LessonMaterialsCardProps) {
  const ctx: SpaceContext = React.useMemo(
    () => ({ orgId: payload.spaceOrgId, scenario: payload.spaceScenario }),
    [payload.spaceOrgId, payload.spaceScenario],
  )

  /** viewer 默认按老师降级（向后兼容旧 payload） */
  const viewer = React.useMemo(
    () => ({
      id: payload.viewerId ?? "me",
      role: (payload.viewerRole ?? "teacher") as LessonMaterialsViewerRole,
    }),
    [payload.viewerId, payload.viewerRole],
  )
  const isTeacher = viewer.role === "teacher" || viewer.role === "admin"

  /** 反查"当前课次属于哪个课程" → 拿到 courseId（可能 store 暂未种入对应课程，则为 null） */
  const located = React.useMemo(() => {
    if (payload.courseId) return { courseId: payload.courseId }
    const found = findCourseAndLessonByLessonKey(ctx, payload.lessonKey)
    return found ? { courseId: found.course.id } : null
  }, [ctx, payload.courseId, payload.lessonKey])

  /** 订阅 store；任何上传 / 删除 / 创建立刻刷新 */
  const allFiles = useSubscribedLessonMaterials(ctx, located?.courseId, payload.lessonKey)

  /** 可见性过滤：核心规则交给 store 工具函数 `isFileVisibleToViewer` */
  const files = React.useMemo(
    () =>
      allFiles.filter((f) =>
        isFileVisibleToViewer(f, {
          id: viewer.id,
          role: viewer.role as WeDiskUploaderRole,
        }),
      ),
    [allFiles, viewer.id, viewer.role],
  )

  /** Tab：默认全部 */
  const [activeTab, setActiveTab] = React.useState<LessonMaterialTabId>("all")
  /** 视图模式：默认 2 列网格（与历史样式保持一致） */
  const [viewMode, setViewMode] = React.useState<LessonMaterialViewMode>("grid")

  const visibleFiles = React.useMemo(
    () => files.filter((f) => fileMatchTab(f, activeTab)),
    [files, activeTab],
  )

  const tabCounts = React.useMemo(() => {
    const counts: Record<LessonMaterialTabId, number> = {
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

  /** 预览 */
  const [previewing, setPreviewing] = React.useState<WeDiskFile | null>(null)

  /** 拖拽态：整张卡作为 drop target（仅老师可拖拽上传） */
  const [isDragOver, setIsDragOver] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleFiles = React.useCallback(
    async (browserFiles: FileList | File[] | null) => {
      if (!browserFiles) return
      if (!isTeacher) return
      if (!located) {
        alert(
          "尚未在教育微盘里建立该课程文件夹。请先在「教育 → 课程商品」里创建该课程，并在微盘里上传教学大纲。",
        )
        return
      }
      const arr = Array.from(browserFiles)
      for (const f of arr) {
        if (!isAllowedLessonMaterialFile(f.name)) {
          alert(`不支持的格式：${f.name}\n仅支持 PDF / Word / Excel / 图片 / 视频 / 音频`)
          continue
        }
        if (f.size > LESSON_MATERIAL_MAX_BYTES) {
          alert(`文件过大：${f.name}（>${formatBytes(LESSON_MATERIAL_MAX_BYTES)}）`)
          continue
        }
        const built = buildWeDiskFileFromBrowserFile({
          file: f,
          uploaderName: "你",
          uploaderId: viewer.id,
          uploaderRole: viewer.role as WeDiskUploaderRole,
        })
        /**
         * 资料卡本地上传 → 写资料库（uploadMaterialFile 内部同步镜像到微盘 files[]）。
         * 镜像走 store 侧统一逻辑，UI 无需感知。
         */
        storeUploadMaterial({
          ctx,
          courseId: located.courseId,
          lessonKey: payload.lessonKey,
          file: built.file,
          previewUrl: built.previewUrl,
        })
      }
    },
    [ctx, isTeacher, located, payload.lessonKey, viewer.id, viewer.role],
  )

  /** 推断文件类型 → infer fallback（保留入口给未来扩展） */
  React.useDebugValue(inferLessonMaterialFileType)

  /** 教育微盘 picker 弹层开关 */
  const [pickerOpen, setPickerOpen] = React.useState(false)

  /**
   * 从教育微盘选择 → 在资料库 clone 一份新 id 副本（sourceFileId 指回原微盘文件）。
   * pickWeDiskFileIntoMaterials 内部处理 blob 复用 + 通知刷新。
   */
  const handleAddFromDisk = React.useCallback(
    (source: WeDiskFile) => {
      if (!isTeacher || !located) return
      storePickIntoMaterials({
        ctx,
        source,
        targetCourseId: located.courseId,
        targetLessonKey: payload.lessonKey,
      })
    },
    [ctx, isTeacher, located, payload.lessonKey],
  )

  /* ---- 卡下推荐指令 ---- */
  const cardChips = React.useMemo(
    () => [
      `把《${payload.lessonTitle}》本节资料发给请假学生`,
      `在微盘打开《${payload.lessonTitle}》本节文件夹`,
    ],
    [payload.lessonTitle],
  )

  /* ---- 卡头标题文案 ---- */
  const headerTitle = React.useMemo(() => {
    return payload.lessonNumber
      ? `第 ${payload.lessonNumber} 节《${payload.lessonTitle}》`
      : `《${payload.lessonTitle}》`
  }, [payload.lessonNumber, payload.lessonTitle])

  return (
    <div className="flex w-full max-w-[min(100%,720px)] flex-col">
      <div
        className={cn(
          "relative flex w-full flex-col rounded-[var(--radius-card)] border border-border bg-bg shadow-elevation-sm transition-colors",
          isDragOver && isTeacher
            ? "border-[var(--color-primary)]/55 bg-[var(--color-primary)]/4"
            : null,
        )}
        onDragOver={
          isTeacher
            ? (e) => {
                e.preventDefault()
                if (!isDragOver) setIsDragOver(true)
              }
            : undefined
        }
        onDragLeave={
          isTeacher
            ? (e) => {
                if (e.currentTarget === e.target) setIsDragOver(false)
              }
            : undefined
        }
        onDrop={
          isTeacher
            ? (e) => {
                e.preventDefault()
                setIsDragOver(false)
                if (e.dataTransfer?.files?.length) {
                  void handleFiles(e.dataTransfer.files)
                }
              }
            : undefined
        }
      >
        {/* 拖拽遮罩（仅老师场景） */}
        {isDragOver && isTeacher ? (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-[var(--radius-card)] border-2 border-dashed border-[var(--color-primary)] bg-[var(--color-primary)]/4">
            <span className="rounded-full bg-bg px-[var(--space-300)] py-[var(--space-150)] text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)] text-[var(--color-primary)] shadow-sm">
              松手即上传到本节资料
            </span>
          </div>
        ) : null}

        {/* ====== A. 卡头：标题 · 计数 · 视图切换 ====== */}
        <header className="flex shrink-0 items-center gap-[var(--space-200)] border-b border-border px-[var(--space-350)] py-[var(--space-300)]">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
            <FolderOpen className="size-[18px]" strokeWidth={1.8} />
          </span>
          <h3 className="m-0 min-w-0 flex-1 truncate text-[length:var(--font-size-md)] font-[var(--font-weight-semibold)] text-text">
            {headerTitle}
          </h3>
          <span className="shrink-0 text-[length:var(--font-size-xs)] text-text-tertiary tabular-nums">
            {files.length} 项
          </span>
          <ViewToggle mode={viewMode} onChange={setViewMode} />
        </header>

        {/* ====== B. Tab 切换：按文件类型筛选 ====== */}
        <div className="flex shrink-0 items-center gap-[var(--space-300)] overflow-x-auto border-b border-border px-[var(--space-350)] pt-[var(--space-200)]">
          {TABS.map((tab) => {
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

        {/* ====== C. 文件列表（按 viewMode 渲染） ====== */}
        <div className="px-[var(--space-350)] py-[var(--space-300)]">
          {visibleFiles.length > 0 ? (
            viewMode === "grid" ? (
              <ul className="m-0 grid grid-cols-1 gap-[var(--space-200)] list-none p-0 sm:grid-cols-2">
                {visibleFiles.map((f) => (
                  <FileTile
                    key={f.id}
                    mode="grid"
                    file={f}
                    isOwn={isOwnFile(f, viewer)}
                    canManage={isTeacher}
                    onPreview={() => setPreviewing(f)}
                    onPickPrompt={onPickPrompt}
                    onRemove={() => {
                      if (!located) return
                      // 仅删资料库副本；微盘镜像（如果存在）保留 —— 两侧独立。
                      storeDeleteMaterial({
                        ctx,
                        courseId: located.courseId,
                        lessonKey: payload.lessonKey,
                        fileId: f.id,
                      })
                    }}
                    ctx={{
                      lessonTitle: payload.lessonTitle,
                      seriesName: payload.seriesName,
                    }}
                  />
                ))}
              </ul>
            ) : (
              <ul className="m-0 flex flex-col gap-[var(--space-100)] list-none p-0">
                {visibleFiles.map((f) => (
                  <FileTile
                    key={f.id}
                    mode="list"
                    file={f}
                    isOwn={isOwnFile(f, viewer)}
                    canManage={isTeacher}
                    onPreview={() => setPreviewing(f)}
                    onPickPrompt={onPickPrompt}
                    onRemove={() => {
                      if (!located) return
                      // 仅删资料库副本；微盘镜像（如果存在）保留 —— 两侧独立。
                      storeDeleteMaterial({
                        ctx,
                        courseId: located.courseId,
                        lessonKey: payload.lessonKey,
                        fileId: f.id,
                      })
                    }}
                    ctx={{
                      lessonTitle: payload.lessonTitle,
                      seriesName: payload.seriesName,
                    }}
                  />
                ))}
              </ul>
            )
          ) : (
            <p className="m-0 text-[length:var(--font-size-xs)] text-text-tertiary">
              {!located
                ? "本节课还没有在微盘里登记，请先在「教育 → 课程商品」创建对应课程并上传教学大纲。"
                : activeTab === "all"
                  ? isTeacher
                    ? "本节暂无资料，可在下方上传或从教育微盘选择已有资料。"
                    : "本节暂无资料，老师上传后会自动同步至此。"
                  : "当前类型暂无内容，可切换其他 Tab。"}
            </p>
          )}
        </div>

        {/* ====== D. 上传区（仅老师可见） ====== */}
        {isTeacher ? (
          <UploadDropArea
            inputRef={fileInputRef}
            onFiles={handleFiles}
            onPickFromDisk={() => setPickerOpen(true)}
          />
        ) : (
          <div className="shrink-0 border-t border-border bg-[var(--color-bg-subtle)] px-[var(--space-350)] py-[var(--space-200)]">
            <p className="m-0 text-[length:var(--font-size-xs)] text-text-tertiary">
              老师上传的课程资料会自动同步给您 · 学生 / 家长仅可预览
            </p>
          </div>
        )}

        {/* ====== E. 卡尾 ====== */}
      </div>

      {/* ====== 卡下推荐指令 ====== */}
      <div className="mt-[var(--space-200)] flex w-full flex-col gap-[var(--space-150)]">
        <span className="text-[length:var(--font-size-xs)] text-text-tertiary">
          下一步可以
        </span>
        <div className="flex w-full flex-wrap gap-[var(--space-200)]">
          {cardChips.map((p) => (
            <ChatPromptButton key={p} type="button" onClick={() => onPickPrompt(p)}>
              {p}
            </ChatPromptButton>
          ))}
        </div>
      </div>

      {/* ====== 预览模态 ====== */}
      <LessonMaterialPreviewModal
        file={previewing}
        onClose={() => setPreviewing(null)}
        // 仅老师有「发学生 / 发同事 / 同步家长群」操作；学生/家长仅预览。
        onSend={
          isTeacher
            ? (file, target) => {
                const targetLabel =
                  target === "students"
                    ? "学生"
                    : target === "colleagues"
                      ? "同年级同学科教师"
                      : "家长群"
                onPickPrompt(
                  `把《${file.name}》发给${targetLabel}（${payload.lessonTitle}）`,
                )
                setPreviewing(null)
              }
            : undefined
        }
      />

      {/* ====== 教育微盘 picker（仅老师 + 课程已登记） ====== */}
      {pickerOpen && isTeacher && located ? (
        <EduDiskPickerModal
          ctx={ctx}
          courseId={located.courseId}
          currentLessonKey={payload.lessonKey}
          viewer={viewer}
          // 资料库里现有所有副本的 wedisk 源 id：覆盖"同 id 镜像"+"已 clone 副本"两种已加入情况。
          pickedSourceIds={
            new Set<string>([
              ...allFiles.map((f) => f.id),
              ...allFiles
                .map((f) => f.sourceFileId)
                .filter((s): s is string => !!s),
            ])
          }
          onClose={() => setPickerOpen(false)}
          onPick={(file) => {
            handleAddFromDisk(file)
            setPickerOpen(false)
          }}
        />
      ) : null}
    </div>
  )
}

/** 我是不是这份文件的上传者 */
function isOwnFile(
  file: WeDiskFile,
  viewer: { id: string; role: LessonMaterialsViewerRole },
): boolean {
  if (!file.uploaderId) return false
  return file.uploaderId === viewer.id
}

/* ============================================================
 * 子：视图切换
 * ============================================================ */
function ViewToggle({
  mode,
  onChange,
}: {
  mode: LessonMaterialViewMode
  onChange: (m: LessonMaterialViewMode) => void
}) {
  return (
    <div
      role="tablist"
      aria-label="视图切换"
      className="flex shrink-0 items-center gap-[2px] rounded-[var(--radius-sm)] border border-border bg-bg p-[2px]"
    >
      <ToggleBtn
        active={mode === "list"}
        onClick={() => onChange("list")}
        icon={ListIcon}
        label="列表视图"
      />
      <ToggleBtn
        active={mode === "grid"}
        onClick={() => onChange("grid")}
        icon={LayoutGrid}
        label="图标视图"
      />
    </div>
  )
}

function ToggleBtn({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: LucideIcon
  label: string
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "flex size-7 items-center justify-center rounded-[var(--radius-sm)] transition-colors",
        active
          ? "bg-bg-secondary text-text"
          : "text-text-tertiary hover:bg-bg-secondary/60 hover:text-text-secondary",
      )}
    >
      <Icon className="size-[14px]" strokeWidth={1.8} />
    </button>
  )
}

/* ============================================================
 * 子：useSyncExternalStore 订阅**资料库**文件列表（资料卡所属空间）
 * ----------------------------------------------------
 * 资料卡只看资料库（lesson.materialFiles），与微盘 lesson.files 互不影响。
 * 老师本地上传 / 从微盘选择 → 资料库刷新；微盘 app 内的上传不会出现在这里。
 * ============================================================ */
function useSubscribedLessonMaterials(
  ctx: SpaceContext,
  courseId: string | undefined,
  lessonKey: string,
): WeDiskFile[] {
  const subscribe = React.useCallback(
    (l: () => void) => subscribeEduCourses(l),
    [],
  )
  const getServerSnapshot = React.useCallback(() => "", [])
  const snap = React.useSyncExternalStore(
    subscribe,
    () => {
      if (!courseId) return `${ctx.orgId}::${lessonKey}::nocourse`
      const list = storeListMaterials({ ctx, courseId, lessonKey })
      return `${ctx.orgId}::${courseId}::${lessonKey}::${list.length}::${list[0]?.id ?? ""}`
    },
    getServerSnapshot,
  )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return React.useMemo(() => {
    if (!courseId) return []
    return storeListMaterials({ ctx, courseId, lessonKey })
  }, [snap, ctx, courseId, lessonKey])
}

/* ============================================================
 * 子：单文件 row / tile —— 支持 list / grid 两种 mode
 * ----------------------------------------------------
 * 字段：[type icon 方块] 文件名 · 大小 · 归属者 · 上传时间
 * 动作（通过 ⋯ 菜单）：
 *  - 发给学生（仅 canManage）
 *  - 发同事（仅 canManage）
 *  - 同步家长群（视频 + canManage）
 *  - 删除文件（仅 canManage 且 isOwn —— 公共内容不允许任何老师误删）
 * ============================================================ */
function FileTile({
  mode,
  file,
  isOwn,
  canManage,
  onPreview,
  onPickPrompt,
  onRemove,
  ctx,
}: {
  mode: LessonMaterialViewMode
  file: WeDiskFile
  isOwn: boolean
  canManage: boolean
  onPreview: () => void
  onPickPrompt: (prompt: string) => void
  onRemove: () => void
  ctx: { lessonTitle: string; seriesName?: string }
}) {
  const Icon = TYPE_ICON[file.type]
  const [moreOpen, setMoreOpen] = React.useState(false)

  /** "归属者"显示：自己上传时优先显示「我」，否则展示上传者姓名 */
  const ownerLabel = isOwn ? `我 · ${file.uploaderName}` : file.uploaderName
  const isPublic =
    file.uploaderRole == null ||
    file.uploaderRole === "admin" ||
    file.uploaderRole === "system"

  return (
    <li
      className="group relative min-w-0 list-none"
      style={{
        /**
         * 菜单打开时把整个 li 抬到 z-30：避免被相邻 file row 的本地 stacking context
         * （`relative` + 有 absolute 子元素，会形成新的 stacking）盖住而出现「菜单被半截截断」的视觉 bug。
         */
        zIndex: moreOpen ? 30 : undefined,
      }}
    >
      <button
        type="button"
        onClick={onPreview}
        className={cn(
          "flex w-full min-w-0 items-center gap-[var(--space-200)] rounded-[var(--radius-md)] border border-border bg-bg text-left transition-colors hover:border-[var(--color-primary)]/35 hover:bg-bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/30",
          mode === "list"
            ? "px-[var(--space-250)] py-[var(--space-200)]"
            : "px-[var(--space-250)] py-[var(--space-250)]",
        )}
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
          <span className="flex min-w-0 items-center gap-[var(--space-150)]">
            <span className="min-w-0 flex-1 truncate text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)] text-text">
              {file.name}
            </span>
            {isOwn ? (
              <OwnershipBadge tone="own">我上传</OwnershipBadge>
            ) : isPublic ? (
              <OwnershipBadge tone="public">公共</OwnershipBadge>
            ) : null}
          </span>
          <span className="flex min-w-0 items-center gap-[var(--space-150)] text-[length:var(--font-size-xs)] text-text-tertiary">
            <span className="shrink-0">{file.sizeText}</span>
            <span className="shrink-0">·</span>
            <span className="shrink-0 truncate">{ownerLabel}</span>
            <span className="shrink-0">·</span>
            <span className="shrink-0 truncate">{file.uploadedAt}</span>
          </span>
        </div>
        {/** 给 ⋯ 按钮预留位置 */}
        {canManage ? <span aria-hidden className="size-7 shrink-0" /> : null}
      </button>

      {/** ⋯ 菜单按钮（绝对定位 · 不与外层 button 嵌套） */}
      {canManage ? (
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
            <FileTileMoreMenu
              file={file}
              isOwn={isOwn}
              ctx={ctx}
              onClose={() => setMoreOpen(false)}
              onPickPrompt={(p) => {
                onPickPrompt(p)
                setMoreOpen(false)
              }}
              onRemove={() => {
                onRemove()
                setMoreOpen(false)
              }}
            />
          ) : null}
        </div>
      ) : null}
    </li>
  )
}

/** 归属徽标：公共 / 我上传，便于教师快速识别 */
function OwnershipBadge({
  tone,
  children,
}: {
  tone: "own" | "public"
  children: React.ReactNode
}) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-[var(--space-150)] py-[1px] text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] leading-none whitespace-nowrap",
        tone === "own"
          ? "bg-[var(--color-primary)]/12 text-[var(--color-primary)]"
          : "bg-bg-secondary text-text-tertiary",
      )}
    >
      {children}
    </span>
  )
}

/* ============================================================
 * 子：tile ⋯ 菜单
 * ============================================================ */
function FileTileMoreMenu({
  file,
  isOwn,
  ctx,
  onClose,
  onPickPrompt,
  onRemove,
}: {
  file: WeDiskFile
  isOwn: boolean
  ctx: { lessonTitle: string; seriesName?: string }
  onClose: () => void
  onPickPrompt: (p: string) => void
  onRemove: () => void
}) {
  const ref = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    window.addEventListener("mousedown", onDoc)
    return () => window.removeEventListener("mousedown", onDoc)
  }, [onClose])

  const items: { icon: LucideIcon; label: string; onClick: () => void; danger?: boolean }[] = [
    {
      icon: Send,
      label: "发送给学生",
      onClick: () => onPickPrompt(`把《${file.name}》发给${ctx.lessonTitle}的学生`),
    },
    {
      icon: Share2,
      label: "发同事",
      onClick: () =>
        onPickPrompt(
          `把《${file.name}》分享给同年级同学科教师（${ctx.lessonTitle}）`,
        ),
    },
  ]

  if (file.type === "video") {
    items.push({
      icon: Send,
      label: "同步家长群",
      onClick: () =>
        onPickPrompt(`把《${file.name}》同步到${ctx.lessonTitle}家长群`),
    })
  }

  /**
   * 删除：仅允许「我自己上传的」文件 —— 公共内容（管理员）不允许任何老师误删，
   * 其它老师的私人文件在可见性过滤阶段就已被剔除。
   */
  if (isOwn) {
    items.push({
      icon: Trash2,
      label: "删除文件",
      onClick: onRemove,
      danger: true,
    })
  }

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full z-20 mt-[var(--space-100)] min-w-[160px] overflow-hidden rounded-[var(--radius-md)] border border-border bg-bg shadow-[0_8px_24px_rgba(15,23,42,0.12)]"
    >
      {items.map(({ icon: Icon, label, onClick, danger }) => (
        <button
          key={label}
          type="button"
          onClick={onClick}
          className={cn(
            "flex w-full items-center gap-[var(--space-150)] px-[var(--space-300)] py-[var(--space-200)] text-left text-[length:var(--font-size-sm)] transition-colors",
            danger
              ? "text-[var(--color-error,#ef4444)] hover:bg-[var(--color-error,#ef4444)]/8"
              : "text-text hover:bg-bg-secondary",
          )}
        >
          <Icon className="size-3.5 shrink-0" />
          {label}
        </button>
      ))}
      {!isOwn ? (
        <div className="border-t border-border px-[var(--space-300)] py-[var(--space-150)] text-[length:var(--font-size-xs)] text-text-tertiary">
          公共内容不可删除
        </div>
      ) : null}
    </div>
  )
}

/* ============================================================
 * 子：上传区（卡底常驻）
 * ----------------------------------------------------
 * 布局：
 *   [文案：支持 PDF / ... · 也可拖入卡片任意位置]      [+ 添加资料 ▾]
 *
 * 「添加资料」收敛了「本地上传 / 从教育微盘选择」两条入口到右下角单一按钮，
 * 弹出菜单二选一即可，避免按钮过多视觉噪声。
 * ============================================================ */
function UploadDropArea({
  inputRef,
  onFiles,
  onPickFromDisk,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>
  onFiles: (files: FileList | File[] | null) => void
  onPickFromDisk: () => void
}) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-[var(--space-200)] border-t border-border bg-bg px-[var(--space-350)] py-[var(--space-300)]">
      <p className="m-0 min-w-0 flex-1 text-[length:var(--font-size-xs)] text-text-tertiary">
        支持 PDF / Word / Excel / 图片 / 视频 / 音频 · 单文件 ≤ 200MB · 也可拖入卡片任意位置
      </p>
      <AddMaterialsMenu
        onPickLocal={() => inputRef.current?.click()}
        onPickFromDisk={onPickFromDisk}
      />
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={LESSON_MATERIAL_ACCEPT_ATTR}
        className="hidden"
        onChange={(e) => {
          const files = e.target.files
          onFiles(files)
          /** 清空 input value，方便同名再次选择 */
          e.target.value = ""
        }}
      />
    </div>
  )
}

/**
 * 「添加资料」收敛按钮 —— 资料卡 / 备课卡共用，外部 export 给备课卡复用。
 *
 * - Trigger：「+ 添加资料 ▾」outline 按钮
 * - Menu：本地上传 / 从教育微盘选择
 */
export function AddMaterialsMenu({
  onPickLocal,
  onPickFromDisk,
  disabled,
  triggerLabel = "添加资料",
}: {
  onPickLocal: () => void
  onPickFromDisk: () => void
  disabled?: boolean
  /** 自定义按钮文案；默认「添加资料」 */
  triggerLabel?: string
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "inline-flex h-8 shrink-0 items-center gap-[var(--space-150)] rounded-[var(--radius-sm)] border px-[var(--space-300)] text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)] transition-colors",
            disabled
              ? "cursor-not-allowed border-border bg-bg-secondary text-text-tertiary"
              : "border-[var(--color-primary)]/45 bg-bg text-[var(--color-primary)] hover:bg-[var(--color-primary)]/8",
          )}
        >
          <Plus className="size-3.5" strokeWidth={2} />
          {triggerLabel}
          <ChevronDown className="size-3.5" strokeWidth={2} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={6} className="min-w-[180px]">
        <DropdownMenuItem onSelect={onPickLocal} className="gap-[var(--space-200)]">
          <UploadCloud className="size-4" strokeWidth={1.8} />
          本地上传
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={onPickFromDisk}
          className="gap-[var(--space-200)]"
        >
          <HardDrive className="size-4" strokeWidth={1.8} />
          从教育微盘选择
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/* ============================================================
 * 子：教育微盘 picker 模态（WeDisk 文件树风格）
 * ----------------------------------------------------
 * 完整复刻当前教育空间下"教育微盘 / 教学资料 / {课程} / {课次}"的层级结构，
 * 让老师能像在 WeDisk app 里一样进入任意目录挑文件：
 *
 *   层级 0：教育微盘（picker scope 的根）
 *   层级 1：教学资料
 *   层级 2：课程 A / 课程 B / ...
 *   层级 3：课程根目录文件 / 第 1 节 / 第 2 节 / ...
 *   层级 4：课次内的文件（微盘 lesson.files）
 *
 * 交互：
 * - 默认打开 = 当前课次（layer 3 下的某个 lesson folder）
 * - 面包屑每段都可点击跳转
 * - 文件夹 row 点击 = 进入；文件 row 点击 = 加入本节资料
 * - "已加入资料"判定：source file id ∈ pickedSourceIds（调用方传入），
 *   覆盖两种情况：1) materials 已 clone 过该 wedisk 文件；2) materials 里有同 id 的镜像
 * ============================================================ */
type PickerLocation =
  | { level: "root" }
  | { level: "teachings" }
  | { level: "course"; courseId: string }
  | { level: "lesson"; courseId: string; lessonKey: string }

export function EduDiskPickerModal({
  ctx,
  courseId,
  currentLessonKey,
  viewer,
  pickedSourceIds,
  onClose,
  onPick,
}: {
  ctx: SpaceContext
  /** 当前所在的课程 id（仅用于初始定位「我在这节」徽标，不再用于判重） */
  courseId: string
  currentLessonKey: string
  viewer: { id: string; role: LessonMaterialsViewerRole }
  /**
   * 已经被「加入本节资料」的 wedisk 源文件 id 集合。
   *
   * 调用方建议传入：
   *   new Set([
   *     ...materialFiles.map(f => f.id),               // 同 id 镜像（本地上传写过）
   *     ...materialFiles.map(f => f.sourceFileId).filter(Boolean), // 通过 pick clone 的副本
   *   ])
   */
  pickedSourceIds: Set<string>
  onClose: () => void
  onPick: (file: WeDiskFile) => void
}) {
  /** 反查"当前课次"对应的课程（默认进入点） */
  const initialCourse = React.useMemo(() => {
    const found = findCourseAndLessonByLessonKey(ctx, currentLessonKey)
    return found?.course ?? null
  }, [ctx, currentLessonKey])

  /** 默认位置：当前课次（找不到 lesson 时回退到课程；再找不到回退到「教学资料」） */
  const [location, setLocation] = React.useState<PickerLocation>(() => {
    if (initialCourse) {
      const lesson = initialCourse.lessons.find((l) => l.lessonKey === currentLessonKey)
      if (lesson) {
        return {
          level: "lesson",
          courseId: initialCourse.id,
          lessonKey: lesson.lessonKey,
        }
      }
      return { level: "course", courseId: initialCourse.id }
    }
    return { level: "teachings" }
  })

  /** 全空间课程列表（用于「教学资料」层级渲染） */
  const allCourses = React.useMemo(() => storeListCourses(ctx), [ctx])

  /** 当前 location 对应的「课程对象」与「课次对象」，用于面包屑 / 标题 */
  const locatedCourse: CourseRecord | null = React.useMemo(() => {
    if (location.level === "course" || location.level === "lesson") {
      return allCourses.find((c) => c.id === location.courseId) ?? null
    }
    return null
  }, [allCourses, location])
  const locatedLesson = React.useMemo(() => {
    if (location.level === "lesson" && locatedCourse) {
      return (
        locatedCourse.lessons.find((l) => l.lessonKey === location.lessonKey) ?? null
      )
    }
    return null
  }, [locatedCourse, location])

  /** 计算当前层级要展示的「文件夹」与「文件」 */
  type FolderEntry = { kind: "folder"; label: string; target: PickerLocation; meta?: string }
  type FileEntry = { kind: "file"; file: WeDiskFile }
  const entries: { folders: FolderEntry[]; files: FileEntry[] } = React.useMemo(() => {
    if (location.level === "root") {
      return {
        folders: [
          {
            kind: "folder",
            label: "教学资料",
            target: { level: "teachings" },
            meta: `${allCourses.length} 门课程`,
          },
        ],
        files: [],
      }
    }
    if (location.level === "teachings") {
      return {
        folders: allCourses.map((c) => ({
          kind: "folder" as const,
          label: c.name,
          target: { level: "course" as const, courseId: c.id },
          meta: `${c.lessons.length} 个课次`,
        })),
        files: [],
      }
    }
    if (location.level === "course" && locatedCourse) {
      const subFolders: FolderEntry[] = locatedCourse.lessons.map((l) => ({
        kind: "folder",
        label: `第 ${l.lessonNumber} 节 · ${l.title}`,
        target: { level: "lesson", courseId: locatedCourse.id, lessonKey: l.lessonKey },
        meta: `${l.files.length} 项`,
      }))
      const visibleRootFiles = locatedCourse.rootFiles.filter((f) =>
        isFileVisibleToViewer(f, {
          id: viewer.id,
          role: viewer.role as WeDiskUploaderRole,
        }),
      )
      return {
        folders: subFolders,
        files: visibleRootFiles.map((f) => ({ kind: "file", file: f })),
      }
    }
    if (location.level === "lesson" && locatedLesson) {
      const visible = locatedLesson.files.filter((f) =>
        isFileVisibleToViewer(f, {
          id: viewer.id,
          role: viewer.role as WeDiskUploaderRole,
        }),
      )
      return {
        folders: [],
        files: visible.map((f) => ({ kind: "file", file: f })),
      }
    }
    return { folders: [], files: [] }
  }, [allCourses, location, locatedCourse, locatedLesson, viewer.id, viewer.role])

  /** 面包屑：每段可点击跳到对应层级 */
  const breadcrumb: { label: string; target: PickerLocation }[] = React.useMemo(() => {
    const segs: { label: string; target: PickerLocation }[] = [
      { label: "教育微盘", target: { level: "root" } },
    ]
    if (location.level === "teachings" || location.level === "course" || location.level === "lesson") {
      segs.push({ label: "教学资料", target: { level: "teachings" } })
    }
    if (locatedCourse && (location.level === "course" || location.level === "lesson")) {
      segs.push({
        label: locatedCourse.name,
        target: { level: "course", courseId: locatedCourse.id },
      })
    }
    if (locatedLesson && location.level === "lesson") {
      segs.push({
        label: `第 ${locatedLesson.lessonNumber} 节 · ${locatedLesson.title}`,
        target: { ...location },
      })
    }
    return segs
  }, [location, locatedCourse, locatedLesson])

  /** 标题（当前文件夹名 + 计数） */
  const currentFolderLabel = React.useMemo(() => {
    if (location.level === "root") return "教育微盘"
    if (location.level === "teachings") return "教学资料"
    if (location.level === "course") return locatedCourse?.name ?? "课程"
    if (location.level === "lesson" && locatedLesson) {
      return `第 ${locatedLesson.lessonNumber} 节 · ${locatedLesson.title}`
    }
    return ""
  }, [location, locatedCourse, locatedLesson])
  const currentFolderCount = entries.folders.length + entries.files.length

  /** 当前文件夹是否就是「我的课次」对应的微盘目录（用于附加徽标说明，不再用于禁用按钮） */
  const isInCurrentLessonFolder =
    location.level === "lesson" &&
    location.courseId === courseId &&
    location.lessonKey === currentLessonKey

  const portalTarget = typeof document !== "undefined" ? document.body : null
  if (!portalTarget) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(15,23,42,0.36)] p-[var(--space-400)]"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[80vh] w-full max-w-[720px] flex-col overflow-hidden rounded-[var(--radius-card)] border border-border bg-bg shadow-[0_20px_60px_rgba(15,23,42,0.18)]"
      >
        {/* header */}
        <header className="flex shrink-0 items-start gap-[var(--space-200)] border-b border-border px-[var(--space-350)] py-[var(--space-300)]">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
            <HardDrive className="size-[18px]" strokeWidth={1.8} />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-[4px]">
            <h4 className="m-0 truncate text-[length:var(--font-size-md)] font-[var(--font-weight-semibold)] text-text">
              从教育微盘选择资料
            </h4>
            <nav
              aria-label="文件路径"
              className="flex min-w-0 flex-wrap items-center gap-[2px] text-[length:var(--font-size-xs)]"
            >
              {breadcrumb.map((seg, i) => {
                const isLast = i === breadcrumb.length - 1
                return (
                  <React.Fragment key={`${seg.label}-${i}`}>
                    {isLast ? (
                      <span className="truncate font-[var(--font-weight-medium)] text-text-secondary">
                        {seg.label}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setLocation(seg.target)}
                        className="truncate rounded-[var(--radius-sm)] px-[2px] text-text-tertiary transition-colors hover:bg-[var(--black-alpha-11)] hover:text-text"
                      >
                        {seg.label}
                      </button>
                    )}
                    {!isLast ? (
                      <span aria-hidden className="text-text-tertiary opacity-60">
                        /
                      </span>
                    ) : null}
                  </React.Fragment>
                )
              })}
            </nav>
          </div>
          <button
            type="button"
            aria-label="关闭"
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-[var(--radius-sm)] text-text-secondary transition-colors hover:bg-[var(--black-alpha-11)] hover:text-text"
          >
            <XIcon className="size-4" />
          </button>
        </header>

        {/* 工具条：上一级 + 当前位置 + 计数 */}
        <div className="flex shrink-0 items-center justify-between gap-[var(--space-200)] border-b border-border px-[var(--space-350)] py-[var(--space-200)]">
          <div className="flex min-w-0 items-center gap-[var(--space-200)]">
            <button
              type="button"
              onClick={() => {
                if (breadcrumb.length <= 1) return
                setLocation(breadcrumb[breadcrumb.length - 2].target)
              }}
              disabled={breadcrumb.length <= 1}
              aria-label="上一级"
              className={cn(
                "inline-flex h-7 shrink-0 items-center gap-[var(--space-100)] rounded-[var(--radius-sm)] border border-border bg-bg px-[var(--space-250)] text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] transition-colors",
                breadcrumb.length <= 1
                  ? "cursor-not-allowed text-text-tertiary"
                  : "text-text hover:bg-[var(--black-alpha-11)]",
              )}
            >
              <ArrowLeft className="size-3" strokeWidth={2} />
              上一级
            </button>
            <span className="min-w-0 truncate text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)] text-text">
              {currentFolderLabel}
            </span>
            {isInCurrentLessonFolder ? (
              <span className="shrink-0 rounded-full bg-[var(--color-primary)]/12 px-[var(--space-200)] py-[1px] text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] text-[var(--color-primary)]">
                本节微盘目录
              </span>
            ) : null}
          </div>
          <span className="shrink-0 text-[length:var(--font-size-xs)] text-text-tertiary tabular-nums">
            {currentFolderCount} 项
          </span>
        </div>

        {/* 内容区：文件夹 + 文件混排 */}
        <div className="min-h-0 flex-1 overflow-y-auto px-[var(--space-350)] py-[var(--space-250)]">
          {entries.folders.length === 0 && entries.files.length === 0 ? (
            <p className="m-0 text-[length:var(--font-size-sm)] text-text-tertiary">
              该文件夹暂无可见内容。
            </p>
          ) : (
            <ul className="m-0 flex flex-col gap-[var(--space-150)] list-none p-0">
              {entries.folders.map((f) => (
                <li key={`f-${f.label}`}>
                  <button
                    type="button"
                    onClick={() => setLocation(f.target)}
                    className="flex w-full items-center gap-[var(--space-200)] rounded-[var(--radius-sm)] border border-border bg-bg px-[var(--space-250)] py-[var(--space-200)] text-left transition-colors hover:border-[var(--color-primary)]/35 hover:bg-bg-secondary/40"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                      <FolderOpen className="size-4" strokeWidth={1.8} />
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
                      <span className="truncate text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)] text-text">
                        {f.label}
                      </span>
                      {f.meta ? (
                        <span className="text-[length:var(--font-size-xs)] text-text-tertiary">
                          {f.meta}
                        </span>
                      ) : null}
                    </div>
                    <ChevronRight
                      className="size-4 shrink-0 text-text-tertiary"
                      strokeWidth={1.8}
                    />
                  </button>
                </li>
              ))}
              {entries.files.map(({ file: f }) => {
                const Icon = TYPE_ICON[f.type]
                /** 资料库已 clone / 镜像过同一份 wedisk 文件 → 灰显「已在本节资料」 */
                const alreadyPicked = pickedSourceIds.has(f.id)
                const disabled = alreadyPicked
                return (
                  <li key={`fi-${f.id}`}>
                    <div className="flex items-center gap-[var(--space-200)] rounded-[var(--radius-sm)] border border-border bg-bg px-[var(--space-250)] py-[var(--space-200)]">
                      <span
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-bg-secondary",
                          TYPE_TONE[f.type],
                        )}
                      >
                        <Icon className="size-4" strokeWidth={1.8} />
                      </span>
                      <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
                        <span className="truncate text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)] text-text">
                          {f.name}
                        </span>
                        <span className="text-[length:var(--font-size-xs)] text-text-tertiary">
                          {f.sizeText} · {f.uploaderName} · {f.uploadedAt}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onPick(f)}
                        disabled={disabled}
                        className={cn(
                          "inline-flex h-8 shrink-0 items-center gap-[var(--space-100)] rounded-[var(--radius-sm)] px-[var(--space-300)] text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] transition-colors",
                          disabled
                            ? "cursor-not-allowed bg-bg-secondary text-text-tertiary"
                            : "bg-[var(--color-primary)] text-[var(--color-primary-foreground,white)] hover:bg-primary-hover",
                        )}
                      >
                        <Plus className="size-3" strokeWidth={2} />
                        {alreadyPicked ? "已在本节资料" : "加入本节资料"}
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* footer */}
        <footer className="flex shrink-0 items-center justify-between gap-[var(--space-200)] border-t border-border bg-[var(--color-bg-subtle)] px-[var(--space-350)] py-[var(--space-250)]">
          <p className="m-0 text-[length:var(--font-size-xs)] text-text-tertiary">
            从教育微盘任意目录挑选资料加入本节 · 微盘与本节资料是两套独立存储，加入后互不影响
          </p>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 items-center gap-[var(--space-150)] rounded-[var(--radius-sm)] border border-border bg-bg px-[var(--space-300)] text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)] text-text transition-colors hover:bg-[var(--black-alpha-11)]"
          >
            完成
          </button>
        </footer>
      </div>
    </div>,
    portalTarget,
  )
}
