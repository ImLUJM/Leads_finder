# International Leads Finder

一个面向国际市场的公开 leads 搜寻产品 MVP。它遵循你给的 SOP：以搜索引擎驱动公开线索发现，不深爬 Facebook，不依赖站内搜索，而是通过 Brave Search 找公开 Facebook / Instagram 结果，再做号码抽取、结构化清洗、去重、分层结果输出。

## 这版已经包含什么

- 后端搜索接口
  - 根据 `搜索词 + site + 区号` 自动生成查询
  - 支持 `facebook.com` 和 `instagram.com`
  - Brave 预探测、顺序执行、基础限流处理
- 结构化清洗
  - 从 `title + description + extra snippets` 抽手机号和邮箱
  - 号码标准化
  - `broad / refined` 两阶段质量分层
  - URL + phone 去重
- 数据入库
  - Supabase `jobs / events / leads` 三张核心表
  - 支持把搜索词、平台、号码、摘要、标题、创建时间持久化
- 业务前端
  - 搜索表单
  - 结构化进度面板
  - 任务日志流
  - leads 表格和 CSV 导出
- 部署准备
  - `Dockerfile`
  - `.env.example`
  - Supabase migration
  - Railway / Zeabur 可直接使用 Docker 部署

## 目录结构

```text
.
├─ public/
├─ src/
├─ supabase/migrations/
├─ server.js
├─ Dockerfile
└─ package.json
```

## 数据库设计

Supabase migration 在：

- [supabase/migrations/20260514_create_lead_search_tables.sql](./supabase/migrations/20260514_create_lead_search_tables.sql)

核心表：

1. `lead_search_jobs`
   - 保存一次任务的输入、query plan、状态、进度、统计和错误信息。
2. `lead_search_job_events`
   - 保存结构化进度事件，前端可以实时展示。
3. `leads`
   - 保存最终线索，核心字段包括：
   - `query_text`
   - `platform`
   - `phone`
   - `summary`
   - `title`
   - `created_at`
   - 另外还保留了 `matched_queries / matched_keywords / quality_tier / confidence / raw_result` 方便后续 refined 清洗。

## 环境变量

复制 `.env.example` 后填值：

```bash
PORT=3000
APP_BASE_URL=http://localhost:3000
BRAVE_API_KEY=your_brave_key
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
DEFAULT_BRAVE_COUNTRY=US
DEFAULT_SEARCH_LANG=en
```

说明：

- `BRAVE_API_KEY` 不填，前端可以打开，但无法真正搜索。
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` 不填，系统会退化成内存 demo 模式，方便先看 UI 和流程。

## 本地启动

这套实现是零依赖 Node 服务，不需要安装第三方包。

```bash
node server.js
```

然后打开：

- `http://localhost:3000`

## 接口概览

- `GET /api/health`
- `GET /api/options`
- `POST /api/jobs`
- `GET /api/jobs/:id`
- `GET /api/jobs/:id/events`
- `GET /api/jobs/:id/leads`
- `GET /api/jobs/:id/stream`
- `POST /api/jobs/:id/cancel`
- `GET /api/jobs/:id/export.csv`

## 前端交互说明

1. 输入搜索词、区号、国家、城市、行业组、池类型。
2. 选择平台 `Facebook / Instagram`。
3. 点击“开始抓取”。
4. 前端会展示：
   - Query Preview
   - 当前状态
   - 完成查询数
   - leads 总数
   - refined 数
   - 实时任务日志
5. 执行完成后可导出全部 CSV 或 refined CSV。

## 部署到 GitHub

当前本地仓库还没有远程地址。你可以这样推：

```bash
git add .
git commit -m "feat: add international leads finder MVP"
git remote add origin <your-github-repo-url>
git push -u origin master
```

如果你想改成 `main` 分支，先在本地改默认分支再 push。

## 部署到 Railway

Railway 官方文档说明，仓库根目录存在 `Dockerfile` 时会优先使用它构建；如果 Dockerfile 不在根目录，可以通过 `RAILWAY_DOCKERFILE_PATH` 指定路径。

这套项目直接满足默认根目录 Dockerfile 约定。

步骤：

1. 把代码推到 GitHub。
2. 在 Railway 新建项目并连接 GitHub 仓库。
3. 配置环境变量：
   - `BRAVE_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `APP_BASE_URL`
4. 部署完成后访问分配域名即可。

官方参考：

- [Railway Dockerfiles](https://docs.railway.com/builds/dockerfiles)

## 部署到 Zeabur

Zeabur 官方文档说明，项目根目录存在 `Dockerfile` 时会自动用 Docker 部署；如果是多 Dockerfile 或 monorepo，可以用 `ZBPACK_DOCKERFILE_NAME` 或 `ZBPACK_DOCKERFILE_PATH` 指定。

这套项目也可以直接用根目录 `Dockerfile`。

步骤：

1. 把代码推到 GitHub。
2. 在 Zeabur 创建 Service 并连接 GitHub 仓库。
3. 配置环境变量：
   - `BRAVE_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `APP_BASE_URL`
4. 等待构建完成。

官方参考：

- [Zeabur Dockerfile deployment](https://zeabur.com/docs/en-US/deploy/methods/dockerfile)

## Brave API 说明

当前实现使用 Brave 官方文档里的 Web Search endpoint：

- `https://api.search.brave.com/res/v1/web/search`

请求头使用：

- `X-Subscription-Token`

官方参考：

- [Brave Search API](https://brave.com/search/api/)

## 后续最值得补的两件事

1. 增加 `query -> raw result` 落盘或落表，做真正可审计回放。
2. 加一个 browser verification worker，只对低置信度线索做二次页面核验，而不是全量打开页面。
