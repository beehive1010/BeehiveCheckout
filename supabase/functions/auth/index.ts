import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wallet-address',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

console.log(`Updated Auth function started successfully! - Using new database structure`)

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 创建Supabase客户端
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
      }
    )

    const { action, ...data } = await req.json()
    const walletAddress = req.headers.get('x-wallet-address')

    if (!walletAddress) {
      throw new Error('Wallet address missing')
    }

    console.log(`📞 Auth request: ${action} - Wallet: ${walletAddress}`);

    let result;
    switch (action) {
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
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Auth function error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

// User registration function - only creates user records, not member records
async function registerUser(supabase, walletAddress, data) {
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
    const { data: userData } = await supabase
      .from('users')
      .select(`
        wallet_address,
        username,
        referrer_wallet,
        created_at
      `)
      .eq('wallet_address', walletAddress)
      .maybeSingle();

    // Check if there are member records (only after NFT purchase)
    const { data: memberData, error: memberError } = await supabase
      .from('members')
      .select(`
        activation_sequence,
        current_level,
        referrer_wallet,
        activation_time
      `)
      .eq('wallet_address', walletAddress)
      .maybeSingle();

    // Ignore "not found" errors as member record may not exist yet
    if (memberError && memberError.code !== 'PGRST116') {
      console.error('Member data query error:', memberError);
    }

    console.log(`✅ User registration successful: ${walletAddress}, member: ${!!memberData}`);
    
    return {
      success: true,
      action: result.action,
      user: userData,
      member: memberData, // null at registration, data available after activation
      isRegistered: true,
      isMember: !!memberData, // only a member after NFT purchase
      membershipLevel: memberData?.current_level || 0,
      canAccessReferrals: !!memberData,
      message: result.action === 'existing_user' ? 'User already exists' : 'User registration successful - please purchase NFT to activate membership'
    };

  } catch (error) {
    console.error('Registration process error:', error);
    throw error;
  }
}

// Get user function - simplified using unified member status
async function getUser(supabase, walletAddress) {
  console.log(`👤 Getting user: ${walletAddress}`);

  // Direct database query since get_member_status function doesn't exist
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('wallet_address, username, email, created_at')
    .ilike('wallet_address', walletAddress)
    .single();

  if (userError || !userData) {
    return {
      success: false,
      action: 'not_found',
      isRegistered: false,
      message: 'User does not exist'
    };
  }

  // Get member status
  const { data: memberData, error: memberError } = await supabase
    .from('members')
    .select('is_activated, current_level, levels_owned')
    .ilike('wallet_address', walletAddress)
    .single();

  // Get membership status
  const { data: membershipData, error: membershipError } = await supabase
    .from('membership')
    .select('claim_status, activated_at, member_created, nft_level')
    .ilike('wallet_address', walletAddress)
    .eq('nft_level', 1)
    .single();

  // Build status result
  const isActivated = memberData?.is_activated === true;
  const membershipLevel = memberData?.current_level || 0;
  const hasNFT = isActivated && membershipData?.claim_status === 'completed';

  // Get referral statistics only if member
  let referralStats = null;
  if (isActivated) {
    const { data: directReferrals } = await supabase
      .from('referrals')
      .select('member_wallet')
      .eq('referrer_wallet', walletAddress);

    const { data: matrixMembers } = await supabase
      .from('referrals')
      .select('member_wallet')  
      .eq('matrix_root', walletAddress);

    referralStats = {
      direct_referrals: directReferrals?.length || 0,
      matrix_members: matrixMembers?.length || 0
    };
  }

  console.log(`🔍 User status: member=${isActivated}, level=${membershipLevel}`);

  return {
    success: true,
    action: 'found',
    user: {
      ...userData,
      email: userData.email,
      username: userData.username,
      created_at: userData.created_at,
      isMember: isActivated,
      membershipLevel: membershipLevel,
      canAccessReferrals: isActivated
    },
    member: isActivated ? {
      current_level: membershipLevel,
      is_activated: isActivated,
      levels_owned: memberData?.levels_owned || [],
    } : null,
    balance: null, // Would need separate query for balance info
    referral_stats: referralStats,
    isRegistered: true,
    isMember: isActivated,
    membershipLevel: membershipLevel,
    canAccessReferrals: isActivated,
    message: 'User information retrieved successfully'
  };
}

// Validate referrer function - using direct database queries
async function validateReferrer(supabase, referrerWallet) {
  console.log(`🔍 Validating referrer: ${referrerWallet}`);
  
  if (!referrerWallet) {
    return {
      success: false,
      isValid: false,
      error: 'Referrer wallet address is required'
    };
  }
  
  // Direct database query for user data
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('wallet_address, username, email, created_at')
    .ilike('wallet_address', referrerWallet)
    .single();

  if (userError || !userData) {
    console.log(`❌ Referrer not found: ${referrerWallet}`);
    return {
      success: false,
      isValid: false,
      error: 'Referrer wallet not found'
    };
  }

  // Get member status - use .maybeSingle() since member record may not exist
  const { data: memberData, error: memberError } = await supabase
    .from('members')
    .select('is_activated, current_level, levels_owned, activation_sequence')
    .ilike('wallet_address', referrerWallet)
    .maybeSingle();

  // Ignore "not found" errors as member record may not exist yet
  if (memberError && memberError.code !== 'PGRST116') {
    console.error('Member data query error:', memberError);
  }

  const isActivated = memberData?.is_activated === true;
  const membershipLevel = memberData?.current_level || 0;
  
  console.log(`✅ Referrer validation: ${referrerWallet}, registered: true, activated: ${isActivated}`);
  
  // Get referrer's referral statistics (only if they are an activated member)
  let referralStats = { direct_referrals_count: 0, matrix_members_count: 0 };
  
  if (isActivated) {
    const { data: directReferrals } = await supabase
      .from('referrals')
      .select('member_wallet')
      .eq('referrer_wallet', referrerWallet);

    const { data: matrixMembers } = await supabase
      .from('referrals')
      .select('member_wallet')
      .eq('matrix_root', referrerWallet);
    
    referralStats = {
      direct_referrals_count: directReferrals?.length || 0,
      matrix_members_count: matrixMembers?.length || 0
    };
  }
  
  console.log(`✅ Referrer validation passed: ${referrerWallet}, level: ${membershipLevel}, direct referrals: ${referralStats.direct_referrals_count}`);
  
  return {
    success: true,
    isValid: true,
    referrer: {
      wallet_address: userData.wallet_address,
      username: userData.username,
      current_level: membershipLevel,
      activation_sequence: memberData?.activation_sequence,
      is_activated_member: isActivated,
      ...referralStats
    },
    message: isActivated 
      ? 'Referrer is a valid activated member'
      : 'Referrer is a valid registered user (not activated yet)'
  };
}

// Update user profile function - using new database structure
async function updateUserProfile(supabase, walletAddress, data) {
  console.log(`👤 Updating user profile: ${walletAddress}`);
  
  try {
    // Update user basic information
    const { error: userUpdateError } = await supabase
      .from('users')
      .update({
        username: data.username,
        email: data.email,
        bio: data.bio,
        updated_at: new Date().toISOString()
      })
      .eq('wallet_address', walletAddress);

    if (userUpdateError) {
      console.error('Update user information error:', userUpdateError);
      throw new Error(`Failed to update user information: ${userUpdateError.message}`);
    }

    // Get updated user information
    const { data: updatedUser } = await supabase
      .from('users')
      .select(`
        wallet_address,
        username,
        email,
        bio,
        created_at,
        updated_at
      `)
      .eq('wallet_address', walletAddress)
      .maybeSingle();

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