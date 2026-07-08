"use client";

import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/surface";
import { isOverdue } from "@/lib/date";
import type { Platform, Task } from "@/types/task";
import { EmptyState } from "./states";
import { TaskTable } from "./TaskTable";

export function GroupedTaskSection({
  title,
  tasks,
  onAdd,
  onEdit,
  onDelete,
  onQuickUpdate,
}: {
  title: string;
  tasks: Task[];
  onAdd: (platform?: Platform) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onQuickUpdate: (task: Task, patch: Partial<Task>) => Promise<void>;
}) {
  const [open, setOpen] = useState(true);
  const completed = tasks.filter((task) => task.status === "已完成").length;
  const rate = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
        <button className="flex items-center gap-2 text-left" onClick={() => setOpen(!open)}>
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <span className="font-semibold text-zinc-950">{title}</span>
          <span className="text-sm text-zinc-500">{tasks.length} 个任务 · 完成率 {rate}% · 逾期 {tasks.filter(isOverdue).length}</span>
        </button>
        <Button size="sm" variant="outline" onClick={() => onAdd(title === "TikTok" || title === "Amazon" || title === "独立站" ? title : undefined)}>
          <Plus className="h-4 w-4" />
          快速新增
        </Button>
      </div>
      {open ? tasks.length ? <TaskTable tasks={tasks} onEdit={onEdit} onDelete={onDelete} onQuickUpdate={onQuickUpdate} /> : <div className="p-4"><EmptyState /></div> : null}
    </Card>
  );
}
