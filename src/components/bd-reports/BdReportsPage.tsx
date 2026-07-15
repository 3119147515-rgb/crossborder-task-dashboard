"use client";

import { BarChart3, CalendarDays, Save, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/form";
import { Badge, Card } from "@/components/ui/surface";
import { getSupabase } from "@/lib/supabase";
import { withSupabaseTimeout } from "@/lib/supabase-timeout";
import { createMemberMap, defaultTeamMembers, formatMemberName } from "@/lib/team-members";
import { cn } from "@/lib/utils";
import type { BdDailyReport, BdDailyReportInput, BdMetricField } from "@/types/bd-report";
import type { Task, TeamMember } from "@/types/task";

const countFields: Array<{ key: Exclude<BdMetricField, "gmv">; label: string }> = [
  { key: "creators_contacted", label: "达人触达" },
  { key: "valid_replies", label: "有效回复" },
  { key: "connections_created", label: "建联成功" },
  { key: "samples_sent", label: "样品寄送" },
  { key: "videos_published", label: "视频发布" },
  { key: "collaborations_created", label: "合作达人" },
  { key: "creator_orders", label: "达人出单" },
];

const emptyInput = (reportDate: string, memberCode: string): BdDailyReportInput => ({
  report_date: reportDate,
  member_code: memberCode,
  creators_contacted: 0,
  valid_replies: 0,
  connections_created: 0,
  samples_sent: 0,
  videos_published: 0,
  collaborations_created: 0,
  creator_orders: 0,
  gmv: 0,
  progress_notes: null,
  blockers: null,
  next_plan: null,
});

export function BdReportsPage({ teamMembers, tasks }: { teamMembers: TeamMember[]; tasks: Task[] }) {
  const today = getLocalDate();
  const [tab, setTab] = useState<"daily" | "monthly">("daily");
  const [reportDate, setReportDate] = useState(today);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [memberCode, setMemberCode] = useState("BD01");
  const [monthlyMember, setMonthlyMember] = useState("全部");
  const [reports, setReports] = useState<BdDailyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const supabase = getSupabase();

  const bdMembers = useMemo(() => {
    const configured = teamMembers.filter((member) => member.role_group === "BD");
    return configured.length ? configured : defaultTeamMembers.filter((member) => member.role_group === "BD");
  }, [teamMembers]);
  const memberMap = useMemo(() => createMemberMap(teamMembers), [teamMembers]);

  useEffect(() => {
    let active = true;
    const { start, end } = getMonthBounds(month);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setReports([]);
    setLoadError("");
    withSupabaseTimeout(
      supabase.from("bd_daily_reports").select("*").gte("report_date", start).lte("report_date", end).order("report_date", { ascending: true }),
      "读取 BD 报表",
    )
      .then(({ data, error }) => {
        if (error) throw error;
        if (active) setReports((data || []) as BdDailyReport[]);
      })
      .catch((error) => {
        console.error("Load BD reports failed", error);
        if (active) setLoadError(getReportErrorMessage(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [month, supabase]);

  const currentReport = reports.find((report) => report.report_date === reportDate && report.member_code === memberCode) || null;
  const dailyReports = reports.filter((report) => report.report_date === reportDate);
  const monthlyReports = reports.filter((report) => monthlyMember === "全部" || report.member_code === monthlyMember);
  const monthlySummary = summarizeReports(monthlyReports);
  const dailyTrend = createDailyTrend(monthlyReports);
  const memberSummaries = bdMembers
    .filter((member) => monthlyMember === "全部" || member.member_code === monthlyMember)
    .map((member) => ({ member, summary: summarizeReports(reports.filter((report) => report.member_code === member.member_code)) }));
  const visibleMemberCodes = new Set(memberSummaries.map((item) => item.member.member_code));
  const bdTasks = tasks.filter((task) => task.role === "BD" && visibleMemberCodes.has(task.owner));
  const completedBdTasks = bdTasks.filter((task) => task.status === "已完成" || task.progress >= 100).length;
  const blockedBdTasks = bdTasks.filter((task) => task.blocker?.trim()).length;

  function changeReportDate(value: string) {
    setReportDate(value);
    setMonth(value.slice(0, 7));
  }

  async function saveReport(input: BdDailyReportInput) {
    const { data, error } = await withSupabaseTimeout(
      supabase.from("bd_daily_reports").upsert(input, { onConflict: "member_code,report_date" }).select("*").single(),
      "保存 BD 日报",
    );
    if (error || !data) throw error || new Error("Supabase 未返回已保存的日报，请检查 RLS 策略。");
    const saved = data as BdDailyReport;
    setReports((current) => {
      const exists = current.some((report) => report.id === saved.id);
      return exists ? current.map((report) => report.id === saved.id ? saved : report) : [...current, saved];
    });
  }

  return (
    <section className="space-y-5">
      <div className="flex gap-2 overflow-x-auto pb-1">
        <Button variant={tab === "daily" ? "default" : "outline"} className={tab === "daily" ? "bg-blue-600 hover:bg-blue-700" : ""} onClick={() => setTab("daily")}>
          <CalendarDays className="h-4 w-4" />BD 日报
        </Button>
        <Button variant={tab === "monthly" ? "default" : "outline"} className={tab === "monthly" ? "bg-blue-600 hover:bg-blue-700" : ""} onClick={() => setTab("monthly")}>
          <BarChart3 className="h-4 w-4" />BD 月报
        </Button>
      </div>

      {loadError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{loadError}</div>
      ) : null}

      {tab === "daily" ? (
        <>
          <Card className="overflow-hidden border-slate-200">
            <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Daily input</p>
                  <h2 className="mt-1 text-lg font-semibold text-slate-950">BD 每日业务数据</h2>
                  <p className="mt-1 text-sm text-slate-500">同一成员同一天重复保存会更新原日报，不会生成重复记录。</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="日报日期">
                    <Input type="date" value={reportDate} onChange={(event) => changeReportDate(event.target.value)} />
                  </Field>
                  <Field label="BD 成员">
                    <Select value={memberCode} onChange={(event) => setMemberCode(event.target.value)}>
                      {bdMembers.map((member) => <option key={member.member_code} value={member.member_code}>{formatMemberName(member.member_code, memberMap)}</option>)}
                    </Select>
                  </Field>
                </div>
              </div>
            </div>
            <DailyReportForm
              key={`${reportDate}-${memberCode}-${currentReport?.updated_at || "new"}`}
              initialReport={currentReport}
              reportDate={reportDate}
              memberCode={memberCode}
              disabled={Boolean(loadError)}
              onSave={saveReport}
            />
          </Card>

          <DailyTeamTable reports={dailyReports} members={bdMembers} memberMap={memberMap} reportDate={reportDate} loading={loading} />
        </>
      ) : (
        <>
          <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:items-end">
            <Field label="统计月份">
              <Input type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
            </Field>
            <Field label="BD 成员">
              <Select value={monthlyMember} onChange={(event) => setMonthlyMember(event.target.value)}>
                <option value="全部">全部 BD</option>
                {bdMembers.map((member) => <option key={member.member_code} value={member.member_code}>{formatMemberName(member.member_code, memberMap)}</option>)}
              </Select>
            </Field>
            <Badge className="mb-2 w-fit bg-blue-50 text-blue-700">{monthlyReports.length} 份日报</Badge>
          </div>

          <MonthlyMetricGrid summary={monthlySummary} />

          <section className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
            <Card className="border-slate-200 p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Daily trend</p>
                <h2 className="mt-1 text-lg font-semibold text-slate-950">月度 BD 推进趋势</h2>
              </div>
              {dailyTrend.length ? (
                <div className="mt-5 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyTrend} margin={{ top: 8, right: 8, left: -12, bottom: 8 }}>
                      <CartesianGrid stroke="#E2E8F0" vertical={false} />
                      <XAxis dataKey="date" tick={{ fill: "#64748B", fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fill: "#64748B", fontSize: 11 }} />
                      <Tooltip cursor={{ fill: "#F8FAFC" }} />
                      <Bar dataKey="触达" fill="#2563EB" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="回复" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="合作" fill="#16A34A" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : <ReportEmpty text="本月暂无日报，保存日报后趋势会自动生成。" />}
            </Card>

            <Card className="border-slate-200 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Task context</p>
              <h2 className="mt-1 text-lg font-semibold text-slate-950">BD 任务协同概况</h2>
              <div className="mt-5 grid grid-cols-3 gap-3">
                <TaskMetric label="BD 任务" value={bdTasks.length} />
                <TaskMetric label="已完成" value={completedBdTasks} tone="text-emerald-700" />
                <TaskMetric label="有卡点" value={blockedBdTasks} tone="text-amber-700" />
              </div>
              <div className="mt-5 rounded-lg bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                日报反映每日业务动作，任务概况来自现有 tasks。两者独立保存，在此综合展示。
              </div>
            </Card>
          </section>

          <MemberMonthlyTable items={memberSummaries} memberMap={memberMap} loading={loading} />
        </>
      )}
    </section>
  );
}

function DailyReportForm({
  initialReport,
  reportDate,
  memberCode,
  disabled,
  onSave,
}: {
  initialReport: BdDailyReport | null;
  reportDate: string;
  memberCode: string;
  disabled: boolean;
  onSave: (input: BdDailyReportInput) => Promise<void>;
}) {
  const [form, setForm] = useState<BdDailyReportInput>(() => initialReport ? reportToInput(initialReport) : emptyInput(reportDate, memberCode));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  function setNumber(key: BdMetricField, value: string) {
    const parsed = Math.max(0, Number(value) || 0);
    setForm((current) => ({ ...current, [key]: key === "gmv" ? parsed : Math.floor(parsed) }));
  }

  async function save() {
    setSaving(true);
    setMessage("");
    setIsError(false);
    try {
      await onSave({
        ...form,
        report_date: reportDate,
        member_code: memberCode,
        progress_notes: form.progress_notes?.trim() || null,
        blockers: form.blockers?.trim() || null,
        next_plan: form.next_plan?.trim() || null,
      });
      setMessage(initialReport ? "今日日报已更新" : "今日日报已保存");
    } catch (error) {
      console.error("Save BD report failed", error);
      setIsError(true);
      setMessage(getReportErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {countFields.map((field) => (
          <Field key={field.key} label={field.label}>
            <Input type="number" min={0} step={1} value={form[field.key]} onChange={(event) => setNumber(field.key, event.target.value)} disabled={saving || disabled} />
          </Field>
        ))}
        <Field label="GMV">
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-sm text-slate-400">$</span>
            <Input className="pl-7" type="number" min={0} step="0.01" value={form.gmv} onChange={(event) => setNumber("gmv", event.target.value)} disabled={saving || disabled} />
          </div>
        </Field>
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <Field label="今日进展"><Textarea value={form.progress_notes || ""} onChange={(event) => setForm((current) => ({ ...current, progress_notes: event.target.value }))} disabled={saving || disabled} /></Field>
        <Field label="当前卡点"><Textarea className="border-amber-200 bg-amber-50/30" value={form.blockers || ""} onChange={(event) => setForm((current) => ({ ...current, blockers: event.target.value }))} disabled={saving || disabled} /></Field>
        <Field label="明日计划"><Textarea value={form.next_plan || ""} onChange={(event) => setForm((current) => ({ ...current, next_plan: event.target.value }))} disabled={saving || disabled} /></Field>
      </div>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className={cn("text-sm", isError ? "text-red-700" : "text-emerald-700")}>{message}</div>
        <Button className="bg-blue-600 hover:bg-blue-700" onClick={save} disabled={saving || disabled}>
          <Save className="h-4 w-4" />{saving ? "保存中..." : initialReport ? "更新日报" : "保存日报"}
        </Button>
      </div>
    </div>
  );
}

function DailyTeamTable({ reports, members, memberMap, reportDate, loading }: { reports: BdDailyReport[]; members: TeamMember[]; memberMap: Map<string, TeamMember>; reportDate: string; loading: boolean }) {
  return (
    <Card className="overflow-hidden border-slate-200">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <div><h2 className="font-semibold text-slate-950">当日团队日报</h2><p className="mt-1 text-xs text-slate-500">{reportDate} · 已提交 {reports.length}/{members.length}</p></div>
        <Users className="h-5 w-5 text-slate-400" />
      </div>
      {loading ? <div className="p-8 text-center text-sm text-slate-400">正在读取日报...</div> : reports.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500"><tr><th className="px-4 py-3">成员</th>{countFields.map((field) => <th key={field.key} className="whitespace-nowrap px-3 py-3">{field.label}</th>)}<th className="px-3 py-3">GMV</th><th className="px-4 py-3">卡点</th></tr></thead>
            <tbody>{reports.map((report) => <tr key={report.id} className="border-t border-slate-100"><td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">{formatMemberName(report.member_code, memberMap)}</td>{countFields.map((field) => <td key={field.key} className="px-3 py-3 text-slate-600">{report[field.key]}</td>)}<td className="px-3 py-3 font-medium text-slate-900">{formatMoney(report.gmv)}</td><td className="max-w-[240px] px-4 py-3 text-slate-600"><span className="line-clamp-2">{report.blockers || "无"}</span></td></tr>)}</tbody>
          </table>
        </div>
      ) : <ReportEmpty text="当天还没有 BD 提交日报。" />}
    </Card>
  );
}

function MonthlyMetricGrid({ summary }: { summary: ReportSummary }) {
  const metrics = [
    ["日报数", summary.reportCount, "份"], ["达人触达", summary.creators_contacted, "人"], ["有效回复", summary.valid_replies, "人"], ["建联成功", summary.connections_created, "人"],
    ["样品寄送", summary.samples_sent, "件"], ["视频发布", summary.videos_published, "条"], ["合作达人", summary.collaborations_created, "人"], ["达人出单", summary.creator_orders, "单"],
  ];
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map(([label, value, unit]) => <Card key={label} className="border-slate-200 p-4 shadow-sm"><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold text-slate-950">{value}<span className="ml-1 text-xs font-normal text-slate-400">{unit}</span></p></Card>)}
      <Card className="border-slate-200 p-4 shadow-sm"><p className="text-xs text-slate-500">回复率</p><p className="mt-2 text-2xl font-semibold text-amber-700">{summary.replyRate}%</p></Card>
      <Card className="border-slate-200 p-4 shadow-sm"><p className="text-xs text-slate-500">建联转化率</p><p className="mt-2 text-2xl font-semibold text-blue-700">{summary.connectionRate}%</p></Card>
      <Card className="border-slate-200 p-4 shadow-sm sm:col-span-2"><p className="text-xs text-slate-500">月度 GMV</p><p className="mt-2 text-2xl font-semibold text-emerald-700">{formatMoney(summary.gmv)}</p></Card>
    </section>
  );
}

function MemberMonthlyTable({ items, memberMap, loading }: { items: Array<{ member: TeamMember; summary: ReportSummary }>; memberMap: Map<string, TeamMember>; loading: boolean }) {
  return (
    <Card className="overflow-hidden border-slate-200">
      <div className="border-b border-slate-200 px-5 py-4"><h2 className="font-semibold text-slate-950">BD 成员月度汇总</h2><p className="mt-1 text-xs text-slate-500">按成员比较业务动作和转化表现。</p></div>
      {loading ? <div className="p-8 text-center text-sm text-slate-400">正在汇总月报...</div> : (
        <div className="overflow-x-auto"><table className="w-full min-w-[960px] text-sm"><thead className="bg-slate-50 text-left text-xs text-slate-500"><tr><th className="px-4 py-3">成员</th><th className="px-3 py-3">日报</th><th className="px-3 py-3">触达</th><th className="px-3 py-3">回复</th><th className="px-3 py-3">建联</th><th className="px-3 py-3">寄样</th><th className="px-3 py-3">视频</th><th className="px-3 py-3">合作</th><th className="px-3 py-3">出单</th><th className="px-3 py-3">回复率</th><th className="px-4 py-3">GMV</th></tr></thead><tbody>{items.map(({ member, summary }) => <tr key={member.member_code} className="border-t border-slate-100"><td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">{formatMemberName(member.member_code, memberMap)}</td><td className="px-3 py-3">{summary.reportCount}</td><td className="px-3 py-3">{summary.creators_contacted}</td><td className="px-3 py-3">{summary.valid_replies}</td><td className="px-3 py-3">{summary.connections_created}</td><td className="px-3 py-3">{summary.samples_sent}</td><td className="px-3 py-3">{summary.videos_published}</td><td className="px-3 py-3">{summary.collaborations_created}</td><td className="px-3 py-3">{summary.creator_orders}</td><td className="px-3 py-3">{summary.replyRate}%</td><td className="whitespace-nowrap px-4 py-3 font-medium text-emerald-700">{formatMoney(summary.gmv)}</td></tr>)}</tbody></table></div>
      )}
    </Card>
  );
}

function TaskMetric({ label, value, tone = "text-slate-950" }: { label: string; value: number; tone?: string }) {
  return <div className="rounded-lg border border-slate-200 bg-white p-3 text-center"><p className={cn("text-2xl font-semibold", tone)}>{value}</p><p className="mt-1 text-xs text-slate-500">{label}</p></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block min-w-[170px]"><Label>{label}</Label><div className="mt-1.5">{children}</div></label>;
}

function ReportEmpty({ text }: { text: string }) {
  return <div className="m-5 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">{text}</div>;
}

interface ReportSummary {
  reportCount: number;
  creators_contacted: number;
  valid_replies: number;
  connections_created: number;
  samples_sent: number;
  videos_published: number;
  collaborations_created: number;
  creator_orders: number;
  gmv: number;
  replyRate: number;
  connectionRate: number;
}

function summarizeReports(reports: BdDailyReport[]): ReportSummary {
  const summary = reports.reduce((current, report) => ({
    reportCount: current.reportCount + 1,
    creators_contacted: current.creators_contacted + Number(report.creators_contacted || 0),
    valid_replies: current.valid_replies + Number(report.valid_replies || 0),
    connections_created: current.connections_created + Number(report.connections_created || 0),
    samples_sent: current.samples_sent + Number(report.samples_sent || 0),
    videos_published: current.videos_published + Number(report.videos_published || 0),
    collaborations_created: current.collaborations_created + Number(report.collaborations_created || 0),
    creator_orders: current.creator_orders + Number(report.creator_orders || 0),
    gmv: current.gmv + Number(report.gmv || 0),
  }), { reportCount: 0, creators_contacted: 0, valid_replies: 0, connections_created: 0, samples_sent: 0, videos_published: 0, collaborations_created: 0, creator_orders: 0, gmv: 0 });
  return {
    ...summary,
    replyRate: summary.creators_contacted ? Math.round((summary.valid_replies / summary.creators_contacted) * 100) : 0,
    connectionRate: summary.valid_replies ? Math.round((summary.connections_created / summary.valid_replies) * 100) : 0,
  };
}

function createDailyTrend(reports: BdDailyReport[]) {
  const days = new Map<string, { date: string; 触达: number; 回复: number; 合作: number }>();
  for (const report of reports) {
    const date = report.report_date.slice(5);
    const current = days.get(date) || { date, 触达: 0, 回复: 0, 合作: 0 };
    current.触达 += Number(report.creators_contacted || 0);
    current.回复 += Number(report.valid_replies || 0);
    current.合作 += Number(report.collaborations_created || 0);
    days.set(date, current);
  }
  return Array.from(days.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function reportToInput(report: BdDailyReport): BdDailyReportInput {
  return {
    report_date: report.report_date,
    member_code: report.member_code,
    creators_contacted: Number(report.creators_contacted),
    valid_replies: Number(report.valid_replies),
    connections_created: Number(report.connections_created),
    samples_sent: Number(report.samples_sent),
    videos_published: Number(report.videos_published),
    collaborations_created: Number(report.collaborations_created),
    creator_orders: Number(report.creator_orders),
    gmv: Number(report.gmv),
    progress_notes: report.progress_notes,
    blockers: report.blockers,
    next_plan: report.next_plan,
  };
}

function getMonthBounds(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const endDate = new Date(year, monthNumber, 0);
  const end = `${year}-${String(monthNumber).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`;
  return { start: `${month}-01`, end };
}

function getLocalDate() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatMoney(value: number | string) {
  return new Intl.NumberFormat("zh-CN", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(Number(value || 0));
}

function getReportErrorMessage(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code?: unknown }).code || "") : "";
  const message = error instanceof Error ? error.message : typeof error === "object" && error && "message" in error ? String((error as { message?: unknown }).message || "") : String(error || "");
  const normalizedMessage = message.toLowerCase();
  if (code === "42501" || normalizedMessage.includes("row-level security")) {
    return "BD 报表保存失败：当前账号没有写入权限，请检查 bd_daily_reports RLS 策略。";
  }
  if (
    code === "42P01" ||
    code === "PGRST205" ||
    normalizedMessage.includes("could not find the table") ||
    normalizedMessage.includes("relation \"public.bd_daily_reports\" does not exist")
  ) {
    return "BD 报表表尚未创建，请先在 Supabase SQL Editor 执行 create_bd_daily_reports 迁移。";
  }
  return message ? `BD 报表操作失败：${message}` : "BD 报表操作失败，请稍后重试。";
}
