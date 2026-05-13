/**
 * 教育门户 · 「课程商品」专属卡（商品列表 · 点击进课程子 CUI）
 *
 * 菜单绑定
 * ----------------------------------------------------
 * 仅由 dock 菜单 `egm_course`（商品管理 · 课程商品） 触发，与 `ecm_schedule`（课程管理 ·
 * 课程课表）严格区分：
 *   - egm_course（本卡）：「在售商品列表」浏览态——每行点击直接进对应课程的系列子 CUI
 *   - ecm_schedule：「课程课表」管理态（创建课程 / 上传大纲 / 添加排课表 / 删除）
 *
 * 闭环演示中的角色
 * ----------------------------------------------------
 * 这是教师/管理者「日常巡店 · 看商品」的入口。区别于 ecm_schedule 的"管理态"：
 *  - 没有「+ 创建课程」CTA（创建走 ecm_schedule）
 *  - 没有 排课 / 编辑 / 删除 / 下架 等行内操作
 *  - 整行可点 → 直接落到该课程的系列子 CUI（学生 / 家长 / 教师都能用同款入口）
 *
 *  与原 `EduDockMenuCard` 的"在售/上新/转化"业务摘要语义保持一致：
 *  顶部仍渲染 `educationDockMenuRegistry.egm_course` 的 headline + stats + prompts，
 *  下面追加可点击的商品列表（来自 `eduCoursesPersistence.listCourses`）。
 *
 * Marker 协议
 * ----------------------------------------------------
 * `<<<RENDER_EDU_COURSE_GOODS_CARD>>>:{json}`
 *   payload: { spaceOrgId, spaceScenario? }
 */

import * as React from "react"
import {
  BookOpen,
  ChevronRight,
  GraduationCap,
  Layers,
  MapPin,
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
import {
  getEduDockMenuCardData,
  type EduDockMenuStat,
} from "./educationDockMenuRegistry"

/* ============================================================
 * Marker 协议
 * ============================================================ */

export const RENDER_EDU_COURSE_GOODS_CARD_MARKER =
  "<<<RENDER_EDU_COURSE_GOODS_CARD>>>"

export interface EduCourseGoodsMarkerPayload {
  spaceOrgId: string
  spaceScenario?: string
}

export function buildEduCourseGoodsMarkerContent(
  payload: EduCourseGoodsMarkerPayload,
): string {
  return `${RENDER_EDU_COURSE_GOODS_CARD_MARKER}:${JSON.stringify(payload)}`
}

export function parseEduCourseGoodsMarkerContent(
  content: string,
): EduCourseGoodsMarkerPayload | null {
  if (typeof content !== "string") return null
  if (!content.startsWith(`${RENDER_EDU_COURSE_GOODS_CARD_MARKER}:`)) return null
  try {
    const json = content.slice(`${RENDER_EDU_COURSE_GOODS_CARD_MARKER}:`.length)
    const parsed = JSON.parse(json) as EduCourseGoodsMarkerPayload
    if (!parsed || typeof parsed.spaceOrgId !== "string") return null
    return parsed
  } catch {
    return null
  }
}

/* ============================================================
 * 视觉常量
 * ============================================================ */

const DELIVERY_LABEL_FULL: Record<CourseRecord["deliveryMode"], string> = {
  online: "线上直播",
  offline: "线下面授",
  hybrid: "线上 + 线下",
}

function teachingFormatChipText(f: CourseRecord["teachingFormat"]): string {
  switch (f) {
    case "1on1":
      return "一对一"
    case "1on_many":
      return "一对多"
    case "small_class":
      return "小班课"
    case "big_class":
      return "大班课"
  }
}

const TONE_BORDER: Record<NonNullable<EduDockMenuStat["tone"]>, string> = {
  info: "border-[var(--color-info)]/30 bg-[var(--color-info)]/5",
  warning: "border-[var(--color-warning)]/30 bg-[var(--color-warning)]/5",
  success: "border-[var(--color-success)]/30 bg-[var(--color-success)]/5",
  default: "border-border bg-bg",
}

const TONE_VALUE_COLOR: Record<NonNullable<EduDockMenuStat["tone"]>, string> = {
  info: "text-[var(--color-info)]",
  warning: "text-[var(--color-warning)]",
  success: "text-[var(--color-success)]",
  default: "text-text",
}

/* ============================================================
 * 主组件
 * ============================================================ */

export interface EduCourseGoodsCardProps {
  payload: EduCourseGoodsMarkerPayload
  /**
   * 行点击 / 「进入课程」按钮 → 父级打开对应课程的系列子 CUI。
   * - seeded 课程（id 形如 `course-series-...`）→ 父级会 trim 出 `series-...` 在 DEMO 表里查
   * - 新建课程 → 父级用 `synth-${courseId}` 兜底 + buildSeriesFromCourse 合成
   *
   * 这里只负责把 courseId / seriesId 抛上去，匹配规则交给父级（与 EduCourseFulfillmentCard 同链路）。
   */
  onOpenCourse: (courseId: string) => void
  /** AI 反馈通道：底部推荐指令点击 → 父级 push 主对话回执 */
  onPickPrompt: (prompt: string) => void
  /**
   * 兼顾原 EduDockMenuCard 的 role：影响顶部 headline / stats / prompts 的"教师 vs 学生"维度。
   * 默认 teacher（与原 dock 菜单常用角色一致）。
   */
  role?: "teacher" | "student" | "parent" | "admin"
}

export function EduCourseGoodsCard({
  payload,
  onOpenCourse,
  onPickPrompt,
  role = "teacher",
}: EduCourseGoodsCardProps) {
  const ctx: SpaceContext = React.useMemo(
    () => ({ orgId: payload.spaceOrgId, scenario: payload.spaceScenario }),
    [payload.spaceOrgId, payload.spaceScenario],
  )

  const courses = useSubscribedCourses(ctx)

  /**
   * 顶部业务摘要：复用 `educationDockMenuRegistry.egm_course` 的固定文案 + stats + prompts，
   * 与原 `EduDockMenuCard` 视觉一致（避免"原卡片没了"的感受）。
   */
  const dockData = React.useMemo(() => {
    return getEduDockMenuCardData(role, "egm_course") ?? null
  }, [role])

  return (
    <div className="flex w-full max-w-[min(100%,720px)] flex-col gap-[var(--space-200)]">
      {/* === AI 开场气泡（同 EduCourseProductsCard 同款） === */}
      <div className="rounded-[var(--radius-lg)] border border-border bg-bg px-[var(--space-300)] py-[var(--space-250)] text-[length:var(--font-size-sm)] leading-relaxed text-text">
        当前空间在售课程商品如下，点任意一个可直接进入对应课程子 CUI 看资料 / 问问题 / 复盘。
        <span className="ml-1 text-text-tertiary">
          需要新建 / 排课请到「课程管理 · 课程课表」。
        </span>
      </div>

      <GenericCard title={dockData ? `${dockData.appName} · ${dockData.menuName}` : "课程商品"}>
        {dockData ? (
          <>
            {/* headline */}
            <div className="flex w-full items-start gap-[var(--space-200)] rounded-[var(--radius-md)] border border-border bg-bg-tertiary px-[var(--space-300)] py-[var(--space-250)]">
              <span className="text-[length:var(--font-size-sm)] font-[var(--font-weight-semi-bold)] text-text leading-tight">
                {dockData.headline}
              </span>
            </div>

            {/* 4-stat banner */}
            {dockData.stats.length > 0 ? (
              <div
                className={cn(
                  "mt-[var(--space-300)] grid w-full gap-[var(--space-200)]",
                  dockData.stats.length >= 4
                    ? "grid-cols-2 sm:grid-cols-4"
                    : `grid-cols-2 sm:grid-cols-${dockData.stats.length}`,
                )}
              >
                {dockData.stats.slice(0, 4).map((c) => {
                  const tone = c.tone ?? "default"
                  return (
                    <div
                      key={c.label}
                      className={cn(
                        "flex flex-col items-start gap-[var(--space-50)] rounded-[var(--radius-md)] border px-[var(--space-200)] py-[var(--space-200)]",
                        TONE_BORDER[tone],
                      )}
                    >
                      <span className="text-[length:var(--font-size-xs)] text-text-tertiary">
                        {c.label}
                      </span>
                      <span
                        className={cn(
                          "text-[length:var(--font-size-md)] font-[var(--font-weight-semi-bold)]",
                          TONE_VALUE_COLOR[tone],
                        )}
                      >
                        {c.value}
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : null}
          </>
        ) : null}

        {/* === 商品列表（每行点击 → 进对应课程子 CUI） === */}
        <div className="mt-[var(--space-300)] flex w-full items-center justify-between">
          <h4 className="m-0 text-[length:var(--font-size-sm)] font-[var(--font-weight-semi-bold)] text-text">
            在售课程
          </h4>
          <span className="text-[length:var(--font-size-xs)] text-text-tertiary">
            共 {courses.length} 门 · 点行进入
          </span>
        </div>

        {courses.length > 0 ? (
          <ul className="m-0 mt-[var(--space-200)] flex w-full list-none flex-col gap-[var(--space-150)] p-0">
            {courses.map((c) => (
              <CourseGoodsRow key={c.id} course={c} onOpen={() => onOpenCourse(c.id)} />
            ))}
          </ul>
        ) : (
          <div className="mt-[var(--space-200)] flex w-full flex-col items-center gap-[var(--space-100)] rounded-[var(--radius-md)] border border-dashed border-border bg-bg-tertiary px-[var(--space-300)] py-[var(--space-400)]">
            <p className="m-0 text-[length:var(--font-size-sm)] text-text-secondary">
              当前空间还没有课程商品。可到「课程管理 · 课程课表」点「+ 创建课程」新增。
            </p>
          </div>
        )}

        {/* === 底部推荐指令（保留原 EduDockMenuCard 的 prompts，避免空感） === */}
        {dockData && dockData.prompts.length > 0 ? (
          <div className="mt-[var(--space-300)] flex w-full flex-wrap gap-[var(--space-150)]">
            {dockData.prompts.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => onPickPrompt(p)}
                className={cn(
                  "inline-flex h-8 shrink-0 items-center justify-center rounded-full",
                  "border border-border bg-bg px-[var(--space-300)] text-[length:var(--font-size-sm)] text-text",
                  "transition-colors hover:bg-[var(--black-alpha-11)]",
                )}
              >
                {p}
              </button>
            ))}
          </div>
        ) : null}
      </GenericCard>
    </div>
  )
}

/* ============================================================
 * 子：单门课程的"商品行"
 * ----------------------------------------------------
 * - 整行可点 → onOpen()
 * - 视觉：左侧"封面色块"（首字母）+ 课程名 + chips 行 + 价格 chip + 右侧 chevron
 * ============================================================ */
function CourseGoodsRow({
  course,
  onOpen,
}: {
  course: CourseRecord
  onOpen: () => void
}) {
  const initial = course.name.trim().charAt(0) || "课"
  /**
   * 价格 demo：seeded 课程读自 `priceText`；新课程暂没字段 → 用 sessionCount 折算占位
   * （避免空白，且与"商品"语义一致）
   */
  const priceText = course.priceText
    ? course.priceText
    : `¥${(course.sessionCount * 198).toLocaleString()} / ${course.sessionCount} 节`

  /** 排课进度：已 finalized 的 occurrences 数 / sessionCount，便于"商品热度"感知 */
  const finalizedOccCount = React.useMemo(
    () =>
      course.schedules
        .filter((s) => s.finalized)
        .reduce((acc, s) => acc + s.occurrences.length, 0),
    [course.schedules],
  )

  return (
    <li className="m-0 p-0">
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          "group flex w-full items-center gap-[var(--space-300)] rounded-[var(--radius-md)] border border-border bg-bg",
          "px-[var(--space-300)] py-[var(--space-250)] text-left",
          "transition-all hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-primary)]/5",
        )}
      >
        {/* 左：封面色块（首字母） */}
        <span
          aria-hidden
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)]",
            "bg-gradient-to-br from-[var(--color-primary)]/15 to-[var(--color-primary)]/5",
            "text-[length:var(--font-size-md)] font-[var(--font-weight-semi-bold)] text-[var(--color-primary)]",
          )}
        >
          {initial}
        </span>

        {/* 中：名称 + chips */}
        <div className="flex min-w-0 flex-1 flex-col gap-[var(--space-100)]">
          <div className="flex min-w-0 items-center gap-[var(--space-200)]">
            <span className="truncate text-[length:var(--font-size-sm)] font-[var(--font-weight-semi-bold)] text-text">
              {course.name}
            </span>
            <span
              className={cn(
                "shrink-0 rounded-full px-[var(--space-200)] py-[1px] text-[length:var(--font-size-xs)]",
                "bg-[var(--color-primary)]/10 text-[var(--color-primary)]",
              )}
            >
              {teachingFormatChipText(course.teachingFormat)}
            </span>
          </div>
          {/* meta chips */}
          <div className="flex flex-wrap items-center gap-x-[var(--space-300)] gap-y-[var(--space-100)] text-[length:var(--font-size-xs)] text-text-tertiary">
            <span className="inline-flex items-center gap-[4px]">
              <BookOpen className="size-3.5" strokeWidth={1.8} />
              {course.subject}
            </span>
            <span className="inline-flex items-center gap-[4px]">
              <GraduationCap className="size-3.5" strokeWidth={1.8} />
              {course.stage}
            </span>
            <span className="inline-flex items-center gap-[4px]">
              <MapPin className="size-3.5" strokeWidth={1.8} />
              {DELIVERY_LABEL_FULL[course.deliveryMode]}
            </span>
            <span className="inline-flex items-center gap-[4px]">
              <User className="size-3.5" strokeWidth={1.8} />
              {course.teacherName ?? "未指定"}
            </span>
            <span className="inline-flex items-center gap-[4px]">
              <Layers className="size-3.5" strokeWidth={1.8} />
              {finalizedOccCount > 0
                ? `已排 ${finalizedOccCount}/${course.sessionCount} 节`
                : `${course.sessionCount} 节 · 待排`}
            </span>
          </div>
        </div>

        {/* 右：价格 + chevron */}
        <div className="flex shrink-0 flex-col items-end gap-[var(--space-100)]">
          <span className="text-[length:var(--font-size-sm)] font-[var(--font-weight-semi-bold)] text-[var(--color-primary)]">
            {priceText}
          </span>
          <span className="inline-flex items-center gap-[2px] text-[length:var(--font-size-xs)] text-text-tertiary group-hover:text-[var(--color-primary)]">
            进入
            <ChevronRight className="size-3.5" strokeWidth={1.8} />
          </span>
        </div>
      </button>
    </li>
  )
}

/* ============================================================
 * 子：useSyncExternalStore 订阅 store
 * ----------------------------------------------------
 * 与 EduCourseProductsCard 同款 hash，确保新建课程 / 大纲解析 / 排课 finalize
 * 都能驱动本卡刷新
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
