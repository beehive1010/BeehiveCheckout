import {createClient} from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Matrix相关的API函数
export const matrixAPI = {
  // 获取matrix数据
  async getMatrixData(matrixRootWallet) {
    const { data, error } = await supabase
      .from('matrix_referrals_tree_view')
      .select('*')
      .eq('matrix_root_wallet', matrixRootWallet)
      .order('matrix_position');
    
    if (error) throw error;
    return data || [];
  },

  // 获取matrix统计信息
  async getMatrixStats(matrixRootWallet) {
    const { data, error } = await supabase
      .from('matrix_referrals_tree_view')
      .select('layer, referral_type')
      .eq('matrix_root_wallet', matrixRootWallet)
      .neq('layer', 0); // 排除root
    
    if (error) throw error;
    
    const stats = {
      totalMembers: data.length,
      directReferrals: data.filter(m => m.referral_type === 'direct').length,
      spilloverMembers: data.filter(m => m.referral_type === 'spillover').length,
      layerStats: {}
    };
    
    // 计算每层统计
    data.forEach(member => {
      if (!stats.layerStats[member.layer]) {
        stats.layerStats[member.layer] = { total: 0, direct: 0, spillover: 0 };
      }
      stats.layerStats[member.layer].total++;
      if (member.referral_type === 'direct') {
        stats.layerStats[member.layer].direct++;
      } else {
        stats.layerStats[member.layer].spillover++;
      }
    });
    
    return stats;
  },

  // 获取用户信息
  async getUserInfo(walletAddress) {
    const { data, error } = await supabase
      .from('users')
      .select('username, wallet_address')
      .eq('wallet_address', walletAddress)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  // 获取成员信息
  async getMemberInfo(walletAddress) {
    const { data, error } = await supabase
      .from('members')
      .select('wallet_address, current_level, activation_sequence, activation_time, referrer_wallet')
      .eq('wallet_address', walletAddress)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }
};