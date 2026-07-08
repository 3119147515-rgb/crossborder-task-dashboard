import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/form";
import { businessModulesByPlatform, platforms, priorities, roles, stages, statuses, type FiltersState, type Task } from "@/types/task";

export const defaultFilters: FiltersState = {
  platform: "全部",
  role: "全部",
  owner: "",
  businessModule: "全部",
  stage: "全部",
  status: "全部",
  priority: "全部",
  due: "全部",
  search: "",
  sortBy: "due_date",
};

export function Filters({
  filters,
  setFilters,
  tasks,
}: {
  filters: FiltersState;
  setFilters: (filters: FiltersState) => void;
  tasks: Task[];
}) {
  const owners = Array.from(new Set(tasks.map((task) => task.owner).filter(Boolean)));
  const moduleOptions =
    filters.platform === "全部"
      ? Object.values(businessModulesByPlatform).flat()
      : businessModulesByPlatform[filters.platform];

  function patch(next: Partial<FiltersState>) {
    setFilters({ ...filters, ...next });
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-8">
        <div>
          <Label>平台</Label>
          <Select value={filters.platform} onChange={(event) => patch({ platform: event.target.value as FiltersState["platform"], businessModule: "全部" })}>
            <option>全部</option>
            {platforms.map((item) => <option key={item}>{item}</option>)}
          </Select>
        </div>
        <div>
          <Label>负责人角色</Label>
          <Select value={filters.role} onChange={(event) => patch({ role: event.target.value as FiltersState["role"] })}>
            <option>全部</option>
            {roles.map((item) => <option key={item}>{item}</option>)}
          </Select>
        </div>
        <div>
          <Label>具体负责人</Label>
          <Select value={filters.owner || "全部"} onChange={(event) => patch({ owner: event.target.value === "全部" ? "" : event.target.value })}>
            <option>全部</option>
            {owners.map((item) => <option key={item}>{item}</option>)}
          </Select>
        </div>
        <div>
          <Label>业务模块</Label>
          <Select value={filters.businessModule} onChange={(event) => patch({ businessModule: event.target.value })}>
            <option>全部</option>
            {moduleOptions.map((item) => <option key={item}>{item}</option>)}
          </Select>
        </div>
        <div>
          <Label>项目阶段</Label>
          <Select value={filters.stage} onChange={(event) => patch({ stage: event.target.value as FiltersState["stage"] })}>
            <option>全部</option>
            {stages.map((item) => <option key={item}>{item}</option>)}
          </Select>
        </div>
        <div>
          <Label>状态</Label>
          <Select value={filters.status} onChange={(event) => patch({ status: event.target.value as FiltersState["status"] })}>
            <option>全部</option>
            {statuses.map((item) => <option key={item}>{item}</option>)}
          </Select>
        </div>
        <div>
          <Label>优先级</Label>
          <Select value={filters.priority} onChange={(event) => patch({ priority: event.target.value as FiltersState["priority"] })}>
            <option>全部</option>
            {priorities.map((item) => <option key={item}>{item}</option>)}
          </Select>
        </div>
        <div>
          <Label>排序</Label>
          <Select value={filters.sortBy} onChange={(event) => patch({ sortBy: event.target.value as FiltersState["sortBy"] })}>
            <option value="due_date">按截止时间</option>
            <option value="updated_at">按最后更新</option>
          </Select>
        </div>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
        <Input value={filters.search} onChange={(event) => patch({ search: event.target.value })} placeholder="搜索任务名称、说明、最新进展、卡点" />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => patch({ due: "逾期" })}>逾期</Button>
          <Button variant="outline" size="sm" onClick={() => patch({ due: "本周到期" })}>本周到期</Button>
          <Button variant="outline" size="sm" onClick={() => patch({ businessModule: "全部", search: "blocker:true" })}>有卡点</Button>
          <Button variant="outline" size="sm" onClick={() => patch({ priority: "高" })}>高优先级</Button>
          <Button variant="ghost" size="sm" onClick={() => setFilters(defaultFilters)}>
            <RotateCcw className="h-4 w-4" />
            清空
          </Button>
        </div>
      </div>
    </div>
  );
}
