# 🚀 Deployment Guide: Vercel + Turso

## 📋 Prerequisites

1. **GitHub Account** - Push your code to GitHub
2. **Vercel Account** - Sign up at [vercel.com](https://vercel.com) (free tier)
3. **Turso Account** - Sign up at [turso.tech](https://turso.tech) (free tier)

## 🗄️ Step 1: Set Up Turso Database

### Install Turso CLI
```bash
# Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Authenticate
turso auth login
```

### Create Database
```bash
# Create your database
turso db create baby-tracker

# Get database URL
turso db show baby-tracker --url
# Output: libsql://baby-tracker-[your-org].turso.io

# Create auth token
turso db tokens create baby-tracker
# Output: your-auth-token-here
```

### Seed Database (Optional)
```bash
# Connect to your Turso database
turso db shell baby-tracker

# Run your schema (you can copy from prisma/migrations)
# Or use: turso db shell baby-tracker < schema.sql
```

## 🚀 Step 2: Deploy to Vercel

### 1. Push to GitHub
```bash
git add .
git commit -m "Ready for Vercel + Turso deployment"
git push origin main
```

### 2. Connect to Vercel
1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Choose "Next.js" framework

### 3. Configure Environment Variables
In Vercel dashboard → Settings → Environment Variables, add:

```bash
DATABASE_URL=libsql://baby-tracker-[your-org].turso.io
DATABASE_AUTH_TOKEN=your-auth-token-from-step-1
```

### 4. Deploy
- Vercel will automatically build and deploy
- Your app will be available at `https://your-project.vercel.app`

## 🔧 Step 3: Initialize Database Schema

After deployment, you need to create the database schema:

### Option A: Use Turso CLI
```bash
# Connect to your database
turso db shell baby-tracker

# Create tables (copy from your current schema)
# You can export from your current dev.db or run the migration SQL
```

### Option B: Use Prisma (if configured)
```bash
# In your local project, point to Turso temporarily
DATABASE_URL="libsql://baby-tracker-[your-org].turso.io"
DATABASE_AUTH_TOKEN="your-auth-token"

# Push schema
npx prisma db push

# Seed database (optional)
npm run db:seed
```

## 📊 Verify Deployment

1. **Check app**: Visit your Vercel URL
2. **Test functionality**: Create a baby activity
3. **Check database**: Use Turso CLI or dashboard to verify data

## 💰 Cost Breakdown (Free Tiers)

- **Vercel Free**: 100GB bandwidth, 6,000 build minutes
- **Turso Free**: 8GB storage, 1B row reads/month
- **Total Cost**: $0/month 🎉

## 🔍 Troubleshooting

### Build Errors
```bash
# If Prisma generation fails, check:
- Environment variables are set correctly
- DATABASE_URL format is correct
- Auth token has correct permissions
```

### Database Connection Issues
```bash
# Test connection locally:
turso db shell baby-tracker --url "libsql://..." --auth-token "..."
```

### Check Logs
```bash
# In Vercel dashboard → Functions → View logs
# Or use Vercel CLI:
vercel logs your-deployment-url
```

## 🎯 Next Steps

1. **Custom Domain**: Add your domain in Vercel settings
2. **Authentication**: Add NextAuth.js for user login
3. **Monitoring**: Set up Vercel Analytics
4. **Performance**: Enable Edge Runtime for API routes

## 📚 Resources

- [Turso Documentation](https://docs.turso.tech/)
- [Vercel Documentation](https://vercel.com/docs)
- [Turso + Vercel Integration](https://vercel.com/marketplace/tursocloud)