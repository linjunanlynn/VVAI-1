/**
 * AI 课堂「课中现场卡」组件。
 *
 * 与清单卡（`AiClassroomChecklistCard`）的关键区别：
 * - 没有 ☐ / ☑ 状态：课中没有"做完就结"的语义
 * - 没有进度条 / 0-N 计数：抢答 / 提问可以多次，"打勾"反而压抑主动性
 * - 没有完成庆祝：课中"成就感"由"接住老师那一刻"本身给到，不是 AI 替你打勾
 *
 * 三段式：
 * 1. **直播状态**：呼吸绿点 + 一行进度文本（哪节、第几题、已多少分钟）
 * 2. **AI 当下建议**：一句话指向"现在应该做什么"（左侧主色边线，弱底色，与正文区分）
 * 3. **可用动作分组**：分 1-2 组（如"现在可以"/"全程都可以"），每个 action 可挂一行 meta
 */

import * as React from "react"
import { GenericCard } from "./GenericCard"
import { cn } from "../ui/utils"
import type {
  AiClassroomLiveMoment,
  AiClassroomLiveMomentAction,
} from "./aiClassroomLiveMoment"

export interface AiClassroomLiveMomentCardProps {
  data: AiClassroomLiveMoment
  /** 点击 chip 触发；统一交由 panel 走 handleRecommendedPrompt */
  onPickAction: (action: AiClassroomLiveMomentAction) => void
  className?: string
}

export function AiClassroomLiveMomentCard({
  data,
  onPickAction,
  className,
}: AiClassroomLiveMomentCardProps) {
  return (
    <div className={cn("flex w-full max-w-[min(100%,720px)] flex-col", className)}>
      <GenericCard title={data.title}>
        {/* 直播状态条：呼吸绿点 + 进度文本 */}
        <div className="flex w-full items-center gap-[var(--space-200)]">
          <span
            className="inline-flex h-[8px] w-[8px] shrink-0 rounded-full bg-[var(--color-success)] animate-pulse"
            aria-hidden
          />
          <span className="text-[length:var(--font-size-xs)] leading-snug text-text-secondary">
            {data.liveStatus}
          </span>
        </div>

        {/* AI 当下建议：左主色边 + 弱底；让"建议"与"状态"在视觉上分开 */}
        {data.contextHint ? (
          <div className="mt-[var(--space-250)] flex w-full items-start gap-[var(--space-200)] rounded-[var(--radius-md)] border-l-2 border-[var(--color-primary)] bg-[var(--color-primary)]/5 px-[var(--space-300)] py-[var(--space-200)]">
            <span aria-hidden className="mt-[1px] shrink-0 text-[length:var(--font-size-sm)] leading-none">
              🤖
            </span>
            <span className="text-[length:var(--font-size-sm)] leading-relaxed text-text">
              {data.contextHint}
            </span>
          </div>
        ) : null}

        {/* 分组动作 */}
        <div className="mt-[var(--space-300)] flex w-full flex-col gap-[var(--space-300)]">
          {data.sections.map((section, sIdx) => (
            <div key={`${section.title}-${sIdx}`} className="flex w-full flex-col gap-[var(--space-150)]">
              <div className="flex items-baseline gap-[var(--space-200)]">
                <span className="text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] text-text">
                  {section.title}
                </span>
                {section.hint ? (
                  <span className="text-[length:var(--font-size-xs)] text-text-tertiary">
                    {section.hint}
                  </span>
                ) : null}
              </div>
              <div className="flex w-full flex-col gap-[var(--space-200)]">
                {section.actions.map((action, aIdx) => (
                  <ActionRow
                    key={`${section.title}-${aIdx}-${action.prompt}`}
                    action={action}
                    onClick={() => onPickAction(action)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* 底部小字提示 */}
        {data.footerNote ? (
          <p className="mt-[var(--space-300)] m-0 text-[length:var(--font-size-xs)] leading-snug text-text-tertiary">
            {data.footerNote}
          </p>
        ) : null}
      </GenericCard>
    </div>
  )
}

function ActionRow({
  action,
  onClick,
}: {
  action: AiClassroomLiveMomentAction
  onClick: () => void
}) {
  const isPrimary = action.tone === "primary"
  return (
    <div
      className={cn(
        "flex w-full items-center gap-[var(--space-300)] rounded-[var(--radius-md)] border px-[var(--space-300)] py-[var(--space-250)]",
        isPrimary
          ? "border-[var(--color-primary)]/35 bg-[var(--color-primary)]/5"
          : "border-border bg-bg",
        action.disabled ? "opacity-60" : "",
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-[var(--space-100)]">
        <span
          className={cn(
            "text-[length:var(--font-size-base)] leading-normal font-[var(--font-weight-medium)]",
            "text-text",
          )}
        >
          {action.label}
        </span>
        {action.meta ? (
          <span className="text-[length:var(--font-size-xs)] leading-snug text-text-secondary">
            {action.meta}
          </span>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "inline-flex shrink-0 self-center items-center gap-[var(--space-100)] h-[var(--space-700)] px-[var(--space-300)] py-[var(--space-150)]",
          "rounded-full border transition-all duration-200 ease-out",
          "text-[length:var(--font-size-xs)] leading-none whitespace-nowrap font-[var(--font-weight-medium)]",
          isPrimary
            ? "border-[var(--color-primary)]/45 bg-[var(--color-primary)]/10 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/16"
            : "border-border bg-bg text-text hover:bg-[var(--black-alpha-11)]",
        )}
        aria-label={`选择：${action.label}`}
      >
        {isPrimary ? "去做" : "选用"}
      </button>
    </div>
  )
}
