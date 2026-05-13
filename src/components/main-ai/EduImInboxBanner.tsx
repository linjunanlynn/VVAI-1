/**
 * 教育三身份 IM 联动 · 收件箱 banner（demo）
 *
 * 在切换到接收方身份的场景（六 / 七 / 八）时，把另一身份"刚刚发起"的 IM 事件
 * 在《主CUI交互》首屏 Hero 卡下方以会话行的样式呈现，让用户一眼看到"对方真的收到了"。
 *
 * - 数据来源：eduImBus.useEduImEventsForRole(role) → 返回当前 role 的所有事件
 * - 交互：点击"标记已读 / 查看"会消除红点，并通过 onPickPrompt 把事件预览作为指令送回 chat
 */
import * as React from "react"
import { cn } from "../ui/utils"
import { GenericCard } from "./GenericCard"
import { ChatPromptButton } from "../chat/ChatPromptButton"
import {
  markAllReadForRole,
  markEduImEventRead,
  type EduImEvent,
  type EduImTargetRole,
} from "./eduImBus"

export interface EduImInboxBannerProps {
  role: EduImTargetRole
  events: EduImEvent[]
  /**
   * 用于将"查看完整内容"指令打回主聊天区，触发 AI 回执 / 业务卡。
   * 第二参数透出原始事件，调用方可据此决定走"主对话内出卡"还是"跳子 CUI"。
   */
  onOpenDetail: (command: string, evt: EduImEvent) => void
  className?: string
}

const EVENT_ICON: Record<EduImEvent["type"], string> = {
  "report-to-parent": "📨",
  "ask-teacher": "❓",
  "private-chat-init": "💬",
  "teacher-private-chat": "🧑‍🏫",
  "student-leave-request": "🆘",
  "parent-leave-request": "🆘",
  "series-reschedule-notify": "🗓",
  "series-leave-confirmed": "✅",
}

const EVENT_BADGE: Record<EduImEvent["type"], string> = {
  "report-to-parent": "课后报告",
  "ask-teacher": "学生求助",
  "private-chat-init": "家长私聊",
  "teacher-private-chat": "老师私聊",
  "student-leave-request": "学生请假",
  "parent-leave-request": "家长代请假",
  "series-reschedule-notify": "系列课调课",
  "series-leave-confirmed": "请假已确认",
}

export function EduImInboxBanner({
  role,
  events,
  onOpenDetail,
  className,
}: EduImInboxBannerProps) {
  if (events.length === 0) return null
  const unreadCount = events.filter((e) => !e.read).length

  return (
    <div className={cn("flex w-full max-w-[min(100%,720px)] flex-col", className)}>
      <GenericCard title={`跨身份 · 新会话（${unreadCount > 0 ? `未读 ${unreadCount}` : "全部已读"}）`}>
        <div className="flex w-full flex-col gap-[var(--space-150)]">
          {events.map((evt) => (
            <button
              key={evt.id}
              type="button"
              onClick={() => {
                markEduImEventRead(evt.id)
                onOpenDetail(buildOpenCommand(evt), evt)
              }}
              className={cn(
                "group flex w-full items-center gap-[var(--space-250)] rounded-[var(--radius-md)] border px-[var(--space-300)] py-[var(--space-200)] text-left transition-colors",
                evt.read
                  ? "border-border bg-bg hover:bg-bg-secondary"
                  : "border-[var(--color-info)]/40 bg-[var(--color-info)]/5 hover:bg-[var(--color-info)]/10",
              )}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-bg-secondary text-[length:var(--font-size-md)]">
                {EVENT_ICON[evt.type]}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
                <div className="flex items-center gap-[var(--space-200)]">
                  <span className="truncate text-[length:var(--font-size-sm)] font-[var(--font-weight-semi-bold)] text-text">
                    {evt.conversationTitle}
                  </span>
                  <span className="shrink-0 rounded-[var(--radius-sm)] bg-bg-secondary px-[var(--space-150)] py-[1px] text-[10px] font-[var(--font-weight-medium)] text-text-secondary">
                    {EVENT_BADGE[evt.type]}
                  </span>
                  {!evt.read ? (
                    <span className="ml-auto inline-flex h-[8px] w-[8px] shrink-0 rounded-full bg-[var(--color-info)]" aria-hidden />
                  ) : null}
                </div>
                <span className="truncate text-[length:var(--font-size-xs)] text-text-tertiary">
                  {evt.preview}
                </span>
              </div>
              <span className="shrink-0 text-[length:var(--font-size-xs)] text-text-tertiary">
                {formatTime(evt.createdAt)}
              </span>
            </button>
          ))}

          {unreadCount > 0 ? (
            <div className="mt-[var(--space-150)] flex items-center gap-[var(--space-200)]">
              <ChatPromptButton type="button" onClick={() => markAllReadForRole(role)}>
                全部标为已读
              </ChatPromptButton>
              <span className="text-[length:var(--font-size-xs)] text-text-tertiary">
                来自另一身份的实时联动消息（demo 用 sessionStorage）
              </span>
            </div>
          ) : null}
        </div>
      </GenericCard>
    </div>
  )
}

function buildOpenCommand(evt: EduImEvent): string {
  switch (evt.type) {
    case "report-to-parent":
      return `打开《课后报告·${evt.studentName}》`
    case "ask-teacher":
      return `查看 ${evt.fromName} 求助：第 7 题（含我的解答）`
    case "private-chat-init":
      return `打开和 ${evt.fromName} 的私聊`
    case "teacher-private-chat":
      return `打开 ${evt.fromName} 的私聊`
    case "student-leave-request":
      return `处理 ${evt.fromName} 的请假申请`
    case "parent-leave-request":
      return `处理 ${evt.fromName} 的代请假申请`
    case "series-reschedule-notify":
      return `查看《${evt.conversationTitle}》系列课调课通知`
    case "series-leave-confirmed":
      return `查看《${evt.conversationTitle}》请假记录`
    default:
      return "打开新消息"
  }
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}
