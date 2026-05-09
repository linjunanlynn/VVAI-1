/**
 * AI 课堂（在线教室）独立浮层容器。
 *
 * 与子 CUI（AI 助手对话）的关系：
 * - 二者**可同时打开**：子 CUI 在右、AI 课堂在中左主区，互不挡。
 * - 当子 CUI 也打开时：本浮层从 right=720 起算（保留子 CUI 720px 宽不被覆盖）。
 *   当子 CUI 关闭时：本浮层占满屏幕宽度。
 * - 退出仅关闭本浮层；不影响 stage（stage 仍由子 CUI 老师控制条管理）。
 *
 * 内部三栏：
 * - 左：视频墙（角色差异化）
 * - 中：课件展示区
 * - 右：会话区（双 tab：课堂消息 / VVAI 助理）
 * - 底：工具栏
 */

import * as React from "react"
import { motion } from "motion/react"
import { Layers, X } from "lucide-react"
import { cn } from "../ui/utils"
import { AiClassroomLiveVideoWall } from "./AiClassroomLiveVideoWall"
import { AiClassroomLiveSlideStage } from "./AiClassroomLiveSlideStage"
import { AiClassroomLiveTeacherInsightPanel } from "./AiClassroomLiveTeacherInsightPanel"
import {
  AiClassroomLiveChatPanel,
  type AiClassroomLiveChatTab,
} from "./AiClassroomLiveChatPanel"
import { AiClassroomLiveToolbar } from "./AiClassroomLiveToolbar"
import {
  aiClassroomLiveActions,
  useAiClassroomLiveState,
} from "./aiClassroomLiveStore"
import {
  type AiClassroomLiveTeacherInsight,
  DEMO_LIVE_TEACHER_INSIGHT,
} from "./aiClassroomLiveDemo"
import type { EduLessonAttendingRole } from "./homeScenarioLayout"
import {
  startDemoStudentSimulation,
  useQuizSnapshot,
} from "./aiClassroomQuizBus"
import { AiClassroomQuizOverlay } from "./AiClassroomQuizOverlay"
import { AiClassroomQuizPushSheet } from "./AiClassroomQuizPushSheet"

export interface AiClassroomLiveWindowProps {
  role: EduLessonAttendingRole
  /** 主线 lessonId，用于 VVAI thread 共享 key */
  lessonId: string
  /** 课程标题（用于 Header） */
  lessonTitle: string
  botAvatarSrc: string
  userAvatarSrc: string
  /** 子 CUI 是否同时打开（决定浮层 right 留 720 还是 0） */
  subCuiOpen: boolean
  onClose: () => void
}

export function AiClassroomLiveWindow({
  role,
  lessonId,
  lessonTitle,
  botAvatarSrc,
  userAvatarSrc,
  subCuiOpen,
  onClose,
}: AiClassroomLiveWindowProps) {
  const live = useAiClassroomLiveState()
  const actions = React.useMemo(() => aiClassroomLiveActions(), [])

  /**
   * 会话区当前 tab（受控）：
   * - 进入 AI 课堂默认看「课堂消息」（class），与"沉浸到课堂直播"语境对齐；
   * - 「VVAI 消息」（vvai）的累积条数通过 tab 角标实时可见，用户随时切过去；
   * - 学生工具栏的「提问 VVAI」按钮通过这里强制切到 vvai tab。
   */
  const [chatTab, setChatTab] = React.useState<AiClassroomLiveChatTab>("class")

  /** 简易 toast（角色专属工具按钮 / 板书等占位）；2 秒后消失 */
  const [toast, setToast] = React.useState<string | null>(null)
  const toastTimerRef = React.useRef<number | null>(null)
  const showToast = React.useCallback((label: string) => {
    setToast(label)
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2200)
  }, [])

  /* ================================================================
   * 随堂练习题：跨窗口快照 + 老师本地学生提交模拟
   * ================================================================ */
  const quiz = useQuizSnapshot(lessonId)
  const [quizPushSheetOpen, setQuizPushSheetOpen] = React.useState(false)
  /**
   * 老师视图专属：每次 push 一道题后，本地启动一组定时器模拟其余学生陆续提交。
   * - 仅老师 popup 调用 startDemoStudentSimulation，避免多窗口同时模拟造成重复提交
   * - resetQuiz / 切到下一题：先 cleanup 上轮 timers
   */
  const simulationCleanupRef = React.useRef<null | (() => void)>(null)
  React.useEffect(() => {
    if (role !== "teacher") return
    /** quiz.status 切到 idle / closed / grading 时停止模拟 */
    if (quiz.status !== "live") {
      simulationCleanupRef.current?.()
      simulationCleanupRef.current = null
      return
    }
    /** live 阶段且本轮模拟还没启动：启动 */
    if (simulationCleanupRef.current) return
    simulationCleanupRef.current = startDemoStudentSimulation({ lessonId })
    return () => {
      simulationCleanupRef.current?.()
      simulationCleanupRef.current = null
    }
  }, [role, quiz.status, lessonId, quiz.questionSeq])
  React.useEffect(() => {
    return () => simulationCleanupRef.current?.()
  }, [])

  /** 老师工具栏「推随堂题」点击：开 push sheet（不立即推） */
  const handlePushQuizClick = React.useCallback(() => {
    setQuizPushSheetOpen(true)
  }, [])

  /** 进入即每秒自增 elapsedSec —— 仅作为 Header"已上 MM:SS"动效 */
  React.useEffect(() => {
    actions.reset()
    const t = window.setInterval(() => actions.tickElapsed(), 1000)
    return () => window.clearInterval(t)
  }, [actions])

  /** 退出快捷键：Esc */
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  const insight: AiClassroomLiveTeacherInsight = DEMO_LIVE_TEACHER_INSIGHT

  return (
    <motion.div
      key="ai-classroom-live-window"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className={cn(
        "pointer-events-auto absolute inset-y-0 left-0 z-[210] flex flex-col bg-[#0F1626] text-white",
      )}
      style={{ right: subCuiOpen ? 720 : 0 }}
    >
      {/* ============= Header ============= */}
      <header className="flex shrink-0 items-center gap-3 border-b border-white/10 bg-gradient-to-r from-[#1B2540] to-[#15203A] px-4 py-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-white">
          <Layers className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="m-0 truncate text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-white">
            AI 课堂 · {lessonTitle}
          </h2>
          <p className="m-0 truncate text-[length:var(--font-size-xs)] text-white/60">
            {live.teacher.name} · 直播中 · 已上 {formatElapsed(live.elapsedSec)} / 45:00
          </p>
        </div>
        {role === "teacher" ? (
          <span className="hidden md:inline-flex items-center gap-3 rounded-full bg-white/10 px-3 py-1 text-[length:var(--font-size-xs)] text-white/85">
            <span>抬头率 {insight.attendanceRate}%</span>
            <span className="text-white/35">·</span>
            <span>举手 {insight.raisedHands}</span>
            <span className="text-white/35">·</span>
            <span>
              答题 {insight.answered.done} / {insight.answered.total}
            </span>
          </span>
        ) : null}
        <button
          type="button"
          onClick={onClose}
          aria-label="退出 AI 课堂"
          className="flex size-9 shrink-0 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="h-[18px] w-[18px]" />
        </button>
      </header>

      {/* ============= 主体三栏 ============= */}
      <div className="relative flex min-h-0 flex-1">
        {/* 左：视频墙（按宽度占 28%，最小 280px）·
            老师视角：视频墙占上方 60%，下方 40% 是「实时学情仪表板」 */}
        <aside className="flex h-full min-h-0 w-[28%] min-w-[280px] flex-col border-r border-white/10 bg-[#101A30]">
          <div
            className={cn(
              "flex min-h-0 flex-col",
              role === "teacher" ? "flex-[3]" : "flex-1",
            )}
          >
            <AiClassroomLiveVideoWall
              role={role}
              teacher={live.teacher}
              students={live.students}
              selfMicOn={live.selfMicOn}
              selfCameraOn={live.selfCameraOn}
              selfHandRaised={live.selfHandRaised}
            />
          </div>
          {role === "teacher" ? (
            <div className="flex flex-[2] min-h-0 overflow-y-auto">
              <AiClassroomLiveTeacherInsightPanel insight={insight} className="w-full" />
            </div>
          ) : null}
        </aside>

        {/* 中：课件（quiz 进行中时上方覆盖一层 overlay） */}
        <main className="relative flex h-full min-h-0 flex-1 flex-col bg-bg">
          <AiClassroomLiveSlideStage
            role={role}
            currentIndex={live.currentSlideIndex}
            onPrev={() => actions.setSlideIndex(Math.max(1, live.currentSlideIndex - 1))}
            onNext={() => actions.setSlideIndex(live.currentSlideIndex + 1)}
            onTeacherToolToast={showToast}
          />
          <AiClassroomQuizOverlay role={role} lessonId={lessonId} snapshot={quiz} />
        </main>

        {/* 右：会话区（按宽度占 26%，最小 320px） */}
        <aside className="flex h-full min-h-0 w-[26%] min-w-[320px] flex-col border-l border-white/10 bg-bg">
          <AiClassroomLiveChatPanel
            role={role}
            lessonId={lessonId}
            botAvatarSrc={botAvatarSrc}
            userAvatarSrc={userAvatarSrc}
            classMessages={live.classMessages}
            onSendClassMessage={(msg) => actions.pushClassMessage(msg)}
            teacher={live.teacher}
            students={live.students}
            activeTab={chatTab}
            onActiveTabChange={setChatTab}
          />
        </aside>

        {/* Toast（中央顶部） */}
        {toast ? (
          <div
            className="pointer-events-none absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded-full bg-black/80 px-4 py-1.5 text-[length:var(--font-size-xs)] text-white shadow-lg"
            role="status"
          >
            {toast}
          </div>
        ) : null}
      </div>

      {/* ============= 工具栏 ============= */}
      <AiClassroomLiveToolbar
        role={role}
        selfMicOn={live.selfMicOn}
        selfCameraOn={live.selfCameraOn}
        selfHandRaised={live.selfHandRaised}
        onToggleMic={() => actions.setSelfMic(!live.selfMicOn)}
        onToggleCamera={() => actions.setSelfCamera(!live.selfCameraOn)}
        onToggleHandRaised={() => actions.setSelfHandRaised(!live.selfHandRaised)}
        onToolToast={showToast}
        onJumpToVvai={role === "student" ? () => setChatTab("vvai") : undefined}
        onPushQuiz={role === "teacher" ? handlePushQuizClick : undefined}
        quizActive={quiz.status !== "idle"}
        onExit={onClose}
      />

      {/* 推题面板（仅老师） */}
      {role === "teacher" ? (
        <AiClassroomQuizPushSheet
          open={quizPushSheetOpen}
          lessonId={lessonId}
          questionSeq={quiz.questionSeq}
          onClose={() => setQuizPushSheetOpen(false)}
          onPushed={(q) => showToast(`已推送：${q.stem.slice(0, 16)}…`)}
        />
      ) : null}
    </motion.div>
  )
}

function formatElapsed(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}
