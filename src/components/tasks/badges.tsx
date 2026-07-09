import { Badge } from "@/components/ui/surface";
import { isDueSoon, isOverdue } from "@/lib/date";
import { getRiskLevel, type RiskLevel } from "@/lib/task-risk";
import type { Priority, ProjectStage, Task, TaskStatus } from "@/types/task";

export function PlatformBadge({ value }: { value: Task["platform"] }) {
  const cls = {
    TikTok: "bg-pink-50 text-pink-700 ring-1 ring-pink-200",
    Amazon: "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
    独立站: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200",
  }[value];
  return <Badge className={cls}>{value}</Badge>;
}

export function StatusBadge({ value }: { value: TaskStatus }) {
  const cls = {
    未开始: "bg-zinc-100 text-zinc-700",
    进行中: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
    待确认: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    已完成: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    已暂停: "bg-zinc-700 text-white",
  }[value];
  return <Badge className={cls}>{value}</Badge>;
}

export function PriorityBadge({ value }: { value: Priority }) {
  const cls = {
    高: "bg-red-50 text-red-700 ring-1 ring-red-200",
    中: "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200",
    低: "bg-zinc-100 text-zinc-600",
  }[value];
  return <Badge className={cls}>{value}</Badge>;
}

export function StageBadge({ value }: { value: ProjectStage }) {
  return <Badge className="bg-sky-50 text-sky-700 ring-1 ring-sky-100">{value}</Badge>;
}

export function BusinessModuleBadge({ value }: { value: string }) {
  return <Badge className="bg-violet-50 text-violet-700 ring-1 ring-violet-100">{value}</Badge>;
}

export function OverdueBadge({ task }: { task: Task }) {
  if (isOverdue(task)) return <Badge className="bg-red-600 text-white">已逾期</Badge>;
  if (isDueSoon(task)) return <Badge className="bg-amber-500 text-white">即将到期</Badge>;
  return null;
}

export function RiskBadge({ task, level = getRiskLevel(task) }: { task: Task; level?: RiskLevel }) {
  const cls: Record<RiskLevel, string> = {
    高风险: "bg-red-600 text-white",
    已逾期: "bg-red-50 text-red-700 ring-1 ring-red-200",
    即将到期: "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
    有卡点: "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
    正常: "bg-slate-100 text-slate-600",
    无风险: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  };
  return <Badge className={cls[level]}>{level}</Badge>;
}
