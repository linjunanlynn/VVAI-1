import * as React from "react"
import { cn } from "../ui/utils"
import {
  EDUCATION_STAGE_OPTIONS,
  type EducationStage,
} from "./educationStageDemo"
import { getLessonRuntimeState } from "./aiClassroomLessonDemo"

export interface EducationStageSwitcherProps {
  value: EducationStage
  onChange: (stage: EducationStage) => void
  className?: string
}

/**
 * 顶栏阶段切换器
 *
 * 升级要点（产品方案问题 1 收口）：
 * - 视觉左侧加状态点（蓝=课前 / 绿=课中 / 灰=课后），让用户从顶栏一眼看出当下处于哪一段
 * - 当前 active 项的标签从纯"课中"扩展为含状态文案：「课前·距 19:00 1h18m」「课中·已 12'30"」「课后·已生成报告」
 * - 角标小字"演示态可强切"明确告知用户：实时由系统判断，本控件用于演示
 */
export function EducationStageSwitcher({
  value,
  onChange,
  className,
}: EducationStageSwitcherProps) {
  const runtime = getLessonRuntimeState(value)

  const dotCls =
    runtime.status === "live"
      ? "bg-[var(--color-success)] animate-pulse"
      : runtime.status === "post"
        ? "bg-text-tertiary"
        : runtime.status === "imminent"
          ? "bg-[var(--color-warning)] animate-pulse"
          : "bg-[var(--color-info)]"

  const dotTitle =
    runtime.status === "live"
      ? `直播中 · 已 ${runtime.liveElapsed}`
      : runtime.status === "imminent"
        ? `临近开课 · ${runtime.minutesToStart} 分钟后开课`
        : runtime.status === "post"
          ? `已下课 ${runtime.minutesAfterEnd} 分钟`
          : `课前 · ${formatMinutes(runtime.minutesToStart)} 后开课`

  return (
    <div className={cn("inline-flex shrink-0 items-center gap-2", className)}>
      <span
        className={cn(
          "inline-flex h-[10px] w-[10px] shrink-0 rounded-full",
          dotCls,
        )}
        aria-hidden
        title={dotTitle}
      />

      <div
        className="inline-flex h-10 shrink-0 items-center rounded-[12px] border border-[#D6DAE2] bg-[#F3F6FB] p-1"
        aria-label="切换课堂阶段（演示态可强切）"
        title="演示态可强切：实际由系统判断当下阶段"
      >
        {EDUCATION_STAGE_OPTIONS.map((stage) => {
          const active = value === stage.id
          const label = active ? buildActiveLabel(stage.id) : stage.shortLabel
          return (
            <button
              key={stage.id}
              type="button"
              onClick={() => onChange(stage.id)}
              className={cn(
                "h-8 rounded-[9px] px-3 text-[14px] font-medium transition-colors whitespace-nowrap",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4F8CFF]/30",
                active
                  ? "bg-white text-[#1F2937] shadow-[0_1px_3px_rgba(15,23,42,0.12)]"
                  : "text-[#697386] hover:bg-white/60 hover:text-[#1F2937]",
              )}
              aria-pressed={active}
            >
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function formatMinutes(min: number): string {
  if (min <= 0) return "0m"
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m === 0 ? `${h}h` : `${h}h${m}m`
}

function buildActiveLabel(stage: EducationStage): string {
  const rt = getLessonRuntimeState(stage)
  if (stage === "pre") {
    return rt.minutesToStart <= 15
      ? `课前·${rt.minutesToStart}分钟后开课`
      : `课前·距开课 ${formatMinutes(rt.minutesToStart)}`
  }
  if (stage === "in") {
    return `课中·已 ${rt.liveElapsed}`
  }
  return "课后·已生成报告"
}
