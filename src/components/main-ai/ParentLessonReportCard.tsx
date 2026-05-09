/**
 * 家长 · 课后 · 报告（Bespoke 卡片）
 *
 * - 顶部：孩子姓名 / 本节得分 / 班级位次 + 趋势
 * - 中段：3 项关键指标（专注度 / 互动度 / 作业达成度）
 * - 老师 1 句评语
 * - 下段：今晚怎么陪孩子（重做错题入口 + 家庭练习建议）
 *
 * 与教师端 reportReview 共用 lesson fixture，体感上联动。
 */
import * as React from "react"
import { GenericCard } from "./GenericCard"
import { AiClassroomRecommendedPrompts } from "./AiClassroomRecommendedPrompts"
import { ChatPromptButton } from "../chat/ChatPromptButton"
import { cn } from "../ui/utils"
import {
  DEMO_LESSON,
  DEMO_PARENT_CHILD,
  DEMO_STUDENT_SELF,
} from "./aiClassroomLessonDemo"

export interface ParentLessonReportCardProps {
  onPickPrompt: (prompt: string) => void
}

const RECOMMENDED_PROMPTS = [
  "今晚陪孩子练 15 分钟",
  "和王老师私聊",
  "查看完整报告",
  "把建议加入家庭日历",
]

export function ParentLessonReportCard({ onPickPrompt }: ParentLessonReportCardProps) {
  const child = DEMO_PARENT_CHILD
  const stu = DEMO_STUDENT_SELF
  const arrow = child.rankTrend === "up" ? "↑" : child.rankTrend === "down" ? "↓" : "→"
  const arrowCls =
    child.rankTrend === "up"
      ? "text-[var(--color-success)]"
      : child.rankTrend === "down"
        ? "text-[var(--color-warning)]"
        : "text-text-tertiary"

  return (
    <div className="flex w-full max-w-[min(100%,720px)] flex-col">
      <GenericCard title={`${child.childName}的课后报告 · ${DEMO_LESSON.subject}`}>
        <p className="m-0 text-[length:var(--font-size-xs)] text-text-tertiary">
          {DEMO_LESSON.weekday} {DEMO_LESSON.startTime}-{DEMO_LESSON.endTime} · {DEMO_LESSON.className} ·《{DEMO_LESSON.title}》
        </p>

        {/* 顶部：得分 + 位次 */}
        <div className="mt-[var(--space-300)] grid w-full grid-cols-3 gap-[var(--space-200)]">
          <Stat
            label="本节得分"
            value={`${child.lessonScore}`}
            hint={`班级均分 ${child.classAverage}`}
            tone="success"
          />
          <Stat
            label="班级位次"
            value={
              <span>
                第 {child.rank} 名 <span className={cn("text-[length:var(--font-size-sm)] font-[var(--font-weight-semi-bold)]", arrowCls)}>{arrow}{Math.abs(child.rankDelta)}</span>
              </span>
            }
            hint={child.rankTrend === "up" ? "比上节进步" : child.rankTrend === "down" ? "比上节下滑" : "与上节持平"}
          />
          <Stat
            label="作业达成度"
            value={`${stu.homeworkScore}%`}
            hint={stu.homeworkScore >= 85 ? "高于均值" : "略低于均值"}
            tone={stu.homeworkScore >= 85 ? "success" : "warning"}
          />
        </div>

        {/* 关键三项指标 */}
        <h4 className="m-0 mt-[var(--space-300)] text-[length:var(--font-size-sm)] font-[var(--font-weight-semi-bold)] text-text">
          课堂表现
        </h4>
        <ul className="m-0 mt-[var(--space-200)] flex w-full flex-col gap-[var(--space-150)] p-0 list-none">
          <Indicator label="专注度" value={stu.attentionScore} hint="老师观察 + 互动行为综合" />
          <Indicator label="互动度" value={stu.interactionScore} hint="举手 / 抢答 / 私聊老师 综合" />
          <Indicator label="作业达成度" value={stu.homeworkScore} hint="本章前置作业完成质量" />
        </ul>

        {/* 老师评语 */}
        <div className="mt-[var(--space-300)] rounded-[var(--radius-md)] border border-border bg-bg-secondary/40 px-[var(--space-250)] py-[var(--space-200)]">
          <span className="block text-[length:var(--font-size-xs)] text-text-tertiary">王老师评语</span>
          <p className="m-0 mt-[2px] text-[length:var(--font-size-sm)] leading-snug text-text">
            {child.teacherComment}
          </p>
        </div>

        {/* 今晚怎么陪孩子 */}
        <h4 className="m-0 mt-[var(--space-300)] text-[length:var(--font-size-sm)] font-[var(--font-weight-semi-bold)] text-text">
          今晚怎么陪孩子
        </h4>
        <div className="mt-[var(--space-200)] rounded-[var(--radius-md)] border border-border bg-bg px-[var(--space-300)] py-[var(--space-250)]">
          <p className="m-0 text-[length:var(--font-size-sm)] leading-relaxed text-text">
            {child.reinforcePlan}
          </p>
          <div className="mt-[var(--space-200)] flex flex-wrap gap-[var(--space-200)]">
            <ChatPromptButton onClick={() => onPickPrompt("陪孩子重做错题")}>
              陪孩子重做错题
            </ChatPromptButton>
            <ChatPromptButton onClick={() => onPickPrompt("把今晚 15 分钟陪练加入家庭日历")}>
              加入家庭日历
            </ChatPromptButton>
          </div>
        </div>
      </GenericCard>

      <AiClassroomRecommendedPrompts prompts={RECOMMENDED_PROMPTS} onPick={onPickPrompt} />
    </div>
  )
}

function Stat({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string
  value: React.ReactNode
  hint?: string
  tone?: "default" | "success" | "warning"
}) {
  const valueCls =
    tone === "success"
      ? "text-[var(--color-success)]"
      : tone === "warning"
        ? "text-[var(--color-warning)]"
        : "text-text"
  return (
    <div className="flex flex-col gap-[2px] rounded-[var(--radius-md)] border border-border bg-bg-secondary/40 px-[var(--space-250)] py-[var(--space-200)]">
      <span className="text-[length:var(--font-size-xs)] text-text-tertiary leading-tight">{label}</span>
      <span className={cn("text-[length:var(--font-size-md)] font-[var(--font-weight-semi-bold)] leading-tight", valueCls)}>
        {value}
      </span>
      {hint ? <span className="text-[length:var(--font-size-xs)] text-text-tertiary leading-tight">{hint}</span> : null}
    </div>
  )
}

function Indicator({ label, value, hint }: { label: string; value: number; hint?: string }) {
  const tone = value >= 80 ? "success" : value >= 60 ? "default" : "warning"
  const barCls =
    tone === "success"
      ? "bg-[var(--color-success)]"
      : tone === "warning"
        ? "bg-[var(--color-warning)]"
        : "bg-primary"
  return (
    <li className="flex w-full flex-col gap-[var(--space-100)] rounded-[var(--radius-md)] border border-border bg-bg px-[var(--space-250)] py-[var(--space-200)]">
      <div className="flex items-center justify-between">
        <span className="text-[length:var(--font-size-sm)] text-text">{label}</span>
        <span className="text-[length:var(--font-size-sm)] font-[var(--font-weight-semi-bold)] text-text">
          {value}
        </span>
      </div>
      <div className="h-[6px] w-full overflow-hidden rounded-full bg-bg-secondary">
        <div className={cn("h-full rounded-full", barCls)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
      {hint ? <span className="text-[length:var(--font-size-xs)] text-text-tertiary leading-snug">{hint}</span> : null}
    </li>
  )
}
