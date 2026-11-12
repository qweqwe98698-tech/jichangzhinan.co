export interface ReviewMetricObservation {
  label: string;
  value: string;
  note: string;
}

export interface AirportDeepReview {
  slug: string;
  seoTitle: string;
  seoDescription: string;
  targetKeywords: string[];
  quickVerdict: string;
  testEnvironmentSummary: string;
  screenshotBreakdown: ReviewMetricObservation[];
  unlockAnalysis: string;
  clientSetupGuide: string[];
  relatedSlugs: string[];
  relatedArticles: { title: string; href: string; tag: string }[];
  faqs: { q: string; a: string }[];
}

export const airportReviewsMap: Record<string, AirportDeepReview> = {
  'guangsu-cloud': {
    slug: 'guangsu-cloud',
    seoTitle: '2026 光速云机场实测评测：6 张三网速度/解锁图、147永久套餐与 AMM 优惠码',
    seoDescription:
      '光速云好用吗？基于 2026-08-11 与 2026-08-19 实测公开 6 张真实测速及 70 节点流媒体/AI 解锁图：9Gbps 单线程香港飙 424MB/s，长沙电信/广西移动/河北联通全对照，附 147 永久/99 年付/25 月付详解与避坑提醒。',
    targetKeywords: ['光速云机场', '光速云评测', '光速云测速图', '光速云优惠码AMM', '光速云147永久'],
    quickVerdict:
      '光速云成立于 2020 年，采用 IEPL + 企业内网双架构与 VLESS/SS 协议。9Gbps 单线程实测香港均值 375–424MB/s，且罕见公开电信/移动/联通三网 62 节点与 70 节点 11 项流媒体对照图；但香港专线 OpenAI 为「仅 APP(HK)」、新台 YouTube 多标「送中(CN)」，Web 端用 AI 或无广油管请切日本/美国节点，新人 8 折码 AMM 不适用 147 永久与 99 年付档。',
    testEnvironmentSummary:
      '覆盖两批次共 6 张原图：2026-08-11 14:32 珠海联通 5Gbps 32 并发（MAI-TEST）、以及 2026-08 珠海联通 9Gbps 单线程 VLESS 70 节点矩阵、长沙电信 @2Gbps、广西移动 @2Gbps、河北联通 @2Gbps（6 线程 MiaoKo）。仅反映测试当日节点与网络状态。',
    screenshotBreakdown: [
      { label: '9Gbps 单线程能力', value: '港 375–424MB/s · 美 313–370MB/s', note: '香港 18 单线程峰值 500.78MB/s，绝大多数 UDP 为 FullCone；当次美国 02 仅 1.60KB/s。' },
      { label: '三大运营商对照', value: '电信 49MB/s · 移动 53MB/s · 联通 41MB/s', note: '受 2Gbps 测速机与 6 线程上限影响，均值稳在 35–53MB/s；河北联通跨省 HTTPS 延迟偏高。' },
      { label: '70 节点 AI 解锁', value: 'OpenAI 日/新/美/台多数绿标', note: '三网表提示香港专线 OpenAI 标「仅APP(HK)」，新加坡节点可原生解锁 Gemini。' },
      { label: '油管与流媒体细节', value: 'NF/D+ 主区绿标 · 新台 YT 多送中', note: '70 节点表显示新加坡与台湾多数节点 YouTube 送中(CN)，追无广油管优选港/日/美。' }
    ],
    unlockAnalysis:
      '从 70 节点流媒体与 AI 测试表可见，光速云在日、美、港三区 YouTube、Netflix、Disney+ 与 Bilibili 港澳台支持完整，美区 TikTok 10 个节点全部绿标解锁(US)。需要特别注意两处局限：一是新加坡与台湾多数节点 YouTube 被判定送中(CN)；二是台湾节点在 62 节点三网测速中 Disney+ 失败，且香港专线 OpenAI 标注为「仅APP(HK)」。因此建议配合客户端策略组将 ChatGPT/Claude 分流至日本/美国，将 Gemini 分流至新加坡。',
    clientSetupGuide: [
      '官方自研客户端适合新手免配置快速登录；极客与路由器用户建议复制通用订阅导入 Clash Verge Rev 或 Shadowrocket。',
      '针对 ChatGPT Web 端与 Claude 编程用户，建议设置域名规则直指 JP 日本或 US 美国分组，避开香港仅 APP 限制。',
      '首次体验优先选极速版（¥25/月）或叠加季/半年付验证本地宽带晚高峰表现，确认合适后再考虑 ¥99 年付或 ¥147 永久包（特殊包不退款）。'
    ],
    relatedSlugs: ['v2yun', '1flyun', 'wuyou', 'weifeng'],
    relatedArticles: [
      { title: '2026 优质机场总榜：真实测速与专线分级', href: '/articles/2026-best-airports-ranking-guide/', tag: '总榜横评' },
      { title: 'ChatGPT / Claude 纯净 IP 节点分流指南', href: '/articles/best-airports-for-chatgpt-claude/', tag: 'AI 专项' },
      { title: '按量计费不限时流量包怎么选最划算', href: '/articles/on-demand-pay-as-you-go-airports/', tag: '不限时攻略' }
    ],
    faqs: [
      {
        q: '光速云优惠码 AMM 适用哪些套餐？147 永久和 99 年付能打折吗？',
        a: '按光速云官方套餐规则，致敬斯诺克 147 永久套餐（¥147/247GB）与轻量版年付（¥99/69GB/月）明确不打折；極速版（¥25/168GB）及以上月付/周期档支持 AMM 码或半年9折/年8折等阶梯折扣，具体以订单结算页面实时减免为准。'
      },
      {
        q: '实测中光速云香港节点能直接用电脑网页版 ChatGPT 吗？',
        a: '根据本次 62 节点三网对照实测表，光速云香港专线 OpenAI 状态标注为「仅APP(HK)」，部分节点在 70 节点 9Gbps 测试中出口被识别为美/日。为了防止网页版风控拒访，最稳的做法是利用 Clash 策略组将 ChatGPT 与 Claude 规则绑定到日本或美国节点。'
      },
      {
        q: '为什么光速云在同一份档案里有 25 元极速版和 17 元档两个起步口径？',
        a: '17 元/110GB 为历史早期测试档位记录，而最新《光速云品牌信息》及 42 品牌库主推 99 元/年轻量版（折 ¥8.25/月）、¥147/247GB 永久包以及 ¥25/168GB 极速版；老账号或不同活动时期入口可能略有差异，下单前以官网商品页展示为准。'
      }
    ]
  },

  flycat: {
    slug: 'flycat',
    seoTitle: '2026 飞猫云机场评测：84元年付学生版、专属客户端上手与 08-11 测速实测',
    seoDescription:
      '飞猫云适合新手吗？公开 2026-08-11 08:52 62 节点原始测速截图，拆解年付 ¥84（折 7 元/月）、专属免配置 App 上手门槛、优惠码 flycat888 及局限性。',
    targetKeywords: ['飞猫云机场', '飞猫云评测', '便宜机场年付84元', '新手机场免配置'],
    quickVerdict:
      '飞猫云立足 2023 年运营，核心卖点并非顶级发烧极客调优，而是“极简专属客户端（下载即连）+ 年付 ¥84 学生版（折 ¥7/月 50GB）”。2026-08-11 实测 62 节点全表零 0B 失联，但测试发生于早间 08:52，且月付入门 ¥25 略高于部分同级 IEPL，最适合怕折腾订阅链接的新手与轻度备用党。',
    testEnvironmentSummary:
      '参考 2026-08-11 08:52:30 (CST) 珠海联通 9Gbps 32 并发 MAI-TEST-BOT 原始测速图（消耗流量 9.0GB，Shadowsocks），62 个节点全员非零通过。早间测试并发负载较低，建议入坑长期大包前自行观察晚间峰值。',
    screenshotBreakdown: [
      { label: '香港 20 条专线', value: '全程非零，RTT 仅 16–26ms', note: '香港专线 01–20 均快速接通（香港专线 17/18 RTT 略高在 62–82ms）。' },
      { label: '新加坡与日台', value: '新 10 条 / 日 10 条 / 台 5 条齐整', note: '亚太主力延迟控制在 45–168ms，日常视频加载无卡死行。' },
      { label: '欧美尾部节点', value: '美01 高起 · 美03–10 稳态', note: '美03–10 均值落到 32–46MB/s；德国 01、泰国 01 仅 1.88 / 1.91MB/s。' }
    ],
    unlockAnalysis:
      '品牌文档显示飞猫云支持日常看视频与 ChatGPT 等常用 AI，但 Gemini 解锁需视具体节点而定，并未作出全局承诺。对轻度查资料、看 YouTube / Netflix 1080p–4K 的日常用户足够使用。',
    clientSetupGuide: [
      '新手无需理解什么是订阅 URL 或 Clash YAML，直接注册购买后下载官方专属客户端登录账号即可使用。',
      '高阶用户也可保留 Clash Verge Rev / Shadowrocket 等常规支持路径做基础切区。'
    ],
    relatedSlugs: ['xingdaomeng', 'wuyou', 'weifeng', 'guangsu-cloud'],
    relatedArticles: [
      { title: '2026 便宜机场入门精选：年付 7–8 元梯队横评', href: '/articles/cheap-budget-airports-recommendation/', tag: '便宜入门' },
      { title: '新手买机场梯子全流程三步上手教程', href: '/articles/airport-ladder-beginner-selection-guide/', tag: '新手指南' }
    ],
    faqs: [
      { q: '飞猫云学生版年付 ¥84 能用优惠码 flycat888 吗？', a: '按当前资料标注，flycat888 主要针对新用户季付及以上常规档提供 8 折优惠，特价 ¥84/年学生版是否叠加请以结账输入框回显为准。' },
      { q: '飞猫云为什么建议作备用或轻度主力？', a: '学生版每月仅 50GB 流量且 08-11 实测位于早间 08:52；如果您需要月均 200GB+ 或深夜极端低丢包大下载，可对比月付 150GB-200GB 档的微风网络或一翻云。' }
    ]
  },

  weifeng: {
    slug: 'weifeng',
    seoTitle: '2026 微风网络机场实测评测：VLESS 50 节点香港均 500MB/s、清风年付与优缺点拆解',
    seoDescription:
      '微风网络机场实测怎么样？基于 2026-07-19 珠海联通 9Gbps 50 节点 VLESS 原图拆解：香港 15 条全 FullCone 飙 619MB/s，直言台湾02 0B与美西 10–21MB/s 局限。',
    targetKeywords: ['微风网络机场', '微风机场测速', 'VLESS IEPL机场', '信风不限时套餐'],
    quickVerdict:
      '微风网络（2023 年运营）走 IEPL + VLESS 标准架构，在 2026-07-19 18:38 实测中香港 01–15 全程跑出 468–546MB/s 极亮眼成绩，且 UDP 全为 FullCone；不足之处同样明显——美西 10 节点均值仅 9.9–21.0MB/s 且当次台湾 02 为 0.00B、日本 05 异常限速，适合亚太为主兼有不限时大包需求的用户。',
    testEnvironmentSummary:
      '源自 2026-07-19 18:38:20 (CST) 珠海联通 9Gbps ([A11-32]) 32 线程 MiaoKo VLESS 50/50 测速截图，反映傍晚高峰前段联通大口表现。',
    screenshotBreakdown: [
      { label: '香港 01–15 主力', value: '均值 468–546MB/s · 峰值 619.6MB/s', note: '15 条无一掉链，全部测得 FullCone NAT，非常适合港服游戏加速与极速下载。' },
      { label: '新加坡 01–10', value: '均值 135–401MB/s（新09 峰 534MB/s）', note: '新 06 均 401.25MB/s，新 01/04/07/08/10 均超 280MB/s。' },
      { label: '日台异常节点', value: '台 02 为 0.00B · 日 05 仅 8.00KB/s', note: '日本其余 9 条在 79–258MB/s，台湾其余 4 条稳定在 73–103MB/s。' },
      { label: '美国 LAX/US 表现', value: '均值 9.90–21.03MB/s', note: '10 条美西节点的 HTTP 延迟均约 1000ms，仅足普通网页与 AI API 请求，不适合拉大包。' }
    ],
    unlockAnalysis:
      '品牌文档主打“高性价比 IEPL 入门 + 日常 ChatGPT 与流媒体可用”；结合本次测速协议与 FullCone 表现，如果日常看 4K YouTube 或港新地区内容完全过剩，但针对美西 4K 极致加载与 Gemini 多区，则需自行用 Clash 测选日本或新加坡高速节点。',
    clientSetupGuide: [
      '全部使用标准 VLESS 通用订阅，直接兼容 Clash Verge Rev（推荐开启 Tun + UoT）、Shadowrocket 与 v2rayN。',
      '如遇个别日台故障节点（如当年截图中的台湾02），可在机场规则组内设置 600s 自动 `url-test` 剔除超时节点。'
    ],
    relatedSlugs: ['wuyou', 'kuaili', 'guangsu-cloud', 'v2yun'],
    relatedArticles: [
      { title: '2026 高性价比机场推荐：单 GB 成本精算', href: '/articles/high-value-cost-effective-airports/', tag: '性价比' },
      { title: 'VLESS vs Hysteria 2 vs Trojan 协议技术对比', href: '/articles/network-protocols-comparison/', tag: '协议深度' }
    ],
    faqs: [
      { q: '微风网络有月付低价档吗？“7元/月”怎么来的？', a: '查看官方完整套餐表可见，当前年付轻量「清风」为 ¥137/年含 100GB/月（折合约 11.4 元/月），月付起步为「乘风」¥27/200GB（单 GB 仅 0.135 元）；文案曾引早期 50GB 口径“约 7 元”，采购请以现行 6 档明码表与 flat888 优惠码实付为准。' },
      { q: '微风与无忧链接实测图结构很像，该选哪一个？', a: '两者均在 7 月实测过 50 节点 VLESS（均港强美弱）。区别在于：微风走标准订阅不锁第三方客户端且月付 ¥27 直接给 200GB；无忧链接公开了额外 50 节点御三家全解锁证据图且有 ¥79/年极低门槛，但 2026-10 起主推官方专属客户端。' }
    ]
  },

  xingdaomeng: {
    slug: 'xingdaomeng',
    seoTitle: '2026 星岛梦机场评测：2020老牌 IEPL、96元年付不限设备与 55 节点测速',
    seoDescription:
      '星岛梦稳定吗？2020 年运营至今且不限设备数，公开 2026-08-11 01:48 55 节点测速图（HK02–20 稳 55–69MB/s，坦诚指出 HK01 0B 与凌晨测试时点），含 nmw888 九折码。',
    targetKeywords: ['星岛梦机场', '星岛梦评测', '不限设备机场推荐', '老牌机场2020'],
    quickVerdict:
      '星岛梦自 2020 年运营至今，最大竞争力在于「1 倍流量不限设备在线 + ¥96/年起 + 覆盖韩/东南亚多区」。08-11 凌晨测速香港 02–20 稳在 54–69MB/s 且新加坡 02–10 大多 44–65MB/s，缺点是仅测于凌晨 01:48 且香港 01 出现 0B，适合家庭合租、多终端及看重老牌资历的用户。',
    testEnvironmentSummary:
      '源自 2026-08-11 01:48:13 (CST) 来海联通 5Gbps 32 并发测速截图（55 节点，图显 Shadowsocks；品牌资料亦标注 Trojan）。凌晨测速网压较小，请理性看待晚高峰参考意义。',
    screenshotBreakdown: [
      { label: '香港 01–20 专线表现', value: 'HK02–20 均 54.8–69.7MB/s', note: '香港 01 当次测试为 0B 超时；其余 19 条延迟 RTT 极低（25–29ms）。' },
      { label: '新加坡与日台', value: 'SG 44–65MB/s · JP 25–53MB/s', note: '新加坡 08 仅 8.22MB/s、台湾 02/03 仅 13.4/5.89MB/s 偏弱。' },
      { label: '美国节点群', value: 'US 01–10 均 14–33MB/s', note: '满足日常 AI 与美区网页，不适合极速大下载。' }
    ],
    unlockAnalysis:
      '品牌资料说明全系 1× 流量不限设备支持 Netflix、Disney+、YouTube Premium 及 ChatGPT/Gemini，并涉足 TikTok 跨区与韩/东南亚落地。',
    clientSetupGuide: [
      '支持全部主流通用订阅导入，导入 Clash / Shadowrocket 后建议开启香港/新加坡负载均衡避开单条超时节点。',
      '注意新用户优惠码 nmw888 可在结账尝试 9 折；亦有 100GB/300GB/1TB 三档永久不限时包适合冷备份。'
    ],
    relatedSlugs: ['guangsu-cloud', 'flycat', 'v2yun', '2maoyun'],
    relatedArticles: [
      { title: '2026 优质老牌专线机场横评', href: '/articles/2026-best-airports-ranking-guide/', tag: '总榜' },
      { title: '家庭多设备共连（OpenWrt + 软路由）设置指引', href: '/articles/openwrt-transparent-gateway-master/', tag: '软路由教程' }
    ],
    faqs: [
      { q: '星岛梦文档写 Trojan 协议，为什么测速图显示 Shadowsocks？', a: '部分老牌 IEPL 机场后台会按客户端适配或批次微调协议下发（或测速机按 SS 节点组测验）。无论底层为 SS 还是 Trojan，Clash Meta / Mihomo 与 Shadowrocket 均无缝兼容。' },
      { q: '星岛梦年付 ¥96 和永久 ¥100/100G 怎么选？', a: '如果你每月稳定需要 ~50GB（一年能用完 600GB）选 ¥96 年付更划算；如果你全年只偶尔应急出差使用总计不到 100GB，一次 ¥100 永久包无月清零压力更省心。' }
    ]
  },

  '2maoyun': {
    slug: '2maoyun',
    seoTitle: '2026 二猫云机场实测评测：港/新/日/美 54–91MB/s 均稳表现、99元不限时与避坑指南',
    seoDescription:
      '二猫云机场怎么样？基于 2026-08-11 63 节点实测图还原真实数据：香港高达 91MB/s 且包含新加坡（纠偏部分无新加坡旧说），另附 ¥89 年付与 ermao5555 优惠码提醒。',
    targetKeywords: ['二猫云机场', '二猫云评测', '二猫云不限时99元', 'IEPL不限设备'],
    quickVerdict:
      '二猫云（2023 年运营）面向拒做“低价一次性跑路盘”的长期主力人群，账号不限设备且配有独家客户端。2026-08-11 实测港/台/新/日/美五核心区域齐稳 54–91MB/s（峰值 111MB/s）；需注意：品牌资料未保证 Claude/Gemini 解锁，且欧/泰/土等边缘地区在该次测速几乎瘫痪。',
    testEnvironmentSummary:
      '源自 2026-08-11 10:45:27 (CST) 珠海联通 5Gbps 32 并发 MAI-TEST（63 节点，图显 Shadowsocks）。对比早期口径（称缺新加坡且仅 VLESS），实际节点列表已包含完整 SG 01–10 且均跑通高速。',
    screenshotBreakdown: [
      { label: '港新主流节点', value: '港 66–91MB/s · 新 72–88MB/s', note: '香港 20 条 RTT 24–31ms，新加坡 08 峰值达 111.74MB/s。' },
      { label: '台日美均衡表现', value: '台 60–79MB/s · 日 54–87MB/s · 美 57–74MB/s', note: '美西大多落在 58–74MB/s，跨洋表现比多数同价位更稳（唯独美 09 为 20.65MB/s）。' },
      { label: '冷门地区警示', value: '土 01 0B · 英 01 483B · 泰 01 45KB/s', note: '马来 01/02 仅 10–12MB/s，欧洲与小众区域实用性弱。' }
    ],
    unlockAnalysis:
      'Netflix、YouTube、ChatGPT 等日常主流需求覆盖较稳，但官方材料明确告知：Claude 与 Gemini 能否正常使用并未做出保证，须实际切换节点尝试。若主要生产力高度依赖 Claude API/Web，建议优先对比光速云日本或灵猫/U1S1。',
    clientSetupGuide: [
      '提供官方独家定制客户端（简化小白接入），支持第三方规则导入且不限制家庭多设备并发。',
      '轻量备用党可直接盯紧 ¥89 年付小包（60GB/月）或 ¥99/100GB 不限时档，主力推荐白猫 ¥20/130GB 起。'
    ],
    relatedSlugs: ['u1s1', 'guangsu-cloud', 'v2yun', '1flyun'],
    relatedArticles: [
      { title: '2026 高性价比 20 元主力 IEPL 机场横评', href: '/articles/high-value-cost-effective-airports/', tag: '高性价比' },
      { title: '机场避坑指南：识别倍率与虚假宣传套路', href: '/articles/airport-scam-avoidance-and-fake-iplc/', tag: '安全避坑' }
    ],
    faqs: [
      { q: '为什么有的老资料说二猫云没有新加坡节点，测速图却有？', a: '部分早年文案停留在初版节点规划上；根据 2026-08-11 实测导出列表，二猫云已正式上线新加坡 01–10 且跑在 72–88MB/s，实际节点名目以订阅列表为准。' },
      { q: '二猫云能稳定上 Claude 和 Gemini 吗？', a: '官方明确表示“视节点而定、无固定承诺”。实测前不建议只为 Claude/Gemini 一次重金锁死三年长付。' }
    ]
  },

  wuyou: {
    slug: 'wuyou',
    seoTitle: '2026 无忧链接机场评测：07-18 晚 50 节点速度+御三家全解锁双图实测、客户端变化提醒',
    seoDescription:
      '无忧链接好用吗？真实公布 2026-07-18 21:40 晚高峰 50 节点测速图（港 HKG 均 554MB/s）+ 御三家解锁矩阵图（49 节点 YT/NF/D+ 全绿），提醒 2026-10 转专属客户端与美西慢速限制。',
    targetKeywords: ['无忧链接机场', '无忧链接评测', '无忧链接测速解锁图', 'TikTok跨区机场'],
    quickVerdict:
      '无忧链接凭借 MINI 年付 ¥79（折 ¥6.58/月）成为榜单极低门槛之一，且难得提供“晚高峰 21:40 测速 + 御三家流媒体解锁”完整双实测证据：香港 HKG 均值达 480–554MB/s 且 49/50 节点解锁 YT/NF/Disney+。但必须关注两点重要现实：2026 年 10 月起全面主推官方专属客户端（难用第三方订阅），且美西 LAX 节点实测仅 12–18MB/s。',
    testEnvironmentSummary:
      '实证源自 2026-07-18 21:40:48（测速）与 21:47:23（御三家流媒体）连续进行的珠海联通 9Gbps 32 并发 50 节点 VLESS 测试，属标准晚高峰真实采样。',
    screenshotBreakdown: [
      { label: '香港 HKG-01~15 表现', value: '均 480–554MB/s · HKG-12 峰 638.48MB/s', note: '15 条全部 FullCone UDP 且速度极其整齐；唯 HKG-01 YouTube 显示「送中(CN)」。' },
      { label: '御三家 50 节点解锁', value: '49/50 全平台原生地区绿标', note: '除 HKG-01 YT 送中外，美/新/日/台/港 49 节点的 YT/NF/Disney+ 均完整识别当地地区。' },
      { label: '新加坡 SIN 节点', value: 'SIN-01 352MB/s · SIN-02 仅 17.59KB/s', note: '除 02 故障与 04 较慢外，其余保持在 117–239MB/s。' },
      { label: '美西 LAX 短板', value: '10 条全段均值仅 12.1–18.1MB/s', note: 'HTTP 延迟 979–1035ms，美国线路明显不建议用来拉大体积文件。' }
    ],
    unlockAnalysis:
      '从 21:47 实测表可知无忧链接的流媒体解锁准确度极高，除了 HKG-01 出现 YT 送中之外，台湾、新加坡、日本、香港与美国均准确归属对应本土区域，配合品牌定位主打的 TikTok 跨区直连与跨境直播，对于追 4K 流媒体与 TikTok 小店日常运维很具吸引力；AI 端 ChatGPT 多数支持而 Gemini 视节点而定。',
    clientSetupGuide: [
      '注意运营政策变化：自 2026 年 10 月起官方引导用户直接下载专属客户端登录使用（零订阅门槛），不推荐给必须在 OpenWrt 软路由强导 Clash 配置文件的高阶折腾玩家。',
      '日常使用建议首选 HKG-02~15 或日本 TYO 节点看视频；避开 HKG-01 以防 YouTube 送中弹窗。'
    ],
    relatedSlugs: ['weifeng', 'flycat', 'guangsu-cloud', 'kuaili'],
    relatedArticles: [
      { title: 'Netflix 4K / Disney+ 原生流媒体解锁专线攻略', href: '/articles/netflix-disney-streaming-airports/', tag: '流媒体专项' },
      { title: 'TikTok 跨境电商网络合规与原生节点避坑', href: '/articles/tiktok-cross-border-ecommerce-airports/', tag: 'TikTok 专刊' }
    ],
    faqs: [
      { q: '无忧链接支持 Clash 或小火箭自己导入节点吗？', a: '据品牌最新说明（2026 年 10 月起），无忧链接现主推下载官方专属客户端登录使用以简化门槛；购买前如需第三方 Clash 订阅链接，务必向官网客服核实当前是否仍有开放。' },
      { q: '为什么无忧链接 MINI 套餐才 79 元一年却有 40GB/月？够用吗？', a: '40GB/月主要针对仅用文本查资料、收发海外邮件或偶尔开一下 TikTok 的轻量用户；若需要日常看 1080p/4K 长视频，建议直接选 ¥19/100GB 的「舒心链接」或 ¥108/100GB 永久不限时包。' }
    ]
  },

  v2yun: {
    slug: 'v2yun',
    seoTitle: '2026 唯兔云机场评测：14.9元 IPLC 均衡表现、美西实测 60MB/s 与不限时套餐分析',
    seoDescription:
      '唯兔云好用吗？实测公开 2026-08-11 BGP-IEPL 53 节点测速截图：香港/日本/美西全面稳定 45–65MB/s（美西全榜最稳阵营），详解限时 ¥14.9 档、优惠码 rabbit 及 0B 节点提醒。',
    targetKeywords: ['唯兔云机场', '唯兔云评测', 'v2yun测速', 'IPLC 14.9元机场'],
    quickVerdict:
      '唯兔云（2023 年运营）凭借 IPLC + BGP 三网均衡调度，在 08-11 实测中打出了少数品牌做不到的「美西高速反超」：美 01–09 全部跑到 48–60.8MB/s（峰值 92.8MB/s），与香港（40–65MB/s）、日本（45–61MB/s）完全齐平；且 1× 倍率不限设备。缺点是当次马来两线与新07 显示 0B。',
    testEnvironmentSummary:
      '源自 2026-08-11 13:55:08 (CST) 珠海联通 5Gbps 32 并发测试图（53 代理节点，图显节点名带 ss-地区-BGP-IEPL），反映午后真实吞吐态势。',
    screenshotBreakdown: [
      { label: '美西节点大亮点', value: 'US 01–09 均值 48.2–60.8MB/s', note: '对比不少同级“港快美废（10MB/s）”的竞品，唯兔云美西最高跑到 92.83MB/s 且 RTT 169–179ms。' },
      { label: '香港与日本主力', value: 'HK 40–65MB/s · JP 45–61MB/s', note: '全区表现极均匀，看 4K 与稳定远程 SSH/Git 均轻松胜任。' },
      { label: '故障节点记录', value: 'MY 01/02 与 SG 07 当次 0B', note: '新加坡其余 7 条在 26–63MB/s，马来西亚两条当时不可用。' }
    ],
    unlockAnalysis:
      '唯兔云官方口径同时支持 ChatGPT、Gemini、Claude 等 AI 与 Netflix、Disney+、YouTube Premium、TikTok；尤其拥有稳定的美西 50–60MB/s 回源能力，大幅缓解跨太平洋访问美国原生 AI 和开发镜像站的拥堵痛点。',
    clientSetupGuide: [
      '兼容 Clash Verge Rev / Shadowrocket / Loon / Sing-box 等全部通用订阅工具，全节点 1× 流量不限设备。',
      '推荐组合：限时节假日 ¥14.9/100GB（或常规普通版 ¥19.9/150GB）+ 优惠码 rabbit / weitu666。'
    ],
    relatedSlugs: ['guangsu-cloud', '1flyun', 'speedworld', 'u1s1'],
    relatedArticles: [
      { title: '2026 IPLC / IEPL 真专线技术架构深度解析', href: '/articles/iplc-iepl-dedicated-line-airports/', tag: '专线深入' },
      { title: '高性价比 15–20 元主流专线横评', href: '/articles/high-value-cost-effective-airports/', tag: '性价比' }
    ],
    faqs: [
      { q: '唯兔云为什么在榜单里既出现 rabbit 又提到 weitu666 优惠码？', a: '由于官方不同时期的推广活动渠道不同，历史上记录了新人 9 折码 rabbit 与清单收录码 weitu666，下单结账时建议先输入测试，以实际减免生效为准。' },
      { q: '唯兔云适合重度使用 Claude / ChatGPT / GitHub 的开发者吗？', a: '非常适合。多数平价机场美国节点仅 10MB/s 且丢包波动大，唯兔云美西在 08-11 实测能全程跑 48–60MB/s 且支持通用第三方规则，配合 Clash 规则分流极舒服。' }
    ]
  },

  yuzoucloud: {
    slug: 'yuzoucloud',
    seoTitle: '2026 宇宙云机场评测：08-11 晚高峰 50 节点 VLESS 实测（香港 550MB/s 与资料透明提示）',
    seoDescription:
      '宇宙云机场实测如何？真实展示 2026-08-11 21:04 珠海联通 9Gbps 50 节点 VLESS 原图：香港 02–15 飙至 550MB/s，同时如实提示新加坡07、美西低速及官网资料待补风险。',
    targetKeywords: ['宇宙云机场', 'yuzoucloud测速', 'VLESS晚高峰机场'],
    quickVerdict:
      '宇宙云在 2026-08-11 21:04 真实晚高峰测速中拿出了亮眼的 VLESS 亚太爆发力——香港 02–15 均值全在 470–550MB/s（FullCone UDP）。但当前品牌新资料相对精简（完整多档位、客服规则有待补充），且美西实测仅 8–12MB/s，仅推荐看重香港/新加坡极速并愿小额先行核验的进阶级用户。',
    testEnvironmentSummary:
      '源自 2026-08-11 21:04:24 (CST) 珠海联通 9Gbps 32 线程 MiaoKo VLESS 50/50 原图。',
    screenshotBreakdown: [
      { label: '香港 02–15 专线', value: '均值 470–550MB/s · 峰 634MB/s', note: '香港 01 当次 0.00B，其余 14 条全部开启 FullCone 并达到百兆极速。' },
      { label: '新加坡表现', value: '9 条达 331–523MB/s · SG07 9.6KB/s', note: '新 08 达 523MB/s，但新 07 异常停滞。' },
      { label: '日本台湾与美西', value: '日 22–169MB/s · 美 8.3–12.3MB/s', note: '日本 HTTPS 延迟普遍超过 700–2000ms，美国全部维持低速 10MB/s 左右。' }
    ],
    unlockAnalysis:
      '2026-08-11 测试展示了稳定的 VLESS 基础连接；不过品牌新文档尚缺详细解锁表、客服条款与最新全量套餐明细，实操应小额试水自查流媒体与 AI 状态。',
    clientSetupGuide: [
      '使用标准 VLESS 通用订阅导入 Clash / Shadowrocket / v2rayN 即可启用。',
      '建议配合延迟检测剔除香港 01/新加坡 07 等偶发失效行，重点消费香港与新加坡核心区。'
    ],
    relatedSlugs: ['weifeng', 'kuaili', 'wuyou', 'v2yun'],
    relatedArticles: [
      { title: '2026 优质机场实测排名总榜', href: '/articles/2026-best-airports-ranking-guide/', tag: '总榜' },
      { title: 'Clash Verge Rev 入门配置与自动测速组教程', href: '/articles/clash-verge-rev-guide/', tag: '客户端教程' }
    ],
    faqs: [
      { q: '宇宙云优惠码 YUZHOU553 还能用吗？最低多少钱？', a: '目前资料库记录的 ¥14.9/100GB 与新用户 8 折码 YUZHOU553 源于较早期档案，42 品牌库标明官网全新多档位与条款正待补充，采购时请先在注册/收银台验证最新售价与生效状态。' }
    ]
  },

  u1s1: {
    slug: 'u1s1',
    seoTitle: '2026 U1S1 机场实测评测：22:33 晚高峰整齐百兆级实测、96元年付与 akaka 优惠码',
    seoDescription:
      'U1S1 机场稳不稳？基于 2026-08-11 22:33 最拥堵晚高峰实测图解析：港/新/日整齐咬住 95–110MB/s、日本峰值 126MB/s，含 ¥96 年付至 ¥180/1.5TB 完整档位拆解。',
    targetKeywords: ['U1S1机场', 'U1S1测速', '晚高峰稳定机场', 'U1S1优惠码akaka'],
    quickVerdict:
      'U1S1 于 2025 年上线（部分早期记录称 2023），走 IPLC 极简风格路线。在全库最深晚高峰 22:33 实测里，其香港、新加坡 02–10、日本全系异常整齐地稳定在 93–110MB/s，抗晚间拥堵能力可圈可点；不足是创立偏新仍需长期检验且美西各节点速率差距极大。',
    testEnvironmentSummary:
      '源自 2026-08-11 22:33:29 (CST) 珠海联通 5Gbps 32 并发 MAI-TEST-BOT（消耗流量 27.7GB，图显 Shadowsocks）。此时正是全网晚高峰最核心时段。',
    screenshotBreakdown: [
      { label: '香港 20 条专线', value: '稳定 93.5–106.8MB/s（RTT 14–20ms）', note: '除香港 20 HTTP 延迟突刺 3561ms 外，其余全部高速低延迟极整齐。' },
      { label: '新加坡与日本', value: '新 99–107MB/s · 日 80–110MB/s', note: '新加坡 01 偏慢 (17.3MB/s)，其余 9 条新加坡与日本 10 条（峰 126MB/s）均表现优秀。' },
      { label: '美国节点两极分化', value: '美02 67MB/s · 多数仅 5–10MB/s', note: '美01/03/04/05/08 跑在 5–6MB/s 左右，末尾另有 61.34KB/s 异常。' }
    ],
    unlockAnalysis:
      '官方宣传具备 2000Mbps 带宽与主流流媒体、ChatGPT 支持；如使用美区服务或 AI，实测上看需手动挑美 02 / 美 07 等高速线路，或直接切日本节点使用。',
    clientSetupGuide: [
      '兼容第三方 Clash / Shadowrocket / Loon，套餐涵盖年付 ¥96/60GB 与月付 ¥20/120GB 至 1500GB。',
      '记住「全球云」在本站早期旧资料中曾错绑 U1S1 域名，现已彻底更正分离，U1S1 正品域名对应 guangs.vipaff.cc。'
    ],
    relatedSlugs: ['2maoyun', 'guangsu-cloud', '1flyun', 'v2yun'],
    relatedArticles: [
      { title: '2026 优质机场总榜 42 品牌完整评测', href: '/articles/2026-best-airports-ranking-guide/', tag: '总榜' },
      { title: '高性价比 15–20 元梯队单 GB 对比', href: '/articles/high-value-cost-effective-airports/', tag: '性价比' }
    ],
    faqs: [
      { q: 'U1S1 属于比较新的机场吗？一次买年付安全吗？', a: '基础资料明确其为 2025 年上线品牌（少数历史记录标 2023）。虽然 22:33 晚高峰实测图非常规整，出于保守风控仍建议首单选用 ¥20/120GB「普通人真够了包」跑满一个账单周期。' }
    ]
  },

  civetnet: {
    slug: 'civetnet',
    seoTitle: '2026 灵猫网络机场评测：新加坡均 71MB/s、85元年付多设备不限与 2026-10 客户端调整说明',
    seoDescription:
      '灵猫网络怎么样？基于 2026-08-11 18:45 来海联通 55 节点测速图：新加坡飙至 71.36MB/s、台湾 62MB/s、香港稳 18–33MB/s，附 lingmao 8 折码与专属客户端提醒。',
    targetKeywords: ['灵猫网络机场', '灵猫机场评测', 'civetnet测速', '不限设备机场'],
    quickVerdict:
      '灵猫网络（2025 年运营）走企业优化中转线路，特点是不限设备连接且 1× 倍率；与大多数“香港一骑绝尘”的同级不同，它在 08-11 晚高峰前段反而在新加坡（65–71MB/s）与台湾（42–62MB/s）跑出全表最优成绩。须知 2026-10 起主推官方专属客户端模式。',
    testEnvironmentSummary:
      '源自 2026-08-11 18:45:40 (CST) 来海联通 5Gbps 32 并发 MAI-TEST-BOT（55 行记录，图显 Shadowsocks）。',
    screenshotBreakdown: [
      { label: '新加坡主力突破', value: 'SG 03–10 均 65.7–71.36MB/s', note: '新加坡 10 峰值 87.95MB/s；仅 SG01 (1.74MB/s) 与 SG02 (9.32MB/s) 偏慢。' },
      { label: '台湾与香港对比', value: '台 42–62MB/s · 港 18–33MB/s', note: '香港 02–20 稳定低延迟（13–18ms），香港 01 当次 0B。' },
      { label: '日美均匀表现', value: '美 16–23MB/s · 日 19–24MB/s', note: '虽无百兆爆表但波动幅度极小，无突然跌落 KB 的断档。' }
    ],
    unlockAnalysis:
      '官网称支持 Netflix、Disney+、ChatGPT 与 TikTok，不过特别提醒不同节点、账号与时段可能存在解锁波动。如专门买来刷新加坡区 TikTok 或台湾流媒体，新加坡与台湾实测速度优势明显。',
    clientSetupGuide: [
      '2026 年 10 月起主要面向专属客户端一键连接体验，不建议习惯纯手写路由器 Mihomo 配置的极客重度依赖。',
      '叠加优惠码 lingmao 可打 8 折（¥25 Small 月付折算 ¥20，注：¥85 年付小包不适用）。'
    ],
    relatedSlugs: ['wuyou', 'gnt', 'flycat', 'guangsu-cloud'],
    relatedArticles: [
      { title: '2026 优质机场总榜对比', href: '/articles/2026-best-airports-ranking-guide/', tag: '总榜' },
      { title: '第三方代理客户端安全与使用指南', href: '/articles/clash-verge-rev-guide/', tag: '客户端' }
    ],
    faqs: [
      { q: '灵猫网络为什么图里香港才 20–30MB/s，比新加坡慢？', a: '不同时段与来海联通入口对路由偏好不同；从截图本身数据看，灵猫在新加坡和台湾节点的带宽冗余与速率确实更高，使用中可根据本地电信/移动实测灵活切新/台节点。' }
    ]
  },

  jlyvip: {
    slug: 'jlyvip',
    seoTitle: '2026 极连云机场评测：18元/100GB IEPL 方案、22:46 深夜港专线近百兆实测',
    seoDescription:
      '极连云机场稳定吗？揭秘 2026-08-11 22:46 珠海联通 66 行实测原图：香港专线 02–16 跑出 77–98.95MB/s、美区中段稳 60MB/s，对比 18 元同级光年梯给出选型建议。',
    targetKeywords: ['极连云机场', '极连云测速', '18元IEPL机场', '极连云优惠码ji8888'],
    quickVerdict:
      '极连云于 2024 年运营，定价 ¥18/月 100GB IEPL 专线并主打“覆盖常见 AI 工具场景”，支持自研客户端及第三方订阅。在 22:46 极晚高峰测速中香港主力仍旧死守 86–98.95MB/s，且部分美西达到 64–73MB/s；不过日本多数节点与香港 01 出现明显掉速或 0B，适合以港/新/美办公 AI 为主的用户。',
    testEnvironmentSummary:
      '源自 2026-08-11 22:46:50 (CST) 珠海联通 5Gbps 32 并发 MAI-TEST-BOT（66 行含前 3 行账号状态信息，图显 Shadowsocks）。',
    screenshotBreakdown: [
      { label: '香港深夜 22:46 实力', value: 'HK 02–16 均 77.5–98.95MB/s', note: '香港 01 当次 0B，HK17–20 跌至 34–66MB/s；主力群表现强韧。' },
      { label: '新加坡与美区节点', value: '新 67–83MB/s · 美中段 58–73MB/s', note: '美 03/05/06/07 跑出 58–73MB/s（峰 103MB/s），美 01/02/08/10 慢在 5–10MB/s。' },
      { label: '日本与欧洲缺陷', value: '日本多区 1.3–25MB/s · 德国 42KB/s', note: '仅日 01/02/09 维持 51–67MB/s，其余多条日本节点在 22:46 高峰剧烈下降。' }
    ],
    unlockAnalysis:
      '官方在 18 元定位文档中刻意点明“覆盖常见 AI 工具使用场景”，配合美国 03/05/06/07 较高带宽及新加坡/香港主力链路，日用 ChatGPT / 检索 / 代码补全顺畅。',
    clientSetupGuide: [
      '同时保留自研端与第三方 Clash / Shadowrocket 导入自由，适合习惯规则分流的 AI 办公者。',
      '下单前记用优惠码 ji8888；若平时更常连日本节点且多要 10GB 流量，可同价对比光年梯。'
    ],
    relatedSlugs: ['gnt', 'guangsu-cloud', 'u1s1', 'v2yun'],
    relatedArticles: [
      { title: '高性价比 15–20 元机场横向选型', href: '/articles/high-value-cost-effective-airports/', tag: '性价比' },
      { title: 'ChatGPT / Claude 专用分流节点攻略', href: '/articles/best-airports-for-chatgpt-claude/', tag: 'AI 解锁' }
    ],
    faqs: [
      { q: '同为 18 元月付，极连云（100G）与光年梯（110G）怎么选？', a: '对比两者同一天的 08-11 截图：极连云重在 22:46 深夜港专仍近百兆且美03/05/06/07 跑出 60–73MB/s；光年梯流量多 10GB 且新加坡 10 条、日本前 9 条均在 70–95MB/s 极其齐整，美西偏慢（11–14MB/s）。看常用地区站队即可。' }
    ]
  },

  gnt: {
    slug: 'gnt',
    seoTitle: '2026 光年梯机场评测：18元/110GB IEPL+VLESS、08-11 港新日全段 70–95MB/s 实测',
    seoDescription:
      '光年梯好不好用？公布 2026-08-11 14:38 珠海联通 63 节点原图：新加坡全员 87–95MB/s、香港 73–95MB/s、日本前 9 条 70–90MB/s，附优惠码 gnt6666 与美西/0B节点说明。',
    targetKeywords: ['光年梯机场', '光年梯评测', '18元机场110G', '光年梯优惠码gnt6666'],
    quickVerdict:
      '光年梯是 2025 年运营的 18 元/110GB IEPL + VLESS 品牌，同时支持 AI 与主流流媒体定位，开放自研客户端与第三方订阅。2026-08-11 下午实测亚洲核心表现突出（新加坡均 87–95.69MB/s 全员满速、香港与日本稳在 70–95MB/s），不过 2025 新运营仍需时间观察，美西仅 11–14MB/s 且尾部 3 个冷门节点为 0B。',
    testEnvironmentSummary:
      '源自 2026-08-11 14:38:04 (CST) 珠海联通 5Gbps 32 并发 MAI-TEST-BOT 63 节点截图（图显 Shadowsocks）。',
    screenshotBreakdown: [
      { label: '新加坡全员满速', value: 'SG 01–10 全部 87–95.69MB/s', note: '峰值 114.00MB/s；但 SG 01 与 08 首包 HTTP 延迟突高到 1813/1821ms。' },
      { label: '香港与日本', value: '港 73–95MB/s · 日 70–90MB/s', note: '日 10 降到 15.27MB/s、HK 05 降到 43.14MB/s，其余极其强稳。' },
      { label: '美西与 0B 边缘节点', value: '美 11–14MB/s · 马来01/德01/巴01 为 0B', note: '欧洲及马来西亚表现较薄弱。' }
    ],
    unlockAnalysis:
      '品牌文档肯定了其支持常见 AI 工具与主流流媒体场景，以光年梯高达 87–95MB/s 的港/新/日速度来看，亚太地区看 4K 视频、刷网页或日区/新区分流 OpenAI 都很轻松。',
    clientSetupGuide: [
      '提供第三方订阅，可放心导入 Clash Verge Rev / Shadowrocket 等工具。',
      '18 元/110GB 比极连云多 10GB 流量，优惠码 gnt6666 建议首月小额续费检验当地晚上高峰体验。'
    ],
    relatedSlugs: ['jlyvip', 'guangsu-cloud', '1flyun', 'v2yun'],
    relatedArticles: [
      { title: '高性价比 15–20 元专线推荐榜单', href: '/articles/high-value-cost-effective-airports/', tag: '高性价比' },
      { title: 'Shadowrocket 小火箭 iOS 配置新手教程', href: '/articles/shadowrocket-ios-setup/', tag: 'iOS 教程' }
    ],
    faqs: [
      { q: '光年梯为什么新加坡01、08下载速度 90MB/s 而 HTTP 延迟写 1800ms？', a: '测速工具中 TLS RTT（单次握手 64–68ms）与高负载下完整 HTTP 响应首包统计可能出现瞬时排队，选节点时尽量优先挑 HTTP 延迟同样绿色的 SG 02–07/09–10。' }
    ]
  },

  '1flyun': {
    slug: '1flyun',
    seoTitle: '2026 一翻云机场实测评测：Hy2/VLESS-Reality 三协议、08-11 美西狂飙 81MB/s 与不限时包',
    seoDescription:
      '一翻云值得买吗？解析 2026-08-11 00:21 55 节点测速原图：香港稳 80–92MB/s、美国全段惊人跑出 61–81.6MB/s（峰值 149MB/s），全面支持 Hysteria 2 与 Reality 三大协议。',
    targetKeywords: ['一翻云机场', '一翻云评测', 'Hysteria2机场推荐', 'Reality协议机场'],
    quickVerdict:
      '一翻云（2024 年运营）在 20 元/月（给足 150GB）梯队里是全站协议栈与实测最均衡的“技术型王牌”之一：直接开放 Hysteria 2 / VLESS-Reality / Shadowsocks 三协议、不限设备与 100–500GB 不限时包，且 08-11 实测美西全部高达 61–81.6MB/s！硬伤是官方完全不提供试用、香港01 在该次测试曾现 0B。',
    testEnvironmentSummary:
      '源自 2026-08-11 00:21:30 (CST) 珠海联通 5Gbps 32 并发 55 节点 MAI-TEST 原图（00:21 凌晨前后端低干扰并发环境）。',
    screenshotBreakdown: [
      { label: '美西惊艳高爆发', value: 'US 01–10 全部 61–81.67MB/s', note: '美国 09 峰值达 149.82MB/s！打破多数 20 元档机场“美西慢如蜗牛”通病。' },
      { label: '香港 02–20 表现', value: '多数稳 80–92.27MB/s（RTT 16–23ms）', note: '仅 HK01 当次 0B 与 HK11 为 42.7MB/s。' },
      { label: '日台新其余区域', value: '日 26–86MB/s · 新 29–89MB/s · 台 25–82MB/s', note: '多节点峰值均破 100–120MB/s。' }
    ],
    unlockAnalysis:
      '配合原生住宅 IP 定位及美西 60–81MB/s 实测能力，对访问 ChatGPT / Claude / Midjourney 与美区 Steam/4K 流媒体极其从容；三协议支持也让各种校园网/公司墙或移动丢包环境有充足的协议兜底方案（Hy2 抗丢包、Reality 抗探测）。',
    clientSetupGuide: [
      '强烈建议电脑用 Clash Verge Rev (Mihomo) 或 Sing-box、手机用 Shadowrocket 以完整用上 Hysteria 2 与 VLESS-Reality 节点。',
      '年付 ¥98/60GB 门低；月付推荐直接上 ¥20/150GB 轻享版，购买时可尝试优惠码 1FLYYUN (9折) 或 yfy6666。'
    ],
    relatedSlugs: ['guangsu-cloud', 'v2yun', 'speedworld', 'u1s1'],
    relatedArticles: [
      { title: 'Hysteria 2 高速大带宽协议对比教程', href: '/articles/hysteria2-high-speed-airports/', tag: '协议专项' },
      { title: 'VLESS Reality vs Trojan vs Hy2 怎么选', href: '/articles/network-protocols-comparison/', tag: '协议对比' }
    ],
    faqs: [
      { q: '一翻云官方为什么没有免费试用？直接买会不会翻车？', a: '一翻云官网明确不设免费试用卡；建议先选最小周期月付「轻享版」（¥20/150GB，或年付小包 ¥98），叠加优惠码先用一个月检验晚高峰 Hysteria 2 与 Reality 适配效果再决定加购不限时包。' }
    ]
  },

  sogoyun: {
    slug: 'sogoyun',
    seoTitle: '2026 SOGO 云机场评测：15国最广节点覆盖、08-11 晚实测日106MB/s 与自研端限制提醒',
    seoDescription:
      'SOGO 云怎么样？真实展示 2026-08-11 18:57 晚间实测截图：日本均速飙至 106MB/s、新加坡 98MB/s、美西 85MB/s，同时严正告知「不提供第三方订阅、仅限自研客户端」。',
    targetKeywords: ['SOGO云机场', 'sogoyun评测', '多国家覆盖机场', 'SOGO10000优惠码'],
    quickVerdict:
      'SOGO 云主打覆盖香港/台湾/日/新/美/韩/欧洲等 15 个国家和地区，且 08-11 18:57 实测日（106MB/s）、新（98MB/s）、美（85MB/s，峰 161MB/s）速度极猛。但它有一个绝对一票否决硬约束：完全不提供 Clash / Shadowrocket 通用订阅链接，只能使用官方自研客户端。',
    testEnvironmentSummary:
      '源自 2026-08-11 18:57:59 (CST) 球速联通 5Gbps 32 并发 66 行实测图（图显 Shadowsocks；官方资料标注 VLESS）。',
    screenshotBreakdown: [
      { label: '日新美暴走速度', value: '日 106MB/s · 新 98MB/s · 美 85MB/s', note: '美国 06 峰值达 161.02MB/s，新加坡 05–10 全在 89–98MB/s。' },
      { label: '香港 20 条专线', value: '稳 44–60.7MB/s（RTT 14–23ms）', note: '仅 HK|香港|11 当次 0B；台 01–05 全在线 41–49MB/s。' },
      { label: '冷门 15 国表现', value: 'MY 01/02 为 0B · 欧泰韩 2–7MB/s', note: '虽有英/德/法/土/泰/韩，但欧洲与韩泰单节点速度较低。' }
    ],
    unlockAnalysis:
      '依托高达 15 个国家和地区的庞大落地群及高速日美线路，基础影音、GPT/AI 以及区域切换极广泛；不过欧洲和东南亚地区在晚间峰值承载偏小，请理性预期小国节点的下载体验。',
    clientSetupGuide: [
      '【必读前提】购买 SOGO 云前先确认您只需要在手机/PC 运行官方一键自研 App——如果您必须在 Clash Verge Rev、Loon、小火箭或路由器中使用订阅链接，请勿下单 SOGO 云。',
      '年付 ¥98/60GB 或月付 ¥25/150GB（优惠码 SOGO10000 可九折），不限时大包最高至 ¥850/1TB。'
    ],
    relatedSlugs: ['qqy', 'wuyou', '1flyun', 'guangsu-cloud'],
    relatedArticles: [
      { title: '2026 优质机场总榜横向对比', href: '/articles/2026-best-airports-ranking-guide/', tag: '总榜' },
      { title: '为什么自研客户端与第三方订阅各有优劣', href: '/articles/airport-scam-avoidance-and-fake-iplc/', tag: '科普避坑' }
    ],
    faqs: [
      { q: '买完 SOGO 云能拿到订阅 URL 放到小火箭（Shadowrocket）里用吗？', a: '不能！品牌文档已明确指出：SOGO 云不提供订阅链接，仅可通过自研客户端使用，Clash、Shadowrocket 等第三方软件均不支持。极客用户请改选光速云、一翻云或唯兔云。' }
    ]
  },

  kosing: {
    slug: 'kosing',
    seoTitle: '2026 可信云机场实测评测：25元/150GB IEPL 55节点全体在线无0B（含截屏日期说明）',
    seoDescription:
      '可信云机场靠谱吗？公开 55 节点 32 并发测速图与客观分析：全表无 0B 失联、香港 28–53MB/s，坦诚标注截图年份由 08-11 批次推断及日07/美05 卡顿，含优惠码 kkk333。',
    targetKeywords: ['可信云机场', '可信云测速', 'kosing评测', '可信云优惠码kkk333'],
    quickVerdict:
      '可信云（2024 年运营，¥25/150GB）优势在于 55 个测速节点中有 53 个全能正常跑通、没有任何 0B 死节点，香港与新加坡均稳居 28–53MB/s 满足日常流畅浏览与 4K；但对比同在 25 元档的一众强者，其总速度均值与文档丰富度均属中规中矩，适合求稳试水的用户。',
    testEnvironmentSummary:
      '源自 15:32:35 (CST) 珠海联通 5Gbps 32 并发 55 节点图（图显 Shadowsocks）。按严谨校对规范，图底仅印刷时分秒未印完整年份，日期为 2026-08-11 同批提取推断。',
    screenshotBreakdown: [
      { label: '港新 30 节点全通', value: '港 28.6–53.4MB/s · 新 36–47.7MB/s', note: '无一 0B 失效行；新加坡 03 HTTP 延迟达 1829ms 需注意避让。' },
      { label: '日台节点表现', value: '日本多数 21–43MB/s · 台湾 21–27MB/s', note: '日本 07 跌至 12.61KB/s，台湾 04 仅有 3.86MB/s。' },
      { label: '美国节点群', value: '多数 11–20MB/s · 美05 688KB/s', note: '美国整体带宽中等，偏常规日常文本和基础影音。' }
    ],
    unlockAnalysis:
      '从官网简洁配置来看属于常规 VLESS / IEPL 流媒体与 AI 兼顾型定位，暂缺独立的 11 项深度矩阵表验证；配合 kkk333 优惠码可进一步小额测试验证本地解锁情形。',
    clientSetupGuide: [
      '兼容第三方 Clash / Shadowrocket 客户端；实测后建议在分流策略里将日本 07 和美国 05 剔出优选组。'
    ],
    relatedSlugs: ['speedworld', 'qqy', 'jlyvip', 'gnt'],
    relatedArticles: [
      { title: '2026 高性价比与中端 IEPL 专线对比', href: '/articles/2026-best-airports-ranking-guide/', tag: '总榜' }
    ],
    faqs: [
      { q: '同样月付 ¥25/150GB，可信云与速界、快狸怎么取舍？', a: '实测数据差异一目了然：速界（port41–68MB/s，美国全段 35–51MB/s，德国 26MB/s）最全面均衡；快狸（香港 505–550MB/s）适合亚太极速；可信云表现中庸稳健且无 0B，适合用作次优备选对比。' }
    ]
  },

  speedworld: {
    slug: 'speedworld',
    seoTitle: '2026 速界机场实测评测：25元档“全区无短板”实测——港日新美齐 40–68MB/s、德国 26MB/s',
    seoDescription:
      '速界机场速度快吗？深度解读 2026-08-11 15:39 63 节点测速截图：香港/日本/新加坡/台湾稳定 30–68MB/s，罕见美国稳 45MB/s 且德国可用 26MB/s，附 sss1111 优惠码。',
    targetKeywords: ['速界机场', '速界评测', '欧美亚全均衡机场', '速界优惠码sss1111'],
    quickVerdict:
      '速界（2024 年运营，¥25/150GB）在 08-11 63 节点测试中拿出了非常亮眼的「全球水桶级均衡表现」：不仅是港新日顺滑在 40–68MB/s，甚至通常掉速严重的美国 10 条全都卡在 35–51MB/s，连欧洲德国也给出 26.91MB/s！适合跨区频繁、讨厌手动折腾节点调优的多国用户。',
    testEnvironmentSummary:
      '源自 2026-08-11 15:39:36 (CST) 珠海联通 5Gbps 32 并发 MAI-TEST-BOT（63 节点，图显 Shadowsocks；文档标注 VLESS）。测试时间位于下午 15:39。',
    screenshotBreakdown: [
      { label: '美西惊人均衡度', value: 'US 01–10 全部 35.5–51.7MB/s', note: '峰值稳定 62–88MB/s 且美欧全程基本无 KB 级卡死节点（除英01）。' },
      { label: '香港 01–19 专线', value: '稳定 41.2–68.8MB/s（RTT 16–29ms）', note: '仅香港 20 当次显示 0B。' },
      { label: '欧洲小众亮点', value: '德国 26.9MB/s · 土耳其 16.4MB/s · 法国 14.8MB/s', note: '显著优于绝大多数欧洲仅有 0–5MB/s 的 IEPL 同行。' }
    ],
    unlockAnalysis:
      '具备横跨亚、美、欧全区的可用传输水准，无论是需要美区 AI 协同、欧洲跨境电商店铺后台还是亚太流畅 4K，均能在各自当地跑得动。',
    clientSetupGuide: [
      '兼容第三方 Clash Verge Rev / Shadowrocket 导入订阅；结账记得先使用优惠码 sss1111。',
      '实测提醒：仅下午 15:39 单批截图，初次购买建议先买单月 25 元观察晚高峰 21:00–23:00 的德国与美西衰减程度。'
    ],
    relatedSlugs: ['guangsu-cloud', '1flyun', 'v2yun', 'kosing'],
    relatedArticles: [
      { title: '2026 优质机场总榜 42 品牌完整榜单', href: '/articles/2026-best-airports-ranking-guide/', tag: '总榜' },
      { title: '外贸跨境与欧洲低延迟需求怎么选机场', href: '/articles/tiktok-cross-border-ecommerce-airports/', tag: '跨境指南' }
    ],
    faqs: [
      { q: '速界最大的优势跟短板分别是什么？', a: '最大优势是区域几乎无明显死角（连德国都能跑到 26MB/s、美国全员 40MB/s 上下）；短板则是下午 15:39 测试并非晚高峰极端拥挤态、香港20/英国01 偶现 0B 且品牌多周期表仍需入官网核对。' }
    ]
  },

  qqy: {
    slug: 'qqy',
    seoTitle: '2026 全球云机场实测评测：60+ 节点香港均 73–91MB/s 无0B、完整 9 档套餐及正确入口说明',
    seoDescription:
      '全球云机场好用吗？基于 2026-08-11 63 节点测速图还原真实表现：香港全段 73–91MB/s、台湾 75MB/s、美西 45–67MB/s，已全站纠偏独立注册链接（gcvipaff.com），附 qq88 8 折码与专属端限制提醒。',
    targetKeywords: ['全球云机场', '全球云评测', 'qqy测速', '全球云8折qq88'],
    quickVerdict:
      '全球云（2026 年运营，Trojan + SS 2Gbps+ 口径）拥有全库前列的丰富多国 60+ 节点与 9 档齐全套餐（¥99 年付至 ¥180/1.5TB 及 800G 永久包），08-11 实测香港 20 条全员 73–91MB/s 且台湾飙至 75–80MB/s！同时本站已将此前误指向 U1S1 的入口全面纠偏为全球云正确域名（guangs.gcvipaff.com）。需注意它走专属客户端免配模式且 2026 创立尚新。',
    testEnvironmentSummary:
      '源自 2026-08-11 15:50:43 (CST) 珠海联通 5Gbps 132 线程 MAI-TEST-BOT（63 节点+3信息行，图显 Shadowsocks）。',
    screenshotBreakdown: [
      { label: '香港 01–20 全线上线', value: '全员 73.4–91.4MB/s（0 个 0B）', note: 'RTT 极其稳定在 14–22ms 之间，全表无死节点。' },
      { label: '台湾与新加坡亮点', value: '台湾 72.8–80.1MB/s · 新加坡 57–83MB/s', note: '台湾地区均速明显优于大多数同行；仅新加坡 05 跌至 13.8MB/s。' },
      { label: '美西与尾部表现', value: '美 45–67.9MB/s · 日08 80KB/s', note: '美西大多发挥扎实；末尾泰国 01 仅 3.41KB/s、韩国 01 2.25MB/s 偏慢。' }
    ],
    unlockAnalysis:
      '官方定位覆盖 Netflix、Disney+、TikTok 等多平台解锁，并依托 60+ 丰富区域覆盖满足跨区切换；但官方同样强调“具体速度与解锁以实测为准”，建议新用户重点先挑香港/台湾/新加坡测试本地响应。',
    clientSetupGuide: [
      '与 SOGO 云类似，全球云官网口径强调下载专属客户端一键使用，下单前请先确认对第三方 Clash/Shadowrocket 的刚需度。',
      '入门 BGP 月付 ¥20/120GB 配合优惠码 qq88 可享 8 折（另见早期编码 qqy7777）；不限时从 ¥100/100GB 起步。'
    ],
    relatedSlugs: ['sogoyun', 'guangsu-cloud', 'u1s1', '2maoyun'],
    relatedArticles: [
      { title: '2026 优质机场总榜 42 品牌完整榜单', href: '/articles/2026-best-airports-ranking-guide/', tag: '总榜' },
      { title: '如何鉴别优质 BGP 与真 IPLC 专线', href: '/articles/iplc-iepl-dedicated-line-airports/', tag: '线路分析' }
    ],
    faqs: [
      { q: '为什么有些页面写的全球云注册地址以前和 U1S1 一样？哪个是真的？', a: '早期站内建库时误将 U1S1 邀请网址贴给了全球云；在本次 42 家全量校对中已彻底纠偏——全球云唯一正确地址已更新为 guangs.gcvipaff.com，请放心区分对照。' },
      { q: '全球云 99 元轻量年付能和 qq88 8 折叠加吗？', a: '一般低价年付小包不常再叠加 8 折码（通常仅适用常规 BGP 月付套餐），实际减免以结算界面展示为准。' }
    ]
  },

  kuaili: {
    slug: 'kuaili',
    seoTitle: '2026 快狸机场实测评测：VLESS 晚高峰香港 505–550MB/s 全 FullCone（含误命名图澄清）',
    seoDescription:
      '快狸机场速度快吗？展示 2026-08-11 19:52 珠海联通 9Gbps 50 节点 VLESS 原图：香港全线 505–550MB/s 且全 FullCone UDP，直言美西偏慢，并澄清旧“幕光加速”同名误放图。',
    targetKeywords: ['快狸机场', '快狸测速', 'VLESS FullCone机场', '快狸优惠码kkk2222'],
    quickVerdict:
      '快狸（2023 年运营，¥25/150GB）在 2026-08-11 19:52 黄金晚高峰实测中交出了极霸道的香港 500MB/s+ 全速成绩单，且全部标示 FullCone UDP 非常契合低延迟港服联机与 4K 拖动；同时必须如实披露：美西 10 条均只有 8.6–13.9MB/s 且新加坡 08 当次 9.6KB/s，呈现极强的“亚太偏科型”特征。',
    testEnvironmentSummary:
      '源自 2026-08-11 19:52:22 (CST) 珠海联通 9Gbps ([A11-32]) 32 并发 MiaoKo VLESS 50/50 截图。本站也同步核对排除了一张与该图字节完全相同的“幕光加速”误命名重复文件，维护数据真实性。',
    screenshotBreakdown: [
      { label: '香港 15 条全 FullCone', value: '均 505–550.8MB/s（峰值 619MB/s）', note: '黄金晚高峰 19:52 跑出极其暴走的亚太带宽，零死行、全 FullCone。' },
      { label: '新加坡与日台', value: '新 205–419MB/s（SG08 9.6KB/s）· 日 106–189MB/s', note: '亚太除 SG08 异常外整体全都在百兆以上高位。' },
      { label: '美西明显慢速', value: 'US 01–10 均值仅 8.63–13.89MB/s', note: 'HTTP 延迟普遍 990–1036ms，明显不适合跨洋拉美区大流量文件。' }
    ],
    unlockAnalysis:
      '配合 VLESS 抗封锁协议与极高亚太本地出口，适合日常香港/新加坡 4K、港服游戏、GitHub 代码加速与基础 ChatGPT 交互；如需高速拉取美区仓库或直连美服，请勿将快狸当成首要选择。',
    clientSetupGuide: [
      '采用标准 VLESS 通用订阅，直接兼容 Clash Verge Rev / Shadowrocket / Mihomo，建议开启路由器或客户端的策略组自动排除 Singapore08 等偶发抖动点。'
    ],
    relatedSlugs: ['weifeng', 'yuzoucloud', 'guangsu-cloud', 'wuyou'],
    relatedArticles: [
      { title: '外服游戏低延迟与 FullCone NAT 专线实测', href: '/articles/gaming-low-latency-airports/', tag: '游戏低延迟' },
      { title: '2026 优质机场总榜 42 品牌完整评测', href: '/articles/2026-best-airports-ranking-guide/', tag: '总榜' }
    ],
    faqs: [
      { q: '为什么有些地方把快狸这张测速图当成“暮光加速”？', a: '经编辑部逐字节核验比对，早期整理包内出现的「幕光加速-节点测速实测.png」文件名虽然写错，但其画面顶部实测抬头、时间 19:52:22 与所有行数值实为快狸 VLESS 原图。为保证可信，暮光加速已剔除该图，仅在快狸页面独立归档。' }
    ]
  }
};
