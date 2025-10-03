/**
 * 诊断 NFT Claim 配置
 *
 * 运行: npx tsx check-nft-claim-config.ts
 */

import { createThirdwebClient, getContract } from "thirdweb";
import { arbitrum } from "thirdweb/chains";
import { getClaimConditions } from "thirdweb/extensions/erc1155";

const client = createThirdwebClient({
  clientId: "3123b1ac2ebdb966dd415c6e964dc335",
});

const NFT_CONTRACT = "0x36a1aC6D8F0204827Fad16CA5e222F1Aeae4Adc8";

async function checkClaimConfiguration() {
  console.log("🔍 检查 NFT Claim 配置...\n");

  const contract = getContract({
    client,
    address: NFT_CONTRACT,
    chain: arbitrum,
  });

  try {
    // 检查 Token ID 1 的 claim conditions
    const claimConditions = await getClaimConditions({
      contract,
      tokenId: BigInt(1),
    });

    console.log("📋 Claim Conditions for Token ID 1:");
    console.log(claimConditions);

    if (claimConditions && claimConditions.length > 0) {
      const condition = claimConditions[0];

      console.log("\n💰 价格配置:");
      console.log(`  价格: ${condition.pricePerToken} wei`);
      console.log(`  货币地址: ${condition.currency}`);

      if (condition.currency === "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE") {
        console.log("  ⚠️ 使用原生 ETH 支付（不是 USDC！）");
      } else if (condition.currency.toLowerCase() === "0xaf88d065e77c8cC2239327C5EDb3A432268e5831".toLowerCase()) {
        console.log("  ✅ 使用 USDC 支付");
      } else {
        console.log(`  ❓ 使用其他代币: ${condition.currency}`);
      }

      const priceInUSDC = Number(condition.pricePerToken) / 1_000_000;
      console.log(`  价格 (USDC): ${priceInUSDC} USDC`);

      if (priceInUSDC !== 130) {
        console.log(`  ⚠️ 警告: 价格不是 130 USDC！`);
      }
    } else {
      console.log("❌ 没有找到 Claim Conditions！");
      console.log("⚠️ 这可能意味着:");
      console.log("   1. NFT 是免费 mint");
      console.log("   2. Claim Conditions 没有设置");
      console.log("   3. 需要在 Thirdweb Dashboard 配置");
    }

  } catch (error: any) {
    console.error("❌ 检查失败:", error.message);
    console.log("\n💡 可能的原因:");
    console.log("   1. 合约没有实现 ClaimConditions 接口");
    console.log("   2. 合约不是 Thirdweb ERC1155 Drop 合约");
    console.log("   3. 需要使用不同的方法检查价格");
  }

  console.log("\n🔗 在 Thirdweb Dashboard 查看:");
  console.log(`   https://thirdweb.com/${arbitrum.id}/${NFT_CONTRACT}/nfts`);
}

checkClaimConfiguration().catch(console.error);
