# Baby Tracker Database Schema

This document describes the database schema for the Baby Tracker application with authentication and baby sharing features.

## Authentication System

The application uses **NextAuth.js** for OAuth authentication with support for Google, Apple, and Microsoft accounts.

## Tables

### 1. Users Table
Records website users who can track babies and manage authentication.

**Columns:**
- `id` (Integer, Primary Key, Auto-increment) - Unique user identifier
- `email` (String, Unique, Required) - User's email address
- `name` (String, Optional) - User's full name from OAuth provider
- `image` (String, Optional) - User's profile picture URL
- `emailVerified` (DateTime, Optional) - Email verification timestamp
- `createdAt` (DateTime) - When the user was created
- `updatedAt` (DateTime) - When the user was last updated

**Relations:**
- Has many `accounts` (OAuth accounts)
- Has many `sessions` (login sessions)
- Owns many `babies` (as owner)
- Has many `activities` (recorded by user)
- Has many `babyAccess` (shared baby permissions)

### 2. Account Table (NextAuth.js OAuth)
Stores OAuth provider account information.

**Columns:**
- `id` (String, Primary Key) - Unique account identifier (CUID)
- `userId` (Integer, Foreign Key, Required) - References users.id
- `type` (String, Required) - Account type ("oauth")
- `provider` (String, Required) - OAuth provider ("google", "apple", etc.)
- `providerAccountId` (String, Required) - Provider's user ID
- `refresh_token` (String, Optional) - OAuth refresh token
- `access_token` (String, Optional) - OAuth access token
- `expires_at` (Integer, Optional) - Token expiration timestamp
- `token_type` (String, Optional) - Token type ("Bearer")
- `scope` (String, Optional) - OAuth scopes
- `id_token` (String, Optional) - OpenID Connect ID token
- `session_state` (String, Optional) - OAuth session state

### 3. Session Table (NextAuth.js Sessions)
Manages user login sessions.

**Columns:**
- `id` (String, Primary Key) - Unique session identifier (CUID)
- `sessionToken` (String, Unique, Required) - Session token
- `userId` (Integer, Foreign Key, Required) - References users.id
- `expires` (DateTime, Required) - Session expiration

### 4. VerificationToken Table (NextAuth.js)
Handles email verification tokens.

**Columns:**
- `identifier` (String, Required) - Email or phone number
- `token` (String, Unique, Required) - Verification token
- `expires` (DateTime, Required) - Token expiration

### 5. Babies Table
Records baby information with ownership and sharing capabilities.

**Columns:**
- `id` (Integer, Primary Key, Auto-increment) - Unique baby identifier
- `ownerId` (Integer, Foreign Key, Required) - References users.id (baby owner)
- `babyName` (String, Required) - Baby's name
- `gender` (String, Required) - 'GIRL', 'BOY', or 'OTHER'
- `birthday` (DateTime, Required) - Baby's birth date
- `description` (String, Optional) - Optional baby description
- `avatar` (String, Optional) - Baby's photo/avatar URL
- `isPublic` (Boolean, Default: false) - Whether baby can be found publicly
- `inviteCode` (String, Unique, Optional) - Unique sharing code
- `createdAt` (DateTime) - When the record was created
- `updatedAt` (DateTime) - When the record was last updated

**Relations:**
- Belongs to `owner` (User)
- Has many `activities`
- Has many `babyAccess` (sharing permissions)

### 6. BabyAccess Table (Sharing & Permissions)
Controls who can access which babies and their permission levels.

**Columns:**
- `id` (Integer, Primary Key, Auto-increment) - Unique access record
- `babyId` (Integer, Foreign Key, Required) - References babies.id
- `userId` (Integer, Foreign Key, Required) - References users.id
- `role` (String, Required) - User role: 'ADMIN', 'EDITOR', 'VIEWER'
- `canEdit` (Boolean, Default: true) - Can add/edit activities
- `canView` (Boolean, Default: true) - Can view activities
- `canInvite` (Boolean, Default: false) - Can invite other users
- `canManage` (Boolean, Default: false) - Can modify baby details
- `createdAt` (DateTime) - When access was granted
- `updatedAt` (DateTime) - When access was last updated

**Relations:**
- Belongs to `baby`
- Belongs to `user`

**Unique Constraint:** (babyId, userId) - One access record per user per baby

### 3. Activities Table
Records baby activities like feeding, sleeping, diapering, etc.

**Columns:**
- `id` (Integer, Primary Key, Auto-increment) - Unique activity identifier
- `babyId` (Integer, Foreign Key, Required) - References babies.id
- `recorder` (Integer, Foreign Key, Required) - User ID who recorded this activity
- `type` (String, Required) - Activity type: 'FEEDING', 'SLEEPING', 'DIAPERING', 'GROWTH', 'HEALTH', 'LEISURE'
- `subtype` (String, Optional) - Activity subtype: 'BOTTLE', 'MEAL', 'PEE', 'PEEPOO', 'GROWTH_WEIGHT', 'HEALTH_MEDICATIONS', 'LEISURE_TUMMY', etc.
- `fromDate` (DateTime, Required) - When the activity started
- `toDate` (DateTime, Optional) - When the activity ended
- `unit` (String, Optional) - Unit of measurement: 'MILLILITRES', 'OUNCES', 'KILOGRAMS', 'CENTIMETERS', 'CELSIUS', 'NONE'
- `amount` (Float, Optional) - Quantity (e.g., 160.0 for feeding, 3.5 for weight in kg)
- `category` (String, Optional) - Category: 'FORMULA', 'BREAST_MILK', 'NONE'
- `details` (String, Optional) - Free-form text notes
- `createdAt` (DateTime) - When the record was created
- `updatedAt` (DateTime) - When the record was last updated

## Relationships

**Authentication:**
- **User → Account**: One-to-many (one user can have multiple OAuth accounts)
- **User → Session**: One-to-many (one user can have multiple active sessions)

**Baby Ownership & Sharing:**
- **User → Babies (Owner)**: One-to-many (one user can own multiple babies)
- **Baby → BabyAccess**: One-to-many (one baby can be shared with multiple users)
- **User → BabyAccess**: One-to-many (one user can have access to multiple babies)

**Activity Tracking:**
- **Baby → Activities**: One-to-many (one baby can have multiple activities)
- **User → Activities**: One-to-many (one user can record multiple activities)

## Baby Sharing Workflow

### 1. Baby Owner Actions
```javascript
// Owner creates a baby
const baby = await prisma.baby.create({
  data: {
    ownerId: userId,
    babyName: "Emma",
    gender: "GIRL",
    birthday: new Date("2024-01-15"),
    inviteCode: generateUniqueCode() // Auto-generated
  }
})
```

### 2. Sharing Baby with Others
```javascript
// Owner shares baby with partner/family
const access = await prisma.babyAccess.create({
  data: {
    babyId: babyId,
    userId: partnerId,
    role: "EDITOR", // Can add/edit activities
    canEdit: true,
    canView: true,
    canInvite: false,
    canManage: false
  }
})
```

### 3. Joining Baby via Invite Code
```javascript
// User joins baby using invite code
const baby = await prisma.baby.findUnique({
  where: { inviteCode: "ABC123" }
})

if (baby) {
  await prisma.babyAccess.create({
    data: {
      babyId: baby.id,
      userId: userId,
      role: "EDITOR"
    }
  })
}
```

### 4. Permission-based Data Access
```javascript
// Get babies user has access to
const userBabies = await prisma.baby.findMany({
  where: {
    OR: [
      { ownerId: userId }, // Owned babies
      { 
        babyAccess: {
          some: {
            userId: userId,
            canView: true
          }
        }
      } // Shared babies
    ]
  }
})
```

## Permission Roles

### ADMIN (Baby Owner)
- Full control over baby settings
- Can modify baby details
- Can manage sharing and permissions
- Can invite/remove users
- Can delete baby

### EDITOR (Parent/Caregiver)
- Can add and edit activities
- Can view all activities
- Cannot modify baby details
- Cannot manage sharing

### VIEWER (Extended Family)
- Can only view activities
- Cannot add or edit activities
- Read-only access

## Setup Instructions

### 1. Install Dependencies
```bash
npm install prisma @prisma/client next-auth @auth/prisma-adapter
```

### 2. Configure Environment Variables
Create `.env` file with:
```env
# Database
DATABASE_URL="file:./prisma/dev.db"

# NextAuth.js
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# OAuth Providers
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

### 3. Set Up Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add `http://localhost:3000/api/auth/callback/google` to authorized redirect URIs
6. Copy Client ID and Secret to `.env`

### 4. Generate Prisma Client
```bash
npx prisma generate
```

### 5. Run Migrations
```bash
npx prisma migrate dev --name init
```

### 6. Seed Database (Optional)
```bash
npm run db:seed
```

### 7. Start Development Server
```bash
npm run dev
```

## Usage Examples

### Import Database Connection
```javascript
import { prisma } from './lib/db.js'
```

### Create a New Baby with Owner
```javascript
const baby = await prisma.baby.create({
  data: {
    ownerId: userId,
    babyName: 'Emma',
    gender: 'GIRL',
    birthday: new Date('2024-01-15'),
    inviteCode: generateInviteCode(), // Unique 6-character code
    description: 'Our precious daughter'
  }
})
```

### Share Baby with Another User
```javascript
const babyAccess = await prisma.babyAccess.create({
  data: {
    babyId: 1,
    userId: 2, // Partner's user ID
    role: 'EDITOR',
    canEdit: true,
    canView: true,
    canInvite: false,
    canManage: false
  }
})
```

### Get User's Accessible Babies
```javascript
const userBabies = await prisma.baby.findMany({
  where: {
    OR: [
      { ownerId: userId }, // Owned babies
      { 
        babyAccess: {
          some: {
            userId: userId,
            canView: true
          }
        }
      } // Shared babies
    ]
  },
  include: {
    owner: {
      select: { name: true, email: true }
    },
    babyAccess: {
      where: { userId: userId },
      select: { role: true, canEdit: true }
    }
  }
})
```

### Record a Feeding Activity
```javascript
const feeding = await prisma.activity.create({
  data: {
    babyId: 1,
    recorder: 1,
    type: 'FEEDING',
    subtype: 'BOTTLE',
    fromDate: new Date(),
    unit: 'MILLILITRES',
    amount: 120.0,
    category: 'FORMULA',
    details: 'Good appetite'
  }
})
```

### Get Activities for a Baby
```javascript
const activities = await prisma.activity.findMany({
  where: { babyId: 1 },
  orderBy: { fromDate: 'desc' },
  include: {
    baby: true,
    user: true
  }
})
```

## Database Commands

### Useful npm Scripts
- `npm run db:seed` - Populate database with sample data
- `npm run db:reset` - Reset database and reseed
- `npm run db:studio` - Open Prisma Studio (visual database browser)

### Prisma Commands
- `npx prisma studio` - Open database browser
- `npx prisma migrate dev` - Create and run new migration
- `npx prisma migrate reset` - Reset database
- `npx prisma generate` - Regenerate Prisma client
- `npx prisma db push` - Push schema changes without migration

## Activity Types

### Standardized Activity Types and Subtypes

**FEEDING:**
- `BOTTLE` - Bottle feeding (formula or breast milk)
- `MEAL` - Solid food meal
- `LEFT_BREAST` - Left breast feeding
- `RIGHT_BREAST` - Right breast feeding

**SLEEPING:**
- `NONE` - Sleep activity (no specific subtype)

**DIAPERING:**
- `PEE` - Wet diaper
- `POO` - Soiled diaper
- `PEEPOO` - Both wet and soiled

**GROWTH:**
- `GROWTH_WEIGHT` - Weight measurement (kg)
- `GROWTH_HEIGHT` - Height measurement (cm)
- `GROWTH_HEAD` - Head circumference measurement (cm)

**HEALTH:**
- `HEALTH_MEDICATIONS` - Medication administration
- `HEALTH_TEMPERATURE` - Temperature measurement (°C)
- `HEALTH_VACCINATIONS` - Vaccination records

**LEISURE:**
- `LEISURE_TUMMY` - Tummy time activities
- `LEISURE_BATH` - Bath time
- `LEISURE_WALK` - Going for walks

### Categories

**For FEEDING activities:**
- `FORMULA` - Formula feeding
- `BREAST_MILK` - Breast milk feeding
- `NONE` - Default/other

### Units

**Volume:**
- `MILLILITRES` - For liquid measurements (feeding)
- `OUNCES` - Alternative liquid measurement

**Weight/Length:**
- `KILOGRAMS` - For weight measurements
- `CENTIMETERS` - For height/head circumference

**Temperature:**
- `CELSIUS` - For temperature readings

**Default:**
- `NONE` - No specific unit

## Authentication Flow

### 1. User Registration/Login
- User clicks "Sign in with Google"
- OAuth flow creates/updates User record
- Session is created automatically

### 2. First-time Setup
- New users see "Create Baby" or "Join Baby" options
- Creating baby makes user the owner
- Joining requires invite code

### 3. Multi-user Access
- Baby owner shares invite code
- Family members join using code
- Everyone can track activities for shared babies

## Database Files

- `prisma/schema.prisma` - Prisma schema definition with auth tables
- `prisma/migrations/` - Migration files including auth schema
- `prisma/seed.js` - Sample data seeding script
- `lib/auth.js` - NextAuth.js configuration
- `lib/db.js` - Database connection configuration  
- `lib/services.js` - Database service functions
- `app/api/auth/[...nextauth]/route.js` - NextAuth.js API route
- `docs/schema.sql` - Raw SQL schema for reference

## Production Deployment

### Vercel + Turso Setup
1. **Turso Database:**
   ```bash
   turso db create baby-tracker
   turso db tokens create baby-tracker
   ```

2. **Environment Variables (Vercel):**
   ```env
   DATABASE_URL="libsql://baby-tracker-[org].turso.io"
   DATABASE_AUTH_TOKEN="your-turso-token"
   NEXTAUTH_SECRET="your-production-secret"
   NEXTAUTH_URL="https://your-domain.vercel.app"
   GOOGLE_CLIENT_ID="your-google-client-id"
   GOOGLE_CLIENT_SECRET="your-google-client-secret"
   ```

3. **Google OAuth Setup:**
   - Add production domain to authorized redirect URIs
   - Format: `https://your-domain.vercel.app/api/auth/callback/google`

### Schema Migration
```bash
# Apply schema to production database
npx prisma db push --skip-generate
```
