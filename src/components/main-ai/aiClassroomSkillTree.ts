/**
 * 「AI课堂」三级菜单数据（PRD 2.8.2 / 2.8.3 落位）。
 *
 * - 老师 = PRD 2.8.2.2 任课教师二级菜单展开示意（教学 / 管理 / 经营 三板块）
 * - 学生 = PRD 2.8.3.1 学员二级菜单（按今日学习 / 预习 / 课中 / 课后 / 学习伙伴 五分组）
 * - 家长 = PRD 2.8.3.2 家长二级菜单（按孩子学习 / 学情与作业 / 请假与调课 / 家校沟通 / 财务与续费 / 学习支持 六分组）
 *
 * 已注册 `aiClassroomSkillRegistry` 的 Skill 会渲染真实业务卡片；未注册的仍走占位文本回复。
 *
 * 课程形态分支（PRD 2.5.1 / 2.5.2 / 2.6.1 / 2.6.2）：
 * - 🔵 线上课中：保留原 6/3/3 张课中能力（虚拟教室 / 直播视图 / 受限 30 秒一眼直播 等）
 * - 🟢 线下课中：替换为「教室 IoT 主导」的能力集（IFP 板书、摄像头追踪、教室共享 Pad、接送闭环 等）
 * 课前 / 课后两态此处不区分形态（相关差异另由 hero 卡 / 报告卡承担）。
 */
import type { EduLessonAttendingRole } from "./homeScenarioLayout"
import type { EducationStage } from "./educationStageDemo"
import type { LessonDeliveryMode } from "./lessonDeliveryMode"
import { hasAiClassroomSkillCard } from "./aiClassroomSkillRegistry"

/**
 * AI 课堂业务卡片 marker。`<<<RENDER_AI_SKILL_CARD>>>:<skillId>` 由 MainAIChatWindow 渲染。
 */
export const AI_CLASSROOM_SKILL_CARD_MARKER = "<<<RENDER_AI_SKILL_CARD>>>"

export interface AiClassroomSkillItem {
  id: string
  label: string
  /** 右侧 Badge：如 `[今日待备课 3]` `[待审 8]`；仅展示用 */
  badge?: string
  /** 灰显（如老师「课中助手」仅课中开启） */
  disabled?: boolean
  /** 列表项前的 emoji 图标（与 PRD 示意一致；本轮以 emoji 直出，避免引入新依赖） */
  emoji?: string
}

export interface AiClassroomSkillSection {
  /** 分组标题（如「教学（Teaching）」「今日学习」） */
  title: string
  /** 分组副标题或边界说明（可选） */
  hint?: string
  items: AiClassroomSkillItem[]
}

export interface AiClassroomSkillTree {
  role: EduLessonAttendingRole
  /** 顶部副标题（与 PRD 表述一致） */
  intro: string
  /** 输入框 placeholder 引导（PRD 2.8.4 D） */
  placeholder: string
  /** 推荐快捷指令（PRD 2.8.4 D，挑 3 条代表性 prompt） */
  quickPrompts: string[]
  sections: AiClassroomSkillSection[]
}

/** 任课教师 AI课堂菜单：仅保留 PRD 中课前 / 课中 / 课后教学闭环能力 */
const TEACHER_TREE: AiClassroomSkillTree = {
  role: "teacher",
  intro: "任课教师 · 课前 / 课中 / 课后教学助手",
  placeholder: "你想给哪节课备课？我会读取学情和课件包",
  quickPrompts: ["今日 19:00 这节", "按本周", "复用上节"],
  sections: [
    {
      title: "课前",
      items: [
        { id: "tt-prep", label: "开始备课", badge: "待备 3", emoji: "✍️" },
        { id: "tt-portrait", label: "查看学情", emoji: "👤" },
        { id: "tt-courseware-ai", label: "课件 AI 生成", emoji: "🎨" },
        { id: "tt-preview", label: "把预习推给学生", emoji: "📤" },
        { id: "tt-ready", label: "课前就位检查", emoji: "📦" },
      ],
    },
    {
      title: "课中",
      items: [
        { id: "tc-question", label: "出一道随堂题", emoji: "🎯" },
        { id: "tc-group", label: "8 分钟分组讨论", emoji: "👥" },
        { id: "tc-private", label: "私聊学员", emoji: "💬" },
        { id: "tc-ocr", label: "板书拍照转文字", emoji: "📝" },
        { id: "tc-pace", label: "建议放慢节奏", emoji: "⏱" },
        { id: "tc-bilingual", label: "中英双语切换", emoji: "🌐" },
      ],
    },
    {
      title: "课后",
      items: [
        { id: "ta-report", label: "审课后报告", badge: "待审 8", emoji: "📝" },
        { id: "ta-asgmt", label: "批改作业", badge: "待批 3", emoji: "✅" },
        { id: "ta-mistakes", label: "讲一遍错题", emoji: "🧩" },
        { id: "ta-variant", label: "生成同类变式题", emoji: "🧠" },
        { id: "ta-progress", label: "和上节比一比进步", emoji: "📈" },
      ],
    },
  ],
}

/** 学员 AI课堂菜单：仅保留 PRD 2.6.1 中课前 / 课中 / 课后学习能力 */
const STUDENT_TREE: AiClassroomSkillTree = {
  role: "student",
  intro: "提问帮手 · 课前预习 / 上课提问 / 重做错题",
  placeholder: "嘿！我可以帮你想思路、解释知识点、陪你重做错题",
  quickPrompts: ["作业怎么想", "重做错题", "今天复习啥"],
  sections: [
    {
      title: "课前",
      items: [
        { id: "sp-today", label: "今日学习卡片", badge: "19:00", emoji: "🎯" },
        { id: "sp-pack", label: "开始预习", badge: "待 2 项", emoji: "📖" },
        { id: "sp-kp", label: "知识点速览", emoji: "🧩" },
        { id: "sp-remind", label: "上课提醒", emoji: "⏰" },
      ],
    },
    {
      title: "课中",
      hint: "上课时只能用这些",
      items: [
        { id: "sc-handraise", label: "举手/抢答（全班发言）", emoji: "✋" },
        { id: "sc-private", label: "私聊老师（仅老师可见）", emoji: "🔒" },
        { id: "sc-leave", label: "紧急请假", emoji: "📞" },
      ],
    },
    {
      title: "课后",
      items: [
        { id: "sa-asgmt", label: "我的作业", badge: "待做 1", emoji: "✏️" },
        { id: "sa-mistakes", label: "重做错题", badge: "新 3", emoji: "🧠" },
        { id: "sa-report", label: "看我本节得分", emoji: "🌟" },
        { id: "sa-copilot", label: "问提问帮手", emoji: "🤖" },
        { id: "sa-handoff", label: "让我老师看一下", emoji: "🆘" },
      ],
    },
  ],
}

/** 家长 AI课堂菜单：仅保留 PRD 2.6.2 中围绕孩子课前 / 课中 / 课后的能力 */
const PARENT_TREE: AiClassroomSkillTree = {
  role: "parent",
  intro: "家长助手 · 课前预告 / 课中状态 / 课后报告",
  placeholder: "想看孩子哪节课？课前、课中还是课后？",
  quickPrompts: ["本周课表", "预习情况", "最新报告"],
  sections: [
    {
      title: "课前",
      items: [
        { id: "pp-schedule", label: "本周课表", emoji: "📅" },
        { id: "pp-preview", label: "预习进度", emoji: "📖" },
        { id: "pp-brief", label: "本节课预告", emoji: "📰" },
        { id: "pp-ready", label: "课前注意事项", emoji: "📌" },
      ],
    },
    {
      title: "课中",
      items: [
        { id: "pc-status", label: "上课中状态", emoji: "🎯" },
        { id: "pc-live", label: "看一眼直播", emoji: "👀" },
        { id: "pc-urgent", label: "紧急请假", emoji: "🆘" },
      ],
    },
    {
      title: "课后",
      items: [
        { id: "pa-report", label: "课后报告", emoji: "📝" },
        { id: "pa-detail", label: "查看详情", emoji: "📊" },
        { id: "pa-support", label: "安排今晚陪练", emoji: "✅" },
        { id: "pa-advice", label: "今晚怎么陪孩子", emoji: "🏠" },
      ],
    },
  ],
}

/**
 * 线下课中专属 chip（PRD 2.5.1.C / 2.5.2 / 2.6.1 / 2.6.2）：
 * - 教师 3 张：IFP 智能黑板 / 摄像头自动追踪 / 物理学具站
 * - 学生 2 张：教室共享 Pad / 移动麦传递（举手）
 * - 家长 2 张：接送闭环时间线 / 教室摄像头巡检
 *
 * 这些 chip 替换"课中"分组下的线上原 chip；其它分组（课前 / 课后）保持不变。
 */
const OFFLINE_TEACHER_IN_ITEMS: AiClassroomSkillItem[] = [
  { id: "oc-tt-ifp", label: "IFP 板书 OCR", emoji: "📺" },
  { id: "oc-tt-camera", label: "摄像头追踪发言者", emoji: "🎥" },
  { id: "oc-tt-station", label: "物理学具记录站", emoji: "🧲" },
  { id: "tc-question", label: "出一道随堂题", emoji: "🎯" },
  { id: "tc-pace", label: "建议放慢节奏", emoji: "⏱" },
]

const OFFLINE_STUDENT_IN_ITEMS: AiClassroomSkillItem[] = [
  { id: "oc-st-pad", label: "教室 Pad 私聊老师", emoji: "🔒" },
  { id: "oc-st-mic", label: "举手 / 等无线麦（全班发言）", emoji: "✋" },
  { id: "sc-leave", label: "紧急请假", emoji: "📞" },
]

const OFFLINE_PARENT_IN_ITEMS: AiClassroomSkillItem[] = [
  { id: "oc-pa-pickup", label: "接送闭环时间线", emoji: "🚸" },
  { id: "oc-pa-monitor", label: "教室摄像头巡检", emoji: "👀" },
  { id: "pc-urgent", label: "紧急请假", emoji: "🆘" },
]

function applyOfflineInClassItems(
  tree: AiClassroomSkillTree,
): AiClassroomSkillTree {
  const overrideItems =
    tree.role === "teacher"
      ? OFFLINE_TEACHER_IN_ITEMS
      : tree.role === "student"
        ? OFFLINE_STUDENT_IN_ITEMS
        : tree.role === "parent"
          ? OFFLINE_PARENT_IN_ITEMS
          : null
  if (!overrideItems) return tree
  return {
    ...tree,
    sections: tree.sections.map((section) =>
      section.title === "课中"
        ? { ...section, hint: "线下课中 · 教室 IoT + 实物互动", items: overrideItems }
        : section,
    ),
  }
}

export function pickAiClassroomTree(
  role: EduLessonAttendingRole,
  stage?: EducationStage,
  deliveryMode: LessonDeliveryMode = "online",
): AiClassroomSkillTree {
  const base = role === "student" ? STUDENT_TREE : role === "parent" ? PARENT_TREE : TEACHER_TREE
  /** 线下课形态：仅替换"课中"分组的 chip；课前 / 课后保持不变。 */
  const modeAware = deliveryMode === "offline" ? applyOfflineInClassItems(base) : base
  if (!stage) return modeAware
  const title = stage === "pre" ? "课前" : stage === "in" ? "课中" : "课后"
  return {
    ...modeAware,
    sections: modeAware.sections.filter((section) => section.title === title),
  }
}

/**
 * Skill 点击后的 AI 回复内容：
 * - 已注册业务卡片：返回 marker `<<<RENDER_AI_SKILL_CARD>>>:<skillId>`，由 MainAIChatWindow 渲染
 * - 未注册：返回占位文本（保留旧行为，方便逐项替换）
 *
 * `deliveryMode` 仅作为占位文案的形态后缀，不影响 marker 拼装（由注册表内部按 mode 分流）。
 */
export function buildAiClassroomSkillPlaceholderReply(
  item: AiClassroomSkillItem,
  role: EduLessonAttendingRole,
  stage?: EducationStage,
  deliveryMode: LessonDeliveryMode = "online",
): string {
  if (hasAiClassroomSkillCard(item.id, deliveryMode)) {
    return `${AI_CLASSROOM_SKILL_CARD_MARKER}:${item.id}`
  }
  const stageLabel = stage === "pre" ? "课前" : stage === "in" ? "课中" : stage === "post" ? "课后" : "AI课堂"
  return `已进入「${stageLabel} · ${item.label}」。该能力卡片即将上线。`
}
