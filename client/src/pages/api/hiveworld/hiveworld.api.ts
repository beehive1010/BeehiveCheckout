import { httpClient } from '../../../lib/http';

export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  imageUrl: string;
  category: string;
  tags: string[];
  publishedAt: string;
  readTime: number;
  views: number;
}

export interface BlogCategory {
  id: string;
  name: string;
  description: string;
  postCount: number;
}

export const hiveworldApi = {
  async getPosts(page: number = 1, category?: string): Promise<{ posts: BlogPost[]; totalPages: number }> {
    const params = new URLSearchParams({ page: page.toString() });
    if (category) params.append('category', category);
    return httpClient.get<{ posts: BlogPost[]; totalPages: number }>(`/hiveworld/posts?${params}`);
  },

  async getPost(postId: string): Promise<BlogPost> {
    return httpClient.get<BlogPost>(`/hiveworld/posts/${postId}`);
  },

  async getCategories(): Promise<BlogCategory[]> {
    return httpClient.get<BlogCategory[]>('/hiveworld/categories');
  },

  async incrementViews(postId: string): Promise<void> {
    return httpClient.post(`/hiveworld/posts/${postId}/views`, {});
  }
};