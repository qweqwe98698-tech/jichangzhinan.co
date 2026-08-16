---
title: "Stash 苹果全平台配置指南：Rule-Set 规则与覆写进阶"
description: "Apple 平台唯一 Clash 核心代表作 Stash (iOS / macOS / tvOS) 深度指南：Rule-Set 规则集引用、覆写系统与 Apple TV 客厅 4K 影音体验。"
pubDate: 2026-08-14
updatedDate: 2026-08-16
category: "clients"
categoryName: "客户端教程"
tags: ["Stash", "Clash", "AppleTV", "iOS客户端", "RuleSet", "覆写", "客户端教程"]
author: "机场指南编辑部"
featured: false
draft: false
difficulty: "Intermediate"
readingTime: "17 MIN READ"
badge: "APPLE CLASH"
related: ["loon-ios-complete-workflow", "clash-verge-rev-guide", "streaming-unlock-policy", "surge-mac-ios-advanced"]
keyProblems: [
  "为什么 Stash 是苹果生态（iPhone / iPad / Mac / Apple TV）中最完美的 Clash 协议兼容方案",
  "如何利用 Rule-Set 远程规则集实现规则的每日自动静默热更新",
  "Apple TV 4K 安装 Stash 打造客厅零卡顿原生 Netflix / YouTube 家庭影院",
  "按需连接（On-Demand）与蜂窝/Wi-Fi 自动化触发策略"
]
faq: [
  {
    q: "Stash 能直接使用机场提供的 Clash YAML 订阅链接吗？",
    a: "可以完全 100% 无缝兼容。Stash 底层原生支持 Clash 核心语法，在添加订阅时直接粘贴机场的标准 Clash 订阅链接即可自动解析所有节点与策略组。"
  },
  {
    q: "在 Apple TV 上使用 Stash 有什么巨大优势？",
    a: "Stash 专门为 tvOS 遥控器开发了原生大屏界面。安装在 Apple TV 上后，无需额外配置软路由或旁路由，即可直接接管电视机上 Netflix 4K、Disney+、YouTube 的全量网络流量并实现杜比视界秒开。"
  }
]
---

## 01. 认识 Stash：Clash 生态在 Apple 平台上的集大成者

对于习惯了在电脑端使用 Clash 规则分流、又希望在 iPhone、iPad、Mac 以及 **Apple TV 4K** 上获得完全一致体验的用户而言，**Stash**（售价约 $3.99 美元）是苹果生态中无可替代的终极利器。

Stash 原生基于 Clash 架构标准开发，不仅完美继承了 Clash 强大的规则集生态，更结合 Apple 系统的底层特性进行了深度优化：

```text
┌────────────────────────────────────────────────────────────────────────┐
│                          Stash 核心平台与技术优势                      │
├────────────────────────────────────────────────────────────────────────┤
│  ① 苹果四端同构 ──> 深度适配 iOS / iPadOS / macOS / tvOS (Apple TV)   │
│  ② 规则集原生引用 ──> 支持 Rule-Set 远程外部规则，告别手动更新规则文本 │
│  ③ 模块与覆写系统 ──> 支持使用 Stash Overrides 动态修改节点与策略组   │
│  ④ 按需连接机制   ──> 智能识别当前连接的 Wi-Fi，离开家自动开启代理      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 02. 快速入门：导入 Clash 订阅与基础设置

1. **一键导入订阅**：
   - 打开 Stash 应用 -> 进入「配置」页面 -> 点击右上角「从 URL 下载」；
   - 粘贴从 [光速云](/airports/)、[灵猫网络](/airports/) 后台复制的 **Clash 订阅链接** -> 点击下载；
   - 下载完成后，勾选该配置为当前活动配置。
2. **开启按需连接（On-Demand）**：
   - 进入 Stash 设置 ->「网络」-> 开启「按需连接 (On-Demand)」；
   - 在触发策略中设置「当连接蜂窝网络时自动启动」、「当连接特定家庭 Wi-Fi 时自动直连」，实现全天候完全无感的智能代理切换。

---

## 03. Rule-Set 远程规则集与模块覆写实战

为了让客户端每天自动同步全网最新的去广告与分流数据库，建议在 Stash 配置中引入 **Rule-Set 远程规则集**：

```yaml
# Stash 远程规则集与策略组配置示例
rule-providers:
  reject:
    type: http
    behavior: domain
    url: "https://raw.githubusercontent.com/Loyalsoldier/clash-rules/release/reject.txt"
    path: ./ruleset/reject.yaml
    interval: 86400

  netflix:
    type: http
    behavior: classical
    url: "https://raw.githubusercontent.com/Loyalsoldier/clash-rules/release/netflix.txt"
    path: ./ruleset/netflix.yaml
    interval: 86400

rules:
  - RULE-SET,reject,REJECT
  - RULE-SET,netflix,🎬 流媒体专线
  - GEOIP,cn,DIRECT
  - MATCH,🐟 漏网之鱼
```

---

## 04. Apple TV 4K 客厅影音专属配置

在 Apple TV 4K 上安装 Stash 后，无需在家里折腾复杂的 OpenWrt 旁路由：

1. 在 Apple TV 的 App Store 登录购买了 Stash 的 Apple ID，下载安装 Stash tvOS 版；
2. 打开 tvOS 版 Stash，通过同一局域网下的 iPhone 扫描电视屏幕上的二维码，即可将手机上的机场订阅与分流规则一键同步至电视；
3. 点击「连接」，打开电视上的 Netflix 或 YouTube，享受 4K 60fps 杜比视界高码率影音体验！

更多流媒体解锁与多平台分流方案，请进一步阅读 [Netflix 与 Disney+ 跨区解锁策略组设计](/articles/streaming-unlock-policy/) 与 [Surge 高级分流规则教程](/articles/surge-mac-ios-advanced/)。
