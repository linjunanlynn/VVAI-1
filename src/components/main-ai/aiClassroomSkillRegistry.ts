/**
 * AI 课堂 Skill -> 卡片配置注册表
 *
 * - `bespoke`：返回一段静态标识，由 MainAIChatWindow 分发到具体的 Bespoke 卡片组件
 * - `template`：直接给出统一模板需要的数据（标题 / 副标题 / badges / stats / bullets / 推荐指令）
 *
 * 此处覆盖 9 宫格 × 1-2 个示例 Skill，共 18 张：
 * - Bespoke：tt-prep / ta-report / sa-mistakes / pa-report
 * - Template：其余 14 张
 *
 * 未注册的 skillId 在 `MainAIChatWindow` 中会回退到原占位文本回复。
 *
 * 课程形态分支（PRD 2.5.1）：
 * - 默认 REGISTRY 为线上课配置（保持向后兼容；未传 mode 等价 "online"）
 * - 线下课通过 `OFFLINE_OVERRIDES` 提供新增 Skill 卡（教师 IFP / 摄像头 / 物理学具 +
 *   学生 教室 Pad / 举手等无线麦 + 家长 接送闭环 / 教室摄像头巡检）。
 *   线下时调用 `getAiClassroomSkillCardConfig(id, "offline")` 优先看 overrides，
 *   未覆盖的回落到 REGISTRY（多数课前 / 课后能力线上线下共用）。
 */
import type { AiClassroomTemplateData } from "./AiClassroomSkillCard"
import {
  DEMO_FOCUS_STUDENTS,
  DEMO_LESSON,
  DEMO_PARENT_CHILD,
  DEMO_QUICK_QUIZ,
  DEMO_SMART_GROUPS,
  DEMO_STUDENT_SELF,
} from "./aiClassroomLessonDemo"
import { EDU_IM_PRESETS } from "./eduImBus"
import type { LessonDeliveryMode } from "./lessonDeliveryMode"

export type AiClassroomBespokeId =
  | "teacher.prep.start"
  | "teacher.post.reportReview"
  | "student.post.mistakeChallenge"
  | "parent.post.lessonReport"

export type AiClassroomSkillCardConfig =
  | { kind: "bespoke"; bespokeId: AiClassroomBespokeId }
  | { kind: "template"; data: AiClassroomTemplateData }

const lessonHeader = `${DEMO_LESSON.weekday} ${DEMO_LESSON.startTime}-${DEMO_LESSON.endTime} · ${DEMO_LESSON.className} ·《${DEMO_LESSON.title}》`

/** 线下课中 demo 用的固定教室文案（与 LiveLessonHintCard 保持一致） */
const OFFLINE_CLASSROOM = "A301 物理教室"
const OFFLINE_LESSON_HEADER = `${DEMO_LESSON.weekday} ${DEMO_LESSON.startTime}-${DEMO_LESSON.endTime} · ${DEMO_LESSON.className} ·《${DEMO_LESSON.title}》· ${OFFLINE_CLASSROOM}`

const REGISTRY: Record<string, AiClassroomSkillCardConfig> = {
  /* ============== Teacher · 课前 ============== */
  "tt-prep": { kind: "bespoke", bespokeId: "teacher.prep.start" },
  "tt-portrait": {
    kind: "template",
    data: {
      title: `本节学情画像 · ${DEMO_LESSON.className}`,
      subtitle: `${lessonHeader}。基于上节课学情、本章前测与作业完成度综合生成。`,
      badges: [
        { label: `共 ${DEMO_LESSON.studentCount} 人`, tone: "default" },
        { label: `前测均分 ${DEMO_LESSON.preTestAverage}`, tone: "info" },
        { label: `作业完成 ${DEMO_LESSON.prevHomeworkCompletion}%`, tone: "warning" },
      ],
      stats: [
        { label: "高完成度", value: "12 人", hint: "作业 ≥ 90 分" },
        { label: "中等", value: "14 人", hint: "60-89 分" },
        { label: "需关注", value: "6 人", hint: "< 60 或缺交" },
      ],
      bullets: [
        { icon: "🟢", title: "亮点：张楠 / 刘一菲 已掌握矢量分解，可承担互助小组组长", meta: "建议下节给到拔高题" },
        { icon: "🟡", title: "中段：李小明 矢量方向偶错，可推送 2 道针对性变式", meta: "薄弱：矢量方向判断" },
        { icon: "🔴", title: "风险：陈可 / 赵欣宇 / 王佳佳 三力平衡未到达 60", meta: "建议安排课后一对一" },
      ],
      footerNote: "本数据仅作 demo，实际接入「学情画像」服务后会实时刷新。",
      recommendedPrompts: [
        "把 3 名风险学员加入今晚私聊提醒",
        "为亮点学员准备拔高题包",
        "生成本节分层预习包",
        "导出学情简报给教研组",
      ],
    },
  },

  /* ============== Teacher · 课中 ============== */
  "tc-question": {
    kind: "template",
    data: {
      title: "出一道随堂题 · 即时小测",
      subtitle: `${lessonHeader} · 当前用时 12'30" / 45'00"`,
      badges: [
        { label: "题型 单选", tone: "default" },
        { label: `知识点 ${DEMO_QUICK_QUIZ.options.length} 选项`, tone: "info" },
        { label: `应答率 ${DEMO_QUICK_QUIZ.responseRate}%`, tone: "success" },
      ],
      stats: [
        { label: "答题人数", value: `${DEMO_QUICK_QUIZ.distribution.reduce((a, b) => a + b, 0)} / ${DEMO_LESSON.studentCount}`, hint: "实时刷新" },
        { label: "正确率", value: `${Math.round((DEMO_QUICK_QUIZ.distribution[DEMO_QUICK_QUIZ.correctIndex] / DEMO_QUICK_QUIZ.distribution.reduce((a, b) => a + b, 0)) * 100)}%`, hint: "正解：东偏北 53°" },
        { label: "用时", value: "1'12\"", hint: "中位数" },
      ],
      bullets: DEMO_QUICK_QUIZ.options.map((opt, idx) => ({
        icon: idx === DEMO_QUICK_QUIZ.correctIndex ? "✅" : "·",
        title: `${String.fromCharCode(65 + idx)}. ${opt}`,
        meta: `${DEMO_QUICK_QUIZ.distribution[idx]} 人选择 · ${Math.round((DEMO_QUICK_QUIZ.distribution[idx] / DEMO_QUICK_QUIZ.distribution.reduce((a, b) => a + b, 0)) * 100)}%`,
      })),
      footerNote: "题面：" + DEMO_QUICK_QUIZ.prompt,
      recommendedPrompts: [
        "把答错的同学单独补练",
        "再来一道方向判断题",
        "切到 30 秒分组讨论",
        "讲一遍为什么正解是 53° 而不是 30°",
      ],
    },
  },
  "tc-group": {
    kind: "template",
    data: {
      title: "8 分钟分组讨论 · 3 组方案",
      subtitle: `${lessonHeader} · 已根据当堂答题分布与学情画像分层。`,
      badges: [
        { label: "策略 异质分组", tone: "info" },
        { label: "时长 8 分钟", tone: "default" },
        { label: "覆盖全员", tone: "success" },
      ],
      stats: [
        { label: "A · 拔高", value: `${DEMO_SMART_GROUPS[0].members.length} 人`, hint: DEMO_SMART_GROUPS[0].focus },
        { label: "B · 巩固", value: `${DEMO_SMART_GROUPS[1].members.length} 人`, hint: DEMO_SMART_GROUPS[1].focus },
        { label: "C · 补强", value: `${DEMO_SMART_GROUPS[2].members.length} 人`, hint: DEMO_SMART_GROUPS[2].focus },
      ],
      bullets: DEMO_SMART_GROUPS.map((g) => ({
        icon: g.id === "g1" ? "🚀" : g.id === "g2" ? "🛠" : "🎯",
        title: `${g.name}：${g.members.join("、")}`,
        meta: `主题：${g.focus}`,
      })),
      recommendedPrompts: [
        "用这套分组",
        "把 C 组主题换成「方向判断」",
        "为 A 组配 1 名小老师",
        "把各组任务卡发到学生端",
      ],
    },
  },

  /* ============== Teacher · 课后 ============== */
  "ta-report": { kind: "bespoke", bespokeId: "teacher.post.reportReview" },
  "ta-mistakes": {
    kind: "template",
    data: {
      title: "高频错题分析",
      subtitle: `${lessonHeader} · 已聚类 3 组高频错点，可一键转入下节课导入。`,
      badges: [
        { label: "聚类 3 组", tone: "info" },
        { label: "覆盖 18 人", tone: "default" },
        { label: "建议导入下节", tone: "warning" },
      ],
      stats: [
        { label: "第 7 题", value: "错 13/32", hint: "矢量方向判断" },
        { label: "第 12 题", value: "错 11/32", hint: "三力平衡条件" },
        { label: "第 5 题", value: "错 6/32", hint: "正交分解符号" },
      ],
      bullets: [
        { icon: "🧩", title: "错点 A：忽略反向分量抵消（13 人）", meta: "建议补 1 道动画演示 + 2 道变式" },
        { icon: "⚖️", title: "错点 B：平衡条件方向定义不清（11 人）", meta: "建议下节用受力图导入" },
        { icon: "✏️", title: "错点 C：分解后符号写反（6 人）", meta: "建议在板书 OCR 时强调坐标系" },
      ],
      recommendedPrompts: [
        "把这 3 组错点放进下节课开场 5 分钟",
        "再出 5 道方向判断变式题",
        "把错点 A 发给这 18 位同学",
        "把错题分析发给教研组",
      ],
    },
  },

  /* ============== Student · 课前 ============== */
  "sp-today": {
    kind: "template",
    data: {
      title: "今日学习卡片",
      subtitle: "今天你有 1 节课、2 项预习任务。完成预习可以解锁课中抢答优先权。",
      badges: [
        { label: `${DEMO_LESSON.weekday} ${DEMO_LESSON.startTime}`, tone: "info" },
        { label: "预习 待做 2", tone: "warning" },
        { label: "上节 +3 名 ↑", tone: "success" },
      ],
      stats: [
        { label: "今晚课程", value: DEMO_LESSON.subject, hint: `《${DEMO_LESSON.title}》` },
        { label: "预计用时", value: "45 分钟", hint: "实时直播" },
        { label: "你需要准备", value: "2 项", hint: "预习 + 设备" },
      ],
      bullets: [
        { icon: "📖", title: "预习视频：力的合成与分解（6 分钟）", meta: "看完做 3 道前置题" },
        { icon: "🧪", title: "虚拟实验：拉一拉合力的方向", meta: "用手机即可，约 4 分钟" },
        { icon: "🎧", title: "课前检查：耳麦、摄像头、网络", meta: "可一键自检" },
      ],
      recommendedPrompts: [
        "现在就开始预习",
        "讲讲什么是矢量",
        "做 3 道前置题",
        "提醒我 18:55 上课",
      ],
    },
  },
  "sp-pack": {
    kind: "template",
    data: {
      title: "开始预习 · 力的合成与分解",
      subtitle: "我会陪你 8 分钟过完整套预习，遇到不懂的随时打断我。",
      badges: [
        { label: "预计 8 分钟", tone: "info" },
        { label: "3 步", tone: "default" },
        { label: "解锁抢答", tone: "success" },
      ],
      stats: [
        { label: "Step 1", value: "看视频", hint: "6 分钟微课" },
        { label: "Step 2", value: "做小题", hint: "3 道前置" },
        { label: "Step 3", value: "做实验", hint: "拉合力" },
      ],
      bullets: [
        { icon: "🎬", title: "微课视频：什么是矢量？什么是合力？", meta: "看完会问你 1 个小问题" },
        { icon: "✏️", title: "前置 3 题：判断方向 + 求合力", meta: "做错可以让我讲" },
        { icon: "🧪", title: "虚拟实验：动手拉合力", meta: "亲手感受 1+1 ≠ 2" },
      ],
      recommendedPrompts: [
        "下一步",
        "我看不懂矢量",
        "做完跳到第 2 步",
        "提醒我明天回顾",
      ],
    },
  },

  /* ============== Student · 课中 ============== */
  "sc-handraise": {
    kind: "template",
    data: {
      title: "举手 / 抢答",
      subtitle: "课中状态：王老师正在讲第 7 题，可以举手或抢答抢分。",
      badges: [
        { label: "等待抢答", tone: "info" },
        { label: "已加 +2", tone: "success" },
        { label: "队列 3 人", tone: "default" },
      ],
      stats: [
        { label: "我的状态", value: "举手中", hint: "排队第 2" },
        { label: "本节得分", value: "+2", hint: "上次抢答 +1" },
        { label: "倒计时", value: "5 秒", hint: "抢答窗口" },
      ],
      bullets: [
        { icon: "✋", title: "举手：等老师叫你后再说话", meta: "适合稳一点的回答" },
        { icon: "⚡️", title: "抢答：5 秒内最快被选中", meta: "答对 +1，答错不扣" },
        { icon: "📣", title: "保持麦克风音量正常", meta: "已为你自动开启降噪" },
      ],
      recommendedPrompts: [
        "我要抢答",
        "继续举手",
        "麦克风听不到",
        "我答错了能否再来一次",
      ],
    },
  },
  "sc-private": {
    kind: "template",
    data: {
      title: "私聊老师 · 仅你和王老师可见",
      subtitle:
        "你写的问题只有王老师能看到，不会被同学发现，老师会在板书间隙回你。需要同学一起回应可以「换成全班发言」。",
      badges: [
        { label: "仅老师可见", tone: "info" },
        { label: "今日已问 1", tone: "default" },
        { label: "记入学情", tone: "success" },
      ],
      bullets: [
        { icon: "🔒", title: "为什么 F1 和 F3 反向相加是 1N？", meta: "已发送 · 王老师正在解答" },
        { icon: "💡", title: "示例提问：方向判断为什么不能凭直觉？", meta: "可点击直接发送" },
        { icon: "🧭", title: "提示：把问题写得越具体，老师回得越准", meta: "建议附上题号" },
      ],
      recommendedPrompts: [
        "示例：为什么方向判断错了？",
        "示例：可以再讲一遍正交分解吗？",
        "换成全班发言（举手）",
        "把这个问题加入我的错题本",
      ],
    },
  },

  /* ============== Student · 课后 ============== */
  "sa-mistakes": { kind: "bespoke", bespokeId: "student.post.mistakeChallenge" },
  "sa-report": {
    kind: "template",
    data: {
      title: "看我本节得分",
      subtitle: "今天表现不错！抢答 3 次答对 2 次，作业完成 92%。",
      badges: [
        { label: `本节 ${DEMO_PARENT_CHILD.lessonScore} 分`, tone: "success" },
        { label: `位次 ${DEMO_PARENT_CHILD.rank} ↑`, tone: "info" },
        { label: "继续加油", tone: "default" },
      ],
      stats: [
        { label: "专注度", value: `${DEMO_STUDENT_SELF.attentionScore}` },
        { label: "互动度", value: `${DEMO_STUDENT_SELF.interactionScore}`, hint: "比上节 +6" },
        { label: "作业完成", value: `${DEMO_STUDENT_SELF.homeworkScore}%`, hint: "高于平均" },
      ],
      bullets: [
        { icon: "🌟", title: "亮点：第 3 次抢答方向题答对", meta: "+2 分进步" },
        { icon: "🎯", title: "薄弱：矢量方向判断还有 1 处错", meta: "建议去重做错题" },
        { icon: "💬", title: "王老师评语：" + DEMO_PARENT_CHILD.teacherComment, meta: "明天继续保持" },
      ],
      recommendedPrompts: [
        "去重做错题",
        "把今天的亮点告诉爸爸",
        "明天上课提醒我",
        "我哪里还能再进步",
      ],
    },
  },

  /* ============== Parent · 课前 ============== */
  "pp-brief": {
    kind: "template",
    data: {
      title: "本节课预告 · 让你心中有底",
      subtitle: `${lessonHeader}。这一节会练 3 个小实验，建议陪孩子准备纸笔。`,
      badges: [
        { label: "今晚直播", tone: "info" },
        { label: "需要纸笔", tone: "default" },
        { label: "可课后回看", tone: "success" },
      ],
      stats: [
        { label: "时间", value: `${DEMO_LESSON.startTime}`, hint: `${DEMO_LESSON.weekday}` },
        { label: "时长", value: "45 分钟" },
        { label: "教室", value: DEMO_LESSON.classroom },
      ],
      bullets: [
        { icon: "📚", title: `主题：${DEMO_LESSON.title}`, meta: "学会判断合力的方向" },
        { icon: "🧪", title: "课中 3 个小实验：拉合力 / 受力图 / 平衡判断", meta: "可以陪孩子准备纸笔" },
        { icon: "👨‍👩‍👧", title: "可以做的事：把灯调亮，提醒孩子做笔记", meta: "不必陪学，避免压力" },
      ],
      recommendedPrompts: [
        "把上课提醒加到我的日历",
        "孩子需要我陪听吗",
        "提醒孩子 18:55 准备",
        "查看上节课报告",
      ],
    },
  },
  "pp-preview": {
    kind: "template",
    data: {
      title: "孩子预习进度",
      subtitle: `${DEMO_PARENT_CHILD.childName} 今晚课的预习还差 1 项，整体节奏正常。`,
      badges: [
        { label: "完成 2/3", tone: "info" },
        { label: "用时 12 分钟", tone: "default" },
        { label: "建议 18:30 前完成", tone: "warning" },
      ],
      stats: [
        { label: "已完成", value: "2 项", hint: "视频 + 前置题 2/3" },
        { label: "待完成", value: "1 项", hint: "虚拟实验" },
        { label: "正确率", value: "67%", hint: "前置题" },
      ],
      bullets: [
        { icon: "✅", title: "已看：力的合成与分解 微课", meta: "13 分钟前完成" },
        { icon: "✅", title: "已做：前置题 2 道（对 1 错 1）", meta: "错题已加入错题本" },
        { icon: "🟡", title: "待做：虚拟实验「拉合力」", meta: "约 4 分钟" },
      ],
      recommendedPrompts: [
        "提醒孩子 18:30 前完成",
        "我帮孩子一起做实验",
        "看孩子做错的题",
        "今晚不催，让他自己来",
      ],
    },
  },

  /* ============== Parent · 课中 ============== */
  "pc-status": {
    kind: "template",
    data: {
      title: "孩子上课中状态",
      subtitle: "现在是 19:18，正在讲第 7 题。孩子状态正常，不必打扰。",
      badges: [
        { label: "上课中", tone: "info" },
        { label: "无异常", tone: "success" },
        { label: "已抢答 1 次", tone: "default" },
      ],
      stats: [
        { label: "出勤", value: "已签到", hint: "19:00:02" },
        { label: "互动", value: "抢答 1 次", hint: "答对 +1" },
        { label: "网络", value: "良好", hint: "延迟 80ms" },
      ],
      bullets: [
        { icon: "🟢", title: "麦克风 / 摄像头工作正常", meta: "无掉线" },
        { icon: "📈", title: "整堂课已答对 2 道课中小测", meta: "高于上节" },
        { icon: "🤫", title: "建议家长不打扰，下课后再问", meta: "保持环境安静" },
      ],
      recommendedPrompts: [
        "课后再叫我",
        "我要看一眼直播",
        "孩子状态有变化提醒我",
        "下课了告诉我得分",
      ],
    },
  },
  "pc-live": {
    kind: "template",
    data: {
      title: "看一眼直播（30 秒）",
      subtitle: "为不打扰课堂，您只能看 30 秒画面，不能录制、不能分享。",
      badges: [
        { label: "仅 30 秒", tone: "warning" },
        { label: "不能录制", tone: "default" },
        { label: "默默观察", tone: "info" },
      ],
      stats: [
        { label: "可看时长", value: "30 秒", hint: "倒计时进行" },
        { label: "录制", value: "禁止", hint: "系统已屏蔽" },
        { label: "下次能开", value: "下课前 5'", hint: "自动可用" },
      ],
      bullets: [
        { icon: "👀", title: "只能看，不能说话，不会打扰孩子", meta: "建议关掉自己的麦" },
        { icon: "🔕", title: "孩子不会知道您在看", meta: "课堂端无提示" },
        { icon: "🛡️", title: "30 秒后自动关掉", meta: "不会留下录像" },
      ],
      recommendedPrompts: [
        "现在打开直播",
        "下课前再开一次",
        "我先不看了",
        "申请下节课全程旁听",
      ],
    },
  },

  /* ============== Parent · 课后 ============== */
  "pa-report": { kind: "bespoke", bespokeId: "parent.post.lessonReport" },
  "pa-advice": {
    kind: "template",
    data: {
      title: "今晚怎么陪孩子",
      subtitle: `${DEMO_PARENT_CHILD.childName} 今天主动抢答 3 次，建议在轻松氛围里再陪 15 分钟。`,
      badges: [
        { label: "约 15 分钟", tone: "info" },
        { label: "只陪练 / 不教", tone: "default" },
        { label: "睡前完成", tone: "success" },
      ],
      stats: [
        { label: "推荐项 1", value: "重做错题", hint: "3 道方向判断" },
        { label: "推荐项 2", value: "口头复述", hint: "讲一遍合力规则" },
        { label: "推荐项 3", value: "鼓励 1 句", hint: "今天抢答很棒" },
      ],
      bullets: [
        { icon: "🎯", title: "陪孩子重做 3 道方向题（约 8 分钟）", meta: "做完直接进错题本" },
        { icon: "🗣️", title: "让孩子讲一遍「合力为什么是 3N 而不是 2N」", meta: "讲出来比做对更重要" },
        { icon: "💛", title: "睡前用 1 句具体的话表扬：今天第 3 次抢答方向题答对了", meta: "避免泛泛的「你真棒」" },
      ],
      recommendedPrompts: [
        "把以上 3 项加进今晚日历",
        "我不会判断方向，能给我答案吗",
        "明早提醒孩子做今日学习卡",
        "和王老师私聊请教",
      ],
    },
  },

  /* ============================================================
   * 第 2 批：剩余 21 张 Template 卡（覆盖 9 宫格菜单全量项）
   * 与第 1 批共用 lesson fixture，保持联动主线一致
   * ============================================================ */

  /* —— 教师 · 课前 —— */
  "tt-courseware-ai": {
    kind: "template",
    data: {
      title: "课件 AI 生成",
      subtitle: `${lessonHeader}。基于本节大纲与学情，AI 已起草 3 版课件，可一键定稿。`,
      badges: [
        { label: "已起草 3 版", tone: "info" },
        { label: "与上节风格一致", tone: "default" },
        { label: "约 2 分钟可定稿", tone: "success" },
      ],
      stats: [
        { label: "覆盖大纲", value: "8 / 8", hint: "无遗漏" },
        { label: "互动设计", value: "3 处", hint: "投票 / 抢答 / 板书" },
        { label: "时长预估", value: "42 min", hint: "留 3 min 弹性" },
      ],
      bullets: [
        { icon: "🅰️", title: "版本 A · 严谨型：以受力图导入，逻辑严密", meta: "适合常规课，与上节风格一致" },
        { icon: "🅱️", title: "版本 B · 案例型：用拔河 / 拉车开场，趣味强", meta: "适合公开课，但留时少" },
        { icon: "🅲", title: "版本 C · 实验型：先让学生拉合力再讲，体感强", meta: "需要提前发器材包" },
      ],
      footerNote: "选定后会自动同步到课件库与课堂节奏建议。",
      recommendedPrompts: [
        "采用版本 A",
        "把版本 B 的拔河案例插入版本 A 开场",
        "再生成 1 版偏奥赛风格",
        "查看上节课用过的版本",
      ],
    },
  },
  "tt-preview": {
    kind: "template",
    data: {
      title: "生成预习包并发给学生",
      subtitle: `已分层生成 A / B / C 三档预习包，匹配本节学情画像。`,
      badges: [
        { label: "A 拔高 8 人", tone: "success" },
        { label: "B 巩固 18 人", tone: "info" },
        { label: "C 补强 6 人", tone: "warning" },
      ],
      stats: [
        { label: "预计完成", value: "10-15 min", hint: "学生侧" },
        { label: "前置题", value: "3-5 道", hint: "按层差异化" },
        { label: "送达时间", value: "今晚 18:00", hint: "上课前 1h" },
      ],
      bullets: [
        { icon: "🚀", title: "A 拔高包：奥赛型方向判断 5 道 + 综合题 1 道", meta: "目标人群：张楠 / 刘一菲 等 8 人" },
        { icon: "🛠", title: "B 巩固包：方向判断 3 道 + 微课视频 6 分钟", meta: "目标人群：李小明 等 18 人" },
        { icon: "🎯", title: "C 补强包：基础合力 3 道 + 视频 + 提问帮手答疑入口", meta: "目标人群：陈可 / 赵欣宇 等 6 人" },
      ],
      recommendedPrompts: [
        "现在把三档预习包发出去",
        "C 组同时通知家长协助",
        "发的时候附 1 句鼓励文案",
        "看上节包的完成率",
      ],
    },
  },
  "tt-ready": {
    kind: "template",
    data: {
      title: "课前就位检查",
      subtitle: "已自动检查教室、设备、师资、教材 4 项，1 项需要确认。",
      badges: [
        { label: "教室就位", tone: "success" },
        { label: "网络良好", tone: "success" },
        { label: "教材待确认", tone: "warning" },
      ],
      stats: [
        { label: "教室", value: DEMO_LESSON.classroom, hint: "已开 19:00 - 20:00" },
        { label: "设备", value: "全部正常", hint: "投屏 / 音响 / 摄像头" },
        { label: "教材", value: "缺 1 项", hint: "拓展实验包未到货" },
      ],
      bullets: [
        { icon: "🏫", title: "教室：A1 已开放，提前 30 分钟可入场", meta: "与上节同教室" },
        { icon: "🎙", title: "设备：麦 / 投屏 / 摄像头全部自检通过", meta: "网络延迟 12ms" },
        { icon: "📦", title: "教材：拓展实验包未到货，可延后到下节", meta: "或临时改用版本 A 课件" },
      ],
      recommendedPrompts: [
        "把实验包推后到下节",
        "改用版本 A 课件",
        "联系后勤催发实验包",
        "通知班主任今晚有公开课",
      ],
    },
  },

  /* —— 教师 · 课中 —— */
  "tc-private": {
    kind: "template",
    data: {
      title: "上课时私聊学员",
      subtitle: "上课时私聊不会被其他人看到，老师讲完一段再回。",
      badges: [
        { label: "静默通道", tone: "info" },
        { label: "不打断授课", tone: "default" },
        { label: "回流学情", tone: "success" },
      ],
      stats: [
        { label: "在线", value: "31 / 32", hint: "陈可未上线" },
        { label: "本节互动", value: "李小明 +1", hint: "抢答正确 1 次" },
        { label: "私聊待回", value: "2", hint: "王佳佳 / 周晓" },
      ],
      bullets: [
        { icon: "💬", title: "王佳佳：老师能再讲一遍正交分解吗？", meta: "已等待 1 分钟" },
        { icon: "💬", title: "周晓：手边没有量角器，怎么办？", meta: "可推送虚拟工具" },
        { icon: "🆘", title: "陈可：未上线 12 分钟", meta: "建议自动 IM 推送 1 条软提醒" },
      ],
      recommendedPrompts: [
        "把虚拟量角器发给周晓",
        "回复王佳佳：稍等到第 22 分钟再讲一次",
        "给陈可发上课提醒",
        "把这两个问题放进下节复盘",
      ],
    },
  },
  "tc-ocr": {
    kind: "template",
    data: {
      title: "板书拍照转文字 · 自动归档",
      subtitle: "已识别本节板书 4 张，关键步骤已标注，可一键发给学生。",
      badges: [
        { label: "已归档 4 张", tone: "info" },
        { label: "识别准确率 96%", tone: "success" },
        { label: "支持手写公式", tone: "default" },
      ],
      stats: [
        { label: "板书 #1", value: "受力图", hint: "导入" },
        { label: "板书 #2", value: "正交分解", hint: "例题 1" },
        { label: "板书 #4", value: "三力平衡", hint: "总结" },
      ],
      bullets: [
        { icon: "🖊", title: "板书 #1 受力图：标注 F1/F2/F3 方向", meta: "5'12 拍摄" },
        { icon: "🖊", title: "板书 #2 正交分解：步骤 1-4", meta: "10'02 拍摄" },
        { icon: "🖊", title: "板书 #4 三力平衡：判断公式", meta: "38'40 拍摄" },
      ],
      recommendedPrompts: [
        "一键发给全班",
        "只发 C 组三人巩固",
        "把板书 #2 转成动画课件",
        "给板书 #4 配 30 秒口播",
      ],
    },
  },
  "tc-pace": {
    kind: "template",
    data: {
      title: "调整节奏 · AI 建议",
      subtitle: "当前节奏比上节快 8%，B 组讨论超时 30 秒。",
      badges: [
        { label: "节奏快 8%", tone: "warning" },
        { label: "B 组超时", tone: "warning" },
        { label: "建议留弹性", tone: "info" },
      ],
      stats: [
        { label: "已用", value: "12'30\"", hint: "/ 45'00\"" },
        { label: "习题完成", value: "62%", hint: "目标 70%" },
        { label: "互动率", value: "87%", hint: "高于均值" },
      ],
      bullets: [
        { icon: "🐢", title: "建议 1：拉回主线，先收 B 组发言再讲下一题", meta: "+2 min" },
        { icon: "⚡️", title: "建议 2：把例题 2 简版讲，留时给习题", meta: "节省 3 min" },
        { icon: "🎯", title: "建议 3：删除原计划的拓展讨论，下节再讲", meta: "节省 5 min" },
      ],
      recommendedPrompts: [
        "采用建议 2",
        "提醒 B 组组长收言",
        "把拓展讨论挪到下节",
        "继续保持当前节奏",
      ],
    },
  },
  "tc-bilingual": {
    kind: "template",
    data: {
      title: "中英双语切换 · 术语对照",
      subtitle: "本节核心 6 个物理术语已生成中英对照，可上课时即时投屏。",
      badges: [
        { label: "本节 6 词", tone: "info" },
        { label: "支持投屏", tone: "default" },
        { label: "适配双语班", tone: "success" },
      ],
      stats: [
        { label: "核心术语", value: "6 词", hint: "向量 / 合力 / 分解 ..." },
        { label: "听音", value: "已就绪", hint: "标准发音" },
        { label: "国别版本", value: "AmE / BrE", hint: "可一键切换" },
      ],
      bullets: [
        { icon: "🔤", title: "vector · 矢量 / 向量", meta: "建议第 5 分钟讲到" },
        { icon: "🔤", title: "resultant force · 合力", meta: "建议第 12 分钟讲到" },
        { icon: "🔤", title: "decomposition · 分解", meta: "建议第 18 分钟讲到" },
      ],
      recommendedPrompts: [
        "投屏第 1 个术语",
        "切到英式发音",
        "把术语表发给全班",
        "下节用日语版做实验",
      ],
    },
  },

  /* —— 教师 · 课后 —— */
  "ta-asgmt": {
    kind: "template",
    data: {
      title: "批改作业 · AI 初批",
      subtitle: "本节 3 份作业 AI 已初批，3 份关键题待你复核。",
      badges: [
        { label: "AI 初批 3 份", tone: "info" },
        { label: "待复核 3", tone: "warning" },
        { label: "高频错点 1 处", tone: "warning" },
      ],
      stats: [
        { label: "已批", value: "29 / 32", hint: "AI + 你" },
        { label: "正确率", value: "76%", hint: "比上节 +4" },
        { label: "高频错题", value: "第 7", hint: "13 人错" },
      ],
      bullets: [
        { icon: "✅", title: "李小明：8 / 10，方向判断错 1 处", meta: "已自动归入错题本" },
        { icon: "⚠️", title: "陈可：4 / 10，3 题方向判断全错", meta: "建议安排一对一" },
        { icon: "⚠️", title: "赵欣宇：5 / 10，正交分解符号反", meta: "建议视频补讲" },
      ],
      recommendedPrompts: [
        "复核陈可的作业",
        "把第 7 题的错点放进下节课开场",
        "把讲解视频发给陈可、赵欣宇",
        "导出班级正确率报表",
      ],
    },
  },
  "ta-variant": {
    kind: "template",
    data: {
      title: "生成同类变式题",
      subtitle: "针对本节 3 处高频错点，AI 已生成 9 道同类变式题。",
      badges: [
        { label: "9 道变式", tone: "info" },
        { label: "三档难度", tone: "default" },
        { label: "已配解析", tone: "success" },
      ],
      stats: [
        { label: "方向判断", value: "4 道", hint: "覆盖 13 名错题学员" },
        { label: "正交分解", value: "3 道", hint: "覆盖 11 名错题学员" },
        { label: "三力平衡", value: "2 道", hint: "覆盖 6 名错题学员" },
      ],
      bullets: [
        { icon: "📐", title: "变式题示例：F1/F2/F3 三力，求平衡角度", meta: "难度 中" },
        { icon: "📊", title: "AI 解析含 3 步思路展开", meta: "可直接当讲义" },
        { icon: "🧪", title: "其中 2 道带虚拟实验入口", meta: "学生可动手验证" },
      ],
      recommendedPrompts: [
        "把这 9 道发给做错的学员",
        "调整其中 1 道的难度",
        "为这套题配 1 段讲解视频",
        "导出做下节复习册",
      ],
    },
  },
  "ta-progress": {
    kind: "template",
    data: {
      title: "和上节比一比进步 · 班级 + 个人",
      subtitle: "对比上节 / 本节 / 本章三段数据，班级整体进步明显。",
      badges: [
        { label: "班级 +4 分", tone: "success" },
        { label: "进步 18 人", tone: "success" },
        { label: "退步 3 人", tone: "warning" },
      ],
      stats: [
        { label: "班级均分", value: "76 → 80", hint: "+4" },
        { label: "高频错题", value: "5 → 3", hint: "-40%" },
        { label: "课堂互动率", value: "79% → 87%", hint: "+8" },
      ],
      bullets: [
        { icon: "📈", title: "进步 Top3：李小明、刘一菲、孙浩然", meta: "都来自 B 组" },
        { icon: "📉", title: "退步 Top3：陈可、赵欣宇、王佳佳", meta: "需要重点干预" },
        { icon: "🧭", title: "本章趋势：方向判断 → 三力平衡 → 综合应用", meta: "下节要补受力图" },
      ],
      recommendedPrompts: [
        "把进步 Top3 发到家长群",
        "为退步 3 人安排一对一",
        "导出本章趋势报告",
        "和班主任同步本节情况",
      ],
    },
  },

  /* —— 学生 · 课前 —— */
  "sp-kp": {
    kind: "template",
    data: {
      title: "知识点速览 · 力的合成与分解",
      subtitle: "5 张卡片，约 2 分钟看完。看完做 2 道前置题更稳。",
      badges: [
        { label: "5 张卡片", tone: "info" },
        { label: "约 2 分钟", tone: "default" },
        { label: "做 2 题更稳", tone: "success" },
      ],
      stats: [
        { label: "卡片 1", value: "矢量基本概念" },
        { label: "卡片 3", value: "合力 / 分力" },
        { label: "卡片 5", value: "三力平衡" },
      ],
      bullets: [
        { icon: "🅰", title: "卡片 1：矢量 = 大小 + 方向", meta: "举例：风、推力" },
        { icon: "🅱", title: "卡片 3：合力的方向不一定与分力同向", meta: "易错点" },
        { icon: "🅲", title: "卡片 5：三力平衡的判断窍门", meta: "30 秒口诀" },
      ],
      recommendedPrompts: [
        "看完做 2 道前置题",
        "我没看懂卡片 3",
        "用一个生活例子讲合力",
        "上课提醒我",
      ],
    },
  },
  "sp-remind": {
    kind: "template",
    data: {
      title: "上课提醒 · 已设置",
      subtitle: "已为你定 3 条提醒：18:55 准备 / 19:00 上课 / 19:30 中段休息。",
      badges: [
        { label: "已设 3 条", tone: "success" },
        { label: "免打扰除外", tone: "default" },
        { label: "可随时关闭", tone: "info" },
      ],
      stats: [
        { label: "18:55", value: "上课就位", hint: "5 分钟前" },
        { label: "19:00", value: "上课开始", hint: "准时" },
        { label: "19:30", value: "中段休息", hint: "可眼睛放松" },
      ],
      bullets: [
        { icon: "📲", title: "提醒方式：手机弹窗 + iPad 横幅", meta: "勿扰时段除外" },
        { icon: "🎒", title: "建议 18:55 检查：耳麦、笔记本、量角器", meta: "1 分钟搞定" },
        { icon: "🌙", title: "如果你今天累了，可以一键改成只看回放", meta: "我不会评价你" },
      ],
      recommendedPrompts: [
        "把 19:00 的提醒改成 19:05",
        "今天我太累了，改成看回放",
        "顺便提醒我做预习",
        "关掉所有提醒",
      ],
    },
  },

  /* —— 学生 · 课中 —— */
  "sc-leave": {
    kind: "template",
    data: {
      title: "紧急请假",
      subtitle: "请假信息会同步给王老师 + 班主任 + 爸妈，30 秒搞定。",
      badges: [
        { label: "课中请假", tone: "warning" },
        { label: "需家长确认", tone: "info" },
        { label: "会保留课时", tone: "success" },
      ],
      stats: [
        { label: "处理人", value: "王老师", hint: "本节任课" },
        { label: "通知", value: "班主任 + 家长", hint: "1 分钟内送达" },
        { label: "课时", value: "保留", hint: "可补一节" },
      ],
      bullets: [
        { icon: "🤒", title: "原因模板 1：身体不适", meta: "家长会同步收到" },
        { icon: "🚑", title: "原因模板 2：家中临时事项", meta: "需家长确认" },
        { icon: "📝", title: "原因模板 3：自定义", meta: "可补充 30 字以内" },
      ],
      recommendedPrompts: [
        "我身体不舒服请假",
        "家里临时有事请假",
        "先暂停 5 分钟去喝水",
        "我再坚持 10 分钟",
      ],
    },
  },

  /* —— 学生 · 课后 —— */
  "sa-asgmt": {
    kind: "template",
    data: {
      title: "我的作业",
      subtitle: "本节作业 1 项，10 道题，预计 12 分钟。完成后可解锁重做错题。",
      badges: [
        { label: "待做 1 项", tone: "warning" },
        { label: "约 12 分钟", tone: "info" },
        { label: "完成解锁重做", tone: "success" },
      ],
      stats: [
        { label: "题数", value: "10 道", hint: "选择 6 + 计算 4" },
        { label: "已完成", value: "0 / 10" },
        { label: "截止", value: "明早 8:00", hint: "晚于会扣完成度" },
      ],
      bullets: [
        { icon: "✏️", title: "前 6 题：方向判断（与本节同款）", meta: "做完就能解开错点" },
        { icon: "🧮", title: "后 4 题：合力计算（带受力图）", meta: "可调用虚拟量角器" },
        { icon: "💡", title: "卡住 5 分钟会自动提示思路", meta: "不会直接给答案" },
      ],
      recommendedPrompts: [
        "现在开始做",
        "我先做选择题",
        "讲一遍方向判断的思路",
        "提醒我 21:30 前完成",
      ],
    },
  },
  "sa-copilot": {
    kind: "template",
    data: {
      title: "问提问帮手 · 思路引导",
      subtitle: "提问帮手不会直接给答案，但会用提问帮你一步一步想清楚。",
      badges: [
        { label: "思路引导", tone: "info" },
        { label: "不直接给答案", tone: "default" },
        { label: "全程不评价你", tone: "success" },
      ],
      stats: [
        { label: "陪你 12 分钟", value: "本周", hint: "累计" },
        { label: "突破点", value: "3 个", hint: "你自己想出来的" },
        { label: "信心", value: "+1", hint: "相对上周" },
      ],
      bullets: [
        { icon: "🤖", title: "示例：你卡在第 7 题，我会问你 F1 和 F3 是不是抵消了", meta: "你自己说出答案" },
        { icon: "🧠", title: "我会用画图、举例、类比三种方式提示", meta: "不照搬题目" },
        { icon: "🎉", title: "你解开后我会陪你回顾思路", meta: "不仅是会做，还能讲清" },
      ],
      recommendedPrompts: [
        "陪我做第 7 题",
        "讲一个生活例子帮我理解合力",
        "我学完了，回顾一下",
        "我太累了，明天再说",
      ],
    },
  },
  "sa-handoff": {
    kind: "template",
    data: {
      title: "转给老师答疑",
      subtitle: "把卡住的题目和你的思路一起转给王老师，15 分钟内会得到批注。",
      badges: [
        { label: "转给王老师", tone: "info" },
        { label: "约 15 分钟", tone: "default" },
        { label: "保留你思路", tone: "success" },
      ],
      stats: [
        { label: "题目", value: "第 7", hint: "本节作业" },
        { label: "我的解答", value: "已记录", hint: "包括错处" },
        { label: "状态", value: "未发送", hint: "确认即发" },
      ],
      bullets: [
        { icon: "📝", title: "会附上你的「我的答案」和「错点定位」", meta: "老师能直接看上下文" },
        { icon: "📨", title: "老师批注后会私聊给你", meta: "不打扰其他同学" },
        { icon: "🛟", title: "如果你觉得还差一点点，建议先问提问帮手 1 次再转", meta: "提升你自己的解题力" },
      ],
      recommendedPrompts: [
        "现在转给王老师",
        "先问提问帮手一次",
        "把这道题加入错题本不转老师",
        "我再想 5 分钟",
      ],
    },
  },

  /* —— 家长 · 课前 —— */
  "pp-schedule": {
    kind: "template",
    data: {
      title: "本周课表（孩子）",
      subtitle: `${DEMO_PARENT_CHILD.childName} 本周还有 4 节课，2 节物理 / 1 节英语 / 1 节数学。`,
      badges: [
        { label: "本周 4 节", tone: "info" },
        { label: "周三 / 五 物理", tone: "default" },
        { label: "无调课", tone: "success" },
      ],
      stats: [
        { label: "周三 19:00", value: "物理", hint: "今晚" },
        { label: "周四 18:30", value: "英语" },
        { label: "周日 9:00", value: "数学", hint: "周末" },
      ],
      bullets: [
        { icon: "📅", title: "周三：力的合成与分解（今晚）", meta: "需要量角器" },
        { icon: "📅", title: "周四：英语 phonics 第 5 单元", meta: "提前听一段录音" },
        { icon: "📅", title: "周日：数学一元二次方程", meta: "可以陪做 2 道题" },
      ],
      recommendedPrompts: [
        "把本周课表加进我的日历",
        "周日的数学课需要我陪听吗",
        "提醒我每节课开始前 10 分钟",
        "查看上周课表",
      ],
    },
  },
  "pp-ready": {
    kind: "template",
    data: {
      title: "课前注意事项",
      subtitle: "今晚 19:00 物理课，建议帮孩子准备 3 件小事，不必陪学。",
      badges: [
        { label: "3 件小事", tone: "info" },
        { label: "约 5 分钟", tone: "default" },
        { label: "不必陪学", tone: "success" },
      ],
      stats: [
        { label: "事项 1", value: "量角器", hint: "可用纸代替" },
        { label: "事项 2", value: "把灯调亮", hint: "桌面照度" },
        { label: "事项 3", value: "桌面留空", hint: "便于做实验" },
      ],
      bullets: [
        { icon: "📐", title: "量角器：抽屉里就有，没有可以用直角三角板代替", meta: "用于课中 1 个小实验" },
        { icon: "💡", title: "灯调到暖白光、避免反光", meta: "保护眼睛" },
        { icon: "🪑", title: "桌面留 30cm × 40cm 空地", meta: "方便课中「拉合力」小实验" },
      ],
      recommendedPrompts: [
        "提醒孩子 18:55 准备",
        "我去找量角器",
        "课中需要我陪听吗",
        "课后给我一份要点",
      ],
    },
  },

  /* —— 家长 · 课中 —— */
  "pc-urgent": {
    kind: "template",
    data: {
      title: "紧急请假（孩子端代请）",
      subtitle: "如孩子身体不适或临时有事，可由你代请假，30 秒同步老师。",
      badges: [
        { label: "代请假", tone: "warning" },
        { label: "通知 3 方", tone: "info" },
        { label: "保留课时", tone: "success" },
      ],
      stats: [
        { label: "通知", value: "王老师 + 班主任", hint: "立即送达" },
        { label: "孩子端", value: "自动暂停", hint: "可看回放" },
        { label: "课时", value: "保留", hint: "支持补课" },
      ],
      bullets: [
        { icon: "🤒", title: "理由 1：身体不适", meta: "可附 1 张体温截图" },
        { icon: "🏠", title: "理由 2：家中临时事项", meta: "无需说明细节" },
        { icon: "📝", title: "理由 3：自定义 30 字", meta: "保留隐私" },
      ],
      recommendedPrompts: [
        "孩子身体不适，立即请假",
        "暂停 5 分钟，先让孩子喝水",
        "再坚持 10 分钟看看",
        "改成看回放就行",
      ],
    },
  },

  /* —— 家长 · 课后 —— */
  "pa-detail": {
    kind: "template",
    data: {
      title: "课后报告 · 完整详情",
      subtitle: "从课堂行为时间轴 / 答题分布 / 薄弱点诊断 三块全景看孩子表现。",
      badges: [
        { label: "完整版", tone: "info" },
        { label: "约 3 分钟阅读", tone: "default" },
        { label: "可下载", tone: "success" },
      ],
      stats: [
        { label: "课堂行为", value: "12 个事件", hint: "抢答 / 走神 / 笔记 ..." },
        { label: "答题分布", value: "5 道课中题", hint: "对 4 错 1" },
        { label: "薄弱点", value: "1 处", hint: "矢量方向判断" },
      ],
      bullets: [
        { icon: "🕒", title: "时间轴：19:03 抢答正确 → 19:18 走神 1 次 → 19:22 主动笔记", meta: "用时间维度看一节课" },
        { icon: "📊", title: "答题分布：方向判断 1/2 错（影响 4 分），正交分解全对", meta: "薄弱点已自动定位" },
        { icon: "🩺", title: "诊断建议：今晚做 3 道方向变式题，明早再回顾 5 分钟", meta: "节奏不必太紧" },
      ],
      recommendedPrompts: [
        "下载完整 PDF",
        "把诊断转给王老师确认",
        "今晚就让孩子做 3 道变式",
        "明早提醒回顾 5 分钟",
      ],
    },
  },
  "pa-support": {
    kind: "template",
    data: {
      title: "安排今晚陪练",
      subtitle: "针对孩子本节薄弱点，AI 已生成 3 套陪练方案，可直接加入家庭日历。",
      badges: [
        { label: "3 套方案", tone: "info" },
        { label: "约 15 分钟", tone: "default" },
        { label: "睡前完成", tone: "success" },
      ],
      stats: [
        { label: "方案 A", value: "重做错题", hint: "8 分钟" },
        { label: "方案 B", value: "口头复述", hint: "5 分钟" },
        { label: "方案 C", value: "看一遍回放", hint: "12 分钟" },
      ],
      bullets: [
        { icon: "🎯", title: "方案 A：陪孩子重做 3 道方向题，最直接", meta: "适合喜欢动手做的孩子" },
        { icon: "🗣", title: "方案 B：让孩子讲一遍合力规则，最巩固", meta: "适合喜欢表达的孩子" },
        { icon: "🎬", title: "方案 C：陪孩子看一遍本节录像 12 分钟", meta: "适合稳重的孩子" },
      ],
      recommendedPrompts: [
        "用方案 A 加进今晚日历",
        "A + B 一起来",
        "孩子今天太累了，改成方案 C",
        "明天再说",
      ],
    },
  },
}

/**
 * 线下课中专属 Skill 卡（PRD 2.5.1.C / 2.5.2 / 2.6.1 / 2.6.2 矩阵）。
 *
 * 命名约定 `oc-` 前缀（offline-classroom），仅在 deliveryMode === "offline" 时被解析；
 * 线上模式下这些 ID 不可见（Skill Tree 也不会列出）。
 */
const OFFLINE_OVERRIDES: Record<string, AiClassroomSkillCardConfig> = {
  /* —— 教师 · 线下课中 —— */
  "oc-tt-ifp": {
    kind: "template",
    data: {
      title: "智能黑板 · 板书拍照转文字",
      subtitle: `${OFFLINE_LESSON_HEADER}。线下上课时智能黑板已识别本节板书 4 张并自动归档，可一键发到学生 Pad。`,
      badges: [
        { label: "已归档 4 张", tone: "info" },
        { label: "识别准确率 96%", tone: "success" },
        { label: "线下增强", tone: "default" },
      ],
      stats: [
        { label: "板书 #1", value: "受力图", hint: "5'12 拍摄" },
        { label: "板书 #2", value: "正交分解", hint: "10'02 拍摄" },
        { label: "板书 #4", value: "三力平衡", hint: "38'40 拍摄" },
      ],
      bullets: [
        { icon: "📺", title: "智能黑板实时把板书识别后同步到学生 Pad", meta: "可一键发给指定小组" },
        { icon: "✏️", title: "板书 #2 正交分解：步骤 1-4 已转可编辑文字", meta: "支持二次批注" },
        { icon: "📦", title: "已自动放入今晚复习包附录", meta: "学生 Pad 可课后回看" },
      ],
      footerNote: "板书来源 = 智能黑板 + 教师手写公式（96% 识别准确率）",
      recommendedPrompts: [
        "把板书 #2 一键发给 C 组三人巩固",
        "把这 4 张板书加入下节预习包",
        "切到镜头自动追发言者",
        "调出物理学具记录站",
      ],
    },
  },
  "oc-tt-camera": {
    kind: "template",
    data: {
      title: "镜头自动追发言者 · 抬头率",
      subtitle: `${OFFLINE_LESSON_HEADER}。教室摄像头按发言者自动切镜，抬头率 / 走神情况实时回到这里。`,
      badges: [
        { label: "镜头追踪 ON", tone: "success" },
        { label: "抬头率 86%", tone: "info" },
        { label: "走神 2 起", tone: "warning" },
      ],
      stats: [
        { label: "已识别发言者", value: "11 人", hint: "前 12 分钟" },
        { label: "整班抬头率", value: "86%", hint: "比上节 +3" },
        { label: "走神事件", value: "2 起", hint: "陈可 / 王佳佳" },
      ],
      bullets: [
        { icon: "🎥", title: "AI 自动切镜：发言者一开口即特写", meta: "录播自动多机位拼接" },
        { icon: "📊", title: "整班抬头率热力（按座位）已生成", meta: "中后排 4 个座位偏低" },
        { icon: "🟡", title: "陈可走神 2 次（19:04 / 19:11）", meta: "建议靶向点名 1 次" },
      ],
      recommendedPrompts: [
        "单独点一次陈可的名",
        "把抬头率热力同步给班主任",
        "切到智能黑板板书识别",
        "调出物理学具记录站",
      ],
    },
  },
  "oc-tt-station": {
    kind: "template",
    data: {
      title: "物理学具记录站",
      subtitle: `${OFFLINE_LESSON_HEADER}。教室共享物理学具的借用 / 归还自动记到上课流水里。`,
      badges: [
        { label: "学具 5 套", tone: "info" },
        { label: "已使用 3 套", tone: "success" },
        { label: "1 套报修", tone: "warning" },
      ],
      stats: [
        { label: "弹簧测力计", value: "3 / 5", hint: "B 组 / C 组使用中" },
        { label: "无线麦", value: "2 / 2", hint: "全部在用" },
        { label: "量角器", value: "5 / 5", hint: "C 组使用中" },
      ],
      bullets: [
        { icon: "🧲", title: "B 组 拉合力实验：弹簧测力计 #2 / #3 在用", meta: "数据已记进流水" },
        { icon: "⚠️", title: "弹簧测力计 #4 卡顿，已报修", meta: "已生成报修单" },
        { icon: "🎙", title: "无线麦 #1 / #2 当前在 张楠 / 李小明 手中", meta: "上课时麦克风传递实时显示" },
      ],
      footerNote: "数据来源：教室学具站（刷卡借用 + 归还） + 资产管理系统。",
      recommendedPrompts: [
        "申请补 1 把弹簧测力计",
        "把无线麦传给陈可",
        "查 C 组当前实验进度",
        "联系后勤替换报修学具",
      ],
    },
  },

  /* —— 学生 · 线下课中 —— */
  "oc-st-pad": {
    kind: "template",
    data: {
      title: "教室共享 Pad · 私聊老师",
      subtitle: `你在 ${OFFLINE_CLASSROOM} 的座位上，可以在共享 Pad 上「私聊王老师」，不打扰别人；想让全班一起听就改用「举手 / 等无线麦」。`,
      badges: [
        { label: "Pad #03", tone: "info" },
        { label: "仅老师可见", tone: "default" },
        { label: "不打断节奏", tone: "success" },
      ],
      stats: [
        { label: "我的座位", value: "B 组 #4", hint: "靠窗第 2 排" },
        { label: "今日已问", value: "1 次", hint: "已收到老师批注" },
        { label: "本节得分", value: "+2", hint: "上次抢答正确" },
      ],
      bullets: [
        { icon: "🔒", title: "示例：F1 与 F3 反向相加为什么是 1N？", meta: "已发送 · 王老师会在板书间隙回" },
        { icon: "💬", title: "支持手写 / 拍题（题目拍照即转文字）", meta: "适合数学公式、图形题" },
        { icon: "🧭", title: "提示：把题号写清楚，老师回得更准", meta: "建议附上 Pad 截图" },
      ],
      footerNote: "线下上课时：Pad 走教室局域网，不开摄像头、不会被同学看到。",
      recommendedPrompts: [
        "示例：可以再讲一遍正交分解吗？",
        "拍一张题给老师",
        "改成举手 / 等无线麦（全班发言）",
        "查我今天的随堂题得分",
      ],
    },
  },
  "oc-st-mic": {
    kind: "template",
    data: {
      title: "举手 · 等无线麦",
      subtitle: `线下课堂直接举手，助教把无线麦递给你，AI 帮你计时、排队。`,
      badges: [
        { label: "队列第 2", tone: "info" },
        { label: "等待 ~12s", tone: "default" },
        { label: "实物麦", tone: "success" },
      ],
      stats: [
        { label: "我的状态", value: "举手中", hint: "排在第 2 位" },
        { label: "前 1 位", value: "张楠", hint: "已开始发言 8s" },
        { label: "麦克风", value: "无线麦 #1", hint: "助教传递中" },
      ],
      bullets: [
        { icon: "✋", title: "保持举手手势 5 秒以上，摄像头能识别到", meta: "AI 帮你排队" },
        { icon: "🎙", title: "助教按队列把无线麦递给你", meta: "约 12 秒后到位" },
        { icon: "📣", title: "拿到麦再说话，避免抢话", meta: "答对 +1 分，答错不扣" },
      ],
      recommendedPrompts: [
        "改成在 Pad 上私聊老师",
        "取消举手",
        "我答错了能不能再来一次",
        "看王老师讲到哪段了",
      ],
    },
  },

  /* —— 家长 · 线下课中 —— */
  "oc-pa-pickup": {
    kind: "template",
    data: {
      title: "孩子接送全过程",
      subtitle: `${DEMO_PARENT_CHILD.childName} 今晚的线下课在 ${OFFLINE_CLASSROOM}，接送已绑定，您可放心忙别的。`,
      badges: [
        { label: "已签到", tone: "success" },
        { label: "上课中", tone: "info" },
        { label: "19:50 离校时通知您", tone: "default" },
      ],
      stats: [
        { label: "18:55", value: "校门刷卡", hint: "已签到" },
        { label: "18:58", value: "进入 A301", hint: "二维码扫描" },
        { label: "19:50", value: "预计离校", hint: "下课后自动推" },
      ],
      bullets: [
        { icon: "🚸", title: "校门刷卡 18:55 ✓ · 已和您的接送账号绑定", meta: "孩子在校超 10 分钟没接走会主动通知您" },
        { icon: "📍", title: "已进入 A301 教室 · 上课中", meta: "教室摄像头巡检中" },
        { icon: "🔔", title: "下课前 5 分钟会自动告诉您：什么时候到接送区", meta: "免下楼等待" },
      ],
      footerNote: "数据来源：校门门禁刷卡 + 教室摄像头识别 + 接送绑定二维码。",
      recommendedPrompts: [
        "看一眼教室摄像头",
        "我能晚 10 分钟到吗？",
        "把接送通知也发给妈妈",
        "孩子离校后立刻提醒我",
      ],
    },
  },
  "oc-pa-monitor": {
    kind: "template",
    data: {
      title: "教室摄像头看一眼 · 抬头率",
      subtitle: `${OFFLINE_CLASSROOM} 摄像头摘要（机构默认开放，仅显示孩子座位区域）。`,
      badges: [
        { label: "整班抬头率 86%", tone: "info" },
        { label: "孩子专注度 88", tone: "success" },
        { label: "无异常", tone: "default" },
      ],
      stats: [
        { label: "孩子座位", value: "B 组 #4", hint: "靠窗第 2 排" },
        { label: "孩子专注度", value: "88", hint: "比上节 +6" },
        { label: "整班抬头率", value: "86%", hint: "高于均值" },
      ],
      bullets: [
        { icon: "👀", title: "孩子坐姿端正、抬头率良好（19:00-19:12）", meta: "注意力曲线已生成" },
        { icon: "🔕", title: "您看到的画面不显示其他学生面部", meta: "为保护隐私，只显示孩子座位区域" },
        { icon: "🛡️", title: "30 秒后自动关闭，不打扰课堂", meta: "下次能看：下课前 5 分钟" },
      ],
      footerNote: "线下课没有视频会议；这里只是教室摄像头的摘要，机构默认开放。",
      recommendedPrompts: [
        "现在看一眼摄像头 30 秒",
        "把结果同步给妈妈",
        "看接送全过程",
        "孩子状态有变化主动提醒我",
      ],
    },
  },
}

export function getAiClassroomSkillCardConfig(
  skillId: string,
  deliveryMode: LessonDeliveryMode = "online",
): AiClassroomSkillCardConfig | null {
  if (deliveryMode === "offline") {
    const override = OFFLINE_OVERRIDES[skillId]
    if (override) return override
  }
  return REGISTRY[skillId] ?? null
}

export function hasAiClassroomSkillCard(
  skillId: string,
  deliveryMode: LessonDeliveryMode = "online",
): boolean {
  if (deliveryMode === "offline" && Object.prototype.hasOwnProperty.call(OFFLINE_OVERRIDES, skillId)) {
    return true
  }
  return Object.prototype.hasOwnProperty.call(REGISTRY, skillId)
}

/**
 * 推荐指令文本 -> AI 文本回复的解析（demo 用）。命中关键词时返回联动文案，
 * 未命中时回 null（由调用方走默认文本回复）。
 *
 * `ctx` 可选：当前调用上下文（角色 / 课程形态）。**目前主要作为元数据透传**，
 * 用于将来按形态过滤分支（避免线上误命中"接送闭环"等仅线下出现的关键词）。
 * 现阶段所有分支按关键字命中即返回——线下专属关键词不会出现在线上 chip 文案里，
 * 互斥靠"上层 chip 集合"天然隔离，因此对结果不产生回归。
 */
export function resolveRecommendedPromptReply(
  prompt: string,
  ctx?: { role?: string; deliveryMode?: LessonDeliveryMode },
): string | null {
  void ctx
  const text = prompt.trim()
  if (!text) return null

  /* ============================================================
   * 6 条 IM 联动：命中关键词时 push eduImBus 事件，让用户切到对方身份立刻看到红点
   * ============================================================ */
  if (/一键发送|发送给家长|推送家长|发给家长|通知家长|发家长|群发家长/.test(text)) {
    EDU_IM_PRESETS.reportToParent()
    return [
      `已生成《课后报告 · ${DEMO_PARENT_CHILD.childName}》并推送给${DEMO_PARENT_CHILD.parentName}。`,
      `家长端将在 1 分钟内收到课后报告卡，可直接查看完整学情与今晚补强建议。`,
      `（已写入 IM：切到「场景八 家长」可看到「王老师」会话红点 +1）`,
      ``,
      `下一步可以：① 生成下节课变式题包；② 挑出 3 名待跟进学生预约一对一；③ 把高频错点归类到下节课导入。`,
    ].join("\n")
  }
  if (/转给(老师|王老师)|转老师|发给老师|老师答疑|现在转给王老师|请王老师/.test(text)) {
    EDU_IM_PRESETS.askTeacher()
    return [
      `已把第 7 题截图与你的解题过程转给王老师。`,
      `预计 15 分钟内会有批注，王老师会在课后 IM 私聊给你。`,
      `（已写入 IM：切到「场景六 教师」可看到「李小明」会话红点 +1）`,
      ``,
      `下一步可以：① 接着挑战下一道方向判断变式；② 把这道题加入错题本；③ 看提问帮手示范解法。`,
    ].join("\n")
  }
  if (/和王老师私聊|和老师私聊|联系老师|私聊老师|找王老师/.test(text)) {
    EDU_IM_PRESETS.privateChatInit()
    return [
      `已为你打开和王老师的私聊会话。可以直接发送疑问；如果是孩子学情问题，建议附上当节课报告链接（已放入草稿）。`,
      `（已写入 IM：切到「场景六 教师」可看到「李爸爸」会话红点 +1）`,
      ``,
      `下一步可以：① 问孩子薄弱点今晚怎么陪练；② 问下节课重点，提前帮孩子预习；③ 申请下次家长接送时间。`,
    ].join("\n")
  }

  /* ============================================================
   * v2 欢迎语 chip 新增闭环（pre / post × 3 角色，共 7 条）
   *
   * 注意：放在所有"既有更宽泛 regex 命中"之前，避免被通用关键词截胡（例如：
   * 「布置今晚作业」会被原 `我的作业|今晚作业|作业 ?清单` 抢先误判为学生作业，
   * 「看课堂风采」会被任何 `课堂` 类宽 regex 抢先；因此先做精准命中。）
   * ============================================================ */

  /** 老师 · 课前：备课检查清单（chip：🧰 备课检查清单） */
  if (/^开始备课检查清单$|备课检查清单|备课.*check|开课前检查清单/i.test(text)) {
    return [
      `《${DEMO_LESSON.title}》备课检查清单（已自动跑过 4 项）：`,
      `· 课件 v3.2 已挂载 ✓ · 分层预习包已生成 80% △ · 学情画像已就位 ✓`,
      `· 网络抖动 1 处（赵欣宇端 200ms）⚠ · 板书摄像头 1 台未连 ⚠`,
      `还差 2 件你拍板：① 把分层预习推给 32 位学生；② 修复 2 处直播链路。`,
      ``,
      `下一步可以：① 一键推送预习包给学生；② 修复直播链路问题；③ 看本节学情画像。`,
    ].join("\n")
  }

  /** 老师 · 课前：请假/调课审批（chip：🗓️ 请假/调课待审批） */
  if (/处理请假调课审批|请假调课审批|请假调课待审批|审批请假调课|请假调课.*待审/.test(text)) {
    return [
      `当前待你审批 3 条（含 ${DEMO_LESSON.className}）：`,
      `· 陈可 · 周三 19:00《力的合成与分解》请假（家长附说明：补课冲突）`,
      `· 林安然 · 周五 09:00 物理调课申请（学校活动冲突，希望调到周日同时段）`,
      `· 赵欣宇 · 周六 物理一对一调课（家长建议改为线上）`,
      `所有申请都符合校规，可一键通过；建议特别关注陈可（近 30 天 4 次请假）。`,
      ``,
      `下一步可以：① 一键全部通过；② 仅通过 2 条调课；③ 联系陈可家长沟通。`,
    ].join("\n")
  }

  /** 老师 · 课后：布置今晚作业（chip：📝 布置今晚作业） */
  if (/布置今晚作业|布置作业$|布置.*课后作业|今晚作业.*布置|派发今晚作业/.test(text)) {
    return [
      `已生成《${DEMO_LESSON.title} · 今晚作业》草稿（按本节学情自动配比）：`,
      `· 基础 5 道（巩固矢量与平行四边形定则）`,
      `· 变式 3 道（含本节高频错点：方向判断 2 道）`,
      `· 拓展 2 道（A 组拔高，C 组可跳过）`,
      `预计 30 分钟。可分层派发：A 组难、B 组中、C 组易。`,
      ``,
      `下一步可以：① 直接一键派发给全班；② 仅派发分层版本；③ 先预览整套作业再派发。`,
    ].join("\n")
  }

  /** 老师 · 课后：发送课堂风采给家长（chip：📷 发送课堂风采） */
  if (/发送课堂风采给家长|发送课堂风采|发课堂风采|推送课堂风采|课堂风采.*家长/.test(text)) {
    EDU_IM_PRESETS.reportToParent()
    return [
      `已生成《本节课堂风采集锦》（30 秒精剪）：`,
      `· 周予桐"用画图法解合力"亮点（10 秒）`,
      `· 班级齐声答题片段（10 秒）`,
      `· 老师对今天努力的同学集体表扬（10 秒）`,
      `已推送给 32 位家长；家长端将在 1 分钟内收到，可直接转发到家庭群。`,
      `（已写入 IM：切到「场景八 家长」可看到「王老师」会话红点 +1）`,
      ``,
      `下一步可以：① 把"亮点学员"单独剪 5 秒发给本人家长；② 归档到班级风采库；③ 再生成一版完整版（90 秒）。`,
    ].join("\n")
  }

  /** 学生 · 课前：看本节课件（chip：📚 看本节课件） */
  if (/看本节课件|看本节预习课件|课件预览$|本节课件预览|看一遍课件/.test(text)) {
    return [
      `《${DEMO_LESSON.title}》课件预览（共 12 页，约 5 分钟）：`,
      `· 第 1-3 页：力是什么 / 矢量基础（建议精看）`,
      `· 第 4-7 页：平行四边形定则 / 例题 1（重点，会出现在今晚作业）`,
      `· 第 8-12 页：分组练习 + 课堂小测（先跳过，上课时跟着做）`,
      `先看 1-7 页，剩下的等课堂上跟老师。`,
      ``,
      `下一步可以：① 现在就开始预习；② 重点看例题 1；③ 上课提醒我。`,
    ].join("\n")
  }

  /** 学生 · 课后：AI 答疑这道题（chip：🤖 AI 答疑这道题） */
  if (/AI ?答疑这道题|AI ?答疑$|帮我讲讲这道题|讲讲这道题|AI ?讲一道|AI ?解一道|AI ?助教.*答疑/i.test(text)) {
    return [
      `好，挑你本节最难的那道（第 7 题 · 方向判断）：`,
      `· 核心思路：先把两个力按 x / y 轴正交分解，再用勾股定理合成；`,
      `· 你的卡点：分解时把 F₂ 的方向画反了——记住"力的方向沿箭头"，箭头外指就是正向。`,
      `· 我可以一步一步带你把这道题再做一遍，每一步只问你一个问题。`,
      ``,
      `下一步可以：① 一步一步带我重做这道题；② 直接看完整解法；③ 把这道题加入错题本。`,
    ].join("\n")
  }

  /** 统一操作条 · 评价（老师：写本节评价；学生 / 家长：看老师本节评价） */
  if (/给学生写本节评价|给学生写评价|写本节评价|为学生写评价|本节评价撰写/.test(text)) {
    return [
      `已为《${DEMO_LESSON.title}》起草本节评价（按学情自动归类，可一键发送）：`,
      `· 优秀 6 名：周予桐 / 黄思齐 / 林安然 等（亮点：抢答准确率 ≥ 90%）`,
      `· 进步 9 名：含 ${DEMO_PARENT_CHILD.childName}（错题 +2 → 0；本节进步 3 名 ↑）`,
      `· 需关注 3 名：陈可（连续 2 节方向判断错）/ 赵欣宇 / 王佳佳`,
      `每条评价都附了具体场景与下一步建议，可直接群发给家长。`,
      ``,
      `下一步可以：① 一键群发评价给家长；② 仅发"需关注"3 位；③ 修改评价模板。`,
    ].join("\n")
  }
  if (/看老师本节评价|看老师评价|老师对我.*评价|本节评价反馈|老师给.*评价/.test(text)) {
    return [
      `王老师对你本节的评价（刚刚生成）：`,
      `· 总评：进步 3 名 ↑，方向判断 0/2 错（上节为 2/2 错），课堂抢答 1 次（答对）。`,
      `· 亮点：用画图法解合力 → 思路清晰，老师在课堂上点名表扬。`,
      `· 建议：今晚作业第 7 题方向判断需要再练一次，建议用 AI 答疑这道题串完整思路。`,
      ``,
      `下一步可以：① 看完整学情报告；② AI 答疑这道题；③ 把评价分享给家长。`,
    ].join("\n")
  }

  /** 统一操作条 · 签到（学生 / 家长） */
  if (/看我的签到记录|我的签到记录|^我的签到$|查看我的签到/.test(text)) {
    return [
      `你最近 4 节《${DEMO_LESSON.title}》签到：`,
      `· 本节（3/12 周三 19:00）✓ 准时到场`,
      `· 上节（3/5 周三 19:00）✓ 提前 5 分钟到`,
      `· 3/2 周日 一对一（19:00）⚠ 迟到 4 分钟`,
      `· 2/26 周三（19:00）✓ 准时到场`,
      `连续 3 节准时，状态稳定。`,
      ``,
      `下一步可以：① 申请补课（如有缺勤）；② 看本班签到排行榜；③ 设置上课前 10 分钟提醒。`,
    ].join("\n")
  }
  if (/看孩子的签到记录|孩子签到记录|孩子.*签到|^孩子签到$/.test(text)) {
    return [
      `${DEMO_PARENT_CHILD.childName} 最近 4 节《${DEMO_LESSON.title}》签到：`,
      `· 本节（3/12 周三 19:00）✓ 准时到场（19:00:00）`,
      `· 上节（3/5 周三 19:00）✓ 提前 5 分钟到`,
      `· 3/2 周日 一对一 ⚠ 迟到 4 分钟（已与老师沟通）`,
      `· 2/26 周三 ✓ 准时到场`,
      `近 30 天准时率 92%，处于优秀区间。`,
      ``,
      `下一步可以：① 设置上课前 30 分钟家长端提醒；② 看孩子全周课程签到；③ 和王老师私聊。`,
    ].join("\n")
  }

  /** 统一操作条 · 作业（家长视角） */
  if (/看孩子今晚作业|孩子今晚作业|孩子.*今晚.*作业|今晚孩子作业/.test(text)) {
    return [
      `${DEMO_PARENT_CHILD.childName} 今晚作业（来自《${DEMO_LESSON.title}》）：`,
      `· 1 项：10 道方向判断 + 正交分解，预计 30 分钟，难度 ★★☆`,
      `· 包含本节高频错点：方向判断 2 道（孩子本节卡点）`,
      `· 老师建议：先做基础 5 道，再尝试变式；卡住可以让孩子用 AI 答疑这道题。`,
      ``,
      `下一步可以：① 设置 19:30 提醒孩子开始；② 今晚怎么陪孩子；③ 和王老师私聊。`,
    ].join("\n")
  }

  /** 统一操作条 · 调课（学生申请） */
  if (/^申请调课$|^我要调课$|学生.*申请调课|提交调课申请|发起调课申请/.test(text)) {
    return [
      `已为你起草《${DEMO_LESSON.title}》调课申请（默认下周同时段）：`,
      `· 当前：3/12 周三 19:00 ~ 19:45`,
      `· 申请改到：3/16 周日 10:00 ~ 10:45（系统检测当前班级有 2 位同学也希望该时段）`,
      `请填写一句调课原因（学校活动 / 身体不适 / 其他），将由王老师在 4 小时内审批。`,
      ``,
      `下一步可以：① 提交申请（默认改到周日 10:00）；② 选其它候选时段；③ 取消调课改为正常上课。`,
    ].join("\n")
  }

  /** 统一操作条 · 沟通（老师 → 家长） */
  if (/给学生家长发消息|给家长发消息|私聊.*家长|联系家长|^找家长$|发消息给家长/.test(text)) {
    return [
      `请选择要联系的家长（按本节关注度排序）：`,
      `· 陈可家长（连续 2 节方向判断错，建议优先沟通）`,
      `· ${DEMO_PARENT_CHILD.childName}家长（本节进步 3 名 ↑，可发表扬）`,
      `· 王佳佳家长（缺勤 1 次，建议确认状态）`,
      `已为每位家长起草个性化模板，可一键发送。`,
      ``,
      `下一步可以：① 一键发"需关注"3 位；② 仅私聊陈可家长；③ 一键发"表扬"5 位。`,
    ].join("\n")
  }

  /** 统一操作条 · 成员（班级花名册） */
  if (/看本班成员名单|本班成员|班级成员|班级花名册|看班级成员|班级名单|班级人员/.test(text)) {
    return [
      `${DEMO_LESSON.className} · 本班 32 人（按本节出勤聚合）：`,
      `· 在课 30 人 ✓（含线上 4 人 / 线下 26 人）`,
      `· 请假 1 人：陈可（家长附说明：补课冲突）`,
      `· 调课待审批 1 人：林安然（学校活动冲突）`,
      `本节高活跃度 Top 3：周予桐 / 黄思齐 / 林安然。`,
      ``,
      `下一步可以：① 一键发"今天在课"统计给家长；② 查看本班花名册详情；③ 给家长群发消息。`,
    ].join("\n")
  }

  /** 统一操作条 · 资料（老师视角） */
  if (/看本节课资料|本节课资料|本节资料|看本节资料|课程资料/.test(text)) {
    return [
      `《${DEMO_LESSON.title}》本节资料包（已自动归档）：`,
      `· 课件 v3.2（12 页）+ 板书底图（4 张）`,
      `· 学情画像 1 份（本节高频错点：方向判断 mastery 58%）`,
      `· 课堂回放：直播录像 + 关键时刻索引（10 个标记）`,
      `· 课堂风采精剪 30 秒（已自动生成）`,
      ``,
      `下一步可以：① 一键归档到本班资料库；② 把课件分享给同年级同学科教师；③ 把回放发给请假学生。`,
    ].join("\n")
  }

  /** 家长 · 课后：看课堂风采（chip：📷 看课堂风采） */
  if (/^看课堂风采$|看本节课堂风采|看本节风采|课堂风采集锦|查看课堂风采/.test(text)) {
    return [
      `《本节课堂风采》30 秒精剪（${DEMO_PARENT_CHILD.childName} 出镜 2 次 · 主动抢答 1 次）：`,
      `· 0:08 课堂答题：${DEMO_PARENT_CHILD.childName} 主动抢答"合力 = 5N"（答对）`,
      `· 0:18 分组讨论：和同桌互讲解题思路（专注度高）`,
      `· 0:24 课堂总结：跟着齐声朗读公式`,
      `想看更长版本？可以请王老师推送 90 秒完整版到家庭群。`,
      ``,
      `下一步可以：① 把视频转发到家庭群；② 申请 90 秒完整版；③ 看完整学情报告。`,
    ].join("\n")
  }

  /* ============================================================
   * 教师 · 课前 / 备课闭环
   * ============================================================ */
  if (/采纳.*备课包|采纳标准课件|采纳精简|采用方案/.test(text)) {
    return [
      `已采纳所选备课包，基于本节学情自动生成分层预习包：A 组进阶 5 题、B 组巩固 4 题、C 组基础 3 题。`,
      ``,
      `下一步可以：① 一键推送预习包给学生；② 把课前预习同步给家长端；③ 加 1 道方向判断变式增加难度。`,
    ].join("\n")
  }
  if (/推送预习|推送给学生|发给学生|发预习/.test(text)) {
    return [
      `已把分层预习包发给 32 位学生，并按薄弱点匹配难度：陈可 / 赵欣宇 收到 C 组基础包 + 5 分钟讲解视频。`,
      `预计 18:50 前完成率 60%+；未完成的会自动 18:55 二次提醒。`,
      ``,
      `下一步可以：① 19:00 开课前看一眼完成率；② 再加 1 道高难变式给 A 组拔高；③ 把学情简报同步给班主任。`,
    ].join("\n")
  }
  if (/课前就位|就位检查/.test(text)) {
    return [
      `课前就位检查：① 教室 A1 直播链路 ✓；② 课件 v3.2 已挂载 ✓；③ 预习完成率 81% ✓；④ 32 / 32 学生设备在线 ✓。`,
      `还有 2 项待办：① 网络抖动 1 处（赵欣宇端 200ms）；② 板书摄像头一台未连。`,
      ``,
      `下一步可以：① 修复赵欣宇端网络（IM 提示家长重启路由）；② 启用备用板书摄像头；③ 把预习未完成的 6 人 IM 提醒。`,
    ].join("\n")
  }
  if (/查看(本节)?学情|学情简报|学情画像|查看学情/.test(text)) {
    return [
      `本节学情画像（${DEMO_LESSON.className} · 32 人）：`,
      `· 高完成度 12 人（作业 ≥ 90 分）`,
      `· 中等 14 人（60-89）`,
      `· 需关注 6 人（< 60 / 缺交）`,
      `高频薄弱：矢量方向判断（mastery 58%）。`,
      ``,
      `下一步可以：① 为亮点 5 人备拔高题包；② 给 6 名风险学员推送 5 分钟讲解视频；③ 把薄弱点导入下节课开场练习。`,
    ].join("\n")
  }
  if (/看本周签到明细|本周签到明细|查看签到明细/.test(text)) {
    return [
      `本周签到明细（${DEMO_LESSON.className} · 4 节课）：`,
      `· 周一 09:00 物理：应到 30 / 实到 30（100%）`,
      `· 周二 10:00 物理：应到 30 / 实到 28（93%，请假 1、迟到 1）`,
      `· 周三 09:00 物理：应到 30 / 实到 27（90%，请假 1、缺席 2）`,
      `· 周四 14:00 物理：应到 30 / 实到 29（97%，迟到 1）`,
      `周累计：缺勤 5 人次、迟到 2 人次、请假 2 人次。`,
      ``,
      `下一步可以：① 处理待补签申请；② 联系频繁请假家长；③ 导出本周考勤报表。`,
    ].join("\n")
  }
  if (/处理待补签|待补签申请|补签申请/.test(text)) {
    return [
      `当前待处理补签申请 2 条：`,
      `· 赵欣宇 · 周三 09:00 · 因家中网络断电，提交了路由日志截图`,
      `· 林安然 · 周四 14:00 · 上学路上接送延误，家长在群内已说明`,
      `两位学员均符合学校"事假可补签"规则，建议直接通过并同步家长。`,
      ``,
      `下一步可以：① 一键通过两条申请；② 仅通过赵欣宇；③ 退回并要求补充说明。`,
    ].join("\n")
  }
  if (/联系频繁请假家长|频繁请假家长|频繁请假/.test(text)) {
    return [
      `频繁请假学员 1 人：陈可（近 30 天 4 次请假，3 次为下午第二节）。`,
      `结合学情画像：陈可下午精力下滑明显，建议与家长沟通"调整作息 + 课后 15 分钟陪练"。`,
      `已为您起草沟通话术，包含本月请假记录、学情对比与改进建议。`,
      ``,
      `下一步可以：① 用模板私聊陈可家长；② 安排周末 10 分钟家访通话；③ 同步给班主任协同跟进。`,
    ].join("\n")
  }
  if (/导出本周考勤报表|导出考勤报表|考勤报表/.test(text)) {
    return [
      `已生成《${DEMO_LESSON.className} · 本周考勤报表》：`,
      `· 4 节课、120 人次、出勤率 96%`,
      `· 含逐节明细、缺勤原因分布、连续缺勤名单`,
      `报表已落到「教务-考勤-本周」目录，可一键发给班主任与教务。`,
      ``,
      `下一步可以：① 发给班主任；② 发给教务主任；③ 顺手生成本月汇总。`,
    ].join("\n")
  }
  if (/看本节课堂记录|本节课堂记录|查看课堂记录|本节回放/.test(text)) {
    return [
      `本节课堂记录已生成（${DEMO_LESSON.className} · 周三 09:00 · 时长 42 分钟）：`,
      `· 关键时刻 5 段（例题讲解 2 段、小测点评 1 段、分组讨论 2 段）`,
      `· 学生发言 14 次（亮点：周予桐解题思路；待跟进：李梓萱沉默）`,
      `· 高频错点 1 条：矢量方向判断（正确率 62%）`,
      ``,
      `下一步可以：① 把 5 段关键时刻发给学生家长；② 把高频错点导入下节课开场；③ 生成本节复习包。`,
    ].join("\n")
  }
  if (/浏览本周亮点片段|本周亮点片段|亮点片段/.test(text)) {
    return [
      `本周共 8 段亮点片段：`,
      `· 周一：周予桐"用画图法解合力"（90 秒）`,
      `· 周二：B 组"自创口诀记三定则"（120 秒）`,
      `· 周三：陈可"主动纠错并讲给同桌听"（45 秒）`,
      `· 周四：全班"快速完成 3 道方向变式"（60 秒）`,
      `其余 4 段为板书与小测亮点。`,
      ``,
      `下一步可以：① 选 3 段做本周亮点合集；② 推送给亮点学员家长；③ 归档到学情档案。`,
    ].join("\n")
  }
  if (/归档关键时刻|关键时刻归档|归档片段/.test(text)) {
    return [
      `当前未归档的关键时刻 2 段：`,
      `· 周三 09:18 · 「矢量分解」例题讲解（建议归档到错点资源库）`,
      `· 周四 14:25 · 「分组讨论收官」（建议归档到分组方案库）`,
      `归档后可在「教学模板」里直接套用到下节课。`,
      ``,
      `下一步可以：① 一键全部归档；② 仅归档错点片段；③ 给两段加上标签后再归档。`,
    ].join("\n")
  }
  if (/导出本周课堂日志|本周课堂日志|课堂日志/.test(text)) {
    return [
      `已生成《${DEMO_LESSON.className} · 本周课堂日志》：`,
      `· 4 节课、教学进度 100%、节奏偏快 1 节`,
      `· 含每节课重点、亮点片段索引、待优化点`,
      `日志已落到「教学-周报」目录，可发给教研组与备课组。`,
      ``,
      `下一步可以：① 发给教研组长；② 发给备课组协同；③ 顺手生成下周备课提纲。`,
    ].join("\n")
  }
  if (/新建出题模板|出题模板/.test(text)) {
    return [
      `准备新建出题模板：`,
      `· 学科：物理 · 章节：力的合成`,
      `· 题型组合：3 选择 + 1 填空 + 1 简答（可调）`,
      `· 难度梯度：基础→变式→拓展（按掌握度自动配比）`,
      `保存后可在所有班级一键调用，并自动套用本周高频错点。`,
      ``,
      `下一步可以：① 直接保存为「力的合成 · v1」；② 先生成 5 道示例题预览；③ 复制现有模板再改。`,
    ].join("\n")
  }
  if (/套用上次分组方案|上次分组|分组方案/.test(text)) {
    return [
      `已找到上次分组方案（周二 10:00 物理课）：`,
      `· 3 组均衡分配，每组 10 人`,
      `· 每组配 1 名亮点学员 + 1 名待跟进学员`,
      `已根据本节学情自动微调：B 组移除已请假的林安然，加入近期表现稳定的姜雨桐。`,
      ``,
      `下一步可以：① 直接套用到本节课；② 套用前再均衡一次；③ 仅套用 A、C 组分组。`,
    ].join("\n")
  }
  if (/同步术语表到全班|术语表|学科术语/.test(text)) {
    return [
      `当前术语表：力的合成（含合力、矢量、平行四边形定则等 18 条）。`,
      `同步后将出现在：① 学生侧"本节术语卡"；② 家长侧"陪练小词典"；③ 你的板书 OCR 自动比对库。`,
      ``,
      `下一步可以：① 同步到本班全部学生与家长；② 仅同步给学生；③ 先预览术语卡再同步。`,
    ].join("\n")
  }
  if (/浏览模板市场|模板市场/.test(text)) {
    return [
      `模板市场本周热门：`,
      `· 「力的合成 · 闯关式小测」（教研组 32 次套用）`,
      `· 「双人互讲分组方案」（市级公开课同款）`,
      `· 「初中物理高频错点术语卡 v3」`,
      `所有模板均可一键克隆到你的私有库再编辑。`,
      ``,
      `下一步可以：① 克隆「闯关式小测」；② 克隆「双人互讲分组」；③ 看本周新上架的全部模板。`,
    ].join("\n")
  }

  /* ============================================================
   * 教师 · 课中闭环
   * ============================================================ */
  if (/课堂出题|出一道|即时小测/.test(text)) {
    return [
      `已推送即时小测：「两力 F1=3N（向东）、F2=4N（向北），合力的方向最接近哪一项？」`,
      `应答率 91%，正确率 73%。可继续讲解或换题。`,
      ``,
      `下一步可以：① 讲解错点（30 秒动画）；② 出一道更难的方向变式；③ 让答对的学生互助答错的同桌。`,
    ].join("\n")
  }
  if (/智能分组|分组讨论|分小组/.test(text)) {
    return [
      `已生成 3 个智能小组（按本节掌握度均衡分配）：A 组 拔高 / B 组 巩固 / C 组 补强。`,
      `每组都配 1 名亮点学员和 1 名待跟进学员，互助效率最高。`,
      ``,
      `下一步可以：① 推送各组练习单；② 启动 8 分钟讨论倒计时；③ 在 C 组开启远程指导直播。`,
    ].join("\n")
  }
  if (/换节奏|放慢|节奏建议/.test(text)) {
    return [
      `已建议放慢 2 分钟。当前段「例题 2」用时已超预设 30 秒，正确率 62%。`,
      `给学生多 30 秒思考时间，效果会更好。`,
      ``,
      `下一步可以：① 维持当前节奏；② 提前进入习题（跳过总结）；③ 让 A 组先回答带动节奏。`,
    ].join("\n")
  }
  if (/板书 ?OCR|识别板书/.test(text)) {
    return [
      `已识别板书内容：`,
      `· 力的合成：F合 = F1 + F2（矢量加法）`,
      `· 平行四边形定则 / 三角形定则`,
      `· 正交分解：F合x、F合y`,
      `已自动同步到课件附录，并加入今晚的复习包。`,
      ``,
      `下一步可以：① 把板书拷贝给学生笔记本；② 标记重点内容（红色框）；③ 生成 1 道针对性练习题。`,
    ].join("\n")
  }

  /* ============================================================
   * 教师 · 课后闭环（除了 IM 触发以外）
   * ============================================================ */
  if (/生成下节课变式|变式题包|下节课导入|高频错题导入|归类到下节课/.test(text)) {
    return [
      `已生成下节课导入 5 道变式题，覆盖矢量方向、正交分解、平衡条件三个高频错点。可以直接拖入下节课课件包。`,
      ``,
      `下一步可以：① 一键加入下节备课包；② 再生成 5 道选做题；③ 把变式题做成预习卡推给学生。`,
    ].join("\n")
  }
  if (/挑出 3 名学生预约一对一|一对一辅导|安排一对一|预约辅导/.test(text)) {
    return [
      `已挑出陈可、赵欣宇、王佳佳 3 位同学的一对一辅导建议，预设时段：本周四 19:30 / 周五 19:30 / 周六 10:00。`,
      `已发出排课草稿，等你确认。`,
      ``,
      `下一步可以：① 一键确认时段；② 调整时段；③ 把辅导内容大纲发给家长。`,
    ].join("\n")
  }
  if (/对比.*进步|对比上节|对比.*学情/.test(text)) {
    return [
      `本节 vs 上节：达成度 +4%、互动率 +12%、错题率 -8%。`,
      `进步最大：李小明（+15 分）、张楠（保持满分）。`,
      `下滑：赵欣宇（-5 分，建议跟进）。`,
      ``,
      `下一步可以：① 表扬进步榜（IM 群发亮点）；② 给赵欣宇排辅导；③ 把进步对比同步给家长。`,
    ].join("\n")
  }
  if (/先看(.*)?报告|报告.*李小明|看李小明/.test(text)) {
    return [
      `《李小明 · 课后报告》：`,
      `· 课堂主动抢答 3 次，作业达成度 92%；`,
      `· 仍需加强矢量方向判断（mastery 64%）；`,
      `· 建议：今晚做 2 道方向变式 + 复述 1 次。`,
      ``,
      `下一步可以：① 一键发给家长；② 加入下节互助小组组长；③ 推送针对性变式题包。`,
    ].join("\n")
  }

  /* ============================================================
   * 学生 · 闭环
   * ============================================================ */
  if (/^举手|举手抢答|抢答|换成全班发言|全班发言|公开举手/.test(text)) {
    return [
      `已切到「全班发言」通道，举手排在第 4 位。王老师收到提示，预计 30 秒内点你。`,
      `（这是公开通道，同学也能看到你的发言）`,
      ``,
      `下一步可以：① 准备好答案要点；② 取消举手；③ 改成「私聊老师」（只老师能看到）。`,
    ].join("\n")
  }
  // 提问入口：不再使用「偷偷」字眼。先帮学生确认通道（私聊老师 / 全班发言），再进入对应技能。
  if (/^我要提问$|^想提问$|^提问$|^教室里我要提问$|有问题想问|我有问题|想问问题/.test(text)) {
    return [
      `好的，先确认下你想怎么问：`,
      `· 私聊老师：只有你和王老师能看到，老师会在板书间隙回你（适合不想打断节奏 / 怕被同学笑）。`,
      `· 全班发言：举手进入发言队列，同学也能听到（适合大家都该听的问题）。`,
      ``,
      `下一步可以：① 私聊老师（仅老师可见）；② 举手 / 全班发言；③ 看王老师当前讲到哪段。`,
    ].join("\n")
  }
  if (/私聊老师|私聊王老师|只老师能看到|仅老师可见|偷偷提问|私密提问|不广播|偷偷问|私问老师/.test(text)) {
    return [
      `已切到「私聊老师」通道，只有你和王老师能看到。直接输入你的问题，老师会在板书间隙回你。`,
      ``,
      `下一步可以：① 直接输入问题；② 上传题目截图；③ 改成「全班发言」（举手）。`,
    ].join("\n")
  }
  if (/紧急请假|请假申请|身体不适/.test(text)) {
    return [
      `已发出请假申请：身体不适，本节课无法上课。已同步家长李爸爸 + 班主任。`,
      `（已写入 IM：切到「场景六 教师」可看到「李小明」请假申请）`,
      ``,
      `下一步可以：① 申请补课（下周三同时段）；② 取消请假；③ 让我把今晚自学计划发给你。`,
    ].join("\n")
  }
  if (/打开错题挑战|去做错题挑战|去重做错题|开始挑战|开始重做|开始做.*错题|挑战 1 道|重做 1 道|重做错题/.test(text)) {
    return [
      `已加载本节高频错点：3 道方向判断变式题。从最简单的开始。`,
      `第 1 道：F1=3N（向东）、F2=4N（向北），求合力大小？`,
      ``,
      `下一步可以：① 直接作答；② 看一遍解题思路；③ 跳到第 2 道（更简单）。`,
    ].join("\n")
  }
  if (/做完预习|预习完成|完成预习/.test(text)) {
    return [
      `预习已完成 ✓。本节课重点：力的合成、矢量方向判断、正交分解。`,
      `预测：你掌握度 75%，重点关注矢量方向判断。`,
      ``,
      `下一步可以：① 看一遍知识点速览；② 提前做 1 道方向判断；③ 准备一下设备等开课。`,
    ].join("\n")
  }
  if (/知识点速览|快速复习/.test(text)) {
    return [
      `本节知识点 5 张卡：`,
      `① 矢量加法（平行四边形定则）② 三角形定则 ③ 正交分解 ④ 共点力平衡 ⑤ 多力合成`,
      ``,
      `下一步可以：① 1 张卡只看亮点；② 把第 ③ 张加入背诵清单；③ 进入预习作业。`,
    ].join("\n")
  }
  if (/上课提醒|提醒.*开课|提醒我/.test(text)) {
    return [
      `已设置 18:55 上课提醒（震动 + 横幅）。还有 1h 18m 开课。`,
      ``,
      `下一步可以：① 改成 18:50 提醒；② 加一个 19:00 的网络测速提醒；③ 取消提醒。`,
    ].join("\n")
  }
  if (/我的作业|今晚作业|作业 ?清单/.test(text)) {
    return [
      `今晚作业：1 项（10 道方向判断 + 正交分解）。难度：★★☆。预计 30 分钟。`,
      `已为你按薄弱点排序，先做你最弱的方向判断。`,
      ``,
      `下一步可以：① 现在开始；② 推迟到 21:00（提醒我）；③ 看一遍知识点再做。`,
    ].join("\n")
  }
  if (/我的报告|本节报告/.test(text)) {
    return [
      `《李小明 · 本节学习报告》：`,
      `· 抢答 3 次（全对）`,
      `· 作业完成 92%`,
      `· 班级排名 8（↑ 3）`,
      `· 薄弱点：矢量方向判断（继续加强）`,
      ``,
      `下一步可以：① 看本周对比；② 把报告发给家长；③ 进入重做错题巩固薄弱点。`,
    ].join("\n")
  }

  /* ============================================================
   * 家长 · 闭环（除了 IM 联动）
   * ============================================================ */
  if (/家庭日历|加入日历|加进日历|加到日历|加入家庭日历/.test(text)) {
    return [
      `已为你创建今晚 21:00 的「${DEMO_PARENT_CHILD.childName} · 物理补强 15 分钟」日历事项，并设置 5 分钟提醒。`,
      ``,
      `下一步可以：① 把伴学的角色（爸爸 / 妈妈）也加进去；② 改时间（如 20:30）；③ 加 1 个口头复述环节。`,
    ].join("\n")
  }
  if (/不催|让他自己来|让她自己来/.test(text)) {
    return [
      `好的。今晚不发催促提醒，只在 22:00 给你一份完成情况摘要。给孩子留点自我管理的空间也很重要。`,
      ``,
      `下一步可以：① 改成 21:30 摘要；② 改成完全不打扰；③ 把今晚建议发给孩子。`,
    ].join("\n")
  }
  if (/查看完整报告|完整报告/.test(text)) {
    return [
      `《${DEMO_PARENT_CHILD.childName} · ${DEMO_LESSON.subject} 课后完整报告》：`,
      `· 课堂行为时间轴：抢答 3 次（全对），走神 0 次`,
      `· 答题分布：本节 8/10，比上节 +2`,
      `· 薄弱点诊断：矢量方向判断 64% → 建议巩固`,
      ``,
      `下一步可以：① 安排今晚陪练；② 和王老师私聊；③ 把进步对比发到家庭群。`,
    ].join("\n")
  }
  if (/课前 ?3 件|3 件小事|课前注意事项|课前小事/.test(text)) {
    return [
      `课前 3 件小事（约 5 分钟）：`,
      `① 量角器：从书包侧袋拿出（提醒孩子）`,
      `② 灯光：调到护眼模式（家居 IoT 已识别）`,
      `③ 桌面：清干净，预留一张 A4 草稿纸`,
      ``,
      `下一步可以：① 一键全部完成；② 跳过桌面（孩子已就位）；③ 把这套小事变成每周三模板。`,
    ].join("\n")
  }
  if (/本节课预告|课程预告/.test(text)) {
    return [
      `今晚 ${DEMO_LESSON.startTime} 物理课《${DEMO_LESSON.title}》：`,
      `· 老师：王老师 · 教室：${DEMO_LESSON.classroom}`,
      `· 重点：力的合成、正交分解（孩子薄弱）`,
      `· 课前预习：完成 2/3，差矢量方向判断 2 道题`,
      ``,
      `下一步可以：① 提醒孩子完成预习；② 看孩子预习进度；③ 课前注意事项。`,
    ].join("\n")
  }
  if (/看一眼直播|直播.*30|30 ?秒.*直播/.test(text)) {
    return [
      `已为您打开 30 秒直播。当前画面：孩子正在抢答方向判断题，专注度 86%。`,
      `（30 秒后自动关闭，不打扰课堂；今天剩 0 次配额，明天 19:00 重置。）`,
      ``,
      `下一步可以：① 课程结束推送回看片段；② 申请追加 30 秒（需要老师同意）；③ 关闭直播。`,
    ].join("\n")
  }
  if (/状态有变化|有变化.*提醒|主动提醒我/.test(text)) {
    return [
      `已开启状态变化主动提醒。当孩子专注度连续 3 分钟低于 50% 或网络异常时，会立刻通知你。`,
      ``,
      `下一步可以：① 也提醒孩子被点名时；② 提醒频率改成每 10 分钟摘要；③ 关闭。`,
    ].join("\n")
  }
  if (/代孩子请假|代请假|请假/.test(text)) {
    return [
      `已发出代请假申请：${DEMO_PARENT_CHILD.childName} 今晚临时有事，本节课请假，明天补课。`,
      `（已写入 IM：切到「场景六 教师」可看到「李爸爸」代请假申请）`,
      ``,
      `下一步可以：① 申请补课时段；② 取消请假；③ 把请假原因加详细说明。`,
    ].join("\n")
  }
  if (/今晚怎么陪孩子|今晚家庭建议|家庭建议|今晚.*建议/.test(text)) {
    return [
      `今晚怎么陪孩子（约 15 分钟）：`,
      `① 21:00 陪孩子重做 3 道错题（孩子自己做，遇到困难叫您）`,
      `② 21:10 让孩子用自己的话复述"力的合成"（1 分钟）`,
      `③ 21:13 写一句话总结贴在书桌（强化记忆）`,
      ``,
      `下一步可以：① 加入家庭日历；② 让他自己来（不催）；③ 微调时长到 20 分钟。`,
    ].join("\n")
  }
  if (/安排今晚陪练|安排陪练|安排补强|补强方案|补强计划|陪练方案|陪练计划/.test(text)) {
    return [
      `已为您排好 3 段陪练：① 今晚 21:00 - 21:15（陪孩子重做错题）；② 周四 19:30（方向判断同类题 5 道）；③ 周六上午（线下 30 分钟）。`,
      ``,
      `下一步可以：① 全部加入家庭日历；② 改时段；③ 把方案发给王老师审核。`,
    ].join("\n")
  }
  if (/本周课表|查看课表/.test(text)) {
    return [
      `本周课程：周三 19:00 物理（今晚）；周五 19:00 物理；周六 10:00 物理（公开课）。`,
      `本周课时余额：12 / 已报 24。`,
      ``,
      `下一步可以：① 调换某节课时间；② 申请请假；③ 加入家庭日历。`,
    ].join("\n")
  }
  if (/续费|课时余额|余 ?\d+ ?课时/.test(text)) {
    return [
      `当前课时余额 12 节（约 4 周）。续费包：① 24 节包 ¥4800（性价比首选）② 48 节包 ¥9000（送私教 2 节）。`,
      `孩子物理学得不错，建议先续 24 节包看看效果。`,
      ``,
      `下一步可以：① 选 24 节包；② 选 48 节包；③ 暂不续。`,
    ].join("\n")
  }

  /* ============================================================
   * 第二批扩展：覆盖业务卡 recommendedPrompts 高频未命中关键词。
   *
   * 设计原则：
   * - 一律走"事实 + 下一步"两段式，下一步保持 3 个 chip（阅读 / 推荐打开率最佳）
   * - 下一步的文案要能再次命中本表里的关键词，构成"无限闭环"，避免点 chip 又掉到兜底
   * ============================================================ */

  /** 教师 · 备课 / 课件版本系 */
  if (/采用版本|改用版本|定稿版本|版本 ?[A-CＡ-Ｃ]/.test(text)) {
    return [
      `已采用所选版本课件，本节课件包已锁定 v3.2。配套微视频、虚拟实验、前测题已就位，可直接进入下一步。`,
      ``,
      `下一步可以：① 推送预习包给学生；② 课前就位检查；③ 再生成 1 版做对比。`,
    ].join("\n")
  }
  if (/再生成.*版|多生成 1 版|生成另一版/.test(text)) {
    return [
      `已新增 1 版本课件（v3.3 · 奥赛风），结构与现有版本对照如下：导入 1 道竞赛题、例题难度 +1、互动减少 1 处。可一键并排对比。`,
      ``,
      `下一步可以：① 并排对比当前两版；② 采用版本 A；③ 采用新版 v3.3。`,
    ].join("\n")
  }

  /** 教师 · 分组 / 分配学生系 */
  if (/采用此分组|采纳分组方案|采用分组|此分组方案/.test(text)) {
    return [
      `已采用 3 组方案，A / B / C 任务卡已推送到学生端。倒计时 8 分钟开始。`,
      ``,
      `下一步可以：① 启动 8 分钟讨论倒计时；② 在 C 组开启远程指导直播；③ 把分组结果同步给班主任。`,
    ].join("\n")
  }
  if (/把.*推到 ?C ?组|推到 ?C ?组|加入 ?C ?组|分配到 ?C ?组|分到 ?C ?组|推到补强组/.test(text)) {
    return [
      `已把所选学员加入 C 组（补强主题：方向判断）。已通知 C 组组长配 1 名小老师。`,
      ``,
      `下一步可以：① 把这 3 人的家长也通知；② 推送 C 组讲解视频；③ 启动 8 分钟讨论倒计时。`,
    ].join("\n")
  }
  if (/把.*组主题换成|换 ?[ABCＡＢＣ] ?组主题|换分组主题/.test(text)) {
    return [
      `已切换该组主题至「方向判断」。任务卡已重新推送给该组成员。`,
      ``,
      `下一步可以：① 同步给班主任；② 把这一主题导入下节课导入；③ 启动 8 分钟讨论倒计时。`,
    ].join("\n")
  }
  if (/为 ?[ABCＡＢＣ] ?组配 ?1 ?名|配.*小老师|互助小组组长|担任小老师/.test(text)) {
    return [
      `已为该组配 1 名小老师（张楠 · 整堂课主动答题 4 次全对）。已发出邀请，等张楠确认。`,
      ``,
      `下一步可以：① 把张楠的进步同步家长；② 给小老师发"组长指引卡"；③ 推送各组任务卡。`,
    ].join("\n")
  }

  /** 教师 · 推送 / 一键发送系（学员粒度） */
  if (/推送讲解视频|发讲解视频|发.*讲解视频|视频.*推给/.test(text)) {
    return [
      `已把 5 分钟讲解视频推送给所选学员（陈可 / 赵欣宇）。家长端会收到一条同步通知，便于晚上督促回看。`,
      `（已写入 IM：切到「场景八 家长」可看到「王老师」会话红点 +1）`,
      ``,
      `下一步可以：① 安排一对一辅导；② 把高频错点导入下节课开场；③ 推送预习包给学生。`,
    ].join("\n")
  }
  if (/把.*推送给.*学员|把.*推送给.*同学|把.*推给.*学员|推给.*同学|发给.*位同学/.test(text)) {
    return [
      `已把所选材料推送给目标学员，家长端 IM 同步收到 1 条提示。预计 18:50 前完成率 60%+。`,
      `（已写入 IM：切到「场景八 家长」可看到「王老师」会话红点 +1）`,
      ``,
      `下一步可以：① 把推送结果同步给班主任；② 加 1 道高难变式给 A 组；③ 看完成率。`,
    ].join("\n")
  }
  if (/把虚拟量角器|推送.*量角器|推送给周晓|推送给王佳佳|推送给陈可|推送给.*[\u4e00-\u9fa5]{2,3}$/.test(text)) {
    return [
      `已把所选工具 / 提示推送到目标学员端，已开启 IM 静默通道，不打断当前授课节奏。`,
      ``,
      `下一步可以：① 启用板书 OCR；② 切换到分组讨论 30 秒；③ 把这两个问题归类到下节复盘。`,
    ].join("\n")
  }
  if (/对.*回复|回复 ?[\u4e00-\u9fa5]{2,3}|私聊回复/.test(text)) {
    return [
      `已发出私聊回复，IM 走静默通道（不广播）。学员端会在板书空隙看到提示。`,
      ``,
      `下一步可以：① 把这两个问题归类到下节复盘；② 切换到分组讨论 30 秒；③ 启用板书 OCR。`,
    ].join("\n")
  }
  if (/给陈可发上课提醒|发上课提醒.*[\u4e00-\u9fa5]{2,3}|提醒.*学员上课/.test(text)) {
    return [
      `已通过 IM 发出上课提醒，并同步家长端（建议家长检查孩子设备）。`,
      `（已写入 IM：切到「场景六 教师」侧栏 / 切到「场景八 家长」可看红点）`,
      ``,
      `下一步可以：① 把家长一并通知；② 出一道随堂题；③ 启用板书 OCR。`,
    ].join("\n")
  }

  /** 教师 · 一键发全班 / 板书系 */
  if (/一键发给全班|发给全班|全班同学|发到全班/.test(text)) {
    return [
      `已一键发到全班 32 人。家长端 IM 同步收到 1 条软提示，便于晚上督促回看。`,
      ``,
      `下一步可以：① 只发 C 组三人巩固；② 把材料导入下节课开场；③ 启用板书 OCR。`,
    ].join("\n")
  }
  if (/把板书.*转|板书.*动画|板书.*配.*口播|板书.*推/.test(text)) {
    return [
      `已把指定板书转成动画 / 配 30 秒口播片段，已自动归入今晚复习包。学员可在子 CUI 内回看。`,
      ``,
      `下一步可以：① 一键发到全班；② 只发 C 组三人巩固；③ 把板书加入下节预习包。`,
    ].join("\n")
  }

  /** 教师 · 节奏 / 讨论系 */
  if (/采用建议 ?[123]|采纳建议 ?[123]|采用节奏建议/.test(text)) {
    return [
      `已采用所选节奏建议，下一段例题 / 习题已重新排序，AI 在板书空隙给提示。`,
      ``,
      `下一步可以：① 提醒 B 组组长收言；② 把拓展讨论挪到下节；③ 再出一道随堂题。`,
    ].join("\n")
  }
  if (/提醒.*组长.*收|提醒 B ?组组长|让.*组长收言|让组长收言/.test(text)) {
    return [
      `已私聊 B 组组长（IM 静默）：请在 30 秒内收尾发言。AI 已生成接续提示词。`,
      ``,
      `下一步可以：① 再出一道随堂题；② 启用板书 OCR；③ 切换到分组讨论 30 秒。`,
    ].join("\n")
  }
  if (/挪到下节|拓展讨论.*下节|把.*挪到下节|把.*放到下节/.test(text)) {
    return [
      `已把拓展讨论挪到下节课导入，本节回收的 5 分钟用于多讲 1 个易错点（矢量方向）。`,
      ``,
      `下一步可以：① 把挪后内容生成下节备课条目；② 把高频错点导入下节课开场；③ 再出一道随堂题。`,
    ].join("\n")
  }
  if (/继续保持.*节奏|保持当前节奏|不改节奏/.test(text)) {
    return [
      `保持当前节奏，AI 在每 5 分钟节点静默提示一次「是否需要换节奏」。已记录决策。`,
      ``,
      `下一步可以：① 出一道随堂题；② 启用板书 OCR；③ 智能分组 8 分钟。`,
    ].join("\n")
  }
  if (/切换到分组讨论|启动.*讨论|启动分组讨论|讨论 ?\d+ ?秒|讨论倒计时/.test(text)) {
    return [
      `已启动 8 分钟分组讨论倒计时，A / B / C 任务卡同步推送。`,
      ``,
      `下一步可以：① 提醒 B 组组长收言；② 启用板书 OCR；③ 推送各组任务卡到学生端。`,
    ].join("\n")
  }
  if (/再来一道|再出一道|多出一道|出一道更难|换一道/.test(text)) {
    return [
      `已生成新一道方向判断变式题，难度 ★★★（比原题高 1 档），同步发送到全班学生端。`,
      ``,
      `下一步可以：① 让答对的同学互助答错的同桌；② 切换到分组讨论 30 秒；③ 再出一道更难的随堂题。`,
    ].join("\n")
  }
  if (/讲解.*为什么|讲一遍.*为什么|为什么.*正解|为什么.*53|为什么.*30/.test(text)) {
    return [
      `已生成 30 秒讲解动画：F1 与 F2 矢量相加得合力 5N，方向角 53°（不是 30°）。学生端可重放。`,
      ``,
      `下一步可以：① 把讲解动画推送到家长端；② 把这一题加入下节课开场；③ 再来一道方向判断题。`,
    ].join("\n")
  }

  /** 教师 · 课后 · 通知 / 同步 / 导出 系 */
  if (/通知班主任|通知教研|通知后勤|和班主任同步|联系后勤/.test(text)) {
    return [
      `已 IM 通知所选对象（含本节学情简报附件），48 小时内可查询签收回执。`,
      `（已写入 IM：切到「场景六 教师」可看到对应会话红点）`,
      ``,
      `下一步可以：① 同步进步 Top3 给家长群；② 给退步 3 人安排一对一；③ 导出本章趋势报告。`,
    ].join("\n")
  }
  if (/导出.*简报|导出.*报表|导出.*报告|导出.*PDF|导出.*趋势|导出本章趋势|导出做下节复习/.test(text)) {
    return [
      `已导出 PDF 至「我的下载」（5.2 MB · 含本节 + 上节 + 本章趋势对比）。可直接邮件给教研组 / 班主任。`,
      ``,
      `下一步可以：① 通知班主任并附 PDF；② 把进步 Top3 通报家长群；③ 安排一对一辅导。`,
    ].join("\n")
  }
  if (/复核.*作业|复核.*同学|复核陈可|复核赵欣宇|复核学员/.test(text)) {
    return [
      `已打开所选学员的逐题复核界面（陈可：4/10，3 题方向判断全错）。AI 已逐题给出建议批注，可一键接受 / 调整。`,
      ``,
      `下一步可以：① 推送讲解视频给陈可；② 安排一对一辅导；③ 把高频错点导入下节课开场。`,
    ].join("\n")
  }
  if (/为亮点.*题包|为亮点学员.*拔高|拔高题包|生成拔高/.test(text)) {
    return [
      `已为亮点 5 人（张楠 / 刘一菲 / 孙浩然等）生成拔高题包：奥赛型 5 道 + 综合 1 道，难度 ★★★。`,
      ``,
      `下一步可以：① 一键推送给亮点学员；② 把拔高题包加入下节备课；③ 推送预习包给学生。`,
    ].join("\n")
  }

  /** 教师 · 双语 / 术语系 */
  if (/投屏.*术语|投屏第 ?\d+ ?个|投屏术语表|术语投屏/.test(text)) {
    return [
      `已投屏所选术语（vector / resultant force / decomposition），中英对照 + 美式发音同步显示，30 秒后自动隐藏。`,
      ``,
      `下一步可以：① 切换到英式发音；② 把术语表推送给全班；③ 下节用日语版做实验。`,
    ].join("\n")
  }
  if (/切换.*发音|英式发音|美式发音|换成发音/.test(text)) {
    return [
      `已切换至英式发音（BrE）。下次投屏时使用，不打断当前授课节奏。`,
      ``,
      `下一步可以：① 投屏第 1 个术语；② 把术语表推送给全班；③ 下节用日语版做实验。`,
    ].join("\n")
  }
  if (/术语表.*推|推.*术语表|术语推送|发术语表/.test(text)) {
    return [
      `已把本节术语表（6 个核心术语）推送到全班学生端，学员可在子 CUI 内随时回看。`,
      ``,
      `下一步可以：① 投屏第 1 个术语；② 切换到英式发音；③ 把术语加入下节预习包。`,
    ].join("\n")
  }

  /** 教师 · 进步 / 通报系 */
  if (/进步 ?Top ?3|通报家长群|发到家长群|进步榜.*家长|把进步.*家长/.test(text)) {
    return [
      `已生成进步 Top3 海报（李小明、刘一菲、孙浩然）+ 1 句具体的话表扬，发到 32 人家长群。`,
      `（已写入 IM：切到「场景八 家长」可看到家长群红点 +1）`,
      ``,
      `下一步可以：① 给退步 3 人安排一对一；② 导出本章趋势报告；③ 和班主任同步本节情况。`,
    ].join("\n")
  }
  if (/退步 ?3 ?人|为退步.*一对一|安排.*一对一/.test(text)) {
    return [
      `已为退步 3 人（陈可 / 赵欣宇 / 王佳佳）生成一对一辅导草稿（本周四 19:30 / 周五 19:30 / 周六 10:00）。`,
      ``,
      `下一步可以：① 一键确认时段；② 把辅导内容大纲发给家长；③ 推送讲解视频先期补强。`,
    ].join("\n")
  }

  /** 教师 · 课表 / 历史回看 */
  if (/查看上节(包|课用)?|查看上周(课表|包)?|看上节课报告/.test(text)) {
    return [
      `上节《合力分解 · 入门》：均分 76、互动 79%、错题率 32%。本节相对均分 +4。`,
      `本节高频错点 3 处中，2 处与上节延续（矢量方向、正交分解）。`,
      ``,
      `下一步可以：① 对比本节进步；② 把上节高频错点导入今天复习；③ 导出本章趋势报告。`,
    ].join("\n")
  }
  if (/把.*问题归类|归类到下节|加入下节复盘|归入下节复盘/.test(text)) {
    return [
      `已归档至「下节复盘 · 待处理」清单（共 5 条），AI 会在下节备课时自动顶到例题前。`,
      ``,
      `下一步可以：① 再出一道随堂题；② 启用板书 OCR；③ 切换到分组讨论 30 秒。`,
    ].join("\n")
  }
  if (/把.*导入下节课开场|高频错点导入下节|开场 ?5 ?分钟|开场练习/.test(text)) {
    return [
      `已把所选错点（共 3 组，覆盖 18 人）拖入下节课开场 5 分钟练习，AI 自动配 1 段动画解析。`,
      ``,
      `下一步可以：① 一键加入下节备课包；② 再生成 5 道选做题；③ 给家长侧推一条"今晚陪练"提示。`,
    ].join("\n")
  }
  if (/把.*生成预习卡|预习卡推给学生/.test(text)) {
    return [
      `已把所选材料生成 1 张预习卡（约 5 分钟用时），自动推送到 32 名学生端。家长端 IM 同步可见。`,
      ``,
      `下一步可以：① 看完成率；② 推送讲解视频给陈可；③ 通知家长群。`,
    ].join("\n")
  }

  /* ============================================================
   * 管理者（场景九）· 教学 / 管理 / 经营闭环
   * ============================================================ */
  if (/新建课程模板|复制教案|补齐课后练习|发布本周教学目标/.test(text)) {
    return [
      `课程与教案已更新：模板库新增 1 份，待审核教案 3 份，并已标记 2 门缺课后练习课程。`,
      ``,
      `下一步可以：① 复制教案到新班；② 补齐课后练习；③ 导出课程改版清单。`,
    ].join("\n")
  }
  if (/新建排课|调整课表|导出课表|排课与课表/.test(text)) {
    return [
      `已打开排课与课表管理：本周 186 节课中有 7 处时间冲突、2 处教室冲突，已按优先级排序。`,
      ``,
      `下一步可以：① 处理排课冲突；② 调整课表；③ 导出课表给班主任。`,
    ].join("\n")
  }
  if (/新增成员|角色权限|离职停用|分配老师到班级/.test(text)) {
    return [
      `成员管理已同步：待开通账号 3 人、待分班老师 2 人。您可以直接批量处理。`,
      ``,
      `下一步可以：① 新增成员；② 调整角色权限；③ 处理离职停用。`,
    ].join("\n")
  }
  if (/处理转班申请|满班预警|同步分班通知|导出班级名单/.test(text)) {
    return [
      `班级与分班当前有 6 条转班申请、3 个满班预警班级。已生成推荐分班方案供确认。`,
      ``,
      `下一步可以：① 处理转班申请；② 查看满班预警；③ 同步分班通知。`,
    ].join("\n")
  }
  if (/派单维修设备|补充教学物资|查看教室占用|导出资源日报/.test(text)) {
    return [
      `教室与资源已更新：2 间维修中、4 条工单待处理。可直接派单并追踪完成时效。`,
      ``,
      `下一步可以：① 派单维修设备；② 补充教学物资；③ 查看教室占用。`,
    ].join("\n")
  }
  if (/新建课包商品|调整商品价格|上下架课程商品|查看商品转化/.test(text)) {
    return [
      `课程商品中心已打开：在售 36 个，本月上新 4 个，低转化 2 个已标红。`,
      ``,
      `下一步可以：① 新建课包商品；② 调整商品价格；③ 上下架课程商品。`,
    ].join("\n")
  }
  if (/待支付订单|退款申请|异常订单|导出今日对账单|订单管理/.test(text)) {
    return [
      `订单管理已汇总：今日 28 笔订单，待支付 6 笔，退款处理中 2 笔，异常 1 笔。`,
      ``,
      `下一步可以：① 查看待支付订单；② 处理退款申请；③ 导出今日对账单。`,
    ].join("\n")
  }
  if (/高风险名单|续费漏斗|流失原因|续费与流失|发续费方案/.test(text)) {
    return [
      `续费与流失看板已更新：本周到期 32 人，已续费 21 人，高风险 6 人，已流失 2 人。`,
      ``,
      `下一步可以：① 跟进高风险名单；② 发续费方案；③ 查看流失原因。`,
    ].join("\n")
  }

  /** 学生 · 概念 / 解释系 */
  if (/讲讲|讲一下|讲一遍|解释一下|解释.*为什么|什么是矢量|什么是合力/.test(text)) {
    return [
      `给你打个比方：合力就像两个人一起拉一辆车——力的大小是「拉得多猛」，方向是「往哪儿拉」。`,
      `两人朝同一方向 → 合力 = 力之和；方向不同 → 用平行四边形法则。`,
      ``,
      `下一步可以：① 用一个生活例子讲合力；② 做 3 道前置题；③ 上课提醒我。`,
    ].join("\n")
  }
  if (/用.*生活例子|用.*例子.*合力|用.*类比/.test(text)) {
    return [
      `生活例子：拔河比赛 1 队 5 人合力 150N 向左，2 队 4 人合力 130N 向右，合力 = 20N 向左 → 1 队赢。`,
      `如果两队左右拉成 90°，就要用平行四边形法则算斜方向合力。`,
      ``,
      `下一步可以：① 做 3 道前置题；② 我看不懂方向判断；③ 进入预习作业。`,
    ].join("\n")
  }
  if (/我看不懂.*矢量|看不懂矢量|看不懂卡片|看不懂.*分解/.test(text)) {
    return [
      `没关系，我们换个角度：把"力"想成"箭头"。箭头有长度（=大小）和方向（=往哪指）。两个箭头怎么"加"，就用平行四边形法则。`,
      ``,
      `下一步可以：① 看 30 秒动画；② 用一个生活例子讲合力；③ 做 3 道前置题。`,
    ].join("\n")
  }
  if (/做.*前置题|前置 ?\d+ ?道|做完前置/.test(text)) {
    return [
      `已加载前置 3 道：方向判断 / 求合力大小 / 受力图。从最简单的开始，做错可以叫我讲。`,
      ``,
      `下一步可以：① 直接作答；② 看一遍解题思路；③ 跳到第 2 题（更简单）。`,
    ].join("\n")
  }
  if (/^下一步$|进入下一步|继续下一步|开始下一步/.test(text)) {
    return [
      `好，进入下一步。当前进度 1/3，建议先把卡片 ③ 看完再做小题，效率更高。`,
      ``,
      `下一步可以：① 看完做 2 道前置题；② 用一个生活例子讲合力；③ 进入虚拟实验。`,
    ].join("\n")
  }

  /** 学生 · 设备 / 网络 / 求助 */
  if (/麦克风|耳麦|听不到|声音听不见|没声音/.test(text)) {
    return [
      `已为你做 30 秒自检：麦克风通路正常、降噪已开。如仍听不到，建议刷新一次或切到耳机模式。`,
      ``,
      `下一步可以：① 切到耳机模式；② 让提问帮手帮我看一眼；③ 转给老师答疑。`,
    ].join("\n")
  }
  if (/答错.*再来一次|能否再来一次|让我再来一次|重抢一次/.test(text)) {
    return [
      `好的，下一题我会再优先点你（队列已记入）。抢答答错不扣分，放心来。`,
      ``,
      `下一步可以：① 准备好答案要点；② 改成「私聊老师」直接发文字给老师；③ 取消举手。`,
    ].join("\n")
  }

  /** 学生 · 提问帮手 / 提示 / 思路 */
  if (/陪我做|陪练.*题|学伴.*做题|提问帮手.*做题|示范解法|看学伴示范|看提问帮手示范|让提问帮手|问提问帮手/.test(text)) {
    return [
      `提问帮手上线了。我不会直接给答案，但会用提问帮你理清思路。第 1 题：F1 和 F3 是不是反向抵消了？`,
      ``,
      `下一步可以：① 我觉得是；② 我觉得不是；③ 给一个生活例子帮我理解。`,
    ].join("\n")
  }
  if (/讲一遍.*思路|讲解.*思路|讲思路|思路.*再讲/.test(text)) {
    return [
      `方向判断的思路 3 步：① 画受力图；② 选坐标系（习惯东 = x 正、北 = y 正）；③ 分量加和后再看 arctan。`,
      ``,
      `下一步可以：① 现在开始做；② 陪我做第 7 题；③ 看一遍解题动画。`,
    ].join("\n")
  }
  if (/我学完了|我看完了|学完了.*回顾|回顾一下/.test(text)) {
    return [
      `不错！本节核心 3 个概念你都掌握了：矢量、合力、正交分解。建议睡前把"为什么 53° 不是 30°"用自己的话说一遍。`,
      ``,
      `下一步可以：① 我的报告；② 重做错题；③ 把今天的亮点告诉爸爸。`,
    ].join("\n")
  }
  if (/太累了|改成.*回放|看回放就行|改成回放|不上了.*回放/.test(text)) {
    return [
      `好的，今天就先休息。已为你切换为"看回放"模式（明天 8:00 前会推送回放剪辑 + 3 道核心题）。`,
      ``,
      `下一步可以：① 关掉所有提醒；② 把回放推到我家长端；③ 明天再说。`,
    ].join("\n")
  }
  if (/明天再说|明天再来|明早再说|改天再说/.test(text)) {
    return [
      `好。今晚不打扰你，把今晚作业改到明早 8:00 - 9:00 时段提醒，与回放剪辑一起出现。`,
      ``,
      `下一步可以：① 关掉今晚所有提醒；② 我的报告；③ 把今天的亮点告诉爸爸。`,
    ].join("\n")
  }
  if (/示例.*提问|示例.*问|示例：/.test(text)) {
    return [
      `已发送示例提问到老师私聊（不会广播）。预计 30 秒内老师会在板书空隙回应。`,
      ``,
      `下一步可以：① 直接输入新的问题；② 切回公开举手；③ 把这个问题加入我的错题本。`,
    ].join("\n")
  }
  if (/把.*告诉(爸爸|妈妈|爸妈|家长)|告诉(爸爸|妈妈|爸妈|家长)|分享.*家长/.test(text)) {
    return [
      `已把你今天的亮点（第 3 次抢答方向题答对 +2 分）发给爸爸（${DEMO_PARENT_CHILD.parentName}）的微微 AI。`,
      `（已写入 IM：切到「场景八 家长」可看到「李小明」会话红点 +1）`,
      ``,
      `下一步可以：① 重做错题巩固；② 我的报告；③ 明天上课提醒我。`,
    ].join("\n")
  }
  if (/我哪里.*进步|哪里能进步|哪里需要进步|继续进步/.test(text)) {
    return [
      `从这周看，最该进步的是矢量方向判断（mastery 64%）。建议今晚 3 道方向变式 + 明早回顾 5 分钟。`,
      ``,
      `下一步可以：① 进入重做错题；② 把进步计划告诉爸爸；③ 提醒我明天回顾。`,
    ].join("\n")
  }
  if (/我先做.*题|先做选择|先做计算|先做.*哪类/.test(text)) {
    return [
      `好，先做选择题（前 6 道 · 方向判断为主）。做完会自动解锁后 4 道计算题。`,
      ``,
      `下一步可以：① 直接作答；② 卡住请叫我讲思路；③ 切到重做错题先练手。`,
    ].join("\n")
  }
  if (/把这道题加入错题本|加入我的错题本|加错题本|加入错题本不转老师/.test(text)) {
    return [
      `已加入错题本（错点：方向判断），自动配 2 道变式题。明天回顾会自动出现。`,
      ``,
      `下一步可以：① 进入重做错题；② 让我老师看一下；③ 看一遍正解动画。`,
    ].join("\n")
  }

  /** 学生 · 提醒系 */
  if (/把 ?\d+:\d+ ?的提醒改成|改成 ?\d+:\d+|把.*改到 ?\d+:\d+|改时间.*提醒/.test(text)) {
    return [
      `已把上课提醒改到所选时间，并保留 5 分钟前预提醒。免打扰时段会自动跳过。`,
      ``,
      `下一步可以：① 顺便提醒我做预习；② 关掉所有提醒；③ 改成只看回放。`,
    ].join("\n")
  }
  if (/顺便提醒我做预习|提醒我.*预习|预习提醒/.test(text)) {
    return [
      `已加 1 条预习提醒（17:30，5 分钟视频 + 2 道前置题）。如未完成，18:55 会再次轻提醒。`,
      ``,
      `下一步可以：① 现在就开始预习；② 改时间；③ 关掉所有提醒。`,
    ].join("\n")
  }
  if (/关掉.*提醒|关闭所有提醒|不要提醒/.test(text)) {
    return [
      `好，今晚的所有提醒都已关闭，只在 22:00 给你一份完成情况摘要。`,
      ``,
      `下一步可以：① 改成 21:30 摘要；② 改成完全不打扰；③ 我太累了改成回放。`,
    ].join("\n")
  }

  /** 学生 · 请假精细化 */
  if (/家里.*临时|家里有事|临时有事/.test(text)) {
    return [
      `已发出请假申请：家中临时事项，本节课请假，下周三可补一节。已同步家长 + 班主任。`,
      `（已写入 IM：切到「场景六 教师」可看到「李小明」请假申请）`,
      ``,
      `下一步可以：① 申请下周三补课；② 取消请假；③ 改成看回放。`,
    ].join("\n")
  }
  if (/暂停 ?\d+ ?分钟|喝水|休息一下/.test(text)) {
    return [
      `已暂停 5 分钟（系统自动同步老师）。课中状态保持，回到时不会打断你的进度。`,
      ``,
      `下一步可以：① 继续上课；② 紧急请假；③ 「私聊老师」告诉老师原因。`,
    ].join("\n")
  }
  if (/再坚持 ?\d+ ?分钟|再坚持.*分钟看看|继续上完/.test(text)) {
    return [
      `好，继续上课。系统会在 10 分钟后自动检查你的状态；如果还不舒服会主动提示请假。`,
      ``,
      `下一步可以：① 「私聊老师」告诉老师；② 紧急请假；③ 切到耳机模式。`,
    ].join("\n")
  }

  /** 学生 · 转给老师边界 */
  if (/先问学伴一次|先问学伴|问学伴.*一次|先问提问帮手一次|问提问帮手.*一次/.test(text)) {
    return [
      `好，提问帮手上线了。我用提问帮你想一遍：你算到的合力大小是多少？方向偏了几度？`,
      ``,
      `下一步可以：① 我觉得对了；② 还是不对；③ 现在转给王老师。`,
    ].join("\n")
  }
  if (/我再想 ?\d+ ?分钟|再想想|再思考/.test(text)) {
    return [
      `好，给你 5 分钟自己想。我会在 5 分钟后回来问你"想到哪一步了"。`,
      ``,
      `下一步可以：① 现在就转给王老师；② 切到提问帮手示范解法；③ 加入错题本不转老师。`,
    ].join("\n")
  }

  /** 家长 · 提醒孩子系 */
  if (/提醒孩子.*\d+:\d+|提醒孩子.*前完成|提醒孩子.*预习|提醒孩子.*准备/.test(text)) {
    return [
      `已设置提醒：在所选时间通过孩子端轻提醒。如孩子在勿扰时段，会改成弹窗 + 振动短提醒。`,
      ``,
      `下一步可以：① 同步给我；② 不催，让他自己来；③ 我也提醒妈妈一起。`,
    ].join("\n")
  }
  if (/我帮.*做实验|陪.*做实验|帮孩子做.*实验|陪孩子做实验/.test(text)) {
    return [
      `好，今晚的"拉合力"小实验（约 4 分钟）已加进家庭日历，AI 会在 18:30 提醒你。`,
      `已为你准备 1 张操作手卡（量角器 + 受力图 + 1 句鼓励文案）。`,
      ``,
      `下一步可以：① 看孩子做错的题；② 提醒孩子 18:30 前完成；③ 不催，让他自己来。`,
    ].join("\n")
  }
  if (/孩子需要我陪听|要我陪听|需要陪听|陪听 ?吗/.test(text)) {
    return [
      `本节不必陪听。孩子已能独立完成"拉合力"实验。建议把灯调亮、桌面留空，营造氛围即可。`,
      ``,
      `下一步可以：① 课前注意事项；② 看孩子预习进度；③ 课后给我一份要点。`,
    ].join("\n")
  }
  if (/课后给我.*要点|课后给我摘要|课后摘要/.test(text)) {
    return [
      `已设置：本节结束 5 分钟内给您一份"3 段摘要"（亮点 / 薄弱点 / 今晚怎么陪孩子）。`,
      ``,
      `下一步可以：① 把摘要也发到妈妈手机；② 课后报告；③ 安排今晚陪练。`,
    ].join("\n")
  }
  if (/我去找.*量角器|找量角器|找到量角器|拿量角器/.test(text)) {
    return [
      `好，孩子端 IM 同步了一条"妈妈正在帮你找量角器"轻提示，孩子知道你在准备。`,
      ``,
      `下一步可以：① 把灯调亮；② 桌面留空；③ 提醒孩子 18:55 准备。`,
    ].join("\n")
  }
  if (/查看上节(课报告|课)|看上节课报告|查看上周课表/.test(text)) {
    return [
      `上节《合力分解 · 入门》：${DEMO_PARENT_CHILD.childName} 课中抢答 1 次答对、专注度 78、作业 88%。亮点：受力图独立完成；薄弱：方向判断仍偶错。`,
      ``,
      `下一步可以：① 看完整课后报告；② 安排今晚陪练；③ 和王老师私聊。`,
    ].join("\n")
  }

  /** 家长 · 直播 / 看一眼 */
  if (/申请.*下节.*旁听|授权.*下节.*旁听|下节课旁听|下节全程|下节我陪听|下节课全程旁听/.test(text)) {
    return [
      `已发出旁听申请，等王老师确认（一般 1 小时内）。下节课您可全程旁听，但不打扰孩子（您这边静音）。`,
      `（已写入 IM：切到「场景六 教师」可看到「李爸爸」授权申请）`,
      ``,
      `下一步可以：① 改成"只在课中提醒变化"；② 看一眼直播；③ 取消申请。`,
    ].join("\n")
  }
  if (/我先不看|不看了|放弃看|不看直播/.test(text)) {
    return [
      `好，今天先不看了。30 秒授权配额仍然保留，明天 19:00 自动重置。`,
      ``,
      `下一步可以：① 课后给我要点；② 状态有变化主动提醒我；③ 课后再叫我。`,
    ].join("\n")
  }
  if (/课后再叫我|课后再说|课后通知我/.test(text)) {
    return [
      `好，今晚不打扰你工作。课程结束 5 分钟后给你 1 张"3 段摘要"。`,
      ``,
      `下一步可以：① 把摘要也发到妈妈；② 安排今晚陪练；③ 不催，让他自己来。`,
    ].join("\n")
  }
  if (/下课了告诉我得分|下课.*得分|下课.*告诉我|下课提醒/.test(text)) {
    return [
      `已设置：下课立即推一条"${DEMO_PARENT_CHILD.childName} · 本节得分 + 进步" 卡片到你手机。`,
      ``,
      `下一步可以：① 把卡片同步给妈妈；② 安排今晚陪练；③ 课后报告。`,
    ].join("\n")
  }

  /** 家长 · 报告 / 诊断 / 补强 */
  if (/把诊断转给.*老师|诊断转给王老师|诊断.*老师确认/.test(text)) {
    return [
      `已把本节诊断（薄弱点 + 今晚陪练建议）转给王老师审核。预计 24 小时内有回复。`,
      `（已写入 IM：切到「场景六 教师」可看到「李爸爸」会话红点 +1）`,
      ``,
      `下一步可以：① 安排今晚陪练；② 看完整报告；③ 把报告同步给妈妈。`,
    ].join("\n")
  }
  if (/今晚就让.*变式|今晚做.*道变式|今晚做.*题/.test(text)) {
    return [
      `已为今晚 21:00 安排 3 道方向变式（约 8 分钟），孩子端会出现"妈妈选了 3 道，做完去看动画"。`,
      ``,
      `下一步可以：① 把这 3 项加进家庭日历；② 把动画也准备好；③ 不催，让他自己来。`,
    ].join("\n")
  }
  if (/明早提醒|明早.*回顾|明早.*学习卡|明早提醒孩子/.test(text)) {
    return [
      `已加 1 条明早 7:30 轻提醒（"今日学习卡 5 分钟"）。免打扰时段会顺延到 8:00。`,
      ``,
      `下一步可以：① 同步给妈妈；② 安排今晚陪练；③ 不催，让他自己来。`,
    ].join("\n")
  }
  if (/采用方案 ?[ABCＡＢＣ]|改成方案 ?[ABCＡＢＣ]|方案 ?[ABCＡＢＣ] ?加进/.test(text)) {
    return [
      `已采用所选陪练方案，并加进今晚家庭日历（含睡前 1 句具体表扬）。AI 会在执行前 5 分钟轻提醒。`,
      ``,
      `下一步可以：① 同步给妈妈；② 我也加 B 方案；③ 不催，让他自己来。`,
    ].join("\n")
  }
  if (/把 ?[ABCＡＢＣ] ?\+ ?[ABCＡＢＣ] ?组合|组合.*方案|两个方案合一/.test(text)) {
    return [
      `已采用 A + B 组合（重做错题 8 分钟 + 口头复述 5 分钟），加进家庭日历。`,
      ``,
      `下一步可以：① 同步给妈妈；② 改时段；③ 不催，让他自己来。`,
    ].join("\n")
  }
  if (/孩子.*太累.*方案 ?[ABCＡＢＣ]|改成方案 ?C|今天.*累了/.test(text)) {
    return [
      `好。今晚改成方案 C（视频回放 12 分钟），孩子端不会出现练习提示，只看视频。`,
      ``,
      `下一步可以：① 不催，让他自己来；② 明早回顾；③ 把回放推到孩子端。`,
    ].join("\n")
  }
  if (/明天再说|明天再来|今天先放过|今天先休息/.test(text)) {
    return [
      `好，今晚不安排陪练。22:00 仍会给您一份完成情况摘要，明早 7:30 再轻提醒一次。`,
      ``,
      `下一步可以：① 改成完全不打扰；② 把情况同步给妈妈；③ 看完整报告。`,
    ].join("\n")
  }
  if (/下载.*PDF|下载完整|PDF.*下载|下载报告/.test(text)) {
    return [
      `已开始下载完整 PDF（含课堂行为时间轴 / 答题分布 / 薄弱点诊断），约 2 MB。`,
      ``,
      `下一步可以：① 把诊断转给王老师确认；② 安排今晚陪练；③ 同步给妈妈。`,
    ].join("\n")
  }
  if (/我不会判断方向|不会判断方向|能否给我答案|给我答案/.test(text)) {
    return [
      `判断方向 3 步法：① 画受力图（标 F1/F2 大小 + 方向）；② 用 arctan(F合y / F合x) 算偏角；③ 看坐标系决定东 / 西 / 南 / 北。`,
      ``,
      `下一步可以：① 让孩子讲一遍给我听；② 把这条公式发到孩子端；③ 和王老师私聊请教。`,
    ].join("\n")
  }
  if (/把.*加进我的日历|加到我的日历|加入家庭日历|添加到日历|加进日历/.test(text)) {
    return [
      `已加入家庭日历，并按"妈妈"角色同步一份。免打扰时段顺延，提前 5 分钟轻提醒。`,
      ``,
      `下一步可以：① 改时段；② 加 1 个口头复述环节；③ 不催，让他自己来。`,
    ].join("\n")
  }
  if (/把上课提醒.*我的日历|把课表加进我的日历|课表加进我的日历/.test(text)) {
    return [
      `已把本周 4 节课、提前 10 分钟提醒加入你的日历。免打扰时段会顺延到课前 5 分钟。`,
      ``,
      `下一步可以：① 周日的数学课需要我陪听吗；② 课前注意事项；③ 看孩子预习进度。`,
    ].join("\n")
  }
  if (/周日的数学课.*陪听|周日.*陪听|数学课需要我/.test(text)) {
    return [
      `周日数学课（一元二次方程）建议陪做 2 道题即可，不必全程陪听。AI 会在课后给你一份"3 段摘要"。`,
      ``,
      `下一步可以：① 把摘要也发给妈妈；② 提醒我每节课前 10 分钟；③ 课后给我要点。`,
    ].join("\n")
  }
  if (/提醒我每节课前|每节课开始前.*提醒|每节课前 ?\d+ ?分钟/.test(text)) {
    return [
      `已设置：每节课开始前 10 分钟轻提醒（手机弹窗 + iPad 横幅）。免打扰时段会顺延到课前 5 分钟。`,
      ``,
      `下一步可以：① 同步给妈妈；② 把课表加进我的日历；③ 课中状态有变化提醒我。`,
    ].join("\n")
  }
  if (/孩子状态有变化提醒我|状态变化提醒|有变化提醒/.test(text)) {
    return [
      `已开启"主动提醒"。当孩子专注度连续 3 分钟低于 50% 或网络异常时，立刻通知你。`,
      ``,
      `下一步可以：① 同步给妈妈；② 改成每 10 分钟摘要；③ 关闭提醒。`,
    ].join("\n")
  }
  if (/把.*上节亮点|上节亮点告诉|上节亮点给孩子|把进步.*同步给妈妈|把进步.*发给妈妈|进步同步妈妈/.test(text)) {
    return [
      `已把孩子的进步（${DEMO_PARENT_CHILD.childName} 第 3 次抢答正确）做成 1 张卡片，发给孩子端 + 妈妈端。`,
      ``,
      `下一步可以：① 把卡片也发给班主任；② 安排今晚陪练；③ 看完整报告。`,
    ].join("\n")
  }

  /* ============================================================
   * 线下课中专属（PRD 2.5.1.C / 2.5.2 / 2.6.1 / 2.6.2）
   * 关键词来自 OFFLINE_OVERRIDES.recommendedPrompts 与线下专属菜单
   * ============================================================ */

  /** 教师 · 线下：板书 / 摄像头 / 物理学具 */
  if (/IFP.*板书|智能黑板.*板书|板书.*同步.*Pad|一键发给.*组|板书 ?#?\d?.*同步|板书识别/.test(text)) {
    return [
      `已把所选板书同步到目标小组学生 Pad（教室局域网走静默通道，不打扰其他组）。`,
      ``,
      `下一步可以：① 切到镜头追发言者；② 调出物理学具记录站；③ 把板书加入下节预习包。`,
    ].join("\n")
  }
  if (/摄像头.*追踪|镜头.*追踪|镜头.*追发言者|抬头率|靶向点名|单独点.*的名/.test(text)) {
    return [
      `教室摄像头本节累计追踪发言者 11 人；整班抬头率 86%（比上节 +3）；走神 2 起（陈可 / 王佳佳）。`,
      ``,
      `下一步可以：① 单独点一次陈可的名；② 把抬头率热力同步给班主任；③ 切到智能黑板板书识别。`,
    ].join("\n")
  }
  if (/物理学具|学具记录站|学具.*报修|弹簧测力计|无线麦传给|麦传给/.test(text)) {
    return [
      `已为你打开物理学具记录站。当前弹簧测力计 3 / 5 在用、无线麦 2 / 2 在 张楠 / 李小明 手中、量角器 5 / 5 在 C 组使用。1 把弹簧测力计 #4 已自动报修。`,
      ``,
      `下一步可以：① 申请补 1 把弹簧测力计；② 把无线麦传给陈可；③ 联系后勤替换报修学具。`,
    ].join("\n")
  }

  /** 学生 · 线下：教室共享 Pad / 等无线麦 */
  if (/教室.*Pad|共享 ?Pad|拍.*题给老师|Pad 私问|Pad.*提问|Pad.*偷偷问/.test(text)) {
    return [
      `已为你打开 B 组 Pad #03 的「私聊老师」面板。建议把题号写清楚，王老师会在板书间隙回你（只有你和老师能看到）。`,
      ``,
      `下一步可以：① 拍一张题给老师；② 改成「举手 / 等无线麦」（全班发言）；③ 把这题加入我的错题本。`,
    ].join("\n")
  }
  if (/等无线麦|举手.*麦|麦.*传到|无线麦.*到位/.test(text)) {
    return [
      `你正在举手队列第 2 位，前面是张楠（已发言 8s）。助教把无线麦 #1 递给你，预计 12 秒到位。`,
      ``,
      `下一步可以：① 改成在 Pad 上「私聊老师」；② 取消举手；③ 看王老师讲到哪段了。`,
    ].join("\n")
  }
  if (/王老师当前讲到|讲到哪段|讲到哪段了|当前进度.*老师/.test(text)) {
    return [
      `王老师正在讲第 7 题（19:11 - 19:13），主题：矢量方向判断。再过 5 分钟会进入正交分解习题。`,
      ``,
      `下一步可以：① 改成 Pad 私聊老师；② 等下一题准备抢答；③ 把这题加入错题本。`,
    ].join("\n")
  }

  /** 家长 · 线下：接送 / 教室摄像头 / 留校 */
  if (/接送闭环|接送全过程|接送时间线|看.*接送|接送.*绑定/.test(text)) {
    return [
      `${DEMO_PARENT_CHILD.childName} 今晚的接送：18:55 校门刷卡 ✓ · 18:58 已进入 A301 教室 · 预计 19:50 离校。下课前 5 分钟会自动告诉您什么时候到接送区。`,
      ``,
      `下一步可以：① 看一眼教室摄像头；② 我能晚 10 分钟到吗？③ 把接送通知也发给妈妈。`,
    ].join("\n")
  }
  if (/晚到.*分钟接|晚 ?\d+ ?分钟接|延后.*接孩子|让孩子等我|我能晚 ?\d+ ?分钟到/.test(text)) {
    return [
      `已把"家长晚 10 分钟到接送区"记到接送记录。学校 19:50 - 20:00 会把孩子安置在 A301 走廊等候区，并由值班老师陪同。`,
      ``,
      `下一步可以：① 把这条同步给妈妈；② 改成由妈妈接；③ 取消延后。`,
    ].join("\n")
  }
  if (/教室摄像头巡检|教室.*摄像头|看一眼.*摄像头|摄像头巡检|看一眼教室摄像头/.test(text)) {
    return [
      `教室摄像头看一眼（${OFFLINE_CLASSROOM}）：孩子坐姿端正、抬头率 88（高于均值 +2），整班无异常。30 秒后自动关闭，不打扰课堂。`,
      `（机构默认配置：只显示孩子座位区域，不显示其他学生面部，保护隐私。）`,
      ``,
      `下一步可以：① 状态有变化主动提醒我；② 看接送全过程；③ 把结果同步给妈妈。`,
    ].join("\n")
  }
  if (/孩子离校.*提醒|离校立刻|离校.*通知/.test(text)) {
    return [
      `已开启"孩子离校立刻提醒"：当孩子刷卡离校（约 19:50），会立刻通知您 + 妈妈。如孩子在校超 10 分钟没接走，会同步通知班主任。`,
      ``,
      `下一步可以：① 安排晚到 10 分钟接；② 看接送全过程；③ 把通知也发给妈妈。`,
    ].join("\n")
  }
  if (/把接送通知.*妈妈|接送.*同步妈妈|把.*通知.*妈妈/.test(text)) {
    return [
      `已把今晚 ${DEMO_PARENT_CHILD.childName} 的接送（已签到 / 上课中 / 离校）通知同步给妈妈，离校瞬间她也会收到推送。`,
      ``,
      `下一步可以：① 看一眼教室摄像头；② 安排今晚陪练；③ 课后报告。`,
    ].join("\n")
  }

  return null
}
