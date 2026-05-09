/**
 * AI 课堂「随堂练习题」跨窗口同步总线（v1）。
 *
 * 业务闭环
 * ----------------------------------------------------
 *   老师推题 → 学生收题 → 学生作答 → AI 批改 → 学生反馈 + 老师聚合
 *
 *   1) 老师 popup（scenario=edu-teacher 等）在工具栏"推随堂题"打开 push sheet → 选题 → publish
 *   2) bus broadcast → 所有同源窗口（学生 popup / 子 CUI 同节课视图）实时收到 status="live"
 *   3) 学生作答 → submitAnswer → bus broadcast → 老师实时聚合（已答 / 选项分布）
 *   4) 60s 倒计时到（或老师手动 endQuiz）→ status="grading" → 1.2s AI 批改动画 → status="closed"
 *   5) closed 阶段：老师看完整分布 + 卡点学生；学生看 ✓/✗ + 个性化 AI 反馈
 *
 * 持久化
 * ----------------------------------------------------
 * - **localStorage**：跨同源窗口持久化最新快照（key 按 lessonId 隔离），让后开的窗口能读到当前题状态。
 * - **BroadcastChannel**：跨窗口实时增量；同窗口订阅者直接派发。
 * - 自循环过滤：通过 INSTANCE_ID 过滤本实例 post 的回声，避免双写。
 *
 * 演示态
 * ----------------------------------------------------
 * - 老师推题后，老师窗口本地启动一组定时器，模拟其余 7 名同学陆续提交（不广播 simulator 控制信息，
 *   而是直接通过 submitAnswer 走 channel；其它窗口收到的就是真实 submissions）。
 * - 真人学生窗口的提交也走 submitAnswer；最终 submissions 自动合流（按 studentId 去重）。
 */

import * as React from "react"
import { DEMO_LIVE_STUDENTS } from "./aiClassroomLiveDemo"

/* ============================================================
 * 数据模型
 * ============================================================ */

export interface AiClassroomQuizQuestion {
  id: string
  /** 题型：单选（demo 一期只支持单选） */
  type: "single"
  stem: string
  options: string[]
  correctIndex: number
  /** AI 标准解析（closed 阶段一并返回给学生） */
  explanation: string
  /** 易错项提示：选项 index → 该选项被选时的"卡点"诊断 */
  pitfalls?: Record<number, string>
  /** 倒计时（秒） */
  deadlineSec: number
  /** 题目知识点标签（用于聚合"易错项分类"） */
  knowledgeTag?: string
  /** 推荐复习的 slide 索引（1-based，方便学生跳转） */
  reviewSlideIndex?: number
}

export interface AiClassroomQuizSubmission {
  studentId: string
  studentName: string
  pickedIndex: number
  /** 提交时距离推题的毫秒数（用于"答题速度"统计） */
  elapsedMs: number
  submittedAt: number
  /**
   * AI 批改结果（grading 阶段统一算）：
   * - isCorrect: 是否答对
   * - aiFeedback: 个性化反馈文本
   * - speedRank: 在班级所有提交里的速度排名（1 = 最快）；grading 阶段填
   */
  isCorrect?: boolean
  aiFeedback?: string
  speedRank?: number
}

export type AiClassroomQuizStatus = "idle" | "live" | "grading" | "closed"

export interface AiClassroomQuizSnapshot {
  /** 节课作用域（不同 lesson 互不影响） */
  lessonId: string
  status: AiClassroomQuizStatus
  question: AiClassroomQuizQuestion | null
  /** 推题时刻（status === "live" / "grading" / "closed" 时有值） */
  pushedAt: number | null
  /** 倒计时截止时刻；客户端可据此渲染倒计时（status === "live"） */
  deadlineAt: number | null
  submissions: AiClassroomQuizSubmission[]
  /** 班级总人数（demo 用 DEMO_LIVE_STUDENTS.length，含 self） */
  totalStudents: number
  /** 第几道题（递增，便于历史追踪 / 显示「本节第 N 题」） */
  questionSeq: number
  /** AI 批改完成时刻（status === "closed" 时有值） */
  closedAt: number | null
}

/* ============================================================
 * Storage / Channel
 * ============================================================ */

const STORAGE_PREFIX = "vvai.ai-classroom.quiz.v1"
const CHANNEL_NAME = "vvai.ai-classroom.quiz.v1"

const INSTANCE_ID =
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `inst-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

function storageKey(lessonId: string): string {
  return `${STORAGE_PREFIX}.${lessonId}`
}

function buildIdleSnapshot(lessonId: string, questionSeq = 0): AiClassroomQuizSnapshot {
  return {
    lessonId,
    status: "idle",
    question: null,
    pushedAt: null,
    deadlineAt: null,
    submissions: [],
    totalStudents: DEMO_LIVE_STUDENTS.length,
    questionSeq,
    closedAt: null,
  }
}

function readSnapshotFromStorage(lessonId: string): AiClassroomQuizSnapshot {
  if (typeof window === "undefined") return buildIdleSnapshot(lessonId)
  try {
    const raw = window.localStorage.getItem(storageKey(lessonId))
    if (!raw) return buildIdleSnapshot(lessonId)
    const parsed = JSON.parse(raw) as AiClassroomQuizSnapshot
    if (!parsed || parsed.lessonId !== lessonId) return buildIdleSnapshot(lessonId)
    return parsed
  } catch {
    return buildIdleSnapshot(lessonId)
  }
}

function writeSnapshotToStorage(snapshot: AiClassroomQuizSnapshot): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(storageKey(snapshot.lessonId), JSON.stringify(snapshot))
  } catch {
    /** quota / privacy mode：静默忽略，跨窗口同步退化为仅本实例 channel 推送 */
  }
}

interface ChannelEnvelope {
  type: "quiz"
  source: string
  lessonId: string
  snapshot: AiClassroomQuizSnapshot
}

let channel: BroadcastChannel | null = null

type Listener = (snapshot: AiClassroomQuizSnapshot) => void
const listeners = new Map<string, Set<Listener>>()

function getChannel(): BroadcastChannel | null {
  if (typeof window === "undefined") return null
  if (typeof BroadcastChannel === "undefined") return null
  if (channel) return channel
  try {
    channel = new BroadcastChannel(CHANNEL_NAME)
    channel.onmessage = (e: MessageEvent<ChannelEnvelope>) => {
      const env = e.data
      if (!env || env.type !== "quiz") return
      if (env.source === INSTANCE_ID) return
      writeSnapshotToStorage(env.snapshot)
      listeners.get(env.lessonId)?.forEach((cb) => cb(env.snapshot))
    }
  } catch {
    channel = null
  }
  return channel
}

/* ============================================================
 * Pub / Sub API
 * ============================================================ */

export function loadQuizSnapshot(lessonId: string): AiClassroomQuizSnapshot {
  return readSnapshotFromStorage(lessonId)
}

export function subscribeQuiz(lessonId: string, cb: Listener): () => void {
  getChannel()
  if (!listeners.has(lessonId)) listeners.set(lessonId, new Set())
  listeners.get(lessonId)!.add(cb)
  return () => {
    listeners.get(lessonId)?.delete(cb)
  }
}

function publishSnapshot(snapshot: AiClassroomQuizSnapshot): void {
  writeSnapshotToStorage(snapshot)
  listeners.get(snapshot.lessonId)?.forEach((cb) => cb(snapshot))
  const ch = getChannel()
  if (!ch) return
  try {
    const envelope: ChannelEnvelope = {
      type: "quiz",
      source: INSTANCE_ID,
      lessonId: snapshot.lessonId,
      snapshot,
    }
    ch.postMessage(envelope)
  } catch {
    /** 序列化失败：本地已写 storage 也已派发本地订阅者，下次还能恢复 */
  }
}

/* ============================================================
 * 业务动作（老师 / 学生通用入口）
 * ============================================================ */

/**
 * 老师推题：进入 live 阶段，启动倒计时。
 * - 同一节课 push 多次，questionSeq 自增（便于 UI 显示"本节第 N 题"）。
 * - submissions 清空（新题不带历史）。
 */
export function pushQuiz(
  lessonId: string,
  question: AiClassroomQuizQuestion,
): AiClassroomQuizSnapshot {
  const prev = readSnapshotFromStorage(lessonId)
  const now = Date.now()
  const next: AiClassroomQuizSnapshot = {
    lessonId,
    status: "live",
    question,
    pushedAt: now,
    deadlineAt: now + question.deadlineSec * 1000,
    submissions: [],
    totalStudents: DEMO_LIVE_STUDENTS.length,
    questionSeq: prev.questionSeq + 1,
    closedAt: null,
  }
  publishSnapshot(next)
  return next
}

/**
 * 学生提交答案：
 * - 同一 studentId 重复提交以**首次**为准（UI 上学生提交后会进入"等待批改"，不会再触发）；
 * - status 不为 live 时丢弃（已结束或未推题）。
 */
export function submitAnswer(
  lessonId: string,
  args: { studentId: string; studentName: string; pickedIndex: number },
): AiClassroomQuizSnapshot {
  const prev = readSnapshotFromStorage(lessonId)
  if (prev.status !== "live" || !prev.question || prev.pushedAt == null) return prev
  if (prev.submissions.some((s) => s.studentId === args.studentId)) return prev
  const now = Date.now()
  const submission: AiClassroomQuizSubmission = {
    studentId: args.studentId,
    studentName: args.studentName,
    pickedIndex: args.pickedIndex,
    elapsedMs: now - prev.pushedAt,
    submittedAt: now,
  }
  const next: AiClassroomQuizSnapshot = {
    ...prev,
    submissions: [...prev.submissions, submission],
  }
  publishSnapshot(next)
  return next
}

/**
 * 进入 grading（AI 批改）阶段：
 * - 老师手动「结束本题」或倒计时到自动调用；
 * - 不立刻 close，让 UI 渲染"AI 正在批改…"动画 1.2s，再调用 finalizeGrading。
 */
export function startGrading(lessonId: string): AiClassroomQuizSnapshot {
  const prev = readSnapshotFromStorage(lessonId)
  if (prev.status !== "live") return prev
  const next: AiClassroomQuizSnapshot = {
    ...prev,
    status: "grading",
  }
  publishSnapshot(next)
  return next
}

/**
 * 完成 AI 批改：
 * - 对所有 submissions 写入 isCorrect / aiFeedback / speedRank
 * - 状态转 closed
 * - 该函数不强制由谁调用：grading 阶段任意窗口都可以触发；快照写入幂等。
 */
export function finalizeGrading(lessonId: string): AiClassroomQuizSnapshot {
  const prev = readSnapshotFromStorage(lessonId)
  if (prev.status !== "grading" || !prev.question) return prev
  const q = prev.question
  /** 速度排名：按 elapsedMs 升序 */
  const submissionsByTime = [...prev.submissions].sort((a, b) => a.elapsedMs - b.elapsedMs)
  const rankByStudentId = new Map<string, number>()
  submissionsByTime.forEach((s, i) => rankByStudentId.set(s.studentId, i + 1))

  const graded: AiClassroomQuizSubmission[] = prev.submissions.map((s) => {
    const isCorrect = s.pickedIndex === q.correctIndex
    const aiFeedback = buildAiFeedback({
      isCorrect,
      pickedIndex: s.pickedIndex,
      correctIndex: q.correctIndex,
      pitfalls: q.pitfalls,
      explanation: q.explanation,
      speedRank: rankByStudentId.get(s.studentId) ?? 1,
      totalSubmissions: prev.submissions.length,
      reviewSlideIndex: q.reviewSlideIndex,
    })
    return {
      ...s,
      isCorrect,
      aiFeedback,
      speedRank: rankByStudentId.get(s.studentId),
    }
  })

  const next: AiClassroomQuizSnapshot = {
    ...prev,
    status: "closed",
    submissions: graded,
    closedAt: Date.now(),
  }
  publishSnapshot(next)
  return next
}

/**
 * 老师：彻底结束当前题（关闭面板回到课件 / 准备推下一题）。
 * 重置回 idle，但保留 questionSeq 计数。
 */
export function resetQuiz(lessonId: string): AiClassroomQuizSnapshot {
  const prev = readSnapshotFromStorage(lessonId)
  const next: AiClassroomQuizSnapshot = {
    ...buildIdleSnapshot(lessonId, prev.questionSeq),
  }
  publishSnapshot(next)
  return next
}

/* ============================================================
 * 个性化 AI 反馈生成（确定性，无随机）
 * ============================================================ */

function buildAiFeedback(args: {
  isCorrect: boolean
  pickedIndex: number
  correctIndex: number
  pitfalls?: Record<number, string>
  explanation: string
  speedRank: number
  totalSubmissions: number
  reviewSlideIndex?: number
}): string {
  const speedTag =
    args.speedRank === 1
      ? `班级最快 🚀`
      : args.speedRank <= Math.max(1, Math.ceil(args.totalSubmissions / 3))
        ? `速度前 1/3`
        : args.speedRank >= args.totalSubmissions - 1
          ? `较慢 ⏳`
          : `中等速度`
  if (args.isCorrect) {
    return [
      `✓ 答对了！`,
      `· 速度：${speedTag}（${args.speedRank} / ${args.totalSubmissions}）`,
      `· 你的思路：${args.explanation}`,
    ].join("\n")
  }
  const pitfall = args.pitfalls?.[args.pickedIndex]
  const reviewLine = args.reviewSlideIndex
    ? `· 建议复习课件第 ${args.reviewSlideIndex} 页`
    : null
  return [
    `✗ 答错了（你选了 ${String.fromCharCode(65 + args.pickedIndex)}，正确答案是 ${String.fromCharCode(65 + args.correctIndex)}）`,
    pitfall ? `· 你的卡点：${pitfall}` : null,
    `· 正解思路：${args.explanation}`,
    reviewLine,
  ]
    .filter(Boolean)
    .join("\n")
}

/* ============================================================
 * React 订阅 hook
 * ============================================================ */

export function useQuizSnapshot(lessonId: string): AiClassroomQuizSnapshot {
  const [snapshot, setSnapshot] = React.useState<AiClassroomQuizSnapshot>(() =>
    loadQuizSnapshot(lessonId),
  )
  React.useEffect(() => {
    setSnapshot(loadQuizSnapshot(lessonId))
    const unsub = subscribeQuiz(lessonId, (next) => setSnapshot(next))
    return unsub
  }, [lessonId])
  return snapshot
}

/* ============================================================
 * 演示：老师窗口推题后，自动模拟其余学生提交（合流到同一份 submissions）
 *
 * - 仅老师视图调用：避免多个窗口同时模拟造成重复提交
 *   （submitAnswer 自身按 studentId 去重，理论上多窗口调用也安全，但仍以"老师为唯一模拟入口"
 *    避免节奏被叠加）
 * - 真人 student 窗口（self）的提交不在模拟范围内，由学生自己点提交
 * - timer 数组返回给调用方，方便 unmount / push 新题前清理
 *
 * 模拟分布：
 *   - 第 1 名：5s 内提交（跑得快的学霸）
 *   - 中间 4 名：8-25s 内陆续提交
 *   - 末尾 2 名：35-55s（"卡题型" 学生，有 1-2 个会答错）
 *   错误率：约 30% 选 "7N"（相加误判）；70% 选 "5N"（正确）
 * ============================================================ */

export function startDemoStudentSimulation(args: {
  lessonId: string
  /** 排除已经在 self 视图打开的学生（学生 popup 自己提交） */
  excludeSelfId?: string
}): () => void {
  const timers: number[] = []
  /** 排除 self（如学生窗口同时开启），其余按节奏陆续提交 */
  const others = DEMO_LIVE_STUDENTS.filter(
    (s) => !s.isSelf && s.id !== args.excludeSelfId && s.online,
  )
  /** 节奏（毫秒）+ 选项 index（混入 1-2 名错答以演示易错项分布） */
  const schedule: Array<{ delayMs: number; pickedIndex: number }> = [
    { delayMs: 4_500, pickedIndex: 1 } /** 张同学风格：最快、答对 */,
    { delayMs: 8_000, pickedIndex: 1 },
    { delayMs: 12_500, pickedIndex: 0 } /** 错答：相加误判 7N */,
    { delayMs: 17_000, pickedIndex: 1 },
    { delayMs: 22_000, pickedIndex: 1 },
    { delayMs: 31_000, pickedIndex: 0 } /** 错答 */,
    { delayMs: 44_000, pickedIndex: 1 },
  ]
  others.slice(0, schedule.length).forEach((stu, i) => {
    const cfg = schedule[i]
    const t = window.setTimeout(() => {
      submitAnswer(args.lessonId, {
        studentId: stu.id,
        studentName: stu.name,
        pickedIndex: cfg.pickedIndex,
      })
    }, cfg.delayMs)
    timers.push(t)
  })
  return () => {
    timers.forEach((t) => window.clearTimeout(t))
  }
}
