// 检查 Server 钱包的 USDT 余额（Arbitrum）
import { createThirdwebClient } from "thirdweb";
import { arbitrum } from "thirdweb/chains";
import { getContract } from "thirdweb/contract";
import { balanceOf } from "thirdweb/extensions/erc20";

const SERVER_WALLET = "0x8AABc891958D8a813dB15C355F0aEaa85E4E5C9c";
const USDT_CONTRACT_ARBITRUM = "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9"; // Arbitrum USDT

async function checkServerBalance() {
  const client = createThirdwebClient({
    clientId: process.env.VITE_THIRDWEB_CLIENT_ID!,
  });

  const usdtContract = getContract({
    client,
    chain: arbitrum,
    address: USDT_CONTRACT_ARBITRUM,
  });

  try {
    const balance = await balanceOf({
      contract: usdtContract,
      address: SERVER_WALLET,
    });

    // USDT has 6 decimals on Arbitrum
    const balanceFormatted = Number(balance) / 1_000_000;

    console.log(`\n🔍 Server Wallet Balance Check`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Wallet: ${SERVER_WALLET}`);
    console.log(`Chain: Arbitrum One (42161)`);
    console.log(`Token: USDT`);
    console.log(`Contract: ${USDT_CONTRACT_ARBITRUM}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Balance: ${balanceFormatted.toFixed(2)} USDT`);
    console.log(`Raw Balance: ${balance.toString()}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    if (balanceFormatted < 100) {
      console.warn(`⚠️  WARNING: Server wallet balance is low (< 100 USDT)`);
    }

    return balanceFormatted;
  } catch (error) {
    console.error("❌ Error checking server wallet balance:", error);
    throw error;
  }
}

checkServerBalance()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
