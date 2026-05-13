/**
 * 教育微盘 · 数据注册表（演示态）
 *
 * 入口：《主CUI交互》底部应用条「微盘 dock」内的内联快捷指令「教育微盘」。
 *
 * 两张卡片串联：
 *   卡 1（list）  : 当前用户全部教育空间的「教育微盘」聚合列表（每个空间一行）。
 *   卡 2（folder）: 进入某个空间的「教育微盘」根视图，按身份（老师/学生/家长/管理者）分组展示文件夹 + 近期文件。
 *
 * 与 EduDockMenuCard / aiClassroomQuizBus 的关系：
 *   - EduDockMenuCard：教育门户三级菜单的卡片（与「某节课」无关 / 与「跨课程数据」相关）
 *   - 教育微盘：跨教育空间的资料库聚合，定位是 disk dock 的子分区，而非教育门户内的子应用
 *   - 因此本卡走 disk dock 会话上下文（setMessages），不挂在教育门户的 setEducationMessages 流上
 *
 * v1 简化决策（与产品方案对齐）：
 *   - 角色：使用全局 EduSceneRole 一刀切（同一用户在所有空间看相同分组）
 *   - 不做"真目录下钻"：卡 2 直接展示「分组 + 近期文件」，文件夹仅作分组标签视觉
 *   - 列表卡始终展示，即便只有 1 个教育空间
 */

import type { EduSceneRole } from "./homeScenarioLayout"
import {
  loadDemoEducationSpaceState,
  type DemoEducationSpaceRecord,
} from "./educationSpaceDemoPersistence"

/* ============================================================
 * 数据模型
 * ============================================================ */

export type EduDiskFileType =
  | "doc"
  | "pdf"
  | "ppt"
  | "xls"
  | "image"
  | "video"
  | "audio"
  | "zip"
  | "other"

export interface EduDiskFileItem {
  id: string
  name: string
  type: EduDiskFileType
  /** 文件大小（MB） */
  sizeMb: number
  /** 修改时间口语化标签：「2 天前 / 上周三 / 刚刚」 */
  modifiedAtLabel: string
  /** 上传者中文名 */
  uploaderName: string
}

export interface EduDiskFolderItem {
  id: string
  name: string
  fileCount: number
  modifiedAtLabel: string
  /** 0-3 条预览文件，用于卡 2 展开行的视觉锚点 */
  recentFiles: EduDiskFileItem[]
}

export interface EduDiskFolderGroup {
  /** 分组标题（如「备课与教案」） */
  groupName: string
  /** 该分组下的文件夹（2-4 个） */
  folders: EduDiskFolderItem[]
}

/* ---------- 卡 1：教育空间列表 ---------- */

export interface EduDiskListItem {
  spaceId: string
  spaceName: string
  spaceKind: "family" | "institutional"
  hostOrganizationName?: string
  /** 用户在该空间的身份口语化中文（v1 = 全局 role 中文） */
  roleLabel: string
  /** 总文件数（伪造，按 spaceId 哈希稳定生成） */
  fileCount: number
  /** 本周新增 */
  weeklyAdded: number
  /** 已用容量口语化（如「2.3 GB」） */
  usedCapacity: string
  /** 成员数（伪造，按 spaceId 哈希稳定生成） */
  memberCount: number
  /** 是否当前选中空间（来自 EduSpaceTopSwitcher 选中态） */
  isCurrent: boolean
}

export interface EduDiskListData {
  role: EduSceneRole
  /** 一句话整体 headline */
  headline: string
  items: EduDiskListItem[]
  /** 整卡级推荐指令 chip（横向跨空间能力） */
  prompts: string[]
}

/* ---------- 卡 2：单空间教育微盘根视图 ---------- */

export interface EduDiskFolderData {
  role: EduSceneRole
  spaceId: string
  spaceName: string
  spaceKind: "family" | "institutional"
  hostOrganizationName?: string
  roleLabel: string
  /** 一句话 headline */
  headline: string
  /** 按角色组织的文件夹分组（2-4 组） */
  groups: EduDiskFolderGroup[]
  /** 整卡级推荐指令 */
  prompts: string[]
  /** 整卡级元信息：总文件数 / 已用容量 / 本周新增 */
  fileCount: number
  weeklyAdded: number
  usedCapacity: string
}

/* ============================================================
 * 工具：稳定伪随机（基于字符串哈希），保证同一空间每次进入数字一致
 * ============================================================ */

function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

function pickFromSeed<T>(seed: number, arr: readonly T[]): T {
  return arr[seed % arr.length] as T
}

function intInRange(seed: number, min: number, max: number): number {
  const span = max - min + 1
  return min + (seed % span)
}

const ROLE_LABEL: Record<EduSceneRole, string> = {
  teacher: "老师",
  student: "学生",
  parent: "家长",
  admin: "管理者",
}

const SIZE_BUCKETS_GB = ["1.2 GB", "2.3 GB", "3.8 GB", "5.6 GB", "8.4 GB"] as const

const TIME_LABELS = [
  "刚刚",
  "今天 09:42",
  "今天 14:20",
  "昨天 18:10",
  "2 天前",
  "上周三",
  "上周五",
  "本月初",
] as const

const UPLOADER_POOL_TEACHER = ["王老师", "李老师", "Lisa", "陈老师", "张老师"] as const
const UPLOADER_POOL_STUDENT = ["王老师", "我", "李老师", "学习委员"] as const
const UPLOADER_POOL_PARENT = ["王老师", "Lisa", "班级群", "学校通知"] as const
const UPLOADER_POOL_ADMIN = ["教务办", "财务部", "招生办", "王老师", "教研组"] as const

function uploaderPoolFor(role: EduSceneRole): readonly string[] {
  if (role === "teacher") return UPLOADER_POOL_TEACHER
  if (role === "student") return UPLOADER_POOL_STUDENT
  if (role === "parent") return UPLOADER_POOL_PARENT
  return UPLOADER_POOL_ADMIN
}

/* ============================================================
 * 文件夹分组模板（按角色）
 *
 * 每组下列 2-4 个文件夹，文件夹下伪造 0-3 条近期文件预览。
 * 文件名保持业务语义，避免「示例.docx」这种空话。
 * ============================================================ */

interface FolderTemplate {
  groupName: string
  folders: ReadonlyArray<{
    id: string
    name: string
    /** 该文件夹的文件名预设（取前 3 条作为 recent files 预览） */
    sampleFiles: ReadonlyArray<{ name: string; type: EduDiskFileType }>
  }>
}

const TEACHER_TEMPLATE: readonly FolderTemplate[] = [
  {
    groupName: "备课与教案",
    folders: [
      {
        id: "lesson_plans",
        name: "教案与课件",
        sampleFiles: [
          { name: "力的合成与分解 · 教案 v2.docx", type: "doc" },
          { name: "力的合成 · 课件.pptx", type: "ppt" },
          { name: "矢量分解 · 板书设计.png", type: "image" },
          { name: "本周教研共享教案合集.zip", type: "zip" },
        ],
      },
      {
        id: "question_bank",
        name: "题库与作业",
        sampleFiles: [
          { name: "矢量方向 · 巩固练习 10 题.pdf", type: "pdf" },
          { name: "本周随堂题 · A 卷.docx", type: "doc" },
          { name: "错题归类整理.xlsx", type: "xls" },
        ],
      },
    ],
  },
  {
    groupName: "课堂实录",
    folders: [
      {
        id: "class_replay",
        name: "课堂回放",
        sampleFiles: [
          { name: "11-12 物理回放 · A 班.mp4", type: "video" },
          { name: "11-12 物理回放 · B 班.mp4", type: "video" },
          { name: "本周亮点合集.mp4", type: "video" },
        ],
      },
      {
        id: "class_show",
        name: "课堂风采",
        sampleFiles: [
          { name: "抢答镜头 · 东偏北 53°.mp4", type: "video" },
          { name: "板演 · 王同学解题.jpg", type: "image" },
          { name: "本周分享给家长群.mp4", type: "video" },
        ],
      },
    ],
  },
  {
    groupName: "学情与报告",
    folders: [
      {
        id: "class_analytics",
        name: "学情报告",
        sampleFiles: [
          { name: "本周物理学情周报.pdf", type: "pdf" },
          { name: "矢量方向薄弱学员名单.xlsx", type: "xls" },
          { name: "上节课后复盘.docx", type: "doc" },
        ],
      },
      {
        id: "teacher_share",
        name: "教研共享",
        sampleFiles: [
          { name: "教研组本月公开课.pptx", type: "ppt" },
          { name: "命题范式参考.pdf", type: "pdf" },
        ],
      },
    ],
  },
]

const STUDENT_TEMPLATE: readonly FolderTemplate[] = [
  {
    groupName: "今天就要看",
    folders: [
      {
        id: "today_courseware",
        name: "本节课件",
        sampleFiles: [
          { name: "力的合成与分解 · 课件.pptx", type: "ppt" },
          { name: "课前预习 · 矢量速览.pdf", type: "pdf" },
          { name: "知识点速记卡.png", type: "image" },
        ],
      },
      {
        id: "today_homework",
        name: "今晚作业",
        sampleFiles: [
          { name: "物理 · 10 道.pdf", type: "pdf" },
          { name: "数学 · 5 道.pdf", type: "pdf" },
        ],
      },
    ],
  },
  {
    groupName: "我的资料",
    folders: [
      {
        id: "my_notes",
        name: "我的笔记",
        sampleFiles: [
          { name: "矢量分解 · 我的整理.docx", type: "doc" },
          { name: "上节亮点 · 我答对的题.png", type: "image" },
        ],
      },
      {
        id: "my_mistakes",
        name: "错题本",
        sampleFiles: [
          { name: "矢量方向类 · 3 道.pdf", type: "pdf" },
          { name: "本周新增错题.docx", type: "doc" },
          { name: "高频错点速查表.xlsx", type: "xls" },
        ],
      },
    ],
  },
  {
    groupName: "成长档案",
    folders: [
      {
        id: "study_report",
        name: "学习报告",
        sampleFiles: [
          { name: "本周物理 · 位次 +3.pdf", type: "pdf" },
          { name: "学期初 → 现在对比.pdf", type: "pdf" },
        ],
      },
      {
        id: "highlights",
        name: "课堂亮点",
        sampleFiles: [
          { name: "抢答 · 东偏北 53°.mp4", type: "video" },
          { name: "板演 · 王同学解题.jpg", type: "image" },
        ],
      },
    ],
  },
]

const PARENT_TEMPLATE: readonly FolderTemplate[] = [
  {
    groupName: "今天就要看",
    folders: [
      {
        id: "kid_homework",
        name: "孩子作业",
        sampleFiles: [
          { name: "物理 · 今晚 10 道.pdf", type: "pdf" },
          { name: "数学 · 今晚 5 道.pdf", type: "pdf" },
        ],
      },
      {
        id: "kid_class_show",
        name: "课堂风采",
        sampleFiles: [
          { name: "孩子抢答镜头.mp4", type: "video" },
          { name: "板演 · 解题瞬间.jpg", type: "image" },
        ],
      },
    ],
  },
  {
    groupName: "成长记录",
    folders: [
      {
        id: "kid_report",
        name: "学情报告",
        sampleFiles: [
          { name: "本周物理 · 位次 +3.pdf", type: "pdf" },
          { name: "本月长期评价.docx", type: "doc" },
          { name: "学期成长趋势.pdf", type: "pdf" },
        ],
      },
      {
        id: "kid_highlights",
        name: "孩子亮点",
        sampleFiles: [
          { name: "近 30 天亮点合集.mp4", type: "video" },
          { name: "公开课表演.jpg", type: "image" },
        ],
      },
    ],
  },
  {
    groupName: "学校通知",
    folders: [
      {
        id: "parent_meeting",
        name: "家长会资料",
        sampleFiles: [
          { name: "下周一家长会 · 议程.pdf", type: "pdf" },
          { name: "学校近期举措说明.pptx", type: "ppt" },
        ],
      },
      {
        id: "school_notice",
        name: "通知公告",
        sampleFiles: [
          { name: "本周接送时段调整.pdf", type: "pdf" },
          { name: "教材包到货通知.docx", type: "doc" },
        ],
      },
    ],
  },
]

const ADMIN_TEMPLATE: readonly FolderTemplate[] = [
  {
    groupName: "教学资料",
    folders: [
      {
        id: "all_lesson_plans",
        name: "全员教案库",
        sampleFiles: [
          { name: "本月教案合集.zip", type: "zip" },
          { name: "教研组共享教案 · 物理.pptx", type: "ppt" },
          { name: "命题范式 · 标准模板.docx", type: "doc" },
        ],
      },
      {
        id: "all_class_records",
        name: "课堂实录归档",
        sampleFiles: [
          { name: "本周公开课实录.mp4", type: "video" },
          { name: "教学督导评议表.xlsx", type: "xls" },
        ],
      },
    ],
  },
  {
    groupName: "经营资料",
    folders: [
      {
        id: "enroll_materials",
        name: "招生材料",
        sampleFiles: [
          { name: "秋季招生宣讲案.pptx", type: "ppt" },
          { name: "试听课课程包.zip", type: "zip" },
          { name: "宣传海报终稿.png", type: "image" },
        ],
      },
      {
        id: "finance_vouchers",
        name: "财务凭证",
        sampleFiles: [
          { name: "本月对账单.xlsx", type: "xls" },
          { name: "退费工单台账.docx", type: "doc" },
        ],
      },
    ],
  },
  {
    groupName: "制度与档案",
    folders: [
      {
        id: "policies",
        name: "制度与合同",
        sampleFiles: [
          { name: "教师岗位手册 v3.pdf", type: "pdf" },
          { name: "学员入学协议范本.docx", type: "doc" },
          { name: "课程退费政策.pdf", type: "pdf" },
        ],
      },
      {
        id: "all_archive",
        name: "全员归档",
        sampleFiles: [
          { name: "本月归档目录.xlsx", type: "xls" },
          { name: "电子签到台账.pdf", type: "pdf" },
        ],
      },
    ],
  },
]

function templateFor(role: EduSceneRole): readonly FolderTemplate[] {
  if (role === "teacher") return TEACHER_TEMPLATE
  if (role === "student") return STUDENT_TEMPLATE
  if (role === "parent") return PARENT_TEMPLATE
  return ADMIN_TEMPLATE
}

const PROMPTS_BY_ROLE: Record<EduSceneRole, readonly string[]> = {
  teacher: [
    "新建教研文件夹",
    "把本节课件归档到这里",
    "共享给同班级老师",
    "搜索矢量分解教案",
  ],
  student: [
    "下载本周课件",
    "把错题导出",
    "搜索能量守恒笔记",
    "请王老师上传补充材料",
  ],
  parent: [
    "下载本周课堂风采",
    "把孩子的报告打包",
    "搜索家长会通知",
    "联系王老师补发资料",
  ],
  admin: [
    "本月归档审计",
    "导出全员资料清单",
    "检查权限异常",
    "搜索秋季招生材料",
  ],
}

const LIST_PROMPTS: readonly string[] = [
  "搜索全部教育资料",
  "按学科筛选",
  "看本周新增",
  "看快到期分享链接",
]

/* ============================================================
 * 列表卡数据生成
 * ============================================================ */

export function getEduDiskListData(
  role: EduSceneRole,
  scenario: string | undefined,
): EduDiskListData {
  const { spaces, currentSpaceId } = loadDemoEducationSpaceState(scenario)
  const items: EduDiskListItem[] = spaces.map((s) => buildListItem(s, currentSpaceId, role))
  const headline = buildListHeadline(items, role)
  return {
    role,
    headline,
    items,
    prompts: [...LIST_PROMPTS],
  }
}

function buildListItem(
  s: DemoEducationSpaceRecord,
  currentSpaceId: string | null,
  role: EduSceneRole,
): EduDiskListItem {
  const seed = hashString(`${s.id}|${role}`)
  const fileCount = intInRange(seed, 64, 312)
  const weeklyAdded = intInRange(seed >> 3, 2, 14)
  const usedCapacity = pickFromSeed(seed >> 7, SIZE_BUCKETS_GB)
  /** 成员数：家庭 1-4 / 机构 8-58；保证同一空间稳定 */
  const memberCount = s.kind === "family"
    ? intInRange(seed >> 11, 1, 4)
    : intInRange(seed >> 11, 8, 58)
  return {
    spaceId: s.id,
    spaceName: s.name,
    spaceKind: s.kind,
    hostOrganizationName: s.hostOrganizationName,
    roleLabel: ROLE_LABEL[role],
    fileCount,
    weeklyAdded,
    usedCapacity,
    memberCount,
    isCurrent: s.id === currentSpaceId,
  }
}

function buildListHeadline(items: EduDiskListItem[], role: EduSceneRole): string {
  if (items.length === 0) {
    return "你还没有教育空间。教育微盘按空间隔离，先创建或加入一个教育空间再来。"
  }
  const totalFiles = items.reduce((acc, it) => acc + it.fileCount, 0)
  const weekly = items.reduce((acc, it) => acc + it.weeklyAdded, 0)
  if (items.length === 1) {
    const only = items[0]!
    return `你目前在 ${only.spaceName}：共 ${only.fileCount} 个教育资料，本周新增 ${only.weeklyAdded} 个。`
  }
  const subjectName =
    role === "parent" ? "孩子" : role === "admin" ? "全校" : "你"
  return `${subjectName}已加入 ${items.length} 个教育空间，合计 ${totalFiles} 个教育资料·本周新增 ${weekly} 个。`
}

/* ============================================================
 * 目录卡数据生成
 * ============================================================ */

export function getEduDiskFolderData(
  role: EduSceneRole,
  spaceId: string,
  scenario: string | undefined,
): EduDiskFolderData | null {
  const { spaces } = loadDemoEducationSpaceState(scenario)
  const space = spaces.find((s) => s.id === spaceId)
  if (!space) return null

  const seed = hashString(`${space.id}|${role}`)
  const fileCount = intInRange(seed, 64, 312)
  const weeklyAdded = intInRange(seed >> 3, 2, 14)
  const usedCapacity = pickFromSeed(seed >> 7, SIZE_BUCKETS_GB)

  const groups = templateFor(role).map((tpl, gi) =>
    buildGroup(tpl, gi, space.id, role),
  )
  const headline = buildFolderHeadline(role, space, fileCount, weeklyAdded)

  return {
    role,
    spaceId: space.id,
    spaceName: space.name,
    spaceKind: space.kind,
    hostOrganizationName: space.hostOrganizationName,
    roleLabel: ROLE_LABEL[role],
    headline,
    groups,
    prompts: [...PROMPTS_BY_ROLE[role]],
    fileCount,
    weeklyAdded,
    usedCapacity,
  }
}

function buildGroup(
  tpl: FolderTemplate,
  gi: number,
  spaceId: string,
  role: EduSceneRole,
): EduDiskFolderGroup {
  const folders = tpl.folders.map((f, fi) => buildFolder(f, gi, fi, spaceId, role))
  return { groupName: tpl.groupName, folders }
}

function buildFolder(
  f: FolderTemplate["folders"][number],
  gi: number,
  fi: number,
  spaceId: string,
  role: EduSceneRole,
): EduDiskFolderItem {
  const seed = hashString(`${spaceId}|${role}|${f.id}`)
  const fileCount = intInRange(seed, 6, 28)
  const modifiedAtLabel = pickFromSeed(seed >> 3, TIME_LABELS)
  const sampleCount = Math.min(3, f.sampleFiles.length)
  const recentFiles = f.sampleFiles.slice(0, sampleCount).map((sf, idx) => {
    const fileSeed = hashString(`${spaceId}|${role}|${f.id}|${idx}`)
    const sizeMb = Number((intInRange(fileSeed, 1, 220) / 10).toFixed(1))
    return {
      id: `${spaceId}-${f.id}-f${idx}`,
      name: sf.name,
      type: sf.type,
      sizeMb,
      modifiedAtLabel: pickFromSeed(fileSeed >> 5, TIME_LABELS),
      uploaderName: pickFromSeed(fileSeed >> 11, uploaderPoolFor(role)),
    }
  })
  return {
    id: `${spaceId}-${f.id}-g${gi}-${fi}`,
    name: f.name,
    fileCount,
    modifiedAtLabel,
    recentFiles,
  }
}

function buildFolderHeadline(
  role: EduSceneRole,
  space: DemoEducationSpaceRecord,
  fileCount: number,
  weeklyAdded: number,
): string {
  const where = space.kind === "institutional" && space.hostOrganizationName
    ? space.hostOrganizationName
    : space.name
  if (role === "teacher") {
    return `${where} · 教育微盘共 ${fileCount} 个文件，本周新增 ${weeklyAdded} 个；建议先看「待批阅作业」与「待归档亮点」。`
  }
  if (role === "student") {
    return `今晚作业 + 本节课件已经为你置顶；本空间共 ${fileCount} 个资料，本周新增 ${weeklyAdded} 个。`
  }
  if (role === "parent") {
    return `孩子在 ${where}：本周新增 ${weeklyAdded} 个资料（含老师上传的课堂风采与学情报告）。`
  }
  return `${where} · 全员教育微盘 ${fileCount} 个文件，本周新增 ${weeklyAdded} 个；建议先看「本月归档目录」。`
}

/* ============================================================
 * marker 协议
 * ============================================================ */

export const EDU_DISK_LIST_CARD_MARKER = "<<<RENDER_EDU_DISK_LIST_CARD>>>" as const
export const EDU_DISK_FOLDER_CARD_MARKER = "<<<RENDER_EDU_DISK_FOLDER_CARD>>>" as const

/** 标记 1：列表卡 → `<marker>:<role>` */
export function buildEduDiskListCardContent(role: EduSceneRole): string {
  return `${EDU_DISK_LIST_CARD_MARKER}:${role}`
}

/** 标记 2：目录卡 → `<marker>:<role>:<spaceId>` */
export function buildEduDiskFolderCardContent(role: EduSceneRole, spaceId: string): string {
  return `${EDU_DISK_FOLDER_CARD_MARKER}:${role}:${spaceId}`
}

export interface ParsedEduDiskListCard {
  role: EduSceneRole
}
export interface ParsedEduDiskFolderCard {
  role: EduSceneRole
  spaceId: string
}

function isEduSceneRole(v: string): v is EduSceneRole {
  return v === "teacher" || v === "student" || v === "parent" || v === "admin"
}

export function parseEduDiskListCardContent(content: string): ParsedEduDiskListCard | null {
  const prefix = `${EDU_DISK_LIST_CARD_MARKER}:`
  if (!content.startsWith(prefix)) return null
  const role = content.slice(prefix.length).trim()
  if (!isEduSceneRole(role)) return null
  return { role }
}

export function parseEduDiskFolderCardContent(
  content: string,
): ParsedEduDiskFolderCard | null {
  const prefix = `${EDU_DISK_FOLDER_CARD_MARKER}:`
  if (!content.startsWith(prefix)) return null
  const rest = content.slice(prefix.length)
  const colonIdx = rest.indexOf(":")
  if (colonIdx <= 0) return null
  const role = rest.slice(0, colonIdx).trim()
  const spaceId = rest.slice(colonIdx + 1).trim()
  if (!isEduSceneRole(role)) return null
  if (!spaceId) return null
  return { role, spaceId }
}

/* ============================================================
 * 入口指令识别
 * 给 MainAIChatWindow.handleSendMessage 在 disk dock 会话里早期短路使用
 * ============================================================ */

/**
 * 命中「教育微盘」入口（精确匹配 + 兼容空白与口语前缀）。
 *
 * 自微盘 dock 内联菜单文案对齐设计稿后，新写法叫「教育微盘空间」，
 * 但旧文案「教育微盘」仍要兼容（卡 2 底部「← 返回教育微盘列表」按钮、
 * 历史会话回放、`dockAgentIntentResolve` 自由输入等都还会触发它）。
 */
export function isEduDiskEntryCommand(raw: string): boolean {
  const t = raw.trim()
  if (!t) return false
  if (t === "教育微盘" || t === "教育微盘空间") return true
  if (t === "打开教育微盘" || t === "打开教育微盘空间") return true
  if (t === "看教育微盘" || t === "看教育微盘空间") return true
  if (/^返回教育微盘(空间)?$/.test(t)) return true
  return false
}

/** 命中「打开 ${spaceName} 的教育微盘」类指令 → 解析 spaceName，由调用方再映射到 spaceId */
export function matchEduDiskOpenSpaceCommand(raw: string): { spaceName: string } | null {
  const t = raw.trim()
  /** 匹配：打开 XXX · 教育微盘 / 打开 XXX 教育微盘 / 进入 XXX · 教育微盘 */
  const m = t.match(/^(?:打开|进入|查看)\s*(.+?)(?:\s*·\s*教育微盘|\s+教育微盘)$/)
  if (!m) return null
  const spaceName = m[1]?.trim()
  if (!spaceName) return null
  return { spaceName }
}
