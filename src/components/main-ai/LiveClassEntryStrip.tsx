/**
 * 子 CUI Header 下方的「进入 AI 课堂」入口条。
 *
 * v2 准入收紧（按产品要求）：
 * - **只老师 / 学生**可以进入 AI 课堂；家长不再渲染入口（课中要看孩子状态请走子 CUI 内的"班级专注度 / 学情卡"等能力）。
 * - **只课中（stage === "in"）**才出现入口；课前不再出"候课 / 旁听"，课后也不出。
 * - 仅 lessonId === DEMO_LESSON.id（主线节）才显示。
 *
 * 设计动机：
 * - 候课 / 旁听场景在子 CUI 内已有等价能力（开场卡 / 教师控制条 / 待办带），让"AI 课堂"专注于
 *   "课中实时互动"这一最核心场景，避免入口在 pre/post 阶段成为空门或冗余。
 * - 老师从 pre→in 仍走 TeacherLessonControlStrip 的「现在开始上课」（与本条互斥）；
 *   切到 in 后本条立刻冒出来，老师可一键进入。
 *
 * 样式：横向 sticky strip；左侧"状态点 + 文案"，右侧主色按钮。
 */

import * as React from "react"
import { ArrowRight, Radio } from "lucide-react"
import { cn } from "../ui/utils"
import { DEMO_LESSON } from "./aiClassroomLessonDemo"
import type { EduLessonAttendingRole } from "./homeScenarioLayout"
import type { EducationStage } from "./educationStageDemo"

export interface LiveClassEntryStripProps {
  role: EduLessonAttendingRole
  stage: EducationStage
  /** 当前子 CUI 绑定的 lessonId（主线 lesson 才会显示） */
  lessonId: string
  /** 触发打开 AI 课堂浮层 */
  onOpenLiveClass: () => void
}

export function LiveClassEntryStrip({
  role,
  stage,
  lessonId,
  onOpenLiveClass,
}: LiveClassEntryStripProps) {
  /** 仅主线节 */
  if (lessonId !== DEMO_LESSON.id) return null

  /** v2 准入：仅老师 / 学生 */
  if (role !== "teacher" && role !== "student") return null

  /** v2 准入：仅课中，pre / post 一律不显示 */
  if (stage !== "in") return null

  /** 课中：老师 / 学生显示主色"进入 AI 课堂" */
  return (
    <div className="flex shrink-0 items-center gap-[var(--space-300)] border-b border-border bg-[var(--color-success)]/8 px-[max(12px,16px)] py-[var(--space-250)]">
      <span
        aria-hidden
        className={cn(
          "inline-flex h-[8px] w-[8px] shrink-0 rounded-full bg-[var(--color-success)] animate-pulse",
        )}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="inline-flex items-center gap-1 text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] text-text leading-tight">
          <Radio className="h-3 w-3 text-[var(--color-success)]" />
          AI 课堂直播中
        </span>
        <span className="text-[length:var(--font-size-xs)] text-text-tertiary leading-snug">
          {role === "teacher"
            ? "进入互动教室继续讲课；本对话窗仍可同时使用。"
            : "进入互动教室上课；本对话窗仍可同时使用。"}
        </span>
      </div>
      <button
        type="button"
        onClick={onOpenLiveClass}
        className="inline-flex shrink-0 items-center gap-[var(--space-150)] h-[var(--space-700)] px-[var(--space-350)] py-[var(--space-150)] rounded-full bg-primary text-[var(--color-primary-foreground,white)] text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] leading-none whitespace-nowrap shadow-sm transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]/35"
        aria-label="进入 AI 课堂"
      >
        进入 AI 课堂
        <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
