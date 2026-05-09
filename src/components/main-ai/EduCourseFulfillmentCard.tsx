/**
 * 课程履约（Course Fulfillment）卡片 —— 按业务方截图 1:1 复刻。
 *
 * 三大区块：
 * 1. 顶部工具条：日期选择 / 今天 / ← → / 搜索 / 老师·科目·状态筛选 / 创建计划
 * 2. 周一到周日 7 列日期带：以当前演示「今天」高亮（蓝色圆形填充）
 * 3. 课程履约行：时间 + 状态徽章 + 标题 + 标签链 + 11 个操作图标按钮
 * 4. 底部分页：共 N 条 / [<] [1] [>] / 10 / page / 共 1 页
 *
 * ───────────────────────────────────────────────────────────────────
 * 状态徽章 ↔ 子 CUI 单一事实
 * ───────────────────────────────────────────────────────────────────
 * 与 `AiClassroomLessonSeriesRow` 完全同源：
 *   1) 默认按系列级 `staticStatus` → SERIES_STATUS_BADGE
 *      - ongoing  → 「进行中」 主色
 *      - upcoming → 「未开课」 浅 info
 *      - completed → 「已结课」 灰
 *   2) 若系列的下一节恰好是顶栏 demo 主线课（boundLessonId === DEMO_LESSON.id），
 *      徽章被「课级 stage」（pre / in / post）接管，与 `AGENDA_STATUS_BADGE` 完全一致：
 *      - pre  → 「课前准备中」
 *      - in   → 「上课中」 + 脉冲
 *      - post → 「本节 · 已结束」
 *   这样用户在卡片里读到的状态，与点击进入子 CUI 后看到的徽章一一对应。
 *
 * ───────────────────────────────────────────────────────────────────
 * 行交互
 * ───────────────────────────────────────────────────────────────────
 * - 点击行（标题区域）→ 打开对应「系列课子 CUI」
 * - 点击行下方任一操作图标（资料 / 签到 / 请假 / 作业 / 风采 / 点评 / 沟通 / 成员 / 编辑 / 取消 / 删除）
 *   → 同样打开对应「系列课子 CUI」（demo 中所有 action 都路由到系列子 CUI；后续可按 action 分流）
 */
import * as React from "react"
import {
  Ban,
  BookOpen,
  Calendar as CalendarIcon,
  CalendarCheck,
  CalendarOff,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Folder,
  GraduationCap,
  MapPin,
  MessageCircle,
  MessageSquareText,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react"
import { cn } from "../ui/utils"
import type { EduSceneRole } from "./homeScenarioLayout"
import type { EducationStage } from "./educationStageDemo"

/* ------------------------------------------------------------
 * 操作图标：从左至右 11 个
 * 资料 / 签到 / 请假 / 作业 / 风采 / 点评 / 沟通 / 成员 / 编辑 / 取消 / 删除
 * ------------------------------------------------------------ */
const ROW_ACTIONS: { label: string; Icon: LucideIcon }[] = [
  { label: "资料", Icon: Folder },
  { label: "签到", Icon: CalendarCheck },
  { label: "请假", Icon: CalendarOff },
  { label: "作业", Icon: ClipboardList },
  { label: "风采", Icon: Sparkles },
  { label: "点评", Icon: MessageSquareText },
  { label: "沟通", Icon: MessageCircle },
  { label: "成员", Icon: Users },
  { label: "编辑", Icon: Pencil },
  { label: "取消", Icon: Ban },
  { label: "删除", Icon: Trash2 },
]

/* ------------------------------------------------------------
 * Demo 时空锚点：
 *
 * 整个 demo 体系把「今天」锚定在 **2026-03-12 周三**，与
 *   - `DEMO_LESSON.weekday = "周三"`（主线课在周三）
 *   - 力学专题 outline 5 「3/12 周三 19:00」(boundLessonId === DEMO_LESSON.id)
 *   - aiClassroomSkillRegistry 中文案如「本节（3/12 周三 19:00）」
 *  保持单一事实。
 *
 * 卡片里所有 calendar 化的展示（toolbar 月份 / 周日期带 / 行内相对时间）
 * 都派生自该锚点，避免「日期带显示 5 月、行里却写 3 月 / 1 月 / 7 月」的错配。
 * ------------------------------------------------------------ */
const DEMO_TODAY = {
  year: 2026,
  month: 3,
  day: 12,
  weekdayCN: "周三",
} as const

const WEEKDAY_LABELS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"] as const

const TODAY_WEEKDAY_IDX = WEEKDAY_LABELS.indexOf(
  DEMO_TODAY.weekdayCN as (typeof WEEKDAY_LABELS)[number],
)
const WEEK_MONDAY_DAY = DEMO_TODAY.day - TODAY_WEEKDAY_IDX

/** 周一 ~ 周日 7 列日期带（含今天） */
const WEEK_DAYS = WEEKDAY_LABELS.map((wd, i) => ({
  date: WEEK_MONDAY_DAY + i,
  weekday: wd,
  selected: i === TODAY_WEEKDAY_IDX,
}))

/** Toolbar 月份显示 `YYYY/MM` */
const TOOLBAR_MONTH_LABEL = `${DEMO_TODAY.year}/${String(DEMO_TODAY.month).padStart(2, "0")}`

/* ------------------------------------------------------------
 * 当日课次履约模拟数据：
 * 日期定位后，下方只展示该日期内真实发生的课次。
 * ------------------------------------------------------------ */
type FulfillmentStatus = "completed" | "soon" | "pending"

const FULFILLMENT_STATUS_BADGE: Record<FulfillmentStatus, { label: string; toneCls: string }> = {
  completed: {
    label: "已完课",
    toneCls: "border-[var(--color-border)] text-text-tertiary bg-[var(--color-bg-subtle)]",
  },
  soon: {
    label: "即将开始",
    toneCls:
      "border-[var(--color-primary)]/45 text-[var(--color-primary)] bg-[var(--color-primary)]/10",
  },
  pending: {
    label: "待开始",
    toneCls:
      "border-[var(--color-info)]/35 text-[var(--color-info)] bg-[var(--color-info)]/8",
  },
}

interface FulfillmentCourseItem {
  id: string
  selectedDate: string
  scheduledAt: string
  timeText: string
  title: string
  status: FulfillmentStatus
  tags: { Icon: LucideIcon; label: string }[]
  isCurrent?: boolean
  openSeriesId?: string
}

function toPureTimeRangeLabel(raw: string): string {
  const match = raw.match(/(\d{1,2}:\d{2}\s*[–-]\s*\d{1,2}:\d{2})/)
  return match?.[1] ?? raw
}

const SELECTED_DATE_ISO = `${DEMO_TODAY.year}-${String(DEMO_TODAY.month).padStart(2, "0")}-${String(
  DEMO_TODAY.day,
).padStart(2, "0")}`

const FULFILLMENT_DAY_ITEMS: FulfillmentCourseItem[] = [
  {
    id: "fulfillment-20260312-math-completed",
    selectedDate: "2026-03-12",
    scheduledAt: "2026-03-12 10:00",
    timeText: "今天 · 3/12 周三 10:00 – 10:45",
    title: "初一数学 · 函数图像专题（春 10 节）",
    status: "completed",
    tags: [
      { Icon: BookOpen, label: "数学" },
      { Icon: GraduationCap, label: "初一" },
      { Icon: UsersRound, label: "班课" },
      { Icon: ClipboardList, label: "进度 6/10" },
      { Icon: MapPin, label: "线下教室 B3" },
    ],
  },
  {
    id: "fulfillment-20260312-phy-current",
    selectedDate: "2026-03-12",
    scheduledAt: "2026-03-12 19:00",
    timeText: "今天 · 3/12 周三 19:00 – 19:45",
    title: "初一物理 · 力学专题（春 12 节）",
    status: "soon",
    isCurrent: true,
    openSeriesId: "series-phy-mech-2026spring",
    tags: [
      { Icon: BookOpen, label: "物理" },
      { Icon: GraduationCap, label: "初一" },
      { Icon: UsersRound, label: "班课" },
      { Icon: ClipboardList, label: "进度 4/12" },
      { Icon: MapPin, label: "线上互动教室 A1" },
    ],
  },
  {
    id: "fulfillment-20260312-eng-pending",
    selectedDate: "2026-03-12",
    scheduledAt: "2026-03-12 20:10",
    timeText: "今天 · 3/12 周三 20:10 – 20:55",
    title: "初一英语 · 阅读精讲（春 8 节）",
    status: "pending",
    tags: [
      { Icon: BookOpen, label: "英语" },
      { Icon: GraduationCap, label: "初一" },
      { Icon: UsersRound, label: "小班课" },
      { Icon: ClipboardList, label: "进度 2/8" },
      { Icon: MapPin, label: "线上互动教室 C1" },
    ],
  },
]

export interface EduCourseFulfillmentCardProps {
  role: EduSceneRole
  /**
   * 教育演示阶段仍由调用方传入，但课程履约卡按选中日期展示当天课次，
   * 状态固定为「待开始 / 即将开始 / 已完课」三类。
   */
  educationStage: EducationStage
  onOpenSeries: (seriesId: string) => void
}

export function EduCourseFulfillmentCard({
  role,
  educationStage,
  onOpenSeries,
}: EduCourseFulfillmentCardProps) {
  void role
  void educationStage
  const items = React.useMemo(
    () =>
      FULFILLMENT_DAY_ITEMS.filter((item) => item.selectedDate === SELECTED_DATE_ISO).sort((a, b) =>
        a.scheduledAt.localeCompare(b.scheduledAt),
      ),
    [],
  )

  return (
    <div className="flex w-full max-w-[min(100%,860px)] flex-col">
      <div
        className="rounded-[var(--radius-lg)] border border-border bg-bg"
        style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04)" }}
      >
        <div className="flex flex-col gap-[var(--space-300)] p-[var(--space-300)]">
          <Toolbar />
          <WeekStrip />
          <div className="flex flex-col gap-[var(--space-200)]">
            {items.map((item) => (
              <FulfillmentRow
                key={item.id}
                item={item}
                onOpen={item.openSeriesId ? () => onOpenSeries(item.openSeriesId) : undefined}
              />
            ))}
          </div>
          <FooterPagination total={items.length} />
        </div>
      </div>
    </div>
  )
}

/* ============================================================
 * 顶部工具条
 * ============================================================ */
function Toolbar() {
  return (
    <div className="flex flex-wrap items-center gap-[var(--space-150)]">
      {/* 日期选择 */}
      <button
        type="button"
        className="inline-flex h-8 items-center gap-[var(--space-150)] rounded-[var(--radius-sm)] border border-border bg-bg px-[var(--space-250)] text-[length:var(--font-size-sm)] text-text transition-colors hover:bg-[var(--black-alpha-11)]"
      >
        {TOOLBAR_MONTH_LABEL}
        <CalendarIcon className="h-3.5 w-3.5 text-text-tertiary" />
      </button>
      <button
        type="button"
        className="inline-flex h-8 items-center rounded-[var(--radius-sm)] border border-border bg-bg px-[var(--space-250)] text-[length:var(--font-size-sm)] text-text transition-colors hover:bg-[var(--black-alpha-11)]"
      >
        今天
      </button>
      <ToolIconButton ariaLabel="上一周">
        <ChevronLeft className="h-4 w-4" />
      </ToolIconButton>
      <ToolIconButton ariaLabel="下一周">
        <ChevronRight className="h-4 w-4" />
      </ToolIconButton>

      {/* 搜索 */}
      <div className="flex h-8 min-w-[180px] flex-1 items-center gap-[var(--space-150)] rounded-[var(--radius-sm)] border border-border bg-bg px-[var(--space-250)]">
        <Search className="h-3.5 w-3.5 text-text-tertiary" />
        <input
          type="text"
          placeholder="搜索标题"
          className="flex-1 bg-transparent text-[length:var(--font-size-sm)] text-text placeholder:text-text-tertiary outline-none"
        />
      </div>

      {/* 三个筛选下拉 */}
      <FilterChip>老师</FilterChip>
      <FilterChip>科目</FilterChip>
      <FilterChip>状态</FilterChip>

      {/* 创建计划（蓝色主按钮，右对齐） */}
      <button
        type="button"
        className="ml-auto inline-flex h-8 items-center gap-[var(--space-100)] rounded-[var(--radius-sm)] bg-[var(--color-primary)] px-[var(--space-300)] text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)] text-[var(--color-primary-foreground,white)] shadow-sm transition-colors hover:opacity-90"
      >
        <Plus className="h-4 w-4" />
        创建计划
      </button>
    </div>
  )
}

function ToolIconButton({
  ariaLabel,
  children,
}: {
  ariaLabel: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] border border-border bg-bg text-text-secondary transition-colors hover:bg-[var(--black-alpha-11)] hover:text-text"
    >
      {children}
    </button>
  )
}

function FilterChip({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="button"
      className="inline-flex h-8 items-center gap-[var(--space-100)] rounded-[var(--radius-sm)] px-[var(--space-200)] text-[length:var(--font-size-sm)] text-text-secondary transition-colors hover:bg-[var(--black-alpha-11)]"
    >
      {children}
      <ChevronDown className="h-3 w-3 text-text-tertiary" />
    </button>
  )
}

/* ============================================================
 * 周一 ~ 周日 日期带
 * ============================================================ */
function WeekStrip() {
  return (
    <div className="grid grid-cols-7 gap-[var(--space-150)]">
      {WEEK_DAYS.map((d) => {
        const isSelected = !!d.selected
        return (
          <button
            key={d.date}
            type="button"
            className={cn(
              "flex flex-col items-center justify-center gap-[2px] rounded-[var(--radius-md)] border bg-bg px-[var(--space-200)] py-[var(--space-200)] transition-colors",
              isSelected ? "border-transparent" : "border-border hover:bg-[var(--black-alpha-11)]",
            )}
          >
            <span
              className={cn(
                "inline-flex h-8 w-8 items-center justify-center rounded-full text-[length:var(--font-size-md)] font-[var(--font-weight-semibold)]",
                isSelected
                  ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground,white)]"
                  : "text-text",
              )}
            >
              {d.date}
            </span>
            <span
              className={cn(
                "text-[length:var(--font-size-xs)]",
                isSelected ? "text-[var(--color-primary)]" : "text-text-tertiary",
              )}
            >
              {d.weekday}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/* ============================================================
 * 单条课程履约行
 * ============================================================ */
function FulfillmentRow({
  item,
  onOpen,
}: {
  item: FulfillmentCourseItem
  onOpen?: () => void
}) {
  const badge = FULFILLMENT_STATUS_BADGE[item.status]
  const isInteractive = Boolean(onOpen)
  const timeRangeLabel = toPureTimeRangeLabel(item.timeText)
  return (
    <div
      className={cn(
        "rounded-[var(--radius-md)] border bg-bg transition-colors",
        item.isCurrent
          ? "border-[var(--color-primary)]/45 shadow-[0_2px_10px_rgba(64,93,251,0.08)]"
          : "border-border",
      )}
    >
      {/* 主区域：可点击 → 打开系列课子 CUI */}
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          "block w-full rounded-t-[var(--radius-md)] px-[var(--space-300)] pt-[var(--space-250)] pb-[var(--space-150)] text-left transition-colors",
          isInteractive && "hover:bg-[var(--black-alpha-11)]",
        )}
      >
        <div className="flex flex-wrap items-center gap-x-[var(--space-250)] gap-y-[var(--space-100)]">
          <span className="shrink-0 text-[length:var(--font-size-md)] font-[var(--font-weight-semibold)] tabular-nums text-text">
            {timeRangeLabel}
          </span>
          <h4 className="m-0 min-w-0 flex-1 truncate text-[length:var(--font-size-md)] font-[var(--font-weight-semibold)] text-text">
            {item.title}
          </h4>
          <span
            className={cn(
              "inline-flex shrink-0 items-center rounded-[var(--radius-sm)] border px-[var(--space-150)] py-[1px] text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)]",
              badge.toneCls,
            )}
          >
            {badge.label}
          </span>
          {item.isCurrent ? (
            <span className="inline-flex shrink-0 items-center rounded-[var(--radius-sm)] border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/8 px-[var(--space-150)] py-[1px] text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] text-[var(--color-primary)]">
              本节
            </span>
          ) : null}
        </div>
        <div className="mt-[var(--space-150)] flex flex-wrap items-center gap-x-[var(--space-300)] gap-y-[var(--space-100)] text-[length:var(--font-size-xs)] text-text-secondary">
          {item.tags.map(({ Icon, label }) => (
            <span key={label} className="inline-flex items-center gap-[var(--space-100)]">
              <Icon className="h-3.5 w-3.5 text-text-tertiary" />
              {label}
            </span>
          ))}
        </div>
      </button>

      {/* 操作图标条：右对齐 11 个图标按钮 */}
      <div className="flex items-center justify-end gap-[var(--space-50)] px-[var(--space-300)] pb-[var(--space-250)]">
        {ROW_ACTIONS.map(({ label, Icon }) => (
          <button
            key={label}
            type="button"
            onClick={onOpen}
            title={label}
            aria-label={label}
            className="inline-flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] text-text-secondary transition-colors hover:bg-[var(--black-alpha-11)] hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]/35"
          >
            <Icon className="h-4 w-4" />
          </button>
        ))}
      </div>
    </div>
  )
}

/* ============================================================
 * 底部分页（demo · 仅展示态）
 * ============================================================ */
function FooterPagination({ total }: { total: number }) {
  return (
    <div className="flex items-center justify-between text-[length:var(--font-size-xs)] text-text-tertiary">
      <span>共 {total} 条</span>
      <div className="flex items-center gap-[var(--space-150)]">
        <PagerArrow ariaLabel="上一页" disabled>
          <ChevronLeft className="h-3.5 w-3.5" />
        </PagerArrow>
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-primary)]/45 bg-[var(--color-primary)]/8 text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] text-[var(--color-primary)]">
          1
        </span>
        <PagerArrow ariaLabel="下一页">
          <ChevronRight className="h-3.5 w-3.5" />
        </PagerArrow>
        <button
          type="button"
          className="inline-flex h-7 items-center gap-[var(--space-100)] rounded-[var(--radius-sm)] border border-border bg-bg px-[var(--space-200)] text-[length:var(--font-size-xs)] text-text transition-colors hover:bg-[var(--black-alpha-11)]"
        >
          10 / page
          <ChevronDown className="h-3 w-3 text-text-tertiary" />
        </button>
      </div>
      <span>共 1 页</span>
    </div>
  )
}

function PagerArrow({
  ariaLabel,
  disabled,
  children,
}: {
  ariaLabel: string
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] border border-border bg-bg text-text-secondary transition-colors",
        disabled
          ? "cursor-not-allowed text-text-tertiary opacity-60"
          : "hover:bg-[var(--black-alpha-11)] hover:text-text",
      )}
    >
      {children}
    </button>
  )
}
