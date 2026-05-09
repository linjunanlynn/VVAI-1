/**
 * 教育三身份 · 课堂任务 banner（学生侧 / 家长侧用途待扩展）
 *
 * 用途：
 * 当老师在课堂子 CUI 里点了「出一道随堂题」（推送了一份 ClassTaskEvent 到 eduClassTaskBus），
 * 切到学生场景（场景七）时在主 CUI 欢迎区下方挂一条 banner，告诉学生：
 *   - 哪节课的老师布置了一道随堂题
 *   - 题面预览 + 倒计时（demo 用静态 90s）
 *   - CTA：「立刻进课堂答题」 → 打开课堂子 CUI（带 lessonId）
 *
 * 学生在子 CUI 答完后，submissions[当前学生] 会被记入 bus，banner 自动消失。
 *
 * 这是"老师→学生 课堂联动"闭环的两条腿之一（另一条腿在子 CUI 内部，见
 * `eduClassTaskBus` 的 `useClassTasksForLesson` + `ClassQuizTaskCard`）。
 */
import * as React from "react"
import { cn } from "../ui/utils"
import { GenericCard } from "./GenericCard"
import { ChatPromptButton } from "../chat/ChatPromptButton"
import type { ClassTaskEvent } from "./eduClassTaskBus"

export interface EduClassTaskBannerProps {
  /** 当前学生姓名（默认 demo 用 "李小明"） */
  studentName: string
  /** 该课程下的全部任务（已交 / 未交都给，便于显示"已完成 1 道"等元信息） */
  tasks: ClassTaskEvent[]
  /** 进入课堂子 CUI 的回调（应当传入 lessonId 并 kind="open-only"） */
  onEnterLesson: (lessonId: string) => void
  className?: string
}

export function EduClassTaskBanner({
  studentName,
  tasks,
  onEnterLesson,
  className,
}: EduClassTaskBannerProps) {
  const open = tasks.filter((t) => !t.closed && !t.submissions[studentName])
  if (open.length === 0) return null

  /** demo 只渲染最新一道未交，避免堆栈太多 */
  const focus = open[open.length - 1]
  const opt = focus.question.options
    .map((o, i) => `${String.fromCharCode(65 + i)}. ${o}`)
    .join(" / ")

  const cardTitle =
    open.length > 1
      ? `🔔 ${focus.fromName}刚布置了 ${open.length} 道随堂题，等你交卷`
      : `🔔 ${focus.fromName}刚布置了一道随堂题，等你交卷`

  return (
    <div className={cn("flex w-full max-w-[min(100%,720px)] flex-col", className)}>
      <GenericCard title={cardTitle}>
        <div className="flex w-full flex-col gap-[var(--space-200)]">
          <div className="flex items-start gap-[var(--space-250)] rounded-[var(--radius-md)] border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/5 px-[var(--space-300)] py-[var(--space-250)]">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-warning)]/15 text-[length:var(--font-size-md)]">
              🎯
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-[var(--space-100)]">
              <div className="flex items-center gap-[var(--space-150)]">
                <span className="truncate text-[length:var(--font-size-sm)] font-[var(--font-weight-semi-bold)] text-text">
                  {focus.lessonTitle} · 1 分半内交卷
                </span>
                {focus.question.knowledgePoint ? (
                  <span className="shrink-0 rounded-[var(--radius-sm)] bg-[var(--color-warning)]/20 px-[var(--space-150)] py-[1px] text-[10px] font-[var(--font-weight-medium)] text-[var(--color-warning)]">
                    {focus.question.knowledgePoint}
                  </span>
                ) : null}
              </div>
              <span className="text-[length:var(--font-size-xs)] text-text-secondary">
                {focus.question.prompt}
              </span>
              <span className="truncate text-[length:var(--font-size-xs)] text-text-tertiary">
                选项：{opt}
              </span>
            </div>
            {open.length > 1 ? (
              <span className="ml-auto shrink-0 self-center rounded-[var(--radius-sm)] bg-bg-secondary px-[var(--space-200)] py-[2px] text-[10px] font-[var(--font-weight-medium)] text-text-secondary">
                还有 {open.length - 1} 道
              </span>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-[var(--space-200)]">
            <ChatPromptButton
              type="button"
              onClick={() => onEnterLesson(focus.lessonId)}
              className="border-[var(--color-warning)]/40 bg-[var(--color-warning)]/10 text-[var(--color-warning)] hover:bg-[var(--color-warning)]/15"
            >
              立刻进课堂答题
            </ChatPromptButton>
            <span className="text-[length:var(--font-size-xs)] text-text-tertiary">
              答完这条会自动收起；本节做完的题目，得分都会出现在课后报告里。
            </span>
          </div>
        </div>
      </GenericCard>
    </div>
  )
}
