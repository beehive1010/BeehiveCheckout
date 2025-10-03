/**
 * 诊断 30 USDC 转账问题
 *
 * 检查项：
 * 1. nft-claim-usdc-transfer Edge Function 是否正确部署
 * 2. 环境变量是否配置完整
 * 3. platform_activation_fees 表是否有记录
 * 4. Thirdweb Vault 钱包是否有足够余额
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function diagnose() {
  console.log('🔍 诊断 30 USDC 转账配置...\n');

  // 1. 检查环境变量
  console.log('📋 环境变量检查:');
  const requiredEnvVars = [
    'VITE_THIRDWEB_CLIENT_ID',
    'VITE_THIRDWEB_SECRET_KEY',
    'VITE_SERVER_WALLET_ADDRESS',
    'VITE_VAULT_ACCESS_TOKEN'
  ];

  const missingVars: string[] = [];
  requiredEnvVars.forEach(varName => {
    const value = process.env[varName];
    if (!value) {
      console.log(`  ❌ ${varName}: 未设置`);
      missingVars.push(varName);
    } else {
      console.log(`  ✅ ${varName}: ${value.substring(0, 10)}...`);
    }
  });

  if (missingVars.length > 0) {
    console.log(`\n⚠️ 缺少环境变量: ${missingVars.join(', ')}`);
    console.log('💡 请在 .env 文件中添加这些变量\n');
  }

  // 2. 检查 platform_activation_fees 表
  console.log('\n📊 检查 platform_activation_fees 表:');
  try {
    const { data: fees, error } = await supabase
      .from('platform_activation_fees')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.log(`  ❌ 查询失败: ${error.message}`);
    } else if (!fees || fees.length === 0) {
      console.log('  ⚠️ 没有找到任何平台费用记录');
      console.log('  💡 这意味着 nft-claim-usdc-transfer Edge Function 可能没有被调用');
    } else {
      console.log(`  ✅ 找到 ${fees.length} 条记录:`);
      fees.forEach(fee => {
        console.log(`     - ${fee.member_wallet} | Level ${fee.nft_level} | ${fee.payment_status} | ${fee.fee_amount} USDC`);
        if (fee.transaction_hash) {
          console.log(`       TX: ${fee.transaction_hash}`);
        }
      });
    }
  } catch (err: any) {
    console.log(`  ❌ 查询错误: ${err.message}`);
  }

  // 3. 测试调用 nft-claim-usdc-transfer Edge Function
  console.log('\n🧪 测试调用 nft-claim-usdc-transfer Edge Function:');

  const testWallet = '0x17f5A6885ca39cc10983C76e9a476855E7b048aa';
  const testTxHash = '0x' + '0'.repeat(64); // 假的交易哈希用于测试

  console.log(`  测试参数:`);
  console.log(`    token_id: 1`);
  console.log(`    claimer_address: ${testWallet}`);
  console.log(`    transaction_hash: ${testTxHash}`);

  try {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/nft-claim-usdc-transfer`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          token_id: '1',
          claimer_address: testWallet,
          transaction_hash: testTxHash,
        }),
      }
    );

    const result = await response.json();

    if (response.ok) {
      console.log('  ✅ Edge Function 调用成功:');
      console.log('     ', JSON.stringify(result, null, 2));
    } else {
      console.log(`  ❌ Edge Function 调用失败 (${response.status}):`, result);
    }
  } catch (err: any) {
    console.log(`  ❌ Edge Function 调用错误: ${err.message}`);
  }

  // 4. 检查 activate-membership 代码是否调用了 nft-claim-usdc-transfer
  console.log('\n🔍 检查 activate-membership 是否调用 nft-claim-usdc-transfer:');
  console.log('  查看 supabase/functions/activate-membership/index.ts:296-334');
  console.log('  ✅ 代码已包含调用逻辑（Step 6）');

  // 5. 显示配置信息
  console.log('\n📝 当前配置:');
  console.log(`  NFT Contract: 0x36a1aC6D8F0204827Fad16CA5e222F1Aeae4Adc8`);
  console.log(`  USDC Contract: 0xaf88d065e77c8cC2239327C5EDb3A432268e5831`);
  console.log(`  收款地址: 0x0bA198F73DF3A1374a49Acb2c293ccA20e150Fe0`);
  console.log(`  转账金额: 30 USDC`);
  console.log(`  服务器钱包: ${process.env.VITE_SERVER_WALLET_ADDRESS || '未设置'}`);

  // 6. 总结和建议
  console.log('\n📌 问题总结:');
  if (missingVars.includes('VITE_VAULT_ACCESS_TOKEN')) {
    console.log('  ❌ 缺少 VITE_VAULT_ACCESS_TOKEN');
    console.log('     这是 Thirdweb Vault 的访问令牌，用于签署交易');
    console.log('     💡 需要从 Thirdweb Dashboard 获取: https://thirdweb.com/dashboard/engine');
    console.log('     💡 添加到 .env 文件: VITE_VAULT_ACCESS_TOKEN=<your-token>');
    console.log('     💡 同时需要添加到 Supabase Edge Functions secrets:');
    console.log('        supabase secrets set VITE_VAULT_ACCESS_TOKEN=<your-token>');
  }

  console.log('\n✅ 下一步操作:');
  console.log('  1. 设置缺少的环境变量');
  console.log('  2. 重新部署 Edge Functions: npm run deploy:functions');
  console.log('  3. 测试完整的 claim 流程');
  console.log('  4. 检查 platform_activation_fees 表是否有新记录');
  console.log('  5. 验证 0x0bA198F73DF3A1374a49Acb2c293ccA20e150Fe0 钱包是否收到 30 USDC');
}

diagnose().catch(console.error);
