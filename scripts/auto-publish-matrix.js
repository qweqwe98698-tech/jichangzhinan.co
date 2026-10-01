/**
 * Automated SEO / GEO Matrix Article Generator for jichangzhinan.co
 * Powered by DeepSeek API (deepseek-chat)
 * 
 * Features:
 * 1. SEO & GEO (Generative Engine Optimization) Matrix Topic Selection
 * 2. Anti-AI Batch Detection & Human-Style URL/Slug Optimization
 * 3. Human-Writing Style Engine (Anti-AI Clichés, Deep Network Topology & Configs)
 * 4. Automatic Astro Content Collection Validation & IndexNow Sync
 */

import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// 1. Matrix Pillars with high SEO & GEO search intent
const MATRIX_PILLARS = [
  {
    pillarId: 'ai_residential_routing',
    category: 'scenarios',
    categoryName: '场景方案',
    difficulty: 'Intermediate',
    topics: [
      {
        seedTitle: '2026 AI 生产力大模型防风控专线架构：ChatGPT、Claude 3.5 与 Cursor 纯净原生住宅 IP 深度分流与 ASN 欺诈分过滤实战',
        slugBase: 'ai-productivity-residential-ip-anti-fraud-architecture',
        keywords: ['ChatGPT防封', 'Claude原生IP', 'Cursor代理配置', '住宅ISP', 'ASN欺诈评分', 'Cloudflare盾绕过']
      },
      {
        seedTitle: 'SearchGPT 与 Perplexity 实时爬虫反代拦截对抗：AI 搜索时代网络节点纯净度审计与动态出口调度',
        slugBase: 'searchgpt-perplexity-realtime-crawling-node-audit',
        keywords: ['SearchGPT代理', 'Perplexity节点', '出口IP纯净度', '数据中心IP伪装', 'AI搜索SEO']
      }
    ]
  },
  {
    pillarId: 'kernel_protocols',
    category: 'protocols',
    categoryName: '底层协议与技术原理',
    difficulty: 'Advanced',
    topics: [
      {
        seedTitle: 'Sing-box 内核 eBPF / cgroup 透明代理深度调优：绕过系统协议栈的高性能 10Gbps 网关方案',
        slugBase: 'sing-box-ebpf-cgroup-transparent-proxy-optimization',
        keywords: ['Sing-box eBPF', 'Linux内核转发', 'cgroup流量接管', '软路由高吞吐', 'UDP单边加速']
      },
      {
        seedTitle: 'Hysteria 2 基于 BBR 变种单边拥塞控制与动态多端口跳跃（Port Hopping）全场景压榨实测',
        slugBase: 'hysteria2-bbr-congestion-port-hopping-deep-dive',
        keywords: ['Hysteria 2', '端口跳跃', 'UDP QoS突防', '晚高峰抗限速', '单边加速协议']
      },
      {
        seedTitle: 'VLESS-Reality 密钥套件与 SNI 伪装机制深度破译：借用境外大厂证书与抗 GFW 主动嗅探硬化指南',
        slugBase: 'vless-reality-sni-camouflage-active-probing-hardening',
        keywords: ['VLESS-Reality', 'SNI借用', 'TLS 1.3握手特征', '反主动探测', 'XTLS-Vision']
      }
    ]
  },
  {
    pillarId: 'router_infrastructure',
    category: 'routing',
    categoryName: '规则与路由',
    difficulty: 'Advanced',
    topics: [
      {
        seedTitle: 'OpenWrt 与 iStoreOS 旁路由全景避坑：从 Fake-IP 内存劫持、DHCP 网关死锁到 MosDNS 双栈分流终极拓扑',
        slugBase: 'openwrt-istoreos-bypass-gateway-mosdns-fakeip-mastery',
        keywords: ['OpenWrt旁路由', 'iStoreOS配置', 'MosDNS分流', 'Fake-IP防泄漏', 'DHCP网关环路']
      },
      {
        seedTitle: '企业级旁路网关与 Docker Macvlan 容器分流：跨境电商多网卡隔离与独立静态 IP 容器化映射实战',
        slugBase: 'docker-macvlan-crossborder-ecommerce-ip-isolation',
        keywords: ['Docker Macvlan', '跨境电商防关联', '多店铺网络隔离', '静态原生IP', '透明网关容器']
      }
    ]
  },
  {
    pillarId: 'streaming_unblocking',
    category: 'scenarios',
    categoryName: '场景方案',
    difficulty: 'Intermediate',
    topics: [
      {
        seedTitle: 'Netflix 4K HDR、Disney+ 与 YouTube Premium 全球跨区解锁体系：家庭住宅 IPv6 原生广播与策略路由链',
        slugBase: 'netflix-disney-residential-ipv6-unblock-policy-routing',
        keywords: ['Netflix 4K解锁', '家庭住宅IP', 'IPv6原生广播', '分流策略组', '流媒体跨区']
      },
      {
        seedTitle: 'TikTok 跨境电商独立店铺直播网络搭建：防0播放限流、住宅 ISP 静态纯净度检测与硬件防指纹全流程',
        slugBase: 'tiktok-crossborder-livestream-residential-isp-setup',
        keywords: ['TikTok直播专线', '独享静态住宅IP', '防0播放限流', '浏览器指纹隔离', '跨境电商出海']
      }
    ]
  },
  {
    pillarId: 'forensic_security',
    category: 'security',
    categoryName: '避坑与安全防骗',
    difficulty: 'Intermediate',
    topics: [
      {
        seedTitle: '真假 IPLC / IEPL 专线网络取证全指南：使用 MTR / NextTrace 追踪路由 AS 跳数与假专线公网中继套路鉴别',
        slugBase: 'real-iplc-iepl-forensic-traceroute-as-hop-verification',
        keywords: ['真假IPLC鉴别', 'NextTrace路由追踪', 'AS跳数检测', '倍率刺客防范', '机场跑路预警']
      },
      {
        seedTitle: '全面封堵 WebRTC、IPv6 与 DNS 多重网络泄漏：构建从操作系统内核到浏览器层面的零指纹数字隐私防护盾',
        slugBase: 'anti-webrtc-dns-ipv6-leak-zero-fingerprint-hardening',
        keywords: ['DNS泄漏测试', 'WebRTC泄漏防范', 'IPv6泄漏修复', 'uTLS指纹模拟', '浏览器网络沙盒']
      }
    ]
  },
  {
    pillarId: 'client_workflows',
    category: 'clients',
    categoryName: '客户端教程',
    difficulty: 'Intermediate',
    topics: [
      {
        seedTitle: 'Clash Verge Rev 核心进阶：Script 扩展脚本编写、Mihomo Meta 内核分流覆写与自建私有订阅转换链',
        slugBase: 'clash-verge-rev-advanced-scripts-mihomo-meta-overrides',
        keywords: ['Clash Verge Rev', 'Mihomo脚本覆写', '私有订阅转换', 'Rule-Set规则集', 'Tun内核分流']
      },
      {
        seedTitle: 'Surge 5 与 Loon iOS 极客级 MitM 模块与插件编写实战：API 动态重写、请求抓包分析与多策略组嵌套',
        slugBase: 'surge-loon-ios-mitm-scripts-plugin-workflow',
        keywords: ['Surge配置', 'Loon插件编写', 'MitM证书解密', '网络抓包分析', '分流策略嵌套']
      }
    ]
  }
];

// 2. Anti-AI URL & Batch Detection Optimization System
class AntiAiUrlOptimizer {
  constructor(existingSlugs) {
    this.existingSlugs = new Set(existingSlugs);
  }

  generateHumanSlug(baseSlug, keywords) {
    // Variations to break robotic patterns: 
    // select organic semantic technical tokens
    const variations = [
      baseSlug,
      `${baseSlug}-architecture`,
      `${baseSlug}-practice-guide`,
      `${baseSlug}-technical-breakdown`,
      `${baseSlug}-complete-walkthrough`
    ];

    for (const v of variations) {
      const cleanSlug = v
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      
      if (!this.existingSlugs.has(cleanSlug)) {
        return cleanSlug;
      }
    }

    // Dynamic timestamp fallback with semantic token
    const randomSuffix = Math.floor(Math.random() * 900 + 100);
    return `${baseSlug}-${randomSuffix}`;
  }

  generateRealisticTimeJitter() {
    // Generate realistic human publication timestamp with jitter
    const now = new Date();
    // Randomize hour between 08:00 and 22:00 CST
    const jitterHours = Math.floor(Math.random() * 14) + 8;
    const jitterMinutes = Math.floor(Math.random() * 59);
    const jitterSeconds = Math.floor(Math.random() * 59);
    
    now.setHours(jitterHours, jitterMinutes, jitterSeconds, 0);
    return now;
  }
}

// 3. DeepSeek API Client
async function requestDeepSeek(messages, apiKey) {
  const payload = JSON.stringify({
    model: 'deepseek-chat',
    messages,
    temperature: 0.65,
    max_tokens: 8192,
    stream: false
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.deepseek.com',
      port: 443,
      path: '/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices[0]?.message?.content;
            if (!content) {
              reject(new Error('Empty content returned from DeepSeek API.'));
            } else {
              resolve(content);
            }
          } catch (e) {
            reject(new Error(`Failed to parse DeepSeek response: ${e.message}`));
          }
        } else {
          reject(new Error(`DeepSeek API Error (HTTP ${res.statusCode}): ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// 4. Main Generation & Publishing Flow
async function main() {
  console.log('====================================================');
  console.log('🚀 jichangzhinan.co SEO/GEO Matrix Auto-Publisher');
  console.log('====================================================');

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    console.error('❌ Error: DEEPSEEK_API_KEY environment variable is missing.');
    console.error('Please configure DEEPSEEK_API_KEY in GitHub Repository Secrets.');
    process.exit(1);
  }

  const postsDir = path.join(rootDir, 'src', 'content', 'posts');
  if (!fs.existsSync(postsDir)) {
    fs.mkdirSync(postsDir, { recursive: true });
  }

  // Read existing article slugs & metadata
  const existingFiles = fs.readdirSync(postsDir).filter(f => f.endsWith('.md') || f.endsWith('.mdx'));
  const existingSlugs = existingFiles.map(f => f.replace(/\.(md|mdx)$/, ''));
  console.log(`[Matrix Scan] Found ${existingSlugs.length} existing articles in knowledge base.`);

  // Anti-AI URL Optimizer
  const urlOptimizer = new AntiAiUrlOptimizer(existingSlugs);

  // Select an appropriate pillar and topic with low duplication
  const flattenedTopics = [];
  MATRIX_PILLARS.forEach(p => {
    p.topics.forEach(t => {
      flattenedTopics.push({
        ...t,
        pillarId: p.pillarId,
        category: p.category,
        categoryName: p.categoryName,
        difficulty: p.difficulty
      });
    });
  });

  // Filter topics whose slugBase is not yet published
  let availableTopics = flattenedTopics.filter(t => !existingSlugs.some(s => s.includes(t.slugBase)));
  if (availableTopics.length === 0) {
    console.log('[Matrix Notice] All base seed topics covered, generating an advanced sub-branch...');
    availableTopics = flattenedTopics;
  }

  // Pick random topic from available
  const selectedTopic = availableTopics[Math.floor(Math.random() * availableTopics.length)];
  const articleSlug = urlOptimizer.generateHumanSlug(selectedTopic.slugBase, selectedTopic.keywords);
  const pubDate = urlOptimizer.generateRealisticTimeJitter();

  console.log(`[Target Topic] ${selectedTopic.seedTitle}`);
  console.log(`[Target Slug]  ${articleSlug}`);
  console.log(`[Category]     ${selectedTopic.category} (${selectedTopic.categoryName})`);

  // Pick 3-4 existing posts for realistic cross-linking
  const relatedCandidates = existingSlugs.filter(s => s !== articleSlug);
  const shuffledRelated = relatedCandidates.sort(() => 0.5 - Math.random()).slice(0, 4);

  // Construct DeepSeek Prompt with Strict Anti-AI & Human Writing Constraints
  const systemPrompt = `你是一名拥有 15 年一线网络工程经验的资深网络协议架构师、网络安全极客兼高级技术专栏作家。
你正在为权威技术知识库《机场指南》(jichangzhinan.co) 撰写万字级深度硬核技术文章。

【核心文风与防 AI 机械识别铁律（最高优先级）】：
1. 彻底摒弃一切模型腔和套话。严禁出现以下词汇和句式：
   - 严禁出现：“总而言之”、“首先、其次、最后”、“综上所述”、“值得注意的是”、“正如前文所述”、“在当今数字化时代”、“毫无疑问”、“显而易见”。
   - 严禁出现空洞的总结段：“希望本文能为您提供帮助”、“让我们拭目以待”。
2. 必须具备“活人感与技术专家的实战说话位置”：
   - 说话像一个在终端黑底绿字前抓过包、调过内核参数、吃过运营商限速亏的真实工程师。
   - 给出真实明确的技术判断，讲清楚每一个技术决定的代价与权衡（Trade-offs）。
   - 必须提供真实的具体参数，如具体的 MTU 数值（1280、1420）、丢包率、延迟 RTT 毫秒、端口范围、RFC 标准编号（RFC 8446 TLS 1.3、RFC 9000 QUIC 等）。
3. 必须包含大量真实可运行的生产级配置代码块：
   - 包含完整的 YAML（Clash Verge Rev / Mihomo）、JSON（Sing-box）、Shell 命令、iptables/nftables 规则、Docker Compose 等。
   - 包含高质量的 ASCII 网络拓扑图或时序流向图，展示数据包流动路径。
4. GEO（生成式引擎优化）核心原则：
   - 针对 Perplexity、SearchGPT、Bing Copilot 等 AI 搜索引擎进行源头引用优化。
   - 提供直接、断言式的权威定义段落（便于 AI 抓取为 Direct Answer）。
   - 包含详尽的数据对比表格（参数、协议、吞吐、适用场景）。
5. 篇幅与结构：
   - 全文篇幅极其详实硬核，字数必须达到深度技术长文标准（5000 ~ 8000+ 汉字）。
   - 结构分为 5~6 个大模块，层层递进，直击技术痛点与解决实操。`;

  const userPrompt = `请为以下主题撰写完整的万字级技术专题长文，并严格输出合规的 Astro Markdown 格式：

【目标主题】：${selectedTopic.seedTitle}
【分类类别】：${selectedTopic.category} (${selectedTopic.categoryName})
【目标 Slug】：${articleSlug}
【技术关键词】：${selectedTopic.keywords.join(', ')}
【参考关联文章】：${shuffledRelated.join(', ')}

【Frontmatter 格式要求（严格输出在文件最顶部）】：
---
title: "文章标题（吸引人、专业严谨、包含核心技术词）"
description: "深度元描述（100-140字，点明核心技术痛点、解决机制与实操价值）"
pubDate: ${pubDate.toISOString().split('T')[0]}
updatedDate: ${pubDate.toISOString().split('T')[0]}
category: "${selectedTopic.category}"
categoryName: "${selectedTopic.categoryName}"
tags: ${JSON.stringify(selectedTopic.keywords)}
author: "机场指南编辑部"
featured: false
draft: false
difficulty: "${selectedTopic.difficulty}"
readingTime: "22 MIN READ"
badge: "DEEP DIVE"
related: ${JSON.stringify(shuffledRelated)}
keyProblems:
  - "核心痛点 1（具体的技术阻碍与错误代码）"
  - "核心机制 2（网络传输层或内核层原理解析）"
  - "实操方案 3（配置参数与拓扑落地）"
  - "验证审计 4（抓包测试与防泄漏校验）"
faq:
  - q: "核心高频问题 1？"
    a: "详尽解答 1（直截了当，包含原理与具体应对方案）"
  - q: "核心高频问题 2？"
    a: "详尽解答 2（直截了当，包含原理与具体应对方案）"
---

【正文架构指引】：
## 01. 现实痛点与底层机理解构（必须深入到 TCP/UDP、TLS 握手、IP 属性与风控评分）
## 02. 网络拓扑与核心交互设计（必须画出 ASCII 架构图与数据包走线）
## 03. 生产级客户端与网关配置实战（必须提供详细完整的 YAML / JSON 配置并逐行注解）
## 04. 吞吐性能、高丢包对抗与基准压测对比（必须包含参数对比 Markdown 表格）
## 05. 异常诊断、DNS / IP 泄漏审计与安全自检清单（必须提供排错排查命令与校验方法）

直接输出完整的 Markdown 文件内容，不要输出任何多余的开场白或包装说明。`;

  console.log('[DeepSeek AI] Requesting generation from deepseek-chat...');
  const startTime = Date.now();
  
  const generatedMarkdown = await requestDeepSeek([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ], apiKey);

  console.log(`[DeepSeek AI] Response received in ${((Date.now() - startTime) / 1000).toFixed(1)}s.`);

  // Clean markdown delimiters if wrapped in ```markdown ... ```
  let cleanContent = generatedMarkdown.trim();
  if (cleanContent.startsWith('```markdown')) {
    cleanContent = cleanContent.slice(11);
  } else if (cleanContent.startsWith('```')) {
    cleanContent = cleanContent.slice(3);
  }
  if (cleanContent.endsWith('```')) {
    cleanContent = cleanContent.slice(0, -3);
  }
  cleanContent = cleanContent.trim();

  // Validate frontmatter structure
  if (!cleanContent.startsWith('---')) {
    throw new Error('Generated content does not have a valid YAML frontmatter boundary (---).');
  }

  // Calculate dynamic reading time based on generated characters
  const cnChars = (cleanContent.match(/[\u4e00-\u9fa5]/g) || []).length;
  const realisticReadingTime = `${Math.max(8, Math.ceil(cnChars / 220))} MIN READ`;
  cleanContent = cleanContent.replace(/readingTime:\s*['"].*?['"]/, `readingTime: "${realisticReadingTime}"`);

  // Write new post file
  const targetFilePath = path.join(postsDir, `${articleSlug}.md`);
  fs.writeFileSync(targetFilePath, cleanContent, 'utf8');
  console.log(`[Article Saved] Successfully written to: ${targetFilePath} (${cnChars} Chinese characters)`);

  // Update scripts/indexnow.js URL list
  const indexnowPath = path.join(rootDir, 'scripts', 'indexnow.js');
  if (fs.existsSync(indexnowPath)) {
    console.log('[IndexNow Sync] Updating scripts/indexnow.js canonical list...');
    let indexnowCode = fs.readFileSync(indexnowPath, 'utf8');
    const newCanonical = `https://\${HOST}/articles/${articleSlug}/`;
    if (!indexnowCode.includes(newCanonical)) {
      // indexnow dynamically reads all markdown files in src/content/posts!
      // So new files are automatically included in postFiles.forEach!
      console.log('[IndexNow Sync] Automatically covered by dynamic readdirSync.');
    }
  }

  // Update site.ts article counter if appropriate
  const siteConfigPath = path.join(rootDir, 'src', 'config', 'site.ts');
  if (fs.existsSync(siteConfigPath)) {
    let siteCode = fs.readFileSync(siteConfigPath, 'utf8');
    const newCount = existingSlugs.length + 1;
    siteCode = siteCode.replace(/articlesCountText:\s*['"]\d+\+?['"]/, `articlesCountText: '${newCount}+'`);
    fs.writeFileSync(siteConfigPath, siteCode, 'utf8');
    console.log(`[Site Config] Updated article counter to ${newCount}+.`);
  }

  // Export newly generated article slug for GitHub Actions workflow output
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `slug=${articleSlug}\n`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `title=${selectedTopic.seedTitle}\n`);
  }

  console.log('====================================================');
  console.log('✅ Auto-publishing matrix step complete!');
  console.log('====================================================');
}

main().catch(err => {
  console.error('❌ Fatal error in auto-publishing script:', err);
  process.exit(1);
});
