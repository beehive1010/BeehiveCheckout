/**
 * Check NFT ownership for a single wallet
 */

import { createThirdwebClient, getContract } from "thirdweb";
import { arbitrum } from "thirdweb/chains";
import { balanceOf } from "thirdweb/extensions/erc1155";

// Configuration
const THIRDWEB_CLIENT_ID = '3123b1ac2ebdb966dd415c6e964dc335';
const CONTRACT_ADDRESS = '0x018F516B0d1E77Cc5947226Abc2E864B167C7E29';
const WALLET_TO_CHECK = '0x17918ABa958f332717e594C53906F77afa551BFB';

// Initialize client
const thirdwebClient = createThirdwebClient({ clientId: THIRDWEB_CLIENT_ID });

const contract = getContract({
  client: thirdwebClient,
  chain: arbitrum,
  address: CONTRACT_ADDRESS,
});

async function checkWallet() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  CHECKING NFT OWNERSHIP FOR SINGLE WALLET');
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log(`Wallet: ${WALLET_TO_CHECK}\n`);

  // Check Levels 1-5
  for (let level = 1; level <= 5; level++) {
    try {
      const balance = await balanceOf({
        contract,
        owner: WALLET_TO_CHECK,
        tokenId: BigInt(level),
      });

      const owns = balance > 0n;
      console.log(`Level ${level}: ${owns ? '✅ OWNS' : '❌ Does not own'} (balance: ${balance.toString()})`);
    } catch (error: any) {
      console.log(`Level ${level}: ⚠️ Error - ${error.message}`);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
}

checkWallet()
  .then(() => {
    console.log('✅ Check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Check failed:', error);
    process.exit(1);
  });
