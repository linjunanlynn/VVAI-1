/**
 * 课表卡 / agenda 列表中的"系列课（课包）行"。
 *
 * 与单次课 LessonRow 在同一容器内混排：
 * - 视觉骨架对齐 LessonRow（左侧时间块 + 右侧状态徽章 + 进入箭头），
 *   但中间主体改为系列课信息：系列名 + 进度 + 下一课次提示
 * - 状态徽章使用系列粒度：
 *   · ongoing  → "进行中" 主色
 *   · upcoming → "即将开课" 浅 info
 *   · completed → "已结课" 灰
 * - 整行点击 → onPickSeries(seriesId) → 父组件打开系列课子 CUI（不进入单课 18 卡）
 */

import * as React from "react"
import { ChevronRight, Layers, User, CalendarClock } from "lucide-react"
import { cn } from "../ui/utils"
import type {
  AiClassroomLessonSeries,
  AiClassroomSeriesStatus,
} from "./aiClassroomLessonSeriesDemo"
import { getSeriesNextLessonLabel } from "./aiClassroomLessonSeriesDemo"
import { StatusBadge } from "./AiClassroomLessonRow"
import type { AgendaLessonStatus } from "./aiClassroomLessonsDemo"

const SERIES_STATUS_BADGE: Record<
  AiClassroomSeriesStatus,
  { label: string; tone: "ongoing" | "upcoming" | "completed" }
> = {
  ongoing: { label: "进行中", tone: "ongoing" },
  upcoming: { label: "未开课", tone: "upcoming" },
  completed: { label: "已结课", tone: "completed" },
}

const SERIES_BADGE_TONE: Record<"ongoing" | "upcoming" | "completed", string> = {
  ongoing:
    "border-[var(--color-primary)]/45 text-[var(--color-primary)] bg-[var(--color-primary)]/10",
  upcoming: "border-[var(--color-info)]/35 text-[var(--color-info)] bg-[var(--color-info)]/8",
  completed: "border-[var(--color-border)] text-text-tertiary bg-[var(--color-bg-subtle)]",
}

function SeriesStatusBadge({ status }: { status: AiClassroomSeriesStatus }) {
  const cfg = SERIES_STATUS_BADGE[status]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-[var(--space-200)] py-[2px] text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)]",
        SERIES_BADGE_TONE[cfg.tone],
      )}
    >
      {cfg.label}
    </span>
  )
}

export interface LessonSeriesRowProps {
  series: AiClassroomLessonSeries
  /** 副标按身份取（与单次课 row 同一规则） */
  subtitle: string
  /** 左侧时间块 weekday：取自下一课次的 weekday 文本（如 "周三"），系列已结课时为 null */
  nextWeekdayLabel: string | null
  /** 左侧时间块开始时间：HH:mm，已结课时为 null */
  nextStartTime: string | null
  /**
   * 课级状态覆盖：当系列的"下一节"恰好就是顶栏 demo 切换驱动的主线 DEMO_LESSON 时，
   * 父级（`AiClassroomScheduleCard`）会传入此节当下的 `AgendaLessonStatus`（pre / in / post），
   * 让本 row 的状态徽章直接显示「课前准备中 / 上课中 / 本节·已结束」。
   *
   * 设计动机：
   * - 系列级 staticStatus = `ongoing` 是宏观语义（系列在整个学期内有进度推进），
   *   课表里看到只会得到「进行中」，与顶栏正显示「课前·距开课 1h18m」对不上；
   * - 用户在课表关心的是"下一节当下到哪一步"，而不是"系列宏观还在不在"，
   *   所以下一节是主线时，让课级状态徽章顶上来；其它时候保持系列级徽章。
   */
  nextLessonStageStatus?: AgendaLessonStatus
  onPickSeries: () => void
}

export function LessonSeriesRow({
  series,
  subtitle,
  nextWeekdayLabel,
  nextStartTime,
  nextLessonStageStatus,
  onPickSeries,
}: LessonSeriesRowProps) {
  const nextLessonLabel = getSeriesNextLessonLabel(series)
  /**
   * 当下一节是主线时（接收到 nextLessonStageStatus），整行视觉沿用单次课 row 的"本节·主线"高亮：
   * - 主色边框 + 阴影：与 LessonRow.isMain 一致
   * - 课中（in）：再叠一圈 success 色 ring + 脉冲（同 LessonRow.isLive）
   */
  const isMainNext = nextLessonStageStatus != null
  const isLiveNext = nextLessonStageStatus === "in"
  return (
    <button
      type="button"
      onClick={onPickSeries}
      className={cn(
        "group relative flex w-full items-stretch gap-[var(--space-300)] rounded-[var(--radius-md)] border bg-bg px-[var(--space-300)] py-[var(--space-300)] text-left transition-all",
        isMainNext
          ? "border-[var(--color-primary)]/45 shadow-[0_2px_10px_rgba(64,93,251,0.10)]"
          : series.staticStatus === "ongoing"
            ? "border-[var(--color-primary)]/30 hover:border-[var(--color-primary)]/55"
            : "border-border hover:border-[var(--color-primary)]/35",
        isLiveNext && "ring-1 ring-[var(--color-success)]/40",
      )}
    >
      {/* 左侧：下一课次时间块（与单次课 row 同尺寸；已结课展示"已结课"占位） */}
      <div className="flex w-[64px] shrink-0 flex-col items-start justify-center border-r border-border/60 pr-[var(--space-300)]">
        {nextWeekdayLabel && nextStartTime ? (
          <>
            <span className="text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] text-text-tertiary">
              下次
            </span>
            <span className="mt-[2px] text-[length:var(--font-size-md)] font-[var(--font-weight-bold)] tabular-nums text-text">
              {nextStartTime}
            </span>
            <span className="text-[length:var(--font-size-xs)] text-text-tertiary tabular-nums">
              {nextWeekdayLabel}
            </span>
          </>
        ) : (
          <>
            <span className="text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] text-text-tertiary">
              系列
            </span>
            <span className="mt-[2px] text-[length:var(--font-size-xs)] text-text-tertiary">
              已结课
            </span>
          </>
        )}
      </div>

      {/* 中部：系列名 + 时段 + 老师 + 下一课 */}
      <div className="min-w-0 flex-1 self-center">
        <div className="flex items-center gap-[var(--space-200)]">
          <Layers className="h-3.5 w-3.5 shrink-0 text-[var(--color-primary)]/80" />
          <h3 className="m-0 truncate text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-text">
            {series.name}
          </h3>
          <span className="inline-flex shrink-0 items-center rounded-full border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/8 px-[var(--space-200)] py-[1px] text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] text-[var(--color-primary)]">
            系列课
          </span>
          {isMainNext ? (
            /**
             * 与 LessonRow.isMain 一致的「本节」chip：让用户在系列 row 里也能一眼识别
             * "下一节就是顶栏 demo 状态指向的那节"。
             */
            <span className="inline-flex shrink-0 items-center rounded-full border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/8 px-[var(--space-200)] py-[1px] text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] text-[var(--color-primary)]">
              本节
            </span>
          ) : null}
        </div>
        <p className="m-0 mt-[2px] flex flex-wrap items-center gap-x-[var(--space-200)] gap-y-[2px] text-[length:var(--font-size-xs)] text-text-tertiary">
          <span className="inline-flex items-center gap-[2px]">
            <CalendarClock className="h-3 w-3" /> {series.periodLabel}
          </span>
          <span className="inline-flex items-center gap-[2px]">
            <User className="h-3 w-3" /> {series.teacher}
          </span>
          <span className="tabular-nums">
            进度 {series.completedLessons} / {series.totalLessons}
          </span>
        </p>
        {nextLessonLabel ? (
          <p className="m-0 mt-[6px] truncate text-[length:var(--font-size-xs)] text-text-secondary">
            <span className="text-text-tertiary">下一课：</span>
            {nextLessonLabel}
          </p>
        ) : (
          <p className="m-0 mt-[6px] truncate text-[length:var(--font-size-xs)] text-text-secondary">
            {subtitle}
          </p>
        )}
      </div>

      {/* 右：状态徽章 + 进入箭头 */}
      <div className="flex shrink-0 flex-col items-end justify-between py-[2px]">
        {nextLessonStageStatus ? (
          /**
           * 下一节是主线时：直接复用单次课 row 同款 StatusBadge，
           * 显示「课前准备中」/「上课中」/「本节·已结束」/「即将开课」/「已完成」。
           * 这样课表里看到的状态与顶栏 demo 切换、子 CUI 内 strip 三处保持单一事实。
           */
          <StatusBadge status={nextLessonStageStatus} />
        ) : (
          <SeriesStatusBadge status={series.staticStatus} />
        )}
        <ChevronRight className="h-4 w-4 text-text-tertiary group-hover:text-[var(--color-primary)]" />
      </div>
    </button>
  )
}
