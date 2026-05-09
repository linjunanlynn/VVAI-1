/**
 * 教育 dock 三级菜单 → 主对话内联卡片。
 *
 * 与 `AdminCampusOverviewHeroCard` 视觉一致：1 句业务背景 + 数字格 + 推荐指令按钮。
 * 区别：
 * - 主背景为「中性 / info」基调，不强调"今日态势"那种警示感；
 * - 没有"主操作单按钮"，而是一组（≤4）平铺的"推荐指令"chip，每条点击都把指令 push 到主对话；
 * - 数字格不可点击下钻（dock 卡的目标是给"二/三级菜单看到该看到的全貌"，下钻交给指令）。
 */
import * as React from "react"
import { GenericCard } from "./GenericCard"
import { cn } from "../ui/utils"
import type { EduDockMenuCardData, EduDockMenuStat } from "./educationDockMenuRegistry"

export interface EduDockMenuCardProps {
  data: EduDockMenuCardData
  /** 推荐指令点击回调：把指令 push 到主对话 */
  onPickPrompt: (command: string) => void
  className?: string
}

const TONE_BORDER: Record<NonNullable<EduDockMenuStat["tone"]>, string> = {
  info: "border-[var(--color-info)]/30 bg-[var(--color-info)]/5",
  warning: "border-[var(--color-warning)]/30 bg-[var(--color-warning)]/5",
  success: "border-[var(--color-success)]/30 bg-[var(--color-success)]/5",
  default: "border-border bg-bg",
}

const TONE_VALUE_COLOR: Record<NonNullable<EduDockMenuStat["tone"]>, string> = {
  info: "text-[var(--color-info)]",
  warning: "text-[var(--color-warning)]",
  success: "text-[var(--color-success)]",
  default: "text-text",
}

export function EduDockMenuCard({ data, onPickPrompt, className }: EduDockMenuCardProps) {
  const stats = data.stats.slice(0, 4)
  return (
    <div className={cn("flex w-full max-w-[min(100%,720px)] flex-col", className)}>
      <GenericCard
        title={`${data.appName} · ${data.menuName}`}
      >
        <div className="flex w-full items-start gap-[var(--space-200)] rounded-[var(--radius-md)] border border-border bg-bg-tertiary px-[var(--space-300)] py-[var(--space-250)]">
          <span className="text-[length:var(--font-size-sm)] font-[var(--font-weight-semi-bold)] text-text leading-tight">
            {data.headline}
          </span>
        </div>

        {stats.length > 0 && (
          <div
            className={cn(
              "mt-[var(--space-300)] grid w-full gap-[var(--space-200)]",
              stats.length >= 4 ? "grid-cols-2 sm:grid-cols-4" : `grid-cols-2 sm:grid-cols-${stats.length}`,
            )}
          >
            {stats.map((c) => {
              const tone = c.tone ?? "default"
              return (
                <div
                  key={c.label}
                  className={cn(
                    "flex flex-col items-start gap-[var(--space-50)] rounded-[var(--radius-md)] border px-[var(--space-200)] py-[var(--space-200)]",
                    TONE_BORDER[tone],
                  )}
                >
                  <span className="text-[length:var(--font-size-xs)] text-text-tertiary">{c.label}</span>
                  <span
                    className={cn(
                      "text-[length:var(--font-size-md)] font-[var(--font-weight-semi-bold)]",
                      TONE_VALUE_COLOR[tone],
                    )}
                  >
                    {c.value}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {data.prompts.length > 0 && (
          <div className="mt-[var(--space-300)] flex w-full flex-wrap gap-[var(--space-150)]">
            {data.prompts.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => onPickPrompt(p)}
                className={cn(
                  "inline-flex h-8 shrink-0 items-center justify-center rounded-full",
                  "border border-border bg-bg px-[var(--space-300)] text-[length:var(--font-size-sm)] text-text",
                  "transition-colors hover:bg-[var(--black-alpha-11)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]/35",
                )}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </GenericCard>
    </div>
  )
}
