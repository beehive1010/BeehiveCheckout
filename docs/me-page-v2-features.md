# Enhanced Me Page (V2) - Features & API Documentation

## Overview
The enhanced Me page provides users with comprehensive access to their V2 matrix system data, including layer-based rewards, detailed balance management, performance analytics, and enhanced matrix visualization.

## Key Features

### 🎯 **Enhanced Profile Management**
- **V2 API Integration**: Real-time data from enhanced matrix system
- **Toggle Functionality**: Switch between V1 and V2 views seamlessly
- **Tier Information**: Display activation tier and member order
- **Balance Breakdown**: Detailed BCC token management (transferable/restricted/locked)

### 📊 **Performance Analytics**
- **Matrix Metrics**: Total team size, direct referrals, deepest layer
- **Performance Indicators**: Spillover rate, growth velocity, reward efficiency
- **Layer Distribution**: Visual representation of member distribution across layers
- **Real-time Updates**: Refresh functionality for latest data

### 🎁 **Layer-based Rewards System**
- **Claimable Rewards**: USDT rewards ready for withdrawal
- **Pending Rewards**: Rewards awaiting level requirements
- **Reward Statistics**: Total earnings, efficiency metrics
- **Multi-chain Support**: Withdrawal to different blockchain networks

### 🌐 **3×3 Matrix Visualization**
- **19-Layer Tree**: Complete matrix visualization up to 19 layers deep
- **Interactive Navigation**: Layer-by-layer exploration
- **Member Details**: Click-through member information
- **Performance Metrics**: Layer fill rates, spillover indicators

## API Endpoints Used

### Dashboard Data
```typescript
useDashboardV2(walletAddress) -> {
  balance: { bcc: {...}, usdt: {...} },
  matrix: { totalTeamSize, directReferrals, layerCounts, deepestLayer },
  rewards: { totalEarnings, claimableAmount, pendingAmount },
  performance: { spilloverRate, growthVelocity, rewardEfficiency }
}
```

### Matrix Tree
```typescript
useMatrixTreeV2(walletAddress, maxLayers) -> {
  rootWallet, totalMembers, deepestLayer, activationRate,
  layerSummary: [{ layer, maxCapacity, fillCount, members, positions }]
}
```

### Balance Breakdown
```typescript
useBalanceBreakdownV2(walletAddress) -> {
  bcc: { transferable, restricted, locked, total, breakdown },
  usdt: { totalEarned, availableRewards, totalWithdrawn },
  activation: { tier, order, tierDescription },
  metadata: { lastUpdated, createdAt }
}
```

### Rewards System
```typescript
useClaimableRewardsV2(walletAddress) -> {
  rewards: [{ id, rewardAmount, layerNumber, triggerLevel, triggerWallet }],
  totalClaimable, info: { unlockRequirement, timeLimit, rollupBehavior }
}

usePendingRewardsV2(walletAddress) -> {
  rewards: [{ id, rewardAmount, requiresLevel, timeRemaining, expiresAt }],
  totalPending
}
```

## Component Structure

### Main Tabs
1. **Layer Rewards Tab**
   - ClaimableRewardsCardV2 component
   - Reward performance statistics
   - Layer-based reward breakdown

2. **Matrix Tree Tab**
   - IndividualMatrixViewV2 component
   - 3×3 matrix visualization
   - Interactive layer navigation

3. **Analytics Tab**
   - MatrixNetworkStatsV2 component
   - Detailed performance metrics
   - Layer distribution analysis

4. **Balances Tab**
   - BCC token management
   - USDT earnings breakdown
   - Account metadata

## Enhanced Features

### 🔄 **Real-time Data Management**
- Automatic refresh functionality
- Loading states for all data
- Error handling and fallbacks
- Optimized React Query caching

### 📱 **Responsive Design**
- Mobile-first approach
- Adaptive layouts for all screen sizes
- Touch-friendly navigation
- Optimized tab switching

### 🎨 **Visual Enhancements**
- Gradient backgrounds for different data types
- Color-coded metrics (green for active, orange for pending, etc.)
- Progress bars for performance metrics
- Interactive hover states

### ⚡ **Performance Optimizations**
- Lazy loading of complex components
- Memoized calculations
- Efficient state management
- Minimal re-renders

## User Experience Flow

1. **Landing**: User sees enhanced profile with V2 toggle option
2. **Overview**: Performance metrics and balance breakdown at a glance
3. **Deep Dive**: Tab-based navigation for detailed information
4. **Actions**: Claim rewards, refresh data, switch between versions
5. **Analytics**: Comprehensive matrix and performance analysis

## Migration from V1

### Backward Compatibility
- V1 functionality remains available via toggle
- Smooth transition between versions
- No data loss during switching
- Consistent UI/UX patterns

### New Capabilities
- Layer-based reward visualization
- Enhanced balance management
- Performance analytics dashboard
- Advanced matrix exploration tools

## Technical Implementation

### State Management
- React hooks for component state
- React Query for server state
- Context providers for global data
- Local storage for user preferences

### Error Handling
- Graceful fallbacks for API failures
- User-friendly error messages
- Retry mechanisms for failed requests
- Loading states for all operations

### Data Validation
- TypeScript interfaces for all data structures
- Runtime validation for critical operations
- Sanitization of user inputs
- Consistent data formatting

## Future Enhancements

### Planned Features
- Export functionality for analytics data
- Advanced filtering and sorting options
- Push notifications for reward updates
- Detailed transaction history

### API Extensions
- Real-time websocket updates
- Bulk operations support
- Advanced querying capabilities
- Enhanced performance metrics

## Usage Examples

### Basic Integration
```tsx
import MeV2 from './pages/MeV2';

function App() {
  return <MeV2 onToggleVersion={() => setUseV1(true)} />;
}
```

### Custom Configuration
```tsx
const customConfig = {
  maxLayers: 19,
  refreshInterval: 60000,
  enableAnalytics: true
};

<MeV2 config={customConfig} />
```

This enhanced Me page provides users with a comprehensive view of their V2 matrix system participation, combining powerful analytics with intuitive user experience design.