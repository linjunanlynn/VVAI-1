import * as React from "react"
import { Check, X, CalendarClock } from "lucide-react"
import { GenericCard } from "./GenericCard"
import type { EduLessonAttendingRole } from "./homeScenarioLayout"
import { cn } from "../ui/utils"
import {
  approveLessonRescheduleRequest,
  rejectLessonRescheduleRequest,
  submitLessonRescheduleRequest,
  teacherDirectReschedule,
  useLessonOperationSnapshot,
  getRoleSelfStudentName,
} from "./lessonOperationStore"
import { pushEduImEvent } from "./eduImBus"

export interface LessonRescheduleCardProps {
  role: EduLessonAttendingRole
  lessonId: string
  lessonTitle: string
}

const DEFAULT_TARGET = "2026-05-13 周三 19:00 - 20:00"

export function LessonRescheduleCard({ role, lessonId, lessonTitle }: LessonRescheduleCardProps) {
  const snapshot = useLessonOperationSnapshot(lessonId)
  const [target, setTarget] = React.useState(DEFAULT_TARGET)
  const [reason, setReason] = React.useState("")
  const [studentName, setStudentName] = React.useState(getRoleSelfStudentName(role))
  const [hint, setHint] = React.useState("")
  const pending = snapshot.rescheduleRequests.filter((r) => r.status === "pending")
  const selfRequests = snapshot.rescheduleRequests.filter(
    (r) => r.studentName === studentName && (role === "student" ? r.byRole === "student" : r.byRole === "parent"),
  )

  const submitByRequester = () => {
    const byRole = role === "parent" ? "parent" : "student"
    submitLessonRescheduleRequest({
      lessonId,
      byRole,
      studentName,
      toLabel: target.trim() || DEFAULT_TARGET,
      reason: reason.trim() || "时间冲突，申请调课",
    })
    pushEduImEvent({
      type: "series-reschedule-notify",
      targetRole: "teacher",
      fromName: byRole === "parent" ? "李爸爸" : studentName,
      toName: "王老师",
      conversationTitle: byRole === "parent" ? "李爸爸（李小明监护人）" : `${studentName}（学员）`,
      preview: `调课申请待审批：${lessonTitle} → ${target.trim() || DEFAULT_TARGET}`,
      studentName,
    })
    setHint("调课申请已提交，等待老师同意后生效。")
  }

  const submitByTeacher = () => {
    teacherDirectReschedule({
      lessonId,
      studentName,
      toLabel: target.trim() || DEFAULT_TARGET,
      reason: reason.trim() || "老师侧直接调课",
    })
    pushEduImEvent({
      type: "series-reschedule-notify",
      targetRole: "student",
      fromName: "王老师（物理）",
      toName: studentName,
      conversationTitle: "王老师（物理）",
      preview: `调课已生效：${lessonTitle} → ${target.trim() || DEFAULT_TARGET}`,
      studentName,
    })
    pushEduImEvent({
      type: "series-reschedule-notify",
      targetRole: "parent",
      fromName: "王老师（物理）",
      toName: "李爸爸（李小明监护人）",
      conversationTitle: "王老师（物理）",
      preview: `调课已生效：${lessonTitle} → ${target.trim() || DEFAULT_TARGET}`,
      studentName,
    })
    setHint("调课已直接生效，并已通知学生和家长。")
  }

  return (
    <GenericCard title={`调课 · ${lessonTitle}`}>
      <div className="rounded-[var(--radius-md)] border border-border bg-bg-tertiary px-[var(--space-250)] py-[var(--space-200)] text-[length:var(--font-size-sm)] text-text">
        {role === "teacher"
          ? `老师视角：直接调课即生效；若有学生/家长申请，会在这里看到待处理列表。`
          : `提交调课申请后需老师同意才会生效。`}
      </div>

      {role === "teacher" && pending.length > 0 ? (
        <div className="mt-[var(--space-250)] flex flex-col gap-[var(--space-150)] rounded-[var(--radius-md)] border border-[var(--color-warning)]/35 bg-[var(--color-warning)]/5 px-[var(--space-250)] py-[var(--space-200)]">
          <div className="text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)] text-text">
            待你处理 {pending.length} 条调课申请
          </div>
          {pending.map((req) => (
            <div
              key={req.id}
              className="flex flex-wrap items-center justify-between gap-[var(--space-150)] rounded-[var(--radius-sm)] border border-border bg-bg px-[var(--space-200)] py-[var(--space-150)]"
            >
              <div className="min-w-0 text-[length:var(--font-size-xs)] text-text-secondary">
                {req.studentName}（{req.byRole === "parent" ? "家长代申请" : "学生申请"}） · {req.toLabel}
              </div>
              <div className="flex items-center gap-[var(--space-100)]">
                <button
                  type="button"
                  className="rounded-full border border-[var(--color-success)]/40 px-[var(--space-200)] py-[var(--space-100)] text-[length:var(--font-size-xs)] text-[var(--color-success)]"
                  onClick={() => {
                    approveLessonRescheduleRequest(lessonId, req.id)
                    pushEduImEvent({
                      type: "series-reschedule-notify",
                      targetRole: "student",
                      fromName: "王老师（物理）",
                      toName: req.studentName,
                      conversationTitle: "王老师（物理）",
                      preview: `你的调课申请已同意：${lessonTitle} → ${req.toLabel}`,
                      studentName: req.studentName,
                    })
                    pushEduImEvent({
                      type: "series-reschedule-notify",
                      targetRole: "parent",
                      fromName: "王老师（物理）",
                      toName: "李爸爸（李小明监护人）",
                      conversationTitle: "王老师（物理）",
                      preview: `孩子调课申请已同意：${lessonTitle} → ${req.toLabel}`,
                      studentName: req.studentName,
                    })
                    setHint(`已同意 ${req.studentName} 的调课申请。`)
                  }}
                >
                  <span className="inline-flex items-center gap-1">
                    <Check className="h-3.5 w-3.5" /> 同意
                  </span>
                </button>
                <button
                  type="button"
                  className="rounded-full border border-border px-[var(--space-200)] py-[var(--space-100)] text-[length:var(--font-size-xs)] text-text-secondary"
                  onClick={() => {
                    rejectLessonRescheduleRequest(lessonId, req.id)
                    setHint(`已驳回 ${req.studentName} 的调课申请。`)
                  }}
                >
                  <span className="inline-flex items-center gap-1">
                    <X className="h-3.5 w-3.5" /> 驳回
                  </span>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-[var(--space-250)] flex flex-col gap-[var(--space-150)] rounded-[var(--radius-md)] border border-border bg-bg px-[var(--space-250)] py-[var(--space-250)]">
        {role === "teacher" ? (
          <label className="text-[length:var(--font-size-xs)] text-text-tertiary">
            调课学生
            <select
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-bg px-2 py-1 text-[length:var(--font-size-sm)] text-text"
            >
              {snapshot.attendees.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="text-[length:var(--font-size-xs)] text-text-tertiary">
          新时间
          <input
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-bg px-2 py-1 text-[length:var(--font-size-sm)] text-text"
            placeholder={DEFAULT_TARGET}
          />
        </label>
        <label className="text-[length:var(--font-size-xs)] text-text-tertiary">
          原因
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-bg px-2 py-1 text-[length:var(--font-size-sm)] text-text"
            placeholder="请输入调课原因"
          />
        </label>

        <button
          type="button"
          onClick={role === "teacher" ? submitByTeacher : submitByRequester}
          className={cn(
            "mt-[var(--space-100)] rounded-full px-[var(--space-300)] py-[var(--space-150)] text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)]",
            "bg-primary text-[var(--color-primary-foreground,white)]",
          )}
        >
          {role === "teacher" ? "调课并通知学生家长" : "提交调课申请"}
        </button>
      </div>

      {role !== "teacher" && selfRequests.length > 0 ? (
        <div className="mt-[var(--space-200)] flex flex-col gap-[var(--space-100)] rounded-[var(--radius-sm)] border border-border bg-bg px-[var(--space-200)] py-[var(--space-150)]">
          <div className="text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] text-text">
            我的调课申请状态
          </div>
          {selfRequests.slice(-3).reverse().map((req) => (
            <div key={req.id} className="text-[length:var(--font-size-xs)] text-text-secondary">
              {req.toLabel} · {req.status === "pending" ? "待老师处理" : req.status === "approved" ? "已同意" : "已驳回"}
            </div>
          ))}
        </div>
      ) : null}

      {hint ? (
        <div className="mt-[var(--space-200)] rounded-[var(--radius-sm)] border border-[var(--color-info)]/35 bg-[var(--color-info)]/5 px-[var(--space-200)] py-[var(--space-150)] text-[length:var(--font-size-xs)] text-text-secondary">
          <span className="inline-flex items-center gap-[var(--space-100)]">
            <CalendarClock className="h-3.5 w-3.5 text-[var(--color-info)]" />
            {hint}
          </span>
        </div>
      ) : null}
    </GenericCard>
  )
}

