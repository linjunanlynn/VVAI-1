import * as React from "react"
import {
  Camera,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Heart,
  MessageSquare,
  Plus,
  Send,
  Sparkles,
  Video,
  X,
} from "lucide-react"
import { cn } from "../ui/utils"
import type { EduLessonAttendingRole } from "./homeScenarioLayout"
import type { EducationStage } from "./educationStageDemo"
import { GenericCard } from "./GenericCard"
import {
  addAssetsToLessonReport,
  addLessonReviewAsset,
  commentLessonReport,
  confirmLessonReport,
  generateLessonReports,
  getSelfStudentName,
  likeLessonReport,
  removeAssetFromLessonReport,
  removeLessonReviewAsset,
  sendAllLessonReports,
  setLessonReviewMeta,
  unconfirmLessonReport,
  updateLessonClassSummary,
  updateLessonReportSentence,
  updateLessonReportStudentVisible,
  useLessonReviewSnapshot,
  type LessonReviewAsset,
  type LessonStudentReport,
} from "./lessonReviewStore"
import { pushEduImEvent } from "./eduImBus"
import { buildReply, serializeAiClassroomReply } from "./aiClassroomReply"

export interface LessonReviewCardProps {
  role: EduLessonAttendingRole
  lessonId: string
  lessonTitle: string
  stage: EducationStage
  onPushAi?: (content: string) => void
}

export function LessonReviewCard({
  role,
  lessonId,
  lessonTitle,
  stage,
  onPushAi,
}: LessonReviewCardProps) {
  React.useEffect(() => {
    setLessonReviewMeta(lessonId, lessonTitle)
  }, [lessonId, lessonTitle])
  if (role === "teacher") {
    return (
      <TeacherReviewPanel
        lessonId={lessonId}
        lessonTitle={lessonTitle}
        stage={stage}
        onPushAi={onPushAi}
      />
    )
  }
  return <StudentOrParentReportPanel role={role} lessonId={lessonId} lessonTitle={lessonTitle} stage={stage} />
}

function TeacherReviewPanel({
  lessonId,
  lessonTitle,
  stage,
  onPushAi,
}: {
  lessonId: string
  lessonTitle: string
  stage: EducationStage
  onPushAi?: (content: string) => void
}) {
  const snapshot = useLessonReviewSnapshot(lessonId)
  const [showDraftCard, setShowDraftCard] = React.useState(false)

  // 仅课后阶段才进入“已发送”视图；课前/课中即便有历史脏数据也走素材模式，避免空状态崩溃。
  const hasSentInCurrent =
    stage === "post" && snapshot.reports.some((r) => r.sendStatus === "sent")

  React.useEffect(() => {
    setShowDraftCard(false)
  }, [lessonId, stage])

  return (
    <GenericCard title={`风采点评 · ${lessonTitle}`}>
      {hasSentInCurrent ? (
        <TeacherSentHistoryCurrentLesson
          lessonId={lessonId}
        />
      ) : showDraftCard ? (
        <TeacherDraftEditMode
          lessonId={lessonId}
          onBackToAssets={() => setShowDraftCard(false)}
          onPushAi={onPushAi}
        />
      ) : (
        <TeacherAssetMode
          lessonId={lessonId}
          stage={stage}
          reportsGenerated={snapshot.reportsGenerated}
          onGenerateAi={() => {
            generateLessonReports(lessonId)
            setShowDraftCard(true)
          }}
          onOpenDraft={() => setShowDraftCard(true)}
        />
      )}
    </GenericCard>
  )
}

function TeacherAssetMode({
  lessonId,
  stage,
  reportsGenerated,
  onGenerateAi,
  onOpenDraft,
}: {
  lessonId: string
  stage: EducationStage
  reportsGenerated: boolean
  onGenerateAi: () => void
  onOpenDraft: () => void
}) {
  const snapshot = useLessonReviewSnapshot(lessonId)
  const assetCount = snapshot.assets.length
  const isPost = stage === "post"
  const canGenerate = isPost && assetCount > 0

  return (
    <div className="mt-[var(--space-150)] flex flex-col gap-[var(--space-300)]">
      {/*
        ────── ① 价值主张条（What & Why）──────
        让老师 5 秒内理解"我现在在干嘛、做完会得到什么"，
        替代原来一段灰色长文 hint，避免认知断崖。
      */}
      <div className="rounded-[var(--radius-lg)] border border-[color-mix(in_srgb,var(--color-primary)_28%,transparent)] bg-[linear-gradient(120deg,color-mix(in_srgb,var(--color-primary)_8%,transparent),color-mix(in_srgb,var(--color-info,#34a0ff)_6%,transparent))] px-[var(--space-300)] py-[var(--space-250)]">
        <div className="flex items-start gap-[var(--space-200)]">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--color-primary)]/15 text-[var(--color-primary)]">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)] text-text">
              课中随手拍，下课后 AI 自动整理成报告
            </div>
            <div className="mt-[2px] text-[length:var(--font-size-xs)] leading-relaxed text-text-secondary">
              拍下孩子上课的精彩瞬间。下课后 AI 会按人脸把素材分配到每个孩子，配上课堂总结与个性化点评，老师确认即可一键发送家长。
            </div>
          </div>
        </div>
      </div>

      {/*
        ────── ② 素材区小标题（Group label + count + hint）──────
        让 grid 有"组"的语义；右侧小灰字提示支持的素材类型，回应 + 占位卡的小弹窗。
      */}
      <div className="flex items-end justify-between gap-[var(--space-200)]">
        <div className="flex min-w-0 items-baseline gap-[var(--space-150)]">
          <div className="text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)] text-text">
            风采素材
          </div>
          <div className="text-[length:var(--font-size-xs)] tabular-nums text-text-tertiary">
            共 {assetCount} 项
          </div>
        </div>
        <div className="text-[length:var(--font-size-xs)] text-text-tertiary">
          点 + 添加 · 支持照片 / 视频
        </div>
      </div>

      {/*
        ────── ④ 素材网格 + 带文案的 + 占位卡 ──────
        + 占位卡上嵌入「添加风采素材 / 照片 · 视频」文案，
        让用户不再需要"猜"它是干什么的；多素材时占位卡跟在末尾。
      */}
      <div className="grid grid-cols-2 gap-[var(--space-150)] sm:grid-cols-3">
        {snapshot.assets.map((asset) => (
          <div key={asset.id} className="flex flex-col gap-[var(--space-100)] rounded-[var(--radius-sm)] border border-border bg-bg p-[var(--space-100)]">
            <AssetThumb asset={asset} compact />
            <button
              type="button"
              onClick={() => removeLessonReviewAsset(lessonId, asset.id)}
              className="self-start text-[length:var(--font-size-xs)] text-[var(--color-danger,#d4423b)]"
            >
              删除
            </button>
          </div>
        ))}
        <TeacherAddAssetPlaceholder
          label={assetCount === 0 ? "拍下第一张风采" : "继续添加素材"}
          hint="照片 / 视频"
          onAddPhoto={() => addLessonReviewAsset(lessonId, "photo")}
          onAddVideo={() => addLessonReviewAsset(lessonId, "video")}
        />
      </div>

      {/*
        ────── ⑤ 阶段化 CTA ──────
        - 课前 / 课中：不出现"AI 生成"按钮，仅文字提示"下课后才能生成"，避免误操作；
        - 课后：按钮常显，但仅在素材 ≥ 1 时高亮可点；空态给出明确指引文字。
      */}
      {isPost ? (
        <div className="flex flex-wrap items-center justify-between gap-[var(--space-200)] rounded-[var(--radius-md)] border border-border bg-bg-tertiary px-[var(--space-250)] py-[var(--space-200)]">
          <div className="text-[length:var(--font-size-xs)] text-text-secondary">
            {assetCount === 0
              ? "请先添加至少 1 项风采素材，AI 才能开始按人脸归档与生成。"
              : `已收集 ${assetCount} 项素材，AI 将自动按人脸分到每个孩子。`}
          </div>
          <button
            type="button"
            onClick={onGenerateAi}
            disabled={!canGenerate}
            className={cn(
              "inline-flex items-center gap-[var(--space-100)] rounded-full px-[var(--space-300)] py-[var(--space-150)] text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] transition-colors",
              canGenerate
                ? "bg-primary text-[var(--color-primary-foreground,white)] hover:bg-primary-hover"
                : "bg-[var(--black-alpha-11)] text-text-tertiary cursor-not-allowed",
            )}
          >
            <Sparkles className="h-3.5 w-3.5" />
            AI 生成个性化点评风采
          </button>
        </div>
      ) : (
        <div className="rounded-[var(--radius-md)] border border-dashed border-border px-[var(--space-250)] py-[var(--space-200)] text-[length:var(--font-size-xs)] text-text-tertiary">
          课前 / 课中持续积累素材即可。等本节课结束后，本张卡会出现「AI 生成个性化点评风采」按钮，把素材一键转成每个孩子的报告。
        </div>
      )}

      {reportsGenerated ? (
        <button
          type="button"
          onClick={onOpenDraft}
          className="self-start text-[length:var(--font-size-xs)] text-[var(--color-primary)] underline-offset-2 hover:underline"
        >
          查看已生成的 AI 风采点评草稿 →
        </button>
      ) : null}
    </div>
  )
}


/**
 * 老师素材管理区的「+ 占位卡」：
 * - 视觉与孩子报告里 `AddAssetTile` 完全一致（高度 / 边框 / `+` 图标），保持统一语言；
 * - 区别在于孩子卡是"从已有素材里挑"，这里是"创建新素材"，
 *   因此点击不走 AssetPickerDialog，而是弹出一个 inline 选择条（照片 / 视频）。
 */
function TeacherAddAssetPlaceholder({
  label,
  hint,
  onAddPhoto,
  onAddVideo,
}: {
  label?: string
  hint?: string
  onAddPhoto: () => void
  onAddVideo: () => void
}) {
  const [open, setOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (!containerRef.current) return
      if (!containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener("mousedown", onDocClick)
    return () => window.removeEventListener("mousedown", onDocClick)
  }, [open])

  return (
    <div ref={containerRef} className="relative h-[140px] w-full">
      <AddAssetTile onClick={() => setOpen((o) => !o)} label={label} hint={hint} />
      {open ? (
        <div className="absolute left-1/2 top-full z-20 mt-[var(--space-100)] flex -translate-x-1/2 flex-col gap-[2px] rounded-[var(--radius-md)] border border-border bg-bg p-[var(--space-100)] shadow-lg min-w-[160px]">
          <button
            type="button"
            onClick={() => {
              onAddPhoto()
              setOpen(false)
            }}
            className="inline-flex items-center gap-[var(--space-150)] rounded-[var(--radius-sm)] px-[var(--space-200)] py-[var(--space-150)] text-left text-[length:var(--font-size-xs)] text-text hover:bg-bg-tertiary"
          >
            <Camera className="h-3.5 w-3.5 text-text-secondary" />
            拍摄/上传照片
          </button>
          <button
            type="button"
            onClick={() => {
              onAddVideo()
              setOpen(false)
            }}
            className="inline-flex items-center gap-[var(--space-150)] rounded-[var(--radius-sm)] px-[var(--space-200)] py-[var(--space-150)] text-left text-[length:var(--font-size-xs)] text-text hover:bg-bg-tertiary"
          >
            <Video className="h-3.5 w-3.5 text-text-secondary" />
            上传视频
          </button>
        </div>
      ) : null}
    </div>
  )
}

function TeacherDraftEditMode({
  lessonId,
  onBackToAssets,
  onPushAi,
}: {
  lessonId: string
  onBackToAssets: () => void
  onPushAi?: (content: string) => void
}) {
  const snapshot = useLessonReviewSnapshot(lessonId)
  const [activeStudent, setActiveStudent] = React.useState<string>(() => snapshot.reports[0]?.studentName ?? "")
  const [previewOpen, setPreviewOpen] = React.useState(false)
  const [editing, setEditing] = React.useState(true)
  const [summaryEditing, setSummaryEditing] = React.useState(false)
  const [summaryDraft, setSummaryDraft] = React.useState(snapshot.classSummary)
  const [assetPickerOpen, setAssetPickerOpen] = React.useState(false)

  React.useEffect(() => {
    if (!snapshot.reports.some((r) => r.studentName === activeStudent)) {
      setActiveStudent(snapshot.reports[0]?.studentName ?? "")
    }
  }, [snapshot.reports, activeStudent])

  React.useEffect(() => {
    if (!summaryEditing) setSummaryDraft(snapshot.classSummary)
  }, [snapshot.classSummary, summaryEditing])

  const pendingCount = snapshot.reports.filter((r) => !r.teacherConfirmed).length
  const confirmedCount = snapshot.reports.filter((r) => r.teacherConfirmed).length
  const activeReport = snapshot.reports.find((r) => r.studentName === activeStudent) ?? null
  const allConfirmed = snapshot.reports.length > 0 && snapshot.reports.every((r) => r.teacherConfirmed)
  const reportOrder = snapshot.reports.map((r) => r.studentName)

  return (
    <div className="mt-[var(--space-150)] flex flex-col gap-[var(--space-250)]">
      <div className="rounded-[var(--radius-lg)] border border-[color-mix(in_srgb,var(--color-primary)_35%,transparent)] bg-[linear-gradient(120deg,color-mix(in_srgb,var(--color-primary)_10%,transparent),color-mix(in_srgb,var(--color-info,#34a0ff)_8%,transparent))] px-[var(--space-300)] py-[var(--space-250)]">
        <div className="flex flex-wrap items-center justify-between gap-[var(--space-150)]">
          <div className="inline-flex items-center gap-[var(--space-100)] text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)] text-text">
            <Sparkles className="h-4 w-4 text-[var(--color-primary)]" />
            AI 已生成本节风采点评草稿
          </div>
          <div className="text-[length:var(--font-size-xs)] text-text-tertiary">
            已确认 {confirmedCount} / 待确认 {pendingCount}
          </div>
        </div>
      </div>

      <div className="rounded-[var(--radius-md)] border border-border bg-bg px-[var(--space-200)] py-[var(--space-200)]">
        <div className="flex items-center justify-between gap-[var(--space-100)]">
          <div className="text-[length:var(--font-size-xs)] text-text-tertiary">课堂总结（AI 默认已生成）</div>
          {!summaryEditing ? (
            <button
              type="button"
              onClick={() => setSummaryEditing(true)}
              className="text-[length:var(--font-size-xs)] text-[var(--color-primary)]"
            >
              编辑修改
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                updateLessonClassSummary(lessonId, summaryDraft)
                setSummaryEditing(false)
              }}
              className="inline-flex items-center gap-1 text-[length:var(--font-size-xs)] text-[var(--color-success)]"
            >
              <Check className="h-3.5 w-3.5" />
              确认
            </button>
          )}
        </div>
        {summaryEditing ? (
          <textarea
            value={summaryDraft}
            onChange={(e) => setSummaryDraft(e.target.value)}
            className="mt-[var(--space-100)] min-h-[92px] w-full rounded-[var(--radius-md)] border border-border bg-bg px-[var(--space-200)] py-[var(--space-150)] text-[length:var(--font-size-sm)] text-text"
          />
        ) : (
          <div className="mt-[var(--space-100)] text-[length:var(--font-size-sm)] text-text-secondary">
            {snapshot.classSummary}
          </div>
        )}
      </div>

      <div className="flex gap-[var(--space-150)] overflow-x-auto rounded-[var(--radius-md)] border border-border bg-bg px-[var(--space-200)] py-[var(--space-150)]">
        {snapshot.reports.map((report) => (
          <button
            key={report.studentName}
            type="button"
            onClick={() => {
              setActiveStudent(report.studentName)
              setEditing(!report.teacherConfirmed)
            }}
            className={cn(
              "relative inline-flex min-w-[86px] shrink-0 flex-col items-center gap-[var(--space-100)] rounded-[var(--radius-sm)] border px-[var(--space-150)] py-[var(--space-150)] transition-colors",
              activeStudent === report.studentName
                ? "border-[var(--color-primary)] bg-[var(--color-primary)]/8"
                : "border-border bg-bg hover:border-border-strong",
            )}
          >
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--color-primary)]/12 text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-[var(--color-primary)]">
              {report.studentName.slice(0, 1)}
            </span>
            <span className="truncate text-[length:var(--font-size-xs)] text-text">{report.studentName}</span>
            {report.teacherConfirmed ? (
              <span className="absolute right-1 top-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-success)] text-white">
                <CheckCircle2 className="h-3 w-3" />
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {activeReport ? (
        <TeacherStudentReportEditor
          lessonId={lessonId}
          report={activeReport}
          assets={snapshot.assets}
          editing={editing}
          onEditingChange={setEditing}
          onPreview={() => setPreviewOpen(true)}
          onOpenAssetPicker={() => setAssetPickerOpen(true)}
          onConfirmAndNext={() => {
            confirmLessonReport(lessonId, activeReport.studentName)
            setEditing(false)
            const currentIdx = reportOrder.findIndex((name) => name === activeReport.studentName)
            const next = reportOrder
              .slice(currentIdx + 1)
              .find((name) => !snapshot.reports.find((r) => r.studentName === name)?.teacherConfirmed)
            if (next) {
              setActiveStudent(next)
              setEditing(true)
            }
          }}
        />
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-[var(--space-150)] rounded-[var(--radius-md)] border border-border bg-bg-tertiary px-[var(--space-200)] py-[var(--space-150)]">
        <div className="text-[length:var(--font-size-xs)] text-text-secondary">
          {allConfirmed
            ? "已完成全部孩子报告确认，可以发送。"
            : `还差 ${snapshot.reports.filter((r) => !r.teacherConfirmed).length} 位孩子未确认。`}
        </div>
        <button
          type="button"
          disabled={!allConfirmed}
          onClick={() => {
            sendAllLessonReports(lessonId)
            snapshot.reports.forEach((r) => {
              pushEduImEvent({
                type: "report-to-parent",
                targetRole: "parent",
                fromName: "王老师（物理）",
                toName: `${r.studentName}家长`,
                conversationTitle: "王老师（物理）",
                preview: `已推送《${snapshot.lessonTitle}》风采报告，请查看。`,
                studentName: r.studentName,
                lessonId,
                lessonTitle: snapshot.lessonTitle,
              })
              pushEduImEvent({
                type: "report-to-parent",
                targetRole: "student",
                fromName: "王老师（物理）",
                toName: r.studentName,
                conversationTitle: "王老师（物理）",
                preview: `老师已发送《${snapshot.lessonTitle}》风采报告。`,
                studentName: r.studentName,
                lessonId,
                lessonTitle: snapshot.lessonTitle,
              })
            })
            onPushAi?.(
              serializeAiClassroomReply(
                buildReply({
                  headline: `AI 已发送：本节风采报告已同步给 ${snapshot.reports.length} 位孩子与家长。`,
                  nextActions: [
                    {
                      label: "查看已发送的报告风采",
                      prompt: "查看已发送的报告风采",
                      tone: "primary",
                    },
                  ],
                }),
              ),
            )
          }}
          className={cn(
            "inline-flex items-center gap-[var(--space-100)] rounded-full px-[var(--space-300)] py-[var(--space-150)] text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)]",
            allConfirmed
              ? "bg-primary text-[var(--color-primary-foreground,white)]"
              : "bg-[var(--black-alpha-11)] text-text-tertiary",
          )}
        >
          <Send className="h-3.5 w-3.5" />
          一键全部发送
        </button>
      </div>

      <button
        type="button"
        onClick={onBackToAssets}
        className="self-end text-[length:var(--font-size-xs)] text-text-tertiary underline-offset-2 hover:underline"
      >
        返回风采素材列表
      </button>

      {previewOpen && activeReport ? (
        <PreviewDialog report={activeReport} assets={snapshot.assets} classSummary={snapshot.classSummary} onClose={() => setPreviewOpen(false)} />
      ) : null}
      {assetPickerOpen && activeReport ? (
        <AssetPickerDialog
          assets={snapshot.assets}
          selectedIds={activeReport.assetIds}
          onClose={() => setAssetPickerOpen(false)}
          onConfirm={(assetIds) => {
            addAssetsToLessonReport(lessonId, activeReport.studentName, assetIds)
            setAssetPickerOpen(false)
          }}
        />
      ) : null}
    </div>
  )
}

function TeacherSentHistoryCurrentLesson({
  lessonId,
}: {
  lessonId: string
}) {
  const snapshot = useLessonReviewSnapshot(lessonId)
  const sentReports = snapshot.reports.filter((r) => r.sendStatus === "sent")
  return (
    <div className="mt-[var(--space-150)] flex flex-col gap-[var(--space-150)]">
      <div className="rounded-[var(--radius-md)] border border-border bg-bg-tertiary px-[var(--space-200)] py-[var(--space-150)] text-[length:var(--font-size-xs)] text-text-secondary">
        已发送孩子 {sentReports.length} 人，可查看点评、点赞与评论记录。
      </div>
      <div className="grid grid-cols-1 gap-[var(--space-150)] lg:grid-cols-2">
        {sentReports.map((r) => (
          <SocialFeedCard key={r.studentName} report={r} assets={snapshot.assets} />
        ))}
      </div>
    </div>
  )
}

function TeacherStudentReportEditor({
  lessonId,
  report,
  assets,
  editing,
  onEditingChange,
  onPreview,
  onOpenAssetPicker,
  onConfirmAndNext,
}: {
  lessonId: string
  report: LessonStudentReport
  assets: LessonReviewAsset[]
  editing: boolean
  onEditingChange: (editing: boolean) => void
  onPreview: () => void
  onOpenAssetPicker: () => void
  onConfirmAndNext: () => void
}) {
  const canConfirm = report.sentence.trim().length > 0
  return (
    <div className="rounded-[var(--radius-md)] border border-border bg-bg px-[var(--space-250)] py-[var(--space-250)]">
      <div className="flex items-center justify-between gap-[var(--space-150)]">
        <div className="text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)] text-text">
          {report.studentName} · 课程报告风采
        </div>
        <div className="text-[length:var(--font-size-xs)] text-text-tertiary">
          风采素材 {report.assetIds.length} 项
        </div>
      </div>

      <div className="mt-[var(--space-150)] rounded-[var(--radius-sm)] border border-border bg-bg-tertiary px-[var(--space-200)] py-[var(--space-150)] text-[length:var(--font-size-xs)] text-text-secondary">
        AI 已自动归档素材并生成个性化点评。请确认后再发送。
      </div>

      <div className="mt-[var(--space-150)]">
        <div className="mb-[var(--space-100)] text-[length:var(--font-size-xs)] text-text-tertiary">风采素材缩略图</div>
        <AssetThumbGrid
          assets={assets}
          assetIds={report.assetIds}
          removable
          onRemove={(assetId) => removeAssetFromLessonReport(lessonId, report.studentName, assetId)}
          onAdd={onOpenAssetPicker}
        />
      </div>

      <div className="mt-[var(--space-150)] overflow-hidden rounded-[var(--radius-md)] border border-border bg-bg">
        <div className="flex flex-wrap items-center justify-between gap-[var(--space-150)] border-b border-border bg-bg-tertiary px-[var(--space-250)] py-[var(--space-150)]">
          <div className="flex min-w-0 items-center gap-[var(--space-100)]">
            <Sparkles className="h-4 w-4 flex-none text-primary" />
            <div className="min-w-0">
              <div className="text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)] text-text">
                个性化点评
              </div>
              <div className="mt-[2px] text-[length:var(--font-size-xs)] text-text-tertiary">
                AI 已基于风采素材生成草稿，可直接微调后发送。
              </div>
            </div>
          </div>
          <span className="rounded-full bg-primary/10 px-[var(--space-150)] py-[var(--space-50)] text-[length:var(--font-size-xs)] text-primary">
            {report.sentence.trim().length} 字
          </span>
        </div>

        <div className="px-[var(--space-250)] py-[var(--space-200)]">
          <textarea
            value={report.sentence}
            onChange={(e) => updateLessonReportSentence(lessonId, report.studentName, e.target.value)}
            disabled={!editing}
            placeholder="写一段面向家长/学生的本节课表现点评..."
            className={cn(
              "min-h-[124px] w-full resize-y rounded-[var(--radius-sm)] border px-[var(--space-200)] py-[var(--space-150)] text-[length:var(--font-size-sm)] leading-relaxed outline-none transition-colors",
              editing
                ? "border-border bg-bg text-text focus:border-primary/60 focus:ring-2 focus:ring-primary/10"
                : "border-transparent bg-bg-tertiary text-text-secondary",
            )}
          />

          <div className="mt-[var(--space-150)] rounded-[var(--radius-sm)] border border-border bg-bg-tertiary px-[var(--space-200)] py-[var(--space-150)]">
            <div className="flex flex-wrap items-center justify-between gap-[var(--space-150)]">
              <div>
                <div className="text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)] text-text">
                  点评可见范围
                </div>
                <div className="mt-[2px] text-[length:var(--font-size-xs)] text-text-tertiary">
                  {report.studentVisible
                    ? "学生和家长都能看到这条点评。"
                    : "仅发送给家长，学生端暂不展示。"}
                </div>
              </div>
              <button
                type="button"
                onClick={() => updateLessonReportStudentVisible(lessonId, report.studentName, !report.studentVisible)}
                className={cn(
                  "inline-flex items-center gap-[var(--space-100)] rounded-full border px-[var(--space-250)] py-[var(--space-100)] text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] transition-colors",
                  report.studentVisible
                    ? "border-[var(--color-success)]/40 bg-[var(--color-success)]/10 text-[var(--color-success)]"
                    : "border-border bg-bg text-text-secondary hover:border-border-strong",
                )}
              >
                {report.studentVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                {report.studentVisible ? "学生可见" : "仅家长可见"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-[var(--space-200)] flex flex-wrap items-center justify-end gap-[var(--space-100)]">
        <button
          type="button"
          onClick={onPreview}
          className="rounded-full border border-border px-[var(--space-250)] py-[var(--space-100)] text-[length:var(--font-size-xs)] text-text-secondary"
        >
          预览报告
        </button>
        {report.teacherConfirmed ? (
          <button
            type="button"
            onClick={() => {
              unconfirmLessonReport(lessonId, report.studentName)
              onEditingChange(true)
            }}
            className="rounded-full border border-border px-[var(--space-250)] py-[var(--space-100)] text-[length:var(--font-size-xs)] text-text-secondary"
          >
            编辑修改
          </button>
        ) : (
          <button
            type="button"
            disabled={!canConfirm}
            onClick={onConfirmAndNext}
            className={cn(
              "rounded-full px-[var(--space-250)] py-[var(--space-100)] text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)]",
              canConfirm ? "bg-[var(--color-success)] text-white" : "bg-[var(--black-alpha-11)] text-text-tertiary",
            )}
          >
            确认报告
          </button>
        )}
      </div>
    </div>
  )
}

function PreviewDialog({
  report,
  assets,
  classSummary,
  onClose,
}: {
  report: LessonStudentReport
  assets: LessonReviewAsset[]
  classSummary: string
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/45 p-4">
      <div className="w-full max-w-[760px] rounded-[var(--radius-lg)] border border-border bg-bg shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-[var(--space-300)] py-[var(--space-200)]">
          <div className="text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)] text-text">
            风采报告预览 · {report.studentName}
          </div>
          <button type="button" onClick={onClose} className="text-[length:var(--font-size-xs)] text-text-tertiary">
            关闭
          </button>
        </div>
        <div className="grid gap-[var(--space-200)] p-[var(--space-300)] md:grid-cols-2">
          <SocialFeedCard
            report={report}
            assets={assets}
            title="家长视角"
            summary={classSummary}
            readOnly
          />
          <SocialFeedCard
            report={report}
            assets={assets}
            title="学生视角"
            summary={classSummary}
            hideSentence={!report.studentVisible}
            readOnly
          />
        </div>
      </div>
    </div>
  )
}

function AssetPickerDialog({
  assets,
  selectedIds,
  onClose,
  onConfirm,
}: {
  assets: LessonReviewAsset[]
  selectedIds: string[]
  onClose: () => void
  onConfirm: (assetIds: string[]) => void
}) {
  const [picked, setPicked] = React.useState<string[]>([])
  const selectable = assets.filter((a) => !selectedIds.includes(a.id))
  return (
    <div className="fixed inset-0 z-[310] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-[680px] rounded-[var(--radius-lg)] border border-border bg-bg shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-[var(--space-250)] py-[var(--space-200)]">
          <div className="text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)] text-text">
            选择要添加的风采素材（可多选）
          </div>
          <button type="button" onClick={onClose} className="text-text-tertiary">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[420px] overflow-y-auto p-[var(--space-250)]">
          {selectable.length === 0 ? (
            <div className="rounded-[var(--radius-sm)] border border-dashed border-border px-[var(--space-200)] py-[var(--space-200)] text-[length:var(--font-size-xs)] text-text-tertiary">
              没有可新增素材。
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-[var(--space-150)] sm:grid-cols-3">
              {selectable.map((asset) => {
                const checked = picked.includes(asset.id)
                return (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() =>
                      setPicked((prev) =>
                        prev.includes(asset.id)
                          ? prev.filter((id) => id !== asset.id)
                          : [...prev, asset.id],
                      )
                    }
                    className={cn(
                      "relative rounded-[var(--radius-sm)] border p-[var(--space-100)] text-left",
                      checked ? "border-[var(--color-primary)] bg-[var(--color-primary)]/8" : "border-border bg-bg",
                    )}
                  >
                    <AssetThumb asset={asset} compact />
                    {checked ? (
                      <span className="absolute right-2 top-2 inline-flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-primary)] text-white">
                        <Check className="h-3 w-3" />
                      </span>
                    ) : null}
                  </button>
                )
              })}
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-[var(--space-100)] border-t border-border px-[var(--space-250)] py-[var(--space-200)]">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-border px-[var(--space-200)] py-[var(--space-100)] text-[length:var(--font-size-xs)] text-text-secondary"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => onConfirm(picked)}
            disabled={picked.length === 0}
            className={cn(
              "rounded-full px-[var(--space-250)] py-[var(--space-100)] text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)]",
              picked.length > 0
                ? "bg-primary text-[var(--color-primary-foreground,white)]"
                : "bg-[var(--black-alpha-11)] text-text-tertiary",
            )}
          >
            添加选中素材（{picked.length}）
          </button>
        </div>
      </div>
    </div>
  )
}

function StudentOrParentReportPanel({
  role,
  lessonId,
  lessonTitle,
  stage,
}: {
  role: "student" | "parent"
  lessonId: string
  lessonTitle: string
  stage: EducationStage
}) {
  const snapshot = useLessonReviewSnapshot(lessonId)
  const selfName = getSelfStudentName(role)
  const selfReport = snapshot.reports.find((r) => r.studentName === selfName && r.sendStatus === "sent")
  const [commentDraft, setCommentDraft] = React.useState("")

  const title = role === "student" ? `风采报告 · ${lessonTitle}` : `风采报告 · ${selfName}`
  const emptyText =
    role === "student"
      ? "风采报告还没生成。老师会在本节课结束后整理并发送给你，发送时会提醒你查看。"
      : "孩子的风采报告还没生成。老师会在本节课结束后整理并发送给你，发送时我们会在主对话提醒你查看。"

  if (stage !== "post" || !selfReport) {
    return (
      <GenericCard title={title}>
        <div className="mt-[var(--space-150)] rounded-[var(--radius-md)] border border-dashed border-border bg-bg-tertiary px-[var(--space-250)] py-[var(--space-300)] text-[length:var(--font-size-sm)] text-text-secondary">
          {emptyText}
        </div>
      </GenericCard>
    )
  }

  return (
    <GenericCard title={title}>
      <div className="mt-[var(--space-150)] flex flex-col gap-[var(--space-200)]">
        <SocialFeedCard
          report={selfReport}
          assets={snapshot.assets}
          summary={snapshot.classSummary}
          hideSentence={role === "student" && !selfReport.studentVisible}
          readOnly={false}
          actionLike={() => likeLessonReport(lessonId, selfReport.studentName, role)}
        />
        <div className="rounded-[var(--radius-md)] border border-border bg-bg px-[var(--space-200)] py-[var(--space-150)]">
          <div className="text-[length:var(--font-size-xs)] text-text-tertiary">评论区</div>
          <div className="mt-[var(--space-100)] flex flex-col gap-[var(--space-100)]">
            {(selfReport.comments ?? []).length > 0 ? (
              (selfReport.comments ?? []).map((c) => (
                <div
                  key={c.id}
                  className="rounded-[var(--radius-sm)] border border-border bg-bg-tertiary px-[var(--space-150)] py-[var(--space-100)] text-[length:var(--font-size-xs)] text-text-secondary"
                >
                  <span className="text-text-tertiary">
                    {c.byRole === "parent" ? "家长" : c.byRole === "student" ? "学生" : "老师"}：
                  </span>
                  {c.text}
                </div>
              ))
            ) : (
              <div className="text-[length:var(--font-size-xs)] text-text-tertiary">暂无评论</div>
            )}
          </div>
          <div className="mt-[var(--space-100)] flex items-center gap-[var(--space-100)]">
            <input
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              placeholder="写下评论..."
              className="h-8 flex-1 rounded-md border border-border bg-bg px-2 text-[length:var(--font-size-xs)] text-text"
            />
            <button
              type="button"
              onClick={() => {
                commentLessonReport(lessonId, selfReport.studentName, role, commentDraft)
                setCommentDraft("")
              }}
              className="inline-flex items-center gap-1 rounded-full border border-border px-[var(--space-150)] py-[2px] text-[length:var(--font-size-xs)] text-text-secondary"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              发送
            </button>
          </div>
        </div>
      </div>
    </GenericCard>
  )
}

/**
 * 已发布风采的"社交流卡片"形态：avatar + 名 + 班级总结(可选) + 老师一句点评 + 素材缩略 + 点赞/评论数。
 *
 * 已 export，给「教学管理 · 点评风采列表卡」的"已发"行复用，保证主对话内列表卡和子 CUI 内
 * 看到的同一节课某孩子风采视觉完全一致（PRD § 4.5.1 "学生 / 家长侧统一称风采报告"）。
 */
export function SocialFeedCard({
  report,
  assets,
  summary,
  title,
  hideSentence = false,
  readOnly = true,
  actionLike,
}: {
  report: LessonStudentReport
  assets: LessonReviewAsset[]
  summary?: string
  title?: string
  hideSentence?: boolean
  readOnly?: boolean
  actionLike?: () => void
}) {
  return (
    <div className="rounded-[var(--radius-md)] border border-border bg-bg px-[var(--space-200)] py-[var(--space-200)]">
      {title ? (
        <div className="mb-[var(--space-100)] text-[length:var(--font-size-xs)] text-text-tertiary">{title}</div>
      ) : null}
      <div className="flex items-start gap-[var(--space-150)]">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--color-primary)]/12 text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-[var(--color-primary)]">
          {report.studentName.slice(0, 1)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)] text-text">{report.studentName}</div>
          {summary ? (
            <div className="mt-[var(--space-100)] text-[length:var(--font-size-xs)] text-text-tertiary">{summary}</div>
          ) : null}
          <div className="mt-[var(--space-100)] text-[length:var(--font-size-sm)] leading-relaxed text-text-secondary">
            {hideSentence ? "老师将此条点评设置为仅家长可见。" : report.sentence}
          </div>
        </div>
      </div>
      <div className="mt-[var(--space-150)]">
        <AssetThumbGrid assets={assets} assetIds={report.assetIds} />
      </div>
      <div className="mt-[var(--space-100)] flex items-center gap-[var(--space-250)] border-t border-border pt-[var(--space-100)]">
        <button
          type="button"
          onClick={actionLike}
          disabled={readOnly}
          className={cn(
            "inline-flex items-center gap-[var(--space-100)] text-[length:var(--font-size-sm)]",
            readOnly ? "text-text-tertiary" : "text-text-secondary hover:text-text",
          )}
        >
          <Heart className="h-4 w-4" />
          {report.parentLiked || report.studentLiked ? "1" : "0"}
        </button>
        <button
          type="button"
          disabled
          className="inline-flex items-center gap-[var(--space-100)] text-[length:var(--font-size-sm)] text-text-tertiary"
        >
          <MessageSquare className="h-4 w-4" />
          {(report.comments ?? []).length}
        </button>
      </div>
    </div>
  )
}

function AssetThumbGrid({
  assets,
  assetIds,
  removable = false,
  onRemove,
  onAdd,
}: {
  assets: LessonReviewAsset[]
  assetIds: string[]
  removable?: boolean
  onRemove?: (assetId: string) => void
  onAdd?: () => void
}) {
  const list = assetIds
    .map((id) => assets.find((a) => a.id === id))
    .filter((a): a is LessonReviewAsset => Boolean(a))
  return (
    <div className="grid grid-cols-2 gap-[var(--space-100)] sm:grid-cols-3">
      {list.map((asset) => (
        <AssetThumb key={asset.id} asset={asset} removable={removable} onRemove={onRemove} />
      ))}
      {onAdd ? <AddAssetTile onClick={onAdd} label="添加素材" hint="从风采列表挑选" /> : null}
      {list.length === 0 && !onAdd ? (
        <div className="col-span-full rounded-[var(--radius-sm)] border border-dashed border-border px-[var(--space-150)] py-[var(--space-150)] text-[length:var(--font-size-xs)] text-text-tertiary">
          暂无素材缩略图
        </div>
      ) : null}
    </div>
  )
}

function AssetThumb({
  asset,
  compact = false,
  removable = false,
  onRemove,
}: {
  asset: LessonReviewAsset
  compact?: boolean
  removable?: boolean
  onRemove?: (assetId: string) => void
}) {
  const isVideo = asset.type === "video"
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-[var(--radius-sm)] border border-border bg-[linear-gradient(135deg,#eef5ff,#f5efff)]",
        compact ? "h-[84px]" : "h-[96px]",
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(120,140,255,0.35),transparent_45%),radial-gradient(circle_at_80%_80%,rgba(87,214,255,0.25),transparent_45%)]" />
      <div className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/45 px-2 py-[2px] text-[10px] text-white">
        {isVideo ? <Video className="h-3 w-3" /> : <Camera className="h-3 w-3" />}
        {isVideo ? "视频" : "照片"}
      </div>
      <div className="absolute bottom-2 left-2 right-2 truncate text-[10px] text-white/90">{asset.name}</div>
      {removable ? (
        <button
          type="button"
          onClick={() => onRemove?.(asset.id)}
          className="absolute right-2 bottom-2 hidden rounded-full bg-black/50 p-1 text-white group-hover:block"
          aria-label="从该孩子报告中移除素材"
        >
          <X className="h-3 w-3" />
        </button>
      ) : null}
    </div>
  )
}

function AddAssetTile({
  onClick,
  label,
  hint,
}: {
  onClick: () => void
  label?: string
  hint?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative h-full min-h-[96px] w-full overflow-hidden rounded-[var(--radius-md)] border-2 border-dashed",
        "border-[color-mix(in_srgb,var(--color-primary)_45%,transparent)] bg-[color-mix(in_srgb,var(--color-primary)_4%,transparent)]",
        "transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/8",
      )}
      aria-label={label ?? "添加素材"}
    >
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-[var(--space-100)] px-[var(--space-200)] text-center">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--color-primary)]/12 text-[var(--color-primary)]">
          <Plus className="h-5 w-5" strokeWidth={2.25} />
        </span>
        {label ? (
          <span className="text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] text-text">
            {label}
          </span>
        ) : null}
        {hint ? (
          <span className="text-[10px] text-text-tertiary">{hint}</span>
        ) : null}
      </div>
    </button>
  )
}
