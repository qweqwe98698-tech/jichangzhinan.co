export interface ClusterLink {
  title: string;
  href: string;
  tag: string;
  intent?: 'commercial' | 'informational' | 'tool';
}

export interface TopicClusterMeta {
  slug: string;
  name: string;
  pillarTitle: string;
  targetKeywords: string[];
  coreAnswer: string;
  learningLinks: ClusterLink[];
  relatedTopics: string[];
  ctaText: string;
  ctaHref: string;
}

export const topicClusters: Record<string, TopicClusterMeta> = {
  recommendations: {
    slug: 'recommendations',
    name: '机场推荐与选购',
    pillarTitle: '2026 机场推荐、高性价比专线与便宜入门评测集群',
    targetKeywords: ['机场推荐', '性价比 机场', '便宜机场', '好用的机场', '翻墙机场'],
    coreAnswer:
      '2026 年选机场应先明确预算与用途：日常主力推荐 14.9–20 元/月的 IEPL/IPLC 专线（兼顾晚高峰 4K 与稳定在线），低预算备用可选 8–15 元/月或按量计费不限时套餐，重度 AI/跨境用户优先选择原生纯净 IP 专线。',
    learningLinks: [
      {
        title: '2026 优质机场推荐总榜：42 品牌目录与 18 家实测排名指南',
        href: '/articles/2026-best-airports-ranking-guide/',
        tag: '核心总榜',
        intent: 'commercial'
      },
      {
        title: '2026 高性价比机场推荐：15-20 元 IEPL 专线单 GB 成本实测',
        href: '/articles/high-value-cost-effective-airports/',
        tag: '性价比专刊',
        intent: 'commercial'
      },
      {
        title: '2026 便宜机场入门精选：月付 15 元内 & 半年付低预算实测',
        href: '/articles/cheap-budget-airports-recommendation/',
        tag: '便宜入门',
        intent: 'commercial'
      },
      {
        title: '2026 按量计费不限时机场推荐：低频备用不浪费流量',
        href: '/articles/on-demand-pay-as-you-go-airports/',
        tag: '按量不限时',
        intent: 'commercial'
      },
      {
        title: '42 家机场多维筛选与 24 张实测图库终端',
        href: '/airports/',
        tag: '交互比价',
        intent: 'tool'
      }
    ],
    relatedTopics: ['lines', 'scenarios', 'beginner', 'security'],
    ctaText: '打开 42 家机场参数对比与单 GB 成本计算器',
    ctaHref: '/airports/'
  },
  lines: {
    slug: 'lines',
    name: '专线与网络线路',
    pillarTitle: 'IPLC/IEPL 内网专线、BGP 中转与真假专线取证集群',
    targetKeywords: ['IPLC机场', 'IEPL专线机场', '真假IPLC鉴别', 'Hysteria2机场'],
    coreAnswer:
      '真 IPLC/IEPL 跨境内网专线通过运营商点对点传输，完全避开公网国际出口拥塞，晚高峰丢包率通常低于 0.5%；而 BGP 公网中转与直连价格更低但受骨干网波动影响明显，购买前可通过入口 IP 归属与 Traceroute AS 跳数鉴别真伪。',
    learningLinks: [
      {
        title: '2026 真 IPLC 与 IEPL 纯专线机场深度科普与推荐',
        href: '/articles/iplc-iepl-dedicated-line-airports/',
        tag: '专线总览',
        intent: 'commercial'
      },
      {
        title: '真假 IPLC/IEPL 专线取证指南：Traceroute 与 AS 跳数核验实战',
        href: '/articles/real-iplc-iepl-forensic-traceroute-as-hop-verification/',
        tag: '真伪鉴别',
        intent: 'informational'
      },
      {
        title: 'Hysteria2 高速大带宽机场与冷门端口优选评测',
        href: '/articles/hysteria2-high-speed-airports/',
        tag: '大带宽测评',
        intent: 'commercial'
      },
      {
        title: '查看各机场线路类型与实测测速图库',
        href: '/airports/#speedtest-gallery',
        tag: '实测图库',
        intent: 'tool'
      }
    ],
    relatedTopics: ['recommendations', 'protocols', 'security'],
    ctaText: '使用页面内 真/伪 IPLC 专线鉴伪核验工具',
    ctaHref: '/airports/#iplc-verifier'
  },
  scenarios: {
    slug: 'scenarios',
    name: '场景化选型方案',
    pillarTitle: '纯净 IP (ChatGPT/Claude)、Netflix 流媒体、TikTok 与游戏场景集群',
    targetKeywords: ['纯净ip机场', 'ChatGPT机场', '流媒体解锁机场', 'TikTok专线机场'],
    coreAnswer:
      'ChatGPT、Claude 与 TikTok 账号高度依赖出口 IP 纯净度与地区一致性，建议选用提供原生家宽或低欺诈分落地的机场并配合策略组锁定地区；Netflix/Disney+ 4K 与外服游戏则重点考察多区 BGP 流媒体解锁率与 UDP/Full-Cone NAT 表现。',
    learningLinks: [
      {
        title: '纯净 IP 机场推荐：ChatGPT Plus / Claude 防封号原生节点实测',
        href: '/articles/best-airports-for-chatgpt-claude/',
        tag: '纯净 IP / AI',
        intent: 'commercial'
      },
      {
        title: 'AI 生产力场景住宅 IP 防风控架构与独立网关设计',
        href: '/articles/ai-productivity-residential-ip-anti-fraud-architecture/',
        tag: '风控架构',
        intent: 'informational'
      },
      {
        title: 'SearchGPT 与 Perplexity 实时检索节点风控审计指南',
        href: '/articles/searchgpt-perplexity-realtime-crawling-node-audit/',
        tag: 'AI 检索审计',
        intent: 'informational'
      },
      {
        title: '2026 Netflix / Disney+ 4K 流媒体全解锁机场推荐',
        href: '/articles/netflix-disney-streaming-airports/',
        tag: '流媒体 4K',
        intent: 'commercial'
      },
      {
        title: 'TikTok 与跨境电商独立纯净 IP 防关联选购方案',
        href: '/articles/tiktok-cross-border-ecommerce-airports/',
        tag: '跨境电商',
        intent: 'commercial'
      },
      {
        title: '低延迟游戏加速机场：UDP 转发与日韩港低抖动实测',
        href: '/articles/gaming-low-latency-airports/',
        tag: '游戏专线',
        intent: 'commercial'
      }
    ],
    relatedTopics: ['recommendations', 'routing', 'security'],
    ctaText: '按“ChatGPT / 流媒体 / 跨境”筛选实测机场',
    ctaHref: '/airports/'
  },
  clients: {
    slug: 'clients',
    name: '全平台客户端实战',
    pillarTitle: 'Clash Verge Rev、Shadowrocket、v2rayN、Sing-box 与软路由教程集群',
    targetKeywords: ['Clash Verge教程', '小火箭配置', 'Mihomo Party', 'OpenWrt旁路由'],
    coreAnswer:
      'Windows 与 macOS 桌面端推荐使用支持 Mihomo 内核的 Clash Verge Rev 或 Mihomo Party；iOS 端新手首选 Shadowrocket（小火箭），高阶自动化推荐 Loon 与 Surge；软路由及家庭网关优先部署 Sing-box 或 OpenWrt + MosDNS 方案。',
    learningLinks: [
      {
        title: 'Clash Verge Rev 全平台安装与 TUN 全局增强模式指南',
        href: '/articles/clash-verge-rev-guide/',
        tag: 'Win/Mac 主力',
        intent: 'informational'
      },
      {
        title: 'Clash Verge Rev 进阶：Mihomo Scripts 覆写与分流调优',
        href: '/articles/clash-verge-rev-advanced-scripts-mihomo-meta-overrides/',
        tag: '进阶覆写',
        intent: 'informational'
      },
      {
        title: 'Mihomo Party 桌面端极简部署与内核调优实战',
        href: '/articles/mihomo-party-desktop/',
        tag: '轻量桌面',
        intent: 'informational'
      },
      {
        title: 'Shadowrocket (小火箭) iOS 导入订阅与分流配置教程',
        href: '/articles/shadowrocket-ios-setup/',
        tag: 'iOS 入门',
        intent: 'informational'
      },
      {
        title: 'v2rayN Windows 客户端全功能指南与多内核切换',
        href: '/articles/v2rayn-windows-complete-guide/',
        tag: 'Windows',
        intent: 'informational'
      },
      {
        title: 'Sing-box 跨平台通用 JSON 配置与规则集迁移',
        href: '/articles/sing-box-universal-config/',
        tag: '现代内核',
        intent: 'informational'
      },
      {
        title: 'OpenWrt / iStoreOS 旁路由 MosDNS 与 Fake-IP 实战',
        href: '/articles/openwrt-istoreos-bypass-gateway-mosdns-fakeip-mastery/',
        tag: '软路由',
        intent: 'informational'
      },
      {
        title: 'Surge 5 与 Loon iOS MitM 模块与插件编写实战',
        href: '/articles/surge-loon-ios-mitm-scripts-plugin-workflow/',
        tag: 'iOS 进阶',
        intent: 'informational'
      }
    ],
    relatedTopics: ['beginner', 'routing', 'protocols'],
    ctaText: '打开订阅规则转换器与子网计算工具',
    ctaHref: '/tools/'
  },
  routing: {
    slug: 'routing',
    name: '智能分流与 DNS',
    pillarTitle: '分流规则集、Subconverter 聚合、MosDNS 与防 DNS 泄漏集群',
    targetKeywords: ['Clash分流规则', 'Subconverter转换', 'MosDNS配置', '防DNS泄漏'],
    coreAnswer:
      '科学分流与防泄漏是提升速度、节省专线流量的关键：推荐使用 GeoSite/Rule-Set 替代庞大域名清单，开启加密 DoH/DoQ 或 Fake-IP 模式拦截本地 DNS 请求，并用 Subconverter 清洗冗余节点。',
    learningLinks: [
      {
        title: '分流规则集优化实战：ACL4SSR 与 MetaCubeX Rule-Set 解析',
        href: '/articles/rule-sets-optimization/',
        tag: '规则核心',
        intent: 'informational'
      },
      {
        title: 'Subconverter 订阅转换与多机场节点整合规范教程',
        href: '/articles/subconverter-rule-merge/',
        tag: '订阅转换',
        intent: 'informational'
      },
      {
        title: 'MosDNS 智能国内外分流解析与零污染 DNS 架构',
        href: '/articles/mosdns-smart-resolver/',
        tag: 'DNS 分流',
        intent: 'informational'
      },
      {
        title: '代理防 DNS 泄漏完整检查清单与浏览器 DoH 设置',
        href: '/articles/anti-dns-leak-guide/',
        tag: '防泄漏核查',
        intent: 'informational'
      },
      {
        title: 'Fake-IP 网段与 Subconverter 在线配置生成器',
        href: '/tools/',
        tag: '在线工具',
        intent: 'tool'
      }
    ],
    relatedTopics: ['clients', 'security', 'scenarios'],
    ctaText: '使用在线 Subconverter 与 Fake-IP 计算器',
    ctaHref: '/tools/'
  },
  security: {
    slug: 'security',
    name: '避坑安全与反侦测',
    pillarTitle: '机场跑路避坑、免费节点风险、WebRTC 泄漏与指纹防护集群',
    targetKeywords: ['机场避坑', '免费节点风险', 'WebRTC防泄漏', '假IPLC识破'],
    coreAnswer:
      '降低翻车概率需遵循“先月付后年付、不迷信无限流量与低价永久会员、远离来路不明免费订阅”三原则；对账号环境敏感的出海或 AI 使用者，务必排查 WebRTC、DNS 与 IPv6 泄漏并保持 UA/TLS 指纹一致。',
    learningLinks: [
      {
        title: '机场避坑与防骗指南：如何识别假 IPLC 专线与跑路前兆',
        href: '/articles/airport-scam-avoidance-and-fake-iplc/',
        tag: '防骗必看',
        intent: 'informational'
      },
      {
        title: '免费节点与公开订阅池的隐私监听与恶意注入风险',
        href: '/articles/free-nodes-subscription-and-risks/',
        tag: '安全警示',
        intent: 'informational'
      },
      {
        title: '彻底封堵 WebRTC / DNS / IPv6 泄漏的零指纹加固方案',
        href: '/articles/anti-webrtc-dns-ipv6-leak-zero-fingerprint-hardening/',
        tag: '零泄漏指南',
        intent: 'informational'
      },
      {
        title: 'uTLS 客户端指纹模拟与主动探测对抗原理',
        href: '/articles/utls-fingerprint-simulation/',
        tag: '指纹安全',
        intent: 'informational'
      }
    ],
    relatedTopics: ['recommendations', 'lines', 'routing'],
    ctaText: '查看 2026 口碑老牌稳健机场评测榜单',
    ctaHref: '/airports/'
  },
  protocols: {
    slug: 'protocols',
    name: '底层协议与原理',
    pillarTitle: 'Shadowsocks-2022、Trojan、VLESS Reality 与 Hysteria2 协议集群',
    targetKeywords: ['VLESS Reality', 'Hysteria2协议', 'Shadowsocks 2022', '代理协议对比'],
    coreAnswer:
      '专线上常见 Shadowsocks-2022 与 Trojan 以加密开销低、兼容性好取胜；公网直连推荐基于无证书伪装的 VLESS + Reality 抵御主动探测；跨海高丢包环境则可选基于 QUIC 的 Hysteria2 结合端口跳跃跑满带宽。',
    learningLinks: [
      {
        title: '主流代理协议深度对比：SS-2022、Trojan、VLESS Reality 与 Hysteria2',
        href: '/articles/network-protocols-comparison/',
        tag: '协议总览',
        intent: 'informational'
      },
      {
        title: 'VLESS + Reality 深度加固与 SNI 伪装目标挑选原则',
        href: '/articles/vless-reality-deep-hardening/',
        tag: 'Reality 加固',
        intent: 'informational'
      },
      {
        title: 'Hysteria2 BBR 拥塞控制与动态端口跳跃实战解析',
        href: '/articles/hysteria2-bbr-congestion-port-hopping-deep-dive/',
        tag: 'QUIC 调优',
        intent: 'informational'
      },
      {
        title: '协议加密性能与抗封锁特性交互式对照矩阵',
        href: '/tools/#protocol-matrix',
        tag: '协议矩阵',
        intent: 'tool'
      }
    ],
    relatedTopics: ['lines', 'clients', 'security'],
    ctaText: '查看交互式协议选型对比矩阵',
    ctaHref: '/tools/'
  },
  beginner: {
    slug: 'beginner',
    name: '新手入门与排错',
    pillarTitle: '新手买机场梯子指南、订阅导入三步走与常见故障排除集群',
    targetKeywords: ['机场梯子', '翻墙机场怎么用', '机场新手教程', '节点超时排错'],
    coreAnswer:
      '零基础新手使用机场梯子只需三步：① 选择正规稳定、支持主流客户端一键导入的机场（先买月付测试）；② 在 Windows/macOS 安装 Clash Verge Rev 或在 iOS 安装 Shadowrocket；③ 复制订阅链接导入并更新节点、开启系统代理即可访问国际网络。',
    learningLinks: [
      {
        title: '2026 新手买机场梯子全流程攻略：套餐挑选、客户端下载与上线三步曲',
        href: '/articles/airport-ladder-beginner-selection-guide/',
        tag: '新手首读',
        intent: 'informational'
      },
      {
        title: '代理新手常见断流与节点超时排错清单（系统时间 / TUN / 本地端口）',
        href: '/articles/beginner-network-troubleshooting/',
        tag: '故障排错',
        intent: 'informational'
      },
      {
        title: '订阅拉取失败、网页部分打不开与 Geo 地区异常 FAQ 合集',
        href: '/articles/proxy-troubleshooting-geo-faq/',
        tag: 'FAQ 百科',
        intent: 'informational'
      },
      {
        title: '浏览适合新手的便宜入门与高性价比机场清单',
        href: '/airports/',
        tag: '新手选机场',
        intent: 'commercial'
      }
    ],
    relatedTopics: ['recommendations', 'clients', 'security'],
    ctaText: '新手优选：查看便宜入门与高性价比专线推荐',
    ctaHref: '/articles/high-value-cost-effective-airports/'
  }
};

export function getClusterByTopic(slug: string): TopicClusterMeta | undefined {
  return topicClusters[slug];
}
