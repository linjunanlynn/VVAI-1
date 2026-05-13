/**
 * 创建课程表单（卡片版，无 portal/模态壳）
 *
 * 与已删除的 `CreateCourseSheet` 的差异
 * ----------------------------------------------------
 * - 不带 createPortal / 遮罩层；定位为「侧边子 CUI 内的一张卡片」
 * - 字段沿用旧弹窗：课程名称 / 学段 / 学科 / 上课模式 / 计划课次数 / 单价 / 简介
 * - 新增字段：「上传课程大纲」（可选 · 选定后会随提交一起触发 `uploadCourseOutline`）
 *
 * 提交校验
 * ----------------------------------------------------
 * - 课程名称 必填
 * - 计划课次数 1-99 整数
 * - 大纲文件 可选，限制后缀为 .pdf / .doc / .docx / .ppt / .pptx / .md / .txt
 *
 * 提交后由父级 `CreateCourseSideConversationPanel` 串到
 * `eduCoursesPersistence.createCourse` + 可选 `uploadCourseOutline`，并关闭侧栏。
 */

import * as React from "react"
import { FileText, UploadCloud, X } from "lucide-react"
import { GenericCard } from "./GenericCard"
import { cn } from "../ui/utils"

const STAGE_OPTIONS = ["学龄前", "小学", "初中", "高中"] as const
const SUBJECT_OPTIONS = [
  "数学",
  "语文",
  "英语",
  "物理",
  "化学",
  "生物",
  "历史",
  "地理",
  "政治",
  "美术",
  "音乐",
  "体育",
  "科创",
  "口语",
  "综合",
] as const
const DELIVERY_OPTIONS: { value: "online" | "offline" | "hybrid"; label: string }[] = [
  { value: "online", label: "线上" },
  { value: "offline", label: "线下" },
  { value: "hybrid", label: "线上 + 线下" },
]

/**
 * 教学模式（区别于既有 deliveryMode 「上课模式 = 线上/线下/双轨」）：
 * 决定排课表的师生比，会作为 course.teachingFormat 持久化，并在
 * CreateScheduleCard 顶部信息条上以只读形态回显。
 */
const TEACHING_FORMAT_OPTIONS: {
  value: "1on1" | "1on_many" | "small_class" | "big_class"
  label: string
}[] = [
  { value: "1on1", label: "一对一" },
  { value: "1on_many", label: "一对多" },
  { value: "small_class", label: "小班课" },
  { value: "big_class", label: "大班课" },
]

const SESSION_QUICK_OPTIONS = [4, 6, 8, 10, 12, 16] as const

const OUTLINE_ACCEPT = ".pdf,.doc,.docx,.ppt,.pptx,.md,.txt"

export interface CreateCourseFormValues {
  name: string
  subject: string
  stage: string
  deliveryMode: "online" | "offline" | "hybrid"
  /** 教学模式（区别于上课模式 deliveryMode；默认 1on_many） */
  teachingFormat: "1on1" | "1on_many" | "small_class" | "big_class"
  sessionCount: number
  priceText?: string
  description?: string
  /** 可选：教学大纲文件（提交后由父级调用 uploadCourseOutline 触发解析动画） */
  outlineFile?: File | null
}

export interface CreateCourseFormCardProps {
  onCancel: () => void
  onSubmit: (form: CreateCourseFormValues) => void
}

export function CreateCourseFormCard({ onCancel, onSubmit }: CreateCourseFormCardProps) {
  const [name, setName] = React.useState("")
  const [stage, setStage] = React.useState<string>(STAGE_OPTIONS[2])
  const [subject, setSubject] = React.useState<string>(SUBJECT_OPTIONS[0])
  const [deliveryMode, setDeliveryMode] = React.useState<
    "online" | "offline" | "hybrid"
  >("hybrid")
  const [teachingFormat, setTeachingFormat] = React.useState<
    "1on1" | "1on_many" | "small_class" | "big_class"
  >("1on_many")
  const [sessionCount, setSessionCount] = React.useState<number>(12)
  const [priceText, setPriceText] = React.useState<string>("")
  const [description, setDescription] = React.useState<string>("")
  const [outlineFile, setOutlineFile] = React.useState<File | null>(null)
  const [touched, setTouched] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const errors = React.useMemo(() => {
    const e: { name?: string; sessionCount?: string } = {}
    if (!name.trim()) e.name = "请填写课程名称"
    if (!Number.isFinite(sessionCount) || sessionCount < 1 || sessionCount > 99) {
      e.sessionCount = "请填写 1-99 之间的整数"
    }
    return e
  }, [name, sessionCount])

  const submit = () => {
    setTouched(true)
    if (errors.name || errors.sessionCount) return
    onSubmit({
      name: name.trim(),
      subject,
      stage,
      deliveryMode,
      teachingFormat,
      sessionCount: Math.floor(sessionCount),
      priceText: priceText.trim() || undefined,
      description: description.trim() || undefined,
      outlineFile,
    })
  }

  const handlePickOutline = () => fileInputRef.current?.click()

  return (
    <div className="flex w-full max-w-[min(100%,640px)] flex-col">
      <GenericCard title="创建新课程">
        <div className="flex w-full flex-col gap-[var(--space-300)]">
          {/* 课程名称 */}
          <FieldLabel required>课程名称</FieldLabel>
          <input
            type="text"
            placeholder="如：初一物理 · 力学专题（春 12 节）"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={cn(
              "h-9 w-full rounded-[var(--radius-md)] border bg-bg px-[var(--space-300)] text-[length:var(--font-size-sm)] text-text outline-none transition-colors",
              touched && errors.name
                ? "border-[var(--color-error,#ef4444)]"
                : "border-border focus:border-[var(--color-primary)]/55",
            )}
          />
          {touched && errors.name ? <FieldError>{errors.name}</FieldError> : null}

          {/* 学段 */}
          <FieldLabel required>学段</FieldLabel>
          <SegmentedRow
            options={STAGE_OPTIONS.map((s) => ({ value: s, label: s }))}
            value={stage}
            onChange={(v) => setStage(v)}
          />

          {/* 学科 */}
          <FieldLabel required>学科</FieldLabel>
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="h-9 w-full rounded-[var(--radius-md)] border border-border bg-bg px-[var(--space-300)] text-[length:var(--font-size-sm)] text-text outline-none transition-colors focus:border-[var(--color-primary)]/55"
          >
            {SUBJECT_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {/* 上课模式（线上/线下/双轨；与下方"教学模式"是两个维度） */}
          <FieldLabel required>上课模式</FieldLabel>
          <SegmentedRow
            options={DELIVERY_OPTIONS}
            value={deliveryMode}
            onChange={(v) => setDeliveryMode(v as "online" | "offline" | "hybrid")}
          />

          {/* 教学模式（一对一/一对多/小班/大班；决定排课表师生比，会回显到 CreateScheduleCard 顶部信息条） */}
          <FieldLabel required>教学模式</FieldLabel>
          <SegmentedRow
            options={TEACHING_FORMAT_OPTIONS}
            value={teachingFormat}
            onChange={(v) =>
              setTeachingFormat(v as "1on1" | "1on_many" | "small_class" | "big_class")
            }
          />

          {/* 计划课次数 */}
          <FieldLabel required>计划课次数</FieldLabel>
          <div className="flex w-full flex-wrap items-center gap-[var(--space-200)]">
            <input
              type="number"
              min={1}
              max={99}
              value={sessionCount}
              onChange={(e) => setSessionCount(Number(e.target.value) || 0)}
              className={cn(
                "h-9 w-24 rounded-[var(--radius-md)] border bg-bg px-[var(--space-300)] text-[length:var(--font-size-sm)] tabular-nums text-text outline-none transition-colors",
                touched && errors.sessionCount
                  ? "border-[var(--color-error,#ef4444)]"
                  : "border-border focus:border-[var(--color-primary)]/55",
              )}
            />
            <div className="flex flex-wrap gap-[var(--space-150)]">
              {SESSION_QUICK_OPTIONS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setSessionCount(n)}
                  className={cn(
                    "inline-flex h-7 items-center rounded-full border px-[var(--space-250)] text-[length:var(--font-size-xs)] transition-colors",
                    sessionCount === n
                      ? "border-[var(--color-primary)]/55 bg-[var(--color-primary)]/8 text-[var(--color-primary)] font-[var(--font-weight-medium)]"
                      : "border-border bg-bg text-text-secondary hover:bg-[var(--black-alpha-11)]",
                  )}
                >
                  {n} 节
                </button>
              ))}
            </div>
          </div>
          {touched && errors.sessionCount ? (
            <FieldError>{errors.sessionCount}</FieldError>
          ) : null}

          {/* 单价（可选） */}
          <FieldLabel>单价（可选）</FieldLabel>
          <input
            type="text"
            placeholder="如：¥1,800 / 12 节"
            value={priceText}
            onChange={(e) => setPriceText(e.target.value)}
            className="h-9 w-full rounded-[var(--radius-md)] border border-border bg-bg px-[var(--space-300)] text-[length:var(--font-size-sm)] text-text outline-none transition-colors focus:border-[var(--color-primary)]/55"
          />

          {/* 简介（可选） */}
          <FieldLabel>简介（可选）</FieldLabel>
          <textarea
            placeholder="一两句话说明课程定位、目标人群、亮点。"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full resize-none rounded-[var(--radius-md)] border border-border bg-bg px-[var(--space-300)] py-[var(--space-200)] text-[length:var(--font-size-sm)] text-text outline-none transition-colors focus:border-[var(--color-primary)]/55"
          />

          {/* 上传课程大纲（可选） */}
          <FieldLabel>上传课程大纲（可选）</FieldLabel>
          <input
            ref={fileInputRef}
            type="file"
            accept={OUTLINE_ACCEPT}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null
              setOutlineFile(file)
              /** 重置 input 让用户能再次选同一文件 */
              if (e.target) e.target.value = ""
            }}
          />
          {!outlineFile ? (
            <button
              type="button"
              onClick={handlePickOutline}
              className={cn(
                "flex w-full flex-col items-center justify-center gap-[var(--space-100)] rounded-[var(--radius-md)] border border-dashed border-border bg-bg-tertiary px-[var(--space-300)] py-[var(--space-400)]",
                "text-text-secondary transition-colors hover:border-[var(--color-primary)]/55 hover:bg-[var(--color-primary)]/4 hover:text-[var(--color-primary)]",
              )}
            >
              <UploadCloud className="size-5" strokeWidth={1.6} />
              <span className="text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)]">
                点击上传大纲
              </span>
              <span className="text-[length:var(--font-size-xs)] text-text-tertiary">
                支持 PDF / Word / PPT / Markdown · 上传后 AI 会自动解析并生成课次目录
              </span>
            </button>
          ) : (
            <div className="flex w-full items-center gap-[var(--space-250)] rounded-[var(--radius-md)] border border-[var(--color-primary)]/35 bg-[var(--color-primary)]/4 px-[var(--space-300)] py-[var(--space-250)]">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-primary)]/12 text-[var(--color-primary)]">
                <FileText className="size-[18px]" strokeWidth={1.8} />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
                <span className="truncate text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)] text-text">
                  {outlineFile.name}
                </span>
                <span className="text-[length:var(--font-size-xs)] text-text-tertiary">
                  {(outlineFile.size / 1024).toFixed(1)} KB · 提交后 AI 会自动解析生成课次目录
                </span>
              </div>
              <button
                type="button"
                onClick={() => setOutlineFile(null)}
                aria-label="移除大纲文件"
                className="flex size-7 shrink-0 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-[var(--black-alpha-11)] hover:text-text"
              >
                <X className="size-4" strokeWidth={2} />
              </button>
            </div>
          )}

          <p className="m-0 text-[length:var(--font-size-xs)] text-text-tertiary">
            提交后会立即在「教育微盘 / 教学资料」下创建同名课程文件夹；如已上传大纲，AI 解析完成后会同步生成课次目录。
          </p>
        </div>

        {/* 底部动作 */}
        <div className="mt-[var(--space-300)] flex w-full items-center justify-end gap-[var(--space-200)]">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-9 items-center rounded-[var(--radius-md)] border border-border bg-bg px-[var(--space-350)] text-[length:var(--font-size-sm)] text-text transition-colors hover:bg-[var(--black-alpha-11)]"
          >
            取消
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={touched && (!!errors.name || !!errors.sessionCount)}
            className={cn(
              "inline-flex h-9 items-center rounded-[var(--radius-md)] px-[var(--space-400)] text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-white transition-colors",
              "bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            确认创建
          </button>
        </div>
      </GenericCard>
    </div>
  )
}

/* ============================================================
 * 子：标签 / 错误 / 段控
 * ============================================================ */

function FieldLabel({
  children,
  required,
}: {
  children: React.ReactNode
  required?: boolean
}) {
  return (
    <label className="m-0 mt-[var(--space-100)] flex shrink-0 items-center gap-[var(--space-100)] text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] text-text-secondary">
      {children}
      {required ? (
        <span className="text-[var(--color-error,#ef4444)]">*</span>
      ) : null}
    </label>
  )
}

function FieldError({ children }: { children: React.ReactNode }) {
  return (
    <p className="m-0 -mt-[var(--space-200)] text-[length:var(--font-size-xs)] text-[var(--color-error,#ef4444)]">
      {children}
    </p>
  )
}

function SegmentedRow<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex w-full flex-wrap gap-[var(--space-150)]">
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "inline-flex h-8 shrink-0 items-center rounded-full border px-[var(--space-300)] text-[length:var(--font-size-sm)] transition-colors",
              active
                ? "border-[var(--color-primary)]/55 bg-[var(--color-primary)]/8 text-[var(--color-primary)] font-[var(--font-weight-medium)]"
                : "border-border bg-bg text-text-secondary hover:bg-[var(--black-alpha-11)]",
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
