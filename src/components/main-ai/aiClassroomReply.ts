/**
 * AI 课堂子 CUI 的「结构化 AI 回复」原子。
 *
 * 设计动机
 * ----------------------------------------------------
 * 旧实现里，子 CUI 的 AI 文本回复都是字符串（`resolveRecommendedPromptReply` 返回 string），
 * 末尾常带"下一步可以：① X；② Y；③ Z"——但这只是文字，**用户看完不知道点哪儿能继续**。
 * 这与产品要求的「don't make me think」直接相悖。
 *
 * 本模块的角色
 * ----------------------------------------------------
 * 1. 把"AI 回复"提到一个统一类型 `AiClassroomReply`：headline / body / systemNote / nextActions
 * 2. 用 marker 把它序列化进 `Message.content`，与现有 `<<<RENDER_AI_SKILL_CARD>>>` marker 共存
 * 3. 渲染时由 `AiClassroomSideConversationPanel` 的 `MessageBubble` 解析，**自动把 nextActions 渲染成可点击 chip 行**
 * 4. 同时提供 `inferReplyFromLegacyText`：把旧字符串模板（含"下一步可以：①…；②…；③…"）**无侵入**地推断成结构化，
 *    避免一次性迁移 40+ 段已写好的闭环文案
 *
 * 与 Skill 卡 marker（`<<<RENDER_AI_SKILL_CARD>>>:<id>`）的边界
 * ----------------------------------------------------
 * - Skill 卡：业务卡片（含丰富 stats/bullets/charts）由 `AiClassroomSkillCard` / Bespoke 组件渲染
 * - Reply：纯文本叙述 + 1–4 个下一步动作；用于"推荐指令"点击后的轻闭环 与 入场欢迎
 */

export interface AiClassroomReplyAction {
  /** 按钮文案 */
  label: string
  /** 点击后作为新一条用户气泡发回的 prompt（默认 = label） */
  prompt: string
  /** chip 视觉权重；primary 用于推荐主动作，其余 secondary（默认） */
  tone?: "primary" | "secondary"
}

export interface AiClassroomReply {
  /** 第一句"事实/状态"——通常是 AI 收到指令后的总结 */
  headline: string
  /** 1–6 行展开（可空） */
  body?: string[]
  /** 1 行系统级元信息（如 "（已写入 IM：切到 xxx 可看）"），灰色弱显示 */
  systemNote?: string
  /** 1–4 个可点击的下一步；点击 = 触发 onRecommendedPrompt(action.prompt) */
  nextActions?: AiClassroomReplyAction[]
}

/** 序列化进 `Message.content` 的 marker */
export const AIC_REPLY_MARKER = "<<<AIC_REPLY>>>"

/**
 * 序列化为可放入 `Message.content` 的字符串（带 marker 前缀）。
 * 失败时返回纯文本拼接，保证至少展示信息（不丢消息）。
 */
export function serializeAiClassroomReply(reply: AiClassroomReply): string {
  try {
    return `${AIC_REPLY_MARKER}:${JSON.stringify(reply)}`
  } catch {
    return [
      reply.headline,
      ...(reply.body ?? []),
      ...(reply.systemNote ? [reply.systemNote] : []),
    ].join("\n")
  }
}

/**
 * 解析 `Message.content`：命中 marker 时返回结构化对象，否则 null。
 * 兼容旧消息（普通字符串）共存。
 */
export function parseAiClassroomReply(content: string): AiClassroomReply | null {
  if (typeof content !== "string") return null
  if (!content.startsWith(`${AIC_REPLY_MARKER}:`)) return null
  try {
    const json = content.slice(`${AIC_REPLY_MARKER}:`.length)
    const parsed = JSON.parse(json) as AiClassroomReply
    if (typeof parsed?.headline !== "string") return null
    return parsed
  } catch {
    return null
  }
}

/**
 * 从旧字符串模板「自动」推断出结构化 reply。
 *
 * 兼容的格式（基于 `resolveRecommendedPromptReply` 既有写法）：
 * ```
 * 第一句话事实。
 * 第二行展开...
 * （某些回复带的）（已写入 IM：xxx）
 *
 * 下一步可以：① 动作 A；② 动作 B；③ 动作 C。
 * ```
 *
 * 解析规则：
 * 1) 找到「下一步可以：」所在行 → 用 ①②③④⑤ + 中文/英文分号 拆出 actions
 * 2) 行首以 `（…）` 包裹的视为 `systemNote`
 * 3) 第 1 行非空文本 = `headline`；其余为 `body`
 *
 * 命中不到「下一步可以：」时，整段文本仍可直接转为 `{ headline, body }` 的 reply（无 chip）。
 */
export function inferAiClassroomReplyFromText(text: string): AiClassroomReply {
  const lines = text.split(/\r?\n/).map((l) => l.trim())

  /** 拆 nextActions */
  let nextActions: AiClassroomReplyAction[] | undefined
  let nextActionsLineIdx = -1
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    /** 兼容"下一步可以：" / "下一步可以..." 起头 */
    if (/^下一步可以[：:]/.test(line)) {
      nextActionsLineIdx = i
      const tail = line.replace(/^下一步可以[：:]\s*/, "")
      const items = splitNextActionsLine(tail)
      if (items.length > 0) nextActions = items
      break
    }
  }

  /** body / systemNote 收集（排除 nextActions 行 + 它前后的空行噪音） */
  const beforeActions = nextActionsLineIdx >= 0 ? lines.slice(0, nextActionsLineIdx) : lines
  /** 去除尾部连续空行 */
  while (beforeActions.length > 0 && beforeActions[beforeActions.length - 1] === "") {
    beforeActions.pop()
  }

  /** systemNote = 倒数第一条以「（…）」包裹的行；提出来用 */
  let systemNote: string | undefined
  for (let i = beforeActions.length - 1; i >= 0; i--) {
    const line = beforeActions[i]
    if (line === "") continue
    if (/^（.+）$/.test(line) || /^\(.+\)$/.test(line)) {
      systemNote = line
      beforeActions.splice(i, 1)
    }
    break
  }

  /** headline = 第一行非空 */
  let headline = ""
  let headlineIdx = -1
  for (let i = 0; i < beforeActions.length; i++) {
    if (beforeActions[i] !== "") {
      headline = beforeActions[i]
      headlineIdx = i
      break
    }
  }

  const body = headlineIdx >= 0
    ? beforeActions
        .slice(headlineIdx + 1)
        .filter((l) => l !== "")
    : []

  return {
    headline,
    body: body.length > 0 ? body : undefined,
    systemNote,
    nextActions,
  }
}

/**
 * 把"① 动作 A；② 动作 B；③ 动作 C。"切成结构化 nextActions。
 * 容错：
 * - 圆圈数字 ①②③④⑤⑥⑦⑧⑨⑩
 * - 半角数字 1) 2) 3)
 * - 分号 / 中文分号 / 顿号
 * - 末尾可能跟"。"
 */
function splitNextActionsLine(tail: string): AiClassroomReplyAction[] {
  if (!tail) return []
  /** 去掉末尾整体的「。」/「.」 */
  const normalized = tail.replace(/[。.]\s*$/, "")
  /** 用 ①②③ 等切，再回填编号；找不到圆圈数字时退化为按 ; / ； 切 */
  const circle = /[①②③④⑤⑥⑦⑧⑨⑩]/g
  const hasCircle = circle.test(normalized)
  let segments: string[]
  if (hasCircle) {
    /** split 后第 0 段是头部空字符（开头的圈号前面无内容），过滤掉空 */
    segments = normalized
      .split(/[①②③④⑤⑥⑦⑧⑨⑩]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
  } else {
    segments = normalized
      .split(/[；;]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
  }
  /** 去除末尾可能残留的「；」「;」 */
  return segments.slice(0, 4).map((label) => {
    const cleaned = label.replace(/[；;]\s*$/, "").trim()
    return { label: cleaned, prompt: cleaned }
  })
}

/**
 * 工具：构造一条结构化 reply。比手写对象字面量更紧凑，便于场景化 fallback 使用。
 */
export function buildReply(input: AiClassroomReply): AiClassroomReply {
  return input
}
