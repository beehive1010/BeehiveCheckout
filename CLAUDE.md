# Beehive - Web3 Membership and Learning Platform

## Overview

Beehive is a comprehensive Web3 membership and learning platform that combines blockchain-based membership credentials, educational content, and a referral reward system. The platform uses wallet addresses as the primary identity mechanism and features a 19-level membership system with an internal utility token (BCC), NFT marketplace, and 3×3 forced-matrix referral program.

## Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite with hot reload and development optimizations
- **Styling**: Tailwind CSS with shadcn/ui component library
- **Routing**: Wouter (lightweight client-side routing)
- **State Management**: 
  - React Context for global state (Web3, i18n)
  - TanStack Query for server state management
- **Web3 Integration**: Thirdweb SDK v5 for wallet connection and blockchain interactions
- **UI Components**: Radix UI primitives with shadcn/ui styling
- **Animations**: Framer Motion
- **Icons**: Heroicons, Tabler Icons, Lucide React, React Icons

### Backend
- **Runtime**: Node.js with Express.js
- **Database**: PostgreSQL with Drizzle ORM (type-safe database operations)
- **Database Provider**: Neon serverless PostgreSQL
- **Authentication**: Wallet-based authentication using wallet addresses as primary keys
- **Session Management**: Express sessions with connect-pg-simple for PostgreSQL session storage
- **Build**: esbuild for server bundling

### Development & Deployment
- **Environment**: Replit-hosted with PostgreSQL 16 and Node.js 20
- **Package Manager**: npm
- **TypeScript**: v5.6.3 with strict mode
- **Linting**: ESLint (configured but minimal)
- **Deployment**: Replit autoscale deployment

## Development Commands

### Core Commands
```bash
# Development server (starts both frontend and backend)
npm run dev

# Production build (builds both client and server)
npm run build

# Production start
npm run start

# TypeScript type checking
npm run check

# Database operations
npm run db:push    # Push schema changes to database
```

### Development Workflow
1. **Start Development**: `npm run dev` - Runs the full-stack application on port 5000
2. **Database Changes**: Update `/shared/schema.ts` → run `npm run db:push`
3. **Type Checking**: `npm run check` to verify TypeScript compilation
4. **Build for Production**: `npm run build` creates optimized bundles

## Project Architecture

### Directory Structure
```
/home/runner/workspace/
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/     # Reusable UI components organized by feature
│   │   ├── pages/         # Route-based page components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Utility libraries and configurations
│   │   ├── contexts/      # React Context providers
│   │   ├── api/           # Frontend API client functions
│   │   └── translations/  # i18n language files (en, zh, th, ms, ko, ja)
│   ├── public/           # Static assets
│   └── index.html        # HTML template
├── server/               # Express backend application
│   ├── src/
│   │   ├── routes/       # API endpoint definitions
│   │   ├── services/     # Business logic services
│   │   ├── repositories/ # Data access layer
│   │   └── adapters/     # External service integrations
│   └── index.ts         # Server entry point
├── shared/              # Shared code between client and server
│   └── schema.ts        # Drizzle database schema definitions
├── migrations/          # Database migration files
├── scripts/            # Utility scripts for database setup and diagnostics
└── attached_assets/    # File storage and assets
```

### Key Configuration Files
- **`vite.config.ts`**: Frontend build configuration with React and Replit plugins
- **`tsconfig.json`**: TypeScript configuration with path mapping
- **`tailwind.config.ts`**: Tailwind CSS configuration with custom Beehive theme
- **`drizzle.config.ts`**: Database ORM configuration
- **`components.json`**: shadcn/ui component configuration
- **`.replit`**: Replit hosting and deployment configuration

### Frontend Architecture
- **Component Organization**: Feature-based structure with shared UI components
- **Routing**: Single-page application with Wouter for client-side routing
- **State Management**: 
  - Global state via React Context (Web3Provider, I18nProvider)
  - Server state via TanStack Query with custom query client
- **Theme**: Dark mode with honey-yellow accents and honeycomb design patterns
- **Internationalization**: 6 languages supported (English, Chinese, Thai, Malay, Korean, Japanese)

### Backend Architecture
- **API Design**: RESTful endpoints with middleware-based request processing
- **Database Layer**: Drizzle ORM with type-safe queries and schema definitions
- **Authentication**: Wallet address-based identity with session management
- **Business Logic**: Service layer pattern with repositories for data access
- **Session Storage**: PostgreSQL-backed sessions for server-side state

### Database Schema Highlights
Located in `/shared/schema.ts`:
- **users**: Profile data keyed by wallet address
- **members**: BBC membership levels and activation status
- **referrals**: 3×3 matrix referral tree structure with 19 layers
- **bccBalances**: Dual token balances (transferable/restricted)
- **orders**: Membership purchase transactions
- **merchantNFTs** and **nftPurchases**: NFT marketplace data
- **courses** and **courseAccess**: Educational content and user progress

### Web3 Integration
- **Wallet Connection**: Thirdweb SDK v5 for multi-wallet support
- **Blockchain Networks**: Ethereum, Polygon, Arbitrum, Optimism
- **Payment Processing**: USDT payments via Thirdweb PayEmbed
- **File Storage**: IPFS via Thirdweb upload service
- **Smart Contract Interaction**: Automated through Thirdweb services

## Key Features

### User System
- **Wallet-based Identity**: Ethereum addresses as primary user identifiers
- **19-level Membership**: BBC membership system with USDT purchases
- **Dual Token System**: Transferable and restricted BCC token buckets
- **Profile Management**: User profiles with IPFS metadata storage

### Referral System
- **3×3 Matrix Structure**: Multi-level referral tree with spillover mechanics
- **48-hour Upgrade Timers**: Automated progression system
- **Layer-based Rewards**: 19-layer deep referral compensation
- **Real-time Matrix Visualization**: Interactive referral tree display

### Educational Content
- **Level-gated Access**: Content access based on membership level
- **Progress Tracking**: User course completion and progress data
- **Multi-language Support**: Localized content delivery

### NFT Marketplace
- **Merchant NFTs**: Platform-managed NFT collections
- **Purchase History**: Transaction tracking and ownership records
- **Metadata Management**: IPFS-based asset storage

## Development Guidelines

### Code Organization
- **Path Aliases**: Use `@/` for client code, `@shared/` for shared utilities
- **Component Structure**: Feature-based organization with reusable UI components
- **Type Safety**: Full TypeScript usage with strict mode enabled
- **Database Operations**: Use Drizzle ORM for all database interactions

### Key Development Files
- **Frontend Entry**: `/client/src/main.tsx`
- **Backend Entry**: `/server/index.ts`
- **App Router**: `/client/src/App.tsx`
- **Database Schema**: `/shared/schema.ts`
- **Global Styles**: `/client/src/index.css`

### Environment Variables
Configuration stored in `.env` file (not tracked in git):
- `DATABASE_URL`: Neon PostgreSQL connection string
- Additional Web3 and service API keys

### Testing
- No formal test suite currently implemented
- Manual testing via development server
- Database diagnostic scripts in `/scripts/` directory

## Deployment

### Replit Configuration
- **Build Command**: `npm run build`
- **Start Command**: `npm run start`
- **Environment**: Node.js 20, PostgreSQL 16, web environment
- **Port**: 5000 (configured in `.replit`)
- **Deployment**: Autoscale deployment target

### Production Considerations
- Static assets served from `/dist/public/`
- Server bundle optimized with esbuild
- Database connections managed via Neon serverless
- Session persistence via PostgreSQL storage
- Background job processing via Replit scheduled tasks

## Quick Start for New Claude Code Sessions

1. **Understand the Context**: This is a Web3 membership platform with complex referral mechanics
2. **Key Entry Points**: 
   - Frontend: `/client/src/App.tsx` for routing and main components
   - Backend: `/server/index.ts` for API endpoints
   - Database: `/shared/schema.ts` for data models
3. **Development Flow**: Use `npm run dev` to start development server
4. **Common Tasks**:
   - UI changes: Work in `/client/src/components/` or `/client/src/pages/`
   - API changes: Work in `/server/src/routes/`
   - Database changes: Update `/shared/schema.ts` then run `npm run db:push`
   - Styling: Update Tailwind classes or `/client/src/index.css`

This platform combines traditional web application patterns with Web3 functionality, so be prepared to work with both conventional React/Express patterns and blockchain-specific concepts like wallet authentication and token mechanics.