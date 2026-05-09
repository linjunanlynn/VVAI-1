/**
 * 场景九（机构管理者）首屏专属：今日校区一眼 4 数字格预览（带「演示数据」水印）。
 *
 * 上下文：
 * - 主开场已极简化（H2）——三身份只剩 ChatWelcome + brief + 4 chip，无任何卡片；
 *   校长视角"全校一眼" 是 admin 价值的核心，不能被 chip 替代，因此保留这张卡作为
 *   "看图做决定" 的行动入口。
 * - 与"能力展示卡"的区别：本卡是**数据预览 + 行动入口**，点任一数字 = 触发对应 dock 子 CUI；
 *   不是装饰、不是 onboarding 简介。
 *
 * 数据约定：4 数字格故意**不**随 EducationStage 切换——首屏作为 onboarding 演示数据，
 * 始终展示"早间盘查"那一份；接入校区后真实数据替换。"演示数据"水印让用户清楚这是示例。
 */
import * as React from "react"
import { GenericCard } from "./GenericCard"
import { cn } from "../ui/utils"

export interface AdminTodaySnapshotCardProps {
  /**
   * 点数字格的回调；与 `MainAIChatWindow.handleEduRoleSkillCommand` 同形。
   * admin 在 handleEduRoleSkillCommand 里走 `handleSendMessage`（不进 AI 课堂侧 CUI），
   * 由 dock 卡片路由到对应三级菜单。
   */
  onPickAction: (
    command: string,
    opts?: { skillId?: string; source?: string },
  ) => void
  className?: string
}

interface SnapshotCell {
  label: string
  value: string
  tone: "default" | "warning" | "success" | "info"
  drillCommand: string
  drillSkillId: string
}

/**
 * 选格策略：教学 + 管理 + 经营核心指标各占一格——让管理者先看到可执行入口，
 * 与 brief 的 4 类事文案保持隐性对应。
 */
const SNAPSHOT_CELLS: SnapshotCell[] = [
  {
    label: "排课冲突",
    value: "7 处",
    tone: "warning",
    drillCommand: "处理排课冲突",
    drillSkillId: "aq_teacher",
  },
  {
    label: "待开通成员",
    value: "3 人",
    tone: "warning",
    drillCommand: "新增成员",
    drillSkillId: "ao_today",
  },
  {
    label: "待支付订单",
    value: "6 笔",
    tone: "warning",
    drillCommand: "查看待支付订单",
    drillSkillId: "ab_renew",
  },
  {
    label: "续费高风险",
    value: "6 人",
    tone: "warning",
    drillCommand: "跟进高风险名单",
    drillSkillId: "ab_workforce",
  },
]

const TONE_BORDER: Record<SnapshotCell["tone"], string> = {
  info: "border-[var(--color-info)]/30 bg-[var(--color-info)]/5",
  warning: "border-[var(--color-warning)]/30 bg-[var(--color-warning)]/5",
  success: "border-[var(--color-success)]/30 bg-[var(--color-success)]/5",
  default: "border-border bg-bg",
}

const TONE_VALUE_COLOR: Record<SnapshotCell["tone"], string> = {
  info: "text-[var(--color-info)]",
  warning: "text-[var(--color-warning)]",
  success: "text-[var(--color-success)]",
  default: "text-text",
}

export function AdminTodaySnapshotCard({
  onPickAction,
  className,
}: AdminTodaySnapshotCardProps) {
  return (
    <div className={cn("flex w-full max-w-[min(100%,720px)] flex-col", className)}>
      <GenericCard title="今日校区一眼" className="relative">
        <span
          aria-hidden
          className={cn(
            "absolute right-[var(--space-300)] top-[var(--space-300)] inline-flex items-center gap-[var(--space-100)] rounded-full px-[var(--space-200)] py-[2px]",
            "border border-border bg-bg-secondary text-[length:var(--font-size-xs)] text-text-tertiary",
          )}
        >
          演示数据
        </span>
        <div className="grid w-full grid-cols-2 gap-[var(--space-200)] sm:grid-cols-4">
          {SNAPSHOT_CELLS.map((c) => (
            <button
              key={c.label}
              type="button"
              onClick={() =>
                onPickAction(c.drillCommand, {
                  skillId: c.drillSkillId,
                  source: "snapshot-cell",
                })
              }
              className={cn(
                "group flex flex-col items-start gap-[var(--space-50)] rounded-[var(--radius-md)] border px-[var(--space-250)] py-[var(--space-250)]",
                "text-left transition-colors hover:bg-[var(--black-alpha-11)]",
                TONE_BORDER[c.tone],
              )}
              aria-label={`${c.label}：${c.value}`}
            >
              <span className="text-[length:var(--font-size-xs)] text-text-tertiary">
                {c.label}
              </span>
              <span
                className={cn(
                  "text-[length:var(--font-size-md)] font-[var(--font-weight-semi-bold)]",
                  TONE_VALUE_COLOR[c.tone],
                )}
              >
                {c.value}
              </span>
            </button>
          ))}
        </div>
        <p className="mt-[var(--space-300)] text-[length:var(--font-size-xs)] text-text-tertiary">
          点任一数字进入对应面板；接入校区后自动替换为真实数据。
        </p>
      </GenericCard>
    </div>
  )
}
