import * as React from "react"
import { flushSync } from "react-dom"
import { Link, useLocation, useNavigate, useSearchParams } from "react-router"
import { ArrowLeft } from "lucide-react"
import { MainAIChatWindow } from "./MainAIChatWindow"
import {
  eduScenarioRole,
  isCuiCardRulesScenario,
  isEduRoleScenario,
  isHomeScenarioZeroNoOrg,
  isMainEntryScenario,
  isScenarioFiveLike,
  isScenarioTwoFamily,
  isSingleOrgEduAttendanceScenarioFlow,
  SCENARIO_CUI_CARD_RULES,
  SCENARIO_EDU_ADMIN,
  SCENARIO_EDU_PARENT,
  SCENARIO_EDU_STUDENT,
  SCENARIO_EDU_TEACHER,
  SCENARIO_TWO_MULTI_ORGS,
  type EduSceneRole,
} from "./homeScenarioLayout"
import {
  buildMainVvaiStandardWelcomePlainText,
  MAIN_CUI_GUIDE_GREETING,
  SCENARIO_ZERO_MAIN_CUI_GUIDE_GREETING,
} from "./mainCuiGuideGreeting"
import { demoFollowUpPrompts } from "./cuiCardRulesDemo"
import { ThemeToggle } from "./ThemeToggle"
import { EducationStageSwitcher } from "./EducationStageSwitcher"
import { LessonDeliveryModeSwitcher } from "./LessonDeliveryModeSwitcher"
import { AiClassroomLiveWindow } from "./AiClassroomLiveWindow"
import { DEMO_LESSON } from "./aiClassroomLessonDemo"
import { findLessonSummary } from "./aiClassroomLessonsDemo"
import {
  loadDemoEducationStage,
  saveDemoEducationStage,
  type EducationStage,
} from "./educationStageDemo"
import {
  loadDemoLessonDeliveryMode,
  saveDemoLessonDeliveryMode,
  type LessonDeliveryMode,
} from "./lessonDeliveryMode"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "../ui/sheet"
import { ScenarioGuidePanel } from "../home/ScenarioGuidePanel"
import {
  conversations as seedConversations,
  coerceMessagesList,
  currentUser,
  users,
  type Conversation,
  type Message,
} from "../chat/data"
import { buildCuiFollowUpPrompts } from "../chat/dockCuiFollowUpPrompts"
import type { MainChatHistoryEntry } from "./mainChatHistoryTypes"
import {
  PAIRED_BOOTSTRAP_STORAGE_KEY,
  PAIRED_BROADCAST_CHANNEL,
  cloneConversationsList,
  cloneMainChatHistory,
  consumePairedMainAiInit,
  pairedStateFingerprint,
  type PairedSyncBroadcastPayload,
} from "./mainAiPairedSync"
import {
  getDockAppMeta,
  isPersonalScopeDockAppId,
  isPortalRootDockAppId,
  PERSONAL_EDU_SPACE_APP_ID,
  stableDockConversationId,
} from "./organizationDockConfig"
import { EDU_WELCOME_WEIWEI_MARKER, readEducationSpaceWelcomeHints } from "./educationSpaceDemoPersistence"
import { EDU_ROLE_DYNAMIC_OPENING_MARKER } from "./educationStageDemo"
import { isEducationDockAppId } from "./organizationDockConfig"

function AiClassroomLiveStandaloneWindow({
  role,
  lessonId,
}: {
  role: Exclude<EduSceneRole, "admin">
  lessonId: string
}) {
  const lessonTitle = findLessonSummary(lessonId)?.title ?? DEMO_LESSON.title
  const botAvatarSrc =
    users.find((u) => u.id === "ai-assistant")?.avatar ?? currentUser.avatar

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#0F1626]">
      <AiClassroomLiveWindow
        role={role}
        lessonId={lessonId}
        lessonTitle={lessonTitle}
        botAvatarSrc={botAvatarSrc}
        userAvatarSrc={currentUser.avatar}
        subCuiOpen={false}
        onClose={() => window.close()}
      />
    </div>
  )
}

/** 场景零（`no-org`）且未加入组织：教育壳层首条助手气泡 + 底部追问（与 MainAIChatWindow 顶区引导一致） */
function buildPortalDockWelcomeMessage(
  appId: string,
  appName: string,
  scenario: string | undefined,
  hasJoinedOrganizations: boolean,
  idSuffix: string
): Message {
  const ts = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  const now = Date.now()

  /**
   * 教育三身份场景（场景六/七/八）+ 教育上下文 dock：
   * 不写"你好，我是「教育」智能助手"这句通用欢迎，而是写一条占位 marker，
   * 让 MainAIChatWindow 的 empty-state 接管 AI 主动开场（基于当前 stage 动态生成 greeting + brief + Hero）。
   * 这样既避免重复欢迎语，又能在演示态切换 stage 时实时刷新开场文案。
   */
  if (eduScenarioRole(scenario) && (appId === "education" || isEducationDockAppId(appId))) {
    return {
      id: `dock-welcome-${idSuffix}-${now}`,
      senderId: "ai-assistant",
      content: EDU_ROLE_DYNAMIC_OPENING_MARKER,
      timestamp: ts,
      createdAt: now,
    }
  }

  const isScenarioZeroEduShell =
    isHomeScenarioZeroNoOrg(scenario, hasJoinedOrganizations) &&
    (appId === PERSONAL_EDU_SPACE_APP_ID || appId === "education")
  if (isScenarioZeroEduShell) {
    const hints = readEducationSpaceWelcomeHints(scenario)
    if (hints.hasAnySpace && hints.currentSpaceName) {
      const kindCn =
        hints.currentSpaceKind === "institutional"
          ? "机构教育空间"
          : hints.currentSpaceKind === "family"
            ? "家庭教育空间"
            : "教育空间"
      const follow = hasJoinedOrganizations
        ? (["创建教育空间", "创建机构教育空间", "创建家庭教育空间", "加入教育空间"] as const)
        : (["创建教育空间", "创建家庭教育空间", "加入组织", "创建组织"] as const)
      return {
        id: `dock-welcome-${idSuffix}-${now}`,
        senderId: "ai-assistant",
        content: `你好，欢迎使用「${appName}」。\n\n当前教育空间：「${hints.currentSpaceName}」（${kindCn}）。你可以在对话中继续管理该空间，或通过下方入口创建或加入更多空间。`,
        timestamp: ts,
        createdAt: now,
        cuiFollowUpPrompts: [...follow],
        cuiFollowUpSendTexts: [...follow],
      }
    }
    return {
      id: `dock-welcome-${idSuffix}-${now}`,
      senderId: "ai-assistant",
      content: EDU_WELCOME_WEIWEI_MARKER,
      timestamp: ts,
      createdAt: now,
    }
  }
  return {
    id: `dock-welcome-${idSuffix}-${now}`,
    senderId: "ai-assistant",
    content: `你好，我是「${appName}」智能助手。你可以使用底部快捷指令，或直接描述你的需求。`,
    timestamp: ts,
    createdAt: now,
  }
}

/**
 * MainAIChatWindow 的 key：除下列稳定场景外，默认用 selectedId（切换会话会整实例重挂载）。
 * - 场景五类：固定 key，避免布局抖动。
 * - 场景二（含多组织）与 CUI 规则入口：固定 key，避免底部「教育」门户因 remount 闪退。
 * - 《主入口》（无 scenario）：固定 key，避免切换会话时顶栏组织、应用条与列表选中态被重置。
 */
function mainAiChatWindowInstanceKey(
  scenario: string | undefined,
  selectedId: string,
  standalone: boolean
): string {
  if (isScenarioFiveLike(scenario)) return "scenario-five-like"
  if (
    scenario === "edu-one" ||
    scenario === SCENARIO_TWO_MULTI_ORGS ||
    scenario === SCENARIO_CUI_CARD_RULES
  ) {
    return `home-scenario-${scenario}`
  }
  if (isMainEntryScenario(scenario)) {
    return standalone ? "main-entry-standalone" : "main-entry"
  }
  /** 场景0（`no-org`）：与《主入口》等一致用稳定 key，避免切换会话整实例重挂载导致「创建/加入组织」后的列表被清空 */
  if (scenario === "no-org") {
    return standalone ? "no-org-standalone" : "home-scenario-no-org"
  }
  /**
   * 教育三身份场景（场景六/七/八）：稳定 key，避免切换会话时教育门户、教育空间状态被重挂；
   * 与场景二一致选择固定 key（含 standalone 后缀以兼容独立窗口）。
   */
  if (isEduRoleScenario(scenario)) {
    return standalone ? `home-scenario-${scenario}-standalone` : `home-scenario-${scenario}`
  }
  return selectedId
}

const DEFAULT_MAIN_CHAT_ID = seedConversations[0]?.id ?? "c1"

/** 场景零主 VVAI：首条助手气泡 + 推荐指令写入消息流，后续用户输入不顶掉本段历史 */
function buildScenarioZeroMainCuiWelcomeMessages(): Message[] {
  const now = Date.now()
  const ts = new Date().toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
  return [
    {
      id: `vvai-scenario-zero-main-${now}`,
      senderId: "ai-assistant",
      content: SCENARIO_ZERO_MAIN_CUI_GUIDE_GREETING,
      timestamp: ts,
      createdAt: now,
      cuiFollowUpPrompts: ["创建组织", "加入组织", "创建教育空间", "加入教育空间"],
      cuiFollowUpSendTexts: ["创建组织", "加入组织", "创建教育空间", "加入教育空间"],
    },
  ]
}

/**
 * 教育三身份场景（场景六/七/八/九）：主会话首条助手气泡文案统一为 **主 VVAI 标准欢迎**（与顶区 `MainVvaiStandardWelcomeCard` 一致）。
 *
 * 设计：**主 VVAI 欢迎气泡下方不再出推荐指令 chip**。
 *
 * 历史迭代沿革：
 * - v6 早期：曾按 `(stage × deliveryMode)` 派发 4 chip（与教育门户内主开场 chip 同源），
 *   动机是避免"主 VVAI / 门户内 / IM banner / 待办带"四处文案分叉；
 * - 但产品复盘认为：
 *   1) 主 VVAI 是"全身份共用 AI 入口"，欢迎气泡下挂 4 个教育向 chip 反而把这层"通用入口"窄化成教育业务出口
 *   2) 教育业务的能力发现已由"待办带 / 教育 hero / dock 二级菜单 / 子 CUI 内主开场 chip"四处承担，主 VVAI 不必再重复
 *   3) 用户在主 VVAI 大概率要问的是跨身份普适问题，给定向 chip 反而干扰
 * - 因此 v7 起：**主 VVAI 欢迎气泡裸奔**（仅留欢迎文案，无 follow-up chip）。
 *
 * 注意：本改动**不影响**"首次进入教育应用"门户内的主开场（`MainVvaiStandardWelcomeCard` 下挂的 chip 行）、
 * IM banner、待办带、子 CUI 内开场等其它教育业务出口；它们仍按各自 (role × stage × deliveryMode) 维度派发。
 */
function buildEduRoleWelcomeMessages(scenario: string | undefined): Message[] {
  const role = eduScenarioRole(scenario)
  if (!role) return []
  const now = Date.now()
  const ts = new Date().toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
  return [
    {
      id: `vvai-edu-role-${role}-${now}`,
      senderId: "ai-assistant",
      content: buildMainVvaiStandardWelcomePlainText(),
      timestamp: ts,
      createdAt: now,
    },
  ]
}

/**
 * 地址栏 `scenario` 对应的主会话首屏种子（写入 `messages`，与顶区静态欢迎互斥）。
 * 无匹配时返回 `[]`（由调用方决定是否清空主会话）。
 */
function mainCuiInitialSeedMessagesForUrlScenario(sc: string | null | undefined): Message[] {
  if (sc === "no-org") return buildScenarioZeroMainCuiWelcomeMessages()
  if (sc === "edu-one" || sc === SCENARIO_TWO_MULTI_ORGS) {
    return buildSingleOrgEduAttendanceFlowWelcomeMessages(sc ?? undefined)
  }
  if (sc === SCENARIO_CUI_CARD_RULES) return buildCuiCardRulesWelcomeMessages()
  if (
    sc === SCENARIO_EDU_TEACHER ||
    sc === SCENARIO_EDU_STUDENT ||
    sc === SCENARIO_EDU_PARENT ||
    sc === SCENARIO_EDU_ADMIN
  ) {
    return buildEduRoleWelcomeMessages(sc)
  }
  if (sc == null || sc === "") return buildMainEntryMainCuiWelcomeMessages()
  return []
}

function pickMainCuiEmptyThreadSeedMessagesForScenario(
  scenario: string | undefined
): Message[] | null {
  if (isSingleOrgEduAttendanceScenarioFlow(scenario)) {
    return buildSingleOrgEduAttendanceFlowWelcomeMessages(scenario)
  }
  if (isCuiCardRulesScenario(scenario)) return buildCuiCardRulesWelcomeMessages()
  if (isMainEntryScenario(scenario)) return buildMainEntryMainCuiWelcomeMessages()
  if (scenario === "no-org") return buildScenarioZeroMainCuiWelcomeMessages()
  if (isEduRoleScenario(scenario)) return buildEduRoleWelcomeMessages(scenario)
  return null
}

/** 顶栏「开启新会话」后注入主会话的 VVAI 引导说明（非空列表，便于用户继续输入） */
function buildMainCuiNewThreadWelcomeMessages(): Message[] {
  const now = Date.now()
  const ts = new Date().toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
  const content = MAIN_CUI_GUIDE_GREETING
  return [
    {
      id: `vvai-thread-open-${now}`,
      senderId: "ai-assistant",
      content,
      timestamp: ts,
      createdAt: now,
      cuiFollowUpPrompts: buildCuiFollowUpPrompts("新会话开场", "VVAI"),
    },
  ]
}

/** 场景二（单机构 / 多组织）欢迎种子；仅改单机构场景二时请只调 `edu-one` 分支。 */
function buildSingleOrgEduAttendanceFlowWelcomeMessages(scenario: string | undefined): Message[] {
  if (!isSingleOrgEduAttendanceScenarioFlow(scenario)) {
    return buildMainCuiNewThreadWelcomeMessages()
  }
  const now = Date.now()
  const ts = new Date().toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
  const content = MAIN_CUI_GUIDE_GREETING
  return [
    {
      id: `vvai-single-org-edu-flow-${scenario}-${now}`,
      senderId: "ai-assistant",
      content,
      timestamp: ts,
      createdAt: now,
      cuiFollowUpPrompts: ["查看考勤", "打开任务列表"],
    },
  ]
}

function buildMainChatHistorySnapshot(messages: Message[]): MainChatHistoryEntry {
  const list = coerceMessagesList(messages)
  const firstUser = list.find((m) => m.senderId === currentUser.id)
  const rawTitle = firstUser?.content?.trim().slice(0, 40)?.replace(/\s+/g, " ") ?? ""
  const title =
    rawTitle ||
    `对话 ${new Date().toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}`
  const last = list[list.length - 1]
  const updatedAt =
    typeof last?.createdAt === "number" && Number.isFinite(last.createdAt) ? last.createdAt : Date.now()
  return {
    id: `mh-${Date.now()}`,
    title,
    updatedAt,
    messages: list.map((m) => ({ ...m })),
  }
}

const SESSION_LIST_WIDTH_STORAGE_KEY = "main-ai-session-list-width-v1"

function readSessionListWidth(): number {
  if (typeof window === "undefined") return 280
  try {
    const n = Number(localStorage.getItem(SESSION_LIST_WIDTH_STORAGE_KEY))
    if (Number.isFinite(n) && n >= 220 && n <= 480) return Math.round(n)
  } catch {
    /* ignore */
  }
  return 280
}

/** 「CUI卡片交互场景及规则」入口：主会话空态引导，串联 5 条交互规则演示 */
function buildCuiCardRulesWelcomeMessages(): Message[] {
  const now = Date.now()
  const ts = new Date().toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
  const content = `${MAIN_CUI_GUIDE_GREETING}

以下为「CUI 卡片交互场景及规则」演示，可按编号体验：

1）自然语言：可发「演示非操作指令回复」「演示非业务问题回复」，或「谢谢」等；也可点下方推荐指令。
2）主对话 GUI 卡片：发「生成学期教研计划卡片」；卡片上可继续「发起调课申请」得到另一张业务卡片。
3）右侧侧栏：在教研计划卡片上点「在侧栏编辑参与教师」，二级表单全部在侧栏完成，不再嵌套三级页面。
4）原卡片内编辑：发「打开可调字段的教研计划卡片」，在卡片内改字段并保存，同一张卡片刷新为完成态。
5）统一弹窗：发「打开日历演示弹窗」「选择联系人演示」「二次确认演示」。`
  return [
    {
      id: `vvai-cui-card-rules-${now}`,
      senderId: "ai-assistant",
      content,
      timestamp: ts,
      createdAt: now,
      cuiFollowUpPrompts: demoFollowUpPrompts(),
    },
  ]
}

/** 《主入口》：与场景二同构的 VVAI 引导（主会话为空时），文案对应两个默认通用组织 */
function buildMainEntryMainCuiWelcomeMessages(): Message[] {
  const now = Date.now()
  const ts = new Date().toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
  const content = MAIN_CUI_GUIDE_GREETING
  return [
    {
      id: `vvai-main-entry-welcome-${now}`,
      senderId: "ai-assistant",
      content,
      timestamp: ts,
      createdAt: now,
      cuiFollowUpPrompts: buildCuiFollowUpPrompts("多组织通用演示开场", "VVAI"),
    },
  ]
}

export function MainAI() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const scenario =
    (location.state as { scenario?: string } | null)?.scenario ??
    searchParams.get("scenario") ??
    undefined

  /** 独立浏览器窗口：`/main-ai?standalone=1`，仅《主CUI交互》全宽列（无《主导航栏》）、独立 state */
  const isStandaloneWindow = searchParams.get("standalone") === "1"
  const isLiveClassroomWindow = searchParams.get("liveClassroom") === "1"
  const liveClassroomRole = eduScenarioRole(scenario)

  if (
    isLiveClassroomWindow &&
    liveClassroomRole &&
    liveClassroomRole !== "admin"
  ) {
    return (
      <AiClassroomLiveStandaloneWindow
        role={liveClassroomRole}
        lessonId={searchParams.get("lessonId") ?? DEMO_LESSON.id}
      />
    )
  }

  /**
   * 主会话初始为空：《主入口》与场景二一致，dock 应用会话仍由 `handleDockAppActivate` 按需创建。
   * `?standalone=1&paired=1`：由 opener 写入 sessionStorage 的 bootstrap 覆盖初始列表（与主窗口同步）。
   */
  const [conversations, setConversations] = React.useState<Conversation[]>(() => {
    if (typeof window === "undefined") return [...seedConversations]
    const paired = consumePairedMainAiInit(window.location.search)
    if (paired) return paired.conversations
    const params = new URLSearchParams(window.location.search)
    const standalone = params.get("standalone") === "1"
    const base = [...seedConversations]
    const sc = params.get("scenario")
    const withMainSeeds = (seeds: Message[]) =>
      base.map((c) => (c.id === DEFAULT_MAIN_CHAT_ID ? { ...c, messages: seeds } : c))
    if (standalone) {
      const seeds = mainCuiInitialSeedMessagesForUrlScenario(sc)
      return seeds.length ? withMainSeeds(seeds) : withMainSeeds([])
    }
    if (
      sc === "edu-one" ||
      sc === SCENARIO_TWO_MULTI_ORGS ||
      sc === SCENARIO_CUI_CARD_RULES ||
      sc === "no-org" ||
      sc == null ||
      sc === "" ||
      /** 场景六/七/八：原先落在此分支之外，主会话保留了 seed「c1」里的占位文案（英：Text Content），看起来就像从未注入教育种子 */
      isEduRoleScenario(sc ?? undefined)
    ) {
      const seeds = mainCuiInitialSeedMessagesForUrlScenario(sc)
      return seeds.length ? withMainSeeds(seeds) : withMainSeeds([])
    }
    return [...seedConversations]
  })
  const [selectedId, setSelectedId] = React.useState<string>(() => {
    if (typeof window !== "undefined") {
      const paired = consumePairedMainAiInit(window.location.search)
      if (paired) return paired.selectedId
    }
    return DEFAULT_MAIN_CHAT_ID
  })
  /** 会话列表默认收起；顶栏「展开侧栏」或《主AI入口》等路径下由用户或逻辑再打开 */
  const [historyOpen, setHistoryOpen] = React.useState(() => false)
  /** 非场景五类：分栏常驻历史会话；场景五类：顶栏下分栏；由初始 scenario 决定，不经《主AI入口》清空 */
  const [sessionListPinned, setSessionListPinned] = React.useState(() => !isScenarioFiveLike(scenario))
  /** 底部应用条：展示某应用的快捷指令；与当前选中会话独立（返回仅收起快捷条） */
  const [shortcutBarAppId, setShortcutBarAppId] = React.useState<string | null>(null)
  /** 分栏宽度在父级持有，避免切换会话时 MainAIChatWindow 因 key 重挂载而丢失 */
  const [sessionSidebarWidth, setSessionSidebarWidth] = React.useState(readSessionListWidth)
  const [mainChatHistory, setMainChatHistory] = React.useState<MainChatHistoryEntry[]>(() => {
    if (typeof window !== "undefined") {
      const paired = consumePairedMainAiInit(window.location.search)
      if (paired) return paired.mainChatHistory
    }
    return []
  })

  const [pairedSyncActive, setPairedSyncActive] = React.useState(() => {
    if (typeof window === "undefined") return false
    const p = new URLSearchParams(window.location.search)
    return p.get("standalone") === "1" && p.get("paired") === "1"
  })

  const syncInstanceIdRef = React.useRef(
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `vvai-${Date.now()}-${Math.random().toString(36).slice(2)}`
  )
  const applyingRemoteRef = React.useRef(false)
  const pairedSyncActiveRef = React.useRef(pairedSyncActive)
  pairedSyncActiveRef.current = pairedSyncActive
  /** 主会话 id 不变时父级整体替换消息（新建对话 / 历史恢复），子组件依此同步本地 messages */
  const [mainChatSessionRevision, setMainChatSessionRevision] = React.useState(0)
  /** 侧栏 VVAI 历史列表高亮：与当前主会话消息快照一致的归档条目 id */
  const [sidebarMainHistoryHighlightId, setSidebarMainHistoryHighlightId] = React.useState<string | null>(null)
  const [scenarioGuideOpen, setScenarioGuideOpen] = React.useState(false)
  /**
   * 教育三身份场景（场景六/七/八）的「课前 / 课中 / 课后」demo 阶段。
   * 这是 demo 用于演示「不同时间段进入产品」体验差异的快速切换入口，**不属于主产品体验区**，
   * 因此放在演示页头（《场景说明》/《场景入口》同行），不再污染《主CUI交互》顶栏。
   */
  const isEduRoleDemoScenario = isEduRoleScenario(scenario)
  const [educationStage, setEducationStage] = React.useState<EducationStage>(() =>
    loadDemoEducationStage(scenario)
  )
  React.useEffect(() => {
    setEducationStage(loadDemoEducationStage(scenario))
  }, [scenario])
  const handleEducationStageChange = React.useCallback(
    (next: EducationStage) => {
      setEducationStage(next)
      saveDemoEducationStage(scenario, next)
    },
    [scenario],
  )

  /**
   * 课程形态（线上 / 线下）演示开关。仅在 stage = 课中 时呈现切换器（差异最显著）。
   * 即使切到课前 / 课后，状态依旧保留在 sessionStorage，再切回课中可继续看上次形态。
   */
  const [lessonDeliveryMode, setLessonDeliveryMode] = React.useState<LessonDeliveryMode>(() =>
    loadDemoLessonDeliveryMode(scenario),
  )
  React.useEffect(() => {
    setLessonDeliveryMode(loadDemoLessonDeliveryMode(scenario))
  }, [scenario])
  const handleLessonDeliveryModeChange = React.useCallback(
    (next: LessonDeliveryMode) => {
      setLessonDeliveryMode(next)
      saveDemoLessonDeliveryMode(scenario, next)
    },
    [scenario],
  )

  React.useEffect(() => {
    if (selectedId !== DEFAULT_MAIN_CHAT_ID) {
      setSidebarMainHistoryHighlightId(null)
      return
    }
    const main = conversations.find((c) => c.id === DEFAULT_MAIN_CHAT_ID)
    if (!main) {
      setSidebarMainHistoryHighlightId(null)
      return
    }
    const mainMsgs = coerceMessagesList(main.messages)
    const match = mainChatHistory.find((e) => {
      const eMsgs = coerceMessagesList(e.messages)
      return eMsgs.length === mainMsgs.length && eMsgs.every((m, i) => m.id === mainMsgs[i]?.id)
    })
    setSidebarMainHistoryHighlightId(match?.id ?? null)
  }, [selectedId, conversations, mainChatHistory])

  React.useEffect(() => {
    try {
      localStorage.setItem(SESSION_LIST_WIDTH_STORAGE_KEY, String(sessionSidebarWidth))
    } catch {
      /* ignore */
    }
  }, [sessionSidebarWidth])

  React.useEffect(() => {
    if (!isStandaloneWindow) return
    const prev = document.title
    document.title = "VVAI · 独立窗口"
    return () => {
      document.title = prev
    }
  }, [isStandaloneWindow])

  const conversationsRef = React.useRef(conversations)
  conversationsRef.current = conversations
  const mainChatHistoryRef = React.useRef(mainChatHistory)
  mainChatHistoryRef.current = mainChatHistory
  const selectedIdRef = React.useRef(selectedId)
  selectedIdRef.current = selectedId
  const lastNotifiedOrgIdRef = React.useRef<string | null>(null)

  const persistConversationMessages = React.useCallback((id: string, messages: Message[]) => {
    const safe = Array.isArray(messages) ? messages : []
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, messages: safe } : c)))
  }, [])

  /** dock「非业务自然语言」轮次：把用户原话与通用回复追加到主 VVAI 会话时间线（不切换当前选中会话） */
  const appendMainVvaiNonBusinessMirror = React.useCallback(
    (args: { userText: string; assistantText: string; sourceAppName: string }) => {
      const ts = () =>
        new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false })
      const now = Date.now()
      const userMsg: Message = {
        id: `main-nb-nl-u-${now}`,
        senderId: currentUser.id,
        content: args.userText.trim(),
        timestamp: ts(),
        createdAt: now,
      }
      const botMsg: Message = {
        id: `main-nb-nl-a-${now + 1}`,
        senderId: "ai-assistant",
        content: args.assistantText,
        timestamp: ts(),
        createdAt: now + 1,
      }
      setConversations((prev) =>
        prev.map((c) =>
          c.id === DEFAULT_MAIN_CHAT_ID
            ? { ...c, messages: [...coerceMessagesList(c.messages), userMsg, botMsg] }
            : c
        )
      )
    },
    []
  )

  const handleHistoryOpenChange = React.useCallback(
    (open: boolean) => {
      if (sessionListPinned && !open) return
      setHistoryOpen(open)
    },
    [sessionListPinned]
  )

  const handleToggleHistorySidebar = React.useCallback(() => {
    setHistoryOpen((o) => !o)
  }, [])

  const dockShortcutBarIdForSelection = React.useCallback((dockAppId: string | null | undefined) => {
    if (!dockAppId) return null
    return isPortalRootDockAppId(dockAppId) ? null : dockAppId
  }, [])

  const handleSelectConversation = React.useCallback(
    (id: string) => {
      setSelectedId(id)
      const c = conversationsRef.current.find((x) => x.id === id)
      setShortcutBarAppId(dockShortcutBarIdForSelection(c?.dockAppId))
    },
    [dockShortcutBarIdForSelection]
  )

  const dockPersonalIdsMigratedRef = React.useRef(false)
  React.useLayoutEffect(() => {
    if (dockPersonalIdsMigratedRef.current) return
    dockPersonalIdsMigratedRef.current = true
    flushSync(() => {
      setConversations((prev) => {
        const map = new Map<string, Conversation>()
        for (const c of prev) {
          let conv = c
          const m0 = c.id.match(/^dock:no-org:(.+)$/)
          const m1 = c.id.match(/^dock:([^:]+):(.+)$/)
          if (m0 && isPersonalScopeDockAppId(m0[1])) {
            conv = {
              ...c,
              id: `dock:app:${m0[1]}`,
              dockAppId: m0[1],
              dockOrgId: undefined,
            }
          } else if (
            m1 &&
            m1[1] !== "app" &&
            isPersonalScopeDockAppId(m1[2])
          ) {
            conv = {
              ...c,
              id: `dock:app:${m1[2]}`,
              dockAppId: m1[2],
              dockOrgId: undefined,
            }
          }
          const normConv: Conversation = { ...conv, messages: coerceMessagesList(conv.messages) }
          const ex = map.get(normConv.id)
          const exLen = ex ? coerceMessagesList(ex.messages).length : 0
          if (!ex || normConv.messages.length > exLen) {
            map.set(normConv.id, normConv)
          }
        }
        return Array.from(map.values())
      })
      setSelectedId((cur) => {
        const m0 = cur.match(/^dock:no-org:(.+)$/)
        if (m0 && isPersonalScopeDockAppId(m0[1])) return `dock:app:${m0[1]}`
        const m1 = cur.match(/^dock:([^:]+):(.+)$/)
        if (m1 && m1[1] !== "app" && isPersonalScopeDockAppId(m1[2])) {
          return `dock:app:${m1[2]}`
        }
        return cur
      })
    })
  }, [])

  const handleCurrentOrgChange = React.useCallback(
    (orgId: string, ctx?: { hasJoinedOrganizations?: boolean }) => {
      const hasJoined = ctx?.hasJoinedOrganizations ?? false
      const prevOrgNotify = lastNotifiedOrgIdRef.current
      if (prevOrgNotify !== null && prevOrgNotify !== orgId) {
        const sid = selectedIdRef.current
        const conv = conversationsRef.current.find((x) => x.id === sid)
        const dockSeg = sid.match(/^dock:([^:]+):(.+)$/)

        if (conv && dockSeg) {
          const scope = dockSeg[1]
          const appId = conv.dockAppId ?? dockSeg[2]
          const isPersonalDock =
            scope === "app" || (scope === "no-org" && isPersonalScopeDockAppId(appId))

          if (isPersonalDock) {
            setShortcutBarAppId(appId)
          } else if (hasJoined) {
            const appName = conv.sessionLabel?.trim() || appId
            const newId = stableDockConversationId(orgId, appId, hasJoined)
            if (newId !== sid) {
              setConversations((prevList) => {
                if (prevList.some((c) => c.id === newId)) return prevList
                /**
                 * 教育三身份 + 教育上下文 dock：使用占位 marker，避免与 empty-state AI 主动开场重复
                 * （详见 buildPortalDockWelcomeMessage 处的注释）
                 */
                const isEduRoleEduDock =
                  eduScenarioRole(scenario) != null &&
                  (appId === "education" || isEducationDockAppId(appId))
                const welcome: Message = {
                  id: `dock-welcome-${Date.now()}`,
                  senderId: "ai-assistant",
                  content: isEduRoleEduDock
                    ? EDU_ROLE_DYNAMIC_OPENING_MARKER
                    : `你好，我是「${appName}」智能助手。你可以使用底部快捷指令，或直接描述你的需求。`,
                  timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                  createdAt: Date.now(),
                }
                const newConv: Conversation = {
                  id: newId,
                  dockAppId: appId,
                  dockOrgId: orgId,
                  sessionLabel: appName,
                  user: users[0],
                  messages: [welcome],
                  unread: 0,
                }
                return [newConv, ...prevList]
              })
            }
            setSelectedId(newId)
            setShortcutBarAppId(isPortalRootDockAppId(appId) ? null : appId)
          } else {
            setShortcutBarAppId(null)
            setSelectedId((cur) => {
              const c = conversationsRef.current.find((x) => x.id === cur)
              if (!c) return DEFAULT_MAIN_CHAT_ID
              if (cur.startsWith("dock-app-")) return DEFAULT_MAIN_CHAT_ID
              return cur
            })
          }
        } else {
          setShortcutBarAppId(null)
          setSelectedId((cur) => {
            const c = conversationsRef.current.find((x) => x.id === cur)
            if (!c) return DEFAULT_MAIN_CHAT_ID
            if (cur.startsWith("dock-app-")) return DEFAULT_MAIN_CHAT_ID
            return cur
          })
        }
      }
      lastNotifiedOrgIdRef.current = orgId
    },
    []
  )

  /** 场景二：主 VVAI 与各 dock 应用会话镜像写入（不切换当前选中会话） */
  const handleMirrorDockConversation = React.useCallback(
    (args: {
      dockAppId: string
      orgId: string
      hasJoinedOrganizations: boolean
      pairs?: { userText: string; assistantText: string }[]
      mirrorExtraMessages?: Message[]
      patchLastAssistantContentPrefix?: string
      patchLastAssistantContent?: string
      /** 按消息 id 合并到目标 dock 会话（与主会话 `toDockMirrorPeerMessageId` 对位） */
      patchMessages?: { id: string; merge: Partial<Message> }[]
    }) => {
      const appId = args.dockAppId
      const prefix = args.patchLastAssistantContentPrefix
      const patchContent = args.patchLastAssistantContent
      if (prefix && patchContent != null) {
        const convId = stableDockConversationId(args.orgId, appId, args.hasJoinedOrganizations)
        setConversations((prev) =>
          prev.map((row) => {
            if (row.id !== convId) return row
            const msgs = coerceMessagesList(row.messages)
            let hit = -1
            for (let i = msgs.length - 1; i >= 0; i--) {
              const m = msgs[i]!
              if (
                m.senderId === "ai-assistant" &&
                typeof m.content === "string" &&
                m.content.startsWith(prefix)
              ) {
                hit = i
                break
              }
            }
            if (hit < 0) return row
            const nextMsgs = msgs.map((m, j) =>
              j === hit ? { ...m, content: patchContent } : m
            )
            return { ...row, messages: nextMsgs }
          })
        )
        return
      }

      const patches = args.patchMessages
      if (Array.isArray(patches) && patches.length > 0) {
        const convId = stableDockConversationId(args.orgId, appId, args.hasJoinedOrganizations)
        const patchById = new Map(patches.map((p) => [p.id, p.merge]))
        setConversations((prev) =>
          prev.map((row) => {
            if (row.id !== convId) return row
            const msgs = coerceMessagesList(row.messages)
            const nextMsgs = msgs.map((m) => {
              const merge = patchById.get(m.id)
              return merge ? { ...m, ...merge } : m
            })
            return { ...row, messages: nextMsgs }
          })
        )
        return
      }

      const meta = getDockAppMeta(appId, scenario)
      const convId = stableDockConversationId(args.orgId, appId, args.hasJoinedOrganizations)
      const ts = () =>
        new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false })
      const baseNow = Date.now()
      const pairs = Array.isArray(args.pairs) ? args.pairs : []
      const toAppend: Message[] = pairs.flatMap((p, i) => {
        const t0 = baseNow + i * 4
        return [
          {
            id: `mirror-dock-u-${appId}-${baseNow}-${i}`,
            senderId: currentUser.id,
            content: p.userText,
            timestamp: ts(),
            createdAt: t0,
          },
          {
            id: `mirror-dock-a-${appId}-${baseNow}-${i}`,
            senderId: "ai-assistant",
            content: p.assistantText,
            timestamp: ts(),
            createdAt: t0 + 1,
          },
        ]
      })
      const mirrorExtras = coerceMessagesList(args.mirrorExtraMessages).map((m) => ({ ...m }))
      const allAppend = [...toAppend, ...mirrorExtras]

      setConversations((prev) => {
        const ix = prev.findIndex((c) => c.id === convId)
        if (ix === -1) {
          const welcome = buildPortalDockWelcomeMessage(
            appId,
            meta.name,
            scenario,
            args.hasJoinedOrganizations,
            `mirror-${appId}-${baseNow}`
          )
          welcome.createdAt = baseNow - 2
          const newConv: Conversation = {
            id: convId,
            dockAppId: appId,
            dockOrgId:
              args.hasJoinedOrganizations && !isPersonalScopeDockAppId(appId) ? args.orgId : undefined,
            sessionLabel: meta.name,
            user: users[0],
            messages: [welcome, ...allAppend],
            unread: 0,
          }
          return [newConv, ...prev]
        }
        return prev.map((row) =>
          row.id === convId
            ? { ...row, messages: [...coerceMessagesList(row.messages), ...allAppend] }
            : row
        )
      })
    },
    [scenario]
  )

  const handleRegisterPortalRootSession = React.useCallback(
    (appId: string, appName: string, orgId: string, hasJoinedOrganizations: boolean) => {
      const convId = stableDockConversationId(orgId, appId, hasJoinedOrganizations)
      setConversations((prev) => {
        if (prev.some((c) => c.id === convId)) return prev
        const welcome = buildPortalDockWelcomeMessage(
          appId,
          appName,
          scenario,
          hasJoinedOrganizations,
          "reg"
        )
        const newConv: Conversation = {
          id: convId,
          dockAppId: appId,
          dockOrgId:
            hasJoinedOrganizations && !isPersonalScopeDockAppId(appId) ? orgId : undefined,
          sessionLabel: appName,
          user: users[0],
          messages: [welcome],
          unread: 0,
        }
        return [newConv, ...prev]
      })
      setSelectedId(convId)
      setShortcutBarAppId(null)
    },
    [scenario]
  )

  const handleDockAppActivate = React.useCallback(
    (appId: string, appName: string, orgId: string, hasJoinedOrganizations: boolean) => {
      const convId = stableDockConversationId(orgId, appId, hasJoinedOrganizations)
      setConversations((prev) => {
        if (prev.some((c) => c.id === convId)) return prev
        const welcome = buildPortalDockWelcomeMessage(
          appId,
          appName,
          scenario,
          hasJoinedOrganizations,
          "activate"
        )
        const newConv: Conversation = {
          id: convId,
          dockAppId: appId,
          dockOrgId:
            hasJoinedOrganizations && !isPersonalScopeDockAppId(appId) ? orgId : undefined,
          sessionLabel: appName,
          user: users[0],
          messages: [welcome],
          unread: 0,
        }
        return [newConv, ...prev]
      })
      setSelectedId(convId)
      setShortcutBarAppId(isPortalRootDockAppId(appId) ? null : appId)
    },
    [scenario]
  )

  /** 主会话意图卡片：进入应用会话并带入用户原话；syncFrom 与 dock 更新同一批 setState，避免丢主会话消息 */
  const handleIntentDockHandoff = React.useCallback(
    (
      appId: string,
      appName: string,
      orgId: string,
      hasJoinedOrganizations: boolean,
      carryOverText: string,
      syncFrom?: { conversationId: string; messages: Message[] },
      /** 场景二：主会话引导跳转，用户消息为原指令，首条助手为演示业务回复 */
      schoolPlainHandoff?: { plainInstruction: string; assistantReply: string }
    ) => {
      const convId = stableDockConversationId(orgId, appId, hasJoinedOrganizations)
      const ts = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      const now = Date.now()
      /** 场景二引导跳转：与主 VVAI 中用户发出的指令原文一致（由调用方传入 carryOverText） */
      const carriedInstruction = (carryOverText ?? "").trim() || schoolPlainHandoff?.plainInstruction || ""
      const carryMsg: Message = {
        id: `handoff-user-${now}`,
        senderId: currentUser.id,
        content: schoolPlainHandoff ? carriedInstruction : `【从主对话转入】${carryOverText}`,
        timestamp: ts,
        createdAt: now,
      }
      const botAck: Message = {
        id: `handoff-bot-${now + 1}`,
        senderId: "ai-assistant",
        content: schoolPlainHandoff
          ? schoolPlainHandoff.assistantReply
          : `已收到你在主对话中的描述。我们可以在这里继续处理「${appName}」相关需求；也可使用底部快捷指令。`,
        timestamp: ts,
        createdAt: now + 1,
      }
      flushSync(() => {
        setConversations((prev) => {
          let next = prev
          if (syncFrom) {
            next = next.map((c) =>
              c.id === syncFrom.conversationId
                ? { ...c, messages: coerceMessagesList(syncFrom.messages) }
                : c
            )
          }
          const exists = next.some((c) => c.id === convId)
          if (!exists) {
            if (schoolPlainHandoff) {
              const newConv: Conversation = {
                id: convId,
                dockAppId: appId,
                dockOrgId:
                  hasJoinedOrganizations && !isPersonalScopeDockAppId(appId) ? orgId : undefined,
                sessionLabel: appName,
                user: users[0],
                messages: [carryMsg, botAck],
                unread: 0,
              }
              return [newConv, ...next]
            }
            const welcome = buildPortalDockWelcomeMessage(
              appId,
              appName,
              scenario,
              hasJoinedOrganizations,
              `handoff-${now}`
            )
            welcome.createdAt = now - 1
            const newConv: Conversation = {
              id: convId,
              dockAppId: appId,
              dockOrgId:
                hasJoinedOrganizations && !isPersonalScopeDockAppId(appId) ? orgId : undefined,
              sessionLabel: appName,
              user: users[0],
              messages: [welcome, carryMsg, botAck],
              unread: 0,
            }
            return [newConv, ...next]
          }
          return next.map((c) =>
            c.id === convId
              ? { ...c, messages: [...coerceMessagesList(c.messages), carryMsg, botAck] }
              : c
          )
        })
        if (!isScenarioTwoFamily(scenario)) {
          setSelectedId(convId)
          setShortcutBarAppId(isPortalRootDockAppId(appId) ? null : appId)
        }
      })
    },
    [scenario]
  )

  /** 应用 A dock → 应用 B dock：带「从某应用转入」前缀，减少用户重述 */
  const handleCrossDockHandoff = React.useCallback(
    (
      targetAppId: string,
      targetAppName: string,
      orgId: string,
      hasJoinedOrganizations: boolean,
      carryOverText: string,
      fromAppName: string,
      syncFrom?: { conversationId: string; messages: Message[] },
      extras?: { targetBootstrapMessages?: Message[]; mainThreadMirrorExtras?: Message[] }
    ) => {
      const convId = stableDockConversationId(orgId, targetAppId, hasJoinedOrganizations)
      const ts = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      const now = Date.now()
      const carryMsg: Message = {
        id: `cross-dock-user-${now}`,
        senderId: currentUser.id,
        content: `【从「${fromAppName}」转入】${carryOverText}`,
        timestamp: ts,
        createdAt: now,
      }
      const botAck: Message = {
        id: `cross-dock-bot-${now + 1}`,
        senderId: "ai-assistant",
        content: `已收到你在「${fromAppName}」中的描述。我们在「${targetAppName}」里继续处理；也可使用底部快捷指令。`,
        timestamp: ts,
        createdAt: now + 1,
      }
      const targetExtras = coerceMessagesList(extras?.targetBootstrapMessages).map((m) => ({ ...m }))
      const mainExtras = coerceMessagesList(extras?.mainThreadMirrorExtras).map((m) => ({ ...m }))
      flushSync(() => {
        setConversations((prev) => {
          let next = prev
          if (syncFrom) {
            next = next.map((c) =>
              c.id === syncFrom.conversationId
                ? { ...c, messages: coerceMessagesList(syncFrom.messages) }
                : c
            )
          }
          const exists = next.some((c) => c.id === convId)
          if (!exists) {
            const welcome = buildPortalDockWelcomeMessage(
              targetAppId,
              targetAppName,
              scenario,
              hasJoinedOrganizations,
              `cross-${now}`
            )
            welcome.createdAt = now - 1
            const newConv: Conversation = {
              id: convId,
              dockAppId: targetAppId,
              dockOrgId:
                hasJoinedOrganizations && !isPersonalScopeDockAppId(targetAppId)
                  ? orgId
                  : undefined,
              sessionLabel: targetAppName,
              user: users[0],
              messages: [welcome, carryMsg, botAck, ...targetExtras],
              unread: 0,
            }
            next = [newConv, ...next]
          } else {
            next = next.map((c) =>
              c.id === convId
                ? {
                    ...c,
                    messages: [...coerceMessagesList(c.messages), carryMsg, botAck, ...targetExtras],
                  }
                : c
            )
          }
          if (mainExtras.length > 0) {
            next = next.map((c) =>
              c.id === DEFAULT_MAIN_CHAT_ID
                ? { ...c, messages: [...coerceMessagesList(c.messages), ...mainExtras] }
                : c
            )
          }
          return next
        })
        if (!isScenarioTwoFamily(scenario)) {
          setSelectedId(convId)
          setShortcutBarAppId(isPortalRootDockAppId(targetAppId) ? null : targetAppId)
        }
      })
    },
    [scenario]
  )

  const handleDockBarBack = React.useCallback(() => {
    setShortcutBarAppId(null)
  }, [])

  const handleNewMainChat = React.useCallback(() => {
    setShortcutBarAppId(null)
    setSelectedId(DEFAULT_MAIN_CHAT_ID)
  }, [])

  /** 仅此处写入主 VVAI 历史归档；顶栏其它「回到主会话」路径不会生成历史条目 */
  const handleMainChatNewThread = React.useCallback(() => {
    const main = conversationsRef.current.find((c) => c.id === DEFAULT_MAIN_CHAT_ID)
    if (main && coerceMessagesList(main.messages).length > 0) {
      setMainChatHistory((prev) => [buildMainChatHistorySnapshot(coerceMessagesList(main.messages)), ...prev])
    }
    const seeds =
      pickMainCuiEmptyThreadSeedMessagesForScenario(scenario) ?? buildMainCuiNewThreadWelcomeMessages()
    setConversations((prev) =>
      prev.map((c) => (c.id === DEFAULT_MAIN_CHAT_ID ? { ...c, messages: seeds } : c))
    )
    setMainChatSessionRevision((r) => r + 1)
    setShortcutBarAppId(null)
    setSelectedId(DEFAULT_MAIN_CHAT_ID)
  }, [scenario])

  const handleSelectMainChatHistoryEntry = React.useCallback((entryId: string) => {
    const entry = mainChatHistoryRef.current.find((e) => e.id === entryId)
    if (!entry) return
    setConversations((prev) =>
      prev.map((c) =>
        c.id === DEFAULT_MAIN_CHAT_ID
          ? { ...c, messages: coerceMessagesList(entry.messages).map((m) => ({ ...m })) }
          : c
      )
    )
    setMainChatSessionRevision((r) => r + 1)
    setShortcutBarAppId(null)
    setSelectedId(DEFAULT_MAIN_CHAT_ID)
  }, [])

  /** 《主AI入口》进入《主CUI交互》：回到 VVAI 主会话；历史会话侧栏收起，分栏钉住与初始场景一致（不因本入口改为 overlay） */
  const handleEnterMainCuiSessionLayout = React.useCallback(() => {
    setShortcutBarAppId(null)
    setSelectedId(DEFAULT_MAIN_CHAT_ID)
    setHistoryOpen(false)
    const seeds = pickMainCuiEmptyThreadSeedMessagesForScenario(scenario)
    if (!seeds) return
    const main = conversationsRef.current.find((c) => c.id === DEFAULT_MAIN_CHAT_ID)
    if (main && coerceMessagesList(main.messages).length === 0) {
      setConversations((prev) =>
        prev.map((c) => (c.id === DEFAULT_MAIN_CHAT_ID ? { ...c, messages: seeds } : c))
      )
      setMainChatSessionRevision((r) => r + 1)
    }
  }, [scenario])

  /** 独立窗口：直接进入 CUI 时注入与主框架一致的首屏主会话种子（无《主AI入口》点击） */
  React.useEffect(() => {
    if (!isStandaloneWindow) return
    const seeds = pickMainCuiEmptyThreadSeedMessagesForScenario(scenario)
    if (!seeds) return
    const main = conversationsRef.current.find((c) => c.id === DEFAULT_MAIN_CHAT_ID)
    if (!main || coerceMessagesList(main.messages).length > 0) return
    setConversations((prev) =>
      prev.map((c) => (c.id === DEFAULT_MAIN_CHAT_ID ? { ...c, messages: seeds } : c))
    )
    setMainChatSessionRevision((r) => r + 1)
  }, [isStandaloneWindow, scenario])

  const openStandaloneMainCui = React.useCallback(() => {
    try {
      const bootstrap: Omit<PairedSyncBroadcastPayload, "source"> = {
        conversations: cloneConversationsList(conversationsRef.current),
        mainChatHistory: cloneMainChatHistory(mainChatHistoryRef.current),
        selectedId: selectedIdRef.current,
      }
      sessionStorage.setItem(PAIRED_BOOTSTRAP_STORAGE_KEY, JSON.stringify(bootstrap))
      setPairedSyncActive(true)
      const u = new URL(`${window.location.origin}${window.location.pathname}`)
      u.searchParams.set("standalone", "1")
      u.searchParams.set("paired", "1")
      const sc = scenario ?? searchParams.get("scenario")
      if (sc) u.searchParams.set("scenario", sc)
      else u.searchParams.delete("scenario")
      window.open(u.toString(), "_blank", "noopener,noreferrer,width=1320,height=880")
    } catch {
      /* ignore */
    }
  }, [scenario, searchParams])

  React.useEffect(() => {
    if (!pairedSyncActive) return
    if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return
    const ch = new BroadcastChannel(PAIRED_BROADCAST_CHANNEL)
    const instanceId = syncInstanceIdRef.current

    ch.onmessage = (ev: MessageEvent<PairedSyncBroadcastPayload>) => {
      const d = ev.data
      if (!d || d.source === instanceId) return
      const remoteFp = pairedStateFingerprint(d.conversations, d.mainChatHistory, d.selectedId)
      const localFp = pairedStateFingerprint(
        conversationsRef.current,
        mainChatHistoryRef.current,
        selectedIdRef.current
      )
      if (remoteFp === localFp) return
      applyingRemoteRef.current = true
      try {
        flushSync(() => {
          setConversations(cloneConversationsList(d.conversations))
          setMainChatHistory(cloneMainChatHistory(d.mainChatHistory))
          setSelectedId(d.selectedId)
          const sel = d.conversations.find((c) => c.id === d.selectedId)
          setShortcutBarAppId(dockShortcutBarIdForSelection(sel?.dockAppId))
          setMainChatSessionRevision((r) => r + 1)
        })
      } finally {
        queueMicrotask(() => {
          applyingRemoteRef.current = false
        })
      }
    }

    const tick = window.setInterval(() => {
      if (!pairedSyncActiveRef.current) return
      if (applyingRemoteRef.current) return
      const payload: PairedSyncBroadcastPayload = {
        source: instanceId,
        conversations: conversationsRef.current,
        mainChatHistory: mainChatHistoryRef.current,
        selectedId: selectedIdRef.current,
      }
      ch.postMessage(payload)
    }, 160)

    return () => {
      window.clearInterval(tick)
      ch.close()
    }
  }, [pairedSyncActive])

  const selectedConversation =
    conversations.find((c) => c.id === selectedId) ?? conversations[0]

  const mainAiChatWindow = (
    <MainAIChatWindow
      key={mainAiChatWindowInstanceKey(scenario, selectedId, isStandaloneWindow)}
      conversation={selectedConversation}
      onToggleHistory={handleToggleHistorySidebar}
      historyOpen={historyOpen}
      onHistoryOpenChange={handleHistoryOpenChange}
      conversations={conversations}
      selectedId={selectedId}
      onSelect={handleSelectConversation}
      onPersistConversationMessages={persistConversationMessages}
      onDockAppActivate={handleDockAppActivate}
      onRegisterPortalRootSession={handleRegisterPortalRootSession}
      onIntentDockHandoff={handleIntentDockHandoff}
      onMirrorDockConversation={handleMirrorDockConversation}
      onAppendMainVvaiNonBusinessMirror={appendMainVvaiNonBusinessMirror}
      onCrossDockHandoff={handleCrossDockHandoff}
      onCurrentOrgChange={handleCurrentOrgChange}
      shortcutBarAppId={shortcutBarAppId}
      onDockBarBack={handleDockBarBack}
      onNewMainChat={handleNewMainChat}
      mainChatHistory={mainChatHistory}
      onSelectMainChatHistoryEntry={handleSelectMainChatHistoryEntry}
      activeMainChatHistoryEntryId={sidebarMainHistoryHighlightId}
      onMainChatNewThread={handleMainChatNewThread}
      isMainCuiStandaloneWindow={isStandaloneWindow}
      onOpenStandaloneMainCui={isStandaloneWindow ? undefined : openStandaloneMainCui}
      mainChatSessionRevision={mainChatSessionRevision}
      sessionListPinned={sessionListPinned}
      onEnterMainCuiSessionLayout={handleEnterMainCuiSessionLayout}
      sessionSidebarWidth={sessionSidebarWidth}
      onSessionSidebarWidthChange={setSessionSidebarWidth}
      cuiMainChatId={DEFAULT_MAIN_CHAT_ID}
      scenario={scenario}
      educationStage={educationStage}
      onEducationStageChange={handleEducationStageChange}
      lessonDeliveryMode={lessonDeliveryMode}
    />
  )

  if (isStandaloneWindow) {
    return (
      <div className="flex h-screen w-full flex-col overflow-hidden bg-cui-bg">{mainAiChatWindow}</div>
    )
  }

  return (
    <div className="relative flex h-screen w-full flex-col bg-bg-secondary">
      {/* 与会话列表 HistorySidebar 顶栏同一套间距与底边分割，避免悬浮圆钮 */}
      <header
        className="flex min-w-0 shrink-0 items-center justify-between gap-x-[var(--space-200)] border-b border-border px-[max(20px,var(--space-300))] pb-[var(--space-250)] pt-[var(--space-300)]"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-[var(--space-100)]">
          <div className="flex min-w-0 items-center">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="flex h-[var(--space-800)] w-[var(--space-800)] shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius-md)] border-none bg-transparent p-0 text-text-secondary transition-colors hover:bg-[var(--black-alpha-11)]"
              title="返回首页"
              aria-label="返回首页"
            >
              <ArrowLeft className="h-3 w-3 shrink-0" strokeWidth={2} aria-hidden />
            </button>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-[var(--space-200)]">
          {/* 教育三身份场景（场景六/七/八）专属：课前 / 课中 / 课后 demo 阶段切换。
              用于演示用户在不同时间段进入产品时的体验差异，**仅作演示页头工具**，不进《主CUI交互》。 */}
          {isEduRoleDemoScenario ? (
            <div className="flex shrink-0 items-center gap-[var(--space-100)]">
              <span
                className="text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] text-text-tertiary"
                aria-hidden
              >
                Demo
              </span>
              <EducationStageSwitcher
                value={educationStage}
                onChange={handleEducationStageChange}
                size="sm"
              />
              {/* 课程形态（PRD 2.5.1）：差异最显著在课中，仅 stage="in" 时呈现切换器，
                  避免课前 / 课后再让用户面对一个不影响当下体验的开关。 */}
              {educationStage === "in" ? (
                <LessonDeliveryModeSwitcher
                  value={lessonDeliveryMode}
                  onChange={handleLessonDeliveryModeChange}
                />
              ) : null}
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => setScenarioGuideOpen(true)}
            className="shrink-0 rounded-[var(--radius-md)] border-none bg-transparent px-[var(--space-100)] py-[var(--space-50)] text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] text-primary transition-colors hover:bg-[var(--black-alpha-11)] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            场景说明
          </button>
          <Link
            to="/#scenario-two-notes"
            className="shrink-0 text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] text-primary underline-offset-2 hover:underline"
          >
            场景入口
          </Link>
          <ThemeToggle className="rounded-[var(--radius-md)] border-none bg-transparent" />
        </div>
      </header>

      <Sheet open={scenarioGuideOpen} onOpenChange={setScenarioGuideOpen}>
        <SheetContent
          side="right"
          className="flex h-full w-[min(100vw-1rem,440px)] max-w-none flex-col border-l border-border bg-bg p-0 sm:max-w-none"
        >
          <SheetHeader className="shrink-0 border-b border-border px-[var(--space-400)] pb-[var(--space-300)] pt-[var(--space-400)]">
            <SheetTitle className="text-left text-[length:var(--font-size-base)] font-[var(--font-weight-semi-bold)] text-text">
              场景说明
            </SheetTitle>
            <SheetDescription className="sr-only">
              与首页场景入口旁说明一致：主入口、单组织、多组织等规则摘要。
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-[var(--space-400)] pb-[var(--space-600)] pt-[var(--space-300)]">
            <ScenarioGuidePanel />
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex min-h-0 min-w-0 flex-1 items-center justify-center p-[var(--space-600)]">
        <div className="relative flex h-full min-h-0 min-w-0 w-full max-w-full flex-col overflow-hidden rounded-xl border border-border shadow-elevation-sm">
          {mainAiChatWindow}
        </div>
      </div>
    </div>
  )
}
