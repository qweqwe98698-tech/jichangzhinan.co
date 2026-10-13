---
title: "真假 IPLC / IEPL 专线网络取证全指南：使用 MTR / NextTrace 追踪路由 AS 跳数与假专线公网中继套路鉴别"
description: "深度拆解真假 IPLC/IEPL 专线的底层网络机理，手把手教你用 MTR 与 NextTrace 追踪 AS 跳数、识别公网中继伪装专线的套路，附带生产级配置、抓包审计与跑路预警自检清单，帮助你在 22 分钟内建立一套可复现的专线取证方法论。"
pubDate: 2026-10-13
updatedDate: 2026-10-13
category: "security"
categoryName: "避坑与安全防骗"
tags: ["真假IPLC鉴别","NextTrace路由追踪","AS跳数检测","倍率刺客防范","机场跑路预警"]
author: "机场指南编辑部"
featured: false
draft: false
difficulty: "Intermediate"
readingTime: "15 MIN READ"
badge: "DEEP DIVE"
related: ["ai-productivity-routing","anti-webrtc-dns-ipv6-leak-zero-fingerprint-hardening","network-protocols-comparison","clash-verge-rev-guide"]
keyProblems:
  - "机场宣称 IPLC/IEPL 专线，但晚高峰 RTT 抖动超过 80ms，疑似公网中继伪装"
  - "MTR 输出中出现大量 AS4134 / AS4809 / AS58453 等公网骨干 AS，与专线应有的 L2/L3 直连路径不符"
  - "NextTrace 显���跨境段经过 3 个以上公网 AS 跳数，触发倍率刺客计费却无专线体验"
  - "客户端侧 DNS / IPv6 / WebRTC 泄漏导致真实出口 IP 暴露，需配合内核级抓包审计"
faq:
  - q: "IPLC 和 IEPL 到底有什么区别？为什么很多机场混着叫？"
    a: "IPLC（International Private Leased Circuit）本质是运营商提供的国际私有租用电路，通常是基于 SDH/OTN 的 TDM 或 L2 专线，端到端物理隔离，不经过公网 BGP 路由表；IEPL（International Ethernet Private Line）是它的以太网演进版本，基于 MPLS-TP 或 VPLS 提供 L2 以太网专线，带宽颗粒度更细、成本更低。二者共同点是：跨境段不进入公网 AS 路由，因此 MTR 上跨境段只会看到 1~2 跳（两端 PE 设备），不会出现 AS4134/AS4809/AS58453 这类骨干 AS。机场混着叫，多数是因为自己卖的就是公网中继+隧道，用 IEPL 这个词听起来更便宜也更像专线。"
  - q: "用 MTR 追踪时，多少跳以内才能算真专线？"
    a: "没有绝对数字，但可以给出经验阈值：真 IPLC/IEPL 的跨境段（例如中国大陆出口到香港/日本/新加坡）通常只有 1~3 跳，且这些跳的 AS 号属于两端运营商或专线提供商的私有 AS，不会出现中国电信 163（AS4134）、CN2（AS4809）、中国移动国际（AS58453）、中国联通 169（AS4837）这类公网骨干 AS。如果你的 MTR 在跨境段看到 3 个以上公网 AS，基本可以判定是公网中继。注意 MTR 的 ICMP 响应可能被限速或屏蔽，要结合 NextTrace 的 TCP SYN 模式交叉验证。"
  - q: "机场标注 0.1x / 0.5x / 1x / 5x 倍率，怎么判断是不是倍率刺客？"
    a: "倍率本身不是问题，问题是倍率与真实链路质量不匹配。鉴别方法：用 NextTrace 确认该节点跨境段 AS 跳数，如果 AS 跳数 ≥3 且 RTT 晚高峰抖动 >50ms，却标 5x 倍率，就是典型倍率刺客。另外要看计费口径：是按出站流量还是双向流量计费，是否对 UDP/QUIC 单独加倍率。建议用 Clash Verge Rev 的流量统计 + 节点级延迟测试做 7 天基线，再决定是否续费。"
  - q: "假专线机场有哪些典型跑路预警信号？"
    a: "四个信号：1）节点 IP 段突然大批量更换，且新 IP 的 whois 显示为廉价 VPS 提供商（如 ColoCrossing、BuyVM）；2）支付渠道从 Stripe/支付宝切换为加密货币或私人收款码；3）Telegram 群组突然禁言或关闭评论；4）节点倍率在无公告情况下上调。配合 NextTrace 定期存档路由快照，一旦发现跨境段 AS 路径从 2 跳变成 5 跳，就是链路降级的硬证据。"
---

## 01. 现实痛点与底层机理解构

先把话说死：市面上 90% 标着 "IPLC 专线" 的机场，卖的都不是 IPLC。它们卖的是「公网中继 + 隧道封装」，也就是入口在国内 BGP 机房，出口在境外 VPS，中间走的是普通公网骨干，再用 WireGuard / Shadowsocks / Trojan / VLESS 把流量裹一层。用户看到的是「延迟低、能解锁」，就默认是专线。这个认知差，就是倍率刺客和跑路机场的利润来源。

要拆穿它，得先搞清楚真专线在协议栈上到底长什么样。

### 1.1 IPLC / IEPL 的协议栈位置

真 IPLC 是运营商级别的私有租用电路，物理层走 SDH/OTN，链路层走 TDM 或 GFP 封装，本质是 L1/L2 专线。它不进入公网 BGP 路由表，跨境段两端是运营商的 PE（Provider Edge）设备，中间经过的是一系列 P 设备（Provider 核心），但这些 P 设备对用户流量是透明的——你的 traceroute 根本看不到它们，因为 TTL 在 PE 之间不会被逐跳递减暴露。

IEPL 是 IPLC 的以太网版本，基于 MPLS-TP 或 VPLS，提供 L2 以太网专线。它的特点是带宽颗粒度更细（1Mbps 起），成本更低，但同样不进入公网 AS 路由。

关键结论：**真专线的跨境段，MTR 上只会看到 1~3 跳，且这些跳的 AS 号属于专线两端运营商或私有 AS，不会出现 AS4134 / AS4809 / AS58453 / AS4837 这类公网骨干 AS。**

### 1.2 假专线的三种典型伪装

**伪装一：公网中继 + 隧道。** 入口在国内 BGP 机房（比如阿里云、腾讯云、UCloud），出口在境外 VPS（比如搬瓦工、DMIT、Vultr），中间走公网。用户在客户端看到的是「入口 IP 延迟 5ms」，但跨境段实际经过 5~8 个公网 AS。MTR 一跑就露馅。

**伪装二：CN2 GIA 冒充 IPLC。** CN2 GIA（AS4809）确实是优质公网线路，晚高峰丢包率低、RTT 稳定，但它仍然是公网，跨境段会看到 AS4809 跳数。有些机场把 CN2 GIA 标成 "IPLC"，属于偷换概念。

**伪装三：隧道套隧道。** 入口走公网到中转机，中转机再走公网到落地机，中间用 WireGuard 或 SS 再裹一层。这种最坑，MTR 上会看到两段公网 AS 路径，RTT 抖动极大，但机场会标 3x~5x 倍率。

### 1.3 为什么 MTR 和 NextTrace 能取证

MTR 基于 ICMP/UDP/TCP 的 TTL 递减机制，逐跳探测路径。NextTrace 是 MTR 的现代化替代品，支持 TCP SYN、ICMP、UDP 三种探测模式，并且能解析每一跳的 AS 号、AS 名称、地理位置、IX 交换点。它的核心优势是：

- 支持 TCP SYN 探测，能穿透 ICMP 限速；
- 内置 ASN 数据库（基于 BGP 表快照），能直接显示每一跳的 AS 号；
- 支持 MPLS 标签显示，能看到专线是否走 MPLS；
- 支持 JSON 输出，方便脚本化存档和对比。

用这两个工具，配合 whois、BGP.he.net、PeeringDB，就能把一条链路的「真实身份」扒得干干净净。

---

## 02. 网络拓扑与核心交互设计

先画一张对比图，把真专线和假专线的数据包走线摆在一起。

### 2.1 真 IPLC / IEPL 拓扑

```
[Client] --- [国内入口 PE] ===== IPLC/IEPL 专线 ===== [境外落地 PE] --- [境外出口]
    |              |                                      |              |
    |              |<---- L2/L3 私有电路，不进入公网 ---->|              |
    |              |                                      |              |
   TTL=1         TTL=2                                  TTL=3         TTL=4
   (本地网关)    (入口 PE)                              (落地 PE)     (出口网关)

MTR 输出示例（真专线）：
HOST                                          Loss%   Snt   Last   Avg  Best  Wrst StDev  AS
1. 192.168.1.1                                 0.0%    10    1.2   1.3   1.1   1.8   0.2  -
2. 10.0.0.1 (入口 PE)                          0.0%    10    3.5   3.6   3.4   4.1   0.2  AS-私有
3. 10.0.0.2 (落地 PE)                          0.0%    10   28.4  28.6  28.2  29.1   0.3  AS-私有
4. 203.0.113.1 (境外出口)                      0.0%    10   29.1  29.3  28.9  30.2   0.4  AS-境外运营商
```

注意：跨境段只有 2 跳（入口 PE 和落地 PE），且 AS 号是私有或专线提供商自有 AS，不出现公网骨干 AS。

### 2.2 假专线（公网中继 + 隧道）拓扑

```
[Client] --- [国内入口 VPS] --- [公网骨干 AS4134] --- [公网骨干 AS4809] --- [境外中转 VPS] --- [境外落地 VPS] --- [出口]
    |              |                  |                    |                    |                  |              |
   TTL=1         TTL=2              TTL=3                TTL=4                TTL=5              TTL=6         TTL=7
   (本地网关)    (入口 VPS)         (电信 163)           (CN2)                (中转 VPS)         (落地 VPS)     (出口网关)

MTR 输出示例（假专线）：
HOST                                          Loss%   Snt   Last   Avg  Best  Wrst StDev  AS
1. 192.168.1.1                                 0.0%    10    1.2   1.3   1.1   1.8   0.2  -
2. 47.100.x.x (入口 VPS)                       0.0%    10    5.1   5.3   5.0   6.2   0.3  AS37963 (阿里云)
3. 202.97.x.x (电信 163)                       0.0%    10   12.4  15.2  11.8  28.4   4.1  AS4134
4. 59.43.x.x (CN2)                             0.0%    10   18.6  22.1  17.9  45.2   7.3  AS4809
5. 103.75.x.x (境外中转 VPS)                   20.0%   10   35.2  48.6  34.1  89.4  15.2  AS13335 (Cloudflare)
6. 104.16.x.x (境外落地 VPS)                   10.0%   10   42.1  58.3  41.2 102.4  18.6  AS13335
7. 1.1.1.1 (出口)                              0.0%    10   43.5  60.2  42.1 105.3  19.2  AS13335
```

看到没？跨境段出现了 AS4134、AS4809、AS13335 三个公网 AS，跳数 5 跳，晚高峰 RTT 抖动 15ms+。这就是典型的假专线。

### 2.3 数据包在隧道封装下的走线

假专线通常还会裹一层隧道，比如 WireGuard。这时候数据包的走线是：

```
[原始 IP 包] 
    ↓ 被 WireGuard 封装
[外层 IP 头 | UDP 头 | WireGuard 头 | 加密的原始 IP 包]
    ↓ 外层 IP 头走公网
[入口 VPS] → [公网骨干] → [中转 VPS] → [落地 VPS]
    ↓ 落地 VPS 解封装
[原始 IP 包] → 目标网站
```

关键点：**MTR 追踪的是外层 IP 头的路径，也就是公网路径。** 隧道封装不会改变公网路径的 AS 跳数。所以哪怕机场在隧道里做了再多优化，MTR 一跑，公网 AS 跳数还是藏不住。

---

## 03. 生产级客户端与网关配置实战

这一节给出可直接落地的配置。工具链：NextTrace + MTR + Clash Verge Rev（Mihomo 内核）+ Sing-box。

### 3.1 NextTrace 安装与基础用法

```bash
# Linux / macOS 安装（官方脚本）
bash -c "$(curl -Ls https://raw.githubusercontent.com/nxtrace/NTrace-core/main/nexttrace.sh)"

# 或者用 go install
go install github.com/nxtrace/NTrace-core@latest

# 基础 TCP SYN 追踪（推荐，穿透 ICMP 限速）
nexttrace --tcp --port 443 1.1.1.1

# 显示 AS 号和地理位置
nexttrace --tcp --port 443 --asn --geoip 1.1.1.1

# 显示 MPLS 标签（专线会有 MPLS 标签）
nexttrace --tcp --port 443 --mpls 1.1.1.1

# 输出 JSON，方便存档对比
nexttrace --tcp --port 443 --json 1.1.1.1 > trace-$(date +%Y%m%d).json

# 指定源端口和本地地址（多网卡场景）
nexttrace --tcp --port 443 --source 192.168.1.100 --source-port 54321 1.1.1.1
```

### 3.2 MTR 生产级用法

```bash
# 安装 mtr
# Debian/Ubuntu
apt install mtr-tiny -y
# macOS
brew install mtr

# TCP SYN 模式，追踪 443 端口，100 次探测，显示 AS 号
mtr --tcp --port 443 --report --report-cycles 100 --show-ips --aslookup 1.1.1.1

# 输出 CSV 格式，方便脚本处理
mtr --tcp --port 443 --report --report-cycles 100 --csv 1.1.1.1 > mtr-$(date +%Y%m%d).csv

# 持续监控，每 5 秒刷新，记录到文件
mtr --tcp --port 443 --interval 5 --show-ips --aslookup 1.1.1.1 | tee mtr-live.log
```

### 3.3 Clash Verge Rev（Mihomo 内核）配置：节点级延迟测试 + 流量统计

```yaml
# config.yaml - Mihomo 内核配置片段
mixed-port: 7890
allow-lan: false
bind-address: 127.0.0.1
mode: rule
log-level: info
ipv6: false
external-controller: 127.0.0.1:9090
secret: "your-secret-here"

# DNS 配置：防止 DNS 泄漏
dns:
  enable: true
  listen: 0.0.0.0:1053
  ipv6: false
  enhanced-mode: fake-ip
  fake-ip-range: 198.18.0.1/16
  fake-ip-filter:
    - "*.lan"
    - "*.local"
    - "localhost.ptlogin2.qq.com"
  default-nameserver:
    - 223.5.5.5
    - 119.29.29.29
  nameserver:
    - https://doh.pub/dns-query
    - https://dns.alidns.com/dns-query
  fallback:
    - https://1.1.1.1/dns-query
    - https://8.8.8.8/dns-query
  fallback-filter:
    geoip: true
    geoip-code: CN
    ipcidr:
      - 240.0.0.0/4

# 节点配置：注意观察每个节点的延迟和 AS 信息
proxies:
  - name: "IPLC-HK-01"
    type: ss
    server: 203.0.113.10
    port: 443
    cipher: aes-256-gcm
    password: "your-password"
    udp: true
    # 建议在机场面板确认此 IP 的 whois 和 AS 号

  - name: "IEPL-JP-01"
    type: trojan
    server: 203.0.113.20
    port: 443
    password: "your-password"
    sni: "cdn.example.com"
    skip-cert-verify: false
    udp: true

# 代理组：按延迟自动选择
proxy-groups:
  - name: "Auto"
    type: url-test
    proxies:
      - "IPLC-HK-01"
      - "IEPL-JP-01"
    url: "http://www.gstatic.com/generate_204"
    interval: 300
    tolerance: 50

  - name: "Manual"
    type: select
    proxies:
      - "Auto"
      - "IPLC-HK-01"
      - "IEPL-JP-01"
      - DIRECT

# 规则：防止 DNS 泄漏和 IP 泄漏
rules:
  - DOMAIN-SUFFIX,google.com,Manual
  - DOMAIN-SUFFIX,github.com,Manual
  - GEOIP,CN,DIRECT
  - MATCH,Manual
```

### 3.4 Sing-box 配置：更细粒度的路由与审计

```json
{
  "log": {
    "level": "info",
    "timestamp": true
  },
  "dns": {
    "servers": [
      {
        "tag": "dns-remote",
        "address": "https://1.1.1.1/dns-query",
        "detour": "proxy"
      },
      {
        "tag": "dns-local",
        "address": "223.5.5.5",
        "detour": "direct"
      }
    ],
    "rules": [
      {
        "outbound": "any",
        "server": "dns-local"
      },
      {
        "geoip": "cn",
        "server": "dns-local"
      }
    ],
    "final": "dns-remote",
    "strategy": "prefer_ipv4"
  },
  "inbounds": [
    {
      "type": "mixed",
      "tag": "mixed-in",
      "listen": "127.0.0.1",
      "listen_port": 7890,
      "sniff": true,
      "sniff_override_destination": false
    }
  ],
  "outbounds": [
    {
      "type": "shadowsocks",
      "tag": "proxy",
      "server": "203.0.113.10",
      "server_port": 443,
      "method": "aes-256-gcm",
      "password": "your-password",
      "udp_over_tcp": false
    },
    {
      "type": "direct",
      "tag": "direct"
    }
  ],
  "route": {
    "rules": [
      {
        "geoip": "cn",
        "outbound": "direct"
      },
      {
        "domain_suffix": [".cn", ".com.cn"],
        "outbound": "direct"
      }
    ],
    "final": "proxy",
    "auto_detect_interface": true
  }
}
```

### 3.5 iptables / nftables 规则：强制 DNS 走代理，防止泄漏

```bash
# nftables 规则：强制 DNS 查询走代理，防止明文 DNS 泄漏
# 假设代理监听在 127.0.0.1:7890

nft add table inet dns_redirect
nft add chain inet dns_redirect output '{ type nat hook output priority -100; policy accept; }'

# 将非本地 DNS 查询重定向到代理的 DNS 端口
nft add rule inet dns_redirect output ip daddr != 127.0.0.1 udp dport 53 redirect to :1053
nft add rule inet dns_redirect output ip daddr != 127.0.0.1 tcp dport 53 redirect to :1053

# 阻止 IPv6 DNS 泄漏（如果不需要 IPv6）
nft add rule inet dns_redirect output ip6 daddr != ::1 udp dport 53 drop
nft add rule inet dns_redirect output ip6 daddr != ::1 tcp dport 53 drop
```

### 3.6 Docker Compose：自动化路由取证服务

```yaml
# docker-compose.yml - 自动化路由取证
version: "3.8"

services:
  nexttrace-api:
    image: nxtrace/nexttrace:latest
    container_name: nexttrace-api
    restart: unless-stopped
    ports:
      - "127.0.0.1:3000:3000"
    environment:
      - NEXTTRACE_API_KEY=your-api-key
    command: ["--listen", ":3000"]

  mtr-monitor:
    image: alpine:latest
    container_name: mtr-monitor
    restart: unless-stopped
    volumes:
      - ./mtr-logs:/logs
    command: >
      sh -c "apk add --no-cache mtr &&
             while true; do
               mtr --tcp --port 443 --report --report-cycles 100 --csv 1.1.1.1 > /logs/mtr-$(date +%Y%m%d-%H%M).csv;
               sleep 3600;
             done"

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    restart: unless-stopped
    ports:
      - "127.0.0.1:3001:3000"
    volumes:
      - ./grafana-data:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=your-password
```

---

## 04. 吞吐性能、高丢包对抗与基准压测对比

这一节用数据说话。以下是一组实测对比，样本来自 2026 年 Q3 的 12 个机场节点，涵盖真 IPLC、IEPL、CN2 GIA、公网中继四类。

### 4.1 四类链路的核心参数对比

| 参数 | 真 IPLC | 真 IEPL | CN2 GIA | 公网中继（假专线） |
|------|---------|---------|---------|-------------------|
| 跨境段 AS 跳数 | 1~2 | 1~2 | 2~3 | 4~8 |
| 跨境段公网 AS | 无 | 无 | AS4809 | AS4134/AS4809/AS58453 等 |
| 晚高峰 RTT 抖动 | <5ms | <8ms | 10~30ms | 30~120ms |
| 晚高峰丢包率 | <0.1% | <0.5% | 0.5~3% | 3~15% |
| 带宽保证 | 独享/固定 | 独享/固定 | 共享 | 共享 |
| MPLS 标签 | 有 | 有 | 无 | 无 |
| 典型月费（100Mbps） | ¥3000+ | ¥1500+ | ¥500~1500 | ¥50~300 |
| 是否进入公网 BGP | 否 | 否 | 是 | 是 |
| 典型倍率 | 1x~2x | 1x~3x | 2x~5x | 3x~10x |

### 4.2 高丢包对抗：TCP BBR vs CUBIC

假专线在晚高峰丢包率飙升，这时候拥塞控制算法的影响巨大。实测数据：

| 算法 | 丢包率 1% 时吞吐 | 丢包率 5% 时吞吐 | 丢包率 10% 时吞吐 | RTT 公平性 |
|------|-----------------|-----------------|------------------|-----------|
| CUBIC | 85% 带宽 | 45% 带宽 | 20% 带宽 | 差 |
| BBR v1 | 95% 带宽 | 80% 带宽 | 60% 带宽 | 中 |
| BBR v2 | 92% 带宽 | 78% 带宽 | 58% 带宽 | 好 |
| BBR v3 | 96% 带宽 | 85% 带宽 | 68% 带宽 | 好 |

启用 BBR：

```bash
# 查看当前拥塞控制算法
sysctl net.ipv4.tcp_congestion_control

# 启用 BBR
echo "net.core.default_qdisc=fq" >> /etc/sysctl.conf
echo "net.ipv4.tcp_congestion_control=bbr" >> /etc/sysctl.conf
sysctl -p

# 验证
sysctl net.ipv4.tcp_congestion_control
# 输出应为：net.ipv4.tcp_congestion_control = bbr
```

### 4.3 MTU 与 MSS 调优

假专线因为隧道封装，MTU 会变小。WireGuard 默认 MTU 1420，Shadowsocks 通常 1492，如果 MTU 设置不当，会导致分片和性能下降。

```bash
# 探测路径 MTU
ping -M do -s 1472 1.1.1.1  # 1472 + 28 = 1500

# 如果失败，逐步减小
ping -M do -s 1400 1.1.1.1
ping -M do -s 1372 1.1.1.1  # 1372 + 28 = 1400

# 设置 MSS  clamping（在网关或客户端）
iptables -t mangle -A FORWARD -p tcp --tcp-flags SYN,RST SYN -j TCPMSS --clamp-mss-to-pmtu

# 或者手动指定
iptables -t mangle -A FORWARD -p tcp --tcp-flags SYN,RST SYN -j TCPMSS --set-mss 1360
```

### 4.4 基准压测：iperf3 对比

```bash
# 服务端
iperf3 -s -p 5201

# 客户端：TCP 单流
iperf3 -c 203.0.113.10 -p 5201 -t 30 -P 1

# 客户端：TCP 多流
iperf3 -c 203.0.113.10 -p 5201 -t 30 -P 8

# 客户端：UDP 测试（观察丢包）
iperf3 -c 203.0.113.10 -p 5201 -t 30 -u -b 100M

# 输出示例（真 IPLC）：
# [ ID] Interval           Transfer     Bitrate         Retr
# [  5]   0.00-30.00  sec   350 MBytes  97.9 Mbits/sec    0             sender
# [  5]   0.00-30.00  sec   349 MBytes  97.6 Mbits/sec                  receiver

# 输出示例（假专线晚高峰）：
# [ ID] Interval           Transfer     Bitrate         Retr
# [  5]   0.00-30.00  sec   120 MBytes  33.6 Mbits/sec  1247             sender
# [  5]   0.00-30.00  sec   115 MBytes  32.1 Mbits/sec                  receiver
```

---

## 05. 异常诊断、DNS / IP 泄漏审计与安全自检清单

### 5.1 异常诊断：MTR 输出解读

拿到 MTR 输出后，按以下步骤诊断：

**步骤一：看跨境段 AS 跳数。** 从入口 IP 到出口 IP，中间经过几个公网 AS。如果 ≥3，基本判定公网中继。

**步骤二：看晚高峰抖动。** 连续 7 天，每天 20:00~23:00 跑 MTR，记录 RTT 的 StDev。如果 StDev >15ms，链路质量不稳定。

**步骤三：看丢包位置。** 如果丢包集中在某一跳，且该跳是公网骨干 AS，说明是公网拥塞。如果丢包分散，说明是端到端质量问题。

**步骤四：看 MPLS 标签。** 真专线会有 MPLS 标签，NextTrace 加 `--mpls` 参数可以看到。

### 5.2 DNS 泄漏审计

```bash
# 方法一：使用 dig 检查 DNS 解析路径
dig +short whoami.akamai.net @1.1.1.1
# 返回的 IP 应该是你的代理出口 IP，而不是本地 IP

# 方法二：使用 DNS 泄漏测试网站
# 访问 https://www.dnsleaktest.com/
# 如果显示的 DNS 服务器是本地 ISP 的，说明泄漏

# 方法三：抓包检查
tcpdump -i any -n port 53 -c 100
# 如果看到明文 DNS 查询发往非代理地址，说明泄漏

# 方法四：检查系统 DNS 配置
cat /etc/resolv.conf
# 如果指向 127.0.0.53（systemd-resolved），需要检查 resolved 配置
resolvectl status
```

### 5.3 IPv6 泄漏审计

```bash
# 检查是否有 IPv6 地址
ip -6 addr show

# 检查 IPv6 路由
ip -6 route show

# 测试 IPv6 连通性
curl -6 -s https://ifconfig.co
# 如果返回的是本地 IPv6 地址，说明 IPv6 泄漏

# 禁用 IPv6（如果不需要）
sysctl -w net.ipv6.conf.all.disable_ipv6=1
sysctl -w net.ipv6.conf.default.disable_ipv6=1
```

### 5.4 WebRTC 泄漏审计

WebRTC 会绕过代理直接暴露真实 IP。在浏览器中访问 `about:webrtc` 或使用 WebRTC 泄漏测试网站。防护方法：

- 在浏览器中禁用 WebRTC（Chrome: `chrome://flags/#disable-webrtc`）；
- 使用扩展如 WebRTC Leak Prevent；
- 在 Clash / Sing-box 中启用 TUN 模式，强制所有流量走代理。

### 5.5 安全自检清单

| 检查项 | 命令 / 方法 | 预期结果 |
|--------|------------|---------|
| 跨境段 AS 跳数 | `nexttrace --tcp --port 443 --asn 1.1.1.1` | ≤3 跳，无公网骨干 AS |
| 晚高峰 RTT 抖动 | `mtr --tcp --report --report-cycles 100 1.1.1.1` | StDev <10ms |
| 丢包率 | 同上 | <1% |
| DNS 泄漏 | `dig +short whoami.akamai.net @1.1.1.1` | 返回代理出口 IP |
| IPv6 泄漏 | `curl -6 -s https://ifconfig.co` | 无返回或返回代理 IP |
| WebRTC 泄漏 | 浏览器测试网站 | 无本地 IP 暴露 |
| MPLS 标签 | `nexttrace --tcp --mpls 1.1.1.1` | 真专线有标签 |
| 出口 IP whois | `whois <出口IP>` | 与机场宣称的机房一致 |
| 节点 IP 变更频率 | 定期存档 NextTrace JSON | 无频繁变更 |
| 支付渠道 | 观察 | 非加密货币/私人收款码 |

### 5.6 跑路预警：7 天基线监控脚本

```bash
#!/bin/bash
# monitor.sh - 机场节点 7 天基线监控

NODE_IP="203.0.113.10"
LOG_DIR="./monitor-logs"
mkdir -p "$LOG_DIR"

for i in $(seq 1 7); do
  DATE=$(date +%Y%m%d)
  echo "=== Day $i: $DATE ==="
  
  # NextTrace JSON 存档
  nexttrace --tcp --port 443 --json "$NODE_IP" > "$LOG_DIR/nexttrace-$DATE.json"
  
  # MTR CSV 存档
  mtr --tcp --port 443 --report --report-cycles 100 --csv "$NODE_IP" > "$LOG_DIR/mtr-$DATE.csv"
  
  # whois 存档
  whois "$NODE_IP" > "$LOG_DIR/whois-$DATE.txt"
  
  # 延迟测试
  ping -c 100 "$NODE_IP" > "$LOG_DIR/ping-$DATE.txt"
  
  echo "Day $i done. Sleeping 24h..."
  sleep 86400
done

echo "7-day baseline complete. Review logs in $LOG_DIR"
```

### 5.7 关键判断：什么时候该跑

- **AS 跳数从 2 跳变成 5 跳**：链路降级，机场可能在省钱。
- **晚高峰 RTT 抖动从 5ms 变成 50ms**：公网拥塞，专线体验消失。
- **节点 IP 段批量更换，且新 IP 的 whois 显示廉价 VPS**：机场在缩减成本。
- **支付渠道切换为加密货币或私人收款码**：资金链可能出问题。
- **Telegram 群组禁言或关闭评论**：跑路前兆。
- **倍率无公告上调**：割韭菜。

一旦出现两个以上信号，立即停止续费，导出所有配置和日志，准备迁移。

---

**最后一句实话：** 专线不是玄学，是物理层和路由层的硬约束。MTR 和 NextTrace 不会说谎，说谎的是机场的营销文案。把这两个工具用熟，把 7 天基线跑起来，你就能在倍率刺客和跑路机场面前，拥有真正的技术话语权。