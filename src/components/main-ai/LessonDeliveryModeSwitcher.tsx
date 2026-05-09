import * as React from "react"
import { cn } from "../ui/utils"
import {
  LESSON_DELIVERY_MODE_OPTIONS,
  type LessonDeliveryMode,
} from "./lessonDeliveryMode"

export interface LessonDeliveryModeSwitcherProps {
  value: LessonDeliveryMode
  onChange: (mode: LessonDeliveryMode) => void
  className?: string
}

/**
 * 顶栏「课程形态」切换器（演示态）。
 *
 * 与 `EducationStageSwitcher` 同侧、同高度、同样式骨架，但语义独立：
 * - stage = 用户在不同时段进来的体验（课前 / 课中 / 课后）
 * - deliveryMode = 同一节课的形态（线上 / 线下，PRD 2.5.1）
 *
 * 仅 demo 用：实际业务由 `class.session.delivery_mode` 主数据决定（PRD 3.2.6）。
 */
export function LessonDeliveryModeSwitcher({
  value,
  onChange,
  className,
}: LessonDeliveryModeSwitcherProps) {
  const dotCls =
    value === "offline"
      ? "bg-[var(--color-success)]"
      : "bg-[var(--color-info)]"

  const dotTitle = value === "offline" ? "线下课 · 物理教室" : "线上课 · 视频会议"

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
        aria-label="切换课程形态（演示态可强切）"
        title="演示态可强切：实际由排课主数据中的 delivery_mode 决定"
      >
        {LESSON_DELIVERY_MODE_OPTIONS.map((mode) => {
          const active = value === mode.id
          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => onChange(mode.id)}
              className={cn(
                "h-8 rounded-[9px] px-3 text-[14px] font-medium transition-colors whitespace-nowrap",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4F8CFF]/30",
                active
                  ? "bg-white text-[#1F2937] shadow-[0_1px_3px_rgba(15,23,42,0.12)]"
                  : "text-[#697386] hover:bg-white/60 hover:text-[#1F2937]",
              )}
              aria-pressed={active}
            >
              {active ? mode.label : mode.shortLabel}
            </button>
          )
        })}
      </div>
    </div>
  )
}
