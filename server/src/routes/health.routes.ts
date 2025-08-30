import { Router } from 'express';

const router = Router();

// Health check for entire API
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'beehive-api',
    version: '1.0.0'
  });
});

// Health checks for specific route groups
router.get('/health/users', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'users',
    timestamp: new Date().toISOString()
  });
});

router.get('/health/referrals', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'referrals',
    timestamp: new Date().toISOString()
  });
});

router.get('/health/rewards', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'rewards',
    timestamp: new Date().toISOString()
  });
});

router.get('/health/education', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'education',
    timestamp: new Date().toISOString()
  });
});

router.get('/health/nfts', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'nfts',
    timestamp: new Date().toISOString()
  });
});

export default router;