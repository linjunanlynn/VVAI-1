/**
 * 组织类型与底部应用条、教育/医院二级门户模块的对应关系（与 Home 场景入口一致）
 */
import type { Organization } from "./OrganizationSwitcherCard"
import { eduScenarioRole, isEduRoleScenario } from "./homeScenarioLayout"
import courseIcon from "figma:asset/ac6e3391c1eb88804cbf0804668d449463a1e1a3.png"
import goodsIcon from "figma:asset/d6c155d2820ba2910285fbcb066152b9efb7141c.png"
import membersIcon from "figma:asset/ecb04190c46a6ecd790d2bc345d963ba9a4a8f0b.png"
import financeIcon from "figma:asset/98e154a19d1590d43b04308d53726a30a29e972b.png"
import educationIcon from "figma:asset/8449365f45bb140bf269f6769f74387249864ed8.png"
import calendarIcon from "figma:asset/e653b0a7cada3ea08e52cb29bc4bd546be59d3d5.png"
import meetingIcon from "figma:asset/88d3d6e7f0cac8b8bba0a46f8757585fe7cdaf9a.png"
import todoIcon from "figma:asset/3598e566543c9c6ef7ab3cb268538a29b6bdb58d.png"
import diskIcon from "figma:asset/78530a18370215c595d4c989d64c188f7450dbda.png"
import companyIcon from "figma:asset/bc4adf9e89b5ade28461d7ae6da09053ea8bf0e1.png"
import profileIcon from "figma:asset/a9b0f43698a9015397dc60f26d1ea217390fec97.png"
import organizationIcon from "figma:asset/737725172f66f16b2662ff1ddc8ab69293de567f.png"
import employeeIcon from "figma:asset/b07b1535d0d656029e5b3942f78ecf273f5852ee.png"
import recruitmentIcon from "figma:asset/81759343e3c0735a95d3ee5a5e7cf7a767e83846.png"
import salaryIcon from "figma:asset/776e838a4088fe446d0c5d29220b88ab1ad922bc.png"
import inventoryIcon from "figma:asset/1850125514f29104c8f00034a7873528b971a815.png"

export interface PortalMenuItem {
  id: string
  name: string
  iconKey: string
}

export interface PortalApp {
  id: string
  name: string
  imageSrc: string
  menu: PortalMenuItem[]
}

/**
 * 「AI课堂」二级 Portal：进入后渲染 PRD 2.8.2 / 2.8.3 三级菜单（按身份裁剪），
 * 三级具体 Skill 在本轮以占位回复承接，后续替换为真实业务卡片。
 * 与现有「商品管理 / 成员管理 / 财务管理」并列；在教育机构 / 学校 / 并集与教育三身份场景中均出现在二级首位。
 */
export const AI_CLASSROOM_APP_ID = "ai_classroom" as const

const AI_CLASSROOM_APP: PortalApp = {
  id: AI_CLASSROOM_APP_ID,
  name: "AI课堂",
  imageSrc: educationIcon,
  /** 三级菜单按身份运行时由 `aiClassroomSkillTree` 计算，不依赖此处 menu */
  menu: [],
}

/** 教育机构 · 教育门户二级：AI课堂 / 商品 / 成员 / 财务 */
export const EDU_INSTITUTION_PORTAL_APPS: PortalApp[] = [
  AI_CLASSROOM_APP,
  {
    id: "goods",
    name: "商品管理",
    imageSrc: goodsIcon,
    menu: [
      { id: "course_goods", name: "商品课程", iconKey: "course_goods" },
      { id: "material_goods", name: "物料商品", iconKey: "material_goods" },
      { id: "order_goods", name: "订单管理", iconKey: "order_goods" },
    ],
  },
  {
    id: "members",
    name: "成员管理",
    imageSrc: membersIcon,
    menu: [
      { id: "student_mgmt", name: "学生管理", iconKey: "student_mgmt" },
      { id: "teacher_mgmt", name: "老师管理", iconKey: "teacher_mgmt" },
    ],
  },
  {
    id: "finance",
    name: "财务管理",
    imageSrc: financeIcon,
    menu: [
      { id: "income_mgmt", name: "收入管理", iconKey: "income_mgmt" },
      { id: "expense_mgmt", name: "支出管理", iconKey: "expense_mgmt" },
      { id: "account_mgmt", name: "账号管理", iconKey: "account_mgmt" },
      { id: "financial_report", name: "财务报表", iconKey: "financial_report" },
    ],
  },
]

/** 学校组织 · 教育门户二级 */
export const SCHOOL_PORTAL_APPS: PortalApp[] = [
  AI_CLASSROOM_APP,
  {
    id: "teacher_mgmt",
    name: "老师管理",
    imageSrc: membersIcon,
    menu: [
      { id: "sch_t_arch", name: "老师档案", iconKey: "teacher_mgmt" },
      { id: "sch_t_course", name: "老师考勤", iconKey: "teacher_mgmt" },
      { id: "sch_t_eval", name: "老师绩效", iconKey: "teacher_mgmt" },
    ],
  },
  {
    id: "student_mgmt",
    name: "学员管理",
    imageSrc: membersIcon,
    menu: [
      { id: "sch_s_roster", name: "学员花名册", iconKey: "student_mgmt" },
      { id: "sch_s_class", name: "分班升级", iconKey: "student_mgmt" },
      { id: "sch_s_guardian", name: "家长联系", iconKey: "student_mgmt" },
    ],
  },
  {
    id: "teaching",
    name: "教学管理",
    imageSrc: educationIcon,
    menu: [
      { id: "sch_tm_plan", name: "教学计划", iconKey: "fulfillment" },
      { id: "sch_tm_exam", name: "成绩考务", iconKey: "financial_report" },
      { id: "sch_tm_res", name: "教案资源", iconKey: "course_goods" },
    ],
  },
  {
    id: "logistics",
    name: "后勤管理",
    imageSrc: companyIcon,
    menu: [
      { id: "sch_lg_repair", name: "报修维保", iconKey: "material_goods" },
      { id: "sch_lg_room", name: "教室与场地", iconKey: "order_goods" },
      { id: "sch_lg_bus", name: "餐饮校车", iconKey: "order" },
    ],
  },
]

/**
 * 学校 + 教育机构并存：二级能力并集（顺序：AI课堂 → 学校侧 → 机构侧）。
 * 学校 / 机构两个 Portal 列表都已在首位包含 `AI课堂`，并集时去重保持单一首位。
 */
export const MERGED_EDU_PORTAL_APPS: PortalApp[] = [
  AI_CLASSROOM_APP,
  ...SCHOOL_PORTAL_APPS.filter((a) => a.id !== AI_CLASSROOM_APP_ID),
  ...EDU_INSTITUTION_PORTAL_APPS.filter((a) => a.id !== AI_CLASSROOM_APP_ID),
]

/* =========================================================
 * 教育四身份门户矩阵（场景 6/7/8/9 对齐 · 业务方最新截图）
 *
 * 划分原则（截图实测）：
 *   - 学生（场景 7）  3 项：课表 / 作业练习 / 学情管理
 *   - 家长（场景 8）  4 项：课表 / 学情管理 / 请假调课 / 家长服务
 *   - 老师（场景 6）  3 项：课表 / 教学管理 / 学员管理
 *   - 管理者（场景 9）6 项：课程管理 / 商品管理 / 学员管理 / 老师管理 / 订单管理 / 财务管理
 *
 * 注意：老师与管理者**不再共用**同一份 dock，差异在于：
 *   · 老师 = "上课的人"：dock 第一项必为课表，承接进具体课的子 CUI
 *   · 管理者 = "不上课的人"：dock 没有课表（管理者通过"课程管理 / 课程课表"看全校课程）
 *
 * 课表二级（学生/家长/老师）二级菜单统一为「今日课表」+「课表日历」：
 *   · 今日课表 → 当天单日列表
 *   · 课表日历 → 周/月日历视图（沿用现 schedule "week" 卡作为日历态）
 * ========================================================= */

/** 任课教师（场景 6）：课程管理 / 商品管理 / 成员管理 / 财务管理 */
export const TEACHER_PORTAL_APPS: PortalApp[] = [
  {
    id: "edu_course_mgmt",
    name: "课程管理",
    imageSrc: courseIcon,
    menu: [
      { id: "ts_today", name: "今日课表", iconKey: "schedule" },
      { id: "ecm_fulfillment", name: "课程履约", iconKey: "fulfillment" },
      { id: "ts_week", name: "课表日历", iconKey: "schedule" },
      { id: "ecm_schedule", name: "课程课表", iconKey: "schedule" },
      { id: "eom_arrange", name: "订单排课", iconKey: "schedule" },
    ],
  },
  {
    id: "edu_goods_mgmt",
    name: "商品管理",
    imageSrc: goodsIcon,
    menu: [
      { id: "egm_course", name: "课程商品", iconKey: "course_goods" },
      { id: "egm_material", name: "物料商品", iconKey: "material_goods" },
      { id: "eom_query", name: "订单管理", iconKey: "order_goods" },
      { id: "egm_promo", name: "优惠策略", iconKey: "course_goods" },
    ],
  },
  {
    id: "edu_student_mgmt",
    name: "成员管理",
    imageSrc: membersIcon,
    menu: [
      { id: "etea_profile", name: "老师管理", iconKey: "teacher_mgmt" },
      { id: "esm_profile", name: "学生管理", iconKey: "student_mgmt" },
    ],
  },
  {
    id: "edu_finance_mgmt",
    name: "财务管理",
    imageSrc: financeIcon,
    menu: [
      { id: "efm_income", name: "收入管理", iconKey: "income_mgmt" },
      { id: "efm_expense", name: "支出管理", iconKey: "expense_mgmt" },
      { id: "efm_account", name: "账号管理", iconKey: "account_mgmt" },
      { id: "efm_report", name: "财务报表", iconKey: "financial_report" },
    ],
  },
]

/** 机构管理者（场景 9）：与老师统一为课程/商品/成员/财务四类 */
export const ADMIN_PORTAL_APPS: PortalApp[] = [
  {
    id: "edu_course_mgmt",
    name: "课程管理",
    imageSrc: courseIcon,
    menu: [
      { id: "ts_today", name: "今日课表", iconKey: "schedule" },
      { id: "ecm_fulfillment", name: "课程履约", iconKey: "fulfillment" },
      { id: "ts_week", name: "课表日历", iconKey: "schedule" },
      { id: "ecm_schedule", name: "课程课表", iconKey: "schedule" },
      { id: "eom_arrange", name: "订单排课", iconKey: "schedule" },
    ],
  },
  {
    id: "edu_goods_mgmt",
    name: "商品管理",
    imageSrc: goodsIcon,
    menu: [
      { id: "egm_course", name: "课程商品", iconKey: "course_goods" },
      { id: "egm_material", name: "物料商品", iconKey: "material_goods" },
      { id: "eom_query", name: "订单管理", iconKey: "order_goods" },
      { id: "egm_promo", name: "优惠策略", iconKey: "course_goods" },
    ],
  },
  {
    id: "edu_student_mgmt",
    name: "成员管理",
    imageSrc: membersIcon,
    menu: [
      { id: "etea_profile", name: "老师管理", iconKey: "teacher_mgmt" },
      { id: "esm_profile", name: "学生管理", iconKey: "student_mgmt" },
    ],
  },
  {
    id: "edu_finance_mgmt",
    name: "财务管理",
    imageSrc: financeIcon,
    menu: [
      { id: "efm_income", name: "收入管理", iconKey: "income_mgmt" },
      { id: "efm_expense", name: "支出管理", iconKey: "expense_mgmt" },
      { id: "efm_account", name: "账号管理", iconKey: "account_mgmt" },
      { id: "efm_report", name: "财务报表", iconKey: "financial_report" },
    ],
  },
]

/** 学员（场景 7）：课程管理 / 商品管理 / 成员管理 / 奖励管理 */
export const STUDENT_PORTAL_APPS: PortalApp[] = [
  {
    id: "student_course_mgmt",
    name: "课程管理",
    imageSrc: courseIcon,
    menu: [
      { id: "ss_today", name: "今日课表", iconKey: "schedule" },
      { id: "sc_fulfillment", name: "课程履约", iconKey: "fulfillment" },
      { id: "sc_leave", name: "学生请假", iconKey: "schedule" },
    ],
  },
  {
    id: "student_goods_mgmt",
    name: "商品管理",
    imageSrc: goodsIcon,
    menu: [
      { id: "sg_my_orders", name: "我的订单", iconKey: "order_goods" },
    ],
  },
  {
    id: "student_member_mgmt",
    name: "成员管理",
    imageSrc: membersIcon,
    menu: [
      { id: "sm_family", name: "家庭成员", iconKey: "student_mgmt" },
    ],
  },
  {
    id: "student_reward_mgmt",
    name: "奖励管理",
    imageSrc: educationIcon,
    menu: [
      { id: "sr_reward", name: "奖励管理", iconKey: "fulfillment" },
    ],
  },
]

/** 家长（场景 8）：与学员同构（课程管理 / 商品管理 / 成员管理 / 奖励管理） */
export const PARENT_PORTAL_APPS: PortalApp[] = [
  {
    id: "parent_course_mgmt",
    name: "课程管理",
    imageSrc: courseIcon,
    menu: [
      { id: "ps_today", name: "今日课表", iconKey: "schedule" },
      { id: "pc_fulfillment", name: "课程履约", iconKey: "fulfillment" },
      { id: "pc_student_leave", name: "学生请假", iconKey: "schedule" },
    ],
  },
  {
    id: "parent_goods_mgmt",
    name: "商品管理",
    imageSrc: goodsIcon,
    menu: [
      { id: "psv_orders", name: "我的订单", iconKey: "order_goods" },
    ],
  },
  {
    id: "parent_member_mgmt",
    name: "成员管理",
    imageSrc: membersIcon,
    menu: [
      { id: "pm_family", name: "家庭成员", iconKey: "student_mgmt" },
    ],
  },
  {
    id: "parent_reward_mgmt",
    name: "奖励管理",
    imageSrc: educationIcon,
    menu: [
      { id: "pr_reward", name: "奖励管理", iconKey: "fulfillment" },
    ],
  },
]

/** 医院组织 · 医院门户二级 */
export const HOSPITAL_PORTAL_APPS: PortalApp[] = [
  {
    id: "patient_mgmt",
    name: "患者管理",
    imageSrc: profileIcon,
    menu: [
      { id: "hp_admit", name: "入院登记", iconKey: "student_mgmt" },
      { id: "hp_record", name: "病历摘要", iconKey: "financial_report" },
      { id: "hp_follow", name: "出院随访", iconKey: "teacher_mgmt" },
    ],
  },
  {
    id: "staff_schedule",
    name: "排班管理",
    imageSrc: calendarIcon,
    menu: [
      { id: "hs_shift", name: "医护排班", iconKey: "schedule" },
      { id: "hs_swap", name: "调班替班", iconKey: "order" },
      { id: "hs_night", name: "夜班统计", iconKey: "income_mgmt" },
    ],
  },
  {
    id: "medical_supplies",
    name: "医疗耗材管理",
    imageSrc: inventoryIcon,
    menu: [
      { id: "hm_stock", name: "耗材库存", iconKey: "material_goods" },
      { id: "hm_req", name: "科室申领", iconKey: "order_goods" },
      { id: "hm_exp", name: "效期预警", iconKey: "expense_mgmt" },
    ],
  },
  {
    id: "bed_mgmt",
    name: "床位管理",
    imageSrc: meetingIcon,
    menu: [
      { id: "hb_map", name: "病区床位图", iconKey: "fulfillment" },
      { id: "hb_transfer", name: "转床转科", iconKey: "order" },
      { id: "hb_queue", name: "候床队列", iconKey: "student_mgmt" },
    ],
  },
]

export function resolveEducationPortalApps(
  organizations: Organization[],
  /** 教育四身份场景（场景六/七/八/九）：即使无组织也展示对应身份的 3 项 dock，承接 PRD 2.8 二级菜单 */
  scenario?: string | null
): PortalApp[] {
  /** 教育四身份场景优先：直接根据身份返回对应的 dock 二级矩阵，避免与机构管理者视角的「商品 / 财务 / 后勤」错位 */
  const eduRole = eduScenarioRole(scenario ?? undefined)
  if (eduRole === "teacher") return TEACHER_PORTAL_APPS
  if (eduRole === "student") return STUDENT_PORTAL_APPS
  if (eduRole === "parent") return PARENT_PORTAL_APPS
  if (eduRole === "admin") return ADMIN_PORTAL_APPS

  if (organizations.length === 0) {
    if (isEduRoleScenario(scenario ?? undefined)) {
      return [AI_CLASSROOM_APP]
    }
    /** 未加入任何组织时（非教育身份场景）：机构教育门户二级能力为空（场景0 / `no-org` 等与「教育」壳层对齐） */
    return []
  }
  if (organizations.length === 1) {
    const k = organizations[0]?.kind
    if (k === "school") return SCHOOL_PORTAL_APPS
    if (k === "education") return EDU_INSTITUTION_PORTAL_APPS
    return EDU_INSTITUTION_PORTAL_APPS
  }
  const hasSchool = organizations.some((o) => o.kind === "school")
  const hasEdu = organizations.some((o) => o.kind === "education")
  if (hasSchool && hasEdu) return MERGED_EDU_PORTAL_APPS
  if (hasSchool) return SCHOOL_PORTAL_APPS
  return EDU_INSTITUTION_PORTAL_APPS
}

/**
 * 未加入组织：除主 VVAI 外仅展示个人协作应用（顺序：待办、日历、会议、文档、邮箱、微盘）
 * 已加入组织时：这些应用与主 VVAI 一样不区分行政主体，全局各仅一条历史会话（见 MainAI dock:app:*）
 */
export const DOCK_IDS_NO_ORG = ["todo", "calendar", "meeting", "document", "mail", "disk"] as const

const PERSONAL_SCOPE_DOCK_IDS = new Set<string>(DOCK_IDS_NO_ORG)

/** 个人应用：多组织下仍共用一条会话，不使用 dock:组织:应用 */
export function isPersonalScopeDockAppId(appId: string): boolean {
  return PERSONAL_SCOPE_DOCK_IDS.has(appId)
}

/**
 * 与 MainAI 一致：dock 会话 id（未加入组织 / 个人应用 → dock:app:*；组织应用 → dock:{orgId}:{appId}）
 */
export function stableDockConversationId(
  orgId: string,
  appId: string,
  hasJoinedOrganizations: boolean
): string {
  if (!hasJoinedOrganizations || isPersonalScopeDockAppId(appId)) {
    return `dock:app:${appId}`
  }
  return `dock:${orgId}:${appId}`
}

/** 主 VVAI / 个人应用顶栏：表示「全部组织」信息范围（非会话主体 id） */
export const CONTENT_SCOPE_ALL_ORGANIZATIONS_ID = "__vvai_content_all_orgs__" as const

/** 非教育、非医疗类组织：完整通用组织应用（顺序与产品定义一致） */
export const DOCK_IDS_GENERAL_FULL = [
  "todo",
  "calendar",
  "meeting",
  "mail",
  "disk",
  "document",
  "profile",
  "company",
  "organization",
  "employee",
  "recruitment",
  "attendance",
  "salary",
  "performance",
  "finance",
  "policy",
  "supplies",
  "onboarding",
  "regularization",
  "transfer",
  "offboarding",
  "contract",
  "objectives",
  "project",
  "work_task",
  "feedback",
  "meeting_room",
  "workflow",
  "permission",
  "customer",
] as const

const ROOT_DOCK_META: Record<string, { name: string; imageSrc: string }> = {
  education: { name: "教育", imageSrc: educationIcon },
  hospital: { name: "医院", imageSrc: meetingIcon },
  calendar: { name: "日历", imageSrc: calendarIcon },
  meeting: { name: "会议", imageSrc: meetingIcon },
  todo: { name: "待办", imageSrc: todoIcon },
  document: { name: "文档", imageSrc: organizationIcon },
  disk: { name: "微盘", imageSrc: diskIcon },
  mail: { name: "邮箱", imageSrc: profileIcon },
  profile: { name: "我的", imageSrc: profileIcon },
  company: { name: "公司", imageSrc: companyIcon },
  organization: { name: "组织", imageSrc: organizationIcon },
  employee: { name: "员工", imageSrc: employeeIcon },
  recruitment: { name: "招聘", imageSrc: recruitmentIcon },
  attendance: { name: "考勤", imageSrc: todoIcon },
  salary: { name: "薪酬", imageSrc: salaryIcon },
  performance: { name: "绩效", imageSrc: financeIcon },
  finance: { name: "财务", imageSrc: financeIcon },
  policy: { name: "制度", imageSrc: organizationIcon },
  supplies: { name: "物资", imageSrc: inventoryIcon },
  onboarding: { name: "入职", imageSrc: employeeIcon },
  regularization: { name: "转正", imageSrc: employeeIcon },
  transfer: { name: "调岗", imageSrc: employeeIcon },
  offboarding: { name: "离职", imageSrc: employeeIcon },
  contract: { name: "合同", imageSrc: organizationIcon },
  objectives: { name: "目标", imageSrc: todoIcon },
  project: { name: "项目", imageSrc: companyIcon },
  work_task: { name: "任务", imageSrc: todoIcon },
  feedback: { name: "反馈", imageSrc: profileIcon },
  meeting_room: { name: "会议室", imageSrc: meetingIcon },
  workflow: { name: "流程", imageSrc: organizationIcon },
  permission: { name: "权限", imageSrc: organizationIcon },
  customer: { name: "客户", imageSrc: recruitmentIcon },
  teaching: { name: "教学管理", imageSrc: educationIcon },
  /** 与 `education` 同图：个人教育空间入口在条上、会话历史中均展示为「教育」 */
  personal_edu_space: { name: "教育", imageSrc: educationIcon },
  /** 教育门户二级「AI课堂」根会话；与 PORTAL_ROOT_APP_IDS 不同：本身仍是二级 Portal */
  [AI_CLASSROOM_APP_ID]: { name: "AI课堂", imageSrc: educationIcon },
  logistics: { name: "后勤管理", imageSrc: companyIcon },
  assets: { name: "资产管理", imageSrc: inventoryIcon },
  surgery: { name: "手术", imageSrc: meetingIcon },
  pharma_procurement: { name: "药品采购", imageSrc: goodsIcon },
}

export function findPortalAppById(appId: string): PortalApp | undefined {
  return (
    EDU_INSTITUTION_PORTAL_APPS.find((a) => a.id === appId) ??
    SCHOOL_PORTAL_APPS.find((a) => a.id === appId) ??
    TEACHER_PORTAL_APPS.find((a) => a.id === appId) ??
    STUDENT_PORTAL_APPS.find((a) => a.id === appId) ??
    PARENT_PORTAL_APPS.find((a) => a.id === appId) ??
    ADMIN_PORTAL_APPS.find((a) => a.id === appId) ??
    HOSPITAL_PORTAL_APPS.find((a) => a.id === appId)
  )
}

export function getDockAppMeta(
  appId: string,
  /** 保留参数供调用方对齐签名；`personal_edu_space` 等名称以 `ROOT_DOCK_META` 为准 */
  _scenario?: string | null
): { name: string; imageSrc: string } {
  const portal = findPortalAppById(appId)
  if (portal) return { name: portal.name, imageSrc: portal.imageSrc }
  const base = ROOT_DOCK_META[appId] ?? { name: appId, imageSrc: profileIcon }
  return base
}

/** 医院、教育入口固定在条首（其余仍可按使用频率排序） */
export function prioritizePortalDockHead(ids: string[]): string[] {
  const heads = ["hospital", "education"].filter((id) => ids.includes(id))
  const rest = ids.filter((id) => !heads.includes(id))
  return [...heads, ...rest]
}

export function defaultDockIdsForContext(
  organizations: Organization[],
  currentOrgId: string,
  /** 场景 0（`no-org`）零组织：底部条为个人应用 + 唯一「教育」空间应用（`education`），不再并列 `personal_edu_space` */
  scenario?: string | null
): string[] {
  if (organizations.length === 0) {
    if (scenario === "no-org") {
      return [...DOCK_IDS_NO_ORG, "education"]
    }
    /**
     * 教育三身份场景中的 C 端身份（学生 / 家长）：无组织，但仍需通过底部「教育」入口进入 AI课堂。
     */
    if (isEduRoleScenario(scenario ?? undefined)) {
      return [...DOCK_IDS_NO_ORG, "education"]
    }
    return [...DOCK_IDS_NO_ORG]
  }
  const org = organizations.find((o) => o.id === currentOrgId)
  const kind = org?.kind ?? "general"
  const base = [...DOCK_IDS_GENERAL_FULL]
  if (kind === "hospital") return prioritizePortalDockHead(["hospital", ...base])
  if (kind === "education" || kind === "school") return prioritizePortalDockHead(["education", ...base])
  return [...base]
}

/** 多组织并集底部条（场景五）：各主体可用应用并集 */
export function defaultDockIdsUnionAcrossOrgs(organizations: Organization[]): string[] {
  if (organizations.length === 0) return [...DOCK_IDS_NO_ORG]
  const hasHospital = organizations.some((o) => o.kind === "hospital")
  const hasEdu = organizations.some((o) => o.kind === "education" || o.kind === "school")
  const out: string[] = []
  const seen = new Set<string>()
  const push = (id: string) => {
    if (!seen.has(id)) {
      seen.add(id)
      out.push(id)
    }
  }
  if (hasHospital) push("hospital")
  if (hasEdu) push("education")
  for (const id of DOCK_IDS_GENERAL_FULL) push(id)
  return out
}

/** 点击后进入二级门户根界面（非直接进 Agent 会话） */
export const PORTAL_ROOT_APP_IDS = new Set(["education", "hospital"])

/**
 * 历史会话 id：`dock:app:personal_edu_space`。场景 0 底部条已统一为 `education`（空间应用），本 id 仅用于兼容旧会话与 `isPortalRootDockAppId`。
 */
export const PERSONAL_EDU_SPACE_APP_ID = "personal_edu_space" as const

export const PERSONAL_EDU_SPACE_ACTIONS: readonly { id: string; label: string }[] = [
  { id: "parent", label: "我是家长，创建孩子的教育空间" },
  { id: "student", label: "我是学生，创造自己的教育空间" },
]

/**
 * 教育上下文 dock id 集合：教育门户根 / 个人教育空间根 / AI课堂 / 商品 / 成员 / 财务 / 学校教学三件套 / 四身份 dock。
 * 用于顶栏「组织切换 ↔ 教育空间切换」context-aware 切换：选中这些会话时视为「在教育应用对话内」。
 */
const EDUCATION_DOCK_IDS = new Set<string>([
  "education",
  PERSONAL_EDU_SPACE_APP_ID,
  AI_CLASSROOM_APP_ID,
  ...EDU_INSTITUTION_PORTAL_APPS.map((a) => a.id),
  ...SCHOOL_PORTAL_APPS.map((a) => a.id),
  ...TEACHER_PORTAL_APPS.map((a) => a.id),
  ...STUDENT_PORTAL_APPS.map((a) => a.id),
  ...PARENT_PORTAL_APPS.map((a) => a.id),
  ...ADMIN_PORTAL_APPS.map((a) => a.id),
])

export function isEducationDockAppId(appId: string | null | undefined): boolean {
  if (!appId) return false
  return EDUCATION_DOCK_IDS.has(appId)
}

/** 与 `PORTAL_ROOT_APP_IDS` 相同语义：选中对应 dock 会话时不展示「快捷指令条」而展示门户壳层 */
export function isPortalRootDockAppId(appId: string): boolean {
  return PORTAL_ROOT_APP_IDS.has(appId) || appId === PERSONAL_EDU_SPACE_APP_ID
}
