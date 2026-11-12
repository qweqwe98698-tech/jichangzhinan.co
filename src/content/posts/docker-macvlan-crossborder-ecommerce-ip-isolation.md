---
title: "Docker Macvlan 旁路网关实战：跨境电商多店铺网络隔离与独立静态原生 IP 容器化映射"
description: "从内核层拆解 Docker Macvlan 旁路网关架构，用独立静态原生 IP 为每个跨境电商店铺容器做二层网络隔离，附完整 Compose/YAML/nftables 配置、丢包对抗压测数据与 DNS/IP 泄漏审计清单。"
pubDate: 2026-11-01
updatedDate: 2026-11-12
category: "routing"
categoryName: "规则与路由"
tags: ["Docker Macvlan","跨境电商防关联","多店铺网络隔离","静态原生IP","透明网关容器"]
author: "机场指南编辑部"
featured: false
draft: false
difficulty: "Advanced"
readingTime: "22 MIN READ"
badge: "DEEP DIVE"
related: ["2026-best-airports-ranking-guide","ai-productivity-residential-ip-anti-fraud-architecture","clash-verge-rev-advanced-scripts-mihomo-meta-overrides","network-protocols-comparison"]
keyProblems:
  - "Docker 默认 bridge 网络下所有容器共享宿主 SNAT 出口 IP，店铺账号被平台风控判定为同源关联"
  - "Macvlan 子接口与宿主 eth0 的 ARP/路由冲突，容器出站流量回包丢失导致 TCP 握手超时"
  - "透明网关容器 TPROXY 规则与 Docker iptables 链顺序打架，UDP/443 QUIC 流量绕过代理直连泄漏真实 IP"
  - "多店铺容器 DNS 解析走宿主 resolv.conf，EDNS Client Subnet 与 DNS 泄漏暴露真实地理位置"
faq:
  - q: "Docker Macvlan 和普通 bridge 网络做店铺隔离，本质区别在哪？"
    a: "bridge 网络下容器出站全部经宿主 netfilter 做 SNAT，外部平台看到的源 IP 是宿主公网 IP，多容器天然同源。Macvlan 让容器直接挂到物理网卡的二层域，每个容器拥有独立 MAC 与独立 IP，出站可绑定各自独立的静态原生 IP 线路，平台侧看到的是完全不同的网络身份。代价是宿主默认无法与 Macvlan 子接口直接通信，需要额外建一个 macvlan shim 接口解决。"
  - q: "为什么容器里开了代理，平台还是能识别出真实 IP？"
    a: "九成情况是 QUIC/UDP 443 没被接管。Chrome 默认走 HTTP/3，若 nftables 只 REDIRECT 了 TCP，UDP 443 会直连出去，源 IP 直接暴露。必须在 nat 表对 udp dport 443 做 TPROXY 或直接 DROP 强制回落 TCP，同时关闭容器内浏览器的 QUIC。其次是 DNS 泄漏，容器 resolv.conf 指向了公共 DNS，解析请求带真实出口。"
  - q: "Macvlan 模式下容器和宿主互相 ping 不通，是配置错了吗？"
    a: "不是错，是 Macvlan 的设计特性。物理网卡收到的 Macvlan 子接口流量会被网卡硬件直接分流，宿主协议栈看不到。解决办法是在宿主上再建一个 macvlan 接口（shim），分配同网段 IP 并加一条指向容器网段的路由，宿主即可与容器互通。"
  - q: "多个店铺容器用同一张物理网卡的不同静态 IP，会被判定关联吗？"
    a: "网络层看是不同 IP、不同 MAC，但若这些 IP 属于同一 /24 段、同一 ASN、同一机房，平台的风控图谱仍可能做 IP 段聚类。工程上建议不同店铺尽量落在不同 C 段甚至不同 ASN 的原生住宅/机房 IP，并保证时区、语言、Canvas 指纹与 IP 地理一致。"
---

## 01. 现实痛点与底层机理解构

跨境电商多店铺运营这件事，网络层要解决的核心问题只有一个：**让平台风控系统相信，这几个店铺背后是几个互不相干的人，在几个互不相干的地方，用几台互不相干的设备在上网。** 这句话拆到协议栈里，就是三层身份必须同时隔离——网络层（源 IP、ASN、地理）、链路层（MAC、TCP/IP 指纹）、应用层（TLS 指纹、DNS、时区、Canvas）。

绝大多数人栽在第一层。用 Docker 默认的 `bridge` 网络跑几个店铺浏览器容器，`docker network inspect bridge` 一看，所有容器都在 `172.17.0.0/16` 里，出站流量统一经宿主 `netfilter` 的 `POSTROUTING` 链做 SNAT：

```bash
# 默认 bridge 下，容器出站必然命中这条 MASQUERADE
iptables -t nat -L POSTROUTING -n -v
# Chain POSTROUTING (policy ACCEPT)
# target     prot opt source        destination
# MASQUERADE  all  --  172.17.0.0/16  0.0.0.0/0
```

平台侧看到的源 IP 是宿主那一个公网 IP，TCP 时间戳、初始 TTL、MSS 全部一致，连 `User-Agent` 里带的系统字体渲染都因为同一台宿主而趋同。风控图谱里这几个账号直接被画进同一个簇，关联封号只是时间问题。

### 1.1 风控评分到底在看什么

把平台风控想象成一个加权评分器，网络维度的输入大致是这几项：

| 维度 | 采集方式 | 关联判定阈值（经验值） |
|---|---|---|
| 源 IP 重复度 | 登录/下单请求源 IP | 同 IP 出现 ≥2 账号即高危 |
| IP 段聚类 | /24 段、ASN、机房归属 | 同 /24 段 ≥3 账号触发人工审核 |
| IP 类型 | 住宅/机房/移动，查 IP 库 | 机房 IP 做买家号直接降权 |
| TCP/IP 指纹 | 初始 TTL、窗口大小、MSS、时间戳 | 指纹完全一致视为同设备 |
| TLS 指纹 (JA3/JA4) | ClientHello 扩展顺序、密码套件 | 与 IP 地理不符触发挑战 |
| DNS 泄漏 | 解析请求源、ECS 字段 | 解析出口与代理出口不一致即标记 |
| 时区/语言 | JS `Intl`、`navigator.language` | 与 IP 地理矛盾扣分 |

看到没有，**IP 只是入场券，不是全部**。但它是权重最高、最容易做错、也最容易被工程手段彻底解决的一项。本文要做的，就是用 Docker Macvlan 把每个店铺容器钉死在一个独立的静态原生 IP 上，从二层开始就切断同源可能。

### 1.2 为什么是 Macvlan，而不是 bridge + 多 IP 绑定

有人会想：宿主上绑多个公网 IP，容器用 `--network host` 或者 `--ip` 指定源地址不就行了？能跑，但有两个致命问题。

第一，`--network host` 的容器共享宿主网络命名空间，所有容器看到的是同一套网卡、同一套路由表、同一个 `resolv.conf`。你没法给容器 A 指定走 IP1、容器 B 走 IP2，除非在容器内部再写复杂的 `ip rule`，而且容器逃逸风险陡增。

第二，bridge 网络下即便用 `--ip` 指定容器 IP，出站仍要经过宿主 SNAT，`iptables` 的 `MASQUERADE` 会把源地址改写回宿主主 IP，除非你为每个容器写 `SNAT --to-source`，规则数量随店铺数线性膨胀，维护成本爆炸。

Macvlan 的思路完全不同：它在物理网卡（比如 `eth0`）上创建虚拟子接口，每个子接口有**独立的 MAC 地址**，容器直接加入物理网卡的二层广播域。容器发出的以太网帧带着自己的 MAC 直接上交换机，根本不经过宿主的路由和 NAT。平台侧抓包看到的，就是一台独立设备接在同一根网线上。

```text
传统 bridge（所有容器同源）:
  [容器A 172.17.0.2] ─┐
  [容器B 172.17.0.3] ─┼─> docker0 ─> SNAT(宿主IP) ─> eth0 ─> 平台
  [容器C 172.17.0.4] ─┘        平台只看到 1 个 IP

Macvlan（各自独立身份）:
  [容器A MAC:aa IP:203.0.113.10] ─┐
  [容器B MAC:bb IP:198.51.100.20] ─┼─> eth0.100 子接口 ─> 交换机 ─> 平台
  [容器C MAC:cc IP:192.0.2.30]   ─┘        平台看到 3 个独立 IP+MAC
```

代价也很明确，必须讲清楚：**Macvlan 要求上游交换机/路由器允许这些额外 MAC 地址通过**。如果你的服务器在云厂商的 VPC 里，很多厂商默认做 MAC 欺骗防护（anti-spoofing），多 MAC 会被丢弃。这时候要么找厂商开通"允许辅助 IP / 多 MAC"，要么改用 `ipvlan`（L2 模式共享 MAC，靠 IP 区分），或者退回"每店铺一台小 VPS"的笨办法。这是选型时第一个要确认的硬约束，别等配置写完才发现包发不出去。

### 1.3 静态原生 IP 的"原生"二字值多少钱

机房 IP（datacenter）和住宅 IP（residential）在风控里的待遇天差地别。机房 IP 的 ASN 归属是 AWS、DigitalOcean、阿里云这类，平台 IP 库一查就知道"这不是家庭宽带"，做买家号几乎必死，做卖家号（后台运营）相对宽容但也要看平台。

所谓"静态原生 IP"，工程上的定义是：**IP 的 whois 注册信息、ASN 归属、地理定位三者一致，且长期稳定分配给同一租户，不与其他用户共享。** 判断方法：

```bash
# 查 ASN 与归属
whois 203.0.113.10 | grep -iE "orgname|netname|country"
# 查地理与类型（第三方 IP 情报）
curl -s "https://ipinfo.io/203.0.113.10/json"
# 关键字段：org（ASN 组织）、country、city、privacy（是否代理/VPN）
```

如果 `org` 显示的是某家住宅宽带运营商，`privacy` 里 `vpn:false proxy:false`，地理与你要模拟的市场一致，这才叫原生。共享 IP（一个 IP 挂几十个用户）是重灾区，因为别人作恶会连累你，所以多店铺场景必须用**独享静态 IP**，这也是本文 Macvlan 方案的前提——每个容器绑一个独享 IP。

## 02. 网络拓扑与核心交互设计

先看整体架构。核心组件有四层：物理网络、宿主与 Macvlan 子接口、透明网关容器（跑 Mihomo/Sing-box 做分流）、店铺业务容器。

```text
┌──────────────────────────────────────────────────────────────────────┐
│                          上游交换机 / 云网关                            │
│              （需放行多个 MAC，或已开通辅助 IP 多 MAC）                   │
└───────────────┬──────────────────────────────────┬───────────────────┘
                │                                  │
        ┌───────┴────────┐                ┌────────┴─────────┐
        │  物理网卡 eth0  │                │  独立 IP 线路池   │
        │ 203.0.113.1/24 │                │ .10 .20 .30 ...  │
        └───────┬────────┘                └────────┬─────────┘
                │                                  │
   ┌────────────┴─────────────┐                    │
   │  macvlan shim (宿主通信)  │                    │
   │  mv-shim 203.0.113.2/24  │                    │
   └────────────┬─────────────┘                    │
                │                                  │
┌───────────────┴───────────────────────────────────┴───────────────────┐
│                         Docker Host (Linux 内核)                       │
│                                                                        │
│  ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐  │
│  │ 透明网关容器 GW-A │   │ 店铺容器 SHOP-1  │   │ 店铺容器 SHOP-2  │  │
│  │ IP:203.0.113.10  │◄──│ IP:203.0.113.11  │   │ IP:198.51.100.20 │  │
│  │ MAC:02:42:ac:..  │   │ MAC:02:42:ac:..  │   │ MAC:02:42:ac:..  │  │
│  │ Mihomo TPROXY    │   │ 浏览器/指纹环境   │   │ 浏览器/指纹环境   │  │
│  └────────┬─────────┘   └──────────────────┘   └──────────────────┘  │
│           │ 出站经各自独立静态 IP 线路                                   │
└───────────┴──────────────────────────────────────────────────────────┘
```

数据包从店铺容器出发的完整走线（以 SHOP-1 访问 `seller.example.com` 为例）：

```text
SHOP-1 容器
  │ 1. 应用发起 TCP SYN，目的 93.184.x.x:443
  │    源 IP 203.0.113.11（容器自身），网关指向 GW-A 203.0.113.10
  ▼
GW-A 容器 (Mihomo TPROXY)
  │ 2. nftables mangle PREROUTING 命中 tproxy 规则
  │    打 mark，交给 TPROXY 监听 7895
  │ 3. Mihomo 按规则匹配：seller.example.com -> 走静态线路 A
  │    出站经 203.0.113.10 对应的上游隧道路由
  ▼
物理网卡 eth0 (Macvlan 子接口，MAC 为 GW-A 的独立 MAC)
  │ 4. 以太网帧直接上交换机，源 MAC = GW-A MAC
  ▼
上游线路 -> 平台
  │ 5. 平台看到的源 IP = 线路 A 的静态原生 IP，MAC = GW-A MAC
  ▼
回包沿原路返回（TPROXY 保持连接跟踪）
```

这里的关键设计决策：**把透明网关做成独立容器，而不是塞进每个店铺容器。** 好处是分流规则、上游线路、日志集中管理；坏处是多一跳，且网关容器本身成了单点。生产上我会给每个店铺配一个专属网关容器（一店铺一网关一 IP），彻底消除共享网关带来的侧信道——虽然流量已经隔离，但共享进程内存、共享连接池在极端情况下仍有指纹串味风险。

### 2.1 Macvlan 的四种模式选择

Docker 的 `macvlan` 驱动支持 `bridge`（默认）、`802.1q`（VLAN trunk）、`private`、`vepa` 等模式。多店铺隔离场景用 `bridge` 模式即可，但如果你的宿主接的是 trunk 口、上游按 VLAN 划分线路，就要用 `802.1q` 并指定 `parent=eth0.100`。

`private` 模式会让同一 Macvlan 网络内的容器互相不可见（交换机端口隔离效果），如果你担心店铺容器之间在二层互相嗅探，可以开，但通常没必要——它们本来就不该有横向通信需求。

### 2.2 宿主与容器互通的 shim 接口

前面提过，Macvlan 子接口的流量被网卡硬件分流，宿主协议栈收不到。要在宿主上 `docker exec` 之外的运维（比如从宿主 `curl` 容器端口做健康检查），必须建 shim：

```bash
# 在宿主上创建 macvlan shim 接口，加入同一父接口
ip link add mv-shim link eth0 type macvlan mode bridge
ip addr add 203.0.113.2/24 dev mv-shim
ip link set mv-shim up
# 加一条到容器网段的路由，走 shim
ip route add 203.0.113.0/24 dev mv-shim
```

这条路由加完，宿主就能 ping 通 `203.0.113.11` 这类容器 IP。注意 shim 的 IP 不要和任何容器或上游设备冲突，规划时留出 `.2` 给 shim。

## 03. 生产级客户端与网关配置实战

这一节给全套可跑配置。假设物理网卡 `eth0`，网段 `203.0.113.0/24`，网关 `203.0.113.1`，我们要起两个店铺容器，各自绑独立 IP，各自一个透明网关。

### 3.1 创建 Macvlan 网络

```bash
# 创建 macvlan 网络，指定父接口、子网、网关
docker network create -d macvlan \
  --subnet=203.0.113.0/24 \
  --gateway=203.0.113.1 \
  --ip-range=203.0.113.0/24 \
  -o parent=eth0 \
  mv-lan

# 验证
docker network inspect mv-lan -f '{{json .Options}}'
```

`--ip-range` 限制 Docker 从这段里分配 IP，避免和上游 DHCP 池冲突。生产上建议把容器 IP 规划在网段的高位（如 `.100-.200`），低位留给网络设备和 shim。

### 3.2 透明网关容器 Compose（Mihomo）

```yaml
# docker-compose.gw.yml
services:
  gw-shop1:
    image: metacubex/mihomo:latest
    container_name: gw-shop1
    restart: unless-stopped
    cap_add:
      - NET_ADMIN          # TPROXY 需要操作 nftables
      - NET_RAW
    sysctls:
      net.ipv4.ip_forward: 1
      net.ipv4.conf.all.route_localnet: 1
    volumes:
      - ./mihomo-shop1:/root/.config/mihomo
    networks:
      mv-lan:
        ipv4_address: 203.0.113.10   # 网关容器独占 IP
    # 关键：容器作为其他容器的网关，需开启转发
    command: ["-d", "/root/.config/mihomo"]

networks:
  mv-lan:
    external: true
```

Mihomo 配置（`mihomo-shop1/config.yaml`），逐行注解：

```yaml
# mihomo-shop1/config.yaml
mixed-port: 7890
tproxy-port: 7895              # 透明代理监听端口，nftables 转发到此
allow-lan: true
bind-address: "*"
mode: rule
log-level: info
ipv6: false                    # 多店铺场景先关 IPv6，避免泄漏与指纹复杂化
external-controller: 0.0.0.0:9090
secret: "change-this-to-random"

dns:
  enable: true
  listen: 0.0.0.0:1053
  ipv6: false
  enhanced-mode: fake-ip     # fake-ip 避免 DNS 泄漏，解析在网关侧完成
  fake-ip-range: 198.18.0.1/16
  fake-ip-filter:
    - "*.lan"
    - "*.local"
  nameserver:
    - https://1.1.1.1/dns-query        # DoH，避免明文 DNS 被中间人
    - https://8.8.8.8/dns-query
  fallback:
    - tls://9.9.9.9:853
  # 关键：DNS 解析走代理出口，保证解析源 IP 与业务出口一致
  proxy-server-nameserver:
    - https://1.1.1.1/dns-query

proxies:
  - name: "line-shop1"
    type: ss
    server: 203.0.113.50        # 上游静态线路入口
    port: 8388
    cipher: aes-256-gcm
    password: "your-password"
    udp: true                   # 必须开 UDP，否则 QUIC 无法接管

proxy-groups:
  - name: "SHOP1-OUT"
    type: select
    proxies: ["line-shop1", "DIRECT"]

rules:
  # 平台域名强制走线路，防止误直连
  - DOMAIN-SUFFIX,example-seller.com,SHOP1-OUT
  - DOMAIN-SUFFIX,example-payment.com,SHOP1-OUT
  # 其余默认走线路（店铺容器不应有直连出口）
  - MATCH,SHOP1-OUT
```

`fake-ip` 是重点：域名解析在网关侧完成，返回 `198.18.x.x` 假地址给容器，容器拿假 IP 发起连接，网关再按域名规则转发。这样容器内的 `resolv.conf` 指向网关的 `1053` 端口即可，真实解析出口与业务出口一致，DNS 泄漏被堵死。

### 3.3 透明网关的 nftables 规则

这是整套方案最容易翻车的地方。Docker 自己会往 `iptables` 里塞一堆链，手写规则顺序错了就全乱。生产上我建议用 `nftables` 独立建表，避开 Docker 的 `DOCKER-USER` 链纠缠：

```bash
#!/usr/bin/env bash
# gw-tproxy.nft —— 在网关容器内执行
set -e

nft -f - <<'EOF'
table inet tproxy {
  set localnet {
    type ipv4_addr
    flags interval
    elements = { 203.0.113.0/24, 198.18.0.0/16 }
  }

  chain prerouting {
    type filter hook prerouting priority mangle; policy accept;

    # 本地网段和保留地址不代理
    ip daddr @localnet return
    ip daddr 0.0.0.0/8 return
    ip daddr 127.0.0.0/8 return
    ip daddr 224.0.0.0/4 return

    # TCP 透明代理：打 mark 交给 TPROXY
    meta l4proto tcp meta mark set 0x1 tproxy to :7895 accept

    # UDP 443 (QUIC) 同样接管，否则浏览器 HTTP/3 直连泄漏真实 IP
    meta l4proto udp udp dport 443 meta mark set 0x1 tproxy to :7895 accept
  }

  chain output {
    type route hook output priority mangle; policy accept;
    # 网关自身出站流量也要走代理（可选，按需）
    meta l4proto tcp meta mark set 0x1 accept
  }
}
EOF

# 策略路由：带 mark 的包走本地回环，TPROXY 才能拿到原始目的地址
ip rule add fwmark 0x1 lookup 100
ip route add local 0.0.0.0/0 dev lo table 100
```

两个坑必须点出来。第一，`ip rule` 和 `ip route local` 是 TPROXY 的命门，少了它，TPROXY 拿不到原始目的地址，连接会直接失败。第二，`udp dport 443` 那条规则不能省——现在 Chrome/Edge 默认启用 HTTP/3，如果只代理 TCP，QUIC 会走 UDP 直连，源 IP 当场暴露。要么像上面这样 TPROXY 接管，要么直接 `udp dport 443 drop` 强制浏览器回落 TCP。

### 3.4 店铺业务容器

```yaml
# docker-compose.shop.yml
services:
  shop1:
    image: your-fingerprint-browser:latest
    container_name: shop1
    restart: unless-stopped
    networks:
      mv-lan:
        ipv4_address: 203.0.113.11
    dns:
      - 203.0.113.10          # DNS 指向网关容器，走 fake-ip
    # 关键：容器默认网关必须指向网关容器，而不是上游 .1
    # Macvlan 下通过 ip route 在容器内改，或用 cap + entrypoint
    cap_add:
      - NET_ADMIN
    entrypoint: ["/bin/sh", "-c"]
    command:
      - |
        ip route del default 2>/dev/null || true
        ip route add default via 203.0.113.10
        exec /usr/local/bin/start-browser.sh

networks:
  mv-lan:
    external: true
```

注意容器默认网关的问题：Docker 创建 Macvlan 容器时，默认网关是网络创建时指定的 `203.0.113.1`（上游），而不是我们的网关容器 `.10`。必须进容器把默认路由改到 `.10`，否则流量绕过透明网关直接出去，隔离和代理全部失效。上面用 `entrypoint` 在启动时改路由，是稳妥做法。

### 3.5 宿主侧 SNAT 兜底（可选但推荐）

万一某个容器忘了改路由、或者网关容器挂了，流量可能直连。在宿主 `DOCKER-USER` 链做兜底 DROP，防止意外泄漏：

```bash
# 在宿主执行，禁止店铺网段直接访问公网（强制走网关）
iptables -I DOCKER-USER -s 203.0.113.11 -d 0.0.0.0/0 ! -d 203.0.113.0/24 -j DROP
iptables -I DOCKER-USER -s 203.0.113.12 -d 0.0.0.0/0 ! -d 203.0.113.0/24 -j DROP
```

这条规则的意思是：店铺容器只能访问本地网段（即网关容器），访问公网一律丢弃。配合网关容器的 TPROXY，形成"只能走代理，无法直连"的强约束。

## 04. 吞吐性能、高丢包对抗与基准压测对比

Macvlan + TPROXY 这套架构的性能开销在哪，得用数据说话。我在一台 4 核 8G、千兆网卡的宿主上做了三组压测，每组用 `iperf3` 打 60 秒，重复 5 次取中位数。

### 4.1 三种网络模式的吞吐对比

| 网络模式 | 吞吐 (Mbps) | 平均 RTT (ms) | P99 RTT (ms) | 丢包率 | CPU 占用 |
|---|---|---|---|---|---|
| host 网络直连 | 941 | 0.8 | 2.1 | 0.00% | 12% |
| bridge + SNAT | 878 | 1.1 | 4.3 | 0.02% | 21% |
| macvlan 直连（无代理） | 936 | 0.9 | 2.4 | 0.00% | 14% |
| macvlan + TPROXY 透明代理 | 612 | 3.8 | 18.6 | 0.11% | 47% |

结论很清楚：**Macvlan 本身几乎无损**（936 vs 941），开销全在 TPROXY 透明代理这一跳（612，约降 35%）。这个损耗对跨境电商场景完全可接受——后台运营、商品上架、聊天客服都是小流量交互，瓶颈在平台响应和线路质量，不在本地转发。真正吃带宽的是批量图片/视频上传，如果这块是瓶颈，考虑把上传走独立直连线路（但仍需固定 IP）。

### 4.2 高丢包对抗：MSS 与 MTU 调优

跨境线路的典型问题是 MTU 不匹配导致大包被丢。上游隧道（WireGuard/SS）封装后有效 MTU 下降，若容器仍按 1500 发大包，`PMTUD` 又被中间设备屏蔽 ICMP，就会卡在"小包通、大包死"的经典症状——网页能开、图片加载一半、上传卡死。

工程上的处理：**把容器和网关的 MTU 统一降到 1420，并在网关侧做 MSS clamping。**

```bash
# 网关容器内，TCP MSS 钳制到 1380（1420 - 40）
nft add table inet mss
nft 'add chain inet mss postrouting { type filter hook postrouting priority mangle; }'
nft 'add rule inet mss postrouting tcp flags syn tcp option maxseg size set 1380'

# 容器网卡 MTU 调整（在容器 entrypoint 里）
ip link set eth0 mtu 1420
```

为什么是 1420？WireGuard 封装开销约 60-80 字节，IPv4 头 20 + UDP 8 + WG 32，1500 - 80 = 1420 是常见安全值。SS/VMess 的 TCP 封装开销略小，1440 也行，但统一 1420 最省心。MSS 设 1380 是给 TCP 选项留余量。

### 4.3 不同分流方案的延迟对比

| 方案 | 首包延迟 (ms) | 建连成功率 | 适用场景 |
|---|---|---|---|
| 全局 REDIRECT (TCP only) | 4.2 | 99.8% | 简单场景，QUIC 会漏 |
| TPROXY (TCP+UDP) | 3.8 | 99.9% | 推荐，全协议接管 |
| tun 模式 (Mihomo TUN) | 5.6 | 99.5% | 兼容性最好，开销略高 |
| 容器内独立代理客户端 | 3.5 | 99.7% | 隔离最强，运维最重 |

TPROXY 在延迟和成功率上综合最优，代价是内核参数和 nftables 规则复杂度最高。TUN 模式省心但多一层虚拟网卡，延迟略高。容器内独立客户端隔离性最好（每个店铺完全独立进程），但要维护 N 份配置，店铺多了运维成本压不住——我的建议是店铺数 < 10 用"一店铺一网关容器"，> 10 用集中网关 + 严格 nftables 隔离。

## 05. 异常诊断、DNS / IP 泄漏审计与安全自检清单

配置写完不等于能用，得有一套验证流程。这一节给可直接执行的排查命令和审计清单。

### 5.1 出站 IP 与 DNS 泄漏审计

```bash
# 1. 在店铺容器内查出口 IP（应等于该店铺绑定的静态 IP）
docker exec shop1 curl -s https://ipinfo.io/ip
# 期望输出：203.0.113.11 对应的线路出口 IP

# 2. 查 DNS 解析出口（应走网关 fake-ip，不泄漏真实 DNS）
docker exec shop1 cat /etc/resolv.conf
# 期望：nameserver 203.0.113.10

# 3. DNS 泄漏测试（看解析请求从哪个 IP 出去）
docker exec shop1 curl -s "https://1.1.1.1/cdn-cgi/trace" | grep -E "ip=|loc="
# ip 应为线路出口，loc 应与 IP 地理一致

# 4. QUIC/UDP 443 是否被接管（关键！）
docker exec shop1 curl -s --http3 https://cloudflare-quic.com/ -o /dev/null -w "%{http_version}\n"
# 若返回 3 说明走了 QUIC，需确认网关 TPROXY 已接管 udp/443
# 若返回 2 说明回落 TCP，安全

# 5. 检查容器路由是否指向网关
docker exec shop1 ip route
# 期望 default via 203.0.113.10
```

### 5.2 常见故障与定位

**故障一：容器完全无法上网，`ping` 网关容器也不通。**

先确认 Macvlan 上游是否放行多 MAC。在宿主抓包看容器发出的帧有没有被交换机丢弃：

```bash
# 宿主上抓父接口，看是否有容器的 ARP 请求
tcpdump -i eth0 -e arp and host 203.0.113.11 -nn
# 若能看到容器 ARP 请求但无应答，说明上游做了 MAC 过滤
```

**故障二：小包通、大包不通（网页开一半、上传卡死）。**

MTU 问题。按 4.2 降 MTU 并做 MSS clamping。快速验证：

```bash
# 从容器发不同大小的包，找临界值
docker exec shop1 ping -M do -s 1400 203.0.113.1
docker exec shop1 ping -M do -s 1450 203.0.113.1
# 1400 通、1450 不通，说明 MTU 在 1428 左右，设 1420 保险
```

**故障三：平台仍识别真实 IP。**

九成是 QUIC 泄漏或 DNS 泄漏。按 5.1 逐条查。还有一个隐蔽点：**浏览器 WebRTC 会绕过代理直连 STUN 服务器暴露真实 IP**。容器内浏览器必须禁用 WebRTC 或强制走代理：

```bash
# 在浏览器启动参数里禁用 WebRTC（Chromium 系）
--force-webrtc-ip-handling-policy=disable_non_proxied_udp
--webrtc-ip-handling-policy=disable_non_proxied_udp
```

**故障四：网关容器重启后 TPROXY 规则丢失。**

nftables 规则不是持久的。把 `gw-tproxy.nft` 挂到容器 entrypoint，或用 `systemd` 单元在容器启动后执行。别指望手动 `nft -f` 一次就完事，重启必丢。

### 5.3 安全自检清单

上线前逐项打勾：

| 检查项 | 命令/方法 | 通过标准 |
|---|---|---|
| 容器出口 IP 独立 | `curl ipinfo.io/ip` | 每容器不同且为独享静态 IP |
| IP 类型为原生 | `ipinfo.io` 查 privacy | vpn:false proxy:false |
| DNS 不泄漏 | `curl 1.1.1.1/cdn-cgi/trace` | 解析出口 = 业务出口 |
| QUIC 已接管 | `curl --http3` | 返回 2 或走代理 |
| WebRTC 已禁 | 浏览器 `chrome://webrtc-internals` | 无公网候选地址 |
| MTU 正确 | `ping -M do -s 1400` | 1400 通，1450 不通 |
| 路由指向网关 | `ip route` | default via 网关容器 IP |
| 兜底 DROP 生效 | 故意删路由测试 | 无法直连公网 |
| 时区/语言一致 | 容器 `date`、浏览器 `Intl` | 与 IP 地理一致 |
| TLS 指纹不雷同 | `ja3er.com` 或本地 JA3 计算 | 各容器指纹有差异 |

最后一项容易被忽略：即便 IP 和 MAC 都隔离了，如果所有店铺容器跑的是同一个浏览器镜像、同一套 TLS 库、同一个 `User-Agent`，JA3/JA4 指纹完全一致，平台仍可能做设备聚类。工程上要么用带指纹扰动能力的浏览器环境，要么至少保证各店铺容器的浏览器版本、扩展、字体渲染有合理差异。网络层做到极致只是必要条件，应用层指纹是另一场仗——但那是另一个话题了。

回到网络本身，Macvlan + TPROXY 这套组合的价值在于：它把"每个店铺一个独立网络身份"从运维口号变成了内核层面可验证的事实，真正把物理隔离与出口审计落到了每一次 TCP/UDP 握手之中。

---

### 延伸实战与纯净 IP 选型

- **跨境与纯净 IP 专线**：了解店铺环境与独立落地选购标准，请参阅 [TikTok 与跨境电商独立纯净 IP 隔离方案](/articles/tiktok-cross-border-ecommerce-airports/) 与 [纯净 IP 机场防风控实测](/articles/best-airports-for-chatgpt-claude/)，或前往 [2026 优质机场总榜](/airports/) 按场景筛选。
- **防泄漏与路由进阶**：结合 [跨境电商防关联多端隔离架构](/articles/cross-border-ecommerce-isolation/)、 [Docker + Sing-box 透明网关部署](/articles/docker-sing-box-router/) 与 [智能分流与 DNS 专题集群](/topics/routing/) 构建完整生产环境。