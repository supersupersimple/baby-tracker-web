# 👶 Baby Tracker

A secure, full-featured baby tracking application built with Next.js, Prisma, and NextAuth.js.

## 🚀 Features

- **👥 Multi-user Support**: Share baby access with family members
- **📊 Activity Tracking**: Feeding, sleeping, diaper changes, and more
- **📱 Responsive Design**: Works on desktop, tablet, and mobile
- **🔒 Secure Authentication**: Google OAuth with role-based permissions
- **📦 Import/Export**: Data portability with JSON import/export
- **⚡ Offline Support**: Local storage with sync capabilities
- **🛡️ Safety Limits**: Built-in resource limits and usage monitoring

## 🔐 Security Features

- ✅ Google OAuth authentication only
- ✅ Baby ownership validation on all operations
- ✅ Role-based permissions (OWNER, EDITOR, VIEWER)
- ✅ Comprehensive input validation
- ✅ Security headers and middleware
- ✅ Admin access controls
- ✅ Resource usage limits

## 🛠️ Tech Stack

- **Framework**: Next.js 13+ (App Router)
- **Database**: SQLite (dev) / PostgreSQL (production)
- **ORM**: Prisma
- **Authentication**: NextAuth.js with Google OAuth
- **Styling**: Tailwind CSS
- **UI Components**: Custom components with Radix UI primitives

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Google Cloud Console account (for OAuth)

## 🏃‍♂️ Quick Start

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd baby-tracker-web
npm install
```

### 2. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your values
# IMPORTANT: Set up Google OAuth credentials (see below)
```

### 3. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable Google+ API
4. Go to Credentials > Create Credentials > OAuth 2.0 Client IDs
5. Set authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://your-domain.com/api/auth/callback/google` (production)
6. Copy Client ID and Client Secret to your `.env` file

### 4. Database Setup

```bash
# Generate Prisma client and set up database
npx prisma generate
npx prisma db push

# Optional: Seed with sample data
npm run seed
```

### 5. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) and sign in with Google!

## 🚀 Deployment

### Vercel (Recommended)

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Deploy to Vercel**:
   - Connect your GitHub repository to Vercel
   - Set environment variables in Vercel dashboard
   - Deploy automatically

3. **Environment Variables for Production**:
   ```bash
   NEXTAUTH_SECRET=your-secure-secret
   NEXTAUTH_URL=https://your-domain.vercel.app
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   DATABASE_URL=your-production-db-url
   ADMIN_EMAILS=your-admin-email@gmail.com
   ```

### Other Platforms

The app can be deployed to any platform supporting Node.js:
- Railway
- Render
- Digital Ocean App Platform
- AWS Amplify
- Google Cloud Run

## 📚 API Documentation

### Authentication Required
All API endpoints require Google OAuth authentication except `/api/auth/*`.

### Core Endpoints

- `GET /api/user/babies` - Get user's babies
- `POST /api/babies` - Create new baby
- `GET /api/activities?babyId=X` - Get activities for baby
- `POST /api/activities` - Create new activity
- `POST /api/import?babyId=X` - Import activity data
- `GET /api/export?babyId=X` - Export activity data

### Admin Endpoints

- `GET /api/admin/limits` - View system usage (admin only)

## 🛡️ Security

This application follows security best practices:

- **No hardcoded credentials**: All secrets in environment variables
- **Ownership validation**: Users can only access their own babies
- **Input validation**: All user inputs are validated
- **SQL injection prevention**: Prisma ORM with parameterized queries
- **Resource limits**: Built-in usage limits to prevent abuse

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

- **Documentation**: Check the `/docs` folder
- **Issues**: Create a GitHub issue
- **Security**: Report security issues privately

## 🔄 Database Migrations

```bash
# Create a new migration
npx prisma migrate dev --name description

# Apply migrations to production
npx prisma migrate deploy

# Reset database (development only)
npx prisma migrate reset
```

## 📊 Monitoring

The app includes built-in usage monitoring:
- Activity limits per baby
- User account limits  
- Daily activity restrictions
- Admin dashboard for system overview

Access admin features by signing in with an email listed in `ADMIN_EMAILS`.

---

**Built with ❤️ for parents everywhere** 👶