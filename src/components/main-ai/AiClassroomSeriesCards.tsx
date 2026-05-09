/**
 * 系列课子 CUI 内的卡片集合：
 * - 课次概览卡（SeriesOutlineCard）
 * - 调课表单卡（SeriesRescheduleFormCard，教师专属）
 * - 调课已完成回执卡（SeriesRescheduleDoneCard）
 * - 请假表单卡（SeriesLeaveFormCard，学生 / 家长）
 * - 请假已完成回执卡（SeriesLeaveDoneCard）
 *
 * 统一原则：
 * - 卡片视觉与 GenericCard 同 family（白底 + 主色 3px 短竖条 + 同 radius）
 * - 用户操作的反馈走"AI 主动说一句 + 给出下一步 chip"的同款节奏，避免死胡同
 */

import * as React from "react"
import {
  CalendarClock,
  ChevronRight,
  Clock,
  Layers,
  PackageCheck,
  User,
} from "lucide-react"
import { GenericCard } from "./GenericCard"
import { cn } from "../ui/utils"
import {
  type AiClassroomLessonSeries,
  type AiClassroomSeriesLessonOutline,
} from "./aiClassroomLessonSeriesDemo"
import {
  getSeriesRescheduleRecord,
  getSeriesLeaveRecord,
  SERIES_LEAVE_TYPE_LABEL,
  type SeriesLeaveType,
} from "./aiClassroomLessonSeriesPersistence"
import { buildRescheduleOptions } from "./aiClassroomSeriesPanelMarkers"
import type { EduLessonAttendingRole } from "./homeScenarioLayout"

/* ============================================================
 * 课次概览卡：列出整期所有课次 + 每节课的状态 + 行动按钮
 * ============================================================ */

const STATIC_STATUS_BADGE: Record<"past" | "upcoming" | "in", { label: string; tone: "done" | "soon" | "live" }> = {
  past: { label: "已完课", tone: "done" },
  upcoming: { label: "即将上课", tone: "soon" },
  in: { label: "上课中", tone: "live" },
}

const BADGE_TONE: Record<"done" | "soon" | "live", string> = {
  done: "border-[var(--color-border)] text-text-tertiary bg-[var(--color-bg-subtle)]",
  soon: "border-[var(--color-info)]/35 text-[var(--color-info)] bg-[var(--color-info)]/8",
  live: "border-[var(--color-success)]/50 text-[var(--color-success)] bg-[var(--color-success)]/10 animate-pulse",
}

export interface SeriesOutlineCardProps {
  series: AiClassroomLessonSeries
  role: EduLessonAttendingRole
  /** 整行点击 → 父级触发"打开单课子 CUI"（boundLessonId 存在时；否则 push 一句"该课次暂无 18 卡详情"） */
  onPickOutline: (outline: AiClassroomSeriesLessonOutline) => void
  /** 教师 · "调课"按钮 → push 调课表单卡 */
  onPickReschedule: (outline: AiClassroomSeriesLessonOutline) => void
  /** 学生 / 家长 · "请假"按钮 → push 请假表单卡 */
  onPickLeave: (outline: AiClassroomSeriesLessonOutline) => void
  /** 该课次绑定的系列课主线 lessonId（用于在 outline.boundLessonId === mainLessonId 时显示"上课中"badge） */
  mainLessonId: string
  /** 主线在课中（pre/in/post 中的 in） */
  isMainLessonInSession: boolean
}

export function SeriesOutlineCard({
  series,
  role,
  onPickOutline,
  onPickReschedule,
  onPickLeave,
  mainLessonId,
  isMainLessonInSession,
}: SeriesOutlineCardProps) {
  const progress = `${series.completedLessons} / ${series.totalLessons}`
  return (
    <GenericCard title={`${series.name} · 课次概览`}>
      <p className="m-0 mb-[var(--space-200)] text-[length:var(--font-size-xs)] text-text-tertiary">
        进度 {progress} · {series.periodLabel} · {series.teacher}
      </p>
      <ul className="m-0 flex w-full list-none flex-col gap-[var(--space-150)] p-0">
        {series.outlines.map((o) => {
          const reschedule = getSeriesRescheduleRecord(series.id, o.index)
          const leave =
            role === "teacher"
              ? null
              : getSeriesLeaveRecord(series.id, o.index, role as "student" | "parent")
          /** 状态推断：主线 + in → live；reschedule 已存在 → 已调课；leave 已存在 → 已请假；其它按 outline.staticStatus */
          const isMain = o.boundLessonId === mainLessonId
          const status: "past" | "upcoming" | "in" =
            isMain && isMainLessonInSession ? "in" : o.staticStatus
          const cfg = STATIC_STATUS_BADGE[status]

          return (
            <li
              key={o.index}
              className={cn(
                "flex w-full items-center gap-[var(--space-300)] rounded-[var(--radius-md)] border bg-bg px-[var(--space-300)] py-[var(--space-250)]",
                isMain
                  ? "border-[var(--color-primary)]/45 shadow-[0_2px_8px_rgba(64,93,251,0.08)]"
                  : "border-border",
              )}
            >
              {/* 左：序号 */}
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-bg-subtle)] text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-text-secondary">
                {o.index}
              </div>
              {/* 中：标题 + 时间 + 状态 */}
              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => onPickOutline(o)}
                  className="block w-full text-left"
                >
                  <div className="flex items-center gap-[var(--space-200)]">
                    <h4 className="m-0 truncate text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-text">
                      {o.title}
                    </h4>
                    {isMain ? (
                      <span className="inline-flex shrink-0 items-center rounded-full border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/8 px-[var(--space-150)] py-[1px] text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] text-[var(--color-primary)]">
                        本节主线
                      </span>
                    ) : null}
                  </div>
                  <p className="m-0 mt-[2px] flex items-center gap-[var(--space-200)] text-[length:var(--font-size-xs)] text-text-tertiary">
                    <span className="inline-flex items-center gap-[2px]">
                      <Clock className="h-3 w-3" />
                      {reschedule ? (
                        <>
                          <span className="line-through opacity-60">{o.scheduleLabel}</span>
                          <span className="ml-1 text-[var(--color-primary)]">
                            → {reschedule.toLabel}
                          </span>
                        </>
                      ) : (
                        o.scheduleLabel
                      )}
                    </span>
                    {leave ? (
                      <span className="inline-flex items-center gap-[2px] rounded-full border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/10 px-[var(--space-150)] text-[var(--color-warning)]">
                        已请假 · {SERIES_LEAVE_TYPE_LABEL[leave.type]}
                      </span>
                    ) : null}
                  </p>
                </button>
              </div>
              {/* 右上：状态 badge；右下：行动按钮 */}
              <div className="flex shrink-0 flex-col items-end gap-[var(--space-150)]">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-[var(--space-200)] py-[1px] text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)]",
                    BADGE_TONE[cfg.tone],
                  )}
                >
                  {cfg.label}
                </span>
                <SeriesOutlineRowActions
                  role={role}
                  outline={o}
                  status={status}
                  hasReschedule={!!reschedule}
                  hasLeave={!!leave}
                  onPickOutline={() => onPickOutline(o)}
                  onPickReschedule={() => onPickReschedule(o)}
                  onPickLeave={() => onPickLeave(o)}
                />
              </div>
            </li>
          )
        })}
      </ul>
    </GenericCard>
  )
}

function SeriesOutlineRowActions({
  role,
  outline,
  status,
  hasReschedule,
  hasLeave,
  onPickOutline,
  onPickReschedule,
  onPickLeave,
}: {
  role: EduLessonAttendingRole
  outline: AiClassroomSeriesLessonOutline
  status: "past" | "upcoming" | "in"
  hasReschedule: boolean
  hasLeave: boolean
  onPickOutline: () => void
  onPickReschedule: () => void
  onPickLeave: () => void
}) {
  const buttons: React.ReactNode[] = []

  if (status === "past") {
    /** 已完成：所有身份都能"看复盘"（绑定 18 卡时点开下钻；否则 demo 给一段说明） */
    buttons.push(
      <RowChip key="recap" onClick={onPickOutline}>
        看本节复盘
      </RowChip>,
    )
  } else if (status === "in") {
    /** 上课中：所有身份都能"进入本节"（→ 单课 18 卡子 CUI） */
    buttons.push(
      <RowChip key="enter" tone="primary" onClick={onPickOutline}>
        进入本节
      </RowChip>,
    )
  } else {
    /** 即将上课：教师"备课 / 调课"；学生 / 家长"看预习 / 请假" */
    if (role === "teacher") {
      buttons.push(
        <RowChip key="prep" onClick={onPickOutline}>
          备这节课
        </RowChip>,
      )
      if (!hasReschedule) {
        buttons.push(
          <RowChip key="resched" onClick={onPickReschedule}>
            调课
          </RowChip>,
        )
      }
    } else {
      buttons.push(
        <RowChip key="prep" onClick={onPickOutline}>
          看本节预习
        </RowChip>,
      )
      if (!hasLeave) {
        buttons.push(
          <RowChip key="leave" onClick={onPickLeave}>
            {role === "parent" ? "代孩子请假" : "请假"}
          </RowChip>,
        )
      }
    }
  }

  return <div className="flex shrink-0 items-center gap-[var(--space-150)]">{buttons}</div>
}

function RowChip({
  children,
  onClick,
  tone,
}: {
  children: React.ReactNode
  onClick: () => void
  tone?: "primary"
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-[2px] rounded-full border px-[var(--space-200)] py-[2px] text-[length:var(--font-size-xs)] leading-none font-[var(--font-weight-medium)] transition-colors",
        tone === "primary"
          ? "border-[var(--color-primary)]/45 bg-[var(--color-primary)]/8 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/14"
          : "border-border bg-bg text-text hover:bg-[var(--black-alpha-11)]",
      )}
    >
      {children}
      <ChevronRight className="h-3 w-3" />
    </button>
  )
}

/* ============================================================
 * 调课表单卡（教师专属）
 * ============================================================ */
export interface SeriesRescheduleFormCardProps {
  series: AiClassroomLessonSeries
  outline: AiClassroomSeriesLessonOutline
  onSubmit: (input: { toLabel: string; toScheduledAt: string; reason?: string }) => void
  onCancel: () => void
}

export function SeriesRescheduleFormCard({
  series,
  outline,
  onSubmit,
  onCancel,
}: SeriesRescheduleFormCardProps) {
  const options = React.useMemo(() => buildRescheduleOptions(outline), [outline])
  const [pickedId, setPickedId] = React.useState<string>(options[0]?.id ?? "")
  const [reason, setReason] = React.useState<string>("")

  const picked = options.find((o) => o.id === pickedId) ?? options[0] ?? null
  const impactNote = `本次调课只影响《${series.name}》第 ${outline.index} 节《${outline.title}》，会自动通知 32 名学员的家长 + 学员本人。`

  return (
    <GenericCard title={`调课 · 第 ${outline.index} 节《${outline.title}》`}>
      <div className="flex w-full flex-col gap-[var(--space-300)]">
        <div className="flex flex-col gap-[var(--space-150)] rounded-[var(--radius-md)] border border-border bg-[var(--color-bg-subtle)] px-[var(--space-300)] py-[var(--space-250)]">
          <p className="m-0 inline-flex items-center gap-[var(--space-150)] text-[length:var(--font-size-xs)] text-text-tertiary">
            <Layers className="h-3.5 w-3.5" /> 系列课
            <span className="text-text-secondary">{series.name}</span>
          </p>
          <p className="m-0 inline-flex items-center gap-[var(--space-150)] text-[length:var(--font-size-xs)] text-text-tertiary">
            <CalendarClock className="h-3.5 w-3.5" /> 原时间
            <span className="text-text">{outline.scheduleLabel}</span>
          </p>
          <p className="m-0 inline-flex items-center gap-[var(--space-150)] text-[length:var(--font-size-xs)] text-text-tertiary">
            <User className="h-3.5 w-3.5" /> 任课
            <span className="text-text">{series.teacher}</span>
          </p>
        </div>

        <div className="flex flex-col gap-[var(--space-200)]">
          <p className="m-0 text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] text-text">
            选择新时间（demo 提供 3 个候选）
          </p>
          <div className="flex flex-col gap-[var(--space-150)]">
            {options.map((opt) => {
              const isPicked = opt.id === pickedId
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPickedId(opt.id)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-[var(--radius-md)] border px-[var(--space-300)] py-[var(--space-200)] text-left text-[length:var(--font-size-sm)] transition-colors",
                    isPicked
                      ? "border-[var(--color-primary)]/55 bg-[var(--color-primary)]/8 text-[var(--color-primary)]"
                      : "border-border bg-bg text-text hover:bg-[var(--black-alpha-11)]",
                  )}
                >
                  <span>{opt.label}</span>
                  {isPicked ? <span aria-hidden>●</span> : <span aria-hidden>○</span>}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <label className="mb-[var(--space-150)] block text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] text-text">
            调课原因（可选）
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="如：教室设备临时检修；学校安排冲突…"
            className="w-full rounded-[var(--radius-md)] border border-border bg-bg px-[var(--space-300)] py-[var(--space-200)] text-[length:var(--font-size-sm)] text-text outline-none focus:border-[var(--color-primary)]/55"
          />
        </div>

        <p className="m-0 rounded-[var(--radius-md)] border border-dashed border-border bg-[var(--color-bg-subtle)] px-[var(--space-300)] py-[var(--space-200)] text-[length:var(--font-size-xs)] text-text-tertiary">
          {impactNote}
        </p>

        <div className="flex items-center gap-[var(--space-200)]">
          <button
            type="button"
            onClick={() => {
              if (!picked) return
              onSubmit({ toLabel: picked.label, toScheduledAt: picked.scheduledAt, reason })
            }}
            disabled={!picked}
            className="inline-flex h-9 items-center rounded-full bg-primary px-[var(--space-400)] text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)] text-[var(--color-primary-foreground,white)] shadow-sm transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            确认调课
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-9 items-center rounded-full border border-border bg-bg px-[var(--space-400)] text-[length:var(--font-size-sm)] text-text transition-colors hover:bg-[var(--black-alpha-11)]"
          >
            暂不调
          </button>
        </div>
      </div>
    </GenericCard>
  )
}

/* ============================================================
 * 调课已完成回执卡
 * ============================================================ */
export interface SeriesRescheduleDoneCardProps {
  series: AiClassroomLessonSeries
  outline: AiClassroomSeriesLessonOutline
  fromLabel: string
  toLabel: string
  reason?: string
  /** AI 回执后的下一步 chip：交父级 panel 触发 */
  onPickAction: (prompt: string) => void
}

export function SeriesRescheduleDoneCard({
  series,
  outline,
  fromLabel,
  toLabel,
  reason,
  onPickAction,
}: SeriesRescheduleDoneCardProps) {
  return (
    <GenericCard title="调课已完成">
      <div className="flex flex-col gap-[var(--space-200)]">
        <p className="m-0 inline-flex items-center gap-[var(--space-200)] text-[length:var(--font-size-sm)] text-text">
          <PackageCheck className="h-4 w-4 text-[var(--color-success)]" />
          <span>《{series.name}》第 {outline.index} 节《{outline.title}》</span>
        </p>
        <div className="flex flex-col gap-[var(--space-150)] rounded-[var(--radius-md)] border border-border bg-[var(--color-bg-subtle)] px-[var(--space-300)] py-[var(--space-250)]">
          <p className="m-0 text-[length:var(--font-size-xs)] text-text-tertiary">原时间</p>
          <p className="m-0 text-[length:var(--font-size-sm)] text-text line-through opacity-60">
            {fromLabel}
          </p>
          <p className="m-0 mt-[var(--space-150)] text-[length:var(--font-size-xs)] text-text-tertiary">
            新时间
          </p>
          <p className="m-0 text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)] text-[var(--color-primary)]">
            {toLabel}
          </p>
          {reason ? (
            <>
              <p className="m-0 mt-[var(--space-150)] text-[length:var(--font-size-xs)] text-text-tertiary">
                原因
              </p>
              <p className="m-0 text-[length:var(--font-size-xs)] text-text-secondary">{reason}</p>
            </>
          ) : null}
        </div>
        <p className="m-0 text-[length:var(--font-size-xs)] text-text-tertiary">
          已通知 32 名学员的家长 + 学员；课次概览里的时间已自动更新。
        </p>
        <div className="flex flex-wrap gap-[var(--space-150)]">
          <RowChip onClick={() => onPickAction("看课次概览")} tone="primary">
            看更新后的课次概览
          </RowChip>
          <RowChip onClick={() => onPickAction("给学员发通知")}>给学员补一句通知</RowChip>
        </div>
      </div>
    </GenericCard>
  )
}

/* ============================================================
 * 请假表单卡（学生 / 家长）
 * ============================================================ */

const LEAVE_TYPE_OPTIONS: { id: SeriesLeaveType; label: string; icon: string }[] = [
  { id: "sick", label: "身体不适", icon: "🤒" },
  { id: "personal", label: "个人事务", icon: "📋" },
  { id: "schedule", label: "时间冲突", icon: "🕒" },
]

export interface SeriesLeaveFormCardProps {
  series: AiClassroomLessonSeries
  outline: AiClassroomSeriesLessonOutline
  byRole: "student" | "parent"
  onSubmit: (input: {
    type: SeriesLeaveType
    needMakeUp: boolean
    reason?: string
  }) => void
  onCancel: () => void
}

export function SeriesLeaveFormCard({
  series,
  outline,
  byRole,
  onSubmit,
  onCancel,
}: SeriesLeaveFormCardProps) {
  const [type, setType] = React.useState<SeriesLeaveType>("sick")
  const [needMakeUp, setNeedMakeUp] = React.useState<boolean>(true)
  const [reason, setReason] = React.useState<string>("")

  const titleSuffix = byRole === "parent" ? "（代孩子请假）" : ""
  return (
    <GenericCard title={`请假 · 第 ${outline.index} 节《${outline.title}》${titleSuffix}`}>
      <div className="flex w-full flex-col gap-[var(--space-300)]">
        <div className="flex flex-col gap-[var(--space-150)] rounded-[var(--radius-md)] border border-border bg-[var(--color-bg-subtle)] px-[var(--space-300)] py-[var(--space-250)]">
          <p className="m-0 inline-flex items-center gap-[var(--space-150)] text-[length:var(--font-size-xs)] text-text-tertiary">
            <Layers className="h-3.5 w-3.5" /> 系列课
            <span className="text-text-secondary">{series.name}</span>
          </p>
          <p className="m-0 inline-flex items-center gap-[var(--space-150)] text-[length:var(--font-size-xs)] text-text-tertiary">
            <CalendarClock className="h-3.5 w-3.5" /> 课次时间
            <span className="text-text">{outline.scheduleLabel}</span>
          </p>
        </div>

        <div className="flex flex-col gap-[var(--space-200)]">
          <p className="m-0 text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] text-text">
            请假原因
          </p>
          <div className="flex flex-wrap gap-[var(--space-150)]">
            {LEAVE_TYPE_OPTIONS.map((opt) => {
              const isPicked = opt.id === type
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setType(opt.id)}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-[var(--space-150)] rounded-full border px-[var(--space-300)] py-[var(--space-150)] text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] transition-colors",
                    isPicked
                      ? "border-[var(--color-primary)]/55 bg-[var(--color-primary)]/8 text-[var(--color-primary)]"
                      : "border-border bg-bg text-text hover:bg-[var(--black-alpha-11)]",
                  )}
                >
                  <span aria-hidden>{opt.icon}</span>
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex items-center gap-[var(--space-300)]">
          <p className="m-0 text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] text-text">
            是否需要排补课
          </p>
          <button
            type="button"
            onClick={() => setNeedMakeUp(true)}
            className={cn(
              "inline-flex items-center rounded-full border px-[var(--space-300)] py-[var(--space-150)] text-[length:var(--font-size-xs)]",
              needMakeUp
                ? "border-[var(--color-primary)]/55 bg-[var(--color-primary)]/8 text-[var(--color-primary)]"
                : "border-border bg-bg text-text",
            )}
          >
            需要补课
          </button>
          <button
            type="button"
            onClick={() => setNeedMakeUp(false)}
            className={cn(
              "inline-flex items-center rounded-full border px-[var(--space-300)] py-[var(--space-150)] text-[length:var(--font-size-xs)]",
              !needMakeUp
                ? "border-[var(--color-primary)]/55 bg-[var(--color-primary)]/8 text-[var(--color-primary)]"
                : "border-border bg-bg text-text",
            )}
          >
            不补课
          </button>
        </div>

        <div>
          <label className="mb-[var(--space-150)] block text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] text-text">
            备注（可选）
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="如：发烧 38.5℃；下次还想旁听补课；…"
            className="w-full rounded-[var(--radius-md)] border border-border bg-bg px-[var(--space-300)] py-[var(--space-200)] text-[length:var(--font-size-sm)] text-text outline-none focus:border-[var(--color-primary)]/55"
          />
        </div>

        <p className="m-0 rounded-[var(--radius-md)] border border-dashed border-border bg-[var(--color-bg-subtle)] px-[var(--space-300)] py-[var(--space-200)] text-[length:var(--font-size-xs)] text-text-tertiary">
          demo 流程：提交后老师端会自动确认，IM 立刻可见。补课时间排好后会再发一次提醒。
        </p>

        <div className="flex items-center gap-[var(--space-200)]">
          <button
            type="button"
            onClick={() => onSubmit({ type, needMakeUp, reason })}
            className="inline-flex h-9 items-center rounded-full bg-primary px-[var(--space-400)] text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)] text-[var(--color-primary-foreground,white)] shadow-sm transition-colors hover:bg-primary-hover"
          >
            提交请假
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-9 items-center rounded-full border border-border bg-bg px-[var(--space-400)] text-[length:var(--font-size-sm)] text-text transition-colors hover:bg-[var(--black-alpha-11)]"
          >
            暂不请
          </button>
        </div>
      </div>
    </GenericCard>
  )
}

/* ============================================================
 * 请假已完成回执卡
 * ============================================================ */
export interface SeriesLeaveDoneCardProps {
  series: AiClassroomLessonSeries
  outline: AiClassroomSeriesLessonOutline
  byRole: "student" | "parent"
  type: SeriesLeaveType
  needMakeUp: boolean
  reason?: string
  onPickAction: (prompt: string) => void
}

export function SeriesLeaveDoneCard({
  series,
  outline,
  byRole,
  type,
  needMakeUp,
  reason,
  onPickAction,
}: SeriesLeaveDoneCardProps) {
  return (
    <GenericCard title="请假已确认">
      <div className="flex flex-col gap-[var(--space-200)]">
        <p className="m-0 inline-flex items-center gap-[var(--space-200)] text-[length:var(--font-size-sm)] text-text">
          <PackageCheck className="h-4 w-4 text-[var(--color-success)]" />
          <span>
            《{series.name}》第 {outline.index} 节《{outline.title}》
          </span>
        </p>
        <div className="flex flex-col gap-[var(--space-150)] rounded-[var(--radius-md)] border border-border bg-[var(--color-bg-subtle)] px-[var(--space-300)] py-[var(--space-250)]">
          <p className="m-0 text-[length:var(--font-size-xs)] text-text-tertiary">原因</p>
          <p className="m-0 text-[length:var(--font-size-sm)] text-text">
            {SERIES_LEAVE_TYPE_LABEL[type]}
            {reason ? <span className="text-text-secondary"> · {reason}</span> : null}
          </p>
          <p className="m-0 mt-[var(--space-150)] text-[length:var(--font-size-xs)] text-text-tertiary">
            是否补课
          </p>
          <p className="m-0 text-[length:var(--font-size-sm)] text-text">
            {needMakeUp ? "需要补课（老师会另行排时间）" : "本次不补课"}
          </p>
        </div>
        <p className="m-0 text-[length:var(--font-size-xs)] text-text-tertiary">
          {byRole === "parent" ? "已代孩子" : "已为你"}通知王老师；课次概览中该节已标记「已请假」。
        </p>
        <div className="flex flex-wrap gap-[var(--space-150)]">
          <RowChip onClick={() => onPickAction("看课次概览")} tone="primary">
            看更新后的课次概览
          </RowChip>
          {needMakeUp ? (
            <RowChip onClick={() => onPickAction("看补课安排")}>看补课安排</RowChip>
          ) : null}
        </div>
      </div>
    </GenericCard>
  )
}
