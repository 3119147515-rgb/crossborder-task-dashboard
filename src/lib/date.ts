import type { Task } from "@/types/task";

export function todayStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

export function formatDateTime(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function isCompleted(task: Task) {
  return task.status === "已完成" || task.progress >= 100;
}

export function isOverdue(task: Task) {
  if (!task.due_date || isCompleted(task)) return false;
  return new Date(task.due_date) < todayStart();
}

export function isDueSoon(task: Task) {
  if (!task.due_date || isCompleted(task)) return false;
  const due = new Date(task.due_date);
  const start = todayStart();
  const threeDays = new Date(start);
  threeDays.setDate(start.getDate() + 3);
  return due >= start && due <= threeDays;
}

export function isDueThisWeek(task: Task) {
  if (!task.due_date || isCompleted(task)) return false;
  const due = new Date(task.due_date);
  const start = todayStart();
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return due >= start && due <= end;
}
