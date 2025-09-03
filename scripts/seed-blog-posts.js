#!/usr/bin/env node

/**
 * Seed script to initialize blog posts in database
 */

import { db } from '../server/db.ts';
import { blogPosts } from '../shared/schema.ts';

const seedBlogPosts = async () => {
  try {
    console.log('🌱 Seeding blog posts...');

    // Check if blog posts already exist
    const existingPosts = await db.select().from(blogPosts).limit(1);
    
    if (existingPosts.length > 0) {
      console.log('✅ Blog posts already exist, skipping seed');
      return;
    }

    // Sample blog posts data
    const samplePosts = [
      {
        title: 'The Future of Web3 Membership Systems',
        excerpt: 'Exploring how blockchain technology is revolutionizing membership and loyalty programs across industries.',
        content: `
        <h2>Introduction</h2>
        <p>Web3 technology is transforming how we think about membership systems. Traditional membership programs are limited by centralization, lack of transparency, and limited portability.</p>
        
        <h2>Key Benefits</h2>
        <ul>
          <li>True ownership of membership assets</li>
          <li>Cross-platform interoperability</li>
          <li>Transparent reward distribution</li>
          <li>Community governance</li>
        </ul>

        <h2>The Future</h2>
        <p>As Web3 adoption grows, we expect to see more innovative membership models that empower users and create value for communities.</p>
        `,
        author: 'Beehive Team',
        imageUrl: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800&h=400&fit=crop',
        published: true,
        publishedAt: new Date('2024-12-20T10:00:00Z'),
        tags: ['Web3', 'Blockchain', 'Membership'],
        views: 1250,
        language: 'en'
      },
      {
        title: 'Understanding NFT-Based Access Control',
        excerpt: 'How NFTs are being used to gate content and create exclusive community experiences.',
        content: `
        <h2>What is NFT-Based Access Control?</h2>
        <p>NFT-based access control uses non-fungible tokens as digital keys to unlock premium content, features, or community access.</p>
        
        <h2>Use Cases</h2>
        <ul>
          <li>Exclusive content access</li>
          <li>Premium feature unlocks</li>
          <li>VIP community membership</li>
          <li>Event ticket validation</li>
        </ul>

        <h2>Implementation</h2>
        <p>Smart contracts verify NFT ownership in real-time, providing seamless and secure access control without centralized servers.</p>
        `,
        author: 'Technical Team',
        imageUrl: 'https://images.unsplash.com/photo-1620321023374-d1a68fbc720d?w=800&h=400&fit=crop',
        published: true,
        publishedAt: new Date('2024-12-18T14:30:00Z'),
        tags: ['NFT', 'Access Control', 'Technology'],
        views: 892,
        language: 'en'
      },
      {
        title: 'Building Sustainable Tokenomics',
        excerpt: 'Key principles for designing token economies that create long-term value for all participants.',
        content: `
        <h2>What Makes Good Tokenomics?</h2>
        <p>Sustainable tokenomics requires careful balance between supply, demand, utility, and incentives.</p>
        
        <h2>Core Principles</h2>
        <ul>
          <li>Clear utility and use cases</li>
          <li>Balanced supply mechanics</li>
          <li>Fair distribution methods</li>
          <li>Long-term sustainability</li>
        </ul>

        <h2>Common Pitfalls</h2>
        <p>Many projects fail by focusing only on short-term price action rather than building real utility and sustainable economics.</p>
        `,
        author: 'Economics Team',
        imageUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800&h=400&fit=crop',
        published: true,
        publishedAt: new Date('2024-12-15T09:15:00Z'),
        tags: ['Tokenomics', 'Economics', 'Sustainability'],
        views: 745,
        language: 'en'
      },
      {
        title: 'DeFi Integration Best Practices',
        excerpt: 'How to safely integrate with DeFi protocols while maintaining security and user experience.',
        content: `
        <h2>Security First</h2>
        <p>When integrating with DeFi protocols, security should always be the top priority.</p>
        
        <h2>Best Practices</h2>
        <ul>
          <li>Audit all smart contract interactions</li>
          <li>Use established, battle-tested protocols</li>
          <li>Implement proper slippage protection</li>
          <li>Monitor for unusual activity</li>
        </ul>

        <h2>User Experience</h2>
        <p>Complex DeFi interactions should be abstracted away to provide smooth user experiences.</p>
        `,
        author: 'Development Team',
        imageUrl: 'https://images.unsplash.com/photo-1642104704074-907c0698cbd9?w=800&h=400&fit=crop',
        published: true,
        publishedAt: new Date('2024-12-12T16:45:00Z'),
        tags: ['DeFi', 'Integration', 'Security'],
        views: 634,
        language: 'en'
      }
    ];

    // Insert sample blog posts
    for (const post of samplePosts) {
      await db.insert(blogPosts).values(post);
      console.log(`✅ Added blog post: ${post.title}`);
    }

    console.log('🎉 Successfully seeded blog posts!');
    console.log(`📊 Added ${samplePosts.length} blog posts`);

  } catch (error) {
    console.error('❌ Error seeding blog posts:', error);
  } finally {
    process.exit(0);
  }
};

seedBlogPosts();