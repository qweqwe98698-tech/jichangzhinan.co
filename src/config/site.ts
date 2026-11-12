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
  description: '2026 最新优质机场推荐与科学上网专线评测导航。收录 42 家 IPLC/IEPL 纯专线、高性价比与便宜入门机场全档案（其中 18 家配有 24 张实测速度与 AI/流媒体解锁截图），附单 GB 成本计算与客户端配置教程。',
  author: '机场指南编辑部',
  logo: {
    text: 'FLUX',
    badge: '2026 机场推荐'
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
    articlesCountText: '53+',
    topicsCountText: '8'
  }
};
