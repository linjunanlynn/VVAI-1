/**
 * AI 课堂底部工具栏（v2：老师 / 学生 主操作差异化）。
 *
 * 设计原则：
 * - **学生**视角强调"听讲 + 提问 + 记录"——课堂里学生最高频的动作是举手、答题、记笔记、问 AI；
 * - **老师**视角强调"组织 + 评估 + 控场"——老师高频动作是推送随堂题、点名抽答、查看课堂洞察；
 * - 麦 / 摄 是两端都需要的基础控制，保持统一；
 * - 家长保留极简（仅麦/摄 + 退出），但当前产品要求只老师/学生进 AI 课堂，家长视图主要为兼容历史调用保留。
 *
 * 工具按钮 = 圆角 pill + 图标 + label；激活态用 tone 色背景。
 */

import * as React from "react"
import {
  Bookmark,
  ClipboardList,
  Hand,
  LogOut,
  MessageSquare,
  Mic,
  MicOff,
  NotebookPen,
  Sparkles,
  UserCheck,
  Video,
  VideoOff,
} from "lucide-react"
import { cn } from "../ui/utils"
import type { EduLessonAttendingRole } from "./homeScenarioLayout"

export interface AiClassroomLiveToolbarProps {
  role: EduLessonAttendingRole
  selfMicOn: boolean
  selfCameraOn: boolean
  selfHandRaised: boolean
  onToggleMic: () => void
  onToggleCamera: () => void
  onToggleHandRaised: () => void
  /** 占位 toast：点名 / 笔记 / 板书等 */
  onToolToast: (label: string) => void
  /**
   * 学生「提问 VVAI」按钮：把右侧会话区切到 VVAI 消息 tab。
   * 由 LiveWindow 提供（提升 chatTab state）；不传则按钮不渲染。
   */
  onJumpToVvai?: () => void
  /**
   * 老师「推随堂题」按钮：打开 push sheet。由 LiveWindow 提供；不传则按钮不渲染。
   * 学生 / 家长视角看不到这个按钮。
   */
  onPushQuiz?: () => void
  /** 当前是否有进行中的随堂题（用于 label 文案差异化：进行中显示"题目进行中"+disable，否则"推随堂题") */
  quizActive?: boolean
  /** 退出课堂浮层 */
  onExit: () => void
}

export function AiClassroomLiveToolbar({
  role,
  selfMicOn,
  selfCameraOn,
  selfHandRaised,
  onToggleMic,
  onToggleCamera,
  onToggleHandRaised,
  onToolToast,
  onJumpToVvai,
  onPushQuiz,
  quizActive,
  onExit,
}: AiClassroomLiveToolbarProps) {
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-border bg-bg px-4 py-3 shadow-[0_-2px_8px_rgba(15,23,42,0.04)]">
      {/* ===== 基础设备控制（三身份共用） ===== */}
      <ToolButton
        active={selfMicOn}
        onClick={onToggleMic}
        label={selfMicOn ? "静音" : "解除静音"}
        icon={selfMicOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
        tone={selfMicOn ? "success" : "neutral"}
      />
      <ToolButton
        active={selfCameraOn}
        onClick={onToggleCamera}
        label={selfCameraOn ? "关闭摄像头" : "开启摄像头"}
        icon={
          selfCameraOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />
        }
        tone={selfCameraOn ? "success" : "neutral"}
      />

      {/* 视觉分组分隔条 */}
      {role === "teacher" || role === "student" ? (
        <span aria-hidden className="mx-1 h-6 w-px bg-border" />
      ) : null}

      {/* ===== 学生主操作：举手 → 答题 → 记笔记 → 提问 VVAI ===== */}
      {role === "student" ? (
        <>
          <ToolButton
            active={selfHandRaised}
            onClick={onToggleHandRaised}
            label={selfHandRaised ? "放下手" : "举手"}
            icon={<Hand className="h-4 w-4" />}
            tone={selfHandRaised ? "warning" : "neutral"}
          />
          <ToolButton
            onClick={() => onToolToast("答题板已推送（demo 占位）")}
            label="答题"
            icon={<ClipboardList className="h-4 w-4" />}
          />
          <ToolButton
            onClick={() => onToolToast("已记入本节笔记（demo 占位）")}
            label="做笔记"
            icon={<NotebookPen className="h-4 w-4" />}
          />
          {/**
           * 「不懂就标」：学生在听课过程中点一下即可记录这一段「我没听懂」，
           * 不打断课堂节奏；下课后 AI 会自动给被标记的片段配讲解视频，
           * 同时这段标记会自动归入今晚错题本/课后回看清单。
           */}
          <ToolButton
            onClick={() =>
              onToolToast("已标记「这里不懂」· 下课后 AI 会自动给这段配讲解")
            }
            label="不懂就标"
            icon={<Bookmark className="h-4 w-4" />}
            tone="warning"
          />
          {onJumpToVvai ? (
            <ToolButton
              onClick={onJumpToVvai}
              label="提问 VVAI"
              icon={<MessageSquare className="h-4 w-4" />}
              tone="primary"
            />
          ) : null}
        </>
      ) : null}

      {/* ===== 老师主操作：推随堂题 → 点名 → 课堂洞察 ===== */}
      {role === "teacher" ? (
        <>
          <ToolButton
            onClick={() => onPushQuiz?.()}
            label={quizActive ? "题目进行中" : "推随堂题"}
            icon={<ClipboardList className="h-4 w-4" />}
            tone="primary"
            active={quizActive}
          />
          <ToolButton
            onClick={() => onToolToast("已发起点名 · 张同学（demo 占位）")}
            label="点名"
            icon={<UserCheck className="h-4 w-4" />}
          />
          <ToolButton
            onClick={() => onToolToast("课堂洞察 · 抬头率 85% / 答题 6 / 8")}
            label="课堂洞察"
            icon={<Sparkles className="h-4 w-4" />}
          />
        </>
      ) : null}

      {/* 右侧：退出 */}
      <span className="ml-auto" />
      <button
        type="button"
        onClick={onExit}
        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--color-warning)]/45 bg-[var(--color-warning)]/10 px-3 text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] text-[var(--color-warning)] transition-colors hover:bg-[var(--color-warning)]/16"
        aria-label="退出课堂"
      >
        <LogOut className="h-4 w-4" />
        退出课堂
      </button>
    </div>
  )
}

function ToolButton({
  active,
  onClick,
  label,
  icon,
  tone = "neutral",
}: {
  active?: boolean
  onClick: () => void
  label: string
  icon: React.ReactNode
  /**
   * tone="primary" 用于"主推按钮"（学生：提问 VVAI；老师：推随堂题），即使非 active 也显示主色填充，
   * 让差异化操作在工具栏视觉上一眼可见。
   */
  tone?: "primary" | "success" | "warning" | "neutral"
}) {
  /** primary tone：默认就是主色填充（提示重点动作），无 active 区分 */
  if (tone === "primary" && !active) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--color-primary)]/55 bg-[var(--color-primary)] px-3 text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] text-[var(--color-primary-foreground,white)] shadow-sm transition-colors hover:bg-primary-hover",
        )}
      >
        {icon}
        {label}
      </button>
    )
  }

  const activeClass =
    tone === "success"
      ? "border-[var(--color-success)]/50 bg-[var(--color-success)]/10 text-[var(--color-success)]"
      : tone === "warning"
        ? "border-[var(--color-warning)]/50 bg-[var(--color-warning)]/12 text-[var(--color-warning)]"
        : "border-[var(--color-primary)]/55 bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] transition-colors",
        active
          ? activeClass
          : "border-border bg-bg text-text-secondary hover:bg-[var(--black-alpha-11)] hover:text-text",
      )}
    >
      {icon}
      {label}
    </button>
  )
}
