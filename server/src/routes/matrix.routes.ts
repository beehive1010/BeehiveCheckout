import { Express } from 'express';
import { storage } from '../services/storage.service';

/**
 * Matrix Routes - Individual matrix tree management
 */
export function registerMatrixRoutes(app: Express) {
  const requireWallet = (req: any, res: any, next: any) => {
    const walletAddress = req.headers['x-wallet-address'];
    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address required' });
    }
    req.walletAddress = walletAddress;
    next();
  };

  // 获取用户矩阵层级详情
  app.get("/api/matrix/layers", requireWallet, async (req: any, res) => {
    try {
      const { walletAddress } = req;
      
      const referrals = await storage.getReferrals(walletAddress);
      const member = await storage.getMember(walletAddress);
      
      const layers = Array.from({ length: 19 }, (_, i) => {
        const layer = i + 1;
        const layerReferrals = referrals.filter(r => r.layer === layer);
        
        return {
          layer,
          totalPositions: Math.pow(3, layer),
          filledPositions: layerReferrals.length,
          availablePositions: Math.pow(3, layer) - layerReferrals.length,
          leftCount: layerReferrals.filter(r => r.position === 'L').length,
          middleCount: layerReferrals.filter(r => r.position === 'M').length,
          rightCount: layerReferrals.filter(r => r.position === 'R').length,
          fillPercentage: (layerReferrals.length / Math.pow(3, layer)) * 100,
          members: layerReferrals.map(r => ({
            walletAddress: r.memberWallet,
            position: r.position,
            placedAt: r.placedAt,
            placementType: r.placementType,
            isActive: r.isActive
          }))
        };
      });
      
      res.json({
        walletAddress,
        currentLevel: member?.currentLevel || 0,
        isActivated: member?.isActivated || false,
        layers,
        totalMembers: referrals.length,
        maxLayer: member?.maxLayer || 0
      });
    } catch (error) {
      console.error('Matrix layers error:', error);
      res.status(500).json({ error: 'Failed to fetch matrix layers' });
    }
  });

  // 获取可用安置位置
  app.get("/api/matrix/available-positions", requireWallet, async (req: any, res) => {
    try {
      const { walletAddress } = req;
      
      const availablePosition = await storage.findAvailablePosition(walletAddress);
      
      if (!availablePosition) {
        return res.json({
          available: false,
          message: 'No available positions in your matrix tree'
        });
      }
      
      res.json({
        available: true,
        nextPosition: availablePosition,
        layer: availablePosition.layer,
        position: availablePosition.position,
        parentWallet: availablePosition.parentWallet
      });
    } catch (error) {
      console.error('Available positions error:', error);
      res.status(500).json({ error: 'Failed to fetch available positions' });
    }
  });

  // 获取最优安置建议
  app.get("/api/matrix/optimal-placements", requireWallet, async (req: any, res) => {
    try {
      const { walletAddress } = req;
      
      const referrals = await storage.getReferrals(walletAddress);
      const member = await storage.getMember(walletAddress);
      
      // Find the first available layer
      let optimalLayer = 1;
      for (let layer = 1; layer <= 19; layer++) {
        const layerReferrals = referrals.filter(r => r.layer === layer);
        if (layerReferrals.length < Math.pow(3, layer)) {
          optimalLayer = layer;
          break;
        }
      }
      
      // Find available positions in optimal layer
      const layerReferrals = referrals.filter(r => r.layer === optimalLayer);
      const positions = ['L', 'M', 'R'];
      const availablePositions = positions.filter(pos => 
        !layerReferrals.some(r => r.position === pos)
      );
      
      res.json({
        optimalLayer,
        availablePositions,
        recommendedPosition: availablePositions[0] || null,
        capacity: Math.pow(3, optimalLayer),
        filled: layerReferrals.length,
        priority: optimalLayer <= 3 ? 'high' : optimalLayer <= 7 ? 'medium' : 'low'
      });
    } catch (error) {
      console.error('Optimal placements error:', error);
      res.status(500).json({ error: 'Failed to fetch optimal placements' });
    }
  });

  // 安置新成员
  app.post("/api/matrix/place-member", requireWallet, async (req: any, res) => {
    try {
      const { walletAddress } = req;
      const { memberWallet, targetRootWallet, layer, position, placementType } = req.body;
      
      // Validate placement
      if (!memberWallet || !layer || !position) {
        return res.status(400).json({ error: 'Missing required placement data' });
      }
      
      if (!['L', 'M', 'R'].includes(position)) {
        return res.status(400).json({ error: 'Invalid position' });
      }
      
      if (layer < 1 || layer > 19) {
        return res.status(400).json({ error: 'Invalid layer' });
      }
      
      // Check if placer is authorized
      const member = await storage.getMember(walletAddress);
      if (!member?.isActivated) {
        return res.status(403).json({ error: 'Only activated members can place referrals' });
      }
      
      // Create the referral placement
      const newReferral = await storage.createReferral({
        rootWallet: targetRootWallet || walletAddress,
        memberWallet,
        layer,
        position,
        parentWallet: layer === 1 ? walletAddress : undefined, // TODO: Calculate proper parent
        placerWallet: walletAddress,
        placementType: placementType || 'direct',
        isActive: true
      });
      
      res.json({
        success: true,
        placement: newReferral,
        message: `Member placed at Layer ${layer}, Position ${position}`
      });
    } catch (error) {
      console.error('Place member error:', error);
      res.status(500).json({ error: 'Failed to place member' });
    }
  });
}