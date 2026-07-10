"use client";

import { useEffect, useState } from "react";
import type React from "react";
import { Button } from "@/components/ui/button";
import { getTaskSaveErrorMessage } from "@/lib/task-errors";
import { statuses, type Task } from "@/types/task";

export type QuickUpdateInput = Pick<Task, "status" | "progress" | "latest_update" | "blocker" | "next_action">;

function getInitialForm(task: Task | null): QuickUpdateInput {
  return {
    status: task?.status || "未开始",
    progress: task?.progress || 0,
    latest_update: task?.latest_update || "",
    blocker: task?.blocker || "",
    next_action: task?.next_action || "",
  };
}

export function QuickUpdateModal({
  task,
  open,
  onClose,
  onSubmit,
}: {
  task: Task | null;
  open: boolean;
  onClose: () => void;
  onSubmit: (task: Task, input: QuickUpdateInput) => Promise<void>;
}) {
  const [form, setForm] = useState<QuickUpdateInput>(() => getInitialForm(task));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm(getInitialForm(task));
    setError("");
  }, [open, task]);

  if (!open || !task) return null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!task) return;
    setSaving(true);
    setError("");
    try {
      await onSubmit(task, {
        ...form,
        progress: Number(form.progress),
        status: Number(form.progress) === 100 ? "已完成" : form.status,
      });
      onClose();
    } catch (error) {
      console.error("Quick update failed", error);
      setError(getTaskSaveErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/35 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-xl rounded-lg border border-slate-200 bg-white shadow-2xl">
        <div className="border-b border-slate-200 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Quick update</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-950">快速更新任务</h2>
          <p className="mt-1 line-clamp-1 text-sm text-slate-500">{task.task_name}</p>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div className="grid gap-4 sm:grid-cols-[1fr_1.2fr]">
            <label className="text-sm font-medium text-slate-700">
              状态
              <select
                className="mt-2 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400"
                value={form.status}
                onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as Task["status"] }))}
              >
                {statuses.map((status) => <option key={status}>{status}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">
              进度 {form.progress}%
              <input
                className="mt-4 w-full accent-blue-600"
                type="range"
                min={0}
                max={100}
                value={form.progress}
                onChange={(event) => setForm((current) => ({ ...current, progress: Number(event.target.value) }))}
              />
            </label>
          </div>

          <TextArea label="最新进展" value={form.latest_update || ""} onChange={(value) => setForm((current) => ({ ...current, latest_update: value }))} />
          <TextArea label="当前卡点" value={form.blocker || ""} onChange={(value) => setForm((current) => ({ ...current, blocker: value }))} danger />
          <TextArea label="下一步动作" value={form.next_action || ""} onChange={(value) => setForm((current) => ({ ...current, next_action: value }))} />
          {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>取消</Button>
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={saving}>{saving ? "保存中" : "保存更新"}</Button>
        </div>
      </form>
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
  danger = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  danger?: boolean;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <textarea
        className={`mt-2 h-20 w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-blue-400 ${danger ? "border-amber-200 bg-amber-50/40" : "border-slate-200 bg-white"}`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
