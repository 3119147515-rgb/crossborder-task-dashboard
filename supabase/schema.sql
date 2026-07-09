create extension if not exists pgcrypto;

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('TikTok', 'Amazon', '独立站')),
  role text not null check (role in ('总项目负责人', 'TikTok运营', 'Amazon运营', 'BD', '产品研发', '剪辑', '项目协同')),
  owner text not null check (length(trim(owner)) > 0),
  task_name text not null check (length(trim(task_name)) > 0),
  description text,
  business_module text not null,
  priority text not null default '中' check (priority in ('高', '中', '低')),
  status text not null default '未开始' check (status in ('未开始', '进行中', '待确认', '已完成', '已暂停')),
  progress integer not null default 0 check (progress >= 0 and progress <= 100),
  project_stage text not null check (project_stage in ('选品阶段', '店铺搭建', 'Listing/页面准备', '内容素材准备', '达人/渠道拓展', '上线前检查', '冷启动', '投放测试', '放量增长', '优化复盘')),
  ecommerce_goal text not null check (ecommerce_goal in ('完成上线', '增加曝光', '增加流量', '提升转化率', '提升客单价', '降低获客成本', '提升 ROAS', '增加 Review', '增加达人合作', '打通履约', '降低退款率', '收集用户反馈')),
  start_date date,
  due_date date,
  completed_at timestamptz,
  latest_update text,
  blocker text,
  next_action text,
  expected_result text,
  actual_result text,
  resource_needed text,
  kpi_metric text check (kpi_metric is null or kpi_metric in ('GMV', '订单数', 'CVR', 'CTR', 'CPA', 'CPC', 'CPM', 'ROAS', 'AOV', 'Review 数', '达人回复率', '达人出单数', '视频播放量', '直播成交额', '库存周转', '退款率')),
  target_value text,
  current_value text,
  result_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_business_module_by_platform check (
    (platform = 'TikTok' and business_module in ('TikTok Shop 店铺配置', '短视频内容', '达人建联', '样品寄送', '直播', 'TikTok 广告', '素材测试', '内容复盘', '店铺活动', '订单履约', '售后评价', '联盟营销'))
    or
    (platform = 'Amazon' and business_module in ('Listing 优化', '关键词调研', '主图/视频', 'A+ 页面', 'Review 获取', 'PPC 广告', 'FBA 库存', '竞品分析', 'Coupon/Deal', 'QA 问答', '转化率优化', '数据复盘'))
    or
    (platform = '独立站' and business_module in ('Shopify 建站', '商品详情页', '品牌故事页', '支付/物流', 'SEO', 'EDM 邮件', '广告落地页', 'Meta 广告', 'TikTok 广告', '评论/UGC', '转化率优化', '数据复盘'))
  )
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  if new.status = '已完成' and new.completed_at is null then
    new.completed_at = now();
  end if;
  if new.status <> '已完成' and new.progress < 100 then
    new.completed_at = null;
  end if;
  return new;
end;
$$;

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
before update on public.tasks
for each row
execute function public.set_updated_at();

create index if not exists tasks_platform_idx on public.tasks(platform);
create index if not exists tasks_role_idx on public.tasks(role);
create index if not exists tasks_owner_idx on public.tasks(owner);
create index if not exists tasks_business_module_idx on public.tasks(business_module);
create index if not exists tasks_project_stage_idx on public.tasks(project_stage);
create index if not exists tasks_status_idx on public.tasks(status);
create index if not exists tasks_priority_idx on public.tasks(priority);
create index if not exists tasks_due_date_idx on public.tasks(due_date);
create index if not exists tasks_updated_at_idx on public.tasks(updated_at desc);

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;

alter table public.tasks enable row level security;

drop policy if exists "Authenticated users can read all tasks" on public.tasks;
create policy "Authenticated users can read all tasks"
on public.tasks for select
to authenticated
using (true);

drop policy if exists "Authenticated users can insert tasks" on public.tasks;
create policy "Authenticated users can insert tasks"
on public.tasks for insert
to authenticated
with check (true);

drop policy if exists "Authenticated users can update all tasks" on public.tasks;
create policy "Authenticated users can update all tasks"
on public.tasks for update
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated users can delete tasks" on public.tasks;
create policy "Authenticated users can delete tasks"
on public.tasks for delete
to authenticated
using (true);

insert into public.tasks
(platform, role, owner, task_name, description, business_module, priority, status, progress, project_stage, ecommerce_goal, start_date, due_date, latest_update, blocker, next_action, expected_result, resource_needed, kpi_metric, target_value, current_value)
values
('TikTok', 'TikTok运营', 'TikTok运营负责人', 'TikTok Shop 店铺基础配置', '完成店铺主体、税务、收款、运费模板与商品类目配置。', 'TikTok Shop 店铺配置', '高', '进行中', 60, '店铺搭建', '完成上线', '2026-07-01', '2026-07-10', '主体资料已提交，等待类目审核。', '类目资质补充文件未齐。', '补齐美发工具类目资质并重新提交。', '店铺具备上架条件。', '供应链提供认证文件', '订单数', '店铺可接单', '审核中'),
('TikTok', 'TikTok运营', 'TikTok运营负责人', '制定卷发棒短视频内容排期', '围绕使用场景、前后对比、教程、痛点种草制定两周内容计划。', '短视频内容', '高', '进行中', 45, '内容素材准备', '增加曝光', '2026-07-02', '2026-07-12', '已完成 12 条选题。', null, '补齐脚本和拍摄分镜。', '形成 20 条可拍摄脚本。', null, '视频播放量', '20万', '0'),
('TikTok', 'BD', 'TikTok运营负责人兼BD负责人', '整理 TikTok 达人建联名单', '筛选美发、生活方式、礼物类 KOC/KOL 建联池。', '达人建联', '高', '进行中', 50, '达人/渠道拓展', '增加达人合作', '2026-07-03', '2026-07-11', '已整理 80 位达人。', null, '补充达人邮箱和报价区间。', '形成 150 位首批达人名单。', '达人数据工具', '达人回复率', '20%', '0'),
('TikTok', 'BD', 'BD01', '跟进首批样品寄送', '确认达人收件信息、样品批次和寄送状态。', '样品寄送', '高', '未开始', 10, '达人/渠道拓展', '增加达人合作', '2026-07-05', '2026-07-15', '已确认 12 个收件地址。', '样品库存需要总项目负责人确认。', '锁定首批 30 台样品。', '首批样品全部寄出。', '样品库存', '达人出单数', '10单', '0'),
('TikTok', 'BD', 'BD02', '回收达人视频素材', '跟进首批合作达人视频发布时间和原始素材回收。', '达人建联', '中', '未开始', 0, '冷启动', '增加曝光', '2026-07-12', '2026-07-25', null, null, '在样品签收后建立素材回收表。', '回收 20 条可投流素材。', null, '视频播放量', '50万', '0'),
('TikTok', '剪辑', '剪辑负责人', '测试 TikTok 广告素材', '用 3 组钩子、2 组剪辑节奏测试广告点击与转化。', 'TikTok 广告', '中', '未开始', 0, '投放测试', '提升 ROAS', '2026-07-16', '2026-07-30', null, null, '等待素材池成型后创建广告组。', '找到 CTR 高于 1.5% 的素材。', '广告预算', 'CTR', '1.5%', '0'),
('TikTok', 'TikTok运营', 'TikTok运营助理', '复盘短视频播放和转化数据', '按选题、钩子、完播率、商品点击率复盘自然内容。', '内容复盘', '中', '未开始', 0, '优化复盘', '提升转化率', '2026-07-20', '2026-08-02', null, null, '汇总前两周发布数据。', '输出下轮内容优化方向。', null, 'CVR', '3%', '0'),
('TikTok', 'TikTok运营', 'TikTok运营负责人', '规划 TikTok 直播脚本', '设计直播流程、核心卖点、福利节奏和 FAQ 话术。', '直播', '中', '待确认', 30, '冷启动', '增加流量', '2026-07-07', '2026-07-18', '初版脚本已完成。', null, '确认主播和直播间设备。', '完成首场直播准备。', '主播排期', '直播成交额', '$1000', '0'),
('Amazon', 'Amazon运营', 'Amazon运营负责人', '优化卷发棒 Amazon Listing 标题', '按核心关键词、卖点和字符长度重写标题。', 'Listing 优化', '高', '进行中', 70, 'Listing/页面准备', '提升转化率', '2026-07-01', '2026-07-09', '标题和五点描述已出第一版。', null, '提交合规词检查。', 'Listing 可进入上架审核。', null, 'CVR', '12%', '0'),
('Amazon', 'Amazon运营', 'Amazon运营负责人', '整理核心关键词和长尾词', '覆盖卷发棒、负离子、旅行便携、礼物等词根。', '关键词调研', '高', '已完成', 100, 'Listing/页面准备', '增加流量', '2026-06-28', '2026-07-06', '关键词表已完成并同步广告结构。', null, '每周根据搜索词报告更新。', '建立关键词分层表。', null, 'CTR', '0.6%', '0.8%'),
('Amazon', 'Amazon运营', 'Amazon运营负责人', '优化主图和 A+ 页面', '协调设计完成主图、场景图、对比图和 A+ 模块。', '主图/视频', '高', '进行中', 55, 'Listing/页面准备', '提升转化率', '2026-07-02', '2026-07-14', '主图拍摄完成，A+ 文案待确认。', '缺少美模使用场景素材。', '安排补拍并整理对比卖点。', '完成可上传素材包。', '摄影资源', 'CVR', '12%', '0'),
('Amazon', 'Amazon运营', 'Amazon运营负责人', '检查 FBA 入仓计划', '核对箱规、标签、货件计划和预计到仓时间。', 'FBA 库存', '高', '进行中', 40, '上线前检查', '打通履约', '2026-07-04', '2026-07-16', '箱规已确认。', null, '创建货件并确认头程费用。', '首批库存按时入仓。', '货代报价', '库存周转', '45天', '0'),
('Amazon', 'Amazon运营', 'Amazon运营负责人', '制定 PPC 广告测试计划', '按自动、精准、词组、竞品 ASIN 建广告结构。', 'PPC 广告', '中', '未开始', 0, '投放测试', '降低获客成本', '2026-07-15', '2026-07-24', null, null, '等待 Listing 上线后创建广告活动。', '完成首轮 7 天广告测试。', '广告预算', 'CPA', '$12', '0'),
('Amazon', 'Amazon运营', 'Amazon运营负责人', '跟进首批 Review 获取', '规划 Vine、售后邮件和外部测评合规路径。', 'Review 获取', '中', '待确认', 25, '冷启动', '增加 Review', '2026-07-09', '2026-07-22', 'Vine 方案已列出成本。', '需要确认是否开通 Vine。', '评估预算后确定路径。', '首批 Review 达到 10 个。', 'Review 预算', 'Review 数', '10', '0'),
('Amazon', 'Amazon运营', 'Amazon运营负责人', '分析竞品价格和卖点', '跟踪 Top 20 竞品价格、评分、图片、Coupon 和卖点表达。', '竞品分析', '中', '进行中', 65, '选品阶段', '提升转化率', '2026-07-01', '2026-07-13', '已完成 12 个竞品拆解。', null, '补充差评关键词分析。', '输出定价和卖点建议。', null, 'AOV', '$39.99', '$0'),
('Amazon', 'Amazon运营', 'Amazon运营负责人', '复盘 Amazon 转化率数据', '上线后按 sessions、CVR、广告词和 Review 变化复盘。', '数据复盘', '低', '未开始', 0, '优化复盘', '提升转化率', '2026-08-01', '2026-08-08', null, null, '上线一周后拉取业务报告。', '形成下一轮 Listing 优化清单。', null, 'CVR', '12%', '0'),
('独立站', '项目协同', '总项目负责人', '完成 Shopify 基础配置', '完成主题、域名、收款、配送、税费和基础插件配置。', 'Shopify 建站', '高', '进行中', 75, '店铺搭建', '完成上线', '2026-07-01', '2026-07-09', '域名和主题已配置。', null, '完成支付测试和运费模板。', '独立站可进入测试下单。', '支付账号', '订单数', '可测试下单', '配置中'),
('独立站', '项目协同', '总项目负责人', '优化卷发棒商品详情页', '优化首屏卖点、图文结构、对比模块和 FAQ。', '商品详情页', '高', '进行中', 60, 'Listing/页面准备', '提升转化率', '2026-07-03', '2026-07-12', '商品页首屏已重排。', null, '补充真人使用前后对比图。', '商品页 CVR 达到测试标准。', '素材图片', 'CVR', '2.5%', '0'),
('独立站', '项目协同', '总项目负责人', '完成品牌故事页面', '突出美发工具品牌定位、使用场景和产品理念。', '品牌故事页', '中', '待确认', 80, 'Listing/页面准备', '提升转化率', '2026-07-02', '2026-07-10', '页面文案完成，等待品牌语气确认。', null, '确认品牌主张后上线。', '品牌页上线。', null, 'CVR', '辅助转化', '待上线'),
('独立站', '项目协同', '总项目负责人', '配置支付和物流', '配置 Stripe/PayPal、物流区域、运费规则和订单通知。', '支付/物流', '高', '进行中', 50, '上线前检查', '打通履约', '2026-07-04', '2026-07-11', 'PayPal 已接入。', 'Stripe 账户验证中。', '完成 Stripe 验证并跑通测试订单。', '支付物流全链路可用。', 'Stripe 资料', '订单数', '测试订单成功', '0'),
('独立站', '项目协同', 'TikTok运营助理', '建立 FAQ 页面', '覆盖卷发棒使用、安全、发质适配、配送、退换货问题。', '商品详情页', '中', '未开始', 0, '上线前检查', '降低退款率', '2026-07-10', '2026-07-17', null, null, '整理客服常见问题并上线 FAQ。', '降低售前咨询重复问题。', null, '退款率', '<3%', '0'),
('独立站', '项目协同', '总项目负责人', '配置 EDM 邮件营销', '配置欢迎邮件、弃购挽回、下单确认和复购邮件。', 'EDM 邮件', '中', '未开始', 0, '冷启动', '提升客单价', '2026-07-13', '2026-07-26', null, null, '选择邮件工具并制作模板。', '完成 4 条自动化邮件流。', '邮件工具账号', 'AOV', '$45', '0'),
('独立站', '剪辑', '剪辑负责人', '搭建广告落地页', '为 Meta/TikTok 广告制作单品落地页，突出痛点和社证。', '广告落地页', '高', '未开始', 0, '投放测试', '提升 ROAS', '2026-07-16', '2026-07-29', null, null, '确定首批投放角度和页面结构。', '落地页可用于广告测试。', '设计支持', 'ROAS', '2.0', '0'),
('独立站', '项目协同', '总项目负责人', '复盘独立站首批订单数据', '分析首批订单来源、转化路径、客单价、退款原因和页面热区。', '数据复盘', '低', '未开始', 0, '优化复盘', '收集用户反馈', '2026-08-01', '2026-08-10', null, null, '首批订单达到 30 单后复盘。', '输出独立站优化路线图。', null, 'GMV', '$1500', '$0')
on conflict do nothing;

-- Future role-restricted RLS idea:
-- 1. Add a profiles table: user_id uuid references auth.users primary key, role text, is_admin boolean.
-- 2. Replace update/delete policies with:
--    using (
--      exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and (p.is_admin or p.role = tasks.role))
--    )
--    with check (
--      exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and (p.is_admin or p.role = tasks.role))
--    );
