/**
 * 课程子 CUI · 资料卡 · 文件预览弹窗
 *
 * 设计动机
 * ----------------------------------------------------
 * 在子 CUI 内直接预览，**不**跳云盘（按本期产品决策）。
 * - 图片：`<img>` 直渲
 * - 视频：`<video controls>` + 海报
 * - PDF / Word / Excel：大图标 + 元数据，附"已自动归档到云盘"提示
 *
 * 模态框只承担"看 + 转交"的轻动作；删除等破坏性操作仍走文件行内 ⋯ 菜单。
 */

import * as React from "react"
import { createPortal } from "react-dom"
import {
  Download,
  FileSpreadsheet,
  FileText,
  FileType2,
  FolderArchive,
  Image as ImageIcon,
  Music,
  Send,
  Share2,
  Video as VideoIcon,
  X,
  type LucideIcon,
} from "lucide-react"
import { cn } from "../ui/utils"
import type { WeDiskFile } from "./eduCoursesPersistence"

const TYPE_ICON: Record<string, LucideIcon> = {
  pdf: FileText,
  doc: FileType2,
  xls: FileSpreadsheet,
  image: ImageIcon,
  video: VideoIcon,
  audio: Music,
  zip: FolderArchive,
  other: FileText,
}

const TYPE_TONE: Record<string, string> = {
  pdf: "text-[var(--color-error,#ef4444)]",
  doc: "text-[var(--color-info,#3b82f6)]",
  xls: "text-[var(--color-success,#22c55e)]",
  image: "text-[var(--color-warning,#f59e0b)]",
  video: "text-[var(--color-primary)]",
  audio: "text-[var(--color-purple,#8b5cf6)]",
  zip: "text-text-secondary",
  other: "text-text-secondary",
}

export interface LessonMaterialPreviewModalProps {
  file: WeDiskFile | null
  onClose: () => void
  /** 转交动作：转交后由父级 push 一条 AI 回执到当前 thread */
  onSend?: (file: WeDiskFile, target: "students" | "colleagues" | "parent-group") => void
}

export function LessonMaterialPreviewModal({
  file,
  onClose,
  onSend,
}: LessonMaterialPreviewModalProps) {
  /** ESC 关闭 */
  React.useEffect(() => {
    if (!file) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [file, onClose])

  if (!file) return null
  if (typeof document === "undefined") return null

  const Icon = TYPE_ICON[file.type] ?? FileText
  const isImage = file.type === "image" && !!file.previewUrl
  const isVideo = file.type === "video" && !!file.previewUrl
  const isAudio = file.type === "audio" && !!file.previewUrl
  /** 视频默认提供"同步家长群"动作（不再依赖 source 区分） */
  const isVideoLike = file.type === "video"

  /**
   * 预览模态需要 portal 到 document.body：
   * 该模态被资料卡 / 教学资料浏览卡渲染在主对话消息气泡里，祖先链上有 motion / transform / filter
   * （会创建新的 containing block），导致 `position: fixed` 退化为相对祖先定位，模态会被截断或被
   * 顶部组织切换器盖住。portal 到 body 后 fixed inset-0 才真实地覆盖整个 viewport。
   */
  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-[rgba(15,23,42,0.55)] px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-label={`预览：${file.name}`}
      onClick={(e) => {
        if (e.currentTarget === e.target) onClose()
      }}
    >
      <div className="flex max-h-[88vh] w-[min(100%,860px)] flex-col overflow-hidden rounded-[var(--radius-lg)] border border-border bg-bg shadow-[0_24px_60px_rgba(15,23,42,0.32)]">
        {/* ===== 顶栏 ===== */}
        <header className="flex shrink-0 items-start gap-[var(--space-300)] border-b border-border px-[var(--space-400)] py-[var(--space-300)]">
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-bg-secondary",
              TYPE_TONE[file.type],
            )}
          >
            <Icon className="size-5" strokeWidth={1.8} />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
            <h3 className="m-0 truncate text-[length:var(--font-size-md)] font-[var(--font-weight-semibold)] text-text">
              {file.name}
            </h3>
            <p className="m-0 truncate text-[length:var(--font-size-xs)] text-text-tertiary">
              {file.sizeText} · {file.uploadedAt}
              {file.uploaderName ? ` · ${file.uploaderName}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭预览"
            className="flex size-8 shrink-0 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-[var(--black-alpha-11)] hover:text-text"
          >
            <X className="size-4" strokeWidth={2} />
          </button>
        </header>

        {/* ===== 主体 ===== */}
        <div className="flex min-h-0 flex-1 items-center justify-center bg-[var(--color-bg-subtle)] px-[var(--space-400)] py-[var(--space-400)]">
          {isImage ? (
            <img
              src={file.previewUrl}
              alt={file.name}
              className="max-h-[60vh] max-w-full rounded-[var(--radius-md)] border border-border bg-bg object-contain shadow-sm"
            />
          ) : isVideo ? (
            <video
              src={file.previewUrl}
              controls
              poster={file.videoPosterUrl}
              className="max-h-[60vh] max-w-full rounded-[var(--radius-md)] border border-border bg-black shadow-sm"
            />
          ) : isAudio ? (
            <div className="flex w-full max-w-[460px] flex-col items-center gap-[var(--space-300)] rounded-[var(--radius-lg)] border border-border bg-bg px-[var(--space-400)] py-[var(--space-400)]">
              <span
                className={cn(
                  "flex size-16 items-center justify-center rounded-full bg-bg-secondary",
                  TYPE_TONE.audio,
                )}
              >
                <Music className="size-8" strokeWidth={1.6} />
              </span>
              <audio src={file.previewUrl} controls className="w-full" />
            </div>
          ) : (
            <DocumentPlaceholder file={file} Icon={Icon} canShare={!!onSend} />
          )}
        </div>

        {/* ===== 底部动作栏 =====
         * onSend 缺省 = 学生 / 家长，仅展示「关闭」，文案不再提及分享。
         */}
        <footer className="flex shrink-0 items-center justify-between gap-[var(--space-200)] border-t border-border px-[var(--space-400)] py-[var(--space-250)]">
          <span className="text-[length:var(--font-size-xs)] text-text-tertiary">
            {onSend
              ? "预览仅供查看；分享会同步落到云盘对应位置"
              : "本资料由老师同步至本节资料库 · 仅可预览"}
          </span>
          <div className="flex items-center gap-[var(--space-150)]">
            {onSend ? (
              <>
                <ModalActionButton
                  icon={Send}
                  label="发给学生"
                  onClick={() => onSend(file, "students")}
                />
                <ModalActionButton
                  icon={Share2}
                  label="发同事"
                  onClick={() => onSend(file, "colleagues")}
                />
                {isVideoLike ? (
                  <ModalActionButton
                    icon={Send}
                    label="同步家长群"
                    onClick={() => onSend(file, "parent-group")}
                  />
                ) : null}
              </>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 items-center gap-[var(--space-150)] rounded-[var(--radius-sm)] border border-border bg-bg px-[var(--space-300)] text-[length:var(--font-size-sm)] text-text transition-colors hover:bg-[var(--black-alpha-11)]"
            >
              关闭
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  )
}

/**
 * 文档类（PDF / Word / Excel / Zip / 其它）的占位预览。
 *
 * 不真接 PDF.js / Office viewer：在 demo 范畴用大图标 + 元数据传达"看到了"，
 * 真接入云盘后再换为云盘的高保真 viewer。
 */
function DocumentPlaceholder({
  file,
  Icon,
  canShare,
}: {
  file: WeDiskFile
  Icon: LucideIcon
  canShare: boolean
}) {
  const subtitleByType: Record<string, string> = {
    pdf: "PDF 文档",
    doc: "Word 文档",
    xls: "表格文档",
    audio: "音频文件",
    zip: "压缩包",
    other: "文件",
  }
  return (
    <div className="flex w-full max-w-[460px] flex-col items-center gap-[var(--space-300)] rounded-[var(--radius-lg)] border border-dashed border-border bg-bg px-[var(--space-400)] py-[var(--space-500)] text-center">
      <span className={cn("flex size-16 items-center justify-center rounded-full bg-bg-secondary", TYPE_TONE[file.type])}>
        <Icon className="size-8" strokeWidth={1.6} />
      </span>
      <div className="flex flex-col gap-[var(--space-150)]">
        <p className="m-0 text-[length:var(--font-size-md)] font-[var(--font-weight-semibold)] text-text">
          {subtitleByType[file.type] ?? "文件"} · {file.sizeText}
        </p>
        <p className="m-0 text-[length:var(--font-size-sm)] leading-relaxed text-text-secondary">
          已归档到云盘对应文件夹。
          {canShare ? (
            <>
              <br />
              点击底部「发给学生 / 发同事」可一键分享。
            </>
          ) : null}
        </p>
      </div>
      <button
        type="button"
        className="inline-flex h-8 items-center gap-[var(--space-150)] rounded-[var(--radius-sm)] border border-border bg-bg-secondary/40 px-[var(--space-300)] text-[length:var(--font-size-sm)] text-text-secondary"
        disabled
      >
        <Download className="size-3.5" />
        下载（demo 中已禁用）
      </button>
    </div>
  )
}

function ModalActionButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-8 items-center gap-[var(--space-150)] rounded-[var(--radius-sm)] border border-border bg-bg px-[var(--space-300)] text-[length:var(--font-size-sm)] text-text transition-colors hover:bg-[var(--black-alpha-11)]"
    >
      <Icon className="size-3.5" />
      {label}
    </button>
  )
}
