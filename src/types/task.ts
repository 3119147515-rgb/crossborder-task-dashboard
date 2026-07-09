export const platforms = ["TikTok", "Amazon", "独立站"] as const;
export const roles = ["总项目负责人", "TikTok运营", "Amazon运营", "BD", "产品研发", "剪辑", "项目协同"] as const;
export const legacyRoles = ["运营负责人", "项目负责人", "BD负责人"] as const;
export const owners = [
  "总项目负责人",
  "TikTok运营负责人",
  "TikTok运营负责人兼BD负责人",
  "Amazon运营负责人",
  "TikTok运营助理",
  "BD01",
  "BD02",
  "BD03",
  "BD04",
  "BD05",
  "BD06",
  "BD07",
  "BD08",
  "BD09",
  "BD10",
  "产品研发进度负责人",
  "剪辑负责人",
  "剪辑人员",
] as const;
export const ownerGroups = [
  { title: "管理层", owners: ["总项目负责人"] },
  { title: "平台运营", owners: ["TikTok运营负责人", "TikTok运营负责人兼BD负责人", "Amazon运营负责人", "TikTok运营助理"] },
  { title: "BD团队", owners: ["BD01", "BD02", "BD03", "BD04", "BD05", "BD06", "BD07", "BD08", "BD09", "BD10"] },
  { title: "产品与内容", owners: ["产品研发进度负责人", "剪辑负责人", "剪辑人员"] },
] as const;
export const ownersByRole: Record<(typeof roles)[number], readonly (typeof owners)[number][]> = {
  总项目负责人: ["总项目负责人"],
  TikTok运营: ["TikTok运营负责人", "TikTok运营负责人兼BD负责人", "TikTok运营助理"],
  Amazon运营: ["Amazon运营负责人"],
  BD: ["TikTok运营负责人兼BD负责人", "BD01", "BD02", "BD03", "BD04", "BD05", "BD06", "BD07", "BD08", "BD09", "BD10"],
  产品研发: ["产品研发进度负责人"],
  剪辑: ["剪辑负责人", "剪辑人员"],
  项目协同: ["总项目负责人", "TikTok运营负责人", "Amazon运营负责人", "产品研发进度负责人", "剪辑负责人"],
};
export const priorities = ["高", "中", "低"] as const;
export const statuses = ["未开始", "进行中", "待确认", "已完成", "已暂停"] as const;
export const stages = [
  "选品阶段",
  "店铺搭建",
  "Listing/页面准备",
  "内容素材准备",
  "达人/渠道拓展",
  "上线前检查",
  "冷启动",
  "投放测试",
  "放量增长",
  "优化复盘",
] as const;
export const goals = [
  "完成上线",
  "增加曝光",
  "增加流量",
  "提升转化率",
  "提升客单价",
  "降低获客成本",
  "提升 ROAS",
  "增加 Review",
  "增加达人合作",
  "打通履约",
  "降低退款率",
  "收集用户反馈",
] as const;
export const kpiMetrics = [
  "GMV",
  "订单数",
  "CVR",
  "CTR",
  "CPA",
  "CPC",
  "CPM",
  "ROAS",
  "AOV",
  "Review 数",
  "达人回复率",
  "达人出单数",
  "视频播放量",
  "直播成交额",
  "库存周转",
  "退款率",
] as const;

export const businessModulesByPlatform = {
  TikTok: [
    "TikTok Shop 店铺配置",
    "短视频内容",
    "达人建联",
    "样品寄送",
    "直播",
    "TikTok 广告",
    "素材测试",
    "内容复盘",
    "店铺活动",
    "订单履约",
    "售后评价",
    "联盟营销",
  ],
  Amazon: [
    "Listing 优化",
    "关键词调研",
    "主图/视频",
    "A+ 页面",
    "Review 获取",
    "PPC 广告",
    "FBA 库存",
    "竞品分析",
    "Coupon/Deal",
    "QA 问答",
    "转化率优化",
    "数据复盘",
  ],
  独立站: [
    "Shopify 建站",
    "商品详情页",
    "品牌故事页",
    "支付/物流",
    "SEO",
    "EDM 邮件",
    "广告落地页",
    "Meta 广告",
    "TikTok 广告",
    "评论/UGC",
    "转化率优化",
    "数据复盘",
  ],
} as const;

export type Platform = (typeof platforms)[number];
export type Role = (typeof roles)[number];
export type Owner = (typeof owners)[number];
export type Priority = (typeof priorities)[number];
export type TaskStatus = (typeof statuses)[number];
export type ProjectStage = (typeof stages)[number];
export type EcommerceGoal = (typeof goals)[number];
export type KpiMetric = (typeof kpiMetrics)[number];
export type BusinessModule = (typeof businessModulesByPlatform)[Platform][number];

export interface Task {
  id: string;
  platform: Platform;
  role: Role;
  owner: string;
  task_name: string;
  description: string | null;
  business_module: string;
  priority: Priority;
  status: TaskStatus;
  progress: number;
  project_stage: ProjectStage;
  ecommerce_goal: EcommerceGoal;
  start_date: string | null;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  latest_update: string | null;
  blocker: string | null;
  next_action: string | null;
  expected_result: string | null;
  actual_result: string | null;
  resource_needed: string | null;
  kpi_metric: KpiMetric | null;
  target_value: string | null;
  current_value: string | null;
  result_summary: string | null;
}

export interface TeamMember {
  id?: string;
  member_code: string;
  display_name: string | null;
  role_group: Role;
  email: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export type TaskInput = Omit<Task, "id" | "created_at" | "updated_at" | "completed_at"> & {
  completed_at?: string | null;
};

export interface FiltersState {
  platform: "全部" | Platform;
  role: "全部" | Role;
  owner: string;
  businessModule: string;
  stage: "全部" | ProjectStage;
  status: "全部" | TaskStatus;
  priority: "全部" | Priority;
  due: "全部" | "逾期" | "本周到期";
  search: string;
  sortBy: "due_date" | "updated_at";
}
