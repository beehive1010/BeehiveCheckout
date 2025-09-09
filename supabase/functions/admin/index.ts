// =============================================
// Beehive Platform - Admin Controls Edge Function
// Handles admin operations for membership activation pending periods
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
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const walletAddress = req.headers.get('x-wallet-address');
    if (!walletAddress) {
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
    // Check admin privileges
    const { data: userData, error: userError } = await supabase.from('users').select('is_admin').eq('wallet_address', walletAddress).single();
    if (userError || !userData?.is_admin) {
      return new Response(JSON.stringify({
        error: 'Admin privileges required'
      }), {
        status: 403,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const { action, ...requestData } = await req.json();
    switch(action){
      case 'get-settings':
        return await handleGetSettings(supabase, walletAddress);
      case 'toggle-global-pending':
        return await handleToggleGlobalPending(supabase, walletAddress, requestData);
      case 'set-member-pending':
        return await handleSetMemberPending(supabase, walletAddress, requestData);
      case 'clear-member-pending':
        return await handleClearMemberPending(supabase, walletAddress, requestData);
      case 'get-pending-members':
        return await handleGetPendingMembers(supabase, walletAddress);
      case 'get-admin-actions':
        return await handleGetAdminActions(supabase, walletAddress, requestData);
      case 'update-setting':
        return await handleUpdateSetting(supabase, walletAddress, requestData);
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
    console.error('Admin function error:', error);
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
async function handleGetSettings(supabase, walletAddress) {
  try {
    // Get activation pending related settings
    const { data: settings, error } = await supabase.from('system_settings').select('key, value, description, updated_at').in('key', [
      'activation_pending_enabled',
      'default_pending_hours',
      'admin_can_override_pending',
      'max_pending_hours',
      'min_pending_hours',
      'notify_pending_expiry',
      'pending_expiry_warning_hours'
    ]);
    if (error) throw error;
    // Convert to object for easier access
    const settingsObj = settings?.reduce((acc, setting)=>{
      acc[setting.key] = {
        value: setting.value,
        description: setting.description,
        updated_at: setting.updated_at
      };
      return acc;
    }, {}) || {};
    const response = {
      success: true,
      settings: settingsObj,
      summary: {
        globalPendingEnabled: settingsObj.activation_pending_enabled?.value === 'true',
        defaultHours: parseInt(settingsObj.default_pending_hours?.value || '48'),
        adminCanOverride: settingsObj.admin_can_override_pending?.value === 'true',
        maxHours: parseInt(settingsObj.max_pending_hours?.value || '168'),
        minHours: parseInt(settingsObj.min_pending_hours?.value || '1')
      }
    };
    return new Response(JSON.stringify(response), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Get settings error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to fetch admin settings'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
}
async function handleToggleGlobalPending(supabase, walletAddress, data) {
  try {
    const { enabled, reason } = data;
    if (typeof enabled !== 'boolean') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Enabled status (boolean) required'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const { data: result, error } = await supabase.rpc('toggle_activation_pending_global', {
      p_admin_wallet: walletAddress,
      p_enabled: enabled,
      p_reason: reason
    });
    if (error) throw error;
    if (!result.success) {
      return new Response(JSON.stringify({
        success: false,
        error: result.error
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const response = {
      success: true,
      enabled: result.enabled,
      message: result.message
    };
    return new Response(JSON.stringify(response), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Toggle global pending error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to toggle global pending setting'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
}
async function handleSetMemberPending(supabase, walletAddress, data) {
  try {
    const { targetWallet, pendingHours, reason } = data;
    if (!targetWallet || !pendingHours) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Target wallet and pending hours required'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const { data: result, error } = await supabase.rpc('set_member_activation_pending', {
      p_admin_wallet: walletAddress,
      p_target_wallet: targetWallet,
      p_pending_hours: parseInt(pendingHours),
      p_reason: reason
    });
    if (error) throw error;
    if (!result.success) {
      return new Response(JSON.stringify({
        success: false,
        error: result.error
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const response = {
      success: true,
      targetWallet: targetWallet,
      pendingHours: result.pending_hours,
      expiresAt: result.expires_at,
      message: result.message
    };
    return new Response(JSON.stringify(response), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Set member pending error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to set member activation pending'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
}
async function handleClearMemberPending(supabase, walletAddress, data) {
  try {
    const { targetWallet, reason } = data;
    if (!targetWallet) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Target wallet required'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const { data: result, error } = await supabase.rpc('clear_member_activation_pending', {
      p_admin_wallet: walletAddress,
      p_target_wallet: targetWallet,
      p_reason: reason
    });
    if (error) throw error;
    if (!result.success) {
      return new Response(JSON.stringify({
        success: false,
        error: result.error
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const response = {
      success: true,
      targetWallet: targetWallet,
      message: result.message
    };
    return new Response(JSON.stringify(response), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Clear member pending error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to clear member activation pending'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
}
async function handleGetPendingMembers(supabase, walletAddress) {
  try {
    const { data: pendingMembers, error } = await supabase.rpc('get_pending_activations', {
      p_admin_wallet: walletAddress
    });
    if (error) throw error;
    const response = {
      success: true,
      pendingMembers: pendingMembers || [],
      count: pendingMembers?.length || 0
    };
    return new Response(JSON.stringify(response), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Get pending members error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to fetch pending members'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
}
async function handleGetAdminActions(supabase, walletAddress, data) {
  try {
    const { limit = 50, offset = 0 } = data;
    const { data: actions, error } = await supabase.from('admin_actions').select(`
        id,
        admin_wallet,
        action_type,
        target_wallet,
        action_data,
        reason,
        created_at,
        admin_info:users!admin_actions_admin_wallet_fkey (
          username
        ),
        target_info:users!admin_actions_target_wallet_fkey (
          username
        )
      `).order('created_at', {
      ascending: false
    }).range(offset, offset + limit - 1);
    if (error) throw error;
    const response = {
      success: true,
      actions: actions || [],
      pagination: {
        limit,
        offset,
        total: actions?.length || 0
      }
    };
    return new Response(JSON.stringify(response), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Get admin actions error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to fetch admin actions'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
}
async function handleUpdateSetting(supabase, walletAddress, data) {
  try {
    const { settingKey, settingValue, reason } = data;
    if (!settingKey || settingValue === undefined) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Setting key and value required'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Validate allowed settings
    const allowedSettings = [
      'default_pending_hours',
      'max_pending_hours',
      'min_pending_hours',
      'pending_expiry_warning_hours'
    ];
    if (!allowedSettings.includes(settingKey)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Setting not allowed to be modified via this endpoint'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Update setting
    const { error: updateError } = await supabase.from('system_settings').update({
      value: settingValue.toString(),
      updated_at: new Date().toISOString()
    }).eq('key', settingKey);
    if (updateError) throw updateError;
    // Log admin action
    const { error: logError } = await supabase.from('admin_actions').insert({
      admin_wallet: walletAddress,
      action_type: 'update_setting',
      action_data: {
        setting_key: settingKey,
        new_value: settingValue,
        old_value: 'previous_value' // Could fetch this first if needed
      },
      reason: reason
    });
    if (logError) console.warn('Failed to log admin action:', logError);
    const response = {
      success: true,
      settingKey,
      newValue: settingValue,
      message: `Successfully updated ${settingKey} to ${settingValue}`
    };
    return new Response(JSON.stringify(response), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Update setting error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to update setting'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
}
