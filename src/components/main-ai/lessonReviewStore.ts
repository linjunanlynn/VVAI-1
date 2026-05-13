import * as React from "react"

export type LessonReviewAssetType = "photo" | "video"
export type LessonReviewSendStatus = "draft" | "sent" | "withdrawn" | "skipped"

export interface LessonReviewAsset {
  id: string
  type: LessonReviewAssetType
  name: string
  createdAt: number
  matchedStudentNames: string[]
}

export interface LessonStudentReport {
  studentName: string
  assetIds: string[]
  sentence: string
  studentVisible: boolean
  teacherConfirmed: boolean
  confirmedAt?: number
  sendStatus: LessonReviewSendStatus
  sentAt?: number
  withdrawnAt?: number
  parentLiked?: boolean
  studentLiked?: boolean
  comments: Array<{
    id: string
    byRole: "teacher" | "parent" | "student"
    text: string
    createdAt: number
  }>
}

export interface LessonReviewSnapshot {
  lessonId: string
  lessonTitle: string
  assets: LessonReviewAsset[]
  classSummary: string
  reportsGenerated: boolean
  reports: LessonStudentReport[]
  unmatchedAssetIds: string[]
}

interface PersistedLessonReviewState {
  lessonTitle: string
  assets: LessonReviewAsset[]
  classSummary: string
  reportsGenerated: boolean
  reports: LessonStudentReport[]
  unmatchedAssetIds: string[]
}

interface PersistedState {
  lessons: Record<string, PersistedLessonReviewState>
}

const STORAGE_KEY = "vvai_lesson_review_store_v1"
const CHANGE_EVENT = "vvai-lesson-review-store"
const REVIEW_RECALL_WINDOW_MS = 24 * 60 * 60 * 1000

const DEFAULT_STUDENTS = ["林小安", "周予桐", "黄思齐", "赵欣宇", "刘一鸣", "陈可"]

function isBrowser(): boolean {
  return typeof window !== "undefined"
}

/**
 * Demo 行为：刷新页面（F5 / Cmd+R）即视为「演示归零」，
 * 但同 tab 内通过 `location.assign(...)` 切换角色（家长 ↔ 学生 ↔ 老师）
 * 属于 navigation 类型，sessionStorage 仍保留 → 跨身份能看到同一份数据。
 *
 * 区分手段：PerformanceNavigationTiming.type
 *   - "reload"   → 清掉 store，重置成默认态
 *   - "navigate" → 保留，让老师生成的数据在切到孩子 / 家长侧时可见
 *   - "back_forward" / 其它 → 保留
 */
function clearStoreOnReload() {
  if (!isBrowser()) return
  try {
    const entries = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[]
    const type = entries[0]?.type
    if (type === "reload") {
      window.sessionStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    /* noop */
  }
}

clearStoreOnReload()

function emitChange() {
  if (!isBrowser()) return
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT))
}

function loadRawState(): PersistedState {
  if (!isBrowser()) return { lessons: {} }
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return { lessons: {} }
    const parsed = JSON.parse(raw) as PersistedState
    if (!parsed || typeof parsed !== "object" || !parsed.lessons || typeof parsed.lessons !== "object") {
      return { lessons: {} }
    }
    return parsed
  } catch {
    return { lessons: {} }
  }
}

function saveRawState(next: PersistedState) {
  if (!isBrowser()) return
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // noop
  }
}

function createDefaultLessonState(): PersistedLessonReviewState {
  return {
    lessonTitle: "本节课程",
    assets: [],
    classSummary:
      "本节课完成了教学目标梳理与核心知识点训练，孩子们在互动环节参与积极。重难点集中在概念辨析与应用表达，建议课后结合老师给出的个性化建议进行复习。",
    reportsGenerated: false,
    reports: [],
    unmatchedAssetIds: [],
  }
}

function ensureLessonState(lessonId: string): PersistedLessonReviewState {
  const state = loadRawState()
  const existing = state.lessons[lessonId]
  if (existing) return existing
  const created = createDefaultLessonState()
  state.lessons[lessonId] = created
  saveRawState(state)
  return created
}

function updateLessonState(
  lessonId: string,
  updater: (prev: PersistedLessonReviewState) => PersistedLessonReviewState,
) {
  const state = loadRawState()
  const prev = state.lessons[lessonId] ?? createDefaultLessonState()
  state.lessons[lessonId] = updater(prev)
  saveRawState(state)
  emitChange()
}

function makeSentence(studentName: string): string {
  return `${studentName}本节课课堂参与积极，建议继续保持主动表达，并在课后用 10 分钟巩固本节核心知识点。`
}

function distributeAssets(assets: LessonReviewAsset[]) {
  const nextAssets = assets.map((a) => ({ ...a }))
  const reports = DEFAULT_STUDENTS.map<LessonStudentReport>((studentName) => ({
    studentName,
    assetIds: [],
    sentence: makeSentence(studentName),
    studentVisible: true,
    teacherConfirmed: false,
    sendStatus: "draft",
    parentLiked: false,
    studentLiked: false,
    comments: [],
  }))
  const unmatchedAssetIds: string[] = []

  nextAssets.forEach((asset, idx) => {
    // 每 5 张留一张未匹配，保证老师能看到“待处理”折叠条路径。
    if ((idx + 1) % 5 === 0) {
      asset.matchedStudentNames = []
      unmatchedAssetIds.push(asset.id)
      return
    }
    // 偶数给单人，奇数给双人（作为班级共同片段来源）。
    const first = DEFAULT_STUDENTS[idx % DEFAULT_STUDENTS.length]
    if (idx % 2 === 0) {
      asset.matchedStudentNames = [first]
    } else {
      const second = DEFAULT_STUDENTS[(idx + 1) % DEFAULT_STUDENTS.length]
      asset.matchedStudentNames = [first, second]
    }
    for (const name of asset.matchedStudentNames) {
      const report = reports.find((r) => r.studentName === name)
      if (!report) continue
      report.assetIds.push(asset.id)
    }
  })

  return { assets: nextAssets, reports, unmatchedAssetIds }
}

function normalizeReport(report: LessonStudentReport): LessonStudentReport {
  // 历史 sessionStorage 可能存在缺字段的旧快照（如未带 comments / parentLiked / studentLiked），统一兜底。
  return {
    ...report,
    assetIds: Array.isArray(report.assetIds) ? report.assetIds : [],
    parentLiked: Boolean(report.parentLiked),
    studentLiked: Boolean(report.studentLiked),
    comments: Array.isArray(report.comments) ? report.comments : [],
  }
}

export function getLessonReviewSnapshot(lessonId: string): LessonReviewSnapshot {
  const lesson = ensureLessonState(lessonId)
  return {
    lessonId,
    ...lesson,
    assets: Array.isArray(lesson.assets) ? lesson.assets : [],
    reports: Array.isArray(lesson.reports) ? lesson.reports.map(normalizeReport) : [],
    unmatchedAssetIds: Array.isArray(lesson.unmatchedAssetIds) ? lesson.unmatchedAssetIds : [],
  }
}

export function setLessonReviewMeta(lessonId: string, lessonTitle: string) {
  if (!lessonTitle.trim()) return
  updateLessonState(lessonId, (prev) => ({
    ...prev,
    lessonTitle,
  }))
}

export function addLessonReviewAsset(lessonId: string, type: LessonReviewAssetType) {
  updateLessonState(lessonId, (prev) => {
    const now = Date.now()
    const index = prev.assets.length + 1
    const asset: LessonReviewAsset = {
      id: `review-asset-${now}-${Math.floor(Math.random() * 1000)}`,
      type,
      name: type === "photo" ? `课堂照片 ${index}` : `课堂视频 ${index}`,
      createdAt: now,
      matchedStudentNames: [],
    }
    return {
      ...prev,
      assets: [...prev.assets, asset],
      // 新素材加入后，草稿重新回到未生成态，符合“先补素材再点 AI 生成”的流程。
      reportsGenerated: false,
      reports: [],
      unmatchedAssetIds: [],
    }
  })
}

export function removeLessonReviewAsset(lessonId: string, assetId: string) {
  updateLessonState(lessonId, (prev) => ({
    ...prev,
    assets: prev.assets.filter((a) => a.id !== assetId),
    reportsGenerated: false,
    reports: [],
    unmatchedAssetIds: [],
  }))
}

export function generateLessonReports(lessonId: string) {
  updateLessonState(lessonId, (prev) => {
    const distributed = distributeAssets(prev.assets)
    return {
      ...prev,
      reportsGenerated: true,
      assets: distributed.assets,
      reports: distributed.reports,
      unmatchedAssetIds: distributed.unmatchedAssetIds,
    }
  })
}

export function updateLessonClassSummary(lessonId: string, summary: string) {
  updateLessonState(lessonId, (prev) => ({ ...prev, classSummary: summary }))
}

export function updateLessonReportSentence(lessonId: string, studentName: string, sentence: string) {
  updateLessonState(lessonId, (prev) => ({
    ...prev,
    reports: prev.reports.map((r) =>
      r.studentName === studentName
        ? { ...r, sentence, teacherConfirmed: false, confirmedAt: undefined }
        : r,
    ),
  }))
}

export function addAssetsToLessonReport(
  lessonId: string,
  studentName: string,
  assetIds: string[],
) {
  if (assetIds.length === 0) return
  updateLessonState(lessonId, (prev) => ({
    ...prev,
    reports: prev.reports.map((r) => {
      if (r.studentName !== studentName) return r
      const next = Array.from(new Set([...r.assetIds, ...assetIds]))
      return {
        ...r,
        assetIds: next,
        teacherConfirmed: false,
        confirmedAt: undefined,
      }
    }),
  }))
}

export function removeAssetFromLessonReport(
  lessonId: string,
  studentName: string,
  assetId: string,
) {
  updateLessonState(lessonId, (prev) => ({
    ...prev,
    reports: prev.reports.map((r) => {
      if (r.studentName !== studentName) return r
      return {
        ...r,
        assetIds: r.assetIds.filter((id) => id !== assetId),
        teacherConfirmed: false,
        confirmedAt: undefined,
      }
    }),
  }))
}

export function updateLessonReportStudentVisible(
  lessonId: string,
  studentName: string,
  studentVisible: boolean,
) {
  updateLessonState(lessonId, (prev) => ({
    ...prev,
    reports: prev.reports.map((r) =>
      r.studentName === studentName
        ? { ...r, studentVisible, teacherConfirmed: false, confirmedAt: undefined }
        : r,
    ),
  }))
}

export function confirmLessonReport(lessonId: string, studentName: string) {
  updateLessonState(lessonId, (prev) => ({
    ...prev,
    reports: prev.reports.map((r) =>
      r.studentName === studentName
        ? { ...r, teacherConfirmed: true, confirmedAt: Date.now() }
        : r,
    ),
  }))
}

export function unconfirmLessonReport(lessonId: string, studentName: string) {
  updateLessonState(lessonId, (prev) => ({
    ...prev,
    reports: prev.reports.map((r) =>
      r.studentName === studentName
        ? { ...r, teacherConfirmed: false, confirmedAt: undefined }
        : r,
    ),
  }))
}

export function sendLessonReport(lessonId: string, studentName: string) {
  updateLessonState(lessonId, (prev) => ({
    ...prev,
    reports: prev.reports.map((r) =>
      r.studentName === studentName
        ? {
            ...r,
            sendStatus: "sent",
            sentAt: Date.now(),
            withdrawnAt: undefined,
            teacherConfirmed: true,
            confirmedAt: r.confirmedAt ?? Date.now(),
          }
        : r,
    ),
  }))
}

export function sendAllLessonReports(lessonId: string) {
  updateLessonState(lessonId, (prev) => ({
    ...prev,
    reports: prev.reports.map((r) =>
      r.sendStatus === "sent"
        ? r
        : {
            ...r,
            sendStatus: "sent",
            sentAt: Date.now(),
            withdrawnAt: undefined,
            teacherConfirmed: true,
            confirmedAt: r.confirmedAt ?? Date.now(),
          },
    ),
  }))
}

export function withdrawLessonReport(lessonId: string, studentName: string) {
  updateLessonState(lessonId, (prev) => ({
    ...prev,
    reports: prev.reports.map((r) =>
      r.studentName === studentName
        ? { ...r, sendStatus: "withdrawn", withdrawnAt: Date.now() }
        : r,
    ),
  }))
}

export function likeLessonReport(
  lessonId: string,
  studentName: string,
  byRole: "parent" | "student",
) {
  updateLessonState(lessonId, (prev) => ({
    ...prev,
    reports: prev.reports.map((r) => {
      if (r.studentName !== studentName) return r
      return byRole === "parent"
        ? { ...r, parentLiked: !r.parentLiked }
        : { ...r, studentLiked: !r.studentLiked }
    }),
  }))
}

export function commentLessonReport(
  lessonId: string,
  studentName: string,
  byRole: "teacher" | "parent" | "student",
  text: string,
) {
  const value = text.trim()
  if (!value) return
  updateLessonState(lessonId, (prev) => ({
    ...prev,
    reports: prev.reports.map((r) => {
      if (r.studentName !== studentName) return r
      return {
        ...r,
        comments: [
          ...r.comments,
          {
            id: `comment-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            byRole,
            text: value,
            createdAt: Date.now(),
          },
        ],
      }
    }),
  }))
}

export function listLessonsWithSentReports(): Array<{ lessonId: string; lessonTitle: string }> {
  const state = loadRawState()
  return Object.entries(state.lessons)
    .filter(([, lesson]) => lesson.reports.some((r) => r.sendStatus === "sent"))
    .map(([lessonId, lesson]) => ({ lessonId, lessonTitle: lesson.lessonTitle || "本节课程" }))
}

export function canWithdrawWithin24h(sentAt?: number): boolean {
  if (!sentAt) return false
  return Date.now() - sentAt <= REVIEW_RECALL_WINDOW_MS
}

export function getReviewRecallWindowLeftHours(sentAt?: number): number {
  if (!sentAt) return 0
  const leftMs = REVIEW_RECALL_WINDOW_MS - (Date.now() - sentAt)
  if (leftMs <= 0) return 0
  return Math.ceil(leftMs / (60 * 60 * 1000))
}

export function getSelfStudentName(role: "student" | "parent"): string {
  // demo 固定自家孩子/本人
  return "林小安"
}

export function useLessonReviewSnapshot(lessonId: string): LessonReviewSnapshot {
  const [snapshot, setSnapshot] = React.useState<LessonReviewSnapshot>(() =>
    getLessonReviewSnapshot(lessonId),
  )

  React.useEffect(() => {
    setSnapshot(getLessonReviewSnapshot(lessonId))
    if (!isBrowser()) return () => undefined
    const refresh = () => setSnapshot(getLessonReviewSnapshot(lessonId))
    window.addEventListener(CHANGE_EVENT, refresh)
    window.addEventListener("storage", refresh)
    return () => {
      window.removeEventListener(CHANGE_EVENT, refresh)
      window.removeEventListener("storage", refresh)
    }
  }, [lessonId])

  return snapshot
}
