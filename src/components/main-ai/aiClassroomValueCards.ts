/**
 * AI 课堂「价值卡」数据 + marker。
 *
 * 设计动机
 * ----------------------------------------------------
 * 与子 CUI 既有的「本节清单」卡（`aiClassroomChecklist.ts`）正交：
 * - 清单卡：用户**本人要做的 N 件事**（点完一件打勾，做完庆祝）
 * - 价值卡：**AI 已经替你做完的事 / AI 在替你做的事**——展现 AI 课堂带给该角色的"跨时代价值"
 *
 * 与产品方向同步的 9 张卡（3 角色 × 课前 / 课中 / 课后）：
 *   teacher × pre  → 本班课前准备清单（学情、重点学生、讲法建议、开场题）
 *   teacher × in   → 课中实时学情仪表板与个性化推题（直播窗承载完整体验，本卡是入口）
 *   teacher × post → 课后产物一键签发（学情报告、批改、家校沟通、课堂照片、下节课预习包）
 *   student × pre  → 老师下发的个性化预习内容
 *   student × in   → 课中 AI 助教随时可问（直播窗承载完整体验，本卡是入口）
 *   student × post → 课后学习内容（重点总结、错题本、AI 答疑、自适应练习）
 *   parent  × pre  → 三段式简报：今晚课、孩子状态、你今晚的角色
 *   parent  × in   → 课中通知中心（线上/线下分流，只发需要立刻知道的事）
 *   parent  × post → 课后亮点集锦 + AI 陪学辅导
 *
 * 每张卡都给出一个"卖点 headline"（结果导向）+ 若干 "AI 已就绪 / AI 主动提供" 的 bullet，
 * 加上 1-3 个推荐动作（chip）让用户即刻继续闭环。点击 chip 走与现有 `nextActions` 同款链路。
 */

import type { EduLessonAttendingRole } from "./homeScenarioLayout"
import type { EducationStage } from "./educationStageDemo"
import type { LessonDeliveryMode } from "./lessonDeliveryMode"
import type { AiClassroomReplyAction } from "./aiClassroomReply"

export interface AiClassroomValueCardBullet {
  /** 加粗的产物名/价值点 */
  title: string
  /** 一句话补充（为什么有价值 / 状态摘要） */
  meta: string
  /**
   * 状态徽章（可选）：
   * - "ready"：AI 已就绪，等你确认 / 一键发出
   * - "auto"：AI 已自动完成，不需要你再操作
   * - "fresh"：刚刚生成 / 刚刚归档
   */
  status?: "ready" | "auto" | "fresh"
  /** 数字徽章，例如 "30 份" */
  countLabel?: string
}

export interface AiClassroomValueCard {
  /** 整张卡的"省了什么 / 多了什么"结果导向 headline */
  headline: string
  /** 副标（功能名导向，配合 headline） */
  subtitle: string
  /** 主体内容；3-5 个 bullet 最佳 */
  bullets: AiClassroomValueCardBullet[]
  /**
   * 顶部小色条：用于增强 AI 主动产物的视觉权重；
   * - "primary"：主色（默认，老师课后等"高密度产物"卡片用）
   * - "success"：成功色（学生课后亮点 / 家长亮点集锦）
   * - "info"：信息色（家长课前简报）
   * - "warning"：警示色（家长课中通知中心）
   */
  tone?: "primary" | "success" | "info" | "warning"
  /** chip 行：1-4 个动作 */
  nextActions?: AiClassroomReplyAction[]
  /** 一句话脚注（弱显示），如来源 / 数据口径 */
  systemNote?: string
}

/* ============================================================
 * Marker：序列化进 Message.content
 * ============================================================ */
export const AIC_VALUE_CARD_MARKER = "<<<AIC_VALUE_CARD>>>"

export interface AiClassroomValueCardKey {
  role: EduLessonAttendingRole
  stage: EducationStage
  /** 仅 parent × in 用得到（线上/线下事件不同） */
  deliveryMode?: LessonDeliveryMode
}

export function buildValueCardContent(key: AiClassroomValueCardKey): string {
  const mode = key.deliveryMode ?? "online"
  return `${AIC_VALUE_CARD_MARKER}:${key.role}:${key.stage}:${mode}`
}

export function parseValueCardMarker(content: string): AiClassroomValueCardKey | null {
  if (typeof content !== "string") return null
  if (!content.startsWith(`${AIC_VALUE_CARD_MARKER}:`)) return null
  const rest = content.slice(`${AIC_VALUE_CARD_MARKER}:`.length)
  const [role, stage, mode] = rest.split(":")
  if (role !== "teacher" && role !== "student" && role !== "parent") return null
  if (stage !== "pre" && stage !== "in" && stage !== "post") return null
  const deliveryMode: LessonDeliveryMode | undefined =
    mode === "online" || mode === "offline" ? mode : undefined
  return { role, stage, deliveryMode }
}

/* ============================================================
 * 数据矩阵：3 角色 × {pre,in,post}（老师/学生的课中价值在子 CUI 与直播窗共同呈现）
 * ============================================================ */

const TEACHER_PRE_ONLINE: AiClassroomValueCard = {
  headline: "今晚课的本班准备清单已就绪，预计帮你节省 1.5 小时备课",
  subtitle: "包含本班最近学情、需要重点关注的学生、统一课件的本班讲法建议、开场可问的学生",
  tone: "primary",
  bullets: [
    {
      title: "上节课全班的薄弱点已整理",
      meta: "矢量方向、摩擦力两个核心点本班集中没掌握，建议本节前 5 分钟回顾一下",
      status: "auto",
    },
    {
      title: "今晚需要重点关注的 3 名学生",
      meta: "张同学（上节摩擦力没掌握）、王同学（家长上周提了进度焦虑）、陈同学（连续 2 周作业质量下滑）",
      status: "auto",
      countLabel: "3 人",
    },
    {
      title: "本班使用统一课件的讲法建议",
      meta: "例 3 本班已掌握可跳过；例 5 建议加一道铺垫题；难点 2 建议延长 5 分钟讲解",
      status: "ready",
    },
    {
      title: "开场可以提问的学生与问题",
      meta: "已为你挑出 3 位适合开场被问的学生和对应问题，既能带动课堂气氛，又能侧面检验上节学情",
      status: "ready",
      countLabel: "3 题",
    },
  ],
  nextActions: [
    { label: "查看完整准备内容", prompt: "查看本班准备内容", tone: "primary" },
    { label: "微调讲法建议", prompt: "微调本班讲法建议" },
    { label: "查看重点学生", prompt: "查看重点学生" },
  ],
  systemNote: "数据来源：本班最近 4 节课学情 + 家校沟通记录",
}

const TEACHER_PRE_OFFLINE: AiClassroomValueCard = {
  ...TEACHER_PRE_ONLINE,
  subtitle: "包含本班最近学情、需要重点关注的学生、教室讲解节奏建议、到课名单",
  bullets: [
    TEACHER_PRE_ONLINE.bullets[0],
    TEACHER_PRE_ONLINE.bullets[1],
    {
      title: "本节课的教室讲解节奏建议",
      meta: "板书 6 段、互动 4 段、当堂练习 2 段；已在统一课件上按本班节奏标好",
      status: "ready",
    },
    {
      title: "今晚到课名单已自动监控",
      meta: "30 人应到；签到环节由 AI 自动统计未到学员并第一时间提示你",
      status: "auto",
      countLabel: "30 人",
    },
  ],
}

const TEACHER_POST: AiClassroomValueCard = {
  headline: "本节课后 30 份产物已生成，你 10 分钟内审完即可一键发出",
  subtitle: "学情报告、作业批改、家校沟通、课堂照片、下节课预习包，全部 AI 生成，你只需审阅",
  tone: "primary",
  bullets: [
    {
      title: "30 份学情报告（每位学生一份，附具体课堂证据）",
      meta: "李小明（亮点）和陈可（风险）2 份建议优先审；其余 28 份风格一致可批量通过",
      status: "ready",
      countLabel: "30 份",
    },
    {
      title: "作业已批改完，6 份争议题需要你二次复核",
      meta: "AI 批改 24 份直接通过；标红的 6 份请你看一下，其余可一键通过",
      status: "ready",
      countLabel: "24 + 6",
    },
    {
      title: "30 份给家长的沟通文案，按家长类型分别准备",
      meta: "焦虑型、放手型、比较型、续报犹豫型 4 类家长各有不同语气，避免千篇一律",
      status: "ready",
      countLabel: "30 份",
    },
    {
      title: "30 张课堂照片，每张已配好给该家长的文案",
      meta: "AI 自动抓拍每位学员的高光时刻，配文已结合该家长平时的沟通习惯",
      status: "auto",
      countLabel: "30 张",
    },
    {
      title: "30 份下节课预习包，按学生分别个性化",
      meta: "已基于本节表现和历史薄弱点生成；以「老师下发」名义发出，学生看到的是你布置的",
      status: "ready",
      countLabel: "30 份",
    },
  ],
  nextActions: [
    { label: "审完后一键发出全部", prompt: "审核并一键签发课后产物", tone: "primary" },
    { label: "先审重点学生 2 份", prompt: "先审重点学生报告" },
    { label: "预览下节课预习包", prompt: "预览下节课预习包" },
  ],
  systemNote: "全部审阅平均 8-12 分钟（之前的流程是每节课约 2 小时）",
}

const STUDENT_PRE_ONLINE: AiClassroomValueCard = {
  headline: "王老师为你准备的预习内容已就绪，10 分钟内可以做完",
  subtitle: "AI 根据你的薄弱点生成，老师审核后下发给你",
  tone: "info",
  bullets: [
    {
      title: "30 秒读完今晚课会学什么",
      meta: "矢量合成方法和力的分解 2 个核心知识点，会用到上节摩擦力的结论",
      status: "fresh",
    },
    {
      title: "5 分钟预习视频",
      meta: "讲透「什么是力的合成」，看完就能听懂今晚前 20 分钟的课",
      status: "ready",
    },
    {
      title: "3 道前置题，其中 1 道针对你的薄弱点",
      meta: "矢量方向那道是你上节没掌握的，做完就能跟上今晚的展开",
      status: "ready",
      countLabel: "3 道",
    },
    {
      title: "上课提醒已设好",
      meta: "19:00 准时上线，提前 5 分钟测网络；家长那边也会同步收到提示",
      status: "auto",
    },
  ],
  nextActions: [
    { label: "开始预习", prompt: "开始预习", tone: "primary" },
    { label: "跳到我薄弱的那题", prompt: "跳到薄弱题练习" },
    { label: "只看视频", prompt: "看预习视频" },
  ],
  systemNote: "由王老师下发，AI 帮你做了个性化处理",
}

const STUDENT_PRE_OFFLINE: AiClassroomValueCard = {
  ...STUDENT_PRE_ONLINE,
  bullets: [
    STUDENT_PRE_ONLINE.bullets[0],
    STUDENT_PRE_ONLINE.bullets[1],
    STUDENT_PRE_ONLINE.bullets[2],
    {
      title: "到教室提醒已设好",
      meta: "18:50 提前到 A301 物理教室上课；带好课本和草稿纸",
      status: "auto",
    },
  ],
}

const TEACHER_IN_ONLINE: AiClassroomValueCard = {
  headline: "AI 课堂直播中，实时学情仪表板正在帮你监测全班",
  subtitle: "实时学情仪表板、个性化随堂推题、走神和异常自动提醒、课堂自动纪要",
  tone: "primary",
  bullets: [
    {
      title: "全班抬头率、举手数、答题正确率正在实时统计",
      meta: "进入 AI 互动课堂后，左侧面板永久可见，数据每秒刷新一次",
      status: "auto",
    },
    {
      title: "随堂题已经准备好，可一键推送给全班",
      meta: "同一道题会按 3 档难度自动分发，给不同水平的学生不同版本",
      status: "ready",
    },
    {
      title: "学生走神时会主动提醒你",
      meta: "目前陈可走神超过 3 秒，建议下一题轻点名 ta",
      status: "auto",
    },
    {
      title: "课堂内容正在自动整理",
      meta: "板书、关键讲解、学生回答都已记录，下课会自动归入课后报告",
      status: "auto",
    },
  ],
  nextActions: [
    { label: "进入 AI 互动课堂", prompt: "进入AI互动课堂", tone: "primary" },
    { label: "查看完整仪表板", prompt: "查看实时学情仪表板" },
    { label: "推一道随堂题", prompt: "出一道随堂题" },
  ],
  systemNote: "完整仪表板在 AI 课堂直播窗的左侧；本对话窗仍可同时使用",
}

const TEACHER_IN_OFFLINE: AiClassroomValueCard = {
  ...TEACHER_IN_ONLINE,
  subtitle: "教室白板与学生 Pad 联动、个性化推题、出勤和异常签到自动监控",
  bullets: [
    {
      title: "学生人手一台 Pad，AI 帮你统计全班状态",
      meta: "30 台 Pad 实时同步课件和答题；抬头率、举手、答题正确率随时可查",
      status: "auto",
    },
    {
      title: "随堂题可一键推送到学生 Pad",
      meta: "同一道题按 3 档难度自动分发；按每位学生的薄弱点匹配对应版本",
      status: "ready",
    },
    TEACHER_IN_ONLINE.bullets[2],
    {
      title: "出勤和异常签到已自动统计",
      meta: "30 / 30 全班到齐；中途有任何同学离场会立刻告知你",
      status: "auto",
      countLabel: "30 人",
    },
  ],
}

const STUDENT_IN_ONLINE: AiClassroomValueCard = {
  headline: "AI 助教在 AI 课堂里全程在线，跟不上随时可以问 TA",
  subtitle: "私聊 AI 助教、自动课堂笔记、不懂就标、个性化随堂题",
  tone: "primary",
  bullets: [
    {
      title: "AI 助教随时可以私聊",
      meta: "举手不便、不敢问的，直接私聊 AI；AI 会基于王老师当下讲的内容回答你",
      status: "ready",
    },
    {
      title: "课堂笔记正在自动整理",
      meta: "板书、关键讲解、你答错的题都会同步记录，下课点开就能看到",
      status: "auto",
    },
    {
      title: "听到没听懂的可以一键标记",
      meta: "标了不打断课堂；下课后 AI 会自动给这一段配上讲解视频",
      status: "ready",
    },
    {
      title: "随堂题已经为你准备好",
      meta: "老师推题时你会自动收到；做错时 AI 立刻讲，做对时给你更进阶的题",
      status: "ready",
    },
  ],
  nextActions: [
    { label: "进入 AI 互动课堂", prompt: "进入AI互动课堂", tone: "primary" },
    { label: "提前问 AI 一道题", prompt: "提前问 AI 一道题" },
  ],
  systemNote: "AI 助教在 AI 课堂直播窗的「VVAI 助理」tab；本对话窗仍可同时使用",
}

const STUDENT_IN_OFFLINE: AiClassroomValueCard = {
  ...STUDENT_IN_ONLINE,
  subtitle: "在 Pad 上私聊 AI 助教、自动笔记、不懂就标、个性化随堂题",
  bullets: [
    {
      title: "在 Pad 上随时可以私聊 AI 助教",
      meta: "举手不便、不敢问的，直接在 Pad 上发给 AI；不会影响课堂节奏",
      status: "ready",
    },
    STUDENT_IN_ONLINE.bullets[1],
    STUDENT_IN_ONLINE.bullets[2],
    STUDENT_IN_ONLINE.bullets[3],
  ],
}

const STUDENT_POST: AiClassroomValueCard = {
  headline: "今晚学到的都已整理好，5 分钟看完今天；自适应练习已为你排好顺序",
  subtitle: "3 句话重点总结、AI 错题本、AI 随时答疑、个性化自适应练习",
  tone: "success",
  bullets: [
    {
      title: "今晚课的 3 句话重点总结",
      meta: "今天学了什么、为什么重要、下节课会怎么用——1 分钟看完不会忘",
      status: "fresh",
    },
    {
      title: "今天的 5 道错题已收进错题本",
      meta: "AI 已按错因分类，每道题都录好了讲解；想再做一遍同类题也能马上出",
      status: "auto",
      countLabel: "5 道",
    },
    {
      title: "做练习、看笔记、写作业，遇到不会的随时问 AI",
      meta: "不止错题本里的题，任何题都能问；AI 会用王老师的方式给你讲",
      status: "ready",
    },
    {
      title: "10 道自适应练习已为你排好顺序",
      meta: "按你今晚的薄弱点和历史易错点排序；做完会立刻告诉你下节课要重点听什么",
      status: "ready",
      countLabel: "10 道",
    },
  ],
  nextActions: [
    { label: "看重点回顾", prompt: "看本节重点回顾", tone: "primary" },
    { label: "打开错题本", prompt: "打开错题本" },
    { label: "做今晚练习", prompt: "做今晚自适应练习" },
    { label: "我有题想问 AI", prompt: "我有题想问 AI 答疑" },
  ],
  systemNote: "练习题的难度会随你的正确率自动调整",
}

const PARENT_PRE_ONLINE: AiClassroomValueCard = {
  headline: "今晚 19:00 物理课，AI 已为你准备好今晚的简报，今晚不需要你做什么",
  subtitle: "今晚课、孩子状态、你今晚的角色，三段一句话",
  tone: "info",
  bullets: [
    {
      title: "今晚课",
      meta: "物理 · 力学专题 · 19:00–19:45 · 王老师 · 线上互动教室 A1",
      status: "fresh",
    },
    {
      title: "孩子状态",
      meta: "上节「摩擦力」已掌握；今晚切入新章节；预习包已完成 100%，准备充分",
      status: "auto",
    },
    {
      title: "你今晚的角色",
      meta: "今晚不需要你做什么；提前 5 分钟提醒孩子上线即可；课中如有异常会主动通知你",
      status: "ready",
    },
  ],
  nextActions: [
    { label: "想看预习内容", prompt: "查看孩子今晚预习" },
    { label: "设到课提醒", prompt: "设到课提醒" },
  ],
  systemNote: "AI 给家长的简报会在每节课前自动发；今晚不需要任何动作时也会明确告诉你",
}

const PARENT_PRE_OFFLINE: AiClassroomValueCard = {
  ...PARENT_PRE_ONLINE,
  bullets: [
    {
      ...PARENT_PRE_ONLINE.bullets[0],
      meta: "物理 · 力学专题 · 19:00–19:45 · 王老师 · A301 物理教室",
    },
    PARENT_PRE_ONLINE.bullets[1],
    {
      title: "你今晚的角色",
      meta: "提前 18:50 送达即可；课后由前台统一接送，到课和离场都会自动通知你",
      status: "ready",
    },
  ],
  nextActions: [
    { label: "设送达提醒", prompt: "设送达提醒" },
    { label: "想看预习内容", prompt: "查看孩子今晚预习" },
  ],
}

const PARENT_IN_ONLINE: AiClassroomValueCard = {
  headline: "课中通知中心：没有消息就是一切正常",
  subtitle: "课中只发需要你立刻知道的事；学习类反馈课后给你完整版",
  tone: "warning",
  bullets: [
    {
      title: "AI 课中会主动告诉你的事",
      meta: "设备和网络异常、长时间没响应、突发情绪或健康事件",
      status: "auto",
    },
    {
      title: "你课中可能收到的通知",
      meta: "孩子掉线满 1 分钟会立刻告知你；其他学习状态全部留到课后报告，避免分心和焦虑",
      status: "ready",
    },
    {
      title: "今晚目前一切正常",
      meta: "孩子已上线、已答 1 题、设备稳定；下课后 1 分钟内会推送今晚完整亮点和学情",
      status: "fresh",
    },
  ],
  nextActions: [
    { label: "通知偏好设置", prompt: "管理课中通知偏好" },
    { label: "下课通知我", prompt: "下课通知我" },
  ],
  systemNote: "课中没有消息就是一切正常；这样可以避免被频繁打扰，也避免和别家孩子横向比较",
}

const PARENT_IN_OFFLINE: AiClassroomValueCard = {
  headline: "课中通知中心：到课、接送、突发会主动通知，其他时候没消息就是正常",
  subtitle: "线下场景 AI 帮你掌握关键节点，只在你需要做决策时通知你",
  tone: "warning",
  bullets: [
    {
      title: "孩子已签到，时间 18:55",
      meta: "在 A301 物理教室刷脸进入；今晚出勤 30 / 30 全班到齐",
      status: "fresh",
    },
    {
      title: "AI 课中会主动告诉你的事",
      meta: "未按时签到、离场异常、突发情绪或健康事件、老师手动触发的通知",
      status: "auto",
    },
    {
      title: "今晚预计 19:50 下课",
      meta: "下课后 5 分钟会推送接送提醒和课堂照片；不需要你提前盯",
      status: "ready",
    },
  ],
  nextActions: [
    { label: "提前接送提醒", prompt: "设接送提醒" },
    { label: "通知偏好设置", prompt: "管理课中通知偏好" },
  ],
  systemNote: "课中没有消息就是一切正常；学习类反馈课后给你完整版",
}

const PARENT_POST: AiClassroomValueCard = {
  headline: "今晚孩子的 3 个亮点已生成，完整学情和 AI 陪学辅导随时可用",
  subtitle: "课后亮点集锦、完整学情报告、AI 陪学辅导（你不会的题让 AI 讲给孩子）",
  tone: "success",
  bullets: [
    {
      title: "今晚的 3 个亮点（每个孩子都有）",
      meta: "①主动举手回答力的合成 ②小组讨论中帮同学解释矢量方向 ③堂练全对",
      status: "fresh",
      countLabel: "3 项",
    },
    {
      title: "课堂照片已配上王老师的评语",
      meta: "「今晚孩子在小组讨论中表现非常活跃，积极帮助同学理解新概念」——配图已附",
      status: "auto",
    },
    {
      title: "完整学情报告已生成，每条都有具体时间和原话",
      meta: "第 8 分钟主动发言、第 22 分钟答对难题、堂练 5 / 5 全对，全部能查到原始课堂片段",
      status: "ready",
    },
    {
      title: "AI 陪学辅导随时可用",
      meta: "孩子做今晚自适应练习不会的题，你拍照发给 AI，AI 会用王老师的方式讲给孩子",
      status: "ready",
    },
  ],
  nextActions: [
    { label: "看亮点和课堂照片", prompt: "查看今晚亮点集锦", tone: "primary" },
    { label: "看完整学情报告", prompt: "查看完整学情报告" },
    { label: "让 AI 陪孩子做练习", prompt: "AI 陪学辅导" },
    { label: "分享给爷爷奶奶", prompt: "分享给家人" },
  ],
  systemNote: "学情报告每一条都附具体时间和原始课堂片段，不再是模板化反馈",
}

/* ============================================================
 * 索引：role × stage × deliveryMode → 卡数据
 * ============================================================ */
type ValueCardMatrix = Record<
  EduLessonAttendingRole,
  Record<EducationStage, Record<LessonDeliveryMode, AiClassroomValueCard | null>>
>

const MATRIX: ValueCardMatrix = {
  teacher: {
    pre: { online: TEACHER_PRE_ONLINE, offline: TEACHER_PRE_OFFLINE },
    in: { online: TEACHER_IN_ONLINE, offline: TEACHER_IN_OFFLINE },
    post: { online: TEACHER_POST, offline: TEACHER_POST },
  },
  student: {
    pre: { online: STUDENT_PRE_ONLINE, offline: STUDENT_PRE_OFFLINE },
    in: { online: STUDENT_IN_ONLINE, offline: STUDENT_IN_OFFLINE },
    post: { online: STUDENT_POST, offline: STUDENT_POST },
  },
  parent: {
    pre: { online: PARENT_PRE_ONLINE, offline: PARENT_PRE_OFFLINE },
    in: { online: PARENT_IN_ONLINE, offline: PARENT_IN_OFFLINE },
    post: { online: PARENT_POST, offline: PARENT_POST },
  },
}

export function getAiClassroomValueCard(
  role: EduLessonAttendingRole,
  stage: EducationStage,
  deliveryMode: LessonDeliveryMode = "online",
): AiClassroomValueCard | null {
  return MATRIX[role][stage][deliveryMode] ?? null
}

export function hasAiClassroomValueCard(
  role: EduLessonAttendingRole,
  stage: EducationStage,
  deliveryMode: LessonDeliveryMode = "online",
): boolean {
  return getAiClassroomValueCard(role, stage, deliveryMode) !== null
}
