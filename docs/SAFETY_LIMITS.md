# Safety Limits and Resource Management

This document explains the safety restrictions implemented in the Baby Tracker application to prevent abuse and manage costs.

## Overview

The application implements several configurable limits to:
- Prevent abuse and spam
- Control database growth
- Manage hosting costs
- Ensure fair resource usage

## Configured Limits

### 1. Maximum Accounts (Default: 100)
**Environment Variable:** `MAX_ACCOUNTS`
**Purpose:** Limits the total number of registered users
**Enforcement:** Checked during OAuth sign-in process
**Error Message:** Account creation is denied when limit is reached

### 2. Maximum Babies per User (Default: 3)
**Environment Variable:** `MAX_BABIES_PER_USER`
**Purpose:** Limits how many babies each user can create
**Enforcement:** Checked in `/api/babies` POST endpoint
**Error Message:** "Maximum number of babies reached. You can create up to 3 babies per account."

### 3. Maximum Shared Users per Baby (Default: 5)
**Environment Variable:** `MAX_SHARED_USERS_PER_BABY`
**Purpose:** Limits how many users can access each baby (excluding owner)
**Enforcement:** Checked in `/api/babies/share` POST endpoint
**Error Message:** "Maximum number of shared users reached. You can share with up to 5 users per baby."

### 4. Maximum Activities per Day (Default: 50)
**Environment Variable:** `MAX_ACTIVITIES_PER_DAY`
**Purpose:** Limits daily activity creation to prevent spam
**Enforcement:** Checked in `/api/activities` POST endpoint
**Error Message:** "Daily activity limit reached. Maximum 50 activities per day per baby."

### 5. Maximum Total Activities per Baby (Default: 10,000)
**Environment Variable:** `MAX_TOTAL_ACTIVITIES_PER_BABY`
**Purpose:** Limits total lifetime activities per baby
**Enforcement:** Checked in `/api/activities` POST endpoint
**Error Message:** "Total activity limit reached. Maximum 10,000 activities per baby."

## Storage Estimates (At Maximum Capacity)

With the default limits, maximum storage usage would be:

### Data Breakdown
- **Users:** 100 records → ~49 KB
- **Babies:** 300 records → ~234 KB  
- **Baby Access:** 1,800 records → ~352 KB
- **Activities:** 3,000,000 records → ~3.35 GB

### Total Storage
- **Raw Data:** ~3.35 GB
- **With Database Overhead (30%):** ~4.36 GB
- **Per User Average:** ~44.64 MB

### Cost Estimates
- **Turso (SQLite):** ~$25/month (covers up to 8GB)
- **PostgreSQL (AWS):** ~$30-50/month
- **MongoDB Atlas:** ~$57/month
- **Per User Cost:** ~$0.15/month

## Configuration for Different Environments

### Development
```env
MAX_ACCOUNTS=100
MAX_BABIES_PER_USER=3
MAX_SHARED_USERS_PER_BABY=5
MAX_ACTIVITIES_PER_DAY=50
MAX_TOTAL_ACTIVITIES_PER_BABY=10000
```

### Production (Conservative)
```env
MAX_ACCOUNTS=50
MAX_BABIES_PER_USER=2
MAX_SHARED_USERS_PER_BABY=3
MAX_ACTIVITIES_PER_DAY=30
MAX_TOTAL_ACTIVITIES_PER_BABY=5000
```

### Production (Generous)
```env
MAX_ACCOUNTS=500
MAX_BABIES_PER_USER=5
MAX_SHARED_USERS_PER_BABY=10
MAX_ACTIVITIES_PER_DAY=100
MAX_TOTAL_ACTIVITIES_PER_BABY=25000
```

## Vercel Deployment Configuration

When deploying to Vercel, set these environment variables in your Vercel dashboard:

1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add each limit variable with your desired values
4. Redeploy the application

## Monitoring and Alerts

### Admin Endpoint
Access `/api/admin/limits` to view current usage and limits (requires admin email).

### Storage Calculator
Run `node scripts/storage-calculator.js` to see projected storage usage.

### Recommended Monitoring
- Set up alerts when reaching 80% of any limit
- Monitor daily activity creation patterns
- Track storage growth over time
- Review user registration patterns

## Recommendations

### For Small Scale (< 50 users)
- Keep default limits
- Monitor storage monthly
- Consider archiving old activities after 2-3 years

### For Medium Scale (50-200 users)
- Increase `MAX_ACCOUNTS` to 200
- Increase `MAX_TOTAL_ACTIVITIES_PER_BABY` to 15,000
- Implement automated activity archiving
- Set up storage monitoring alerts

### For Large Scale (> 200 users)
- Consider implementing activity archiving
- Use time-based data cleanup (archive activities > 5 years old)
- Implement usage analytics
- Consider paid tiers with different limits

## Security Considerations

1. **Rate Limiting:** These limits complement rate limiting - not replace it
2. **Validation:** All limits are enforced server-side and cannot be bypassed
3. **Admin Override:** Limits can only be changed via environment variables
4. **Audit Logging:** Consider logging when users hit limits for abuse detection

## Implementation Details

The limits are implemented in `/lib/config.js` and enforced in:
- `/lib/auth.js` - Account creation limits
- `/app/api/babies/route.js` - Baby creation limits  
- `/app/api/babies/share/route.js` - Sharing limits
- `/app/api/activities/route.js` - Activity creation limits

All functions return appropriate HTTP status codes and error messages when limits are exceeded.