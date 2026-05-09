/**
 * 系列课子 CUI（一期课包的整期会话主体）—— **统一容器**版本。
 *
 * 与单课 panel 的边界（v3 → v4 重构）：
 * - **整个系列 = 唯一一个子 CUI 窗口**：进入即按"用户身份 × 上节待办完成度 × 当前 stage"
 *   智能定位到某节，并把该节的完整能力（教师控制条、清单卡 / 现场卡、18 张 Skill 卡能力条、
 *   ChatSender、追问历史）原地展示。
 * - **不再存在"跳转到独立单课 panel"的入口**：所有节的对话都能在本 panel 内通过顶部
 *   抽屉切换；用户从来只与一个窗口交互。
 * - 顶部 Header「红框」整行可点击 → 展开抽屉，自由切到任意一节；抽屉内的小按钮
 *   ⏰ 调课 / 🙋 请假会切到目标节并在该节 thread 推一张表单卡。
 *
 * 实现要点：
 * - 内容主体 = `<AiClassroomSideConversationPanel embedded />`（同一个组件，embedded 模式）
 * - 主线节（boundLessonId === DEMO_LESSON.id）：完整 18 卡 + 教师控制条
 *   非主线节（合成 threadKey）：复用同一组件，但 `suppressChecklist=true` 避免错位
 * - 调课 / 请假表单卡 marker 由单课 panel 通过 `seriesContext` 自识别 + 自渲染；
 *   提交 & 取消的"写库 + IM 推送"由本系列 panel 兜底（其它即"push 回执卡到当前 thread"
 *   由单课 panel 内部 helper 完成）
 * - 抽屉内"调课 / 请假"action：直接写入目标 outline thread 的 sessionStorage + bump
 *   forceReloadCount → inline 单课 panel remount → 自动 load 到刚 push 的表单卡
 *
 * 持久化：
 * - 每节 outline 一个 thread；key 由 `getOutlineThreadKey(series, outline)` 决定
 * - 主线节复用单课 thread key（`DEMO_LESSON.id`）；其它节走 `${seriesId}__outline_${index}`
 */

import * as React from "react"
import { CalendarDays, CheckCircle2, ChevronDown, ChevronUp, Clock, Layers, X } from "lucide-react"
import { currentUser, type Message } from "../chat/data"
import { VvAiLogo } from "../chat/ChatComponents"
import { cn } from "../ui/utils"
import {
  type AiClassroomLessonSeries,
  type AiClassroomSeriesLessonOutline,
} from "./aiClassroomLessonSeriesDemo"
import {
  loadAiClassroomSideThread,
  saveAiClassroomSideThread,
} from "./aiClassroomSidePersistence"
import {
  addSeriesRescheduleRecord,
  addSeriesLeaveRecord,
} from "./aiClassroomLessonSeriesPersistence"
import {
  decideInitialActiveOutlineIndex,
  getOutlineThreadKey,
} from "./aiClassroomSeriesNavigation"
import {
  buildSeriesRescheduleFormContent,
  buildSeriesLeaveFormContent,
} from "./aiClassroomSeriesPanelMarkers"
import { AiClassroomSeriesOutlineDrawer } from "./AiClassroomSeriesOutlineDrawer"
import { EDU_IM_PRESETS } from "./eduImBus"
import {
  AiClassroomSideConversationPanel,
  type AiClassroomSeriesContextForPanel,
} from "./AiClassroomSideConversationPanel"
import { DEMO_LESSON, getLessonRuntimeState } from "./aiClassroomLessonDemo"
import { findLessonSummary } from "./aiClassroomLessonsDemo"
import type { EduLessonAttendingRole } from "./homeScenarioLayout"
import type { EducationStage } from "./educationStageDemo"
import type { LessonDeliveryMode } from "./lessonDeliveryMode"

/* ============================================================
 * 公共：外部打开请求
 * ============================================================ */

export interface AiClassroomSeriesSidePanelOpenRequest {
  /** 触发来源（仅用于 demo 内追踪） */
  source?: "schedule" | "im-banner"
}

function addMinutesToClock(clock: string, minutes: number): string | null {
  const m = clock.match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return null
  const total = Number(m[1]) * 60 + Number(m[2]) + minutes
  const hh = Math.floor(total / 60) % 24
  const mm = total % 60
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`
}

export function formatSeriesOutlineScheduleLabel(outline: AiClassroomSeriesLessonOutline): string {
  const summary = outline.boundLessonId ? findLessonSummary(outline.boundLessonId) : null
  if (summary) {
    return outline.scheduleLabel.replace(
      /(\d{1,2}:\d{2})/,
      `${summary.startTime}-${summary.endTime}`,
    )
  }

  const clock = outline.scheduleLabel.match(/(\d{1,2}:\d{2})/)?.[1]
  const end = clock ? addMinutesToClock(clock, 45) : null
  return clock && end ? outline.scheduleLabel.replace(clock, `${clock}-${end}`) : outline.scheduleLabel
}

function getSeriesOutlineEndTime(outline: AiClassroomSeriesLessonOutline): string {
  const summary = outline.boundLessonId ? findLessonSummary(outline.boundLessonId) : null
  if (summary) return summary.endTime

  const label = formatSeriesOutlineScheduleLabel(outline)
  return label.match(/-(\d{1,2}:\d{2})/)?.[1] ?? "19:45"
}

/* ============================================================
 * Panel 主体
 * ============================================================ */

export interface AiClassroomSeriesSideConversationPanelProps {
  role: EduLessonAttendingRole
  stage: EducationStage
  series: AiClassroomLessonSeries
  pendingRequest: AiClassroomSeriesSidePanelOpenRequest | null
  onConsumePendingRequest: () => void
  botAvatarSrc: string
  userAvatarSrc: string
  userDisplayName?: string
  onClose: () => void
  /**
   * 教师 stage 切换回写：仅主线节 + teacher 时由 inline 单课 panel 触发；
   * 系列 panel 直接透传，不做拦截。
   * 不传 = 单课 panel 不显示教师控制条（向后兼容）。
   */
  onStageChange?: (next: EducationStage) => void
  /** 课程形态（向 inline 单课 panel 透传） */
  deliveryMode?: LessonDeliveryMode
  /**
   * 触发打开 AI 课堂浮层。系列 panel 直接透传给 inline 单课 panel；
   * 仅当当前 active outline 是主线节时单课 panel 内才会出现入口。
   */
  onOpenLiveClass?: () => void
}

export function AiClassroomSeriesSideConversationPanel({
  role,
  stage,
  series,
  pendingRequest,
  onConsumePendingRequest,
  botAvatarSrc,
  userAvatarSrc,
  userDisplayName = "我",
  onClose,
  onStageChange,
  deliveryMode = "online",
  onOpenLiveClass,
}: AiClassroomSeriesSideConversationPanelProps) {
  /* --------------------------
   * 智能定位：每次 series / role / stage 变化都重新计算
   * -------------------------- */
  const initialActiveIndex = React.useMemo(
    () => decideInitialActiveOutlineIndex(series, role, stage),
    [series, role, stage],
  )
  const [activeOutlineIndex, setActiveOutlineIndex] = React.useState<number>(initialActiveIndex)
  React.useEffect(() => {
    setActiveOutlineIndex(initialActiveIndex)
  }, [initialActiveIndex])

  const activeOutline = React.useMemo(
    () => series.outlines.find((o) => o.index === activeOutlineIndex) ?? series.outlines[0],
    [series, activeOutlineIndex],
  )
  const threadKey = React.useMemo(
    () => getOutlineThreadKey(series, activeOutline),
    [series, activeOutline],
  )

  /** 主线节 = 已绑到 DEMO_LESSON 的 outline；这种节才适合启用清单卡 / 教师控制条 / 18 卡完整能力 */
  const isMainOutline = activeOutline.boundLessonId === DEMO_LESSON.id

  /* --------------------------
   * 抽屉
   * -------------------------- */
  const [drawerOpen, setDrawerOpen] = React.useState(false)

  /* --------------------------
   * 强制 inline 单课 panel 重挂的计数（用于"在当前 active outline 上 push 表单卡"等
   * 不会改 lessonId 的场景下也能让 panel 重新 load thread）
   * -------------------------- */
  const [forceReloadCount, setForceReloadCount] = React.useState(0)

  /** 消费外部 pendingRequest（暂只用作激活 panel；定位由 useMemo 已自动计算） */
  React.useEffect(() => {
    if (!pendingRequest) return
    onConsumePendingRequest()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingRequest])

  /* --------------------------
   * 把 user + AI 表单卡两条消息直接写入目标 outline thread 的 sessionStorage，
   * 然后切到该节并 bump reload 计数 → inline 单课 panel remount → loadAiClassroomSideThread
   * 自动捞到刚追加的表单卡。
   *
   * 之所以走 sessionStorage 而非 React 通信：单课 panel 是独立 state owner，
   * 系列 panel 不应该 reach 进它的 setMessages；用 storage 透出更解耦。
   * -------------------------- */
  const pushFormToOutlineThread = React.useCallback(
    (
      outline: AiClassroomSeriesLessonOutline,
      userText: string,
      formContent: string,
    ) => {
      const targetKey = getOutlineThreadKey(series, outline)
      const existing = loadAiClassroomSideThread(role, targetKey)
      const now = Date.now()
      const ts = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      const next: Message[] = [
        ...existing,
        {
          id: `aic-series-u-${now}`,
          senderId: currentUser.id,
          content: userText,
          timestamp: ts,
          createdAt: now,
        },
        {
          id: `aic-series-form-${now + 1}`,
          senderId: "ai-assistant",
          content: formContent,
          timestamp: ts,
          createdAt: now + 1,
        },
      ]
      saveAiClassroomSideThread(role, targetKey, next)
    },
    [role, series],
  )

  /* --------------------------
   * 抽屉内"该 outline 的 ⏰ 调课"按钮
   * -------------------------- */
  const handlePickRescheduleForOutline = React.useCallback(
    (outline: AiClassroomSeriesLessonOutline) => {
      setDrawerOpen(false)
      pushFormToOutlineThread(
        outline,
        `调课：第 ${outline.index} 节《${outline.title}》`,
        buildSeriesRescheduleFormContent({
          seriesId: series.id,
          outlineIndex: outline.index,
        }),
      )
      setActiveOutlineIndex(outline.index)
      setForceReloadCount((c) => c + 1)
    },
    [pushFormToOutlineThread, series.id],
  )

  /* --------------------------
   * 抽屉内"该 outline 的 🙋 请假"按钮
   * -------------------------- */
  const handlePickLeaveForOutline = React.useCallback(
    (outline: AiClassroomSeriesLessonOutline) => {
      const byRole: "student" | "parent" = role === "parent" ? "parent" : "student"
      setDrawerOpen(false)
      pushFormToOutlineThread(
        outline,
        `${byRole === "parent" ? "代孩子请假" : "请假"}：第 ${outline.index} 节《${outline.title}》`,
        buildSeriesLeaveFormContent({
          seriesId: series.id,
          outlineIndex: outline.index,
          byRole,
        }),
      )
      setActiveOutlineIndex(outline.index)
      setForceReloadCount((c) => c + 1)
    },
    [pushFormToOutlineThread, role, series.id],
  )

  const handlePickOutline = React.useCallback(
    (outline: AiClassroomSeriesLessonOutline) => {
      setDrawerOpen(false)
      setActiveOutlineIndex(outline.index)
    },
    [],
  )

  /* --------------------------
   * 表单卡提交回调：写库 + IM 推送（不 push 回执 marker，由单课 panel 的 onPushAi 完成）
   * -------------------------- */
  const handleSubmitReschedule = React.useCallback<
    AiClassroomSeriesContextForPanel["onSubmitReschedule"]
  >(
    (outline, input) => {
      addSeriesRescheduleRecord({
        seriesId: series.id,
        outlineIndex: outline.index,
        fromLabel: outline.scheduleLabel,
        toLabel: input.toLabel,
        toScheduledAt: input.toScheduledAt,
        reason: input.reason,
        at: Date.now(),
      })
      EDU_IM_PRESETS.seriesRescheduleToParent({
        seriesName: series.name,
        fromLabel: outline.scheduleLabel,
        toLabel: input.toLabel,
      })
      EDU_IM_PRESETS.seriesRescheduleToStudent({
        seriesName: series.name,
        fromLabel: outline.scheduleLabel,
        toLabel: input.toLabel,
      })
    },
    [series.id, series.name],
  )

  const handleSubmitLeave = React.useCallback<
    AiClassroomSeriesContextForPanel["onSubmitLeave"]
  >(
    (outline, byRole, input) => {
      addSeriesLeaveRecord({
        seriesId: series.id,
        outlineIndex: outline.index,
        role: byRole,
        type: input.type,
        needMakeUp: input.needMakeUp,
        reason: input.reason,
        at: Date.now(),
      })
      const lessonLabel = `第 ${outline.index} 节《${outline.title}》`
      if (byRole === "parent") {
        EDU_IM_PRESETS.seriesLeaveFromParent({ seriesName: series.name, lessonLabel })
      } else {
        EDU_IM_PRESETS.seriesLeaveFromStudent({ seriesName: series.name, lessonLabel })
      }
    },
    [series.id, series.name],
  )

  const handleCancelForm = React.useCallback(() => {
    /** 取消 = 仅打个 noop；单课 panel 内 onPushAi 自己 push 一条「好的，本次不调课/请假」反馈。 */
  }, [])

  const activeScheduleLabel = formatSeriesOutlineScheduleLabel(activeOutline)
  const isLiveMainOutline = isMainOutline && stage === "in"
  const isPostMainOutline = isMainOutline && stage === "post"
  const isCompletedOutline = activeOutline.staticStatus === "past" || isPostMainOutline
  const activeEndTime = getSeriesOutlineEndTime(activeOutline)
  const runtime = getLessonRuntimeState(stage)
  const liveElapsed = runtime.liveElapsed
  const currentLessonMeta = isLiveMainOutline
    ? `已上课 ${liveElapsed} · ${activeEndTime}下课`
    : isPostMainOutline
      ? `本节课已结束 · ${activeScheduleLabel}`
      : activeScheduleLabel
  const toggleDrawer = React.useCallback(() => {
    setDrawerOpen((prev) => !prev)
  }, [])
  const handleDrawerTriggerKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault()
        toggleDrawer()
      }
    },
    [toggleDrawer],
  )

  /* --------------------------
   * inline 单课 panel 的 props
   * -------------------------- */
  const seriesContextValue = React.useMemo<AiClassroomSeriesContextForPanel>(
    () => ({
      series,
      outline: activeOutline,
      onSubmitReschedule: handleSubmitReschedule,
      onSubmitLeave: handleSubmitLeave,
      onCancelForm: handleCancelForm,
    }),
    [series, activeOutline, handleSubmitReschedule, handleSubmitLeave, handleCancelForm],
  )

  return (
    <div className="pointer-events-auto flex h-full min-h-0 min-w-0 w-full flex-col border-l border-[#e8ecf0] bg-cui-bg shadow-[-12px_0_32px_rgba(15,23,42,0.08)]">
      {/* ====== Header 顶部：VVAI Logo（左） · "AI课堂"真居中 · 关闭（右） ======
       *
       * 三栏栅格 `1fr_auto_1fr`：
       * - 左栏（1fr）：《主CUI交互》同款 `<VvAiLogo />` 品牌字标
       * - 中栏（auto）：固定文字「AI课堂」（不再展示具体系列 / 课名 / 周期 / 老师等元数据），
       *   借助两侧等宽栅格实现「整条 header 真居中」
       * - 右栏（1fr）：关闭按钮，右对齐
       *
       * 高度：`min-h-[var(--space-900)]` + `py-[var(--space-150)]` 与《主CUI交互》顶 bar 完全对齐。
       */}
      <header className="flex shrink-0 flex-col border-b border-border">
        <div className="grid min-h-[var(--space-900)] grid-cols-[1fr_auto_1fr] items-center gap-3 px-3 py-[var(--space-150)]">
          {/* Left · VVAI logo */}
          <div className="flex min-w-0 items-center">
            <VvAiLogo />
          </div>

          {/* Center · "AI课堂"（真居中，固定文案） */}
          <div className="flex min-w-0 max-w-[min(60vw,560px)] items-center gap-[var(--space-150)] text-center">
            <h2 className="m-0 truncate text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-text">
              AI课堂
            </h2>
          </div>

          {/* Right · 关闭按钮 */}
          <div className="flex min-w-0 items-center justify-end">
            <button
              type="button"
              onClick={onClose}
              className="flex size-9 shrink-0 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-[var(--black-alpha-11)] hover:text-text"
              aria-label="关闭 AI 课堂"
            >
              <X className="size-[18px]" strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* ====== 系列课课次条 · 单行整合版（直接衔接顶 bar 下方）======
         *
         * 信息结构（左 → 右）：
         *   [Layers icon] 系列名（第 N/M 节）  ·  王老师 · 班级 · 周期
         *   ──────── 弹性留白 ────────
         *   [展开/收起 chevron]
         *
         * 设计：
         * - 整条作为 button 直接以 header 边框接到顶 bar 下方，无外层灰色 wrapper；
         * - 右侧仅保留一个展开/收起 chevron icon，不再带文字与列表 icon；
         * - 整条可点（与 chevron 同步切换 drawer）。
         * - 「进入 AI 互动课堂」CTA 已统一下沉至子 CUI 底部应用条「在线教室」按钮，
         *   不在课次条右侧重复出现，避免上下两处入口重复。
         */}
        <div
          role="button"
          tabIndex={0}
          onClick={toggleDrawer}
          onKeyDown={handleDrawerTriggerKeyDown}
          aria-expanded={drawerOpen}
          aria-label={drawerOpen ? "收起其他课次" : "展开其他课次"}
          className={cn(
            "grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-[var(--space-300)] border-t border-border/60 px-3 py-[var(--space-200)] text-left transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/30",
            drawerOpen
              ? "bg-[var(--color-primary)]/6"
              : "bg-transparent hover:bg-bg-secondary/50",
          )}
        >
          {/* Left · 系列与课次信息 */}
          <span className="flex min-w-0 items-center gap-[var(--space-200)]">
            {isLiveMainOutline ? (
              <span
                aria-hidden
                className="inline-flex h-2 w-2 shrink-0 rounded-full bg-[var(--color-success)] animate-pulse shadow-[0_0_0_3px_rgba(34,197,94,0.16)]"
              />
            ) : null}
            <Layers
              className="h-4 w-4 shrink-0 text-[var(--color-primary)]"
              aria-hidden
            />
            <span className="min-w-0 truncate text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-text">
              {series.name}
              <span className="ml-[var(--space-100)] text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] text-[var(--color-primary)] tabular-nums">
                （第 {activeOutline.index} / {series.totalLessons} 节）
              </span>
            </span>
            <span className="hidden shrink-0 truncate text-[length:var(--font-size-xs)] text-text-tertiary md:inline">
              · {series.teacher} · {series.className} · {series.periodLabel}
            </span>
            {isCompletedOutline ? (
              <span className="hidden lg:inline-flex shrink-0 items-center rounded-full border border-border bg-bg-secondary px-[var(--space-200)] py-[1px] text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] text-text-tertiary">
                已完课
              </span>
            ) : null}
          </span>

          {/* Right · 展开/收起 chevron icon（live CTA 已下沉至底部「在线教室」按钮） */}
          <span className="flex shrink-0 items-center gap-[var(--space-200)]">
            {drawerOpen ? (
              <ChevronUp
                className="h-4 w-4 shrink-0 text-text-secondary"
                aria-hidden
              />
            ) : (
              <ChevronDown
                className="h-4 w-4 shrink-0 text-text-secondary"
                aria-hidden
              />
            )}
          </span>
        </div>

        {/* ====== Header 红框抽屉 ====== */}
        {drawerOpen ? (
          <AiClassroomSeriesOutlineDrawer
            series={series}
            role={role}
            stage={stage}
            activeOutlineIndex={activeOutlineIndex}
            onPickOutline={handlePickOutline}
            onPickReschedule={handlePickRescheduleForOutline}
            onPickLeave={handlePickLeaveForOutline}
            onClose={() => setDrawerOpen(false)}
          />
        ) : null}
      </header>

      {/* ======================================================
        内容主体：直接 inline 单课 panel（embedded 模式）
        - lessonId = threadKey（主线 = DEMO_LESSON.id；非主线 = 合成 key）
        - lessonTitle = activeOutline.title
        - 主线节传 onStageChange + 不抑制清单 + 启用全部 18 卡能力
        - 非主线节 suppressChecklist=true，避免主线清单卡错位
        - seriesContext = 让单课 panel 内 MessageBubble 识别 + 渲染系列 marker
        - key 包含 forceReloadCount：方便系列 panel 在不切 outline 的情况下让单课 panel
          重新 load thread（例如抽屉里点了 ⏰/🙋 按钮，targetOutline 就是当前 active 的情况）
        ====================================================== */}
      <div className="flex min-h-0 flex-1 min-w-0">
        <AiClassroomSideConversationPanel
          key={`series-${series.id}-outline-${activeOutline.index}-r${forceReloadCount}`}
          role={role}
          stage={stage}
          deliveryMode={deliveryMode}
          lessonId={threadKey}
          lessonTitle={activeOutline.title}
          pendingRequest={null}
          onConsumePendingRequest={() => {}}
          botAvatarSrc={botAvatarSrc}
          userAvatarSrc={userAvatarSrc}
          userDisplayName={userDisplayName}
          onClose={onClose}
          onStageChange={isMainOutline ? onStageChange : undefined}
          onOpenLiveClass={isMainOutline ? onOpenLiveClass : undefined}
          embedded
          suppressTeacherControlStrip
          suppressChecklist={!isMainOutline}
          seriesContext={seriesContextValue}
        />
      </div>
    </div>
  )
}
