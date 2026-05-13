/**
 * 场景 6/7/8/9 教育门户主开场文案矩阵（v6 · 状态 × 形态 双感知 + chip 闭环路由）。
 *
 * 演化过程（保留以避免再次走弯路）：
 * - v1：4 张能力卡（icon + 类目 + valueLine + → sample）+ 4 chip 双层  ← 用户指出"卡 vs chip"双层冗余、视觉信号冲突
 * - v2：去掉能力卡，仅保留 ChatWelcome + brief（4 类事顿号陈列 + 行动召唤）+ 4 chip
 * - v3：再删 brief —— 4 类名词陈列与下方 chip 一一对应、信号冗余
 * - v4：每个 chip 加 skillId / kind 路由，闭环到具体业务卡
 * - v5：按 `educationStage`（课前 / 课中 / 课后）派发 chip 行
 * - v6（当前）：在 v5 基础上，**课中** 这一阶段再按 `LessonDeliveryMode`（🔵 线上 / 🟢 线下）
 *   派发不同 chip 集——线下课中是教室 IoT 主导（IFP 板书 / 摄像头追踪 / 物理学具 / 接送闭环），
 *   与线上视频会议主导（虚拟教室 / 直播视图 / 受限 30 秒一眼直播）有完全不同的"现在能做什么"
 *
 * ## 状态 × 形态感知（v6）
 *
 * 同一身份在不同时段 / 不同课程形态进来，能立刻看到的"AI 能为我做什么"是不同的：
 *
 * - **课前**（线上线下共用）：备课 / 推预习 / 课前检查 / 学情画像（教师）
 * - **课中 · 🔵 线上**：打开在线教室 / 出随堂题 / 签到点名 / 本节资料（教师，与侧 CUI 能力对齐）
 * - **课中 · 🟢 线下**：进教室助手 / 看 IFP 板书 / 摄像头追踪发言者 / 物理学具记录站（教师）
 * - **课后**（线上线下共用）：审课后报告 / 群发家长 / 进步对比 / 生成变式题（教师）
 *
 * 学生 / 家长 / 校长同理。**校长视角不强绑课程节次，本轮线上 / 线下共用同一组 chip**
 * （后续若机构落地"线下专属续费风险口径"等，可在 ADMIN_COPY 单独加 inOfflinePrompts 字段）。
 *
 * ## 闭环规则
 *
 * 每个新增 chip 都必须在 `educationMainChipMeta.ts` 里登记 `(role, prompt)` 元数据：
 * - `kind: "course-pick"`：先 push `EduLessonPickerCard` 让用户选课，再投递 `pickIntentPrompt` 到该课子 CUI
 * - `kind: "direct"`：直接 push `AiClassroomReply` 结构化回复（含说明 + chip 行）
 *
 * 校长 chip 通过 `EduSamplePrompt.adminCardId` 直接 push admin 业务卡 marker（不进侧 CUI）。
 *
 * 防回归：**不要再加回 brief 字段**；如果以后真要加"产品态度型"过渡段，请新增其他字段名。
 */
import type { EducationStage } from "./educationStageDemo"
import type { EduSceneRole } from "./homeScenarioLayout"
import type { LessonDeliveryMode } from "./lessonDeliveryMode"

/**
 * chip 闭环路由配置：
 * - `command` 是 chip 显示文本，也是用户气泡显示文本
 * - `skillId`：AI 课堂 Skill Registry 中的 id（仅 teacher/student/parent 用，**目前为元数据**，
 *   实际 chip 点击走 `educationMainChipMeta` 决定 course-pick / direct）
 * - `adminCardId`：admin 专属业务卡 id（命中时由 `handleEduFirstEntryChip` 拦截 push admin 业务卡）
 */
export interface EduSamplePrompt {
  command: string
  skillId?: string
  adminCardId?: string
}

/** 单一 stage 的 4 个 chip */
export type EduFirstEntryStagePrompts = readonly [
  EduSamplePrompt,
  EduSamplePrompt,
  EduSamplePrompt,
  EduSamplePrompt,
]

export interface EduFirstEntryCopy {
  /** ChatWelcome 主气泡：身份化招呼（与 stage 无关；stage 信息由顶栏 stage switcher / hero 卡承担） */
  greeting: string
  /** 当前 stage 下的 4 chip（由 `getEduFirstEntryCopy(role, stage)` 选定） */
  samplePrompts: EduFirstEntryStagePrompts
}

interface EduFirstEntryCopySource {
  greeting: string
  /**
   * 三阶段（pre / in / post）默认 chip 集合。
   * `in` 段默认对应 🔵 线上课；线下课用 `samplePromptsInOffline` 覆盖（仅 in 段需要二态分支）。
   */
  samplePromptsByStage: Record<EducationStage, EduFirstEntryStagePrompts>
  /**
   * 课中 · 🟢 线下专属 chip（教室 IoT 主导）。
   * 仅当 `stage === "in" && deliveryMode === "offline"` 时替换 `samplePromptsByStage.in`；
   * 不提供时退回 in 段默认（线上）chip——校长目前走这条退路。
   */
  samplePromptsInOffline?: EduFirstEntryStagePrompts
}

/* ============================================================
 * Teacher（场景六）—— 课前 / 课中 / 课后 chip 切换；课中再分线上 / 线下
 *   课前：备课 + 学情 + 推预习 + 就位检查
 *   课中 🔵 线上：在线教室 + 随堂题 + 签到 + 资料（均 course-pick 进对应课子 CUI）
 *   课中 🟢 线下：进教室助手 + IFP 板书 OCR + 摄像头追踪发言者 + 物理学具记录站
 *   课后：审报告 + 群发家长 + 进步对比 + 生成变式题
 * ============================================================ */
const TEACHER_COPY: EduFirstEntryCopySource = {
  greeting: "王老师，欢迎来到教育。耗时间的事都交给我，挑一个让我先帮你试试。",
  samplePromptsByStage: {
    pre: [
      { command: "备课审定", skillId: "tt-prep" },
      { command: "本节学情", skillId: "tt-portrait" },
      { command: "推送预习包", skillId: "tt-preview" },
      { command: "课前就位检查", skillId: "tt-ready" },
    ],
    in: [
      { command: "打开在线教室", skillId: "tc-question" },
      { command: "出一道随堂题", skillId: "tc-question" },
      { command: "签到点名", skillId: "tc-question" },
      { command: "本节资料", skillId: "tc-question" },
    ],
    post: [
      { command: "课后报告", skillId: "ta-report" },
      { command: "群发家长通知", skillId: "ta-report" },
      { command: "与上节进步对比", skillId: "ta-progress" },
      { command: "生成下节变式题", skillId: "ta-variant" },
    ],
  },
  samplePromptsInOffline: [
    { command: "进入教室助手", skillId: "tc-question" },
    { command: "看智能黑板识别", skillId: "oc-tt-ifp" },
    { command: "镜头追发言者", skillId: "oc-tt-camera" },
    { command: "物理学具记录站", skillId: "oc-tt-station" },
  ],
}

/* ============================================================
 * Student（场景七）
 *   课前：过重点 + 提问帮手 + 重做错题 + 进步报告
 *   课中 🔵 线上：我要提问（先选私聊/全班） + 举手抢答 + 提问帮手 + 过重点
 *   课中 🟢 线下：我要提问（教室 Pad / 无线麦） + 等无线麦传到 + 看王老师讲到哪段 + 过重点
 *   课后：重做错题 + 进步报告 + 提问帮手 + 让老师看一下
 * ============================================================ */
const STUDENT_COPY: EduFirstEntryCopySource = {
  greeting: "小明同学，欢迎。我能在 4 件事上陪你——挑一个让我先帮你试试。",
  samplePromptsByStage: {
    pre: [
      { command: "过一遍本节重点", skillId: "sp-kp" },
      { command: "提问帮手怎么用", skillId: "sa-copilot" },
      { command: "重做错题", skillId: "sa-mistakes" },
      { command: "进步报告", skillId: "sa-report" },
    ],
    in: [
      { command: "提问", skillId: "sc-private" },
      { command: "举手抢答", skillId: "sc-handraise" },
      { command: "提问帮手怎么用", skillId: "sa-copilot" },
      { command: "过一遍本节重点", skillId: "sp-kp" },
    ],
    post: [
      { command: "重做错题", skillId: "sa-mistakes" },
      { command: "进步报告", skillId: "sa-report" },
      { command: "提问帮手怎么用", skillId: "sa-copilot" },
      { command: "请老师看一下", skillId: "sa-handoff" },
    ],
  },
  samplePromptsInOffline: [
    { command: "教室内提问", skillId: "oc-st-pad" },
    { command: "等无线麦", skillId: "oc-st-mic" },
    { command: "王老师讲到哪段", skillId: "sc-private" },
    { command: "过一遍本节重点", skillId: "sp-kp" },
  ],
}

/* ============================================================
 * Parent（场景八）
 *   课前：课前要做啥 + 看预习进度 + 上课怎么看孩子 + 怎么和老师沟通
 *   课中 🔵 线上：上课怎么看孩子 + 30 秒直播 + 状态变化提醒 + 怎么和老师沟通
 *   课中 🟢 线下：接送闭环时间线 + 教室摄像头巡检 + 晚到 10 分钟接 + 怎么和老师沟通
 *   课后：看课后报告 + 今晚陪孩子做什么 + 怎么和老师沟通 + 把亮点告诉妈妈
 * ============================================================ */
const PARENT_COPY: EduFirstEntryCopySource = {
  greeting: "李爸爸，欢迎。我会让你少陪学、多放心，4 件事都代劳——挑一个先看？",
  samplePromptsByStage: {
    pre: [
      { command: "课前 3 件小事", skillId: "pp-ready" },
      { command: "孩子预习进度", skillId: "pp-preview" },
      { command: "上课怎么看孩子", skillId: "pc-status" },
      { command: "联系王老师", skillId: "pa-report" },
    ],
    in: [
      { command: "上课怎么看孩子", skillId: "pc-status" },
      { command: "看 30 秒直播", skillId: "pc-live" },
      { command: "有变化时提醒", skillId: "pc-status" },
      { command: "联系王老师", skillId: "pa-report" },
    ],
    post: [
      { command: "课后报告", skillId: "pa-report" },
      { command: "今晚怎么陪孩子", skillId: "pa-advice" },
      { command: "联系王老师", skillId: "pa-report" },
      { command: "把亮点告诉妈妈", skillId: "pa-report" },
    ],
  },
  samplePromptsInOffline: [
    { command: "看接送时间线", skillId: "oc-pa-pickup" },
    { command: "看教室摄像头", skillId: "oc-pa-monitor" },
    { command: "晚 10 分钟接", skillId: "oc-pa-pickup" },
    { command: "联系王老师", skillId: "pa-report" },
  ],
}

/* ============================================================
 * Admin（场景九）—— 校长视角不强绑课程节次，但 chip 优先级随时段微调
 *   课前：今天校区 → 随机听课 → 续费风险 → 老师能力（晚自习开始前看全貌）
 *   课中：随机听课 → 今天校区 → 续费风险 → 老师能力（"我现在最该干啥" = 抽查 1 节）
 *   课后：今天校区 → 老师能力 → 续费风险 → 随机听课（看一天结果）
 * ============================================================ */
const ADMIN_COPY: EduFirstEntryCopySource = {
  greeting: "校长好，欢迎。4 张图盯一个校区——先看哪一张？",
  samplePromptsByStage: {
    pre: [
      { command: "今日校区总览", adminCardId: "admin.today" },
      { command: "随机听一节课", adminCardId: "admin.supervise" },
      { command: "续费风险名单", adminCardId: "admin.renew" },
      { command: "教师能力总览", adminCardId: "admin.teacher" },
    ],
    in: [
      { command: "随机听一节课", adminCardId: "admin.supervise" },
      { command: "今日校区总览", adminCardId: "admin.today" },
      { command: "续费风险名单", adminCardId: "admin.renew" },
      { command: "教师能力总览", adminCardId: "admin.teacher" },
    ],
    post: [
      { command: "今日校区总览", adminCardId: "admin.today" },
      { command: "教师能力总览", adminCardId: "admin.teacher" },
      { command: "续费风险名单", adminCardId: "admin.renew" },
      { command: "随机听一节课", adminCardId: "admin.supervise" },
    ],
  },
}

const COPY_SOURCE_BY_ROLE: Record<EduSceneRole, EduFirstEntryCopySource> = {
  teacher: TEACHER_COPY,
  student: STUDENT_COPY,
  parent: PARENT_COPY,
  admin: ADMIN_COPY,
}

/**
 * 主开场 chip 规范化：
 * - 兼容历史文案（口语版）和已观测到的错别字/误写
 * - UI 展示、发送命令、路由匹配统一走规范词，避免同义词分叉
 */
const EDU_FIRST_ENTRY_COMMAND_ALIASES: Record<string, string> = {
  // 教师
  "帮我备节课": "备课审定",
  "看一份学情画像": "本节学情",
  "本学节情": "本节学情",
  "推送预习包给学生": "推送预习包",
  "全民预习包": "推送预习包",
  "上课时帮我做什么": "打开在线教室",
  "课中能做什么": "打开在线教室",
  "进入课堂助手": "打开在线教室",
  "看一份节奏建议": "节奏建议",
  "私聊一个学员": "私聊学员",
  "进教室助手": "进入教室助手",
  "看 IFP 板书 OCR": "看智能黑板识别",
  "摄像头追踪发言者": "镜头追发言者",
  "看一份课后报告": "课后报告",
  "怎么给家长群发通知": "群发家长通知",
  "和上节比一比进步": "与上节进步对比",
  // 学生
  "帮我过一遍重点": "过一遍本节重点",
  "我要重做错题": "重做错题",
  "看一份进步报告": "进步报告",
  "我要提问": "提问",
  "让我老师看一下": "请老师看一下",
  "教室里我要提问": "教室内提问",
  "等无线麦传到": "等无线麦",
  "看王老师讲到哪段": "王老师讲到哪段",
  // 家长
  "课前要做啥": "课前 3 件小事",
  "看孩子预习进度": "孩子预习进度",
  "上课时怎么看孩子": "上课怎么看孩子",
  "怎么和老师沟通": "联系王老师",
  "看一眼直播 30 秒": "看 30 秒直播",
  "状态有变化提醒我": "有变化时提醒",
  "今晚陪孩子做什么": "今晚怎么陪孩子",
  "把孩子的亮点告诉妈妈": "把亮点告诉妈妈",
  "看接送闭环时间线": "看接送时间线",
  "教室摄像头巡检": "看教室摄像头",
  "晚到 10 分钟接": "晚 10 分钟接",
  // 管理者
  "看今天校区情况": "今日校区总览",
  "我要随机听一节课": "随机听一节课",
  "看哪些学员可能不续费": "续费风险名单",
  "看老师整体能力": "教师能力总览",
}

export function canonicalizeEduFirstEntryCommand(command: string): string {
  return EDU_FIRST_ENTRY_COMMAND_ALIASES[command] ?? command
}

/**
 * 单个 source 在 (stage × deliveryMode) 上的实际 chip 集：
 *
 * - `stage !== "in"` 或 source 没有 `samplePromptsInOffline`：直接取 `samplePromptsByStage[stage]`
 * - `stage === "in" && deliveryMode === "offline"` 且 source 有 `samplePromptsInOffline`：取 offline 集
 *
 * 这一层独立出来，便于 `getEduFirstEntryCopy` / `getEduFirstEntryChipCommands` /
 * `isEduFirstEntryChipCommand` 共用同一份事实。
 */
function pickStagePrompts(
  source: EduFirstEntryCopySource,
  stage: EducationStage,
  deliveryMode: LessonDeliveryMode,
): EduFirstEntryStagePrompts {
  if (stage === "in" && deliveryMode === "offline" && source.samplePromptsInOffline) {
    return source.samplePromptsInOffline
  }
  return source.samplePromptsByStage[stage]
}

/**
 * 取某身份在指定 `stage`（× `deliveryMode`，仅 `in` 段生效）下要呈现的"招呼 + 4 chip"文案。
 *
 * 默认 `stage = "pre"`、`deliveryMode = "online"`：
 * - 与 `educationStageDemo` / `lessonDeliveryMode` 默认一致
 * - 也是 demo 最常见的"刚进入教育、距下节课还有一会儿 / 看的还是线上"语境
 */
export function getEduFirstEntryCopy(
  role: EduSceneRole,
  stage: EducationStage = "pre",
  deliveryMode: LessonDeliveryMode = "online",
): EduFirstEntryCopy {
  const source = COPY_SOURCE_BY_ROLE[role]
  let greeting = source.greeting
  if (role === "teacher" && stage === "in" && deliveryMode === "online") {
    greeting =
      "王老师，课中我帮你串起在线课堂和本节课务：打开在线教室、推随堂题、签到点名、查看本节课资料，都从下面选一节直接进入。"
  }
  return {
    greeting,
    samplePrompts: pickStagePrompts(source, stage, deliveryMode),
  }
}

/**
 * 取某身份的 chip 文案数组（种到主会话欢迎气泡 `cuiFollowUpPrompts` 用）。
 *
 * - 给定 `stage`（可选叠加 `deliveryMode`）：返回该 (stage × deliveryMode) 的 4 个 command
 * - 不给 `stage`：返回**全态去重并集**（pre / in-online / in-offline / post），
 *   用于 seed-time 不知道当前 stage / deliveryMode 的场景——只用于 `isEduFirstEntryChipCommand`
 *   的拦截器声明面，可视层永远以 `getEduFirstEntryCopy(role, stage, deliveryMode)` 为准
 */
export function getEduFirstEntryChipCommands(
  role: EduSceneRole,
  stage?: EducationStage,
  deliveryMode?: LessonDeliveryMode,
): string[] {
  const source = COPY_SOURCE_BY_ROLE[role]
  if (stage) {
    return pickStagePrompts(source, stage, deliveryMode ?? "online").map((p) =>
      canonicalizeEduFirstEntryCommand(p.command)
    )
  }
  const merged: string[] = []
  const pushAll = (prompts: EduFirstEntryStagePrompts) => {
    for (const p of prompts) {
      const normalized = canonicalizeEduFirstEntryCommand(p.command)
      if (!merged.includes(normalized)) merged.push(normalized)
    }
  }
  for (const s of ["pre", "in", "post"] as const) {
    pushAll(source.samplePromptsByStage[s])
  }
  if (source.samplePromptsInOffline) pushAll(source.samplePromptsInOffline)
  return merged
}

/**
 * 判定一段文本是否就是教育主开场 chip 的某个 command（用于 handleSendMessage 头部拦截，
 * 把所有来源的 chip 点击统一汇流到 `handleEduFirstEntryChip` 闭环）。
 *
 * 跨 stage × deliveryMode 扫描：用户在不同状态下看到的 chip 文案不一样，
 * 但只要曾经**注册过**就视为合法 chip command（避免切 stage / 形态后旧消息再点击丢失闭环）。
 */
export function isEduFirstEntryChipCommand(role: EduSceneRole, text: string): boolean {
  const normalizedText = canonicalizeEduFirstEntryCommand(text)
  const source = COPY_SOURCE_BY_ROLE[role]
  for (const stage of ["pre", "in", "post"] as const) {
    if (
      source.samplePromptsByStage[stage].some(
        (p) => canonicalizeEduFirstEntryCommand(p.command) === normalizedText
      )
    ) {
      return true
    }
  }
  if (
    source.samplePromptsInOffline?.some(
      (p) => canonicalizeEduFirstEntryCommand(p.command) === normalizedText
    )
  ) {
    return true
  }
  return false
}

/**
 * 用 chip 文案反查 admin 业务卡 id（demo 用快速路由）。
 * 校长 chip 命中时由 handleEduFirstEntryChip 拦截后调用本函数获取 marker payload。
 *
 * 同样跨 stage × deliveryMode 扫描，确保切状态后旧消息上的 admin chip 仍能命中卡 id。
 */
export function findAdminCardIdByCommand(command: string): string | null {
  const normalizedCommand = canonicalizeEduFirstEntryCommand(command)
  const source = COPY_SOURCE_BY_ROLE.admin
  const search = (prompts: EduFirstEntryStagePrompts): string | null => {
    for (const prompt of prompts) {
      if (
        canonicalizeEduFirstEntryCommand(prompt.command) === normalizedCommand &&
        prompt.adminCardId
      ) {
        return prompt.adminCardId
      }
    }
    return null
  }
  for (const stage of ["pre", "in", "post"] as const) {
    const hit = search(source.samplePromptsByStage[stage])
    if (hit) return hit
  }
  if (source.samplePromptsInOffline) {
    const hit = search(source.samplePromptsInOffline)
    if (hit) return hit
  }
  return null
}
