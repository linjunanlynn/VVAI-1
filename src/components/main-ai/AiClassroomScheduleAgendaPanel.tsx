/**
 * 课表 GUI（meeting-agenda 风格）：
 * - 入口：教育门户 dock·「我的课表 / 孩子课表」 点击
 * - 形态：从右侧滑入的 sheet，覆盖在主门户上层（不进入 dock 二级菜单）
 * - 内容：本周课程列表，按时间倒序展示状态徽章；用户点击某节课 → 关闭 agenda + 打开该课的子 CUI
 * - 数据来源：`DEMO_LESSONS`（5 条；其中 1 条为 DEMO_LESSON 主线，状态由 educationStage 驱动）
 */

import * as React from "react"
import { X } from "lucide-react"
import {
  DEMO_LESSONS,
  getAgendaLessonStatus,
  getAgendaLessonSubtitle,
} from "./aiClassroomLessonsDemo"
import type { EducationStage } from "./educationStageDemo"
import type { EduLessonAttendingRole } from "./homeScenarioLayout"
import { LessonRow } from "./AiClassroomLessonRow"

export interface AiClassroomScheduleAgendaPanelProps {
  role: EduLessonAttendingRole
  stage: EducationStage
  /** 用户在 agenda 里点选了某节课 → 触发外部"打开该课子 CUI" */
  onPickLesson: (lessonId: string) => void
  onClose: () => void
}

/** 按角色定制 agenda 标题（家长 → 孩子课表；其余 → 我的课表） */
const ROLE_TITLE: Record<EduLessonAttendingRole, string> = {
  teacher: "我的课表",
  student: "我的课表",
  parent: "孩子课表",
}

const ROLE_LIST_HINT: Record<EduLessonAttendingRole, string> = {
  teacher: "本周共 5 节·点击任意一节进入该课的 AI 课堂助手",
  student: "本周共 5 节·点一节看你的状态、进入课堂",
  parent: "本周共 5 节·点一节看孩子的状态、进入课程详情",
}

export function AiClassroomScheduleAgendaPanel({
  role,
  stage,
  onPickLesson,
  onClose,
}: AiClassroomScheduleAgendaPanelProps) {
  /**
   * agenda 排序：
   * - 当前周课程优先
   * - 当周内：按"今日 / 明日 / 本周 / 已完成"分组
   * - 主线 DEMO_LESSON 永远显示"本节"徽章
   * 简化版：直接按 weekday 顺序展示
   */
  const lessons = DEMO_LESSONS

  return (
    <aside
      className="pointer-events-auto flex h-full min-h-0 min-w-0 w-full flex-col border-l border-[#e8ecf0] bg-cui-bg shadow-[-12px_0_32px_rgba(15,23,42,0.08)]"
      role="dialog"
      aria-label={ROLE_TITLE[role]}
    >
      {/* Header */}
      <header className="flex shrink-0 items-center gap-3 border-b border-border px-[var(--space-400)] py-[var(--space-300)]">
        <div className="min-w-0 flex-1">
          <h2 className="m-0 truncate text-[length:var(--font-size-md)] font-[var(--font-weight-semibold)] text-text">
            {ROLE_TITLE[role]}
          </h2>
          <p className="m-0 truncate text-[length:var(--font-size-xs)] text-text-tertiary">
            {ROLE_LIST_HINT[role].replace("本周共 5 节", `本周共 ${lessons.length} 节`)}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-text-tertiary transition-colors hover:bg-bg-secondary hover:text-text"
          aria-label="关闭课表"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      {/* 列表 */}
      <div className="flex-1 min-h-0 overflow-y-auto px-[var(--space-400)] py-[var(--space-300)]">
        <div className="mb-[var(--space-200)] text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] text-text-tertiary">
          本周（{lessons.length} 节）
        </div>
        <ul className="m-0 flex list-none flex-col gap-[var(--space-200)] p-0">
          {lessons.map((l) => {
            const status = getAgendaLessonStatus(l, stage)
            const subtitle = getAgendaLessonSubtitle(l, stage, role)
            return (
              <li key={l.id}>
                <LessonRow
                  lesson={l}
                  status={status}
                  subtitle={subtitle}
                  onPick={() => onPickLesson(l.id)}
                />
              </li>
            )
          })}
        </ul>

        <div className="mt-[var(--space-400)] rounded-[var(--radius-md)] border border-dashed border-border bg-[var(--color-bg-subtle)] px-[var(--space-300)] py-[var(--space-300)] text-[length:var(--font-size-xs)] text-text-tertiary">
          点击任意一节课，进入该课的 AI 课堂助手（子 CUI）。课前 / 课中 / 课后所有 Skill 操作都在该会话线里按时间累积。
        </div>
      </div>
    </aside>
  )
}
