# Baby Tracker Web - CLAUDE.md

This is a secure baby tracking web application built with Next.js, designed to help parents monitor their baby's activities with multi-user support and offline capabilities.

## Project Overview

**Type**: Full-stack web application  
**Framework**: Next.js 15+ with App Router  
**Database**: turso(sqlite) with Prisma ORM  
**Authentication**: NextAuth.js with Google OAuth  
**Styling**: Tailwind CSS + Radix UI components  
**Deployment**: Vercel-optimized

## Key Features

- **Multi-user baby sharing** with role-based permissions (OWNER/EDITOR/VIEWER)
- **Activity tracking**: feeding, sleeping, diaper changes, medicine
- **Offline-first architecture** with sync capabilities
- **Data import/export** (JSON format)
- **Resource usage limits** and admin monitoring
- **Mobile-responsive design**

## Architecture

### Database Schema (Prisma)
- `User` - OAuth users with Google authentication
- `Baby` - Baby profiles with owner relationships
- `Activity` - Timestamped activities (feeding, sleeping, etc.)
- `BabyAccess` - Permission system for sharing babies
- Standard NextAuth tables (Account, Session, VerificationToken)

### API Structure
- `/api/auth/*` - NextAuth.js authentication
- `/api/babies/*` - Baby CRUD operations
- `/api/activities/*` - Activity tracking
- `/api/import` & `/api/export` - Data portability
- `/api/admin/*` - System monitoring (admin only)

### Frontend Components
- `AppHeader.js` - Main navigation with baby selector
- `FeedingTracker.js` - Core activity input form
- `RecentActivities.js` - Activity history display
- `OfflineIndicator.js` & `SyncStatusIndicator.js` - Sync status
- Custom UI components in `/components/ui/`

## Development Commands

```bash
# Development
npm run dev              # Start dev server
npm run build           # Build for production
npm run lint            # ESLint checks

# Database
npx prisma generate     # Generate Prisma client
npx prisma db push      # Push schema changes
npx prisma studio       # Database GUI
npm run db:seed         # Seed sample data
npm run db:reset        # Reset and reseed

# Testing
npm run build && npm start  # Test production build
```

## Environment Setup

Required environment variables:
- `NEXTAUTH_SECRET` - NextAuth.js secret
- `NEXTAUTH_URL` - Full app URL
- `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET` - OAuth credentials
- `DATABASE_URL` - Database connection string
- `ADMIN_EMAILS` - Comma-separated admin email addresses

## Security Features

- Google OAuth only authentication
- Baby ownership validation on all operations
- Role-based access control with granular permissions
- Input validation and sanitization
- Resource usage limits (activities per baby, accounts per user)
- Security headers and middleware protection
- No hardcoded secrets or credentials

## File Structure

```
app/                     # Next.js app router pages
├── api/                # API routes
├── auth/               # Auth pages
└── *.js               # Main pages

components/             # React components
├── ui/                # Reusable UI components
└── *.js              # Feature components

lib/                    # Utilities and services
├── auth.js            # NextAuth configuration
├── db.js              # Database connection
├── sync-service.js    # Offline sync logic
└── *.js              # Other utilities

prisma/                # Database
├── schema.prisma      # Database schema
└── migrations/        # Migration files

docs/                  # Documentation
└── *.md              # Setup and API docs
```

## Deployment

Optimized for Vercel deployment with:
- Automatic Prisma client generation
- Database migration on build
- Environment variable configuration
- Edge-friendly middleware

## Admin Features

Admin users (defined in `ADMIN_EMAILS`) can access:
- System usage statistics at `/api/admin/limits`
- Resource monitoring and limits management
- User and activity oversight capabilities

## Offline Support

The application includes sophisticated offline capabilities:
- Local storage for activities when offline
- Automatic sync when connection restored
- Conflict resolution for concurrent edits
- Background sync daemon
- Visual sync status indicators