"use client";

import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/surface";
import { isOverdue } from "@/lib/date";
import type { Platform, Task, TeamMember } from "@/types/task";
import { EmptyState } from "./states";
import { TaskTable } from "./TaskTable";

export function GroupedTaskSection({
  title,
  tasks,
  onAdd,
  onEdit,
  onDelete,
  onOpenTask,
  onQuickEdit,
  onComplete,
  onQuickUpdate,
  memberMap,
}: {
  title: string;
  tasks: Task[];
  onAdd: (platform?: Platform) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onOpenTask: (task: Task) => void;
  onQuickEdit: (task: Task) => void;
  onComplete: (task: Task) => void;
  onQuickUpdate: (task: Task, patch: Partial<Task>) => Promise<void>;
  memberMap: Map<string, TeamMember>;
}) {
  const [open, setOpen] = useState(true);
  const completed = tasks.filter((task) => task.status === "已完成").length;
  const rate = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;

  return (
    <Card className="overflow-hidden border-slate-200 shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-white px-4 py-3 md:flex-row md:items-center md:justify-between">
        <button className="flex min-w-0 items-center gap-2 text-left" onClick={() => setOpen(!open)}>
          {open ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
          <span className="shrink-0 font-semibold text-slate-950">{title}</span>
          <span className="truncate text-sm text-slate-500">{tasks.length} 个任务 · 完成率 {rate}% · 逾期 {tasks.filter(isOverdue).length}</span>
        </button>
        <Button size="sm" variant="outline" onClick={() => onAdd(title === "TikTok" || title === "Amazon" || title === "独立站" ? title : undefined)}>
          <Plus className="h-4 w-4" />
          快速新增
        </Button>
      </div>
      {open ? tasks.length ? (
        <TaskTable
          tasks={tasks}
          onEdit={onEdit}
          onDelete={onDelete}
          onOpenTask={onOpenTask}
          onQuickEdit={onQuickEdit}
          onComplete={onComplete}
          onQuickUpdate={onQuickUpdate}
          memberMap={memberMap}
        />
      ) : <div className="p-4"><EmptyState /></div> : null}
    </Card>
  );
}
