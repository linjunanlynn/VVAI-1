import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { resetSubCuiDemoStateOnReload } from "./components/main-ai/demoStateReset";

/**
 * 演示态：浏览器主动「刷新页面」时清空所有子 CUI 演示数据，
 * 让每次刷新都从初始状态进入；普通 SPA 路由切换不触发。
 * 必须在 `createRoot` 之前同步执行，确保组件首次 `useState` 读 sessionStorage 时已是干净态。
 */
resetSubCuiDemoStateOnReload();

createRoot(document.getElementById("root")!).render(<App />);
