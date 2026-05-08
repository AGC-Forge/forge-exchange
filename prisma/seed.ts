import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...\n");

  console.log("📋 Creating roles...");
  const roles = [
    { name: "admin", level: 50 },
    { name: "moderator", level: 10 },
    { name: "user", level: 0 },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { role_name_level_unique: { name: role.name, level: role.level } },
      update: {},
      create: role,
    });
    console.log(`  ✅ Role: ${role.name} (level ${role.level})`);
  }

  // ── 2. Admin User ─────────────────────────────────────────────────────────
  console.log("\n👤 Creating admin user...");
  const adminRole = await prisma.role.findUnique({
    where: { role_name_level_unique: { name: "admin", level: 50 } },
  });
  if (!adminRole) throw new Error("Admin role tidak ditemukan");

  const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "Admin@12345";
  const adminName = process.env.ADMIN_NAME || "Administrator";

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const password_hash = await hash(adminPassword, 12);
    await prisma.user.create({
      data: {
        name: adminName,
        email: adminEmail,
        password_hash,
        role_id: adminRole.id,
        email_verified_at: new Date(),
        is_active: true,
      },
    });
    console.log(`  ✅ Admin: ${adminEmail}`);
  } else {
    if (existingAdmin.role_id !== adminRole.id) {
      await prisma.user.update({
        where: { email: adminEmail },
        data: { role_id: adminRole.id },
      });
    }
    console.log(`  ⏭️  Admin sudah ada: ${adminEmail}`);
  }

  // ── 3. Settings Default ───────────────────────────────────────────────────
  console.log("\n⚙️  Creating default settings...");
  const settings = [
    // General
    { key: "site_name", value: "Forge Exchange", group_name: "general" },
    { key: "site_description", value: "Forge Exchange", group_name: "general" },
    { key: "site_keywords", value: "Forge Exchange", group_name: "general" },
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

  console.log("\n🎉 Seeding selesai!");
  console.log(`\n   Login dengan: ${adminEmail}`);
}

main()
  .catch((e) => {
    console.error("\n❌ Seed gagal:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
