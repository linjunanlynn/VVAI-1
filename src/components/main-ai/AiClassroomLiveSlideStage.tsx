/**
 * AI 课堂中栏：课件展示区。
 *
 * - 老师：可翻页 / 板书 / 屏幕共享（板书与屏幕共享按钮 toast 占位）
 * - 学生 / 家长：只读，跟随老师当前 slide（slideIndex 由 store 驱动；demo 里学生也能本地翻看，
 *   不会同步到老师视图——避免演示里"学生翻乱了课件" 的混乱）
 *
 * slide 类型差异化渲染：
 * - cover：大标题 + 副标题 + bullet 学习目标 + 图占位
 * - content：标题 + bullets + 图占位
 * - interactive：题干 + 选项（学生可点击答案 → 立即反馈正误，仅本地 demo）
 * - summary：标题 + bullets
 */

import * as React from "react"
import {
  ChevronLeft,
  ChevronRight,
  Edit3,
  ImageIcon,
  Monitor,
} from "lucide-react"
import { cn } from "../ui/utils"
import {
  type AiClassroomLiveSlide,
  DEMO_LIVE_SLIDES,
} from "./aiClassroomLiveDemo"
import type { EduLessonAttendingRole } from "./homeScenarioLayout"

export interface AiClassroomLiveSlideStageProps {
  role: EduLessonAttendingRole
  currentIndex: number
  onPrev: () => void
  onNext: () => void
  /** demo 占位用：老师点击「板书」/「屏幕共享」时由父级 toast */
  onTeacherToolToast: (label: string) => void
}

export function AiClassroomLiveSlideStage({
  role,
  currentIndex,
  onPrev,
  onNext,
  onTeacherToolToast,
}: AiClassroomLiveSlideStageProps) {
  const slide =
    DEMO_LIVE_SLIDES.find((s) => s.index === currentIndex) ?? DEMO_LIVE_SLIDES[0]
  const total = DEMO_LIVE_SLIDES.length

  const canPrev = role === "teacher" && currentIndex > 1
  const canNext = role === "teacher" && currentIndex < total

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-3 p-3">
      {/* 顶栏：页码 + 老师专属工具按钮 */}
      <div className="flex shrink-0 items-center gap-2 rounded-[var(--radius-md)] border border-border bg-bg px-3 py-2 text-[length:var(--font-size-xs)] text-text-secondary">
        <span className="font-[var(--font-weight-medium)] text-text">
          {slide.title}
        </span>
        <span className="text-text-tertiary">·</span>
        <span className="tabular-nums text-text-tertiary">
          第 {currentIndex} / {total} 页
        </span>
        <span className="ml-auto inline-flex items-center gap-1.5">
          {role === "teacher" ? (
            <>
              <button
                type="button"
                onClick={() => onTeacherToolToast("板书工具（demo 占位）")}
                className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-bg px-2 text-text-secondary transition-colors hover:bg-[var(--black-alpha-11)] hover:text-text"
                aria-label="板书"
              >
                <Edit3 className="h-3.5 w-3.5" />
                板书
              </button>
              <button
                type="button"
                onClick={() => onTeacherToolToast("屏幕共享（demo 占位）")}
                className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-bg px-2 text-text-secondary transition-colors hover:bg-[var(--black-alpha-11)] hover:text-text"
                aria-label="屏幕共享"
              >
                <Monitor className="h-3.5 w-3.5" />
                屏幕共享
              </button>
            </>
          ) : (
            <span className="text-text-tertiary">老师正在讲解</span>
          )}
        </span>
      </div>

      {/* slide 内容 */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto rounded-[var(--radius-md)] border border-border bg-bg p-5 shadow-xs">
        <SlideContent slide={slide} />
      </div>

      {/* 翻页 */}
      <div className="flex shrink-0 items-center justify-center gap-3">
        <button
          type="button"
          disabled={!canPrev}
          onClick={onPrev}
          className={cn(
            "inline-flex h-9 items-center gap-1 rounded-full border px-3 text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] transition-colors",
            canPrev
              ? "border-border bg-bg text-text hover:bg-[var(--black-alpha-11)]"
              : "border-border bg-bg-subtle text-text-tertiary",
          )}
          aria-label="上一页"
        >
          <ChevronLeft className="h-4 w-4" />
          上一页
        </button>
        <span className="tabular-nums text-[length:var(--font-size-xs)] text-text-secondary">
          {currentIndex} / {total}
        </span>
        <button
          type="button"
          disabled={!canNext}
          onClick={onNext}
          className={cn(
            "inline-flex h-9 items-center gap-1 rounded-full border px-3 text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] transition-colors",
            canNext
              ? "border-[var(--color-primary)]/55 bg-[var(--color-primary)] text-[var(--color-primary-foreground,white)] hover:bg-primary-hover"
              : "border-border bg-bg-subtle text-text-tertiary",
          )}
          aria-label="下一页"
        >
          下一页
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

/* ============================================================
 * Slide 内容渲染
 * ============================================================ */

function SlideContent({ slide }: { slide: AiClassroomLiveSlide }) {
  if (slide.type === "interactive" && slide.question) {
    return <InteractiveSlideBody slide={slide} />
  }
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="m-0 text-[length:var(--font-size-2xl)] font-[var(--font-weight-bold)] text-text">
          {slide.title}
        </h2>
        {slide.subtitle ? (
          <p className="m-0 mt-1 text-[length:var(--font-size-sm)] text-text-tertiary">
            {slide.subtitle}
          </p>
        ) : null}
      </div>
      {slide.bullets && slide.bullets.length > 0 ? (
        <ul className="m-0 list-none space-y-2 p-0">
          {slide.bullets.map((b, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-[length:var(--font-size-base)] leading-relaxed text-text"
            >
              <span className="mt-1.5 inline-flex size-1.5 shrink-0 rounded-full bg-[var(--color-primary)]" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {slide.imageDesc ? (
        <div className="flex flex-1 items-center justify-center rounded-[var(--radius-md)] border border-dashed border-border bg-bg-subtle/40 p-6 text-center">
          <div className="flex flex-col items-center gap-2 text-text-tertiary">
            <ImageIcon className="h-8 w-8" />
            <span className="text-[length:var(--font-size-xs)]">
              {slide.imageDesc}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function InteractiveSlideBody({ slide }: { slide: AiClassroomLiveSlide }) {
  const q = slide.question!
  const [picked, setPicked] = React.useState<number | null>(null)
  /**
   * 学生 / 家长本地点击仅作展示反馈；老师视图也可点（看自己出的题），不影响数据。
   * 班级答题进度的"6/8 已答"由 demo 系统消息预生成，不与本组件联动。
   */
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="m-0 text-[length:var(--font-size-xl)] font-[var(--font-weight-bold)] text-text">
          {slide.title}
        </h2>
        {slide.subtitle ? (
          <p className="m-0 mt-1 text-[length:var(--font-size-xs)] text-text-tertiary">
            {slide.subtitle}
          </p>
        ) : null}
      </div>
      <div className="rounded-[var(--radius-md)] border border-border bg-bg-subtle/40 p-4">
        <p className="m-0 text-[length:var(--font-size-base)] font-[var(--font-weight-medium)] text-text">
          {q.stem}
        </p>
      </div>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {q.options.map((opt, i) => {
          const isPicked = picked === i
          const isCorrect = i === q.correctIndex
          const showResult = picked !== null
          const tone = !showResult
            ? "border-border hover:bg-[var(--black-alpha-11)]"
            : isPicked && isCorrect
              ? "border-[var(--color-success)]/55 bg-[var(--color-success)]/10"
              : isPicked && !isCorrect
                ? "border-[var(--color-warning)]/55 bg-[var(--color-warning)]/10"
                : isCorrect
                  ? "border-[var(--color-success)]/45 bg-[var(--color-success)]/8"
                  : "border-border opacity-70"
          return (
            <button
              key={i}
              type="button"
              onClick={() => setPicked(i)}
              className={cn(
                "flex items-center gap-2 rounded-[var(--radius-md)] border bg-bg px-3 py-2 text-left text-[length:var(--font-size-sm)] text-text transition-colors",
                tone,
              )}
            >
              <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-bg-subtle text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] text-text-secondary">
                {String.fromCharCode(65 + i)}
              </span>
              <span className="flex-1">{opt}</span>
              {showResult && isCorrect ? (
                <span className="text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] text-[var(--color-success)]">
                  正确
                </span>
              ) : null}
              {showResult && isPicked && !isCorrect ? (
                <span className="text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] text-[var(--color-warning)]">
                  错了
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
      {picked !== null ? (
        <p className="m-0 text-[length:var(--font-size-xs)] text-text-tertiary">
          {picked === q.correctIndex
            ? "答对了！本题得分已计入课堂进度。"
            : "再想想：垂直合成的合力大小要用勾股定理。"}
        </p>
      ) : null}
    </div>
  )
}
