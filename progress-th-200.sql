-- th 进度保存 (200/200)
BEGIN;

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccPurchase.web3Buy.step1', 'th', '1. เชื่อมต่อกระเป๋าเงินของคุณกับโทเค็นที่รองรับใดก็ได้', 'bccPurchase', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccPurchase.web3Buy.step2', 'th', '2. เลือกจำนวนและโทเค็นที่คุณต้องการใช้จ่าย', 'bccPurchase', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccPurchase.web3Buy.step3', 'th', '3. สับเปลี่ยนโดยอัตโนมัติเป็น USDC และเครดิต BCC', 'bccPurchase', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccPurchase.web3Buy.step4', 'th', '4. โทเคนจะปรากฏในยอดเงินของคุณทันที', 'bccPurchase', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccPurchase.web3Buy.supportedNetworks', 'th', 'เครือข่ายที่รองรับ', 'bccPurchase', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccPurchase.web3Buy.title', 'th', 'การซื้อแบบสลับลำดับของ ThirdWeb', 'bccPurchase', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccPurchase.web3Buy.useTraditional', 'th', 'ใช้วิธีดั้งเดิมแทน', 'bccPurchase', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccPurchase.web3Shuffle', 'th', 'Web3 Shuffle', 'bccPurchase', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccPurchase.web3ShuffleDesc', 'th', 'การซื้อคริปโตโดยตรงจากคริปโตผ่านสะพาน thirdweb', 'bccPurchase', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccPurchase.yes', 'th', 'ใช่', 'bccPurchase', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccPurchase.youllReceive', 'th', 'คุณจะได้รับ:', 'bccPurchase', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccPurchase.youPay', 'th', 'คุณจ่าย:', 'bccPurchase', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccPurchase.youReceive', 'th', 'คุณได้รับ:', 'bccPurchase', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('buttons.back', 'th', 'กลับ', 'buttons', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('buttons.claim', 'th', 'การเรียกร้อง', 'buttons', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('buttons.connect_wallet', 'th', 'เชื่อมต่อกระเป๋าเงิน', 'buttons', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('buttons.continue', 'th', 'ดำเนินการต่อ', 'buttons', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('buttons.copy', 'th', 'คัดลอก', 'buttons', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('buttons.disconnect', 'th', 'ตัดการเชื่อมต่อ', 'buttons', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('buttons.finish', 'th', 'เสร็จสิ้น', 'buttons', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('buttons.next', 'th', 'ถัดไป', 'buttons', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('buttons.refresh', 'th', 'รีเฟรช', 'buttons', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('buttons.try_again', 'th', 'ลองอีกครั้ง', 'buttons', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('buttons.view_transaction', 'th', 'ดูรายการธุรกรรม', 'buttons', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('buttons.withdraw', 'th', 'ถอน', 'buttons', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('claim.referrerMustBeRegistered', 'th', 'ผู้อ้างอิงต้องเป็นผู้ใช้ที่ลงทะเบียนบนแพลตฟอร์ม', 'claim', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('claimableRewards.claim', 'th', 'เรียกร้อง ${amount}', 'claimableRewards', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('claimableRewards.claimableLayerRewards', 'th', 'รางวัลเลเยอร์ที่สามารถเรียกร้องได้', 'claimableRewards', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('claimableRewards.claimAllRewards', 'th', 'รับรางวัลทั้งหมด ({จำนวน} USDT)', 'claimableRewards', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('claimableRewards.claimFailed', 'th', 'การเรียกร้องล้มเหลว', 'claimableRewards', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('claimableRewards.claimFailedDescription', 'th', 'ไม่สามารถขอรับรางวัลได้ กรุณาลองอีกครั้ง', 'claimableRewards', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('claimableRewards.claiming', 'th', 'กำลังขอรับ...', 'claimableRewards', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('claimableRewards.claimingRewards', 'th', 'กำลังขอรับรางวัล...', 'claimableRewards', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('claimableRewards.connectWallet', 'th', 'เชื่อมต่อกระเป๋าเงินของคุณเพื่อดูรางวัลที่สามารถเรียกร้องได้', 'claimableRewards', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('claimableRewards.connectWalletToClaim', 'th', 'กรุณาเชื่อมต่อกระเป๋าเงินของคุณเพื่อรับรางวัล', 'claimableRewards', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('claimableRewards.created', 'th', 'สร้างเมื่อ: {date}', 'claimableRewards', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('claimableRewards.currentlyLevel', 'th', '(ปัจจุบัน L{ระดับ})', 'claimableRewards', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('claimableRewards.expired', 'th', 'หมดอายุ', 'claimableRewards', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('claimableRewards.expires', 'th', 'หมดอายุ: {date}', 'claimableRewards', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('claimableRewards.from', 'th', 'จาก: {ที่อยู่}', 'claimableRewards', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('claimableRewards.howRewardsWork', 'th', 'วิธีการทำงานของรางวัลตามชั้น:', 'claimableRewards', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('claimableRewards.layer', 'th', 'เลเยอร์ {หมายเลข}', 'claimableRewards', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('claimableRewards.layerBasedRewards', 'th', 'รางวัลตามชั้น', 'claimableRewards', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('claimableRewards.loadingRewards', 'th', 'กำลังโหลดรางวัลของเลเยอร์...', 'claimableRewards', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('claimableRewards.noRewardsAvailable', 'th', 'ไม่มีรางวัลชั้นให้', 'claimableRewards', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('claimableRewards.noRewardsDescription', 'th', 'รางวัลเมทริกซ์แบบแบ่งชั้นของคุณจะปรากฏที่นี่เมื่อสมาชิกในสายงานของคุณอัปเกรดระดับของพวกเขา', 'claimableRewards', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('claimableRewards.pending', 'th', 'รอดำเนินการ', 'claimableRewards', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('claimableRewards.pendingRewardsLevelUp', 'th', 'รางวัลที่รอรับ (ต้องอัพเกรดระดับ)', 'claimableRewards', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('claimableRewards.pendingValue', 'th', 'มูลค่าที่รอการพิจารณา', 'claimableRewards', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('claimableRewards.readyToClaim', 'th', 'พร้อมที่จะเรียกร้อง', 'claimableRewards', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('claimableRewards.requiresLevel', 'th', 'ต้องการ L{ระดับ}', 'claimableRewards', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('claimableRewards.rewardClaimedDescription', 'th', '{จำนวน} {สกุลเงิน} ถูกเพิ่มในยอดเงินของคุณ {ข้อความ}', 'claimableRewards', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('claimableRewards.rewardClaimedSuccess', 'th', 'ได้รับรางวัลสำเร็จแล้ว! 🎉', 'claimableRewards', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('claimableRewards.rewardRules.layerRewards', 'th', 'รางวัลเลเยอร์ 1-19 จากการอัปเกรดดาวน์ไลน์เมทริกซ์', 'claimableRewards', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('claimableRewards.rewardRules.protection', 'th', 'ข้อกำหนดระดับช่วยปกป้องการกระจายรางวัล', 'claimableRewards', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('claimableRewards.rewardRules.rollup', 'th', 'การสรุปผลอัตโนมัติไปยังผู้แนะนำที่มีคุณสมบัติเหมาะสมถัดไป', 'claimableRewards', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('claimableRewards.rewardRules.timer', 'th', 'ตัวจับเวลา 72 ชั่วโมงสำหรับรางวัลที่รอดำเนินการ', 'claimableRewards', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('claimableRewards.rollupInProgress', 'th', '⏰ หมดอายุ - กำลังรวบรวมข้อมูล', 'claimableRewards', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('claimableRewards.root', 'th', 'ราก', 'claimableRewards', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('claimableRewards.timeRemaining', 'th', '⏰ {time} เหลือ', 'claimableRewards', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('claimableRewards.triggerLabel', 'th', 'L{ระดับ} ไตรเกอร์', 'claimableRewards', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('claimableRewards.viewDetails', 'th', 'ดูรายละเอียด', 'claimableRewards', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('claimableRewards.walletNotConnected', 'th', 'กระเป๋าเงินไม่เชื่อมต่อ', 'claimableRewards', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('common.accessDenied', 'th', 'การเข้าถึงถูกปฏิเสธ', 'common', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('common.active', 'th', 'แอคทีฟ', 'common', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('common.address_copied', 'th', 'คัดลอกที่อยู่', 'common', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('common.allPartners', 'th', 'พันธมิตรทุกท่าน', 'common', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('common.authenticationFailed', 'th', 'การยืนยันตัวตนล้มเหลว', 'common', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('common.back', 'th', 'กลับ', 'common', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('common.block_explorer', 'th', 'บล็อก เอ็กซ์พลอเรอร์', 'common', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('common.caution', 'th', 'คำเตือน', 'common', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('common.claim_failed', 'th', 'การเรียกร้องล้มเหลว', 'common', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('common.close', 'th', 'ปิด', 'common', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('common.comingSoon', 'th', 'กำลังจะมาถึงเร็ว ๆ นี้', 'common', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('common.confirm', 'th', 'ยืนยัน', 'common', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('common.connected', 'th', 'เชื่อมต่อ', 'common', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('common.connecting', 'th', 'กำลังเชื่อมต่อ...', 'common', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('common.copy_address', 'th', 'คัดลอกที่อยู่', 'common', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('common.critical', 'th', 'วิกฤต', 'common', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('common.disconnected', 'th', 'ไม่เชื่อมต่อ', 'common', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('common.error', 'th', 'ข้อผิดพลาด', 'common', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('common.errorLoading', 'th', 'เกิดข้อผิดพลาดในการโหลด', 'common', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('common.expired', 'th', 'หมดอายุ', 'common', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('common.failed_status', 'th', 'ล้มเหลว', 'common', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('common.featuredPartners', 'th', 'พันธมิตรที่แนะนำ', 'common', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('common.healthy', 'th', 'สุขภาพดี', 'common', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('common.hide_details', 'th', 'ซ่อนรายละเอียด', 'common', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('common.info', 'th', 'ข้อมูล', 'common', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('common.loading', 'th', 'กำลังโหลด...', 'common', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('common.loading_status', 'th', 'กำลังโหลด...', 'common', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('common.maintenance', 'th', 'การบำรุงรักษา', 'common', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('common.nft_claimed_successfully', 'th', 'NFT ได้รับการอ้างสิทธิ์สำเร็จแล้ว!', 'common', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('common.no_wallet_address', 'th', 'ไม่มีที่อยู่กระเป๋าเงิน', 'common', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('common.noRecentErrors', 'th', 'ไม่มีข้อผิดพลาดล่าสุด', 'common', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('common.pageNotFound', 'th', 'ไม่พบหน้า', 'common', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('common.pending', 'th', 'รอดำเนินการ', 'common', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('common.refresh', 'th', 'รีเฟรช', 'common', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('common.retry', 'th', 'ลองอีกครั้ง', 'common', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('common.safe', 'th', 'ปลอดภัย', 'common', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('common.save', 'th', 'บันทึก', 'common', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();
COMMIT;