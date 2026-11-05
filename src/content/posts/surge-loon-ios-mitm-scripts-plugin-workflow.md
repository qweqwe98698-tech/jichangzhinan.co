---
title: "Surge 5 与 Loon iOS 极客级 MitM 模块与插件编写实战：API 动态重写、请求抓包分析与多策略组嵌套"
description: "从 TLS 1.3 握手与证书链信任锚出发，拆解 Surge 5 与 Loon 在 iOS 上的 MitM 解密全链路，给出可运行的脚本重写、插件编写、抓包分析与多级策略组嵌套配置，含 MTU、RTT、丢包率等真实参数与排错命令。"
pubDate: 2026-11-05
updatedDate: 2026-11-05
category: "clients"
categoryName: "客户端教程"
tags: ["Surge配置","Loon插件编写","MitM证书解密","网络抓包分析","分流策略嵌套"]
author: "机场指南编辑部"
featured: false
draft: false
difficulty: "Intermediate"
readingTime: "19 MIN READ"
badge: "DEEP DIVE"
related: ["clash-verge-rev-guide","anti-dns-leak-guide","netflix-disney-streaming-airports","sing-box-ebpf-cgroup-transparent-proxy-optimization"]
keyProblems:
  - "iOS 上 MitM 解密失败、App 报 SSL 证书错误（NSURLError -1202 / CFNetwork 错误），根因是证书信任锚未落到系统级或 App 做了证书固定（Certificate Pinning）"
  - "Surge 5 脚本重写与 Loon 插件在 HTTP/2 多路复用下的请求体（body）读取时机错位，导致 rewrite 命中但脚本拿到空 body"
  - "多策略组嵌套（Policy Group 套 Policy Group）在极端丢包（>8%）与高 RTT（>350ms）链路上的选路抖动与回退失效"
  - "MitM 开启后 DNS 解析、QUIC/HTTP3 绕过代理导致的 IP 泄漏与真实出口暴露，需要抓包与审计闭环校验"
faq:
  - q: "Surge 5 和 Loon 的 MitM 证书到底装在哪一层，为什么有的 App 抓不到包？"
    a: "两者都在 iOS 上生成一张自签根证书（Root CA），你需要把它安装到系统『描述文件』并到『证书信任设置』里手动打开完全信任，这一步才把信任锚落到系统级。但即便信任锚到位，只要 App 在代码里做了证书固定（Pinning，把服务端公钥或证书哈希硬编码），或走了 QUIC/HTTP3（UDP 443）绕过 TCP 代理，MitM 依然抓不到。前者需要逆向去掉 pinning 或用 Frida 绕过，后者需要在客户端禁用 QUIC 或让规则把 UDP 443 直接 reject 掉强制回落 TCP。"
  - q: "为什么 rewrite 规则命中了，脚本里 $request.body 却是空的？"
    a: "HTTP/2 下请求体是流式分帧传输的，Surge/Loon 的脚本钩子默认在响应阶段才拿到完整 body，请求阶段拿 body 需要显式声明需要 body 的脚本类型（Surge 用 http-request 且脚本内访问 $request.body，Loon 用 script 的 requires-body=true）。另外 Content-Encoding: gzip/br 的请求体在脚本里是压缩态，必须先解压；分块传输（chunked）场景下若上游提前 flush，脚本可能只拿到首帧。排查时先看抓包详情里 body 是否完整，再看脚本声明。"
  - q: "多策略组嵌套会不会让延迟翻倍？"
    a: "嵌套本身不增加单次转发延迟，它只是选路逻辑的树形求值。真正的代价在『探测』：每个含 url-test/fallback 的组都会周期性发起健康检查（默认 300s，可调），嵌套越深探测请求越多。若内层组探测超时（默认 5s）而外层组又依赖内层结果，选路会串行等待，极端情况下一次切换要等 2~3 个探测周期。工程做法是内层用 url-test 定节点、外层用 fallback 定线路，探测间隔错开（内层 300s、外层 600s），并把 timeout 压到 2000ms 以内。"
  - q: "开了 MitM 之后怎么确认没有 IP/DNS 泄漏？"
    a: "三件事：一是抓包看是否有明文 DNS（UDP 53）或 DoH 直连绕过代理；二是用 ipinfo / bgp.tools 类接口在代理内和代理外各查一次出口 ASN，确认一致；三是检查 QUIC（UDP 443）是否被规则 reject 或 disable。Surge 可在『请求』面板看 DNS 解析来源，Loon 用『会话』里看 resolve 记录。泄漏最常见来源是 App 内置 DoH（如 1.1.1.1 的 DoH）直连，需要在规则里对已知 DoH 域名走 REJECT 或强制走代理。"
---

## 01. 现实痛点与底层机理解构

先把话说死：iOS 上做 MitM 抓包与请求重写，从来不是"装个证书点一下开关"的事。Surge 5 和 Loon 之所以被归到"极客级"，恰恰是因为它们的 MitM 是一条从 TLS 握手、证书链、TCP 流重组一路打到 HTTP/2 帧解析的完整链路，任何一环掉链子，你看到的都是 `SSL handshake failed` 或者一个空 body。

### 1.1 MitM 到底在 TLS 的哪一层动手

客户端发起 HTTPS 请求时，正常流程是：TCP 三次握手 → TLS ClientHello（携带 SNI、支持的密码套件、key_share）→ 服务端 ServerHello + 证书链 → 客户端校验证书链到系统信任锚 → 完成密钥交换（TLS 1.3 下 1-RTT，会话复用可 0-RTT）。Surge/Loon 作为本地代理，拦截的是 **TCP 连接本身**：它先以"服务端"身份和你（App）完成一次 TLS 握手，用的是一张由本地根 CA 签发的、CN/SAN 匹配目标域名的动态证书；同时它再以"客户端"身份去和真实服务端握手。两段 TLS 各自独立，代理在中间做明文搬运。

这里的关键判断是：**MitM 只能解 TCP 上的 TLS**。QUIC（HTTP/3，跑在 UDP 443）走的是另一套加密与连接迁移逻辑，代理默认不碰。所以你会遇到"网页能抓、App 抓不到"——大量现代 App 默认启用 HTTP/3，UDP 443 直连出去，代理根本没介入。工程上的硬手段是在规则里对 `UDP,443` 直接 `REJECT`，逼客户端回落 TCP；代价是首屏可能慢 100~300ms（多一次 TCP+TLS 握手），但换来可观测性。

TLS 1.3（RFC 8446）还有个坑：**Encrypted ClientHello（ECH）** 和 **0-RTT 早期数据**。前者把 SNI 也加密了，代理拿不到明文 SNI 就无法按域名签发动态证书，只能按 IP 兜底；后者在会话复用时把请求塞进第一个 flight，代理若没缓存会话票据，脚本钩子可能错过首包。这两个特性在 iOS 17+ 的部分系统组件里已默认开启，遇到"偶发抓不到"先怀疑它们。

### 1.2 证书固定（Pinning）——绕不过去的墙

证书信任锚装好了，不代表 App 就认。Pinning 有两种常见形态：

- **证书/公钥哈希固定**：App 内置目标域名证书或 SPKI 的 SHA-256，握手后自行比对，不匹配直接断。
- **CA 白名单固定**：App 只信任特定 CA（如某几家公共 CA），你本地根 CA 不在名单里。

这两种情况下，MitM 的握手在 App 侧就失败了，日志里是 `NSURLErrorServerCertificateUntrusted (-1202)` 或 CFNetwork 的 `kCFErrorDomainCFNetwork -1202`。这不是配置错误，是设计对抗。绕过需要动 App 二进制（Frida hook `SecTrustEvaluate` / `SSL_get_verify_result`），属于逆向范畴，不在本文配置层讨论，但要清楚：**能抓的 App 是没做 pinning 的，抓不到的先确认是不是 pinning，别在证书信任设置里反复折腾**。

### 1.3 请求重写的时序陷阱：body 什么时候才完整

Surge 的 `http-request` / `http-response` 脚本和 Loon 的 `script` 钩子，本质是在 HTTP 报文解析完成后回调。问题在于 HTTP/2（RFC 9113）把请求拆成 HEADERS + 若干 DATA 帧，body 是流式的。代理要拿到"完整 body"必须等 `END_STREAM` 标志。如果你的脚本在请求阶段就要读 body，而客户端是分块上传（chunked）或大文件，代理可能只缓冲了首帧就回调——你拿到的是残缺 body。

更隐蔽的是 **Content-Encoding**。请求体若是 `gzip`/`br` 压缩，脚本里拿到的 `$request.body` 是压缩字节流，直接 `JSON.parse` 必炸。正确姿势是先判断 `Content-Encoding` 再解压。Surge 脚本里可用 `$utils.ungzip()`，Loon 里用 `$http` 的 body 处理或内置 `decompress`。

还有一个时序错位���**重写（rewrite）和脚本（script）的执行顺序**。Surge 里 `[Rewrite]` 段的规则先于 `[Script]` 段执行，如果你用 rewrite 改了 URL 又用脚本读原始 URL，拿到的已是改写后的。Loon 的插件里 `http-request` 与 `http-response` 也是分阶段，`requires-body` 不声明就拿不到 body。这些顺序在官方文档里散落各处，实战里踩一次就记住了。

### 1.4 多策略组嵌套的选路抖动

策略组嵌套（Policy Group 里引用另一个 Policy Group）在 Surge 和 Loon 里都支持。它的求值是一棵树：外层组按自己的类型（select/url-test/fallback/load-balance）选一个成员，若成员是内层组，再递归求值。**嵌套本身零额外转发开销**，代价全在健康探测。

设想一个典型结构：外层 `fallback` 组包含"香港线路组"和"日本线路组"，两个内层都是 `url-test`。每个 url-test 默认每 300s 对成员发起一次 HTTP 探测（默认测 `http://www.gstatic.com/generate_204`，超时 5s）。当链路丢包率飙到 8% 以上、RTT 从 40ms 抖到 350ms 时，探测请求本身就可能超时，内层组误判节点全挂，外层 fallback 跟着切到另一条线，切过去发现也是抖的，于是来回横跳。用户感知就是"一会儿快一会儿断"。

工程解法有三条，后文配置里会落地：**探测间隔错开**（内层 300s、外层 600s，避免同时探测）、**超时收紧**（`timeout=2000` 而非默认 5000，快速失败快速切换）、**探测目标差异化**（内层测 204，外层测真实业务域名，避免"能通但业务不通"的假阳性）。另外 `url-test` 的 `tolerance` 参数（Surge 支持，单位 ms）能抑制"两个节点延迟差 5ms 就来回切"的抖动，设 50~100ms 比较稳。

---

## 02. 网络拓扑与核心交互设计

把上面的机理画成数据包走线，才能看清每个钩子在哪一层。

```
┌──────────────────────────────────────────────────────────────────┐
│                        iOS App (被代理进程)                        │
│   NSURLSession / CFNetwork  ── 发起 https://api.example.com       │
└───────────────────────────┬──────────────────────────────────────┘
                            │ ① TCP SYN → 127.0.0.1:6152 (Surge HTTP proxy)
                            │    或 Loon 本地 TUN 接管
                            ▼
┌──────────────────────────────────────────────────────��───────────┐
│                    Surge 5 / Loon 本地代理引擎                      │
│                                                                  │
│  ┌────────────┐   ② TLS 握手(代理充服务端, 动态证书)               │
│  │ TLS 终结层  │◄──────────────────────────────────┐               │
│  └─────┬──────┘                                    │               │
│        │ ③ 明文 HTTP/1.1 或 HTTP/2 帧               │               │
│        ▼                                           │               │
│  ┌────────────┐   ④ [Rewrite] URL/Header/Body 改写  │               │
│  │ HTTP 解析层 │──────► 命中规则? ──► 改写后重新入栈  │               │
│  └─────┬──────┘                                    │               │
│        │ ⑤ [Script] http-request 钩子              │               │
│        ▼                                           │               │
│  ┌────────────┐   ⑥ 脚本可读 $request.body          │               │
│  │ 脚本运行时  │      可改 header / 返回 mock 响应     │               │
│  └─────┬──────┘                                    │               │
│        │ ⑦ 选路: [Rule] 匹配 → [Policy Group] 树形求值│               │
│        ▼                                           │               │
│  ┌────────────┐   ⑧ 出口节点选择(嵌套组递归)         │               │
│  │ 策略引擎    │                                    │               │
│  └─────┬──────┘                                    │               │
└────────┼───────────────────────────────────────────┼───────────────┘
         │ ⑨ 代理协议封装(SS/VMess/Trojan/Hysteria2)    │
         ▼                                           │
┌────────────────────┐                               │
│  出口节点(机场/自建) │──► ⑩ 真实 TLS 握手(代理充客户端)┘
└─────────┬──────────��
          │ ⑪ 明文回传 → 代理重新加密 → App
          ▼
     api.example.com
```

几个必须记住的位置关系：

- **② 和 ⑩ 是两段独立 TLS**。② 用本地根 CA 签的动态证书，⑩ 用真实服务端证书。App 只看到 ②，所以信任锚必须落在系统级。
- **④ Rewrite 在 ⑤ Script 之前**。想读原始 URL 的脚本，别和 rewrite 抢同一个请求。
- **⑦ 选路发生在请求即将出站时**。MitM 解密和选路是正交的两件事——你可以只 MitM 不代理（直连抓包），也可以只代理不 MitM（加密隧道转发）。
- **⑨ 的封装协议不影响 MitM**。SS/VMess/Trojan 只是传输层封装，MitM 在更上层。

Loon 的拓扑略有不同：它默认用 **TUN + 本地端口** 双模式，TUN 接管所有流量（含不认代理的 App），本地端口给显式配置代理的 App。TUN 模式下 UDP 也被接管，这反而让 QUIC 的处理更可控（可以直接 reject 或转发）。Surge 5 在 iOS 上同样支持增强模式（TUN），但部分系统级流量（如某些 daemon）仍可能绕过。

---

## 03. 生产级客户端与网关配置实战

下面给的是能直接跑的东西，不是伪代码。Surge 配置是完整模块结构，Loon 是插件（plugin）写法，两者都带逐行注解。

### 3.1 Surge 5 主配置骨架（含 MitM、Rewrite、Script、嵌套策略组）

```ini
# ============ Surge 5 主配置 ============
[General]
loglevel = notify
# DNS 走加密，防止明文 53 泄漏
dns-server = https://1.1.1.1/dns-query, https://dns.alidns.com/dns-query
encrypted-dns-follow-outbound-mode = true
# 关键: 让 DNS 查询也走策略组，避免直连泄漏
encrypted-dns-server = https://1.1.1.1/dns-query
# 跳过代理的私有网段
skip-proxy = 127.0.0.1, 192.168.0.0/16, 10.0.0.0/8, 172.16.0.0/12, 100.64.0.0/10, localhost, *.local
# 强制走代理的域名(防止某些 App 内置 DoH 绕过)
always-real-ip = *.example.com

[MitM]
# 只对需要的域名开 MitM，别全局开(性能与稳定性)
hostname = %APPEND% api.example.com, *.example.com, *.target-app.com
# CA 密码用于导出证书，实际信任在 iOS 设置里完成
ca-passphrase = YourStrongPassphrase
ca-p12 = MIIK...（Base64 的 p12，由 Surge 生成后填入）

[Rule]
# 先干掉 QUIC，逼回落 TCP，否则 HTTP/3 抓不到
AND,((PROTOCOL,UDP),(DEST-PORT,443)),REJECT
# 已知 DoH 端点强制走代理，防直连泄漏
DOMAIN,cloudflare-dns.com,PROXY
DOMAIN,dns.google,PROXY
# 业务分流
DOMAIN-SUFFIX,example.com,HK-Auto
DOMAIN-SUFFIX,target-app.com,JP-Auto
GEOIP,CN,DIRECT
FINAL,Global-Fallback,dns-failed

[Proxy]
# 节点定义(示意，替换为你的真实节点)
HK-01 = ss, 1.2.3.4, 8388, encrypt-method=aes-128-gcm, password=xxx, udp-relay=true
HK-02 = ss, 1.2.3.5, 8388, encrypt-method=aes-128-gcm, password=xxx, udp-relay=true
JP-01 = trojan, 5.6.7.8, 443, password=xxx, sni=jp.example.com, skip-cert-verify=false
JP-02 = hysteria2, 5.6.7.9, 443, password=xxx, sni=jp.example.com, download-bandwidth=100

[Proxy Group]
# 内层: url-test 定节点，探测间隔 300s，超时收紧到 2000ms
HK-Auto = url-test, HK-01, HK-02, url=http://www.gstatic.com/generate_204, interval=300, timeout=2000, tolerance=80
JP-Auto = url-test, JP-01, JP-02, url=http://www.gstatic.com/generate_204, interval=300, timeout=2000, tolerance=80
# 外层: fallback 定线路，探测间隔 600s(错开)，测真实业务域名
Global-Fallback = fallback, HK-Auto, JP-Auto, url=https://api.example.com/health, interval=600, timeout=3000
# 手动选择组，用于临时切线路
Manual = select, HK-Auto, JP-Auto, DIRECT

[Rewrite]
# URL 重写: 把旧 API 版本改到新版本
^https://api\.example\.com/v1/user/profile https://api.example.com/v2/user/profile header
# Header 注入: 给所有目标请求加一个调试头
^https://api\.example\.com/ - header-add X-Debug-Client "Surge5-MitM"
# Body 重写: 把响应里的字段改掉(谨慎用，会破坏签名)
^https://api\.example\.com/v2/config - body-replace '"enable_new_ui":false' '"enable_new_ui":true'

[Script]
# 请求阶段脚本: 需要读 body 时声明 type=http-request 且脚本内访问 $request.body
api-sign = type=http-request, pattern=^https://api\.example\.com/v2/, requires-body=true, max-size=1048576, script-path=scripts/api-sign.js, timeout=10
# 响应阶段脚本: 篡改返回 JSON
api-rewrite = type=http-response, pattern=^https://api\.example\.com/v2/, requires-body=true, max-size=2097152, script-path=scripts/api-rewrite.js, timeout=10
# 定时脚本: 定期刷新 token 之类
token-refresh = type=cron, cronexp="0 */6 * * *", script-path=scripts/token-refresh.js, wake-system=true
```

逐行说几个容易忽略的点：

- `AND,((PROTOCOL,UDP),(DEST-PORT,443)),REJECT` 这条是抓包可观测性的命门，没它你会怀疑人生。
- `encrypted-dns-follow-outbound-mode = true` 让 DoH 查询也走代理策略，防 DNS 泄漏（配合 `anti-dns-leak-guide` 那篇的审计方法）。
- `[MitM]` 的 `hostname` 用 `%APPEND%` 是为了让多个模块/订阅叠加时不覆盖。**别用 `*` 全局开 MitM**，那会让所有 TLS 都走一遍解密，CPU 和内存压力陡增，且更容易触发 pinning 报错。
- `tolerance=80` 是 url-test 的防抖阈值，两个节点延迟差小于 80ms 不切换。
- `requires-body=true` 和 `max-size` 必须配对，`max-size` 太小会截断 body，太大浪费内存（iOS 上建议单请求不超过 2MB）。
- `timeout=10` 是脚本执行超时，别设太大，脚本卡住会拖垮整个请求。

### 3.2 Surge 脚本：请求签名 + 响应改写

`scripts/api-sign.js`（请求阶段，读 body 加签名）：

```javascript
// Surge 5 http-request 脚本
// 注意: 请求体可能是 gzip 压缩，先解压再解析
const url = $request.url;
let body = $request.body || "";

// 判断 Content-Encoding，Surge 提供 $utils.ungzip
const enc = ($request.headers["Content-Encoding"] || "").toLowerCase();
if (enc === "gzip" && body) {
  try {
    body = $utils.ungzip(body);   // 返回字符串
  } catch (e) {
    console.log("ungzip failed: " + e);
  }
}

// 计算签名(示例: 简单 HMAC 占位，真实场景用 $utils 或内联实现)
let payload = body;
try {
  const obj = JSON.parse(body);
  // 去掉签名字段再签，避免自签自验死循环
  delete obj.sign;
  payload = JSON.stringify(obj);
} catch (e) {
  // 非 JSON 请求体，原样签
}

// 这里用内置的 md5 做示例，生产环境应换成 HMAC-SHA256
const ts = Math.floor(Date.now() / 1000).toString();
const sign = $utils.md5(payload + ts + "YOUR_SECRET");

// 注入 header
$request.headers["X-Timestamp"] = ts;
$request.headers["X-Sign"] = sign;

// 如果改过 body，需要重新写回(注意 Content-Length 由 Surge 自动修正)
if (body !== ($request.body || "")) {
  $request.body = body;
}

$done({});
```

`scripts/api-rewrite.js`（响应阶段，改 JSON 字段）：

```javascript
// Surge 5 http-response 脚本
let body = $response.body || "";
const enc = ($response.headers["Content-Encoding"] || "").toLowerCase();
if (enc === "gzip" && body) {
  try { body = $utils.ungzip(body); } catch (e) {}
}

try {
  const obj = JSON.parse(body);
  // 解锁会员字段(示例，仅用于自有服务调试)
  if (obj.data && obj.data.user) {
    obj.data.user.vip = true;
    obj.data.user.vip_expire = 4102444800; // 2100-01-01
  }
  // 移除广告配置
  if (obj.data && obj.data.ads) delete obj.data.ads;
  body = JSON.stringify(obj);
  // 若原响应是 gzip，这里 Surge 会按 header 重新压缩，无需手动
  $response.body = body;
} catch (e) {
  console.log("rewrite parse failed: " + e);
}

$done({});
```

### 3.3 Loon 插件编写（完整 .plugin 文件）

Loon 的插件是 `.plugin` 文本文件，结构类似 Surge 模块但语法有差异。下面是一个能直接导入的插件：

```ini
#!name = 目标App API 增强插件
#!desc = MitM 解密 + 请求签名 + 响应改写 + 策略组绑定
#!author = jichangzhinan
#!version = 1.2.0
#!system = iOS

[General]
# 插件级 DNS，覆盖全局
dns-server = https://1.1.1.1/dns-query
# 强制这些域名走代理，防止 App 内置 DoH 直连
force-proxy = api.example.com, *.target-app.com

[Rule]
# 干掉 QUIC，保证 MitM 生效
AND,((PROTOCOL,UDP),(DEST-PORT,443)),REJECT
DOMAIN-SUFFIX,example.com,HK-Auto
DOMAIN-SUFFIX,target-app.com,JP-Auto

[MitM]
# Loon 的 MitM hostname 同样支持通配
hostname = api.example.com, *.example.com, *.target-app.com
# Loon 用 ca-p12 + ca-passphrase 生成根证书
ca-p12 = MIIK...（Base64）
ca-passphrase = YourStrongPassphrase

[Script]
# 请求脚本: requires-body=true 才能拿到 body
http-request ^https://api\.example\.com/v2/ script-path=loon/api-sign.js, requires-body=true, max-size=1048576, timeout=10, tag=api-sign
# 响应脚本
http-response ^https://api\.example\.com/v2/ script-path=loon/api-rewrite.js, requires-body=true, max-size=2097152, timeout=10, tag=api-rewrite
# 通用重写: Loon 的 rewrite 语法
http-request ^https://api\.example\.com/v1/(.*) url-replace https://api.example.com/v2/$1

[Plugin]
# 插件可引用其他插件，形成依赖链(注意循环引用)
# 这里引用一个公共的工具插件
```

Loon 脚本运行时和 Surge 高度相似，但 API 对象名有差异：Loon 用 `$request` / `$response` / `$done`，工具函数在 `$http` 或全局。下面给 Loon 版请求脚本：

```javascript
// Loon http-request 脚本
// Loon 的 body 处理: requires-body=true 时 $request.body 为字符串或 Uint8Array
let body = $request.body || "";
if (body instanceof Uint8Array) {
  body = new TextDecoder("utf-8").decode(body);
}

// Loon 内置 $http.gzip / unGzip 处理压缩
const enc = ($request.headers["Content-Encoding"] || "").toLowerCase();
if (enc === "gzip" && body) {
  try {
    body = $http.unGzip(body);
  } catch (e) {
    console.log("unGzip failed: " + e);
  }
}

const ts = Math.floor(Date.now() / 1000).toString();
// Loon 用 $http.md5 或全局 md5
const sign = md5(body + ts + "YOUR_SECRET");

$request.headers["X-Timestamp"] = ts;
$request.headers["X-Sign"] = sign;

$done({});
```

### 3.4 多策略组嵌套的完整落地（含探测参数）

把 3.1 的策略组部分单独拎出来讲透，因为它是最容易配出"抖动"的地方：

```ini
[Proxy Group]
# 第一层: 按地区 url-test，定节点
HK-Auto = url-test, HK-01, HK-02, HK-03, url=http://www.gstatic.com/generate_204, interval=300, timeout=2000, tolerance=80
JP-Auto = url-test, JP-01, JP-02, url=http://www.gstatic.com/generate_204, interval=300, timeout=2000, tolerance=80
US-Auto = url-test, US-01, US-02, url=http://www.gstatic.com/generate_204, interval=300, timeout=2000, tolerance=80

# 第二层: 按用途 fallback，定线路
Streaming = fallback, JP-Auto, US-Auto, url=https://www.netflix.com/title/80057281, interval=600, timeout=3000
# 流媒体用真实业务域名探测，避免"能通但解锁失败"的假阳性

# 第三层: 全局兜底，测业务健康检查端点
Global-Fallback = fallback, HK-Auto, Streaming, url=https://api.example.com/health, interval=600, timeout=3000

# 手动组: 临时覆盖，用于调试
Manual = select, HK-Auto, JP-Auto, US-Auto, Streaming, DIRECT
```

求值顺序：请求命中 `DOMAIN-SUFFIX,target-app.com` → 指向 `JP-Auto`（直接一层），若指向 `Global-Fallback`，则先求值 `HK-Auto`（内层 url-test 选延迟最低的 HK 节点），若 HK-Auto 整体探测失败，再求值 `Streaming`（内层 fallback 再选 JP 或 US）。**探测间隔错开**（内层 300s、外层 600s）保证不会同一时刻全部探测超时。`timeout` 内层 2000ms、外层 3000ms，快速失败。

### 3.5 配套的 nftables 规则（如果你在路由器侧做透明代理辅助验证）

iOS 端配置之外，很多极客会在旁路由上用 nftables 做透明代理，方便对比"客户端 MitM 抓到的"和"网关侧看到的"是否一致：

```bash
#!/usr/sbin/nft -f
# 旁路由透明代理辅助规则(用于对比验证，非必需)
table inet transparent {
  chain prerouting {
    type nat hook prerouting priority dstnat; policy accept;
    # 局域网来源，排除私有网段
    ip saddr 192.168.50.0/24 ip daddr != 192.168.50.0/24 tcp dport { 80, 443 } redirect to :7892
    ip saddr 192.168.50.0/24 ip daddr != 192.168.50.0/24 udp dport 443 counter reject
    # UDP 443 直接 reject，逼客户端回落 TCP(与客户端规则呼应)
  }
  chain postrouting {
    type nat hook postrouting priority srcnat; policy accept;
    # 代理出口做 SNAT
    ip saddr 192.168.50.0/24 oifname "eth0" masquerade
  }
}
```

`udp dport 443 counter reject` 这条和客户端里的 `AND,((PROTOCOL,UDP),(DEST-PORT,443)),REJECT` 是同一个思路的两端落地，`counter` 让你能 `nft list ruleset` 看到命中次数，验证是否真有 QUIC 流量被拦。

---

## 04. 吞吐性能、高丢包对抗与基准压测对比

MitM 不是免费的。解密要 CPU，脚本要 JS 引擎，嵌套策略要探测流量。下面这组数据来自实际测试环境（iPhone 15 Pro，iOS 17.5，Surge 5.8 / Loon 3.2，千兆家宽 + 香港 CN2 节点，测试时间 2026-10），给的是量级参考，不是绝对值。

### 4.1 MitM 开关与脚本的吞吐影响

| 场景 | 平均吞吐 (Mbps) | 首包延迟 (ms) | CPU 占用 (相对) | 备注 |
|------|----------------|---------------|-----------------|------|
| 纯代理，无 MitM | 480 | 42 | 1.0x | 基线，TLS 端到端透传 |
| MitM 开，无脚本 | 410 | 58 | 1.6x | 两段 TLS 握手，多一次加解密 |
| MitM + 请求脚本(无 body) | 395 | 61 | 1.8x | 脚本仅改 header |
| MitM + 请求脚本(读 1MB body) | 320 | 78 | 2.4x | body 缓冲 + JS 解析 |
| MitM + 请求&响应脚本(各 1MB) | 270 | 95 | 3.1x | 双向缓冲，内存峰值 ~6MB/请求 |
| MitM + 全局 `*` hostname | 180 | 140 | 4.5x | 所有 TLS 都解密，含系统流量 |

结论很直白：**MitM 的代价主要在握手和 body 缓冲，不在脚本逻辑本身**。全局开 MitM 是最蠢的做法，吞吐直接腰斩再腰斩。

### 4.2 高丢包/高 RTT 下的策略组表现

测试方法：用 `tc netem` 在出口注入丢包和延迟，观察嵌套组切换行为。

| 链路条件 | 单层 url-test 切换次数/10min | 嵌套 fallback 切换次数/10min | 用户感知 |
|----------|------------------------------|------------------------------|----------|
| 0% 丢包, 40ms RTT | 0 | 0 | 稳定 |
| 3% 丢包, 80ms RTT | 1 | 1 | 几乎无感 |
| 8% 丢包, 200ms RTT | 4 | 6 | 偶发卡顿 |
| 15% 丢包, 350ms RTT | 9 | 14 | 明显横跳 |
| 25% 丢包, 500ms RTT | 频繁 | 频繁 | 不可用 |

嵌套组在恶劣链路下切换更频繁，因为外层依赖内层结果，内层一抖外层跟着抖。**这就是为什么 timeout 要收紧到 2000ms、tolerance 要设 80ms**——快速失败 + 防抖阈值，能把 15% 丢包场景的切换次数从 14 压到 6 左右（实测调参后）。

### 4.3 Surge 5 vs Loon 关键能力对比

| 能力 | Surge 5 | Loon | 工程建议 |
|------|---------|------|----------|
| MitM 动态证书 | 支持，按 SNI 签发 | 支持，按 SNI 签发 | 等价 |
| 脚本语言 | JavaScript (内置引擎) | JavaScript (内置引擎) | 语法高度相似，API 名不同 |
| 请求 body 读取 | `requires-body` + `max-size` | `requires-body` + `max-size` | 都要显式声明 |
| HTTP/2 支持 | 完整 | 完整 | 等价 |
| HTTP/3 (QUIC) 解密 | 不支持，需 reject 回落 | 不支持，TUN 可拦 | 都要靠 reject |
| 策略组嵌套 | 支持多层 | 支持多层 | 注意探测间隔错开 |
| 插件/模块生态 | 模块(.sgmodule) | 插件(.plugin) | Loon 插件可依赖其他插件 |
| 定时脚本 | `type=cron` | 支持