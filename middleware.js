import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    // Add security headers
    const response = NextResponse.next()
    
    // Security headers
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('Referrer-Policy', 'origin-when-cross-origin')
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
    response.headers.set('X-XSS-Protection', '1; mode=block')
    
    // Content Security Policy (basic)
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Next.js requires unsafe-eval
      "style-src 'self' 'unsafe-inline'", // Tailwind requires unsafe-inline
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'none'"
    ].join('; ')
    
    response.headers.set('Content-Security-Policy', csp)
    
    return response
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Protect admin routes - require admin email
        if (req.nextUrl.pathname.startsWith('/api/admin')) {
          const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(email => email.trim()) || []
          return adminEmails.includes(token?.email) || false
        }
        
        // Allow all other requests - individual API routes handle their own auth
        return true
      },
    },
  }
)

export const config = {
  matcher: [
    '/api/admin/:path*'
  ]
}