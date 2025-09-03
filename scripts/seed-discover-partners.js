#!/usr/bin/env node

/**
 * Seed script to initialize discover partners in database
 */

import { db } from '../server/db.ts';
import { discoverPartners } from '../shared/schema.ts';

const seedDiscoverPartners = async () => {
  try {
    console.log('🌱 Seeding discover partners...');

    // Check if partners already exist
    const existingPartners = await db.select().from(discoverPartners).limit(1);
    
    if (existingPartners.length > 0) {
      console.log('✅ Discover partners already exist, skipping seed');
      return;
    }

    // Sample partners data
    const samplePartners = [
      {
        name: 'DeFi Protocol',
        logoUrl: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=64&h=64&fit=crop',
        websiteUrl: 'https://defiprotocol.example.com',
        shortDescription: 'Advanced decentralized finance platform with yield farming and staking',
        longDescription: 'A comprehensive DeFi platform offering yield farming, staking, and liquidity mining opportunities with competitive APY rates.',
        tags: ['DeFi', 'Yield Farming', 'Staking'],
        chains: ['Ethereum', 'BSC', 'Polygon'],
        dappType: 'DeFi',
        featured: true,
        status: 'published'
      },
      {
        name: 'NFT Marketplace',
        logoUrl: 'https://images.unsplash.com/photo-1620321023374-d1a68fbc720d?w=64&h=64&fit=crop',
        websiteUrl: 'https://nftmarket.example.com',
        shortDescription: 'Leading NFT trading platform with exclusive collections',
        longDescription: 'Premier NFT marketplace featuring exclusive collections from top artists and creators with zero gas fees.',
        tags: ['NFT', 'Marketplace', 'Art'],
        chains: ['Ethereum', 'Polygon'],
        dappType: 'NFT',
        featured: false,
        status: 'published'
      },
      {
        name: 'Gaming Platform',
        logoUrl: 'https://images.unsplash.com/photo-1614294148960-9aa740632a87?w=64&h=64&fit=crop',
        websiteUrl: 'https://gameplatform.example.com',
        shortDescription: 'Play-to-earn gaming ecosystem with tokenized rewards',
        longDescription: 'Revolutionary gaming platform where players can earn tokens through gameplay and participate in the metaverse economy.',
        tags: ['Gaming', 'Play-to-Earn', 'Metaverse'],
        chains: ['BSC', 'Polygon'],
        dappType: 'Game',
        featured: true,
        status: 'published'
      },
      {
        name: 'Wallet Pro',
        logoUrl: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=64&h=64&fit=crop',
        websiteUrl: 'https://walletpro.example.com',
        shortDescription: 'Multi-chain wallet with advanced security features',
        longDescription: 'Professional multi-chain wallet solution with hardware security, DeFi integration, and portfolio management tools.',
        tags: ['Wallet', 'Security', 'Multi-chain'],
        chains: ['Ethereum', 'BSC', 'Polygon', 'Arbitrum'],
        dappType: 'Wallet',
        featured: false,
        status: 'published'
      },
      {
        name: 'Analytics Tools',
        logoUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=64&h=64&fit=crop',
        websiteUrl: 'https://analytics.example.com',
        shortDescription: 'Advanced blockchain analytics and portfolio tracking',
        longDescription: 'Comprehensive analytics platform providing real-time blockchain data, portfolio tracking, and market insights.',
        tags: ['Analytics', 'Portfolio', 'Data'],
        chains: ['Ethereum', 'BSC', 'Polygon'],
        dappType: 'Tools',
        featured: false,
        status: 'published'
      }
    ];

    // Insert sample partners
    for (const partner of samplePartners) {
      await db.insert(discoverPartners).values(partner);
      console.log(`✅ Added partner: ${partner.name}`);
    }

    console.log('🎉 Successfully seeded discover partners!');
    console.log(`📊 Added ${samplePartners.length} partners`);

  } catch (error) {
    console.error('❌ Error seeding discover partners:', error);
  } finally {
    process.exit(0);
  }
};

seedDiscoverPartners();