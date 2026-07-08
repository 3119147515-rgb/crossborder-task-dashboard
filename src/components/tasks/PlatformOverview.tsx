import { Card } from "@/components/ui/surface";
import { businessModulesByPlatform, platforms, type Task } from "@/types/task";

export function PlatformOverview({ tasks }: { tasks: Task[] }) {
  return (
    <div className="grid gap-3 xl:grid-cols-3">
      {platforms.map((platform) => {
        const modules = businessModulesByPlatform[platform];
        const platformTasks = tasks.filter((task) => task.platform === platform);
        return (
          <Card className="p-5" key={platform}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-zinc-950">{platform} 重点看板</h2>
              <span className="text-sm text-zinc-500">{platformTasks.length} 个任务</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {modules.map((module) => (
                <div className="rounded-md bg-zinc-50 p-3" key={module}>
                  <p className="text-xs text-zinc-500">{module}</p>
                  <p className="mt-2 text-xl font-semibold">{platformTasks.filter((task) => task.business_module === module).length}</p>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <p className="mb-2 text-sm font-medium">当前有卡点任务</p>
              <div className="space-y-2">
                {platformTasks.filter((task) => task.blocker?.trim()).slice(0, 4).map((task) => (
                  <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" key={task.id}>{task.task_name}</div>
                ))}
                {!platformTasks.some((task) => task.blocker?.trim()) ? <p className="text-sm text-zinc-500">暂无卡点</p> : null}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
