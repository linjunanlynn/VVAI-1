/**
 * 教育门户 · 「课程课表」专属卡（智能课表助手）
 *
 * 菜单绑定
 * ----------------------------------------------------
 * 仅由 dock 菜单 `ecm_schedule`（课程管理 · 课程课表） 触发，与 `egm_course`（商品管理 ·
 * 课程商品）严格区分：
 *   - ecm_schedule（本卡）：课程列表 + 排课 + 创建课程 + 上传大纲
 *   - egm_course：保留原 `EduDockMenuCard` 的"在售 / 上新 / 转化"业务摘要语义
 * 文件名沿用历史的 `EduCourseProductsCard`，含义已迁移；marker 字符串不动以避免破坏会话回放。
 *
 * 闭环演示中的角色
 * ----------------------------------------------------
 * 这是"创建课程"链路的源头入口：
 *   教师点 教育 → 课程课表 → 该卡片 → 顶部「+ 创建课程」 →
 *   `MainAIChatWindow.openCreateCourseSidePanel()`（侧边子 CUI · 替代旧的弹窗） →
 *   提交（含可选的「上传课程大纲」） → `eduCoursesPersistence.createCourse` +
 *   可选 `uploadCourseOutline`（解析中 → 1.5s 后写入课次目录） → 关闭侧栏 →
 *   列表通过 store 订阅自动刷新出现新课。
 *
 * 视觉布局
 * ----------------------------------------------------
 *  顶部：AI 开场气泡（紧邻外层 AI 头像，不是另一条消息）
 *  卡身：
 *    1. 工具条：搜索框 + 4 个筛选下拉（老师 / 课包类型 / 教学模式 / 授课方式）+ 主按钮「+ 创建课程」
 *    2. 课程行：
 *       · 名称（大字加粗）
 *       · 标签 chip [系列课] [一对多]
 *       · 元信息行（学科 / 学段 / 授课方式 / 主讲 / 已关联商品 ▾）
 *       · 排课状态行（暂无排课表 / 已建 N 个课次）+ 行内 CTA
 *       · 右下 4 个图标按钮（添加排课 / 上下架锁 / 编辑 / 删除）
 *
 * Marker 协议
 * ----------------------------------------------------
 * `<<<RENDER_EDU_COURSE_PRODUCTS_CARD>>>:{json}`
 *   payload: { spaceOrgId, spaceScenario? }
 */

import * as React from "react"
import {
  BookOpen,
  CalendarPlus,
  ChevronDown,
  GraduationCap,
  Lock,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  User,
} from "lucide-react"
import { GenericCard } from "./GenericCard"
import { cn } from "../ui/utils"
import {
  listCourses,
  subscribeEduCourses,
  type CourseRecord,
  type SpaceContext,
} from "./eduCoursesPersistence"

/* ============================================================
 * Marker 协议
 * ============================================================ */

export const RENDER_EDU_COURSE_PRODUCTS_CARD_MARKER =
  "<<<RENDER_EDU_COURSE_PRODUCTS_CARD>>>"

export interface EduCourseProductsMarkerPayload {
  spaceOrgId: string
  spaceScenario?: string
}

export function buildEduCourseProductsMarkerContent(
  payload: EduCourseProductsMarkerPayload,
): string {
  return `${RENDER_EDU_COURSE_PRODUCTS_CARD_MARKER}:${JSON.stringify(payload)}`
}

export function parseEduCourseProductsMarkerContent(
  content: string,
): EduCourseProductsMarkerPayload | null {
  if (typeof content !== "string") return null
  if (!content.startsWith(`${RENDER_EDU_COURSE_PRODUCTS_CARD_MARKER}:`)) return null
  try {
    const json = content.slice(`${RENDER_EDU_COURSE_PRODUCTS_CARD_MARKER}:`.length)
    const parsed = JSON.parse(json) as EduCourseProductsMarkerPayload
    if (!parsed || typeof parsed.spaceOrgId !== "string") return null
    return parsed
  } catch {
    return null
  }
}

/* ============================================================
 * 主组件
 * ============================================================ */

const DELIVERY_LABEL_FULL: Record<CourseRecord["deliveryMode"], string> = {
  online: "线上直播",
  offline: "线下面授",
  hybrid: "线上 + 线下",
}

/** 顶部筛选项（demo：仅做静态展示 + 受控但不真正过滤） */
const FILTER_DEFS = [
  { id: "teacher", label: "老师", options: ["全部老师", "王老师", "李老师", "陈老师"] },
  {
    id: "courseType",
    label: "课包类型",
    options: ["全部类型", "系列课", "单次课", "试听课"],
  },
  {
    id: "mode",
    label: "教学模式",
    options: ["全部模式", "一对一", "一对多", "小班课", "大班课"],
  },
  {
    id: "delivery",
    label: "授课方式",
    options: ["全部授课方式", "线上直播", "线下面授", "线上 + 线下"],
  },
] as const

export interface EduCourseProductsCardProps {
  payload: EduCourseProductsMarkerPayload
  /** AI 反馈通道：父级把摘要推回主对话 */
  onPickPrompt: (prompt: string) => void
  /** 「创建课程」主按钮 → 父级打开「创建课程」侧边子 CUI */
  onCreateCourse: () => void
  /**
   * 「添加排课表 / 打开排课表」CTA 与右下"添加排课"图标 → 父级打开
   * 「创建排课表」侧边子 CUI；提交完成后通过 store 通知，本卡自动刷新
   * 出"已排 M / N 节"。
   *
   * mode 区分：
   *  - "create" → 子 CUI 建一张新的草稿（finalized=false），取消会清掉
   *  - "edit"   → 子 CUI 直接打开课程现有 finalized 排课表，让日历能看到已有占位
   */
  onOpenSchedule: (courseId: string, mode: "create" | "edit") => void
}

export function EduCourseProductsCard({
  payload,
  onPickPrompt,
  onCreateCourse,
  onOpenSchedule,
}: EduCourseProductsCardProps) {
  const ctx: SpaceContext = React.useMemo(
    () => ({ orgId: payload.spaceOrgId, scenario: payload.spaceScenario }),
    [payload.spaceOrgId, payload.spaceScenario],
  )

  const courses = useSubscribedCourses(ctx)
  const [keyword, setKeyword] = React.useState("")
  const [filters, setFilters] = React.useState<Record<string, string>>(
    () =>
      Object.fromEntries(FILTER_DEFS.map((f) => [f.id, f.options[0]])) as Record<
        string,
        string
      >,
  )

  /** demo：仅按关键字做轻量过滤；下拉筛选只展示状态不真正过滤 */
  const visible = React.useMemo(() => {
    const k = keyword.trim().toLowerCase()
    if (!k) return courses
    return courses.filter((c) =>
      [c.name, c.subject, c.stage].some((s) => s.toLowerCase().includes(k)),
    )
  }, [courses, keyword])

  return (
    <div className="flex w-full max-w-[min(100%,720px)] flex-col gap-[var(--space-200)]">
      {/* === AI 开场气泡（与外层 AI 头像同一条消息，视觉上"附在头像旁"） === */}
      <div className="rounded-[var(--radius-lg)] border border-border bg-bg px-[var(--space-300)] py-[var(--space-250)] text-[length:var(--font-size-sm)] leading-relaxed text-text">
        课程排课助手已就绪。下方汇总了本空间下的全部课程：用顶部搜索 / 筛选定位，点行可看排课与关联商品；右上角「+ 创建课程」可新增一门并自动在微盘建文件夹。
      </div>

      {/* === 主卡 === */}
      <GenericCard>
        {/* 工具条：搜索 + 筛选 + 创建课程 */}
        <div className="flex w-full flex-wrap items-center gap-[var(--space-200)]">
          {/* 搜索框 */}
          <div className="relative flex h-9 min-w-[200px] flex-1 items-center">
            <Search
              className="absolute left-[var(--space-300)] size-4 text-text-tertiary"
              strokeWidth={1.8}
              aria-hidden
            />
            <input
              type="text"
              placeholder="搜索"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="h-9 w-full rounded-full border border-border bg-bg pl-[34px] pr-[var(--space-300)] text-[length:var(--font-size-sm)] text-text outline-none transition-colors focus:border-[var(--color-primary)]/55"
            />
          </div>

          {/* 筛选下拉 */}
          {FILTER_DEFS.map((def) => (
            <FilterDropdown
              key={def.id}
              label={def.label}
              value={filters[def.id] ?? def.options[0]}
              options={def.options as readonly string[]}
              onChange={(v) =>
                setFilters((prev) => ({ ...prev, [def.id]: v }))
              }
            />
          ))}

          {/* 刷新（小辅助按钮，对齐截图右上的"刷新"语义） */}
          <button
            type="button"
            onClick={() =>
              onPickPrompt(`刷新 ${visible.length} 个课程的排课与状态`)
            }
            aria-label="刷新课程列表"
            className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-bg text-text-secondary transition-colors hover:bg-[var(--black-alpha-11)] hover:text-text"
          >
            <RefreshCw className="size-4" strokeWidth={1.8} />
          </button>

          {/* 创建课程主按钮 */}
          <button
            type="button"
            onClick={onCreateCourse}
            className="ml-auto inline-flex h-9 shrink-0 items-center gap-[var(--space-100)] rounded-full bg-[var(--color-primary)] px-[var(--space-400)] text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-white shadow-sm transition-colors hover:bg-[var(--color-primary)]/90"
          >
            <Plus className="size-4" strokeWidth={2.2} />
            创建课程
          </button>
        </div>

        {/* 列表 / 空态 */}
        {visible.length > 0 ? (
          <ul className="m-0 mt-[var(--space-300)] flex w-full list-none flex-col gap-[var(--space-200)] p-0">
            {visible.map((c) => (
              <CourseRow
                key={c.id}
                course={c}
                onPickPrompt={onPickPrompt}
                onOpenSchedule={onOpenSchedule}
              />
            ))}
          </ul>
        ) : (
          <div className="mt-[var(--space-300)] flex w-full flex-col items-center gap-[var(--space-150)] rounded-[var(--radius-md)] border border-dashed border-border bg-bg-tertiary px-[var(--space-300)] py-[var(--space-400)]">
            <p className="m-0 text-[length:var(--font-size-sm)] text-text-secondary">
              {keyword
                ? `没有找到匹配 "${keyword}" 的课程。换个关键词试试，或点右上「创建课程」新增。`
                : "当前空间还没有课程。点右上「创建课程」开始第一节。"}
            </p>
          </div>
        )}
      </GenericCard>
    </div>
  )
}

/* ============================================================
 * 子：单条课程行（截图样式）
 * ============================================================ */

function CourseRow({
  course,
  onPickPrompt,
  onOpenSchedule,
}: {
  course: CourseRecord
  onPickPrompt: (prompt: string) => void
  onOpenSchedule: (courseId: string, mode: "create" | "edit") => void
}) {
  /**
   * 排课状态：
   *   - finalizedOccCount = 课程下所有 finalized 排课表 occurrences 总数
   *   - 0 → 「暂无排课表，添加排课表」
   *   - >0 → 「已排 M / N 节」+ 「打开排课表」
   */
  const finalizedOccCount = React.useMemo(
    () =>
      course.schedules
        .filter((s) => s.finalized)
        .reduce((acc, s) => acc + s.occurrences.length, 0),
    [course.schedules],
  )
  const hasSchedule = finalizedOccCount > 0
  /** 标签：>1 节 = 系列课；教学模式 chip 跟 course.teachingFormat 走 */
  const tagChips = React.useMemo(() => {
    const t: string[] = []
    if (course.sessionCount > 1) t.push("系列课")
    t.push(formatLabelOf(course.teachingFormat))
    return t
  }, [course.sessionCount, course.teachingFormat])

  /** 主讲（demo · 从 outline 文件名 / 课程名首字符稳定派生） */
  const teacher = React.useMemo(() => {
    const seedSource = `${course.id}|${course.name}`
    const pool = ["王老师", "李老师", "陈老师", "Lisa", "张老师", "刘老师"]
    let h = 0
    for (let i = 0; i < seedSource.length; i++) {
      h = (Math.imul(h, 31) + seedSource.charCodeAt(i)) | 0
    }
    return pool[Math.abs(h) % pool.length] ?? "王老师"
  }, [course.id, course.name])

  return (
    <li className="flex w-full flex-col gap-[var(--space-200)] rounded-[var(--radius-md)] border border-border bg-bg px-[var(--space-300)] py-[var(--space-300)] transition-colors hover:bg-bg-secondary/40">
      {/* 名称 */}
      <div className="flex w-full min-w-0 items-center gap-[var(--space-200)]">
        <h4 className="m-0 min-w-0 flex-1 truncate text-[length:var(--font-size-md)] font-[var(--font-weight-semibold)] text-text">
          {course.name}
        </h4>
      </div>

      {/* 标签 chip 行 */}
      {tagChips.length > 0 ? (
        <div className="flex w-full flex-wrap gap-[var(--space-150)]">
          {tagChips.map((t) => (
            <span
              key={t}
              className="inline-flex h-6 items-center rounded-[var(--radius-sm)] bg-bg-secondary px-[var(--space-200)] text-[length:var(--font-size-xs)] text-text-secondary"
            >
              {t}
            </span>
          ))}
        </div>
      ) : null}

      {/* 元信息行 */}
      <div className="flex w-full flex-wrap items-center gap-x-[var(--space-300)] gap-y-[var(--space-100)] text-[length:var(--font-size-xs)] text-text-tertiary">
        <MetaItem icon={BookOpen}>{course.subject}</MetaItem>
        <MetaItem icon={GraduationCap}>{course.stage}</MetaItem>
        <MetaItem icon={MapPin}>{DELIVERY_LABEL_FULL[course.deliveryMode]}</MetaItem>
        <MetaItem icon={User}>{teacher}</MetaItem>
        <button
          type="button"
          onClick={() => onPickPrompt(`查看《${course.name}》关联的商品`)}
          className="inline-flex items-center gap-[2px] rounded-[var(--radius-sm)] px-[var(--space-100)] text-text-tertiary transition-colors hover:bg-[var(--black-alpha-11)] hover:text-text"
        >
          已关联 0 个商品
          <ChevronDown className="size-3" strokeWidth={1.8} />
        </button>
      </div>

      {/* 分隔线 */}
      <div className="h-px w-full bg-border" />

      {/* 排课状态 + 右下操作图标 */}
      <div className="flex w-full flex-wrap items-center gap-[var(--space-200)]">
        {/* 左侧：状态文案 + 行内 CTA */}
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-[var(--space-150)] text-[length:var(--font-size-xs)] text-text-tertiary">
          {hasSchedule ? (
            <>
              <span>
                已排 {finalizedOccCount} / {course.sessionCount} 节
                {course.lessons.length > 0
                  ? ` · 已建 ${course.lessons.length} 个课次目录`
                  : ""}
                {course.outline?.parsed
                  ? "（大纲已解析）"
                  : course.outline
                    ? "（大纲解析中…）"
                    : ""}
              </span>
              <button
                type="button"
                onClick={() => onOpenSchedule(course.id, "edit")}
                className="text-[var(--color-primary)] transition-colors hover:underline"
              >
                打开排课表
              </button>
            </>
          ) : (
            <>
              <span>
                {course.lessons.length > 0
                  ? `已建 ${course.lessons.length} 个课次目录，暂无排课表`
                  : "暂无排课表，可添加后在此管理时间与老师"}
              </span>
              <button
                type="button"
                onClick={() => onOpenSchedule(course.id, "create")}
                className="text-[var(--color-primary)] transition-colors hover:underline"
              >
                添加排课表
              </button>
            </>
          )}
        </div>

        {/* 右下：4 个操作图标按钮（添加排课图标接到 onOpenSchedule，与左侧 CTA 同链路） */}
        <div className="ml-auto flex shrink-0 items-center gap-[var(--space-50)]">
          <RowIconButton
            icon={CalendarPlus}
            ariaLabel={finalizedOccCount > 0 ? "打开排课表" : "添加排课表"}
            onClick={() =>
              onOpenSchedule(course.id, finalizedOccCount > 0 ? "edit" : "create")
            }
          />
          <RowIconButton
            icon={Lock}
            ariaLabel="下架课程"
            onClick={() => onPickPrompt(`下架《${course.name}》`)}
          />
          <RowIconButton
            icon={Pencil}
            ariaLabel="编辑课程"
            onClick={() => onPickPrompt(`编辑《${course.name}》`)}
          />
          <RowIconButton
            icon={Trash2}
            ariaLabel="删除课程"
            tone="danger"
            onClick={() => onPickPrompt(`删除《${course.name}》`)}
          />
        </div>
      </div>
    </li>
  )
}

/* ============================================================
 * 教学模式中文标签（行 chip 用）
 * ============================================================ */
function formatLabelOf(f: CourseRecord["teachingFormat"]): string {
  switch (f) {
    case "1on1":
      return "一对一"
    case "1on_many":
      return "一对多"
    case "small_class":
      return "小班课"
    case "big_class":
      return "大班课"
    default:
      return "一对多"
  }
}

/* ============================================================
 * 子：MetaItem / FilterDropdown / RowIconButton
 * ============================================================ */

function MetaItem({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  children: React.ReactNode
}) {
  return (
    <span className="inline-flex items-center gap-[4px]">
      <Icon className="size-[14px] text-text-tertiary" strokeWidth={1.8} />
      {children}
    </span>
  )
}

function FilterDropdown({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: readonly string[]
  onChange: (v: string) => void
}) {
  /**
   * 用原生 select 包装（保留下拉的可访问性 + 移动端体验），外观贴近截图：
   * - 圆角 chip 风格
   * - 显示 "label" 而不是当前值（截图里下拉只显示一致的功能名）
   */
  return (
    <label className="relative inline-flex h-9 cursor-pointer items-center rounded-full border border-border bg-bg pl-[var(--space-300)] pr-[var(--space-300)] text-[length:var(--font-size-sm)] text-text-secondary transition-colors hover:bg-[var(--black-alpha-11)]">
      <span className="pointer-events-none mr-[2px]">{label}</span>
      <ChevronDown
        className="pointer-events-none size-3 text-text-tertiary"
        strokeWidth={1.8}
      />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 cursor-pointer appearance-none bg-transparent opacity-0"
        aria-label={label}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </label>
  )
}

function RowIconButton({
  icon: Icon,
  ariaLabel,
  onClick,
  tone,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  ariaLabel: string
  onClick: () => void
  tone?: "danger"
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={cn(
        "flex size-7 items-center justify-center rounded-md transition-colors",
        tone === "danger"
          ? "text-text-secondary hover:bg-[var(--color-error,#ef4444)]/10 hover:text-[var(--color-error,#ef4444)]"
          : "text-text-secondary hover:bg-[var(--black-alpha-11)] hover:text-text",
      )}
    >
      <Icon className="size-[14px]" strokeWidth={1.8} />
    </button>
  )
}

/* ============================================================
 * 子：useSyncExternalStore 订阅 store
 * ============================================================ */
function useSubscribedCourses(ctx: SpaceContext): CourseRecord[] {
  const subscribe = React.useCallback(
    (l: () => void) => subscribeEduCourses(l),
    [],
  )
  const getServerSnapshot = React.useCallback(() => "", [])
  const snap = React.useSyncExternalStore(
    subscribe,
    () => {
      const list = listCourses(ctx)
      /** 把"列表长度 + 每个 course id + outline.parsed 状态 + 课次数 + finalized 排课 occurrences 数"压成 hash，
       *  确保大纲解析完成、课次写入、排课表 finalize 都触发刷新 */
      return list
        .map((c) => {
          const finalizedOcc = c.schedules
            .filter((s) => s.finalized)
            .reduce((acc, s) => acc + s.occurrences.length, 0)
          return `${c.id}:${c.outline?.parsed ? 1 : c.outline ? 0 : "n"}:${c.lessons.length}:${c.schedules.length}:${finalizedOcc}`
        })
        .join("|")
    },
    getServerSnapshot,
  )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return React.useMemo(() => listCourses(ctx), [snap, ctx])
}
