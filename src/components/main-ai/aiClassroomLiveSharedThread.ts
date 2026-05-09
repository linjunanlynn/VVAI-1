/**
 * 「子 CUI ↔ AI 课堂浮层」VVAI 会话共享 bus（v2：跨窗口 / 跨 popup 双向同步）。
 *
 * 背景
 * ----------------------------------------------------
 * AI 课堂浮层是用 `window.open(...)` 打开的独立 popup（独立 React 树、独立 sessionStorage 副本）。
 * 而子 CUI（AiClassroomSideConversationPanel）跑在主窗口。两边对同一节课的 VVAI 会话需要：
 *
 *   1) popup 一开就能看到子 CUI 已累积的全部历史；
 *   2) popup 内 VVAI 消息 tab 发的话，主窗口子 CUI 实时同步出现；
 *   3) 子 CUI 发的话，popup 也实时同步过来。
 *
 * 实现策略
 * ----------------------------------------------------
 * - **本窗口内** 仍维持 `Map<key, Set<Listener>>` 直接派发；
 * - **跨窗口** 用 `BroadcastChannel("vvai.ai-classroom.thread.v1")`：
 *   - publish 时同时往 channel post 一个带本实例 id 的事件；
 *   - 收到 channel 事件时，先过滤掉本实例的回声，然后把 messages 落到本窗口的 sessionStorage
 *     并派发给本窗口的订阅者；
 * - **popup 冷启动** 时本身的 sessionStorage 是空的，所以 `loadAiClassroomLessonThread`
 *   会做一次 opener fallback —— 通过 `window.opener.sessionStorage` 把主窗口的当前 thread
 *   原样拷一份过来当作初始（拷成功后再通过 `saveAiClassroomSideThread` 写入 popup 自己的
 *   storage，避免每次都跨 window 读）。
 *
 * 自循环避免
 * ----------------------------------------------------
 * 调用方在订阅 cb 中通过 ref 比较 publish 时传入的 messages 与本地"上次自己写过的"
 * 是否同引用，相同则跳过本地 setState。详见使用方（AiClassroomSideConversationPanel /
 * AiClassroomLiveChatPanel）的实现注释。同时 channel 上自己 post 的消息会带 instance id，
 * 收到时被过滤；保险层叠加。
 */

import type { Message } from "../chat/data"
import {
  loadAiClassroomSideThread,
  saveAiClassroomSideThread,
} from "./aiClassroomSidePersistence"
import type { EduLessonAttendingRole } from "./homeScenarioLayout"

type Listener = (messages: Message[]) => void

const listeners = new Map<string, Set<Listener>>()

function key(role: EduLessonAttendingRole, lessonId: string): string {
  return `${role}.${lessonId}`
}

/* ============================================================
 * 跨窗口 BroadcastChannel（同源 popup ↔ opener 实时双向同步）
 * ============================================================ */

const CHANNEL_NAME = "vvai.ai-classroom.thread.v1"

/** 本实例 id：每次模块首次执行生成；用于过滤自己 post 的消息回声 */
const INSTANCE_ID =
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `inst-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

interface ChannelEnvelope {
  type: "thread"
  /** 来源实例 id，用于过滤回声 */
  source: string
  role: EduLessonAttendingRole
  lessonId: string
  messages: Message[]
}

let channel: BroadcastChannel | null = null
function getChannel(): BroadcastChannel | null {
  if (typeof window === "undefined") return null
  if (typeof BroadcastChannel === "undefined") return null
  if (channel) return channel
  try {
    channel = new BroadcastChannel(CHANNEL_NAME)
    channel.onmessage = (e: MessageEvent<ChannelEnvelope>) => {
      const env = e.data
      if (!env || env.type !== "thread") return
      if (env.source === INSTANCE_ID) return /** 自己的回声，丢 */
      saveAiClassroomSideThread(env.role, env.lessonId, env.messages)
      listeners.get(key(env.role, env.lessonId))?.forEach((cb) => cb(env.messages))
    }
  } catch {
    channel = null
  }
  return channel
}

/* ============================================================
 * Pub / Sub API
 * ============================================================ */

export function subscribeAiClassroomLessonThread(
  role: EduLessonAttendingRole,
  lessonId: string,
  cb: Listener,
): () => void {
  /** 第一个订阅者出现时确保 channel 已建立（懒初始化） */
  getChannel()
  const k = key(role, lessonId)
  if (!listeners.has(k)) listeners.set(k, new Set())
  listeners.get(k)!.add(cb)
  return () => {
    listeners.get(k)?.delete(cb)
  }
}

/**
 * 写本窗口 sessionStorage + 通知本窗口订阅者 + post 到 BroadcastChannel
 * （跨窗口对端会收到、过滤自己回声、再写自己 sessionStorage 并通知自己的订阅者）。
 *
 * 本窗口订阅者拿到的 messages 引用与传入的同一份，可用 ref 比较过滤自循环。
 */
export function publishAiClassroomLessonThread(
  role: EduLessonAttendingRole,
  lessonId: string,
  messages: Message[],
): void {
  saveAiClassroomSideThread(role, lessonId, messages)
  listeners.get(key(role, lessonId))?.forEach((cb) => cb(messages))
  const ch = getChannel()
  if (!ch) return
  try {
    const envelope: ChannelEnvelope = {
      type: "thread",
      source: INSTANCE_ID,
      role,
      lessonId,
      messages,
    }
    ch.postMessage(envelope)
  } catch {
    /** Message 含不可序列化字段时静默；下一次 publish 还有机会 */
  }
}

/**
 * 读取当前 (role × lessonId) 的会话历史。
 *
 * 主窗口：直接读自己 sessionStorage。
 * popup：自己 sessionStorage 为空时，尝试从 `window.opener.sessionStorage` 读一份
 *        作为初始拷贝并落库到自己 storage（同源时可访问；跨源 / opener 关闭时静默回退）。
 */
export function loadAiClassroomLessonThread(
  role: EduLessonAttendingRole,
  lessonId: string,
): Message[] {
  const local = loadAiClassroomSideThread(role, lessonId)
  if (local.length > 0) return local
  const fromOpener = readThreadFromOpener(role, lessonId)
  if (fromOpener && fromOpener.length > 0) {
    saveAiClassroomSideThread(role, lessonId, fromOpener)
    return fromOpener
  }
  return local
}

/** 同源 popup 才能访问 opener.sessionStorage；跨源 / opener 关闭抛错时返回 null */
function readThreadFromOpener(
  role: EduLessonAttendingRole,
  lessonId: string,
): Message[] | null {
  if (typeof window === "undefined") return null
  const opener = window.opener as Window | null
  if (!opener) return null
  try {
    const storageKey = `vvai.ai-classroom.side-thread.v1.${role}.${lessonId}`
    const raw = opener.sessionStorage.getItem(storageKey)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as Message[]) : null
  } catch {
    return null
  }
}
