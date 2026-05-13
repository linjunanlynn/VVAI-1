/**
 * 教育门户主开场 4 chip 的「点击意图」分类与对应回复元数据。
 *
 * ## 设计动机
 *
 * 主开场 4 chip（见 `educationFirstEntryCopy.ts`）原先一律走 `handleEduRoleSkillCommand` →
 * 直接打开 `DEMO_LESSON.id` 的子 CUI，问题：
 * 1. **课程粒度操作（如"帮我备节课"）** 应该先让用户选哪节课，而不是默认跳到主线物理课
 * 2. **非课程操作（如"学伴怎么用"）** 应该直接在主对话里给出说明，根本不该开侧 CUI
 *
 * 本模块按 role × prompt 给出每个 chip 的两类意图：
 * - `"course-pick"`：先在主对话内 push 一张选课卡（`EduLessonPickerCard`）；
 *   用户选定具体课程后，才会调用 `handleEduRoleSkillCommand(intentPrompt, { lessonId, ... })` 打开该课子 CUI
 * - `"direct"`：在主对话直接 push 用户气泡 + 一条 `AiClassroomReply` 结构化回复
 *   （含说明文字 + 1–4 个 chip 行动），不开侧 CUI、不污染课程会话线
 *
 * ## 后续维护
 *
 * 新增 chip 时务必同步在 `STUDENT_INTENTS` / `TEACHER_INTENTS` / `PARENT_INTENTS` / `ADMIN_INTENTS` 里登记；
 * 缺省时 fallback 到 `direct + 通用引导回复`，但这只是兜底，不应作为常态。
 */

import type { EduSceneRole } from "./homeScenarioLayout"
import type { AiClassroomReply } from "./aiClassroomReply"
import { canonicalizeEduFirstEntryCommand } from "./educationFirstEntryCopy"

export type EduMainChipKind = "course-pick" | "direct"

export interface EduMainChipMeta {
  kind: EduMainChipKind
  /**
   * `course-pick` 专用：用户选课后，要替换成的 prompt 文本（**不一定**等于 chip 自身文案）。
   * 这里要选能被 `resolveRecommendedPromptReply` 关键词命中或被 `aiClassroomSkillTree` Skill 名命中的字串，
   * 才能让选课后子 CUI 内首条 AI 回复直接是结构化业务卡 / 闭环文字，而不是兜底。
   */
  pickIntentPrompt?: string
  /**
   * `course-pick` 专用：picker 卡上方提示语（让用户立刻知道"在选哪件事的对应课"）。
   * 如缺省，会用 `chip 文案`兜底显示。
   */
  pickIntentLabel?: string
  /** `direct` 专用：直接展示的结构化回复 */
  directReply?: AiClassroomReply
}

/* ============================================================
 * Student（场景七）
 * ============================================================ */

const STUDENT_INTENTS: Record<string, EduMainChipMeta> = {
  /** 课程粒度：要先让学生选具体哪节课的重点 */
  "过一遍本节重点": {
    kind: "course-pick",
    pickIntentPrompt: "知识点速览",
    pickIntentLabel: "想过哪节课的重点？",
  },
  /** 课程粒度：错题重做目前是「单课错题」演示语义（sa-mistakes Skill） */
  "重做错题": {
    kind: "course-pick",
    pickIntentPrompt: "去重做错题",
    pickIntentLabel: "想重做哪节课的错题？",
  },
  /** 课程粒度（in 段）：提问要落到具体课，进入子 CUI 后再让学生选「私聊老师 / 全班发言」 */
  "提问": {
    kind: "course-pick",
    pickIntentPrompt: "我要提问",
    pickIntentLabel: "想在哪节课提问？",
  },
  /** 课程粒度（in 段）：举手抢答必须知道哪节课才有题号 */
  "举手抢答": {
    kind: "course-pick",
    pickIntentPrompt: "举手抢答",
    pickIntentLabel: "想在哪节课举手抢答？",
  },
  /** 课程粒度（post 段）：转老师答疑要落到具体课的具体题 */
  "请老师看一下": {
    kind: "course-pick",
    pickIntentPrompt: "让我老师看一下",
    pickIntentLabel: "想让老师看哪节课的题？",
  },
  /** 课中 · 🟢 线下：教室内提问（进入子 CUI 后再让学生选 Pad 私聊或举手） */
  "教室内提问": {
    kind: "course-pick",
    pickIntentPrompt: "我要提问",
    pickIntentLabel: "想在哪节课提问？",
  },
  "等无线麦": {
    kind: "course-pick",
    pickIntentPrompt: "等无线麦到位时叫我",
    pickIntentLabel: "想在哪节课等无线麦？",
  },
  "王老师讲到哪段": {
    kind: "course-pick",
    pickIntentPrompt: "王老师当前讲到哪段",
    pickIntentLabel: "想看哪节课的当前进度？",
  },
  /** 直接回复：提问帮手是跨课通用功能，不需要选课 */
  "提问帮手怎么用": {
    kind: "direct",
    directReply: {
      headline: "提问帮手是你的「思路引导专属 AI」，会用提问帮你想清楚，不直接给答案。",
      body: [
        "适用：作业卡住、上课没听懂、想多做几道但没人讲。",
        "三件事不会做：① 直接给答案；② 评价你「这都不会」；③ 把你问过的题转给老师（除非你说要）。",
      ],
      systemNote: "（demo：从主线物理课进入「问提问帮手」是同一套；点下方 chip 直接体验）",
      nextActions: [
        { label: "现在试一下", prompt: "陪我做第 7 题", tone: "primary" },
        { label: "看一遍解题动画", prompt: "讲一遍方向判断的思路" },
        { label: "看我本节得分", prompt: "我的报告" },
      ],
    },
  },
  /** 直接回复：进步报告这里默认给跨课汇总（demo 里就一节物理课，文案保留可扩展） */
  "进步报告": {
    kind: "direct",
    directReply: {
      headline: "本周进步报告（小明）：班级排名 8 → 5，前进 3 名。",
      body: [
        "亮点：物理课中抢答 +2 分；连续 3 天作业准时；矢量方向判断正确率 50% → 75%。",
        "薄弱：三力平衡条件掌握 71%，建议本周再做 2 道。",
      ],
      nextActions: [
        { label: "重做错题巩固", prompt: "去重做错题", tone: "primary" },
        { label: "把亮点发给爸爸", prompt: "把今天的亮点告诉爸爸" },
        { label: "看本节物理课报告", prompt: "我的报告" },
      ],
    },
  },
}

/* ============================================================
 * Teacher（场景六）
 * ============================================================ */

const TEACHER_INTENTS: Record<string, EduMainChipMeta> = {
  "备课审定": {
    kind: "course-pick",
    pickIntentPrompt: "开始备课",
    pickIntentLabel: "想备哪节课？",
  },
  "课后报告": {
    kind: "course-pick",
    pickIntentPrompt: "审核课后报告",
    pickIntentLabel: "想看哪节课的课后报告？",
  },
  /** 课前：学情画像必须落到具体课才能给"本节"分布 */
  "本节学情": {
    kind: "course-pick",
    pickIntentPrompt: "查看本节学情",
    pickIntentLabel: "想看哪节课的学情画像？",
  },
  /** 课前：分层预习包必须知道是哪节课的内容 */
  "推送预习包": {
    kind: "course-pick",
    pickIntentPrompt: "推送预习包给学生",
    pickIntentLabel: "想给哪节课推预习？",
  },
  /** 课前：就位检查只对"将开课的那一节"有意义 */
  "课前就位检查": {
    kind: "course-pick",
    pickIntentPrompt: "课前就位检查",
    pickIntentLabel: "想给哪节课做就位检查？",
  },
  /** 课中：随堂题 / 节奏 / 私聊都要绑到正在上的那节课 */
  /** 课程粒度（in 段）：所有"出随堂题"入口都用这一份 meta，保证名称统一 */
  "出一道随堂题": {
    kind: "course-pick",
    pickIntentPrompt: "出一道随堂题",
    pickIntentLabel: "想在哪节课出随堂题？",
  },
  "节奏建议": {
    kind: "course-pick",
    pickIntentPrompt: "调整节奏",
    pickIntentLabel: "想看哪节课的节奏建议？",
  },
  "私聊学员": {
    kind: "course-pick",
    pickIntentPrompt: "私聊一个学员",
    pickIntentLabel: "想在哪节课私聊学员？",
  },
  /** 课中 · 线上：与侧 CUI「在线教室」入口同语义（选课后打开互动课堂） */
  "打开在线教室": {
    kind: "course-pick",
    pickIntentPrompt: "进入AI互动课堂",
    pickIntentLabel: "想在哪节课打开在线教室？",
  },
  /** 与侧 CUI 应用条「签到」老师文案一致，选课后进子 CUI 出签到卡 */
  "签到点名": {
    kind: "course-pick",
    pickIntentPrompt: "看本周签到明细",
    pickIntentLabel: "想给哪节课做签到点名？",
  },
  /** 与侧 CUI「资料」老师入口一致 */
  "本节资料": {
    kind: "course-pick",
    pickIntentPrompt: "看本节课资料",
    pickIntentLabel: "想打开哪节课的资料？",
  },
  /** 课中 · 🟢 线下：教室 IoT 主导能力，全部 course-pick 进对应课子 CUI */
  "进入教室助手": {
    kind: "course-pick",
    pickIntentPrompt: "进入本节 AI 课堂",
    pickIntentLabel: "想进哪节课的教室助手？",
  },
  "看智能黑板识别": {
    kind: "course-pick",
    pickIntentPrompt: "把板书 #2 一键发给 C 组三人巩固",
    pickIntentLabel: "想看哪节课的智能黑板识别？",
  },
  "镜头追发言者": {
    kind: "course-pick",
    pickIntentPrompt: "摄像头追踪发言者",
    pickIntentLabel: "想看哪节课的镜头追踪？",
  },
  "物理学具记录站": {
    kind: "course-pick",
    pickIntentPrompt: "调出物理学具记录站",
    pickIntentLabel: "想看哪节课的学具记录站？",
  },
  /** 课后：进步对比 / 变式题包都要绑到刚上完的那节课 */
  "与上节进步对比": {
    kind: "course-pick",
    pickIntentPrompt: "和上节比一比进步",
    pickIntentLabel: "想看哪节课的进步对比？",
  },
  "生成下节变式题": {
    kind: "course-pick",
    pickIntentPrompt: "生成下节课变式题包",
    pickIntentLabel: "想给哪节课生成变式题？",
  },
  "群发家长通知": {
    kind: "direct",
    directReply: {
      headline: "给家长群发通知 = 一键把本节课报告 / 进步榜 / 错题点 推给 32 位家长，30 秒搞定。",
      body: [
        "AI 会自动把每个孩子的报告做「分钟级个性化」——同一份模板，32 个版本不同（亮点 / 提醒 / 鼓励文案因人而异）。",
        "家长端 IM 收到后可一键回复确认，30 分钟内回执率通常 >90%。",
      ],
      systemNote: "（demo：进入主线物理课 · 课后阶段，点「一键群发家长」即可看到完整 IM 联动效果）",
      nextActions: [
        { label: "现在就群发本节家长", prompt: "一键发送给家长", tone: "primary" },
        { label: "先审核 8 份报告草稿", prompt: "审核课后报告" },
        { label: "看本节进步对比", prompt: "和上节比一比进步" },
      ],
    },
  },
}

/* ============================================================
 * Parent（场景八）
 * ============================================================ */

const PARENT_INTENTS: Record<string, EduMainChipMeta> = {
  "课前 3 件小事": {
    kind: "course-pick",
    pickIntentPrompt: "课前注意事项",
    pickIntentLabel: "想看哪节课的课前注意事项？",
  },
  "今晚怎么陪孩子": {
    kind: "course-pick",
    pickIntentPrompt: "今晚怎么陪孩子",
    pickIntentLabel: "想看哪节课的「今晚怎么陪孩子」？",
  },
  /** 课前：预习进度按"今晚 / 周内某节"挑课更直觉 */
  "孩子预习进度": {
    kind: "course-pick",
    pickIntentPrompt: "查看孩子预习进度",
    pickIntentLabel: "想看哪节课的预习进度？",
  },
  /** 课中：30 秒直播额度只对正在上课的那一节有意义 */
  "看 30 秒直播": {
    kind: "course-pick",
    pickIntentPrompt: "看一眼直播 30 秒",
    pickIntentLabel: "想看哪节课的直播一眼？",
  },
  /** 课中：状态有变化提醒——按"哪节课在上"启用 */
  "有变化时提醒": {
    kind: "course-pick",
    pickIntentPrompt: "孩子状态有变化提醒我",
    pickIntentLabel: "想给哪节课开「状态变化提醒」？",
  },
  /** 课后：报告必须绑到具体一节 */
  "课后报告": {
    kind: "course-pick",
    pickIntentPrompt: "课后报告",
    pickIntentLabel: "想看哪节课的课后报告？",
  },
  /** 课后：把亮点告诉妈妈 = 单节课的亮点摘要 */
  "把亮点告诉妈妈": {
    kind: "course-pick",
    pickIntentPrompt: "把孩子的亮点告诉妈妈",
    pickIntentLabel: "想把哪节课的亮点告诉妈妈？",
  },
  /** 课中 · 🟢 线下：接送闭环 / 教室摄像头巡检 / 晚到 */
  "看接送时间线": {
    kind: "course-pick",
    pickIntentPrompt: "看接送闭环时间线",
    pickIntentLabel: "想看哪节课的接送时间线？",
  },
  "看教室摄像头": {
    kind: "course-pick",
    pickIntentPrompt: "看一眼教室摄像头巡检",
    pickIntentLabel: "想看哪节课的教室摄像头？",
  },
  "晚 10 分钟接": {
    kind: "course-pick",
    pickIntentPrompt: "晚到 10 分钟接，可以吗？",
    pickIntentLabel: "想给哪节课晚 10 分钟接？",
  },
  "上课怎么看孩子": {
    kind: "direct",
    directReply: {
      headline: "上课时看孩子 = 您最省事的「在场感」。系统给两种方式，二选一即可。",
      body: [
        "方式 A · 状态摘要：每 10 分钟一条「专注度 / 互动 / 网络」，被动接收，不打扰孩子。",
        "方式 B · 30 秒直播：今天还能看 1 次。只能看，不能录、不能分享，孩子也不会发现。",
      ],
      systemNote: "（demo：进入主线物理课 · 课中阶段，可同时启用两条通道）",
      nextActions: [
        { label: "看孩子当前状态", prompt: "上课中状态", tone: "primary" },
        { label: "用一次 30 秒直播", prompt: "看一眼直播 30 秒" },
        { label: "开启状态变化提醒", prompt: "孩子状态有变化提醒我" },
      ],
    },
  },
  "联系王老师": {
    kind: "direct",
    directReply: {
      headline: "和老师沟通走 IM 私聊，AI 会帮你把孩子学情自动附在草稿里，不用你重新组织语言。",
      body: [
        "适用：课后追问 / 申请陪练 / 申请下次接送时间 / 反馈建议。",
        "节奏建议：晚上 21:00 后是老师备课时段，建议非急事尽量不打扰。AI 会自动判断「是否紧急」。",
      ],
      nextActions: [
        { label: "和王老师私聊", prompt: "和王老师私聊", tone: "primary" },
        { label: "把诊断转给王老师确认", prompt: "把诊断转给王老师确认" },
        { label: "申请下次接送时间", prompt: "申请下次家长接送时间" },
      ],
    },
  },
}

/* ============================================================
 * Admin（场景九）—— 全部 direct，校长视角不需要选课
 * ============================================================ */

const ADMIN_INTENTS: Record<string, EduMainChipMeta> = {
  "今日校区总览": {
    kind: "direct",
    directReply: {
      headline: "今天校区情况（实时）：32 间教室、188 人在线；签到率 96%、互动率 84%、可能不续费 2 户。",
      body: [
        "亮点：高一(2)班连续 3 节课互动率 ≥ 90%；新签到环节比上周快 12 秒。",
        "风险：高三(1)班王老师本周第 2 次延课 8 分钟；2 户低续费意向已 7 天未联系。",
      ],
      nextActions: [
        { label: "随机听一节课", prompt: "随机听一节课", tone: "primary" },
        { label: "续费风险名单", prompt: "续费风险名单" },
        { label: "教师能力总览", prompt: "教师能力总览" },
      ],
    },
  },
  "随机听一节课": {
    kind: "direct",
    directReply: {
      headline: "已为你筛出 3 节「现在最值得听」的课，按风险 / 亮点排序。",
      body: [
        "① 19:00 高一(2)班 · 物理 · 王老师（亮点：互动率 91%）",
        "② 19:30 高二(3)班 · 数学 · 陈老师（风险：节奏快 12%、应答率 60%）",
        "③ 20:00 高三(1)班 · 英语 · 李老师（中性：稳态运行）",
      ],
      nextActions: [
        { label: "进①号教室（亮点）", prompt: "进教室旁听 高一2 物理", tone: "primary" },
        { label: "进②号教室（风险）", prompt: "进教室旁听 高二3 数学" },
        { label: "导出本周听课记录", prompt: "导出本周听课报表" },
      ],
    },
  },
  "续费风险名单": {
    kind: "direct",
    directReply: {
      headline: "本周可能不续费 5 户，2 户高危（连续 7 天未联系 + 本周缺 2 节）。",
      body: [
        "高危 ① 李小明 家长（已缴 12 节余 4 节，本周缺 2 节，未读家长群消息 5 天）",
        "高危 ② 张蕊 家长（48 节包到期前 21 天，仍无续费意向，建议 1v1 沟通）",
      ],
      nextActions: [
        { label: "派单给班主任跟进", prompt: "派单跟进 5 户续费风险", tone: "primary" },
        { label: "准备续费优惠物料", prompt: "生成续费优惠包 3 套" },
        { label: "看续费历史曲线", prompt: "查看本季度续费曲线" },
      ],
    },
  },
  "教师能力总览": {
    kind: "direct",
    directReply: {
      headline: "本月老师能力雷达图：12 名教师，3 项亮点 / 2 项待提升。",
      body: [
        "亮点：王老师（互动设计 +12%）、陈老师（学情诊断 +8%）、刘老师（课堂节奏 +6%）。",
        "待提升：① 跨学科协作（团队均分 65）；② 双语切换（团队均分 62）。",
      ],
      nextActions: [
        { label: "安排一次团建培训", prompt: "排一次跨学科教师培训", tone: "primary" },
        { label: "把亮点教师推到家长群", prompt: "把本月亮点教师推到家长群" },
        { label: "导出本月能力快照", prompt: "导出本月教师能力 PDF" },
      ],
    },
  },
}

const INTENTS_BY_ROLE: Record<EduSceneRole, Record<string, EduMainChipMeta>> = {
  student: STUDENT_INTENTS,
  teacher: TEACHER_INTENTS,
  parent: PARENT_INTENTS,
  admin: ADMIN_INTENTS,
}

/**
 * 主开场 chip 元数据查询。未登记的 prompt 走"course-pick + 自身文案"兜底——
 * 让用户至少先选课，而不是直接跳主线（仍比写死 DEMO_LESSON.id 强）。
 */
export function getEduMainChipMeta(role: EduSceneRole, prompt: string): EduMainChipMeta {
  const normalizedPrompt = canonicalizeEduFirstEntryCommand(prompt)
  const direct = INTENTS_BY_ROLE[role]?.[normalizedPrompt]
  if (direct) return direct
  return {
    kind: "course-pick",
    pickIntentPrompt: normalizedPrompt,
    pickIntentLabel: `想对哪节课「${normalizedPrompt}」？`,
  }
}
