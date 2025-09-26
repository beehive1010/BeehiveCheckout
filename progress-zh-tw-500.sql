-- zh-tw 进度保存 (500/500)
BEGIN;

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.activity.nftClaimed', 'zh-tw', 'NFT 聲稱', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.activity.rewardAmount', 'zh-tw', '+{{amount}} 獎金', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.activity.rewardReceived', 'zh-tw', '收到的獎勵', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.activity.userJoined', 'zh-tw', '使用者加入您的網路', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.balances.bccFree', 'zh-tw', 'BCC (免費)', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.balances.bccLocked', 'zh-tw', 'BCC (鎖定)', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.downlineMatrix.placement', 'zh-tw', '安置', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.downlineMatrix.title', 'zh-tw', '下線矩陣', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.downlineNetwork.title', 'zh-tw', '您的下線網路', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.globalStats.highestLevel', 'zh-tw', '最高等級', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.globalStats.members', 'zh-tw', '會員', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.globalStats.membersByLevel', 'zh-tw', '各級會員', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.globalStats.pendingRewards', 'zh-tw', '待定獎勵', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.globalStats.title', 'zh-tw', '全球統計', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.globalStats.totalMembers', 'zh-tw', '會員總數', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.globalStats.totalRewardsPaid', 'zh-tw', '已付獎金總額', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.activateRequiredLevel', 'zh-tw', '啟動所需層級，立即進行索賠', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.badge', 'zh-tw', '教育性', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.bccPhasesPreview', 'zh-tw', 'BCC 階段預覽', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.bccRewards', 'zh-tw', 'BCC 賭注', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.bccRewardsDescription', 'zh-tw', '瞭解以會員啟動里程碑為基礎的四階段 BCC 發放系統。 獎勵逐步減少，以確保長期的可持續性。', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.bccRewardsDetailDescription', 'zh-tw', '四階段 BCC 釋放系統，獎勵依據啟動會員總數遞減。', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.bccRewardsDetailTitle', 'zh-tw', 'BCC 賭注獎勵 - 發行時間表', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.bccRewardsMobileDesc', 'zh-tw', '以會員啟動里程碑為基礎的四階段 BCC 發放系統。 每個階段有不同的獎勵金額，並隨時間遞減。', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.bccRewardsSubtitle', 'zh-tw', 'BCC 發行獎勵', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.bccRewardsSystem', 'zh-tw', 'BCC 釋放系統', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.bccRewardsSystemDesc', 'zh-tw', '以會員啟動里程碑為基礎的四階段 BCC 發放系統。 獎勵逐步減少，以確保長期的可持續性。', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.bccRewardsTitle', 'zh-tw', 'BCC 發行獎勵', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.complete19LayerStructure', 'zh-tw', '完成 19 層獎勵結構', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.condition1', 'zh-tw', '會員層級提升', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.condition2', 'zh-tw', '根據升級等級觸發相應的獎勵', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.condition3', 'zh-tw', '每層可獲得多重獎勵', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.continuesToLayer19', 'zh-tw', '繼續到第 19 層', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.current', 'zh-tw', '當前', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.detailedRewardStructure', 'zh-tw', '詳細獎勵結構', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.eligibilityRules.firstSecondTitle', 'zh-tw', '第 1 及第 2 獎勵', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.eligibilityRules.importantTitle', 'zh-tw', '重要', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.eligibilityRules.thirdOnwardTitle', 'zh-tw', '3rd+ 獎勵', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.expiredRewardsRedistribute', 'zh-tw', '過期的獎勵將歸上述符合資格的會員所有', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.expiryRedistribution', 'zh-tw', '到期再分配', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.finalLayerReward', 'zh-tw', '最終層級獎勵 - 最高賺錢潛力', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.firstSecond', 'zh-tw', '第 1 及第 2 級', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.firstSecondRewards', 'zh-tw', '每層第一和第二獎勵', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.fourPhasesSystem', 'zh-tw', '4 相遞減鬆開系統', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.highestRewardLayer', 'zh-tw', '最高獎勵層', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.instantPayout', 'zh-tw', '如果符合資格，即時支付', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.instantRewards', 'zh-tw', '即時獎賞', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.layer11to15Rewards', 'zh-tw', '第 11-15 層獎勵', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.layer16to19Rewards', 'zh-tw', '第 16-19 層獎勵', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.layer19Amount', 'zh-tw', '第 19 層：1,000 美元（第 19 層 NFT 價格）', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.layer19RewardMax', 'zh-tw', '第 19 層獎勵 (最高)', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.layer1Amount', 'zh-tw', '第 1 層： $100（第 1 層 NFT 價格）', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.layer1to5Rewards', 'zh-tw', '第 1-5 層獎勵', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.layer2Amount', 'zh-tw', '第 2 層：150 美元（第 2 層 NFT 價格）', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.layer6to10Rewards', 'zh-tw', '第 6-10 層獎勵', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.layerRewards', 'zh-tw', '層級獎勵', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.layerRewardsDescription', 'zh-tw', '每層都有特定的資格要求和獎勵金額。', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.layerRewardsDetailDescription', 'zh-tw', '全面說明 19 層獎金系統的資格規則和支付機制。', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.layerRewardsDetailTitle', 'zh-tw', '圖層獎勵 - 完整指南', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.layerRewardsDialogDesc', 'zh-tw', '全面說明 19 層獎勵制度，包括資格規則和支付機制', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.layerRewardsDialogTitle', 'zh-tw', '層數獎勵 - 完整的 19 層細節', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.layerRewardsMobileDesc', 'zh-tw', '當矩阵中的會員升級會員等級時，會觸發相應的層級獎勵。總共 19 個層級，每個層級的獎勵金額為相應層級 NFT 價格的 100%。', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.layerRewardsPreview', 'zh-tw', '層級獎勵預覽', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.layerRewardsSubtitle', 'zh-tw', '19-Layer Reward System', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.layerRewardsSummary', 'zh-tw', 'Layer Rewards Summary', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.layerRewardsSystem', 'zh-tw', 'Layer Rewards System', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.layerRewardsSystemDesc', 'zh-tw', 'Layer rewards are triggered by member upgrades in your downline. Layer 1 rewards are based on direct referrals but display through matrix hierarchy. Layers 2-19 follow standard matrix placement with recursive tree view up to 19 levels.', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.layerRewardsTitle', 'zh-tw', 'Layer Rewards System', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.layerRewardText', 'zh-tw', 'Layer {{layer}} Reward', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.layerText', 'zh-tw', 'Layer {{layer}}', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.levelMustBeGreater', 'zh-tw', 'Your level must be greater than the layer level', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.levelMustEqualLayer', 'zh-tw', 'Your level must equal the layer level to receive instantly', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.levelRequirementsNotMet', 'zh-tw', 'If level requirements not met, reward enters pending state', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.levelUpgradeTriggered', 'zh-tw', 'Level {{level}} upgrade triggered', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.liveAnimation', 'zh-tw', 'Live Animation', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.matrixDescription', 'zh-tw', 'This visualization shows how the matrix structure works. When members upgrade levels in your layers, it triggers corresponding layer rewards.', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.matrixPreview', 'zh-tw', 'Matrix Structure Preview', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.matrixPrinciple', 'zh-tw', 'Matrix Structure Principle:', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.matrixPrincipleDesc', 'zh-tw', 'BEEHIVE uses a 19-layer 3×3 matrix system, with each level representing one layer in the matrix.', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.matrixStructureDesc', 'zh-tw', 'Each level represents a layer in the matrix. When members in your layer upgrade their membership level, it triggers layer rewards based on the upgraded level.', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.matrixStructureExplanation', 'zh-tw', 'Matrix Structure Explanation', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.matrixStructureTitle', 'zh-tw', 'Matrix Structure', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.matrixVisualization', 'zh-tw', 'Matrix Structure Visualization', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.max', 'zh-tw', 'MAX', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.maxLayer', 'zh-tw', 'Max', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.nftPrice', 'zh-tw', 'NFT Price', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.nftPricePercent', 'zh-tw', '100% NFT price', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.ofLevel19NftPrice', 'zh-tw', 'of Level 19 NFT price', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.ofLevelNftPrice', 'zh-tw', 'of Level {{level}} NFT price', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.pendingSystem.immediateTitle', 'zh-tw', 'Immediate Claim', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.pendingSystem.notEligibleTitle', 'zh-tw', 'Not Eligible', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.pendingSystem.rollupTitle', 'zh-tw', 'Roll-up System', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.pendingSystem.windowTitle', 'zh-tw', '72-Hour Window', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.phase', 'zh-tw', 'Phase', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.releaseMechanism', 'zh-tw', 'BCC Release Mechanism', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.rewardAmounts', 'zh-tw', 'Reward Amounts:', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.seventyTwoHourPending', 'zh-tw', '72-Hour Pending', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.subtitle', 'zh-tw', 'Learn about Layer Rewards and BCC Release Mechanisms', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.thirdPlus', 'zh-tw', '3rd+', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('dashboard.information.thirdPlusRewards', 'zh-tw', '3rd+ Rewards per Layer', 'dashboard', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();
COMMIT;