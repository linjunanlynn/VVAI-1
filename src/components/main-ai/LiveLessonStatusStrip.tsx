/**
 * 课中常驻状态条：放在主聊天区顶部，提供"正在上课"的强感知。
 *
 * - 左：呼吸红点 + "直播中"
 * - 中：课程名 + 已上时长 / 总时长 + 进度刻度（5 段）
 * - 右：当前知识点指针 + 身份化的小动作（教师暂停讲解 / 学生举手 / 家长一眼直播）
 *
 * 仅当 stage === "in" 时由父组件挂载渲染。
 */
import * as React from "react"
import { cn } from "../ui/utils"
import {
  DEMO_LESSON,
  DEMO_LIVE_TIMELINE,
  DEMO_PARENT_LIVE_QUOTA,
  getCurrentLiveSegment,
  getLessonRuntimeState,
} from "./aiClassroomLessonDemo"
import type { EduLessonAttendingRole } from "./homeScenarioLayout"

export interface LiveLessonStatusStripProps {
  role: EduLessonAttendingRole
  /** 行动回调：父组件把它接到 handleSendMessage / pushUserThenBot */
  onAction: (command: string) => void
  className?: string
}

export function LiveLessonStatusStrip({ role, onAction, className }: LiveLessonStatusStripProps) {
  const rt = getLessonRuntimeState("in")
  const elapsedSec = parseElapsed(rt.liveElapsed)
  const currentSeg = getCurrentLiveSegment(elapsedSec)

  const actions = ROLE_ACTIONS[role]

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex w-full max-w-[min(100%,720px)] items-center gap-[var(--space-300)] rounded-[var(--radius-md)]",
        "border border-[var(--color-success)]/30 bg-[var(--color-success)]/5 px-[var(--space-300)] py-[var(--space-250)]",
        className,
      )}
    >
      {/* 直播指示 */}
      <div className="flex shrink-0 items-center gap-[var(--space-150)]">
        <span className="relative inline-flex h-[10px] w-[10px]">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-success)] opacity-50" />
          <span className="relative inline-flex h-full w-full rounded-full bg-[var(--color-success)]" />
        </span>
        <span className="text-[length:var(--font-size-xs)] font-[var(--font-weight-semi-bold)] text-[var(--color-success)]">
          直播中
        </span>
      </div>

      {/* 课程信息 + 进度 */}
      <div className="flex min-w-0 flex-1 flex-col gap-[var(--space-100)]">
        <div className="flex items-center gap-[var(--space-200)] text-[length:var(--font-size-xs)] text-text">
          <span className="truncate font-[var(--font-weight-medium)]">
            {DEMO_LESSON.subject}《{DEMO_LESSON.title}》· {DEMO_LESSON.className}
          </span>
          <span className="shrink-0 text-text-tertiary">
            {rt.liveElapsed} / 45:00
          </span>
        </div>
        {/* 5 段进度刻度 */}
        <div className="flex w-full items-stretch gap-[2px]">
          {DEMO_LIVE_TIMELINE.map((seg) => {
            const isCurrent = seg.id === currentSeg.id
            const isPast = elapsedSec >= seg.endSec
            const total = seg.endSec - seg.startSec
            const fillPct = isPast
              ? 100
              : isCurrent
                ? Math.max(2, Math.min(100, Math.round(((elapsedSec - seg.startSec) / total) * 100)))
                : 0
            return (
              <div
                key={seg.id}
                title={`${seg.label} · ${seg.knowledgePoint}`}
                className="flex flex-1 flex-col gap-[2px]"
              >
                <div className={cn(
                  "h-[4px] w-full overflow-hidden rounded-full",
                  isCurrent ? "bg-[var(--color-success)]/20" : "bg-bg-secondary",
                )}>
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      isPast || isCurrent ? "bg-[var(--color-success)]" : "bg-text-tertiary/30",
                    )}
                    style={{ width: `${fillPct}%` }}
                  />
                </div>
                <span
                  className={cn(
                    "text-[10px] leading-none truncate",
                    isCurrent ? "text-[var(--color-success)] font-[var(--font-weight-medium)]" : "text-text-tertiary",
                  )}
                >
                  {seg.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* 当前知识点 + 身份化操作 */}
      <div className="flex shrink-0 flex-col items-end gap-[var(--space-100)]">
        <span className="max-w-[160px] truncate text-[length:var(--font-size-xs)] text-text-tertiary">
          知识点：{currentSeg.knowledgePoint}
        </span>
        <div className="flex flex-wrap items-center gap-[var(--space-150)]">
          {actions.map((act) => (
            <button
              key={act.label}
              type="button"
              onClick={() => onAction(act.command)}
              className={cn(
                "inline-flex h-7 shrink-0 items-center justify-center rounded-full border px-[var(--space-250)]",
                "text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] transition-colors",
                act.tone === "primary"
                  ? "border-transparent bg-primary text-white hover:bg-primary-hover"
                  : "border-border bg-bg text-text hover:bg-bg-secondary",
              )}
            >
              {act.label}
            </button>
          ))}
          {role === "parent" ? (
            <span className="text-[10px] text-text-tertiary">
              直播配额 {DEMO_PARENT_LIVE_QUOTA.remainSec}s
            </span>
          ) : null}
        </div>
      </div>
    </div>
  )
}

interface RoleAction {
  label: string
  command: string
  tone: "primary" | "secondary"
}

const ROLE_ACTIONS: Record<EduLessonAttendingRole, RoleAction[]> = {
  teacher: [
    { label: "出一道随堂题", command: "出一道随堂题", tone: "primary" },
    { label: "智能分组", command: "智能分组", tone: "secondary" },
  ],
  student: [
    { label: "举手", command: "举手/抢答", tone: "primary" },
    { label: "我要提问", command: "我要提问", tone: "secondary" },
  ],
  parent: [
    { label: "看 30 秒", command: "看一眼直播", tone: "primary" },
    { label: "紧急请假", command: "紧急请假", tone: "secondary" },
  ],
}

function parseElapsed(label: string): number {
  const [m, s] = label.split(":").map((x) => parseInt(x, 10) || 0)
  return m * 60 + s
}
