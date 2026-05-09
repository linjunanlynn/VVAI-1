/**
 * 课程形态（演示态）：🔵 线上 / 🟢 线下
 *
 * 与 `educationStage`（课前 / 课中 / 课后）正交：
 * - educationStage 控制"用户在不同时段进入产品看到的差异"
 * - deliveryMode 控制"同一时段下，课程形态是线上视频会议还是物理教室"
 *
 * 设计原则与 `educationStageDemo.ts` 对齐：
 * - sessionStorage 持久化，刷新页面恢复
 * - 默认值 = 线上（demo 主线《力的合成与分解》最初用线上互动教室 A1）
 * - 仅作演示开关；真实业务下 `class.session.delivery_mode` 由排课主数据决定（PRD 2.5.1.G）
 *
 * 后续若引入"OMO 双师 / 录播+答疑"，可扩展为联合类型，**不要** 把 boolean isOnline 暴露给消费方。
 */

export type LessonDeliveryMode = "online" | "offline"

export const LESSON_DELIVERY_MODE_OPTIONS: {
  id: LessonDeliveryMode
  /** 长标签（用于 active 状态 + 图例） */
  label: string
  /** 短标签（顶栏 chip 默认显示） */
  shortLabel: string
  /** 状态点颜色（与 PRD 三色徽标对应：🔵 / 🟢） */
  dot: "blue" | "green"
}[] = [
  { id: "online", label: "🔵 线上课", shortLabel: "线上课", dot: "blue" },
  { id: "offline", label: "🟢 线下课", shortLabel: "线下课", dot: "green" },
]

const DEFAULT_MODE: LessonDeliveryMode = "online"

function storageKeyForScenario(scenario: string | undefined): string {
  return `cui-demo-edu-delivery-mode-${scenario ?? "default"}`
}

function isLessonDeliveryMode(value: unknown): value is LessonDeliveryMode {
  return value === "online" || value === "offline"
}

export function loadDemoLessonDeliveryMode(scenario: string | undefined): LessonDeliveryMode {
  if (typeof window === "undefined") return DEFAULT_MODE
  try {
    const raw = window.sessionStorage.getItem(storageKeyForScenario(scenario))
    return isLessonDeliveryMode(raw) ? raw : DEFAULT_MODE
  } catch {
    return DEFAULT_MODE
  }
}

export function saveDemoLessonDeliveryMode(
  scenario: string | undefined,
  mode: LessonDeliveryMode,
): void {
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.setItem(storageKeyForScenario(scenario), mode)
  } catch {
    // ignore quota / private mode
  }
}

/** 形态展示用名称（比如卡片副标 / 推荐指令回复用） */
export function deliveryModeLabel(mode: LessonDeliveryMode): string {
  return mode === "online" ? "线上课" : "线下课"
}

/**
 * 当前形态对应的"教室呈现"文案（hero / 卡片副标可直接用）。
 * - 线上：保持 DEMO_LESSON.classroom 现有文案 "线上互动教室 A1"
 * - 线下：固定为 "A301 物理教室"（与 demo 一致；后续可由真实 `physical_classroom_id` 替换）
 */
export function deliveryModeClassroomLabel(mode: LessonDeliveryMode): string {
  return mode === "online" ? "线上互动教室 A1" : "A301 物理教室"
}
