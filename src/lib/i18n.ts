export type SupportedLanguage = 'en' | 'vi' | 'zh' | 'ja' | 'ko' | 'es' | 'ar';

export interface LanguageMeta {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  flag: string;
  dir: 'ltr' | 'rtl';
}

export const SUPPORTED_LANGUAGES: LanguageMeta[] = [
  { code: 'en', name: 'English', nativeName: 'English (US)', flag: '🇺🇸', dir: 'ltr' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳', dir: 'ltr' },
  { code: 'zh', name: 'Chinese', nativeName: '中文 (简体)', flag: '🇨🇳', dir: 'ltr' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', dir: 'ltr' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷', dir: 'ltr' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', dir: 'ltr' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇦🇪', dir: 'rtl' },
];

export const TRANSLATIONS: Record<SupportedLanguage, Record<string, string>> = {
  en: {
    // Brand & Taglines
    'app.name': 'HYPERON-DEX',
    'app.tagline': 'Institutional Web3 Super Exchange & AI Trading Terminal',
    'app.status.healthy': 'ALL QUANTUM CLUSTERS: HEALTHY',
    'app.mempool.zerotrust': 'ZERO-TRUST MEMPOOL ACTIVE',
    'app.rpc.flashbots': 'FLASHBOTS PRIVATE AUCTION',
    'app.ai.active': 'AI CO-PILOT ACTIVE',
    
    // Navigation Sections
    'nav.section.ai': 'AI ALPHA & SIGNALS',
    'nav.section.trade': 'TRADE & DERIVATIVES',
    'nav.section.defi': 'LAUNCHPAD & DEFI',
    'nav.section.portfolio': 'PORTFOLIO & ANALYTICS',
    'nav.section.system': 'SYSTEM & SECURITY',

    // Navigation Items
    'nav.dashboard': 'Dashboard',
    'nav.ai_signals': 'AI Alpha Signals',
    'nav.onchain_radar': 'Whale Radar',
    'nav.ai_intelligence': 'Market Sentiment',
    'nav.ai_risk_scanner': 'Token Risk Scanner',
    'nav.ai_copilot': 'Portfolio Copilot',
    'nav.ai_agent': 'AI Trading Bot',
    'nav.swap': 'DEX Aggregator',
    'nav.perpetuals': 'Perpetuals Pro',
    'nav.trade': 'Spot Terminal',
    'nav.markets': 'Global Markets',
    'nav.token_details': 'Token Explorer',
    'nav.lottery': 'Mega VRF Lottery',
    'nav.launchpad': 'AI Fair Launchpad',
    'nav.lending': 'Smart Lending & Borrows',
    'nav.staking': 'Staking & Restake',
    'nav.liquidity': 'Liquidity Pools',
    'nav.payments': 'Web3 Payments',
    'nav.cross_chain': 'Cross-Chain Bridge',
    'nav.portfolio': 'Portfolio Ledger',
    'nav.transactions': 'Tx Explorer',
    'nav.watchlist': 'Watchlist',
    'nav.alerts': 'Price Alerts',
    'nav.security_center': 'Security Center',
    'nav.security': 'Security Center',
    'nav.developer_api': 'Developer API & SDK',
    'nav.developer': 'Developer API & SDK',
    'nav.whale_radar': 'Whale Radar',
    'nav.intelligence': 'Market Sentiment',
    'nav.analytics': 'Analytics',
    'nav.risk_scanner': 'Token Risk Scanner',
    'nav.copilot': 'Portfolio Copilot',
    'nav.bridge': 'Cross-Chain Bridge',
    'nav.explorer': 'Tx Explorer',
    'nav.admin_console': 'Admin Console',
    'nav.settings': 'Settings',

    // Wallet & Accounts
    'wallet.balance': 'Balance',
    'wallet.connected': 'Connected',
    'wallet.disconnected': 'Disconnected',
    'wallet.address': 'Wallet Address',

    // Trading & Actions
    'trade.swap': 'Swap',
    'trade.spot': 'Spot',
    'trade.perp': 'Perpetuals',
    'trade.buy': 'Buy',
    'trade.sell': 'Sell',
    'trade.limit': 'Limit',
    'trade.market': 'Market',
    'trade.best_route': 'Best Split Route',
    'trade.you_pay': 'You Pay',
    'trade.you_receive': 'You Receive',
    'trade.slippage': 'Slippage Tolerance',
    'trade.gas_fee': 'Gas Overhead',
    'trade.price_impact': 'Price Impact',
    'trade.minimum_received': 'Min Output Guaranteed',
    'trade.route_optimization': 'Smart Graph Routing',
    'trade.connect_wallet': 'Connect Wallet',
    'trade.connecting': 'Connecting...',
    'trade.simulate_first': 'Simulate Transaction (eth_call)',
    'trade.instant_swap': 'Execute Institutional Swap',
    'trade.limit_order': 'Limit Order',
    'trade.market_order': 'Market Order',
    'trade.stop_loss': 'Stop Loss',
    'trade.take_profit': 'Take Profit',
    'trade.leverage': 'Leverage',
    'trade.long': 'Long / Buy',
    'trade.short': 'Short / Sell',
    'trade.order_book': 'Real-Time Order Book',
    'trade.depth_chart': 'Market Depth',
    'trade.recent_trades': 'Execution Stream',

    // Orders & Positions
    'orders.open': 'Open Orders',
    'orders.positions': 'Positions',
    'orders.history': 'Order History',

    // Themes & Settings
    'theme.mode': 'Theme',
    'theme.dark': 'Quantum Midnight',
    'theme.light': 'Titanium Light',
    'theme.cyber': 'Cyberpunk Terminal',
    'lang.select': 'Language',
  },
  vi: {
    // Brand & Taglines
    'app.name': 'HYPERON-DEX',
    'app.tagline': 'Sàn Giao dịch Phi Tập Trung Chuẩn Định Chế & AI Trading Terminal',
    'app.status.healthy': 'CỤM XỬ LÝ LƯỢNG TỬ: BÌNH THƯỜNG',
    'app.mempool.zerotrust': 'MEMPOOL BẢO MẬT ZERO-TRUST',
    'app.rpc.flashbots': 'ĐẤU GIÁ RIÊNG TƯ FLASHBOTS',
    'app.ai.active': 'TRỢ LÝ AI ĐANG HOẠT ĐỘNG',
    
    // Navigation Sections
    'nav.section.ai': 'TÍN HIỆU & TRÍ TUỆ AI',
    'nav.section.trade': 'GIAO DỊCH & PHÁI SINH',
    'nav.section.defi': 'BỆ PHÓNG LAUNCHPAD & DEFI',
    'nav.section.portfolio': 'DANH MỤC & PHÂN TÍCH',
    'nav.section.system': 'HỆ THỐNG & BẢO MẬT',

    // Navigation Items
    'nav.dashboard': 'Tổng Quan',
    'nav.ai_signals': 'Tín Hiệu Alpha AI',
    'nav.onchain_radar': 'Radar Cá Voi',
    'nav.ai_intelligence': 'Tâm Lý Thị Trường',
    'nav.ai_risk_scanner': 'Quét Rủi Ro Token',
    'nav.ai_copilot': 'AI Copilot Quản Lý Vốn',
    'nav.ai_agent': 'Bot Giao Dịch Tự Động',
    'nav.swap': 'Giao Thức Hoán Đổi DEX',
    'nav.perpetuals': 'Hợp Đồng Vô Kỳ Pro',
    'nav.trade': 'Bảng Giao Dịch Spot',
    'nav.markets': 'Thị Trường Toàn Cầu',
    'nav.token_details': 'Khám Phá Token',
    'nav.lottery': 'Xổ Số Công Bằng VRF',
    'nav.launchpad': 'Launchpad Chống Rugpull',
    'nav.lending': 'Cho Vay & Vay Thông Minh',
    'nav.staking': 'Staking & Tái Đầu Tư',
    'nav.liquidity': 'Hồ Thanh Khoản LP',
    'nav.payments': 'Thanh Toán Web3',
    'nav.cross_chain': 'Cầu Nối Đa Chuỗi',
    'nav.portfolio': 'Sổ Cái Danh Mục',
    'nav.transactions': 'Lịch Sử Giao Dịch',
    'nav.watchlist': 'Danh Sách Theo Dõi',
    'nav.alerts': 'Cảnh Báo Biến Động',
    'nav.security_center': 'Trung Tâm An Ninh',
    'nav.security': 'Trung Tâm An Ninh',
    'nav.developer_api': 'API & SDK Lập Trình Viên',
    'nav.developer': 'API & SDK Lập Trình Viên',
    'nav.whale_radar': 'Radar Cá Voi',
    'nav.intelligence': 'Tâm Lý Thị Trường',
    'nav.analytics': 'Phân Tích',
    'nav.risk_scanner': 'Quét Rủi Ro Token',
    'nav.copilot': 'Quản Lý Vốn',
    'nav.bridge': 'Cầu Nối Đa Chuỗi',
    'nav.explorer': 'Lịch Sử Giao Dịch',
    'nav.admin_console': 'Bảng Quản Trị Hệ Thống',
    'nav.settings': 'Cài Đặt Hệ Thống',

    // Wallet & Accounts
    'wallet.balance': 'Số dư ví',
    'wallet.connected': 'Đã kết nối',
    'wallet.disconnected': 'Chưa kết nối',
    'wallet.address': 'Địa chỉ ví',

    // Trading & Actions
    'trade.swap': 'Hoán Đổi',
    'trade.spot': 'Giao ngay',
    'trade.perp': 'Hợp đồng vô kỳ',
    'trade.buy': 'Mua',
    'trade.sell': 'Bán',
    'trade.limit': 'Giới hạn',
    'trade.market': 'Thị trường',
    'trade.best_route': 'Lộ Trình Tách Lệnh Tối Ưu',
    'trade.you_pay': 'Bạn Trả',
    'trade.you_receive': 'Bạn Nhận',
    'trade.slippage': 'Độ Trượt Giá',
    'trade.gas_fee': 'Chi Phí Gas Ước Tính',
    'trade.price_impact': 'Tác Động Giá',
    'trade.minimum_received': 'Số Lượng Nhận Tối Thiểu',
    'trade.route_optimization': 'Thuật Toán Smart Graph',
    'trade.connect_wallet': 'Kết Nối Ví',
    'trade.connecting': 'Đang Kết Nối...',
    'trade.simulate_first': 'Mô Phỏng Lệnh (eth_call)',
    'trade.instant_swap': 'Thực Hiện Hoán Đổi',
    'trade.limit_order': 'Lệnh Giới Hạn (Limit)',
    'trade.market_order': 'Lệnh Thị Trường (Market)',
    'trade.stop_loss': 'Cắt Lỗ (Stop Loss)',
    'trade.take_profit': 'Chốt Lời (Take Profit)',
    'trade.leverage': 'Đòn Bẩy',
    'trade.long': 'Mua / Long',
    'trade.short': 'Bán / Short',
    'trade.order_book': 'Sổ Lệnh Thời Gian Thực',
    'trade.depth_chart': 'Biểu Đồ Độ Sâu Thanh Khoản',
    'trade.recent_trades': 'Luồng Khớp Lệnh Trực Tiếp',

    // Orders & Positions
    'orders.open': 'Lệnh Chờ Khớp',
    'orders.positions': 'Vị Thế Mở',
    'orders.history': 'Lịch Sử Lệnh',

    // Themes & Settings
    'theme.mode': 'Giao Diện',
    'theme.dark': 'Đêm Lượng Tử (Tối)',
    'theme.light': 'Titanium Chuẩn Quỹ (Sáng)',
    'theme.cyber': 'Cyberpunk Terminal',
    'lang.select': 'Ngôn Ngữ',
  },
  zh: {
    // Brand & Taglines
    'app.name': 'HYPERON-DEX',
    'app.tagline': '机构级 Web3 超级去中心化交易所与 AI 交易终端',
    'app.status.healthy': '量子计算集群：正常运行',
    'app.mempool.zerotrust': '零信任内存池防御中',
    'app.rpc.flashbots': 'FLASHBOTS 专属私有节点',
    'app.ai.active': 'AI 领航副驾已激活',
    
    // Navigation Sections
    'nav.section.ai': 'AI 信号与情报',
    'nav.section.trade': '交易与衍生品',
    'nav.section.defi': '发行与 DEFI',
    'nav.section.portfolio': '投资组合与分析',
    'nav.section.system': '系统与安全',

    // Navigation Items
    'nav.dashboard': '总览仪表盘',
    'nav.ai_signals': 'AI Alpha 交易信号',
    'nav.onchain_radar': '链上巨鲸雷达',
    'nav.ai_intelligence': '全网情绪分析',
    'nav.ai_risk_scanner': '代币风险审计',
    'nav.ai_copilot': 'AI 投资组合副驾',
    'nav.ai_agent': 'AI 自动化交易机器人',
    'nav.swap': 'DEX 智能聚合器',
    'nav.perpetuals': '永续合约专业版',
    'nav.trade': '现货交易终端',
    'nav.markets': '全球加密市场',
    'nav.token_details': '代币全息浏览器',
    'nav.lottery': 'VRF 链上公平抽奖',
    'nav.launchpad': 'AI 防跑路发行平台',
    'nav.lending': '智能借贷流动池',
    'nav.staking': '质押与再质押',
    'nav.liquidity': '流动性资金池',
    'nav.payments': 'Web3 原生支付',
    'nav.cross_chain': '全链跨链桥',
    'nav.portfolio': '资产总账',
    'nav.transactions': '交易历史记录',
    'nav.watchlist': '自选关注列表',
    'nav.alerts': '异动预警通知',
    'nav.security_center': '安全防护中心',
    'nav.security': '安全防护中心',
    'nav.developer_api': '开发者 API 与 SDK',
    'nav.developer': '开发者 API 与 SDK',
    'nav.whale_radar': '链上巨鲸雷达',
    'nav.intelligence': '全网情绪分析',
    'nav.risk_scanner': '代币风险审计',
    'nav.copilot': 'AI 投资组合副驾',
    'nav.bridge': '全链跨链桥',
    'nav.explorer': '交易历史记录',
    'nav.admin_console': '管理控制台',
    'nav.settings': '偏好设置',

    // Wallet & Accounts
    'wallet.balance': '钱包余额',
    'wallet.connected': '已连接',
    'wallet.disconnected': '未连接',
    'wallet.address': '钱包地址',

    // Trading & Actions
    'trade.swap': '快速兑换',
    'trade.spot': '现货',
    'trade.perp': '永续合约',
    'trade.buy': '买入',
    'trade.sell': '卖出',
    'trade.limit': '限价',
    'trade.market': '市价',
    'trade.best_route': '最优拆单路由',
    'trade.you_pay': '您支付',
    'trade.you_receive': '您获得',
    'trade.slippage': '滑点容忍度',
    'trade.gas_fee': '预估 Gas 开销',
    'trade.price_impact': '价格冲击',
    'trade.minimum_received': '最少保证获得',
    'trade.route_optimization': 'Smart Graph 路由算法',
    'trade.connect_wallet': '连接钱包',
    'trade.connecting': '正在连接...',
    'trade.simulate_first': '预执行沙盒模拟 (eth_call)',
    'trade.instant_swap': '执行机构级兑换',
    'trade.limit_order': '限价单',
    'trade.market_order': '市价单',
    'trade.stop_loss': '止损',
    'trade.take_profit': '止盈',
    'trade.leverage': '杠杆倍数',
    'trade.long': '看多 / 买入',
    'trade.short': '看空 / 卖出',
    'trade.order_book': '实时委托订单薄',
    'trade.depth_chart': '市场深度图',
    'trade.recent_trades': '最新撮合成交',

    // Orders & Positions
    'orders.open': '当前委托',
    'orders.positions': '持仓',
    'orders.history': '历史委托',

    // Themes & Settings
    'theme.mode': '主题外观',
    'theme.dark': '量子暗夜 (Dark)',
    'theme.light': '钛金机构明亮 (Light)',
    'theme.cyber': '赛博极客终端',
    'lang.select': '界面语言',
  },
  ja: {
    // Brand & Taglines
    'app.name': 'HYPERON-DEX',
    'app.tagline': '機関投資家グレード Web3 スーパー DEX & AI ターミナル',
    'app.status.healthy': '全量子クラスタ稼働中: 正常',
    'app.mempool.zerotrust': 'ゼロトラスト・ミームプール稼働',
    'app.rpc.flashbots': 'FLASHBOTS プライベート RPC',
    'app.ai.active': 'AI コパイロット作動中',
    
    // Navigation Sections
    'nav.section.ai': 'AI シグナル & インテリジェンス',
    'nav.section.trade': '取引 & デリバティブ',
    'nav.section.defi': 'ローンチパッド & DEFI',
    'nav.section.portfolio': 'ポートフォリオ & 分析',
    'nav.section.system': 'システム & セキュリティ',

    // Navigation Items
    'nav.dashboard': 'ダッシュボード',
    'nav.ai_signals': 'AI アルファシグナル',
    'nav.onchain_radar': 'クジラレーダー',
    'nav.ai_intelligence': '市場センチメント',
    'nav.ai_risk_scanner': 'トークンリスク診断',
    'nav.ai_copilot': 'ポートフォリオコパイロット',
    'nav.ai_agent': 'AI 自律トレーディングBot',
    'nav.swap': 'DEX アグリゲーター',
    'nav.perpetuals': '無期限先物 Pro',
    'nav.trade': 'スポット取引ターミナル',
    'nav.markets': 'グローバル市場',
    'nav.token_details': 'トークンエクスプローラー',
    'nav.lottery': 'VRF 公平ロッタリー',
    'nav.launchpad': 'AI フェアローンチパッド',
    'nav.lending': 'スマートレンディング',
    'nav.staking': 'ステーキング & 再ステーキング',
    'nav.liquidity': '流動性プール',
    'nav.payments': 'Web3 ペイメント',
    'nav.cross_chain': 'クロスチェーンブリッジ',
    'nav.portfolio': '資産台帳',
    'nav.transactions': 'トランザクション履歴',
    'nav.watchlist': 'ウォッチリスト',
    'nav.alerts': 'アラート通知',
    'nav.security_center': 'セキュリティセンター',
    'nav.security': 'セキュリティセンター',
    'nav.developer_api': '開発者 API & SDK',
    'nav.developer': '開発者 API & SDK',
    'nav.whale_radar': 'クジラレーダー',
    'nav.intelligence': '市場センチメント',
    'nav.risk_scanner': 'トークンリスク診断',
    'nav.copilot': 'ポートフォリオコパイロット',
    'nav.bridge': 'クロスチェーンブリッジ',
    'nav.explorer': 'トランザクション履歴',
    'nav.admin_console': '管理者コンソール',
    'nav.settings': '設定',

    // Wallet & Accounts
    'wallet.balance': 'ウォレット残高',
    'wallet.connected': '接続済み',
    'wallet.disconnected': '未接続',
    'wallet.address': 'ウォレットアドレス',

    // Trading & Actions
    'trade.swap': 'スワップ',
    'trade.spot': '現物',
    'trade.perp': '無期限先物',
    'trade.buy': '購入',
    'trade.sell': '売却',
    'trade.limit': '指値',
    'trade.market': '成行',
    'trade.best_route': '最適分割ルーティング',
    'trade.you_pay': '支払額',
    'trade.you_receive': '受取額',
    'trade.slippage': 'スリッページ許容度',
    'trade.gas_fee': '推定 Gas コスト',
    'trade.price_impact': 'プライスインパクト',
    'trade.minimum_received': '最低保証受取額',
    'trade.route_optimization': 'Smart Graph ルーティング',
    'trade.connect_wallet': 'ウォレット接続',
    'trade.connecting': '接続中...',
    'trade.simulate_first': '事前シミュレーション (eth_call)',
    'trade.instant_swap': 'スワップを実行',
    'trade.limit_order': '指値注文',
    'trade.market_order': '成行注文',
    'trade.stop_loss': '損切り (Stop Loss)',
    'trade.take_profit': '利益確定 (Take Profit)',
    'trade.leverage': 'レバレッジ',
    'trade.long': 'ロング / 買い',
    'trade.short': 'ショート / 売り',
    'trade.order_book': 'リアルタイム板情報',
    'trade.depth_chart': 'デプスチャート',
    'trade.recent_trades': '歩み値 (約定履歴)',

    // Orders & Positions
    'orders.open': '未約定注文',
    'orders.positions': 'ポジション',
    'orders.history': '注文履歴',

    // Themes & Settings
    'theme.mode': 'テーマ設定',
    'theme.dark': '量子ミッドナイト (Dark)',
    'theme.light': 'チタン機関仕様 (Light)',
    'theme.cyber': 'サイバーパンクターミナル',
    'lang.select': '言語設定',
  },
  ko: {
    // Brand & Taglines
    'app.name': 'HYPERON-DEX',
    'app.tagline': '기관급 Web3 슈퍼 탈중앙화 거래소 및 AI 트레이딩 터미널',
    'app.status.healthy': '모든 퀀텀 클러스터 정상 작동',
    'app.mempool.zerotrust': '제로 트러스트 멤풀 가동 중',
    'app.rpc.flashbots': 'FLASHBOTS 프라이빗 RPC 경매',
    'app.ai.active': 'AI 코파일럿 활성화됨',
    
    // Navigation Sections
    'nav.section.ai': 'AI 신호 및 인텔리전스',
    'nav.section.trade': '거래 및 파생상품',
    'nav.section.defi': '런치패드 및 DEFI',
    'nav.section.portfolio': '포트폴리오 및 분석',
    'nav.section.system': '시스템 및 보안',

    // Navigation Items
    'nav.dashboard': '대시보드',
    'nav.ai_signals': 'AI 알파 시그널',
    'nav.onchain_radar': '고래 레이더',
    'nav.ai_intelligence': '시장 심리 지수',
    'nav.ai_risk_scanner': '토큰 리스크 검사',
    'nav.ai_copilot': '포트폴리오 코파일럿',
    'nav.ai_agent': 'AI 자동 매매 봇',
    'nav.swap': 'DEX 애그리게이터',
    'nav.perpetuals': '무기한 선물 Pro',
    'nav.trade': '스팟 거래 터미널',
    'nav.markets': '글로벌 시장',
    'nav.token_details': '토큰 탐색기',
    'nav.lottery': 'VRF 공정 복권',
    'nav.launchpad': 'AI 안티러그 런치패드',
    'nav.lending': '스마트 대출 및 차입',
    'nav.staking': '스테이킹 및 리스테이킹',
    'nav.liquidity': '유동성 풀',
    'nav.payments': 'Web3 간편 결제',
    'nav.cross_chain': '크로스체인 브릿지',
    'nav.portfolio': '포트폴리오 원장',
    'nav.transactions': '트랜잭션 기록',
    'nav.watchlist': '관심 목록',
    'nav.alerts': '가격 변동 알림',
    'nav.security_center': '보안 센터',
    'nav.security': '보안 센터',
    'nav.developer_api': '개발자 API 및 SDK',
    'nav.developer': '개발자 API 및 SDK',
    'nav.whale_radar': '고래 레이더',
    'nav.intelligence': '시장 심리 지수',
    'nav.risk_scanner': '토큰 리스크 검사',
    'nav.copilot': '포트폴리오 코파일럿',
    'nav.bridge': '크로스체인 브릿지',
    'nav.explorer': '트랜잭션 기록',
    'nav.admin_console': '관리자 콘솔',
    'nav.settings': '환경 설정',

    // Wallet & Accounts
    'wallet.balance': '지갑 잔액',
    'wallet.connected': '연결됨',
    'wallet.disconnected': '연결 해제',
    'wallet.address': '지갑 주소',

    // Trading & Actions
    'trade.swap': '스왑 (교환)',
    'trade.spot': '스팟',
    'trade.perp': '무기한 선물',
    'trade.buy': '매수',
    'trade.sell': '매도',
    'trade.limit': '지정가',
    'trade.market': '시장가',
    'trade.best_route': '최적 분할 라우팅',
    'trade.you_pay': '지불 금액',
    'trade.you_receive': '수령 금액',
    'trade.slippage': '슬리피지 허용치',
    'trade.gas_fee': '예상 가스 비용',
    'trade.price_impact': '가격 영향도',
    'trade.minimum_received': '최소 보장 수령액',
    'trade.route_optimization': 'Smart Graph 라우팅',
    'trade.connect_wallet': '지갑 연결',
    'trade.connecting': '연결 중...',
    'trade.simulate_first': '사전 검증 시뮬레이션 (eth_call)',
    'trade.instant_swap': '기관급 스왑 실행',
    'trade.limit_order': '지정가 주문',
    'trade.market_order': '시장가 주문',
    'trade.stop_loss': '손절매 (Stop Loss)',
    'trade.take_profit': '익절 (Take Profit)',
    'trade.leverage': '레버리지',
    'trade.long': '롱 / 매수',
    'trade.short': '숏 / 매도',
    'trade.order_book': '실시간 호가창',
    'trade.depth_chart': '호가 깊이 차트',
    'trade.recent_trades': '실시간 체결 내역',

    // Orders & Positions
    'orders.open': '미체결 주문',
    'orders.positions': '포지션',
    'orders.history': '주문 내역',

    // Themes & Settings
    'theme.mode': '테마 설정',
    'theme.dark': '퀀텀 나이트 (Dark)',
    'theme.light': '티타늄 기관용 (Light)',
    'theme.cyber': '사이버펑크 터미널',
    'lang.select': '언어 선택',
  },
  es: {
    // Brand & Taglines
    'app.name': 'HYPERON-DEX',
    'app.tagline': 'Super Exchange Web3 Institucional y Terminal de Trading con IA',
    'app.status.healthy': 'CLÚSTERES CUÁNTICOS: SALUDABLES',
    'app.mempool.zerotrust': 'MEMPOOL ZERO-TRUST ACTIVO',
    'app.rpc.flashbots': 'SUBASTA PRIVADA FLASHBOTS',
    'app.ai.active': 'COPILOTO DE IA ACTIVO',
    
    // Navigation Sections
    'nav.section.ai': 'SEÑALES ALPHA E INTELIGENCIA',
    'nav.section.trade': 'TRADING Y DERIVADOS',
    'nav.section.defi': 'LAUNCHPAD Y DEFI',
    'nav.section.portfolio': 'PORTAFOLIO Y ANALÍTICA',
    'nav.section.system': 'SISTEMA Y SEGURIDAD',

    // Navigation Items
    'nav.dashboard': 'Panel Principal',
    'nav.ai_signals': 'Señales Alpha de IA',
    'nav.onchain_radar': 'Radar de Ballenas',
    'nav.ai_intelligence': 'Sentimiento de Mercado',
    'nav.ai_risk_scanner': 'Auditoría de Riesgo',
    'nav.ai_copilot': 'Copiloto de Portafolio',
    'nav.ai_agent': 'Bot de Trading Autónomo',
    'nav.swap': 'Agregador DEX',
    'nav.perpetuals': 'Perpetuos Pro',
    'nav.trade': 'Terminal Spot',
    'nav.markets': 'Mercados Globales',
    'nav.token_details': 'Explorador de Tokens',
    'nav.lottery': 'Lotería Justa VRF',
    'nav.launchpad': 'Launchpad Anti-Rug',
    'nav.lending': 'Préstamos Inteligentes',
    'nav.staking': 'Staking y Restake',
    'nav.liquidity': 'Piscinas de Liquidez',
    'nav.payments': 'Pagos Web3',
    'nav.cross_chain': 'Puente Cross-Chain',
    'nav.portfolio': 'Libro de Portafolio',
    'nav.transactions': 'Historial de Transacciones',
    'nav.watchlist': 'Lista de Seguimiento',
    'nav.alerts': 'Alertas de Precios',
    'nav.security_center': 'Centro de Seguridad',
    'nav.security': 'Centro de Seguridad',
    'nav.developer_api': 'API y SDK para Desarrolladores',
    'nav.developer': 'API y SDK para Desarrolladores',
    'nav.whale_radar': 'Radar de Ballenas',
    'nav.intelligence': 'Sentimiento de Mercado',
    'nav.risk_scanner': 'Auditoría de Riesgo',
    'nav.copilot': 'Copiloto de Portafolio',
    'nav.bridge': 'Puente Cross-Chain',
    'nav.explorer': 'Historial de Transacciones',
    'nav.admin_console': 'Consola de Administración',
    'nav.settings': 'Configuración',

    // Wallet & Accounts
    'wallet.balance': 'Saldo de Billetera',
    'wallet.connected': 'Conectado',
    'wallet.disconnected': 'Desconectado',
    'wallet.address': 'Dirección de Billetera',

    // Trading & Actions
    'trade.swap': 'Intercambiar',
    'trade.spot': 'Spot',
    'trade.perp': 'Perpetuos',
    'trade.buy': 'Comprar',
    'trade.sell': 'Vender',
    'trade.limit': 'Límite',
    'trade.market': 'Mercado',
    'trade.best_route': 'Ruta Dividida Óptima',
    'trade.you_pay': 'Usted Paga',
    'trade.you_receive': 'Usted Recibe',
    'trade.slippage': 'Tolerancia al Deslizamiento',
    'trade.gas_fee': 'Costo Estimado de Gas',
    'trade.price_impact': 'Impacto en el Precio',
    'trade.minimum_received': 'Mínimo Garantizado',
    'trade.route_optimization': 'Enrutamiento Smart Graph',
    'trade.connect_wallet': 'Conectar Billetera',
    'trade.connecting': 'Conectando...',
    'trade.simulate_first': 'Simular Transacción (eth_call)',
    'trade.instant_swap': 'Ejecutar Intercambio',
    'trade.limit_order': 'Orden Límite',
    'trade.market_order': 'Orden de Mercado',
    'trade.stop_loss': 'Detener Pérdida (Stop Loss)',
    'trade.take_profit': 'Tomar Ganancia (Take Profit)',
    'trade.leverage': 'Apalancamiento',
    'trade.long': 'Comprar / Largo',
    'trade.short': 'Vender / Corto',
    'trade.order_book': 'Libro de Órdenes en Vivo',
    'trade.depth_chart': 'Profundidad de Mercado',
    'trade.recent_trades': 'Operaciones Recientes',

    // Orders & Positions
    'orders.open': 'Órdenes Abiertas',
    'orders.positions': 'Posiciones',
    'orders.history': 'Historial de Órdenes',

    // Themes & Settings
    'theme.mode': 'Tema Visual',
    'theme.dark': 'Noche Cuántica (Dark)',
    'theme.light': 'Titanio Institucional (Light)',
    'theme.cyber': 'Terminal Cyberpunk',
    'lang.select': 'Idioma',
  },
  ar: {
    // Brand & Taglines
    'app.name': 'HYPERON-DEX',
    'app.tagline': 'منصة التداول اللامركزية فائقة الدقة والمجهزة بالذكاء الاصطناعي',
    'app.status.healthy': 'جميع الأنظمة الكمية: تعمل بكفاءة',
    'app.mempool.zerotrust': 'حماية الميمبول معدومة الثقة نشطة',
    'app.rpc.flashbots': 'مزاد فلاشبوتس الخاص',
    'app.ai.active': 'المساعد الذكي نشط',
    
    // Navigation Sections
    'nav.section.ai': 'إشارات ومعلومات الذكاء الاصطناعي',
    'nav.section.trade': 'التداول والمشتقات المالية',
    'nav.section.defi': 'منصة الإطلاق والتمويل اللامركزي',
    'nav.section.portfolio': 'المحفظة الاستثمارية والتحليلات',
    'nav.section.system': 'النظام والأمان',

    // Navigation Items
    'nav.dashboard': 'لوحة المعلومات الرئيسية',
    'nav.ai_signals': 'إشارات ألفا الذكية',
    'nav.onchain_radar': 'رادار الحيتان',
    'nav.ai_intelligence': 'معنويات السوق',
    'nav.ai_risk_scanner': 'فاحص مخاطر العملات',
    'nav.ai_copilot': 'مساعد المحفظة الاستثمارية',
    'nav.ai_agent': 'روبوت التداول المستقل',
    'nav.swap': 'مجمع التبادل اللامركزي',
    'nav.perpetuals': 'العقود الآجلة الدائمة برو',
    'nav.trade': 'منصة التداول الفوري',
    'nav.markets': 'الأسواق العالمية',
    'nav.token_details': 'مستكشف العملات',
    'nav.lottery': 'يانصيب VRF العادل',
    'nav.launchpad': 'منصة إطلاق المشاريع الموثوقة',
    'nav.lending': 'الإقراض والاقتراض الذكي',
    'nav.staking': 'التحصيص وإعادة التحصيص',
    'nav.liquidity': 'أحواض السيولة',
    'nav.payments': 'مدفوعات الويب 3',
    'nav.cross_chain': 'جسر المعاملات عبر الشبكات',
    'nav.portfolio': 'سجل الأصول والمحفظة',
    'nav.transactions': 'سجل المعاملات',
    'nav.watchlist': 'قائمة المراقبة',
    'nav.alerts': 'تنبيهات الأسعار',
    'nav.security_center': 'مركز الأمان والحماية',
    'nav.security': 'مركز الأمان والحماية',
    'nav.developer_api': 'واجهة المطورين البرمجية',
    'nav.developer': 'واجهة المطورين البرمجية',
    'nav.whale_radar': 'رادار الحيتان',
    'nav.intelligence': 'معنويات السوق',
    'nav.risk_scanner': 'فاحص مخاطر العملات',
    'nav.copilot': 'مساعد المحفظة الاستثمارية',
    'nav.bridge': 'جسر المعاملات عبر الشبكات',
    'nav.explorer': 'سجل المعاملات',
    'nav.admin_console': 'لوحة تحكم المشرف',
    'nav.settings': 'إعدادات المنصة',

    // Wallet & Accounts
    'wallet.balance': 'رصيد المحفظة',
    'wallet.connected': 'متصل',
    'wallet.disconnected': 'غير متصل',
    'wallet.address': 'عنوان المحفظة',

    // Trading & Actions
    'trade.swap': 'تبديل فوري',
    'trade.spot': 'فوري',
    'trade.perp': 'دائم',
    'trade.buy': 'شراء',
    'trade.sell': 'بيع',
    'trade.limit': 'محدد',
    'trade.market': 'سوق',
    'trade.best_route': 'أفضل مسار توجيه مقسم',
    'trade.you_pay': 'تدفع',
    'trade.you_receive': 'تستلم',
    'trade.slippage': 'تحمل الانزلاق السعري',
    'trade.gas_fee': 'تكلفة الغاز المقدرة',
    'trade.price_impact': 'التأثير على السعر',
    'trade.minimum_received': 'الحد الأدنى المضمون للاستلام',
    'trade.route_optimization': 'توجيه الرسم البياني الذكي',
    'trade.connect_wallet': 'ربط المحفظة',
    'trade.connecting': 'جارٍ التوصيل...',
    'trade.simulate_first': 'محاكاة المعاملة مسبقاً (eth_call)',
    'trade.instant_swap': 'تنفيذ التبادل المؤسسي',
    'trade.limit_order': 'أمر محدد السعر',
    'trade.market_order': 'أمر بسعر السوق',
    'trade.stop_loss': 'وقف الخسارة',
    'trade.take_profit': 'جني الأرباح',
    'trade.leverage': 'الرافعة المالية',
    'trade.long': 'شراء / صعود',
    'trade.short': 'بيع / هبوط',
    'trade.order_book': 'دفتر الأوامر المباشر',
    'trade.depth_chart': 'عمق السوق',
    'trade.recent_trades': 'التداولات الأخيرة',

    // Orders & Positions
    'orders.open': 'الأوامر المفتوحة',
    'orders.positions': 'المراكز',
    'orders.history': 'سجل الأوامر',

    // Themes & Settings
    'theme.mode': 'المظهر المرئي',
    'theme.dark': 'الوضع الليلي الكمي (Dark)',
    'theme.light': 'التيتانيوم المؤسسي (Light)',
    'theme.cyber': 'محطة السايبربانك',
    'lang.select': 'اللغة',
  },
};

/**
 * Bi-directional key aliases map: maps shortened keys to full keys and vice-versa
 */
const KEY_ALIASES: Record<string, string> = {
  'nav.whale_radar': 'nav.onchain_radar',
  'nav.onchain_radar': 'nav.whale_radar',
  'nav.intelligence': 'nav.ai_intelligence',
  'nav.ai_intelligence': 'nav.intelligence',
  'nav.risk_scanner': 'nav.ai_risk_scanner',
  'nav.ai_risk_scanner': 'nav.risk_scanner',
  'nav.copilot': 'nav.ai_copilot',
  'nav.ai_copilot': 'nav.copilot',
  'nav.bridge': 'nav.cross_chain',
  'nav.cross_chain': 'nav.bridge',
  'nav.explorer': 'nav.transactions',
  'nav.transactions': 'nav.explorer',
  'nav.security': 'nav.security_center',
  'nav.security_center': 'nav.security',
  'nav.developer': 'nav.developer_api',
  'nav.developer_api': 'nav.developer',
  'trade.limit': 'trade.limit_order',
  'trade.limit_order': 'trade.limit',
  'trade.market': 'trade.market_order',
  'trade.market_order': 'trade.market',
};

/**
 * Universal fallback dictionary for critical keys
 */
const UNIVERSAL_FALLBACKS: Record<string, { en: string; vi: string }> = {
  'wallet.balance': { en: 'Balance', vi: 'Số dư ví' },
  'trade.spot': { en: 'Spot', vi: 'Giao ngay' },
  'trade.perp': { en: 'Perpetuals', vi: 'Hợp đồng vô kỳ' },
  'trade.buy': { en: 'Buy', vi: 'Mua' },
  'trade.sell': { en: 'Sell', vi: 'Bán' },
  'trade.limit': { en: 'Limit', vi: 'Giới hạn' },
  'trade.market': { en: 'Market', vi: 'Thị trường' },
  'orders.open': { en: 'Open Orders', vi: 'Lệnh Chờ Khớp' },
  'orders.positions': { en: 'Positions', vi: 'Vị Thế Mở' },
  'orders.history': { en: 'Order History', vi: 'Lịch Sử Lệnh' },
  'nav.whale_radar': { en: 'Whale Radar', vi: 'Radar Cá Voi' },
  'nav.intelligence': { en: 'Market Sentiment', vi: 'Tâm Lý Thị Trường' },
  'nav.analytics': { en: 'Analytics', vi: 'Phân Tích' },
  'nav.risk_scanner': { en: 'Token Risk Scanner', vi: 'Quét Rủi Ro Token' },
  'nav.copilot': { en: 'Portfolio Copilot', vi: 'Quản Lý Vốn' },
  'nav.bridge': { en: 'Cross-Chain Bridge', vi: 'Cầu Nối Đa Chuỗi' },
  'nav.explorer': { en: 'Tx Explorer', vi: 'Lịch Sử Giao Dịch' },
  'nav.security': { en: 'Security Center', vi: 'Trung Tâm An Ninh' },
  'nav.developer': { en: 'Developer API & SDK', vi: 'API & SDK Lập Trình Viên' },
};

/**
 * Smart Anti-Dot Humanizer:
 * Converts any unmapped dot-separated key (e.g. "wallet.balance", "trade.spot")
 * into a clean, capitalized human-readable string, strictly eliminating raw dot output.
 */
function humanizeDotKey(rawKey: string): string {
  if (!rawKey) return '';
  if (!rawKey.includes('.')) return rawKey;

  const parts = rawKey.split('.');
  const lastPart = parts[parts.length - 1];
  const namespace = parts[0].toLowerCase();

  if (namespace === 'wallet' && lastPart.toLowerCase() === 'balance') return 'Balance';
  if (namespace === 'orders') {
    const capitalized = lastPart.charAt(0).toUpperCase() + lastPart.slice(1).toLowerCase();
    return `${capitalized} Orders`;
  }
  if (namespace === 'trade') {
    return lastPart.charAt(0).toUpperCase() + lastPart.slice(1).toLowerCase();
  }

  return lastPart
    .split(/[_\-]+/)
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export const getTranslation = (lang: SupportedLanguage, key: string): string => {
  if (!key) return '';

  const table = TRANSLATIONS[lang] || TRANSLATIONS.en;

  // 1. Direct match in requested language
  if (table[key]) return table[key];

  // 2. Direct match in fallback English
  if (TRANSLATIONS.en[key]) return TRANSLATIONS.en[key];

  // 3. Case-insensitive match in requested language
  const lowerKey = key.toLowerCase();
  if (table[lowerKey]) return table[lowerKey];
  if (TRANSLATIONS.en[lowerKey]) return TRANSLATIONS.en[lowerKey];

  // 4. Alias lookup
  const alias = KEY_ALIASES[key] || KEY_ALIASES[lowerKey];
  if (alias) {
    if (table[alias]) return table[alias];
    if (TRANSLATIONS.en[alias]) return TRANSLATIONS.en[alias];
  }

  // 5. Universal fallbacks map
  const universal = UNIVERSAL_FALLBACKS[lowerKey] || (alias ? UNIVERSAL_FALLBACKS[alias.toLowerCase()] : undefined);
  if (universal) {
    if (lang === 'vi' && universal.vi) return universal.vi;
    return universal.en;
  }

  // 6. Fail-Safe Anti-Dot Formatter:
  // If the key contains a dot (e.g. "wallet.balance"), NEVER return raw key with dot.
  // Transform it into clean human text.
  if (key.includes('.')) {
    return humanizeDotKey(key);
  }

  return key;
};
