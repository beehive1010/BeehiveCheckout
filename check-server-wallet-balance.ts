/**
 * 检查服务器钱包的 USDC 余额
 *
 * 运行: npx tsx check-server-wallet-balance.ts
 */

import { createThirdwebClient, getContract } from "thirdweb";
import { arbitrum } from "thirdweb/chains";
import { balanceOf } from "thirdweb/extensions/erc20";

const client = createThirdwebClient({
  clientId: "3123b1ac2ebdb966dd415c6e964dc335",
});

const SERVER_WALLET = "0x8AABc891958D8a813dB15C355F0aEaa85E4E5C9c";
const USDC_CONTRACT = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831"; // Arbitrum USDC

async function checkBalance() {
  console.log("🔍 检查服务器钱包余额...\n");
  console.log(`📍 钱包地址: ${SERVER_WALLET}`);
  console.log(`💰 检查链: Arbitrum One (Chain ID: ${arbitrum.id})\n`);

  try {
    // Get USDC contract
    const usdcContract = getContract({
      client,
      address: USDC_CONTRACT,
      chain: arbitrum,
    });

    // Check USDC balance
    const usdcBalance = await balanceOf({
      contract: usdcContract,
      address: SERVER_WALLET,
    });

    const usdcBalanceFormatted = Number(usdcBalance) / 1_000_000; // USDC has 6 decimals

    console.log("💵 USDC 余额:");
    console.log(`  原始值: ${usdcBalance.toString()} (wei)`);
    console.log(`  格式化: ${usdcBalanceFormatted.toFixed(2)} USDC\n`);

    // Check if sufficient for transfers
    const requiredPerTransfer = 30;
    const maxTransfers = Math.floor(usdcBalanceFormatted / requiredPerTransfer);

    console.log("📊 转账能力分析:");
    console.log(`  每次转账需要: ${requiredPerTransfer} USDC`);
    console.log(`  当前余额可支持: ${maxTransfers} 次转账`);
    console.log(`  剩余余额: ${(usdcBalanceFormatted % requiredPerTransfer).toFixed(2)} USDC\n`);

    if (usdcBalanceFormatted < requiredPerTransfer) {
      console.log("⚠️ 警告: USDC 余额不足!");
      console.log(`   需要至少 ${requiredPerTransfer} USDC 才能进行一次转账`);
      console.log(`   当前余额: ${usdcBalanceFormatted.toFixed(2)} USDC`);
      console.log(`   缺少: ${(requiredPerTransfer - usdcBalanceFormatted).toFixed(2)} USDC\n`);
    } else if (usdcBalanceFormatted < 100) {
      console.log("⚠️ 提示: USDC 余额较低");
      console.log("   建议充值以支持更多转账\n");
    } else {
      console.log("✅ USDC 余额充足\n");
    }

    // Check ETH balance for gas fees
    console.log("🔍 检查 ETH 余额（用于 gas 费）...");

    const ethBalanceResponse = await fetch(
      `https://api.arbiscan.io/api?module=account&action=balance&address=${SERVER_WALLET}&tag=latest`
    );

    const ethData = await ethBalanceResponse.json();

    if (ethData.status === "1") {
      const ethBalance = BigInt(ethData.result);
      const ethBalanceFormatted = Number(ethBalance) / 1e18;

      console.log(`  原始值: ${ethBalance.toString()} (wei)`);
      console.log(`  格式化: ${ethBalanceFormatted.toFixed(6)} ETH\n`);

      const minGasRequired = 0.001; // 估计每次转账需要的 ETH

      if (ethBalanceFormatted < minGasRequired) {
        console.log("⚠️ 警告: ETH 余额不足以支付 gas 费!");
        console.log(`   需要至少 ${minGasRequired} ETH 才能进行转账`);
        console.log(`   当前余额: ${ethBalanceFormatted.toFixed(6)} ETH`);
        console.log(`   建议充值: ${(minGasRequired - ethBalanceFormatted).toFixed(6)} ETH\n`);
      } else {
        console.log("✅ ETH 余额充足（可支付 gas 费）\n");
      }
    } else {
      console.log("⚠️ 无法获取 ETH 余额\n");
    }

    // Summary
    console.log("📋 总结:");
    console.log(`  服务器钱包: ${SERVER_WALLET}`);
    console.log(`  USDC 余额: ${usdcBalanceFormatted.toFixed(2)} USDC`);
    console.log(`  可支持转账次数: ${maxTransfers} 次`);

    if (ethData.status === "1") {
      const ethBalance = BigInt(ethData.result);
      const ethBalanceFormatted = Number(ethBalance) / 1e18;
      console.log(`  ETH 余额: ${ethBalanceFormatted.toFixed(6)} ETH`);
    }

    console.log(`\n🔗 在 Arbiscan 查看:`);
    console.log(`   https://arbiscan.io/address/${SERVER_WALLET}`);

  } catch (error: any) {
    console.error("❌ 检查失败:", error.message);
    console.log("\n💡 可能的原因:");
    console.log("   1. 网络连接问题");
    console.log("   2. RPC 节点不可用");
    console.log("   3. 合约地址错误");
  }
}

checkBalance().catch(console.error);
