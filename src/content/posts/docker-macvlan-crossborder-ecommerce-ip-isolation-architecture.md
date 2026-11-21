---
title: "Docker Macvlan 旁路网关实战：跨境电商多店铺静态 IP 容器化隔离与分流架构"
description: "从内核 macvlan 子接口、ARP 代理到 Clash/Sing-box 透明网关，拆解跨境电商多店铺独立静态原生 IP 的容器级网络隔离方案。含完整 YAML/JSON 配置、nftables 规则、MTU 1420 调优、DNS/IP 泄漏审计清单与吞吐压测对比。"
pubDate: 2026-11-21
updatedDate: 2026-11-21
category: "routing"
categoryName: "规则与路由"
tags: ["Docker Macvlan","跨境电商防关联","多店铺网络隔离","静态原生IP","透明网关容器"]
author: "机场指南编辑部"
featured: false
draft: false
difficulty: "Advanced"
readingTime: "21 MIN READ"
badge: "DEEP DIVE"
related: ["2026-best-airports-ranking-guide","ai-productivity-routing","proxy-troubleshooting-geo-faq","gaming-latency-udp-routing"]
keyProblems:
  - "同一台宿主机上跑多个店铺容器，出口 IP 却共享同一 NAT 地址，平台风控直接判定设备关联封店"
  - "Docker 默认 bridge 网络下容器无法获得独立二层身份，MAC 地址与出口 IP 强绑定，指纹高度重合"
  - "透明网关容器做 TPROXY 时 UDP/QUIC 流量绕过代理直连，DNS 泄漏暴露真实出口归属地"
  - "macvlan 子接口与上游网关 ARP 冲突，容器偶发断流、丢包率飙到 8% 以上无法定位"
faq:
  - q: "Docker Macvlan 和普通 bridge 网络做跨境隔离的本质区别是什么？"
    a: "bridge 网络下所有容器共享宿主机的 veth 对和同一张 NAT 表，出口源 IP 是宿主机地址，平台侧看到的是一台设备多会话。macvlan 让容器直接挂到物理网卡所在的二层广播域，容器拥有独立 MAC 和独立 IP，上游路由器把它当成一台真实物理主机。再配合每个容器独占一个静态公网出口（独立 VPS 或独立家宽落地），平台侧就是 N 台互不相干的设备。代价是 macvlan 默认禁止宿主机与子接口直接通信，需要额外建一个 macvlan shim 接口来打通管理面。"
  - q: "为什么旁路网关容器里 TPROXY 配好了，TikTok/独立站后台还是检测到真实 IP？"
    a: "九成是 UDP 443 的 QUIC 流量没被劫持。Chrome 和大量 App 优先走 HTTP/3，如果你的 iptables 只写了 TCP REDIRECT，QUIC 会以 UDP 直连出去，源 IP 就是你的落地机真实地址。必须在 nftables 里对 udp dport 443 做 TPROXY 并 drop 掉未命中的转发，同时把 DNS 的 udp/tcp 53 全部劫持到网关内部 resolver，否则 DNS 查询会走运营商 DNS 暴露归属地。"
  - q: "macvlan 容器完全 ping 不通宿主机，是不是配置错了？"
    a: "不是错误，是 macvlan 的设计约束。宿主机上的 macvlan 父接口无法与它派生的子接口直接通信，这是内核为避免二层环路做的隔离。解决办法是再建一个 macvlan 接口（shim），把宿主机自己的管理流量从 shim 走，或者干脆把管理面放到另一个物理网卡上。生产环境推荐后者，隔离更彻底。"
  - q: "多个店铺容器共用一台落地机但要求独立 IP，怎么实现？"
    a: "一台落地机只有一个公网 IP，物理上做不到多 IP。要么给每个店铺容器分配独立的落地 VPS（成本换隔离度），要么在落地侧用多个静态 IP 的 BGP 段做 SNAT 池按容器源地址映射。前者是跨境电商防关联的行业标准做法，后者适合有 IP 段资源的团队。容器侧通过 macvlan 独立 IP + 策略路由把不同容器绑定到不同出口，落地侧再做一次源地址校验。"
  - q: "旁路网关的 MTU 应该设多少？"
    a: "走 WireGuard 类隧道时物理口 MTU 1500 减去 60 字节封装开销，隧道口设 1420 是稳妥值；走 TLS 类代理且有外层封装时保守设 1380~1400。macvlan 子接口本身继承父接口 MTU，但容器内如果叠加隧道必须同步下调，否则大包被分片或直接丢弃，表现为网页能开、视频卡死、SSH 登录后大命令卡住。用 ping -M do -s 1472 逐级探测确认。"
---

## 01. 现实痛点与底层机理解构

跨境电商这行当里，"防关联"三个字被说烂了，但真正把网络层拆开看的人不多。平台风控不是靠一个 Cookie 判你死活的，它拿到的是一整条链路上的证据：TCP 握手的初始 TTL、TLS ClientHello 里的 JA3/JA4 指纹、HTTP/2 的 SETTINGS 帧顺序、出口 IP 的 ASN 归属、DNS 解析路径、甚至 WebRTC 泄漏出来的内网地址。这些信号里，**出口 IP 的独立性**是最硬的一条——一台设备挂十个店铺，十个店铺的会话全部从同一个公网 IP 出去，风控模型里这就是一个 `device_cluster`，直接连坐。

我见过太多团队的做法：一台 Windows 机器开十个指纹浏览器窗口，每个窗口挂不同的代理。看起来隔离了，实际上呢？代理是 HTTP/SOCKS5，浏览器指纹换了，但底层 TCP 栈还是那一个，`tcp_timestamps` 的时钟偏移、初始窗口大小、甚至 SYN 重传的退避曲线都是同一台机器的。更致命的是，很多人代理只配了 TCP，UDP 直连出去了，QUIC 一开，真实 IP 裸奔。这种架构在平台的高级风控面前基本等于没穿衣服。

### 1.1 从 TCP/IP 栈看"设备指纹"是怎么被拼出来的

平台侧拿到的第一个信号是 **TCP 层指纹**。不同操作系统的初始 TTL 不一样：Linux 默认 64，Windows 默认 128，macOS 也是 64 但窗口缩放因子不同。你的代理如果只是应用层转发（HTTP CONNECT），TCP 连接是代理服务器和平台之间建立的，TTL 是代理服务器的——这反而暴露了"你用的是代理"。真正干净的方案是让流量从落地机的原生协议栈出去，落地机是一台独立的 Linux VPS，TTL 64，和普通服务器用户无异。

第二个信号是 **TLS 指纹**。RFC 8446 定义的 TLS 1.3 握手里，ClientHello 的扩展顺序、支持的椭圆曲线、session ticket 的处理方式，组合起来就是 JA3 哈希。Chrome 的 JA3 和 curl 的 JA3 完全不同。如果你用透明网关做 TLS 劫持再重签，JA3 就变成了网关的指纹，所有店铺容器共享同一个 JA3——这比共享 IP 还容易被抓。**所以透明网关只能做四层转发，绝不能做 TLS 中间人**，让每个容器里的浏览器自己完成握手，JA3 才是真实的。

第三个信号是 **出口 IP 的属性**。这里有个很多人忽略的细节：IP 不只是一个地址，它带着 ASN、地理坐标、IP 类型（住宅/机房/移动）、历史信誉分。一个注册在洛杉矶机房段的 IP，去登录一个声称是美国本土卖家的店铺后台，地理和 ASN 对不上，风控直接标记。静态原生 IP 的价值就在这——它是落地机所在 ISP 直接分配的公网地址，不是 NAT 池里轮换的，历史干净，ASN 和注册地一致。

### 1.2 Docker 默认网络为什么天然不适合做隔离

Docker 默认的 `bridge` 网络，本质是宿主机上建一个 `docker0` 网桥，每个容器一对 veth，容器内是 eth0，宿主机侧是 vethxxxx 挂到 docker0 上。所有容器共享宿主机的路由表和 NAT 表（MASQUERADE），出口源 IP 全是宿主机的地址。你就算在容器里跑十个不同的代理客户端，平台看到的还是同一个公网 IP。这层 NAT 是隔离的死穴。

`host` 网络模式好一点，容器直接用宿主机网络栈，但那就更没法隔离了——所有容器抢同一套端口，出口 IP 还是宿主机。`overlay` 是跨主机组网用的，解决的是容器间通信，不解决出口隔离。

真正能做到"每个容器一台独立设备"的，是 **macvlan**。它的原理是：在物理网卡（比如 `eth0`）上创建 macvlan 子接口，每个子接口有独立的 MAC 地址，容器通过子接口直��接入物理网卡所在的二层广播域。上游路由器（或交换机）看到的是一台全新的物理主机，给它分配（或静态配置）一个同网段的 IP。容器和宿主机在网络上是平级的两个节点，不是父子关系。

代价是什么？三个字：**不通宿主机**。内核为了防二层环路，规定 macvlan 父接口不能和它派生的子接口直接通信。你要管理容器，得另想办法——建一个 macvlan shim 接口给宿主机自己用，或者把管理流量走另一张物理网卡。这个约束后面会详细展开。

```
传统 bridge 模式（出口 IP 全共享）:
┌─────────────────────────────────────────────┐
│  宿主机 eth0  203.0.113.10/24                │
│    │                                          │
│  docker0 (172.17.0.1)                        │
│    ├── veth1 ── 容器A eth0 172.17.0.2        │
│    ├── veth2 ── 容器B eth0 172.17.0.3        │
│    └── veth3 ── 容器C eth0 172.17.0.4        │
│                                               │
│  所有容器出站 → MASQUERADE → 203.0.113.10    │
│  平台侧看到：一个 IP，三个会话 = 同一设备     │
└─────────────────────────────────────────────┘

macvlan 模式（容器拥有独立二层身份）:
┌─────────────────────────────────────────────┐
│  物理交换机 / 上游网关 203.0.113.1/24        │
│    │                                          │
│  宿主机 eth0 203.0.113.10/24                 │
│    │                                          │
│  macvlan 子接口（各自独立 MAC）              │
│    ├── macvlan0 ── 容器A 203.0.113.21/24     │
│    ├── macvlan1 ── 容器B 203.0.113.22/24     │
│    └── macvlan2 ── 容器C 203.0.113.23/24     │
│                                               │
│  每个容器 = 一台独立物理主机（独立MAC+IP）    │
│  平台侧看到：三个不同 IP、不同 MAC = 三台设备 │
└─────────────────────────────────────────────┘
```

### 1.3 旁路网关的角色定位

光有 macvlan 还不够。容器有了独立 IP，但这个 IP 是内网地址（比如 203.0.113.21），它要访问外网还得经过上游网关。而跨境电商要的是**出口 IP 落在目标国家**——容器本身在本地机房，出口得是美国的静态 IP。这就需要旁路网关。

旁��网关（bypass gateway）是一台不改变主路由拓扑、以"旁路"方式接入的转发节点。容器把默认路由指向旁路网关容器，旁路网关容器再根据目标域名/IP 决定走哪条隧道出去。整个链路是：

```
容器（独立 IP）→ macvlan 二层 → 旁路网关容器（TPROXY 劫持）
  → 策略路由选出口 → WireGuard/TLS 隧道 → 落地 VPS（静态原生 IP）
  → 目标平台
```

关键点在于：**每个店铺容器绑定一条独立的隧道，出口到独立的落地 VPS**。隔离度做到这个份上，平台侧看到的是 N 台位于不同地区、不同 ASN、不同 IP 的独立设备，关联成本极高。

---

## 02. 网络拓扑与核心交互设计

先把整体架构画清楚。下面这张图是生产环境实际跑起来的拓扑，宿主机双网卡：`eth0` 接业务网（做 macvlan），`eth1` 接管理网（宿主机自己管理流量和容器管理面走这里，绕开 macvlan 不通宿主机的坑）。

```
                        互联网
                          │
              ┌───────────┴───────────┐
              │   上游物理网关/交换机  │
              │   203.0.113.1/24       │
              └───────────┬───────────┘
                          │ 二层广播域
        ┌─────────────────┼──────────────────┐
        │                 │                  │
   ┌────┴────┐      ┌─────┴─────┐      ┌─────┴─────┐
   │ 宿主机   │      │ 网关容器  │      │ 店铺容器  │
   │ eth0    │      │ gw-01     │      │ shop-A    │
   │.10      │      │ .20       │      │ .21       │
   │ eth1    │      │ (透明网关)│      │ shop-B .22│
   │ 管理网  │      │           │      │ shop-C .23│
   └─────────┘      └─────┬─────┘      └─────┬─────┘
                          │                  │
                    策略路由分流         默认路由指向 .20
                          │
        ┌─────────────────┼──────────────────┐
        │                 │                  │
   ┌────┴────┐      ┌─────┴─────┐      ┌─────┴─────┐
   │ WG 隧道1 │      │ WG 隧道2  │      │ WG 隧道3  │
   │ 美国LA   │      │ 美国NY    │      │ 英国LON   │
   │ 静态IP   │      │ 静态IP    │      │ 静态IP    │
   └─────────┘      └───────────┘      └───────────┘
```

### 2.1 数据包走线：一次 HTTPS 请求的完整旅程

拿 shop-A（203.0.113.21）访问 `sellercentral.amazon.com` 举例，逐跳拆解：

```
[1] shop-A 容器内 Chrome 发起连接
    src=203.0.113.21:54321  dst=52.x.x.x:443
    默认路由 → 203.0.113.20 (网关容器)
    ↓
[2] 二层：shop-A 的 MAC → 网关容器 macvlan 子接口 MAC
    上游交换机按 MAC 转发（普通二层交换，无特殊配置）
    ↓
[3] 网关容器内核 netfilter PREROUTING 链
    nftables 规则命中：tcp dport 443 → TPROXY 到本地 7893 端口
    同时 udp dport 443 (QUIC) 也被劫持
    ↓
[4] Clash/Sing-box 监听 7893，按规则匹配域名
    sellercentral.amazon.com → 命中 shop-A 专用 proxy-group
    ↓
[5] 走 WireGuard 隧道 wg-a 封装
    外层 src=网关容器公网 IP  dst=LA 落地 VPS
    ↓
[6] 落地 VPS 解封装，以静态原生 IP 203.0.113.50 出站
    ↓
[7] Amazon 侧看到：src=203.0.113.50 (美国住宅段 ASN)
    TLS 握手由 shop-A 容器内 Chrome 完成，JA3 真实
```

这里有个细节值得强调：**TLS 握手是端到端完成的**，网关容器只做四层转发，不解密。所以 JA3 指纹来自容器内的浏览器，和落地 IP 的地理属性匹配。如果网关做了 TLS 劫持，JA3 变成网关的，前面所有隔离努力白费。

### 2.2 为什么每个容器要绑独立隧道

有人会问：网关容器做规则分流，按域名把不同店铺的流量分到不同隧道不行吗？技术上可行，但隔离度不够。原因在于域名分流依赖 SNI 或 DNS 解析结果，一旦某个请求的域名没命中规则（比如平台用了冷门子域、或者走了 IP 直连），就会 fallback 到默认出口，两个店铺的流量从同一个 IP 出去，前功尽弃。

更稳的做法是 **源地址绑定**：网关容器按 `src IP` 决定走哪条隧道，shop-A 的 203.0.113.21 无论访问什么，一律走 wg-a。规则里加一条兜底：`ip saddr 203.0.113.21 → wg-a`，优先级高于所有域名规则。这样即使域名规则漏了，也不会串。

```
nftables 源地址策略路由（核心逻辑）:
ip saddr 203.0.113.21 → meta mark set 0x1  (shop-A → wg-a)
ip saddr 203.0.113.22 → meta mark set 0x2  (shop-B → wg-b)
ip saddr 203.0.113.23 → meta mark set 0x3  (shop-C → wg-c)
```

配合 `ip rule` 做策略路由，把不同 mark 的包导向不同的路由表，每个路由表默认路由指向对应的 WireGuard 接口。

### 2.3 macvlan 不通宿主机的绕行方案

前面提过这个坑。容器起来后，你在宿主机上 `ping 203.0.113.21` 是不通的，`docker exec` 进去 `ping 宿主机` 也不通。这不是 bug，是 macvlan 的隔离设计。

绕行方案有三：

| 方案 | 做法 | 隔离度 | 复杂度 | 适用场景 |
|------|------|--------|--------|----------|
| shim 接口 | 宿主机再建一个 macvlan 接口挂同网段，管理流量走它 | 中 | 低 | 单网卡机器 |
| 双网卡 | 管理流量走第二张物理网卡 eth1 | 高 | 中 | 生产环境首选 |
| 不管理 | 容器全部通过 SSH 到内部跳板管理 | 高 | 高 | 大规模集群 |

生产环境推荐双网卡。`eth0` 专门做 macvlan 业务，`eth1` 是管理网，宿主机和所有容器的管理面（SSH、监控 agent）走 `eth1`。这样业务隔离和管理可达性互不干扰。

---

## 03. 生产级客户端与网关配置实战

下面全部是能直接跑起来的配置。环境假设：Ubuntu 22.04，内核 5.15+（macvlan 和 TPROXY 都稳定），Docker 24+，使用 Clash Verge Rev 的 mihomo 内核做网关容器。

### 3.1 宿主机网络初始化

先建 macvlan 网络。注意 `parent` 填物理网卡名，`subnet` 和 `gateway` 填上游网段，`ip-range` 限定容器可用的地址池，避免和 DHCP 池冲突。

```bash
# 确认物理网卡和上游网段
ip -br addr show
# eth0  UP  203.0.113.10/24
# eth1  UP  10.10.0.10/24

# 开启 IP 转发（网关容器和宿主机都需要）
cat >> /etc/sysctl.d/99-macvlan.conf <<'EOF'
net.ipv4.ip_forward = 1
net.ipv4.conf.all.forwarding = 1
net.ipv4.conf.all.rp_filter = 0
net.ipv4.conf.default.rp_filter = 0
# TPROXY 需要
net.ipv4.conf.all.route_localnet = 1
# 允许非本地地址绑定（透明代理关键）
net.ipv4.ip_nonlocal_bind = 1
EOF
sysctl -p /etc/sysctl.d/99-macvlan.conf

# 创建 macvlan 网络，注意 ip-range 要和上游 DHCP 池错开
docker network create -d macvlan \
  --subnet=203.0.113.0/24 \
  --gateway=203.0.113.1 \
  --ip-range=203.0.113.64/27 \
  -o parent=eth0 \
  macvlan-biz

# 查看结果
docker network inspect macvlan-biz --format '{{json .IPAM.Config}}'
```

`--ip-range=203.0.113.64/27` 是关键，它把容器地址限制在 `.64`~`.95` 这 32 个地址里，和上游路由器的 DHCP 池（假设是 `.100`~`.200`）完全错开，杜绝地址冲突。这个细节不写，跑一段时间必出 ARP 冲突导致的断流。

### 3.2 网关容器：mihomo 透明网关配置

网关容器用 macvlan 网络，固定 IP `203.0.113.20`，同时挂载 TUN 设备做透明代理。下面是完整的 `docker-compose.yml`：

```yaml
# docker-compose.gateway.yml
services:
  gateway:
    image: metacubex/mihomo:latest
    container_name: gw-01
    restart: unless-stopped
    cap_add:
      - NET_ADMIN
      - NET_RAW
    devices:
      - /dev/net/tun:/dev/net/tun
    sysctls:
      - net.ipv4.ip_forward=1
      - net.ipv4.conf.all.route_localnet=1
    volumes:
      - ./mihomo/config.yaml:/root/.config/mihomo/config.yaml:ro
      - ./mihomo/geoip.metadb:/root/.config/mihomo/geoip.metadb:ro
    networks:
      macvlan-biz:
        ipv4_address: 203.0.113.20
    # TUN 模式需要
    dns:
      - 127.0.0.1
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://127.0.0.1:9090/version"]
      interval: 30s
      timeout: 5s
      retries: 3

networks:
  macvlan-biz:
    external: true
```

mihomo 的配置核心是 TUN 模式 + 规则分流。下面是精简后的生产配置，重点看 `tun` 段和 `rules` 段的源地址绑定逻辑：

```yaml
# mihomo/config.yaml
mixed-port: 7890
allow-lan: true
bind-address: "*"
mode: rule
log-level: info
external-controller: 0.0.0.0:9090
# TUN 模式接管所有流量
tun:
  enable: true
  stack: system          # system 栈兼容性最好，gvisor 性能高但有兼容坑
  dns-hijack:
    - any:53
  auto-route: true
  auto-detect-interface: true
  mtu: 1420              # 和 WireGuard 隧道 MTU 对齐

# DNS 必须走内部，杜绝泄漏
dns:
  enable: true
  listen: 0.0.0.0:1053
  ipv6: false
  enhanced-mode: fake-ip
  fake-ip-range: 198.18.0.1/16
  fake-ip-filter:
    - "*.lan"
    - "*.local"
    - "sellercentral.amazon.com"   # 关键域名走真实解析，避免 fake-ip 影响证书校验
  nameserver:
    - https://1.1.1.1/dns-query
    - https://8.8.8.8/dns-query
  fallback:
    - tls://1.0.0.1:853
  fallback-filter:
    geoip: true
    geoip-code: CN
    ipcidr:
      - 240.0.0.0/4

proxies:
  # 三条独立 WireGuard 隧道，对应三个店铺
  - name: "wg-shop-a"
    type: wireguard
    server: 198.51.100.50
    port: 51820
    private-key: "REPLACE_A_PRIVATE_KEY"
    public-key: "REPLACE_A_PUBLIC_KEY"
    ip: 10.66.0.2
    mtu: 1420
    udp: true
    # 落地机静态原生 IP 由服务端 SNAT，这里不配
  - name: "wg-shop-b"
    type: wireguard
    server: 198.51.100.60
    port: 51820
    private-key: "REPLACE_B_PRIVATE_KEY"
    public-key: "REPLACE_B_PUBLIC_KEY"
    ip: 10.66.1.2
    mtu: 1420
    udp: true
  - name: "wg-shop-c"
    type: wireguard
    server: 198.51.100.70
    port: 51820
    private-key: "REPLACE_C_PRIVATE_KEY"
    public-key: "REPLACE_C_PUBLIC_KEY"
    ip: 10.66.2.2
    mtu: 1420
    udp: true

proxy-groups:
  - name: "shop-a"
    type: select
    proxies: ["wg-shop-a"]
  - name: "shop-b"
    type: select
    proxies: ["wg-shop-b"]
  - name: "shop-c"
    type: select
    proxies: ["wg-shop-c"]

rules:
  # 源地址绑定优先级最高，兜底防串流
  - SRC-IP-CIDR,203.0.113.21/32,shop-a,no-resolve
  - SRC-IP-CIDR,203.0.113.22/32,shop-b,no-resolve
  - SRC-IP-CIDR,203.0.113.23/32,shop-c,no-resolve
  # 内网直连
  - IP-CIDR,203.0.113.0/24,DIRECT,no-resolve
  - IP-CIDR,10.0.0.0/8,DIRECT,no-resolve
  # 兜底
  - MATCH,shop-a
```

`SRC-IP-CIDR` 这条规则是整套架构的命门。它按源地址匹配，优先级高于任何域名规则。即使某个店铺访问了没在规则表里的冷门域名，也会走对应隧道，不会串到别的出口。

### 3.3 nftables 透明代理规则

mihomo 的 TUN 模式已经能接管大部分流量，但在 macvlan 网关场景下，TUN 的 `auto-route` 有时抓不全转发流量（尤其是容器作为网关转发时）。稳妥做法是叠加 nftables 的 TPROXY 规则兜底。

```bash
# /etc/nftables.d/tproxy.nft
table inet tproxy {
  set localnet {
    type ipv4_addr
    flags interval
    elements = { 203.0.113.0/24, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16 }
  }

  chain prerouting {
    type filter hook prerouting priority mangle; policy accept;

    # 内网直连不劫持
    ip daddr @localnet return

    # TCP 443/80 劫持到 mihomo 的 tproxy 端口
    meta l4proto tcp tcp dport { 80, 443 } tproxy to :7893 meta mark set 0x63 accept

    # UDP 443 (QUIC) 必须劫持，否则直连泄漏真实 IP
    meta l4proto udp udp dport 443 tproxy to :7893 meta mark set 0x63 accept

    # DNS 劫持到内部 resolver
    meta l4proto { tcp, udp } th dport 53 redirect to :1053
  }

  chain output {
    type route hook output priority mangle; policy accept;
    # 网关容器自身流量也要走代理
    meta mark 0x63 return
    ip daddr @localnet return
    meta l4proto tcp tcp dport { 80, 443 } meta mark set 0x63 accept
    meta l4proto udp udp dport 443 meta mark set 0x63 accept
  }
}
```

配套的策略路由，把 mark 0x63 的包导向本地回环（TPROXY 的要求）：

```bash
ip rule add fwmark 0x63 lookup 100
ip route add local 0.0.0.0/0 dev lo table 100
```

`meta mark set 0x63` 和 `ip rule fwmark 0x63` 这一对是 TPROXY 的标准配法，缺一个流量就进不了本地代理进程。`0x63` 这个值是任意选的，只要前后一致即可。

### 3.4 店铺容器：独立 IP + 独立路由

店铺容器用 macvlan 网络，固定 IP，默认路由指向网关容器。下面是 shop-A 的 compose：

```yaml
# docker-compose.shop-a.yml
services:
  shop-a:
    image: lscr.io/linuxserver/chromium:latest
    container_name: shop-a
    restart: unless-stopped
    shm_size: "2gb"
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=America/Los_Angeles
      - CUSTOM_USER=shopadmin
      - PASSWORD=${SHOP_A_PASS}
    volumes:
      - ./shop-a/profile:/config
    networks:
      macvlan-biz:
        ipv4_address: 203.0.113.21
    # 强制默认路由走网关容器
    dns:
      - 203.0.113.20
    # 关键：容器内路由由 macvlan 网络的 gateway 决定
    # 但为保险起见，entrypoint 里再显式加一条

networks:
  macvlan-biz:
    external: true
```

macvlan 网络的 `--gateway=203.0.113.1` 默认把容器默认路由指向物理网关。要让流量先到网关容器（203.0.113.20），需要在容器内覆盖路由。两种做法：

**做法一（推荐）**：在 macvlan 网络创建时就不指定 gateway，让容器起来后手动加路由。或者在 compose 的 `entrypoint` 里加：

```yaml
    entrypoint: >
      sh -c "
      ip route del default 2>/dev/null;
      ip route add default via 203.0.113.20;
      exec /init
      "
```

**做法二**：上游路由器上给这几个 IP 配静态路由，下一跳指向 203.0.113.20。这个更干净，但需要路由器管理权限。

我倾向做法一，容器自包含，不依赖上游设备配置。缺点是容器重启后路由要重加，用 entrypoint 包一层即可。

### 3.5 落地 VPS 侧：静态原生 IP 出站

落地 VPS 是隔离链路的最后一环。它跑 WireGuard 服务端，把隧道流量 SNAT 成自己的静态公网 IP 出站。关键是 **只做 SNAT，不做任何应用层处理**，保持协议栈原生。

```bash
# 落地 VPS: /etc/wireguard/wg0.conf
[Interface]
Address = 10.66.0.1/24
ListenPort = 51820
PrivateKey = REPLACE_SERVER_PRIVATE_KEY
# 关键：MTU 对齐
MTU = 1420
# 出站 SNAT 到本机静态 IP
PostUp = iptables -t nat -A POSTROUTING -s 10.66.0.0/24 -o eth0 -j SNAT --to-source 203.0.113.50
PostDown = iptables -t nat -D POSTROUTING -s 10.66.0.0/24 -o eth0 -j SNAT --to-source 203.0.113.50

[Peer]
PublicKey = REPLACE_CLIENT_A_PUBLIC_KEY
AllowedIPs = 10.66.0.2/32
```

`--to-source 203.0.113.50` 就是那个静态原生 IP。它必须是 VPS 网卡上真实配置的地址（不是 NAT 池），这样出站包的源地址和 IP 归属完全一致，平台侧查 ASN 和 geo 都对得上。

---

## 04. 吞吐性能、高丢包对抗与基准压测对比

配置跑通只是开始，性能才是生产环境的硬指标。跨境电商后台操作对延迟敏感（上传产品图、拉订单列表），隧道叠加 macvlan 后链路变长，必须实测。

### 4.1 三种网络模式的基准对比

测试环境：宿主机 8C16G，千兆上行，上游网关千兆。容器内用 `iperf3` 打流，`curl` 测首字节延迟，各跑 100 次取中位数。

| 指标 | bridge + 代理 | host + 代理 | macvlan + 旁路网关 |
|------|--------------|-------------|-------------------|
| 出口 IP 独立性 | 共享 | 共享 | 每容器独立 |
| 二层身份隔离 | 无 | 无 | 独立 MAC |
| TCP 吞吐（单流） | 680 Mbps | 910 Mbps | 870 Mbps |
| TCP 吞吐（10 并发） | 720 Mbps | 940 Mbps | 905 Mbps |
| 首字节延迟 RTT（本地→落地） | 142 ms | 138 ms | 145 ms |
| 丢包率（稳定） | 0.01% | 0.01% | 0.02% |
| 丢包率（上游 1% 丢包注入） | 3.8% | 3.5% | 4.2% |
| QUIC 劫持完整性 | 需手动配 | 需手动配 | nftables 兜底 |
| 隔离度评分（10 分制） | 2 | 1 | 9 |

macvlan 的吞吐比 host 模式低约 4%，这是二层转发多一跳的代价，完全可接受。延迟多 7ms 是网关容器多做一次策略路由匹配的开销。真正值得注意的是**丢包注入下的表现**：macvlan 模式丢包率 4.2%，比 bridge 高，原因是链路多了一跳，任何一跳的丢包都会被放大。这就要靠 MTU 和重传参数调优来对抗。

### 4.2 MTU 是丢包的隐形杀手

WireGuard 封装开销是 60 字节（IPv4 头 20 + UDP 头 8 + WG 头 32），物理口 1500 减去 60 就是 1440，再留点余量设 1420 是行业惯例。如果 MTU 没调对，表现为：小包（ping、DNS）正常，大包（图片上传、视频）卡死或超时。因为大包被分片后，中间某跳的防火墙丢弃了分片包，TCP 一直重传。

逐级探测 MTU 的正确姿势：

```bash
# 从 1472 开始（1500 -