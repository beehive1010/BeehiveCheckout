import { Express } from 'express';
import { configService } from '../services/config.service';

/**
 * Configuration Routes - Level configuration and system settings
 */
export function registerConfigRoutes(app: Express) {
  
  // Get all level configurations
  app.get("/api/config/levels", async (req: any, res) => {
    try {
      console.log('📋 Fetching all level configurations');
      
      const levelConfigs = await configService.getAllLevelConfigs();
      
      console.log(`✅ Retrieved ${levelConfigs.length} level configurations`);
      res.json(levelConfigs);
    } catch (error) {
      console.error('Level config fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch level configurations' });
    }
  });

  // Get specific level configuration
  app.get("/api/config/levels/:level", async (req: any, res) => {
    try {
      const level = parseInt(req.params.level);
      
      if (isNaN(level) || level < 1 || level > 19) {
        return res.status(400).json({ error: 'Invalid level. Must be between 1 and 19.' });
      }
      
      console.log(`📋 Fetching level ${level} configuration`);
      
      const levelConfig = await configService.getLevelConfig(level);
      
      if (!levelConfig) {
        return res.status(404).json({ error: `Level ${level} configuration not found` });
      }
      
      console.log(`✅ Retrieved level ${level} configuration`);
      res.json(levelConfig);
    } catch (error) {
      console.error('Level config fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch level configuration' });
    }
  });

  // Get discover partners (already implemented in configService)
  app.get("/api/discover/partners", async (req: any, res) => {
    try {
      console.log('🔍 Fetching discover partners');
      
      const partners = await configService.getDiscoverPartners();
      
      console.log(`✅ Retrieved ${partners.length} discover partners`);
      res.json(partners);
    } catch (error) {
      console.error('Discover partners fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch discover partners' });
    }
  });
}