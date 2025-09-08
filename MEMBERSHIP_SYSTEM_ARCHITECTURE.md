# Membership & Reward System Architecture

## System Overview

Based on the MarketingPlan.md, this system implements a multi-level membership platform with:
- **3x3 Matrix Referral System** with 19 layers
- **Tier-based BCC Release Rewards**  
- **Layer Reward System** with pending/rollup mechanics
- **Sequential NFT Level Upgrades** (Levels 1-19)
- **Cross-chain USDC Withdrawals**

## Critical Components Focus: Referrals & Rewards

### 1. REFERRAL MATRIX SYSTEM

#### Database Schema Requirements
```sql
-- Enhanced referrals table structure
CREATE TABLE referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address VARCHAR NOT NULL, -- Member wallet
    referrer_wallet VARCHAR, -- Direct referrer wallet
    matrix_root VARCHAR NOT NULL, -- Root of their matrix
    layer_position INTEGER NOT NULL, -- Layer in matrix (1-19)
    position_in_layer VARCHAR NOT NULL, -- L/M/R position
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Matrix placement tracking
CREATE TABLE matrix_placements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    root_wallet VARCHAR NOT NULL,
    member_wallet VARCHAR NOT NULL,
    layer INTEGER NOT NULL CHECK (layer >= 1 AND layer <= 19),
    position INTEGER NOT NULL, -- Position within layer
    is_complete BOOLEAN DEFAULT FALSE,
    placed_at TIMESTAMP DEFAULT NOW()
);

-- Direct referral tracking (separate from matrix placement)
CREATE TABLE direct_referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referrer_wallet VARCHAR NOT NULL,
    referred_wallet VARCHAR NOT NULL,
    activated_at TIMESTAMP DEFAULT NOW()
);
```

#### Matrix Placement Algorithm
```typescript
interface MatrixPosition {
  layer: number;
  position: number;
  parentWallet: string;
}

interface PlacementResult {
  rootWallet: string;
  position: MatrixPosition;
  success: boolean;
}

// Core placement logic
async function findMatrixPlacement(
  referrerWallet: string,
  newMemberWallet: string
): Promise<PlacementResult>
```

### 2. REWARD SYSTEM ARCHITECTURE

#### Layer Rewards Database Schema
```sql
-- Reward claims with pending/rollup mechanics
CREATE TABLE layer_reward_claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    root_wallet VARCHAR NOT NULL, -- Who should receive reward
    triggered_by_wallet VARCHAR NOT NULL, -- Who triggered reward
    nft_level INTEGER NOT NULL, -- Level achieved that triggered reward
    reward_amount DECIMAL(18,6) NOT NULL, -- USDC reward amount
    status VARCHAR NOT NULL CHECK (status IN ('pending', 'claimable', 'claimed', 'rolled_up')),
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL, -- 72 hours from creation
    claimed_at TIMESTAMP,
    rolled_up_to VARCHAR -- Next upline if rolled up
);

-- BCC Release Rewards (tier-based)
CREATE TABLE bcc_release_rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address VARCHAR NOT NULL,
    activation_rank INTEGER NOT NULL, -- Order of activation (1st, 2nd, etc.)
    tier INTEGER NOT NULL CHECK (tier IN (1,2,3,4)),
    level_unlocked INTEGER NOT NULL CHECK (level_unlocked >= 1 AND level_unlocked <= 19),
    bcc_amount DECIMAL(18,6) NOT NULL,
    status VARCHAR DEFAULT 'unlocked' CHECK (status IN ('locked', 'unlocked', 'claimed')),
    unlocked_at TIMESTAMP DEFAULT NOW()
);

-- Reward processing log
CREATE TABLE reward_processing_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trigger_wallet VARCHAR NOT NULL,
    action_type VARCHAR NOT NULL, -- 'level_upgrade', 'rollup', 'expiry'
    level_achieved INTEGER,
    affected_rewards INTEGER DEFAULT 0,
    processed_at TIMESTAMP DEFAULT NOW(),
    details JSONB
);
```

#### Reward Calculation Logic
```typescript
// Level pricing structure
const NFT_PRICING = {
  1: 100,   // Level 1: 100 USDC + 30 USDC activation fee
  2: 150,   // Level 2: 150 USDC
  3: 200,   // Level 3: 200 USDC
  // ... +50 USDC per level
  19: 1000  // Level 19: 1000 USDC
};

// BCC release amounts per level
const BCC_RELEASE_BASE = {
  1: 100,   // Level 1: 100 BCC
  2: 150,   // Level 2: 150 BCC  
  3: 200,   // Level 3: 200 BCC
  // ... +50 BCC per level
  19: 1000  // Level 19: 1000 BCC
};

// Tier multipliers for BCC releases
const TIER_MULTIPLIERS = {
  1: 1.0,    // Members 1-9,999: Full rewards
  2: 0.5,    // Members 10,000-29,999: Half rewards
  3: 0.25,   // Members 30,000-99,999: Quarter rewards  
  4: 0.125   // Members 100,000-268,240: Eighth rewards
};
```

## Core Edge Functions Required

### 1. Member Activation Function
```typescript
// supabase/functions/activate-membership/index.ts
export interface ActivationRequest {
  walletAddress: string;
  referrerWallet?: string;
  transactionHash: string;
  network: 'mainnet' | 'testnet' | 'simulation';
  nftTokenId: number; // Should be 1 for initial activation
}

export interface ActivationResponse {
  success: boolean;
  memberLevel: number;
  matrixPosition: MatrixPosition;
  bccRewards: number;
  activationRank: number;
  tier: number;
}
```

### 2. Matrix Placement Function  
```typescript
// supabase/functions/place-in-matrix/index.ts
export interface MatrixPlacementRequest {
  newMemberWallet: string;
  referrerWallet: string;
}

export interface MatrixPlacementResponse {
  success: boolean;
  placement: {
    rootWallet: string;
    layer: number;
    position: number;
    parentWallet: string;
  };
  triggeredRewards: LayerReward[];
}
```

### 3. Level Upgrade Function
```typescript  
// supabase/functions/upgrade-level/index.ts
export interface LevelUpgradeRequest {
  walletAddress: string;
  targetLevel: number;
  transactionHash: string;
  network: string;
}

export interface LevelUpgradeResponse {
  success: boolean;
  newLevel: number;
  bccReleased: number;
  pendingRewardsClaimed: LayerReward[];
  newPendingRewards: LayerReward[];
}
```

### 4. Reward Processing Function
```typescript
// supabase/functions/process-rewards/index.ts
export interface RewardProcessingRequest {
  triggerWallet: string;
  levelAchieved: number;
  actionType: 'upgrade' | 'rollup_check';
}

export interface RewardProcessingResponse {
  success: boolean;
  rewardsProcessed: number;
  rewardsRolledUp: number;
  rewardsExpired: number;
  affectedMembers: string[];
}
```

## Frontend Component Architecture

### 1. Registration & Activation Components
```typescript
// src/components/membership/RegistrationFlow.tsx
// src/components/membership/MembershipActivation.tsx  
// src/components/membership/ActivationProgress.tsx
```

### 2. Referral & Matrix Components
```typescript
// src/components/referrals/ReferralMatrix.tsx - Interactive 3x3 matrix visualization
// src/components/referrals/MatrixPlacement.tsx - Shows member's position
// src/components/referrals/ReferralStats.tsx - Direct referrals count
// src/components/referrals/ReferralLink.tsx - Generate/share referral links
```

### 3. Reward Management Components  
```typescript
// src/components/rewards/LayerRewards.tsx - Pending/claimable rewards
// src/components/rewards/BCCRewards.tsx - BCC release tracking
// src/components/rewards/RewardHistory.tsx - Historical rewards
// src/components/rewards/RewardTimer.tsx - 72-hour countdown
```

### 4. Level Upgrade Components
```typescript
// src/components/levels/LevelUpgrade.tsx - NFT purchase interface
// src/components/levels/LevelProgress.tsx - Current level status
// src/components/levels/LevelRequirements.tsx - Upgrade requirements
// src/components/levels/LevelPricing.tsx - Pricing display
```

## Special Business Rules Implementation

### 1. Level 2 Upgrade Restriction
```typescript
// Requires 3 direct referrals
async function checkLevel2Requirements(walletAddress: string): Promise<boolean> {
  const directReferralsCount = await getDirectReferralsCount(walletAddress);
  return directReferralsCount >= 3;
}
```

### 2. R-Slot Reward Condition  
```typescript
// Layer 1 Right position reward requires root to be Level 2+
async function checkRSlotRewardEligibility(
  rootWallet: string,
  position: string
): Promise<boolean> {
  if (position === 'R') { // Right position in Layer 1
    const rootLevel = await getMemberLevel(rootWallet);
    return rootLevel >= 2;
  }
  return true;
}
```

### 3. Pending Reward Rollup Logic
```typescript
// 72-hour expiry with rollup to next qualified upline
async function processExpiredRewards(): Promise<void> {
  const expiredRewards = await getExpiredPendingRewards();
  
  for (const reward of expiredRewards) {
    const nextQualifiedUpline = await findNextQualifiedUpline(
      reward.root_wallet, 
      reward.nft_level
    );
    
    if (nextQualifiedUpline) {
      await rollupReward(reward, nextQualifiedUpline);
    } else {
      await forfeitReward(reward);
    }
  }
}
```

## Mobile-First Responsive Design Considerations

### Key UI/UX Requirements
1. **Matrix Visualization**: Touch-friendly, zoomable matrix display
2. **Reward Timers**: Clear countdown displays for pending rewards  
3. **Level Progression**: Visual progress bars and milestone celebrations
4. **Transaction Status**: Real-time blockchain transaction tracking
5. **Referral Sharing**: Easy social sharing of referral links

### Performance Optimization
1. **Lazy Loading**: Load matrix data progressively
2. **Real-time Updates**: WebSocket connections for live reward updates
3. **Optimistic Updates**: Immediate UI feedback for user actions
4. **Caching Strategy**: Cache member data and matrix positions

## Testing Strategy

### 1. Simulation Mode Testing
- Complete activation flow without blockchain transactions
- Matrix placement algorithm verification
- Reward calculation accuracy testing
- Edge case handling (expired rewards, invalid upgrades)

### 2. Integration Testing  
- Thirdweb wallet integration
- Supabase edge function calls
- Cross-chain transaction handling
- Real-time data synchronization

### 3. Load Testing
- Matrix placement under high concurrent load
- Reward processing performance  
- Database query optimization
- Edge function scalability

This architecture provides the foundation for implementing the complete membership and reward system with emphasis on the critical referrals and rewards components.