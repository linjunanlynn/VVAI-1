/**
 * 顶栏「教育空间切换器」（场景六/七/八/九专用）。
 *
 * 视觉规范：与 `ChatNavBar` 内的「组织切换器」严格对齐——同一个工具栏行的两个等价控件，
 * 不应在尺寸 / 字号 / 间距上漂移：
 * - trigger：`h-[var(--space-800)]` / `text-sm` / `font-medium` / `border-transparent`（hover 显边）
 * - 下拉宽：`w-[min(280px,calc(100vw-2rem))]`，行 `text-xs` + 紧凑 padding
 *
 * 行为规范：
 * - 唯一可被「选中」的是**教育空间**（family / institutional），不是组织本身
 * - 机构教育空间下，列表里组织名作为「分组标题」展示——非按钮、不可 hover、视觉弱化为小字
 * - 底部 2 个入口：「创建教育空间」「加入教育空间」（与组织切换器底部「创建/加入企业」位置对应）
 */
import * as React from "react"
import { Building2, Check, ChevronDown, Home } from "lucide-react"
import { cn } from "../ui/utils"
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover"
import {
  loadDemoEducationSpaceState,
  saveDemoEducationSpaceState,
  type DemoEducationSpaceKind,
  type DemoEducationSpaceRecord,
} from "./educationSpaceDemoPersistence"

/** 与 `ChatNavBar` 工具栏控件统一的高度 token；不再用绝对 `h-10` */
const TRIGGER_CLASS = cn(
  "h-[var(--space-800)]",
  "inline-flex max-w-[min(220px,40vw)] min-w-0 shrink-0 items-center gap-[var(--space-150)] rounded-[var(--radius-md)] border border-transparent px-[var(--space-200)]",
  "text-text transition-colors hover:border-border hover:bg-[var(--black-alpha-11)] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
)

/** 与组织切换器 DropdownMenuItem 一致的行 padding / gap */
const ROW_BTN = cn(
  "mx-[var(--space-50)] flex w-[calc(100%-var(--space-100))] cursor-pointer items-center gap-[var(--space-100)] rounded-[var(--radius-sm)] border-0 bg-transparent px-[var(--space-150)] py-[var(--space-100)] text-left transition-colors",
  "text-[length:var(--font-size-xs)] leading-[var(--line-height-3xs)]",
  "hover:bg-[var(--black-alpha-11)] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
)

export interface EduSpaceTopSwitcherProps {
  scenario: string | undefined
  /** C 端（学生 / 家长）：隐藏机构教育空间分组（个人空间唯一） */
  consumerOnly?: boolean
  /** 切换空间后的回调（如：把消息流切到对应空间会话上下文）。本轮以 sessionStorage 写回 + 触发 onChange 即可 */
  onChange?: (record: DemoEducationSpaceRecord | null) => void
  /** 顶栏触发"创建教育空间"：投递主对话指令，复用既有教育空间创建流程 */
  onCreateSpace: () => void
  /** 顶栏触发"加入教育空间" */
  onJoinSpace: () => void
  className?: string
  popoverAlign?: "start" | "center" | "end"
}

const KIND_LABEL: Record<DemoEducationSpaceKind, string> = {
  family: "个人教育空间",
  institutional: "机构教育空间",
}

interface OrganizationSpaceGroup {
  id: string
  name: string
  spaces: DemoEducationSpaceRecord[]
}

function groupInstitutionalSpaces(spaces: DemoEducationSpaceRecord[]): OrganizationSpaceGroup[] {
  const groups = new Map<string, OrganizationSpaceGroup>()
  for (const space of spaces) {
    if (space.kind !== "institutional") continue
    const id = space.hostOrganizationId ?? space.hostOrganizationName ?? "unknown-org"
    const name = space.hostOrganizationName ?? "未命名组织"
    const existing = groups.get(id)
    if (existing) {
      existing.spaces.push(space)
    } else {
      groups.set(id, { id, name, spaces: [space] })
    }
  }
  return Array.from(groups.values())
}

export function EduSpaceTopSwitcher({
  scenario,
  consumerOnly = false,
  onChange,
  onCreateSpace,
  onJoinSpace,
  className,
  popoverAlign = "end",
}: EduSpaceTopSwitcherProps) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [{ spaces, currentSpaceId }, setState] = React.useState(() =>
    loadDemoEducationSpaceState(scenario),
  )

  React.useEffect(() => {
    setState(loadDemoEducationSpaceState(scenario))
  }, [scenario])

  const current = React.useMemo(
    () => spaces.find((s) => s.id === currentSpaceId) ?? spaces[spaces.length - 1] ?? null,
    [spaces, currentSpaceId],
  )

  const handleSelect = (record: DemoEducationSpaceRecord) => {
    setOpen(false)
    if (record.id === current?.id) return
    const next = loadDemoEducationSpaceState(scenario)
    const persisted = { ...next, currentSpaceId: record.id }
    saveDemoEducationSpaceState(scenario, persisted)
    setState(persisted)
    onChange?.(record)
  }

  const normalizedQuery = query.trim().toLowerCase()
  const filteredSpaces = React.useMemo(() => {
    if (!normalizedQuery) return spaces
    return spaces.filter((s) =>
      `${s.name} ${s.hostOrganizationName ?? ""} ${KIND_LABEL[s.kind]}`
        .toLowerCase()
        .includes(normalizedQuery),
    )
  }, [normalizedQuery, spaces])
  const orgGroups = React.useMemo(() => groupInstitutionalSpaces(filteredSpaces), [filteredSpaces])
  const personalSpaces = React.useMemo(
    () => filteredSpaces.filter((s) => s.kind === "family"),
    [filteredSpaces],
  )

  /**
   * 顶栏 trigger 严格显示「教育空间」本体名（不是空间所归属的组织名）。
   * - 机构教育空间：「示范教育机构 · 机构教育空间」
   * - 个人教育空间：「我的个人教育空间 / 我的学习空间」
   */
  const triggerLabel = current?.name ?? "选择教育空间"
  const triggerAriaLabel = current
    ? `教育空间：${current.name}`
    : "创建或加入教育空间"

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(TRIGGER_CLASS, className)}
          aria-expanded={open}
          aria-label={triggerAriaLabel}
        >
          <span className="inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-[var(--black-alpha-11)]">
            {current?.kind === "family" ? (
              <Home className="h-[12px] w-[12px] text-text-tertiary" aria-hidden />
            ) : (
              <Building2 className="h-[12px] w-[12px] text-text-tertiary" aria-hidden />
            )}
          </span>
          <span className="min-w-0 max-w-[min(180px,36vw)] truncate text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)]">
            {triggerLabel}
          </span>
          <ChevronDown
            className={cn(
              "h-[14px] w-[14px] shrink-0 text-text-tertiary transition-transform",
              open && "rotate-180",
            )}
            strokeWidth={2}
            aria-hidden
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align={popoverAlign}
        side="bottom"
        sideOffset={8}
        className="w-[min(280px,calc(100vw-2rem))] border-0 bg-transparent p-0 shadow-none"
      >
        <div className="overflow-hidden rounded-[var(--radius-md)] border border-border bg-bg shadow-[0_8px_24px_rgba(15,23,42,0.10)]">
          {/* 搜索条 */}
          <div className="border-b border-border px-[var(--space-150)] py-[var(--space-100)]">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索教育空间"
              className="h-[24px] w-full border-0 bg-transparent text-[length:var(--font-size-xs)] leading-[var(--line-height-3xs)] text-text outline-none placeholder:text-text-tertiary"
            />
          </div>

          {/* 列表 */}
          <div className="max-h-[min(260px,46vh)] overflow-y-auto bg-bg py-[var(--space-50)]">
            {filteredSpaces.length === 0 ? (
              <div className="px-[var(--space-200)] py-[var(--space-200)] text-[length:var(--font-size-xs)] text-text-tertiary">
                没有匹配的教育空间
              </div>
            ) : null}

            {!consumerOnly && orgGroups.map((group) => (
              <div key={group.id} className="mb-[var(--space-100)]">
                {/*
                  分组标题：仅作"分组标签"展示，不可点 / 无 hover / 无勾选——
                  视觉与可选行明显拉开（更小字号、无背景、灰色），避免被误以为也是一个选项。
                */}
                <div
                  className="flex items-center gap-[var(--space-100)] px-[var(--space-200)] pb-[2px] pt-[var(--space-100)]"
                  role="presentation"
                >
                  <Building2 className="h-[12px] w-[12px] shrink-0 text-text-tertiary" aria-hidden />
                  <span className="min-w-0 truncate text-[length:var(--font-size-xxs)] font-[var(--font-weight-medium)] uppercase tracking-[0.04em] text-text-tertiary">
                    {group.name}
                  </span>
                </div>
                {group.spaces.map((space) => {
                  const active = space.id === current?.id
                  return (
                    <button
                      key={space.id}
                      type="button"
                      onClick={() => handleSelect(space)}
                      className={ROW_BTN}
                    >
                      {active ? (
                        <Check className="h-[14px] w-[14px] shrink-0 text-primary" strokeWidth={2.5} aria-hidden />
                      ) : (
                        <span className="inline-flex h-[14px] w-[14px] shrink-0 items-center justify-center rounded-full bg-[var(--black-alpha-11)]">
                          <Building2 className="h-[10px] w-[10px] text-text-tertiary" aria-hidden />
                        </span>
                      )}
                      <span
                        className={cn(
                          "min-w-0 flex-1 truncate font-[var(--font-weight-regular)]",
                          active ? "font-[var(--font-weight-medium)] text-primary" : "text-text",
                        )}
                      >
                        {space.name}
                      </span>
                    </button>
                  )
                })}
              </div>
            ))}

            {personalSpaces.length > 0 ? (
              <div className="mb-[var(--space-100)]">
                <div
                  className="flex items-center gap-[var(--space-100)] px-[var(--space-200)] pb-[2px] pt-[var(--space-100)]"
                  role="presentation"
                >
                  <Home className="h-[12px] w-[12px] shrink-0 text-text-tertiary" aria-hidden />
                  <span className="min-w-0 truncate text-[length:var(--font-size-xxs)] font-[var(--font-weight-medium)] uppercase tracking-[0.04em] text-text-tertiary">
                    个人教育空间
                  </span>
                </div>
                {personalSpaces.map((space) => {
                  const active = space.id === current?.id
                  return (
                    <button
                      key={space.id}
                      type="button"
                      onClick={() => handleSelect(space)}
                      className={ROW_BTN}
                    >
                      {active ? (
                        <Check className="h-[14px] w-[14px] shrink-0 text-primary" strokeWidth={2.5} aria-hidden />
                      ) : (
                        <span className="inline-flex h-[14px] w-[14px] shrink-0 items-center justify-center rounded-full bg-[var(--black-alpha-11)]">
                          <Home className="h-[10px] w-[10px] text-text-tertiary" aria-hidden />
                        </span>
                      )}
                      <span
                        className={cn(
                          "min-w-0 flex-1 truncate font-[var(--font-weight-regular)]",
                          active ? "font-[var(--font-weight-medium)] text-primary" : "text-text",
                        )}
                      >
                        {space.name}
                      </span>
                    </button>
                  )
                })}
              </div>
            ) : null}
          </div>

          {/* 底部入口：与组织切换器底部「创建/加入企业」按钮一致的紧凑 pill 视觉 */}
          <div className="border-t border-border bg-bg px-[var(--space-150)] py-[var(--space-150)]">
            <div className="flex gap-[var(--space-100)]">
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  onCreateSpace()
                }}
                className={cn(
                  "flex min-h-0 flex-1 cursor-pointer items-center justify-center rounded-full border border-primary/55 bg-bg px-[var(--space-100)] py-[5px]",
                  "text-center text-[length:var(--font-size-xxs)] font-[var(--font-weight-medium)] leading-[var(--line-height-4xs)] text-primary",
                  "transition-colors hover:bg-[var(--blue-alpha-11)]",
                )}
              >
                创建教育空间
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  onJoinSpace()
                }}
                className={cn(
                  "flex min-h-0 flex-1 cursor-pointer items-center justify-center rounded-full border border-primary/55 bg-bg px-[var(--space-100)] py-[5px]",
                  "text-center text-[length:var(--font-size-xxs)] font-[var(--font-weight-medium)] leading-[var(--line-height-4xs)] text-primary",
                  "transition-colors hover:bg-[var(--blue-alpha-11)]",
                )}
              >
                加入教育空间
              </button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
