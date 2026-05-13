/**
 * 教学管理「资料 / 考勤 / 作业 / 风采」列表卡 marker 协议
 *
 * 设计动机
 * --------------------------------------------------
 * 「教学管理」二级菜单（《主CUI交互》教育主对话内）下的 4 个三级菜单点击后，
 * 都 push 一张「跨课次列表卡」到主对话：
 *   - 顶部统一为日期/老师/科目/状态筛选（与履约卡一致的体验）
 *   - 列表里把每一节课次按所选 kind 展示对应业务字段（资料 / 考勤数据 / 作业 / 风采状态）
 *   - 点击行 → 进入该课次的子 CUI 并自动打开对应业务子卡
 *
 * 与 `EduCourseFulfillmentCard` 边界
 * --------------------------------------------------
 * 履约卡每行右侧带 11 个操作图标，是「按课次维度的统一操作面板」；
 * 教学管理列表卡按 kind 单维聚焦：每行直接展示该 kind 的业务摘要，
 * 不再让用户在 11 个按钮里挑——降低决策成本。
 */

import type { EduSceneRole } from "./homeScenarioLayout"

export const LESSON_OPERATION_LIST_CARD_MARKER =
  "<<<RENDER_LESSON_OPERATION_LIST_CARD>>>" as const

export type LessonOperationListCardKind =
  | "materials"
  | "attendance"
  | "homework"
  | "review"

const ALL_KINDS: ReadonlySet<LessonOperationListCardKind> = new Set([
  "materials",
  "attendance",
  "homework",
  "review",
])

const ALL_ROLES: ReadonlySet<EduSceneRole> = new Set<EduSceneRole>([
  "teacher",
  "student",
  "parent",
  "admin",
])

/**
 * 教学管理 4 个三级菜单 id（4 角色共用同一组 id）。
 * 与 organizationDockConfig 中 `tm_*` 三级菜单一一对应。
 */
export const LESSON_OPERATION_MENU_KIND_MAP: Record<
  string,
  LessonOperationListCardKind
> = {
  tm_materials: "materials",
  tm_attendance: "attendance",
  tm_homework: "homework",
  tm_review: "review",
}

export function getLessonOperationKindByMenuId(
  menuId: string,
): LessonOperationListCardKind | null {
  return LESSON_OPERATION_MENU_KIND_MAP[menuId] ?? null
}

/** 角色 + kind 决定标题 / 头部副标 / 行操作语义 */
export function getLessonOperationCardTitle(
  role: EduSceneRole,
  kind: LessonOperationListCardKind,
): string {
  if (kind === "materials") return "教学管理 · 资料"
  if (kind === "attendance") return "教学管理 · 考勤"
  if (kind === "homework") return "教学管理 · 作业"
  if (kind === "review") {
    return role === "student" || role === "parent"
      ? "教学管理 · 报告风采"
      : "教学管理 · 点评风采"
  }
  return "教学管理"
}

/** marker 编码：`<<<…>>>:<role>:<kind>` */
export function buildLessonOperationListCardContent(
  role: EduSceneRole,
  kind: LessonOperationListCardKind,
): string {
  return `${LESSON_OPERATION_LIST_CARD_MARKER}:${role}:${kind}`
}

export interface ParsedLessonOperationListCard {
  role: EduSceneRole
  kind: LessonOperationListCardKind
}

export function parseLessonOperationListCardContent(
  content: string,
): ParsedLessonOperationListCard | null {
  const prefix = `${LESSON_OPERATION_LIST_CARD_MARKER}:`
  if (!content.startsWith(prefix)) return null
  const rest = content.slice(prefix.length)
  const parts = rest.split(":")
  const role = parts[0]
  const kind = parts[1]
  if (!role || !kind) return null
  if (!ALL_ROLES.has(role as EduSceneRole)) return null
  if (!ALL_KINDS.has(kind as LessonOperationListCardKind)) return null
  return {
    role: role as EduSceneRole,
    kind: kind as LessonOperationListCardKind,
  }
}
