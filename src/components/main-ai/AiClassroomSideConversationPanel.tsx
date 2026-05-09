/**
 * AI 课堂侧边子 CUI（一节课的完整会话主体）。
 *
 * 设计要点（与 ScheduleSideConversationPanel 同 family，但定位不同）：
 * - **对话主体 = 一节具体的课**（不是"AI课堂助手"），课前 / 课中 / 课后所有 Skill
 *   操作都在同一会话线里按时间轴累积。
 * - 进入方式（多入口、单容器）：
 *     a) Dock·AI课堂 点击
 *     b) 教育门户主区 Hero 卡主行动
 *     c) 教育门户待办带 chip
 *     d) 主 VVAI 顶部待办带（教育聚合）chip
 *     e) 跨身份 IM 联动事件 banner
 * - 数据：以 `lessonId` 为持久化 key 写入 sessionStorage。
 * - 不内置课程切换器（一期由用户自己回到教育主 CUI 选择不同课）。
 */
import * as React from "react"
import { MonitorPlay, X } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar"
import { ChatSender } from "../chat/ChatSender"
import { cn } from "../ui/utils"
import { currentUser, type Message } from "../chat/data"
import { VvAiLogo } from "../chat/ChatComponents"
import { AiClassroomSkillCard } from "./AiClassroomSkillCard"
import { TeacherLessonPrepCard } from "./TeacherLessonPrepCard"
import { TeacherLessonReportReviewCard } from "./TeacherLessonReportReviewCard"
import { StudentMistakeChallengeCard } from "./StudentMistakeChallengeCard"
import { ParentLessonReportCard } from "./ParentLessonReportCard"
import {
  AI_CLASSROOM_SKILL_CARD_MARKER,
  buildAiClassroomSkillPlaceholderReply,
  pickAiClassroomTree,
  type AiClassroomSkillItem,
} from "./aiClassroomSkillTree"
import { getAiClassroomSkillCardConfig, resolveRecommendedPromptReply } from "./aiClassroomSkillRegistry"
import { getLessonBottomQuickActions } from "./lessonBottomQuickActions"

/**
 * 自定义 marker：IM 联动确认条
 * `<<<EDU_IM_CONFIRM>>>:<targetRole>:<targetRoleLabel>:<text>`
 * 由 MessageBubble 拦截渲染成"已写入对方 IM + 切到对方视角立即查看"的 CTA 行
 */
const IM_CONFIRM_MARKER = "<<<EDU_IM_CONFIRM>>>"

function buildImConfirmContent(
  targetRole: EduImTargetRole,
  targetRoleLabel: string,
  text: string,
): string {
  return `${IM_CONFIRM_MARKER}:${targetRole}:${targetRoleLabel}:${text}`
}

function parseImConfirmContent(
  content: string,
): { targetRole: EduImTargetRole; targetRoleLabel: string; text: string } | null {
  if (!content.startsWith(`${IM_CONFIRM_MARKER}:`)) return null
  const rest = content.slice(`${IM_CONFIRM_MARKER}:`.length)
  const firstColon = rest.indexOf(":")
  if (firstColon < 0) return null
  const targetRole = rest.slice(0, firstColon)
  const tail = rest.slice(firstColon + 1)
  const secondColon = tail.indexOf(":")
  if (secondColon < 0) return null
  const targetRoleLabel = tail.slice(0, secondColon)
  const text = tail.slice(secondColon + 1)
  if (!["teacher", "student", "parent"].includes(targetRole)) return null
  return { targetRole: targetRole as EduImTargetRole, targetRoleLabel, text }
}

/**
 * 自定义 marker：老师推完随堂题后的"已发出"回执
 * `<<<EDU_CLASS_TASK_PUSHED>>>:<targetRole>:<text>`
 *
 * 与 IM_CONFIRM_MARKER 的差异：
 * - 文案语气是老师在课堂里看到的真实事件描述，不是 demo 旁白
 * - CTA 用班主任口吻"去看看学生那边怎么答的"，而不是"切到 X 视角"这种 demo 词
 * - 仍然走同一份跨身份跳转能力（writePendingEduSkillRequest + 切场景 URL）
 */
const CLASS_TASK_PUSHED_MARKER = "<<<EDU_CLASS_TASK_PUSHED>>>"

function buildClassTaskPushedContent(targetRole: EduImTargetRole, text: string): string {
  return `${CLASS_TASK_PUSHED_MARKER}:${targetRole}:${text}`
}

function parseClassTaskPushedContent(
  content: string,
): { targetRole: EduImTargetRole; text: string } | null {
  if (!content.startsWith(`${CLASS_TASK_PUSHED_MARKER}:`)) return null
  const rest = content.slice(`${CLASS_TASK_PUSHED_MARKER}:`.length)
  const firstColon = rest.indexOf(":")
  if (firstColon < 0) return null
  const targetRole = rest.slice(0, firstColon)
  const text = rest.slice(firstColon + 1)
  if (!["teacher", "student", "parent"].includes(targetRole)) return null
  return { targetRole: targetRole as EduImTargetRole, text }
}

/** 与 MainAIChatWindow 同一套 bespoke 卡片解析（侧边面板内复用） */
function renderBespokeSkillCard(
  bespokeId: string,
  onPickPrompt: (prompt: string) => void,
): React.ReactNode {
  switch (bespokeId) {
    case "teacher.prep.start":
      return <TeacherLessonPrepCard onPickPrompt={onPickPrompt} />
    case "teacher.post.reportReview":
      return <TeacherLessonReportReviewCard onPickPrompt={onPickPrompt} />
    case "student.post.mistakeChallenge":
      return <StudentMistakeChallengeCard onPickPrompt={onPickPrompt} />
    case "parent.post.lessonReport":
      return <ParentLessonReportCard onPickPrompt={onPickPrompt} />
    default:
      return null
  }
}
import {
  DEMO_LESSON,
  getLessonRuntimeState,
  type LessonRuntimeStatus,
} from "./aiClassroomLessonDemo"
import { findLessonSummary, type AgendaLessonStatus, getAgendaLessonStatus } from "./aiClassroomLessonsDemo"
import {
  loadChecklistDoneIds,
  saveChecklistDoneIds,
} from "./aiClassroomSidePersistence"
import {
  loadAiClassroomLessonThread,
  publishAiClassroomLessonThread,
  subscribeAiClassroomLessonThread,
} from "./aiClassroomLiveSharedThread"
import {
  AIC_CHECKLIST_CARD_MARKER,
  AIC_CHECKLIST_DONE_MARKER,
  buildChecklistCardContent,
  buildChecklistDoneContent,
  buildChecklistTickContent,
  findChecklistItemByExecution,
  getAiClassroomChecklist,
  parseChecklistMarker,
  type AiClassroomChecklistItem,
} from "./aiClassroomChecklist"
import {
  AiClassroomChecklistCard,
  AiClassroomChecklistCelebrationCard,
  AiClassroomChecklistTickBubble,
} from "./AiClassroomChecklistCard"
import {
  AIC_LIVE_MOMENT_CARD_MARKER,
  buildLiveMomentCardContent,
  getAiClassroomLiveMoment,
  parseLiveMomentMarker,
} from "./aiClassroomLiveMoment"
import { AiClassroomLiveMomentCard } from "./AiClassroomLiveMomentCard"
import { LiveClassEntryStrip } from "./LiveClassEntryStrip"
import {
  buildValueCardContent,
  getAiClassroomValueCard,
  parseValueCardMarker,
  hasAiClassroomValueCard,
} from "./aiClassroomValueCards"
import { AiClassroomValueCard } from "./AiClassroomValueCard"
import { triggerSkillIm, type EduImTargetRole } from "./eduImBus"
import {
  pushClassTask,
  useClassTasksForLesson,
  type ClassTaskEvent,
} from "./eduClassTaskBus"
import {
  ClassQuizTaskCard,
  RENDER_CLASS_QUIZ_MARKER,
  buildClassQuizCardContent,
  parseClassQuizCardContent,
} from "./ClassQuizTaskCard"
import { DEMO_QUICK_QUIZ, DEMO_STUDENT_SELF } from "./aiClassroomLessonDemo"
import { writePendingEduSkillRequest, buildEduRoleScenarioUrl } from "./educationCrossAppHandoff"
import type { EduLessonAttendingRole, EduSceneRole } from "./homeScenarioLayout"
import type { EducationStage } from "./educationStageDemo"
import type { LessonDeliveryMode } from "./lessonDeliveryMode"
import {
  AIC_REPLY_MARKER,
  buildReply,
  inferAiClassroomReplyFromText,
  parseAiClassroomReply,
  serializeAiClassroomReply,
} from "./aiClassroomReply"
import {
  buildFallbackReply,
  buildLessonOpeningReply,
  getEffectiveStage,
} from "./aiClassroomWelcome"
import { AiClassroomStructuredReplyBubble } from "./AiClassroomStructuredReplyBubble"
import {
  AIC_SERIES_RESCHEDULE_FORM_MARKER,
  AIC_SERIES_RESCHEDULE_DONE_MARKER,
  AIC_SERIES_LEAVE_FORM_MARKER,
  AIC_SERIES_LEAVE_DONE_MARKER,
  parseSeriesRescheduleFormContent,
  parseSeriesRescheduleDoneContent,
  parseSeriesLeaveFormContent,
  parseSeriesLeaveDoneContent,
  buildSeriesRescheduleDoneContent,
  buildSeriesLeaveDoneContent,
} from "./aiClassroomSeriesPanelMarkers"
import {
  SeriesRescheduleFormCard,
  SeriesRescheduleDoneCard,
  SeriesLeaveFormCard,
  SeriesLeaveDoneCard,
} from "./AiClassroomSeriesCards"

/** 系列 marker 渲染共用 bot row 容器（与系列 panel 内 BotRow 同结构） */
function SeriesBotRow({
  botAvatarSrc,
  children,
}: {
  botAvatarSrc: string
  children: React.ReactNode
}) {
  return (
    <div className="flex w-full flex-row items-start justify-start gap-2 md:gap-[8px]">
      <Avatar className="mt-0.5 size-7 shrink-0 md:size-9">
        <AvatarImage src={botAvatarSrc} />
        <AvatarFallback>AI</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

/* ============================================================
 * 公共：让外部把"打开本侧 CUI 并执行某 Skill"作为标准入口调用
 * ============================================================ */

export interface AiClassroomSidePanelOpenRequest {
  /** 触发命令（用户气泡显示文本；通常等于 chip / Hero 按钮的标签） */
  command: string
  /** 直接指定 skillId（强契约；优先于 command 字符串匹配） */
  skillId?: string
  /** 触发来源（仅用于 demo 内的来源追踪，UI 不展示） */
  source?: "dock" | "hero" | "todo-chip" | "main-vvai" | "im-banner" | "user"
  /**
   * 触发意图分流：
   * - `"open-only"`（默认）：仅打开侧 CUI，**不**作为 Skill 执行；只有 AI 主动开场。
   *   适用：Dock·AI课堂 点击、Hero "进入本节"、待办带 chip "进入本节AI课堂"、课表行点击等"打开容器"语义。
   * - `"skill"`：明确要执行某个 Skill（必带 `skillId` 或与 Skill 标签精确匹配的 `command`）。
   *   适用：跨身份 handoff（pendingEduSkillRequest 带 skillId）、主 VVAI 上 chip 直接点 Skill 等场景。
   *
   * 旧实现把所有打开请求都当作 skill 执行，命中不到就掉到"已收到：进入本节 AI 课堂"死胡同。
   * 新策略：默认 open-only；只有调用方明确说要跑 skill 时才跑。
   */
  kind?: "open-only" | "skill"
}

/* ============================================================
 * 渲染：单条 message → 子 CUI 内卡片 / 文本 / 用户气泡
 *
 * 结构化 AI 回复（headline + body + systemNote + nextActions chip 行）由
 * `AiClassroomStructuredReplyBubble` 共享组件渲染，主对话同款。
 * ============================================================ */

function MessageBubble({
  msg,
  botAvatarSrc,
  userAvatarSrc,
  userDisplayName,
  onRecommendedPrompt,
  onPickChecklistItem,
  doneIds,
  deliveryMode,
  classTasks,
  onAnsweredQuiz,
  seriesContext,
  onPushAi,
}: {
  msg: Message
  botAvatarSrc: string
  userAvatarSrc: string
  userDisplayName: string
  onRecommendedPrompt: (prompt: string) => void
  /** 清单项主按钮点击；统一交由 panel 处理（执行 skill + 后续 mark done） */
  onPickChecklistItem: (item: AiClassroomChecklistItem) => void
  /** 当前清单已完成项 id 集合（panel 状态，传入用于实时刷新 ✓） */
  doneIds: ReadonlySet<string>
  /** 课程形态（PRD 2.5.1）：决定 Skill 注册表是否启用线下专属覆盖 */
  deliveryMode: LessonDeliveryMode
  /** 当前课程下的全部随堂题任务（订阅自 eduClassTaskBus，由父级传入实时态） */
  classTasks: ClassTaskEvent[]
  /** 学生提交答案后的回执（由父级补一条用户气泡 + 反馈消息） */
  onAnsweredQuiz: (input: { task: ClassTaskEvent; optionIndex: number; isCorrect: boolean }) => void
  /** 系列上下文（embedded 系列模式下注入；用于识别 + 渲染系列 marker） */
  seriesContext?: AiClassroomSeriesContextForPanel
  /**
   * push 一条 AI 气泡到当前 thread（由 panel 注入）。
   * 用于系列表单提交后 push 回执卡 marker、取消时 push 一句 AI 反馈等。
   */
  onPushAi?: (content: string) => void
}) {
  const isUser = msg.senderId === currentUser.id

  /** ===== 系列 marker 渲染（仅在 embedded 系列模式下识别） ===== */
  if (!isUser && typeof msg.content === "string" && seriesContext) {
    if (msg.content.startsWith(`${AIC_SERIES_RESCHEDULE_FORM_MARKER}:`)) {
      const payload = parseSeriesRescheduleFormContent(msg.content)
      if (payload) {
        const outline =
          seriesContext.series.outlines.find((o) => o.index === payload.outlineIndex) ??
          seriesContext.outline
        return (
          <SeriesBotRow botAvatarSrc={botAvatarSrc}>
            <SeriesRescheduleFormCard
              series={seriesContext.series}
              outline={outline}
              onSubmit={(input) => {
                /** 写 store + IM；回执 marker push 到当前 thread */
                seriesContext.onSubmitReschedule(outline, input)
                onPushAi?.(
                  buildSeriesRescheduleDoneContent({
                    seriesId: seriesContext.series.id,
                    outlineIndex: outline.index,
                    fromLabel: outline.scheduleLabel,
                    toLabel: input.toLabel,
                    reason: input.reason,
                  }),
                )
              }}
              onCancel={() => {
                seriesContext.onCancelForm()
                onPushAi?.(
                  serializeAiClassroomReply(
                    buildReply({
                      headline: "好的，本次不调课。",
                      body: ["你随时可以从顶部「看其它节」抽屉再发起调课。"],
                    }),
                  ),
                )
              }}
            />
          </SeriesBotRow>
        )
      }
    }
    if (msg.content.startsWith(`${AIC_SERIES_RESCHEDULE_DONE_MARKER}:`)) {
      const payload = parseSeriesRescheduleDoneContent(msg.content)
      if (payload) {
        const outline =
          seriesContext.series.outlines.find((o) => o.index === payload.outlineIndex) ??
          seriesContext.outline
        return (
          <SeriesBotRow botAvatarSrc={botAvatarSrc}>
            <SeriesRescheduleDoneCard
              series={seriesContext.series}
              outline={outline}
              fromLabel={payload.fromLabel}
              toLabel={payload.toLabel}
              reason={payload.reason}
              onPickAction={onRecommendedPrompt}
            />
          </SeriesBotRow>
        )
      }
    }
    if (msg.content.startsWith(`${AIC_SERIES_LEAVE_FORM_MARKER}:`)) {
      const payload = parseSeriesLeaveFormContent(msg.content)
      if (payload) {
        const outline =
          seriesContext.series.outlines.find((o) => o.index === payload.outlineIndex) ??
          seriesContext.outline
        return (
          <SeriesBotRow botAvatarSrc={botAvatarSrc}>
            <SeriesLeaveFormCard
              series={seriesContext.series}
              outline={outline}
              byRole={payload.byRole}
              onSubmit={(input) => {
                seriesContext.onSubmitLeave(outline, payload.byRole, input)
                onPushAi?.(
                  buildSeriesLeaveDoneContent({
                    seriesId: seriesContext.series.id,
                    outlineIndex: outline.index,
                    byRole: payload.byRole,
                    type: input.type,
                    needMakeUp: input.needMakeUp,
                    reason: input.reason,
                  }),
                )
              }}
              onCancel={() => {
                seriesContext.onCancelForm()
                onPushAi?.(
                  serializeAiClassroomReply(
                    buildReply({
                      headline: "好的，本次不请假。",
                      body: ["你随时可以从顶部「看其它节」抽屉再发起请假。"],
                    }),
                  ),
                )
              }}
            />
          </SeriesBotRow>
        )
      }
    }
    if (msg.content.startsWith(`${AIC_SERIES_LEAVE_DONE_MARKER}:`)) {
      const payload = parseSeriesLeaveDoneContent(msg.content)
      if (payload) {
        const outline =
          seriesContext.series.outlines.find((o) => o.index === payload.outlineIndex) ??
          seriesContext.outline
        return (
          <SeriesBotRow botAvatarSrc={botAvatarSrc}>
            <SeriesLeaveDoneCard
              series={seriesContext.series}
              outline={outline}
              byRole={payload.byRole}
              type={payload.type}
              needMakeUp={payload.needMakeUp}
              reason={payload.reason}
              onPickAction={onRecommendedPrompt}
            />
          </SeriesBotRow>
        )
      }
    }
  }

  /** 清单 / 庆祝 / 打勾 三个 marker 解析；命中即直渲染对应卡 */
  if (!isUser && typeof msg.content === "string") {
    const checklistMarker = parseChecklistMarker(msg.content)
    if (checklistMarker) {
      if (checklistMarker.kind === "card") {
        const data = getAiClassroomChecklist(checklistMarker.role, checklistMarker.stage)
        if (!data) return null
        return (
          <div className="flex w-full flex-row items-start justify-start gap-2 md:gap-[8px]">
            <Avatar className="mt-0.5 size-7 shrink-0 md:size-9">
              <AvatarImage src={botAvatarSrc} />
              <AvatarFallback>AI</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <AiClassroomChecklistCard
                data={data}
                doneIds={doneIds}
                onPickItem={onPickChecklistItem}
              />
            </div>
          </div>
        )
      }
      if (checklistMarker.kind === "done") {
        const data = getAiClassroomChecklist(checklistMarker.role, checklistMarker.stage)
        if (!data) return null
        return (
          <div className="flex w-full flex-row items-start justify-start gap-2 md:gap-[8px]">
            <Avatar className="mt-0.5 size-7 shrink-0 md:size-9">
              <AvatarImage src={botAvatarSrc} />
              <AvatarFallback>AI</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <AiClassroomChecklistCelebrationCard
                data={data.completion}
                onPickAction={(action) => onRecommendedPrompt(action.prompt)}
              />
            </div>
          </div>
        )
      }
      if (checklistMarker.kind === "tick") {
        return (
          <div className="flex w-full flex-row items-start justify-start gap-2 md:gap-[8px]">
            <Avatar className="mt-0.5 size-7 shrink-0 md:size-9">
              <AvatarImage src={botAvatarSrc} />
              <AvatarFallback>AI</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <AiClassroomChecklistTickBubble itemTitle={checklistMarker.title} />
            </div>
          </div>
        )
      }
    }

    /** 价值卡 marker：`<<<AIC_VALUE_CARD>>>:<role>:<stage>:<mode>` —— AI 已就绪 / 已完成的产物展示 */
    const valueCardKey = parseValueCardMarker(msg.content)
    if (valueCardKey) {
      const data = getAiClassroomValueCard(
        valueCardKey.role,
        valueCardKey.stage,
        valueCardKey.deliveryMode,
      )
      if (!data) return null
      return (
        <div className="flex w-full flex-row items-start justify-start gap-2 md:gap-[8px]">
          <Avatar className="mt-0.5 size-7 shrink-0 md:size-9">
            <AvatarImage src={botAvatarSrc} />
            <AvatarFallback>AI</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <AiClassroomValueCard
              data={data}
              onPickAction={(action) => onRecommendedPrompt(action.prompt)}
            />
          </div>
        </div>
      )
    }

    /** 课中现场卡 marker：`<<<RENDER_AIC_LIVE_MOMENT>>>:<role>` */
    const liveMoment = parseLiveMomentMarker(msg.content)
    if (liveMoment) {
      const data = getAiClassroomLiveMoment(liveMoment.role)
      return (
        <div className="flex w-full flex-row items-start justify-start gap-2 md:gap-[8px]">
          <Avatar className="mt-0.5 size-7 shrink-0 md:size-9">
            <AvatarImage src={botAvatarSrc} />
            <AvatarFallback>AI</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <AiClassroomLiveMomentCard
              data={data}
              onPickAction={(action) => onRecommendedPrompt(action.prompt)}
            />
          </div>
        </div>
      )
    }
  }

  /** 课堂随堂题已发出确认条（老师视角） */
  if (!isUser && typeof msg.content === "string") {
    const pushed = parseClassTaskPushedContent(msg.content)
    if (pushed) {
      return (
        <div className="flex w-full flex-row items-start justify-start gap-2 md:gap-[8px]">
          <Avatar className="mt-0.5 size-7 shrink-0 md:size-9">
            <AvatarImage src={botAvatarSrc} />
            <AvatarFallback>AI</AvatarFallback>
          </Avatar>
          <div className="flex w-full max-w-[min(100%,520px)] flex-col gap-[var(--space-150)] rounded-[var(--radius-md)] border border-[var(--color-success)]/40 bg-[var(--color-success)]/5 px-[var(--space-300)] py-[var(--space-250)]">
            <div className="flex items-start gap-[var(--space-200)]">
              <span className="mt-[2px] text-[length:var(--font-size-md)]" aria-hidden>
                ✅
              </span>
              <span className="text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)] text-text leading-snug">
                {pushed.text}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                writePendingEduSkillRequest({
                  role: pushed.targetRole as EduSceneRole,
                  kind: "im",
                  command: "看一眼学生那边",
                })
                if (typeof window !== "undefined") {
                  window.location.assign(
                    buildEduRoleScenarioUrl(pushed.targetRole as EduSceneRole),
                  )
                }
              }}
              className="self-start rounded-full bg-primary px-[var(--space-300)] py-[var(--space-150)] text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] text-[var(--color-primary-foreground,white)] shadow-sm transition-colors hover:bg-primary-hover"
            >
              去看一眼学生那边怎么答的 →
            </button>
          </div>
        </div>
      )
    }
  }

  /** IM 联动确认条 marker */
  if (!isUser && typeof msg.content === "string") {
    const im = parseImConfirmContent(msg.content)
    if (im) {
      return (
        <div className="flex w-full flex-row items-start justify-start gap-2 md:gap-[8px]">
          <Avatar className="mt-0.5 size-7 shrink-0 md:size-9">
            <AvatarImage src={botAvatarSrc} />
            <AvatarFallback>AI</AvatarFallback>
          </Avatar>
          <div className="flex w-full max-w-[min(100%,520px)] flex-col gap-[var(--space-150)] rounded-[var(--radius-md)] border border-[var(--color-success)]/40 bg-[var(--color-success)]/5 px-[var(--space-300)] py-[var(--space-250)]">
            <div className="flex items-center gap-[var(--space-200)]">
              <span className="text-[length:var(--font-size-md)]" aria-hidden>✅</span>
              <span className="text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)] text-text leading-snug">
                {im.text}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                /**
                 * IM 跨身份跳转：kind="im" 让目标 scenario **不**自动开侧 CUI，
                 * 用户落在主门户即可看到 EduImInboxBanner（红点 + 卡片在 Hero 上方）。
                 */
                writePendingEduSkillRequest({
                  role: im.targetRole as EduSceneRole,
                  kind: "im",
                  command: "查看新会话",
                })
                if (typeof window !== "undefined") {
                  window.location.assign(buildEduRoleScenarioUrl(im.targetRole as EduSceneRole))
                }
              }}
              className="self-start rounded-full bg-primary px-[var(--space-300)] py-[var(--space-150)] text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] text-[var(--color-primary-foreground,white)] shadow-sm transition-colors hover:bg-primary-hover"
            >
              切到「{im.targetRoleLabel}」视角立即查看 →
            </button>
          </div>
        </div>
      )
    }
  }

  /** 结构化 AI 回复 marker：`<<<AIC_REPLY>>>:<json>` —— 渲染文本 + chip 行 */
  if (
    !isUser &&
    typeof msg.content === "string" &&
    msg.content.startsWith(`${AIC_REPLY_MARKER}:`)
  ) {
    const reply = parseAiClassroomReply(msg.content)
    if (reply) {
      return (
        <AiClassroomStructuredReplyBubble
          reply={reply}
          botAvatarSrc={botAvatarSrc}
          onPickAction={onRecommendedPrompt}
        />
      )
    }
    /** 解析失败防御：渲染一句通用兜底而不是把 marker 原文露给用户。 */
    return (
      <div className="flex w-full flex-row items-start justify-start gap-2 md:gap-[8px]">
        <Avatar className="mt-0.5 size-7 shrink-0 md:size-9">
          <AvatarImage src={botAvatarSrc} />
          <AvatarFallback>AI</AvatarFallback>
        </Avatar>
        <div className="max-w-[min(100%,520px)] rounded-tl-[var(--radius-sm)] rounded-tr-[var(--radius-lg)] rounded-bl-[var(--radius-lg)] rounded-br-[var(--radius-lg)] border border-border bg-bg px-[var(--space-350)] py-[var(--space-300)] text-left text-[length:var(--font-size-base)] leading-normal text-text shadow-xs">
          这条回复暂时无法显示，请刷新页面重试。
        </div>
      </div>
    )
  }

  /** 课堂随堂题任务卡 marker：`<<<RENDER_CLASS_QUIZ>>>:<taskId>|<studentName>` */
  if (
    !isUser &&
    typeof msg.content === "string" &&
    msg.content.startsWith(`${RENDER_CLASS_QUIZ_MARKER}:`)
  ) {
    const parsed = parseClassQuizCardContent(msg.content)
    const task = parsed ? classTasks.find((t) => t.id === parsed.taskId) ?? null : null
    return (
      <div className="flex w-full flex-row items-start justify-start gap-2 md:gap-[8px]">
        <Avatar className="mt-0.5 size-7 shrink-0 md:size-9">
          <AvatarImage src={botAvatarSrc} />
          <AvatarFallback>AI</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <ClassQuizTaskCard
            task={task}
            studentName={parsed?.studentName ?? DEMO_STUDENT_SELF.name}
            onAnswered={onAnsweredQuiz}
            onPrompt={onRecommendedPrompt}
          />
        </div>
      </div>
    )
  }

  /** AI 业务卡 marker：`<<<RENDER_AI_SKILL_CARD>>>:<skillId>` */
  if (
    !isUser &&
    typeof msg.content === "string" &&
    msg.content.startsWith(`${AI_CLASSROOM_SKILL_CARD_MARKER}:`)
  ) {
    const skillId = msg.content.slice(`${AI_CLASSROOM_SKILL_CARD_MARKER}:`.length)
    const cfg = getAiClassroomSkillCardConfig(skillId, deliveryMode)
    return (
      <div className="flex w-full flex-row items-start justify-start gap-2 md:gap-[8px]">
        <Avatar className="mt-0.5 size-7 shrink-0 md:size-9">
          <AvatarImage src={botAvatarSrc} />
          <AvatarFallback>AI</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          {cfg?.kind === "bespoke" ? (
            renderBespokeSkillCard(cfg.bespokeId, onRecommendedPrompt)
          ) : cfg?.kind === "template" ? (
            <AiClassroomSkillCard data={cfg.data} onPickPrompt={onRecommendedPrompt} />
          ) : (
            <div className="rounded-md border border-border bg-bg px-3 py-2 text-[length:var(--font-size-sm)] text-text-secondary">
              该 Skill 卡片即将上线。
            </div>
          )}
        </div>
      </div>
    )
  }

  if (isUser) {
    return (
      <div className="flex w-full flex-row items-start justify-end gap-2">
        <div className="max-w-[min(100%,520px)] rounded-tl-[var(--radius-lg)] rounded-tr-[var(--radius-sm)] rounded-bl-[var(--radius-lg)] rounded-br-[var(--radius-lg)] bg-gradient-to-r from-[#9187FF] to-[#2C98FC] px-[var(--space-350)] py-[var(--space-300)] text-left text-[length:var(--font-size-base)] leading-normal text-white shadow-elevation-sm whitespace-pre-wrap break-words">
          {msg.content}
        </div>
        <Avatar className="mt-0.5 size-7 shrink-0 md:size-9">
          <AvatarImage src={userAvatarSrc} />
          <AvatarFallback>{userDisplayName[0] ?? "我"}</AvatarFallback>
        </Avatar>
      </div>
    )
  }

  return (
    <div className="flex w-full flex-row items-start justify-start gap-2 md:gap-[8px]">
      <Avatar className="mt-0.5 size-7 shrink-0 md:size-9">
        <AvatarImage src={botAvatarSrc} />
        <AvatarFallback>AI</AvatarFallback>
      </Avatar>
      <div className="max-w-[min(100%,520px)] rounded-tl-[var(--radius-sm)] rounded-tr-[var(--radius-lg)] rounded-bl-[var(--radius-lg)] rounded-br-[var(--radius-lg)] border border-border bg-bg px-[var(--space-350)] py-[var(--space-300)] text-left text-[length:var(--font-size-base)] leading-normal text-text shadow-xs whitespace-pre-wrap break-words">
        {msg.content}
      </div>
    </div>
  )
}

/* ============================================================
 * 主体：AiClassroomSideConversationPanel
 * ============================================================ */

export interface AiClassroomSideConversationPanelProps {
  role: EduLessonAttendingRole
  stage: EducationStage
  /**
   * 课程形态（PRD 2.5.1）：🔵 线上 / 🟢 线下。
   * 默认 "online"（向后兼容现有调用）。仅在 stage="in" 时差异显著，但其它阶段也透传，
   * 保证 Skill Tree 在任何阶段被预览时都按当前形态裁剪 chip。
   */
  deliveryMode?: LessonDeliveryMode
  lessonId: string
  lessonTitle: string
  /** 触发请求（外部入口的 single source of truth） */
  pendingRequest: AiClassroomSidePanelOpenRequest | null
  /** 已消费触发请求，供父级清空 */
  onConsumePendingRequest: () => void
  botAvatarSrc: string
  userAvatarSrc: string
  userDisplayName?: string
  onClose: () => void
  /**
   * 教师在子 CUI 内主动触发「开始上课 / 结束本节课」时的 stage 变更回调。
   * - 仅在 role="teacher" 时使用（其它身份的 stage 由老师驱动）。
   * - 不传 = 不显示控制条（向后兼容已有调用）。
   */
  onStageChange?: (next: EducationStage) => void
  /**
   * 触发打开独立 AI 课堂浮层。
   * 不传时不显示入口条，老师"开始上课"也只负责切换课堂状态。
   */
  onOpenLiveClass?: () => void
  /**
   * Embedded 模式：作为系列课子 CUI 的内容主体被嵌入时启用。
   * - 不渲染自己的 Header / 关闭按钮（容器已经提供）
   * - 不渲染左边框 / 阴影（容器统一）
   * - 调用 onClose 仍然有效，但通常容器自己处理
   */
  embedded?: boolean
  /** 系列课容器已经承载老师课堂操作区时，隐藏内层控制条。 */
  suppressTeacherControlStrip?: boolean
  /**
   * 抑制清单卡 push（仅 embedded 系列场景非主线节使用）。
   *
   * 原因：清单是按 (role × stage) 维度的（与 lessonId 无关），
   * 非主线节复用清单会让用户看到"主线的待办出现在非主线节里"，明显错位。
   * 默认 false（保持单课 panel 原行为）。
   */
  suppressChecklist?: boolean
  /**
   * 系列上下文：embedded 模式下由系列容器注入；让 MessageBubble 识别系列 marker
   * （调课表单 / 调课回执 / 请假表单 / 请假回执），并把表单提交回调透传到系列容器。
   *
   * 不传 = 单课模式（不识别任何系列 marker；现有行为完全不变）。
   */
  seriesContext?: AiClassroomSeriesContextForPanel
}

/** 系列上下文：让单课 panel 识别 + 渲染系列 marker，并把提交事件回调到系列容器 */
export interface AiClassroomSeriesContextForPanel {
  series: import("./aiClassroomLessonSeriesDemo").AiClassroomLessonSeries
  outline: import("./aiClassroomLessonSeriesDemo").AiClassroomSeriesLessonOutline
  onSubmitReschedule: (
    outline: import("./aiClassroomLessonSeriesDemo").AiClassroomSeriesLessonOutline,
    input: { toLabel: string; toScheduledAt: string; reason?: string },
  ) => void
  onSubmitLeave: (
    outline: import("./aiClassroomLessonSeriesDemo").AiClassroomSeriesLessonOutline,
    byRole: "student" | "parent",
    input: {
      type: import("./aiClassroomLessonSeriesPersistence").SeriesLeaveType
      needMakeUp: boolean
      reason?: string
    },
  ) => void
  onCancelForm: () => void
}

/** 状态点（子 CUI 顶栏左侧呼吸点） */
const RUNTIME_DOT: Record<LessonRuntimeStatus, string> = {
  pre: "bg-[var(--color-info)]",
  imminent: "bg-[var(--color-warning)] animate-pulse",
  live: "bg-[var(--color-success)] animate-pulse",
  post: "bg-text-tertiary",
  idle: "bg-text-tertiary",
}

/**
 * 老师课堂控制条 —— 子 CUI 顶栏下方的 sticky strip。
 *
 * 设计动机
 * ----------------------------------------------------
 * 老师 = 课堂指挥者；一节课的"开始上课 / 结束本节课"应该是老师**显式动作**触发，
 * 不应只由演示开关或时间被动驱动。这条 strip 给老师一眼可见、一键可发的指令出口。
 *
 * 行为
 * ----------------------------------------------------
 * - 课前：浅蓝底 + "🔵 课前 · HH:MM 准时开课" + 右侧主色 CTA「🎯 现在开始上课 →」
 * - 课中：浅绿底 + "🟢 直播中 · MM:SS / 45:00" + 右侧 warning CTA「⏹ 结束本节课」
 * - 课后：浅灰底 + "✅ 本节课已结束 · 课后流程进行中"（无 CTA；老师走清单卡）
 *
 * 仅在 role="teacher" + 主线课 + 父级传入 onStageChange 时渲染。
 */
function TeacherLessonControlStrip({
  stage,
  startTime,
  endTime,
  liveElapsed,
  liveClassOpened,
  onOpenLiveClass,
}: {
  stage: EducationStage
  startTime: string
  endTime: string
  liveElapsed: string
  liveClassOpened: boolean
  onOpenLiveClass?: () => void
}) {
  if (stage === "pre") {
    return (
      <div className="flex shrink-0 items-center gap-[var(--space-300)] border-b border-border bg-[var(--color-info)]/8 px-[max(12px,16px)] py-[var(--space-250)]">
        <span
          aria-hidden
          className="inline-flex h-[8px] w-[8px] shrink-0 rounded-full bg-[var(--color-info)]"
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] text-text leading-tight">
            课前 · 等待课堂状态切换为课中
          </span>
          <span className="text-[length:var(--font-size-xs)] text-text-tertiary leading-snug">
            预定开课时间 {startTime}；请通过页面顶部 Demo 开关切换课堂状态。
          </span>
        </div>
      </div>
    )
  }
  if (stage === "in") {
    const headline = liveClassOpened
      ? `AI 课堂直播中：${liveElapsed} / 预计${endTime}结束本节课`
      : `正在上课中 · ${liveElapsed} / 预计${endTime}结束本节课`
    const subtitle = liveClassOpened
      ? "进入互动教室继续讲课；本对话窗仍可同时使用。"
      : "可进入AI课堂，进行课堂互动，当前对话仍可同时使用；"

    return (
      <div className="flex shrink-0 items-center gap-[var(--space-300)] border-b border-border bg-[var(--color-success)]/8 px-[max(12px,16px)] py-[var(--space-250)]">
        <span
          aria-hidden
          className="inline-flex h-[8px] w-[8px] shrink-0 rounded-full bg-[var(--color-success)] animate-pulse"
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] text-text leading-tight">
            {headline}
          </span>
          <span className="text-[length:var(--font-size-xs)] text-text-tertiary leading-snug">
            {subtitle}
          </span>
        </div>
        {onOpenLiveClass ? (
          <button
            type="button"
            onClick={onOpenLiveClass}
            className="inline-flex shrink-0 items-center gap-[var(--space-150)] h-[var(--space-700)] px-[var(--space-350)] py-[var(--space-150)] rounded-full bg-primary text-[var(--color-primary-foreground,white)] text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] leading-none whitespace-nowrap shadow-sm transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]/35"
            aria-label="进入AI互动课堂"
          >
            <span>进入AI互动课堂</span>
            <span aria-hidden>→</span>
          </button>
        ) : null}
      </div>
    )
  }
  /** post */
  return (
    <div className="flex shrink-0 items-center gap-[var(--space-300)] border-b border-border bg-bg-secondary/50 px-[max(12px,16px)] py-[var(--space-250)]">
      <span
        aria-hidden
        className="inline-flex h-[8px] w-[8px] shrink-0 rounded-full bg-text-tertiary"
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] text-text leading-tight">
          本节课已结束
        </span>
        <span className="text-[length:var(--font-size-xs)] text-text-tertiary leading-snug">
          课后流程进行中；下方清单卡引导审报告 / 派家长 / 备下节。
        </span>
      </div>
    </div>
  )
}

export function AiClassroomSideConversationPanel({
  role,
  stage,
  deliveryMode = "online",
  lessonId,
  lessonTitle,
  pendingRequest,
  onConsumePendingRequest,
  botAvatarSrc,
  userAvatarSrc,
  userDisplayName = "我",
  onClose,
  onOpenLiveClass,
  embedded = false,
  suppressTeacherControlStrip = false,
  suppressChecklist = false,
  seriesContext,
}: AiClassroomSideConversationPanelProps) {
  const [draft, setDraft] = React.useState("")
  const [messages, setMessages] = React.useState<Message[]>(() =>
    loadAiClassroomLessonThread(role, lessonId),
  )
  /**
   * 跨窗口同步去回声 ref：
   * - 每次本组件 setMessages 后，把 next reference 写到这个 ref；
   * - 订阅 cb 收到 messages 时若与 ref 同一引用 → 是自己 publish 出去的回声 → 忽略；
   * - 不同引用 → 是另一端（AI 课堂 popup）push 来的，setState 应用即可。
   */
  const lastLocalMessagesRef = React.useRef<Message[]>(messages)
  const [liveClassOpened, setLiveClassOpened] = React.useState(false)
  const scrollRef = React.useRef<HTMLDivElement>(null)
  /**
   * 入场定位策略（仅在切 role / lesson 的“进入时刻”执行一次）：
   * - first：首次进入（历史为空）→ 定位到第一句欢迎语（顶部）；
   * - resume：非首次进入（有历史）→ 定位到上次最后一条（底部）。
   *
   * 执行后自动清空，后续消息追加仍按常规“滚到底”。
   */
  const entryScrollModeRef = React.useRef<"first" | "resume" | null>(null)
  const entryScrollArmedRef = React.useRef(false)
  /**
   * 一次性抑制“自动滚到底”：
   * 入场定位（first/resume）执行后，同一轮 commit 内会触发 [messages.length] 的自动滚底 effect，
   * 若不抑制会把 first 模式刚滚到顶部的结果立刻覆盖回底部。
   */
  const skipNextAutoScrollRef = React.useRef(false)
  /**
   * 课堂随堂题任务总线：老师执行 `tc-question` 时 push，学生侧（包括家长侧偶尔旁观）
   * 通过订阅自动收到任务卡。同一节课全身份共用一份事件流，保证"老师推一题 → 学生立刻看到"。
   */
  const classTasks = useClassTasksForLesson(lessonId)
  React.useEffect(() => {
    if (stage === "in") return
    setLiveClassOpened(false)
  }, [lessonId, stage])
  /**
   * Skill Tree 按 (role × deliveryMode) 双维度裁剪：
   * - 课中节在线上保留原 6/3/3 张 chip；线下替换为「教室 IoT 主导」的新 chip 集
   * - 课前 / 课后两态共用线上原 chip（差异另由 hero / 报告卡承担）
   */
  const tree = React.useMemo(
    () => pickAiClassroomTree(role, undefined, deliveryMode),
    [role, deliveryMode],
  )
  const runtime = getLessonRuntimeState(stage)

  /**
   * 当前阶段中对应的 section：
   * - 主线课程：跟随 educationStage（pre / in / post）
   * - 非主线 past 课程：固定显示「课后」section
   * - 非主线 upcoming 课程：固定显示「课前」section
   *
   * 由 `aiClassroomWelcome.getEffectiveStage` 统一计算，保证欢迎卡 chip / 兜底 chip / 当前 section 三处共用一致的"等效阶段"。
   */
  const effectiveStage: EducationStage = React.useMemo(
    () => getEffectiveStage(lessonId, stage),
    [lessonId, stage],
  )


  /**
   * 「本节清单」：role × effectiveStage 决定。
   * - 没有清单（极少数 cell 不配置）→ checklist=null，相关逻辑全跳过
   * - 持久化 doneIds 与会话线程分开存：跨刷新 / 跨开关稳定
   */
  const checklist = React.useMemo(
    () => getAiClassroomChecklist(role, effectiveStage),
    [role, effectiveStage],
  )
  const [doneIds, setDoneIds] = React.useState<Set<string>>(
    () => new Set(loadChecklistDoneIds(role, lessonId, effectiveStage)),
  )
  /** ref 镜像：让连点不同清单项时不被 stale closure 击中 */
  const doneIdsRef = React.useRef(doneIds)
  React.useEffect(() => {
    doneIdsRef.current = doneIds
  }, [doneIds])

  /**
   * 持久化 + 跨窗口广播：每次消息变化时
   *  1) 写本窗口 sessionStorage（publish 内部已 save，这里复用同一通道避免双写）
   *  2) 通知本窗口订阅者
   *  3) 通过 BroadcastChannel post 给同源 AI 课堂 popup（带 instance id 过滤回声）
   *
   * lastLocalMessagesRef 在这里更新，保证后续订阅 cb 收到自己回声时能精准过滤。
   */
  React.useEffect(() => {
    lastLocalMessagesRef.current = messages
    publishAiClassroomLessonThread(role, lessonId, messages)
  }, [role, lessonId, messages])

  /**
   * 订阅 AI 课堂 popup 端推过来的消息：
   *  - 同窗口直接派发；跨窗口走 BroadcastChannel；
   *  - 收到的 messages 引用与 lastLocalMessagesRef 相同 = 自己回声，跳过；
   *  - 不同 = AI 课堂里发的新消息，覆盖本地 state。
   */
  React.useEffect(() => {
    const unsub = subscribeAiClassroomLessonThread(role, lessonId, (next) => {
      if (next === lastLocalMessagesRef.current) return
      lastLocalMessagesRef.current = next
      setMessages(next)
    })
    return unsub
  }, [role, lessonId])

  /** 持久化：清单 doneIds 写回 */
  React.useEffect(() => {
    saveChecklistDoneIds(role, lessonId, effectiveStage, Array.from(doneIds))
  }, [role, lessonId, effectiveStage, doneIds])

  /**
   * 切换 lessonId / role：从 storage 读取对应"会话线程" + 重置草稿。
   *
   * 关键：**deps 不含 effectiveStage**。
   * 子 CUI 是"一节课的完整对话主体"，老师从课前 → 课中 → 课后切阶段时，
   * 之前的开场卡 / 清单卡 / "开始上课"系统消息都要保留在历史里。
   * 如果把 effectiveStage 加进 deps，老师按下"现在开始上课"瞬间：
   *  1) handleStartClass 同步 push 一条 classStartMsg 到 messages
   *  2) onStageChange("in") 让 effectiveStage 从 pre 变 in
   *  3) 此 effect 会 race 上一步同一 commit 之后立刻再次 setMessages 把
   *     storage 反序列化的旧数组覆盖回来，叠加同 commit 内 strip 子节点
   *     结构变化，触发 React commit 阶段 removeChild NotFoundError。
   */
  React.useEffect(() => {
    const fresh = loadAiClassroomLessonThread(role, lessonId)
    /** 切课次/身份时，先设定本次入场定位模式；真正滚动在下方 effect 中执行。 */
    entryScrollModeRef.current = fresh.length === 0 ? "first" : "resume"
    entryScrollArmedRef.current = true
    /**
     * 同步刷新 lastLocalMessagesRef，避免随后立刻 publish 出去的"刚加载值"被订阅 cb 误判
     * 为对端推送（不同引用），再被本地 setState 覆盖一次。
     */
    lastLocalMessagesRef.current = fresh
    setMessages(fresh)
    setDraft("")
  }, [role, lessonId])

  /**
   * doneIds 是 stage 维度持久化（课前 / 课后清单各一份），
   * 因此随 effectiveStage 切换时需要单独重读对应 stage 的进度，
   * 与会话线程解耦。
   */
  React.useEffect(() => {
    setDoneIds(new Set(loadChecklistDoneIds(role, lessonId, effectiveStage)))
  }, [role, lessonId, effectiveStage])

  /**
   * 入场一次性定位：
   * - first：等欢迎语真正插入后再滚到顶部（messages.length 仍为 0 时先不执行）；
   * - resume：直接滚到末尾。
   */
  React.useLayoutEffect(() => {
    if (!entryScrollArmedRef.current) return
    const el = scrollRef.current
    if (!el) return
    if (entryScrollModeRef.current === "first" && messages.length === 0) return
    if (entryScrollModeRef.current === "first") {
      el.scrollTo({ top: 0, behavior: "auto" })
    } else {
      el.scrollTo({ top: el.scrollHeight, behavior: "auto" })
    }
    skipNextAutoScrollRef.current = true
    entryScrollArmedRef.current = false
    entryScrollModeRef.current = null
  }, [role, lessonId, messages])

  /** 自动滚动到底部 */
  React.useEffect(() => {
    if (skipNextAutoScrollRef.current) {
      skipNextAutoScrollRef.current = false
      return
    }
    if (entryScrollArmedRef.current) return
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
  }, [messages.length])

  /**
   * 「清单打勾」统一通道：
   * - 输入：一条用户执行（skillId? + prompt?）
   * - 反查清单 → 命中且未打勾 → 写入 doneIds（同步刷新 ref，避免连点丢更新）
   * - 同时 push 一条「✓ 已完成 X」微型气泡
   * - 全部完成 → 再 push 一张庆祝卡（已存在则跳过，避免回放重复）
   *
   * 该函数被 `executeSkill` / `handleRecommendedPrompt` 复用，保证从清单 chip / 输入框 /
   * 底部能力条 / 其它 chip 任何入口触发同 skillId 都能被记账。
   */
  /**
   * 已废弃：清单卡 + 打勾微泡 + 完成庆祝整套机制由新版「价值卡」承担。
   * 保留函数签名作为兼容兜底——既有 executeSkill / handleRecommendedPrompt 的调用点
   * 不需要改动，进来即直接 return。
   */
  const tryMarkChecklistDone = React.useCallback(
    (_input: { skillId?: string; prompt?: string }) => {
      void _input
    },
    [],
  )

  /**
   * 由 skillId 或 command 字符串解析出 Skill item（强契约优先）。
   *
   * 别名表：把同一 Skill 的多种历史叫法都收敛到同一个 skillId，确保不同入口
   * （主对话欢迎气泡 / 课中现场卡 / 底部 dock chip / 技能树 / 待办联动）
   * 用同一名字时拿到完全一致的体验。今后新增同义词只需在此扩展。
   */
  const SKILL_COMMAND_ALIASES: Record<string, string> = React.useMemo(
    () => ({
      "课堂出题": "tc-question",
      "出题": "tc-question",
      "即时小测": "tc-question",
    }),
    [],
  )
  const resolveSkillBy = React.useCallback(
    (input: { skillId?: string; command: string }): AiClassroomSkillItem | null => {
      const allItems = tree.sections.flatMap((s) => s.items)
      if (input.skillId) {
        const direct = allItems.find((i) => i.id === input.skillId)
        if (direct) return direct
      }
      const norm = (s: string) => s.replace(/\s+/g, "").replace(/[\/／]/g, "/")
      const target = norm(input.command)
      const aliasId = SKILL_COMMAND_ALIASES[target]
      if (aliasId) {
        const aliased = allItems.find((i) => i.id === aliasId)
        if (aliased) return aliased
      }
      return (
        allItems.find((it) => norm(it.label) === target) ??
        allItems.find((it) => target.includes(norm(it.label))) ??
        allItems.find((it) => norm(it.label).includes(target)) ??
        null
      )
    },
    [tree, SKILL_COMMAND_ALIASES],
  )

  /**
   * 在子 CUI 内执行一个 Skill：push 用户气泡 + AI 业务卡 / 结构化文字 / 兜底结构化回复。
   *
   * 解析顺序（与 `handleRecommendedPrompt` 保持一致）：
   * 1) 命中 Skill registry → 渲染业务卡（marker：`<<<RENDER_AI_SKILL_CARD>>>:<id>`）
   * 2) 命中 `resolveRecommendedPromptReply` 关键词 → 把旧文本推断成结构化 reply（含 chip）
   * 3) 都不命中 → 走 `buildFallbackReply` 给当前 stage 的 3 出口兜底（**不再**出现"已收到：xxx"死胡同）
   */
  const executeSkill = React.useCallback(
    (input: { skillId?: string; command: string }) => {
      const item = resolveSkillBy(input)
      const now = Date.now()
      const ts = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      const userMsg: Message = {
        id: `aic-side-u-${now}`,
        senderId: currentUser.id,
        content: input.command,
        timestamp: ts,
        createdAt: now,
      }
      const botContent = (() => {
        if (item) return buildAiClassroomSkillPlaceholderReply(item, role, effectiveStage, deliveryMode)
        const legacy = resolveRecommendedPromptReply(input.command, { role, deliveryMode })
        if (legacy) return serializeAiClassroomReply(inferAiClassroomReplyFromText(legacy))
        return serializeAiClassroomReply(
          buildFallbackReply({ role, effectiveStage, command: input.command }),
        )
      })()
      const botMsg: Message = {
        id: `aic-side-a-${now + 1}`,
        senderId: "ai-assistant",
        content: botContent,
        timestamp: ts,
        createdAt: now + 1,
      }
      const newMessages: Message[] = [userMsg, botMsg]

      /** 触发 skillId 级别的 IM 联动（若该 Skill 配置了 IM 联动） */
      const skillIdForIm = item?.id ?? input.skillId
      if (skillIdForIm) {
        const trigger = triggerSkillIm(skillIdForIm)
        if (trigger) {
          newMessages.push({
            id: `aic-side-im-${now + 2}`,
            senderId: "ai-assistant",
            content: buildImConfirmContent(trigger.targetRole, trigger.targetRoleLabel, trigger.confirmText),
            timestamp: ts,
            createdAt: now + 2,
          })
        }
      }

      /**
       * 老师 · 课堂随堂题联动：执行 `tc-question` Skill 时，往课堂任务总线推一份任务，
       * 学生那边在主对话和课堂助手里都会立刻看到这道题。
       * 仅当当前身份是老师时触发，避免学生 / 家长误推。
       */
      const skillIdForTask = item?.id ?? input.skillId
      if (skillIdForTask === "tc-question" && role === "teacher") {
        pushClassTask({
          kind: "quick-quiz",
          lessonId,
          lessonTitle,
          fromName: DEMO_LESSON.teacher,
          question: {
            prompt: DEMO_QUICK_QUIZ.prompt,
            options: DEMO_QUICK_QUIZ.options,
            correctIndex: DEMO_QUICK_QUIZ.correctIndex,
            knowledgePoint: "矢量方向判断",
            durationSec: 90,
          },
        })
        newMessages.push({
          id: `aic-side-task-${now + 3}`,
          senderId: "ai-assistant",
          content: buildClassTaskPushedContent(
            "student",
            `题目已经发到全班 ${DEMO_LESSON.studentCount} 位同学的屏幕上。1 分半内大家会陆续交卷，上方的答题分布会随之刷新。`,
          ),
          timestamp: ts,
          createdAt: now + 3,
        })
      }

      setMessages((prev) => [...prev, ...newMessages])

      /** 清单同步：任意入口触发的 skillId / prompt 命中清单某项 → 自动打勾 */
      tryMarkChecklistDone({ skillId: item?.id ?? input.skillId, prompt: input.command })
    },
    [resolveSkillBy, role, effectiveStage, deliveryMode, lessonId, lessonTitle, tryMarkChecklistDone],
  )

  /**
   * 学生交卷回执：在主线上补一条用户气泡（"我答了 B"）+ AI 反馈消息（含下一步 chip）。
   * `submitClassTaskAnswer` 已经在 ClassQuizTaskCard 内部完成；这里只负责消息流叙事。
   */
  /**
   * 通用：push 一条 AI 气泡到当前 thread（content 任意 marker 或纯文本）。
   * 主要由系列 marker（调课表单 / 请假表单）提交后生成回执卡使用，避免 MessageBubble
   * 内部需要直接访问 setMessages。
   */
  const pushAiBubble = React.useCallback((content: string) => {
    const now = Date.now()
    const ts = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    setMessages((prev) => [
      ...prev,
      {
        id: `aic-side-pushai-${now}`,
        senderId: "ai-assistant",
        content,
        timestamp: ts,
        createdAt: now,
      },
    ])
  }, [])

  const handleQuizAnswered = React.useCallback(
    (input: { task: ClassTaskEvent; optionIndex: number; isCorrect: boolean }) => {
      const now = Date.now()
      const ts = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      const letter = String.fromCharCode(65 + input.optionIndex)
      const userMsg: Message = {
        id: `aic-side-u-quiz-${now}`,
        senderId: currentUser.id,
        content: `我选 ${letter}`,
        timestamp: ts,
        createdAt: now,
      }
      const correctIndex = input.task.question.correctIndex
      const correctLetter = String.fromCharCode(65 + correctIndex)
      const correctText = input.task.question.options[correctIndex]
      const reply = input.isCorrect
        ? [
            `答对了，正解就是 ${correctLetter}（${correctText}）。这道你比班里大多数同学都快，王老师那边会看到你这次的速度。`,
            ``,
            `下一步可以：① 看一遍这道题的思路；② 等王老师讲完解析；③ 准备下一题。`,
          ].join("\n")
        : [
            `正解是 ${correctLetter}（${correctText}）。你选的 ${letter} 是同学最常混的那项，先收进错题本，下次再遇到就不会再选错。`,
            ``,
            `下一步可以：① 加入我的错题本；② 让 AI 讲一遍为什么是 ${correctLetter}；③ 我要提问（再选私聊老师 / 全班发言）。`,
          ].join("\n")
      const aiMsg: Message = {
        id: `aic-side-a-quiz-${now + 1}`,
        senderId: "ai-assistant",
        content: serializeAiClassroomReply(inferAiClassroomReplyFromText(reply)),
        timestamp: ts,
        createdAt: now + 1,
      }
      setMessages((prev) => [...prev, userMsg, aiMsg])
    },
    [],
  )

  /**
   * AI 主动开场：按当前身份/阶段/课程强制刷新欢迎语 + 按需补阶段卡片。
   *
   * 历史问题：旧逻辑仅在 `prev.length===0` 时插欢迎语，导致已有历史会话时，
   * 切换课前/课中/课后仍看到旧欢迎语（与当前阶段不匹配）。
   *
   * 新逻辑：
   * - 先清理所有旧开场（id 前缀 `aic-side-opening-`）；
   * - 再插入 1 条当前 opening；
   * - checklist/liveMoment 仍遵循"缺哪张补哪张"策略，避免重复。
   */
  const ensureOpeningOnce = React.useCallback(() => {
    setMessages((prev) => {
      /**
       * 入场清理：早期的「清单卡 + 完成庆祝卡 + 打勾微泡 + 课中现场卡」整套机制下线，
       * 由 (role × stage × deliveryMode) 维度的「价值卡」统一承担"AI 已为你做了什么"叙事。
       * 这里把历史会话里残留的所有这些 marker 一并过滤掉，保证用户视觉里**只看到**新版价值卡。
       *
       * 仍然保留 MessageBubble 里对这些 marker 的解析分支，方便外部调用方（IM / 系列卡）
       * 在极少数场景里继续 push 微泡之类的小气泡时不会渲染失败；只是从子 CUI 主入场流程里彻底移除。
       */
      const filtered = prev.filter((m) => {
        if (typeof m.content !== "string") return true
        if (m.content.startsWith(`${AIC_CHECKLIST_CARD_MARKER}:`)) return false
        if (m.content.startsWith(`${AIC_CHECKLIST_DONE_MARKER}:`)) return false
        if (m.content.startsWith(`${AIC_LIVE_MOMENT_CARD_MARKER}:`)) return false
        return true
      })

      const openingPrefix = "aic-side-opening-"
      const withoutOldOpenings = filtered.filter((m) => !m.id.startsWith(openingPrefix))
      /**
       * 价值卡：当前 (role × stage × mode) 缺哪张补哪张。
       * - 9 个组合都已配置，保证任意"角色 + 阶段 + 形态"都有一张恰当的价值卡。
       * - 系列 panel 非主线节也会补——价值卡按 role × stage × mode 维度，与具体 lessonId 无关，
       *   即使在历史节看到也仍然成立（且与 outline 的 staticStatus 自动通过 effectiveStage 对齐）。
       */
      const hasValueCardForCurrent = filtered.some((m) => {
        if (typeof m.content !== "string") return false
        const k = parseValueCardMarker(m.content)
        if (!k) return false
        return (
          k.role === role &&
          k.stage === effectiveStage &&
          (k.deliveryMode ?? "online") === deliveryMode
        )
      })
      const additions: Message[] = []
      const now = Date.now()
      const ts = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      additions.push({
        id: `aic-side-opening-${role}-${effectiveStage}-${lessonId}-${now}`,
        senderId: "ai-assistant",
        content: serializeAiClassroomReply(
          buildLessonOpeningReply(role, stage, lessonId, deliveryMode),
        ),
        timestamp: ts,
        createdAt: now,
      })
      if (
        !hasValueCardForCurrent &&
        hasAiClassroomValueCard(role, effectiveStage, deliveryMode)
      ) {
        additions.push({
          id: `aic-side-valuecard-${role}-${effectiveStage}-${deliveryMode}-${now + 2}`,
          senderId: "ai-assistant",
          content: buildValueCardContent({
            role,
            stage: effectiveStage,
            deliveryMode,
          }),
          timestamp: ts,
          createdAt: now + 2,
        })
      }
      if (additions.length === 0 && withoutOldOpenings === prev && filtered === prev) return prev
      return [...withoutOldOpenings, ...additions]
    })
  }, [role, stage, lessonId, deliveryMode, effectiveStage])

  /**
   * 消费外部 pendingRequest：先确保开场存在；只有 `kind === "skill"` 才走 `executeSkill`。
   *
   * 旧实现：所有 pendingRequest 都被当成 Skill 跑，导致 "进入本节 AI 课堂" / Hero "进入本节" 等
   * 仅"打开容器"语义的请求落到"已收到：xxx"死胡同。
   * 新策略：默认 `open-only`，只要不带 skillId 的请求都视作"打开"，仅触发开场，不污染会话。
   */
  React.useEffect(() => {
    if (!pendingRequest) return
    const kind = pendingRequest.kind ?? (pendingRequest.skillId ? "skill" : "open-only")
    ensureOpeningOnce()
    if (kind === "open-only") {
      onConsumePendingRequest()
      return
    }
    /** 用 microtask 让开场先 commit 再追加 Skill，避免顺序错乱 */
    queueMicrotask(() => {
      executeSkill({
        skillId: pendingRequest.skillId,
        command: pendingRequest.command,
      })
      onConsumePendingRequest()
    })
  }, [pendingRequest, ensureOpeningOnce, executeSkill, onConsumePendingRequest])

  /** 第一次挂载即出现 AI 主动开场（即使没有 pendingRequest） */
  React.useEffect(() => {
    if (messages.length === 0) ensureOpeningOnce()
    /* messages.length 仅作为"首次空态"判断，避免依赖循环 */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, lessonId])

  /**
   * 学生侧：订阅课堂任务总线，当老师推了一道未交的随堂题时，自动在子 CUI 主线上 push 一张
   * 任务卡（marker：`<<<RENDER_CLASS_QUIZ>>>:<taskId>|<studentName>`）。
   * 已经 push 过的任务不会重复（按 taskId 去重）。
   * 老师 / 家长不在此联动里弹卡，避免老师自己出题后被弹一遍。
   */
  React.useEffect(() => {
    if (role !== "student") return
    if (classTasks.length === 0) return
    const studentName = DEMO_STUDENT_SELF.name
    setMessages((prev) => {
      const announced = new Set<string>(
        prev
          .map((m) => (typeof m.content === "string" ? parseClassQuizCardContent(m.content) : null))
          .filter((p): p is { taskId: string; studentName: string } => !!p)
          .map((p) => p.taskId),
      )
      const additions: Message[] = []
      let cursor = Date.now()
      for (const task of classTasks) {
        if (announced.has(task.id)) continue
        if (task.submissions[studentName]) continue
        if (task.closed) continue
        const ts = new Date(cursor).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
        additions.push({
          id: `aic-side-task-pull-${task.id}`,
          senderId: "ai-assistant",
          content: serializeAiClassroomReply({
            headline: `${task.fromName}刚出了一道随堂题，1 分半内交卷。`,
            body: [
              "选好就直接点选项，做完会立刻知道对错和正解；想问的可以再走「我要提问」。",
            ],
          }),
          timestamp: ts,
          createdAt: cursor,
        })
        cursor += 1
        additions.push({
          id: `aic-side-task-card-${task.id}`,
          senderId: "ai-assistant",
          content: buildClassQuizCardContent(task.id, studentName),
          timestamp: ts,
          createdAt: cursor,
        })
        cursor += 1
      }
      if (additions.length === 0) return prev
      return [...prev, ...additions]
    })
  }, [classTasks, role])

  /**
   * 推荐指令 / chip 点击的统一通道。
   *
   * 解析顺序与 `executeSkill` 对齐，但优先级反过来——chip 类点击大多是"推荐文本"，
   * 命中关键词的优先走 reply 闭环（因为这些已经写好了 IM 联动文案）；命中不到再回退 Skill。
   *
   * 1) 命中 `resolveRecommendedPromptReply` → 旧文本经 `inferAiClassroomReplyFromText` 推断为结构化（含 chip 行）
   * 2) 命中 Skill registry → 业务卡片或 placeholder
   * 3) 都不命中 → `buildFallbackReply`，按当前 stage 给 3 出口（杜绝"已收到：xxx"死胡同）
   */
  const handleRecommendedPrompt = React.useCallback(
    (prompt: string) => {
      if (prompt === "进入AI互动课堂" || prompt === "进入 AI 互动课堂") {
        setLiveClassOpened(true)
        onOpenLiveClass?.()
        return
      }

      /**
       * 强契约优先：如果 chip 文案能命中某个 Skill（如「出一道随堂题」→ `tc-question`），
       * 一律走 `executeSkill` 完整链路 —— 渲染业务卡 + 触发 IM / 课堂任务联动。
       * 这样无论用户从「欢迎气泡」、「现场卡」、「底部 dock chip」还是「技能树」点入，
       * 同一指令名称都得到同一份体验，避免出现"有的入口推全班、有的入口只回一段文字"的割裂。
       */
      const matchedSkill = resolveSkillBy({ command: prompt })
      if (matchedSkill) {
        executeSkill({ skillId: matchedSkill.id, command: prompt })
        return
      }

      const now = Date.now()
      const ts = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      const userMsg: Message = {
        id: `aic-side-rp-u-${now}`,
        senderId: currentUser.id,
        content: prompt,
        timestamp: ts,
        createdAt: now,
      }
      const legacyReply = resolveRecommendedPromptReply(prompt, { role, deliveryMode })
      const botContent = legacyReply
        ? serializeAiClassroomReply(inferAiClassroomReplyFromText(legacyReply))
        : serializeAiClassroomReply(buildFallbackReply({ role, effectiveStage, command: prompt }))
      const botMsg: Message = {
        id: `aic-side-rp-a-${now + 1}`,
        senderId: "ai-assistant",
        content: botContent,
        timestamp: ts,
        createdAt: now + 1,
      }
      setMessages((prev) => [...prev, userMsg, botMsg])

      tryMarkChecklistDone({ prompt })
    },
    [
      resolveSkillBy,
      executeSkill,
      role,
      effectiveStage,
      deliveryMode,
      tryMarkChecklistDone,
      onOpenLiveClass,
    ],
  )

  /** 自由输入提交 */
  const commitSend = React.useCallback(
    (raw: string) => {
      const text = raw.trim()
      if (!text) return
      setDraft("")
      executeSkill({ command: text })
    },
    [executeSkill],
  )

  const handleSendMessage = React.useCallback(() => {
    commitSend(draft)
  }, [commitSend, draft])

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== "Enter") return
      if (e.shiftKey) return
      if (e.nativeEvent.isComposing) return
      e.preventDefault()
      commitSend(draft)
    },
    [commitSend, draft],
  )

  const handleOpenLiveClass = React.useCallback(() => {
    setLiveClassOpened(true)
    onOpenLiveClass?.()
  }, [onOpenLiveClass])

  /** 当前阶段标题（用于 rail 文案） */
  const stageTitle =
    stage === "pre" ? "课前" : stage === "in" ? "课中" : stage === "post" ? "课后" : "课前"
  void stageTitle

  /**
   * 当前课程元信息（lessonId 可能是主线 DEMO_LESSON 或 agenda 选的其他课）
   * - 主线：使用 DEMO_LESSON 完整字段 + 由 stage 驱动的 runtime 状态
   * - 非主线：使用 lessonsDemo 里的 staticStatus（past / upcoming），不被 stage 覆盖
   */
  const lessonSummary = findLessonSummary(lessonId)
  const isMainLesson = lessonSummary?.isMain ?? false
  /** TeacherLessonControlStrip 仍需要起止时间字段；其它 weekday / className / 状态文案随 header 简化已移除 */
  const headerStartTime = lessonSummary?.startTime ?? DEMO_LESSON.startTime
  const headerEndTime = lessonSummary?.endTime ?? DEMO_LESSON.endTime
  const headerStatusForNonMain: AgendaLessonStatus | null = lessonSummary
    ? getAgendaLessonStatus(lessonSummary, stage)
    : null
  /** 状态点：主线由 runtime.status 决定；非主线 past 灰、upcoming 蓝（仅 header 中央用） */
  const headerDotClass = isMainLesson
    ? RUNTIME_DOT[runtime.status]
    : headerStatusForNonMain === "past"
      ? "bg-text-tertiary"
      : "bg-[var(--color-info)]"
  const teacherLiveElapsed = runtime.liveElapsed

  return (
    <div
      className={cn(
        "pointer-events-auto flex h-full min-h-0 min-w-0 w-full flex-col bg-cui-bg",
        embedded
          ? "border-0"
          : "border-l border-[#e8ecf0] shadow-[-12px_0_32px_rgba(15,23,42,0.08)]",
      )}
    >
      {/* 外层 Header：embedded 时由系列容器统一提供，本组件不渲染。
       * 三栏栅格 `1fr_auto_1fr`：
       * - 左栏：《主CUI交互》同款 `<VvAiLogo />`
       * - 中栏：固定文案「AI课堂」（不再暴露具体课名 / 时间 / 状态等元数据，由消息流自身承担信息表达）
       * - 右栏：关闭按钮
       *
       * 高度：`min-h-[var(--space-900)]` + `py-[var(--space-150)]` 与《主CUI交互》顶 bar 完全对齐。
       */}
      {!embedded ? (
        <header className="grid min-h-[var(--space-900)] shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-border px-3 py-[var(--space-150)]">
          {/* Left · VVAI logo */}
          <div className="flex min-w-0 items-center">
            <VvAiLogo />
          </div>

          {/* Center · "AI课堂"（真居中，固定文案） */}
          <div className="flex min-w-0 max-w-[min(60vw,560px)] items-center justify-center gap-[var(--space-200)] text-center">
            <span
              className={cn("inline-flex h-[10px] w-[10px] shrink-0 rounded-full", headerDotClass)}
              aria-hidden
            />
            <h2 className="m-0 truncate text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-text">
              AI课堂
            </h2>
          </div>

          {/* Right · 关闭 */}
          <div className="flex min-w-0 items-center justify-end">
            <button
              type="button"
              onClick={onClose}
              className="flex size-9 shrink-0 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-[var(--black-alpha-11)] hover:text-text"
              aria-label="关闭 AI 课堂"
            >
              <X className="size-[18px]" strokeWidth={2} />
            </button>
          </div>
        </header>
      ) : null}

      {/*
        ======================================================
        老师课堂状态条（仅 role=teacher + 主线课）
        - 只展示课前/课中/课后状态，不在子 CUI 内提供"开始/结束上课"按钮
        - 课堂状态统一由页面顶部 Demo 开关驱动
        ====================================================== */}
      {role === "teacher" && isMainLesson && !suppressTeacherControlStrip ? (
        <TeacherLessonControlStrip
          key={`teacher-strip-${stage}`}
          stage={stage}
          startTime={headerStartTime}
          endTime={headerEndTime}
          liveElapsed={teacherLiveElapsed}
          liveClassOpened={liveClassOpened}
          onOpenLiveClass={onOpenLiveClass ? handleOpenLiveClass : undefined}
        />
      ) : null}

      {role !== "teacher" && isMainLesson && onOpenLiveClass ? (
        <LiveClassEntryStrip
          role={role}
          stage={stage}
          lessonId={lessonId}
          onOpenLiveClass={onOpenLiveClass}
        />
      ) : null}

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-[max(12px,16px)] py-4"
      >
        <div className="flex flex-col gap-5">
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              msg={msg}
              botAvatarSrc={botAvatarSrc}
              userAvatarSrc={userAvatarSrc}
              userDisplayName={userDisplayName}
              onRecommendedPrompt={handleRecommendedPrompt}
              onPickChecklistItem={(item) => handleRecommendedPrompt(item.primaryPrompt)}
              doneIds={doneIds}
              deliveryMode={deliveryMode}
              classTasks={classTasks}
              onAnsweredQuiz={handleQuizAnswered}
              seriesContext={seriesContext}
              onPushAi={pushAiBubble}
            />
          ))}
        </div>
      </div>

      {/*
        统一操作条
        - 「在线教室」按钮（左起首位，仅 teacher/student × in-class × 主线节）：进入 AI 互动课堂浮层
        - 8 个固定能力按钮（评价 / 签到 / 作业 / 调课 / 风采 / 沟通 / 成员 / 资料）：
          点击 = 派发一条 role-aware prompt 到 `handleRecommendedPrompt`
        - 全部按钮统一 pill 样式：白底圆角 + 边框 + 单行水平滚动，图标在前 文本在后
      */}
      <div className="shrink-0 border-t border-border bg-cui-bg px-[max(10px,12px)] py-[var(--space-200)]">
        <div
          className="flex w-full min-w-0 items-center gap-[var(--space-200)] overflow-x-auto"
          style={{ scrollbarWidth: "thin" }}
        >
          {/* 在线教室 · 仅老师 / 学生 在主线节课中阶段（与 LiveClassEntryStrip 准入条件一致） */}
          {onOpenLiveClass &&
          isMainLesson &&
          (role === "teacher" || role === "student") &&
          stage === "in" ? (
            <button
              type="button"
              onClick={handleOpenLiveClass}
              className={cn(
                "bg-bg flex shrink-0 items-center gap-[var(--space-100)] h-[var(--space-800)] px-[var(--space-300)] py-[var(--space-150)]",
                "rounded-full border border-border transition-all duration-200 ease-out",
                "hover:bg-[var(--black-alpha-11)]",
              )}
              aria-label="在线教室"
            >
              <MonitorPlay
                aria-hidden
                className="size-[14px] shrink-0 text-[var(--color-success)]"
                strokeWidth={1.75}
              />
              <span className="text-[length:var(--font-size-xs)] leading-none text-[var(--color-text)] whitespace-nowrap font-[var(--font-weight-medium)]">
                在线教室
              </span>
            </button>
          ) : null}

          {getLessonBottomQuickActions(role).map((action) => {
            const Icon = action.icon
            return (
              <button
                key={action.id}
                type="button"
                onClick={() => handleRecommendedPrompt(action.prompt)}
                className={cn(
                  "bg-bg flex shrink-0 items-center gap-[var(--space-100)] h-[var(--space-800)] px-[var(--space-300)] py-[var(--space-150)]",
                  "rounded-full border border-border transition-all duration-200 ease-out",
                  "hover:bg-[var(--black-alpha-11)]",
                )}
                aria-label={action.label}
              >
                <Icon
                  aria-hidden
                  className="size-[14px] shrink-0 text-text-secondary"
                  strokeWidth={1.75}
                />
                <span className="text-[length:var(--font-size-xs)] leading-none text-[var(--color-text)] whitespace-nowrap font-[var(--font-weight-medium)]">
                  {action.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="shrink-0 border-t border-border bg-cui-bg px-[max(10px,12px)] pt-[var(--space-200)] pb-[max(var(--space-300),env(safe-area-inset-bottom,0px))]">
        <ChatSender
          inputValue={draft}
          setInputValue={setDraft}
          handleSendMessage={handleSendMessage}
          handleKeyDown={handleKeyDown}
          placeholder={`继续追问《${lessonTitle.slice(0, 14)}${lessonTitle.length > 14 ? "…" : ""}》…`}
        />
      </div>
    </div>
  )
}
