/**
 * 创建排课表 · 卡片（图一）
 *
 * 设计要点
 * ----------------------------------------------------
 * - 顶部信息条：课程类型 / 教学模式（从 course 派生，只读）
 * - 表单字段：
 *    1) 排课表名称 + 颜色 chip（点开 8 色 popover）
 *    2) 排课日历：周视图（默认 8:00–22:00，每小时一格）
 *       · 顶部：月份 / 今天 / 上下周 / 周(日)切换 / "已占用" 图例
 *       · 7 列日期带（今天高亮）
 *       · 时间网格：点击空白格 → onPickEmptySlot(Date) 通知父级开 AddScheduleTimeSheet
 *       · 已添加的 occurrences 在格子里以 schedule.color 着色块展示，点击 → onRemoveOccurrence
 * - 底部：取消 / 确认创建排课表
 *
 * 数据流
 * ----------------------------------------------------
 * 卡内不直接写 store；用 props 持有最新 schedule 与 course（父级用 useSyncExternalStore 订阅）。
 * 颜色 / 名称的修改通过 onUpdateMeta(patch) 由父级写 store。
 */

import * as React from "react"
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { GenericCard } from "./GenericCard"
import { cn } from "../ui/utils"
import {
  SCHEDULE_COLOR_LIST,
  scheduleColorToHsl,
  teachingFormatLabel,
  type CourseRecord,
  type ScheduleColor,
  type ScheduleOccurrence,
  type ScheduleRecord,
} from "./eduCoursesPersistence"

/**
 * 时间网格：完整 24 小时（0:00 – 23:59 含尾行 24:00 标尺位）。
 * 用 max-h + overflow-y-auto 让卡片整体可控；首次挂载自动滚到 8:00 附近，
 * 已有 occurrence 时则锚到第一节起点 -1 小时，方便用户复核。
 */
const HOUR_START = 0
const HOUR_END = 24
const HOUR_HEIGHT = 48
const TIME_COL_W = 56
const GRID_MAX_PX = 520

const WEEK_LABELS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"] as const

export interface CreateScheduleCardProps {
  course: CourseRecord
  schedule: ScheduleRecord
  /** 用户在日历空白格点击 → 父级打开 AddScheduleTimeSheet 弹层；slotStart 是该格子 0 分钟时刻 */
  onPickEmptySlot: (slotStart: Date) => void
  /**
   * 用户点击日历上已存在的 occurrence 块 → 父级打开 AddScheduleTimeSheet「编辑」模式，
   * 预填该次的日期/起始时间/单节时长，弹层内可改时间也可删除该次。
   *
   * （之前是直接 onRemoveOccurrence(o.id)，体验不可控——一不小心点错就消失，
   *   且没有"修改时间"的入口。现在统一进编辑弹层做。）
   */
  onPickOccurrence: (occurrence: ScheduleOccurrence) => void
  /** 修改 name / color */
  onUpdateMeta: (patch: { name?: string; color?: ScheduleColor }) => void
  onCancel: () => void
  /** 提交：父级先 finalizeSchedule 再 onClose */
  onConfirm: () => void
}

export function CreateScheduleCard({
  course,
  schedule,
  onPickEmptySlot,
  onPickOccurrence,
  onUpdateMeta,
  onCancel,
  onConfirm,
}: CreateScheduleCardProps) {
  /**
   * 当前周锚点 = 周一 00:00。
   *
   * 初始化策略：
   *  - 如果 schedule 已有 occurrences（"打开排课表"打开实数据 / 草稿已加过几次时间）→
   *    跳到「下一节即将来的那一周」；找不到将来节就用"第一节"那一周作 fallback。
   *    这样用户一进卡就能看见已排的彩色块，不必自己点 ◀ 翻周。
   *  - 完全空的草稿 → 用"本周"。
   *
   *  之前一律用 `startOfWeekMonday(Date.now())`，导致 seeded 课程被锚到过去的周
   *  时，本周视图整页空白——这正是用户报告的"打开课表后日历里没有占位内容"。
   */
  const [weekAnchor, setWeekAnchor] = React.useState<number>(() => {
    const occs = schedule.occurrences
    if (occs.length === 0) return startOfWeekMonday(Date.now())
    const now = Date.now()
    const upcoming = occs.find((o) => o.startAt >= now)
    const anchor = upcoming ? upcoming.startAt : occs[0]!.startAt
    return startOfWeekMonday(anchor)
  })
  const days = React.useMemo(() => buildWeekDays(weekAnchor), [weekAnchor])
  const monthLabel = React.useMemo(() => {
    const d = new Date(weekAnchor)
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}`
  }, [weekAnchor])

  /** 颜色 popover 开关 */
  const [colorOpen, setColorOpen] = React.useState(false)
  const colorRef = React.useRef<HTMLDivElement>(null)

  /**
   * 时间网格滚动容器：进入卡片后默认锚到「首条 occurrence 起点 - 1 小时」，
   * 没有 occurrence 时锚到 8:00。这样既能演示全 24h，又默认看到主营业时间段。
   */
  const gridScrollRef = React.useRef<HTMLDivElement>(null)
  const initialScrollDoneRef = React.useRef(false)
  React.useEffect(() => {
    if (initialScrollDoneRef.current) return
    const el = gridScrollRef.current
    if (!el) return
    const firstOccHour = schedule.occurrences[0]
      ? new Date(schedule.occurrences[0]!.startAt).getHours()
      : 8
    const anchorHour = Math.max(0, firstOccHour - 1)
    el.scrollTop = anchorHour * HOUR_HEIGHT
    initialScrollDoneRef.current = true
  }, [schedule.occurrences])
  React.useEffect(() => {
    if (!colorOpen) return
    const onClick = (e: MouseEvent) => {
      if (!colorRef.current) return
      if (!colorRef.current.contains(e.target as Node)) setColorOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [colorOpen])

  /** 校验：必填 */
  const [touched, setTouched] = React.useState(false)
  const nameError = touched && !schedule.name.trim() ? "请填写排课表名称" : null
  const occurrenceError =
    touched && schedule.occurrences.length === 0
      ? "请在日历上至少添加一次上课时间"
      : null

  const courseTypeLabel = course.sessionCount > 1 ? "系列课" : "单次课"

  const submit = () => {
    setTouched(true)
    if (!schedule.name.trim() || schedule.occurrences.length === 0) return
    onConfirm()
  }

  return (
    <div className="flex w-full max-w-[min(100%,720px)] flex-col">
      <GenericCard title="添加排课表">
        {/* 信息条：课程类型 / 教学模式（从 course 派生，只读） */}
        <div className="grid w-full grid-cols-2 gap-[var(--space-300)] rounded-[var(--radius-md)] border border-border bg-bg-tertiary px-[var(--space-300)] py-[var(--space-250)]">
          <div className="flex flex-col gap-[2px]">
            <span className="text-[length:var(--font-size-xs)] text-text-tertiary">
              课程类型
            </span>
            <span className="text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)] text-text">
              {courseTypeLabel}
            </span>
          </div>
          <div className="flex flex-col gap-[2px]">
            <span className="text-[length:var(--font-size-xs)] text-text-tertiary">
              教学模式
            </span>
            <span className="text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)] text-text">
              {teachingFormatLabel(course.teachingFormat)}
            </span>
          </div>
        </div>

        {/* 排课表名称 + 颜色 */}
        <FieldLabel required className="mt-[var(--space-400)]">
          排课表名称
        </FieldLabel>
        <div className="flex w-full items-center gap-[var(--space-200)]">
          <input
            type="text"
            placeholder="如：周三晚课"
            value={schedule.name}
            onChange={(e) => onUpdateMeta({ name: e.target.value })}
            className={cn(
              "h-9 min-w-0 flex-1 rounded-[var(--radius-md)] border bg-bg px-[var(--space-300)] text-[length:var(--font-size-sm)] text-text outline-none transition-colors",
              nameError
                ? "border-[var(--color-error,#ef4444)]"
                : "border-border focus:border-[var(--color-primary)]/55",
            )}
          />
          <div ref={colorRef} className="relative">
            <button
              type="button"
              onClick={() => setColorOpen((v) => !v)}
              className="flex h-9 items-center gap-[var(--space-100)] rounded-[var(--radius-md)] border border-border bg-bg px-[var(--space-200)] transition-colors hover:bg-[var(--black-alpha-11)]"
              aria-label="选择排课表颜色"
            >
              <span
                className="inline-block size-5 rounded"
                style={{ background: scheduleColorToHsl(schedule.color) }}
              />
              <ChevronDown className="size-3 text-text-tertiary" strokeWidth={1.8} />
            </button>
            {colorOpen ? (
              <div className="absolute right-0 top-[calc(100%+4px)] z-[20] grid grid-cols-4 gap-[6px] rounded-[var(--radius-md)] border border-border bg-bg p-[var(--space-200)] shadow-[0_8px_24px_rgba(15,23,42,0.16)]">
                {SCHEDULE_COLOR_LIST.map((c) => {
                  const active = c === schedule.color
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        onUpdateMeta({ color: c })
                        setColorOpen(false)
                      }}
                      aria-label={`选择 ${c} 色`}
                      className={cn(
                        "flex size-7 items-center justify-center rounded transition-transform hover:scale-105",
                        active ? "ring-2 ring-[var(--color-primary)] ring-offset-1" : "",
                      )}
                      style={{ background: scheduleColorToHsl(c) }}
                    />
                  )
                })}
              </div>
            ) : null}
          </div>
        </div>
        {nameError ? (
          <p className="m-0 mt-[var(--space-100)] text-[length:var(--font-size-xs)] text-[var(--color-error,#ef4444)]">
            {nameError}
          </p>
        ) : null}

        {/* 排课日历 */}
        <FieldLabel required className="mt-[var(--space-400)]">
          排课日历
        </FieldLabel>

        {/* 日历顶部工具条 */}
        <div className="flex w-full flex-wrap items-center gap-[var(--space-200)]">
          <button
            type="button"
            className="inline-flex h-8 items-center gap-[var(--space-100)] rounded-[var(--radius-md)] border border-transparent bg-transparent px-[var(--space-200)] text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)] text-text transition-colors hover:bg-[var(--black-alpha-11)]"
          >
            {monthLabel}
            <ChevronDown className="size-3 text-text-tertiary" strokeWidth={1.8} />
          </button>
          <button
            type="button"
            onClick={() => setWeekAnchor(startOfWeekMonday(Date.now()))}
            className="inline-flex h-8 items-center rounded-[var(--radius-md)] border border-border bg-bg px-[var(--space-250)] text-[length:var(--font-size-sm)] text-text-secondary transition-colors hover:bg-[var(--black-alpha-11)]"
          >
            今天
          </button>
          <div className="inline-flex items-center gap-[2px]">
            <button
              type="button"
              onClick={() => setWeekAnchor((a) => a - 7 * 24 * 60 * 60 * 1000)}
              aria-label="上一周"
              className="flex size-8 items-center justify-center rounded-[var(--radius-md)] text-text-secondary transition-colors hover:bg-[var(--black-alpha-11)]"
            >
              <ChevronLeft className="size-4" strokeWidth={1.8} />
            </button>
            <button
              type="button"
              onClick={() => setWeekAnchor((a) => a + 7 * 24 * 60 * 60 * 1000)}
              aria-label="下一周"
              className="flex size-8 items-center justify-center rounded-[var(--radius-md)] text-text-secondary transition-colors hover:bg-[var(--black-alpha-11)]"
            >
              <ChevronRight className="size-4" strokeWidth={1.8} />
            </button>
          </div>
          <div className="inline-flex items-center rounded-full border border-border bg-bg p-[2px]">
            <span className="inline-flex h-7 items-center rounded-full bg-[var(--color-primary)]/10 px-[var(--space-300)] text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] text-[var(--color-primary)]">
              周
            </span>
            <span className="inline-flex h-7 items-center px-[var(--space-300)] text-[length:var(--font-size-xs)] text-text-tertiary">
              日
            </span>
          </div>
          <div className="ml-auto flex items-center gap-[var(--space-100)]">
            <span
              className="inline-block h-3 w-[3px] rounded-sm"
              style={{ background: scheduleColorToHsl(schedule.color) }}
              aria-hidden
            />
            <span className="text-[length:var(--font-size-xs)] text-text-tertiary">
              已占用
            </span>
          </div>
        </div>

        {/* 日期带 */}
        <div
          className="mt-[var(--space-200)] grid w-full"
          style={{
            gridTemplateColumns: `${TIME_COL_W}px repeat(7, minmax(0, 1fr))`,
          }}
        >
          <div />
          {days.map((d, i) => {
            const isToday = isSameDay(d, new Date())
            return (
              <div
                key={i}
                className="flex items-center justify-center gap-[var(--space-100)] py-[var(--space-200)]"
              >
                <span
                  className={cn(
                    "inline-flex size-7 items-center justify-center rounded-full text-[length:var(--font-size-md)] font-[var(--font-weight-semibold)]",
                    isToday
                      ? "bg-[var(--color-primary)] text-white"
                      : "text-text",
                  )}
                >
                  {d.getDate()}
                </span>
                <span className="text-[length:var(--font-size-xs)] text-text-tertiary">
                  {WEEK_LABELS[d.getDay()]}
                </span>
              </div>
            )
          })}
        </div>

        {/* 时间网格（全 24h，溢出滚动；自动滚到最有用的小时位） */}
        <div
          ref={gridScrollRef}
          className="grid w-full overflow-y-auto rounded-[var(--radius-md)] border border-border"
          style={{
            gridTemplateColumns: `${TIME_COL_W}px repeat(7, minmax(0, 1fr))`,
            maxHeight: GRID_MAX_PX,
          }}
        >
          {Array.from({ length: HOUR_END - HOUR_START }, (_, hourIdx) => {
            const hour = HOUR_START + hourIdx
            return (
              <React.Fragment key={hour}>
                <div
                  className="border-r border-t border-border bg-bg-tertiary px-[var(--space-200)] pt-[6px] text-[length:var(--font-size-xs)] tabular-nums text-text-tertiary"
                  style={{ height: HOUR_HEIGHT }}
                >
                  {String(hour).padStart(2, "0")}:00
                </div>
                {days.map((d, di) => {
                  const slotStart = new Date(d)
                  slotStart.setHours(hour, 0, 0, 0)
                  const cellOccs = schedule.occurrences.filter((o) =>
                    isSameHour(o.startAt, slotStart.getTime()),
                  )
                  return (
                    <button
                      key={di}
                      type="button"
                      onClick={() => onPickEmptySlot(slotStart)}
                      className={cn(
                        "relative border-t border-border text-left transition-colors",
                        di < 6 ? "border-r" : "",
                        "hover:bg-[var(--color-primary)]/4",
                      )}
                      style={{ height: HOUR_HEIGHT }}
                      aria-label={`选 ${d.getMonth() + 1}/${d.getDate()} ${hour}:00`}
                    >
                      {cellOccs.map((o) => {
                        const totalMinutes = (o.endAt - o.startAt) / 60000
                        const heightPx = Math.max(
                          18,
                          (totalMinutes / 60) * HOUR_HEIGHT - 2,
                        )
                        const minuteOffset = new Date(o.startAt).getMinutes()
                        const topPx = (minuteOffset / 60) * HOUR_HEIGHT
                        return (
                          <span
                            key={o.id}
                            onClick={(e) => {
                              e.stopPropagation()
                              onPickOccurrence(o)
                            }}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault()
                                onPickOccurrence(o)
                              }
                            }}
                            className="absolute left-[2px] right-[2px] flex cursor-pointer flex-col justify-center overflow-hidden rounded-[3px] px-[6px] text-[length:var(--font-size-xs)] text-white shadow-[0_1px_2px_rgba(15,23,42,0.16)] hover:opacity-90"
                            style={{
                              top: topPx + 1,
                              height: heightPx,
                              background: scheduleColorToHsl(schedule.color),
                            }}
                            title={`${formatHHmm(o.startAt)}–${formatHHmm(o.endAt)} · 点击编辑`}
                          >
                            <span className="truncate font-[var(--font-weight-semibold)]">
                              {schedule.name || "排课表"}
                            </span>
                            <span className="truncate opacity-90">
                              {formatHHmm(o.startAt)}–{formatHHmm(o.endAt)}
                            </span>
                          </span>
                        )
                      })}
                    </button>
                  )
                })}
              </React.Fragment>
            )
          })}
        </div>
        {occurrenceError ? (
          <p className="m-0 mt-[var(--space-100)] text-[length:var(--font-size-xs)] text-[var(--color-error,#ef4444)]">
            {occurrenceError}
          </p>
        ) : null}

        {/* 底部操作 */}
        <div className="mt-[var(--space-300)] flex w-full items-center justify-end gap-[var(--space-200)]">
          <span className="mr-auto text-[length:var(--font-size-xs)] text-text-tertiary">
            已添加 {schedule.occurrences.length} 次上课时间
          </span>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-9 items-center rounded-[var(--radius-md)] border border-border bg-bg px-[var(--space-350)] text-[length:var(--font-size-sm)] text-text transition-colors hover:bg-[var(--black-alpha-11)]"
          >
            取消
          </button>
          <button
            type="button"
            onClick={submit}
            className={cn(
              "inline-flex h-9 items-center rounded-[var(--radius-md)] px-[var(--space-400)] text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-white transition-colors",
              "bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90",
            )}
          >
            确认创建排课表
          </button>
        </div>
      </GenericCard>
    </div>
  )
}

/* ============================================================
 * 子：FieldLabel
 * ============================================================ */
function FieldLabel({
  children,
  required,
  className,
}: {
  children: React.ReactNode
  required?: boolean
  className?: string
}) {
  return (
    <label
      className={cn(
        "mb-[var(--space-150)] flex shrink-0 items-center gap-[var(--space-100)] text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] text-text-secondary",
        className,
      )}
    >
      {children}
      {required ? (
        <span className="text-[var(--color-error,#ef4444)]">*</span>
      ) : null}
    </label>
  )
}

/* ============================================================
 * 工具
 * ============================================================ */

function startOfWeekMonday(ts: number): number {
  const d = new Date(ts)
  const day = d.getDay()
  const daysFromMonday = day === 0 ? 6 : day - 1
  d.setHours(0, 0, 0, 0)
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

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function isSameHour(tsA: number, tsB: number): boolean {
  const a = new Date(tsA)
  const b = new Date(tsB)
  return (
    isSameDay(a, b) &&
    a.getHours() === b.getHours()
  )
}

function formatHHmm(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}
