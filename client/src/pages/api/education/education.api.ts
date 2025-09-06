import { httpClient } from '../../../lib/http';

export interface Course {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  requiredLevel: number;
  estimatedTime: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  isUnlocked: boolean;
  progress?: number;
}

export interface Lesson {
  id: string;
  courseId: string;
  title: string;
  content: string;
  videoUrl?: string;
  duration: number;
  order: number;
  isCompleted: boolean;
}

export const educationApi = {
  async getCourses(walletAddress: string): Promise<Course[]> {
    return httpClient.get<Course[]>('/education/courses', walletAddress);
  },

  async getCourse(courseId: string, walletAddress: string): Promise<Course> {
    return httpClient.get<Course>(`/education/courses/${courseId}`, walletAddress);
  },

  async getLessons(courseId: string, walletAddress: string): Promise<Lesson[]> {
    return httpClient.get<Lesson[]>(`/education/courses/${courseId}/lessons`, walletAddress);
  },

  async completeLesson(lessonId: string, walletAddress: string): Promise<{ success: boolean; progress: number }> {
    return httpClient.post('/education/lessons/complete', { lessonId }, walletAddress);
  }
};