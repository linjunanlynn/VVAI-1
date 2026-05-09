/**
 * AI 课堂「随堂练习题」中央 Overlay。
 *
 * - 在 `AiClassroomLiveSlideStage` 中央内容区上方覆盖一层抽屉式面板，
 *   `quiz.status !== "idle"` 时显示，`idle` 时不渲染（让位给课件）；
 * - 三阶段一组件：live / grading / closed；
 * - 角色差异化：
 *     - 老师：实时聚合（提交进度 / 选项分布 / 提交学生 list / 卡点）
 *     - 学生：作答 → 等待批改 → 个性化反馈
 *     - 家长：观察老师视图（demo 一期；产品要求只老师/学生进 AI 课堂，家长理论上不进入）
 */

import * as React from "react"
import {
  CheckCircle2,
  Clock,
  Sparkles,
  X,
  XCircle,
} from "lucide-react"
import { cn } from "../ui/utils"
import {
  type AiClassroomQuizSnapshot,
  finalizeGrading,
  resetQuiz,
  startGrading,
  submitAnswer,
} from "./aiClassroomQuizBus"
import {
  DEMO_LIVE_STUDENTS,
  type AiClassroomLiveStudentDemo,
} from "./aiClassroomLiveDemo"
import type { EduLessonAttendingRole } from "./homeScenarioLayout"

export interface AiClassroomQuizOverlayProps {
  role: EduLessonAttendingRole
  lessonId: string
  snapshot: AiClassroomQuizSnapshot
}

export function AiClassroomQuizOverlay({
  role,
  lessonId,
  snapshot,
}: AiClassroomQuizOverlayProps) {
  if (snapshot.status === "idle" || !snapshot.question) return null

  return (
    <div className="absolute inset-3 z-20 flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-border bg-bg shadow-[0_18px_36px_rgba(15,23,42,0.18)]">
      <OverlayHeader role={role} snapshot={snapshot} lessonId={lessonId} />
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {role === "teacher" ? (
          <TeacherView snapshot={snapshot} />
        ) : (
          <StudentView role={role} snapshot={snapshot} lessonId={lessonId} />
        )}
      </div>
    </div>
  )
}

/* ============================================================
 * Header（题号 + 倒计时 + 状态徽章 + 老师专属"结束本题" + 关闭）
 * ============================================================ */

function OverlayHeader({
  role,
  snapshot,
  lessonId,
}: {
  role: EduLessonAttendingRole
  snapshot: AiClassroomQuizSnapshot
  lessonId: string
}) {
  const remainSec = useCountdown(
    snapshot.status === "live" ? snapshot.deadlineAt : null,
  )

  /** 倒计时归零自动进入 grading（任何窗口都可触发；snapshot 写入幂等） */
  React.useEffect(() => {
    if (snapshot.status !== "live") return
    if (snapshot.deadlineAt == null) return
    if (remainSec > 0) return
    startGrading(lessonId)
  }, [snapshot.status, snapshot.deadlineAt, remainSec, lessonId])

  /** grading 阶段：1.2s 后 finalize（避免多窗口重复触发：所有窗口都会调用 finalizeGrading；
   *  finalizeGrading 内部 status 不为 grading 即跳过，幂等安全） */
  React.useEffect(() => {
    if (snapshot.status !== "grading") return
    const t = window.setTimeout(() => {
      finalizeGrading(lessonId)
    }, 1200)
    return () => window.clearTimeout(t)
  }, [snapshot.status, lessonId])

  const statusBadge =
    snapshot.status === "live"
      ? { label: "进行中", tone: "primary" as const }
      : snapshot.status === "grading"
        ? { label: "AI 批改中", tone: "warning" as const }
        : { label: "已结束", tone: "success" as const }

  return (
    <header className="flex shrink-0 items-center gap-3 border-b border-border bg-bg-subtle/40 px-5 py-3">
      <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
        <Sparkles className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="m-0 truncate text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-text">
          随堂练习 · 第 {snapshot.questionSeq} 题
        </h3>
        <p className="m-0 mt-0.5 truncate text-[length:var(--font-size-xs)] text-text-tertiary">
          {snapshot.question?.knowledgeTag ?? "本节知识点"} · 共 {snapshot.totalStudents} 人
        </p>
      </div>
      {snapshot.status === "live" ? (
        <span
          className={cn(
            "inline-flex h-7 items-center gap-1 rounded-full px-3 text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] tabular-nums",
            remainSec <= 10
              ? "bg-[var(--color-warning)]/12 text-[var(--color-warning)]"
              : "bg-[var(--color-primary)]/10 text-[var(--color-primary)]",
          )}
        >
          <Clock className="h-3.5 w-3.5" />
          {remainSec}s
        </span>
      ) : null}
      <span
        className={cn(
          "inline-flex h-7 items-center gap-1 rounded-full px-3 text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)]",
          statusBadge.tone === "primary"
            ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
            : statusBadge.tone === "warning"
              ? "bg-[var(--color-warning)]/12 text-[var(--color-warning)]"
              : "bg-[var(--color-success)]/12 text-[var(--color-success)]",
        )}
      >
        {statusBadge.label}
      </span>
      {role === "teacher" && snapshot.status === "live" ? (
        <button
          type="button"
          onClick={() => startGrading(lessonId)}
          className="inline-flex h-8 items-center rounded-full border border-[var(--color-warning)]/45 bg-[var(--color-warning)]/10 px-3 text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] text-[var(--color-warning)] transition-colors hover:bg-[var(--color-warning)]/16"
        >
          提前结束
        </button>
      ) : null}
      {role === "teacher" && snapshot.status === "closed" ? (
        <button
          type="button"
          onClick={() => resetQuiz(lessonId)}
          className="inline-flex h-8 items-center rounded-full border border-[var(--color-primary)]/55 bg-[var(--color-primary)] px-3 text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] text-[var(--color-primary-foreground,white)] transition-colors hover:bg-primary-hover"
        >
          关闭题目
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => {
          /** 老师：close 按钮已显式提供；这里 ✕ 仅老师用作"快速关闭"；学生不允许提前关闭题目（不破坏作答） */
          if (role !== "teacher") return
          if (snapshot.status === "live") startGrading(lessonId)
          else resetQuiz(lessonId)
        }}
        aria-label="关闭随堂题"
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-[var(--black-alpha-11)] hover:text-text",
          role !== "teacher" && "invisible",
        )}
      >
        <X className="h-4 w-4" />
      </button>
    </header>
  )
}

/* ============================================================
 * 老师视图：实时聚合
 * ============================================================ */

function TeacherView({ snapshot }: { snapshot: AiClassroomQuizSnapshot }) {
  const q = snapshot.question!
  const total = snapshot.totalStudents
  const submitted = snapshot.submissions.length
  const optionCounts = q.options.map(
    (_, i) => snapshot.submissions.filter((s) => s.pickedIndex === i).length,
  )
  const correctCount =
    snapshot.status === "closed"
      ? snapshot.submissions.filter((s) => s.isCorrect).length
      : snapshot.submissions.filter((s) => s.pickedIndex === q.correctIndex).length
  const accuracy = submitted === 0 ? 0 : Math.round((correctCount / submitted) * 100)
  const notSubmittedStudents = DEMO_LIVE_STUDENTS.filter(
    (s) => s.online && !snapshot.submissions.some((sub) => sub.studentId === s.id),
  )
  const wrongStudents = snapshot.submissions.filter(
    (s) => s.pickedIndex !== q.correctIndex,
  )

  return (
    <div className="flex flex-col gap-4">
      <QuestionStem stem={q.stem} />

      {/* 提交进度 + 正确率 */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="已答" value={`${submitted} / ${total}`} accent="primary" />
        <StatCard
          label={snapshot.status === "closed" ? "正确率" : "暂答正确率"}
          value={`${accuracy}%`}
          accent={accuracy >= 80 ? "success" : accuracy >= 50 ? "warning" : "danger"}
        />
        <StatCard
          label="未提交"
          value={`${notSubmittedStudents.length} 人`}
          accent="neutral"
        />
      </div>

      {/* 选项分布 */}
      <section className="rounded-[var(--radius-md)] border border-border bg-bg-subtle/30 p-4">
        <h4 className="m-0 mb-2 text-[length:var(--font-size-xs)] font-[var(--font-weight-semibold)] text-text-secondary">
          选项分布
        </h4>
        <div className="flex flex-col gap-2">
          {q.options.map((opt, i) => {
            const count = optionCounts[i]
            const pct = submitted === 0 ? 0 : Math.round((count / submitted) * 100)
            const isCorrect = i === q.correctIndex
            return (
              <div key={i} className="flex items-center gap-2">
                <span
                  className={cn(
                    "inline-flex size-6 shrink-0 items-center justify-center rounded-full text-[length:var(--font-size-xs)] font-[var(--font-weight-semibold)]",
                    isCorrect && snapshot.status === "closed"
                      ? "bg-[var(--color-success)]/14 text-[var(--color-success)]"
                      : "bg-bg-subtle text-text-secondary",
                  )}
                >
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="min-w-0 flex-1 truncate text-[length:var(--font-size-sm)] text-text">
                  {opt}
                </span>
                <span className="w-14 text-right tabular-nums text-[length:var(--font-size-xs)] text-text-secondary">
                  {count} 人 · {pct}%
                </span>
                <div className="h-2 w-32 overflow-hidden rounded-full bg-bg-subtle">
                  <div
                    className={cn(
                      "h-full rounded-full transition-[width] duration-500",
                      isCorrect && snapshot.status === "closed"
                        ? "bg-[var(--color-success)]"
                        : "bg-[var(--color-primary)]/55",
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* 已提交学生 list */}
      {submitted > 0 ? (
        <section className="rounded-[var(--radius-md)] border border-border p-4">
          <h4 className="m-0 mb-2 text-[length:var(--font-size-xs)] font-[var(--font-weight-semibold)] text-text-secondary">
            已提交 · {submitted} 人
          </h4>
          <ul className="m-0 grid list-none grid-cols-2 gap-1.5 p-0">
            {snapshot.submissions
              .slice()
              .sort((a, b) => a.elapsedMs - b.elapsedMs)
              .map((s) => {
                const correct =
                  snapshot.status === "closed"
                    ? s.isCorrect === true
                    : s.pickedIndex === q.correctIndex
                return (
                  <li
                    key={s.studentId}
                    className="flex items-center gap-1.5 rounded-md border border-border bg-bg px-2 py-1 text-[length:var(--font-size-xs)] text-text"
                  >
                    {correct ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-[var(--color-success)]" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-[var(--color-warning)]" />
                    )}
                    <span className="flex-1 truncate">{s.studentName}</span>
                    <span className="shrink-0 tabular-nums text-text-tertiary">
                      {String.fromCharCode(65 + s.pickedIndex)} ·{" "}
                      {Math.round(s.elapsedMs / 1000)}s
                    </span>
                  </li>
                )
              })}
          </ul>
        </section>
      ) : null}

      {/* 卡点学生（仅 closed 阶段） */}
      {snapshot.status === "closed" && wrongStudents.length > 0 ? (
        <section className="rounded-[var(--radius-md)] border border-[var(--color-warning)]/45 bg-[var(--color-warning)]/8 p-4">
          <h4 className="m-0 mb-1 text-[length:var(--font-size-xs)] font-[var(--font-weight-semibold)] text-[var(--color-warning)]">
            ⚠ 本题需关注 · {wrongStudents.length} 人
          </h4>
          <p className="m-0 text-[length:var(--font-size-xs)] text-text">
            主要卡点：
            {Object.entries(groupBy(wrongStudents, (s) => s.pickedIndex))
              .map(
                ([idx, list]) =>
                  `选 ${String.fromCharCode(65 + Number(idx))}（${list.length} 人）— ${q.pitfalls?.[Number(idx)] ?? "原因待定"}`,
              )
              .join("；")}
          </p>
          <ul className="m-0 mt-2 flex list-none flex-wrap gap-1.5 p-0">
            {wrongStudents.map((s) => (
              <li
                key={s.studentId}
                className="rounded-full bg-[var(--color-warning)]/15 px-2 py-0.5 text-[length:var(--font-size-xs)] text-[var(--color-warning)]"
              >
                {s.studentName}
              </li>
            ))}
          </ul>
          <p className="m-0 mt-2 text-[length:var(--font-size-xs)] text-text-tertiary">
            建议：① 把卡点学生加入今晚私聊提醒；② 在课件第 {q.reviewSlideIndex ?? "—"} 页再讲 1 次；③ 推同类型变式题。
          </p>
        </section>
      ) : null}

      {snapshot.status === "grading" ? <GradingHint /> : null}

      {/* 未提交学生（live 阶段） */}
      {snapshot.status === "live" && notSubmittedStudents.length > 0 ? (
        <section className="rounded-[var(--radius-md)] border border-dashed border-border p-3">
          <p className="m-0 text-[length:var(--font-size-xs)] text-text-tertiary">
            未提交：
            {notSubmittedStudents.map((s) => s.name).join("、")}
          </p>
        </section>
      ) : null}
    </div>
  )
}

/* ============================================================
 * 学生视图：作答 → 等待批改 → 反馈
 * ============================================================ */

function StudentView({
  role,
  snapshot,
  lessonId,
}: {
  role: EduLessonAttendingRole
  snapshot: AiClassroomQuizSnapshot
  lessonId: string
}) {
  const q = snapshot.question!
  /** 本人在 demo 学生表里的身份 */
  const selfStudent = pickSelfStudent(role)
  const mySubmission = selfStudent
    ? snapshot.submissions.find((s) => s.studentId === selfStudent.id) ?? null
    : null

  const [picked, setPicked] = React.useState<number | null>(null)
  /** 切到新题（questionSeq 改变）时清掉上次选择 */
  React.useEffect(() => {
    setPicked(null)
  }, [snapshot.questionSeq])

  const handleSubmit = () => {
    if (picked === null || !selfStudent) return
    submitAnswer(lessonId, {
      studentId: selfStudent.id,
      studentName: selfStudent.name,
      pickedIndex: picked,
    })
  }

  const showResult = snapshot.status === "closed" && mySubmission
  const isWaitingForGrading =
    (snapshot.status === "live" && mySubmission != null) ||
    snapshot.status === "grading"

  return (
    <div className="flex flex-col gap-4">
      <QuestionStem stem={q.stem} />

      {/* 选项 */}
      <div className="grid grid-cols-1 gap-2">
        {q.options.map((opt, i) => {
          const isPicked = (mySubmission ? mySubmission.pickedIndex : picked) === i
          const isCorrectAns = showResult && i === q.correctIndex
          const isMyWrong =
            showResult && mySubmission && i === mySubmission.pickedIndex && !mySubmission.isCorrect
          const tone = showResult
            ? isCorrectAns
              ? "border-[var(--color-success)]/60 bg-[var(--color-success)]/10"
              : isMyWrong
                ? "border-[var(--color-warning)]/55 bg-[var(--color-warning)]/10"
                : "border-border opacity-70"
            : isPicked
              ? "border-[var(--color-primary)]/60 bg-[var(--color-primary)]/10"
              : "border-border hover:bg-[var(--black-alpha-11)]"
          const disabled = mySubmission != null || snapshot.status !== "live"
          return (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => setPicked(i)}
              className={cn(
                "flex items-center gap-2 rounded-[var(--radius-md)] border bg-bg px-3 py-2.5 text-left text-[length:var(--font-size-sm)] text-text transition-colors",
                tone,
                disabled && !isPicked && "cursor-not-allowed",
              )}
            >
              <span
                className={cn(
                  "inline-flex size-7 shrink-0 items-center justify-center rounded-full text-[length:var(--font-size-xs)] font-[var(--font-weight-semibold)]",
                  isCorrectAns
                    ? "bg-[var(--color-success)]/15 text-[var(--color-success)]"
                    : isMyWrong
                      ? "bg-[var(--color-warning)]/15 text-[var(--color-warning)]"
                      : isPicked
                        ? "bg-[var(--color-primary)]/15 text-[var(--color-primary)]"
                        : "bg-bg-subtle text-text-secondary",
                )}
              >
                {String.fromCharCode(65 + i)}
              </span>
              <span className="flex-1">{opt}</span>
              {showResult && isCorrectAns ? (
                <CheckCircle2 className="h-4 w-4 text-[var(--color-success)]" />
              ) : null}
              {isMyWrong ? <XCircle className="h-4 w-4 text-[var(--color-warning)]" /> : null}
            </button>
          )
        })}
      </div>

      {/* 行动区 */}
      {snapshot.status === "live" && !mySubmission ? (
        <div className="flex items-center justify-end gap-2">
          {selfStudent ? null : (
            <span className="text-[length:var(--font-size-xs)] text-text-tertiary">
              （仅观摩 · 当前身份不参与作答）
            </span>
          )}
          <button
            type="button"
            disabled={picked === null || !selfStudent}
            onClick={handleSubmit}
            className={cn(
              "inline-flex h-9 items-center rounded-full px-4 text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)] transition-colors",
              picked !== null && selfStudent
                ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground,white)] shadow-sm hover:bg-primary-hover"
                : "border border-border bg-bg-subtle text-text-tertiary",
            )}
          >
            提交答案
          </button>
        </div>
      ) : null}

      {isWaitingForGrading && !showResult ? (
        <div className="rounded-[var(--radius-md)] border border-border bg-bg-subtle/40 p-4 text-[length:var(--font-size-sm)] text-text-secondary">
          {snapshot.status === "grading"
            ? "AI 正在批改全班答题，稍等 1 秒…"
            : "已提交，等待全班作答完成 / AI 批改…"}
          <Dots />
        </div>
      ) : null}

      {/* AI 反馈 */}
      {showResult && mySubmission ? (
        <section
          className={cn(
            "rounded-[var(--radius-md)] border p-4",
            mySubmission.isCorrect
              ? "border-[var(--color-success)]/55 bg-[var(--color-success)]/8"
              : "border-[var(--color-warning)]/55 bg-[var(--color-warning)]/8",
          )}
        >
          <div className="flex items-center gap-2">
            {mySubmission.isCorrect ? (
              <CheckCircle2 className="h-4 w-4 text-[var(--color-success)]" />
            ) : (
              <XCircle className="h-4 w-4 text-[var(--color-warning)]" />
            )}
            <h4 className="m-0 text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-text">
              AI 批改 · 个性反馈
            </h4>
          </div>
          <pre className="m-0 mt-2 whitespace-pre-wrap font-[inherit] text-[length:var(--font-size-sm)] leading-relaxed text-text">
            {mySubmission.aiFeedback ?? "—"}
          </pre>
        </section>
      ) : null}

      {/* 没本人 submission 但已 closed（家长视图 / 没赶上提交的学生）：仅展示标准答案与解析 */}
      {showResult && !mySubmission ? (
        <section className="rounded-[var(--radius-md)] border border-border p-4">
          <h4 className="m-0 mb-1 text-[length:var(--font-size-xs)] font-[var(--font-weight-semibold)] text-text-secondary">
            标准答案 · {String.fromCharCode(65 + q.correctIndex)}
          </h4>
          <p className="m-0 text-[length:var(--font-size-sm)] text-text">{q.explanation}</p>
        </section>
      ) : null}
    </div>
  )
}

/* ============================================================
 * 公共小组件
 * ============================================================ */

function QuestionStem({ stem }: { stem: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-border bg-bg-subtle/30 p-4">
      <p className="m-0 text-[length:var(--font-size-base)] font-[var(--font-weight-medium)] leading-relaxed text-text">
        {stem}
      </p>
    </div>
  )
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent: "primary" | "success" | "warning" | "danger" | "neutral"
}) {
  const accentClass =
    accent === "primary"
      ? "text-[var(--color-primary)]"
      : accent === "success"
        ? "text-[var(--color-success)]"
        : accent === "warning"
          ? "text-[var(--color-warning)]"
          : accent === "danger"
            ? "text-[var(--color-danger,#dc2626)]"
            : "text-text"
  return (
    <div className="rounded-[var(--radius-md)] border border-border bg-bg p-3">
      <p className="m-0 text-[length:var(--font-size-xs)] text-text-tertiary">{label}</p>
      <p className={cn("m-0 mt-1 text-[length:var(--font-size-lg)] font-[var(--font-weight-semibold)] tabular-nums", accentClass)}>
        {value}
      </p>
    </div>
  )
}

function GradingHint() {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-warning)]/45 bg-[var(--color-warning)]/8 p-3 text-[length:var(--font-size-xs)] text-[var(--color-warning)]">
      AI 正在为每位同学生成个性化反馈
      <Dots />
    </div>
  )
}

function Dots() {
  return (
    <span className="inline-flex w-6 justify-start">
      <span className="ml-1 inline-block animate-pulse">·</span>
      <span className="ml-0.5 inline-block animate-pulse [animation-delay:200ms]">·</span>
      <span className="ml-0.5 inline-block animate-pulse [animation-delay:400ms]">·</span>
    </span>
  )
}

/* ============================================================
 * Helpers
 * ============================================================ */

function useCountdown(deadlineAt: number | null): number {
  const [remain, setRemain] = React.useState(() =>
    deadlineAt == null ? 0 : Math.max(0, Math.ceil((deadlineAt - Date.now()) / 1000)),
  )
  React.useEffect(() => {
    if (deadlineAt == null) {
      setRemain(0)
      return
    }
    const tick = () =>
      setRemain(Math.max(0, Math.ceil((deadlineAt - Date.now()) / 1000)))
    tick()
    const t = window.setInterval(tick, 250)
    return () => window.clearInterval(t)
  }, [deadlineAt])
  return remain
}

function pickSelfStudent(role: EduLessonAttendingRole): AiClassroomLiveStudentDemo | null {
  if (role === "student") {
    return DEMO_LIVE_STUDENTS.find((s) => s.isSelf) ?? null
  }
  /** 家长视图：仅观摩孩子作答，不参与提交（pickSelfStudent → null 让"提交答案"按钮 disabled） */
  return null
}

function groupBy<T, K extends string | number>(
  list: T[],
  keyFn: (t: T) => K,
): Record<K, T[]> {
  const out = {} as Record<K, T[]>
  for (const item of list) {
    const k = keyFn(item)
    if (!out[k]) out[k] = []
    out[k].push(item)
  }
  return out
}
