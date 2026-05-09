/**
 * 校长（场景九）4 张身份化业务卡数据：
 * - 当 admin 在主开场点击 4 chip 之一时，由 handleEduRoleSkillCommand 拦截后
 *   在主对话流追加一条 ADMIN_BUSINESS_CARD_MARKER 消息，由 AdminBusinessCard 渲染
 * - 与三身份的 AI 课堂侧 CUI（Skill Registry）路径平行；admin 不进侧 CUI（无具体一节课语境），
 *   而是直接在主对话流出"全校盘点"卡片
 *
 * 卡片结构（与 AiClassroomTemplateData 同形，便于以后合并）：
 * - title：卡标题
 * - headline：第一段事实
 * - badges：3-4 个 tone 标签（提供"一眼概览"信号）
 * - stats：3 个数字格（提供"看图做决定"骨架）
 * - bullets：3 条详细 list（带 icon 区分轻重）
 * - recommendedPrompts：3-4 个下一步动作；点击后会再触发 main thread 兜底（命中 resolver 的可走文本闭环）
 */
export interface AdminBusinessCardBadge {
  label: string
  tone: "default" | "info" | "warning" | "success"
}

export interface AdminBusinessCardStat {
  label: string
  value: string
  hint?: string
}

export interface AdminBusinessCardBullet {
  icon: string
  title: string
  meta?: string
}

export interface AdminBusinessCardData {
  id: string
  title: string
  headline: string
  badges: AdminBusinessCardBadge[]
  stats: AdminBusinessCardStat[]
  bullets: AdminBusinessCardBullet[]
  footerNote?: string
  recommendedPrompts: string[]
}

const ADMIN_TODAY: AdminBusinessCardData = {
  id: "admin.today",
  title: "校区今日情况",
  headline: "全校 12 节课待开 · 备课完成率 75% · 3 件异常待处理（演示数据）",
  badges: [
    { label: "12 节待开", tone: "info" },
    { label: "异常 3 件", tone: "warning" },
    { label: "出勤率 92%", tone: "success" },
  ],
  stats: [
    { label: "备课完成", value: "75%", hint: "目标 85%" },
    { label: "异常事件", value: "3 件", hint: "1 高 / 2 中" },
    { label: "今晚直播课", value: "8 节", hint: "覆盖 248 名学员" },
  ],
  bullets: [
    {
      icon: "🛠",
      title: "教室 303 设备触摸异常 · 维修已派单",
      meta: "影响下午 2 节课，建议临时改 305",
    },
    {
      icon: "📞",
      title: "高三王子轩家长投诉 · 续费咨询无回应 12h",
      meta: "建议运营团队 30 分钟内响应",
    },
    {
      icon: "🔁",
      title: "排课冲突 5 件 · 待教务确认调换",
      meta: "李老师 / 张老师 / 周三 19:00 重叠",
    },
  ],
  footerNote: "数据每 5 分钟刷新一次；接入校区运营系统后自动同步。",
  recommendedPrompts: [
    "一键派单维修",
    "把异常发给运营群",
    "看排课冲突详情",
    "导出今日情况 PDF",
  ],
}

const ADMIN_SUPERVISE: AdminBusinessCardData = {
  id: "admin.supervise",
  title: "随机听课 · AI 听课摘要",
  headline:
    "AI 已随机抽 1 节《物理 · 力的合成与分解》（王老师 · 19:00 · A1 教室）",
  badges: [
    { label: "已开场 12 分钟", tone: "info" },
    { label: "互动 87% ↑", tone: "success" },
    { label: "板书规范 92%", tone: "success" },
  ],
  stats: [
    { label: "课堂互动率", value: "87%", hint: "高于均值 12%" },
    { label: "出题应答率", value: "91%", hint: "正确率 73%" },
    { label: "AI 节奏建议", value: "1 次", hint: "已采纳" },
  ],
  bullets: [
    {
      icon: "🎯",
      title: "亮点：受力图导入清晰，3 道方向判断答对率 81%",
      meta: "可作教研组分享案例",
    },
    {
      icon: "🟡",
      title: "节奏：例题 2 已超 30 秒 · AI 已建议放慢 2 分钟",
      meta: "王老师已采纳",
    },
    {
      icon: "🔴",
      title: "薄弱：第 7 题方向判断 13/32 错 · 建议下节导入",
      meta: "AI 已自动归档",
    },
  ],
  footerNote: "本节摘要会在课程结束后归入「老师听课档案」。",
  recommendedPrompts: [
    "把听课结果同步教研组",
    "推荐再听另一节",
    "把第 7 题导入下节备课包",
    "把这节作为公开课参选",
  ],
}

const ADMIN_RENEW: AdminBusinessCardData = {
  id: "admin.renew",
  title: "可能不续费的学员",
  headline: "本月续费节点临近 18 人 · 3 人很可能不续费，需先抓",
  badges: [
    { label: "高风险 3 人", tone: "warning" },
    { label: "中风险 8 人", tone: "info" },
    { label: "本月节点 18 人", tone: "default" },
  ],
  stats: [
    { label: "高风险", value: "3 人", hint: "建议本周联系" },
    { label: "中风险", value: "8 人", hint: "下周跟进即可" },
    { label: "续费率（上月）", value: "82%", hint: "环比 -3%" },
  ],
  bullets: [
    {
      icon: "🔴",
      title: "张佳琪（高一物理 · 余 4 节）· 连续缺课 2 周",
      meta: "建议班主任电话 + 1 张课消趋势图",
    },
    {
      icon: "🔴",
      title: "李欣然（初三英语 · 余 8 节）· 课消下降 40%",
      meta: "建议改成 1 对 2 + 增加趣味课件",
    },
    {
      icon: "🔴",
      title: "王梓涵（高二数学 · 余 6 节）· 未读家长 IM 5 条",
      meta: "建议续费顾问主动回访",
    },
  ],
  footerNote: "数据来源：CRM + 课消系统 + 家校 IM；接入后自动刷新。",
  recommendedPrompts: [
    "给 3 位家长发关怀",
    "把名单转给班主任",
    "看完整续费临近清单",
    "导出可能不续费报告",
  ],
}

const ADMIN_TEACHER: AdminBusinessCardData = {
  id: "admin.teacher",
  title: "老师整体能力",
  headline: "本月 24 位老师 · 能力变化 2 位 · 可能流失 1 位",
  badges: [
    { label: "亮点 1 位", tone: "success" },
    { label: "建议复盘 1 位", tone: "warning" },
    { label: "可能流失 1 位", tone: "warning" },
  ],
  stats: [
    { label: "整体平均分", value: "82", hint: "环比 +2" },
    { label: "互动率最高", value: "王老师", hint: "比上月 +12%" },
    { label: "报告少改的占比", value: "76%", hint: "目标 80%" },
  ],
  bullets: [
    {
      icon: "🟢",
      title: "王老师（物理）· 课堂互动 +12% / 报告几乎不用改",
      meta: "可作公开课模板，建议表扬 + 提职预备",
    },
    {
      icon: "🟡",
      title: "李老师（英语）· 报告改得越来越多 ↓ 8% / 学情画像漏读 3 次",
      meta: "建议教研组 1 次复盘 + 助教复审",
    },
    {
      icon: "🔴",
      title: "周老师（数学）· 离职信号 1 项（请假频率上升 + 未填周报）",
      meta: "建议校长 1 对 1 沟通 + 排查原因",
    },
  ],
  footerNote: "教师档案数据每周一刷新；接入 HR 后自动并入。",
  recommendedPrompts: [
    "看王老师亮点案例",
    "安排李老师复盘",
    "立即沟通周老师",
    "导出老师能力月报",
  ],
}

const ADMIN_CARDS_BY_ID: Record<string, AdminBusinessCardData> = {
  [ADMIN_TODAY.id]: ADMIN_TODAY,
  [ADMIN_SUPERVISE.id]: ADMIN_SUPERVISE,
  [ADMIN_RENEW.id]: ADMIN_RENEW,
  [ADMIN_TEACHER.id]: ADMIN_TEACHER,
}

export function getAdminBusinessCardData(id: string): AdminBusinessCardData | null {
  return ADMIN_CARDS_BY_ID[id] ?? null
}
