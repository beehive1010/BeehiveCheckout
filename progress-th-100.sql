-- th 进度保存 (100/200)
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
COMMIT;