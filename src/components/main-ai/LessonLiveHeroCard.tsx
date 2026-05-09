/**
 * 课中身份化"课堂助手"主区卡：仅在 stage === "in" 时由父组件挂在首屏作为 Hero。
 * （注：原文案为"课堂副驾"，是产品自造词、老师不懂；统一改为"课堂助手"。）
 *
 * - 教师：当前题答题分布 + 举手队列 + 节奏建议
 * - 学生：当前题面 + 我的答题状态 + 提问入口（私聊老师 / 全班发言）
 * - 家长：孩子实时状态（专注度 / 互动 / 网络）+ 一眼直播配额提示
 */
import * as React from "react"
import { GenericCard } from "./GenericCard"
import { ChatPromptButton } from "../chat/ChatPromptButton"
import { cn } from "../ui/utils"
import {
  DEMO_HAND_RAISE_QUEUE,
  DEMO_LESSON,
  DEMO_LIVE_TICKER,
  DEMO_PARENT_LIVE_QUOTA,
  DEMO_QUICK_QUIZ,
  DEMO_STUDENT_SELF,
  getCurrentLiveSegment,
  getLessonRuntimeState,
} from "./aiClassroomLessonDemo"
import type { EduLessonAttendingRole } from "./homeScenarioLayout"

export interface LessonLiveHeroCardProps {
  role: EduLessonAttendingRole
  onAction: (command: string) => void
  className?: string
}

export function LessonLiveHeroCard({ role, onAction, className }: LessonLiveHeroCardProps) {
  const rt = getLessonRuntimeState("in")
  const elapsedSec = parseElapsed(rt.liveElapsed)
  const currentSeg = getCurrentLiveSegment(elapsedSec)

  return (
    <div className={cn("flex w-full max-w-[min(100%,720px)] flex-col gap-[var(--space-200)]", className)}>
      <GenericCard title="课堂助手">
        <div className="flex flex-wrap items-center gap-[var(--space-200)] text-[length:var(--font-size-xs)] text-text-tertiary">
          <Pill tone="success">直播中 · {rt.liveElapsed}</Pill>
          <Pill tone="info">当前：{currentSeg.label}</Pill>
          <span>知识点：{currentSeg.knowledgePoint}</span>
        </div>

        {role === "teacher" ? <TeacherView onAction={onAction} /> : null}
        {role === "student" ? <StudentView onAction={onAction} /> : null}
        {role === "parent" ? <ParentView onAction={onAction} /> : null}

        {/* 课堂事件 ticker（轻量动画：每 6 秒切一条） */}
        <Ticker items={DEMO_LIVE_TICKER[role]} />
      </GenericCard>
    </div>
  )
}

/* =================== 教师视图 =================== */
function TeacherView({ onAction }: { onAction: (cmd: string) => void }) {
  const total = DEMO_QUICK_QUIZ.distribution.reduce((a, b) => a + b, 0)
  return (
    <>
      <Section title={`当前小测：${DEMO_QUICK_QUIZ.prompt}`}>
        <ul className="m-0 flex w-full flex-col gap-[var(--space-150)] p-0 list-none">
          {DEMO_QUICK_QUIZ.options.map((opt, idx) => {
            const cnt = DEMO_QUICK_QUIZ.distribution[idx]
            const pct = total > 0 ? Math.round((cnt / total) * 100) : 0
            const correct = idx === DEMO_QUICK_QUIZ.correctIndex
            return (
              <li
                key={opt}
                className="flex w-full items-center gap-[var(--space-200)] rounded-[var(--radius-md)] border border-border bg-bg px-[var(--space-250)] py-[var(--space-200)]"
              >
                <span className={cn("shrink-0 text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)]", correct ? "text-[var(--color-success)]" : "text-text")}>
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className="min-w-0 flex-1 truncate text-[length:var(--font-size-sm)] text-text">{opt}</span>
                <div className="flex w-[120px] shrink-0 items-center gap-[var(--space-150)]">
                  <div className="h-[6px] flex-1 overflow-hidden rounded-full bg-bg-secondary">
                    <div
                      className={cn("h-full rounded-full", correct ? "bg-[var(--color-success)]" : "bg-primary/60")}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="shrink-0 text-[length:var(--font-size-xs)] text-text-tertiary">
                    {cnt}人 · {pct}%
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      </Section>

      <Section title={`举手 / 抢答队列（${DEMO_HAND_RAISE_QUEUE.length}）`}>
        <ul className="m-0 flex w-full flex-col gap-[var(--space-150)] p-0 list-none">
          {DEMO_HAND_RAISE_QUEUE.map((q, idx) => (
            <li
              key={q.id}
              className="flex w-full items-center gap-[var(--space-200)] rounded-[var(--radius-md)] border border-border bg-bg px-[var(--space-250)] py-[var(--space-200)]"
            >
              <span className="shrink-0 rounded-full bg-bg-secondary px-[var(--space-200)] py-[2px] text-[length:var(--font-size-xs)] text-text-secondary">
                #{idx + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-[length:var(--font-size-sm)] text-text">
                <span className="font-[var(--font-weight-medium)]">{q.name}</span> · {q.question}
              </span>
              <span className="shrink-0 text-[length:var(--font-size-xs)] text-text-tertiary">已等 {q.waitedSec}s</span>
            </li>
          ))}
        </ul>
      </Section>

      <div className="flex flex-wrap gap-[var(--space-200)]">
        <ChatPromptButton onClick={() => onAction("点名 张楠 回答")}>点名 张楠</ChatPromptButton>
        <ChatPromptButton onClick={() => onAction("把答错的同学单独补练")}>把答错的同学单独补练</ChatPromptButton>
        <ChatPromptButton onClick={() => onAction("智能分组")}>切到分组讨论</ChatPromptButton>
      </div>
    </>
  )
}

/* =================== 学生视图 =================== */
function StudentView({ onAction }: { onAction: (cmd: string) => void }) {
  return (
    <>
      <Section title="当前题">
        <div className="rounded-[var(--radius-md)] border border-border bg-bg px-[var(--space-300)] py-[var(--space-250)]">
          <p className="m-0 text-[length:var(--font-size-sm)] leading-relaxed text-text">
            {DEMO_QUICK_QUIZ.prompt}
          </p>
          <div className="mt-[var(--space-200)] grid grid-cols-2 gap-[var(--space-150)]">
            {DEMO_QUICK_QUIZ.options.map((opt, idx) => (
              <button
                key={opt}
                type="button"
                onClick={() => onAction(`我选 ${String.fromCharCode(65 + idx)}`)}
                className="flex items-center gap-[var(--space-150)] rounded-[var(--radius-md)] border border-border bg-bg px-[var(--space-200)] py-[var(--space-150)] text-left text-[length:var(--font-size-sm)] text-text hover:bg-bg-secondary"
              >
                <span className="font-[var(--font-weight-medium)]">{String.fromCharCode(65 + idx)}.</span>
                <span className="truncate">{opt}</span>
              </button>
            ))}
          </div>
        </div>
      </Section>

      <Section title="我的状态">
        <div className="grid grid-cols-3 gap-[var(--space-200)]">
          <Stat label="本节得分" value={`+${Math.floor(DEMO_STUDENT_SELF.interactionScore / 30)}`} hint="抢答 1 次正确" tone="success" />
          <Stat label="举手队列" value="第 2" hint="还有 1 人在前" />
          <Stat label="麦克风" value="正常" hint="降噪已开启" tone="success" />
        </div>
      </Section>

      <div className="flex flex-wrap gap-[var(--space-200)]">
        <ChatPromptButton onClick={() => onAction("我要抢答")}>我要抢答</ChatPromptButton>
        <ChatPromptButton onClick={() => onAction("我要提问")}>我要提问</ChatPromptButton>
        <ChatPromptButton onClick={() => onAction("把这道题加入我的错题本")}>加入错题本</ChatPromptButton>
      </div>
    </>
  )
}

/* =================== 家长视图 =================== */
function ParentView({ onAction }: { onAction: (cmd: string) => void }) {
  return (
    <>
      <Section title="孩子实时状态">
        <div className="grid grid-cols-3 gap-[var(--space-200)]">
          <Stat label="专注度" value={`${DEMO_STUDENT_SELF.attentionScore}`} hint="比上节 +6" tone="success" />
          <Stat label="互动" value="抢答 1" hint="答对 +1" />
          <Stat label="网络" value="80ms" hint="稳定" tone="success" />
        </div>
      </Section>

      <Section title="看一眼直播（30 秒）">
        <div className="rounded-[var(--radius-md)] border border-border bg-bg-secondary/40 px-[var(--space-300)] py-[var(--space-200)]">
          <div className="flex items-center justify-between">
            <span className="text-[length:var(--font-size-sm)] text-text">仅看 30 秒，不可录制 / 不可分享</span>
            <span className="text-[length:var(--font-size-xs)] text-text-tertiary">剩余 {DEMO_PARENT_LIVE_QUOTA.remainSec}s</span>
          </div>
          <div className="mt-[var(--space-150)] h-[6px] w-full overflow-hidden rounded-full bg-bg">
            <div className="h-full rounded-full bg-[var(--color-info)]" style={{ width: `${(DEMO_PARENT_LIVE_QUOTA.remainSec / DEMO_PARENT_LIVE_QUOTA.totalSec) * 100}%` }} />
          </div>
          <span className="mt-[var(--space-100)] block text-[length:var(--font-size-xs)] text-text-tertiary">
            {DEMO_PARENT_LIVE_QUOTA.resetHint}
          </span>
        </div>
      </Section>

      <div className="flex flex-wrap gap-[var(--space-200)]">
        <ChatPromptButton onClick={() => onAction("现在打开直播 30 秒")}>现在打开直播</ChatPromptButton>
        <ChatPromptButton onClick={() => onAction("孩子状态有变化提醒我")}>状态异常时提醒我</ChatPromptButton>
        <ChatPromptButton onClick={() => onAction("课后再叫我")}>课后再叫我</ChatPromptButton>
      </div>
    </>
  )
}

/* =================== 子组件 =================== */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-[var(--space-300)] flex w-full flex-col gap-[var(--space-200)]">
      <h4 className="m-0 text-[length:var(--font-size-sm)] font-[var(--font-weight-semi-bold)] text-text">
        {title}
      </h4>
      {children}
    </div>
  )
}

function Pill({ tone, children }: { tone: "info" | "success" | "warning"; children: React.ReactNode }) {
  const cls =
    tone === "success"
      ? "bg-[var(--color-success)]/10 text-[var(--color-success)]"
      : tone === "warning"
        ? "bg-[var(--color-warning)]/10 text-[var(--color-warning)]"
        : "bg-[var(--color-info)]/10 text-[var(--color-info)]"
  return (
    <span className={cn("inline-flex items-center rounded-[var(--radius-sm)] px-[var(--space-200)] py-[2px] text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)]", cls)}>
      {children}
    </span>
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

function Ticker({ items }: { items: string[] }) {
  const [idx, setIdx] = React.useState(0)
  React.useEffect(() => {
    if (items.length === 0) return
    const t = window.setInterval(() => setIdx((i) => (i + 1) % items.length), 6000)
    return () => window.clearInterval(t)
  }, [items.length])
  if (items.length === 0) return null
  return (
    <div className="mt-[var(--space-300)] flex w-full items-center gap-[var(--space-200)] rounded-[var(--radius-md)] border border-border bg-bg-secondary/30 px-[var(--space-250)] py-[var(--space-150)]">
      <span aria-hidden className="text-[length:var(--font-size-xs)] text-text-tertiary">📡</span>
      <span className="min-w-0 flex-1 truncate text-[length:var(--font-size-xs)] text-text">{items[idx]}</span>
      <span className="shrink-0 text-[10px] text-text-tertiary">课堂事件 · {DEMO_LESSON.classroom}</span>
    </div>
  )
}

function parseElapsed(label: string): number {
  const [m, s] = label.split(":").map((x) => parseInt(x, 10) || 0)
  return m * 60 + s
}
