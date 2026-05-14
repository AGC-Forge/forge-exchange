import { PrismaPg } from "@prisma/adapter-pg";
import { hash, compare } from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { PrismaClient, type UserRole } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

function loadEnvFile(filePath: string) {
  try {
    if (!fs.existsSync(filePath)) return;
    const raw = fs.readFileSync(filePath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx <= 0) continue;
      const key = trimmed.slice(0, idx).trim();
      let value = trimmed.slice(idx + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  } catch { }
}

const repoRoot = path.resolve(process.cwd(), "..", "..");
loadEnvFile(path.join(repoRoot, ".env"));
loadEnvFile(path.join(process.cwd(), ".env"));

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Starting seed...");

  console.log("📋 Creating roles...");
  const roles = [
    { name: "superadmin", level: 0 },
    { name: "admin", level: 1 },
    { name: "moderator", level: 2 },
    { name: "user", level: 3 },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: {
        role_name_level_unique: {
          name: role.name as UserRole,
          level: role.level,
        },
      },
      update: {},
      create: {
        name: role.name as UserRole,
        level: role.level,
      },
    });
    console.log(`  ✅ Role: ${role.name} (level ${role.level})`);
  }

  // ── GEO Targets ─────────────────────────────────────────────
  console.log("  → Seeding geo targets...");
  const geoData = [
    {
      countryCode: "US",
      countryName: "United States",
      region: "North America",
    },
    { countryCode: "GB", countryName: "United Kingdom", region: "Europe" },
    { countryCode: "DE", countryName: "Germany", region: "Europe" },
    { countryCode: "FR", countryName: "France", region: "Europe" },
    { countryCode: "JP", countryName: "Japan", region: "Asia" },
    { countryCode: "SG", countryName: "Singapore", region: "Asia" },
    { countryCode: "ID", countryName: "Indonesia", region: "Asia" },
    { countryCode: "PH", countryName: "Philippines", region: "Asia" },
    { countryCode: "VN", countryName: "Vietnam", region: "Asia" },
    { countryCode: "MY", countryName: "Malaysia", region: "Asia" },
    { countryCode: "TH", countryName: "Thailand", region: "Asia" },
    { countryCode: "NG", countryName: "Nigeria", region: "Africa" },
    { countryCode: "EG", countryName: "Egypt", region: "Africa" },
    { countryCode: "AR", countryName: "Argentina", region: "South America" },
    { countryCode: "CL", countryName: "Chile", region: "South America" },
    { countryCode: "PE", countryName: "Peru", region: "South America" },
    { countryCode: "CO", countryName: "Colombia", region: "South America" },
    { countryCode: "VE", countryName: "Venezuela", region: "South America" },
    { countryCode: "EC", countryName: "Ecuador", region: "South America" },
    { countryCode: "PY", countryName: "Paraguay", region: "South America" },
    { countryCode: "UY", countryName: "Uruguay", region: "South America" },
    { countryCode: "BO", countryName: "Bolivia", region: "South America" },
    {
      countryCode: "GF",
      countryName: "French Guiana",
      region: "South America",
    },
    { countryCode: "SR", countryName: "Suriname", region: "South America" },
    { countryCode: "GY", countryName: "Guyana", region: "South America" },
    { countryCode: "AU", countryName: "Australia", region: "Oceania" },
    { countryCode: "NZ", countryName: "New Zealand", region: "Oceania" },
    { countryCode: "CA", countryName: "Canada", region: "North America" },
    { countryCode: "BR", countryName: "Brazil", region: "South America" },
    { countryCode: "MX", countryName: "Mexico", region: "North America" },
    { countryCode: "RU", countryName: "Russia", region: "Europe/Asia" },
    { countryCode: "IN", countryName: "India", region: "Asia" },
    { countryCode: "NL", countryName: "Netherlands", region: "Europe" },
    { countryCode: "SE", countryName: "Sweden", region: "Europe" },
    { countryCode: "CH", countryName: "Switzerland", region: "Europe" },
    { countryCode: "ZA", countryName: "South Africa", region: "Africa" },
    { countryCode: "KR", countryName: "South Korea", region: "Asia" },
    { countryCode: "ES", countryName: "Spain", region: "Europe" },
    { countryCode: "IT", countryName: "Italy", region: "Europe" },
    { countryCode: "NO", countryName: "Norway", region: "Europe" },
    { countryCode: "DK", countryName: "Denmark", region: "Europe" },
    { countryCode: "FI", countryName: "Finland", region: "Europe" },
    { countryCode: "BE", countryName: "Belgium", region: "Europe" },
    { countryCode: "AT", countryName: "Austria", region: "Europe" },
    { countryCode: "IE", countryName: "Ireland", region: "Europe" },
    { countryCode: "NZ", countryName: "New Zealand", region: "Oceania" },
    { countryCode: "PL", countryName: "Poland", region: "Europe" },
    { countryCode: "PT", countryName: "Portugal", region: "Europe" },
    { countryCode: "GR", countryName: "Greece", region: "Europe" },
    { countryCode: "HU", countryName: "Hungary", region: "Europe" },
    { countryCode: "CZ", countryName: "Czech Republic", region: "Europe" },
    { countryCode: "RO", countryName: "Romania", region: "Europe" },
    { countryCode: "BG", countryName: "Bulgaria", region: "Europe" },
    { countryCode: "HR", countryName: "Croatia", region: "Europe" },
    { countryCode: "SI", countryName: "Slovenia", region: "Europe" },
    { countryCode: "SK", countryName: "Slovakia", region: "Europe" },
    { countryCode: "LT", countryName: "Lithuania", region: "Europe" },
    { countryCode: "LV", countryName: "Latvia", region: "Europe" },
    { countryCode: "EE", countryName: "Estonia", region: "Europe" },
  ];

  for (const geo of geoData) {
    await prisma.geoTarget.upsert({
      where: { countryCode: geo.countryCode },
      update: {},
      create: geo,
    });
  }

  // ── Behavior Profiles ────────────────────────────────────────
  console.log("  → Seeding behavior profiles...");
  const profiles = [
    {
      name: "Default Reader",
      description:
        "Standard reader behavior with natural scroll and mouse movement",
      isDefault: true,
      mouseMovement: true,
      mouseSpeed: "normal",
      scrollEnabled: true,
      scrollDepth: 70,
      internalLinkClick: true,
      linkClickRate: 30,
      idlePauseEnabled: true,
      tabSwitching: false,
      keyboardTyping: false,
      customClickEnabled: false,
      customClickTargets: null,
      customClickOrder: "sequential",
      customClickMaxPerSession: 3,
      readingSpeed: "normal",
      attentionSpan: 60,
    },
    {
      name: "Quick Scanner",
      description: "Fast visitor who scans content briefly",
      isDefault: false,
      mouseMovement: true,
      mouseSpeed: "fast",
      scrollEnabled: true,
      scrollDepth: 30,
      internalLinkClick: false,
      linkClickRate: 10,
      idlePauseEnabled: false,
      tabSwitching: false,
      keyboardTyping: false,
      customClickEnabled: false,
      customClickTargets: null,
      customClickOrder: "sequential",
      customClickMaxPerSession: 1,
      readingSpeed: "fast",
      attentionSpan: 20,
    },
    {
      name: "Deep Engager",
      description: "Highly engaged visitor who reads thoroughly and interacts",
      isDefault: false,
      mouseMovement: true,
      mouseSpeed: "slow",
      scrollEnabled: true,
      scrollDepth: 95,
      internalLinkClick: true,
      linkClickRate: 60,
      idlePauseEnabled: true,
      tabSwitching: true,
      keyboardTyping: true,
      customClickEnabled: true,
      customClickTargets: [
        {
          selector: ".read-more",
          clickRate: 70,
          waitBefore: 2000,
          waitAfter: 1500,
          description: "Read more links",
        },
        {
          selector: "#comments-section",
          clickRate: 40,
          waitBefore: 3000,
          waitAfter: 2000,
          description: "Comments section",
        },
      ],
      customClickOrder: "sequential",
      customClickMaxPerSession: 3,
      readingSpeed: "slow",
      attentionSpan: 90,
    },
    {
      name: "Mobile Casual",
      description: "Mobile-like behavior with touch scrolling patterns",
      isDefault: false,
      mouseMovement: false,
      mouseSpeed: "normal",
      scrollEnabled: true,
      scrollDepth: 50,
      internalLinkClick: true,
      linkClickRate: 20,
      idlePauseEnabled: true,
      tabSwitching: false,
      keyboardTyping: false,
      customClickEnabled: false,
      customClickTargets: null,
      customClickOrder: "sequential",
      customClickMaxPerSession: 2,
      readingSpeed: "normal",
      attentionSpan: 40,
    },
    {
      name: "CTA Clicker",
      description:
        "Visitor that specifically targets call-to-action buttons and custom elements",
      isDefault: false,
      mouseMovement: true,
      mouseSpeed: "normal",
      scrollEnabled: true,
      scrollDepth: 60,
      internalLinkClick: true,
      linkClickRate: 25,
      idlePauseEnabled: true,
      tabSwitching: false,
      keyboardTyping: false,
      customClickEnabled: true,
      customClickTargets: [
        {
          selector: ".btn-primary, .cta-button, [data-cta]",
          clickRate: 90,
          waitBefore: 1500,
          waitAfter: 1000,
          description: "Primary CTA buttons",
        },
        {
          selector: "#subscribe-btn, .subscribe",
          clickRate: 60,
          waitBefore: 2500,
          waitAfter: 2000,
          description: "Subscribe buttons",
        },
        {
          selector: ".pricing-card .btn, .plan-select",
          clickRate: 40,
          waitBefore: 4000,
          waitAfter: 1500,
          description: "Pricing plan buttons",
        },
      ],
      customClickOrder: "random",
      customClickMaxPerSession: 2,
      readingSpeed: "normal",
      attentionSpan: 55,
    },
  ];

  for (const profile of profiles) {
    const existing = await prisma.behaviorProfile.findFirst({
      where: { name: profile.name },
      select: { id: true },
    });
    if (existing) continue;

    await prisma.behaviorProfile.create({
      data: {
        ...profile,
        customClickTargets: (profile.customClickTargets as any) ?? undefined,
      },
    });
  }
  // ── Superadmin User ──────────────────────────────────────────
  console.log("  → Seeding superadmin user...");
  const superadminRole = await prisma.role.findUnique({
    where: { role_name_level_unique: { name: "superadmin", level: 0 } },
  });
  if (!superadminRole) throw new Error("SuperAdmin role not found");

  const superadmin = await prisma.user.upsert({
    where: { email: process.env.ADMIN_EMAIL || "admin@example.com" },
    update: {},
    create: {
      email: process.env.ADMIN_EMAIL || "admin@example.com",
      passwordHash: await hash(process.env.ADMIN_PASSWORD || "change_me_pgadmin", 10),
      name: process.env.ADMIN_NAME || "Administrator",
      role_id: superadminRole.id,
      isActive: true,
      emailVerified: true,
      emailVerifiedAt: new Date(),
      apiKey: randomBytes(32).toString("hex"),
    },
  });

  // ── Subscription for superadmin ──────────────────────────────
  await prisma.subscription.upsert({
    where: { userId: superadmin.id },
    update: {},
    create: {
      userId: superadmin.id,
      plan: "enterprise",
      creditLimit: BigInt(99999999),
      creditBalance: BigInt(99999999),
      creditUsed: BigInt(0),
      isActive: true,
    },
  });

  // ── Demo User ────────────────────────────────────────────────
  console.log("  → Seeding demo user...");
  const userRole = await prisma.role.findUnique({
    where: { role_name_level_unique: { name: "user", level: 3 } },
  });
  if (!userRole) throw new Error("User role not found");
  const demoUser = await prisma.user.upsert({
    where: { email: process.env.DEMO_EMAIL || "demo@simontokz.com" },
    update: {},
    create: {
      email: process.env.DEMO_EMAIL || "demo@simontokz.com",
      passwordHash: await hash("demo123!", 10),
      name: process.env.DEMO_NAME || "Demo User",
      role_id: userRole.id,
      isActive: true,
      emailVerified: true,
      emailVerifiedAt: new Date(),
      timezone: "Asia/Jakarta",
      apiKey: randomBytes(32).toString("hex"),
    },
  });

  // ── Subscription for demo user ───────────────────────────────
  await prisma.subscription.upsert({
    where: { userId: demoUser.id },
    update: {},
    create: {
      userId: demoUser.id,
      plan: "pro",
      creditLimit: BigInt(100000),
      creditBalance: BigInt(5000),
      creditUsed: BigInt(0),
      isActive: true,
      expiredAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  // ── Sample Worker Node ───────────────────────────────────────
  console.log("  → Seeding worker node...");
  await prisma.workerNode.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "worker-primary-01",
      hostname: "worker-01.local",
      ipAddress: "127.0.0.1",
      region: "local",
      status: "offline",
      maxBrowsers: 5,
      maxConcurrent: 20,
    },
  });

  console.log("\n⚙️  Creating default settings...");
  const settings = [
    // General
    { key: "site_name", value: "Forge AI", group_name: "general" },
    { key: "site_description", value: "Forge AI", group_name: "general" },
    { key: "site_keywords", value: "Forge AI", group_name: "general" },
    { key: "site_icon", value: "/logo.png", group_name: "general" },
    { key: "site_logo", value: "/logo-small.png", group_name: "general" },
    { key: "site_favicon", value: "/favicon.ico", group_name: "general" },
    { key: "site_theme", value: "dark", group_name: "general" },
    { key: "is_maintenance", value: "false", group_name: "general" },
    // Auth
    { key: "enable_register", value: "true", group_name: "auth" },
    { key: "enable_github_provider", value: "true", group_name: "auth" },
    { key: "enable_google_provider", value: "true", group_name: "auth" },
    // Storage
    { key: "max_upload_size_mb", value: "50", group_name: "storage" },
    { key: "max_upload_image_mb", value: "10", group_name: "storage" },
    { key: "max_upload_video_mb", value: "500", group_name: "storage" },
    { key: "max_upload_audio_mb", value: "50", group_name: "storage" },
    { key: "max_upload_document_mb", value: "20", group_name: "storage" },
    { key: "max_upload_code_mb", value: "5", group_name: "storage" },
    { key: "max_upload_archive_mb", value: "100", group_name: "storage" },
  ];

  for (const setting of settings) {
    await prisma.setting.upsert({
      where: {
        setting_key_group_name_unique: {
          key: setting.key,
          group_name: setting.group_name,
        },
      },
      update: { value: setting.value },
      create: setting,
    });
  }
  console.log(`  ✅ ${settings.length} settings dibuat`);

  console.log("✅ Seed complete!");
  console.log("");
  console.log("  Superadmin: superadmin@simontokz.com / superadmin123!");
  console.log("  Demo User:  demo@simontokz.com / demo123!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
