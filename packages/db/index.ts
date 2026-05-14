/**
 * Shared Prisma Client Singleton
 *
 * This module exports a singleton PrismaClient instance that can be used
 * across all services in the monorepo (client API server, worker, etc.).
 * Each Node.js process gets its own PrismaClient instance — they are NOT shared.
 */

import prismaClientPkg from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { existsSync } from 'node:fs'
import { dirname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const { Pool } = pg
const { PrismaClient: PrismaClientCtor } = prismaClientPkg
type PrismaClient = InstanceType<typeof PrismaClientCtor>

const currentDir = dirname(fileURLToPath(import.meta.url))

function loadEnvIfNeeded(): void {
  if (process.env.DATABASE_URL || process.env.WORKER_DATABASE_URL) {
    return
  }

  if (typeof process.loadEnvFile !== 'function') {
    return
  }

  const repoRoot = currentDir.endsWith(`${sep}dist`)
    ? resolve(currentDir, '..', '..', '..')
    : resolve(currentDir, '..', '..')

  const candidates = [
    resolve(repoRoot, '.env'),
    resolve(repoRoot, '.env.local'),
    resolve(repoRoot, 'apps/worker/.env'),
    resolve(repoRoot, 'apps/worker/.env.local'),
  ]

  for (const file of candidates) {
    if (existsSync(file)) {
      process.loadEnvFile(file)
      if (process.env.DATABASE_URL || process.env.WORKER_DATABASE_URL) {
        return
      }
    }
  }
}
// Global reference to prevent multiple instances in development (hot reload)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  prismaWorker: PrismaClient | undefined
  prismaAdmin: PrismaClient | undefined
}

loadEnvIfNeeded()

/**
 * Default client — use this in the Nuxt server (client/app/server/)
 */
export function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL ?? process.env.WORKER_DATABASE_URL

  if (!connectionString) {
    throw new Error(
      'DATABASE_URL or WORKER_DATABASE_URL is not set. ' +
      'Please configure your database connection in environment variables or .env'
    )
  }

  const pool = new Pool({ connectionString })
  const adapter = new PrismaPg(pool)

  return new PrismaClientCtor({
    adapter,
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error'],
  })
}

/**
 * Worker client — use this for worker-specific DB reads
 * Can use a separate connection string (e.g., read replica)
 */
export function createWorkerPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL ?? process.env.WORKER_DATABASE_URL

  if (!connectionString) {
    throw new Error(
      'WORKER_DATABASE_URL or DATABASE_URL is not set.'
    )
  }

  const pool = new Pool({ connectionString })
  const adapter = new PrismaPg(pool)

  return new PrismaClientCtor({
    adapter,
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error'],
  })
}

// ─── Named exports ────────────────────────────────────────────────────────────

/**
 * Default prisma client for API server
 * In development, survives HMR via global singleton
 */
export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

/**
 * Worker prisma client
 * In development, survives HMR via global singleton
 */
export const prismaWorker = globalForPrisma.prismaWorker ?? createWorkerPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prismaWorker = prismaWorker
}

// ─── Re-export types ──────────────────────────────────────────────────────────
export type {
  Role,
  User,
  Account,
  VerificationToken,
  PasswordResetToken,
  AuditLog,
  Subscription,
  CreditLog,
  TopUpTransaction,
  Campaign,
  CampaignGeoTarget,
  BehaviorProfile,
  ProxyPool,
  ProxyLog,
  Fingerprint,
  WorkerNode,
  WorkerLog,
  BrowserSession,
  AnalyticsEvent,
  TrafficLog,
  QueueJob,
  Integration,
  SystemLog,
  GeoTarget,
  Setting,
  UserRole,
  IntegrationType,
  CampaignStatus,
  GeoMode,
  DeviceType,
  SessionMode,
  SpeedMode,
  ProxyType,
  ProxyStatus,
  SessionStatus,
  WorkerStatus,
  SubscriptionPlan,
  CreditType,
  TransactionStatus,
  JobStatus,
  BrowserEngine,
} from '@prisma/client'

// ─── Graceful shutdown ─────────────────────────────────────────────────────────

/**
 * Call this during process shutdown (SIGTERM, SIGINT)
 * Usage: `process.on('SIGTERM', () => prisma.$disconnect())`
 */
export async function disconnect(): Promise<void> {
  await prisma.$disconnect()
  if (globalForPrisma.prismaWorker) {
    await globalForPrisma.prismaWorker.$disconnect()
  }
}
