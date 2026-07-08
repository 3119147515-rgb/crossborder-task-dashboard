"use client";

import { Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate, formatDateTime } from "@/lib/date";
import type { Task } from "@/types/task";
import { BusinessModuleBadge, OverdueBadge, PlatformBadge, PriorityBadge, StageBadge, StatusBadge } from "./badges";
import { ProgressBar } from "./ProgressBar";

export function TaskTable({
  tasks,
  onEdit,
  onDelete,
  onQuickUpdate,
}: {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onQuickUpdate: (task: Task, patch: Partial<Task>) => Promise<void>;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1500px] border-separate border-spacing-0 text-sm">
        <thead>
          <tr className="bg-zinc-50 text-left text-xs font-medium text-zinc-500">
            {["平台", "任务", "负责人", "模块/阶段", "优先级", "状态", "进度", "截止", "最新进展", "卡点", "下一步", "KPI", "更新", "操作"].map((item) => (
              <th className="border-b border-zinc-200 px-3 py-3" key={item}>{item}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr className="align-top hover:bg-zinc-50" key={task.id}>
              <td className="border-b border-zinc-100 px-3 py-3"><PlatformBadge value={task.platform} /></td>
              <td className="max-w-72 border-b border-zinc-100 px-3 py-3">
                <div className="font-medium text-zinc-950">{task.task_name}</div>
                <div className="mt-1 line-clamp-2 text-xs text-zinc-500">{task.description}</div>
              </td>
              <td className="border-b border-zinc-100 px-3 py-3">
                <div className="font-medium">{task.owner}</div>
                <div className="text-xs text-zinc-500">{task.role}</div>
              </td>
              <td className="space-y-1 border-b border-zinc-100 px-3 py-3">
                <BusinessModuleBadge value={task.business_module} />
                <StageBadge value={task.project_stage} />
              </td>
              <td className="border-b border-zinc-100 px-3 py-3"><PriorityBadge value={task.priority} /></td>
              <td className="border-b border-zinc-100 px-3 py-3">
                <select
                  className="h-8 rounded-md border border-zinc-200 bg-white px-2 text-xs"
                  value={task.status}
                  onChange={(event) => onQuickUpdate(task, { status: event.target.value as Task["status"], progress: event.target.value === "已完成" ? 100 : task.progress })}
                >
                  {["未开始", "进行中", "待确认", "已完成", "已暂停"].map((status) => <option key={status}>{status}</option>)}
                </select>
                <div className="mt-1"><StatusBadge value={task.status} /></div>
              </td>
              <td className="border-b border-zinc-100 px-3 py-3">
                <ProgressBar value={task.progress} />
                <input
                  aria-label="修改进度"
                  className="mt-2 w-full"
                  type="range"
                  min={0}
                  max={100}
                  value={task.progress}
                  onChange={(event) => onQuickUpdate(task, { progress: Number(event.target.value), status: Number(event.target.value) === 100 ? "已完成" : task.status })}
                />
              </td>
              <td className="border-b border-zinc-100 px-3 py-3">
                <div>{formatDate(task.due_date)}</div>
                <div className="mt-1"><OverdueBadge task={task} /></div>
              </td>
              <td className="max-w-60 border-b border-zinc-100 px-3 py-3">
                <textarea className="h-16 w-full rounded-md border border-zinc-200 px-2 py-1 text-xs" defaultValue={task.latest_update || ""} onBlur={(event) => onQuickUpdate(task, { latest_update: event.target.value })} />
              </td>
              <td className="max-w-56 border-b border-zinc-100 px-3 py-3">
                <textarea className="h-16 w-full rounded-md border border-zinc-200 px-2 py-1 text-xs" defaultValue={task.blocker || ""} onBlur={(event) => onQuickUpdate(task, { blocker: event.target.value })} />
              </td>
              <td className="max-w-56 border-b border-zinc-100 px-3 py-3">
                <textarea className="h-16 w-full rounded-md border border-zinc-200 px-2 py-1 text-xs" defaultValue={task.next_action || ""} onBlur={(event) => onQuickUpdate(task, { next_action: event.target.value })} />
              </td>
              <td className="border-b border-zinc-100 px-3 py-3">
                <div>{task.kpi_metric || "-"}</div>
                <div className="text-xs text-zinc-500">目标 {task.target_value || "-"} / 当前 {task.current_value || "-"}</div>
              </td>
              <td className="border-b border-zinc-100 px-3 py-3 text-xs text-zinc-500">{formatDateTime(task.updated_at)}</td>
              <td className="border-b border-zinc-100 px-3 py-3">
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => onEdit(task)}><Edit className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => onDelete(task)}><Trash2 className="h-4 w-4 text-red-600" /></Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
