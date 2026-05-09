/**
 * 教育门户首屏 Hero 卡：让用户进入教育就明确感知"现在该做什么"。
 *
 * 维度：身份（教师 / 学生 / 家长） × 运行态（课前 / 临近开课 / 课中 / 课后）
 *
 * 设计目标（瘦身版）：
 * - 与上方"待办带"和下方 AI 主动开场气泡的"开课时间 / 课程名 / 班级"信息**严格不重复**
 * - 只保留 1 个状态短句 + 1 个主按钮（次按钮折叠为 chip 兜底，避免选择瘫痪）
 * - 主按钮点击直接打开 AI课堂侧 CUI 并执行对应 skill
 * - 进度条用"任务进度"而非"时间进度"（课前=备课进度 / 课中=本节进度 / 课后=完成进度）
 * - 与 LessonLiveHeroCard 互斥：课中态由 LessonLiveHeroCard 接管（更重的"课堂助手"视图）
 */
import * as React from "react"
import { GenericCard } from "./GenericCard"
import { cn } from "../ui/utils"
import {
  getLessonRuntimeState,
  type LessonRuntimeState,
  type LessonRuntimeStatus,
} from "./aiClassroomLessonDemo"
import type { EduLessonAttendingRole } from "./homeScenarioLayout"
import type { EducationStage } from "./educationStageDemo"

export interface TodayLessonHeroCardProps {
  role: EduLessonAttendingRole
  stage: EducationStage
  /**
   * 主按钮：打开 AI课堂侧 CUI 并执行 skillId 对应 Skill。
   * 入参形式 `(command, opts)` 与 MainAIChatWindow 的 `handleEduRoleSkillCommand` 对齐。
   */
  onPrimaryAction: (command: string, opts?: { skillId?: string; source?: string }) => void
  className?: string
}

interface ActionMatrixCell {
  /** 一行短句：只讲"我为你准备好了什么 / 当下卡在哪一项"，不重复时间 / 课名 / 班级 */
  headline: string
  /** 进度文案（左侧），如"备课草稿 80%"、"已 12'30""、"报告 0/8 已审" */
  progressLabel: string
  /** 进度百分比（0-100） */
  progressPct: number
  /** 唯一主行动；点击直接进 AI课堂侧 CUI 执行对应 Skill */
  primary: { label: string; skillId: string; command: string }
  tone: "info" | "warning" | "success" | "default"
}

type Matrix = Record<EduLessonAttendingRole, Record<LessonRuntimeStatus, ActionMatrixCell>>

/** 状态矩阵：每格只 1 句 + 1 主按钮，与上方待办带 / 下方 AI 开场不重复 */
const ACTION_MATRIX: Matrix = {
  teacher: {
    pre: {
      headline: "备课草稿已生成 80%，差矢量方向判断 2 道题",
      progressLabel: "备课进度",
      progressPct: 80,
      primary: { label: "补完最后 1 项", skillId: "tt-prep", command: "开始备课" },
      tone: "info",
    },
    imminent: {
      headline: "距开课不足 15 分钟，最后过一遍课件",
      progressLabel: "就位检查",
      progressPct: 60,
      primary: { label: "课前就位检查", skillId: "tt-ready", command: "课前就位检查" },
      tone: "warning",
    },
    live: {
      headline: "课堂助手已就位",
      progressLabel: "本节进度",
      progressPct: 28,
      primary: { label: "打开课堂助手", skillId: "tc-question", command: "出一道随堂题" },
      tone: "success",
    },
    post: {
      headline: "8 份报告草稿待审 · 李小明 / 陈可 建议优先",
      progressLabel: "已审 0 / 8",
      progressPct: 0,
      primary: { label: "开始审报告", skillId: "ta-report", command: "审核课后报告" },
      tone: "default",
    },
    idle: {
      headline: "今天没课 · 可提前备明天 19:00 的下节",
      progressLabel: "下节备课",
      progressPct: 0,
      primary: { label: "开始备下节", skillId: "tt-prep", command: "开始备课" },
      tone: "default",
    },
  },
  student: {
    pre: {
      headline: "预习已完成 2/3，差矢量方向判断 2 道题",
      progressLabel: "预习进度",
      progressPct: 67,
      primary: { label: "5 分钟做完预习", skillId: "sp-pack", command: "开始预习" },
      tone: "info",
    },
    imminent: {
      headline: "距上课不足 15 分钟，准备一下设备",
      progressLabel: "上课准备",
      progressPct: 50,
      primary: { label: "上课就位检查", skillId: "sp-remind", command: "上课提醒" },
      tone: "warning",
    },
    live: {
      headline: "上课时可以「我要提问」，再选私聊老师或举手发言",
      progressLabel: "本节进度",
      progressPct: 28,
      primary: { label: "举手 / 抢答", skillId: "sc-handraise", command: "举手/抢答" },
      tone: "success",
    },
    post: {
      headline: "新增 3 道矢量方向错题、今晚作业 10 道",
      progressLabel: "重做错题",
      progressPct: 0,
      primary: { label: "先重做 1 道", skillId: "sa-mistakes", command: "重做错题" },
      tone: "default",
    },
    idle: {
      headline: "今天没课 · 错题本有 5 道要重做",
      progressLabel: "重做错题",
      progressPct: 20,
      primary: { label: "去重做错题", skillId: "sa-mistakes", command: "重做错题" },
      tone: "default",
    },
  },
  parent: {
    pre: {
      headline: "孩子预习已完成 2/3 · 课前 3 件小事约 5 分钟",
      progressLabel: "课前就位",
      progressPct: 67,
      primary: { label: "看课前 3 件小事", skillId: "pp-ready", command: "课前注意事项" },
      tone: "info",
    },
    imminent: {
      headline: "距上课不足 15 分钟，请孩子准备一下",
      progressLabel: "课前就位",
      progressPct: 80,
      primary: { label: "本节课预告", skillId: "pp-brief", command: "本节课预告" },
      tone: "warning",
    },
    live: {
      headline: "孩子上课中 · 专注度 86%，建议不打扰",
      progressLabel: "本节进度",
      progressPct: 28,
      primary: { label: "看一眼直播 30 秒", skillId: "pc-live", command: "看一眼直播" },
      tone: "success",
    },
    post: {
      headline: "孩子本节进步 3 名 ↑ · 课后报告已生成",
      progressLabel: "今晚陪孩子练 0 / 15 分钟",
      progressPct: 0,
      primary: { label: "查看课后报告", skillId: "pa-report", command: "课后报告" },
      tone: "default",
    },
    idle: {
      headline: "今天孩子没课，本周还有 2 节",
      progressLabel: "—",
      progressPct: 0,
      primary: { label: "本周课表", skillId: "pp-schedule", command: "本周课表" },
      tone: "default",
    },
  },
}

const TONE_CLASS: Record<ActionMatrixCell["tone"], string> = {
  info: "border-[var(--color-info)]/30 bg-[var(--color-info)]/5",
  warning: "border-[var(--color-warning)]/30 bg-[var(--color-warning)]/5",
  success: "border-[var(--color-success)]/30 bg-[var(--color-success)]/5",
  default: "border-border bg-bg",
}

const DOT_CLASS: Record<LessonRuntimeStatus, string> = {
  pre: "bg-[var(--color-info)]",
  imminent: "bg-[var(--color-warning)] animate-pulse",
  live: "bg-[var(--color-success)] animate-pulse",
  post: "bg-text-tertiary",
  idle: "bg-text-tertiary",
}

export function TodayLessonHeroCard({
  role,
  stage,
  onPrimaryAction,
  className,
}: TodayLessonHeroCardProps) {
  const runtime: LessonRuntimeState = getLessonRuntimeState(stage)
  const cell = ACTION_MATRIX[role][runtime.status]

  return (
    <div className={cn("flex w-full max-w-[min(100%,720px)] flex-col", className)}>
      <GenericCard title="今日教学">
        {/* 单一状态短句行（呼吸点 + headline，不再重复时间 / 课名 / 班级） */}
        <div className={cn("flex w-full items-center gap-[var(--space-200)] rounded-[var(--radius-md)] border px-[var(--space-300)] py-[var(--space-250)]", TONE_CLASS[cell.tone])}>
          <span className={cn("inline-flex h-[10px] w-[10px] shrink-0 rounded-full", DOT_CLASS[runtime.status])} aria-hidden />
          <span className="text-[length:var(--font-size-sm)] font-[var(--font-weight-semi-bold)] text-text leading-tight">
            {cell.headline}
          </span>
        </div>

        {/* 任务进度条（按状态语义不同：备课进度 / 本节进度 / 报告审完） */}
        <div className="mt-[var(--space-300)] flex w-full flex-col gap-[var(--space-150)]">
          <div className="h-[6px] w-full overflow-hidden rounded-full bg-bg-secondary">
            <div
              className={cn("h-full rounded-full transition-all", progressBarClass(runtime.status))}
              style={{ width: `${cell.progressPct}%` }}
            />
          </div>
          <div className="flex justify-between text-[length:var(--font-size-xs)] text-text-tertiary">
            <span>{cell.progressLabel}</span>
            <span>{cell.progressPct}%</span>
          </div>
        </div>

        {/* 单一主按钮（次按钮已折到上方"待办带"和子 CUI 内的 Skill 列表，避免选择瘫痪） */}
        <div className="mt-[var(--space-300)] flex w-full flex-wrap items-center gap-[var(--space-200)]">
          <button
            type="button"
            onClick={() =>
              onPrimaryAction(cell.primary.command, { skillId: cell.primary.skillId, source: "hero" })
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

function progressBarClass(status: LessonRuntimeStatus): string {
  if (status === "live") return "bg-[var(--color-success)]"
  if (status === "imminent") return "bg-[var(--color-warning)]"
  if (status === "post") return "bg-text-tertiary"
  return "bg-[var(--color-info)]"
}
