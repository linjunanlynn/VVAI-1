/**
 * 机构管理者（场景九 · admin）专属 Hero 卡：全校态势 + 4 数字格 + 1 主操作。
 *
 * 与 TodayLessonHeroCard 的核心差异：
 * - admin 不"上课"，状态语义不再是"备课进度 / 本节进度 / 报告审完"，而是"今日校区态势"；
 * - stage 重定义：pre = 早间盘查 / in = 课时高峰 / post = 晚间复盘（与 EducationStageSwitcher 同构）；
 * - 不联动 LessonRuntimeStatus（imminent/live 等），只看 EducationStage；
 * - 主操作 → 不进子 CUI（admin 没有子 CUI），而是给一个"在主对话中查询"的兜底命令，
 *   交由 MainAIChatWindow 的 handleEduRoleSkillCommand 处理为占位回复或滚动到对应 dock。
 */
import * as React from "react"
import { GenericCard } from "./GenericCard"
import { cn } from "../ui/utils"
import type { EducationStage } from "./educationStageDemo"

export interface AdminCampusOverviewHeroCardProps {
  stage: EducationStage
  /** 主按钮点击：与三身份 Hero 卡入参一致，便于复用 handleEduRoleSkillCommand */
  onPrimaryAction: (command: string, opts?: { skillId?: string; source?: string }) => void
  className?: string
}

interface NumberCell {
  /** 4 格数字面板的标签 */
  label: string
  /** 数字字符串（含单位） */
  value: string
  /** 颜色基调：default / warning / success / info */
  tone: "default" | "warning" | "success" | "info"
  /** 点击下钻：进入哪个 dock 的哪个三级菜单（本期仅作为 admin handoff command 的 hint） */
  drillSkillId?: string
  drillCommand?: string
}

interface AdminStageCell {
  /** 1 句态势主张（红/绿/黄状态条上方） */
  headline: string
  /** 4 数字格（按重要度排列） */
  cells: NumberCell[]
  /** 唯一主按钮 */
  primary: { label: string; skillId: string; command: string }
  /** 整体色调 */
  tone: NumberCell["tone"]
}

const STAGE_MATRIX: Record<EducationStage, AdminStageCell> = {
  pre: {
    headline: "早间盘查：先稳教学排课，再确认成员与教室就位。",
    tone: "info",
    cells: [
      { label: "排课冲突", value: "7 处", tone: "warning", drillSkillId: "aq_teacher", drillCommand: "处理排课冲突" },
      { label: "待开通成员", value: "3 人", tone: "warning", drillSkillId: "ao_today", drillCommand: "新增成员" },
      { label: "待处理工单", value: "4 条", tone: "warning", drillSkillId: "ao_classroom", drillCommand: "派单维修设备" },
      { label: "低转化商品", value: "2 个", tone: "default", drillSkillId: "ab_metrics", drillCommand: "查看商品转化" },
    ],
    primary: { label: "处理排课冲突", skillId: "aq_teacher", command: "处理排课冲突" },
  },
  in: {
    headline: "课时高峰：先控课堂质量，再盯订单与资源异常。",
    tone: "warning",
    cells: [
      { label: "低分课堂", value: "3 节", tone: "warning", drillSkillId: "aq_research", drillCommand: "查看低分课堂" },
      { label: "待支付订单", value: "6 笔", tone: "warning", drillSkillId: "ab_renew", drillCommand: "查看待支付订单" },
      { label: "教室维修中", value: "2 间", tone: "warning", drillSkillId: "ao_classroom", drillCommand: "派单维修设备" },
      { label: "异常订单", value: "1 笔", tone: "default", drillSkillId: "ab_renew", drillCommand: "确认异常订单" },
    ],
    primary: { label: "查看低分课堂", skillId: "aq_research", command: "查看低分课堂" },
  },
  post: {
    headline: "晚间复盘：先做续费流失跟进，再输出教学与经营报表。",
    tone: "default",
    cells: [
      { label: "本周到期", value: "32 人", tone: "info", drillSkillId: "ab_workforce", drillCommand: "跟进高风险名单" },
      { label: "高风险续费", value: "6 人", tone: "warning", drillSkillId: "ab_workforce", drillCommand: "跟进高风险名单" },
      { label: "已流失", value: "2 人", tone: "warning", drillSkillId: "ab_workforce", drillCommand: "查看流失原因" },
      { label: "待导出报表", value: "2 份", tone: "default", drillSkillId: "aq_research", drillCommand: "导出教学质量周报" },
    ],
    primary: { label: "跟进高风险名单", skillId: "ab_workforce", command: "跟进高风险名单" },
  },
}

const TONE_BORDER: Record<NumberCell["tone"], string> = {
  info: "border-[var(--color-info)]/30 bg-[var(--color-info)]/5",
  warning: "border-[var(--color-warning)]/30 bg-[var(--color-warning)]/5",
  success: "border-[var(--color-success)]/30 bg-[var(--color-success)]/5",
  default: "border-border bg-bg",
}

const TONE_VALUE_COLOR: Record<NumberCell["tone"], string> = {
  info: "text-[var(--color-info)]",
  warning: "text-[var(--color-warning)]",
  success: "text-[var(--color-success)]",
  default: "text-text",
}

const TONE_DOT: Record<NumberCell["tone"], string> = {
  info: "bg-[var(--color-info)]",
  warning: "bg-[var(--color-warning)] animate-pulse",
  success: "bg-[var(--color-success)] animate-pulse",
  default: "bg-text-tertiary",
}

export function AdminCampusOverviewHeroCard({
  stage,
  onPrimaryAction,
  className,
}: AdminCampusOverviewHeroCardProps) {
  const cell = STAGE_MATRIX[stage]
  return (
    <div className={cn("flex w-full max-w-[min(100%,720px)] flex-col", className)}>
      <GenericCard title="管理者总览">
        {/* 状态短句条 */}
        <div
          className={cn(
            "flex w-full items-center gap-[var(--space-200)] rounded-[var(--radius-md)] border px-[var(--space-300)] py-[var(--space-250)]",
            TONE_BORDER[cell.tone],
          )}
        >
          <span
            className={cn("inline-flex h-[10px] w-[10px] shrink-0 rounded-full", TONE_DOT[cell.tone])}
            aria-hidden
          />
          <span className="text-[length:var(--font-size-sm)] font-[var(--font-weight-semi-bold)] text-text leading-tight">
            {cell.headline}
          </span>
        </div>

        {/* 4 数字格 */}
        <div className="mt-[var(--space-300)] grid w-full grid-cols-2 gap-[var(--space-200)] sm:grid-cols-4">
          {cell.cells.map((c) => (
            <button
              key={c.label}
              type="button"
              onClick={() => {
                if (c.drillCommand) {
                  onPrimaryAction(c.drillCommand, { skillId: c.drillSkillId, source: "hero-cell" })
                }
              }}
              className={cn(
                "group flex flex-col items-start gap-[var(--space-50)] rounded-[var(--radius-md)] border px-[var(--space-200)] py-[var(--space-200)]",
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

        {/* 主按钮 */}
        <div className="mt-[var(--space-300)] flex w-full flex-wrap items-center gap-[var(--space-200)]">
          <button
            type="button"
            onClick={() =>
              onPrimaryAction(cell.primary.command, {
                skillId: cell.primary.skillId,
                source: "hero",
              })
            }
            className={cn(
              "inline-flex h-9 shrink-0 items-center justify-center rounded-full px-[var(--space-400)]",
              "bg-primary text-[var(--color-primary-foreground,white)] text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)]",
              "shadow-sm transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]/35",
            )}
          >
            {cell.primary.label}
          </button>
        </div>
      </GenericCard>
    </div>
  )
}
