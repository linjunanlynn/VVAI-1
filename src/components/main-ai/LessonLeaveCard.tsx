import * as React from "react"
import {
  ShieldCheck,
  ClipboardList,
  CalendarRange,
  Users,
  BookOpen,
  AlertCircle,
  Check,
  ChevronDown,
} from "lucide-react"
import { GenericCard } from "./GenericCard"
import type { EduLessonAttendingRole } from "./homeScenarioLayout"
import { cn } from "../ui/utils"
import {
  submitLessonLeave,
  useLessonOperationSnapshot,
  getRoleSelfStudentName,
  type LessonStudentAttendance,
} from "./lessonOperationStore"
import { pushEduImEvent } from "./eduImBus"
import { DEMO_LESSONS } from "./aiClassroomLessonsDemo"

export interface LessonLeaveCardProps {
  role: EduLessonAttendingRole
  lessonId: string
  lessonTitle: string
}

/* ============================================================
 * demo 课次池：把 DEMO_LESSONS 的"周X"映射到 ISO 日期，便于按日期范围筛选。
 * ============================================================ */
const WEEKDAY_TO_ISO_DATE: Record<string, string> = {
  周一: "2026-05-11",
  周二: "2026-05-12",
  周三: "2026-05-13",
  周四: "2026-05-14",
  周五: "2026-05-15",
  周六: "2026-05-16",
  周日: "2026-05-17",
}

interface LeaveLessonRow {
  id: string
  date: string
  weekdayLabel: string
  startTime: string
  endTime: string
  subject: string
  title: string
  className: string
}

function buildLeavePool(): LeaveLessonRow[] {
  return DEMO_LESSONS.flatMap<LeaveLessonRow>((l) => {
    const date = WEEKDAY_TO_ISO_DATE[l.weekdayLabel]
    if (!date) return []
    return [
      {
        id: l.id,
        date,
        weekdayLabel: l.weekdayLabel,
        startTime: l.startTime,
        endTime: l.endTime,
        subject: l.subject,
        title: l.title,
        className: l.className,
      },
    ]
  }).sort(
    (a, b) =>
      a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime),
  )
}

const LEAVE_POOL: LeaveLessonRow[] = buildLeavePool()

interface ParentChild {
  id: string
  name: string
  lessonIds: string[]
}

const PARENT_CHILDREN: ParentChild[] = [
  {
    id: "child-lin-xiaoan",
    name: "林小安",
    lessonIds: LEAVE_POOL.map((l) => l.id),
  },
  {
    id: "child-lin-xiaoyu",
    name: "林小雨",
    lessonIds: LEAVE_POOL.filter((_, i) => i % 2 === 0).map((l) => l.id),
  },
]

const TODAY_ISO = "2026-05-11"

/** datetime-local 默认值：今天 00:00 → 今天 23:59，全周可选 */
const TODAY_DATETIME_FROM = "2026-05-11T00:00"
const TODAY_DATETIME_TO = "2026-05-11T23:59"
const DATETIME_MIN = "2026-05-11T00:00"
const DATETIME_MAX = "2026-05-17T23:59"

/**
 * 按精确"日期时间段"筛选课程。
 * 课程时间段 [classStart, classEnd] 与请假 [from, to] 有交集即纳入：
 *   classStart <= to AND classEnd >= from
 * - 字符串比较有效（ISO datetime-local 同格式 / 同长度）
 * - 用于学生 / 家长视角的精确请假时间联动
 */
function filterPoolByDateTimeRange(from: string, to: string): LeaveLessonRow[] {
  if (!from || !to) return []
  if (from > to) return []
  return LEAVE_POOL.filter((l) => {
    const classStart = `${l.date}T${l.startTime}`
    const classEnd = `${l.date}T${l.endTime}`
    return classStart <= to && classEnd >= from
  })
}

function dayLabel(date: string): string {
  const row = LEAVE_POOL.find((l) => l.date === date)
  if (row) return `${date.slice(5)} ${row.weekdayLabel}`
  return date.slice(5)
}

/* ============================================================
 * 主入口
 * ============================================================ */
export function LessonLeaveCard({ role, lessonId, lessonTitle }: LessonLeaveCardProps) {
  const snapshot = useLessonOperationSnapshot(lessonId)
  if (role === "teacher") {
    return (
      <TeacherLeavePanel
        lessonId={lessonId}
        lessonTitle={lessonTitle}
        attendees={snapshot.attendees}
      />
    )
  }
  if (role === "parent") {
    return <ParentLeavePanel lessonTitle={lessonTitle} />
  }
  return <StudentLeavePanel lessonTitle={lessonTitle} selfName={getRoleSelfStudentName(role)} />
}

/* ============================================================
 * 公共原语
 * ============================================================ */
function SectionLabel({
  icon,
  children,
  hint,
}: {
  icon: React.ReactNode
  children: React.ReactNode
  hint?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-[var(--space-150)]">
      <div className="inline-flex items-center gap-[var(--space-100)] text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)] text-text">
        <span className="text-text-secondary">{icon}</span>
        {children}
      </div>
      {hint ? (
        <span className="text-[length:var(--font-size-xs)] text-text-tertiary">{hint}</span>
      ) : null}
    </div>
  )
}

/**
 * 通用多选下拉：节省垂直空间，closed 态显示摘要，open 态展开 checkbox 列表。
 * - outside click / Esc 自动收起
 * - 支持「一键全选 / 取消全选」
 */
function MultiSelectDropdown<T extends { id: string }>({
  items,
  selectedIds,
  onChange,
  formatItem,
  placeholder,
  summary,
  allowSelectAll,
}: {
  items: ReadonlyArray<T>
  selectedIds: string[]
  onChange: (ids: string[]) => void
  formatItem: (item: T) => { label: React.ReactNode; sub?: React.ReactNode }
  placeholder: string
  summary: string
  allowSelectAll?: boolean
}) {
  const [open, setOpen] = React.useState(false)
  const rootRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current) return
      if (!rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onDocClick)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDocClick)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  const toggle = (id: string) => {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id],
    )
  }
  const allSelected =
    items.length > 0 && items.every((i) => selectedIds.includes(i.id))
  const hasSelection = selectedIds.length > 0

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          "flex w-full items-center justify-between gap-[var(--space-150)] rounded-md border bg-bg px-[var(--space-200)] py-[var(--space-150)] text-left transition-colors",
          open ? "border-primary" : "border-border hover:border-border-strong",
        )}
      >
        <span
          className={cn(
            "truncate text-[length:var(--font-size-sm)]",
            hasSelection ? "text-text" : "text-text-tertiary",
          )}
        >
          {hasSelection ? summary : placeholder}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 flex-none text-text-tertiary transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open ? (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-md border border-border bg-bg shadow-md">
          {allowSelectAll ? (
            <div className="flex items-center justify-between border-b border-border bg-bg-tertiary px-[var(--space-200)] py-[var(--space-100)] text-[length:var(--font-size-xs)]">
              <span className="text-text-tertiary">
                已选 {selectedIds.length} / {items.length}
              </span>
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={() =>
                  onChange(allSelected ? [] : items.map((i) => i.id))
                }
              >
                {allSelected ? "取消全选" : "一键全选"}
              </button>
            </div>
          ) : null}
          <div className="max-h-[260px] overflow-y-auto py-[var(--space-100)]">
            {items.map((item) => {
              const fi = formatItem(item)
              const checked = selectedIds.includes(item.id)
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggle(item.id)}
                  className={cn(
                    "flex w-full items-start gap-[var(--space-150)] px-[var(--space-200)] py-[var(--space-150)] text-left transition-colors hover:bg-bg-tertiary",
                    checked && "bg-primary/5",
                  )}
                >
                  <span
                    className={cn(
                      "mt-[2px] grid h-4 w-4 flex-none place-items-center rounded-[4px] border",
                      checked
                        ? "border-primary bg-primary text-[var(--color-primary-foreground,white)]"
                        : "border-border",
                    )}
                  >
                    {checked ? <Check className="h-3 w-3" /> : null}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
                    <span className="text-[length:var(--font-size-sm)] text-text">
                      {fi.label}
                    </span>
                    {fi.sub ? (
                      <span className="text-[length:var(--font-size-xs)] text-text-tertiary">
                        {fi.sub}
                      </span>
                    ) : null}
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

function CheckboxItem({
  checked,
  onChange,
  label,
  sub,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  label: React.ReactNode
  sub?: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "flex w-full items-start gap-[var(--space-150)] rounded-[var(--radius-sm)] border px-[var(--space-200)] py-[var(--space-150)] text-left transition-colors",
        checked
          ? "border-primary/60 bg-primary/5"
          : "border-border bg-bg hover:border-border-strong",
      )}
    >
      <span
        className={cn(
          "mt-[2px] grid h-4 w-4 flex-none place-items-center rounded-[4px] border",
          checked ? "border-primary bg-primary text-[var(--color-primary-foreground,white)]" : "border-border",
        )}
      >
        {checked ? <Check className="h-3 w-3" /> : null}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
        <span className="text-[length:var(--font-size-sm)] text-text">{label}</span>
        {sub ? (
          <span className="text-[length:var(--font-size-xs)] text-text-tertiary">{sub}</span>
        ) : null}
      </span>
    </button>
  )
}

function DateTimeRangeRow({
  from,
  to,
  onFrom,
  onTo,
}: {
  from: string
  to: string
  onFrom: (v: string) => void
  onTo: (v: string) => void
}) {
  const invalid = !!from && !!to && from > to
  return (
    <div className="flex flex-col gap-[var(--space-100)]">
      <div className="flex flex-wrap items-center gap-[var(--space-150)]">
        <label className="flex items-center gap-[var(--space-100)] text-[length:var(--font-size-xs)] text-text-secondary">
          起始
          <input
            type="datetime-local"
            value={from}
            min={DATETIME_MIN}
            max={DATETIME_MAX}
            step={60}
            onChange={(e) => onFrom(e.target.value)}
            className="rounded-md border border-border bg-bg px-2 py-1 text-[length:var(--font-size-sm)] text-text"
          />
        </label>
        <span className="text-text-tertiary">→</span>
        <label className="flex items-center gap-[var(--space-100)] text-[length:var(--font-size-xs)] text-text-secondary">
          结束
          <input
            type="datetime-local"
            value={to}
            min={from || DATETIME_MIN}
            max={DATETIME_MAX}
            step={60}
            onChange={(e) => onTo(e.target.value)}
            className="rounded-md border border-border bg-bg px-2 py-1 text-[length:var(--font-size-sm)] text-text"
          />
        </label>
      </div>
      {invalid ? (
        <span className="inline-flex items-center gap-[var(--space-100)] text-[length:var(--font-size-xs)] text-[var(--color-danger,#d4423b)]">
          <AlertCircle className="h-3.5 w-3.5" />
          起始时间不能晚于结束时间
        </span>
      ) : null}
    </div>
  )
}

function HintLine({ tone = "success", children }: { tone?: "success" | "info"; children: React.ReactNode }) {
  const color = tone === "success" ? "var(--color-success)" : "var(--color-info,var(--color-primary))"
  return (
    <div
      className="rounded-[var(--radius-sm)] px-[var(--space-200)] py-[var(--space-150)] text-[length:var(--font-size-xs)] text-text-secondary"
      style={{ background: `color-mix(in srgb, ${color} 6%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 35%, transparent)` }}
    >
      <span className="inline-flex items-center gap-[var(--space-100)]">
        <ShieldCheck className="h-3.5 w-3.5" style={{ color }} />
        {children}
      </span>
    </div>
  )
}

/* ============================================================
 * 老师视角：发起代请假
 *
 * 操作流：先勾学员（多选）→ 再勾课次（多选）→ 填原因 → 提交
 * 提交后给每个 (学员 × 课次) 写一条 leave 记录并推送 IM 事件给家长。
 * ============================================================ */
function TeacherLeavePanel({
  lessonId,
  lessonTitle,
  attendees,
}: {
  lessonId: string
  lessonTitle: string
  attendees: LessonStudentAttendance[]
}) {
  const [selectedStudents, setSelectedStudents] = React.useState<string[]>([])
  const [selectedLessons, setSelectedLessons] = React.useState<string[]>([lessonId])
  const [reason, setReason] = React.useState("")
  const [hint, setHint] = React.useState("")

  const handleSubmit = () => {
    const finalReason = reason.trim() || "老师代登记请假"
    const targetStudents = attendees.filter((a) => selectedStudents.includes(a.id))
    /** 用 lessonItems（含当前课次）匹配，避免合成 outline lessonId 被漏掉 */
    const targetLessons = lessonItems.filter((l) => selectedLessons.includes(l.id))
    if (targetStudents.length === 0 || targetLessons.length === 0) {
      setHint("请至少勾选一位学员和一节课次。")
      return
    }
    targetLessons.forEach((lesson) => {
      targetStudents.forEach((stu) => {
        submitLessonLeave({
          lessonId: lesson.id,
          byRole: "teacher",
          studentName: stu.name,
          reason: finalReason,
        })
        pushEduImEvent({
          type: "teacher-leave-notice",
          targetRole: "parent",
          fromName: "王老师",
          toName: `${stu.name}监护人`,
          conversationTitle: `${stu.name}监护人`,
          preview: `老师已代登记请假：${lesson.weekdayLabel} ${lesson.startTime} ${lesson.title}，原因：${finalReason}`,
          studentName: stu.name,
        })
      })
    })
    setHint(
      `已为 ${targetStudents.length} 位学员登记 ${targetLessons.length} 节课的请假，并通知到家长。`,
    )
    setSelectedStudents([])
    setSelectedLessons([])
    setReason("")
  }

  /**
   * 课次列表：把"当前课次"作为第一项注入 dropdown，确保子 CUI 里合成的
   * outline lessonId（不在 LEAVE_POOL 里）也能：
   *  - 收起态：直接显示该课次名称
   *  - 展开态：列表第一项 + checkbox 默认勾选
   */
  const currentLessonRow = React.useMemo<LeaveLessonRow>(() => {
    const found = LEAVE_POOL.find((l) => l.id === lessonId)
    if (found) return found
    return {
      id: lessonId,
      date: TODAY_ISO,
      weekdayLabel: "本节",
      startTime: "",
      endTime: "",
      subject: "本节",
      title: lessonTitle,
      className: "当前课程",
    }
  }, [lessonId, lessonTitle])
  const lessonItems = React.useMemo<LeaveLessonRow[]>(() => {
    return [currentLessonRow, ...LEAVE_POOL.filter((l) => l.id !== lessonId)]
  }, [currentLessonRow, lessonId])

  /** dropdown 收起态摘要：多个时折叠成"前两个 等 N 位/节" */
  const studentSummary = (() => {
    if (selectedStudents.length === 0) return ""
    const names = attendees
      .filter((a) => selectedStudents.includes(a.id))
      .map((a) => a.name)
    if (names.length <= 2) return names.join("、")
    return `${names.slice(0, 2).join("、")} 等 ${names.length} 位`
  })()
  const lessonSummary = (() => {
    if (selectedLessons.length === 0) return ""
    if (selectedLessons.length === 1) {
      const only = lessonItems.find((l) => l.id === selectedLessons[0])
      if (only) {
        if (only.id === lessonId && only.weekdayLabel === "本节") {
          return `本节 · ${only.title}`
        }
        if (only.startTime) {
          return `${only.weekdayLabel} ${only.startTime} · ${only.title}`
        }
        return `${only.weekdayLabel} · ${only.title}`
      }
      return "已选 1 节"
    }
    return `已选 ${selectedLessons.length} 节`
  })()

  return (
    <GenericCard title={`请假 · ${lessonTitle}`}>
      <div className="mt-[var(--space-100)] flex flex-col gap-[var(--space-250)]">
        <div className="rounded-[var(--radius-md)] border border-border bg-bg-tertiary px-[var(--space-250)] py-[var(--space-200)] text-[length:var(--font-size-sm)] text-text">
          作为老师，你可以直接为学员登记请假，提交后立即通知家长。
        </div>

        <div className="flex flex-col gap-[var(--space-100)]">
          <SectionLabel icon={<Users className="h-4 w-4" />}>选择请假学员</SectionLabel>
          <MultiSelectDropdown
            items={attendees}
            selectedIds={selectedStudents}
            onChange={setSelectedStudents}
            placeholder="请选择请假学员（可多选）"
            summary={studentSummary}
            allowSelectAll
            formatItem={(s) => ({
              label: s.name,
              sub:
                s.status === "leave"
                  ? "已请假"
                  : s.status === "signed"
                    ? "已签到"
                    : "未签到",
            })}
          />
        </div>

        <div className="flex flex-col gap-[var(--space-100)]">
          <SectionLabel icon={<BookOpen className="h-4 w-4" />}>选择请假课次</SectionLabel>
          <MultiSelectDropdown
            items={lessonItems}
            selectedIds={selectedLessons}
            onChange={setSelectedLessons}
            placeholder="请选择请假课次"
            summary={lessonSummary}
            allowSelectAll
            formatItem={(l) => {
              if (l.id === lessonId) {
                return {
                  label: `本节 · ${l.title}`,
                  sub: l.startTime
                    ? `${l.weekdayLabel} ${l.startTime}-${l.endTime} · 当前课程`
                    : "当前课程",
                }
              }
              return {
                label: `${l.weekdayLabel} ${l.startTime}-${l.endTime} · ${l.subject} · ${l.title}`,
                sub: `${dayLabel(l.date)} · ${l.className}`,
              }
            }}
          />
          <span className="text-[length:var(--font-size-xs)] text-text-tertiary">
            默认已选当前课次，可展开下拉勾选本周其他课次。
          </span>
        </div>

        <label className="flex flex-col gap-[var(--space-100)] text-[length:var(--font-size-xs)] text-text-tertiary">
          请假原因
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="如：家长来电请假 / 学员身体不适"
            className="rounded-md border border-border bg-bg px-2 py-1 text-[length:var(--font-size-sm)] text-text"
          />
        </label>

        <button
          type="button"
          onClick={handleSubmit}
          className="self-end rounded-full bg-primary px-[var(--space-300)] py-[var(--space-150)] text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)] text-[var(--color-primary-foreground,white)] disabled:opacity-50"
          disabled={selectedStudents.length === 0 || selectedLessons.length === 0}
        >
          登记请假并通知家长
        </button>

        {hint ? <HintLine>{hint}</HintLine> : null}
      </div>
    </GenericCard>
  )
}

/* ============================================================
 * 学生视角：起止时间 → 涉及课程随之刷新
 * ============================================================ */
function StudentLeavePanel({ lessonTitle, selfName }: { lessonTitle: string; selfName: string }) {
  const [from, setFrom] = React.useState(TODAY_DATETIME_FROM)
  const [to, setTo] = React.useState(TODAY_DATETIME_TO)
  const [reason, setReason] = React.useState("")
  const [hint, setHint] = React.useState("")

  const affected = React.useMemo(() => filterPoolByDateTimeRange(from, to), [from, to])

  const handleSubmit = () => {
    if (affected.length === 0) {
      setHint("当前时间范围内没有课程，请调整时间。")
      return
    }
    const finalReason = reason.trim() || "临时有事，向老师请假"
    affected.forEach((l) => {
      submitLessonLeave({
        lessonId: l.id,
        byRole: "student",
        studentName: selfName,
        reason: finalReason,
      })
      pushEduImEvent({
        type: "student-leave-request",
        targetRole: "teacher",
        fromName: selfName,
        toName: "王老师",
        conversationTitle: `${selfName}（学员）`,
        preview: `${l.weekdayLabel} ${l.startTime} ${l.title} 已请假，原因：${finalReason}`,
        studentName: selfName,
      })
    })
    setHint(`已为 ${affected.length} 节课提交请假，立即生效并通知老师。`)
  }

  return (
    <GenericCard title={`请假 · ${lessonTitle}`}>
      <div className="mt-[var(--space-100)] flex flex-col gap-[var(--space-250)]">
        <div className="rounded-[var(--radius-md)] border border-border bg-bg-tertiary px-[var(--space-250)] py-[var(--space-200)] text-[length:var(--font-size-sm)] text-text">
          你正在为本人 <span className="text-text font-[var(--font-weight-medium)]">{selfName}</span> 发起请假，提交后立即生效。
        </div>

        <div className="flex flex-col gap-[var(--space-150)]">
          <SectionLabel icon={<CalendarRange className="h-4 w-4" />}>请假起止时间</SectionLabel>
          <DateTimeRangeRow from={from} to={to} onFrom={setFrom} onTo={setTo} />
          <span className="text-[length:var(--font-size-xs)] text-text-tertiary">
            精确到分钟；与请假时间段有交集的课程会自动列入下方清单。
          </span>
        </div>

        <div className="flex flex-col gap-[var(--space-100)]">
          <SectionLabel
            icon={<BookOpen className="h-4 w-4" />}
            hint={`涉及 ${affected.length} 节课`}
          >
            涉及课程（随时间范围联动）
          </SectionLabel>
          {affected.length === 0 ? (
            <div className="rounded-[var(--radius-sm)] border border-dashed border-border bg-bg px-[var(--space-200)] py-[var(--space-150)] text-[length:var(--font-size-xs)] text-text-tertiary">
              当前时间范围内没有课程。
            </div>
          ) : (
            <div className="flex flex-col gap-[var(--space-100)]">
              {affected.map((l) => (
                <div
                  key={l.id}
                  className="rounded-[var(--radius-sm)] border border-border bg-bg px-[var(--space-200)] py-[var(--space-150)]"
                >
                  <div className="text-[length:var(--font-size-sm)] text-text">
                    {l.weekdayLabel} {l.startTime}-{l.endTime} · {l.subject} · {l.title}
                  </div>
                  <div className="mt-1 text-[length:var(--font-size-xs)] text-text-tertiary">
                    {dayLabel(l.date)} · {l.className}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <label className="flex flex-col gap-[var(--space-100)] text-[length:var(--font-size-xs)] text-text-tertiary">
          请假原因
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="请输入请假原因"
            className="rounded-md border border-border bg-bg px-2 py-1 text-[length:var(--font-size-sm)] text-text"
          />
        </label>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={affected.length === 0}
          className="self-end rounded-full bg-primary px-[var(--space-300)] py-[var(--space-150)] text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)] text-[var(--color-primary-foreground,white)] disabled:opacity-50"
        >
          提交请假并通知老师
        </button>

        {hint ? <HintLine>{hint}</HintLine> : null}

        <div className="text-[length:var(--font-size-xs)] text-text-tertiary">
          <span className="inline-flex items-center gap-[var(--space-100)]">
            <ClipboardList className="h-3.5 w-3.5" />
            请假无需审批；若需改时间请使用「调课」提交申请。
          </span>
        </div>
      </div>
    </GenericCard>
  )
}

/* ============================================================
 * 家长视角：选孩子（多选） + 起止时间 + 涉及课程
 * ============================================================ */
function ParentLeavePanel({ lessonTitle }: { lessonTitle: string }) {
  const [childIds, setChildIds] = React.useState<string[]>([PARENT_CHILDREN[0].id])
  const [from, setFrom] = React.useState(TODAY_DATETIME_FROM)
  const [to, setTo] = React.useState(TODAY_DATETIME_TO)
  const [reason, setReason] = React.useState("")
  const [hint, setHint] = React.useState("")

  const toggleChild = (id: string) => {
    setChildIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const rangeRows = React.useMemo(() => filterPoolByDateTimeRange(from, to), [from, to])
  const childGroups = React.useMemo(() => {
    return PARENT_CHILDREN.filter((c) => childIds.includes(c.id)).map((c) => ({
      child: c,
      lessons: rangeRows.filter((r) => c.lessonIds.includes(r.id)),
    }))
  }, [rangeRows, childIds])

  const totalLessons = childGroups.reduce((sum, g) => sum + g.lessons.length, 0)

  const handleSubmit = () => {
    if (childGroups.length === 0 || totalLessons === 0) {
      setHint("请至少选择一位孩子，并确保时间范围内有课程。")
      return
    }
    const finalReason = reason.trim() || "家长代孩子请假"
    childGroups.forEach((g) => {
      g.lessons.forEach((l) => {
        submitLessonLeave({
          lessonId: l.id,
          byRole: "parent",
          studentName: g.child.name,
          reason: finalReason,
        })
        pushEduImEvent({
          type: "parent-leave-request",
          targetRole: "teacher",
          fromName: `${g.child.name}家长`,
          toName: "王老师",
          conversationTitle: `${g.child.name}家长`,
          preview: `${l.weekdayLabel} ${l.startTime} ${l.title} 已请假，原因：${finalReason}`,
          studentName: g.child.name,
        })
      })
    })
    setHint(
      `已为 ${childGroups.length} 位孩子提交 ${totalLessons} 节课的请假，立即生效并通知老师。`,
    )
  }

  return (
    <GenericCard title={`请假 · ${lessonTitle}`}>
      <div className="mt-[var(--space-100)] flex flex-col gap-[var(--space-250)]">
        <div className="rounded-[var(--radius-md)] border border-border bg-bg-tertiary px-[var(--space-250)] py-[var(--space-200)] text-[length:var(--font-size-sm)] text-text">
          你正在为孩子发起请假，提交后立即生效。
        </div>

        <div className="flex flex-col gap-[var(--space-150)]">
          <SectionLabel icon={<Users className="h-4 w-4" />}>选择请假孩子（可多选）</SectionLabel>
          <div className="grid grid-cols-2 gap-[var(--space-100)]">
            {PARENT_CHILDREN.map((c) => (
              <CheckboxItem
                key={c.id}
                checked={childIds.includes(c.id)}
                onChange={() => toggleChild(c.id)}
                label={c.name}
                sub={`本周共 ${c.lessonIds.length} 节课`}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-[var(--space-150)]">
          <SectionLabel icon={<CalendarRange className="h-4 w-4" />}>请假起止时间</SectionLabel>
          <DateTimeRangeRow from={from} to={to} onFrom={setFrom} onTo={setTo} />
          <span className="text-[length:var(--font-size-xs)] text-text-tertiary">
            精确到分钟；与请假时间段有交集的课程会自动列入下方清单。
          </span>
        </div>

        <div className="flex flex-col gap-[var(--space-150)]">
          <SectionLabel
            icon={<BookOpen className="h-4 w-4" />}
            hint={`涉及 ${totalLessons} 节课`}
          >
            涉及课程（随孩子 / 时间联动）
          </SectionLabel>
          {childGroups.length === 0 ? (
            <div className="rounded-[var(--radius-sm)] border border-dashed border-border bg-bg px-[var(--space-200)] py-[var(--space-150)] text-[length:var(--font-size-xs)] text-text-tertiary">
              请先选择至少一位孩子。
            </div>
          ) : (
            <div className="flex flex-col gap-[var(--space-150)]">
              {childGroups.map((g) => (
                <div key={g.child.id} className="flex flex-col gap-[var(--space-100)]">
                  <div className="text-[length:var(--font-size-xs)] text-text-secondary">
                    {g.child.name} · 共 {g.lessons.length} 节
                  </div>
                  {g.lessons.length === 0 ? (
                    <div className="rounded-[var(--radius-sm)] border border-dashed border-border bg-bg px-[var(--space-200)] py-[var(--space-150)] text-[length:var(--font-size-xs)] text-text-tertiary">
                      {g.child.name} 在该时间范围内无课程。
                    </div>
                  ) : (
                    g.lessons.map((l) => (
                      <div
                        key={l.id}
                        className="rounded-[var(--radius-sm)] border border-border bg-bg px-[var(--space-200)] py-[var(--space-150)]"
                      >
                        <div className="text-[length:var(--font-size-sm)] text-text">
                          {l.weekdayLabel} {l.startTime}-{l.endTime} · {l.subject} · {l.title}
                        </div>
                        <div className="mt-1 text-[length:var(--font-size-xs)] text-text-tertiary">
                          {dayLabel(l.date)} · {l.className}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <label className="flex flex-col gap-[var(--space-100)] text-[length:var(--font-size-xs)] text-text-tertiary">
          请假原因
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="请输入请假原因"
            className="rounded-md border border-border bg-bg px-2 py-1 text-[length:var(--font-size-sm)] text-text"
          />
        </label>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={totalLessons === 0}
          className="self-end rounded-full bg-primary px-[var(--space-300)] py-[var(--space-150)] text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)] text-[var(--color-primary-foreground,white)] disabled:opacity-50"
        >
          代孩子请假并通知老师
        </button>

        {hint ? <HintLine>{hint}</HintLine> : null}

        <div className="text-[length:var(--font-size-xs)] text-text-tertiary">
          <span className="inline-flex items-center gap-[var(--space-100)]">
            <ClipboardList className="h-3.5 w-3.5" />
            家长请假无需老师审批；若需改时间请使用「调课」提交申请。
          </span>
        </div>
      </div>
    </GenericCard>
  )
}
