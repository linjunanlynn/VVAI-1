/**
 * AI 课堂「价值卡」渲染组件。
 *
 * 与 `AiClassroomChecklistCard` 视觉同源（都是 GenericCard 系），但表达差异化：
 * - 清单卡 = 用户要做的 N 件事（带打勾、进度、完成庆祝）
 * - 价值卡 = AI 已经替你做的 / 在替你做的事；强调"省了什么 / 多了什么"
 *
 * 视觉关键：
 * - 顶部 headline 是结果导向口径（"省 1.5 小时" / "30 份产物等审"），用大字体
 * - 副标 subtitle 是功能名导向，灰色一行
 * - bullets：每行一个产物 + meta + 状态徽章 + 数字徽章
 * - 底部 chip 行：1-4 个 nextAction 按 `tone` 分主次
 */

import * as React from "react"
import { GenericCard } from "./GenericCard"
import { cn } from "../ui/utils"
import type { AiClassroomReplyAction } from "./aiClassroomReply"
import type {
  AiClassroomValueCard as AiClassroomValueCardData,
  AiClassroomValueCardBullet,
} from "./aiClassroomValueCards"

const TONE_BAR_CLS: Record<NonNullable<AiClassroomValueCardData["tone"]>, string> = {
  primary: "bg-primary",
  success: "bg-[var(--color-success)]",
  info: "bg-[var(--color-info)]",
  warning: "bg-[var(--color-warning)]",
}

const STATUS_BADGE_CLS: Record<NonNullable<AiClassroomValueCardBullet["status"]>, string> = {
  ready:
    "border-[var(--color-primary)]/40 bg-[var(--color-primary)]/8 text-[var(--color-primary)]",
  auto: "border-[var(--color-success)]/40 bg-[var(--color-success)]/8 text-[var(--color-success)]",
  fresh:
    "border-[var(--color-info)]/40 bg-[var(--color-info)]/8 text-[var(--color-info)]",
}

const STATUS_BADGE_LABEL: Record<NonNullable<AiClassroomValueCardBullet["status"]>, string> = {
  ready: "AI 已就绪",
  auto: "AI 已自动",
  fresh: "刚生成",
}

export interface AiClassroomValueCardProps {
  data: AiClassroomValueCardData
  onPickAction: (action: AiClassroomReplyAction) => void
  className?: string
}

export function AiClassroomValueCard({
  data,
  onPickAction,
  className,
}: AiClassroomValueCardProps) {
  const tone = data.tone ?? "primary"
  return (
    <div className={cn("flex w-full max-w-[min(100%,720px)] flex-col", className)}>
      <GenericCard title={data.headline}>
        {/* 顶部色条覆盖 GenericCard 默认 primary 头条：通过 absolute 写入更精细的 tone */}
        <span
          aria-hidden
          className={cn(
            "absolute left-[var(--space-350)] top-[var(--space-350)] h-[var(--space-350)] w-[3px] rounded-full",
            TONE_BAR_CLS[tone],
          )}
        />

        <p className="m-0 text-[length:var(--font-size-sm)] leading-relaxed text-text-secondary">
          {data.subtitle}
        </p>

        <ul className="mt-[var(--space-300)] flex w-full flex-col gap-[var(--space-200)] m-0 p-0 list-none">
          {data.bullets.map((bullet, idx) => (
            <li
              key={`${bullet.title}-${idx}`}
              className="flex w-full items-start gap-[var(--space-250)] rounded-[var(--radius-md)] border border-border bg-bg-secondary/35 px-[var(--space-300)] py-[var(--space-250)]"
            >
              {/* 序号块（与 ChecklistCard 类似但不带勾） */}
              <span
                aria-hidden
                className="mt-[2px] inline-flex size-[20px] shrink-0 items-center justify-center rounded-[6px] border border-border bg-bg text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] leading-none text-text"
              >
                {idx + 1}
              </span>

              <div className="flex min-w-0 flex-1 flex-col gap-[var(--space-100)]">
                <div className="flex flex-wrap items-center gap-[var(--space-150)]">
                  <span className="text-[length:var(--font-size-base)] leading-normal font-[var(--font-weight-medium)] text-text">
                    {bullet.title}
                  </span>
                  {bullet.countLabel ? (
                    <span className="inline-flex shrink-0 items-center rounded-full border border-border bg-bg px-[var(--space-200)] py-[1px] text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] text-text-tertiary">
                      {bullet.countLabel}
                    </span>
                  ) : null}
                  {bullet.status ? (
                    <span
                      className={cn(
                        "inline-flex shrink-0 items-center gap-[var(--space-100)] rounded-full border px-[var(--space-200)] py-[1px] text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)]",
                        STATUS_BADGE_CLS[bullet.status],
                      )}
                    >
                      {STATUS_BADGE_LABEL[bullet.status]}
                    </span>
                  ) : null}
                </div>
                {bullet.meta ? (
                  <span className="text-[length:var(--font-size-xs)] leading-snug text-text-secondary">
                    {bullet.meta}
                  </span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>

        {data.nextActions && data.nextActions.length > 0 ? (
          <div
            className="mt-[var(--space-250)] flex w-full flex-wrap gap-[var(--space-150)]"
            role="group"
            aria-label="下一步可以"
          >
            {data.nextActions.map((action, idx) => (
              <button
                key={`${action.prompt}-${idx}`}
                type="button"
                onClick={() => onPickAction(action)}
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

        {data.systemNote ? (
          <p className="mt-[var(--space-200)] m-0 text-[length:var(--font-size-xs)] text-text-tertiary leading-snug">
            {data.systemNote}
          </p>
        ) : null}
      </GenericCard>
    </div>
  )
}
