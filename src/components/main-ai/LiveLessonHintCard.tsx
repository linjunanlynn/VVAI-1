/**
 * 课中提示卡：当用户在 stage === "in" 时进入教育门户，主对话内自动 push 一条这个气泡。
 *
 * 与 `LessonLiveHeroCard` 的差异：
 * - LessonLiveHeroCard = 首屏 Hero（重型卡：实时分布 / 举手队列 / 互动入口），仅在主对话首屏渲染
 * - LiveLessonHintCard = 可重复 push 的「正在上课」横条提示，承载"立即感受 + 一键进入子 CUI"
 *
 * 三身份 × 二形态（线上 🔵 / 线下 🟢，PRD 2.5.1 / 2.5.2 / 2.6.1 / 2.6.2）：
 *
 * - 教师 · 线上：左侧"直播中 · 12:30" / "课堂助手已就位 · 答题分布 / 举手队列 / 节奏建议都在课堂里"
 * - 教师 · 线下：左侧"上课中 · 12:30" / "教室助手已就位 · IFP 板书 OCR / 摄像头自动追踪发言者 / 无线麦 ASR"
 *
 * - 学生 · 线上：左侧"上课中 · 第 2 题"      / "本节 +1 · 举手队列第 2 位 · 提问可选私聊老师 / 全班发言"
 * - 学生 · 线下：左侧"你在 A301 教室"        / "教室共享 Pad 私聊老师 / 错题挑战可在 Pad 上做"
 *
 * - 家长 · 线上：左侧"孩子在课中 · 已 12:30" / "30 秒一眼直播额度可用"
 * - 家长 · 线下：左侧"孩子已进 A301 教室"   / "接送闭环：已签到 / 课中 / 离校前 5 分钟自动通知"
 *
 * 该卡仅承担"立即感受 + 一键进入"，详细分布 / 时间线交给子 CUI Skill 卡。
 */
import * as React from "react"
import { GenericCard } from "./GenericCard"
import { ChatPromptButton } from "../chat/ChatPromptButton"
import { cn } from "../ui/utils"
import { DEMO_LESSON, getLessonRuntimeState } from "./aiClassroomLessonDemo"
import type { EduLessonAttendingRole } from "./homeScenarioLayout"
import {
  deliveryModeClassroomLabel,
  type LessonDeliveryMode,
} from "./lessonDeliveryMode"

export interface LiveLessonHintCardProps {
  role: EduLessonAttendingRole
  /** 主按钮：进入子 CUI（与 dock 课表选课同语义） */
  onEnterLesson: () => void
  /** 课程形态（默认线上，向后兼容现有调用） */
  deliveryMode?: LessonDeliveryMode
  className?: string
}

interface RoleCopy {
  /** 卡片标题（GenericCard） */
  title: string
  /** 状态行左侧文本（"你正在上课"等） */
  lead: string
  /** 状态行下的灰色细描述 */
  sub: string
  /** 主 CTA 文案 */
  cta: string
  /** 副 CTA（仅家长视角才出，线上=看一眼直播；线下=看接送时间线） */
  secondaryCta?: string
}

function getCopy(
  role: EduLessonAttendingRole,
  mode: LessonDeliveryMode,
): RoleCopy {
  if (mode === "online") {
    if (role === "teacher")
      return {
        title: "课程进行中",
        lead: "你正在上课",
        sub: "课堂助手已就位 · 答题分布 / 举手队列 / 节奏建议都在课堂里",
        cta: "进入课堂助手",
      }
    if (role === "student")
      return {
        title: "课程进行中",
        lead: "正在上课",
        sub: "本节得分 +1 · 举手队列第 2 位 · 提问可选私聊老师 / 全班发言",
        cta: "进入课堂",
      }
    return {
      title: "课程进行中",
      lead: "孩子正在上课",
      sub: "专注度 92 · 30 秒一眼直播额度可用 · 不打扰孩子",
      cta: "进入查看",
      secondaryCta: "看一眼直播 30 秒",
    }
  }

  // mode === "offline"
  if (role === "teacher")
    return {
      title: "线下课进行中",
      lead: "你正在 A301 物理教室上课",
      sub: "IFP 板书 OCR · 摄像头自动追踪发言者 · 无线麦 ASR 字幕已就位",
      cta: "进入教室助手",
    }
  if (role === "student")
    return {
      title: "线下课进行中",
      lead: "你在 A301 物理教室",
      sub: "举手 / 移动麦 全班发言；想私聊老师可走教室共享 Pad，不打扰其他人",
      cta: "打开教室 Pad",
    }
  return {
    title: "线下课进行中",
    lead: "孩子已进 A301 教室",
    sub: "接送闭环：18:55 已签到 · 摄像头巡检中 · 离校前 5 分钟会自动通知您",
    cta: "看接送时间线",
    secondaryCta: "教室摄像头巡检",
  }
}

export function LiveLessonHintCard({
  role,
  onEnterLesson,
  deliveryMode = "online",
  className,
}: LiveLessonHintCardProps) {
  const rt = getLessonRuntimeState("in")
  const copy = getCopy(role, deliveryMode)
  const classroom =
    deliveryMode === "online" ? DEMO_LESSON.classroom : deliveryModeClassroomLabel("offline")

  return (
    <div className={cn("flex w-full max-w-[min(100%,720px)] flex-col", className)}>
      <GenericCard title={copy.title}>
        <div className="flex w-full flex-col gap-[var(--space-200)] rounded-[var(--radius-md)] border border-[var(--color-success)]/30 bg-[var(--color-success)]/5 px-[var(--space-300)] py-[var(--space-250)]">
          <div className="flex w-full flex-wrap items-center gap-[var(--space-200)]">
            <span className="inline-flex h-[10px] w-[10px] shrink-0 animate-pulse rounded-full bg-[var(--color-success)]" aria-hidden />
            <span className="text-[length:var(--font-size-sm)] font-[var(--font-weight-semi-bold)] text-text leading-tight">
              {copy.lead} · 《{DEMO_LESSON.title}》 已进行 {rt.liveElapsed}
            </span>
            <span className="ml-auto inline-flex shrink-0 items-center rounded-full bg-bg px-[var(--space-200)] py-[2px] text-[length:var(--font-size-xs)] text-text-tertiary">
              {classroom}
            </span>
          </div>
          <p className="m-0 text-[length:var(--font-size-xs)] text-text-secondary leading-relaxed">
            {copy.sub}
          </p>
        </div>

        <div className="mt-[var(--space-300)] flex flex-wrap gap-[var(--space-200)]">
          <button
            type="button"
            onClick={onEnterLesson}
            className={cn(
              "inline-flex h-9 shrink-0 items-center justify-center rounded-full px-[var(--space-400)]",
              "bg-primary text-[var(--color-primary-foreground,white)] text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)]",
              "shadow-sm transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]/35",
            )}
          >
            {copy.cta}
          </button>
          {copy.secondaryCta ? (
            <ChatPromptButton onClick={onEnterLesson}>{copy.secondaryCta}</ChatPromptButton>
          ) : null}
        </div>
      </GenericCard>
    </div>
  )
}
