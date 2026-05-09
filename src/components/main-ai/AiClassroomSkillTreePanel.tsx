/**
 * AI课堂三级菜单面板（PRD 2.8.2 / 2.8.3 落位的可点击 Skill 列表）。
 *
 * - 由 `MainAIChatWindow` 在 dock 会话 dockAppId === "ai_classroom" 的首条助手消息位置渲染；
 * - 点击 Skill 项 → 调用 onPickSkill 在该会话追加 user/ai 占位回复（具体逻辑在父组件中）；
 * - 本面板不维护任何业务状态，仅做展示与点击转发，避免与现有会话流耦合。
 */
import * as React from "react"
import { GenericCard } from "./GenericCard"
import { ChatPromptButton } from "../chat/ChatPromptButton"
import { cn } from "../ui/utils"
import {
  pickAiClassroomTree,
  type AiClassroomSkillItem,
  type AiClassroomSkillTree,
} from "./aiClassroomSkillTree"
import type { EduLessonAttendingRole } from "./homeScenarioLayout"
import type { LessonDeliveryMode } from "./lessonDeliveryMode"

export interface AiClassroomSkillTreePanelProps {
  role: EduLessonAttendingRole
  /**
   * 课程形态（PRD 2.5.1）：默认 `"online"`。
   * 仅"课中"分组按形态切换 chip（线下替换为 IFP / 摄像头 / 教室 Pad / 接送闭环 等）。
   */
  deliveryMode?: LessonDeliveryMode
  onPickSkill: (item: AiClassroomSkillItem) => void
  /** 顶部「快捷指令」点击：把字符串投回主对话或当前会话（由父组件决定路由） */
  onQuickPrompt?: (prompt: string) => void
  className?: string
}

const ROLE_TITLE: Record<EduLessonAttendingRole, string> = {
  teacher: "AI课堂 · 教师视角",
  student: "AI课堂 · 学生视角",
  parent: "AI课堂 · 家长视角",
}

export function AiClassroomSkillTreePanel({
  role,
  deliveryMode = "online",
  onPickSkill,
  onQuickPrompt,
  className,
}: AiClassroomSkillTreePanelProps) {
  const tree: AiClassroomSkillTree = React.useMemo(
    () => pickAiClassroomTree(role, undefined, deliveryMode),
    [role, deliveryMode],
  )

  return (
    <div className={cn("flex w-full max-w-[min(100%,720px)] flex-col gap-[var(--space-300)]", className)}>
      <GenericCard title={ROLE_TITLE[role]}>
        <p className="m-0 text-[length:var(--font-size-sm)] leading-relaxed text-text-secondary">
          {tree.intro}
        </p>
        <p className="mt-[var(--space-200)] m-0 text-[length:var(--font-size-xs)] leading-relaxed text-text-tertiary">
          以下三级菜单严格按 PRD 2.8.2 / 2.8.3 当前身份的可见 Skill 集合呈现；点击任一项可在本会话内继续对话（本轮以占位回复承接）。
        </p>

        <div className="mt-[var(--space-400)] flex w-full flex-col gap-[var(--space-400)]">
          {tree.sections.map((section) => (
            <section key={section.title} className="flex w-full flex-col gap-[var(--space-200)]">
              <header className="flex items-baseline gap-[var(--space-200)]">
                <h4 className="m-0 text-[length:var(--font-size-sm)] font-[var(--font-weight-semi-bold)] text-text">
                  {section.title}
                </h4>
                {section.hint ? (
                  <span className="text-[length:var(--font-size-xs)] text-text-tertiary">
                    {section.hint}
                  </span>
                ) : null}
              </header>
              <ul className="flex w-full flex-col gap-[6px]">
                {section.items.map((item) => (
                  <li key={item.id} className="w-full">
                    <button
                      type="button"
                      onClick={() => !item.disabled && onPickSkill(item)}
                      disabled={item.disabled}
                      className={cn(
                        "flex w-full items-center justify-between gap-[var(--space-300)] rounded-[var(--radius-md)] border border-border bg-bg px-[var(--space-300)] py-[var(--space-250)] text-left transition-colors",
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                        item.disabled
                          ? "cursor-not-allowed opacity-50"
                          : "hover:border-primary/30 hover:bg-bg-secondary",
                      )}
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-[var(--space-200)]">
                        {item.emoji ? (
                          <span aria-hidden className="shrink-0 text-[length:var(--font-size-md)] leading-none">
                            {item.emoji}
                          </span>
                        ) : null}
                        <span
                          className={cn(
                            "min-w-0 flex-1 truncate text-[length:var(--font-size-sm)] font-[var(--font-weight-regular)]",
                            item.disabled ? "text-text-tertiary" : "text-text",
                          )}
                        >
                          {item.label}
                        </span>
                      </div>
                      {item.badge ? (
                        <span className="shrink-0 rounded-[var(--radius-sm)] bg-bg-secondary px-[var(--space-150)] py-[2px] text-[length:var(--font-size-xs)] text-primary">
                          {item.badge}
                        </span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </GenericCard>

      {onQuickPrompt && tree.quickPrompts.length > 0 ? (
        <div className="flex w-full flex-wrap gap-[var(--space-200)]">
          {tree.quickPrompts.map((prompt) => (
            <ChatPromptButton key={prompt} type="button" onClick={() => onQuickPrompt(prompt)}>
              {prompt}
            </ChatPromptButton>
          ))}
        </div>
      ) : null}
    </div>
  )
}
