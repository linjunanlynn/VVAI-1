/**
 * 《主CUI交互》标准欢迎卡片（标题左侧强调条 + 正文 + 弱色提示），与场景六/七/八主 VVAI 产品稿一致。
 * 「首次进入教育应用」的身份化开场仍在门户区（educationStageCopy / Hero），不使用本组件。
 */
import * as React from "react"
import { Avatar, AvatarImage, AvatarFallback } from "../ui/avatar"
import {
  MAIN_VVAI_STANDARD_BODY,
  MAIN_VVAI_STANDARD_HINT,
  MAIN_VVAI_STANDARD_TITLE,
} from "./mainCuiGuideGreeting"

export function MainVvaiStandardWelcomeCard({ avatarSrc }: { avatarSrc?: string }) {
  return (
    <div className="flex w-full flex-col gap-[var(--space-150)] md:flex-row md:gap-[var(--space-200)]">
      <Avatar className="h-[var(--space-700)] w-[var(--space-700)] shrink-0 md:h-[var(--space-900)] md:w-[var(--space-900)]">
        <AvatarImage src={avatarSrc} className="object-cover" />
        <AvatarFallback>AI</AvatarFallback>
      </Avatar>
      <div className="w-fit max-w-[min(100%,560px)] rounded-tl-sm rounded-tr-lg rounded-bl-lg rounded-br-lg bg-bg p-[var(--space-300)_var(--space-350)] shadow-elevation-sm">
        <div className="flex gap-[var(--space-200)]">
          <span
            className="mt-[0.35em] h-[1.15em] w-[3px] shrink-0 rounded-full bg-primary"
            aria-hidden
          />
          <div className="flex min-w-0 flex-1 flex-col gap-[var(--space-200)]">
            <p className="m-0 text-[length:var(--font-size-base)] font-[var(--font-weight-semibold)] leading-snug text-text">
              {MAIN_VVAI_STANDARD_TITLE}
            </p>
            <p className="m-0 text-[length:var(--font-size-base)] font-[var(--font-weight-regular)] leading-normal text-text">
              {MAIN_VVAI_STANDARD_BODY}
            </p>
            <p className="m-0 text-[length:var(--font-size-sm)] font-[var(--font-weight-regular)] leading-relaxed text-text-tertiary">
              {MAIN_VVAI_STANDARD_HINT}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
