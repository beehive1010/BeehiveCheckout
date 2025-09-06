// Blog API functions for HiveWorld
export const blogApi = {
  async getBlogPosts(language: string = 'en') {
    // Mock data - replace with actual API call
    return [
      {
        id: '1',
        title: 'The Future of Web3 Membership Systems',
        excerpt: 'Exploring how blockchain technology is revolutionizing membership and loyalty programs across industries.',
        content: 'Full blog content here...',
        author: 'Beehive Team',
        imageUrl: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800&h=400&fit=crop',
        publishedAt: '2024-12-20T10:00:00Z',
        tags: ['Web3', 'Blockchain', 'Membership'],
        views: 1250,
        language: 'en'
      },
      {
        id: '2', 
        title: 'Understanding NFT-Based Access Control',
        excerpt: 'How NFTs are being used to gate content and create exclusive community experiences.',
        content: 'Full blog content here...',
        author: 'Technical Team',
        imageUrl: 'https://images.unsplash.com/photo-1620321023374-d1a68fbc720d?w=800&h=400&fit=crop',
        publishedAt: '2024-12-18T14:30:00Z',
        tags: ['NFT', 'Access Control', 'Technology'],
        views: 892,
        language: 'en'
      }
    ];
  },

  async getBlogPost(id: string) {
    const posts = await this.getBlogPosts();
    return posts.find(post => post.id === id);
  }
};