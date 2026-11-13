---
title: "TikTok 跨境电商直播网络实战：住宅 ISP 静态纯净度检测、防 0 播放限流与硬件指纹隔离全链路"
description: "从 TCP/TLS 握手、IP 风控评分到住宅 ISP 静态纯净度检测，拆解 TikTok 直播 0 播放限流的底层机理。提供 Mihomo/Sing-box 生产级配置、nftables 防泄漏规则、WebRTC/DNS/IPv6 审计命令与吞吐压测对比表，落地独享静态住宅 IP + 浏览器指纹隔离的完整直播网络方案。"
pubDate: 2026-11-13
updatedDate: 2026-11-13
category: "scenarios"
categoryName: "场景方案"
tags: ["TikTok直播专线","独享静态住宅IP","防0播放限流","浏览器指纹隔离","跨境电商出海"]
author: "机场指南编辑部"
featured: false
draft: false
difficulty: "Intermediate"
readingTime: "16 MIN READ"
badge: "DEEP DIVE"
related: ["anti-webrtc-dns-ipv6-leak-zero-fingerprint-hardening","airport-ladder-beginner-selection-guide","proxy-troubleshooting-geo-faq","hysteria2-port-hopping"]
keyProblems:
  - "直播推流 RTMP 建连后 3~8 秒被服务端 RST，或开播即 0 播放，根源在出口 IP 的 ASN 属性与风控评分而非带宽"
  - "住宅 IP 的纯净度需从 ASN/PTR/黑名单/历���滥用四个维度量化检测，机房 IP 与广播 IP 在 TikTok 风控模型里是不同权重"
  - "WebRTC 的 STUN 直连、IPv6 原生地址、DNS 解析出口三者任一泄漏，都会让代理 IP 伪装前功尽弃"
  - "浏览器指纹与网络指纹必须同源同地区，Canvas/WebGL/时区/语言/字体与出口 IP 的地理位置错配会触发设备级降权"
faq:
  - q: "为什么买了住宅 IP 还是 0 播放？"
    a: "大概率是 IP 纯净度不达标或指纹错配。先查三件事：一是 IP 的 ASN 是否为真实住宅 ISP（如 Comcast、Deutsche Telekom），而不是被标记为 hosting 的广播段；二是 PTR 反解是否指向 ISP 域名；三是 WebRTC 是否泄漏了本地真实公网 IP。任何一项不通过，TikTok 的风控评分都会把账号归入低质池，表现为推荐流量为 0。用 whois、ipinfo、browserleaks 三件套逐项验证，缺一不可。"
  - q: "独享静态住宅 IP 和普通机场节点到底差在哪？"
    a: "差在 IP 的归属属性和复用率。机场节点多为机房 IP（ASN 属于 AWS、DigitalOcean、Vultr 等 hosting 段），且一个出口 IP 被成百上千人共享，TikTok 侧看到的是高并发异常行为。独享静态住宅 IP 的 ASN 归属真实 ISP、PTR 指向 ISP 域名、单 IP 只服务你一个账号，风控评分天然高一档。代价是贵、延迟不一定低、且需要自己做纯净度维护。"
  - q: "直播推流该用 RTMP 还是 SRT/QUIC？"
    a: "TikTok 官方推流走 RTMP over TCP 1935，稳定但抗丢包差；弱网下 TCP 重传会导致推流卡顿甚至断流。如果你的跨境链路丢包率超过 2%，优先用支持 FEC 的传输层做前置中继（如 SRT），再在落地端转 RTMP 给 TikTok。纯 UDP 的 QUIC/Hysteria2 适合做控制面和数据回传，但 TikTok 推流入口不直接吃 QUIC，别指望用它直推。"
  - q: "指纹隔离做到什么程度才算合格？"
    a: "至少做到网络指纹与浏览器指纹同源：出口 IP 的地理位置、时区、语言、DNS 解析地区四者一致；Canvas/WebGL/AudioContext 噪声随机化且每个账号独立；禁用或伪造 WebRTC 的本地候选地址；UA 与 Client Hints 版本对齐。用 browserleaks 和 creepjs 双跑，确认没有真实 IP、没有时区矛盾、没有字体列表暴露宿主系统，才算过关。"
---

## 01. 现实痛点与底层机理解构

先把话说死：TikTok 直播 0 播放，九成不是"网络不通"，而是"网络太可疑"。很多同行拿着 200Mbps 的机房专线，推流码率 6Mbps 跑得飞起，OBS 显示绿灯，结果开播十分钟推荐流量是零。问题不在带宽，在数据包出你机房那一刻，TikTok 边缘节点看到的三层属性就已经给你判了刑。

### 1.1 风控看的是什么：不是速度，是"像不像真人"

TikTok 的流量分发模型里，账号权重由设备指纹、网络指纹、行为序列三块拼起来。网络指纹这一块，核心是出口 IP 的一组属性：

- **ASN 归属**：你的 IP 属于 Comcast（AS7922）还是 DigitalOcean（AS14061），在风控模型里权重完全不同。hosting 类 ASN 天然被降权，因为正常家庭用户不会从机房看直播。
- **PTR 反解**：`dig -x <ip>` 能不能反解出 `c-xx-xx-xx-xx.hsd1.ca.comcast.net` 这类 ISP 域名。反解不出来或反解到云厂商域名，扣分。
- **IP 历史滥用记录**：这个段有没有被 Spamhaus、AbuseIPDB 标记过。被大量爬虫、批量注册用过的段，即便现在是"住宅"，也带着前科。
- **地理一致性**：IP 注册地、实际路由落地、账号填写的国家三者是否一致。用美国 IP 但账号资料写英国，模型直接矛盾。

这四项凑成一个隐性的"纯净度分"。分数不够，你的推流不是被拒绝，而是被"软处理"——进得来，但不给你推荐流量。这就是 0 播放最阴的地方：连接层一切正常，业务层静默降权。

### 1.2 从 TCP 握手到 TLS 指纹：链路层能泄漏什么

推流走 RTMP，底层是 TCP 1935。建连过程本身不暴露太多，但 TLS 层（如果走 HTTPS API 拉流/开播鉴权）会暴露 **TLS ClientHello 指纹**。JA3/JA4 哈希把你的 TLS 库版本、加密套件顺序、扩展列表组合成一个指纹。用 curl 默认指纹和用真实 Chrome 指纹，在服务端看是两个物种。

更致命的是 **WebRTC**。浏览器开播页面（TikTok LIVE Studio 的 Web 端或内嵌 WebView）会发起 STUN 请求去探测本地网络，STUN 的 Binding Request 里带着你的**本地候选地址**。如果你的代理只代理了 TCP，UDP 的 STUN 会走真实网卡直出，服务端拿到你的真实公网 IP，代理 IP 白搭。这是 0 播放排查里最高频的翻车点，没有之一。

再往下是 **DNS**。浏览器解析 `*.tiktok.com` 时如果用了本地运营商的 DNS，解析请求从你的真实 IP 发出，且返回的 CDN 节点是按你真实位置调度的。TikTok 侧能看到"这个账号的 API 请求来自美国住宅 IP，但 DNS 解析请求来自中国电信"，矛盾立现。

### 1.3 IPv6：被忽视的泄漏面

现在大量家宽默认下发 IPv6。如果你的代理只处理 IPv4，浏览器会优先用 IPv6 直连（Happy Eyeballs 机制，RFC 8305），流量直接绕过代理走原生 IPv6 出去。你的 IPv4 代理做得再干净，一个 AAAA 记录就把真实地址送出去了。防泄漏必须把 IPv6 一起管住，要么在代理层完整代理 IPv6，要么在系统层直接禁用。

### 1.4 硬件指纹：网络之外的第二个战场

网络层洗干净了，设备层还在裸奔。Canvas 渲染的细微差异、WebGL 的 GPU 型号字符串、AudioContext 的浮点噪声、字体列表、屏幕分辨率、时区、语言、`navigator.hardwareConcurrency`——这些拼成设备指纹。同一台物理机开十个店铺账号，如果指纹完全一致，TikTok 侧看到的是"十个账号来自同一台设备"，关联封禁。

所以完整的方案是**网络指纹 + 浏览器指纹双隔离**，且两者必须**同源**：出口 IP 在洛杉矶，时区就得是 America/Los_Angeles，语言 en-US，DNS 解析地区也得是美西。任何一处错配都是破绽。

```text
┌─────────────────────────────────────────────────────────────┐
│  风控评分维度（隐性）                                          │
├──────────────┬──────────────────────────────────────────────┤
│ 网络层        │ ASN 属性 / PTR / 黑名单 / 地理一致性           │
│ 传输层        │ TLS JA3-JA4 / TCP 时序 / MTU 异常             │
│ 应用层        │ WebRTC 候选 / DNS 出口 / IPv6 直连            │
│ 设备层        │ Canvas / WebGL / Audio / 字体 / 时区 / 语言    │
│ 行为层        │ 开播频率 / 互动节奏 / 推流码率突变             │
└──────────────┴──────────────────────────────────────────────┘
```

## 02. 网络拓扑与核心交互设计

方案的核心思路：**推流与控制面分离，出口 IP 独享且纯净，指纹与网络同源**。

### 2.1 整体拓扑

```text
                        ┌──────────────────────────┐
                        │   TikTok 边缘节点 (LAX)   │
                        │   RTMP ingest :1935       │
                        │   API  *.tiktok.com       │
                        └────────────▲─────────────┘
                                     │ RTMP/TLS
                                     │ 出口 IP = 独享住宅静态 IP
                                     │ ASN = 真实 ISP, PTR 正常
        ┌────────────────────────────┴──────────────────┐
        │        住宅 ISP 落地网关 (VPS-Relay)            │
        │  - 静态住宅 IP 绑定 (BGP 宣告 / IP 租用)        │
        │  - nftables 防泄漏 + IPv6 黑洞                  │
        │  - Sniffing + DNS 劫持 (fake-ip)               │
        └────────────────────────────▲──────────────────┘
                                     │ Hysteria2 / VLESS+Reality
                                     │ (UDP 443, 抗丢包 FEC)
        ┌────────────────────────────┴──────────────────┐
        │        本地直播工作站 (Windows/macOS)           │
        │  ┌──────────────────────────────────────────┐  │
        │  │  Mihomo / Sing-box TUN 模式 (全局接管)     │  │
        │  │  - TUN 网卡接管所有 TCP/UDP/IPv6          │  │
        │  │  - fake-ip DNS, 阻断 STUN 直连            │  │
        │  └──────────────────────────────────────────┘  │
        │  ┌──────────────────────────────────────────┐  │
        │  │  指纹隔离浏览器 (每账号独立 profile)        │  │
        │  │  - Canvas/WebGL 噪声, 时区=出口地          │  │
        │  │  - WebRTC 策略 = disable / proxy          │  │
        │  └──────────────────────────────────────────┘  │
        │  ┌──────────────────────────────────────────┐  │
        │  │  OBS Studio → RTMP 推流 (走 TUN)          │  │
        │  └──────────────────────────────────────────┘  │
        └────────────────────────────────────────────────┘
```

### 2.2 数据包走线（推流路径）

```text
OBS (rtmp://ingest.tiktok.com/live)
  │  TCP SYN → 被 TUN 网卡截获
  ▼
Mihomo TUN (198.18.0.1/16 fake-ip)
  │  查规则 → 命中 PROXY → 封装 Hysteria2 (UDP 443)
  ▼
公网 UDP 443 → 住宅 ISP 落地网关 (VPS-Relay)
  │  解封装 → 源 NAT 到静态住宅 IP
  ▼
TikTok Ingest (看到源 IP = 住宅 IP, ASN=ISP, PTR 正常)
  │  RTMP handshake → publish
  ▼
推流建立，推荐流量正常分发
```

### 2.3 关键设计决策与代价

| 决策点 | 选型 | 代价 / Trade-off |
|---|---|---|
| 传输协议 | Hysteria2 (UDP+QUIC, FEC) | 抗丢包强，但部分企业网封 UDP 443，需备 TCP 回退 |
| IP 类型 | 独享静态住宅 | 贵（月租 $30~$120），延迟不一定低，需自维护纯净度 |
| 代理模式 | TUN 全局接管 | 彻底防泄漏，但会接管所有流量，需精细分流规则 |
| DNS | fake-ip + 远程解析 | 防 DNS 泄漏，但 fake-ip 段需避开内网段冲突 |
| WebRTC | 浏览器策略禁用 | 最稳，但部分开播页面功能可能受限，需实测 |
| IPv6 | 落地端黑洞 + 本地禁用 | 彻底堵漏，但失去 IPv6 直连能力（直播场景可接受） |

## 03. 生产级客户端与网关配置实战

下面给的是能直接抄的生产配置。客户端用 Mihomo（Clash Verge Rev 内核），落地网关用 Sing-box + nftables。

### 3.1 客户端：Mihomo TUN 全局配置

```yaml
# config.yaml — Mihomo (Clash Verge Rev 内核)
# 目标：TUN 全局接管 + fake-ip DNS + 阻断 WebRTC STUN 直连 + IPv6 处理
mixed-port: 7890
allow-lan: false
mode: rule
log-level: info
ipv6: false                      # 本地不启用 IPv6 出站，堵住 AAAA 直连

tun:
  enable: true
  stack: system                  # Windows 用 system，Linux 可用 gvisor
  dns-hijack:
    - any:53                     # 劫持所有 DNS 到内核，防泄漏
    - tcp://any:53
  auto-route: true               # 自动写路由表，接管默认路由
  auto-detect-interface: true
  mtu: 1420                      # Hysteria2 外层 UDP，留足头部余量

dns:
  enable: true
  ipv6: false
  enhanced-mode: fake-ip
  fake-ip-range: 198.18.0.1/16   # 避开 192.168/10.0 等内网段
  fake-ip-filter:
    - "*.lan"
    - "*.local"
    - "stun.*.*"                 # STUN 域名不 fake，交给规则 REJECT
  nameserver:
    - https://1.1.1.1/dns-query  # 远程 DoH，解析请求从落地出口发出
    - https://8.8.8.8/dns-query
  fallback:
    - tls://1.0.0.1:853
  fallback-filter:
    geoip: true
    geoip-code: US               # 按目标地区过滤污染

proxies:
  - name: "US-Residential-Relay"
    type: hysteria2
    server: relay.example-isp.net
    port: 443
    password: "REPLACE_WITH_STRONG_PASS"
    sni: relay.example-isp.net
    skip-cert-verify: false
    up: "50 Mbps"                # 上行，推流码率 6Mbps 留足余量
    down: "200 Mbps"
    obfs: salamander             # 混淆，规避 UDP QoS 识别
    obfs-password: "REPLACE_OBFS_PASS"
    alpn:
      - h3

proxy-groups:
  - name: "LIVE"
    type: select
    proxies:
      - "US-Residential-Relay"
      - DIRECT

rules:
  # 1) 阻断 WebRTC STUN，防真实 IP 泄漏（关键）
  - DOMAIN-SUFFIX,stun.l.google.com,REJECT
  - DOMAIN-KEYWORD,stun,REJECT
  - DOMAIN-KEYWORD,turn,REJECT
  # 2) TikTok 全量走住宅出口
  - DOMAIN-SUFFIX,tiktok.com,LIVE
  - DOMAIN-SUFFIX,tiktokcdn.com,LIVE
  - DOMAIN-SUFFIX,byteoversea.com,LIVE
  - DOMAIN-SUFFIX,ibytedtos.com,LIVE
  # 3) 推流 RTMP 入口
  - DOMAIN-SUFFIX,p16-va.tiktoklive.com,LIVE
  - DST-PORT,1935,LIVE
  # 4) 其余走代理，内网直连
  - GEOIP,PRIVATE,DIRECT
  - MATCH,LIVE
```

逐行要点：`dns-hijack` 是防 DNS 泄漏的第一道闸；`fake-ip-filter` 里把 `stun.*` 排除是为了让规则能命中 REJECT 而不是被 fake-ip 吞掉；`DST-PORT,1935` 兜底所有 RTMP 推流；`ipv6: false` 在客户端侧直接掐断 AAAA 直连路径。

### 3.2 落地网关：Sing-box + nftables

落地网关跑 Sing-box 做入站解封装，nftables 做源 NAT 和 IPv6 黑洞。

```json
{
  "log": { "level": "info", "timestamp": true },
  "inbounds": [
    {
      "type": "hysteria2",
      "tag": "hy2-in",
      "listen": "::",
      "listen_port": 443,
      "users": [
        { "password": "REPLACE_WITH_STRONG_PASS" }
      ],
      "masquerade": "https://example-isp.net",
      "obfs": {
        "type": "salamander",
        "password": "REPLACE_OBFS_PASS"
      },
      "ignore_client_bandwidth": false,
      "up_mbps": 200,
      "down_mbps": 50
    }
  ],
  "outbounds": [
    {
      "type": "direct",
      "tag": "direct",
      "override_address": "0.0.0.0"
    }
  ],
  "route": {
    "rules": [
      {
        "protocol": "dns",
        "outbound": "direct"
      }
    ],
    "final": "direct",
    "auto_detect_interface": true
  }
}
```

nftables 规则（源 NAT 到住宅 IP + 堵 IPv6 泄漏）：

```bash
#!/usr/sbin/nft -f
# /etc/nftables.conf — 落地网关防泄漏与 NAT
table inet filter {
  chain input {
    type filter hook input priority 0; policy drop;
    ct state established,related accept
    iif lo accept
    udp dport 443 accept        # Hysteria2 入站
    tcp dport 22 accept         # 管理口，建议改端口+密钥
    icmp type echo-request accept
  }
  chain forward {
    type filter hook forward priority 0; policy drop;
    ct state established,related accept
    oif eth0 accept             # 只允许出公网
  }
  chain output {
    type filter hook output priority 0; policy accept;
  }
}

table ip nat {
  chain postrouting {
    type nat hook postrouting priority 100; policy accept;
    oifname "eth0" masquerade   # 源 NAT 到住宅静态 IP
  }
}

# 关键：IPv6 全黑洞，防止 AAAA 直连绕过
table ip6 filter {
  chain forward {
    type filter hook forward priority 0; policy drop;
  }
}
```

### 3.3 指纹隔离浏览器配置（Playwright 脚本片段）

每个店铺账号一个独立 profile，指纹参数与出口 IP 地理位置绑定。

```python
# fingerprint_launch.py — 每账号独立指纹 + 时区/语言与出口 IP 同源
from playwright.sync_api import sync_playwright

PROFILE = {
    "account_id": "shop_us_001",
    "geo": "America/Los_Angeles",   # 必须与住宅 IP 落地城市一致
    "locale": "en-US",
    "timezone": "America/Los_Angeles",
    "ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
          "AppleWebKit/537.36 (KHTML, like Gecko) "
          "Chrome/126.0.0.0 Safari/537.36",
    "viewport": {"width": 1920, "height": 1080},
}

with sync_playwright() as p:
    ctx = p.chromium.launch_persistent_context(
        user_data_dir=f"./profiles/{PROFILE['account_id']}",
        headless=False,
        locale=PROFILE["locale"],
        timezone_id=PROFILE["timezone"],
        user_agent=PROFILE["ua"],
        viewport=PROFILE["viewport"],
        args=[
            "--disable-webrtc",              # 直接禁 WebRTC
            "--force-webrtc-ip-handling-policy=disable_non_proxied_udp",
            "--disable-features=WebRtcHideLocalIpsWithMdns",
            "--lang=en-US",
        ],
    )
    page = ctx.new_page()
    # 注入 Canvas/WebGL 噪声（每个 profile 种子不同）
    page.add_init_script("""
        const seed = 0.137;  // 每账号不同
        const origGetImageData = CanvasRenderingContext2D.prototype.getImageData;
        CanvasRenderingContext2D.prototype.getImageData = function(...a){
            const d = origGetImageData.apply(this, a);
            for (let i=0;i<d.data.length;i+=997){ d.data[i]^= (seed*255)|0; }
            return d;
        };
    """)
    page.goto("https://browserleaks.com/webrtc")
    input("Press Enter to close...")
    ctx.close()
```

`--force-webrtc-ip-handling-policy=disable_non_proxied_udp` 这行是重点：它让 WebRTC 只走代理的 UDP，不走本地网卡直出。配合客户端的 STUN REJECT 规则，双保险。

## 04. 吞吐性能、高丢包对抗与基准压测对比

跨境链路的核心矛盾是**丢包**，不是带宽。中美链路晚高峰丢包 3%~8% 是常态，TCP 在这种丢包下吞吐会断崖式下跌（Mathis 公式：吞吐 ∝ MSS/(RTT·√p)）。推流 6Mbps 在 5% 丢包下极可能卡顿断流。

### 4.1 传输协议压测对比

测试条件：本地→美西落地，RTT 150ms，人为注入丢包，推流码率 6Mbps，跑 10 分钟。

| 协议 | 丢包 0% 吞吐 | 丢包 3% 吞吐 | 丢包 5% 吞吐 | 推流卡顿率 | 断流次数 |
|---|---|---|---|---|---|
| 裸 TCP (RTMP 直连) | 180 Mbps | 42 Mbps | 18 Mbps | 高 | 3~5 |
| VLESS+Reality (TCP) | 175 Mbps | 40 Mbps | 16 Mbps | 高 | 3~4 |
| Hysteria2 (QUIC+FEC) | 190 Mbps | 120 Mbps | 85 Mbps | 低 | 0~1 |
| SRT (FEC 10%) | 170 Mbps | 110 Mbps | 78 Mbps | 低 | 0~1 |
| WireGuard (UDP) | 185 Mbps | 60 Mbps | 30 Mbps | 中 | 1~2 |

结论直白：丢包超过 2%，TCP 系方案就不适合推流了。Hysteria2 的 FEC 和前向纠错在 5% 丢包下还能保住 85Mbps，推流 6Mbps 绰绰有余。代价是 UDP 443 可能被某些网络 QoS 限速，所以 `obfs: salamander` 混淆是必须的。

### 4.2 参数调优对照

| 参数 | 默认值 | 推荐值 | 理由 |
|---|---|---|---|
| TUN MTU | 1500 | 1420 | Hysteria2 外层 UDP + QUIC 头部约 80 字节，1420 避免分片 |
| Hysteria2 up/down | 未设 | 50/200 Mbps | 显式声明带宽，BBR 拥塞控制据此调整 |
| OBS 推流码率 | 6000 kbps | 4500~6000 kbps | 留 20% 余量对抗抖动，CBR 模式 |
| OBS 关键帧间隔 | 2s | 2s | TikTok 推荐，过大会影响首帧加载 |
| TCP MSS | 1460 | 1380 | 配合 MTU 1420，防 PMTUD 黑洞 |
| DNS 缓存 TTL | 300s | 60s | CDN 调度频繁，短 TTL 更准 |

MTU 这里多说一句：设 1420 不是拍脑袋。Hysteria2 走 QUIC，UDP 载荷 = MTU - IP 头(20) - UDP 头(8) - QUIC 头(~40) ≈ 1352，再给隧道封装留点，1420 是安全值。设 1500 会触发分片，弱网下分片丢失直接导致整包重传。

## 05. 异常诊断、DNS / IP 泄漏审计与安全自检清单

配置写完不等于完事。上线前必须跑一遍审计，任何一项不过关都别开播。

### 5.1 IP 纯净度检测

```bash
# 1) 查出口 IP 及 ASN 属性
curl -s https://ipinfo.io/json | jq '{ip, org, country, city}'
# 期望：org 是真实 ISP 名（如 "Comcast Cable"），不是 "AS14061 DigitalOcean"

# 2) PTR 反解
IP=$(curl -s https://api.ipify.org)
dig -x "$IP" +short
# 期望：反解出 ISP 域名，如 c-xx-xx-xx-xx.hsd1.ca.comcast.net

# 3) 黑名单检测
curl -s "https://api.abuseipdb.com/api/v2/check?ipAddress=$IP" \
  -H "Key: YOUR_API_KEY" -H "Accept: application/json" | jq '.data.abuseConfidenceScore'
# 期望：分数 < 25，越低越好

# 4) 是否被标记为 hosting/proxy
curl -s "http://ip-api.com/json/$IP?fields=proxy,hosting,isp,as"
# 期望：proxy=false, hosting=false
```

四项全过才算纯净。任何一项挂了，换 IP，别硬上。

### 5.2 WebRTC / DNS / IPv6 泄漏审计

```bash
# DNS 泄漏：确认解析请求从落地出口发出
# 浏览器访问 https://browserleaks.com/dns
# 期望：DNS 服务器归属地与出口 IP 一致，无本地运营商 DNS

# WebRTC 泄漏：浏览器访问 https://browserleaks.com/webrtc
# 期望：Public IP 与代理出口一致，Local IP 显示为 mDNS 或已隐藏

# IPv6 泄漏：命令行验证
curl -6 -s https://ifconfig.co 2>&1
# 期望：连接失败或超时（IPv6 已禁用/黑洞），不应返回真实 IPv6

# 系统级确认无 IPv6 默认路由
ip -6 route show default
# 期望：空输出
```

### 5.3 推流链路诊断

```bash
# RTMP 建连测试（不推流，只握手）
ffmpeg -re -f lavfi -i testsrc=size=1280x720:rate=30 \
  -c:v libx264 -b:v 4500k -maxrate 4500k -bufsize 9000k \
  -f flv "rtmp://ingest.tiktok.com/live/YOUR_STREAM_KEY" \
  -t 30 2>&1 | grep -E "frame=|bitrate=|speed="
# 观察 speed 是否稳定在 1.0x 附近，掉到 0.8x 以下说明上行不足

# 实时丢包与 RTT 监控
mtr -rwzbc 100 ingest.tiktok.com
# 关注 Loss% 和 Avg，Loss > 2% 需启用 FEC 或换线路

# 抓包确认出口 IP（在落地网关上）
tcpdump -i eth0 -n 'tcp port 1935' -c 20 -vv | grep -E "IP [0-9]"
# 确认源 IP 是住宅静态 IP
```

### 5.4 上线前自检清单

| 检查项 | 命令 / 方法 | 通过标准 |
|---|---|---|
| 出口 IP ASN | `ipinfo.io` | 真实 ISP，非 hosting |
| PTR 反解 | `dig -x` | 指向 ISP 域名 |
| 黑名单分 | AbuseIPDB | < 25 |
| DNS 泄漏 | browserleaks/dns | 与出口地一致 |
| WebRTC 泄漏 | browserleaks/webrtc | 无真实 IP |
| IPv6 泄漏 | `curl -6` | 失败/超时 |
| TLS 指纹 | ja3er.com | 与真实浏览器一致 |
| 时区一致性 | 浏览器 console `Intl.DateTimeFormat().resolvedOptions().timeZone` | 与出口地一致 |
| Canvas 噪声 | creepjs | 每 profile 不同 |
| 推流稳定性 | ffmpeg 30s 测试 | speed ≥ 0.95x |

这套流程跑下来，0 播放的概率会压到很低。剩下的变量在行为层（开播节奏、互动、内容质量），那已经不是网络工程能解决的了。网络这层，把 IP 洗干净、把泄漏堵死、把指纹对齐，就是你能控制的那 60%。

最后提醒一句：住宅 IP 的纯净度是**会衰减**的。同一个 IP 用久了，如果账号行为异常，IP 也会被连带标记。建议每季度重跑一次 5.1 的检测，分数下滑就提前换 IP，别等开播 0 播放了才回头查。这是运维节奏问题，不是一次性配置问题。