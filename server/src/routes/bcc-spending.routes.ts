import type { Express } from "express";
import { db } from "../lib/db";
import { members, userBalances, merchantNFTs, nftPurchases, advertisementNFTs, courses, courseActivations, bccPurchaseOrders } from "../../../shared/schema";
import { eq, sql, and } from "drizzle-orm";

interface BccSpendingRequest {
  itemType: 'merchant_nft' | 'advertisement_nft' | 'course' | 'service_nft';
  itemId: string;
  amountBCC: number;
  metadata?: Record<string, any>;
}

interface BccSpendingResponse {
  success: boolean;
  transactionId: string;
  itemType: string;
  itemId: string;
  amountSpent: number;
  remainingBalance: number;
  purchaseDetails: any;
  message: string;
}

export function registerBccSpendingRoutes(app: Express, requireWallet: any) {

  // Get user's BCC balance for spending
  app.get("/api/bcc/spending-balance", requireWallet, async (req: any, res: any) => {
    try {
      const walletAddress = req.walletAddress;

      const [balance] = await db
        .select({
          bccTransferable: userBalances.bccTransferable,
          bccLocked: userBalances.bccLocked
        })
        .from(userBalances)
        .where(eq(userBalances.walletAddress, walletAddress))
        .limit(1);

      if (!balance) {
        return res.json({
          success: true,
          balance: {
            bccTransferable: 0,
            bccLocked: 0,
            totalSpendable: 0
          }
        });
      }

      const totalSpendable = parseFloat(balance.bccTransferable.toString());

      res.json({
        success: true,
        balance: {
          bccTransferable: totalSpendable,
          bccLocked: parseFloat(balance.bccLocked.toString()),
          totalSpendable
        }
      });
    } catch (error) {
      console.error('❌ Error fetching BCC spending balance:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch spending balance' 
      });
    }
  });

  // Get available items for BCC purchase
  app.get("/api/bcc/available-items", requireWallet, async (req: any, res: any) => {
    try {
      const walletAddress = req.walletAddress;
      const itemType = req.query.type as string;

      let availableItems: any[] = [];

      switch (itemType) {
        case 'merchant_nft':
          availableItems = await db
            .select({
              id: merchantNFTs.id,
              title: merchantNFTs.title,
              description: merchantNFTs.description,
              priceUSDT: merchantNFTs.priceUSDT,
              priceBCC: sql<number>`${merchantNFTs.priceUSDT} * 1`.as('price_bcc'), // 1:1 USDT to BCC
              imageUrl: merchantNFTs.imageUrl,
              category: merchantNFTs.category,
              isActive: merchantNFTs.isActive,
              itemType: sql<string>`'merchant_nft'`.as('item_type')
            })
            .from(merchantNFTs)
            .where(eq(merchantNFTs.isActive, true));
          break;

        case 'advertisement_nft':
          availableItems = await db
            .select({
              id: advertisementNFTs.id,
              title: advertisementNFTs.title,
              description: advertisementNFTs.description,
              priceUSDT: advertisementNFTs.priceUSDT,
              priceBCC: sql<number>`${advertisementNFTs.priceUSDT} * 1`.as('price_bcc'),
              imageUrl: advertisementNFTs.imageUrl,
              category: advertisementNFTs.category,
              isActive: advertisementNFTs.isActive,
              itemType: sql<string>`'advertisement_nft'`.as('item_type')
            })
            .from(advertisementNFTs)
            .where(eq(advertisementNFTs.isActive, true));
          break;

        case 'course':
          availableItems = await db
            .select({
              id: courses.id,
              title: courses.title,
              description: courses.description,
              priceUSDT: courses.priceUSDT,
              priceBCC: sql<number>`${courses.priceUSDT} * 1`.as('price_bcc'),
              imageUrl: courses.imageUrl,
              category: courses.category,
              isActive: courses.isActive,
              itemType: sql<string>`'course'`.as('item_type')
            })
            .from(courses)
            .where(eq(courses.isActive, true));
          break;

        default:
          // Get all items if no specific type requested
          const [merchantItems, adItems, courseItems] = await Promise.all([
            db.select({
              id: merchantNFTs.id,
              title: merchantNFTs.title,
              description: merchantNFTs.description,
              priceUSDT: merchantNFTs.priceUSDT,
              priceBCC: sql<number>`${merchantNFTs.priceUSDT} * 1`.as('price_bcc'),
              imageUrl: merchantNFTs.imageUrl,
              category: merchantNFTs.category,
              isActive: merchantNFTs.isActive,
              itemType: sql<string>`'merchant_nft'`.as('item_type')
            }).from(merchantNFTs).where(eq(merchantNFTs.isActive, true)),

            db.select({
              id: advertisementNFTs.id,
              title: advertisementNFTs.title,
              description: advertisementNFTs.description,
              priceUSDT: advertisementNFTs.priceUSDT,
              priceBCC: sql<number>`${advertisementNFTs.priceUSDT} * 1`.as('price_bcc'),
              imageUrl: advertisementNFTs.imageUrl,
              category: advertisementNFTs.category,
              isActive: advertisementNFTs.isActive,
              itemType: sql<string>`'advertisement_nft'`.as('item_type')
            }).from(advertisementNFTs).where(eq(advertisementNFTs.isActive, true)),

            db.select({
              id: courses.id,
              title: courses.title,
              description: courses.description,
              priceUSDT: courses.priceUSDT,
              priceBCC: sql<number>`${courses.priceUSDT} * 1`.as('price_bcc'),
              imageUrl: courses.imageUrl,
              category: courses.category,
              isActive: courses.isActive,
              itemType: sql<string>`'course'`.as('item_type')
            }).from(courses).where(eq(courses.isActive, true))
          ]);

          availableItems = [...merchantItems, ...adItems, ...courseItems];
      }

      res.json({
        success: true,
        items: availableItems,
        count: availableItems.length
      });
    } catch (error) {
      console.error('❌ Error fetching available items for BCC purchase:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch available items' 
      });
    }
  });

  // Purchase item with BCC tokens
  app.post("/api/bcc/purchase-item", requireWallet, async (req: any, res: any) => {
    try {
      const walletAddress = req.walletAddress;
      const spendingData: BccSpendingRequest = req.body;

      // Validate spending data
      if (!spendingData.itemType || !spendingData.itemId || !spendingData.amountBCC) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: itemType, itemId, or amountBCC'
        });
      }

      if (spendingData.amountBCC <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Amount must be greater than 0'
        });
      }

      // Check user's BCC balance
      const [userBalance] = await db
        .select()
        .from(userBalances)
        .where(eq(userBalances.walletAddress, walletAddress))
        .limit(1);

      if (!userBalance) {
        return res.status(400).json({
          success: false,
          error: 'No BCC balance found'
        });
      }

      const availableBalance = parseFloat(userBalance.bccTransferable.toString());
      
      if (availableBalance < spendingData.amountBCC) {
        return res.status(400).json({
          success: false,
          error: `Insufficient BCC balance. Available: ${availableBalance}, Required: ${spendingData.amountBCC}`
        });
      }

      // Verify item exists and get details
      let itemDetails: any = null;
      let purchaseRecord: any = {};

      switch (spendingData.itemType) {
        case 'merchant_nft':
          const [merchantNft] = await db
            .select()
            .from(merchantNFTs)
            .where(and(
              eq(merchantNFTs.id, spendingData.itemId),
              eq(merchantNFTs.isActive, true)
            ))
            .limit(1);

          if (!merchantNft) {
            return res.status(404).json({
              success: false,
              error: 'Merchant NFT not found or inactive'
            });
          }

          itemDetails = merchantNft;
          break;

        case 'advertisement_nft':
          const [adNft] = await db
            .select()
            .from(advertisementNFTs)
            .where(and(
              eq(advertisementNFTs.id, spendingData.itemId),
              eq(advertisementNFTs.isActive, true)
            ))
            .limit(1);

          if (!adNft) {
            return res.status(404).json({
              success: false,
              error: 'Advertisement NFT not found or inactive'
            });
          }

          itemDetails = adNft;
          break;

        case 'course':
          const [course] = await db
            .select()
            .from(courses)
            .where(and(
              eq(courses.id, spendingData.itemId),
              eq(courses.isActive, true)
            ))
            .limit(1);

          if (!course) {
            return res.status(404).json({
              success: false,
              error: 'Course not found or inactive'
            });
          }

          itemDetails = course;
          break;

        default:
          return res.status(400).json({
            success: false,
            error: 'Invalid item type'
          });
      }

      // Verify the price matches
      const expectedPrice = parseFloat(itemDetails.priceUSDT.toString());
      if (Math.abs(spendingData.amountBCC - expectedPrice) > 0.01) {
        return res.status(400).json({
          success: false,
          error: `Price mismatch. Expected: ${expectedPrice} BCC, Provided: ${spendingData.amountBCC} BCC`
        });
      }

      // Start transaction
      const transactionId = `bcc_spend_${walletAddress}_${Date.now()}`;

      // Deduct BCC from user's balance
      await db
        .update(userBalances)
        .set({
          bccTransferable: sql`${userBalances.bccTransferable} - ${spendingData.amountBCC}`,
          updatedAt: new Date()
        })
        .where(eq(userBalances.walletAddress, walletAddress));

      // Create purchase record
      if (spendingData.itemType === 'merchant_nft' || spendingData.itemType === 'advertisement_nft') {
        await db.insert(nftPurchases).values({
          id: transactionId,
          buyerWallet: walletAddress,
          nftId: spendingData.itemId,
          priceUSDT: spendingData.amountBCC,
          paymentMethod: 'bcc_tokens',
          transactionHash: `bcc_${transactionId}`,
          status: 'completed',
          purchasedAt: new Date(),
          metadata: {
            ...spendingData.metadata,
            paymentType: 'bcc_spending',
            originalPrice: expectedPrice,
            itemType: spendingData.itemType
          }
        });

        purchaseRecord = {
          purchaseId: transactionId,
          nftId: spendingData.itemId,
          itemType: spendingData.itemType
        };
      } else if (spendingData.itemType === 'course') {
        await db.insert(courseActivations).values({
          walletAddress,
          courseId: spendingData.itemId,
          activationType: 'bcc_purchase',
          activatedAt: new Date(),
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year access
          metadata: {
            ...spendingData.metadata,
            transactionId,
            paymentType: 'bcc_spending',
            amountPaid: spendingData.amountBCC
          }
        });

        purchaseRecord = {
          activationId: transactionId,
          courseId: spendingData.itemId,
          itemType: spendingData.itemType,
          accessDuration: '1 year'
        };
      }

      // Get updated balance
      const [updatedBalance] = await db
        .select()
        .from(userBalances)
        .where(eq(userBalances.walletAddress, walletAddress))
        .limit(1);

      const response: BccSpendingResponse = {
        success: true,
        transactionId,
        itemType: spendingData.itemType,
        itemId: spendingData.itemId,
        amountSpent: spendingData.amountBCC,
        remainingBalance: parseFloat(updatedBalance!.bccTransferable.toString()),
        purchaseDetails: {
          ...purchaseRecord,
          itemDetails: {
            title: itemDetails.title,
            description: itemDetails.description,
            category: itemDetails.category
          }
        },
        message: `Successfully purchased ${itemDetails.title} for ${spendingData.amountBCC} BCC tokens`
      };

      res.json(response);
    } catch (error) {
      console.error('❌ Error processing BCC item purchase:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to process purchase' 
      });
    }
  });

  // Get BCC spending history
  app.get("/api/bcc/spending-history", requireWallet, async (req: any, res: any) => {
    try {
      const walletAddress = req.walletAddress;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;

      // Get NFT purchases paid with BCC
      const nftPurchasesHistory = await db
        .select({
          id: nftPurchases.id,
          itemId: nftPurchases.nftId,
          itemType: sql<string>`'nft'`.as('item_type'),
          amount: nftPurchases.priceUSDT,
          purchasedAt: nftPurchases.purchasedAt,
          status: nftPurchases.status,
          metadata: nftPurchases.metadata
        })
        .from(nftPurchases)
        .where(and(
          eq(nftPurchases.buyerWallet, walletAddress),
          eq(nftPurchases.paymentMethod, 'bcc_tokens')
        ))
        .orderBy(sql`${nftPurchases.purchasedAt} DESC`)
        .limit(limit)
        .offset(offset);

      // Get course purchases paid with BCC
      const coursePurchasesHistory = await db
        .select({
          id: sql<string>`CONCAT('course_', ${courseActivations.courseId})`.as('id'),
          itemId: courseActivations.courseId,
          itemType: sql<string>`'course'`.as('item_type'),
          amount: sql<number>`CAST(${courseActivations.metadata}->>'amountPaid' AS DECIMAL)`.as('amount'),
          purchasedAt: courseActivations.activatedAt,
          status: sql<string>`'completed'`.as('status'),
          metadata: courseActivations.metadata
        })
        .from(courseActivations)
        .where(and(
          eq(courseActivations.walletAddress, walletAddress),
          eq(courseActivations.activationType, 'bcc_purchase')
        ))
        .orderBy(sql`${courseActivations.activatedAt} DESC`)
        .limit(limit)
        .offset(offset);

      const allPurchases = [...nftPurchasesHistory, ...coursePurchasesHistory]
        .sort((a, b) => new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime())
        .slice(offset, offset + limit);

      res.json({
        success: true,
        purchases: allPurchases,
        pagination: {
          limit,
          offset,
          total: allPurchases.length
        }
      });
    } catch (error) {
      console.error('❌ Error fetching BCC spending history:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch spending history' 
      });
    }
  });

  console.log('✅ BCC Spending routes registered');
}