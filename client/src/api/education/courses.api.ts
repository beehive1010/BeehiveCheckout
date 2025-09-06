// Education API functions - Updated for Supabase Edge Functions
import { apiRequest } from '../lib/queryClient';

export const coursesApi = {
  async getCourses() {
    const response = await apiRequest('GET', '/api/courses');
    return response.json();
  },

  async getCourseAccess(walletAddress: string) {
    const response = await apiRequest('GET', `/api/course-access/${walletAddress}`, undefined, walletAddress);
    return response.json();
  },

  async purchaseCourse(courseId: string, bccAmount: number, walletAddress?: string) {
    const response = await apiRequest('POST', '/api/purchase-course', { courseId, bccAmount }, walletAddress);
    return response.json();
  },

  async updateProgress(courseId: string, progress: number, walletAddress?: string) {
    const response = await apiRequest('POST', '/api/course-progress', { courseId, progress }, walletAddress);
    return response.json();
  }
};