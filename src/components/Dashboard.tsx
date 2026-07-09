"use client";

import {
  AlertTriangle,
  BarChart3,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Edit,
  Flag,
  Gauge,
  LayoutDashboard,
  LogOut,
  Menu,
  PieChart,
  Plus,
  RefreshCw,
  ShieldCheck,
  Target,
  TrendingUp,
  UserRound,
  Users,
  X,
  Zap,
} from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, Badge } from "@/components/ui/surface";
import { getSupabase } from "@/lib/supabase";
import { formatDate, isCompleted, isDueSoon, isDueThisWeek, isOverdue } from "@/lib/date";
import { getPlatformHealth, getTaskReasonTags, getTodayPriorityTasks } from "@/lib/task-risk";
import { cn } from "@/lib/utils";
import { platforms, roles, type FiltersState, type Platform, type Task, type TaskInput } from "@/types/task";
import { Filters, defaultFilters } from "./tasks/Filters";
import { GroupedTaskSection } from "./tasks/GroupedTaskSection";
import { ProgressBar } from "./tasks/ProgressBar";
import { QuickUpdateModal, type QuickUpdateInput } from "./tasks/QuickUpdateModal";
import { TaskDetailDrawer } from "./tasks/TaskDetailDrawer";
import { TaskFormModal } from "./tasks/TaskFormModal";
import { PlatformBadge, RiskBadge, StatusBadge } from "./tasks/badges";
import { LoadingState } from "./tasks/states";

type NavKey = "overview" | "today" | "TikTok" | "Amazon" | "独立站" | "owners" | "blockers" | "overdue" | "review";
type ExecutionView = "platform" | "role" | "status" | "priority";
type QuickFilter = "today" | "overdue" | "blocker" | "high" | "week" | "pending" | null;

const sidebarItems: Array<{ key: NavKey; label: string; icon: typeof LayoutDashboard }> = [
  { key: "overview", label: "运营总览", icon: LayoutDashboard },
  { key: "today", label: "今日重点", icon: CalendarClock },
  { key: "TikTok", label: "TikTok", icon: Zap },
  { key: "Amazon", label: "Amazon", icon: BriefcaseBusiness },
  { key: "独立站", label: "独立站", icon: Gauge },
  { key: "owners", label: "负责人视图", icon: Users },
  { key: "blockers", label: "卡点任务", icon: AlertTriangle },
  { key: "overdue", label: "逾期任务", icon: Clock3 },
  { key: "review", label: "数据复盘", icon: PieChart },
];

const viewCopy: Record<NavKey, { title: string; eyebrow: string; description: string }> = {
  overview: {
    title: "运营驾驶舱",
    eyebrow: "Operations cockpit",
    description: "聚合任务状态、风险、优先级和推进效率，帮助管理层快速判断今天该盯哪里。",
  },
  today: {
    title: "今日工作台",
    eyebrow: "Today desk",
    description: "聚焦高优先级、本周到期、进行中和待确认任务，帮助团队明确今天先处理什么。",
  },
  TikTok: {
    title: "TikTok 运营推进",
    eyebrow: "TikTok board",
    description: "只查看 TikTok 渠道任务、风险、卡点和模块推进情况。",
  },
  Amazon: {
    title: "Amazon 运营推进",
    eyebrow: "Amazon board",
    description: "只查看 Amazon 渠道任务、风险、卡点和模块推进情况。",
  },
  独立站: {
    title: "独立站运营推进",
    eyebrow: "DTC board",
    description: "只查看独立站渠道任务、风险、卡点和模块推进情况。",
  },
  owners: {
    title: "负责人推进情况",
    eyebrow: "Owner workload",
    description: "按负责人角色查看任务压力、完成率和需要支持的卡点。",
  },
  blockers: {
    title: "当前卡点任务",
    eyebrow: "Blocker focus",
    description: "只显示 blocker 不为空的任务，优先识别需要资源或管理层介入的推进阻塞。",
  },
  overdue: {
    title: "逾期任务",
    eyebrow: "Overdue focus",
    description: "只显示已超过截止日期且尚未完成的任务，帮助团队快速拉齐责任人和闭环动作。",
  },
  review: {
    title: "数据复盘",
    eyebrow: "Review desk",
    description: "聚合数据复盘、内容复盘、效果复盘相关任务，沉淀平台推进结论。",
  },
};

const platformAccent: Record<Platform, { dot: string; bar: string; soft: string; text: string }> = {
  TikTok: { dot: "bg-pink-500", bar: "bg-pink-500", soft: "bg-pink-50", text: "text-pink-700" },
  Amazon: { dot: "bg-orange-500", bar: "bg-orange-500", soft: "bg-orange-50", text: "text-orange-700" },
  独立站: { dot: "bg-indigo-500", bar: "bg-indigo-500", soft: "bg-indigo-50", text: "text-indigo-700" },
};

const platformModules: Record<Platform, string[]> = {
  TikTok: ["达人建联", "样品寄送", "短视频内容", "TikTok 广告", "直播", "内容复盘"],
  Amazon: ["Listing 优化", "PPC 广告", "Review 获取", "FBA 库存", "竞品分析", "数据复盘"],
  独立站: ["商品详情页", "广告落地页", "EDM 邮件", "支付/物流", "转化率优化", "数据复盘"],
};

export function Dashboard({ session }: { session: Session }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FiltersState>(defaultFilters);
  const [executionView, setExecutionView] = useState<ExecutionView>("platform");
  const [activeNav, setActiveNav] = useState<NavKey>("overview");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [quickEditingTask, setQuickEditingTask] = useState<Task | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
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

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 2600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const metrics = useMemo(() => createMetrics(tasks), [tasks]);

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
      .filter((task) => matchesNav(task, activeNav))
      .filter((task) => matchesQuickFilter(task, quickFilter))
      .sort((a, b) => {
        const key = filters.sortBy;
        const av = a[key] || "9999-12-31";
        const bv = b[key] || "9999-12-31";
        return key === "updated_at" ? bv.localeCompare(av) : av.localeCompare(bv);
      });
  }, [activeNav, filters, quickFilter, tasks]);

  const selectedLiveTask = selectedTask ? tasks.find((task) => task.id === selectedTask.id) || selectedTask : null;

  function openAdd(platform?: Platform) {
    setEditingTask(null);
    setDefaultPlatform(platform);
    setModalOpen(true);
  }

  function openEdit(task: Task) {
    setEditingTask(task);
    setDefaultPlatform(task.platform);
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

  async function saveQuickUpdate(task: Task, input: QuickUpdateInput) {
    await quickUpdate(task, input);
    await loadTasks();
    setNotice("快速更新已保存");
  }

  async function completeTask(task: Task) {
    if (isCompleted(task)) return;
    if (!window.confirm("确认将该任务标记为已完成吗？")) return;
    await quickUpdate(task, { status: "已完成", progress: 100, completed_at: new Date().toISOString() });
    await loadTasks();
    setNotice("任务已标记完成");
  }

  async function deleteTask(task: Task) {
    if (!window.confirm(`确认删除任务「${task.task_name}」吗？此操作不可撤销。`)) return;
    const { error } = await supabase.from("tasks").delete().eq("id", task.id);
    if (error) console.error(error);
    if (selectedTask?.id === task.id) setSelectedTask(null);
    await loadTasks();
  }

  function selectNav(key: NavKey) {
    setActiveNav(key);
    setSidebarOpen(false);
    setQuickFilter(key === "today" ? "today" : key === "blockers" ? "blocker" : key === "overdue" ? "overdue" : null);
    if (key === "TikTok" || key === "Amazon" || key === "独立站") {
      setFilters({ ...defaultFilters, platform: key });
      setExecutionView("platform");
      return;
    }
    if (key === "owners") {
      setFilters(defaultFilters);
      setExecutionView("role");
      return;
    }
    if (key === "review") {
      setFilters(defaultFilters);
      setExecutionView("status");
      return;
    }
    setFilters(defaultFilters);
  }

  const groupItems = getGroupItems(executionView, filteredTasks);
  const view = viewCopy[activeNav];
  const isPlatformView = isPlatformNav(activeNav);
  const scopedTasks = isPlatformView ? tasks.filter((task) => task.platform === activeNav) : filteredTasks;
  const activeViewMetrics = createMetrics(filteredTasks);
  const showOverview = activeNav === "overview";
  const showToday = activeNav === "overview" || activeNav === "today";
  const showPlatformBoard = activeNav === "overview" || isPlatformView;
  const showOwnerWorkload = activeNav === "overview" || activeNav === "owners";
  const showVisualInsights = activeNav === "overview" || activeNav === "review";
  const platformBoardItems = isPlatformView ? [activeNav] : platforms;

  return (
    <main className="min-h-screen bg-[#F6F7F9] text-[#111827]">
      <ExecutiveHeader session={session} onAdd={() => openAdd()} onSignOut={() => supabase.auth.signOut()} onMenu={() => setSidebarOpen(true)} />
      <div className="mx-auto flex max-w-[1840px] gap-5 px-4 py-5 lg:px-6">
        <ExecutiveSidebar activeNav={activeNav} open={sidebarOpen} onClose={() => setSidebarOpen(false)} onSelect={selectNav} />
        <section className="min-w-0 flex-1 space-y-5">
          <ViewHero view={view} activeNav={activeNav} visibleCount={filteredTasks.length} totalCount={tasks.length} metrics={activeViewMetrics} />

          {showOverview ? (
            <section className="grid gap-4 xl:grid-cols-[1.65fr_1fr]">
              <div className="space-y-4">
                <MetricGrid metrics={metrics} />
              </div>
              <ProjectHealth metrics={metrics} tasks={tasks} />
            </section>
          ) : null}

          {showToday ? (
            <TodayWorkbench
              tasks={showOverview ? tasks : filteredTasks}
              onEdit={openEdit}
              onOpen={setSelectedTask}
              onQuickEdit={setQuickEditingTask}
              onComplete={completeTask}
            />
          ) : null}

          {showPlatformBoard || showOwnerWorkload || showVisualInsights ? (
            <section className="grid gap-5 2xl:grid-cols-[1.35fr_1fr]">
              <div className="space-y-5">
                {showPlatformBoard ? <PlatformBoard tasks={scopedTasks} platformsToShow={platformBoardItems} onPlatformAdd={openAdd} /> : null}
                {showOwnerWorkload ? <OwnerWorkload tasks={showOverview ? tasks : filteredTasks} /> : null}
              </div>
              {showVisualInsights ? <VisualInsights tasks={showOverview ? tasks : filteredTasks} /> : null}
            </section>
          ) : null}

          <Card className="overflow-hidden border-slate-200 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
            <div className="border-b border-slate-200 bg-white px-4 py-4 lg:px-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <SectionTitle eyebrow="Execution center" title="任务执行区" description={getExecutionDescription(activeNav, filteredTasks.length)} compact />
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    ["platform", "按平台"],
                    ["role", "按负责人"],
                    ["status", "按状态"],
                    ["priority", "按优先级"],
                  ].map(([key, label]) => (
                    <Button
                      key={key}
                      size="sm"
                      variant={executionView === key ? "default" : "outline"}
                      className={executionView === key ? "bg-blue-600 hover:bg-blue-700" : ""}
                      onClick={() => setExecutionView(key as ExecutionView)}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="mt-4">
                <QuickFilters active={quickFilter} onChange={setQuickFilter} />
              </div>
            </div>
            <div className="border-b border-slate-200 bg-slate-50/80 p-4 lg:p-5">
              <Filters filters={filters} setFilters={setFilters} tasks={tasks} />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm text-slate-500 lg:px-5">
              <span>当前显示 <strong className="text-slate-900">{filteredTasks.length}</strong> / {tasks.length} 个任务</span>
              <span>点击任务行可打开右侧详情，行内控件可直接写入 Supabase。</span>
            </div>
            {loading ? <LoadingState /> : (
              <div className="space-y-4 p-4 lg:p-5">
                {groupItems.map((group) => (
                  <GroupedTaskSection
                    key={group}
                    title={group}
                    tasks={filteredTasks.filter((task) => belongsToGroup(task, executionView, group))}
                    onAdd={openAdd}
                    onEdit={openEdit}
                    onDelete={deleteTask}
                    onOpenTask={setSelectedTask}
                    onQuickEdit={setQuickEditingTask}
                    onComplete={completeTask}
                    onQuickUpdate={quickUpdate}
                  />
                ))}
              </div>
            )}
          </Card>
        </section>
      </div>
      <TaskDetailDrawer
        task={selectedLiveTask}
        onClose={() => setSelectedTask(null)}
        onEdit={openEdit}
        onDelete={deleteTask}
        onQuickEdit={setQuickEditingTask}
        onComplete={completeTask}
        onQuickUpdate={quickUpdate}
      />
      <QuickUpdateModal key={quickEditingTask?.id || "quick-update"} task={quickEditingTask} open={Boolean(quickEditingTask)} onClose={() => setQuickEditingTask(null)} onSubmit={saveQuickUpdate} />
      <TaskFormModal open={modalOpen} task={editingTask} defaultPlatform={defaultPlatform} onClose={() => setModalOpen(false)} onSubmit={saveTask} />
      {notice ? (
        <div className="fixed bottom-5 right-5 z-[70] rounded-lg border border-emerald-200 bg-white px-4 py-3 text-sm font-medium text-emerald-700 shadow-xl">
          {notice}
        </div>
      ) : null}
    </main>
  );
}

function ExecutiveHeader({ session, onAdd, onSignOut, onMenu }: { session: Session; onAdd: () => void; onSignOut: () => void; onMenu: () => void }) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1840px] items-center justify-between gap-4 px-4 py-3 lg:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenu} aria-label="打开导航"><Menu className="h-5 w-5" /></Button>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold text-slate-950 md:text-xl">跨境电商多平台运营中台</h1>
            <p className="truncate text-xs text-slate-500 md:text-sm">TikTok · Amazon · 独立站项目推进驾驶舱</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 md:gap-3">
          <span className="hidden max-w-[260px] truncate text-sm text-slate-500 lg:inline">{session.user.email}</span>
          <Button className="bg-blue-600 hover:bg-blue-700" onClick={onAdd}><Plus className="h-4 w-4" />新增任务</Button>
          <Button variant="outline" onClick={onSignOut}><LogOut className="h-4 w-4" /><span className="hidden sm:inline">退出</span></Button>
        </div>
      </div>
    </header>
  );
}

function ExecutiveSidebar({ activeNav, open, onClose, onSelect }: { activeNav: NavKey; open: boolean; onClose: () => void; onSelect: (key: NavKey) => void }) {
  return (
    <>
      <div className={cn("fixed inset-0 z-40 bg-slate-950/30 lg:hidden", open ? "block" : "hidden")} onClick={onClose} />
      <aside className={cn(
        "fixed left-0 top-0 z-50 h-full w-72 border-r border-slate-200 bg-white p-4 shadow-xl transition-transform lg:sticky lg:top-[73px] lg:z-20 lg:h-[calc(100vh-96px)] lg:translate-x-0 lg:rounded-xl lg:border lg:shadow-sm",
        open ? "translate-x-0" : "-translate-x-full",
      )}>
        <div className="mb-4 flex items-center justify-between lg:hidden">
          <span className="font-semibold text-slate-950">导航</span>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Command center</div>
          <div className="mt-2 text-sm font-semibold text-slate-950">每日推进视图</div>
          <p className="mt-1 text-xs leading-5 text-slate-500">按平台、风险和负责人快速切换工作重点。</p>
        </div>
        <nav className="space-y-1">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const active = activeNav === item.key;
            return (
              <button
                key={item.key}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-medium transition",
                  active ? "bg-blue-50 text-blue-700 ring-1 ring-blue-100" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950",
                )}
                onClick={() => onSelect(item.key)}
              >
                <span className="flex items-center gap-3"><Icon className="h-4 w-4" />{item.label}</span>
                <ChevronRight className={cn("h-4 w-4", active ? "opacity-100" : "opacity-0")} />
              </button>
            );
          })}
        </nav>
      </aside>
    </>
  );
}

function SectionTitle({ eyebrow, title, description, compact = false }: { eyebrow: string; title: string; description: string; compact?: boolean }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">{eyebrow}</p>
      <h2 className={cn("font-semibold text-slate-950", compact ? "mt-1 text-lg" : "mt-1 text-2xl")}>{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function ViewHero({
  view,
  activeNav,
  visibleCount,
  totalCount,
  metrics,
}: {
  view: { title: string; eyebrow: string; description: string };
  activeNav: NavKey;
  visibleCount: number;
  totalCount: number;
  metrics: ReturnType<typeof createMetrics>;
}) {
  const isRiskView = activeNav === "blockers" || activeNav === "overdue";
  const isReviewView = activeNav === "review";

  return (
    <Card className="border-slate-200 bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <SectionTitle eyebrow={view.eyebrow} title={view.title} description={view.description} />
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
          <MiniStat label="当前任务" value={visibleCount} danger={isRiskView && visibleCount > 0} />
          <MiniStat label="全部任务" value={totalCount} />
          {isRiskView ? <MiniStat label={activeNav === "blockers" ? "卡点数量" : "逾期数量"} value={visibleCount} danger={visibleCount > 0} /> : null}
          {isReviewView ? <MiniStat label="完成率" value={`${metrics.completionRate}%`} /> : null}
        </div>
      </div>
    </Card>
  );
}

function MetricGrid({ metrics }: { metrics: ReturnType<typeof createMetrics> }) {
  const items = [
    { label: "总任务数", value: metrics.total, note: "全渠道推进池", icon: Target, tone: "blue" },
    { label: "进行中任务", value: metrics.inProgress, note: "本周推进重点", icon: TrendingUp, tone: "blue" },
    { label: "已完成任务", value: metrics.completed, note: "闭环交付数量", icon: CheckCircle2, tone: "green" },
    { label: "逾期任务", value: metrics.overdue, note: "需今日关注", icon: Clock3, tone: "red" },
    { label: "有卡点任务", value: metrics.blockers, note: "当前风险项", icon: AlertTriangle, tone: "red" },
    { label: "高优先级任务", value: metrics.highPriority, note: "管理层关注", icon: Flag, tone: "amber" },
    { label: "本周到期任务", value: metrics.dueThisWeek, note: "未来 7 天", icon: CalendarClock, tone: "amber" },
    { label: "整体完成率", value: `${metrics.completionRate}%`, note: "整体项目健康度", icon: ShieldCheck, tone: "green" },
  ] as const;
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.label} className="border-slate-200 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500">{item.label}</p>
                <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{item.value}</div>
                <p className="mt-2 text-xs text-slate-500">{item.note}</p>
              </div>
              <div className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg",
                item.tone === "red" && "bg-red-50 text-red-600",
                item.tone === "green" && "bg-emerald-50 text-emerald-600",
                item.tone === "amber" && "bg-amber-50 text-amber-600",
                item.tone === "blue" && "bg-blue-50 text-blue-600",
              )}>
                <Icon className="h-5 w-5" />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function ProjectHealth({ metrics, tasks }: { metrics: ReturnType<typeof createMetrics>; tasks: Task[] }) {
  const status = metrics.overdue > 0 || metrics.blockers > 5 ? "风险" : metrics.highPriority > 8 || metrics.dueThisWeek > 8 ? "注意" : "健康";
  const tone = status === "风险" ? "red" : status === "注意" ? "amber" : "green";
  const platformHealth = platforms.map((platform) => ({ platform, ...getPlatformHealth(tasks, platform) }));
  const reasons = [
    metrics.overdue > 0 ? `${metrics.overdue} 个逾期任务需要立即处理` : "",
    metrics.blockers > 0 ? `${metrics.blockers} 个任务存在卡点` : "",
    metrics.dueThisWeek > 0 ? `${metrics.dueThisWeek} 个任务将在 7 天内到期` : "",
  ].filter(Boolean);
  const actions = status === "风险"
    ? ["优先处理有卡点任务", "拉齐逾期任务责任人", "明确今天可闭环动作"]
    : status === "注意"
      ? ["检查本周到期任务", "推进高优先级任务闭环", "确认资源支持是否到位"]
      : ["保持当前节奏", "关注新增高优先级任务", "按周复盘平台完成率"];

  return (
    <Card className="h-full border-slate-200 p-5 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <SectionTitle eyebrow="Project health" title="项目健康度" description="根据逾期、卡点、高优先级和本周到期任务自动判断。" compact />
        </div>
        <Badge className={cn(
          "h-8 px-3",
          tone === "red" && "bg-red-600 text-white",
          tone === "amber" && "bg-amber-500 text-white",
          tone === "green" && "bg-emerald-600 text-white",
        )}>{status}</Badge>
      </div>
      <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-medium text-slate-950">风险说明</p>
        <p className="mt-2 text-sm leading-6 text-slate-600">{reasons.length ? reasons.join("，") : "当前没有明显逾期或高风险堆积，整体推进稳定。"}</p>
      </div>
      <div className="mt-4 space-y-2">
        <p className="text-sm font-medium text-slate-950">推荐动作</p>
        {actions.map((action) => (
          <div key={action} className="flex items-center gap-2 text-sm text-slate-600">
            <span className={cn("h-1.5 w-1.5 rounded-full", tone === "red" ? "bg-red-500" : tone === "amber" ? "bg-amber-500" : "bg-emerald-500")} />
            {action}
          </div>
        ))}
      </div>
      <div className="mt-5 border-t border-slate-200 pt-4">
        <p className="text-sm font-medium text-slate-950">平台健康分</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {platformHealth.map((item) => (
            <div key={item.platform} className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-slate-800">{item.platform}</span>
                <HealthBadge status={item.status} />
              </div>
              <div className="mt-2 text-2xl font-semibold text-slate-950">{item.score}</div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function TodayWorkbench({
  tasks,
  onEdit,
  onOpen,
  onQuickEdit,
  onComplete,
}: {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onOpen: (task: Task) => void;
  onQuickEdit: (task: Task) => void;
  onComplete: (task: Task) => void;
}) {
  const priorityTasks = getTodayPriorityTasks(tasks).slice(0, 8);
  return (
    <section className="space-y-4">
      <SectionTitle eyebrow="Today desk" title="今日工作台" description="按逾期、卡点、高优先级、本周到期、待确认和进行中自动排序，只展示最重要的 8 个任务。" />
      <Card className="border-slate-200 p-4 shadow-[0_12px_34px_rgba(15,23,42,0.05)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-slate-950">智能优先队列</h3>
            <p className="mt-1 text-xs text-slate-500">当前优先任务 {priorityTasks.length} 个，点击任务可打开详情。</p>
          </div>
          <div className="rounded-lg bg-blue-50 p-2 text-blue-600"><Flag className="h-4 w-4" /></div>
        </div>
        <div className="mt-4 grid gap-3 xl:grid-cols-2">
          {priorityTasks.length ? priorityTasks.map((task) => (
            <CompactTaskItem
              key={task.id}
              task={task}
              onEdit={onEdit}
              onOpen={onOpen}
              onQuickEdit={onQuickEdit}
              onComplete={onComplete}
            />
          )) : <EmptyMini text="暂无需要处理的任务" />}
        </div>
      </Card>
    </section>
  );
}

function CompactTaskItem({
  task,
  onEdit,
  onOpen,
  onQuickEdit,
  onComplete,
}: {
  task: Task;
  onEdit: (task: Task) => void;
  onOpen: (task: Task) => void;
  onQuickEdit: (task: Task) => void;
  onComplete: (task: Task) => void;
}) {
  const tags = getTaskReasonTags(task);
  return (
    <button className="w-full rounded-lg border border-slate-200 bg-white p-3 text-left transition hover:border-blue-200 hover:bg-blue-50/40" onClick={() => onOpen(task)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-950">{task.task_name}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <PlatformBadge value={task.platform} />
            <StatusBadge value={task.status} />
            <RiskBadge task={task} />
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button
            variant="ghost"
            size="icon"
            title="快速更新"
            onClick={(event) => {
              event.stopPropagation();
              onQuickEdit(task);
            }}
          >
            <RefreshCw className="h-4 w-4 text-blue-600" />
          </Button>
          {!isCompleted(task) ? (
            <Button
              variant="ghost"
              size="icon"
              title="一键完成"
              onClick={(event) => {
                event.stopPropagation();
                onComplete(task);
              }}
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="icon"
            title="完整编辑"
            onClick={(event) => {
              event.stopPropagation();
              onEdit(task);
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {tags.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tags.map((tag) => <ReasonTag key={tag} label={tag} />)}
        </div>
      ) : null}
      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-500">
        <span>{task.owner} · {task.role}</span>
        <span className={cn(isDueSoon(task) && "font-medium text-amber-600", isOverdue(task) && "font-medium text-red-600")}>{formatDate(task.due_date)}</span>
      </div>
    </button>
  );
}

function ReasonTag({ label }: { label: string }) {
  const cls = {
    已逾期: "bg-red-50 text-red-700 ring-red-100",
    有卡点: "bg-orange-50 text-orange-700 ring-orange-100",
    高优先级: "bg-rose-50 text-rose-700 ring-rose-100",
    本周到期: "bg-amber-50 text-amber-700 ring-amber-100",
    待确认: "bg-yellow-50 text-yellow-700 ring-yellow-100",
    进行中: "bg-blue-50 text-blue-700 ring-blue-100",
  }[label] || "bg-slate-100 text-slate-600 ring-slate-100";
  return <span className={cn("inline-flex h-6 items-center rounded-md px-2 text-xs font-medium ring-1", cls)}>{label}</span>;
}

function PlatformBoard({ tasks, platformsToShow = platforms, onPlatformAdd }: { tasks: Task[]; platformsToShow?: readonly Platform[]; onPlatformAdd: (platform: Platform) => void }) {
  return (
    <section className="space-y-4">
      <SectionTitle eyebrow="Platform board" title="平台推进看板" description="对比 TikTok、Amazon、独立站推进速度、风险和模块分布。" />
      <div className="grid gap-4 xl:grid-cols-3">
        {platformsToShow.map((platform) => {
          const stats = createPlatformStats(tasks, platform);
          const health = getPlatformHealth(tasks, platform);
          const accent = platformAccent[platform];
          return (
            <Card key={platform} className="overflow-hidden border-slate-200 shadow-[0_12px_34px_rgba(15,23,42,0.05)]">
              <div className={cn("h-1.5", accent.bar)} />
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={cn("h-2.5 w-2.5 rounded-full", accent.dot)} />
                      <h3 className="text-lg font-semibold text-slate-950">{platform}</h3>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">任务 {stats.total} · 完成率 {stats.completionRate}%</p>
                  </div>
                  <HealthBadge status={health.status} />
                </div>
                <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">健康分</span>
                    <span className={cn("font-semibold", health.score >= 80 && "text-emerald-700", health.score >= 60 && health.score < 80 && "text-amber-700", health.score < 60 && "text-red-700")}>{health.score}/100</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-white">
                    <div
                      className={cn("h-2 rounded-full", health.score >= 80 ? "bg-emerald-500" : health.score >= 60 ? "bg-amber-500" : "bg-red-500")}
                      style={{ width: `${health.score}%` }}
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <ProgressBar value={stats.completionRate} tone={accent.bar} />
                </div>
                <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                  <MiniStat label="进行中" value={stats.inProgress} />
                  <MiniStat label="卡点" value={stats.blockers} danger={stats.blockers > 0} />
                  <MiniStat label="逾期" value={stats.overdue} danger={stats.overdue > 0} />
                  <MiniStat label="高优先" value={health.highOpen} />
                </div>
                <div className="mt-5 space-y-2">
                  <p className="text-sm font-medium text-slate-950">模块分布</p>
                  {platformModules[platform].map((module) => {
                    const moduleCount = tasks.filter((task) => task.platform === platform && displayModule(task.business_module) === module).length;
                    const width = stats.total ? Math.round((moduleCount / stats.total) * 100) : 0;
                    return (
                      <div key={module} className="grid grid-cols-[92px_1fr_28px] items-center gap-2 text-xs text-slate-500">
                        <span className="truncate">{module}</span>
                        <div className="h-2 rounded-full bg-slate-100">
                          <div className={cn("h-2 rounded-full", accent.bar)} style={{ width: `${width}%` }} />
                        </div>
                        <span className="text-right font-medium text-slate-700">{moduleCount}</span>
                      </div>
                    );
                  })}
                </div>
                <Button variant="outline" size="sm" className="mt-5 w-full" onClick={() => onPlatformAdd(platform)}>
                  <Plus className="h-4 w-4" />新增 {platform} 任务
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

function HealthBadge({ status }: { status: "健康" | "注意" | "风险" }) {
  return (
    <Badge className={cn(
      status === "健康" && "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
      status === "注意" && "bg-amber-50 text-amber-700 ring-1 ring-amber-100",
      status === "风险" && "bg-red-600 text-white",
    )}>{status}</Badge>
  );
}

function OwnerWorkload({ tasks }: { tasks: Task[] }) {
  return (
    <section className="space-y-4">
      <SectionTitle eyebrow="Owner workload" title="负责人推进情况" description="按角色观察任务压力、完成率和需要支持的卡点。" />
      <div className="grid gap-4 xl:grid-cols-3">
        {roles.map((role) => {
          const roleTasks = tasks.filter((task) => task.role === role);
          const unfinished = roleTasks.filter((task) => !isCompleted(task)).length;
          const blockers = roleTasks.filter((task) => task.blocker?.trim()).length;
          const completed = roleTasks.filter(isCompleted).length;
          const inProgress = roleTasks.filter((task) => task.status === "进行中").length;
          const completionRate = roleTasks.length ? Math.round((completed / roleTasks.length) * 100) : 0;
          const pressure = unfinished > 10 ? "高压力" : blockers > 3 ? "需支持" : "正常";
          return (
            <Card key={role} className="border-slate-200 p-4 shadow-[0_12px_34px_rgba(15,23,42,0.05)]">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-slate-100 p-2 text-slate-700"><UserRound className="h-4 w-4" /></div>
                  <div>
                    <h3 className="font-semibold text-slate-950">{role === "BD负责人" ? "BD 负责人" : role}</h3>
                    <p className="text-xs text-slate-500">任务总数 {roleTasks.length}</p>
                  </div>
                </div>
                <Badge className={cn(pressure === "高压力" && "bg-red-600 text-white", pressure === "需支持" && "bg-amber-500 text-white", pressure === "正常" && "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100")}>{pressure}</Badge>
              </div>
              <div className="mt-4"><ProgressBar value={completionRate} tone="bg-blue-600" /></div>
              <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                <MiniStat label="进行中" value={inProgress} />
                <MiniStat label="已完成" value={completed} />
                <MiniStat label="卡点" value={blockers} danger={blockers > 0} />
                <MiniStat label="完成率" value={`${completionRate}%`} />
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

function VisualInsights({ tasks }: { tasks: Task[] }) {
  const maxRisk = Math.max(1, ...[tasks.filter(isOverdue).length, tasks.filter((task) => task.blocker?.trim()).length, tasks.filter((task) => task.priority === "高").length, tasks.filter(isDueThisWeek).length]);
  return (
    <section className="space-y-4">
      <SectionTitle eyebrow="Visual insights" title="可视化窗口" description="用轻量图形快速看出平台、状态、负责人和风险分布。" />
      <Card className="space-y-5 border-slate-200 p-5 shadow-[0_12px_34px_rgba(15,23,42,0.05)]">
        <ChartBlock title="平台完成率对比">
          {platforms.map((platform) => {
            const stats = createPlatformStats(tasks, platform);
            return <HorizontalBar key={platform} label={platform} value={stats.completionRate} color={platformAccent[platform].bar} suffix="%" />;
          })}
        </ChartBlock>
        <ChartBlock title="任务状态分布">
          {["未开始", "进行中", "待确认", "已完成", "已暂停"].map((status) => {
            const count = tasks.filter((task) => task.status === status).length;
            return <HorizontalBar key={status} label={status} value={tasks.length ? Math.round((count / tasks.length) * 100) : 0} count={count} color={status === "已完成" ? "bg-emerald-500" : status === "进行中" ? "bg-blue-500" : status === "待确认" ? "bg-amber-500" : "bg-slate-400"} suffix="%" />;
          })}
        </ChartBlock>
        <ChartBlock title="负责人完成率对比">
          {roles.map((role) => {
            const roleTasks = tasks.filter((task) => task.role === role);
            const value = roleTasks.length ? Math.round((roleTasks.filter(isCompleted).length / roleTasks.length) * 100) : 0;
            return <HorizontalBar key={role} label={role === "BD负责人" ? "BD 负责人" : role} value={value} color="bg-blue-600" suffix="%" />;
          })}
        </ChartBlock>
        <ChartBlock title="风险任务分布">
          {[
            ["逾期", tasks.filter(isOverdue).length, "bg-red-600"],
            ["有卡点", tasks.filter((task) => task.blocker?.trim()).length, "bg-orange-500"],
            ["高优先级", tasks.filter((task) => task.priority === "高").length, "bg-amber-500"],
            ["本周到期", tasks.filter(isDueThisWeek).length, "bg-blue-500"],
          ].map(([label, count, color]) => (
            <HorizontalBar key={String(label)} label={String(label)} value={Math.round((Number(count) / maxRisk) * 100)} count={Number(count)} color={String(color)} />
          ))}
        </ChartBlock>
      </Card>
    </section>
  );
}

function QuickFilters({ active, onChange }: { active: QuickFilter; onChange: (filter: QuickFilter) => void }) {
  const items: Array<{ key: QuickFilter; label: string }> = [
    { key: "today", label: "今日重点" },
    { key: "overdue", label: "逾期" },
    { key: "blocker", label: "有卡点" },
    { key: "high", label: "高优先级" },
    { key: "week", label: "本周到期" },
    { key: "pending", label: "待确认" },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <Button key={item.key} size="sm" variant={active === item.key ? "default" : "outline"} className={active === item.key ? "bg-blue-600 hover:bg-blue-700" : ""} onClick={() => onChange(active === item.key ? null : item.key)}>
          {item.label}
        </Button>
      ))}
    </div>
  );
}

function ChartBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-slate-950">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function HorizontalBar({ label, value, color, count, suffix = "" }: { label: string; value: number; color: string; count?: number; suffix?: string }) {
  return (
    <div className="grid grid-cols-[82px_1fr_48px] items-center gap-3 text-xs">
      <span className="truncate text-slate-500">{label}</span>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      </div>
      <span className="text-right font-medium text-slate-700">{count ?? value}{suffix}</span>
    </div>
  );
}

function MiniStat({ label, value, danger = false }: { label: string; value: number | string; danger?: boolean }) {
  return (
    <div className={cn("rounded-lg border border-slate-200 bg-slate-50 px-2 py-2", danger && "border-red-100 bg-red-50")}>
      <div className={cn("text-base font-semibold text-slate-950", danger && "text-red-700")}>{value}</div>
      <div className="mt-0.5 text-[11px] text-slate-500">{label}</div>
    </div>
  );
}

function EmptyMini({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-6 text-center text-sm text-slate-400">{text}</div>;
}

function createMetrics(tasks: Task[]) {
  const completed = tasks.filter(isCompleted).length;
  return {
    total: tasks.length,
    inProgress: tasks.filter((task) => task.status === "进行中").length,
    completed,
    overdue: tasks.filter(isOverdue).length,
    blockers: tasks.filter((task) => Boolean(task.blocker?.trim())).length,
    highPriority: tasks.filter((task) => task.priority === "高").length,
    dueThisWeek: tasks.filter(isDueThisWeek).length,
    completionRate: tasks.length ? Math.round((completed / tasks.length) * 100) : 0,
  };
}

function createPlatformStats(tasks: Task[], platform: Platform) {
  const platformTasks = tasks.filter((task) => task.platform === platform);
  const completed = platformTasks.filter(isCompleted).length;
  const completionRate = platformTasks.length ? Math.round((completed / platformTasks.length) * 100) : 0;
  const overdue = platformTasks.filter(isOverdue).length;
  const blockers = platformTasks.filter((task) => task.blocker?.trim()).length;
  const state = overdue > 0 ? "风险" : blockers > 2 ? "注意" : completionRate > 50 ? "良好" : "推进中";
  return {
    total: platformTasks.length,
    completed,
    completionRate,
    inProgress: platformTasks.filter((task) => task.status === "进行中").length,
    blockers,
    overdue,
    highPriority: platformTasks.filter((task) => task.priority === "高").length,
    state,
  };
}

function getGroupItems(view: ExecutionView, tasks: Task[]) {
  if (view === "platform") {
    const presentPlatforms = platforms.filter((platform) => tasks.some((task) => task.platform === platform));
    return presentPlatforms.length ? presentPlatforms : [...platforms];
  }
  if (view === "role") return [...roles];
  const values = Array.from(new Set(tasks.map((task) => view === "status" ? task.status : task.priority)));
  return values.length ? values : view === "status" ? ["未开始", "进行中", "待确认", "已完成", "已暂停"] : ["高", "中", "低"];
}

function belongsToGroup(task: Task, view: ExecutionView, group: string) {
  if (view === "platform") return task.platform === group;
  if (view === "role") return task.role === group;
  if (view === "status") return task.status === group;
  return task.priority === group;
}

function isPlatformNav(nav: NavKey): nav is Platform {
  return nav === "TikTok" || nav === "Amazon" || nav === "独立站";
}

function getExecutionDescription(nav: NavKey, count: number) {
  if (nav === "blockers") return `当前卡点任务共 ${count} 个，只显示 blocker 不为空的任务。`;
  if (nav === "overdue") return `逾期任务共 ${count} 个，只显示已超过截止日期且尚未完成的任务。`;
  if (nav === "review") return `复盘类任务共 ${count} 个，包含数据复盘、内容复盘、效果复盘相关任务。`;
  if (isPlatformNav(nav)) return `当前只显示 ${nav} 平台任务，可继续叠加筛选器做精细排查。`;
  if (nav === "today") return `今日重点任务共 ${count} 个，包含高优先级、本周到期、进行中和待确认任务。`;
  if (nav === "owners") return "按负责人分组查看任务，筛选器仍可继续叠加使用。";
  return "集中完成筛选、快速推进、状态更新和任务细节确认。";
}

function matchesNav(task: Task, nav: NavKey) {
  if (isPlatformNav(nav)) return task.platform === nav;
  if (nav === "blockers") return Boolean(task.blocker?.trim());
  if (nav === "overdue") return isOverdue(task);
  if (nav === "today") return task.priority === "高" || isDueThisWeek(task) || task.status === "进行中" || task.status === "待确认";
  if (nav === "review") return isReviewTask(task);
  return true;
}

function matchesQuickFilter(task: Task, filter: QuickFilter) {
  if (!filter) return true;
  if (filter === "today") return task.priority === "高" || isDueThisWeek(task) || task.status === "进行中" || task.status === "待确认";
  if (filter === "overdue") return isOverdue(task);
  if (filter === "blocker") return Boolean(task.blocker?.trim());
  if (filter === "high") return task.priority === "高";
  if (filter === "week") return isDueThisWeek(task);
  if (filter === "pending") return task.status === "待确认";
  return true;
}

function isReviewTask(task: Task) {
  return ["数据复盘", "内容复盘", "效果复盘"].some((keyword) => task.business_module.includes(keyword));
}

function displayModule(module: string) {
  return module === "支付物流" ? "支付/物流" : module;
}
