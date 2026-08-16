---
title: "Sing-box 核心原理与通用配置全景解析"
description: "全能代理核心 Sing-box 架构解密：模块化 Inbound/Outbound 管道、SRS 规则集二进制编译、TUN 虚拟网卡与生产级 JSON 通用配置文件详解。"
pubDate: 2026-08-11
updatedDate: 2026-08-16
category: "clients"
categoryName: "客户端教程"
tags: ["Sing-box", "Sing-box配置", "JSON配置", "TUN模式", "SRS规则集", "客户端教程"]
author: "机场指南编辑部"
featured: false
draft: false
difficulty: "Advanced"
readingTime: "18 MIN READ"
badge: "UNIVERSAL CORE"
related: ["clash-verge-rev-guide", "docker-sing-box-router", "network-protocols-comparison", "rule-sets-optimization"]
keyProblems: [
  "为什么 Sing-box 被称为全能通用代理核心，相比传统 Clash 内核有哪些架构突破",
  "Sing-box 核心模块（inbounds / outbounds / route / dns）的数据流转生命周期",
  "如何手写一份兼顾 VLESS-Reality、Hysteria2、TUN 虚拟网卡与 DNS 防泄漏的完整生产级 JSON 配置",
  "二进制规则集（.srs）的极速匹配机制与更新维护"
]
faq: [
  {
    q: "Sing-box 的 .srs 规则集为什么比传统文本规则集更快？",
    a: "Sing-box 创新性地采用了提前预编译的二进制 Rule-Set 格式（.srs）。在程序启动时无需进行耗时的正则表达式文本解析与字符串切割，可以直接加载进内存执行位运算级别的毫秒级极速路由匹配。"
  },
  {
    q: "在 Windows / Linux 上运行 Sing-box 开启 TUN 模式报权限不足怎么办？",
    a: "TUN 模式需要在操作系统网络栈中创建虚拟网卡，Windows 下必须使用「以管理员身份运行」命令行或服务，Linux 下必须赋予二进制文件 `setcap cap_net_admin,cap_net_bind_service=+ep /usr/local/bin/sing-box` 权限。"
  }
]
---

## 01. Sing-box 的架构哲学与模块化管道

**Sing-box** 是由 SagerNet 团队开源的新一代通用代理平台。它彻底摆脱了早期 V2Ray 和 Clash 的历史包袱，采用纯 Go 语言从零编写，以**极高的吞吐性能、极低的内存开销（比传统内核节省 60% 内存）以及高度模块化的管道架构**赢得了极客社区的一致赞誉。

Sing-box 内部的数据流转遵循清晰的五大模块生命周期：

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        Sing-box 数据流转管道拓扑                       │
├────────────────────────────────────────────────────────────────────────┤
│  [ Inbounds 入站 ]  ──> TUN 虚拟网卡 / Mixed 端口 (1080) / HTTP 代理    │
│         │                                                              │
│         ▼                                                              │
│  [ DNS 解析引擎 ]  ──> 智能分流解析（国内 223.5.5.5 / 境外 Fake-IP）   │
│         │                                                              │
│         ▼                                                              │
│  [ Route 路由引擎 ] ──> 匹配 .srs 二进制规则集（分流至直连、代理或拦截）│
│         │                                                              │
│         ▼                                                              │
│  [ Outbounds 出站 ] ──> Direct 直连 / Block 拦截 / VLESS / Hysteria 2   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 02. 生产级 Sing-box 通用完整配置文件模板（JSON）

以下为编辑部打磨的生产级通用配置文件，涵盖 **TUN 虚拟网卡、Fake-IP 智能 DNS、SRS 二进制规则集以及主流协议出站**：

```json
{
  "log": {
    "level": "info",
    "timestamp": true
  },
  "dns": {
    "servers": [
      {
        "tag": "dns-direct",
        "address": "223.5.5.5",
        "detour": "direct"
      },
      {
        "tag": "dns-proxy",
        "address": "https://1.1.1.1/dns-query",
        "detour": "proxy-auto"
      },
      {
        "tag": "dns-fakeip",
        "address": "fakeip"
      }
    ],
    "rules": [
      {
        "outbound": "any",
        "server": "dns-direct"
      },
      {
        "rule_set": "geosite-cn",
        "server": "dns-direct"
      },
      {
        "query_type": ["A", "AAAA"],
        "server": "dns-fakeip"
      }
    ],
    "fakeip": {
      "enabled": true,
      "inet4_range": "198.18.0.0/15"
    }
  },
  "inbounds": [
    {
      "type": "tun",
      "tag": "tun-in",
      "interface_name": "singbox-tun",
      "inet4_address": "172.19.0.1/30",
      "auto_route": true,
      "strict_route": true,
      "stack": "system",
      "sniff": true
    },
    {
      "type": "mixed",
      "tag": "mixed-in",
      "listen": "127.0.0.1",
      "listen_port": 2080
    }
  ],
  "outbounds": [
    {
      "type": "selector",
      "tag": "proxy-auto",
      "outbounds": ["node-guangsu-iepl", "node-speedworld-ai", "direct"]
    },
    {
      "type": "vless",
      "tag": "node-guangsu-iepl",
      "server": "node.gsyvip.com",
      "server_port": 443,
      "uuid": "your-uuid-string-here",
      "tls": {
        "enabled": true,
        "server_name": "gateway.gsyvip.com",
        "utls": {
          "enabled": true,
          "fingerprint": "chrome"
        }
      }
    },
    {
      "type": "direct",
      "tag": "direct"
    },
    {
      "type": "block",
      "tag": "block"
    }
  ],
  "route": {
    "rule_set": [
      {
        "tag": "geosite-cn",
        "type": "remote",
        "format": "binary",
        "url": "https://raw.githubusercontent.com/SagerNet/sing-geosite/rule-set/geosite-cn.srs",
        "download_detour": "proxy-auto"
      },
      {
        "tag": "geoip-cn",
        "type": "remote",
        "format": "binary",
        "url": "https://raw.githubusercontent.com/SagerNet/sing-geoip/rule-set/geoip-cn.srs",
        "download_detour": "proxy-auto"
      }
    ],
    "rules": [
      {
        "rule_set": "geosite-cn",
        "outbound": "direct"
      },
      {
        "rule_set": "geoip-cn",
        "outbound": "direct"
      },
      {
        "ip_is_private": true,
        "outbound": "direct"
      }
    ],
    "auto_detect_interface": true
  }
}
```

---

## 03. 核心调试与日常运维指令

在服务器或本地运行 Sing-box 时，可使用以下常用命令进行诊断：

```bash
# 检查配置文件语法是否合法
sing-box check -c config.json

# 以指定配置启动服务
sing-box run -c config.json

# 格式化并校验 JSON 缩进
sing-box format -c config.json -w
```

更多旁路由部署实操，请继续阅读 [Docker 部署 Sing-box 旁路由核心](/articles/docker-sing-box-router/) 与 [彻底杜绝 DNS 泄漏深度指南](/articles/anti-dns-leak-guide/)。
