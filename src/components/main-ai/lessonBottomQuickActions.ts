/**
 * 课程子 CUI 输入框上方「统一操作条」(8 个固定按钮)
 *
 * 设计：
 * - 不再随阶段 / 角色变化（产品要求：所有课程、所有状态、统一一套）
 * - 每个按钮：固定 label + lucide 图标
 * - 点击 = 触发一条 role-aware prompt，走统一的 `handleRecommendedPrompt` 通道
 *   - prompt 必须命中 `resolveRecommendedPromptReply` 关键词或 Skill registry，否则会落到通用 fallback
 *   - 角色之间的 prompt 不同（例：作业 老师=布置今晚作业；学生=我的作业；家长=看孩子今晚作业）
 *
 * 视觉：参考产品截图二的"评价 / 签到 / 作业 / 调课 / 风采 / 沟通 / 成员 / 资料"小 chip 条。
 */

import {
  Award,
  CalendarCheck,
  ClipboardList,
  FolderClosed,
  MessageSquare,
  RefreshCcw,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react"
import type { EduLessonAttendingRole } from "./homeScenarioLayout"

export interface LessonBottomQuickAction {
  id: string
  label: string
  icon: LucideIcon
  /** 点击 → 派发到 `handleRecommendedPrompt` 的指令文本（按身份区分，命中 keyword 闭环或 fallback） */
  prompt: string
}

/**
 * 8 个固定按钮，按身份返回不同的 prompt 文本。
 * 顺序固定 = 评价 → 签到 → 作业 → 调课 → 风采 → 沟通 → 成员 → 资料
 */
export function getLessonBottomQuickActions(
  role: EduLessonAttendingRole,
): LessonBottomQuickAction[] {
  const isTeacher = role === "teacher"
  const isStudent = role === "student"
  return [
    {
      id: "qa-eval",
      label: "评价",
      icon: Award,
      prompt: isTeacher ? "给学生写本节评价" : "看老师本节评价",
    },
    {
      id: "qa-attendance",
      label: "签到",
      icon: CalendarCheck,
      prompt: isTeacher
        ? "看本周签到明细"
        : isStudent
          ? "看我的签到记录"
          : "看孩子的签到记录",
    },
    {
      id: "qa-homework",
      label: "作业",
      icon: ClipboardList,
      prompt: isTeacher
        ? "布置今晚作业"
        : isStudent
          ? "我的作业"
          : "看孩子今晚作业",
    },
    {
      id: "qa-reschedule",
      label: "调课",
      icon: RefreshCcw,
      prompt: isTeacher ? "处理请假调课审批" : isStudent ? "申请调课" : "代孩子请假调课",
    },
    {
      id: "qa-moments",
      label: "风采",
      icon: Sparkles,
      prompt: isTeacher ? "发送课堂风采给家长" : "看课堂风采",
    },
    {
      id: "qa-communicate",
      label: "沟通",
      icon: MessageSquare,
      prompt: isTeacher ? "给学生家长发消息" : isStudent ? "私聊老师" : "和王老师私聊",
    },
    {
      id: "qa-members",
      label: "成员",
      icon: Users,
      prompt: "看本班成员名单",
    },
    {
      id: "qa-materials",
      label: "资料",
      icon: FolderClosed,
      prompt: isTeacher ? "看本节课资料" : "看本节课件",
    },
  ]
}
