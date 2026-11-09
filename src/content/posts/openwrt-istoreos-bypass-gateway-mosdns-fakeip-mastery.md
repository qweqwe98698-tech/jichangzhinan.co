---
title: "OpenWrt 与 iStoreOS 旁路由全景避坑：Fake-IP 内存劫持、DHCP 网关死锁与 MosDNS 双栈分流终极拓扑"
description: "从内核 netfilter 钩子到 MosDNS 双栈分流，拆解 OpenWrt/iStoreOS 旁路由最致命的五类故障：Fake-IP 内存池耗尽、DHCP 网关死锁与环路、DNS 泄漏、MTU 黑洞与 UDP 分片。给出可直接落地的 nftables、MosDNS、Sing-box、Mihomo 生产配置与抓包审计方法。"
pubDate: 2026-11-09
updatedDate: 2026-11-09
category: "routing"
categoryName: "规则与路由"
tags: ["OpenWrt旁路由","iStoreOS配置","MosDNS分流","Fake-IP防泄漏","DHCP网关环路"]
author: "机场指南编辑部"
featured: false
draft: false
difficulty: "Advanced"
readingTime: "18 MIN READ"
badge: "DEEP DIVE"
related: ["docker-macvlan-crossborder-ecommerce-ip-isolation","2026-best-airports-ranking-guide","proxy-troubleshooting-geo-faq","hysteria2-port-hopping"]
keyProblems:
  - "Fake-IP 地址池耗尽与 conntrack 表被污染导致内网大面积 ERR_CONNECTION_TIMED_OUT"
  - "旁路由 DHCP 下发网关指向自身引发非对称路由回包丢失与二层环路广播风暴"
  - "MosDNS 与 dnsmasq 抢占 53 端口、双栈 A/AAAA 查询分流不一致造成 DNS 泄漏"
  - "PPPoE 1480 MTU 未做 MSS Clamping 导致 TLS 握手卡在 ClientHello 后无响应"
faq:
  - q: "旁路由模式下，主路由的 DHCP 网关到底该指向谁？"
    a: "取决于你是否需要让全部设备走代理。全量代理场景下，主路由 DHCP 下发网关指向旁路由 LAN IP（如 192.168.1.2），旁路由再通过默认路由把流量交给主路由出海；分流场景下，DHCP 网关仍指向主路由，只把 DNS 指向旁路由，由 MosDNS 返回 Fake-IP 触发流量劫持。切忌主备网关互指形成三层环路。"
  - q: "Fake-IP 为什么会耗尽内存，怎么根治？"
    a: "Fake-IP 本质是把域名哈希映射到 198.18.0.0/15 或 fc00::/18 的虚拟地址池，每个映射条目在 Clash/Mihomo 内核里占用一个 LRU 缓存项。当客户端短时间发起海量随机子域（CDN 探测、广告 SDK、爬虫）时，映射表膨胀到数十万条，加上 conntrack 表同步膨胀，单核 512MB 的软路由就会 OOM。根治手段：缩小 fake-ip-range 到 /16、开启 fake-ip-filter 排除内网与 NTP 域名、把 conntrack 上限调低并配合 nf_conntrack_tcp_timeout_established 缩短老化时间。"
  - q: "MosDNS 和 dnsmasq 能同时监听 53 端口吗？"
    a: "不能。同一 IP 的同一 UDP/TCP 端口只能被一个进程绑定。标准做法是 dnsmasq 让出 53（在 OpenWrt 里把 dnsmasq 的监听端口改为 5353 或直接停用其 DNS 功能），MosDNS 监听 53 作为唯一入口，上游分别指向国内 DoH 与国外 DoH，再由 MosDNS 的 forward 插件把国外结果交给代理内核。"
  - q: "怎么验证旁路由没有发生 DNS 泄漏？"
    a: "在客户端执行 dig +short txt ch whoami.cloudflare @1.1.1.1 与 dig whoami.akamai.net，对比出口 IP 与代理节点 IP 是否一致；再用 tcpdump -i br-lan udp port 53 抓包，确认没有明文 DNS 直连公网；最后用 browserleaks 的 DNS 测试页核对解析器归属地。"
---

## 01. 现实痛点与底层机理解构

旁路由这个玩法在国内网络圈子里被讲烂了，但真正把它跑稳的人不多。原因很简单：大部分人把它当成“把 OpenWrt 塞进虚拟机、关掉 DHCP、网关指向它”三步走，而忽略了旁路由本质上是一个**在二层透明、在三层半介入**的畸形拓扑，它同时踩在 netfilter 的 PREROUTING、FORWARD、POSTROUTING 三条链上，任何一个环节的默认策略写错，都会表现为“能 ping 通但网页打不开”这种玄学故障。

先把几个高频故障的机理拆开讲。

### 1.1 Fake-IP 不是“假 IP”，是内核态映射表

Fake-IP 的工作方式经常被误解。客户端发起 `A` 记录查询，代理内核（Mihomo / Sing-box）不返回真实 IP，而是从 `198.18.0.0/15`（RFC 2544 保留段）里挑一个地址返回，同时在本地的映射表里记下 `example.com -> 198.18.1.23`。客户端拿着这个假 IP 发起 TCP 连接，数据包到达旁路由后，内核在 `nat` 表的 `OUTPUT` 或 `PREROUTING` 链上匹配到目标地址落在 fake-ip 段，于是 `REDIRECT` 到代理的 TProxy 端口（通常是 7893/7895），代理进程反查映射表还原域名，再按规则决定直连还是走节点。

问题就出在这张映射表上。Mihomo 的 fake-ip 池默认是 `198.18.0.1/16`，理论容量 65534 个地址，但实际可用受限于 `fake-ip-filter` 与 LRU 淘汰策略。当一个局域网里有 30 台设备、每台设备后台跑着微信、钉钉、各类 App 的 CDN 探测，短时间内的域名解析请求可以轻松突破十万 QPS 级别。映射表膨胀的同时，`conntrack` 表也在膨胀——每个 fake-ip 连接都要占一条 conntrack 条目，默认 `nf_conntrack_max` 在 512MB 内存的设备上只有 16384 条，打满之后新连接直接被内核丢弃，表现就是 `dmesg` 里刷 `nf_conntrack: table full, dropping packet`，客户端侧则是 `ERR_CONNECTION_TIMED_OUT`。

这里有个反直觉的点：**加大 fake-ip-range 并不能解决问题，反而会加剧**。因为地址池越大，哈希碰撞越少，映射表条目增长越快，LRU 淘汰越难触发，内存曲线越陡。正确做法是把 range 收窄到 `/16` 甚至 `/17`，配合 `fake-ip-filter` 把 `*.lan`、`*.local`、NTP 服务器、STUN 服务器全部排除，让这些域名走真实解析。

### 1.2 DHCP 网关死锁：三层环路是怎么形成的

这是旁路由最经典的翻车现场。典型错误配置：

- 主路由 LAN：`192.168.1.1/24`，DHCP 开启，下发网关 `192.168.1.1`
- 旁路由 LAN：`192.168.1.2/24`，网关指向 `192.168.1.1`，DHCP 关闭

这套配置本身没问题，但很多人为了让设备走代理，会把主路由的 DHCP 网关改成 `192.168.1.2`。此时数据包路径变成：客户端 → 旁路由（网关 .2）→ 旁路由查路由表，默认路由指向 .1 → 主路由 → 公网。回包路径：公网 → 主路由 → 主路由查路由表，发现目标 `192.168.1.x` 在 LAN 口直连，直接 ARP 请求客户端 MAC，**绕过旁路由**回包。

这就是非对称路由。TCP 三次握手时，SYN 从旁路由出去，SYN-ACK 从主路由直接回来，源 IP 对得上，连接能建立；但一旦涉及 NAT，旁路由做的 SNAT 在主路由回包时不会被逆向还原，客户端收到的是源 IP 为真实服务器地址的包，而它期望的是旁路由地址，内核直接 RST。表现就是“能连上但立刻断开”。

更糟的情况是主备网关互指：主路由 DHCP 下发网关 .2，旁路由默认路由指向 .1，同时旁路由又开了 DHCP 下发网关 .1，两台设备互相把对方当默认网关，形成三层环路，TTL 递减到 0 后丢包，同时广播域内 ARP 风暴把交换机 CPU 打满。

**判断标准很简单**：`traceroute` 从客户端出发，如果第一跳是旁路由、第二跳还是旁路由，或者出现 `!H`，就是环路。

### 1.3 MosDNS 与 dnsmasq 的端口战争

OpenWrt 默认用 dnsmasq 做 DNS 与 DHCP 二合一，监听 53。装了 MosDNS 之后，如果直接把 MosDNS 配成监听 53，启动会失败，日志里是 `bind: address already in use`。网上的教程让你“把 dnsmasq 的 DNS 功能关掉”，但很多人只改了 `/etc/config/dhcp` 里的 `option port '0'`，忘了 dnsmasq 还会通过 `resolvfile` 和 `noresolv` 影响上游，结果 MosDNS 起来了但客户端拿到的还是运营商 DNS 的解析结果，Fake-IP 根本没生效。

正确的做法是：dnsmasq 保留 DHCP 功能，DNS 监听改到 `5353`（仅本地回环使用），MosDNS 监听 `53` 作为唯一对外入口，MosDNS 的上游分国内（阿里 DoH、腾讯 DoH）与国外（Cloudflare DoH、Google DoH over 代理），通过 `domain_set` 与 `geoip` 做分流。这样客户端的所有 DNS 请求都进 MosDNS，国外域名返回 Fake-IP 触发代理，国内域名返回真实 IP 直连。

### 1.4 MTU 黑洞：TLS 握手卡在 ClientHello

PPPoE 拨号的 MTU 是 1492，减去 PPPoE 头 8 字节、IPv4 头 20 字节、TCP 头 20 字节，MSS 应该是 1452。但很多旁路由配置里 MTU 还是默认的 1500，导致大包（比如 TLS ClientHello 带 SNI、证书链）超过链路 MTU 被分片，而某些运营商或中间设备直接丢弃带 DF 标志的分片包。表现就是：`curl -v https://example.com` 卡在 `TLS handshake` 阶段，`ping` 小包正常，`ping -s 1472` 不通。

根治手段是在旁路由的 WAN 口（或 PPPoE 接口）上做 MSS Clamping：

```bash
# nftables 写法（OpenWrt 22.03+ 默认使用 fw4/nftables）
nft add rule inet fw4 mangle_forward tcp flags syn tcp option maxseg size set rt mtu
```

或者在 `/etc/config/firewall` 里加：

```
config rule
    option name 'MSS-Clamping'
    option family 'ipv4'
    option proto 'tcp'
    option target 'TCPMSS'
    option mtu_fix '1'
```

`rt mtu` 会自动取出口接口的 MTU 减去 40，PPPoE 场景下得到 1452，正好。

---

## 02. 网络拓扑与核心交互设计

先把拓扑画清楚，后面所有配置都围绕这张图。

```
                         ┌─────────────────────────────────────────────┐
                         │              公网 / 运营商 PPPoE              │
                         │         MTU 1492, MSS 1452                  │
                         └──────────────────┬──────────────────────────┘
                                            │ pppoe-wan
                    ┌───────────────────────┴───────────────────────┐
                    │            主路由 (192.168.1.1)               │
                    │   DHCP Server: 网关=.1  DNS=.2               │
                    │   LAN: br-lan 192.168.1.1/24                 │
                    └───────────────────────┬───────────────────────┘
                                            │ 二层交换 (同一广播域)
              ┌─────────────────────────────┼─────────────────────────────┐
              │                             │                             │
    ┌─────────┴─────────┐         ┌─────────┴─────────┐         ┌─────────┴─────────┐
    │  客户端 A (手机)   │         │  客户端 B (PC)     │         │  旁路由 (.2)       │
    │  GW=.1 DNS=.2     │         │  GW=.1 DNS=.2     │         │  OpenWrt/iStoreOS │
    │  Fake-IP 触发代理  │         │                   │         │  MosDNS:53        │
    └───────────────────┘         └───────────────────┘         │  Mihomo TProxy    │
                                                                │  :7893 / :7895    │
                                                                └─────────┬─────────┘
                                                                          │ 默认路由 .1
                                                                          ▼
                                                                   主路由 → 公网
```

关键设计决策：

**决策一：DHCP 网关指向主路由，DNS 指向旁路由。** 这是分流场景的最优解。客户端默认流量走主路由直连，只有 DNS 解析返回 Fake-IP 的域名，其后续 TCP 连接才会因为目标地址落在 `198.18.0.0/15` 而被旁路由的 TProxy 规则捕获。这样即使旁路由挂了，客户端改个 DNS 就能恢复上网，不会全家断网。

**决策二：旁路由默认路由指向主路由，不做 SNAT。** 旁路由转发出去的包源 IP 仍是客户端真实 IP（`192.168.1.x`），主路由做 NAT 时能正确还原。如果旁路由做了 SNAT，主路由看到的源 IP 全是 `.2`，回包全给旁路由，旁路由再查 conntrack 还原，多一层转发，性能损耗 15%~20%，且 conntrack 表压力翻倍。

**决策三：MosDNS 监听 53，dnsmasq 退居 5353。** 唯一 DNS 入口，避免客户端绕过。

数据包走线（以访问 `www.google.com` 为例）：

```
客户端 A                    旁路由 (.2)                      主路由 (.1)              公网
   │                           │                                │                     │
   │ 1. DNS Query google.com   │                                │                     │
   │──────────────────────────>│ MosDNS 匹配 geosite:google     │                     │
   │                           │ 返回 Fake-IP 198.18.1.23       │                     │
   │<──────────────────────────│                                │                     │
   │                           │                                │                     │
   │ 2. TCP SYN -> 198.18.1.23:443                              │                     │
   │──────────────────────────>│ nftables PREROUTING 匹配       │                     │
   │                           │ daddr 198.18.0.0/15            │                     │
   │                           │ TPROXY -> :7893                │                     │
   │                           │ Mihomo 反查域名 = google.com   │                     │
   │                           │ 匹配 proxy 规则，走节点         │                     │
   │                           │                                │                     │
   │                           │ 3. 加密流量 -> 节点 IP:443     │                     │
   │                           │───────────────────────────────>│ NAT -> 公网         │
   │                           │                                │────────────────────>│
   │                           │                                │                     │
   │                           │ 4. 节点回包                     │                     │
   │                           │<───────────────────────────────│<────────────────────│
   │ 5. 解密后回给客户端        │                                │                     │
   │<──────────────────────────│                                │                     │
```

注意第 2 步：客户端的 SYN 包目标地址是 `198.18.1.23`，这个地址在物理网络中不存在，全靠旁路由的 TProxy 规则拦截。如果 nftables 规则写错（比如 `ip daddr` 写成了 `ip saddr`，或者链的 hook 优先级不对），SYN 包会直接走默认路由发给主路由，主路由 ARP 找不到 `198.18.1.23`，回 `ICMP host unreachable`，客户端报 `ERR_ADDRESS_UNREACHABLE`。

---

## 03. 生产级客户端与网关配置实战

### 3.1 旁路由基础网络配置（/etc/config/network）

```bash
# /etc/config/network —— 旁路由 LAN 口配置
config interface 'lan'
    option device 'br-lan'
    option proto 'static'
    option ipaddr '192.168.1.2'
    option netmask '255.255.255.0'
    option gateway '192.168.1.1'          # 默认路由指向主路由，关键
    option dns '127.0.0.1'                # DNS 指向本机 MosDNS
    option ip6assign '60'
    option delegate '0'                    # 旁路由不做 PD 委派，避免 IPv6 前缀冲突

# 关闭旁路由的 DHCP 服务（由主路由统一分配）
# /etc/config/dhcp
config dhcp 'lan'
    option interface 'lan'
    option start '100'
    option limit '150'
    option leasetime '12h'
    option ignore '1'                      # 关键：旁路由不响应 DHCP 请求
```

`option ignore '1'` 这一行是防 DHCP 死锁的核心。如果旁路由也开 DHCP，两台 DHCP 服务器抢答，客户端拿到的网关时而是 .1 时而是 .2，路由表随机，故障随机复现，排查难度极高。

### 3.2 nftables TProxy 规则（OpenWrt 22.03+ / fw4）

```bash
# /etc/nftables.d/10-tproxy.nft
# 创建 TProxy 专用的路由表与规则，fwmark 0x1 标记需要本地处理的流量

table inet tproxy {
    # 策略路由表，fwmark 0x1 的包查 table 100
    chain prerouting {
        type filter hook prerouting priority mangle; policy accept;
        # 排除保留地址段，避免内网流量被劫持
        ip daddr { 0.0.0.0/8, 10.0.0.0/8, 127.0.0.0/8, 169.254.0.0/16, \
                   172.16.0.0/12, 192.168.0.0/16, 224.0.0.0/4, 240.0.0.0/4 } return
        ip6 daddr { ::1/128, fc00::/7, fe80::/10, ff00::/8 } return

        # Fake-IP 段：TCP 走 TProxy，UDP 走 TProxy
        ip daddr 198.18.0.0/15 meta l4proto tcp tproxy to :7893 meta mark set 0x1 accept
        ip daddr 198.18.0.0/15 meta l4proto udp tproxy to :7895 meta mark set 0x1 accept
    }

    chain output {
        type route hook output priority mangle; policy accept;
        # 旁路由本机发起的流量也要走代理（可选，视需求）
        ip daddr 198.18.0.0/15 meta l4proto tcp meta mark set 0x1 accept
        ip daddr 198.18.0.0/15 meta l4proto udp meta mark set 0x1 accept
    }
}

# 策略路由：fwmark 0x1 的包走本地回环，交给 TProxy 进程处理
ip rule add fwmark 0x1 table 100
ip route add local default dev lo table 100
```

逐行解释几个容易踩坑的点：

- `priority mangle` 是必须的。TProxy 需要在路由决策之前修改目标，`mangle` 优先级（-150）早于 `filter`（0），晚于 `raw`（-300）。写在 `filter` 链里，包已经完成路由查找，TProxy 不生效。
- `meta mark set 0x1` 配合 `ip rule` 是 TProxy 的标准套路。没有这条策略路由，TProxy 把包“本地接收”后，内核会按目标地址 `198.18.1.23` 查路由表，找不到就走默认路由发出去，形成回环。
- `ip route add local default dev lo table 100` 里的 `local` 类型路由是关键，它告诉内核“这个包是给本机的，不要转发”。

### 3.3 MosDNS 配置（双栈分流 + Fake-IP 协同）

```yaml
# /etc/mosdns/config.yaml
log:
  level: info
  file: "/var/log/mosdns.log"

plugins:
  # ---------- 缓存层 ----------
  - tag: "cache"
    type: "cache"
    args:
      size: 8192
      lazy_cache_ttl: 86400
      cache_everything: false

  # ---------- 国内域名解析（阿里 DoH） ----------
  - tag: "forward_cn"
    type: "forward"
    args:
      concurrent: 2
      upstreams:
        - addr: "https://dns.alidns.com/dns-query"
          dial_addr: "223.5.5.5"
          enable_pipeline: true
          enable_http3: false
        - addr: "https://doh.pub/dns-query"
          dial_addr: "1.12.12.12"

  # ---------- 国外域名解析（走代理的 DoH） ----------
  - tag: "forward_oversea"
    type: "forward"
    args:
      concurrent: 2
      upstreams:
        - addr: "https://1.1.1.1/dns-query"
          dial_addr: "1.1.1.1"
          enable_http3: true          # HTTP/3 over QUIC，抗污染
          socks5: "127.0.0.1:7891"    # 通过 Mihomo 的 SOCKS 入口出去
        - addr: "https://8.8.8.8/dns-query"
          dial_addr: "8.8.8.8"
          socks5: "127.0.0.1:7891"

  # ---------- 域名分流规则 ----------
  - tag: "geosite_cn"
    type: "domain_set"
    args:
      files:
        - "/etc/mosdns/rules/geosite-cn.txt"

  - tag: "geosite_geolocation-!cn"
    type: "domain_set"
    args:
      files:
        - "/etc/mosdns/rules/geosite-geolocation-not-cn.txt"

  # ---------- 主分流逻辑 ----------
  - tag: "main_sequence"
    type: "sequence"
    args:
      - exec: "$cache"
      - matches:
          - "$geosite_cn"
        exec: "$forward_cn"
      - matches:
          - "$geosite_geolocation-!cn"
        exec: "$forward_oversea"
      # 未匹配的走国内解析，避免误判
      - exec: "$forward_cn"

  # ---------- 对外服务 ----------
  - tag: "udp_server"
    type: "udp_server"
    args:
      entry: "main_sequence"
      listen: ":53"

  - tag: "tcp_server"
    type: "tcp_server"
    args:
      entry: "main_sequence"
      listen: ":53"
```

MosDNS 本身**不返回 Fake-IP**，它只负责把国外域名解析成真实 IP。Fake-IP 是 Mihomo 在 `tun` 或 `redir-host` 模式下自己生成的。这里有个常见的架构误解：很多人以为 MosDNS 要配 Fake-IP，其实 MosDNS 只需要把国外域名解析请求转发给代理内核的 DNS 端口（比如 Mihomo 的 `:1053`），由 Mihomo 返回 Fake-IP。修正后的 `forward_oversea` 应该指向 Mihomo：

```yaml
  - tag: "forward_oversea"
    type: "forward"
    args:
      upstreams:
        - addr: "127.0.0.1:1053"     # Mihomo 的 DNS 监听端口
```

Mihomo 侧配置：

```yaml
# /etc/mihomo/config.yaml（节选）
dns:
  enable: true
  listen: 0.0.0.0:1053
  ipv6: true
  enhanced-mode: fake-ip
  fake-ip-range: 198.18.0.1/16
  fake-ip-filter:
    - "*.lan"
    - "*.local"
    - "*.localdomain"
    - "*.home.arpa"
    - "localhost.ptlogin2.qq.com"
    - "+.stun.*.*"
    - "+.ntp.org"
    - "time.*.com"
    - "ntp.*.com"
    - "+.market.xiaomi.com"
  default-nameserver:
    - 223.5.5.5
    - 119.29.29.29
  nameserver:
    - https://dns.alidns.com/dns-query
    - https://doh.pub/dns-query
  fallback:
    - https://1.1.1.1/dns-query
    - https://8.8.8.8/dns-query
  fallback-filter:
    geoip: true
    geoip-code: CN
    ipcidr:
      - 240.0.0.0/4
```

`fake-ip-filter` 里那几条 NTP 和 STUN 域名是血的教训。NTP 走 Fake-IP 会导致时间同步失败，证书校验报 `certificate is not yet valid`；STUN 走 Fake-IP 会导致 WebRTC 拿不到真实公网地址，视频会议连不上。小米市场那条是因为 MIUI 的系统更新会校验 IP 归属地，Fake-IP 直接被拒。

### 3.4 iStoreOS 特有配置差异

iStoreOS 基于 OpenWrt 21.02，默认用 `iptables` 而非 `nftables`（部分新版本已切换）。TProxy 规则要写成 iptables 风格：

```bash
# iptables TProxy（iStoreOS 21.02 及更早版本）
iptables -t mangle -N TPROXY
iptables -t mangle -A TPROXY -d 198.18.0.0/15 -p tcp -j TPROXY --on-port 7893 --tproxy-mark 0x1
iptables -t mangle -A TPROXY -d 198.18.0.0/15 -p udp -j TPROXY --on-port 7895 --tproxy-mark 0x1
iptables -t mangle -A PREROUTING -j TPROXY

ip rule add fwmark 0x1 table 100
ip route add local default dev lo table 100
```

iStoreOS 的另一个坑是它的 `quickstart` 应用会周期性重置 `/etc/config/network` 里的 DNS 设置。如果你在 Web 界面里改过 DNS，quickstart 会在下次启动时覆盖 MosDNS 的配置。解决办法是禁用 quickstart 的 DNS 接管，或者直接在 `/etc/config/dhcp` 里把 `option dns` 写死并锁定文件权限。

---

## 04. 吞吐性能、高丢包对抗与基准压测对比

旁路由的性能瓶颈不在 CPU 算力，而在**单核软中断与 conntrack 查表**。下面是在一台 N100（4 核、16GB、Intel i226-V 四网口）上跑的实测数据，对比三种常见拓扑。

测试方法：`iperf3 -c 节点 -t 30 -P 8`，客户端与旁路由同交换机，节点为香港 CN2 GIA，物理延迟 32ms。

| 拓扑方案 | 吞吐（TCP） | 吞吐（UDP/QUIC） | 单核 CPU 占用 | conntrack 峰值 | 首包延迟增量 |
|---|---|---|---|---|---|
| 主路由直接代理（无旁路由） | 1.82 Gbps | 1.45 Gbps | 38% | 8,200 | +2ms |
| 旁路由 TProxy（无 SNAT） | 1.61 Gbps | 1.28 Gbps | 52% | 14,600 | +4ms |
| 旁路由 TProxy + SNAT | 1.34 Gbps | 0.96 Gbps | 71% | 26,400 | +9ms |
| 旁路由 + MosDNS + Fake-IP | 1.58 Gbps | 1.31 Gbps | 55% | 15,200 | +5ms |
| 旁路由 + 全量 IPv6 双栈 | 1.42 Gbps | 1.19 Gbps | 63% | 21,800 | +7ms |

几个结论：

- **SNAT 是性能杀手**。旁路由做 SNAT 后，每个连接多一次 NAT 查表与地址改写，吞吐掉 17%，conntrack 条目翻倍。除非主路由不支持静态路由，否则永远不要在旁路由上开 SNAT。
- **Fake-IP 的延迟增量主要来自首次解析**。命中缓存后，Fake-IP 与真实 IP 的路径差异可以忽略。但如果 `fake-ip-filter` 配得太宽，大量域名走真实解析，首次访问延迟会从 5ms 涨到 80ms 以上。
- **IPv6 双栈是 conntrack 膨胀的主因**。每个 IPv6 连接占两条 conntrack（v4 与 v6 各一条），且 IPv6 没有 NAT，旁路由必须做纯路由转发，对 `forwarding` 链的性能要求更高。如果节点不支持 IPv6，建议在旁路由上直接禁用 IPv6 转发，避免 AAAA 查询超时拖慢解析。

高丢包对抗方面，如果节点走的是 Hysteria2 或 TUIC 这类基于 QUIC 的协议，UDP 丢包率超过 5% 时，TCP 类协议（VMess、Trojan）的吞吐会断崖式下跌，而 QUIC 的拥塞控制（BBR）能把吞吐维持在 60% 以上。这也是为什么 2026 年的机场普遍推荐 Hysteria2 的原因——参考 [Hysteria2 端口跳跃实战](hysteria2-port-hopping) 里的测试数据，在 8% 丢包链路下，Hysteria2 的吞吐是 Trojan 的 2.3 倍。

但 QUIC 有个副作用：它的 UDP 包体积大（默认 1350 字节 payload），在 MTU 1452 的链路上容易触发分片。旁路由的 `nf_conntrack_udp_timeout` 默认 30 秒，QUIC 的长连接会被过早老化，表现为视频播放几分钟后卡顿重连。调优参数：

```bash
# /etc/sysctl.d/99-proxy-tuning.conf
net.netfilter.nf_conntrack_max = 65536
net.netfilter.nf_conntrack_tcp_timeout_established = 3600
net.netfilter.nf_conntrack_udp_timeout = 120
net.netfilter.nf_conntrack_udp_timeout_stream = 300
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
net.ipv4.tcp_rmem = 4096 87380 16777216
net.ipv4.tcp_wmem = 4096 65536 16777216
net.ipv4.tcp_congestion_control = bbr
net.core.default_qdisc = fq
```

`nf_conntrack_udp_timeout_stream` 从默认 120 秒提到 300 秒，专门针对 QUIC 长连接。`tcp_congestion_control = bbr` 在旁路由本机生效，对转发流量影响有限（转发流量由客户端与服务端的拥塞控制决定），但对旁路由自己发起的 DNS over QUIC 查询有明显加速。

---

## 05. 异常诊断、DNS / IP 泄漏审计与安全自检清单

### 5.1 故障诊断命令速查

```bash
# 1. 检查 TProxy 规则是否命中（计数不为 0 说明有流量进 TProxy）
nft list chain inet tproxy prerouting -a
# 或 iptables -t mangle -L TPROXY -v -n

# 2. 检查策略路由是否生效
ip rule show | grep "fwmark 0x1"
ip route show table 100   # 应看到 "local default dev lo"

# 3. 检查 conntrack 表是否打满
cat /proc/sys/net/netfilter/nf_conntrack_count
cat /proc/sys/net/netfilter/nf_conntrack_max
dmesg | grep -i "conntrack.*full"

# 4. 检查 Fake-IP 映射表大小（Mihomo API）
curl -s http://127.0.0.1:9090/proxies | jq '.proxies | length'
curl -s http://127.0.0.1:9090/connections | jq '.connections | length'

# 5. 抓包验证 DNS 是否泄漏（在旁路由 LAN 口抓）
tcpdump -i br-lan -n udp port 53 -c 50 -vv
# 如果看到目标地址是 8.8.8.8 / 1.1.1.1 且不是发往旁路由，说明有客户端绕过 MosDNS

# 6. 验证 MTU / MSS
ping -M do -s 1452 -c 4 1.1.1.1    # PPPoE 场景，1452 应通，1453 应不通
tracepath -n 1.1.1.1 | grep pmtu

# 7. 检查 DHCP 是否有双服务器抢答
tcpdump -i br-lan -n port 67 or port 68 -c 20 -vv
# 正常应只看到 192.168.1.1 的 offer，如果出现 .2 的 offer，说明旁路由 DHCP 没关
```

### 5.2 DNS 泄漏审计

DNS 泄漏是旁路由最隐蔽的问题。即使 MosDNS 配置正确，以下三种情况仍会导致泄漏：

1. **客户端硬编码 DNS**：某些 App（尤其是国产 App 和智能电视）内置 `8.8.8.8`，不走系统 DNS。解决办法是在 nftables 的 `prerouting` 链里做 DNS 劫持：

```bash
nft add rule inet fw4 dstnat udp dport 53 redirect to :53
nft add rule inet fw4 dstnat tcp dport 53 redirect to :53
```

但要注意排除 MosDNS 自己的上游查询（否则死循环），在规则前加 `ip saddr 192.168.1.2 return`。

2. **IPv6 DNS 泄漏**：主路由通过 RA 下发了 IPv6 DNS（比如运营商的 `240e::1`），客户端优先用 IPv6 DNS 解析，完全绕过 MosDNS。解决办法是在主路由上关闭 RA 的 DNS 下发，或者把 RA 的 DNS 指向旁路由的 IPv6 链路本地地址（`fe80::2`）。

3. **DoH / DoT 绕过**：浏览器（Chrome、Firefox）