// Payment Diagnostic Tool
// 帮助诊断支付问题

import { createThirdwebClient, getContract } from 'thirdweb';
import { arbitrum } from 'thirdweb/chains';
import { balanceOf, allowance } from 'thirdweb/extensions/erc20';

const USDT_CONTRACT = '0x6B174f1f3B7f92E048f0f15FD2b22c167DA6F008'; // ARB ONE New USDT
const NFT_CONTRACT = '0xe57332db0B8d7e6aF8a260a4fEcfA53104728693'; // ARB ONE New NFT

export async function diagnosePayment(walletAddress: string, clientId: string) {
  const client = createThirdwebClient({ clientId });

  console.log('🔍 开始诊断支付问题...');
  console.log('钱包地址:', walletAddress);
  console.log('USDT合约:', USDT_CONTRACT);
  console.log('NFT合约:', NFT_CONTRACT);
  console.log('网络: Arbitrum One (Chain ID: 42161)');

  try {
    // 1. 检查USDT余额
    const usdtContract = getContract({
      client,
      chain: arbitrum,
      address: USDT_CONTRACT,
    });

    const balance = await balanceOf({
      contract: usdtContract,
      address: walletAddress,
    });

    const balanceInUSDT = Number(balance) / 1_000_000; // 6 decimals
    console.log('✅ USDT余额:', balanceInUSDT, 'USDT');

    // 2. 检查授权额度
    const currentAllowance = await allowance({
      contract: usdtContract,
      owner: walletAddress,
      spender: NFT_CONTRACT,
    });

    const allowanceInUSDT = Number(currentAllowance) / 1_000_000;
    console.log('📋 当前授权额度:', allowanceInUSDT, 'USDT');

    // 3. 诊断结果
    const diagnosis = {
      hasBalance: balanceInUSDT >= 130,
      hasApproval: allowanceInUSDT >= 130,
      balance: balanceInUSDT,
      allowance: allowanceInUSDT,
      needsApproval: allowanceInUSDT < 130,
      canPay: balanceInUSDT >= 130 && allowanceInUSDT >= 130,
    };

    console.log('📊 诊断结果:', diagnosis);

    if (!diagnosis.hasBalance) {
      console.error('❌ USDT余额不足！需要: 130 USDT, 当前: ' + balanceInUSDT);
    }

    if (!diagnosis.hasApproval) {
      console.warn('⚠️ 需要授权USDT给NFT合约！');
      console.log('💡 解决方案: 点击Approve按钮授权USDT');
    }

    if (diagnosis.canPay) {
      console.log('✅ 可以支付！');
    }

    return diagnosis;

  } catch (error) {
    console.error('❌ 诊断出错:', error);
    throw error;
  }
}

// 在浏览器控制台使用:
// import { diagnosePayment } from './utils/paymentDiagnostic';
// diagnosePayment('YOUR_WALLET_ADDRESS', 'YOUR_CLIENT_ID');
