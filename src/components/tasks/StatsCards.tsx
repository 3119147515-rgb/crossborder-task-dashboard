import { AlertTriangle, CheckCircle2, Flag, ListChecks, Timer, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/surface";
import { isDueThisWeek, isOverdue } from "@/lib/date";
import type { Task } from "@/types/task";

export function StatsCards({ tasks }: { tasks: Task[] }) {
  const done = tasks.filter((task) => task.status === "已完成").length;
  const stats = [
    ["总任务数", tasks.length, ListChecks],
    ["进行中任务", tasks.filter((task) => task.status === "进行中").length, TrendingUp],
    ["已完成任务", done, CheckCircle2],
    ["逾期任务", tasks.filter(isOverdue).length, AlertTriangle],
    ["高优先级任务", tasks.filter((task) => task.priority === "高").length, Flag],
    ["有卡点任务", tasks.filter((task) => task.blocker?.trim()).length, AlertTriangle],
    ["本周到期任务", tasks.filter(isDueThisWeek).length, Timer],
    ["整体完成率", tasks.length ? `${Math.round((done / tasks.length) * 100)}%` : "0%", CheckCircle2],
  ] as const;

  return (
    <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-8">
      {stats.map(([label, value, Icon]) => (
        <Card className="p-4" key={label}>
          <div className="mb-3 flex items-center justify-between text-zinc-500">
            <span className="text-xs">{label}</span>
            <Icon className="h-4 w-4" />
          </div>
          <div className="text-2xl font-semibold text-zinc-950">{value}</div>
        </Card>
      ))}
    </div>
  );
}
