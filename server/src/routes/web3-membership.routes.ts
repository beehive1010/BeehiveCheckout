import express from 'express';
import { entryGateService } from '../services/entry-gate.service';

const router = express.Router();

/**
 * Web3 Membership System Routes
 * Implementing the complete A) B) C) flow described
 */

// POST /api/web3/check-status
// A) Entry & Status Gate - Check wallet status and routing
router.post('/check-status', async (req, res) => {
  try {
    const { walletAddress, referrerWallet } = req.body;
    
    if (!walletAddress) {
      return res.status(400).json({ message: 'Wallet address required' });
    }

    const status = await entryGateService.onWalletConnect({
      activeWallet: walletAddress,
      referrerWallet
    });

    res.json({
      success: true,
      status,
      routing: {
        routeTo: status.routeTo,
        isAuthenticated: status.isMembershipActivated,
        requiresRegistration: !status.isRegistered,
        requiresActivation: status.isRegistered && !status.isMembershipActivated
      }
    });
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ message: 'Failed to check wallet status' });
  }
});

// POST /api/web3/validate-referrer
// Validate referrer eligibility
router.post('/validate-referrer', async (req, res) => {
  try {
    const { referrerWallet } = req.body;
    
    if (!referrerWallet) {
      return res.status(400).json({ message: 'Referrer wallet required' });
    }

    const validation = await entryGateService.validateReferrer(referrerWallet);
    
    res.json({
      success: true,
      validation
    });
  } catch (error) {
    console.error('Referrer validation error:', error);
    res.status(500).json({ message: 'Failed to validate referrer' });
  }
});

export default router;