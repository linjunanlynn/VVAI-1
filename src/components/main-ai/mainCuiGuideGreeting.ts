/** 主 VVAI 会话：空态气泡、新会话种子、场景入口等统一引导语（旧版一句式，非六/七/八主视觉稿） */
export const MAIN_CUI_GUIDE_GREETING =
  '欢迎使用VVAI，VVAI 是面向企业、家庭与教育组织的一体化智能平台。 你可以直接对话告诉我你要做什么，或者通过下方推荐指令加入组织/空间后解锁更多功能，开启"你说我做"的AI智慧体验。'

/**
 * 《主CUI交互》标准欢迎（与产品稿一致：标题 + 正文 + 弱提示）。
 * 用于场景六/七/八进入 **主 VVAI** 时的首屏——与「首次进入教育应用」内的身份化开场区分。
 */
export const MAIN_VVAI_STANDARD_TITLE = "欢迎使用VV AI"

export const MAIN_VVAI_STANDARD_BODY =
  "VV AI你说我做的！并为您提供覆盖工作、教育、生活与健康的智能服务。"

export const MAIN_VVAI_STANDARD_HINT =
  "在输入框告诉我我的需求或问题，我会理解并帮助您高效完成任务！"

/** 写入消息流 / 纯文本气泡时的合并版（无样式时的兜底） */
export function buildMainVvaiStandardWelcomePlainText(): string {
  return `${MAIN_VVAI_STANDARD_TITLE}\n\n${MAIN_VVAI_STANDARD_BODY}\n\n${MAIN_VVAI_STANDARD_HINT}`
}

/** 场景零（`no-org` 且无组织）：主 VVAI 首条助手气泡文案（与推荐指令一并写入消息流） */
export const SCENARIO_ZERO_MAIN_CUI_GUIDE_GREETING = MAIN_CUI_GUIDE_GREETING
