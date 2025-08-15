import { PrismaClient } from '@prisma/client';

// Global is used here to prevent multiple instances of PrismaClient in development
const globalForPrisma = global;

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;