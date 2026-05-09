/**
 * 演示态重置：浏览器主动「刷新页面」（F5 / 刷新按钮 / Cmd+R）时，
 * 把所有 **子 CUI 相关的演示数据**回到初始状态；
 * 普通的 SPA 路由切换 / 进入子 CUI 又退出，不会触发清空，
 * 以保持「没有刷新就保留聊天记录」的演示体感。
 *
 * 检测原理：`performance.getEntriesByType("navigation")[0].type === "reload"`
 * - 真正的页面刷新（F5 / Cmd+R / 刷新按钮）→ "reload"
 * - 首次访问 / 跨页跳转 → "navigate"
 * - 浏览器后退/前进 → "back_forward"
 * - 仅 "reload" 触发清空，其他保持不变。
 *
 * 触发时机：在 `src/main.tsx` 顶层以副作用方式同步执行一次（早于 React 挂载），
 * 这样 `MainAI` / `MainAIChatWindow` 等组件首次 `useState` 读取 sessionStorage
 * 已经是被清空后的状态，不会读到上次会话残留。
 *
 * 例外：`?standalone=1` 的独立浏览器窗口刷新时**不**清空，
 * 否则会破坏与主窗口的 paired 演示同步，且独立窗主要用作镜像观察，
 * 与主窗口同源即可。
 */

const SESSION_STORAGE_CLEAR_PREFIXES = [
  /** 教育空间 demo 持久化（按 scenario 分桶）：cui-demo-edu-state-* */
  /** 教育阶段 demo（课前/课中/课后）：cui-demo-edu-stage-* */
  /** 跨应用 handoff：cui-demo-pending-edu-skill-request.v1、cui-demo-last-edu-role.v1 */
  "cui-demo-",
  /** AI课堂侧边子 CUI 持久化：vvai.ai-classroom.side-thread.v1.*.* */
  "vvai.ai-classroom.",
  /** 教育三身份 IM 总线：vvai_demo_edu_im_bus_v1 */
  "vvai_demo_",
] as const

const SESSION_STORAGE_KEEP_KEYS = new Set<string>([
  /**
   * 独立窗口 paired 引导数据（一次性消费，由 `consumePairedMainAiInit` 自行 removeItem）。
   * 即便在主窗口刷新时也不应清，避免在「主窗口刷新→紧接着开独立窗口」的极小窗口期被误删。
   */
  "vvai-paired-bootstrap",
])

const LOCAL_STORAGE_CLEAR_PREFIXES = [
  /** 底部应用条顺序（按组织上下文签名隔离）：main-ai-dock-order::v4::* */
  "main-ai-dock-order::",
  /** 底部应用条隐藏列表：main-ai-dock-hidden::v1::* */
  "main-ai-dock-hidden::",
  /** 《主导航栏》底部菜单顺序与隐藏：mainNavRail.bottomMenu.v1 */
  "mainNavRail.",
] as const

/**
 * localStorage 中**显式保留**的用户级偏好（明确不属于"子 CUI 演示数据"）：
 * - `theme`：主题（亮 / 暗）。
 * - `main-ai-session-list-width-v1`：会话列表分栏宽度。
 * - `cui-no-edu-v1-*`：fresh-user-portal 的"无教育空间"演示数据，由该模块自身的
 *   `purgeNoEduStoredDataIfReload` 在该路由下处理。
 * - `main-ai-apps-order` / `main-ai-apps-version`：fresh-user-portal 的应用排序。
 *
 * 当前 LOCAL_STORAGE_CLEAR_PREFIXES 已与上述键的前缀互不重叠，无需额外白名单逻辑；
 * 此注释仅为后续新增前缀时的对照清单。
 */

let alreadyRan = false

/**
 * 仅在「真正的浏览器刷新」时清空子 CUI 演示态；其它路径无副作用。
 * 调用方：模块顶层副作用、`main.tsx` 启动期。
 * StrictMode 双调用安全：进程内 flag 保证最多执行一次。
 */
export function resetSubCuiDemoStateOnReload(): void {
  if (alreadyRan) return
  alreadyRan = true
  if (typeof window === "undefined") return

  let isReload = false
  try {
    const entries = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[]
    isReload = entries[0]?.type === "reload"
  } catch {
    return
  }
  if (!isReload) return

  /** `?standalone=1` 独立窗口：刷新不清空（避免破坏 paired 演示同步） */
  try {
    const params = new URLSearchParams(window.location.search)
    if (params.get("standalone") === "1") return
  } catch {
    /* ignore — 解析失败按主窗口处理 */
  }

  try {
    const ss = window.sessionStorage
    const removeSession: string[] = []
    for (let i = 0; i < ss.length; i++) {
      const key = ss.key(i)
      if (!key) continue
      if (SESSION_STORAGE_KEEP_KEYS.has(key)) continue
      if (SESSION_STORAGE_CLEAR_PREFIXES.some((p) => key.startsWith(p))) {
        removeSession.push(key)
      }
    }
    for (const key of removeSession) ss.removeItem(key)
  } catch {
    /* ignore — 隐私模式 / 配额异常 */
  }

  try {
    const ls = window.localStorage
    const removeLocal: string[] = []
    for (let i = 0; i < ls.length; i++) {
      const key = ls.key(i)
      if (!key) continue
      if (LOCAL_STORAGE_CLEAR_PREFIXES.some((p) => key.startsWith(p))) {
        removeLocal.push(key)
      }
    }
    for (const key of removeLocal) ls.removeItem(key)
  } catch {
    /* ignore */
  }
}
