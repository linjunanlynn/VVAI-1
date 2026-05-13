/**
 * 创建排课表 · 侧边子 CUI（与 CreateCourseSideConversationPanel 同款外壳）
 *
 * 触发
 * ----------------------------------------------------
 * - `EduCourseProductsCard` 课程行点「添加排课表 / 打开排课表」 →
 *   父级 `MainAIChatWindow` 打开本面板，并把 courseId 透下来
 *
 * 内部数据流
 * ----------------------------------------------------
 * 1. 挂载时 `createSchedule(...)` 出一张 finalized=false 的草稿，记下 draftId
 * 2. `useSyncExternalStore(subscribeEduCourses, getSnapshot)` 订阅 store，
 *    拿到当前 course + 本草稿 schedule 的最新引用
 * 3. CreateScheduleCard 内部点空白格 → 本组件打开 AddScheduleTimeSheet
 *    弹层 → 用户确定 → `addScheduleOccurrencesFromForm(...)` 写回草稿 →
 *    通知到位，CreateScheduleCard 自动 rerender 出彩色块
 * 4. 取消 → `removeSchedule(draft)` + onClose（草稿不残留）
 * 5. 确认创建 → `finalizeSchedule(draft)` → onCreated(summary) + onClose
 */

import * as React from "react"
import { X } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar"
import { VvAiLogo } from "../chat/ChatComponents"
import { cn } from "../ui/utils"
import { CreateScheduleCard } from "./CreateScheduleCard"
import {
  AddScheduleTimeSheet,
  type AddScheduleTimeSheetSubmit,
} from "./AddScheduleTimeSheet"
import {
  addScheduleOccurrencesFromForm,
  createSchedule,
  finalizeSchedule,
  getCourse,
  removeSchedule,
  removeScheduleOccurrence,
  scheduleColorToHsl,
  SCHEDULE_COLOR_LIST,
  teachingFormatLabel,
  updateScheduleMeta,
  updateScheduleOccurrence,
  subscribeEduCourses,
  type ScheduleColor,
  type ScheduleOccurrence,
  type ScheduleRecord,
  type SpaceContext,
} from "./eduCoursesPersistence"

void scheduleColorToHsl /* keep export referenced via card; placeholder for future use */

export interface CreateScheduleSideConversationPanelProps {
  ctx: SpaceContext
  /** 关联到哪个课程（必填） */
  courseId: string
  botAvatarSrc?: string
  /** 关闭面板（用户取消 / 提交完成后调用） */
  onClose: () => void
  /** 提交完成回调：父级把"已为《xx》创建排课表..."作为 AI 反馈 push 回主对话 */
  onCreated?: (summary: string) => void
  /**
   * 打开模式：
   *  - "create"（默认）：挂载时建一张 finalized=false 的草稿；取消会清掉草稿
   *  - "edit"：直接打开课程「最近一张 finalized=true 的排课表」，
   *            没有的话回退到「最近一张 finalized=false 的草稿」，
   *            两者都没有再回退到 create 行为；取消不删除（因为是实数据）
   */
  mode?: "create" | "edit"
}

export function CreateScheduleSideConversationPanel({
  ctx,
  courseId,
  botAvatarSrc,
  onClose,
  onCreated,
  mode = "create",
}: CreateScheduleSideConversationPanelProps) {
  /**
   * 1) 挂载时确定 working schedule 的 id（只跑一次，StrictMode 双 effect 友好）
   *    - edit 模式：尽量复用已有 schedule（先 finalized 再 draft），都没有再降级建草稿
   *    - create 模式：直接建新草稿
   *
   *    `isDraftRef` 跟 `mode === "create"` 不完全等价：edit 找不到就降级建草稿，
   *    此时也是草稿语义（取消应清掉），所以用单独 ref 记。
   */
  const initRef = React.useRef<{ draftId: string } | null>(null)
  const isDraftRef = React.useRef<boolean>(true)
  const [draftId, setDraftId] = React.useState<string | null>(null)
  React.useEffect(() => {
    if (initRef.current) return
    const course = getCourse(ctx, courseId)
    if (!course) return

    /** edit 模式：优先复用已有的 schedule */
    if (mode === "edit") {
      const finalized = course.schedules.find((s) => s.finalized)
      const existing = finalized ?? course.schedules[0] ?? null
      if (existing) {
        initRef.current = { draftId: existing.id }
        isDraftRef.current = !existing.finalized
        setDraftId(existing.id)
        return
      }
      /** 没有任何 schedule → 降级建草稿，等同 create 流程 */
    }

    /** 颜色按当前 course 已有 schedules 数量取下一个，避免重色 */
    const usedCount = course.schedules.length
    const color: ScheduleColor =
      SCHEDULE_COLOR_LIST[usedCount % SCHEDULE_COLOR_LIST.length] ?? "violet"
    const draft = createSchedule({
      ctx,
      courseId,
      name: "",
      color,
    })
    if (draft) {
      initRef.current = { draftId: draft.id }
      isDraftRef.current = true
      setDraftId(draft.id)
    }
    /** ctx 与 courseId 在面板存活期内不变，禁用依赖完整性提示是合理的 */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** 2) 订阅 store 取最新 course + schedule */
  const subscribe = React.useCallback(
    (listener: () => void) => subscribeEduCourses(listener),
    [],
  )
  /** 用对象 cache 防止 useSyncExternalStore 因每次返回新对象触发"无限重渲染" */
  const snapshotCache = React.useRef<{
    sig: string
    value: { course: ReturnType<typeof getCourse>; schedule: ScheduleRecord | null }
  } | null>(null)
  const getSnapshot = React.useCallback(() => {
    const course = getCourse(ctx, courseId)
    const schedule =
      (draftId && course?.schedules.find((s) => s.id === draftId)) || null
    /** signature：用关键字段拼一个字符串，避免对象引用变化导致 React 误以为变 */
    const sig = JSON.stringify({
      cId: course?.id,
      sId: schedule?.id,
      sName: schedule?.name,
      sColor: schedule?.color,
      sFinalized: schedule?.finalized,
      sOccs: schedule?.occurrences.map((o) => `${o.id}:${o.startAt}:${o.endAt}`),
    })
    if (snapshotCache.current && snapshotCache.current.sig === sig) {
      return snapshotCache.current.value
    }
    const value = { course, schedule }
    snapshotCache.current = { sig, value }
    return value
  }, [ctx, courseId, draftId])
  const snapshot = React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const course = snapshot.course
  const schedule = snapshot.schedule

  /** ESC 关闭 */
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleCancel()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /**
   * 3) AddScheduleTimeSheet 弹层
   *
   *  - 新增：点空白格 → setSheetEditing(null) + setSheetPrefill(slotStart) + 打开
   *  - 编辑：点已有 occurrence → setSheetEditing(occ) + 打开（prefill 由 sheet 自己从 occurrence 派生）
   *
   *  onConfirm 根据 submit.editingOccurrenceId 决定走 add（批量重复展开）还是 update（只动这一次）。
   *  onDelete 仅在编辑模式可达 → removeScheduleOccurrence。
   */
  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [sheetPrefill, setSheetPrefill] = React.useState<Date>(() => new Date())
  const [sheetEditing, setSheetEditing] =
    React.useState<ScheduleOccurrence | null>(null)

  const handlePickEmptySlot = React.useCallback((slotStart: Date) => {
    setSheetEditing(null)
    setSheetPrefill(slotStart)
    setSheetOpen(true)
  }, [])

  const handlePickOccurrence = React.useCallback(
    (occurrence: ScheduleOccurrence) => {
      setSheetEditing(occurrence)
      /** prefill 给个兜底值；sheet 在编辑模式下会优先从 occurrence 派生 */
      setSheetPrefill(new Date(occurrence.startAt))
      setSheetOpen(true)
    },
    [],
  )

  const handleSheetClose = React.useCallback(() => {
    setSheetOpen(false)
    /** 关闭后清掉编辑态，保证下次点空白格不会带上次的 occurrence prefill */
    setSheetEditing(null)
  }, [])

  const handleSheetConfirm = React.useCallback(
    (submit: AddScheduleTimeSheetSubmit) => {
      if (!draftId) return
      if (submit.editingOccurrenceId) {
        /** 编辑单次：只改这一次，其它不动 */
        updateScheduleOccurrence({
          ctx,
          courseId,
          scheduleId: draftId,
          occurrenceId: submit.editingOccurrenceId,
          startAt: submit.startAt,
          durationMinutes: submit.durationMinutes,
        })
      } else {
        /** 新增：按重复规则展开 N 次 */
        addScheduleOccurrencesFromForm({
          ctx,
          courseId,
          scheduleId: draftId,
          startAt: submit.startAt,
          durationMinutes: submit.durationMinutes,
          repeat: submit.repeat,
          sessionCount: submit.sessionCount,
        })
      }
      if (submit.teacherName) {
        updateScheduleMeta({
          ctx,
          courseId,
          scheduleId: draftId,
          teacherName: submit.teacherName,
        })
      }
      handleSheetClose()
    },
    [ctx, courseId, draftId, handleSheetClose],
  )

  const handleSheetDelete = React.useCallback(
    (occurrenceId: string) => {
      if (!draftId) return
      removeScheduleOccurrence({
        ctx,
        courseId,
        scheduleId: draftId,
        occurrenceId,
      })
    },
    [ctx, courseId, draftId],
  )

  /** 4) 取消：草稿清掉再关；edit 模式打开的实数据不清 */
  const handleCancel = React.useCallback(() => {
    if (draftId && isDraftRef.current) {
      removeSchedule({ ctx, courseId, scheduleId: draftId })
    }
    onClose()
  }, [ctx, courseId, draftId, onClose])

  /** 5) 确认：finalize（idempotent，对 edit 模式相当于"重新对齐 N↔N"）+ 推回执 + 关闭 */
  const handleConfirm = React.useCallback(() => {
    if (!draftId || !course || !schedule) return
    finalizeSchedule({ ctx, courseId, scheduleId: draftId })
    const occCount = schedule.occurrences.length
    const teacher = schedule.teacherName ? `${schedule.teacherName} 老师 · ` : ""
    const verb = isDraftRef.current ? "创建" : "更新"
    const summary = `已为《${course.name}》${verb}排课表「${schedule.name || "未命名"}」：${teacher}共 ${occCount} 节，单节 ${schedule.durationMinutes} 分钟。已同步到「课程履约」。第 N 个上课时间点对应「教学资料」第 N 节子目录，可直接进系列子 CUI 看资料。`
    onCreated?.(summary)
    onClose()
  }, [ctx, courseId, draftId, course, schedule, onCreated, onClose])

  /** 头部 / 文案随 mode 切换："创建排课表" vs "排课表" */
  const isEditMode = mode === "edit" && !isDraftRef.current
  const headerTitle = isEditMode ? "排课表" : "创建排课表"

  /** 草稿未建好或课程被删 → 兜底空态 */
  if (!course || !schedule) {
    return (
      <div
        className={cn(
          "pointer-events-auto flex h-full min-h-0 min-w-0 w-full flex-col bg-cui-bg",
          "border-l border-[#e8ecf0] shadow-[-12px_0_32px_rgba(15,23,42,0.08)]",
        )}
      >
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
              {headerTitle}
            </h2>
          </div>
          <div className="flex min-w-0 items-center justify-end">
            <button
              type="button"
              onClick={onClose}
              className="flex size-9 shrink-0 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-[var(--black-alpha-11)] hover:text-text"
              aria-label="关闭排课表"
            >
              <X className="size-[18px]" strokeWidth={2} />
            </button>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 text-[length:var(--font-size-sm)] text-text-tertiary">
          {isEditMode ? "正在加载排课表…" : "正在准备排课表草稿…"}
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "pointer-events-auto flex h-full min-h-0 min-w-0 w-full flex-col bg-cui-bg",
        "border-l border-[#e8ecf0] shadow-[-12px_0_32px_rgba(15,23,42,0.08)]",
      )}
    >
      {/* Header：与 AiClassroomSideConversationPanel / CreateCourseSideConversationPanel 同结构 */}
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
            {headerTitle}
          </h2>
        </div>
        <div className="flex min-w-0 items-center justify-end">
          <button
            type="button"
            onClick={handleCancel}
            className="flex size-9 shrink-0 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-[var(--black-alpha-11)] hover:text-text"
            aria-label="关闭排课表"
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
              {isEditMode
                ? `这是《${course.name}》的排课表「${schedule.name || "未命名"}」，已排 ${schedule.occurrences.length} 节。可以继续在周日历的空白格添加上课时间，或在已有色块上点 ✕ 删除某节。`
                : `来给《${course.name}》排个课吧。给排课表起个名、选个颜色，再点周日历的空白格添加上课时间，可以一次性按重复规则展开多节。`}{" "}
              <span className="text-text-tertiary">
                教学模式：{teachingFormatLabel(course.teachingFormat)}
              </span>
            </div>
          </div>

          {/* 主卡 */}
          <CreateScheduleCard
            course={course}
            schedule={schedule}
            onPickEmptySlot={handlePickEmptySlot}
            onPickOccurrence={handlePickOccurrence}
            onUpdateMeta={(patch) =>
              updateScheduleMeta({
                ctx,
                courseId,
                scheduleId: draftId!,
                ...patch,
              })
            }
            onCancel={handleCancel}
            onConfirm={handleConfirm}
          />
        </div>
      </div>

      {/* 时间弹层：新增 / 编辑同一个组件，靠 editingOccurrence 切换语义 */}
      <AddScheduleTimeSheet
        open={sheetOpen}
        onClose={handleSheetClose}
        prefillStart={sheetPrefill}
        defaultTeacherName={schedule.teacherName}
        defaultDurationMinutes={schedule.durationMinutes}
        course={course}
        onConfirm={handleSheetConfirm}
        editingOccurrence={sheetEditing}
        onDeleteOccurrence={handleSheetDelete}
      />
    </div>
  )
}
