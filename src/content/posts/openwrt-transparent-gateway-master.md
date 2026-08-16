---
title: "OpenWrt 旁路由透明网关配置：家庭网络拓扑与分流全解"
description: "家庭与工作室软路由终极拓扑：OpenWrt / iStoreOS 旁路网关架构、nftables/TPROXY 透明代理、单臂路由防环路与无感全屋科学上网实战。"
pubDate: 2026-08-11
updatedDate: 2026-08-16
category: "routing"
categoryName: "规则与路由"
tags: ["OpenWrt", "旁路由", "透明网关", "软路由", "iStoreOS", "TPROXY", "规则分流"]
author: "机场指南编辑部"
featured: false
draft: false
difficulty: "Advanced"
readingTime: "18 MIN READ"
badge: "HOMELAB ROUTING"
related: ["home-network-dhcp-traffic", "mosdns-smart-resolver", "docker-sing-box-router", "clash-verge-rev-guide"]
keyProblems: [
  "为什么‘主路由负责拨号 + 旁路由负责分流加速’是目前家庭网络最稳固的容灾拓扑",
  "旁路由 LAN 口静态 IP、网关与 DNS 的正确配置原则",
  "nftables / iptables 防火墙自定义规则：如何开启 IP 动态伪装（Masquerading）避免回包丢失",
  "如何解决局域网内 AirDrop、微信投屏、局域网打印机与 HomeKit 搜索不到的痛点"
]
faq: [
  {
    q: "为什么推荐使用旁路由（透明网关）而不是直接用软路由做主路由拨号？",
    a: "旁路由架构具备极佳的‘容灾隔离性’。主路由（通常为稳定的硬路由）专职负责光猫拨号、Wi-Fi 发射与 DHCP 分发；旁路由仅处理需要加速的设备流量。即使旁路由系统死机或升级重启，全屋正常的国内网络、电视与智能家居完全不会断网。"
  },
  {
    q: "旁路由开启后为什么某些设备无法上网（DNS 解析正常但无法握手）？",
    a: "这是因为数据包在主路由和旁路由之间产生了‘非对称路由（Asymmetric Routing）’。必须在 OpenWrt 防火墙的自定义规则中开启 LAN 口的 MSS 钳制与 IP 动态伪装（`iptables -t nat -I POSTROUTING -o br-lan -j MASQUERADE`）。"
  }
]
---

## 01. 旁路由（透明网关）的拓扑架构设计

在家庭 Homelab、极客工作室与现代智能家居环境中，**旁路由（Sidecar / Transparent Gateway）** 是全网公认兼具“极致性能与超强容灾”的经典架构：

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        家庭网络旁路由标准物理拓扑                      │
├────────────────────────────────────────────────────────────────────────┤
│  光猫 (Bridged) ──> 主硬路由 (192.168.1.1, 负责 PPPoE 拨号与全屋 Wi-Fi) │
│                            │                                           │
│                            ├──> 智能家居 / 扫地机器人 (网关指向 192.168.1.1)│
│                            │                                           │
│                            └──> 旁软路由 (192.168.1.2, 运行 OpenWrt/Mihomo) │
│                                       ▲                                │
│  PC / iPhone / Apple TV ──────────────┘ (手动或 DHCP 指定网关 192.168.1.2)│
└────────────────────────────────────────────────────────────────────────┘
```

---

## 02. OpenWrt 接口与网络参数保姆级配置

### 1. 旁路由 LAN 接口设置
进入 OpenWrt 后台 ->「网络」->「接口」-> 编辑 `LAN` 口：
- **传输协议**：静态地址 (Static)；
- **IPv4 地址**：`192.168.1.2`（必须与主路由处于同一子网段）；
- **IPv4 子网掩码**：`255.255.255.0`；
- **IPv4 网关**：`192.168.1.1`（**必须填写主路由 IP**）；
- **自定义 DNS 服务器**：`192.168.1.1` 或 [MosDNS 分流解析](/articles/mosdns-smart-resolver/)。

### 2. 关闭旁路由的 DHCP 服务
滑到 LAN 口设置最底部，点击「DHCP 服务器」标签页，勾选 **「忽略此接口 (Ignore interface)」**，彻底杜绝局域网内出现双 DHCP 服务器引发广播风暴与 IP 冲突。

---

## 03. 防火墙自定义规则与防丢包伪装

进入「网络」->「防火墙」->「自定义规则」，在末尾追加以下关键规则并点击重启防火墙：

```bash
# 解决旁路由非对称路由导致的回包丢失问题 (MASQUERADE 动态伪装)
iptables -t nat -I POSTROUTING -o br-lan -j MASQUERADE

# 开启 TCP MSS 钳制防止数据包分片卡顿
iptables -t mangle -A FORWARD -p tcp --tcp-flags SYN,RST SYN -j TCPMSS --clamp-mss-to-pmtu
```

---

## 04. 终端设备接入策略与分流验证

- **按需接入模式**：在电脑、Apple TV 或手机的 Wi-Fi 设置中，将 IP 获取方式改为「静态」，IP 设为 `192.168.1.50`，**路由器/网关填 `192.168.1.2`，DNS 填 `192.168.1.2`**。此时该设备即可享受全屋 4K 秒开加速。
- **全屋无感模式**：在主路由后台将 DHCP 默认下发的网关与 DNS 全局修改为 `192.168.1.2`。

更多主旁路由防环路与网关广播调优，请参阅 [主路由与旁路由 DHCP 网关指定实操](/articles/home-network-dhcp-traffic/) 与 [Docker 部署 Sing-box 旁路由](/articles/docker-sing-box-router/)。
