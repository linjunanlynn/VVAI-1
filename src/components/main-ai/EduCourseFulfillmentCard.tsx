/**
 * 课程履约（Course Fulfillment）卡片 —— 完全切换到 store 驱动
 *
 * 数据来源
 * ----------------------------------------------------
 * 之前：本文件内静态 FULFILLMENT_DAY_ITEMS（与排课表流程脱节）
 * 现在：`eduCoursesPersistence.listScheduleOccurrencesInRange(...)`
 *      派生当前选中日期所在周内全部 finalized 排课表的 occurrences，
 *      与 `EduCourseProductsCard` / `CreateScheduleCard` 同源。
 *
 * 状态徽章 ↔ 时间事实（由 occurrence.startAt / endAt / Date.now() 决定）
 * ----------------------------------------------------
 *  - completed  : endAt   <  now                   →「已完课」灰
 *  - in         : startAt <= now <= endAt           →「上课中」主色 + 脉冲
 *  - soon       : now <= startAt <= now + 60min     →「即将开始」主色
 *  - pending    : startAt > now + 60min             →「待开始」info
 *
 * 行交互
 * ----------------------------------------------------
 * - 点击行（标题区）/ 任一操作图标 → onOpenSeries(seriesId)
 *   demo 种子课程 id 形如 `course-series-...`，去掉前缀即原 series id；
 *   非种子课程也直接把 `course.id` 透下去，由父级兜底。
 * - 行最左色条跟 schedule.color；多张排课表混排时颜色互斥。
 *
 * 选周交互
 * ----------------------------------------------------
 * - WeekStrip 高亮 selectedDate；点击切到那一天
 * - Toolbar：今天 / ← / → 三个按钮；月份 chip 跟 selectedDate 同步
 */
import * as React from "react"
import {
  Ban,
  BookOpen,
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  GraduationCap,
  MapPin,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  User as UserIcon,
  UsersRound,
  type LucideIcon,
} from "lucide-react"
import { cn } from "../ui/utils"
import type { EduSceneRole } from "./homeScenarioLayout"
import type { EducationStage } from "./educationStageDemo"
import {
  listScheduleOccurrencesInRange,
  removeScheduleOccurrence,
  scheduleColorToHsl,
  setScheduleOccurrenceCancelled,
  subscribeEduCourses,
  updateScheduleOccurrence,
  type CourseRecord,
  type ScheduleOccurrence,
  type ScheduleRecord,
  type SpaceContext,
} from "./eduCoursesPersistence"
import { getLessonBottomQuickActions } from "./lessonBottomQuickActions"
import {
  AddScheduleTimeSheet,
  type AddScheduleTimeSheetSubmit,
} from "./AddScheduleTimeSheet"

/**
 * 行底部按钮的描述符。
 *
 * - kind="dock"：来自课程子 CUI 输入框上方应用条，点击 = 进入子 CUI 并执行对应 action
 * - kind="edit" / "cancel" / "delete"：管理操作，仅老师/管理者可见
 *
 * `disabled` 用于「未取消不可直删」「学生/家长可点 dock 但隐藏 manage」等场景；
 * 渲染层基于 kind + disabled + cancelled 决定颜色 / hover 文案。
 */
type RowActionKind = "dock" | "edit" | "cancel" | "delete"

interface RowActionItem {
  id: string
  /** hover 时展示的应用名称 */
  label: string
  Icon: LucideIcon
  kind: RowActionKind
  /** dock 类按钮：进入子 CUI 时透传的 action label */
  dockActionLabel?: string
  disabled?: boolean
  /** 仅渲染层用：管理按钮的语义色（取消=橙、删除=红） */
  tone?: "default" | "warn" | "danger"
}

/**
 * 由 role + 当前 occurrence 状态构造一行底部图标按钮：
 *
 *  1. dock 段：完全跟「课程子 CUI 输入框上方应用条」一致（同一份 source of truth），
 *     图标顺序、个数、可见性都由 `getLessonBottomQuickActions(role)` 决定；
 *     hover label = 应用名称。
 *  2. manage 段：仅老师/管理者可见
 *     - 编辑（Pencil）
 *     - 取消（Ban） / 恢复（RotateCcw，已取消时）
 *     - 删除（Trash2） —— **只有 cancelled=true 时才 enabled**，否则置灰禁用，
 *       hover label 提示「请先取消」，避免直接清除未取消的排课。
 *
 * admin 在 lessonBottomQuickActions 里没有专用映射，统一视作 teacher
 * （管理者也需要看 prep / 风采 等入口），与 fulfillment 卡现有口径保持一致。
 */
function buildRowActions(
  role: EduSceneRole,
  cancelled: boolean,
): RowActionItem[] {
  const isManager = role === "teacher" || role === "admin"
  const dockRole = role === "admin" ? "teacher" : role
  const dock = getLessonBottomQuickActions(dockRole)
  const dockItems: RowActionItem[] = dock.map((a) => ({
    id: `dock-${a.id}`,
    label: a.label,
    Icon: a.icon,
    kind: "dock",
    dockActionLabel: a.label,
  }))
  if (!isManager) return dockItems
  return [
    ...dockItems,
    {
      id: "manage-edit",
      label: "编辑",
      Icon: Pencil,
      kind: "edit",
      tone: "default",
      /** 已取消的不再允许改时间（取消就是终态） */
      disabled: cancelled,
    },
    cancelled
      ? {
          id: "manage-restore",
          label: "恢复",
          Icon: RotateCcw,
          kind: "cancel",
          tone: "warn",
        }
      : {
          id: "manage-cancel",
          label: "取消",
          Icon: Ban,
          kind: "cancel",
          tone: "warn",
        },
    {
      id: "manage-delete",
      label: cancelled ? "删除" : "删除（请先取消）",
      Icon: Trash2,
      kind: "delete",
      tone: "danger",
      disabled: !cancelled,
    },
  ]
}

const WEEKDAY_LABELS_MON_FIRST = [
  "周一",
  "周二",
  "周三",
  "周四",
  "周五",
  "周六",
  "周日",
] as const

/**
 * 时间事实派生的状态（不含 cancelled）—— 这套保留给 runtimeStatus hint 透给子 CUI，
 * 避免「取消」字段渗到子 CUI 的 educationStage 同步逻辑（cancelled 在父级没意义）。
 */
type FulfillmentStatus = "completed" | "in" | "soon" | "pending"

/** UI 真正展示的状态：在 time-derived 之上多一个 cancelled 软覆盖 */
type DisplayStatus = FulfillmentStatus | "cancelled"

const FULFILLMENT_STATUS_BADGE: Record<
  DisplayStatus,
  { label: string; toneCls: string; pulse?: boolean }
> = {
  cancelled: {
    label: "已取消",
    toneCls:
      "border-[var(--color-border)] text-text-tertiary bg-[var(--color-bg-subtle)] line-through",
  },
  completed: {
    label: "已完课",
    toneCls: "border-[var(--color-border)] text-text-tertiary bg-[var(--color-bg-subtle)]",
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

const DELIVERY_LABEL: Record<CourseRecord["deliveryMode"], string> = {
  online: "线上互动教室",
  offline: "线下教室",
  hybrid: "线上 + 线下",
}

/**
 * 履约卡 → 子 CUI 的"上下文意图"：
 * - `lessonNumber`：被点击的 occurrence 在系列里的第几节，用于让系列子 CUI 自动定位到该节
 * - `runtimeStatus`：履约卡按真实时间算出来的状态；
 *   父级据此把全局 `educationStage` 同步到匹配值（仅对主线课生效），
 *   保证"卡片状态"与"子 CUI 内状态 / 欢迎语"完全一致。
 */
export interface EduCourseFulfillmentOpenHint {
  lessonNumber?: number
  runtimeStatus?: FulfillmentStatus
  actionLabel?: string
}

export interface EduCourseFulfillmentCardProps {
  role: EduSceneRole
  educationStage: EducationStage
  /** 当前空间（必填，用于驱动周视图数据） */
  ctx: SpaceContext
  /**
   * 行点击 / 操作图标 → 父级打开系列子 CUI；非 seeded 课程也把 courseId 透下来，
   * 父级判断没有匹配的 series 时可兜底成"打开课程默认课次"。
   *
   * `hint` 携带本次点击对应 occurrence 的"实时状态 + 第几节"，由父级把全局
   * `educationStage` 与系列 panel 内的 active outline 都对齐到这一节，
   * 解决"卡片状态 ↔ 子 CUI 状态"不一致问题。
   */
  onOpenSeries: (seriesId: string, hint?: EduCourseFulfillmentOpenHint) => void
}

interface DerivedRow {
  occurrenceId: string
  course: CourseRecord
  schedule: ScheduleRecord
  occurrence: ScheduleOccurrence
}

export function EduCourseFulfillmentCard({
  role,
  educationStage,
  ctx,
  onOpenSeries,
}: EduCourseFulfillmentCardProps) {
  void educationStage
  const isManager = role === "teacher" || role === "admin"

  /**
   * 编辑当前 occurrence 的弹层目标：
   * 老师/管理者点行尾"编辑"按钮 → 这里挂上 AddScheduleTimeSheet 的 editingOccurrence。
   * 注意：不把 onDeleteOccurrence 传给 sheet，避免绕过「先取消再删除」的规则。
   */
  const [editingTarget, setEditingTarget] = React.useState<{
    course: CourseRecord
    schedule: ScheduleRecord
    occurrence: ScheduleOccurrence
  } | null>(null)

  /** 选中日期：默认今天 0:00 */
  const [selectedDate, setSelectedDate] = React.useState<number>(() =>
    startOfDay(Date.now()),
  )

  /** 选中日期所在周（周一 ~ 周日） */
  const weekMonday = React.useMemo(
    () => startOfWeekMonday(selectedDate),
    [selectedDate],
  )
  const weekDays = React.useMemo(
    () => buildWeekDays(weekMonday),
    [weekMonday],
  )

  /** 订阅 store；snapshot 取整周窗口 */
  const subscribe = React.useCallback(
    (l: () => void) => subscribeEduCourses(l),
    [],
  )
  const fromTs = weekMonday
  const toTs = weekMonday + 7 * 24 * 60 * 60 * 1000
  const snapshotCache = React.useRef<{ sig: string; rows: DerivedRow[] } | null>(
    null,
  )
  const getSnapshot = React.useCallback(() => {
    const list = listScheduleOccurrencesInRange({ ctx, fromTs, toTs })
    const sig = list
      .map(
        (r) =>
          `${r.occurrence.id}:${r.occurrence.startAt}:${r.occurrence.endAt}:${r.schedule.color}:${r.course.id}`,
      )
      .join("|")
    if (snapshotCache.current && snapshotCache.current.sig === sig) {
      return snapshotCache.current.rows
    }
    const rows: DerivedRow[] = list.map((r) => ({
      occurrenceId: r.occurrence.id,
      course: r.course,
      schedule: r.schedule,
      occurrence: r.occurrence,
    }))
    snapshotCache.current = { sig, rows }
    return rows
  }, [ctx, fromTs, toTs])
  const allWeekRows = React.useSyncExternalStore(
    subscribe,
    getSnapshot,
    getSnapshot,
  )

  /** 仅取选中日期当天的 occurrences */
  const selectedDayRows = React.useMemo(() => {
    const dayStart = startOfDay(selectedDate)
    const dayEnd = dayStart + 24 * 60 * 60 * 1000
    return allWeekRows.filter(
      (r) =>
        r.occurrence.startAt >= dayStart && r.occurrence.startAt < dayEnd,
    )
  }, [allWeekRows, selectedDate])

  /** 「现在」时钟：每 60s 刷一次徽章；初始也立刻刷一次 */
  const [nowTs, setNowTs] = React.useState<number>(() => Date.now())
  React.useEffect(() => {
    const id = window.setInterval(() => setNowTs(Date.now()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  const monthLabel = React.useMemo(() => {
    const d = new Date(selectedDate)
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}`
  }, [selectedDate])

  return (
    <div className="flex w-full max-w-[min(100%,860px)] flex-col">
      <div
        className="rounded-[var(--radius-lg)] border border-border bg-bg"
        style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04)" }}
      >
        <div className="flex flex-col gap-[var(--space-300)] p-[var(--space-300)]">
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
              selectedDayRows.map((row) => (
                <FulfillmentRow
                  key={row.occurrenceId}
                  row={row}
                  role={role}
                  nowTs={nowTs}
                  onOpen={(actionLabel) => {
                    /**
                     * seeded 课程（id 形如 `course-series-...`）去掉 `course-` 后能在
                     * DEMO_SERIES_LIST 找到对应静态 series；非 seeded 课程走 `synth-`
                     * 前缀，让父级在 findLessonSeries 失败后用 buildSeriesFromCourse 兜底。
                     */
                    const seriesId = row.course.seeded
                      ? row.course.id.replace(/^course-/, "")
                      : `synth-${row.course.id}`
                    /**
                     * hint：把该行的 lessonNumber + 实时状态透给父级，
                     * 父级负责对齐 educationStage（主线课）与 active outline。
                     * 注意：runtimeStatus 永远走时间事实（不带 cancelled），
                     * 避免「取消」字段污染父级 stage 同步逻辑。
                     */
                    onOpenSeries(seriesId, {
                      lessonNumber: row.occurrence.lessonNumber || undefined,
                      runtimeStatus: deriveStatus(row.occurrence, nowTs),
                      actionLabel,
                    })
                  }}
                  onEdit={() =>
                    setEditingTarget({
                      course: row.course,
                      schedule: row.schedule,
                      occurrence: row.occurrence,
                    })
                  }
                  onToggleCancel={() =>
                    setScheduleOccurrenceCancelled({
                      ctx,
                      courseId: row.course.id,
                      scheduleId: row.schedule.id,
                      occurrenceId: row.occurrence.id,
                      cancelled: !row.occurrence.cancelled,
                    })
                  }
                  onDelete={() => {
                    if (
                      typeof window !== "undefined" &&
                      !window.confirm("确认删除该次上课时间？删除后不可恢复。")
                    ) {
                      return
                    }
                    removeScheduleOccurrence({
                      ctx,
                      courseId: row.course.id,
                      scheduleId: row.schedule.id,
                      occurrenceId: row.occurrence.id,
                    })
                  }}
                />
              ))
            ) : (
              <EmptyDay />
            )}
          </div>
          <FooterPagination total={selectedDayRows.length} />
        </div>
      </div>

      {/*
       * 编辑该次上课时间：仅老师/管理者可触发；不传 onDeleteOccurrence
       * 以确保删除必须经过「先取消再删除」的两步规则，不被表单内的红色按钮绕过。
       */}
      {isManager && editingTarget ? (
        <AddScheduleTimeSheet
          open
          onClose={() => setEditingTarget(null)}
          prefillStart={new Date(editingTarget.occurrence.startAt)}
          defaultTeacherName={editingTarget.schedule.teacherName}
          defaultDurationMinutes={editingTarget.schedule.durationMinutes}
          course={editingTarget.course}
          editingOccurrence={editingTarget.occurrence}
          onConfirm={(submit: AddScheduleTimeSheetSubmit) => {
            if (!submit.editingOccurrenceId) return
            updateScheduleOccurrence({
              ctx,
              courseId: editingTarget.course.id,
              scheduleId: editingTarget.schedule.id,
              occurrenceId: submit.editingOccurrenceId,
              startAt: submit.startAt,
              durationMinutes: submit.durationMinutes,
            })
            setEditingTarget(null)
          }}
        />
      ) : null}
    </div>
  )
}

/* ============================================================
 * 顶部工具条
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

      <button
        type="button"
        className="ml-auto inline-flex h-8 items-center gap-[var(--space-100)] rounded-[var(--radius-sm)] bg-[var(--color-primary)] px-[var(--space-300)] text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)] text-[var(--color-primary-foreground,white)] shadow-sm transition-colors hover:opacity-90"
      >
        <Plus className="h-4 w-4" />
        创建计划
      </button>
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

/* ============================================================
 * 周一 ~ 周日 日期带（可点击切日期）
 * ============================================================ */
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
 * 单条课程履约行（store 驱动）
 * ============================================================ */
function FulfillmentRow({
  row,
  role,
  nowTs,
  onOpen,
  onEdit,
  onToggleCancel,
  onDelete,
}: {
  row: DerivedRow
  role: EduSceneRole
  nowTs: number
  onOpen: (actionLabel?: string) => void
  onEdit: () => void
  onToggleCancel: () => void
  onDelete: () => void
}) {
  const { course, schedule, occurrence } = row
  const timeStatus = deriveStatus(occurrence, nowTs)
  const isCancelled = !!occurrence.cancelled
  /** 展示用 badge：取消优先于时间事实 */
  const displayStatus: DisplayStatus = isCancelled ? "cancelled" : timeStatus
  const badge = FULFILLMENT_STATUS_BADGE[displayStatus]
  const isCurrent = displayStatus === "in"
  const dotColor = scheduleColorToHsl(schedule.color)

  const timeRangeLabel = `${formatHHmm(occurrence.startAt)} – ${formatHHmm(occurrence.endAt)}`
  const dayLabel = formatDayLabel(occurrence.startAt, nowTs)

  /** 进度 N/M：N 是该 occurrence 的 lessonNumber；M 是 course.sessionCount */
  const progressText = `进度 ${occurrence.lessonNumber || "-"}/${course.sessionCount}`

  /** 行底部图标按钮：dock 段（与子 CUI 同源）+ manage 段（仅老师/管理者） */
  const rowActions = React.useMemo(
    () => buildRowActions(role, isCancelled),
    [role, isCancelled],
  )

  return (
    <div
      className={cn(
        "rounded-[var(--radius-md)] border bg-bg transition-colors",
        isCurrent
          ? "border-[var(--color-primary)]/45 shadow-[0_2px_10px_rgba(64,93,251,0.08)]"
          : "border-border",
        /** 已取消整行视觉降级（透明度 + 中性边框），保留可点击进入子 CUI 的能力 */
        isCancelled && "opacity-70",
      )}
    >
      <button
        type="button"
        onClick={() => onOpen()}
        className={cn(
          "block w-full rounded-t-[var(--radius-md)] px-[var(--space-300)] pt-[var(--space-250)] pb-[var(--space-150)] text-left transition-colors",
          "hover:bg-[var(--black-alpha-11)]",
        )}
      >
        <div className="flex flex-wrap items-center gap-x-[var(--space-250)] gap-y-[var(--space-100)]">
          {/* 颜色 dot */}
          <span
            className="inline-block h-3 w-[3px] shrink-0 rounded-sm"
            style={{ background: dotColor }}
            aria-hidden
          />
          <span
            className={cn(
              "shrink-0 text-[length:var(--font-size-md)] font-[var(--font-weight-semibold)] tabular-nums text-text",
              isCancelled && "line-through text-text-tertiary",
            )}
          >
            {timeRangeLabel}
          </span>
          <h4
            className={cn(
              "m-0 min-w-0 flex-1 truncate text-[length:var(--font-size-md)] font-[var(--font-weight-semibold)] text-text",
              isCancelled && "line-through text-text-tertiary",
            )}
          >
            {course.name}
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
        <div className="mt-[var(--space-150)] flex flex-wrap items-center gap-x-[var(--space-300)] gap-y-[var(--space-100)] text-[length:var(--font-size-xs)] text-text-secondary">
          <Tag Icon={CalendarIcon}>{dayLabel}</Tag>
          <Tag Icon={BookOpen}>{course.subject}</Tag>
          <Tag Icon={GraduationCap}>{course.stage}</Tag>
          <Tag Icon={UsersRound}>「{schedule.name || "排课表"}」</Tag>
          {schedule.teacherName ? (
            <Tag Icon={UserIcon}>{schedule.teacherName}</Tag>
          ) : null}
          <Tag Icon={ClipboardList}>{progressText}</Tag>
          <Tag Icon={MapPin}>{DELIVERY_LABEL[course.deliveryMode]}</Tag>
        </div>
      </button>

      {/*
       * 行底部图标按钮区（1:1 复刻图二 / 图三）：
       *  - 整行右对齐
       *  - 图标-only，h-7 w-7
       *  - dock 与 manage 之间用一个分隔横线视觉断开（避免老师误把 dock icon 当成"管理"）
       *  - hover label 走原生 title，无独立 tooltip 组件依赖
       */}
      <div className="flex items-center justify-end gap-[var(--space-200)] px-[var(--space-300)] pb-[var(--space-250)]">
        {rowActions.map((action, idx) => {
          const prev = rowActions[idx - 1]
          const showSeparator =
            !!prev && prev.kind === "dock" && action.kind !== "dock"
          const handleClick = (e: React.MouseEvent) => {
            e.stopPropagation() // 行底图标各自处理，不再冒泡进入 onOpen()
            if (action.disabled) return
            switch (action.kind) {
              case "dock":
                onOpen(action.dockActionLabel)
                return
              case "edit":
                onEdit()
                return
              case "cancel":
                onToggleCancel()
                return
              case "delete":
                onDelete()
                return
            }
          }
          return (
            <React.Fragment key={action.id}>
              {showSeparator ? (
                <span
                  aria-hidden
                  className="mx-[var(--space-100)] inline-block h-4 w-px shrink-0 bg-[var(--color-border)]"
                />
              ) : null}
              <button
                type="button"
                onClick={handleClick}
                title={action.label}
                aria-label={action.label}
                disabled={action.disabled}
                className={cn(
                  "inline-flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]/35",
                  action.disabled
                    ? "cursor-not-allowed text-text-tertiary opacity-50"
                    : action.tone === "danger"
                      ? "text-text-secondary hover:bg-[var(--color-error,#ef4444)]/10 hover:text-[var(--color-error,#ef4444)]"
                      : action.tone === "warn"
                        ? "text-text-secondary hover:bg-[var(--color-warning,#f59e0b)]/10 hover:text-[var(--color-warning,#f59e0b)]"
                        : "text-text-secondary hover:bg-[var(--black-alpha-11)] hover:text-text",
                )}
              >
                <action.Icon className="h-4 w-4" strokeWidth={1.8} />
              </button>
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}

function Tag({
  Icon,
  children,
}: {
  Icon: LucideIcon
  children: React.ReactNode
}) {
  return (
    <span className="inline-flex items-center gap-[var(--space-100)]">
      <Icon className="h-3.5 w-3.5 text-text-tertiary" />
      {children}
    </span>
  )
}

function EmptyDay() {
  return (
    <div className="flex w-full flex-col items-center justify-center gap-[var(--space-100)] rounded-[var(--radius-md)] border border-dashed border-border bg-bg-tertiary px-[var(--space-300)] py-[var(--space-500)]">
      <p className="m-0 text-[length:var(--font-size-sm)] text-text-secondary">
        当天暂无课程履约。
      </p>
      <p className="m-0 text-[length:var(--font-size-xs)] text-text-tertiary">
        切换日期查看其他日子的排课，或从「课程课表」给课程添加排课表。
      </p>
    </div>
  )
}

/* ============================================================
 * 底部分页（仅展示态）
 * ============================================================ */
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
 * 工具
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

function formatDayLabel(ts: number, nowTs: number): string {
  const d = new Date(ts)
  const today = startOfDay(nowTs)
  const dDay = startOfDay(ts)
  const wkLabels = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"]
  const base = `${d.getMonth() + 1}/${d.getDate()} ${wkLabels[d.getDay()]}`
  if (dDay === today) return `今天 · ${base}`
  if (dDay === today + 24 * 60 * 60 * 1000) return `明天 · ${base}`
  if (dDay === today - 24 * 60 * 60 * 1000) return `昨天 · ${base}`
  return base
}

function deriveStatus(
  o: ScheduleOccurrence,
  nowTs: number,
): FulfillmentStatus {
  if (o.endAt < nowTs) return "completed"
  if (o.startAt <= nowTs && nowTs <= o.endAt) return "in"
  if (o.startAt - nowTs <= 60 * 60 * 1000) return "soon"
  return "pending"
}
