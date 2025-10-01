#!/usr/bin/env node

/**
 * Beehive Matrix 缺失安置修复脚本
 * 为所有激活但未正确安置在matrix_referrals表中的会员重新安置位置
 * 按照激活顺序逐一处理，遵循3x3滑落逻辑
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cvqibjcbfrwsgkvthccp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2cWliamNiZnJ3c2drdnRoY2NwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNjAzMjkwNywiZXhwIjoyMDQxNjA4OTA3fQ.gCFqZ4JJGfFLCKJSH3w3aK0bYEh4Q0BUuZKz3u8gLfI';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🚀 开始修复Matrix安置缺失...');

async function getMissingMatrixMembers() {
  console.log('📋 查找所有未正确安置的激活会员...');
  
  const { data: missingMembers, error } = await supabase
    .from('members')
    .select(`
      wallet_address,
      referrer_wallet,
      activation_sequence,
      activation_time
    `)
    .not('activation_time', 'is', null)
    .order('activation_sequence');

  if (error) {
    throw new Error(`查询会员失败: ${error.message}`);
  }

  // 过滤出没有matrix_referrals记录的会员
  const membersToFix = [];
  
  for (const member of missingMembers) {
    const { data: existingMatrix, error: matrixError } = await supabase
      .from('matrix_referrals')
      .select('id')
      .eq('member_wallet', member.wallet_address)
      .limit(1);
      
    if (matrixError) {
      console.warn(`检查${member.wallet_address}的matrix记录时出错: ${matrixError.message}`);
      continue;
    }
    
    if (!existingMatrix || existingMatrix.length === 0) {
      membersToFix.push(member);
    }
  }

  console.log(`🔍 发现 ${membersToFix.length} 个需要重新安置的会员`);
  return membersToFix;
}

async function findNextAvailablePosition(rootWallet, preferredPosition = null) {
  console.log(`🔍 为根钱包 ${rootWallet} 查找下一个可用位置...`);

  // 检查第1层位置 L, M, R
  const layer1Positions = ['L', 'M', 'R'];
  
  for (const position of layer1Positions) {
    const { data: occupied, error } = await supabase
      .from('matrix_referrals')
      .select('id')
      .eq('matrix_root_wallet', rootWallet)
      .eq('layer', 1)
      .eq('position', position)
      .limit(1);

    if (error) {
      console.error(`检查位置 ${position} 时出错: ${error.message}`);
      continue;
    }

    if (!occupied || occupied.length === 0) {
      console.log(`✅ 找到第1层可用位置: ${position}`);
      return {
        success: true,
        layer: 1,
        position: position,
        actualRoot: rootWallet
      };
    }
  }

  console.log(`📈 第1层已满，查找滑落位置...`);
  
  // 查找有空位的已激活会员（按activation_sequence排序）
  const { data: activatedMembers, error: membersError } = await supabase
    .from('members')
    .select('wallet_address, activation_sequence')
    .not('activation_time', 'is', null)
    .order('activation_sequence');

  if (membersError) {
    throw new Error(`查询激活会员失败: ${membersError.message}`);
  }

  // 检查每个激活会员的matrix是否有空位
  for (const member of activatedMembers) {
    const positions = ['L', 'M', 'R'];
    
    for (const position of positions) {
      const { data: occupied, error } = await supabase
        .from('matrix_referrals')
        .select('id')
        .eq('matrix_root_wallet', member.wallet_address)
        .eq('layer', 1)
        .eq('position', position)
        .limit(1);

      if (error) {
        console.warn(`检查会员 ${member.wallet_address} 位置 ${position} 时出错: ${error.message}`);
        continue;
      }

      if (!occupied || occupied.length === 0) {
        console.log(`✅ 找到滑落位置: ${member.wallet_address} 的 ${position} 位置`);
        return {
          success: true,
          layer: 1,
          position: position,
          actualRoot: member.wallet_address,
          originalRoot: rootWallet,
          isSpillover: true
        };
      }
    }
  }

  console.log(`❌ 未找到可用位置`);
  return { success: false, error: '无可用位置' };
}

async function placeMemberInMatrix(member, positionResult) {
  const actualRoot = positionResult.actualRoot;
  const isSpillover = positionResult.isSpillover || false;
  
  console.log(`📍 安置会员 ${member.wallet_address} 到 ${actualRoot} 的第${positionResult.layer}层 ${positionResult.position}位置`);

  // 获取parent_depth
  let parentDepth = 0;
  if (actualRoot !== member.referrer_wallet && member.referrer_wallet) {
    // 如果是滑落，需要计算深度
    const { data: referrerMatrix, error } = await supabase
      .from('matrix_referrals')
      .select('parent_depth')
      .eq('member_wallet', member.referrer_wallet)
      .eq('matrix_root_wallet', actualRoot)
      .limit(1);
      
    if (!error && referrerMatrix && referrerMatrix.length > 0) {
      parentDepth = referrerMatrix[0].parent_depth + 1;
    }
  }

  // 插入matrix_referrals记录
  const { data: insertResult, error: insertError } = await supabase
    .from('matrix_referrals')
    .insert({
      matrix_root_wallet: actualRoot,
      parent_wallet: actualRoot, // 第1层的parent就是root
      member_wallet: member.wallet_address,
      parent_depth: parentDepth,
      layer: positionResult.layer,
      position: positionResult.position,
      referral_type: isSpillover ? 'is_spillover' : 'is_direct',
      created_at: member.activation_time || new Date().toISOString()
    })
    .select();

  if (insertError) {
    throw new Error(`插入matrix_referrals失败: ${insertError.message}`);
  }

  console.log(`✅ 成功安置会员 ${member.wallet_address}`);
  return insertResult[0];
}

async function fixMissingMatrixPlacements() {
  try {
    const missingMembers = await getMissingMatrixMembers();
    
    if (missingMembers.length === 0) {
      console.log('🎉 所有会员都已正确安置！');
      return;
    }

    let successCount = 0;
    let failureCount = 0;
    
    console.log(`🔧 开始逐一修复 ${missingMembers.length} 个会员的安置...`);

    for (let i = 0; i < missingMembers.length; i++) {
      const member = missingMembers[i];
      console.log(`\n[${i + 1}/${missingMembers.length}] 处理会员: ${member.wallet_address}`);
      console.log(`   推荐人: ${member.referrer_wallet || '无'}`);
      console.log(`   激活序号: ${member.activation_sequence}`);

      try {
        // 确定matrix root - 优先使用推荐人，如果推荐人为空则使用系统根用户
        const matrixRoot = member.referrer_wallet || '0x0000000000000000000000000000000000000001';
        
        // 查找可用位置
        const positionResult = await findNextAvailablePosition(matrixRoot);
        
        if (!positionResult.success) {
          console.error(`   ❌ 无法为会员找到可用位置: ${positionResult.error}`);
          failureCount++;
          continue;
        }

        // 安置会员
        await placeMemberInMatrix(member, positionResult);
        successCount++;
        
        if (positionResult.isSpillover) {
          console.log(`   🔄 滑落安置: ${positionResult.originalRoot} -> ${positionResult.actualRoot}`);
        }

        // 每处理10个会员暂停一下
        if ((i + 1) % 10 === 0) {
          console.log(`\n⏸️  已处理 ${i + 1} 个会员，暂停1秒...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (error) {
        console.error(`   ❌ 处理会员 ${member.wallet_address} 时出错: ${error.message}`);
        failureCount++;
      }
    }

    console.log(`\n🎯 修复完成！`);
    console.log(`   ✅ 成功安置: ${successCount} 个会员`);
    console.log(`   ❌ 失败: ${failureCount} 个会员`);
    
    if (failureCount > 0) {
      console.log('\n💡 建议检查失败的会员，可能需要手动处理');
    }

  } catch (error) {
    console.error('❌ 修复过程中发生错误:', error.message);
    throw error;
  }
}

// 运行修复脚本
fixMissingMatrixPlacements()
  .then(() => {
    console.log('\n🏆 Matrix安置修复脚本执行完成！');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 脚本执行失败:', error.message);
    process.exit(1);
  });

export {
  fixMissingMatrixPlacements,
  getMissingMatrixMembers,
  findNextAvailablePosition,
  placeMemberInMatrix
};