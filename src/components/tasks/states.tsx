import { Loader2 } from "lucide-react";

export function LoadingState() {
  return (
    <div className="flex h-64 items-center justify-center gap-2 text-sm text-slate-500">
      <Loader2 className="h-4 w-4 animate-spin" />
      正在加载任务数据
    </div>
  );
}

export function EmptyState({ text = "当前筛选条件下暂无任务" }: { text?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-12 text-center">
      <div className="text-sm font-medium text-slate-600">{text}</div>
      <div className="mt-2 text-xs text-slate-400">请调整筛选条件或新增任务。</div>
    </div>
  );
}
