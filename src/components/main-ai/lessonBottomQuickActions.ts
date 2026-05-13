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
  CalendarCheck,
  ClipboardCheck,
  ClipboardList,
  FolderClosed,
  MessageSquare,
  RefreshCcw,
  Sparkles,
  UserMinus,
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
 * 课程子 CUI 输入框上方按钮：
 * - 通用 7 项：风采点评 → 签到 → 作业 → 调课 → 沟通 → 成员 → 资料
 *   · 「风采点评」由原「风采 / 点评」合并而来：本节评价（学情亮点 / 待改进）与课堂风采（精彩瞬间 / 群发家长）属于同一个"事后向家长展示本节情况"的产物，合并入口减少应用条拥挤。
 * - 老师专属：在「资料」之后追加「备课」（触发 marker 渲染备课就绪卡）
 *
 * 老师入口的 prompt 文本固定为 `开始备课`，
 * 由 panel 内 `handleRecommendedPrompt` 直接拦截 → push 备课卡 marker，不走 Skill 匹配。
 */
export function getLessonBottomQuickActions(
  role: EduLessonAttendingRole,
): LessonBottomQuickAction[] {
  const isTeacher = role === "teacher"
  const isStudent = role === "student"
  const baseActions: LessonBottomQuickAction[] = [
    {
      id: "qa-review-moments",
      label: "风采点评",
      icon: Sparkles,
      /**
       * 合并语义：
       *  - 老师：写本节评价 + 选课堂风采 → 一键群发学情报告（既有 Skill 入口）
       *  - 学生 / 家长：看本节老师评价与课堂风采精选
       *
       * prompt 文本沿用既有 keyword「一键群发学情报告 / 看课堂风采」走 resolveRecommendedPromptReply，
       * 老师场景下复用学情报告 Skill；学生 / 家长走原"看课堂风采"通道，不需要新增 Skill 配置。
       */
      prompt: isTeacher ? "风采点评" : "风采报告",
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
      prompt: isTeacher
        ? "发起调课并通知学生家长"
        : isStudent
          ? "发起调课申请"
          : "代孩子发起调课申请",
    },
    {
      id: "qa-leave",
      label: "请假",
      icon: UserMinus,
      prompt: isTeacher ? "查看本节请假情况" : isStudent ? "我要请假" : "代孩子请假",
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
      /**
       * 老师 / 学生 / 家长统一走「看本节课资料」prompt，
       * 由 panel 的 `handleRecommendedPrompt` 拦截后 push 资料卡 marker
       * （viewerRole 注入卡内做权限收敛）。
       */
      prompt: "看本节课资料",
    },
  ]
  if (isTeacher) {
    baseActions.push({
      id: "qa-prep",
      label: "备课",
      icon: ClipboardCheck,
      prompt: "开始备课",
    })
  }
  return baseActions
}
