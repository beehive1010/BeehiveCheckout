// Multi-Chain Payment Handler - Supabase Edge Function
// Handles cross-chain USDC payment recording and bridge requests

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wallet-address',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
};

interface MultiChainPaymentData {
  transactionHash: string;
  chainId: number;
  amount: number;
  payerAddress: string;
  paymentPurpose: string;
  fees: {
    networkFee: number;
    platformFee: number;
    bridgeFee?: number;
    totalFee: number;
  };
  status: string;
  level?: number;
  referenceId?: string;
}

interface BridgeRequestData {
  sourceChainId: number;
  targetChainId: number;
  amount: number;
  transactionHash: string;
  payerAddress: string;
  paymentPurpose: string;
  bridgeTransactionId: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const action = url.pathname.split('/').pop();
    
    switch (action) {
      case 'record':
        return await recordMultiChainPayment(req, supabase);
      
      case 'bridge':
        return await createBridgeRequest(req, supabase);
      
      case 'history':
        return await getPaymentHistory(req, supabase);
      
      case 'bridge-status':
        return await getBridgeStatus(req, supabase);
      
      default:
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid action' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
    }

  } catch (error) {
    console.error('Multi-chain payment function error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// Record multi-chain payment in database
async function recordMultiChainPayment(req: Request, supabase: any) {
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
    );
  }

  try {
    const paymentData: MultiChainPaymentData = await req.json();

    // Validate required fields
    if (!paymentData.transactionHash || !paymentData.chainId || !paymentData.payerAddress) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      );
    }

    // Insert payment record
    const { data, error } = await supabase
      .from('multi_chain_payments')
      .insert({
        transaction_hash: paymentData.transactionHash,
        chain_id: paymentData.chainId,
        amount_usdc: paymentData.amount,
        payer_address: paymentData.payerAddress,
        payment_purpose: paymentData.paymentPurpose,
        network_fee: paymentData.fees.networkFee,
        platform_fee: paymentData.fees.platformFee,
        bridge_fee: paymentData.fees.bridgeFee || 0,
        total_fee: paymentData.fees.totalFee,
        status: paymentData.status,
        level: paymentData.level,
        reference_id: paymentData.referenceId,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to record payment',
          details: error.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: data,
        message: 'Payment recorded successfully' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
    );

  } catch (error) {
    console.error('Record payment error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Failed to process payment recording',
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
    );
  }
}

// Create bridge request for cross-chain operations
async function createBridgeRequest(req: Request, supabase: any) {
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
    );
  }

  try {
    const bridgeData: BridgeRequestData = await req.json();

    // Validate required fields
    if (!bridgeData.sourceChainId || !bridgeData.targetChainId || !bridgeData.transactionHash) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required bridge fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      );
    }

    // Insert bridge request
    const { data, error } = await supabase
      .from('bridge_requests')
      .insert({
        bridge_transaction_id: bridgeData.bridgeTransactionId,
        source_chain_id: bridgeData.sourceChainId,
        target_chain_id: bridgeData.targetChainId,
        amount_usdc: bridgeData.amount,
        source_transaction_hash: bridgeData.transactionHash,
        payer_address: bridgeData.payerAddress,
        payment_purpose: bridgeData.paymentPurpose,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Bridge request error:', error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to create bridge request',
          details: error.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: data,
        message: 'Bridge request created successfully' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
    );

  } catch (error) {
    console.error('Create bridge request error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Failed to process bridge request',
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
    );
  }
}

// Get payment history for a wallet
async function getPaymentHistory(req: Request, supabase: any) {
  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
    );
  }

  try {
    const url = new URL(req.url);
    const walletAddress = url.searchParams.get('wallet');

    if (!walletAddress) {
      return new Response(
        JSON.stringify({ success: false, error: 'Wallet address required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      );
    }

    // Get payment history
    const { data, error } = await supabase
      .from('multi_chain_payments')
      .select('*')
      .eq('payer_address', walletAddress)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Payment history error:', error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to fetch payment history',
          details: error.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: { payments: data || [] },
        message: 'Payment history retrieved successfully' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
    );

  } catch (error) {
    console.error('Get payment history error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Failed to fetch payment history',
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
    );
  }
}

// Get bridge status
async function getBridgeStatus(req: Request, supabase: any) {
  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
    );
  }

  try {
    const url = new URL(req.url);
    const bridgeId = url.searchParams.get('id');

    if (!bridgeId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Bridge transaction ID required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      );
    }

    // Get bridge status
    const { data, error } = await supabase
      .from('bridge_requests')
      .select('*')
      .eq('bridge_transaction_id', bridgeId)
      .single();

    if (error) {
      console.error('Bridge status error:', error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to fetch bridge status',
          details: error.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: data,
        message: 'Bridge status retrieved successfully' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
    );

  } catch (error) {
    console.error('Get bridge status error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Failed to fetch bridge status',
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
    );
  }
}