/**
 * AI 课堂（在线教室独立窗口）演示数据。
 *
 * 与"子 CUI 对话窗口"的 demo 数据完全独立——
 * 子 CUI = AI 助手对话面板（清单 / 18 张 Skill 卡 / 调课请假）
 * AI 课堂 = 类 ClassIN 的在线教室浮层（视频墙 / 课件 / 互动 / 课堂会话）
 *
 * 设计原则
 * ----------------------------------------------------
 * - **不与 lessonsDemo / lessonDemo 字段重叠**：教室 demo 关注"现场"，课程元信息仍由 lessonsDemo 提供
 * - **三身份共享同一份学生 / 老师 / 课件 / 课堂消息底表**，但视频墙渲染时按身份过滤可视范围
 * - 字段尽量"看名见义"：focusScore=抬头率（0-100），handRaised=举手中
 */

export interface AiClassroomLiveTeacherDemo {
  id: string
  name: string
  emoji: string
  /** 头像底色（CSS 颜色字符串），与 emoji 组合形成圆形 placeholder */
  avatarBg: string
  micOn: boolean
  cameraOn: boolean
  /** 是否在共享屏幕（控制课件区是否标"老师正在讲解"） */
  presenting: boolean
}

export interface AiClassroomLiveStudentDemo {
  id: string
  name: string
  emoji: string
  avatarBg: string
  online: boolean
  micOn: boolean
  cameraOn: boolean
  handRaised: boolean
  /** 抬头率 / 专注度 0-100 */
  focusScore: number
  /** 当前是否正在做最近一道题 */
  answering: boolean
  /** 是否走神（≥ 3 秒未抬头），仅供老师视图标黄 */
  drifted: boolean
  /** 是否就是登录用户本人（学生身份时使用） */
  isSelf: boolean
}

/**
 * 课件 slide 类型：
 * - cover：封面（标题 + 学习目标 bullets）
 * - content：知识点（标题 + bullets + 占位图）
 * - interactive：互动题（选择题 demo）
 * - summary：课堂小结
 */
export interface AiClassroomLiveSlide {
  index: number
  total: number
  type: "cover" | "content" | "interactive" | "summary"
  title: string
  subtitle?: string
  bullets?: string[]
  /** 占位图说明（不真用 png，用 CSS 框 + 文字描述） */
  imageDesc?: string
  /** interactive 题目 */
  question?: {
    stem: string
    options: string[]
    correctIndex: number
  }
}

export interface AiClassroomLiveClassMessage {
  id: string
  /** "teacher" | studentId | "system" */
  senderId: string
  senderName: string
  senderRole: "teacher" | "student" | "system"
  content: string
  /** "HH:MM" */
  timestamp: string
  /** 系统消息（举手通知 / 答题统计），UI 上不显示头像 */
  isSystem?: boolean
}

/* ============================================================
 * 老师 demo
 * ============================================================ */

export const DEMO_LIVE_TEACHER: AiClassroomLiveTeacherDemo = {
  id: "teacher-wang",
  name: "王老师",
  emoji: "👨‍🏫",
  avatarBg: "linear-gradient(135deg, #6E8AFB 0%, #8E5BFB 100%)",
  micOn: true,
  cameraOn: true,
  presenting: true,
}

/* ============================================================
 * 学生 demo（8 名 · 含 3 名具名 + 5 名占位）
 *
 * 状态分布刻意不均匀，让视频墙看上去有差异：
 * - 陈可：走神中（focus 65 · drifted）
 * - 张同学：举手中（active）
 * - 李同学：高专注度
 * - 学生 4-8：在线但常规状态
 * ============================================================ */

export const DEMO_LIVE_STUDENTS: AiClassroomLiveStudentDemo[] = [
  {
    id: "stu-chen-ke",
    name: "陈可",
    emoji: "👦",
    avatarBg: "#FFB088",
    online: true,
    micOn: false,
    cameraOn: true,
    handRaised: false,
    focusScore: 65,
    answering: false,
    drifted: true,
    isSelf: false,
  },
  {
    id: "stu-zhang",
    name: "张同学",
    emoji: "👧",
    avatarBg: "#88C5FF",
    online: true,
    micOn: false,
    cameraOn: true,
    handRaised: true,
    focusScore: 92,
    answering: false,
    drifted: false,
    isSelf: false,
  },
  {
    id: "stu-li",
    name: "李同学",
    emoji: "👦",
    avatarBg: "#A5D88B",
    online: true,
    micOn: false,
    cameraOn: true,
    handRaised: false,
    focusScore: 88,
    answering: true,
    drifted: false,
    isSelf: false,
  },
  {
    id: "stu-self",
    name: "我",
    emoji: "🧑",
    avatarBg: "#FFD180",
    online: true,
    micOn: false,
    cameraOn: true,
    handRaised: false,
    focusScore: 84,
    answering: false,
    drifted: false,
    isSelf: true,
  },
  {
    id: "stu-04",
    name: "学生 04",
    emoji: "👧",
    avatarBg: "#C4B5FD",
    online: true,
    micOn: false,
    cameraOn: true,
    handRaised: false,
    focusScore: 79,
    answering: false,
    drifted: false,
    isSelf: false,
  },
  {
    id: "stu-05",
    name: "学生 05",
    emoji: "👦",
    avatarBg: "#FCA5A5",
    online: true,
    micOn: false,
    cameraOn: true,
    handRaised: false,
    focusScore: 81,
    answering: false,
    drifted: false,
    isSelf: false,
  },
  {
    id: "stu-06",
    name: "学生 06",
    emoji: "👧",
    avatarBg: "#86EFAC",
    online: true,
    micOn: false,
    cameraOn: false,
    handRaised: false,
    focusScore: 0,
    answering: false,
    drifted: false,
    isSelf: false,
  },
  {
    id: "stu-07",
    name: "学生 07",
    emoji: "👦",
    avatarBg: "#FDE68A",
    online: true,
    micOn: false,
    cameraOn: true,
    handRaised: false,
    focusScore: 90,
    answering: false,
    drifted: false,
    isSelf: false,
  },
]

/** 家长视图下「孩子」缺省指向 stu-chen-ke（demo 假设家长 = 陈可家长） */
export const DEMO_LIVE_PARENT_CHILD_ID = "stu-chen-ke"

/* ============================================================
 * 课件 demo（5 张 slide · 物理「力的合成与分解」）
 * ============================================================ */

export const DEMO_LIVE_SLIDES: AiClassroomLiveSlide[] = [
  {
    index: 1,
    total: 5,
    type: "cover",
    title: "力的合成与分解",
    subtitle: "初一物理 · 第 22 课",
    bullets: [
      "学习目标 1：理解力是矢量，方向影响合成结果",
      "学习目标 2：掌握平行四边形法则的画法",
      "学习目标 3：能解一道两力夹角合成的应用题",
    ],
    imageDesc: "封面图：两条带箭头的力 F₁、F₂ 与合力 F 的示意",
  },
  {
    index: 2,
    total: 5,
    type: "content",
    title: "力的合成是什么",
    bullets: [
      "标量加法：3 + 5 = 8（与方向无关）",
      "矢量加法：方向不同 → 合力大小不同",
      "举例：两人同向推车 vs 两人垂直推车",
    ],
    imageDesc: "对比图：同向相加 / 反向相减 / 垂直合成",
  },
  {
    index: 3,
    total: 5,
    type: "content",
    title: "平行四边形法则",
    bullets: [
      "把 F₁、F₂ 起点重合",
      "以 F₁、F₂ 为邻边作平行四边形",
      "对角线 = 合力 F（方向、大小一目了然）",
    ],
    imageDesc: "平行四边形作图法步骤分解（4 步）",
  },
  {
    index: 4,
    total: 5,
    type: "interactive",
    title: "随堂题：判断合力大小",
    subtitle: "8 位同学已收到，请在 60 秒内作答",
    question: {
      stem: "F₁ = 3N、F₂ = 4N，二者垂直时合力 F 等于？",
      options: ["7 N", "5 N", "1 N", "12 N"],
      correctIndex: 1,
    },
  },
  {
    index: 5,
    total: 5,
    type: "summary",
    title: "本节小结",
    bullets: [
      "矢量加法 ≠ 标量加法（方向决定一切）",
      "平行四边形法则是合成的基础工具",
      "夹角 90° 时合力 = √(F₁² + F₂²)",
    ],
    imageDesc: "知识点关系图：合成 ↔ 分解 ↔ 平行四边形",
  },
]

/* ============================================================
 * 课堂消息 demo（10 条 · 老师 + 学生 + 系统通知）
 *
 * 时间从 19:00 开始递增；UI 渲染时按 createdAt 顺序铺，
 * 之后用户在课堂里发新消息会 append。
 * ============================================================ */

export const DEMO_LIVE_CLASS_MESSAGES_INITIAL: AiClassroomLiveClassMessage[] = [
  {
    id: "m-init-1",
    senderId: "system",
    senderName: "系统",
    senderRole: "system",
    content: "课程已开始 · 8 名同学已到课",
    timestamp: "19:00",
    isSystem: true,
  },
  {
    id: "m-init-2",
    senderId: "teacher-wang",
    senderName: "王老师",
    senderRole: "teacher",
    content: "同学们好，我们今天讲《力的合成与分解》。先看封面。",
    timestamp: "19:00",
  },
  {
    id: "m-init-3",
    senderId: "teacher-wang",
    senderName: "王老师",
    senderRole: "teacher",
    content: "请打开课件第 1 页。",
    timestamp: "19:01",
  },
  {
    id: "m-init-4",
    senderId: "stu-li",
    senderName: "李同学",
    senderRole: "student",
    content: "老师，矢量加法和数量加法的区别是什么？",
    timestamp: "19:03",
  },
  {
    id: "m-init-5",
    senderId: "teacher-wang",
    senderName: "王老师",
    senderRole: "teacher",
    content: "好问题！这就引出今天的核心，看 slide 2。",
    timestamp: "19:04",
  },
  {
    id: "m-init-6",
    senderId: "system",
    senderName: "系统",
    senderRole: "system",
    content: "张同学 举手 🙋",
    timestamp: "19:06",
    isSystem: true,
  },
  {
    id: "m-init-7",
    senderId: "stu-zhang",
    senderName: "张同学",
    senderRole: "student",
    content: "老师，如果两个力大小相等但反向，合力是 0 吗？",
    timestamp: "19:06",
  },
  {
    id: "m-init-8",
    senderId: "teacher-wang",
    senderName: "王老师",
    senderRole: "teacher",
    content: "对的，反向相加就是相减。一会儿做题验证一下。",
    timestamp: "19:07",
  },
  {
    id: "m-init-9",
    senderId: "system",
    senderName: "系统",
    senderRole: "system",
    content: "随堂题已推送 · 60 秒倒计时开始",
    timestamp: "19:10",
    isSystem: true,
  },
  {
    id: "m-init-10",
    senderId: "system",
    senderName: "系统",
    senderRole: "system",
    content: "答题进度 6/8 · 正确 5 · 错误 1",
    timestamp: "19:11",
    isSystem: true,
  },
]

/* ============================================================
 * 老师课堂洞察小卡（仅老师视图） demo 数据
 * ============================================================ */

export interface AiClassroomLiveTeacherInsight {
  /** 抬头率 0-100 */
  attendanceRate: number
  /** 举手数 */
  raisedHands: number
  /** 答题进度 / 班级总人数 */
  answered: { done: number; total: number; correct: number }
  /** 走神同学（取 drifted = true 的） */
  driftedNames: string[]
  /** 已上 / 总时长（分钟） */
  elapsedMin: number
  totalMin: number
}

export const DEMO_LIVE_TEACHER_INSIGHT: AiClassroomLiveTeacherInsight = {
  attendanceRate: 85,
  raisedHands: 1,
  answered: { done: 6, total: 8, correct: 5 },
  driftedNames: ["陈可"],
  elapsedMin: 12,
  totalMin: 45,
}
