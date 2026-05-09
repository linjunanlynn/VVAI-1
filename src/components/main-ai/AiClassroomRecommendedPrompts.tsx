/**
 * 推荐指令条：所有 AI 课堂卡片底部共用。
 *
 * - 横向 chip，溢出自动折行
 * - 默认渲染样式与 ChatPromptButton 对齐，但避免引入新依赖
 * - 点击：交由父组件决定追加用户消息 / 触发新一轮卡片
 */
import * as React from "react"
import { ChatPromptButton } from "../chat/ChatPromptButton"
import { cn } from "../ui/utils"

export interface AiClassroomRecommendedPromptsProps {
  prompts: string[]
  onPick: (prompt: string) => void
  className?: string
  /** 顶部 hint，例如「下一步可以」 */
  label?: string
}

export function AiClassroomRecommendedPrompts({
  prompts,
  onPick,
  className,
  label = "下一步可以",
}: AiClassroomRecommendedPromptsProps) {
  if (!prompts || prompts.length === 0) return null
  return (
    <div className={cn("mt-[var(--space-200)] flex w-full flex-col gap-[var(--space-150)]", className)}>
      {label ? (
        <span className="text-[length:var(--font-size-xs)] text-text-tertiary">
          {label}
        </span>
      ) : null}
      <div className="flex w-full flex-wrap gap-[var(--space-200)]">
        {prompts.map((prompt) => (
          <ChatPromptButton key={prompt} type="button" onClick={() => onPick(prompt)}>
            {prompt}
          </ChatPromptButton>
        ))}
      </div>
    </div>
  )
}
