---
title: "Quantumult X 重写规则实战：分流策略与图标美化"
description: "iOS 经典代理神器 Quantumult X (圈 X) 深度进阶：URL-Rewrite 重写语法、MitM 响应体修改、节点图标库美化与自动化脚本实战。"
pubDate: 2026-08-11
updatedDate: 2026-08-16
category: "clients"
categoryName: "客户端教程"
tags: ["QuantumultX", "圈X", "重写规则", "MitM", "图标美化", "iOS客户端", "客户端教程"]
author: "机场指南编辑部"
featured: false
draft: false
difficulty: "Advanced"
readingTime: "17 MIN READ"
badge: "QUANX MASTERY"
related: ["loon-ios-complete-workflow", "shadowrocket-ios-setup", "boxjs-session-automation", "stash-app-clash-ecosystem"]
keyProblems: [
  "Quantumult X (圈 X) 相比其他 iOS 客户端在精细化正则表达式重写上的极致灵活性",
  "URL-Rewrite (302/307 重定向、Reject 拦截) 与 Script-Response-Body 语法详解",
  "如何为不同地区的节点（香港、日本、美国、专线）一键匹配高颜值彩色图标库",
  "生产级 Quantumult X 完整配置文件规范"
]
faq: [
  {
    q: "为什么很多人称 Quantumult X 的分流体验最为顺滑？",
    a: "圈 X 拥有极其高效的底层分流引擎，支持正则表达式（Regex）对节点名称进行多重筛选与动态聚合，并支持直接在本地修改 HTTP/HTTPS 响应体，功能极其强大且运行极为稳定。"
  },
  {
    q: "圈 X 的 MitM 证书在 iOS 上开启后为什么某些 App 提示网络不可用？",
    a: "某些严格进行 SSL Pinning（证书绑定）的金融 App 拒绝第三方自签证书。解决方案是在圈 X 配置的 `[mitm]` 模块下的 `skip_validating_cert` 或 `hostname` 中将特定银行与金融域名排除（例如 `-*.alipay.com, -*.bank.com`）。"
  }
]
---

## 01. 认识 Quantumult X：iOS 平台的规则定制天花板

在众多 iOS 代理客户端中，**Quantumult X（圈 X）**（售价约 $7.99 美元）以其**极度强大的重写（Rewrite）引擎、丰富多样的策略组设计以及极客圈高度繁荣的 UI 美化生态**，成为了无数资深玩家的心头挚爱。

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        Quantumult X 四大核心技术支柱                   │
├────────────────────────────────────────────────────────────────────────┤
│  ① 毫秒级分流策略组 ──> static / available / round-robin / url-latency│
│  ② 深度 URL 重写系统 ──> 302/307 网页重定向、Reject 广告拦截、Mock 数据│
│  ③ 脚本修改引擎      ──> 支持 JavaScript 修改 HTTP Header 与 Body 内容 │
│  ④ 极客美化图标库    ──> 自定义节点国旗、地区与品牌高清彩色矢量图标     │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 02. 生产级圈 X 配置文件精要剖析

在圈 X 的配置文件（`quantumultx.conf`）中，核心配置主要分为以下几大模块：

```ini
[general]
# 基础网络与 DNS
dns_exclusion_list = *.cmpassport.com, *.jegotrip.com.cn
excluded_routes = 192.168.0.0/16, 10.0.0.0/8, 172.16.0.0/12
server_check_url = http://www.gstatic.com/generate_204

[server_remote]
# 机场订阅导入（支持正则筛选）
https://机场订阅链接, tag=光速云专线, update-interval=86400, opt-parser=true, enabled=true

[policy]
# 智能策略组
static=🚀 主力代理, ⚡ 自动优选, direct, img-url=https://raw.githubusercontent.com/.../Proxy.png
url-latency-benchmark=⚡ 自动优选, server_remote:光速云专线, url=http://www.gstatic.com/generate_204, interval=300, tolerance=50, img-url=https://raw.githubusercontent.com/.../Auto.png
static=🎬 国际流媒体, 🇭🇰 香港专线, 🇯🇵 日本专线, 🇺🇸 美国专线, img-url=https://raw.githubusercontent.com/.../Netflix.png
static=🤖 AI工具, 🇺🇸 美国专线, 🇯🇵 日本专线, img-url=https://raw.githubusercontent.com/.../OpenAI.png

[filter_remote]
# 远程规则集加载
https://raw.githubusercontent.com/Loyalsoldier/quantumult-x-rules/release/reject.txt, tag=广告拦截, update-interval=86400, opt-parser=false, enabled=true
https://raw.githubusercontent.com/Loyalsoldier/quantumult-x-rules/release/netflix.txt, tag=Netflix分流, update-interval=86400, opt-parser=false, enabled=true
https://raw.githubusercontent.com/Loyalsoldier/quantumult-x-rules/release/openai.txt, tag=OpenAI分流, update-interval=86400, opt-parser=false, enabled=true
https://raw.githubusercontent.com/Loyalsoldier/quantumult-x-rules/release/direct.txt, tag=国内直连, update-interval=86400, opt-parser=false, enabled=true

[rewrite_remote]
# 重写与去广告规则
https://raw.githubusercontent.com/chavyleung/scripts/master/box/rewrite/boxjs.rewrite.quanx.conf, tag=BoxJS本地控制台, update-interval=86400, opt-parser=false, enabled=true

[mitm]
# 启用 HTTPS 解密 (排除银行网银域名)
enable = true
skip_validating_cert = false
hostname = *.netflix.com, *.chatgpt.com, *.openai.com, boxjs.com, -*.alipay.com, -*.bank.com
```

---

## 03. 节点与策略组图标库一键美化实战

圈 X 允许通过在策略组中添加 `img-url` 参数来载入精美的第三方图标库：
1. 打开圈 X 设置 -> 滑到最底部「资源解析器 (Resource Parser)」；
2. 填入社区知名的图标解析器脚本；
3. 刷新订阅后，所有的香港、日本、美国节点前将自动渲染出高清国旗与专线标识，界面极具工业设计美感。

更多苹果全平台网络工具与自动化联动，请参阅 [Loon iOS 完整工作流指南](/articles/loon-ios-complete-workflow/) 与 [BoxJS 自动化应用全解析](/articles/boxjs-session-automation/)。
