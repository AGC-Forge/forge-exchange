// https://nuxt.com/docs/api/configuration/nuxt-config
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const dayjsEsmDir = join(dirname(require.resolve("dayjs")), "esm");
const isProd = process.env.NODE_ENV === "production";
const isDev = !isProd;

export default defineNuxtConfig({
  modules: [
    "@nuxt/eslint",
    "@nuxt/ui",
    "@nuxt/image",
    "@nuxt/scripts",
    "@nuxtjs/i18n",
    "@nuxtjs/seo",
    "@pinia/nuxt",
    "@vee-validate/nuxt",
    "@vueuse/nuxt",
    "nuxt-auth-utils",
    "nuxt-headlessui",
    "nuxt-nodemailer",
    "dayjs-nuxt",
    "nuxt-charts",
  ],
  devtools: {
    enabled: false,
  },
  css: ["~/assets/css/main.css"],
  compatibilityDate: "2025-01-15",
  eslint: {
    config: {
      stylistic: {
        commaDangle: "never",
        braceStyle: "1tbs",
      },
    },
  },
  vite: {
    build: {
      sourcemap: isProd,
      cssCodeSplit: true,
      rollupOptions: {
        output: {
          sourcemapExcludeSources: true,
          manualChunks: (id) => {
            if (id.includes("node_modules")) {
              if (id.includes("lodash")) return "vendor-lodash";
              return "vendor";
            }
            if (id.includes("assets/css")) {
              return "styles";
            }
          },
        },
        plugins: [],
        external: ["sharp"],
      },
      chunkSizeWarningLimit: 2000,
    },
    css: {
      preprocessorMaxWorkers: true,
      devSourcemap: false,
    },
    plugins: [
      {
        apply: "build",
        name: "vite-plugin-ignore-sourcemap-warnings",
        configResolved(config) {
          const originalOnWarn = config.build.rollupOptions.onwarn;
          config.build.rollupOptions.onwarn = (warning, warn) => {
            if (
              warning.code === "SOURCEMAP_BROKEN" &&
              warning.plugin === "@tailwindcss/vite:generate:build"
            ) {
              return;
            }

            if (originalOnWarn) {
              originalOnWarn(warning, warn);
            } else {
              warn(warning);
            }
          };
        },
      },
    ],
    server: {
      ...(isDev ? { hmr: { port: 24679 } } : {}),
      allowedHosts: true,
      // Jangan pre-transform semua dep saat startup — hemat memory dev
      preTransformRequests: false,
    },
    resolve: {
      alias: [{ find: /^dayjs$/, replacement: dayjsEsmDir }],
    },
    define: {
      global: "globalThis",
    },
    vue: {
      script: {
        globalTypeFiles: [
          fileURLToPath(new URL("./shared/types/index.d.ts", import.meta.url)),
        ],
      },
    },
    optimizeDeps: {
      include: [
        "date-fns",
        "clsx",
        "vee-validate",
        "@vee-validate/zod",
        "zod",
        "dayjs",
        "mitt",
        "pinia",
        "vue",
        "@vueuse/core",
        "vue3-toastify",
        "@morev/vue-transitions",
      ],
      holdUntilCrawlEnd: false,
    },
  },
  nitro: {
    compressPublicAssets: isProd
      ? {
          gzip: true,
          brotli: true,
        }
      : true,
    experimental: {
      websocket: true,
      wasm: false,
    },
    prerender: {
      crawlLinks: false,
      failOnError: false,
      ignore: ["/api/**", "/app/**", "/__sitemap__/style.xsl"],
      routes: ["/robots.txt"],
    },
    minify: isProd,
    ...(isDev && {
      devHandlers: [],
      devProxy: {
        // Proxy config jika perlu
      },
    }),
    ...(isProd && {
      timing: false, // Disable timing headers di prod
    }),
  },
  hooks: {
    "vite:extendConfig": (config) => {
      // if (typeof config.server!.hmr === "object") {
      // 	config.server!.hmr.protocol = "wss";
      // }
    },
  },
  routeRules: {
    "/": { prerender: false },
    "/sitemap.xml": {
      isr: 3600,
      headers: {
        "Content-Type": "application/xml",
      },
    },
    "/_robots.txt": {
      prerender: true,
    },
    "/.well-known/**": {
      static: true,
      headers: {
        "Content-Type": "text/plain",
        "Cache-Control": "public, max-age=604800",
      },
    },
    "/_nuxt/**": isProd
      ? {
          headers: {
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        }
      : {
          headers: {
            "Cache-Control": "no-store",
          },
        },
    "/api/**": {
      cors: true,
      cache: false,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    },
  },
  seo: {},
  site: {
    url: process.env.NUXT_PUBLIC_SITE_URL || "https://forge-exchange.app",
    name: process.env.APP_NAME || "Forge AI",
    indexable: true,
  },
  robots: {
    disallow: ["/app", "/api"],
    allow: "/",
  },
  sitemap: {
    sitemapsPathPrefix: "/",
    sitemaps: {
      pages: {
        includeAppSources: true,
        exclude: ["/app/**"],
      },
    },
    exclude: ["/app/**"],
    defaults: {
      changefreq: "daily",
      priority: 0.7,
      lastmod: new Date().toISOString(),
    },
  },
  app: {
    baseURL: "/",
    buildAssetsDir: "/_nuxt/",
    cdnURL: isDev ? "" : undefined,
    head: {
      charset: "utf-8",
      viewport: "width=device-width, initial-scale=1",
      htmlAttrs: {
        lang: "en",
      },
      meta: [
        { name: "format-detection", content: "telephone=no" },
        { name: "robots", content: "index,follow" },
      ],
      link: [
        {
          rel: "icon",
          type: "image/png",
          href: "/favicon-96x96.png",
          sizes: "96x96",
        },
        {
          rel: "icon",
          type: "image/svg+xml",
          href: "/favicon.svg",
        },
        {
          rel: "shortcut",
          type: "image/png",
          href: "/favicon.ico",
          sizes: "96x96",
        },
        {
          rel: "apple-touch-icon",
          type: "image/png",
          href: "/apple-touch-icon.png",
          sizes: "180x180",
        },
      ],
      bodyAttrs: {},
    },
    pageTransition: { name: "page", mode: "out-in" },
  },
  colorMode: {
    preference: "dark",
    classSuffix: "",
    storage: "cookie",
    storageKey: "forge-color-mode",
    dataValue: "theme",
  },
  typescript: {
    shim: false,
    typeCheck: false, // Matikan type check saat dev — jalankan manual via `pnpm typecheck`
  },
  icon: {
    clientBundle: {
      scan: true,
      sizeLimitKb: 256,
    },
    fetchTimeout: 2000,
    serverBundle: "local",
  },
  image: {
    quality: 80,
    format: ["avif", "webp", "jpeg", "jpg", "png", "gif"],
    screens: {
      xs: 320,
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
      xxl: 1536,
      "2xl": 1536,
    },
  },
  i18n: {
    defaultLocale: "en",
    locales: [
      {
        code: "en",
        name: "English",
        file: "en.json",
      },
    ],
  },
  // https://github.com/kleinpetr/nuxt-nodemailer
  nodemailer: {
    from: process.env.NUXT_NODEMAILER_FROM,
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.NUXT_NODEMAILER_AUTH_USER,
      pass: process.env.NUXT_NODEMAILER_AUTH_PASS,
    },
  },
  runtimeConfig: {
    APP_NAME: process.env.APP_NAME,
    NODE_ENV: process.env.NODE_ENV,
    PUBLIC_SITE_URL: process.env.NUXT_PUBLIC_SITE_URL,
    APP_SECRET: process.env.APP_SECRET,
    GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    oauth: {
      github: {
        clientId:
          process.env.NUXT_OAUTH_GITHUB_CLIENT_ID ??
          process.env.GITHUB_CLIENT_ID,
        clientSecret:
          process.env.NUXT_OAUTH_GITHUB_CLIENT_SECRET ??
          process.env.GITHUB_CLIENT_SECRET,
      },
      google: {
        clientId:
          process.env.NUXT_OAUTH_GOOGLE_CLIENT_ID ??
          process.env.GOOGLE_CLIENT_ID,
        clientSecret:
          process.env.NUXT_OAUTH_GOOGLE_CLIENT_SECRET ??
          process.env.GOOGLE_CLIENT_SECRET,
      },
    },
    session: {
      maxAge: 60 * 60 * 24 * 7, // 7 hari
    },
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
    CLOUDINARY_UPLOAD_PRESET: process.env.CLOUDINARY_UPLOAD_PRESET,
    REDIS_URL: process.env.REDIS_URL,
    REDIS_HOST: process.env.REDIS_HOST,
    REDIS_PORT: process.env.REDIS_PORT,
    REDIS_PASSWORD: process.env.REDIS_PASSWORD,
    REDIS_DB: process.env.REDIS_DB,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    ADMIN_EMAIL: process.env.ADMIN_EMAIL,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
    ADMIN_NAME: process.env.ADMIN_NAME,
    NUXT_SANITY_TOKEN: process.env.NUXT_SANITY_TOKEN,
    APP_CLIENT_SECRET: process.env.APP_CLIENT_SECRET,
    JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
    public: {
      APP_NAME: process.env.APP_NAME,
      NODE_ENV: process.env.NODE_ENV,
      PUBLIC_SITE_URL: process.env.NUXT_PUBLIC_SITE_URL,
      GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
      oauth: {
        github: {
          clientId:
            process.env.NUXT_OAUTH_GITHUB_CLIENT_ID ??
            process.env.GITHUB_CLIENT_ID,
        },
        google: {
          clientId:
            process.env.NUXT_OAUTH_GOOGLE_CLIENT_ID ??
            process.env.GOOGLE_CLIENT_ID,
        },
      },
      APP_CLIENT_SECRET: process.env.APP_CLIENT_SECRET,
    },
  },
  build: {
    transpile: isProd ? ["dayjs"] : [],
  },
});
