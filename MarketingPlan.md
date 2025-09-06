User Registration & Membership Activation Flow
1. User Registration
• A user connects via Thirdweb In-App Wallet, which provides the wallet address.
• If the user arrives through a referral link, the referrer’s wallet address is captured in temporary state.
• The wallet address must be stored exactly as-is (case preserved), since chain operations are case-sensitive.
• Upon first registration, the user must provide:
• Username
• Email
• These details are saved into the users table, along with the wallet address and referrer’s address.
2. Membership Status
• A registered user is not yet a member.
• Non-members can only view the welcome/activation page.
• To activate membership, the user must claim a Membership NFT (EditionDrop contract, token_id = 1).
• Total cost: 130 USDC
• 100 USDC = NFT Level 1 price
• 30 USDC = platform activation fee
• Activation is available through three buttons:
1. Mainnet (Arbitrum One)
2. Testnet (Arbitrum Sepolia)
3. Simulation button (for testing)
• All three follow the same activation logic.
￼
Referral System & Placement
• After activation, the member is inserted into the referrals table.
• Placement rules:
• Find the referrer in the referral tree.
• Locate the first incomplete downline layer (L → M → R priority).
• Place the new member as the first-layer downline of that incomplete member.
• The adjusted referral structure forms a 3×3 matrix per member:
• Layer 1: 3 members
• Layer 2: 3² = 9 members
• Layer 3: 3³ = 27 members
• … up to Layer 19: 3¹⁹ members
• Each member thus maintains their own 19-layer matrix, used for Layer Rewards.
￼
Membership Upgrades
• Members can upgrade sequentially by claiming higher-level NFTs (token_id = 1–19).
• NFT Prices:
• Level 1: 100 USDC (+30 USDC activation fee)
• Level 2: 150 USDC
• Level 3: 200 USDC
• … each higher level adds +50 USDC
• Level 19: 1000 USDC
• Upgrade rules:
• Must purchase levels sequentially (can’t skip).
• No task/activation quota required, except for Level 2 (see restrictions).
￼
Reward System
1. Layer Rewards
• When a downline member reaches a level, the root member of that tree receives the reward for that layer.
• Reward = NFT price of that level.
• Claim conditions:
• Root must already hold ≥ that level.
• If not, the reward enters pending state.
• Pending rewards give the root 72 hours to upgrade.
• If upgraded in time → reward becomes claimable.
• If not → reward is rolled up to the next qualified upline.
• All forfeited/reassigned rewards are logged in roll_up_rewards.
Special Restrictions
1. Layer 1 (Right slot) Reward:
• Root must have upgraded to Level 2.
2. Level 2 Upgrade:
• Requires at least 3 directly referred active members.
• Direct referrals are counted from the referrals table, not matrix placement.
3. Levels 3–19:
• No referral requirement; only sequential NFT purchase.
￼
2. Locked BCC Release Rewards
• Each new member also participates in locked BCC release tiers, based on activation order.
• Tier Allocation:
• Tier 1 (1st – 9,999th members):
• Total locked pool: 10,450 BCC
• Release per level:
• Level 1 = 100 BCC
• Level 2 = 150 BCC
• Level 3 = 200 BCC
• … up to Level 19 = 1000 BCC
• Tier 2 (10,000th – 29,999th members):
• Rewards halved.
• Tier 3 (30,000th – 99,999th members):
• Rewards halved again.
• Tier 4 (100,000th – 268,240th members):
• Rewards halved once more.
• Released BCC is credited to bcc_balance, spendable for merchant NFTs, ads NFTs, courses, and services.
￼
3. New Activation Bonus
• Every new member automatically receives 500 BCC unlocked balance (not locked).
• This balance can be spent immediately on courses, services, or merchant features.
￼
Summary
1. Users connect via Thirdweb wallet, optionally with a referral link.
2. They register with wallet + email + username → saved in users.
3. Non-members → Welcome screen → must claim Level 1 NFT (130 USDC).
4. Upon activation, user becomes Member Level 1, inserted into referral matrix.
5. Members can upgrade sequentially (Level 2 → 19) by claiming NFTs.
6. Rewards:
• Layer Rewards: NFT price, conditional, with pending/roll-up rules.
• Locked BCC Release: tier-based, unlocks per level.
• New Activation Bonus: 500 BCC unlocked balance.