/**
 * 老师「推随堂题」选题面板（轻量 modal · 居中）。
 *
 * - 三个题库题目，每题展示 stem + 知识点 + 倒计时；
 * - 老师点选 → 立即推题（pushQuiz）→ 关闭面板；
 * - "随机一题"：从题库里挑一题（按推过的递增）；
 * - 题干右上角是简短的"为什么推这题"的 AI 推荐理由（基于本节学情画像，demo 静态文案）。
 */

import * as React from "react"
import { Sparkles, X } from "lucide-react"
import { cn } from "../ui/utils"
import { QUIZ_BANK } from "./aiClassroomQuizBank"
import { pushQuiz, type AiClassroomQuizQuestion } from "./aiClassroomQuizBus"

export interface AiClassroomQuizPushSheetProps {
  open: boolean
  lessonId: string
  /** 已推过的题数（用于"随机推下一题"轮转题库 / 显示"本节将是第 N 题"） */
  questionSeq: number
  onClose: () => void
  /** 推题成功（真实 push 已发出）回调；父级用来触发 demo 同学自动提交模拟 */
  onPushed: (q: AiClassroomQuizQuestion) => void
}

const RECOMMENDATION_BY_QID: Record<string, string> = {
  "q-vec-perp-5n": "本节高频错点：方向判断（mastery 58%），推这道题最对症",
  "q-direction-judge": "上节 2 名同学卡在反向合成，此题是对症变式",
  "q-parallelogram-rule": "课件第 3 页刚讲完，趁热打铁巩固",
}

export function AiClassroomQuizPushSheet({
  open,
  lessonId,
  questionSeq,
  onClose,
  onPushed,
}: AiClassroomQuizPushSheetProps) {
  /** Esc 关闭 */
  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!open) return null

  const handlePush = (q: AiClassroomQuizQuestion) => {
    pushQuiz(lessonId, q)
    onPushed(q)
    onClose()
  }

  /** "随机一题"：按 questionSeq 轮转题库，避免连续推到同一题 */
  const handleRandom = () => {
    const idx = questionSeq % QUIZ_BANK.length
    handlePush(QUIZ_BANK[idx])
  }

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/55"
      role="dialog"
      aria-modal="true"
      aria-label="推随堂题"
      onClick={(e) => {
        /** 点击遮罩关闭，但点中间的卡片不关闭 */
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="flex w-[min(92vw,640px)] max-h-[80vh] flex-col overflow-hidden rounded-[var(--radius-lg)] border border-border bg-bg shadow-[0_24px_48px_rgba(15,23,42,0.32)]"
        /** 阻止点击卡片冒泡触发遮罩关闭 */
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center gap-2 border-b border-border px-5 py-3">
          <span className="inline-flex size-7 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <h3 className="m-0 flex-1 text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-text">
            推随堂题 · 本节将是第 {questionSeq + 1} 题
          </h3>
          <button
            type="button"
            onClick={handleRandom}
            className="inline-flex h-7 items-center rounded-full border border-border bg-bg px-3 text-[length:var(--font-size-xs)] text-text-secondary transition-colors hover:bg-[var(--black-alpha-11)] hover:text-text"
          >
            AI 推一题
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="flex size-7 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-[var(--black-alpha-11)] hover:text-text"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <p className="m-0 mb-2 text-[length:var(--font-size-xs)] text-text-tertiary">
            从题库挑 1 道，全班 60 秒作答，AI 自动批改并给每位同学个性化反馈。
          </p>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {QUIZ_BANK.map((q) => {
              const recommend = RECOMMENDATION_BY_QID[q.id]
              return (
                <li
                  key={q.id}
                  className={cn(
                    "rounded-[var(--radius-md)] border border-border bg-bg p-3 transition-colors hover:border-[var(--color-primary)]/55",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="m-0 text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)] text-text">
                        {q.stem}
                      </p>
                      <p className="m-0 mt-1 truncate text-[length:var(--font-size-xs)] text-text-tertiary">
                        {q.knowledgeTag} · {q.options.length} 选项 · 倒计时 {q.deadlineSec}s
                      </p>
                      {recommend ? (
                        <p className="m-0 mt-1.5 inline-flex items-center gap-1 rounded-full bg-[var(--color-primary)]/8 px-2 py-0.5 text-[length:var(--font-size-xs)] text-[var(--color-primary)]">
                          <Sparkles className="h-3 w-3" />
                          {recommend}
                        </p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => handlePush(q)}
                      className="inline-flex h-8 shrink-0 items-center rounded-full border border-[var(--color-primary)]/55 bg-[var(--color-primary)] px-3 text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] text-[var(--color-primary-foreground,white)] shadow-sm transition-colors hover:bg-primary-hover"
                    >
                      推送给全班
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>

        <footer className="border-t border-border bg-bg-subtle/30 px-5 py-2.5 text-[length:var(--font-size-xs)] text-text-tertiary">
          推送后：学生端会立即弹出题卡 · 60 秒倒计时到自动结束 · AI 批改 1 秒后给每位同学个性化反馈
        </footer>
      </div>
    </div>
  )
}
