/**
 * AI 课堂子 CUI 「本节清单」数据。
 *
 * 设计动机
 * ----------------------------------------------------
 * 旧实现：进入子 CUI 只 push 一条入场欢迎 + 3 个 chip。用户做完一个 chip 后，
 * 体感是"这条聊完了"——但**没有"还差几件事"的目的感**，更没有"今晚都做完了"的完成感。
 *
 * 本模块的角色
 * ----------------------------------------------------
 * 为 9 个单元格（3 身份 × 3 阶段）定义"本节要做的 N 件事"清单：
 * - 每项：`id` + `title`（动名词短语）+ `meta`（一句话目的）+ `primarySkillId`（点了 = 做了一件）
 * - 每个清单：标题 + intro + items + 全部做完的庆祝卡（headline / body / nextActions）
 *
 * 命中策略：用户从清单 chip 进入 OR 从底部能力条 / 输入框 / 其它 chip 触发同 `skillId`，
 * 都视作完成该项；侧 CUI 持久化 doneIds 以保证刷新 / 切回之后仍记得进度。
 *
 * 与其它模块的边界
 * ----------------------------------------------------
 * - 与 `aiClassroomWelcome.ts`：那里负责入场欢迎；本模块在欢迎之后追加一张"清单卡"
 * - 与 `aiClassroomSkillRegistry.ts`：本模块**不**重复定义 Skill 卡，仅引用 `skillId`
 * - 与 `aiClassroomSidePersistence.ts`：doneIds 写入 sessionStorage，跨开关持久
 */

import type { AiClassroomReplyAction } from "./aiClassroomReply"
import type { EducationStage } from "./educationStageDemo"
import type { EduLessonAttendingRole } from "./homeScenarioLayout"

/** 清单单项（"要做的一件事"） */
export interface AiClassroomChecklistItem {
  /** 唯一 id（在所属 checklist 内唯一即可，跨 checklist 复用 skillId 即可） */
  id: string
  /** 动名词短语，如「看本节报告」「抢答 1 次」 */
  title: string
  /** 一句话目的：为什么要做这件事 */
  meta: string
  /** 主按钮文案（chip 上的 label） */
  primaryLabel: string
  /** 点击后作为 prompt 触发；同时用于关键词匹配兜底 */
  primaryPrompt: string
  /** 命中后会执行的 skillId；用户通过任意入口触发同 skillId 即视作完成此项 */
  primarySkillId?: string
  /** 备用判断：用户从其它入口提交的 prompt 包含其中任一关键词，也视作完成 */
  promptKeywords?: string[]
}

/** 本节清单（一个 role × stage 一份） */
export interface AiClassroomChecklist {
  /** 卡片标题，如「今晚物理课：你还要做的 4 件事」 */
  title: string
  /** 一句话引语 */
  intro: string
  /** 进度顺序展示；建议 2–4 项 */
  items: AiClassroomChecklistItem[]
  /** 全部完成后 push 的庆祝卡 */
  completion: {
    headline: string
    body: string[]
    /** 2–3 个"下一步 / 明天"chip */
    nextActions: AiClassroomReplyAction[]
  }
}

type ChecklistMatrix = Record<EduLessonAttendingRole, Record<EducationStage, AiClassroomChecklist | null>>

/** ============= 学生 ============= */
const STUDENT_PRE: AiClassroomChecklist = {
  title: "课前 3 件事，5 分钟搞定",
  intro: "做完这 3 件，今晚课堂就不会发慌。",
  items: [
    {
      id: "sp-pack",
      title: "完成预习（视频 + 3 道前置题）",
      meta: "其中矢量方向判断还有 2 道未完成",
      primaryLabel: "📖 开始预习",
      primaryPrompt: "开始预习",
      primarySkillId: "sp-pack",
      promptKeywords: ["开始预习", "预习"],
    },
    {
      id: "sp-kp",
      title: "扫一眼知识点速览",
      meta: "30 秒看完今晚 3 个核心概念",
      primaryLabel: "🧩 知识点速览",
      primaryPrompt: "知识点速览",
      primarySkillId: "sp-kp",
      promptKeywords: ["知识点速览", "速览"],
    },
    {
      id: "sp-remind",
      title: "设上课提醒",
      meta: "19:00 准时上线，提前 5 分钟测网络",
      primaryLabel: "⏰ 设上课提醒",
      primaryPrompt: "上课提醒",
      primarySkillId: "sp-remind",
      promptKeywords: ["上课提醒", "提醒"],
    },
  ],
  completion: {
    headline: "课前 3 件事全部就位 ✓",
    body: ["19:00 准时见，记得提前 5 分钟测设备。"],
    nextActions: [
      { label: "🎯 看今日学习卡片", prompt: "今日学习卡片", tone: "primary" },
      { label: "🤖 找提问帮手问点别的", prompt: "问提问帮手" },
    ],
  },
}

/**
 * 课中（in）三 cell 由 `aiClassroomLiveMoment.ts` 接管，**不**再走"清单 + 进度 + 完成"模型。
 * 原因：
 * - 课中是"瞬时机会 + AI 当下建议"语义，不是"做完 N 件就结业"
 * - 多次抢答 / 多次提问都是好事，"打勾即结束"反而压抑学生主动性
 * - 老师 / 家长的课中视角与学生差异极大，统一打卡卡片不适配
 *
 * panel 在 `effectiveStage === "in"` 时改为 push live moment marker。
 */

const STUDENT_POST: AiClassroomChecklist = {
  title: "今晚物理课：还要做的 4 件事",
  intro: "做完这 4 件，今晚就可以安心睡觉了。",
  items: [
    {
      id: "sa-report",
      title: "看一份本节报告",
      meta: "1 分钟，知道哪里强了哪里要补",
      primaryLabel: "🌟 看本节报告",
      primaryPrompt: "我的报告",
      primarySkillId: "sa-report",
      promptKeywords: ["我的报告", "课后报告", "本节报告"],
    },
    {
      id: "sa-mistakes",
      title: "重做错题 1 道",
      meta: "把今天的薄弱点（矢量方向）当场过一遍",
      primaryLabel: "🧠 重做错题",
      primaryPrompt: "去重做错题",
      primarySkillId: "sa-mistakes",
      promptKeywords: ["重做错题", "去重做错题", "错题挑战", "去做错题"],
    },
    {
      id: "sa-asgmt",
      title: "完成今晚作业（1 项）",
      meta: "提问帮手在旁；卡住了直接问",
      primaryLabel: "✏️ 我的作业",
      primaryPrompt: "我的作业",
      primarySkillId: "sa-asgmt",
      promptKeywords: ["我的作业", "今晚作业", "作业怎么想"],
    },
    {
      id: "sp-remind-tomorrow",
      title: "设明早 7:30 回顾提醒",
      meta: "睡前不复习也行，明早 5 分钟更稳",
      primaryLabel: "⏰ 设明早提醒",
      primaryPrompt: "上课提醒",
      primarySkillId: "sp-remind",
      promptKeywords: ["明早提醒", "复习提醒"],
    },
  ],
  completion: {
    headline: "🎉 今晚物理课全部做完了！",
    body: [
      "本节进步 3 名 ↑；矢量方向掌握度从 58% 升到 76%。",
      "明早 7:30 我会提醒你 5 分钟回顾，然后就可以放心睡了。",
    ],
    nextActions: [
      { label: "📊 看本周学习对比", prompt: "看本周对比", tone: "primary" },
      { label: "🤖 还想问提问帮手一题", prompt: "问提问帮手" },
      { label: "✅ 今晚就到这了", prompt: "今晚就到这了" },
    ],
  },
}

/** ============= 老师 ============= */
const TEACHER_PRE: AiClassroomChecklist = {
  title: "课前 4 件事，开课前合上",
  intro: "做完这 4 件，今晚 19:00 就能直接开讲。",
  items: [
    {
      id: "tt-prep",
      title: "备课审定（草稿已 80%）",
      meta: "把草稿过一遍，再补 1 张矢量方向例题图",
      primaryLabel: "✍️ 开始备课",
      primaryPrompt: "开始备课",
      primarySkillId: "tt-prep",
      promptKeywords: ["开始备课", "备课"],
    },
    {
      id: "tt-portrait",
      title: "看本节学情画像",
      meta: "薄弱点：矢量方向（mastery 58%）",
      primaryLabel: "👤 查看学情",
      primaryPrompt: "查看本节学情",
      primarySkillId: "tt-portrait",
      promptKeywords: ["查看学情", "学情画像", "本节学情"],
    },
    {
      id: "tt-preview",
      title: "把预习包推给学生",
      meta: "1 视频 + 3 题；自动跳过已完成",
      primaryLabel: "📤 推送预习包",
      primaryPrompt: "推送预习包给学生",
      primarySkillId: "tt-preview",
      promptKeywords: ["推送预习", "预习包"],
    },
    {
      id: "tt-ready",
      title: "课前就位检查",
      meta: "课件 / 摄像头 / 互动课件全部 ready",
      primaryLabel: "📦 就位检查",
      primaryPrompt: "课前就位检查",
      primarySkillId: "tt-ready",
      promptKeywords: ["就位检查", "课前检查"],
    },
  ],
  completion: {
    headline: "课前 4 件全部就位 ✓",
    body: ["19:00 准时开课；课中助手会在你点开 Skill 时启用。"],
    nextActions: [
      { label: "🎨 顺手再让 AI 美化一页课件", prompt: "课件 AI 生成", tone: "primary" },
      { label: "✅ 今晚就到这了", prompt: "今晚就到这了" },
    ],
  },
}

/** TEACHER_IN：见 `aiClassroomLiveMoment.ts` —— 课中走现场卡，不走清单。 */

const TEACHER_POST: AiClassroomChecklist = {
  title: "课后 4 件事，闭环今晚",
  intro: "审 / 派 / 改 / 备，做完这 4 件，今晚就清桌了。",
  items: [
    {
      id: "ta-report",
      title: "审课后报告（8 份草稿）",
      meta: "建议先看李小明（亮点）和陈可（风险）",
      primaryLabel: "📝 审课后报告",
      primaryPrompt: "审核课后报告",
      primarySkillId: "ta-report",
      promptKeywords: ["审核课后报告", "课后报告", "审报告"],
    },
    {
      id: "ta-report-send",
      title: "一键群发家长",
      meta: "审完直接同步家长，省掉一遍人工",
      primaryLabel: "✉️ 一键群发家长",
      primaryPrompt: "一键发送给家长",
      primarySkillId: "ta-report",
      promptKeywords: ["群发家长", "一键发送给家长", "发给家长"],
    },
    {
      id: "ta-asgmt",
      title: "批改今晚作业（3 份）",
      meta: "AI 已先批；你只需要确认有疑问的 1 份",
      primaryLabel: "✅ 批改作业",
      primaryPrompt: "批改作业",
      primarySkillId: "ta-asgmt",
      promptKeywords: ["批改作业", "批作业"],
    },
    {
      id: "ta-variant",
      title: "把高频错点导入下节",
      meta: "下节课包自动补一组同类变式题",
      primaryLabel: "🧠 生成下节变式题",
      primaryPrompt: "生成下节课变式题包",
      primarySkillId: "ta-variant",
      promptKeywords: ["变式题", "下节变式题"],
    },
  ],
  completion: {
    headline: "🎉 课后流程闭环 ✓",
    body: [
      "8 份报告已审 + 群发家长 ✓；3 份作业已批 ✓；下节变式题包已挂上。",
      "明天还有 3 节课要备；要不要先把明早第一节的草稿生成出来？",
    ],
    nextActions: [
      { label: "✍️ 备明早第一节", prompt: "开始备课", tone: "primary" },
      { label: "📈 看本周年级横向对比", prompt: "和上节比一比进步" },
      { label: "✅ 今晚就到这了", prompt: "今晚就到这了" },
    ],
  },
}

/** ============= 家长 ============= */
const PARENT_PRE: AiClassroomChecklist = {
  title: "课前 3 件小事，5 分钟搞定",
  intro: "您不用陪学；做完这 3 件，孩子就能专心上课。",
  items: [
    {
      id: "pp-brief",
      title: "看本节课预告",
      meta: "1 段，知道今晚孩子要学什么",
      primaryLabel: "📰 本节课预告",
      primaryPrompt: "本节课预告",
      primarySkillId: "pp-brief",
      promptKeywords: ["本节课预告", "课预告"],
    },
    {
      id: "pp-preview",
      title: "看孩子预习进度",
      meta: "还差 2 道题；不催，等孩子自己做完",
      primaryLabel: "📖 看预习进度",
      primaryPrompt: "查看孩子预习进度",
      primarySkillId: "pp-preview",
      promptKeywords: ["预习进度", "查看孩子预习"],
    },
    {
      id: "pp-ready",
      title: "课前 3 件小事就位",
      meta: "量角器 / 灯光 / 桌面整洁",
      primaryLabel: "📌 课前注意事项",
      primaryPrompt: "课前注意事项",
      primarySkillId: "pp-ready",
      promptKeywords: ["课前注意事项", "注意事项"],
    },
  ],
  completion: {
    headline: "课前就位 ✓",
    body: ["孩子可以专注上课了；您不用守在旁边。"],
    nextActions: [
      { label: "👀 上课时只要看一眼状态就行", prompt: "上课中状态", tone: "primary" },
      { label: "✅ 我去忙别的了", prompt: "今晚就到这了" },
    ],
  },
}

/** PARENT_IN：见 `aiClassroomLiveMoment.ts` —— 课中走现场卡，不走清单。 */

const PARENT_POST: AiClassroomChecklist = {
  title: "课后 3 件事，把今晚收尾",
  intro: "看 / 安排 / 提醒，做完这 3 件，今晚陪伴就到位。",
  items: [
    {
      id: "pa-report",
      title: "看课后报告",
      meta: "孩子本节进步 3 名 ↑；建议先看亮点 + 薄弱点",
      primaryLabel: "📝 看课后报告",
      primaryPrompt: "课后报告",
      primarySkillId: "pa-report",
      promptKeywords: ["课后报告", "看报告"],
    },
    {
      id: "pa-support",
      title: "安排今晚陪练（10 分钟）",
      meta: "矢量方向 1 道讲解 + 1 道练习",
      primaryLabel: "✅ 安排今晚陪练",
      primaryPrompt: "安排今晚陪练",
      primarySkillId: "pa-support",
      promptKeywords: ["安排今晚陪练", "安排补强", "补强", "陪练"],
    },
    {
      id: "pa-advice",
      title: "今晚怎么陪孩子",
      meta: "AI 给一份「今晚怎么陪孩子」建议（约 5 分钟读）",
      primaryLabel: "🏠 今晚怎么陪孩子",
      primaryPrompt: "今晚怎么陪孩子",
      primarySkillId: "pa-advice",
      promptKeywords: ["今晚怎么陪孩子", "今晚家庭建议", "家庭建议", "怎么陪孩子"],
    },
  ],
  completion: {
    headline: "🎉 今晚陪伴到位 ✓",
    body: [
      "报告已看 + 10 分钟陪练已排 + 怎么陪孩子已收。",
      "明早 7:30 我会提醒孩子回顾 5 分钟；您不用操心。",
    ],
    nextActions: [
      { label: "📅 看本周课表，提前知道下节课", prompt: "本周课表", tone: "primary" },
      { label: "✉️ 把进步同步给妈妈", prompt: "把进步同步给妈妈" },
      { label: "✅ 今晚就到这了", prompt: "今晚就到这了" },
    ],
  },
}

/** ============= 矩阵导出 ============= */
const CHECKLISTS: ChecklistMatrix = {
  teacher: { pre: TEACHER_PRE, in: null, post: TEACHER_POST },
  student: { pre: STUDENT_PRE, in: null, post: STUDENT_POST },
  parent: { pre: PARENT_PRE, in: null, post: PARENT_POST },
}

/** ============= 公开 API ============= */

/** 取该 role × stage 的清单（找不到返回 null，由调用方决定是否跳过） */
export function getAiClassroomChecklist(
  role: EduLessonAttendingRole,
  stage: EducationStage,
): AiClassroomChecklist | null {
  return CHECKLISTS[role]?.[stage] ?? null
}

/**
 * 反查：给定一次执行的 (skillId? prompt) 在该清单里命中了哪一项？
 * - 优先 skillId 精确等
 * - 否则按 promptKeywords 子串匹配（去除空白后包含即命中）
 * - 最后按 primaryPrompt 精确等兜底
 *
 * 返回命中的 item id；找不到返回 null。
 */
export function findChecklistItemByExecution(
  checklist: AiClassroomChecklist,
  execution: { skillId?: string; prompt?: string },
): AiClassroomChecklistItem | null {
  if (execution.skillId) {
    const bySkill = checklist.items.find((it) => it.primarySkillId === execution.skillId)
    if (bySkill) return bySkill
  }
  const text = (execution.prompt ?? "").replace(/\s+/g, "")
  if (!text) return null
  for (const item of checklist.items) {
    if (item.primaryPrompt.replace(/\s+/g, "") === text) return item
    const kws = item.promptKeywords ?? []
    if (kws.some((k) => text.includes(k.replace(/\s+/g, "")))) return item
  }
  return null
}

/** marker：放进 Message.content，由 panel 的 MessageBubble 解析渲染 */
export const AIC_CHECKLIST_CARD_MARKER = "<<<RENDER_AIC_CHECKLIST>>>"
export const AIC_CHECKLIST_DONE_MARKER = "<<<RENDER_AIC_CHECKLIST_DONE>>>"
export const AIC_CHECKLIST_TICK_MARKER = "<<<AIC_CHECKLIST_TICK>>>"

/**
 * 序列化清单卡 marker：`<<<RENDER_AIC_CHECKLIST>>>:<role>:<stage>`
 * 渲染时根据 panel 实时 doneIds 决定 ✓ 状态。
 */
export function buildChecklistCardContent(role: EduLessonAttendingRole, stage: EducationStage): string {
  return `${AIC_CHECKLIST_CARD_MARKER}:${role}:${stage}`
}

/** 同上：庆祝卡 */
export function buildChecklistDoneContent(role: EduLessonAttendingRole, stage: EducationStage): string {
  return `${AIC_CHECKLIST_DONE_MARKER}:${role}:${stage}`
}

/** 单项打勾微型气泡：`<<<AIC_CHECKLIST_TICK>>>:<title>` */
export function buildChecklistTickContent(itemTitle: string): string {
  return `${AIC_CHECKLIST_TICK_MARKER}:${itemTitle}`
}

/** 解析三种 marker，返回简单的 (kind + payload) */
export type ParsedChecklistMarker =
  | { kind: "card"; role: EduLessonAttendingRole; stage: EducationStage }
  | { kind: "done"; role: EduLessonAttendingRole; stage: EducationStage }
  | { kind: "tick"; title: string }
  | null

export function parseChecklistMarker(content: string): ParsedChecklistMarker {
  if (typeof content !== "string") return null
  if (content.startsWith(`${AIC_CHECKLIST_CARD_MARKER}:`)) {
    const [role, stage] = content.slice(`${AIC_CHECKLIST_CARD_MARKER}:`.length).split(":") as [
      EduLessonAttendingRole,
      EducationStage,
    ]
    if (!role || !stage) return null
    return { kind: "card", role, stage }
  }
  if (content.startsWith(`${AIC_CHECKLIST_DONE_MARKER}:`)) {
    const [role, stage] = content.slice(`${AIC_CHECKLIST_DONE_MARKER}:`.length).split(":") as [
      EduLessonAttendingRole,
      EducationStage,
    ]
    if (!role || !stage) return null
    return { kind: "done", role, stage }
  }
  if (content.startsWith(`${AIC_CHECKLIST_TICK_MARKER}:`)) {
    const title = content.slice(`${AIC_CHECKLIST_TICK_MARKER}:`.length)
    return { kind: "tick", title }
  }
  return null
}
