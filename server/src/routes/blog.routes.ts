import { Express } from 'express';
import { blogService } from '../services/blog.service';

/**
 * Blog Routes - HiveWorld blog system
 */
export function registerBlogRoutes(app: Express) {
  
  // Get all blog posts for a specific language
  app.get("/api/blog/posts", async (req: any, res) => {
    try {
      const language = req.query.language || 'en';
      
      console.log(`📚 Fetching blog posts for language: ${language}`);
      
      const posts = await blogService.getBlogPosts(language);
      
      console.log(`✅ Retrieved ${posts.length} blog posts`);
      res.json(posts);
    } catch (error) {
      console.error('Blog posts fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch blog posts' });
    }
  });

  // Get specific blog post by ID
  app.get("/api/blog/posts/:id", async (req: any, res) => {
    try {
      const { id } = req.params;
      
      console.log(`📄 Fetching blog post: ${id}`);
      
      const post = await blogService.getBlogPost(id);
      
      if (!post) {
        return res.status(404).json({ error: 'Blog post not found' });
      }
      
      console.log(`✅ Retrieved blog post: ${post.title}`);
      res.json(post);
    } catch (error) {
      console.error('Blog post fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch blog post' });
    }
  });

  // Search blog posts
  app.get("/api/blog/search", async (req: any, res) => {
    try {
      const { q: query, language = 'en' } = req.query;
      
      if (!query) {
        return res.status(400).json({ error: 'Search query is required' });
      }
      
      console.log(`🔍 Searching blog posts: "${query}" in ${language}`);
      
      const posts = await blogService.searchBlogPosts(query, language);
      
      console.log(`✅ Found ${posts.length} blog posts matching "${query}"`);
      res.json(posts);
    } catch (error) {
      console.error('Blog search error:', error);
      res.status(500).json({ error: 'Failed to search blog posts' });
    }
  });
}