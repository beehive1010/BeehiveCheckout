import { 
  blogPosts,
  type BlogPost,
  type InsertBlogPost
} from "@shared/schema";
import { db } from "../../db";
import { eq, desc, and, like, or } from "drizzle-orm";

export class BlogService {
  
  // Get all published blog posts
  async getBlogPosts(language: string = 'en'): Promise<BlogPost[]> {
    return await db
      .select()
      .from(blogPosts)
      .where(and(
        eq(blogPosts.published, true),
        eq(blogPosts.language, language)
      ))
      .orderBy(desc(blogPosts.publishedAt));
  }

  // Get specific blog post by ID
  async getBlogPost(id: string): Promise<BlogPost | null> {
    const [post] = await db
      .select()
      .from(blogPosts)
      .where(and(
        eq(blogPosts.id, id),
        eq(blogPosts.published, true)
      ))
      .limit(1);
    
    // Increment view count
    if (post) {
      await db
        .update(blogPosts)
        .set({ views: post.views + 1 })
        .where(eq(blogPosts.id, id));
      
      return { ...post, views: post.views + 1 };
    }
    
    return null;
  }

  // Search blog posts
  async searchBlogPosts(query: string, language: string = 'en'): Promise<BlogPost[]> {
    return await db
      .select()
      .from(blogPosts)
      .where(and(
        eq(blogPosts.published, true),
        eq(blogPosts.language, language),
        or(
          like(blogPosts.title, `%${query}%`),
          like(blogPosts.excerpt, `%${query}%`),
          like(blogPosts.content, `%${query}%`)
        )
      ))
      .orderBy(desc(blogPosts.publishedAt));
  }

  // Create new blog post (admin only)
  async createBlogPost(post: InsertBlogPost): Promise<BlogPost> {
    const [newPost] = await db
      .insert(blogPosts)
      .values(post)
      .returning();
    return newPost;
  }

  // Update blog post (admin only)
  async updateBlogPost(id: string, updates: Partial<InsertBlogPost>): Promise<BlogPost | null> {
    const [updatedPost] = await db
      .update(blogPosts)
      .set({ ...updates, publishedAt: new Date() })
      .where(eq(blogPosts.id, id))
      .returning();
    return updatedPost || null;
  }

  // Delete blog post (admin only)
  async deleteBlogPost(id: string): Promise<boolean> {
    const result = await db
      .delete(blogPosts)
      .where(eq(blogPosts.id, id));
    return result.changes > 0;
  }
}

export const blogService = new BlogService();