/**
 * 添加时间 · 弹层（按图三 1:1 复刻 + 用户提的两点调整）
 *
 * 触发：用户在 CreateScheduleCard 周日历的某个空白格上点了一下
 * 行为：根据用户填写的「老师 / 课程时间 / 重复 / 单节时长」展开为多条 occurrence，
 *      课节数严格读自 `course.sessionCount`（创建课程上传大纲时识别），不可修改；
 *      截止日期由「起始时间 + 重复规则 + 课节数」系统自动派生。
 *
 * 核心字段
 * ----------------------------------------------------
 * - 老师：下拉选择（默认拉自当前 schedule.teacherName + 同 course 的其它排课表 teacherName + "请选择"）
 * - 课程时间：日期 + 起始时间（结束 = 起始 + 单节时长，自动渲染为 "YYYY-MM-DD 周X HH:mm-HH:mm"）
 * - 重复：不重复 / 每周 / 自定义；选「自定义」时在**同一弹层内**展开一个面板：
 *        · 重复频率：每 N 周（unit v1 锁为「周」）
 *        · 星期几多选（默认勾选起始日 weekday）
 *        · 截止：read-only，依然由 sessionCount + 当前规则自动算
 *        最终走 `expandScheduleStartTimestamps` 展开，自然作用到课程履约等下游。
 * - 截止：read-only，由系统按规则自动算，展示形如 "截止至 2026-08-01"
 * - 单节时长：number + 分钟后缀（默认 60，预设 45/60/90/120 chip 也保留）
 * - 课节数：disabled，显示 `${course.sessionCount} 节`
 *
 * 实现要点
 * ----------------------------------------------------
 * - createPortal + z-[10000]，遮罩点击 / ESC / ✕ 都能关闭
 * - 所有派生字段（结束时间 / 截止日期 / 摘要）都跟随主输入实时刷新
 * - "添加" 占位区按图三保留为 dashed border 提示，但 v1 不开放多段时间编辑（hover 提示原因）
 */

import * as React from "react"
import { createPortal } from "react-dom"
import { CalendarDays, Plus, Repeat, Trash2, X } from "lucide-react"
import { cn } from "../ui/utils"
import {
  expandScheduleStartTimestamps,
  type CourseRecord,
  type ScheduleCustomRepeat,
  type ScheduleOccurrence,
  type ScheduleRepeatRule,
} from "./eduCoursesPersistence"

const DURATION_PRESETS = [45, 60, 90, 120] as const

type RepeatKind = "none" | "weekly" | "custom"

const REPEAT_OPTIONS: { value: RepeatKind; label: string }[] = [
  { value: "none", label: "不重复" },
  { value: "weekly", label: "每周" },
  { value: "custom", label: "自定义" },
]

/** 0=周日 .. 6=周六，与 JS Date.getDay() 对齐 */
const WEEKDAY_LABELS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"] as const

export interface AddScheduleTimeSheetSubmit {
  startAt: number
  durationMinutes: number
  repeat: ScheduleRepeatRule
  /** 由父级用 course.sessionCount 当上限传回；这里只透传 */
  sessionCount: number
  teacherName?: string
  /** 编辑模式下回传的 occurrence id；新增模式为 null */
  editingOccurrenceId: string | null
}

export interface AddScheduleTimeSheetProps {
  open: boolean
  onClose: () => void
  /** 该格子被点击时的精确时间（用于回填日期/开始时间） */
  prefillStart: Date
  /** 默认教师姓名（来自正在编辑的 schedule.teacherName） */
  defaultTeacherName?: string
  /** 默认单节时长 */
  defaultDurationMinutes?: number
  /**
   * 当前所属课程：用于
   *  - 锁定课节数 = course.sessionCount
   *  - 派生老师下拉的备选项（同 course 已有 schedule.teacherName）
   */
  course: CourseRecord
  /** 父级真正写 store；这里只负责收集表单值并 call 它 */
  onConfirm: (submit: AddScheduleTimeSheetSubmit) => void
  /**
   * 编辑模式：传入正在编辑的 occurrence。
   *  - 标题改为「编辑时间」
   *  - 隐藏「重复 / 截止 / 课节数 / + 添加」（这些只对批量"新增"有意义）
   *  - 弹层默认值由 occurrence 派生：起始时间 = occurrence.startAt，单节时长 = (endAt-startAt)/60000
   *  - 底部追加一个「删除此次」按钮，点 → onDeleteOccurrence(occurrence.id) 后由父级调用 onClose
   */
  editingOccurrence?: ScheduleOccurrence | null
  onDeleteOccurrence?: (occurrenceId: string) => void
}

export function AddScheduleTimeSheet({
  open,
  onClose,
  prefillStart,
  defaultTeacherName,
  defaultDurationMinutes,
  course,
  onConfirm,
  editingOccurrence,
  onDeleteOccurrence,
}: AddScheduleTimeSheetProps) {
  /** 编辑模式开关：editingOccurrence 非空就是编辑该次 */
  const isEditing = !!editingOccurrence
  const editingDurationMinutes = editingOccurrence
    ? Math.round((editingOccurrence.endAt - editingOccurrence.startAt) / 60000)
    : null

  const [teacherName, setTeacherName] = React.useState<string>(
    defaultTeacherName ?? "",
  )
  const [dateStr, setDateStr] = React.useState<string>(() =>
    toDateInputValue(
      editingOccurrence ? new Date(editingOccurrence.startAt) : prefillStart,
    ),
  )
  const [startTimeStr, setStartTimeStr] = React.useState<string>(() =>
    toTimeInputValue(
      editingOccurrence ? new Date(editingOccurrence.startAt) : prefillStart,
    ),
  )
  const [duration, setDuration] = React.useState<number>(
    editingDurationMinutes ?? defaultDurationMinutes ?? 60,
  )
  /** 编辑模式强制 "none"（编辑单次不应该再做批量重复展开） */
  const [repeatKind, setRepeatKind] = React.useState<RepeatKind>(
    isEditing ? "none" : "weekly",
  )
  const [repeatOpen, setRepeatOpen] = React.useState(false)
  const repeatRef = React.useRef<HTMLDivElement>(null)

  /**
   * 自定义重复细则（仅 repeatKind === "custom" 时生效）：
   *  - intervalEvery：每 N 周（v1 unit 锁 "week"）
   *  - weekdays：选中的星期几，多选；默认 = 起始日所在的 weekday
   *
   * 注意：editingOccurrence 进入时 repeatKind 已被强制为 "none"，这里
   * 的 default 取 prefillStart / occurrence.startAt 的 weekday 即可，
   * 即便编辑模式下也不会被读取。
   */
  const [customEvery, setCustomEvery] = React.useState<number>(1)
  const [customWeekdays, setCustomWeekdays] = React.useState<number[]>(() => {
    const d = editingOccurrence
      ? new Date(editingOccurrence.startAt)
      : prefillStart
    return [d.getDay()]
  })

  /** 课节数严格 = course.sessionCount，不可修改 */
  const sessionCount = Math.max(1, course.sessionCount || 1)

  /** 老师下拉的备选项（去重 + 过滤空） */
  const teacherOptions = React.useMemo(() => {
    const set = new Set<string>()
    if (defaultTeacherName) set.add(defaultTeacherName)
    for (const s of course.schedules) {
      if (s.teacherName) set.add(s.teacherName)
    }
    return Array.from(set)
  }, [defaultTeacherName, course.schedules])

  /**
   * 重置：当 prefillStart / editingOccurrence 变 / 弹层每次打开时回填。
   * 编辑模式优先用 occurrence 自己的 startAt + duration；否则用 prefillStart + default。
   */
  React.useEffect(() => {
    if (editingOccurrence) {
      const d = new Date(editingOccurrence.startAt)
      setDateStr(toDateInputValue(d))
      setStartTimeStr(toTimeInputValue(d))
      setDuration(
        Math.max(
          15,
          Math.round((editingOccurrence.endAt - editingOccurrence.startAt) / 60000),
        ),
      )
      setRepeatKind("none")
      setCustomEvery(1)
      setCustomWeekdays([d.getDay()])
    } else {
      setDateStr(toDateInputValue(prefillStart))
      setStartTimeStr(toTimeInputValue(prefillStart))
      setDuration(defaultDurationMinutes ?? 60)
      setRepeatKind("weekly")
      setCustomEvery(1)
      setCustomWeekdays([prefillStart.getDay()])
    }
    /** 仅依赖 occurrence id / prefill 时间戳，避免引用变化误触发 */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    editingOccurrence?.id,
    editingOccurrence?.startAt,
    editingOccurrence?.endAt,
    prefillStart.getTime(),
  ])

  /** ESC 关闭 + repeat popover 外点击关闭 */
  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, onClose])
  React.useEffect(() => {
    if (!repeatOpen) return
    const onClick = (e: MouseEvent) => {
      if (!repeatRef.current) return
      if (!repeatRef.current.contains(e.target as Node)) setRepeatOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [repeatOpen])

  /* ============================================================
   * 派生：起止时间戳 / 截止日期 / 预览
   *
   * 注意：以下 useMemo 必须出现在所有早 return 之前——
   * 否则 open: false → true 时 React 会拿到不同数量的 hooks，触发
   * "Rendered more hooks than during the previous render"。
   * `if (!open) return null` 已经下移到最末尾、紧贴 return createPortal。
   * ============================================================ */
  const startAt = combineDateAndTime(dateStr, startTimeStr)
  const startDate = Number.isFinite(startAt) ? new Date(startAt) : null
  const safeDuration = Math.max(15, Math.min(360, Math.floor(duration) || 60))
  const endAt = Number.isFinite(startAt) ? startAt + safeDuration * 60 * 1000 : NaN
  const endDate = Number.isFinite(endAt) ? new Date(endAt) : null

  /**
   * 把当前表单状态组装成一份 `ScheduleRepeatRule`（不含 until，让展开器自己截）。
   * - none：单次
   * - weekly：每 7 天
   * - custom：直接带 ScheduleCustomRepeat（每 N 周 · 多个 weekday）
   */
  const repeatRuleNoUntil = React.useMemo<ScheduleRepeatRule>(() => {
    if (repeatKind === "none") return { kind: "none" }
    if (repeatKind === "weekly") return { kind: "weekly" }
    const custom: ScheduleCustomRepeat = {
      intervalEvery: Math.max(1, Math.floor(customEvery) || 1),
      intervalUnit: "week",
      weekdays: Array.from(new Set(customWeekdays)).sort((a, b) => a - b),
    }
    return { kind: "custom", custom }
  }, [repeatKind, customEvery, customWeekdays])

  /**
   * 用 store 层的展开器在 UI 同步算出"将生成几次 / 截止于哪天"——
   * 这样表单预览与最终写入永远一致（防止 weekly→custom 切换时漂移）。
   */
  const expandedStartAts = React.useMemo(() => {
    if (!Number.isFinite(startAt)) return []
    return expandScheduleStartTimestamps({
      startAt,
      repeat: repeatRuleNoUntil,
      sessionCount,
    })
  }, [startAt, repeatRuleNoUntil, sessionCount])

  /**
   * 截止日期 = 已展开的最后一节的日期
   *  - none：第一节当天
   *  - weekly：startAt + (sessionCount-1)×7d
   *  - custom：扫描结果的最后一节（不一定 = sessionCount，可能因 weekdays 为空 = 0）
   */
  const untilTs =
    expandedStartAts.length > 0
      ? expandedStartAts[expandedStartAts.length - 1]
      : null
  const untilLabel = untilTs ? `截止至 ${toDateInputValue(new Date(untilTs))}` : "—"

  /** 时间整行预览："2026-05-10 周日 23:30-23:59" */
  const courseTimeLabel = startDate && endDate
    ? `${toDateInputValue(startDate)} ${weekdayCN(startDate)} ${toTimeInputValue(startDate)}-${toTimeInputValue(endDate)}`
    : "—"

  const repeatLabel =
    REPEAT_OPTIONS.find((r) => r.value === repeatKind)?.label ?? "每周"

  /** 自定义重复的人类可读简述："每 1 周 · 周三、周日" */
  const customSummary = React.useMemo(() => {
    if (repeatKind !== "custom") return ""
    if (customWeekdays.length === 0) return "未选择星期几"
    const days = [...customWeekdays].sort((a, b) => a - b).map((d) => WEEKDAY_LABELS[d])
    return `每 ${Math.max(1, Math.floor(customEvery) || 1)} 周 · ${days.join("、")}`
  }, [repeatKind, customEvery, customWeekdays])

  /**
   * 当前规则下能否提交：
   *  - 编辑模式：只看 startAt 是否合法
   *  - 新增模式：必须能展开出至少 1 次（custom 时未勾任何 weekday 会展开 0 次）
   */
  const canSubmit = Number.isFinite(startAt) && (isEditing || expandedStartAts.length > 0)

  const submit = () => {
    if (!Number.isFinite(startAt) || !startDate) return
    /**
     * 编辑模式：固定 repeat=none + sessionCount=1（只动这一次），父级会调
     * `updateScheduleOccurrence` 改 startAt/duration，不展开重复
     */
    if (isEditing && editingOccurrence) {
      onConfirm({
        startAt,
        durationMinutes: safeDuration,
        repeat: { kind: "none" },
        sessionCount: 1,
        teacherName: teacherName.trim() || undefined,
        editingOccurrenceId: editingOccurrence.id,
      })
      return
    }
    if (expandedStartAts.length === 0) return
    /**
     * 把展开器算出的实际 untilTs 带回 store —— 让 store 层的 expander
     * 用同一份 until 卡边界，绝不会出现 UI 预览 N 次但实际写入 N+1 次的偏差。
     */
    const repeat: ScheduleRepeatRule = {
      ...repeatRuleNoUntil,
      until:
        repeatRuleNoUntil.kind === "none" || untilTs == null
          ? undefined
          : untilTs + (24 * 60 * 60 * 1000 - 60 * 1000), // 含截止当日 23:59
    }
    onConfirm({
      startAt,
      durationMinutes: safeDuration,
      repeat,
      sessionCount,
      teacherName: teacherName.trim() || undefined,
      editingOccurrenceId: null,
    })
  }

  /** 早 return 必须在所有 hooks 之后，避免 hook 数量在 open 翻转时变化 */
  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-schedule-time-sheet-title"
    >
      <div
        className="absolute inset-0 bg-[rgba(15,23,42,0.45)] backdrop-blur-[2px]"
        onClick={onClose}
      />

      <div className="relative z-[1] flex w-[min(92vw,460px)] max-h-[88vh] flex-col overflow-hidden rounded-[var(--radius-card)] bg-bg shadow-[0_24px_64px_rgba(15,23,42,0.32)]">
        {/* header */}
        <div className="flex w-full items-center gap-[var(--space-200)] border-b border-border bg-[var(--color-primary)]/4 px-[var(--space-400)] py-[var(--space-300)]">
          <h3
            id="add-schedule-time-sheet-title"
            className="m-0 flex-1 text-[length:var(--font-size-md)] font-[var(--font-weight-semibold)] text-text"
          >
            {isEditing ? "编辑时间" : "添加时间"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="flex size-7 items-center justify-center rounded-full text-text-tertiary transition-colors hover:bg-[var(--black-alpha-11)] hover:text-text"
          >
            <X className="size-4" strokeWidth={1.8} />
          </button>
        </div>

        {/* body */}
        <div className="flex w-full flex-1 flex-col gap-[var(--space-300)] overflow-y-auto px-[var(--space-400)] py-[var(--space-350)]">
          {/* 老师（下拉） */}
          <Field label="老师">
            {teacherOptions.length > 0 ? (
              <select
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                className="h-10 w-full rounded-[var(--radius-md)] border border-border bg-bg px-[var(--space-300)] text-[length:var(--font-size-sm)] text-text outline-none transition-colors focus:border-[var(--color-primary)]/55"
              >
                <option value="">请选择</option>
                {teacherOptions.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                placeholder="请选择"
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                className="h-10 w-full rounded-[var(--radius-md)] border border-border bg-bg px-[var(--space-300)] text-[length:var(--font-size-sm)] text-text outline-none transition-colors focus:border-[var(--color-primary)]/55"
              />
            )}
          </Field>

          {/* 课程时间 *（dashed bordered block，与图三一致） */}
          <div className="flex flex-col gap-[var(--space-250)] rounded-[var(--radius-md)] border border-dashed border-border px-[var(--space-300)] py-[var(--space-300)]">
            <Field label="课程时间" required noMargin>
              {/*
               * 干净的两列布局：日期 input + 起始时间 input，并排
               * （之前用「透明 native input + 绝对定位预览」叠层会被 OS 内置 spinner 顶花掉，弃用）
               */}
              <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-[var(--space-200)]">
                <div className="relative">
                  <input
                    type="date"
                    value={dateStr}
                    onChange={(e) => setDateStr(e.target.value)}
                    className="h-10 w-full cursor-pointer rounded-[var(--radius-md)] border border-border bg-bg pl-[calc(var(--space-300)+18px)] pr-[var(--space-300)] text-[length:var(--font-size-sm)] tabular-nums text-text outline-none [color-scheme:light] transition-colors focus:border-[var(--color-primary)]/55"
                  />
                  <CalendarDays
                    className="pointer-events-none absolute left-[var(--space-200)] top-1/2 size-4 -translate-y-1/2 text-text-tertiary"
                    strokeWidth={1.8}
                  />
                </div>
                <input
                  type="time"
                  value={startTimeStr}
                  onChange={(e) => setStartTimeStr(e.target.value)}
                  className="h-10 w-full cursor-pointer rounded-[var(--radius-md)] border border-border bg-bg px-[var(--space-300)] text-[length:var(--font-size-sm)] tabular-nums text-text outline-none [color-scheme:light] transition-colors focus:border-[var(--color-primary)]/55"
                />
              </div>
              {/* 单独一行预览 "2026-05-10 周日 23:30-23:59" */}
              <div className="mt-[var(--space-150)] flex items-center gap-[var(--space-150)] rounded-[var(--radius-sm)] bg-bg-tertiary px-[var(--space-250)] py-[var(--space-150)]">
                <span className="text-[length:var(--font-size-xs)] text-text-tertiary">
                  课程时间
                </span>
                <span className="flex-1 truncate text-[length:var(--font-size-sm)] tabular-nums text-text">
                  {courseTimeLabel}
                </span>
              </div>
            </Field>

            {/*
             * 重复 + 截止：仅"新增"模式可见；编辑单次时把这两个 + 下方「+ 添加」整块隐藏
             * （编辑只动这一次的 startAt + duration，重复展开没语义）
             */}
            {!isEditing ? (
              <>
            <div className="grid grid-cols-2 gap-[var(--space-200)]">
              {/* 重复（自定义下拉） */}
              <div ref={repeatRef} className="relative">
                <button
                  type="button"
                  onClick={() => setRepeatOpen((v) => !v)}
                  className={cn(
                    "flex h-10 w-full items-center gap-[var(--space-150)] rounded-[var(--radius-md)] border bg-bg px-[var(--space-300)] text-left text-[length:var(--font-size-sm)] text-text outline-none transition-colors",
                    repeatOpen
                      ? "border-[var(--color-primary)]/55"
                      : "border-border hover:bg-[var(--black-alpha-11)]",
                  )}
                  aria-haspopup="listbox"
                  aria-expanded={repeatOpen}
                >
                  <span className="flex-1 truncate">
                    {repeatKind === "none" ? "不重复" : `${repeatLabel}重复`}
                  </span>
                  <Repeat
                    className="size-3.5 text-text-tertiary"
                    strokeWidth={1.8}
                  />
                </button>
                {repeatOpen ? (
                  <ul className="absolute left-0 top-[calc(100%+4px)] z-[10001] m-0 flex w-[180px] list-none flex-col rounded-[var(--radius-md)] border border-border bg-bg p-[var(--space-100)] shadow-[0_8px_24px_rgba(15,23,42,0.16)]">
                    {REPEAT_OPTIONS.map((r) => {
                      const active = r.value === repeatKind
                      return (
                        <li key={r.value} className="m-0 p-0">
                          <button
                            type="button"
                            onClick={() => {
                              setRepeatKind(r.value)
                              setRepeatOpen(false)
                            }}
                            className={cn(
                              "flex w-full items-center justify-between rounded-[var(--radius-sm)] px-[var(--space-250)] py-[var(--space-200)] text-left text-[length:var(--font-size-sm)] transition-colors",
                              active
                                ? "text-[var(--color-primary)]"
                                : "text-text hover:bg-[var(--black-alpha-11)]",
                            )}
                          >
                            {r.label}
                            {active ? (
                              <span aria-hidden className="text-[var(--color-primary)]">
                                ✓
                              </span>
                            ) : null}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                ) : null}
              </div>

              {/* 截止（read-only，自动算） */}
              <div
                className="flex h-10 w-full items-center justify-between rounded-[var(--radius-md)] border border-border bg-bg-tertiary px-[var(--space-300)] text-[length:var(--font-size-sm)] text-text-secondary"
                title="按起始时间 + 重复规则 + 课节数自动计算"
              >
                <span className="truncate">{untilLabel}</span>
                <span className="text-[length:var(--font-size-xs)] text-text-tertiary">
                  自动
                </span>
              </div>
            </div>

            {/*
             * 自定义重复展开面板：与上方下拉同处一个弹层，避免再叠一层 modal。
             * v1 锁为"每 N 周 · 星期几多选"——与图二一致；后续若要"每 N 月"
             * 把 intervalUnit 选项打开、weekdays 改 day-of-month 即可。
             */}
            {repeatKind === "custom" ? (
              <CustomRepeatPanel
                intervalEvery={customEvery}
                onIntervalChange={setCustomEvery}
                weekdays={customWeekdays}
                onWeekdaysChange={setCustomWeekdays}
                untilLabel={untilLabel}
                customSummary={customSummary}
              />
            ) : null}

            {/*
             * 「+ 添加」（图三占位）：v1 暂不支持多段时间编辑——
             * 课节数固定为 course.sessionCount，单段重复规则已能覆盖；
             * 这里保留视觉占位与 hint，避免空感。
             */}
            <button
              type="button"
              disabled
              title="v1 课节数固定 = 课程总课次，单段时间已覆盖；多段时间编辑下个版本支持"
              className="inline-flex items-center justify-center gap-[var(--space-100)] rounded-[var(--radius-md)] border border-dashed border-border px-[var(--space-300)] py-[var(--space-200)] text-[length:var(--font-size-xs)] text-text-tertiary opacity-60"
            >
              <Plus className="size-3.5" strokeWidth={1.8} />
              添加（v1 暂不支持多段）
            </button>
              </>
            ) : null}
          </div>

          {/*
           * 单节时长 + 课节数（locked）
           *  - 新增模式：两列并排
           *  - 编辑单次：只有"单节时长"，单列拉满（课节数对单次没意义）
           */}
          <div
            className={cn(
              "grid w-full gap-[var(--space-300)]",
              isEditing ? "grid-cols-1" : "grid-cols-2",
            )}
          >
            <Field label="单节时长" required>
              <div className="flex items-center gap-[var(--space-100)]">
                <input
                  type="number"
                  min={15}
                  max={360}
                  step={5}
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value) || 0)}
                  className="h-10 w-full rounded-[var(--radius-md)] border border-border bg-bg px-[var(--space-300)] text-[length:var(--font-size-sm)] tabular-nums text-text outline-none transition-colors focus:border-[var(--color-primary)]/55"
                />
                <span className="shrink-0 text-[length:var(--font-size-sm)] text-text-secondary">
                  分钟
                </span>
              </div>
              <div className="mt-[var(--space-150)] flex flex-wrap items-center gap-[var(--space-100)]">
                {DURATION_PRESETS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDuration(d)}
                    className={cn(
                      "h-7 rounded-full border px-[var(--space-250)] text-[length:var(--font-size-xs)] transition-colors",
                      duration === d
                        ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                        : "border-border bg-bg text-text-secondary hover:bg-[var(--black-alpha-11)]",
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </Field>

            {/* 课节数（locked）：只在"新增"模式有意义；编辑单次时整列隐藏 */}
            {!isEditing ? (
              <Field label="课节数" required>
                <div
                  className="flex h-10 items-center gap-[var(--space-100)]"
                  title="课节数等于该课程总课次（创建课程时由大纲解析得到），不可修改"
                >
                  <input
                    type="text"
                    value={String(sessionCount)}
                    disabled
                    readOnly
                    className="h-10 w-full cursor-not-allowed rounded-[var(--radius-md)] border border-border bg-bg-tertiary px-[var(--space-300)] text-[length:var(--font-size-sm)] tabular-nums text-text-secondary outline-none"
                  />
                  <span className="shrink-0 text-[length:var(--font-size-sm)] text-text-secondary">
                    节
                  </span>
                </div>
                <p className="m-0 mt-[var(--space-100)] text-[length:var(--font-size-xs)] text-text-tertiary">
                  来自课程总课次（大纲识别）
                </p>
              </Field>
            ) : null}
          </div>

          {/* 摘要 */}
          <div className="rounded-[var(--radius-md)] bg-bg-tertiary px-[var(--space-300)] py-[var(--space-250)] text-[length:var(--font-size-xs)] leading-relaxed text-text-secondary">
            {isEditing ? (
              <>
                将把这次上课时间改为
                <span className="mx-1 font-[var(--font-weight-semibold)] text-text">
                  {courseTimeLabel}
                </span>
                ，单节
                <span className="mx-1 font-[var(--font-weight-semibold)] text-text">
                  {safeDuration}
                </span>
                分钟。其它已排时间不受影响。
              </>
            ) : (
              <>
                将生成
                <span className="mx-1 font-[var(--font-weight-semibold)] text-text">
                  {expandedStartAts.length}
                </span>
                次上课时间，每次
                <span className="mx-1 font-[var(--font-weight-semibold)] text-text">
                  {safeDuration}
                </span>
                分钟，从
                <span className="mx-1 font-[var(--font-weight-semibold)] text-text">
                  {courseTimeLabel}
                </span>
                开始
                {repeatKind !== "none" ? (
                  <>
                    ，按
                    <span className="mx-1 font-[var(--font-weight-semibold)] text-text">
                      {repeatKind === "custom" ? customSummary || "自定义" : repeatLabel}
                    </span>
                    重复
                    {untilTs ? (
                      <>
                        ，
                        <span className="mx-1 font-[var(--font-weight-semibold)] text-text">
                          {untilLabel}
                        </span>
                      </>
                    ) : null}
                  </>
                ) : null}
                。
                {repeatKind === "custom" && expandedStartAts.length === 0 ? (
                  <span className="ml-1 text-[var(--color-error,#ef4444)]">
                    请至少选择一个星期。
                  </span>
                ) : null}
              </>
            )}
          </div>
        </div>

        {/* footer：编辑模式下追加左侧「删除此次」按钮 */}
        <div className="flex w-full items-center gap-[var(--space-200)] border-t border-border px-[var(--space-400)] py-[var(--space-250)]">
          {isEditing && editingOccurrence && onDeleteOccurrence ? (
            <button
              type="button"
              onClick={() => {
                onDeleteOccurrence(editingOccurrence.id)
                onClose()
              }}
              className="inline-flex h-9 items-center gap-[var(--space-100)] rounded-full border border-[var(--color-error,#ef4444)]/40 bg-bg px-[var(--space-300)] text-[length:var(--font-size-sm)] text-[var(--color-error,#ef4444)] transition-colors hover:bg-[var(--color-error,#ef4444)]/8"
            >
              <Trash2 className="size-3.5" strokeWidth={1.8} />
              删除此次
            </button>
          ) : null}
          <div className="ml-auto flex items-center gap-[var(--space-200)]">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 items-center rounded-full border border-border bg-bg px-[var(--space-400)] text-[length:var(--font-size-sm)] text-text transition-colors hover:bg-[var(--black-alpha-11)]"
            >
              取消
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit}
              title={
                !canSubmit && repeatKind === "custom"
                  ? "请至少选择一个星期"
                  : undefined
              }
              className={cn(
                "inline-flex h-9 items-center rounded-full px-[var(--space-500)] text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] transition-colors",
                canSubmit
                  ? "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/90"
                  : "cursor-not-allowed bg-[var(--color-primary)]/30 text-white/80",
              )}
            >
              {isEditing ? "保存修改" : "确 定"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

/* ============================================================
 * 子：Field
 * ============================================================ */
function Field({
  label,
  required,
  noMargin,
  children,
}: {
  label: string
  required?: boolean
  noMargin?: boolean
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "flex w-full flex-col",
        noMargin ? "gap-[var(--space-150)]" : "gap-[var(--space-150)]",
      )}
    >
      <span className="flex items-center gap-[var(--space-100)] text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] text-text-secondary">
        {label}
        {required ? (
          <span className="text-[var(--color-error,#ef4444)]">*</span>
        ) : null}
      </span>
      {children}
    </div>
  )
}

/* ============================================================
 * 子：CustomRepeatPanel
 * ------------------------------------------------------------
 * 嵌在「重复 / 截止」行下方的自定义面板（图二）：
 *  - 每 N [周 ▾]：N 可手输；unit v1 锁 "周"
 *  - 周日…周六：多选 chip；至少留一个（外层用 expandedStartAts.length 判空）
 *  - 截止时间：跟主预览同一份 untilLabel，read-only
 * ============================================================ */
function CustomRepeatPanel({
  intervalEvery,
  onIntervalChange,
  weekdays,
  onWeekdaysChange,
  untilLabel,
  customSummary,
}: {
  intervalEvery: number
  onIntervalChange: (v: number) => void
  weekdays: number[]
  onWeekdaysChange: (next: number[]) => void
  untilLabel: string
  customSummary: string
}) {
  const selected = React.useMemo(() => new Set(weekdays), [weekdays])
  const toggleDay = (d: number) => {
    const next = new Set(selected)
    if (next.has(d)) {
      /** 至少保留一个：用户清完最后一个则 noop（最终按钮也会 disabled） */
      next.delete(d)
    } else {
      next.add(d)
    }
    onWeekdaysChange(Array.from(next).sort((a, b) => a - b))
  }
  return (
    <div className="flex flex-col gap-[var(--space-250)] rounded-[var(--radius-md)] border border-[var(--color-primary)]/25 bg-[var(--color-primary)]/4 px-[var(--space-300)] py-[var(--space-300)]">
      {/* header：标题 + 一句话摘要 */}
      <div className="flex items-baseline justify-between gap-[var(--space-200)]">
        <span className="text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] text-text">
          自定义重复
        </span>
        {customSummary ? (
          <span className="truncate text-[length:var(--font-size-xs)] text-text-tertiary">
            {customSummary}
          </span>
        ) : null}
      </div>

      {/* 重复频率：每 [N] [周 ▾] */}
      <div className="flex items-center gap-[var(--space-200)]">
        <span className="shrink-0 text-[length:var(--font-size-sm)] text-text-secondary">
          重复频率：每
        </span>
        <input
          type="number"
          min={1}
          max={12}
          step={1}
          value={intervalEvery}
          onChange={(e) => {
            const n = Number(e.target.value)
            onIntervalChange(Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1)
          }}
          className="h-9 w-[64px] rounded-[var(--radius-md)] border border-border bg-bg px-[var(--space-200)] text-[length:var(--font-size-sm)] tabular-nums text-text outline-none transition-colors focus:border-[var(--color-primary)]/55"
        />
        {/*
         * unit：v1 仅"周"，dropdown 视觉保留但 disabled——与图二的灰色感一致；
         * 若以后扩"月"，去掉 disabled、把 options 多加一个即可。
         */}
        <div
          className="flex h-9 min-w-[88px] items-center justify-between gap-[var(--space-150)] rounded-[var(--radius-md)] border border-border bg-bg-tertiary px-[var(--space-250)] text-[length:var(--font-size-sm)] text-text-secondary"
          title="v1 仅支持以「周」为周期"
        >
          <span>周</span>
          <span aria-hidden className="text-text-tertiary">
            ▾
          </span>
        </div>
      </div>

      {/* 周日 ~ 周六 多选 chips */}
      <div className="flex flex-wrap items-center gap-[var(--space-150)]">
        {WEEKDAY_LABELS.map((label, idx) => {
          const active = selected.has(idx)
          return (
            <button
              key={idx}
              type="button"
              onClick={() => toggleDay(idx)}
              aria-pressed={active}
              className={cn(
                "h-9 min-w-[56px] rounded-full border px-[var(--space-300)] text-[length:var(--font-size-sm)] transition-colors",
                active
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                  : "border-border bg-bg text-text hover:bg-[var(--black-alpha-11)]",
              )}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* 结束时间：read-only，跟主预览同一份 untilLabel */}
      <div className="flex items-center gap-[var(--space-200)]">
        <span className="shrink-0 text-[length:var(--font-size-sm)] text-text-secondary">
          结束时间：
        </span>
        <div
          className="flex h-9 flex-1 items-center justify-between rounded-[var(--radius-md)] border border-border bg-bg-tertiary px-[var(--space-300)] text-[length:var(--font-size-sm)] text-text-secondary"
          title="按课节数 + 自定义规则自动计算"
        >
          <span className="truncate">{untilLabel}</span>
          <span className="text-[length:var(--font-size-xs)] text-text-tertiary">
            自动
          </span>
        </div>
      </div>
    </div>
  )
}

/* ============================================================
 * 工具
 * ============================================================ */

function pad2(n: number): string {
  return String(n).padStart(2, "0")
}

function toDateInputValue(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function toTimeInputValue(d: Date): string {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

function combineDateAndTime(dateStr: string, timeStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number)
  const [hh, mm] = timeStr.split(":").map(Number)
  if (
    !Number.isFinite(y) ||
    !Number.isFinite(m) ||
    !Number.isFinite(d) ||
    !Number.isFinite(hh) ||
    !Number.isFinite(mm)
  ) {
    return Number.NaN
  }
  return new Date(y, (m as number) - 1, d, hh, mm, 0, 0).getTime()
}

function weekdayCN(d: Date): string {
  return ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][d.getDay()]!
}
