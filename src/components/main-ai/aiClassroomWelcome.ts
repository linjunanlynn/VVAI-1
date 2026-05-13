/**
 * AI 课堂子 CUI 入场欢迎数据。
 *
 * 取代旧的 `buildLessonOpening` 字符串拼接：
 * - **结构化输出**：headline / body / nextActions（chip）三段；nextActions 由 `MessageBubble` 渲染成可点击 chip
 * - **9 + 6 矩阵**：role(3) × effectiveStage(3) 给主线和非主线共用（非主线的 effectiveStage 由 staticStatus 推导）
 * - **chip 对话强契约**：每个 chip 的 `prompt` 都能被 `resolveRecommendedPromptReply` 命中关键词 OR 由 Skill registry 兜底，
 *   避免点完一个 chip 又掉回"已收到：xxx"死胡同
 *
 * 这套数据是 demo 体感的核心：用户进入子 CUI 第一秒就能在「3 个 chip」里直接选下一步该做什么，
 * 不用读一段长文本再去猜。
 */

import { findLessonSummary } from "./aiClassroomLessonsDemo"
import type { AiClassroomReply, AiClassroomReplyAction } from "./aiClassroomReply"
import { DEMO_LESSON, getLessonRuntimeState } from "./aiClassroomLessonDemo"
import type { EducationStage } from "./educationStageDemo"
import type { EduLessonAttendingRole } from "./homeScenarioLayout"
import {
  deliveryModeClassroomLabel,
  type LessonDeliveryMode,
} from "./lessonDeliveryMode"

/**
 * 三身份 × 三阶段（pre / in / post）的入场 chip 模板。
 * 每个 chip 的 `prompt` 必须能被 `resolveRecommendedPromptReply` 关键词命中或 Skill registry 解析；
 * 否则点完会落到"已收到：xxx"兜底（虽然 P1 兑底也是结构化的，但仍不如真实闭环）。
 */
type ChipMatrix = Record<EduLessonAttendingRole, Record<EducationStage, AiClassroomReplyAction[]>>

/**
 * 线下课中专属 chip（PRD 2.5.1.C / 2.5.2 / 2.6.1 / 2.6.2）：
 *
 * 仅当 `effectiveStage === "in" && deliveryMode === "offline"` 时替换 in 段 chip。
 * 其它阶段（pre / post）线下与线上共用——差异由 hero / 报告卡承担。
 *
 * 这些 prompt 都已在 `resolveRecommendedPromptReply` 的"线下课中专属"分支里命中关键词，
 * 点击后不会掉到"已收到：xxx"兜底。
 */
const OFFLINE_IN_CHIPS: Record<EduLessonAttendingRole, AiClassroomReplyAction[]> = {
  teacher: [
    { label: "把板书发给薄弱小组", prompt: "把板书 #2 一键发给 C 组三人巩固", tone: "primary" },
    { label: "单独点名提问", prompt: "单独点一次陈可的名" },
    { label: "调出物理学具记录站", prompt: "调出物理学具记录站" },
  ],
  student: [
    { label: "我要提问", prompt: "我要提问", tone: "primary" },
    { label: "举手等无线麦", prompt: "等无线麦到位时叫我" },
    { label: "看王老师讲到哪段", prompt: "王老师讲到哪段了" },
  ],
  parent: [
    { label: "看接送全过程", prompt: "看接送全过程", tone: "primary" },
    { label: "看一眼教室摄像头", prompt: "看一眼教室摄像头" },
    { label: "我能晚 10 分钟到吗", prompt: "我能晚 10 分钟到吗？" },
  ],
}

/**
 * v2 chip 矩阵设计原则（pre / post）
 * ----------------------------------------------------
 * - 每张 chip 都对应"该角色该阶段的一个高频痛点动作"，主推动作（primary）= 该阶段最高 ROI；
 * - chip 的 prompt 必须在 `resolveRecommendedPromptReply` 有 keyword 闭环回复（命中表见同函数注释），
 *   或被 Skill registry 的 Skill 卡命中；否则点完会掉到"已收到"兜底，违背"don't make me think"；
 * - 课中（in）chip 在本次改造中保持原状不动（已由 LiveMomentCard / OFFLINE_IN_CHIPS 各自承担）。
 */
const WELCOME_CHIPS: ChipMatrix = {
  teacher: {
    pre: [
      /**
       * label / prompt 与底部应用条「备课」chip 完全一致：
       * 由 `AiClassroomSideConversationPanel.handleRecommendedPrompt` 内对 `开始备课` 的早期拦截
       * push `RENDER_TEACHER_LESSON_PREP_READY_CARD_MARKER` → 渲染备课就绪卡（学员名单 + 课件设备清单），
       * 与点击底部应用条的「备课」按钮得到同一张卡片，避免课前欢迎语下方再额外出现一张老版「备课草稿」卡。
       */
      { label: "开始备课", prompt: "开始备课", tone: "primary" },
      { label: "推送预习给学生", prompt: "推送预习包给学生" },
      { label: "处理请假调课审批", prompt: "处理请假调课审批" },
    ],
    in: [
      { label: "出一道随堂题", prompt: "出一道随堂题", tone: "primary" },
      { label: "发起 8 分钟分组讨论", prompt: "智能分组" },
      { label: "调整讲课节奏", prompt: "换节奏" },
    ],
    post: [
      { label: "布置今晚作业", prompt: "布置今晚作业", tone: "primary" },
      /**
       * 整合原「一键群发学情报告 / 发送课堂照片给家长」两条 chip：
       * 这两步在新「风采点评 → 风采报告」闭环里属于同一个动作（AI 已自动汇总学情 + 选好风采素材，
       * 老师只需复审与一键发送），不应再让老师在欢迎区先做"分桶选择"。
       * 点击 → 由 `AiClassroomSideConversationPanel` 走 isReviewPrompt 命中，渲染 `LessonReviewCard`，
       * 与底部应用条「风采点评」按钮、跨身份 IM banner 点击进入的卡片完全同源。
       */
      { label: "发送学员个性化报告风采", prompt: "发送学员个性化报告风采" },
    ],
  },
  student: {
    pre: [
      { label: "开始预习（5 分钟）", prompt: "开始预习", tone: "primary" },
      { label: "看本节课件", prompt: "看本节课件" },
      { label: "设置上课提醒", prompt: "上课提醒" },
    ],
    in: [
      { label: "我要提问", prompt: "我要提问", tone: "primary" },
      { label: "举手抢答", prompt: "举手抢答" },
      { label: "紧急请假", prompt: "紧急请假" },
    ],
    post: [
      { label: "写今晚作业", prompt: "我的作业", tone: "primary" },
      { label: "重做错题", prompt: "去重做错题" },
      { label: "让 AI 帮我讲这道题", prompt: "AI 答疑这道题" },
    ],
  },
  parent: {
    pre: [
      { label: "看本节课预告", prompt: "本节课预告", tone: "primary" },
      { label: "看孩子预习进度", prompt: "查看孩子预习进度" },
      { label: "代孩子请假或调课", prompt: "代孩子请假" },
    ],
    in: [
      { label: "看孩子当前状态", prompt: "上课中状态", tone: "primary" },
      { label: "看一眼直播（30 秒）", prompt: "看一眼直播 30 秒" },
      { label: "代孩子紧急请假", prompt: "代孩子请假" },
    ],
    post: [
      { label: "看学情报告", prompt: "课后报告", tone: "primary" },
      { label: "看课堂照片", prompt: "看课堂风采" },
      { label: "今晚怎么陪孩子", prompt: "今晚怎么陪孩子" },
    ],
  },
}

/**
 * 推算"用户实际处于哪个阶段"：主线随 `educationStage`，非主线随课程 `staticStatus`。
 * - 主线（DEMO_LESSON）：直接取 stage（pre / in / post）
 * - 非主线 past：固定 "post"（哪怕 demo 切到课前，过往课就是过往课）
 * - 非主线 upcoming：固定 "pre"
 */
export function getEffectiveStage(
  lessonId: string,
  stage: EducationStage,
): EducationStage {
  const sum = findLessonSummary(lessonId)
  if (!sum || sum.isMain) return stage
  return sum.staticStatus === "past" ? "post" : "pre"
}

/**
 * 入场欢迎语（结构化）。
 * 文案与现有 `buildLessonOpening` 保持同一语气，但移除"长段连续叙述"，改为：
 * - **headline**：一句话事实（最重要的状态）
 * - **body**：1-2 句补充上下文
 * - **nextActions**：3 个一键可点的下一步
 *
 * 调用方将其 `serialize` 成带 marker 的 string 写入 `Message.content`，
 * 由 `MessageBubble` 解析并渲染成 chip 行。
 */
export function buildLessonOpeningReply(
  role: EduLessonAttendingRole,
  stage: EducationStage,
  lessonId: string,
  deliveryMode: LessonDeliveryMode = "online",
): AiClassroomReply {
  const sum = findLessonSummary(lessonId)
  const isMain = sum?.isMain ?? false
  const lessonTitle = sum?.title ?? DEMO_LESSON.title
  const startTime = sum?.startTime ?? DEMO_LESSON.startTime
  const weekday = sum?.weekdayLabel ?? DEMO_LESSON.weekday
  const className = sum?.className ?? DEMO_LESSON.className
  const effectiveStage = getEffectiveStage(lessonId, stage)
  /**
   * 课中线下：替换为「IFP / 物理学具 / 接送闭环」专属 chip 集；
   * 其它阶段保持线上原 chip。
   */
  const chips =
    effectiveStage === "in" && deliveryMode === "offline"
      ? OFFLINE_IN_CHIPS[role]
      : WELCOME_CHIPS[role][effectiveStage]
  const offlineClassroom = deliveryModeClassroomLabel("offline")

  /** ============= 主线（DEMO_LESSON）：18 卡完整联动 ============= */
  if (isMain) {
    const rt = getLessonRuntimeState(stage)
    if (role === "teacher") {
      if (stage === "pre") {
        return {
          headline: `王老师，${weekday} ${startTime}《${lessonTitle}》还差 3 件事就能开课。`,
          body: ["我可以替你做这 3 件：备课检查（课件/分层预习/学情）、把预习推给学生、请假/调课审批。"],
          nextActions: chips,
        }
      }
      if (stage === "in") {
        if (deliveryMode === "offline") {
          return {
            headline: `线下课进行中 · 你在 ${offlineClassroom}（已 ${rt.liveElapsed}）。`,
            body: [
              "IFP 板书 4 张已自动 OCR；摄像头抬头率 86%，陈可走神 2 起；物理学具 3 / 5 在用、报修 1。",
              "建议先把板书 #2 同步到 C 组 Pad，再对陈可做一次靶向点名。",
            ],
            nextActions: chips,
          }
        }
        return {
          headline: `直播中 · 已 ${rt.liveElapsed}。`,
          body: ["我可以替你做这 3 件：出一道随堂题、发起 8 分钟分组讨论、按实时学情调整节奏。"],
          nextActions: chips,
        }
      }
      return {
        headline: `本节结束 · 课后报告 8 份草稿待审、作业还没布置。`,
        body: ["我可以替你做这 3 件：布置今晚作业、群发学情报告、发送课堂风采。"],
        nextActions: chips,
      }
    }
    if (role === "student") {
      if (stage === "pre") {
        return {
          headline: `小明，${weekday} ${startTime}《${lessonTitle}》开课前还差 5 分钟预习。`,
          body: ["我可以陪你做 3 件：先看本节课件、开始预习、上课前 5 分钟自动提醒。"],
          nextActions: chips,
        }
      }
      if (stage === "in") {
        if (deliveryMode === "offline") {
          return {
            headline: `你在 ${offlineClassroom}（B 组 #4）· 上课中 · 已 ${rt.liveElapsed}。`,
            body: [
              "想问问题又不想打断节奏？点「我要提问」选私聊老师还是举手等无线麦发言。",
            ],
            nextActions: chips,
          }
        }
        return {
          headline: `上课中 · 已 ${rt.liveElapsed}。`,
          body: ["我可以陪你做这 3 件：我要提问、举手抢答、紧急情况快速请假。"],
          nextActions: chips,
        }
      }
      return {
        headline: `本节有 3 道方向判断错题没拿下；今晚作业里至少 2 道同类型。`,
        body: ["我可以替你做这 3 件：写今晚作业、重做错题、AI 答疑这道题。"],
        nextActions: chips,
      }
    }
    /** parent */
    if (stage === "pre") {
      return {
        headline: `李爸爸，孩子${weekday} ${startTime}《${lessonTitle}》。课前 5 分钟事情，我替你盯。`,
        body: ["我可以替你做这 3 件：看本节课预告、看孩子预习进度、请假/调课直接代办。"],
        nextActions: chips,
      }
    }
    if (stage === "in") {
      if (deliveryMode === "offline") {
        return {
          headline: `孩子已进 ${offlineClassroom} · 上课中 · 已 ${rt.liveElapsed}。`,
          body: [
            "接送闭环：18:55 校门刷卡 ✓ · 18:58 进入 A301 ✓ · 预计 19:50 离校。摄像头巡检显示孩子专注度 88（高于均值）。",
            "您可以放心忙别的，离校前 5 分钟会自动通知您到接送区时间。",
          ],
          nextActions: chips,
        }
      }
      return {
        headline: `孩子上课中 · 已 ${rt.liveElapsed}。`,
        body: ["我可以帮你做这 3 件：查看孩子上课状态、看 30 秒课堂直播、紧急情况代请假。"],
        nextActions: chips,
      }
    }
    return {
      headline: `孩子本节进步 3 名 ↑；学情报告与课堂风采已就位。`,
      body: ["你可以做这 3 件：看学情报告、看课堂风采、今晚怎么陪孩子。"],
      nextActions: chips,
    }
  }

  /** ============= 非主线：复用通用模板 ============= */
  const isPast = sum?.staticStatus === "past"
  /** 副文案按身份取——`briefSubtitle: string` 已拆为 `briefSubtitleByRole`（见 aiClassroomLessonsDemo.ts） */
  const subtitle = sum?.briefSubtitleByRole?.[role] ?? ""

  /** 时间标题：past 用"已结束"，upcoming 用"周X HH:MM" */
  const timeHeadline = isPast
    ? `《${lessonTitle}》已完成`
    : `${weekday} ${startTime}《${lessonTitle}》`

  /** subtitle 已去除"已完成/即将开课"前缀（与课表行徽章对齐），可直接放 body */
  const baseBody = subtitle ? [subtitle] : []

  if (role === "teacher") {
    return {
      headline: timeHeadline,
      body: isPast
        ? ["对这节课你可以做：布置今晚作业、群发学情报告、发送课堂风采。", ...baseBody]
        : ["对这节课你可以做：备课检查、推送预习给学生、处理请假/调课审批。", ...baseBody],
      nextActions: chips,
    }
  }
  if (role === "student") {
    return {
      headline: timeHeadline,
      body: isPast
        ? ["对这节课你可以做：写今晚作业、重做错题、AI 答疑这道题。", ...baseBody]
        : ["对这节课你可以做：开始预习、看本节课件、设置上课提醒。", ...baseBody],
      nextActions: chips,
    }
  }
  /** parent */
  return {
    headline: timeHeadline,
    body: isPast
      ? [
          "对这节课你可以做：看学情报告、看课堂风采、安排今晚怎么陪。",
          ...baseBody,
        ]
      : [
          "对这节课你可以做：看本节预告、看孩子预习进度、代请假/调课。",
          ...baseBody,
        ],
    nextActions: chips,
  }
}

/**
 * 一个"通用兑底" reply：当 `executeSkill` / `handleRecommendedPrompt` 既没命中 Skill 也没命中关键词时使用。
 * 不再让用户掉到"已收到：xxx"死胡同；至少给出 stage 当下的代表动作 + 自由追问入口。
 *
 * - `stage` 取 `effectiveStage`，确保过往课兜底也是"看报告 / 错题"系，而不是"开始备课"。
 */
export function buildFallbackReply(args: {
  role: EduLessonAttendingRole
  effectiveStage: EducationStage
  command: string
}): AiClassroomReply {
  const chips = WELCOME_CHIPS[args.role][args.effectiveStage]
  return {
    headline: `我先记下来了：${args.command}`,
    body: ["这一个动作演示版还没接通真实业务卡，不过我可以帮你分流到下面的常用动作；也可以直接打字继续问。"],
    nextActions: chips,
  }
}
