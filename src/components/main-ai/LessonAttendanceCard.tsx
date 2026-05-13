import * as React from "react"
import { CheckCircle2, Circle, CalendarOff, Users, RotateCcw, Sparkles } from "lucide-react"
import { GenericCard } from "./GenericCard"
import { cn } from "../ui/utils"
import type { EduLessonAttendingRole } from "./homeScenarioLayout"
import {
  markAllStudentsSigned,
  markAllStudentsUnsigned,
  markStudentSigned,
  markStudentUnsigned,
  useLessonOperationSnapshot,
  getRoleSelfStudentName,
  type LessonStudentAttendance,
} from "./lessonOperationStore"

export interface LessonAttendanceCardProps {
  role: EduLessonAttendingRole
  lessonId: string
  lessonTitle: string
}

export function LessonAttendanceCard({ role, lessonId, lessonTitle }: LessonAttendanceCardProps) {
  if (role === "teacher") {
    return <TeacherAttendancePanel lessonId={lessonId} lessonTitle={lessonTitle} />
  }
  if (role === "student") {
    return <StudentAttendancePanel lessonId={lessonId} lessonTitle={lessonTitle} />
  }
  return <ParentAttendancePanel lessonId={lessonId} lessonTitle={lessonTitle} />
}

/* ============================================================
 * 教师视角：紧凑名单 + 一键签到 / 全部撤销 + 单点切换
 * ============================================================ */
function TeacherAttendancePanel({ lessonId, lessonTitle }: { lessonId: string; lessonTitle: string }) {
  const snapshot = useLessonOperationSnapshot(lessonId)

  const signedCount = snapshot.attendees.filter((s) => s.status === "signed").length
  const leaveCount = snapshot.attendees.filter((s) => s.status === "leave").length
  const total = snapshot.attendees.length
  const allSigned = signedCount + leaveCount >= total
  const anySigned = signedCount > 0

  const toggle = (s: LessonStudentAttendance) => {
    if (s.status === "leave") return
    if (s.status === "signed") {
      markStudentUnsigned(lessonId, s.id)
    } else {
      markStudentSigned(lessonId, s.id)
    }
  }

  return (
    <GenericCard title={`签到 · ${lessonTitle}`}>
      <div className="mt-[var(--space-100)] flex flex-col gap-[var(--space-200)]">
        <div className="flex flex-wrap items-center justify-between gap-[var(--space-150)] rounded-[var(--radius-md)] border border-border bg-bg-tertiary px-[var(--space-250)] py-[var(--space-150)]">
          <div className="flex items-center gap-[var(--space-200)] text-[length:var(--font-size-sm)] text-text">
            <span className="inline-flex items-center gap-[var(--space-100)]">
              <Users className="h-4 w-4 text-text-secondary" />
              应到 <strong className="text-text">{total}</strong>
            </span>
            <span className="inline-flex items-center gap-[var(--space-100)] text-[var(--color-success)]">
              <CheckCircle2 className="h-4 w-4" />
              已到 {signedCount}
            </span>
            <span className="inline-flex items-center gap-[var(--space-100)] text-text-tertiary">
              <CalendarOff className="h-4 w-4" />
              请假 {leaveCount}
            </span>
          </div>
          <div className="flex items-center gap-[var(--space-100)]">
            <button
              type="button"
              onClick={() => markAllStudentsSigned(lessonId)}
              disabled={allSigned}
              className={cn(
                "inline-flex items-center gap-[var(--space-100)] rounded-full px-[var(--space-250)] py-[var(--space-100)] text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] transition-colors",
                allSigned
                  ? "bg-[var(--black-alpha-11)] text-text-tertiary"
                  : "bg-primary text-[var(--color-primary-foreground,white)] hover:opacity-90",
              )}
            >
              <Sparkles className="h-3.5 w-3.5" />
              一键签到
            </button>
            <button
              type="button"
              onClick={() => markAllStudentsUnsigned(lessonId)}
              disabled={!anySigned}
              className={cn(
                "inline-flex items-center gap-[var(--space-100)] rounded-full border px-[var(--space-250)] py-[var(--space-100)] text-[length:var(--font-size-xs)] transition-colors",
                anySigned
                  ? "border-border bg-bg text-text hover:border-border-strong"
                  : "border-border bg-bg-tertiary text-text-tertiary",
              )}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              全部撤销
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-[var(--space-150)] sm:grid-cols-3">
          {snapshot.attendees.map((s) => (
            <AttendeeCell key={s.id} attendee={s} onClick={() => toggle(s)} />
          ))}
        </div>

        <div className="text-[length:var(--font-size-xs)] text-text-tertiary">
          点击学员即可在「未签到 / 已签到」之间切换；请假学员不参与签到。
        </div>
      </div>
    </GenericCard>
  )
}

function AttendeeCell({
  attendee,
  onClick,
}: {
  attendee: LessonStudentAttendance
  onClick: () => void
}) {
  const isSigned = attendee.status === "signed"
  const isLeave = attendee.status === "leave"
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isLeave}
      className={cn(
        "relative flex items-center gap-[var(--space-150)] rounded-[var(--radius-md)] border px-[var(--space-200)] py-[var(--space-150)] text-left transition-colors",
        isSigned
          ? "border-[color-mix(in_srgb,var(--color-success)_45%,transparent)] bg-[color-mix(in_srgb,var(--color-success)_8%,transparent)]"
          : isLeave
            ? "cursor-not-allowed border-border bg-bg-tertiary"
            : "border-border bg-bg hover:border-border-strong",
      )}
      title={isLeave ? "已请假" : isSigned ? "点击撤销" : "点击签到"}
    >
      <span
        className={cn(
          "grid h-7 w-7 flex-none place-items-center rounded-full text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)]",
          isSigned
            ? "bg-[color-mix(in_srgb,var(--color-success)_18%,transparent)] text-[var(--color-success)]"
            : isLeave
              ? "bg-bg text-text-tertiary"
              : "bg-bg-tertiary text-text-secondary",
        )}
      >
        {attendee.name.slice(0, 1)}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span
          className={cn(
            "truncate text-[length:var(--font-size-sm)]",
            isLeave ? "text-text-tertiary" : "text-text",
          )}
        >
          {attendee.name}
        </span>
        <span className="text-[length:var(--font-size-xs)] text-text-tertiary">
          {isSigned ? "已签到" : isLeave ? "请假" : "未签到"}
        </span>
      </span>
      {isSigned ? (
        <CheckCircle2 className="h-4 w-4 flex-none text-[var(--color-success)]" />
      ) : isLeave ? (
        <CalendarOff className="h-4 w-4 flex-none text-text-tertiary" />
      ) : (
        <Circle className="h-4 w-4 flex-none text-text-tertiary" />
      )}
    </button>
  )
}

/* ============================================================
 * 学生视角：去掉统计条，直接展示个人签到态
 * ============================================================ */
function StudentAttendancePanel({ lessonId, lessonTitle }: { lessonId: string; lessonTitle: string }) {
  const snapshot = useLessonOperationSnapshot(lessonId)
  const [hint, setHint] = React.useState<string>("")
  const selfName = getRoleSelfStudentName("student")
  const self = snapshot.attendees.find((s) => s.name === selfName) ?? snapshot.attendees[0]
  if (!self) return null

  return (
    <GenericCard title={`签到 · ${lessonTitle}`}>
      <div className="mt-[var(--space-100)] flex flex-col gap-[var(--space-200)] rounded-[var(--radius-md)] border border-border bg-bg px-[var(--space-250)] py-[var(--space-250)]">
        <div className="flex items-center gap-[var(--space-150)]">
          <Users className="h-4 w-4 text-[var(--color-info)]" />
          <span className="text-[length:var(--font-size-sm)] text-text">我：{self.name}</span>
          <span className="text-[length:var(--font-size-xs)] text-text-tertiary">
            当前状态：
            {self.status === "signed" ? "已签到" : self.status === "leave" ? "请假" : "未签到"}
          </span>
        </div>
        <button
          type="button"
          disabled={self.status !== "unsigned"}
          onClick={() => {
            markStudentSigned(lessonId, self.id)
            setHint("签到成功，已同步到老师与家长视图。")
          }}
          className={cn(
            "rounded-full px-[var(--space-300)] py-[var(--space-150)] text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)]",
            self.status === "unsigned"
              ? "bg-primary text-[var(--color-primary-foreground,white)]"
              : "bg-[var(--black-alpha-11)] text-text-tertiary",
          )}
        >
          {self.status === "unsigned" ? "我要签到" : self.status === "signed" ? "已完成签到" : "已请假"}
        </button>
      </div>

      {hint ? (
        <div className="mt-[var(--space-200)] rounded-[var(--radius-sm)] border border-[var(--color-success)]/35 bg-[var(--color-success)]/5 px-[var(--space-200)] py-[var(--space-150)] text-[length:var(--font-size-xs)] text-text-secondary">
          {hint}
        </div>
      ) : null}
    </GenericCard>
  )
}

/* ============================================================
 * 家长视角：去掉统计条，展示孩子签到态 + 提醒
 * ============================================================ */
function ParentAttendancePanel({ lessonId, lessonTitle }: { lessonId: string; lessonTitle: string }) {
  const snapshot = useLessonOperationSnapshot(lessonId)
  const [hint, setHint] = React.useState<string>("")
  const [reminded, setReminded] = React.useState(false)
  const childName = getRoleSelfStudentName("parent")
  const child = snapshot.attendees.find((s) => s.name === childName) ?? snapshot.attendees[0]

  return (
    <GenericCard title={`签到 · ${lessonTitle}`}>
      <div className="mt-[var(--space-100)] flex flex-col gap-[var(--space-150)] rounded-[var(--radius-md)] border border-border bg-bg px-[var(--space-250)] py-[var(--space-250)]">
        <div className="text-[length:var(--font-size-sm)] text-text">
          孩子：{child?.name ?? "林小安"} · 当前状态：
          {child?.status === "signed" ? "已签到" : child?.status === "leave" ? "请假" : "未签到"}
        </div>
        <div className="text-[length:var(--font-size-xs)] text-text-tertiary">
          家长视角可查看状态并提醒孩子签到，老师端会实时看到变化。
        </div>
        <button
          type="button"
          disabled={reminded || child?.status === "signed"}
          onClick={() => {
            setReminded(true)
            setHint("已发送提醒：请尽快签到，老师端和学生端已收到提醒提示。")
          }}
          className={cn(
            "self-start rounded-full px-[var(--space-250)] py-[var(--space-100)] text-[length:var(--font-size-xs)]",
            reminded || child?.status === "signed"
              ? "bg-[var(--black-alpha-11)] text-text-tertiary"
              : "border border-[var(--color-info)]/40 text-[var(--color-info)]",
          )}
        >
          {child?.status === "signed" ? "孩子已签到" : reminded ? "已提醒孩子签到" : "提醒孩子签到"}
        </button>
      </div>

      {hint ? (
        <div className="mt-[var(--space-200)] rounded-[var(--radius-sm)] border border-[var(--color-success)]/35 bg-[var(--color-success)]/5 px-[var(--space-200)] py-[var(--space-150)] text-[length:var(--font-size-xs)] text-text-secondary">
          {hint}
        </div>
      ) : null}
    </GenericCard>
  )
}
