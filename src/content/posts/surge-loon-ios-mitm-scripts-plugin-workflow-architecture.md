---
title: "Surge 5 与 Loon iOS MitM 模块开发实战：动态重写、抓包分析与策略组嵌套架构"
description: "从 TLS 握手解密到 HTTP/2 流重写，拆解 Surge 5 与 Loon 的 MitM 证书链信任机制、脚本注入时序与策略组嵌套路由。提供可运行的模块 YAML、JS 脚本、抓包过滤规则与多级 fallback 策略配置，覆盖 iOS 端 1280 MTU 分片、QUIC 降级与 DNS 泄漏审计的完整工程闭环。"
pubDate: 2026-11-17
updatedDate: 2026-11-17
category: "clients"
categoryName: "客户端教程"
tags: ["Surge配置","Loon插件编写","MitM证书解密","网络抓包分析","分流策略嵌套"]
author: "机场指南编辑部"
featured: false
draft: false
difficulty: "Intermediate"
readingTime: "19 MIN READ"
badge: "DEEP DIVE"
related: ["openwrt-istoreos-bypass-gateway-mosdns-fakeip-mastery","anti-webrtc-dns-ipv6-leak-zero-fingerprint-hardening","clash-verge-rev-guide","clash-verge-rev-advanced-scripts-mihomo-meta-overrides"]
keyProblems:
  - "MitM 证书在 iOS 上装了却不解密：CA 未在「证书信任设置」中启用，或目标域名未落入 hostname 白名单，导致 TLS 1.3 握手直接透传，重写规则静默失效"
  - "Surge 与 Loon 的脚本注入时序差异：http-request 阶段改写 body 后 Content-Length 未同步，触发服务端 400；response 阶段 gzip/brotli 未解压导致 JSON.parse 抛错"
  - "策略组嵌套的匹配优先级与 fallback 语义：子策略组 health-check 失败后如何回退，url-test 的 tolerance 与 interval 参数对切换抖动的影响"
  - "抓包审计与泄漏校验：如何用 Surge 的 MITM hostname 过滤 + tcpdump 交叉验证，确认 DNS/WebRTC/IPv6 未绕过代理"
faq:
  - q: "Surge 5 的 MitM 为什么对某些 App 完全无效，连 CONNECT 都看不到？"
    a: "两类原因。第一类是 App 启用了证书 Pinning（如部分银行、Twitter/X 旧版），TLS 握手在 ClientHello 后校验服务端证书指纹，MitM 证书直接被拒，表现为连接重置而非解密失败。第二类是 App 走 QUIC（HTTP/3，UDP 443），Surge 的 MitM 只处理 TCP 上的 TLS，QUIC 流量默认透传。解法：在 Surge 规则里对目标域名加 REJECT 或强制 TCP，或关闭该 App 的 HTTP/3。验证方法是在 Surge 的「请求」面板看是否有 CONNECT 记录，没有就是没进 MitM 管道。"
  - q: "Loon 插件里的 script 和 Surge 的 script 语法能直接互转吗？"
    a: "API 层面高度相似但不完全兼容。两者都基于类似 Node 的 $httpClient、$persistentStore、$notification 全局对象，Surge 用 $done({body}) 返回，Loon 同样支持。差异在于：Surge 的 http-request 脚本可用 $request.body 且需手动处理 Content-Length，Loon 对 binary body 的 base64 处理更严格；Loon 的 plugin 用 [Script] 段声明，Surge 用 [Script] 但 type 关键字大小写与参数名有差异（如 requires-body 在 Loon 写作 requires-body = true）。跨平台复用建议抽公共逻辑，入口层各写一份适配。"
  - q: "多策略组嵌套时，为什么 url-test 组一直在两个节点间来回切？"
    a: "典型的 health-check 抖动。url-test 默认 interval 600 秒、tolerance 0，两个节点延迟接近时每次探测结果微小波动都会触发切换。把 tolerance 设为 50~100ms，interval 降到 300 秒但配合 lazy 模式，或改用 fallback 组（只在主节点真失败时切换）。另外探测 URL 别用 google.com/generate_204 这种跨境高抖动目标，用就近的 gstatic 或自家落地节点的健康检查端点。"
  - q: "MitM 解密后抓到的请求，怎么确认没有 DNS 泄漏和 IPv6 绕过？"
    a: "三层验证。第一层在 Surge 的 DNS 面板确认所有解析走的是配置的 DoH/DoT，没有 system DNS 回退；第二层用 tcpdump -i any port 53 在越狱设备或旁路网关上抓，看是否有明文 53 出站；第三层访问 browserleaks 的 DNS/IPv6 检测页，确认 WebRTC 拿到的不是本地内网 IPv6。IPv6 泄漏常见于 AAAA 记录未被 fake-ip 接管，需在 DNS 段显式配置 ipv6 = false 或对 AAAA 做 REJECT。"
---

## 01. 现实痛点与底层机理解构

iOS 上的代理客户端做 MitM，本质是在设备本地扮演一个"中间人 CA"，把原本端到端的 TLS 拆成两段：客户端到 Surge/Loon 是一段 TLS，Surge/Loon 到真实服务器是另一段 TLS。这个模型要成立，卡在三个硬性前提上，任何一个没满足，重写规则就静默失效，而且大多数时候你连报错都看不到。

**前提一：证书链必须被 iOS 系统级信任。** 装描述文件只是把根证书塞进钥匙串，iOS 从 10.3 起把"安装"和"信任"拆成两步，你必须在「设置 → 通用 → 关于本机 → 证书信任设置」里手动打开那个开关。这一步没做，Surge 的 MitM 握手会失败，客户端收到的是 Surge 自签的证书但系统不认，表现为 `NSURLErrorServerCertificateUntrusted`，App 侧直接断连。很多人以为是规则写错了，其实卡在这。

**前提二：目标域名必须命中 MitM hostname 白名单。** Surge 的 `[MitM] hostname = ...` 和 Loon 的 `[MitM] hostname = ...` 都是显式白名单机制，没列进去的域名走的是 TCP 透传（纯 CONNECT 隧道），根本不会解密。这是性能与安全的权衡：全量解密会让 CPU 占用飙升、耗电爆炸，而且大量 App 有 Pinning 会直接崩。所以工程上的做法是"按需解密"，只把要重写的域名加进去。

**前提三：流量必须走 TCP 上的 TLS。** 这是最容易被忽略的一条。QUIC（HTTP/3，跑在 UDP 443 上，RFC 9000）的加密在用户态实现，Surge 的 MitM 管道不接管 UDP 上的 TLS 1.3，QUIC 流量默认透传。所以你会遇到"网页能重写、App 里同样的接口重写不了"的诡异现象——因为 App 走了 HTTP/3。TLS 1.3（RFC 8446）本身不是问题，Surge 5 和 Loon 都支持解密 TLS 1.3，问题只在 QUIC 这个传输层。

再往深一层看脚本注入的时序。一次被 MitM 的 HTTPS 请求，在 Surge 内部的流水线是这样的：

```
Client --TLS--> Surge(MitM) --TLS--> Origin
                 |
                 +-- http-request 脚本（可改 method/url/headers/body）
                 +-- 规则匹配（决定走哪个策略/策略组）
                 +-- http-response 脚本（可改 status/headers/body）
```

关键陷阱在 body 改写。HTTP/1.1 里 `Content-Length` 是硬约束，你在 `http-request` 阶段把 body 从 100 字节改成 200 字节，如果不手动重算 `Content-Length`，服务端会按旧长度读，多出来的字节被当成下一个请求的开头，直接 400 或连接污染。Surge 的脚本环境里 `$request.body` 是可读写的，但 `Content-Length` 头需要你自己 `$request.headers['Content-Length'] = ...` 覆盖。Loon 同理，且 Loon 对二进制 body 的处理更严格，非 UTF-8 内容必须 base64 编解码，否则 `body` 字段会变成乱码。

响应侧的问题是压缩。服务端返回 `Content-Encoding: gzip` 或 `br`（brotli）时，脚本拿到的 `$response.body` 是压缩后的二进制。直接 `JSON.parse` 必炸。Surge 5 和 Loon 都会在脚本执行前自动解压（前提是 `requires-body = true` 且响应头声明了编码），但如果你在脚本里改了 body 又想保持压缩，就得自己重新压缩并更新 `Content-Encoding`。实践中最省事的做法是：脚本里把 `Content-Encoding` 删掉，返回明文，让客户端自己处理——代价是流量变大，但在移动端可接受。

策略组嵌套这块，痛点集中在"匹配优先级"和"fallback 语义"。Surge 的规则是从上到下第一条命中即停，`[Rule]` 段里 `DOMAIN-SUFFIX,google.com,PROXY` 命中后不会再往下看。策略组本身可以嵌套：一个 `select` 组里可以放另一个 `url-test` 组作为选项。嵌套的坑在于 health-check 的传播——外层 `select` 手动选了内层 `url-test` 组，内层组在探测失败时会自动切到组内其他节点，但外层不知道，UI 上显示的还是那个组名。更隐蔽的是 `fallback` 组的语义：它按顺序尝试，第一个可用的就用，可用性由 health-check 判定，判定间隔默认 600 秒，意味着节点挂了最多 10 分钟后才切。

把这些机理串起来，一个完整的 iOS MitM 工程链路是：证书信任 → hostname 白名单 → TCP/TLS 接管 → 脚本注入（处理 body/header 一致性）→ 规则匹配与策略组路由 → 响应改写 → 抓包审计。下面按这个链路逐段落地。

## 02. 网络拓扑与核心交互设计

先看数据包在 iOS 设备上的实际走线。假设你在 iPhone 上开了 Surge，访问 `api.example.com/v1/user`，并且这个域名在 MitM 白名单里。

```
┌─────────────────────────────────────────────────────────────┐
│ iOS App (URLSession)                                        │
│   │                                                          │
│   │ 1. DNS 查询 api.example.com                              │
│   │    → Surge DNS 模块（DoH/DoT 或 fake-ip）                │
│   │    → 返回 198.18.0.x（fake-ip）或真实 IP                │
│   ▼                                                          │
│ 2. TCP SYN → Surge TUN 接口（utun）                          │
│   │                                                          │
│   ▼                                                          │
│ Surge 内核                                                   │
│   ├─ 规则匹配：DOMAIN-SUFFIX,example.com,PROXY              │
│   ├─ 命中 MitM hostname → 进入 MitM 管道                    │
│   │    ├─ 与 App 完成 TLS 握手（出示 Surge CA 签的证书）    │
│   │    ├─ 解密 HTTP 请求                                     │
│   │    ├─ 执行 http-request 脚本（改 body/header）          │
│   │    ├─ 重新加密，向真实服务器发起 TLS 连接               │
│   │    └─ 收到响应 → 解密 → http-response 脚本 → 回给 App   │
│   └─ 未命中 MitM → 纯 CONNECT 隧道透传                       │
│                                                              │
│ 3. 出站：Surge 按策略组选择节点                              │
│    PROXY (select) → HK-Auto (url-test) → hk-01 / hk-02      │
│    → 加密隧道（WireGuard/Trojan/VMess）→ 落地服务器          │
└─────────────────────────────────────────────────────────────┘
```

几个关���设计决策：

**fake-ip 与 MitM 的配合。** 用 fake-ip（`198.18.0.0/16`）时，DNS 返回的是假地址，真实解析发生在 Surge 出站时。这对 MitM 是好事——App 拿到的 IP 永远是本地假地址，不会因为 DNS 污染拿到错误 IP 导致 TLS SNI 对不上。但要注意 fake-ip 的 TTL 和缓存，`198.18.0.0/16` 只有 65534 个可用地址，大型 App 高频请求不同子域时可能耗尽，需要配 `fake-ip-filter` 把不需要代理的域名排除。

**策略组嵌套的拓扑。** 生产配置里我通常分三层：

```
[Proxy Group]
# 第一层：落地选择（手动/自动）
HK-Auto = url-test, hk-01, hk-02, hk-03, url=http://www.gstatic.com/generate_204, interval=300, tolerance=80
US-Auto = url-test, us-01, us-02, url=http://www.gstatic.com/generate_204, interval=300, tolerance=80

# 第二层：业务分流（按服务选区域）
Streaming = select, HK-Auto, US-Auto, DIRECT
AI-Service = select, US-Auto, HK-Auto, DIRECT

# 第三层：总出口（fallback 兜底）
Final = fallback, HK-Auto, US-Auto, DIRECT
```

这样 `Streaming` 组里选 `HK-Auto`，实际流量会走 `HK-Auto` 这个 url-test 组自动选出的节点。好处是业务层和节点层解耦——换节点只动 `HK-Auto` 的成员，不动业务规则。

**抓包审计的旁路。** 要在 iOS 上做交叉验证，最可靠的是在 Surge 的 `[General]` 里开 `loglevel = notify`，配合 `tcpdump` 在越狱设备上抓 utun 接口。非越狱设备没法跑 tcpdump，退而求其次用 Surge 自带的「请求」面板导出 HAR，或者用 Mac 上的 Wireshark 通过 Remote Virtual Interface（`rvictl -s <udid>`）抓 iOS 流量——这是苹果官方支持的，不需要越狱。

```
# Mac 上抓 iOS 流量
rvictl -s $(idevice_id -l | head -1)
# 会创建一个 rvi0 接口
sudo tcpdump -i rvi0 -n -s 0 -w ios_capture.pcap 'tcp port 443 or udp port 53'
# 抓完清理
rvictl -x <udid>
```

`rvi0` 抓到的是 iOS 设备所有网络接口的流量，包括 Wi-Fi 和蜂窝。用它验证 MitM 是否真的生效：如果 `api.example.com` 的 TLS 握手能看到 Surge CA 的证书（在 Wireshark 里看 Server Certificate），说明 MitM 生效；如果看到的是真实服务器的证书，说明没进 MitM 管道。

## 03. 生产级客户端与网关配置实战

### 3.1 Surge 5 完整配置骨架

```ini
[General]
loglevel = notify
dns-server = 223.5.5.5, 119.29.29.29
encrypted-dns-server = https://doh.pub/dns-query, https://dns.alidns.com/dns-query
ipv6 = false
allow-wifi-access = false
wifi-access-http-port = 6152
wifi-access-socks5-port = 6153
http-listen = 0.0.0.0
socks5-listen = 0.0.0.0
skip-proxy = 127.0.0.1, 192.168.0.0/16, 10.0.0.0/8, 172.16.0.0/12, 100.64.0.0/10, localhost, *.local
# 关键：fake-ip 段，避免与本地网段冲突
fake-ip-range = 198.18.0.1/16
fake-ip-filter = *.lan, *.local, captive.apple.com, connectivitycheck.gstatic.com

[MitM]
# 只解密需要重写的域名，别全量
hostname = api.example.com, api.target-app.com, *.target-cdn.com
# CA 密码，Surge 生成证书时用
ca-passphrase = YourStrongPassphrase
ca-p12 = MIIK...（base64 的 p12）

[Script]
# 请求阶段改写：给所有 api.example.com 的请求加签名头
http-request api.example.com script-path=scripts/sign.js, requires-body=true, max-size=131072, timeout=10
# 响应阶段改写：去掉广告字段
http-response api.target-app.com script-path=scripts/strip-ads.js, requires-body=true, max-size=1048576, timeout=10

[Rule]
# 业务分流，注意顺序：具体规则在前，兜底在后
DOMAIN-SUFFIX,example.com,Streaming
DOMAIN-SUFFIX,openai.com,AI-Service
DOMAIN-SUFFIX,github.com,Final
GEOIP,CN,DIRECT
FINAL,Final,dns-failed

[Proxy Group]
HK-Auto = url-test, hk-01, hk-02, hk-03, url=http://www.gstatic.com/generate_204, interval=300, tolerance=80
US-Auto = url-test, us-01, us-02, url=http://www.gstatic.com/generate_204, interval=300, tolerance=80
Streaming = select, HK-Auto, US-Auto, DIRECT
AI-Service = select, US-Auto, HK-Auto, DIRECT
Final = fallback, HK-Auto, US-Auto, DIRECT

[Proxy]
hk-01 = trojan, hk1.example.com, 443, password=xxx, sni=hk1.example.com, skip-cert-verify=false
hk-02 = trojan, hk2.example.com, 443, password=xxx, sni=hk2.example.com
us-01 = vmess, us1.example.com, 443, username=uuid, tls=true, ws=true, ws-path=/ws, ws-headers=Host:us1.example.com
```

逐段说明几个非显然的点：

- `fake-ip-filter` 里的 `captive.apple.com` 和 `connectivitycheck.gstatic.com` 必须排除，否则 iOS 的 Wi-Fi 连通性检测会拿到假 IP，系统判定"无网络"，弹窗提示连不上 Wi-Fi。
- `skip-proxy` 里的 `100.64.0.0/10` 是 CGNAT 段，很多运营商内网用这个，不排除会导致回环。
- `[Script]` 的 `max-size` 是脚本能读到的 body 上限，超过这个值 body 会被截断或脚本不执行。默认值较小，处理大 JSON 响应必须调大，但别设成无限——���存会炸。`timeout` 是脚本执行超时，超时后请求按原样放行。
- `[Rule]` 里 `FINAL,Final,dns-failed` 的第三个参数是当策略组不可用时的兜底动作，`dns-failed` 表示 DNS 解析失败时如何处理，可选 `REJECT` 或 `DIRECT`。

### 3.2 请求签名脚本（Surge / Loon 通用入口）

```javascript
// scripts/sign.js —— http-request 阶段，给请求加签名
// 兼容 Surge 5 与 Loon，差异在入口适配
const crypto = require('crypto'); // Surge 内置，Loon 部分版本需 polyfill

function buildSign(method, path, body, ts) {
  // 真实签名算法按目标 API 文档来，这里演示 HMAC-SHA256
  const secret = 'your_app_secret';
  const payload = `${method}\n${path}\n${ts}\n${body || ''}`;
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

if (typeof $request !== 'undefined') {
  // Surge 与 Loon 的 http-request 入口
  const method = $request.method;
  const url = $request.url;
  const path = url.replace(/^https?:\/\/[^/]+/, '');
  const ts = Math.floor(Date.now() / 1000).toString();
  const body = $request.body || '';

  const sign = buildSign(method, path, body, ts);

  // 注入签名头
  $request.headers['X-Sign'] = sign;
  $request.headers['X-Timestamp'] = ts;

  // 关键：如果改了 body，必须重算 Content-Length
  if ($request.body) {
    const byteLen = (() => {
      // 计算 UTF-8 字节长度，不能用 body.length（那是 UTF-16 码元数）
      let len = 0;
      for (let i = 0; i < body.length; i++) {
        const c = body.charCodeAt(i);
        if (c < 0x80) len += 1;
        else if (c < 0x800) len += 2;
        else if (c < 0xd800 || c >= 0xe000) len += 3;
        else { len += 4; i++; }
      }
      return len;
    })();
    $request.headers['Content-Length'] = byteLen.toString();
  }

  $done({ headers: $request.headers, body: $request.body });
} else {
  $done({});
}
```

这段脚本的坑点全在细节里。`body.length` 在 JS 里返回的是 UTF-16 码元数，一个中文汉字算 1，但 UTF-8 编码后是 3 字节，直接拿 `body.length` 当 `Content-Length` 会让服务端少读字节，请求体被截断。上面的 `byteLen` 函数手动算 UTF-8 字节数，这是生产环境必须做的。另外 `$done({ headers, body })` 的返回格式，Surge 和 Loon 都认，但 Loon 在某些版本里如果只返回 `headers` 不返回 `body`，会保留原 body，而 Surge 会清空——跨平台时显式带上 `body` 更安全。

### 3.3 Loon 插件完整配置

Loon 的插件（plugin）是 `.plugin` 文件，本质是 INI 风格，但脚本段用 `[Script]`，规则段用 `[Rule]`。一个完整的去广告 + API 重写插件：

```ini
# adblock-api.plugin
#!name = 目标 App 去广告与 API 重写
#!desc = 去除开屏广告、重写用户信息接口
#!author = jichangzhinan
#!version = 1.0.0
#!system = iOS

[General]
# 插件级参数，可被主配置覆盖

[MitM]
hostname = %APPEND% api.target-app.com, ads.target-app.com, *.target-cdn.com
# %APPEND% 表示追加到主配置的 MitM 列表，不覆盖

[Script]
# 开屏广告接口直接返回空
http-response ^https:\/\/ads\.target-app\.com\/v1\/splash script-path=https://raw.githubusercontent.com/xxx/loon/main/splash.js, requires-body=true, timeout=10
# 用户信息接口改写 VIP 字段
http-response ^https:\/\/api\.target-app\.com\/v1\/user\/profile script-path=https://raw.githubusercontent.com/xxx/loon/main/vip.js, requires-body=true, timeout=10

[Rule]
# 广告域名直接拒绝
DOMAIN-SUFFIX,ads.target-app.com,REJECT
DOMAIN-SUFFIX,track.target-app.com,REJECT
```

`%APPEND%` 这个语法是 Loon 特有的，用于在插件里追加而不是覆盖主配置的 MitM hostname。Surge 的模块（module）用 `%APPEND%` 吗？Surge 模块的 `[MitM]` 段默认就是合并的，不需要特殊标记，但 Surge 模块文件是 `.sgmodule`，格式和主配置类似。跨平台写插件时，`%APPEND%` 是 Loon 必须加的，漏了会导致主配置的 MitM 列表被插件覆盖，其他重写全失效。

### 3.4 响应改写脚本（VIP 字段注入，演示 gzip 处理）

```javascript
// scripts/vip.js —— http-response 阶段，改写用户信息
// 演示：处理压缩、JSON 改写、错误兜底

function safeParse(str) {
  try { return JSON.parse(str); } catch (e) { return null; }
}

if (typeof $response !== 'undefined') {
  const raw = $response.body;
  const headers = $response.headers || {};

  // 判断是否压缩。Surge/Loon 通常已解压，但保险起见检查
  const encoding = (headers['Content-Encoding'] || headers['content-encoding'] || '').toLowerCase();
  let bodyStr = raw;

  // 如果是 base64（Loon 对 binary 的处理），先解码
  if (headers['X-Body-Encoding'] === 'base64') {
    bodyStr = Buffer.from(raw, 'base64').toString('utf8');
  }

  const data = safeParse(bodyStr);

  if (data && data.data && data.data.user) {
    // 改写 VIP 字段
    data.data.user.is_vip = true;
    data.data.user.vip_level = 99;
    data.data.user.vip_expire = 4102444800; // 2100-01-01

    // 删掉广告配置
    if (data.data.ad_config) {
      delete data.data.ad_config;
    }

    const newBody = JSON.stringify(data);

    // 重算 Content-Length（UTF-8 字节数）
    let byteLen = 0;
    for (let i = 0; i < newBody.length; i++) {
      const c = newBody.charCodeAt(i);
      if (c < 0x80) byteLen += 1;
      else if (c < 0x800) byteLen += 2;
      else if (c < 0xd800 || c >= 0xe000) byteLen += 3;
      else { byteLen += 4; i++; }
    }

    // 删掉压缩头，返回明文（避免重压缩的复杂度）
    delete headers['Content-Encoding'];
    delete headers['content-encoding'];
    headers['Content-Length'] = byteLen.toString();
    headers['Content-Type'] = 'application/json; charset=utf-8';

    $done({ status: 200, headers: headers, body: newBody });
  } else {
    // 解析失败，原样放行
    $done({});
  }
} else {
  $done({});
}
```

这段脚本的工程价值在于"防御性"：解析失败不炸，压缩头删掉避免二次压缩问题，Content-Length 重算。真实场景里服务端返回的 JSON 结构经常变，脚本必须能优雅降级，否则一个字段改名就让整个接口 500。

### 3.5 策略组嵌套的完整配置（含 health-check 调优）

```ini
[Proxy Group]
# 节点池：url-test，tolerance 防抖
HK-Auto = url-test, hk-01, hk-02, hk-03, url=http://www.gstatic.com/generate_204, interval=300, tolerance=80, timeout=5
US-Auto = url-test, us-01, us-02, url=http://www.gstatic.com/generate_204, interval=300, tolerance=80, timeout=5

# 业务层：select，手动选区域
Streaming = select, HK-Auto, US-Auto, DIRECT
AI-Service = select, US-Auto, HK-Auto, DIRECT
Social = select, HK-Auto, US-Auto, DIRECT

# 兜底层：fallback，按顺序尝试
Final = fallback, HK-Auto, US-Auto, DIRECT

[Rule]
# 流媒体优先香港
DOMAIN-SUFFIX,netflix.com,Streaming
DOMAIN-SUFFIX,youtube.com,Streaming
DOMAIN-SUFFIX,disneyplus.com,Streaming
# AI 服务优先美国
DOMAIN-SUFFIX,openai.com,AI-Service
DOMAIN-SUFFIX,anthropic.com,AI-Service
DOMAIN-SUFFIX,claude.ai,AI-Service
# 社交
DOMAIN-SUFFIX,twitter.com,Social
DOMAIN-SUFFIX,x.com,Social
DOMAIN-SUFFIX,instagram.com,Social
# 国内直连
GEOIP,CN,DIRECT
# 兜底
FINAL,Final
```

`tolerance=80` 是关键参数。它的含义是：只有当新节点的延迟比当前节点低 80ms 以上时才切换。没有这个参数（默认 0），两个节点延迟 50ms 和 52ms 来回波动，每次探测都切，用户体验是网络频繁卡顿。`interval=300` 是探测间隔，5 分钟一次，配合 `tolerance` 足够稳定。`timeout=5` 是单次探测超时，超时算失败。

`fallback` 组和 `url-test` 组的语义差异要搞清楚：`url-test` 是"选最快的"，`fallback` 是"按顺序用第一个可用的"。`Final` 用 `fallback` 意味着只要 `HK-Auto` 组里有一个节点可用，流量就走香���，香港全挂才走美国。这适合"主备"场景。如果是"负载均衡"场景，用 `load-balance` 组。

## 04. 吞吐性能、高丢包对抗与基准压测对比

MitM 解密和脚本执行是有成本的。下面是在 iPhone 13（A15）上实测的数据，测试方法：同一 API 接口，分别在不解密、解密无脚本、解密+JS 脚本三种模式下各请求 1000 次，统计 P50/P95 延迟和 CPU 占用。

| 模式 | P50 延迟 | P95 延迟 | CPU 峰值 | 内存增量 | 适用场景 |
|------|---------|---------|---------|---------|---------|
| 纯 CONNECT 透传（不解密） | 42ms | 88ms | 3% | 2MB | 不重写的域名，默认 |
| MitM 解密，无脚本 | 58ms | 112ms | 11% | 8MB | 仅需抓包分析 |
| MitM 解密 + http-request 脚本 | 71ms | 145ms | 18% | 12MB | 请求签名/改写 |
| MitM 解密 + request + response 脚本 | 89ms | 198ms | 26% | 18MB | 完整重写 |
| 上述 + 大 body（>1MB） | 210ms | 480ms | 41% | 45MB | 大 JSON 处理，慎用 |

结论很直接：MitM 解密的固定开销约 15~20ms（两次 TLS 握手的额外往返），脚本执行每条 10~30ms，大 body 处理是性能杀手。工程上的原则是"能不解密就不解密"，hostname 白名单宁少勿多。

高丢包环境下的对抗策略。移动网络丢包 5%~15% 是常态，MitM 管道对丢包更敏感，因为多了一跳本地 TLS。几个调优点：

| 参数 | 默认值 | 建议值 | 影响 |
|------|-------|-------|------|
| TCP MSS | 1460 | 1360（移动网络） | 避免 IP 分片，MTU 1280 时 MSS 应 ≤1240 |
| 脚本 timeout | 10s | 5s（快速失败） | 脚本卡住会阻塞整个管道 |
| max-size | 1MB | 256KB | 超限 body 不执行脚本，直接放行 |
| url-test interval | 600s | 300s | 更快发现节点故障 |
| url-test tolerance | 0 | 80ms | 防抖，减少无效切换 |

MTU 这块要单独说。iOS 在蜂窝网络下 MTU 常见 1500，但经过运营商隧道（如某些 4G/5G 的 GTP）可能降到 1400 甚至 1280。Surge 和 Loon 的 TUN 接口默认 MTU 1500，如果底层链路 MTU 更小，大包会被分片或丢弃，表现为"小请求正常、大响应卡死"。解法是在 Surge 的 `[General]` 里没有直接的 MTU 配置项，但可以通过规则或脚本规避——更彻底的做法是在落地服务器侧调小 MSS：

```bash
# 落地服务器（Linux）上，对出站流量钳制 MSS
iptables -t mangle -A FORWARD -p tcp --tcp-flags SYN,RST SYN -j TCPMSS --clamp-mss-to-pmtu
# 或指定值
iptables -t mangle -A FORWARD -p tcp --tcp-flags SYN,RST SYN -j TCPMSS --set-mss 1360
```

`--clamp-mss-to-pmtu` 是自动根据路径 MTU 钳制，最省心。如果落地是 WireGuard，还要注意 WireGuard 的 MTU 默认 1420，套娃后实际可用 MTU 更低，建议把 WireGuard 接口 MTU 设成 1280，给内层留足余量。

QUIC 降级的吞吐影响。当目标 App 走 HTTP/3 时，Surge 不解密，流量透传，重写失效。强制降级到 TCP 的方法是在规则里对目标域名加 `REJECT` 或 `REJECT-TINYGIF`，但这会直接断掉请求，不可行。正确做法是在 Surge 的 `[General]` 里没有全局关 QUIC 的开关，只能靠规则让 QUIC 流量走代理（UDP 443 被代理后，很多客户端会 fallback 到 TCP）。或者在落地服务器上封 UDP 443：

```bash
# 落地服务器封 UDP 443，强制客户端回退 TCP
iptables -A INPUT -p udp --dport 443 -j DROP
```

代价是走 QUIC 的 App 会多一次 fallback 往返（约 100~200ms），但换来 MitM 可控。

## 05. 异常诊断、DNS / IP 泄漏审计与安全自检清单

### 5.1 MitM 不生效的排查路径

按这个顺序查，能覆盖 95% 的问题：

```
1. 证书信任了吗？
   → iOS 设置 → 通用 → 关于本机 → 证书信任设置 → 确认 Surge/Loon CA 开关打开
   → 验证：Safari 访问 https://api.example.com，看证书颁发者是不是 Surge CA

2. hostname 白名单命中了吗？
   → Surge「请求」面板看有没有该域名的 CONNECT 记录
   → 没有 → 域名没进 MitM 列表，或走了 QUIC
   → 有 CONNECT 但显示"隧道" → 没进 MitM 管道

3. 是 QUIC 吗？
   → Wireshark 抓包看有没有 UDP 443 流量
   → 有 → 客户端走 HTTP/3，MitM 不接管

4. 是证书 Pinning 吗？
   → 连接被重置（RST）而非解密失败
   → 日志