import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription } from "./components/ui/dialog";
import { Button } from "./components/ui/button";
import { ComponentShowcase } from "./components/ComponentShowcase";
import { useLocation, useNavigate } from "react-router";
import {
  SCENARIO_CUI_CARD_RULES,
  SCENARIO_EDU_ADMIN,
  SCENARIO_EDU_PARENT,
  SCENARIO_EDU_STUDENT,
  SCENARIO_EDU_TEACHER,
  SCENARIO_TWO_MULTI_ORGS,
} from "./components/main-ai/homeScenarioLayout";
import { HOME_SCENARIO_COPY, HOME_SCENARIO_FIVE_ENTRY_LABEL } from "./homeScenarioCopy";

function navigateMainAi(
  navigate: ReturnType<typeof useNavigate>,
  scenario?: string
) {
  if (scenario) {
    navigate(
      { pathname: "/main-ai", search: `?scenario=${encodeURIComponent(scenario)}` },
      { state: { scenario } }
    )
  } else {
    navigate({ pathname: "/main-ai", search: "" })
  }
}

export function Home() {
  const [componentsOpen, setComponentsOpen] = useState(false);
  const navigate = useNavigate();
  const { hash } = useLocation();

  useEffect(() => {
    if (!hash.startsWith("#")) return;
    const id = hash.slice(1);
    if (id !== "scenario-two-notes" && id !== "scenario-four-five-notes") return;
    const el = document.getElementById(id);
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [hash]);

  return (
    <div className="flex min-h-screen w-full flex-col items-stretch justify-start overflow-x-hidden overflow-y-auto bg-bg px-4 py-10 pb-16 sm:py-12">
      <div className="mx-auto flex w-full max-w-[min(920px,calc(100vw-2rem))] flex-col gap-6">
        <p className="m-0 text-center text-[length:var(--font-size-xs)] text-text-tertiary sm:text-left">
          在《主CUI交互》页可点顶栏「场景说明」随时查看以下文案；本页为各场景入口。
        </p>
        {/* 场景0：`?scenario=no-org` */}
        <div className="flex w-full flex-col items-stretch gap-2 sm:flex-row sm:items-start sm:gap-5 md:gap-6">
          <Button
            variant="chat-submit"
            className="w-full shrink-0 sm:w-auto"
            onClick={() => navigate({ pathname: "/main-ai-fresh-user" })}
            title="与《VV框架 V2产品0421》「全新用户」入口一致：独立 onboarding 全链路"
          >
            全新用户
          </Button>
          <p className="w-full min-w-0 max-w-full text-pretty text-left text-[length:var(--font-size-sm)] font-[var(--font-weight-regular)] leading-[1.55] text-text sm:max-w-[min(32rem,min(52vw,100%))] sm:flex-1 sm:pt-[var(--space-100)]">
            复刻 V2 产品「全新用户」演示：无组织、无教育空间时的主对话四入口与后续创建/加入组织与教育空间流程（独立路由，不影响其它场景入口）。
          </p>
        </div>
        <div className="flex w-full flex-col items-stretch gap-2 sm:flex-row sm:items-start sm:gap-5 md:gap-6">
          <Button
            variant="chat-submit"
            className="w-full shrink-0 sm:w-auto"
            onClick={() => navigateMainAi(navigate, "no-org")}
            title="未加入任何空间与组织：与会话列表「未加入组织」态及底部个人应用条一致"
          >
            场景0（未加入任何空间和组织）
          </Button>
          <p className="w-full min-w-0 max-w-full text-pretty text-left text-[length:var(--font-size-sm)] font-[var(--font-weight-regular)] leading-[1.55] text-text sm:max-w-[min(32rem,min(52vw,100%))] sm:flex-1 sm:pt-[var(--space-100)]">
            {HOME_SCENARIO_COPY.mainNoOrg}
          </p>
        </div>
        <div
          id="scenario-two-notes"
          className="flex w-full flex-col gap-[var(--space-300)] sm:grid sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start sm:gap-x-5 md:gap-x-6 sm:gap-y-[var(--space-300)]"
        >
          <div className="flex w-full flex-col gap-2 sm:contents">
            <Button
              variant="chat-submit"
              className="w-full shrink-0 sm:w-full sm:min-w-0"
              onClick={() => navigateMainAi(navigate, "edu-one")}
            >
              场景二（加入一个教育机构）
            </Button>
            <p className="m-0 w-full min-w-0 max-w-full text-pretty text-left text-[length:var(--font-size-sm)] font-[var(--font-weight-regular)] leading-[1.55] text-text sm:max-w-[min(32rem,min(52vw,100%))] sm:pt-[var(--space-100)]">
              {HOME_SCENARIO_COPY.scenarioTwoEduOne}
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:contents">
            <Button
              variant="chat-submit"
              className="w-full shrink-0 sm:w-full sm:min-w-0"
              onClick={() => navigateMainAi(navigate, SCENARIO_TWO_MULTI_ORGS)}
              title={`独立 scenario（${SCENARIO_TWO_MULTI_ORGS}），可与「加入一个教育机构」分别演进`}
            >
              场景二（加入多个组织）
            </Button>
            <p className="m-0 w-full min-w-0 max-w-full text-pretty text-left text-[length:var(--font-size-sm)] font-[var(--font-weight-regular)] leading-[1.55] text-text sm:max-w-[min(32rem,min(52vw,100%))] sm:pt-[var(--space-100)]">
              {HOME_SCENARIO_COPY.scenarioTwoMultiOrgs}
            </p>
          </div>
        </div>
        <div
          id="scenario-four-five-notes"
          className="flex w-full flex-col items-stretch gap-2 sm:flex-row sm:items-start sm:gap-5 md:gap-6"
        >
          <div className="flex w-full shrink-0 flex-col items-stretch gap-2 sm:w-auto sm:items-stretch">
            <Button
              variant="chat-submit"
              className="w-full sm:w-auto"
              onClick={() => navigateMainAi(navigate, "scenario-five")}
            >
              {HOME_SCENARIO_FIVE_ENTRY_LABEL}
            </Button>
          </div>
          <div className="flex w-full min-w-0 max-w-full flex-col gap-[var(--space-200)] text-left text-[length:var(--font-size-sm)] font-[var(--font-weight-regular)] leading-[1.55] text-text sm:max-w-[min(32rem,min(52vw,100%))] sm:flex-1 sm:pt-[var(--space-100)]">
            <p className="m-0 text-pretty">{HOME_SCENARIO_COPY.multiOrgPersonal}</p>
            <p className="m-0 text-pretty">{HOME_SCENARIO_COPY.multiOrgDock}</p>
          </div>
        </div>

        {/* 教育三身份骨架：场景六（老师）/ 场景七（学生）/ 场景八（家长） */}
        <div
          id="scenario-edu-roles-notes"
          className="flex w-full flex-col gap-[var(--space-300)]"
        >
          <div className="flex w-full flex-col items-stretch gap-2 sm:flex-row sm:items-start sm:gap-5 md:gap-6">
            <Button
              variant="chat-submit"
              className="w-full shrink-0 sm:w-auto"
              onClick={() => navigateMainAi(navigate, SCENARIO_EDU_TEACHER)}
              title="教师身份：默认含示范教育机构 + 机构/个人教育空间，进入教育后顶栏切教育空间切换器"
            >
              场景六（老师进入教育）
            </Button>
            <p className="m-0 w-full min-w-0 max-w-full text-pretty text-left text-[length:var(--font-size-sm)] font-[var(--font-weight-regular)] leading-[1.55] text-text sm:max-w-[min(32rem,min(52vw,100%))] sm:flex-1 sm:pt-[var(--space-100)]">
              {HOME_SCENARIO_COPY.scenarioSixEduTeacher}
            </p>
          </div>
          <div className="flex w-full flex-col items-stretch gap-2 sm:flex-row sm:items-start sm:gap-5 md:gap-6">
            <Button
              variant="chat-submit"
              className="w-full shrink-0 sm:w-auto"
              onClick={() => navigateMainAi(navigate, SCENARIO_EDU_STUDENT)}
              title="学生身份（C 端）：仅个人教育空间，无组织感知"
            >
              场景七（学生进入教育）
            </Button>
            <p className="m-0 w-full min-w-0 max-w-full text-pretty text-left text-[length:var(--font-size-sm)] font-[var(--font-weight-regular)] leading-[1.55] text-text sm:max-w-[min(32rem,min(52vw,100%))] sm:flex-1 sm:pt-[var(--space-100)]">
              {HOME_SCENARIO_COPY.scenarioSevenEduStudent}
            </p>
          </div>
          <div className="flex w-full flex-col items-stretch gap-2 sm:flex-row sm:items-start sm:gap-5 md:gap-6">
            <Button
              variant="chat-submit"
              className="w-full shrink-0 sm:w-auto"
              onClick={() => navigateMainAi(navigate, SCENARIO_EDU_PARENT)}
              title="家长身份（C 端）：仅个人教育空间，无组织感知；含 Parent Copilot 入口"
            >
              场景八（家长进入教育）
            </Button>
            <p className="m-0 w-full min-w-0 max-w-full text-pretty text-left text-[length:var(--font-size-sm)] font-[var(--font-weight-regular)] leading-[1.55] text-text sm:max-w-[min(32rem,min(52vw,100%))] sm:flex-1 sm:pt-[var(--space-100)]">
              {HOME_SCENARIO_COPY.scenarioEightEduParent}
            </p>
          </div>
          <div className="flex w-full flex-col items-stretch gap-2 sm:flex-row sm:items-start sm:gap-5 md:gap-6">
            <Button
              variant="chat-submit"
              className="w-full shrink-0 sm:w-auto"
              onClick={() => navigateMainAi(navigate, SCENARIO_EDU_ADMIN)}
              title="机构管理者身份（B 端）：教务 + 督导 + 校长合体视角；只有机构教育空间"
            >
              场景九（机构管理者进入教育）
            </Button>
            <p className="m-0 w-full min-w-0 max-w-full text-pretty text-left text-[length:var(--font-size-sm)] font-[var(--font-weight-regular)] leading-[1.55] text-text sm:max-w-[min(32rem,min(52vw,100%))] sm:flex-1 sm:pt-[var(--space-100)]">
              {HOME_SCENARIO_COPY.scenarioNineEduAdmin}
            </p>
          </div>
        </div>

      {/* 组件展示按钮 */}
      <Dialog open={componentsOpen} onOpenChange={setComponentsOpen}>
        <DialogTrigger asChild>
          <Button variant="chat-reset">
            组件展示
          </Button>
        </DialogTrigger>
        <DialogContent 
          className="max-w-[calc(100vw-80px)] w-[1200px] max-h-[calc(100vh-80px)] flex flex-col overflow-hidden gap-0 p-0 border border-border"
        >
          <DialogHeader className="shrink-0">
            <DialogTitle>组件库</DialogTitle>
            <DialogDescription className="sr-only">这是一个展示所有组件示例的弹窗</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-hidden min-h-0 relative w-full flex flex-col">
            <ComponentShowcase />
          </div>
        </DialogContent>
      </Dialog>

        <Button
          variant="chat-submit"
          className="w-full sm:w-auto sm:self-center"
          onClick={() => navigateMainAi(navigate, SCENARIO_CUI_CARD_RULES)}
          title="独立 scenario（cui-card-rules）；当前与场景二同构，后续仅本入口可单独演进"
        >
          CUI卡片交互场景及规则
        </Button>
      </div>
    </div>
  );
}