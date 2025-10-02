// Blog API functions for HiveWorld - Enhanced with Multilingual Support
import { multilingualService } from '../../lib/services/multilingualService';

export const blogApi = {
  // 获取Blog文章列表（支持多语言）
  async getBlogPosts(language: string = 'en', options?: {
    published?: boolean;
    author_wallet?: string;
    tags?: string[];
    limit?: number;
    offset?: number;
    category?: string;
  }) {
    try {
      console.log(`📝 Blog API: 获取文章列表 (${language})`);

      // 使用多语言服务获取文章
      const posts = await multilingualService.getBlogPosts(language, {
        published: options?.published !== undefined ? options.published : true,
        author_wallet: options?.author_wallet,
        tags: options?.tags,
        limit: options?.limit || 10,
        offset: options?.offset || 0
      });

      // 转换为前端期望的格式
      const formattedPosts = posts.map(post => ({
        id: post.id,
        title: post.title,
        excerpt: post.excerpt,
        content: post.content,
        author: post.author,
        author_wallet: post.author_wallet,
        imageUrl: post.image_url,
        publishedAt: post.published_at,
        tags: Array.isArray(post.tags) ? post.tags : [],
        views: post.views,
        language: post.language_code,
        slug: post.slug,
        published: post.published,
        metadata: post.metadata || {},
        createdAt: post.created_at
      }));

      console.log(`✅ Blog API: 返回 ${formattedPosts.length} 篇文章`);
      return formattedPosts;
    } catch (error) {
      console.error('Blog API: 获取文章列表失败:', error);
      console.error('Error details:', error);

      // 如果数据库查询失败，返回模拟数据
      console.log('📝 Blog API: 使用模拟数据作为fallback');
      return [
        {
          id: '1',
          title: language === 'zh' ? 'Web3会员系统的未来' : 'The Future of Web3 Membership Systems',
          excerpt: language === 'zh' 
            ? '探索区块链技术如何在各行各业革命性地改变会员制度和忠诚度计划。'
            : 'Exploring how blockchain technology is revolutionizing membership and loyalty programs across industries.',
          content: language === 'zh' ? '完整的博客内容在这里...' : 'Full blog content here...',
          author: language === 'zh' ? 'Beehive团队' : 'Beehive Team',
          imageUrl: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800&h=400&fit=crop',
          publishedAt: '2024-12-20T10:00:00Z',
          tags: language === 'zh' ? ['Web3', '区块链', '会员制'] : ['Web3', 'Blockchain', 'Membership'],
          views: 1250,
          language: language,
          slug: language === 'zh' ? 'web3-membership-future-zh' : 'web3-membership-future',
          published: true
        },
        {
          id: '2',
          title: language === 'zh' ? '理解基于NFT的访问控制' : 'Understanding NFT-Based Access Control',
          excerpt: language === 'zh'
            ? '了解NFT如何被用于内容门禁和创建独家社区体验。'
            : 'How NFTs are being used to gate content and create exclusive community experiences.',
          content: language === 'zh' ? '完整的博客内容在这里...' : 'Full blog content here...',
          author: language === 'zh' ? '技术团队' : 'Technical Team',
          imageUrl: 'https://images.unsplash.com/photo-1620321023374-d1a68fbc720d?w=800&h=400&fit=crop',
          publishedAt: '2024-12-18T14:30:00Z',
          tags: language === 'zh' ? ['NFT', '访问控制', '技术'] : ['NFT', 'Access Control', 'Technology'],
          views: 892,
          language: language,
          slug: language === 'zh' ? 'nft-access-control-zh' : 'nft-access-control',
          published: true
        },
        {
          id: '3',
          title: language === 'zh' ? '矩阵推荐系统完全指南' : 'Complete Guide to Matrix Referral Systems',
          excerpt: language === 'zh'
            ? '深入探讨3x3矩阵推荐系统的运作原理及如何最大化您的收益。'
            : 'Deep dive into how 3x3 matrix referral systems work and how to maximize your earnings.',
          content: language === 'zh' ? '完整的博客内容在这里...' : 'Full blog content here...',
          author: language === 'zh' ? 'Beehive团队' : 'Beehive Team',
          imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=400&fit=crop',
          publishedAt: '2024-12-15T09:00:00Z',
          tags: language === 'zh' ? ['矩阵', '推荐', '收益'] : ['Matrix', 'Referral', 'Earnings'],
          views: 1543,
          language: language,
          slug: language === 'zh' ? 'matrix-referral-guide-zh' : 'matrix-referral-guide',
          published: true
        },
        {
          id: '4',
          title: language === 'zh' ? 'DeFi与传统金融的对比' : 'DeFi vs Traditional Finance: A Comparison',
          excerpt: language === 'zh'
            ? '比较去中心化金融和传统金融系统的优势与挑战。'
            : 'Comparing the advantages and challenges of decentralized finance vs traditional systems.',
          content: language === 'zh' ? '完整的博客内容在这里...' : 'Full blog content here...',
          author: language === 'zh' ? '金融分析师' : 'Finance Analyst',
          imageUrl: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800&h=400&fit=crop',
          publishedAt: '2024-12-12T16:45:00Z',
          tags: language === 'zh' ? ['DeFi', '金融', '分析'] : ['DeFi', 'Finance', 'Analysis'],
          views: 2108,
          language: language,
          slug: language === 'zh' ? 'defi-vs-traditional-zh' : 'defi-vs-traditional',
          published: true
        },
        {
          id: '5',
          title: language === 'zh' ? '智能合约安全最佳实践' : 'Smart Contract Security Best Practices',
          excerpt: language === 'zh'
            ? '学习如何编写安全的智能合约并避免常见的安全漏洞。'
            : 'Learn how to write secure smart contracts and avoid common vulnerabilities.',
          content: language === 'zh' ? '完整的博客内容在这里...' : 'Full blog content here...',
          author: language === 'zh' ? '安全专家' : 'Security Expert',
          imageUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&h=400&fit=crop',
          publishedAt: '2024-12-10T11:20:00Z',
          tags: language === 'zh' ? ['安全', '智能合约', '开发'] : ['Security', 'Smart Contracts', 'Development'],
          views: 1876,
          language: language,
          slug: language === 'zh' ? 'smart-contract-security-zh' : 'smart-contract-security',
          published: true
        },
        {
          id: '6',
          title: language === 'zh' ? '构建Web3社区的策略' : 'Strategies for Building Web3 Communities',
          excerpt: language === 'zh'
            ? '探索成功的Web3社区建设策略和最佳实践。'
            : 'Explore successful Web3 community building strategies and best practices.',
          content: language === 'zh' ? '完整的博客内容在这里...' : 'Full blog content here...',
          author: language === 'zh' ? '社区经理' : 'Community Manager',
          imageUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&h=400&fit=crop',
          publishedAt: '2024-12-08T13:00:00Z',
          tags: language === 'zh' ? ['社区', 'Web3', '策略'] : ['Community', 'Web3', 'Strategy'],
          views: 1392,
          language: language,
          slug: language === 'zh' ? 'web3-community-building-zh' : 'web3-community-building',
          published: true
        }
      ];
    }
  },

  // 获取单篇Blog文章（支持多语言）
  async getBlogPost(idOrSlug: string, language: string = 'en') {
    try {
      console.log(`📝 Blog API: 获取文章详情 ${idOrSlug} (${language})`);

      const post = await multilingualService.getBlogPost(idOrSlug, language);
      
      if (!post) {
        console.log('📝 Blog API: 文章不存在');
        return null;
      }

      // 转换为前端期望的格式
      const formattedPost = {
        id: post.id,
        title: post.title,
        excerpt: post.excerpt,
        content: post.content,
        author: post.author,
        author_wallet: post.author_wallet,
        imageUrl: post.image_url,
        publishedAt: post.published_at,
        tags: Array.isArray(post.tags) ? post.tags : [],
        views: post.views,
        language: post.language_code,
        slug: post.slug,
        published: post.published,
        metadata: post.metadata || {},
        createdAt: post.created_at
      };

      console.log(`✅ Blog API: 返回文章详情`);
      return formattedPost;
    } catch (error) {
      console.error('Blog API: 获取文章详情失败:', error);
      return null;
    }
  },

  // 获取支持的语言列表
  async getSupportedLanguages() {
    try {
      return await multilingualService.getSupportedLanguages();
    } catch (error) {
      console.error('Blog API: 获取支持语言失败:', error);
      return [
        { code: 'en', name: 'English', native_name: 'English', flag_emoji: '🇺🇸', is_active: true, is_default: true, rtl: false },
        { code: 'zh', name: 'Chinese Simplified', native_name: '简体中文', flag_emoji: '🇨🇳', is_active: true, is_default: false, rtl: false }
      ];
    }
  },

  // 搜索Blog文章
  async searchBlogPosts(query: string, language: string = 'en', options?: {
    tags?: string[];
    author?: string;
    limit?: number;
  }) {
    try {
      console.log(`🔍 Blog API: 搜索文章 "${query}" (${language})`);

      const allPosts = await this.getBlogPosts(language, {
        limit: 100, // 获取更多文章用于搜索
        tags: options?.tags
      });

      // 简单的文本搜索
      const searchResults = allPosts.filter(post => 
        post.title.toLowerCase().includes(query.toLowerCase()) ||
        post.excerpt.toLowerCase().includes(query.toLowerCase()) ||
        post.content.toLowerCase().includes(query.toLowerCase()) ||
        post.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
      );

      // 应用作者过滤
      const filteredResults = options?.author 
        ? searchResults.filter(post => post.author.toLowerCase().includes(options.author!.toLowerCase()))
        : searchResults;

      // 限制结果数量
      const limitedResults = options?.limit 
        ? filteredResults.slice(0, options.limit)
        : filteredResults;

      console.log(`✅ Blog API: 搜索到 ${limitedResults.length} 个结果`);
      return limitedResults;
    } catch (error) {
      console.error('Blog API: 搜索失败:', error);
      return [];
    }
  },

  // 获取热门标签
  async getPopularTags(language: string = 'en', limit: number = 10) {
    try {
      const posts = await this.getBlogPosts(language, { limit: 100 });
      const tagCounts: Record<string, number> = {};

      // 统计标签使用次数
      posts.forEach(post => {
        post.tags.forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      });

      // 排序并返回热门标签
      const popularTags = Object.entries(tagCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, limit)
        .map(([tag, count]) => ({ tag, count }));

      return popularTags;
    } catch (error) {
      console.error('Blog API: 获取热门标签失败:', error);
      return [];
    }
  },

  // 增加文章浏览量
  async incrementViews(postId: string) {
    try {
      const { error } = await multilingualService.supabase
        .from('blog_posts')
        .update({ 
          views: multilingualService.supabase.raw('views + 1'),
          updated_at: new Date().toISOString()
        })
        .eq('id', postId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Blog API: 增加浏览量失败:', error);
      return false;
    }
  }
};