import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma.js";
import GoogleProvider from "next-auth/providers/google";
import { isAccountCreationAllowed } from "./config.js";

export const authConfig = {
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
      }
    })
  ],
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  callbacks: {
    async signIn({ user, account, profile, email, credentials }) {
      // Check if account creation is allowed (max accounts limit)
      const existingUser = await prisma.user.findUnique({
        where: { email: user.email }
      });
      
      // If user doesn't exist, check if we can create new accounts
      if (!existingUser) {
        const canCreateAccount = await isAccountCreationAllowed(prisma);
        if (!canCreateAccount) {
          console.log(`Account creation blocked: Max accounts limit reached. Email: ${user.email}`);
          return false; // Deny sign in
        }
      }
      
      return true; // Allow sign in
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
  events: {
    async createUser({ user }) {
      console.log(`New user created: ${user.email}`);
    },
  },
};