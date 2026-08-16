# 机场指南 (FluxGrid Theme)

> **定位**：数字杂志 × 专业知识库 × 微型数据终端 × 动态卡片博客  
> **官方域名**：`https://jichangzhinan.co`  
> **主题代号**：`FluxGrid` (流光轨迹)  
> **技术架构**：Astro Static SSG + Pagefind + Vanilla JS + CSS Variables

---

## ✦ Site DNA 视觉系统

- **流光轨迹**：极淡的环境轨迹线 (`OrbitLines.astro`) 与移动发光节点 (`GlowNode.astro`)。
- **数据终端排版**：低饱和科技配色（80% 深黑灰 + 8% 翠绿 + 7% 冰蓝 + 5% 紫罗兰），无廉价霓虹泛滥。
- **非规则卡片矩阵**：提供 6 种以上互不相同的卡片设计（`FeatureCard`、`ImageCard`、`SignalCard`、`NumberCard`、`TopicCard`、`HorizontalCard`、`ToolCard`）。
- **无依赖轻交互**：纯 Vanilla JS 实现卡片鼠标微光追踪 (`--mouse-x`, `--mouse-y`)、滚动渐显 (`IntersectionObserver`) 与阅读进度条。

---

## ✦ 项目目录结构

```text
/
├── public/
│   ├── .htaccess             # Apache 高性能伪静态、HTTPS跳转、安全头与缓存配置
│   ├── favicon.svg           # Site DNA 轨迹发光节点矢量图标
│   └── robots.txt            # 搜索引擎爬虫规范与 Sitemap 引导
│
├── src/
│   ├── components/
│   │   ├── article/          # 文章页组件 (TOC, Meta, Navigation, Related, Progress)
│   │   ├── cards/            # 6+ 种原创卡片组件
│   │   ├── hero/             # 首屏大型 Hero, LiveStats, Ticker
│   │   ├── layout/           # Header, Footer, MobileNav, GridBackground, SEOHead
│   │   ├── search/           # Pagefind Command Palette 快捷搜索模态框
│   │   └── ui/               # Badge, Button, Callout, Divider, GlowNode, OrbitLines
│   │
│   ├── config/
│   │   └── site.ts           # 品牌独立配置文件（换皮只需修改此处）
│   │
│   ├── content/
│   │   └── posts/            # 真实专业技术文章与知识库 Markdown
│   │
│   ├── data/                 # 结构化解耦数据 (topics.ts, tools.ts, navigation.ts)
│   ├── layouts/              # BaseLayout, ArticleLayout
│   ├── pages/                # 首页、文章动态页、专题分类、教程、工具箱、归档、关于、404、RSS
│   ├── styles/               # CSS Variables, Typography, Motion, Global
│   └── content.config.ts     # Astro v5 Content Collections 强类型模式定义
│
├── astro.config.mjs          # Astro 静态构建、Sitemap 与 MDX 配置
├── package.json              # 依赖管理与构建脚本 (astro build && pagefind)
└── tsconfig.json             # TypeScript 配置
```

---

## ✦ 本地开发与构建

### 1. 安装依赖
```bash
npm install
```

### 2. 启动本地开发服务器
```bash
npm run dev
```

### 3. 执行生产构建与 Pagefind 静态索引
```bash
npm run build
```
该命令会自动生成静态页面至 `dist/` 目录，并在构建完成后调用 `pagefind --site dist` 完成全文检索索引建立。

### 4. 本地预览生产构建产物
```bash
npm run preview
```

---

## ✦ Apache 生产部署指南

1. **指向目录**：将 Apache Web 服务器的 `DocumentRoot` 指向项目的 `dist/` 目录。
2. **启用模块**：确保 Apache 已启用以下基础模块：
   - `mod_rewrite`（URL 伪静态与 HTTPS 强制跳转）
   - `mod_deflate`（Gzip 动态压缩）
   - `mod_expires` 与 `mod_headers`（静态资源缓存策略与安全防护头）
3. **.htaccess 自动化**：`dist/.htaccess` 文件已在打包时自动内置，提供：
   - 强制 HTTPS 301 重定向
   - 统一 www / non-www 域名
   - HTML 页面 10 分钟缓存，哈希 CSS/JS/字体 1 年强缓存
   - 点击劫持防御 (`X-Frame-Options: SAMEORIGIN`) 与 MIME 嗅探防护 (`X-Content-Type-Options: nosniff`)
   - 自定义 404 错误页自动映射至 `/404.html`

---

## ✦ 快速更换品牌

本项目所有可变品牌资产均已完全解耦：
- 修改 **网站名称、域名、Logo 与标语**：编辑 `src/config/site.ts`
- 修改 **专题大类与学习路径**：编辑 `src/data/topics.ts`
- 修改 **收录软件与工具箱数据**：编辑 `src/data/tools.ts`
- 修改 **导航栏与页脚链接**：编辑 `src/data/navigation.ts`
- 修改 **全局色彩与圆角**：编辑 `src/styles/variables.css`
