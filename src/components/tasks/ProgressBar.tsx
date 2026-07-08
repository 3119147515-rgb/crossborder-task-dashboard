import { cn } from "@/lib/utils";

export function ProgressBar({ value, tone = "bg-blue-600" }: { value: number; tone?: string }) {
  const safeValue = Math.min(100, Math.max(0, value || 0));
  return (
    <div className="min-w-28">
      <div className="mb-1 flex items-center justify-between text-xs text-zinc-500">
        <span>进度</span>
        <span>{safeValue}%</span>
      </div>
      <div className="h-2 rounded-full bg-zinc-100">
        <div
          className={cn("h-2 rounded-full transition-all", tone)}
          style={{ width: `${safeValue}%` }}
        />
      </div>
    </div>
  );
}
