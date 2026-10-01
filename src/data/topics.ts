export interface TopicMeta {
  id: string;
  name: string;
  slug: string;
  enName: string;
  badge: string;
  description: string;
  icon: string;
  featured: boolean;
  order: number;
  learningPath?: string[];
  faqs?: { q: string; a: string }[];
}

export const topicsData: TopicMeta[] = [
  {
    id: 'recommendations',
    name: '机场推荐与评测',
    slug: 'recommendations',
    enName: 'TOP PICKS',
    badge: '2026 RANKING',
    description: '2026 最新主流机场全景横评：涵盖顶级 IPLC 专线、高性价比便宜机场、按量计费不限时套餐与综合天梯榜。',
    icon: 'award',
    featured: true,
    order: 1,
    learningPath: [
      '2026 优质机场综合评测榜单与选型指南',
      '月付 10 元以内高性价比平价机场横评',
      '按量计费不限时机场推荐与备用方案',
      '全节点 4K/8K 流媒体与 ChatGPT 原生解锁测试'
    ],
    faqs: [
      {
        q: '2026 年选择机场最重要的指标是什么？',
        a: '首看线路类型（纯 IPLC 专线优于普通 BGP 中继，公网直连最差）；次看晚高峰稳定性与丢包率；最后看流媒体与 AI 服务解锁支持以及是否提供按月灵活订阅。'
      },
      {
        q: '为什么不建议一次性购买不知名小机场的年付套餐？',
        a: '小机场存在较高的跑路风险或上游线路被拔线跑路的可能。建议初次使用优先月付或选择老牌运营 3 年以上的成熟服务商。'
      }
    ]
  },
  {
    id: 'lines',
    name: '专线与网络线路',
    slug: 'lines',
    enName: 'LINES & IPLC',
    badge: 'NETWORK TECH',
    description: '深度剖析 IPLC 国际私有专线、IEPL 专线、多线 BGP 智能中继与 Hysteria 2 暴力加速线路。',
    icon: 'git-commit',
    featured: true,
    order: 2,
    learningPath: [
      'IPLC 纯专线与普通 BGP 中继的物理拓扑差异',
      'Hysteria 2 动态端口跳跃与抗晚高峰 QoS 限速',
      '真假 IPLC 专线鉴别与 Traceroute 拓扑自检',
      '专线节点倍率计算与流量性价比分析'
    ],
    faqs: [
      {
        q: '什么是真正的 IPLC 专线？',
        a: 'IPLC（International Private Leased Circuit）是跨国点对点物理内网专线。数据不经过公网 GFW 审查，直接在境内机房接入专线隧道直达境外机房，因此晚高峰 0 丢包、0 审查且延迟极度稳定。'
      }
    ]
  },
  {
    id: 'scenarios',
    name: '场景专用方案',
    slug: 'scenarios',
    enName: 'SCENARIOS',
    badge: 'UNBLOCKING',
    description: '针对 ChatGPT/Claude AI 生产力、Netflix 4K 流媒体跨区、外贸独立住宅 IP 与外服低延迟游戏的专属分流方案。',
    icon: 'zap',
    featured: true,
    order: 3,
    learningPath: [
      'ChatGPT / Claude 专属纯净 IP 节点防封策略',
      'Netflix / Disney+ 4K HDR 跨区原生解锁配置',
      '跨境电商与 TikTok 直播独享静态住宅 IP 隔离',
      'Steam / PS5 外服竞技游戏低延迟专线加速'
    ],
    faqs: [
      {
        q: '为什么访问 OpenAI 和 Claude 经常被封号或提示 Access Denied？',
        a: '因为绝大多数机房公共代理 IP 都被 AI 平台列入了风控黑名单。需要选择配备了原生家庭住宅 IP 或专为 AI 优化了干净出口的机场节点。'
      }
    ]
  },
  {
    id: 'clients',
    name: '客户端教程',
    slug: 'clients',
    enName: 'CLIENTS',
    badge: 'CORE GUIDES',
    description: '涵盖 Windows、macOS、iOS、Android 及 Linux 各平台主流代理软件（Clash、Sing-box、Loon、Surge、小火箭）的配置全解。',
    icon: 'monitor',
    featured: true,
    order: 4,
    learningPath: [
      'Clash Verge Rev 核心配置与 Tun 模式',
      'Sing-box 规则集与通用客户端部署',
      'Shadowrocket iOS 策略组与模块实操',
      'Loon / Surge 高阶分流与抓包调试'
    ],
    faqs: [
      {
        q: 'Tun 模式与系统代理有什么区别？',
        a: '系统代理仅对遵循系统代理设置的浏览器等生效；Tun 模式创建虚拟网卡，接管系统层所有 TCP/UDP 流量，使终端、游戏、Docker 等底层程序均可走规则分流。'
      }
    ]
  },
  {
    id: 'routing',
    name: '规则分流与优化',
    slug: 'routing',
    enName: 'ROUTING',
    badge: 'OPTIMIZATION',
    description: '软路由旁路由透明网关、GeoIP/GeoSite 规则集设计、DNS 泄漏防范与分流性能调优。',
    icon: 'git-merge',
    featured: true,
    order: 5,
    learningPath: [
      'OpenWrt / iStoreOS 旁路由透明网关部署',
      'MosDNS 国内外域名分流与低延迟解析',
      '国内/国外流量白名单与直连策略',
      '大体积规则集的内存占用优化'
    ],
    faqs: [
      {
        q: '如何检测自己是否存在 DNS 泄漏？',
        a: '访问 browserleaks.com/dns 进行扩展测试，如果检测到的 DNS 服务器包含国内运营商 IP，则表明存在 DNS 泄漏。'
      }
    ]
  },
  {
    id: 'security',
    name: '避坑与安全防骗',
    slug: 'security',
    enName: 'SECURITY',
    badge: 'HARDENING',
    description: '机场跑路预警机制、真假专线防骗揭秘、TLS 指纹伪装与数字隐私安全加固。',
    icon: 'shield',
    featured: false,
    order: 6,
    learningPath: [
      '识别高危机场跑路的 5 个典型特征',
      '倍率刺客与虚标带宽套路防范',
      'DoH / DoT 安全 DNS 链条配置',
      '跨平台客户端安全审计'
    ],
    faqs: [
      {
        q: '如何识别可能跑路的“跑路机”？',
        a: '警惕开业不足 3 个月却推出超低价多年付套餐、无官方 Telegram 交流群或禁言、频繁更换支付通道以及客服长期失联的机场。'
      }
    ]
  },
  {
    id: 'beginner',
    name: '新手入门与排错',
    slug: 'beginner',
    enName: 'BEGINNER & FAQ',
    badge: 'GETTING STARTED',
    description: '面向新手的科学网络入门科普、免费节点安全风险防范、全平台常见报错与节点超时排查全百科。',
    icon: 'help-circle',
    featured: true,
    order: 7,
    learningPath: [
      '科学上网基础原理与新手避坑第一课',
      '免费公共节点风险与安全替代方案',
      '节点超时与开了代理上不了网 20 大高频排错',
      '各客户端基础配置与分流模式选择'
    ],
    faqs: [
      {
        q: '为什么刚接触科学上网不建议随便使用网上免费节点？',
        a: '公共免费节点大多为机房扫描肉鸡或蜜罐服务器，存在严重的中间人监听风险，可能窃取您的账号凭证并植入恶意重定向。'
      },
      {
        q: '开了代理之后所有网页都打不开怎么办？',
        a: '首先检查客户端是否正常获取了节点延迟并开启系统代理或 TUN 模式；其次检查系统时间是否精准同步（时间误差超过 90 秒会导致 TLS 握手失败）；最后排查第三方杀毒软件是否拦截了核心驱动。'
      }
    ]
  }
];
