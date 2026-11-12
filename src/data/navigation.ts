export interface NavLink {
  name: string;
  href: string;
  badge?: string;
}

export interface FooterSection {
  title: string;
  links: NavLink[];
}

export const headerNavLinks: NavLink[] = [
  { name: '首页', href: '/' },
  { name: '机场推荐', href: '/airports/', badge: '2026' },
  { name: '实战教程', href: '/guides/' },
  { name: '知识专题', href: '/topics/' },
  { name: '工具箱', href: '/tools/' },
  { name: '文章归档', href: '/archive/' },
  { name: '关于本站', href: '/about/' }
];

export const footerSections: FooterSection[] = [
  {
    title: '机场推荐与导航',
    links: [
      { name: '2026 优质机场总榜', href: '/airports/' },
      { name: 'IPLC 纯专线机场评测', href: '/articles/iplc-iepl-dedicated-line-airports/' },
      { name: '高性价比机场推荐', href: '/articles/high-value-cost-effective-airports/' },
      { name: '便宜机场入门精选', href: '/articles/cheap-budget-airports-recommendation/' },
      { name: '按量计费不限时机场', href: '/articles/on-demand-pay-as-you-go-airports/' },
      { name: '机场避坑与防骗指南', href: '/topics/security/' }
    ]
  },
  {
    title: '场景方案',
    links: [
      { name: 'ChatGPT / Claude 纯净 IP', href: '/articles/best-airports-for-chatgpt-claude/' },
      { name: 'Netflix 4K 流媒体解锁', href: '/articles/netflix-disney-streaming-airports/' },
      { name: 'TikTok 跨境电商独立IP', href: '/articles/tiktok-cross-border-ecommerce-airports/' },
      { name: '外服游戏低延迟专线', href: '/articles/gaming-low-latency-airports/' }
    ]
  },
  {
    title: '客户端配置',
    links: [
      { name: 'Clash Verge Rev 教程', href: '/articles/clash-verge-rev-guide/' },
      { name: 'Sing-box 全景配置', href: '/articles/sing-box-universal-config/' },
      { name: 'Loon iOS 插件工作流', href: '/articles/loon-ios-complete-workflow/' },
      { name: 'Shadowrocket 小火箭实操', href: '/articles/shadowrocket-ios-setup/' },
      { name: 'OpenWrt 旁路由网关', href: '/articles/openwrt-transparent-gateway-master/' }
    ]
  },
  {
    title: '关于与工具',
    links: [
      { name: '关于机场指南', href: '/about/' },
      { name: '协议支持查询矩阵', href: '/tools/#protocol-matrix' },
      { name: 'Fake-IP 计算器', href: '/tools/#subnet-calculator' },
      { name: '订阅规则转换器', href: '/tools/#rule-converter' },
      { name: 'RSS 订阅源', href: '/rss.xml' }
    ]
  }
];

export const trendingPicks = [
  {
    rank: '01',
    title: '2026 稳定好用机场推荐：42 品牌档案与 18 家实测横评天梯榜',
    slug: '2026-best-airports-ranking-guide',
    tag: '总榜推荐',
    readTime: '18 MIN'
  },
  {
    rank: '02',
    title: '2026 高性价比机场推荐榜单：15–20 元 IEPL 纯专线单 GB 实测',
    slug: 'high-value-cost-effective-airports',
    tag: '性价比精选',
    readTime: '11 MIN'
  },
  {
    rank: '03',
    title: '2026 便宜机场推荐指南：月付 15 元内 & 年付折 7–8 元实测',
    slug: 'cheap-budget-airports-recommendation',
    tag: '便宜入门',
    readTime: '14 MIN'
  },
  {
    rank: '04',
    title: '2026 纯净 IP 机场推荐：ChatGPT / Claude 防封号原生节点实测',
    slug: 'best-airports-for-chatgpt-claude',
    tag: '纯净 IP',
    readTime: '17 MIN'
  },
  {
    rank: '05',
    title: '2026 翻墙机场与梯子新手入门全攻略：选购与三步上线教程',
    slug: 'airport-ladder-beginner-selection-guide',
    tag: '新手必读',
    readTime: '10 MIN'
  }
];
