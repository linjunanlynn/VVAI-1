/**
 * 教育三身份场景：跨身份 IM 事件总线（demo 用 sessionStorage）。
 *
 * 解决的痛点：
 * - 当前推荐指令"一键发给家长 / 转给王老师答疑 / 和王老师私聊"只生成一段 AI 回复，
 *   无法在用户切到另一个身份场景（场景六/七/八）时验证"对方真的收到了"。
 *
 * 本模块提供最小集：
 * - `pushEduImEvent(...)` 写入一条事件到 sessionStorage（带去重 id）
 * - `useEduImEvents()` 订阅事件流（消费方在主导航栏 / 会话列表里渲染）
 * - `markEduImEventRead(id)` 标记一条已读，用于消费方刷新红点 / 置顶
 *
 * 与真实 IM 不同的地方（仅 demo）：
 * - 不跨标签页推送、不真正鉴权、不持久化到后端
 * - 仅作为"切到对方身份会立刻看到一条新会话"的演示能力
 */

import * as React from "react"

const STORAGE_KEY = "vvai_demo_edu_im_bus_v1"
const EVENT_NAME = "vvai-edu-im-bus"

/** 跨身份联动事件类型（以「3 条最小集」为基础扩展，覆盖更多 Skill 场景） */
export type EduImEventType =
  | "report-to-parent" // 教师课后报告 → 一键发送给家长
  | "ask-teacher" // 学生错题挑战 → 转给王老师答疑
  | "private-chat-init" // 家长课后报告 → 和王老师私聊
  | "teacher-private-chat" // 教师 · 私聊学员 → 学生端
  | "student-leave-request" // 学生 · 紧急请假 → 教师端
  | "parent-leave-request" // 家长 · 代孩子请假 → 教师端
  | "series-reschedule-notify" // 教师在系列课内调课 → 通知家长 + 学生
  | "series-leave-confirmed" // 学生 / 家长在系列课内请假 → 通知教师（demo 自动确认）

/** 事件目标侧（接收方所属身份场景） */
export type EduImTargetRole = "teacher" | "student" | "parent"

export interface EduImEvent {
  id: string
  type: EduImEventType
  /** 接收方身份（决定会出现在场景六/七/八哪一边） */
  targetRole: EduImTargetRole
  /** 发起方人/事："王老师 → 李爸爸"等 */
  fromName: string
  toName: string
  /** 会话标题（HistorySidebar 行展示） */
  conversationTitle: string
  /** 会话副标题预览（最近一条文字） */
  preview: string
  /** 关联学生（用于跨身份对账） */
  studentName: string
  /** 是否已读（消费方标记） */
  read: boolean
  createdAt: number
}

interface BusState {
  events: EduImEvent[]
}

const isBrowser = typeof window !== "undefined"

function loadState(): BusState {
  if (!isBrowser) return { events: [] }
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return { events: [] }
    const parsed = JSON.parse(raw) as BusState
    if (!parsed || !Array.isArray(parsed.events)) return { events: [] }
    return parsed
  } catch {
    return { events: [] }
  }
}

function saveState(next: BusState) {
  if (!isBrowser) return
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* noop */
  }
}

function emitChange() {
  if (!isBrowser) return
  window.dispatchEvent(new CustomEvent(EVENT_NAME))
}

/** 写入一条事件；若 1 秒内同 type+targetRole 已存在，则视为去重（避免双击重复写入） */
export function pushEduImEvent(input: Omit<EduImEvent, "id" | "createdAt" | "read">): EduImEvent {
  const now = Date.now()
  const state = loadState()
  const dedupeWindowMs = 1000
  const recent = state.events.find(
    (e) =>
      e.type === input.type &&
      e.targetRole === input.targetRole &&
      now - e.createdAt < dedupeWindowMs,
  )
  if (recent) return recent
  const next: EduImEvent = {
    id: `edu-im-${now}-${Math.floor(Math.random() * 1000)}`,
    createdAt: now,
    read: false,
    ...input,
  }
  saveState({ events: [...state.events, next] })
  emitChange()
  return next
}

/** 标记一条事件为已读 */
export function markEduImEventRead(id: string) {
  const state = loadState()
  const events = state.events.map((e) => (e.id === id ? { ...e, read: true } : e))
  saveState({ events })
  emitChange()
}

/** 标记某身份下所有事件已读（消费方点开消息 Tab 用） */
export function markAllReadForRole(role: EduImTargetRole) {
  const state = loadState()
  const events = state.events.map((e) =>
    e.targetRole === role ? { ...e, read: true } : e,
  )
  saveState({ events })
  emitChange()
}

/** 清空（开发调试用） */
export function clearEduImEvents() {
  saveState({ events: [] })
  emitChange()
}

/** 订阅当前 role 接收到的事件 */
export function useEduImEventsForRole(role: EduImTargetRole | null): EduImEvent[] {
  const [snapshot, setSnapshot] = React.useState<EduImEvent[]>(() =>
    role ? loadState().events.filter((e) => e.targetRole === role) : [],
  )
  React.useEffect(() => {
    if (!role) {
      setSnapshot([])
      return
    }
    const refresh = () => setSnapshot(loadState().events.filter((e) => e.targetRole === role))
    refresh()
    if (!isBrowser) return
    window.addEventListener(EVENT_NAME, refresh)
    window.addEventListener("storage", refresh)
    return () => {
      window.removeEventListener(EVENT_NAME, refresh)
      window.removeEventListener("storage", refresh)
    }
  }, [role])
  return snapshot
}

/** 当前 role 未读条数 */
export function useEduImUnreadCountForRole(role: EduImTargetRole | null): number {
  const events = useEduImEventsForRole(role)
  return events.filter((e) => !e.read).length
}

/* ============================================================
 * 3 条最小集事件构造器：与 resolveRecommendedPromptReply 命中点配套
 * ============================================================ */

export const EDU_IM_PRESETS = {
  reportToParent: () =>
    pushEduImEvent({
      type: "report-to-parent",
      targetRole: "parent",
      fromName: "王老师（物理）",
      toName: "李爸爸（李小明监护人）",
      conversationTitle: "王老师（物理）",
      preview: "已为李小明生成《课后报告·力的合成与分解》，请查收。",
      studentName: "李小明",
    }),
  askTeacher: () =>
    pushEduImEvent({
      type: "ask-teacher",
      targetRole: "teacher",
      fromName: "李小明",
      toName: "王老师",
      conversationTitle: "李小明（学员）",
      preview: "第 7 题求助：方向判断 + 我的解答（已附错点定位）",
      studentName: "李小明",
    }),
  privateChatInit: () =>
    pushEduImEvent({
      type: "private-chat-init",
      targetRole: "teacher",
      fromName: "李爸爸",
      toName: "王老师",
      conversationTitle: "李爸爸（李小明监护人）",
      preview: "想请教孩子薄弱点（矢量方向判断），方便时回我。",
      studentName: "李小明",
    }),
  teacherPrivateChat: () =>
    pushEduImEvent({
      type: "teacher-private-chat",
      targetRole: "student",
      fromName: "王老师（物理）",
      toName: "李小明",
      conversationTitle: "王老师（物理）",
      preview: "今晚 21:00 前把矢量方向判断 2 道变式题做完发我；有疑问随时问。",
      studentName: "李小明",
    }),
  studentLeaveRequest: () =>
    pushEduImEvent({
      type: "student-leave-request",
      targetRole: "teacher",
      fromName: "李小明",
      toName: "王老师",
      conversationTitle: "李小明（学员）",
      preview: "请假申请：身体不适，本节课无法上课。已同步家长。",
      studentName: "李小明",
    }),
  parentLeaveRequest: () =>
    pushEduImEvent({
      type: "parent-leave-request",
      targetRole: "teacher",
      fromName: "李爸爸",
      toName: "王老师",
      conversationTitle: "李爸爸（李小明监护人）",
      preview: "代请假：李小明今晚临时有事，本节课请假，明天补课。",
      studentName: "李小明",
    }),
  /**
   * 教师在系列课内调课 → 推一条到家长 + 学生（演示 demo：默认推家长，让 IM 红点出现在场景八）
   */
  seriesRescheduleToParent: (input: { seriesName: string; fromLabel: string; toLabel: string }) =>
    pushEduImEvent({
      type: "series-reschedule-notify",
      targetRole: "parent",
      fromName: "王老师（物理）",
      toName: "李爸爸（李小明监护人）",
      conversationTitle: "王老师（物理）",
      preview: `《${input.seriesName}》调课通知：${input.fromLabel} → ${input.toLabel}`,
      studentName: "李小明",
    }),
  seriesRescheduleToStudent: (input: { seriesName: string; fromLabel: string; toLabel: string }) =>
    pushEduImEvent({
      type: "series-reschedule-notify",
      targetRole: "student",
      fromName: "王老师（物理）",
      toName: "李小明",
      conversationTitle: "王老师（物理）",
      preview: `《${input.seriesName}》调课通知：${input.fromLabel} → ${input.toLabel}`,
      studentName: "李小明",
    }),
  /** 学生 / 家长在系列课内请假 → 给老师推一条（demo 默认自动确认） */
  seriesLeaveFromStudent: (input: { seriesName: string; lessonLabel: string }) =>
    pushEduImEvent({
      type: "series-leave-confirmed",
      targetRole: "teacher",
      fromName: "李小明",
      toName: "王老师",
      conversationTitle: "李小明（学员）",
      preview: `请假申请已确认：${input.seriesName} · ${input.lessonLabel}`,
      studentName: "李小明",
    }),
  seriesLeaveFromParent: (input: { seriesName: string; lessonLabel: string }) =>
    pushEduImEvent({
      type: "series-leave-confirmed",
      targetRole: "teacher",
      fromName: "李爸爸",
      toName: "王老师",
      conversationTitle: "李爸爸（李小明监护人）",
      preview: `代请假已确认：${input.seriesName} · ${input.lessonLabel}`,
      studentName: "李小明",
    }),
} as const

/* ============================================================
 * skillId → IM 联动 触发表
 * 用于：在 AI课堂侧 CUI 内执行某个 Skill 时，自动 push 对应 IM 事件
 *      到接收方身份场景，让用户切到另一身份立刻看到红点 + 新会话。
 * 此处只挑"语义上确实会引发跨身份消息"的几个 Skill；其他 Skill 不触发，
 * 避免把日常学情查看类操作也变成 IM 推送。
 * ============================================================ */

export interface SkillImTrigger {
  preset: keyof typeof EDU_IM_PRESETS
  /** 触发后写入消息流的状态行（用户能看到"已通知 xx，可切到 xx 查看"） */
  confirmText: string
  /** 跳转目标身份（与 preset.targetRole 一致；冗余便于模板拼接） */
  targetRole: EduImTargetRole
  /** 跳转目标身份显示名 */
  targetRoleLabel: string
}

export const SKILL_IM_TRIGGER: Record<string, SkillImTrigger> = {
  /** 教师 · 私聊学员（课中即时 + 课后跟进） */
  "tc-private": {
    preset: "teacherPrivateChat",
    confirmText: "已把私聊草稿发给李小明（学生端可见）。",
    targetRole: "student",
    targetRoleLabel: "学生",
  },
  /** 教师 · 课后报告（执行此 Skill 即视为已生成报告，需推送家长） */
  "ta-report": {
    preset: "reportToParent",
    confirmText: "已生成《李小明 · 课后报告》并写入家长 IM（家长端可见）。",
    targetRole: "parent",
    targetRoleLabel: "家长",
  },
  /** 学生 · 错题挑战（推送转给老师答疑的草稿） */
  "sa-mistakes": {
    preset: "askTeacher",
    confirmText: "已把错题求助草稿发给王老师（教师端可见）。",
    targetRole: "teacher",
    targetRoleLabel: "教师",
  },
  /** 学生 · 转给老师 */
  "sa-handoff": {
    preset: "askTeacher",
    confirmText: "已把第 7 题截图与你的解题过程转给王老师（教师端可见）。",
    targetRole: "teacher",
    targetRoleLabel: "教师",
  },
  /** 学生 · 紧急请假（课中） */
  "sc-leave": {
    preset: "studentLeaveRequest",
    confirmText: "已把请假申请发给王老师 + 班主任（教师端可见）。",
    targetRole: "teacher",
    targetRoleLabel: "教师",
  },
  /** 家长 · 代孩子请假（课中） */
  "pc-urgent": {
    preset: "parentLeaveRequest",
    confirmText: "已把代请假申请发给王老师 + 班主任（教师端可见）。",
    targetRole: "teacher",
    targetRoleLabel: "教师",
  },
  /** 家长 · 课后报告 → 私聊老师 */
  "pa-report": {
    preset: "privateChatInit",
    confirmText: "已为你打开和王老师的私聊草稿（教师端可见）。",
    targetRole: "teacher",
    targetRoleLabel: "教师",
  },
}

/** 触发一个 Skill 的 IM 联动；返回触发记录或 null */
export function triggerSkillIm(skillId: string): SkillImTrigger | null {
  const cfg = SKILL_IM_TRIGGER[skillId]
  if (!cfg) return null
  EDU_IM_PRESETS[cfg.preset]()
  return cfg
}
