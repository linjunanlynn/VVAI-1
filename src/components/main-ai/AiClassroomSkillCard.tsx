/**
 * AI 课堂统一模板卡片（template kind）
 *
 * 数据驱动覆盖 13 张通用 Skill：
 * - 顶部：title / subtitle / badges
 * - 中段：stats（关键指标 KV 块）
 * - 下段：bullets（重点信息列表）
 * - 底部：footerNote（可选脚注） + 推荐指令条（由父组件渲染或本组件代渲染）
 */
import * as React from "react"
import { GenericCard } from "./GenericCard"
import { AiClassroomRecommendedPrompts } from "./AiClassroomRecommendedPrompts"
import { cn } from "../ui/utils"

export type AiClassroomBadgeTone = "default" | "success" | "warning" | "info"

export interface AiClassroomBadge {
  label: string
  tone?: AiClassroomBadgeTone
}

export interface AiClassroomStat {
  label: string
  value: string
  hint?: string
}

export interface AiClassroomBullet {
  /** 行首 emoji 或图标字符 */
  icon?: string
  title: string
  meta?: string
}

export interface AiClassroomTemplateData {
  title: string
  subtitle?: string
  badges?: AiClassroomBadge[]
  stats?: AiClassroomStat[]
  bullets?: AiClassroomBullet[]
  /** 底部说明文字（小灰字） */
  footerNote?: string
  /** 推荐指令文本（最多 4 条） */
  recommendedPrompts: string[]
}

const TONE_CLASS: Record<AiClassroomBadgeTone, string> = {
  default: "bg-bg-secondary text-text-secondary",
  success: "bg-[var(--color-success)]/10 text-[var(--color-success)]",
  warning: "bg-[var(--color-warning)]/10 text-[var(--color-warning)]",
  info: "bg-[var(--color-info)]/10 text-[var(--color-info)]",
}

export interface AiClassroomSkillCardProps {
  data: AiClassroomTemplateData
  onPickPrompt: (prompt: string) => void
  className?: string
}

export function AiClassroomSkillCard({ data, onPickPrompt, className }: AiClassroomSkillCardProps) {
  const { title, subtitle, badges, stats, bullets, footerNote, recommendedPrompts } = data
  return (
    <div className={cn("flex w-full max-w-[min(100%,720px)] flex-col", className)}>
      <GenericCard title={title}>
        {subtitle ? (
          <p className="m-0 text-[length:var(--font-size-sm)] leading-relaxed text-text-secondary">
            {subtitle}
          </p>
        ) : null}

        {badges && badges.length > 0 ? (
          <div className="mt-[var(--space-200)] flex flex-wrap gap-[var(--space-150)]">
            {badges.map((badge, idx) => (
              <span
                key={`${badge.label}-${idx}`}
                className={cn(
                  "inline-flex items-center rounded-[var(--radius-sm)] px-[var(--space-200)] py-[2px] text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)]",
                  TONE_CLASS[badge.tone ?? "default"]
                )}
              >
                {badge.label}
              </span>
            ))}
          </div>
        ) : null}

        {stats && stats.length > 0 ? (
          <div className="mt-[var(--space-300)] grid w-full grid-cols-3 gap-[var(--space-200)]">
            {stats.map((stat, idx) => (
              <div
                key={`${stat.label}-${idx}`}
                className="flex flex-col gap-[2px] rounded-[var(--radius-md)] border border-border bg-bg-secondary/40 px-[var(--space-250)] py-[var(--space-200)]"
              >
                <span className="text-[length:var(--font-size-xs)] text-text-tertiary leading-tight">
                  {stat.label}
                </span>
                <span className="text-[length:var(--font-size-md)] font-[var(--font-weight-semi-bold)] text-text leading-tight">
                  {stat.value}
                </span>
                {stat.hint ? (
                  <span className="text-[length:var(--font-size-xs)] text-text-tertiary leading-tight">
                    {stat.hint}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        {bullets && bullets.length > 0 ? (
          <ul className="mt-[var(--space-300)] flex w-full flex-col gap-[var(--space-150)] m-0 p-0 list-none">
            {bullets.map((bullet, idx) => (
              <li
                key={`${bullet.title}-${idx}`}
                className="flex w-full items-start gap-[var(--space-200)] rounded-[var(--radius-md)] border border-border bg-bg px-[var(--space-250)] py-[var(--space-200)]"
              >
                {bullet.icon ? (
                  <span aria-hidden className="shrink-0 text-[length:var(--font-size-md)] leading-none">
                    {bullet.icon}
                  </span>
                ) : null}
                <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
                  <span className="text-[length:var(--font-size-sm)] font-[var(--font-weight-regular)] text-text leading-snug">
                    {bullet.title}
                  </span>
                  {bullet.meta ? (
                    <span className="text-[length:var(--font-size-xs)] text-text-tertiary leading-snug">
                      {bullet.meta}
                    </span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : null}

        {footerNote ? (
          <p className="mt-[var(--space-250)] m-0 text-[length:var(--font-size-xs)] text-text-tertiary leading-relaxed">
            {footerNote}
          </p>
        ) : null}
      </GenericCard>

      <AiClassroomRecommendedPrompts prompts={recommendedPrompts} onPick={onPickPrompt} />
    </div>
  )
}
