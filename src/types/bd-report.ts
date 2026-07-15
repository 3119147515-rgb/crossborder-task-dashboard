export interface BdDailyReport {
  id: string;
  report_date: string;
  member_code: string;
  creators_contacted: number;
  valid_replies: number;
  connections_created: number;
  samples_sent: number;
  videos_published: number;
  collaborations_created: number;
  creator_orders: number;
  gmv: number | string;
  progress_notes: string | null;
  blockers: string | null;
  next_plan: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type BdDailyReportInput = Omit<BdDailyReport, "id" | "created_by" | "created_at" | "updated_at">;

export const bdMetricFields = [
  "creators_contacted",
  "valid_replies",
  "connections_created",
  "samples_sent",
  "videos_published",
  "collaborations_created",
  "creator_orders",
  "gmv",
] as const;

export type BdMetricField = (typeof bdMetricFields)[number];
