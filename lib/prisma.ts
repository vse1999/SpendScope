import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
}

// Create PostgreSQL connection pool
// SSL is configured via the DATABASE_URL connection string
// For Neon connections, use: sslmode=verify-full (verifies server certificate)
// For local development without SSL, use: sslmode=disable
const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
})

const adapter = new PrismaPg(pool)

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        adapter,
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
