---
title: "Subconverter 订阅转换指南：规则合并与节点去重"
description: "开源订阅转换神器 Subconverter 深度进阶：跨客户端格式互转、节点正则过滤去重、自建私有转换后端与 Docker Compose 部署实战。"
pubDate: 2026-08-09
updatedDate: 2026-08-16
category: "routing"
categoryName: "规则与路由"
tags: ["Subconverter", "订阅转换", "节点去重", "正则过滤", "Docker部署", "私有后端", "规则分流"]
author: "机场指南编辑部"
featured: false
draft: false
difficulty: "Advanced"
readingTime: "17 MIN READ"
badge: "SUBSCRIPTION WIZARD"
related: ["clash-verge-rev-guide", "sing-box-universal-config", "rule-sets-optimization", "docker-sing-box-router"]
keyProblems: [
  "为什么严禁在公开的第三方公共订阅转换网站上粘贴包含 Token 的机场敏感订阅链接（隐私与凭据泄露风险）",
  "Subconverter 如何在 Clash、Sing-box、Surge、Loon、Quantumult X 之间进行无损配置转换",
  "如何通过正则表达式对数百个节点进行批量重命名、排除高倍率节点与自动去重",
  "10 分钟利用 Docker Compose 在个人 VPS 上搭建 100% 私有安全的转换后端"
]
faq: [
  {
    q: "使用公共免费的订阅转换网站存在什么严重安全隐患？",
    a: "公共转换后端的搭建者可以在后台日志中明文记录你提交的所有机场订阅 URL。攻击者拿到链接后可以直接盗用你的全部月度流量，甚至注入恶意节点或窃取账户敏感信息。因此，强烈建议使用客户端本地转换或自建私有 Docker 后端。"
  },
  {
    q: "如何用正则表达式自动过滤掉所有倍率大于 1.5x 的节点？",
    a: "在 Subconverter 参数中添加 `exclude_remarks=(2|3|4|5|10)x|(2|3|4|5|10)X`，即可自动剔除所有节点名称中包含 2x 至 10x 的倍率节点。"
  }
]
---

## 01. 订阅转换的必要性与公共后端的安全危机

在科学上网的实际使用中，用户常常面临**协议与客户端割裂**的困扰：
- 机场只提供了一个长长的 `v2ray://` 或 `ss://` 单节点链接，但你想在 **[Clash Verge Rev](/articles/clash-verge-rev-guide/)** 中以分流策略组形式运行；
- 机场提供的规则过于简单，无法满足 **[Surge](/articles/surge-mac-ios-advanced/)** 或 **[Loon](/articles/loon-ios-complete-workflow/)** 复杂的去广告与 AI 分流需求；
- 用户同时订阅了 2~3 家机场（如 [光速云](/airports/) 与 [星岛梦](/airports/)），希望将其自动合并为一个统一的订阅文件。

**Subconverter**（由 tindy2013 开发的开源 C++ 高性能转换引擎）成为了全网事实上的转换标准。

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        公共转换后端的严重泄露风险                      │
├────────────────────────────────────────────────────────────────────────┤
│  用户在公共网页粘贴订阅 ──> 恶意后端记录订阅 URL ──> 流量被全网盗刷    │
│                                      │                                 │
│  【唯一安全正解】──> 使用 Docker 在自己的 VPS 上自建 100% 私有转换后端！│
└────────────────────────────────────────────────────────────────────────┘
```

---

## 02. 10 分钟自建私有 Subconverter 后端（Docker Compose）

在你的 Linux VPS 或软路由中，执行以下指令即可一键部署专属私有转换服务：

### 1. 编写 `docker-compose.yml`
```yaml
version: '3.8'

services:
  subconverter:
    image: tindy2013/subconverter:latest
    container_name: my-subconverter
    restart: always
    ports:
      - "25500:25500"
    environment:
      - SUB_UPDATE_INTERVAL=86400
    volumes:
      - ./pref.ini:/base/pref.ini:ro
```

### 2. 启动服务
```bash
# 启动私有转换容器
docker compose up -d

# 检查运行状态
curl http://127.0.0.1:25500/version
```

---

## 03. 核心进阶参数与正则过滤实战

通过向 Subconverter 发送 HTTP GET 请求，可以实现强大的定制化功能：

```text
【Subconverter 常用高级 URL 查询参数】
● target: 目标客户端格式 (clash, surge, loon, quanx, singbox)
● url: 源订阅链接 (多个链接使用 | 符号隔开进行自动合并)
● config: 自定义外部远程规则模板 URL
● include: 正则保留节点 (如: include=香港|日本|美国)
● exclude: 正则剔除节点 (如: exclude=0.1x|5.0x|游戏专用)
● emoji: 自动为节点名称追加国旗 Emoji 图标 (emoji=true)
```

### 实战：多订阅合并与节点清洗请求示例
```text
http://127.0.0.1:25500/sub?target=clash&url=https://机场A订阅|https://机场B订阅&insert=false&emoji=true&include=(香港|日本|美国)&exclude=(5x|10x)&config=https://raw.githubusercontent.com/.../my-config.ini
```

更多规则分流与 Docker 容器化部署，请参阅 [GeoIP 与 GeoSite 规则集优化](/articles/rule-sets-optimization/) 及 [Docker 部署 Sing-box 旁路由核心](/articles/docker-sing-box-router/)。
