---
title: "BoxJS 本地会话管理与脚本自动化应用全解析"
description: "苹果生态与前端自动化利器 BoxJS 深度教程：本地 Web 控制台搭建、Cookie 自动捕获持久化、定时任务 (Cron) 编排与多平台脚本联动实战。"
pubDate: 2026-08-11
updatedDate: 2026-08-16
category: "scenarios"
categoryName: "场景方案"
tags: ["BoxJS", "自动化脚本", "Cookie管理", "Loon", "QuantumultX", "Surge", "场景专用"]
author: "机场指南编辑部"
featured: false
draft: false
difficulty: "Advanced"
readingTime: "17 MIN READ"
badge: "AUTOMATION ENGINE"
related: ["loon-ios-complete-workflow", "quantumult-x-rewrite-rules", "surge-mac-ios-advanced", "stash-app-clash-ecosystem"]
keyProblems: [
  "为什么手动修改脚本中的 Cookie 与 Token 既繁琐又存在频繁失效的痛点",
  "BoxJS 虚拟 Web 容器如何利用本地 `127.0.0.1` 存储接管全量自动化脚本的会话数据",
  "Loon、Quantumult X 与 Surge 接入 BoxJS 官方订阅与应用库的标准工作流",
  "定时任务（Cron Expressions）的编写与自动化签到状态推送"
]
faq: [
  {
    q: "什么是 BoxJS？它能为日常上网带来什么颠覆性便利？",
    a: "BoxJS 是一个运行在代理客户端（Loon、Surge、圈 X）内部的轻量化本地 Web 应用程序。它为所有 JavaScript 脚本提供了一个统一的可视化控制面板。安装后，你只需在浏览器中打开 `http://boxjs.com`，即可图形化查看、备份、编辑所有脚本获取到的登录 Cookie，并一键开启全网各大平台的每日自动签到与资产更新。"
  },
  {
    q: "为什么在 Safari 浏览器中打开 `boxjs.com` 提示打不开网页？",
    a: "因为 `boxjs.com` 是一个本地虚拟域名。必须确保你的代理软件（Loon / Surge / 圈 X）处于运行连接状态，并且已经安装加载了官方的 BoxJS 重写规则与 MitM 证书，客户端内核才能在本地拦截该域名并渲染出控制台页面。"
  }
]
---

## 01. 认识 BoxJS：脚本自动化生态的数据总线

在 iOS 与 macOS 平台上使用 **Loon**、**Quantumult X** 或 **Surge** 运行自动化脚本（如京东签到、贴吧打卡、外卖优惠券自动领取）时，传统的痛点是：用户必须手动抓包提取 Cookie，然后再手动粘贴到庞大的 JS 配置文件中。

由开发者 chavyleung 开源的 **BoxJS** 彻底解决了这一难题。它充当了全系统脚本的 **中央数据仓库与可视化管理控制台**：

```text
┌────────────────────────────────────────────────────────────────────────┐
│                          BoxJS 自动化执行生态拓扑                      │
├────────────────────────────────────────────────────────────────────────┤
│  用户在手机打开 App (如某电商平台) ──> MitM 脚本自动嗅探并保存 Cookie  │
│                                            │                           │
│                                            ▼                           │
│  [ BoxJS 本地持久化存储 (http://boxjs.com) ] <── 提供统一可视化管理控制台│
│                                            │                           │
│                                            ▼                           │
│  后台定时任务 (Cron: 0 8 * * *) ──> 读取 Cookie ──> 每天清晨自动打卡签到│
└────────────────────────────────────────────────────────────────────────┘
```

---

## 02. 在 Loon 与 Quantumult X 中一键部署 BoxJS

### 1. Loon 一键安装（最简方式）
1. 在 Safari 浏览器中复制官方插件链接：`https://raw.githubusercontent.com/chavyleung/scripts/master/box/rewrite/boxjs.rewrite.loon.plugin`；
2. 打开 **[Loon iOS 客户端](/articles/loon-ios-complete-workflow/)** -> 进入「插件」页面 -> 点击右上角「+」号 -> 粘贴并安装；
3. 打开 Safari 浏览器访问 `http://boxjs.com`，即可瞬间进入精美的 BoxJS 黑色科技感控制面板！

### 2. Quantumult X 重写规则添加
在 `[rewrite_remote]` 下追加以下链接：
```ini
https://raw.githubusercontent.com/chavyleung/scripts/master/box/rewrite/boxjs.rewrite.quanx.conf, tag=BoxJS本地控制台, update-interval=86400, opt-parser=false, enabled=true
```

---

## 03. 订阅常用应用库与自动化任务编排

进入 BoxJS 控制台后，点击底部的 **「订阅 (Sub)」** 标签页：
- 点击「+ 添加订阅」-> 粘贴社区知名作者的公共应用库链接（如 `https://raw.githubusercontent.com/.../app.json`）；
- 点击保存后，应用列表将展示出数十个常用打卡签到脚本，每个应用卡片均支持「一键清空缓存」、「手动执行一次测试」以及「自动备份到 iCloud」。

更多高级苹果生态网络工具，请参阅 [Loon iOS 完整工作流指南](/articles/loon-ios-complete-workflow/) 与 [Quantumult X 重写规则实战](/articles/quantumult-x-rewrite-rules/)。
