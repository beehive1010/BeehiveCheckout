-- th 翻译补全 (生成时间: 2025-09-26T11:14:10.567Z)
-- 翻译数量: 200 个

BEGIN;


INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('auth.authenticationSuccessful', 'th', 'การยืนยันตัวตนสำเร็จ!', 'auth', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('auth.backToLogin', 'th', 'กลับสู่หน้าเข้าสู่ระบบ', 'auth', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('auth.completingAuthentication', 'th', 'กำลังดำเนินการยืนยันตัวตน...', 'auth', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('auth.redirectingToDashboard', 'th', 'กำลังเปลี่ยนเส้นทางไปยังแดชบอร์ดของคุณ...', 'auth', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccBalance.activationBonus', 'th', 'โบนัสการเปิดใช้งาน', 'bccBalance', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccBalance.activationBonusDesc', 'th', 'ระดับสมาชิก 1 ปลดล็อก', 'bccBalance', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccBalance.activations', 'th', 'การเปิดใช้งาน', 'bccBalance', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccBalance.balanceBreakdown', 'th', 'การวิเคราะห์สมดุล', 'bccBalance', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccBalance.claiming', 'th', 'กำลังขอรับ...', 'bccBalance', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccBalance.claimRewards', 'th', 'รับรางวัล', 'bccBalance', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccBalance.currentPhase', 'th', 'ระยะปัจจุบัน', 'bccBalance', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccBalance.description', 'th', 'รายละเอียดยอดคงเหลือและสถานะความพร้อมใช้งานของเหรียญ BeeHive Credit', 'bccBalance', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccBalance.infoTitle', 'th', 'ข้อมูลความสมดุล', 'bccBalance', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccBalance.levelUnlock', 'th', 'ปลดล็อกระดับ', 'bccBalance', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccBalance.levelUnlockDesc', 'th', 'รางวัล NFT ระดับ {{level}}', 'bccBalance', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccBalance.locked', 'th', 'ล็อก', 'bccBalance', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccBalance.lockedInfo', 'th', 'BCC ที่จะปลดล็อกเมื่อเงื่อนไขที่กำหนดครบถ้วน', 'bccBalance', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccBalance.nextPhaseAt', 'th', 'ขั้นตอนต่อไป ที่', 'bccBalance', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccBalance.pending', 'th', 'รอดำเนินการ', 'bccBalance', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccBalance.rewardClaims', 'th', 'การเรียกร้องรางวัล', 'bccBalance', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccBalance.rewardClaimsDesc', 'th', 'จากรางวัลชั้น', 'bccBalance', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccBalance.tierInfo', 'th', 'ข้อมูลระดับชั้น', 'bccBalance', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccBalance.tierInfoDesc', 'th', 'จำนวนเงินที่ปลดล็อกของ BCC ถูกกำหนดโดยระดับขั้นของคุณและจะลดลงครึ่งหนึ่งในแต่ละขั้นใหม่', 'bccBalance', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccBalance.tierMultiplier', 'th', 'ตัวคูณระดับ', 'bccBalance', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccBalance.title', 'th', 'ยอดคงเหลือ BCC', 'bccBalance', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccBalance.totalBalance', 'th', 'ยอดคงเหลือทั้งหมด (ทุกประเภท)', 'bccBalance', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccBalance.totalLockedPhase', 'th', 'จำนวนที่ถูกล็อคทั้งหมด (เฟส)', 'bccBalance', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccBalance.transferable', 'th', 'โอนได้', 'bccBalance', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccBalance.transferableDesc', 'th', 'พร้อมใช้จ่าย', 'bccBalance', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccBalance.transferableInfo', 'th', 'สามารถใช้ได้ทันทีสำหรับการซื้อและการโอน', 'bccBalance', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccBalance.transferBcc', 'th', 'โอนสำเนาถึง', 'bccBalance', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccBalance.transferring', 'th', 'กำลังโอนย้าย...', 'bccBalance', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccDisplay.availableBcc', 'th', 'BCC ที่พร้อมใช้งาน', 'bccDisplay', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccDisplay.bccReleased', 'th', '+{{จำนวน}} BCC ถูกปล่อยแล้ว', 'bccDisplay', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccDisplay.every72Hours', 'th', 'ทุก 72 ชั่วโมง', 'bccDisplay', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccDisplay.latestRelease', 'th', 'การปล่อยเวอร์ชันล่าสุด', 'bccDisplay', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccDisplay.lockedBcc', 'th', 'ล็อก BCC', 'bccDisplay', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccDisplay.nextRelease', 'th', 'การเผยแพร่ BCC ครั้งถัดไป', 'bccDisplay', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccDisplay.noLockedBcc', 'th', 'ไม่มีการล็อก BCC. อัปเกรดระดับสมาชิกของคุณเพื่อปลดล็อก BCC เพิ่มเติม!', 'bccDisplay', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccDisplay.progressTarget', 'th', 'ความคืบหน้าในการปลดล็อก BCC อย่างเต็มรูปแบบ (เป้าหมาย 10,000 BCC)', 'bccDisplay', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccDisplay.releaseReason', 'th', 'เหตุผล: {{reason}}', 'bccDisplay', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccDisplay.scheduledRelease', 'th', 'การปล่อยตามกำหนดเวลา 72 ชั่วโมง', 'bccDisplay', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccDisplay.totalUnlockedProgress', 'th', 'ความคืบหน้าทั้งหมดที่ปลดล็อกแล้ว', 'bccDisplay', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccDisplay.totalUsed', 'th', 'จำนวนที่ใช้แล้วทั้งหมด', 'bccDisplay', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccDisplay.unableToLoad', 'th', 'ไม่สามารถโหลดยอดคงเหลือ BCC ได้', 'bccDisplay', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccDisplay.willBeReleased', 'th', '{{amount}} BCC จะถูกปล่อย', 'bccDisplay', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccPurchase.addedToBalance', 'th', 'เพิ่มเข้าในยอดเงินของคุณ', 'bccPurchase', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccPurchase.afterSending', 'th', 'หลังจากส่งการชำระเงินแล้ว กรุณาคลิกปุ่มยืนยันด้านล่าง โทเค็น BCC ของคุณจะได้รับการเครดิตภายใน {{time}}', 'bccPurchase', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccPurchase.amountToPay', 'th', 'จำนวนเงินที่ต้องชำระ:', 'bccPurchase', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccPurchase.availableForSpending', 'th', 'สามารถใช้ได้สำหรับการใช้จ่ายบน NFT และคอร์ส', 'bccPurchase', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccPurchase.backToConfig', 'th', 'กลับไปที่การกำหนดค่า', 'bccPurchase', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccPurchase.browseNfts', 'th', 'เรียกดู NFT และหลักสูตร', 'bccPurchase', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccPurchase.buyMoreBcc', 'th', 'ซื้อ BCC เพิ่ม', 'bccPurchase', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccPurchase.chainId', 'th', 'รหัสโซ่: {{id}}', 'bccPurchase', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccPurchase.companyWallet', 'th', 'กระเป๋าเงินบริษัท:', 'bccPurchase', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccPurchase.completePayment', 'th', 'กรุณาชำระเงินให้ครบถ้วนเพื่อรับโทเค็น BCC', 'bccPurchase', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccPurchase.confirmingPayment', 'th', 'เรากำลังยืนยันการชำระเงินของคุณและกำลังเครดิตโทเค็น BCC ของคุณ...', 'bccPurchase', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccPurchase.confirmPaymentSent', 'th', 'ยืนยันการชำระเงินแล้ว', 'bccPurchase', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccPurchase.connectWallet', 'th', 'เชื่อมต่อกระเป๋าเงินของคุณเพื่อซื้อโทเค็น BCC', 'bccPurchase', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccPurchase.createOrder', 'th', 'สร้างใบสั่งซื้อ', 'bccPurchase', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccPurchase.creatingOrder', 'th', 'กำลังสร้างระเบียบ...', 'bccPurchase', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccPurchase.currentBalance', 'th', 'ยอดคงเหลือปัจจุบันของ BCC', 'bccPurchase', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccPurchase.directTransfer', 'th', 'โอนโดยตรง', 'bccPurchase', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccPurchase.enterAmount', 'th', 'ป้อนจำนวน USDC', 'bccPurchase', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccPurchase.estimatedTime', 'th', 'เวลาการประมวลผลที่ประมาณ: {{time}}', 'bccPurchase', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccPurchase.exchangeRate', 'th', 'อัตราแลกเปลี่ยน: 1 USDC = {{rate}} BCC', 'bccPurchase', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccPurchase.loadingOptions', 'th', 'กำลังโหลดตัวเลือกการซื้อ...', 'bccPurchase', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccPurchase.maxAmount', 'th', 'แม็กซ์: ${{amount}} USDC', 'bccPurchase', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccPurchase.minAmount', 'th', 'ขั้นต่ำ: ${{amount}} USDC', 'bccPurchase', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccPurchase.network', 'th', 'เครือข่าย:', 'bccPurchase', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccPurchase.no', 'th', 'ไม่', 'bccPurchase', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccPurchase.orderCreated', 'th', 'สร้างใบสั่งซื้อ', 'bccPurchase', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccPurchase.orderId', 'th', 'หมายเลขคำสั่งซื้อ:', 'bccPurchase', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccPurchase.paymentMethod', 'th', 'วิธีการชำระเงิน', 'bccPurchase', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccPurchase.paymentNetwork', 'th', 'เครือข่ายการชำระเงิน', 'bccPurchase', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccPurchase.payWithUsdc', 'th', 'ชำระเงินด้วย USDC เพื่อรับโทเค็น BCC สำหรับการซื้อบนแพลตฟอร์ม', 'bccPurchase', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccPurchase.processingPayment', 'th', 'กำลังดำเนินการชำระเงิน', 'bccPurchase', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccPurchase.purchaseAmount', 'th', 'จำนวนเงินซื้อ (USDC)', 'bccPurchase', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccPurchase.purchaseCompleted', 'th', 'การซื้อเสร็จสมบูรณ์! 🎉', 'bccPurchase', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccPurchase.purchaseMethod', 'th', 'วิธีการซื้อ', 'bccPurchase', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccPurchase.purchaseTokens', 'th', 'ซื้อโทเค็น BCC', 'bccPurchase', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccPurchase.sendExactly', 'th', 'ส่งจำนวน {{amount}} USDC ไปยังที่อยู่กระเป๋าเงินของบริษัทข้างต้นบนเครือข่าย {{network}}', 'bccPurchase', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccPurchase.shuffleSupport', 'th', 'การสลับการสนับสนุน: {{support}}', 'bccPurchase', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccPurchase.thirdwebShuffle', 'th', 'Thirdweb Shuffle (แนะนำ)', 'bccPurchase', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccPurchase.tokensCredited', 'th', 'โทเค็น BCC ของคุณได้ถูกเครดิตเข้าบัญชีของคุณเรียบร้อยแล้ว', 'bccPurchase', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccPurchase.traditional', 'th', 'แบบดั้งเดิม', 'bccPurchase', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccPurchase.traditionalDesc', 'th', 'การโอน USDC ด้วยตนเองพร้อมการยืนยันคำสั่ง', 'bccPurchase', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccPurchase.usdcContract', 'th', 'สัญญา USDC: {{contract}}', 'bccPurchase', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccPurchase.web3Buy.autoCredited', 'th', 'เครดิตอัตโนมัติ', 'bccPurchase', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccPurchase.web3Buy.connectWalletAndAmount', 'th', 'กรุณาเชื่อมต่อวอลเล็ตและตั้งค่าจำนวนเงินที่ต้องการซื้อ', 'bccPurchase', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccPurchase.web3Buy.description', 'th', 'การแปลงสกุลเงินดิจิทัลโดยตรง', 'bccPurchase', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccPurchase.web3Buy.howItWorks', 'th', 'วิธีการทำงานของ Web3 Shuffle:', 'bccPurchase', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccPurchase.web3Buy.instantProcessing', 'th', 'การประมวลผลทันที', 'bccPurchase', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccPurchase.web3Buy.invalidConfig', 'th', 'การกำหนดค่าไม่ถูกต้อง', 'bccPurchase', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccPurchase.web3Buy.launchPurchase', 'th', 'เริ่มการซื้อ Web3 Shuffle ({{usdcAmount}} USDC → {{bccAmount}} BCC)', 'bccPurchase', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccPurchase.web3Buy.noManualTransfer', 'th', 'ไม่มีการโอนด้วยตนเอง', 'bccPurchase', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccPurchase.web3Buy.purchaseFailed', 'th', 'การซื้อล้มเหลว', 'bccPurchase', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccPurchase.web3Buy.purchaseFailedDesc', 'th', 'ไม่สามารถทำรายการซื้อ Web3 ได้สำเร็จ กรุณาลองใหม่อีกครั้ง', 'bccPurchase', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccPurchase.web3Buy.purchaseSuccess', 'th', 'ซื้อโทเค็น BCC จำนวน {{amount}} สำเร็จแล้วผ่าน Web3 bridge', 'bccPurchase', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

INSERT INTO app_translations (translation_key, language_code, translated_text, category, created_at, updated_at)
VALUES ('bccPurchase.web3Buy.purchaseSuccessful', 'th', '🎉 การสั่งซื้อของคุณสำเร็จแล้ว!', 'bccPurchase', NOW(), NOW())
ON CONFLICT (translation_key, language_code) 
DO UPDATE SET 
  translated_text = EXCLUDED.translated_text,
  updated_at = NOW();

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

-- 验证结果
SELECT 'th' as language, COUNT(*) as new_translations;
