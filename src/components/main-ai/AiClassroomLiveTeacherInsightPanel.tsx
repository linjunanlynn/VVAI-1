/**
 * 老师侧「实时学情仪表板」—— AI 课堂直播窗左侧 aside（视频墙下方）。
 *
 * 设计动机
 * ----------------------------------------------------
 * AI 课堂对老师的跨时代价值之一：「课堂决策从凭经验变靠数据」。
 * 视频墙能看「人」，但看不全「整班正在发生什么」；header 那一行简略指标也只够扫一眼。
 * 这个面板把 AI 课中实时收集到的 4 类关键信号显著呈现：
 *   1) 抬头率（focusScore 平均，0-100）
 *   2) 举手数 / 走神名单
 *   3) 当前题答题进度 + 正确率
 *   4) AI 给老师的下一步建议（基于实时学情自动给出）
 *
 * 数据 = `AiClassroomLiveTeacherInsight`（demo 静态；真实业务由直播链路实时聚合）
 */

import * as React from "react"
import { Activity, Hand, Lightbulb, Users } from "lucide-react"
import { cn } from "../ui/utils"
import type { AiClassroomLiveTeacherInsight } from "./aiClassroomLiveDemo"

export interface AiClassroomLiveTeacherInsightPanelProps {
  insight: AiClassroomLiveTeacherInsight
  /**
   * AI 给老师的下一步建议（demo 内置；真实业务由 LLM 实时生成）。
   * 不传时使用一条兜底建议。
   */
  aiSuggestion?: string
  className?: string
}

export function AiClassroomLiveTeacherInsightPanel({
  insight,
  aiSuggestion,
  className,
}: AiClassroomLiveTeacherInsightPanelProps) {
  const correctRate =
    insight.answered.done > 0
      ? Math.round((insight.answered.correct / insight.answered.done) * 100)
      : 0
  const suggestion =
    aiSuggestion ??
    `${insight.driftedNames[0] ?? "陈可"} 走神 ≥ 3s，建议下一题轻点名 ta；正确率 ${correctRate}%，可继续推进。`
  return (
    <section
      className={cn(
        "flex flex-col gap-2 border-t border-white/10 bg-[#0F1A30]/95 px-3 py-3 text-white/90",
        className,
      )}
      aria-label="老师实时学情仪表板"
    >
      <header className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[length:var(--font-size-xs)] font-[var(--font-weight-semibold)] text-white/85">
          <Activity className="h-3.5 w-3.5 text-[var(--color-primary)]" />
          实时学情仪表板
        </span>
        <span className="text-[length:var(--font-size-xs)] text-white/50 tabular-nums">
          已上 {insight.elapsedMin}/{insight.totalMin} min
        </span>
      </header>

      {/* 三指标 chip：抬头率 / 举手 / 答题进度 + 正确率 */}
      <div className="grid grid-cols-3 gap-2">
        <Stat
          icon={<Users className="h-3.5 w-3.5" />}
          label="抬头率"
          value={`${insight.attendanceRate}%`}
          tone={insight.attendanceRate >= 80 ? "good" : insight.attendanceRate >= 60 ? "warn" : "bad"}
        />
        <Stat
          icon={<Hand className="h-3.5 w-3.5" />}
          label="举手"
          value={String(insight.raisedHands)}
          tone={insight.raisedHands > 0 ? "good" : "neutral"}
        />
        <Stat
          icon={<Activity className="h-3.5 w-3.5" />}
          label={`答题 ${insight.answered.done}/${insight.answered.total}`}
          value={`${correctRate}%`}
          tone={correctRate >= 70 ? "good" : correctRate >= 50 ? "warn" : "bad"}
        />
      </div>

      {/* 走神名单 */}
      {insight.driftedNames.length > 0 ? (
        <div className="flex items-center gap-1.5 rounded-md border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/10 px-2.5 py-1.5 text-[length:var(--font-size-xs)] text-[var(--color-warning)]">
          <span aria-hidden>⚠️</span>
          <span className="truncate">
            走神中：{insight.driftedNames.join("、")} · 建议下一题轻点名
          </span>
        </div>
      ) : null}

      {/* AI 建议 */}
      <div className="flex items-start gap-1.5 rounded-md border border-[var(--color-primary)]/35 bg-[var(--color-primary)]/8 px-2.5 py-1.5 text-[length:var(--font-size-xs)] text-white/85">
        <Lightbulb className="mt-[2px] h-3.5 w-3.5 shrink-0 text-[var(--color-primary)]" />
        <span className="leading-snug">
          <span className="text-[var(--color-primary)] font-[var(--font-weight-semibold)]">
            AI 建议：
          </span>
          {suggestion}
        </span>
      </div>
    </section>
  )
}

function Stat({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: string
  tone: "good" | "warn" | "bad" | "neutral"
}) {
  const toneCls =
    tone === "good"
      ? "text-[var(--color-success)]"
      : tone === "warn"
        ? "text-[var(--color-warning)]"
        : tone === "bad"
          ? "text-[var(--color-error,#f87171)]"
          : "text-white/85"
  return (
    <div className="flex flex-col gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1.5">
      <span className="inline-flex items-center gap-1 text-[length:var(--font-size-xs)] text-white/55 leading-none">
        {icon}
        <span className="truncate">{label}</span>
      </span>
      <span
        className={cn(
          "text-[length:var(--font-size-md)] font-[var(--font-weight-semibold)] leading-none tabular-nums",
          toneCls,
        )}
      >
        {value}
      </span>
    </div>
  )
}
