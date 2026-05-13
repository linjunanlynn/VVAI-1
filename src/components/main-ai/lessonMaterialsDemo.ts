/**
 * 课程子 CUI · 资料卡 fixture（demo 数据）
 *
 * 设计动机
 * ----------------------------------------------------
 * 「资料卡」= 该课次在云盘里 `{机构} · 云盘 / 教学资料 / {课程系列} / 第 N 节《课次名》/`
 * 文件夹的会话化视图。本文件给主线课《力的合成与分解》一份完整 fixture，
 * 系列其它 outline 给一份"轻量样本"，避免空卡；非主线、非系列绑定的零散
 * lessonId 落到 `getDefaultMaterialsForUnknownLesson` 的中性 fixture。
 *
 * 与持久化的边界
 * ----------------------------------------------------
 * - 本文件 = "AI 已归档 / AI 已生成 / 同事共享" 这三类**不可编辑**的来源
 * - "我上传" 走 `lessonMaterialsPersistence.ts`（sessionStorage + in-memory store）
 * - `LessonMaterialsCard` 渲染时把两者合并按 group 排列
 */

import { DEMO_LESSON } from "./aiClassroomLessonDemo"

/** 4 个分组（与卡片 UI 4 段对齐） */
export type LessonMaterialGroup = "pre" | "in" | "post" | "mine"

/** 文件来源（弱色徽章文案） */
export type LessonMaterialSource =
  | "ai-archived"
  | "ai-generated"
  | "mine"
  | "shared"

/** 文件类型（决定行首图标 + 预览方式 + Tab 归属） */
export type LessonMaterialFileType =
  | "pdf"
  | "doc"
  | "xls"
  | "image"
  | "video"
  | "audio"
  | "zip"
  | "other"

/** 单文件：fixture / 上传都用这一个结构 */
export interface LessonMaterialFile {
  id: string
  name: string
  type: LessonMaterialFileType
  sizeText: string
  group: LessonMaterialGroup
  source: LessonMaterialSource
  /** "周三 14:32" / "刚刚" 等可读时间 */
  uploadedAt: string
  /** 默认 = 老师本人；同事共享时为他人 */
  uploaderName?: string
  /** 仅图片 / 视频 / 上传文件 用：blob: 或 https URL */
  previewUrl?: string
  /** 仅视频用 */
  videoPosterUrl?: string
}

/* ============================================================
 * 主线课 fixture：《力的合成与分解》
 * ============================================================ */

const MAIN_LESSON_FILES: LessonMaterialFile[] = [
  /* === 课前准备 (4) === */
  {
    id: "mat-main-pre-courseware",
    name: "课件 v3.2 · 力的合成与分解.pdf",
    type: "pdf",
    sizeText: "18.2 MB",
    group: "pre",
    source: "ai-archived",
    uploadedAt: "周二 21:18",
    uploaderName: "AI 备课助手",
  },
  {
    id: "mat-main-pre-lesson-plan",
    name: "教案 v3.2 · 课堂节奏 + 例题.docx",
    type: "doc",
    sizeText: "126 KB",
    group: "pre",
    source: "ai-archived",
    uploadedAt: "周二 21:18",
    uploaderName: "AI 备课助手",
  },
  {
    id: "mat-main-pre-warmup",
    name: "分层预习包 · A 进阶 / B 巩固 / C 基础.pdf",
    type: "pdf",
    sizeText: "1.2 MB",
    group: "pre",
    source: "ai-archived",
    uploadedAt: "周三 17:42",
    uploaderName: "AI 学情画像",
  },
  {
    id: "mat-main-pre-board",
    name: "板书底图（4 张）.zip",
    type: "zip",
    sizeText: "5.4 MB",
    group: "pre",
    source: "ai-archived",
    uploadedAt: "周二 21:18",
    uploaderName: "AI 备课助手",
  },

  /* === 课中产出 (3) === */
  {
    id: "mat-main-in-replay",
    name: "课堂直播录像 · 45 分钟.mp4",
    type: "video",
    sizeText: "278.6 MB",
    group: "in",
    source: "ai-archived",
    uploadedAt: "周三 19:48",
    uploaderName: "AI 课堂",
  },
  {
    id: "mat-main-in-quiz-distribution",
    name: "随堂题作答分布.png",
    type: "image",
    sizeText: "92 KB",
    group: "in",
    source: "ai-generated",
    uploadedAt: "周三 19:25",
    uploaderName: "AI 课堂",
  },
  {
    id: "mat-main-in-board-snapshots",
    name: "板书快照（4 张）.zip",
    type: "zip",
    sizeText: "1.8 MB",
    group: "in",
    source: "ai-generated",
    uploadedAt: "周三 19:48",
    uploaderName: "AI 课堂",
  },

  /* === 课后归档 (4 项 · 含 1 段精剪音频) === */
  {
    id: "mat-main-post-audio-clip",
    name: "重点讲解音频片段 · 矢量方向判断.mp3",
    type: "audio",
    sizeText: "3.6 MB",
    group: "post",
    source: "ai-generated",
    uploadedAt: "周三 19:55",
    uploaderName: "AI 课堂",
  },
  {
    id: "mat-main-post-report",
    name: "学情画像简报 · 全班.pdf",
    type: "pdf",
    sizeText: "5.1 MB",
    group: "post",
    source: "ai-generated",
    uploadedAt: "周三 19:52",
    uploaderName: "AI 学情画像",
  },
  {
    id: "mat-main-post-mistakes",
    name: "错题集 · 高频错点.xlsx",
    type: "xls",
    sizeText: "240 KB",
    group: "post",
    source: "ai-generated",
    uploadedAt: "周三 19:52",
    uploaderName: "AI 学情画像",
  },
  {
    id: "mat-main-post-fengcai",
    name: "课堂风采精剪 · 30s.mp4",
    type: "video",
    sizeText: "18.4 MB",
    group: "post",
    source: "ai-generated",
    uploadedAt: "周三 19:52",
    uploaderName: "AI 课堂",
  },
]

/* ============================================================
 * 系列其它 outline 的"轻量样本"
 * ----------------------------------------------------
 * 给完结节（past）发课件 + 录像 2 项，给未来节（upcoming）只发课件 1 项。
 * 这样系列子 CUI 切到任何一节点击「资料」也都能看到内容，避免空卡。
 * ============================================================ */

function buildOutlineSampleFiles(input: {
  lessonKey: string
  lessonTitle: string
  isPast: boolean
}): LessonMaterialFile[] {
  const { lessonKey, lessonTitle, isPast } = input
  const files: LessonMaterialFile[] = [
    {
      id: `${lessonKey}-pre-courseware`,
      name: `课件 · ${lessonTitle}.pdf`,
      type: "pdf",
      sizeText: "12.4 MB",
      group: "pre",
      source: "ai-archived",
      uploadedAt: "课前 1 天",
      uploaderName: "AI 备课助手",
    },
  ]
  if (isPast) {
    files.push(
      {
        id: `${lessonKey}-in-replay`,
        name: `课堂直播录像 · ${lessonTitle}.mp4`,
        type: "video",
        sizeText: "265.0 MB",
        group: "in",
        source: "ai-archived",
        uploadedAt: "下课后 5 分钟",
        uploaderName: "AI 课堂",
      },
      {
        id: `${lessonKey}-post-report`,
        name: `学情画像 · ${lessonTitle}.pdf`,
        type: "pdf",
        sizeText: "4.2 MB",
        group: "post",
        source: "ai-generated",
        uploadedAt: "下课后 10 分钟",
        uploaderName: "AI 学情画像",
      },
    )
  }
  return files
}

/* ============================================================
 * 入口：按 lessonKey 取 fixture（不含「我的上传」，由 persistence 合并）
 * ============================================================ */

export interface LessonMaterialsContext {
  /** 系列名（卡头） */
  seriesName?: string
  /** 第 N 节 */
  lessonNumber?: number
  /** 系列总节数 */
  totalLessons?: number
  /** 课次名 */
  lessonTitle: string
  /** 是否已结课 */
  isPast?: boolean
}

export function getLessonMaterialsFixture(
  lessonKey: string,
  context: LessonMaterialsContext,
): LessonMaterialFile[] {
  if (lessonKey === DEMO_LESSON.id) return MAIN_LESSON_FILES.slice()
  return buildOutlineSampleFiles({
    lessonKey,
    lessonTitle: context.lessonTitle,
    isPast: !!context.isPast,
  })
}

/* ============================================================
 * 工具：从文件名/扩展名推断 type，用于上传时落库
 * ============================================================ */
const EXT_TO_TYPE: Record<string, LessonMaterialFileType> = {
  pdf: "pdf",
  doc: "doc",
  docx: "doc",
  xls: "xls",
  xlsx: "xls",
  csv: "xls",
  png: "image",
  jpg: "image",
  jpeg: "image",
  gif: "image",
  webp: "image",
  mp4: "video",
  mov: "video",
  webm: "video",
  m4v: "video",
  mp3: "audio",
  wav: "audio",
  m4a: "audio",
  aac: "audio",
  ogg: "audio",
  zip: "zip",
}

export function inferLessonMaterialFileType(fileName: string): LessonMaterialFileType {
  const ext = fileName.toLowerCase().split(".").pop() ?? ""
  return EXT_TO_TYPE[ext] ?? "other"
}

const ALLOWED_EXTENSIONS = [
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "csv",
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "mp4",
  "mov",
  "webm",
  "m4v",
  "mp3",
  "wav",
  "m4a",
  "aac",
  "ogg",
] as const

export function isAllowedLessonMaterialFile(fileName: string): boolean {
  const ext = fileName.toLowerCase().split(".").pop() ?? ""
  return (ALLOWED_EXTENSIONS as readonly string[]).includes(ext)
}

export const LESSON_MATERIAL_ACCEPT_ATTR = ALLOWED_EXTENSIONS.map((e) => `.${e}`).join(",")

/** 单文件大小上限：200MB（与 UI 提示一致；超出时拒绝并 toast） */
export const LESSON_MATERIAL_MAX_BYTES = 200 * 1024 * 1024

/** 把 bytes 友好化为 "12.4 MB" / "240 KB" 等 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

/** 来源徽章文案 */
export const LESSON_MATERIAL_SOURCE_LABEL: Record<LessonMaterialSource, string> = {
  "ai-archived": "AI 已归档",
  "ai-generated": "AI 已生成",
  mine: "我上传",
  shared: "同事共享",
}

/** 4 分组顺序 + 中文标题 */
export const LESSON_MATERIAL_GROUP_ORDER: LessonMaterialGroup[] = [
  "pre",
  "in",
  "post",
  "mine",
]

export const LESSON_MATERIAL_GROUP_TITLE: Record<LessonMaterialGroup, string> = {
  pre: "课前准备",
  in: "课中产出",
  post: "课后归档",
  mine: "我的上传",
}
