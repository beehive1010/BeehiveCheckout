import type { Express } from "express";
import { db } from "../lib/db";
import { members, userBalances, bccPurchaseOrders } from "../../../shared/schema";
import { eq, sql } from "drizzle-orm";

// Company server wallet configuration
const COMPANY_SERVER_WALLET = process.env.COMPANY_SERVER_WALLET || "0x1234567890123456789012345678901234567890";
const BCC_EXCHANGE_RATE = 1; // 1 USDC = 1 BCC (configurable)
const MINIMUM_PURCHASE_USDC = 10; // Minimum $10 USDC purchase
const MAXIMUM_PURCHASE_USDC = 10000; // Maximum $10,000 USDC purchase

interface BccPurchaseRequest {
  amountUSDC: number;
  network: 'arbitrum-one' | 'arbitrum-sepolia' | 'ethereum' | 'polygon';
  transactionHash?: string;
  bridgeUsed?: boolean;
  paymentMethod: 'thirdweb_bridge' | 'direct_transfer';
}

interface BccPurchaseResponse {
  success: boolean;
  orderId: string;
  amountUSDC: number;
  amountBCC: number;
  exchangeRate: number;
  companyWallet: string;
  networkInfo: {
    chainId: number;
    name: string;
    usdcContract: string;
  };
  message: string;
  estimatedProcessingTime: string;
}

export function registerBccPurchaseRoutes(app: Express, requireWallet: any) {
  
  // Get BCC purchase configuration and rates
  app.get("/api/bcc/purchase-config", requireWallet, async (req: any, res: any) => {
    try {
      const networkConfigs = {
        'arbitrum-one': {
          chainId: 42161,
          name: 'Arbitrum One',
          usdcContract: '0xA0b86a33E6441E8Ff8BBb5F0f1F4a90AC4Cd0a35',
          bridgeSupported: true
        },
        'arbitrum-sepolia': {
          chainId: 421614,
          name: 'Arbitrum Sepolia',
          usdcContract: '0xTestUSDCContract',
          bridgeSupported: true
        },
        'ethereum': {
          chainId: 1,
          name: 'Ethereum Mainnet',
          usdcContract: '0xA0b86a33E6441E8Ff8BBb5F0f1F4a90AC4Cd0a35',
          bridgeSupported: true
        },
        'polygon': {
          chainId: 137,
          name: 'Polygon',
          usdcContract: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
          bridgeSupported: true
        }
      };

      res.json({
        success: true,
        config: {
          exchangeRate: BCC_EXCHANGE_RATE,
          minimumPurchaseUSDC: MINIMUM_PURCHASE_USDC,
          maximumPurchaseUSDC: MAXIMUM_PURCHASE_USDC,
          companyServerWallet: COMPANY_SERVER_WALLET,
          supportedNetworks: networkConfigs,
          paymentMethods: ['thirdweb_bridge', 'direct_transfer'],
          processingTimeEstimate: '5-15 minutes'
        }
      });
    } catch (error) {
      console.error('❌ Error fetching BCC purchase config:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch purchase configuration' 
      });
    }
  });

  // Initiate BCC token purchase
  app.post("/api/bcc/purchase", requireWallet, async (req: any, res: any) => {
    try {
      const walletAddress = req.walletAddress;
      const purchaseData: BccPurchaseRequest = req.body;

      // Validate purchase amount
      if (purchaseData.amountUSDC < MINIMUM_PURCHASE_USDC) {
        return res.status(400).json({
          success: false,
          error: `Minimum purchase amount is $${MINIMUM_PURCHASE_USDC} USDC`
        });
      }

      if (purchaseData.amountUSDC > MAXIMUM_PURCHASE_USDC) {
        return res.status(400).json({
          success: false,
          error: `Maximum purchase amount is $${MAXIMUM_PURCHASE_USDC} USDC`
        });
      }

      // Get network configuration
      const networkConfigs = {
        'arbitrum-one': {
          chainId: 42161,
          name: 'Arbitrum One',
          usdcContract: '0xA0b86a33E6441E8Ff8BBb5F0f1F4a90AC4Cd0a35'
        },
        'arbitrum-sepolia': {
          chainId: 421614,
          name: 'Arbitrum Sepolia',
          usdcContract: '0xTestUSDCContract'
        },
        'ethereum': {
          chainId: 1,
          name: 'Ethereum Mainnet',
          usdcContract: '0xA0b86a33E6441E8Ff8BBb5F0f1F4a90AC4Cd0a35'
        },
        'polygon': {
          chainId: 137,
          name: 'Polygon',
          usdcContract: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'
        }
      };

      const networkInfo = networkConfigs[purchaseData.network];
      if (!networkInfo) {
        return res.status(400).json({
          success: false,
          error: 'Unsupported network'
        });
      }

      // Calculate BCC amount
      const bccAmount = purchaseData.amountUSDC * BCC_EXCHANGE_RATE;
      
      // Create purchase order
      const orderId = `bcc_purchase_${walletAddress}_${Date.now()}`;
      
      await db.insert(bccPurchaseOrders).values({
        orderId,
        buyerWallet: walletAddress,
        amountUSDC: purchaseData.amountUSDC,
        amountBCC: bccAmount,
        network: purchaseData.network,
        paymentMethod: purchaseData.paymentMethod,
        companyWallet: COMPANY_SERVER_WALLET,
        transactionHash: purchaseData.transactionHash || null,
        bridgeUsed: purchaseData.bridgeUsed || false,
        status: 'pending',
        exchangeRate: BCC_EXCHANGE_RATE,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes expiry
      });

      const response: BccPurchaseResponse = {
        success: true,
        orderId,
        amountUSDC: purchaseData.amountUSDC,
        amountBCC: bccAmount,
        exchangeRate: BCC_EXCHANGE_RATE,
        companyWallet: COMPANY_SERVER_WALLET,
        networkInfo,
        message: `Purchase order created. Send ${purchaseData.amountUSDC} USDC to company wallet to receive ${bccAmount} BCC tokens.`,
        estimatedProcessingTime: '5-15 minutes after payment confirmation'
      };

      res.json(response);
    } catch (error) {
      console.error('❌ Error creating BCC purchase order:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to create purchase order' 
      });
    }
  });

  // Confirm BCC purchase payment (webhook or manual verification)
  app.post("/api/bcc/confirm-payment", requireWallet, async (req: any, res: any) => {
    try {
      const walletAddress = req.walletAddress;
      const { orderId, transactionHash, actualAmountReceived } = req.body;

      // Find the purchase order
      const [purchaseOrder] = await db
        .select()
        .from(bccPurchaseOrders)
        .where(eq(bccPurchaseOrders.orderId, orderId))
        .limit(1);

      if (!purchaseOrder) {
        return res.status(404).json({
          success: false,
          error: 'Purchase order not found'
        });
      }

      if (purchaseOrder.buyerWallet !== walletAddress) {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized to confirm this payment'
        });
      }

      if (purchaseOrder.status !== 'pending') {
        return res.status(400).json({
          success: false,
          error: `Order is already ${purchaseOrder.status}`
        });
      }

      // Check if order has expired
      if (new Date() > purchaseOrder.expiresAt) {
        await db
          .update(bccPurchaseOrders)
          .set({ status: 'expired', updatedAt: new Date() })
          .where(eq(bccPurchaseOrders.orderId, orderId));

        return res.status(400).json({
          success: false,
          error: 'Purchase order has expired'
        });
      }

      // Update order status to processing
      await db
        .update(bccPurchaseOrders)
        .set({
          status: 'processing',
          transactionHash,
          actualAmountReceived: actualAmountReceived || purchaseOrder.amountUSDC,
          updatedAt: new Date()
        })
        .where(eq(bccPurchaseOrders.orderId, orderId));

      // Credit BCC tokens to user's balance
      const bccAmountToCredit = (actualAmountReceived || purchaseOrder.amountUSDC) * BCC_EXCHANGE_RATE;

      // Check if user balance record exists
      const [existingBalance] = await db
        .select()
        .from(userBalances)
        .where(eq(userBalances.walletAddress, walletAddress))
        .limit(1);

      if (existingBalance) {
        // Update existing balance
        await db
          .update(userBalances)
          .set({
            bccTransferable: sql`${userBalances.bccTransferable} + ${bccAmountToCredit}`,
            updatedAt: new Date()
          })
          .where(eq(userBalances.walletAddress, walletAddress));
      } else {
        // Create new balance record
        await db.insert(userBalances).values({
          walletAddress,
          bccTransferable: bccAmountToCredit,
          bccLocked: 0,
          totalUsdtEarned: 0,
          pendingUpgradeRewards: 0,
          rewardsClaimed: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }

      // Mark order as completed
      await db
        .update(bccPurchaseOrders)
        .set({
          status: 'completed',
          completedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(bccPurchaseOrders.orderId, orderId));

      res.json({
        success: true,
        message: `Successfully credited ${bccAmountToCredit} BCC tokens to your account`,
        orderId,
        amountCredited: bccAmountToCredit,
        transactionHash,
        status: 'completed'
      });
    } catch (error) {
      console.error('❌ Error confirming BCC purchase payment:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to confirm payment' 
      });
    }
  });

  // Get BCC purchase history
  app.get("/api/bcc/purchase-history", requireWallet, async (req: any, res: any) => {
    try {
      const walletAddress = req.walletAddress;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;

      const purchases = await db
        .select()
        .from(bccPurchaseOrders)
        .where(eq(bccPurchaseOrders.buyerWallet, walletAddress))
        .orderBy(sql`${bccPurchaseOrders.createdAt} DESC`)
        .limit(limit)
        .offset(offset);

      res.json({
        success: true,
        purchases,
        pagination: {
          limit,
          offset,
          total: purchases.length
        }
      });
    } catch (error) {
      console.error('❌ Error fetching BCC purchase history:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch purchase history' 
      });
    }
  });

  // Get pending BCC purchases
  app.get("/api/bcc/pending-purchases", requireWallet, async (req: any, res: any) => {
    try {
      const walletAddress = req.walletAddress;

      const pendingPurchases = await db
        .select()
        .from(bccPurchaseOrders)
        .where(
          sql`${bccPurchaseOrders.buyerWallet} = ${walletAddress} 
              AND ${bccPurchaseOrders.status} IN ('pending', 'processing')
              AND ${bccPurchaseOrders.expiresAt} > NOW()`
        )
        .orderBy(sql`${bccPurchaseOrders.createdAt} DESC`);

      res.json({
        success: true,
        pendingPurchases,
        count: pendingPurchases.length
      });
    } catch (error) {
      console.error('❌ Error fetching pending BCC purchases:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch pending purchases' 
      });
    }
  });

  console.log('✅ BCC Purchase routes registered');
}