import type { NavigationMenuItem } from "@nuxt/ui";
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
} from "@forge-exchange/db";

declare global {
  interface Window {
    dataLayer: any[];
    fbq: any;
    ttq: any;
    ethereum?: {
      isMetaMask?: true;
      request: (...args: any[]) => Promise<void>;
      on: (eventName: string, callback: (...args: any[]) => void) => void;
      removeListener: (
        eventName: string,
        callback: (...args: any[]) => void,
      ) => void;
    };
  }

  interface ApiMeta {
    total: number;
    page: number;
    limit: number;
    offset: number;
    totalPages: number;
    has_more: boolean;
  }

  interface ApiError {
    code: string;
    message?: string;
    redirect_url?: string;
    details?: any;
    fieldErrors?: Record<string, string[]>;
    retryable?: boolean;
    timestamp?: string;
  }

  interface ApiResponse<T = any, M extends Record<string, any> = ApiMeta> {
    status: number;
    success: boolean;
    message: string;
    data?: T | null;
    error?: ApiError;
    meta?: M;
    headers?: Record<string, string>;
  }

  type FieldErrors = Record<string, string[]>;

  interface ApiErrorOptions {
    code: string;
    message?: string;
    statusCode?: number;
    redirectUrl?: string;
    details?: any;
    fieldErrors?: FieldErrors;
    retryable?: boolean;
  }

  type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  // ============================================================
  // MODEL TYPES
  // ============================================================

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

  interface SettingResult<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
    fieldErrors?: Record<string, string[]>;
  }
  type SettingRow = Pick<SettingConfig, "key" | "value"> & {
    updated_at?: Date;
  };
  interface SettingConfig {
    site_name: string;
    site_description: string;
    site_keywords: string;
    site_icon: string;
    site_logo: string;
    site_favicon: string;
    site_theme: string;
    is_maintenance: boolean;
    enable_register: boolean;
    enable_github_provider: boolean;
    enable_google_provider: boolean;
    max_upload_size_mb: number;
    max_upload_image_mb: number;
    max_upload_video_mb: number;
    max_upload_audio_mb: number;
    max_upload_document_mb: number;
    max_upload_code_mb: number;
    max_upload_archive_mb: number;
  }

  type PublicSettings = {
    site_name: string;
    site_description: string;
    site_keywords: string;
    site_icon: string;
    site_logo: string;
    site_favicon: string;
    site_theme: string;
    is_maintenance: boolean;
    enable_register: boolean;
    enable_github_provider: boolean;
    enable_google_provider: boolean;
    max_upload_size_mb: number;
    max_upload_image_mb: number;
    max_upload_video_mb: number;
    max_upload_audio_mb: number;
    max_upload_document_mb: number;
    max_upload_code_mb: number;
    max_upload_archive_mb: number;
  };

  type SettingsGroupMap = Record<string, Record<string, string>>;

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
  // ============================================================
  // DTO INPUT TYPES
  // ============================================================
  interface UploadResult {
    url: string;
    public_id: string;
    width: number;
    height: number;
    format: string;
    bytes: number;
  }
  interface PostgresRangeDate {
    start: string;
    end: string;
  }

  type AllowedMimeType =
    // Image
    | "image/jpeg"
    | "image/png"
    | "image/gif"
    | "image/webp"
    | "image/svg+xml"
    // Video
    | "video/mp4"
    | "video/webm"
    | "video/quicktime"
    // Audio
    | "audio/mpeg"
    | "audio/wav"
    | "audio/ogg"
    // Document
    | "application/pdf"
    | "application/msword"
    | "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    | "text/plain"
    | "text/markdown"
    // Code
    | "text/html"
    | "text/css"
    | "text/javascript"
    | "application/json"
    | "application/yaml"
    | "text/x-python"
    | "text/x-typescript";

  type MediaType =
    | "IMAGE"
    | "VIDEO"
    | "AUDIO"
    | "DOCUMENT"
    | "CODE"
    | "ARCHIVE"
    | "OTHER";

  interface CountryItem {
    name: string;
    code: string;
    emoji: string;
    unicode: string;
    image: string;
    dial_code: string;
    minLength?: number;
    maxLength?: number;
  }
  interface AppNavigationMenuItem extends NavigationMenuItem {
    role?: string[];
  }

  const QUEUE_NAMES = {
    CAMPAIGN: "campaign_queue",
    SESSION: "session_queue",
    PROXY: "proxy_rotation_queue",
    ANALYTICS: "analytics_queue",
    BEHAVIOR: "behavior_queue",
    HEALTH: "health_queue",
    RETRY: "retry_queue",
  } as const;

  type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

  interface CampaignJobPayload {
    campaignId: string;
    userId: string;
    targetUrl: string;
    proxyPoolId?: string;
    fingerprintId?: string;
    deviceType: string;
    speedMode: string;
    minDuration: number;
    maxDuration: number;
    behaviorProfileId?: string;
    creditsPerSession: number;
    geoTargets: Array<{
      country: string;
      weight: number;
      proxyPoolId?: string;
    }>;
    customClickTargets?: Array<{
      selector: string;
      clickRate: number;
      waitBefore: number;
      waitAfter: number;
      description?: string;
    }>;
  }

  interface SessionJobPayload {
    sessionId: string;
    campaignId: string;
    userId: string;
    workerId?: string;
    proxyId?: string;
    fingerprintId?: string;
    targetUrl: string;
  }
  interface ProxyRotationPayload {
    proxyId: string;
    campaignId?: string;
    reason: "scheduled" | "blocked" | "error";
  }
  interface AnalyticsJobPayload {
    sessionId: string;
    campaignId: string;
    userId: string;
    eventType: string;
    data: Record<string, any>;
  }
  interface CreditEstimate {
    base: number; // 1 standard session
    proxy: number; // +2 residential / +5 mobile
    geo: number; // +1 GEO targeting
    stealth: number; // +1 advanced stealth
    persistence: number; // +1 session persistence
    total: number;
  }

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
  interface RealtimeState {
    connected: boolean
    activeSessions: number
    onlineWorkers: number
    queueSize: number
    campaignStats: Record<string, any>
    workerStats: Record<string, any>[]
    proxyHealth: Record<string, any>[]
  }
  interface ProxyTestResult {
    success: boolean
    responseTime: number
    ipReturned?: string
    error?: string
    isBlacklisted?: boolean
  }
  interface ProxyItem {
    id: string
    name: string | null
    type: string
    host: string
    port: number
    username: string | null
    country: string | null
    isShared: boolean
    status: 'active' | 'inactive' | 'testing' | 'banned' | 'error'
    lastTestedAt: string | null
    responseTimeMs: number | null
    successRate: number | null
    uptime: number | null
    blockRate: number | null
    isBlacklisted: boolean
    createdAt: string
  }
  interface ProxyStats {
    active: number
    total: number
  }
  interface CampaignAnalytics {
    campaign: {
      id: string; name: string; targetUrl: string
      status: string; totalSessions: number
      successCount: number; failCount: number
      todayCount: number; dailyLimit: number
      createdAt: string; startedAt: string | null
    }
    period: string
    metrics: {
      totalSessions: number
      successSessions: number
      failedSessions: number
      successRate: number
      bounceRate: number
      avgDuration: number
    }
    charts: {
      hourly: { label: string; value: number }[]
      daily: { date: string; total: number; success: number }[]
    }
    breakdown: {
      geo: { country: string; count: number; pct: number }[]
      devices: { device: string; count: number; pct: number }[]
      browsers: { browser: string; count: number; pct: number }[]
    }
  }
  interface GlobalAnalytics {
    totalSessions: number
    todaySessions: number
    activeCampaigns: number
    successRate: number
    activeProxies: number
    geoStats: { country: string; count: number; pct: number }[]
    hourly: { label: string; value: number }[]
  }
  interface GeoResult {
    period: string
    countries: { country: string; count: number; pct: number, avgDuration: number }[]
    cities: { city: string; count }[]
    isps: { isp: string; count: number }[]
  }
  interface BillingSubscription {
    id: string
    plan: string
    creditLimit: number
    creditBalance: number
    creditUsed: number
    creditUsedToday: number
    isActive: boolean
    startedAt: string
    expiredAt: string | null
  }
  interface CreditLogItem {
    id: string
    amount: number
    type: 'debit' | 'credit' | 'refund' | 'bonus'
    source: string
    description: string | null
    balanceBefore: number
    balanceAfter: number
    createdAt: string
  }
  interface TopUpTransaction {
    id: string
    amountIdr: number
    creditsPurchased: number
    gateway: string
    status: string
    paidAt: string | null
    expiredAt: string | null
    createdAt: string
  }
  interface SubscriptionPlan {
    id: string
    name: string
    price: number
    color: string
    features: string[]
    period: string
    credits: number
    popular?: boolean
  }
  interface CreditPackage {
    id: string
    label: string
    priceIdr: number
    credits: number
    bonus: number
  }
}

export { };
