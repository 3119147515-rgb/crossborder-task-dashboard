export function ProgressBar({ value }: { value: number }) {
  const safeValue = Math.min(100, Math.max(0, value || 0));
  return (
    <div className="min-w-28">
      <div className="mb-1 flex items-center justify-between text-xs text-zinc-500">
        <span>进度</span>
        <span>{safeValue}%</span>
      </div>
      <div className="h-2 rounded-full bg-zinc-100">
        <div
          className="h-2 rounded-full bg-zinc-950 transition-all"
          style={{ width: `${safeValue}%` }}
        />
      </div>
    </div>
  );
}
