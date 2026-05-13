/**
 * 作业闭环 · 子 CUI 主卡片
 *
 * 入口
 * --------------------------------------------------
 * 子 CUI thread 内由 marker `<<<RENDER_AIC_HOMEWORK_CARD>>>:<role>:<lessonId>` 触发渲染。
 * 履约卡 / 教学管理列表卡的「📝 作业」点击 → 命令"布置今晚作业" / "我的作业" /
 * "看孩子今晚作业" → 在 panel 内被拦截 → push 此 marker。
 *
 * 三角色路由
 * --------------------------------------------------
 * - teacher / admin → TeacherHomeworkRoot：列表（含 2 Tab）+ 创建表单 + AI 预览 + 已发布回看 + 批改
 * - student         → StudentHomeworkRoot：本节作业列表 + 做题卡 + 一键批改反馈页
 * - parent          → ParentHomeworkRoot：辅导卡（题目 + 答案 + 解析 + 进度 + 陪练建议）
 *
 * 数据
 * --------------------------------------------------
 * 全部由 `lessonHomeworkStore` 承载；跨身份切换走 sessionStorage 共享，
 * "刷新页面 = 演示归零" 与 lessonReviewStore 同款。
 *
 * 与现有体系的边界
 * --------------------------------------------------
 * - 不替换 Skill 卡 `tc-question` / `ta-asgmt` / `sa-asgmt` / `sa-mistakes`；
 *   旧 chip 仍可点（点击后 panel 仍走原文本回复），新卡是结构化的作业管理实体
 * - 资料联动：发布作业生成的 PDF 由 `pdfFileName` / `pdfSize` 占位，未来接 eduCoursesPersistence
 *   后将 push 一份"作业 PDF"到课次资料库（本期 mock，留扩展位）
 */

import * as React from "react"
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ClipboardList,
  Eye,
  EyeOff,
  FileText,
  Lightbulb,
  Lock,
  MessageSquare,
  Pencil,
  Plus,
  RefreshCw,
  Wand2,
  Search,
  Send,
  Sparkles,
  Trash2,
  User as UserIcon,
  Users,
  X,
} from "lucide-react"
import { GenericCard } from "./GenericCard"
import { cn } from "../ui/utils"
import type { EduLessonAttendingRole } from "./homeScenarioLayout"
import {
  addManualQuestion,
  addAiGeneratedQuestions,
  batchConfirmAll,
  confirmTeacherFinal,
  createHomeworkDraft,
  deleteHomework,
  deriveGradingStats,
  deriveSubmissionStatus,
  generateHomeworkQuestions,
  getSelfStudentIdForRole,
  getSubmissionQuestions,
  moveStudentToLayer,
  publishHomework,
  regenerateQuestion,
  removeQuestion,
  resolveAppeal,
  returnSubmissionForRedo,
  saveStudentDraft,
  submitAndAutoGrade,
  submitAppeal,
  updateHomeworkDraft,
  useHomework,
  useLessonHomeworkSnapshot,
  withdrawHomework,
  type HomeworkDifficulty,
  type HomeworkKnowledgePoint,
  type HomeworkLayer,
  type HomeworkMode,
  type HomeworkQuestion,
  type HomeworkQuestionType,
  type HomeworkQuestionTypeConfig,
  type HomeworkStage,
  type HomeworkSubmission,
  type HomeworkSubmissionStatus,
  type LessonHomework,
} from "./lessonHomeworkStore"
import {
  DEMO_HOMEWORK_STUDENTS,
  DEMO_SELF_STUDENT_NAME,
  flattenKnowledgeTree,
  getDefaultHomeworkRequirement,
  getKnowledgeTree,
  HOMEWORK_DIFFICULTY_LABEL,
  HOMEWORK_QUESTION_TYPE_LABEL,
  type KnowledgePointTree,
} from "./lessonHomeworkDemo"

/* ============================================================
 * Marker 协议
 * ============================================================ */

export const RENDER_AIC_HOMEWORK_CARD_MARKER = "<<<RENDER_AIC_HOMEWORK_CARD>>>"

export interface LessonHomeworkMarkerPayload {
  role: EduLessonAttendingRole
  lessonId: string
}

export function buildLessonHomeworkMarkerContent(
  payload: LessonHomeworkMarkerPayload,
): string {
  return `${RENDER_AIC_HOMEWORK_CARD_MARKER}:${payload.role}:${payload.lessonId}`
}

export function parseLessonHomeworkMarkerContent(
  content: string,
): LessonHomeworkMarkerPayload | null {
  const prefix = `${RENDER_AIC_HOMEWORK_CARD_MARKER}:`
  if (!content.startsWith(prefix)) return null
  const rest = content.slice(prefix.length)
  const colonIdx = rest.indexOf(":")
  if (colonIdx < 0) return null
  const role = rest.slice(0, colonIdx)
  const lessonId = rest.slice(colonIdx + 1).trim()
  if (!lessonId) return null
  if (role !== "teacher" && role !== "student" && role !== "parent") return null
  return { role: role as EduLessonAttendingRole, lessonId }
}

/* ============================================================
 * 顶级组件
 * ============================================================ */

export interface LessonHomeworkCardProps {
  role: EduLessonAttendingRole
  lessonId: string
  lessonTitle: string
  /** 课程名（用于表单只读字段；缺省回退到 lessonTitle） */
  courseName?: string
  /** 学科（用于表单只读字段 + AI 出题路由；缺省 "英语"） */
  subject?: string
  /** 年级（用于表单只读字段 + 知识点树路由；缺省 "小学四年级"） */
  grade?: string
  /** 课次实时状态：决定作业阶段的强绑值（pending/soon → pre；in → in；completed → post） */
  effectiveStage?: "pre" | "in" | "post"
  teacherName?: string
}

export function LessonHomeworkCard({
  role,
  lessonId,
  lessonTitle,
  courseName,
  subject,
  grade,
  effectiveStage,
  teacherName,
}: LessonHomeworkCardProps) {
  const ctx: HomeworkCtx = React.useMemo(
    () => ({
      lessonId,
      lessonTitle,
      courseName: courseName ?? lessonTitle,
      subject: subject ?? "英语",
      grade: grade ?? "小学四年级",
      effectiveStage: effectiveStage ?? "post",
      teacherName: teacherName ?? "王老师",
    }),
    [
      lessonId,
      lessonTitle,
      courseName,
      subject,
      grade,
      effectiveStage,
      teacherName,
    ],
  )

  if (role === "teacher") {
    return <TeacherHomeworkRoot ctx={ctx} />
  }
  if (role === "student") {
    return <StudentHomeworkRoot ctx={ctx} />
  }
  return <ParentHomeworkRoot ctx={ctx} />
}

interface HomeworkCtx {
  lessonId: string
  lessonTitle: string
  courseName: string
  subject: string
  grade: string
  effectiveStage: HomeworkStage
  teacherName: string
}

/* ============================================================
 * 老师 / 管理者 主入口
 * ============================================================ */

type TeacherSubview =
  | { kind: "list"; tab: "list" | "grading" }
  | { kind: "create"; homeworkId: string; deleteOnCancel?: boolean }
  | { kind: "preview"; homeworkId: string }
  | { kind: "published"; homeworkId: string }
  | { kind: "grading"; homeworkId: string }

function TeacherHomeworkRoot({ ctx }: { ctx: HomeworkCtx }) {
  const snap = useLessonHomeworkSnapshot(ctx.lessonId)
  /** 初始 Tab：post + 有待复核 → 默认 grading；否则 list */
  const initialView: TeacherSubview = React.useMemo(() => {
    const hasPending = snap.homeworks.some((hw) => {
      if (!hw.publishedAt) return false
      return hw.submissions.some(
        (s) =>
          s.autoReview &&
          !s.teacherFinal &&
          (s.autoReview.overallConfidence < 0.9 || s.autoReview.suspectAnomaly),
      )
    })
    if (ctx.effectiveStage === "post" && hasPending) {
      return { kind: "list", tab: "grading" }
    }
    return { kind: "list", tab: "list" }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [view, setView] = React.useState<TeacherSubview>(initialView)

  const goHome = () =>
    setView({ kind: "list", tab: view.kind === "grading" ? "grading" : "list" })

  if (view.kind === "create") {
    return (
      <TeacherHomeworkCreateForm
        ctx={ctx}
        homeworkId={view.homeworkId}
        onCancel={() => {
          if (view.deleteOnCancel) {
            deleteHomework(view.homeworkId)
          }
          goHome()
        }}
        onPublished={() =>
          setView({ kind: "published", homeworkId: view.homeworkId })
        }
      />
    )
  }
  if (view.kind === "preview") {
    return (
      <TeacherHomeworkPreview
        ctx={ctx}
        homeworkId={view.homeworkId}
        onBack={() => setView({ kind: "create", homeworkId: view.homeworkId })}
        onPublished={() =>
          setView({ kind: "published", homeworkId: view.homeworkId })
        }
      />
    )
  }
  if (view.kind === "published") {
    return (
      <TeacherHomeworkPublished
        ctx={ctx}
        homeworkId={view.homeworkId}
        onBack={() => setView({ kind: "list", tab: "list" })}
        onContinue={() => {
          /** 继续布置作业：进入新的草稿创建流 */
          const draft = createHomeworkDraft(buildDefaultDraftInput(ctx))
          setView({ kind: "create", homeworkId: draft.id, deleteOnCancel: true })
        }}
        onWithdrawn={() => setView({ kind: "list", tab: "list" })}
      />
    )
  }
  if (view.kind === "grading") {
    return (
      <TeacherHomeworkGrading
        ctx={ctx}
        homeworkId={view.homeworkId}
        onBack={() => setView({ kind: "list", tab: "grading" })}
      />
    )
  }
  /** kind = "list" */
  return (
    <GenericCard title={`作业 · ${ctx.lessonTitle}`}>
      <div className="flex w-full flex-col gap-[var(--space-200)]">
        <TabsBar
          active={view.tab}
          counts={{
            list: snap.homeworks.length,
            grading: snap.homeworks.reduce((sum, hw) => {
              if (!isHomeworkPublished(hw)) return sum
              return (
                sum +
                hw.submissions.filter(
                  (s) =>
                    s.autoReview &&
                    !s.teacherFinal &&
                    (s.autoReview.overallConfidence < 0.9 ||
                      s.autoReview.suspectAnomaly ||
                      (s.appeal && !s.appeal.resolvedAt)),
                ).length
              )
            }, 0),
          }}
          onPick={(tab) => setView({ kind: "list", tab })}
        />
        {view.tab === "list" ? (
          <TeacherHomeworkListTab
            ctx={ctx}
            homeworks={snap.homeworks}
            onOpen={(hw) =>
              setView(
                isHomeworkPublished(hw)
                  ? { kind: "published", homeworkId: hw.id }
                  : { kind: "create", homeworkId: hw.id },
              )
            }
            onCreate={() => {
              const draft = createHomeworkDraft(buildDefaultDraftInput(ctx))
              setView({ kind: "create", homeworkId: draft.id, deleteOnCancel: true })
            }}
          />
        ) : (
          <TeacherHomeworkGradingTab
            ctx={ctx}
            homeworks={snap.homeworks}
            onOpen={(id) => setView({ kind: "grading", homeworkId: id })}
          />
        )}
      </div>
    </GenericCard>
  )
}

function buildDefaultDraftInput(ctx: HomeworkCtx) {
  return {
    lessonId: ctx.lessonId,
    title: "",
    courseName: ctx.courseName,
    subject: ctx.subject,
    grade: ctx.grade,
    teacherName: ctx.teacherName,
    stage: ctx.effectiveStage,
    difficulty: "medium" as HomeworkDifficulty,
    mode: "uniform" as HomeworkMode,
    targetStudentIds: DEMO_HOMEWORK_STUDENTS.map((s) => s.id),
    knowledgePoints: [] as HomeworkKnowledgePoint[],
    questionTypeConfig: [
      { type: "single" as HomeworkQuestionType, count: 5 },
    ] as HomeworkQuestionTypeConfig[],
  }
}

function isHomeworkPublished(hw: LessonHomework): boolean {
  return Boolean(hw.publishedAt)
}

function homeworkStatusLabel(hw: LessonHomework): "草稿" | "已发布" {
  return isHomeworkPublished(hw) ? "已发布" : "草稿"
}

/* ============================================================
 * 老师 · Tab 切换
 * ============================================================ */

function TabsBar({
  active,
  counts,
  onPick,
}: {
  active: "list" | "grading"
  counts: { list: number; grading: number }
  onPick: (t: "list" | "grading") => void
}) {
  return (
    <div className="grid grid-cols-2 gap-[var(--space-150)] rounded-[var(--radius-md)] border border-border bg-bg-tertiary p-[2px]">
      <TabButton
        active={active === "list"}
        onClick={() => onPick("list")}
        label="作业列表"
        badge={counts.list}
      />
      <TabButton
        active={active === "grading"}
        onClick={() => onPick("grading")}
        label="批改作业"
        badge={counts.grading}
        badgeTone={counts.grading > 0 ? "danger" : "default"}
      />
    </div>
  )
}

function TabButton({
  active,
  onClick,
  label,
  badge,
  badgeTone = "default",
}: {
  active: boolean
  onClick: () => void
  label: string
  badge: number
  badgeTone?: "default" | "danger"
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center gap-[var(--space-100)] rounded-[var(--radius-sm)] px-[var(--space-300)] py-[var(--space-200)] text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)] transition-colors",
        active
          ? "bg-bg text-[var(--color-primary)] shadow-sm"
          : "text-text-secondary hover:bg-bg",
      )}
    >
      {label}
      {badge > 0 ? (
        <span
          className={cn(
            "inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-[var(--space-100)] text-[10px] font-[var(--font-weight-medium)] leading-none",
            badgeTone === "danger"
              ? "bg-[var(--color-error,#ef4444)] text-white"
              : "bg-[var(--color-primary)]/12 text-[var(--color-primary)]",
          )}
        >
          {badge}
        </span>
      ) : null}
    </button>
  )
}

/* ============================================================
 * 老师 · 作业列表 Tab
 * ============================================================ */

function TeacherHomeworkListTab({
  ctx: _ctx,
  homeworks,
  onOpen,
  onCreate,
}: {
  ctx: HomeworkCtx
  homeworks: LessonHomework[]
  onOpen: (hw: LessonHomework) => void
  onCreate: () => void
}) {
  const [statusFilter, setStatusFilter] = React.useState<"all" | "draft" | "published">("all")
  const counts = {
    all: homeworks.length,
    draft: homeworks.filter((hw) => !isHomeworkPublished(hw)).length,
    published: homeworks.filter(isHomeworkPublished).length,
  }
  const visible = homeworks.filter((hw) => {
    if (statusFilter === "draft") return !isHomeworkPublished(hw)
    if (statusFilter === "published") return isHomeworkPublished(hw)
    return true
  })
  return (
    <div className="flex flex-col gap-[var(--space-200)]">
      <div className="flex flex-wrap items-center gap-[var(--space-100)]">
        <HomeworkStatusFilterChip
          active={statusFilter === "all"}
          label={`全部 ${counts.all}`}
          onClick={() => setStatusFilter("all")}
        />
        <HomeworkStatusFilterChip
          active={statusFilter === "draft"}
          label={`草稿 ${counts.draft}`}
          onClick={() => setStatusFilter("draft")}
        />
        <HomeworkStatusFilterChip
          active={statusFilter === "published"}
          label={`已发布 ${counts.published}`}
          onClick={() => setStatusFilter("published")}
        />
      </div>

      {visible.length > 0 ? (
        visible.map((hw) => (
          <HomeworkListRow key={hw.id} hw={hw} onClick={() => onOpen(hw)} />
        ))
      ) : (
        <div className="rounded-[var(--radius-md)] border border-dashed border-border bg-bg-tertiary px-[var(--space-300)] py-[var(--space-400)] text-center text-[length:var(--font-size-sm)] text-text-tertiary">
          {statusFilter === "all"
            ? "本节还没有布置作业。点下方按钮派发课前 / 课中 / 课后作业。"
            : statusFilter === "draft"
              ? "暂无草稿作业。"
              : "暂无已发布作业。"}
        </div>
      )}
      <button
        type="button"
        onClick={onCreate}
        className="inline-flex w-full items-center justify-center gap-[var(--space-150)] rounded-[var(--radius-md)] border border-dashed border-[var(--color-primary)]/45 bg-[var(--color-primary)]/5 px-[var(--space-300)] py-[var(--space-250)] text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)] text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)]/8"
      >
        <Plus className="h-4 w-4" />
        布置作业
      </button>
    </div>
  )
}

function HomeworkStatusFilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center rounded-full px-[var(--space-250)] py-[var(--space-100)] text-[length:var(--font-size-xs)] transition-colors",
        active
          ? "bg-[var(--color-primary)]/12 text-[var(--color-primary)]"
          : "text-text-secondary hover:bg-[var(--black-alpha-11)]",
      )}
    >
      {label}
    </button>
  )
}

function HomeworkListRow({
  hw,
  onClick,
}: {
  hw: LessonHomework
  onClick: () => void
}) {
  const studentNames = hw.submissions
    .map((s) => s.studentName)
    .slice(0, 3)
    .join("、")
  const remainder = Math.max(0, hw.submissions.length - 3)
  const isPublished = isHomeworkPublished(hw)
  const isDraft = !isPublished
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative flex w-full flex-col gap-[var(--space-150)] rounded-[var(--radius-md)] border bg-bg px-[var(--space-300)] py-[var(--space-250)] text-left transition-colors",
        isDraft
          ? "border-border bg-bg-tertiary text-text-tertiary"
          : "border-border hover:border-[var(--color-primary)]/35 hover:bg-bg-secondary/40",
      )}
    >
      <div className="flex items-start gap-[var(--space-200)]">
        <span className="flex-1 truncate text-[length:var(--font-size-md)] font-[var(--font-weight-semibold)] text-text">
          {hw.title}
          <span
            className={cn(
              "ml-[var(--space-150)] inline-flex items-center rounded-[var(--radius-sm)] border px-[var(--space-150)] py-[1px] text-[length:var(--font-size-xs)]",
              isPublished
                ? "border-[var(--color-success)]/40 bg-[var(--color-success)]/10 text-[var(--color-success)]"
                : "border-[var(--color-warning,#f59e0b)]/40 bg-[var(--color-warning,#f59e0b)]/10 text-[var(--color-warning,#f59e0b)]",
            )}
          >
            {homeworkStatusLabel(hw)}
          </span>
        </span>
        <ChevronRight className="h-4 w-4 flex-none text-text-tertiary" />
      </div>
      <div className="flex flex-wrap items-center gap-x-[var(--space-200)] gap-y-[var(--space-100)] text-[length:var(--font-size-xs)] text-text-tertiary">
        <span className="inline-flex items-center gap-[var(--space-100)]">
          <UserIcon className="h-3 w-3" />
          {hw.teacherName}
        </span>
        <span>
          {isPublished
            ? `发布 ${formatPublishedAt(hw.publishedAt ?? hw.createdAt)}`
            : hw.withdrawnAt
              ? `撤回 ${formatPublishedAt(hw.withdrawnAt)}`
              : `创建 ${formatPublishedAt(hw.createdAt)}`}
        </span>
        <span className="inline-flex items-center gap-[var(--space-100)]">
          <FileText className="h-3 w-3" />
          {hw.refNo}
        </span>
      </div>
      <div className="inline-flex items-center gap-[var(--space-100)] text-[length:var(--font-size-xs)] text-text-secondary">
        <Users className="h-3 w-3 text-text-tertiary" />
        {studentNames}
        {remainder > 0 ? ` 等 ${remainder} 人` : ""}
      </div>
    </button>
  )
}

function formatPublishedAt(ts: number): string {
  const d = new Date(ts)
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  const hh = String(d.getHours()).padStart(2, "0")
  const mi = String(d.getMinutes()).padStart(2, "0")
  return `${mm}-${dd} ${hh}:${mi}`
}

/* ============================================================
 * 老师 · 批改作业 Tab
 * ============================================================ */

function TeacherHomeworkGradingTab({
  ctx: _ctx,
  homeworks,
  onOpen,
}: {
  ctx: HomeworkCtx
  homeworks: LessonHomework[]
  onOpen: (id: string) => void
}) {
  const published = homeworks.filter((hw) => hw.publishedAt && !hw.withdrawnAt)
  if (published.length === 0) {
    return (
      <div className="rounded-[var(--radius-md)] border border-dashed border-border bg-bg-tertiary px-[var(--space-300)] py-[var(--space-400)] text-center text-[length:var(--font-size-sm)] text-text-tertiary">
        暂无可批改作业。先在「作业列表」布置一份吧。
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-[var(--space-200)]">
      {published.map((hw) => {
        const stats = deriveGradingStats(hw)
        return (
          <button
            key={hw.id}
            type="button"
            onClick={() => onOpen(hw.id)}
            className="flex w-full flex-col gap-[var(--space-200)] rounded-[var(--radius-md)] border border-border bg-bg px-[var(--space-300)] py-[var(--space-250)] text-left transition-colors hover:border-[var(--color-primary)]/35 hover:bg-bg-secondary/40"
          >
            <div className="flex items-start gap-[var(--space-200)]">
              <span className="flex-1 truncate text-[length:var(--font-size-md)] font-[var(--font-weight-semibold)] text-text">
                {hw.title}
              </span>
              <ChevronRight className="h-4 w-4 flex-none text-text-tertiary" />
            </div>
            <div className="grid grid-cols-2 gap-[var(--space-150)] sm:grid-cols-4">
              <StatTile label="已交" value={`${stats.submitted}/${stats.total}`} tone="default" />
              <StatTile label="待复核" value={`${stats.pendingReview}`} tone={stats.pendingReview > 0 ? "warning" : "default"} />
              <StatTile label="已确认" value={`${stats.confirmed}`} tone={stats.confirmed > 0 ? "success" : "default"} />
              <StatTile label="正确率" value={`${stats.accuracy}%`} tone={stats.accuracy >= 70 ? "success" : "warning"} />
            </div>
            {stats.appealCount + stats.anomalyCount > 0 ? (
              <div className="inline-flex items-center gap-[var(--space-100)] text-[length:var(--font-size-xs)] text-[var(--color-warning,#f59e0b)]">
                <AlertTriangle className="h-3.5 w-3.5" />
                {stats.appealCount > 0 ? `申诉 ${stats.appealCount} 起` : ""}
                {stats.appealCount > 0 && stats.anomalyCount > 0 ? " · " : ""}
                {stats.anomalyCount > 0 ? `异常 ${stats.anomalyCount} 起` : ""}
              </div>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

function StatTile({
  label,
  value,
  tone = "default",
}: {
  label: string
  value: string
  tone?: "default" | "warning" | "success"
}) {
  const toneCls =
    tone === "success"
      ? "border-[var(--color-success)]/30 bg-[var(--color-success)]/5 text-[var(--color-success)]"
      : tone === "warning"
        ? "border-[var(--color-warning,#f59e0b)]/30 bg-[var(--color-warning,#f59e0b)]/5 text-[var(--color-warning,#f59e0b)]"
        : "border-border bg-bg text-text"
  return (
    <div
      className={cn(
        "flex flex-col items-start gap-[2px] rounded-[var(--radius-sm)] border px-[var(--space-200)] py-[var(--space-150)]",
        toneCls,
      )}
    >
      <span className="text-[length:var(--font-size-xs)] text-text-tertiary">{label}</span>
      <span className="text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] tabular-nums">
        {value}
      </span>
    </div>
  )
}

/* ============================================================
 * 老师 · 创建作业表单
 * ============================================================ */

function TeacherHomeworkCreateForm({
  ctx,
  homeworkId,
  onCancel,
  onPublished,
}: {
  ctx: HomeworkCtx
  homeworkId: string
  onCancel: () => void
  onPublished: () => void
}) {
  const hw = useHomework(homeworkId)
  const [kpPickerOpen, setKpPickerOpen] = React.useState(false)
  const [manualKpInput, setManualKpInput] = React.useState("")
  const [showManualKpInput, setShowManualKpInput] = React.useState(false)
  const [generating, setGenerating] = React.useState(false)
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [activeLayer, setActiveLayer] = React.useState<HomeworkLayer>("A")
  const [adding, setAdding] = React.useState(false)

  if (!hw) return null

  const kpLabels = hw.knowledgePoints.map((kp) => kp.label).join("、")
  const totalQuestionCount = hw.questionTypeConfig.reduce(
    (sum, q) => sum + q.count,
    0,
  )
  const canSubmit =
    hw.targetStudentIds.length > 0 &&
    hw.knowledgePoints.length > 0 &&
    totalQuestionCount > 0 &&
    totalQuestionCount <= 30

  const handleGenerate = () => {
    if (!canSubmit || generating) return
    setGenerating(true)
    /** mock 同步生成（真实环境异步 ~10s） */
    setTimeout(() => {
      generateHomeworkQuestions(homeworkId)
      setGenerating(false)
    }, 800)
  }

  const questions =
    hw.mode === "uniform"
      ? hw.questions ?? []
      : hw.layeredVersions?.[activeLayer].questions ?? []
  const hasGeneratedQuestions =
    hw.mode === "uniform"
      ? (hw.questions?.length ?? 0) > 0
      : Boolean(hw.layeredVersions)
  const canPublish = questions.length > 0
  const handlePublish = () => {
    publishHomework(homeworkId)
    setConfirmOpen(false)
    onPublished()
  }

  const handleAddKp = (kp: HomeworkKnowledgePoint) => {
    if (hw.knowledgePoints.some((k) => k.label === kp.label)) return
    updateHomeworkDraft(homeworkId, {
      knowledgePoints: [...hw.knowledgePoints, kp],
    })
  }
  const handleRemoveKp = (label: string) => {
    updateHomeworkDraft(homeworkId, {
      knowledgePoints: hw.knowledgePoints.filter((k) => k.label !== label),
    })
  }

  /**
   * 字段顺序（v1.2，与用户截图复刻需求一致）：
   *   1. 课程名称 / 科目 / 年级（只读）
   *   2. 作业模式（uniform / personalized-abc）
   *   3. 学员模块（**随作业模式分流**）
   *        - uniform           → StudentDropdownSelect（带 chip 下拉，截图一样式）
   *        - personalized-abc  → LayerGroupPreview（A/B/C 三档分组）
   *   4. 作业阶段（SelectDropdown，可改）
   *   5. 题目难度（SelectDropdown，**仅 uniform 模式显示**）
   *   6. 选择大纲知识点（含 AI 解析 / 手动输入两条副入口）
   *   7. 题型 + 数量
   *   8. CTA
   */
  return (
    <GenericCard title={`布置作业 · ${ctx.lessonTitle}`}>
      <div className="flex w-full flex-col gap-[var(--space-300)]">
        {/* —— 1. 只读三字段 —— */}
        <div className="grid grid-cols-1 gap-[var(--space-200)] sm:grid-cols-3">
          <ReadonlyField label="课程名称" value={ctx.courseName} />
          <ReadonlyField label="科目" value={ctx.subject} />
          <ReadonlyField label="年级" value={ctx.grade} />
        </div>

        {/* —— 2. 作业模式 —— */}
        <div className="flex flex-col gap-[var(--space-150)]">
          <FieldLabel required>作业模式</FieldLabel>
          <div className="grid grid-cols-1 gap-[var(--space-200)] sm:grid-cols-2">
            <ModeTile
              active={hw.mode === "uniform"}
              title="统一作业"
              hint="全班使用同一套题"
              onClick={() => updateHomeworkDraft(homeworkId, { mode: "uniform" })}
            />
            <ModeTile
              active={hw.mode === "personalized-abc"}
              title="个性化作业"
              hint="基于学情为 A/B/C 三档分层出题"
              onClick={() => updateHomeworkDraft(homeworkId, { mode: "personalized-abc" })}
            />
          </div>
        </div>

        {/* —— 3. 学员模块（按模式分流） —— */}
        {hw.mode === "uniform" ? (
          <div className="flex flex-col gap-[var(--space-150)]">
            <FieldLabel required>学生列表</FieldLabel>
            <StudentDropdownSelect
              value={hw.targetStudentIds}
              onChange={(ids) => updateHomeworkDraft(homeworkId, { targetStudentIds: ids })}
            />
            <p className="m-0 text-[length:var(--font-size-xs)] text-text-tertiary">
              默认已勾选本节课所有学员；通过下拉框可单独调整派发名单。
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-[var(--space-150)]">
            <FieldLabel required>学情分组</FieldLabel>
            <LayerGroupPreview hw={hw} />
          </div>
        )}

        {/* —— 4. 作业阶段（可改） —— */}
        <div
          className={cn(
            "grid grid-cols-1 gap-[var(--space-200)]",
            hw.mode === "uniform" ? "sm:grid-cols-2" : "sm:grid-cols-1",
          )}
        >
          <div className="flex flex-col gap-[var(--space-150)]">
            <FieldLabel required>作业阶段</FieldLabel>
            <SelectDropdown<HomeworkStage>
              value={hw.stage}
              options={[
                { value: "pre", label: "课前" },
                { value: "in", label: "课中" },
                { value: "post", label: "课后" },
              ]}
              onChange={(v) => updateHomeworkDraft(homeworkId, { stage: v })}
            />
            <p className="m-0 text-[length:var(--font-size-xs)] text-text-tertiary">
              {stageHint(hw.stage)}
            </p>
          </div>

          {/* —— 5. 题目难度（仅 uniform 显示）—— */}
          {hw.mode === "uniform" ? (
            <div className="flex flex-col gap-[var(--space-150)]">
              <FieldLabel required>题目难度</FieldLabel>
              <SelectDropdown<HomeworkDifficulty>
                value={hw.difficulty}
                options={[
                  { value: "easy", label: HOMEWORK_DIFFICULTY_LABEL.easy },
                  { value: "medium", label: HOMEWORK_DIFFICULTY_LABEL.medium },
                  { value: "hard", label: HOMEWORK_DIFFICULTY_LABEL.hard },
                ]}
                onChange={(v) => updateHomeworkDraft(homeworkId, { difficulty: v })}
              />
              <p className="m-0 text-[length:var(--font-size-xs)] text-text-tertiary">
                统一作业全班同难度；切到「个性化作业」时由 A/B/C 三档自动配难度。
              </p>
            </div>
          ) : null}
        </div>

        {/* —— 6. 选择大纲知识点 —— */}
        <div className="flex flex-col gap-[var(--space-150)]">
          <FieldLabel required>知识点</FieldLabel>
          <div className="flex min-h-[44px] flex-wrap items-center gap-[var(--space-100)] rounded-[var(--radius-sm)] border border-border bg-bg px-[var(--space-200)] py-[var(--space-150)]">
            {hw.knowledgePoints.length === 0 ? (
              <span className="text-[length:var(--font-size-sm)] text-text-tertiary">
                还没有添加知识点，请通过下方按钮选择或输入
              </span>
            ) : (
              hw.knowledgePoints.map((kp) => (
                <span
                  key={`${kp.source}-${kp.label}`}
                  className="inline-flex items-center gap-[var(--space-100)] rounded-full bg-[var(--color-primary)]/10 px-[var(--space-200)] py-[2px] text-[length:var(--font-size-xs)] text-[var(--color-primary)]"
                >
                  {kp.label}
                  <button
                    type="button"
                    onClick={() => handleRemoveKp(kp.label)}
                    className="text-[var(--color-primary)] hover:text-text"
                    aria-label="移除"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))
            )}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-[var(--space-150)]">
            <KpEntryButton
              tone="primary"
              icon={<CheckCircle2 className="h-3.5 w-3.5" />}
              label="选择大纲知识点"
              onClick={() => setKpPickerOpen(true)}
            />
            <KpEntryButton
              icon={<Sparkles className="h-3.5 w-3.5" />}
              label="AI 解析附件"
              onClick={() => {
                /** Demo：直接灌一组预设 KP（来自知识点树前 3 项） */
                const tree = getKnowledgeTree(ctx.subject, ctx.grade)
                const flat = flattenKnowledgeTree(tree)
                const picks = flat.slice(0, 3)
                for (const kp of picks) {
                  handleAddKp({
                    id: kp.id,
                    label: kp.label,
                    source: "ai-parse",
                  })
                }
              }}
            />
            <KpEntryButton
              icon={<Plus className="h-3.5 w-3.5" />}
              label="手动输入"
              onClick={() => setShowManualKpInput((v) => !v)}
            />
          </div>
          {showManualKpInput ? (
            <div className="flex items-center gap-[var(--space-150)]">
              <input
                type="text"
                value={manualKpInput}
                onChange={(e) => setManualKpInput(e.target.value)}
                placeholder="输入自定义知识点名"
                className="flex-1 rounded-[var(--radius-sm)] border border-border bg-bg px-[var(--space-200)] py-[var(--space-150)] text-[length:var(--font-size-sm)] text-text outline-none focus:border-[var(--color-primary)]/45"
              />
              <button
                type="button"
                disabled={!manualKpInput.trim()}
                onClick={() => {
                  if (!manualKpInput.trim()) return
                  handleAddKp({ label: manualKpInput.trim(), source: "manual" })
                  setManualKpInput("")
                }}
                className={cn(
                  "inline-flex items-center gap-[var(--space-100)] rounded-[var(--radius-sm)] px-[var(--space-300)] py-[var(--space-150)] text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)]",
                  manualKpInput.trim()
                    ? "bg-primary text-[var(--color-primary-foreground,white)]"
                    : "bg-[var(--black-alpha-11)] text-text-tertiary",
                )}
              >
                添加
              </button>
            </div>
          ) : null}
        </div>

        {/* —— 7. 题型 + 数量 —— */}
        <div className="flex flex-col gap-[var(--space-150)]">
          <FieldLabel required>题型 + 数量</FieldLabel>
          <QuestionTypeConfigEditor
            value={hw.questionTypeConfig}
            onChange={(next) => updateHomeworkDraft(homeworkId, { questionTypeConfig: next })}
          />
          {totalQuestionCount > 30 ? (
            <p className="m-0 text-[length:var(--font-size-xs)] text-[var(--color-warning,#f59e0b)]">
              ⚠ 题目总数 {totalQuestionCount}，超过 30 题上限，请调整。
            </p>
          ) : null}
        </div>

        {!hasGeneratedQuestions ? (
          <div className="flex flex-col gap-[var(--space-150)] pt-[var(--space-100)]">
            <button
              type="button"
              disabled={!canSubmit || generating}
              onClick={handleGenerate}
              className={cn(
                "inline-flex items-center justify-center gap-[var(--space-150)] rounded-[var(--radius-md)] px-[var(--space-300)] py-[var(--space-250)] text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] transition-colors",
                canSubmit && !generating
                  ? "bg-primary text-[var(--color-primary-foreground,white)] hover:opacity-95"
                  : "bg-[var(--black-alpha-11)] text-text-tertiary",
              )}
            >
              <Sparkles className="h-4 w-4" />
              {generating ? "AI 正在生成..." : "一键生成作业"}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center justify-center gap-[var(--space-100)] rounded-[var(--radius-md)] border border-border bg-bg px-[var(--space-300)] py-[var(--space-200)] text-[length:var(--font-size-sm)] text-text-secondary transition-colors hover:bg-[var(--black-alpha-11)]"
            >
              取消
            </button>
          </div>
        ) : null}

        {hasGeneratedQuestions ? (
          <GeneratedHomeworkQuestionsSection
            hw={hw}
            activeLayer={activeLayer}
            questions={questions}
            canPublish={canPublish}
            adding={adding}
            generating={generating}
            onPickLayer={setActiveLayer}
            onRegenerateAll={() => {
              if (window.confirm("将清空当前题目并重新生成，确定？")) {
                setGenerating(true)
                setTimeout(() => {
                  generateHomeworkQuestions(homeworkId)
                  setGenerating(false)
                }, 600)
              }
            }}
            onSetAdding={setAdding}
            onPublish={() => setConfirmOpen(true)}
          />
        ) : null}
      </div>

      {confirmOpen ? (
        <ConfirmPublishModal
          hw={hw}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={handlePublish}
        />
      ) : null}

      {kpPickerOpen ? (
        <KnowledgePointPickerModal
          tree={getKnowledgeTree(ctx.subject, ctx.grade)}
          selectedLabels={hw.knowledgePoints.map((k) => k.label)}
          onCancel={() => setKpPickerOpen(false)}
          onConfirm={(picks) => {
            for (const p of picks) {
              handleAddKp({ id: p.id, label: p.label, source: "outline" })
            }
            setKpPickerOpen(false)
          }}
        />
      ) : null}
    </GenericCard>
  )
}

function FieldLabel({
  required,
  children,
}: {
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <span className="text-[length:var(--font-size-sm)] text-text-secondary">
      {children}
      {required ? <span className="ml-[2px] text-[var(--color-error,#ef4444)]">*</span> : null}
    </span>
  )
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-[2px]">
      <span className="text-[length:var(--font-size-xs)] text-text-tertiary">{label}</span>
      <span className="text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)] text-text">
        {value}
      </span>
    </div>
  )
}

function stageLabel(stage: HomeworkStage): string {
  return stage === "pre" ? "课前" : stage === "in" ? "课中" : "课后"
}

function stageHint(stage: HomeworkStage): string {
  if (stage === "pre") return "课前用于唤起前置概念，建议中等难度"
  if (stage === "in") return "课中建议中等难度，配合互动答题更有效"
  return "课后可提升难度用于巩固训练"
}

/**
 * 通用单选下拉（与截图二难度选择器样式 1:1 对齐）：
 *
 * 触发框：白底 + 浅灰描边；右侧 `ChevronDown` 旋转表示展开态
 * 下拉面板：浮在触发框下方，命中项左侧蓝色文本 + 右侧 `Check` 图标
 *
 * 实例化点：作业阶段 / 题目难度（统一作业时） / 未来可能的"截止时间"等
 */
function SelectDropdown<T extends string>({
  value,
  options,
  onChange,
  placeholder,
}: {
  value: T
  options: ReadonlyArray<{ value: T; label: string; disabled?: boolean }>
  onChange: (v: T) => void
  placeholder?: string
}) {
  const [open, setOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)
  useClickOutside(containerRef, () => setOpen(false), open)
  const current = options.find((o) => o.value === value)
  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex w-full items-center justify-between gap-[var(--space-150)] rounded-[var(--radius-sm)] border bg-bg px-[var(--space-250)] py-[var(--space-200)] text-left text-[length:var(--font-size-sm)] transition-colors",
          open
            ? "border-[var(--color-primary)]/55"
            : "border-border hover:border-border-strong",
        )}
      >
        <span className={current ? "text-text" : "text-text-tertiary"}>
          {current?.label ?? placeholder ?? "请选择"}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 flex-none transition-transform",
            open ? "rotate-180 text-[var(--color-primary)]" : "text-text-tertiary",
          )}
        />
      </button>
      {open ? (
        <div className="absolute left-0 right-0 top-full z-40 mt-[var(--space-100)] overflow-hidden rounded-[var(--radius-sm)] border border-border bg-bg shadow-lg">
          {options.map((o) => {
            const selected = o.value === value
            return (
              <button
                key={o.value}
                type="button"
                disabled={o.disabled}
                onClick={() => {
                  if (o.disabled) return
                  onChange(o.value)
                  setOpen(false)
                }}
                className={cn(
                  "flex w-full items-center justify-between gap-[var(--space-200)] px-[var(--space-250)] py-[var(--space-200)] text-left text-[length:var(--font-size-sm)] transition-colors",
                  o.disabled
                    ? "cursor-not-allowed text-text-tertiary"
                    : selected
                      ? "bg-[var(--color-primary)]/6 text-[var(--color-primary)]"
                      : "text-text hover:bg-[var(--black-alpha-11)]",
                )}
              >
                <span>{o.label}</span>
                {selected ? <Check className="h-4 w-4 text-[var(--color-primary)]" /> : null}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

function useClickOutside(
  ref: React.RefObject<HTMLElement | null>,
  handler: () => void,
  enabled: boolean,
) {
  React.useEffect(() => {
    if (!enabled) return
    function onPointerDown(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) handler()
    }
    document.addEventListener("mousedown", onPointerDown)
    return () => document.removeEventListener("mousedown", onPointerDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])
}

function ModeTile({
  active,
  title,
  hint,
  onClick,
}: {
  active: boolean
  title: string
  hint: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-start gap-[var(--space-100)] rounded-[var(--radius-md)] border px-[var(--space-300)] py-[var(--space-250)] text-left transition-colors",
        active
          ? "border-[var(--color-primary)]/60 bg-[var(--color-primary)]/8"
          : "border-border bg-bg hover:border-border-strong",
      )}
    >
      <span className="text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-text">
        {title}
      </span>
      <span className="text-[length:var(--font-size-xs)] text-text-tertiary">{hint}</span>
    </button>
  )
}

/**
 * 学员多选下拉（与截图一样式 1:1 对齐）。
 *
 * 触发框
 * --------------------------------------------------
 * 白底圆角浅灰描边；已选学员以蓝色 chip（"安 林小安 ×"）展示在框内；
 * 右侧固定一个 `Search` 静态 icon 作为下拉提示符。
 *
 * 下拉面板
 * --------------------------------------------------
 * 浮在触发框下方；顶部一行 "学生列表" 标题（弱色）+ 右侧 "全选 / 清空"
 * 文字按钮；下方按学员展开 checkbox 行（含蓝色头像 + 姓名）。
 *
 * 行为
 * --------------------------------------------------
 * 1) chip 内的 × 移除单个学员（不展开 dropdown，stopPropagation）
 * 2) 点击触发框任意位置（chip 区 / icon）展开 dropdown
 * 3) 点 dropdown 外或下拉项时自动收起 dropdown
 * 4) "全选 / 清空" 仅作用于学员选集；不关闭 dropdown，方便老师快速比对
 */
function StudentDropdownSelect({
  value,
  onChange,
}: {
  value: string[]
  onChange: (ids: string[]) => void
}) {
  const all = DEMO_HOMEWORK_STUDENTS
  const [open, setOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)
  useClickOutside(containerRef, () => setOpen(false), open)
  const toggle = (id: string) => {
    if (value.includes(id)) onChange(value.filter((x) => x !== id))
    else onChange([...value, id])
  }
  const isAll = value.length === all.length
  const isNone = value.length === 0
  const selectedList = all.filter((s) => value.includes(s.id))
  return (
    <div ref={containerRef} className="relative">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setOpen((v) => !v)
        }}
        className={cn(
          "flex min-h-[42px] w-full cursor-pointer flex-wrap items-center gap-[var(--space-100)] rounded-[var(--radius-sm)] border bg-bg px-[var(--space-200)] py-[6px] text-left shadow-xs transition-colors",
          open
            ? "border-[var(--color-primary)]/45 ring-2 ring-[var(--color-primary)]/10"
            : "border-border hover:border-border-strong",
        )}
      >
        {selectedList.length === 0 ? (
          <span className="text-[length:var(--font-size-sm)] text-text-tertiary">
            请选择派发学员（可多选）
          </span>
        ) : (
          selectedList.map((s) => (
            <StudentChip
              key={s.id}
              name={s.name}
              onRemove={(e) => {
                e.stopPropagation()
                toggle(s.id)
              }}
            />
          ))
        )}
        <Search className="ml-auto h-4 w-4 flex-none text-text-tertiary" />
      </div>
      {open ? (
        <div className="absolute left-0 right-0 top-full z-40 mt-[var(--space-100)] overflow-hidden rounded-[var(--radius-md)] border border-border bg-bg shadow-elevation-sm">
          <div className="flex items-center justify-between border-b border-border bg-bg-tertiary/60 px-[var(--space-250)] py-[var(--space-150)]">
            <span className="text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] text-text-secondary">
              学生列表
            </span>
            <div className="flex items-center gap-[var(--space-150)] text-[length:var(--font-size-xs)]">
              <button
                type="button"
                disabled={isAll}
                onClick={(e) => {
                  e.stopPropagation()
                  onChange(all.map((s) => s.id))
                }}
                className={cn(
                  "rounded-[var(--radius-sm)] px-[var(--space-100)] py-[2px]",
                  isAll
                    ? "cursor-not-allowed text-text-tertiary"
                    : "text-[var(--color-primary)] hover:bg-[var(--color-primary)]/8",
                )}
              >
                全选
              </button>
              <button
                type="button"
                disabled={isNone}
                onClick={(e) => {
                  e.stopPropagation()
                  onChange([])
                }}
                className={cn(
                  "rounded-[var(--radius-sm)] px-[var(--space-100)] py-[2px]",
                  isNone
                    ? "cursor-not-allowed text-text-tertiary"
                    : "text-text-secondary hover:bg-[var(--black-alpha-11)] hover:text-text",
                )}
              >
                清空
              </button>
            </div>
          </div>
          <div className="flex max-h-[236px] flex-col overflow-y-auto py-[var(--space-100)]">
            {all.map((s) => {
              const checked = value.includes(s.id)
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggle(s.id)
                  }}
                  className={cn(
                    "flex w-full items-center gap-[var(--space-200)] px-[var(--space-250)] py-[var(--space-150)] text-left transition-colors",
                    checked
                      ? "bg-[var(--color-primary)]/5"
                      : "hover:bg-[var(--black-alpha-11)]",
                  )}
                >
                  <span
                    className={cn(
                      "grid h-4 w-4 flex-none place-items-center rounded-[4px] border text-[10px] transition-colors",
                      checked
                        ? "border-[var(--color-primary)] bg-[var(--color-primary)] font-[var(--font-weight-medium)] text-[var(--color-primary-foreground,white)]"
                        : "border-border bg-bg text-transparent",
                    )}
                  >
                    <Check className="h-3 w-3" />
                  </span>
                  <StudentAvatar name={s.name} />
                  <span className="min-w-0 flex-1 truncate text-[length:var(--font-size-sm)] text-text">
                    {s.name}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function StudentAvatar({ name }: { name: string }) {
  return (
    <span className="grid h-5 w-5 flex-none place-items-center rounded-full bg-[var(--color-primary)]/10 text-[10px] font-[var(--font-weight-medium)] text-[var(--color-primary)]">
      {name.slice(0, 1)}
    </span>
  )
}

function StudentChip({
  name,
  onRemove,
}: {
  name: string
  onRemove: (e: React.MouseEvent) => void
}) {
  return (
    <span className="inline-flex h-6 items-center gap-[var(--space-100)] rounded-full bg-[var(--color-primary)]/8 px-[var(--space-150)] text-[length:var(--font-size-xs)] text-[var(--color-primary)]">
      <StudentAvatar name={name} />
      {name}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`移除 ${name}`}
        className="rounded-full text-[var(--color-primary)]/80 hover:bg-[var(--black-alpha-11)] hover:text-text"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  )
}

function QuestionTypeConfigEditor({
  value,
  onChange,
}: {
  value: HomeworkQuestionTypeConfig[]
  onChange: (next: HomeworkQuestionTypeConfig[]) => void
}) {
  const allTypes: HomeworkQuestionType[] = [
    "single",
    "multi",
    "judge",
    "short",
    "essay",
  ]
  const remainingTypes = allTypes.filter(
    (t) => !value.some((v) => v.type === t),
  )

  return (
    <div className="flex flex-col gap-[var(--space-150)]">
      {value.map((cfg, idx) => (
        <div
          key={`${cfg.type}-${idx}`}
          className="flex items-center gap-[var(--space-150)]"
        >
          <div className="min-w-0 flex-1">
            <SelectDropdown<HomeworkQuestionType>
              value={cfg.type}
              options={allTypes.map((t) => ({
                value: t,
                label: HOMEWORK_QUESTION_TYPE_LABEL[t],
              }))}
              onChange={(nextType) => {
                const next = [...value]
                next[idx] = { ...cfg, type: nextType }
                onChange(next)
              }}
            />
          </div>
          <div className="w-24 flex-none">
            <SelectDropdown<string>
              value={String(cfg.count)}
              options={[1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 15, 20].map((n) => ({
                value: String(n),
                label: String(n),
              }))}
              onChange={(nextCount) => {
                const next = [...value]
                next[idx] = { ...cfg, count: Number(nextCount) }
                onChange(next)
              }}
            />
          </div>
          {value.length > 1 ? (
            <button
              type="button"
              onClick={() => onChange(value.filter((_, i) => i !== idx))}
              aria-label="删除题型"
              className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] border border-border bg-bg text-text-tertiary hover:bg-[var(--black-alpha-11)]"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      ))}
      {remainingTypes.length > 0 ? (
        <button
          type="button"
          onClick={() =>
            onChange([
              ...value,
              { type: remainingTypes[0], count: 3 },
            ])
          }
          className="self-start inline-flex items-center gap-[var(--space-100)] rounded-[var(--radius-sm)] border border-dashed border-border bg-bg px-[var(--space-250)] py-[var(--space-150)] text-[length:var(--font-size-xs)] text-text-secondary hover:border-border-strong hover:bg-[var(--black-alpha-11)]"
        >
          <Plus className="h-3 w-3" />
          添加题型
        </button>
      ) : null}
    </div>
  )
}

function KpEntryButton({
  tone = "default",
  icon,
  label,
  onClick,
}: {
  tone?: "default" | "primary"
  icon: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-[var(--space-100)] rounded-[var(--radius-sm)] border px-[var(--space-300)] py-[var(--space-150)] text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)] transition-colors",
        tone === "primary"
          ? "border-transparent bg-primary text-[var(--color-primary-foreground,white)] hover:opacity-95"
          : "border-border bg-bg text-text-secondary hover:bg-[var(--black-alpha-11)]",
      )}
    >
      {icon}
      {label}
    </button>
  )
}

/* ============================================================
 * 知识点选择弹窗（inline，避免依赖外部 Modal 组件）
 * ============================================================ */

function KnowledgePointPickerModal({
  tree,
  selectedLabels,
  onCancel,
  onConfirm,
}: {
  tree: KnowledgePointTree | null
  selectedLabels: string[]
  onCancel: () => void
  onConfirm: (picks: Array<{ id?: string; label: string }>) => void
}) {
  const [picked, setPicked] = React.useState<Set<string>>(
    new Set(selectedLabels),
  )
  const toggle = (label: string) => {
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 px-[var(--space-300)]"
      onClick={onCancel}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-[480px] flex-col overflow-hidden rounded-[var(--radius-lg)] border border-border bg-bg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-[var(--space-300)] py-[var(--space-250)]">
          <h4 className="m-0 text-[length:var(--font-size-md)] font-[var(--font-weight-semibold)] text-text">
            知识点
          </h4>
          <button
            type="button"
            onClick={onCancel}
            aria-label="关闭"
            className="inline-flex h-6 w-6 items-center justify-center rounded-full text-text-tertiary hover:bg-[var(--black-alpha-11)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-[var(--space-200)] border-b border-border px-[var(--space-300)] py-[var(--space-200)]">
          <span className="text-[length:var(--font-size-sm)] text-text-secondary">年级</span>
          <span className="inline-flex items-center gap-[var(--space-100)] rounded-[var(--radius-sm)] border border-border bg-bg px-[var(--space-250)] py-[var(--space-100)] text-[length:var(--font-size-sm)] text-text">
            {tree?.grade ?? "—"}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto px-[var(--space-300)] py-[var(--space-250)]">
          {!tree ? (
            <p className="m-0 text-[length:var(--font-size-sm)] text-text-tertiary">
              暂未导入本学科的知识点大纲，可改用「AI 解析附件」或「手动输入」。
            </p>
          ) : (
            <div className="flex flex-col gap-[var(--space-200)]">
              {tree.groups.map((group) => (
                <div key={group.id} className="flex flex-col gap-[var(--space-100)]">
                  <KpCheckbox
                    label={group.label}
                    checked={picked.has(group.label)}
                    onToggle={() => toggle(group.label)}
                  />
                  {group.children?.map((child) => (
                    <div key={child.id} className="ml-[var(--space-400)]">
                      <KpCheckbox
                        label={child.label}
                        checked={picked.has(child.label)}
                        onToggle={() => toggle(child.label)}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-[var(--space-150)] border-t border-border px-[var(--space-300)] py-[var(--space-200)]">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center rounded-[var(--radius-sm)] border border-border bg-bg px-[var(--space-300)] py-[var(--space-150)] text-[length:var(--font-size-sm)] text-text-secondary hover:bg-[var(--black-alpha-11)]"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => {
              const flat = flattenKnowledgeTree(tree)
              const picks: Array<{ id?: string; label: string }> = []
              for (const label of picked) {
                const hit = flat.find((n) => n.label === label)
                if (hit) {
                  picks.push({ id: hit.id, label: hit.label })
                } else {
                  picks.push({ label })
                }
              }
              onConfirm(picks)
            }}
            className="inline-flex items-center rounded-[var(--radius-sm)] bg-primary px-[var(--space-300)] py-[var(--space-150)] text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)] text-[var(--color-primary-foreground,white)] hover:opacity-95"
          >
            确定
          </button>
        </div>
      </div>
    </div>
  )
}

function KpCheckbox({
  label,
  checked,
  onToggle,
}: {
  label: string
  checked: boolean
  onToggle: () => void
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-[var(--space-150)] py-[var(--space-100)] text-[length:var(--font-size-sm)] text-text">
      <span
        className={cn(
          "grid h-4 w-4 place-items-center rounded-sm border transition-colors",
          checked
            ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[10px] text-[var(--color-primary-foreground,white)]"
            : "border-border bg-bg",
        )}
        onClick={onToggle}
        role="checkbox"
        aria-checked={checked}
      >
        {checked ? "✓" : ""}
      </span>
      <span onClick={onToggle}>{label}</span>
    </label>
  )
}

/* ============================================================
 * 老师 · 个性化分组预览
 * ============================================================ */

function LayerGroupPreview({ hw }: { hw: LessonHomework }) {
  const grouped: Record<HomeworkLayer, HomeworkSubmission[]> = {
    A: hw.submissions.filter((s) => s.layer === "A"),
    B: hw.submissions.filter((s) => s.layer === "B"),
    C: hw.submissions.filter((s) => s.layer === "C"),
  }
  return (
    <div className="flex flex-col gap-[var(--space-150)] rounded-[var(--radius-md)] border border-border bg-bg-tertiary px-[var(--space-250)] py-[var(--space-200)]">
      <p className="m-0 text-[length:var(--font-size-xs)] text-text-tertiary">
        AI 已按学情画像分配档位；点学员卡片可调档（A 拔高 / B 巩固 / C 补强）。
      </p>
      {(["A", "B", "C"] as const).map((layer) => (
        <div
          key={layer}
          className="flex flex-col gap-[var(--space-100)] rounded-[var(--radius-sm)] border border-border bg-bg px-[var(--space-200)] py-[var(--space-150)]"
        >
          <div className="flex items-center justify-between text-[length:var(--font-size-xs)]">
            <span className="font-[var(--font-weight-medium)] text-text">
              {layer === "A" ? "A 拔高" : layer === "B" ? "B 巩固" : "C 补强"} ·{" "}
              <span className="text-text-tertiary">
                {grouped[layer].length} 人 ·{" "}
                {layer === "A" ? "偏难" : layer === "B" ? "中等" : "偏易"}
              </span>
            </span>
          </div>
          <div className="flex flex-wrap gap-[var(--space-100)]">
            {grouped[layer].map((s) => (
              <LayerChip key={s.studentId} sub={s} hwId={hw.id} />
            ))}
            {grouped[layer].length === 0 ? (
              <span className="text-[length:var(--font-size-xs)] text-text-tertiary">
                暂无学员
              </span>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  )
}

function LayerChip({
  sub,
  hwId,
}: {
  sub: HomeworkSubmission
  hwId: string
}) {
  const [open, setOpen] = React.useState(false)
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-[var(--space-100)] rounded-[var(--radius-sm)] border border-border bg-bg px-[var(--space-200)] py-[2px] text-[length:var(--font-size-xs)] text-text hover:border-[var(--color-primary)]/40"
      >
        {sub.studentName}
        <ChevronDown className="h-3 w-3 text-text-tertiary" />
      </button>
      {open ? (
        <div
          className="absolute left-0 top-full z-50 mt-1 flex w-32 flex-col overflow-hidden rounded-[var(--radius-sm)] border border-border bg-bg shadow-md"
          onMouseLeave={() => setOpen(false)}
        >
          {(["A", "B", "C"] as const).map((layer) => (
            <button
              key={layer}
              type="button"
              onClick={() => {
                moveStudentToLayer(hwId, sub.studentId, layer)
                setOpen(false)
              }}
              className={cn(
                "px-[var(--space-200)] py-[var(--space-100)] text-left text-[length:var(--font-size-xs)] hover:bg-[var(--black-alpha-11)]",
                sub.layer === layer
                  ? "text-[var(--color-primary)] font-[var(--font-weight-medium)]"
                  : "text-text",
              )}
            >
              移到 {layer === "A" ? "A 拔高" : layer === "B" ? "B 巩固" : "C 补强"}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function GeneratedHomeworkQuestionsSection({
  hw,
  activeLayer,
  questions,
  canPublish,
  adding,
  generating,
  onPickLayer,
  onRegenerateAll,
  onSetAdding,
  onPublish,
}: {
  hw: LessonHomework
  activeLayer: HomeworkLayer
  questions: HomeworkQuestion[]
  canPublish: boolean
  adding: boolean
  generating: boolean
  onPickLayer: (layer: HomeworkLayer) => void
  onRegenerateAll: () => void
  onSetAdding: (adding: boolean) => void
  onPublish: () => void
}) {
  return (
    <div className="flex flex-col gap-[var(--space-300)] border-t border-border pt-[var(--space-300)]">
      <div className="flex flex-wrap items-center justify-between gap-[var(--space-200)] rounded-[var(--radius-md)] border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5 px-[var(--space-300)] py-[var(--space-250)]">
        <div className="flex items-center gap-[var(--space-150)] text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)] text-text">
          <Sparkles className="h-4 w-4 text-[var(--color-primary)]" />
          AI 生成 · {hw.subject} · {hw.grade}（{questions.length} 题）
        </div>
        <button
          type="button"
          disabled={generating}
          onClick={onRegenerateAll}
          className={cn(
            "inline-flex items-center gap-[var(--space-100)] rounded-[var(--radius-sm)] border px-[var(--space-200)] py-[var(--space-100)] text-[length:var(--font-size-xs)] transition-colors",
            generating
              ? "border-border bg-bg-tertiary text-text-tertiary"
              : "border-border bg-bg text-text-secondary hover:bg-[var(--black-alpha-11)]",
          )}
        >
          <RefreshCw className={cn("h-3 w-3", generating ? "animate-spin" : "")} />
          {generating ? "重新生成中..." : "全部重新生成"}
        </button>
      </div>

      {hw.mode === "personalized-abc" ? (
        <LayerTabs active={activeLayer} onPick={onPickLayer} hw={hw} />
      ) : null}

      <div className="flex flex-col gap-[var(--space-250)]">
        {questions.map((q, idx) => (
          <QuestionPreviewCard
            key={q.id}
            q={q}
            index={idx + 1}
            onRegen={() =>
              regenerateQuestion(
                hw.id,
                q.id,
                hw.mode === "personalized-abc" ? activeLayer : undefined,
              )
            }
            onDelete={() => {
              if (questions.length <= 1) {
                window.alert("至少保留 1 道题才能发布")
                return
              }
              removeQuestion(
                hw.id,
                q.id,
                hw.mode === "personalized-abc" ? activeLayer : undefined,
              )
            }}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={() => onSetAdding(true)}
        className="inline-flex w-full items-center justify-center gap-[var(--space-150)] rounded-[var(--radius-md)] border border-dashed border-border bg-bg px-[var(--space-300)] py-[var(--space-200)] text-[length:var(--font-size-sm)] text-text-secondary transition-colors hover:bg-[var(--black-alpha-11)]"
      >
        <Plus className="h-4 w-4" />
        添加题目
      </button>

      {adding ? (
        <AddQuestionInline
          hw={hw}
          layer={hw.mode === "personalized-abc" ? activeLayer : undefined}
          onCancel={() => onSetAdding(false)}
          onAdded={() => onSetAdding(false)}
        />
      ) : null}

      <div className="rounded-[var(--radius-md)] border border-border bg-bg-tertiary px-[var(--space-300)] py-[var(--space-250)]">
        <p className="m-0 mb-[var(--space-100)] text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] text-text-secondary">
          ⓘ 派发说明（v1.1 固定策略，不可改）
        </p>
        <ul className="m-0 list-none space-y-[2px] pl-0 text-[length:var(--font-size-xs)] text-text-tertiary">
          <li>· 学生端：仅收到题目，作答中看不到答案 / 解析</li>
          <li>· 家长端：同时收到题目 + 答案 + 解析（用于家庭辅导）</li>
          <li>· 学生作答完点「✓ 一键批改」自动对答案，结果即时给学生 + 同步给老师</li>
        </ul>
      </div>

      <button
        type="button"
        disabled={!canPublish}
        onClick={onPublish}
        className={cn(
          "inline-flex items-center justify-center gap-[var(--space-150)] rounded-[var(--radius-md)] px-[var(--space-300)] py-[var(--space-250)] text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] transition-colors",
          canPublish
            ? "bg-primary text-[var(--color-primary-foreground,white)] hover:opacity-95"
            : "bg-[var(--black-alpha-11)] text-text-tertiary",
        )}
      >
        <Send className="h-4 w-4" />
        发布作业
      </button>
    </div>
  )
}

/* ============================================================
 * 老师 · AI 生成预览
 * ============================================================ */

function TeacherHomeworkPreview({
  ctx,
  homeworkId,
  onBack,
  onPublished,
}: {
  ctx: HomeworkCtx
  homeworkId: string
  onBack: () => void
  onPublished: () => void
}) {
  const hw = useHomework(homeworkId)
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [activeLayer, setActiveLayer] = React.useState<HomeworkLayer>("A")
  const [adding, setAdding] = React.useState(false)

  if (!hw) return null

  const questions =
    hw.mode === "uniform"
      ? hw.questions ?? []
      : hw.layeredVersions?.[activeLayer].questions ?? []

  const canPublish = questions.length > 0

  const handlePublish = () => {
    publishHomework(homeworkId)
    setConfirmOpen(false)
    onPublished()
  }

  return (
    <GenericCard title={`作业预览 · ${ctx.lessonTitle}`}>
      <div className="flex w-full flex-col gap-[var(--space-300)]">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-[var(--space-100)] self-start text-[length:var(--font-size-xs)] text-text-secondary hover:text-text"
        >
          <ArrowLeft className="h-3 w-3" />
          回到表单
        </button>

        <div className="flex flex-wrap items-center justify-between gap-[var(--space-200)] rounded-[var(--radius-md)] border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5 px-[var(--space-300)] py-[var(--space-250)]">
          <div className="flex items-center gap-[var(--space-150)] text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)] text-text">
            <Sparkles className="h-4 w-4 text-[var(--color-primary)]" />
            AI 生成 · {hw.subject} · {hw.grade}（{questions.length} 题）
          </div>
          <button
            type="button"
            onClick={() => {
              if (window.confirm("将清空当前题目并重新生成，确定？")) {
                generateHomeworkQuestions(homeworkId)
              }
            }}
            className="inline-flex items-center gap-[var(--space-100)] rounded-[var(--radius-sm)] border border-border bg-bg px-[var(--space-200)] py-[var(--space-100)] text-[length:var(--font-size-xs)] text-text-secondary hover:bg-[var(--black-alpha-11)]"
          >
            <RefreshCw className="h-3 w-3" />
            重新生成全部
          </button>
        </div>

        {hw.mode === "personalized-abc" ? (
          <LayerTabs active={activeLayer} onPick={setActiveLayer} hw={hw} />
        ) : null}

        <div className="flex flex-col gap-[var(--space-250)]">
          {questions.map((q, idx) => (
            <QuestionPreviewCard
              key={q.id}
              q={q}
              index={idx + 1}
              onRegen={() =>
                regenerateQuestion(
                  homeworkId,
                  q.id,
                  hw.mode === "personalized-abc" ? activeLayer : undefined,
                )
              }
              onDelete={() => {
                if (questions.length <= 1) {
                  window.alert("至少保留 1 道题才能发布")
                  return
                }
                removeQuestion(
                  homeworkId,
                  q.id,
                  hw.mode === "personalized-abc" ? activeLayer : undefined,
                )
              }}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex w-full items-center justify-center gap-[var(--space-150)] rounded-[var(--radius-md)] border border-dashed border-border bg-bg px-[var(--space-300)] py-[var(--space-200)] text-[length:var(--font-size-sm)] text-text-secondary transition-colors hover:bg-[var(--black-alpha-11)]"
        >
          <Plus className="h-4 w-4" />
          添加题目
        </button>

        {adding ? (
          <ManualAddQuestionInline
            onCancel={() => setAdding(false)}
            onAdd={(q) => {
              addManualQuestion(
                homeworkId,
                q,
                hw.mode === "personalized-abc" ? activeLayer : undefined,
              )
              setAdding(false)
            }}
            kpLabels={hw.knowledgePoints.map((k) => k.label)}
          />
        ) : null}

        <div className="rounded-[var(--radius-md)] border border-border bg-bg-tertiary px-[var(--space-300)] py-[var(--space-250)]">
          <p className="m-0 mb-[var(--space-100)] text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] text-text-secondary">
            ⓘ 派发说明（v1.1 固定策略，不可改）
          </p>
          <ul className="m-0 list-none space-y-[2px] pl-0 text-[length:var(--font-size-xs)] text-text-tertiary">
            <li>· 学生端：仅收到题目，作答中看不到答案 / 解析</li>
            <li>· 家长端：同时收到题目 + 答案 + 解析（用于家庭辅导）</li>
            <li>· 学生作答完点「✓ 一键批改」自动对答案，结果即时给学生 + 同步给老师</li>
          </ul>
        </div>

        {/**
         * CTA 行：右侧主按钮"发布作业"，左侧白色辅按钮"修改作业设置"。
         *
         * - "修改作业设置" 直接 `onBack` 回到表单视图；当前生成的题目保持在
         *   store 内不被清空，回到预览时仍会看到（hw.questions / layeredVersions
         *   未被 reset）。
         * - 主按钮 disabled 态走原有 canPublish 逻辑。
         */}
        <div className="grid grid-cols-[1fr_2fr] gap-[var(--space-150)] sm:grid-cols-[1fr_2fr]">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center justify-center gap-[var(--space-100)] rounded-[var(--radius-md)] border border-border bg-bg px-[var(--space-300)] py-[var(--space-250)] text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)] text-text-secondary transition-colors hover:border-border-strong hover:bg-[var(--black-alpha-11)] hover:text-text"
          >
            <Pencil className="h-3.5 w-3.5" />
            修改作业设置
          </button>
          <button
            type="button"
            disabled={!canPublish}
            onClick={() => setConfirmOpen(true)}
            className={cn(
              "inline-flex items-center justify-center gap-[var(--space-150)] rounded-[var(--radius-md)] px-[var(--space-300)] py-[var(--space-250)] text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] transition-colors",
              canPublish
                ? "bg-primary text-[var(--color-primary-foreground,white)] hover:opacity-95"
                : "bg-[var(--black-alpha-11)] text-text-tertiary",
            )}
          >
            <Send className="h-4 w-4" />
            发布作业
          </button>
        </div>
      </div>

      {confirmOpen ? (
        <ConfirmPublishModal
          hw={hw}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={handlePublish}
        />
      ) : null}
    </GenericCard>
  )
}

function LayerTabs({
  active,
  onPick,
  hw,
}: {
  active: HomeworkLayer
  onPick: (l: HomeworkLayer) => void
  hw: LessonHomework
}) {
  return (
    <div className="grid grid-cols-3 gap-[var(--space-100)] rounded-[var(--radius-md)] border border-border bg-bg-tertiary p-[2px]">
      {(["A", "B", "C"] as const).map((layer) => {
        const count = hw.layeredVersions?.[layer].studentIds.length ?? 0
        const qCount = hw.layeredVersions?.[layer].questions.length ?? 0
        return (
          <button
            key={layer}
            type="button"
            onClick={() => onPick(layer)}
            className={cn(
              "rounded-[var(--radius-sm)] px-[var(--space-200)] py-[var(--space-150)] text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] transition-colors",
              active === layer
                ? "bg-bg text-[var(--color-primary)] shadow-sm"
                : "text-text-secondary hover:bg-bg",
            )}
          >
            {layer === "A" ? "A 拔高" : layer === "B" ? "B 巩固" : "C 补强"}
            <span className="ml-[var(--space-100)] text-text-tertiary">{count} 人 · {qCount} 题</span>
          </button>
        )
      })}
    </div>
  )
}

function QuestionPreviewCard({
  q,
  index,
  onRegen,
  onDelete,
}: {
  q: HomeworkQuestion
  index: number
  onRegen: () => void
  onDelete: () => void
}) {
  const [expanded, setExpanded] = React.useState(false)
  return (
    <div className="flex flex-col gap-[var(--space-200)] rounded-[var(--radius-md)] border border-border bg-bg px-[var(--space-300)] py-[var(--space-250)]">
      <div className="flex flex-wrap items-center gap-[var(--space-150)]">
        <span className="inline-flex items-center rounded-[var(--radius-sm)] bg-[var(--color-primary)]/8 px-[var(--space-150)] py-[1px] text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] text-[var(--color-primary)]">
          {HOMEWORK_QUESTION_TYPE_LABEL[q.type]}
        </span>
        <span className="inline-flex items-center gap-[var(--space-100)] text-[length:var(--font-size-xs)] text-text-tertiary">
          📎 知识点{index}：{q.knowledgePointLabel}
        </span>
      </div>
      <p className="m-0 text-[length:var(--font-size-sm)] leading-relaxed text-text">
        {index}. {q.prompt}
      </p>
      {q.options ? (
        <ol className="m-0 flex list-none flex-col gap-[var(--space-100)] pl-0">
          {q.options.map((opt, i) => (
            <li
              key={i}
              className="rounded-[var(--radius-sm)] border border-border bg-bg-tertiary px-[var(--space-250)] py-[var(--space-150)] text-[length:var(--font-size-sm)] text-text"
            >
              {String.fromCharCode(65 + i)}. {opt}
            </li>
          ))}
        </ol>
      ) : null}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="inline-flex items-center gap-[var(--space-100)] self-start rounded-[var(--radius-sm)] border border-border bg-bg px-[var(--space-200)] py-[var(--space-100)] text-[length:var(--font-size-xs)] text-text-secondary hover:bg-[var(--black-alpha-11)]"
      >
        {expanded ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
        {expanded ? "收起答案与解析" : "查看答案与解析"}
        <span className="ml-[var(--space-100)] text-text-tertiary">*仅你 / 家长可见</span>
      </button>
      {expanded ? (
        <div className="rounded-[var(--radius-sm)] border border-border bg-bg-tertiary px-[var(--space-250)] py-[var(--space-200)] text-[length:var(--font-size-xs)] text-text-secondary">
          <p className="m-0">
            <span className="font-[var(--font-weight-medium)] text-text">答案：</span>
            {Array.isArray(q.correctAnswer) ? q.correctAnswer.join(", ") : q.correctAnswer}
          </p>
          <p className="m-0 mt-[var(--space-100)]">
            <span className="font-[var(--font-weight-medium)] text-text">解析：</span>
            {q.analysis}
          </p>
        </div>
      ) : null}
      <div className="flex items-center justify-between border-t border-border pt-[var(--space-150)] text-[length:var(--font-size-xs)] text-text-tertiary">
        <span>
          题目来源：
          {q.source === "ai"
            ? "AI 出题"
            : q.source === "manual"
              ? "手动录入"
              : "AI 出题 · 老师编辑"}
        </span>
        <div className="flex items-center gap-[var(--space-100)]">
          <button
            type="button"
            onClick={onRegen}
            aria-label="重新生成此题"
            className="inline-flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] text-text-tertiary hover:bg-[var(--black-alpha-11)] hover:text-text"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label="删除此题"
            className="inline-flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] text-text-tertiary hover:bg-[var(--black-alpha-11)] hover:text-[var(--color-error,#ef4444)]"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

function AddQuestionInline({
  hw,
  layer,
  onCancel,
  onAdded,
}: {
  hw: LessonHomework
  layer?: HomeworkLayer
  onCancel: () => void
  onAdded: () => void
}) {
  const kpLabels = hw.knowledgePoints.map((kp) => kp.label)
  const allKpLabels = kpLabels.length > 0 ? kpLabels : ["本节核心"]
  const [mode, setMode] = React.useState<"ai" | "manual">("ai")
  const [aiType, setAiType] = React.useState<HomeworkQuestionType>("single")
  const [aiCount, setAiCount] = React.useState("3")
  const [aiKps, setAiKps] = React.useState<string[]>(allKpLabels.slice(0, 1))
  const [manualType, setManualType] = React.useState<HomeworkQuestionType>("single")
  const [prompt, setPrompt] = React.useState("")
  const [optionsRaw, setOptionsRaw] = React.useState("A. 选项 1\nB. 选项 2\nC. 选项 3\nD. 选项 4")
  const [correctAnswer, setCorrectAnswer] = React.useState("A")
  const [analysis, setAnalysis] = React.useState("")
  const [manualKp, setManualKp] = React.useState(allKpLabels[0])
  const manualSupportsOptions = manualType === "single" || manualType === "multi"
  const isJudge = manualType === "judge"

  const toggleAiKp = (label: string) => {
    setAiKps((prev) => {
      if (prev.includes(label)) {
        const next = prev.filter((x) => x !== label)
        return next.length > 0 ? next : prev
      }
      return [...prev, label]
    })
  }

  const addManual = () => {
    const opts = manualSupportsOptions
      ? optionsRaw
          .split(/\r?\n/)
          .map((line) => line.replace(/^[A-Z]\.\s*/, "").trim())
          .filter(Boolean)
      : undefined
    const ans =
      manualType === "multi"
        ? correctAnswer.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean)
        : correctAnswer.trim().toUpperCase()
    addManualQuestion(
      hw.id,
      {
        type: manualType,
        prompt: prompt.trim(),
        options: opts,
        correctAnswer: ans,
        analysis: analysis.trim(),
        knowledgePointLabel: manualKp,
      },
      layer,
    )
    onAdded()
  }

  return (
    <div className="flex flex-col gap-[var(--space-250)] rounded-[var(--radius-md)] border border-border bg-bg-tertiary px-[var(--space-300)] py-[var(--space-250)]">
      <div className="flex items-center justify-between gap-[var(--space-200)]">
        <p className="m-0 text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)] text-text">
          添加题目
        </p>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-7 w-7 items-center justify-center rounded-full text-text-tertiary hover:bg-[var(--black-alpha-11)]"
          aria-label="关闭添加题目"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-[var(--space-150)] rounded-[var(--radius-md)] border border-border bg-bg p-[2px]">
        <button
          type="button"
          onClick={() => setMode("ai")}
          className={cn(
            "inline-flex items-center justify-center gap-[var(--space-100)] rounded-[var(--radius-sm)] px-[var(--space-250)] py-[var(--space-150)] text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)] transition-colors",
            mode === "ai"
              ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
              : "text-text-secondary hover:bg-[var(--black-alpha-11)]",
          )}
        >
          <Wand2 className="h-3.5 w-3.5" />
          AI 自动生成
        </button>
        <button
          type="button"
          onClick={() => setMode("manual")}
          className={cn(
            "inline-flex items-center justify-center gap-[var(--space-100)] rounded-[var(--radius-sm)] px-[var(--space-250)] py-[var(--space-150)] text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)] transition-colors",
            mode === "manual"
              ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
              : "text-text-secondary hover:bg-[var(--black-alpha-11)]",
          )}
        >
          <Pencil className="h-3.5 w-3.5" />
          手动添加
        </button>
      </div>

      {mode === "ai" ? (
        <div className="flex flex-col gap-[var(--space-200)]">
          <div className="grid grid-cols-1 gap-[var(--space-150)] sm:grid-cols-[1fr_120px]">
            <div className="flex flex-col gap-[var(--space-100)]">
              <FieldLabel required>题目类型</FieldLabel>
              <SelectDropdown<HomeworkQuestionType>
                value={aiType}
                options={(["single", "multi", "judge", "short", "essay"] as const).map((t) => ({
                  value: t,
                  label: HOMEWORK_QUESTION_TYPE_LABEL[t],
                }))}
                onChange={setAiType}
              />
            </div>
            <div className="flex flex-col gap-[var(--space-100)]">
              <FieldLabel required>题目数量</FieldLabel>
              <SelectDropdown<string>
                value={aiCount}
                options={[1, 2, 3, 4, 5, 6, 8, 10].map((n) => ({
                  value: String(n),
                  label: String(n),
                }))}
                onChange={setAiCount}
              />
            </div>
          </div>
          <div className="flex flex-col gap-[var(--space-100)]">
            <FieldLabel required>选择大纲知识点</FieldLabel>
            <div className="flex flex-wrap gap-[var(--space-100)] rounded-[var(--radius-sm)] border border-border bg-bg px-[var(--space-200)] py-[var(--space-150)]">
              {allKpLabels.map((label) => {
                const picked = aiKps.includes(label)
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => toggleAiKp(label)}
                    className={cn(
                      "inline-flex items-center gap-[var(--space-100)] rounded-full border px-[var(--space-200)] py-[2px] text-[length:var(--font-size-xs)] transition-colors",
                      picked
                        ? "border-[var(--color-primary)]/35 bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                        : "border-border bg-bg text-text-secondary hover:bg-[var(--black-alpha-11)]",
                    )}
                  >
                    {picked ? <Check className="h-3 w-3" /> : null}
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="flex items-center justify-end gap-[var(--space-150)]">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-[var(--radius-sm)] border border-border bg-bg px-[var(--space-300)] py-[var(--space-150)] text-[length:var(--font-size-sm)] text-text-secondary hover:bg-[var(--black-alpha-11)]"
            >
              取消
            </button>
            <button
              type="button"
              onClick={() => {
                addAiGeneratedQuestions(
                  hw.id,
                  { type: aiType, count: Number(aiCount), knowledgePointLabels: aiKps },
                  layer,
                )
                onAdded()
              }}
              className="rounded-[var(--radius-sm)] bg-primary px-[var(--space-300)] py-[var(--space-150)] text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)] text-[var(--color-primary-foreground,white)]"
            >
              生成并添加
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-[var(--space-200)]">
          <div className="grid grid-cols-1 gap-[var(--space-150)] sm:grid-cols-2">
            <div className="flex flex-col gap-[var(--space-100)]">
              <FieldLabel required>题目类型</FieldLabel>
              <SelectDropdown<HomeworkQuestionType>
                value={manualType}
                options={(["single", "multi", "judge", "short", "essay"] as const).map((t) => ({
                  value: t,
                  label: HOMEWORK_QUESTION_TYPE_LABEL[t],
                }))}
                onChange={(nextType) => {
                  setManualType(nextType)
                  if (nextType === "judge") setCorrectAnswer("T")
                  else if (nextType === "multi") setCorrectAnswer("A,C")
                  else setCorrectAnswer("A")
                }}
              />
            </div>
            <div className="flex flex-col gap-[var(--space-100)]">
              <FieldLabel required>知识点</FieldLabel>
              <SelectDropdown<string>
                value={manualKp}
                options={allKpLabels.map((label) => ({ value: label, label }))}
                onChange={setManualKp}
              />
            </div>
          </div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={manualType === "essay" ? "请输入论述题题干" : "请输入题干"}
            rows={manualType === "essay" ? 4 : 2}
            className="rounded-[var(--radius-sm)] border border-border bg-bg px-[var(--space-200)] py-[var(--space-150)] text-[length:var(--font-size-sm)] text-text outline-none focus:border-[var(--color-primary)]/45"
          />
          {manualSupportsOptions ? (
            <textarea
              value={optionsRaw}
              onChange={(e) => setOptionsRaw(e.target.value)}
              placeholder="选项（每行一条，可带 A. / B. 前缀）"
              rows={4}
              className="rounded-[var(--radius-sm)] border border-border bg-bg px-[var(--space-200)] py-[var(--space-150)] text-[length:var(--font-size-sm)] text-text outline-none focus:border-[var(--color-primary)]/45"
            />
          ) : null}
          {isJudge ? (
            <SelectDropdown<"T" | "F">
              value={correctAnswer === "F" ? "F" : "T"}
              options={[
                { value: "T", label: "对（T）" },
                { value: "F", label: "错（F）" },
              ]}
              onChange={setCorrectAnswer}
            />
          ) : (
            <input
              type="text"
              value={correctAnswer}
              onChange={(e) => setCorrectAnswer(e.target.value)}
              placeholder={
                manualType === "multi"
                  ? "正确答案（多选用逗号分隔，如 A,C）"
                  : manualType === "short" || manualType === "essay"
                    ? "参考答案"
                    : "正确答案"
              }
              className="rounded-[var(--radius-sm)] border border-border bg-bg px-[var(--space-200)] py-[var(--space-150)] text-[length:var(--font-size-sm)] text-text outline-none focus:border-[var(--color-primary)]/45"
            />
          )}
          <textarea
            value={analysis}
            onChange={(e) => setAnalysis(e.target.value)}
            placeholder="解析"
            rows={2}
            className="rounded-[var(--radius-sm)] border border-border bg-bg px-[var(--space-200)] py-[var(--space-150)] text-[length:var(--font-size-sm)] text-text outline-none focus:border-[var(--color-primary)]/45"
          />
          <div className="flex items-center justify-end gap-[var(--space-150)]">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-[var(--radius-sm)] border border-border bg-bg px-[var(--space-300)] py-[var(--space-150)] text-[length:var(--font-size-sm)] text-text-secondary hover:bg-[var(--black-alpha-11)]"
            >
              取消
            </button>
            <button
              type="button"
              disabled={!prompt.trim() || !correctAnswer.trim()}
              onClick={addManual}
              className={cn(
                "rounded-[var(--radius-sm)] px-[var(--space-300)] py-[var(--space-150)] text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)]",
                prompt.trim() && correctAnswer.trim()
                  ? "bg-primary text-[var(--color-primary-foreground,white)]"
                  : "bg-[var(--black-alpha-11)] text-text-tertiary",
              )}
            >
              添加
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ManualAddQuestionInline({
  onCancel,
  onAdd,
  kpLabels,
}: {
  onCancel: () => void
  onAdd: (q: Omit<HomeworkQuestion, "id" | "source">) => void
  kpLabels: string[]
}) {
  const [type, setType] = React.useState<HomeworkQuestionType>("single")
  const [prompt, setPrompt] = React.useState("")
  const [optionsRaw, setOptionsRaw] = React.useState("A. 选项 1\nB. 选项 2\nC. 选项 3\nD. 选项 4")
  const [correctAnswer, setCorrectAnswer] = React.useState("A")
  const [analysis, setAnalysis] = React.useState("")
  const [kp, setKp] = React.useState(kpLabels[0] ?? "本节核心")
  const supportsOptions = type === "single" || type === "multi"
  return (
    <div className="flex flex-col gap-[var(--space-200)] rounded-[var(--radius-md)] border border-border bg-bg-tertiary px-[var(--space-300)] py-[var(--space-250)]">
      <p className="m-0 text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)] text-text">
        手动添加题目
      </p>
      <div className="grid grid-cols-2 gap-[var(--space-150)]">
        <select
          value={type}
          onChange={(e) => setType(e.target.value as HomeworkQuestionType)}
          className="appearance-none rounded-[var(--radius-sm)] border border-border bg-bg px-[var(--space-200)] py-[var(--space-150)] text-[length:var(--font-size-sm)] text-text outline-none"
        >
          {(["single", "multi", "judge", "short", "essay"] as const).map((t) => (
            <option key={t} value={t}>
              {HOMEWORK_QUESTION_TYPE_LABEL[t]}
            </option>
          ))}
        </select>
        <select
          value={kp}
          onChange={(e) => setKp(e.target.value)}
          className="appearance-none rounded-[var(--radius-sm)] border border-border bg-bg px-[var(--space-200)] py-[var(--space-150)] text-[length:var(--font-size-sm)] text-text outline-none"
        >
          {(kpLabels.length > 0 ? kpLabels : ["本节核心"]).map((k) => (
            <option key={k} value={k}>{k}</option>
          ))}
        </select>
      </div>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="题面"
        rows={2}
        className="rounded-[var(--radius-sm)] border border-border bg-bg px-[var(--space-200)] py-[var(--space-150)] text-[length:var(--font-size-sm)] text-text outline-none"
      />
      {supportsOptions ? (
        <textarea
          value={optionsRaw}
          onChange={(e) => setOptionsRaw(e.target.value)}
          placeholder="选项（每行一条，可带 A. / B. 前缀）"
          rows={4}
          className="rounded-[var(--radius-sm)] border border-border bg-bg px-[var(--space-200)] py-[var(--space-150)] text-[length:var(--font-size-sm)] text-text outline-none"
        />
      ) : null}
      <input
        type="text"
        value={correctAnswer}
        onChange={(e) => setCorrectAnswer(e.target.value)}
        placeholder={
          type === "multi"
            ? "正确答案（多选用逗号分隔，如 A,C）"
            : type === "judge"
              ? "T / F"
              : "正确答案"
        }
        className="rounded-[var(--radius-sm)] border border-border bg-bg px-[var(--space-200)] py-[var(--space-150)] text-[length:var(--font-size-sm)] text-text outline-none"
      />
      <textarea
        value={analysis}
        onChange={(e) => setAnalysis(e.target.value)}
        placeholder="解析"
        rows={2}
        className="rounded-[var(--radius-sm)] border border-border bg-bg px-[var(--space-200)] py-[var(--space-150)] text-[length:var(--font-size-sm)] text-text outline-none"
      />
      <div className="flex items-center justify-end gap-[var(--space-150)]">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-[var(--radius-sm)] border border-border bg-bg px-[var(--space-300)] py-[var(--space-150)] text-[length:var(--font-size-sm)] text-text-secondary hover:bg-[var(--black-alpha-11)]"
        >
          取消
        </button>
        <button
          type="button"
          disabled={!prompt.trim() || !correctAnswer.trim()}
          onClick={() => {
            const opts = supportsOptions
              ? optionsRaw
                  .split(/\r?\n/)
                  .map((line) => line.replace(/^[A-Z]\.\s*/, "").trim())
                  .filter(Boolean)
              : undefined
            const ans = type === "multi"
              ? correctAnswer.split(",").map((s) => s.trim().toUpperCase())
              : correctAnswer.trim().toUpperCase()
            onAdd({
              type,
              prompt: prompt.trim(),
              options: opts,
              correctAnswer: ans,
              analysis: analysis.trim(),
              knowledgePointLabel: kp,
            })
          }}
          className={cn(
            "rounded-[var(--radius-sm)] px-[var(--space-300)] py-[var(--space-150)] text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)]",
            prompt.trim() && correctAnswer.trim()
              ? "bg-primary text-[var(--color-primary-foreground,white)]"
              : "bg-[var(--black-alpha-11)] text-text-tertiary",
          )}
        >
          添加
        </button>
      </div>
    </div>
  )
}

function ConfirmPublishModal({
  hw,
  onCancel,
  onConfirm,
}: {
  hw: LessonHomework
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 px-[var(--space-300)]"
      onClick={onCancel}
    >
      <div
        className="flex w-full max-w-[420px] flex-col overflow-hidden rounded-[var(--radius-lg)] border border-border bg-bg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-border px-[var(--space-300)] py-[var(--space-250)]">
          <h4 className="m-0 text-[length:var(--font-size-md)] font-[var(--font-weight-semibold)] text-text">
            确认发布
          </h4>
        </div>
        <div className="flex flex-col gap-[var(--space-200)] px-[var(--space-300)] py-[var(--space-300)]">
          <p className="m-0 text-[length:var(--font-size-sm)] text-text">
            将作业派发给 {hw.targetStudentIds.length} 位学员（题目）+{" "}
            {hw.targetStudentIds.length} 位家长（题目 + 答案 + 解析）。
          </p>
          <p className="m-0 text-[length:var(--font-size-xs)] text-text-tertiary">
            发布后 24h 内可撤回。
          </p>
        </div>
        <div className="flex items-center justify-end gap-[var(--space-150)] border-t border-border px-[var(--space-300)] py-[var(--space-200)]">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-[var(--radius-sm)] border border-border bg-bg px-[var(--space-300)] py-[var(--space-150)] text-[length:var(--font-size-sm)] text-text-secondary hover:bg-[var(--black-alpha-11)]"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-[var(--radius-sm)] bg-primary px-[var(--space-300)] py-[var(--space-150)] text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)] text-[var(--color-primary-foreground,white)] hover:opacity-95"
          >
            确认发布
          </button>
        </div>
      </div>
    </div>
  )
}

/* ============================================================
 * 老师 · 已发布回看
 * ============================================================ */

function TeacherHomeworkPublished({
  ctx: _ctx,
  homeworkId,
  onBack,
  onContinue,
  onWithdrawn,
}: {
  ctx: HomeworkCtx
  homeworkId: string
  onBack: () => void
  onContinue: () => void
  onWithdrawn: () => void
}) {
  const hw = useHomework(homeworkId)
  const [expanded, setExpanded] = React.useState(false)
  if (!hw) return null

  const submittedCount = hw.submissions.filter((s) => s.autoReview).length
  const canWithdraw =
    Boolean(hw.publishedAt) && Date.now() - (hw.publishedAt ?? 0) <= 24 * 60 * 60 * 1000

  const handleWithdraw = () => {
    if (!canWithdraw) return
    if (!window.confirm("撤回后作业会回到草稿状态，学生 / 家长端不再看到该作业，确定？"))
      return
    withdrawHomework(homeworkId)
    onWithdrawn()
  }

  return (
    <div className="flex w-full flex-col gap-[var(--space-200)]">
      <GenericCard title={`${hw.title}`}>
        <div className="flex w-full flex-col gap-[var(--space-300)]">
          <div className="flex flex-wrap items-center gap-[var(--space-150)]">
            <span className="inline-flex items-center gap-[var(--space-100)] rounded-[var(--radius-sm)] border border-[var(--color-success)]/35 bg-[var(--color-success)]/8 px-[var(--space-200)] py-[var(--space-100)] text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] text-[var(--color-success)]">
              <CheckCircle2 className="h-3 w-3" />
              发布成功
            </span>
            {canWithdraw ? (
              <button
                type="button"
                onClick={handleWithdraw}
                className="text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] text-text-tertiary underline-offset-2 transition-colors hover:text-[var(--color-error,#ef4444)] hover:underline"
              >
                撤回作业
              </button>
            ) : (
              <span className="text-[length:var(--font-size-xs)] text-text-tertiary">
                发布超过 24 小时后不可撤回
              </span>
            )}
          </div>

          <PublishedMetaBlock hw={hw} />

          <PublishedStudentBlock hw={hw} submittedCount={submittedCount} />

          <PublishedAttachmentBlock hw={hw} />

          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex items-center justify-center gap-[var(--space-100)] rounded-[var(--radius-sm)] border border-border bg-bg px-[var(--space-300)] py-[var(--space-200)] text-[length:var(--font-size-sm)] text-text-secondary hover:bg-[var(--black-alpha-11)]"
          >
            {expanded ? "收起" : "展开"} {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>

          {expanded ? <PublishedFullPreview hw={hw} /> : null}

        </div>
      </GenericCard>

      <div className="flex flex-wrap items-center gap-[var(--space-150)] px-[var(--space-100)]">
        <RecommendationCommandButton label="查看作业列表" onClick={onBack} />
        <RecommendationCommandButton label="继续布置作业" onClick={onContinue} tone="primary" />
      </div>
    </div>
  )
}

function RecommendationCommandButton({
  label,
  onClick,
  tone = "default",
}: {
  label: string
  onClick: () => void
  tone?: "default" | "primary"
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-[var(--space-100)] rounded-full border px-[var(--space-250)] py-[var(--space-100)] text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] transition-colors",
        tone === "primary"
          ? "border-[var(--color-primary)]/35 bg-[var(--color-primary)]/8 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/12"
          : "border-border bg-bg text-text-secondary hover:bg-[var(--black-alpha-11)] hover:text-text",
      )}
    >
      {tone === "primary" ? <Plus className="h-3 w-3" /> : null}
      {label}
    </button>
  )
}

function PublishedMetaBlock({ hw }: { hw: LessonHomework }) {
  return (
    <div className="flex flex-wrap items-center gap-x-[var(--space-300)] gap-y-[var(--space-100)] text-[length:var(--font-size-xs)] text-text-tertiary">
      <span className="inline-flex items-center gap-[var(--space-100)]">
        <UserIcon className="h-3 w-3" />
        {hw.teacherName}
      </span>
      <span>{formatPublishedAt(hw.publishedAt ?? hw.createdAt)}</span>
      <span className="inline-flex items-center gap-[var(--space-100)]">
        <FileText className="h-3 w-3" />
        {hw.refNo}
      </span>
    </div>
  )
}

function PublishedStudentBlock({
  hw,
  submittedCount,
}: {
  hw: LessonHomework
  submittedCount: number
}) {
  return (
    <div className="flex flex-col gap-[var(--space-150)]">
      <p className="m-0 text-[length:var(--font-size-sm)] text-text-secondary">
        已发布学生（{hw.targetStudentIds.length} 人）· 已交 {submittedCount}
      </p>
      <div className="flex flex-wrap gap-[var(--space-100)]">
        {hw.submissions.slice(0, 12).map((s) => (
          <span
            key={s.studentId}
            className={cn(
              "inline-flex items-center gap-[var(--space-100)] rounded-full border px-[var(--space-200)] py-[2px] text-[length:var(--font-size-xs)]",
              s.autoReview
                ? "border-[var(--color-success)]/30 bg-[var(--color-success)]/5 text-[var(--color-success)]"
                : "border-border bg-bg text-text-secondary",
            )}
          >
            <span className="grid h-4 w-4 place-items-center rounded-full bg-[var(--black-alpha-11)] text-[10px] text-text-secondary">
              {s.studentName.slice(0, 1)}
            </span>
            {s.studentName}
            {s.autoReview ? " ✓" : ""}
          </span>
        ))}
      </div>
    </div>
  )
}

function PublishedAttachmentBlock({ hw }: { hw: LessonHomework }) {
  return (
    <div className="flex flex-col gap-[var(--space-150)]">
      <p className="m-0 text-[length:var(--font-size-sm)] text-text-secondary">
        作业附件
      </p>
      <div className="flex items-center gap-[var(--space-200)] rounded-[var(--radius-md)] border border-border bg-bg px-[var(--space-300)] py-[var(--space-200)]">
        <span className="grid h-9 w-9 place-items-center rounded-[var(--radius-sm)] bg-[var(--color-error,#ef4444)]/10 text-[var(--color-error,#ef4444)]">
          <FileText className="h-4 w-4" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)] text-text">
            {hw.pdfFileName}
          </span>
          <span className="text-[length:var(--font-size-xs)] text-text-tertiary">
            {hw.pdfSize}
          </span>
        </div>
      </div>
    </div>
  )
}

function PublishedFullPreview({ hw }: { hw: LessonHomework }) {
  const groupedByType = ((): Record<HomeworkQuestionType, HomeworkQuestion[]> => {
    const out: Record<HomeworkQuestionType, HomeworkQuestion[]> = {
      single: [],
      multi: [],
      judge: [],
      short: [],
      essay: [],
    }
    const qs =
      hw.mode === "uniform"
        ? hw.questions ?? []
        : hw.layeredVersions?.B.questions ?? []
    for (const q of qs) {
      out[q.type].push(q)
    }
    return out
  })()
  return (
    <div className="flex flex-col gap-[var(--space-300)] rounded-[var(--radius-md)] border border-border bg-bg-tertiary px-[var(--space-300)] py-[var(--space-250)]">
      <div className="flex flex-col gap-[var(--space-100)]">
        <p className="m-0 text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)] text-text">
          作业要求
        </p>
        <p className="m-0 text-[length:var(--font-size-sm)] text-text-secondary">
          {hw.requirementText || getDefaultHomeworkRequirement()}
        </p>
      </div>
      {(Object.keys(groupedByType) as HomeworkQuestionType[]).map((type) => {
        const qs = groupedByType[type]
        if (qs.length === 0) return null
        return (
          <div key={type} className="flex flex-col gap-[var(--space-150)]">
            <p className="m-0 text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)] text-text">
              {HOMEWORK_QUESTION_TYPE_LABEL[type]}（{qs.length}）
            </p>
            {qs.map((q, i) => (
              <div
                key={q.id}
                className="rounded-[var(--radius-sm)] border border-border bg-bg px-[var(--space-250)] py-[var(--space-200)] text-[length:var(--font-size-sm)] text-text"
              >
                <p className="m-0">
                  {i + 1}. {q.prompt}
                </p>
                {q.options ? (
                  <ul className="m-0 mt-[var(--space-100)] list-none space-y-[2px] pl-[var(--space-300)]">
                    {q.options.map((opt, oi) => (
                      <li key={oi} className="text-text-secondary">
                        {String.fromCharCode(65 + oi)}. {opt}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}

/* ============================================================
 * 老师 · 批改
 * ============================================================ */

function TeacherHomeworkGrading({
  ctx: _ctx,
  homeworkId,
  onBack,
}: {
  ctx: HomeworkCtx
  homeworkId: string
  onBack: () => void
}) {
  const hw = useHomework(homeworkId)
  const [filter, setFilter] = React.useState<
    "all" | "pending" | "confirmed" | "anomaly" | "appeal"
  >("all")
  if (!hw) return null

  const stats = deriveGradingStats(hw)

  const filtered = hw.submissions.filter((s) => {
    if (!s.autoReview) return filter === "all"
    if (filter === "all") return true
    if (filter === "confirmed") return Boolean(s.teacherFinal)
    if (filter === "anomaly") return Boolean(s.autoReview.suspectAnomaly)
    if (filter === "appeal") return Boolean(s.appeal && !s.appeal.resolvedAt)
    /** pending */
    return (
      !s.teacherFinal &&
      (s.autoReview.overallConfidence < 0.9 || s.autoReview.suspectAnomaly)
    )
  })

  return (
    <GenericCard title={`批改 · ${hw.title}`}>
      <div className="flex w-full flex-col gap-[var(--space-300)]">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-[var(--space-100)] self-start text-[length:var(--font-size-xs)] text-text-secondary hover:text-text"
        >
          <ArrowLeft className="h-3 w-3" />
          回到批改列表
        </button>

        <div className="grid grid-cols-2 gap-[var(--space-150)] sm:grid-cols-4">
          <StatTile label="已交" value={`${stats.submitted}/${stats.total}`} />
          <StatTile label="待复核" value={`${stats.pendingReview}`} tone={stats.pendingReview > 0 ? "warning" : "default"} />
          <StatTile label="已确认" value={`${stats.confirmed}`} tone={stats.confirmed > 0 ? "success" : "default"} />
          <StatTile label="正确率" value={`${stats.accuracy}%`} tone={stats.accuracy >= 70 ? "success" : "warning"} />
        </div>

        {stats.anomalyCount > 0 ? (
          <div className="flex items-start gap-[var(--space-150)] rounded-[var(--radius-md)] border border-[var(--color-warning,#f59e0b)]/40 bg-[var(--color-warning,#f59e0b)]/10 px-[var(--space-300)] py-[var(--space-200)] text-[length:var(--font-size-sm)] text-[var(--color-warning,#f59e0b)]">
            <AlertTriangle className="mt-[2px] h-4 w-4 flex-none" />
            <div>
              <p className="m-0 font-[var(--font-weight-medium)]">异常预警 {stats.anomalyCount} 起</p>
              <ul className="m-0 mt-[var(--space-100)] list-disc pl-[var(--space-400)] text-[length:var(--font-size-xs)]">
                {hw.submissions
                  .filter((s) => s.autoReview?.suspectAnomaly)
                  .map((s) => (
                    <li key={s.studentId}>
                      {s.studentName}：
                      {s.autoReview!.suspectAnomaly === "fast-submit"
                        ? "提交用时过短，疑似抄答"
                        : s.autoReview!.suspectAnomaly === "matches-parent-material"
                          ? "答案与家长辅导材料雷同，疑似抄答"
                          : "答案高度雷同"}
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-[var(--space-100)]">
          <FilterChip active={filter === "all"} onClick={() => setFilter("all")} label={`全部 ${hw.submissions.length}`} />
          <FilterChip active={filter === "pending"} onClick={() => setFilter("pending")} label={`待复核 ${stats.pendingReview}`} />
          <FilterChip active={filter === "anomaly"} onClick={() => setFilter("anomaly")} label={`异常 ${stats.anomalyCount}`} />
          <FilterChip active={filter === "appeal"} onClick={() => setFilter("appeal")} label={`申诉 ${stats.appealCount}`} />
          <FilterChip active={filter === "confirmed"} onClick={() => setFilter("confirmed")} label={`已确认 ${stats.confirmed}`} />
        </div>

        <div className="flex flex-col gap-[var(--space-200)]">
          {filtered.map((s) => (
            <TeacherSubmissionCard key={s.studentId} hw={hw} sub={s} />
          ))}
          {filtered.length === 0 ? (
            <div className="rounded-[var(--radius-md)] border border-dashed border-border bg-bg-tertiary px-[var(--space-300)] py-[var(--space-300)] text-center text-[length:var(--font-size-sm)] text-text-tertiary">
              本筛选下暂无记录。
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-[var(--space-150)] border-t border-border pt-[var(--space-200)]">
          <button
            type="button"
            disabled={stats.submitted - stats.confirmed === 0}
            onClick={() => {
              if (
                window.confirm(
                  `即将一键确认 ${stats.submitted - stats.confirmed} 份 AI 已批作业，学生侧将显示"老师已复核"。`,
                )
              ) {
                batchConfirmAll(hw.id)
              }
            }}
            className={cn(
              "inline-flex items-center gap-[var(--space-100)] rounded-[var(--radius-sm)] px-[var(--space-300)] py-[var(--space-150)] text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)]",
              stats.submitted - stats.confirmed > 0
                ? "bg-primary text-[var(--color-primary-foreground,white)]"
                : "bg-[var(--black-alpha-11)] text-text-tertiary",
            )}
          >
            <CheckCircle2 className="h-4 w-4" />
            一键确认全部已批
          </button>
        </div>
      </div>
    </GenericCard>
  )
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center rounded-full px-[var(--space-250)] py-[var(--space-100)] text-[length:var(--font-size-xs)] transition-colors",
        active
          ? "bg-[var(--color-primary)]/12 text-[var(--color-primary)]"
          : "text-text-secondary hover:bg-[var(--black-alpha-11)]",
      )}
    >
      {label}
    </button>
  )
}

function TeacherSubmissionCard({
  hw,
  sub,
}: {
  hw: LessonHomework
  sub: HomeworkSubmission
}) {
  const status = deriveSubmissionStatus(hw, sub)
  const [editingScore, setEditingScore] = React.useState(false)
  const [scoreInput, setScoreInput] = React.useState(
    String(sub.teacherFinal?.score ?? sub.autoReview?.score ?? 0),
  )
  const [commentInput, setCommentInput] = React.useState(
    sub.teacherFinal?.comment ?? "",
  )
  const [appealReplyInput, setAppealReplyInput] = React.useState("")

  if (!sub.autoReview && status === "not-started") {
    return (
      <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-border bg-bg-tertiary px-[var(--space-300)] py-[var(--space-200)]">
        <span className="text-[length:var(--font-size-sm)] text-text">
          {sub.studentName} · 未开始作答
        </span>
        <span className="text-[length:var(--font-size-xs)] text-text-tertiary">
          截止前会自动提醒学生 + 家长
        </span>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-[var(--space-200)] rounded-[var(--radius-md)] border border-border bg-bg px-[var(--space-300)] py-[var(--space-250)]">
      <div className="flex flex-wrap items-center gap-[var(--space-150)]">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-[var(--color-primary)]/12 text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] text-[var(--color-primary)]">
          {sub.studentName.slice(0, 1)}
        </span>
        <span className="text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)] text-text">
          {sub.studentName}
        </span>
        <SubmissionStatusBadge status={status} />
        {sub.autoReview?.suspectAnomaly ? (
          <span className="inline-flex items-center gap-[var(--space-100)] rounded-[var(--radius-sm)] border border-[var(--color-warning,#f59e0b)]/40 bg-[var(--color-warning,#f59e0b)]/10 px-[var(--space-150)] py-[1px] text-[length:var(--font-size-xs)] text-[var(--color-warning,#f59e0b)]">
            <AlertTriangle className="h-3 w-3" />
            {sub.autoReview.suspectAnomaly === "fast-submit"
              ? "用时过短"
              : sub.autoReview.suspectAnomaly === "matches-parent-material"
                ? "辅导材料雷同"
                : "答案雷同"}
          </span>
        ) : null}
      </div>

      {sub.autoReview ? (
        <div className="flex flex-col gap-[var(--space-150)] rounded-[var(--radius-sm)] border border-border bg-bg-tertiary px-[var(--space-250)] py-[var(--space-200)] text-[length:var(--font-size-sm)] text-text-secondary">
          <p className="m-0">
            自动批改 · 总分{" "}
            <strong className="text-text tabular-nums">
              {sub.teacherFinal?.score ?? sub.autoReview.score}
            </strong>
            <span className="ml-[var(--space-100)] text-[length:var(--font-size-xs)] text-text-tertiary">
              置信度 {(sub.autoReview.overallConfidence * 100).toFixed(0)}%
            </span>
          </p>
          {sub.autoReview.overallConfidence < 0.9 ? (
            <p className="m-0 text-[length:var(--font-size-xs)] text-[var(--color-warning,#f59e0b)]">
              ⚠ 包含主观题 / 异常，建议人工复核
            </p>
          ) : null}
        </div>
      ) : null}

      {sub.appeal && !sub.appeal.resolvedAt ? (
        <div className="flex flex-col gap-[var(--space-150)] rounded-[var(--radius-sm)] border border-[var(--color-info)]/40 bg-[var(--color-info)]/8 px-[var(--space-250)] py-[var(--space-200)]">
          <p className="m-0 text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)] text-text">
            学生申诉：{sub.appeal.reason}
          </p>
          <div className="flex flex-col gap-[var(--space-100)]">
            <textarea
              rows={2}
              value={appealReplyInput}
              onChange={(e) => setAppealReplyInput(e.target.value)}
              placeholder="回复学生（可选）"
              className="rounded-[var(--radius-sm)] border border-border bg-bg px-[var(--space-200)] py-[var(--space-150)] text-[length:var(--font-size-sm)] text-text outline-none"
            />
            <div className="flex items-center gap-[var(--space-100)]">
              <button
                type="button"
                onClick={() => {
                  resolveAppeal(hw.id, sub.studentId, "upheld", appealReplyInput)
                  setAppealReplyInput("")
                }}
                className="rounded-[var(--radius-sm)] bg-[var(--color-success)]/12 px-[var(--space-250)] py-[var(--space-100)] text-[length:var(--font-size-xs)] text-[var(--color-success)] hover:bg-[var(--color-success)]/16"
              >
                接受申诉（自动改判）
              </button>
              <button
                type="button"
                onClick={() => {
                  resolveAppeal(hw.id, sub.studentId, "rejected", appealReplyInput)
                  setAppealReplyInput("")
                }}
                className="rounded-[var(--radius-sm)] border border-border bg-bg px-[var(--space-250)] py-[var(--space-100)] text-[length:var(--font-size-xs)] text-text-secondary hover:bg-[var(--black-alpha-11)]"
              >
                维持原判
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editingScore ? (
        <div className="flex flex-col gap-[var(--space-150)] rounded-[var(--radius-sm)] border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5 px-[var(--space-250)] py-[var(--space-200)]">
          <div className="flex items-center gap-[var(--space-150)]">
            <label className="text-[length:var(--font-size-xs)] text-text-secondary">分数</label>
            <input
              type="number"
              value={scoreInput}
              onChange={(e) => setScoreInput(e.target.value)}
              min={0}
              max={100}
              className="w-20 rounded-[var(--radius-sm)] border border-border bg-bg px-[var(--space-150)] py-[2px] text-[length:var(--font-size-sm)] text-text outline-none"
            />
          </div>
          <textarea
            rows={2}
            value={commentInput}
            onChange={(e) => setCommentInput(e.target.value)}
            placeholder="给学生的反馈（可选）"
            className="rounded-[var(--radius-sm)] border border-border bg-bg px-[var(--space-200)] py-[var(--space-150)] text-[length:var(--font-size-sm)] text-text outline-none"
          />
          <div className="flex items-center justify-end gap-[var(--space-100)]">
            <button
              type="button"
              onClick={() => setEditingScore(false)}
              className="rounded-[var(--radius-sm)] border border-border bg-bg px-[var(--space-200)] py-[var(--space-100)] text-[length:var(--font-size-xs)] text-text-secondary hover:bg-[var(--black-alpha-11)]"
            >
              取消
            </button>
            <button
              type="button"
              onClick={() => {
                confirmTeacherFinal(hw.id, sub.studentId, {
                  score: Number(scoreInput),
                  comment: commentInput.trim() || undefined,
                })
                setEditingScore(false)
              }}
              className="rounded-[var(--radius-sm)] bg-primary px-[var(--space-200)] py-[var(--space-100)] text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] text-[var(--color-primary-foreground,white)]"
            >
              保存并确认
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-[var(--space-100)]">
          {sub.autoReview && !sub.teacherFinal ? (
            <ActionMiniButton
              onClick={() =>
                confirmTeacherFinal(hw.id, sub.studentId, {
                  score: sub.autoReview!.score,
                })
              }
              tone="primary"
              icon={<CheckCircle2 className="h-3 w-3" />}
              label="确认"
            />
          ) : null}
          {sub.autoReview ? (
            <ActionMiniButton
              onClick={() => setEditingScore(true)}
              icon={<Sparkles className="h-3 w-3" />}
              label="改分"
            />
          ) : null}
          {sub.autoReview ? (
            <ActionMiniButton
              onClick={() => returnSubmissionForRedo(hw.id, sub.studentId)}
              icon={<RefreshCw className="h-3 w-3" />}
              label="退回订正"
            />
          ) : null}
        </div>
      )}

      {sub.teacherFinal?.comment ? (
        <p className="m-0 inline-flex items-center gap-[var(--space-100)] text-[length:var(--font-size-xs)] text-text-tertiary">
          <MessageSquare className="h-3 w-3" />
          老师反馈：{sub.teacherFinal.comment}
        </p>
      ) : null}
    </div>
  )
}

function SubmissionStatusBadge({ status }: { status: HomeworkSubmissionStatus }) {
  const map: Record<HomeworkSubmissionStatus, { label: string; cls: string }> = {
    "not-started": {
      label: "未开始",
      cls: "border-border bg-bg-tertiary text-text-tertiary",
    },
    "in-progress": {
      label: "做题中",
      cls: "border-border bg-bg-tertiary text-text-secondary",
    },
    submitted: {
      label: "已交 · 待复核",
      cls: "border-[var(--color-warning,#f59e0b)]/40 bg-[var(--color-warning,#f59e0b)]/10 text-[var(--color-warning,#f59e0b)]",
    },
    "teacher-confirmed": {
      label: "老师已复核",
      cls: "border-[var(--color-success)]/40 bg-[var(--color-success)]/10 text-[var(--color-success)]",
    },
    appealed: {
      label: "申诉中",
      cls: "border-[var(--color-info)]/40 bg-[var(--color-info)]/10 text-[var(--color-info)]",
    },
    returned: {
      label: "已退回订正",
      cls: "border-border bg-bg-tertiary text-text-secondary",
    },
  }
  const cfg = map[status]
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[var(--radius-sm)] border px-[var(--space-150)] py-[1px] text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)]",
        cfg.cls,
      )}
    >
      {cfg.label}
    </span>
  )
}

function ActionMiniButton({
  onClick,
  tone = "default",
  icon,
  label,
}: {
  onClick: () => void
  tone?: "default" | "primary"
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-[var(--space-100)] rounded-[var(--radius-sm)] border px-[var(--space-200)] py-[var(--space-100)] text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] transition-colors",
        tone === "primary"
          ? "border-[var(--color-primary)]/45 bg-[var(--color-primary)]/10 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/15"
          : "border-border bg-bg text-text-secondary hover:bg-[var(--black-alpha-11)]",
      )}
    >
      {icon}
      {label}
    </button>
  )
}

/* ============================================================
 * 学生 主入口
 * ============================================================ */

type StudentSubview =
  | { kind: "list" }
  | { kind: "do"; homeworkId: string }
  | { kind: "feedback"; homeworkId: string }

function StudentHomeworkRoot({ ctx }: { ctx: HomeworkCtx }) {
  const snap = useLessonHomeworkSnapshot(ctx.lessonId)
  const selfId = getSelfStudentIdForRole()
  const myHomeworks = snap.homeworks
    .filter((hw) => hw.publishedAt && !hw.withdrawnAt)
    .filter((hw) => hw.targetStudentIds.includes(selfId))

  const [view, setView] = React.useState<StudentSubview>({ kind: "list" })

  if (view.kind === "do") {
    return (
      <StudentHomeworkDo
        ctx={ctx}
        homeworkId={view.homeworkId}
        studentId={selfId}
        onBack={() => setView({ kind: "list" })}
        onGraded={() => setView({ kind: "feedback", homeworkId: view.homeworkId })}
      />
    )
  }
  if (view.kind === "feedback") {
    return (
      <StudentHomeworkFeedback
        ctx={ctx}
        homeworkId={view.homeworkId}
        studentId={selfId}
        onBack={() => setView({ kind: "list" })}
      />
    )
  }
  return (
    <GenericCard title={`我的作业 · ${ctx.lessonTitle}`}>
      <div className="flex w-full flex-col gap-[var(--space-200)]">
        {myHomeworks.length === 0 ? (
          <div className="rounded-[var(--radius-md)] border border-dashed border-border bg-bg-tertiary px-[var(--space-300)] py-[var(--space-400)] text-center text-[length:var(--font-size-sm)] text-text-tertiary">
            老师还没派发作业，关注主对话提醒就好。
          </div>
        ) : (
          myHomeworks.map((hw) => {
            const sub = hw.submissions.find((s) => s.studentId === selfId)
            if (!sub) return null
            const status = deriveSubmissionStatus(hw, sub)
            return (
              <button
                key={hw.id}
                type="button"
                onClick={() =>
                  setView({
                    kind: status === "submitted" || status === "teacher-confirmed" ? "feedback" : "do",
                    homeworkId: hw.id,
                  })
                }
                className="flex flex-col gap-[var(--space-150)] rounded-[var(--radius-md)] border border-border bg-bg px-[var(--space-300)] py-[var(--space-250)] text-left transition-colors hover:border-[var(--color-primary)]/35 hover:bg-bg-secondary/40"
              >
                <div className="flex items-start gap-[var(--space-200)]">
                  <span className="flex-1 truncate text-[length:var(--font-size-md)] font-[var(--font-weight-semibold)] text-text">
                    {hw.title}
                  </span>
                  <SubmissionStatusBadge status={status} />
                </div>
                <p className="m-0 text-[length:var(--font-size-xs)] text-text-tertiary">
                  {stageLabel(hw.stage)} · {HOMEWORK_DIFFICULTY_LABEL[hw.difficulty]} · 共{" "}
                  {countQuestions(hw, sub)} 题
                  {hw.deadlineAt
                    ? ` · 截止 ${formatPublishedAt(hw.deadlineAt)}`
                    : ""}
                </p>
                {status === "teacher-confirmed" ? (
                  <p className="m-0 text-[length:var(--font-size-xs)] text-[var(--color-success)]">
                    老师已复核 · 终评 {sub.teacherFinal!.score}
                  </p>
                ) : status === "submitted" ? (
                  <p className="m-0 text-[length:var(--font-size-xs)] text-text-secondary">
                    系统自动批改 · 得分 {sub.autoReview!.score}
                  </p>
                ) : (
                  <p className="m-0 text-[length:var(--font-size-xs)] text-[var(--color-primary)]">
                    点击开始作答
                  </p>
                )}
              </button>
            )
          })
        )}
      </div>
    </GenericCard>
  )
}

function countQuestions(hw: LessonHomework, sub: HomeworkSubmission): number {
  return getSubmissionQuestions(hw, sub).length
}

/* ============================================================
 * 学生 · 做作业
 * ============================================================ */

function StudentHomeworkDo({
  ctx,
  homeworkId,
  studentId,
  onBack,
  onGraded,
}: {
  ctx: HomeworkCtx
  homeworkId: string
  studentId: string
  onBack: () => void
  onGraded: () => void
}) {
  const hw = useHomework(homeworkId)
  const [questionIdx, setQuestionIdx] = React.useState(0)
  const [grading, setGrading] = React.useState(false)

  if (!hw) return null
  const sub = hw.submissions.find((s) => s.studentId === studentId)
  if (!sub) return null
  const questions = getSubmissionQuestions(hw, sub)
  if (questions.length === 0) return null

  const q = questions[Math.min(questionIdx, questions.length - 1)]
  const myAnswer = sub.answers[q.id]
  const answeredCount = questions.filter((qq) => {
    const a = sub.answers[qq.id]
    if (qq.type === "multi") return Array.isArray(a) && a.length > 0
    return Boolean(a) && String(a).trim().length > 0
  }).length
  const allAnswered = answeredCount === questions.length

  const setAnswer = (answer: string | string[]) => {
    saveStudentDraft(homeworkId, studentId, {
      ...sub.answers,
      [q.id]: answer,
    })
  }

  const handleGrade = () => {
    if (!allAnswered || grading) return
    setGrading(true)
    setTimeout(() => {
      submitAndAutoGrade(homeworkId, studentId)
      setGrading(false)
      onGraded()
    }, 800)
  }

  return (
    <GenericCard title={hw.title}>
      <div className="flex w-full flex-col gap-[var(--space-300)]">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-[var(--space-100)] self-start text-[length:var(--font-size-xs)] text-text-secondary hover:text-text"
        >
          <ArrowLeft className="h-3 w-3" />
          回到作业列表
        </button>

        <div className="flex items-center justify-between text-[length:var(--font-size-xs)] text-text-tertiary">
          <span>
            第 {questionIdx + 1} / {questions.length} 题 · 难度{" "}
            {HOMEWORK_DIFFICULTY_LABEL[hw.difficulty]}
          </span>
          <span>{answeredCount}/{questions.length} 已作答</span>
        </div>

        <DoQuestionPanel
          q={q}
          index={questionIdx}
          myAnswer={myAnswer}
          onAnswer={setAnswer}
        />

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setQuestionIdx((i) => Math.max(0, i - 1))}
            disabled={questionIdx === 0}
            className={cn(
              "inline-flex items-center gap-[var(--space-100)] rounded-[var(--radius-sm)] border border-border bg-bg px-[var(--space-250)] py-[var(--space-150)] text-[length:var(--font-size-sm)]",
              questionIdx === 0
                ? "cursor-not-allowed text-text-tertiary"
                : "text-text-secondary hover:bg-[var(--black-alpha-11)]",
            )}
          >
            <ArrowLeft className="h-3 w-3" />
            上一题
          </button>
          <button
            type="button"
            onClick={() =>
              setQuestionIdx((i) => Math.min(questions.length - 1, i + 1))
            }
            disabled={questionIdx === questions.length - 1}
            className={cn(
              "inline-flex items-center gap-[var(--space-100)] rounded-[var(--radius-sm)] border border-border bg-bg px-[var(--space-250)] py-[var(--space-150)] text-[length:var(--font-size-sm)]",
              questionIdx === questions.length - 1
                ? "cursor-not-allowed text-text-tertiary"
                : "text-text-secondary hover:bg-[var(--black-alpha-11)]",
            )}
          >
            下一题
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>

        <button
          type="button"
          disabled={!allAnswered || grading}
          onClick={handleGrade}
          className={cn(
            "inline-flex items-center justify-center gap-[var(--space-150)] rounded-[var(--radius-md)] px-[var(--space-300)] py-[var(--space-250)] text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] transition-colors",
            allAnswered && !grading
              ? "bg-primary text-[var(--color-primary-foreground,white)] hover:opacity-95"
              : "bg-[var(--black-alpha-11)] text-text-tertiary",
          )}
          title={!allAnswered ? "还有题目未作答，全部答完才能批改" : undefined}
        >
          <CheckCircle2 className="h-4 w-4" />
          {grading ? "批改中..." : allAnswered ? "✓ 一键批改" : `还有 ${questions.length - answeredCount} 题未作答`}
        </button>

        <p className="m-0 inline-flex items-center gap-[var(--space-100)] text-[length:var(--font-size-xs)] text-text-tertiary">
          <Lightbulb className="h-3 w-3" />
          作答中看不到答案 / 解析；点「一键批改」后会立刻显示对错与解析。
        </p>
      </div>
    </GenericCard>
  )
}

function DoQuestionPanel({
  q,
  index,
  myAnswer,
  onAnswer,
}: {
  q: HomeworkQuestion
  index: number
  myAnswer: string | string[] | undefined
  onAnswer: (a: string | string[]) => void
}) {
  return (
    <div className="flex flex-col gap-[var(--space-200)] rounded-[var(--radius-md)] border border-border bg-bg px-[var(--space-300)] py-[var(--space-250)]">
      <div className="flex flex-wrap items-center gap-[var(--space-150)]">
        <span className="inline-flex items-center rounded-[var(--radius-sm)] bg-[var(--color-primary)]/8 px-[var(--space-150)] py-[1px] text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] text-[var(--color-primary)]">
          {HOMEWORK_QUESTION_TYPE_LABEL[q.type]}
        </span>
        <span className="inline-flex items-center text-[length:var(--font-size-xs)] text-text-tertiary">
          📎 {q.knowledgePointLabel}
        </span>
      </div>
      <p className="m-0 text-[length:var(--font-size-sm)] leading-relaxed text-text">
        {index + 1}. {q.prompt}
      </p>
      {q.type === "single" || q.type === "judge" ? (
        <div className="flex flex-col gap-[var(--space-100)]">
          {(q.options ??
            (q.type === "judge" ? ["对（T）", "错（F）"] : [])).map((opt, i) => {
            const letter =
              q.type === "judge" ? (i === 0 ? "T" : "F") : String.fromCharCode(65 + i)
            const picked = myAnswer === letter
            return (
              <button
                key={letter}
                type="button"
                onClick={() => onAnswer(letter)}
                className={cn(
                  "flex items-center gap-[var(--space-200)] rounded-[var(--radius-sm)] border px-[var(--space-250)] py-[var(--space-150)] text-left text-[length:var(--font-size-sm)] transition-colors",
                  picked
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)]/8 text-[var(--color-primary)]"
                    : "border-border bg-bg-tertiary text-text hover:border-[var(--color-primary)]/30",
                )}
              >
                <span
                  className={cn(
                    "grid h-5 w-5 place-items-center rounded-full border",
                    picked
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] text-[var(--color-primary-foreground,white)]"
                      : "border-border bg-bg text-text-tertiary",
                  )}
                >
                  {picked ? "✓" : ""}
                </span>
                <span>
                  {letter}. {opt}
                </span>
              </button>
            )
          })}
        </div>
      ) : null}
      {q.type === "multi" ? (
        <div className="flex flex-col gap-[var(--space-100)]">
          {(q.options ?? []).map((opt, i) => {
            const letter = String.fromCharCode(65 + i)
            const current = Array.isArray(myAnswer) ? myAnswer : []
            const picked = current.includes(letter)
            return (
              <button
                key={letter}
                type="button"
                onClick={() =>
                  onAnswer(
                    picked
                      ? current.filter((x) => x !== letter)
                      : [...current, letter].sort(),
                  )
                }
                className={cn(
                  "flex items-center gap-[var(--space-200)] rounded-[var(--radius-sm)] border px-[var(--space-250)] py-[var(--space-150)] text-left text-[length:var(--font-size-sm)] transition-colors",
                  picked
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)]/8 text-[var(--color-primary)]"
                    : "border-border bg-bg-tertiary text-text hover:border-[var(--color-primary)]/30",
                )}
              >
                <span
                  className={cn(
                    "grid h-5 w-5 place-items-center rounded-sm border",
                    picked
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] text-[var(--color-primary-foreground,white)]"
                      : "border-border bg-bg text-text-tertiary",
                  )}
                >
                  {picked ? "✓" : ""}
                </span>
                <span>
                  {letter}. {opt}
                </span>
              </button>
            )
          })}
        </div>
      ) : null}
      {q.type === "short" || q.type === "essay" ? (
        <textarea
          rows={q.type === "essay" ? 6 : 3}
          value={typeof myAnswer === "string" ? myAnswer : ""}
          onChange={(e) => onAnswer(e.target.value)}
          placeholder="在此作答"
          className="rounded-[var(--radius-sm)] border border-border bg-bg-tertiary px-[var(--space-250)] py-[var(--space-200)] text-[length:var(--font-size-sm)] text-text outline-none focus:border-[var(--color-primary)]/45 focus:bg-bg"
        />
      ) : null}
    </div>
  )
}

/* ============================================================
 * 学生 · 一键批改后反馈
 * ============================================================ */

function StudentHomeworkFeedback({
  ctx: _ctx,
  homeworkId,
  studentId,
  onBack,
}: {
  ctx: HomeworkCtx
  homeworkId: string
  studentId: string
  onBack: () => void
}) {
  const hw = useHomework(homeworkId)
  if (!hw) return null
  const sub = hw.submissions.find((s) => s.studentId === studentId)
  if (!sub || !sub.autoReview) return null
  const questions = getSubmissionQuestions(hw, sub)

  const finalScore = sub.teacherFinal?.score ?? sub.autoReview.score
  const isTeacherConfirmed = Boolean(sub.teacherFinal)

  return (
    <GenericCard title={hw.title}>
      <div className="flex w-full flex-col gap-[var(--space-300)]">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-[var(--space-100)] self-start text-[length:var(--font-size-xs)] text-text-secondary hover:text-text"
        >
          <ArrowLeft className="h-3 w-3" />
          回到作业列表
        </button>

        <div className="rounded-[var(--radius-md)] border border-[var(--color-success)]/35 bg-[var(--color-success)]/5 px-[var(--space-300)] py-[var(--space-250)]">
          <p className="m-0 text-[length:var(--font-size-md)] font-[var(--font-weight-semibold)] text-text">
            ✓ 已批改 · 已同步给老师
          </p>
          <p className="m-0 mt-[var(--space-100)] text-[length:var(--font-size-sm)] text-text-secondary">
            总分{" "}
            <strong className="text-text tabular-nums">{finalScore}</strong> ·
            <span className="ml-[var(--space-100)]">
              {isTeacherConfirmed ? "老师已复核" : "系统自动批改 · 老师可能再次调整"}
            </span>
          </p>
        </div>

        <div className="flex flex-col gap-[var(--space-200)]">
          {questions.map((q, idx) => (
            <FeedbackQuestionRow
              key={q.id}
              q={q}
              index={idx + 1}
              myAnswer={sub.answers[q.id]}
              autoReview={sub.autoReview!.perQuestion[q.id]}
              onAppeal={() => {
                const reason = window.prompt("申诉理由（说说为什么你的答案是对的）：")
                if (reason && reason.trim()) {
                  submitAppeal(homeworkId, studentId, reason, q.id)
                }
              }}
            />
          ))}
        </div>

        {sub.appeal ? (
          <div
            className={cn(
              "rounded-[var(--radius-md)] border px-[var(--space-300)] py-[var(--space-200)] text-[length:var(--font-size-sm)]",
              sub.appeal.resolution === "upheld"
                ? "border-[var(--color-success)]/40 bg-[var(--color-success)]/8 text-text"
                : sub.appeal.resolution === "rejected"
                  ? "border-border bg-bg-tertiary text-text-secondary"
                  : "border-[var(--color-info)]/40 bg-[var(--color-info)]/8 text-text",
            )}
          >
            <p className="m-0 font-[var(--font-weight-medium)]">
              申诉：{sub.appeal.reason}
            </p>
            {sub.appeal.resolvedAt ? (
              <p className="m-0 mt-[var(--space-100)] text-[length:var(--font-size-xs)] text-text-secondary">
                老师{sub.appeal.resolution === "upheld" ? "已接受" : "已维持原判"}
                {sub.appeal.teacherReply ? ` · ${sub.appeal.teacherReply}` : ""}
              </p>
            ) : (
              <p className="m-0 mt-[var(--space-100)] text-[length:var(--font-size-xs)] text-text-tertiary">
                等待老师处理中...
              </p>
            )}
          </div>
        ) : null}

        {sub.teacherFinal?.comment ? (
          <div className="rounded-[var(--radius-md)] border border-border bg-bg-tertiary px-[var(--space-300)] py-[var(--space-200)] text-[length:var(--font-size-sm)] text-text">
            <p className="m-0 font-[var(--font-weight-medium)]">
              💬 老师反馈
            </p>
            <p className="m-0 mt-[var(--space-100)] text-text-secondary">
              {sub.teacherFinal.comment}
            </p>
          </div>
        ) : null}
      </div>
    </GenericCard>
  )
}

function FeedbackQuestionRow({
  q,
  index,
  myAnswer,
  autoReview,
  onAppeal,
}: {
  q: HomeworkQuestion
  index: number
  myAnswer: string | string[] | undefined
  autoReview: { correct: boolean; confidence: number } | undefined
  onAppeal: () => void
}) {
  const [showAnalysis, setShowAnalysis] = React.useState(false)
  const isCorrect = autoReview?.correct ?? false
  const myAnsLabel = Array.isArray(myAnswer)
    ? myAnswer.join(", ")
    : myAnswer ?? "—"
  const correctLabel = Array.isArray(q.correctAnswer)
    ? q.correctAnswer.join(", ")
    : q.correctAnswer
  return (
    <div
      className={cn(
        "flex flex-col gap-[var(--space-150)] rounded-[var(--radius-md)] border px-[var(--space-300)] py-[var(--space-250)]",
        isCorrect
          ? "border-[var(--color-success)]/30 bg-[var(--color-success)]/3"
          : "border-[var(--color-error,#ef4444)]/30 bg-[var(--color-error,#ef4444)]/3",
      )}
    >
      <div className="flex flex-wrap items-center gap-[var(--space-150)]">
        <span
          className={cn(
            "inline-flex items-center rounded-full px-[var(--space-200)] py-[1px] text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)]",
            isCorrect
              ? "bg-[var(--color-success)]/12 text-[var(--color-success)]"
              : "bg-[var(--color-error,#ef4444)]/12 text-[var(--color-error,#ef4444)]",
          )}
        >
          {isCorrect ? "✓ 正确" : "✗ 错误"}
        </span>
        <span className="text-[length:var(--font-size-xs)] text-text-tertiary">
          第 {index} 题 · {HOMEWORK_QUESTION_TYPE_LABEL[q.type]} · {q.knowledgePointLabel}
        </span>
      </div>
      <p className="m-0 text-[length:var(--font-size-sm)] text-text">
        {q.prompt}
      </p>
      <p className="m-0 text-[length:var(--font-size-xs)] text-text-secondary">
        你的答案：<strong className="text-text">{myAnsLabel}</strong>
        {!isCorrect ? (
          <>
            <span className="mx-[var(--space-150)] text-text-tertiary">|</span>
            正确：<strong className="text-text">{correctLabel}</strong>
          </>
        ) : null}
      </p>
      {!isCorrect ? (
        <div className="flex items-center gap-[var(--space-100)]">
          <button
            type="button"
            onClick={() => setShowAnalysis((v) => !v)}
            className="inline-flex items-center gap-[var(--space-100)] rounded-[var(--radius-sm)] border border-border bg-bg px-[var(--space-200)] py-[var(--space-100)] text-[length:var(--font-size-xs)] text-text-secondary hover:bg-[var(--black-alpha-11)]"
          >
            {showAnalysis ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            {showAnalysis ? "收起解析" : "看解析"}
          </button>
          <button
            type="button"
            onClick={onAppeal}
            className="inline-flex items-center gap-[var(--space-100)] rounded-[var(--radius-sm)] border border-border bg-bg px-[var(--space-200)] py-[var(--space-100)] text-[length:var(--font-size-xs)] text-text-secondary hover:bg-[var(--black-alpha-11)]"
          >
            <AlertTriangle className="h-3 w-3" />
            申诉错判
          </button>
        </div>
      ) : null}
      {showAnalysis && !isCorrect ? (
        <div className="rounded-[var(--radius-sm)] border border-border bg-bg px-[var(--space-250)] py-[var(--space-200)] text-[length:var(--font-size-xs)] text-text-secondary">
          {q.analysis}
        </div>
      ) : null}
    </div>
  )
}

/* ============================================================
 * 家长 主入口
 * ============================================================ */

function ParentHomeworkRoot({ ctx }: { ctx: HomeworkCtx }) {
  const snap = useLessonHomeworkSnapshot(ctx.lessonId)
  const childId = getSelfStudentIdForRole()
  const childHomeworks = snap.homeworks
    .filter((hw) => hw.publishedAt && !hw.withdrawnAt)
    .filter((hw) => hw.targetStudentIds.includes(childId))

  return (
    <GenericCard title={`孩子作业 · ${ctx.lessonTitle}`}>
      <div className="flex w-full flex-col gap-[var(--space-300)]">
        {childHomeworks.length === 0 ? (
          <div className="rounded-[var(--radius-md)] border border-dashed border-border bg-bg-tertiary px-[var(--space-300)] py-[var(--space-400)] text-center text-[length:var(--font-size-sm)] text-text-tertiary">
            老师还没派发作业，发送时主对话会提醒你。
          </div>
        ) : (
          childHomeworks.map((hw) => (
            <ParentHomeworkCard key={hw.id} hw={hw} childId={childId} teacherName={ctx.teacherName} />
          ))
        )}
      </div>
    </GenericCard>
  )
}

function ParentHomeworkCard({
  hw,
  childId,
  teacherName: _teacherName,
}: {
  hw: LessonHomework
  childId: string
  teacherName: string
}) {
  const sub = hw.submissions.find((s) => s.studentId === childId)
  if (!sub) return null
  const questions = getSubmissionQuestions(hw, sub)
  const total = questions.length
  const answered = questions.filter((q) => {
    const a = sub.answers[q.id]
    if (q.type === "multi") return Array.isArray(a) && a.length > 0
    return Boolean(a) && String(a).trim().length > 0
  }).length
  const status = deriveSubmissionStatus(hw, sub)
  const finalScore = sub.teacherFinal?.score ?? sub.autoReview?.score

  /** 家长侧 ACL：可看题面 + 答案 + 解析，但看不到孩子具体作答 */
  const wrongKpLabels = sub.autoReview
    ? questions
        .filter((q) => sub.autoReview!.perQuestion[q.id]?.correct === false)
        .map((q) => q.knowledgePointLabel)
    : []

  return (
    <div className="flex flex-col gap-[var(--space-250)] rounded-[var(--radius-md)] border border-border bg-bg px-[var(--space-300)] py-[var(--space-250)]">
      <div className="flex flex-wrap items-center justify-between gap-[var(--space-150)]">
        <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
          <span className="truncate text-[length:var(--font-size-md)] font-[var(--font-weight-semibold)] text-text">
            {hw.title}
          </span>
          <span className="text-[length:var(--font-size-xs)] text-text-tertiary">
            {stageLabel(hw.stage)} · 难度 {HOMEWORK_DIFFICULTY_LABEL[hw.difficulty]} · 共 {total} 题
            {hw.deadlineAt ? ` · 截止 ${formatPublishedAt(hw.deadlineAt)}` : ""}
          </span>
        </div>
        <SubmissionStatusBadge status={status} />
      </div>

      {/* —— 完成度 —— */}
      <ProgressBlock answered={answered} total={total} status={status} finalScore={finalScore} sub={sub} />

      {/* —— AI 陪练建议 —— */}
      <ParentTipsBlock hw={hw} status={status} wrongKpLabels={wrongKpLabels} />

      {/* —— 已批改 · 错点摘要 —— */}
      {sub.autoReview ? (
        <ParentMistakeSummary wrongKpLabels={wrongKpLabels} questions={questions} sub={sub} />
      ) : null}

      {/* —— 辅导材料：题目 + 答案 + 解析 —— */}
      <ParentTutoringMaterial hw={hw} questions={questions} />

      <p className="m-0 inline-flex items-center gap-[var(--space-100)] text-[length:var(--font-size-xs)] text-text-tertiary">
        <Lock className="h-3 w-3" />
        辅导材料仅作家庭陪练参考，请不要直接把答案告诉孩子。
      </p>
    </div>
  )
}

function ProgressBlock({
  answered,
  total,
  status,
  finalScore,
  sub,
}: {
  answered: number
  total: number
  status: HomeworkSubmissionStatus
  finalScore?: number
  sub: HomeworkSubmission
}) {
  const submitted = Boolean(sub.autoReview)
  const pct = total > 0 ? Math.round((answered / total) * 100) : 0
  return (
    <div className="flex flex-col gap-[var(--space-100)]">
      <div className="flex items-center justify-between text-[length:var(--font-size-xs)] text-text-secondary">
        <span>
          {submitted ? `孩子已批改 · ${pct}% 完成度` : `孩子已完成 ${answered}/${total}`}
        </span>
        {finalScore != null ? (
          <span className="font-[var(--font-weight-medium)] text-text">
            总分 {finalScore}
          </span>
        ) : null}
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-bg-tertiary">
        <div
          className={cn(
            "h-full transition-all",
            submitted
              ? "bg-[var(--color-success)]"
              : "bg-[var(--color-primary)]",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      {status === "teacher-confirmed" ? (
        <p className="m-0 text-[length:var(--font-size-xs)] text-[var(--color-success)]">
          老师已复核 · 终评 {sub.teacherFinal!.score}
        </p>
      ) : null}
    </div>
  )
}

function ParentTipsBlock({
  hw: _hw,
  status,
  wrongKpLabels,
}: {
  /** 暂未使用，但保留以备未来按知识点 / 难度定制建议 */
  hw: LessonHomework
  status: HomeworkSubmissionStatus
  wrongKpLabels: string[]
}) {
  const tips: string[] = []
  if (status === "not-started" || status === "in-progress") {
    tips.push("提醒孩子在 19:30 前开始，专注 25 分钟为佳。")
    tips.push("遇到读题卡顿，可以问 TA：'你怎么想的？'，不要直接给答案。")
    tips.push("做完不要急着对答案，让孩子自己再检查一遍。")
  } else if (wrongKpLabels.length > 0) {
    const uniqKp = Array.from(new Set(wrongKpLabels)).slice(0, 3)
    for (const kp of uniqKp) {
      tips.push(`错点涉及「${kp}」：可翻回辅导材料对应题目，让孩子重新读题再做。`)
    }
  } else {
    tips.push("孩子本次发挥不错，可以表扬！")
    tips.push("若还有 10 分钟，可以一起读一段课外材料巩固学习习惯。")
  }
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-info)]/30 bg-[var(--color-info)]/5 px-[var(--space-250)] py-[var(--space-200)]">
      <p className="m-0 text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)] text-text">
        💡 今晚怎么陪练
      </p>
      <ol className="m-0 mt-[var(--space-100)] list-decimal pl-[var(--space-400)] text-[length:var(--font-size-xs)] text-text-secondary">
        {tips.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ol>
    </div>
  )
}

function ParentMistakeSummary({
  wrongKpLabels,
  questions,
  sub,
}: {
  wrongKpLabels: string[]
  questions: HomeworkQuestion[]
  sub: HomeworkSubmission
}) {
  if (wrongKpLabels.length === 0) return null
  const wrongIndices = questions
    .map((q, idx) => ({ q, idx: idx + 1 }))
    .filter((x) => sub.autoReview!.perQuestion[x.q.id]?.correct === false)
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-warning,#f59e0b)]/30 bg-[var(--color-warning,#f59e0b)]/5 px-[var(--space-250)] py-[var(--space-200)]">
      <p className="m-0 text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)] text-text">
        📊 错点摘要
      </p>
      <ul className="m-0 mt-[var(--space-100)] list-disc pl-[var(--space-400)] text-[length:var(--font-size-xs)] text-text-secondary">
        {wrongIndices.map((x) => (
          <li key={x.q.id}>
            第 {x.idx} 题 · 知识点「{x.q.knowledgePointLabel}」
          </li>
        ))}
      </ul>
      <p className="m-0 mt-[var(--space-100)] text-[length:var(--font-size-xs)] text-text-tertiary">
        （不显示孩子的具体答案，仅展示错点知识点）
      </p>
    </div>
  )
}

function ParentTutoringMaterial({
  hw,
  questions,
}: {
  hw: LessonHomework
  questions: HomeworkQuestion[]
}) {
  const [expanded, setExpanded] = React.useState(false)
  return (
    <div className="flex flex-col gap-[var(--space-150)]">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="inline-flex items-center justify-between gap-[var(--space-150)] rounded-[var(--radius-md)] border border-border bg-bg-tertiary px-[var(--space-250)] py-[var(--space-200)] text-left text-[length:var(--font-size-sm)] text-text hover:bg-bg"
      >
        <span className="inline-flex items-center gap-[var(--space-100)] font-[var(--font-weight-medium)]">
          <ClipboardList className="h-3.5 w-3.5 text-text-secondary" />
          📖 辅导材料：题目 + 答案 + 解析（{questions.length} 题）
        </span>
        {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>
      {expanded ? (
        <div className="flex flex-col gap-[var(--space-200)]">
          {questions.map((q, idx) => (
            <ParentTutoringQuestion key={q.id} q={q} index={idx + 1} />
          ))}
        </div>
      ) : null}
      {!expanded ? null : (
        <p className="m-0 text-[length:var(--font-size-xs)] text-text-tertiary">
          PDF 附件：{hw.pdfFileName} · {hw.pdfSize}（自带"机构 + {DEMO_SELF_STUDENT_NAME}"水印）
        </p>
      )}
    </div>
  )
}

function ParentTutoringQuestion({
  q,
  index,
}: {
  q: HomeworkQuestion
  index: number
}) {
  return (
    <div className="flex flex-col gap-[var(--space-150)] rounded-[var(--radius-sm)] border border-border bg-bg px-[var(--space-250)] py-[var(--space-200)]">
      <div className="flex flex-wrap items-center gap-[var(--space-150)] text-[length:var(--font-size-xs)] text-text-tertiary">
        <span className="font-[var(--font-weight-medium)] text-text">{index}.</span>
        <span>{HOMEWORK_QUESTION_TYPE_LABEL[q.type]}</span>
        <span>· {q.knowledgePointLabel}</span>
      </div>
      <p className="m-0 text-[length:var(--font-size-sm)] text-text">{q.prompt}</p>
      {q.options ? (
        <ul className="m-0 list-none space-y-[2px] pl-[var(--space-200)] text-[length:var(--font-size-xs)] text-text-secondary">
          {q.options.map((opt, i) => (
            <li key={i}>
              {String.fromCharCode(65 + i)}. {opt}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="rounded-[var(--radius-sm)] border border-[var(--color-success)]/25 bg-[var(--color-success)]/5 px-[var(--space-200)] py-[var(--space-150)] text-[length:var(--font-size-xs)] text-text-secondary">
        <p className="m-0">
          <span className="font-[var(--font-weight-medium)] text-text">答案：</span>
          {Array.isArray(q.correctAnswer) ? q.correctAnswer.join(", ") : q.correctAnswer}
        </p>
        <p className="m-0 mt-[var(--space-100)]">
          <span className="font-[var(--font-weight-medium)] text-text">解析：</span>
          {q.analysis}
        </p>
      </div>
    </div>
  )
}
