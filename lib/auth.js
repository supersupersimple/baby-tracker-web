import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma.js";
import GoogleProvider from "next-auth/providers/google";
import { isAccountCreationAllowed } from "./config.js";

export const authConfig = {
  secret: process.env.NEXTAUTH_SECRET,
  adapter: PrismaAdapter(prisma),
  providers: [
    // Google OAuth - primary authentication method
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      },
      // Allow linking Google accounts to existing users with same email
      // This is safe since Google verifies email addresses
      allowDangerousEmailAccountLinking: true
    })
  ],
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      // Critical fix for Safari/iOS: Always redirect to baseUrl to prevent state loss
      console.log(`🔄 Redirect callback - url: ${url}, baseUrl: ${baseUrl}`);
      return baseUrl;
    },
    async signIn({ user }) {
      try {
        console.log(`🔐 Sign-in attempt for: ${user.email}`);
        
        // Check if account creation is allowed (max accounts limit)
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email }
        });
        
        if (existingUser) {
          console.log(`✅ Existing user signing in: ${user.email}`);
          return true;
        }
        
        // New user - check if we can create new accounts
        console.log(`🆕 New user attempting to sign up: ${user.email}`);
        const canCreateAccount = await isAccountCreationAllowed(prisma);
        if (!canCreateAccount) {
          console.log(`❌ Account creation blocked: Max accounts limit reached. Email: ${user.email}`);
          return false; // Deny sign in
        }
        
        console.log(`✅ New user account creation allowed: ${user.email}`);
        return true; // Allow sign in
      } catch (error) {
        console.error(`❌ Error in signIn callback for ${user.email}:`, error);
        return false;
      }
    },
    async session({ session, token }) {
      // Add user ID to session from JWT token
      if (session?.user && token?.uid) {
        session.user.id = token.uid;
      }
      return session;
    },
    async jwt({ user, token }) {
      if (user) {
        token.uid = user.id;
      }
      return token;
    },
  },
  session: {
    strategy: "jwt",
  },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production" 
        ? "__Secure-next-auth.session-token" 
        : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax", // 'lax' works better for Safari than 'none'
        path: "/",
        secure: process.env.NODE_ENV === "production",
      }
    },
    callbackUrl: {
      name: process.env.NODE_ENV === "production" 
        ? "__Secure-next-auth.callback-url" 
        : "next-auth.callback-url",
      options: {
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      }
    },
    csrfToken: {
      name: process.env.NODE_ENV === "production" 
        ? "__Host-next-auth.csrf-token" 
        : "next-auth.csrf-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      }
    },
    pkceCodeVerifier: {
      name: "next-auth.pkce.code_verifier",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 15, // 15 minutes
      }
    },
    state: {
      name: "next-auth.state",
      options: {
        httpOnly: true,
        sameSite: "lax", // Critical for Safari - 'lax' instead of 'none'
        path: "/",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 15, // 15 minutes
      }
    },
    nonce: {
      name: "next-auth.nonce",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 15, // 15 minutes
      }
    }
  },
  events: {
    async createUser({ user }) {
      console.log(`🎉 New user created successfully: ${user.email}`);
    },
    async signIn({ user, isNewUser }) {
      console.log(`🔑 User signed in: ${user.email}, isNewUser: ${isNewUser}`);
    },
    async signOut({ session }) {
      console.log(`👋 User signed out: ${session?.user?.email || 'unknown'}`);
    },
  },
  debug: process.env.NODE_ENV === "development",
};