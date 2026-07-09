"use client";

import type React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, Badge } from "@/components/ui/surface";
import { isCompleted, isDueThisWeek, isOverdue } from "@/lib/date";
import { platforms, roles, statuses, type Platform, type Task } from "@/types/task";

const platformColors: Record<Platform, string> = {
  TikTok: "#EC4899",
  Amazon: "#F59E0B",
  独立站: "#6366F1",
};

const statusColors: Record<string, string> = {
  未开始: "#94A3B8",
  进行中: "#2563EB",
  待确认: "#F59E0B",
  已完成: "#16A34A",
  已暂停: "#475569",
};

const riskColors: Record<string, string> = {
  已逾期: "#DC2626",
  有卡点: "#F97316",
  高优先未完成: "#D97706",
  本周到期: "#2563EB",
};

export function OperationsCharts({ tasks }: { tasks: Task[] }) {
  const hasData = tasks.length > 0;
  const platformData = platforms.map((platform) => {
    const platformTasks = tasks.filter((task) => task.platform === platform);
    const completed = platformTasks.filter(isCompleted).length;
    return {
      platform,
      total: platformTasks.length,
      completionRate: platformTasks.length ? Math.round((completed / platformTasks.length) * 100) : 0,
      fill: platformColors[platform],
    };
  });
  const statusData = statuses.map((status) => ({
    name: status,
    value: tasks.filter((task) => task.status === status).length,
    fill: statusColors[status],
  })).filter((item) => item.value > 0);
  const ownerData = roles.map((role) => {
    const roleTasks = tasks.filter((task) => task.role === role);
    const completed = roleTasks.filter(isCompleted).length;
    return {
      role: role === "BD负责人" ? "BD 负责人" : role,
      total: roleTasks.length,
      inProgress: roleTasks.filter((task) => task.status === "进行中").length,
      blockers: roleTasks.filter((task) => task.blocker?.trim()).length,
      completionRate: roleTasks.length ? Math.round((completed / roleTasks.length) * 100) : 0,
    };
  });
  const riskData = [
    { name: "已逾期", value: tasks.filter(isOverdue).length, fill: riskColors["已逾期"] },
    { name: "有卡点", value: tasks.filter((task) => task.blocker?.trim()).length, fill: riskColors["有卡点"] },
    { name: "高优先未完成", value: tasks.filter((task) => task.priority === "高" && !isCompleted(task)).length, fill: riskColors["高优先未完成"] },
    { name: "本周到期", value: tasks.filter(isDueThisWeek).length, fill: riskColors["本周到期"] },
  ];

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Operations analytics</p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-950">运营数据可视化</h2>
          <p className="mt-1 text-sm text-slate-500">用 Recharts 展示平台完成率、状态分布、负责人负载和风险任务结构。</p>
        </div>
        <Badge className="w-fit bg-slate-100 text-slate-600">任务池 {tasks.length}</Badge>
      </div>

      {!hasData ? (
        <Card className="border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
          暂无任务数据，图表将在读取 tasks 后自动显示。
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          <ChartCard title="平台完成率对比" description="按平台统计已完成任务占比。">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={platformData} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
                  <CartesianGrid stroke="#E5E7EB" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fill: "#64748B", fontSize: 12 }} tickFormatter={(value) => `${value}%`} />
                  <YAxis type="category" dataKey="platform" width={64} tick={{ fill: "#334155", fontSize: 12 }} />
                  <Tooltip content={<ChartTooltip suffix="%" extraKey="total" extraLabel="任务总数" />} cursor={{ fill: "#F8FAFC" }} />
                  <Bar dataKey="completionRate" radius={[0, 6, 6, 0]} barSize={24}>
                    {platformData.map((entry) => <Cell key={entry.platform} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {platformData.map((item) => (
                <LegendPill key={item.platform} label={item.platform} value={`${item.completionRate}% · ${item.total} 任务`} color={item.fill} />
              ))}
            </div>
          </ChartCard>

          <ChartCard title="任务状态分布" description="观察未开始、进行中、待确认、已完成、已暂停数量。">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={64} outerRadius={96} paddingAngle={2}>
                    {statusData.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {statusData.map((item) => <LegendPill key={item.name} label={item.name} value={`${item.value} 个`} color={item.fill} />)}
            </div>
          </ChartCard>

          <ChartCard title="负责人任务负载" description="按角色对比总任务、进行中、卡点和完成率。">
            <div className="space-y-3">
              {ownerData.map((item) => (
                <div key={item.role} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-slate-900">{item.role}</span>
                    <span className="text-sm text-slate-500">总任务 {item.total} · 进行中 {item.inProgress} · 卡点 {item.blockers}</span>
                  </div>
                  <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white">
                    <div className="h-full rounded-full bg-blue-600" style={{ width: `${item.completionRate}%` }} />
                  </div>
                  <div className="mt-2 text-right text-xs font-medium text-slate-600">完成率 {item.completionRate}%</div>
                </div>
              ))}
            </div>
          </ChartCard>

          <ChartCard title="风险任务分布" description="聚焦逾期、卡点、高优先未完成和本周到期任务。">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={riskData} margin={{ top: 8, right: 12, left: -18, bottom: 8 }}>
                  <CartesianGrid stroke="#E5E7EB" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "#64748B", fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fill: "#64748B", fontSize: 12 }} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "#F8FAFC" }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={34}>
                    {riskData.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>
      )}
    </section>
  );
}

function ChartCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <Card className="border-slate-200 p-5 shadow-[0_12px_34px_rgba(15,23,42,0.05)]">
      <div className="mb-4">
        <h3 className="font-semibold text-slate-950">{title}</h3>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      {children}
    </Card>
  );
}

function LegendPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
      <span className="flex min-w-0 items-center gap-2 text-slate-600">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <span className="truncate">{label}</span>
      </span>
      <span className="shrink-0 font-medium text-slate-900">{value}</span>
    </div>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
  suffix = "",
  extraKey,
  extraLabel,
}: {
  active?: boolean;
  payload?: Array<{ value?: number; name?: string; payload?: Record<string, unknown> }>;
  label?: string;
  suffix?: string;
  extraKey?: string;
  extraLabel?: string;
}) {
  if (!active || !payload?.length) return null;
  const first = payload[0];
  const name = label || first.name || String(first.payload?.name || "");
  const extraValue = extraKey ? first.payload?.[extraKey] : null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      <div className="font-semibold text-slate-950">{name}</div>
      <div className="mt-1 text-slate-600">数值：{first.value}{suffix}</div>
      {extraKey && extraValue !== null && extraValue !== undefined ? <div className="text-slate-500">{extraLabel}：{String(extraValue)}</div> : null}
    </div>
  );
}
