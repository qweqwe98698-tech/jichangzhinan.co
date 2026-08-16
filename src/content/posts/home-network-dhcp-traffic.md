---
title: "主路由与旁路由 DHCP 网关指定与防环路实操"
description: "家庭局域网 DHCP 深度进阶：Dnsmasq Option 3/6 参数分配、按 MAC 地址定向分流、防止广播风暴与局域网死循环排障指南。"
pubDate: 2026-08-12
updatedDate: 2026-08-16
category: "routing"
categoryName: "规则与路由"
tags: ["DHCP", "Dnsmasq", "旁路由", "防环路", "网络拓扑", "局域网优化", "规则分流"]
author: "机场指南编辑部"
featured: false
draft: false
difficulty: "Intermediate"
readingTime: "16 MIN READ"
badge: "DHCP CONTROL"
related: ["openwrt-transparent-gateway-master", "mosdns-smart-resolver", "docker-sing-box-router", "proxy-troubleshooting-geo-faq"]
keyProblems: [
  "为什么全屋所有设备直接指向旁路由会导致不翻墙的智能家居产生异常断联",
  "如何利用主路由 Dnsmasq 的 Option 3 与 Option 6 实现‘按设备 MAC 地址精准下发旁路由网关’",
  "局域网出现环路（Loop）导致 CPU 占用 100% 与网络彻底瘫痪的成因分析",
  "防环路与网关广播风暴配置实操"
]
faq: [
  {
    q: "什么是 DHCP Option 3 和 Option 6？",
    a: "在标准 DHCP 协议中，Option 3 用于指定下发给终端设备的‘默认网关（Gateway）’IP 地址，Option 6 用于指定‘DNS 服务器’IP 地址。通过在主路由中针对特定设备覆盖这两个参数，可以实现完全免手动设置的精准分流。"
  },
  {
    q: "如何避免主路由和旁路由之间产生死循环广播风暴？",
    a: "严禁在主路由的 DNS 上游填写旁路由 IP、同时又在旁路由的 DNS 上游填写主路由 IP！这种互为上游的循环配置会引发无限递归查询，数秒内耗尽路由器 CPU 并导致全屋网络瘫痪。"
  }
]
---

## 01. 传统全屋旁路由架构的“智能家居翻车痛点”

在配置家庭旁路由时，很多新手习惯直接在主路由后台将全屋的默认网关统一改成旁路由 IP（`192.168.1.2`）。

这种“一刀切”做法往往会引发一系列难以预料的家庭矛盾：
1. **智能家居离线**：米家网关、扫地机器人、智能门锁等设备本身只访问国内服务器，流量强行走旁路由代理内核后，经常因 UDP 心跳包超时而频繁报离线；
2. **长辈电视盒子卡顿**：国内正版机顶盒看央视直播时，可能会触发代理策略误判导致播放卡顿；
3. **旁路由重启全屋断网**：一旦你在旁路由上更新固件或调试配置，全家所有设备瞬间同时失去网络。

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        精准定向分流的最佳解决方案                      │
├────────────────────────────────────────────────────────────────────────┤
│  ● 普通国内设备 (智能家居/长辈手机) ──> 主路由 DHCP 默认下发主网关    │
│  ● 极客翻墙设备 (PC/iPhone/AppleTV) ──> Dnsmasq 根据 MAC 定向指定旁网关│
└────────────────────────────────────────────────────────────────────────┘
```

---

## 02. Dnsmasq 条件 DHCP 配置实战（按 MAC 定向指定）

在主路由（运行 OpenWrt、Padavan 或 Asuswrt-Merlin）的 `dnsmasq.conf` 配置文件中，我们可以通过打标签（Tag）的方式，为特定设备下发旁路由网关：

### 1. 编写 Dnsmasq 自定义规则：
```ini
# 定义旁路由设备标签 (proxy_clients)
# 格式: dhcp-host=设备MAC地址,set:标签名称,设备固定IP

# 示例：将主机的 PC、iPhone 和 Apple TV 打上 proxy 标签
dhcp-host=00:11:22:33:44:55,set:proxy_clients,192.168.1.50
dhcp-host=AA:BB:CC:DD:EE:FF,set:proxy_clients,192.168.1.51
dhcp-host=11:22:33:44:55:66,set:proxy_clients,192.168.1.52

# 为拥有 proxy_clients 标签的设备下发旁路由网关与 DNS (Option 3 & Option 6)
dhcp-option=tag:proxy_clients,3,192.168.1.2
dhcp-option=tag:proxy_clients,6,192.168.1.2

# 未打标签的其他普通设备，默认继承主路由下发的正常网关 (192.168.1.1)
```

---

## 03. 局域网防环路（Loop）与排错守则

为了确保家庭网络坚如磐石，请严格排查以下三项高危配置：

```text
【防环路三大金科玉律】
① 旁路由的网关必须指向主路由 (192.168.1.1)，绝不能留空或填自己！
② 旁路由必须永久关闭自身的 DHCP 服务器，全屋仅保留主路由唯一的 DHCP！
③ DNS 解析严禁形成互指回路：建议主路由 DNS 指向公网 (223.5.5.5)，旁路由 DNS 指向独立的 MosDNS 服务！
```

更多软路由配置与排错方案，请参阅 [OpenWrt 旁路由透明网关配置全解](/articles/openwrt-transparent-gateway-master/) 及 [代理排错全百科](/articles/proxy-troubleshooting-geo-faq/)。
