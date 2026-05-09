/**
 * 系列课子 CUI 的"按身份 × 状态"开场。
 *
 * 与 `aiClassroomWelcome.buildLessonOpeningReply` 思路一致：
 * - 第一行 headline 用一句"事实"
 * - body 1–3 行展开
 * - nextActions 1–4 个 chip（与 chip 文案规范一致）
 *
 * 状态分流：
 * - ongoing  → 已上 N / 总 M；提醒下一节预习 / 备课 / 调课 / 请假
 * - completed → 已结课，看完整结课报告 / 重做错题 / 联系老师
 * - upcoming → 还没开课，看大纲 / 预习 / 加日历
 */

import type { AiClassroomLessonSeries } from "./aiClassroomLessonSeriesDemo"
import type { EduLessonAttendingRole } from "./homeScenarioLayout"
import { buildReply, type AiClassroomReply } from "./aiClassroomReply"

export function buildSeriesOpeningReply(
  series: AiClassroomLessonSeries,
  role: EduLessonAttendingRole,
): AiClassroomReply {
  const subtitle = series.openingSubtitleByRole[role]
  switch (series.staticStatus) {
    case "ongoing":
      return buildOngoingReply(series, role, subtitle)
    case "completed":
      return buildCompletedReply(series, role, subtitle)
    case "upcoming":
      return buildUpcomingReply(series, role, subtitle)
  }
}

function buildOngoingReply(
  series: AiClassroomLessonSeries,
  role: EduLessonAttendingRole,
  subtitle: string,
): AiClassroomReply {
  const progress = `已上 ${series.completedLessons} / ${series.totalLessons} 节`
  if (role === "teacher") {
    return buildReply({
      headline: `进入《${series.name}》整期视图 · ${progress}`,
      body: [subtitle],
      nextActions: [
        { label: "看课次概览", prompt: "看课次概览", tone: "primary" },
        { label: "备下一节课", prompt: "备下一节课" },
        { label: "调课", prompt: "调课" },
      ],
    })
  }
  if (role === "student") {
    return buildReply({
      headline: `进入《${series.name}》整期视图 · ${progress}`,
      body: [subtitle],
      nextActions: [
        { label: "看课次概览", prompt: "看课次概览", tone: "primary" },
        { label: "看下一节预习", prompt: "看下一节预习" },
        { label: "请假", prompt: "请假" },
      ],
    })
  }
  return buildReply({
    headline: `进入《${series.name}》整期视图 · ${progress}`,
    body: [subtitle],
    nextActions: [
      { label: "看课次概览", prompt: "看课次概览", tone: "primary" },
      { label: "看孩子这期趋势", prompt: "看孩子这期趋势" },
      { label: "代孩子请假", prompt: "代孩子请假" },
    ],
  })
}

function buildCompletedReply(
  series: AiClassroomLessonSeries,
  role: EduLessonAttendingRole,
  subtitle: string,
): AiClassroomReply {
  if (role === "teacher") {
    return buildReply({
      headline: `《${series.name}》已结课 · 共 ${series.totalLessons} 节`,
      body: [subtitle],
      nextActions: [
        { label: "看完整结课报告", prompt: "看完整结课报告", tone: "primary" },
        { label: "看课次概览", prompt: "看课次概览" },
        { label: "导出本期记录", prompt: "导出本期记录" },
      ],
    })
  }
  if (role === "student") {
    return buildReply({
      headline: `《${series.name}》已结课 · 共 ${series.totalLessons} 节`,
      body: [subtitle],
      nextActions: [
        { label: "看完整结课报告", prompt: "看完整结课报告", tone: "primary" },
        { label: "重做本期错题", prompt: "重做本期错题" },
        { label: "看课次概览", prompt: "看课次概览" },
      ],
    })
  }
  return buildReply({
    headline: `《${series.name}》已结课 · 共 ${series.totalLessons} 节`,
    body: [subtitle],
    nextActions: [
      { label: "看完整结课报告", prompt: "看完整结课报告", tone: "primary" },
      { label: "看课次概览", prompt: "看课次概览" },
      { label: "联系老师", prompt: "联系老师" },
    ],
  })
}

function buildUpcomingReply(
  series: AiClassroomLessonSeries,
  role: EduLessonAttendingRole,
  subtitle: string,
): AiClassroomReply {
  if (role === "teacher") {
    return buildReply({
      headline: `《${series.name}》尚未开课 · 共 ${series.totalLessons} 节`,
      body: [subtitle],
      nextActions: [
        { label: "看课程大纲", prompt: "看课程大纲", tone: "primary" },
        { label: "补完最后 3 节备课", prompt: "补完最后 3 节备课" },
        { label: "给学员发预习", prompt: "给学员发预习" },
      ],
    })
  }
  if (role === "student") {
    return buildReply({
      headline: `《${series.name}》尚未开课 · 共 ${series.totalLessons} 节`,
      body: [subtitle],
      nextActions: [
        { label: "看课程大纲", prompt: "看课程大纲", tone: "primary" },
        { label: "开始第 1 节预习", prompt: "开始第 1 节预习" },
        { label: "加入我的日历", prompt: "加入我的日历" },
      ],
    })
  }
  return buildReply({
    headline: `《${series.name}》尚未开课 · 共 ${series.totalLessons} 节`,
    body: [subtitle],
    nextActions: [
      { label: "看课程大纲", prompt: "看课程大纲", tone: "primary" },
      { label: "加入家庭日历", prompt: "加入家庭日历" },
      { label: "提醒孩子开预习", prompt: "提醒孩子开预习" },
    ],
  })
}

/**
 * 系列课兜底回复：用户在系列子 CUI 输入 / 触发的内容未命中任何具体逻辑时使用。
 * 给 3 个常用出口（看概览 / 调课 / 请假），与开场 chip 风格对齐。
 */
export function buildSeriesFallbackReply(
  series: AiClassroomLessonSeries,
  role: EduLessonAttendingRole,
  command: string,
): AiClassroomReply {
  return buildReply({
    headline: `已收到：${command}`,
    body: [
      `本系列课的整期视图里能做的事：看课次概览、看进度、${
        role === "teacher" ? "调课 / 给学员发通知" : "请假 / 看下一节预习"
      }。`,
    ],
    nextActions: [
      { label: "看课次概览", prompt: "看课次概览", tone: "primary" },
      role === "teacher"
        ? { label: "调课", prompt: "调课" }
        : { label: "请假", prompt: "请假" },
      role === "teacher"
        ? { label: "给学员发通知", prompt: "给学员发通知" }
        : { label: "看下一节预习", prompt: "看下一节预习" },
    ],
  })
}
