import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  dbUrl: string | undefined
}

const currentDbUrl = process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL

// Recreate Prisma Client if database URL has changed
if (globalForPrisma.dbUrl !== currentDbUrl) {
  globalForPrisma.prisma = undefined
  globalForPrisma.dbUrl = currentDbUrl
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
