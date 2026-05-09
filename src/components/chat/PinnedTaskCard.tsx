import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "../ui/utils"

/**
 * Chip 视觉态：
 * - `active`（默认）= 当前要处理；蓝底蓝边
 * - `completed` = 已完成；灰化、文字 strike-through、淡显，仍可点
 * - `overdue` = 已逾期未完成；红边 + 微微红底，提示用户优先处理
 */
export type TaskChipTone = "active" | "completed" | "overdue"

interface TaskChipProps {
  iconSrc: string
  alt: string
  title: string
  time?: string
  count?: number
  tone?: TaskChipTone
  onClick?: () => void
}

const TONE_CONTAINER: Record<TaskChipTone, string> = {
  active:
    "border border-[var(--blue-11)] bg-[var(--blue-12)] hover:bg-[var(--blue-11)]",
  completed:
    "border border-border bg-[var(--black-alpha-12)] hover:bg-[var(--black-alpha-11)] opacity-70",
  overdue:
    "border border-[color:var(--color-error)] bg-[color:var(--color-error-bg,rgba(229,72,77,0.08))] hover:bg-[color:var(--color-error-bg,rgba(229,72,77,0.12))]",
}

const TONE_TITLE: Record<TaskChipTone, string> = {
  active: "text-text",
  completed: "text-text-tertiary line-through",
  overdue: "text-[color:var(--color-error)]",
}

const TONE_TIME: Record<TaskChipTone, string> = {
  active: "text-text-secondary",
  completed: "text-text-tertiary",
  overdue: "text-[color:var(--color-error)]",
}

export function TaskChip({
  iconSrc,
  alt,
  title,
  time,
  count,
  tone = "active",
  onClick,
}: TaskChipProps) {
  const containerCls = TONE_CONTAINER[tone]
  const titleCls = TONE_TITLE[tone]
  const timeCls = TONE_TIME[tone]
  /** 状态标记 emoji（与文案分离，避免破坏 title 行宽） */
  const stateBadge =
    tone === "completed" ? "✓ " : tone === "overdue" ? "⚠ " : ""
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex min-w-0 w-full cursor-pointer items-center gap-[var(--space-200)] rounded-[var(--radius-md)] px-[var(--space-300)] py-[var(--space-200)] text-[length:var(--font-size-base)] transition-colors",
        containerCls,
      )}
    >
      <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center">
        <img
          src={iconSrc}
          alt={alt}
          className={cn(
            "h-full w-full object-contain",
            tone === "completed" && "opacity-50",
          )}
        />
      </span>
      <span className={cn("min-w-0 flex-1 truncate text-left", titleCls)}>
        {stateBadge}
        {title}
      </span>
      {time && (
        <span className={cn("text-[length:var(--font-size-xs)]", timeCls)}>
          {time}
        </span>
      )}
      {count !== undefined && (
        <div className="ml-1 flex items-center justify-center gap-[var(--space-50)] rounded-[var(--radius-full)] bg-bg py-[var(--space-50)] pl-[var(--space-150)] pr-[var(--space-100)]">
          <span className="shrink-0 whitespace-nowrap text-center text-[11px] font-[var(--font-weight-regular)] leading-[12px] text-text-secondary">
            {count}
          </span>
          <div className="flex h-[10px] w-[10px] shrink-0 items-center justify-center text-text-secondary">
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </div>
        </div>
      )}
    </div>
  )
}

interface PinnedTaskCardProps {
  greeting?: string
  chips?: TaskChipProps[]
  onChipClick?: (chip: TaskChipProps) => void
  isExpanded?: boolean
  onExpandedChange?: (expanded: boolean) => void
  /**
   * 收起态「你还有 N 个待办」的数字口径。
   * 不传时：沿用各 chip 的 `count` 累加（主 VVAI 样板：单 chip 用 count 表示批量待办数）；
   * 累加为 0 时回退为 `chips.length`。
   * 教育语境应传入与问候语一致的条数（通常为 `chips.length`），避免与展开平铺条数不一致。
   */
  collapsedSummaryCount?: number
}

const CARD_PAD_X = "px-[var(--space-400)]"

export function PinnedTaskCard({
  greeting = "下午好，今天你有 31 件要处理的事情 👇",
  chips = [],
  onChipClick,
  isExpanded: controlledExpanded,
  onExpandedChange,
  collapsedSummaryCount,
}: PinnedTaskCardProps) {
  const [internalExpanded, setInternalExpanded] = React.useState(true)

  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded
  const sumChipCounts = chips.reduce((sum, chip) => sum + (chip.count ?? 0), 0)
  const pendingCount =
    collapsedSummaryCount !== undefined
      ? collapsedSummaryCount
      : sumChipCounts > 0
        ? sumChipCounts
        : chips.length

  const handleToggle = () => {
    const newValue = !isExpanded
    setInternalExpanded(newValue)
    onExpandedChange?.(newValue)
  }

  return (
    <div className="w-full min-w-0 shrink-0">
      {isExpanded ? (
        <>
          <div
            className="overflow-hidden rounded-lg border border-border bg-bg transition-shadow duration-300"
            style={{ boxShadow: "var(--shadow-xs)" }}
          >
            <div className="p-[var(--space-400)]">
              <p className="mb-[var(--space-400)] text-left text-[length:var(--font-size-base)] font-[var(--font-weight-regular)] leading-normal text-text">
                {greeting}
              </p>
              <div className="grid w-full grid-cols-1 gap-x-[var(--space-300)] gap-y-[var(--space-200)] sm:grid-cols-2 lg:grid-cols-3">
                {chips.map((chip, index) => (
                  <TaskChip key={index} {...chip} onClick={() => onChipClick?.(chip)} />
                ))}
              </div>
            </div>
          </div>

          <div className="flex w-full items-center justify-center pt-[4px] transition-all duration-300">
            <button
              type="button"
              onClick={handleToggle}
              className="flex h-[24px] w-[24px] items-center justify-center rounded-[9999px] border-[0.5px] border-[rgba(22,24,30,0.08)] bg-[var(--color-white)] shadow-[0px_4px_16px_0px_rgba(22,24,30,0.06)] transition-all hover:shadow-[0px_6px_20px_0px_rgba(22,24,30,0.1)]"
              aria-label="收起待办模块"
            >
              <svg width="10" height="10" viewBox="0 0 8.75 4.75" fill="none" aria-hidden>
                <path
                  d="M4.64016 0.109835C4.56984 0.0395088 4.47446 0 4.375 0C4.27554 0 4.18016 0.0395088 4.10984 0.109835L0.109835 4.10983C-0.0366117 4.25628 -0.0366117 4.49372 0.109835 4.64016C0.256282 4.78661 0.493718 4.78661 0.640165 4.64016L4.375 0.90533L8.10984 4.64016C8.25628 4.78661 8.49372 4.78661 8.64017 4.64016C8.78661 4.49372 8.78661 4.25628 8.64017 4.10983L4.64016 0.109835Z"
                  fill="#2A2F3C"
                />
              </svg>
            </button>
          </div>
        </>
      ) : (
        /* 收起：左为待办摘要文案，右为下拉 icon；整卡可点，避免 maxHeight:0 叠层裁切 */
        <button
          type="button"
          onClick={handleToggle}
          aria-label={
            pendingCount > 0
              ? `展开待办模块，你还有 ${pendingCount} 个待办事项`
              : "展开待办模块"
          }
          className={cn(
            "grid w-full min-h-[44px] min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-[var(--space-300)] rounded-lg border border-border bg-bg py-[var(--space-250)] text-left shadow-none transition-colors hover:bg-[var(--black-alpha-11)]",
            CARD_PAD_X
          )}
        >
          <span className="min-w-0 text-[length:var(--font-size-xs)] font-[var(--font-weight-regular)] leading-normal text-text-secondary">
            {pendingCount > 0 ? (
              <>
                你还有{" "}
                <span className="font-[var(--font-weight-medium)] text-[color:var(--color-error)]">
                  {pendingCount}
                </span>{" "}
                个待办事项，点击展开查看
              </>
            ) : (
              <>待办模块已收起，点击展开查看</>
            )}
          </span>
          <span
            className="flex h-[var(--space-800)] w-[var(--space-800)] shrink-0 items-center justify-center text-text-tertiary"
            aria-hidden
          >
            <ChevronDown className="h-4 w-4 shrink-0" strokeWidth={2} />
          </span>
        </button>
      )}
    </div>
  )
}
