// lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

// Force new PrismaClient instance to pick up newly generated models
export const prisma = globalForPrisma.prisma || new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  // In development, always use a fresh instance to pick up schema changes
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = prisma
  }
}
