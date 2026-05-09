/**
 * 顶栏「身份切换器」：在场景六/七/八（老师/学生/家长）三个 scenario 之间切换。
 * 与「教育空间切换器」同时出现在顶栏（教育应用会话内）；非教育上下文也保留，便于 demo 巡检。
 *
 * 设计要点：
 * - 仅在 `isEduRoleScenario(scenario)` 时由父组件挂载；
 * - 点击切换 → `navigate({ pathname:"/main-ai", search:"?scenario=edu-{role}" })`；
 * - 不持久化任何业务状态（只是一个路由跳转）。
 */
import * as React from "react"
import { ChevronDown, GraduationCap } from "lucide-react"
import { useNavigate } from "react-router"
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover"
import { cn } from "../ui/utils"
import {
  eduScenarioRole,
  SCENARIO_EDU_ADMIN,
  SCENARIO_EDU_PARENT,
  SCENARIO_EDU_STUDENT,
  SCENARIO_EDU_TEACHER,
  type EduSceneRole,
} from "./homeScenarioLayout"

const ROLE_OPTIONS: { id: EduSceneRole; label: string; scenario: string; hint: string }[] = [
  {
    id: "teacher",
    label: "老师",
    scenario: SCENARIO_EDU_TEACHER,
    hint: "B 端：含组织 + 机构/个人教育空间",
  },
  {
    id: "student",
    label: "学生",
    scenario: SCENARIO_EDU_STUDENT,
    hint: "C 端：仅个人教育空间",
  },
  {
    id: "parent",
    label: "家长",
    scenario: SCENARIO_EDU_PARENT,
    hint: "C 端：仅个人教育空间 + Parent Copilot",
  },
  {
    id: "admin",
    label: "管理者",
    scenario: SCENARIO_EDU_ADMIN,
    hint: "B 端：教务 + 督导 + 校长合体",
  },
]

const ROLE_TRIGGER_CLASS = cn(
  "h-[var(--space-800)]",
  "inline-flex max-w-[180px] min-w-0 shrink-0 items-center gap-[6px] rounded-[var(--radius-md)] border border-border bg-bg px-[var(--space-200)]",
  "text-left text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] text-text transition-colors hover:bg-[var(--black-alpha-11)]",
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
)

export interface EduRoleTopSwitcherProps {
  scenario: string | undefined
  className?: string
  popoverAlign?: "start" | "center" | "end"
}

export function EduRoleTopSwitcher({
  scenario,
  className,
  popoverAlign = "end",
}: EduRoleTopSwitcherProps) {
  const navigate = useNavigate()
  const [open, setOpen] = React.useState(false)
  const currentRole = eduScenarioRole(scenario) ?? "teacher"
  const currentLabel = ROLE_OPTIONS.find((r) => r.id === currentRole)?.label ?? "老师"

  const handlePick = (target: { id: EduSceneRole; scenario: string }) => {
    setOpen(false)
    if (target.id === currentRole) return
    navigate(
      { pathname: "/main-ai", search: `?scenario=${encodeURIComponent(target.scenario)}` },
      { state: { scenario: target.scenario } },
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(ROLE_TRIGGER_CLASS, className)}
          aria-expanded={open}
          aria-label={`切换身份（当前：${currentLabel}）`}
        >
          <GraduationCap className="h-[14px] w-[14px] shrink-0 text-text-tertiary" aria-hidden />
          <span className="min-w-0 flex-1 truncate">身份：{currentLabel}</span>
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
        sideOffset={6}
        className="w-[min(280px,calc(100vw-2rem))] border-border p-0 shadow-md"
      >
        <div className="overflow-hidden rounded-[var(--radius-md)] border border-border bg-bg">
          {ROLE_OPTIONS.map((opt, i) => {
            const active = opt.id === currentRole
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handlePick(opt)}
                className={cn(
                  "flex w-full cursor-pointer items-stretch gap-[var(--space-300)] border-0 border-b border-border bg-transparent p-[var(--space-300)] text-left transition-colors hover:bg-[var(--black-alpha-11)] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                  i === ROLE_OPTIONS.length - 1 && "border-b-0",
                  active && "bg-[var(--black-alpha-11)]",
                )}
              >
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "m-0 text-[length:var(--font-size-sm)] font-[var(--font-weight-semi-bold)]",
                      active ? "text-primary" : "text-text",
                    )}
                  >
                    {opt.label}
                    {active ? (
                      <span className="ml-[var(--space-150)] text-[length:var(--font-size-xs)] font-[var(--font-weight-regular)] text-text-tertiary">
                        （当前）
                      </span>
                    ) : null}
                  </p>
                  <p className="m-0 mt-[var(--space-100)] text-[length:var(--font-size-xs)] font-[var(--font-weight-regular)] leading-relaxed text-text-tertiary">
                    {opt.hint}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
