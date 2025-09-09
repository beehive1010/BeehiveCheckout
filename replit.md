# Beehive Platform

## Overview

Beehive is a comprehensive Web3 membership and learning platform that combines blockchain-based membership credentials, educational content, and a sophisticated referral reward system. The platform operates on a 19-level membership system (BBC) with USDT payments, featuring a dual BCC token system and a 3×3 matrix referral structure. It includes educational courses, NFT marketplace functionality, and multi-language support across six languages.

The platform serves as a complete ecosystem where users can join through wallet-based authentication, purchase sequential NFT membership levels, earn rewards through referrals, and access educational content based on their membership tier.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript in strict mode using Vite as the build tool for modern development experience
- **Styling**: Tailwind CSS with shadcn/ui component library providing consistent dark theme with honey-yellow accents and honeycomb design patterns
- **Routing**: Wouter for lightweight client-side routing with protected routes and authentication guards
- **State Management**: React Context API for global state (Web3Context, AdminAuthContext, I18nContext) combined with TanStack Query for efficient server state management
- **Web3 Integration**: Thirdweb SDK v5 for wallet connection, blockchain interactions, and NFT operations across multiple chains
- **UI Components**: Comprehensive component library with responsive design, animations using React Spring, and accessibility features

### Backend Architecture
- **Runtime**: Supabase Edge Functions providing serverless backend processing with TypeScript support
- **Database**: PostgreSQL hosted on Supabase with comprehensive type generation and Row Level Security (RLS) policies
- **Authentication**: Wallet-based authentication system using Ethereum wallet addresses as primary identifiers
- **API Design**: RESTful edge functions with typed responses and standardized error handling
- **Edge Functions**: Five core functions handling membership activation, reward processing, BCC distribution, level upgrades, and withdrawal systems

### Data Storage Solutions
- **Primary Database**: PostgreSQL with the following key table structure:
  - `users`: Profile data keyed by wallet address with referrer tracking
  - `members`: Membership status, activation state, and current levels
  - `referrals`: 3×3 matrix referral tree structure with position tracking
  - `user_balances`: Segregated BCC balances (transferable, locked, staking, pending)
  - `reward_claims`: Layer-based reward system with 72-hour expiry mechanics
  - `nft_levels`: Sequential NFT level configurations and pricing
  - `orders`: Purchase transaction records and payment processing
  - `courses`: Educational content and user progress tracking
- **Type Safety**: Complete TypeScript type generation from database schema ensuring end-to-end type safety
- **Database Views**: Optimized views for complex queries including user complete info, balance summaries, and matrix status

### Authentication and Authorization
- **Primary Identity**: Ethereum wallet address as unique user identifier with case-sensitive preservation
- **Wallet Integration**: Thirdweb In-App Wallet supporting multiple authentication methods (email, social, passkey)
- **Session Management**: Supabase authentication for admin users with role-based permissions
- **Admin System**: Three-tier permission system (Basic Admin, Advanced Admin, Super Admin) with granular permission controls
- **Member Guards**: Protected routes ensuring only activated members can access premium features

## External Dependencies

### Blockchain Infrastructure
- **Thirdweb SDK v5**: Complete Web3 integration for wallet connection, contract interaction, and multi-chain support
- **Supported Chains**: Arbitrum One, Arbitrum Sepolia, Ethereum Mainnet, BSC, Optimism, Polygon, Base
- **Smart Contracts**: ERC-1155 NFT contracts for membership levels with USDT payment processing
- **Payment Processing**: USDT token handling across multiple chains with automatic fee calculation

### Database and Backend Services
- **Supabase**: Complete backend-as-a-service providing PostgreSQL database, authentication, and edge functions
- **Database Hosting**: Serverless PostgreSQL with automatic scaling and backup management
- **Edge Functions**: Deno runtime for serverless function execution with TypeScript support
- **Real-time Features**: Supabase real-time subscriptions for live data updates

### Development and Build Tools
- **Vite**: Modern build tool with hot module replacement and optimized production builds
- **TypeScript**: Strict type checking with comprehensive type definitions
- **Tailwind CSS**: Utility-first CSS framework with custom configuration for brand theming
- **TanStack Query**: Powerful data fetching and caching library with optimistic updates
- **React Hook Form**: Form handling with validation using Zod schemas
- **Drizzle Kit**: Database schema management and migration tools

### UI and Design System
- **Radix UI**: Accessible component primitives for complex UI components
- **Lucide React**: Comprehensive icon library with consistent styling
- **React Spring**: Animation library for smooth transitions and interactive elements
- **Date-fns**: Date manipulation and formatting utilities
- **CMDK**: Command menu component for enhanced user experience

### Monitoring and Analytics
- **Supabase Analytics**: Built-in database performance monitoring and query analysis
- **Edge Function Logs**: Comprehensive logging and error tracking for serverless functions
- **Security Audit System**: Custom SQL scripts for function security testing and RLS policy validation
- **Transaction Monitoring**: Cross-chain transaction tracking with confirmation status