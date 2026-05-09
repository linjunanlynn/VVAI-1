/**
 * 课表行（一节课）+ 状态徽章 —— 课表 GUI（侧面板 / 内联卡片）共用的展示原子。
 *
 * 抽出原因：
 * - `AiClassroomScheduleAgendaPanel`（侧面板形态，目前仍保留作为兼容兜底）
 * - `AiClassroomScheduleCard`（内联消息卡形态，作为"我的课表 / 孩子课表"dock 入口的主路径）
 * 两处需要完全一致的行视觉与状态徽章配色，避免后续二次漂移。
 *
 * 配色分层（见 `AGENDA_STATUS_BADGE`）：
 * - done   · 已完成        → 灰，归档语境
 * - soon   · 即将开课       → 浅 info 蓝，未来课，弱
 * - focus  · 课前准备中 / 本节·已结束 → 主色，"本节"主线，强
 * - live   · 上课中         → 绿色脉冲，"本节"主线·课中
 */

import * as React from "react"
import { ChevronRight, Clock, MapPin } from "lucide-react"
import { cn } from "../ui/utils"
import {
  AGENDA_STATUS_BADGE,
  type AiClassroomLessonSummary,
  type AgendaLessonStatus,
} from "./aiClassroomLessonsDemo"

const BADGE_TONE: Record<
  ReturnType<typeof Object.values<typeof AGENDA_STATUS_BADGE>>[number]["tone"],
  string
> = {
  done: "border-[var(--color-border)] text-text-tertiary bg-[var(--color-bg-subtle)]",
  soon: "border-[var(--color-info)]/35 text-[var(--color-info)] bg-[var(--color-info)]/8",
  focus: "border-[var(--color-primary)]/45 text-[var(--color-primary)] bg-[var(--color-primary)]/10",
  live: "border-[var(--color-success)]/50 text-[var(--color-success)] bg-[var(--color-success)]/10 animate-pulse",
}

export function StatusBadge({ status }: { status: AgendaLessonStatus }) {
  const cfg = AGENDA_STATUS_BADGE[status]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-[var(--space-200)] py-[2px] text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)]",
        BADGE_TONE[cfg.tone],
      )}
    >
      {cfg.label}
    </span>
  )
}

export interface LessonRowProps {
  lesson: AiClassroomLessonSummary
  status: AgendaLessonStatus
  /**
   * 副文案。父级**必须**按身份 + stage 通过 `getAgendaLessonSubtitle(lesson, stage, role)`
   * 算出后显式传入——课表行的副文案不再有"读 lesson 静态字段"的旧路径
   *（`briefSubtitle: string` 已拆为 `briefSubtitleByRole`，跨身份的副文案会错位，详见
   * `aiClassroomLessonsDemo.ts` 注释）。
   */
  subtitle: string
  onPick: () => void
}

export function LessonRow({ lesson, status, subtitle, onPick }: LessonRowProps) {
  const isMain = lesson.isMain
  const isLive = status === "in"
  return (
    <button
      type="button"
      onClick={onPick}
      className={cn(
        "group relative flex w-full items-stretch gap-[var(--space-300)] rounded-[var(--radius-md)] border bg-bg px-[var(--space-300)] py-[var(--space-300)] text-left transition-all",
        isMain
          ? "border-[var(--color-primary)]/45 shadow-[0_2px_10px_rgba(64,93,251,0.10)]"
          : "border-border hover:border-[var(--color-primary)]/35",
        isLive && "ring-1 ring-[var(--color-success)]/40",
      )}
    >
      {/* 时间块 */}
      <div className="flex w-[64px] shrink-0 flex-col items-start justify-center border-r border-border/60 pr-[var(--space-300)]">
        <span className="text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] text-text-tertiary">
          {lesson.weekdayLabel}
        </span>
        <span className="mt-[2px] text-[length:var(--font-size-md)] font-[var(--font-weight-bold)] tabular-nums text-text">
          {lesson.startTime}
        </span>
        <span className="text-[length:var(--font-size-xs)] text-text-tertiary tabular-nums">
          {lesson.endTime}
        </span>
      </div>

      {/* 主体 */}
      <div className="min-w-0 flex-1 self-center">
        <div className="flex items-center gap-[var(--space-200)]">
          <h3 className="m-0 truncate text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-text">
            {lesson.subject}·《{lesson.title}》
          </h3>
          {isMain && (
            <span className="inline-flex shrink-0 items-center rounded-full border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/8 px-[var(--space-200)] py-[1px] text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] text-[var(--color-primary)]">
              本节
            </span>
          )}
        </div>
        <p className="m-0 mt-[2px] flex items-center gap-[var(--space-200)] truncate text-[length:var(--font-size-xs)] text-text-tertiary">
          <span className="inline-flex items-center gap-[2px]">
            <Clock className="h-3 w-3" /> {lesson.startTime}-{lesson.endTime}
          </span>
          <span className="inline-flex items-center gap-[2px]">
            <MapPin className="h-3 w-3" /> {lesson.classroom}
          </span>
        </p>
        <p className="m-0 mt-[6px] truncate text-[length:var(--font-size-xs)] text-text-secondary">
          {subtitle}
        </p>
      </div>

      {/* 右侧状态徽章 + 进入箭头 */}
      <div className="flex shrink-0 flex-col items-end justify-between py-[2px]">
        <StatusBadge status={status} />
        <ChevronRight className="h-4 w-4 text-text-tertiary group-hover:text-[var(--color-primary)]" />
      </div>
    </button>
  )
}
