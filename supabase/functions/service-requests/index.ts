// Beehive Platform - Service Requests Edge Function
// Handles NFT service requests and management
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
    let requestData;

    try {
      requestData = await req.json();
    } catch {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid JSON payload'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    const { action } = requestData;

    switch (action) {
      case 'submit-request':
        return await handleSubmitRequest(supabase, walletAddress, requestData);
      case 'get-requests':
        return await handleGetRequests(supabase, walletAddress, requestData);
      case 'update-request':
        return await handleUpdateRequest(supabase, walletAddress, requestData);
      case 'get-request-details':
        return await handleGetRequestDetails(supabase, walletAddress, requestData);
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
    console.error('Service requests function error:', error);
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

async function handleSubmitRequest(supabase, walletAddress: string, data) {
  try {
    const {
      nft_id,
      requestTitle,
      requestDescription,
      urgency = 'normal',
      contactInfo,
      additionalFiles
    } = data;

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

    if (!nft_id || !requestTitle || !requestDescription) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required fields: nft_id, requestTitle, requestDescription'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Verify user owns or has access to the NFT service
    const { data: nftAccess, error: nftError } = await supabase
      .from('advertisement_nfts')
      .select('*')
      .eq('id', nft_id)
      .single();

    if (nftError || !nftAccess) {
      return new Response(JSON.stringify({
        success: false,
        error: 'NFT service not found or access denied'
      }), {
        status: 404,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Create service request record
    const { data: request, error: requestError } = await supabase
      .from('service_requests')
      .insert({
        wallet_address: walletAddress,
        nft_id: nft_id,
        request_title: requestTitle,
        request_description: requestDescription,
        urgency: urgency,
        contact_info: contactInfo,
        additional_files: additionalFiles,
        status: 'new_application',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (requestError) {
      throw requestError;
    }

    // Create notification for admins (optional)
    await supabase
      .from('admin_notifications')
      .insert({
        notification_type: 'new_service_request',
        title: `New Service Request: ${requestTitle}`,
        message: `${walletAddress} submitted a service request for NFT ${nft_id}`,
        data: {
          request_id: request.id,
          nft_id: nft_id,
          wallet_address: walletAddress,
          urgency: urgency
        }
      });

    console.log(`Service request submitted: ${request.id} for ${walletAddress}`);

    return new Response(JSON.stringify({
      success: true,
      message: 'Service request submitted successfully',
      data: {
        request_id: request.id,
        nft_id: nft_id,
        status: request.status,
        created_at: request.created_at,
        estimated_completion: getEstimatedCompletion(urgency)
      }
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Submit request error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to submit service request',
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

async function handleGetRequests(supabase, walletAddress: string, data) {
  try {
    const { nft_id, limit = 50, offset = 0 } = data;

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

    let query = supabase
      .from('service_requests')
      .select(`
        *,
        advertisement_nfts (
          title,
          service_name,
          service_type
        )
      `)
      .eq('wallet_address', walletAddress)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (nft_id) {
      query = query.eq('nft_id', nft_id);
    }

    const { data: requests, error } = await query;

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify({
      success: true,
      data: requests || []
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Get requests error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to fetch service requests',
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

async function handleUpdateRequest(supabase, walletAddress: string, data) {
  try {
    const { request_id, status, admin_notes } = data;

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

    // Verify request ownership or admin access
    const { data: request, error: requestError } = await supabase
      .from('service_requests')
      .select('*')
      .eq('id', request_id)
      .single();

    if (requestError || !request) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Service request not found'
      }), {
        status: 404,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Check if user owns the request
    const isOwner = request.wallet_address === walletAddress;
    
    // Check if user is admin (for status updates)
    const { data: adminCheck } = await supabase.rpc('is_admin', {
      p_wallet_address: walletAddress
    });
    const isAdmin = adminCheck?.is_admin || false;

    if (!isOwner && !isAdmin) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Access denied'
      }), {
        status: 403,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Update request
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (status && isAdmin) {
      updateData.status = status;
    }

    if (admin_notes && isAdmin) {
      updateData.admin_notes = admin_notes;
    }

    const { data: updatedRequest, error: updateError } = await supabase
      .from('service_requests')
      .update(updateData)
      .eq('id', request_id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Service request updated successfully',
      data: updatedRequest
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Update request error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to update service request',
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

async function handleGetRequestDetails(supabase, walletAddress: string, data) {
  try {
    const { request_id } = data;

    if (!walletAddress || !request_id) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Wallet address and request ID required'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    const { data: request, error } = await supabase
      .from('service_requests')
      .select(`
        *,
        advertisement_nfts (
          title,
          service_name,
          service_type,
          description,
          price_bcc
        )
      `)
      .eq('id', request_id)
      .eq('wallet_address', walletAddress)
      .single();

    if (error || !request) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Service request not found or access denied'
      }), {
        status: 404,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      data: request
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Get request details error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to fetch request details',
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

// Helper function to estimate completion time based on urgency
function getEstimatedCompletion(urgency: string): string {
  const now = new Date();
  let hoursToAdd = 24; // default 24 hours

  switch (urgency) {
    case 'high':
      hoursToAdd = 4; // 4 hours
      break;
    case 'normal':
      hoursToAdd = 24; // 24 hours
      break;
    case 'low':
      hoursToAdd = 72; // 72 hours
      break;
  }

  const estimatedTime = new Date(now.getTime() + (hoursToAdd * 60 * 60 * 1000));
  return estimatedTime.toISOString();
}