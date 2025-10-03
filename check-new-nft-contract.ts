/**
 * 检查新 NFT 合约的配置
 *
 * 运行: npx tsx check-new-nft-contract.ts
 */

import { createThirdwebClient, getContract } from "thirdweb";
import { arbitrum } from "thirdweb/chains";
import { getClaimConditions } from "thirdweb/extensions/erc1155";

const client = createThirdwebClient({
  clientId: "3123b1ac2ebdb966dd415c6e964dc335",
});

const NEW_NFT_CONTRACT = "0x15742D22f64985bC124676e206FCE3fFEb175719";
const USDT_ADDRESS = "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9";
const USDC_ADDRESS = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";

async function checkNewContract() {
  console.log("🔍 检查新 NFT 合约配置...\n");
  console.log(`📍 合约地址: ${NEW_NFT_CONTRACT}`);
  console.log(`🔗 链: Arbitrum One (Chain ID: ${arbitrum.id})\n`);

  try {
    const contract = getContract({
      client,
      address: NEW_NFT_CONTRACT,
      chain: arbitrum,
    });

    // 检查 Token ID 1 的 claim conditions
    console.log("📋 检查 Token ID 1 的 Claim Conditions...\n");

    const claimConditions = await getClaimConditions({
      contract,
      tokenId: BigInt(1),
    });

    if (!claimConditions || claimConditions.length === 0) {
      console.log("❌ 没有找到 Claim Conditions!");
      console.log("⚠️ 这意味着:");
      console.log("   1. NFT 是免费 mint");
      console.log("   2. Claim Conditions 还没有设置");
      console.log("   3. 需要在 Thirdweb Dashboard 配置\n");
      console.log("🔗 在 Thirdweb Dashboard 配置:");
      console.log(`   https://thirdweb.com/${arbitrum.id}/${NEW_NFT_CONTRACT}/nfts\n`);
      return;
    }

    console.log(`✅ 找到 ${claimConditions.length} 个 Claim Condition(s)\n`);

    claimConditions.forEach((condition, index) => {
      console.log(`📋 Condition ${index + 1}:`);
      console.log(`   Price Per Token: ${condition.pricePerToken} wei`);
      console.log(`   Currency: ${condition.currency}`);

      // 检查是 USDT 还是 USDC
      const currencyLower = condition.currency.toLowerCase();
      const usdtLower = USDT_ADDRESS.toLowerCase();
      const usdcLower = USDC_ADDRESS.toLowerCase();

      if (currencyLower === usdtLower) {
        console.log(`   💰 支付代币: USDT ✅`);
      } else if (currencyLower === usdcLower) {
        console.log(`   💰 支付代币: USDC ⚠️ (期望是 USDT)`);
      } else if (currencyLower === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee") {
        console.log(`   💰 支付代币: Native ETH ⚠️ (期望是 USDT)`);
      } else {
        console.log(`   ❓ 支付代币: 未知 (${condition.currency})`);
      }

      // 计算价格（假设 6 decimals）
      const priceFormatted = Number(condition.pricePerToken) / 1_000_000;
      console.log(`   💵 格式化价格: ${priceFormatted.toFixed(2)} (假设 6 decimals)`);

      if (priceFormatted !== 130) {
        console.log(`   ⚠️ 警告: 价格不是 130! 当前是 ${priceFormatted.toFixed(2)}`);
      }

      if (condition.maxClaimableSupply) {
        console.log(`   📊 最大可 claim 数量: ${condition.maxClaimableSupply.toString()}`);
      }

      if (condition.startTimestamp) {
        const startDate = new Date(Number(condition.startTimestamp) * 1000);
        console.log(`   📅 开始时间: ${startDate.toISOString()}`);
      }

      console.log("");
    });

    // 总结
    console.log("📊 总结:");
    const firstCondition = claimConditions[0];
    const currencyLower = firstCondition.currency.toLowerCase();
    const isUSDT = currencyLower === USDT_ADDRESS.toLowerCase();
    const isUSDC = currencyLower === USDC_ADDRESS.toLowerCase();
    const priceFormatted = Number(firstCondition.pricePerToken) / 1_000_000;

    if (isUSDT) {
      console.log("   ✅ 合约配置正确 - 使用 USDT 作为支付代币");
      console.log(`   ✅ 价格: ${priceFormatted.toFixed(2)} USDT`);
      console.log("\n🎉 前端代码和 Edge Functions 已正确配置为 USDT!");
      console.log("✅ 可以直接部署和测试");
    } else if (isUSDC) {
      console.log("   ⚠️ 合约配置使用 USDC - 但 Edge Functions 已改为 USDT");
      console.log(`   ⚠️ 价格: ${priceFormatted.toFixed(2)} USDC`);
      console.log("\n⚠️ 需要在 Thirdweb Dashboard 将支付代币改为 USDT:");
      console.log(`   1. 访问: https://thirdweb.com/${arbitrum.id}/${NEW_NFT_CONTRACT}/nfts`);
      console.log("   2. 编辑 Token ID 1 的 Claim Conditions");
      console.log(`   3. 将 Currency 设置为: ${USDT_ADDRESS}`);
      console.log("   4. 保存更改");
    } else {
      console.log("   ❌ 合约配置未知支付代币");
      console.log("\n❌ 需要在 Thirdweb Dashboard 配置 Claim Conditions:");
      console.log(`   1. 访问: https://thirdweb.com/${arbitrum.id}/${NEW_NFT_CONTRACT}/nfts`);
      console.log("   2. 设置 Token ID 1 的 Claim Conditions");
      console.log(`   3. Currency: ${USDT_ADDRESS} (USDT)`);
      console.log("   4. Price Per Token: 130000000 (130 USDT, 6 decimals)");
    }

    console.log(`\n🔗 在 Arbiscan 查看合约:`);
    console.log(`   https://arbiscan.io/address/${NEW_NFT_CONTRACT}`);

  } catch (error: any) {
    console.error("❌ 检查失败:", error.message);
    console.log("\n💡 可能的原因:");
    console.log("   1. 合约不是 ERC1155 或不支持 getClaimConditions");
    console.log("   2. 合约没有实现 Thirdweb Drop 接口");
    console.log("   3. 网络连接问题");
    console.log("\n🔗 手动检查:");
    console.log(`   https://thirdweb.com/${arbitrum.id}/${NEW_NFT_CONTRACT}/nfts`);
  }
}

checkNewContract().catch(console.error);
