import { Loader2 } from "lucide-react";

export function LoadingState() {
  return (
    <div className="flex h-64 items-center justify-center gap-2 text-sm text-zinc-500">
      <Loader2 className="h-4 w-4 animate-spin" />
      正在加载任务数据
    </div>
  );
}

export function EmptyState({ text = "当前筛选条件下暂无任务" }: { text?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-200 bg-white py-12 text-center text-sm text-zinc-500">
      {text}
    </div>
  );
}
