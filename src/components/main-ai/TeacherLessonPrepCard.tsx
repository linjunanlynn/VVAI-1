/**
 * 教师 · 课前 · 开始备课（Bespoke 卡片）
 *
 * - 顶部：本节课信息（班级 / 章节 / 时间 / 到课预测）
 * - 中段：3 行学情快照（前测均分、薄弱知识点 Top3、潜在掉队学员 Top3）
 * - 下段：备课包推荐（适配度 + 一键采纳）
 * - 底部：推荐指令条
 */
import * as React from "react"
import { GenericCard } from "./GenericCard"
import { AiClassroomRecommendedPrompts } from "./AiClassroomRecommendedPrompts"
import { ChatPromptButton } from "../chat/ChatPromptButton"
import { cn } from "../ui/utils"
import {
  DEMO_FOCUS_STUDENTS,
  DEMO_LESSON,
} from "./aiClassroomLessonDemo"

export interface TeacherLessonPrepCardProps {
  onPickPrompt: (prompt: string) => void
}

const RECOMMENDED_PROMPTS = [
  "采用标准课件包并生成预习包",
  "把薄弱点放进随堂题",
  "私聊提醒陈可、赵欣宇",
  "看更多备课模板",
]

export function TeacherLessonPrepCard({ onPickPrompt }: TeacherLessonPrepCardProps) {
  const lesson = DEMO_LESSON
  const fallingBehind = DEMO_FOCUS_STUDENTS.filter((s) => s.riskTag === "风险" || s.riskTag === "待跟进").slice(0, 3)
  return (
    <div className="flex w-full max-w-[min(100%,720px)] flex-col">
      <GenericCard title={`备课草稿 · ${lesson.subject}《${lesson.title}》`}>
        {/* 课信息条 */}
        <div className="flex w-full flex-wrap items-center gap-[var(--space-200)]">
          <Chip label={lesson.className} />
          <Chip label={`${lesson.chapter}`} />
          <Chip label={`${lesson.weekday} ${lesson.startTime}-${lesson.endTime}`} tone="info" />
          <Chip
            label={`到课预测 ${lesson.attendanceForecast}/${lesson.studentCount}`}
            tone="success"
          />
        </div>

        {/* 学情快照 */}
        <div className="mt-[var(--space-300)] grid w-full grid-cols-3 gap-[var(--space-200)]">
          <Stat
            label="本章前测均分"
            value={`${lesson.preTestAverage}`}
            hint="班级平均"
          />
          <Stat
            label="上节作业完成率"
            value={`${lesson.prevHomeworkCompletion}%`}
            hint={lesson.prevHomeworkCompletion < 85 ? "略低于目标" : "达标"}
          />
          <Stat
            label="薄弱知识点"
            value={`${lesson.weakKnowledgePoints.length} 项`}
            hint="掌握度 < 75%"
          />
        </div>

        {/* 薄弱知识点 Top3 */}
        <SectionHeader title="薄弱知识点 Top 3" />
        <ul className="m-0 flex w-full flex-col gap-[var(--space-150)] p-0 list-none">
          {lesson.weakKnowledgePoints.map((kp) => (
            <li
              key={kp.id}
              className="flex w-full items-center justify-between gap-[var(--space-200)] rounded-[var(--radius-md)] border border-border bg-bg px-[var(--space-250)] py-[var(--space-200)]"
            >
              <span className="text-[length:var(--font-size-sm)] text-text">{kp.label}</span>
              <span className="flex items-center gap-[var(--space-200)]">
                <span className="text-[length:var(--font-size-xs)] text-text-tertiary">
                  掌握度
                </span>
                <span
                  className={cn(
                    "text-[length:var(--font-size-sm)] font-[var(--font-weight-semi-bold)]",
                    kp.mastery < 70 ? "text-[var(--color-warning)]" : "text-text"
                  )}
                >
                  {kp.mastery}%
                </span>
              </span>
            </li>
          ))}
        </ul>

        {/* 潜在掉队学员 */}
        <SectionHeader title="潜在掉队学员 Top 3" />
        <ul className="m-0 flex w-full flex-col gap-[var(--space-150)] p-0 list-none">
          {fallingBehind.map((stu) => (
            <li
              key={stu.id}
              className="flex w-full items-start gap-[var(--space-200)] rounded-[var(--radius-md)] border border-border bg-bg px-[var(--space-250)] py-[var(--space-200)]"
            >
              <span
                className={cn(
                  "shrink-0 rounded-full px-[var(--space-200)] py-[2px] text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)]",
                  stu.riskTag === "风险"
                    ? "bg-[var(--color-warning)]/10 text-[var(--color-warning)]"
                    : "bg-bg-secondary text-text-secondary"
                )}
              >
                {stu.riskTag}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
                <span className="text-[length:var(--font-size-sm)] text-text">
                  {stu.name} · 薄弱「{stu.weakPoints.join("、") || "—"}」
                </span>
                <span className="text-[length:var(--font-size-xs)] text-text-tertiary">
                  {stu.suggestion}
                </span>
              </div>
            </li>
          ))}
        </ul>

        {/* 备课包推荐 */}
        <SectionHeader title="本节备课包推荐" />
        <ul className="m-0 flex w-full flex-col gap-[var(--space-200)] p-0 list-none">
          {lesson.preparePackages.map((pkg) => (
            <li
              key={pkg.id}
              className="flex w-full items-start justify-between gap-[var(--space-200)] rounded-[var(--radius-md)] border border-border bg-bg px-[var(--space-250)] py-[var(--space-250)]"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
                <span className="text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)] text-text">
                  {pkg.name}
                </span>
                <span className="text-[length:var(--font-size-xs)] text-text-tertiary">
                  {pkg.coverage} · {pkg.summary}
                </span>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-[var(--space-150)]">
                <span className="text-[length:var(--font-size-xs)] text-text-tertiary">
                  适配度 <span className="text-[var(--color-success)] font-[var(--font-weight-semi-bold)]">{pkg.fitness}%</span>
                </span>
                <ChatPromptButton onClick={() => onPickPrompt(`采纳「${pkg.name}」备课包`)}>
                  一键采纳
                </ChatPromptButton>
              </div>
            </li>
          ))}
        </ul>
      </GenericCard>

      <AiClassroomRecommendedPrompts prompts={RECOMMENDED_PROMPTS} onPick={onPickPrompt} />
    </div>
  )
}

function Chip({ label, tone = "default" }: { label: string; tone?: "default" | "info" | "success" }) {
  const cls =
    tone === "info"
      ? "bg-[var(--color-info)]/10 text-[var(--color-info)]"
      : tone === "success"
        ? "bg-[var(--color-success)]/10 text-[var(--color-success)]"
        : "bg-bg-secondary text-text-secondary"
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[var(--radius-sm)] px-[var(--space-200)] py-[2px] text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)]",
        cls
      )}
    >
      {label}
    </span>
  )
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-[2px] rounded-[var(--radius-md)] border border-border bg-bg-secondary/40 px-[var(--space-250)] py-[var(--space-200)]">
      <span className="text-[length:var(--font-size-xs)] text-text-tertiary leading-tight">
        {label}
      </span>
      <span className="text-[length:var(--font-size-md)] font-[var(--font-weight-semi-bold)] text-text leading-tight">
        {value}
      </span>
      {hint ? (
        <span className="text-[length:var(--font-size-xs)] text-text-tertiary leading-tight">
          {hint}
        </span>
      ) : null}
    </div>
  )
}

function SectionHeader({ title }: { title: string }) {
  return (
    <h4 className="m-0 mt-[var(--space-300)] text-[length:var(--font-size-sm)] font-[var(--font-weight-semi-bold)] text-text">
      {title}
    </h4>
  )
}
