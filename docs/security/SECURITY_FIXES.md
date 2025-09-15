# URGENT SECURITY FIXES REQUIRED

## CRITICAL ISSUES TO FIX BEFORE DEPLOYMENT

### 1. Change NextAuth Secret (CRITICAL)
```env
# .env - CHANGE THIS IMMEDIATELY
NEXTAUTH_SECRET="your-super-secure-random-string-here-at-least-32-chars"
```
Generate a secure secret:
```bash
openssl rand -base64 32
```

### 2. Secure Development Authentication (CRITICAL)
Remove or secure the mock credentials provider:

```javascript
// lib/auth.js - Option 1: Remove completely
// Comment out lines 18-39 (CredentialsProvider)

// lib/auth.js - Option 2: Add password protection
CredentialsProvider({
  id: "mock",
  name: "Mock Login (Dev Only)",
  credentials: {
    email: { label: "Email", type: "email" },
    password: { label: "Password", type: "password" }
  },
  async authorize(credentials) {
    // Add a development password
    if (credentials?.password !== process.env.DEV_PASSWORD) {
      return null;
    }
    if (credentials?.email) {
      return {
        id: credentials.email,
        email: credentials.email,
        name: credentials.email.split('@')[0],
        image: `https://avatar.vercel.sh/${credentials.email}`
      };
    }
    return null;
  }
})
```

### 3. Add Security Middleware (HIGH PRIORITY)
Create `middleware.js` in root:

```javascript
import { withAuth } from "next-auth/middleware"

export default withAuth(
  function middleware(req) {
    // Add security headers
    const response = NextResponse.next()
    
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('Referrer-Policy', 'origin-when-cross-origin')
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
    
    return response
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Protect admin routes
        if (req.nextUrl.pathname.startsWith('/api/admin')) {
          return process.env.ADMIN_EMAILS?.split(',').includes(token?.email) || false
        }
        return !!token
      },
    },
  }
)

export const config = {
  matcher: ['/api/admin/:path*']
}
```

### 4. Enhanced Input Validation (HIGH PRIORITY)
Add validation library and implement:

```bash
npm install joi zod validator
```

Create validation schemas for all API inputs.

### 5. Environment Security (MEDIUM PRIORITY)
```env
# Remove example admin emails
ADMIN_EMAILS=your-real-admin@domain.com

# Add development password
DEV_PASSWORD=your-secure-dev-password-here
```

## DEPLOYMENT CHECKLIST

Before deploying to production:

- [ ] Change NEXTAUTH_SECRET to secure random string
- [ ] Remove or secure mock authentication
- [ ] Set real admin emails in ADMIN_EMAILS
- [ ] Add security middleware
- [ ] Implement input validation
- [ ] Review all error messages
- [ ] Set up HTTPS only
- [ ] Configure CSP headers
- [ ] Enable rate limiting
- [ ] Set up monitoring/alerting

## MONITORING & ALERTS

Set up monitoring for:
- Failed authentication attempts
- API rate limit hits
- Admin endpoint access
- Unusual activity patterns
- Database errors

## SECURITY BEST PRACTICES

1. **Never commit secrets** to git
2. **Use environment-specific configurations**
3. **Implement proper logging** (without sensitive data)
4. **Regular security audits**
5. **Keep dependencies updated**
6. **Use HTTPS everywhere**
7. **Implement CSP headers**
8. **Regular backup and recovery testing**