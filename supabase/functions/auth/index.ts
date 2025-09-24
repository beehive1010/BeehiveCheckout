import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wallet-address',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
console.log(`Updated Auth function started successfully! - Using new database structure`);
serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    // 创建Supabase客户端
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    const { action, ...data } = await req.json();
    const walletAddress = req.headers.get('x-wallet-address');
    
    // Only require wallet address for certain actions
    const requiresWallet = ['register', 'get-user', 'update-profile'];
    if (requiresWallet.includes(action) && !walletAddress) {
      throw new Error('Wallet address missing');
    }
    console.log(`📞 Auth request: ${action} - Wallet: ${walletAddress}`);
    let result;
    switch(action){
      case 'register':
        result = await registerUser(supabase, walletAddress, data);
        break;
      case 'get-user':
        result = await getUser(supabase, walletAddress);
        break;
      case 'validate-referrer':
        result = await validateReferrer(supabase, data.referrerWallet);
        break;
      case 'update-profile':
        result = await updateUserProfile(supabase, walletAddress, data);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }
    return new Response(JSON.stringify(result), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error('Auth function error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});
// User registration function - only creates user records, not member records
async function registerUser(supabase: any, walletAddress: string, data: any) {
  console.log(`👤 Registering user: ${walletAddress}`);
  try {
    // Use updated database function to handle user registration
    const { data: registrationResult, error } = await supabase.rpc('process_user_registration', {
      p_wallet_address: walletAddress,
      p_username: data.username || `user_${walletAddress.slice(-6)}`,
      p_referrer_wallet: data.referrerWallet || data.referrer_wallet
    });
    if (error) {
      console.error('User registration error:', error);
      throw new Error(`Registration failed: ${error.message}`);
    }
    const result = typeof registrationResult === 'string' ? JSON.parse(registrationResult) : registrationResult;
    if (!result.success) {
      throw new Error(result.message);
    }
    // Get created user information
    const { data: userData } = await supabase.from('users').select(`
        wallet_address,
        username,
        referrer_wallet,
        created_at
      `).eq('wallet_address', walletAddress).maybeSingle();
    // Check if there are member records (only after NFT purchase)
    const { data: memberData, error: memberError } = await supabase.from('members').select(`
        activation_sequence,
        current_level,
        referrer_wallet,
        activation_time
      `).eq('wallet_address', walletAddress).maybeSingle();
    // Ignore "not found" errors as member record may not exist yet
    if (memberError && memberError.code !== 'PGRST116') {
      console.error('Member data query error:', memberError);
    }
    console.log(`✅ User registration successful: ${walletAddress}, member: ${!!memberData}`);
    return {
      success: true,
      action: result.action,
      user: userData,
      member: memberData,
      isRegistered: true,
      isMember: !!memberData,
      membershipLevel: memberData?.current_level || 0,
      canAccessReferrals: !!memberData,
      message: result.action === 'existing_user' ? 'User already exists' : 'User registration successful - please purchase NFT to activate membership'
    };
  } catch (error) {
    console.error('Registration process error:', error);
    throw error instanceof Error ? error : new Error(String(error));
  }
}
// Get user function - simplified using unified member status
async function getUser(supabase: any, walletAddress: string) {
  console.log(`👤 Getting user: ${walletAddress}`);
  // Use unified member status function
  const { data: statusResult, error: statusError } = await supabase.rpc('get_member_status', {
    p_wallet_address: walletAddress
  });
  if (statusError) {
    console.error('❌ get_member_status error:', statusError);
    throw new Error(`Failed to get user status: ${statusError.message || statusError.details || statusError.hint || JSON.stringify(statusError)}`);
  }
  if (!statusResult.is_registered) {
    return {
      success: false,
      action: 'not_found',
      isRegistered: false,
      message: 'User does not exist'
    };
  }
  // Get referral statistics only if member - using new MasterSpec table structure
  let referralStats = null;
  if (statusResult.is_member) {
    const { data: directReferrals } = await supabase.from('referrals_new').select('referred_wallet').eq('referrer_wallet', walletAddress);
    const { data: matrixMembers } = await supabase.from('matrix_referrals').select('member_wallet').eq('matrix_root_wallet', walletAddress);
    referralStats = {
      direct_referrals: directReferrals?.length || 0,
      matrix_members: matrixMembers?.length || 0
    };
  }
  console.log(`🔍 User status: member=${statusResult.is_member}, level=${statusResult.current_level}`);
  return {
    success: true,
    action: 'found',
    user: statusResult.user_info,
    member: statusResult.is_member ? {
      activation_sequence: statusResult.activation_sequence,
      current_level: statusResult.current_level,
      referrer_wallet: statusResult.referrer_wallet,
      activation_time: statusResult.activation_time
    } : null,
    balance: statusResult.balance_info,
    referral_stats: referralStats,
    isRegistered: statusResult.is_registered,
    isMember: statusResult.is_member,
    membershipLevel: statusResult.current_level,
    canAccessReferrals: statusResult.can_access_referrals,
    message: 'User information retrieved successfully'
  };
}
// Validate referrer function - simplified using unified status
async function validateReferrer(supabase: any, referrerWallet: string) {
  console.log(`🔍 Validating referrer: ${referrerWallet}`);
  if (!referrerWallet) {
    return {
      success: false,
      isValid: false,
      error: 'Referrer wallet address is required'
    };
  }
  // Use unified member status function
  const { data: referrerStatus, error: statusError } = await supabase.rpc('get_member_status', {
    p_wallet_address: referrerWallet
  });
  if (statusError) {
    console.log(`❌ Error checking referrer: ${statusError.message}`);
    return {
      success: false,
      isValid: false,
      error: 'Failed to validate referrer'
    };
  }
  if (!referrerStatus.is_registered) {
    console.log(`❌ Referrer not registered: ${referrerWallet}`);
    return {
      success: false,
      isValid: false,
      error: 'Referrer wallet not found'
    };
  }
  console.log(`✅ Referrer validation: ${referrerWallet}, registered: true, activated: ${referrerStatus.is_activated}`);
  // Get referrer's referral statistics (only if they are an activated member)
  let referralStats = {
    direct_referrals_count: 0,
    matrix_members_count: 0
  };
  if (referrerStatus.is_activated) {
    const { data: directReferrals } = await supabase.from('referrals_new').select('referred_wallet').eq('referrer_wallet', referrerWallet);
    const { data: matrixMembers } = await supabase.from('matrix_referrals').select('member_wallet').eq('matrix_root_wallet', referrerWallet);
    referralStats = {
      direct_referrals_count: directReferrals?.length || 0,
      matrix_members_count: matrixMembers?.length || 0
    };
  }
  console.log(`✅ Referrer validation passed: ${referrerWallet}, level: ${referrerStatus.current_level}, direct referrals: ${referralStats.direct_referrals_count}`);
  return {
    success: true,
    isValid: true,
    referrer: {
      wallet_address: referrerStatus.wallet_address,
      username: referrerStatus.user_info?.username,
      current_level: referrerStatus.current_level,
      activation_sequence: referrerStatus.activation_sequence,
      is_activated_member: referrerStatus.is_activated,
      ...referralStats
    },
    message: referrerStatus.is_activated ? 'Referrer is a valid activated member' : 'Referrer is a valid registered user (not activated yet)'
  };
}
// Update user profile function - using new database structure
async function updateUserProfile(supabase: any, walletAddress: string, data: any) {
  console.log(`👤 Updating user profile: ${walletAddress}`);
  try {
    // Update user basic information
    const { error: userUpdateError } = await supabase.from('users').update({
      username: data.username,
      email: data.email,
      bio: data.bio,
      updated_at: new Date().toISOString()
    }).eq('wallet_address', walletAddress);
    if (userUpdateError) {
      console.error('Update user information error:', userUpdateError);
      throw new Error(`Failed to update user information: ${userUpdateError.message}`);
    }
    // Get updated user information
    const { data: updatedUser } = await supabase.from('users').select(`
        wallet_address,
        username,
        email,
        bio,
        created_at,
        updated_at
      `).eq('wallet_address', walletAddress).maybeSingle();
    console.log(`✅ User profile updated successfully: ${walletAddress}`);
    return {
      success: true,
      user: updatedUser,
      message: 'Profile updated successfully'
    };
  } catch (error) {
    console.error('Profile update process error:', error);
    throw error;
  }
}
