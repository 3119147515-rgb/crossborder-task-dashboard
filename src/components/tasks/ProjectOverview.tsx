import { Card } from "@/components/ui/surface";
import { isDueThisWeek, isOverdue } from "@/lib/date";
import { businessModulesByPlatform, platforms, roles, statuses, type Task } from "@/types/task";

function rate(tasks: Task[]) {
  return tasks.length ? Math.round((tasks.filter((task) => task.status === "已完成").length / tasks.length) * 100) : 0;
}

export function ProjectOverview({ tasks }: { tasks: Task[] }) {
  const moduleStats = platforms.flatMap((platform) =>
    businessModulesByPlatform[platform].map((module): [string, number] => [
      `${platform} · ${module}`,
      tasks.filter((task) => task.platform === platform && task.business_module === module).length,
    ]),
  );
  const listBlocks = [
    ["逾期任务", tasks.filter(isOverdue)],
    ["有卡点任务", tasks.filter((task) => task.blocker?.trim())],
    ["本周重点任务", tasks.filter((task) => isDueThisWeek(task) || task.priority === "高")],
  ] as const;

  return (
    <div className="grid gap-3 xl:grid-cols-[1.2fr_1fr]">
      <Card className="p-5">
        <h2 className="font-semibold text-zinc-950">项目总览 Dashboard</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <Metric title="整体完成率" value={`${rate(tasks)}%`} />
          <Metric title="任务总数" value={tasks.length} />
          <Metric title="当前卡点" value={tasks.filter((task) => task.blocker?.trim()).length} />
        </div>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <MiniBar title="三个平台完成率" items={platforms.map((item) => [item, rate(tasks.filter((task) => task.platform === item))])} />
          <MiniBar title="负责人完成率" items={roles.map((item) => [item, rate(tasks.filter((task) => task.role === item))])} />
          <CountList title="各状态任务数量" items={statuses.map((item) => [item, tasks.filter((task) => task.status === item).length])} />
          <CountList
            title="业务模块 Top 8"
            items={moduleStats
              .filter(([, count]) => count > 0)
              .slice(0, 8)}
          />
        </div>
      </Card>
      <div className="grid gap-3">
        {listBlocks.map(([title, items]) => (
          <Card className="p-4" key={title}>
            <h3 className="mb-3 text-sm font-semibold text-zinc-950">{title}</h3>
            <div className="space-y-2">
              {items.slice(0, 5).map((task) => (
                <div className="flex items-center justify-between rounded-md bg-zinc-50 px-3 py-2 text-sm" key={task.id}>
                  <span className="truncate">{task.task_name}</span>
                  <span className="ml-3 shrink-0 text-xs text-zinc-500">{task.platform} · {task.owner}</span>
                </div>
              ))}
              {!items.length ? <p className="text-sm text-zinc-500">暂无</p> : null}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string | number }) {
  return <div className="rounded-md bg-zinc-50 p-4"><p className="text-xs text-zinc-500">{title}</p><p className="mt-2 text-2xl font-semibold">{value}</p></div>;
}

function MiniBar({ title, items }: { title: string; items: readonly (readonly [string, number])[] }) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-medium">{title}</h3>
      <div className="space-y-2">
        {items.map(([label, value]) => (
          <div key={label}>
            <div className="mb-1 flex justify-between text-xs text-zinc-500"><span>{label}</span><span>{value}%</span></div>
            <div className="h-2 rounded-full bg-zinc-100"><div className="h-2 rounded-full bg-zinc-950" style={{ width: `${value}%` }} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CountList({ title, items }: { title: string; items: readonly (readonly [string, number])[] }) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-medium">{title}</h3>
      <div className="grid grid-cols-2 gap-2">
        {items.map(([label, count]) => (
          <div className="rounded-md bg-zinc-50 px-3 py-2 text-sm" key={label}>
            <span className="text-zinc-500">{label}</span>
            <span className="float-right font-semibold">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
