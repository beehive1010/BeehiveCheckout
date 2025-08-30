import { rewardsService } from '../services/rewards.service';

/**
 * Cron service for processing expired pending rewards
 */
export class RewardsCronService {
  
  /**
   * Process expired pending rewards
   * This should be called periodically (e.g., every hour)
   */
  static async processExpiredRewards(): Promise<void> {
    try {
      console.log('🕒 Starting cron: Processing expired pending rewards');
      
      const expiredCount = await rewardsService.expirePendingRewards();
      
      if (expiredCount > 0) {
        console.log(`⏰ Cron completed: Expired ${expiredCount} pending rewards`);
      } else {
        console.log('✅ Cron completed: No expired rewards found');
      }
      
    } catch (error) {
      console.error('❌ Error in rewards cron:', error);
      throw error;
    }
  }

  /**
   * Start the cron job - runs every hour
   */
  static startCronJob(): void {
    console.log('🚀 Starting rewards cron job (runs every hour)');
    
    // Run immediately on startup
    this.processExpiredRewards().catch(console.error);
    
    // Then run every hour
    setInterval(() => {
      this.processExpiredRewards().catch(console.error);
    }, 60 * 60 * 1000); // 1 hour in milliseconds
  }

  /**
   * Manual trigger for testing
   */
  static async manualTrigger(): Promise<{ success: boolean; expiredCount: number; message: string }> {
    try {
      console.log('🔧 Manual trigger: Processing expired rewards');
      
      const expiredCount = await rewardsService.expirePendingRewards();
      
      return {
        success: true,
        expiredCount,
        message: `Successfully processed ${expiredCount} expired rewards`
      };
      
    } catch (error) {
      console.error('❌ Manual trigger error:', error);
      return {
        success: false,
        expiredCount: 0,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}

export default RewardsCronService;