/**
 * Check specific wallets for Level 2 NFT ownership
 */

import { createThirdwebClient, getContract } from "thirdweb";
import { arbitrum } from "thirdweb/chains";
import { balanceOf } from "thirdweb/extensions/erc1155";

const THIRDWEB_CLIENT_ID = '3123b1ac2ebdb966dd415c6e964dc335';
const CONTRACT_ADDRESS = '0x018F516B0d1E77Cc5947226Abc2E864B167C7E29';

const WALLETS_TO_CHECK = [
  '0x17918ABa958f332717e594C53906F77afa551BFB',
  '0x5868F27616BA49e113B8A367c9A77143B289Ed77',
  '0xC66aEa321654c6822F1088d2B2729a24Dd35a283',
  '0x80A52827Ba147Bb0A22067F88eEfFfa376C6e6d0',
];

const thirdwebClient = createThirdwebClient({ clientId: THIRDWEB_CLIENT_ID });

const contract = getContract({
  client: thirdwebClient,
  chain: arbitrum,
  address: CONTRACT_ADDRESS,
});

async function checkWallet(wallet: string) {
  const results: { [level: number]: boolean } = {};

  for (let level = 1; level <= 5; level++) {
    try {
      const balance = await balanceOf({
        contract,
        owner: wallet,
        tokenId: BigInt(level),
      });
      results[level] = balance > 0n;
    } catch (error) {
      results[level] = false;
    }
  }

  return results;
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  CHECKING LEVEL 2 NFT OWNERSHIP');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const discrepancies: string[] = [];

  for (const wallet of WALLETS_TO_CHECK) {
    console.log(`Checking ${wallet}...`);
    const results = await checkWallet(wallet);

    const owned = Object.entries(results)
      .filter(([_, owns]) => owns)
      .map(([level, _]) => level);

    console.log(`  Owned on-chain: [${owned.join(', ')}]`);

    if (results[2]) {
      console.log(`  ❌ DISCREPANCY: Owns Level 2 but not in database!`);
      discrepancies.push(wallet);
    } else {
      console.log(`  ✅ No Level 2 NFT owned yet`);
    }

    console.log('');
  }

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log(`Total checked: ${WALLETS_TO_CHECK.length}`);
  console.log(`Discrepancies found: ${discrepancies.length}\n`);

  if (discrepancies.length > 0) {
    console.log('Wallets that need fixing:');
    discrepancies.forEach(w => console.log(`  - ${w}`));
    console.log('');
  }

  console.log('═══════════════════════════════════════════════════════════════\n');
}

main()
  .then(() => {
    console.log('✅ Check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Check failed:', error);
    process.exit(1);
  });
