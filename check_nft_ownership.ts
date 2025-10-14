/**
 * Check NFT Ownership and Add to Retry Queue
 *
 * This script:
 * 1. Checks if wallet owns Level 1 NFT on-chain
 * 2. If yes, adds to claim_sync_queue for automatic activation retry
 */

import { createThirdwebClient, getContract } from 'thirdweb';
import { arbitrum } from 'thirdweb/chains';
import { balanceOf } from 'thirdweb/extensions/erc1155';

// Contract addresses
const NFT_CONTRACT = '0x018F516B0d1E77Cc5947226Abc2E864B167C7E29';
const THIRDWEB_CLIENT_ID = '3123b1ac2ebdb966dd415c6e964dc335';

// Wallet to check
const WALLET_ADDRESS = '0xF1f454F4eaB8531794Bc8E6279B7f275a286B392';
const LEVEL = 1;

async function checkNFTOwnership() {
  console.log('🔍 Checking NFT ownership...');
  console.log(`Wallet: ${WALLET_ADDRESS}`);
  console.log(`Level: ${LEVEL}`);
  console.log(`Contract: ${NFT_CONTRACT}`);

  try {
    // Initialize Thirdweb client
    const client = createThirdwebClient({
      clientId: THIRDWEB_CLIENT_ID,
    });

    // Get NFT contract
    const nftContract = getContract({
      client,
      address: NFT_CONTRACT,
      chain: arbitrum,
    });

    // Check balance for Level 1 NFT (tokenId = 1)
    const balance = await balanceOf({
      contract: nftContract,
      owner: WALLET_ADDRESS,
      tokenId: BigInt(LEVEL),
    });

    console.log(`\n✅ NFT Balance: ${balance.toString()}`);

    if (balance > 0n) {
      console.log('✅ Wallet owns Level 1 NFT!');
      console.log('\n📝 Ready to add to claim_sync_queue for automatic activation retry');
      return { hasNFT: true, balance: balance.toString() };
    } else {
      console.log('❌ Wallet does NOT own Level 1 NFT');
      console.log('⚠️ The NFT claim transaction might still be pending or failed');
      return { hasNFT: false, balance: '0' };
    }

  } catch (error: any) {
    console.error('❌ Error checking NFT ownership:', error);
    throw error;
  }
}

// Run the check
checkNFTOwnership()
  .then(result => {
    console.log('\n' + '='.repeat(60));
    console.log('RESULT:', JSON.stringify(result, null, 2));
    console.log('='.repeat(60));
    process.exit(result.hasNFT ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
