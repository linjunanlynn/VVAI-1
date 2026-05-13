import * as React from "react"
import { ScrollArea } from "../ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar"
import { Input } from "../ui/input";
import { AllAppsDrawer } from "./AllAppsDrawer";
import { coerceMessagesList, Conversation, currentUser, Message } from "../chat/data"
import { cn } from "../ui/utils"
import { PersonalInfoManager } from "../chat/PersonalInfoManager"
import { HistorySidebar } from "../chat/HistorySidebar"
import { DockCuiFollowUpStrip } from "../chat/DockCuiFollowUpStrip"
import { ScenarioTwoMultiAttendanceFollowUpStrip } from "../chat/ScenarioTwoMultiAttendanceFollowUpStrip"
import { ScenarioTwoMultiFollowUpGrid } from "../chat/ScenarioTwoMultiFollowUpGrid"
import { 
  TimestampSeparator
} from "../chat/ChatComponents"
import { SidebarIcon } from "../chat/SidebarIcons"
import { CreateEmailForm } from "../chat/CreateEmailForm"
import { Button } from "../ui/button"
import { GenericCard } from "./GenericCard"
import {
  AttendanceStatisticsSnapshotCard,
  formatAttendanceMonthTitle,
} from "./AttendanceStatisticsSnapshotCard"

import { AppIcon } from './AppIcon';
import { DockAppSwitcherChip } from './DockAppSwitcherChip';
import { ChatNavBar } from "../chat/ChatNavBar"
import { ChatWelcome } from "../chat/ChatWelcome"
import { MainVvaiStandardWelcomeCard } from "./MainVvaiStandardWelcomeCard"
import { MAIN_CUI_GUIDE_GREETING, SCENARIO_ZERO_MAIN_CUI_GUIDE_GREETING } from "./mainCuiGuideGreeting"
import { PinnedTaskCard } from "../chat/PinnedTaskCard"
import { TaskDetailDrawer } from "../chat/TaskDetailDrawer"
import { ChatMessageBubble } from "../chat/ChatMessageBubble"
import { ChatSender } from "../chat/ChatSender"
import {
  DockSessionOrgReplyBanner,
  MainCuiCardOrgAttributionBanner,
} from "../chat/DockAgentOrgScopeBar"
import { OrganizationSwitcherCard, Organization } from "./OrganizationSwitcherCard"
import { ChatPromptButton } from "../chat/ChatPromptButton"
import { CreateOrgFormCard } from "./CreateOrgFormCard"
import { CreateOrgSuccessCard } from "./CreateOrgSuccessCard"
import { EduSpaceTypeSelectCard } from "./EduSpaceTypeSelectCard"
import { AiClassroomSkillTreePanel } from "./AiClassroomSkillTreePanel"
import {
  AI_CLASSROOM_SKILL_CARD_MARKER,
  buildAiClassroomSkillPlaceholderReply,
  pickAiClassroomTree,
  type AiClassroomSkillItem,
} from "./aiClassroomSkillTree"
import { AiClassroomSkillCard } from "./AiClassroomSkillCard"
import {
  getAiClassroomSkillCardConfig,
  resolveRecommendedPromptReply,
} from "./aiClassroomSkillRegistry"
import { TeacherLessonPrepCard } from "./TeacherLessonPrepCard"
import { TeacherLessonReportReviewCard } from "./TeacherLessonReportReviewCard"
import { StudentMistakeChallengeCard } from "./StudentMistakeChallengeCard"
import { ParentLessonReportCard } from "./ParentLessonReportCard"
import { AdminTodaySnapshotCard } from "./AdminTodaySnapshotCard"
import { AdminBusinessCard } from "./AdminBusinessCard"
import { getAdminBusinessCardData } from "./adminBusinessCardData"
import {
  canonicalizeEduFirstEntryCommand,
  findAdminCardIdByCommand,
  getEduFirstEntryCopy,
  isEduFirstEntryChipCommand,
} from "./educationFirstEntryCopy"
import {
  AiClassroomScheduleCard,
  AI_CLASSROOM_SCHEDULE_CARD_MARKER,
  buildAiClassroomScheduleCardContent,
  buildOpenScheduleUserCommand,
  parseAiClassroomScheduleCardRole,
} from "./AiClassroomScheduleCard"
import {
  EduLessonPickerCard,
  EDU_LESSON_PICKER_MARKER,
  buildEduLessonPickerCardContent,
  parseEduLessonPickerPayload,
  type EduLessonPickerPayload,
} from "./EduLessonPickerCard"
import { AiClassroomStructuredReplyBubble } from "./AiClassroomStructuredReplyBubble"
import {
  AIC_REPLY_MARKER,
  serializeAiClassroomReply,
  parseAiClassroomReply,
} from "./aiClassroomReply"
import { getEduMainChipMeta } from "./educationMainChipMeta"
import { LiveLessonHintCard } from "./LiveLessonHintCard"
import {
  EDU_DOCK_MENU_CARD_MARKER,
  buildEduDockMenuCardContent,
  getEduDockMenuCardData,
  parseEduDockMenuCardContent,
} from "./educationDockMenuRegistry"
import { EduDockMenuCard } from "./EduDockMenuCard"
import {
  EduCourseProductsCard,
  RENDER_EDU_COURSE_PRODUCTS_CARD_MARKER,
  buildEduCourseProductsMarkerContent,
  parseEduCourseProductsMarkerContent,
} from "./EduCourseProductsCard"
import {
  EduTeachingMaterialsBrowserCard,
  RENDER_EDU_TEACHING_MATERIALS_BROWSER_CARD_MARKER,
  buildEduTeachingMaterialsBrowserMarkerContent,
  parseEduTeachingMaterialsBrowserMarkerContent,
} from "./EduTeachingMaterialsBrowserCard"
import { EduCourseFulfillmentCard } from "./EduCourseFulfillmentCard"
import {
  EDU_DISK_LIST_CARD_MARKER,
  EDU_DISK_FOLDER_CARD_MARKER,
  buildEduDiskListCardContent,
  buildEduDiskFolderCardContent,
  parseEduDiskListCardContent,
  parseEduDiskFolderCardContent,
  getEduDiskListData,
  getEduDiskFolderData,
  isEduDiskEntryCommand,
  matchEduDiskOpenSpaceCommand,
} from "./educationDiskRegistry"
import { EduDiskListCard } from "./EduDiskListCard"
import { EduDiskFolderCard } from "./EduDiskFolderCard"
import { LessonOperationListCard } from "./LessonOperationListCard"
import {
  LESSON_OPERATION_LIST_CARD_MARKER,
  buildLessonOperationListCardContent,
  getLessonOperationKindByMenuId,
  parseLessonOperationListCardContent,
} from "./lessonOperationListCardRegistry"

/**
 * 课中提示卡 marker（与 EduDockMenuCard 类似，role 跟在 marker 后；学生 / 家长 / 教师都可走同一卡片）。
 */
const LIVE_LESSON_HINT_CARD_MARKER = "<<<RENDER_LIVE_LESSON_HINT_CARD>>>" as const
const EDU_COURSE_FULFILLMENT_CARD_MARKER = "<<<RENDER_EDU_COURSE_FULFILLMENT_CARD>>>" as const
/**
 * 主对话内嵌「风采报告卡」marker（仅学生 / 家长侧）：
 * - 用于 IM banner 点击「课后报告」消息时，直接在主对话出一张 LessonReviewCard，
 *   而不是跳子 CUI，方便家长 / 学生在主对话流里点赞 / 评论。
 * - 载荷以 `MARKER:role:base64(JSON.stringify({lessonId, lessonTitle}))` 形式编码，
 *   保证 lessonTitle 内的《》/中文/特殊字符不会破坏 marker 分隔。
 */
const MAIN_LESSON_REVIEW_CARD_MARKER = "<<<RENDER_MAIN_LESSON_REVIEW_CARD>>>" as const

type EduSceneRoleNonAdmin = "teacher" | "student" | "parent"

function encodeMainLessonReviewMarker(
  role: EduSceneRoleNonAdmin,
  lessonId: string,
  lessonTitle: string,
): string {
  const payload = JSON.stringify({ lessonId, lessonTitle })
  // btoa 不支持非 ASCII；先 encodeURIComponent → unescape 转 latin1
  const safe =
    typeof window !== "undefined" && typeof window.btoa === "function"
      ? window.btoa(unescape(encodeURIComponent(payload)))
      : payload
  return `${MAIN_LESSON_REVIEW_CARD_MARKER}:${role}:${safe}`
}

function parseMainLessonReviewMarker(
  content: string,
): { role: EduSceneRoleNonAdmin; lessonId: string; lessonTitle: string } | null {
  if (!content.startsWith(`${MAIN_LESSON_REVIEW_CARD_MARKER}:`)) return null
  const rest = content.slice(MAIN_LESSON_REVIEW_CARD_MARKER.length + 1)
  const sep = rest.indexOf(":")
  if (sep === -1) return null
  const role = rest.slice(0, sep)
  if (role !== "teacher" && role !== "student" && role !== "parent") return null
  const encoded = rest.slice(sep + 1)
  try {
    const raw =
      typeof window !== "undefined" && typeof window.atob === "function"
        ? decodeURIComponent(escape(window.atob(encoded)))
        : encoded
    const parsed = JSON.parse(raw) as { lessonId?: unknown; lessonTitle?: unknown }
    if (typeof parsed.lessonId !== "string" || typeof parsed.lessonTitle !== "string") return null
    return { role, lessonId: parsed.lessonId, lessonTitle: parsed.lessonTitle }
  } catch {
    return null
  }
}

import { useEduImEventsForRole, useEduImUnreadCountForRole, type EduImEvent } from "./eduImBus"
import { EduImInboxBanner } from "./EduImInboxBanner"
import { LessonReviewCard } from "./LessonReviewCard"
import { useClassTasksForLesson } from "./eduClassTaskBus"
import { EduClassTaskBanner } from "./EduClassTaskBanner"
import {
  buildEducationPinnedGreeting,
  buildEducationPinnedTaskChips,
} from "./educationPinnedTaskData"
import { EduSpaceTopSwitcher } from "./EduSpaceTopSwitcher"
import {
  EDU_ROLE_DYNAMIC_OPENING_MARKER,
  getEducationStageDemoCopy,
  type EducationStage,
} from "./educationStageDemo"
import type { LessonDeliveryMode } from "./lessonDeliveryMode"
import {
  EDU_WELCOME_WEIWEI_MARKER,
  loadDemoEducationSpaceState,
  saveDemoEducationSpaceState,
  type DemoEducationSpaceRecord,
} from "./educationSpaceDemoPersistence"
import { EduWelcomeWeiweiCard } from "./EduWelcomeWeiweiCard"
import { SessionListEduSpaceHeader } from "../chat/SessionListEduSpaceHeader"
import { FamilyEducationRoleCard } from "../../fresh-user-portal/FamilyEducationRoleCard"
import { CreateFamilyEducationSpaceCard } from "../../fresh-user-portal/CreateFamilyEducationSpaceCard"
import {
  CreateInstitutionalEducationSpaceCard,
  type InstitutionalEducationSpacePayload,
} from "../../fresh-user-portal/CreateInstitutionalEducationSpaceCard"
import { EducationSpaceCreatedCard } from "../../fresh-user-portal/EducationSpaceCreatedCard"
import type { FamilyCreatorRole } from "../../fresh-user-portal/educationSpaceTypes"
import { JoinOrgFormCard } from "./JoinOrgFormCard"
import { JoinOrgConfirmCard } from "./JoinOrgConfirmCard"
import { getDockBarInlineShortcuts } from "./dockAppShortcuts"
import { matchMainAgentIntent } from "./mainAgentIntents"
import {
  matchSchoolScenarioEducationDockAttendanceGuidance,
  matchSchoolScenarioEducationDockEmployeeGuidance,
  matchSchoolScenarioMainCuiGuidance,
  type SchoolSceneAppGuidancePayload,
} from "./schoolScenarioMainCui"
import {
  getConversationDockAppId,
  hasAnyGlobalDockBusinessIntent,
  type GenericCardActionsPayload,
} from "./dockAgentIntentResolve"
import { buildDockNonBusinessNlAssistantBody } from "./dockNonBusinessNlReply"
import { getDockAppShortName } from "./dockAppShortNames"
import {
  extractStudentNameFromGradeQuery,
  isTeachingDockConversation,
  matchTeachingStudentGradeQuery,
} from "./teachingDockIntents"
import {
  TeachingStudentGradeCard,
  buildMockTeachingGradePayload,
  type TeachingStudentGradePayload,
} from "./TeachingStudentGradeCard"
import { SecondaryAppHistorySidebar, SecondaryAppSession } from "./SecondaryAppHistorySidebar"
import { MainChatHistorySheet } from "./MainChatHistorySheet"
import type { MainChatHistoryEntry } from "./mainChatHistoryTypes"
import { MainNavRail } from "./MainNavRail"
import { IMWorkspace } from "../im/IMWorkspace"
import { UserCalendarsProvider } from "../../vv-assistant/userCalendarsContext"
import {
  VvScheduleSideSheetContext,
  type VvScheduleSideSheetOpenOpts,
  type VvScheduleSideSheetSurface,
} from "../../vv-assistant/vvScheduleSideSheetContext"
import {
  ScheduleAgendaModalPanel,
  VvAssistantBlocks,
  VvUserBubble,
} from "../../vv-assistant/VvAssistantBlocks"
import { runVvGeneralSend, vvAssistantMessageFromPayload } from "../../vv-assistant/vvSend"
import { isVvPayloadCalendarConversationSyncDomain } from "../../vv-assistant/vvCalendarMirrorDomain"
import {
  isTodayScheduleAgendaQuery,
  matchesScheduleToolbarQuickIntent,
  planGeneralVvInteraction,
  planIsDemoCatalogFallback,
} from "../../vv-assistant/vvPlan"
import type {
  VvContext,
  VvFlow,
  VvMeetingItem,
  VvScheduleCalendarPrefs,
  VvScheduleItem,
  VvUserCalendarType,
} from "../../vv-assistant/types"
import {
  docsSeed,
  driveSeed,
  mailSeed,
  meetingSeed,
  recordSeed,
  scheduleSeed,
  todoSeed,
} from "../../vv-assistant/seeds"
import { defaultScheduleCalendarPrefs } from "../../vv-assistant/scheduleCalendarPrefs"
import { SCHEDULE_APP_QUICK_COMMANDS } from "../../vv-assistant/generalQuickCommands"
import {
  ScheduleSideConversationPanel,
  type ScheduleSideThreadBridge,
} from "./ScheduleSideConversationPanel"
import {
  AiClassroomSideConversationPanel,
  type AiClassroomSidePanelOpenRequest,
} from "./AiClassroomSideConversationPanel"
import {
  AiClassroomSeriesSideConversationPanel,
  type AiClassroomSeriesSidePanelOpenRequest,
} from "./AiClassroomSeriesSideConversationPanel"
import { CreateCourseSideConversationPanel } from "./CreateCourseSideConversationPanel"
import { CreateScheduleSideConversationPanel } from "./CreateScheduleSideConversationPanel"
import {
  EduCourseGoodsCard,
  RENDER_EDU_COURSE_GOODS_CARD_MARKER,
  buildEduCourseGoodsMarkerContent,
  parseEduCourseGoodsMarkerContent,
} from "./EduCourseGoodsCard"
import { AiClassroomScheduleAgendaPanel } from "./AiClassroomScheduleAgendaPanel"
import { DEMO_LESSON, DEMO_STUDENT_SELF } from "./aiClassroomLessonDemo"
import { findLessonSummary } from "./aiClassroomLessonsDemo"
import { findLessonSeries } from "./aiClassroomLessonSeriesDemo"
import {
  buildSeriesFromCourse,
  findCourseBySeriesId,
} from "./eduCoursesPersistence"
import type { EducationPinnedChip } from "./educationPinnedTaskData"
import {
  consumePendingEduSkillRequest,
  rememberLastEduRole,
  readLastEduRole,
  writePendingEduSkillRequest,
  buildEduRoleScenarioUrl,
} from "./educationCrossAppHandoff"
import {
  EMPLOYEE_MGMT_MARKER,
  EMPLOYEE_MGMT_CARD_APP_IDS,
  matchesEmployeeMgmtIntent,
} from "./employeeMgmtIntent"
import { EmployeeManagementPanel } from "./EmployeeManagementPanel"
import type { TeacherInviteRecordModel } from "./EducationTeacherManagementPanel"
import {
  ScheduleCalendarSettingsPrefsSync,
  SubscribedColleagueBridgeSync,
  UserCalendarTypesBridgeSync,
  VvChatFullInsetPortalHost,
  VvChatInsetDialogPortalHost,
} from "./calendarDockVvBridgeSync"
import { createCalendarDockVvActionHandler } from "./calendarDockVvHandleVvAction"

import aiModelIcon from 'figma:asset/f165fadc65db69eb9ce3d5feeb2f6b4dc2638bd6.png';
import educationIcon from 'figma:asset/8449365f45bb140bf269f6769f74387249864ed8.png';
import calendarIcon from 'figma:asset/e653b0a7cada3ea08e52cb29bc4bd546be59d3d5.png';
import meetingIcon from 'figma:asset/88d3d6e7f0cac8b8bba0a46f8757585fe7cdaf9a.png';
import todoIcon from 'figma:asset/3598e566543c9c6ef7ab3cb268538a29b6bdb58d.png';
import diskIcon from 'figma:asset/78530a18370215c595d4c989d64c188f7450dbda.png';
import companyIcon from 'figma:asset/bc4adf9e89b5ade28461d7ae6da09053ea8bf0e1.png';
import profileIcon from 'figma:asset/a9b0f43698a9015397dc60f26d1ea217390fec97.png';
import organizationIcon from 'figma:asset/737725172f66f16b2662ff1ddc8ab69293de567f.png';
import employeeIcon from 'figma:asset/b07b1535d0d656029e5b3942f78ecf273f5852ee.png';
import recruitmentIcon from 'figma:asset/81759343e3c0735a95d3ee5a5e7cf7a767e83846.png';
import salaryIcon from 'figma:asset/776e838a4088fe446d0c5d29220b88ab1ad922bc.png';
import inventoryIcon from 'figma:asset/1850125514f29104c8f00034a7873528b971a815.png';

import { Calculator, BookA, PenTool, Users, ArrowLeft, MoreHorizontal, Briefcase, ShoppingBag, DollarSign, GripHorizontal, ChevronDown, Boxes, Upload, BadgeDollarSign, Clock, CalendarCheck, BarChart3, UserCog, Receipt, History, PieChart, PanelLeft, Square, X, AppWindow, Maximize2, LayoutGrid, GraduationCap } from "lucide-react"
import { motion, AnimatePresence, useDragControls } from "motion/react"
import { usePopper } from "react-popper"
import { createPortal } from "react-dom"

// 统一的应用数据源 - 移自 appData.ts
export interface AppItem {
  id: string;
  name: string;
  icon: {
    gradient?: string;
    iconType?: string;
    imageSrc?: string;
  };
  order: number;
}

interface MainAIChatWindowProps {
  conversation: Conversation
  onToggleHistory: () => void
  historyOpen?: boolean
  onHistoryOpenChange?: (open: boolean) => void
  conversations?: Conversation[]
  selectedId?: string
  onSelect?: (id: string) => void
  /** 切换会话前将上一会话消息写回父级（dock 会话持久化） */
  onPersistConversationMessages?: (conversationId: string, messages: Message[]) => void
  /** 底部应用条点击：打开历史并绑定 dock 会话（个人应用为 dock:app:*，组织应用为 dock:组织:应用） */
  onDockAppActivate?: (
    appId: string,
    appName: string,
    orgId: string,
    hasJoinedOrganizations: boolean
  ) => void
  /** 教育 / 医院门户根入口：写入会话列表但不切换当前选中会话、不进入单应用快捷条 */
  onRegisterPortalRootSession?: (
    appId: string,
    appName: string,
    orgId: string,
    hasJoinedOrganizations: boolean
  ) => void
  /** 主会话意图识别后，跳转到应用会话并带入用户原话；可选先同步当前会话消息到父级（原子更新） */
  onIntentDockHandoff?: (
    appId: string,
    appName: string,
    orgId: string,
    hasJoinedOrganizations: boolean,
    carryOverText: string,
    syncFrom?: { conversationId: string; messages: Message[] },
    /** 场景二：应用会话内首条用户消息为原指令，首条助手为演示业务回复 */
    schoolPlainHandoff?: { plainInstruction: string; assistantReply: string }
  ) => void
  /** 应用 dock → 另一应用 dock（如课程管理 → 教学管理），handoff 文案带「从某应用转入」 */
  onCrossDockHandoff?: (
    targetAppId: string,
    targetAppName: string,
    orgId: string,
    hasJoinedOrganizations: boolean,
    carryOverText: string,
    fromAppName: string,
    syncFrom?: { conversationId: string; messages: Message[] },
    extras?: { targetBootstrapMessages?: Message[]; mainThreadMirrorExtras?: Message[] }
  ) => void
  /** 当前组织变化时通知父级，用于重置快捷条与 dock 会话选中态 */
  onCurrentOrgChange?: (orgId: string, context: { hasJoinedOrganizations: boolean }) => void
  /** 非 null 时底部条展示该应用的快捷指令 */
  shortcutBarAppId?: string | null
  onDockBarBack?: () => void
  /** 顶栏「新消息」回到主对话并收起快捷条 */
  onNewMainChat?: () => void
  /** 主 VVAI 顶栏「历史消息」列表数据 */
  mainChatHistory?: MainChatHistoryEntry[]
  /** 选中历史条目后恢复该轮对话到主会话 */
  onSelectMainChatHistoryEntry?: (entryId: string) => void
  /** 侧栏 VVAI 历史列表当前高亮条目（与主会话消息快照一致时由父级同步） */
  activeMainChatHistoryEntryId?: string | null
  /** 主 VVAI 顶栏「新建对话」：归档当前并清空 */
  onMainChatNewThread?: () => void
  /** 当前为 `?standalone=1` 打开的独立浏览器窗口时置 true：不渲染《主导航栏》、默认进 CUI；顶栏「新建」走 onMainChatNewThread */
  isMainCuiStandaloneWindow?: boolean
  /** 主窗口顶栏「新建对话」：打开与《主CUI交互》同框架的独立窗口（独立 state） */
  onOpenStandaloneMainCui?: () => void
  /** 父级替换主会话消息时递增，驱动子组件同步 messages */
  mainChatSessionRevision?: number
  /** 用户曾进入底部应用对话后，会话列表与主内容区分栏常驻 */
  sessionListPinned?: boolean
  /** 《主AI入口》进入《主CUI交互》时恢复分栏会话列表 */
  onEnterMainCuiSessionLayout?: () => void
  /** 分栏时左侧会话列表宽度（px），须由父级持有以免切换会话重挂载丢失 */
  sessionSidebarWidth?: number
  onSessionSidebarWidthChange?: (width: number) => void
  /** 主 AI 单会话 id（列表中仅展示这一条主对话 + 各应用 Agent） */
  cuiMainChatId?: string
  /** Home 场景入口：no-org / edu-one / scenario-two-multi / cui-card-rules；场景五为三组织数据 */
  scenario?: string
  /** 场景二：主 VVAI 与各 dock 应用会话镜像（不切换当前选中会话） */
  onMirrorDockConversation?: (args: {
    dockAppId: string
    orgId: string
    hasJoinedOrganizations: boolean
    pairs?: { userText: string; assistantText: string }[]
    mirrorExtraMessages?: Message[]
    /** 将对应 dock 会话中末条以此前缀开头的助手消息替换为全文（主会话卡片 onPatch 与考勤镜像对齐） */
    patchLastAssistantContentPrefix?: string
    patchLastAssistantContent?: string
    /** 按 id 合并 dock 镜像消息（与 `toDockMirrorPeerMessageId(主消息id)` 对位） */
    patchMessages?: { id: string; merge: Partial<Message> }[]
  }) => void
  /** dock 会话内「非业务自然语言」：用户句 + 通用回复同步追加到主 VVAI 会话 */
  onAppendMainVvaiNonBusinessMirror?: (args: {
    userText: string
    assistantText: string
    sourceAppName: string
  }) => void
  /**
   * 教育三身份场景的「课前 / 课中 / 课后」demo 阶段（受控）。
   * 切换器外提到 `MainAI` 演示页头（《场景说明》同行），以避免污染主产品体验区《主CUI交互》；
   * 此处仅消费当前阶段（驱动迎宾文案、追问与 AI课堂占位回复）。
   */
  educationStage?: EducationStage
  /**
   * 教师在子 CUI 内主动触发「开始上课 / 结束本节课」时的状态变更回调。
   * 不是 demo 顶部演示开关——这是产品内的"老师 = 课堂指挥者"语义：
   * 老师 = 唯一能让一节课 pre → in → post 的角色（学生 / 家长视角是被动同步）。
   */
  onEducationStageChange?: (next: EducationStage) => void
  /**
   * 课程形态（PRD 2.5.1）：🔵 线上课 / 🟢 线下课。
   * - 切换器仅在 stage="in"（课中）时呈现，故此处主要被课中相关消费者使用：
   *   `LiveLessonHintCard`、`LessonLiveHeroCard` Hero 文案、AI 课堂 Skill 注册表、子 CUI Skill Tree。
   * - 课前 / 课后阶段同样会带上当前形态值（默认 online），不影响这些阶段已有体验。
   */
  lessonDeliveryMode?: LessonDeliveryMode
}

const PERSONAL_INFO_MARKER = "<<<RENDER_PERSONAL_INFO>>>"
const CREATE_EMAIL_MARKER = "<<<RENDER_CREATE_EMAIL_FORM>>>"
const CONTINUE_EMAIL_MARKER = "<<<RENDER_CONTINUE_EMAIL_FORM>>>"
const ORG_SWITCHER_MARKER = "<<<RENDER_ORG_SWITCHER>>>"
const CREATE_ORG_FORM_MARKER = "<<<RENDER_CREATE_ORG_FORM>>>"
const CREATE_ORG_SUCCESS_MARKER = "<<<RENDER_CREATE_ORG_SUCCESS>>>"
/** 创建教育组织成功后，选择家庭教育空间 / 机构教育空间（全场景） */
const EDU_SPACE_TYPE_SELECT_MARKER = "<<<RENDER_EDU_SPACE_TYPE_SELECT>>>"
/** 场景零 / 教育组织创建后：家庭教育空间 — 身份选择 */
const EDU_SPACE_FAMILY_ROLE_MARKER = "<<<RENDER_EDU_SPACE_FAMILY_ROLE>>>"
const EDU_SPACE_FAMILY_FORM_MARKER = "<<<RENDER_EDU_SPACE_FAMILY_FORM>>>"
const EDU_SPACE_INST_FORM_MARKER = "<<<RENDER_EDU_SPACE_INST_FORM>>>"
/** 未加入任何组织时不可创建机构教育空间 */
const EDU_SPACE_INST_BLOCKED_MARKER = "<<<RENDER_EDU_SPACE_INST_BLOCKED>>>"
const EDU_SPACE_CREATED_MARKER = "<<<RENDER_EDU_SPACE_CREATED>>>"
/** AI课堂三级菜单（PRD 2.8.2 / 2.8.3）：marker 后跟 `:role`，role ∈ teacher/student/parent */
export const AI_CLASSROOM_TREE_MARKER = "<<<RENDER_AI_CLASSROOM_TREE>>>"
/**
 * 校长（场景九）主开场 chip 的身份化业务卡 marker：marker 后跟 `:adminCardId`，
 * 由 AdminBusinessCard 渲染（与三身份"进侧 CUI 看 skill 卡"对称的 admin 路径）。
 */
const ADMIN_BUSINESS_CARD_MARKER = "<<<RENDER_ADMIN_BUSINESS_CARD>>>"

function latestEduCreateOrgSuccessOrgName(
  messagesList: ReadonlyArray<{ content: string }>,
): string | null {
  for (let i = messagesList.length - 1; i >= 0; i--) {
    const c = messagesList[i]?.content
    if (!c.startsWith(`${CREATE_ORG_SUCCESS_MARKER}:`)) continue
    try {
      const data = JSON.parse(c.replace(`${CREATE_ORG_SUCCESS_MARKER}:`, "")) as {
        orgName?: string
        industry?: string
        isEducationIndustry?: boolean
      }
      const isEdu = data.isEducationIndustry === true || data.industry === "教育行业"
      if (!isEdu) continue
      return data.orgName?.trim() ? data.orgName : null
    } catch {
      continue
    }
  }
  return null
}

/** 主对话或教育门户内走完整「创建教育空间」表单向导（与创建教育组织成功后的体验一致） */
function shouldOfferFullEducationSpaceCreateFlow(
  scenario: string | undefined,
  hasJoinedOrganizations: boolean,
  educationTranscript: ReadonlyArray<{ content: string }>,
  mainTranscript: ReadonlyArray<{ content: string }>
): boolean {
  if (isHomeScenarioZeroNoOrg(scenario, hasJoinedOrganizations)) return true
  if (latestEduCreateOrgSuccessOrgName(educationTranscript) != null) return true
  if (latestEduCreateOrgSuccessOrgName(mainTranscript) != null) return true
  return false
}

const JOIN_ORG_FORM_MARKER = "<<<RENDER_JOIN_ORG_FORM>>>"
const JOIN_ORG_CONFIRM_MARKER = "<<<RENDER_JOIN_ORG_CONFIRM>>>"
const INTENT_HANDOFF_MARKER = "<<<INTENT_HANDOFF_CARD>>>"
/** 场景二：主 VVAI 追问后的「前往应用继续」引导卡片 */
const SCHOOL_SCENE_APP_GUIDANCE_MARKER = "<<<SCHOOL_SCENE_APP_GUIDANCE>>>"
const DOCK_CROSS_HANDOFF_MARKER = "<<<DOCK_CROSS_HANDOFF_CARD>>>"
const TEACHING_STUDENT_GRADE_MARKER = "<<<TEACHING_STUDENT_GRADE_CARD>>>"
/** 场景二：与 yzhao-workspace 任务欢迎「打开任务列表」一致的《任务管理》表卡 */
const TASK_TABLE_MARKER = "<<<RENDER_TASK_TABLE>>>"

// Command keywords
const PERSONAL_INFO_COMMANDS = [
  "管理个人信息",
  "manage personal information",
  "个人信息",
  "personal info",
  "个人信息管理"
]

const CREATE_EMAIL_COMMANDS = [
  "创建业务邮箱",
  "create business email",
  "业务邮箱",
  "business email",
  "创建邮件",
  "创建一封邮件",
  "帮我创建一封新邮件",
]

const CREATE_ORG_COMMANDS = [
  "创建组织",
  "创建企业",
  "create organization",
  "创建企业/组织"
]

const JOIN_ORG_COMMANDS = [
  "加入组织",
  "加入企业",
  "join organization",
  "加入企业/组织"
]

const SWITCH_ORG_COMMANDS = [
  "切换组织",
  "切换企业",
  "switch organization",
  "组织切换"
]

import orgIcon from 'figma:asset/58a97c06b4ae6edfc613d20add2fb4ead0363c64.png';
import {
  hideMainCuiNavHistoryIcon,
  eduScenarioRole,
  isCuiCardRulesScenario,
  isEduRoleConsumerScenario,
  isEduRoleScenario,
  isHomeScenarioZeroNoOrg,
  isMainEntryScenario,
  isNoOrgHomeScenarioRoute,
  isScenarioFiveLike,
  isScenarioFourOrMainEntry,
  isScenarioTwoFamily,
  isScenarioTwoMultiOrgs,
  isSingleOrgEduAttendanceScenarioFlow,
  SCENARIO_CUI_CARD_RULES,
  SCENARIO_EDU_ADMIN,
  SCENARIO_EDU_PARENT,
  SCENARIO_EDU_STUDENT,
  SCENARIO_EDU_TEACHER,
  SCENARIO_TWO_MULTI_ORGS,
  type EduLessonAttendingRole,
  type EduSceneRole,
} from "./homeScenarioLayout"
import { ScenarioTwoAttendanceOverviewCard } from "./ScenarioTwoAttendanceOverviewCard"
import { ScenarioTwoAttendanceSupplementCard } from "./ScenarioTwoAttendanceSupplementCard"
import { ScenarioTwoScheduleBuilderCard } from "./ScenarioTwoScheduleBuilderCard"
import { ScenarioTaskManagementTableCard } from "./ScenarioTaskManagementTableCard"
import { getTaskDetailOrFallback } from "./scenarioDemoTaskAppData"
import {
  defaultScenarioTwoAttendanceOverviewPayload,
  parseScenarioTwoAttendanceOverviewPayload,
  SCENARIO_TWO_ATTENDANCE_OVERVIEW_MARKER,
} from "./scenarioTwoAttendanceOverview"
import { matchesScenarioTwoViewAttendanceIntent } from "./scenarioTwoAttendanceIntent"
import { getScenarioTwoMultiAttendanceStripChipTexts } from "./scenarioTwoMultiAttendanceCardStrip"
import {
  defaultScenarioTwoAttendanceSupplementPayload,
  parseScenarioTwoAttendanceSupplementPayload,
  SCENARIO_TWO_ATTENDANCE_SUPPLEMENT_MARKER,
} from "./scenarioTwoAttendanceSupplementRequest"
import {
  defaultScenarioTwoScheduleBuilderPayload,
  parseScenarioTwoScheduleBuilderPayload,
  SCENARIO_TWO_SCHEDULE_BUILDER_MARKER,
} from "./scenarioTwoScheduleBuilder"
import { buildScenarioTwoMainThreadDockBundle } from "./scenarioTwoMainThreadDock"
import { toDockMirrorPeerMessageId } from "./dockMirrorPeerIds"
import {
  CUI_RULES_INTERACTION_MARKER,
  buildMeetingPayloadWithUi,
  demoFollowUpPrompts,
  matchCuiCardRulesDemo,
  parseCuiRulesPayload,
  patchCuiRulesMessage,
  serializeCuiRulesPayload,
} from "./cuiCardRulesDemo"
import {
  createHandoffCardMessage,
  createMeetingCardMessage,
  CuiRulesHandoffCardBody,
  CuiRulesInlinePlanBody,
  CuiRulesModalsHost,
  CuiRulesPlanCardBody,
  CuiRulesSecondaryPanel,
} from "./CuiRulesInteractionDemo"
import {
  CONTENT_SCOPE_ALL_ORGANIZATIONS_ID,
  defaultDockIdsForContext,
  defaultDockIdsUnionAcrossOrgs,
  DOCK_IDS_NO_ORG,
  findPortalAppById,
  getDockAppMeta,
  HOSPITAL_PORTAL_APPS,
  isEducationDockAppId,
  isPersonalScopeDockAppId,
  isPortalRootDockAppId,
  PERSONAL_EDU_SPACE_ACTIONS,
  PERSONAL_EDU_SPACE_APP_ID,
  PORTAL_ROOT_APP_IDS,
  prioritizePortalDockHead,
  resolveEducationPortalApps,
  stableDockConversationId,
  type PortalApp,
} from "./organizationDockConfig"
import { SCENARIO_FOUR_EDU_MULTI_HOME_ORGANIZATIONS } from "./scenarioFourEduMultiHomeOrgs"

// 可用模型列表
const AVAILABLE_MODELS = [
  {
    id: 'gpt-4',
    name: 'ChatGPT',
    description: '最强大的通用AI模型'
  },
  {
    id: 'gpt-3.5',
    name: 'GPT-3.5',
    description: '快速响应的轻量级模型'
  },
  {
    id: 'claude-3',
    name: 'Claude 3',
    description: 'Anthropic的先进AI助���'
  },
  {
    id: 'gemini-pro',
    name: 'Gemini Pro',
    description: 'Google的多模态AI模型'
  }
]

const NO_ORG_ID = "no-org" as const

function portalRootActiveAppFromConversation(c: Conversation): string | null {
  const d = c.dockAppId
  return d && isPortalRootDockAppId(d) ? d : null
}

/** 进入教育 / 医院门户时解析顶栏「会话主体」：主 VVAI 保留信息筛选态；「全部组织」则落到对应类型的首个主体 */
function resolvePortalEntryOrganizationId(
  portalKind: "education" | "hospital",
  ctx: {
    isNavContentScopeMode: boolean
    dialogueContentOrgScope: string
    currentOrg: string
    organizations: Organization[]
  }
): string {
  const { isNavContentScopeMode, dialogueContentOrgScope, currentOrg, organizations } = ctx
  if (organizations.length === 0) return NO_ORG_ID

  if (isNavContentScopeMode) {
    if (dialogueContentOrgScope === CONTENT_SCOPE_ALL_ORGANIZATIONS_ID) {
      if (portalKind === "hospital") {
        return organizations.find((o) => o.kind === "hospital")?.id ?? organizations[0]!.id
      }
      return (
        organizations.find((o) => o.kind === "school" || o.kind === "education")?.id ??
        organizations[0]!.id
      )
    }
    if (organizations.some((o) => o.id === dialogueContentOrgScope)) {
      return dialogueContentOrgScope
    }
  } else if (organizations.some((o) => o.id === currentOrg)) {
    return currentOrg
  }
  return organizations[0]!.id
}

/** 主入口（无 scenario）：非教育、非医疗的通用测试组织（多主体切换演示） */
const DEFAULT_ORGANIZATIONS: Organization[] = [
  {
    id: "default-test-org",
    name: "默认测试组织",
    icon: orgIcon,
    memberCount: 128,
    description: "通用组织演示主体",
    kind: "general",
  },
  {
    id: "default-test-org-two",
    name: "测试组织二",
    icon: orgIcon,
    memberCount: 56,
    description: "第二个通用演示主体，与默认测试组织并列",
    kind: "general",
  },
]

/** 场景五：学校 + 教育机构 + 医院（底部条为并集时：医院 → 教育 → 通用应用） */
const SCENARIO_FIVE_MULTI_ORGS: Organization[] = [
  ...SCENARIO_FOUR_EDU_MULTI_HOME_ORGANIZATIONS,
  {
    id: "hospital-demo",
    name: "示范医院",
    icon: orgIcon,
    memberCount: 320,
    description: "医院组织",
    kind: "hospital",
  },
]

/** 场景二与「CUI卡片交互场景及规则」入口共用同一套单教育机构 mock */
const EDU_ONE_SCENARIO_ORGS: Organization[] = [
  {
    id: "edu-demo",
    name: "示范教育机构",
    icon: orgIcon,
    memberCount: 120,
    description: "演示用教育机构主体",
    kind: "education",
  },
]

/**
 * 场景六（老师进入教育）：1 个示范教育机构，用于绑定「机构教育空间」与教学/管理/经营 Skill。
 * 与 `EDU_ONE_SCENARIO_ORGS` 同 `kind: "education"` 但显式独立，避免连带场景二样式被改。
 */
const EDU_TEACHER_SCENARIO_ORGS: Organization[] = [
  {
    id: "edu-teacher-demo",
    name: "示范教育机构（老师）",
    icon: orgIcon,
    memberCount: 86,
    description: "教师视角演示主体（含机构教育空间）",
    kind: "education",
  },
]

/** 场景七 / 场景八（学生 / 家长进入教育）：C 端无组织感知，仅个人教育空间 */
const EDU_STUDENT_SCENARIO_ORGS: Organization[] = []
const EDU_PARENT_SCENARIO_ORGS: Organization[] = []

/**
 * 场景九（机构管理者进入教育）：必须挂在 1 个示范教育机构下。
 * 管理者的工作主体是机构本身，无个人空间；与教师场景的区别仅在数据视图（dock + Hero 卡）。
 */
const EDU_ADMIN_SCENARIO_ORGS: Organization[] = [
  {
    id: "edu-admin-demo",
    name: "示范教育机构（管理者）",
    icon: orgIcon,
    memberCount: 86,
    description: "机构管理者视角演示主体（教务 + 督导 + 校长合体）",
    kind: "education",
  },
]

/** Home 场景按钮对应的初始组织列表 */
const SCENARIO_ORGANIZATIONS: Record<string, Organization[]> = {
  "edu-one": EDU_ONE_SCENARIO_ORGS,
  [SCENARIO_TWO_MULTI_ORGS]: [...SCENARIO_FOUR_EDU_MULTI_HOME_ORGANIZATIONS],
  [SCENARIO_CUI_CARD_RULES]: [...EDU_ONE_SCENARIO_ORGS],
  "scenario-five": SCENARIO_FIVE_MULTI_ORGS,
  [SCENARIO_EDU_TEACHER]: EDU_TEACHER_SCENARIO_ORGS,
  [SCENARIO_EDU_STUDENT]: EDU_STUDENT_SCENARIO_ORGS,
  [SCENARIO_EDU_PARENT]: EDU_PARENT_SCENARIO_ORGS,
  [SCENARIO_EDU_ADMIN]: EDU_ADMIN_SCENARIO_ORGS,
}

/**
 * 教育三身份场景（场景六/七/八）首次访问时，向 sessionStorage 写入默认《组织状态》/教育空间种子：
 * - 老师：1 个机构教育空间（挂示范教育机构）+ 1 个个人教育空间，默认选中「机构教育空间」；
 * - 学生 / 家长：仅 1 个个人教育空间。
 *
 * 仅当 sessionStorage 中无值时写入，避免覆盖用户后续手动操作。幂等，可在每次渲染入口调用。
 */
function ensureEduRoleScenarioSeed(scenario: string | undefined): void {
  if (typeof window === "undefined") return
  const role = eduScenarioRole(scenario)
  if (!role) return
  const existing = loadDemoEducationSpaceState(scenario)
  /**
   * 旧 seed 修正：老师 / 管理者只应有「机构教育空间」，若 sessionStorage 里残留了 `family` 空间
   * （来自更早版本"老师默认含个人空间"的种子），主动清洗一次，避免老用户看到错位的列表。
   * 教师 / 管理者的工作主体是机构本身——个人教育空间是 C 端（孩子 / 家长）的领地。
   */
  if (role === "teacher" || role === "admin") {
    const cleaned = existing.spaces.filter((s) => s.kind !== "family")
    if (cleaned.length !== existing.spaces.length) {
      const stillHasCurrent = cleaned.some((s) => s.id === existing.currentSpaceId)
      saveDemoEducationSpaceState(scenario, {
        spaces: cleaned,
        currentSpaceId: stillHasCurrent ? existing.currentSpaceId : (cleaned[0]?.id ?? null),
        currentOrganizationId: existing.currentOrganizationId,
      })
    }
  }
  const refreshed = loadDemoEducationSpaceState(scenario)
  if (refreshed.spaces.length > 0) return
  const now = Date.now()
  if (role === "teacher") {
    /**
     * 任课教师（场景六）= B 端机构教师：默认且只挂 1 个「机构教育空间」（归属示范教育机构）。
     * 不再 seed 个人教育空间——个人教育空间是 C 端（孩子 / 家长）的领地，老师在机构上班的工作主体是机构本身；
     * 顶栏「教育空间切换器」也只展示机构教育空间分组，避免出现"老师却挂在自己家个人空间"的语义错位。
     */
    const teacherOrg = EDU_TEACHER_SCENARIO_ORGS[0]
    const inst: DemoEducationSpaceRecord = {
      id: "edu-space-teacher-inst",
      name: `${teacherOrg?.name ?? "示范教育机构"} · 机构教育空间`,
      kind: "institutional",
      hostOrganizationId: teacherOrg?.id,
      hostOrganizationName: teacherOrg?.name,
      createdAt: now,
    }
    saveDemoEducationSpaceState(scenario, {
      spaces: [inst],
      currentSpaceId: inst.id,
      currentOrganizationId: teacherOrg?.id ?? null,
    })
    return
  }
  if (role === "admin") {
    /**
     * 机构管理者（场景九）：仅 1 个机构教育空间（无个人空间）。
     * 顶栏「教育空间切换器」不展示个人空间项；不允许"创建个人教育空间"。
     */
    const adminOrg = EDU_ADMIN_SCENARIO_ORGS[0]
    const inst: DemoEducationSpaceRecord = {
      id: "edu-space-admin-inst",
      name: `${adminOrg?.name ?? "示范教育机构"} · 机构教育空间`,
      kind: "institutional",
      hostOrganizationId: adminOrg?.id,
      hostOrganizationName: adminOrg?.name,
      createdAt: now,
    }
    saveDemoEducationSpaceState(scenario, {
      spaces: [inst],
      currentSpaceId: inst.id,
      currentOrganizationId: adminOrg?.id ?? null,
    })
    return
  }
  const personal: DemoEducationSpaceRecord = {
    id: `edu-space-${role}-personal`,
    name: role === "student" ? "我的学习空间" : "孩子的学习空间",
    kind: "family",
    createdAt: now,
  }
  saveDemoEducationSpaceState(scenario, {
    spaces: [personal],
    currentSpaceId: personal.id,
    currentOrganizationId: null,
  })
}

/**
 * 邀请码 Demo 对应的完整组织（与 `JoinOrgFormCard` 测试码一致）。
 * 未加入组织时 `organizations` 初始为空，不能仅从当前列表 `find`，否则「验证并加入」后不会出现确认卡、也无法写入列表。
 */
const JOIN_INVITE_CODE_ORGANIZATIONS: Record<string, Organization> = {
  xiaoce: {
    id: "xiaoce",
    name: "小测教育机构",
    icon: orgIcon,
    memberCount: 120,
    description: "演示用教育机构（邀请码加入）",
    kind: "education",
  },
  default: {
    id: "default",
    name: "默认组织",
    icon: orgIcon,
    memberCount: 128,
    description: "演示用通用组织（邀请码加入）",
    kind: "general",
  },
  test: {
    id: "test",
    name: "测试机构",
    icon: orgIcon,
    memberCount: 56,
    description: "演示用测试机构（邀请码加入）",
    kind: "education",
  },
}

/** 底部应用条顺序持久化（按组织上下文签名隔离） */
const DOCK_STORAGE_PREFIX = "main-ai-dock-order::v4::"
/** 用户从条中移除的应用 id（与签名隔离；与顺序持久化配合，避免 hydrate 时把已移除项补回） */
const DOCK_HIDDEN_PREFIX = "main-ai-dock-hidden::v1::"

/** Mock：角色权限 + 使用频率（接入真实权限/埋点后替换） */
const MOCK_DOCK_USER = {
  roleId: "teacher",
  deniedAppIds: [] as string[],
  usageWeight: {
    hospital: 40,
    education: 38,
    personal_edu_space: 36,
    todo: 22,
    calendar: 20,
    meeting: 18,
    mail: 17,
    disk: 16,
    document: 15,
    attendance: 14,
    course: 13,
    teaching: 13,
    recruitment: 11,
    customer: 10,
    workflow: 10,
    project: 9,
    finance: 9,
    employee: 8,
    performance: 8,
    supplies: 7,
    policy: 7,
    meeting_room: 7,
    onboarding: 6,
    contract: 6,
    objectives: 6,
    work_task: 6,
    feedback: 6,
    permission: 5,
    regularization: 5,
    transfer: 5,
    offboarding: 5,
    profile: 12,
    company: 11,
    organization: 11,
    goods: 11,
    members: 10,
    logistics: 9,
    assets: 5,
    salary: 5,
    surgery: 4,
    pharma_procurement: 4,
  } as Record<string, number>,
}

/** Mock：按角色默认禁用的应用 id（接入权限系统后替换） */
const ROLE_DENIED_APPS: Record<string, string[]> = {
  teacher: [],
  admin: [],
  guest: ["finance", "salary", "recruitment"],
}

function createDockAppItem(id: string, order: number, scenario?: string | null): AppItem {
  const m = getDockAppMeta(id, scenario)
  return {
    id,
    name: m.name,
    icon: { imageSrc: m.imageSrc, iconType: id },
    order,
  }
}

function isDockConversationId(id: string): boolean {
  return id.startsWith("dock:") || id.startsWith("dock-app-")
}

function attachDockCuiFollowUps(
  m: Message,
  _replyHint: string,
  conversation: Conversation,
  _dockIntent?: { appId: string; matchedPhrase: string }
): Message {
  const isDock = isDockConversationId(conversation.id) || conversation.dockAppId != null
  /** 应用会话内不展示推荐追问条（仅主 VVAI 等非 dock 会话保留） */
  if (!isDock) return m
  return m
}

const EMPLOYEE_ORG_SWITCH_SEND_PREFIX = "__CUI_EMPLOYEE_ORG_SWITCH__:"

function parseEmployeeOrgSwitchSendText(text: string): string | null {
  const t = text.trim()
  if (!t.startsWith(EMPLOYEE_ORG_SWITCH_SEND_PREFIX)) return null
  const id = t.slice(EMPLOYEE_ORG_SWITCH_SEND_PREFIX.length).trim()
  return id || null
}

function employeeMgmtOrgSwitchFollowUpFields(
  organizations: Organization[],
  currentOrgId: string
): Pick<Message, "cuiFollowUpPrompts" | "cuiFollowUpSendTexts"> | undefined {
  const others = organizations.filter((o) => o.id !== currentOrgId)
  if (!others.length) return undefined
  return {
    cuiFollowUpPrompts: others.map((o) => `切换到${o.name}`),
    cuiFollowUpSendTexts: others.map((o) => `${EMPLOYEE_ORG_SWITCH_SEND_PREFIX}${o.id}`),
  }
}

/** 侧栏《组织状态》：应用会话所属组织 id（`dock:app:*` 无组织段，返回 null） */
function conversationDockOrgIdForSessionInteraction(c: Conversation): string | null {
  if (c.dockOrgId != null && c.dockOrgId !== "") return c.dockOrgId
  const m = c.id.match(/^dock:([^:]+):(.+)$/)
  if (!m || m[1] === "app") return null
  return m[1]
}

/**
 * `MainCuiCardOrgAttributionBanner`：当前 transcript 对应的「对话组织」主体 id（动态随会话 / 顶栏筛选变化）。
 * - 组织型 dock（`dock:{orgId}:{appId}` 或 `dockOrgId`）→ 该会话绑定的行政主体；
 * - 主 VVAI 或个人应用 dock 且为顶栏「信息筛选」态 → `dialogueContentOrgScope`；
 * - 否则 → `currentOrg`。
 * 单条消息上显式的 `cardAttributionOrgId` 仍优先（镜像、切换主体后的新卡等）。
 */
function conversationHostOrganizationIdForAttribution(
  c: Conversation,
  args: {
    cuiMainChatId: string
    isNavContentScopeMode: boolean
    dialogueContentOrgScope: string
    currentOrg: string
    organizations: Organization[]
  }
): string {
  const { cuiMainChatId, isNavContentScopeMode, dialogueContentOrgScope, currentOrg, organizations } = args
  const dockOid = conversationDockOrgIdForSessionInteraction(c)
  if (dockOid != null && dockOid !== "") {
    return dockOid
  }
  const appId = getConversationDockAppId(c)
  const isMainChat = c.id === cuiMainChatId
  const isPersonalDock = appId != null && isPersonalScopeDockAppId(appId)
  if ((isMainChat || isPersonalDock) && isNavContentScopeMode) {
    if (
      dialogueContentOrgScope !== CONTENT_SCOPE_ALL_ORGANIZATIONS_ID &&
      organizations.some((o) => o.id === dialogueContentOrgScope)
    ) {
      return dialogueContentOrgScope
    }
  }
  return organizations.some((o) => o.id === currentOrg) ? currentOrg : organizations[0]?.id ?? currentOrg
}

function lastActivityMs(c: Conversation): number {
  const list = coerceMessagesList(c.messages)
  let max = 0
  for (const m of list) {
    const t = typeof m.createdAt === "number" ? m.createdAt : 0
    if (t > max) max = t
  }
  return max
}

/** IM 式会话列表：按用户维度展示（不随当前组织切换隐藏条目）；主会话固定首位；dock 按最后活动时间倒序 */
function buildImStyleSessionList(conversations: Conversation[], mainChatId: string): Conversation[] {
  const filtered = conversations.filter((c) => {
    if (c.id.startsWith("dock-app-")) return false
    if (c.id === mainChatId) return true
    if (isDockConversationId(c.id) || c.dockAppId != null) return true
    return false
  })
  const main = filtered.find((c) => c.id === mainChatId)
  const rest = filtered
    .filter((c) => c.id !== mainChatId)
    .sort((a, b) => lastActivityMs(b) - lastActivityMs(a))
  return main ? [main, ...rest] : rest
}

/** 多组织并集底部条：按场景隔离 localStorage 签名 */
function computeUnionDockSignature(scenarioKey: string, organizations: Organization[]): string {
  if (organizations.length === 0) return `${scenarioKey}::no-org`
  const orgKey = [...organizations]
    .map((o) => `${o.id}:${o.kind ?? "general"}`)
    .sort()
    .join("|")
  return `${scenarioKey}::union::${orgKey}`
}

function computeDockSignature(
  organizations: Organization[],
  currentOrgId: string,
  scenario?: string | null
): string {
  if (organizations.length === 0) {
    return scenario === "no-org" ? "no-org::scenario-one" : "no-org"
  }
  const org = organizations.find((o) => o.id === currentOrgId)
  const kind = org?.kind ?? "general"
  const orgKey = [...organizations]
    .map((o) => `${o.id}:${o.kind ?? "general"}`)
    .sort()
    .join("|")
  return `${kind}:${currentOrgId}:${orgKey}`
}

function sortDockIdsByUsage(ids: string[], w: Record<string, number>): string[] {
  const base = [...ids]
  return base.sort((a, b) => {
    const d = (w[b] ?? 0) - (w[a] ?? 0)
    if (d !== 0) return d
    return ids.indexOf(a) - ids.indexOf(b)
  })
}

function loadPersistedDockOrder(signature: string): string[] | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(`${DOCK_STORAGE_PREFIX}${signature}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as string[]
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

function persistDockOrder(signature: string, orderedIds: string[]) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(`${DOCK_STORAGE_PREFIX}${signature}`, JSON.stringify(orderedIds))
  } catch (e) {
    console.error("persistDockOrder failed", e)
  }
}

function loadPersistedDockHidden(signature: string): string[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(`${DOCK_HIDDEN_PREFIX}${signature}`)
    if (!raw) return []
    const parsed = JSON.parse(raw) as string[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function persistDockHidden(signature: string, hiddenIds: string[]) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(`${DOCK_HIDDEN_PREFIX}${signature}`, JSON.stringify(hiddenIds))
  } catch (e) {
    console.error("persistDockHidden failed", e)
  }
}

function resolveFloatingAppLabel(appId: string, scenario?: string | null): { id: string; name: string } {
  const portal = findPortalAppById(appId)
  if (portal) return { id: portal.id, name: portal.name }
  return { id: appId, name: getDockAppMeta(appId, scenario).name }
}

function SecondaryAppButton({
  app,
  onMenuClick,
}: {
  app: PortalApp
  onMenuClick: (menu: string, appName: string) => void
}) {
  const [referenceElement, setReferenceElement] = React.useState<HTMLButtonElement | null>(null);
  const [popperElement, setPopperElement] = React.useState<HTMLDivElement | null>(null);
  const [isHovered, setIsHovered] = React.useState(false);
  const timeoutRef = React.useRef<any>(null);

  const { styles, attributes, update } = usePopper(referenceElement, popperElement, {
    placement: 'top-start',
    strategy: 'fixed',
    modifiers: [
      { name: 'offset', options: { offset: [0, 10] } },
      { name: 'preventOverflow', options: { padding: 8 } },
      { name: 'flip', options: { fallbackPlacements: ['top-start', 'top-end', 'bottom'] } }
    ],
  });

  const handleMouseEnter = () => {
    clearTimeout(timeoutRef.current);
    setIsHovered(true);
    // Force popper to update position when it opens
    if (update) update();
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 150);
  };

  // Re-calculate position when hovered state changes, keeping it synced during parent animations
  React.useEffect(() => {
    let rafId: number;
    let startTime: number;

    const animateUpdate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      if (update) update();
      
      // Keep updating for 400ms to catch any layout animations (like slide-ins)
      if (timestamp - startTime < 400) {
        rafId = requestAnimationFrame(animateUpdate);
      }
    };

    if (isHovered) {
      rafId = requestAnimationFrame(animateUpdate);
    }

    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [isHovered, update]);

  return (
    <div className="relative inline-flex" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <button
        ref={setReferenceElement}
        className={cn(
          "bg-bg flex gap-[var(--space-100)] h-[var(--space-800)] items-center px-[var(--space-300)] py-[var(--space-150)] rounded-full shrink-0 transition-all duration-300 ease-out border border-border group/btn",
          isHovered ? "bg-[var(--black-alpha-11)]" : "hover:bg-[var(--black-alpha-11)]"
        )}
      >
        <p className="text-[length:var(--font-size-xs)] leading-none text-[var(--color-text)] whitespace-nowrap font-[var(--font-weight-medium)]">
          {app.name}
        </p>
        <ChevronDown 
          className={cn(
            "size-[12px] text-text-tertiary transition-transform duration-300 ease-in-out",
            isHovered && "rotate-180"
          )} 
        />
      </button>

      {typeof document !== 'undefined' && createPortal(
        <div 
          ref={setPopperElement} 
          style={{ ...styles.popper, zIndex: 9999, pointerEvents: isHovered ? 'auto' : 'none' }} 
          {...attributes.popper}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <AnimatePresence>
            {isHovered && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                style={{ transformOrigin: "bottom left" }}
                className="bg-bg border border-border shadow-[0px_8px_32px_0px_rgba(22,24,30,0.1)] rounded-[8px] p-[6px] min-w-[140px] flex flex-col overflow-hidden"
              >
                {app.menu.map((m: any) => {
                  const name = typeof m === 'string' ? m : m.name;

                  return (
                    <button
                      key={name}
                      onClick={() => {
                        setIsHovered(false);
                        onMenuClick(name, app.name);
                      }}
                      className="group w-full px-[10px] py-[8px] text-left transition-colors hover:bg-[var(--black-alpha-11)] rounded-[6px] flex items-center"
                    >
                      <span className="font-['PingFang_SC:Regular',sans-serif] leading-[20px] overflow-hidden text-text text-[14px] text-ellipsis whitespace-nowrap group-hover:text-primary transition-colors">
                        {name}
                      </span>
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>,
        document.body
      )}
    </div>
  );
}

function compactAiClassroomSkillLabel(label: string): string {
  return label
    .replace(/（[^）]*）/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/\s*\/\s*/g, "/")
    .trim()
}

function AiClassroomSecondaryButton({
  role,
  stage,
  onPickSkill,
}: {
  role: EduSceneRole
  stage: EducationStage
  onPickSkill: (item: AiClassroomSkillItem, displayLabel: string) => void
}) {
  const [referenceElement, setReferenceElement] = React.useState<HTMLButtonElement | null>(null)
  const [popperElement, setPopperElement] = React.useState<HTMLDivElement | null>(null)
  const [isHovered, setIsHovered] = React.useState(false)
  const timeoutRef = React.useRef<any>(null)
  const tree = React.useMemo(() => pickAiClassroomTree(role, stage), [role, stage])

  const { styles, attributes, update } = usePopper(referenceElement, popperElement, {
    placement: "top-start",
    strategy: "fixed",
    modifiers: [
      { name: "offset", options: { offset: [0, 10] } },
      { name: "preventOverflow", options: { padding: 8 } },
      { name: "flip", options: { fallbackPlacements: ["top-start", "top-end", "bottom"] } },
    ],
  })

  const handleMouseEnter = () => {
    clearTimeout(timeoutRef.current)
    setIsHovered(true)
    update?.()
  }

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsHovered(false)
    }, 150)
  }

  React.useEffect(() => {
    let rafId: number
    let startTime: number

    const animateUpdate = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      update?.()
      if (timestamp - startTime < 400) {
        rafId = requestAnimationFrame(animateUpdate)
      }
    }

    if (isHovered) {
      rafId = requestAnimationFrame(animateUpdate)
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [isHovered, update])

  return (
    <div className="relative inline-flex" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <button
        ref={setReferenceElement}
        type="button"
        className={cn(
          "bg-bg flex gap-[var(--space-100)] h-[var(--space-800)] items-center px-[var(--space-300)] py-[var(--space-150)] rounded-full shrink-0 transition-all duration-300 ease-out border border-border group/btn",
          isHovered ? "bg-[var(--black-alpha-11)]" : "hover:bg-[var(--black-alpha-11)]",
        )}
      >
        <p className="text-[length:var(--font-size-xs)] leading-none text-[var(--color-text)] whitespace-nowrap font-[var(--font-weight-medium)]">
          AI课堂
        </p>
        <ChevronDown
          className={cn(
            "size-[12px] text-text-tertiary transition-transform duration-300 ease-in-out",
            isHovered && "rotate-180",
          )}
        />
      </button>

      {typeof document !== "undefined" && createPortal(
        <div
          ref={setPopperElement}
          style={{ ...styles.popper, zIndex: 9999, pointerEvents: isHovered ? "auto" : "none" }}
          {...attributes.popper}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <AnimatePresence>
            {isHovered && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                style={{ transformOrigin: "bottom left" }}
                className="bg-bg border border-border shadow-[0px_8px_32px_0px_rgba(22,24,30,0.1)] rounded-[8px] p-[6px] min-w-[220px] max-w-[320px] max-h-[min(520px,calc(100vh-120px))] overflow-y-auto flex flex-col"
              >
                {tree.sections.map((section) => (
                  <div key={section.title} className="flex flex-col">
                    <div className="px-[10px] py-[6px] text-[12px] font-medium text-text-tertiary">
                      {section.title.replace(/（[^）]*）/g, "")}
                    </div>
                    {section.items.map((item) => {
                      const displayLabel = compactAiClassroomSkillLabel(item.label)
                      return (
                        <button
                          key={item.id}
                          type="button"
                          disabled={item.disabled}
                          onClick={() => {
                            setIsHovered(false)
                            onPickSkill(item, displayLabel)
                          }}
                          className={cn(
                            "group flex w-full items-center justify-between gap-[var(--space-200)] rounded-[6px] px-[10px] py-[8px] text-left transition-colors",
                            item.disabled
                              ? "cursor-not-allowed opacity-50"
                              : "hover:bg-[var(--black-alpha-11)]",
                          )}
                        >
                          <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[14px] leading-[20px] text-text transition-colors group-hover:text-primary">
                            {displayLabel}
                          </span>
                          {item.badge ? (
                            <span className="shrink-0 rounded-full bg-primary/10 px-[6px] py-[1px] text-[11px] text-primary">
                              {item.badge}
                            </span>
                          ) : null}
                        </button>
                      )
                    })}
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>,
        document.body,
      )}
    </div>
  )
}

function parseTime(timeStr: string): Date | null {
  const today = new Date();
  const timeMatch = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
  if (timeMatch) {
    let [_, h, m, amp] = timeMatch;
    let hours = parseInt(h);
    let minutes = parseInt(m);
    
    if (amp) {
      amp = amp.toUpperCase();
      if (amp === 'PM' && hours < 12) hours += 12;
      if (amp === 'AM' && hours === 12) hours = 0;
    }
    
    const date = new Date(today);
    date.setHours(hours, minutes, 0, 0);
    return date;
  }
  return null;
}

function shouldShowTimestamp(current: Message, previous: Message | null): boolean {
  if (!previous) return true;
  
  const curDate = parseTime(current.timestamp);
  const prevDate = parseTime(previous.timestamp);
  
  if (!curDate || !prevDate) {
    return current.timestamp !== previous.timestamp;
  }
  
  const diffInMs = Math.abs(curDate.getTime() - prevDate.getTime());
  const diffInMins = diffInMs / (1000 * 60);
  
  return diffInMins > 20;
}

function FloatingAppWindow({
  appId,
  title,
  onClose,
  children,
  defaultPos
}: {
  appId: string;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  defaultPos?: { x: number, y: number };
}) {
  const controls = useDragControls()
  return (
    <motion.div
      drag
      dragControls={controls}
      dragListener={false}
      dragMomentum={false}
      initial={{ opacity: 0, scale: 0.9, x: defaultPos?.x || 100, y: defaultPos?.y || 100 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed z-50 w-[min(90vw,1200px)] h-[min(85vh,800px)] bg-cui-bg rounded-[var(--radius-xl)] shadow-md border border-border flex flex-col overflow-hidden pointer-events-auto"
    >
      <div 
        onPointerDown={(e) => controls.start(e)}
        className="flex items-center justify-between px-[var(--space-300)] py-[var(--space-200)] border-b border-border bg-bg-secondary cursor-grab active:cursor-grabbing shrink-0"
      >
        <div className="flex items-center gap-[var(--space-200)] flex-1 min-w-0">
          <span className="text-[length:var(--font-size-md)] font-[var(--font-weight-medium)] text-text truncate">{title}</span>
        </div>
        <div className="flex items-center gap-[var(--space-100)] shrink-0">
          <button
            onClick={onClose}
            className="w-[var(--space-600)] h-[var(--space-600)] flex items-center justify-center text-text-secondary hover:bg-[var(--black-alpha-11)] rounded-[var(--radius-md)] transition-colors border-none bg-transparent cursor-pointer"
            title="关闭独立窗口"
          >
            <X size={16} />
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0 bg-cui-bg relative flex flex-col">
        {children}
      </div>
    </motion.div>
  );
}

export function MainAIChatWindow({ 
  conversation, 
  onToggleHistory, 
  historyOpen = false,
  onHistoryOpenChange,
  conversations = [],
  selectedId = "",
  onSelect,
  onPersistConversationMessages,
  onDockAppActivate,
  onRegisterPortalRootSession,
  onIntentDockHandoff,
  onCrossDockHandoff,
  onCurrentOrgChange,
  shortcutBarAppId = null,
  onDockBarBack,
  onNewMainChat,
  mainChatHistory = [],
  onSelectMainChatHistoryEntry,
  activeMainChatHistoryEntryId = null,
  onMainChatNewThread,
  isMainCuiStandaloneWindow = false,
  onOpenStandaloneMainCui,
  mainChatSessionRevision = 0,
  sessionListPinned = false,
  onEnterMainCuiSessionLayout,
  sessionSidebarWidth: sessionSidebarWidthProp = 280,
  onSessionSidebarWidthChange,
  cuiMainChatId = "c1",
  scenario,
  onMirrorDockConversation,
  onAppendMainVvaiNonBusinessMirror,
  educationStage = "pre",
  onEducationStageChange,
  lessonDeliveryMode = "online",
}: MainAIChatWindowProps) {
  const [messages, setMessages] = React.useState<Message[]>(() => coerceMessagesList(conversation.messages))
  const [cuiRulesModal, setCuiRulesModal] = React.useState<"calendar" | "contacts" | "confirm" | null>(null)
  const [cuiRulesSidebarMessageId, setCuiRulesSidebarMessageId] = React.useState<string | null>(null)
  const [inputValue, setInputValue] = React.useState("")
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const chatScrollContainerRef = React.useRef<HTMLDivElement>(null)
  /** 「按日期查看」：先切会话再在消息列表中定位锚点 */
  const pendingDayJumpRef = React.useRef<{ conversationId: string; messageId: string } | null>(null)
  const [dayJumpNonce, setDayJumpNonce] = React.useState(0)
  /** 场景二「打开任务列表」表内已点开详情的行 id（名称列浅色「已查看」） */
  const [demoTaskTableViewedIds, setDemoTaskTableViewedIds] = React.useState<ReadonlySet<string>>(
    () => new Set()
  )
  const lastChatScrollTopRef = React.useRef(0)
  /** 仅在实际「向下滚」手势后置 true，避免进入会话时布局/程序化滚动触发收起 */
  const pinnedTaskAllowScrollCollapseRef = React.useRef(false)
  const messagesRef = React.useRef<Message[]>(messages)
  const cuiRulesSidebarSource = React.useMemo(() => {
    if (!cuiRulesSidebarMessageId) return null
    const m = coerceMessagesList(messages).find((x) => x.id === cuiRulesSidebarMessageId)
    const p = m ? parseCuiRulesPayload(m.content) : null
    if (!p || p.variant !== "plan") return null
    return {
      messageId: cuiRulesSidebarMessageId,
      label: p.title,
      participants: Array.isArray(p.participants) ? [...p.participants] : [],
      note: p.participantsNote ?? "",
    }
  }, [cuiRulesSidebarMessageId, messages])
  const prevConversationIdRef = React.useRef<string | null>(null)
  const lastMainChatSessionRevisionRef = React.useRef(mainChatSessionRevision)
  const conversationMessagesRef = React.useRef<Message[]>(coerceMessagesList(conversation.messages))
  /** 仅当父级 `conversation.messages` 引用变化（或切会话 / 新主会话 revision）时整表同步；避免「创建组织」后仅 `currentOrg`/`hasJoinedOrganizations` 变化时用旧父级列表覆盖刚写入的成功卡 */
  const lastSyncedParentConversationMessagesRef = React.useRef(conversation.messages)
  const onIntentDockHandoffRef = React.useRef(onIntentDockHandoff)
  onIntentDockHandoffRef.current = onIntentDockHandoff
  const onMirrorDockConversationRef = React.useRef(onMirrorDockConversation)
  onMirrorDockConversationRef.current = onMirrorDockConversation
  const onAppendMainVvaiNonBusinessMirrorRef = React.useRef(onAppendMainVvaiNonBusinessMirror)
  onAppendMainVvaiNonBusinessMirrorRef.current = onAppendMainVvaiNonBusinessMirror
  const handleSendMessageRef = React.useRef<(messageOverride?: string) => void>(() => {})
  const employeeOrgSwitchHandlerRef = React.useRef<(orgId: string) => void>(() => {})
  const onCrossDockHandoffRef = React.useRef(onCrossDockHandoff)
  onCrossDockHandoffRef.current = onCrossDockHandoff
  messagesRef.current = coerceMessagesList(messages)
  conversationMessagesRef.current = coerceMessagesList(messages)

  // Apps state
  const [apps, setApps] = React.useState<AppItem[]>([]);
  /** 当前上下文下可出现在条中的应用全集（含已从条中移除、可在「全部应用」中加回者） */
  const [dockCatalogIds, setDockCatalogIds] = React.useState<string[]>([]);
  const [isAllAppsOpen, setIsAllAppsOpen] = React.useState(false);
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);
  const [longPressIndex, setLongPressIndex] = React.useState<number | null>(null);
  const longPressTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const dockSignatureRef = React.useRef<string>("");
  const lastDockOrderRef = React.useRef<string[]>([]);

  /** 底部「日历」dock：vv 编排演示数据（对齐《日历（样板）》） */
  const [vvScheduleItems, setVvScheduleItems] = React.useState<VvScheduleItem[]>(() => [...scheduleSeed])
  const [vvMeetingItems, setVvMeetingItems] = React.useState<VvMeetingItem[]>(() => [...meetingSeed])
  const [vvRecordItems] = React.useState(() => [...recordSeed])
  const [vvTodoItems, setVvTodoItems] = React.useState(() => [...todoSeed])
  const [vvMailItems] = React.useState(() => [...mailSeed])
  const [vvDriveItems] = React.useState(() => [...driveSeed])
  const [vvDocItems] = React.useState(() => [...docsSeed])
  const [vvFlow, setVvFlow] = React.useState<VvFlow>(null)
  /** 日历 vv `guiThen` 内 `run()` 执行中，避免 `appendToActiveConversation` 与 intent 整轮镜像重复 */
  const vvGuiThenDepthRef = React.useRef(0)

  const vvContext = React.useMemo<VvContext>(
    () => ({
      scheduleItems: vvScheduleItems,
      todoItems: vvTodoItems,
      mailItems: vvMailItems,
      meetingItems: vvMeetingItems,
      recordItems: vvRecordItems,
      driveItems: vvDriveItems,
      docItems: vvDocItems,
    }),
    [vvDocItems, vvDriveItems, vvMailItems, vvMeetingItems, vvRecordItems, vvScheduleItems, vvTodoItems]
  )

  const vvScheduleBridge = React.useMemo(
    () => ({
      getScheduleItems: () => vvScheduleItems,
      setScheduleItems: setVvScheduleItems,
      setMeetingItems: setVvMeetingItems,
    }),
    [vvScheduleItems]
  )

  const scheduleSideThreadBridgeRef = React.useRef<ScheduleSideThreadBridge | null>(null)
  const scheduleCalendarPrefsBridgeRef = React.useRef<{
    getPrefs: () => VvScheduleCalendarPrefs
    setPrefs: React.Dispatch<React.SetStateAction<VvScheduleCalendarPrefs>>
  } | null>(null)
  const calendarTypesBridgeRef = React.useRef<{
    appendCalendar: (entry: VvUserCalendarType) => void
    updateCalendar: (
      id: string,
      patch: Partial<Pick<VvUserCalendarType, "name" | "color" | "description" | "visibility">>
    ) => void
  } | null>(null)
  const subscribedColleagueBridgeRef = React.useRef<{
    add: (id: string) => void
    remove: (id: string) => void
    isSubscribed: (id: string) => boolean
  } | null>(null)

  const [scheduleSideSheet, setScheduleSideSheet] = React.useState<{
    appId: string | null
    surface: VvScheduleSideSheetSurface
    floatingHostAppId: string | null
    item: VvScheduleItem
    treatDateLabelTodayAsNotPast: boolean
    initialSidePanelMode?: "detail" | "edit" | "cancel"
  } | null>(null)

  const closeScheduleSideSheet = React.useCallback(() => {
    setScheduleSideSheet((prev) => {
      if (prev) {
        const { appId, item, surface, floatingHostAppId } = prev
        const linkPayload = {
          kind: "schedule-side-session-link" as const,
          scheduleId: item.id,
          closedAtMs: Date.now(),
          panelAppId: appId,
          panelSurface: surface,
          floatingHostAppId: floatingHostAppId ?? null,
        }
        queueMicrotask(() => {
          setMessages((msgs) => {
            const hasLinkForSchedule = msgs.some((m) => {
              const p = m.vvAssistant
              return p?.kind === "schedule-side-session-link" && p.scheduleId === item.id
            })
            if (hasLinkForSchedule) return msgs
            return [...msgs, vvAssistantMessageFromPayload(linkPayload, conversation.user.id)]
          })
        })
      }
      return null
    })
  }, [conversation.user.id])

  const openScheduleSideSheet = React.useCallback((item: VvScheduleItem, opts: VvScheduleSideSheetOpenOpts) => {
    setScheduleSideSheet({
      appId: opts.appId,
      surface: opts.surface,
      floatingHostAppId: opts.surface === "floating" ? opts.floatingHostAppId ?? opts.appId : null,
      item,
      treatDateLabelTodayAsNotPast: opts.treatDateLabelTodayAsNotPast ?? false,
      initialSidePanelMode: opts.initialSidePanelMode,
    })
  }, [])

  const scheduleSideSheetApi = React.useMemo(
    () => ({ openScheduleSideSheet, closeScheduleSideSheet }),
    [openScheduleSideSheet, closeScheduleSideSheet]
  )

  const scheduleCalendarPrefsBridge = React.useMemo(
    () => ({
      getPrefs: () => scheduleCalendarPrefsBridgeRef.current?.getPrefs() ?? defaultScheduleCalendarPrefs(),
      setPrefs: (u: React.SetStateAction<VvScheduleCalendarPrefs>) => {
        scheduleCalendarPrefsBridgeRef.current?.setPrefs(u)
      },
    }),
    []
  )

  // Education Mode State
  const [activeApp, setActiveApp] = React.useState<string | null>(() =>
    portalRootActiveAppFromConversation(conversation)
  );
  /** im=消息/IM 布局；cui=《主CUI交互》（仅《主AI入口》等进入） */
  /** 场景五首次进入定位在消息列表；场景二与《主入口》默认在消息；其余默认进《主CUI交互》。独立窗口无《主导航栏》，始终进 CUI。 */
  const [mainView, setMainView] = React.useState<"im" | "cui">(() =>
    isMainCuiStandaloneWindow
      ? "cui"
      : isScenarioFiveLike(scenario) ||
          /** 场景二（多组织）：先进「消息」；《主AI入口》再进《主CUI交互》 */
          isScenarioTwoMultiOrgs(scenario) ||
          (isSingleOrgEduAttendanceScenarioFlow(scenario) &&
            !isScenarioTwoMultiOrgs(scenario)) ||
          isCuiCardRulesScenario(scenario) ||
          isMainEntryScenario(scenario)
        ? "im"
        : "cui"
  );
  // 改为按组织 ID 存储消息：{ orgId: Message[] }
  const [orgMessages, setOrgMessages] = React.useState<Record<string, Message[]>>({});

  // Organization State
  const initialOrganizations = React.useMemo<Organization[]>(() => {
    if (scenario === "no-org") return []
    if (scenario && SCENARIO_ORGANIZATIONS[scenario]) {
      return [...SCENARIO_ORGANIZATIONS[scenario]]
    }
    return [...DEFAULT_ORGANIZATIONS]
  }, [scenario])

  const [organizations, setOrganizations] = React.useState<Organization[]>(initialOrganizations)
  /** 教育三身份场景首次进入：向 sessionStorage 写入默认教育空间种子（幂等，已写则跳过） */
  React.useMemo(() => ensureEduRoleScenarioSeed(scenario), [scenario])
  /** 演示态：已创建的教育空间及当前空间（sessionStorage，供教育壳层与门户欢迎动态判断） */
  const [educationSpaces, setEducationSpaces] = React.useState<DemoEducationSpaceRecord[]>(() =>
    loadDemoEducationSpaceState(scenario).spaces
  )
  const [currentEducationSpaceId, setCurrentEducationSpaceId] = React.useState<string | null>(() =>
    loadDemoEducationSpaceState(scenario).currentSpaceId
  )
  const [currentOrg, setCurrentOrg] = React.useState<string>(organizations[0]?.id ?? NO_ORG_ID);
  const currentOrgRef = React.useRef(currentOrg)
  currentOrgRef.current = currentOrg

  /**
   * 教育主对话消息写入器：必须在所有引用它（含 useCallback 依赖数组）的回调之前声明。
   *
   * 为什么放在这里：
   * - 历史上本回调放在 ~2599 行，但前面有一系列教育相关 useCallback（如
   *   `handleEduFirstEntryChip`、course-pick / direct chip 调度等）的依赖数组里直接写了
   *   `setEducationMessages`——React 在初始化这些 useCallback 时就会同步读取依赖数组，
   *   触发 TDZ → "ReferenceError: 初始化前无法访问 setEducationMessages"，整个页面白屏。
   * - 把它紧跟 `currentOrg` 声明之后定义即可彻底规避（依赖只有 `[currentOrg]`）。
   *
   * 防回归：**不要再把这段移回 ~2599 行**。如确需调整位置，必须确保所有引用它的回调
   * 都在它之后声明（依赖数组里写 setter 名字会被 React 同步求值，闭包延迟规则不适用）。
   */
  const setEducationMessages = React.useCallback(
    (updater: Message[] | ((prev: Message[]) => Message[])) => {
      setOrgMessages((prev) => {
        const currentMessages = coerceMessagesList(prev[currentOrg])
        const raw = typeof updater === "function" ? updater(currentMessages) : updater
        const newMessages = coerceMessagesList(raw)
        return {
          ...prev,
          [currentOrg]: newMessages,
        }
      })
    },
    [currentOrg],
  )

  /** 主 VVAI / 个人应用顶栏：仅影响对话内信息筛选，不切换会话绑定的行政主体 */
  const [dialogueContentOrgScope, setDialogueContentOrgScope] = React.useState<string>(
    organizations[0]?.id ?? NO_ORG_ID
  )

  React.useEffect(() => {
    setOrganizations(initialOrganizations)
    setCurrentOrg(initialOrganizations[0]?.id ?? NO_ORG_ID)
    setDialogueContentOrgScope(initialOrganizations[0]?.id ?? NO_ORG_ID)
  }, [initialOrganizations])

  React.useEffect(() => {
    /** 教育三身份场景：scenario 切换到新桶时，若该桶尚未 seed 则写入默认种子，再读回 */
    ensureEduRoleScenarioSeed(scenario)
    const s = loadDemoEducationSpaceState(scenario)
    setEducationSpaces(s.spaces)
    setCurrentEducationSpaceId(s.currentSpaceId)
  }, [scenario])

  const eduPersistedOrgRestoreRef = React.useRef(false)
  React.useEffect(() => {
    if (organizations.length === 0) {
      eduPersistedOrgRestoreRef.current = false
      return
    }
    const s = loadDemoEducationSpaceState(scenario)
    if (!s.currentOrganizationId) return
    if (!organizations.some((o) => o.id === s.currentOrganizationId)) return
    if (eduPersistedOrgRestoreRef.current) return
    setCurrentOrg(s.currentOrganizationId)
    eduPersistedOrgRestoreRef.current = true
  }, [organizations, scenario])

  React.useEffect(() => {
    saveDemoEducationSpaceState(scenario, {
      spaces: educationSpaces,
      currentSpaceId: currentEducationSpaceId,
      currentOrganizationId: organizations.length > 0 ? currentOrg : null,
    })
  }, [scenario, educationSpaces, currentEducationSpaceId, currentOrg, organizations.length])

  const currentDemoEducationSpace = React.useMemo(
    () => educationSpaces.find((s) => s.id === currentEducationSpaceId) ?? null,
    [educationSpaces, currentEducationSpaceId]
  )

  React.useEffect(() => {
    if (organizations.length === 0) {
      setDialogueContentOrgScope(NO_ORG_ID)
      return
    }
    const scopeExists = organizations.some((o) => o.id === dialogueContentOrgScope)
    if (!scopeExists || dialogueContentOrgScope === CONTENT_SCOPE_ALL_ORGANIZATIONS_ID) {
      const fallbackOrgId = organizations.some((o) => o.id === currentOrg)
        ? currentOrg
        : organizations[0]!.id
      setDialogueContentOrgScope(fallbackOrgId)
    }
  }, [organizations, currentOrg, dialogueContentOrgScope])

  // 获取当前组织的消息列表
  const educationMessages = React.useMemo(() => {
    return coerceMessagesList(orgMessages[currentOrg])
  }, [orgMessages, currentOrg])

  /** 教育/医院门户区 `educationMessages` 与主列 `messages` 双轨；门户内 handoff 须用此快照写回 dock 会话 */
  const educationPortalTranscriptRef = React.useRef<Message[]>([])
  React.useEffect(() => {
    educationPortalTranscriptRef.current = educationMessages
  }, [educationMessages])

  const educationPortalApps = React.useMemo(
    () => resolveEducationPortalApps(organizations, scenario),
    [organizations, scenario]
  )

  const hasJoinedOrganizations = organizations.length > 0
  /** 场景零：`no-org` 且尚未加入任何组织（对话/教育壳层 V2 对齐体验仅在此态启用） */
  const isScenarioZeroNoOrg = isHomeScenarioZeroNoOrg(scenario, hasJoinedOrganizations)
  /** `?scenario=no-org`：主 VVAI 与场景二同构的考勤/任务/教育承接演示（含会话列表 dock 镜像） */
  const isNoOrgRoute = isNoOrgHomeScenarioRoute(scenario)

  const secondaryPortalOpen =
    activeApp === "education" ||
    activeApp === "hospital" ||
    activeApp === PERSONAL_EDU_SPACE_APP_ID
  /** `no-org` 路由下进入教育门户：顶栏与会话列表顶槽展示《空间状态栏》 */
  const showNoOrgEducationSpaceNav =
    isNoOrgRoute && secondaryPortalOpen && activeApp === "education"
  /**
   * 教育三身份场景（场景六/七/八）：判断当前是否在「教育应用对话内」。
   * - 命中：教育门户根 / 个人教育空间根 / AI课堂 / 商品 / 成员 / 财务 / 学校教学三件套等任意 dock；
   * - 未命中：主 VVAI 与非教育 dock 应用（仍按各身份现有逻辑：老师 = 组织切换器；学生/家长 = 隐藏）。
   */
  const isEduSceneRole = isEduRoleScenario(scenario)
  const isEduSceneConsumer = isEduRoleConsumerScenario(scenario)
  const eduSceneRoleId: EduSceneRole | null = eduScenarioRole(scenario)
  /**
   * 跨身份 IM 联动（demo 用 sessionStorage）：当前身份接收到的未读事件数 + 事件列表。
   * 机构管理者（admin）不在三身份 IM 闭环里——管理者沟通走通知 / 抽课视图，不接 IM 事件，故传 null。
   */
  const eduImTargetRoleForBus =
    eduSceneRoleId === "teacher" || eduSceneRoleId === "student" || eduSceneRoleId === "parent"
      ? eduSceneRoleId
      : null
  const eduImBusUnread = useEduImUnreadCountForRole(eduImTargetRoleForBus)
  const eduImBusEvents = useEduImEventsForRole(eduImTargetRoleForBus)
  /**
   * 课堂随堂题任务总线（仅学生侧主 CUI 用 banner 展示）：
   * - 老师在课堂子 CUI 里执行 `tc-question` Skill 时，会推一份任务到总线
   * - 学生切到场景七后，如果 bus 里还有该课程下未交卷的任务，主 CUI 欢迎区下方挂 banner
   * - 学生在子 CUI 答完后，submissions 自带学生姓名，banner 自动消失（无需手动清）
   */
  const studentClassTasks = useClassTasksForLesson(
    eduSceneRoleId === "student" ? DEMO_LESSON.id : null,
  )
  /**
   * 教育门户对外渲染的消息流：把"AI 主动开场"占位 marker 过滤掉，
   * 让 empty-state 接管 greeting / brief / Hero 的动态渲染（随 stage 切换刷新）。
   */
  const educationMessagesForDisplay = React.useMemo(
    () => educationMessages.filter((m) => m.content !== EDU_ROLE_DYNAMIC_OPENING_MARKER),
    [educationMessages],
  )
  const educationStageCopy = eduSceneRoleId
    ? getEducationStageDemoCopy(eduSceneRoleId, educationStage)
    : null
  /**
   * 教育门户主开场「能力地图」文案——每次进入都走（决策 A3），不感知 stage / 课次（决策 C1）。
   * 与 `educationStageCopy` 并存，但前者是"能力线"、后者已退出主开场，仅供 dock 子 CUI 兜底引用。
   */
  /**
   * 教育门户主开场「能力地图」文案——v6 起按 `educationStage × lessonDeliveryMode` 双维度派发 chip 行：
   * - 课前 / 课后：仅按 stage 区分（线上 / 线下共用同一套 chip）
   * - 课中：再按 deliveryMode 区分——线下走教室 IoT chip（IFP / 摄像头 / Pad / 接送闭环）
   *
   * 与 `educationStageCopy`（顶部待办带 / hero 卡）共同承担"状态线"。
   */
  const eduFirstEntryCopy = eduSceneRoleId
    ? getEduFirstEntryCopy(eduSceneRoleId, educationStage, lessonDeliveryMode)
    : null
  const isEduSceneEducationContext =
    isEduSceneRole &&
    ((activeApp != null &&
      (activeApp === "education" ||
        activeApp === PERSONAL_EDU_SPACE_APP_ID ||
        isEducationDockAppId(activeApp))) ||
      isEducationDockAppId(conversation.dockAppId ?? null))
  const secondaryPortalApps = activeApp === "hospital" ? HOSPITAL_PORTAL_APPS : educationPortalApps

  /**
   * AI课堂侧边子 CUI（一节具体的课的完整对话主体）开关与 pending 触发请求。
   * - lessonId / lessonTitle：当前打开的课程；一期固定为 DEMO_LESSON
   * - pendingRequest：外部入口（dock / Hero / 待办 chip / IM banner）请求的 Skill；
   *   面板挂载后 consume 一次即清空，避免重复触发
   */
  const [aiClassroomSideOpen, setAiClassroomSideOpen] = React.useState(false)
  const [aiClassroomPendingRequest, setAiClassroomPendingRequest] =
    React.useState<AiClassroomSidePanelOpenRequest | null>(null)
  /** 当前打开的子 CUI 的 lessonId（默认主线 DEMO_LESSON）。可由 agenda 选择切换 */
  const [aiClassroomLessonId, setAiClassroomLessonId] = React.useState<string>(DEMO_LESSON.id)
  /** 课表 agenda GUI 是否打开 */
  const [aiClassroomAgendaOpen, setAiClassroomAgendaOpen] = React.useState(false)

  /**
   * 系列课子 CUI（一期课包的整期视图）开关与 pending 触发请求。
   * - 与单课 side panel 互斥：一次只展示一个；点单课 row 打开 lesson panel；点系列课 row 打开 series panel
   * - 系列课 panel 内点某节课"进入" → onOpenSingleLesson(lessonId) → 关闭 series panel + 打开 lesson panel
   */
  const [aiClassroomSeriesSideOpen, setAiClassroomSeriesSideOpen] = React.useState(false)
  const [aiClassroomSeriesId, setAiClassroomSeriesId] = React.useState<string | null>(null)
  const [aiClassroomSeriesPendingRequest, setAiClassroomSeriesPendingRequest] =
    React.useState<AiClassroomSeriesSidePanelOpenRequest | null>(null)

  /**
   * 创建课程侧边子 CUI 开关 + 上下文。
   * 由 EduCourseProductsCard「+ 创建课程」按钮触发；提交完成后自动关闭并由 store 订阅刷新课程列表。
   */
  const [createCourseSideOpen, setCreateCourseSideOpen] = React.useState(false)
  const [createCourseSideCtx, setCreateCourseSideCtx] = React.useState<{
    orgId: string
    scenario?: string
  } | null>(null)
  const openCreateCourseSidePanel = React.useCallback(
    (ctx: { orgId: string; scenario?: string }) => {
      setCreateCourseSideCtx(ctx)
      setCreateCourseSideOpen(true)
    },
    [],
  )
  const closeCreateCourseSidePanel = React.useCallback(() => {
    setCreateCourseSideOpen(false)
  }, [])

  /**
   * 创建排课表侧边子 CUI 开关 + 上下文。
   * 由 EduCourseProductsCard 行内「添加排课表 / 打开排课表」CTA 与右下"添加排课"图标触发；
   * 提交完成后通过 store 通知，EduCourseProductsCard 与 EduCourseFulfillmentCard 自动刷新。
   */
  const [createScheduleSideOpen, setCreateScheduleSideOpen] = React.useState(false)
  const [createScheduleSideCtx, setCreateScheduleSideCtx] = React.useState<{
    orgId: string
    scenario?: string
    courseId: string
    /** "create" 建新草稿；"edit" 直接打开课程现有 finalized 排课表 */
    mode: "create" | "edit"
  } | null>(null)
  const openCreateScheduleSidePanel = React.useCallback(
    (ctx: {
      orgId: string
      scenario?: string
      courseId: string
      mode: "create" | "edit"
    }) => {
      setCreateScheduleSideCtx(ctx)
      setCreateScheduleSideOpen(true)
    },
    [],
  )
  const closeCreateScheduleSidePanel = React.useCallback(() => {
    setCreateScheduleSideOpen(false)
  }, [])

  const openAiClassroomSidePanel = React.useCallback(
    (req?: AiClassroomSidePanelOpenRequest & { lessonId?: string }) => {
      /** 切换 lessonId（agenda 选课时传入）；不传则保留当前 */
      if (req?.lessonId) setAiClassroomLessonId(req.lessonId)
      if (req) {
        const { lessonId, ...rest } = req
        void lessonId
        setAiClassroomPendingRequest(rest)
      }
      setAiClassroomSideOpen(true)
    },
    [],
  )
  const closeAiClassroomSidePanel = React.useCallback(() => {
    setAiClassroomSideOpen(false)
    setAiClassroomPendingRequest(null)
  }, [])
  const consumeAiClassroomPendingRequest = React.useCallback(() => {
    setAiClassroomPendingRequest(null)
  }, [])
  const openAiClassroomAgenda = React.useCallback(() => {
    setAiClassroomAgendaOpen(true)
  }, [])
  const closeAiClassroomAgenda = React.useCallback(() => {
    setAiClassroomAgendaOpen(false)
  }, [])

  /**
   * 打开系列课子 CUI：
   * - 若当前已有单课 panel 打开，先关掉避免叠层
   * - seriesId / pendingRequest 一起 set
   */
  const openAiClassroomSeriesSidePanel = React.useCallback(
    (req: AiClassroomSeriesSidePanelOpenRequest & { seriesId: string }) => {
      const { seriesId, ...rest } = req
      setAiClassroomSideOpen(false)
      setAiClassroomSeriesId(seriesId)
      setAiClassroomSeriesPendingRequest(rest)
      setAiClassroomSeriesSideOpen(true)
    },
    [],
  )
  const closeAiClassroomSeriesSidePanel = React.useCallback(() => {
    setAiClassroomSeriesSideOpen(false)
    setAiClassroomSeriesPendingRequest(null)
  }, [])
  const consumeAiClassroomSeriesPendingRequest = React.useCallback(() => {
    setAiClassroomSeriesPendingRequest(null)
  }, [])
  const openAiClassroomLiveWindow = React.useCallback((lessonId = DEMO_LESSON.id) => {
    if (typeof window === "undefined") return
    const url = new URL("/main-ai", window.location.origin)
    url.searchParams.set("liveClassroom", "1")
    url.searchParams.set("lessonId", lessonId)
    if (scenario) url.searchParams.set("scenario", scenario)
    const liveWindow = window.open(
      url.toString(),
      "vvai-ai-classroom-live",
      "popup,width=1280,height=820,left=80,top=60",
    )
    liveWindow?.focus()
  }, [scenario])

  /**
   * 教育跨应用 handoff：
   * - 进入 scenario 6/7/8 → 写入 lastEduRole（让用户切回主 VVAI 也能看到聚合教育 chip）
   * - 检查 pendingEduSkillRequest（来自主 VVAI / 跨页面跳转）→ 自动打开 AI课堂侧 CUI
   *
   * 同步写一次（render 阶段）：避免 effect 时序问题导致用户立刻切走时 lastEduRole 没落盘。
   * sessionStorage 写是同步、幂等的；这里没有 React state 副作用，安全。
   */
  const eduRoleFromScenario = eduScenarioRole(scenario)
  if (eduRoleFromScenario && typeof window !== "undefined") {
    rememberLastEduRole(eduRoleFromScenario)
  }
  React.useEffect(() => {
    if (eduRoleFromScenario) rememberLastEduRole(eduRoleFromScenario)
  }, [eduRoleFromScenario])
  React.useEffect(() => {
    if (!eduRoleFromScenario) return
    const pending = consumePendingEduSkillRequest()
    if (!pending) return
    if (pending.role !== eduRoleFromScenario) return
    /**
     * IM 跳转意图：仅落在该身份的主门户，让 EduImInboxBanner 在 Hero 上方自然展示。
     * 不打开侧 CUI（否则 banner 被侧 CUI overlay 遮挡，看不到联动效果）。
     */
    if (pending.kind === "im") return
    /**
     * 机构管理者（admin）没有单课子 CUI；pending 在主对话里被消费即足够，
     * 不再尝试打开 AI课堂侧 CUI（否则 LessonRuntime / 课程 fixture 类型不匹配）。
     */
    if (eduRoleFromScenario === "admin") return
    /**
     * Skill 跳转意图：推迟一帧，让门户主区先 mount，再触发侧 CUI 开启对应业务卡（聚焦主线 DEMO_LESSON）。
     * `kind: "skill"`：明确"执行某个 Skill"语义，让侧 CUI 走 executeSkill（push 用户气泡 + 业务卡）。
     */
    const t = window.setTimeout(() => {
      openAiClassroomSidePanel({
        lessonId: DEMO_LESSON.id,
        command: pending.command,
        skillId: pending.skillId,
        source: "main-vvai",
        kind: "skill",
      })
    }, 60)
    return () => window.clearTimeout(t)
  }, [eduRoleFromScenario, openAiClassroomSidePanel])

  /** 教育/医疗门户：底部「二级能力」横条；返回仅收起该条（仍保留门户会话区），与 dock 应用「返回应用列表」一致 */
  const [portalSecondaryDockExpanded, setPortalSecondaryDockExpanded] = React.useState(true)
  React.useEffect(() => {
    if (
      activeApp === "education" ||
      activeApp === "hospital" ||
      activeApp === PERSONAL_EDU_SPACE_APP_ID
    ) {
      setPortalSecondaryDockExpanded(true)
    }
  }, [activeApp])

  const cuiHistoryConversations = React.useMemo(
    () => buildImStyleSessionList(conversations, cuiMainChatId),
    [conversations, cuiMainChatId]
  )

  const sessionListOrganizations = React.useMemo(
    () => organizations.map((o) => ({ id: o.id, name: o.name })),
    [organizations]
  )

  const isNavContentScopeMode = React.useMemo(() => {
    if (secondaryPortalOpen) return false
    /** 场景二（多组织）/ 场景四：顶栏与会话列表切换为会话主体，不做「信息筛选」横幅 */
    if (isScenarioFourOrMainEntry(scenario) && conversation.id === cuiMainChatId) return false
    if (conversation.id === cuiMainChatId) return true
    const appId = getConversationDockAppId(conversation)
    return appId != null && isPersonalScopeDockAppId(appId)
  }, [secondaryPortalOpen, conversation, cuiMainChatId, scenario])

  /** 任意 dock 应用会话：顶区不重复欢迎与快捷建议（消息流内保留各应用首条欢迎） */
  const isDockAppSession = React.useMemo(
    () => isDockConversationId(conversation.id) || conversation.dockAppId != null,
    [conversation]
  )
  /** 「任务」「考勤」「员工」dock：不展示消息内「回复所属组织」横幅（组织由卡片上 `MainCuiCardOrgAttributionBanner` 等承担） */
  const isWorkTaskDockSession = React.useMemo(
    () => getConversationDockAppId(conversation) === "work_task",
    [conversation]
  )
  const isAttendanceDockSession = React.useMemo(
    () => getConversationDockAppId(conversation) === "attendance",
    [conversation]
  )
  const isEmployeeDockSession = React.useMemo(
    () => getConversationDockAppId(conversation) === "employee",
    [conversation]
  )
  const hideDockOrgReplyBannerSession =
    isWorkTaskDockSession || isAttendanceDockSession || isEmployeeDockSession

  const openPortalRootApp = React.useCallback(
    (portalKind: "education" | "hospital") => {
      const orgId = resolvePortalEntryOrganizationId(portalKind, {
        isNavContentScopeMode,
        dialogueContentOrgScope,
        currentOrg,
        organizations,
      })
      setCurrentOrg(orgId)
      const meta = getDockAppMeta(portalKind, scenario)
      onRegisterPortalRootSession?.(portalKind, meta.name, orgId, hasJoinedOrganizations)
      setActiveApp(portalKind)
    },
    [
      isNavContentScopeMode,
      dialogueContentOrgScope,
      currentOrg,
      organizations,
      hasJoinedOrganizations,
      onRegisterPortalRootSession,
      scenario,
    ]
  )

  /** 兼容旧会话/入口：与底部条唯一「教育」空间应用（`education`）同壳层 */
  const openPersonalEduSpacePortal = React.useCallback(() => {
    openPortalRootApp("education")
  }, [openPortalRootApp])

  const appendPersonalEduSpaceTurn = React.useCallback(
    (actionLabel: string) => {
      const userMsg: Message = {
        id: `user-${Date.now()}`,
        senderId: currentUser.id,
        content: actionLabel,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        createdAt: Date.now(),
      }
      const cardData = JSON.stringify({
        title: getDockAppMeta(PERSONAL_EDU_SPACE_APP_ID, scenario).name,
        description: `已选择：${actionLabel}。接下来可补充孩子年级、就读地区或学习目标等，我会按步骤协助你完成空间创建与配置。`,
        detail:
          "1. 确认身份与创建对象（家长为孩子 / 学生为自己）\n2. 填写或补充基础信息\n3. 遇到不懂的问题随时向我提问",
        imageSrc: getDockAppMeta(PERSONAL_EDU_SPACE_APP_ID, scenario).imageSrc,
        cardActions: {
          primary: {
            label: "按步骤继续",
            sendText: `我会按「${actionLabel}」继续，请先帮我确认第一步要准备什么。`,
          },
          secondary: { label: "换一个入口", preset: "more_recommend" as const },
        },
      })
      const botMsg: Message = {
        id: `bot-card-${Date.now() + 1}`,
        senderId: conversation.user.id,
        content: `<<<RENDER_GENERIC_CARD>>>:${cardData}`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        createdAt: Date.now() + 1,
      }
      setEducationMessages((prev) => [...prev, userMsg])
      setTimeout(() => {
        setEducationMessages((prev) => [...prev, botMsg])
        scrollRef.current?.scrollIntoView({ behavior: "smooth" })
      }, 500)
    },
    [conversation.user.id, scenario]
  )

  /**
   * 教育三身份场景下：把"指令文本（可选 skillId）"路由到 AI课堂侧 CUI。
   *
   * 新架构：
   * - AI课堂 = 一节具体课的侧 CUI 会话主体；所有 Skill 卡都在子 CUI 内出现，不再污染主对话流
   * - 该函数统一作为外部入口（Hero 卡主行动 / 待办 chip / IM banner / 兜底快捷指令 / 主 VVAI 跨应用跳转）
   *   的"打开侧 CUI 并执行此 Skill"标准接口
   * - 非教育三身份场景：兜底回到普通发消息（避免影响其他场景）
   */
  const handleEduRoleSkillCommand = React.useCallback(
    (
      command: string,
      opts?: {
        skillId?: string
        source?: AiClassroomSidePanelOpenRequest["source"]
        /**
         * 显式指定要把 Skill 落到哪节课的子 CUI（来自 EduLessonPickerCard 选课）。
         * 缺省 → 兜底到 `DEMO_LESSON.id`（主线物理课），保持与原 Hero / 待办 chip / 跨应用 handoff 行为兼容。
         */
        lessonId?: string
      },
    ) => {
      const role = eduScenarioRole(scenario)
      if (!role) {
        handleSendMessageRef.current?.(command)
        return
      }
      /**
       * 机构管理者（admin）没有"一节课"概念，Hero/待办 chip 的 skillId 指向 dock 三级菜单，
       * 直接以普通消息形式投递到主对话即可——既保留对话历史，也不会错把物理课主线侧 CUI 弹出。
       */
      const keepInMainChat = opts?.source === "dock" && !opts?.skillId
      if (role === "admin" || keepInMainChat) {
        handleSendMessageRef.current?.(command)
        return
      }
      /**
       * 优先使用调用方明确指定的 `lessonId`（来自 EduLessonPickerCard 用户选定的课）；
       * 仅当未指定时才落到主线物理课（兼容 Hero / 待办 chip / 跨应用 handoff 默认主线语义）。
       *
       * `kind: "skill"`：所有 Hero / chip / IM banner / picker 选课结果调用都是"执行某个 Skill"语义；
       * 让侧 CUI 走 executeSkill（push 用户气泡 + 业务卡或结构化文字），与"仅打开容器"区分开。
       */
      openAiClassroomSidePanel({
        lessonId: opts?.lessonId ?? DEMO_LESSON.id,
        command,
        skillId: opts?.skillId,
        source: opts?.source ?? "user",
        kind: "skill",
      })
    },
    [openAiClassroomSidePanel, scenario]
  )

  /**
   * IM 收件箱「课后报告」专用打开器（学生 / 家长侧）：
   *
   * 产品需求：老师发送风采报告后，孩子 / 家长在主对话顶部 IM banner 看到一条「老师已发送《xxx》风采报告」，
   * 点击 **不应**跳子 CUI，而是直接在主对话流里 push 一条用户气泡 + 一张 `LessonReviewCard`
   * （社交流式的"风采报告"卡），方便家长 / 孩子在主对话内点赞 / 评论。
   *
   * 其它事件类型（求助 / 私聊 / 请假等）维持原行为，仍走 `handleEduRoleSkillCommand` 进子 CUI。
   */
  const handleEduImInboxOpen = React.useCallback(
    (command: string, evt: EduImEvent) => {
      const role = eduScenarioRole(scenario)
      const isReportToStudentOrParent =
        evt.type === "report-to-parent" && (role === "student" || role === "parent")
      if (!isReportToStudentOrParent) {
        handleEduRoleSkillCommand(command)
        return
      }
      const lessonId = evt.lessonId ?? DEMO_LESSON.id
      const lessonTitle = evt.lessonTitle ?? "本节课程"
      if (activeApp !== "education") setActiveApp("education")
      const now = Date.now()
      const ts = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      const userMsg: Message = {
        id: `user-edu-im-open-${now}`,
        senderId: conversation.user.id,
        content: command,
        timestamp: ts,
        createdAt: now,
      }
      const cardMsg: Message = {
        id: `bot-edu-im-review-card-${now + 1}`,
        senderId: "ai-assistant",
        content: encodeMainLessonReviewMarker(
          role as EduSceneRoleNonAdmin,
          lessonId,
          lessonTitle,
        ),
        timestamp: ts,
        createdAt: now + 1,
      }
      setEducationMessages((prev) => [...prev, userMsg])
      window.setTimeout(() => {
        setEducationMessages((prev) => [...prev, cardMsg])
        scrollRef.current?.scrollIntoView({ behavior: "smooth" })
      }, 320)
    },
    [
      scenario,
      activeApp,
      conversation.user.id,
      setEducationMessages,
      handleEduRoleSkillCommand,
      setActiveApp,
    ],
  )

  /**
   * 教育门户主开场 4 chip 的统一调度器（替代旧的"chip 一律调 handleEduRoleSkillCommand"）。
   *
   * 行为分流（详见 `educationMainChipMeta.ts`）：
   * - **course-pick**：在主对话内 push 用户气泡 + 一张 `EduLessonPickerCard`，
   *   用户先选具体课，才会派发到该课的子 CUI（避免默认跳到主线物理课）
   * - **direct**：在主对话内直接 push 用户气泡 + 一条 `AiClassroomReply` 结构化回复
   *   （含 1–4 个下一步 chip），不开侧 CUI、不污染课程会话线
   *
   * 与「IM banner / Hero / 待办 chip / dock 子菜单」等"明确指定动作"的入口区分：
   * 那些入口仍直接走 `handleEduRoleSkillCommand`（kind: "skill"，跳子 CUI）；
   * 本调度器**仅**用于"主开场 4 chip"这种"我想做点什么但还没说哪节课"的初始意图。
   */
  const handleEduFirstEntryChip = React.useCallback(
    (prompt: string) => {
      const role = eduScenarioRole(scenario)
      if (!role) {
        handleSendMessageRef.current?.(prompt)
        return
      }
      if (activeApp !== "education") setActiveApp("education")

      const now = Date.now()
      const ts = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      const userMsg: Message = {
        id: `user-edu-chip-${now}`,
        senderId: conversation.user.id,
        content: prompt,
        timestamp: ts,
        createdAt: now,
      }

      /**
       * 校长（admin）专属闭环：4 chip 命中后**不**走 educationMainChipMeta 的 directReply（纯文字气泡），
       * 而是 push 一条 ADMIN_BUSINESS_CARD_MARKER 消息，由 AdminBusinessCard 渲染身份化业务卡
       * （headline + badges + stats + bullets + recommendedPrompts）——与三身份"进侧 CUI 看 skill 卡"对称。
       */
      if (role === "admin") {
        const adminCardId = findAdminCardIdByCommand(prompt)
        if (adminCardId) {
          const cardMsg: Message = {
            id: `bot-admin-card-${now + 1}`,
            senderId: "ai-assistant",
            content: `${ADMIN_BUSINESS_CARD_MARKER}:${adminCardId}`,
            timestamp: ts,
            createdAt: now + 1,
          }
          setEducationMessages((prev) => [...prev, userMsg])
          window.setTimeout(() => {
            setEducationMessages((prev) => [...prev, cardMsg])
            scrollRef.current?.scrollIntoView({ behavior: "smooth" })
          }, 380)
          return
        }
        // 未登记的 admin chip：兜底走原 directReply / course-pick 链路
      }

      const meta = getEduMainChipMeta(role, prompt)

      if (meta.kind === "direct") {
        /** 直接回复：用结构化 reply marker 序列化，由主对话渲染层识别并渲染 chip 行 */
        const reply =
          meta.directReply ?? {
            headline: `已收到：${prompt}`,
            body: ["这一项演示版尚未接通业务卡，但你可以从下方几个常用动作继续。"],
            nextActions: [],
          }
        const botMsg: Message = {
          id: `bot-edu-chip-direct-${now + 1}`,
          senderId: "ai-assistant",
          content: serializeAiClassroomReply(reply),
          timestamp: ts,
          createdAt: now + 1,
        }
        setEducationMessages((prev) => [...prev, userMsg])
        window.setTimeout(() => {
          setEducationMessages((prev) => [...prev, botMsg])
          scrollRef.current?.scrollIntoView({ behavior: "smooth" })
        }, 380)
        return
      }

      /** course-pick：admin 不应进这里（admin 全部 direct），保险起见兜底 */
      if (role === "admin") {
        handleSendMessageRef.current?.(prompt)
        return
      }
      const payload: EduLessonPickerPayload = {
        role,
        intentPrompt: meta.pickIntentPrompt ?? prompt,
        intentLabel: meta.pickIntentLabel ?? `想对哪节课「${prompt}」？`,
      }
      const botMsg: Message = {
        id: `bot-edu-chip-pick-${now + 1}`,
        senderId: "ai-assistant",
        content: buildEduLessonPickerCardContent(payload),
        timestamp: ts,
        createdAt: now + 1,
      }
      setEducationMessages((prev) => [...prev, userMsg])
      window.setTimeout(() => {
        setEducationMessages((prev) => [...prev, botMsg])
        scrollRef.current?.scrollIntoView({ behavior: "smooth" })
      }, 380)
    },
    [scenario, activeApp, conversation.user.id, setEducationMessages],
  )

  const handlePortalDockSwitcherSelect = React.useCallback(
    (app: AppItem) => {
      if (app.id === "education" || app.id === "hospital") {
        openPortalRootApp(app.id)
        return
      }
      if (app.id === PERSONAL_EDU_SPACE_APP_ID) {
        openPortalRootApp("education")
        return
      }
      if (
        (isScenarioTwoFamily(scenario) || isNoOrgRoute) &&
        !isScenarioTwoMultiOrgs(scenario)
      ) {
        onDockAppActivate?.(app.id, app.name, currentOrg, hasJoinedOrganizations)
        const first = getDockBarInlineShortcuts(app.id)[0]
        if (first) queueMicrotask(() => handleSendMessageRef.current(first))
        return
      }
      setActiveApp(null)
      onDockAppActivate?.(app.id, app.name, currentOrg, hasJoinedOrganizations)
    },
    [
      onDockAppActivate,
      currentOrg,
      hasJoinedOrganizations,
      openPortalRootApp,
      openPersonalEduSpacePortal,
      scenario,
      isNoOrgRoute,
    ]
  )

  /**
   * 教育 / 医院门户：仅在「进入门户 / 换组织」时把列表选中态对齐到门户根 dock 会话。
   * 不可在 `conversations` 每次更新时强制 `onSelect(expectedId)`，否则用户从会话历史切到其他应用会被立刻打回门户会话。
   */
  const portalRootSessionListSyncKeyRef = React.useRef<string | null>(null)
  React.useEffect(() => {
    if (!onSelect) return
    const portalKind =
      activeApp === "education" || activeApp === "hospital"
        ? activeApp
        : activeApp === PERSONAL_EDU_SPACE_APP_ID
          ? PERSONAL_EDU_SPACE_APP_ID
          : null
    if (!portalKind) {
      portalRootSessionListSyncKeyRef.current = null
      return
    }
    const expectedId = stableDockConversationId(
      currentOrg,
      portalKind,
      hasJoinedOrganizations
    )
    const syncKey = `${portalKind}|${currentOrg}|${String(hasJoinedOrganizations)}`
    if (portalRootSessionListSyncKeyRef.current === syncKey) {
      return
    }
    if (conversations.some((c) => c.id === expectedId)) {
      portalRootSessionListSyncKeyRef.current = syncKey
      if (selectedId !== expectedId) {
        onSelect(expectedId)
      }
      return
    }
    if (portalKind === "education" || portalKind === "hospital") {
      openPortalRootApp(portalKind)
    } else {
      openPersonalEduSpacePortal()
    }
  }, [
    activeApp,
    currentOrg,
    hasJoinedOrganizations,
    conversations,
    selectedId,
    onSelect,
    openPortalRootApp,
    openPersonalEduSpacePortal,
  ])

  /** 从《会话历史》选中非门户根会话时先退出门户，避免仍走教育/医院消息列与门户壳层 */
  const applyPrimarySessionListSelection = React.useCallback(
    (id: string) => {
      if (
        secondaryPortalOpen &&
        (activeApp === "education" ||
          activeApp === "hospital" ||
          activeApp === PERSONAL_EDU_SPACE_APP_ID)
      ) {
        const portalKind = activeApp as "education" | "hospital" | typeof PERSONAL_EDU_SPACE_APP_ID
        const portalRootId = stableDockConversationId(
          currentOrg,
          portalKind,
          hasJoinedOrganizations
        )
        if (id !== portalRootId) {
          setActiveApp(null)
        }
      }
      onSelect?.(id)
    },
    [secondaryPortalOpen, activeApp, currentOrg, hasJoinedOrganizations, onSelect]
  )

  /** 组织型应用会话：AI 回复 GUI 标明所属组织（主 VVAI / 个人应用顶栏内容范围不展示消息内横幅） */
  const dockSessionOrgDisplayNameForMessages = React.useMemo(() => {
    if (secondaryPortalOpen) return null
    if (isNavContentScopeMode) return null
    const oid = conversationDockOrgIdForSessionInteraction(conversation)
    if (!oid) return null
    return organizations.find((o) => o.id === oid)?.name?.trim() || oid
  }, [secondaryPortalOpen, conversation, organizations, isNavContentScopeMode])

  const renderReplyOrgContextBanner = React.useCallback(
    (_msg: Message, isEducationContext: boolean) => {
      if (isEducationContext) return null
      if (hideDockOrgReplyBannerSession) return null
      if (dockSessionOrgDisplayNameForMessages) {
        return <DockSessionOrgReplyBanner orgDisplayName={dockSessionOrgDisplayNameForMessages} />
      }
      return null
    },
    [dockSessionOrgDisplayNameForMessages, hideDockOrgReplyBannerSession]
  )

  /**
   * 主 VVAI，或日历等待办/会议/文档/邮件/微盘等「个人应用范围」dock 会话：
   * 已加入多个组织时，对「组织应用」卡片在卡片上方展示 `MainCuiCardOrgAttributionBanner`。
   * 卡片 dock id 取 `msg.cardAttributionDockAppId ?? contentDockAppId`；若为个人应用范围则不展示。
   * 组织名称：`msg.cardAttributionOrgId`（若有）否则取当前对话解析出的主体（见 `conversationHostOrganizationIdForAttribution`）。
   */
  const mainCuiOrgCardAttributionHostConversation = React.useMemo(() => {
    const sessionDockId = getConversationDockAppId(conversation)
    const isMainVvai =
      conversation.id === cuiMainChatId &&
      conversation.dockAppId == null &&
      !isDockConversationId(conversation.id)
    const isPersonalScopeDockChat =
      (isDockConversationId(conversation.id) || conversation.dockAppId != null) &&
      sessionDockId != null &&
      isPersonalScopeDockAppId(sessionDockId)
    return isMainVvai || isPersonalScopeDockChat
  }, [conversation.id, conversation.dockAppId, cuiMainChatId])

  const conversationHostOrganizationIdForCardBanner = React.useMemo(
    () =>
      conversationHostOrganizationIdForAttribution(conversation, {
        cuiMainChatId,
        isNavContentScopeMode,
        dialogueContentOrgScope,
        currentOrg,
        organizations,
      }),
    [
      conversation,
      cuiMainChatId,
      isNavContentScopeMode,
      dialogueContentOrgScope,
      currentOrg,
      organizations,
    ]
  )

  const renderMainCuiCardOrgAttributionBanner = React.useCallback(
    (msg: Message, isEducationContext: boolean, contentDockAppId: string | null) => {
      if (isEducationContext) return null
      if (secondaryPortalOpen) return null
      if (!mainCuiOrgCardAttributionHostConversation) return null
      if (!hasJoinedOrganizations || organizations.length <= 1) return null
      const dockId = msg.cardAttributionDockAppId ?? contentDockAppId
      if (!dockId || isPersonalScopeDockAppId(dockId)) return null
      const oid = msg.cardAttributionOrgId ?? conversationHostOrganizationIdForCardBanner
      const label = organizations.find((o) => o.id === oid)?.name?.trim() || oid

      const mergeOrgSwitchIntoBanner =
        isScenarioTwoMultiOrgs(scenario) &&
        (dockId === "attendance" || dockId === "work_task")

      const multiOrgSwitch = mergeOrgSwitchIntoBanner
        ? {
            organizations: organizations.map((o) => ({ id: o.id, name: o.name })),
            conversationCurrentOrgId: currentOrg,
            orgPickLabelMode: (dockId === "work_task" ? "task_table" : "attendance") as
              | "task_table"
              | "attendance",
            onNavigateOtherOrg: (orgName: string) =>
              dockId === "work_task"
                ? handleSendMessageRef.current(`还可以针对「${orgName}」打开任务列表`)
                : handleSendMessageRef.current(`还可以针对「${orgName}」查看考勤`),
          }
        : undefined

      return (
        <MainCuiCardOrgAttributionBanner orgDisplayName={label} multiOrgSwitch={multiOrgSwitch} />
      )
    },
    [
      secondaryPortalOpen,
      mainCuiOrgCardAttributionHostConversation,
      hasJoinedOrganizations,
      organizations,
      conversationHostOrganizationIdForCardBanner,
      scenario,
      currentOrg,
    ]
  )

  const navBarOrganizationId = isNavContentScopeMode ? dialogueContentOrgScope : currentOrg

  const handleSessionResizePointerDown = React.useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!onSessionSidebarWidthChange) return
      e.preventDefault()
      const startX = e.clientX
      const startW = sessionSidebarWidthProp
      const onMove = (ev: PointerEvent) => {
        const dw = ev.clientX - startX
        onSessionSidebarWidthChange(Math.min(480, Math.max(220, startW + dw)))
      }
      const onUp = () => {
        window.removeEventListener("pointermove", onMove)
        window.removeEventListener("pointerup", onUp)
      }
      window.addEventListener("pointermove", onMove)
      window.addEventListener("pointerup", onUp)
    },
    [sessionSidebarWidthProp, onSessionSidebarWidthChange]
  )

  // Model State
  const [currentModel, setCurrentModel] = React.useState<string>('gpt-4');

  // Task Drawer State
  const [isTaskDrawerOpen, setIsTaskDrawerOpen] = React.useState(false);
  const [selectedTask, setSelectedTask] = React.useState<any>(null);
  
  // Pinned Task State
  const [isPinnedTaskExpanded, setIsPinnedTaskExpanded] = React.useState(true);

  // Floating Windows State
  const [floatingApps, setFloatingApps] = React.useState<string[]>([]);

  // Secondary App History Sidebar State
  const [secondaryHistoryOpen, setSecondaryHistoryOpen] = React.useState(false);
  const [selectedSecondarySession, setSelectedSecondarySession] = React.useState<string>("");
  /** 主 VVAI 顶栏「历史消息」右侧抽屉 */
  const [mainChatHistoryOpen, setMainChatHistoryOpen] = React.useState(false);

  /** 教育/医院门户：《应用内历史》抽屉无顶栏入口时，进入门户即收起避免无法关闭 */
  React.useEffect(() => {
    if (secondaryPortalOpen) setSecondaryHistoryOpen(false)
  }, [secondaryPortalOpen])

  // Mock data for secondary app sessions (教育应用的历史会话)
  const [secondaryAppSessions] = React.useState<SecondaryAppSession[]>([
    {
      id: 'session-1',
      appName: '教育',
      appIconKey: 'education',
      timestamp: new Date(), // 今天
      hasUncompletedAction: true
    },
    {
      id: 'session-2',
      appName: '日历',
      appIconKey: 'calendar',
      timestamp: new Date(), // 今天
      hasUncompletedAction: false
    },
    {
      id: 'session-3',
      appName: '会议',
      appIconKey: 'meeting',
      timestamp: new Date(), // 今天
      hasUncompletedAction: true
    },
    {
      id: 'session-4',
      appName: '待办',
      appIconKey: 'todo',
      timestamp: new Date(), // 今天
      hasUncompletedAction: true
    },
    {
      id: 'session-5',
      appName: '微盘',
      appIconKey: 'disk',
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3天前
      hasUncompletedAction: false
    },
    {
      id: 'session-6',
      appName: '邮箱',
      appIconKey: 'mail',
      timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5天前
      hasUncompletedAction: false
    },
    {
      id: 'session-7',
      appName: '会议',
      appIconKey: 'meeting',
      timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10天前
      hasUncompletedAction: false
    },
    {
      id: 'session-8',
      appName: '微盘',
      appIconKey: 'disk',
      timestamp: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15���前
      hasUncompletedAction: false
    },
  ]);

  const hydrateBottomDock = React.useCallback(() => {
    let signature: string
    let ids: string[]
    if (scenario === "scenario-five") {
      signature = computeUnionDockSignature("scenario-five", organizations)
      ids =
        organizations.length === 0
          ? [...DOCK_IDS_NO_ORG]
          : defaultDockIdsUnionAcrossOrgs(organizations)
    } else {
      signature = computeDockSignature(organizations, currentOrg, scenario)
      ids = defaultDockIdsForContext(organizations, currentOrg, scenario)
    }
    dockSignatureRef.current = signature
    const denied = [
      ...MOCK_DOCK_USER.deniedAppIds,
      ...(ROLE_DENIED_APPS[MOCK_DOCK_USER.roleId] ?? []),
    ]
    ids = ids.filter((id) => !denied.includes(id))
    ids = sortDockIdsByUsage(ids, MOCK_DOCK_USER.usageWeight)
    const saved = loadPersistedDockOrder(signature)
    if (saved) {
      const allow = new Set(ids)
      const head = saved.filter((id) => allow.has(id))
      const tail = ids.filter((id) => !head.includes(id))
      ids = [...head, ...tail]
    }
    ids = prioritizePortalDockHead(ids)
    setDockCatalogIds(ids)
    const hidden = new Set(loadPersistedDockHidden(signature))
    ids = ids.filter((id) => !hidden.has(id))
    const next = ids.map((id, i) => createDockAppItem(id, i + 1, scenario))
    lastDockOrderRef.current = ids
    setApps(next)
  }, [organizations, currentOrg, scenario])

  React.useEffect(() => {
    if (mainView !== "cui") return
    /** 从会话直接进入门户时 `activeApp` 可能非空而 `apps` 尚未 hydrate，切换芯片会误显示「应用」 */
    if (activeApp === null) {
      hydrateBottomDock()
      return
    }
    if (apps.length === 0) {
      hydrateBottomDock()
    }
  }, [organizations, currentOrg, mainView, activeApp, apps.length, hydrateBottomDock])

  React.useEffect(() => {
    onCurrentOrgChange?.(currentOrg, { hasJoinedOrganizations })
  }, [currentOrg, hasJoinedOrganizations, onCurrentOrgChange])

  /** 从会话列表进入某行政公司的应用会话时，顶栏主体与之一致，避免「日历」内容与切换器所示公司错位 */
  React.useEffect(() => {
    if (activeApp !== null) return
    if (!isDockConversationId(conversation.id) && conversation.dockAppId == null) return
    const oid = conversationDockOrgIdForSessionInteraction(conversation)
    if (!oid) return
    if (!organizations.some((o) => o.id === oid)) return
    setCurrentOrg((prev) => (prev === oid ? prev : oid))
  }, [conversation.id, conversation.dockAppId, organizations, activeApp])

  const handleReorder = (reorderedApps: AppItem[]) => {
    setApps(reorderedApps);
    lastDockOrderRef.current = reorderedApps.map((a) => a.id);
    const sig = dockSignatureRef.current;
    if (sig) persistDockOrder(sig, reorderedApps.map((a) => a.id));
  };

  const handleDockRemoveFromBar = React.useCallback(
    (appId: string) => {
      if (apps.length <= 1) return
      const sig = dockSignatureRef.current
      if (!sig) return
      const prevHidden = loadPersistedDockHidden(sig)
      if (!prevHidden.includes(appId)) {
        persistDockHidden(sig, [...prevHidden, appId])
      }
      const reordered = apps
        .filter((a) => a.id !== appId)
        .map((a, i) => ({ ...a, order: i + 1 }))
      setApps(reordered)
      const orderedIds = reordered.map((a) => a.id)
      lastDockOrderRef.current = orderedIds
      persistDockOrder(sig, orderedIds)
    },
    [apps]
  )

  const handleDockAddToBar = React.useCallback(
    (appId: string) => {
      const sig = dockSignatureRef.current
      if (!sig) return
      if (apps.some((a) => a.id === appId)) return
      persistDockHidden(
        sig,
        loadPersistedDockHidden(sig).filter((id) => id !== appId)
      )
      const reordered = [...apps, createDockAppItem(appId, apps.length + 1, scenario)]
      setApps(reordered)
      const orderedIds = reordered.map((a) => a.id)
      lastDockOrderRef.current = orderedIds
      persistDockOrder(sig, orderedIds)
    },
    [apps, scenario]
  )

  /**
   * 教育门户「我的课表 / 孩子课表」入口（场景六/七/八专用）：
   * 在教育主对话里 push 一条用户气泡（"我的课表" / "孩子课表"）+ 一条 AI 气泡（含课表卡片 marker），
   * 用户在卡片里点某节课才打开该课的子 CUI（保持"先看课表 GUI 再选课进子 CUI"的预期）。
   *
   * - 与"打开侧面板 agenda"互斥：本入口落在主对话流，历史可向上回看
   * - 若当前未在教育门户内，会先把 activeApp 切到 `education`，避免消息 push 到主 VVAI
   * - 0.5s 后再 push AI 气泡，与既有 setEducationMessages 双 setTimeout 节奏一致（如生成卡片块）
   */
  const openScheduleCardInEduChat = React.useCallback(
    (role: EduLessonAttendingRole, scope: "today" | "week" = "week") => {
      if (activeApp !== "education") setActiveApp("education")
      const now = Date.now()
      const userMsg: Message = {
        id: `user-edu-schedule-open-${now}`,
        senderId: conversation.user.id,
        content: buildOpenScheduleUserCommand(role, scope),
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        createdAt: now,
      }
      const botMsg: Message = {
        id: `bot-edu-schedule-card-${now + 1}`,
        senderId: "ai-assistant",
        content: buildAiClassroomScheduleCardContent(role, scope),
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        createdAt: now + 1,
      }
      setEducationMessages((prev) => [...prev, userMsg])
      window.setTimeout(() => {
        setEducationMessages((prev) => [...prev, botMsg])
        scrollRef.current?.scrollIntoView({ behavior: "smooth" })
      }, 380)
    },
    [activeApp, conversation.user.id, setEducationMessages],
  )

  /**
   * 场景六/七/八/九统一规则：
   * 课表的「今日/本周」菜单应先打开带课程状态的课表列表卡，再由用户点具体课程进入子 CUI。
   *
   * 关键：该分支以 `menuId` 为准，不依赖二级 appId 命名。
   * 这样当「今日课表」从「课表」移动到「课程管理」后二级容器时，点击行为仍与旧版一致。
   *
   * - ts_*：老师/管理者共用 teacher 视角（admin 先复用）
   * - ss_*：学生视角
   * - ps_*：家长视角
   */
  const tryOpenScheduleCardFromMenu = React.useCallback(
    (appId: string, menuId: string | null): boolean => {
      void appId
      if (!menuId) return false
      if (menuId === "ts_today" || menuId === "ts_week") {
        const scope: "today" | "week" = menuId === "ts_today" ? "today" : "week"
        openScheduleCardInEduChat("teacher", scope)
        return true
      }
      if (menuId === "ss_today" || menuId === "ss_week") {
        const scope: "today" | "week" = menuId === "ss_today" ? "today" : "week"
        openScheduleCardInEduChat("student", scope)
        return true
      }
      if (menuId === "ps_today" || menuId === "ps_week") {
        const scope: "today" | "week" = menuId === "ps_today" ? "today" : "week"
        openScheduleCardInEduChat("parent", scope)
        return true
      }
      return false
    },
    [openScheduleCardInEduChat],
  )

  /**
   * 教育 dock 三级菜单点击 → 在教育主对话内 push 一张「业务卡 + 推荐指令」气泡。
   *
   * 与旧逻辑（push 纯文字 GenericCard 占位）的核心差异：
   * - 卡数据来自 `educationDockMenuRegistry`：每个 menu id 都对应 4 数据格 + 3-4 推荐指令
   * - 渲染时由 `<EduDockMenuCard>` 拆解 marker；推荐指令点击后再 push（用户气泡 + 占位 AI 文本回执）
   *
   * 失败兜底：注册表查不到 → 返回 false，调用方走原占位卡分支（保证未注册菜单仍有响应）。
   */
  const openEduDockMenuCardInChat = React.useCallback(
    (role: EduSceneRole, menuId: string, menuName: string, appName: string): boolean => {
      /** 「课程履约」走专属卡：列表 + 11 操作按钮 + 点击直达系列课子 CUI */
      if (menuId === "ecm_fulfillment" || menuId === "sc_fulfillment" || menuId === "pc_fulfillment") {
        const now = Date.now()
        const userMsg: Message = {
          id: `user-edu-dock-${menuId}-${now}`,
          senderId: conversation.user.id,
          content: `查看「${appName} · ${menuName}」`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          createdAt: now,
        }
        const botMsg: Message = {
          id: `bot-edu-fulfillment-${menuId}-${now + 1}`,
          senderId: "ai-assistant",
          content: `${EDU_COURSE_FULFILLMENT_CARD_MARKER}:${role}`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          createdAt: now + 1,
        }
        setEducationMessages((prev) => [...prev, userMsg])
        window.setTimeout(() => {
          setEducationMessages((prev) => [...prev, botMsg])
          scrollRef.current?.scrollIntoView({ behavior: "smooth" })
        }, 320)
        return true
      }
      /**
       * 「课程商品」走 EduCourseGoodsCard：浏览态 · 列表点行直接进对应课程子 CUI。
       * 与「课程课表」（ecm_schedule）严格区分——
       *  - 课程商品（egm_course）：浏览 + 入口；不做创建 / 排课 / 上下架（这些归到课程课表）
       *  - 课程课表（ecm_schedule）：完整管理态（创建 / 上传大纲 / 添加排课表 / 删除）
       *
       * 顶部业务摘要仍复用 `educationDockMenuRegistry.egm_course`，避免"在售 N 个 / 本月新上 M 个"原文案丢失。
       */
      if (menuId === "egm_course") {
        const now = Date.now()
        const userMsg: Message = {
          id: `user-edu-dock-${menuId}-${now}`,
          senderId: conversation.user.id,
          content: `查看「${appName} · ${menuName}」`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          createdAt: now,
        }
        const botMsg: Message = {
          id: `bot-edu-course-goods-${now + 1}`,
          senderId: "ai-assistant",
          content: buildEduCourseGoodsMarkerContent({
            spaceOrgId: currentOrg,
            spaceScenario: scenario,
          }),
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          createdAt: now + 1,
        }
        setEducationMessages((prev) => [...prev, userMsg])
        window.setTimeout(() => {
          setEducationMessages((prev) => [...prev, botMsg])
          scrollRef.current?.scrollIntoView({ behavior: "smooth" })
        }, 320)
        return true
      }
      /**
       * 「课程课表」走专属卡：智能课表助手（搜索 / 筛选 / 列表 / 「+ 创建课程」）。
       *
       * 注意：与「课程商品」（egm_course）严格区分——
       *  - 课程课表（ecm_schedule）：聚焦"课程列表 + 排课 + 创建课程"，由 eduCoursesPersistence 驱动
       *  - 课程商品（egm_course）：上面已分流到 EduCourseGoodsCard，不到这里
       */
      if (menuId === "ecm_schedule") {
        const now = Date.now()
        const userMsg: Message = {
          id: `user-edu-dock-${menuId}-${now}`,
          senderId: conversation.user.id,
          content: `查看「${appName} · ${menuName}」`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          createdAt: now,
        }
        const botMsg: Message = {
          id: `bot-edu-course-products-${now + 1}`,
          senderId: "ai-assistant",
          content: buildEduCourseProductsMarkerContent({
            spaceOrgId: currentOrg,
            spaceScenario: scenario,
          }),
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          createdAt: now + 1,
        }
        setEducationMessages((prev) => [...prev, userMsg])
        window.setTimeout(() => {
          setEducationMessages((prev) => [...prev, botMsg])
          scrollRef.current?.scrollIntoView({ behavior: "smooth" })
        }, 320)
        return true
      }
      /**
       * 「教学管理」二级菜单下的 4 个三级菜单（资料 / 考勤 / 作业 / 风采）：
       * 走 LessonOperationListCard：跨课次列表卡 + 行内类别摘要 + 点行进子 CUI。
       *
       * 注意：4 角色共用同一组 menuId（tm_*），仅 kind 维度切换；
       * 风采菜单在老师 / admin 侧文案为「点评风采」、学生 / 家长侧为「报告风采」，
       * 由 `getLessonOperationCardTitle(role, kind)` 在卡内统一渲染。
       */
      const lessonOpKind = getLessonOperationKindByMenuId(menuId)
      if (lessonOpKind != null) {
        const now = Date.now()
        const userMsg: Message = {
          id: `user-edu-dock-${menuId}-${now}`,
          senderId: conversation.user.id,
          content: `查看「${appName} · ${menuName}」`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          createdAt: now,
        }
        const botMsg: Message = {
          id: `bot-edu-lesson-op-${menuId}-${now + 1}`,
          senderId: "ai-assistant",
          content: buildLessonOperationListCardContent(role, lessonOpKind),
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          createdAt: now + 1,
        }
        setEducationMessages((prev) => [...prev, userMsg])
        window.setTimeout(() => {
          setEducationMessages((prev) => [...prev, botMsg])
          scrollRef.current?.scrollIntoView({ behavior: "smooth" })
        }, 320)
        return true
      }
      const data = getEduDockMenuCardData(role, menuId, educationStage)
      if (!data) return false
      const now = Date.now()
      const userMsg: Message = {
        id: `user-edu-dock-${menuId}-${now}`,
        senderId: conversation.user.id,
        content: `查看「${appName} · ${menuName}」`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        createdAt: now,
      }
      const botMsg: Message = {
        id: `bot-edu-dock-${menuId}-${now + 1}`,
        senderId: "ai-assistant",
        content: buildEduDockMenuCardContent(role, menuId, educationStage),
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        createdAt: now + 1,
      }
      setEducationMessages((prev) => [...prev, userMsg])
      window.setTimeout(() => {
        setEducationMessages((prev) => [...prev, botMsg])
        scrollRef.current?.scrollIntoView({ behavior: "smooth" })
      }, 320)
      return true
    },
    [conversation.user.id, educationStage, setEducationMessages, currentOrg, scenario],
  )

  /**
   * 教育微盘卡 1（列表卡）：在当前会话里 push「用户气泡 = 教育微盘 + AI 卡片 marker」。
   *
   * 入口：
   *  - 微盘 dock 内联快捷指令「教育微盘」chip 点击
   *  - 卡 2 底部「← 返回教育微盘列表」按钮
   *  - （后续）用户主动输入命中 isEduDiskEntryCommand
   *
   * 角色解析：
   *  - 教育场景：取 `eduSceneRoleId`
   *  - 非教育场景：兜底 student（因为微盘是个人范围 dock，与组织 / 教育主体无关）
   *
   * 不区分 dock 上下文：disk dock 之外的会话也允许出卡（微盘聚合视图本身就是跨上下文的）。
   */
  const openEduDiskListCardInChat = React.useCallback(() => {
    const role: EduSceneRole = eduSceneRoleId ?? "student"
    const now = Date.now()
    const userMsg: Message = {
      id: `user-edu-disk-list-${now}`,
      senderId: conversation.user.id,
      content: "教育微盘",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      createdAt: now,
    }
    const botMsg: Message = {
      id: `bot-edu-disk-list-${now + 1}`,
      senderId: "ai-assistant",
      content: buildEduDiskListCardContent(role),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      createdAt: now + 1,
    }
    setMessages((prev) => [...prev, userMsg, botMsg])
    scrollRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [eduSceneRoleId, conversation.user.id, setMessages])

  /**
   * 教育微盘卡 2（目录卡）：在当前会话里 push「用户气泡 = 打开 ${spaceName} · 教育微盘 + AI 卡 marker」。
   * 由卡 1 行点击触发。
   */
  const openEduDiskFolderCardInChat = React.useCallback(
    (spaceId: string, spaceName: string) => {
      const role: EduSceneRole = eduSceneRoleId ?? "student"
      const now = Date.now()
      const userMsg: Message = {
        id: `user-edu-disk-folder-${spaceId}-${now}`,
        senderId: conversation.user.id,
        content: `打开 ${spaceName} · 教育微盘`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        createdAt: now,
      }
      const botMsg: Message = {
        id: `bot-edu-disk-folder-${spaceId}-${now + 1}`,
        senderId: "ai-assistant",
        content: buildEduDiskFolderCardContent(role, spaceId),
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        createdAt: now + 1,
      }
      setMessages((prev) => [...prev, userMsg, botMsg])
      scrollRef.current?.scrollIntoView({ behavior: "smooth" })
    },
    [eduSceneRoleId, conversation.user.id, setMessages],
  )

  /**
   * 教学资料浏览卡（统一 store 视图，含课程 / 大纲 / 课次三层）：
   *  入口：
   *   - EduDiskFolderCard 顶部「教学资料 · 课程文件夹」CTA
   *   - 课程商品卡里「在微盘打开」chip → 由当前实现以文本指令记录，未来可扩展为直接 push 该卡
   */
  const openEduTeachingMaterialsBrowserInChat = React.useCallback(
    (input?: { focusCourseId?: string; focusLessonKey?: string; userText?: string }) => {
      const now = Date.now()
      const userMsg: Message = {
        id: `user-edu-tm-browser-${now}`,
        senderId: conversation.user.id,
        content: input?.userText ?? "查看教学资料",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        createdAt: now,
      }
      const botMsg: Message = {
        id: `bot-edu-tm-browser-${now + 1}`,
        senderId: "ai-assistant",
        content: buildEduTeachingMaterialsBrowserMarkerContent({
          spaceOrgId: currentOrg,
          spaceScenario: scenario,
          focusCourseId: input?.focusCourseId,
          focusLessonKey: input?.focusLessonKey,
        }),
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        createdAt: now + 1,
      }
      setMessages((prev) => [...prev, userMsg, botMsg])
      scrollRef.current?.scrollIntoView({ behavior: "smooth" })
    },
    [conversation.user.id, currentOrg, scenario, setMessages],
  )

  /**
   * 课中状态主动 push「课程进行中」气泡：
   * - 触发条件：教育门户激活 + stage === "in" + 学生 / 家长（老师不推，见 effect 内注释）
   * - 幂等：以 `${role}|${stage}` 为 key 用 ref 去重，避免每次 state 变化重复 push
   * - 与首屏「能力地图」/ Hero 卡互补：Hero 卡讲全貌，本提醒讲"现在正在上课·一键进入"
   *
   * 必须放在 `setEducationMessages` 定义之后（同一 component scope 的 TDZ）：
   * 之前放在前面会触发 ReferenceError 「初始化前无法访问 setEducationMessages」。
   */
  const pushedLiveHintKeyRef = React.useRef<string | null>(null)
  React.useEffect(() => {
    if (activeApp !== "education") return
    if (educationStage !== "in") return
    if (!eduRoleFromScenario || eduRoleFromScenario === "admin") return
    /**
     * 老师课中：主开场已有「欢迎语 + 4 chip」直达在线教室 / 随堂题 / 签到 / 资料，
     * 不再自动 push「课程进行中」大卡（与产品要求一致）。
     */
    if (eduRoleFromScenario === "teacher") return
    const key = `${eduRoleFromScenario}|${educationStage}`
    if (pushedLiveHintKeyRef.current === key) return
    pushedLiveHintKeyRef.current = key
    const now = Date.now()
    const card: Message = {
      id: `bot-edu-live-hint-${now}`,
      senderId: "ai-assistant",
      content: `${LIVE_LESSON_HINT_CARD_MARKER}:${eduRoleFromScenario}`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      createdAt: now,
    }
    /** 推迟到下一帧再 push，确保 portal 主区已经挂载（避免被 educationMessages 初始化覆盖） */
    const t = window.setTimeout(() => {
      setEducationMessages((prev) => {
        /** 历史已存在该 marker 时不重复（demo 跨重渲染兜底） */
        if (prev.some((m) => m.content === card.content)) return prev
        return [...prev, card]
      })
      scrollRef.current?.scrollIntoView({ behavior: "smooth" })
    }, 80)
    return () => window.clearTimeout(t)
  }, [activeApp, educationStage, eduRoleFromScenario, setEducationMessages])

  /**
   * 反向：离开课中（教师 / 学生 / 家长 stage 切回 pre / post）→ 清空 dedupe key，
   * 让下一次再切回 in 仍能 push（演示态 EducationStageSwitcher 来回切换更可信）。
   */
  React.useEffect(() => {
    if (educationStage !== "in") {
      pushedLiveHintKeyRef.current = null
    }
  }, [educationStage])

  /**
   * 教育主开场欢迎气泡的 follow-up chip 清理（v7）：
   *
   * v6 之前主 VVAI 教育欢迎气泡（id 前缀 `vvai-edu-role-`）下挂 4 chip，按 (stage × deliveryMode) 派发。
   * v7 起产品决定主 VVAI 欢迎气泡裸奔（详见 `MainAI.buildEduRoleWelcomeMessages` JSDoc）。
   *
   * 这里**只做兜底剥离**：
   * - 老用户 sessionStorage 里仍可能残存带 `cuiFollowUpPrompts` / `cuiFollowUpSendTexts` 的 seed 消息
   * - 进入主会话后立即把这两个字段清掉，避免页面上还能看到 stale chip 一闪而过
   * - 已经裸奔的 seed 消息：no-op，不会引发渲染抖动
   *
   * 注意：不影响门户内主开场（`MainVvaiStandardWelcomeCard` 下挂 chip）/ 子 CUI 开场 chip / IM banner / 待办带 chip，
   * 它们各自有独立路径。
   */
  React.useEffect(() => {
    if (!eduSceneRoleId) return
    const role = eduSceneRoleId
    setMessages((prev) => {
      let changed = false
      const next = prev.map((m) => {
        if (!m.id.startsWith(`vvai-edu-role-${role}-`)) return m
        if (!m.cuiFollowUpPrompts && !m.cuiFollowUpSendTexts) return m
        changed = true
        const { cuiFollowUpPrompts: _p, cuiFollowUpSendTexts: _t, ...rest } = m
        void _p
        void _t
        return rest
      })
      return changed ? next : prev
    })
  }, [eduSceneRoleId])

  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (longPressIndex !== index) {
      e.preventDefault();
      return;
    }
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', index.toString());
    }
    setDraggedIndex(index);
  };

  const handleDragEnter = (index: number) => {
    if (draggedIndex === null || draggedIndex === index) return;
    
    const newApps = [...apps];
    const draggedApp = newApps[draggedIndex];
    newApps.splice(draggedIndex, 1);
    newApps.splice(index, 0, draggedApp);
    
    const reorderedApps = newApps.map((app, i) => ({
      ...app,
      order: i + 1,
    }));
    
    setApps(reorderedApps);
    lastDockOrderRef.current = reorderedApps.map((a) => a.id);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    if (draggedIndex !== null) {
      const sig = dockSignatureRef.current;
      if (sig && lastDockOrderRef.current.length > 0) {
        persistDockOrder(sig, lastDockOrderRef.current);
      }
    }
    setDraggedIndex(null);
  };

  React.useLayoutEffect(() => {
    const id = conversation.id
    const prev = prevConversationIdRef.current
    if (prev !== null && prev !== id && onPersistConversationMessages) {
      onPersistConversationMessages(prev, messagesRef.current)
    }
    const idChanged = prev !== id
    prevConversationIdRef.current = id

    const parentMessagesIdentityChanged =
      conversation.messages !== lastSyncedParentConversationMessagesRef.current
    lastSyncedParentConversationMessagesRef.current = conversation.messages

    const revChanged = lastMainChatSessionRevisionRef.current !== mainChatSessionRevision
    lastMainChatSessionRevisionRef.current = mainChatSessionRevision

    const shouldSyncMessagesFromParent = idChanged || revChanged || parentMessagesIdentityChanged

    let nextMsgs: Message[]
    if (shouldSyncMessagesFromParent) {
      nextMsgs = coerceMessagesList(conversation.messages)
      setMessages(nextMsgs)
      conversationMessagesRef.current = nextMsgs
    } else {
      nextMsgs = coerceMessagesList(messagesRef.current)
      conversationMessagesRef.current = nextMsgs
    }

    /** 教育/医院门户区渲染的是 orgMessages[currentOrg]，与父级 dock 会话 conversation.messages 双轨；从主 VVAI handoff 写入父级后须同步，否则门户内看不到带入的用户指令 */
    const expectedEducationId = stableDockConversationId(
      currentOrg,
      "education",
      hasJoinedOrganizations
    )
    const expectedHospitalId = stableDockConversationId(
      currentOrg,
      "hospital",
      hasJoinedOrganizations
    )
    const expectedPersonalEduId = stableDockConversationId(
      currentOrg,
      PERSONAL_EDU_SPACE_APP_ID,
      hasJoinedOrganizations
    )
    const orgKey = conversation.dockOrgId ?? currentOrg
    if (
      conversation.id === expectedEducationId ||
      conversation.id === expectedHospitalId ||
      conversation.id === expectedPersonalEduId
    ) {
      setOrgMessages((prev) => ({
        ...prev,
        [orgKey]: nextMsgs,
      }))
    }
    if (idChanged || revChanged) {
      setIsPinnedTaskExpanded(true)
      pinnedTaskAllowScrollCollapseRef.current = false
      lastChatScrollTopRef.current = 0
      if (chatScrollContainerRef.current) {
        chatScrollContainerRef.current.scrollTop = 0
      }
    }
    if (idChanged) {
      /** 仅当会话 id 与当前主体下的门户根 dock id 一致时才进入教育/医院壳层；避免仅靠 dockAppId 解析把非门户会话误判为门户，导致无法切到其它应用 */
      if (conversation.id === expectedEducationId) {
        setActiveApp("education")
      } else if (conversation.id === expectedHospitalId) {
        setActiveApp("hospital")
      } else if (conversation.id === expectedPersonalEduId) {
        setActiveApp(PERSONAL_EDU_SPACE_APP_ID)
      } else {
        setActiveApp((a) =>
          a === "education" || a === "hospital" || a === PERSONAL_EDU_SPACE_APP_ID ? null : a
        )
      }
    }
  }, [
    conversation.id,
    conversation.messages,
    mainChatSessionRevision,
    onPersistConversationMessages,
    cuiMainChatId,
    currentOrg,
    hasJoinedOrganizations,
  ])

  React.useLayoutEffect(() => {
    const p = pendingDayJumpRef.current
    if (!p || p.conversationId !== conversation.id) return
    const root = chatScrollContainerRef.current
    if (!root) return
    const mid = p.messageId
    const tryScroll = () => {
      const el = root.querySelector(`[data-cui-message-id="${CSS.escape(mid)}"]`)
      if (el instanceof HTMLElement) {
        el.scrollIntoView({ block: "start", behavior: "smooth" })
        pendingDayJumpRef.current = null
        return true
      }
      return false
    }
    if (!tryScroll()) {
      requestAnimationFrame(() => {
        if (
          pendingDayJumpRef.current?.conversationId === p.conversationId &&
          pendingDayJumpRef.current?.messageId === p.messageId
        ) {
          tryScroll()
        }
      })
    }
  }, [conversation.id, messages, dayJumpNonce])

  React.useEffect(() => {
    onPersistConversationMessages?.(conversation.id, messagesRef.current)
  }, [messages, conversation.id, onPersistConversationMessages])

  /** key=selectedId 时会卸载实例，须把当前会话写回父级 */
  React.useEffect(() => {
    const cid = conversation.id
    return () => {
      onPersistConversationMessages?.(cid, messagesRef.current)
    }
  }, [conversation.id, onPersistConversationMessages])

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, educationMessages])

  /**
   * 首轮「查看今日日程」等：指令 + vv 卡只同步到「日历」dock 会话（不切换选中会话、不改变会话历史侧栏开/收）。
   */
  const mirrorTodayAgendaBootstrap = React.useCallback(
    (raw: string) => {
      const mirror = onMirrorDockConversationRef.current
      if (!mirror) return
      if (isDockConversationId(conversation.id) && getConversationDockAppId(conversation) === "calendar") return
      const text = raw.trim()
      if (!text) return
      const { payload } = planGeneralVvInteraction(text, vvContext, vvFlow)
      const ts = () =>
        new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false })
      const base = Date.now()
      const mirrorUser: Message = {
        id: `mirror-cal-boot-u-${base}`,
        senderId: currentUser.id,
        content: text,
        timestamp: ts(),
        createdAt: base,
      }
      const mirrorBot = vvAssistantMessageFromPayload(payload, conversation.user.id)
      mirrorBot.id = `mirror-cal-boot-a-${base}`
      mirrorBot.timestamp = ts()
      mirrorBot.createdAt = base + 1
      mirror({
        dockAppId: "calendar",
        orgId: currentOrgRef.current,
        hasJoinedOrganizations: organizations.length > 0,
        pairs: [],
        mirrorExtraMessages: [mirrorUser, mirrorBot],
      })
    },
    [conversation.id, conversation.user.id, organizations.length, vvContext, vvFlow]
  )

  /** 后续凡 vv 轮次属日历域：同步到「日历」dock 会话；日历 dock 内不自镜像 */
  const mirrorCalendarRelatedVvRound = React.useCallback(
    (userText: string) => {
      const mirror = onMirrorDockConversationRef.current
      if (!mirror) return
      if (isDockConversationId(conversation.id) && getConversationDockAppId(conversation) === "calendar") return
      const text = userText.trim()
      if (!text) return
      const { payload } = planGeneralVvInteraction(text, vvContext, vvFlow)
      if (!isVvPayloadCalendarConversationSyncDomain(payload)) return
      const ts = () =>
        new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false })
      const base = Date.now()
      const mirrorUser: Message = {
        id: `mirror-cal-u-${base}`,
        senderId: currentUser.id,
        content: text,
        timestamp: ts(),
        createdAt: base,
      }
      const mirrorBot = vvAssistantMessageFromPayload(payload, conversation.user.id)
      mirrorBot.id = `mirror-cal-a-${base}`
      mirrorBot.timestamp = ts()
      mirrorBot.createdAt = base + 1
      mirror({
        dockAppId: "calendar",
        orgId: currentOrgRef.current,
        hasJoinedOrganizations: organizations.length > 0,
        pairs: [],
        mirrorExtraMessages: [mirrorUser, mirrorBot],
      })
    },
    [conversation.id, conversation.user.id, organizations.length, vvContext, vvFlow]
  )

  /** 日程详情侧栏「子对话」内产生的消息（vv 编排 + 底部输入演示回复）同步到「日历」dock 会话历史 */
  const mirrorScheduleSideThreadToCalendar = React.useCallback((msgs: ReadonlyArray<Message>) => {
    const mx = onMirrorDockConversationRef.current
    if (!mx || msgs.length === 0) return
    const base = Date.now()
    const mirrorExtraMessages = msgs.map((msg, idx) => ({
      ...msg,
      id: `mirror-side-cal-${msg.id}-${base}-${idx}`,
      createdAt: base + idx,
    }))
    mx({
      dockAppId: "calendar",
      orgId: currentOrgRef.current,
      hasJoinedOrganizations: organizations.length > 0,
      pairs: [],
      mirrorExtraMessages,
    })
  }, [organizations.length])

  /** 在主 AI / 日程 / 会议 / 课程 / 教育门户等发起员工管理时，将用户指令与卡片同步到「员工」应用 dock 线程 */
  const mirrorEmployeeMgmtToEmployeeApp = React.useCallback(
    (userText: string) => {
      const trimmed = userText.trim()
      if (!trimmed) return
      const mx = onMirrorDockConversationRef.current
      if (!mx) return
      const ts = Date.now()
      const timeStr = new Date().toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
      const userMsg: Message = {
        id: `emp-mirror-u-${ts}`,
        senderId: currentUser.id,
        content: trimmed,
        timestamp: timeStr,
        createdAt: ts,
      }
      const botMsg: Message = {
        id: `emp-mirror-b-${ts}`,
        senderId: conversation.user.id,
        content: EMPLOYEE_MGMT_MARKER,
        timestamp: timeStr,
        createdAt: ts,
        cardAttributionOrgId: currentOrgRef.current,
        cardAttributionDockAppId: "employee",
      }
      mx({
        dockAppId: "employee",
        orgId: currentOrgRef.current,
        hasJoinedOrganizations: organizations.length > 0,
        pairs: [],
        mirrorExtraMessages: [
          { ...userMsg, id: toDockMirrorPeerMessageId(userMsg.id) },
          { ...botMsg, id: toDockMirrorPeerMessageId(botMsg.id) },
        ],
      })
    },
    [conversation.user.id, organizations.length]
  )

  const [employeeInviteRecordsByScope, setEmployeeInviteRecordsByScope] = React.useState<
    Record<string, TeacherInviteRecordModel[]>
  >({})
  const employeeInviteScopeKey = React.useMemo(
    () => `${conversation.id}::${currentOrg}`,
    [conversation.id, currentOrg]
  )
  const employeeInviteRecordsForScope = employeeInviteRecordsByScope[employeeInviteScopeKey] ?? []
  const updateEmployeeInviteRecords = React.useCallback(
    (updater: React.SetStateAction<TeacherInviteRecordModel[]>) => {
      setEmployeeInviteRecordsByScope((prev) => {
        const cur = prev[employeeInviteScopeKey] ?? []
        const next =
          typeof updater === "function"
            ? (updater as (c: TeacherInviteRecordModel[]) => TeacherInviteRecordModel[])(cur)
            : updater
        return { ...prev, [employeeInviteScopeKey]: next }
      })
    },
    [employeeInviteScopeKey]
  )

  const handleScheduleSidePanelIntent = React.useCallback(
    (text: string) => {
      runVvGeneralSend(
        text,
        vvContext,
        (u) => {
          scheduleSideThreadBridgeRef.current?.applyMessagesUpdate(u)
        },
        conversation.user.id,
        vvFlow,
        setVvFlow,
        {
          scheduleBridge: vvScheduleBridge,
          scheduleCalendarPrefsBridge: scheduleCalendarPrefsBridgeRef.current ?? undefined,
        }
      )
    },
    [conversation.user.id, vvContext, vvFlow, vvScheduleBridge]
  )

  /** 非 `guiThen` 包裹、直接追加的日历域 vv 卡：同步单条助手消息到「日历」dock */
  const appendToActiveConversationWithCalendarMirror = React.useCallback(
    (m: Message) => {
      if (secondaryPortalOpen) {
        setEducationMessages((p) => [...p, m])
      } else {
        setMessages((p) => [...p, m])
      }
      if (vvGuiThenDepthRef.current > 0) return
      if (isDockConversationId(conversation.id) && getConversationDockAppId(conversation) === "calendar") return
      if (!m.vvAssistant || !isVvPayloadCalendarConversationSyncDomain(m.vvAssistant)) return
      const mx = onMirrorDockConversationRef.current
      if (!mx) return
      const now = Date.now()
      const clone: Message = {
        ...m,
        id: `mirror-cal-asst-${now}`,
        createdAt: now,
      }
      mx({
        dockAppId: "calendar",
        orgId: currentOrgRef.current,
        hasJoinedOrganizations: organizations.length > 0,
        pairs: [],
        mirrorExtraMessages: [clone],
      })
    },
    [conversation.id, organizations.length, secondaryPortalOpen]
  )

  /**
   * 与 `appendToActiveConversationWithCalendarMirror` 一致：门户区（educationMessages）与主列 `messages` 二轨时，
   * vv 卡片的 `patchAnyMessageById` / `runVvGeneralSend` 等须写入当前可见 transcript，否则「创建」等原地更新不生效。
   */
  const setActiveTranscriptMessages = React.useCallback<React.Dispatch<React.SetStateAction<Message[]>>>(
    (action) => {
      if (secondaryPortalOpen) {
        setEducationMessages(action)
        return
      }
      setMessages(action)
    },
    [secondaryPortalOpen, setEducationMessages]
  )

  const handleSendMessage = (messageOverride?: string) => {
    const raw = (messageOverride ?? inputValue).trim()
    if (!raw) return

    const orgSwitchTarget = parseEmployeeOrgSwitchSendText(raw)
    if (orgSwitchTarget && organizations.some((o) => o.id === orgSwitchTarget)) {
      employeeOrgSwitchHandlerRef.current(orgSwitchTarget)
      return
    }

    /**
     * 教育四身份场景的"主开场 chip"统一汇流：
     * - 主 VVAI 欢迎气泡上的 cuiFollowUpPrompts（来自 `MainAI.buildEduRoleWelcomeMessages`）
     * - 教育门户内主开场 chip（render 1 / render 2 处）
     * - 主 VVAI 静态欢迎卡下方补的 chip 行
     * - 任何用户在输入框打字命中 chip 文案的兜底
     *
     * 命中 `eduFirstEntryCopy.samplePrompts.command` 即拦截清空 inputValue 并交给 `handleEduFirstEntryChip`，
     * 由它走 admin 业务卡 marker / course-pick 选课卡 / direct 结构化回复 三种闭环；
     * 否则继续走原 handleSendMessage 主线（避免误伤其他场景）。
     */
    if (eduSceneRoleId && eduFirstEntryCopy &&
        isEduFirstEntryChipCommand(eduSceneRoleId, raw)) {
      setInputValue("")
      handleEduFirstEntryChip(raw)
      return
    }

    const newUserMessage: Message = {
      id: `new-${Date.now()}`,
      senderId: currentUser.id,
      content: raw,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: Date.now(),
    }

    if (secondaryPortalOpen) {
      const updatedMessages = [...coerceMessagesList(educationMessages), newUserMessage]
      setEducationMessages(updatedMessages)
      setInputValue("")

      if (raw === "创建教育空间") {
        const orgName =
          latestEduCreateOrgSuccessOrgName(coerceMessagesList(educationMessages)) ??
          latestEduCreateOrgSuccessOrgName(coerceMessagesList(messages))
        const fullEdu = shouldOfferFullEducationSpaceCreateFlow(
          scenario,
          hasJoinedOrganizations,
          coerceMessagesList(educationMessages),
          coerceMessagesList(messages)
        )
        if (fullEdu || orgName) {
          setTimeout(() => {
            const ts = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            setEducationMessages((prev) => [
              ...prev,
              {
                id: `edu-space-type-${Date.now()}`,
                senderId: conversation.user.id,
                content: `${EDU_SPACE_TYPE_SELECT_MARKER}:${JSON.stringify({ orgName: orgName ?? undefined })}`,
                timestamp: ts,
                createdAt: Date.now(),
                isAfterPrompt: true,
              },
            ])
            scrollRef.current?.scrollIntoView({ behavior: "smooth" })
          }, 420)
          return
        }
      }

      if (raw === "创建机构教育空间" || raw === "创建家庭教育空间") {
        if (raw === "创建机构教育空间" && organizations.length === 0) {
          setTimeout(() => {
            const ts = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            const botMsg: Message = {
              id: `edu-inst-blocked-${Date.now()}`,
              senderId: conversation.user.id,
              content: EDU_SPACE_INST_BLOCKED_MARKER,
              timestamp: ts,
              createdAt: Date.now(),
              isAfterPrompt: true,
            }
            setEducationMessages((prev) => [...prev, botMsg])
            scrollRef.current?.scrollIntoView({ behavior: "smooth" })
          }, 420)
          return
        }
        const fullEdu = shouldOfferFullEducationSpaceCreateFlow(
          scenario,
          hasJoinedOrganizations,
          coerceMessagesList(educationMessages),
          coerceMessagesList(messages)
        )
        if (fullEdu) {
          const isInst = raw === "创建机构教育空间"
          setTimeout(() => {
            const ts = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            const content = isInst ? EDU_SPACE_INST_FORM_MARKER : EDU_SPACE_FAMILY_ROLE_MARKER
            const botMsg: Message = {
              id: `edu-space-flow-${Date.now()}`,
              senderId: conversation.user.id,
              content,
              timestamp: ts,
              createdAt: Date.now(),
              isAfterPrompt: true,
            }
            setEducationMessages((prev) => [...prev, botMsg])
            scrollRef.current?.scrollIntoView({ behavior: "smooth" })
          }, 420)
          return
        }
        const isInst = raw === "创建机构教育空间"
        setTimeout(() => {
          const ts = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          const cardData = JSON.stringify({
            title: isInst ? "创建机构教育空间" : "创建家庭教育空间",
            description: isInst
              ? "将引导你创建或加入机构类教育主体，并配置教务、商品与财务等能力（演示）。也可在对话中补充校区与学段等信息。"
              : "将引导你创建家庭教育空间，便于成员陪伴、课程与轻量协作（演示）。也可在对话中补充孩子年级与学习目标等信息。",
            detail:
              "1. 确认创建类型与基础信息\n2. 按步骤完成空间初始化\n3. 遇到不懂的问题随时向我提问",
            imageSrc: educationIcon,
            cardActions: {
              primary: {
                label: "按步骤继续",
                sendText: `我要继续完成「${isInst ? "机构" : "家庭"}教育空间」的创建`,
              },
              secondary: { label: "换一个选项", preset: "more_recommend" as const },
            },
          })
          const botMsg: Message = {
            id: `edu-space-entry-${Date.now()}`,
            senderId: conversation.user.id,
            content: `<<<RENDER_GENERIC_CARD>>>:${cardData}`,
            timestamp: ts,
            createdAt: Date.now(),
            isAfterPrompt: true,
          }
          setEducationMessages((prev) => [...prev, botMsg])
          scrollRef.current?.scrollIntoView({ behavior: "smooth" })
        }, 420)
        return
      }

      /** 场景二 / `no-org`：门户「教育」内输入与 dock 教育会话一致，走《应用承接引导》而非欢迎卡 */
      if (
        (isSingleOrgEduAttendanceScenarioFlow(scenario) || isNoOrgRoute) &&
        activeApp === "education" &&
        onIntentDockHandoff
      ) {
        const schoolPortalG =
          matchSchoolScenarioEducationDockAttendanceGuidance(raw) ??
          matchSchoolScenarioEducationDockEmployeeGuidance(raw)
        if (schoolPortalG) {
          const portalOrgId = currentOrgRef.current
          setTimeout(() => {
            const card: Message = {
              id: `school-scene-portal-guidance-${Date.now()}`,
              senderId: "ai-assistant",
              content: `${SCHOOL_SCENE_APP_GUIDANCE_MARKER}:${JSON.stringify(schoolPortalG)}`,
              timestamp: new Date().toLocaleTimeString("zh-CN", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              }),
              createdAt: Date.now(),
              cardAttributionOrgId: portalOrgId,
              cardAttributionDockAppId: schoolPortalG.targetAppId,
            }
            setEducationMessages((prev) => [...prev, card])
            scrollRef.current?.scrollIntoView({ behavior: "smooth" })
          }, 460)
          return
        }
      }

      /** 门户《主CUI交互》输入「查看今日日程」等 → 与日历 dock / 主列一致的 vv 今日日程卡片 */
      if (isTodayScheduleAgendaQuery(raw)) {
        setTimeout(() => {
          runVvGeneralSend(raw, vvContext, setEducationMessages, conversation.user.id, vvFlow, setVvFlow, {
            scheduleBridge: vvScheduleBridge,
            scheduleCalendarPrefsBridge,
            omitUserBubble: true,
          })
          mirrorTodayAgendaBootstrap(raw)
          scrollRef.current?.scrollIntoView({ behavior: "smooth" })
        }, 380)
        return
      }

      /** 教育门户内「员工管理」等：与日历样板一致，出卡并镜像到「员工」应用 */
      if (activeApp === "education" && matchesEmployeeMgmtIntent(raw)) {
        setTimeout(() => {
          const follow = employeeMgmtOrgSwitchFollowUpFields(organizations, currentOrgRef.current)
          const eduEmpOrgId = currentOrgRef.current
          const botMsg: Message = {
            id: `bot-emp-mgmt-edu-${Date.now()}`,
            senderId: conversation.user.id,
            content: EMPLOYEE_MGMT_MARKER,
            timestamp: new Date().toLocaleTimeString("zh-CN", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            }),
            createdAt: Date.now(),
            cardAttributionOrgId: eduEmpOrgId,
            cardAttributionDockAppId: "employee",
            ...(follow ?? {}),
          }
          setEducationMessages((prev) => [...prev, botMsg])
          mirrorEmployeeMgmtToEmployeeApp(raw)
          scrollRef.current?.scrollIntoView({ behavior: "smooth" })
        }, 400)
        return
      }

      setTimeout(() => {
        if (
          activeApp === PERSONAL_EDU_SPACE_APP_ID ||
          (activeApp === "education" && isScenarioZeroNoOrg)
        ) {
          const peMeta = getDockAppMeta("education", scenario)
          const cardData = JSON.stringify({
            title: peMeta.name,
            description:
              isScenarioZeroNoOrg
                ? "我是你的教育助手。你可以说明自己的情况，或点击下方二级入口选择「家长为孩子创建」或「学生为自己创建」。"
                : "我是你的家庭教育助手。你可以说明自己的情况，或点击下方二级入口选择「家长为孩子创建」或「学生为自己创建」。",
            detail:
              "推荐：先点击下方「我是家长…」或「我是学生…」与你的身份一致的一项；随后在对话中补充孩子年级、就读地区或学习目标等。",
            imageSrc: peMeta.imageSrc,
            cardActions: {
              primary: { label: "开始使用", sendText: "我已经准备好了，请开始吧。" },
              secondary: { label: "换一个推荐", preset: "more_recommend" as const },
            },
          })
          const botResponse: Message = {
            id: `bot-${Date.now()}`,
            senderId: conversation.user.id,
            content: `<<<RENDER_GENERIC_CARD>>>:${cardData}`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            createdAt: Date.now(),
          }
          setEducationMessages((prev) => [...prev, botResponse])
          scrollRef.current?.scrollIntoView({ behavior: "smooth" })
          return
        }
        const isHosp = activeApp === "hospital"
        const cardData = JSON.stringify({
          title: isHosp ? "医院助手欢迎您" : "教育助手欢迎您",
          description: isHosp
            ? "我是您的专属医院场景 AI 助手，可协助患者、排班、医疗耗材与床位管理。可直接点击下方二级功能发起办理。"
            : "我是您的专属教育 AI 助手，可协助教学、管理与经营等事务。可直接点击下方二级功能发起办理。",
          detail: isHosp
            ? "推荐：打开「患者管理」「排班管理」等下级菜单发起具体流程。"
            : "推荐：打开「教学」「管理」「经营」下级菜单发起具体流程。",
          imageSrc: isHosp ? meetingIcon : educationIcon,
          cardActions: {
            primary: { label: "开始使用", sendText: "我已经准备好了，请开始吧。" },
            secondary: { label: "换一个推荐", preset: "more_recommend" as const },
          },
        });
        const botResponse: Message = {
          id: `bot-${Date.now()}`,
          senderId: conversation.user.id,
          content: `<<<RENDER_GENERIC_CARD>>>:${cardData}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          createdAt: Date.now()
        }
        setEducationMessages(prev => [...prev, botResponse])
        if (scrollRef.current) scrollRef.current.scrollIntoView({ behavior: "smooth" })
      }, 600)
      return;
    }

    const updatedMessages = [...coerceMessagesList(messages), newUserMessage]
    const rawLower = raw.toLowerCase()
    
    // Check for commands
    const isPersonalInfoCommand = PERSONAL_INFO_COMMANDS.some(cmd => 
      rawLower.includes(cmd.toLowerCase())
    )
    const isCreateEmailCommand = CREATE_EMAIL_COMMANDS.some(cmd => 
      rawLower.includes(cmd.toLowerCase())
    )
    const isCreateOrgCommand = CREATE_ORG_COMMANDS.some(cmd => 
      rawLower.includes(cmd.toLowerCase())
    )
    const isJoinOrgCommand = JOIN_ORG_COMMANDS.some(cmd => 
      rawLower.includes(cmd.toLowerCase())
    )
    const isSwitchOrgCommand = SWITCH_ORG_COMMANDS.some(cmd => 
      rawLower.includes(cmd.toLowerCase())
    )

    const commandMatched =
      isPersonalInfoCommand ||
      isCreateEmailCommand ||
      isCreateOrgCommand ||
      isJoinOrgCommand ||
      isSwitchOrgCommand

    if (isPersonalInfoCommand) {
      const botResponse: Message = attachDockCuiFollowUps(
        {
          id: `bot-${Date.now()}`,
          senderId: conversation.user.id,
          content: PERSONAL_INFO_MARKER,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          createdAt: Date.now(),
        },
        "个人信息与档案管理",
        conversation
      )
      setTimeout(() => {
        setMessages((prev) => [...prev, botResponse])
      }, 500)
    } else if (isCreateEmailCommand) {
      const botResponse: Message = attachDockCuiFollowUps(
        {
          id: `bot-${Date.now()}`,
          senderId: conversation.user.id,
          content: CREATE_EMAIL_MARKER,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          createdAt: Date.now(),
        },
        "企业邮箱创建",
        conversation
      )
      setTimeout(() => {
        setMessages((prev) => [...prev, botResponse])
      }, 500)
    } else if (isCreateOrgCommand) {
      const createMsg: Message = attachDockCuiFollowUps(
        {
          id: `org-create-${Date.now()}`,
          senderId: conversation.user.id,
          content: CREATE_ORG_FORM_MARKER,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          createdAt: Date.now(),
          isAfterPrompt: true,
        },
        "创建组织",
        conversation
      )

      setTimeout(() => {
        setMessages((prev) => [...prev, createMsg])
      }, 500)
    } else if (isJoinOrgCommand) {
      const joinMsg: Message = attachDockCuiFollowUps(
        {
          id: `org-join-${Date.now()}`,
          senderId: conversation.user.id,
          content: JOIN_ORG_FORM_MARKER,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          createdAt: Date.now(),
          isAfterPrompt: true,
        },
        "加入组织",
        conversation
      )

      setTimeout(() => {
        setMessages((prev) => [...prev, joinMsg])
      }, 500)
    } else if (isSwitchOrgCommand) {
      const switchMsg: Message = attachDockCuiFollowUps(
        {
          id: `org-switcher-${Date.now()}`,
          senderId: conversation.user.id,
          content: ORG_SWITCHER_MARKER,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          createdAt: Date.now(),
          isAfterPrompt: true,
        },
        "切换组织",
        conversation
      )

      setTimeout(() => {
        setMessages((prev) => [...prev, switchMsg])
      }, 500)
    }

    if (raw === "创建教育空间" && !commandMatched) {
      const orgName = latestEduCreateOrgSuccessOrgName(coerceMessagesList(messages))
      const fullEdu = shouldOfferFullEducationSpaceCreateFlow(
        scenario,
        hasJoinedOrganizations,
        coerceMessagesList(messages),
        coerceMessagesList(messages)
      )
      if (fullEdu || orgName) {
        setMessages(updatedMessages)
        setInputValue("")
        setTimeout(() => {
          const ts = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          setMessages((prev) => [
            ...prev,
            {
              id: `edu-space-type-${Date.now()}`,
              senderId: conversation.user.id,
              content: `${EDU_SPACE_TYPE_SELECT_MARKER}:${JSON.stringify({ orgName: orgName ?? undefined })}`,
              timestamp: ts,
              createdAt: Date.now(),
              isAfterPrompt: true,
            },
          ])
          scrollRef.current?.scrollIntoView({ behavior: "smooth" })
        }, 420)
        return
      }
    }

    if (!commandMatched && (raw === "创建机构教育空间" || raw === "创建家庭教育空间")) {
      if (raw === "创建机构教育空间" && organizations.length === 0) {
        setMessages(updatedMessages)
        setInputValue("")
        setTimeout(() => {
          const ts = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          setMessages((prev) => [
            ...prev,
            {
              id: `edu-inst-blocked-${Date.now()}`,
              senderId: conversation.user.id,
              content: EDU_SPACE_INST_BLOCKED_MARKER,
              timestamp: ts,
              createdAt: Date.now(),
              isAfterPrompt: true,
            },
          ])
          scrollRef.current?.scrollIntoView({ behavior: "smooth" })
        }, 420)
        return
      }
      if (
        shouldOfferFullEducationSpaceCreateFlow(
          scenario,
          hasJoinedOrganizations,
          coerceMessagesList(messages),
          coerceMessagesList(messages)
        )
      ) {
        setMessages(updatedMessages)
        setInputValue("")
        setTimeout(() => {
          const ts = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          const isInst = raw === "创建机构教育空间"
          const content = isInst ? EDU_SPACE_INST_FORM_MARKER : EDU_SPACE_FAMILY_ROLE_MARKER
          setMessages((prev) => [
            ...prev,
            {
              id: `edu-space-flow-${Date.now()}`,
              senderId: conversation.user.id,
              content,
              timestamp: ts,
              createdAt: Date.now(),
              isAfterPrompt: true,
            },
          ])
          scrollRef.current?.scrollIntoView({ behavior: "smooth" })
        }, 420)
        return
      }
    }

    setMessages(updatedMessages)
    setInputValue("")

    /**
     * 「查看今日日程 / 查询今日日程 …」须先于主 VVAI 的 `matchMainAgentIntent`：
     * 后者含关键词「日程」，否则会误出承接卡片而非 vv「今日日程」卡（与日历 dock 二级一致）。
     */
    if (!secondaryPortalOpen && !commandMatched) {
      const calDock =
        isDockConversationId(conversation.id) && getConversationDockAppId(conversation) === "calendar"
      if (!calDock && isTodayScheduleAgendaQuery(raw)) {
        setTimeout(() => {
          runVvGeneralSend(raw, vvContext, setMessages, conversation.user.id, vvFlow, setVvFlow, {
            scheduleBridge: vvScheduleBridge,
            scheduleCalendarPrefsBridge,
            omitUserBubble: true,
          })
          mirrorTodayAgendaBootstrap(raw)
          scrollRef.current?.scrollIntoView({ behavior: "smooth" })
        }, 380)
        return
      }
    }

    const isMainAgentThread =
      !secondaryPortalOpen &&
      conversation.dockAppId == null &&
      !isDockConversationId(conversation.id)
    /** 底部任意应用 dock 会话（与主 VVAI 并列的《主CUI交互》对话列）；不含教育/医院门户内嵌区 */
    const isDockAppChatThread =
      !secondaryPortalOpen &&
      !commandMatched &&
      (isDockConversationId(conversation.id) || conversation.dockAppId != null)
    /** 主 VVAI 或任意 dock：与「查看今日日程」一致，可出场景卡并镜像到考勤/任务等 */
    const isMainOrDockAssistantThread = isMainAgentThread || isDockAppChatThread

    /**
     * 场景二：教育 dock 内「查看考勤 / 查看员工 / 打开员工列表」须先于 `matchesEmployeeMgmtIntent`（教育 dock 在
     * `EMPLOYEE_MGMT_CARD_APP_IDS` 中，否则会被内嵌员工卡抢先）。
     */
    if (
      !commandMatched &&
      (isSingleOrgEduAttendanceScenarioFlow(scenario) || isNoOrgRoute) &&
      onIntentDockHandoffRef.current &&
      isDockAppChatThread &&
      getConversationDockAppId(conversation) === "education"
    ) {
      const schoolDockEduEarly =
        matchSchoolScenarioEducationDockAttendanceGuidance(raw) ??
        matchSchoolScenarioEducationDockEmployeeGuidance(raw)
      if (schoolDockEduEarly) {
        const dockGuidanceOrgIdEarly =
          conversationDockOrgIdForSessionInteraction(conversation) ?? currentOrgRef.current
        setTimeout(() => {
          const card: Message = {
            id: `school-scene-dock-guidance-${Date.now()}`,
            senderId: "ai-assistant",
            content: `${SCHOOL_SCENE_APP_GUIDANCE_MARKER}:${JSON.stringify(schoolDockEduEarly)}`,
            timestamp: new Date().toLocaleTimeString("zh-CN", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            }),
            createdAt: Date.now(),
            cardAttributionOrgId: dockGuidanceOrgIdEarly,
            cardAttributionDockAppId: schoolDockEduEarly.targetAppId,
          }
          setMessages((prev) => [...prev, card])
          scrollRef.current?.scrollIntoView({ behavior: "smooth" })
        }, 460)
        return
      }
    }

    /** 「员工管理」等：主 VVAI 与可嵌入卡片的 dock 出卡；「员工」应用内仅追加助手气泡（与日历样板一致） */
    if (!commandMatched && matchesEmployeeMgmtIntent(raw)) {
      const empDock = getConversationDockAppId(conversation)
      const inEmployeeCardSurfaceDock =
        isDockAppChatThread && empDock != null && EMPLOYEE_MGMT_CARD_APP_IDS.has(empDock)
      if (isMainAgentThread || inEmployeeCardSurfaceDock || empDock === "employee") {
        setTimeout(() => {
          const ts = new Date().toLocaleTimeString("zh-CN", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })
          const now = Date.now()
          const follow = employeeMgmtOrgSwitchFollowUpFields(organizations, currentOrgRef.current)
          const empOrgId = currentOrgRef.current
          const botMsg: Message = {
            id: `bot-emp-mgmt-${now}`,
            senderId: conversation.user.id,
            content: EMPLOYEE_MGMT_MARKER,
            timestamp: ts,
            createdAt: now,
            cardAttributionOrgId: empOrgId,
            cardAttributionDockAppId: "employee",
            ...(follow ?? {}),
          }
          setMessages((prev) => [...prev, botMsg])
          if (empDock !== "employee") {
            mirrorEmployeeMgmtToEmployeeApp(raw)
          }
          scrollRef.current?.scrollIntoView({ behavior: "smooth" })
        }, 400)
        return
      }
    }

    /** 场景二（多组织）：卡片下推荐「另一组织」— 点击后先切换顶栏主体再出同类型卡 */
    const scenarioTwoMultiAttendanceOtherOrgFollowUp = /^还可以针对「([^」]+)」查看考勤$/
    const scenarioTwoMultiEmployeeOtherOrgFollowUp = /^还可以针对「([^」]+)」查看员工$/
    const scenarioTwoMultiTaskTableOtherOrgFollowUp = /^还可以针对「([^」]+)」打开任务列表$/
    if (
      isScenarioFourOrMainEntry(scenario) &&
      isMainOrDockAssistantThread &&
      !commandMatched
    ) {
      const attendanceFollowMatch = raw.trim().match(scenarioTwoMultiAttendanceOtherOrgFollowUp)
      if (attendanceFollowMatch) {
        const targetName = attendanceFollowMatch[1]!.trim()
        const targetOrg = organizations.find((o) => o.name.trim() === targetName)
        if (targetOrg) {
          if (targetOrg.id !== currentOrg) {
            setCurrentOrg(targetOrg.id)
            setDialogueContentOrgScope(targetOrg.id)
          }
          const otherOrg = organizations.find((o) => o.id !== targetOrg.id)
          const nextFollowUps =
            otherOrg != null ? getScenarioTwoMultiAttendanceStripChipTexts() : undefined
          /** 场景二（多组织）跟进：仅出考勤工作台卡片，无文字引导 */
          setTimeout(() => {
            const ts = () =>
              new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false })
            const now = Date.now()
            const cardId = `scenario-two-attendance-${now + 1}`
            const payload = defaultScenarioTwoAttendanceOverviewPayload()
            const cardContent = `${SCENARIO_TWO_ATTENDANCE_OVERVIEW_MARKER}:${JSON.stringify(payload)}`
            const card: Message = {
              id: cardId,
              senderId: "ai-assistant",
              content: cardContent,
              timestamp: ts(),
              createdAt: now + 1,
              cuiFollowUpPrompts: nextFollowUps,
              cardAttributionOrgId: targetOrg.id,
              cardAttributionDockAppId: "attendance",
            }
            setMessages((prev) => [...prev, card])
            if (getConversationDockAppId(conversation) !== "attendance") {
              const userMirror: Message = {
                id: `mirror-attendance-u-${now}`,
                senderId: currentUser.id,
                content: raw.trim(),
                timestamp: ts(),
                createdAt: now,
              }
              const mirrorCard: Message = {
                ...card,
                id: toDockMirrorPeerMessageId(card.id),
              }
              onMirrorDockConversationRef.current?.({
                dockAppId: "attendance",
                orgId: targetOrg.id,
                hasJoinedOrganizations: organizations.length > 0,
                pairs: [],
                mirrorExtraMessages: [userMirror, mirrorCard],
              })
            }
            scrollRef.current?.scrollIntoView({ behavior: "smooth" })
          }, 460)
          return
        }
      }

      const employeeFollowMatch = raw.trim().match(scenarioTwoMultiEmployeeOtherOrgFollowUp)
      if (employeeFollowMatch) {
        const targetNameEmp = employeeFollowMatch[1]!.trim()
        const targetOrgEmp = organizations.find((o) => o.name.trim() === targetNameEmp)
        if (targetOrgEmp) {
          if (targetOrgEmp.id !== currentOrg) {
            setCurrentOrg(targetOrgEmp.id)
            setDialogueContentOrgScope(targetOrgEmp.id)
          }
          const empLoopFollow = employeeMgmtOrgSwitchFollowUpFields(organizations, targetOrgEmp.id)
          setTimeout(() => {
            const ts = new Date().toLocaleTimeString("zh-CN", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            })
            const now = Date.now()
            const botMsgEmp: Message = {
              id: `bot-emp-mgmt-multi-${now}`,
              senderId: conversation.user.id,
              content: EMPLOYEE_MGMT_MARKER,
              timestamp: ts,
              createdAt: now,
              cardAttributionOrgId: targetOrgEmp.id,
              cardAttributionDockAppId: "employee",
              ...(empLoopFollow ?? {}),
            }
            setMessages((prev) => [...prev, botMsgEmp])
            scrollRef.current?.scrollIntoView({ behavior: "smooth" })
          }, 400)
          return
        }
      }

      const taskFollowMatch = raw.trim().match(scenarioTwoMultiTaskTableOtherOrgFollowUp)
      if (taskFollowMatch) {
        const targetNameTask = taskFollowMatch[1]!.trim()
        const targetOrgTask = organizations.find((o) => o.name.trim() === targetNameTask)
        if (targetOrgTask) {
          if (targetOrgTask.id !== currentOrg) {
            setCurrentOrg(targetOrgTask.id)
            setDialogueContentOrgScope(targetOrgTask.id)
          }
          setTimeout(() => {
            const ts = new Date().toLocaleTimeString("zh-CN", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            })
            const now = Date.now()
            const taskTableOrgId = targetOrgTask.id
            const cardContent = `${TASK_TABLE_MARKER}:${JSON.stringify({ filterHint: "全部任务" })}`
            const botMsg: Message = {
              id: `scenario-task-table-${now}`,
              senderId: "ai-assistant",
              content: cardContent,
              timestamp: ts,
              createdAt: now,
              cardAttributionOrgId: taskTableOrgId,
              cardAttributionDockAppId: "work_task",
            }
            setMessages((prev) => [...prev, botMsg])
            if (getConversationDockAppId(conversation) !== "work_task") {
              const userMirror: Message = {
                id: `mirror-work-task-u-${now}`,
                senderId: currentUser.id,
                content: raw.trim(),
                timestamp: ts,
                createdAt: now,
              }
              const mirrorTable: Message = {
                ...botMsg,
                id: toDockMirrorPeerMessageId(botMsg.id),
              }
              onMirrorDockConversationRef.current?.({
                dockAppId: "work_task",
                orgId: taskTableOrgId,
                hasJoinedOrganizations: organizations.length > 0,
                pairs: [],
                mirrorExtraMessages: [userMirror, mirrorTable],
              })
            }
            scrollRef.current?.scrollIntoView({ behavior: "smooth" })
          }, 460)
          return
        }
      }
    }

    if (
      (isScenarioTwoFamily(scenario) || isMainEntryScenario(scenario) || isNoOrgRoute) &&
      isMainOrDockAssistantThread &&
      !commandMatched &&
      matchesScenarioTwoViewAttendanceIntent(raw)
    ) {
      const attendanceOrgId = currentOrg
      const otherOrgForAttendance = organizations.find((o) => o.id !== attendanceOrgId)
      const attendanceFollowUps =
        isScenarioTwoMultiOrgs(scenario) && otherOrgForAttendance != null
          ? getScenarioTwoMultiAttendanceStripChipTexts()
          : undefined
      setTimeout(() => {
        const ts = () =>
          new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false })
        const now = Date.now()
        const cardId = `scenario-two-attendance-${now + 1}`
        const payload = defaultScenarioTwoAttendanceOverviewPayload()
        const cardContent = `${SCENARIO_TWO_ATTENDANCE_OVERVIEW_MARKER}:${JSON.stringify(payload)}`
        const card: Message = {
          id: cardId,
          senderId: "ai-assistant",
          content: cardContent,
          timestamp: ts(),
          createdAt: now + 1,
          cuiFollowUpPrompts: attendanceFollowUps,
          cardAttributionOrgId: attendanceOrgId,
          cardAttributionDockAppId: "attendance",
        }
        setMessages((prev) => [...prev, card])
        if (getConversationDockAppId(conversation) !== "attendance") {
          const userMirror: Message = {
            id: `mirror-attendance-u-${now}`,
            senderId: currentUser.id,
            content: raw.trim(),
            timestamp: ts(),
            createdAt: now,
          }
          const mirrorCard: Message = {
            ...card,
            id: toDockMirrorPeerMessageId(card.id),
          }
          onMirrorDockConversationRef.current?.({
            dockAppId: "attendance",
            orgId: attendanceOrgId,
            hasJoinedOrganizations: organizations.length > 0,
            pairs: [],
            mirrorExtraMessages: [userMirror, mirrorCard],
          })
        }
        scrollRef.current?.scrollIntoView({ behavior: "smooth" })
      }, 460)
      return
    }

    if (
      (isScenarioTwoFamily(scenario) || isMainEntryScenario(scenario) || isNoOrgRoute) &&
      isMainOrDockAssistantThread &&
      !commandMatched
    ) {
      const t = raw.trim()
      if (t === "补卡申请" || t === "请假申请") {
        const kind = t === "补卡申请" ? "makeup" : "leave"
        setTimeout(() => {
          const ts = () =>
            new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false })
          const now = Date.now()
          const payload = defaultScenarioTwoAttendanceSupplementPayload(kind)
          const content = `${SCENARIO_TWO_ATTENDANCE_SUPPLEMENT_MARKER}:${JSON.stringify(payload)}`
          const supplementOrgId = currentOrgRef.current
          const botMsg: Message = {
            id: `scenario-two-att-supplement-${now}`,
            senderId: "ai-assistant",
            content,
            timestamp: ts(),
            createdAt: now,
            cardAttributionOrgId: supplementOrgId,
            cardAttributionDockAppId: "attendance",
          }
          setMessages((prev) => [...prev, botMsg])
          const orgId = supplementOrgId
          const userMirror: Message = {
            id: `mirror-att-sup-u-${now}`,
            senderId: currentUser.id,
            content: t,
            timestamp: ts(),
            createdAt: now,
          }
          const mirrorCard: Message = {
            ...botMsg,
            id: toDockMirrorPeerMessageId(botMsg.id),
          }
          if (getConversationDockAppId(conversation) !== "attendance") {
            onMirrorDockConversationRef.current?.({
              dockAppId: "attendance",
              orgId,
              hasJoinedOrganizations: organizations.length > 0,
              pairs: [],
              mirrorExtraMessages: [userMirror, mirrorCard],
            })
          }
          scrollRef.current?.scrollIntoView({ behavior: "smooth" })
        }, 420)
        return
      }
    }

    if (
      (isSingleOrgEduAttendanceScenarioFlow(scenario) ||
        isMainEntryScenario(scenario) ||
        isNoOrgRoute) &&
      !commandMatched &&
      !secondaryPortalOpen
    ) {
      if (raw.trim() === "打开任务列表" && isMainOrDockAssistantThread) {
        setTimeout(() => {
          const ts = new Date().toLocaleTimeString("zh-CN", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })
          const now = Date.now()
          const taskTableOrgId = currentOrgRef.current
          const cardContent = `${TASK_TABLE_MARKER}:${JSON.stringify({ filterHint: "全部任务" })}`
          const botMsg: Message = {
            id: `scenario-task-table-${now}`,
            senderId: "ai-assistant",
            content: cardContent,
            timestamp: ts,
            createdAt: now,
            cardAttributionOrgId: taskTableOrgId,
            cardAttributionDockAppId: "work_task",
          }
          setMessages((prev) => [...prev, botMsg])
          if (getConversationDockAppId(conversation) !== "work_task") {
            const userMirror: Message = {
              id: `mirror-work-task-u-${now}`,
              senderId: currentUser.id,
              content: "打开任务列表",
              timestamp: ts,
              createdAt: now,
            }
            const mirrorTable: Message = {
              ...botMsg,
              id: toDockMirrorPeerMessageId(botMsg.id),
            }
            onMirrorDockConversationRef.current?.({
              dockAppId: "work_task",
              orgId: taskTableOrgId,
              hasJoinedOrganizations: organizations.length > 0,
              pairs: [],
              mirrorExtraMessages: [userMirror, mirrorTable],
            })
          }
          scrollRef.current?.scrollIntoView({ behavior: "smooth" })
        }, 460)
        return
      }
      if (isMainAgentThread) {
        const schoolG = matchSchoolScenarioMainCuiGuidance(raw)
        if (schoolG) {
          const rawTrim = raw.trim()
          const otherOrgForSchoolMulti =
            isScenarioTwoMultiOrgs(scenario) && organizations.length > 1
              ? organizations.find((o) => o.id !== currentOrg)
              : undefined
          const schoolMultiFollowUps =
            otherOrgForSchoolMulti != null &&
            (rawTrim === "查看考勤" || rawTrim === "查看A老师的考勤")
              ? [`还可以针对「${otherOrgForSchoolMulti.name.trim()}」查看考勤`]
              : otherOrgForSchoolMulti != null &&
                  (rawTrim === "查看员工" || rawTrim === "打开员工列表")
                ? [`还可以针对「${otherOrgForSchoolMulti.name.trim()}」查看员工`]
                : undefined
          setTimeout(() => {
            const card: Message = {
              id: `school-scene-guidance-${Date.now()}`,
              senderId: "ai-assistant",
              content: `${SCHOOL_SCENE_APP_GUIDANCE_MARKER}:${JSON.stringify(schoolG)}`,
              timestamp: new Date().toLocaleTimeString("zh-CN", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              }),
              createdAt: Date.now(),
              cardAttributionOrgId: currentOrg,
              cardAttributionDockAppId: schoolG.targetAppId,
              ...(schoolMultiFollowUps ? { cuiFollowUpPrompts: schoolMultiFollowUps } : {}),
            }
            setMessages((prev) => [...prev, card])
            scrollRef.current?.scrollIntoView({ behavior: "smooth" })
          }, 460)
          return
        }
      }
    }

    if (isCuiCardRulesScenario(scenario) && isMainAgentThread && !commandMatched) {
      const hit = matchCuiCardRulesDemo(raw)
      const delay = 440
      const tsNow = () =>
        new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false })
      const withFollow = (partial: Omit<Message, "timestamp" | "createdAt">): Message => ({
        ...partial,
        timestamp: tsNow(),
        createdAt: Date.now(),
        cuiFollowUpPrompts: demoFollowUpPrompts(),
      })
      if (hit.kind === "meeting_edit") {
        setTimeout(() => {
          const row = createMeetingCardMessage("edit")
          setMessages((prev) => [
            ...prev,
            withFollow({
              id: row.id,
              senderId: conversation.user.id,
              content: row.content,
            }),
          ])
          scrollRef.current?.scrollIntoView({ behavior: "smooth" })
        }, delay)
      } else if (hit.kind === "meeting_create") {
        setTimeout(() => {
          const row = createMeetingCardMessage("create")
          setMessages((prev) => [
            ...prev,
            withFollow({
              id: row.id,
              senderId: conversation.user.id,
              content: row.content,
            }),
          ])
          scrollRef.current?.scrollIntoView({ behavior: "smooth" })
        }, delay)
      } else if (hit.kind === "meeting_ui") {
        setTimeout(() => {
          const payload = buildMeetingPayloadWithUi({
            datePickerOpen: hit.datePickerOpen,
            contactsPopoverOpen: hit.contactsPopoverOpen,
            confirmBeforeSave: hit.confirmBeforeSave,
          })
          setMessages((prev) => [
            ...prev,
            withFollow({
              id: `cui-schedule-ui-${Date.now()}`,
              senderId: conversation.user.id,
              content: serializeCuiRulesPayload(payload),
            }),
          ])
          scrollRef.current?.scrollIntoView({ behavior: "smooth" })
        }, delay)
      } else {
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            withFollow({
              id: `cui-nl-${Date.now()}`,
              senderId: "ai-assistant",
              content: hit.content,
            }),
          ])
          scrollRef.current?.scrollIntoView({ behavior: "smooth" })
        }, delay)
      }
      return
    }

    if (isMainAgentThread && !commandMatched) {
      const intentMatch = matchMainAgentIntent(raw)
      if (intentMatch) {
        if (isScenarioTwoFamily(scenario) || isNoOrgRoute) {
          const bundle = buildScenarioTwoMainThreadDockBundle(
            raw,
            intentMatch.appId,
            conversation,
            currentOrgRef.current
          )
          setTimeout(() => {
            setMessages((prev) => [...prev, ...bundle.mainMessages])
            onMirrorDockConversationRef.current?.({
              dockAppId: bundle.mirrorDockAppId,
              orgId: currentOrgRef.current,
              hasJoinedOrganizations: organizations.length > 0,
              pairs: bundle.mirrorPairs,
              mirrorExtraMessages: bundle.mirrorExtras,
            })
            scrollRef.current?.scrollIntoView({ behavior: "smooth" })
          }, 520)
          return
        }
        if (onIntentDockHandoff) {
          setTimeout(() => {
            const payload = JSON.stringify({
              appId: intentMatch.appId,
              appName: intentMatch.appName,
              intentLabel: intentMatch.intentLabel,
              cardTitle: intentMatch.cardTitle,
              confirmLine: intentMatch.confirmLine,
              handoffLine: intentMatch.handoffLine,
              carryOverText: intentMatch.carryOverText,
            })
            const botCard: Message = attachDockCuiFollowUps(
              {
                id: `intent-handoff-${Date.now()}`,
                senderId: conversation.user.id,
                content: `${INTENT_HANDOFF_MARKER}:${payload}`,
                timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                createdAt: Date.now(),
                cardAttributionOrgId: currentOrgRef.current,
                cardAttributionDockAppId: intentMatch.appId,
              },
              `${intentMatch.appName}：${intentMatch.intentLabel}`,
              conversation,
              { appId: intentMatch.appId, matchedPhrase: intentMatch.intentLabel }
            )
            setMessages((prev) => [...prev, botCard])
            if (scrollRef.current) scrollRef.current.scrollIntoView({ behavior: "smooth" })
          }, 520)
          return
        }
      } else if (isScenarioTwoFamily(scenario) || isNoOrgRoute) {
        const bundle = buildScenarioTwoMainThreadDockBundle(
          raw,
          "education",
          conversation,
          currentOrgRef.current
        )
        setTimeout(() => {
          setMessages((prev) => [...prev, ...bundle.mainMessages])
          onMirrorDockConversationRef.current?.({
            dockAppId: bundle.mirrorDockAppId,
            orgId: currentOrgRef.current,
            hasJoinedOrganizations: organizations.length > 0,
            pairs: bundle.mirrorPairs,
            mirrorExtraMessages: bundle.mirrorExtras,
          })
          scrollRef.current?.scrollIntoView({ behavior: "smooth" })
        }, 520)
        return
      }
    }

    const isDockSession = isDockConversationId(conversation.id)
    if (isDockSession && !commandMatched) {
      const dockIdEarly = getConversationDockAppId(conversation)
      if (dockIdEarly === "employee") {
        if (matchesScheduleToolbarQuickIntent(raw)) {
          setTimeout(() => {
            runVvGeneralSend(raw, vvContext, setMessages, conversation.user.id, vvFlow, setVvFlow, {
              scheduleBridge: vvScheduleBridge,
              scheduleCalendarPrefsBridge,
              omitUserBubble: true,
            })
            scrollRef.current?.scrollIntoView({ behavior: "smooth" })
          }, 380)
          return
        }
        setTimeout(() => {
          const ts = new Date().toLocaleTimeString("zh-CN", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })
          const botMsg: Message = {
            id: `bot-emp-dock-${Date.now()}`,
            senderId: conversation.user.id,
            content: `${getDockAppMeta("employee").name} 功能对话已同步，后续菜单我可以继续接入。`,
            timestamp: ts,
            createdAt: Date.now(),
          }
          setMessages((prev) => [...prev, botMsg])
          scrollRef.current?.scrollIntoView({ behavior: "smooth" })
        }, 400)
        return
      }

      const teachingGradeFlow =
        isTeachingDockConversation(conversation) && matchTeachingStudentGradeQuery(raw)
      if (teachingGradeFlow) {
        const extracted = extractStudentNameFromGradeQuery(raw)
        const displayName = extracted ?? "该学生"
        const gradePayload = buildMockTeachingGradePayload(displayName)
        const gradeFlowNow = Date.now()
        setTimeout(() => {
          const cmdMsg: Message = {
            id: `teaching-grade-cmd-${gradeFlowNow}`,
            senderId: conversation.user.id,
            content: `【业务指令】我要查看学生「${displayName}」的成绩与学业概况。`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            createdAt: gradeFlowNow,
          }
          setMessages((prev) => [...prev, cmdMsg])
          if (scrollRef.current) scrollRef.current.scrollIntoView({ behavior: "smooth" })
        }, 380)
        setTimeout(() => {
            const teachingOrgId =
              conversationDockOrgIdForSessionInteraction(conversation) ?? currentOrgRef.current
            const cardMsg: Message = attachDockCuiFollowUps(
              {
                id: `teaching-grade-card-${gradeFlowNow + 1}`,
                senderId: conversation.user.id,
                content: `${TEACHING_STUDENT_GRADE_MARKER}:${JSON.stringify(gradePayload)}`,
                timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                createdAt: gradeFlowNow + 1,
                cardAttributionOrgId: teachingOrgId,
                cardAttributionDockAppId: "teaching",
              },
              `学生「${displayName}」成绩与学业概况`,
              conversation,
              { appId: "teaching", matchedPhrase: `查询「${displayName}」成绩` }
            )
            setMessages((prev) => [...prev, cardMsg])
            if (scrollRef.current) scrollRef.current.scrollIntoView({ behavior: "smooth" })
          }, 680)
      } else {
        /** 非业务自然语言：与全局业务指令、vv 结构化编排均无关 → 当前应用内通用说明，并同步主 VVAI 时间线 */
        const dockAppIdForNl = getConversationDockAppId(conversation)
        const isNonBusinessNlDockTurn =
          Boolean(dockAppIdForNl) &&
          !hasAnyGlobalDockBusinessIntent(raw) &&
          planIsDemoCatalogFallback(raw, vvContext, vvFlow)
        if (isNonBusinessNlDockTurn) {
          const appLabel = dockAppIdForNl ? getDockAppMeta(dockAppIdForNl, scenario).name : "应用"
          const assistantBody = buildDockNonBusinessNlAssistantBody(raw, appLabel)
          setTimeout(() => {
            const ts = new Date().toLocaleTimeString("zh-CN", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            })
            const now = Date.now()
            const botMsg: Message = {
              id: `dock-nb-nl-${now}`,
              senderId: conversation.user.id,
              content: assistantBody,
              timestamp: ts,
              createdAt: now,
            }
            setMessages((prev) => [...prev, botMsg])
            onAppendMainVvaiNonBusinessMirrorRef.current?.({
              userText: raw,
              assistantText: assistantBody,
              sourceAppName: appLabel,
            })
            scrollRef.current?.scrollIntoView({ behavior: "smooth" })
          }, 380)
          return
        }

        /** 各 dock 应用会话：与「日历」一致统一走《VV 助手》编排（scheduleBridge、日历偏好与主列一致） */
        setTimeout(() => {
          runVvGeneralSend(raw, vvContext, setMessages, conversation.user.id, vvFlow, setVvFlow, {
            scheduleBridge: vvScheduleBridge,
            scheduleCalendarPrefsBridge,
            omitUserBubble: true,
          })
          scrollRef.current?.scrollIntoView({ behavior: "smooth" })
        }, 380)
        return
      }
    }
  }

  handleSendMessageRef.current = handleSendMessage

  const handleCalendarDockVvAction = React.useMemo(
    () =>
      createCalendarDockVvActionHandler({
        aiSenderId: conversation.user.id,
        vvContext,
        vvFlow,
        vvScheduleItems,
        vvMeetingItems,
        vvRecordItems,
        vvTodoItems,
        vvMailItems,
        vvDriveItems,
        vvDocItems,
        setVvFlow,
        setVvScheduleItems,
        setVvMeetingItems,
        setVvTodoItems,
        vvScheduleBridge,
        setMessages: setActiveTranscriptMessages,
        appendToActiveConversation: appendToActiveConversationWithCalendarMirror,
        openScheduleSideSheet,
        scheduleSideThreadBridgeRef,
        handleSendMessage,
        scheduleCalendarPrefsBridge,
        mirrorCalendarVvRound: mirrorCalendarRelatedVvRound,
        vvGuiThenDepthRef,
        scheduleCalendarPrefsBridgeRef,
        calendarTypesBridgeRef,
        subscribedColleagueBridgeRef,
      }),
    [
      appendToActiveConversationWithCalendarMirror,
      conversation.user.id,
      handleSendMessage,
      mirrorCalendarRelatedVvRound,
      setActiveTranscriptMessages,
      scheduleCalendarPrefsBridge,
      vvContext,
      vvFlow,
      vvScheduleItems,
      vvMeetingItems,
      vvRecordItems,
      vvTodoItems,
      vvMailItems,
      vvDriveItems,
      vvDocItems,
      vvScheduleBridge,
      openScheduleSideSheet,
    ]
  )

  const handleEmailFormSubmit = (msgId: string, data: any) => {
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isReadonly: true, formData: data } : m))
    
    setTimeout(() => {
      const successMsg: Message = attachDockCuiFollowUps(
        {
          id: `bot-success-${Date.now()}`,
          senderId: conversation.user.id,
          content: `业务邮箱 ${data.emailPrefix}${data.domain} 创建成功，并已分配给 ${data.members.join("、")}。`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          createdAt: Date.now(),
          isAfterPrompt: true,
        },
        `业务邮箱 ${data.emailPrefix}${data.domain} 创建成功`,
        conversation
      )
      const continueMsg: Message = {
        id: `bot-continue-${Date.now()+1}`,
        senderId: conversation.user.id,
        content: CONTINUE_EMAIL_MARKER,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdAt: Date.now() + 1
      }
      setMessages(prev => [...prev, successMsg, continueMsg])
    }, 600)
  }

  const handleContinueCreateEmail = () => {
    const newFormMsg: Message = {
      id: `bot-${Date.now()}`,
      senderId: conversation.user.id,
      content: CREATE_EMAIL_MARKER,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: Date.now(),
      isAfterPrompt: true
    }
    setMessages(prev => [...prev, newFormMsg])
  }

  // Organization handlers
  const handleOrgClick = () => {
    const orgSwitcherMsg: Message = {
      id: `org-switcher-${Date.now()}`,
      senderId: conversation.user.id,
      content: ORG_SWITCHER_MARKER,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: Date.now(),
      isAfterPrompt: false
    };
    
    setEducationMessages(prev => [...prev, orgSwitcherMsg]);
    
    setTimeout(() => {
      if (scrollRef.current) scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleOrgSwitch = (orgId: string) => {
    const selectedOrg = organizations.find(o => o.id === orgId);
    if (!selectedOrg) return;
    
    setCurrentOrg(orgId)
    if (isScenarioFourOrMainEntry(scenario)) {
      setDialogueContentOrgScope(orgId)
    }
  };

  const resolvedOrgNameForEmployeeStrip = React.useMemo(
    () => organizations.find((o) => o.id === currentOrg)?.name ?? "当前组织",
    [organizations, currentOrg]
  )

  const handleMainAiEmployeeCardSwitchOrg = React.useCallback(
    (targetOrgId: string) => {
      if (targetOrgId === currentOrg) return
      if (!organizations.some((o) => o.id === targetOrgId)) return
      setCurrentOrg(targetOrgId)
      if (isScenarioFourOrMainEntry(scenario)) {
        setDialogueContentOrgScope(targetOrgId)
      }
      const ts = Date.now()
      const timeStr = new Date().toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
      const userText = "员工管理"
      const userMsg: Message = {
        id: `main-emp-org-sw-u-${ts}`,
        senderId: currentUser.id,
        content: userText,
        timestamp: timeStr,
        createdAt: ts,
      }
      const follow = employeeMgmtOrgSwitchFollowUpFields(organizations, targetOrgId)
      const botMsg: Message = {
        id: `main-emp-org-sw-b-${ts}`,
        senderId: conversation.user.id,
        content: EMPLOYEE_MGMT_MARKER,
        timestamp: timeStr,
        createdAt: ts,
        cardAttributionOrgId: targetOrgId,
        cardAttributionDockAppId: "employee",
        ...(follow ?? {}),
      }
      window.queueMicrotask(() => {
        if (secondaryPortalOpen) {
          setEducationMessages((prev) => [...prev, userMsg, botMsg])
        } else {
          setMessages((prev) => [...prev, userMsg, botMsg])
        }
        onMirrorDockConversationRef.current?.({
          dockAppId: "employee",
          orgId: targetOrgId,
          hasJoinedOrganizations: organizations.length > 0,
          pairs: [],
          mirrorExtraMessages: [
            { ...userMsg, id: toDockMirrorPeerMessageId(userMsg.id) },
            {
              ...botMsg,
              id: toDockMirrorPeerMessageId(botMsg.id),
              cuiFollowUpPrompts: undefined,
              cuiFollowUpSendTexts: undefined,
            },
          ],
        })
        window.requestAnimationFrame(() => {
          scrollRef.current?.scrollIntoView({ behavior: "smooth" })
        })
      })
    },
    [
      conversation.user.id,
      currentOrg,
      organizations,
      scenario,
      secondaryPortalOpen,
      setEducationMessages,
      setMessages,
    ]
  )

  employeeOrgSwitchHandlerRef.current = handleMainAiEmployeeCardSwitchOrg

  /** 顶栏组织：主 VVAI / 个人应用仅改信息筛选；组织型应用切换即换主体与会话 */
  const handleNavBarOrgSelect = React.useCallback(
    (orgId: string) => {
      if (isNavContentScopeMode) {
        if (!organizations.some((o) => o.id === orgId)) return
        setDialogueContentOrgScope(orgId)
        return
      }
      const selectedOrg = organizations.find((o) => o.id === orgId)
      if (!selectedOrg) return
      setCurrentOrg(orgId)
      if (isScenarioFourOrMainEntry(scenario)) {
        setDialogueContentOrgScope(orgId)
      }
    },
    [isNavContentScopeMode, organizations, scenario]
  )

  const handleCreateOrg = () => {
    const createMsg: Message = {
      id: `org-create-${Date.now()}`,
      senderId: conversation.user.id,
      content: CREATE_ORG_FORM_MARKER,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: Date.now(),
      isAfterPrompt: true
    };
    
    if (secondaryPortalOpen) {
      setEducationMessages(prev => [...prev, createMsg]);
    } else {
      setMessages(prev => [...prev, createMsg]);
    }
  };

  const handleJoinOrg = () => {
    const joinMsg: Message = {
      id: `org-join-${Date.now()}`,
      senderId: conversation.user.id,
      content: JOIN_ORG_FORM_MARKER,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: Date.now(),
      isAfterPrompt: true
    };
    
    if (secondaryPortalOpen) {
      setEducationMessages(prev => [...prev, joinMsg]);
    } else {
      setMessages(prev => [...prev, joinMsg]);
    }
  };

  const handleModelSwitch = (modelId: string) => {
    const selectedModel = AVAILABLE_MODELS.find(m => m.id === modelId);
    if (!selectedModel) return;
    
    setCurrentModel(modelId);
    
    console.log(`已切换到模型：${selectedModel.name}`);
  };

  /** 主会话区向下滚动时收起顶部《PinnedTaskCard》（主 VVAI、个人应用、教育/医院门户等共用该区域） */
  const handleChatScroll = React.useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      if (
        isMainCuiStandaloneWindow &&
        conversation.id === cuiMainChatId &&
        messages.length === 0
      ) {
        return;
      }
      const currentTop = event.currentTarget.scrollTop;
      if (!isPinnedTaskExpanded) {
        lastChatScrollTopRef.current = currentTop;
        return;
      }

      const delta = currentTop - lastChatScrollTopRef.current;
      const isScrollingDown = delta > 0;

      if (
        pinnedTaskAllowScrollCollapseRef.current &&
        isScrollingDown &&
        currentTop > 48
      ) {
        setIsPinnedTaskExpanded(false);
      }

      lastChatScrollTopRef.current = currentTop;
    },
    [
      isMainCuiStandaloneWindow,
      conversation.id,
      cuiMainChatId,
      messages.length,
      isPinnedTaskExpanded,
    ]
  );

  React.useLayoutEffect(() => {
    const root = chatScrollContainerRef.current;
    if (!root) return;

    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > 0.5) pinnedTaskAllowScrollCollapseRef.current = true;
    };

    let touchStartY: number | null = null;
    const onTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0]?.clientY ?? null;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (touchStartY == null || !e.touches[0]) return;
      const y = e.touches[0].clientY;
      if (touchStartY - y > 8) pinnedTaskAllowScrollCollapseRef.current = true;
    };
    const onTouchEnd = () => {
      touchStartY = null;
    };

    root.addEventListener("wheel", onWheel, { passive: true });
    root.addEventListener("touchstart", onTouchStart, { passive: true });
    root.addEventListener("touchmove", onTouchMove, { passive: true });
    root.addEventListener("touchend", onTouchEnd, { passive: true });
    root.addEventListener("touchcancel", onTouchEnd, { passive: true });
    return () => {
      root.removeEventListener("wheel", onWheel);
      root.removeEventListener("touchstart", onTouchStart);
      root.removeEventListener("touchmove", onTouchMove);
      root.removeEventListener("touchend", onTouchEnd);
      root.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [conversation.id, mainChatSessionRevision, activeApp]);

  const handlePinnedTaskExpandedChange = React.useCallback((expanded: boolean) => {
    setIsPinnedTaskExpanded(expanded);
    if (expanded) pinnedTaskAllowScrollCollapseRef.current = false;
  }, []);

  const handleCreateOrgSubmit = (orgData: { 
    country: string;
    industry: string;
    fullName: string;
    shortName: string;
    logo?: File;
    address: string;
    email: string;
    phoneCode: string;
    phone: string;
    description: string;
  }, isEducationContext?: boolean) => {
    // 模拟创建新组织
    const newOrgId = `org-${Date.now()}`;
    
    const isEducationIndustry = orgData.industry.trim() === "教育行业"
    const newOrg: Organization = {
      id: newOrgId,
      name: orgData.shortName || orgData.fullName,
      icon: orgIcon,
      memberCount: 1,
      description: orgData.description || `${orgData.industry}企业，位于${orgData.country}`,
      kind: isEducationIndustry || isEducationContext ? "education" : "general",
    }

    setOrganizations((prev) => [...prev, newOrg])

    setCurrentOrg(newOrgId)

    const successData = JSON.stringify({
      orgId: newOrgId,
      orgName: orgData.shortName || orgData.fullName,
      fullName: orgData.fullName,
      country: orgData.country,
      industry: orgData.industry,
      address: orgData.address,
      email: orgData.email,
      phone: `${orgData.phoneCode} ${orgData.phone}`,
      description: orgData.description,
      memberCount: 1,
      isEducationIndustry,
    })
    
    const successMsg: Message = attachDockCuiFollowUps(
      {
        id: `org-create-success-${Date.now()}`,
        senderId: conversation.user.id,
        content: `${CREATE_ORG_SUCCESS_MARKER}:${successData}`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        createdAt: Date.now(),
        isAfterPrompt: true,
      },
      `组织「${orgData.shortName || orgData.fullName}」创建成功`,
      conversation
    )

    if (isEducationContext) {
      setEducationMessages((prev) => [...prev, successMsg])
    } else {
      setMessages((prev) => [...prev, successMsg])
    }
    
    setTimeout(() => {
      if (scrollRef.current) scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleJoinOrgSubmit = (inviteCode: string, isEducationContext?: boolean) => {
    // 模拟邀请码验证
    const validCodes: Record<string, { orgId: string; orgName: string }> = {
      'XIAOCE2024': { orgId: 'xiaoce', orgName: '小测教育机构' },
      'DEFAULT001': { orgId: 'default', orgName: '默认组织' },
      'TEST123': { orgId: 'test', orgName: '测试机构' }
    };
    
    const matchedOrg = validCodes[inviteCode.toUpperCase()]

    if (matchedOrg) {
      const targetOrg =
        organizations.find((o) => o.id === matchedOrg.orgId) ??
        JOIN_INVITE_CODE_ORGANIZATIONS[matchedOrg.orgId]

      if (targetOrg) {
        const confirmData = JSON.stringify({
          orgId: targetOrg.id,
          orgName: targetOrg.name,
          orgIcon: targetOrg.icon,
          memberCount: targetOrg.memberCount,
          description: targetOrg.description,
        })

        const confirmMsg: Message = attachDockCuiFollowUps(
          {
            id: `org-join-confirm-${Date.now()}`,
            senderId: conversation.user.id,
            content: `${JOIN_ORG_CONFIRM_MARKER}:${confirmData}`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            createdAt: Date.now(),
            isAfterPrompt: true,
          },
          `加入组织「${targetOrg.name}」确认`,
          conversation
        )

        if (isEducationContext) {
          setEducationMessages((prev) => [...prev, confirmMsg])
        } else {
          setMessages((prev) => [...prev, confirmMsg])
        }
      } else {
        const errorMsg: Message = attachDockCuiFollowUps(
          {
            id: `org-join-error-${Date.now()}`,
            senderId: conversation.user.id,
            content: `邀请码「${inviteCode}」暂无法解析为可加入的组织，请更换邀请码或联系管理员。`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            createdAt: Date.now(),
            isAfterPrompt: true,
          },
          `邀请码校验未通过`,
          conversation
        )
        if (isEducationContext) {
          setEducationMessages((prev) => [...prev, errorMsg])
        } else {
          setMessages((prev) => [...prev, errorMsg])
        }
      }
    } else {
      // 邀请码无效
      const errorMsg: Message = attachDockCuiFollowUps(
        {
          id: `org-join-error-${Date.now()}`,
          senderId: conversation.user.id,
          content: `邀请码「${inviteCode}」无效或已过期，请检查后重试。您可以联系组织管理员获取有效的邀请码。`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          createdAt: Date.now(),
          isAfterPrompt: true,
        },
        `邀请码校验未通过`,
        conversation
      )

      if (isEducationContext) {
        setEducationMessages((prev) => [...prev, errorMsg])
      } else {
        setMessages((prev) => [...prev, errorMsg])
      }
    }
    
    setTimeout(() => {
      if (scrollRef.current) scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleConfirmJoinOrg = (orgId: string, isEducationContext?: boolean) => {
    const existing = organizations.find((o) => o.id === orgId)
    const invited = JOIN_INVITE_CODE_ORGANIZATIONS[orgId]
    const targetOrg = existing ?? invited
    if (!targetOrg) return

    if (!existing) {
      setOrganizations((prev) => (prev.some((o) => o.id === orgId) ? prev : [...prev, targetOrg]))
    }

    setCurrentOrg(orgId)
    
    // 显示加入成功消息
    const successMsg: Message = attachDockCuiFollowUps(
      {
        id: `org-join-success-${Date.now()}`,
        senderId: conversation.user.id,
        content: `欢迎加入「${targetOrg.name}」！您现在可以访问该组织的所有资源，并与 ${targetOrg.memberCount} 位成员协作。`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        createdAt: Date.now(),
        isAfterPrompt: true,
      },
      `已加入组织「${targetOrg.name}」`,
      conversation
    )

    if (isEducationContext) {
      setEducationMessages((prev) => [...prev, successMsg])
    } else {
      setMessages((prev) => [...prev, successMsg])
    }
    
    setTimeout(() => {
      if (scrollRef.current) scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleNewConversation = () => {
    if (onNewMainChat) {
      onNewMainChat()
      return
    }
    setMessages([])
  }

  const handleSecondaryAppNewConversation = () => {
    // Clear education messages for new conversation
    setEducationMessages([]);
    setSecondaryHistoryOpen(false);
  }

  const handleSecondarySessionSelect = (sessionId: string) => {
    setSelectedSecondarySession(sessionId);
    // Here you would load the messages for that session
    // For now, we'll just log it
    console.log('Selected secondary app session:', sessionId);
  }

  const handleJumpToConversationDay = React.useCallback(
    (conversationId: string, messageId: string) => {
      pendingDayJumpRef.current = { conversationId, messageId }
      if (conversationId !== selectedId) {
        applyPrimarySessionListSelection(conversationId)
      }
      setDayJumpNonce((n) => n + 1)
    },
    [selectedId, applyPrimarySessionListSelection]
  )

  /** 侧栏点选 VVAI 历史：恢复会话并切回主会话 id，便于列表与主区一致 */
  const handleSidebarMainHistorySelect = React.useCallback(
    (entryId: string) => {
      if (!onSelectMainChatHistoryEntry) return
      if (secondaryPortalOpen) {
        setActiveApp(null)
      }
      onSelectMainChatHistoryEntry(entryId)
      onSelect?.(cuiMainChatId)
    },
    [onSelectMainChatHistoryEntry, onSelect, cuiMainChatId, secondaryPortalOpen]
  )

  const renderMessageList = (messagesList: Message[], isEducationContext: boolean) => {
    const transcriptDockAppId: string | null = isEducationContext
      ? "education"
      : getConversationDockAppId(conversation)
    const canRenderEmployeeMgmtCard =
      transcriptDockAppId == null || EMPLOYEE_MGMT_CARD_APP_IDS.has(transcriptDockAppId)

    const renderDockFollowUpStrip = (m: Message) => {
      if (!m.cuiFollowUpPrompts?.length) return null
      return (
        <DockCuiFollowUpStrip
          prompts={m.cuiFollowUpPrompts}
          sendTexts={m.cuiFollowUpSendTexts}
          onSend={(text) => handleSendMessage(text)}
          className="mt-[var(--space-200)] w-full max-w-full"
        />
      )
    }

    const pushUserThenBot = (userLine: string, botContent: string) => {
      const stamp = () =>
        new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      const append = isEducationContext ? setEducationMessages : setMessages
      const uid = `cui-pair-u-${Date.now()}`
      const userMsg: Message = {
        id: uid,
        senderId: currentUser.id,
        content: userLine,
        timestamp: stamp(),
        createdAt: Date.now(),
      }
      append((prev) => [...prev, userMsg])
      window.setTimeout(() => {
        const botMsg: Message = {
          id: `cui-pair-b-${Date.now()}`,
          senderId: conversation.user.id,
          content: botContent,
          timestamp: stamp(),
          createdAt: Date.now(),
          isAfterPrompt: true,
        }
        append((prev) => [...prev, botMsg])
      }, 420)
    }

    const appendTranscript = isEducationContext ? setEducationMessages : setMessages

    return messagesList.map((msg, index, arr) => {
      const isMe = msg.senderId === currentUser.id
      const isPersonalInfo = msg.content === PERSONAL_INFO_MARKER
      const isCreateEmailForm = msg.content === CREATE_EMAIL_MARKER
      const isContinueEmail = msg.content === CONTINUE_EMAIL_MARKER
      const isCuiRulesInteraction =
        isCuiCardRulesScenario(scenario) && msg.content.startsWith(`${CUI_RULES_INTERACTION_MARKER}:`)
      const isGenericCard = msg.content.startsWith("<<<RENDER_GENERIC_CARD>>>:");
      const isIntentHandoffCard = msg.content.startsWith(`${INTENT_HANDOFF_MARKER}:`);
      const isSchoolSceneGuidanceCard = msg.content.startsWith(`${SCHOOL_SCENE_APP_GUIDANCE_MARKER}:`);
      const isScenarioTwoScheduleBuilderCard = msg.content.startsWith(
        `${SCENARIO_TWO_SCHEDULE_BUILDER_MARKER}:`
      )
      const isScenarioTwoAttendanceOverviewCard = msg.content.startsWith(
        `${SCENARIO_TWO_ATTENDANCE_OVERVIEW_MARKER}:`
      )
      const isScenarioTwoAttendanceSupplementCard = msg.content.startsWith(
        `${SCENARIO_TWO_ATTENDANCE_SUPPLEMENT_MARKER}:`
      )
      const isTaskTableCard = msg.content.startsWith(TASK_TABLE_MARKER)
      const isDockCrossHandoffCard = msg.content.startsWith(`${DOCK_CROSS_HANDOFF_MARKER}:`);
      const isTeachingStudentGradeCard = msg.content.startsWith(`${TEACHING_STUDENT_GRADE_MARKER}:`);
      const isEmployeeMgmt = msg.content === EMPLOYEE_MGMT_MARKER
      const isOrgSwitcher = msg.content === ORG_SWITCHER_MARKER;
      const isCreateOrgForm = msg.content === CREATE_ORG_FORM_MARKER;
      const isEduSpaceTypeSelect = msg.content.startsWith(`${EDU_SPACE_TYPE_SELECT_MARKER}:`)
      const isEduSpaceFamilyRole = msg.content === EDU_SPACE_FAMILY_ROLE_MARKER
      const isEduSpaceFamilyForm = msg.content.startsWith(`${EDU_SPACE_FAMILY_FORM_MARKER}:`)
      const isEduSpaceInstForm = msg.content === EDU_SPACE_INST_FORM_MARKER
      const isEduSpaceInstBlocked = msg.content === EDU_SPACE_INST_BLOCKED_MARKER
      const isEduWelcomeWeiwei = msg.content === EDU_WELCOME_WEIWEI_MARKER
      const isEduSpaceCreated = msg.content.startsWith(`${EDU_SPACE_CREATED_MARKER}:`)
      const isAiClassroomTree = msg.content.startsWith(`${AI_CLASSROOM_TREE_MARKER}:`)
      const isAiClassroomSkillCard = msg.content.startsWith(`${AI_CLASSROOM_SKILL_CARD_MARKER}:`)
      const isAiClassroomScheduleCard = msg.content.startsWith(`${AI_CLASSROOM_SCHEDULE_CARD_MARKER}:`)
      const isEduDockMenuCard = msg.content.startsWith(`${EDU_DOCK_MENU_CARD_MARKER}:`)
      const isEduCourseProductsCard = msg.content.startsWith(
        `${RENDER_EDU_COURSE_PRODUCTS_CARD_MARKER}:`,
      )
      const isEduCourseGoodsCard = msg.content.startsWith(
        `${RENDER_EDU_COURSE_GOODS_CARD_MARKER}:`,
      )
      const isEduDiskListCard = msg.content.startsWith(`${EDU_DISK_LIST_CARD_MARKER}:`)
      const isEduDiskFolderCard = msg.content.startsWith(`${EDU_DISK_FOLDER_CARD_MARKER}:`)
      const isEduTeachingMaterialsBrowserCard = msg.content.startsWith(
        `${RENDER_EDU_TEACHING_MATERIALS_BROWSER_CARD_MARKER}:`,
      )
      const isLiveLessonHintCard = msg.content.startsWith(`${LIVE_LESSON_HINT_CARD_MARKER}:`)
      const isEduLessonPicker = msg.content.startsWith(`${EDU_LESSON_PICKER_MARKER}:`)
      const isEduCourseFulfillmentCard = msg.content.startsWith(`${EDU_COURSE_FULFILLMENT_CARD_MARKER}:`)
      const isLessonOperationListCard = msg.content.startsWith(`${LESSON_OPERATION_LIST_CARD_MARKER}:`)
      const isAdminBusinessCard = !isMe && msg.content.startsWith(`${ADMIN_BUSINESS_CARD_MARKER}:`)
      const isMainLessonReviewCard =
        !isMe && msg.content.startsWith(`${MAIN_LESSON_REVIEW_CARD_MARKER}:`)
      const isAicReply = !isMe && msg.content.startsWith(`${AIC_REPLY_MARKER}:`)
      const isCreateOrgSuccess = msg.content.startsWith(`${CREATE_ORG_SUCCESS_MARKER}:`);
      const isJoinOrgForm = msg.content === JOIN_ORG_FORM_MARKER;
      const isJoinOrgConfirm = msg.content.startsWith(`${JOIN_ORG_CONFIRM_MARKER}:`);
      const isVvAssistantCard = Boolean(msg.vvAssistant)
      const isVvUserCli = Boolean(msg.vvMeta)
      const isSpecialComponent =
        isPersonalInfo ||
        isCreateEmailForm ||
        isContinueEmail ||
        isCuiRulesInteraction ||
        isGenericCard ||
        isIntentHandoffCard ||
        isSchoolSceneGuidanceCard ||
        isScenarioTwoScheduleBuilderCard ||
        isScenarioTwoAttendanceOverviewCard ||
        isScenarioTwoAttendanceSupplementCard ||
        isTaskTableCard ||
        isDockCrossHandoffCard ||
        isTeachingStudentGradeCard ||
        (isEmployeeMgmt && canRenderEmployeeMgmtCard) ||
        isOrgSwitcher ||
        isCreateOrgForm ||
        isEduSpaceTypeSelect ||
        isEduSpaceFamilyRole ||
        isEduSpaceFamilyForm ||
        isEduSpaceInstForm ||
        isEduSpaceInstBlocked ||
        isEduWelcomeWeiwei ||
        isEduSpaceCreated ||
        isAiClassroomTree ||
        isAiClassroomSkillCard ||
        isAiClassroomScheduleCard ||
        isEduDockMenuCard ||
        isEduCourseProductsCard ||
        isEduCourseGoodsCard ||
        isEduDiskListCard ||
        isEduDiskFolderCard ||
        isEduTeachingMaterialsBrowserCard ||
        isLiveLessonHintCard ||
        isEduCourseFulfillmentCard ||
        isLessonOperationListCard ||
        isEduLessonPicker ||
        isAdminBusinessCard ||
        isMainLessonReviewCard ||
        isAicReply ||
        isCreateOrgSuccess ||
        isJoinOrgForm ||
        isJoinOrgConfirm ||
        isVvAssistantCard ||
        isVvUserCli
      const showTimestamp = shouldShowTimestamp(msg, index > 0 ? arr[index - 1] : null)
      const isSameSender = index > 0 && arr[index - 1].senderId === msg.senderId;
      const isWithin10Seconds = index > 0 && 
        (msg.createdAt !== undefined && arr[index - 1].createdAt !== undefined) 
          ? (msg.createdAt! - arr[index - 1].createdAt!) <= 10000 
          : false;
      const hideAvatar = isSameSender && !showTimestamp && isWithin10Seconds && !msg.isAfterPrompt;

      return (
        <div
          key={msg.id}
          data-cui-message-id={msg.id}
          className="flex min-w-0 flex-col gap-[var(--space-200)]"
        >
          {showTimestamp && <TimestampSeparator time={msg.timestamp} />}
          {isCuiRulesInteraction ? (
            <div
              className={cn(
                "flex flex-col md:flex-row gap-[6px] md:gap-[8px] w-full md:w-[calc(100%-44px)] justify-start group",
                hideAvatar ? "-mt-[var(--space-400)]" : ""
              )}
            >
              {!hideAvatar ? (
                <Avatar className="w-[28px] h-[28px] md:w-[36px] md:h-[36px] shrink-0">
                  <AvatarImage src={conversation.user.avatar} />
                </Avatar>
              ) : (
                <div className="hidden md:block w-[36px] shrink-0" />
              )}
              <div className="w-full">
                {renderReplyOrgContextBanner(msg, isEducationContext)}
                {(() => {
                  const payload = parseCuiRulesPayload(msg.content)
                  if (!payload) {
                    return <div className="text-error">CUI 规则卡片解析失败</div>
                  }
                  if (payload.variant === "meeting_schedule") {
                    return (
                      <CuiRulesPlanCardBody
                        payload={payload}
                        messageId={msg.id}
                        onPatch={(id, next) => {
                          setMessages((prev) => patchCuiRulesMessage(prev, id, () => next))
                        }}
                        onAppendHandoffCard={
                          payload.showHandoffCta
                            ? () => {
                                const row = createHandoffCardMessage()
                                const ts = new Date().toLocaleTimeString("zh-CN", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hour12: false,
                                })
                                setMessages((prev) => [
                                  ...prev,
                                  {
                                    id: row.id,
                                    senderId: conversation.user.id,
                                    content: row.content,
                                    timestamp: ts,
                                    createdAt: Date.now(),
                                    cuiFollowUpPrompts: demoFollowUpPrompts(),
                                  },
                                ])
                              }
                            : undefined
                        }
                      />
                    )
                  }
                  if (payload.variant === "plan") {
                    return (
                      <CuiRulesPlanCardBody
                        payload={payload}
                        messageId={msg.id}
                        onOpenSidebar={(id) => setCuiRulesSidebarMessageId(id)}
                        onAppendHandoffCard={() => {
                          const row = createHandoffCardMessage()
                          const ts = new Date().toLocaleTimeString("zh-CN", {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                          })
                          setMessages((prev) => [
                            ...prev,
                            {
                              id: row.id,
                              senderId: conversation.user.id,
                              content: row.content,
                              timestamp: ts,
                              createdAt: Date.now(),
                              cuiFollowUpPrompts: demoFollowUpPrompts(),
                            },
                          ])
                        }}
                      />
                    )
                  }
                  if (payload.variant === "inline_plan") {
                    return (
                      <CuiRulesInlinePlanBody
                        payload={payload}
                        messageId={msg.id}
                        onPatch={(id, next) => {
                          setMessages((prev) => patchCuiRulesMessage(prev, id, () => next))
                        }}
                      />
                    )
                  }
                  if (payload.variant === "handoff_meeting") {
                    return <CuiRulesHandoffCardBody payload={payload} />
                  }
                  return null
                })()}
                {renderDockFollowUpStrip(msg)}
              </div>
            </div>
          ) : isGenericCard ? (
            <div className={cn(
              "flex flex-col md:flex-row gap-[6px] md:gap-[8px] w-full md:w-[calc(100%-44px)] justify-start group",
              hideAvatar ? "-mt-[var(--space-400)]" : ""
            )}>
              {!hideAvatar ? (
                <Avatar className="w-[28px] h-[28px] md:w-[36px] md:h-[36px] shrink-0">
                  <AvatarImage src={conversation.user.avatar} />
                </Avatar>
              ) : (
                <div className="hidden md:block w-[36px] shrink-0" />
              )}
              <div className="w-full">
                {renderMainCuiCardOrgAttributionBanner(msg, isEducationContext, msg.cardAttributionDockAppId ?? null)}
                {renderReplyOrgContextBanner(msg, isEducationContext)}
                {(() => {
                  try {
                    const cardData = JSON.parse(
                      msg.content.replace("<<<RENDER_GENERIC_CARD>>>:", "")
                    ) as {
                      title: string
                      description?: string
                      detail?: string
                      imageSrc?: string
                      cardActions?: GenericCardActionsPayload
                    }
                    const ca = cardData.cardActions
                    const hasInlineActions = Boolean(ca?.primary || ca?.secondary)

                    const pushUserLine = (text: string) => {
                      const userMsg: Message = {
                        id: `user-${Date.now()}`,
                        senderId: currentUser.id,
                        content: text,
                        timestamp: new Date().toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        }),
                        createdAt: Date.now(),
                      }
                      if (isEducationContext) {
                        setEducationMessages((prev) => [...prev, userMsg])
                      } else {
                        setMessages((prev) => [...prev, userMsg])
                      }
                    }

                    const appendMoreRecommendCard = () => {
                      const newCardData = JSON.stringify({
                        title: "更多推荐",
                        description: "这里是为您推荐的另外一些管理功能。",
                        detail:
                          "🌟 推荐操作：\n1. 点击「商品管理」-「物料商品」\n2. 点击「财务管理」-「财务报表」",
                        imageSrc: cardData.imageSrc,
                        cardActions: {
                          primary: { label: "开始学习", sendText: "我已经准备好了，请开始吧。" },
                          secondary: { label: "换一个", preset: "more_recommend" as const },
                        },
                      })
                      const botMsg: Message = attachDockCuiFollowUps(
                        {
                          id: `bot-card-${Date.now()}`,
                          senderId: conversation.user.id,
                          content: `<<<RENDER_GENERIC_CARD>>>:${newCardData}`,
                          timestamp: new Date().toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          }),
                          createdAt: Date.now(),
                          isAfterPrompt: true,
                        },
                        "更多推荐卡片",
                        conversation
                      )
                      if (isEducationContext) {
                        setEducationMessages((prev) => [...prev, botMsg])
                      } else {
                        setMessages((prev) => [...prev, botMsg])
                      }
                    }

                    return (
                      <GenericCard title={cardData.title}>
                        <p className="text-[length:var(--font-size-base)] text-text-secondary mb-[var(--space-200)] leading-relaxed">
                          {cardData.description}
                        </p>
                        {cardData.detail && (
                          <div className="bg-bg-secondary border border-border rounded-md p-[var(--space-400)]">
                            <p className="text-[length:var(--font-size-sm)] text-text whitespace-pre-wrap">
                              {cardData.detail}
                            </p>
                          </div>
                        )}
                        {hasInlineActions ? (
                          <div className="flex flex-col sm:flex-row gap-[var(--space-200)] w-full mt-[var(--space-400)]">
                            {ca?.primary ? (
                              <Button
                                type="button"
                                className="w-full sm:w-auto"
                                variant="chat-submit"
                                onClick={() => pushUserLine(ca.primary!.sendText)}
                              >
                                {ca.primary.label}
                              </Button>
                            ) : null}
                            {ca?.secondary ? (
                              "preset" in ca.secondary && ca.secondary.preset === "more_recommend" ? (
                                <Button
                                  type="button"
                                  className="w-full sm:w-auto"
                                  variant="chat-reset"
                                  onClick={appendMoreRecommendCard}
                                >
                                  {ca.secondary.label}
                                </Button>
                              ) : "sendText" in ca.secondary ? (
                                <Button
                                  type="button"
                                  className="w-full sm:w-auto"
                                  variant="chat-reset"
                                  onClick={() => pushUserLine(ca.secondary.sendText)}
                                >
                                  {ca.secondary.label}
                                </Button>
                              ) : null
                            ) : null}
                          </div>
                        ) : null}
                      </GenericCard>
                    )
                  } catch (e) {
                    return <div className="text-error">卡片数据解析失败</div>
                  }
                })()}
                {renderDockFollowUpStrip(msg)}
              </div>
            </div>
          ) : isIntentHandoffCard ? (
            <div className={cn(
              "flex flex-col md:flex-row gap-[6px] md:gap-[8px] w-full md:w-[calc(100%-44px)] justify-start group",
              hideAvatar ? "-mt-[var(--space-400)]" : ""
            )}>
              {!hideAvatar ? (
                <Avatar className="w-[28px] h-[28px] md:w-[36px] md:h-[36px] shrink-0">
                  <AvatarImage src={conversation.user.avatar} />
                </Avatar>
              ) : (
                <div className="hidden md:block w-[36px] shrink-0" />
              )}
              <div className="w-full">
                {renderReplyOrgContextBanner(msg, isEducationContext)}
                {(() => {
                  try {
                    const rawJson = msg.content.slice(INTENT_HANDOFF_MARKER.length + 1)
                    const p = JSON.parse(rawJson) as {
                      appId: string
                      appName: string
                      intentLabel: string
                      cardTitle: string
                      confirmLine: string
                      handoffLine: string
                      carryOverText: string
                    }
                    return (
                      <>
                        {renderMainCuiCardOrgAttributionBanner(msg, isEducationContext, p.appId)}
                        <GenericCard title={p.cardTitle}>
                        <p className="text-[length:var(--font-size-base)] text-text mb-[var(--space-150)] leading-relaxed">
                          {p.confirmLine}
                        </p>
                        <p className="text-[length:var(--font-size-base)] text-text-secondary mb-[var(--space-200)] leading-relaxed">
                          {p.handoffLine}
                        </p>
                        <div className="bg-bg-secondary border border-border rounded-md p-[var(--space-300)] mb-[var(--space-300)]">
                          <p className="text-[length:var(--font-size-xs)] text-text-secondary mb-[var(--space-100)]">
                            你在主对话中的描述
                          </p>
                          <p className="text-[length:var(--font-size-sm)] text-text whitespace-pre-wrap break-words">
                            {p.carryOverText.length > 200 ? `${p.carryOverText.slice(0, 198)}…` : p.carryOverText}
                          </p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-[var(--space-200)] w-full">
                          {onIntentDockHandoff ? (
                            <Button
                              type="button"
                              className="w-full sm:w-auto"
                              variant="chat-submit"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                onIntentDockHandoffRef.current?.(
                                  p.appId,
                                  p.appName,
                                  currentOrgRef.current,
                                  organizations.length > 0,
                                  p.carryOverText,
                                  {
                                    conversationId: conversation.id,
                                    messages: [...messagesRef.current],
                                  }
                                )
                              }}
                            >
                              {isScenarioTwoFamily(scenario) || isNoOrgRoute
                                ? `同步到「${p.appName}」会话：${p.intentLabel}`
                                : `在「${p.appName}」中继续：${p.intentLabel}`}
                            </Button>
                          ) : null}
                        </div>
                      </GenericCard>
                      </>
                    )
                  } catch {
                    return <div className="text-error">意图卡片解析失败</div>
                  }
                })()}
                {renderDockFollowUpStrip(msg)}
              </div>
            </div>
          ) : isSchoolSceneGuidanceCard ? (
            <div
              className={cn(
                "flex flex-col md:flex-row gap-[6px] md:gap-[8px] w-full md:w-[calc(100%-44px)] justify-start group",
                hideAvatar ? "-mt-[var(--space-400)]" : ""
              )}
            >
              {!hideAvatar ? (
                <Avatar className="w-[28px] h-[28px] md:w-[36px] md:h-[36px] shrink-0">
                  <AvatarImage src={conversation.user.avatar} />
                </Avatar>
              ) : (
                <div className="hidden md:block w-[36px] shrink-0" />
              )}
              <div className="w-full">
                {(() => {
                  try {
                    const rawJson = msg.content.slice(SCHOOL_SCENE_APP_GUIDANCE_MARKER.length + 1)
                    const p = JSON.parse(rawJson) as SchoolSceneAppGuidancePayload
                    const isAttendanceHandoff = p.targetAppId === "attendance"
                    return (
                      <>
                        {renderMainCuiCardOrgAttributionBanner(msg, isEducationContext, p.targetAppId)}
                        {renderReplyOrgContextBanner(msg, isEducationContext)}
                        <GenericCard title="应用承接引导">
                        {isAttendanceHandoff ? (
                          <>
                            <AttendanceStatisticsSnapshotCard
                              className="mb-[var(--space-300)]"
                              monthTitle={formatAttendanceMonthTitle("2026-04")}
                            />
                            <p className="mb-[var(--space-300)] whitespace-pre-wrap text-[length:var(--font-size-sm)] font-[var(--font-weight-regular)] leading-relaxed text-text-secondary">
                              {p.guidanceBody}
                            </p>
                          </>
                        ) : (
                          <p className="mb-[var(--space-300)] whitespace-pre-wrap text-[length:var(--font-size-base)] font-[var(--font-weight-regular)] leading-relaxed text-text">
                            {p.guidanceBody}
                          </p>
                        )}
                        <div className="flex w-full flex-col gap-[var(--space-200)] sm:flex-row">
                          {onIntentDockHandoff ? (
                            <Button
                              type="button"
                              className="w-full sm:w-auto"
                              variant="chat-submit"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                onIntentDockHandoffRef.current?.(
                                  p.targetAppId,
                                  p.targetAppName,
                                  currentOrgRef.current,
                                  organizations.length > 0,
                                  p.instruction,
                                  {
                                    conversationId: conversation.id,
                                    messages: [
                                      ...(isEducationContext
                                        ? educationPortalTranscriptRef.current
                                        : messagesRef.current),
                                    ],
                                  },
                                  {
                                    plainInstruction: p.instruction,
                                    assistantReply: p.assistantReply,
                                  }
                                )
                              }}
                            >
                              {isScenarioTwoFamily(scenario) || isNoOrgRoute
                                ? `同步到「${p.targetAppName}」会话：${p.instruction}`
                                : `《前往「${p.targetAppName}」继续「${p.instruction}」》`}
                            </Button>
                          ) : null}
                        </div>
                      </GenericCard>
                      </>
                    )
                  } catch {
                    return <div className="text-error">学校场景引导卡片解析失败</div>
                  }
                })()}
              </div>
            </div>
          ) : isScenarioTwoScheduleBuilderCard ? (
            <div
              className={cn(
                "flex flex-col md:flex-row gap-[6px] md:gap-[8px] w-full md:w-[calc(100%-44px)] justify-start group",
                hideAvatar ? "-mt-[var(--space-400)]" : ""
              )}
            >
              {!hideAvatar ? (
                <Avatar className="w-[28px] h-[28px] md:w-[36px] md:h-[36px] shrink-0">
                  <AvatarImage src={conversation.user.avatar} />
                </Avatar>
              ) : (
                <div className="hidden md:block w-[36px] shrink-0" />
              )}
              <div className="w-full">
                {renderMainCuiCardOrgAttributionBanner(msg, isEducationContext, "education")}
                {renderReplyOrgContextBanner(msg, isEducationContext)}
                {(() => {
                  const rawJson = msg.content.slice(SCENARIO_TWO_SCHEDULE_BUILDER_MARKER.length + 1)
                  const parsed =
                    parseScenarioTwoScheduleBuilderPayload(rawJson) ??
                    defaultScenarioTwoScheduleBuilderPayload()
                  return (
                    <ScenarioTwoScheduleBuilderCard
                      payload={parsed}
                      onPatch={(next) =>
                        setMessages((prev) =>
                          prev.map((x) =>
                            x.id === msg.id
                              ? {
                                  ...x,
                                  content: `${SCENARIO_TWO_SCHEDULE_BUILDER_MARKER}:${JSON.stringify(next)}`,
                                }
                              : x
                          )
                        )
                      }
                      onMirrorPublish={({ userLine, assistantLine }) =>
                        onMirrorDockConversationRef.current?.({
                          dockAppId: "education",
                          orgId: currentOrgRef.current,
                          hasJoinedOrganizations: organizations.length > 0,
                          pairs: [{ userText: userLine, assistantText: assistantLine }],
                        })
                      }
                    />
                  )
                })()}
                {renderDockFollowUpStrip(msg)}
              </div>
            </div>
          ) : isScenarioTwoAttendanceOverviewCard ? (
            <div
              className={cn(
                "flex flex-col md:flex-row gap-[6px] md:gap-[8px] w-full md:w-[calc(100%-44px)] justify-start group",
                hideAvatar ? "-mt-[var(--space-400)]" : ""
              )}
            >
              {!hideAvatar ? (
                <Avatar className="w-[28px] h-[28px] md:w-[36px] md:h-[36px] shrink-0">
                  <AvatarImage src={conversation.user.avatar} />
                </Avatar>
              ) : (
                <div className="hidden md:block w-[36px] shrink-0" />
              )}
              <div className="w-full">
                {renderMainCuiCardOrgAttributionBanner(msg, isEducationContext, "attendance")}
                {renderReplyOrgContextBanner(msg, isEducationContext)}
                {(() => {
                  const rawJson = msg.content.slice(SCENARIO_TWO_ATTENDANCE_OVERVIEW_MARKER.length + 1)
                  const parsed =
                    parseScenarioTwoAttendanceOverviewPayload(rawJson) ??
                    defaultScenarioTwoAttendanceOverviewPayload()
                  return (
                    <ScenarioTwoAttendanceOverviewCard
                      payload={parsed}
                      onPatch={(next) => {
                        const nextContent = `${SCENARIO_TWO_ATTENDANCE_OVERVIEW_MARKER}:${JSON.stringify(next)}`
                        setMessages((prev) =>
                          prev.map((x) =>
                            x.id === msg.id
                              ? {
                                  ...x,
                                  content: nextContent,
                                }
                              : x
                          )
                        )
                        if (getConversationDockAppId(conversation) !== "attendance") {
                          onMirrorDockConversationRef.current?.({
                            dockAppId: "attendance",
                            orgId: msg.cardAttributionOrgId ?? currentOrgRef.current,
                            hasJoinedOrganizations: organizations.length > 0,
                            patchMessages: [
                              { id: toDockMirrorPeerMessageId(msg.id), merge: { content: nextContent } },
                            ],
                          })
                        }
                      }}
                    />
                  )
                })()}
                {isScenarioTwoMultiOrgs(scenario) ? (
                  <ScenarioTwoMultiAttendanceFollowUpStrip
                    prompts={msg.cuiFollowUpPrompts}
                    organizations={organizations.map((o) => ({ id: o.id, name: o.name }))}
                    currentOrgId={currentOrg}
                    hideOrgSwitcher
                    onSendChip={(text) => handleSendMessage(text)}
                    onNavigateOtherOrgAttendance={(orgName) =>
                      handleSendMessage(`还可以针对「${orgName}」查看考勤`)
                    }
                  />
                ) : (
                  renderDockFollowUpStrip(msg)
                )}
              </div>
            </div>
          ) : isScenarioTwoAttendanceSupplementCard ? (
            <div
              className={cn(
                "flex flex-col md:flex-row gap-[6px] md:gap-[8px] w-full md:w-[calc(100%-44px)] justify-start group",
                hideAvatar ? "-mt-[var(--space-400)]" : ""
              )}
            >
              {!hideAvatar ? (
                <Avatar className="w-[28px] h-[28px] md:w-[36px] md:h-[36px] shrink-0">
                  <AvatarImage src={conversation.user.avatar} />
                </Avatar>
              ) : (
                <div className="hidden md:block w-[36px] shrink-0" />
              )}
              <div className="w-full">
                {renderMainCuiCardOrgAttributionBanner(msg, isEducationContext, "attendance")}
                {renderReplyOrgContextBanner(msg, isEducationContext)}
                {(() => {
                  const rawJson = msg.content.slice(SCENARIO_TWO_ATTENDANCE_SUPPLEMENT_MARKER.length + 1)
                  const parsed =
                    parseScenarioTwoAttendanceSupplementPayload(rawJson) ??
                    defaultScenarioTwoAttendanceSupplementPayload("makeup")
                  return (
                    <ScenarioTwoAttendanceSupplementCard
                      payload={parsed}
                      onPatch={(next) => {
                        const nextContent = `${SCENARIO_TWO_ATTENDANCE_SUPPLEMENT_MARKER}:${JSON.stringify(next)}`
                        setMessages((prev) =>
                          prev.map((x) =>
                            x.id === msg.id
                              ? {
                                  ...x,
                                  content: nextContent,
                                }
                              : x
                          )
                        )
                        if (
                          (isScenarioTwoFamily(scenario) || isNoOrgRoute) &&
                          getConversationDockAppId(conversation) !== "attendance"
                        ) {
                          onMirrorDockConversationRef.current?.({
                            dockAppId: "attendance",
                            orgId: msg.cardAttributionOrgId ?? currentOrgRef.current,
                            hasJoinedOrganizations: organizations.length > 0,
                            patchMessages: [
                              { id: toDockMirrorPeerMessageId(msg.id), merge: { content: nextContent } },
                            ],
                          })
                        }
                      }}
                    />
                  )
                })()}
              </div>
            </div>
          ) : isTaskTableCard ? (
            <div
              className={cn(
                "flex flex-col md:flex-row gap-[6px] md:gap-[8px] w-full md:w-[calc(100%-44px)] justify-start group",
                hideAvatar ? "-mt-[var(--space-400)]" : ""
              )}
            >
              {!hideAvatar ? (
                <Avatar className="w-[28px] h-[28px] md:w-[36px] md:h-[36px] shrink-0">
                  <AvatarImage src={conversation.user.avatar} />
                </Avatar>
              ) : (
                <div className="hidden md:block w-[36px] shrink-0" />
              )}
              <div className="w-full">
                {renderMainCuiCardOrgAttributionBanner(msg, isEducationContext, "work_task")}
                {renderReplyOrgContextBanner(msg, isEducationContext)}
                {(() => {
                  try {
                    const rest = msg.content.slice(TASK_TABLE_MARKER.length)
                    const jsonStr = rest.startsWith(":") ? rest.slice(1) : "{}"
                    const parsed = JSON.parse(jsonStr) as { filterHint?: string }
                    return (
                      <ScenarioTaskManagementTableCard
                        filterHint={parsed.filterHint}
                        viewedTaskIds={demoTaskTableViewedIds}
                        onRowClick={(row) => {
                          setDemoTaskTableViewedIds((prev) => new Set([...prev, row.id]))
                          const d = getTaskDetailOrFallback(row.id)
                          const desc = [
                            `执行人：${d.assignee}`,
                            `负责人：${d.owner}`,
                            `状态：${d.status}　进度：${d.progress}%`,
                            `截止：${d.due}　风险：${d.risk}`,
                            `优先级：${d.priority}　类型：${d.type}　阶段：${d.phase}`,
                          ].join("\n")
                          const sub =
                            d.subtasks?.length > 0
                              ? `\n子任务：\n${d.subtasks.map((s) => `${s.done ? "☑" : "☐"} ${s.title}`).join("\n")}`
                              : ""
                          const cardData = JSON.stringify({
                            title: "任务详情",
                            description: desc,
                            detail: `${d.description}${sub}`,
                            imageSrc: todoIcon,
                          })
                          const ts = new Date().toLocaleTimeString("zh-CN", {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                          })
                          const detailMsg: Message = {
                            id: `scenario-task-detail-${Date.now()}`,
                            senderId: "ai-assistant",
                            content: `<<<RENDER_GENERIC_CARD>>>:${cardData}`,
                            timestamp: ts,
                            createdAt: Date.now(),
                            isAfterPrompt: true,
                            cardAttributionOrgId: msg.cardAttributionOrgId ?? currentOrgRef.current,
                            cardAttributionDockAppId: "work_task",
                          }
                          setMessages((prev) => [...prev, detailMsg])
                          if (getConversationDockAppId(conversation) !== "work_task") {
                            onMirrorDockConversationRef.current?.({
                              dockAppId: "work_task",
                              orgId: msg.cardAttributionOrgId ?? currentOrgRef.current,
                              hasJoinedOrganizations: organizations.length > 0,
                              pairs: [],
                              mirrorExtraMessages: [
                                { ...detailMsg, id: toDockMirrorPeerMessageId(detailMsg.id) },
                              ],
                            })
                          }
                          scrollRef.current?.scrollIntoView({ behavior: "smooth" })
                        }}
                      />
                    )
                  } catch {
                    return (
                      <ScenarioTaskManagementTableCard
                        filterHint="全部任务"
                        viewedTaskIds={demoTaskTableViewedIds}
                      />
                    )
                  }
                })()}
                {isScenarioTwoMultiOrgs(scenario) ? (
                  <ScenarioTwoMultiAttendanceFollowUpStrip
                    organizations={organizations.map((o) => ({ id: o.id, name: o.name }))}
                    currentOrgId={currentOrg}
                    orgPickLabelMode="task_table"
                    hideOrgSwitcher
                    onSendChip={(text) => handleSendMessage(text)}
                    onNavigateOtherOrgAttendance={(orgName) =>
                      handleSendMessage(`还可以针对「${orgName}」打开任务列表`)
                    }
                  />
                ) : null}
              </div>
            </div>
          ) : isDockCrossHandoffCard ? (
            <div
              className={cn(
                "flex flex-col md:flex-row gap-[6px] md:gap-[8px] w-full md:w-[calc(100%-44px)] justify-start group",
                hideAvatar ? "-mt-[var(--space-400)]" : ""
              )}
            >
              {!hideAvatar ? (
                <Avatar className="w-[28px] h-[28px] md:w-[36px] md:h-[36px] shrink-0">
                  <AvatarImage src={conversation.user.avatar} />
                </Avatar>
              ) : (
                <div className="hidden md:block w-[36px] shrink-0" />
              )}
              <div className="w-full">
                {renderReplyOrgContextBanner(msg, isEducationContext)}
                {(() => {
                  try {
                    const rawJson = msg.content.slice(DOCK_CROSS_HANDOFF_MARKER.length + 1)
                    const p = JSON.parse(rawJson) as {
                      targetAppId: string
                      targetAppName: string
                      fromAppName: string
                      intentLabel: string
                      cardTitle: string
                      confirmLine: string
                      handoffLine: string
                      carryOverText: string
                    }
                    return (
                      <>
                        {renderMainCuiCardOrgAttributionBanner(msg, isEducationContext, p.targetAppId)}
                        <GenericCard title={p.cardTitle}>
                        <p className="text-[length:var(--font-size-base)] text-text mb-[var(--space-150)] leading-relaxed">
                          {p.confirmLine}
                        </p>
                        <p className="text-[length:var(--font-size-base)] text-text-secondary mb-[var(--space-200)] leading-relaxed">
                          {p.handoffLine}
                        </p>
                        <div className="bg-bg-secondary border border-border rounded-md p-[var(--space-300)] mb-[var(--space-300)]">
                          <p className="text-[length:var(--font-size-xs)] text-text-secondary mb-[var(--space-100)]">
                            {`你在「${p.fromAppName}」中的描述`}
                          </p>
                          <p className="text-[length:var(--font-size-sm)] text-text whitespace-pre-wrap break-words">
                            {p.carryOverText.length > 200
                              ? `${p.carryOverText.slice(0, 198)}…`
                              : p.carryOverText}
                          </p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-[var(--space-200)] w-full">
                          {onCrossDockHandoff ? (
                            <Button
                              type="button"
                              className="w-full sm:w-auto"
                              variant="chat-submit"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                onCrossDockHandoffRef.current?.(
                                  p.targetAppId,
                                  p.targetAppName,
                                  currentOrgRef.current,
                                  organizations.length > 0,
                                  p.carryOverText,
                                  p.fromAppName,
                                  {
                                    conversationId: conversation.id,
                                    messages: [...messagesRef.current],
                                  }
                                )
                              }}
                            >
                              {isScenarioTwoFamily(scenario) || isNoOrgRoute
                                ? `同步到「${p.targetAppName}」会话：${p.intentLabel}`
                                : `前往「${p.targetAppName}」继续：${p.intentLabel}`}
                            </Button>
                          ) : null}
                        </div>
                      </GenericCard>
                      </>
                    )
                  } catch {
                    return <div className="text-error">跨应用引导卡片解析失败</div>
                  }
                })()}
                {renderDockFollowUpStrip(msg)}
              </div>
            </div>
          ) : isTeachingStudentGradeCard ? (
            <div
              className={cn(
                "flex flex-col md:flex-row gap-[6px] md:gap-[8px] w-full md:w-[calc(100%-44px)] justify-start group",
                hideAvatar ? "-mt-[var(--space-400)]" : ""
              )}
            >
              {!hideAvatar ? (
                <Avatar className="w-[28px] h-[28px] md:w-[36px] md:h-[36px] shrink-0">
                  <AvatarImage src={conversation.user.avatar} />
                </Avatar>
              ) : (
                <div className="hidden md:block w-[36px] shrink-0" />
              )}
              <div className="w-full">
                {renderMainCuiCardOrgAttributionBanner(msg, isEducationContext, "teaching")}
                {renderReplyOrgContextBanner(msg, isEducationContext)}
                {(() => {
                  try {
                    const rawJson = msg.content.slice(TEACHING_STUDENT_GRADE_MARKER.length + 1)
                    const data = JSON.parse(rawJson) as TeachingStudentGradePayload
                    return <TeachingStudentGradeCard data={data} />
                  } catch {
                    return <div className="text-error">成绩表单数据解析失败</div>
                  }
                })()}
                {renderDockFollowUpStrip(msg)}
              </div>
            </div>
          ) : isOrgSwitcher ? (
            <div className={cn(
              "flex flex-col md:flex-row gap-[6px] md:gap-[8px] w-full md:w-[calc(100%-44px)] justify-start group",
              hideAvatar ? "-mt-[var(--space-400)]" : ""
            )}>
              {!hideAvatar ? (
                <Avatar className="w-[28px] h-[28px] md:w-[36px] md:h-[36px] shrink-0">
                  <AvatarImage src={conversation.user.avatar} />
                </Avatar>
              ) : (
                <div className="hidden md:block w-[36px] shrink-0" />
              )}
              <div className="w-full">
                {renderReplyOrgContextBanner(msg, isEducationContext)}
                {organizations.length > 0 ? (
                  <OrganizationSwitcherCard
                    currentOrg={organizations.find(o => o.id === currentOrg) || organizations[0]}
                    organizations={organizations}
                    onSelectOrg={handleOrgSwitch}
                    onCreateOrg={handleCreateOrg}
                    onJoinOrg={handleJoinOrg}
                  />
                ) : (
                  <GenericCard title="加入或创建组织">
                    <p className="text-[length:var(--font-size-base)] text-text-secondary leading-relaxed">
                      当前账号尚未加入任何组织。加入组织后可使用组织内的资源与协作能力。
                    </p>
                    <div className="mt-[var(--space-400)] flex flex-col sm:flex-row gap-[var(--space-200)]">
                      <Button className="w-full sm:w-auto" variant="chat-submit" onClick={handleJoinOrg}>
                        加入组织
                      </Button>
                      <Button className="w-full sm:w-auto" variant="chat-reset" onClick={handleCreateOrg}>
                        创建组织
                      </Button>
                    </div>
                  </GenericCard>
                )}
                {renderDockFollowUpStrip(msg)}
              </div>
            </div>
          ) : isCreateOrgForm ? (
            <div className={cn(
              "flex flex-col md:flex-row gap-[6px] md:gap-[8px] w-full md:w-[calc(100%-44px)] justify-start group",
              hideAvatar ? "-mt-[var(--space-400)]" : ""
            )}>
              {!hideAvatar ? (
                <Avatar className="w-[28px] h-[28px] md:w-[36px] md:h-[36px] shrink-0">
                  <AvatarImage src={conversation.user.avatar} />
                </Avatar>
              ) : (
                <div className="hidden md:block w-[36px] shrink-0" />
              )}
              <div className="w-full">
                {renderReplyOrgContextBanner(msg, isEducationContext)}
                <CreateOrgFormCard
                  onSubmit={(data) => handleCreateOrgSubmit(data, isEducationContext)}
                  onCancel={() => {
                    // 可选：返回组织切换器
                  }}
                />
                {renderDockFollowUpStrip(msg)}
              </div>
            </div>
          ) : isEduSpaceTypeSelect ? (
            <div
              className={cn(
                "flex flex-col md:flex-row gap-[6px] md:gap-[8px] w-full md:w-[calc(100%-44px)] justify-start group",
                hideAvatar ? "-mt-[var(--space-400)]" : "",
              )}
            >
              {!hideAvatar ? (
                <Avatar className="w-[28px] h-[28px] md:w-[36px] md:h-[36px] shrink-0">
                  <AvatarImage src={conversation.user.avatar} />
                </Avatar>
              ) : (
                <div className="hidden md:block w-[36px] shrink-0" />
              )}
              <div className="w-full">
                {renderReplyOrgContextBanner(msg, isEducationContext)}
                {(() => {
                  try {
                    const rawJson = msg.content.slice(EDU_SPACE_TYPE_SELECT_MARKER.length + 1)
                    const payload = JSON.parse(rawJson) as { orgName?: string }
                    const orgLabel = payload.orgName ?? "本组织"
                    const fullFlow = shouldOfferFullEducationSpaceCreateFlow(
                      scenario,
                      hasJoinedOrganizations,
                      messagesList,
                      messages
                    )
                    return (
                      <EduSpaceTypeSelectCard
                        onSelectFamily={() =>
                          fullFlow
                            ? pushUserThenBot("我要创建家庭教育空间", EDU_SPACE_FAMILY_ROLE_MARKER)
                            : pushUserThenBot(
                                "我要创建家庭教育空间",
                                `已选择「家庭教育空间」。接下来可为「${orgLabel}」配置家庭成员与陪伴式学习场景（演示）。您可以说明家庭学段与孩子人数。`,
                              )
                        }
                        onSelectInstitution={() => {
                          if (organizations.length === 0) {
                            pushUserThenBot("我要创建机构教育空间", EDU_SPACE_INST_BLOCKED_MARKER)
                            return
                          }
                          fullFlow
                            ? pushUserThenBot("我要创建机构教育空间", EDU_SPACE_INST_FORM_MARKER)
                            : pushUserThenBot(
                                "我要创建机构教育空间",
                                `已选择「机构教育空间」。接下来可为「${orgLabel}」进入教务与经营能力配置（演示）。您可以说明校区与班型需求。`,
                              )
                        }}
                      />
                    )
                  } catch {
                    return <div className="text-error">教育空间类型数据解析失败</div>
                  }
                })()}
                {renderDockFollowUpStrip(msg)}
              </div>
            </div>
          ) : isAiClassroomTree ? (
            <div
              className={cn(
                "flex flex-col md:flex-row gap-[6px] md:gap-[8px] w-full md:w-[calc(100%-44px)] justify-start group",
                hideAvatar ? "-mt-[var(--space-400)]" : "",
              )}
            >
              {!hideAvatar ? (
                <Avatar className="w-[28px] h-[28px] md:w-[36px] md:h-[36px] shrink-0">
                  <AvatarImage src={conversation.user.avatar} />
                </Avatar>
              ) : (
                <div className="hidden md:block w-[36px] shrink-0" />
              )}
              <div className="w-full">
                {renderReplyOrgContextBanner(msg, isEducationContext)}
                {(() => {
                  const roleStr = msg.content.slice(AI_CLASSROOM_TREE_MARKER.length + 1) as EduSceneRole
                  const roleSafe: EduSceneRole =
                    roleStr === "teacher" || roleStr === "student" || roleStr === "parent"
                      ? roleStr
                      : (eduScenarioRole(scenario) ?? "teacher")
                  return (
                    <AiClassroomSkillTreePanel
                      role={roleSafe}
                      deliveryMode={lessonDeliveryMode}
                      onPickSkill={(item: AiClassroomSkillItem) =>
                        pushUserThenBot(
                          `打开「${item.label}」`,
                          buildAiClassroomSkillPlaceholderReply(
                            item,
                            roleSafe,
                            educationStage,
                            lessonDeliveryMode,
                          ),
                        )
                      }
                      onQuickPrompt={(prompt) => handleSendMessage(prompt)}
                    />
                  )
                })()}
                {renderDockFollowUpStrip(msg)}
              </div>
            </div>
          ) : isAiClassroomSkillCard ? (
            <div
              className={cn(
                "flex flex-col md:flex-row gap-[6px] md:gap-[8px] w-full md:w-[calc(100%-44px)] justify-start group",
                hideAvatar ? "-mt-[var(--space-400)]" : "",
              )}
            >
              {!hideAvatar ? (
                <Avatar className="w-[28px] h-[28px] md:w-[36px] md:h-[36px] shrink-0">
                  <AvatarImage src={conversation.user.avatar} />
                </Avatar>
              ) : (
                <div className="hidden md:block w-[36px] shrink-0" />
              )}
              <div className="w-full">
                {renderReplyOrgContextBanner(msg, isEducationContext)}
                {(() => {
                  const skillId = msg.content.slice(AI_CLASSROOM_SKILL_CARD_MARKER.length + 1)
                  const config = getAiClassroomSkillCardConfig(skillId, lessonDeliveryMode)
                  const handlePickPrompt = (prompt: string) => {
                    const reply =
                      resolveRecommendedPromptReply(prompt, { deliveryMode: lessonDeliveryMode }) ??
                      `已为你执行「${prompt}」。`
                    pushUserThenBot(prompt, reply)
                  }
                  if (!config) {
                    return (
                      <p className="m-0 text-[length:var(--font-size-sm)] leading-relaxed text-text-secondary">
                        该能力卡片即将上线。
                      </p>
                    )
                  }
                  if (config.kind === "bespoke") {
                    switch (config.bespokeId) {
                      case "teacher.prep.start":
                        return <TeacherLessonPrepCard onPickPrompt={handlePickPrompt} />
                      case "teacher.post.reportReview":
                        return <TeacherLessonReportReviewCard onPickPrompt={handlePickPrompt} />
                      case "student.post.mistakeChallenge":
                        return <StudentMistakeChallengeCard onPickPrompt={handlePickPrompt} />
                      case "parent.post.lessonReport":
                        return <ParentLessonReportCard onPickPrompt={handlePickPrompt} />
                      default:
                        return null
                    }
                  }
                  return <AiClassroomSkillCard data={config.data} onPickPrompt={handlePickPrompt} />
                })()}
                {renderDockFollowUpStrip(msg)}
              </div>
            </div>
          ) : isAiClassroomScheduleCard ? (
            <div
              className={cn(
                "flex flex-col md:flex-row gap-[6px] md:gap-[8px] w-full md:w-[calc(100%-44px)] justify-start group",
                hideAvatar ? "-mt-[var(--space-400)]" : "",
              )}
            >
              {!hideAvatar ? (
                <Avatar className="w-[28px] h-[28px] md:w-[36px] md:h-[36px] shrink-0">
                  <AvatarImage src={conversation.user.avatar} />
                </Avatar>
              ) : (
                <div className="hidden md:block w-[36px] shrink-0" />
              )}
              <div className="w-full">
                {renderReplyOrgContextBanner(msg, isEducationContext)}
                {(() => {
                  const parsedSchedule = parseAiClassroomScheduleCardRole(msg.content)
                  if (!parsedSchedule) {
                    return (
                      <p className="m-0 text-[length:var(--font-size-sm)] leading-relaxed text-text-secondary">
                        课表卡片暂时无法解析。
                      </p>
                    )
                  }
                  return (
                    <AiClassroomScheduleCard
                      role={parsedSchedule.role}
                      scope={parsedSchedule.scope}
                      stage={educationStage}
                      onPickLesson={(lessonId) => {
                        /**
                         * 主对话内点某节课 → 直接进入该课子 CUI（与 agenda 选课同语义）。
                         * `kind: "open-only"`：仅打开侧 CUI、不污染会话；侧 CUI 自带 AI 主动开场（含 chip）即可。
                         */
                        openAiClassroomSidePanel({
                          lessonId,
                          command: "进入本节 AI 课堂",
                          source: "dock",
                          kind: "open-only",
                        })
                      }}
                      onPickSeries={(seriesId) => {
                        /**
                         * 主对话内点某系列课 → 打开"系列课子 CUI"（不进入单课 18 卡）。
                         * 进入时 panel 自带按状态分流的开场 + chip。
                         */
                        openAiClassroomSeriesSidePanel({
                          seriesId,
                          source: "schedule",
                        })
                      }}
                    />
                  )
                })()}
                {renderDockFollowUpStrip(msg)}
              </div>
            </div>
          ) : isEduDockMenuCard ? (
            <div
              className={cn(
                "flex flex-col md:flex-row gap-[6px] md:gap-[8px] w-full md:w-[calc(100%-44px)] justify-start group",
                hideAvatar ? "-mt-[var(--space-400)]" : "",
              )}
            >
              {!hideAvatar ? (
                <Avatar className="w-[28px] h-[28px] md:w-[36px] md:h-[36px] shrink-0">
                  <AvatarImage src={conversation.user.avatar} />
                </Avatar>
              ) : (
                <div className="hidden md:block w-[36px] shrink-0" />
              )}
              <div className="w-full">
                {renderReplyOrgContextBanner(msg, isEducationContext)}
                {(() => {
                  const parsed = parseEduDockMenuCardContent(msg.content)
                  if (!parsed) {
                    return (
                      <p className="m-0 text-[length:var(--font-size-sm)] leading-relaxed text-text-secondary">
                        菜单卡片暂时无法解析。
                      </p>
                    )
                  }
                  const data = getEduDockMenuCardData(
                    parsed.role,
                    parsed.menuId,
                    parsed.stage ?? educationStage,
                  )
                  if (!data) {
                    return (
                      <p className="m-0 text-[length:var(--font-size-sm)] leading-relaxed text-text-secondary">
                        菜单卡片暂时无法解析。
                      </p>
                    )
                  }
                  return (
                    <EduDockMenuCard
                      data={data}
                      onPickPrompt={(prompt) => {
                        const reply =
                          resolveRecommendedPromptReply(prompt, { deliveryMode: lessonDeliveryMode }) ?? null
                        if (reply) {
                          pushUserThenBot(prompt, reply)
                          return
                        }
                        /**
                         * 未命中闭环脚本时回退到统一路由：
                         * - admin 与 dock 文本指令默认留在主对话（见 handleEduRoleSkillCommand）
                         * - 其余身份若命中 Skill 仍可进入子 CUI
                         */
                        handleEduRoleSkillCommand(prompt, { source: "dock" })
                      }}
                    />
                  )
                })()}
                {renderDockFollowUpStrip(msg)}
              </div>
            </div>
          ) : isEduCourseProductsCard ? (
            <div
              className={cn(
                "flex flex-col md:flex-row gap-[6px] md:gap-[8px] w-full md:w-[calc(100%-44px)] justify-start group",
                hideAvatar ? "-mt-[var(--space-400)]" : "",
              )}
            >
              {!hideAvatar ? (
                <Avatar className="w-[28px] h-[28px] md:w-[36px] md:h-[36px] shrink-0">
                  <AvatarImage src={conversation.user.avatar} />
                </Avatar>
              ) : (
                <div className="hidden md:block w-[36px] shrink-0" />
              )}
              <div className="w-full">
                {renderReplyOrgContextBanner(msg, isEducationContext)}
                {(() => {
                  const parsed = parseEduCourseProductsMarkerContent(msg.content)
                  if (!parsed) {
                    return (
                      <p className="m-0 text-[length:var(--font-size-sm)] leading-relaxed text-text-secondary">
                        课程商品卡暂时无法解析。
                      </p>
                    )
                  }
                  return (
                    <EduCourseProductsCard
                      payload={parsed}
                      onPickPrompt={(prompt) => {
                        /** 卡内行内回执（下架 / 编辑 / 删除 / 已关联商品 chevron 等） */
                        pushUserThenBot(
                          prompt,
                          `已记录：${prompt}。可继续操作或返回继续浏览课程列表。`,
                        )
                      }}
                      onCreateCourse={() =>
                        openCreateCourseSidePanel({
                          orgId: parsed.spaceOrgId,
                          scenario: parsed.spaceScenario,
                        })
                      }
                      onOpenSchedule={(courseId, mode) =>
                        openCreateScheduleSidePanel({
                          orgId: parsed.spaceOrgId,
                          scenario: parsed.spaceScenario,
                          courseId,
                          mode,
                        })
                      }
                    />
                  )
                })()}
                {renderDockFollowUpStrip(msg)}
              </div>
            </div>
          ) : isEduCourseGoodsCard ? (
            <div
              className={cn(
                "flex flex-col md:flex-row gap-[6px] md:gap-[8px] w-full md:w-[calc(100%-44px)] justify-start group",
                hideAvatar ? "-mt-[var(--space-400)]" : "",
              )}
            >
              {!hideAvatar ? (
                <Avatar className="w-[28px] h-[28px] md:w-[36px] md:h-[36px] shrink-0">
                  <AvatarImage src={conversation.user.avatar} />
                </Avatar>
              ) : (
                <div className="hidden md:block w-[36px] shrink-0" />
              )}
              <div className="w-full">
                {renderReplyOrgContextBanner(msg, isEducationContext)}
                {(() => {
                  const parsed = parseEduCourseGoodsMarkerContent(msg.content)
                  if (!parsed) {
                    return (
                      <p className="m-0 text-[length:var(--font-size-sm)] leading-relaxed text-text-secondary">
                        课程商品卡暂时无法解析。
                      </p>
                    )
                  }
                  return (
                    <EduCourseGoodsCard
                      payload={parsed}
                      role={
                        eduSceneRoleId === "teacher" ||
                        eduSceneRoleId === "student" ||
                        eduSceneRoleId === "parent" ||
                        eduSceneRoleId === "admin"
                          ? eduSceneRoleId
                          : "teacher"
                      }
                      onPickPrompt={(prompt) => {
                        pushUserThenBot(
                          prompt,
                          `已记录：${prompt}。可继续操作或点列表行进入课程子 CUI。`,
                        )
                      }}
                      onOpenCourse={(courseId) => {
                        /**
                         * 与 EduCourseFulfillmentCard 同款 seriesId 派生：
                         *   seeded（id=`course-series-...`）→ 去掉 `course-` 在 DEMO 表里查
                         *   非 seeded → 走 `synth-${courseId}` 兜底，让父级用 buildSeriesFromCourse 合成
                         */
                        const seriesId = courseId.startsWith("course-series-")
                          ? courseId.replace(/^course-/, "")
                          : `synth-${courseId}`
                        openAiClassroomSeriesSidePanel({
                          seriesId,
                          source: "schedule",
                        })
                      }}
                    />
                  )
                })()}
                {renderDockFollowUpStrip(msg)}
              </div>
            </div>
          ) : isEduDiskListCard ? (
            <div
              className={cn(
                "flex flex-col md:flex-row gap-[6px] md:gap-[8px] w-full md:w-[calc(100%-44px)] justify-start group",
                hideAvatar ? "-mt-[var(--space-400)]" : "",
              )}
            >
              {!hideAvatar ? (
                <Avatar className="w-[28px] h-[28px] md:w-[36px] md:h-[36px] shrink-0">
                  <AvatarImage src={conversation.user.avatar} />
                </Avatar>
              ) : (
                <div className="hidden md:block w-[36px] shrink-0" />
              )}
              <div className="w-full">
                {renderReplyOrgContextBanner(msg, isEducationContext)}
                {(() => {
                  const parsed = parseEduDiskListCardContent(msg.content)
                  if (!parsed) {
                    return (
                      <p className="m-0 text-[length:var(--font-size-sm)] leading-relaxed text-text-secondary">
                        教育微盘暂时无法解析。
                      </p>
                    )
                  }
                  const data = getEduDiskListData(parsed.role, scenario)
                  return (
                    <EduDiskListCard
                      data={data}
                      onOpenSpace={(item) =>
                        openEduDiskFolderCardInChat(item.spaceId, item.spaceName)
                      }
                      onCreateSpace={() => handleSendMessage("创建教育空间")}
                      onJoinSpace={() => handleSendMessage("加入教育空间")}
                    />
                  )
                })()}
                {renderDockFollowUpStrip(msg)}
              </div>
            </div>
          ) : isEduDiskFolderCard ? (
            <div
              className={cn(
                "flex flex-col md:flex-row gap-[6px] md:gap-[8px] w-full md:w-[calc(100%-44px)] justify-start group",
                hideAvatar ? "-mt-[var(--space-400)]" : "",
              )}
            >
              {!hideAvatar ? (
                <Avatar className="w-[28px] h-[28px] md:w-[36px] md:h-[36px] shrink-0">
                  <AvatarImage src={conversation.user.avatar} />
                </Avatar>
              ) : (
                <div className="hidden md:block w-[36px] shrink-0" />
              )}
              <div className="w-full">
                {renderReplyOrgContextBanner(msg, isEducationContext)}
                {(() => {
                  const parsed = parseEduDiskFolderCardContent(msg.content)
                  if (!parsed) {
                    return (
                      <p className="m-0 text-[length:var(--font-size-sm)] leading-relaxed text-text-secondary">
                        教育微盘目录暂时无法解析。
                      </p>
                    )
                  }
                  const data = getEduDiskFolderData(parsed.role, parsed.spaceId, scenario)
                  if (!data) {
                    return (
                      <p className="m-0 text-[length:var(--font-size-sm)] leading-relaxed text-text-secondary">
                        该教育空间已不存在。点击下方「返回教育微盘列表」回到列表。
                      </p>
                    )
                  }
                  return (
                    <EduDiskFolderCard
                      data={data}
                      onOpenFolder={(folder) => {
                        pushUserThenBot(
                          `打开 ${folder.name}`,
                          `已为你聚焦「${folder.name}」（${folder.fileCount} 个文件）。当前展示该文件夹下最近 ${folder.recentFiles.length} 个文件预览，详细列表稍后我会一次性给你。`,
                        )
                      }}
                      onPickPrompt={(prompt) => {
                        pushUserThenBot(
                          prompt,
                          `已记录：${prompt}。我会按当前空间「${data.spaceName}」继续推进。`,
                        )
                      }}
                      onBackToList={() => openEduDiskListCardInChat()}
                      onEnterTeachingMaterials={() =>
                        openEduTeachingMaterialsBrowserInChat({
                          userText: `进入「${data.spaceName} · 教育微盘 / 教学资料」`,
                        })
                      }
                      onUploadFile={() =>
                        pushUserThenBot(
                          "上传文件到根目录",
                          `已为你打开上传通道（${data.spaceName} · 根目录）。如果是某节课的资料，建议先进入「教学资料 / {课程} / 第 N 节」，避免后续整理。`,
                        )
                      }
                      onCreateFolder={() =>
                        pushUserThenBot(
                          "新建文件夹",
                          `已在 ${data.spaceName} · 根目录新建占位文件夹（待重命名）。如果想按课程组织，建议直接使用「教学资料」目录。`,
                        )
                      }
                    />
                  )
                })()}
                {renderDockFollowUpStrip(msg)}
              </div>
            </div>
          ) : isEduTeachingMaterialsBrowserCard ? (
            <div
              className={cn(
                "flex flex-col md:flex-row gap-[6px] md:gap-[8px] w-full md:w-[calc(100%-44px)] justify-start group",
                hideAvatar ? "-mt-[var(--space-400)]" : "",
              )}
            >
              {!hideAvatar ? (
                <Avatar className="w-[28px] h-[28px] md:w-[36px] md:h-[36px] shrink-0">
                  <AvatarImage src={conversation.user.avatar} />
                </Avatar>
              ) : (
                <div className="hidden md:block w-[36px] shrink-0" />
              )}
              <div className="w-full">
                {renderReplyOrgContextBanner(msg, isEducationContext)}
                {(() => {
                  const parsed = parseEduTeachingMaterialsBrowserMarkerContent(msg.content)
                  if (!parsed) {
                    return (
                      <p className="m-0 text-[length:var(--font-size-sm)] leading-relaxed text-text-secondary">
                        教学资料浏览卡暂时无法解析。
                      </p>
                    )
                  }
                  return (
                    <EduTeachingMaterialsBrowserCard
                      payload={parsed}
                      onPickPrompt={(prompt) => {
                        pushUserThenBot(prompt, `已记录：${prompt}。`)
                      }}
                    />
                  )
                })()}
                {renderDockFollowUpStrip(msg)}
              </div>
            </div>
          ) : isEduCourseFulfillmentCard ? (
            <div
              className={cn(
                "flex flex-col md:flex-row gap-[6px] md:gap-[8px] w-full md:w-[calc(100%-44px)] justify-start group",
                hideAvatar ? "-mt-[var(--space-400)]" : "",
              )}
            >
              {!hideAvatar ? (
                <Avatar className="w-[28px] h-[28px] md:w-[36px] md:h-[36px] shrink-0">
                  <AvatarImage src={conversation.user.avatar} />
                </Avatar>
              ) : (
                <div className="hidden md:block w-[36px] shrink-0" />
              )}
              <div className="w-full">
                {renderReplyOrgContextBanner(msg, isEducationContext)}
                {(() => {
                  const rawRole = msg.content.slice(`${EDU_COURSE_FULFILLMENT_CARD_MARKER}:`.length)
                  const role: EduSceneRole =
                    rawRole === "teacher" || rawRole === "student" || rawRole === "parent" || rawRole === "admin"
                      ? rawRole
                      : "teacher"
                  return (
                    <EduCourseFulfillmentCard
                      role={role}
                      educationStage={educationStage}
                      ctx={{
                        orgId: currentOrg,
                        scenario,
                      }}
                      onOpenSeries={(seriesId, hint) => {
                        const mapFulfillmentActionToCommand = (
                          actionLabel: string | undefined,
                          viewerRole: EduSceneRole,
                        ): { command: string; kind: "skill" | "open-only" } | null => {
                          if (!actionLabel) return null
                          if (actionLabel === "资料") return { command: "看本节课资料", kind: "skill" }
                          if (actionLabel === "签到") {
                            if (viewerRole === "teacher") return { command: "看本周签到明细", kind: "skill" }
                            if (viewerRole === "student") return { command: "看我的签到记录", kind: "skill" }
                            return { command: "看孩子的签到记录", kind: "skill" }
                          }
                          if (actionLabel === "请假") {
                            if (viewerRole === "teacher") return { command: "查看本节请假情况", kind: "skill" }
                            if (viewerRole === "student") return { command: "我要请假", kind: "skill" }
                            return { command: "代孩子请假", kind: "skill" }
                          }
                          if (actionLabel === "作业") {
                            if (viewerRole === "teacher") return { command: "布置今晚作业", kind: "skill" }
                            if (viewerRole === "student") return { command: "我的作业", kind: "skill" }
                            return { command: "看孩子今晚作业", kind: "skill" }
                          }
                          if (actionLabel === "风采点评") {
                            return {
                              command: viewerRole === "teacher" ? "风采点评" : "风采报告",
                              kind: "skill",
                            }
                          }
                          if (actionLabel === "沟通") {
                            if (viewerRole === "teacher") return { command: "给学生家长发消息", kind: "skill" }
                            if (viewerRole === "student") return { command: "私聊老师", kind: "skill" }
                            return { command: "和王老师私聊", kind: "skill" }
                          }
                          return null
                        }
                        /**
                         * "履约卡 → 子CUI 状态对齐" 处理：
                         *
                         * 履约卡 row 的状态来自真实时间（Date.now() vs occurrence 时间），
                         * 子 CUI 的欢迎语 / 价值卡 / chip 由 `educationStage` 驱动，
                         * 两者本来不联动 → 容易出现"卡片显示待开始，进去就是已完课"的语义打架。
                         *
                         * 修复策略：所有系列（不论主线 / 非主线、seed / 用户创建）打开时，
                         * 都把 hint.runtimeStatus 映射到 EducationStage 并同步：
                         *   completed → post / in → in / soon | pending → pre
                         *
                         * 配合 `AiClassroomSideConversationPanel` 内的 stageOverridden 机制，
                         * 父级 hint 切 stage 之后，子 panel 的 effectiveStage 立即跟随 stage，
                         * 不再被 outline staticStatus 锁定，从而欢迎语 / 卡片与履约卡保持一致。
                         */
                        if (hint?.runtimeStatus && onEducationStageChange) {
                          const desired: EducationStage =
                            hint.runtimeStatus === "in"
                              ? "in"
                              : hint.runtimeStatus === "completed"
                                ? "post"
                                : "pre"
                          if (desired !== educationStage) {
                            onEducationStageChange(desired)
                          }
                        }
                        const openCommand = mapFulfillmentActionToCommand(hint?.actionLabel, role)
                        openAiClassroomSeriesSidePanel({
                          seriesId,
                          source: "schedule",
                          targetOutlineIndex: hint?.lessonNumber,
                          command: openCommand?.command,
                          kind: openCommand?.kind,
                        })
                      }}
                    />
                  )
                })()}
                {renderDockFollowUpStrip(msg)}
              </div>
            </div>
          ) : isLessonOperationListCard ? (
            <div
              className={cn(
                "flex flex-col md:flex-row gap-[6px] md:gap-[8px] w-full md:w-[calc(100%-44px)] justify-start group",
                hideAvatar ? "-mt-[var(--space-400)]" : "",
              )}
            >
              {!hideAvatar ? (
                <Avatar className="w-[28px] h-[28px] md:w-[36px] md:h-[36px] shrink-0">
                  <AvatarImage src={conversation.user.avatar} />
                </Avatar>
              ) : (
                <div className="hidden md:block w-[36px] shrink-0" />
              )}
              <div className="w-full">
                {renderReplyOrgContextBanner(msg, isEducationContext)}
                {(() => {
                  const parsed = parseLessonOperationListCardContent(msg.content)
                  if (!parsed) {
                    return (
                      <p className="m-0 text-[length:var(--font-size-sm)] leading-relaxed text-text-secondary">
                        教学管理列表卡解析失败。
                      </p>
                    )
                  }
                  /**
                   * 行点击 → 子 CUI 命令映射：完全复用履约卡同款映射，
                   * 让「教学管理 → 资料 / 考勤 / 作业 / 风采」与「履约卡 → 同款图标」殊途同归到同一张子卡。
                   * （映射函数与履约卡分支内联定义一致；此处独立一份，避免跨分支耦合。）
                   *
                   * `actionLabel` 优先级高于 `kind` 默认动作：考勤行展开后，单条学员的
                   * "请假" / "调课" 通过透传 actionOverride 让 hint.actionLabel 变成
                   * "请假" / "调课"（而不是默认的"签到"），这里就把它路由到对应子卡。
                   * 对应子 CUI `AiClassroomSideConversationPanel` 已有命令解析（见 isLeavePrompt /
                   * isReschedulePrompt 分支）→ push 请假卡 / 调课卡，不再回退到签到卡。
                   */
                  const mapToCommand = (
                    kind: typeof parsed.kind,
                    actionLabel: string | undefined,
                    viewerRole: EduSceneRole,
                  ): { command: string; kind: "skill" | "open-only" } | null => {
                    if (actionLabel === "请假") {
                      if (viewerRole === "teacher" || viewerRole === "admin")
                        return { command: "查看本节请假情况", kind: "skill" }
                      if (viewerRole === "student") return { command: "我要请假", kind: "skill" }
                      return { command: "代孩子请假", kind: "skill" }
                    }
                    if (actionLabel === "调课") {
                      if (viewerRole === "teacher" || viewerRole === "admin")
                        return { command: "发起调课并通知学生家长", kind: "skill" }
                      if (viewerRole === "student") return { command: "申请调课", kind: "skill" }
                      return { command: "代孩子发起调课申请", kind: "skill" }
                    }
                    if (kind === "materials") return { command: "看本节课资料", kind: "skill" }
                    if (kind === "attendance") {
                      if (viewerRole === "teacher" || viewerRole === "admin")
                        return { command: "看本周签到明细", kind: "skill" }
                      if (viewerRole === "student")
                        return { command: "看我的签到记录", kind: "skill" }
                      return { command: "看孩子的签到记录", kind: "skill" }
                    }
                    if (kind === "homework") {
                      if (viewerRole === "teacher" || viewerRole === "admin")
                        return { command: "布置今晚作业", kind: "skill" }
                      if (viewerRole === "student")
                        return { command: "我的作业", kind: "skill" }
                      return { command: "看孩子今晚作业", kind: "skill" }
                    }
                    return {
                      command:
                        viewerRole === "teacher" || viewerRole === "admin"
                          ? "风采点评"
                          : "风采报告",
                      kind: "skill",
                    }
                  }
                  return (
                    <LessonOperationListCard
                      role={parsed.role}
                      kind={parsed.kind}
                      ctx={{ orgId: currentOrg, scenario }}
                      onOpenSeries={(seriesId, hint) => {
                        const openCommand = mapToCommand(
                          parsed.kind,
                          hint.actionLabel,
                          parsed.role,
                        )
                        /**
                         * 「教学管理列表卡 → 子CUI 状态对齐」
                         *
                         * 与履约卡 ↑ 同款机制：本卡 row 状态来自真实时间
                         * （deriveStatus(occurrence, nowTs)），子 CUI 的欢迎语 / 价值卡 / chip
                         * 由 `educationStage` 驱动；不联动会出现「卡片显示上课中，进去就是
                         * 已完课」的语义打架。
                         *
                         * 透下来的 `hint.runtimeStatus` 映射到 EducationStage 并同步：
                         *   completed → post / in → in / soon | pending → pre
                         *
                         * 配合 `AiClassroomSideConversationPanel` 的 stageOverridden 机制，
                         * 父级切 stage 之后子 panel 的 effectiveStage 立即跟随，
                         * 风采 / 资料 / 考勤 / 作业 4 张子卡都会按目标 stage 路由到正确子型。
                         */
                        if (hint.runtimeStatus && onEducationStageChange) {
                          const desired: EducationStage =
                            hint.runtimeStatus === "in"
                              ? "in"
                              : hint.runtimeStatus === "completed"
                                ? "post"
                                : "pre"
                          if (desired !== educationStage) {
                            onEducationStageChange(desired)
                          }
                        }
                        openAiClassroomSeriesSidePanel({
                          seriesId,
                          source: "schedule",
                          targetOutlineIndex: hint.lessonNumber,
                          command: openCommand?.command,
                          kind: openCommand?.kind,
                        })
                      }}
                    />
                  )
                })()}
                {renderDockFollowUpStrip(msg)}
              </div>
            </div>
          ) : isLiveLessonHintCard ? (
            <div
              className={cn(
                "flex flex-col md:flex-row gap-[6px] md:gap-[8px] w-full md:w-[calc(100%-44px)] justify-start group",
                hideAvatar ? "-mt-[var(--space-400)]" : "",
              )}
            >
              {!hideAvatar ? (
                <Avatar className="w-[28px] h-[28px] md:w-[36px] md:h-[36px] shrink-0">
                  <AvatarImage src={conversation.user.avatar} />
                </Avatar>
              ) : (
                <div className="hidden md:block w-[36px] shrink-0" />
              )}
              <div className="w-full">
                {renderReplyOrgContextBanner(msg, isEducationContext)}
                {(() => {
                  const role = msg.content.slice(`${LIVE_LESSON_HINT_CARD_MARKER}:`.length)
                  if (role !== "teacher" && role !== "student" && role !== "parent") {
                    return (
                      <p className="m-0 text-[length:var(--font-size-sm)] leading-relaxed text-text-secondary">
                        课程进行中卡片解析失败。
                      </p>
                    )
                  }
                  return (
                    <LiveLessonHintCard
                      role={role}
                      deliveryMode={lessonDeliveryMode}
                      onEnterLesson={() =>
                        /**
                         * Hero「课程进行中」卡片"进入本节"按钮。
                         * `kind: "open-only"`：仅打开容器，由侧 CUI 主动开场（含 3 个 chip）。
                         */
                        openAiClassroomSidePanel({
                          lessonId: DEMO_LESSON.id,
                          command: "进入本节 AI 课堂",
                          source: "hero",
                          kind: "open-only",
                        })
                      }
                    />
                  )
                })()}
                {renderDockFollowUpStrip(msg)}
              </div>
            </div>
          ) : isEduLessonPicker ? (
            /**
             * 教育主对话「主开场 chip」course-pick 分支：
             * 用户先点了"帮我备节课 / 我要做错题挑战"等课程粒度 chip，主对话先 push 这张选课卡，
             * 用户在卡内点某节课 → `handleEduRoleSkillCommand(intentPrompt, { lessonId, source: "user" })`
             * → 该课的子 CUI 自动以 `kind:"skill"` 执行 intentPrompt。
             */
            <div
              className={cn(
                "flex flex-col md:flex-row gap-[6px] md:gap-[8px] w-full md:w-[calc(100%-44px)] justify-start group",
                hideAvatar ? "-mt-[var(--space-400)]" : "",
              )}
            >
              {!hideAvatar ? (
                <Avatar className="w-[28px] h-[28px] md:w-[36px] md:h-[36px] shrink-0">
                  <AvatarImage src={conversation.user.avatar} />
                </Avatar>
              ) : (
                <div className="hidden md:block w-[36px] shrink-0" />
              )}
              <div className="w-full">
                {renderReplyOrgContextBanner(msg, isEducationContext)}
                {(() => {
                  const payload = parseEduLessonPickerPayload(msg.content)
                  if (!payload) {
                    return (
                      <p className="m-0 text-[length:var(--font-size-sm)] leading-relaxed text-text-secondary">
                        选课卡片暂时无法解析。
                      </p>
                    )
                  }
                  return (
                    <EduLessonPickerCard
                      payload={payload}
                      stage={educationStage}
                      onPickLesson={({ lessonId, intentPrompt }) =>
                        handleEduRoleSkillCommand(intentPrompt, {
                          lessonId,
                          source: "user",
                        })
                      }
                    />
                  )
                })()}
                {renderDockFollowUpStrip(msg)}
              </div>
            </div>
          ) : isMainLessonReviewCard ? (
            /**
             * 主对话内嵌「风采报告卡」（学生 / 家长侧）：
             * - 由 IM banner 点击「老师已发送《xxx》风采报告」触发：encodeMainLessonReviewMarker
             * - 直接复用 `LessonReviewCard`，stage 固定为 "post"（IM 消息本身代表已发送的报告），
             *   role 来自 marker，lessonId / lessonTitle 直接从 marker payload 取
             */
            <div
              className={cn(
                "flex flex-col md:flex-row gap-[6px] md:gap-[8px] w-full md:w-[calc(100%-44px)] justify-start group",
                hideAvatar ? "-mt-[var(--space-400)]" : "",
              )}
            >
              {!hideAvatar ? (
                <Avatar className="w-[28px] h-[28px] md:w-[36px] md:h-[36px] shrink-0">
                  <AvatarImage src={conversation.user.avatar} />
                </Avatar>
              ) : (
                <div className="hidden md:block w-[36px] shrink-0" />
              )}
              <div className="w-full">
                {renderReplyOrgContextBanner(msg, isEducationContext)}
                {(() => {
                  const parsed = parseMainLessonReviewMarker(msg.content)
                  if (!parsed) {
                    return (
                      <p className="m-0 text-[length:var(--font-size-sm)] leading-relaxed text-text-secondary">
                        这条消息暂时无法显示，请刷新页面重试。
                      </p>
                    )
                  }
                  return (
                    <LessonReviewCard
                      role={parsed.role}
                      lessonId={parsed.lessonId}
                      lessonTitle={parsed.lessonTitle}
                      stage="post"
                    />
                  )
                })()}
                {renderDockFollowUpStrip(msg)}
              </div>
            </div>
          ) : isAdminBusinessCard ? (
            /**
             * 校长主开场 chip 业务卡（与三身份"进 AI 课堂侧 CUI 看 skill 卡"对称的 admin 路径）：
             * - 卡内 recommendedPrompts 点击会回灌 handleEduFirstEntryChip，命中已登记的 chip → 再出一张 admin 卡，
             *   未登记的 prompt 兜底到 `educationMainChipMeta` directReply / course-pick 链路，构成连续闭环
             */
            <div
              className={cn(
                "flex flex-col md:flex-row gap-[6px] md:gap-[8px] w-full md:w-[calc(100%-44px)] justify-start group",
                hideAvatar ? "-mt-[var(--space-400)]" : "",
              )}
            >
              {!hideAvatar ? (
                <Avatar className="w-[28px] h-[28px] md:w-[36px] md:h-[36px] shrink-0">
                  <AvatarImage src={conversation.user.avatar} />
                </Avatar>
              ) : (
                <div className="hidden md:block w-[36px] shrink-0" />
              )}
              <div className="w-full">
                {renderReplyOrgContextBanner(msg, isEducationContext)}
                {(() => {
                  const adminCardId = msg.content.slice(`${ADMIN_BUSINESS_CARD_MARKER}:`.length)
                  const data = getAdminBusinessCardData(adminCardId)
                  if (!data) {
                    return (
                      <p className="m-0 text-[length:var(--font-size-sm)] leading-relaxed text-text-secondary">
                        这条回复暂时无法显示，请刷新页面重试。
                      </p>
                    )
                  }
                  return (
                    <AdminBusinessCard
                      data={data}
                      onPickPrompt={(prompt) => handleEduFirstEntryChip(prompt)}
                    />
                  )
                })()}
                {renderDockFollowUpStrip(msg)}
              </div>
            </div>
          ) : isAicReply ? (
            /**
             * 教育主对话「主开场 chip」direct 分支 / 任意结构化 AI 回复：
             * 共享 `AiClassroomStructuredReplyBubble`（与子 CUI 同款，气泡内自带头像），
             * 下方 chip 行点击会再次走 `handleEduFirstEntryChip`，构成连续闭环。
             */
            <div
              className={cn(
                "w-full md:w-[calc(100%-44px)]",
                hideAvatar ? "-mt-[var(--space-400)]" : "",
              )}
            >
              {renderReplyOrgContextBanner(msg, isEducationContext)}
              {(() => {
                const reply = parseAiClassroomReply(msg.content)
                if (!reply) {
                  return (
                    <p className="m-0 text-[length:var(--font-size-sm)] leading-relaxed text-text-secondary">
                      这条回复暂时无法显示，请刷新页面重试。
                    </p>
                  )
                }
                return (
                  <AiClassroomStructuredReplyBubble
                    reply={reply}
                    botAvatarSrc={conversation.user.avatar}
                    avatarClassName={cn(hideAvatar ? "invisible" : undefined)}
                    onPickAction={(prompt) => handleEduFirstEntryChip(prompt)}
                  />
                )
              })()}
              {renderDockFollowUpStrip(msg)}
            </div>
          ) : isEduSpaceInstBlocked ? (
            <div
              className={cn(
                "flex flex-col md:flex-row gap-[6px] md:gap-[8px] w-full md:w-[calc(100%-44px)] justify-start group",
                hideAvatar ? "-mt-[var(--space-400)]" : "",
              )}
            >
              {!hideAvatar ? (
                <Avatar className="w-[28px] h-[28px] md:w-[36px] md:h-[36px] shrink-0">
                  <AvatarImage src={conversation.user.avatar} />
                </Avatar>
              ) : (
                <div className="hidden md:block w-[36px] shrink-0" />
              )}
              <div className="w-full">
                {renderReplyOrgContextBanner(msg, isEducationContext)}
                <GenericCard title="创建机构教育空间">
                  <p className="text-[length:var(--font-size-sm)] text-text-secondary leading-relaxed m-0 mb-[var(--space-300)]">
                    机构教育空间必须从属于一个组织。你当前尚未加入任何组织，请先加入或创建一个组织后，再创建机构教育空间。
                  </p>
                  <div className="flex flex-wrap gap-[var(--space-200)]">
                    <ChatPromptButton type="button" onClick={() => handleSendMessage("加入组织")}>
                      加入组织
                    </ChatPromptButton>
                    <ChatPromptButton type="button" onClick={() => handleSendMessage("创建组织")}>
                      创建组织
                    </ChatPromptButton>
                  </div>
                </GenericCard>
                {renderDockFollowUpStrip(msg)}
              </div>
            </div>
          ) : isEduSpaceFamilyRole ? (
            <div
              className={cn(
                "flex flex-col md:flex-row gap-[6px] md:gap-[8px] w-full md:w-[calc(100%-44px)] justify-start group",
                hideAvatar ? "-mt-[var(--space-400)]" : "",
              )}
            >
              {!hideAvatar ? (
                <Avatar className="w-[28px] h-[28px] md:w-[36px] md:h-[36px] shrink-0">
                  <AvatarImage src={conversation.user.avatar} />
                </Avatar>
              ) : (
                <div className="hidden md:block w-[36px] shrink-0" />
              )}
              <div className="w-full">
                {renderReplyOrgContextBanner(msg, isEducationContext)}
                <FamilyEducationRoleCard
                  onSelectRole={(role: FamilyCreatorRole) => {
                    const stamp = () =>
                      new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                    const userLine =
                      role === "parent"
                        ? "我是家长，为孩子创建家庭教育空间"
                        : "我是学生，为自己创建学习空间"
                    appendTranscript((prev) => [
                      ...prev,
                      {
                        id: `edu-role-u-${Date.now()}`,
                        senderId: currentUser.id,
                        content: userLine,
                        timestamp: stamp(),
                        createdAt: Date.now(),
                      },
                    ])
                    window.setTimeout(() => {
                      appendTranscript((prev) => [
                        ...prev,
                        {
                          id: `edu-role-form-${Date.now()}`,
                          senderId: conversation.user.id,
                          content: `${EDU_SPACE_FAMILY_FORM_MARKER}:${JSON.stringify({ creatorRole: role })}`,
                          timestamp: stamp(),
                          createdAt: Date.now(),
                          isAfterPrompt: true,
                        },
                      ])
                      scrollRef.current?.scrollIntoView({ behavior: "smooth" })
                    }, 420)
                  }}
                />
                {renderDockFollowUpStrip(msg)}
              </div>
            </div>
          ) : isEduSpaceFamilyForm ? (
            <div
              className={cn(
                "flex flex-col md:flex-row gap-[6px] md:gap-[8px] w-full md:w-[calc(100%-44px)] justify-start group",
                hideAvatar ? "-mt-[var(--space-400)]" : "",
              )}
            >
              {!hideAvatar ? (
                <Avatar className="w-[28px] h-[28px] md:w-[36px] md:h-[36px] shrink-0">
                  <AvatarImage src={conversation.user.avatar} />
                </Avatar>
              ) : (
                <div className="hidden md:block w-[36px] shrink-0" />
              )}
              <div className="w-full">
                {renderReplyOrgContextBanner(msg, isEducationContext)}
                {(() => {
                  try {
                    const rawJson = msg.content.slice(EDU_SPACE_FAMILY_FORM_MARKER.length + 1)
                    const { creatorRole } = JSON.parse(rawJson) as { creatorRole: FamilyCreatorRole }
                    return (
                      <CreateFamilyEducationSpaceCard
                        creatorRole={creatorRole}
                        onSubmit={({ name }) => {
                          const stamp = () =>
                            new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                          appendTranscript((prev) => [
                            ...prev,
                            {
                              id: `edu-fam-submit-u-${Date.now()}`,
                              senderId: currentUser.id,
                              content: `创建空间：${name}`,
                              timestamp: stamp(),
                              createdAt: Date.now(),
                            },
                          ])
                          window.setTimeout(() => {
                            const rec: DemoEducationSpaceRecord = {
                              id: `edu-space-family-${Date.now()}`,
                              name,
                              kind: "family",
                              createdAt: Date.now(),
                            }
                            setEducationSpaces((prev) => [...prev, rec])
                            setCurrentEducationSpaceId(rec.id)
                            appendTranscript((prev) => [
                              ...prev,
                              {
                                id: `edu-fam-success-${Date.now()}`,
                                senderId: conversation.user.id,
                                content: `${EDU_SPACE_CREATED_MARKER}:${JSON.stringify({
                                  spaceName: name,
                                  kind: "family",
                                })}`,
                                timestamp: stamp(),
                                createdAt: Date.now(),
                                isAfterPrompt: true,
                              },
                            ])
                            scrollRef.current?.scrollIntoView({ behavior: "smooth" })
                          }, 450)
                        }}
                      />
                    )
                  } catch {
                    return <div className="text-error">身份数据解析失败</div>
                  }
                })()}
                {renderDockFollowUpStrip(msg)}
              </div>
            </div>
          ) : isEduSpaceInstForm ? (
            <div
              className={cn(
                "flex flex-col md:flex-row gap-[6px] md:gap-[8px] w-full md:w-[calc(100%-44px)] justify-start group",
                hideAvatar ? "-mt-[var(--space-400)]" : "",
              )}
            >
              {!hideAvatar ? (
                <Avatar className="w-[28px] h-[28px] md:w-[36px] md:h-[36px] shrink-0">
                  <AvatarImage src={conversation.user.avatar} />
                </Avatar>
              ) : (
                <div className="hidden md:block w-[36px] shrink-0" />
              )}
              <div className="w-full">
                {renderReplyOrgContextBanner(msg, isEducationContext)}
                <CreateInstitutionalEducationSpaceCard
                  adminCompanyOptions={organizations.map((o) => o.name).filter(Boolean)}
                  onSubmit={(data: InstitutionalEducationSpacePayload) => {
                    const stamp = () =>
                      new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                    const matchedOrg =
                      organizations.find((o) => o.name === data.adminCompany.trim()) ??
                      organizations[0]
                    appendTranscript((prev) => [
                      ...prev,
                      {
                        id: `edu-inst-submit-u-${Date.now()}`,
                        senderId: currentUser.id,
                        content: `提交创建机构教育空间：${data.name}`,
                        timestamp: stamp(),
                        createdAt: Date.now(),
                      },
                    ])
                    window.setTimeout(() => {
                      const rec: DemoEducationSpaceRecord = {
                        id: `edu-space-inst-${Date.now()}`,
                        name: data.name,
                        kind: "institutional",
                        hostOrganizationId: matchedOrg?.id,
                        hostOrganizationName: matchedOrg?.name ?? data.adminCompany.trim(),
                        createdAt: Date.now(),
                      }
                      setEducationSpaces((prev) => [...prev, rec])
                      setCurrentEducationSpaceId(rec.id)
                      if (matchedOrg) {
                        setCurrentOrg(matchedOrg.id)
                      }
                      appendTranscript((prev) => [
                        ...prev,
                        {
                          id: `edu-inst-success-${Date.now()}`,
                          senderId: conversation.user.id,
                          content: `${EDU_SPACE_CREATED_MARKER}:${JSON.stringify({
                            spaceName: data.name,
                            kind: "institutional",
                          })}`,
                          timestamp: stamp(),
                          createdAt: Date.now(),
                          isAfterPrompt: true,
                        },
                      ])
                      scrollRef.current?.scrollIntoView({ behavior: "smooth" })
                    }, 450)
                  }}
                />
                {renderDockFollowUpStrip(msg)}
              </div>
            </div>
          ) : isEduSpaceCreated ? (
            <div
              className={cn(
                "flex flex-col md:flex-row gap-[6px] md:gap-[8px] w-full md:w-[calc(100%-44px)] justify-start group",
                hideAvatar ? "-mt-[var(--space-400)]" : "",
              )}
            >
              {!hideAvatar ? (
                <Avatar className="w-[28px] h-[28px] md:w-[36px] md:h-[36px] shrink-0">
                  <AvatarImage src={conversation.user.avatar} />
                </Avatar>
              ) : (
                <div className="hidden md:block w-[36px] shrink-0" />
              )}
              <div className="w-full">
                {renderReplyOrgContextBanner(msg, isEducationContext)}
                {(() => {
                  try {
                    const rawJson = msg.content.slice(EDU_SPACE_CREATED_MARKER.length + 1)
                    const payload = JSON.parse(rawJson) as {
                      spaceName: string
                      kind: "family" | "institutional"
                    }
                    return (
                      <EducationSpaceCreatedCard
                        spaceName={payload.spaceName}
                        kind={payload.kind}
                        onInviteMembers={() => handleSendMessage("我想邀请成员加入教育空间")}
                        onCreatePlan={() => handleSendMessage("帮我创建一个学习计划")}
                        onGoToEducationSpace={
                          !isEducationContext ? () => openPortalRootApp("education") : undefined
                        }
                      />
                    )
                  } catch {
                    return <div className="text-error">创建结果数据解析失败</div>
                  }
                })()}
                {renderDockFollowUpStrip(msg)}
              </div>
            </div>
          ) : isCreateOrgSuccess ? (
            <div className={cn(
              "flex flex-col md:flex-row gap-[6px] md:gap-[8px] w-full md:w-[calc(100%-44px)] justify-start group",
              hideAvatar ? "-mt-[var(--space-400)]" : ""
            )}>
              {!hideAvatar ? (
                <Avatar className="w-[28px] h-[28px] md:w-[36px] md:h-[36px] shrink-0">
                  <AvatarImage src={conversation.user.avatar} />
                </Avatar>
              ) : (
                <div className="hidden md:block w-[36px] shrink-0" />
              )}
              <div className="w-full">
                {renderReplyOrgContextBanner(msg, isEducationContext)}
                {(() => {
                  try {
                    const successData = JSON.parse(msg.content.replace(`${CREATE_ORG_SUCCESS_MARKER}:`, ""))
                    const isEducationIndustry =
                      successData.isEducationIndustry === true || successData.industry === "教育行业"
                    const successIntro = isEducationIndustry
                      ? "创建成功！接下来您可以：创建教育空间、邀请员工、激活邮箱并进入教育空间协作。"
                      : "创建成功！接下来您可以：邀请员工、激活邮箱并进入工作台协作。"

                    const pushLine = (userLine: string, botLine: string) => {
                      pushUserThenBot(userLine, botLine)
                    }

                    return (
                      <>
                        <div className="mb-[var(--space-300)] w-full max-w-[min(600px,100%)] rounded-tl-sm rounded-tr-lg rounded-bl-lg rounded-br-lg border border-border bg-bg p-[var(--space-350)] shadow-xs">
                          <p className="text-[length:var(--font-size-base)] font-[var(--font-weight-regular)] leading-normal text-text">
                            {successIntro}
                          </p>
                        </div>

                        <CreateOrgSuccessCard
                          orgName={successData.orgName}
                          country={successData.country}
                          industry={successData.industry}
                        />

                        <div className="mb-[var(--space-200)] mt-[var(--space-300)] flex flex-wrap gap-[var(--space-200)]">
                          {isEducationIndustry ? (
                            <ChatPromptButton
                              onClick={() =>
                                pushUserThenBot(
                                  "创建教育空间",
                                  `${EDU_SPACE_TYPE_SELECT_MARKER}:${JSON.stringify({
                                    orgName: successData.orgName,
                                  })}`,
                                )
                              }
                            >
                              创建教育空间
                            </ChatPromptButton>
                          ) : null}
                          <ChatPromptButton
                            onClick={() =>
                              pushLine(
                                "邀请员工",
                                `已打开「${successData.orgName}」成员邀请入口（演示）。可复制邀请链接或生成邀请码。`,
                              )
                            }
                          >
                            邀请员工
                          </ChatPromptButton>
                          <ChatPromptButton
                            onClick={() => {
                              handleOrgSwitch(successData.orgId)
                              pushLine(
                                "进入工作台",
                                `已切换到「${successData.orgName}」并打开工作台（演示）。`,
                              )
                            }}
                          >
                            进入工作台
                          </ChatPromptButton>
                          <ChatPromptButton
                            onClick={() =>
                              pushLine(
                                "激活邮箱",
                                `已发起「${successData.orgName}」官方邮箱「${successData.email}」激活流程（演示）。`,
                              )
                            }
                          >
                            激活邮箱
                          </ChatPromptButton>
                        </div>
                      </>
                    )
                  } catch (e) {
                    return (
                      <div className="text-[length:var(--font-size-sm)] text-[color:var(--color-error)]">
                        成功数据解析失败
                      </div>
                    )
                  }
                })()}
                {renderDockFollowUpStrip(msg)}
              </div>
            </div>
          ) : isJoinOrgForm ? (
            <div className={cn(
              "flex flex-col md:flex-row gap-[6px] md:gap-[8px] w-full md:w-[calc(100%-44px)] justify-start group",
              hideAvatar ? "-mt-[var(--space-400)]" : ""
            )}>
              {!hideAvatar ? (
                <Avatar className="w-[28px] h-[28px] md:w-[36px] md:h-[36px] shrink-0">
                  <AvatarImage src={conversation.user.avatar} />
                </Avatar>
              ) : (
                <div className="hidden md:block w-[36px] shrink-0" />
              )}
              <div className="w-full">
                {renderReplyOrgContextBanner(msg, isEducationContext)}
                <JoinOrgFormCard
                  onSubmit={(code) => handleJoinOrgSubmit(code, isEducationContext)}
                  onCancel={() => {
                    // 可选：返回组织切换器
                  }}
                />
                {renderDockFollowUpStrip(msg)}
              </div>
            </div>
          ) : isJoinOrgConfirm ? (
            <div className={cn(
              "flex flex-col md:flex-row gap-[6px] md:gap-[8px] w-full md:w-[calc(100%-44px)] justify-start group",
              hideAvatar ? "-mt-[var(--space-400)]" : ""
            )}>
              {!hideAvatar ? (
                <Avatar className="w-[28px] h-[28px] md:w-[36px] md:h-[36px] shrink-0">
                  <AvatarImage src={conversation.user.avatar} />
                </Avatar>
              ) : (
                <div className="hidden md:block w-[36px] shrink-0" />
              )}
              <div className="w-full">
                {renderReplyOrgContextBanner(msg, isEducationContext)}
                {(() => {
                  try {
                    const confirmData = JSON.parse(msg.content.replace(`${JOIN_ORG_CONFIRM_MARKER}:`, ""));
                    return (
                      <JoinOrgConfirmCard
                        orgId={confirmData.orgId}
                        orgName={confirmData.orgName}
                        orgIcon={confirmData.orgIcon}
                        memberCount={confirmData.memberCount}
                        description={confirmData.description}
                        onConfirm={(id) => handleConfirmJoinOrg(id, isEducationContext)}
                        onCancel={() => {
                          // 可选：返回组织切换器
                        }}
                      />
                    )
                  } catch (e) {
                    return <div className="text-error">确认数据解析失败</div>
                  }
                })()}
                {renderDockFollowUpStrip(msg)}
              </div>
            </div>
          ) : isEduWelcomeWeiwei ? (
            <div
              className={cn(
                "flex flex-col md:flex-row gap-[6px] md:gap-[8px] w-full md:w-[calc(100%-44px)] justify-start group",
                hideAvatar ? "-mt-[var(--space-400)]" : "",
              )}
            >
              {!hideAvatar ? (
                <Avatar className="w-[28px] h-[28px] md:w-[36px] md:h-[36px] shrink-0">
                  <AvatarImage src={conversation.user.avatar} />
                </Avatar>
              ) : (
                <div className="hidden md:block w-[36px] shrink-0" />
              )}
              <div className="w-full">
                {renderReplyOrgContextBanner(msg, isEducationContext)}
                <EduWelcomeWeiweiCard
                  onSelectFamily={() => handleSendMessage("创建家庭教育空间")}
                  onSelectInstitution={() => handleSendMessage("创建机构教育空间")}
                />
                {renderDockFollowUpStrip(msg)}
              </div>
            </div>
          ) : isEmployeeMgmt ? (
            canRenderEmployeeMgmtCard ? (
              <div
                className={cn(
                  "flex w-full flex-col gap-3 md:w-[calc(100%-44px)]",
                  hideAvatar ? "-mt-[var(--space-400)]" : ""
                )}
              >
                <div className="flex w-full flex-col gap-[6px] justify-start group md:flex-row md:gap-[8px]">
                  {!hideAvatar ? (
                    <Avatar className="h-[28px] w-[28px] shrink-0 md:h-[36px] md:w-[36px]">
                      <AvatarImage src={conversation.user.avatar} />
                    </Avatar>
                  ) : (
                    <div className="hidden w-[36px] shrink-0 md:block" />
                  )}
                  <div className="min-w-0 flex-1">
                    {renderMainCuiCardOrgAttributionBanner(msg, isEducationContext, "employee")}
                    {renderReplyOrgContextBanner(msg, isEducationContext)}
                    <EmployeeManagementPanel
                      organizationId={currentOrg}
                      inviteRecords={employeeInviteRecordsForScope}
                      onInviteRecordsChange={updateEmployeeInviteRecords}
                    />
                  </div>
                </div>
                {msg.cuiFollowUpPrompts?.length ? (
                  <ScenarioTwoMultiFollowUpGrid
                    right={
                      <DockCuiFollowUpStrip
                        prompts={msg.cuiFollowUpPrompts}
                        sendTexts={msg.cuiFollowUpSendTexts}
                        onSend={(text) => handleSendMessage(text)}
                        className="min-w-0 w-full max-w-full flex-wrap justify-end sm:ml-auto sm:w-auto sm:max-w-[min(100%,44rem)]"
                      />
                    }
                  />
                ) : null}
              </div>
            ) : (
              <ChatMessageBubble
                msg={{
                  ...msg,
                  content: "请在主 AI 或日程、会议、课程管理、员工应用中说「员工管理」等打开。",
                }}
                isMe={isMe}
                userAvatar={currentUser.avatar}
                aiAvatar={conversation.user.avatar}
                userName={isMe ? "Me" : conversation.user.name}
                isSpecialComponent={false}
                isPersonalInfo={isPersonalInfo}
                isCreateEmailForm={isCreateEmailForm}
                isContinueEmail={isContinueEmail}
                hideAvatar={hideAvatar}
                className={cn(
                  hideAvatar ? "-mt-[var(--space-400)]" : "",
                  isMe ? "flex-col-reverse md:flex-row" : ""
                )}
                handleEmailFormSubmit={handleEmailFormSubmit}
                handleContinueCreateEmail={handleContinueCreateEmail}
                dockSessionOrgDisplayName={
                  isEducationContext || hideDockOrgReplyBannerSession
                    ? null
                    : dockSessionOrgDisplayNameForMessages
                }
                onDockFollowUpSend={(text) => handleSendMessage(text)}
              />
            )
          ) : isMe && msg.vvMeta ? (
            <div
              className={cn(
                "flex flex-col md:flex-row w-full items-end md:items-start justify-end gap-[6px] md:gap-[8px]",
                hideAvatar ? "-mt-[var(--space-400)]" : ""
              )}
            >
              <div className="flex max-w-full flex-col items-end gap-[var(--space-150)] md:max-w-[calc(100%-44px)]">
                <VvUserBubble content={msg.content} vvMeta={msg.vvMeta} />
              </div>
              {!hideAvatar ? (
                <Avatar className="h-[28px] w-[28px] shrink-0 md:h-[36px] md:w-[36px]">
                  <AvatarImage src={currentUser.avatar} />
                </Avatar>
              ) : (
                <div className="hidden w-[36px] shrink-0 md:block" />
              )}
            </div>
          ) : msg.vvAssistant ? (
            <div
              className={cn(
                "group flex w-full flex-col justify-start gap-[6px] md:w-[calc(100%-44px)] md:flex-row md:gap-[8px]",
                hideAvatar ? "-mt-[var(--space-400)]" : ""
              )}
            >
              {!hideAvatar ? (
                <Avatar className="h-[28px] w-[28px] shrink-0 md:h-[36px] md:w-[36px]">
                  <AvatarImage src={conversation.user.avatar} />
                </Avatar>
              ) : (
                <div className="hidden w-[36px] shrink-0 md:block" />
              )}
              <div className="min-w-0 w-full">
                {renderReplyOrgContextBanner(msg, isEducationContext)}
                <VvAssistantBlocks
                  key={msg.id}
                  messageId={msg.id}
                  cardStatusLine={msg.vvCardStatusLine}
                  payload={msg.vvAssistant}
                  onVvAction={handleCalendarDockVvAction}
                  schedulePanelAppId={getConversationDockAppId(conversation)}
                  schedulePanelSurface="main"
                  scheduleMeetingItems={vvMeetingItems}
                />
                {renderDockFollowUpStrip(msg)}
              </div>
            </div>
          ) : (
            <ChatMessageBubble
              msg={msg}
              isMe={isMe}
              userAvatar={currentUser.avatar}
              aiAvatar={conversation.user.avatar}
              userName={isMe ? "Me" : conversation.user.name}
              isSpecialComponent={isSpecialComponent}
              isPersonalInfo={isPersonalInfo}
              isCreateEmailForm={isCreateEmailForm}
              isContinueEmail={isContinueEmail}
              hideAvatar={hideAvatar}
              className={cn(
                hideAvatar ? "-mt-[var(--space-400)]" : "",
                isMe ? "flex-col-reverse md:flex-row" : ""
              )}
              handleEmailFormSubmit={handleEmailFormSubmit}
              handleContinueCreateEmail={handleContinueCreateEmail}
              dockSessionOrgDisplayName={
                isEducationContext || hideDockOrgReplyBannerSession
                  ? null
                  : dockSessionOrgDisplayNameForMessages
              }
              onDockFollowUpSend={(text) => handleSendMessage(text)}
            />
          )}
        </div>
      )
    })
  }

  /** 场景五：《主CUI交互》= 顶栏全宽 + 其下 [会话列表 | 会话内容]，列表不占顶栏高度 */
  const scenarioFiveUnderBarLayout =
    isScenarioFiveLike(scenario) &&
    mainView === "cui" &&
    (activeApp === null || secondaryPortalOpen)

  const sessionSplit =
    !scenarioFiveUnderBarLayout &&
    mainView === "cui" &&
    (activeApp === null || secondaryPortalOpen) &&
    sessionListPinned &&
    historyOpen &&
    Boolean(onHistoryOpenChange && onSelect)

  /** 仅主 VVAI 会话顶栏展示「开启新会话」等；独立窗口内不再提供顶栏「新开会话」 */
  /** 独立窗口：主会话尚无消息时的一帧极简布局（注入引导前）；《主入口》已与场景二对齐为完整主会话空态，不再走此分支 */
  const showMainChatFreshInitLayout =
    isMainCuiStandaloneWindow &&
    conversation.id === cuiMainChatId &&
    messages.length === 0

  const scenarioZeroMainEmptyWelcome =
    isScenarioZeroNoOrg &&
    conversation.id === cuiMainChatId &&
    !isDockAppSession &&
    messages.length === 0

  /** 与场景二一致：主会话区静态问候；场景 0 主会话首进用专用文案 */
  const mainSessionWelcomeGreeting = scenarioZeroMainEmptyWelcome
    ? SCENARIO_ZERO_MAIN_CUI_GUIDE_GREETING
    : MAIN_CUI_GUIDE_GREETING

  const mainCuiToolbarActionsEligible =
    activeApp === null &&
    mainView === "cui" &&
    conversation.id === cuiMainChatId &&
    !isDockConversationId(conversation.id) &&
    onMainChatNewThread != null

  /** 主框架页可打开与《主CUI交互》同步的独立浏览器窗口（独立窗口内不再展示，避免嵌套） */
  const canOpenPairedStandaloneCui =
    !isMainCuiStandaloneWindow && onOpenStandaloneMainCui != null

  /**
   * 主 VVAI 会话由 mainCuiToolbarActions 提供独立窗口；dock 应用、教育/医院门户等仍须在顶栏右侧展示同一入口。
   */
  const showStandaloneWindowInNav =
    mainView === "cui" && canOpenPairedStandaloneCui && !mainCuiToolbarActionsEligible

  /** 与主会话 / dock 应用一致：栅格顶栏（左 VVAI+模型、中组织、右工具） */
  const navBarGridCui =
    mainView === "cui" && (activeApp === null || secondaryPortalOpen)

  return (
    <UserCalendarsProvider>
      <VvScheduleSideSheetContext.Provider value={scheduleSideSheetApi}>
        <ScheduleCalendarSettingsPrefsSync bridgeRef={scheduleCalendarPrefsBridgeRef} />
        <SubscribedColleagueBridgeSync bridgeRef={subscribedColleagueBridgeRef} />
        <UserCalendarTypesBridgeSync bridgeRef={calendarTypesBridgeRef} />
        <VvChatInsetDialogPortalHost>
          <VvChatFullInsetPortalHost>
    <div className="absolute inset-0 flex flex-row w-full isolate overflow-hidden bg-cui-bg">
      {!isMainCuiStandaloneWindow && (
        <MainNavRail
          userAvatar={currentUser.avatar}
          /** 教育三身份场景下：基础未读 5 + eduImBus 跨身份联动事件未读数 */
          messageUnread={5 + eduImBusUnread}
          activeApp={activeApp}
          mainView={mainView}
          onSelectMessages={() => {
            setMainView("im")
            setIsAllAppsOpen(false)
            onHistoryOpenChange?.(false)
          }}
          onSelectMainCui={() => {
            setMainView("cui")
            setActiveApp(null)
            setIsPinnedTaskExpanded(true)
            pinnedTaskAllowScrollCollapseRef.current = false
            lastChatScrollTopRef.current = 0
            onEnterMainCuiSessionLayout?.()
            queueMicrotask(() => hydrateBottomDock())
          }}
          onSelectContacts={() => {
            setMainView("im")
            setIsAllAppsOpen(false)
            onHistoryOpenChange?.(false)
          }}
          onSelectMe={() => {
            setMainView("cui")
            setActiveApp(null)
            setIsPinnedTaskExpanded(true)
            pinnedTaskAllowScrollCollapseRef.current = false
            lastChatScrollTopRef.current = 0
            queueMicrotask(() => hydrateBottomDock())
          }}
          onSelectWorkbench={() => {
            setMainView("cui")
            setActiveApp(null)
            setIsAllAppsOpen(true)
            onHistoryOpenChange?.(false)
          }}
          onEducation={() => {
            setMainView("cui")
            openPortalRootApp("education")
            queueMicrotask(() => hydrateBottomDock())
          }}
          onOpenAllApps={() => setIsAllAppsOpen(true)}
          onTodoQuick={() => {
            setMainView("cui")
            queueMicrotask(() => handleSendMessage("查看今天的待办事项"))
          }}
          onCalendarQuick={() => {
            setMainView("cui")
            queueMicrotask(() => handleSendMessage("打开日历"))
          }}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0 min-h-0 relative overflow-hidden">
      {mainView === "cui" && secondaryPortalOpen && (
        <SecondaryAppHistorySidebar
          open={secondaryHistoryOpen}
          onOpenChange={setSecondaryHistoryOpen}
          sessions={secondaryAppSessions}
          selectedId={selectedSecondarySession}
          onSelect={handleSecondarySessionSelect}
          onNewConversation={handleSecondaryAppNewConversation}
          mode="push"
        />
      )}

      {!sessionSplit &&
        !scenarioFiveUnderBarLayout &&
        mainView === "cui" &&
        (activeApp === null || secondaryPortalOpen) &&
        onHistoryOpenChange &&
        onSelect && (
        <HistorySidebar
          layout="overlay"
          open={historyOpen}
          onOpenChange={onHistoryOpenChange}
          conversations={cuiHistoryConversations}
          selectedId={selectedId}
          onSelect={applyPrimarySessionListSelection}
          pinnedSessionId={cuiMainChatId}
          keepOpenOnSessionSelect={false}
          showConversationTypeTags
          organizations={sessionListOrganizations}
          sessionListPreferredOrgId={currentOrg}
          onJumpToConversationDay={handleJumpToConversationDay}
          mainChatHistory={mainChatHistory}
          onPickMainChatHistoryEntry={
            onSelectMainChatHistoryEntry ? handleSidebarMainHistorySelect : undefined
          }
          activeMainChatHistoryEntryId={activeMainChatHistoryEntryId}
        />
      )}

      <div
        className={cn(
          "flex flex-1 min-h-0 min-w-0",
          sessionSplit ? "flex-row" : "flex-col"
        )}
      >
        {sessionSplit && onHistoryOpenChange && onSelect && (
          <>
            <HistorySidebar
              layout="split"
              open
              persistent
              widthPx={sessionSidebarWidthProp}
              onOpenChange={onHistoryOpenChange}
              conversations={cuiHistoryConversations}
              selectedId={selectedId}
              onSelect={applyPrimarySessionListSelection}
              pinnedSessionId={cuiMainChatId}
              showConversationTypeTags
              organizations={sessionListOrganizations}
              sessionListPreferredOrgId={currentOrg}
              onJumpToConversationDay={handleJumpToConversationDay}
              mainChatHistory={mainChatHistory}
              onPickMainChatHistoryEntry={
                onSelectMainChatHistoryEntry ? handleSidebarMainHistorySelect : undefined
              }
              activeMainChatHistoryEntryId={activeMainChatHistoryEntryId}
            />
            <div
              role="separator"
              aria-orientation="vertical"
              className="w-2 shrink-0 z-[55] cursor-col-resize flex justify-center group relative touch-none select-none hover:bg-[var(--black-alpha-8)]"
              onPointerDown={handleSessionResizePointerDown}
            >
              <div className="w-px h-full bg-border group-hover:bg-primary/35 transition-colors rounded-full" />
            </div>
          </>
        )}

      {/* Main Content Wrapper */}
      <div className={cn(
        "flex flex-col flex-1 min-h-0 h-full w-full shrink-0 min-w-0 transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
        mainView === "im" ? "bg-white" : "bg-cui-bg",
        !sessionSplit &&
          !scenarioFiveUnderBarLayout &&
          mainView === "cui" &&
          historyOpen &&
          (activeApp === null || secondaryPortalOpen)
          ? "translate-x-[280px] md:translate-x-0"
          : "",
        secondaryHistoryOpen && secondaryPortalOpen ? "translate-x-[260px] md:translate-x-0" : ""
      )}>
        {mainView === "im" ? (
          <IMWorkspace />
        ) : (
        <>
        {/* 《主CUI交互》：场景五为 ①顶栏全宽 ②顶栏下[会话列表|会话内容]；其余场景保持原结构 */}
        {/* 模块：顶栏（VVAI Logo / 会话列表收展 / 组织切换 / 模型选择 / 独立窗口） */}
      <div className={cn(scenarioFiveUnderBarLayout && "shrink-0")}>
      <ChatNavBar 
        title=""
        navGridAlign={navBarGridCui}
        showSessionListToggle={navBarGridCui}
        sessionListOpen={historyOpen}
        onSessionListToggle={navBarGridCui ? onToggleHistory : undefined}
        onToggleHistory={undefined}
        onNewMessage={handleNewConversation}
        currentOrg={navBarOrganizationId}
        /**
         * 教育三身份场景且当前在教育应用对话内：组织切换器位置由「教育空间切换器」承担（在 navCenterSlot 中），
         * 把内置组织切换器抑制为空，避免双重展示；非教育上下文仍走原 organizations 路径不变。
         */
        organizations={isEduSceneRole && isEduSceneEducationContext ? [] : organizations}
        onOrgSelect={handleNavBarOrgSelect}
        organizationSwitcherMode={isNavContentScopeMode ? "content-scope" : "session"}
        onCreateOrg={handleCreateOrg}
        onJoinOrg={handleJoinOrg}
        onBack={undefined}
        showModelSelect
        currentModel={currentModel}
        models={AVAILABLE_MODELS}
        onModelSelect={handleModelSwitch}
        showIndependentWindow={showStandaloneWindowInNav}
        navCenterSlot={
          showNoOrgEducationSpaceNav ? (
            <SessionListEduSpaceHeader
              onCreateInstitutional={() => handleSendMessage("创建机构教育空间")}
              onCreateFamily={() => handleSendMessage("创建家庭教育空间")}
              onJoinSpace={() => handleSendMessage("加入教育空间")}
              popoverAlign="center"
            />
          ) : isEduSceneRole ? (
            isEduSceneEducationContext ? (
              <EduSpaceTopSwitcher
                scenario={scenario}
                consumerOnly={isEduSceneConsumer}
                onCreateSpace={() =>
                  handleSendMessage(
                    isEduSceneConsumer ? "创建家庭教育空间" : "创建教育空间",
                  )
                }
                onJoinSpace={() => handleSendMessage("加入教育空间")}
                popoverAlign="center"
              />
            ) : null
          ) : null
        }
        showNoOrgQuickEntry={
          organizations.length === 0 &&
          !showNoOrgEducationSpaceNav &&
          !isEduSceneRole
        }
        onQuickCreateOrg={handleCreateOrg}
        onQuickJoinOrg={handleJoinOrg}
        onIndependentWindow={
          showStandaloneWindowInNav
            ? () => {
                onOpenStandaloneMainCui?.()
                setMainChatHistoryOpen(false)
              }
            : undefined
        }
        mainCuiToolbarActions={
          mainCuiToolbarActionsEligible
            ? {
                ...(hideMainCuiNavHistoryIcon(scenario)
                  ? {}
                  : { onHistory: () => setMainChatHistoryOpen(true) }),
                onNewThread: () => {
                  onMainChatNewThread?.()
                  setMainChatHistoryOpen(false)
                },
                onIndependentWindow:
                  !isMainCuiStandaloneWindow && onOpenStandaloneMainCui
                    ? () => {
                        onOpenStandaloneMainCui()
                        setMainChatHistoryOpen(false)
                      }
                    : undefined,
                newThreadIconVariant: "message-plus",
                newThreadTitle: "开启新会话",
                newThreadAriaLabel: "开启新会话",
                independentWindowTitle: "独立窗口",
                independentWindowAriaLabel: "在独立浏览器窗口打开当前会话并与本页实时同步",
              }
            : null
        }
      />
      </div>

      {(() => {
        const cuiBelowNavColumn = (
          <>
      {/* 模块：顶部固定任务卡（主 AI 语境 + 教育门户语境共用，复用全局组件，仅 swap 数据） */}
      {(activeApp === null || secondaryPortalOpen) && !showMainChatFreshInitLayout && (() => {
        /**
         * 顶部待办带的"双线聚合"策略：
         * 1) 场景 6/7/8（URL 为 edu-teacher / student / parent）：顶区待办**始终**为身份×阶段的教育数据，
         *    不依赖是否点开「教育」二级门户（此前误用 `isEduSceneEducationContext`，主 VVAI 下恒为 false）。
         * 2) 在主 VVAI 内（无 edu scenario）：若用户曾访问过场景 6/7/8（lastEduRole 存在），
         *    则把当下身份对应的"教育最重要的 1 条"chip 合并进默认待办带，
         *    点击后写 pendingEduSkillRequest + 跳转到对应 scenario URL，
         *    新页面挂载时自动消费 pending 信号 → 打开 AI课堂侧 CUI 出对应业务卡。
         * 这样主 VVAI 既不被刷屏，又能跨应用直达本节课业务。
         */
        const showEduTodos = eduSceneRoleId != null
        const eduChips = showEduTodos
          ? buildEducationPinnedTaskChips(eduSceneRoleId!, educationStage)
          : null
        const eduGreeting = showEduTodos
          ? buildEducationPinnedGreeting(eduSceneRoleId!, educationStage)
          : null

        /**
         * 主 VVAI 聚合 chip 来源（单一身份×阶段；严格对齐"该身份只看自己的待办"）：
         * - 操作者身份决议优先级：
         *     1) `eduRoleFromScenario`（当前 URL 在教育 scenario 内 → 直接用该身份；
         *        即便此刻没在教育门户而在主对话，也应展示该身份的待办，**禁止**回落到老师）
         *     2) `readLastEduRole()`（用户最近一次访问过的教育身份；同 tab sessionStorage）
         *     3) null（从未访问过任何教育身份 → 不展示教育 chip，主 VVAI 保持纯净，
         *        避免无来源凭空冒出"教师"的待办给学生/家长用户造成误导）
         * - 与之前实现的差异：去掉了"teacher"硬兜底，这就是家长/学生进教育后又看到老师待办的根因
         */
        const lastEdu = readLastEduRole()
        const aggregatedEduRole: EduSceneRole | null =
          activeApp === null && !secondaryPortalOpen
            ? (eduRoleFromScenario ?? lastEdu?.role ?? null)
            : null
        const aggregatedEduChips: EducationPinnedChip[] = aggregatedEduRole
          ? buildEducationPinnedTaskChips(aggregatedEduRole, educationStage)
          : []
        const defaultChips = [
          ...aggregatedEduChips
            /** 主 VVAI 聚合区只展示「待处理」教育事项；已完成 / 已逾期已在教育语境内置底处理 */
            .filter((c) => c.tone === "active")
            .map((c) => ({
              iconSrc: c.iconSrc,
              alt: c.alt,
              /** 标识"教育 · "前缀，帮用户区分这是教育应用的事项 */
              title: `教育 · ${c.title}`,
              time: c.time,
              tone: c.tone,
            })),
          {
            iconSrc: meetingIcon,
            alt: "需求启动会议",
            title: "需求启动会议",
            time: "15:00 - 16:00",
          },
          {
            iconSrc: calendarIcon,
            alt: "项目评审",
            title: "项目评审",
            time: "17:00 - 18:00",
          },
          {
            iconSrc: todoIcon,
            alt: "待办事项",
            title: "待办事项",
            count: 28,
          },
        ]
        return (
          <div className="relative z-20 w-full bg-cui-bg px-[max(20px,var(--cui-padding-max))] pb-[var(--space-100)] pt-[var(--space-0)]">
            <PinnedTaskCard
              isExpanded={isPinnedTaskExpanded}
              onExpandedChange={handlePinnedTaskExpandedChange}
              greeting={eduGreeting ?? "下午好，今天你有 31 件要处理的事情 👇"}
              /**
                * 收起态条数：教育语境只统计「待处理」（active），已完成 / 已逾期不计入主指标，
                * 与 `buildEducationPinnedGreeting` 的口径保持一致；非教育语境沿用默认 `chips.length`。
                */
              collapsedSummaryCount={
                eduChips ? eduChips.filter((c) => c.tone === "active").length : undefined
              }
              chips={
                eduChips
                  ? eduChips.map((c) => ({
                      iconSrc: c.iconSrc,
                      alt: c.alt,
                      title: c.title,
                      time: c.time,
                      tone: c.tone,
                    }))
                  : defaultChips
              }
              onChipClick={(chip) => {
                if (eduChips) {
                  /** 教育语境：点击 chip 走 skillId 强契约 → 打开 AI课堂侧 CUI 并出对应业务卡 */
                  const matched = eduChips.find((c) => c.title === chip.title)
                  if (matched) {
                    handleEduRoleSkillCommand(matched.command, {
                      skillId: matched.skillId,
                      source: "todo-chip",
                    })
                    return
                  }
                }
                if (aggregatedEduChips.length > 0 && aggregatedEduRole) {
                  /** 主 VVAI 单身份聚合 chip：title 加了"教育 · "前缀，反查时去掉前缀对齐 */
                  const stripped = chip.title.replace(/^教育\s·\s/, "")
                  const matched = aggregatedEduChips.find((c) => c.title === stripped)
                  if (matched) {
                    writePendingEduSkillRequest({
                      role: aggregatedEduRole,
                      skillId: matched.skillId,
                      command: matched.command,
                    })
                    if (typeof window !== "undefined") {
                      window.location.assign(buildEduRoleScenarioUrl(aggregatedEduRole))
                    }
                    return
                  }
                }
                setSelectedTask({
                  iconSrc: chip.iconSrc,
                  title: chip.title,
                  time: chip.time,
                  description: "这是一个重要的任务，需要及时处理。请确保在截止日期前完成所有相关工作。",
                  members: [
                    {
                      id: "1",
                      name: "张三",
                      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Zhang",
                    },
                    {
                      id: "2",
                      name: "李四",
                      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Li",
                    },
                  ],
                })
                setIsTaskDrawerOpen(true)
              }}
            />
          </div>
        )
      })()}

      {/* 模块：主会话区（欢迎语 / 快捷建议 / 消息流）；外层原生 div 承接滚动与滚轮，避免 motion 层导致「下滑收起待办」失效 */}
      <div
        ref={chatScrollContainerRef}
        onScroll={handleChatScroll}
        onWheel={() => {
          pinnedTaskAllowScrollCollapseRef.current = true
        }}
        className="flex-1 min-h-0 relative z-10 overflow-y-auto overflow-x-hidden scrollbar-hide"
      >
        <motion.div
          key={activeApp || "main"}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
          className="flex min-h-0 w-full flex-col"
        >
        <div className="flex flex-col gap-[var(--space-800)] w-full px-[max(20px,var(--cui-padding-max))] py-[var(--space-400)] pt-[var(--space-300)]">
          {/* Welcome Message (Mock/Static as per design) */}
          {!secondaryPortalOpen ? (
            <>
              {!isDockAppSession &&
              !(conversation.id === cuiMainChatId && messages.length > 0) ? (
                eduSceneRoleId != null ? (
                  <MainVvaiStandardWelcomeCard avatarSrc={conversation.user.avatar} />
                ) : (
                  <ChatWelcome
                    avatarSrc={conversation.user.avatar}
                    greeting={mainSessionWelcomeGreeting}
                  />
                )
              ) : null}

              {/*
                场景 6/7/8/9《主CUI交互》主开场（不在教育门户内）：
                - 主导航栏选中"红绿灯/工作台"等非教育 tab 时，主区域仍展示 MainVvaiStandardWelcomeCard，但下方原本一片空白；
                  补一行身份化 chip，让用户从主 VVAI 也能直达 4 类教育能力——
                  点击后 handleEduFirstEntryChip 会自动 setActiveApp("education") 进入教育门户并展示对应业务卡，闭环
                - 与教育门户内 chip 渲染共享同一份 samplePrompts，避免文案/路由分叉；
                  直接复用 handleEduFirstEntryChip：admin → admin 业务卡 marker；三身份 → course-pick 选课卡 / direct 文字回复
              */}
              {messages.length === 0 &&
                !isDockAppSession &&
                eduSceneRoleId != null &&
                eduFirstEntryCopy && (
                <div className="flex flex-wrap gap-[var(--space-200)] ml-0 md:ml-[44px] -mt-[var(--space-400)]">
                  {eduFirstEntryCopy.samplePrompts.map((p) => (
                    <ChatPromptButton
                      key={p.command}
                      onClick={() =>
                        handleEduFirstEntryChip(canonicalizeEduFirstEntryCommand(p.command))
                      }
                    >
                      {canonicalizeEduFirstEntryCommand(p.command)}
                    </ChatPromptButton>
                  ))}
                </div>
              )}
              {/* Action Suggestions for Main Entrance（dock 应用会话不展示顶区快捷建议）；场景 0 不展示顶区「试试：查订单」；场景六/七/八走教育快捷，不要混入「查订单」 */}
              {(messages.length === 0 ||
                (onIntentDockHandoff && !isScenarioZeroNoOrg)) &&
                !isDockAppSession &&
                eduSceneRoleId == null && (
                <div className="flex flex-wrap gap-[var(--space-200)] ml-0 md:ml-[44px] -mt-[var(--space-400)]">
                  {messages.length === 0 && (
                    <>
                      {scenarioZeroMainEmptyWelcome ? (
                        <>
                          <ChatPromptButton onClick={() => handleSendMessage("创建组织")}>
                            创建组织
                          </ChatPromptButton>
                          <ChatPromptButton onClick={() => handleSendMessage("加入组织")}>
                            加入组织
                          </ChatPromptButton>
                          <ChatPromptButton onClick={() => handleSendMessage("创建教育空间")}>
                            创建教育空间
                          </ChatPromptButton>
                          <ChatPromptButton onClick={() => handleSendMessage("加入教育空间")}>
                            加入教育空间
                          </ChatPromptButton>
                        </>
                      ) : showMainChatFreshInitLayout && !isScenarioZeroNoOrg ? (
                        <ChatPromptButton onClick={() => handleSendMessage("查订单")}>
                          试试：查订单
                        </ChatPromptButton>
                      ) : (
                        <>
                          <ChatPromptButton onClick={() => handleSendMessage("查看我的个人信息")}>
                            查看个人信息
                          </ChatPromptButton>
                          <ChatPromptButton onClick={() => handleSendMessage("帮我创建一封新邮件")}>
                            创建邮件
                          </ChatPromptButton>
                          <ChatPromptButton onClick={() => handleSendMessage("今天的待办事项")}>
                            查看待办事项
                          </ChatPromptButton>
                        </>
                      )}
                    </>
                  )}
                  {onIntentDockHandoff &&
                    !isScenarioZeroNoOrg &&
                    !isSingleOrgEduAttendanceScenarioFlow(scenario) &&
                    !isDockConversationId(conversation.id) &&
                    messages.length > 0 && (
                      <ChatPromptButton onClick={() => handleSendMessage("查订单")}>
                        试试：查订单
                      </ChatPromptButton>
                    )}
                </div>
              )}
            </>
          ) : (activeApp === PERSONAL_EDU_SPACE_APP_ID || activeApp === "education") &&
            isScenarioZeroNoOrg ? (
            <>
              {educationMessagesForDisplay.length === 0 ? (
                <ChatWelcome
                  avatarSrc={conversation.user.avatar}
                  greeting="你好，欢迎使用「教育」。"
                />
              ) : null}
              {educationMessagesForDisplay.length === 0 ? (
                <>
                  <p
                    className={cn(
                      "max-w-[min(560px,100%)] text-pretty text-[length:var(--font-size-sm)] font-[var(--font-weight-regular)] leading-relaxed text-text-secondary",
                      "ml-0 md:ml-[44px] -mt-[var(--space-250)]",
                    )}
                  >
                    {educationSpaces.length === 0
                      ? "你还没有加入任何教育空间，可以做如下操作："
                      : `当前已选择教育空间「${currentDemoEducationSpace?.name ?? ""}」（${
                          currentDemoEducationSpace?.kind === "institutional"
                            ? "机构教育空间"
                            : "家庭教育空间"
                        }）。你还可以创建或切换其他空间。`}
                  </p>
                  <div className="mt-[var(--space-200)] flex flex-wrap gap-[var(--space-200)] ml-0 md:ml-[44px]">
                    <ChatPromptButton onClick={() => handleSendMessage("创建教育空间")}>
                      创建教育空间
                    </ChatPromptButton>
                    {organizations.length > 0 ? (
                      <ChatPromptButton onClick={() => handleSendMessage("创建机构教育空间")}>
                        创建机构教育空间
                      </ChatPromptButton>
                    ) : null}
                    <ChatPromptButton onClick={() => handleSendMessage("创建家庭教育空间")}>
                      创建家庭教育空间
                    </ChatPromptButton>
                  </div>
                </>
              ) : null}
            </>
          ) : activeApp === PERSONAL_EDU_SPACE_APP_ID ? (
            <>
              {educationMessagesForDisplay.length === 0 ? (
                <ChatWelcome
                  avatarSrc={conversation.user.avatar}
                  greeting="你好，欢迎使用「教育」。请选择你的身份与创建方式，也可直接描述你的需求。"
                />
              ) : null}
              {educationMessagesForDisplay.length === 0 ? (
                <div className="flex flex-wrap gap-[var(--space-200)] ml-0 md:ml-[44px] -mt-[var(--space-400)]">
                  {PERSONAL_EDU_SPACE_ACTIONS.map((act) => (
                    <ChatPromptButton key={act.id} onClick={() => appendPersonalEduSpaceTurn(act.label)}>
                      {act.label}
                    </ChatPromptButton>
                  ))}
                </div>
              ) : null}
            </>
          ) : activeApp === "hospital" ? (
            <>
              {educationMessagesForDisplay.length === 0 ? (
                <ChatWelcome
                  avatarSrc={conversation.user.avatar}
                  greeting={`你好，我是你的医院场景专属 AI 助手。需要办理患者、排班、耗材或床位相关事务吗？`}
                />
              ) : null}
              {educationMessagesForDisplay.length === 0 && (
                <div className="flex flex-wrap gap-[var(--space-200)] ml-0 md:ml-[44px] -mt-[var(--space-400)]">
                  <ChatPromptButton onClick={() => handleSendMessage("查询今日入院待办")}>
                    查询今日入院待办
                  </ChatPromptButton>
                  <ChatPromptButton onClick={() => handleSendMessage("查看本科室医护排班")}>
                    查看本科室医护排班
                  </ChatPromptButton>
                  <ChatPromptButton onClick={() => handleSendMessage("高值耗材申领进度")}>
                    高值耗材申领进度
                  </ChatPromptButton>
                  <ChatPromptButton onClick={() => handleSendMessage("病区空床与候床队列")}>
                    病区空床与候床队列
                  </ChatPromptButton>
                  {organizations.length > 0 ? (
                    <ChatPromptButton onClick={handleOrgClick}>
                      切换组织
                    </ChatPromptButton>
                  ) : null}
                </div>
              )}
            </>
          ) : (
            <>
              {/*
                教育四身份场景（teacher/student/parent/admin）· 完整脚手架（始终保留 = 不再被 empty-state 门控）：
                - ChatWelcome（身份化招呼 + 召唤"挑一个让我先试"，不列举 4 类）
                - IM 跨身份收件箱 + 4 chip 行动入口（admin 在 chip 下方追加今日数字卡）
                设计原则（v3 极简，决策 A3 + B3 + C1 + D2 + E1，brief 已删，见 educationFirstEntryCopy.ts）：
                - 不再渲染 brief 段落 / 能力卡 / stage-driven Hero（与顶部《全局待办带》分工：能力线 vs 状态线）
                - 用户发任何消息后，"我是谁、AI 能为我做什么"的引导都不会消失
              */}
              {eduSceneRoleId && eduFirstEntryCopy ? (
                <>
                  <ChatWelcome
                    avatarSrc={conversation.user.avatar}
                    greeting={eduFirstEntryCopy.greeting}
                  />
                  {/*
                   * 注：原 brief 段落（"备课与学情、课堂副驾、作业与报告、家校沟通——告诉我先试哪个 👇"）
                   * 已移除——产品评审：4 类名词陈列与下方 4 chip 一一对应，chip 名称本身已经告诉用户每类是什么，
                   * 中间再放一行"分类标签 + 召唤箭头"反而打断 greeting → chip 的视线。
                   * 后续若要新增过渡段落，请新增其他字段，**不要复活 brief**（避免再被写成"列举能力清单"）。
                   */}
                  {/*
                   * 与 ChatWelcome 之间使用负 margin 紧贴：
                   * 与"非 edu 三身份场景"分支一致（见下方 7340 行附近），ChatWelcome 自带底部 padding，
                   * 这里再加正向 mt 会让 chip 离招呼语过远（删 brief 后的回归 bug）。
                   */}
                  <div className="ml-0 md:ml-[44px] -mt-[var(--space-400)] flex w-full flex-col gap-[var(--space-300)]">
                    {/* IM 收件箱：admin 不在三身份 IM 闭环中，跳过 banner */}
                    {eduSceneRoleId !== "admin" && eduImBusEvents.length > 0 ? (
                      <EduImInboxBanner
                        role={eduSceneRoleId}
                        events={eduImBusEvents}
                        onOpenDetail={handleEduImInboxOpen}
                      />
                    ) : null}
                    {/*
                     * 学生 · 课堂随堂题待办 banner：老师在课堂子 CUI 推一道随堂题后，
                     * 学生切到场景七主 CUI 欢迎区下方挂一条提示 + 「立刻进课堂答题」按钮。
                     * 答完后 banner 自动消失。
                     */}
                    {eduSceneRoleId === "student" && studentClassTasks.length > 0 ? (
                      <EduClassTaskBanner
                        studentName={DEMO_STUDENT_SELF.name}
                        tasks={studentClassTasks}
                        onEnterLesson={(lessonId) =>
                          openAiClassroomSidePanel({
                            lessonId,
                            command: "进入本节 AI 课堂",
                            source: "todo-chip",
                            kind: "open-only",
                          })
                        }
                      />
                    ) : null}
                    {/*
                     * 主开场「v3 极简」（见 educationFirstEntryCopy.ts 顶部）：
                     * - 三身份（teacher / student / parent）：仅 ChatWelcome + 4 chip，无 brief、无能力卡
                     * - admin（场景九）：chip 下方追加「今日校区一眼」4 数字格（演示数据水印，点数字进 dock 子 CUI）
                     */}
                    <div className="flex flex-wrap gap-[var(--space-200)]">
                      {eduFirstEntryCopy.samplePrompts.map((p) => (
                        <ChatPromptButton
                          key={p.command}
                          onClick={() =>
                            handleEduFirstEntryChip(canonicalizeEduFirstEntryCommand(p.command))
                          }
                        >
                          {canonicalizeEduFirstEntryCommand(p.command)}
                        </ChatPromptButton>
                      ))}
                    </div>
                    {eduSceneRoleId === "admin" ? (
                      <AdminTodaySnapshotCard onPickAction={handleEduRoleSkillCommand} />
                    ) : null}
                  </div>
                </>
              ) : (
                <>
                  {educationMessagesForDisplay.length === 0 ? (
                    <ChatWelcome
                      avatarSrc={conversation.user.avatar}
                      greeting={
                        educationStageCopy
                          ? educationStageCopy.greeting
                          : `你好，我是你的教育专属AI助手。请问今天需要处理什么？`
                      }
                    />
                  ) : null}
                </>
              )}

              {/* 兼容老路径：非 edu 三身份场景下的"教育门户首屏空态" */}
              {educationMessagesForDisplay.length === 0 && !eduSceneRoleId && (
                <>
                  {educationStageCopy ? (
                    <p
                      className={cn(
                        "max-w-[min(620px,100%)] text-pretty text-[length:var(--font-size-sm)] font-[var(--font-weight-regular)] leading-relaxed text-text-secondary",
                        "ml-0 md:ml-[44px] -mt-[var(--space-250)]",
                      )}
                    >
                      {educationStageCopy.brief}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap gap-[var(--space-200)] ml-0 md:ml-[44px] -mt-[var(--space-400)]">
                    {(educationStageCopy?.prompts ?? ["查看我的课表", "布置作业", "查看学情", "课后报告"]).map((prompt) => (
                      <ChatPromptButton key={prompt} onClick={() => handleSendMessage(prompt)}>
                        {prompt}
                      </ChatPromptButton>
                    ))}
                    {!educationStageCopy && organizations.length > 0 ? (
                      <ChatPromptButton onClick={handleOrgClick}>
                        切换组织
                      </ChatPromptButton>
                    ) : null}
                  </div>
                </>
              )}
            </>
          )}

          {/* Conversation Messages */}
          {renderMessageList(secondaryPortalOpen ? educationMessagesForDisplay : messages, secondaryPortalOpen)}
          <div ref={scrollRef} />
        </div>
        </motion.div>
      </div>

      {/* 模块：底部区域（应用条 / 输入区）；内层 relative 供全部应用抽屉与输入行左右对齐 */}
      <div className="flex-none z-20 w-full pt-[var(--space-200)] pb-[var(--space-400)] px-[max(20px,var(--cui-padding-max))] min-px-[var(--space-500)]">
        {/* data-cui-dock-shell：与「全部应用」抽屉、应用条、ChatSender 同宽；供 DockAppSwitcherChip 面板完全对齐 */}
        <div
          data-cui-dock-shell
          className="relative w-full min-w-0 flex flex-col gap-[var(--space-200)]"
        >
        {/* 模块：全部应用抽屉（锚定本容器，左右与 ChatSender 整行一致） */}
        <AllAppsDrawer
          apps={apps}
          catalogAppIds={dockCatalogIds}
          isOpen={isAllAppsOpen}
          onClose={() => setIsAllAppsOpen(false)}
          onReorder={handleReorder}
          onRemoveFromDock={handleDockRemoveFromBar}
          onAddToDock={handleDockAddToBar}
          scenario={scenario}
        />

        {/* 模块：底部应用条（主入口应用 / 教育二级应用） */}
        <div
          data-testid="main-dock-bar"
          className="relative flex w-full min-h-[var(--space-800)] min-w-0 items-center gap-[var(--space-200)] p-[0px]"
        >
          <AnimatePresence mode="popLayout">
            {secondaryPortalOpen && portalSecondaryDockExpanded ? (
              <motion.div
                key={`portal-${activeApp}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className={cn(
                  "flex flex-1 min-w-0 items-center justify-start",
                  "gap-[var(--space-200)]"
                )}
              >
                <button
                  type="button"
                  onClick={() => setPortalSecondaryDockExpanded(false)}
                  className="group flex h-[var(--space-800)] w-[var(--space-800)] shrink-0 items-center justify-center rounded-full border border-border bg-bg transition-all duration-300 ease-out hover:bg-[var(--black-alpha-11)]"
                  title="返回应用列表"
                  aria-label="返回应用列表"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    className="text-text-secondary transition-colors group-hover:text-text"
                  >
                    <path
                      d="M8.75 3.5L5.25 7L8.75 10.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <DockAppSwitcherChip
                  currentAppId={
                    activeApp === "hospital"
                      ? "hospital"
                      : activeApp === PERSONAL_EDU_SPACE_APP_ID
                        ? PERSONAL_EDU_SPACE_APP_ID
                        : "education"
                  }
                  apps={apps}
                  onSwitchApp={handlePortalDockSwitcherSelect}
                  scenario={scenario}
                />
                <div className="h-[16px] w-px shrink-0 bg-border" aria-hidden />
                <div className="flex min-w-0 flex-1 items-center gap-[var(--space-200)] overflow-x-auto scrollbar-hide">
                  {(activeApp === PERSONAL_EDU_SPACE_APP_ID || activeApp === "education") &&
                  isScenarioZeroNoOrg
                    ? null
                    : activeApp === PERSONAL_EDU_SPACE_APP_ID
                      ? PERSONAL_EDU_SPACE_ACTIONS.map((act) => (
                          <button
                            key={act.id}
                            type="button"
                            onClick={() => appendPersonalEduSpaceTurn(act.label)}
                            className="bg-bg flex h-[var(--space-800)] min-w-0 shrink cursor-pointer select-none items-center gap-[var(--space-100)] rounded-full border border-border px-[var(--space-300)] py-[var(--space-150)] transition-all duration-300 ease-out hover:bg-[var(--black-alpha-11)]"
                          >
                            <p className="max-w-[min(100vw-8rem,22rem)] text-pretty text-left text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] leading-snug text-[var(--color-text)]">
                              {act.label}
                            </p>
                          </button>
                        ))
                      : secondaryPortalApps.map((app) => {
                        /**
                         * 课中降噪：非"进具体课"通路的 dock 二级按钮淡显 + tooltip。
                         * 教育三身份场景已移除 AI课堂 dock，进具体课的唯一通路是"课表"，
                         * 因此课中保持课表不淡显（老师调代课、家长 30 秒看直播都需要）。
                         * `ai_classroom` 分支仅机构管理者视角（EDU_INSTITUTION / SCHOOL）会命中。
                         */
                        const isScheduleEntry =
                          app.id === "edu_schedule" ||
                          app.id === "student_schedule" ||
                          app.id === "parent_schedule" ||
                          app.id === "edu_course_mgmt" ||
                          app.id === "student_course_mgmt" ||
                          app.id === "parent_course_mgmt" ||
                          app.id === "ai_classroom"
                        /**
                         * 课中体验：dock 不再灰显——四身份全部可点。
                         * "立即感受到正在上课"由 LiveLessonHintCard（auto-push 进消息流）独立承担，
                         * 主开场已切换为「能力地图」（决策 A3，见 educationFirstEntryCopy.ts）。
                         * dock 应用菜单（课表 / 报告 / 家校 等）保持随时可用。
                         *
                         * 历史 isLiveMute 逻辑（仅"会上课的人"+ 课中 + 非课表入口）已废弃，
                         * 但保留 isScheduleEntry 计算，便于后续若再想差异化课表入口（如更醒目）时复用。
                         */
                        void isScheduleEntry
                        const liveMuteWrap = (node: React.ReactNode) => (
                          <React.Fragment key={`wrap-${app.id}`}>{node}</React.Fragment>
                        )
                        if (app.id === "ai_classroom") {
                          /**
                           * 历史兼容：机构管理者视角（EDU_INSTITUTION_PORTAL_APPS / SCHOOL_PORTAL_APPS）
                           * 仍含 AI课堂 dock；点击进入课表 GUI（agenda）。
                           * 教育三身份场景（场景六/七/八）的 dock 已不再包含 AI课堂，进入具体课的入口
                           * 改由课表 dock / Hero 卡 / 待办 chip / 跨应用 handoff 承接。
                           */
                          return (
                            <button
                              key={app.id}
                              type="button"
                              onClick={openAiClassroomAgenda}
                              className={cn(
                                "bg-bg flex gap-[var(--space-100)] h-[var(--space-800)] items-center px-[var(--space-300)] py-[var(--space-150)] rounded-full shrink-0 transition-all duration-300 ease-out border border-border",
                                aiClassroomSideOpen || aiClassroomAgendaOpen
                                  ? "bg-[var(--black-alpha-11)]"
                                  : "hover:bg-[var(--black-alpha-11)]",
                              )}
                              aria-pressed={aiClassroomSideOpen || aiClassroomAgendaOpen}
                              aria-label="打开课表（选课进入 AI 课堂助手）"
                            >
                              <p className="text-[length:var(--font-size-xs)] leading-none text-[var(--color-text)] whitespace-nowrap font-[var(--font-weight-medium)]">
                                AI课堂
                              </p>
                            </button>
                          )
                        }
                        /**
                         * 场景六/七/八统一：课表二级入口与其他入口一致，均展示三级菜单。
                         * 「今日/本周」是否先出课表列表卡由 `tryOpenScheduleCardFromMenu` 在菜单点击时决定。
                         */
                        return liveMuteWrap(
                          <SecondaryAppButton
                            key={app.id}
                            app={app}
                            onMenuClick={(menu, appName) => {
                              /**
                               * 教育四身份场景：dock 三级菜单 → 真业务卡（4 数据格 + 推荐指令）
                               * 由 `educationDockMenuRegistry` 提供卡数据；查不到的菜单走老占位卡兜底。
                               */
                              const menuItem = app.menu.find((m) => m.name === menu)
                              const menuId = menuItem?.id ?? null
                              if (tryOpenScheduleCardFromMenu(app.id, menuId)) {
                                return
                              }
                              if (
                                eduSceneRoleId &&
                                menuId &&
                                openEduDockMenuCardInChat(eduSceneRoleId, menuId, menu, appName)
                              ) {
                                return
                              }

                              const userMsg: Message = {
                                id: `user-${Date.now()}`,
                                senderId: currentUser.id,
                                content: `我想使用${appName}的「${menu}」功能`,
                                timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                                createdAt: Date.now(),
                              }

                              const cardData = JSON.stringify({
                                title: `${appName} - ${menu}`,
                                description: `这是关于「${menu}」的专属指导内容，请根据提示进行操作。`,
                                detail:
                                  "1. 明确您的操作目标\n2. 跟着助手一步步完成管理流程\n3. 遇到不懂的问题随时向我提问",
                                imageSrc: app.imageSrc,
                                cardActions: {
                                  primary: {
                                    label: "按步骤继续",
                                    sendText: `我会按「${appName}」的「${menu}」指引分步完成；先帮我确认第一步要准备什么。`,
                                  },
                                  secondary: { label: "换一个功能", preset: "more_recommend" as const },
                                },
                              })
                              const botMsg: Message = {
                                id: `bot-card-${Date.now() + 1}`,
                                senderId: conversation.user.id,
                                content: `<<<RENDER_GENERIC_CARD>>>:${cardData}`,
                                timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                                createdAt: Date.now() + 1,
                              }

                              setEducationMessages((prev) => [...prev, userMsg])

                              setTimeout(() => {
                                setEducationMessages((prev) => [...prev, botMsg])
                                if (scrollRef.current) scrollRef.current.scrollIntoView({ behavior: "smooth" })
                              }, 500)
                            }}
                          />
                        )
                      })}
                </div>
              </motion.div>
            ) : !secondaryPortalOpen && shortcutBarAppId != null && onDockBarBack ? (
              <motion.div
                key={`dock-shortcuts-${shortcutBarAppId}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className={cn(
                  "flex flex-1 min-w-0 items-center justify-start",
                  isScenarioFourOrMainEntry(scenario)
                    ? "gap-[var(--space-150)]"
                    : "gap-[var(--space-200)]"
                )}
              >
                <>
                  {/* 场景二（多组织）与其余场景统一：返回 + 《切换应用》浮层（DockAppSwitcherChip） */}
                  <button
                    type="button"
                    onClick={() => onDockBarBack()}
                    className="group flex h-[var(--space-800)] w-[var(--space-800)] shrink-0 items-center justify-center rounded-full border border-border bg-bg transition-all duration-300 ease-out hover:bg-[var(--black-alpha-11)]"
                    title="返回应用列表"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      fill="none"
                      className="text-text-secondary transition-colors group-hover:text-text"
                    >
                      <path
                        d="M8.75 3.5L5.25 7L8.75 10.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                  <DockAppSwitcherChip
                    currentAppId={shortcutBarAppId}
                    apps={apps}
                    scenario={scenario}
                    onSwitchApp={(app) => {
                      if (onDockAppActivate) {
                        onDockAppActivate(app.id, app.name, currentOrg, hasJoinedOrganizations)
                      }
                    }}
                  />
                  <div className="h-[16px] w-px shrink-0 bg-border" />
                </>

                {/* 当前应用的快捷业务指令 */}
                <div className="flex min-w-0 flex-1 items-center gap-[var(--space-200)] overflow-x-auto scrollbar-hide">
                  {getDockBarInlineShortcuts(shortcutBarAppId).map((text) => {
                    /** 教育微盘：特殊 chip——前置毕业帽图标 + 直接出卡片，不走 handleSendMessage */
                    const isEduDiskEntry = isEduDiskEntryCommand(text)
                    return (
                      <button
                        key={text}
                        type="button"
                        onClick={() => {
                          if (isEduDiskEntry) {
                            openEduDiskListCardInChat()
                            return
                          }
                          handleSendMessage(text)
                        }}
                        className="bg-bg flex h-[var(--space-800)] shrink-0 cursor-pointer select-none items-center gap-[var(--space-100)] rounded-full border border-border px-[var(--space-300)] py-[var(--space-150)] transition-all duration-300 ease-out hover:bg-[var(--black-alpha-11)]"
                      >
                        {isEduDiskEntry ? (
                          <GraduationCap
                            aria-hidden
                            className="size-[12px] shrink-0 text-[var(--color-info)]"
                            strokeWidth={1.75}
                          />
                        ) : null}
                        <p className="text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] leading-none whitespace-nowrap text-[var(--color-text)]">
                          {text}
                        </p>
                      </button>
                    )
                  })}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="default-apps"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="flex w-full min-w-0 flex-1 items-center gap-[var(--space-200)]"
              >
                <div className="flex min-w-0 flex-1 items-center gap-[var(--space-200)] overflow-x-auto scrollbar-hide">
                {apps.map((app, index) => (
                  <button
                    key={app.id}
                    draggable={longPressIndex === index}
                    onClick={(e) => {
                      if (longPressIndex === index) {
                        e.preventDefault();
                        setLongPressIndex(null);
                        return;
                      }
                      if (app.id === PERSONAL_EDU_SPACE_APP_ID) {
                        if (activeApp === "education" || activeApp === PERSONAL_EDU_SPACE_APP_ID) {
                          setPortalSecondaryDockExpanded(true)
                        } else {
                          openPortalRootApp("education")
                        }
                        return
                      }
                      if (PORTAL_ROOT_APP_IDS.has(app.id)) {
                        if (activeApp === app.id) {
                          setPortalSecondaryDockExpanded(true)
                        } else if (
                          (isScenarioTwoFamily(scenario) || isNoOrgRoute) &&
                          !isScenarioTwoMultiOrgs(scenario) &&
                          /** 场景零未加入组织：「教育」为空间应用壳层，只打开门户，勿自动发 dock 首条（如「查看我的课表」） */
                          !(app.id === "education" && isScenarioZeroNoOrg)
                        ) {
                          onDockAppActivate?.(app.id, app.name, currentOrg, hasJoinedOrganizations)
                          const first = getDockBarInlineShortcuts(app.id)[0]
                          if (first) queueMicrotask(() => handleSendMessageRef.current(first))
                        } else if (app.id === "education" || app.id === "hospital") {
                          openPortalRootApp(app.id)
                        }
                        return
                      }
                      if (onDockAppActivate) {
                        onDockAppActivate(app.id, app.name, currentOrg, hasJoinedOrganizations)
                      }
                    }}
                    onMouseDown={(e) => {
                      longPressTimerRef.current = setTimeout(() => {
                        setLongPressIndex(index);
                      }, 500);
                    }}
                    onMouseUp={() => {
                      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
                    }}
                    onMouseLeave={() => {
                      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
                      if (draggedIndex === null) setLongPressIndex(null);
                    }}
                    onTouchStart={(e) => {
                      longPressTimerRef.current = setTimeout(() => {
                        setLongPressIndex(index);
                      }, 500);
                    }}
                    onTouchEnd={() => {
                      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
                    }}
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragEnter={() => handleDragEnter(index)}
                    onDragEnd={(e) => {
                      handleDragEnd();
                      setLongPressIndex(null);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                    }}
                    className={cn(
                      "bg-bg flex gap-[var(--space-100)] h-[var(--space-800)] items-center px-[var(--space-300)] py-[var(--space-150)] rounded-full shrink-0 hover:bg-[var(--black-alpha-11)] transition-all duration-300 ease-out border border-border select-none",
                      longPressIndex === index ? "cursor-grab active:cursor-grabbing scale-105 shadow-elevation-sm ring-2 ring-primary/20" : "cursor-pointer",
                      draggedIndex === index && 'opacity-20 scale-95'
                    )}
                  >
                    <AppIcon
                      imageSrc={app.icon.imageSrc}
                      className="size-[18px]"
                    />
                    <p className="text-[length:var(--font-size-xs)] leading-none text-[var(--color-text)] whitespace-nowrap font-[var(--font-weight-medium)]">
                      {app.name}
                    </p>
                  </button>
                ))}
                </div>
                <button
                  type="button"
                  onClick={() => setIsAllAppsOpen(true)}
                  className="bg-bg flex h-[var(--space-800)] shrink-0 cursor-pointer select-none items-center gap-[var(--space-100)] rounded-full border border-border px-[var(--space-300)] py-[var(--space-150)] transition-all duration-300 ease-out hover:bg-[var(--black-alpha-11)]"
                  title="全部应用"
                  aria-label="全部应用：排序、添加或移除底部应用"
                >
                  <LayoutGrid className="size-[18px] shrink-0 text-text-secondary" aria-hidden />
                  <span className="text-[length:var(--font-size-xs)] font-[var(--font-weight-medium)] leading-none whitespace-nowrap text-[var(--color-text)]">
                    全部
                  </span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 模块：输入区（文本输入 / 发送 / 快捷入口） */}
        <ChatSender
          inputValue={inputValue}
          setInputValue={setInputValue}
          handleSendMessage={handleSendMessage}
          handleKeyDown={handleKeyDown}
        />
        </div>
      </div>
          </>
        )
        if (!scenarioFiveUnderBarLayout) return cuiBelowNavColumn
        return (
          <div className="flex min-h-0 min-w-0 flex-1 flex-row">
            {historyOpen && onHistoryOpenChange && onSelect ? (
              <>
                <HistorySidebar
                  layout="split"
                  open
                  persistent
                  widthPx={sessionSidebarWidthProp}
                  onOpenChange={onHistoryOpenChange}
                  conversations={cuiHistoryConversations}
                  selectedId={selectedId}
                  onSelect={applyPrimarySessionListSelection}
                  pinnedSessionId={cuiMainChatId}
                  showConversationTypeTags
                  organizations={sessionListOrganizations}
                  sessionListPreferredOrgId={currentOrg}
                  onJumpToConversationDay={handleJumpToConversationDay}
                  mainChatHistory={mainChatHistory}
                  onPickMainChatHistoryEntry={
                    onSelectMainChatHistoryEntry ? handleSidebarMainHistorySelect : undefined
                  }
                  activeMainChatHistoryEntryId={activeMainChatHistoryEntryId}
                />
                <div
                  role="separator"
                  aria-orientation="vertical"
                  className="group relative z-[55] flex w-2 shrink-0 cursor-col-resize touch-none select-none justify-center hover:bg-[var(--black-alpha-8)]"
                  onPointerDown={handleSessionResizePointerDown}
                >
                  <div className="h-full w-px rounded-full bg-border transition-colors group-hover:bg-primary/35" />
                </div>
              </>
            ) : null}
            <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-cui-bg">{cuiBelowNavColumn}</div>
          </div>
        )
      })()}

      <MainChatHistorySheet
        open={mainChatHistoryOpen}
        onOpenChange={setMainChatHistoryOpen}
        entries={mainChatHistory}
        onSelectEntry={(id) => {
          handleSidebarMainHistorySelect(id)
          setMainChatHistoryOpen(false)
        }}
      />

      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {/* Floating Application Windows */}
      <AnimatePresence>
        {floatingApps.map((appId, idx) => {
          const app = resolveFloatingAppLabel(appId, scenario);
          if (!app) return null;
          const floatingPortalOpen = appId === "education" || appId === "hospital"
          const floatingPortalApps =
            appId === "hospital" ? HOSPITAL_PORTAL_APPS : educationPortalApps
          const floatingShowEduSpaceNav = isNoOrgRoute && appId === "education"
          /** 教育三身份场景下浮窗内进入教育门户：与主窗一致用 EduSpaceTopSwitcher 替换组织切换器 */
          const floatingShowEduRoleSpaceNav = isEduSceneRole && appId === "education"

          return (
            <FloatingAppWindow
              key={appId}
              appId={appId}
              title={app.name}
              onClose={() => {
                setFloatingApps(prev => prev.filter(id => id !== appId));
              }}
              defaultPos={{ x: 100 + idx * 20, y: 100 + idx * 20 }}
            >
              {/* 完全复用主界面的二级应用布局结构 */}
              <div className="absolute inset-0 flex flex-row w-full isolate overflow-hidden bg-cui-bg">
                {floatingPortalOpen && (
                  <SecondaryAppHistorySidebar
                    open={secondaryHistoryOpen}
                    onOpenChange={setSecondaryHistoryOpen}
                    sessions={secondaryAppSessions}
                    selectedId={selectedSecondarySession}
                    onSelect={handleSecondarySessionSelect}
                    onNewConversation={handleSecondaryAppNewConversation}
                    mode="push"
                  />
                )}

                {/* Main Content Wrapper - no translate needed in push mode */}
                <div className="flex flex-col flex-1 h-full w-full shrink-0 min-w-0 bg-cui-bg">
                  {/* Header - 使用完整的 ChatNavBar 组件 */}
                  <ChatNavBar 
                    title=""
                    onToggleHistory={undefined}
                    onNewMessage={handleNewConversation}
                    currentOrg={navBarOrganizationId}
                    organizations={floatingShowEduRoleSpaceNav ? [] : organizations}
                    onOrgSelect={handleNavBarOrgSelect}
                    organizationSwitcherMode={isNavContentScopeMode ? "content-scope" : "session"}
                    onCreateOrg={handleCreateOrg}
                    onJoinOrg={handleJoinOrg}
                    showModelSelect
                    currentModel={currentModel}
                    models={AVAILABLE_MODELS}
                    onModelSelect={handleModelSwitch}
                    showIndependentWindow={canOpenPairedStandaloneCui}
                    navCenterSlot={
                      floatingShowEduSpaceNav ? (
                        <SessionListEduSpaceHeader
                          onCreateInstitutional={() => handleSendMessage("创建机构教育空间")}
                          onCreateFamily={() => handleSendMessage("创建家庭教育空间")}
                          onJoinSpace={() => handleSendMessage("加入教育空间")}
                          popoverAlign="end"
                        />
                      ) : floatingShowEduRoleSpaceNav ? (
                        <EduSpaceTopSwitcher
                          scenario={scenario}
                          consumerOnly={isEduSceneConsumer}
                          onCreateSpace={() =>
                            handleSendMessage(
                              isEduSceneConsumer ? "创建家庭教育空间" : "创建教育空间",
                            )
                          }
                          onJoinSpace={() => handleSendMessage("加入教育空间")}
                          popoverAlign="end"
                        />
                      ) : null
                    }
                    showNoOrgQuickEntry={
                      organizations.length === 0 &&
                      !floatingShowEduSpaceNav &&
                      !floatingShowEduRoleSpaceNav
                    }
                    onQuickCreateOrg={handleCreateOrg}
                    onQuickJoinOrg={handleJoinOrg}
                    onIndependentWindow={
                      canOpenPairedStandaloneCui
                        ? () => onOpenStandaloneMainCui?.()
                        : undefined
                    }
                  />

                  {/* Main Content Area */}
                  <motion.div 
                    key={`floating-${appId}`}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                    className="flex-1 min-h-0 relative z-10 overflow-y-auto overflow-x-hidden scrollbar-hide"
                  >
                    <div className="flex flex-col gap-[var(--space-800)] w-full px-[var(--space-400)] py-[var(--space-400)] pt-[var(--space-300)]">
                      {floatingPortalOpen && educationMessagesForDisplay.length === 0 ? (
                        <ChatWelcome
                          avatarSrc={conversation.user.avatar}
                          greeting={
                            appId === "hospital"
                              ? `你好，我是你的医院场景专属 AI 助手。`
                              : appId === "education"
                                ? isScenarioZeroNoOrg
                                  ? "你好，欢迎使用「教育」。"
                                  : educationStageCopy?.greeting ?? `你好，我是你的专属AI助手。请问今天需要处理什么？`
                                : `你好，我是你的${app.name}专属AI助手。请问今天需要处理什么？`
                          }
                        />
                      ) : null}

                      {floatingPortalOpen && educationMessagesForDisplay.length === 0 && (
                        <div className="flex flex-wrap gap-[var(--space-200)] ml-0 md:ml-[44px] -mt-[var(--space-400)]">
                          {appId === "hospital" ? (
                            <>
                              <ChatPromptButton onClick={() => handleSendMessage("查询今日入院待办")}>
                                查询今日入院待办
                              </ChatPromptButton>
                              <ChatPromptButton onClick={() => handleSendMessage("查看本科室医护排班")}>
                                查看本科室医护排班
                              </ChatPromptButton>
                            </>
                          ) : appId === "education" && isScenarioZeroNoOrg ? (
                            <>
                              <p
                                className={cn(
                                  "w-full max-w-[min(560px,100%)] text-pretty text-[length:var(--font-size-sm)] font-[var(--font-weight-regular)] leading-relaxed text-text-secondary",
                                )}
                              >
                                {educationSpaces.length === 0
                                  ? "你还没有加入任何教育空间，可以做如下操作："
                                  : `当前已选择教育空间「${currentDemoEducationSpace?.name ?? ""}」（${
                                      currentDemoEducationSpace?.kind === "institutional"
                                        ? "机构教育空间"
                                        : "家庭教育空间"
                                    }）。你还可以创建或切换其他空间。`}
                              </p>
                              <div className="flex w-full flex-wrap gap-[var(--space-200)]">
                                <ChatPromptButton onClick={() => handleSendMessage("创建教育空间")}>
                                  创建教育空间
                                </ChatPromptButton>
                                {organizations.length > 0 ? (
                                  <ChatPromptButton onClick={() => handleSendMessage("创建机构教育空间")}>
                                    创建机构教育空间
                                  </ChatPromptButton>
                                ) : null}
                                <ChatPromptButton onClick={() => handleSendMessage("创建家庭教育空间")}>
                                  创建家庭教育空间
                                </ChatPromptButton>
                              </div>
                            </>
                          ) : (
                            <>
                              {/* 教育四身份 · 浮窗版：与主窗一致——greeting + chip（admin 独有今日数字卡）；
                                  brief 段落已与主窗一同移除（4 类名词陈列与下方 chip 一一对应、信号冗余）*/}
                              {eduSceneRoleId && eduFirstEntryCopy ? (
                                <div className="w-full flex flex-col gap-[var(--space-300)]">
                                  {eduSceneRoleId !== "admin" && eduImBusEvents.length > 0 ? (
                                    <EduImInboxBanner
                                      role={eduSceneRoleId}
                                      events={eduImBusEvents}
                                      onOpenDetail={handleEduImInboxOpen}
                                    />
                                  ) : null}
                                  {eduSceneRoleId === "student" && studentClassTasks.length > 0 ? (
                                    <EduClassTaskBanner
                                      studentName={DEMO_STUDENT_SELF.name}
                                      tasks={studentClassTasks}
                                      onEnterLesson={(lessonId) =>
                                        openAiClassroomSidePanel({
                                          lessonId,
                                          command: "进入本节 AI 课堂",
                                          source: "todo-chip",
                                          kind: "open-only",
                                        })
                                      }
                                    />
                                  ) : null}
                                  <div className="flex flex-wrap gap-[var(--space-200)]">
                                    {eduFirstEntryCopy.samplePrompts.map((p) => (
                                      <ChatPromptButton
                                        key={p.command}
                                        onClick={() =>
                                          handleEduFirstEntryChip(
                                            canonicalizeEduFirstEntryCommand(p.command)
                                          )
                                        }
                                      >
                                        {canonicalizeEduFirstEntryCommand(p.command)}
                                      </ChatPromptButton>
                                    ))}
                                  </div>
                                  {eduSceneRoleId === "admin" ? (
                                    <AdminTodaySnapshotCard onPickAction={handleEduRoleSkillCommand} />
                                  ) : null}
                                </div>
                              ) : (
                                <>
                                  {educationStageCopy ? (
                                    <p className="w-full max-w-[min(620px,100%)] text-pretty text-[length:var(--font-size-sm)] leading-relaxed text-text-secondary">
                                      {educationStageCopy.brief}
                                    </p>
                                  ) : null}
                                  {(educationStageCopy?.prompts ?? ["查看我的课表", "布置作业", "查看学情"]).map((prompt) => (
                                    <ChatPromptButton key={prompt} onClick={() => handleSendMessage(prompt)}>
                                      {prompt}
                                    </ChatPromptButton>
                                  ))}
                                  {!educationStageCopy ? (
                                    <ChatPromptButton onClick={handleOrgClick}>
                                      切换组织
                                    </ChatPromptButton>
                                  ) : null}
                                </>
                              )}
                            </>
                          )}
                        </div>
                      )}

                      {floatingPortalOpen ? renderMessageList(educationMessagesForDisplay, true) : null}
                      <div ref={scrollRef} />
                    </div>
                  </motion.div>

                  {/* Input Area and Bottom App Bar */}
                  <div
                    data-cui-dock-shell
                    className="relative z-20 flex w-full flex-none flex-col gap-[var(--space-200)] px-[var(--space-400)] pb-[var(--space-400)] pt-[var(--space-200)]"
                  >
                    {floatingPortalOpen && (
                      <div className="relative flex min-h-[var(--space-800)] w-full min-w-0 items-center gap-[var(--space-200)]">
                        <button
                          type="button"
                          onClick={() => {
                            setFloatingApps((prev) => prev.filter((id) => id !== appId))
                          }}
                          className="group flex h-[var(--space-800)] w-[var(--space-800)] shrink-0 items-center justify-center rounded-full border border-border bg-bg transition-all duration-300 ease-out hover:bg-[var(--black-alpha-11)]"
                          title="关闭窗口"
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 14 14"
                            fill="none"
                            className="text-text-secondary transition-colors group-hover:text-text"
                          >
                            <path
                              d="M8.75 3.5L5.25 7L8.75 10.5"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                        <DockAppSwitcherChip
                          currentAppId={appId}
                          apps={apps}
                          scenario={scenario}
                          onSwitchApp={(app) => {
                            if (PORTAL_ROOT_APP_IDS.has(app.id) || app.id === PERSONAL_EDU_SPACE_APP_ID) {
                              setFloatingApps((prev) => prev.map((x) => (x === appId ? app.id : x)))
                              return
                            }
                            setFloatingApps((prev) => prev.filter((id) => id !== appId))
                            setActiveApp(null)
                            onDockAppActivate?.(app.id, app.name, currentOrg, hasJoinedOrganizations)
                          }}
                        />
                        <div className="h-[16px] w-px shrink-0 bg-border" aria-hidden />
                        <div className="flex min-w-0 flex-1 items-center gap-[var(--space-200)] overflow-x-auto scrollbar-hide">
                          {floatingPortalApps.map((portalApp) => (
                            <SecondaryAppButton
                              key={portalApp.id}
                              app={portalApp}
                              onMenuClick={(menu, appName) => {
                                /** 教育四身份场景：与底部应用条同口径，dock 三级 → 真业务卡（含推荐指令） */
                                const menuItem = portalApp.menu.find((m) => m.name === menu)
                                const menuId = menuItem?.id ?? null
                                if (tryOpenScheduleCardFromMenu(portalApp.id, menuId)) {
                                  return
                                }
                                if (
                                  eduSceneRoleId &&
                                  menuId &&
                                  openEduDockMenuCardInChat(eduSceneRoleId, menuId, menu, appName)
                                ) {
                                  return
                                }

                                const userMsg: Message = {
                                  id: `user-${Date.now()}`,
                                  senderId: currentUser.id,
                                  content: `我想使用${appName}的「${menu}」功能`,
                                  timestamp: new Date().toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  }),
                                  createdAt: Date.now(),
                                }

                                const cardData = JSON.stringify({
                                  title: `${appName} - ${menu}`,
                                  description: `这是关于「${menu}」的专属指导内容，请根据提示进行操作。`,
                                  detail:
                                    "1. 明确您的操作目标\n2. 跟着助手一步步完成管理流程\n3. 遇到不懂的问题随时向我提问",
                                  imageSrc: portalApp.imageSrc,
                                  cardActions: {
                                    primary: {
                                      label: "按步骤继续",
                                      sendText: `我会按「${appName}」的「${menu}」指引分步完成；先帮我确认第一步要准备什么。`,
                                    },
                                    secondary: { label: "换一个功能", preset: "more_recommend" as const },
                                  },
                                })
                                const botMsg: Message = {
                                  id: `bot-card-${Date.now() + 1}`,
                                  senderId: conversation.user.id,
                                  content: `<<<RENDER_GENERIC_CARD>>>:${cardData}`,
                                  timestamp: new Date().toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  }),
                                  createdAt: Date.now() + 1,
                                }

                                setEducationMessages((prev) => [...prev, userMsg])

                                setTimeout(() => {
                                  setEducationMessages((prev) => [...prev, botMsg])
                                  if (scrollRef.current)
                                    scrollRef.current.scrollIntoView({ behavior: "smooth" })
                                }, 500)
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Input for Floating Window */}
                    <ChatSender
                      inputValue={inputValue}
                      setInputValue={setInputValue}
                      handleSendMessage={handleSendMessage}
                      handleKeyDown={handleKeyDown}
                    />
                  </div>
                </div>
              </div>
            </FloatingAppWindow>
          );
        })}
      </AnimatePresence>

      {/* Task Detail Drawer */}
      <TaskDetailDrawer
        isOpen={isTaskDrawerOpen}
        onClose={() => setIsTaskDrawerOpen(false)}
        task={selectedTask}
      />

      {isCuiCardRulesScenario(scenario) ? (
        <>
          <CuiRulesModalsHost open={cuiRulesModal} onOpenChange={setCuiRulesModal} />
          <CuiRulesSecondaryPanel
            open={cuiRulesSidebarSource != null}
            onClose={() => setCuiRulesSidebarMessageId(null)}
            sourceLabel={cuiRulesSidebarSource?.label ?? ""}
            initialParticipants={cuiRulesSidebarSource?.participants ?? []}
            initialNote={cuiRulesSidebarSource?.note ?? ""}
            onSave={({ participants, note }) => {
              const id = cuiRulesSidebarSource?.messageId
              if (!id) return
              setMessages((prev) =>
                patchCuiRulesMessage(prev, id, (p) => {
                  if (p.variant !== "plan") return p
                  return {
                    ...p,
                    participants: participants.length ? participants : p.participants,
                    participantsNote: note || undefined,
                  }
                })
              )
            }}
          />
        </>
      ) : null}
        </>
        )}
      </div>
      </div>
      </div>
      <AnimatePresence initial={false}>
        {scheduleSideSheet && scheduleSideSheet.surface === "main" ? (
          <>
            <motion.div
              key="schedule-side-main-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="pointer-events-auto absolute inset-0 z-[199] bg-[rgba(15,23,42,0.45)]"
              aria-hidden
            />
            <motion.div
              key={`schedule-side-main-panel-${scheduleSideSheet.item.id}`}
              initial={{ x: 36, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 28, opacity: 0 }}
              transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-y-0 right-0 z-[200] flex w-[min(100%,720px)] max-w-full min-w-0 justify-end"
            >
              <ScheduleSideConversationPanel
                scheduleId={scheduleSideSheet.item.id}
                botAvatarSrc={conversation.user.avatar}
                userAvatarSrc={currentUser.avatar}
                userDisplayName={currentUser.name ?? "我"}
                aiSenderId={conversation.user.id}
                scheduleTitle={scheduleSideSheet.item.title}
                onClose={closeScheduleSideSheet}
                threadBridgeRef={scheduleSideThreadBridgeRef}
                onSideThreadMirror={mirrorScheduleSideThreadToCalendar}
                onVvAction={handleCalendarDockVvAction}
                schedulePanelAppId={scheduleSideSheet.appId}
                schedulePanelSurface={scheduleSideSheet.surface}
                scheduleMeetingItems={vvMeetingItems}
                lockedScheduleOrganizationName={resolvedOrgNameForEmployeeStrip}
                employeeDemoOrgId={currentOrg}
                employeeInviteRecords={employeeInviteRecordsForScope}
                onEmployeeInviteRecordsChange={updateEmployeeInviteRecords}
                onMirrorEmployeeMgmtToEmployeeApp={mirrorEmployeeMgmtToEmployeeApp}
                onSidePanelScheduleIntent={handleScheduleSidePanelIntent}
                naturalExamples={SCHEDULE_APP_QUICK_COMMANDS.map((c) => ({
                  label: c.label,
                  sendText: c.sendText,
                }))}
              >
                <ScheduleAgendaModalPanel
                  key={scheduleSideSheet.item.id}
                  item={scheduleSideSheet.item}
                  treatDateLabelTodayAsNotPast={scheduleSideSheet.treatDateLabelTodayAsNotPast}
                  initialPanelMode={scheduleSideSheet.initialSidePanelMode}
                  onItemUpdated={(u) => {
                    setScheduleSideSheet((s) => (s?.item.id === u.id ? { ...s, item: u } : s))
                  }}
                  onRequestClose={closeScheduleSideSheet}
                  onVvAction={handleCalendarDockVvAction}
                />
              </ScheduleSideConversationPanel>
            </motion.div>
          </>
        ) : null}

        {/* 教育课表 GUI（meeting agenda 风格；选课 → 进入对应课的子 CUI） */}
        {aiClassroomAgendaOpen && eduSceneRoleId ? (
          <>
            <motion.div
              key="ai-classroom-agenda-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="pointer-events-auto absolute inset-0 z-[199] bg-[rgba(15,23,42,0.45)]"
              aria-hidden
              onClick={closeAiClassroomAgenda}
            />
            <motion.div
              key={`ai-classroom-agenda-panel-${eduSceneRoleId}`}
              initial={{ x: 36, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 28, opacity: 0 }}
              transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-y-0 right-0 z-[200] flex w-[min(100%,640px)] max-w-full min-w-0 justify-end"
            >
              <AiClassroomScheduleAgendaPanel
                role={eduSceneRoleId}
                stage={educationStage}
                onPickLesson={(lessonId) => {
                  /**
                   * 课表选课 → 切到该课，关闭 agenda，打开子 CUI。
                   * `kind: "open-only"`：仅打开容器，由侧 CUI 主动开场（按 role × effectiveStage 给 3 个 chip）。
                   */
                  closeAiClassroomAgenda()
                  openAiClassroomSidePanel({
                    lessonId,
                    command: "进入本节 AI 课堂",
                    source: "dock",
                    kind: "open-only",
                  })
                }}
                onClose={closeAiClassroomAgenda}
              />
            </motion.div>
          </>
        ) : null}

        {/* AI 课堂侧边子 CUI（一节课的完整对话主体） */}
        {aiClassroomSideOpen && eduSceneRoleId ? (
          <>
            <motion.div
              key="ai-classroom-side-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="pointer-events-auto absolute inset-0 z-[199] bg-[rgba(15,23,42,0.45)]"
              aria-hidden
              onClick={closeAiClassroomSidePanel}
            />
            <motion.div
              key={`ai-classroom-side-panel-${aiClassroomLessonId}-${eduSceneRoleId}`}
              initial={{ x: 36, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 28, opacity: 0 }}
              transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-y-0 right-0 z-[200] flex w-[min(100%,720px)] max-w-full min-w-0 justify-end"
            >
              {(() => {
                const sum = findLessonSummary(aiClassroomLessonId)
                const title = sum?.title ?? DEMO_LESSON.title
                return (
                  <AiClassroomSideConversationPanel
                    role={eduSceneRoleId}
                    stage={educationStage}
                    deliveryMode={lessonDeliveryMode}
                    lessonId={aiClassroomLessonId}
                    lessonTitle={title}
                    pendingRequest={aiClassroomPendingRequest}
                    onConsumePendingRequest={consumeAiClassroomPendingRequest}
                    botAvatarSrc={conversation.user.avatar}
                    userAvatarSrc={currentUser.avatar}
                    userDisplayName={currentUser.name ?? "我"}
                    onClose={closeAiClassroomSidePanel}
                    onStageChange={onEducationStageChange}
                    onOpenLiveClass={() => openAiClassroomLiveWindow(aiClassroomLessonId)}
                    spaceOrgId={currentOrg}
                    spaceScenario={scenario}
                  />
                )
              })()}
            </motion.div>
          </>
        ) : null}

        {/* 创建课程子 CUI（替代旧的 CreateCourseSheet 弹窗） */}
        {createCourseSideOpen && createCourseSideCtx ? (
          <>
            <motion.div
              key="create-course-side-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="pointer-events-auto absolute inset-0 z-[199] bg-[rgba(15,23,42,0.45)]"
              aria-hidden
              onClick={closeCreateCourseSidePanel}
            />
            <motion.div
              key={`create-course-side-panel-${createCourseSideCtx.orgId}`}
              initial={{ x: 36, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 28, opacity: 0 }}
              transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-y-0 right-0 z-[200] flex w-[min(100%,720px)] max-w-full min-w-0 justify-end"
            >
              <CreateCourseSideConversationPanel
                ctx={{
                  orgId: createCourseSideCtx.orgId,
                  scenario: createCourseSideCtx.scenario,
                }}
                botAvatarSrc={conversation.user.avatar}
                onClose={closeCreateCourseSidePanel}
                onCreated={(summary) => {
                  /**
                   * 创建完成后把摘要推回教育门户主对话；列表 store 订阅会自动出现新课。
                   *
                   * 注意：这里直接用组件作用域内的 `setEducationMessages`，
                   *      不能引用 `renderMessageList` 内部声明的 `pushUserThenBot`
                   *      （它对本 JSX 不在作用域里 → 运行时抛错 → onClose 跑不到 → 侧栏关不掉）
                   */
                  const now = Date.now()
                  const stamp = new Date().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                  setEducationMessages((prev) => [
                    ...prev,
                    {
                      id: `cui-create-course-u-${now}`,
                      senderId: currentUser.id,
                      content: "创建新课程",
                      timestamp: stamp,
                      createdAt: now,
                    },
                  ])
                  window.setTimeout(() => {
                    const ts2 = new Date().toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                    setEducationMessages((prev) => [
                      ...prev,
                      {
                        id: `cui-create-course-b-${Date.now()}`,
                        senderId: conversation.user.id,
                        content: summary,
                        timestamp: ts2,
                        createdAt: Date.now(),
                        isAfterPrompt: true,
                      },
                    ])
                  }, 360)
                }}
              />
            </motion.div>
          </>
        ) : null}

        {/*
         * 创建排课表子 CUI（与创建课程子 CUI 同款外壳 / 同款 motion）
         * 触发：EduCourseProductsCard 行内「添加排课表 / 打开排课表」CTA 与右下"添加排课"图标
         * 关闭：用户取消 / 提交完成
         * 数据：CreateScheduleSideConversationPanel 内自建草稿、订阅 store；
         *      finalize 后 store 通知到 EduCourseProductsCard 与 EduCourseFulfillmentCard。
         */}
        {createScheduleSideOpen && createScheduleSideCtx ? (
          <>
            <motion.div
              key="create-schedule-side-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="pointer-events-auto absolute inset-0 z-[199] bg-[rgba(15,23,42,0.45)]"
              aria-hidden
              onClick={closeCreateScheduleSidePanel}
            />
            <motion.div
              key={`create-schedule-side-panel-${createScheduleSideCtx.orgId}-${createScheduleSideCtx.courseId}`}
              initial={{ x: 36, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 28, opacity: 0 }}
              transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-y-0 right-0 z-[200] flex w-[min(100%,820px)] max-w-full min-w-0 justify-end"
            >
              <CreateScheduleSideConversationPanel
                ctx={{
                  orgId: createScheduleSideCtx.orgId,
                  scenario: createScheduleSideCtx.scenario,
                }}
                courseId={createScheduleSideCtx.courseId}
                mode={createScheduleSideCtx.mode}
                botAvatarSrc={conversation.user.avatar}
                onClose={closeCreateScheduleSidePanel}
                onCreated={(summary) => {
                  /**
                   * 同 CreateCourseSideConversationPanel：直接用组件作用域内的
                   * setEducationMessages 推回执；不要引用 renderMessageList 内的辅助函数
                   * 以免重蹈"作用域错位 → onClose 跑不到 → 侧栏关不掉"的覆辙。
                   */
                  const now = Date.now()
                  const stamp = new Date().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                  setEducationMessages((prev) => [
                    ...prev,
                    {
                      id: `cui-create-schedule-u-${now}`,
                      senderId: currentUser.id,
                      content: "创建排课表",
                      timestamp: stamp,
                      createdAt: now,
                    },
                  ])
                  window.setTimeout(() => {
                    const ts2 = new Date().toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                    setEducationMessages((prev) => [
                      ...prev,
                      {
                        id: `cui-create-schedule-b-${Date.now()}`,
                        senderId: conversation.user.id,
                        content: summary,
                        timestamp: ts2,
                        createdAt: Date.now(),
                        isAfterPrompt: true,
                      },
                    ])
                  }, 360)
                }}
              />
            </motion.div>
          </>
        ) : null}

        {/* 系列课子 CUI（一期课包的整期视图） */}
        {aiClassroomSeriesSideOpen &&
        aiClassroomSeriesId &&
        eduSceneRoleId &&
        eduSceneRoleId !== "admin" ? (
          <>
            <motion.div
              key="ai-classroom-series-side-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="pointer-events-auto absolute inset-0 z-[199] bg-[rgba(15,23,42,0.45)]"
              aria-hidden
              onClick={closeAiClassroomSeriesSidePanel}
            />
            <motion.div
              key={`ai-classroom-series-side-panel-${aiClassroomSeriesId}-${eduSceneRoleId}`}
              initial={{ x: 36, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 28, opacity: 0 }}
              transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-y-0 right-0 z-[200] flex w-[min(100%,720px)] max-w-full min-w-0 justify-end"
            >
              {(() => {
                /**
                 * 解析 seriesId：
                 *  1) demo seeded 系列 → findLessonSeries 命中
                 *  2) 新课程合成系列 → findLessonSeries 失败时，从 store 反查 course 并
                 *     用 buildSeriesFromCourse 合成一份"类系列"数据驱动 panel
                 */
                let series = findLessonSeries(aiClassroomSeriesId)
                if (!series) {
                  const course = findCourseBySeriesId(
                    { orgId: currentOrg, scenario },
                    aiClassroomSeriesId,
                  )
                  if (course) series = buildSeriesFromCourse(course)
                }
                if (!series) return null
                return (
                  <AiClassroomSeriesSideConversationPanel
                    role={eduSceneRoleId === "admin" ? "teacher" : eduSceneRoleId}
                    stage={educationStage}
                    series={series}
                    pendingRequest={aiClassroomSeriesPendingRequest}
                    onConsumePendingRequest={consumeAiClassroomSeriesPendingRequest}
                    botAvatarSrc={conversation.user.avatar}
                    userAvatarSrc={currentUser.avatar}
                    userDisplayName={currentUser.name ?? "我"}
                    onClose={closeAiClassroomSeriesSidePanel}
                    onStageChange={onEducationStageChange}
                    deliveryMode={lessonDeliveryMode}
                    onOpenLiveClass={() => openAiClassroomLiveWindow(DEMO_LESSON.id)}
                    spaceOrgId={currentOrg}
                    spaceScenario={scenario}
                  />
                )
              })()}
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </div>
          </VvChatFullInsetPortalHost>
        </VvChatInsetDialogPortalHost>
      </VvScheduleSideSheetContext.Provider>
    </UserCalendarsProvider>
  )
}