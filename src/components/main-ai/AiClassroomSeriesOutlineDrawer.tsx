/**
 * 系列课子 CUI Header 红框位置展开的"节次抽屉"。
 *
 * 设计：
 * - 由系列 panel 的 Header 进度条整行控制开/合
 * - 紧凑节次列表（max-h ~ 360px 内滚动）
 * - 每行：序号 + 标题 + 时间 + 状态徽章 + 当前定位标记 + mini 行动按钮
 * - 当前定位行高亮（左侧粗主色边）+ 显示"当前"chip
 * - mini 行动按钮：教师 ⏰ 调课、学生 / 家长 🙋 请假；仅在该节 upcoming + 没已请假 / 已调课时显示
 */

import * as React from "react"
import { Check, Clock, Layers, X } from "lucide-react"
import { cn } from "../ui/utils"
import {
  type AiClassroomLessonSeries,
  type AiClassroomSeriesLessonOutline,
} from "./aiClassroomLessonSeriesDemo"
import {
  getSeriesLeaveRecord,
  getSeriesRescheduleRecord,
  SERIES_LEAVE_TYPE_LABEL,
} from "./aiClassroomLessonSeriesPersistence"
import {
  getOutlineEffectiveStatus,
  type OutlineEffectiveStatus,
} from "./aiClassroomSeriesNavigation"
import { findLessonSummary } from "./aiClassroomLessonsDemo"
import type { EducationStage } from "./educationStageDemo"
import type { EduLessonAttendingRole } from "./homeScenarioLayout"

const STATUS_BADGE: Record<
  OutlineEffectiveStatus,
  { label: string; tone: "done" | "soon" | "focus" | "live" }
> = {
  past: { label: "已完课", tone: "done" },
  upcoming: { label: "即将上课", tone: "soon" },
  pre: { label: "课前准备中", tone: "focus" },
  in: { label: "上课中", tone: "live" },
  post: { label: "已完课", tone: "done" },
}

const BADGE_TONE: Record<"done" | "soon" | "focus" | "live", string> = {
  done: "border-[var(--color-border)] text-text-tertiary bg-[var(--color-bg-subtle)]",
  soon: "border-[var(--color-info)]/35 text-[var(--color-info)] bg-[var(--color-info)]/8",
  focus:
    "border-[var(--color-primary)]/45 text-[var(--color-primary)] bg-[var(--color-primary)]/10",
  live:
    "border-[var(--color-success)]/50 text-[var(--color-success)] bg-[var(--color-success)]/10 animate-pulse",
}

function addMinutesToClock(clock: string, minutes: number): string | null {
  const m = clock.match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return null
  const total = Number(m[1]) * 60 + Number(m[2]) + minutes
  const hh = Math.floor(total / 60) % 24
  const mm = total % 60
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`
}

function formatOutlineScheduleLabel(outline: AiClassroomSeriesLessonOutline): string {
  const summary = outline.boundLessonId ? findLessonSummary(outline.boundLessonId) : null
  if (summary) {
    return outline.scheduleLabel.replace(
      /(\d{1,2}:\d{2})/,
      `${summary.startTime}-${summary.endTime}`,
    )
  }

  const clock = outline.scheduleLabel.match(/(\d{1,2}:\d{2})/)?.[1]
  const end = clock ? addMinutesToClock(clock, 45) : null
  return clock && end ? outline.scheduleLabel.replace(clock, `${clock}-${end}`) : outline.scheduleLabel
}

export interface AiClassroomSeriesOutlineDrawerProps {
  series: AiClassroomLessonSeries
  role: EduLessonAttendingRole
  stage: EducationStage
  activeOutlineIndex: number
  onPickOutline: (outline: AiClassroomSeriesLessonOutline) => void
  /** 教师调课 mini 按钮 */
  onPickReschedule: (outline: AiClassroomSeriesLessonOutline) => void
  /** 学生 / 家长请假 mini 按钮 */
  onPickLeave: (outline: AiClassroomSeriesLessonOutline) => void
  onClose: () => void
}

export function AiClassroomSeriesOutlineDrawer({
  series,
  role,
  stage,
  activeOutlineIndex,
  onPickOutline,
  onPickReschedule,
  onPickLeave,
  onClose,
}: AiClassroomSeriesOutlineDrawerProps) {
  const listRef = React.useRef<HTMLUListElement | null>(null)
  const activeRowRef = React.useRef<HTMLLIElement | null>(null)

  React.useLayoutEffect(() => {
    const listEl = listRef.current
    const activeRowEl = activeRowRef.current
    if (!listEl || !activeRowEl) return

    // 展开抽屉后，首屏优先定位到当前课次所在行（贴近截图中的“当前节在第一行”体验）。
    // 这里做两次定位：先直接设 scrollTop，再在下一帧 scrollIntoView，避免初次展开时布局尚未稳定导致偏移。
    const alignToActiveRow = () => {
      const top = Math.max(0, activeRowEl.offsetTop - 2)
      listEl.scrollTop = top
      activeRowEl.scrollIntoView({ block: "start", inline: "nearest", behavior: "auto" })
    }

    alignToActiveRow()
    const rafId = window.requestAnimationFrame(alignToActiveRow)
    return () => window.cancelAnimationFrame(rafId)
  }, [activeOutlineIndex, series.outlines.length])

  return (
    <div className="flex w-full flex-col gap-[var(--space-150)] border-b border-border bg-[var(--color-bg-subtle)] px-[var(--space-300)] pb-[var(--space-250)] pt-[var(--space-200)]">
      <div className="flex items-center gap-[var(--space-200)]">
        <span className="inline-flex items-center gap-[var(--space-150)] text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] text-text">
          <Layers className="h-3.5 w-3.5" />
          所有课次（{series.totalLessons} 节）
        </span>
        <span className="text-[length:var(--font-size-xs)] text-text-tertiary">
          点任意一节切换到该节的对话内容
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="收起所有课次"
          className="ml-auto flex size-7 shrink-0 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-[var(--black-alpha-11)] hover:text-text"
        >
          <X className="size-[14px]" strokeWidth={2} />
        </button>
      </div>
      <ul
        ref={listRef}
        className="m-0 flex max-h-[360px] w-full list-none flex-col gap-[var(--space-150)] overflow-y-auto p-0"
        style={{ scrollbarWidth: "thin" }}
      >
        {series.outlines.map((o) => {
          const status = getOutlineEffectiveStatus(o, stage)
          const cfg = STATUS_BADGE[status]
          const isActive = o.index === activeOutlineIndex
          const reschedule = getSeriesRescheduleRecord(series.id, o.index)
          const leave =
            role === "teacher"
              ? null
              : getSeriesLeaveRecord(series.id, o.index, role as "student" | "parent")
          /** 调课 / 请假按钮仅在 upcoming 且未发生时给 */
          const showRescheduleBtn = role === "teacher" && status === "upcoming" && !reschedule
          const showLeaveBtn =
            role !== "teacher" && status === "upcoming" && !leave

          return (
            <li
              key={o.index}
              ref={isActive ? activeRowRef : null}
              className="w-full"
            >
              <div
                className={cn(
                  "group flex w-full items-stretch gap-[var(--space-250)] rounded-[var(--radius-md)] border bg-bg pl-0 pr-[var(--space-200)] py-[var(--space-200)]",
                  isActive
                    ? "border-[var(--color-primary)]/55 shadow-[0_2px_10px_rgba(64,93,251,0.12)]"
                    : "border-border",
                )}
              >
                {/* 左侧粗边（active 时显示主色） */}
                <span
                  className={cn(
                    "w-[3px] shrink-0 self-stretch rounded-l-[var(--radius-md)]",
                    isActive ? "bg-[var(--color-primary)]" : "bg-transparent",
                  )}
                  aria-hidden
                />
                {/* 序号 */}
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-bg-subtle)] text-[length:var(--font-size-xs)] font-[var(--font-weight-semibold)] text-text-secondary">
                  {o.index}
                </span>
                {/* 主体 */}
                <button
                  type="button"
                  onClick={() => onPickOutline(o)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="flex items-center gap-[var(--space-150)]">
                    <h4 className="m-0 truncate text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-text">
                      第 {o.index} 节《{o.title}》
                    </h4>
                    {isActive ? (
                      <span className="inline-flex shrink-0 items-center gap-[2px] rounded-full bg-[var(--color-primary)] px-[var(--space-150)] py-[1px] text-[10px] font-[var(--font-weight-medium)] leading-none text-[var(--color-primary-foreground,white)]">
                        <Check className="h-2.5 w-2.5" /> 当前
                      </span>
                    ) : null}
                  </div>
                  <p className="m-0 mt-[2px] flex flex-wrap items-center gap-[var(--space-200)] text-[length:var(--font-size-xs)] text-text-tertiary">
                    <span className="inline-flex items-center gap-[2px]">
                      <Clock className="h-3 w-3" />
                      {reschedule ? (
                        <>
                          <span className="line-through opacity-60">
                            {formatOutlineScheduleLabel(o)}
                          </span>
                          <span className="ml-1 text-[var(--color-primary)]">
                            → {reschedule.toLabel}
                          </span>
                        </>
                      ) : (
                        formatOutlineScheduleLabel(o)
                      )}
                    </span>
                    {leave ? (
                      <span className="inline-flex items-center gap-[2px] rounded-full border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/10 px-[var(--space-150)] text-[var(--color-warning)]">
                        已请假 · {SERIES_LEAVE_TYPE_LABEL[leave.type]}
                      </span>
                    ) : null}
                  </p>
                </button>
                {/* 右：状态 badge + mini 行动按钮 */}
                <div className="flex shrink-0 items-center gap-[var(--space-150)] self-center">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-[var(--space-200)] py-[1px] text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)]",
                      BADGE_TONE[cfg.tone],
                    )}
                  >
                    {cfg.label}
                  </span>
                  {showRescheduleBtn ? (
                    <MiniActionButton
                      label="调课"
                      icon="⏰"
                      onClick={() => onPickReschedule(o)}
                    />
                  ) : null}
                  {showLeaveBtn ? (
                    <MiniActionButton
                      label={role === "parent" ? "代请假" : "请假"}
                      icon="🙋"
                      onClick={() => onPickLeave(o)}
                    />
                  ) : null}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function MiniActionButton({
  label,
  icon,
  onClick,
}: {
  label: string
  icon: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex shrink-0 items-center gap-[2px] rounded-full border border-border bg-bg px-[var(--space-200)] py-[2px] text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] text-text transition-colors hover:bg-[var(--black-alpha-11)]"
    >
      <span aria-hidden>{icon}</span>
      {label}
    </button>
  )
}
