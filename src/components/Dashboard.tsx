"use client";

import {
  AlertTriangle,
  BarChart3,
  Bell,
  BookOpen,
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
  RotateCcw,
  Search,
  ShieldCheck,
  Target,
  TrendingUp,
  UserRound,
  Users,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, Badge } from "@/components/ui/surface";
import { getSupabase } from "@/lib/supabase";
import { withSupabaseTimeout } from "@/lib/supabase-timeout";
import { formatDate, isCompleted, isDueSoon, isDueThisWeek, isOverdue } from "@/lib/date";
import { getTaskSaveErrorMessage } from "@/lib/task-errors";
import { createMemberMap, defaultTeamMembers, formatMemberName, getMembersByGroup } from "@/lib/team-members";
import { getPlatformHealth, getTaskReasonTags, getTodayPriorityTasks } from "@/lib/task-risk";
import { cn } from "@/lib/utils";
import { ownerGroups, owners, platforms, type FiltersState, type Platform, type Task, type TaskInput, type TeamMember } from "@/types/task";
import { Filters, defaultFilters } from "./tasks/Filters";
import { GroupedTaskSection } from "./tasks/GroupedTaskSection";
import { OperationsCharts } from "./tasks/OperationsCharts";
import { ProgressBar } from "./tasks/ProgressBar";
import { QuickUpdateModal, type QuickUpdateInput } from "./tasks/QuickUpdateModal";
import { TaskDetailDrawer } from "./tasks/TaskDetailDrawer";
import { TaskFormModal } from "./tasks/TaskFormModal";
import { PlatformBadge, RiskBadge, StatusBadge } from "./tasks/badges";
import { EmptyState, LoadingState } from "./tasks/states";

type NavKey = "overview" | "today" | "TikTok" | "Amazon" | "独立站" | "owners" | "blockers" | "overdue" | "review" | "team" | "help";
type ExecutionView = "platform" | "role" | "status" | "priority";
type QuickFilter = "today" | "overdue" | "blocker" | "high" | "week" | "pending" | "tiktokOps" | "amazonOps" | "bd" | "product" | "editing" | null;
type NotificationType = "overdue" | "blocker" | "week" | "high";
type NotificationSummary = Record<NotificationType, number>;

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
  { key: "team", label: "团队成员", icon: UserRound },
  { key: "help", label: "使用说明", icon: BookOpen },
];

const sidebarGroups: Array<{ title: string; items: typeof sidebarItems }> = [
  { title: "工作台", items: sidebarItems.filter((item) => item.key === "overview" || item.key === "today") },
  { title: "平台", items: sidebarItems.filter((item) => item.key === "TikTok" || item.key === "Amazon" || item.key === "独立站") },
  { title: "协作", items: sidebarItems.filter((item) => item.key === "owners" || item.key === "blockers" || item.key === "overdue") },
  { title: "分析", items: sidebarItems.filter((item) => item.key === "review") },
  { title: "帮助", items: sidebarItems.filter((item) => item.key === "team" || item.key === "help") },
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
  help: {
    title: "使用说明",
    eyebrow: "Help center",
    description: "团队使用跨境电商多平台运营中台的协作流程、任务规范和常见操作说明。",
  },
  team: {
    title: "团队成员管理",
    eyebrow: "Team members",
    description: "配置 BD01、BD02 等成员编号对应的真实姓名，方便任务分配和团队协作。",
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
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(defaultTeamMembers);
  const [membersReady, setMembersReady] = useState(false);
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
    try {
      const { data, error } = await withSupabaseTimeout(
        supabase.from("tasks").select("*").order("due_date", { ascending: true, nullsFirst: false }),
        "读取任务",
      );
      if (error) {
        console.error("Load tasks failed", error);
        setNotice(`读取任务失败：${error.message}`);
        return;
      }
      setTasks((data || []) as Task[]);
    } catch (error) {
      console.error("Load tasks failed", error);
      setNotice(getTaskSaveErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function loadTeamMembers() {
    try {
      const { data, error } = await withSupabaseTimeout(
        supabase
          .from("team_members")
          .select("id, member_code, display_name, role_group, email, is_active, created_at, updated_at")
          .order("role_group", { ascending: true })
          .order("member_code", { ascending: true }),
        "读取团队成员",
      );
      if (error) {
        console.error("Load team members failed", error);
        setTeamMembers(defaultTeamMembers);
        setMembersReady(false);
        if (error.code === "42P01") setNotice("团队成员表尚未创建，请执行 create-team-members.sql。");
        return;
      }
      setTeamMembers(mergeTeamMembers((data || []) as TeamMember[]));
      setMembersReady(true);
    } catch (error) {
      console.error("Load team members failed", error);
      setTeamMembers(defaultTeamMembers);
      setMembersReady(false);
      setNotice(getTaskSaveErrorMessage(error));
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadTasks();
    loadTeamMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 2600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const metrics = useMemo(() => createMetrics(tasks), [tasks]);
  const notificationSummary = useMemo(() => getNotificationSummary(tasks), [tasks]);
  const memberMap = useMemo(() => createMemberMap(teamMembers), [teamMembers]);

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
        return [task.task_name, task.description, task.latest_update, task.blocker, task.next_action, task.owner, task.business_module, task.platform]
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
    const currentEditingTask = editingTask;
    const request = currentEditingTask
      ? supabase.from("tasks").update(input).eq("id", currentEditingTask.id).select("*").single()
      : supabase.from("tasks").insert(input).select("*").single();
    const { data, error } = await withSupabaseTimeout(request, currentEditingTask ? "保存任务" : "新增任务");
    if (error || !data) {
      const saveError = error || new Error("Supabase 未返回已保存的任务，请检查 RLS 更新策略。");
      console.error(currentEditingTask ? "Supabase task update failed" : "Supabase task insert failed", saveError);
      throw saveError;
    }

    const savedTask = data as Task;
    setTasks((current) => currentEditingTask
      ? current.map((task) => (task.id === savedTask.id ? savedTask : task))
      : [...current, savedTask]);
    setSelectedTask((current) => current?.id === savedTask.id ? savedTask : current);
    setModalOpen(false);
    setEditingTask(null);
    setNotice(currentEditingTask ? "任务已保存" : "任务已新增");
  }

  async function saveTeamMemberProfile(memberCode: string, patch: Pick<TeamMember, "display_name" | "email" | "is_active">) {
    const { data, error } = await withSupabaseTimeout(
      supabase.from("team_members").update(patch).eq("member_code", memberCode).select("id, member_code, display_name, role_group, email, is_active, created_at, updated_at").single(),
      "保存成员资料",
    );
    if (error || !data) {
      const saveError = error || new Error("Supabase 未返回已保存的成员，请检查 RLS 更新策略。");
      console.error("Save team member failed", saveError);
      throw saveError;
    }
    const savedMember = data as TeamMember;
    setTeamMembers((current) => mergeTeamMembers(current.map((member) => member.member_code === memberCode ? savedMember : member)));
    setNotice("成员资料已保存");
  }

  async function quickUpdate(task: Task, patch: Partial<Task>) {
    const next = { ...patch };
    if (patch.status === "已完成" || patch.progress === 100) {
      next.completed_at = task.completed_at || new Date().toISOString();
    }
    if (patch.status && patch.status !== "已完成" && patch.progress !== 100) {
      next.completed_at = null;
    }
    const { data, error } = await withSupabaseTimeout(
      supabase.from("tasks").update(next).eq("id", task.id).select("*").single(),
      "快速更新任务",
    );
    if (error || !data) {
      const saveError = error || new Error("Supabase 未返回已更新的任务，请检查 RLS 更新策略。");
      console.error("Supabase quick update failed", saveError);
      setNotice(getTaskSaveErrorMessage(saveError));
      throw saveError;
    }
    const savedTask = data as Task;
    setTasks((current) => current.map((item) => (item.id === savedTask.id ? savedTask : item)));
    setSelectedTask((current) => current?.id === savedTask.id ? savedTask : current);
  }

  async function saveQuickUpdate(task: Task, input: QuickUpdateInput) {
    await quickUpdate(task, input);
    setNotice("快速更新已保存");
  }

  async function completeTask(task: Task) {
    if (isCompleted(task)) return;
    if (!window.confirm("确认将该任务标记为已完成吗？")) return;
    try {
      await quickUpdate(task, { status: "已完成", progress: 100, completed_at: new Date().toISOString() });
      setNotice("任务已标记完成");
    } catch (error) {
      console.error("Complete task failed", error);
      setNotice(getTaskSaveErrorMessage(error));
    }
  }

  async function deleteTask(task: Task) {
    if (!window.confirm(`确认删除任务「${task.task_name}」吗？此操作不可撤销。`)) return;
    try {
      const { data, error } = await withSupabaseTimeout(
        supabase.from("tasks").delete().eq("id", task.id).select("id").single(),
        "删除任务",
      );
      if (error || !data) throw error || new Error("Supabase 未返回已删除的任务，请检查 RLS 删除策略。");
      setTasks((current) => current.filter((item) => item.id !== task.id));
      if (selectedTask?.id === task.id) setSelectedTask(null);
      setNotice("任务已删除");
    } catch (error) {
      console.error("Delete task failed", error);
      setNotice(getTaskSaveErrorMessage(error));
    }
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

  function clearExecutionFilters() {
    setFilters(defaultFilters);
    setQuickFilter(null);
  }

  function selectNotification(type: NotificationType) {
    if (type === "overdue") {
      selectNav("overdue");
      return;
    }
    if (type === "blocker") {
      selectNav("blockers");
      return;
    }
    if (type === "week") {
      setActiveNav("today");
      setSidebarOpen(false);
      setFilters(defaultFilters);
      setQuickFilter("week");
      setExecutionView("platform");
      return;
    }
    setActiveNav("overview");
    setSidebarOpen(false);
    setFilters(defaultFilters);
    setQuickFilter("high");
    setExecutionView("platform");
  }

  const groupItems = getGroupItems(executionView, filteredTasks);
  const view = viewCopy[activeNav];
  const isPlatformView = isPlatformNav(activeNav);
  const showHelp = activeNav === "help";
  const showTeam = activeNav === "team";
  const scopedTasks = isPlatformView ? tasks.filter((task) => task.platform === activeNav) : filteredTasks;
  const activeViewMetrics = createMetrics(filteredTasks);
  const showOverview = activeNav === "overview" && !showHelp && !showTeam;
  const showToday = (activeNav === "overview" || activeNav === "today") && !showHelp && !showTeam;
  const showPlatformBoard = (activeNav === "overview" || isPlatformView) && !showHelp && !showTeam;
  const showOwnerWorkload = (activeNav === "overview" || activeNav === "owners") && !showHelp && !showTeam;
  const platformBoardItems = isPlatformView ? [activeNav] : platforms;

  return (
    <main className="min-h-screen bg-[#F6F8FB] text-[#111827]">
      <ExecutiveHeader
        session={session}
        notifications={notificationSummary}
        teamMembers={teamMembers}
        memberMap={memberMap}
        membersReady={membersReady}
        onProfileSave={saveTeamMemberProfile}
        onAdd={() => openAdd()}
        onNotificationSelect={selectNotification}
        onSignOut={() => supabase.auth.signOut()}
        onMenu={() => setSidebarOpen(true)}
      />
      <div className="mx-auto flex max-w-[1720px] gap-5 px-4 py-5 lg:px-6">
        <ExecutiveSidebar activeNav={activeNav} open={sidebarOpen} onClose={() => setSidebarOpen(false)} onSelect={selectNav} />
        <section className="min-w-0 flex-1 space-y-5">
          <ViewHero view={view} activeNav={activeNav} visibleCount={filteredTasks.length} totalCount={tasks.length} metrics={activeViewMetrics} />

          {showHelp ? <HelpGuide /> : null}
          {showTeam ? <TeamMembersPage members={teamMembers} membersReady={membersReady} onSave={saveTeamMemberProfile} /> : null}

          {showOverview ? (
            <>
              <WorkbenchBanner session={session} metrics={metrics} />
              <section className="grid gap-4 xl:grid-cols-[1.65fr_1fr]">
                <div className="space-y-4">
                  <MetricGrid metrics={metrics} />
                </div>
                <ProjectHealth metrics={metrics} tasks={tasks} />
              </section>
              <OperationsCharts tasks={tasks} />
            </>
          ) : null}

          {showToday ? (
            <TodayWorkbench
              tasks={showOverview ? tasks : filteredTasks}
              onEdit={openEdit}
              onOpen={setSelectedTask}
              onQuickEdit={setQuickEditingTask}
              onComplete={completeTask}
              memberMap={memberMap}
            />
          ) : null}

          {showPlatformBoard || showOwnerWorkload ? (
            <section className="grid gap-5">
              <div className="space-y-5">
                {showPlatformBoard ? <PlatformBoard tasks={scopedTasks} platformsToShow={platformBoardItems} onPlatformAdd={openAdd} /> : null}
                {showOwnerWorkload ? <OwnerWorkload tasks={showOverview ? tasks : filteredTasks} memberMap={memberMap} /> : null}
              </div>
            </section>
          ) : null}

          {!showHelp && !showTeam ? <Card className="overflow-hidden border-slate-200 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
            <div className="border-b border-slate-200 bg-white px-4 py-4 lg:px-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <SectionTitle eyebrow="Execution center" title="任务执行区" description={getExecutionDescription(activeNav, filteredTasks.length)} compact />
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    ["platform", "按平台"],
                    ["role", "按具体负责人"],
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
              <ExecutionSearchToolbar
                activeNav={activeNav}
                active={quickFilter}
                filters={filters}
                resultCount={filteredTasks.length}
                tasks={tasks}
                onChange={setQuickFilter}
                onClear={clearExecutionFilters}
                onSearch={(search) => setFilters((current) => ({ ...current, search }))}
              />
            </div>
            <div className="border-b border-slate-200 bg-slate-50/80 p-4 lg:p-5">
              <Filters filters={filters} setFilters={setFilters} tasks={tasks} memberMap={memberMap} />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm text-slate-500 lg:px-5">
              <span>当前显示 <strong className="text-slate-900">{filteredTasks.length}</strong> / {tasks.length} 个任务</span>
              <span>点击任务行可打开右侧详情，行内控件可直接写入 Supabase。</span>
            </div>
            {loading ? <LoadingState /> : filteredTasks.length === 0 ? (
              <div className="p-4 lg:p-5">
                <EmptyState text={filters.search.trim() ? `没有找到与「${filters.search.trim()}」相关的任务` : "当前筛选条件下暂无任务"} />
              </div>
            ) : (
              <div className="space-y-4 p-4 lg:p-5">
                {groupItems.map((group) => (
                  <GroupedTaskSection
                    key={group}
                    title={executionView === "role" ? formatMemberName(group, memberMap) : group}
                    tasks={filteredTasks.filter((task) => belongsToGroup(task, executionView, group))}
                    onAdd={openAdd}
                    onEdit={openEdit}
                    onDelete={deleteTask}
                    onOpenTask={setSelectedTask}
                    onQuickEdit={setQuickEditingTask}
                    onComplete={completeTask}
                    onQuickUpdate={quickUpdate}
                    memberMap={memberMap}
                  />
                ))}
              </div>
            )}
          </Card> : null}
          <PortalFooter />
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
        memberMap={memberMap}
      />
      <QuickUpdateModal key={quickEditingTask?.id || "quick-update"} task={quickEditingTask} open={Boolean(quickEditingTask)} onClose={() => setQuickEditingTask(null)} onSubmit={saveQuickUpdate} />
      <TaskFormModal open={modalOpen} task={editingTask} defaultPlatform={defaultPlatform} onClose={() => setModalOpen(false)} onSubmit={saveTask} memberMap={memberMap} />
      {notice ? (
        <div className={cn(
          "fixed bottom-5 right-5 z-[70] max-w-[min(420px,calc(100vw-2.5rem))] rounded-lg border bg-white px-4 py-3 text-sm font-medium shadow-xl",
          /失败|超时|尚未|错误/.test(notice) ? "border-red-200 text-red-700" : "border-emerald-200 text-emerald-700",
        )}>
          {notice}
        </div>
      ) : null}
    </main>
  );
}

function ExecutiveHeader({
  session,
  notifications,
  teamMembers,
  memberMap,
  membersReady,
  onAdd,
  onProfileSave,
  onNotificationSelect,
  onSignOut,
  onMenu,
}: {
  session: Session;
  notifications: NotificationSummary;
  teamMembers: TeamMember[];
  memberMap: Map<string, TeamMember>;
  membersReady: boolean;
  onAdd: () => void;
  onProfileSave: (memberCode: string, patch: Pick<TeamMember, "display_name" | "email" | "is_active">) => Promise<void>;
  onNotificationSelect: (type: NotificationType) => void;
  onSignOut: () => void;
  onMenu: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const totalNotifications = notifications.overdue + notifications.blocker + notifications.week + notifications.high;
  const items: Array<{ type: NotificationType; label: string; count: number; tone: string; description: string }> = [
    { type: "overdue", label: "逾期", count: notifications.overdue, tone: "bg-red-50 text-red-700", description: "查看逾期未完成任务" },
    { type: "blocker", label: "卡点", count: notifications.blocker, tone: "bg-orange-50 text-orange-700", description: "查看存在 blocker 的任务" },
    { type: "week", label: "到期", count: notifications.week, tone: "bg-amber-50 text-amber-700", description: "查看本周到期任务" },
    { type: "high", label: "高优先级", count: notifications.high, tone: "bg-blue-50 text-blue-700", description: "查看高优先级任务" },
  ];

  useEffect(() => {
    if (!open) return;
    function closeOnOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", closeOnOutside);
    return () => document.removeEventListener("mousedown", closeOnOutside);
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 shadow-[0_1px_0_rgba(15,23,42,0.02)] backdrop-blur">
      <div className="mx-auto flex max-w-[1720px] items-center justify-between gap-4 px-4 py-3 lg:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenu} aria-label="打开导航"><Menu className="h-5 w-5" /></Button>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold tracking-tight text-slate-950 md:text-xl">跨境电商运营中台</h1>
            <p className="truncate text-xs text-slate-500 md:text-sm">TikTok · Amazon · 独立站 · 团队协同驾驶舱</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 md:gap-3">
          <span className="hidden max-w-[260px] truncate text-sm text-slate-500 lg:inline">{session.user.email}</span>
          <Button className="bg-blue-600 hover:bg-blue-700" onClick={onAdd}><Plus className="h-4 w-4" /><span className="hidden sm:inline">新增任务</span></Button>
          <Button variant="outline" onClick={() => setProfileOpen(true)}><UserRound className="h-4 w-4" /><span className="hidden sm:inline">我的资料</span></Button>
          <div className="relative" ref={dropdownRef}>
            <Button
              variant="outline"
              size="icon"
              title="通知提醒"
              aria-label="通知提醒"
              aria-expanded={open}
              className="relative"
              onClick={() => setOpen((current) => !current)}
            >
              <Bell className="h-4 w-4 text-slate-600" />
              {totalNotifications > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold leading-none text-white">
                  {totalNotifications > 99 ? "99+" : totalNotifications}
                </span>
              ) : null}
            </Button>
            {open ? (
              <div className="absolute right-0 top-12 z-50 w-[min(calc(100vw-2rem),360px)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
                <div className="border-b border-slate-100 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-950">通知中心</h3>
                      <p className="mt-0.5 text-xs text-slate-500">根据当前任务实时计算，不连接推送服务。</p>
                    </div>
                    <Badge className={cn(totalNotifications > 0 ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-500")}>
                      {totalNotifications} 条
                    </Badge>
                  </div>
                </div>
                {totalNotifications === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-slate-500">暂无重要提醒</div>
                ) : (
                  <div className="max-h-[min(60vh,360px)] overflow-y-auto p-2">
                    {items.map((item) => (
                      <button
                        key={item.type}
                        type="button"
                        className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-3 text-left transition hover:bg-slate-50"
                        onClick={() => {
                          onNotificationSelect(item.type);
                          setOpen(false);
                        }}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={cn("rounded-md px-2 py-1 text-xs font-medium", item.tone)}>{item.label}</span>
                            <span className="text-sm font-semibold text-slate-900">{item.count} 个任务</span>
                          </div>
                          <p className="mt-1 truncate text-xs text-slate-500">{item.description}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>
          <Button variant="outline" onClick={onSignOut}><LogOut className="h-4 w-4" /><span className="hidden sm:inline">退出</span></Button>
        </div>
      </div>
      <ProfileModal
        open={profileOpen}
        session={session}
        teamMembers={teamMembers}
        memberMap={memberMap}
        membersReady={membersReady}
        onClose={() => setProfileOpen(false)}
        onSave={onProfileSave}
      />
    </header>
  );
}

function ProfileModal({
  open,
  session,
  teamMembers,
  memberMap,
  membersReady,
  onClose,
  onSave,
}: {
  open: boolean;
  session: Session;
  teamMembers: TeamMember[];
  memberMap: Map<string, TeamMember>;
  membersReady: boolean;
  onClose: () => void;
  onSave: (memberCode: string, patch: Pick<TeamMember, "display_name" | "email" | "is_active">) => Promise<void>;
}) {
  const [memberCode, setMemberCode] = useState(teamMembers[0]?.member_code || "BD01");
  const selected = memberMap.get(memberCode);
  const [displayName, setDisplayName] = useState(selected?.display_name || "");
  const [email, setEmail] = useState(selected?.email || session.user.email || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const first = memberMap.get(memberCode) || teamMembers[0];
    if (!first) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMemberCode(first.member_code);
    setDisplayName(first.display_name || "");
    setEmail(first.email || session.user.email || "");
    setError("");
  }, [open, memberCode, memberMap, session.user.email, teamMembers]);

  if (!open) return null;

  async function save() {
    setSaving(true);
    setError("");
    try {
      await onSave(memberCode, { display_name: displayName.trim() || null, email: email.trim() || null, is_active: true });
      onClose();
    } catch (err) {
      console.error("Profile save failed", err);
      setError("保存失败：请确认已执行 create-team-members.sql，并检查当前账号权限。");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/35 px-4">
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">我的资料</h2>
            <p className="mt-1 text-sm text-slate-500">当前登录邮箱：{session.user.email}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <div className="space-y-4 px-5 py-5">
          {!membersReady ? <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">团队成员表尚未可用，请先执行 create-team-members.sql。</p> : null}
          <LabelText label="选择成员编号">
            <select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400" value={memberCode} onChange={(event) => {
              const nextCode = event.target.value;
              const nextMember = memberMap.get(nextCode);
              setMemberCode(nextCode);
              setDisplayName(nextMember?.display_name || "");
              setEmail(nextMember?.email || session.user.email || "");
            }}>
              {teamMembers.map((member) => <option key={member.member_code} value={member.member_code}>{formatMemberName(member.member_code, memberMap)}</option>)}
            </select>
          </LabelText>
          <LabelText label="显示名称">
            <input className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-blue-400" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="例如 张三 / Anna / John" />
          </LabelText>
          <LabelText label="邮箱">
            <input className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-blue-400" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" />
          </LabelText>
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">当前版本允许用户选择自己的 member_code 并填写显示名称。后续可通过 email 绑定后限制只能修改本人资料。</p>
          {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>取消</Button>
          <Button onClick={save} disabled={saving || !membersReady} className="bg-blue-600 hover:bg-blue-700">{saving ? "保存中..." : "保存"}</Button>
        </div>
      </div>
    </div>
  );
}

function ExecutiveSidebar({ activeNav, open, onClose, onSelect }: { activeNav: NavKey; open: boolean; onClose: () => void; onSelect: (key: NavKey) => void }) {
  return (
    <>
      <div className={cn("fixed inset-0 z-40 bg-slate-950/30 lg:hidden", open ? "block" : "hidden")} onClick={onClose} />
      <aside className={cn(
        "fixed left-0 top-0 z-50 flex h-[100dvh] w-[260px] flex-col overflow-hidden border-r border-slate-200 bg-white p-4 shadow-xl transition-transform lg:sticky lg:top-[73px] lg:z-20 lg:h-[calc(100vh-73px)] lg:translate-x-0 lg:rounded-xl lg:border lg:shadow-sm",
        open ? "translate-x-0" : "-translate-x-full",
      )}>
        <div className="mb-4 flex items-center justify-between lg:hidden">
          <span className="font-semibold text-slate-950">导航</span>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Command center</div>
          <div className="mt-2 text-sm font-semibold text-slate-950">每日推进视图</div>
          <p className="mt-1 text-xs leading-5 text-slate-500">按平台、风险和负责人快速切换工作重点。</p>
        </div>
        <nav className="-mx-2 min-h-0 flex-1 space-y-4 overflow-y-auto px-2 pb-6 pr-1 [scrollbar-color:#cbd5e1_transparent] [scrollbar-width:thin]">
          {sidebarGroups.map((group) => (
            <div key={group.title}>
              <div className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{group.title}</div>
              <div className="space-y-1">
                {group.items.map((item) => {
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
                      <span className="flex min-w-0 items-center gap-3 whitespace-nowrap">
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </span>
                      <ChevronRight className={cn("h-4 w-4 shrink-0", active ? "opacity-100" : "opacity-0")} />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
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

function TeamMembersPage({
  members,
  membersReady,
  onSave,
}: {
  members: TeamMember[];
  membersReady: boolean;
  onSave: (memberCode: string, patch: Pick<TeamMember, "display_name" | "email" | "is_active">) => Promise<void>;
}) {
  const groups = getMembersByGroup(members);
  return (
    <section className="space-y-5">
      <Card className="border-slate-200 p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <SectionTitle
              eyebrow="Team settings"
              title="团队成员管理"
              description="用于配置 BD01、BD02 等成员编号对应的真实姓名，方便任务分配和团队协作。"
              compact
            />
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">任务底层仍保存稳定 member_code。页面显示会优先使用 display_name，例如 张三（BD01）；人员更换时只需要修改显示名称，不需要批量修改历史任务。</p>
          </div>
          <Badge className={cn("w-fit", membersReady ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100" : "bg-amber-50 text-amber-700 ring-1 ring-amber-100")}>
            {membersReady ? "已连接 team_members" : "等待执行 SQL"}
          </Badge>
        </div>
      </Card>
      {!membersReady ? (
        <Card className="border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
          当前尚未读取到 Supabase `team_members` 表。请在 Supabase SQL Editor 执行 `supabase/migrations/create-team-members.sql` 后刷新页面。
        </Card>
      ) : null}
      {groups.map((group) => (
        <section key={group.title} className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-500">{group.title}</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {group.members.map((member) => <TeamMemberCard key={member.member_code} member={member} disabled={!membersReady} onSave={onSave} />)}
          </div>
        </section>
      ))}
    </section>
  );
}

function TeamMemberCard({
  member,
  disabled,
  onSave,
}: {
  member: TeamMember;
  disabled: boolean;
  onSave: (memberCode: string, patch: Pick<TeamMember, "display_name" | "email" | "is_active">) => Promise<void>;
}) {
  const [displayName, setDisplayName] = useState(member.display_name || "");
  const [email, setEmail] = useState(member.email || "");
  const [isActive, setIsActive] = useState(member.is_active);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDisplayName(member.display_name || "");
    setEmail(member.email || "");
    setIsActive(member.is_active);
  }, [member]);

  async function save() {
    setSaving(true);
    setError("");
    try {
      await onSave(member.member_code, { display_name: displayName.trim() || null, email: email.trim() || null, is_active: isActive });
    } catch (err) {
      console.error("Team member save failed", err);
      setError("保存失败：请确认 team_members 表和 RLS 策略已创建。");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="border-slate-200 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-400">member_code</p>
          <h3 className="mt-1 truncate font-semibold text-slate-950">{member.member_code}</h3>
          <p className="mt-1 text-xs text-slate-500">{member.role_group}</p>
        </div>
        <Badge className={isActive ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100" : "bg-slate-100 text-slate-500"}>{isActive ? "启用" : "停用"}</Badge>
      </div>
      <div className="mt-4 space-y-3">
        <LabelText label="显示名称">
          <input className="h-9 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-blue-400" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="例如 张三 / Anna" disabled={disabled || saving} />
        </LabelText>
        <LabelText label="邮箱">
          <input className="h-9 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-blue-400" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" disabled={disabled || saving} />
        </LabelText>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" className="accent-blue-600" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} disabled={disabled || saving} />
          是否启用
        </label>
        {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p> : null}
        <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700" onClick={save} disabled={disabled || saving}>{saving ? "保存中..." : "保存成员"}</Button>
      </div>
    </Card>
  );
}

function LabelText({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <div className="mt-2">{children}</div>
    </label>
  );
}

function WorkbenchBanner({ session, metrics }: { session: Session; metrics: ReturnType<typeof createMetrics> }) {
  const today = new Intl.DateTimeFormat("zh-CN", { dateStyle: "full" }).format(new Date());
  const focusCount = metrics.overdue + metrics.blockers + metrics.highPriority;

  return (
    <Card className="overflow-hidden border-blue-100 bg-gradient-to-br from-white via-blue-50 to-slate-50 p-5 shadow-[0_16px_44px_rgba(37,99,235,0.08)]">
      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr] xl:items-center">
        <div>
          <Badge className="bg-blue-600 text-white">企业内部运营门户</Badge>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 md:text-[28px]">今日运营概览</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            当前系统管理 TikTok、Amazon、独立站三大渠道。优先处理卡点、逾期和高优先级任务，确保跨平台推进节奏稳定。
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-sm text-slate-600">
            <span className="rounded-lg border border-white/80 bg-white/80 px-3 py-1.5 shadow-sm">{today}</span>
            <span className="max-w-full truncate rounded-lg border border-white/80 bg-white/80 px-3 py-1.5 shadow-sm">当前用户：{session.user.email}</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <PortalStat label="重点关注" value={focusCount} tone="blue" />
          <PortalStat label="卡点任务" value={metrics.blockers} tone="amber" />
          <PortalStat label="逾期任务" value={metrics.overdue} tone="red" />
        </div>
      </div>
    </Card>
  );
}

function PortalStat({ label, value, tone }: { label: string; value: number; tone: "blue" | "amber" | "red" }) {
  return (
    <div className={cn(
      "rounded-xl border bg-white/85 p-4 text-center shadow-sm",
      tone === "blue" && "border-blue-100",
      tone === "amber" && "border-amber-100",
      tone === "red" && "border-red-100",
    )}>
      <div className={cn(
        "text-3xl font-semibold tracking-tight",
        tone === "blue" && "text-blue-700",
        tone === "amber" && "text-amber-700",
        tone === "red" && "text-red-700",
      )}>{value}</div>
      <div className="mt-1 whitespace-nowrap text-xs font-medium text-slate-500">{label}</div>
    </div>
  );
}

function HelpGuide() {
  const roleQuickCards = [
    ["总项目负责人", "看全局风险和资源协调"],
    ["TikTok 运营负责人", "看 TikTok 内容、店铺、广告、直播"],
    ["TikTok 运营兼 BD", "看 TikTok + BD 合作推进"],
    ["Amazon 运营负责人", "看 Listing、广告、Review、FBA"],
    ["TikTok 运营助理", "看内容执行、样品、数据整理"],
    ["BD 团队", "看达人建联、样品、视频回收"],
    ["产品研发负责人", "看打样、测试、供应链"],
    ["剪辑团队", "看视频剪辑、素材交付、二剪"],
  ];
  const dailySteps = [
    ["查看运营总览", "看项目健康度、逾期任务、卡点任务、高优先级任务、本周到期任务。"],
    ["进入自己的角色视图", "根据身份查看 TikTok、Amazon、BD、产品研发或剪辑相关任务。"],
    ["处理今日重点", "优先处理已逾期、有卡点、高优先级、本周到期、待确认任务。"],
    ["更新任务进度", "每天至少更新状态、进度、最新进展、当前卡点和下一步动作。"],
    ["完成后标记闭环", "任务完成后使用一键完成或编辑任务，将状态更新为已完成。"],
  ];
  const roleGuides = [
    {
      title: "总项目负责人",
      focus: ["运营总览", "项目健康度", "逾期任务", "卡点任务", "各负责人完成率", "三平台推进状态"],
      routine: ["看哪些任务影响整体上线或销售节奏", "协调需要资源支持的卡点", "检查 BD、研发、剪辑是否影响运营节奏", "对关键任务确认或催办"],
      fields: ["项目阶段", "截止时间", "当前卡点", "下一步动作", "资源需求", "验收结果"],
    },
    {
      title: "TikTok 运营负责人",
      focus: ["TikTok 任务", "内容素材准备", "TikTok Shop 店铺任务", "短视频内容", "直播", "TikTok 广告", "内容复盘", "剪辑任务进度", "BD 达人素材回收"],
      routine: ["检查 TikTok 内容排期", "检查短视频是否按时交付", "检查达人素材是否回收", "检查店铺、活动、直播、广告推进", "更新 TikTok 相关任务"],
      fields: ["platform 选择 TikTok", "business_module 选择短视频内容、达人建联、直播、素材测试、内容复盘", "latest_update 写今天实际进展", "blocker 写影响发布/投放/直播的问题", "next_action 写下一步动作"],
    },
    {
      title: "TikTok 运营负责人兼 BD 负责人",
      focus: ["TikTok 任务", "BD 团队任务", "达人建联", "样品寄送", "视频回收", "合作报价", "卡点任务"],
      routine: ["检查 TikTok 内容推进", "检查 BD 人员跟进情况", "检查 10 个 BD 是否按计划建联", "检查样品寄送和达人视频回收", "判断 BD 卡点是否影响内容节奏"],
      fields: ["BD 任务 role 选择 BD", "TikTok 运营任务 role 选择 TikTok运营", "owner 写具体负责人姓名", "blocker 写清楚哪位达人、哪个样品、哪个视频卡住"],
    },
    {
      title: "Amazon 运营负责人",
      focus: ["Amazon 任务", "Listing 优化", "关键词调研", "主图 / 视频", "A+ 页面", "Review 获取", "PPC 广告", "FBA 库存", "竞品分析", "Coupon / Deal", "数据复盘"],
      routine: ["检查 Listing 是否优化完成", "检查图片、视频、A+ 页面是否到位", "检查 PPC 广告数据", "检查库存和 FBA 入仓状态", "检查 Review 和 QA 进展"],
      fields: ["platform 选择 Amazon", "business_module 选择 Amazon 对应模块", "kpi_metric 可写 CTR、CVR、CPA、ROAS、订单数、Review 数、库存周转", "actual_result 记录复盘结果"],
    },
    {
      title: "TikTok 运营助理",
      focus: ["TikTok 任务", "今日重点", "短视频内容", "达人建联辅助", "样品寄送跟进", "数据整理", "待确认任务"],
      routine: ["整理达人名单", "更新样品寄送状态", "收集视频素材", "整理播放、互动、转化数据", "及时更新执行进度"],
      fields: ["latest_update 写实际完成事项", "next_action 写下一步要跟谁、交付什么", "blocker 写需要负责人协助的问题", "不要只写已跟进，要写清楚对象和结果"],
    },
    {
      title: "产品研发进度负责人",
      focus: ["产品研发任务", "供应链任务", "打样任务", "包装确认", "产品测试", "SKU / 配件 / 说明书", "影响上线的卡点"],
      routine: ["更新产品打样进度", "更新测试反馈", "更新供应商交付时间", "更新包装、说明书、配件确认进度", "及时标记影响上线的问题"],
      fields: ["platform 根据影响渠道选择", "role 选择 产品研发 或 项目协同", "owner 选择 产品研发进度负责人", "blocker 写清供应商、样品、测试、包装、认证、交期问题", "next_action 写清下一步确认事项"],
    },
    {
      title: "剪辑负责人 / 剪辑人员",
      focus: ["短视频内容", "素材测试", "TikTok 广告", "达人素材二剪", "内容复盘", "今日重点", "本周到期"],
      routine: ["查看待剪辑任务", "更新每条视频剪辑状态", "标记素材缺失、脚本不清、授权问题等卡点", "交付后更新为待确认或已完成"],
      fields: ["task_name 写视频名称 / 素材主题", "description 写剪辑需求", "progress 写剪辑进度", "blocker 写缺素材 / 缺脚本 / 画质 / 授权问题", "due_date 写交付日期"],
    },
  ];
  const bdExamples = [
    "BD01 跟进 TikTok 达人 Anna 样品地址确认",
    "BD02 跟进达人视频发布时间",
    "BD03 整理 50 个卷发棒类达人名单",
    "BD04 催收达人合作报价",
    "BD05 跟进首批样品签收",
    "BD06 回收达人授权素材",
    "BD07 跟进 Affiliate 合作申请",
    "BD08 复盘达人视频播放数据",
    "BD09 统计本周达人回复率",
    "BD10 跟进未回复达人二次触达",
  ];
  const fieldRows = [
    ["platform", "任务所属渠道", "TikTok / Amazon / 独立站", "运营、BD、Amazon、剪辑"],
    ["role", "职能大类", "TikTok运营 / Amazon运营 / BD / 产品研发 / 剪辑 / 项目协同", "所有角色"],
    ["owner", "具体负责人姓名", "BD03 / 张三 / 剪辑负责人", "所有角色"],
    ["task_name", "任务名称", "BD01 跟进达人 Anna 样品地址确认", "所有角色"],
    ["description", "任务背景和要求", "确认达人报价、寄样地址和视频发布时间", "所有角色"],
    ["business_module", "业务模块", "达人建联 / Listing 优化 / 短视频内容 / 产品测试", "负责人"],
    ["project_stage", "项目阶段", "素材准备 / 执行中 / 复盘", "负责人"],
    ["priority", "任务优先级", "高 / 中 / 低", "负责人"],
    ["status", "当前状态", "未开始 / 进行中 / 待确认 / 已完成 / 已暂停", "所有角色"],
    ["progress", "进度百分比", "60", "所有角色"],
    ["start_date", "开始时间", "2026-07-09", "负责人"],
    ["due_date", "截止时间", "2026-07-12", "所有角色"],
    ["latest_update", "最新进展", "已二次触达达人，等待报价确认", "所有角色"],
    ["blocker", "当前卡点", "达人 Anna 未回复报价，等待 7/10 前确认", "所有角色"],
    ["next_action", "下一步动作", "7/10 上午再次触达并同步负责人", "所有角色"],
    ["expected_result", "预期结果", "完成 10 位达人建联并确认寄样", "负责人"],
    ["actual_result", "实际结果", "完成 8 位达人回复，2 位待二次触达", "负责人"],
    ["kpi_metric", "核心指标", "CTR / CVR / ROAS / Review 数 / 回复率", "运营、Amazon、BD"],
    ["target_value", "目标值", "达人回复率 30%", "负责人"],
    ["current_value", "当前值", "达人回复率 22%", "负责人"],
    ["result_summary", "复盘结论", "视频开头 3 秒展示产品效果更好", "负责人"],
  ];
  const statusItems = [
    ["未开始", "任务已进入计划池，尚未正式推进。"],
    ["进行中", "负责人正在推进，需要持续更新进展。"],
    ["待确认", "任务产出已完成，等待复核、验收或负责人确认。"],
    ["已完成", "任务闭环，进度应为 100%。"],
    ["已暂停", "任务暂时冻结，需要说明暂停原因和恢复条件。"],
  ];
  const priorityItems = [
    ["高", "影响上线、销售、投放、关键合作、核心节点的任务。"],
    ["中", "正常推进任务，需要按计划完成。"],
    ["低", "优化类、补充类、非紧急任务。"],
  ];
  const interactionItems = [
    ["Sidebar 菜单", "切换运营总览、今日重点、平台、负责人、卡点、逾期、数据复盘和使用说明。"],
    ["运营总览", "查看项目健康度、核心指标、图表、今日工作台和任务执行区。"],
    ["今日重点", "聚焦逾期、卡点、高优先级、本周到期和待确认任务。"],
    ["TikTok / Amazon / 独立站", "按平台查看对应任务和平台推进看板。"],
    ["负责人视图", "按负责人角色查看任务负载、卡点和完成率。"],
    ["卡点任务 / 逾期任务", "快速定位需要资源介入或已经超期的任务。"],
    ["数据复盘", "查看数据复盘、内容复盘、效果复盘相关任务。"],
    ["通知中心", "点击右上角铃铛查看逾期、卡点、本周到期和高优先级提醒。"],
    ["全局搜索 / 快捷筛选", "搜索任务名、负责人、模块、卡点和下一步动作，并叠加快捷筛选。"],
    ["新增 / 编辑 / 快速更新", "新增完整任务，编辑完整字段，或轻量更新状态、进度、进展、卡点、下一步。"],
    ["一键完成", "未完成任务确认后自动更新为已完成，进度为 100%。"],
    ["任务详情 Drawer", "点击任务行打开详情，查看时间线、风险、KPI、进展和操作按钮。"],
  ];
  const onboardingSteps = ["注册账号并登录", "找到自己的角色视图", "查看自己负责的任务", "更新 owner 是自己的任务", "新增遗漏任务", "每天更新进度", "遇到卡点及时写 blocker", "任务完成后标记完成"];
  const teamRules = [
    "每个人只更新自己负责的任务",
    "每天至少更新一次进行中任务",
    "重要卡点必须写 blocker",
    "每条任务必须有明确 due_date",
    "完成后必须标记已完成",
    "待确认任务需要负责人及时验收",
    "BD 人员必须写清楚达人名称和下一步动作",
    "剪辑任务必须写清楚交付时间和确认人",
    "产品研发任务必须写清楚供应商 / 样品 / 测试状态",
    "总项目负责人每周检查一次逾期和卡点任务",
  ];

  return (
    <section className="space-y-5">
      <Card className="border-slate-200 p-5 shadow-[0_12px_34px_rgba(15,23,42,0.05)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-blue-600">
              <BookOpen className="h-5 w-5" />
              <span className="text-xs font-semibold uppercase tracking-[0.18em]">Workflow handbook</span>
            </div>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">跨境电商多平台运营中台使用说明</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              适用于 TikTok、Amazon、独立站、BD、产品研发、剪辑团队的日常任务推进与协作规范。
            </p>
          </div>
          <Badge className="w-fit bg-blue-50 text-blue-700 ring-1 ring-blue-100">内部操作手册</Badge>
        </div>
      </Card>

      <Card className="border-slate-200 p-5 shadow-sm">
        <SectionTitle eyebrow="System purpose" title="系统是做什么的" description="统一管理跨境电商项目中 TikTok、Amazon、独立站、BD、产品研发、剪辑等任务。" compact />
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {["当前任务推进到哪一步", "谁负责、哪个平台、哪个业务模块", "是否有卡点、下一步动作是什么", "截止时间、是否逾期、是否需要管理层介入"].map((item) => (
            <div key={item} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700">{item}</div>
          ))}
        </div>
      </Card>

      <Card className="border-slate-200 p-5 shadow-sm">
        <SectionTitle eyebrow="Role quick view" title="角色速查卡片" description="新成员先从这里判断自己每天应该重点看哪些内容。" compact />
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {roleQuickCards.map(([title, text]) => (
            <div key={title} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-600" />
                <h3 className="font-semibold text-slate-950">{title}</h3>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="border-slate-200 p-5 shadow-sm">
        <SectionTitle eyebrow="Daily routine" title="每天使用流程" description="建议团队每天按固定步骤推进，减少遗漏、重复沟通和责任不清。" compact />
        <div className="mt-5 grid gap-3">
          {dailySteps.map(([title, text], index) => (
            <div key={title} className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 md:grid-cols-[110px_1fr]">
              <span className="flex h-8 w-fit items-center rounded-full bg-blue-600 px-3 text-xs font-semibold text-white">Step {index + 1}</span>
              <div>
                <h3 className="font-semibold text-slate-950">{title}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="border-slate-200 p-5 shadow-sm">
        <SectionTitle eyebrow="Role handbook" title="不同角色怎么使用" description="每个角色都应围绕主要查看、每天要做和字段填写重点来更新任务。" compact />
        <div className="mt-5 grid gap-3">
          {roleGuides.map((item) => (
            <details key={item.title} className="group rounded-lg border border-slate-200 bg-white p-4 open:bg-slate-50">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-slate-950">
                <span>{item.title}</span>
                <ChevronRight className="h-4 w-4 text-slate-400 transition group-open:rotate-90" />
              </summary>
              <div className="mt-4 grid gap-4 xl:grid-cols-3">
                <GuideBullets title="主要查看" items={item.focus} />
                <GuideBullets title="每天要做" items={item.routine} />
                <GuideBullets title="任务填写重点" items={item.fields} />
              </div>
            </details>
          ))}
        </div>
      </Card>

      <Card className="border-amber-200 bg-amber-50/40 p-5 shadow-sm">
        <SectionTitle eyebrow="BD workflow" title="BD 团队使用规范" description="BD 人员需要清楚记录每天联系谁、跟进谁、哪些达人卡住、哪些样品已寄出、哪些视频未回收。" compact />
        <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr]">
          <GuideBullets title="BD 每天要做" items={["新增或更新自己的达人建联任务", "更新达人回复情况", "更新样品寄送状态", "更新视频回收情况", "标记当前卡点", "写清楚下一步动作"]} />
          <GuideBullets title="BD 任务必须填写" items={["owner：具体 BD 人员姓名", "task_name：达人名称 / 合作事项", "description：合作背景", "status：当前状态", "latest_update：今天跟进结果", "blocker：未回复 / 样品未寄出 / 地址未确认 / 报价未确认 / 视频未交付", "next_action：下一步联系、寄样、催视频、确认报价", "due_date：下一次必须完成的时间"]} />
        </div>
        <div className="mt-5 grid gap-2 md:grid-cols-2 xl:grid-cols-5">
          {bdExamples.map((example) => <div key={example} className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs leading-5 text-slate-700">{example}</div>)}
        </div>
      </Card>

      <Card className="border-slate-200 p-5 shadow-sm">
        <SectionTitle eyebrow="Field standard" title="任务字段填写规范" description="每条任务都要让别人看得懂：谁负责、现在到哪里、卡在哪里、下一步做什么。" compact />
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[980px] border-separate border-spacing-0 text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-semibold text-slate-500">
                {["字段", "字段用途", "填写示例", "重点填写角色"].map((item) => <th key={item} className="border-b border-slate-200 px-3 py-3">{item}</th>)}
              </tr>
            </thead>
            <tbody>
              {fieldRows.map(([field, purpose, example, rolesText]) => (
                <tr key={field} className="align-top">
                  <td className="w-[150px] border-b border-slate-100 px-3 py-3 font-semibold text-slate-900">{field}</td>
                  <td className="w-[240px] border-b border-slate-100 px-3 py-3 text-slate-600">{purpose}</td>
                  <td className="border-b border-slate-100 px-3 py-3 text-slate-600">{example}</td>
                  <td className="w-[180px] border-b border-slate-100 px-3 py-3 text-slate-600">{rolesText}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <GuideList title="状态使用规范" items={statusItems} />
        <GuideList title="优先级使用规范" items={priorityItems} />
      </div>

      <Card className="border-red-100 bg-red-50/40 p-5 shadow-sm">
        <SectionTitle eyebrow="Blocker rules" title="风险和卡点填写规范" description="blocker 必须写清楚对象、原因、已做动作、等待结果和时间点。" compact />
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <GuideBullets title="不要这样写" items={["有问题", "卡住了", "等回复", "处理中"]} />
          <GuideBullets title="应该这样写" items={["达人 Anna 未回复报价，已二次触达，等待 7/10 前确认", "供应商样品发货延迟，预计 7/12 才能寄出", "剪辑缺少产品使用场景素材，需要运营 7/9 前补充", "Amazon 主图还未确认，影响 Listing 上线"]} />
        </div>
      </Card>

      <Card className="border-slate-200 p-5 shadow-sm">
        <SectionTitle eyebrow="Team rules" title="30 人团队协作规范" description="多人协作时，规则越清楚，任务推进越稳定。" compact />
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {teamRules.map((item) => <div key={item} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700">{item}</div>)}
        </div>
      </Card>

      <Card className="border-slate-200 p-5 shadow-sm">
        <SectionTitle eyebrow="New member" title="新成员第一天怎么用" description="适合新同事入职当天按步骤完成系统熟悉和任务接管。" compact />
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {onboardingSteps.map((step, index) => (
            <div key={step} className="rounded-lg border border-slate-200 bg-white p-4">
              <span className="text-xs font-semibold text-blue-600">Step {index + 1}</span>
              <p className="mt-2 text-sm font-medium text-slate-800">{step}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="border-slate-200 p-5 shadow-sm">
        <SectionTitle eyebrow="Interactions" title="页面交互说明" description="常用入口都在这里，新成员可以按功能名称快速查找。" compact />
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {interactionItems.map(([title, text]) => (
            <div key={title} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <h3 className="font-semibold text-slate-950">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="border-slate-200 p-5 shadow-sm">
        <SectionTitle eyebrow="Member names" title="成员名称设置说明" description="成员编号用于稳定分配任务，显示名称用于日常阅读和团队沟通。" compact />
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {[
            "BD01–BD10 是团队内部稳定编号，不建议直接改编号。",
            "每个 BD 可以在团队成员页面或我的资料里填写真实姓名。",
            "系统会在任务中显示真实姓名，但底层仍保留 BD 编号。",
            "人员更换时只需要修改 display_name，不需要批量修改历史任务。",
            "建议格式：中文名 / 英文名均可，例如 张三、Anna、John。",
          ].map((item) => <div key={item} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700">{item}</div>)}
        </div>
      </Card>

      <Card className="border-blue-100 bg-blue-50/50 p-5 shadow-sm">
        <SectionTitle eyebrow="Permission note" title="权限说明" description="当前只是帮助说明，不修改 Supabase RLS，不影响当前团队使用。" compact />
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <GuideBullets title="当前版本" items={["所有登录成员可以查看全部任务", "所有登录成员可以新增、编辑、删除任务", "适合当前小团队快速协作"]} />
          <GuideBullets title="未来版本" items={["总项目负责人：全部权限", "各负责人：编辑自己负责范围", "BD 人员：编辑自己 owner 的任务", "剪辑人员：编辑剪辑相关任务", "产品研发负责人：编辑产品研发相关任务", "普通成员：只读或有限编辑"]} />
        </div>
      </Card>

      <PermissionPlanning />
    </section>
  );
}

function GuideBullets({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="font-semibold text-slate-950">{title}</h3>
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <div key={item} className="flex gap-2 text-sm leading-6 text-slate-600">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PortalFooter() {
  return (
    <footer className="flex flex-col gap-2 border-t border-slate-200 py-5 text-xs text-slate-500 md:flex-row md:items-center md:justify-between">
      <span className="font-medium text-slate-600">ForLifa 跨境电商运营中台</span>
      <span>Internal Operations System · Version v1.0 · 数据由 Supabase 实时保存</span>
    </footer>
  );
}

function PermissionPlanning() {
  const futureRoles = [
    { role: "总项目负责人", rules: ["查看全部任务", "新增、编辑、删除全部任务", "管理成员权限"] },
    { role: "平台运营负责人", rules: ["查看全部任务", "主要编辑 TikTok运营 / Amazon运营 范围任务"] },
    { role: "BD 团队", rules: ["查看全部任务", "主要编辑 role = BD 或 owner 是自己的任务"] },
    { role: "产品与内容团队", rules: ["查看全部任务", "主要编辑 产品研发 / 剪辑 范围任务"] },
    { role: "只读成员", rules: ["只能查看任务", "不能新增、编辑、删除"] },
  ];

  return (
    <Card className="border-slate-200 p-5 shadow-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <SectionTitle eyebrow="Permission plan" title="权限规划" description="当前只是前端说明，不修改 Supabase RLS、Auth 或任何 policy，不影响当前团队使用。" compact />
        <Badge className="w-fit bg-slate-100 text-slate-600">规划说明</Badge>
      </div>
      <div className="mt-5 grid gap-4 xl:grid-cols-[0.9fr_1.4fr]">
        <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-4">
          <h3 className="font-semibold text-slate-950">当前版本</h3>
          <div className="mt-3 space-y-2">
            {["所有登录用户都可以查看全部任务", "所有登录用户都可以新增、编辑、删除任务", "适合内部小团队测试和早期协作"].map((item) => (
              <div key={item} className="flex gap-2 text-sm leading-6 text-slate-700">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {futureRoles.map((item) => (
            <div key={item.role} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <h3 className="font-semibold text-slate-950">{item.role}</h3>
              <div className="mt-3 space-y-2">
                {item.rules.map((rule) => (
                  <div key={rule} className="flex gap-2 text-sm leading-6 text-slate-600">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                    <span>{rule}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function GuideList({ title, items }: { title: string; items: string[][] }) {
  return (
    <Card className="border-slate-200 p-5 shadow-sm">
      <h3 className="font-semibold text-slate-950">{title}</h3>
      <div className="mt-4 space-y-3">
        {items.map(([label, text]) => (
          <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="font-medium text-slate-900">{label}</div>
            <p className="mt-1 text-sm leading-6 text-slate-600">{text}</p>
          </div>
        ))}
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
  memberMap,
}: {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onOpen: (task: Task) => void;
  onQuickEdit: (task: Task) => void;
  onComplete: (task: Task) => void;
  memberMap: Map<string, TeamMember>;
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
              memberMap={memberMap}
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
  memberMap,
}: {
  task: Task;
  onEdit: (task: Task) => void;
  onOpen: (task: Task) => void;
  onQuickEdit: (task: Task) => void;
  onComplete: (task: Task) => void;
  memberMap: Map<string, TeamMember>;
}) {
  const tags = getTaskReasonTags(task);
  return (
    <button className="w-full rounded-lg border border-slate-200 bg-white p-3 text-left transition hover:border-blue-200 hover:bg-blue-50/40" onClick={() => onOpen(task)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="line-clamp-2 text-sm font-medium leading-5 text-slate-950">{task.task_name}</p>
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
        <span className="truncate">{formatMemberName(task.owner, memberMap)} · {task.role}</span>
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
  return <span className={cn("inline-flex h-6 items-center whitespace-nowrap rounded-md px-2 text-xs font-medium ring-1", cls)}>{label}</span>;
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

function OwnerWorkload({ tasks, memberMap }: { tasks: Task[]; memberMap: Map<string, TeamMember> }) {
  return (
    <section className="space-y-4">
      <SectionTitle eyebrow="Owner workload" title="负责人推进情况" description="按真实团队成员观察任务压力、完成率、卡点和逾期情况。" />
      <div className="space-y-5">
        {ownerGroups.map((group) => (
          <div key={group.title} className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-500">{group.title}</h3>
            <div className="grid gap-4 xl:grid-cols-3">
              {group.owners.map((owner) => <OwnerCard key={owner} owner={owner} tasks={tasks.filter((task) => task.owner === owner)} memberMap={memberMap} />)}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function OwnerCard({ owner, tasks, memberMap }: { owner: string; tasks: Task[]; memberMap: Map<string, TeamMember> }) {
  const blockers = tasks.filter((task) => task.blocker?.trim()).length;
  const completed = tasks.filter(isCompleted).length;
  const inProgress = tasks.filter((task) => task.status === "进行中").length;
  const overdue = tasks.filter(isOverdue).length;
  const completionRate = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
  const pressure = overdue > 0 || blockers > 2 ? "需支持" : tasks.filter((task) => !isCompleted(task)).length > 8 ? "高压力" : "正常";
  return (
    <Card className="border-slate-200 p-4 shadow-[0_12px_34px_rgba(15,23,42,0.05)]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="rounded-lg bg-slate-100 p-2 text-slate-700"><UserRound className="h-4 w-4" /></div>
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-slate-950">{formatMemberName(owner, memberMap)}</h3>
            <p className="text-xs text-slate-500">任务总数 {tasks.length}</p>
          </div>
        </div>
        <Badge className={cn(pressure === "高压力" && "bg-red-600 text-white", pressure === "需支持" && "bg-amber-500 text-white", pressure === "正常" && "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100")}>{pressure}</Badge>
      </div>
      <div className="mt-4"><ProgressBar value={completionRate} tone="bg-blue-600" /></div>
      <div className="mt-4 grid grid-cols-5 gap-2 text-center">
        <MiniStat label="进行中" value={inProgress} />
        <MiniStat label="已完成" value={completed} />
        <MiniStat label="卡点" value={blockers} danger={blockers > 0} />
        <MiniStat label="逾期" value={overdue} danger={overdue > 0} />
        <MiniStat label="完成率" value={`${completionRate}%`} />
      </div>
    </Card>
  );
}

function ExecutionSearchToolbar({
  activeNav,
  active,
  filters,
  resultCount,
  tasks,
  onChange,
  onClear,
  onSearch,
}: {
  activeNav: NavKey;
  active: QuickFilter;
  filters: FiltersState;
  resultCount: number;
  tasks: Task[];
  onChange: (filter: QuickFilter) => void;
  onClear: () => void;
  onSearch: (search: string) => void;
}) {
  const scopedTasks = tasks.filter((task) => matchesNav(task, activeNav));
  const items: Array<{ key: QuickFilter; label: string; count: number }> = [
    { key: null, label: "全部", count: scopedTasks.length },
    { key: "today", label: "今日重点", count: scopedTasks.filter((task) => matchesQuickFilter(task, "today")).length },
    { key: "overdue", label: "逾期", count: scopedTasks.filter((task) => matchesQuickFilter(task, "overdue")).length },
    { key: "blocker", label: "有卡点", count: scopedTasks.filter((task) => matchesQuickFilter(task, "blocker")).length },
    { key: "high", label: "高优先级", count: scopedTasks.filter((task) => matchesQuickFilter(task, "high")).length },
    { key: "week", label: "本周到期", count: scopedTasks.filter((task) => matchesQuickFilter(task, "week")).length },
    { key: "pending", label: "待确认", count: scopedTasks.filter((task) => matchesQuickFilter(task, "pending")).length },
    { key: "tiktokOps", label: "TikTok运营", count: scopedTasks.filter((task) => matchesQuickFilter(task, "tiktokOps")).length },
    { key: "amazonOps", label: "Amazon运营", count: scopedTasks.filter((task) => matchesQuickFilter(task, "amazonOps")).length },
    { key: "bd", label: "BD团队", count: scopedTasks.filter((task) => matchesQuickFilter(task, "bd")).length },
    { key: "product", label: "产品研发", count: scopedTasks.filter((task) => matchesQuickFilter(task, "product")).length },
    { key: "editing", label: "剪辑", count: scopedTasks.filter((task) => matchesQuickFilter(task, "editing")).length },
  ];
  const hasAnyFilter = Boolean(active !== null || filters.search.trim() || filters.platform !== "全部" || filters.role !== "全部" || filters.owner || filters.businessModule !== "全部" || filters.stage !== "全部" || filters.status !== "全部" || filters.priority !== "全部" || filters.due !== "全部");

  return (
    <div className="mt-4 space-y-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <label className="relative block min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="h-10 w-full rounded-md border border-slate-200 bg-white pl-9 pr-10 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            value={filters.search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="搜索任务名称、说明、进展、卡点、负责人、模块或平台"
          />
          {filters.search ? (
            <button
              type="button"
              className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              onClick={() => onSearch("")}
              aria-label="清空搜索"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </label>
        <div className="flex shrink-0 items-center justify-between gap-3">
          <span className="text-sm text-slate-500">找到 <strong className="text-slate-950">{resultCount}</strong> 条相关任务</span>
          <Button size="sm" variant="outline" onClick={onClear} disabled={!hasAnyFilter}>
            <RotateCcw className="h-4 w-4" />清空筛选
          </Button>
        </div>
      </div>
      <div className="-mx-1 overflow-x-auto px-1">
        <div className="flex min-w-max gap-2 pb-1">
          {items.map((item) => {
            const selected = active === item.key;
            return (
              <button
                key={item.label}
                type="button"
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition",
                  selected ? "border-blue-600 bg-blue-600 text-white shadow-sm" : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-700",
                )}
                onClick={() => onChange(item.key)}
              >
                <span>{item.label}</span>
                <span className={cn("rounded px-1.5 py-0.5 text-[11px]", selected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500")}>{item.count}</span>
              </button>
            );
          })}
        </div>
      </div>
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

function getNotificationSummary(tasks: Task[]): NotificationSummary {
  return {
    overdue: tasks.filter(isOverdue).length,
    blocker: tasks.filter((task) => Boolean(task.blocker?.trim())).length,
    week: tasks.filter(isDueThisWeek).length,
    high: tasks.filter((task) => task.priority === "高").length,
  };
}

function mergeTeamMembers(remoteMembers: TeamMember[]) {
  const remoteMap = new Map(remoteMembers.map((member) => [member.member_code, member]));
  const merged = defaultTeamMembers.map((member) => remoteMap.get(member.member_code) || member);
  const extraMembers = remoteMembers.filter((member) => !owners.includes(member.member_code as never));
  return [...merged, ...extraMembers];
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
  if (view === "role") {
    const historicalOwners = Array.from(new Set(tasks.map((task) => task.owner).filter((owner) => owner && !owners.includes(owner as never))));
    return [...owners, ...historicalOwners];
  }
  const values = Array.from(new Set(tasks.map((task) => view === "status" ? task.status : task.priority)));
  return values.length ? values : view === "status" ? ["未开始", "进行中", "待确认", "已完成", "已暂停"] : ["高", "中", "低"];
}

function belongsToGroup(task: Task, view: ExecutionView, group: string) {
  if (view === "platform") return task.platform === group;
  if (view === "role") return task.owner === group;
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
  if (filter === "tiktokOps") return task.role === "TikTok运营";
  if (filter === "amazonOps") return task.role === "Amazon运营";
  if (filter === "bd") return task.role === "BD";
  if (filter === "product") return task.role === "产品研发";
  if (filter === "editing") return task.role === "剪辑";
  return true;
}

function isReviewTask(task: Task) {
  return ["数据复盘", "内容复盘", "效果复盘"].some((keyword) => task.business_module.includes(keyword));
}

function displayModule(module: string) {
  return module === "支付物流" ? "支付/物流" : module;
}
