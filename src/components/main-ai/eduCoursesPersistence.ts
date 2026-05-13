/**
 * 教育课程 / 微盘 / 子 CUI 资料 · 三表面统一持久层（演示态）
 *
 * 该 store 承载演示闭环的核心数据：
 *
 *   教育空间（按 scenario × orgId 分桶）
 *     └─ courses
 *        └─ {courseId}
 *           ├─ 基础元数据（name / subject / stage / deliveryMode / sessionCount / priceText / createdAt）
 *           ├─ outline?     ── 教学大纲（教师上传 → AI mock 解析 → 自动建课次目录）
 *           ├─ rootFiles[]  ── 课程级零散文件（除大纲外）
 *           └─ lessons[]    ── 课次目录（每个含 files[]）
 *
 * 表面 → 数据映射
 * ----------------------------------------------------
 *  · 教育 app · 课程商品卡（EduCourseProductsCard）            ↔ courses 全列表
 *  · 微盘 app · 教学资料浏览卡（EduTeachingMaterialsBrowserCard）↔ 进入空间 → 课程列表 / 进入课程 → 大纲+课次 / 进入课次 → 文件
 *  · AI 课堂子 CUI · 资料卡（LessonMaterialsCard）              ↔ courses[courseId].lessons[lessonKey].files
 *
 * 三表面共用同一个 store + 同一套 pub/sub，任何一处的"上传 / 删除 / 创建 / 解析"
 * 都会即时同步到另外两处。
 *
 * Demo 种子
 * ----------------------------------------------------
 * 第一次访问任一表面时，从 `aiClassroomLessonSeriesDemo` + `lessonMaterialsDemo` 读取
 * 几个进行中的系列（如「初一物理 · 力学专题（春 12 节）」）灌入当前空间，
 * 让"已存在的课程"有内容，新建课程演示与之并存对比。种子标记位避免重复灌入。
 *
 * Storage
 * ----------------------------------------------------
 *  · sessionStorage key = `${PREFIX}::${scenario ?? "default"}::${orgId}`
 *  · 仅持久化元数据；blob URL 由 in-memory map 单独承载（刷新即失效，UI 自动降级到占位预览）
 */

import {
  getLessonMaterialsFixture,
  inferLessonMaterialFileType,
  type LessonMaterialFileType,
} from "./lessonMaterialsDemo"
import {
  DEMO_SERIES_LIST,
  type AiClassroomLessonSeries,
} from "./aiClassroomLessonSeriesDemo"
import { DEMO_LESSON } from "./aiClassroomLessonDemo"

const STORAGE_PREFIX = "vvai.eduCourses.v1"

/* ============================================================
 * 数据结构
 * ============================================================ */

/**
 * 微盘文件的"上传者角色"。
 *
 * - `admin` / `system`：公共内容（机构管理员或系统种子），所有可见者都能看到
 * - `teacher`：某一名老师私人上传 —— 仅该老师本人 + admin 可见，
 *   **其它老师不可见**（教学场景里老师之间默认相互隔离）
 * - `student` / `parent`：学生/家长上传（如作业回传）—— 仅老师 + 本人可见
 *
 * 旧数据兼容：`uploaderRole` 缺省视为 `admin`（公共可见）。
 */
export type WeDiskUploaderRole =
  | "admin"
  | "teacher"
  | "student"
  | "parent"
  | "system"

/** 微盘内的"普通文件"：去除 source/group 概念 */
export interface WeDiskFile {
  id: string
  name: string
  type: LessonMaterialFileType
  sizeText: string
  uploadedAt: string
  uploaderName: string
  /**
   * 上传者唯一 id（当前演示场景里"本人"统一为 `currentUser.id`，即 `"me"`）。
   * 用于「我可不可以删除这份文件」「这份文件是不是我上传的」等判定。
   * 缺省（老数据）兜底为 `admin-platform`（公共种子）。
   */
  uploaderId?: string
  uploaderRole?: WeDiskUploaderRole
  previewUrl?: string
  videoPosterUrl?: string
  /**
   * 「资料库」与「微盘」是两套独立存储。这两个字段帮助 UI 跟踪一份资料库文件的"来源"：
   *
   * - `sourceFileId`：当资料库的这份文件是「从教育微盘选择」克隆而来时，记录源 WeDisk 文件 id；
   *   picker UI 可据此把"已加入资料"的源 wedisk 文件灰显，避免老师重复克隆。
   * - `mirroredFrom`：当微盘里这份文件是"资料库本地上传同步过来"的镜像副本时，记录来源标记。
   *   仅用于调试与未来潜在的微盘 UI 提示（如「来自本节资料库」），删除时**不**会联动。
   */
  sourceFileId?: string
  mirroredFrom?: "materials"
}

/** 教学大纲（课程级，唯一） */
export interface CourseOutline {
  fileId: string
  fileName: string
  uploadedAt: string
  /** 解析完成 = true；解析中 = false（uploadedAt = 上传时间，parsingStartedAt = 解析开始时间） */
  parsed: boolean
  parsingStartedAt?: number
}

/** 课次目录 */
export interface CourseLessonFolder {
  /** 等同于子 CUI lessonId（可绑现有 DEMO_LESSON.id） */
  lessonKey: string
  lessonNumber: number
  title: string
  /** 可选时间标签："3/12 周三 19:00" 等。finalizeSchedule 后会被覆写为对应 occurrence 的时间戳格式化 */
  scheduleLabel?: string
  /**
   * 教育微盘侧的文件（独立存储）。
   *
   * - 这是微盘 app 看到的内容，也是 picker 的可选范围；
   * - 资料库本地上传会**镜像**一份到这里（同 id），但删除互不联动；
   * - 微盘 app 本地上传只写这里，不进资料库。
   */
  files: WeDiskFile[]
  /**
   * 课次资料库（独立存储；资料卡 / 备课卡共用）。
   *
   * - 老师在资料卡 / 备课卡本地上传 → 写这里 + **镜像**写 `files[]`（同 id）；
   * - 老师在资料卡 / 备课卡「从教育微盘选择」→ 把 wedisk 文件 clone（新 id + sourceFileId） 写这里；
   * - 删除：仅本侧；微盘侧的镜像 / 原文件保留。
   *
   * 反序列化时若该字段缺失（老 bucket），按 `[]` 兜底，UI 自然降级到"老师还没备课"。
   */
  materialFiles: WeDiskFile[]
}

/* ---------- 排课表（一个课程下可挂多张） ---------- */

/** 教学模式（区别于 deliveryMode 上课模式：线上/线下/双轨） */
export type TeachingFormat = "1on1" | "1on_many" | "small_class" | "big_class"

/** 8 个预设色 token，渲染端映射到 --color-* 变量 */
export type ScheduleColor =
  | "violet"
  | "blue"
  | "cyan"
  | "green"
  | "yellow"
  | "orange"
  | "red"
  | "slate"

export const SCHEDULE_COLOR_LIST: ScheduleColor[] = [
  "violet",
  "blue",
  "cyan",
  "green",
  "yellow",
  "orange",
  "red",
  "slate",
]

/** 重复规则 */
export interface ScheduleRepeatRule {
  kind: "none" | "weekly" | "biweekly" | "monthly" | "custom"
  /** 截止时间戳（含当日 23:59）；none 时忽略；不传则只产生 1 次 */
  until?: number
  /** kind=custom 时生效：自定义重复细则 */
  custom?: ScheduleCustomRepeat
}

/**
 * 自定义重复细则。
 *
 * v1 仅支持「每 N 周 · 多个星期几」（与设计稿一致）；
 * 后续若要扩到「每 N 月某些日」，只需把 intervalUnit 扩成 "week" | "month"
 * + 把 weekdays 改成 dayOfMonth 列表，展开器再加分支即可，不影响 store 兼容。
 */
export interface ScheduleCustomRepeat {
  /** 重复频率：每 N 个 unit */
  intervalEvery: number
  /** 重复单位（v1 仅 "week"） */
  intervalUnit: "week"
  /**
   * 选中的星期几（0=周日 .. 6=周六），多选；为空 → 不生成任何 occurrence。
   * 注意：与 startAt 所在 weekday 是否一致不强制——若不一致，第一节会
   * 顺延到第一个匹配的星期几（用户主动选择的语义优先）。
   */
  weekdays: number[]
}

/** 单次上课时间点 */
export interface ScheduleOccurrence {
  id: string
  /** finalize 时由聚合排序赋值；非 finalize 状态可能为 0 */
  lessonNumber: number
  startAt: number
  endAt: number
  /**
   * 是否已取消。
   *
   * 设计：取消是「软取消」——
   *  - 该 occurrence 仍留在 schedule.occurrences 内（占位 + 显示「已取消」徽章）；
   *  - 不影响 lessonNumber / scheduleLabel 等下游编号；
   *  - 仅履约卡视觉上展示为已取消并放开「删除」入口；
   *  - 删除走 removeScheduleOccurrence 把它从数组真正移出。
   *
   * 持久化天然兼容：旧数据没这个字段时 hydrate 出来即为 undefined（= 未取消）。
   */
  cancelled?: boolean
}

/** 排课表（同一课程可有多张：A 班 / B 班 / 试听 / ...） */
export interface ScheduleRecord {
  id: string
  /** 用户可见名称："周三晚课" */
  name: string
  color: ScheduleColor
  teacherName?: string
  teachingFormat: TeachingFormat
  durationMinutes: number
  occurrences: ScheduleOccurrence[]
  /** 是否已"确认创建" → 进入履约视图 */
  finalized: boolean
  createdAt: number
}

/** 课程（= 微盘里 教学资料/{课程名}/ 文件夹） */
export interface CourseRecord {
  id: string
  name: string
  subject: string
  /** 学段 */
  stage: string
  deliveryMode: "online" | "offline" | "hybrid"
  /** 计划课次数 */
  sessionCount: number
  priceText?: string
  description?: string
  createdAt: number
  /** 教学模式（一对一 / 一对多 / 小班 / 大班）；默认 1on_many */
  teachingFormat: TeachingFormat
  /** 教学大纲（可选；上传后才有） */
  outline?: CourseOutline
  /** 课程级零散文件 */
  rootFiles: WeDiskFile[]
  /** 课次目录列表（教学大纲解析成功后填充） */
  lessons: CourseLessonFolder[]
  /** 排课表列表（创建排课表 / finalize 后写入） */
  schedules: ScheduleRecord[]
  /** 是否来自 demo 种子（用于区分"已有课程"和"新建课程"展示） */
  seeded?: boolean
}

interface SpaceBucket {
  courses: Record<string, CourseRecord>
  /** demo 是否已种过 */
  seeded: boolean
  /**
   * Demo seed 数据版本号；当代码侧 `CURRENT_SEED_VERSION` 改动时，
   * `ensureSeeded` 会重 seed `seeded=true` 课程的排课表 occurrences，
   * 让老用户也能拿到新一版 seed 时间布局，**不会**触碰用户手动创建的课程。
   */
  seedVersion?: number
}

/**
 * 当 seed 时间布局逻辑改变时（如本次的 staticStatus 锚定修复），
 * 把这个版本号 +1。老 bucket 检测到 < CURRENT_SEED_VERSION 时会触发迁移。
 *
 * v2: 按 series.staticStatus + completedLessons 锚定 occurrence 时间窗，
 *     避免「已结课系列今天 19:00 待开始」这种语义打架。
 */
const CURRENT_SEED_VERSION = 2

/* ============================================================
 * Pub/Sub
 * ============================================================ */

type Listener = () => void
const listeners = new Set<Listener>()

function notify() {
  for (const l of Array.from(listeners)) {
    try {
      l()
    } catch {
      /* noop */
    }
  }
}

export function subscribeEduCourses(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/* ============================================================
 * Storage
 * ============================================================ */

/**
 * 教育四角色场景（场景六/七/八/九）：归一到同一个虚拟 bucket scope。
 *
 * 问题背景
 * ----------------------------------------------------
 * 老 bucketKey 把 scenario + orgId 直接拼接，导致：
 *  - 老师（`edu-teacher` + `edu-teacher-demo`）→ bucket A
 *  - 学生（`edu-student` + `no-org`）         → bucket B
 *  - 家长（`edu-parent` + `no-org`）          → bucket C
 *
 * 三个 bucket 各自独立 ensureSeeded，老师创建 / 编辑课程的内容学生 / 家长完全看不到，
 * 连 demo seed 出来的 3 门系列也是分别 seed 的不同对象，"课程履约 / 资料 / 微盘"各角色互相隔离，
 * 与"师生家长在同一所学校 / 同一个班"的产品语义严重脱节。
 *
 * 归一策略
 * ----------------------------------------------------
 * 凡是属于"教育四角色场景"的 scenario，都把 orgId / scenario 强制映射到统一虚拟 scope：
 *   `vvai-edu-courses::edu-role-shared::edu-role-shared`
 * 这样 4 个角色都读写同一个 bucket，履约卡 / 资料卡 / 微盘 / 备课卡的数据立即对齐。
 *
 * 不在归一范围内的 scenario（如场景二 `edu-one`、场景一 `no-org`、场景五等）保持各自隔离，
 * 不破坏既有数据 / 既有体验。
 */
const EDU_ROLE_SHARED_SCOPE = "edu-role-shared"
const EDU_ROLE_SHARED_SCENARIOS = new Set<string>([
  "edu-teacher",
  "edu-student",
  "edu-parent",
  "edu-admin",
])

function bucketScope(
  orgId: string,
  scenario: string | undefined,
): { orgId: string; scenario: string } {
  if (scenario && EDU_ROLE_SHARED_SCENARIOS.has(scenario)) {
    return { orgId: EDU_ROLE_SHARED_SCOPE, scenario: EDU_ROLE_SHARED_SCOPE }
  }
  return { orgId, scenario: scenario ?? "default" }
}

function bucketKey(orgId: string, scenario: string | undefined): string {
  const scope = bucketScope(orgId, scenario)
  return `${STORAGE_PREFIX}::${scope.scenario}::${scope.orgId}`
}

function safeStorage(): Storage | null {
  if (typeof window === "undefined") return null
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

interface PersistableWeDiskFile {
  id: string
  name: string
  type: LessonMaterialFileType
  sizeText: string
  uploadedAt: string
  uploaderName: string
  uploaderId?: string
  uploaderRole?: WeDiskUploaderRole
  sourceFileId?: string
  mirroredFrom?: "materials"
}

interface PersistableLesson {
  lessonKey: string
  lessonNumber: number
  title: string
  scheduleLabel?: string
  files: PersistableWeDiskFile[]
  /** 课次资料库（独立存储）；老 bucket 缺省时 hydrate 兜底 `[]` */
  materialFiles?: PersistableWeDiskFile[]
}

interface PersistableCourse {
  id: string
  name: string
  subject: string
  stage: string
  deliveryMode: "online" | "offline" | "hybrid"
  sessionCount: number
  priceText?: string
  description?: string
  createdAt: number
  /** 老仓位 backfill 默认 1on_many */
  teachingFormat?: TeachingFormat
  outline?: CourseOutline
  rootFiles: PersistableWeDiskFile[]
  lessons: PersistableLesson[]
  /** 老仓位 backfill 默认 [] */
  schedules?: ScheduleRecord[]
  seeded?: boolean
}

interface PersistableBucket {
  courses: Record<string, PersistableCourse>
  seeded: boolean
  seedVersion?: number
}

function readBucket(orgId: string, scenario: string | undefined): SpaceBucket {
  const s = safeStorage()
  if (!s) return { courses: {}, seeded: false }
  try {
    const raw = s.getItem(bucketKey(orgId, scenario))
    if (!raw) return { courses: {}, seeded: false }
    const parsed = JSON.parse(raw) as PersistableBucket
    if (!parsed || typeof parsed !== "object") return { courses: {}, seeded: false }
    /** 反序列化后填回 in-memory blob 引用（刷新后会缺失，UI 自然降级） */
    const courses: Record<string, CourseRecord> = {}
    for (const [id, c] of Object.entries(parsed.courses ?? {})) {
      courses[id] = hydrateCourse(c)
    }
    return {
      courses,
      seeded: !!parsed.seeded,
      seedVersion: typeof parsed.seedVersion === "number" ? parsed.seedVersion : undefined,
    }
  } catch {
    return { courses: {}, seeded: false }
  }
}

function writeBucket(
  orgId: string,
  scenario: string | undefined,
  bucket: SpaceBucket,
) {
  const s = safeStorage()
  if (!s) return
  try {
    const persistable: PersistableBucket = {
      seeded: bucket.seeded,
      seedVersion: bucket.seedVersion,
      courses: Object.fromEntries(
        Object.entries(bucket.courses).map(([id, c]) => [id, dehydrateCourse(c)]),
      ),
    }
    s.setItem(bucketKey(orgId, scenario), JSON.stringify(persistable))
  } catch {
    /* noop */
  }
}

function dehydrateFile(f: WeDiskFile): PersistableWeDiskFile {
  return {
    id: f.id,
    name: f.name,
    type: f.type,
    sizeText: f.sizeText,
    uploadedAt: f.uploadedAt,
    uploaderName: f.uploaderName,
    uploaderId: f.uploaderId,
    uploaderRole: f.uploaderRole,
    sourceFileId: f.sourceFileId,
    mirroredFrom: f.mirroredFrom,
  }
}

function hydrateFile(f: PersistableWeDiskFile): WeDiskFile {
  const blob = blobUrlMap.get(f.id)
  return {
    ...f,
    previewUrl: blob?.previewUrl,
    videoPosterUrl: blob?.videoPosterUrl,
  }
}

function dehydrateCourse(c: CourseRecord): PersistableCourse {
  return {
    id: c.id,
    name: c.name,
    subject: c.subject,
    stage: c.stage,
    deliveryMode: c.deliveryMode,
    sessionCount: c.sessionCount,
    priceText: c.priceText,
    description: c.description,
    createdAt: c.createdAt,
    teachingFormat: c.teachingFormat,
    outline: c.outline,
    rootFiles: c.rootFiles.map(dehydrateFile),
    lessons: c.lessons.map((l) => ({
      lessonKey: l.lessonKey,
      lessonNumber: l.lessonNumber,
      title: l.title,
      scheduleLabel: l.scheduleLabel,
      files: l.files.map(dehydrateFile),
      materialFiles: l.materialFiles.map(dehydrateFile),
    })),
    schedules: c.schedules,
    seeded: c.seeded,
  }
}

function hydrateCourse(c: PersistableCourse): CourseRecord {
  return {
    id: c.id,
    name: c.name,
    subject: c.subject,
    stage: c.stage,
    deliveryMode: c.deliveryMode,
    sessionCount: c.sessionCount,
    priceText: c.priceText,
    description: c.description,
    createdAt: c.createdAt,
    teachingFormat: c.teachingFormat ?? "1on_many",
    outline: c.outline,
    rootFiles: (c.rootFiles ?? []).map(hydrateFile),
    lessons: (c.lessons ?? []).map((l) => ({
      lessonKey: l.lessonKey,
      lessonNumber: l.lessonNumber,
      title: l.title,
      scheduleLabel: l.scheduleLabel,
      files: (l.files ?? []).map(hydrateFile),
      // 老 bucket 没这字段 → 资料库为空，老师"从微盘 pick / 备课卡上传"后才有内容。
      materialFiles: (l.materialFiles ?? []).map(hydrateFile),
    })),
    schedules: c.schedules ?? [],
    seeded: c.seeded,
  }
}

/* ============================================================
 * In-memory blob 临时挂载（不持久）
 * ============================================================ */

const blobUrlMap = new Map<string, { previewUrl?: string; videoPosterUrl?: string }>()

function rememberBlob(
  fileId: string,
  previewUrl: string | undefined,
  videoPosterUrl: string | undefined,
) {
  if (previewUrl || videoPosterUrl) {
    blobUrlMap.set(fileId, { previewUrl, videoPosterUrl })
  }
}

/**
 * 注：当前**不**提供 forgetBlob —— 资料库 / 微盘是两套独立存储，相同 id 可能
 * 同时存在于两侧；revokeObjectURL 是按 URL 字符串撤销，会让另一侧的预览失效。
 * blob URL 由浏览器在页面卸载时统一回收，对 demo 影响可忽略。
 */

/* ============================================================
 * Demo 种子
 *
 * 把 DEMO_SERIES_LIST 中"进行中"的系列（如 力学专题）灌入 store，
 * 课程对应一个 seriesId，课次对应 outline，且课次的 lessonKey 与子 CUI 路由 id 一致：
 *  - outline.boundLessonId 非空：lessonKey = boundLessonId（与现有子 CUI 联动，文件可同步）
 *  - outline.boundLessonId 为空：lessonKey = `${seriesId}__outline_${index}`（与系列子 CUI 联动）
 *
 * 主线课次的 files 从 `lessonMaterialsDemo.MAIN_LESSON_FILES` 抽样（剥离 source / group 字段）。
 * 其它课次的 files 留空，留给"上传演示"。
 * ============================================================ */

function seedFromSeries(series: AiClassroomLessonSeries): CourseRecord {
  const lessons: CourseLessonFolder[] = series.outlines.map((o) => {
    const lessonKey =
      o.boundLessonId ?? `${series.id}__outline_${o.index}`
    /** 主线课次（含 18 卡完整 fixture）→ 灌入示例文件；其它课次留空，让"上传后两边同步"演示更直观 */
    const isMainBound = o.boundLessonId === DEMO_LESSON.id
    const fixture = isMainBound
      ? getLessonMaterialsFixture(lessonKey, {
          lessonTitle: o.title,
          seriesName: series.name,
          lessonNumber: o.index,
          totalLessons: series.totalLessons,
          isPast: o.staticStatus === "past",
        })
      : []
    /**
     * fixture → WeDiskFile（剥离 source / group 字段；统一上传者文案）
     *
     * 种子文件一律视为「公共内容」：`uploaderRole = "admin"`,
     * `uploaderId = "admin-platform"`，这样在资料卡的可见性过滤里对**所有老师**都可见。
     */
    const files: WeDiskFile[] = fixture.map((f) => ({
      id: f.id,
      name: f.name,
      type: f.type,
      sizeText: f.sizeText,
      uploadedAt: f.uploadedAt,
      uploaderName: f.uploaderName ?? "教育微盘",
      uploaderId: "admin-platform",
      uploaderRole: "admin",
    }))
    return {
      lessonKey,
      lessonNumber: o.index,
      title: o.title,
      scheduleLabel: o.scheduleLabel,
      files,
      // 资料库默认空 —— 演示"微盘 ⊋ 资料库"：老师备课 / 从微盘选择后才出现。
      materialFiles: [],
    }
  })

  /**
   * 默认排课表：把全部课次锚到「本周内某天某时 + 之后每周同一时段 90 分钟」上，
   * 让 EduCourseFulfillmentCard 切到 store 后首屏不空。
   *
   * 关键修订（2026-05）：
   * - 老逻辑无视 series.staticStatus，永远从「本周一 + 周X时段」起算 occurrence，
   *   导致已结课系列也把 occurrence 落到本周/未来 → 履约卡显示「待开始」、
   *   子 CUI 端却用 series 自己的「已完课」语义渲染，两边语义打架。
   * - 新逻辑按 staticStatus + completedLessons 把 occurrences 锚到与系列状态一致的时间窗：
   *     completed → 全部 occurrence 落在过去（最后节 = 上周；前推）
   *     upcoming  → 全部 occurrence 落在未来（第 1 节 = 下周；后推）
   *     ongoing   → 已完成的几节落在过去；剩余从本周起后推
   *   这样履约卡 row 状态（按 Date.now() 算）与系列子 CUI 状态自然对齐。
   *
   * - 颜色：按 series.id 字符稳定取色，多课程同周时颜色不同
   * - 星期 / 时段：按 series.id 字符稳定 hash 到「周一/周三/周五 + 19/18:30/20 点」
   *   这样 3 门 demo 系列分别落在工作日不同时段，单看任一天都能看到 1～2 节
   */
  const seriesIdHash = (() => {
    let h = 0
    for (let i = 0; i < series.id.length; i++) {
      h = (Math.imul(h, 31) + series.id.charCodeAt(i)) | 0
    }
    return Math.abs(h)
  })()
  const color = SCHEDULE_COLOR_LIST[seriesIdHash % SCHEDULE_COLOR_LIST.length]
  /**
   * 星期池（0=周一 … 6=周日）：避开"全部撞周一"的演示问题。
   * 这里固定挑工作日 + 周末各取一个，保证不同 series 落到不同 weekday。
   */
  const WEEKDAY_POOL: { dayIdx: number; hour: number; minute: number }[] = [
    { dayIdx: 0, hour: 19, minute: 0 }, // 周一 19:00
    { dayIdx: 2, hour: 18, minute: 30 }, // 周三 18:30
    { dayIdx: 4, hour: 20, minute: 0 }, // 周五 20:00
    { dayIdx: 6, hour: 10, minute: 0 }, // 周日 10:00
  ]
  const slot =
    WEEKDAY_POOL[seriesIdHash % WEEKDAY_POOL.length] ?? WEEKDAY_POOL[0]!
  const monday = startOfThisWeekMonday()
  const slotMs =
    slot.dayIdx * 24 * 60 * 60 * 1000 +
    slot.hour * 60 * 60 * 1000 +
    slot.minute * 60 * 1000
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000
  const totalLessons = lessons.length
  /**
   * 给定 lesson idx（0-based）→ 该节相对于本周一的「周偏移」。
   *
   * - completed：第 1 节 = -totalLessons 周；第 N 节 = -(totalLessons - N + 1) 周；
   *   最后节 = -1 周（上周），整组全部已结束。
   * - upcoming：第 1 节 = +1 周；第 N 节 = +N 周，整组全部未到。
   * - ongoing：已完成 completedLessons 节落在过去（最近一节 = -1 周），
   *   未完成的从本周（0）起，按周顺推。当 completedLessons = 0 时与 upcoming 同样行为；
   *   当 completedLessons = totalLessons 时与 completed 同样行为。
   */
  const offsetWeeksByIdx = (idx: number): number => {
    if (series.staticStatus === "completed") {
      return -(totalLessons - idx)
    }
    if (series.staticStatus === "upcoming") {
      return idx + 1
    }
    /** ongoing */
    const done = Math.min(Math.max(series.completedLessons ?? 0, 0), totalLessons)
    if (idx < done) return -(done - idx)
    return idx - done
  }
  const occurrences: ScheduleOccurrence[] = lessons.map((_, idx) => {
    const startAt = monday + offsetWeeksByIdx(idx) * WEEK_MS + slotMs
    return {
      id: `occ-${series.id}-${idx + 1}`,
      lessonNumber: idx + 1,
      startAt,
      endAt: startAt + 90 * 60 * 1000,
    }
  })
  const defaultSchedule: ScheduleRecord = {
    id: `sched-${series.id}-default`,
    name: "主排课表",
    color,
    teacherName: series.teacher,
    teachingFormat: "1on_many",
    durationMinutes: 90,
    occurrences,
    finalized: true,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 29,
  }

  /** 同步把 lessons[i].scheduleLabel 写成 occurrence 时间戳，让资料卡和履约卡的时间对齐 */
  const lessonsWithLabel = lessons.map((l, idx) => ({
    ...l,
    scheduleLabel: occurrences[idx]
      ? formatScheduleLabel(occurrences[idx]!.startAt)
      : l.scheduleLabel,
  }))

  return {
    id: `course-${series.id}`,
    name: series.name,
    subject: series.subject,
    stage: "初中",
    deliveryMode: "hybrid",
    sessionCount: series.totalLessons,
    priceText: `¥${series.totalLessons * 150} / ${series.totalLessons} 节`,
    description: `${series.teacher} · ${series.className} · ${series.classroom}`,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 30, // 假设 30 天前创建
    teachingFormat: "1on_many",
    outline: {
      fileId: `outline-${series.id}`,
      fileName: `${series.name} · 教学大纲.pdf`,
      uploadedAt: "上月初",
      parsed: true,
    },
    rootFiles: [],
    lessons: lessonsWithLabel,
    schedules: [defaultSchedule],
    seeded: true,
  }
}

/** 本周一 00:00 的时间戳（按浏览器本地时区） */
function startOfThisWeekMonday(): number {
  const now = new Date()
  const day = now.getDay() // 0 = Sun, 1 = Mon, ...
  /** JS getDay 周日=0，把它当作"本周第 7 天" */
  const daysFromMonday = day === 0 ? 6 : day - 1
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - daysFromMonday)
  return d.getTime()
}

/** "M/D 周X HH:mm" */
function formatScheduleLabel(ts: number): string {
  const d = new Date(ts)
  const wkLabels = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"]
  const hh = String(d.getHours()).padStart(2, "0")
  const mm = String(d.getMinutes()).padStart(2, "0")
  return `${d.getMonth() + 1}/${d.getDate()} ${wkLabels[d.getDay()]} ${hh}:${mm}`
}

function ensureSeeded(orgId: string, scenario: string | undefined) {
  const bucket = readBucket(orgId, scenario)
  /**
   * 种入策略：
   *  - 把 DEMO_SERIES_LIST 全部 3 门系列都种进去（不再按 staticStatus 过滤），
   *    每门系列落到不同 weekday + 时段，让"今天的课程履约"不至于只剩一节
   *  - 补种语义（idempotent）：每门系列的目标 course id = `course-${series.id}`，
   *    bucket 里已存在该 id 就跳过；不存在才种入。这样既支持新 bucket 一次种全，
   *    也支持老 bucket（已被旧版只种了一门 ongoing 的）安全补齐另外两门
   *  - 版本迁移（v1 → v2）：当 bucket.seedVersion < CURRENT_SEED_VERSION 时，
   *    所有 `seeded=true` 课程的 `schedules` 重置为新版 seed（按 staticStatus 锚时间），
   *    保留 lessons 内的 files / 用户上传内容；用户手动创建（seeded=false）的课程**完全不动**
   */
  let dirty = false
  const needSeedMigration =
    typeof bucket.seedVersion !== "number" ||
    bucket.seedVersion < CURRENT_SEED_VERSION
  if (needSeedMigration) {
    for (const [courseId, course] of Object.entries(bucket.courses)) {
      if (!course.seeded) continue
      /** 在 DEMO_SERIES_LIST 反查对应 series（id 形如 `course-${seriesId}`） */
      const seriesId = courseId.replace(/^course-/, "")
      const series = DEMO_SERIES_LIST.find((s) => s.id === seriesId)
      if (!series) continue
      const reseeded = seedFromSeries(series)
      /**
       * 仅替换 schedules（时间布局是新逻辑产物）；
       * lessons 保留旧版 files（用户可能在子 CUI / 微盘上传过内容），
       * 但 lessons 的 scheduleLabel 用新 occurrences 时间重写，避免标签和实际占位错位。
       */
      const newSchedule = reseeded.schedules?.[0]
      const newLessonsLabelByKey = new Map(
        reseeded.lessons.map((l) => [l.lessonKey, l.scheduleLabel]),
      )
      bucket.courses[courseId] = {
        ...course,
        schedules: reseeded.schedules,
        lessons: course.lessons.map((l) => ({
          ...l,
          scheduleLabel: newLessonsLabelByKey.get(l.lessonKey) ?? l.scheduleLabel,
        })),
      }
      void newSchedule
      dirty = true
    }
  }
  for (const series of DEMO_SERIES_LIST) {
    const targetId = `course-${series.id}`
    if (bucket.courses[targetId]) continue
    const course = seedFromSeries(series)
    bucket.courses[course.id] = course
    dirty = true
  }
  if (
    !bucket.seeded ||
    dirty ||
    bucket.seedVersion !== CURRENT_SEED_VERSION
  ) {
    bucket.seeded = true
    bucket.seedVersion = CURRENT_SEED_VERSION
    writeBucket(orgId, scenario, bucket)
  }
  return bucket
}

/* ============================================================
 * 工具：友好时间标签
 * ============================================================ */

function nowLabel(): string {
  return "刚刚"
}

/* ============================================================
 * 对外 API
 * ============================================================ */

export interface SpaceContext {
  orgId: string
  scenario?: string
}

/** 列出当前空间下所有课程（按 createdAt 倒序，新建在前） */
export function listCourses(ctx: SpaceContext): CourseRecord[] {
  const bucket = ensureSeeded(ctx.orgId, ctx.scenario)
  return Object.values(bucket.courses).sort((a, b) => b.createdAt - a.createdAt)
}

/** 获取单个课程 */
export function getCourse(
  ctx: SpaceContext,
  courseId: string,
): CourseRecord | null {
  const bucket = ensureSeeded(ctx.orgId, ctx.scenario)
  return bucket.courses[courseId] ?? null
}

/** 创建课程 → 同时在微盘 教学资料/ 下出现该课程文件夹 */
export function createCourse(input: {
  ctx: SpaceContext
  name: string
  subject: string
  stage: string
  deliveryMode: "online" | "offline" | "hybrid"
  sessionCount: number
  priceText?: string
  description?: string
  /** 教学模式（默认 1on_many，与 deliveryMode "上课模式" 是两个维度） */
  teachingFormat?: TeachingFormat
}): CourseRecord {
  const bucket = ensureSeeded(input.ctx.orgId, input.ctx.scenario)
  const id = `course-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const course: CourseRecord = {
    id,
    name: input.name,
    subject: input.subject,
    stage: input.stage,
    deliveryMode: input.deliveryMode,
    sessionCount: input.sessionCount,
    priceText: input.priceText,
    description: input.description,
    createdAt: Date.now(),
    teachingFormat: input.teachingFormat ?? "1on_many",
    rootFiles: [],
    lessons: [],
    schedules: [],
    seeded: false,
  }
  bucket.courses[id] = course
  writeBucket(input.ctx.orgId, input.ctx.scenario, bucket)
  notify()
  return course
}

/* ============================================================
 * 排课表 API
 * ============================================================ */

/**
 * 创建一张空排课表（finalized=false，不进入履约视图，只用于编辑面板回填）
 */
export function createSchedule(input: {
  ctx: SpaceContext
  courseId: string
  name: string
  color: ScheduleColor
  teachingFormat?: TeachingFormat
  durationMinutes?: number
  teacherName?: string
}): ScheduleRecord | null {
  const bucket = ensureSeeded(input.ctx.orgId, input.ctx.scenario)
  const course = bucket.courses[input.courseId]
  if (!course) return null
  const schedule: ScheduleRecord = {
    id: `sched-${input.courseId}-${Date.now()}`,
    name: input.name,
    color: input.color,
    teacherName: input.teacherName,
    teachingFormat: input.teachingFormat ?? course.teachingFormat,
    durationMinutes: input.durationMinutes ?? 90,
    occurrences: [],
    finalized: false,
    createdAt: Date.now(),
  }
  course.schedules = [...course.schedules, schedule]
  writeBucket(input.ctx.orgId, input.ctx.scenario, bucket)
  notify()
  return schedule
}

/**
 * 把「重复规则 + 第一节起始时间 + 课节数」展开为 N 个上课开始时间戳。
 *
 * 这是排课表展开的**单一来源（single source of truth）**：
 *  - 表单层（AddScheduleTimeSheet）用它实时算「将生成几次 / 截止于哪天」；
 *  - store 层（addScheduleOccurrencesFromForm）用它真正写 occurrences。
 *
 * 展开规则：
 *  - kind=none                       → 仅 1 次
 *  - kind=weekly / biweekly / monthly → 从 startAt 按 7/14/30 天递增，cap 节
 *  - kind=custom                      → 按 ScheduleCustomRepeat：
 *      · 从 startAt 当天起向后逐日扫描；
 *      · 命中 weekdays 且 weekIndex % intervalEvery == 0 时产出 1 次；
 *      · 第一节落在第一个匹配的 weekday 上（即便它与 startAt 的 weekday 不同
 *        也会自然顺延），符合用户的视觉直觉。
 *  - until：若有，超过则提前终止（适用于所有 kind）。
 *  - cap = min(sessionCount, 99)；扫描上限 4 年防呆。
 */
export function expandScheduleStartTimestamps(input: {
  /** 第一节的「锚点时间」：日期分量决定起始日，时分分量决定每次上课时刻 */
  startAt: number
  repeat: ScheduleRepeatRule
  /** 期望生成多少节（与 repeat.until 取较小者） */
  sessionCount: number
}): number[] {
  const cap = Math.max(1, Math.min(input.sessionCount, 99))
  const result: number[] = []

  if (input.repeat.kind === "none") {
    result.push(input.startAt)
    return result
  }

  /* ---------- custom：每 N 周 · 星期几多选 ---------- */
  if (input.repeat.kind === "custom") {
    const custom = input.repeat.custom
    if (!custom) return result
    const wanted = new Set(
      custom.weekdays.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6),
    )
    if (wanted.size === 0) return result
    const interval = Math.max(1, Math.floor(custom.intervalEvery) || 1)
    const dayMs = 24 * 60 * 60 * 1000

    const startDate = new Date(input.startAt)
    const startMidnight = new Date(startDate)
    startMidnight.setHours(0, 0, 0, 0)
    /** 当天 00:00 → startAt 的偏移，作为「每次上课时刻」 */
    const tod = input.startAt - startMidnight.getTime()
    /** 起始周的「周日 00:00」锚点：用于算 weekIndex */
    const weekAnchor =
      startMidnight.getTime() - startMidnight.getDay() * dayMs

    const limitDays = 365 * 4
    for (let i = 0; i < limitDays; i++) {
      const day = new Date(startMidnight.getTime() + i * dayMs)
      const wd = day.getDay()
      if (!wanted.has(wd)) continue
      const dayWeekStart = day.getTime() - wd * dayMs
      const weekIndex = Math.round((dayWeekStart - weekAnchor) / (7 * dayMs))
      if (weekIndex % interval !== 0) continue
      const ts = day.getTime() + tod
      if (ts < input.startAt) continue
      if (input.repeat.until && ts > input.repeat.until) break
      result.push(ts)
      if (result.length >= cap) break
    }
    return result
  }

  /* ---------- weekly / biweekly / monthly：固定步长 ---------- */
  const stepDays =
    input.repeat.kind === "weekly"
      ? 7
      : input.repeat.kind === "biweekly"
        ? 14
        : input.repeat.kind === "monthly"
          ? 30
          : 0
  const stepMs = stepDays * 24 * 60 * 60 * 1000
  for (let i = 0; i < cap; i++) {
    const ts = input.startAt + i * stepMs
    if (input.repeat.until && ts > input.repeat.until) break
    result.push(ts)
  }
  return result
}

/**
 * 把一段「重复规则 + 起止时间 + 单节时长 + 课节数」展开为多条 occurrence 写入排课表。
 *
 * 真正的展开逻辑在 `expandScheduleStartTimestamps`；本函数只负责
 * occurrence 构造 + 写 bucket + notify。这样表单层和 store 层共用展开器，
 * 永远不会出现 UI 预览的"将生成 N 次"与实际写入的次数对不上的问题。
 */
export function addScheduleOccurrencesFromForm(input: {
  ctx: SpaceContext
  courseId: string
  scheduleId: string
  /** 第一节的开始时间（UTC ms） */
  startAt: number
  /** 单节时长（分钟） */
  durationMinutes: number
  /** 重复规则 */
  repeat: ScheduleRepeatRule
  /** 期望生成多少节（与 repeat.until 取较小者） */
  sessionCount: number
}): ScheduleRecord | null {
  const bucket = ensureSeeded(input.ctx.orgId, input.ctx.scenario)
  const course = bucket.courses[input.courseId]
  if (!course) return null
  const schedule = course.schedules.find((s) => s.id === input.scheduleId)
  if (!schedule) return null

  const dur = input.durationMinutes * 60 * 1000
  const startAts = expandScheduleStartTimestamps({
    startAt: input.startAt,
    repeat: input.repeat,
    sessionCount: input.sessionCount,
  })
  const newOccurrences: ScheduleOccurrence[] = startAts.map((startAt, i) => ({
    id: `occ-${schedule.id}-${input.startAt}-${i}`,
    lessonNumber: 0, // finalize 时再赋值
    startAt,
    endAt: startAt + dur,
  }))

  schedule.occurrences = [...schedule.occurrences, ...newOccurrences]
  schedule.durationMinutes = input.durationMinutes
  writeBucket(input.ctx.orgId, input.ctx.scenario, bucket)
  notify()
  return schedule
}

/** 删除整张排课表（用于取消草稿；finalized 也允许删除） */
export function removeSchedule(input: {
  ctx: SpaceContext
  courseId: string
  scheduleId: string
}): void {
  const bucket = ensureSeeded(input.ctx.orgId, input.ctx.scenario)
  const course = bucket.courses[input.courseId]
  if (!course) return
  course.schedules = course.schedules.filter((s) => s.id !== input.scheduleId)
  writeBucket(input.ctx.orgId, input.ctx.scenario, bucket)
  notify()
}

/** 删除某 schedule 内某条 occurrence */
export function removeScheduleOccurrence(input: {
  ctx: SpaceContext
  courseId: string
  scheduleId: string
  occurrenceId: string
}): void {
  const bucket = ensureSeeded(input.ctx.orgId, input.ctx.scenario)
  const course = bucket.courses[input.courseId]
  if (!course) return
  const schedule = course.schedules.find((s) => s.id === input.scheduleId)
  if (!schedule) return
  schedule.occurrences = schedule.occurrences.filter(
    (o) => o.id !== input.occurrenceId,
  )
  writeBucket(input.ctx.orgId, input.ctx.scenario, bucket)
  notify()
}

/**
 * 软取消某条 occurrence —— 只把 `cancelled` 翻到目标布尔值，不删除条目。
 *
 * - `cancelled=true`：履约卡显示「已取消」徽章，并放开删除入口；
 * - `cancelled=false`：恢复正常履约。
 *
 * 取消后再删 = removeScheduleOccurrence；恢复则继续按时间事实算 in/soon/...
 */
export function setScheduleOccurrenceCancelled(input: {
  ctx: SpaceContext
  courseId: string
  scheduleId: string
  occurrenceId: string
  cancelled: boolean
}): void {
  const bucket = ensureSeeded(input.ctx.orgId, input.ctx.scenario)
  const course = bucket.courses[input.courseId]
  if (!course) return
  const schedule = course.schedules.find((s) => s.id === input.scheduleId)
  if (!schedule) return
  const occ = schedule.occurrences.find((o) => o.id === input.occurrenceId)
  if (!occ) return
  if (input.cancelled) {
    occ.cancelled = true
  } else {
    /** 显式恢复：直接 delete 字段，避免持久化里堆 false 噪声 */
    delete occ.cancelled
  }
  writeBucket(input.ctx.orgId, input.ctx.scenario, bucket)
  notify()
}

/**
 * 更新单次 occurrence 的 startAt + duration（不影响其它 occurrences）。
 *
 * 设计：
 *  - 先更新 startAt / endAt（=startAt + duration），再按 startAt 重新排序
 *  - 不在此处自动重排 lessonNumber / 重写 lessons[].scheduleLabel——交给上层在"确认"
 *    （即 finalizeSchedule）时统一对齐。原因：finalize 是用户主动动作，避免每次拖动
 *    都触发 lessons[] 重排；行为与 addScheduleOccurrencesFromForm / removeScheduleOccurrence 一致。
 */
export function updateScheduleOccurrence(input: {
  ctx: SpaceContext
  courseId: string
  scheduleId: string
  occurrenceId: string
  startAt: number
  durationMinutes: number
}): void {
  const bucket = ensureSeeded(input.ctx.orgId, input.ctx.scenario)
  const course = bucket.courses[input.courseId]
  if (!course) return
  const schedule = course.schedules.find((s) => s.id === input.scheduleId)
  if (!schedule) return
  const occ = schedule.occurrences.find((o) => o.id === input.occurrenceId)
  if (!occ) return
  const safeDuration = Math.max(1, Math.floor(input.durationMinutes) || 60)
  occ.startAt = input.startAt
  occ.endAt = input.startAt + safeDuration * 60 * 1000
  schedule.occurrences.sort((a, b) => a.startAt - b.startAt)
  writeBucket(input.ctx.orgId, input.ctx.scenario, bucket)
  notify()
}

/**
 * 更新已存在排课表的 name/color（不动 occurrences）
 */
export function updateScheduleMeta(input: {
  ctx: SpaceContext
  courseId: string
  scheduleId: string
  name?: string
  color?: ScheduleColor
  teacherName?: string
}): void {
  const bucket = ensureSeeded(input.ctx.orgId, input.ctx.scenario)
  const course = bucket.courses[input.courseId]
  if (!course) return
  const schedule = course.schedules.find((s) => s.id === input.scheduleId)
  if (!schedule) return
  if (input.name !== undefined) schedule.name = input.name
  if (input.color !== undefined) schedule.color = input.color
  if (input.teacherName !== undefined) schedule.teacherName = input.teacherName
  writeBucket(input.ctx.orgId, input.ctx.scenario, bucket)
  notify()
}

/**
 * 把排课表标记为 finalized，并在课程层做"第 N 时间点 ↔ 第 N 课次资料目录"的对齐：
 *
 *   1. 收集课程下所有 finalized=true（含本张）schedule 的全部 occurrences
 *   2. 按 startAt 排序、连续编号 lessonNumber 1..M
 *   3. 保证 course.lessons[i] 存在（不够则按"第 N 节·待补充标题"补齐）
 *   4. 把 lessons[i].scheduleLabel 覆写为对应 occurrence 时间戳的"M/D 周X HH:mm"
 *
 * 这样 LessonMaterialsCard 看到的"第 N 节"和 EduCourseFulfillmentCard 看到的
 * "第 N 个上课时间点"是同一份事实。
 */
export function finalizeSchedule(input: {
  ctx: SpaceContext
  courseId: string
  scheduleId: string
}): void {
  const bucket = ensureSeeded(input.ctx.orgId, input.ctx.scenario)
  const course = bucket.courses[input.courseId]
  if (!course) return
  const schedule = course.schedules.find((s) => s.id === input.scheduleId)
  if (!schedule) return
  schedule.finalized = true

  /** 收集课程下所有 finalized schedule 的全部 occurrences，按 startAt 排序赋 lessonNumber */
  type Ref = { schedule: ScheduleRecord; occurrence: ScheduleOccurrence }
  const allRefs: Ref[] = []
  for (const s of course.schedules) {
    if (!s.finalized) continue
    for (const o of s.occurrences) allRefs.push({ schedule: s, occurrence: o })
  }
  allRefs.sort((a, b) => a.occurrence.startAt - b.occurrence.startAt)
  allRefs.forEach((r, idx) => {
    r.occurrence.lessonNumber = idx + 1
  })

  /** 保证 lessons 数组长度 ≥ allRefs.length，并写入 scheduleLabel */
  const targetLen = Math.max(allRefs.length, course.lessons.length, course.sessionCount)
  const lessons: CourseLessonFolder[] = []
  for (let i = 0; i < targetLen; i++) {
    const existing = course.lessons[i]
    const ref = allRefs[i]
    const lessonKey = existing?.lessonKey ?? `lesson-${course.id}-${i + 1}`
    lessons.push({
      lessonKey,
      lessonNumber: i + 1,
      title: existing?.title ?? `第 ${i + 1} 节 · 待补充标题`,
      scheduleLabel: ref ? formatScheduleLabel(ref.occurrence.startAt) : existing?.scheduleLabel,
      files: existing?.files ?? [],
      materialFiles: existing?.materialFiles ?? [],
    })
  }
  course.lessons = lessons

  writeBucket(input.ctx.orgId, input.ctx.scenario, bucket)
  notify()
}

/**
 * 跨课程聚合：取在 [fromTs, toTs) 范围内、属于已 finalized 的排课表的全部 occurrence，
 * 并附带其所属 schedule + course。
 *
 * EduCourseFulfillmentCard 周视图直接用这个。
 */
export function listScheduleOccurrencesInRange(input: {
  ctx: SpaceContext
  fromTs: number
  toTs: number
}): { occurrence: ScheduleOccurrence; schedule: ScheduleRecord; course: CourseRecord }[] {
  const bucket = ensureSeeded(input.ctx.orgId, input.ctx.scenario)
  const result: {
    occurrence: ScheduleOccurrence
    schedule: ScheduleRecord
    course: CourseRecord
  }[] = []
  for (const course of Object.values(bucket.courses)) {
    for (const schedule of course.schedules) {
      if (!schedule.finalized) continue
      for (const occurrence of schedule.occurrences) {
        if (occurrence.startAt >= input.fromTs && occurrence.startAt < input.toTs) {
          result.push({ occurrence, schedule, course })
        }
      }
    }
  }
  result.sort((a, b) => a.occurrence.startAt - b.occurrence.startAt)
  return result
}

/** 教学模式中文标签 */
export function teachingFormatLabel(f: TeachingFormat): string {
  switch (f) {
    case "1on1":
      return "一对一"
    case "1on_many":
      return "一对多"
    case "small_class":
      return "小班课"
    case "big_class":
      return "大班课"
    default:
      return "一对多"
  }
}

/** 排课表色 token → CSS color 映射（HSL，避免依赖现有 token，且 light/dark 都过得去） */
export function scheduleColorToHsl(c: ScheduleColor): string {
  switch (c) {
    case "violet":
      return "hsl(258 88% 64%)"
    case "blue":
      return "hsl(217 88% 58%)"
    case "cyan":
      return "hsl(192 80% 48%)"
    case "green":
      return "hsl(142 64% 44%)"
    case "yellow":
      return "hsl(45 92% 56%)"
    case "orange":
      return "hsl(24 92% 58%)"
    case "red":
      return "hsl(0 80% 60%)"
    case "slate":
      return "hsl(215 16% 50%)"
  }
}

/** 上传教学大纲（同步标记为"解析中"，1.5s 后自动 parse → 写入课次） */
export function uploadCourseOutline(input: {
  ctx: SpaceContext
  courseId: string
  fileName: string
  /** 可选：解析后的课次 titles（不传则按 sessionCount 自动占位） */
  parsedLessons?: { lessonNumber: number; title: string }[]
}): { course: CourseRecord; settle: Promise<void> } {
  const bucket = ensureSeeded(input.ctx.orgId, input.ctx.scenario)
  const course = bucket.courses[input.courseId]
  if (!course) {
    throw new Error(`Course not found: ${input.courseId}`)
  }
  const fileId = `outline-${course.id}-${Date.now()}`
  course.outline = {
    fileId,
    fileName: input.fileName,
    uploadedAt: nowLabel(),
    parsed: false,
    parsingStartedAt: Date.now(),
  }
  writeBucket(input.ctx.orgId, input.ctx.scenario, bucket)
  notify()

  /** 1.5s 后完成 mock 解析 → 写入课次目录 */
  const settle = new Promise<void>((resolve) => {
    window.setTimeout(() => {
      const fresh = readBucket(input.ctx.orgId, input.ctx.scenario)
      const c = fresh.courses[input.courseId]
      if (!c) return resolve()
      const lessons = buildAutoLessons({
        course: c,
        parsed: input.parsedLessons,
      })
      c.lessons = lessons
      if (c.outline) {
        c.outline.parsed = true
      }
      writeBucket(input.ctx.orgId, input.ctx.scenario, fresh)
      notify()
      resolve()
    }, 1500)
  })

  return { course, settle }
}

function buildAutoLessons(input: {
  course: CourseRecord
  parsed?: { lessonNumber: number; title: string }[]
}): CourseLessonFolder[] {
  const { course, parsed } = input
  if (parsed && parsed.length > 0) {
    return parsed.map((p) => ({
      lessonKey: `lesson-${course.id}-${p.lessonNumber}`,
      lessonNumber: p.lessonNumber,
      title: p.title,
      files: [],
      materialFiles: [],
    }))
  }
  /** 没传 parsed：按 sessionCount 占位 N 个课次（"第 N 节·待补充标题"） */
  const n = Math.max(1, course.sessionCount)
  return Array.from({ length: n }, (_, idx) => ({
    lessonKey: `lesson-${course.id}-${idx + 1}`,
    lessonNumber: idx + 1,
    title: `第 ${idx + 1} 节 · 待补充标题`,
    files: [],
    materialFiles: [],
  }))
}

/* ============================================================
 * 文件 CRUD —— 两套独立 API
 *
 * 1. 教育微盘（WeDisk）侧
 *    · listFiles / uploadFile / deleteFile
 *    · 微盘 app（EduTeachingMaterialsBrowserCard）唯一入口；
 *    · 这些函数**只读写** `lesson.files[] / course.rootFiles[]`，不联动资料库。
 *
 * 2. 课次资料库（LessonMaterials）侧
 *    · listMaterialFiles / uploadMaterialFile / deleteMaterialFile
 *      / pickWeDiskFileIntoMaterials
 *    · 资料卡（LessonMaterialsCard）+ 备课卡（TeacherLessonPrepReadyCard）共用；
 *    · 本地上传 (`uploadMaterialFile`) 内部会**镜像**一份到对应课次的微盘 `files[]`，
 *      让"老师上传的课程资料自动归档到微盘"这条心智成立；但删除不联动。
 *    · 从微盘选择 (`pickWeDiskFileIntoMaterials`) = 在资料库 clone 一份新 id 的副本，
 *      并把 `sourceFileId` 指回 wedisk 源文件 id，用于 picker UI 判重。
 *
 * 删除策略（独立 / 不联动）：
 *  - 删微盘里的文件：仅删 `files[]`；如果资料库 clone 过去的副本仍在，保留。
 *  - 删资料库里的文件：仅删 `materialFiles[]`；微盘里的原文件 / 镜像保留。
 *  - 为避免出现"另一侧还有副本但 blob URL 被 revoke"，删除时**不再** forgetBlob；
 *    blob URL 仅在页面 unload 时由浏览器自动回收，对 demo 影响可忽略。
 * ============================================================ */

/* ---------------- 微盘侧（WeDisk）---------------- */

/** 列出指定位置的**微盘**文件（lessonKey=null → 课程根；否则取该课次目录） */
export function listFiles(input: {
  ctx: SpaceContext
  courseId: string
  /** null → 课程根；否则课次目录 */
  lessonKey: string | null
}): WeDiskFile[] {
  const course = getCourse(input.ctx, input.courseId)
  if (!course) return []
  if (input.lessonKey == null) return course.rootFiles.slice()
  const lesson = course.lessons.find((l) => l.lessonKey === input.lessonKey)
  return lesson ? lesson.files.slice() : []
}

/** 上传文件到**微盘**（最新在前）—— 只写微盘侧，不进资料库 */
export function uploadFile(input: {
  ctx: SpaceContext
  courseId: string
  /** null → 课程根；否则课次目录 */
  lessonKey: string | null
  file: WeDiskFile
  previewUrl?: string
  videoPosterUrl?: string
}): void {
  const bucket = ensureSeeded(input.ctx.orgId, input.ctx.scenario)
  const course = bucket.courses[input.courseId]
  if (!course) return
  rememberBlob(input.file.id, input.previewUrl, input.videoPosterUrl)
  if (input.lessonKey == null) {
    course.rootFiles = [input.file, ...course.rootFiles]
  } else {
    const lesson = course.lessons.find((l) => l.lessonKey === input.lessonKey)
    if (!lesson) return
    lesson.files = [input.file, ...lesson.files]
  }
  writeBucket(input.ctx.orgId, input.ctx.scenario, bucket)
  notify()
}

/** 从**微盘**删除文件（不联动资料库；blob URL 不主动 revoke）*/
export function deleteFile(input: {
  ctx: SpaceContext
  courseId: string
  lessonKey: string | null
  fileId: string
}): void {
  const bucket = ensureSeeded(input.ctx.orgId, input.ctx.scenario)
  const course = bucket.courses[input.courseId]
  if (!course) return
  if (input.lessonKey == null) {
    course.rootFiles = course.rootFiles.filter((f) => f.id !== input.fileId)
  } else {
    const lesson = course.lessons.find((l) => l.lessonKey === input.lessonKey)
    if (!lesson) return
    lesson.files = lesson.files.filter((f) => f.id !== input.fileId)
  }
  writeBucket(input.ctx.orgId, input.ctx.scenario, bucket)
  notify()
}

/* ---------------- 资料库侧（LessonMaterials）---------------- */

/** 列出指定课次的**资料库**文件 */
export function listMaterialFiles(input: {
  ctx: SpaceContext
  courseId: string
  lessonKey: string
}): WeDiskFile[] {
  const course = getCourse(input.ctx, input.courseId)
  if (!course) return []
  const lesson = course.lessons.find((l) => l.lessonKey === input.lessonKey)
  return lesson ? lesson.materialFiles.slice() : []
}

/**
 * 上传文件到**资料库**（资料卡 / 备课卡本地上传走这里）：
 * - 写入 `lesson.materialFiles`（最新在前）
 * - **同步镜像**一份到 `lesson.files`（微盘侧；同 id 共享 blob；标记 `mirroredFrom: "materials"`）
 *   → 命中"老师课程里上传的资料会自动归档到微盘"心智，但删除不联动。
 */
export function uploadMaterialFile(input: {
  ctx: SpaceContext
  courseId: string
  lessonKey: string
  file: WeDiskFile
  previewUrl?: string
  videoPosterUrl?: string
}): void {
  const bucket = ensureSeeded(input.ctx.orgId, input.ctx.scenario)
  const course = bucket.courses[input.courseId]
  if (!course) return
  const lesson = course.lessons.find((l) => l.lessonKey === input.lessonKey)
  if (!lesson) return

  rememberBlob(input.file.id, input.previewUrl, input.videoPosterUrl)

  /* 1) 写资料库 */
  lesson.materialFiles = [input.file, ...lesson.materialFiles]

  /* 2) 镜像到微盘（同 id；mirroredFrom 仅作来源标签，删除不联动） */
  const mirrored: WeDiskFile = { ...input.file, mirroredFrom: "materials" }
  lesson.files = [mirrored, ...lesson.files]

  writeBucket(input.ctx.orgId, input.ctx.scenario, bucket)
  notify()
}

/** 从**资料库**删除文件（不联动微盘；blob URL 不主动 revoke）*/
export function deleteMaterialFile(input: {
  ctx: SpaceContext
  courseId: string
  lessonKey: string
  fileId: string
}): void {
  const bucket = ensureSeeded(input.ctx.orgId, input.ctx.scenario)
  const course = bucket.courses[input.courseId]
  if (!course) return
  const lesson = course.lessons.find((l) => l.lessonKey === input.lessonKey)
  if (!lesson) return
  lesson.materialFiles = lesson.materialFiles.filter((f) => f.id !== input.fileId)
  writeBucket(input.ctx.orgId, input.ctx.scenario, bucket)
  notify()
}

/**
 * 从微盘 picker 选中一份文件 → clone 进资料库（资料卡 / 备课卡的「从教育微盘选择」走这里）：
 * - 新 id 避免与原 wedisk 文件冲突
 * - `sourceFileId = source.id` 用于 picker UI 判"已加入资料"
 * - blob URL 与 source 共享（rememberBlob 用新 id 复登记同一份 url）
 * - 仅写资料库，不动微盘
 *
 * 返回 clone 后的资料库副本。
 */
export function pickWeDiskFileIntoMaterials(input: {
  ctx: SpaceContext
  source: WeDiskFile
  targetCourseId: string
  targetLessonKey: string
}): WeDiskFile | null {
  const bucket = ensureSeeded(input.ctx.orgId, input.ctx.scenario)
  const course = bucket.courses[input.targetCourseId]
  if (!course) return null
  const lesson = course.lessons.find((l) => l.lessonKey === input.targetLessonKey)
  if (!lesson) return null

  const cloned: WeDiskFile = {
    ...input.source,
    id: `mat-pick-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    sourceFileId: input.source.id,
    mirroredFrom: undefined,
  }
  /** blob URL 与 source 共享同一份 */
  const sourceBlob = blobUrlMap.get(input.source.id)
  if (sourceBlob) {
    blobUrlMap.set(cloned.id, sourceBlob)
  } else if (input.source.previewUrl || input.source.videoPosterUrl) {
    blobUrlMap.set(cloned.id, {
      previewUrl: input.source.previewUrl,
      videoPosterUrl: input.source.videoPosterUrl,
    })
  }

  lesson.materialFiles = [cloned, ...lesson.materialFiles]
  writeBucket(input.ctx.orgId, input.ctx.scenario, bucket)
  notify()
  return cloned
}

/* ---------------- 跨表面定位（子 CUI 资料卡 → store） ---------------- */

/** 通过 lessonKey 反查"它属于哪个课程的哪个课次" */
export function findCourseAndLessonByLessonKey(
  ctx: SpaceContext,
  lessonKey: string,
): { course: CourseRecord; lesson: CourseLessonFolder } | null {
  const bucket = ensureSeeded(ctx.orgId, ctx.scenario)
  for (const course of Object.values(bucket.courses)) {
    const lesson = course.lessons.find((l) => l.lessonKey === lessonKey)
    if (lesson) return { course, lesson }
  }
  return null
}

/* ---------------- 统计 ---------------- */

export interface CourseStats {
  totalCourses: number
  totalFiles: number
  unparsedOutlineCount: number
}

export function getSpaceStats(ctx: SpaceContext): CourseStats {
  const courses = listCourses(ctx)
  let totalFiles = 0
  let unparsedOutlineCount = 0
  for (const c of courses) {
    totalFiles += c.rootFiles.length
    for (const l of c.lessons) totalFiles += l.files.length
    if (c.outline && !c.outline.parsed) unparsedOutlineCount += 1
  }
  return {
    totalCourses: courses.length,
    totalFiles,
    unparsedOutlineCount,
  }
}

/* ---------------- 工具：根据扩展名 + 文件大小，构造 WeDiskFile ---------------- */

export function buildWeDiskFileFromBrowserFile(input: {
  file: File
  uploaderName: string
  /**
   * 上传者身份字段（缺省按当前演示规则兜底为「我（老师）」）：
   * - `uploaderId`：用于可见性过滤 / 删除自有判定。缺省 `currentUser.id` = `"me"`。
   * - `uploaderRole`：缺省 `"teacher"`；其它角色由调用方根据场景决定。
   */
  uploaderId?: string
  uploaderRole?: WeDiskUploaderRole
}): { file: WeDiskFile; previewUrl?: string } {
  const id = `wf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const type = inferLessonMaterialFileType(input.file.name)
  const sizeText = formatBytesShort(input.file.size)
  const previewUrl =
    type === "image" || type === "video" || type === "audio"
      ? URL.createObjectURL(input.file)
      : undefined
  return {
    file: {
      id,
      name: input.file.name,
      type,
      sizeText,
      uploadedAt: nowLabel(),
      uploaderName: input.uploaderName,
      uploaderId: input.uploaderId ?? "me",
      uploaderRole: input.uploaderRole ?? "teacher",
      previewUrl,
    },
    previewUrl,
  }
}

/* ============================================================
 * 资料可见性
 * ----------------------------------------------------
 * - 老师视角：仅能看到「公共（admin/system）」+「本人上传」的文件，
 *   其他老师的私人上传不可见。
 * - 学生 / 家长视角：能看到所有公共内容 + 老师上传给班级的内容 + 自己上传的内容。
 *   （演示阶段：学生/家长可见 = `admin | system | teacher | 自己`，
 *   不会看到「另一个家长 / 另一个学生」上传的私人文件。）
 * - 管理员视角：全部可见。
 * - 旧数据兼容：`uploaderRole` 缺失视为 `admin`（公共）。
 *
 * 该函数是纯函数，便于在 UI 端 `.filter()` 直接使用。
 * ============================================================ */
export function isFileVisibleToViewer(
  file: WeDiskFile,
  viewer: { id: string; role: WeDiskUploaderRole },
): boolean {
  const role = file.uploaderRole ?? "admin"
  if (role === "admin" || role === "system") return true
  if (file.uploaderId && file.uploaderId === viewer.id) return true
  if (viewer.role === "admin") return true
  if (viewer.role === "teacher") {
    /** 其它老师 / 学生 / 家长上传的私人文件，老师都不应看到 */
    return false
  }
  if (viewer.role === "student" || viewer.role === "parent") {
    /** 学生/家长能看到老师给班级提供的资料；自己的私人文件已在上方分支命中 */
    return role === "teacher"
  }
  return false
}

function formatBytesShort(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

/* ============================================================
 * 把 store 里的 CourseRecord 合成成 AiClassroomLessonSeries
 *
 * 用途：用户从「课程履约」点新创建课程的行 →
 * `findLessonSeries(seriesId)` 在 DEMO_SERIES_LIST 找不到对应静态系列，
 * 这时父级用本函数从 store 派生一份"类系列"数据驱动 AiClassroomSeriesSideConversationPanel，
 * 让新课程也能进系列子 CUI 看课次列表 / 资料卡 / 调课 / 请假 等能力。
 *
 * 派生规则
 * ----------------------------------------------------
 * - id = `synth-${course.id}`
 * - outlines.length = max(course.sessionCount, course.lessons.length, finalizedOccCount)
 * - outline.scheduleLabel：优先用 lessons[i].scheduleLabel（finalize 已写入）
 * - outline.staticStatus：occurrence.startAt < now → past；否则 upcoming
 * - outline.boundLessonId = course.lessons[i].lessonKey（让资料卡能 findCourseAndLessonByLessonKey 寻址）
 * - completedLessons / nextLessonOutlineIndex / periodLabel 都按 occurrences 时间戳推算
 * - briefSubtitleByRole / openingSubtitleByRole 给 3 个角色统一占位文案，避免 panel 报错
 * ============================================================ */

export function buildSeriesFromCourse(
  course: CourseRecord,
): AiClassroomLessonSeries | null {
  /** 收集所有 finalized 排课表的 occurrences，按时间排序 */
  const allOccs: { startAt: number; teacherName?: string }[] = []
  for (const s of course.schedules) {
    if (!s.finalized) continue
    for (const o of s.occurrences) {
      allOccs.push({ startAt: o.startAt, teacherName: s.teacherName })
    }
  }
  allOccs.sort((a, b) => a.startAt - b.startAt)

  const totalLessons = Math.max(
    course.sessionCount || 0,
    course.lessons.length,
    allOccs.length,
  )
  if (totalLessons === 0) return null

  const now = Date.now()
  const outlines = []
  let completedCount = 0
  let nextLessonOutlineIndex: number | null = null
  for (let i = 0; i < totalLessons; i++) {
    const lesson = course.lessons[i]
    const occ = allOccs[i]
    const idx = i + 1
    const startAt = occ?.startAt
    const startDate = startAt != null ? new Date(startAt) : null
    const isPast = startAt != null ? startAt < now : false
    if (isPast) completedCount += 1
    if (!isPast && nextLessonOutlineIndex == null) nextLessonOutlineIndex = idx

    const fmtScheduleLabel = startDate
      ? `${startDate.getMonth() + 1}/${pad2Num(startDate.getDate())} ${
          ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][startDate.getDay()]
        } ${pad2Num(startDate.getHours())}:${pad2Num(startDate.getMinutes())}`
      : `第 ${idx} 节`
    const fmtScheduledAt = startDate
      ? `${startDate.getFullYear()}-${pad2Num(startDate.getMonth() + 1)}-${pad2Num(
          startDate.getDate(),
        )} ${pad2Num(startDate.getHours())}:${pad2Num(startDate.getMinutes())}`
      : ""

    outlines.push({
      index: idx,
      title: lesson?.title ?? `第 ${idx} 节 · 待补充标题`,
      scheduleLabel: lesson?.scheduleLabel ?? fmtScheduleLabel,
      scheduledAt: fmtScheduledAt,
      boundLessonId: lesson?.lessonKey ?? null,
      staticStatus: (isPast ? "past" : "upcoming") as "past" | "upcoming",
    })
  }

  /** 教师 / period / 教室 / 副标 派生 */
  const teacher = allOccs.find((o) => o.teacherName)?.teacherName
    ?? course.schedules.find((s) => s.teacherName)?.teacherName
    ?? "—"
  const periodLabel = (() => {
    const first = allOccs[0]?.startAt
    const last = allOccs[allOccs.length - 1]?.startAt
    if (!first) return ""
    const fmt = (ts: number) => {
      const d = new Date(ts)
      return `${d.getFullYear()}.${pad2Num(d.getMonth() + 1)}.${pad2Num(d.getDate())}`
    }
    return last && last !== first ? `${fmt(first)} - ${fmt(last)}` : fmt(first)
  })()
  const classroom =
    course.deliveryMode === "online"
      ? "线上互动教室"
      : course.deliveryMode === "offline"
        ? "线下教室"
        : "线上 + 线下"

  const subtitle = `${teacher} · 共 ${totalLessons} 节`
  const opening = `这是《${course.name}》的系列子 CUI。已排 ${allOccs.length} / ${totalLessons} 节，可在抽屉切到任意一节。`

  return {
    id: `synth-${course.id}`,
    name: course.name,
    subject: course.subject,
    teacher,
    className: course.stage,
    classroom,
    periodLabel,
    totalLessons,
    completedLessons: completedCount,
    staticStatus: "ongoing",
    nextLessonOutlineIndex,
    outlines,
    briefSubtitleByRole: {
      teacher: subtitle,
      student: subtitle,
      parent: subtitle,
    },
    openingSubtitleByRole: {
      teacher: opening,
      student: opening,
      parent: opening,
    },
  }
}

function pad2Num(n: number): string {
  return String(n).padStart(2, "0")
}

/**
 * 课程履约 / 周日历的「行点击」反向定位：
 *
 * 给定一个 seriesId（含 demo seeded 的 `series-...` 与新课程合成的 `synth-course-...`），
 * 反查 store 里对应的 CourseRecord；找不到返回 null。
 *
 * 逻辑：
 *   1. seriesId 形如 `synth-course-...` → 直接去掉 `synth-` 前缀就是 course.id
 *   2. seriesId 形如 `series-...`（demo seeded）→ course.id = `course-${seriesId}`
 */
export function findCourseBySeriesId(
  ctx: SpaceContext,
  seriesId: string,
): CourseRecord | null {
  if (seriesId.startsWith("synth-")) {
    const courseId = seriesId.slice("synth-".length)
    return getCourse(ctx, courseId)
  }
  return getCourse(ctx, `course-${seriesId}`)
}

