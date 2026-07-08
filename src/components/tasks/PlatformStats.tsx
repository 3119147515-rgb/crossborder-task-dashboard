import { Card } from "@/components/ui/surface";
import { isOverdue } from "@/lib/date";
import { platforms, type Task } from "@/types/task";

export function PlatformStats({ tasks }: { tasks: Task[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {platforms.map((platform) => {
        const platformTasks = tasks.filter((task) => task.platform === platform);
        const completed = platformTasks.filter((task) => task.status === "已完成").length;
        const rate = platformTasks.length ? Math.round((completed / platformTasks.length) * 100) : 0;
        const color = platform === "TikTok" ? "border-pink-200" : platform === "Amazon" ? "border-orange-200" : "border-indigo-200";

        return (
          <Card className={`p-5 ${color}`} key={platform}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-zinc-950">{platform}</h3>
              <span className="text-sm text-zinc-500">{platformTasks.length} 个任务</span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-zinc-500">完成率</p>
                <p className="mt-1 text-xl font-semibold">{rate}%</p>
              </div>
              <div>
                <p className="text-zinc-500">已完成</p>
                <p className="mt-1 text-xl font-semibold">{completed}</p>
              </div>
              <div>
                <p className="text-zinc-500">逾期</p>
                <p className="mt-1 text-xl font-semibold text-red-600">{platformTasks.filter(isOverdue).length}</p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
