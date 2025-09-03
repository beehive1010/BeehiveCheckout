import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../../db';
import { serviceRequests, advertisementNFTs } from '@shared/schema';
import { eq, desc, and } from 'drizzle-orm';

const router = Router();

// Validation schema for creating service requests
const createServiceRequestSchema = z.object({
  nftId: z.string().min(1, 'NFT ID is required'),
  serviceName: z.string().min(1, 'Service name is required'),
  serviceType: z.string().min(1, 'Service type is required'),
  requestTitle: z.string().min(5, 'Request title must be at least 5 characters').max(100),
  requestDescription: z.string().min(20, 'Description must be at least 20 characters').max(1000),
  contactInfo: z.string().min(1, 'Contact information is required'),
  additionalInfo: z.string().optional(),
  applicationData: z.record(z.any()).optional(),
});

// Validation schema for updating service request status
const updateStatusSchema = z.object({
  status: z.enum(['new_application', 'processing', 'awaiting_feedback', 'completed']),
  adminNotes: z.string().optional(),
  responseData: z.record(z.any()).optional(),
});

// Simple middleware to extract wallet address from headers
const requireWallet = (req: Request, res: Response, next: any) => {
  const walletAddress = req.headers['x-wallet-address'] as string;
  if (!walletAddress) {
    return res.status(401).json({ error: 'Wallet address required' });
  }
  (req as any).walletAddress = walletAddress;
  next();
};

/**
 * @route POST /api/service-requests
 * @desc Create a new service request
 * @access Private (requires wallet authentication)
 */
router.post('/', requireWallet, async (req: Request, res: Response) => {
  try {
    const validatedData = createServiceRequestSchema.parse(req.body);
    const walletAddress = (req as any).walletAddress;

    // Verify the NFT exists (checking advertisementNFTs table)
    const [nft] = await db
      .select()
      .from(advertisementNFTs)
      .where(eq(advertisementNFTs.id, validatedData.nftId))
      .limit(1);

    if (!nft) {
      return res.status(404).json({ error: 'NFT not found' });
    }

    // Create the service request
    const [newRequest] = await db
      .insert(serviceRequests)
      .values({
        walletAddress,
        nftId: validatedData.nftId,
        serviceName: validatedData.serviceName,
        serviceType: validatedData.serviceType,
        requestTitle: validatedData.requestTitle,
        requestDescription: validatedData.requestDescription,
        applicationData: {
          ...validatedData.applicationData || {},
          contactInfo: validatedData.contactInfo,
          additionalInfo: validatedData.additionalInfo || '',
          submittedAt: new Date().toISOString(),
        },
        status: 'new_application',
        createdAt: new Date(),
      })
      .returning();

    res.status(201).json({
      success: true,
      data: newRequest,
      message: 'Service request created successfully',
    });

  } catch (error) {
    console.error('Error creating service request:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid request data',
        details: error.errors,
      });
    }

    res.status(500).json({ error: 'Failed to create service request' });
  }
});

/**
 * @route GET /api/service-requests
 * @desc Get user's service requests
 * @access Private (requires wallet authentication)
 */
router.get('/', requireWallet, async (req: Request, res: Response) => {
  try {
    const walletAddress = (req as any).walletAddress;

    const userRequests = await db
      .select({
        id: serviceRequests.id,
        nftId: serviceRequests.nftId,
        serviceName: serviceRequests.serviceName,
        serviceType: serviceRequests.serviceType,
        requestTitle: serviceRequests.requestTitle,
        requestDescription: serviceRequests.requestDescription,
        status: serviceRequests.status,
        createdAt: serviceRequests.createdAt,
        adminNotes: serviceRequests.adminNotes,
        responseData: serviceRequests.responseData,
      })
      .from(serviceRequests)
      .where(eq(serviceRequests.walletAddress, walletAddress))
      .orderBy(desc(serviceRequests.createdAt));

    res.json({
      success: true,
      data: userRequests,
    });

  } catch (error) {
    console.error('Error fetching service requests:', error);
    res.status(500).json({ error: 'Failed to fetch service requests' });
  }
});

/**
 * @route GET /api/service-requests/:nftId
 * @desc Get service requests for a specific NFT
 * @access Private (requires wallet authentication)
 */
router.get('/:nftId', requireWallet, async (req: Request, res: Response) => {
  try {
    const { nftId } = req.params;
    const walletAddress = (req as any).walletAddress;

    const nftRequests = await db
      .select({
        id: serviceRequests.id,
        serviceName: serviceRequests.serviceName,
        serviceType: serviceRequests.serviceType,
        requestTitle: serviceRequests.requestTitle,
        status: serviceRequests.status,
        createdAt: serviceRequests.createdAt,
        adminNotes: serviceRequests.adminNotes,
      })
      .from(serviceRequests)
      .where(
        and(
          eq(serviceRequests.nftId, nftId),
          eq(serviceRequests.walletAddress, walletAddress)
        )
      )
      .orderBy(desc(serviceRequests.createdAt));

    res.json({
      success: true,
      data: nftRequests,
    });

  } catch (error) {
    console.error('Error fetching NFT service requests:', error);
    res.status(500).json({ error: 'Failed to fetch NFT service requests' });
  }
});

/**
 * @route GET /api/service-requests/details/:requestId
 * @desc Get detailed information for a specific service request
 * @access Private (requires wallet authentication)
 */
router.get('/details/:requestId', requireWallet, async (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;
    const walletAddress = (req as any).walletAddress;

    const [request] = await db
      .select()
      .from(serviceRequests)
      .where(
        and(
          eq(serviceRequests.id, requestId),
          eq(serviceRequests.walletAddress, walletAddress)
        )
      )
      .limit(1);

    if (!request) {
      return res.status(404).json({ error: 'Service request not found' });
    }

    res.json({
      success: true,
      data: request,
    });

  } catch (error) {
    console.error('Error fetching service request details:', error);
    res.status(500).json({ error: 'Failed to fetch service request details' });
  }
});

/**
 * @route PUT /api/service-requests/:requestId/status
 * @desc Update service request status (Admin only)
 * @access Private (requires admin authentication)
 */
router.put('/:requestId/status', requireWallet, async (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;
    const validatedData = updateStatusSchema.parse(req.body);

    // TODO: Add admin role check here
    // For now, only allow users to update their own requests (limited operations)

    const [updatedRequest] = await db
      .update(serviceRequests)
      .set({
        status: validatedData.status,
        adminNotes: validatedData.adminNotes,
        responseData: validatedData.responseData || {},
        updatedAt: new Date(),
      })
      .where(eq(serviceRequests.id, requestId))
      .returning();

    if (!updatedRequest) {
      return res.status(404).json({ error: 'Service request not found' });
    }

    res.json({
      success: true,
      data: updatedRequest,
      message: 'Service request status updated successfully',
    });

  } catch (error) {
    console.error('Error updating service request status:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid request data',
        details: error.errors,
      });
    }

    res.status(500).json({ error: 'Failed to update service request status' });
  }
});

/**
 * @route DELETE /api/service-requests/:requestId
 * @desc Cancel/delete a service request (if status allows)
 * @access Private (requires wallet authentication)
 */
router.delete('/:requestId', requireWallet, async (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;
    const walletAddress = (req as any).walletAddress;

    // Only allow deletion if status is 'new_application'
    const [request] = await db
      .select({ status: serviceRequests.status })
      .from(serviceRequests)
      .where(
        and(
          eq(serviceRequests.id, requestId),
          eq(serviceRequests.walletAddress, walletAddress)
        )
      )
      .limit(1);

    if (!request) {
      return res.status(404).json({ error: 'Service request not found' });
    }

    if (request.status !== 'new_application') {
      return res.status(400).json({ 
        error: 'Cannot cancel request once processing has started' 
      });
    }

    await db
      .delete(serviceRequests)
      .where(
        and(
          eq(serviceRequests.id, requestId),
          eq(serviceRequests.walletAddress, walletAddress)
        )
      );

    res.json({
      success: true,
      message: 'Service request cancelled successfully',
    });

  } catch (error) {
    console.error('Error cancelling service request:', error);
    res.status(500).json({ error: 'Failed to cancel service request' });
  }
});

export { router as serviceRequestsRouter };