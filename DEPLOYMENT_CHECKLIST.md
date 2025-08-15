# 🚀 Deployment Checklist

## ✅ Pre-Deployment Security Checklist

### Environment Variables
- [ ] `.env` file is in `.gitignore` (✅ Done)
- [ ] No hardcoded secrets in code (✅ Verified)
- [ ] `.env.example` created for other developers (✅ Done)
- [ ] Google OAuth credentials are ready for production

### Database Security
- [ ] Database files ignored in `.gitignore` (✅ Done)
- [ ] No sensitive data in migrations (✅ Schema only)
- [ ] Production database URL ready

### Code Security
- [ ] All API endpoints require authentication (✅ Verified)
- [ ] Baby ownership validation on all operations (✅ Verified)
- [ ] No hardcoded IDs in components (✅ Fixed)
- [ ] Import/export APIs secured (✅ Fixed)

## 🔧 Deployment Steps

### 1. GitHub Repository Setup

```bash
# Initialize git (if not already done)
git init
git add .
git commit -m "Initial commit: Baby Tracker application"

# Add remote repository
git remote add origin https://github.com/yourusername/baby-tracker-web.git
git branch -M main
git push -u origin main
```

### 2. Vercel Deployment

1. **Connect Repository**:
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Select "baby-tracker-web"

2. **Environment Variables** (Set in Vercel Dashboard):
   ```
   NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>
   NEXTAUTH_URL=https://your-app-name.vercel.app
   GOOGLE_CLIENT_ID=<your-google-client-id>
   GOOGLE_CLIENT_SECRET=<your-google-client-secret>
   DATABASE_URL=<your-production-database-url>
   ADMIN_EMAILS=manybobo@gmail.com
   MAX_ACCOUNTS=500
   MAX_BABIES_PER_USER=10
   MAX_SHARED_USERS_PER_BABY=10
   MAX_ACTIVITIES_PER_DAY=200
   MAX_TOTAL_ACTIVITIES_PER_BABY=90000
   ```

3. **Deploy**:
   - Click "Deploy"
   - Wait for build to complete
   - Test the deployed application

### 3. Google OAuth Configuration for Production

1. **Update OAuth Settings**:
   - Go to Google Cloud Console
   - Add production URL to authorized redirect URIs:
     `https://your-app-name.vercel.app/api/auth/callback/google`

2. **Test Authentication**:
   - Visit your deployed app
   - Try signing in with Google
   - Verify all functionality works

### 4. Database Setup (Production)

For production, you have several options:

#### Option A: Turso (SQLite-compatible, Vercel-friendly)
```bash
# Environment variables for Turso
DATABASE_URL="libsql://[database-name]-[org].turso.io"
DATABASE_AUTH_TOKEN="your-turso-auth-token"
```

#### Option B: Railway PostgreSQL
```bash
# Environment variables for Railway
DATABASE_URL="postgresql://user:password@host:port/database"
```

#### Option C: PlanetScale MySQL
```bash
# Environment variables for PlanetScale
DATABASE_URL="mysql://user:password@host:port/database?sslaccept=strict"
```

### 5. Post-Deployment Verification

- [ ] **Authentication**: Sign in with Google works
- [ ] **Baby Creation**: Can create and manage babies
- [ ] **Activity Tracking**: Can add activities
- [ ] **Import/Export**: Data import/export functions correctly
- [ ] **Permissions**: Sharing and role permissions work
- [ ] **Admin Access**: Admin dashboard accessible (with admin email)
- [ ] **Mobile Responsive**: Test on mobile devices
- [ ] **Security Headers**: Verify security headers are active

### 6. Monitoring Setup

- [ ] Set up Vercel analytics
- [ ] Monitor error logs
- [ ] Set up alerts for critical issues
- [ ] Monitor database usage and limits

## 🔐 Security Best Practices

### Production Environment
- ✅ Use strong, unique `NEXTAUTH_SECRET`
- ✅ Enable HTTPS only (automatic with Vercel)
- ✅ Set appropriate CORS origins
- ✅ Monitor for unusual activity
- ✅ Regular security updates

### Data Protection
- ✅ Regular database backups
- ✅ Data retention policies
- ✅ User data export capabilities
- ✅ GDPR compliance considerations

## 🚨 Emergency Procedures

### If Security Issue Discovered
1. **Immediate**: Disable deployment if critical
2. **Fix**: Address the security issue
3. **Deploy**: Push fix to production
4. **Notify**: Inform users if data affected
5. **Monitor**: Watch for continued issues

### If Database Issues
1. **Backup**: Ensure recent backup exists
2. **Identify**: Determine root cause
3. **Restore**: From backup if necessary
4. **Monitor**: Database health post-recovery

## 📞 Support Contacts

- **Technical Issues**: Create GitHub issue
- **Security Concerns**: Report privately to maintainer
- **Feature Requests**: Submit GitHub issue with enhancement label

---

**Deployment Status**: ⚠️ Ready for deployment after completing checklist