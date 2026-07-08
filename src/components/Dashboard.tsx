"use client";

import { LogOut, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { getSupabase } from "@/lib/supabase";
import { isDueThisWeek, isOverdue } from "@/lib/date";
import { platforms, roles, type FiltersState, type Platform, type Task, type TaskInput } from "@/types/task";
import { Filters, defaultFilters } from "./tasks/Filters";
import { GroupedTaskSection } from "./tasks/GroupedTaskSection";
import { PlatformOverview } from "./tasks/PlatformOverview";
import { PlatformStats } from "./tasks/PlatformStats";
import { ProjectOverview } from "./tasks/ProjectOverview";
import { StatsCards } from "./tasks/StatsCards";
import { TaskFormModal } from "./tasks/TaskFormModal";
import { LoadingState } from "./tasks/states";

export function Dashboard({ session }: { session: Session }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FiltersState>(defaultFilters);
  const [view, setView] = useState<"platform" | "role">("platform");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [defaultPlatform, setDefaultPlatform] = useState<Platform | undefined>();
  const supabase = getSupabase();

  async function loadTasks() {
    setLoading(true);
    const { data, error } = await supabase.from("tasks").select("*").order("due_date", { ascending: true, nullsFirst: false });
    if (error) console.error(error);
    setTasks((data || []) as Task[]);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredTasks = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    return tasks
      .filter((task) => filters.platform === "全部" || task.platform === filters.platform)
      .filter((task) => filters.role === "全部" || task.role === filters.role)
      .filter((task) => !filters.owner || task.owner === filters.owner)
      .filter((task) => filters.businessModule === "全部" || task.business_module === filters.businessModule)
      .filter((task) => filters.stage === "全部" || task.project_stage === filters.stage)
      .filter((task) => filters.status === "全部" || task.status === filters.status)
      .filter((task) => filters.priority === "全部" || task.priority === filters.priority)
      .filter((task) => filters.due === "全部" || (filters.due === "逾期" ? isOverdue(task) : isDueThisWeek(task)))
      .filter((task) => {
        if (!search) return true;
        if (search === "blocker:true") return Boolean(task.blocker?.trim());
        return [task.task_name, task.description, task.latest_update, task.blocker, task.next_action, task.owner]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(search);
      })
      .sort((a, b) => {
        const key = filters.sortBy;
        const av = a[key] || "9999-12-31";
        const bv = b[key] || "9999-12-31";
        return key === "updated_at" ? bv.localeCompare(av) : av.localeCompare(bv);
      });
  }, [filters, tasks]);

  function openAdd(platform?: Platform) {
    setEditingTask(null);
    setDefaultPlatform(platform);
    setModalOpen(true);
  }

  async function saveTask(input: TaskInput) {
    if (editingTask) {
      const { error } = await supabase.from("tasks").update(input).eq("id", editingTask.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("tasks").insert(input);
      if (error) throw error;
    }
    setModalOpen(false);
    await loadTasks();
  }

  async function quickUpdate(task: Task, patch: Partial<Task>) {
    const next = { ...patch };
    if (patch.status === "已完成" || patch.progress === 100) {
      next.completed_at = task.completed_at || new Date().toISOString();
    }
    if (patch.status && patch.status !== "已完成" && patch.progress !== 100) {
      next.completed_at = null;
    }
    setTasks((current) => current.map((item) => (item.id === task.id ? { ...item, ...next, updated_at: new Date().toISOString() } : item)));
    const { error } = await supabase.from("tasks").update(next).eq("id", task.id);
    if (error) {
      console.error(error);
      await loadTasks();
    }
  }

  async function deleteTask(task: Task) {
    if (!window.confirm(`确认删除任务「${task.task_name}」吗？此操作不可撤销。`)) return;
    const { error } = await supabase.from("tasks").delete().eq("id", task.id);
    if (error) console.error(error);
    await loadTasks();
  }

  const groupItems = view === "platform" ? platforms : roles;

  return (
    <main className="min-h-screen bg-zinc-100">
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1800px] items-center justify-between px-5 py-4">
          <div>
            <h1 className="text-xl font-semibold text-zinc-950">跨境电商多平台任务推进表</h1>
            <p className="text-sm text-zinc-500">TikTok · Amazon · 独立站运营推进看板</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-zinc-500 md:inline">{session.user.email}</span>
            <Button onClick={() => openAdd()}><Plus className="h-4 w-4" />新增任务</Button>
            <Button variant="outline" onClick={() => supabase.auth.signOut()}><LogOut className="h-4 w-4" />退出</Button>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-[1800px] space-y-4 px-5 py-5">
        <StatsCards tasks={tasks} />
        <PlatformStats tasks={tasks} />
        <ProjectOverview tasks={tasks} />
        <PlatformOverview tasks={tasks} />
        <Filters filters={filters} setFilters={setFilters} tasks={tasks} />
        <div className="flex items-center gap-2">
          <Button variant={view === "platform" ? "default" : "outline"} onClick={() => setView("platform")}>按平台视图</Button>
          <Button variant={view === "role" ? "default" : "outline"} onClick={() => setView("role")}>按负责人视图</Button>
          <span className="text-sm text-zinc-500">当前显示 {filteredTasks.length} / {tasks.length} 个任务</span>
        </div>
        {loading ? <LoadingState /> : (
          <div className="space-y-4">
            {groupItems.map((group) => (
              <GroupedTaskSection
                key={group}
                title={group}
                tasks={filteredTasks.filter((task) => view === "platform" ? task.platform === group : task.role === group)}
                onAdd={openAdd}
                onEdit={(task) => { setEditingTask(task); setModalOpen(true); }}
                onDelete={deleteTask}
                onQuickUpdate={quickUpdate}
              />
            ))}
          </div>
        )}
      </div>
      <TaskFormModal open={modalOpen} task={editingTask} defaultPlatform={defaultPlatform} onClose={() => setModalOpen(false)} onSubmit={saveTask} />
    </main>
  );
}
