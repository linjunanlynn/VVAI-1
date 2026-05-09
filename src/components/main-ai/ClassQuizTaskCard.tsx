/**
 * 课堂随堂题任务卡（学生侧 · AI 课堂子 CUI 内）
 *
 * 触发：当老师在课堂子 CUI 里执行 `tc-question` Skill 时，eduClassTaskBus 推送一条
 * `ClassTaskEvent`；学生切到课堂子 CUI 时由订阅 useEffect 自动 push 出一条带
 * `<<<RENDER_CLASS_QUIZ>>>:<taskId>` marker 的 message，由 MessageBubble 解析渲染本卡。
 *
 * 状态：
 * - 未交：渲染选项按钮，学生点击 → submitClassTaskAnswer → 显示判分反馈
 * - 已交：渲染"已交卷 + 是否正确 + 正解"
 * - 已关闭：渲染"已收卷"灰态
 *
 * 设计原则：
 * - 学生卡里**不展示全班分布**（那是老师的视角，避免被同学看到）
 * - 答案揭晓后允许"加入错题本 / 看一遍解析 / 看下一题"等下一步 chip
 */
import * as React from "react"
import { cn } from "../ui/utils"
import { GenericCard } from "./GenericCard"
import { ChatPromptButton } from "../chat/ChatPromptButton"
import {
  submitClassTaskAnswer,
  type ClassTaskEvent,
  type ClassTaskSubmission,
} from "./eduClassTaskBus"

export const RENDER_CLASS_QUIZ_MARKER = "<<<RENDER_CLASS_QUIZ>>>"

/** 序列化：写入 message.content，由 MessageBubble 识别后渲染本卡 */
export function buildClassQuizCardContent(taskId: string, studentName: string): string {
  return `${RENDER_CLASS_QUIZ_MARKER}:${taskId}|${studentName}`
}

export function parseClassQuizCardContent(
  content: string,
): { taskId: string; studentName: string } | null {
  if (!content.startsWith(`${RENDER_CLASS_QUIZ_MARKER}:`)) return null
  const rest = content.slice(`${RENDER_CLASS_QUIZ_MARKER}:`.length)
  const [taskId, studentName] = rest.split("|")
  if (!taskId || !studentName) return null
  return { taskId, studentName }
}

export interface ClassQuizTaskCardProps {
  /** 当前任务（由父组件订阅 bus 后传入实时态） */
  task: ClassTaskEvent | null
  /** 当前学生姓名 */
  studentName: string
  /** 学生选了某项后的回执（用于触发主气泡补"我答了 X"用户消息） */
  onAnswered?: (input: { task: ClassTaskEvent; optionIndex: number; isCorrect: boolean }) => void
  /** 学生在结果卡上点了下一步 chip → 走父级 prompt resolver */
  onPrompt?: (command: string) => void
  className?: string
}

export function ClassQuizTaskCard({
  task,
  studentName,
  onAnswered,
  onPrompt,
  className,
}: ClassQuizTaskCardProps) {
  if (!task) {
    return (
      <div className={cn("flex w-full max-w-[min(100%,640px)] flex-col", className)}>
        <GenericCard title="课堂任务">
          <span className="text-[length:var(--font-size-sm)] text-text-secondary">
            这道随堂题已被老师收回（或刷新后丢失）。
          </span>
        </GenericCard>
      </div>
    )
  }

  const submission = task.submissions[studentName] as ClassTaskSubmission | undefined
  const submitted = !!submission
  const closed = task.closed && !submitted
  const correctIndex = task.question.correctIndex

  const handlePick = (idx: number) => {
    if (submitted || closed) return
    const next = submitClassTaskAnswer(task.id, studentName, idx)
    if (!next) return
    onAnswered?.({
      task: next,
      optionIndex: idx,
      isCorrect: next.submissions[studentName].isCorrect,
    })
  }

  const stateHint = submitted
    ? "已交卷 · 王老师那边能看到全班的答案分布"
    : closed
      ? "已收卷 · 正解见下方"
      : `4 选 1 · ${task.question.knowledgePoint ?? task.lessonTitle}`

  return (
    <div className={cn("flex w-full max-w-[min(100%,640px)] flex-col", className)}>
      <GenericCard title={`🎯 ${task.fromName}布置的随堂题`}>
        <div className="flex w-full flex-col gap-[var(--space-200)]">
          <span className="text-[length:var(--font-size-xs)] text-text-tertiary">{stateHint}</span>
          <div className="rounded-[var(--radius-md)] border border-border bg-bg-secondary/40 px-[var(--space-300)] py-[var(--space-250)] text-[length:var(--font-size-sm)] text-text">
            {task.question.prompt}
          </div>

          <div className="flex flex-col gap-[var(--space-150)]">
            {task.question.options.map((opt, idx) => {
              const letter = String.fromCharCode(65 + idx)
              const picked = submission?.optionIndex === idx
              const isCorrect = idx === correctIndex
              const showAnswer = submitted || closed
              return (
                <button
                  key={idx}
                  type="button"
                  disabled={submitted || closed}
                  onClick={() => handlePick(idx)}
                  className={cn(
                    "group flex items-start gap-[var(--space-200)] rounded-[var(--radius-md)] border px-[var(--space-300)] py-[var(--space-200)] text-left transition-colors",
                    showAnswer
                      ? cn(
                          isCorrect
                            ? "border-[var(--color-success)]/45 bg-[var(--color-success)]/10"
                            : picked
                              ? "border-[var(--color-danger)]/45 bg-[var(--color-danger)]/10"
                              : "border-border bg-bg-secondary/30",
                          "cursor-default",
                        )
                      : "border-border bg-bg hover:border-[var(--color-info)]/40 hover:bg-[var(--color-info)]/5",
                  )}
                >
                  <span
                    className={cn(
                      "mt-[2px] flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[length:var(--font-size-xs)] font-[var(--font-weight-semi-bold)]",
                      showAnswer && isCorrect
                        ? "border-[var(--color-success)] bg-[var(--color-success)] text-white"
                        : showAnswer && picked
                          ? "border-[var(--color-danger)] bg-[var(--color-danger)] text-white"
                          : "border-border text-text-secondary",
                    )}
                    aria-hidden
                  >
                    {showAnswer && isCorrect ? "✓" : showAnswer && picked ? "✕" : letter}
                  </span>
                  <span className="text-[length:var(--font-size-sm)] text-text">{opt}</span>
                  {picked ? (
                    <span className="ml-auto shrink-0 self-center rounded-[var(--radius-sm)] bg-bg-secondary px-[var(--space-150)] py-[1px] text-[10px] font-[var(--font-weight-medium)] text-text-secondary">
                      你的选择
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>

          {submitted ? (
            <div
              className={cn(
                "rounded-[var(--radius-md)] px-[var(--space-300)] py-[var(--space-200)] text-[length:var(--font-size-sm)]",
                submission.isCorrect
                  ? "bg-[var(--color-success)]/10 text-[var(--color-success)]"
                  : "bg-[var(--color-danger)]/10 text-[var(--color-danger)]",
              )}
            >
              {submission.isCorrect
                ? `答对了，是 ${String.fromCharCode(65 + correctIndex)}（${task.question.options[correctIndex]}）。这道你比班里大多数同学都快，王老师那边会看到你这次的速度。`
                : `正解是 ${String.fromCharCode(65 + correctIndex)}（${task.question.options[correctIndex]}）。你选的 ${String.fromCharCode(65 + submission.optionIndex)} 是同学最常混的那项，先收进错题本，下次再遇到就不会再选错。`}
            </div>
          ) : closed ? (
            <div className="rounded-[var(--radius-md)] bg-bg-secondary/50 px-[var(--space-300)] py-[var(--space-200)] text-[length:var(--font-size-sm)] text-text-secondary">
              王老师已经收卷。正解是 {String.fromCharCode(65 + correctIndex)}（
              {task.question.options[correctIndex]}）。
            </div>
          ) : null}

          {(submitted || closed) && onPrompt ? (
            <div className="flex flex-wrap gap-[var(--space-200)]">
              {submission?.isCorrect ? (
                <>
                  <ChatPromptButton onClick={() => onPrompt("看一遍这道题的思路")}>
                    看一遍解题思路
                  </ChatPromptButton>
                  <ChatPromptButton onClick={() => onPrompt("等王老师讲完解析")}>
                    等王老师讲完解析
                  </ChatPromptButton>
                </>
              ) : (
                <>
                  <ChatPromptButton onClick={() => onPrompt("把这道题加入我的错题本")}>
                    加入我的错题本
                  </ChatPromptButton>
                  <ChatPromptButton
                    onClick={() =>
                      onPrompt(
                        `让 AI 讲一遍为什么是 ${String.fromCharCode(65 + correctIndex)}`,
                      )
                    }
                  >
                    让 AI 讲一遍为什么是 {String.fromCharCode(65 + correctIndex)}
                  </ChatPromptButton>
                  <ChatPromptButton onClick={() => onPrompt("我要提问")}>
                    我要提问
                  </ChatPromptButton>
                </>
              )}
            </div>
          ) : null}
        </div>
      </GenericCard>
    </div>
  )
}
