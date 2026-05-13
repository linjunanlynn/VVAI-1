/**
 * 作业闭环 · demo 数据
 *
 * 包含
 * --------------------------------------------------
 * - DEMO_HOMEWORK_STUDENTS：演示班学员名单（与 lessonOperationStore.DEFAULT_ATTENDEES 同口径）
 * - DEMO_KNOWLEDGE_TREE：知识点二级树（按学科 + 年级；mock 一份与截图一致的"小学四年级 · 英语"）
 * - DEMO_QUESTION_BANK：按学科 + 题型的题库（AI"一键生成"时从该 bank 抽题 + 调难度文案）
 * - getDefaultHomeworkRequirement：默认作业要求文案
 *
 * 与「作业 PRD § 6.1 / § 7.1」对齐：
 * - 题型支持单选 / 多选 / 判断 / 简答 / 论述
 * - 个性化模式按 A/B/C 三档分层（不做"每人一套"）
 * - 知识点录入三入口：大纲勾选 / AI 解析附件 / 手动输入
 */

import type {
  HomeworkDifficulty,
  HomeworkLayer,
  HomeworkQuestion,
  HomeworkQuestionType,
} from "./lessonHomeworkStore"

/* ============================================================
 * 学员名单（与考勤 store 对齐）
 * ============================================================ */

export interface DemoHomeworkStudent {
  id: string
  name: string
  /** AI 自动归档的默认档位（按学情画像 mock） */
  defaultLayer: HomeworkLayer
}

export const DEMO_HOMEWORK_STUDENTS: ReadonlyArray<DemoHomeworkStudent> = [
  { id: "stu-lin-xiaoan", name: "林小安", defaultLayer: "B" },
  { id: "stu-zhou-yutong", name: "周予桐", defaultLayer: "A" },
  { id: "stu-huang-siqi", name: "黄思齐", defaultLayer: "A" },
  { id: "stu-zhao-xinyu", name: "赵欣宇", defaultLayer: "C" },
  { id: "stu-liu-yiming", name: "刘一鸣", defaultLayer: "B" },
  { id: "stu-chen-ke", name: "陈可", defaultLayer: "C" },
]

/** 演示场景的"自家孩子 / 本人" */
export const DEMO_SELF_STUDENT_NAME = "林小安"
export const DEMO_SELF_STUDENT_ID = "stu-lin-xiaoan"

/* ============================================================
 * 知识点二级树
 * ============================================================ */

export interface KnowledgePointNode {
  id: string
  label: string
  /** 子知识点；若为空数组表示叶节点 */
  children?: KnowledgePointNode[]
}

export interface KnowledgePointTree {
  subject: string
  /** 年级标签：例如 "小四（P4）" */
  grade: string
  groups: KnowledgePointNode[]
}

/**
 * Demo 知识点树（小学四年级 · 英语）— 与截图保持一致
 * 真实环境下应该从 `eduCoursesPersistence.lessons[].kpTree`（待新增字段）取数。
 */
export const DEMO_KNOWLEDGE_TREES: Record<string, KnowledgePointTree> = {
  英语_小学四年级: {
    subject: "英语",
    grade: "小四（P4）",
    groups: [
      {
        id: "kp-en-listening",
        label: "听力与观看",
        children: [
          { id: "kp-en-listening-1", label: "多模态理解与关键信息筛选" },
          { id: "kp-en-listening-2", label: "批判性听看回应" },
        ],
      },
      {
        id: "kp-en-reading",
        label: "阅读与观看",
        children: [
          { id: "kp-en-reading-1", label: "信息和媒体素养" },
          { id: "kp-en-reading-2", label: "作者选择与文本风格" },
        ],
      },
      {
        id: "kp-en-speaking",
        label: "口语与表达",
        children: [
          { id: "kp-en-speaking-1", label: "信息选择与组织" },
          { id: "kp-en-speaking-2", label: "讨论、呈现与多模态表达" },
        ],
      },
      {
        id: "kp-en-writing",
        label: "写作与表达",
        children: [
          { id: "kp-en-writing-1", label: "流利书写与准确拼写" },
          { id: "kp-en-writing-2", label: "多文体创作" },
        ],
      },
      {
        id: "kp-en-grammar",
        label: "语法",
        children: [
          { id: "kp-en-grammar-1", label: "语言结构控制" },
          { id: "kp-en-grammar-2", label: "段落与观点衔接" },
        ],
      },
    ],
  },
  数学_小学四年级: {
    subject: "数学",
    grade: "小四（P4）",
    groups: [
      {
        id: "kp-math-arith",
        label: "数与运算",
        children: [
          { id: "kp-math-arith-1", label: "整数四则混合运算" },
          { id: "kp-math-arith-2", label: "运算定律与简便运算" },
        ],
      },
      {
        id: "kp-math-geom",
        label: "图形与几何",
        children: [
          { id: "kp-math-geom-1", label: "角的度量" },
          { id: "kp-math-geom-2", label: "三角形与四边形" },
        ],
      },
      {
        id: "kp-math-stats",
        label: "统计与概率",
        children: [
          { id: "kp-math-stats-1", label: "条形统计图" },
          { id: "kp-math-stats-2", label: "平均数" },
        ],
      },
    ],
  },
}

/**
 * 取知识点树。
 *
 * 命中策略：
 * 1. 精确 `${subject}_${grade}` 命中（DEMO_KNOWLEDGE_TREES 内有该 key）
 * 2. 退到同学科的任一年级（仅匹配 subject 前缀）
 * 3. 再退到默认 `英语_小学四年级`（让 demo 永远能渲染出图谱，避免"暂未导入"死路）
 *
 * 真实环境下应该改成从课程大纲 API 取数；这里 fallback 仅保证 demo 演示流畅。
 */
export function getKnowledgeTree(
  subject: string,
  grade: string,
): KnowledgePointTree | null {
  const exact = DEMO_KNOWLEDGE_TREES[`${subject}_${grade}`]
  if (exact) return exact
  const sameSubjectKey = Object.keys(DEMO_KNOWLEDGE_TREES).find((k) =>
    k.startsWith(`${subject}_`),
  )
  if (sameSubjectKey) return DEMO_KNOWLEDGE_TREES[sameSubjectKey]
  return DEMO_KNOWLEDGE_TREES["英语_小学四年级"] ?? null
}

/** 把知识点树扁平化（用于 AI"一键生成"时的随机取样） */
export function flattenKnowledgeTree(
  tree: KnowledgePointTree | null,
): KnowledgePointNode[] {
  if (!tree) return []
  const out: KnowledgePointNode[] = []
  for (const group of tree.groups) {
    out.push(group)
    if (group.children) {
      for (const child of group.children) {
        out.push(child)
      }
    }
  }
  return out
}

/* ============================================================
 * 题型 label
 * ============================================================ */

export const HOMEWORK_QUESTION_TYPE_LABEL: Record<HomeworkQuestionType, string> = {
  single: "单选题",
  multi: "多选题",
  judge: "判断题",
  short: "简答题",
  essay: "论述题",
}

export const HOMEWORK_DIFFICULTY_LABEL: Record<HomeworkDifficulty, string> = {
  easy: "简单",
  medium: "中等",
  hard: "困难",
}

/* ============================================================
 * 题库（按学科 · 题型）
 *
 * 真实环境下 AI 出题应该由后端模型给；这里 mock 一份 demo bank，
 * "一键生成"时按需 pick + 替换题面的"知识点标签 / 难度文案"
 * ============================================================ */

interface QuestionTemplate {
  prompt: string
  options?: string[]
  correctAnswer: string | string[]
  analysis: string
}

const ENGLISH_BANK: Record<HomeworkQuestionType, QuestionTemplate[]> = {
  single: [
    {
      prompt:
        '你听到/看到：对话"Do you like apples?" "Yes, I do." 问：说话者喜欢什么？',
      options: ["Apples", "Oranges", "Bananas", "Pears"],
      correctAnswer: "A",
      analysis:
        '对话中说话者明确回答 "Yes, I do." 对应 apples，因此选 A。',
    },
    {
      prompt: "阅读小短文：Tom is at the zoo. He sees lions. 问：Tom 在哪里？",
      options: ["At the zoo", "At the school", "At the park", "At the library"],
      correctAnswer: "A",
      analysis: "首句 Tom is at the zoo 直接给出地点。",
    },
    {
      prompt: '你想表达"我有一个新书包。"更合适的说法是：',
      options: [
        "I have a new bag.",
        "I has a new bag.",
        "I had a new bag.",
        "I am have a new bag.",
      ],
      correctAnswer: "A",
      analysis:
        "I 对应的现在时动词为 have，不带 -s；其他选项语法或时态错误。",
    },
    {
      prompt: "下列哪一项是介绍自己年龄的正确说法？",
      options: [
        "I am 10 years old.",
        "I am 10 year olds.",
        "My age 10.",
        "I 10 years old.",
      ],
      correctAnswer: "A",
      analysis: "标准句式 I am + 数字 + years old；其他选项均不符合英语习惯。",
    },
    {
      prompt: "下列哪一项是正确的英文减法表达式？",
      options: [
        "Five subtracts two is three.",
        "Five minus two equals three.",
        "Five plus two equals three.",
        "Two minus five three.",
      ],
      correctAnswer: "B",
      analysis:
        "英文减法标准表达为 minus / equals；其他选项语法或意思均不符合。",
    },
    {
      prompt: "Which sentence is the most polite way to ask for help?",
      options: [
        "Help me!",
        "Give me help.",
        "Could you help me, please?",
        "You help me.",
      ],
      correctAnswer: "C",
      analysis: "Could you ... please 是英文中最常用的礼貌请求句式。",
    },
  ],
  multi: [
    {
      prompt: "下面哪些单词属于 fruit（水果）？",
      options: ["apple", "tiger", "banana", "lion", "pear"],
      correctAnswer: ["A", "C", "E"],
      analysis: "apple / banana / pear 是水果；tiger 与 lion 属于动物。",
    },
    {
      prompt: "判断属于现在进行时（be + V-ing）的句子：",
      options: [
        "I am reading a book.",
        "She runs every day.",
        "They are playing.",
        "He plays football.",
        "We are watching TV.",
      ],
      correctAnswer: ["A", "C", "E"],
      analysis: "现在进行时的标志是 be 动词 + V-ing。其余为一般现在时。",
    },
  ],
  judge: [
    {
      prompt: '"How are you?" 是一句常用的问候语。',
      correctAnswer: "T",
      analysis: "How are you 是英文中最常用的日常问候，多用于熟人或初次见面。",
    },
    {
      prompt: '"I am go to school." 是一句正确的英语句子。',
      correctAnswer: "F",
      analysis:
        "正确应该是 I am going to school. 或 I go to school. am 与 go 不能同时出现。",
    },
  ],
  short: [
    {
      prompt:
        "用一句话英文介绍你的爱好（≥ 6 个单词）。建议句式：I like ... because ...",
      correctAnswer:
        "I like reading books because they help me learn new things.",
      analysis:
        "答案需要包含主语 I、动词 like、爱好对象（reading / drawing 等）以及原因从句；句长建议 ≥ 6 词且无明显语法错误即可视为正确。",
    },
  ],
  essay: [
    {
      prompt:
        "请用 3-5 句话写一段短文，介绍周末你最喜欢做的一件事，要求时态准确、句意完整。",
      correctAnswer:
        "My favorite weekend activity is reading. I usually read at the library on Saturday mornings. I love stories about science and animals. Reading helps me imagine new worlds and learn new English words.",
      analysis:
        "评分维度：① 句子数 3-5 句  ② 主谓一致与时态  ③ 句间逻辑连贯  ④ 至少出现 1 个本节学过的词组。",
    },
  ],
}

const MATH_BANK: Record<HomeworkQuestionType, QuestionTemplate[]> = {
  single: [
    {
      prompt: "下列关于二元一次方程的说法，正确的是：",
      options: [
        "二元一次方程是只含有一个未知数的方程",
        "二元一次方程是含有两个未知数，且未知数的次数都是 1 的方程",
        "二元一次方程中未知数的次数可以大于 1",
        "二元一次方程与一元一次方程没有区别",
      ],
      correctAnswer: "B",
      analysis:
        "二元一次方程的标准定义：两个未知数 + 未知数次数均为 1。",
    },
    {
      prompt: "下列哪一个是二元一次方程的标准形式？",
      options: ["2x + 5 = 0", "x² + y = 3", "x + y + z = 7", "2x + 3y = 6"],
      correctAnswer: "D",
      analysis: "二元一次方程标准形式：ax + by = c，A 为一元，B 为二次，C 为三元。",
    },
  ],
  multi: [
    {
      prompt: "下面哪些等式属于二元一次方程？",
      options: ["x + y = 5", "x = 3", "2a + 3b = 7", "x² + y = 2", "3m - n = 8"],
      correctAnswer: ["A", "C", "E"],
      analysis: "A / C / E 都是两个未知数 + 次数为 1；B 仅含一个未知数；D 含次方。",
    },
  ],
  judge: [
    {
      prompt: "二元一次方程的解一般有无数组。",
      correctAnswer: "T",
      analysis: "二元一次方程的解集对应一条直线上的所有点，因此无穷多。",
    },
  ],
  short: [
    {
      prompt: "已知 2x + 3y = 12，当 x = 3 时，求 y 的值。",
      correctAnswer: "y = 2",
      analysis: "代入 x = 3，2 × 3 + 3y = 12，6 + 3y = 12，3y = 6，y = 2。",
    },
  ],
  essay: [
    {
      prompt:
        "请举一个生活情境（如买文具、分糖果等），列出含有两个未知数的等量关系，并写出一组解。",
      correctAnswer:
        "情境：买 2 支铅笔和 3 块橡皮共花 12 元，设铅笔 x 元、橡皮 y 元。等量关系：2x + 3y = 12。一组解：x = 3，y = 2。",
      analysis: "答案需包含：①生活情境  ②设元  ③等量关系式  ④一组合理整数解。",
    },
  ],
}

/** 学科 + 题型 → 题模板 */
export function pickQuestionTemplates(
  subject: string,
  type: HomeworkQuestionType,
  count: number,
): QuestionTemplate[] {
  const bank = subject === "数学" ? MATH_BANK : ENGLISH_BANK
  const pool = bank[type] ?? []
  const out: QuestionTemplate[] = []
  for (let i = 0; i < count; i += 1) {
    /** 不足时循环取，保证 count 道题 */
    const tmpl = pool[i % Math.max(pool.length, 1)]
    if (tmpl) out.push(tmpl)
  }
  return out
}

/* ============================================================
 * AI 生成（mock）
 * ============================================================ */

export interface GenerateQuestionsInput {
  subject: string
  grade: string
  difficulty: HomeworkDifficulty
  knowledgePointLabels: string[]
  questionTypeConfig: Array<{ type: HomeworkQuestionType; count: number }>
  /** 个性化分层档（影响生成时的难度修饰文案） */
  layerHint?: HomeworkLayer
}

/** AI"一键生成"的同步 mock；真实环境下应该是 ~10s 异步 */
export function mockGenerateQuestions(
  input: GenerateQuestionsInput,
): HomeworkQuestion[] {
  const out: HomeworkQuestion[] = []
  let seq = 0
  for (const cfg of input.questionTypeConfig) {
    const templates = pickQuestionTemplates(input.subject, cfg.type, cfg.count)
    templates.forEach((tmpl, idx) => {
      /** 与知识点循环匹配，让每道题都带一个有意义的标签 */
      const kpLabel =
        input.knowledgePointLabels[idx % Math.max(input.knowledgePointLabels.length, 1)] ??
        "本节核心"
      seq += 1
      out.push({
        id: `hwq-${Date.now()}-${seq}-${Math.floor(Math.random() * 10000)}`,
        type: cfg.type,
        prompt: tmpl.prompt,
        options: tmpl.options,
        correctAnswer: tmpl.correctAnswer,
        analysis: tmpl.analysis,
        knowledgePointLabel: kpLabel,
        source: "ai",
      })
    })
  }
  return out
}

/** 单题重生（同知识点 + 同题型重抽一条，避免与原题一致） */
export function mockRegenerateQuestion(
  prev: HomeworkQuestion,
  subject: string,
): HomeworkQuestion {
  const candidates = pickQuestionTemplates(subject, prev.type, 6)
  /** 优先避开与 prev.prompt 相同的题面 */
  const next = candidates.find((t) => t.prompt !== prev.prompt) ?? candidates[0] ?? null
  if (!next) return prev
  return {
    ...prev,
    id: `hwq-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    prompt: next.prompt,
    options: next.options,
    correctAnswer: next.correctAnswer,
    analysis: next.analysis,
    source: "ai",
  }
}

/* ============================================================
 * 默认作业要求文案
 * ============================================================ */

export function getDefaultHomeworkRequirement(): string {
  return (
    "请独立完成下列习题，涵盖单选题、多选题等题型。作答时须书写工整、步骤清晰。" +
    "完成后请对照答案解析自行批改订正，梳理错题。"
  )
}

/* ============================================================
 * 客观题答案对比（一键批改用）
 * ============================================================ */

/**
 * 比对客观题（单选 / 多选 / 判断）的正误。
 * - 单选 / 判断：字符串严格相等（大小写已统一）
 * - 多选：忽略顺序的集合相等
 */
export function compareObjectiveAnswer(
  q: HomeworkQuestion,
  studentAnswer: string | string[] | undefined,
): boolean {
  if (studentAnswer == null) return false
  if (q.type === "single" || q.type === "judge") {
    const stu = String(studentAnswer).trim().toUpperCase()
    const correct = String(q.correctAnswer).trim().toUpperCase()
    return stu === correct
  }
  if (q.type === "multi") {
    const stuArr = Array.isArray(studentAnswer) ? studentAnswer : [studentAnswer]
    const correctArr = Array.isArray(q.correctAnswer)
      ? q.correctAnswer
      : [q.correctAnswer]
    if (stuArr.length !== correctArr.length) return false
    const stuSet = new Set(stuArr.map((s) => String(s).trim().toUpperCase()))
    const correctSet = new Set(
      correctArr.map((s) => String(s).trim().toUpperCase()),
    )
    if (stuSet.size !== correctSet.size) return false
    for (const x of stuSet) {
      if (!correctSet.has(x)) return false
    }
    return true
  }
  /** 简答 / 论述：由 mockGradeSubjectiveAnswer 处理 */
  return false
}

/**
 * 主观题（简答 / 论述）的 mock 评分。
 *
 * 真实环境下应由 AI 评分服务给出 score + confidence。
 * Demo 规则：
 *   - 答案与正解完全一致：score 1.0，confidence 1.0
 *   - 答案 ≥ 8 字非空：score 0.7~0.95（高置信），confidence 0.85
 *   - 答案 < 8 字 / 为空：score 0.3，confidence 0.65（进老师待复核）
 *
 * 同时检测"与家长辅导材料正解逐字相同" → 标 matches-parent-material 异常
 */
export function mockGradeSubjectiveAnswer(
  q: HomeworkQuestion,
  studentAnswer: string | string[] | undefined,
): {
  correct: boolean
  score: number
  confidence: number
  suspectMatchesParentMaterial: boolean
} {
  const text = Array.isArray(studentAnswer)
    ? studentAnswer.join(" ")
    : studentAnswer ?? ""
  const len = text.trim().length
  const correctText = Array.isArray(q.correctAnswer)
    ? q.correctAnswer.join(" ")
    : q.correctAnswer
  const exact = text.trim() === correctText.trim() && len > 0
  /**
   * 雷同判定：与"正解"或"解析"任一文段完全一致即视为抄答；
   * 短答题正解通常很短，这里以 ≥ 8 字且完整匹配为门槛，避免误伤"y = 2"等单字答案。
   */
  const suspectMatchesParentMaterial =
    len >= 8 && (text.trim() === correctText.trim() || text.trim() === q.analysis.trim())
  if (exact) {
    return { correct: true, score: 1, confidence: 1, suspectMatchesParentMaterial }
  }
  if (len >= 8) {
    return {
      correct: true,
      score: 0.85,
      confidence: 0.85,
      suspectMatchesParentMaterial,
    }
  }
  return {
    correct: false,
    score: 0.3,
    confidence: 0.65,
    suspectMatchesParentMaterial: false,
  }
}
