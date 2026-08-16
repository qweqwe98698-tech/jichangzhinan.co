export interface ToolItem {
  id: string;
  name: string;
  slug: string;
  category: 'client' | 'converter' | 'diagnostic' | 'core' | 'router';
  description: string;
  platforms: ('Windows' | 'macOS' | 'iOS' | 'Android' | 'Linux')[];
  license: 'Open Source' | 'Proprietary' | 'Freemium';
  status: 'Active' | 'Stable' | 'Beta';
  officialUrl: string;
  githubUrl?: string;
  features: string[];
  recommended: boolean;
  version: string;
  updatedDate: string;
}

export const toolsData: ToolItem[] = [
  {
    id: 'clash-verge-rev',
    name: 'Clash Verge Rev',
    slug: 'clash-verge-rev',
    category: 'client',
    description: '基于 Tauri + React 构建的现代化跨平台 Clash 桌面客户端，内置 Mihomo 核心与智能分流引擎。',
    platforms: ['Windows', 'macOS', 'Linux'],
    license: 'Open Source',
    status: 'Active',
    officialUrl: 'https://github.com/clash-verge-rev/clash-verge-rev',
    githubUrl: 'https://github.com/clash-verge-rev/clash-verge-rev',
    features: ['内置 Mihomo 内核', 'Tun 虚拟网卡模式', '订阅脚本扩展', '轻量内存占用'],
    recommended: true,
    version: 'v2.0.3',
    updatedDate: '2026-08-15'
  },
  {
    id: 'sing-box',
    name: 'Sing-box',
    slug: 'sing-box',
    category: 'core',
    description: '下一代全能网络通用平台，支持几乎所有前沿网络协议，性能卓越，全平台通用。',
    platforms: ['Windows', 'macOS', 'iOS', 'Android', 'Linux'],
    license: 'Open Source',
    status: 'Active',
    officialUrl: 'https://sing-box.sagernet.org',
    githubUrl: 'https://github.com/SagerNet/sing-box',
    features: ['Hysteria2 / TUIC 原生支持', 'Rule-Set 二进制规则集', '极低 CPU 开销', '全平台覆盖'],
    recommended: true,
    version: 'v1.11.0',
    updatedDate: '2026-08-12'
  },
  {
    id: 'loon',
    name: 'Loon',
    slug: 'loon',
    category: 'client',
    description: 'iOS 平台新一代平衡之王，拥有最直观强大的插件市场生态与轻量级 MitM 脚本支持。',
    platforms: ['iOS'],
    license: 'Proprietary',
    status: 'Active',
    officialUrl: 'https://apps.apple.com/app/loon/id1373567447',
    features: ['一键插件生态', 'MitM 响应体改写', '分流策略组', '极简原生 UI'],
    recommended: true,
    version: 'v3.2.1',
    updatedDate: '2026-08-16'
  },
  {
    id: 'quantumult-x',
    name: 'Quantumult X',
    slug: 'quantumult-x',
    category: 'client',
    description: 'iOS 平台上极客首选的精准网络调试工具，三段式灵活架构与强大 Rewrite 规则引擎。',
    platforms: ['iOS'],
    license: 'Proprietary',
    status: 'Stable',
    officialUrl: 'https://apps.apple.com/app/quantumult-x/id1453926578',
    features: ['Rewrite 正则重写', 'Task 定时任务', '自定义图标库', '精细流量分析'],
    recommended: true,
    version: 'v1.0.33',
    updatedDate: '2026-08-10'
  },
  {
    id: 'stash',
    name: 'Stash',
    slug: 'stash',
    category: 'client',
    description: 'Apple 全生态首选 Clash 客户端，支持 iOS、iPadOS、macOS 及 tvOS (Apple TV)。',
    platforms: ['iOS', 'macOS'],
    license: 'Proprietary',
    status: 'Active',
    officialUrl: 'https://stash.ws',
    features: ['原生 Clash YAML', 'On-Demand 按需连接', 'Apple TV 支持', 'iCloud 多端同步'],
    recommended: true,
    version: 'v2.6.4',
    updatedDate: '2026-08-14'
  },
  {
    id: 'shadowrocket',
    name: 'Shadowrocket',
    slug: 'shadowrocket',
    category: 'client',
    description: 'iOS 平台上经久不衰的经典网络调试与代理工具，操作简便，支持扫码导入与模块脚本。',
    platforms: ['iOS'],
    license: 'Proprietary',
    status: 'Stable',
    officialUrl: 'https://apps.apple.com/app/shadowrocket/id932138708',
    features: ['多协议支持', '节点一键测速', '本地抓包与解密', '快捷指令集成'],
    recommended: true,
    version: 'v2.2.62',
    updatedDate: '2026-08-01'
  },
  {
    id: 'surge',
    name: 'Surge',
    slug: 'surge',
    category: 'client',
    description: 'macOS / iOS 专业级网络开发与分流工具，拥有业界顶级的分流引擎、抓包回放与脚本生态。',
    platforms: ['macOS', 'iOS'],
    license: 'Proprietary',
    status: 'Active',
    officialUrl: 'https://nssurge.com',
    features: ['增强模式 (Enhanced Mode)', 'MITM 与脚本重写', 'Ponte 远程设备互联', '高精度仪表盘'],
    recommended: false,
    version: 'v5.9.0',
    updatedDate: '2026-08-05'
  },
  {
    id: 'mihomo-party',
    name: 'Mihomo Party',
    slug: 'mihomo-party',
    category: 'client',
    description: '设计风格现代、UI 精致且开箱即用的 Mihomo 桌面客户端，支持多种扩展与智能规则。',
    platforms: ['Windows', 'macOS', 'Linux'],
    license: 'Open Source',
    status: 'Active',
    officialUrl: 'https://github.com/mihomo-party-org/mihomo-party',
    githubUrl: 'https://github.com/mihomo-party-org/mihomo-party',
    features: ['开箱即用', '订阅自动聚合', '优雅深色模式', '内置覆写模板'],
    recommended: true,
    version: 'v1.5.8',
    updatedDate: '2026-08-16'
  },
  {
    id: 'mosdns',
    name: 'MosDNS',
    slug: 'mosdns',
    category: 'diagnostic',
    description: '插件化可编程 DNS 分流转发利器，轻松实现国内 CDN 极速解析与国外 DoH 零泄漏防护。',
    platforms: ['Windows', 'macOS', 'Linux'],
    license: 'Open Source',
    status: 'Active',
    officialUrl: 'https://github.com/IrineSistiana/mosdns',
    githubUrl: 'https://github.com/IrineSistiana/mosdns',
    features: ['管道插件架构', 'GeoSite 域名分流', 'EDNS 客户端子网支持', '极致并发'],
    recommended: true,
    version: 'v5.3.3',
    updatedDate: '2026-08-16'
  },
  {
    id: 'subconverter',
    name: 'Subconverter',
    slug: 'subconverter',
    category: 'converter',
    description: '强大的订阅链接转换与节点格式解析后端工具，支持在各种主流客户端配置之间无缝互转。',
    platforms: ['Windows', 'macOS', 'Linux'],
    license: 'Open Source',
    status: 'Stable',
    officialUrl: 'https://github.com/tindy2013/subconverter',
    githubUrl: 'https://github.com/tindy2013/subconverter',
    features: ['多格式互转', '自定义规则注入', '节点重命名过滤', '本地 Docker 部署'],
    recommended: true,
    version: 'v0.9.0',
    updatedDate: '2026-08-01'
  }
];
