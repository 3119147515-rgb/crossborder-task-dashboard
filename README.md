# 跨境电商多平台任务推进系统

用于管理 TikTok、Amazon、独立站三个渠道的运营推进进度。技术栈：Next.js、TypeScript、Tailwind CSS、Supabase Auth、Supabase Database、shadcn/ui 风格组件、Vercel。

## 1. 创建 Next.js 项目

```bash
npx create-next-app@latest crossborder-task-system --yes --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --turbopack --use-npm
```

## 2. 安装依赖

```bash
npm install @supabase/supabase-js @supabase/ssr lucide-react clsx tailwind-merge class-variance-authority @radix-ui/react-dialog @radix-ui/react-label @radix-ui/react-select @radix-ui/react-tabs @radix-ui/react-alert-dialog @radix-ui/react-checkbox @radix-ui/react-progress @radix-ui/react-dropdown-menu
```

如需按官方 CLI 初始化 shadcn/ui：

```bash
npx shadcn@latest init
npx shadcn@latest add button card input textarea select dialog table badge progress tabs dropdown-menu alert checkbox label
```

## 3. Supabase 建表

1. 打开 Supabase Dashboard。
2. 进入 SQL Editor。
3. 执行 `supabase/schema.sql`。
4. 该 SQL 包含 `tasks` 表、字段约束、`updated_at` trigger、索引、RLS、`authenticated` 权限和 24 条示例数据。

## 4. Supabase Auth 配置

1. Authentication → Providers → 启用 Email。
2. 本地开发可先关闭 Confirm email，方便团队测试。
3. 生产环境建议开启 Confirm email。
4. Authentication → URL Configuration：
   - Site URL：本地填 `http://localhost:3000`，上线后填 Vercel 域名。
   - Redirect URLs：加入本地和 Vercel 域名。

## 5. 环境变量

复制 `.env.local.example` 为 `.env.local`：

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-publishable-or-anon-key
```

只使用 `NEXT_PUBLIC_SUPABASE_ANON_KEY`，不要把 `service_role` 放进前端项目。

## 6. 本地运行

```bash
npm run dev
```

打开 `http://localhost:3000`，注册/登录后即可新增、编辑、删除和更新任务。

## 7. 推送到 GitHub

```bash
git init
git add .
git commit -m "Build crossborder ecommerce task system"
git branch -M main
git remote add origin git@github.com:YOUR_ORG/crossborder-task-system.git
git push -u origin main
```

## 8. 部署到 Vercel

1. Vercel → Add New Project → Import GitHub repo。
2. Framework 选择 Next.js。
3. 添加环境变量：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy。
5. 把部署域名加回 Supabase Auth 的 Site URL / Redirect URLs。

## 9. 邀请团队成员

1. 团队成员打开系统域名。
2. 使用邮箱注册账号。
3. 如果开启邮箱确认，需要先点击确认邮件。
4. 登录后所有成员可以查看、新增、编辑、删除全部任务。

## 10. 后续按负责人角色限制编辑

当前策略是所有登录用户都可协作编辑。后续可新增 `profiles` 表存储用户角色：

```sql
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('总项目负责人', 'TikTok运营', 'Amazon运营', 'BD', '产品研发', '剪辑', '项目协同')),
  is_admin boolean not null default false
);
```

然后把 `tasks` 的 update/delete policy 改成：管理员可改全部，普通成员只能改与自己 `profiles.role` 一致的任务。`supabase/schema.sql` 底部已预留示例策略写法。
如果线上 `tasks.role` 仍有旧 check constraint，请先在 Supabase SQL Editor 手动执行 `supabase/migrations/update-team-roles.sql`，只更新约束和现有任务的 role/owner 映射，不会删除任务。

## 功能范围

- Supabase Auth 邮箱登录/退出
- Supabase `tasks` 表真实持久化
- 新增、编辑、删除任务
- 快速更新状态、进度、最新进展、卡点、下一步动作
- 平台/角色/负责人/模块/阶段/状态/优先级/截止时间/搜索筛选
- 逾期、本周到期、有卡点、高优先级快捷筛选
- 按平台分组、按具体负责人分组
- Dashboard、平台统计、平台重点看板
