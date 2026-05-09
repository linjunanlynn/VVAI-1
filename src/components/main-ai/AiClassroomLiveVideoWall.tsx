/**
 * AI 课堂左栏：视频墙。
 *
 * 三身份分别看到的视频墙：
 * - 老师：自己（大）+ 全班学生缩略图网格
 * - 学生：老师（大）+ 自己 + 同班同学缩略图
 * - 家长：老师 + 自己孩子（仅 2 路）
 *
 * 视频用静态 placeholder（圆形背景 + emoji），右下角小图标显示 mic / camera 状态，
 * 举手中的学生左上角加 🙋 角标。所有交互（点缩略图放大）暂不实现，按 demo 占位。
 */

import * as React from "react"
import { Hand, Mic, MicOff, Video, VideoOff } from "lucide-react"
import { cn } from "../ui/utils"
import {
  type AiClassroomLiveStudentDemo,
  type AiClassroomLiveTeacherDemo,
  DEMO_LIVE_PARENT_CHILD_ID,
} from "./aiClassroomLiveDemo"
import type { EduLessonAttendingRole } from "./homeScenarioLayout"

interface VideoTileProps {
  name: string
  emoji: string
  avatarBg: string
  size: "lg" | "md" | "sm"
  micOn: boolean
  cameraOn: boolean
  handRaised?: boolean
  drifted?: boolean
  isSelf?: boolean
  /** 角标小字（"老师" / "走神" / "正在答题"）  */
  badge?: string
  badgeTone?: "primary" | "warning" | "success" | "neutral"
}

function VideoTile({
  name,
  emoji,
  avatarBg,
  size,
  micOn,
  cameraOn,
  handRaised,
  drifted,
  isSelf,
  badge,
  badgeTone = "neutral",
}: VideoTileProps) {
  const dim = size === "lg" ? "h-[260px]" : size === "md" ? "h-[140px]" : "h-[112px]"
  const emojiSize =
    size === "lg" ? "text-[64px]" : size === "md" ? "text-[40px]" : "text-[32px]"
  const nameSize = size === "lg" ? "text-sm" : "text-[length:var(--font-size-xs)]"
  const badgeToneClass =
    badgeTone === "primary"
      ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground,white)]"
      : badgeTone === "warning"
        ? "bg-[var(--color-warning)] text-white"
        : badgeTone === "success"
          ? "bg-[var(--color-success)] text-white"
          : "bg-black/55 text-white"

  return (
    <div
      className={cn(
        "relative flex w-full flex-col overflow-hidden rounded-[var(--radius-md)] border bg-bg-subtle shadow-xs",
        dim,
        drifted ? "border-[var(--color-warning)]/55" : "border-border",
        isSelf ? "ring-2 ring-[var(--color-primary)]/55" : "",
      )}
    >
      {/* 摄像头关 → 显示底色 + emoji；摄像头开 → 仍是 placeholder（demo） */}
      <div
        className="flex flex-1 items-center justify-center"
        style={{ background: cameraOn ? avatarBg : "var(--color-bg-subtle)" }}
      >
        {cameraOn ? (
          <span aria-hidden className={cn("select-none drop-shadow-sm", emojiSize)}>
            {emoji}
          </span>
        ) : (
          <VideoOff className="h-7 w-7 text-text-tertiary" />
        )}
      </div>

      {/* 左上：举手 / 走神 角标 */}
      {handRaised ? (
        <span
          className={cn(
            "absolute left-1.5 top-1.5 inline-flex items-center gap-[2px] rounded-full px-1.5 py-[1px] text-[10px] font-[var(--font-weight-medium)] shadow",
            badgeToneClass,
          )}
        >
          <Hand className="h-3 w-3" />
          举手
        </span>
      ) : drifted ? (
        <span className="absolute left-1.5 top-1.5 inline-flex items-center rounded-full bg-[var(--color-warning)] px-1.5 py-[1px] text-[10px] font-[var(--font-weight-medium)] text-white shadow">
          走神
        </span>
      ) : badge ? (
        <span
          className={cn(
            "absolute left-1.5 top-1.5 inline-flex items-center rounded-full px-1.5 py-[1px] text-[10px] font-[var(--font-weight-medium)] shadow",
            badgeToneClass,
          )}
        >
          {badge}
        </span>
      ) : null}

      {/* 底栏：名字 + 麦/摄状态 */}
      <div className="flex shrink-0 items-center gap-1 bg-black/55 px-1.5 py-[3px] text-white">
        <span className={cn("flex-1 truncate", nameSize)}>{name}</span>
        {micOn ? (
          <Mic className="h-3 w-3 shrink-0 text-[var(--color-success)]" />
        ) : (
          <MicOff className="h-3 w-3 shrink-0 text-text-tertiary" />
        )}
        {cameraOn ? (
          <Video className="h-3 w-3 shrink-0 text-[var(--color-success)]" />
        ) : (
          <VideoOff className="h-3 w-3 shrink-0 text-text-tertiary" />
        )}
      </div>
    </div>
  )
}

export interface AiClassroomLiveVideoWallProps {
  role: EduLessonAttendingRole
  teacher: AiClassroomLiveTeacherDemo
  students: AiClassroomLiveStudentDemo[]
  /** 自己的 mic / camera 状态（用于覆盖底表里 isSelf 那一格） */
  selfMicOn: boolean
  selfCameraOn: boolean
  selfHandRaised: boolean
}

export function AiClassroomLiveVideoWall({
  role,
  teacher,
  students,
  selfMicOn,
  selfCameraOn,
  selfHandRaised,
}: AiClassroomLiveVideoWallProps) {
  /** 学生身份：把 students 中 isSelf 的那条字段替换为外层传入的实时态 */
  const studentsForRender = React.useMemo<AiClassroomLiveStudentDemo[]>(() => {
    if (role !== "student") return students
    return students.map((s) =>
      s.isSelf
        ? {
            ...s,
            micOn: selfMicOn,
            cameraOn: selfCameraOn,
            handRaised: selfHandRaised,
          }
        : s,
    )
  }, [role, students, selfMicOn, selfCameraOn, selfHandRaised])

  /* --------------------------
   * 老师视图：自己（大）+ 全班学生缩略图
   * -------------------------- */
  if (role === "teacher") {
    return (
      <div className="flex h-full min-h-0 w-full flex-col gap-3 p-3">
        <VideoTile
          name={`${teacher.name}（我）`}
          emoji={teacher.emoji}
          avatarBg={teacher.avatarBg}
          size="lg"
          micOn={teacher.micOn}
          cameraOn={teacher.cameraOn}
          isSelf
          badge="老师"
          badgeTone="primary"
        />
        <div className="grid min-h-0 flex-1 grid-cols-2 gap-2 overflow-y-auto pr-1">
          {studentsForRender.map((s) => (
            <VideoTile
              key={s.id}
              name={s.name}
              emoji={s.emoji}
              avatarBg={s.avatarBg}
              size="sm"
              micOn={s.micOn}
              cameraOn={s.cameraOn}
              handRaised={s.handRaised}
              drifted={s.drifted}
              badge={s.answering ? "答题中" : undefined}
              badgeTone="success"
            />
          ))}
        </div>
      </div>
    )
  }

  /* --------------------------
   * 家长视图：老师 + 自己孩子（仅 2 路）
   * -------------------------- */
  if (role === "parent") {
    const child = students.find((s) => s.id === DEMO_LIVE_PARENT_CHILD_ID) ?? students[0]
    return (
      <div className="flex h-full min-h-0 w-full flex-col gap-3 p-3">
        <VideoTile
          name={teacher.name}
          emoji={teacher.emoji}
          avatarBg={teacher.avatarBg}
          size="lg"
          micOn={teacher.micOn}
          cameraOn={teacher.cameraOn}
          badge="老师"
          badgeTone="primary"
        />
        <VideoTile
          name={`${child.name}（孩子）`}
          emoji={child.emoji}
          avatarBg={child.avatarBg}
          size="md"
          micOn={child.micOn}
          cameraOn={child.cameraOn}
          handRaised={child.handRaised}
          drifted={child.drifted}
          badge={child.answering ? "答题中" : undefined}
          badgeTone="success"
        />
        <div className="rounded-[var(--radius-md)] border border-dashed border-border bg-bg-subtle/60 px-3 py-2 text-[length:var(--font-size-xs)] text-text-tertiary">
          家长视图：仅显示老师与你的孩子；不打扰课堂。
        </div>
      </div>
    )
  }

  /* --------------------------
   * 学生视图：老师（大）+ 自己 + 同班同学缩略图
   * -------------------------- */
  const others = studentsForRender.filter((s) => !s.isSelf)
  const self = studentsForRender.find((s) => s.isSelf)
  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-3 p-3">
      <VideoTile
        name={teacher.name}
        emoji={teacher.emoji}
        avatarBg={teacher.avatarBg}
        size="lg"
        micOn={teacher.micOn}
        cameraOn={teacher.cameraOn}
        badge="老师"
        badgeTone="primary"
      />
      {self ? (
        <VideoTile
          name="我"
          emoji={self.emoji}
          avatarBg={self.avatarBg}
          size="md"
          micOn={self.micOn}
          cameraOn={self.cameraOn}
          handRaised={self.handRaised}
          isSelf
        />
      ) : null}
      <div className="grid min-h-0 flex-1 grid-cols-2 gap-2 overflow-y-auto pr-1">
        {others.map((s) => (
          <VideoTile
            key={s.id}
            name={s.name}
            emoji={s.emoji}
            avatarBg={s.avatarBg}
            size="sm"
            micOn={s.micOn}
            cameraOn={s.cameraOn}
            handRaised={s.handRaised}
            drifted={s.drifted}
          />
        ))}
      </div>
    </div>
  )
}
