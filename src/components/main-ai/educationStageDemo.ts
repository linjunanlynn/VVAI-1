import type { EduSceneRole } from "./homeScenarioLayout"

export type EducationStage = "pre" | "in" | "post"

export const EDUCATION_STAGE_OPTIONS: { id: EducationStage; label: string; shortLabel: string }[] = [
  { id: "pre", label: "课前", shortLabel: "课前" },
  { id: "in", label: "课中", shortLabel: "课中" },
  { id: "post", label: "课后", shortLabel: "课后" },
]

const DEFAULT_STAGE: EducationStage = "pre"

function storageKeyForScenario(scenario: string | undefined): string {
  return `cui-demo-edu-stage-${scenario ?? "default"}`
}

function isEducationStage(value: unknown): value is EducationStage {
  return value === "pre" || value === "in" || value === "post"
}

export function loadDemoEducationStage(scenario: string | undefined): EducationStage {
  if (typeof window === "undefined") return DEFAULT_STAGE
  try {
    const raw = window.sessionStorage.getItem(storageKeyForScenario(scenario))
    return isEducationStage(raw) ? raw : DEFAULT_STAGE
  } catch {
    return DEFAULT_STAGE
  }
}

export function saveDemoEducationStage(
  scenario: string | undefined,
  stage: EducationStage
): void {
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.setItem(storageKeyForScenario(scenario), stage)
  } catch {
    // ignore quota / private mode
  }
}

export interface EducationStageDemoCopy {
  title: string
  greeting: string
  brief: string
  prompts: string[]
}

/**
 * 教育三身份场景的"门户欢迎位"占位 marker。
 *
 * 解决的问题：
 * - 进入教育门户时，框架会在 conversation.messages 里塞一条静态欢迎语
 *   "你好，我是「教育」智能助手..."，与场景化 AI 主动开场（greeting + brief）重复。
 * - 静态欢迎语只在 conversation 创建时计算一次，stage 切换时不会重新生成，
 *   导致演示态切到课中/课后看不到对应的开场文案。
 *
 * 设计：
 * - 三身份场景下用此 marker 占位（保持 conversation.messages 非空，下游逻辑不破）
 * - MainAIChatWindow 渲染时把含 marker 的消息过滤掉，让 empty-state 接管 AI 主动开场，
 *   greeting / brief / Hero 都依据当前 educationStage 实时计算。
 */
export const EDU_ROLE_DYNAMIC_OPENING_MARKER = "<<<EDU_ROLE_OPENING>>>"

/**
 * 9 格状态化 / 身份化开场矩阵（对齐 demo 课《力的合成与分解》）。
 *
 * ⚠️ 历史用途：原本作为场景 6/7/8/9 教育门户**主开场**的 greeting / brief / prompts，
 * 后由于"具象到课次的指令与顶部《全局待办带》职责重叠、且对首次/无课用户不友好"，
 * 主开场已切换至「极简版 H2」（见 `educationFirstEntryCopy.ts` + `AdminTodaySnapshotCard.tsx`，
 * 决策 A3 + B3 + C1 + D2 + E1 + H2 + I1）：三身份只有 ChatWelcome + brief + 4 chip，
 * 无任何能力展示卡；admin 在 chip 下方追加今日 4 数字格预览（带"演示数据"水印）。
 *
 * 当前 STAGE_COPY 仅保留为：
 * 1. **dock 子 CUI / aiClassroomLessonDemo 等已具体到一节课时**的 status-driven 文案兜底
 * 2. 后续若引入"看具体待办"轨 B 入口时的内容源
 *
 * 不要在主门户首屏（`MainAIChatWindow` 的教育三身份分支）再次使用本矩阵。
 *
 * - greeting：身份招呼 + 当下情境主张（一句话）
 * - brief：可选的"为什么这么做"或"做完之后怎样"补充说明
 * - prompts：兜底快捷指令
 */
const STAGE_COPY: Record<EduSceneRole, Record<EducationStage, EducationStageDemoCopy>> = {
  teacher: {
    pre: {
      title: "教师 · 课前",
      greeting: "王老师，建议先把今晚物理课的矢量方向判断 2 道题最后过一遍，5 分钟搞定。",
      brief: "做完后我会自动生成分层预习推送给学生，不必再操心。",
      prompts: ["5 分钟搞定备课审定", "查看本节学情", "把预习推给学生", "课前就位检查"],
    },
    in: {
      title: "教师 · 课中",
      greeting: "第 7 题正确率 62%，建议把节奏放慢 2 分钟，再来一次方向判断。",
      brief: "课堂助手已就位，可以直接出随堂题 / 分组讨论 / 私聊学员；非课堂功能已折叠避免打扰。",
      prompts: ["出一道随堂题", "8 分钟分组讨论", "私聊学员", "板书拍照转文字"],
    },
    post: {
      title: "教师 · 课后",
      greeting: "8 份报告草稿待审，建议先看李小明（亮点）和陈可（风险）这 2 份。",
      brief: "高频错题 3 处已自动聚类，可一键生成变式题；审完后一键发家长。",
      prompts: ["先看李小明的报告", "一键发送给家长", "生成下节课变式题", "和上节比一比进步"],
    },
  },
  student: {
    pre: {
      title: "学生 · 课前",
      greeting: "小明同学，预习差矢量方向判断 2 道题，5 分钟做完就稳了。",
      brief: "做完上课会更轻松；想速览今天要讲的知识点也可以。",
      prompts: ["5 分钟做完预习", "知识点速览", "上课提醒", "今日学习卡片"],
    },
    in: {
      title: "学生 · 课中",
      greeting: "上课中 · 第 3 题轮到你了，准备一下。",
      brief: "想问的就点「我要提问」，再选私聊老师或举手发言；走神先举手抢答找回节奏。",
      prompts: ["举手/抢答", "我要提问", "紧急请假"],
    },
    post: {
      title: "学生 · 课后",
      greeting: "今晚先重做 3 道错题，再做作业会更顺手，整体大约 30 分钟。",
      brief: "都是矢量方向类——巩固完今晚的难度，下节课会舒服很多。",
      prompts: ["重做 1 道错题", "我的作业", "看我本节得分", "问提问帮手"],
    },
  },
  parent: {
    pre: {
      title: "家长 · 课前",
      greeting: "李爸爸，课前 3 件小事（量角器 / 灯光 / 桌面）约 5 分钟，您不必陪学。",
      brief: "做完后您可以自己忙；孩子上课时我只在状态有变化时提醒您。",
      prompts: ["看课前 3 件小事", "本节课预告", "孩子预习进度", "本周课表"],
    },
    in: {
      title: "家长 · 课中",
      greeting: "孩子专注度 86%，您可以放心忙别的。",
      brief: "可以看一眼 30 秒直播；如有突发，可代请假，会同步老师 + 班主任。",
      prompts: ["看一眼直播 30 秒", "状态有变化提醒我", "代孩子请假"],
    },
    post: {
      title: "家长 · 课后",
      greeting: "今晚陪孩子：重做 3 道错题 + 口头复述 1 次，约 15 分钟，睡前完成即可。",
      brief: "孩子本节进步明显（位次 +3 ↑），可以先表扬一句再开始练习。",
      prompts: ["查看课后报告", "今晚怎么陪孩子", "和王老师私聊", "安排今晚陪练"],
    },
  },
  /**
   * 机构管理者（场景九）—— 不上课，stage 字段在此处语义重定义：
   *   pre  = 早间（开课前）：备课盘查、物资就位、师资到位
   *   in   = 课时高峰（白天）：实时态势、异常处理、设备故障
   *   post = 晚间（高峰过后）：报告抽审、续费跟进、师资风险
   * 这与教师/学生/家长的"课前/课中/课后"维度同构（演示态可用同一个 EducationStageSwitcher 切），
   * 但内容指向"整个校区/机构"而非"一节课"。
   */
  admin: {
    pre: {
      title: "管理者 · 早上盘查",
      greeting: "校长好，今日全校 12 节课待开，备课完成率 75%，3 间教室物资还没准备好。",
      brief: "先看「教学 → 排课与课表管理」，再看「管理 → 成员管理」，今天的人课场地会更稳。",
      prompts: ["处理排课冲突", "新增成员", "看课程商品状态", "看教室与资源"],
    },
    in: {
      title: "管理者 · 实时情况",
      greeting: "现在全校 5 节课在课、2 件异常待处理（教室 303 设备故障、紧急请假 1 起）。",
      brief: "异常事件实时推送到您的待办；优先看红色徽标的两条。",
      prompts: ["派单维修设备", "查看低分课堂", "查看待支付订单", "随机听 1 节"],
    },
    post: {
      title: "管理者 · 晚间复盘",
      greeting: "今日完结 12 节、异常已处理完，本周续费节点临近 18 人，建议先抓 3 位风险学员。",
      brief: "先做「经营 → 续费与流失」复盘，再回看「教学 → 教学质量」低分课。",
      prompts: ["跟进高风险名单", "导出续费漏斗", "导出教学质量周报", "处理转班申请"],
    },
  },
}

export function getEducationStageDemoCopy(
  role: EduSceneRole,
  stage: EducationStage
): EducationStageDemoCopy {
  return STAGE_COPY[role][stage]
}

export function educationStageLabel(stage: EducationStage): string {
  return EDUCATION_STAGE_OPTIONS.find((s) => s.id === stage)?.label ?? "课前"
}
