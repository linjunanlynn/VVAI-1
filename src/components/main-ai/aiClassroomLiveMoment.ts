/**
 * AI 课堂子 CUI 「课中现场卡」数据。
 *
 * 设计动机
 * ----------------------------------------------------
 * 课前 / 课后 适合"清单 + 完成感"——任务是固定的、做完就结。
 * 课中**不**适合：
 * - 机会是"瞬时"的（老师正讲到 X，5 秒后就过了），没有"这件事做完就完了"的语义
 * - 多次抢答 / 多次提问都正常，"打勾即结束"反而压抑学生主动性
 * - 老师 / 家长 / 学生对"当下"的视角完全不同（家长是"看一眼别打扰"，老师是"接住节奏"）
 *
 * 所以课中专门走「现场卡」：
 *   1. **直播状态**：动态一行（绿点呼吸 + 进度时间 + 当前节奏）
 *   2. **AI 当下建议**：一句话指向"现在应该做什么"（基于本节正确率 / 专注度 / 节奏推断）
 *   3. **可用动作分组**：去掉打勾 / 进度，按"现在可以"+"全程都可以"两段分组；每个 chip 可挂一行 meta
 *
 * 与 `aiClassroomChecklist.ts` 的边界
 * ----------------------------------------------------
 * - 课前 / 课后 → checklist（todo + done + celebration）
 * - 课中 → liveMoment（现场状态 + 当下建议 + 分组动作）
 * - panel 在 `effectiveStage === "in"` 时 push liveMoment marker，其它阶段照常 push checklist marker
 */

import type { EduLessonAttendingRole } from "./homeScenarioLayout"

export interface AiClassroomLiveMomentAction {
  /** chip 标签（含 emoji） */
  label: string
  /** 点击触发的 prompt（落到 handleRecommendedPrompt） */
  prompt: string
  /** chip 下方副标题（一行说明，可选；为长 chip 留出 meta 槽位） */
  meta?: string
  /** 主色 / 次色；primary 用于"当下推荐"主动作 */
  tone?: "primary" | "secondary"
  /** 灰显（如"等老师开放抢答"），点击仍可触发但视觉弱化 */
  disabled?: boolean
}

export interface AiClassroomLiveMomentSection {
  /** 分组标题，如"现在可以"/"全程都可以"/"需要可以" */
  title: string
  /** 分组下的 1 行边界说明（可选） */
  hint?: string
  actions: AiClassroomLiveMomentAction[]
}

export interface AiClassroomLiveMoment {
  /** 卡片标题，如"上课中 · 现在可以做" */
  title: string
  /** 直播状态一行（呼吸点 + 文本） */
  liveStatus: string
  /** AI 给的"当下建议"一句话；可选，没有就只显示状态条 */
  contextHint?: string
  /** 1-2 组动作 */
  sections: AiClassroomLiveMomentSection[]
  /** 底部小字提示（如"AI 不打断老师；可关闭这张卡"） */
  footerNote?: string
}

/** ============= 学生 课中 ============= */
const STUDENT_IN: AiClassroomLiveMoment = {
  title: "上课中 · 你现在可以",
  liveStatus: "直播中 · 12:30 / 45:00；第 3 题进行中",
  contextHint: "老师讲到「矢量方向」（你预习时较弱的点），抓住举手机会会更稳。",
  sections: [
    {
      title: "现在可以",
      hint: "5 秒内能完成的小动作",
      actions: [
        {
          label: "✋ 举手抢答（全班发言）",
          prompt: "举手抢答",
          meta: "举手就有积分；老师会优先看到你",
          tone: "primary",
        },
        {
          label: "💬 我要提问",
          prompt: "我要提问",
          meta: "你可以选「私聊老师」（仅老师可见）或「举手发言」（同学也能听到）",
        },
      ],
    },
    {
      title: "全程都可以",
      actions: [
        {
          label: "📞 紧急请假",
          prompt: "紧急请假",
          meta: "身体不舒服 / 网络掉线时用",
        },
      ],
    },
  ],
  footerNote: "AI 不会打断老师；这张卡会随直播自动更新。",
}

/** ============= 老师 课中 ============= */
const TEACHER_IN: AiClassroomLiveMoment = {
  title: "课中 · 当下可以做",
  liveStatus: "直播中 · 12:30 / 45:00；第 7 题完成，正确率 62%",
  contextHint: "正确率偏低 + 矢量方向死角未解；建议放慢 2 分钟 + 补 1 张同类题。",
  sections: [
    {
      title: "现在推荐",
      hint: "针对当前节奏的 AI 建议",
      actions: [
        {
          label: "🎯 出一道随堂题",
          prompt: "出一道随堂题",
          meta: "AI 已挑好同类题，一键发到全班屏幕",
          tone: "primary",
        },
        {
          label: "👥 8 分钟分组讨论",
          prompt: "智能分组",
          meta: "把矢量方向死角解开",
        },
        {
          label: "⏱ 换节奏",
          prompt: "换节奏",
          meta: "建议放慢 2 分钟",
        },
      ],
    },
    {
      title: "全程都可以",
      actions: [
        {
          label: "💬 私聊学员",
          prompt: "私聊学员",
        },
        {
          label: "📝 板书 OCR",
          prompt: "板书拍照转文字",
        },
        {
          label: "🌐 中英双语切换",
          prompt: "中英双语切换",
        },
      ],
    },
  ],
  footerNote: "我会持续看正确率与互动率；状态变了会主动来提示。",
}

/** ============= 家长 课中 ============= */
const PARENT_IN: AiClassroomLiveMoment = {
  title: "孩子上课中 · 看一眼就好",
  liveStatus: "孩子上课中 · 12:30；专注度 86%（正常）",
  contextHint: "AI 替您留意；状态有问题会主动通知。您不必守着屏幕。",
  sections: [
    {
      title: "需要可以",
      hint: "建议留到半场后（约 22 分）再看",
      actions: [
        {
          label: "🎯 上课中状态",
          prompt: "上课中状态",
          meta: "专注度 / 在线 / 互动 三个数字",
          tone: "primary",
        },
        {
          label: "👀 看一眼直播（30 秒）",
          prompt: "看一眼直播 30 秒",
          meta: "只能看 30 秒；看完 5 分钟后才能再开",
        },
      ],
    },
    {
      title: "应急通道",
      actions: [
        {
          label: "🆘 紧急代请假",
          prompt: "代孩子请假",
          meta: "孩子突发不适 / 突发情况时用",
        },
      ],
    },
  ],
  footerNote: "孩子专注度 / 在线状态会自动同步到这里；异常时我会主动通知您。",
}

/** ============= 矩阵 ============= */
const LIVE_MOMENTS: Record<EduLessonAttendingRole, AiClassroomLiveMoment> = {
  teacher: TEACHER_IN,
  student: STUDENT_IN,
  parent: PARENT_IN,
}

/** 取该 role 的课中现场卡（课中只此一份；其它阶段不应调用） */
export function getAiClassroomLiveMoment(role: EduLessonAttendingRole): AiClassroomLiveMoment {
  return LIVE_MOMENTS[role]
}

/** ============= marker ============= */
export const AIC_LIVE_MOMENT_CARD_MARKER = "<<<RENDER_AIC_LIVE_MOMENT>>>"

/** 序列化：`<<<RENDER_AIC_LIVE_MOMENT>>>:<role>` */
export function buildLiveMomentCardContent(role: EduLessonAttendingRole): string {
  return `${AIC_LIVE_MOMENT_CARD_MARKER}:${role}`
}

export function parseLiveMomentMarker(content: string): { role: EduLessonAttendingRole } | null {
  if (typeof content !== "string") return null
  if (!content.startsWith(`${AIC_LIVE_MOMENT_CARD_MARKER}:`)) return null
  const rest = content.slice(`${AIC_LIVE_MOMENT_CARD_MARKER}:`.length)
  if (!["teacher", "student", "parent"].includes(rest)) return null
  return { role: rest as EduLessonAttendingRole }
}
