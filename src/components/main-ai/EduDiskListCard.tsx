/**
 * 教育微盘 · 卡 1（教育空间微盘清单）
 *
 * 设计动机
 * ----------------------------------------------------
 * 与产品截图（"教育空间微盘 · N → 共 N 个教育空间微盘 · X 个文件"）对齐：
 *  - 行只展示「头像 · 空间名 · X 个文件 · X 位成员」三段
 *  - 不再展示长 headline / 4 推荐 chip / 本周新增 / 已用容量等业务化字段
 *  - 卡身定位 = 真实文件管家的"我的云盘 / 团队空间"清单，而非业务摘要卡
 *
 * 行点击 → 投递「打开 ${spaceName} · 教育微盘」到主对话 → 出卡 2（文件管家）。
 *
 * 空态保留：spaces=0 时给「创建/加入教育空间」两个 CTA。
 */
import * as React from "react"
import { Cloud, Building2, Home, ChevronRight, Plus } from "lucide-react"
import { GenericCard } from "./GenericCard"
import { cn } from "../ui/utils"
import type { EduDiskListData, EduDiskListItem } from "./educationDiskRegistry"

export interface EduDiskListCardProps {
  data: EduDiskListData
  /** 行点击：把"打开 ${spaceName} · 教育微盘"投递到主对话（出卡 2） */
  onOpenSpace: (item: EduDiskListItem) => void
  /** 空态 CTA：创建教育空间 */
  onCreateSpace?: () => void
  /** 空态 CTA：加入教育空间 */
  onJoinSpace?: () => void
  className?: string
}

export function EduDiskListCard({
  data,
  onOpenSpace,
  onCreateSpace,
  onJoinSpace,
  className,
}: EduDiskListCardProps) {
  const empty = data.items.length === 0
  const totalFiles = data.items.reduce((acc, it) => acc + it.fileCount, 0)
  const totalMembers = data.items.reduce((acc, it) => acc + it.memberCount, 0)
  return (
    <div className={cn("flex w-full max-w-[min(100%,720px)] flex-col", className)}>
      <GenericCard title={`教育空间微盘 · ${data.items.length}`}>
        {/* 副标 */}
        {!empty ? (
          <div className="flex w-full items-center gap-[var(--space-150)] text-[length:var(--font-size-xs)] text-text-tertiary">
            <Cloud
              aria-hidden
              className="h-[14px] w-[14px] shrink-0 text-[var(--color-info)]"
              strokeWidth={1.75}
            />
            <span>
              共 {data.items.length} 个教育空间微盘 · {totalFiles} 个文件 · {totalMembers} 位成员
            </span>
          </div>
        ) : null}

        {/* 列表 / 空态 */}
        {empty ? (
          <EmptyState onCreateSpace={onCreateSpace} onJoinSpace={onJoinSpace} />
        ) : (
          <ul className="m-0 mt-[var(--space-200)] flex w-full flex-col gap-[var(--space-150)] list-none p-0">
            {data.items.map((item) => (
              <SpaceRow key={item.spaceId} item={item} onClick={() => onOpenSpace(item)} />
            ))}
          </ul>
        )}
      </GenericCard>
    </div>
  )
}

function SpaceRow({
  item,
  onClick,
}: {
  item: EduDiskListItem
  onClick: () => void
}) {
  const KindIcon = item.spaceKind === "family" ? Home : Building2
  return (
    <li className="w-full">
      <button
        type="button"
        onClick={onClick}
        aria-label={`打开 ${item.spaceName} 的教育微盘`}
        className={cn(
          "group relative flex w-full items-center gap-[var(--space-300)] rounded-[var(--radius-md)] border border-border bg-bg",
          "px-[var(--space-300)] py-[var(--space-300)] text-left transition-colors",
          "hover:border-[var(--color-primary)]/35 hover:bg-bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]/35",
        )}
      >
        {/** 头像：与截图风格统一为紫色圆形 */}
        <span
          className={cn(
            "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
            "bg-[var(--color-purple,#8b5cf6)]/14 text-[var(--color-purple,#8b5cf6)]",
          )}
        >
          <KindIcon className="size-5" strokeWidth={1.8} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
          <div className="flex w-full min-w-0 items-center gap-[var(--space-150)]">
            <span className="min-w-0 truncate text-[length:var(--font-size-md)] font-[var(--font-weight-semibold)] text-text">
              {item.spaceName}
            </span>
            {item.isCurrent ? <CurrentBadge /> : null}
          </div>
          <span className="min-w-0 truncate text-[length:var(--font-size-xs)] leading-tight text-text-tertiary">
            {item.fileCount} 个文件 · {item.memberCount} 位成员
          </span>
        </div>
        <ChevronRight
          aria-hidden
          className="h-4 w-4 shrink-0 text-text-tertiary transition-transform group-hover:translate-x-[2px]"
          strokeWidth={2}
        />
      </button>
    </li>
  )
}

function CurrentBadge() {
  return (
    <span
      className={cn(
        "inline-flex h-[18px] shrink-0 items-center rounded-full border border-[var(--color-success)]/35 bg-[var(--color-success)]/10",
        "px-[var(--space-150)] text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] text-[var(--color-success)]",
      )}
    >
      当前
    </span>
  )
}

function EmptyState({
  onCreateSpace,
  onJoinSpace,
}: {
  onCreateSpace?: () => void
  onJoinSpace?: () => void
}) {
  return (
    <div className="mt-[var(--space-300)] flex w-full flex-col items-center gap-[var(--space-200)] rounded-[var(--radius-md)] border border-dashed border-border bg-bg-tertiary px-[var(--space-300)] py-[var(--space-400)]">
      <span className="text-[length:var(--font-size-sm)] text-text-secondary">
        还没有教育空间。教育微盘按空间隔离，先创建或加入一个再来。
      </span>
      <div className="flex flex-wrap items-center gap-[var(--space-200)]">
        <button
          type="button"
          onClick={onCreateSpace}
          className={cn(
            "inline-flex h-9 shrink-0 items-center gap-[var(--space-100)] rounded-full bg-primary px-[var(--space-350)]",
            "text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)] text-primary-foreground",
            "transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]/35",
          )}
        >
          <Plus aria-hidden className="h-[14px] w-[14px]" strokeWidth={2} />
          创建教育空间
        </button>
        <button
          type="button"
          onClick={onJoinSpace}
          className={cn(
            "inline-flex h-9 shrink-0 items-center justify-center rounded-full border border-border bg-bg px-[var(--space-350)]",
            "text-[length:var(--font-size-sm)] text-text",
            "transition-colors hover:bg-[var(--black-alpha-11)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]/35",
          )}
        >
          加入教育空间
        </button>
      </div>
    </div>
  )
}
