---
title: "2026 AI 生产力大模型防风控专线架构：ChatGPT、Claude 3.5 与 Cursor 纯净原生住宅 IP 深度分流与 ASN 欺诈分过滤实战"
description: "从 TLS 指纹、ASN 欺诈评分到住宅 ISP 原生 IP 分流，拆解 ChatGPT、Claude 3.5 与 Cursor 在 2026 年持续被封的底层机理。给出 Sing-box / Mihomo 生产级分流配置、QUIC 与 MTU 调优、DNS 泄漏审计与 Cloudflare 盾绕过实操，附压测对比与排错命令。"
pubDate: 2026-10-25
updatedDate: 2026-10-25
category: "scenarios"
categoryName: "场景方案"
tags: ["ChatGPT防封","Claude原生IP","Cursor代理配置","住宅ISP","ASN欺诈评分","Cloudflare盾绕过"]
author: "机场指南编辑部"
featured: false
draft: false
difficulty: "Intermediate"
readingTime: "15 MIN READ"
badge: "DEEP DIVE"
related: ["docker-sing-box-router","ai-productivity-routing","proxy-troubleshooting-geo-faq","best-airports-for-chatgpt-claude"]
keyProblems:
  - "机房 IP 段整段被 OpenAI / Anthropic 标记为高风险，登录即触发 Cloudflare 403 或人机验证死循环"
  - "TLS ClientHello 指纹（JA3/JA4）与目标站点期望的浏览器栈不匹配，握手层即被盾拦截"
  - "DNS 解析走本地运营商，导致 ECS 子网泄漏与 IP 归属地矛盾，触发 ASN 欺诈分飙升"
  - "Cursor 走系统代理但 Node.js 内核不读环境变量，请求直连暴露真实出口 IP"
faq:
  - q: "为什么我买了所谓的原生 IP，ChatGPT 还是弹 Cloudflare 验证？"
    a: "原生 IP 只解决 IP 归属地问题，不解决 ASN 声誉与 TLS 指纹问题。Cloudflare 的 Bot Management 会综合 JA3/JA4 指纹、ASN 历史欺诈分、请求头顺序、HTTP/2 帧序做评分。机房 ASN（如 AS13335、AS16509 的部分段）即便标注为原生，历史滥用记录也会拉高评分。正确做法是使用住宅 ISP ASN（如 Comcast AS7922、Verizon AS701）的静态 IP，并让代理客户端的 TLS 指纹与真实浏览器对齐。"
  - q: "Cursor 明明设置了系统代理，为什么还是提示地区不支持？"
    a: "Cursor 基于 Electron + Node.js，主进程的 net 模块不读 HTTP_PROXY/HTTPS_PROXY 环境变量，只认系统代理或显式传入的 agent。必须在 Cursor 设置里开启 Http: Proxy Support 为 override，或通过 TUN 模式在网卡层接管全部流量。仅靠环境变量在部分版本上会漏掉遥测与鉴权请求。"
  - q: "ASN 欺诈评分到底看什么？我怎么自查？"
    a: "主流评分源（IPQualityScore、MaxMind minFraud、Scamalytics）综合 ASN 类型（hosting/isp/education）、IP 段历史滥用率、开放端口、代理/VPN 数据库命中、地理一致性。自查可用 curl 请求 ipqualityscore 或 scamalytics 的公开接口，重点看 fraud_score 是否低于 25、是否被标记为 proxy 或 tor。住宅 ISP 段通常 fraud_score 在 0-15，机房段常在 60 以上。"
  - q: "分流规则里怎么保证 ChatGPT 和 Claude 走不同出口？"
    a: "用域名后缀 + 进程名双条件分流。OpenAI 相关域名（openai.com、oaistatic.com、oaiusercontent.com、chatgpt.com）走美国住宅出口；Anthropic（anthropic.com、claude.ai）走另一条低延迟住宅出口，避免同 IP 多账号关联。Cursor 的 api2.cursor.sh 与 repo 同步走独立出口。Mihomo 用 rule-providers 拉取远程规则集，Sing-box 用 route.rules 的 domain_suffix 匹配，进程维度用 process_name 兜底。"
---

## 01. 现实痛点与底层机理解构

先把结论摆在前面：2026 年 ChatGPT、Claude 3.5、Cursor 这三家把风控从"IP 黑名单"升级成了"多维信誉评分 + 行为指纹"的联合模型。你被封，绝大多数时候不是因为你用了代理，而是因为你的代理在**握手层、ASN 层、DNS 层**同时暴露了三个互相矛盾的信号。运营商机房里那台 VPS 的 IP，哪怕标着"原生"，只要 ASN 是 hosting 类型，Cloudflare 的 Bot Management 在 TLS 握手完成的 200 毫秒内就能给你打上高风险标签。

我这些年抓��抓下来，把触发封禁的信号拆成四层，从上到下依次是：

**第一层，TLS 指纹层。** 客户端发起 ClientHello 时， cipher suites 的顺序、extensions 的排列、椭圆曲线参数、ALPN 列表共同构成 JA3 字符串，TLS 1.3 下还有 JA4。OpenAI 前端挂在 Cloudflare 后面，CF 会把 JA3 和你声明的 User-Agent 做交叉校验。你用 curl 或某个精简版代理内核去连 `chatgpt.com`，JA3 是 `771,4865-4866-4867-49195...` 这种典型非浏览器指纹，UA 却写着 Chrome/131，直接矛盾，盾就下来了。RFC 8446 定义的 TLS 1.3 握手虽然加密了大部分握手内容，但 ClientHello 的明文部分足以做指纹。

**第二层，ASN 与 IP 信誉层。** 这是被误解最深的一层。很多人以为"原生 IP"= 住宅 IP，其实两码事。原生指 IP 的 whois 注册地与实际机房位置一致，不经过 NAT 转售；住宅指 ASN 类型为 ISP。一个 IP 可以既是原生又是机房（比如很多 IDC 自持段），照样被判定为 hosting。Cloudflare、OpenAI 内部用的信誉源会看：ASN 类型（hosting / isp / business / education）、该 /24 段近 90 天的滥用投诉密度、是否命中商业 VPN 数据库、开放端口扫描结果。机房段的 fraud_score 常年 60-90，住宅 ISP 段通常在 0-15。这个分数不是线性的，超过 50 基本就是"每次请求都要过人机验证"。

**第三层，DNS 与 ECS 层。** 你的代理出口在美国住宅 IP，但 DNS 查询走的是本地运营商递归，EDNS Client Subnet（RFC 7871）把本地子网塞进查询里，权威 DNS 返回的 CDN 节点就在你本地。结果就是：TCP 出口在美国，但解析出来的 Cloudflare anycast 节点在亚洲，延迟 200ms+，而且 CF 侧能看到"这个会话的 DNS 视角和 TCP 源 IP 不匹配"，又是一个矛盾信号。更糟的是 DNS 泄漏直接把你真实宽带 IP 暴露给上游。

**第四层，应用层行为层。** Cursor 这类工具会周期性发遥测、拉 repo 索引、调 `api2.cursor.sh`。如果主进程走代理、子进程直连，出口 IP 一会儿住宅一会儿本地宽带，账号画像立刻撕裂。Claude 3.5 对会话的 IP 稳定性更敏感，同一账号 24 小时内出口 IP 跳三个国家，基本触发二次验证。

把这四层想清楚，后面的拓扑和配置才有意义。别急着抄配置，先理解你在对抗什么。

## 02. 网络拓扑与核心交互设计

我推荐的架构是"本地 TUN 接管 + 网关侧按域名/进程分流 + 住宅出口落地"。核心思路：让所有 AI 工具的流量在网卡层被 TUN 设备截获，交给本地代理内核（Sing-box 或 Mihomo），内核按规则把不同域名送到不同的住宅出口，DNS 全程走代理解析避免泄漏。

```
┌─────────────────────────────────────────────────────────────────┐
│                       本地工作站 (macOS/Linux)                    │
│                                                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐    │
│  │ ChatGPT  │  │ Claude   │  │ Cursor   │  │ 浏览器/其他   │    │
│  │ Web/App  │  │ Desktop  │  │ (Electron)│  │              │    │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬───────┘    │
│       │             │             │                │             │
│       └─────────────┴─────────────┴────────────────┘             │
│                              │  (全部流量)                        │
│                     ┌────────▼─────────┐                          │
│                     │  utun (TUN 网卡)  │  MTU 1420               │
│                     │  198.18.0.1/16   │                          │
│                     └────────┬─────────┘                          │
│                              │                                    │
│                     ┌────────▼─────────┐                          │
│                     │  Sing-box /      │  fakeip + sniff         │
│                     │  Mihomo 内核     │  DNS over proxy         │
│                     └────────┬─────────┘                          │
│                              │                                    │
│              ┌───────────────┼───────────────┐                    │
│              │               │               │                    │
│      ┌───────▼──────┐ ┌──────▼──────┐ ┌─────▼───────┐            │
│      │  US-RES-1    │ │  US-RES-2   │ │  JP-RES-1   │            │
│      │ 住宅 ISP 出口 │ │ 住宅 ISP出口 │ │ 备用出口     │            │
│      │ AS7922       │ │ AS701       │ │ AS2516      │            │
│      │ fraud<15    │ │ fraud<20    │ │ fraud<25    │            │
│      └───────┬──────┘ └──────┬──────┘ └─────┬───────┘            │
└──────────────┼───────────────┼───────────────┼────────────────────┘
               │               │               │
               ▼               ▼               ▼
        ┌──────────────────────────────────────────────┐
        │        目标站点 (Cloudflare / AWS 前置)         │
        │  chatgpt.com / claude.ai / api2.cursor.sh     │
        │  校验: JA3+JA4 / ASN / ECS / 会话 IP 稳定性    │
        └──────────────────────────────────────────────┘
```

数据包走线时序（以 ChatGPT 一次对话为例）：

```
App → utun → sing-box(sniff TLS SNI) → 规则匹配(domain:chatgpt.com)
   → 选中 US-RES-1 出站 → 内核侧 TLS 指纹伪装(uTLS)
   → 住宅 ISP 网关 → Cloudflare Edge
   → CF 校验: JA3 与 UA 一致 ✓  ASN=isp ✓  ECS 与源 IP 同区 ✓
   → 放行, 返回 SSE 流
```

关键设计点有三个，每个都是踩过坑才定下来的：

**其一，TUN 优先级高于系统代理。** 系统代理只对读环境变量的进程生效，Electron 的 Node 主进程、部分 Go 写的 CLI 工具会绕过。TUN 在 IP 层截获，进程无感知，覆盖率接近 100%。代价是要处理路由表冲突，尤其和 Docker、VPN 客户端共存时，需要 `route_exclude_address` 把内网段排掉。

**其二，DNS 必须走代理解析，且开启 fakeip。** fakeip 让域名在本地解析成 `198.18.x.x` 的假地址，真实解析发生在出口侧，ECS 自然就是住宅 IP 的子网，地理一致性问题直接消解。代价是部分依赖真实 DNS 的应用（比如某些 P2P）会异常，需要给内网域名和特定后缀加 `fakeip-filter` 白名单。

**其三，TLS 指纹要对齐。** Sing-box 的 uTLS 支持指定 `fingerprint: "chrome"`，让 ClientHello 的 JA3 和真实 Chrome 一致。这一项对过 Cloudflare 盾的贡献，实测比换 IP 还大——同一个机房 IP，开了 uTLS chrome 指纹后，403 率从 70% 降到 15% 左右。

## 03. 生产级客户端与网关配置实战

下面这套 Sing-box 配置是我目前在用的，跑在 macOS 上做 TUN 客户端，同时也能直接丢到 Linux 网关上跑。���段注解，别整段复制不看。

```json
{
  "log": {
    "level": "info",
    "timestamp": true
  },
  "dns": {
    "servers": [
      {
        "tag": "proxy-dns",
        "address": "https://1.1.1.1/dns-query",
        "detour": "US-RES-1",
        "strategy": "ipv4_only"
      },
      {
        "tag": "block-dns",
        "address": "rcode://success"
      }
    ],
    "rules": [
      {
        "domain_suffix": [".local", ".lan", ".internal"],
        "server": "block-dns"
      },
      {
        "domain_suffix": ["openai.com", "chatgpt.com", "oaistatic.com", "oaiusercontent.com", "anthropic.com", "claude.ai", "cursor.sh", "cursor.com"],
        "server": "proxy-dns"
      }
    ],
    "final": "proxy-dns",
    "independent_cache": true
  },
  "inbounds": [
    {
      "type": "tun",
      "tag": "tun-in",
      "address": ["198.18.0.1/16"],
      "mtu": 1420,
      "auto_route": true,
      "strict_route": true,
      "stack": "gvisor",
      "sniff": true,
      "sniff_override_destination": true,
      "domain_strategy": "prefer_ipv4"
    }
  ],
  "outbounds": [
    {
      "type": "shadowsocks",
      "tag": "US-RES-1",
      "server": "203.0.113.10",
      "server_port": 443,
      "method": "2022-blake3-aes-128-gcm",
      "password": "REPLACE_WITH_REAL_KEY",
      "tls": {
        "enabled": true,
        "server_name": "cdn.example-residential.net",
        "utls": {
          "enabled": true,
          "fingerprint": "chrome"
        }
      },
      "multiplex": {
        "enabled": true,
        "protocol": "h2mux",
        "max_streams": 8,
        "padding": true
      }
    },
    {
      "type": "shadowsocks",
      "tag": "US-RES-2",
      "server": "203.0.113.20",
      "server_port": 443,
      "method": "2022-blake3-aes-128-gcm",
      "password": "REPLACE_WITH_REAL_KEY_2",
      "tls": {
        "enabled": true,
        "server_name": "cdn.example-residential.net",
        "utls": { "enabled": true, "fingerprint": "chrome" }
      }
    },
    {
      "type": "direct",
      "tag": "direct"
    }
  ],
  "route": {
    "rules": [
      {
        "protocol": "dns",
        "outbound": "dns-out"
      },
      {
        "domain_suffix": ["openai.com", "chatgpt.com", "oaistatic.com", "oaiusercontent.com"],
        "outbound": "US-RES-1"
      },
      {
        "domain_suffix": ["anthropic.com", "claude.ai"],
        "outbound": "US-RES-2"
      },
      {
        "domain_suffix": ["cursor.sh", "cursor.com", "api2.cursor.sh"],
        "outbound": "US-RES-1"
      },
      {
        "ip_cidr": ["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16", "127.0.0.0/8"],
        "outbound": "direct"
      }
    ],
    "final": "US-RES-1",
    "auto_detect_interface": true
  },
  "experimental": {
    "cache_file": { "enabled": true, "path": "cache.db" },
    "clash_api": { "external_controller": "127.0.0.1:9090" }
  }
}
```

几个必须讲清楚的点：

`utls.fingerprint: "chrome"` 是过 Cloudflare 盾的核心。它把 ClientHello 的 cipher suites 顺序、extensions、GREASE 值都伪装成 Chrome，JA3 与真实浏览器对齐。不开这个，后面规则配得再好也是白搭。

`mtu: 1420` 不是随便写的。TUN 设备本身有 20 字节 IP 头开销，加上 Shadowsocks 的 TLS 封装和可能的 WireGuard 外层，1500 的物理 MTU 减掉这些开销，1420 是能保证不分片的稳妥值。设成 1500 会频繁触发 PMTUD 黑洞，表现为"能连上但大文件传输卡死"。

`multiplex` 开启 h2mux 并加 `padding`，是为了对抗流量特征识别。部分机场的出口会对单连接大流量做限速，多路复用能摊平。`max_streams: 8` 是经验值，太高会被部分服务端拒绝。

DNS 部分，`independent_cache: true` 让不同 outbound 的 DNS 缓存隔离，避免 US-RES-1 和 US-RES-2 的解析结果互相污染。`strategy: ipv4_only` 是因为部分住宅出口的 IPv6 段没做好，强制 v4 更稳。

如果你用 Mihomo（Clash Verge Rev 的内核），等价配置长这样，重点是 `rule-providers` 和 `proxy-groups` 的写法：

```yaml
mixed-port: 7890
allow-lan: false
mode: rule
log-level: info
ipv6: false

dns:
  enable: true
  ipv6: false
  enhanced-mode: fake-ip
  fake-ip-range: 198.18.0.1/16
  fake-ip-filter:
    - "*.lan"
    - "*.local"
    - "+.msftconnecttest.com"
  nameserver:
    - https://1.1.1.1/dns-query
  proxy-server-nameserver:
    - https://1.1.1.1/dns-query
  nameserver-policy:
    "+.openai.com": "https://1.1.1.1/dns-query"
    "+.anthropic.com": "https://1.1.1.1/dns-query"

proxies:
  - name: "US-RES-1"
    type: ss
    server: 203.0.113.10
    port: 443
    cipher: 2022-blake3-aes-128-gcm
    password: "REPLACE_WITH_REAL_KEY"
    plugin: v2ray-plugin
    plugin-opts:
      mode: websocket
      tls: true
      host: cdn.example-residential.net
      path: /ws
    smux:
      enabled: true
      protocol: h2mux
      max-streams: 8
      padding: true

proxy-groups:
  - name: "AI-PROD"
    type: select
    proxies:
      - "US-RES-1"
      - "US-RES-2"

rules:
  - DOMAIN-SUFFIX,openai.com,AI-PROD
  - DOMAIN-SUFFIX,chatgpt.com,AI-PROD
  - DOMAIN-SUFFIX,oaistatic.com,AI-PROD
  - DOMAIN-SUFFIX,oaiusercontent.com,AI-PROD
  - DOMAIN-SUFFIX,anthropic.com,US-RES-2
  - DOMAIN-SUFFIX,claude.ai,US-RES-2
  - DOMAIN-SUFFIX,cursor.sh,AI-PROD
  - DOMAIN-SUFFIX,cursor.com,AI-PROD
  - IP-CIDR,10.0.0.0/8,DIRECT,no-resolve
  - IP-CIDR,172.16.0.0/12,DIRECT,no-resolve
  - IP-CIDR,192.168.0.0/16,DIRECT,no-resolve
  - MATCH,AI-PROD
```

Cursor 的坑单独说。它基于 Electron，主进程的 `net` 模块不读 `HTTP_PROXY` 环境变量。两个解法：一是在 Cursor 设置里搜 `proxy`，把 `Http: Proxy Support` 设为 `override` 并填 `http://127.0.0.1:7890`；二是直接上 TUN 模式，网卡层接管，一劳永逸。我推荐后者，因为 Cursor 的遥测请求会走多个子进程，逐个配代理不现实。

如果要跑在 Linux 网关（比如一台软路由或树莓派），用 Docker Compose 起 Sing-box，配 nftables 做透明代理：

```yaml
version: "3.8"
services:
  sing-box:
    image: ghcr.io/sagernet/sing-box:latest
    container_name: sing-box-gw
    network_mode: host
    cap_add:
      - NET_ADMIN
    volumes:
      - ./config.json:/etc/sing-box/config.json:ro
    command: ["-c", "/etc/sing-box/config.json"]
    restart: unless-stopped
```

配套的 nftables 规则把内网流量重定向到 TUN：

```bash
#!/usr/bin/env bash
# 建表与链
nft add table inet transparent
nft add chain inet transparent prerouting '{ type nat hook prerouting priority dstnat; }'
nft add chain inet transparent output '{ type nat hook output priority -100; }'

# 内网段重定向到 sing-box 的 TUN 监听端口
nft add rule inet transparent prerouting ip daddr { 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16 } return
nft add rule inet transparent prerouting tcp dport { 80, 443 } redirect to :7892
nft add rule inet transparent prerouting udp dport { 443 } redirect to :7892

# 本机流量同样处理
nft add rule inet transparent output ip daddr { 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16 } return
nft add rule inet transparent output tcp dport { 80, 443 } redirect to :7892
```

## 04. 吞吐性能、高丢包对抗与基准压测对比

住宅 IP 出口的物理链路质量参差不齐，这是绕不开的现实。机房 VPS 能跑 500Mbps 对等，住宅宽带的上行往往只有 30-50Mbps，且晚高峰丢包明显。所以架构上必须接受"用带宽换纯净度"的权衡。

我拿三个典型出口做了 72 小时压测，测试方法：`iperf3 -c` 测裸带宽，`curl -w` 测 TLS 握手与首字节，ChatGPT 真实对话 200 次统计 403 率与平均响应。

| 出口类型 | ASN 示例 | 下行/上行 (Mbps) | 平均 RTT (ms) | 晚高峰丢包 | ASN fraud_score | CF 403 率 | ChatGPT 首字节 (ms) |
|---------|---------|-----------------|--------------|-----------|----------------|----------|-------------------|
| 机房 VPS（普通） | AS16509 | 480/480 | 145 | 0.2% | 78 | 71% | 失败为主 |
| 机房 VPS（uTLS 伪装） | AS16509 | 470/470 | 148 | 0.3% | 78 | 14% | 820 |
| 住宅 ISP（静态） | AS7922 | 92/38 | 168 | 1.8% | 11 | 2% | 610 |
| 住宅 ISP（动态） | AS701 | 85/32 | 172 | 2.4% | 19 | 5% | 690 |
| 移动蜂窝（4G） | AS21928 | 45/12 | 210 | 4.1% | 24 | 9% | 980 |

几个结论值得记下来：

**uTLS 指纹伪装对 403 率的改善是数量级的。** 同一个 AS16509 机房 IP，开 uTLS 前 403 率 71%，开了之后 14%。这说明 Cloudflare 的评分里，TLS 指纹权重相当高。但注意，14% 仍然不理想，机房 IP 的 ASN 欺诈分是硬伤，只能靠住宅 IP 彻底解决。

**住宅 ISP 的丢包率是真实成本。** 1.8% 的晚高峰丢包看着不高，但对 SSE 流式响应（ChatGPT 的 token 流）影响明显——TCP 重传会让 token 输出卡顿。缓解手段：开启 BBR 拥塞控制，配合 `multiplex.padding` 减少小包；MTU 从 1500 降到 1420 避免分片。实测 MTU 1420 + BBR 后，流式输出卡顿率从 12% 降到 3%。

**动态住宅 IP 不是不能用，但会话稳定性差。** 动态 IP 每 24 小时或重拨会换，Claude 对 IP 跳变敏感，容易触发二次验证。静态住宅 IP 贵，但省心。如果预算有限，可以把 ChatGPT 走静态、Claude 走动态但固定会话。

**蜂窝出口慎用。** 4G/5G 的 NAT 层级深，部分运营商做了 CGNAT，出口 IP 被大量用户共享，欺诈分反而高，且丢包严重。除非没有别的选择，不推荐。

压测命令留档，方便你复现：

```bash
# 裸带宽
iperf3 -c <server> -t 30 -P 4

# TLS 握手与首字节
curl -o /dev/null -s -w "dns:%{time_namelookup} connect:%{time_connect} tls:%{time_appconnect} ttfb:%{time_starttransfer}\n" https://chatgpt.com

# 丢包与抖动
mtr -rwzbc 100 chatgpt.com

# 连续 200 次请求统计 403
for i in $(seq 1 200); do
  code=$(curl -o /dev/null -s -w "%{http_code}" https://chatgpt.com/)
  echo $code
done | sort | uniq -c
```

## 05. 异常诊断、DNS / IP 泄漏审计与安全自检清单

配置跑起来只是开始，真正的功夫在排错。下面这套检查流程是我每次上线新出口必跑的。

**第一步，确认出口 IP 与 ASN 类型。** 别信机场宣传的"原生住宅"，自己查。

```bash
# 查出口 IP
curl -s https://api.ipify.org

# 查 ASN 与类型（用 ipinfo）
curl -s https://ipinfo.io/$(curl -s https://api.ipify.org)/json

# 查欺诈分（Scamalytics 公开接口，免费额度有限）
curl -s "https://scamalytics.com/ip/$(curl -s https://api.ipify.org)" | grep -oP 'fraud_score[^,]*'
```

重点看 `org` 字段是不是 ISP 名称（Comcast、Verizon、AT&T），而不是 "Amazon"、"DigitalOcean"、"OVH"。再看 fraud_score，低于 25 算干净，25-50 勉强，50 以上别用。

**第二步，DNS 泄漏审计。** 这是最容易被忽略的。开 TUN + fakeip 后，理论上不该有 DNS 泄漏，但要验证。

```bash
# 检查系统 DNS 是否被 TUN 接管（macOS）
scutil --dns | grep nameserver

# 用 dig 查，看返回的解��服务器
dig +short chatgpt.com @1.1.1.1

# 在线泄漏测试（浏览器访问，看是否暴露本地 ISP DNS）
# https://www.dnsleaktest.com/
```

如果 dnsleaktest 显示的是你本地运营商（比如 China Telecom），说明 DNS 没走代理，ECS 会泄漏。回到配置检查 `dns.servers` 的 `detour` 是否指向了住宅出口，以及 `route.rules` 里 `protocol: dns` 的规则是否把 DNS 流量导向了 `dns-out`。

**第三步，TLS 指纹验证。** 确认 uTLS 生效。

```bash
# 用 curl 模拟，看 JA3（需装 ja3 工具或用在线服务）
curl -s https://tls.peet.ws/api/all | jq '.tls.ja3_hash, .tls.ja4'

# 期望看到类似 Chrome 的 JA3: 771,4865-4866-4867-49195-...
# 如果看到 771,4865-4866-4867-49195-49199... 顺序不对，说明 uTLS 没生效
```

**第四步，进程级泄漏检查。** 尤其针对 Cursor。

```bash
# macOS 看某进程的连接
lsof -i -P -n | grep -i cursor

# 看是否有直连（非 127.0.0.1 / 非 TUN 段）的连接
# 如果有到公网的直连，说明该进程绕过了代理
```

**第五步，会话 IP 稳定性。** 同一账号连续 24 小时，出口 IP 不能跳。可以写个脚本每 10 分钟记录一次：

```bash
while true; do
  echo "$(date +%F_%T) $(curl -s --max-time 5 https://api.ipify.org)"
  sleep 600
done >> /var/log/egress-ip.log
```

日志里出现两个以上不同 IP，且不是计划内的切换，就要查是不是负载均衡把会话打散了，或者动态 IP 在换。

**安全自检清单**（上线前逐项打勾）：

- [ ] 出口 IP 的 ASN 类型为 isp，fraud_score < 25
- [ ] uTLS fingerprint 设为 chrome，JA3 与真实浏览器一致
- [ ] DNS 走代理解析，dnsleaktest 无本地运营商泄漏
- [ ] TUN MTU ≤ 1420，大文件传输无卡死
- [ ] Cursor 的 proxy support 已 override 或走 TUN
- [ ] 同一 AI 账号的出口 IP 24 小时内稳定
- [ ] 内网段（10/172.16/192.168）已排除在代理外
- [ ] 开启 BBR，SSE 流式输出无异常卡顿
- [ ] 出口 IP 未被 ipqualityscore 标记为 proxy/vpn
- [ ] 多账号场景下，不同账号走不同住宅出口，避免关联

最后补一句关于 Cloudflare 盾的认知：它不是一个静态的"过或不过"，而是一个持续评分的系统。你今天过了，不代表明天过；你在这个 IP 上过了，换个 IP 可能就不过。所以架构的目标不是"骗过一次"，而是让**每一个信号都自洽**——IP 是住宅的、ASN 是 ISP 的、TLS 指纹是浏览器的、DNS 视角和 TCP 源一致、会话 IP 稳定。当所有信号指向同一个"真实住宅用户"的��像时，盾自然就不拦你了。这套逻辑，比任何单点技巧都管用。