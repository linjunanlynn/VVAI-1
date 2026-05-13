/**
 * 课程子 CUI · 备课就绪卡（教师视角）
 *
 * 触发链路
 * ----------------------------------------------------
 * 教师在子 CUI 输入框上方点「备课」chip → panel 内 `handleRecommendedPrompt`
 * 截获 → push 一条 AI 气泡 marker：
 *   `<<<RENDER_TEACHER_LESSON_PREP_READY_CARD>>>:{json}`
 *
 * 卡片定位（最新版）
 * ----------------------------------------------------
 * 老师课前需要走一遍**备课确认清单**：
 *   1) 课程课件预览确认 —— 在卡内预览本节课对应的教育微盘资料，或自定义上传补充资料；
 *   2) 本堂课核心知识点及重难点预览（AI 生成）—— 老师快速复核要点。
 *
 * 每一项必须由老师手动确认；两项全部确认后，底部「备课完成」按钮才可点击。
 * 与"能否进直播间 / 开始上课"完全解耦，仅作为老师课前的待办标记。
 *
 * 设计原则
 * ----------------------------------------------------
 * - 课前提醒系统会自动发，老师不发；本卡**不**负责发通知。
 * - AI 文案语气：偏中性陈述，不引导动作。
 * - 资料预览 / 自定义上传与「资料」卡完全打通同一份 store（教育微盘）。
 */

import * as React from "react"
import {
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  File as FileGenericIcon,
  FileSpreadsheet,
  FileText,
  FileType2,
  FolderArchive,
  Image as ImageIcon,
  Lightbulb,
  Music,
  ScrollText,
  Sparkles,
  Target,
  Video as VideoIcon,
  type LucideIcon,
} from "lucide-react"
import { ChatPromptButton } from "../chat/ChatPromptButton"
import { cn } from "../ui/utils"
import {
  buildWeDiskFileFromBrowserFile,
  findCourseAndLessonByLessonKey,
  listMaterialFiles as storeListMaterials,
  pickWeDiskFileIntoMaterials as storePickIntoMaterials,
  subscribeEduCourses,
  uploadMaterialFile as storeUploadMaterial,
  type SpaceContext,
  type WeDiskFile,
} from "./eduCoursesPersistence"
import {
  formatBytes,
  isAllowedLessonMaterialFile,
  LESSON_MATERIAL_ACCEPT_ATTR,
  LESSON_MATERIAL_MAX_BYTES,
  type LessonMaterialFileType,
} from "./lessonMaterialsDemo"
import { AddMaterialsMenu, EduDiskPickerModal } from "./LessonMaterialsCard"
import { LessonMaterialPreviewModal } from "./LessonMaterialPreviewModal"

/* ============================================================
 * 文件类型 → icon / tone（与「资料」卡视觉一致）
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
 * Marker 协议
 * ============================================================ */

export const RENDER_TEACHER_LESSON_PREP_READY_CARD_MARKER =
  "<<<RENDER_TEACHER_LESSON_PREP_READY_CARD>>>"

/** 头部倒计时分支提示（由 panel 用当前 stage 注入） */
export type TeacherLessonPrepRuntimeHint = "pre" | "imminent" | "live" | "post"

export interface TeacherLessonPrepReadyMarkerPayload {
  /** 课次唯一 key（与子 CUI lessonId 同 id） */
  lessonKey: string
  lessonTitle: string
  /** 系列名（卡头副标题） */
  seriesName?: string
  /** 第 N 节 */
  lessonNumber?: number
  /** 系列总节数 */
  totalLessons?: number
  /** 课程时间字段（用于头部展示，pre 阶段配合 minutesToStart 显示倒计时） */
  weekdayLabel?: string
  startTime?: string
  endTime?: string
  /** 当前阶段：决定头部是否显示倒计时 */
  runtimeHint?: TeacherLessonPrepRuntimeHint
  /** 课前距开课分钟数（仅 runtimeHint = pre / imminent 时有意义） */
  minutesToStart?: number
  /** 当前空间上下文（用于跨表面同 store 寻址，与资料卡同款） */
  spaceOrgId: string
  spaceScenario?: string
  /** 课程 id（可选；不传则由 lessonKey 反查） */
  courseId?: string
}

export function buildTeacherLessonPrepReadyMarkerContent(
  payload: TeacherLessonPrepReadyMarkerPayload,
): string {
  return `${RENDER_TEACHER_LESSON_PREP_READY_CARD_MARKER}:${JSON.stringify(payload)}`
}

export function parseTeacherLessonPrepReadyMarkerContent(
  content: string,
): TeacherLessonPrepReadyMarkerPayload | null {
  if (typeof content !== "string") return null
  if (!content.startsWith(`${RENDER_TEACHER_LESSON_PREP_READY_CARD_MARKER}:`)) return null
  try {
    const json = content.slice(`${RENDER_TEACHER_LESSON_PREP_READY_CARD_MARKER}:`.length)
    const parsed = JSON.parse(json) as TeacherLessonPrepReadyMarkerPayload
    if (!parsed || typeof parsed.lessonKey !== "string") return null
    if (typeof parsed.lessonTitle !== "string") return null
    if (typeof parsed.spaceOrgId !== "string") return null
    return parsed
  } catch {
    return null
  }
}

/* ============================================================
 * 备课任务定义
 * ============================================================ */

type PrepTaskId = "materials" | "key-points"

interface PrepTaskMeta {
  id: PrepTaskId
  title: string
  /** 折叠态副标题（始终展示） */
  hint: string
  /** 是否标记为 AI 生成（标题旁出现 AI tag） */
  aiGenerated?: boolean
}

const PREP_TASKS: PrepTaskMeta[] = [
  {
    id: "materials",
    title: "预览/上传课件资料",
    hint: "拉取本节资料预览，可按需补充上传或从教育微盘选择",
  },
  {
    id: "key-points",
    title: "本堂课核心知识点及重难点预览",
    hint: "AI 已根据课程大纲自动生成，请逐条复核",
    aiGenerated: true,
  },
]

/* ============================================================
 * 主组件
 * ============================================================ */

export interface TeacherLessonPrepReadyCardProps {
  payload: TeacherLessonPrepReadyMarkerPayload
  /** 卡内推荐指令 / 二次提问 → 派发到 panel 的 prompt 通道 */
  onPickPrompt: (prompt: string) => void
  /** 老师按下「备课完成」时回调，由父级 push 一条系统消息（可选） */
  onConfirmReady?: (summary: { lessonTitle: string }) => void
}

export function TeacherLessonPrepReadyCard({
  payload,
  onPickPrompt,
  onConfirmReady,
}: TeacherLessonPrepReadyCardProps) {
  const ctx: SpaceContext = React.useMemo(
    () => ({ orgId: payload.spaceOrgId, scenario: payload.spaceScenario }),
    [payload.spaceOrgId, payload.spaceScenario],
  )

  /** 反查"当前课次属于哪个课程" → 课件操作所需 courseId */
  const located = React.useMemo(() => {
    if (payload.courseId) return { courseId: payload.courseId }
    const found = findCourseAndLessonByLessonKey(ctx, payload.lessonKey)
    return found ? { courseId: found.course.id } : null
  }, [ctx, payload.courseId, payload.lessonKey])

  /** 订阅资料库 store；任何上传 / 删除立刻刷新 */
  const files = useSubscribedLessonFiles(ctx, located?.courseId, payload.lessonKey)
  const totalMaterials = files.length

  /* ---- 任务确认 / 展开状态 ---- */
  const [taskConfirmed, setTaskConfirmed] = React.useState<Record<PrepTaskId, boolean>>({
    materials: false,
    "key-points": false,
  })
  /** 默认展开第一项；点击 header 切换展开 */
  const [expandedId, setExpandedId] = React.useState<PrepTaskId | null>("materials")

  const toggleExpand = React.useCallback((id: PrepTaskId) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }, [])

  const confirmTask = React.useCallback((id: PrepTaskId) => {
    setTaskConfirmed((prev) => {
      if (prev[id]) return prev
      return { ...prev, [id]: true }
    })
    /** 确认完自动顺到下一项；确认最后一项后自动收起展开内容 */
    setExpandedId((prev) => {
      const idx = PREP_TASKS.findIndex((t) => t.id === id)
      const next = PREP_TASKS[idx + 1]
      return next ? next.id : null
    })
  }, [])

  const confirmedCount = React.useMemo(
    () => PREP_TASKS.filter((t) => taskConfirmed[t.id]).length,
    [taskConfirmed],
  )
  const allConfirmed = confirmedCount === PREP_TASKS.length

  /**
   * 课件任务能否确认：
   * 必须已在微盘登记 + 至少 1 份资料（资料库里有内容；本地上传或从微盘选择都算）。
   */
  const canConfirmMaterials = !!located && totalMaterials > 0

  /** "备课完成"按钮：标记为老师的待办完成 */
  const [finished, setFinished] = React.useState(false)
  const handleFinish = React.useCallback(() => {
    if (!allConfirmed || finished) return
    setFinished(true)
    onConfirmReady?.({ lessonTitle: payload.lessonTitle })
  }, [allConfirmed, finished, onConfirmReady, payload.lessonTitle])

  /** 微盘 picker 弹层开关 */
  const [pickerOpen, setPickerOpen] = React.useState(false)

  /** 本地上传补充资料 / 课件（资料卡 / 备课卡共用同一资料库 store API） */
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const handleFiles = React.useCallback(
    async (browserFiles: FileList | File[] | null) => {
      if (!browserFiles) return
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
          uploaderId: "me",
          uploaderRole: "teacher",
        })
        storeUploadMaterial({
          ctx,
          courseId: located.courseId,
          lessonKey: payload.lessonKey,
          file: built.file,
          previewUrl: built.previewUrl,
        })
      }
    },
    [ctx, located, payload.lessonKey],
  )

  /** 触发本地上传：直接点击隐藏 input */
  const triggerLocalUpload = React.useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  /**
   * 从教育微盘选择文件 → 在资料库 clone 一份新 id 副本（sourceFileId 指回源）。
   * pickWeDiskFileIntoMaterials 由 store 处理 blob 复用 + 通知刷新。
   */
  const handlePickFromDisk = React.useCallback(
    (source: WeDiskFile) => {
      if (!located) return
      storePickIntoMaterials({
        ctx,
        source,
        targetCourseId: located.courseId,
        targetLessonKey: payload.lessonKey,
      })
      setPickerOpen(false)
    },
    [ctx, located, payload.lessonKey],
  )

  /** 主课件预览 */
  const [previewing, setPreviewing] = React.useState<WeDiskFile | null>(null)

  /* ---- 头部倒计时文案 ---- */
  const headerSubtitle = React.useMemo(() => buildHeaderSubtitle(payload), [payload])

  /* ---- AI 知识点 / 重难点 demo ---- */
  const keyPoints = React.useMemo(() => buildKeyPointsDemo(payload), [payload])

  /* ---- 卡下推荐指令 ---- */
  const cardChips = React.useMemo(
    () => [
      `把《${payload.lessonTitle}》本节资料发给请假学生`,
      `把这节课的备课要点发我邮箱`,
    ],
    [payload.lessonTitle],
  )

  return (
    <div className="flex w-full max-w-[min(100%,720px)] flex-col">
      <div className="flex w-full flex-col gap-0 overflow-hidden rounded-[var(--radius-card)] border border-border bg-bg shadow-elevation-sm">
        {/* ====== 卡头 ====== */}
        <header className="flex shrink-0 items-start gap-[var(--space-200)] border-b border-border px-[var(--space-350)] py-[var(--space-300)]">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
            <ClipboardCheck className="size-[18px]" strokeWidth={1.8} />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
            <h3 className="m-0 truncate text-[length:var(--font-size-md)] font-[var(--font-weight-semibold)] text-text">
              {payload.lessonNumber
                ? `备课 · 第 ${payload.lessonNumber} 节《${payload.lessonTitle}》`
                : `备课 · 《${payload.lessonTitle}》`}
            </h3>
            <p className="m-0 text-[length:var(--font-size-xs)] text-text-tertiary">
              {headerSubtitle}
            </p>
          </div>
          <span className="shrink-0 self-center rounded-full bg-bg-secondary px-[var(--space-200)] py-[2px] text-[length:var(--font-size-xs)] text-text-tertiary tabular-nums">
            {confirmedCount} / {PREP_TASKS.length}
          </span>
        </header>

        {/* ====== 主区：备课确认清单 ====== */}
        <section className="flex flex-col gap-[var(--space-250)] px-[var(--space-350)] py-[var(--space-300)]">
          <div className="flex items-center justify-between gap-[var(--space-200)]">
            <div className="flex items-center gap-[var(--space-150)]">
              <ScrollText className="size-[14px] text-text-secondary" strokeWidth={1.8} />
              <span className="text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-text">
                备课确认清单
              </span>
              <span className="text-[length:var(--font-size-xs)] text-text-tertiary tabular-nums">
                · 共 {PREP_TASKS.length} 项
              </span>
            </div>
          </div>

          {/* 任务清单 */}
          <ul className="m-0 flex flex-col gap-[var(--space-200)] list-none p-0">
            {PREP_TASKS.map((task, idx) => {
              const confirmed = taskConfirmed[task.id]
              const expanded = expandedId === task.id
              /** 当前进行中：已展开且尚未确认 —— 给出主色高亮 + 左侧色条 */
              const active = expanded && !confirmed
              return (
                <li
                  key={task.id}
                  className={cn(
                    "relative flex flex-col overflow-hidden rounded-[var(--radius-md)] border bg-bg transition-colors",
                    confirmed
                      ? "border-[var(--color-success)]/35 bg-[var(--color-success)]/5"
                      : active
                        ? "border-[var(--color-primary)]/40 bg-[var(--color-primary)]/4 shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-primary)_10%,transparent)]"
                        : "border-border",
                  )}
                >
                  {/* 左侧主色条：仅 active 时出现 */}
                  {active ? (
                    <span
                      aria-hidden
                      className="absolute left-0 top-0 h-full w-[3px] bg-[var(--color-primary)]"
                    />
                  ) : null}
                  {/* row header */}
                  <button
                    type="button"
                    onClick={() => toggleExpand(task.id)}
                    aria-expanded={expanded}
                    className={cn(
                      "flex w-full items-start gap-[var(--space-200)] px-[var(--space-300)] py-[var(--space-250)] text-left transition-colors",
                      active ? "hover:bg-[var(--color-primary)]/8" : "hover:bg-bg-secondary/40",
                    )}
                  >
                    {confirmed ? (
                      <CheckCircle2
                        className="mt-[2px] size-[18px] shrink-0 text-[var(--color-success)]"
                        strokeWidth={2}
                      />
                    ) : (
                      <span
                        aria-hidden
                        className={cn(
                          "mt-[2px] inline-flex size-[18px] shrink-0 items-center justify-center rounded-full border text-[length:var(--font-size-xs)] font-[var(--font-weight-semibold)] tabular-nums",
                          active
                            ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-foreground,white)]"
                            : "border-border bg-bg text-text-tertiary",
                        )}
                      >
                        {idx + 1}
                      </span>
                    )}
                    <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
                      <div className="flex items-center gap-[var(--space-150)]">
                        <span
                          className={cn(
                            "truncate text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)]",
                            active ? "text-[var(--color-primary)]" : "text-text",
                          )}
                        >
                          {task.title}
                        </span>
                        {task.id === "materials" ? (
                          <span className="shrink-0 text-[length:var(--font-size-xs)] text-text-tertiary tabular-nums">
                            · 共 {totalMaterials} 份
                          </span>
                        ) : null}
                        {task.aiGenerated ? (
                          <span className="inline-flex items-center gap-[2px] rounded-full bg-[var(--color-primary)]/10 px-[var(--space-150)] py-[1px] text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] text-[var(--color-primary)]">
                            <Sparkles className="size-[10px]" strokeWidth={2} />
                            AI 生成
                          </span>
                        ) : null}
                        {confirmed ? (
                          <span className="inline-flex items-center gap-[2px] rounded-full bg-[var(--color-success)]/15 px-[var(--space-150)] py-[1px] text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] text-[var(--color-success)]">
                            已确认
                          </span>
                        ) : active ? (
                          <span className="inline-flex items-center gap-[2px] rounded-full bg-[var(--color-primary)]/15 px-[var(--space-150)] py-[1px] text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] text-[var(--color-primary)]">
                            进行中
                          </span>
                        ) : null}
                      </div>
                      <span className="truncate text-[length:var(--font-size-xs)] text-text-tertiary">
                        {task.hint}
                      </span>
                    </div>
                    <ChevronDown
                      aria-hidden
                      className={cn(
                        "mt-[2px] size-[16px] shrink-0 transition-transform",
                        active ? "text-[var(--color-primary)]" : "text-text-tertiary",
                        expanded ? "rotate-180" : "rotate-0",
                      )}
                      strokeWidth={1.8}
                    />
                  </button>

                  {/* row body */}
                  {expanded ? (
                    <div className="flex flex-col gap-[var(--space-250)] border-t border-border bg-bg-secondary/30 px-[var(--space-300)] py-[var(--space-250)]">
                      {task.id === "materials" ? (
                        <MaterialsTaskBody
                          located={!!located}
                          files={files}
                          onPreview={(f) => setPreviewing(f)}
                          onUploadLocal={triggerLocalUpload}
                          onPickFromDisk={() => setPickerOpen(true)}
                        />
                      ) : (
                        <KeyPointsTaskBody points={keyPoints} />
                      )}

                      {/* 单项确认按钮 */}
                      {confirmed ? (
                        <div className="inline-flex h-8 w-full items-center justify-center gap-[var(--space-150)] rounded-full bg-[var(--color-success)]/15 text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] text-[var(--color-success)]">
                          <CheckCircle2 className="size-[14px]" strokeWidth={2} />
                          本项已确认
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => confirmTask(task.id)}
                          disabled={task.id === "materials" ? !canConfirmMaterials : false}
                          className={cn(
                            "inline-flex h-8 w-full items-center justify-center gap-[var(--space-150)] rounded-full text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] transition-colors",
                            (task.id === "materials" ? canConfirmMaterials : true)
                              ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground,white)] hover:bg-primary-hover"
                              : "bg-bg-secondary text-text-tertiary cursor-not-allowed",
                          )}
                        >
                          {task.id === "materials" && !canConfirmMaterials
                            ? "请先上传或同步至少 1 份本节资料"
                            : "确认本项"}
                        </button>
                      )}
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ul>

          {/* 隐藏的上传 input（共享 ref，由 materials body 触发） */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={LESSON_MATERIAL_ACCEPT_ATTR}
            className="hidden"
            onChange={(e) => {
              const fs = e.target.files
              void handleFiles(fs)
              e.target.value = ""
            }}
          />

          {/* ====== 备课完成 ====== */}
          <button
            type="button"
            onClick={handleFinish}
            disabled={!allConfirmed || finished}
            className={cn(
              "mt-[var(--space-100)] inline-flex h-9 w-full items-center justify-center gap-[var(--space-150)] rounded-full text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)] transition-colors",
              finished
                ? "bg-[var(--color-success)]/15 text-[var(--color-success)] cursor-default"
                : allConfirmed
                  ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground,white)] hover:bg-primary-hover"
                  : "bg-bg-secondary text-text-tertiary cursor-not-allowed",
            )}
          >
            {finished ? (
              <>
                <CheckCircle2 className="size-[14px]" strokeWidth={2} />
                已标记备课完成
              </>
            ) : allConfirmed ? (
              "备课完成"
            ) : (
              `还有 ${PREP_TASKS.length - confirmedCount} 项未确认`
            )}
          </button>
        </section>
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

      {/* ====== 预览模态（复用资料卡同款） ====== */}
      <LessonMaterialPreviewModal
        file={previewing}
        onClose={() => setPreviewing(null)}
        onSend={(file, target) => {
          const targetLabel =
            target === "students"
              ? "学生"
              : target === "colleagues"
                ? "同年级同学科教师"
                : "家长群"
          onPickPrompt(`把《${file.name}》发给${targetLabel}（${payload.lessonTitle}）`)
          setPreviewing(null)
        }}
      />

      {/* ====== 教育微盘 picker（与资料卡共用同一组件 / 同一资料库 store） ====== */}
      {pickerOpen && located ? (
        <EduDiskPickerModal
          ctx={ctx}
          courseId={located.courseId}
          currentLessonKey={payload.lessonKey}
          viewer={{ id: "me", role: "teacher" }}
          /** 资料库里已 clone / 镜像过的源 id 集合 —— 判 picker 端"已加入本节资料" */
          pickedSourceIds={
            new Set<string>([
              ...files.map((f) => f.id),
              ...files
                .map((f) => f.sourceFileId)
                .filter((s): s is string => !!s),
            ])
          }
          onClose={() => setPickerOpen(false)}
          onPick={handlePickFromDisk}
        />
      ) : null}
    </div>
  )
}

/* ============================================================
 * 子组件：任务 1 · 预览/上传课件资料（统一文件区 + 底部一组操作）
 * ----------------------------------------------------
 * 不再区分「本节课件」与「其他课程资料」：直接拉本节资料库内容做 grid 展示，
 * 老师按需追加（本地上传 / 从教育微盘选择）。
 *
 * 空态：占位提示 + 同样的两键操作（统一在底部一行）。
 * ============================================================ */
function MaterialsTaskBody({
  located,
  files,
  onPreview,
  onUploadLocal,
  onPickFromDisk,
}: {
  located: boolean
  files: WeDiskFile[]
  onPreview: (f: WeDiskFile) => void
  onUploadLocal: () => void
  onPickFromDisk: () => void
}) {
  return (
    <div className="flex flex-col gap-[var(--space-250)]">
      {/* ===== 文件区：grid 或空态 ===== */}
      {files.length > 0 ? (
        <ul className="m-0 grid grid-cols-1 gap-[var(--space-200)] list-none p-0 sm:grid-cols-2">
          {files.map((f) => (
            <PrepMaterialTile key={f.id} file={f} onPreview={() => onPreview(f)} />
          ))}
        </ul>
      ) : (
        <p className="m-0 rounded-[var(--radius-sm)] border border-dashed border-border bg-bg px-[var(--space-250)] py-[var(--space-300)] text-center text-[length:var(--font-size-xs)] text-text-tertiary">
          {located
            ? "本节暂无资料，可在下方上传或从教育微盘选择已有资料。"
            : "本节课还未在微盘里登记，请先在「教育 → 课程商品」创建对应课程并上传教学大纲。"}
        </p>
      )}

      {/* ===== 底部统一操作区：收敛到右下角的「添加资料 ▾」 ===== */}
      <div className="flex items-center justify-end">
        <AddMaterialsMenu
          onPickLocal={onUploadLocal}
          onPickFromDisk={onPickFromDisk}
          disabled={!located}
        />
      </div>
    </div>
  )
}

/** 备课卡的单文件 tile：视觉对齐资料卡 FileTile（不含 ⋯ 菜单，仅预览） */
function PrepMaterialTile({
  file,
  onPreview,
}: {
  file: WeDiskFile
  onPreview: () => void
}) {
  const Icon = TYPE_ICON[file.type]
  return (
    <li className="min-w-0 list-none">
      <button
        type="button"
        onClick={onPreview}
        className="flex w-full min-w-0 items-center gap-[var(--space-200)] rounded-[var(--radius-md)] border border-border bg-bg px-[var(--space-250)] py-[var(--space-200)] text-left transition-colors hover:border-[var(--color-primary)]/35 hover:bg-bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/30"
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
      </button>
    </li>
  )
}

/* ============================================================
 * 子组件：任务 2 · AI 生成的核心知识点 / 重难点预览
 * ============================================================ */
interface LessonKeyPointsDemo {
  knowledge: string[]
  highlights: { kind: "key" | "hard" | "trap"; text: string }[]
}

function KeyPointsTaskBody({ points }: { points: LessonKeyPointsDemo }) {
  return (
    <div className="flex flex-col gap-[var(--space-250)]">
      {/* 核心知识点 */}
      <div className="flex flex-col gap-[var(--space-150)] rounded-[var(--radius-sm)] border border-border bg-bg p-[var(--space-250)]">
        <div className="flex items-center gap-[var(--space-150)]">
          <Target className="size-[14px] text-[var(--color-primary)]" strokeWidth={1.8} />
          <span className="text-[length:var(--font-size-xs)] font-[var(--font-weight-semibold)] text-text">
            核心知识点
          </span>
        </div>
        <ol className="m-0 flex flex-col gap-[var(--space-100)] list-none p-0">
          {points.knowledge.map((kp, i) => (
            <li
              key={i}
              className="flex items-start gap-[var(--space-200)] text-[length:var(--font-size-xs)] leading-snug text-text-secondary"
            >
              <span className="inline-flex size-[18px] shrink-0 items-center justify-center rounded-full bg-bg-secondary text-[length:var(--font-size-xs)] font-[var(--font-weight-semibold)] text-text-tertiary tabular-nums">
                {i + 1}
              </span>
              <span className="flex-1">{kp}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* 重难点 / 易错点 */}
      <div className="flex flex-col gap-[var(--space-150)] rounded-[var(--radius-sm)] border border-border bg-bg p-[var(--space-250)]">
        <div className="flex items-center gap-[var(--space-150)]">
          <Lightbulb className="size-[14px] text-[var(--color-warning)]" strokeWidth={1.8} />
          <span className="text-[length:var(--font-size-xs)] font-[var(--font-weight-semibold)] text-text">
            重难点 · 易错提示
          </span>
        </div>
        <ul className="m-0 flex flex-col gap-[var(--space-100)] list-none p-0">
          {points.highlights.map((h, i) => {
            const meta = HIGHLIGHT_META[h.kind]
            return (
              <li
                key={i}
                className="flex items-start gap-[var(--space-200)] text-[length:var(--font-size-xs)] leading-snug text-text-secondary"
              >
                <span
                  className={cn(
                    "shrink-0 rounded-full px-[var(--space-150)] py-[1px] text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] leading-none whitespace-nowrap",
                    meta.chipClass,
                  )}
                >
                  {meta.label}
                </span>
                <span className="flex-1">{h.text}</span>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

const HIGHLIGHT_META: Record<
  LessonKeyPointsDemo["highlights"][number]["kind"],
  { label: string; chipClass: string }
> = {
  key: {
    label: "重点",
    chipClass:
      "bg-[var(--color-primary)]/12 text-[var(--color-primary)] border border-[var(--color-primary)]/25",
  },
  hard: {
    label: "难点",
    chipClass:
      "bg-[var(--color-warning)]/12 text-[var(--color-warning)] border border-[var(--color-warning)]/30",
  },
  trap: {
    label: "易错",
    chipClass:
      "bg-[var(--color-info)]/12 text-[var(--color-info)] border border-[var(--color-info)]/30",
  },
}

/* ============================================================
 * 子：useSyncExternalStore 订阅本节**资料库**文件（与资料卡共用同一份存储）
 * ----------------------------------------------------
 * 备课卡看到的"本节课件 / 其他课程资料"和资料卡完全是同一份数据；
 * 与教育微盘 lesson.files 互不影响。
 * ============================================================ */
function useSubscribedLessonFiles(
  ctx: SpaceContext,
  courseId: string | undefined,
  lessonKey: string,
): WeDiskFile[] {
  const subscribe = React.useCallback((l: () => void) => subscribeEduCourses(l), [])
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
 * 文案 / Mock 生成
 * ============================================================ */

function buildHeaderSubtitle(payload: TeacherLessonPrepReadyMarkerPayload): string {
  const timeBits: string[] = []
  if (payload.weekdayLabel) timeBits.push(payload.weekdayLabel)
  if (payload.startTime && payload.endTime) {
    timeBits.push(`${payload.startTime}-${payload.endTime}`)
  } else if (payload.startTime) {
    timeBits.push(payload.startTime)
  }
  const timeStr = timeBits.join(" · ")

  const hint = payload.runtimeHint
  if (hint === "pre" || hint === "imminent") {
    const m = payload.minutesToStart
    if (typeof m === "number" && m > 0) {
      return [timeStr, `距开课还有 ${m} 分钟`].filter(Boolean).join(" · ")
    }
    return [timeStr, "课前准备中"].filter(Boolean).join(" · ")
  }
  if (hint === "live") return [timeStr, "已上课中"].filter(Boolean).join(" · ")
  if (hint === "post") return [timeStr, "本节已结束"].filter(Boolean).join(" · ")
  return timeStr || "课前准备中"
}

/**
 * AI 重难点 demo 数据生成
 * ----------------------------------------------------
 * 真实场景下应由后端 LLM 基于本节大纲 + 上节回顾输出；
 * 当前 demo 直接用课节标题做轻量模板渲染，保证语气中性、信息有用。
 */
function buildKeyPointsDemo(
  payload: TeacherLessonPrepReadyMarkerPayload,
): LessonKeyPointsDemo {
  const title = payload.lessonTitle || "本节"
  return {
    knowledge: [
      `本节主线：围绕《${title}》的核心定义、原理与适用条件展开`,
      `关键结论：本节落到 1 条主公式 / 主结论 + 2 个推论的运用`,
      `承接关系：在上一节基础上对核心概念做"应用化"延伸`,
      `典型题型：基础辨析、综合计算、变式应用三档配套例题`,
      `课堂节奏：建议 15min 引入 → 30min 推导 → 30min 例题 → 15min 练习`,
    ],
    highlights: [
      {
        kind: "key",
        text: `《${title}》核心定义 / 公式的成立条件与使用范围`,
      },
      {
        kind: "hard",
        text: "多变量 / 多步骤推理情境下，学生需要识别条件并完成正确分解",
      },
      {
        kind: "trap",
        text: "单位换算、矢量方向、特殊边界（取等号）是高频失分点",
      },
    ],
  }
}
