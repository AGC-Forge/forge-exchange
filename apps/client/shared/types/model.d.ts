import type {
  User,
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
  UserRole,
} from "@prisma/client";

declare global {
  type Permission =
    | "create_campaign"
    | "delete_campaign"
    | "manage_users"
    | "restart_worker"
    | "system_settings"
    | "billing_access"
    | "view_analytics"
    | "manage_proxies"
    | "view_admin_dashboard"
    | "manage_integrations";

  const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
    user: [
      "create_campaign",
      "delete_campaign",
      "billing_access",
      "view_analytics",
      "manage_proxies",
      "manage_integrations",
    ],
    moderator: [
      "create_campaign",
      "delete_campaign",
      "manage_users",
      "restart_worker",
      "view_analytics",
      "manage_proxies",
      "view_admin_dashboard",
    ],
    admin: [
      "create_campaign",
      "delete_campaign",
      "manage_users",
      "restart_worker",
      "system_settings",
      "billing_access",
      "view_analytics",
      "manage_proxies",
      "view_admin_dashboard",
      "manage_integrations",
    ],
    superadmin: [
      "create_campaign",
      "delete_campaign",
      "manage_users",
      "restart_worker",
      "system_settings",
      "billing_access",
      "view_analytics",
      "manage_proxies",
      "view_admin_dashboard",
      "manage_integrations",
    ],
  };
  const ROLE_LEVEL: Record<UserRole, number> = {
    user: 3,
    moderator: 2,
    admin: 1,
    superadmin: 0,
  };

  const hasPermission = (role: UserRole, perm: Permission) =>
    ROLE_PERMISSIONS[role]?.includes(perm) ?? false;

  const hasMinRole = (role: UserRole, min: UserRole) =>
    ROLE_LEVEL[role] >= ROLE_LEVEL[min];

  type UserModel = User & {
    subscription?: Subscription | null;
    campaigns?: Campaign[];
    proxyPools?: ProxyPool[];
    fingerprints?: Fingerprint[];
    integrations?: Integration[];
    creditLogs?: CreditLog[];
    topUpTransactions?: TopUpTransaction[];
    sessions?: BrowserSession[];
    systemLogs?: SystemLog[];
    auditLogs?: AuditLog[];
  };
  type AuditLogModel = AuditLog & {
    user?: User | null;
  };
  type SubscriptionModel = Subscription & {
    user?: User | null;
  };
  type CreditLogModel = CreditLog & {
    user?: User | null;
  };
  type TopUpTransactionModel = TopUpTransaction & {
    user?: User | null;
  };
  type BehaviorProfileModel = BehaviorProfile & {
    campaigns?: Campaign[];
  };
  type CampaignModel = Campaign & {
    user?: User | null;
    behaviorProfile?: BehaviorProfile | null;
    geoTargets?: Partial<GeoTarget>[];
    sessions?: Partial<BrowserSession>[];
    analyticsEvents?: Partial<AnalyticsEvent>[];
    trafficLogs?: Partial<TrafficLog>[];
    queueJobs?: Partial<QueueJob>[];
  };
  type CampaignGeoTargetModel = CampaignGeoTarget & {
    campaign: Campaign;
    geoTarget?: GeoTarget | null;
  };
  type ProxyPoolModel = ProxyPool & {
    user?: User | null;
    geoTargets?: GeoTarget[];
    sessions?: BrowserSession[];
    proxyLogs?: ProxyLog[];
  };
  type ProxyLogModel = ProxyLog & {
    proxy?: ProxyPool | null;
  };
  type FingerprintModel = Fingerprint & {
    user?: User | null;
    sessions?: BrowserSession[];
  };
  type WorkerNodeModel = WorkerNode & {
    sessions?: BrowserSession[];
    workerLogs?: WorkerLog[];
    queueJobs?: QueueJob[];
  };
  type WorkerLogModel = WorkerLog & {
    worker?: WorkerNode | null;
  };
  type BrowserSessionModel = BrowserSession & {
    user?: User | null;
    campaign?: Campaign | null;
    proxy?: ProxyPool | null;
    fingerprint?: Fingerprint | null;
    worker?: WorkerNode | null;
    analyticsEvents?: AnalyticsEvent[];
  };
  type AnalyticsEventModel = AnalyticsEvent & {
    session?: BrowserSession | null;
    campaign?: Campaign | null;
  };
  type TrafficLogModel = TrafficLog & {
    campaign?: Campaign | null;
  };
  type QueueJobModel = QueueJob & {
    campaign?: Campaign | null;
    worker?: WorkerNode | null;
  };
  type IntegrationModel = Integration & {
    user?: User | null;
  };
  type SystemLogModel = SystemLog & {
    user?: User | null;
  };
  type GeoTargetModel = GeoTarget;

  type CampaignStatus =
    | "draft"
    | "queued"
    | "running"
    | "paused"
    | "completed"
    | "failed"
    | "cancelled";

  type DeviceType = "desktop" | "mobile" | "tablet" | "random";
  type SpeedMode = "slow" | "normal" | "fast";
  type GeoMode = "single" | "multiple" | "weighted" | "dynamic";

  interface GeoTarget {
    country: string;
    weight: number;
    proxyPoolId?: string | null;
  }
}

export {};
