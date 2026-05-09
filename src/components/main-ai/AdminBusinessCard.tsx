/**
 * 校长主对话流业务卡：渲染 admin chip 命中后的"事实段 + 数字格 + bullet + 下一步"完整闭环卡。
 *
 * 与 AiClassroomSkillCard 的区别：
 * - AiClassroomSkillCard 渲染在 AI 课堂"侧 CUI"内（只针对一节具体课的语境）
 * - AdminBusinessCard 渲染在主对话流（admin 不进侧 CUI，"全校盘点"语境）
 *
 * 视觉规则：
 * - GenericCard 容器（左侧主色强调条 + 标题 + 内容槽），与现有卡保持一致
 * - "演示数据" 水印放在右上角，与 AdminTodaySnapshotCard 一致
 * - bullets 使用 emoji icon + title + meta 三段，让用户一眼分清异常 / 亮点
 * - recommendedPrompts 渲染为 chip 行（hover 主色描边），点击触发主线对话兜底
 */
import * as React from "react"
import { GenericCard } from "./GenericCard"
import { cn } from "../ui/utils"
import type {
  AdminBusinessCardBadge,
  AdminBusinessCardData,
} from "./adminBusinessCardData"

export interface AdminBusinessCardProps {
  data: AdminBusinessCardData
  /** 点 chip 时的回调；通常等于 handleSendMessage（让 chip 触发主线对话兜底闭环） */
  onPickPrompt: (prompt: string) => void
  className?: string
}

const BADGE_TONE: Record<AdminBusinessCardBadge["tone"], string> = {
  info: "border-[var(--color-info)]/35 bg-[var(--color-info)]/10 text-[var(--color-info)]",
  warning:
    "border-[var(--color-warning)]/35 bg-[var(--color-warning)]/10 text-[var(--color-warning)]",
  success:
    "border-[var(--color-success)]/35 bg-[var(--color-success)]/10 text-[var(--color-success)]",
  default: "border-border bg-bg-secondary text-text-secondary",
}

export function AdminBusinessCard({
  data,
  onPickPrompt,
  className,
}: AdminBusinessCardProps) {
  return (
    <div className={cn("flex w-full max-w-[min(100%,720px)] flex-col", className)}>
      <GenericCard title={data.title} className="relative">
        <span
          aria-hidden
          className={cn(
            "absolute right-[var(--space-300)] top-[var(--space-300)] inline-flex items-center gap-[var(--space-100)] rounded-full px-[var(--space-200)] py-[2px]",
            "border border-border bg-bg-secondary text-[length:var(--font-size-xs)] text-text-tertiary",
          )}
        >
          演示数据
        </span>

        <p className="m-0 text-[length:var(--font-size-base)] leading-normal text-text">
          {data.headline}
        </p>

        {data.badges.length > 0 ? (
          <div className="mt-[var(--space-200)] flex flex-wrap gap-[var(--space-150)]">
            {data.badges.map((b, idx) => (
              <span
                key={`${b.label}-${idx}`}
                className={cn(
                  "inline-flex items-center rounded-full border px-[var(--space-200)] py-[2px]",
                  "text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] leading-none",
                  BADGE_TONE[b.tone],
                )}
              >
                {b.label}
              </span>
            ))}
          </div>
        ) : null}

        {data.stats.length > 0 ? (
          <div className="mt-[var(--space-300)] grid w-full grid-cols-3 gap-[var(--space-200)]">
            {data.stats.map((s, idx) => (
              <div
                key={`${s.label}-${idx}`}
                className={cn(
                  "flex flex-col items-start gap-[var(--space-50)] rounded-[var(--radius-md)] border border-border bg-bg-secondary",
                  "px-[var(--space-250)] py-[var(--space-200)]",
                )}
              >
                <span className="text-[length:var(--font-size-xs)] text-text-tertiary">
                  {s.label}
                </span>
                <span className="text-[length:var(--font-size-md)] font-[var(--font-weight-semi-bold)] text-text">
                  {s.value}
                </span>
                {s.hint ? (
                  <span className="text-[length:var(--font-size-xs)] text-text-tertiary">
                    {s.hint}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        {data.bullets.length > 0 ? (
          <ul className="mt-[var(--space-300)] m-0 flex w-full list-none flex-col gap-[var(--space-200)] p-0">
            {data.bullets.map((b, idx) => (
              <li
                key={`${b.title}-${idx}`}
                className="flex items-start gap-[var(--space-200)]"
              >
                <span aria-hidden className="mt-[2px] shrink-0 text-[length:var(--font-size-base)]">
                  {b.icon}
                </span>
                <div className="min-w-0 flex-1 flex flex-col gap-[var(--space-50)]">
                  <span className="text-[length:var(--font-size-base)] leading-snug text-text">
                    {b.title}
                  </span>
                  {b.meta ? (
                    <span className="text-[length:var(--font-size-xs)] leading-snug text-text-tertiary">
                      {b.meta}
                    </span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : null}

        {data.footerNote ? (
          <p className="mt-[var(--space-300)] m-0 text-[length:var(--font-size-xs)] text-text-tertiary">
            {data.footerNote}
          </p>
        ) : null}

        {data.recommendedPrompts.length > 0 ? (
          <div
            className="mt-[var(--space-300)] flex w-full flex-wrap gap-[var(--space-150)]"
            role="group"
            aria-label="下一步可以"
          >
            {data.recommendedPrompts.map((prompt, idx) => (
              <button
                key={`${prompt}-${idx}`}
                type="button"
                onClick={() => onPickPrompt(prompt)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-[var(--space-100)] h-[var(--space-700)] px-[var(--space-300)] py-[var(--space-150)]",
                  "rounded-full border border-border bg-bg transition-all duration-200 ease-out",
                  "text-[length:var(--font-size-xs)] leading-none whitespace-nowrap font-[var(--font-weight-medium)] text-text",
                  "hover:border-[var(--color-primary)]/45 hover:bg-[var(--color-primary)]/8 hover:text-[var(--color-primary)]",
                )}
              >
                {prompt}
              </button>
            ))}
          </div>
        ) : null}
      </GenericCard>
    </div>
  )
}
