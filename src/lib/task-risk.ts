import { isCompleted, isDueSoon, isDueThisWeek, isOverdue } from "@/lib/date";
import type { Platform, Task } from "@/types/task";

export type RiskLevel = "无风险" | "高风险" | "已逾期" | "即将到期" | "有卡点" | "正常";
export type HealthStatus = "健康" | "注意" | "风险";

export function getRiskLevel(task: Task): RiskLevel {
  const hasBlocker = Boolean(task.blocker?.trim());
  if (isCompleted(task)) return "无风险";
  if (isOverdue(task) && hasBlocker) return "高风险";
  if (isOverdue(task)) return "已逾期";
  if (isDueSoon(task)) return "即将到期";
  if (hasBlocker) return "有卡点";
  return "正常";
}

export function getTaskReasonTags(task: Task) {
  const tags: string[] = [];
  if (isOverdue(task)) tags.push("已逾期");
  if (task.blocker?.trim()) tags.push("有卡点");
  if (task.priority === "高" && !isCompleted(task)) tags.push("高优先级");
  if (isDueThisWeek(task)) tags.push("本周到期");
  if (task.status === "待确认") tags.push("待确认");
  if (task.status === "进行中") tags.push("进行中");
  return tags;
}

export function getTodayPriorityScore(task: Task) {
  if (isCompleted(task)) return 999;
  if (isOverdue(task)) return 1;
  if (task.blocker?.trim()) return 2;
  if (task.priority === "高") return 3;
  if (isDueThisWeek(task)) return 4;
  if (task.status === "待确认") return 5;
  if (task.status === "进行中") return 6;
  return 999;
}

export function getTodayPriorityTasks(tasks: Task[]) {
  return tasks
    .filter((task) => getTodayPriorityScore(task) < 999)
    .sort((a, b) => {
      const scoreDiff = getTodayPriorityScore(a) - getTodayPriorityScore(b);
      if (scoreDiff !== 0) return scoreDiff;
      const dueA = a.due_date || "9999-12-31";
      const dueB = b.due_date || "9999-12-31";
      if (dueA !== dueB) return dueA.localeCompare(dueB);
      return b.updated_at.localeCompare(a.updated_at);
    });
}

export function getPlatformHealth(tasks: Task[], platform: Platform) {
  const platformTasks = tasks.filter((task) => task.platform === platform);
  const overdue = platformTasks.filter(isOverdue).length;
  const blockers = platformTasks.filter((task) => task.blocker?.trim()).length;
  const highOpen = platformTasks.filter((task) => task.priority === "高" && !isCompleted(task)).length;
  const completionRate = platformTasks.length
    ? Math.round((platformTasks.filter(isCompleted).length / platformTasks.length) * 100)
    : 0;
  const score = Math.max(
    0,
    100 - overdue * 15 - blockers * 10 - highOpen * 5 - (completionRate < 20 ? 10 : 0),
  );
  const status: HealthStatus = score >= 80 ? "健康" : score >= 60 ? "注意" : "风险";
  return { score, status, overdue, blockers, highOpen, completionRate };
}
