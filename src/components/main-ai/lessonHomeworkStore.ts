/**
 * 作业闭环 · 持久化 store
 *
 * 与 lessonReviewStore / lessonOperationStore 同层；用 sessionStorage 跨身份共享。
 *
 * 关键设计（与 PRD-作业闭环-子CUI详细方案.md v1.1 对齐）
 * --------------------------------------------------
 * - 一节课多份作业：state 按 lessonId 索引，每份 LessonHomework 独立持久化；
 * - `stage` 强绑课次实时状态（创建时由调用方 `getEffectiveStage` 提供并锁定）；
 * - 个性化作业 = A/B/C 三档分层（layeredVersions），非"每人一套"；
 * - 派发策略固定 = "split"：学生收题面 / 家长收完整辅导包；
 * - 学生作答 = 草稿态；点"一键批改" → submitAndAutoGrade（客观题指纹比对 + 主观题 mock 评分）；
 * - 老师确认 = teacherFinal 写入；多档置信度由 autoReview.overallConfidence 决定是否进待复核。
 *
 * 跨身份共享 demo 行为：与 lessonReviewStore 同款 reload 清零策略——
 *   `performance.getEntriesByType("navigation")[0].type === "reload"` 时 sessionStorage 清空，
 *   切换角色的 location.assign 仍属 navigate，能看到刚才老师那边创建的作业。
 */

import * as React from "react"
import {
  compareObjectiveAnswer,
  DEMO_HOMEWORK_STUDENTS,
  DEMO_SELF_STUDENT_ID,
  mockGenerateQuestions,
  mockGradeSubjectiveAnswer,
  mockRegenerateQuestion,
  type GenerateQuestionsInput,
} from "./lessonHomeworkDemo"
import { EDU_IM_PRESETS } from "./eduImBus"

/* ============================================================
 * 类型
 * ============================================================ */

export type HomeworkStage = "pre" | "in" | "post"
export type HomeworkDifficulty = "easy" | "medium" | "hard"
export type HomeworkMode = "uniform" | "personalized-abc"
export type HomeworkLayer = "A" | "B" | "C"
export type HomeworkQuestionType = "single" | "multi" | "judge" | "short" | "essay"
export type HomeworkKpSource = "outline" | "ai-parse" | "manual"

export interface HomeworkKnowledgePoint {
  id?: string
  label: string
  source: HomeworkKpSource
}

export interface HomeworkQuestion {
  id: string
  type: HomeworkQuestionType
  prompt: string
  options?: string[]
  correctAnswer: string | string[]
  analysis: string
  knowledgePointLabel: string
  source: "ai" | "manual" | "ai-edited"
}

export interface HomeworkQuestionTypeConfig {
  type: HomeworkQuestionType
  count: number
}

export type HomeworkSubmissionStatus =
  | "not-started"
  | "in-progress"
  | "submitted"
  | "teacher-confirmed"
  | "appealed"
  | "returned"

export interface HomeworkAutoReview {
  score: number
  perQuestion: Record<
    string,
    { correct: boolean; confidence: number; comment?: string }
  >
  /** 主观题部分的最低置信度；客观题全对时为 1.0 */
  overallConfidence: number
  suspectAnomaly?: "fast-submit" | "answer-similar" | "matches-parent-material"
  batchedAt: number
}

export interface HomeworkTeacherFinal {
  score: number
  perQuestion?: Record<string, { correct: boolean }>
  comment?: string
  confirmedAt: number
}

export interface HomeworkAppeal {
  questionId?: string
  reason: string
  submittedAt: number
  resolvedAt?: number
  resolution?: "upheld" | "rejected"
  teacherReply?: string
}

export interface HomeworkSubmission {
  studentId: string
  studentName: string
  layer?: HomeworkLayer
  answers: Record<string, string | string[]>
  draftSavedAt?: number
  submittedAt?: number
  /** AI / 系统的自动批改结果 */
  autoReview?: HomeworkAutoReview
  teacherFinal?: HomeworkTeacherFinal
  appeal?: HomeworkAppeal
}

export interface HomeworkLayeredBucket {
  questions: HomeworkQuestion[]
  studentIds: string[]
}

export interface LessonHomework {
  id: string
  refNo: number
  lessonId: string

  title: string
  courseName: string
  subject: string
  grade: string
  teacherName: string

  stage: HomeworkStage
  difficulty: HomeworkDifficulty
  mode: HomeworkMode
  /** 派发学员（默认整班 active 学员）*/
  targetStudentIds: string[]
  knowledgePoints: HomeworkKnowledgePoint[]
  questionTypeConfig: HomeworkQuestionTypeConfig[]

  /** uniform 模式存这里 */
  questions?: HomeworkQuestion[]
  /** personalized-abc 模式存这里 */
  layeredVersions?: Record<HomeworkLayer, HomeworkLayeredBucket>

  /** v1.1 固定 = "split"：学生只看题，家长看完整辅导包 */
  dispatchPolicy: "split"
  requirementText: string
  /** 模拟生成的 PDF 大小标签（"1.34 MB" 等） */
  pdfSize: string
  /** 模拟 PDF 文件名 */
  pdfFileName: string

  createdAt: number
  publishedAt?: number
  withdrawnAt?: number
  deadlineAt?: number
  /** 答案及解析是否打包随作业一起发给学生（v1.1 固定 = false；保留字段供未来扩展） */
  showAnswersToStudent: false

  submissions: HomeworkSubmission[]
}

export interface LessonHomeworkSnapshot {
  lessonId: string
  homeworks: LessonHomework[]
}

interface PersistedState {
  /** 机构粒度的作业编号 counter（refNo） */
  refNoCounter: number
  lessons: Record<string, { homeworks: LessonHomework[] }>
}

/* ============================================================
 * 持久化基建
 * ============================================================ */

const STORAGE_KEY = "vvai_lesson_homework_store_v1"
const CHANGE_EVENT = "vvai-lesson-homework-store"
const REFNO_BASE = 12300

function isBrowser(): boolean {
  return typeof window !== "undefined"
}

function clearStoreOnReload() {
  if (!isBrowser()) return
  try {
    const entries = performance.getEntriesByType(
      "navigation",
    ) as PerformanceNavigationTiming[]
    if (entries[0]?.type === "reload") {
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
  if (!isBrowser()) return { refNoCounter: REFNO_BASE, lessons: {} }
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return { refNoCounter: REFNO_BASE, lessons: {} }
    const parsed = JSON.parse(raw) as PersistedState
    if (!parsed || typeof parsed !== "object" || !parsed.lessons) {
      return { refNoCounter: REFNO_BASE, lessons: {} }
    }
    if (typeof parsed.refNoCounter !== "number") {
      parsed.refNoCounter = REFNO_BASE
    }
    return parsed
  } catch {
    return { refNoCounter: REFNO_BASE, lessons: {} }
  }
}

function saveRawState(next: PersistedState) {
  if (!isBrowser()) return
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* noop */
  }
}

function ensureLesson(state: PersistedState, lessonId: string) {
  if (!state.lessons[lessonId]) {
    state.lessons[lessonId] = { homeworks: [] }
  }
  return state.lessons[lessonId]
}

function mutate(updater: (state: PersistedState) => void) {
  const state = loadRawState()
  updater(state)
  saveRawState(state)
  emitChange()
}

/* ============================================================
 * Snapshot 读取
 * ============================================================ */

export function getLessonHomeworkSnapshot(
  lessonId: string,
): LessonHomeworkSnapshot {
  const state = loadRawState()
  const list = state.lessons[lessonId]?.homeworks ?? []
  return {
    lessonId,
    /** 倒序：最近发布的在最上面 */
    homeworks: [...list].sort((a, b) => b.createdAt - a.createdAt),
  }
}

export function getHomework(homeworkId: string): LessonHomework | null {
  const state = loadRawState()
  for (const bucket of Object.values(state.lessons)) {
    const hit = bucket.homeworks.find((h) => h.id === homeworkId)
    if (hit) return hit
  }
  return null
}

/* ============================================================
 * 创建 / 草稿
 * ============================================================ */

export interface CreateHomeworkDraftInput {
  lessonId: string
  title: string
  courseName: string
  subject: string
  grade: string
  teacherName: string
  stage: HomeworkStage
  difficulty: HomeworkDifficulty
  mode: HomeworkMode
  targetStudentIds: string[]
  knowledgePoints: HomeworkKnowledgePoint[]
  questionTypeConfig: HomeworkQuestionTypeConfig[]
}

export function createHomeworkDraft(input: CreateHomeworkDraftInput): LessonHomework {
  const now = Date.now()
  let created!: LessonHomework
  mutate((state) => {
    state.refNoCounter += 1
    const refNo = state.refNoCounter
    /** 标题：默认 "MMDD 课程名作业"；老师可在表单内手改后再带过来 */
    const datePart = new Date(now)
    const md = `${String(datePart.getMonth() + 1).padStart(2, "0")}${String(datePart.getDate()).padStart(2, "0")}`
    const title = input.title.trim() || `${md} ${input.courseName}作业`
    /** PDF 大小 / 文件名 mock（真实环境由 PDF 服务产出） */
    const pdfFileName = `${title}.pdf`
    const pdfSize = "1.34 MB"
    /** 默认截止：课后 = 次日早 8:00；课前 = 当节开课前 1h；课中 = 当节下课时（demo 简化用 +1h） */
    const deadlineAt = (() => {
      if (input.stage === "post") {
        const d = new Date(now)
        d.setDate(d.getDate() + 1)
        d.setHours(8, 0, 0, 0)
        return d.getTime()
      }
      if (input.stage === "pre") return now + 60 * 60 * 1000
      return now + 60 * 60 * 1000
    })()

    /** 默认作答 = 草稿态，每位 target 学员准备一个空 submission */
    const submissions: HomeworkSubmission[] = input.targetStudentIds.map((sid) => {
      const meta = DEMO_HOMEWORK_STUDENTS.find((s) => s.id === sid)
      return {
        studentId: sid,
        studentName: meta?.name ?? sid,
        layer:
          input.mode === "personalized-abc"
            ? meta?.defaultLayer ?? "B"
            : undefined,
        answers: {},
      }
    })

    created = {
      id: `hw-${now}-${Math.floor(Math.random() * 10000)}`,
      refNo,
      lessonId: input.lessonId,
      title,
      courseName: input.courseName,
      subject: input.subject,
      grade: input.grade,
      teacherName: input.teacherName,
      stage: input.stage,
      difficulty: input.difficulty,
      mode: input.mode,
      targetStudentIds: input.targetStudentIds,
      knowledgePoints: input.knowledgePoints,
      questionTypeConfig: input.questionTypeConfig,
      dispatchPolicy: "split",
      requirementText:
        "请独立完成下列习题，作答时须书写工整、步骤清晰。",
      pdfSize,
      pdfFileName,
      createdAt: now,
      showAnswersToStudent: false,
      submissions,
    }
    const lesson = ensureLesson(state, input.lessonId)
    lesson.homeworks.push(created)
  })
  return created
}

function updateHomework(
  homeworkId: string,
  patcher: (hw: LessonHomework) => LessonHomework,
) {
  mutate((state) => {
    for (const bucket of Object.values(state.lessons)) {
      const idx = bucket.homeworks.findIndex((h) => h.id === homeworkId)
      if (idx < 0) continue
      const cur = bucket.homeworks[idx]
      bucket.homeworks[idx] = patcher(cur)
      return
    }
  })
}

export function updateHomeworkDraft(
  homeworkId: string,
  patch: Partial<
    Pick<
      LessonHomework,
      | "title"
      | "stage"
      | "difficulty"
      | "mode"
      | "targetStudentIds"
      | "knowledgePoints"
      | "questionTypeConfig"
      | "requirementText"
    >
  >,
) {
  updateHomework(homeworkId, (hw) => {
    const next = { ...hw, ...patch }
    /** mode 切换或 target 变化时，重置 submissions 与 layeredVersions 的派发结构 */
    if (patch.targetStudentIds || patch.mode) {
      const targetIds = patch.targetStudentIds ?? hw.targetStudentIds
      const mode = patch.mode ?? hw.mode
      next.targetStudentIds = targetIds
      next.mode = mode
      next.submissions = targetIds.map((sid) => {
        const prev = hw.submissions.find((s) => s.studentId === sid)
        const meta = DEMO_HOMEWORK_STUDENTS.find((s) => s.id === sid)
        return {
          studentId: sid,
          studentName: meta?.name ?? sid,
          layer:
            mode === "personalized-abc"
              ? prev?.layer ?? meta?.defaultLayer ?? "B"
              : undefined,
          answers: prev?.answers ?? {},
          draftSavedAt: prev?.draftSavedAt,
          submittedAt: prev?.submittedAt,
          autoReview: prev?.autoReview,
          teacherFinal: prev?.teacherFinal,
          appeal: prev?.appeal,
        }
      })
      /** 模式变化时清掉旧题，避免脏数据 */
      if (patch.mode) {
        if (mode === "uniform") {
          delete next.layeredVersions
        } else {
          next.questions = undefined
        }
      }
    }
    return next
  })
}

export function deleteHomework(homeworkId: string) {
  mutate((state) => {
    for (const bucket of Object.values(state.lessons)) {
      const idx = bucket.homeworks.findIndex((h) => h.id === homeworkId)
      if (idx >= 0) {
        bucket.homeworks.splice(idx, 1)
        return
      }
    }
  })
}

/* ============================================================
 * 学员档位调整（个性化 A/B/C）
 * ============================================================ */

export function moveStudentToLayer(
  homeworkId: string,
  studentId: string,
  toLayer: HomeworkLayer,
) {
  updateHomework(homeworkId, (hw) => {
    if (hw.mode !== "personalized-abc") return hw
    const submissions = hw.submissions.map((s) =>
      s.studentId === studentId ? { ...s, layer: toLayer } : s,
    )
    /** 同步 layeredVersions 的 studentIds（如果已生成） */
    let layered = hw.layeredVersions
    if (layered) {
      const next: Record<HomeworkLayer, HomeworkLayeredBucket> = {
        A: { ...layered.A, studentIds: layered.A.studentIds.filter((id) => id !== studentId) },
        B: { ...layered.B, studentIds: layered.B.studentIds.filter((id) => id !== studentId) },
        C: { ...layered.C, studentIds: layered.C.studentIds.filter((id) => id !== studentId) },
      }
      next[toLayer].studentIds = [...next[toLayer].studentIds, studentId]
      layered = next
    }
    return { ...hw, submissions, layeredVersions: layered }
  })
}

/* ============================================================
 * 题目 · AI 生成 / 重生 / 删除 / 添加
 * ============================================================ */

export function generateHomeworkQuestions(homeworkId: string) {
  updateHomework(homeworkId, (hw) => {
    const kpLabels = hw.knowledgePoints.map((kp) => kp.label)
    const baseInput: Omit<GenerateQuestionsInput, "layerHint"> = {
      subject: hw.subject,
      grade: hw.grade,
      difficulty: hw.difficulty,
      knowledgePointLabels: kpLabels.length > 0 ? kpLabels : ["本节核心"],
      questionTypeConfig: hw.questionTypeConfig,
    }
    if (hw.mode === "uniform") {
      const questions = mockGenerateQuestions(baseInput)
      return { ...hw, questions, layeredVersions: undefined }
    }
    /** personalized-abc：三档独立生成；学员按 submissions.layer 分配 */
    const groupBy = (layer: HomeworkLayer): string[] =>
      hw.submissions.filter((s) => s.layer === layer).map((s) => s.studentId)
    const layered: Record<HomeworkLayer, HomeworkLayeredBucket> = {
      A: {
        questions: mockGenerateQuestions({ ...baseInput, layerHint: "A" }),
        studentIds: groupBy("A"),
      },
      B: {
        questions: mockGenerateQuestions({ ...baseInput, layerHint: "B" }),
        studentIds: groupBy("B"),
      },
      C: {
        questions: mockGenerateQuestions({ ...baseInput, layerHint: "C" }),
        studentIds: groupBy("C"),
      },
    }
    return { ...hw, layeredVersions: layered, questions: undefined }
  })
}

export function regenerateQuestion(
  homeworkId: string,
  questionId: string,
  layer?: HomeworkLayer,
) {
  updateHomework(homeworkId, (hw) => {
    if (hw.mode === "uniform" && hw.questions) {
      return {
        ...hw,
        questions: hw.questions.map((q) =>
          q.id === questionId ? mockRegenerateQuestion(q, hw.subject) : q,
        ),
      }
    }
    if (hw.mode === "personalized-abc" && hw.layeredVersions && layer) {
      const bucket = hw.layeredVersions[layer]
      return {
        ...hw,
        layeredVersions: {
          ...hw.layeredVersions,
          [layer]: {
            ...bucket,
            questions: bucket.questions.map((q) =>
              q.id === questionId ? mockRegenerateQuestion(q, hw.subject) : q,
            ),
          },
        },
      }
    }
    return hw
  })
}

export function removeQuestion(
  homeworkId: string,
  questionId: string,
  layer?: HomeworkLayer,
) {
  updateHomework(homeworkId, (hw) => {
    if (hw.mode === "uniform" && hw.questions) {
      const next = hw.questions.filter((q) => q.id !== questionId)
      /** PRD: 至少保留 1 题 */
      if (next.length === 0) return hw
      return { ...hw, questions: next }
    }
    if (hw.mode === "personalized-abc" && hw.layeredVersions && layer) {
      const bucket = hw.layeredVersions[layer]
      const next = bucket.questions.filter((q) => q.id !== questionId)
      if (next.length === 0) return hw
      return {
        ...hw,
        layeredVersions: {
          ...hw.layeredVersions,
          [layer]: { ...bucket, questions: next },
        },
      }
    }
    return hw
  })
}

export function addManualQuestion(
  homeworkId: string,
  question: Omit<HomeworkQuestion, "id" | "source"> & {
    source?: HomeworkQuestion["source"]
  },
  layer?: HomeworkLayer,
) {
  updateHomework(homeworkId, (hw) => {
    const newQ: HomeworkQuestion = {
      ...question,
      id: `hwq-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      source: question.source ?? "manual",
    }
    if (hw.mode === "uniform") {
      return { ...hw, questions: [...(hw.questions ?? []), newQ] }
    }
    if (hw.mode === "personalized-abc" && hw.layeredVersions && layer) {
      const bucket = hw.layeredVersions[layer]
      return {
        ...hw,
        layeredVersions: {
          ...hw.layeredVersions,
          [layer]: { ...bucket, questions: [...bucket.questions, newQ] },
        },
      }
    }
    return hw
  })
}

export function addAiGeneratedQuestions(
  homeworkId: string,
  input: {
    type: HomeworkQuestionType
    count: number
    knowledgePointLabels: string[]
  },
  layer?: HomeworkLayer,
) {
  updateHomework(homeworkId, (hw) => {
    const generated = mockGenerateQuestions({
      subject: hw.subject,
      grade: hw.grade,
      difficulty: hw.difficulty,
      knowledgePointLabels:
        input.knowledgePointLabels.length > 0
          ? input.knowledgePointLabels
          : hw.knowledgePoints.map((kp) => kp.label),
      questionTypeConfig: [{ type: input.type, count: input.count }],
      layerHint: layer,
    })
    if (hw.mode === "uniform") {
      return { ...hw, questions: [...(hw.questions ?? []), ...generated] }
    }
    if (hw.mode === "personalized-abc" && hw.layeredVersions && layer) {
      const bucket = hw.layeredVersions[layer]
      return {
        ...hw,
        layeredVersions: {
          ...hw.layeredVersions,
          [layer]: { ...bucket, questions: [...bucket.questions, ...generated] },
        },
      }
    }
    return hw
  })
}

/* ============================================================
 * 发布 / 撤回
 * ============================================================ */

export function publishHomework(homeworkId: string) {
  let title = ""
  let deadlineLabel: string | undefined
  updateHomework(homeworkId, (hw) => {
    title = hw.title
    if (hw.deadlineAt) {
      const d = new Date(hw.deadlineAt)
      deadlineLabel = `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
    }
    return {
      ...hw,
      publishedAt: Date.now(),
      withdrawnAt: undefined,
    }
  })
  /**
   * 发布即触发"三方派发"通知：
   * - 学生：仅收题面
   * - 家长：题面 + 答案 + 解析（家庭辅导用）
   *
   * IM 写入由 demo 总线在 sessionStorage 落盘，跨身份切换可见。
   */
  if (title) {
    try {
      EDU_IM_PRESETS.homeworkAssignedToStudent({ title, deadlineLabel })
      EDU_IM_PRESETS.homeworkAssignedToParent({ title, deadlineLabel })
    } catch {
      /** demo 环境下 IM bus 异常不应阻塞发布动作 */
    }
  }
}

export function withdrawHomework(homeworkId: string) {
  updateHomework(homeworkId, (hw) => ({
    ...hw,
    /** 撤回后回到草稿组：列表中仍展示，但学生 / 家长 / 批改 Tab 不再视作已发布作业。 */
    publishedAt: undefined,
    withdrawnAt: Date.now(),
  }))
}

/* ============================================================
 * 学生作答 · 草稿 / 一键批改 / 申诉
 * ============================================================ */

export function saveStudentDraft(
  homeworkId: string,
  studentId: string,
  answers: Record<string, string | string[]>,
) {
  updateHomework(homeworkId, (hw) => ({
    ...hw,
    submissions: hw.submissions.map((s) =>
      s.studentId === studentId
        ? { ...s, answers, draftSavedAt: Date.now() }
        : s,
    ),
  }))
}

/**
 * 一键批改 = 提交 + 自动批改。
 *
 * - 客观题：指纹比对（compareObjectiveAnswer）
 * - 主观题：mock 评分（mockGradeSubjectiveAnswer），结合"家长辅导材料雷同"异常检测
 * - 整份置信度 = 主观题部分的最低 confidence；若全客观题，置信度为 1.0
 */
export function submitAndAutoGrade(
  homeworkId: string,
  studentId: string,
): HomeworkAutoReview | null {
  let result: HomeworkAutoReview | null = null
  updateHomework(homeworkId, (hw) => {
    const submission = hw.submissions.find((s) => s.studentId === studentId)
    if (!submission) return hw
    /** 找到该生应做的题（按 mode 决定） */
    const questions = ((): HomeworkQuestion[] => {
      if (hw.mode === "uniform") return hw.questions ?? []
      const layer = submission.layer ?? "B"
      return hw.layeredVersions?.[layer].questions ?? []
    })()
    if (questions.length === 0) return hw

    const now = Date.now()
    const perQuestion: HomeworkAutoReview["perQuestion"] = {}
    let totalScore = 0
    let weight = 0
    let minSubjectiveConfidence = 1
    let suspectMatchesParent = false
    for (const q of questions) {
      const ans = submission.answers[q.id]
      if (q.type === "single" || q.type === "judge" || q.type === "multi") {
        const correct = compareObjectiveAnswer(q, ans)
        perQuestion[q.id] = { correct, confidence: 1 }
        totalScore += correct ? 1 : 0
        weight += 1
      } else {
        const subj = mockGradeSubjectiveAnswer(q, ans)
        perQuestion[q.id] = {
          correct: subj.correct,
          confidence: subj.confidence,
        }
        totalScore += subj.score
        weight += 1
        minSubjectiveConfidence = Math.min(minSubjectiveConfidence, subj.confidence)
        if (subj.suspectMatchesParentMaterial) {
          suspectMatchesParent = true
        }
      }
    }
    /** 异常：用时过短 */
    let suspectAnomaly: HomeworkAutoReview["suspectAnomaly"] | undefined
    if (suspectMatchesParent) suspectAnomaly = "matches-parent-material"
    if (!suspectAnomaly && submission.draftSavedAt) {
      const elapsed = now - submission.draftSavedAt
      if (elapsed < 30 * 1000) suspectAnomaly = "fast-submit"
    }
    const autoReview: HomeworkAutoReview = {
      score: Math.round((totalScore / Math.max(weight, 1)) * 100),
      perQuestion,
      overallConfidence: minSubjectiveConfidence,
      suspectAnomaly,
      batchedAt: now,
    }
    result = autoReview
    /** push IM 通知（学生→老师；如有异常并行 push 反作弊条） */
    try {
      EDU_IM_PRESETS.homeworkSubmittedToTeacher({
        title: hw.title,
        studentName: submission.studentName,
        score: autoReview.score,
      })
      EDU_IM_PRESETS.homeworkResultToStudent({
        title: hw.title,
        score: autoReview.score,
      })
      if (autoReview.suspectAnomaly) {
        EDU_IM_PRESETS.homeworkAnomalyToTeacher({
          title: hw.title,
          studentName: submission.studentName,
          reason:
            autoReview.suspectAnomaly === "fast-submit"
              ? "提交用时过短"
              : autoReview.suspectAnomaly === "matches-parent-material"
                ? "答案与家长辅导材料雷同"
                : "答案高度雷同",
        })
      }
    } catch {
      /* noop */
    }
    return {
      ...hw,
      submissions: hw.submissions.map((s) =>
        s.studentId === studentId
          ? { ...s, submittedAt: now, autoReview }
          : s,
      ),
    }
  })
  return result
}

export function submitAppeal(
  homeworkId: string,
  studentId: string,
  reason: string,
  questionId?: string,
) {
  if (!reason.trim()) return
  let title = ""
  let studentName = ""
  updateHomework(homeworkId, (hw) => {
    title = hw.title
    studentName = hw.submissions.find((s) => s.studentId === studentId)?.studentName ?? ""
    return {
      ...hw,
      submissions: hw.submissions.map((s) =>
        s.studentId === studentId
          ? {
              ...s,
              appeal: {
                questionId,
                reason: reason.trim(),
                submittedAt: Date.now(),
              },
            }
          : s,
      ),
    }
  })
  if (title && studentName) {
    try {
      EDU_IM_PRESETS.homeworkAppealToTeacher({
        title,
        studentName,
        reason: reason.trim(),
      })
    } catch {
      /* noop */
    }
  }
}

export function resolveAppeal(
  homeworkId: string,
  studentId: string,
  resolution: "upheld" | "rejected",
  teacherReply: string,
) {
  updateHomework(homeworkId, (hw) => ({
    ...hw,
    submissions: hw.submissions.map((s) => {
      if (s.studentId !== studentId || !s.appeal) return s
      return {
        ...s,
        appeal: {
          ...s.appeal,
          resolution,
          resolvedAt: Date.now(),
          teacherReply: teacherReply.trim() || undefined,
        },
        /** 接受申诉 = 把对应题改判为对，整体分按"对的题数 / 总题数"重新打分 */
        autoReview:
          resolution === "upheld" && s.autoReview && s.appeal.questionId
            ? recomputeScoreAfterAppeal(s, s.appeal.questionId)
            : s.autoReview,
      }
    }),
  }))
}

function recomputeScoreAfterAppeal(
  s: HomeworkSubmission,
  questionId: string,
): HomeworkAutoReview | undefined {
  if (!s.autoReview) return undefined
  const perQuestion = {
    ...s.autoReview.perQuestion,
    [questionId]: { ...s.autoReview.perQuestion[questionId], correct: true },
  }
  const total = Object.keys(perQuestion).length
  const correctCount = Object.values(perQuestion).filter((p) => p.correct).length
  return {
    ...s.autoReview,
    perQuestion,
    score: Math.round((correctCount / Math.max(total, 1)) * 100),
  }
}

/* ============================================================
 * 老师批改 · 改分 / 一键确认
 * ============================================================ */

export function confirmTeacherFinal(
  homeworkId: string,
  studentId: string,
  patch: { score?: number; comment?: string },
) {
  updateHomework(homeworkId, (hw) => ({
    ...hw,
    submissions: hw.submissions.map((s) => {
      if (s.studentId !== studentId) return s
      const baseScore = s.autoReview?.score ?? 0
      return {
        ...s,
        teacherFinal: {
          score: patch.score ?? baseScore,
          comment: patch.comment,
          confirmedAt: Date.now(),
        },
      }
    }),
  }))
}

export function batchConfirmAll(homeworkId: string) {
  updateHomework(homeworkId, (hw) => ({
    ...hw,
    submissions: hw.submissions.map((s) => {
      if (!s.autoReview || s.teacherFinal) return s
      return {
        ...s,
        teacherFinal: {
          score: s.autoReview.score,
          confirmedAt: Date.now(),
        },
      }
    }),
  }))
}

export function returnSubmissionForRedo(homeworkId: string, studentId: string) {
  updateHomework(homeworkId, (hw) => ({
    ...hw,
    submissions: hw.submissions.map((s) => {
      if (s.studentId !== studentId) return s
      return {
        ...s,
        submittedAt: undefined,
        autoReview: undefined,
        teacherFinal: undefined,
      }
    }),
  }))
}

/* ============================================================
 * 派生：单生状态
 * ============================================================ */

export function deriveSubmissionStatus(
  hw: LessonHomework,
  submission: HomeworkSubmission,
): HomeworkSubmissionStatus {
  if (submission.teacherFinal) return "teacher-confirmed"
  if (submission.appeal && !submission.appeal.resolvedAt) return "appealed"
  if (submission.autoReview) return "submitted"
  if (Object.keys(submission.answers).length > 0) return "in-progress"
  return "not-started"
}

/** 该生应做的题（按 mode + layer） */
export function getSubmissionQuestions(
  hw: LessonHomework,
  submission: HomeworkSubmission,
): HomeworkQuestion[] {
  if (hw.mode === "uniform") return hw.questions ?? []
  const layer = submission.layer ?? "B"
  return hw.layeredVersions?.[layer].questions ?? []
}

/** 老师批改卡 · 顶部统计 */
export interface HomeworkGradingStats {
  total: number
  submitted: number
  pendingReview: number
  confirmed: number
  appealCount: number
  anomalyCount: number
  accuracy: number
}

export function deriveGradingStats(hw: LessonHomework): HomeworkGradingStats {
  let submitted = 0
  let pendingReview = 0
  let confirmed = 0
  let appealCount = 0
  let anomalyCount = 0
  let accSum = 0
  let accDen = 0
  for (const s of hw.submissions) {
    if (s.appeal && !s.appeal.resolvedAt) appealCount += 1
    if (s.autoReview) {
      submitted += 1
      if (s.autoReview.suspectAnomaly) anomalyCount += 1
      accSum += s.teacherFinal?.score ?? s.autoReview.score
      accDen += 1
      if (s.teacherFinal) {
        confirmed += 1
      } else if (
        s.autoReview.overallConfidence < 0.9 ||
        s.autoReview.suspectAnomaly
      ) {
        pendingReview += 1
      } else {
        /** 高置信 + 无异常 = 自动认为"系统自动批改"已就位，但老师未点确认前不算 confirmed */
      }
    }
  }
  return {
    total: hw.submissions.length,
    submitted,
    pendingReview,
    confirmed,
    appealCount,
    anomalyCount,
    accuracy: accDen > 0 ? Math.round(accSum / accDen) : 0,
  }
}

/* ============================================================
 * Hooks
 * ============================================================ */

export function useLessonHomeworkSnapshot(
  lessonId: string,
): LessonHomeworkSnapshot {
  const [snap, setSnap] = React.useState<LessonHomeworkSnapshot>(() =>
    getLessonHomeworkSnapshot(lessonId),
  )
  React.useEffect(() => {
    setSnap(getLessonHomeworkSnapshot(lessonId))
    if (!isBrowser()) return () => undefined
    const refresh = () => setSnap(getLessonHomeworkSnapshot(lessonId))
    window.addEventListener(CHANGE_EVENT, refresh)
    window.addEventListener("storage", refresh)
    return () => {
      window.removeEventListener(CHANGE_EVENT, refresh)
      window.removeEventListener("storage", refresh)
    }
  }, [lessonId])
  return snap
}

export function useHomework(homeworkId: string | null): LessonHomework | null {
  const [hw, setHw] = React.useState<LessonHomework | null>(() =>
    homeworkId ? getHomework(homeworkId) : null,
  )
  React.useEffect(() => {
    setHw(homeworkId ? getHomework(homeworkId) : null)
    if (!isBrowser()) return () => undefined
    const refresh = () => setHw(homeworkId ? getHomework(homeworkId) : null)
    window.addEventListener(CHANGE_EVENT, refresh)
    window.addEventListener("storage", refresh)
    return () => {
      window.removeEventListener(CHANGE_EVENT, refresh)
      window.removeEventListener("storage", refresh)
    }
  }, [homeworkId])
  return hw
}

/* ============================================================
 * 角色辅助
 * ============================================================ */

/** 学生 / 家长侧 demo 固定为林小安 */
export function getSelfStudentIdForRole(): string {
  return DEMO_SELF_STUDENT_ID
}
