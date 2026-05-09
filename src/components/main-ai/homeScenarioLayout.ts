/**
 * 场景零（首页 `?scenario=no-org`）：**未加入任何组织**时的演示态。
 * 与「仅路由为 no-org、但已在流程中加入组织/教育主体」区分；后者应保持与其它 Home 场景一致的对话体验。
 */
export function isHomeScenarioZeroNoOrg(
  scenario: string | undefined,
  hasJoinedOrganizations: boolean
): boolean {
  return scenario === "no-org" && !hasJoinedOrganizations
}

/**
 * 首页 `?scenario=no-org` 路由（含后续已加入组织）：主 VVAI 输入「查看考勤」等时与场景二同构复用演示分流。
 * 其它 Home 入口不变。
 */
export function isNoOrgHomeScenarioRoute(scenario: string | undefined): boolean {
  return scenario === "no-org"
}

/** 场景二：首页「加入一个教育机构」入口（`edu-one`） */
export function isScenarioTwo(scenario: string | undefined): boolean {
  return scenario === "edu-one"
}

/** 首页「场景二（加入多个组织）」入口；与 `edu-one` 拆分后可单独演进 */
export const SCENARIO_TWO_MULTI_ORGS = "scenario-two-multi" as const

export function isScenarioTwoMultiOrgs(scenario: string | undefined): boolean {
  return scenario === SCENARIO_TWO_MULTI_ORGS
}

/** 场景二两条 Home 入口（单机构 + 多组织）：共享 dock 镜像、考勤等演示；仅动单机构时用 `isScenarioTwo` */
export function isScenarioTwoFamily(scenario: string | undefined): boolean {
  return isScenarioTwo(scenario) || isScenarioTwoMultiOrgs(scenario)
}

/** 首页「CUI卡片交互场景及规则」专用入口；后续只影响本入口的体验请用 `isCuiCardRulesScenario` 分支 */
export const SCENARIO_CUI_CARD_RULES = "cui-card-rules" as const

export function isCuiCardRulesScenario(scenario: string | undefined): boolean {
  return scenario === SCENARIO_CUI_CARD_RULES
}

/** 与场景二同构的单教育机构 Home 演示（`edu-one` + 本入口；共享逻辑用本函数，差异化用 `isCuiCardRulesScenario`） */
export function isScenarioTwoLike(scenario: string | undefined): boolean {
  return isScenarioTwoFamily(scenario) || isCuiCardRulesScenario(scenario)
}

/**
 * 场景二（`edu-one` / `scenario-two-multi`）主 VVAI 固定追问与《应用承接引导》（考勤等）演示流。
 * 多组织差异对齐 `isScenarioTwoMultiOrgs` / `isScenarioFourOrMainEntry` 等分支。
 */
export function isSingleOrgEduAttendanceScenarioFlow(scenario: string | undefined): boolean {
  return isScenarioTwoFamily(scenario)
}

/** 《主入口》：无 `scenario`（地址栏无 `?scenario=`）；交互与场景二一致，仅组织为两个默认通用主体 */
export function isMainEntryScenario(scenario: string | undefined): boolean {
  return scenario == null || scenario === ""
}

/** 场景二（多组织）：分栏会话、快捷条间距等与多所教育主体演示一致（原独立 `edu-multi` 入口已移除） */
export function isScenarioFourOrMainEntry(scenario: string | undefined): boolean {
  return isScenarioTwoMultiOrgs(scenario)
}

/** Home 场景：与场景五相同的《主CUI交互》布局与数据 */
export function isScenarioFiveLike(scenario: string | undefined): boolean {
  return scenario === "scenario-five"
}

/**
 * 教育四身份场景（场景六/七/八/九）：分别对应 PRD 2.5/2.6 的老师 / 学生 / 家长 / 机构管理者入口。
 * 四个 scenario 之间的差异由 `eduScenarioRole` 给出，业务侧用 `isEduRoleScenario` 守卫；
 * 与场景二（`edu-one`）刻意拆开演进，避免在共享分支里改逻辑。
 *
 * 「机构管理者」（场景九 / `edu-admin`）= PRD 2.5.4 教务 + 2.5.5 督导 + 2.5.6 校区主管/校长/总部 的合体视角，
 * 默认必须挂在 1 个示范教育机构下（无机构对管理者来说没意义）；与三身份的差异：
 * - 不"上课"，没有"我的课表"dock，没有单课子 CUI 入口（仅观察态的督导抽课，本期暂未做）
 * - dock 三项：校区运营 / 教学质量 / 经营大盘
 */
export const SCENARIO_EDU_TEACHER = "edu-teacher" as const
export const SCENARIO_EDU_STUDENT = "edu-student" as const
export const SCENARIO_EDU_PARENT = "edu-parent" as const
export const SCENARIO_EDU_ADMIN = "edu-admin" as const

export type EduSceneRole = "teacher" | "student" | "parent" | "admin"

/**
 * 「会上课的人」=「会进入单课子 CUI / Hero 卡 / IM 闭环」的三身份；与 admin 形成互斥子集。
 *
 * 用于强类型收紧：所有"按课次维度的卡片 / 数据 / 收件箱 / Skill 树"都只接 `EduLessonAttendingRole`，
 * admin 不必（也不应）出现在这些类型签名里——管理者视角不进单课，子 CUI 对其无意义。
 */
export type EduLessonAttendingRole = Exclude<EduSceneRole, "admin">

export function isLessonAttendingEduRole(role: EduSceneRole | null): role is EduLessonAttendingRole {
  return role === "teacher" || role === "student" || role === "parent"
}

export function eduScenarioRole(scenario: string | undefined): EduSceneRole | null {
  if (scenario === SCENARIO_EDU_TEACHER) return "teacher"
  if (scenario === SCENARIO_EDU_STUDENT) return "student"
  if (scenario === SCENARIO_EDU_PARENT) return "parent"
  if (scenario === SCENARIO_EDU_ADMIN) return "admin"
  return null
}

export function isEduRoleScenario(scenario: string | undefined): boolean {
  return eduScenarioRole(scenario) != null
}

/**
 * 教育多身份场景中，C 端身份（学生 / 家长）：默认无组织、无机构教育空间，
 * 顶栏「教育空间切换器」只保留个人空间，且不展示「创建机构教育空间」入口。
 */
export function isEduRoleConsumerScenario(scenario: string | undefined): boolean {
  const role = eduScenarioRole(scenario)
  return role === "student" || role === "parent"
}

/**
 * 机构管理者（场景九）：必须挂在机构教育空间下；顶栏「教育空间切换器」隐藏个人空间项，
 * 也不允许"创建个人教育空间"——管理者的工作主体是机构本身。
 */
export function isEduAdminScenario(scenario: string | undefined): boolean {
  return eduScenarioRole(scenario) === "admin"
}

/**
 * 「会上课的人」——含课表、Hero 卡、子 CUI 的入口结构（教师 / 学生 / 家长）。
 * 与之相对：管理者（admin）没有"我的课表"dock，也无单课子 CUI 入口。
 */
export function isLessonAttendingEduRoleScenario(scenario: string | undefined): boolean {
  const role = eduScenarioRole(scenario)
  return role === "teacher" || role === "student" || role === "parent"
}

/**
 * 主《主CUI交互》顶栏右侧「历史消息」时钟按钮是否隐藏。
 * 场景0（`no-org`）、场景五，以及《主入口》、场景二与本入口（与既有逻辑一致）均不展示。
 */
export function hideMainCuiNavHistoryIcon(scenario: string | undefined): boolean {
  if (isMainEntryScenario(scenario)) return true
  if (isScenarioTwoLike(scenario)) return true
  if (scenario === "no-org") return true
  if (isScenarioFiveLike(scenario)) return true
  if (isEduRoleScenario(scenario)) return true
  return false
}
