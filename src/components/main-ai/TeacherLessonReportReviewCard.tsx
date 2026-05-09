/**
 * 教师 · 课后 · 报告审核（Bespoke 卡片，含 B→C 联动）
 *
 * - 顶部：班级达成度 + 课中互动率
 * - 中段：亮点 / 风险 / 待跟进 三列汇总
 * - 个体清单：6 名学生（含李小明）状态 / 薄弱点 / 建议
 * - 推荐指令：「一键发送给家长」会触发 B→C 联动（发出确认气泡，家长端可承接）
 */
import * as React from "react"
import { GenericCard } from "./GenericCard"
import { AiClassroomRecommendedPrompts } from "./AiClassroomRecommendedPrompts"
import { cn } from "../ui/utils"
import { DEMO_FOCUS_STUDENTS, DEMO_LESSON } from "./aiClassroomLessonDemo"

export interface TeacherLessonReportReviewCardProps {
  onPickPrompt: (prompt: string) => void
}

const RECOMMENDED_PROMPTS = [
  "一键发送给家长",
  "生成下节课变式题包",
  "挑出 3 名学生预约一对一辅导",
  "把高频错题归类到下节课导入",
]

export function TeacherLessonReportReviewCard({ onPickPrompt }: TeacherLessonReportReviewCardProps) {
  const lesson = DEMO_LESSON
  const total = DEMO_FOCUS_STUDENTS.length
  const highlight = DEMO_FOCUS_STUDENTS.filter((s) => s.riskTag === "亮点")
  const risk = DEMO_FOCUS_STUDENTS.filter((s) => s.riskTag === "风险")
  const followup = DEMO_FOCUS_STUDENTS.filter((s) => s.riskTag === "待跟进")
  const targetMastery = 80
  const actualMastery = 76
  const interactionRate = 87

  return (
    <div className="flex w-full max-w-[min(100%,720px)] flex-col">
      <GenericCard title={`课后报告审核 · ${lesson.subject}《${lesson.title}》`}>
        <p className="m-0 text-[length:var(--font-size-sm)] leading-relaxed text-text-secondary">
          {lesson.weekday} {lesson.startTime}-{lesson.endTime} · {lesson.className} · 共 {total} 条学情条目待审。
        </p>

        {/* 顶部指标 */}
        <div className="mt-[var(--space-300)] grid w-full grid-cols-3 gap-[var(--space-200)]">
          <Ring
            label="班级达成度"
            value={`${actualMastery}%`}
            target={`目标 ${targetMastery}%`}
            achieved={actualMastery >= targetMastery}
          />
          <Stat
            label="课中互动率"
            value={`${interactionRate}%`}
            hint={interactionRate >= 80 ? "高于均值" : "低于均值"}
            tone={interactionRate >= 80 ? "success" : "warning"}
          />
          <Stat
            label="高频错题"
            value="第 7 / 第 12 题"
            hint="错误率 > 40%"
            tone="warning"
          />
        </div>

        {/* 三列汇总 */}
        <div className="mt-[var(--space-300)] grid w-full grid-cols-3 gap-[var(--space-200)]">
          <Column tone="success" title="亮点" count={highlight.length} bullets={highlight.slice(0, 2).map((s) => `${s.name}：${s.notableQuote}`)} />
          <Column tone="warning" title="风险" count={risk.length} bullets={risk.slice(0, 2).map((s) => `${s.name}：${s.notableQuote}`)} />
          <Column tone="default" title="待跟进" count={followup.length} bullets={followup.slice(0, 2).map((s) => `${s.name}：${s.notableQuote}`)} />
        </div>

        {/* 个体清单 */}
        <h4 className="m-0 mt-[var(--space-300)] text-[length:var(--font-size-sm)] font-[var(--font-weight-semi-bold)] text-text">
          个体审核清单
        </h4>
        <ul className="m-0 mt-[var(--space-200)] flex w-full flex-col gap-[var(--space-150)] p-0 list-none">
          {DEMO_FOCUS_STUDENTS.map((stu) => (
            <li
              key={stu.id}
              className="flex w-full items-start gap-[var(--space-200)] rounded-[var(--radius-md)] border border-border bg-bg px-[var(--space-250)] py-[var(--space-200)]"
            >
              <span
                className={cn(
                  "shrink-0 rounded-full px-[var(--space-200)] py-[2px] text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)]",
                  stu.riskTag === "亮点"
                    ? "bg-[var(--color-success)]/10 text-[var(--color-success)]"
                    : stu.riskTag === "风险"
                      ? "bg-[var(--color-warning)]/10 text-[var(--color-warning)]"
                      : "bg-bg-secondary text-text-secondary"
                )}
              >
                {stu.riskTag}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
                <span className="text-[length:var(--font-size-sm)] text-text">
                  {stu.name} · 课位 {stu.classRank}
                  {stu.weakPoints.length ? ` · 薄弱「${stu.weakPoints.join("、")}」` : ""}
                </span>
                <span className="text-[length:var(--font-size-xs)] text-text-tertiary">
                  {stu.suggestion}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </GenericCard>

      <AiClassroomRecommendedPrompts prompts={RECOMMENDED_PROMPTS} onPick={onPickPrompt} />
    </div>
  )
}

function Ring({ label, value, target, achieved }: { label: string; value: string; target: string; achieved: boolean }) {
  return (
    <div className="flex flex-col gap-[2px] rounded-[var(--radius-md)] border border-border bg-bg-secondary/40 px-[var(--space-250)] py-[var(--space-200)]">
      <span className="text-[length:var(--font-size-xs)] text-text-tertiary leading-tight">{label}</span>
      <span
        className={cn(
          "text-[length:var(--font-size-md)] font-[var(--font-weight-semi-bold)] leading-tight",
          achieved ? "text-[var(--color-success)]" : "text-[var(--color-warning)]"
        )}
      >
        {value}
      </span>
      <span className="text-[length:var(--font-size-xs)] text-text-tertiary leading-tight">{target}</span>
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
  value: string
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

function Column({
  tone,
  title,
  count,
  bullets,
}: {
  tone: "success" | "warning" | "default"
  title: string
  count: number
  bullets: string[]
}) {
  const headerCls =
    tone === "success"
      ? "text-[var(--color-success)]"
      : tone === "warning"
        ? "text-[var(--color-warning)]"
        : "text-text-secondary"
  return (
    <div className="flex flex-col gap-[var(--space-150)] rounded-[var(--radius-md)] border border-border bg-bg px-[var(--space-250)] py-[var(--space-250)]">
      <div className="flex items-center justify-between">
        <span className={cn("text-[length:var(--font-size-sm)] font-[var(--font-weight-semi-bold)]", headerCls)}>
          {title}
        </span>
        <span className="text-[length:var(--font-size-xs)] text-text-tertiary">{count}</span>
      </div>
      <ul className="m-0 flex flex-col gap-[4px] p-0 list-none">
        {bullets.length === 0 ? (
          <li className="text-[length:var(--font-size-xs)] text-text-tertiary">—</li>
        ) : (
          bullets.map((b, idx) => (
            <li key={idx} className="text-[length:var(--font-size-xs)] text-text-secondary leading-snug">
              · {b}
            </li>
          ))
        )}
      </ul>
    </div>
  )
}
