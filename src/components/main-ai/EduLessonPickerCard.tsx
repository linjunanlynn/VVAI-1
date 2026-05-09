/**
 * 教育主对话内 · 选课确认卡。
 *
 * ## 触发场景
 *
 * 用户在主开场点了**课程粒度**的 chip（如 "帮我备节课" / "我要做错题挑战"）后，
 * 主对话不直接打开侧 CUI（避免默认跳到主线物理课），而是先 push 一张本卡：
 * - 顶部一句明确的引导："想对哪节课「{intent}」？"
 * - 列出 5 节课（与 dock 课表完全同源），每行可点
 * - 用户点某节 → 父级 `onPickLesson(lessonId)` → `handleEduRoleSkillCommand(intentPrompt, { lessonId })`
 *   → 打开该课子 CUI、并以 `kind: "skill"` 让侧 CUI 直接执行 intentPrompt
 *
 * ## 与 `AiClassroomScheduleCard` 的边界
 *
 * - `AiClassroomScheduleCard` = "我的 / 孩子课表"通用入口卡，标题为「我的课表」
 * - `EduLessonPickerCard` = 带"具体意图"的选课分流卡，标题随 intent 动态变化
 *
 * 两者复用同一份 `LessonRow`，但分别承担不同的对话意义。
 */

import * as React from "react"
import { GenericCard } from "./GenericCard"
import { LessonRow } from "./AiClassroomLessonRow"
import {
  DEMO_LESSONS,
  getAgendaLessonStatus,
  getAgendaLessonSubtitle,
} from "./aiClassroomLessonsDemo"
import type { EducationStage } from "./educationStageDemo"
import type { EduSceneRole } from "./homeScenarioLayout"

/**
 * marker 协议：`<<<RENDER_EDU_LESSON_PICKER>>>:<json>`
 * - json 形态：`{ role, intentPrompt, intentLabel }`
 * - 解析失败时不渲染（fallback 到下文兜底）
 */
export const EDU_LESSON_PICKER_MARKER = "<<<RENDER_EDU_LESSON_PICKER>>>" as const

export interface EduLessonPickerPayload {
  /** 教育场景身份；admin 不应该走这个卡（admin 的所有 chip 都是 direct） */
  role: Exclude<EduSceneRole, "admin">
  /** 用户选课后会被替换为这条 prompt 派给 `handleEduRoleSkillCommand` */
  intentPrompt: string
  /** picker 卡上方的引导语；保持简短，与 chip 文案对齐 */
  intentLabel: string
}

export function buildEduLessonPickerCardContent(payload: EduLessonPickerPayload): string {
  return `${EDU_LESSON_PICKER_MARKER}:${JSON.stringify(payload)}`
}

export function parseEduLessonPickerPayload(
  content: string,
): EduLessonPickerPayload | null {
  if (typeof content !== "string") return null
  if (!content.startsWith(`${EDU_LESSON_PICKER_MARKER}:`)) return null
  try {
    const parsed = JSON.parse(
      content.slice(`${EDU_LESSON_PICKER_MARKER}:`.length),
    ) as EduLessonPickerPayload
    if (
      (parsed?.role === "teacher" || parsed?.role === "student" || parsed?.role === "parent") &&
      typeof parsed?.intentPrompt === "string" &&
      typeof parsed?.intentLabel === "string"
    ) {
      return parsed
    }
    return null
  } catch {
    return null
  }
}

export interface EduLessonPickerCardProps {
  payload: EduLessonPickerPayload
  /** 当前 educationStage 用于驱动课表行的状态徽章 / subtitle */
  stage: EducationStage
  /** 用户点某节课 → 父组件分发 `handleEduRoleSkillCommand(intentPrompt, { lessonId, ... })` */
  onPickLesson: (args: { lessonId: string; intentPrompt: string }) => void
  className?: string
}

export function EduLessonPickerCard({
  payload,
  stage,
  onPickLesson,
  className,
}: EduLessonPickerCardProps) {
  const lessons = DEMO_LESSONS
  return (
    <div className={className}>
      <GenericCard title={payload.intentLabel}>
        <p className="m-0 mb-[var(--space-200)] text-[length:var(--font-size-xs)] text-text-tertiary">
          点选后我会进入该节课的 AI 课堂助手，并直接帮你做这件事。
        </p>
        <ul className="m-0 flex w-full list-none flex-col gap-[var(--space-200)] p-0">
          {lessons.map((l) => {
            const status = getAgendaLessonStatus(l, stage)
            const subtitle = getAgendaLessonSubtitle(l, stage, payload.role)
            return (
              <li key={l.id} className="w-full">
                <LessonRow
                  lesson={l}
                  status={status}
                  subtitle={subtitle}
                  onPick={() =>
                    onPickLesson({
                      lessonId: l.id,
                      intentPrompt: payload.intentPrompt,
                    })
                  }
                />
              </li>
            )
          })}
        </ul>
        <p className="m-0 mt-[var(--space-300)] rounded-[var(--radius-md)] border border-dashed border-border bg-[var(--color-bg-subtle)] px-[var(--space-300)] py-[var(--space-300)] text-[length:var(--font-size-xs)] text-text-tertiary">
          课程的所有 Skill 操作都在该节课的子 CUI 内累积；选错了可以关掉子 CUI，再回到本卡重新挑。
        </p>
      </GenericCard>
    </div>
  )
}
