// =============================================
// Beehive Platform - Simplified Authentication Function  
// Focuses on smooth user experience and registration/activation flow
// =============================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wallet-address',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};
serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    // Handle GET requests - simple health check
    if (req.method === 'GET') {
      return new Response(JSON.stringify({
        status: 'ok',
        service: 'beehive-auth-simplified',
        message: 'Beehive Platform Authentication Service - Simplified Version'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const walletAddress = req.headers.get('x-wallet-address')?.toLowerCase();
    // Parse request body
    let requestData = {
      action: 'get-user'
    };
    try {
      const body = await req.json();
      requestData = body;
    } catch  {
      // For GET requests or requests without body, use query params
      const url = new URL(req.url);
      let action = url.searchParams.get('action') || 'get-user';
      
      // Check if it's a validate-referrer endpoint from URL path
      if (url.pathname.includes('validate-referrer')) {
        action = 'validate-referrer';
      }
      
      // Check if it's a sync-blockchain-status endpoint from URL path
      if (url.pathname.includes('sync-blockchain-status')) {
        action = 'sync-blockchain-status';
      }
      
      // Extract referrer address for validation endpoint
      const address = url.searchParams.get('address');
      
      requestData = {
        action: action,
        address: address,
        url: url.pathname + url.search // Pass full URL for parsing
      };
    }
    const { action } = requestData;
    // Most actions require wallet address
    if (!walletAddress && req.method !== 'OPTIONS') {
      return new Response(JSON.stringify({
        error: 'Wallet address required'
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    console.log(`🔍 Auth Request - Action: ${action}, Wallet: ${walletAddress}`);
    switch(action){
      case 'register':
        return await handleUserRegistration(supabase, walletAddress, requestData);
      case 'get-user':
        return await handleGetUser(supabase, walletAddress);
      case 'activate-membership':
        return await handleActivateMembership(supabase, walletAddress);
      case 'validate-referrer':
        return await handleValidateReferrer(supabase, walletAddress, requestData);
      case 'sync-blockchain-status':
        return await handleSyncBlockchainStatus(supabase, walletAddress, requestData);
      case 'create-missing-data':
        return await handleCreateMissingData(supabase, walletAddress, requestData);
      case 'create-referral-link':
        return await handleCreateReferralLink(supabase, walletAddress, requestData);
      case 'get-referral-link':
        return await handleGetReferralLink(supabase, walletAddress, requestData);
      default:
        return new Response(JSON.stringify({
          error: 'Invalid action'
        }), {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
    }
  } catch (error) {
    console.error('Auth function error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
async function handleUserRegistration(supabase, walletAddress, data) {
  try {
    console.log(`📝 Registration request for: ${walletAddress}`);
    // Check if user already exists in users table
    const { data: existingUser } = await supabase.from('users').select('wallet_address, referrer_wallet').eq('wallet_address', walletAddress).single();
    if (existingUser) {
      console.log(`✅ User already exists: ${walletAddress}`);
      
      // Update referrer if provided and different from existing
      if (data.referrerWallet && data.referrerWallet !== existingUser.referrer_wallet) {
        const ROOT_WALLET = '0x0000000000000000000000000000000000000001';
        let validReferrerWallet = ROOT_WALLET;
        
        if (data.referrerWallet && data.referrerWallet !== ROOT_WALLET) {
          const { data: referrerMember } = await supabase.from('members').select('wallet_address, is_activated').eq('wallet_address', data.referrerWallet).single();
          if (referrerMember && referrerMember.is_activated) {
            validReferrerWallet = data.referrerWallet;
            console.log(`✅ Updating referrer to: ${data.referrerWallet}`);
            
            // Update user record with new referrer
            await supabase.from('users').update({
              referrer_wallet: validReferrerWallet
            }).eq('wallet_address', walletAddress);
          } else {
            console.log(`📍 Invalid/inactive referrer, keeping existing: ${data.referrerWallet}`);
          }
        }
      }
      
      return new Response(JSON.stringify({
        success: true,
        action: 'existing',
        message: 'User already registered',
        user: existingUser
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const ROOT_WALLET = '0x0000000000000000000000000000000000000001';
    // Validate referrer or use root as default
    let validReferrerWallet = ROOT_WALLET // Default to root
    ;
    if (data.referrerWallet && data.referrerWallet !== ROOT_WALLET) {
      const { data: referrerMember } = await supabase.from('members').select('wallet_address, is_activated').eq('wallet_address', data.referrerWallet).single();
      if (referrerMember && referrerMember.is_activated) {
        validReferrerWallet = data.referrerWallet;
        console.log(`✅ Valid active referrer: ${data.referrerWallet}`);
      } else {
        console.log(`📍 Invalid/inactive referrer, using root: ${data.referrerWallet}`);
      }
    } else {
      console.log(`📍 No referrer provided, using root wallet`);
    }
    // Create user record
    const { data: newUser, error: userError } = await supabase.from('users').insert({
      wallet_address: walletAddress,
      referrer_wallet: validReferrerWallet,
      username: data.username || `user_${walletAddress.slice(-6)}`,
      email: data.email || null,
      current_level: 0,
      is_upgraded: false,
      upgrade_timer_enabled: false
    }).select().single();
    if (userError) {
      console.error('User creation error:', userError);
      throw userError;
    }
    // Create member record (not activated yet)
    const { error: memberError } = await supabase.from('members').insert({
      wallet_address: walletAddress,
      is_activated: false,
      current_level: 0,
      max_layer: 0,
      levels_owned: [],
      has_pending_rewards: false,
      upgrade_reminder_enabled: false,
      total_direct_referrals: 0,
      total_team_size: 0
    });
    if (memberError) {
      console.error('Member creation error:', memberError);
      throw memberError;
    }
    // Note: Referral entry will be created during membership activation
    // Registration only stores the referrer_wallet in users table
    console.log(`📝 Referrer stored for later activation: ${validReferrerWallet}`);
    // Create user balance record
    try {
      await supabase.from('user_balances').insert({
        wallet_address: walletAddress,
        bcc_transferable: 500,
        bcc_locked: 0,
        total_usdt_earned: 0
      });
      console.log(`✅ Balance record created for: ${walletAddress}`);
    } catch (balanceError) {
      console.error('Balance creation failed (non-critical):', balanceError);
    }
    console.log(`🎉 Registration completed for: ${walletAddress}`);
    return new Response(JSON.stringify({
      success: true,
      action: 'created',
      user: newUser,
      message: 'User registered successfully - ready to activate membership'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    return new Response(JSON.stringify({
      error: 'Registration failed',
      details: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
}
async function handleGetUser(supabase, walletAddress) {
  try {
    console.log(`👤 Get user request for: ${walletAddress}`);
    // Get member data 
    const { data: memberData, error: memberError } = await supabase.from('members').select(`
        wallet_address,
        is_activated,
        activated_at,
        current_level,
        max_layer,
        levels_owned,
        has_pending_rewards,
        created_at,
        updated_at
      `).eq('wallet_address', walletAddress).single();
    // Get user data for referrer_wallet, username, email
    const { data: userData, error: userError } = await supabase.from('users').select('referrer_wallet, username, email').eq('wallet_address', walletAddress).single();
    // Get balance data
    const { data: balanceData, error: balanceError } = await supabase.from('user_balances').select('bcc_transferable, bcc_restricted, bcc_locked, total_usdt_earned, available_usdt_rewards').eq('wallet_address', walletAddress).single();
    // User doesn't exist - return null but success (allows smooth registration flow)
    if (memberError && memberError.code === 'PGRST116' || userError && userError.code === 'PGRST116') {
      console.log(`❌ User not found: ${walletAddress}`);
      return new Response(JSON.stringify({
        success: true,
        user: null,
        isRegistered: false,
        isMember: false,
        canAccessReferrals: false,
        isPending: false,
        userFlow: 'registration'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    if (memberError) throw memberError;
    if (userError) throw userError;
    const isMember = memberData?.is_activated || false;
    // Sanitize referrer wallet - don't expose root wallet to frontend
    const ROOT_WALLET = '0x0000000000000000000000000000000000000001';
    const sanitizedUserData = {
      ...userData,
      referrer_wallet: userData?.referrer_wallet === ROOT_WALLET ? null : userData?.referrer_wallet
    };
    // Combine member, user, and balance data
    const combinedUserData = {
      ...memberData,
      ...sanitizedUserData,
      user_balances: [
        balanceData || {
          bcc_transferable: 0,
          bcc_restricted: 0,
          bcc_locked: 0,
          total_usdt_earned: 0,
          available_usdt_rewards: 0
        }
      ]
    };
    // Determine user flow for frontend routing
    let userFlow = 'registration';
    if (memberData) {
      // Check if user has complete registration info (username, email, etc.)
      const hasCompleteUserInfo = userData && userData.username && 
        userData.username !== `user_${walletAddress.slice(-6)}` && // Not auto-generated username
        userData.email; // Has email
      
      if (isMember) {
        userFlow = 'dashboard'; // Fully activated member
      } else if (hasCompleteUserInfo) {
        userFlow = 'claim_nft'; // Has complete info, ready for NFT claim
      } else {
        userFlow = 'registration'; // Needs to complete registration info
      }
    }
    console.log(`✅ User data retrieved for: ${walletAddress}, Flow: ${userFlow}, Member: ${isMember}`);
    return new Response(JSON.stringify({
      success: true,
      user: combinedUserData,
      isRegistered: !!memberData,
      isMember: isMember,
      canAccessReferrals: isMember,
      isPending: false,
      memberData: memberData,
      userFlow: userFlow
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to fetch user data',
      details: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
}
async function handleActivateMembership(supabase, walletAddress) {
  try {
    console.log(`🚀 Activation request for: ${walletAddress}`);
    // Use the new SQL function to handle the complete activation flow
    const { data: activationResult, error: activationError } = await supabase.rpc('activate_member_with_nft_claim', {
      p_wallet_address: walletAddress,
      p_nft_type: 'membership',
      p_payment_method: 'demo_activation',
      p_transaction_hash: `activation_${Date.now()}`
    });
    if (activationError) {
      console.error('SQL activation function error:', activationError);
      throw activationError;
    }
    if (!activationResult.success) {
      console.log(`❌ Activation failed: ${activationResult.error}`);
      return new Response(JSON.stringify({
        success: false,
        error: activationResult.error
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Process YOUR ORIGINAL reward system (100 USDT ancestor + 30 USDT platform)
    try {
      const { data: rewardResult } = await supabase.rpc('process_activation_rewards', {
        p_new_member_wallet: walletAddress,
        p_activation_level: 1,
        p_tx_hash: `activation_${Date.now()}`
      });
      if (rewardResult.success) {
        console.log(`💰 Original reward system processed:`);
        if (rewardResult.ancestor_reward) {
          console.log(`💰 Ancestor reward: ${rewardResult.ancestor_reward} USDT → ${rewardResult.ancestor_wallet}`);
        }
        if (rewardResult.platform_revenue) {
          console.log(`🏢 Platform revenue: ${rewardResult.platform_revenue} USDT`);
        }
        console.log(`Total distributed: ${rewardResult.total_rewards_distributed} USDT`);
      }
    } catch (rewardError) {
      console.error('Reward processing failed (non-critical):', rewardError);
    // Continue - member activation is successful even if rewards fail
    }
    console.log(`🎉 Complete member activation successful:`, activationResult);
    return new Response(JSON.stringify({
      success: true,
      message: 'Membership activated! Welcome to Beehive! 🎉',
      details: {
        wallet_address: activationResult.wallet_address,
        referrer_wallet: activationResult.referrer_wallet,
        level: activationResult.level,
        activated_at: activationResult.activated_at
      }
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Membership activation error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to activate membership',
      details: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
}

async function handleValidateReferrer(supabase, currentWallet, data) {
  try {
    // Get referrer address from query params (for GET requests) or request data (for POST)
    let referrerAddress = data.referrerWallet;
    
    // For GET requests, parse from URL query params
    if (!referrerAddress && data.url) {
      const url = new URL('http://localhost' + data.url);
      referrerAddress = url.searchParams.get('address');
    }
    
    // Also handle direct query parameter parsing
    if (!referrerAddress) {
      referrerAddress = data.address;
    }
    
    if (!referrerAddress) {
      return new Response(JSON.stringify({
        error: 'Referrer address required'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    console.log(`🔍 Validating referrer: ${referrerAddress} for user: ${currentWallet}`);

    // Check for self-referral
    if (referrerAddress.toLowerCase() === currentWallet.toLowerCase()) {
      return new Response(JSON.stringify({
        error: 'You cannot refer yourself'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Check if referrer exists and is activated
    const { data: referrerData, error: referrerError } = await supabase
      .from('members')
      .select('wallet_address, is_activated')
      .eq('wallet_address', referrerAddress.toLowerCase())
      .single();

    if (referrerError || !referrerData) {
      return new Response(JSON.stringify({
        error: 'Referrer not found - they must be registered first'
      }), {
        status: 404,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    if (!referrerData.is_activated) {
      return new Response(JSON.stringify({
        error: 'Referrer must be activated first'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Get referrer username for display
    const { data: userData } = await supabase
      .from('users')
      .select('username')
      .eq('wallet_address', referrerAddress.toLowerCase())
      .single();

    console.log(`✅ Valid referrer found: ${referrerAddress}`);

    return new Response(JSON.stringify({
      success: true,
      wallet_address: referrerData.wallet_address,
      username: userData?.username || referrerAddress.slice(0, 8) + '...',
      is_activated: referrerData.is_activated
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Referrer validation error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to validate referrer',
      details: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
}

async function handleSyncBlockchainStatus(supabase, walletAddress, data) {
  try {
    console.log(`🔄 Syncing blockchain status for: ${walletAddress}`);

    // Get current member data
    const { data: memberData, error: memberError } = await supabase
      .from('members')
      .select('is_activated, current_level, levels_owned, wallet_address')
      .eq('wallet_address', walletAddress.toLowerCase())
      .single();

    if (memberError) {
      console.log(`❌ No member record found for: ${walletAddress}`);
      return new Response(JSON.stringify({
        success: false,
        error: 'No member record found'
      }), {
        status: 404,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Check if user is already activated - but also fix levels_owned if needed
    if (memberData.is_activated) {
      console.log(`✅ Member already activated: ${walletAddress}`);
      
      // Fix levels_owned if it's empty but user is activated with current_level
      if ((!memberData.levels_owned || memberData.levels_owned.length === 0) && memberData.current_level > 0) {
        console.log(`🔧 Fixing levels_owned for activated member: ${walletAddress}, level: ${memberData.current_level}`);
        
        const { data: fixedMember, error: fixError } = await supabase
          .from('members')
          .update({
            levels_owned: [memberData.current_level],
            updated_at: new Date().toISOString()
          })
          .eq('wallet_address', walletAddress.toLowerCase())
          .select()
          .single();
          
        if (fixError) {
          console.error('Failed to fix levels_owned:', fixError);
        } else {
          console.log(`✅ Fixed levels_owned for ${walletAddress}: [${memberData.current_level}]`);
          return new Response(JSON.stringify({
            success: true,
            message: 'Fixed levels_owned data for activated member',
            member: fixedMember
          }), {
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          });
        }
      }
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Member is already activated',
        member: memberData
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    console.log(`🔍 Found unactivated member, attempting complete activation: ${walletAddress}`);
    
    // Get user data for referrer information
    const { data: userData } = await supabase
      .from('users')
      .select('referrer_wallet')
      .eq('wallet_address', walletAddress.toLowerCase())
      .single();
    
    // COMPLETE ACTIVATION: Update member with all required data
    const { data: updateResult, error: updateError } = await supabase
      .from('members')
      .update({
        is_activated: true,
        current_level: memberData.current_level || 1,
        levels_owned: [memberData.current_level || 1], // Ensure levels_owned includes current level
        activated_at: new Date().toISOString()
      })
      .eq('wallet_address', walletAddress.toLowerCase())
      .select()
      .single();

    if (updateError) {
      console.error('Member update failed:', updateError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to update member activation',
        details: updateError.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create referrals record if missing and user has a referrer
    if (userData?.referrer_wallet) {
      const { data: existingReferral } = await supabase
        .from('referrals')
        .select('id')
        .eq('referred_wallet', walletAddress.toLowerCase())
        .single();

      if (!existingReferral) {
        const { error: referralError } = await supabase
          .from('referrals')
          .insert({
            referrer_wallet: userData.referrer_wallet,
            referred_wallet: walletAddress.toLowerCase(),
            is_active: true,
            layer: 1,
            member_wallet: walletAddress.toLowerCase(),
            placement_type: 'direct',
            position: 'left'
          });

        if (referralError) {
          console.error('Referrals creation failed (non-critical):', referralError);
        } else {
          console.log(`✅ Created referrals record: ${userData.referrer_wallet} -> ${walletAddress}`);
        }
      }
    }

    // Ensure user_balances record exists
    const { data: existingBalance } = await supabase
      .from('user_balances')
      .select('wallet_address')
      .eq('wallet_address', walletAddress.toLowerCase())
      .single();

    if (!existingBalance) {
      const { error: balanceError } = await supabase
        .from('user_balances')
        .insert({
          wallet_address: walletAddress.toLowerCase(),
          bcc_transferable: 500,
          bcc_restricted: 0,
          bcc_locked: 0,
          total_usdt_earned: 0,
          available_usdt_rewards: 0
        });

      if (balanceError) {
        console.error('Balance creation failed (non-critical):', balanceError);
      } else {
        console.log(`✅ Created balance record for: ${walletAddress}`);
      }
    }


    console.log(`✅ Member activation synced successfully: ${walletAddress}`);
    return new Response(JSON.stringify({
      success: true,
      message: 'Member activation synced from blockchain',
      member: updateResult
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Blockchain sync error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to sync blockchain status',
      details: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
}

async function handleCreateMissingData(supabase, walletAddress, data) {
  try {
    console.log(`🔧 Creating missing data for: ${walletAddress}`);
    
    const fixes = [];

    // Get current user and member data
    const { data: userData } = await supabase
      .from('users')
      .select('referrer_wallet, username, email')
      .eq('wallet_address', walletAddress.toLowerCase())
      .single();

    const { data: memberData } = await supabase
      .from('members')
      .select('*')
      .eq('wallet_address', walletAddress.toLowerCase())
      .single();

    if (!memberData || !userData) {
      return new Response(JSON.stringify({
        success: false,
        error: 'User or member data not found'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 1. Create referrals record if missing
    if (userData.referrer_wallet) {
      const { data: existingReferral } = await supabase
        .from('referrals')
        .select('id')
        .eq('referred_wallet', walletAddress.toLowerCase())
        .single();

      if (!existingReferral) {
        const { error: referralError } = await supabase
          .from('referrals')
          .insert({
            referrer_wallet: userData.referrer_wallet,
            referred_wallet: walletAddress.toLowerCase(),
            is_active: true,
            layer: 1,
            member_wallet: walletAddress.toLowerCase(),
            placement_type: 'direct',
            position: 'left'
          });

        if (!referralError) {
          fixes.push(`✅ Created referrals record: ${userData.referrer_wallet} -> ${walletAddress}`);
        } else {
          fixes.push(`❌ Failed to create referrals record: ${referralError.message}`);
        }
      } else {
        fixes.push(`✓ Referrals record already exists`);
      }
    } else {
      fixes.push(`⚠️  No referrer wallet found in user data`);
    }

    // 2. Create orders record if missing (for activated members)
    if (memberData.is_activated) {
      const { data: existingOrder } = await supabase
        .from('orders')
        .select('id')
        .eq('wallet_address', walletAddress.toLowerCase())
        .eq('level', memberData.current_level)
        .single();

      if (!existingOrder) {
        const { error: orderError } = await supabase
          .from('orders')
          .insert({
            wallet_address: walletAddress.toLowerCase(),
            level: memberData.current_level,
            status: 'completed',
            payment_method: 'blockchain_activation',
            transaction_hash: `activation_${Date.now()}`,
            amount_usdt: memberData.current_level === 1 ? '130.00' : '0.00',
            created_at: memberData.activated_at || new Date().toISOString(),
            completed_at: memberData.activated_at || new Date().toISOString()
          });

        if (!orderError) {
          fixes.push(`✅ Created orders record for level ${memberData.current_level}`);
        } else {
          fixes.push(`❌ Failed to create orders record: ${orderError.message}`);
        }
      } else {
        fixes.push(`✓ Orders record already exists for level ${memberData.current_level}`);
      }
    }

    console.log(`🔧 Missing data creation completed for ${walletAddress}:`, fixes);

    return new Response(JSON.stringify({
      success: true,
      message: `Missing data created for ${walletAddress}`,
      fixes: fixes
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Create missing data error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to create missing data',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function handleCreateReferralLink(supabase, walletAddress, data) {
  try {
    console.log(`🔗 Creating referral link for: ${walletAddress}`);

    // Check if user is activated (only activated members can have referral links)
    const { data: memberData } = await supabase
      .from('members')
      .select('is_activated')
      .eq('wallet_address', walletAddress.toLowerCase())
      .single();

    if (!memberData?.is_activated) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Only activated members can generate referral links'
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Simple referral link: current_url/register?ref=wallet_address
    const baseUrl = data.baseUrl || 'https://beehive-lifestyle.io';
    const referralLink = `${baseUrl}/register?ref=${walletAddress.toLowerCase()}`;

    // Check if referral_links record exists
    const { data: existingLink } = await supabase
      .from('referral_links')
      .select('*')
      .eq('referrer_wallet', walletAddress.toLowerCase())
      .single();

    if (!existingLink) {
      // Create referral_links record
      await supabase
        .from('referral_links')
        .insert({
          referrer_wallet: walletAddress.toLowerCase(),
          link_code: walletAddress.toLowerCase(), // Use wallet address as link code
          is_active: true,
          clicks: 0,
          conversions: 0
        });
      
      console.log(`✅ Created referral_links record for: ${walletAddress}`);
    }

    return new Response(JSON.stringify({
      success: true,
      link: referralLink,
      wallet_address: walletAddress.toLowerCase()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Create referral link error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to create referral link',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function handleGetReferralLink(supabase, walletAddress, data) {
  try {
    console.log(`🔍 Getting referral link for: ${walletAddress}`);

    // Check if user is activated
    const { data: memberData } = await supabase
      .from('members')
      .select('is_activated')
      .eq('wallet_address', walletAddress.toLowerCase())
      .single();

    if (!memberData?.is_activated) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Only activated members can have referral links'
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Generate referral link
    const baseUrl = data.baseUrl || 'https://beehive-lifestyle.io';
    const referralLink = `${baseUrl}/register?ref=${walletAddress.toLowerCase()}`;

    // Get referral stats
    const { data: linkStats } = await supabase
      .from('referral_links')
      .select('clicks, conversions')
      .eq('referrer_wallet', walletAddress.toLowerCase())
      .single();

    const { count: directReferrals } = await supabase
      .from('referrals')
      .select('*', { count: 'exact' })
      .eq('referrer_wallet', walletAddress.toLowerCase())
      .eq('layer', 1);

    return new Response(JSON.stringify({
      success: true,
      link: referralLink,
      wallet_address: walletAddress.toLowerCase(),
      stats: {
        clicks: linkStats?.clicks || 0,
        conversions: linkStats?.conversions || 0,
        direct_referrals: directReferrals || 0
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Get referral link error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to get referral link',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
} // Updated Sat Sep  7 2025
