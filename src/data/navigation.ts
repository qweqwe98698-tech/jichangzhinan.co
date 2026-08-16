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
  { name: 'Explore', href: '/' },
  { name: '机场推荐', href: '/airports/', badge: '2026' },
  { name: 'Guides', href: '/guides/' },
  { name: 'Topics', href: '/topics/' },
  { name: 'Tools', href: '/tools/' },
  { name: 'Archive', href: '/archive/' },
  { name: 'About', href: '/about/' }
];

export const footerSections: FooterSection[] = [
  {
    title: '机场推荐与导航',
    links: [
      { name: '2026 优质机场总榜', href: '/airports/' },
      { name: 'IPLC 纯专线机场评测', href: '/topics/lines/' },
      { name: '高性价比便宜机场', href: '/topics/recommendations/' },
      { name: '按量计费不限时机场', href: '/topics/recommendations/' },
      { name: '机场避坑与防骗指南', href: '/topics/security/' }
    ]
  },
  {
    title: '场景方案',
    links: [
      { name: 'ChatGPT / Claude 专用', href: '/topics/scenarios/' },
      { name: 'Netflix 4K 流媒体解锁', href: '/topics/scenarios/' },
      { name: 'TikTok 跨境电商独立IP', href: '/topics/scenarios/' },
      { name: '外服游戏低延迟专线', href: '/topics/scenarios/' }
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
    title: '2026 稳定好用机场推荐：16 家主流机场实测横评与天梯榜',
    slug: '2026-best-airports-ranking-guide',
    tag: 'TOP RANKING',
    readTime: '18 MIN'
  },
  {
    rank: '02',
    title: 'IPLC / IEPL 纯专线机场解析：晚高峰零丢包原理与推荐',
    slug: 'iplc-iepl-dedicated-line-airports',
    tag: 'IPLC 专线',
    readTime: '16 MIN'
  },
  {
    rank: '03',
    title: '2026 高性价比便宜机场推荐：月付 10 元内平价机场精选',
    slug: 'cheap-budget-airports-recommendation',
    tag: '平价精选',
    readTime: '15 MIN'
  },
  {
    rank: '04',
    title: 'ChatGPT & Claude 专属机场推荐：原生纯净 IP 节点精选',
    slug: 'best-airports-for-chatgpt-claude',
    tag: 'AI 专精',
    readTime: '17 MIN'
  },
  {
    rank: '05',
    title: 'Clash Verge Rev 从入门到精通完整实战指南',
    slug: 'clash-verge-rev-guide',
    tag: '客户端必看',
    readTime: '18 MIN'
  }
];
