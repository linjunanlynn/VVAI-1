/**
 * 教育跨应用跳转 handoff（demo · sessionStorage）。
 *
 * 解决"主 VVAI 看到教育 chip → 点击后能跳到教育门户并直接打开对应 Skill 业务卡"的两阶段链路：
 *
 * Phase 1（主 VVAI 内点击 chip）：
 *   - 写入 `pendingEduSkillRequest = { role, skillId, command, ts }`
 *   - 跳转到对应 scenario URL（teacher → edu-teacher，等等）
 *
 * Phase 2（目标 scenario 的 MainAIChatWindow 挂载）：
 *   - 启动后读取并消费 `pendingEduSkillRequest`
 *   - 调 `openAiClassroomSidePanel({ skillId, command, source: "main-vvai" })`
 *   - 删除 sessionStorage key 防止重复触发
 *
 * 同时提供"主 VVAI 顶部 PinnedTaskCard 是否需要展示教育 chip"的判定：
 *   - 仅在用户曾经访问过 scenario 6/7/8 时（写入了 `lastEduRole`）展示
 *   - 这样首次进 demo 主页的用户主 VVAI 顶部不会突然多出教育卡片
 */

import type { EduSceneRole } from "./homeScenarioLayout"

const KEY_PENDING_REQUEST = "cui-demo-pending-edu-skill-request.v1"
const KEY_LAST_ROLE = "cui-demo-last-edu-role.v1"

export type PendingEduSkillKind = "skill" | "im"

export interface PendingEduSkillRequest {
  role: EduSceneRole
  /**
   * 跳转意图：
   * - "skill"：携带 skillId / command；目标 scenario 挂载后自动打开 AI课堂侧 CUI 出对应业务卡
   * - "im"：仅做"切到对方身份门户看 IM banner"；目标 scenario 挂载后**不**自动开侧 CUI，
   *   让用户在主门户区直接看到 EduImInboxBanner 顶部红点提醒
   */
  kind: PendingEduSkillKind
  /** AI课堂 Skill 树中的 item.id（强契约；仅 kind="skill" 用） */
  skillId?: string
  /** 用户气泡显示文案（同时作为 fallback 模糊匹配；仅 kind="skill" 用） */
  command: string
  /** 打了多久之前的标记，过期判断使用（demo 30 分钟内有效） */
  ts: number
}

/* ============================================================
 * lastEduRole：用户最近一次访问的教育身份；用于主 VVAI 顶部决定是否聚合教育 chip
 * ============================================================ */

export function rememberLastEduRole(role: EduSceneRole): void {
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.setItem(
      KEY_LAST_ROLE,
      JSON.stringify({ role, ts: Date.now() }),
    )
  } catch {
    /* noop */
  }
}

export function readLastEduRole(): { role: EduSceneRole; ts: number } | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.sessionStorage.getItem(KEY_LAST_ROLE)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof parsed.role === "string" &&
      typeof parsed.ts === "number" &&
      ["teacher", "student", "parent"].includes(parsed.role)
    ) {
      return { role: parsed.role as EduSceneRole, ts: parsed.ts }
    }
  } catch {
    /* noop */
  }
  return null
}

/* ============================================================
 * pendingEduSkillRequest：主 VVAI → 教育 scenario 的"打开此 Skill"跨页面信号
 * ============================================================ */

export function writePendingEduSkillRequest(
  req: Omit<PendingEduSkillRequest, "ts" | "kind"> & { kind?: PendingEduSkillKind },
): void {
  if (typeof window === "undefined") return
  try {
    const full: PendingEduSkillRequest = {
      role: req.role,
      kind: req.kind ?? "skill",
      skillId: req.skillId,
      command: req.command,
      ts: Date.now(),
    }
    window.sessionStorage.setItem(KEY_PENDING_REQUEST, JSON.stringify(full))
  } catch {
    /* noop */
  }
}

/** 读取并清理（一次性消费） */
export function consumePendingEduSkillRequest(): PendingEduSkillRequest | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.sessionStorage.getItem(KEY_PENDING_REQUEST)
    if (!raw) return null
    window.sessionStorage.removeItem(KEY_PENDING_REQUEST)
    const parsed = JSON.parse(raw)
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof parsed.role === "string" &&
      typeof parsed.command === "string" &&
      typeof parsed.ts === "number" &&
      ["teacher", "student", "parent"].includes(parsed.role)
    ) {
      const req = parsed as PendingEduSkillRequest
      /** kind 兼容旧数据：缺省视为 "skill" */
      if (!req.kind) req.kind = "skill"
      /** 30 分钟内有效，避免历史信号串场 */
      if (Date.now() - req.ts > 30 * 60 * 1000) return null
      return req
    }
  } catch {
    /* noop */
  }
  return null
}

/* ============================================================
 * 教育 scenario URL 解析（与 Home.tsx 中的场景按钮保持一致）
 * ============================================================ */

const ROLE_TO_SCENARIO: Record<EduSceneRole, string> = {
  teacher: "edu-teacher",
  student: "edu-student",
  parent: "edu-parent",
  admin: "edu-admin",
}

/**
 * 绝对 URL（带 `/main-ai` 前缀）。从主 VVAI（也是 `/main-ai`）跳转时用 absolute path
 * 才能避免相对路径解析歧义；同时 `window.location.assign` 会触发完整 reload，
 * 让 `pendingEduSkillRequest` 被新 scenario 的 MainAIChatWindow 干净消费。
 */
export function buildEduRoleScenarioUrl(role: EduSceneRole): string {
  return `/main-ai?scenario=${ROLE_TO_SCENARIO[role]}`
}
