---
title: "MosDNS 分流解析配置：防 DNS 泄漏与智能双栈加速"
description: "可插拔开源 DNS 转发神器 MosDNS v5 深度配置：插件化执行管道、国内腾讯/阿里 DoH 极速直连、境外防污染与智能双栈测速分流。"
pubDate: 2026-08-11
updatedDate: 2026-08-16
category: "routing"
categoryName: "规则与路由"
tags: ["MosDNS", "SmartDNS", "DNS分流", "防污染", "双栈加速", "OpenWrt", "规则分流"]
author: "机场指南编辑部"
featured: false
draft: false
difficulty: "Advanced"
readingTime: "17 MIN READ"
badge: "DNS PIPELINE"
related: ["anti-dns-leak-guide", "openwrt-transparent-gateway-master", "home-network-dhcp-traffic", "rule-sets-optimization"]
keyProblems: [
  "传统 DNS 转发器在面对复杂 CDN 智能调度与境外防投毒时的局限性",
  "MosDNS v5 插件化管道（Sequence Pipeline）的工作流程与分流设计哲学",
  "如何实现国内域名走阿里/腾讯 DoH 毫秒级解析，海外域名强制走远端加密 DoH",
  "生产级 MosDNS v5 完整 YAML 配置文件详解"
]
faq: [
  {
    q: "MosDNS 相比 AdGuard Home 和 SmartDNS 核心优势在哪里？",
    a: "MosDNS 的核心优势在于极其纯粹高效的‘管道插件化架构’。它不依赖复杂的 WebUI，允许工程师像写代码一样用 YAML 编排 DNS 解析的每一个条件分支（先查缓存 -> 匹配 GeoSite -> 本地 DoH 并发测速 -> 境外安全回退），性能极高且内存占用仅 15MB 左右。"
  },
  {
    q: "MosDNS 如何彻底解决国内 CDN 调度不准导致国内 App 变慢的问题？",
    a: "MosDNS 通过严格的 `geosite_cn` 规则分流，将所有国内域名严格交由你本地宽带最近的阿里/腾讯 DoH 服务器解析，保证返回离你物理距离最近的国内 CDN 边缘节点 IP，彻底杜绝了使用公共海外 DNS 导致淘宝、B站卡顿的问题。"
  }
]
---

## 01. 为什么家庭软路由需要部署 MosDNS？

在软路由与透明网关环境中，DNS 解析的质量直接决定了全屋上网的综合体验：
1. **国内 CDN 解析偏差**：如果国内域名被境外 DNS 解析，会导致国内 App（如抖音、微信、B站）被错误调度到几千公里外的边缘机房，视频加载缓慢；
2. **境外 DNS 劫持与投毒**：如果境外域名被国内明文 DNS 解析，会返回虚假的错误 IP 导致直接断网。

**MosDNS v5**（由 IrineSistiana 开发的开源可插拔 DNS 工具）通过模块化的 **执行管道（Pipeline）** 机制，完美实现了“国内极速就近接入，境外 100% 防投毒”的理想状态。

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        MosDNS v5 插件化分流处理管道                    │
├────────────────────────────────────────────────────────────────────────┤
│  客户端发起 DNS 请求 ──> [ 插件: 内存高速缓存 ] (若命中直接秒级返回)  │
│                                 │ (未命中)                             │
│                                 ▼                                      │
│  [ 插件: GeoSite cn 白名单判断 ] ──> 是 ──> [ 阿里/腾讯 DoH 并发解析 ] │
│                                 │ 否                                   │
│                                 ▼                                      │
│  [ 插件: 境外加密通道 ]         ──> 走 ──> [ Cloudflare/Google DoH ]  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 02. 生产级 MosDNS v5 完整配置文件模板（YAML）

以下为在 OpenWrt 或 Linux 服务器上运行的标准生产级配置 `config.yaml`：

```yaml
log:
  level: info
  file: ""

plugins:
  # 1. 规则数据源加载
  - tag: geosite_cn
    type: domain_set
    args:
      files:
        - "/var/mosdns/geosite_cn.txt"

  - tag: geoip_cn
    type: ip_set
    args:
      files:
        - "/var/mosdns/geoip_cn.txt"

  # 2. 内存高速缓存插件 (缓存 10000 条记录)
  - tag: memory_cache
    type: cache
    args:
      size: 10240
      lazy_cache_ttl: 86400

  # 3. 国内极速 DoH 上游
  - tag: forward_local
    type: forward
    args:
      concurrent: 2
      upstreams:
        - addr: "https://223.5.5.5/dns-query"
          enable_pipeline: true
        - addr: "https://120.53.53.53/dns-query"
          enable_pipeline: true

  # 4. 境外防污染安全 DoH 上游 (走本地代理端口 7890)
  - tag: forward_remote
    type: forward
    args:
      concurrent: 2
      upstreams:
        - addr: "https://1.1.1.1/dns-query"
          socks5: "127.0.0.1:7890"
        - addr: "https://8.8.8.8/dns-query"
          socks5: "127.0.0.1:7890"

  # 5. 主执行逻辑序列管道
  - tag: main_sequence
    type: sequence
    args:
      - exec: $memory_cache
      - matches: has_resp
        exec: accept

      # 匹配国内域名白名单 -> 直连解析
      - matches: qname $geosite_cn
        exec: $forward_local
      - matches: has_resp
        exec: accept

      # 默认走境外安全 DoH 兜底
      - exec: $forward_remote

  # 6. 本地 53 端口监听服务
  - tag: udp_server
    type: udp_server
    args:
      entry: main_sequence
      listen: "0.0.0.0:53"
```

更多软路由与家庭拓扑实战，请参阅 [OpenWrt 旁路由透明网关配置全解](/articles/openwrt-transparent-gateway-master/) 与 [彻底杜绝 DNS 泄漏指南](/articles/anti-dns-leak-guide/)。
