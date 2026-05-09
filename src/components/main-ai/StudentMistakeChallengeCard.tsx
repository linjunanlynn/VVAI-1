/**
 * 学生 · 课后 · 错题挑战（Bespoke 卡片，含 C→B 联动）
 *
 * - 题面 + 我的答案 / 正解
 * - 错点定位（知识点 + 错误类型）
 * - 3 道同类变式题预览
 * - 推荐指令：「把这道题转给王老师答疑」会触发 C→B 联动
 */
import * as React from "react"
import { GenericCard } from "./GenericCard"
import { AiClassroomRecommendedPrompts } from "./AiClassroomRecommendedPrompts"
import { ChatPromptButton } from "../chat/ChatPromptButton"
import { cn } from "../ui/utils"
import { DEMO_LESSON, DEMO_MISTAKE_QUESTION } from "./aiClassroomLessonDemo"

export interface StudentMistakeChallengeCardProps {
  onPickPrompt: (prompt: string) => void
}

const RECOMMENDED_PROMPTS = [
  "让我老师看一下这道题",
  "再来 3 道同类的",
  "讲一遍为什么我的方向判断反了",
  "看本章错题清单",
]

export function StudentMistakeChallengeCard({ onPickPrompt }: StudentMistakeChallengeCardProps) {
  const q = DEMO_MISTAKE_QUESTION
  return (
    <div className="flex w-full max-w-[min(100%,720px)] flex-col">
      <GenericCard title={`重做错题 · 第 ${q.index} 题`}>
        <p className="m-0 text-[length:var(--font-size-xs)] text-text-tertiary">
          来自 {DEMO_LESSON.subject}《{DEMO_LESSON.title}》· 知识点「{q.knowledgePoint}」
        </p>

        {/* 题干 */}
        <div className="mt-[var(--space-300)] rounded-[var(--radius-md)] border border-border bg-bg px-[var(--space-300)] py-[var(--space-250)]">
          <span className="block text-[length:var(--font-size-xs)] text-text-tertiary">题目</span>
          <p className="m-0 mt-[var(--space-100)] text-[length:var(--font-size-sm)] leading-relaxed text-text">
            {q.prompt}
          </p>
        </div>

        {/* 我的答案 vs 正解 */}
        <div className="mt-[var(--space-200)] grid w-full grid-cols-2 gap-[var(--space-200)]">
          <div className="rounded-[var(--radius-md)] border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/5 px-[var(--space-250)] py-[var(--space-200)]">
            <span className="block text-[length:var(--font-size-xs)] text-[var(--color-warning)]">
              我的答案
            </span>
            <span className="mt-[2px] block text-[length:var(--font-size-sm)] text-text">
              {q.myAnswer}
            </span>
          </div>
          <div className="rounded-[var(--radius-md)] border border-[var(--color-success)]/30 bg-[var(--color-success)]/5 px-[var(--space-250)] py-[var(--space-200)]">
            <span className="block text-[length:var(--font-size-xs)] text-[var(--color-success)]">
              正解
            </span>
            <span className="mt-[2px] block text-[length:var(--font-size-sm)] text-text">
              {q.correctAnswer}
            </span>
          </div>
        </div>

        {/* 错点定位（demo 文案） */}
        <div className="mt-[var(--space-200)] rounded-[var(--radius-md)] border border-border bg-bg-secondary/40 px-[var(--space-250)] py-[var(--space-200)]">
          <span className="block text-[length:var(--font-size-xs)] text-text-tertiary">错点定位</span>
          <p className="m-0 mt-[2px] text-[length:var(--font-size-sm)] leading-snug text-text">
            F1 与 F3 反向相加得 1N，与 F2 = 3N 正交合成后，主导方向应是 F2 所在的正北。你忽略了 F1、F3 抵消后的剩余分量。
          </p>
        </div>

        {/* 同类变式题预览 */}
        <h4 className="m-0 mt-[var(--space-300)] text-[length:var(--font-size-sm)] font-[var(--font-weight-semi-bold)] text-text">
          再来一组同类题预览
        </h4>
        <ul className="m-0 mt-[var(--space-200)] flex w-full flex-col gap-[var(--space-150)] p-0 list-none">
          {q.variantPreviews.map((v) => (
            <li
              key={v.id}
              className="flex w-full items-center justify-between gap-[var(--space-200)] rounded-[var(--radius-md)] border border-border bg-bg px-[var(--space-250)] py-[var(--space-200)]"
            >
              <span className="text-[length:var(--font-size-sm)] text-text">{v.label}</span>
              <span className="shrink-0 text-[length:var(--font-size-xs)] text-text-tertiary">≈ 90 秒</span>
            </li>
          ))}
        </ul>

        <div className={cn("mt-[var(--space-300)] flex w-full justify-end")}>
          <ChatPromptButton onClick={() => onPickPrompt("开始重做 3 道同类题")}>
            开始重做
          </ChatPromptButton>
        </div>
      </GenericCard>

      <AiClassroomRecommendedPrompts prompts={RECOMMENDED_PROMPTS} onPick={onPickPrompt} />
    </div>
  )
}
