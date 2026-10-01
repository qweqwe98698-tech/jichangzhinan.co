export interface SiteConfig {
  name: string;
  shortName: string;
  themeName: string;
  themeConcept: string;
  domain: string;
  url: string;
  description: string;
  author: string;
  logo: {
    text: string;
    badge: string;
  };
  navigation: {
    name: string;
    href: string;
    badge?: string;
  }[];
  social: {
    name: string;
    href: string;
    icon: string;
  }[];
  stats: {
    articlesCountText?: string;
    topicsCountText?: string;
  };
}

export const siteConfig: SiteConfig = {
  name: '机场指南',
  shortName: 'FluxGrid',
  themeName: 'FluxGrid',
  themeConcept: '流光轨迹',
  domain: 'jichangzhinan.co',
  url: 'https://jichangzhinan.co',
  description: '2026 最新优质机场推荐与代理导航。聚焦 IPLC 纯专线机场评测、高性价比便宜机场、按量计费不限时套餐、ChatGPT/Claude 专属节点与 Netflix 4K 流媒体解锁。兼具数字杂志质感与微型数据终端。',
  author: '机场指南编辑部',
  logo: {
    text: 'FLUX',
    badge: '2026 机场导航'
  },
  navigation: [
    { name: 'Explore', href: '/' },
    { name: '机场推荐', href: '/airports/', badge: 'TOP 2026' },
    { name: 'Guides', href: '/guides/' },
    { name: 'Topics', href: '/topics/' },
    { name: 'Tools', href: '/tools/' },
    { name: 'Archive', href: '/archive/' },
    { name: 'About', href: '/about/' }
  ],
  social: [
    { name: 'RSS', href: '/rss.xml', icon: 'rss' },
    { name: 'Telegram', href: 'https://t.me/jichangzhinan', icon: 'telegram' },
    { name: 'GitHub', href: 'https://github.com', icon: 'github' }
  ],
  stats: {
    articlesCountText: '41+',
    topicsCountText: '7+'
  }
};
