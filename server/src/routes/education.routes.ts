import type { Express } from "express";
import { usersService } from '../services';

export function registerEducationRoutes(app: Express, requireWallet: any) {
  
  // Get all courses
  app.get("/api/education/courses", async (req, res) => {
    try {
      // Mock course data - in real implementation would fetch from database
      const courses = [
        {
          id: 'web3-basics',
          title: 'Web3 Fundamentals',
          description: 'Learn the basics of blockchain and Web3',
          level: 1,
          duration: '2 hours',
          lessons: 8,
          reward: 100,
          available: true
        },
        {
          id: 'defi-intro',
          title: 'Introduction to DeFi',
          description: 'Understanding decentralized finance',
          level: 2,
          duration: '3 hours',
          lessons: 12,
          reward: 200,
          available: true
        }
      ];
      
      res.json(courses);
    } catch (error) {
      console.error('Get courses error:', error);
      res.status(500).json({ error: 'Failed to get courses' });
    }
  });

  // Get specific course details
  app.get("/api/education/courses/:courseId", async (req, res) => {
    try {
      const { courseId } = req.params;
      
      // Mock course detail
      const courseDetail = {
        id: courseId,
        title: 'Web3 Fundamentals',
        description: 'Comprehensive introduction to Web3 technologies',
        level: 1,
        duration: '2 hours',
        lessons: 8,
        reward: 100,
        content: 'Detailed course content would be here...',
        prerequisites: [],
        outcomes: [
          'Understand blockchain fundamentals',
          'Learn about smart contracts',
          'Explore DeFi concepts'
        ]
      };
      
      res.json(courseDetail);
    } catch (error) {
      console.error('Get course detail error:', error);
      res.status(500).json({ error: 'Failed to get course details' });
    }
  });

  // Get course lessons
  app.get("/api/education/courses/:courseId/lessons", async (req, res) => {
    try {
      const { courseId } = req.params;
      
      // Mock lessons data
      const lessons = [
        {
          id: 1,
          title: 'What is Blockchain?',
          duration: '15 minutes',
          type: 'video',
          completed: false
        },
        {
          id: 2,
          title: 'Understanding Wallets',
          duration: '20 minutes', 
          type: 'interactive',
          completed: false
        }
      ];
      
      res.json({
        courseId,
        lessons,
        totalLessons: lessons.length
      });
    } catch (error) {
      console.error('Get course lessons error:', error);
      res.status(500).json({ error: 'Failed to get course lessons' });
    }
  });

  // Check course access
  app.get("/api/education/access/:courseId", requireWallet, async (req: any, res) => {
    try {
      const { courseId } = req.params;
      
      const userProfile = await usersService.getUserProfile(req.walletAddress);
      if (!userProfile) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Check if user has required level for course
      const courseLevel = 1; // Would be fetched from course data
      const hasAccess = userProfile.isActivated && userProfile.membershipLevel >= courseLevel;
      
      res.json({
        courseId,
        hasAccess,
        userLevel: userProfile.membershipLevel,
        requiredLevel: courseLevel,
        isActivated: userProfile.isActivated
      });
    } catch (error) {
      console.error('Check course access error:', error);
      res.status(500).json({ error: 'Failed to check course access' });
    }
  });

  // Check lesson access
  app.get("/api/education/lessons/access/:courseId", requireWallet, async (req: any, res) => {
    try {
      const { courseId } = req.params;
      
      const userProfile = await usersService.getUserProfile(req.walletAddress);
      if (!userProfile) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({
        courseId,
        hasAccess: userProfile.isActivated,
        walletAddress: req.walletAddress
      });
    } catch (error) {
      console.error('Check lesson access error:', error);
      res.status(500).json({ error: 'Failed to check lesson access' });
    }
  });

  // Get user progress
  app.get("/api/education/progress", requireWallet, async (req: any, res) => {
    try {
      // Mock progress data
      const progress = {
        totalCourses: 2,
        completedCourses: 0,
        inProgressCourses: 1,
        totalRewardsEarned: 0,
        courses: [
          {
            id: 'web3-basics',
            title: 'Web3 Fundamentals',
            progress: 25,
            completed: false,
            lessonsCompleted: 2,
            totalLessons: 8
          }
        ]
      };
      
      res.json(progress);
    } catch (error) {
      console.error('Get education progress error:', error);
      res.status(500).json({ error: 'Failed to get education progress' });
    }
  });

  // Enroll in course
  app.post("/api/education/enroll", requireWallet, async (req: any, res) => {
    try {
      const { courseId } = req.body;
      
      if (!courseId) {
        return res.status(400).json({ error: 'Course ID is required' });
      }

      const userProfile = await usersService.getUserProfile(req.walletAddress);
      if (!userProfile) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (!userProfile.isActivated) {
        return res.status(403).json({ error: 'User must be activated to enroll in courses' });
      }

      // Mock enrollment
      console.log(`User ${req.walletAddress} enrolled in course ${courseId}`);
      
      res.json({
        success: true,
        message: 'Successfully enrolled in course',
        courseId,
        enrolledAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Course enrollment error:', error);
      res.status(500).json({ 
        error: 'Failed to enroll in course',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Claim course completion reward
  app.post("/api/education/claim", requireWallet, async (req: any, res) => {
    try {
      const { courseId } = req.body;
      
      if (!courseId) {
        return res.status(400).json({ error: 'Course ID is required' });
      }

      const userProfile = await usersService.getUserProfile(req.walletAddress);
      if (!userProfile) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Mock course completion reward
      const reward = {
        courseId,
        amount: 100,
        tokenType: 'BCC',
        claimedAt: new Date().toISOString(),
        txHash: `0x${Math.random().toString(16).substr(2, 64)}`
      };

      res.json({
        success: true,
        message: 'Course completion reward claimed',
        reward
      });
    } catch (error) {
      console.error('Claim course reward error:', error);
      res.status(500).json({ 
        error: 'Failed to claim course reward',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}