"use client";

import { X } from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/form";
import { getTaskSaveErrorMessage } from "@/lib/task-errors";
import { formatMemberName } from "@/lib/team-members";
import { businessModulesByPlatform, goals, kpiMetrics, owners, ownersByRole, platforms, priorities, roles, stages, statuses, type Platform, type Role, type Task, type TaskInput, type TeamMember } from "@/types/task";

function blankTask(platform: Platform = "TikTok"): TaskInput {
  return {
    platform,
    role: "TikTok运营",
    owner: "TikTok运营负责人",
    task_name: "",
    description: "",
    business_module: businessModulesByPlatform[platform][0],
    priority: "中",
    status: "未开始",
    progress: 0,
    project_stage: "店铺搭建",
    ecommerce_goal: "完成上线",
    start_date: new Date().toISOString().slice(0, 10),
    due_date: "",
    latest_update: "",
    blocker: "",
    next_action: "",
    expected_result: "",
    actual_result: "",
    resource_needed: "",
    kpi_metric: "GMV",
    target_value: "",
    current_value: "",
    result_summary: "",
    completed_at: null,
  };
}

export function TaskFormModal({
  open,
  task,
  defaultPlatform,
  onClose,
  onSubmit,
  memberMap,
}: {
  open: boolean;
  task?: Task | null;
  defaultPlatform?: Platform;
  onClose: () => void;
  onSubmit: (input: TaskInput) => Promise<void>;
  memberMap: Map<string, TeamMember>;
}) {
  const [form, setForm] = useState<TaskInput>(blankTask(defaultPlatform));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const modules = useMemo(() => businessModulesByPlatform[form.platform], [form.platform]);
  const recommendedOwners = useMemo(() => ownersByRole[form.role as Role] || [], [form.role]);
  const otherOwners = useMemo(() => owners.filter((owner) => !recommendedOwners.includes(owner)), [recommendedOwners]);

  useEffect(() => {
    if (!open) return;
    if (task) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm({
        platform: task.platform,
        role: task.role,
        owner: task.owner,
        task_name: task.task_name,
        description: task.description || "",
        business_module: task.business_module,
        priority: task.priority,
        status: task.status,
        progress: task.progress,
        project_stage: task.project_stage,
        ecommerce_goal: task.ecommerce_goal,
        start_date: task.start_date || "",
        due_date: task.due_date || "",
        latest_update: task.latest_update || "",
        blocker: task.blocker || "",
        next_action: task.next_action || "",
        expected_result: task.expected_result || "",
        actual_result: task.actual_result || "",
        resource_needed: task.resource_needed || "",
        kpi_metric: task.kpi_metric || "GMV",
        target_value: task.target_value || "",
        current_value: task.current_value || "",
        result_summary: task.result_summary || "",
        completed_at: task.completed_at,
      });
    } else {
      setForm(blankTask(defaultPlatform));
    }
    setError("");
  }, [open, task, defaultPlatform]);

  if (!open) return null;

  function patch(next: Partial<TaskInput>) {
    const merged = { ...form, ...next };
    if (next.platform && !(businessModulesByPlatform[next.platform] as readonly string[]).includes(merged.business_module)) {
      merged.business_module = businessModulesByPlatform[next.platform][0];
    }
    if (next.role && ownersByRole[next.role as Role]?.length && (!form.owner || ownersByRole[form.role as Role]?.includes(form.owner as never))) {
      merged.owner = ownersByRole[next.role as Role][0];
    }
    setForm(merged);
  }

  async function save() {
    if (!form.task_name.trim()) return setError("请填写任务名称");
    if (!form.owner.trim()) return setError("请填写具体负责人");
    if (!form.due_date) return setError("请选择截止日期");
    const progress = Number(form.progress);
    if (Number.isNaN(progress) || progress < 0 || progress > 100) return setError("进度必须是 0 到 100");
    const normalizedProgress = form.status === "已完成" ? 100 : progress;
    const normalizedStatus = normalizedProgress === 100 ? "已完成" : form.status;

    setSaving(true);
    setError("");
    try {
      await onSubmit({
        ...form,
        status: normalizedStatus,
        progress: normalizedProgress,
        completed_at: normalizedStatus === "已完成" ? form.completed_at || new Date().toISOString() : null,
        description: form.description || null,
        latest_update: form.latest_update || null,
        blocker: form.blocker || null,
        next_action: form.next_action || null,
        expected_result: form.expected_result || null,
        actual_result: form.actual_result || null,
        resource_needed: form.resource_needed || null,
        target_value: form.target_value || null,
        current_value: form.current_value || null,
        result_summary: form.result_summary || null,
        start_date: form.start_date || null,
        due_date: form.due_date || null,
      });
    } catch (error) {
      console.error("Task save failed", error);
      setError(getTaskSaveErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 p-4">
      <div className="mx-auto max-h-[92vh] max-w-5xl overflow-auto rounded-lg bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold">{task ? "编辑任务" : "新增任务"}</h2>
            <p className="text-sm text-zinc-500">所有字段将保存到 Supabase tasks 表。</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <div className="grid gap-4 p-6 md:grid-cols-4">
          <Field label="平台"><Select value={form.platform} onChange={(event) => patch({ platform: event.target.value as Platform })}>{platforms.map((item) => <option key={item}>{item}</option>)}</Select></Field>
          <Field label="职能大类"><Select value={form.role} onChange={(event) => patch({ role: event.target.value as TaskInput["role"] })}>{roles.map((item) => <option key={item}>{item}</option>)}</Select></Field>
          <Field label="具体负责人">
            <Select value={form.owner} onChange={(event) => patch({ owner: event.target.value })}>
              {form.owner && !owners.includes(form.owner as never) ? <option value={form.owner}>历史负责人：{form.owner}</option> : null}
              <optgroup label="推荐负责人">
                {recommendedOwners.map((item) => <option key={item} value={item}>{formatMemberName(item, memberMap)}</option>)}
              </optgroup>
              <optgroup label="全部团队成员">
                {otherOwners.map((item) => <option key={item} value={item}>{formatMemberName(item, memberMap)}</option>)}
              </optgroup>
            </Select>
          </Field>
          <Field label="优先级"><Select value={form.priority} onChange={(event) => patch({ priority: event.target.value as TaskInput["priority"] })}>{priorities.map((item) => <option key={item}>{item}</option>)}</Select></Field>
          <Field className="md:col-span-2" label="任务名称"><Input value={form.task_name} onChange={(event) => patch({ task_name: event.target.value })} /></Field>
          <Field label="业务模块"><Select value={form.business_module} onChange={(event) => patch({ business_module: event.target.value })}>{modules.map((item) => <option key={item}>{item}</option>)}</Select></Field>
          <Field label="任务状态"><Select value={form.status} onChange={(event) => patch({ status: event.target.value as TaskInput["status"] })}>{statuses.map((item) => <option key={item}>{item}</option>)}</Select></Field>
          <Field label="项目阶段"><Select value={form.project_stage} onChange={(event) => patch({ project_stage: event.target.value as TaskInput["project_stage"] })}>{stages.map((item) => <option key={item}>{item}</option>)}</Select></Field>
          <Field label="任务目标"><Select value={form.ecommerce_goal} onChange={(event) => patch({ ecommerce_goal: event.target.value as TaskInput["ecommerce_goal"] })}>{goals.map((item) => <option key={item}>{item}</option>)}</Select></Field>
          <Field label="开始日期"><Input type="date" value={form.start_date || ""} onChange={(event) => patch({ start_date: event.target.value })} /></Field>
          <Field label="截止日期"><Input type="date" value={form.due_date || ""} onChange={(event) => patch({ due_date: event.target.value })} /></Field>
          <Field label="进度"><Input type="number" min={0} max={100} value={form.progress} onChange={(event) => patch({ progress: Number(event.target.value) })} /></Field>
          <Field label="KPI 指标"><Select value={form.kpi_metric || "GMV"} onChange={(event) => patch({ kpi_metric: event.target.value as TaskInput["kpi_metric"] })}>{kpiMetrics.map((item) => <option key={item}>{item}</option>)}</Select></Field>
          <Field label="目标值"><Input value={form.target_value || ""} onChange={(event) => patch({ target_value: event.target.value })} /></Field>
          <Field label="当前值"><Input value={form.current_value || ""} onChange={(event) => patch({ current_value: event.target.value })} /></Field>
          <Field className="md:col-span-2" label="任务说明"><Textarea value={form.description || ""} onChange={(event) => patch({ description: event.target.value })} /></Field>
          <Field className="md:col-span-2" label="最新进展"><Textarea value={form.latest_update || ""} onChange={(event) => patch({ latest_update: event.target.value })} /></Field>
          <Field className="md:col-span-2" label="当前卡点/阻碍"><Textarea value={form.blocker || ""} onChange={(event) => patch({ blocker: event.target.value })} /></Field>
          <Field className="md:col-span-2" label="下一步动作"><Textarea value={form.next_action || ""} onChange={(event) => patch({ next_action: event.target.value })} /></Field>
          <Field label="预期结果"><Textarea value={form.expected_result || ""} onChange={(event) => patch({ expected_result: event.target.value })} /></Field>
          <Field label="实际结果"><Textarea value={form.actual_result || ""} onChange={(event) => patch({ actual_result: event.target.value })} /></Field>
          <Field label="需要资源/支持"><Textarea value={form.resource_needed || ""} onChange={(event) => patch({ resource_needed: event.target.value })} /></Field>
          <Field label="结果复盘"><Textarea value={form.result_summary || ""} onChange={(event) => patch({ result_summary: event.target.value })} /></Field>
        </div>
        {error ? <p className="mx-6 mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-zinc-200 bg-white px-6 py-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>取消</Button>
          <Button onClick={save} disabled={saving}>{saving ? "保存中..." : "保存任务"}</Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return <div className={className}><Label>{label}</Label><div className="mt-1">{children}</div></div>;
}
