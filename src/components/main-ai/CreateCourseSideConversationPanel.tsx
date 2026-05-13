/**
 * 创建课程 · 侧边子 CUI（替代旧的 CreateCourseSheet 模态弹窗）
 *
 * 触发
 * ----------------------------------------------------
 * - `EduCourseProductsCard` 顶部「+ 创建课程」按钮 → 父级 `MainAIChatWindow` 打开本面板
 *
 * 与 `AiClassroomSideConversationPanel` 的关系
 * ----------------------------------------------------
 * - 同一族（VvAiLogo + 居中标题 + 关闭按钮 + 滚动主体）的「侧边子 CUI」壳
 * - 但内容简化：不开放自由聊天输入；主线只有一条 AI 开场气泡 + 一张表单卡
 * - 提交完成后立即 `onClose()`；列表卡通过 `eduCoursesPersistence` 订阅自动刷新
 */

import * as React from "react"
import { X } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar"
import { VvAiLogo } from "../chat/ChatComponents"
import { cn } from "../ui/utils"
import {
  CreateCourseFormCard,
  type CreateCourseFormValues,
} from "./CreateCourseFormCard"
import {
  createCourse,
  uploadCourseOutline,
  type SpaceContext,
} from "./eduCoursesPersistence"

const DELIVERY_LABEL: Record<"online" | "offline" | "hybrid", string> = {
  online: "线上",
  offline: "线下",
  hybrid: "线上 + 线下",
}

export interface CreateCourseSideConversationPanelProps {
  ctx: SpaceContext
  botAvatarSrc?: string
  /** 关闭面板（用户取消 / 提交完成后调用） */
  onClose: () => void
  /** 提交完成回调：父级把"已创建《xx》..."作为 AI 反馈 push 回主对话 */
  onCreated?: (summary: string) => void
}

export function CreateCourseSideConversationPanel({
  ctx,
  botAvatarSrc,
  onClose,
  onCreated,
}: CreateCourseSideConversationPanelProps) {
  /** ESC 关闭 */
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  const handleSubmit = React.useCallback(
    (form: CreateCourseFormValues) => {
      const created = createCourse({
        ctx,
        name: form.name,
        subject: form.subject,
        stage: form.stage,
        deliveryMode: form.deliveryMode,
        teachingFormat: form.teachingFormat,
        sessionCount: form.sessionCount,
        priceText: form.priceText,
        description: form.description,
      })

      let summary = `已创建《${created.name}》：${form.stage} · ${form.subject} · ${DELIVERY_LABEL[form.deliveryMode]} · 计划 ${form.sessionCount} 节。已在「教育微盘 / 教学资料」下建立同名文件夹。`

      if (form.outlineFile) {
        /** 上传大纲：与微盘里上传大纲走同一条链路（1.5s 后 mock 解析完成 → 自动生成课次目录） */
        uploadCourseOutline({
          ctx,
          courseId: created.id,
          fileName: form.outlineFile.name,
        })
        summary += ` 教学大纲《${form.outlineFile.name}》上传完成，AI 解析中——稍后会在课程文件夹下自动生成 ${form.sessionCount} 个课次子目录。`
      } else {
        summary += " 稍后可在课程行点「上传教学大纲」补充。"
      }

      onCreated?.(summary)
      onClose()
    },
    [ctx, onClose, onCreated],
  )

  return (
    <div
      className={cn(
        "pointer-events-auto flex h-full min-h-0 min-w-0 w-full flex-col bg-cui-bg",
        "border-l border-[#e8ecf0] shadow-[-12px_0_32px_rgba(15,23,42,0.08)]",
      )}
    >
      {/* Header：与 AiClassroomSideConversationPanel 同结构 */}
      <header className="grid min-h-[var(--space-900)] shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-border px-3 py-[var(--space-150)]">
        <div className="flex min-w-0 items-center">
          <VvAiLogo />
        </div>
        <div className="flex min-w-0 max-w-[min(60vw,560px)] items-center justify-center gap-[var(--space-200)] text-center">
          <span
            className="inline-flex h-[10px] w-[10px] shrink-0 rounded-full bg-[var(--color-primary)]"
            aria-hidden
          />
          <h2 className="m-0 truncate text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-text">
            创建课程
          </h2>
        </div>
        <div className="flex min-w-0 items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="flex size-9 shrink-0 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-[var(--black-alpha-11)] hover:text-text"
            aria-label="关闭创建课程"
          >
            <X className="size-[18px]" strokeWidth={2} />
          </button>
        </div>
      </header>

      {/* 滚动主体 */}
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-[max(12px,16px)] py-4">
        <div className="flex flex-col gap-5">
          {/* AI 开场气泡 */}
          <div className="flex items-start gap-2">
            <Avatar className="size-8 shrink-0">
              {botAvatarSrc ? <AvatarImage src={botAvatarSrc} alt="AI" /> : null}
              <AvatarFallback>AI</AvatarFallback>
            </Avatar>
            <div className="rounded-[var(--radius-md)] border border-border bg-bg px-[var(--space-300)] py-[var(--space-250)] text-[length:var(--font-size-sm)] leading-snug text-text">
              我们一起建一个新课程吧。把基础信息填完点「确认创建」即可；如果你已经有教学大纲，可以一并上传，AI 会自动解析并在「教育微盘 / 教学资料」下生成课次目录。
            </div>
          </div>

          {/* 表单卡 */}
          <CreateCourseFormCard onCancel={onClose} onSubmit={handleSubmit} />
        </div>
      </div>
    </div>
  )
}
