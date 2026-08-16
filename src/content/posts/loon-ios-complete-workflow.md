---
title: "Loon iOS 完整使用指南：插件系统与 MitM 脚本实操"
description: "iOS / iPadOS 平台高级网络调试与代理神器 Loon 深度实战：插件化架构、MitM 证书签发、JavaScript 脚本覆写与多端策略组全流程。"
pubDate: 2026-08-13
updatedDate: 2026-08-16
category: "clients"
categoryName: "客户端教程"
tags: ["Loon", "iOS客户端", "插件系统", "MitM", "脚本自动化", "客户端教程"]
author: "机场指南编辑部"
featured: false
draft: false
difficulty: "Intermediate"
readingTime: "17 MIN READ"
badge: "IOS POWERHOUSE"
related: ["shadowrocket-ios-setup", "stash-app-clash-ecosystem", "surge-mac-ios-advanced", "boxjs-session-automation"]
keyProblems: [
  "Loon 相比传统小火箭在现代化 UI 设计与轻量化插件生态上的优势",
  "如何一键订阅 GitHub 社区的优质去广告与签到插件（.plugin）",
  "HTTPS 解密 (MitM) 证书在 iPhone 与 iPad 上的完整信任流",
  "与 BoxJS 联动实现全自动日常签到与会员资产管理"
]
faq: [
  {
    q: "为什么很多人称 Loon 是 iOS 上 Surge 的最佳高性价比替代品？",
    a: "Surge iOS 售价高达 $49.99 美元且每年需要支付订阅更新费；而 Loon 售价仅约 $5.99 美元（买断制），却拥有几乎与 Surge 匹敌的现代 UI、强大的插件生态、完善的 JavaScript 脚本支持与跨设备 iCloud 自动同步功能。"
  },
  {
    q: "安装 Loon 插件后为什么某些网页报错提示证书不可信？",
    a: "这通常是因为没有在 iOS 系统底层将 Loon 生成的自签名 CA 证书开启「完全信任」。请进入 iPhone 设置 ->「通用」->「关于本机」->「证书信任设置」中手动开启信任开关。"
  }
]
---

## 01. 认识 Loon：优雅与强大并存的苹果生态网络工具

在 iOS 与 iPadOS 代理工具生态中，**Loon**（售价约 $5.99 美元）被公认为“最符合现代苹果设计语言的高级网络工具”。

它不仅拥有极低功耗的底层网络接管能力，更开创性地推出了 **模块化插件系统（Plugin Architecture）**，彻底告别了早年手动编写上千行配置文本的繁琐历史，让普通用户通过点击链接即可一键安装社区成熟的去广告、规则重写与自动化脚本：

```text
┌────────────────────────────────────────────────────────────────────────┐
│                          Loon 核心生态矩阵架构                         │
├────────────────────────────────────────────────────────────────────────┤
│  ① 模块化插件系统 (.plugin) ──> 一键安装去广告、界面美化与功能增强模块  │
│  ② JavaScript 脚本执行引擎  ──> 支持 HTTP 请求修改、响应 Body 重写与定时│
│  ③ 策略组与负载均衡         ──> 智能 URL-Test 自动优选、回退与多节点分流 │
│  ④ 跨设备 iCloud 无缝同步   ──> iPhone、iPad、Apple TV、Mac 配置秒级漫游│
└────────────────────────────────────────────────────────────────────────┘
```

---

## 02. 基础配置：节点订阅导入与分流策略组建立

1. **导入节点订阅**：
   - 打开 Loon，进入底部 **「配置」** -> 点击「订阅 (Subscription)」-> 点击右上角「+」号；
   - 粘贴从 [光速云](/airports/)、[SOGO 云](/airports/) 复制的 Loon / Clash 订阅链接，勾选「自动更新」。
2. **创建智能策略组**：
   - 进入「策略组 (Policy)」管理，新建一个 `自动优选` 策略组，类型选择 `URL-Test`；
   - 将机场的香港与日本专线节点勾选加入，测试 URL 设为 `http://www.gstatic.com/generate_204`，Loon 会自动在后台挑选当前响应最快的专线进行流量转发。

---

## 03. 核心杀手锏：一键安装与管理插件（Plugin）

Loon 的插件将规则（Rule）、重写（Rewrite）、脚本（Script）与 MitM 配置打包为一个 `.plugin` 链接：

### 常用高分插件安装实操：
1. 在浏览器或 Telegram 频道中复制社区插件链接（例如 `https://raw.githubusercontent.com/.../adblock.plugin`）；
2. 打开 Loon -> 进入「插件 (Plugin)」页面 -> 点击右上角「+」号 -> 粘贴链接并点击下载；
3. 插件会自动解析并加载所有的广告拦截规则与脚本，无需重启客户端即可实时生效！

---

## 04. HTTPS 解密（MitM）证书签发与全流程信任

为了让插件能够解密修改 HTTPS 数据包（如去除 App 内部的开屏广告或注入签到脚本），必须正确配置本地根证书：

```text
【Loon CA 证书信任标准四步法】
① Loon 界面：进入「配置」->「证书管理」-> 点击「生成新的 CA 证书」
② 描述文件下载：点击「安装证书」-> 允许 Safari 浏览器下载描述文件
③ 系统安装：进入 iPhone「设置」-> 顶部提示「已下载描述文件」-> 点击「安装」
④ 底层完全信任：进入 iPhone「设置」->「通用」->「关于本机」->「证书信任设置」-> 开启 Loon 根证书信任！
```

---

## 05. 进阶联动：配合 BoxJS 实现全自动签到

Loon 深度支持本地 Web 容器交互。通过在 Loon 中加载 BoxJS 插件，打开 Safari 浏览器访问 `http://boxjs.com`，即可进入可视化的会话管理控制台，一键订阅各大平台的日常自动签到与福利脚本，详情请参阅 [BoxJS 本地会话管理与脚本自动化应用全解析](/articles/boxjs-session-automation/)。

更多苹果全平台网络进阶教程，欢迎查阅 [Stash 苹果全平台配置指南](/articles/stash-app-clash-ecosystem/) 与 [Surge 高级分流教程](/articles/surge-mac-ios-advanced/)。
