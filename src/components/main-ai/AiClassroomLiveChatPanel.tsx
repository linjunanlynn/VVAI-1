/**
 * AI 课堂右栏：会话区。
 *
 * 双 tab：
 * - 「课堂消息」：所有人公开的课堂聊天 + 系统消息（举手 / 答题统计 / 入退）
 *   - 老师：可发；学生：可发；家长：只读（默认禁言）
 * - 「VVAI 消息」（v2 改名，原"VVAI 助理"）：与子 CUI 主线 thread 共享（双向同步）
 *   - 老师 / 学生进 AI 课堂时，进入即看到子 CUI 内的全部历史；
 *     这里发的消息会同步回子 CUI；子 CUI 后续发的消息也会同步过来。
 *   - 跨窗口同步通道见 `aiClassroomLiveSharedThread`（BroadcastChannel + sessionStorage）。
 */

import * as React from "react"
import { cn } from "../ui/utils"
import { Send } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar"
import { type Message, currentUser } from "../chat/data"
import {
  type AiClassroomLiveClassMessage,
  type AiClassroomLiveStudentDemo,
  type AiClassroomLiveTeacherDemo,
  DEMO_LIVE_PARENT_CHILD_ID,
} from "./aiClassroomLiveDemo"
import {
  loadAiClassroomLessonThread,
  publishAiClassroomLessonThread,
  subscribeAiClassroomLessonThread,
} from "./aiClassroomLiveSharedThread"
import {
  AIC_REPLY_MARKER,
  buildReply,
  parseAiClassroomReply,
  serializeAiClassroomReply,
} from "./aiClassroomReply"
import type { EduLessonAttendingRole } from "./homeScenarioLayout"

export type AiClassroomLiveChatTab = "class" | "vvai"

export interface AiClassroomLiveChatPanelProps {
  role: EduLessonAttendingRole
  /** 主线 lessonId（用于 VVAI thread 共享 key） */
  lessonId: string
  botAvatarSrc: string
  userAvatarSrc: string
  classMessages: AiClassroomLiveClassMessage[]
  /** 老师 / 学生 / 家长发课堂消息时由父级 push 到 store */
  onSendClassMessage: (msg: AiClassroomLiveClassMessage) => void
  /** 用于课堂消息身份信息（自己的名字 / 头像） */
  teacher: AiClassroomLiveTeacherDemo
  students: AiClassroomLiveStudentDemo[]
  /**
   * 受控的当前 tab。
   * 不传 = 内部自管（向后兼容）；
   * 传入 = 外部（如 LiveWindow / 工具栏「提问 VVAI」按钮）控制 tab 切换。
   */
  activeTab?: AiClassroomLiveChatTab
  onActiveTabChange?: (tab: AiClassroomLiveChatTab) => void
}

export function AiClassroomLiveChatPanel({
  role,
  lessonId,
  botAvatarSrc,
  userAvatarSrc,
  classMessages,
  onSendClassMessage,
  teacher,
  students,
  activeTab: activeTabProp,
  onActiveTabChange,
}: AiClassroomLiveChatPanelProps) {
  /**
   * tab 状态：受控 or 自管。
   * - 受控：外部传 `activeTab`（LiveWindow 提升 state，便于工具栏跳转 / 老师与学生默认值差异化）；
   * - 自管：本地 useState，默认 "class"，与受控分支保持一致。
   */
  const [internalTab, setInternalTab] = React.useState<AiClassroomLiveChatTab>("class")
  const activeTab = activeTabProp ?? internalTab
  const setActiveTab = React.useCallback(
    (next: AiClassroomLiveChatTab) => {
      if (activeTabProp === undefined) setInternalTab(next)
      onActiveTabChange?.(next)
    },
    [activeTabProp, onActiveTabChange],
  )
  const [classDraft, setClassDraft] = React.useState("")
  const [vvaiDraft, setVvaiDraft] = React.useState("")

  /* --------------------------
   * 自己的身份信息（用于课堂发言落款）
   * - 老师：DEMO_LIVE_TEACHER
   * - 学生：DEMO_LIVE_STUDENTS 中 isSelf
   * - 家长：占位（家长禁言不会用到，但保留兜底）
   * -------------------------- */
  const selfIdentity = React.useMemo(() => {
    if (role === "teacher") {
      return {
        senderId: teacher.id,
        senderName: teacher.name,
        senderRole: "teacher" as const,
      }
    }
    if (role === "student") {
      const me = students.find((s) => s.isSelf)
      return {
        senderId: me?.id ?? "stu-self",
        senderName: me?.name ?? "我",
        senderRole: "student" as const,
      }
    }
    /** parent：禁言；如果硬要 push 也走 child 名义 */
    const child = students.find((s) => s.id === DEMO_LIVE_PARENT_CHILD_ID)
    return {
      senderId: child?.id ?? "parent-anon",
      senderName: child?.name ?? "家长",
      senderRole: "student" as const,
    }
  }, [role, teacher, students])

  /* --------------------------
   * VVAI thread：与子 CUI 共享（pub/sub bus + sessionStorage）
   * -------------------------- */
  const [vvaiMessages, setVvaiMessages] = React.useState<Message[]>(() =>
    loadAiClassroomLessonThread(role, lessonId),
  )
  /** 标记"上次自己发布的引用"，避免订阅 cb 触发自循环 setState */
  const lastLocalRef = React.useRef<Message[] | null>(vvaiMessages)

  React.useEffect(() => {
    const unsub = subscribeAiClassroomLessonThread(role, lessonId, (next) => {
      if (next === lastLocalRef.current) return
      lastLocalRef.current = next
      setVvaiMessages(next)
    })
    return unsub
  }, [role, lessonId])

  /** lessonId / role 切换时重新 load（理论上 LiveWindow 内 lesson 不会变，但保险起见） */
  React.useEffect(() => {
    const fresh = loadAiClassroomLessonThread(role, lessonId)
    lastLocalRef.current = fresh
    setVvaiMessages(fresh)
  }, [role, lessonId])

  /* --------------------------
   * 滚动到底
   * -------------------------- */
  const classScrollRef = React.useRef<HTMLDivElement>(null)
  const vvaiScrollRef = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    if (activeTab !== "class") return
    const el = classScrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [activeTab, classMessages.length])
  React.useEffect(() => {
    if (activeTab !== "vvai") return
    const el = vvaiScrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [activeTab, vvaiMessages.length])

  /* --------------------------
   * 课堂消息发送
   * -------------------------- */
  const canSendClassMessage = role !== "parent"
  const sendClassMessage = React.useCallback(() => {
    if (!canSendClassMessage) return
    const text = classDraft.trim()
    if (!text) return
    setClassDraft("")
    const now = new Date()
    const ts = `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes(),
    ).padStart(2, "0")}`
    onSendClassMessage({
      id: `m-live-${Date.now()}`,
      senderId: selfIdentity.senderId,
      senderName: selfIdentity.senderName,
      senderRole: selfIdentity.senderRole,
      content: text,
      timestamp: ts,
    })
  }, [canSendClassMessage, classDraft, onSendClassMessage, selfIdentity])

  /* --------------------------
   * VVAI 发送：写 thread + bus.publish 让子 CUI 同步
   * -------------------------- */
  const sendVvaiMessage = React.useCallback(() => {
    const text = vvaiDraft.trim()
    if (!text) return
    setVvaiDraft("")
    const now = Date.now()
    const ts = new Date(now).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })
    /** push 用户 + 一条 mock VVAI 回复（demo 占位） */
    const userMsg: Message = {
      id: `aic-live-vvai-u-${now}`,
      senderId: currentUser.id,
      content: text,
      timestamp: ts,
      createdAt: now,
    }
    const aiReply = buildLiveVvaiReply({ role, prompt: text })
    const aiMsg: Message = {
      id: `aic-live-vvai-a-${now + 1}`,
      senderId: "ai-assistant",
      content: serializeAiClassroomReply(aiReply),
      timestamp: ts,
      createdAt: now + 1,
    }
    const next = [...vvaiMessages, userMsg, aiMsg]
    lastLocalRef.current = next
    setVvaiMessages(next)
    publishAiClassroomLessonThread(role, lessonId, next)
  }, [vvaiDraft, vvaiMessages, role, lessonId])

  /* --------------------------
   * Render
   * -------------------------- */
  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      {/* Tab 切换 */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border bg-bg px-3 py-2">
        <TabButton
          active={activeTab === "class"}
          onClick={() => setActiveTab("class")}
          label="课堂消息"
          subLabel={String(classMessages.length)}
        />
        <TabButton
          active={activeTab === "vvai"}
          onClick={() => setActiveTab("vvai")}
          label="VVAI 消息"
          subLabel={String(vvaiMessages.length)}
        />
        <span className="ml-auto text-[length:var(--font-size-xs)] text-text-tertiary">
          {activeTab === "class"
            ? role === "parent"
              ? "家长视图：只读"
              : "全班可见"
            : "VVAI 消息 · 与子 CUI 实时同步"}
        </span>
      </div>

      {/* 主体 */}
      {activeTab === "class" ? (
        <ClassMessageList
          ref={classScrollRef}
          messages={classMessages}
          teacherId={teacher.id}
          selfId={selfIdentity.senderId}
        />
      ) : (
        <VvaiMessageList
          ref={vvaiScrollRef}
          messages={vvaiMessages}
          botAvatarSrc={botAvatarSrc}
          userAvatarSrc={userAvatarSrc}
        />
      )}

      {/* 输入区 */}
      <div className="shrink-0 border-t border-border bg-cui-bg px-3 py-2">
        {activeTab === "class" ? (
          <CompactSender
            value={classDraft}
            onChange={setClassDraft}
            onSubmit={sendClassMessage}
            disabled={!canSendClassMessage}
            placeholder={
              canSendClassMessage
                ? "在课堂里说一句…"
                : "家长视图禁言；如要交流请走 VVAI 消息"
            }
          />
        ) : (
          <CompactSender
            value={vvaiDraft}
            onChange={setVvaiDraft}
            onSubmit={sendVvaiMessage}
            placeholder="发消息给 VVAI（与子 CUI 实时同步）…"
          />
        )}
      </div>
    </div>
  )
}

/* ============================================================
 * Tab 按钮
 * ============================================================ */

function TabButton({
  active,
  onClick,
  label,
  subLabel,
}: {
  active: boolean
  onClick: () => void
  label: string
  subLabel?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] transition-colors",
        active
          ? "border-[var(--color-primary)]/55 bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
          : "border-border bg-bg text-text-secondary hover:bg-[var(--black-alpha-11)]",
      )}
    >
      {label}
      {subLabel ? (
        <span
          className={cn(
            "ml-0.5 inline-flex min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] tabular-nums",
            active
              ? "bg-[var(--color-primary)]/20 text-[var(--color-primary)]"
              : "bg-bg-subtle text-text-tertiary",
          )}
        >
          {subLabel}
        </span>
      ) : null}
    </button>
  )
}

/* ============================================================
 * 课堂消息列表
 * ============================================================ */

const ClassMessageList = React.forwardRef<
  HTMLDivElement,
  {
    messages: AiClassroomLiveClassMessage[]
    teacherId: string
    selfId: string
  }
>(function ClassMessageList({ messages, teacherId, selfId }, ref) {
  return (
    <div
      ref={ref}
      className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto bg-bg-subtle/30 px-3 py-3"
    >
      {messages.map((m) => {
        if (m.isSystem) {
          return (
            <div
              key={m.id}
              className="flex w-full items-center justify-center"
            >
              <span className="rounded-full bg-bg-subtle px-2.5 py-[2px] text-[10px] text-text-tertiary">
                {m.timestamp} · {m.content}
              </span>
            </div>
          )
        }
        const isTeacher = m.senderId === teacherId
        const isSelf = m.senderId === selfId
        const align = isSelf ? "items-end" : "items-start"
        const bubbleTone = isSelf
          ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground,white)]"
          : isTeacher
            ? "bg-[var(--color-info)]/12 text-text border border-[var(--color-info)]/20"
            : "bg-bg text-text border border-border"
        return (
          <div key={m.id} className={cn("flex w-full flex-col gap-0.5", align)}>
            <div className="flex items-center gap-2 px-1 text-[10px] text-text-tertiary">
              <span className="font-[var(--font-weight-medium)]">
                {m.senderName}
                {isTeacher ? " · 老师" : ""}
                {isSelf ? "（我）" : ""}
              </span>
              <span>{m.timestamp}</span>
            </div>
            <div
              className={cn(
                "max-w-[88%] rounded-[var(--radius-md)] px-3 py-2 text-[length:var(--font-size-sm)] leading-snug shadow-xs whitespace-pre-wrap break-words",
                bubbleTone,
              )}
            >
              {m.content}
            </div>
          </div>
        )
      })}
    </div>
  )
})

/* ============================================================
 * VVAI 消息列表（迷你版，markers 走简化渲染）
 * ============================================================ */

const VvaiMessageList = React.forwardRef<
  HTMLDivElement,
  {
    messages: Message[]
    botAvatarSrc: string
    userAvatarSrc: string
  }
>(function VvaiMessageList({ messages, botAvatarSrc, userAvatarSrc }, ref) {
  return (
    <div
      ref={ref}
      className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 py-3"
    >
      {messages.length === 0 ? (
        <p className="m-auto text-center text-[length:var(--font-size-xs)] text-text-tertiary">
          这里是 VVAI 消息（与子 CUI 实时同步）。<br />可随时问"班级专注度 / 帮我记笔记 / 这道题怎么解…"。
        </p>
      ) : null}
      {messages.map((m) => {
        const isUser = m.senderId === currentUser.id
        if (isUser) {
          return (
            <div
              key={m.id}
              className="flex w-full flex-row items-start justify-end gap-2"
            >
              <div className="max-w-[88%] rounded-tl-[var(--radius-lg)] rounded-tr-[var(--radius-sm)] rounded-bl-[var(--radius-lg)] rounded-br-[var(--radius-lg)] bg-[var(--color-primary)] px-3 py-2 text-[length:var(--font-size-sm)] leading-snug text-[var(--color-primary-foreground,white)] shadow-xs whitespace-pre-wrap break-words">
                {String(m.content)}
              </div>
              <Avatar className="mt-0.5 size-7 shrink-0">
                <AvatarImage src={userAvatarSrc} />
                <AvatarFallback>U</AvatarFallback>
              </Avatar>
            </div>
          )
        }
        const text = String(m.content)
        /** 结构化 reply：headline + body 拼接（不渲染 nextActions chip） */
        if (text.startsWith(`${AIC_REPLY_MARKER}:`)) {
          const reply = parseAiClassroomReply(text)
          if (reply) {
            const lines = [reply.headline, ...(reply.body ?? [])].filter(Boolean) as string[]
            return (
              <div
                key={m.id}
                className="flex w-full flex-row items-start justify-start gap-2"
              >
                <Avatar className="mt-0.5 size-7 shrink-0">
                  <AvatarImage src={botAvatarSrc} />
                  <AvatarFallback>AI</AvatarFallback>
                </Avatar>
                <div className="max-w-[88%] rounded-tl-[var(--radius-sm)] rounded-tr-[var(--radius-lg)] rounded-bl-[var(--radius-lg)] rounded-br-[var(--radius-lg)] border border-border bg-bg px-3 py-2 text-[length:var(--font-size-sm)] leading-snug text-text shadow-xs whitespace-pre-wrap break-words">
                  {lines.join("\n")}
                </div>
              </div>
            )
          }
        }
        /** 兜底：marker 来自子 CUI 18 卡 / 表单 → 这里渲染成纯文本提示 */
        const display =
          text.startsWith("<<<")
            ? "（来自子 CUI 的卡片消息；在子 CUI 中可看完整渲染。）"
            : text
        return (
          <div
            key={m.id}
            className="flex w-full flex-row items-start justify-start gap-2"
          >
            <Avatar className="mt-0.5 size-7 shrink-0">
              <AvatarImage src={botAvatarSrc} />
              <AvatarFallback>AI</AvatarFallback>
            </Avatar>
            <div className="max-w-[88%] rounded-tl-[var(--radius-sm)] rounded-tr-[var(--radius-lg)] rounded-bl-[var(--radius-lg)] rounded-br-[var(--radius-lg)] border border-border bg-bg px-3 py-2 text-[length:var(--font-size-sm)] leading-snug text-text shadow-xs whitespace-pre-wrap break-words">
              {display}
            </div>
          </div>
        )
      })}
    </div>
  )
})

/* ============================================================
 * 紧凑版 Sender（无 +/语音；只保留 input + 发送）
 * ============================================================ */

function CompactSender({
  value,
  onChange,
  onSubmit,
  disabled,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  disabled?: boolean
  placeholder: string
}) {
  return (
    <div className="flex w-full items-center gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return
          if (e.shiftKey) return
          if (e.nativeEvent.isComposing) return
          e.preventDefault()
          onSubmit()
        }}
        disabled={disabled}
        placeholder={placeholder}
        className={cn(
          "flex-1 rounded-cui-input border border-border bg-bg px-3 py-2 text-[length:var(--font-size-sm)] text-text shadow-xs placeholder:text-text-tertiary",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]/35",
          disabled ? "cursor-not-allowed bg-bg-subtle text-text-tertiary" : "",
        )}
      />
      <button
        type="button"
        onClick={onSubmit}
        disabled={disabled || !value.trim()}
        aria-label="发送"
        className={cn(
          "inline-flex size-9 items-center justify-center rounded-full transition-colors",
          disabled || !value.trim()
            ? "bg-bg-subtle text-text-tertiary"
            : "bg-[var(--color-primary)] text-[var(--color-primary-foreground,white)] hover:bg-primary-hover",
        )}
      >
        <Send className="h-4 w-4" />
      </button>
    </div>
  )
}

/* ============================================================
 * 课堂内 VVAI 的 demo 回复构造
 * ============================================================ */

function buildLiveVvaiReply({
  role,
  prompt,
}: {
  role: EduLessonAttendingRole
  prompt: string
}) {
  const trimmed = prompt.trim()
  /** 关键词识别：让 demo 回复更"懂语境"，没命中走兜底 */
  if (/班级|专注|抬头|走神/.test(trimmed)) {
    return buildReply({
      headline: "当前抬头率 85%；陈可走神 1 起，建议靶向点名。",
      body: [
        "答题率 6 / 8（正确 5、错误 1），错题集中在「夹角合成」。",
        "建议下一页 slide 复盘 5N 的求解路径。",
      ],
    })
  }
  if (/笔记|记一下|要点/.test(trimmed)) {
    return buildReply({
      headline: "已记到本节课堂笔记。",
      body: ["关键词：矢量、平行四边形、勾股定理。下课后会自动归档到错题/笔记本。"],
    })
  }
  if (/这道题|怎么解|为什么/.test(trimmed)) {
    return buildReply({
      headline: "看 slide 3：F₁、F₂ 起点重合作平行四边形，对角线即合力。",
      body: ["F₁=3、F₂=4 且垂直时，合力 = √(3² + 4²) = 5N。"],
    })
  }
  if (role === "parent") {
    return buildReply({
      headline: "孩子本节专注度 65（轻度走神），目前正在做答题板。",
      body: [
        "刚才举手的同学是张同学；答题进度 6/8，孩子尚在作答。",
        "课后会自动给你一份 30 秒回顾。",
      ],
    })
  }
  /** 兜底 */
  return buildReply({
    headline: `已收到：${trimmed.slice(0, 18)}${trimmed.length > 18 ? "…" : ""}`,
    body: ["这条已同步到子 CUI；课堂结束后还能从子 CUI 继续追问。"],
  })
}
