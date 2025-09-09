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
      throw error; // 抛出真实错误，不使用mock数据
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
      throw error; // 抛出真实错误，不使用mock数据
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