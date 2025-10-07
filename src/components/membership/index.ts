/**
 * Membership Components - Unified Export
 *
 * New Architecture (Direct Claim):
 * - ActiveMember/: Level 1 activation components
 * - UpgradeLevel/: Level 2-19 upgrade components
 * - core/: Shared claim logic
 */

// ✅ Core functionality (Direct Claim)
export { useNFTClaim } from './core/NFTClaimButton';
export type { NFTClaimConfig } from './core/NFTClaimButton';

// ✅ Level 1 Activation (ActiveMember folder)
export { MembershipActivationButton } from './ActiveMember';

// ✅ Level 2-19 Upgrade (UpgradeLevel folder)
export { MembershipUpgradeButton } from './UpgradeLevel';

// UI components
export { default as MembershipBadge } from './MembershipBadge';

// Archived: MultiChain components moved to _archive/
// - MultiChainNFTClaimButton
// - MultiChainMembershipClaim