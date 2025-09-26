-- zh-tw 进度保存 (200/437)
BEGIN;

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('discover.categories.nft', 'zh-tw', 'NFT', 'discover', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('discover.categories.social', 'zh-tw', '社會', 'discover', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('discover.categories.title', 'zh-tw', '類別', 'discover', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('discover.categories.tools', 'zh-tw', '工具', 'discover', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('discover.categories.yield', 'zh-tw', '產量', 'discover', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('discover.chains.arbitrum', 'zh-tw', '仲裁', 'discover', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('discover.chains.avalanche', 'zh-tw', '雪崩', 'discover', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('discover.chains.bsc', 'zh-tw', 'BSC', 'discover', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('discover.chains.ethereum', 'zh-tw', '以太坊', 'discover', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('discover.chains.optimism', 'zh-tw', '樂觀', 'discover', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('discover.chains.polygon', 'zh-tw', '多邊形', 'discover', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('discover.dapps.axieinfinity', 'zh-tw', 'Axie Infinity', 'discover', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('discover.dapps.axieinfinityDesc', 'zh-tw', '玩家在遊戲中對戰、繁殖和交易稱為 Axies 的奇幻生物。', 'discover', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('discover.dapps.beehive', 'zh-tw', '蜂巢平台', 'discover', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('discover.dapps.beehiveDesc', 'zh-tw', 'Web3 會員平台，提供 19 級進階、3×3 矩陣獎勵和教育生態系統', 'discover', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('discover.dapps.compound', 'zh-tw', '複合', 'discover', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('discover.dapps.compoundDesc', 'zh-tw', '用於賺取加密資產利息的算術貨幣市場協議', 'discover', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('discover.dapps.matrixRewards', 'zh-tw', '矩陣獎勵', 'discover', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('discover.dapps.matrixRewardsDesc', 'zh-tw', 'Beehive 的 3×3 矩陣系統，可透過推薦網路賺取被動收入', 'discover', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('discover.dapps.opensea', 'zh-tw', 'OpenSea', 'discover', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('discover.dapps.openseaDesc', 'zh-tw', '全球最大的買賣、交易數位資產的 NFT 市場', 'discover', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('discover.dapps.pancakeswap', 'zh-tw', '煎餅交換', 'discover', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('discover.dapps.pancakeswapDesc', 'zh-tw', 'BSC 鏈上受歡迎的 DEX，具有農場、彩池和彩票功能', 'discover', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('discover.dapps.uniswap', 'zh-tw', 'Uniswap', 'discover', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('discover.dapps.uniswapDesc', 'zh-tw', '提供代幣交換和流動性的領先分散式交易所', 'discover', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('discover.ecosystem.education.certificates', 'zh-tw', '證書', 'discover', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('discover.ecosystem.education.courses', 'zh-tw', '課程', 'discover', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('discover.ecosystem.education.subtitle', 'zh-tw', 'Web3 學習與技能發展', 'discover', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('discover.ecosystem.education.title', 'zh-tw', '教育中心', 'discover', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('discover.ecosystem.matrix.rewards', 'zh-tw', '即時獎賞', 'discover', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('discover.ecosystem.matrix.structure', 'zh-tw', '自動安置', 'discover', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('discover.ecosystem.matrix.subtitle', 'zh-tw', '分散式推薦和獎勵系統', 'discover', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('discover.ecosystem.matrix.title', 'zh-tw', '3×3 矩陣', 'discover', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('discover.ecosystem.membership.levels', 'zh-tw', '19 級', 'discover', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('discover.ecosystem.membership.members', 'zh-tw', '活躍會員', 'discover', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('discover.ecosystem.membership.subtitle', 'zh-tw', '從戰士到神話巔峰的 19 級進階', 'discover', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('discover.ecosystem.membership.title', 'zh-tw', '會員系統', 'discover', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('discover.ecosystem.subtitle', 'zh-tw', '原生平台服務與工具', 'discover', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('discover.ecosystem.title', 'zh-tw', '蜂巢生態系統', 'discover', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('discover.featured', 'zh-tw', '精選', 'discover', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('discover.networks.subtitle', 'zh-tw', '多鏈生態系統支援', 'discover', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('discover.networks.title', 'zh-tw', '支援的網路', 'discover', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('discover.news.bridge.description', 'zh-tw', '利用我們全新的橋接技術，在多個區塊鏈間無縫轉移資產', 'discover', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('discover.news.bridge.title', 'zh-tw', '多鏈橋接整合', 'discover', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('discover.news.education.description', 'zh-tw', '區塊鏈開發和 DeFi 協定的進階認證課程現已推出', 'discover', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('discover.news.education.title', 'zh-tw', '新的 Web3 認證計畫', 'discover', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('discover.news.matrix30.description', 'zh-tw', '體驗我們升級的矩陣系統，改善獎勵分配，加快處理時間', 'discover', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('discover.news.matrix30.title', 'zh-tw', 'Matrix 3.0 推出 - 強化獎勵', 'discover', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('discover.news.minutes', 'zh-tw', '分鐘閱讀', 'discover', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('discover.news.readMore', 'zh-tw', '閱讀更多', 'discover', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('discover.news.subtitle', 'zh-tw', '隨時掌握 Web3 的最新發展', 'discover', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('discover.news.title', 'zh-tw', '最新消息', 'discover', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('discover.search.clear', 'zh-tw', '清除', 'discover', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('discover.search.placeholder', 'zh-tw', '搜尋 DApps、協定或服務...', 'discover', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('discover.search.recent', 'zh-tw', '最近', 'discover', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('discover.search.trending', 'zh-tw', '趨勢', 'discover', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('discover.searchPlaceholder', 'zh-tw', '搜尋合作夥伴...', 'discover', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('discover.stats.protocols', 'zh-tw', '整合通訊協定', 'discover', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('discover.stats.title', 'zh-tw', '平台統計', 'discover', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('discover.stats.totalValue', 'zh-tw', '鎖定總值', 'discover', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('discover.stats.transactions', 'zh-tw', '交易總額', 'discover', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('discover.stats.users', 'zh-tw', '活躍使用者', 'discover', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('discover.subtitle', 'zh-tw', '探索 Web3 DApps 和服務', 'discover', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('discover.title', 'zh-tw', '發現', 'discover', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('discover.trending', 'zh-tw', '趨勢', 'discover', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('education.allLevels', 'zh-tw', '所有等級', 'education', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('education.buttons.claimFree', 'zh-tw', '申請免費課程', 'education', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('education.buttons.completed', 'zh-tw', '已完成', 'education', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('education.buttons.continue', 'zh-tw', '繼續', 'education', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('education.buttons.enrolled', 'zh-tw', '已註冊', 'education', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('education.buttons.enrollNow', 'zh-tw', '立即註冊', 'education', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('education.buttons.getAccess', 'zh-tw', '取得存取權限', 'education', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('education.buttons.levelRequired', 'zh-tw', '所需等級', 'education', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('education.buttons.purchaseCourse', 'zh-tw', '購買課程', 'education', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('education.buttons.startLearning', 'zh-tw', '開始學習', 'education', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('education.buttons.viewDetails', 'zh-tw', '檢視詳細資訊', 'education', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('education.completed', 'zh-tw', '已完成', 'education', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('education.continue', 'zh-tw', '繼續學習', 'education', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('education.courseDetails.courseContent', 'zh-tw', '課程內容', 'education', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('education.courseDetails.curriculum', 'zh-tw', '課程', 'education', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('education.courseDetails.instructor', 'zh-tw', '導師', 'education', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('education.courseDetails.joinLink', 'zh-tw', '參加會議', 'education', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('education.courseDetails.lessons', 'zh-tw', '課程', 'education', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('education.courseDetails.meetingId', 'zh-tw', '會議 ID', 'education', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('education.courseDetails.overview', 'zh-tw', '課程總覽', 'education', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('education.courseDetails.password', 'zh-tw', '密碼', 'education', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('education.courseDetails.requirements', 'zh-tw', '要求', 'education', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('education.courseDetails.whatYouLearn', 'zh-tw', '您將學到', 'education', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('education.courseDetails.zoomDetails', 'zh-tw', 'Zoom 會議詳細資訊', 'education', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('education.courseType.online', 'zh-tw', '線上直播', 'education', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('education.courseType.video', 'zh-tw', '自學視訊', 'education', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('education.duration', 'zh-tw', '時間長度', 'education', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('education.enroll.error.description', 'zh-tw', '無法註冊課程，請重試。', 'education', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('education.enroll.error.title', 'zh-tw', '註冊失敗', 'education', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('education.enroll.success.description', 'zh-tw', '您現在可以進入本課程。', 'education', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('education.enroll.success.title', 'zh-tw', '註冊成功！', 'education', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('education.enrolling', 'zh-tw', '報名...', 'education', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('education.errors.accessDenied', 'zh-tw', '拒絕存取 - 層級不足或 BCC', 'education', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('education.errors.courseNotFound', 'zh-tw', '找不到課程', 'education', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('education.errors.loadingError', 'zh-tw', '載入課程資料失敗', 'education', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();
COMMIT;