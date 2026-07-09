"use client";

import { CheckCircle2, Circle, Clock3, Edit, RefreshCw, Trash2, X } from "lucide-react";
import type React from "react";
import { Button } from "@/components/ui/button";
import { formatDate, formatDateTime, isCompleted, isDueSoon, isOverdue } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { Task } from "@/types/task";
import { BusinessModuleBadge, OverdueBadge, PlatformBadge, PriorityBadge, RiskBadge, StageBadge, StatusBadge } from "./badges";
import { ProgressBar } from "./ProgressBar";

export function TaskDetailDrawer({
  task,
  onClose,
  onEdit,
  onDelete,
  onQuickEdit,
  onComplete,
  onQuickUpdate,
}: {
  task: Task | null;
  onClose: () => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onQuickEdit: (task: Task) => void;
  onComplete: (task: Task) => void;
  onQuickUpdate: (task: Task, patch: Partial<Task>) => Promise<void>;
}) {
  if (!task) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-slate-950/30" onClick={onClose} />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-2xl flex-col bg-white shadow-2xl sm:w-[620px]">
        <div className="border-b border-slate-200 bg-slate-50/70 px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Task profile</p>
                <h2 className="mt-1 text-xl font-semibold leading-7 text-slate-950">{task.task_name}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">{task.description || "暂无任务说明"}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <PlatformBadge value={task.platform} />
                <StatusBadge value={task.status} />
                <PriorityBadge value={task.priority} />
                <RiskBadge task={task} />
                <OverdueBadge task={task} />
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr_1fr_120px]">
                <SummaryItem label="职能大类" value={task.role} />
                <SummaryItem label="具体负责人" value={task.owner} />
                <SummaryItem label="当前进度" value={`${task.progress}%`} strong />
              </div>
            </div>
            <Button variant="ghost" size="icon" className="shrink-0" onClick={onClose} aria-label="关闭详情"><X className="h-5 w-5" /></Button>
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">Progress</p>
                <p className="mt-1 text-sm text-slate-600">当前进度 {task.progress}%</p>
              </div>
              <span className={cn("text-sm font-medium", isOverdue(task) && "text-red-600", isDueSoon(task) && "text-amber-600")}>截止 {formatDate(task.due_date)}</span>
            </div>
            <div className="mt-4">
              <ProgressBar value={task.progress} />
              <input
                aria-label="更新进度"
                className="mt-3 w-full accent-blue-600"
                min={0}
                max={100}
                type="range"
                value={task.progress}
                onChange={(event) => onQuickUpdate(task, { progress: Number(event.target.value), status: Number(event.target.value) === 100 ? "已完成" : task.status })}
              />
            </div>
          </section>

          <TaskTimeline task={task} />

          <section className="grid gap-3 sm:grid-cols-2">
            <Info label="负责人" value={`${task.owner} · ${task.role}`} />
            <Info label="业务模块" value={<BusinessModuleBadge value={task.business_module} />} />
            <Info label="项目阶段" value={<StageBadge value={task.project_stage} />} />
            <Info label="任务目标" value={task.ecommerce_goal} />
            <Info label="创建时间" value={formatDateTime(task.created_at)} />
            <Info label="更新时间" value={formatDateTime(task.updated_at)} />
          </section>

          <section className="grid gap-3">
            <DetailBlock label="最新进展" value={task.latest_update} />
            <DetailBlock label="当前卡点" value={task.blocker} danger />
            <DetailBlock label="下一步动作" value={task.next_action} />
            <DetailBlock label="预期结果" value={task.expected_result} />
            <DetailBlock label="实际结果" value={task.actual_result} />
          </section>

          <section className="rounded-lg border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-950">KPI 指标</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Info label="指标" value={task.kpi_metric || "-"} />
              <Info label="目标值" value={task.target_value || "-"} />
              <Info label="当前值" value={task.current_value || "-"} />
            </div>
          </section>
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-white px-5 py-4">
          <Button variant="outline" onClick={() => onQuickEdit(task)}><RefreshCw className="h-4 w-4" />快速更新</Button>
          <Button variant="outline" onClick={() => onEdit(task)}><Edit className="h-4 w-4" />编辑</Button>
          {!isCompleted(task) ? (
            <Button variant="secondary" onClick={() => onComplete(task)}><CheckCircle2 className="h-4 w-4" />一键完成</Button>
          ) : null}
          <Button variant="destructive" onClick={() => onDelete(task)}><Trash2 className="h-4 w-4" />删除</Button>
        </div>
      </aside>
    </div>
  );
}

function SummaryItem({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
      <div className="text-[11px] text-slate-400">{label}</div>
      <div className={cn("mt-1 truncate text-sm text-slate-700", strong && "text-lg font-semibold text-blue-700")}>{value}</div>
    </div>
  );
}

function TaskTimeline({ task }: { task: Task }) {
  const items = [
    { label: "任务创建", value: task.created_at, type: "created" },
    { label: "开始执行", value: task.start_date, type: "start" },
    { label: "计划截止", value: task.due_date, type: "due" },
    { label: "实际完成", value: task.completed_at, type: "completed", optional: true },
    { label: "最后更新", value: task.updated_at, type: "updated" },
  ].filter((item) => !item.optional || item.value);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">Timeline</p>
          <h3 className="mt-1 font-semibold text-slate-950">任务时间线</h3>
        </div>
        <Clock3 className="h-5 w-5 text-slate-400" />
      </div>
      <div className="mt-4 space-y-0">
        {items.map((item, index) => {
          const tone = getTimelineTone(task, item.type);
          const last = index === items.length - 1;
          return (
            <div key={item.label} className="grid grid-cols-[24px_1fr] gap-3">
              <div className="flex flex-col items-center">
                <span className={cn("mt-1 flex h-5 w-5 items-center justify-center rounded-full ring-4 ring-white", tone.dot)}>
                  {tone.done ? <CheckCircle2 className="h-3.5 w-3.5 text-white" /> : <Circle className="h-2.5 w-2.5 text-white" />}
                </span>
                {!last ? <span className="mt-1 h-full min-h-8 w-px bg-slate-200" /> : null}
              </div>
              <div className={cn("pb-4", last && "pb-0")}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium text-slate-900">{item.label}</span>
                  <span className={cn("rounded-md px-2 py-1 text-xs font-medium", tone.badge)}>{formatTimelineDate(item.value, item.type)}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{tone.note}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function getTimelineTone(task: Task, type: string) {
  if (type === "completed") return { dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700", note: "任务已完成并进入结果确认。", done: true };
  if (type === "due" && isOverdue(task)) return { dot: "bg-red-500", badge: "bg-red-50 text-red-700", note: "计划截止已过，需要尽快确认处理动作。", done: false };
  if (type === "due" && isDueSoon(task)) return { dot: "bg-orange-500", badge: "bg-orange-50 text-orange-700", note: "任务即将到期，建议今日检查推进状态。", done: false };
  if (type === "created") return { dot: "bg-blue-500", badge: "bg-blue-50 text-blue-700", note: "任务档案已进入项目任务池。", done: true };
  if (type === "updated") return { dot: "bg-slate-500", badge: "bg-slate-100 text-slate-600", note: "最近一次任务信息更新记录。", done: false };
  return { dot: "bg-slate-400", badge: "bg-slate-100 text-slate-600", note: "暂无异常状态。", done: false };
}

function formatTimelineDate(value?: string | null, type?: string) {
  if (!value) return "未设置";
  return type === "created" || type === "completed" || type === "updated" ? formatDateTime(value) : formatDate(value);
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="mt-1 text-sm font-medium text-slate-800">{value}</div>
    </div>
  );
}

function DetailBlock({ label, value, danger = false }: { label: string; value?: string | null; danger?: boolean }) {
  const empty = !value?.trim();
  return (
    <div className={cn("rounded-lg border p-4", danger && !empty ? "border-red-200 bg-red-50" : "border-slate-200 bg-white")}>
      <div className={cn("text-sm font-semibold", danger && !empty ? "text-red-700" : "text-slate-950")}>{label}</div>
      <p className={cn("mt-2 text-sm leading-6", empty ? "text-slate-400" : danger ? "text-red-700" : "text-slate-600")}>{empty ? "暂无记录" : value}</p>
    </div>
  );
}
