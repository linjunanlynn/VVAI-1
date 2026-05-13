/**
 * 教育微盘 · 卡 2（单空间文件管家）
 *
 * 设计动机
 * ----------------------------------------------------
 * 与产品截图（"全员空间 · X 个文件 · X 位成员 → 上传文件 / 创建文件夹 → 文件列表 →
 * 成员列表"）对齐，把这张卡定位为**真正的文件管家**：
 *  - 顶部：空间头像 + 名称 + 元信息 + 编辑入口
 *  - 操作条：上传文件 / 创建文件夹（demo 内是占位动作 + AI 回执）
 *  - 路径面包屑（v1 仅展示「根目录」）
 *  - 文件 / 文件夹表格：名称 | 时间 | 所有者 | 大小 | 操作
 *    - 第一行特殊：「📁 教学资料 · 课程文件夹」→ 点击进入 `EduTeachingMaterialsBrowserCard`
 *    - 其它若干文件夹 / 文件来自 `educationDiskRegistry` 的 demo fixture（拍平 groups 取首组）
 *  - 成员列表（demo：1 位「超级管理员」）
 *  - 卡尾：返回上一级（卡 1）
 *
 * 与 v1（按角色分组的 2-3 组文件夹墙）的边界
 * ----------------------------------------------------
 * v1 的"备课与教案 / 课堂实录 / 学情与报告"三组分组卡只用作"业务摘要"，
 * 与"教学资料/{课程}/{课次}"的真实存储结构脱节。本次升级改成单一根目录文件
 * 管家视图，并把"教学资料"作为根下的一个特殊文件夹，让用户从微盘进到课程
 * 资料的体验和真实存储结构一致。
 */
import * as React from "react"
import {
  ArrowLeft,
  Building2,
  ChevronDown,
  ChevronRight,
  FileArchive,
  FileAudio,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  FolderClosed,
  FolderPlus,
  GraduationCap,
  Home,
  MoreHorizontal,
  Pencil,
  UploadCloud,
  type LucideIcon,
} from "lucide-react"
import { GenericCard } from "./GenericCard"
import { cn } from "../ui/utils"
import type {
  EduDiskFileItem,
  EduDiskFileType,
  EduDiskFolderData,
  EduDiskFolderItem,
} from "./educationDiskRegistry"

export interface EduDiskFolderCardProps {
  data: EduDiskFolderData
  /** 文件夹整行点击：投递「打开 ${folderName}」类指令到主对话（非教学资料分支） */
  onOpenFolder: (folder: EduDiskFolderItem) => void
  /** 整卡级推荐指令（保留接口，新设计里不使用，仅保 API 兼容） */
  onPickPrompt?: (command: string) => void
  /** 返回卡 1 */
  onBackToList: () => void
  /** 进入「教学资料」3 层浏览卡（与 AI 课堂资料卡共享 store） */
  onEnterTeachingMaterials?: () => void
  /** 上传文件 / 新建文件夹的占位动作（demo：父级把意图回执到主对话） */
  onUploadFile?: () => void
  onCreateFolder?: () => void
  className?: string
}

const FILE_TYPE_ICON: Record<EduDiskFileType, LucideIcon> = {
  doc: FileText,
  pdf: FileText,
  ppt: FileText,
  xls: FileSpreadsheet,
  image: FileImage,
  video: FileVideo,
  audio: FileAudio,
  zip: FileArchive,
  other: FileText,
}

const FILE_TYPE_TONE: Record<EduDiskFileType, string> = {
  doc: "text-[var(--color-info)]",
  pdf: "text-[var(--color-error,#ef4444)]",
  ppt: "text-[var(--color-warning)]",
  xls: "text-[var(--color-success)]",
  image: "text-[var(--color-warning)]",
  video: "text-[var(--color-primary)]",
  audio: "text-[var(--color-purple,#8b5cf6)]",
  zip: "text-text-secondary",
  other: "text-text-secondary",
}

export function EduDiskFolderCard({
  data,
  onOpenFolder,
  onBackToList,
  onEnterTeachingMaterials,
  onUploadFile,
  onCreateFolder,
  className,
}: EduDiskFolderCardProps) {
  const KindIcon = data.spaceKind === "family" ? Home : Building2

  /**
   * 把 v1 按角色分组的 2-3 组拍平为一组（用第一组的全部文件夹）。
   * 真正的"教学资料"作为最后一行分组前置插入到列表头部（特殊视觉）。
   * 文件 = 取首组每个文件夹的 1 条 recentFiles，避免根目录过密。
   */
  const flatFolders: EduDiskFolderItem[] = React.useMemo(() => {
    const all: EduDiskFolderItem[] = []
    for (const g of data.groups) all.push(...g.folders)
    /** demo 取头 4 个，避免根目录过长 */
    return all.slice(0, 4)
  }, [data.groups])

  const flatFiles: EduDiskFileItem[] = React.useMemo(() => {
    const files: EduDiskFileItem[] = []
    /** 每个文件夹拿首条 recentFile，组成根目录"散落文件"区 */
    for (const f of flatFolders) {
      if (f.recentFiles[0]) files.push(f.recentFiles[0])
      if (files.length >= 5) break
    }
    return files.slice(0, 5)
  }, [flatFolders])

  return (
    <div className={cn("flex w-full max-w-[min(100%,720px)] flex-col", className)}>
      <GenericCard title={`${data.spaceName} · 教育微盘`}>
        {/* === 顶部：空间信息条 === */}
        <div className="flex w-full items-center gap-[var(--space-300)] rounded-[var(--radius-md)] border border-border bg-bg px-[var(--space-300)] py-[var(--space-250)]">
          <span
            className={cn(
              "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
              "bg-[var(--color-purple,#8b5cf6)]/14 text-[var(--color-purple,#8b5cf6)]",
            )}
          >
            <KindIcon className="size-5" strokeWidth={1.8} />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
            <span className="min-w-0 truncate text-[length:var(--font-size-md)] font-[var(--font-weight-semibold)] text-text">
              {data.spaceName}
            </span>
            <span className="min-w-0 truncate text-[length:var(--font-size-xs)] text-text-tertiary">
              {data.spaceKind === "institutional" ? "全员空间" : "家庭空间"} ·{" "}
              {data.fileCount} 个文件 · {Math.max(1, Math.round(data.weeklyAdded / 2))} 位成员
            </span>
          </div>
          <button
            type="button"
            aria-label="编辑空间信息"
            className="flex size-8 shrink-0 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-[var(--black-alpha-11)] hover:text-text"
          >
            <Pencil className="size-4" strokeWidth={1.8} />
          </button>
        </div>

        {/* === 操作条 === */}
        <div className="mt-[var(--space-300)] flex w-full flex-wrap items-center gap-[var(--space-200)]">
          <UploadButton onClick={onUploadFile ?? (() => {})} />
          <button
            type="button"
            onClick={onCreateFolder}
            className="inline-flex h-9 items-center gap-[var(--space-150)] rounded-[var(--radius-md)] border border-border bg-bg px-[var(--space-300)] text-[length:var(--font-size-sm)] text-text transition-colors hover:bg-[var(--black-alpha-11)]"
          >
            <FolderPlus className="size-3.5" strokeWidth={1.8} />
            创建文件夹
          </button>
        </div>

        {/* === 文件列表 === */}
        <div className="mt-[var(--space-300)] flex w-full flex-col gap-[var(--space-150)]">
          <div className="flex items-center gap-[var(--space-150)]">
            <h4 className="m-0 text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-text">
              文件列表
            </h4>
            <span className="text-[length:var(--font-size-xs)] text-text-tertiary">·</span>
            <span className="text-[length:var(--font-size-xs)] text-text-tertiary">根目录</span>
          </div>

          {/* 表头 */}
          <div className="hidden w-full grid-cols-[1fr_88px_88px_88px_44px] items-center gap-[var(--space-200)] border-b border-border px-[var(--space-200)] py-[var(--space-150)] text-[length:var(--font-size-xs)] text-text-tertiary sm:grid">
            <span>名称</span>
            <span>时间</span>
            <span>所有者</span>
            <span className="text-right">大小</span>
            <span className="text-right">操作</span>
          </div>

          {/* 行：教学资料（特殊） */}
          {onEnterTeachingMaterials ? (
            <TeachingMaterialsRow onClick={onEnterTeachingMaterials} />
          ) : null}

          {/* 行：其它文件夹 */}
          {flatFolders.map((folder) => (
            <FolderRow key={folder.id} folder={folder} onClick={() => onOpenFolder(folder)} />
          ))}

          {/* 行：散落文件 */}
          {flatFiles.map((file) => (
            <FileRow key={file.id} file={file} />
          ))}

          {/* 没有更多文件 */}
          <div className="flex w-full items-center justify-center py-[var(--space-200)] text-[length:var(--font-size-xs)] text-text-tertiary">
            没有更多了
          </div>
        </div>

        {/* === 成员列表 === */}
        <div className="mt-[var(--space-300)] flex w-full flex-col gap-[var(--space-150)]">
          <h4 className="m-0 text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-text">
            成员列表
          </h4>
          <div className="flex w-full items-center gap-[var(--space-300)] rounded-[var(--radius-md)] border border-border bg-bg px-[var(--space-300)] py-[var(--space-250)]">
            <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]/12 text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-[var(--color-primary)]">
              杨
            </span>
            <span className="min-w-0 flex-1 truncate text-[length:var(--font-size-sm)] text-text">
              杨校长
            </span>
            <span className="shrink-0 text-[length:var(--font-size-xs)] text-text-tertiary">
              超级管理员
            </span>
          </div>
        </div>

        {/* === 卡尾：返回 === */}
        <div className="mt-[var(--space-300)] flex w-full">
          <button
            type="button"
            onClick={onBackToList}
            className={cn(
              "inline-flex h-8 shrink-0 items-center gap-[var(--space-100)] rounded-full",
              "border border-border bg-bg px-[var(--space-300)] text-[length:var(--font-size-sm)] text-text-secondary",
              "transition-colors hover:bg-[var(--black-alpha-11)]",
            )}
            aria-label="返回教育微盘列表"
          >
            <ArrowLeft aria-hidden className="h-[14px] w-[14px]" strokeWidth={2} />
            返回教育微盘列表
          </button>
        </div>
      </GenericCard>
    </div>
  )
}

/* ============================================================
 * 子：上传按钮（带下拉指示）
 * ============================================================ */
function UploadButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-9 items-center gap-[var(--space-150)] rounded-[var(--radius-md)] border border-[var(--color-primary)]/45 bg-[var(--color-primary)]/8 px-[var(--space-300)] text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)] text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)]/14"
    >
      <UploadCloud className="size-3.5" strokeWidth={1.8} />
      上传文件
      <ChevronDown className="size-3" strokeWidth={2} />
    </button>
  )
}

/* ============================================================
 * 子：教学资料行（特殊 · 高亮 · 进入 EduTeachingMaterialsBrowserCard）
 * ============================================================ */
function TeachingMaterialsRow({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group grid w-full grid-cols-[1fr_44px] items-center gap-[var(--space-200)]",
        "rounded-[var(--radius-md)] border border-[var(--color-primary)]/35 bg-[var(--color-primary)]/4",
        "px-[var(--space-300)] py-[var(--space-250)] text-left transition-colors",
        "hover:bg-[var(--color-primary)]/10 sm:grid-cols-[1fr_88px_88px_88px_44px]",
      )}
    >
      <div className="flex min-w-0 items-center gap-[var(--space-200)]">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-primary)]/12 text-[var(--color-primary)]">
          <GraduationCap className="size-[18px]" strokeWidth={1.8} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
          <span className="w-full truncate text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-text">
            教学资料
          </span>
          <span className="w-full truncate text-[length:var(--font-size-xs)] text-text-tertiary">
            按课程组织 · 与 AI 课堂资料卡实时同步
          </span>
        </div>
      </div>
      <span className="hidden text-[length:var(--font-size-xs)] text-text-tertiary sm:block">
        —
      </span>
      <span className="hidden text-[length:var(--font-size-xs)] text-text-tertiary sm:block">
        系统
      </span>
      <span className="hidden text-right text-[length:var(--font-size-xs)] text-text-tertiary sm:block">
        —
      </span>
      <ChevronRight
        aria-hidden
        className="size-4 shrink-0 self-center justify-self-end text-[var(--color-primary)] transition-transform group-hover:translate-x-[2px]"
        strokeWidth={2}
      />
    </button>
  )
}

/* ============================================================
 * 子：文件夹行
 * ============================================================ */
function FolderRow({
  folder,
  onClick,
}: {
  folder: EduDiskFolderItem
  onClick: () => void
}) {
  /** 取首条 recentFiles 的所有者 / 时间作为该文件夹"代表元数据" */
  const owner = folder.recentFiles[0]?.uploaderName ?? "—"
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group grid w-full grid-cols-[1fr_44px] items-center gap-[var(--space-200)]",
        "rounded-[var(--radius-md)] border border-transparent bg-bg",
        "px-[var(--space-300)] py-[var(--space-250)] text-left transition-colors",
        "hover:border-border hover:bg-bg-secondary/40 sm:grid-cols-[1fr_88px_88px_88px_44px]",
      )}
    >
      <div className="flex min-w-0 items-center gap-[var(--space-200)]">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-warning)]/12 text-[var(--color-warning)]">
          <FolderClosed className="size-[18px]" strokeWidth={1.8} />
        </span>
        <span className="min-w-0 truncate text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)] text-text">
          {folder.name}
        </span>
      </div>
      <span className="hidden truncate text-[length:var(--font-size-xs)] text-text-tertiary sm:block">
        {folder.modifiedAtLabel}
      </span>
      <span className="hidden truncate text-[length:var(--font-size-xs)] text-text-tertiary sm:block">
        {owner}
      </span>
      <span className="hidden text-right text-[length:var(--font-size-xs)] text-text-tertiary sm:block">
        {folder.fileCount} 项
      </span>
      <span
        className="flex size-7 items-center justify-center justify-self-end rounded-md text-text-tertiary"
        aria-hidden
      >
        <MoreHorizontal className="size-4" />
      </span>
    </button>
  )
}

/* ============================================================
 * 子：文件行
 * ============================================================ */
function FileRow({ file }: { file: EduDiskFileItem }) {
  const Icon = FILE_TYPE_ICON[file.type]
  return (
    <div
      className={cn(
        "grid w-full grid-cols-[1fr_44px] items-center gap-[var(--space-200)]",
        "rounded-[var(--radius-md)] border border-transparent bg-bg",
        "px-[var(--space-300)] py-[var(--space-250)] text-left transition-colors",
        "hover:border-border hover:bg-bg-secondary/40 sm:grid-cols-[1fr_88px_88px_88px_44px]",
      )}
    >
      <div className="flex min-w-0 items-center gap-[var(--space-200)]">
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-bg-secondary",
            FILE_TYPE_TONE[file.type],
          )}
        >
          <Icon className="size-[18px]" strokeWidth={1.8} />
        </span>
        <span className="min-w-0 truncate text-[length:var(--font-size-sm)] text-text">
          {file.name}
        </span>
      </div>
      <span className="hidden truncate text-[length:var(--font-size-xs)] text-text-tertiary sm:block">
        {file.modifiedAtLabel}
      </span>
      <span className="hidden truncate text-[length:var(--font-size-xs)] text-text-tertiary sm:block">
        {file.uploaderName}
      </span>
      <span className="hidden text-right text-[length:var(--font-size-xs)] text-text-tertiary sm:block">
        {file.sizeMb >= 100 ? `${file.sizeMb.toFixed(0)} MB` : `${file.sizeMb} MB`}
      </span>
      <button
        type="button"
        aria-label="更多操作"
        className="flex size-7 items-center justify-center justify-self-end rounded-md text-text-tertiary transition-colors hover:bg-[var(--black-alpha-11)] hover:text-text"
      >
        <MoreHorizontal className="size-4" />
      </button>
    </div>
  )
}
