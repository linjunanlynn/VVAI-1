/**
 * 教学管理 · 资料 / 考勤 / 作业 / 风采 列表卡（4 角色共用，按 kind 分支）
 *
 * 出现位置
 * --------------------------------------------------
 * 教育主对话内：左侧《主导航栏》→ 教育 → 二级「教学管理」→ 三级「资料 / 考勤 / 作业 / 点评风采（学/家长侧称报告风采）」
 *
 * 与 EduCourseFulfillmentCard 边界
 * --------------------------------------------------
 * 履约卡每行带 11 个操作图标，是「按课次维度的统一操作面板」；
 * 本卡按 kind 单维聚焦：每行直接展示该 kind 的业务摘要，行内不再让用户挑 11 个按钮。
 * 行点击 → 系列子 CUI 自动定位到该课次并 push 对应业务子卡（命令复用履约卡同款映射）。
 *
 * 不变量
 * --------------------------------------------------
 * - 头部筛选与履约卡视觉对齐（日期带 + 老师/科目/状态 chip + 搜索）
 * - 行点击与"+ 行内细颗粒操作"互斥：行内操作 stopPropagation，避免误触跳子 CUI
 * - 数据源单一事实：
 *     · 资料 → eduCoursesPersistence.materialFiles
 *     · 考勤 → lessonOperationStore
 *     · 风采 → lessonReviewStore
 *     · 作业 → 暂用 mock 占位（与子 CUI 现有 `tc-question` / `ta-asgmt` 卡共存）
 */

import * as React from "react"
import {
  Calendar as CalendarIcon,
  CalendarCheck,
  CalendarOff,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Circle,
  ClipboardCheck,
  FileImage,
  FileText,
  Heart,
  MessageSquare,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  Upload,
  Users,
  Video,
  type LucideIcon,
} from "lucide-react"
import { cn } from "../ui/utils"
import {
  buildWeDiskFileFromBrowserFile,
  deleteMaterialFile as storeDeleteMaterial,
  listScheduleOccurrencesInRange,
  scheduleColorToHsl,
  subscribeEduCourses,
  uploadMaterialFile as storeUploadMaterial,
  type CourseRecord,
  type ScheduleOccurrence,
  type ScheduleRecord,
  type SpaceContext,
  type WeDiskFile,
} from "./eduCoursesPersistence"
import {
  isAllowedLessonMaterialFile,
  LESSON_MATERIAL_ACCEPT_ATTR,
  LESSON_MATERIAL_MAX_BYTES,
} from "./lessonMaterialsDemo"
import {
  markAllStudentsSigned,
  markAllStudentsUnsigned,
  markStudentSigned,
  markStudentUnsigned,
  useLessonOperationSnapshot,
  type LessonStudentAttendance,
} from "./lessonOperationStore"
import {
  setLessonReviewMeta,
  useLessonReviewSnapshot,
  type LessonReviewAsset,
  type LessonReviewSnapshot,
  type LessonStudentReport,
} from "./lessonReviewStore"
import { SocialFeedCard } from "./LessonReviewCard"
import {
  deriveGradingStats,
  deriveSubmissionStatus,
  getSelfStudentIdForRole,
  useLessonHomeworkSnapshot,
  type LessonHomework,
} from "./lessonHomeworkStore"
import type { EduSceneRole } from "./homeScenarioLayout"
import {
  getLessonOperationCardTitle,
  type LessonOperationListCardKind,
} from "./lessonOperationListCardRegistry"

/* ============================================================
 * 对外类型
 * ============================================================ */

export interface LessonOperationOpenHint {
  lessonNumber?: number
  /** "资料" | "签到" | "作业" | "风采点评" */
  actionLabel: string
  /**
   * 该 occurrence 在点击瞬间的真实状态（按 Date.now() vs occurrence 时间算）。
   * 父级负责把全局 `educationStage` 同步到匹配值（completed→post / in→in / soon|pending→pre），
   * 与 EduCourseFulfillmentCard 同款机制：保证"卡片状态 ↔ 子 CUI 状态 / 欢迎语"完全一致。
   */
  runtimeStatus?: FulfillmentStatus
}

export interface LessonOperationListCardProps {
  role: EduSceneRole
  kind: LessonOperationListCardKind
  ctx: SpaceContext
  /** 行点击：跳到对应系列课子 CUI 并打开对应 kind 的子卡 */
  onOpenSeries: (seriesId: string, hint: LessonOperationOpenHint) => void
}

/* ============================================================
 * 共享视觉常量
 * ============================================================ */

const WEEKDAY_LABELS_MON_FIRST = [
  "周一",
  "周二",
  "周三",
  "周四",
  "周五",
  "周六",
  "周日",
] as const

/** 课次实时状态（与 EduCourseFulfillmentCard 同语义；用于跨表面状态对齐） */
export type FulfillmentStatus = "completed" | "in" | "soon" | "pending"

const FULFILLMENT_STATUS_BADGE: Record<
  FulfillmentStatus,
  { label: string; toneCls: string; pulse?: boolean }
> = {
  completed: {
    label: "已完课",
    toneCls:
      "border-[var(--color-border)] text-text-tertiary bg-[var(--color-bg-subtle)]",
  },
  in: {
    label: "上课中",
    toneCls:
      "border-[var(--color-primary)]/45 text-[var(--color-primary)] bg-[var(--color-primary)]/10",
    pulse: true,
  },
  soon: {
    label: "即将开始",
    toneCls:
      "border-[var(--color-primary)]/45 text-[var(--color-primary)] bg-[var(--color-primary)]/10",
  },
  pending: {
    label: "待开始",
    toneCls:
      "border-[var(--color-info)]/35 text-[var(--color-info)] bg-[var(--color-info)]/8",
  },
}

const DELIVERY_LABEL = {
  online: "线上互动教室",
  offline: "线下教室",
  hybrid: "线上 + 线下",
} as const

interface DerivedRow {
  occurrenceId: string
  course: CourseRecord
  schedule: ScheduleRecord
  occurrence: ScheduleOccurrence
  /** 该 occurrence 在课程内对应的 lessonKey（资料 / 考勤 / 风采都用它做主键） */
  lessonKey: string
  lessonTitle: string
}

/* ============================================================
 * 主组件
 * ============================================================ */

export function LessonOperationListCard({
  role,
  kind,
  ctx,
  onOpenSeries,
}: LessonOperationListCardProps) {
  const [selectedDate, setSelectedDate] = React.useState<number>(() =>
    startOfDay(Date.now()),
  )
  const weekMonday = React.useMemo(
    () => startOfWeekMonday(selectedDate),
    [selectedDate],
  )
  const weekDays = React.useMemo(() => buildWeekDays(weekMonday), [weekMonday])

  const subscribe = React.useCallback(
    (l: () => void) => subscribeEduCourses(l),
    [],
  )
  const fromTs = weekMonday
  const toTs = weekMonday + 7 * 24 * 60 * 60 * 1000
  const cacheRef = React.useRef<{ sig: string; rows: DerivedRow[] } | null>(null)
  const getSnapshot = React.useCallback(() => {
    const list = listScheduleOccurrencesInRange({ ctx, fromTs, toTs })
    const sig = list
      .map(
        (r) =>
          `${r.occurrence.id}:${r.occurrence.startAt}:${r.occurrence.endAt}:${r.schedule.color}:${r.course.id}`,
      )
      .join("|")
    if (cacheRef.current && cacheRef.current.sig === sig) {
      return cacheRef.current.rows
    }
    const rows: DerivedRow[] = list.map((r) => {
      /** 主线课次 / 序列课次：lessonKey 与课程内课次目录的 lessonKey 严格一致 */
      const folder = r.course.lessons[r.occurrence.lessonNumber - 1]
      const lessonKey =
        folder?.lessonKey ?? `${r.course.id}__lesson_${r.occurrence.lessonNumber}`
      const lessonTitle =
        folder?.title ?? `${r.course.name} · 第 ${r.occurrence.lessonNumber} 节`
      return {
        occurrenceId: r.occurrence.id,
        course: r.course,
        schedule: r.schedule,
        occurrence: r.occurrence,
        lessonKey,
        lessonTitle,
      }
    })
    cacheRef.current = { sig, rows }
    return rows
  }, [ctx, fromTs, toTs])
  const allWeekRows = React.useSyncExternalStore(
    subscribe,
    getSnapshot,
    getSnapshot,
  )
  const selectedDayRows = React.useMemo(() => {
    const dayStart = startOfDay(selectedDate)
    const dayEnd = dayStart + 24 * 60 * 60 * 1000
    return allWeekRows.filter(
      (r) =>
        r.occurrence.startAt >= dayStart && r.occurrence.startAt < dayEnd,
    )
  }, [allWeekRows, selectedDate])

  const [nowTs, setNowTs] = React.useState<number>(() => Date.now())
  React.useEffect(() => {
    const id = window.setInterval(() => setNowTs(Date.now()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  const monthLabel = React.useMemo(() => {
    const d = new Date(selectedDate)
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}`
  }, [selectedDate])

  const title = getLessonOperationCardTitle(role, kind)
  const headerSubtitle = headerSubtitleByKind(kind, role, selectedDayRows.length)

  return (
    <div className="flex w-full max-w-[min(100%,920px)] flex-col">
      <div
        className="rounded-[var(--radius-lg)] border border-border bg-bg"
        style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04)" }}
      >
        <div className="flex flex-col gap-[var(--space-300)] p-[var(--space-300)]">
          <div className="flex flex-wrap items-baseline justify-between gap-[var(--space-150)]">
            <div className="flex flex-col gap-[2px]">
              <h3 className="m-0 text-[length:var(--font-size-md)] font-[var(--font-weight-semibold)] text-text">
                {title}
              </h3>
              <span className="text-[length:var(--font-size-xs)] text-text-tertiary">
                {headerSubtitle}
              </span>
            </div>
          </div>

          <Toolbar
            monthLabel={monthLabel}
            onToday={() => setSelectedDate(startOfDay(Date.now()))}
            onPrevWeek={() =>
              setSelectedDate((d) => d - 7 * 24 * 60 * 60 * 1000)
            }
            onNextWeek={() =>
              setSelectedDate((d) => d + 7 * 24 * 60 * 60 * 1000)
            }
          />
          <WeekStrip
            days={weekDays}
            selectedDate={selectedDate}
            onSelect={(ts) => setSelectedDate(ts)}
          />

          <div className="flex flex-col gap-[var(--space-200)]">
            {selectedDayRows.length > 0 ? (
              selectedDayRows.map((row) => {
                /**
                 * 行实时状态（基于 nowTs vs occurrence.startAt/endAt 真算）：
                 * 透传给 onOpenSeries → 父级把全局 educationStage 同步到匹配值，
                 * 解决 "卡片显示待开始 / 上课中 / 已完课，进入子 CUI 却是另一个 stage" 的语义打架。
                 * 与 EduCourseFulfillmentCard 同款机制（runtimeStatus → EducationStage）。
                 */
                const rowStatus = deriveStatus(row.occurrence, nowTs)
                return (
                  <LessonRow
                    key={row.occurrenceId}
                    row={row}
                    nowTs={nowTs}
                    role={role}
                    kind={kind}
                    ctx={ctx}
                    /**
                     * `actionOverride` = 行内更具体的子动作（如考勤里的"请假"/"调课"）；
                     * 为空时沿用 kind 的默认动作（"资料" / "签到" / "作业" / "风采点评"）。
                     * 父级 mapToCommand 优先按 actionOverride 路由命令。
                     */
                    onOpen={(actionOverride) =>
                      onOpenSeries(deriveSeriesId(row.course), {
                        lessonNumber:
                          row.occurrence.lessonNumber || undefined,
                        actionLabel:
                          actionOverride ?? actionLabelForKind(kind),
                        runtimeStatus: rowStatus,
                      })
                    }
                  />
                )
              })
            ) : (
              <EmptyDay kind={kind} />
            )}
          </div>
          <FooterPagination total={selectedDayRows.length} />
        </div>
      </div>
    </div>
  )
}

/* ============================================================
 * 顶部工具条 + 周日历带（与 EduCourseFulfillmentCard 对齐）
 * ============================================================ */
function Toolbar({
  monthLabel,
  onToday,
  onPrevWeek,
  onNextWeek,
}: {
  monthLabel: string
  onToday: () => void
  onPrevWeek: () => void
  onNextWeek: () => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-[var(--space-150)]">
      <button
        type="button"
        className="inline-flex h-8 items-center gap-[var(--space-150)] rounded-[var(--radius-sm)] border border-border bg-bg px-[var(--space-250)] text-[length:var(--font-size-sm)] text-text transition-colors hover:bg-[var(--black-alpha-11)]"
      >
        {monthLabel}
        <CalendarIcon className="h-3.5 w-3.5 text-text-tertiary" />
      </button>
      <button
        type="button"
        onClick={onToday}
        className="inline-flex h-8 items-center rounded-[var(--radius-sm)] border border-border bg-bg px-[var(--space-250)] text-[length:var(--font-size-sm)] text-text transition-colors hover:bg-[var(--black-alpha-11)]"
      >
        今天
      </button>
      <ToolIconButton ariaLabel="上一周" onClick={onPrevWeek}>
        <ChevronLeft className="h-4 w-4" />
      </ToolIconButton>
      <ToolIconButton ariaLabel="下一周" onClick={onNextWeek}>
        <ChevronRight className="h-4 w-4" />
      </ToolIconButton>

      <div className="flex h-8 min-w-[180px] flex-1 items-center gap-[var(--space-150)] rounded-[var(--radius-sm)] border border-border bg-bg px-[var(--space-250)]">
        <Search className="h-3.5 w-3.5 text-text-tertiary" />
        <input
          type="text"
          placeholder="搜索标题"
          className="flex-1 bg-transparent text-[length:var(--font-size-sm)] text-text placeholder:text-text-tertiary outline-none"
        />
      </div>

      <FilterChip>老师</FilterChip>
      <FilterChip>科目</FilterChip>
      <FilterChip>状态</FilterChip>
    </div>
  )
}

function ToolIconButton({
  ariaLabel,
  onClick,
  children,
}: {
  ariaLabel: string
  onClick?: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] border border-border bg-bg text-text-secondary transition-colors hover:bg-[var(--black-alpha-11)] hover:text-text"
    >
      {children}
    </button>
  )
}

function FilterChip({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="button"
      className="inline-flex h-8 items-center gap-[var(--space-100)] rounded-[var(--radius-sm)] px-[var(--space-200)] text-[length:var(--font-size-sm)] text-text-secondary transition-colors hover:bg-[var(--black-alpha-11)]"
    >
      {children}
      <ChevronDown className="h-3 w-3 text-text-tertiary" />
    </button>
  )
}

function WeekStrip({
  days,
  selectedDate,
  onSelect,
}: {
  days: Date[]
  selectedDate: number
  onSelect: (ts: number) => void
}) {
  const today = startOfDay(Date.now())
  return (
    <div className="grid grid-cols-7 gap-[var(--space-150)]">
      {days.map((d, i) => {
        const ts = d.getTime()
        const isSelected = ts === startOfDay(selectedDate)
        const isToday = ts === today
        return (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(ts)}
            className={cn(
              "flex flex-col items-center justify-center gap-[2px] rounded-[var(--radius-md)] border bg-bg px-[var(--space-200)] py-[var(--space-200)] transition-colors",
              isSelected
                ? "border-transparent"
                : "border-border hover:bg-[var(--black-alpha-11)]",
            )}
          >
            <span
              className={cn(
                "inline-flex h-8 w-8 items-center justify-center rounded-full text-[length:var(--font-size-md)] font-[var(--font-weight-semibold)]",
                isSelected
                  ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground,white)]"
                  : isToday
                    ? "border border-[var(--color-primary)]/55 text-[var(--color-primary)]"
                    : "text-text",
              )}
            >
              {d.getDate()}
            </span>
            <span
              className={cn(
                "text-[length:var(--font-size-xs)]",
                isSelected
                  ? "text-[var(--color-primary)]"
                  : "text-text-tertiary",
              )}
            >
              {WEEKDAY_LABELS_MON_FIRST[i]}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/* ============================================================
 * 单条课次行（按 kind 渲染不同摘要）
 * ============================================================ */
function LessonRow({
  row,
  nowTs,
  role,
  kind,
  ctx,
  onOpen,
}: {
  row: DerivedRow
  nowTs: number
  role: EduSceneRole
  kind: LessonOperationListCardKind
  ctx: SpaceContext
  onOpen: (actionOverride?: string) => void
}) {
  const { course, schedule, occurrence } = row
  const status = deriveStatus(occurrence, nowTs)
  const badge = FULFILLMENT_STATUS_BADGE[status]
  const isCurrent = status === "in"
  const dotColor = scheduleColorToHsl(schedule.color)

  const timeRangeLabel = `${formatHHmm(occurrence.startAt)} – ${formatHHmm(occurrence.endAt)}`

  const [expanded, setExpanded] = React.useState(false)

  /**
   * 标题头 bar 底色：取自排课表色（schedule.color），为每个课次提供视觉区分度。
   * 用 color-mix 兑出 ~10% 的 tint 作为头部底色；左侧色条仍用饱和色。
   */
  const headerTintBg = `color-mix(in srgb, ${dotColor} 10%, transparent)`
  const headerLeftBar = dotColor

  /**
   * 整条课程 item 作为 lesson 维度入口；行内具体操作通过 stopPropagation 保持原地执行。
   */
  const wholeItemClickable = true
  const headerClickable = false

  const headerInner = (
    <>
      <span
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{ background: headerLeftBar }}
        aria-hidden
      />
      <div className="flex flex-wrap items-center gap-x-[var(--space-250)] gap-y-[var(--space-100)]">
        <span className="shrink-0 text-[length:var(--font-size-md)] font-[var(--font-weight-semibold)] tabular-nums text-text">
          {timeRangeLabel}
        </span>
        <h4 className="m-0 min-w-0 flex-1 truncate text-[length:var(--font-size-md)] font-[var(--font-weight-semibold)] text-text">
          {course.name}
          <span className="ml-[var(--space-150)] text-[length:var(--font-size-xs)] font-[var(--font-weight-normal)] text-text-tertiary">
            · 第 {occurrence.lessonNumber} 节《{row.lessonTitle}》
          </span>
        </h4>
        <span
          className={cn(
            "inline-flex shrink-0 items-center rounded-[var(--radius-sm)] border px-[var(--space-150)] py-[1px] text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)]",
            badge.toneCls,
            badge.pulse ? "animate-pulse" : "",
          )}
        >
          {badge.label}
        </span>
        {isCurrent ? (
          <span className="inline-flex shrink-0 items-center rounded-[var(--radius-sm)] border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/8 px-[var(--space-150)] py-[1px] text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] text-[var(--color-primary)]">
            本节
          </span>
        ) : null}
      </div>
    </>
  )

  return (
    <div
      role={wholeItemClickable ? "button" : undefined}
      tabIndex={wholeItemClickable ? 0 : undefined}
      onClick={wholeItemClickable ? () => onOpen() : undefined}
      onKeyDown={
        wholeItemClickable
          ? (e) => {
              if (e.target !== e.currentTarget) return
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                onOpen()
              }
            }
          : undefined
      }
      className={cn(
        "overflow-hidden rounded-[var(--radius-md)] border bg-bg transition-colors",
        wholeItemClickable ? "cursor-pointer hover:border-[var(--color-primary)]/35 hover:bg-bg-secondary/30" : "",
        isCurrent
          ? "border-[var(--color-primary)]/45 shadow-[0_2px_10px_rgba(64,93,251,0.08)]"
          : "border-border",
      )}
    >
      {headerClickable ? (
        <button
          type="button"
          onClick={() => onOpen()}
          className="relative block w-full px-[var(--space-300)] py-[var(--space-250)] pl-[var(--space-400)] text-left transition-colors hover:bg-[var(--black-alpha-11)]"
          style={{ backgroundColor: headerTintBg }}
        >
          {headerInner}
        </button>
      ) : (
        <div
          className="relative block w-full px-[var(--space-300)] py-[var(--space-250)] pl-[var(--space-400)]"
          style={{ backgroundColor: headerTintBg }}
        >
          {headerInner}
        </div>
      )}

      {/* kind-specific summary：整卡点击进入子 CUI；内部具体操作自行 stopPropagation */}
      <div
        className="border-t border-border px-[var(--space-300)] py-[var(--space-250)]"
      >
        {kind === "materials" ? (
          <MaterialsRowBody
            row={row}
            ctx={ctx}
            role={role}
            onOpen={onOpen}
          />
        ) : kind === "attendance" ? (
          <AttendanceRowBody
            row={row}
            role={role}
            expanded={expanded}
            onToggleExpand={() => setExpanded((v) => !v)}
            onOpen={onOpen}
          />
        ) : kind === "homework" ? (
          <HomeworkRowBody row={row} role={role} status={status} onOpen={onOpen} />
        ) : (
          <ReviewRowBody row={row} role={role} status={status} onOpen={onOpen} />
        )}
      </div>
    </div>
  )
}

/* ============================================================
 * 资料 行：缩略图 + 文件计数 + 增 / 删 / 查（在卡内完成）
 * ============================================================ */
function MaterialsRowBody({
  row,
  ctx,
  role,
  onOpen,
}: {
  row: DerivedRow
  ctx: SpaceContext
  role: EduSceneRole
  onOpen: () => void
}) {
  /** 资料库文件（不走微盘 picker；老师可以本地上传 / 删除） */
  const files = React.useMemo(
    () => row.course.lessons.find((l) => l.lessonKey === row.lessonKey)?.materialFiles ?? [],
    [row.course.lessons, row.lessonKey],
  )
  /**
   * 列表内最多展示两行（2 列 × 2 行 = 4 张卡）；
   * 多余 → 显示「还有 N 项」弱提示；整张 item 已可点击进入子 CUI 看全部。
   */
  const VISIBLE_LIMIT = 4
  const visibleFiles = files.slice(0, VISIBLE_LIMIT)
  const remainCount = Math.max(0, files.length - visibleFiles.length)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  /** 仅老师 / admin 可上传或删除（家长 / 学生只读） */
  const canMutate = role === "teacher" || role === "admin"

  const handlePickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files
    if (!list || list.length === 0) return
    for (const file of Array.from(list)) {
      if (!isAllowedLessonMaterialFile(file.name)) continue
      if (file.size > LESSON_MATERIAL_MAX_BYTES) continue
      const built = buildWeDiskFileFromBrowserFile({
        file,
        uploaderName: role === "admin" ? "管理者" : "我（老师）",
        uploaderRole: role === "admin" ? "admin" : "teacher",
      })
      storeUploadMaterial({
        ctx,
        courseId: row.course.id,
        lessonKey: row.lessonKey,
        file: built.file,
        previewUrl: built.previewUrl,
      })
    }
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleDelete = (fileId: string) => {
    storeDeleteMaterial({
      ctx,
      courseId: row.course.id,
      lessonKey: row.lessonKey,
      fileId,
    })
  }

  return (
    <div className="flex flex-col gap-[var(--space-200)]">
      <div className="flex items-center justify-between gap-[var(--space-150)]">
        <span className="text-[length:var(--font-size-sm)] text-text-secondary">
          本节资料 <strong className="text-text">{files.length}</strong> 项
        </span>
        {canMutate ? (
          <>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={LESSON_MATERIAL_ACCEPT_ATTR}
              className="hidden"
              onChange={handlePickFiles}
            />
            <RowMiniButton
              icon={Upload}
              label="上传"
              onClick={() => fileInputRef.current?.click()}
            />
          </>
        ) : null}
      </div>

      {files.length > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-[var(--space-200)] sm:grid-cols-2">
            {visibleFiles.map((f) => (
              <MaterialFileCard
                key={f.id}
                file={f}
                canDelete={canMutate}
                onDelete={() => handleDelete(f.id)}
                onOpen={onOpen}
              />
            ))}
          </div>
          {remainCount > 0 ? (
            <div className="text-right text-[length:var(--font-size-xs)] text-text-tertiary">
              还有 {remainCount} 项，点击整条课程进入资料卡查看
            </div>
          ) : null}
        </>
      ) : (
        <div className="rounded-[var(--radius-md)] border border-dashed border-border bg-bg-tertiary px-[var(--space-300)] py-[var(--space-250)] text-[length:var(--font-size-xs)] text-text-tertiary">
          {canMutate
            ? "本节还没有上传资料。点上方「上传」可直接添加。"
            : "本节资料还在准备中，等老师整理完成会同步给你。"}
        </div>
      )}
    </div>
  )
}

/**
 * 单文件卡：与子 CUI《资料卡》中 FileTile 的视觉规范保持一致
 * - 左侧色块图标（按文件类型上色）
 * - 文件名 + 归属徽标（我上传 / 公共）
 * - 副标：体积 · 上传者 · 上传时间
 * - 老师 / 机构管理者可见 hover 出现的删除按钮（仅本人上传可删）
 */
function MaterialFileCard({
  file,
  canDelete,
  onDelete,
  onOpen,
}: {
  file: WeDiskFile
  canDelete: boolean
  onDelete: () => void
  onOpen: () => void
}) {
  const Icon = pickFileIcon(file.type)
  const tone = pickFileTone(file.type)
  /** 演示场景"本人"统一为 `me`，与 LessonMaterialsCard 一致 */
  const isOwn = (file.uploaderId ?? "admin-platform") === "me"
  const isPublic =
    file.uploaderRole == null ||
    file.uploaderRole === "admin" ||
    file.uploaderRole === "system"
  const ownerLabel = isOwn ? `我 · ${file.uploaderName}` : file.uploaderName
  /** 仅"自己上传"才允许删除：公共内容（管理员）任何老师不可误删 */
  const showDelete = canDelete && isOwn

  return (
    <div className="group relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onOpen()
        }}
        className="flex w-full min-w-0 items-center gap-[var(--space-200)] rounded-[var(--radius-md)] border border-border bg-bg px-[var(--space-250)] py-[var(--space-200)] text-left transition-colors hover:border-[var(--color-primary)]/35 hover:bg-bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/30"
      >
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-bg-secondary",
            tone,
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
              <MaterialOwnershipBadge tone="own">我上传</MaterialOwnershipBadge>
            ) : isPublic ? (
              <MaterialOwnershipBadge tone="public">公共</MaterialOwnershipBadge>
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
        {/* 给删除按钮预留位置 */}
        {showDelete ? <span aria-hidden className="size-6 shrink-0" /> : null}
      </button>
      {showDelete ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          aria-label={`删除 ${file.name}`}
          className="absolute right-[var(--space-200)] top-1/2 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-[var(--radius-sm)] text-text-tertiary opacity-0 transition-opacity hover:bg-[var(--black-alpha-11)] hover:text-[var(--color-danger,#ff4d4f)] group-hover:opacity-100"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  )
}

function MaterialOwnershipBadge({
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

function pickFileIcon(type: WeDiskFile["type"]): LucideIcon {
  if (type === "image") return FileImage
  if (type === "video") return Video
  return FileText
}

/** 与 LessonMaterialsCard 的 TYPE_TONE 保持一致：让卡片内文件视觉与子 CUI 资料卡同语言 */
function pickFileTone(type: WeDiskFile["type"]): string {
  switch (type) {
    case "pdf":
      return "text-[var(--color-error,#ef4444)]"
    case "doc":
      return "text-[var(--color-info,#3b82f6)]"
    case "xls":
      return "text-[var(--color-success,#22c55e)]"
    case "image":
      return "text-[var(--color-warning,#f59e0b)]"
    case "video":
      return "text-[var(--color-primary)]"
    case "audio":
      return "text-[var(--color-purple,#8b5cf6)]"
    default:
      return "text-text-secondary"
  }
}

/* ============================================================
 * 考勤 行：每节整体数据 + 展开看每个孩子
 * ============================================================ */
function AttendanceRowBody({
  row,
  role,
  expanded,
  onToggleExpand,
  onOpen,
}: {
  row: DerivedRow
  role: EduSceneRole
  /** 仅老师 / admin 用：班级名单展开 / 收起 */
  expanded: boolean
  onToggleExpand: () => void
  /**
   * 教学管理 · 考勤独有：可带 actionOverride 参数（"请假" / "调课"）
   * → 父级把它替掉默认 actionLabel ("签到")，路由到对应子卡（请假卡 / 调课卡）。
   * 不传参数时仍走默认（"签到" → 签到卡）。
   */
  onOpen: (actionOverride?: string) => void
}) {
  const snap = useLessonOperationSnapshot(row.lessonKey)
  const isTeacherOrAdmin = role === "teacher" || role === "admin"

  /**
   * 学员单元格的 click 行为（与子 CUI `AttendeeCell` 一致）：
   * unsigned → signed / signed → unsigned；leave 不可切换。
   * 共享 store → 列表卡 ↔ 子 CUI 实时同步。
   */
  const toggleAttendee = (s: LessonStudentAttendance) => {
    if (s.status === "leave") return
    if (s.status === "signed") {
      markStudentUnsigned(row.lessonKey, s.id)
    } else {
      markStudentSigned(row.lessonKey, s.id)
    }
  }

  /**
   * 学生 / 家长侧：与老师侧不同型 —— 全班统计 / 一键签到 / 名单展开都没意义，
   * 直接铺一张"我（孩子）这一节的考勤"卡片即可（点击切签到态、按钮跳子 CUI 处理请假 / 调课）。
   * 这里是用户明确反馈的"只需要展现学生本身当前的考勤状态，以及考勤的操作"。
   */
  if (!isTeacherOrAdmin) {
    return (
      <LearnerAttendanceBody
        role={role}
        attendees={snap.attendees}
        onToggleSign={toggleAttendee}
        onLeave={() => onOpen("请假")}
        onReschedule={() => onOpen("调课")}
      />
    )
  }

  /**
   * 老师 / admin 侧：保留原有"全班统计 + 展开学员详情 + 班级名单 + 批量条"完整版。
   */
  return (
    <TeacherAttendanceBody
      row={row}
      role={role}
      attendees={snap.attendees}
      reschedules={snap.teacherReschedules.length + snap.rescheduleRequests.length}
      expanded={expanded}
      onToggleExpand={onToggleExpand}
      onToggleSign={toggleAttendee}
      onLeave={() => onOpen("请假")}
      onReschedule={() => onOpen("调课")}
    />
  )
}

/**
 * 学生 / 家长侧考勤体：紧凑、聚焦在"自己（孩子）"，不出现全班统计 / 名单展开。
 * 与子 CUI `StudentAttendancePanel` / `ParentAttendancePanel` 同样口径——
 * 不让学员看到与自己无关的统计数与全班名单。
 */
function LearnerAttendanceBody({
  role,
  attendees,
  onToggleSign,
  onLeave,
  onReschedule,
}: {
  role: EduSceneRole
  attendees: LessonStudentAttendance[]
  onToggleSign: (s: LessonStudentAttendance) => void
  onLeave: () => void
  onReschedule: () => void
}) {
  const selfName = "林小安"
  const self =
    attendees.find((s) => s.name === selfName) ?? attendees[0] ?? null

  if (!self) {
    return (
      <p className="m-0 text-[length:var(--font-size-xs)] text-text-tertiary">
        {role === "parent"
          ? "暂无你孩子在本节的考勤数据。"
          : "暂无你在本节的考勤数据。"}
      </p>
    )
  }

  const isSigned = self.status === "signed"
  const isLeave = self.status === "leave"

  /** 让"我（孩子）"的卡片占满整行，相比老师侧那种 3 列网格更聚焦，与单课子 CUI 学员视图节奏一致。 */
  return (
    <div className="flex flex-col gap-[var(--space-200)]">
      <AttendanceStudentCell
        attendee={self}
        role={role}
        onToggleSign={() => onToggleSign(self)}
        onLeave={onLeave}
        onReschedule={onReschedule}
        fullWidth
      />
      <p className="m-0 text-[length:var(--font-size-xs)] text-text-tertiary">
        {(() => {
          const subjectLabel = role === "parent" ? "孩子" : "你"
          if (isLeave) {
            return `本节已为${subjectLabel}请假，签到环节自动跳过；如需调整，点击整条课程进入考勤详情。`
          }
          if (isSigned) {
            return `本节${subjectLabel}已签到；点击上方卡片可撤销，点击整条课程可看完整记录。`
          }
          const verb = role === "parent" ? "代孩子签到" : "签到"
          const opLabel =
            role === "parent"
              ? "代请假 / 代调课"
              : role === "student"
                ? "我请假 / 申请调课"
                : "请假 / 调课"
          return `本节${subjectLabel}尚未签到；点击上方卡片即可${verb}，单条「${opLabel}」可继续处理特殊情况。`
        })()}
      </p>
    </div>
  )
}

/**
 * 老师 / admin 侧考勤体：保留全班统计 + 展开学员详情 + 一键签到 / 全部撤销 完整能力。
 */
function TeacherAttendanceBody({
  row,
  role,
  attendees,
  reschedules,
  expanded,
  onToggleExpand,
  onToggleSign,
  onLeave,
  onReschedule,
}: {
  row: DerivedRow
  role: EduSceneRole
  attendees: LessonStudentAttendance[]
  reschedules: number
  expanded: boolean
  onToggleExpand: () => void
  onToggleSign: (s: LessonStudentAttendance) => void
  onLeave: () => void
  onReschedule: () => void
}) {
  const total = attendees.length
  const signedCount = attendees.filter((s) => s.status === "signed").length
  const leaveCount = attendees.filter((s) => s.status === "leave").length
  const rate = total > 0 ? Math.round((signedCount / total) * 100) : 0
  const allSignedOrLeave = signedCount + leaveCount >= total && total > 0
  const anySigned = signedCount > 0

  return (
    <div className="flex flex-col gap-[var(--space-200)]">
      {/**
       * 数据条：平铺一整行，5 列等分（出勤率 / 应出勤 / 已签到 / 请假 / 调课）。
       * 之前右侧挂的"出勤详情""进入子 CUI"按钮已按用户反馈移除，行内只保留数据。
       * 展开学员详情移到下方独立的文字链接（更易识别为"展开/收起"操作）。
       */}
      <div className="grid grid-cols-2 gap-[var(--space-150)] sm:grid-cols-5">
        <AttendanceStat label="出勤率" value={`${rate}%`} tone={rate >= 90 ? "success" : "warning"} />
        <AttendanceStat label="应出勤" value={`${total} 人`} />
        <AttendanceStat label="已签到" value={`${signedCount} 人`} tone="success" />
        <AttendanceStat
          label="请假"
          value={`${leaveCount} 人`}
          tone={leaveCount > 0 ? "warning" : "default"}
        />
        <AttendanceStat
          label="调课"
          value={`${reschedules} 人`}
          tone={reschedules > 0 ? "warning" : "default"}
        />
      </div>

      <div className="flex justify-center">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onToggleExpand()
          }}
          className="inline-flex items-center gap-[var(--space-100)] rounded-[var(--radius-sm)] px-[var(--space-200)] py-[2px] text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)]/8"
        >
          {expanded ? "收起学员详情" : "展开学员详情"}
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      </div>

      {expanded ? (
        <div className="flex flex-col gap-[var(--space-200)]">
          <div className="flex flex-wrap items-center justify-between gap-[var(--space-150)] rounded-[var(--radius-md)] border border-border bg-bg-tertiary px-[var(--space-250)] py-[var(--space-150)]">
            <div className="flex flex-wrap items-center gap-[var(--space-200)] text-[length:var(--font-size-sm)] text-text">
              <span className="inline-flex items-center gap-[var(--space-100)]">
                <Users className="h-4 w-4 text-text-secondary" />
                应到 <strong className="text-text">{total}</strong>
              </span>
              <span className="inline-flex items-center gap-[var(--space-100)] text-[var(--color-success)]">
                <CheckCircle2 className="h-4 w-4" />
                已到 {signedCount}
              </span>
              <span className="inline-flex items-center gap-[var(--space-100)] text-text-tertiary">
                <CalendarOff className="h-4 w-4" />
                请假 {leaveCount}
              </span>
            </div>
            <div className="flex items-center gap-[var(--space-100)]">
              <button
                type="button"
                onClick={() => markAllStudentsSigned(row.lessonKey)}
                disabled={allSignedOrLeave}
                className={cn(
                  "inline-flex items-center gap-[var(--space-100)] rounded-full px-[var(--space-250)] py-[var(--space-100)] text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] transition-colors",
                  allSignedOrLeave
                    ? "bg-[var(--black-alpha-11)] text-text-tertiary"
                    : "bg-primary text-[var(--color-primary-foreground,white)] hover:opacity-90",
                )}
              >
                <Sparkles className="h-3.5 w-3.5" />
                一键签到
              </button>
              <button
                type="button"
                onClick={() => markAllStudentsUnsigned(row.lessonKey)}
                disabled={!anySigned}
                className={cn(
                  "inline-flex items-center gap-[var(--space-100)] rounded-full border px-[var(--space-250)] py-[var(--space-100)] text-[length:var(--font-size-xs)] transition-colors",
                  anySigned
                    ? "border-border bg-bg text-text hover:border-border-strong"
                    : "border-border bg-bg-tertiary text-text-tertiary",
                )}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                全部撤销
              </button>
            </div>
          </div>

          {attendees.length === 0 ? (
            <p className="m-0 text-[length:var(--font-size-xs)] text-text-tertiary">
              本节暂无名单。
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-[var(--space-150)] sm:grid-cols-3">
              {attendees.map((s) => (
                <AttendanceStudentCell
                  key={s.id}
                  attendee={s}
                  role={role}
                  onToggleSign={() => onToggleSign(s)}
                  onLeave={onLeave}
                  onReschedule={onReschedule}
                />
              ))}
            </div>
          )}

          <p className="m-0 text-[length:var(--font-size-xs)] text-text-tertiary">
            点击学员即可在「未签到 / 已签到」之间切换；请假学员不参与签到。
            <span className="ml-[var(--space-150)]">单条「请假 / 调课」可继续处理特殊情况。</span>
          </p>
        </div>
      ) : null}
    </div>
  )
}

function AttendanceStat({
  label,
  value,
  tone = "default",
}: {
  label: string
  value: string
  tone?: "default" | "warning" | "success"
}) {
  const toneCls =
    tone === "success"
      ? "border-[var(--color-success)]/30 bg-[var(--color-success)]/5"
      : tone === "warning"
        ? "border-[var(--color-warning)]/30 bg-[var(--color-warning)]/5"
        : "border-border bg-bg"
  const valueCls =
    tone === "success"
      ? "text-[var(--color-success)]"
      : tone === "warning"
        ? "text-[var(--color-warning)]"
        : "text-text"
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col items-start gap-[2px] rounded-[var(--radius-md)] border px-[var(--space-200)] py-[var(--space-150)]",
        toneCls,
      )}
    >
      <span className="text-[length:var(--font-size-xs)] text-text-tertiary">{label}</span>
      <span
        className={cn(
          "text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] tabular-nums",
          valueCls,
        )}
      >
        {value}
      </span>
    </div>
  )
}

/**
 * 学员单元格：与子 CUI 教师态 `AttendeeCell`（LessonAttendanceCard）视觉对齐。
 * 增量：右侧挂两枚 mini 图标按钮（请假 / 调课），点击不切签到，
 * 而是 stopPropagation 后调 onLeave / onReschedule（→ 父级跳子 CUI 对应卡）。
 */
function AttendanceStudentCell({
  attendee,
  role,
  onToggleSign,
  onLeave,
  onReschedule,
  fullWidth = false,
}: {
  attendee: LessonStudentAttendance
  role: EduSceneRole
  onToggleSign: () => void
  onLeave: () => void
  onReschedule: () => void
  /** 学员侧（学生 / 家长）单卡片占满整行；老师侧仍走 3 列网格的等分单元格。 */
  fullWidth?: boolean
}) {
  const isSigned = attendee.status === "signed"
  const isLeave = attendee.status === "leave"
  const isTeacherOrAdmin = role === "teacher" || role === "admin"

  const leaveLabel = isLeave
    ? "查看请假"
    : role === "parent"
      ? "代请假"
      : role === "student"
        ? "我请假"
        : "请假"
  /**
   * 调课按钮：4 个角色均可触发（与 `lessonBottomQuickActions` / 子 CUI 调课卡角色策略一致）：
   * - 老师 / admin → "发起调课并通知学生家长"（直接生效）
   * - 学生         → "申请调课"（待老师同意）
   * - 家长         → "代孩子发起调课申请"（待老师同意）
   * 命令路由由父级 `mapToCommand` 按 actionLabel="调课" + viewerRole 决议。
   */
  const rescheduleLabel = isTeacherOrAdmin
    ? "调课"
    : role === "parent"
      ? "代调课"
      : "申请调课"

  /**
   * 学员侧 fullWidth：单卡铺满 + 内边距 / 头像 / 字号上调一档，让"我（孩子）这一节考勤"
   * 在主对话气泡里有足够的视觉权重；老师侧 3 列网格用紧凑尺寸保持一屏看完全班。
   */
  const sizing = fullWidth
    ? {
        container: "px-[var(--space-300)] py-[var(--space-250)]",
        gap: "gap-[var(--space-200)]",
        avatar: "h-9 w-9 text-[length:var(--font-size-sm)]",
        nameCls: "text-[length:var(--font-size-md)]",
        statusIcon: "h-5 w-5",
      }
    : {
        container: "px-[var(--space-200)] py-[var(--space-150)]",
        gap: "gap-[var(--space-150)]",
        avatar: "h-7 w-7 text-[length:var(--font-size-xs)]",
        nameCls: "text-[length:var(--font-size-sm)]",
        statusIcon: "h-4 w-4",
      }

  return (
    <div
      className={cn(
        "relative flex flex-col gap-[var(--space-100)] rounded-[var(--radius-md)] border",
        sizing.container,
        isSigned
          ? "border-[color-mix(in_srgb,var(--color-success)_45%,transparent)] bg-[color-mix(in_srgb,var(--color-success)_8%,transparent)]"
          : isLeave
            ? "border-border bg-bg-tertiary"
            : "border-border bg-bg",
      )}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onToggleSign()
        }}
        disabled={isLeave}
        title={isLeave ? "已请假" : isSigned ? "点击撤销" : "点击签到"}
        className={cn(
          "flex items-center text-left",
          sizing.gap,
          isLeave ? "cursor-not-allowed" : "cursor-pointer",
        )}
      >
        <span
          className={cn(
            "grid flex-none place-items-center rounded-full font-[var(--font-weight-medium)]",
            sizing.avatar,
            isSigned
              ? "bg-[color-mix(in_srgb,var(--color-success)_18%,transparent)] text-[var(--color-success)]"
              : isLeave
                ? "bg-bg text-text-tertiary"
                : "bg-bg-tertiary text-text-secondary",
          )}
        >
          {attendee.name.slice(0, 1)}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span
            className={cn(
              "truncate",
              sizing.nameCls,
              isLeave ? "text-text-tertiary" : "text-text",
            )}
          >
            {attendee.name}
          </span>
          <span className="text-[length:var(--font-size-xs)] text-text-tertiary">
            {isSigned ? "已签到" : isLeave ? "请假" : "未签到"}
          </span>
        </span>
        {isSigned ? (
          <CheckCircle2 className={cn(sizing.statusIcon, "flex-none text-[var(--color-success)]")} />
        ) : isLeave ? (
          <CalendarOff className={cn(sizing.statusIcon, "flex-none text-text-tertiary")} />
        ) : (
          <Circle className={cn(sizing.statusIcon, "flex-none text-text-tertiary")} />
        )}
      </button>

      {/**
       * 学员粒度的"请假 / 调课"快捷区：
       * 不在 cell 内做表单（与子 CUI 操作流重复），而是直接跳子 CUI 对应业务卡（请假卡 / 调课卡），
       * 数据由 store 共享 → 跳过去填好回来这里的统计就会自动跟随。
       *
       * 学生 / 家长侧只看自己（孩子）一行，按钮也只对该行有意义：
       * - 学生：仅"我请假"
       * - 家长：可"代请假" + "代调课"
       * - 老师 / admin：可"请假"（查看 / 替学员请假） + "调课"
       */}
      <div
        className="flex items-center justify-end gap-[var(--space-100)]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onLeave()
          }}
          className="inline-flex h-6 items-center gap-[2px] rounded-[var(--radius-sm)] border border-border bg-bg px-[var(--space-150)] text-[length:var(--font-size-xs)] text-text-secondary transition-colors hover:border-border-strong hover:bg-[var(--black-alpha-11)]"
        >
          <CalendarOff className="h-3 w-3" />
          {leaveLabel}
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onReschedule()
          }}
          className="inline-flex h-6 items-center gap-[2px] rounded-[var(--radius-sm)] border border-border bg-bg px-[var(--space-150)] text-[length:var(--font-size-xs)] text-text-secondary transition-colors hover:border-border-strong hover:bg-[var(--black-alpha-11)]"
        >
          <CalendarCheck className="h-3 w-3" />
          {rescheduleLabel}
        </button>
      </div>
    </div>
  )
}

/* ============================================================
 * 作业 行：实数据摘要 + 进入子 CUI
 *
 * 数据源
 * --------------------------------------------------
 * 直接订阅 `lessonHomeworkStore.useLessonHomeworkSnapshot(row.lessonKey)`：
 * 老师在子 CUI 内布置 / 学生在子 CUI 内做题 / 老师改完 → 立即在本卡刷新。
 *
 * 摘要规则
 * --------------------------------------------------
 *  - 老师 / 管理者 = 全班维度 = 已交/总数 + 待复核 + 正确率
 *  - 学生 = 自己维度 = 当前最新一份作业的状态 + 分数
 *  - 家长 = 孩子维度 = 完成度 + 错点数
 *
 * 暂未发布时回退到提示文案 + 入口按钮（保持原占位行为）。
 * ============================================================ */
function HomeworkRowBody({
  row,
  role,
  status: _status,
  onOpen: _onOpen,
}: {
  row: DerivedRow
  role: EduSceneRole
  status: FulfillmentStatus
  onOpen: () => void
}) {
  const snap = useLessonHomeworkSnapshot(row.lessonKey)
  const published = snap.homeworks.filter((hw) => hw.publishedAt && !hw.withdrawnAt)
  const isTeacherOrAdmin = role === "teacher" || role === "admin"
  const visibleHomeworks = isTeacherOrAdmin
    ? snap.homeworks.filter((hw) => !hw.withdrawnAt)
    : published

  /** 老师 / 管理者：跨多份已发布作业聚合 */
  const teacherStats = published.length > 0 ? aggregateHomeworkStats(published) : null

  /** 学生 / 家长：自己孩子那份（按每份作业单独计算） */
  const selfId = getSelfStudentIdForRole()

  const emptySummary =
    role === "student"
      ? "今晚作业还未派发，点击整条课程看老师布置"
      : role === "parent"
        ? "今晚作业未开始，可设家庭日历提醒"
        : "暂未派发；点击整条课程起草本节课作业"

  return (
    <div className="flex flex-col gap-[var(--space-200)]">
      {visibleHomeworks.length > 0 ? (
        <div className="flex flex-col gap-[var(--space-150)]">
          {visibleHomeworks.map((hw) => {
            const isPublished = Boolean(hw.publishedAt && !hw.withdrawnAt)
            const stats = deriveGradingStats(hw)
            const selfSub = hw.submissions.find((s) => s.studentId === selfId) ?? null
            const selfStatus = selfSub ? deriveSubmissionStatus(hw, selfSub) : null
            const selfScore = selfSub?.teacherFinal?.score ?? selfSub?.autoReview?.score
            const detail = homeworkRowDetail({
              hw,
              role,
              stats,
              selfSubExists: Boolean(selfSub),
              selfStatus,
              selfScore,
              isPublished,
            })

            return (
              <div
                key={hw.id}
                className="rounded-[var(--radius-md)] border border-border bg-bg-secondary/30 px-[var(--space-250)] py-[var(--space-200)]"
              >
                <div className="flex min-w-0 flex-wrap items-center gap-[var(--space-150)]">
                  <span className="inline-flex shrink-0 rounded-full bg-[var(--color-primary)]/10 px-[var(--space-150)] py-[1px] text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] text-[var(--color-primary)]">
                    {homeworkStageLabel(hw.stage)}作业
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-text">
                    《{hw.title}》
                  </span>
                  {isTeacherOrAdmin ? (
                    <span
                      className={cn(
                        "inline-flex shrink-0 rounded-[var(--radius-sm)] border px-[var(--space-150)] py-[1px] text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)]",
                        isPublished
                          ? "border-[var(--color-success)]/25 bg-[var(--color-success)]/8 text-[var(--color-success)]"
                          : "border-[var(--color-warning,#f59e0b)]/25 bg-[var(--color-warning,#f59e0b)]/8 text-[var(--color-warning,#f59e0b)]",
                      )}
                    >
                      {isPublished ? "已发布" : "草稿"}
                    </span>
                  ) : null}
                </div>
                <div className="mt-[var(--space-100)] flex items-center gap-[var(--space-150)] text-[length:var(--font-size-xs)] text-text-tertiary">
                  <ClipboardCheck className="h-3.5 w-3.5 shrink-0" />
                  <span>{detail}</span>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="inline-flex items-center gap-[var(--space-150)] text-[length:var(--font-size-sm)] text-text-secondary">
          <ClipboardCheck className="h-4 w-4 text-text-tertiary" />
          <span>{emptySummary}</span>
        </div>
      )}
      {isTeacherOrAdmin && teacherStats ? (
        <div className="flex flex-wrap items-stretch gap-[var(--space-150)]">
          <AttendanceStat label="应交" value={`${teacherStats.total} 份`} />
          <AttendanceStat
            label="已交"
            value={`${teacherStats.submitted} 份`}
            tone="success"
          />
          <AttendanceStat
            label="待复核"
            value={`${teacherStats.pendingReview} 份`}
            tone={teacherStats.pendingReview > 0 ? "warning" : "default"}
          />
          <AttendanceStat
            label="正确率"
            value={`${teacherStats.accuracy}%`}
            tone={teacherStats.accuracy >= 70 ? "success" : "warning"}
          />
        </div>
      ) : null}
    </div>
  )
}

function homeworkStageLabel(stage: LessonHomework["stage"]): string {
  return stage === "pre" ? "课前" : stage === "in" ? "课中" : "课后"
}

function aggregateHomeworkStats(homeworks: LessonHomework[]) {
  const stats = homeworks.map((hw) => deriveGradingStats(hw))
  const submitted = stats.reduce((sum, item) => sum + item.submitted, 0)
  const total = stats.reduce((sum, item) => sum + item.total, 0)
  const pendingReview = stats.reduce((sum, item) => sum + item.pendingReview, 0)
  const accuracySum = stats.reduce(
    (sum, item) => sum + item.accuracy * item.submitted,
    0,
  )
  return {
    total,
    submitted,
    pendingReview,
    accuracy: submitted > 0 ? Math.round(accuracySum / submitted) : 0,
  }
}

function homeworkRowDetail({
  hw,
  role,
  stats,
  selfSubExists,
  selfStatus,
  selfScore,
  isPublished,
}: {
  hw: LessonHomework
  role: EduSceneRole
  stats: ReturnType<typeof deriveGradingStats>
  selfSubExists: boolean
  selfStatus: ReturnType<typeof deriveSubmissionStatus> | null
  selfScore: number | undefined
  isPublished: boolean
}): string {
  if (role === "teacher" || role === "admin") {
    if (!isPublished) return `草稿 · 待发布 · 目标 ${hw.submissions.length} 人`
    return `已交 ${stats.submitted}/${stats.total} · 待复核 ${stats.pendingReview} · 正确率 ${stats.accuracy}%`
  }
  if (!selfSubExists) return "已派发，但不在派发列表"
  if (role === "student") {
    if (selfStatus === "teacher-confirmed") return `老师已复核 · 终评 ${selfScore}`
    if (selfStatus === "submitted") return `已批改 · 得分 ${selfScore}`
    if (selfStatus === "appealed") return "申诉处理中"
    if (selfStatus === "in-progress") return "作答中"
    return "等你开始"
  }
  if (selfStatus === "teacher-confirmed") return `老师已复核 · 终评 ${selfScore}`
  if (selfStatus === "submitted") return `孩子已批改 · 得分 ${selfScore}`
  if (selfStatus === "in-progress") return "孩子作答中"
  return "孩子还没开始"
}

/* ============================================================
 * 风采 行：已发送 vs 未发送 两种态
 * ============================================================ */
/**
 * 未发布态再分支（与子 CUI《风采点评 / 风采报告》卡的 stage × 发布状态路由严格对齐）：
 *
 * 1. `已发`（任意 sendStatus === "sent"）→ ReviewSentBody
 *    （由子 CUI `<<<RENDER_AIC_REVIEW_*>>>` 的"PUBLISHED"子型对应）
 * 2. `草稿就位`（reportsGenerated && 至少一份未发草稿，且课后阶段）→ ReviewDraftReadyBody
 *    （子 CUI "REPORTS"子型对应；不出"一键生成"按钮）
 * 3. `课后未生成` / `课中` / `课前` → ReviewDraftBody（按 status 决定文案与按钮可见性）
 *    （子 CUI "ASSETS"子型对应）
 *
 * 所有四种态的数据源都是 `useLessonReviewSnapshot(row.lessonKey)`：
 * 子 CUI 的 `addLessonReviewAsset / generateLessonReports / sendLessonReport` 等任何
 * 改写都会触发同一个 CHANGE_EVENT，本卡内的对应行立即重渲染——
 * 与子 CUI 风采卡的内容保持实时同步，不需要刷新或手动 poll。
 */
function ReviewRowBody({
  row,
  role,
  status,
  onOpen,
}: {
  row: DerivedRow
  role: EduSceneRole
  status: FulfillmentStatus
  onOpen: () => void
}) {
  /**
   * 同时把卡上的 lessonTitle 写回 review store —— 与子 CUI `LessonReviewCard` 一致：
   * 这样跨入口先开本卡再开子 CUI 时，子 CUI 顶栏 GenericCard 的标题
   * `风采点评 · {lessonTitle}` 不会回退成默认的"本节课程"。
   */
  React.useEffect(() => {
    setLessonReviewMeta(row.lessonKey, row.lessonTitle)
  }, [row.lessonKey, row.lessonTitle])

  const snap = useLessonReviewSnapshot(row.lessonKey)
  const sentReports = snap.reports.filter((r) => r.sendStatus === "sent")
  const hasSent = sentReports.length > 0
  /** 草稿就位但都还没发：reportsGenerated 是 generateLessonReports 后的标志 */
  const draftReports = snap.reports.filter(
    (r) => r.sendStatus === "draft" || r.sendStatus === "skipped",
  )
  const hasReadyDrafts =
    status === "completed" && snap.reportsGenerated && draftReports.length > 0

  if (hasSent) {
    return (
      <ReviewSentBody
        role={role}
        snap={snap}
        sentCount={sentReports.length}
        teacherName={row.schedule.teacherName ?? "王老师"}
        onOpen={onOpen}
      />
    )
  }
  if (hasReadyDrafts) {
    return (
      <ReviewDraftReadyBody
        role={role}
        snap={snap}
        draftCount={draftReports.length}
        onOpen={onOpen}
      />
    )
  }
  return <ReviewDraftBody role={role} status={status} snap={snap} onOpen={onOpen} />
}

/**
 * 已发态：与子 CUI《风采点评 / 风采报告》卡 PUBLISHED 子型视觉一致
 *
 * 顶栏 + 主体按视角分两套：
 *
 * 老师 / 机构管理者
 *   - 顶栏：「✨ 已发出 N 份风采点评」+ 横向滚动孩子头像（≥2 时出）
 *   - 主体：SocialFeedCard —— "关于该孩子的风采社交流卡"，与子 CUI
 *     `TeacherSentHistoryCurrentLesson` 共用同一组件，老师视角下"以孩子为主体"
 *     正合"巡查 / 抽样"的语义。
 *
 * 学生 / 家长
 *   - 顶栏：「✨ {teacherName}给{你/孩子}发了本节课的风采报告」
 *     —— 把"我视角"摆在第一位，避免"6 份"这种老师统计语在用户侧出现。
 *   - 主体：TeacherToMeReportCard —— 头像 / 抬头都改成"老师"，框架成
 *     "一封老师写给我的本节课风采报告"，下方按"班级总结 / 给我的点评 / 我的精彩瞬间"
 *     三段拆开，读者关系不再被"林小安发了..." 这种孩子发主帖的视觉误导。
 */
function ReviewSentBody({
  role,
  snap,
  sentCount,
  teacherName,
  onOpen,
}: {
  role: EduSceneRole
  snap: LessonReviewSnapshot
  sentCount: number
  teacherName: string
  onOpen: () => void
}) {
  const sent = React.useMemo(
    () => snap.reports.filter((r) => r.sendStatus === "sent"),
    [snap.reports],
  )

  /**
   * 学生 / 家长仅看自家孩子的那一条（与子 CUI `StudentOrParentReportPanel` 语义一致）。
   * 演示场景里"自家孩子"统一为 `林小安`（与 lessonReviewStore.getSelfStudentName 对齐）。
   */
  const visibleSent = React.useMemo(() => {
    if (role === "student" || role === "parent") {
      return sent.filter((r) => r.studentName === "林小安")
    }
    return sent
  }, [sent, role])

  /** 当前选中的孩子；列表变化时自动锁定到首项 */
  const [activeName, setActiveName] = React.useState<string | null>(null)
  React.useEffect(() => {
    if (visibleSent.length === 0) {
      setActiveName(null)
      return
    }
    if (!activeName || !visibleSent.some((r) => r.studentName === activeName)) {
      setActiveName(visibleSent[0]!.studentName)
    }
  }, [visibleSent, activeName])
  const activeReport =
    visibleSent.find((r) => r.studentName === activeName) ?? visibleSent[0] ?? null

  const isLearnerSide = role === "student" || role === "parent"

  if (visibleSent.length === 0) {
    return (
      <div className="flex flex-col gap-[var(--space-200)]">
        {!isLearnerSide ? (
          <div className="inline-flex items-center gap-[var(--space-150)] text-[length:var(--font-size-sm)] text-text-secondary">
            <Sparkles className="h-4 w-4 text-[var(--color-success)]" />
            <span>{`已发出 ${sentCount} 份风采点评`}</span>
          </div>
        ) : null}
        <p className="m-0 text-[length:var(--font-size-xs)] text-text-tertiary">
          {isLearnerSide
            ? `本节${teacherName}暂未为${role === "parent" ? "孩子" : "你"}单独发出风采报告，点击整条课程可看班级共享内容。`
            : "暂无可展示的孩子风采。"}
        </p>
      </div>
    )
  }

  /**
   * 学生 / 家长视角天然只看一份（自家孩子）—— 头像 strip 上只会孤零零站一个 avatar，反而冗余。
   * 老师 / admin 视角且 ≥2 个孩子才出 strip。
   */
  const showStrip = !isLearnerSide && visibleSent.length > 1

  return (
    <div className="flex flex-col gap-[var(--space-250)]">
      {/**
       * 学生 / 家长侧把"摘要文案"删掉：与下方 TeacherToMeReportCard 抬头
       * 「{老师} 给{你/孩子}发了本节课的风采报告」完全重复，留着只增加视觉噪声。
       * 老师 / admin 视角仍保留"已发出 N 份风采点评"作为运营统计提示。
       */}
      {!isLearnerSide ? (
        <div className="flex flex-wrap items-center gap-[var(--space-200)]">
          <div className="inline-flex items-center gap-[var(--space-150)] text-[length:var(--font-size-sm)] text-text-secondary">
            <Sparkles className="h-4 w-4 text-[var(--color-success)]" />
            <span>{`已发出 ${sentCount} 份风采点评`}</span>
          </div>
        </div>
      ) : null}

      {showStrip ? (
        <StudentAvatarStrip
          students={visibleSent}
          activeName={activeReport?.studentName ?? null}
          onPick={setActiveName}
        />
      ) : null}

      {activeReport ? (
        isLearnerSide ? (
          <TeacherToMeReportCard
            role={role as "student" | "parent"}
            report={activeReport}
            assets={snap.assets}
            classSummary={snap.classSummary}
            teacherName={teacherName}
            onLike={onOpen}
          />
        ) : (
          <div>
            <SocialFeedCard
              report={activeReport}
              assets={snap.assets}
              actionLike={onOpen}
            />
            <div className="mt-[var(--space-150)] flex items-center justify-between gap-[var(--space-150)]">
              <span className="text-[length:var(--font-size-xs)] text-text-tertiary">
                附 {activeReport.assetIds.length} 段素材 ·{" "}
                {formatRelative(activeReport.sentAt ?? Date.now())} 已发
              </span>
            </div>
          </div>
        )
      ) : null}
    </div>
  )
}

/**
 * 学生 / 家长侧的"老师 → 我"风采报告卡
 *
 * 设计意图
 * --------------------------------------------------
 * 子 CUI 的 SocialFeedCard 把"孩子"放在抬头位（avatar + 名 + sentence），
 * 在子 CUI 里因为 GenericCard 顶栏已经写明"风采报告 · 林小安"，问题不大；
 * 但搬到列表卡的行内时，读者只会看到"林"头像 + "林小安"姓名 + 老师写的句子，
 * 视觉上像是孩子发的主帖（PRD §4.1 的语义并不希望孩子是发布者）。
 *
 * 这里另起一套布局：
 *   - 头像 / 抬头 = 老师（强调"老师写给我"）
 *   - 抬头副文："给{你/孩子}发了本节课的风采报告"
 *   - 中段三块拆开：① 班级总结  ② 给我（孩子）的点评  ③ 我（孩子）的精彩瞬间
 *   - 底部保留 ❤ / 💬 入口（点击仍引导到子 CUI 完成赞 / 评，避免双向 mutate 复杂度）
 */
function TeacherToMeReportCard({
  role,
  report,
  assets,
  classSummary,
  teacherName,
  onLike,
}: {
  role: "student" | "parent"
  report: LessonStudentReport
  assets: LessonReviewAsset[]
  classSummary: string
  teacherName: string
  onLike: () => void
}) {
  const recipient = role === "parent" ? `孩子（${report.studentName}）` : "你"
  const matchedAssets = React.useMemo(
    () =>
      report.assetIds
        .map((id) => assets.find((a) => a.id === id))
        .filter((a): a is LessonReviewAsset => Boolean(a)),
    [report.assetIds, assets],
  )
  const sentLabel = `${formatRelative(report.sentAt ?? Date.now())} 已发`
  const likeCount = (report.parentLiked ? 1 : 0) + (report.studentLiked ? 1 : 0)

  return (
    <div className="overflow-hidden rounded-[var(--radius-md)] border border-border bg-bg">
      {/* 抬头：老师作为发件人 */}
      <div className="flex items-start gap-[var(--space-200)] border-b border-border bg-bg-tertiary/40 px-[var(--space-250)] py-[var(--space-200)]">
        <span
          className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--color-primary)]/12 text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-[var(--color-primary)]"
          aria-hidden
        >
          {teacherName.slice(0, 1)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-[var(--space-150)]">
            <span className="text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-text">
              {teacherName}
            </span>
            <span className="text-[length:var(--font-size-xs)] text-text-tertiary">
              {sentLabel}
            </span>
          </div>
          <p className="m-0 mt-[2px] text-[length:var(--font-size-xs)] text-text-secondary">
            给{recipient}发了本节课的风采报告
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-[var(--space-250)] px-[var(--space-250)] py-[var(--space-250)]">
        {/* ① 班级总结 */}
        {classSummary ? (
          <ReportSection
            label="本节课总结"
            tone="neutral"
            body={
              <p className="m-0 text-[length:var(--font-size-sm)] leading-relaxed text-text-secondary">
                {classSummary}
              </p>
            }
          />
        ) : null}

        {/* ② 给我（孩子）的点评 */}
        <ReportSection
          label={`老师对${recipient}的点评`}
          tone="primary"
          body={
            <p className="m-0 text-[length:var(--font-size-sm)] leading-relaxed text-text">
              {report.sentence}
            </p>
          }
        />

        {/* ③ 风采素材 */}
        <ReportSection
          label={`${role === "parent" ? "孩子" : "你"}的精彩瞬间 · ${matchedAssets.length} 段`}
          tone="neutral"
          body={
            matchedAssets.length > 0 ? (
              <div className="grid grid-cols-2 gap-[var(--space-150)] sm:grid-cols-3">
                {matchedAssets.map((a) => (
                  <ReportAssetThumb key={a.id} asset={a} />
                ))}
              </div>
            ) : (
              <p className="m-0 text-[length:var(--font-size-xs)] text-text-tertiary">
                暂无素材片段
              </p>
            )
          }
        />
      </div>

      {/* 底部：点赞 / 评论入口（双向写仍走子 CUI 完成） */}
      <div className="flex items-center gap-[var(--space-300)] border-t border-border px-[var(--space-250)] py-[var(--space-150)]">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onLike()
          }}
          className="inline-flex items-center gap-[var(--space-100)] text-[length:var(--font-size-xs)] text-text-secondary transition-colors hover:text-[var(--color-primary)]"
        >
          <Heart className="h-3.5 w-3.5" />
          {likeCount}
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onLike()
          }}
          className="inline-flex items-center gap-[var(--space-100)] text-[length:var(--font-size-xs)] text-text-secondary transition-colors hover:text-[var(--color-primary)]"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          {(report.comments ?? []).length}
        </button>
      </div>
    </div>
  )
}

function ReportSection({
  label,
  tone,
  body,
}: {
  label: string
  tone: "neutral" | "primary"
  body: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-[var(--space-100)]">
      <div className="inline-flex items-center gap-[var(--space-100)]">
        <span
          aria-hidden
          className={cn(
            "inline-block h-3 w-[2px] rounded-sm",
            tone === "primary"
              ? "bg-[var(--color-primary)]"
              : "bg-[var(--color-border-strong,var(--color-border))]",
          )}
        />
        <span className="text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] text-text-tertiary">
          {label}
        </span>
      </div>
      <div>{body}</div>
    </div>
  )
}

function ReportAssetThumb({ asset }: { asset: LessonReviewAsset }) {
  const isVideo = asset.type === "video"
  return (
    <div className="relative h-[96px] overflow-hidden rounded-[var(--radius-sm)] border border-border bg-[linear-gradient(135deg,#eef5ff,#f5efff)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(120,140,255,0.35),transparent_45%),radial-gradient(circle_at_80%_80%,rgba(87,214,255,0.25),transparent_45%)]" />
      <div className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/45 px-2 py-[2px] text-[10px] text-white">
        {isVideo ? <Video className="h-3 w-3" /> : <Camera className="h-3 w-3" />}
        {isVideo ? "视频" : "照片"}
      </div>
      <div className="absolute bottom-2 left-2 right-2 truncate text-[10px] text-text-tertiary">
        {asset.name}
      </div>
    </div>
  )
}

/**
 * 横向头像 chip 列表：超过宽度可水平滚动；当前选中态在 avatar 周围加主色环 + 名字加粗。
 *
 * 视觉与子 CUI 通讯录 / 学生选择条同源，但更轻量（不带 hover 卡片、不带操作菜单）。
 */
function StudentAvatarStrip({
  students,
  activeName,
  onPick,
}: {
  students: LessonStudentReport[]
  activeName: string | null
  onPick: (name: string) => void
}) {
  return (
    <div
      className="-mx-[var(--space-100)] flex items-stretch gap-[var(--space-200)] overflow-x-auto px-[var(--space-100)] pb-[var(--space-100)] [scrollbar-width:thin]"
      role="tablist"
      aria-label="已发风采的孩子"
    >
      {students.map((r) => {
        const isActive = r.studentName === activeName
        return (
          <button
            key={r.studentName}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={(e) => {
              e.stopPropagation()
              onPick(r.studentName)
            }}
            className={cn(
              "flex shrink-0 flex-col items-center gap-[var(--space-100)] rounded-[var(--radius-md)] px-[var(--space-150)] py-[var(--space-100)] transition-colors",
              isActive
                ? "bg-[var(--color-primary)]/8"
                : "hover:bg-[var(--black-alpha-11)]",
            )}
          >
            <span
              className={cn(
                "grid size-9 shrink-0 place-items-center rounded-full bg-[var(--color-primary)]/12 text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-[var(--color-primary)] transition-shadow",
                isActive
                  ? "ring-2 ring-[var(--color-primary)] ring-offset-2 ring-offset-bg"
                  : "",
              )}
              aria-hidden
            >
              {r.studentName.slice(0, 1)}
            </span>
            <span
              className={cn(
                "max-w-[64px] truncate text-[length:var(--font-size-xs)] leading-none",
                isActive
                  ? "font-[var(--font-weight-medium)] text-[var(--color-primary)]"
                  : "text-text-secondary",
              )}
            >
              {r.studentName}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/**
 * 草稿就位态（课后已点 ✨ 一键生成 但还没全发）
 *
 * - 老师 / 机构管理者：「📷 草稿 N/M · 进入子 CUI 审核 / 全发」
 *   不重复出"一键生成"按钮（已经生成过，再点会清空草稿造成数据丢失）；
 *   也不在主对话直接做"全发"——这是高破坏性写操作，仅在子 CUI 审核流里允许。
 * - 学生 / 家长：草稿是教师内部状态，对外仍是"老师正在整理"的等待文案。
 */
function ReviewDraftReadyBody({
  role,
  snap,
  draftCount,
  onOpen: _onOpen,
}: {
  role: EduSceneRole
  snap: LessonReviewSnapshot
  draftCount: number
  onOpen: () => void
}) {
  const isTeacherOrAdmin = role === "teacher" || role === "admin"
  const totalReports = snap.reports.length
  const summary = isTeacherOrAdmin
    ? `📷 草稿 ${draftCount}/${totalReports} · 已发 0`
    : role === "parent"
      ? "📷 老师正在为本节课整理孩子的风采报告，发送时会在主对话提醒你"
      : "📷 老师正在为本节课整理风采报告，发送时会在主对话提醒你"

  return (
    <div className="flex flex-col gap-[var(--space-200)]">
      <div className="flex flex-wrap items-center gap-[var(--space-200)]">
        <div className="inline-flex items-center gap-[var(--space-150)] text-[length:var(--font-size-sm)] text-text-secondary">
          <Sparkles className="h-4 w-4 text-[var(--color-warning,#f59e0b)]" />
          <span>{summary}</span>
        </div>
      </div>
    </div>
  )
}

/**
 * 未发布态：按"课次生命周期 (status) × 角色"决定文案与按钮可见性
 *
 * 决策表（与 PRD §4.3.1 / §4.5 / §4.6 对齐）
 * --------------------------------------------------
 * 老师 / 机构管理者
 *   - pending / soon (课前)：仅文案"本节尚未开始"；不出 上传 / 一键生成 / 进子 CUI 之外的按钮
 *   - in (课中)：可"继续上传"素材；尚未生成（生成是课后唯一显式入口）
 *   - completed (课后)：上传 + ✨ 一键生成风采点评（PRD 唯一显式入口）
 * 学生 / 家长
 *   - 任何阶段（未发）都不出"继续上传 / 一键生成"按钮 —— 这两个是老师侧动作；
 *     文案按 PRD §4.5 / §4.6 给出对应等待提示。
 *
 * 任何阶段都保留"进入子 CUI"作为兜底入口（点击行标题 bar 也是同一入口）。
 */
function ReviewDraftBody({
  role,
  status,
  snap,
  onOpen: _onOpen,
}: {
  role: EduSceneRole
  status: FulfillmentStatus
  snap: LessonReviewSnapshot
  onOpen: () => void
}) {
  const assetCount = snap.assets.length
  const isTeacherOrAdmin = role === "teacher" || role === "admin"
  const isPre = status === "pending" || status === "soon"
  const isIn = status === "in"
  const isPost = status === "completed"

  /** 行内文案（与 PRD §4.5 / §4.6 对齐） */
  const summary = (() => {
    if (isTeacherOrAdmin) {
      if (isPre) return "本节尚未开始 · 上课时可拍 / 传素材"
      if (isIn) return `本节进行中 · 已采集 ${assetCount} 项素材`
      // post
      return assetCount > 0
        ? `本节已结束 · 待生成 ${assetCount} 素材`
        : "本节已结束 · 暂无素材，可补传后再生成"
    }
    /** 学生 / 家长（仅未发布态走到这里） */
    const subj = role === "parent" ? "孩子的风采报告" : "风采报告"
    if (isPre) return `📷 ${subj}还没生成，老师会在本节课结束后整理并发送给你`
    if (isIn) return `📷 本节正在进行，老师课后会整理${subj}并发送`
    return `📷 老师正在为本节课整理${subj}，发送时会在主对话提醒你`
  })()

  return (
    <div className="flex flex-col gap-[var(--space-200)]">
      <div className="flex flex-wrap items-center gap-[var(--space-200)]">
        <div className="inline-flex items-center gap-[var(--space-150)] text-[length:var(--font-size-sm)] text-text-secondary">
          <Camera className="h-4 w-4 text-text-tertiary" />
          <span>{summary}</span>
        </div>
      </div>
      {/**
       * 素材缩略列表：仅老师 / admin 视角、且课中或课后有素材时展示
       * （课前阶段不展示——还没开始拍，硬塞空状态会显得凌乱）
       */}
      {isTeacherOrAdmin && (isIn || isPost) && assetCount > 0 ? (
        <div className="flex flex-wrap gap-[var(--space-150)]">
          {snap.assets.slice(0, 6).map((a) => (
            <span
              key={a.id}
              className="inline-flex h-8 items-center gap-[var(--space-100)] rounded-[var(--radius-sm)] border border-border bg-bg px-[var(--space-200)] text-[length:var(--font-size-xs)] text-text-secondary"
            >
              {a.type === "video" ? (
                <Video className="h-3.5 w-3.5 text-text-tertiary" />
              ) : (
                <FileImage className="h-3.5 w-3.5 text-text-tertiary" />
              )}
              {a.name}
            </span>
          ))}
          {assetCount > 6 ? (
            <span className="inline-flex h-8 items-center rounded-[var(--radius-sm)] border border-dashed border-border bg-bg px-[var(--space-200)] text-[length:var(--font-size-xs)] text-text-tertiary">
              还有 {assetCount - 6} 项
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

/* ============================================================
 * 共享小工具
 * ============================================================ */
function RowMiniButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className="inline-flex h-7 items-center gap-[var(--space-100)] rounded-[var(--radius-sm)] border border-border bg-bg px-[var(--space-200)] text-[length:var(--font-size-xs)] text-text-secondary transition-colors hover:bg-[var(--black-alpha-11)] hover:text-text"
    >
      <Icon className="h-3 w-3" />
      {label}
    </button>
  )
}

function EmptyDay({ kind }: { kind: LessonOperationListCardKind }) {
  const hint =
    kind === "materials"
      ? "切换日期查看其他日子的资料；或在「课程课表」给课程新建排课表。"
      : kind === "attendance"
        ? "切换日期查看其他日子的考勤数据。"
        : kind === "homework"
        ? "切换日期查看其他日子的作业；有课程时点击对应课程可派发本节随堂练习。"
        : "切换日期查看其他日子的风采；有课程时点击对应课程可拍摄 / 上传课中素材。"
  return (
    <div className="flex w-full flex-col items-center justify-center gap-[var(--space-100)] rounded-[var(--radius-md)] border border-dashed border-border bg-bg-tertiary px-[var(--space-300)] py-[var(--space-500)]">
      <p className="m-0 text-[length:var(--font-size-sm)] text-text-secondary">
        当天暂无课程。
      </p>
      <p className="m-0 text-[length:var(--font-size-xs)] text-text-tertiary">{hint}</p>
    </div>
  )
}

function FooterPagination({ total }: { total: number }) {
  return (
    <div className="flex items-center justify-between text-[length:var(--font-size-xs)] text-text-tertiary">
      <span>共 {total} 条</span>
      <div className="flex items-center gap-[var(--space-150)]">
        <PagerArrow ariaLabel="上一页" disabled>
          <ChevronLeft className="h-3.5 w-3.5" />
        </PagerArrow>
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-primary)]/45 bg-[var(--color-primary)]/8 text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] text-[var(--color-primary)]">
          1
        </span>
        <PagerArrow ariaLabel="下一页">
          <ChevronRight className="h-3.5 w-3.5" />
        </PagerArrow>
        <button
          type="button"
          className="inline-flex h-7 items-center gap-[var(--space-100)] rounded-[var(--radius-sm)] border border-border bg-bg px-[var(--space-200)] text-[length:var(--font-size-xs)] text-text transition-colors hover:bg-[var(--black-alpha-11)]"
        >
          10 / page
          <ChevronDown className="h-3 w-3 text-text-tertiary" />
        </button>
      </div>
      <span>共 1 页</span>
    </div>
  )
}

function PagerArrow({
  ariaLabel,
  disabled,
  children,
}: {
  ariaLabel: string
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] border border-border bg-bg text-text-secondary transition-colors",
        disabled
          ? "cursor-not-allowed text-text-tertiary opacity-60"
          : "hover:bg-[var(--black-alpha-11)] hover:text-text",
      )}
    >
      {children}
    </button>
  )
}

/* ============================================================
 * 工具函数
 * ============================================================ */

function startOfDay(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function startOfWeekMonday(ts: number): number {
  const d = new Date(startOfDay(ts))
  const day = d.getDay()
  const daysFromMonday = day === 0 ? 6 : day - 1
  d.setDate(d.getDate() - daysFromMonday)
  return d.getTime()
}

function buildWeekDays(monday: number): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(d.getDate() + i)
    return d
  })
}

function pad2(n: number): string {
  return String(n).padStart(2, "0")
}

function formatHHmm(ts: number): string {
  const d = new Date(ts)
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

function formatRelative(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60 * 1000) return "刚刚"
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / 3600000)} 小时前`
  return `${Math.floor(diff / 86400000)} 天前`
}

function deriveStatus(o: ScheduleOccurrence, nowTs: number): FulfillmentStatus {
  if (o.endAt < nowTs) return "completed"
  if (o.startAt <= nowTs && nowTs <= o.endAt) return "in"
  if (o.startAt - nowTs <= 60 * 60 * 1000) return "soon"
  return "pending"
}

function deriveSeriesId(course: CourseRecord): string {
  /** 与 EduCourseFulfillmentCard 完全一致的派生规则 */
  return course.seeded ? course.id.replace(/^course-/, "") : `synth-${course.id}`
}

/** 与履约卡 mapFulfillmentActionToCommand 中文标签对齐 */
function actionLabelForKind(kind: LessonOperationListCardKind): string {
  if (kind === "materials") return "资料"
  if (kind === "attendance") return "签到"
  if (kind === "homework") return "作业"
  return "风采点评"
}

function headerSubtitleByKind(
  kind: LessonOperationListCardKind,
  role: EduSceneRole,
  todayCount: number,
): string {
  const dayHint = todayCount > 0 ? `今天 ${todayCount} 节` : "切换日期看其它课程"
  if (kind === "materials")
    return role === "teacher" || role === "admin"
      ? `按课次维度查看 / 上传 / 删除资料；点击整条课程进入资料卡 · ${dayHint}`
      : `按课次维度查看老师已发出的资料；点击整条课程看更详细的资料卡 · ${dayHint}`
  if (kind === "attendance")
    return role === "teacher" || role === "admin"
      ? `按课次维度查看整体出勤数据；展开看每个孩子（含请假 / 调课）· ${dayHint}`
      : `按课次维度查看你（孩子）的考勤；可发起请假 / 调课 · ${dayHint}`
  if (kind === "homework")
    return role === "teacher" || role === "admin"
      ? `按课次维度查看作业派发与批改概况；点击整条课程派发 / 批阅 · ${dayHint}`
      : `按课次维度查看作业进度；点击整条课程做作业 / 看陪练建议 · ${dayHint}`
  // review
  return role === "teacher" || role === "admin"
    ? `区分「已发风采点评」与「待发素材」两种态；点击整条课程继续处理 · ${dayHint}`
    : `老师已发布的风采报告默认展示前 2 份，可展开看更多 · ${dayHint}`
}
