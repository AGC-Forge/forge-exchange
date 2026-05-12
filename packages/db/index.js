/**
 * Shared Prisma Client Singleton
 *
 * This module exports a singleton PrismaClient instance that can be used
 * across all services in the monorepo (client API server, worker, etc.).
 * Each Node.js process gets its own PrismaClient instance — they are NOT shared.
 */
import prismaClientPkg from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
const { Pool } = pg;
const { PrismaClient: PrismaClientCtor } = prismaClientPkg;
const currentDir = dirname(fileURLToPath(import.meta.url));
function loadEnvIfNeeded() {
    if (process.env.DATABASE_URL || process.env.WORKER_DATABASE_URL) {
        return;
    }
    if (typeof process.loadEnvFile !== 'function') {
        return;
    }
    const candidates = [
        resolve(currentDir, '../../.env'),
        resolve(currentDir, '../../.env.local'),
        resolve(currentDir, '../../apps/worker/.env'),
        resolve(currentDir, '../../apps/worker/.env.local'),
    ];
    for (const file of candidates) {
        if (existsSync(file)) {
            process.loadEnvFile(file);
            if (process.env.DATABASE_URL || process.env.WORKER_DATABASE_URL) {
                return;
            }
        }
    }
}
// Global reference to prevent multiple instances in development (hot reload)
const globalForPrisma = globalThis;
loadEnvIfNeeded();
/**
 * Default client — use this in the Nuxt server (client/app/server/)
 */
export function createPrismaClient() {
    const connectionString = process.env.DATABASE_URL ?? process.env.WORKER_DATABASE_URL;
    if (!connectionString) {
        throw new Error('DATABASE_URL or WORKER_DATABASE_URL is not set. ' +
            'Please configure your database connection in environment variables or .env');
    }
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    return new PrismaClientCtor({
        adapter,
        log: process.env.NODE_ENV === 'development'
            ? ['query', 'error', 'warn']
            : ['error'],
    });
}
/**
 * Worker client — use this for worker-specific DB reads
 * Can use a separate connection string (e.g., read replica)
 */
export function createWorkerPrismaClient() {
    const connectionString = process.env.DATABASE_URL ?? process.env.WORKER_DATABASE_URL;
    if (!connectionString) {
        throw new Error('WORKER_DATABASE_URL or DATABASE_URL is not set.');
    }
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    return new PrismaClientCtor({
        adapter,
        log: process.env.NODE_ENV === 'development'
            ? ['query', 'error', 'warn']
            : ['error'],
    });
}
// ─── Named exports ────────────────────────────────────────────────────────────
/**
 * Default prisma client for API server
 * In development, survives HMR via global singleton
 */
export const prisma = globalForPrisma.prisma ?? createPrismaClient();
if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}
/**
 * Worker prisma client
 * In development, survives HMR via global singleton
 */
export const prismaWorker = globalForPrisma.prismaWorker ?? createWorkerPrismaClient();
if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prismaWorker = prismaWorker;
}
// ─── Graceful shutdown ─────────────────────────────────────────────────────────
/**
 * Call this during process shutdown (SIGTERM, SIGINT)
 * Usage: `process.on('SIGTERM', () => prisma.$disconnect())`
 */
export async function disconnect() {
    await prisma.$disconnect();
    if (globalForPrisma.prismaWorker) {
        await globalForPrisma.prismaWorker.$disconnect();
    }
}
//# sourceMappingURL=index.js.map