/**
 * Shared Prisma Client Singleton
 *
 * This module exports a singleton PrismaClient instance that can be used
 * across all services in the monorepo (client API server, worker, etc.).
 * Each Node.js process gets its own PrismaClient instance — they are NOT shared.
 */
import prismaClientPkg from '@prisma/client';
declare const PrismaClientCtor: typeof prismaClientPkg.PrismaClient;
type PrismaClient = InstanceType<typeof PrismaClientCtor>;
/**
 * Default client — use this in the Nuxt server (client/app/server/)
 */
export declare function createPrismaClient(): PrismaClient;
/**
 * Worker client — use this for worker-specific DB reads
 * Can use a separate connection string (e.g., read replica)
 */
export declare function createWorkerPrismaClient(): PrismaClient;
/**
 * Default prisma client for API server
 * In development, survives HMR via global singleton
 */
export declare const prisma: prismaClientPkg.PrismaClient<prismaClientPkg.Prisma.PrismaClientOptions, unknown, import("@prisma/client/runtime/client").InternalArgs>;
/**
 * Worker prisma client
 * In development, survives HMR via global singleton
 */
export declare const prismaWorker: prismaClientPkg.PrismaClient<prismaClientPkg.Prisma.PrismaClientOptions, unknown, import("@prisma/client/runtime/client").InternalArgs>;
export type { Role, User, Account, VerificationToken, PasswordResetToken, AuditLog, Subscription, CreditLog, TopUpTransaction, Campaign, CampaignGeoTarget, BehaviorProfile, ProxyPool, ProxyLog, Fingerprint, WorkerNode, WorkerLog, BrowserSession, AnalyticsEvent, TrafficLog, QueueJob, Integration, SystemLog, GeoTarget, Setting, UserRole, IntegrationType, CampaignStatus, GeoMode, DeviceType, SessionMode, SpeedMode, ProxyType, ProxyStatus, SessionStatus, WorkerStatus, SubscriptionPlan, CreditType, TransactionStatus, JobStatus, BrowserEngine, } from '@prisma/client';
/**
 * Call this during process shutdown (SIGTERM, SIGINT)
 * Usage: `process.on('SIGTERM', () => prisma.$disconnect())`
 */
export declare function disconnect(): Promise<void>;
//# sourceMappingURL=index.d.ts.map