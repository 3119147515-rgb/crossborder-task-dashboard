"use client";

import { CheckCircle2, Edit, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate, formatDateTime, isCompleted, isDueSoon, isOverdue } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { Task } from "@/types/task";
import { BusinessModuleBadge, OverdueBadge, PlatformBadge, PriorityBadge, RiskBadge, StageBadge, StatusBadge } from "./badges";
import { ProgressBar } from "./ProgressBar";

export function TaskTable({
  tasks,
  onEdit,
  onDelete,
  onOpenTask,
  onQuickEdit,
  onComplete,
  onQuickUpdate,
}: {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onOpenTask: (task: Task) => void;
  onQuickEdit: (task: Task) => void;
  onComplete: (task: Task) => void;
  onQuickUpdate: (task: Task, patch: Partial<Task>) => Promise<void>;
}) {
  const columns = [
    ["平台", "w-[90px] min-w-[90px]"],
    ["任务", "w-[280px] min-w-[280px]"],
    ["负责人", "w-[130px] min-w-[130px]"],
    ["模块/阶段", "w-[150px] min-w-[150px]"],
    ["优先级", "w-[90px] min-w-[90px]"],
    ["状态", "w-[120px] min-w-[120px]"],
    ["风险", "w-[110px] min-w-[110px]"],
    ["进度", "w-[170px] min-w-[170px]"],
    ["截止", "w-[120px] min-w-[120px]"],
    ["最新进展", "w-[220px] min-w-[220px]"],
    ["卡点", "w-[210px] min-w-[210px]"],
    ["下一步", "w-[210px] min-w-[210px]"],
    ["KPI", "w-[170px] min-w-[170px]"],
    ["更新", "w-[150px] min-w-[150px]"],
    ["操作", "w-[170px] min-w-[170px]"],
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[2400px] border-separate border-spacing-0 text-sm">
        <thead>
          <tr className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
            {columns.map(([item, width]) => (
              <th className={cn("sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-3 py-3 whitespace-nowrap", width)} key={item}>{item}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr
              className={cn("group cursor-pointer align-top transition hover:bg-blue-50/35", task.blocker?.trim() && "bg-red-50/30")}
              key={task.id}
              onClick={() => onOpenTask(task)}
            >
              <td className="w-[90px] min-w-[90px] border-b border-slate-100 px-3 py-3"><PlatformBadge value={task.platform} /></td>
              <td className="w-[280px] min-w-[280px] border-b border-slate-100 px-3 py-3">
                <div className="line-clamp-2 font-semibold leading-5 text-slate-950">{task.task_name}</div>
                <div className="mt-1 line-clamp-2 safe-text text-xs leading-5 text-slate-500">{task.description}</div>
              </td>
              <td className="w-[130px] min-w-[130px] border-b border-slate-100 px-3 py-3">
                <div className="truncate font-medium text-slate-900">{task.owner}</div>
                <div className="whitespace-nowrap text-xs text-slate-500">{task.role}</div>
              </td>
              <td className="w-[150px] min-w-[150px] space-y-1 border-b border-slate-100 px-3 py-3">
                <BusinessModuleBadge value={task.business_module} />
                <StageBadge value={task.project_stage} />
              </td>
              <td className="w-[90px] min-w-[90px] border-b border-slate-100 px-3 py-3"><PriorityBadge value={task.priority} /></td>
              <td className="w-[120px] min-w-[120px] border-b border-slate-100 px-3 py-3" onClick={(event) => event.stopPropagation()}>
                <select
                  className="h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-xs outline-none focus:border-blue-400"
                  value={task.status}
                  onChange={(event) => onQuickUpdate(task, { status: event.target.value as Task["status"], progress: event.target.value === "已完成" ? 100 : task.progress })}
                >
                  {["未开始", "进行中", "待确认", "已完成", "已暂停"].map((status) => <option key={status}>{status}</option>)}
                </select>
                <div className="mt-1"><StatusBadge value={task.status} /></div>
              </td>
              <td className="w-[110px] min-w-[110px] border-b border-slate-100 px-3 py-3"><RiskBadge task={task} /></td>
              <td className="w-[170px] min-w-[170px] border-b border-slate-100 px-3 py-3" onClick={(event) => event.stopPropagation()}>
                <ProgressBar value={task.progress} />
                <input
                  aria-label="修改进度"
                  className="mt-2 w-full accent-blue-600"
                  type="range"
                  min={0}
                  max={100}
                  value={task.progress}
                  onChange={(event) => onQuickUpdate(task, { progress: Number(event.target.value), status: Number(event.target.value) === 100 ? "已完成" : task.status })}
                />
              </td>
              <td className="w-[120px] min-w-[120px] border-b border-slate-100 px-3 py-3">
                <div className={cn("font-medium text-slate-700", isDueSoon(task) && "text-amber-600", isOverdue(task) && "text-red-600")}>{formatDate(task.due_date)}</div>
                <div className="mt-1"><OverdueBadge task={task} /></div>
              </td>
              <td className="w-[220px] min-w-[220px] border-b border-slate-100 px-3 py-3">
                <SummaryText value={task.latest_update} />
              </td>
              <td className="w-[210px] min-w-[210px] border-b border-slate-100 px-3 py-3">
                <SummaryText value={task.blocker} danger={Boolean(task.blocker?.trim())} />
              </td>
              <td className="w-[210px] min-w-[210px] border-b border-slate-100 px-3 py-3">
                <SummaryText value={task.next_action} />
              </td>
              <td className="w-[170px] min-w-[170px] border-b border-slate-100 px-3 py-3">
                <div className="truncate font-medium text-slate-800">{task.kpi_metric || "-"}</div>
                <div className="whitespace-nowrap text-xs text-slate-500">目标 {task.target_value || "-"} / 当前 {task.current_value || "-"}</div>
              </td>
              <td className="w-[150px] min-w-[150px] border-b border-slate-100 px-3 py-3 text-xs text-slate-500">{formatDateTime(task.updated_at)}</td>
              <td className="w-[170px] min-w-[170px] border-b border-slate-100 px-3 py-3" onClick={(event) => event.stopPropagation()}>
                <div className="flex flex-nowrap gap-1 opacity-100 transition md:opacity-0 md:group-hover:opacity-100">
                  <Button variant="ghost" size="icon" title="快速更新" onClick={() => onQuickEdit(task)}><RefreshCw className="h-4 w-4 text-blue-600" /></Button>
                  {!isCompleted(task) ? (
                    <Button variant="ghost" size="icon" title="一键完成" onClick={() => onComplete(task)}><CheckCircle2 className="h-4 w-4 text-emerald-600" /></Button>
                  ) : null}
                  <Button variant="ghost" size="icon" title="编辑任务" onClick={() => onEdit(task)}><Edit className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" title="删除任务" onClick={() => onDelete(task)}><Trash2 className="h-4 w-4 text-red-600" /></Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SummaryText({ value, danger = false }: { value?: string | null; danger?: boolean }) {
  return (
    <div className={cn(
      "min-h-10 rounded-lg border px-2.5 py-2 text-xs leading-5",
      danger ? "border-red-100 bg-red-50 text-red-800" : "border-slate-100 bg-slate-50 text-slate-600",
    )}>
      <span className="line-clamp-2 safe-text">{value?.trim() || "未填写"}</span>
    </div>
  );
}
