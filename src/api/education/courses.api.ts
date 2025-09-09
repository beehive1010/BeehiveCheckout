// Education API functions - Updated for Supabase Edge Functions
import { callEdgeFunction } from '../../lib/supabaseClient';

export const coursesApi = {
  async getCourses() {
    try {
      // 使用 fetch 直接调用 courses edge function
      const response = await fetch('https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1/courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ action: 'get-courses' }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('获取课程列表失败:', error);
      // 返回示例数据作为后备
      return [
        {
          id: 'sample-1',
          title: 'Blockchain 101: What is Blockchain?',
          description: 'Learn the fundamental concepts of blockchain technology, how it works, and why it matters in today\'s digital economy.',
          requiredLevel: 1,
          priceBCC: 0,
          isFree: true,
          duration: '2 hours',
          courseType: 'video',
          videoUrl: 'https://example.com/blockchain-101',
          category: 'Blockchain Basics',
          categoryIcon: 'Blocks'
        },
        {
          id: 'sample-2',
          title: 'Cryptocurrency Trading Fundamentals',
          description: 'Learn the basics of cryptocurrency trading, including order types, reading charts, and managing risk.',
          requiredLevel: 1,
          priceBCC: 150,
          isFree: false,
          duration: '4 hours',
          courseType: 'video',
          videoUrl: 'https://example.com/trading-fundamentals',
          category: 'Trading Strategies',
          categoryIcon: 'TrendingUp'
        },
        {
          id: 'sample-3',
          title: 'Understanding DeFi: Decentralized Finance Explained',
          description: 'Comprehensive introduction to DeFi protocols, liquidity mining, yield farming, and decentralized exchanges.',
          requiredLevel: 2,
          priceBCC: 200,
          isFree: false,
          duration: '5 hours',
          courseType: 'video',
          videoUrl: 'https://example.com/defi-explained',
          category: 'DeFi & Web3',
          categoryIcon: 'Globe'
        },
        {
          id: 'sample-4',
          title: 'Advanced Trading Strategies & Technical Analysis',
          description: 'Master advanced trading techniques, technical indicators, and risk management strategies for professional traders.',
          requiredLevel: 3,
          priceBCC: 500,
          isFree: false,
          duration: '8 weeks',
          courseType: 'online',
          zoomMeetingId: '123-456-789',
          zoomPassword: 'TradePro2024',
          category: 'Trading Strategies',
          categoryIcon: 'TrendingUp'
        },
        {
          id: 'sample-5',
          title: 'Smart Contract Development with Solidity',
          description: 'Hands-on course for developing smart contracts on Ethereum. Learn Solidity programming and deploy your first DApp.',
          requiredLevel: 5,
          priceBCC: 800,
          isFree: false,
          duration: '12 weeks',
          courseType: 'online',
          zoomMeetingId: '987-654-321',
          zoomPassword: 'DevMaster2024',
          category: 'Technology',
          categoryIcon: 'Code'
        }
      ];
    }
  },

  async getCourseAccess(walletAddress: string) {
    try {
      const response = await fetch(`https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1/courses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'x-wallet-address': walletAddress,
        },
        body: JSON.stringify({ action: 'get-course-access' }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('获取课程访问权限失败:', error);
      // 返回空数组作为后备
      return [];
    }
  },

  async purchaseCourse(courseId: string, bccAmount: number, walletAddress?: string) {
    try {
      if (!walletAddress) {
        throw new Error('需要钱包地址');
      }
      
      const response = await fetch('https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1/courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'x-wallet-address': walletAddress,
        },
        body: JSON.stringify({ action: 'purchase-course', courseId, bccAmount }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Purchase failed');
      }
      
      return result;
    } catch (error) {
      console.error('购买课程失败:', error);
      throw error;
    }
  },

  async updateProgress(courseId: string, progress: number, walletAddress?: string) {
    try {
      if (!walletAddress) {
        throw new Error('需要钱包地址');
      }
      
      const response = await fetch('https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1/courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'x-wallet-address': walletAddress,
        },
        body: JSON.stringify({ action: 'update-progress', courseId, progress }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Progress update failed');
      }
      
      return result;
    } catch (error) {
      console.error('更新进度失败:', error);
      throw error;
    }
  }
};