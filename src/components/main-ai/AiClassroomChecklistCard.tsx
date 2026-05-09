/**
 * AI 课堂「本节清单」卡片。
 *
 * 设计动机
 * ----------------------------------------------------
 * 旧实现里，子 CUI 入场只 push 一条欢迎 + 3 个 chip，缺少"还要做几件 / 已经做了几件 / 全部完成"的目的感与完成感。
 * 这张卡是子 CUI 的"任务列表 anchor"：进入即知道这节课该完成什么，做完一件实时打勾。
 *
 * 视觉与 `AiClassroomSkillCard` 同源（`GenericCard` + 同款 chip 风格），保证它和其他业务卡视觉同站位。
 */

import * as React from "react"
import { GenericCard } from "./GenericCard"
import { cn } from "../ui/utils"
import type { AiClassroomChecklist, AiClassroomChecklistItem } from "./aiClassroomChecklist"
import type { AiClassroomReplyAction } from "./aiClassroomReply"

export interface AiClassroomChecklistCardProps {
  data: AiClassroomChecklist
  doneIds: ReadonlySet<string>
  /** 点击未完成项的主按钮 */
  onPickItem: (item: AiClassroomChecklistItem) => void
  className?: string
}

export function AiClassroomChecklistCard({
  data,
  doneIds,
  onPickItem,
  className,
}: AiClassroomChecklistCardProps) {
  const total = data.items.length
  const doneCount = data.items.filter((it) => doneIds.has(it.id)).length
  const allDone = total > 0 && doneCount === total

  return (
    <div className={cn("flex w-full max-w-[min(100%,720px)] flex-col", className)}>
      <GenericCard title={data.title}>
        {data.intro ? (
          <p className="m-0 text-[length:var(--font-size-sm)] leading-relaxed text-text-secondary">
            {data.intro}
          </p>
        ) : null}

        {/* 进度条 + 计数：用极简 1 行表达，避免抢卡片信息 */}
        <div className="mt-[var(--space-250)] flex w-full items-center gap-[var(--space-200)]">
          <div className="relative h-[6px] flex-1 overflow-hidden rounded-full bg-bg-secondary/60">
            <div
              className={cn(
                "absolute inset-y-0 left-0 rounded-full transition-all duration-300",
                allDone ? "bg-[var(--color-success)]" : "bg-[var(--color-primary)]",
              )}
              style={{ width: `${total === 0 ? 0 : (doneCount / total) * 100}%` }}
              aria-hidden
            />
          </div>
          <span className="shrink-0 text-[length:var(--font-size-xs)] text-text-tertiary tabular-nums">
            {doneCount}/{total} 已完成
          </span>
        </div>

        {/* 列表项 */}
        <ul className="mt-[var(--space-300)] flex w-full flex-col gap-[var(--space-200)] m-0 p-0 list-none">
          {data.items.map((item, idx) => {
            const isDone = doneIds.has(item.id)
            return (
              <li
                key={item.id}
                className={cn(
                  "flex w-full items-start gap-[var(--space-250)] rounded-[var(--radius-md)] border px-[var(--space-300)] py-[var(--space-250)]",
                  isDone
                    ? "border-[var(--color-success)]/35 bg-[var(--color-success)]/5"
                    : "border-border bg-bg",
                )}
              >
                {/* 状态图标：编号 / ✓
                    - 未完成：bg-secondary + text-secondary + 半粗体，确保编号可读
                    - 已完成：success 实色块，✓ 白字 */}
                <span
                  aria-hidden
                  className={cn(
                    "mt-[2px] inline-flex size-[20px] shrink-0 items-center justify-center rounded-[6px] border text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] leading-none",
                    isDone
                      ? "border-[var(--color-success)] bg-[var(--color-success)] text-white"
                      : "border-border bg-bg-secondary text-text",
                  )}
                >
                  {isDone ? "✓" : idx + 1}
                </span>

                <div className="flex min-w-0 flex-1 flex-col gap-[var(--space-100)]">
                  <span
                    className={cn(
                      "text-[length:var(--font-size-base)] leading-normal font-[var(--font-weight-medium)]",
                      isDone ? "text-text-tertiary line-through" : "text-text",
                    )}
                  >
                    {item.title}
                  </span>
                  {item.meta ? (
                    <span
                      className={cn(
                        "text-[length:var(--font-size-xs)] leading-snug",
                        isDone ? "text-text-tertiary" : "text-text-secondary",
                      )}
                    >
                      {item.meta}
                    </span>
                  ) : null}
                </div>

                {/* 主按钮：未完成 = 主色 chip；已完成 = 弱色"再来一次"
                    - h/py 同 ChatPromptButton 体系（28px 高 + 6px 上下内距）
                    - self-center：title + meta 多行时按钮垂直居中，避免顶端对齐错位 */}
                <button
                  type="button"
                  onClick={() => onPickItem(item)}
                  className={cn(
                    "inline-flex shrink-0 self-center items-center gap-[var(--space-100)] h-[var(--space-700)] px-[var(--space-300)] py-[var(--space-150)]",
                    "rounded-full border transition-all duration-200 ease-out",
                    "text-[length:var(--font-size-xs)] leading-none whitespace-nowrap font-[var(--font-weight-medium)]",
                    isDone
                      ? "border-border bg-bg text-text-secondary hover:bg-[var(--black-alpha-11)]"
                      : "border-[var(--color-primary)]/45 bg-[var(--color-primary)]/8 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/14",
                  )}
                  aria-label={isDone ? `再做一次：${item.title}` : `去做：${item.title}`}
                >
                  {isDone ? "再来一次" : item.primaryLabel}
                </button>
              </li>
            )
          })}
        </ul>

        {/* 末尾微提示：还差几件 / 全部完成 */}
        <p className="mt-[var(--space-250)] m-0 text-[length:var(--font-size-xs)] text-text-tertiary">
          {allDone
            ? "🎉 全部完成；下方有「下一步」chip。"
            : `还差 ${total - doneCount} 件就清桌了。`}
        </p>
      </GenericCard>
    </div>
  )
}

/**
 * 「全部完成」庆祝卡 —— 视觉与清单卡同源，但更轻：title + body + 2-3 个 next chip。
 */
export function AiClassroomChecklistCelebrationCard({
  data,
  onPickAction,
  className,
}: {
  data: AiClassroomChecklist["completion"]
  onPickAction: (action: AiClassroomReplyAction) => void
  className?: string
}) {
  return (
    <div className={cn("flex w-full max-w-[min(100%,720px)] flex-col", className)}>
      <GenericCard title={data.headline}>
        {data.body.map((line, idx) => (
          <p
            key={idx}
            className="m-0 text-[length:var(--font-size-sm)] leading-relaxed text-text-secondary whitespace-pre-wrap break-words"
          >
            {line}
          </p>
        ))}
        {data.nextActions.length > 0 ? (
          <div
            className="mt-[var(--space-250)] flex w-full flex-wrap gap-[var(--space-150)]"
            role="group"
            aria-label="下一步可以"
          >
            {data.nextActions.map((action, idx) => (
              <button
                key={`${action.prompt}-${idx}`}
                type="button"
                onClick={() => onPickAction(action)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-[var(--space-100)] h-[var(--space-700)] px-[var(--space-300)] py-[var(--space-150)]",
                  "rounded-full border transition-all duration-200 ease-out",
                  "text-[length:var(--font-size-xs)] leading-none whitespace-nowrap font-[var(--font-weight-medium)]",
                  action.tone === "primary"
                    ? "border-[var(--color-primary)]/45 bg-[var(--color-primary)]/8 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/14"
                    : "border-border bg-bg text-text hover:bg-[var(--black-alpha-11)]",
                )}
              >
                {action.label}
              </button>
            ))}
          </div>
        ) : null}
      </GenericCard>
    </div>
  )
}

/**
 * 单项打勾微型气泡：作为常规 AI 气泡渲染，但视觉极轻 —— 一行 + 绿色 ✓ icon。
 */
export function AiClassroomChecklistTickBubble({
  itemTitle,
  className,
}: {
  itemTitle: string
  className?: string
}) {
  return (
    <div
      className={cn(
        "inline-flex max-w-[min(100%,520px)] items-center gap-[var(--space-200)] rounded-full border border-[var(--color-success)]/35 bg-[var(--color-success)]/8 px-[var(--space-300)] py-[var(--space-150)]",
        "text-[length:var(--font-size-xs)] leading-none font-[var(--font-weight-medium)] text-[var(--color-success)]",
        className,
      )}
    >
      <span aria-hidden>✓</span>
      <span className="whitespace-nowrap overflow-hidden text-ellipsis">已完成「{itemTitle}」</span>
    </div>
  )
}
