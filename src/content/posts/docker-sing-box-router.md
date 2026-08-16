---
title: "Docker 部署 Sing-box 旁路由：TUN 透明网关实战"
description: "NAS / Home Server 极客折腾指南：利用 Docker 容器化部署 Sing-box 旁路由透明网关、Macvlan 虚拟网络划分与 Host 网络高性能实战。"
pubDate: 2026-08-04
updatedDate: 2026-08-16
category: "routing"
categoryName: "规则与路由"
tags: ["Docker", "Sing-box", "旁路由", "透明网关", "Macvlan", "NAS", "规则分流"]
author: "机场指南编辑部"
featured: false
draft: false
difficulty: "Advanced"
readingTime: "17 MIN READ"
badge: "DOCKER ROUTING"
related: ["sing-box-universal-config", "openwrt-transparent-gateway-master", "home-network-dhcp-traffic", "subconverter-rule-merge"]
keyProblems: [
  "如何在群晖 NAS、QNAP、Unraid 或标准 Ubuntu Server 上通过 Docker 一键部署轻量化旁路由",
  "Docker 容器内创建 TUN 虚拟网卡所需的 Linux 权限与系统调用参数（CAP_NET_ADMIN）",
  "Host 网络模式与 Macvlan 独立 IP 模式的选型差异与性能取舍",
  "生产级 docker-compose.yml 部署清单与自动化运维配置"
]
faq: [
  {
    q: "为什么在 Docker 容器中运行 Sing-box 必须挂载 `/dev/net/tun`？",
    a: "因为 Sing-box 的透明代理依赖 Linux 系统内核的 TUN 虚拟网卡驱动。默认的 Docker 容器处于隔离沙盒中，必须通过 `--device /dev/net/tun` 并赋予 `--cap-add=NET_ADMIN` 权限，容器才能直接与宿主机的网络协议栈交互。"
  },
  {
    q: "Docker 部署相比在虚拟机中安装完整 OpenWrt 有什么巨大优势？",
    a: "Docker 容器化部署直接共享宿主机 Linux 内核，内存占用从 OpenWrt 虚拟机的 512MB~1GB 骤降至仅约 **20MB**，且无需虚拟化 CPU 指令损耗，千兆网络吞吐转发几乎 0 性能衰减。"
  }
]
---

## 01. 轻量化透明网关的兴起：告别臃肿的虚拟机

在家庭服务器与 NAS（群晖 Synology、TrueNAS、Unraid）中，很多用户为了实现全屋透明代理，被迫在虚拟机（KVM / PVE）中安装一个动辄几百兆的 OpenWrt 镜像。

虚拟机方案不仅开销巨大，而且每次系统重启耗时较长。随着 **Sing-box** 的成熟，我们可以通过一个极其轻量的 **Docker 容器**，直接在宿主机 Linux 内核中运行高性能 TUN 透明网关：

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        Docker Sing-box 旁路由架构                      │
├────────────────────────────────────────────────────────────────────────┤
│  宿主机 Linux (Ubuntu/Debian/NAS) ──[ 开启 IPv4 转发: ip_forward=1 ]    │
│                                       │                                │
│  Docker Sing-box 容器 (内存仅 20MB) ──[ 挂载 /dev/net/tun 与 NET_ADMIN ]│
│                                       │                                │
│  局域网终端 (PC/iPhone/电视盒子) ──────┘ (网关直接指向宿主机 IP)        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 02. 生产级 Docker Compose 部署实战

### 1. 宿主机准备（开启内核转发）
在 Linux 服务器终端中执行：
```bash
# 开启内核数据包转发
echo "net.ipv4.ip_forward=1" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

### 2. 编写 `docker-compose.yml`
```yaml
version: '3.8'

services:
  sing-box:
    image: ghcr.io/sagernet/sing-box:latest
    container_name: sing-box-gateway
    restart: always
    network_mode: host  # 使用 Host 网络模式获得极致转发性能
    cap_add:
      - NET_ADMIN
    devices:
      - /dev/net/tun:/dev/net/tun
    volumes:
      - ./config.json:/etc/sing-box/config.json:ro
    command: run -c /etc/sing-box/config.json
```

---

## 03. 宿主机路由与防火墙伪装

为了让局域网其他设备将该宿主机作为网关时能够正常收到回包，在宿主机上执行：

```bash
# 开启 IP 动态伪装 (假设局域网网卡名称为 eth0)
sudo iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
```

此时，将你电脑或手机的网关和 DNS 修改为该 Linux 服务器的局域网 IP（例如 `192.168.1.100`），即可直接畅享极速科学上网！

更多 Sing-box 核心配置，请参阅 [Sing-box 核心原理与通用配置全景解析](/articles/sing-box-universal-config/) 与 [OpenWrt 旁路由透明网关配置全解](/articles/openwrt-transparent-gateway-master/)。
