# NFT Membership System Documentation

## Overview

The Beehive platform implements a comprehensive 19-level NFT membership system using the ERC5115 standard via Thirdweb Drop contracts. This system combines wallet-based authentication, progressive membership upgrades, and a 3×3 matrix referral structure with layer-based rewards.

## System Architecture

### Core Components

1. **ERC5115 NFT Standard**: Thirdweb Editor Drop contract with 19 token levels (Token ID 1-19)
2. **Progressive Membership**: Each level unlocks additional layer rewards and benefits
3. **Multi-Chain Support**: Arbitrum Sepolia (testnet) and Arbitrum One (mainnet)
4. **Three Activation Methods**: Database test, testnet, and mainnet claiming
5. **Layer Reward System**: 19-layer deep referral compensation structure

### Token Structure

```typescript
Level 1  → Token ID 1  → Price: 100 USDT  → Unlocks: Layer 1 rewards
Level 2  → Token ID 2  → Price: 150 USDT  → Unlocks: Layers 1-2 rewards
Level 3  → Token ID 3  → Price: 200 USDT  → Unlocks: Layers 1-3 rewards
...
Level 19 → Token ID 19 → Price: 1000 USDT → Unlocks: Layers 1-19 rewards (100% of Layer 19)
```

## User Journey

### 1. Initial Registration
- Users connect wallet using Thirdweb InAppWallet or WalletConnect
- Supabase Auth integration for session management
- Wallet address serves as primary identifier

### 2. Membership Activation (Level 1)
Users can activate Level 1 membership through three methods:

#### Database Test (Off-Chain)
- **Cost**: FREE
- **Purpose**: Testing and development
- **Network**: Off-chain database only
- **Benefits**: Full Level 1 access without blockchain transaction

#### Testnet Claim (Arbitrum Sepolia)
- **Cost**: 100 Fake USDT
- **Purpose**: Testnet environment testing
- **Network**: Arbitrum Sepolia (Chain ID: 421614)
- **Requirements**: Testnet ETH for gas fees

#### Mainnet Purchase (Arbitrum One)
- **Cost**: 100 USDC
- **Purpose**: Production environment
- **Network**: Arbitrum One (Chain ID: 42161)
- **Features**: Bridge support for cross-chain transactions

### 3. Progressive Upgrades (Levels 2-19)
- **Requirements**: Direct referrals + previous level ownership
- **Pricing**: Increases by 50 USDT per level
- **Benefits**: Unlocks additional layer rewards

## Technical Implementation

### Frontend Components

#### 1. Welcome Page (`/client/src/pages/Welcome.tsx`)
- Primary onboarding interface
- Three-method activation system
- Referrer wallet detection via URL parameters
- Network-specific claim handling

#### 2. Tasks Page (`/client/src/pages/Tasks.tsx`)
- Centralized NFT management hub
- Smart display logic for activated/non-activated users
- Comprehensive claim interface
- NFT collection overview

#### 3. Me Page (`/client/src/pages/Me.tsx`)
- 5-tab personal dashboard
- NFT upgrade interface
- Progress tracking and analytics
- Balance management

#### 4. NFTLevelUpgrade Component (`/client/src/components/NFTLevelUpgrade.tsx`)
- Interactive upgrade interface
- Eligibility validation
- Requirements display
- Progress visualization

### Backend Services

#### 1. NFT Level Configuration (`/server/src/services/nft-level-config.service.ts`)
```typescript
export const NFT_LEVEL_CONFIGS: NFTLevelConfig[] = [
  {
    level: 1,
    tokenId: 1,
    priceUSDT: 100,
    requiredDirectReferrals: 0,
    requiredPreviousLevel: null,
    layerRewardsUnlocked: [1],
    levelName: "Warrior",
    description: "Entry level membership with basic benefits"
  },
  // ... 18 more levels
];
```

#### 2. Layer Rewards Service (`/server/src/services/layer-rewards.service.ts`)
- Processes NFT upgrades
- Distributes layer rewards
- Handles special Level 19 master rewards
- Manages spillover mechanics

#### 3. NFT Upgrade Routes (`/server/src/routes/nft-upgrade.routes.ts`)
- `/api/nft/upgrade-eligibility/:level` - Check upgrade eligibility
- `/api/nft/upgrade` - Process NFT upgrade
- `/api/nft/upgrade-path` - Get complete upgrade path

### Database Schema

#### Members Table
```sql
CREATE TABLE members (
  wallet_address TEXT PRIMARY KEY,
  is_activated BOOLEAN DEFAULT FALSE,
  activated_at TIMESTAMP,
  current_level INTEGER DEFAULT 0,
  max_layer INTEGER DEFAULT 0,
  levels_owned INTEGER[] DEFAULT '{}',
  total_direct_referrals INTEGER DEFAULT 0,
  total_team_size INTEGER DEFAULT 0
);
```

#### Referrals Table (3×3 Matrix)
```sql
CREATE TABLE referrals (
  root_wallet TEXT,
  member_wallet TEXT,
  layer INTEGER,
  position TEXT,
  parent_wallet TEXT,
  placer_wallet TEXT,
  placement_type TEXT,
  is_active BOOLEAN DEFAULT TRUE
);
```

## Reward System

### BCC Token Distribution
- **Level 1 Activation**: 500 transferable + 10,350 locked BCC
- **Upgrade Bonuses**: Additional BCC based on level
- **Referral Rewards**: Bonus tokens for successful referrals

### USDT Layer Rewards
- **Layer-based Distribution**: Rewards distributed across matrix layers
- **Progressive Unlocking**: Higher NFT levels unlock more layer rewards
- **Special Level 19**: Root member receives 100% of Layer 19 upgrade fees

## Security Features

### Authentication
- Wallet-based identity verification
- Supabase session management
- Header-based wallet address validation

### Transaction Validation
- Upgrade eligibility checking
- Direct referral requirements
- Previous level ownership verification
- Price validation and calculation

### Error Handling
- Comprehensive error messages
- Transaction failure recovery
- Loading state management
- Toast notification system

## API Endpoints

### Authentication
- `POST /api/auth/supabase-login` - Supabase wallet authentication
- `POST /api/auth/claim-nft-token-1` - Level 1 NFT activation

### NFT Management
- `GET /api/nft/upgrade-eligibility/:level` - Check upgrade eligibility
- `POST /api/nft/upgrade` - Process NFT level upgrade
- `GET /api/nft/upgrade-path` - Get complete upgrade path

### User Data
- `GET /api/auth/user` - Get user profile and membership data
- `GET /api/balance-v2/breakdown` - Get detailed balance information

## Configuration

### Environment Variables
```bash
DATABASE_URL=postgresql://...
JWT_SECRET=your-jwt-secret
THIRDWEB_SECRET_KEY=your-thirdweb-key
```

### Network Configuration
```typescript
// Arbitrum Sepolia (Testnet)
chainId: 421614
rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc"

// Arbitrum One (Mainnet)
chainId: 42161
rpcUrl: "https://arb1.arbitrum.io/rpc"
```

## User Interface Flow

### Non-Activated Users
1. Connect wallet on Welcome page
2. Choose activation method (database/testnet/mainnet)
3. Complete transaction or demo claim
4. Automatic Level 1 membership activation
5. Redirect to Dashboard

### Activated Users
1. Access Tasks page for NFT management
2. View current level and available upgrades
3. Check upgrade requirements (referrals + previous levels)
4. Purchase higher-level NFTs
5. Unlock additional layer rewards

## Development Guidelines

### Adding New Levels
1. Update `NFT_LEVEL_CONFIGS` in nft-level-config.service.ts
2. Modify pricing and requirements logic
3. Update frontend display components
4. Test upgrade paths and validation

### Network Integration
1. Add network configuration to claim handlers
2. Update contract addresses for new chains
3. Implement bridge support if needed
4. Test transaction flow end-to-end

### Testing Strategy
1. Use database test method for development
2. Deploy to testnet for integration testing
3. Validate mainnet functionality with small amounts
4. Test referral and reward distribution

## Troubleshooting

### Common Issues

#### Upgrade Eligibility
- **Error**: "Insufficient direct referrals"
- **Solution**: User needs to refer more members before upgrading

#### Transaction Failures
- **Error**: "Insufficient funds" or "Gas estimation failed"
- **Solution**: Check wallet balance and network connectivity

#### Session Management
- **Error**: "Wallet address required"
- **Solution**: Reconnect wallet or refresh authentication

### Debugging Tools
- Browser dev tools for frontend debugging
- Server logs for API endpoint monitoring
- Database queries for data verification
- Network monitoring for transaction tracking

## Future Enhancements

### Planned Features
1. **Multi-Chain Expansion**: Support for Ethereum, Polygon, and other networks
2. **Mobile App Integration**: React Native implementation
3. **Advanced Analytics**: Detailed performance metrics and reporting
4. **Automated Rewards**: Smart contract-based reward distribution
5. **Governance Features**: DAO functionality for community decisions

### Scalability Considerations
- Database optimization for large user base
- Caching layer for frequently accessed data
- Background job processing for heavy operations
- Load balancing for high traffic scenarios

## Support and Maintenance

### Monitoring
- Application performance monitoring
- Database query optimization
- Network connectivity checks
- User experience analytics

### Updates and Migrations
- Database schema versioning
- Smart contract upgrades
- Frontend deployment strategies
- User communication for major changes

---

*This documentation covers the complete NFT membership system implementation. For specific technical questions or implementation details, refer to the individual component files and service documentation.*