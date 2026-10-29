---
title: "Clash Verge Rev 核心进阶：Script 脚本覆写、Mihomo Meta 内核分流与自建私有订阅转换链实战"
description: "从 Clash Verge Rev 的 Script 覆写钩子切入，拆解 Mihomo Meta 内核的 rule-providers、TUN 栈、DNS 分流与 fake-ip 机制，手把手搭建基于 subconverter 的私有订阅转换链，附生产级 YAML、nftables 规则与抓包审计方法，解决规则冲突、DNS 泄漏与 TUN 吞吐瓶颈。"
pubDate: 2026-10-29
updatedDate: 2026-10-29
category: "clients"
categoryName: "客户端教程"
tags: ["Clash Verge Rev","Mihomo脚本覆写","私有订阅转换","Rule-Set规则集","Tun内核分流"]
author: "机场指南编辑部"
featured: false
draft: false
difficulty: "Intermediate"
readingTime: "17 MIN READ"
badge: "DEEP DIVE"
related: ["vless-reality-sni-camouflage-active-probing-hardening","2026-best-airports-ranking-guide","wireguard-warp-dual-hop","hysteria2-port-hopping"]
keyProblems:
  - "机场订阅自带的规则组与本地自建规则互相覆盖，merge 后 proxy-groups 引用断裂，内核报 'proxy group not found' 或 'rule-set load failed'"
  - "TUN 模式下 fake-ip 与 DNS 分流错配，导致国内域名走代理、UDP 流量泄漏真实出口 IP，QUIC 被运营商 QoS 限速"
  - "订阅转换依赖公共后端，节点信息与订阅链接暴露在第三方日志中，且无法注入自定义 rule-providers 与脚本逻辑"
  - "Script 覆写钩子执行时机与 main(config) 返回值处理不当，导致覆写后配置被内核拒绝加载"
faq:
  - q: "Clash Verge Rev 的 Script 覆写和 Merge 覆写到底该用哪个？"
    a: "Merge（YAML 合并）适合做静态字段追加，比如往 rules 头部插几条、给 dns 加 nameserver-policy；Script 是 JS 运行时，能拿到完整 config 对象做条件判断、循环生成 proxy-groups、按节点名正则过滤。凡是需要'根据订阅内容动态决定'的逻辑必须用 Script，纯静态追加用 Merge 更省心。两者执行顺序是 Merge 先于 Script，Script 拿到的是已合并的 config。"
  - q: "为什么 TUN 模式开了以后国内网站反而变慢、部分 App 直接连不上？"
    a: "九成是 fake-ip 与 DNS 配置打架。fake-ip-filter 没覆盖局域网域名和 NTP/STUN 域名，导致这些请求拿到 198.18.x.x 假地址后无法回源；另外 dns.enhanced-mode 设为 fake-ip 时，若 nameserver 里混入了走代理的 DoH，DNS 查询本身会绕一圈代理再回来，RTT 直接翻倍。把国内 DNS 走直连、给 fake-ip-filter 补全域名、TUN stack 从 system 换 gvisor 或 mixed，基本能解决。"
  - q: "自建订阅转换链最少需要哪些组件？放在哪里？"
    a: "核心是 subconverter（或 sub-web 前端）+ 一个能跑 Docker 的公网 VPS。subconverter 负责把机场的 ss/vmess/trojan/hysteria2 链接转成 Clash YAML 并注入你的规则模板；VPS 只需 1 核 512M，但要配 HTTPS（Caddy 反代）并加 access token 防止被人白嫖算力。转换结果建议再加一层本地 Script 覆写做最终定制，形成'机场原始订阅 → 私有转换 → 本地脚本'三段链路。"
---

## 01. 现实痛点与底层机理解构

先把问题摆到台面上。绝大多数人用 Clash Verge Rev 的姿势是：导入机场订阅 → 选个节点 → 开系统代理 → 完事。这套流程在 2023 年还能凑合，到了 2026 年，机场订阅动辄塞进 80 个节点、12 个策略组、3000 条规则，直接把这套"傻瓜流程"撑爆。

**痛点一：规则组的引用地狱。** 机场订阅里的 `proxy-groups` 通常长这样——`🚀 节点选择` 引用 `♻️ 自动选择`，`♻️ 自动选择` 又引用一堆节点名。你在本地 Merge 里往 `proxies` 追加了自建的 WireGuard 节点，名字叫 `wg-home`，但 `proxy-groups` 里没人引用它，于是这个节点在 UI 里根本不出现。反过来，你在 Merge 里删掉某个机场节点，`proxy-groups` 里还留着对它的引用，Mihomo 内核启动时直接报 `proxy group [xxx]: proxy [yyy] not found`，整个配置加载失败，UI 一片红字。这不是配置写错了，是**合并策略与引用完整性**没对齐。

**痛点二：TUN 模式下的 DNS 与 fake-ip 错配。** 这是最隐蔽的坑。TUN 虚拟网卡接管了系统全部三层流量，Mihomo 必须靠 fake-ip 机制把域名请求"骗"到 198.18.0.0/16 网段，再在内部做域名到真实 IP 的映射。问题在于：`fake-ip-filter` 默认列表只覆盖了 `*.lan`、`*.local` 这类，**没覆盖** `time.windows.com`（NTP 对时）、`stun.l.google.com`（WebRTC 打洞）、`*.msftconnecttest.com`（Windows 联网探测）。这些域名拿到 fake-ip 后，应用直接连 198.18.x.x，Mihomo 内部映射表里没有对应真实 IP，连接超时。表现就是：开了 TUN，微信语音打不通、Windows 显示"无 Internet"、某些游戏语音直接哑火。

更狠的是 DNS 泄漏。如果你的 `dns.nameserver` 里写了 `https://dns.google/dns-query`（DoH），而这个 DoH 请求本身又匹配了 `GEOIP,US,PROXY` 规则走了代理，那么 DNS 查询会先绕到美国再回来，RTT 从 15ms 变成 220ms，而且**查询源 IP 暴露给了 Google**。你以��你在用国内 DNS 分流，实际上每条查询都出国转了一圈。

**痛点三：公共订阅转换后端的信任问题。** 用 `sub-web` 公共实例转换订阅，你的机场订阅链接（含 token）、节点密码、UUID 全部明文经过第三方服务器。2025 年已经出现过多个公共转换站被拖库、订阅链接被打包出售的事件。更现实的问题是：公共转换后端**不支持**注入自定义 `rule-providers`、不支持按节点名正则过滤、不支持注入 `dialer-proxy` 链式代理。你想让 Hysteria2 节点走 `port-hopping` 端口跳跃，公共转换器根本不认这个字段。

**痛点四：Script 钩子的执行时机。** Clash Verge Rev 的覆写有三层：Merge（YAML 深合并）、Script（JS 运行时）、以及订阅本身。执行顺序是 **订阅 → Merge → Script**。很多人在 Script 里写 `config.proxies.push(...)`，结果发现节点没生效——因为 Script 的返回值必须 `return config`，且如果 Script 抛异常，Verge 会静默回退到 Merge 结果，你在日志里根本看不到报错。这个静默失败机制坑过无数人。

底层机理讲清楚：Mihomo（原 Clash Meta）内核的分流决策链是 **入站（TUN/HTTP/SOCKS）→ DNS 解析（fake-ip 或 redir-host）→ 规则匹配（DOMAIN/GEOIP/IP-CIDR/RULE-SET）→ 出站（proxy/direct/reject）**。每一环都有代价：

- fake-ip 换来的是零 DNS 延迟（域名不解析直接返回假 IP），代价是**任何依赖真实 IP 的应用都会挂**（比如某些 P2P 客户端、部分游戏反作弊）。
- `rule-providers` 的 `behavior: domain` 规则集是纯域名匹配，内存占用小但无法处理 IP 直连；`behavior: ipcidr` 能匹配 IP 但需要下载 CIDR 列表，`interval: 86400` 每天更新一次，更新时会有短暂规则真空期。
- TUN 的 `stack: system` 走内核协议栈，吞吐高但兼容性差（某些 Android 模拟器、VPN 嵌套场景会崩）；`stack: gvisor` 是用户态协议栈，兼容性拉满但 CPU 占用高 15%~25%；`stack: mixed` 是 2024 年后 Mihomo 引入的折中方案，TCP 走 system、UDP 走 gvisor。

这些 trade-off 没有银弹，只有场景匹配。

---

## 02. 网络拓扑与核心交互设计

把整条链路画出来，你才知道数据包在哪一跳被谁处理。

```
┌─────────────────────────────────────────────────────────────────────┐
│                        本地主机 (Clash Verge Rev)                      │
│                                                                       │
│  ┌──────────┐   ┌──────────────┐   ┌─────────────────────────────┐  │
│  │ 浏览器/App │──▶│ TUN (utun)   │──▶│  Mihomo 内核                 │  │
│  │          │   │ 198.18.0.1/16│   │  ┌───────────────────────┐  │  │
│  └──────────┘   └──────────────┘   │  │ 1. DNS 拦截 (fake-ip)  │  │  │
│                                    │  │    ↓                   │  │  │
│  ┌──────────┐   ┌──────────────┐   │  │ 2. 规则匹配            │  │  │
│  │ 系统代理  │──▶│ HTTP :7890   │──▶│  │    rule-providers     │  │  │
│  │ (可选)   │   │ SOCKS :7891  │   │  │    ↓                   │  │  │
│  └──────────┘   └──────────────┘   │  │ 3. 出站选择            │  │  │
│                                    │  │    proxy / direct     │  │  │
│                                    │  └───────────┬───────────┘  │  │
│                                    └──────────────┼──────────────┘  │
└───────────────────────────────────────────────────┼─────────────────┘
                                                     │
                     ┌───────────────────────────────┼──────────────────┐
                     │                               │                  │
              ┌──────▼──────┐              ┌─────────▼────────┐  ┌──────▼──────┐
              │ 直连出口     │              │ 代理出口          │  │ 私有转换链   │
              │ (DIRECT)    │              │ (VLESS/HY2/SS)   │  │ (subconverter)│
              │ 运营商 IP    │              │ 落地 VPS          │  │ 公网 VPS     │
              └─────────────┘              └──────────────────┘  └─────────────┘
                                                    │
                                          ┌─────────▼─────────┐
                                          │ 目标服务器         │
                                          │ (Google/Netflix)  │
                                          └───────────────────┘
```

关键走线说明：

**入站路径。** TUN 网卡 `utun`（macOS）或 `Meta`（Windows）拿到 198.18.0.1/16 的网关地址，所有 DNS 查询被 `dns.listen: 0.0.0.0:1053` 拦截。域名命中 `fake-ip-filter` 的走真实解析，其余返回 `198.18.x.x` 假地址，同时在内核的 fake-ip 池里记录 `域名 → 假IP` 映射。

**规则匹配路径。** 内核拿到目标域名（从 fake-ip 反查）或目标 IP，按 `rules` 数组**从上到下**匹配，第一条命中即停。这里有个常被忽略的细节：`rule-providers` 加载的规则集会被**展开插入**到 `rules` 中 `RULE-SET,xxx,策略` 那一行的位置，而不是整体前置或后置。所以 `RULE-SET` 在 `rules` 里的**位置**决定了它的优先级——放太靠后会被前面的 `GEOIP,CN,DIRECT` 抢走。

**出站路径。** 命中 `PROXY` 策略组的流量，经 `dialer-proxy`（可选链式代理）走底层 socket 发出。Hysteria2 走 QUIC（UDP 443），需要 `port-hopping` 配置端口跳跃范围对抗 QoS；VLESS Reality 走 TCP 443 + TLS 1.3（RFC 8446）握手伪装 SNI。

**私有转换链的位置。** 它不在数据面，而在**控制面**：机场订阅 URL → 你的 subconverter（带 token）→ 注入规则模板 → 返回 Clash YAML → Verge 拉取 → Merge → Script → 内核加载。这条链路只在订阅更新时触发，不影响实时转发性能，但决定了你本地配置的"底子"干不干净。

---

## 03. 生产级客户端与网关配置实战

### 3.1 Clash Verge Rev 的 Script 覆写：动态生成策略组

Verge 的 Script 覆写文件放在 `~/.config/clash-verge/profiles/<profile-id>.js`（Linux/macOS）或 `%APPDATA%\io.github.clash-verge-rev.clash-verge-rev\profiles\`（Windows）。核心约定：**必须 `return config`**，否则内核拿到 `undefined` 直接崩。

下面这段脚本解决三个真实问题：按节点名正则自动分组、给自建节点补进策略组、动态注入 rule-providers。

```javascript
// profile-script.js —— Clash Verge Rev Script 覆写
// 执行时机：订阅拉取 → Merge 合并 → 本脚本 → 内核加载
function main(config, profileName) {
  // ---- 1. 按节点名正则归类，自动生成地区策略组 ----
  const regionMap = {
    "🇭🇰 香港": /香港|HK|HongKong|hk\d/i,
    "🇯🇵 日本": /日本|JP|Japan|Tokyo|Osaka/i,
    "🇸🇬 新加坡": /新加坡|SG|Singapore/i,
    "🇺🇸 美国": /美国|US|United States|LA|SanJose/i,
  };

  const proxies = config.proxies || [];
  const groups = [];

  for (const [groupName, regex] of Object.entries(regionMap)) {
    const matched = proxies
      .map(p => p.name)
      .filter(name => regex.test(name));
    if (matched.length > 0) {
      groups.push({
        name: groupName,
        type: "url-test",          // 自动测速选优
        url: "http://www.gstatic.com/generate_204",
        interval: 300,             // 5 分钟测一次，别设太短，会打爆机场
        tolerance: 50,             // 延迟差 50ms 内不切换，防抖
        proxies: matched,
      });
    }
  }

  // ---- 2. 自建节点强制注入主选择组 ----
  const selfHosted = proxies
    .map(p => p.name)
    .filter(name => /^self-|^wg-|^hy2-/i.test(name));

  // 找到订阅里已有的主选择组，把自建节点塞进去
  const mainGroup = (config["proxy-groups"] || []).find(
    g => g.name === "🚀 节点选择" || g.name === "Proxy"
  );
  if (mainGroup && selfHosted.length > 0) {
    mainGroup.proxies = [...new Set([...selfHosted, ...mainGroup.proxies])];
  }

  // ---- 3. 注入自建 rule-providers（覆盖订阅自带的） ----
  config["rule-providers"] = {
    ...(config["rule-providers"] || {}),
    // 自建直连域名集，behavior: domain 走域名匹配，内存友好
    "self-direct": {
      type: "http",
      behavior: "domain",
      url: "https://raw.githubusercontent.com/yourname/rules/main/direct.yaml",
      path: "./ruleset/self-direct.yaml",
      interval: 86400,             // 每天更新，避免频繁拉取
    },
    // 自建代理 CIDR 集，behavior: ipcidr 处理 IP 直连
    "self-proxy-ip": {
      type: "http",
      behavior: "ipcidr",
      url: "https://raw.githubusercontent.com/yourname/rules/main/proxy-ip.yaml",
      path: "./ruleset/self-proxy-ip.yaml",
      interval: 86400,
    },
  };

  // ---- 4. 规则前置：自建规则插到 rules 最前面，优先级最高 ----
  const selfRules = [
    "RULE-SET,self-direct,DIRECT",
    "RULE-SET,self-proxy-ip,🚀 节点选择",
  ];
  config.rules = [...selfRules, ...(config.rules || [])];

  // ---- 5. 合并自动生成的地区组 ----
  config["proxy-groups"] = [
    ...(config["proxy-groups"] || []),
    ...groups,
  ];

  return config;   // 必须返回，否则内核加载失败
}
```

逐行要点：`url-test` 的 `tolerance: 50` 是防抖关键，机场节点延迟抖动 20~30ms 很常见，不设 tolerance 会导致策略组每 5 分钟乱切，游戏掉线。`interval: 300` 别改小，`60` 秒测一次会把机场的测速接口打限流。`config.rules` 前置插入是**唯一**能保证自建规则优先于 `GEOIP,CN,DIRECT` 的方式——因为规则匹配是顺序的，`GEOIP,CN` 一旦命中，后面所有规则都不看了。

### 3.2 Mihomo 内核完整 YAML：TUN + DNS 分流 + rule-providers

这是可以直接落地的 `config.yaml`，重点在 DNS 与 TUN 的配合。

```yaml
# ---- 基础 ----
mixed-port: 7890
allow-lan: false
mode: rule
log-level: info
ipv6: false                    # 关 IPv6 避免双栈泄漏，需要时再开

# ---- TUN ----
tun:
  enable: true
  stack: mixed                 # TCP 走 system，UDP 走 gvisor，兼顾吞吐与兼容
  dns-hijack:
    - any:53                    # 劫持所有 53 端口 DNS 查询
    - tcp://any:53
  auto-route: true
  auto-detect-interface: true
  mtu: 9000                    # TUN 内部 MTU 拉满，减少分片
  # 注意：真实链路 MTU 由底层 socket 决定，VLESS/TCP 走 1420，HY2/QUIC 走 1280

# ---- DNS：分流的核心 ----
dns:
  enable: true
  listen: 0.0.0.0:1053
  ipv6: false
  enhanced-mode: fake-ip
  fake-ip-range: 198.18.0.1/16
  fake-ip-filter:
    - "*.lan"
    - "*.local"
    - "*.localhost"
    - "+.msftconnecttest.com"   # Windows 联网探测，不放过会显示无 Internet
    - "+.msftncsi.com"
    - "time.windows.com"        # NTP 对时
    - "time.apple.com"
    - "stun.*.*"                # WebRTC/游戏语音打洞
    - "stun.*.*.*"
    - "+.pool.ntp.org"
    - "localhost.ptlogin2.qq.com"  # QQ 登录，走 fake-ip 会失败
  # 默认 DNS：国内直连解析
  nameserver:
    - 223.5.5.5
    - 119.29.29.29
  # 代理域名专用 DNS：走代理解析，防污染
  proxy-server-nameserver:
    - https://dns.google/dns-query
    - https://1.1.1.1/dns-query
  # 按域名指定 DNS 服务器
  nameserver-policy:
    "geosite:cn,private":
      - 223.5.5.5
      - 119.29.29.29
    "geosite:geolocation-!cn":
      - https://dns.google/dns-query
      - https://cloudflare-dns.com/dns-query

# ---- 规则集 ----
rule-providers:
  reject:
    type: http
    behavior: domain
    url: "https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/reject.txt"
    path: ./ruleset/reject.yaml
    interval: 86400
  proxy:
    type: http
    behavior: domain
    url: "https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/proxy.txt"
    path: ./ruleset/proxy.yaml
    interval: 86400
  direct:
    type: http
    behavior: domain
    url: "https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/direct.txt"
    path: ./ruleset/direct.yaml
    interval: 86400
  private:
    type: http
    behavior: domain
    url: "https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/private.txt"
    path: ./ruleset/private.yaml
    interval: 86400
  gfw:
    type: http
    behavior: domain
    url: "https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/gfw.txt"
    path: ./ruleset/gfw.yaml
    interval: 86400
  cncidr:
    type: http
    behavior: ipcidr
    url: "https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/cncidr.txt"
    path: ./ruleset/cncidr.yaml
    interval: 86400

# ---- 规则���顺序即优先级 ----
rules:
  - RULE-SET,private,DIRECT
  - RULE-SET,reject,REJECT
  - RULE-SET,gfw,🚀 节点选择
  - RULE-SET,proxy,🚀 节点选择
  - RULE-SET,direct,DIRECT
  - RULE-SET,cncidr,DIRECT
  - GEOIP,CN,DIRECT
  - MATCH,🚀 节点选择
```

几个必须说透的点：

`proxy-server-nameserver` 是 2024 年后 Mihomo 引入的关键字段——它专门用于解析**代理服务器本身的域名**。如果你的机场节点是 `hk1.example.com:443`，这个域名必须用 `proxy-server-nameserver` 解析，且**不能走代理**（否则死循环）。很多人把机场域名丢进 `nameserver` 走 fake-ip，结果节点域名被解析成 198.18.x.x，连接直接失败。

`mtu: 9000` 是 TUN 内部 MTU，不是链路 MTU。真实链路上 VLESS/TCP 的 MSS 由底层决定，通常 TCP 走 1420（留 80 字节给 TLS + VLESS 头），QUIC/Hysteria2 走 1280（IPv6 最小 MTU 兜底，防分片）。TUN 内部拉满 9000 是为了减少本地回环分片，不影响出口。

### 3.3 自建私有订阅转换链：subconverter + Caddy

公网 VPS 上跑 Docker Compose，Caddy 自动签 HTTPS，subconverter 带 token 防白嫖。

```yaml
# docker-compose.yml
version: "3.8"
services:
  subconverter:
    image: tindy2013/subconverter:latest
    container_name: subconverter
    restart: unless-stopped
    ports:
      - "127.0.0.1:25500:25500"    # 只绑本地，公网走 Caddy 反代
    environment:
      - TZ=Asia/Shanghai
    volumes:
      - ./subconfig:/base            # 挂载自定义配置目录
    command: ["/base/pref.yml"]

  caddy:
    image: caddy:2-alpine
    container_name: caddy-sub
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - subconverter

volumes:
  caddy_data:
  caddy_config:
```

```caddyfile
# Caddyfile —— 自动 HTTPS + token 校验
sub.yourdomain.com {
    @valid_token {
        query token=YOUR_SECRET_TOKEN_2026
    }
    handle @valid_token {
        reverse_proxy subconverter:25500
    }
    respond "403 Forbidden" 403
    encode gzip
    log {
        output file /data/access.log
        format json
    }
}
```

`pref.yml` 里最关键的是 `ruleset` 和 `clash_rule_base` 两个字段：

```yaml
# pref.yml —— subconverter 偏好配置
[ruleset]
enable_rule_generator = true
overwrite_original_rules = true
# 把自建规则集注入转换结果
ruleset = self-direct,https://raw.githubusercontent.com/yourname/rules/main/direct.list
ruleset = self-proxy,https://raw.githubusercontent.com/yourname/rules/main/proxy.list

[clash]
# 用自定义模板作为底，避免转换器默认模板的垃圾规则
clash_rule_base = https://raw.githubusercontent.com/yourname/rules/main/base.yaml
# 强制输出 rule-providers 而非展开的内联规则，减小配置体积
clash_new_field_name = true
clash_script = false

[common]
# 过滤掉节点名里的广告后缀
exclude_remarks = (剩余|过期|官网|流量|套餐)
# 节点名前缀，方便本地 Script 正则匹配
rename_node = ^(.*)$|self-$1
```

转换请求长这样：

```
https://sub.yourdomain.com/sub?token=YOUR_SECRET_TOKEN_2026
  &target=clash
  &url=<机场订阅链接 URL-encoded>
  &insert=false
  &emoji=true
  &udp=true
  &tfo=true
```

`insert=false` 表示不把节点插入策略组（策略组由本地 Script 生成），`udp=true` 开启 UDP 转发（Hysteria2/QUIC 必需），`tfo=true` 开 TCP Fast Open。

### 3.4 nftables 规则：防 TUN 流量二次回环

Linux 上开 TUN 后，如果 nftables 有 `forward` 链默认 drop，TUN 流量会被拦。这条规则解决回环：

```bash
#!/usr/bin/env bash
# /etc/nftables.d/clash-tun.nft
table inet clash_tun {
    chain forward {
        type filter hook forward priority 0; policy accept;
        # TUN 出站放行
        iifname "Meta" accept
        oifname "Meta" accept
        # 防止代理流量被再次劫持（回环）
        ip daddr 198.18.0.0/16 drop
    }
}
```

---

## 04. 吞吐性能、高丢包对抗与基准压测对比

光配不测等于没配。这组数据来自实测：本地 macOS + Mihomo v1.19，VPS 为 1 核 1G（东京），链路 200Mbps 家宽，测试工具 `iperf3` + `curl -w`。

### 4.1 TUN stack 对比

| stack | TCP 吞吐 | UDP 吞吐 | CPU 占用 | 兼容性 | 适用场景 |
|---|---|---|---|---|---|
| `system` | 480 Mbps | 210 Mbps | 8% | 差（模拟器/VPN 嵌套崩） | 纯桌面、追求吞吐 |
| `gvisor` | 390 Mbps | 280 Mbps | 22% | 极好 | 游戏、UDP 重度 |
| `mixed` | 450 Mbps | 265 Mbps | 15% | 好 | 默认推荐 |

`system` 的 UDP 吞吐反而最低，因为内核协议栈对 UDP 的 TUN 转发路径有额外拷贝开销。`gvisor` 用户态处理 UDP 更直接，所以 UDP 反超。游戏语音、QUIC 视频优先 `gvisor` 或 `mixed`。

### 4.2 协议在丢包环境下的表现

| 协议 | 0% 丢包 RTT | 5% 丢包 RTT | 10% 丢包 RTT | 抗 QoS | 备注 |
|---|---|---|---|---|---|
| VLESS+TCP+TLS | 42ms | 180ms | 420ms | 弱 | TCP 重传放大延迟 |
| VLESS+Reality | 45ms | 175ms | 400ms | 中 | 伪装好，但仍是 TCP |
| Hysteria2（QUIC） | 38ms | 62ms | 95ms | 强 | BBR 拥塞控制，丢包不敏感 |
| TUIC v5 | 40ms | 70ms | 110ms | 强 | 类 QUIC，生态略弱 |
| WireGuard | 35ms | 90ms | 160ms | 中 | 无拥塞控制，丢包直接卡 |

结论很明确：**丢包超过 3% 的链路，TCP 系协议全面劣化，Hysteria2 的 QUIC + BBR 是唯一能扛住的**。这也是为什么 `hysteria2-port-hopping` 这类文章值得深读——QUIC 在 UDP 上跑，运营商对 UDP 的 QoS 比对 TCP 狠，端口跳跃就是对抗手段。

### 4.3 rule-providers 加载开销

| behavior | 规则条数 | 内存占用 | 匹配耗时（单条） | 更新方式 |
|---|---|---|---|---|
| `domain` | 50,000 | ~18 MB | ~0.8 μs | 全量替换 |
| `ipcidr` | 8,000 | ~12 MB | ~1.2 μs | 全量替换 |
| `classical` | 30,000 | ~35 MB | ~2.5 μs | 全量替换 |

`classical` 最重，因为它支持混合类型（DOMAIN + IP-CIDR + PROCESS-NAME），匹配时要逐条判断类型。能用 `domain` 就别用 `classical`。50,000 条 `domain` 规则的内存占用约 18MB，对现代机器无压力，但**每条规则匹配 0.8μs，3000 条规则最坏情况匹配 2.4ms**——这就是为什么规则顺序很重要，高频域名要前置。

---

## 05. 异常诊断、DNS / IP 泄漏审计与安全自检清单

配置写完不算完，得验证。以下命令按顺序跑一遍，能揪出 90% 的坑。

### 5.1 内核日志与配置校验

```bash
# 1. 校验配置语法（不启动内核，只解析）
mihomo -t -f /path/to/config.yaml
# 输出 "configuration file ... test is successful" 才算过

# 2. 看内核实时日志，重点抓这几类错误
tail -f ~/.config/clash-verge/logs/verge.log | grep -Ei "error|warn|fail|not found"
# 常见错误：
#   "proxy group [xxx]: proxy [yyy] not found"  → 策略组引用了不存在的节点
#   "rule-set [xxx] load failed"                → rule-provider URL 挂了或格式错
#   "dns resolve failed"                        → DNS 配置或 proxy-server-nameserver 问题

# 3. 验证 TUN 网卡是否起来
ip addr show Meta 2>/dev/null || ifconfig utun 2>/dev/null
# 应看到 198.18.0.1/16 或类似地址

# 4. 验证 DNS 劫持是否生效
dig @127.0.0.1 -p 1053 google.com +short
# fake-ip 模式下应返回 198.18.x.x
dig @127.0.0.1 -p 1053 baidu.com +short
# 国内域名应返回真实 IP（命中 nameserver-policy）
```

### 5.2 DNS 泄漏审计

```bash
# 方法一：浏览器访问 https://www.dnsleaktest.com/
# 标准测试跑一遍，看结果里的 DNS 服务器归属地
# 如果显示的是你的运营商 DNS（如 223.5.5.5 归属杭州），说明国内域名走直连 DNS——正常
# 如果访问国外站点时 DNS 仍显示国内运营商，说明 DNS 走了直连——泄漏

# 方法二：命令行验证（需要 curl 支持 DoH）
curl -s "https://1.1.1.1/cdn-cgi/trace" | grep -E "ip=|loc="
# ip= 显示的是你访问 1.1.1.1 时的出口 IP
# 如果这个 IP 是你的真实家宽 IP，说明 1.1.1.1 走了直连——检查 rules 里有没有漏掉

# 方法三：tcpdump 抓 DNS 包，看有没有明文 53 端口出去
sudo tcpdump -i any -n port 53 -c 20
# 如果看到大量 "A? xxx.com" 从你的真实网卡出去（而非 TUN），说明 DNS 没被劫持
```

### 5.3 IP 泄漏与 WebRTC 审计

```bash
# 1. 出口 IP 验证
curl -s https://api.ip.sb/ip
# 应返回代理落地 IP，不是家宽 IP

# 2. WebRTC 泄漏（浏览器内执行）
# 打开 https://browserleaks.com/webrtc
# 看 "Public IP" 和 "Local IP" 两栏
# 如果 Public IP 显示家宽 IP，说明 WebRTC 走了直连 UDP——TUN 没接管 UDP 或 fake-ip-filter 漏了 stun 域名

# 3. UDP 连通性验证（Hysteria2/QUIC 必需）
curl -s --http3 https://cloudflare-quic.com/ -o /dev/null -w "%{http_code}\n"
# 返回 200 说明 QUIC 通；超时说明 UDP 被墙或 TUN 没接管 UDP
```

### 5.4 安全自检清单

| 检查项 | 命令/方法 | 期望结果 |
|---|---|---|
| 订阅转换 token 是否生效 | `curl "https://sub.yourdomain.com/sub?url=xxx"`（不带 token） | 返回 403 |
| 转换服务是否被搜索引擎收录 | `site:sub.yourdomain.com` |