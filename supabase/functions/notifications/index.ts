// =============================================
// Beehive Platform - Notifications Edge Function
// Handles user notifications, stats, and management
// =============================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wallet-address',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const walletAddress = req.headers.get('x-wallet-address');
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'get-notifications';

    console.log(`🔔 Notifications Action: ${action} for wallet: ${walletAddress}`);

    if (!walletAddress) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Wallet address required'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    switch (action) {
      case 'stats':
        return await handleGetStats(supabase, walletAddress);
      case 'get-notifications':
        return await handleGetNotifications(supabase, walletAddress, url);
      case 'mark-read':
        return await handleMarkAsRead(supabase, walletAddress, url);
      case 'mark-all-read':
        return await handleMarkAllAsRead(supabase, walletAddress);
      default:
        return new Response(JSON.stringify({
          success: false,
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
    console.error('Notifications function error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error',
      message: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});

// Get notification statistics
async function handleGetStats(supabase, walletAddress: string) {
  try {
    console.log(`📊 Getting notification stats for: ${walletAddress}`);

    // Get user notifications stats
    const { data: userStats, error: userError } = await supabase
      .from('user_notifications')
      .select('id, is_read, type')
      .ilike('wallet_address', walletAddress);

    if (userError) {
      console.error('User notifications stats error:', userError);
    }

    // Get reward notifications stats
    const { data: rewardStats, error: rewardError } = await supabase
      .from('reward_notifications')
      .select('id, is_read, notification_type')
      .ilike('wallet_address', walletAddress);

    if (rewardError) {
      console.error('Reward notifications stats error:', rewardError);
    }

    // Combine stats
    const allNotifications = [...(userStats || []), ...(rewardStats || [])];
    const unreadCount = allNotifications.filter(n => !n.is_read).length;
    const urgentCount = allNotifications.filter(n => 
      (n.type === 'urgent' || n.notification_type === 'urgent') && !n.is_read
    ).length;
    const actionRequiredCount = allNotifications.filter(n => 
      (n.type === 'action_required' || n.notification_type === 'action_required') && !n.is_read
    ).length;

    const stats = {
      unreadCount,
      totalCount: allNotifications.length,
      urgentCount,
      actionRequiredCount
    };

    console.log(`📊 Stats calculated:`, stats);

    return new Response(JSON.stringify({
      success: true,
      data: stats
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to fetch notification stats',
      details: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
}

// Get all notifications for a user
async function handleGetNotifications(supabase, walletAddress: string, url: URL) {
  try {
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const unreadOnly = url.searchParams.get('unread_only') === 'true';

    console.log(`📋 Getting notifications for: ${walletAddress}, limit: ${limit}, offset: ${offset}, unreadOnly: ${unreadOnly}`);

    // Build queries
    let userQuery = supabase
      .from('user_notifications')
      .select('*')
      .ilike('wallet_address', walletAddress)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    let rewardQuery = supabase
      .from('reward_notifications')
      .select('*')
      .ilike('wallet_address', walletAddress)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (unreadOnly) {
      userQuery = userQuery.eq('is_read', false);
      rewardQuery = rewardQuery.eq('is_read', false);
    }

    // Execute queries in parallel
    const [userResult, rewardResult] = await Promise.allSettled([
      userQuery,
      rewardQuery
    ]);

    let userNotifications = [];
    let rewardNotifications = [];

    if (userResult.status === 'fulfilled' && userResult.value.data) {
      userNotifications = userResult.value.data.map(n => ({
        ...n,
        source: 'user',
        // Normalize field names for frontend
        recipientWallet: n.wallet_address,
        triggerWallet: null
      }));
    }

    if (rewardResult.status === 'fulfilled' && rewardResult.value.data) {
      rewardNotifications = rewardResult.value.data.map(n => ({
        ...n,
        source: 'reward',
        // Normalize field names for frontend
        recipientWallet: n.wallet_address,
        triggerWallet: n.trigger_wallet,
        type: n.notification_type,
        // Map reward notification fields to standard format
        title: n.title || 'Reward Notification',
        message: n.message || 'You have a reward notification'
      }));
    }

    // Combine and sort by created_at
    const allNotifications = [...userNotifications, ...rewardNotifications]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit);

    console.log(`📋 Found ${allNotifications.length} notifications`);

    return new Response(JSON.stringify({
      success: true,
      data: {
        notifications: allNotifications,
        count: allNotifications.length,
        hasMore: allNotifications.length === limit
      }
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to fetch notifications',
      details: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
}

// Mark a specific notification as read
async function handleMarkAsRead(supabase, walletAddress: string, url: URL) {
  try {
    const notificationId = url.searchParams.get('id');
    const source = url.searchParams.get('source'); // 'user' or 'reward'

    if (!notificationId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Notification ID required'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    console.log(`✅ Marking notification as read: ${notificationId}, source: ${source}`);

    const updateData = {
      is_read: true,
      read_at: new Date().toISOString()
    };

    let updateResult;
    if (source === 'reward') {
      updateResult = await supabase
        .from('reward_notifications')
        .update(updateData)
        .eq('id', notificationId)
        .ilike('wallet_address', walletAddress);
    } else {
      updateResult = await supabase
        .from('user_notifications')
        .update(updateData)
        .eq('id', notificationId)
        .ilike('wallet_address', walletAddress);
    }

    if (updateResult.error) {
      throw updateResult.error;
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Notification marked as read'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to mark notification as read',
      details: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
}

// Mark all notifications as read for a user
async function handleMarkAllAsRead(supabase, walletAddress: string) {
  try {
    console.log(`✅ Marking all notifications as read for: ${walletAddress}`);

    const updateData = {
      is_read: true,
      read_at: new Date().toISOString()
    };

    // Update both tables in parallel
    const [userResult, rewardResult] = await Promise.allSettled([
      supabase
        .from('user_notifications')
        .update(updateData)
        .ilike('wallet_address', walletAddress)
        .eq('is_read', false),
      supabase
        .from('reward_notifications')
        .update(updateData)
        .ilike('wallet_address', walletAddress)
        .eq('is_read', false)
    ]);

    console.log(`✅ Marked all notifications as read`);

    return new Response(JSON.stringify({
      success: true,
      message: 'All notifications marked as read'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Mark all as read error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to mark all notifications as read',
      details: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
}