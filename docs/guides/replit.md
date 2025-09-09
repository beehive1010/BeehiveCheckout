# Beehive - Web3 Membership and Learning Platform

## Overview

Beehive is a comprehensive Web3 membership and learning platform that combines blockchain-based membership credentials, educational content, and a referral reward system. The platform uses wallet addresses as the primary identity mechanism and features a 19-level membership system with an internal utility token (BCC), NFT marketplace, and 3×3 forced-matrix referral program.

Key features include:
- Wallet-based authentication and identity management
- 19-level membership system (BBC) purchased with USDT
- Dual token system (transferable and restricted BCC buckets)
- Educational courses and content access based on membership level
- NFT marketplace for merchant NFTs
- 3×3 matrix referral system with 48-hour upgrade timers
- Multi-language support (English, Chinese, Thai, Malay, Korean, Japanese)
- Dark theme with honey-yellow accent colors and honeycomb design elements

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **Styling**: Tailwind CSS with shadcn/ui component library for consistent UI components
- **Theme**: Dark background with honey-yellow accents, honeycomb geometry patterns
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: React Context for global state (Web3, i18n), TanStack Query for server state
- **Web3 Integration**: Thirdweb SDK v5 for wallet connection and blockchain interactions
- **Responsiveness**: Mobile-first design with progressive enhancement for tablet and desktop

### Backend Architecture
- **Runtime**: Supabase Edge Functions for serverless backend processing
- **Database**: PostgreSQL with Neon serverless PostgreSQL for cloud hosting
- **Authentication**: Wallet-based authentication using wallet addresses as primary keys
- **API Design**: Supabase Edge Functions with direct client-to-function communication

### Data Storage Solutions
- **Primary Database**: PostgreSQL with the following key tables:
  - `users`: Profile data keyed by wallet address
  - `membershipState`: BBC membership levels and activation status
  - `referralNodes`: 3×3 matrix referral tree structure
  - `bccBalances`: Dual token balances (transferable/restricted)
  - `orders`: Membership purchase transactions
  - `merchantNFTs` and `nftPurchases`: NFT marketplace data
  - `courses` and `courseAccess`: Educational content and user progress
- **File Storage**: IPFS for user profile metadata and NFT assets

### Authentication and Authorization
- **Primary Identity**: Ethereum wallet address as the unique user identifier
- **Wallet Connection**: Thirdweb SDK for secure wallet integration
- **Secondary Authentication**: Hashed secondary passwords for additional security
- **Route Protection**: Supabase Edge Functions handle access control requiring Level 1+ membership activation
- **Authorization Levels**: Membership level-based content and feature access

### External Dependencies
- **Blockchain Networks**: Ethereum, Polygon, Arbitrum, Optimism support
- **Payment Processing**: USDT payments via Thirdweb PayEmbed
- **File Storage**: IPFS via Thirdweb upload service
- **Database Hosting**: Neon serverless PostgreSQL
- **Wallet Integration**: MetaMask and other Web3 wallets via Thirdweb
- **Backend Processing**: Supabase Edge Functions for all server-side logic

The architecture follows a modern serverless pattern with pure frontend + Supabase Edge Functions, using Supabase for database operations and Thirdweb for blockchain integration.