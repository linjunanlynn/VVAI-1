/**
 * AI 课堂结构化回复气泡（共享组件）。
 *
 * 用途：
 * - 子 CUI（`AiClassroomSideConversationPanel`）—— AI 课堂内推荐指令 / 兜底 / 入场欢迎
 * - 教育主对话（`MainAIChatWindow`）—— 主开场 chip "direct" 类点击的回复 + IM banner 等结构化反馈
 *
 * 设计要点：
 * - 视觉与普通 AI 文本气泡保持一致（白底 + 同色边 + 同 radius）
 * - chip 行作为单独子层渲染在气泡**下方**（与气泡同列）；不挤进气泡内部，便于换行而不影响阅读体验
 * - chip 视觉与 `AiClassroomSkillCard.recommendedPrompts` 同款（pill + emoji + 主/次色）；
 *   primary tone 用主色，secondary tone 中性灰
 */

import * as React from "react"
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar"
import { cn } from "../ui/utils"
import type { AiClassroomReply } from "./aiClassroomReply"

export function AiClassroomStructuredReplyBubble({
  reply,
  botAvatarSrc,
  onPickAction,
  /** 主对话渲染时可选：让头像与同行其他 message 的对齐网格保持一致；不传按子 CUI 默认尺寸 */
  avatarClassName,
}: {
  reply: AiClassroomReply
  botAvatarSrc: string
  onPickAction: (prompt: string) => void
  avatarClassName?: string
}) {
  const hasActions = (reply.nextActions?.length ?? 0) > 0
  return (
    <div className="flex w-full flex-row items-start justify-start gap-2 md:gap-[8px]">
      <Avatar className={cn("mt-0.5 size-7 shrink-0 md:size-9", avatarClassName)}>
        <AvatarImage src={botAvatarSrc} />
        <AvatarFallback>AI</AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-1 flex-col gap-[var(--space-200)]">
        <div className="max-w-[min(100%,520px)] rounded-tl-[var(--radius-sm)] rounded-tr-[var(--radius-lg)] rounded-bl-[var(--radius-lg)] rounded-br-[var(--radius-lg)] border border-border bg-bg px-[var(--space-350)] py-[var(--space-300)] text-left shadow-xs">
          <p className="m-0 text-[length:var(--font-size-base)] leading-normal text-text whitespace-pre-wrap break-words">
            {reply.headline}
          </p>
          {reply.body?.map((line, idx) => (
            <p
              key={idx}
              className="m-0 mt-[var(--space-150)] text-[length:var(--font-size-base)] leading-normal text-text whitespace-pre-wrap break-words"
            >
              {line}
            </p>
          ))}
          {reply.systemNote ? (
            <p className="m-0 mt-[var(--space-200)] text-[length:var(--font-size-xs)] leading-snug text-text-tertiary whitespace-pre-wrap break-words">
              {reply.systemNote}
            </p>
          ) : null}
        </div>
        {hasActions ? (
          <div
            className="flex max-w-[min(100%,520px)] flex-wrap gap-[var(--space-150)]"
            role="group"
            aria-label="下一步可以"
          >
            {reply.nextActions!.map((action, idx) => (
              <button
                key={`${action.prompt}-${idx}`}
                type="button"
                onClick={() => onPickAction(action.prompt)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-[var(--space-100)] h-[var(--space-700)] px-[var(--space-300)] py-[var(--space-150)]",
                  "rounded-full border transition-all duration-200 ease-out",
                  "text-[length:var(--font-size-xs)] leading-none whitespace-nowrap font-[var(--font-weight-medium)]",
                  action.tone === "primary"
                    ? "border-[var(--color-primary)]/45 bg-[var(--color-primary)]/8 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/14"
                    : "border-border bg-bg text-text hover:bg-[var(--black-alpha-11)]",
                )}
              >
                {action.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
