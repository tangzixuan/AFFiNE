import type {
  PlaywrightTestConfig,
  PlaywrightWorkerOptions,
} from '@playwright/test';

const config: PlaywrightTestConfig = {
  testDir: './e2e',
  fullyParallel: !process.env.CI,
  timeout: process.env.CI ? 120_000 : 30_000,
  use: {
    baseURL: 'http://localhost:8081/',
    browserName:
      (process.env.BROWSER as PlaywrightWorkerOptions['browserName']) ??
      'chromium',
    permissions: ['clipboard-read', 'clipboard-write'],
    viewport: { width: 1440, height: 800 },
    actionTimeout: 10 * 1000,
    locale: 'en-US',
    trace: 'on',
    video: 'on',
  },
  forbidOnly: !!process.env.CI,
  workers: process.env.CI ? 1 : 4,
  retries: 1,
  reporter: process.env.CI ? 'github' : 'list',
  webServer: [
    // Intentionally not building the web, reminds you to run it by yourself.
    {
      command: 'yarn -T run start:web-static',
      port: 8080,
      timeout: 120 * 1000,
      reuseExistingServer: !process.env.CI,
      env: {
        COVERAGE: process.env.COVERAGE || 'false',
      },
    },
    {
      command: 'yarn workspace @affine/server start',
      port: 3010,
      timeout: 120 * 1000,
      reuseExistingServer: !process.env.CI,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        DATABASE_URL:
          process.env.DATABASE_URL ??
          'postgresql://affine:affine@localhost:5432/affine',
        NODE_ENV: 'development',
        AFFINE_ENV: process.env.AFFINE_ENV ?? 'dev',
        DEBUG: 'affine:*',
        FORCE_COLOR: 'true',
        DEBUG_COLORS: 'true',
        ENABLE_LOCAL_EMAIL: process.env.ENABLE_LOCAL_EMAIL ?? 'true',
        NEXTAUTH_URL: 'http://localhost:8080',
        OAUTH_EMAIL_SENDER: 'noreply@toeverything.info',
        OAUTH_EMAIL_LOGIN: 'noreply@toeverything.info',
        OAUTH_EMAIL_PASSWORD: 'affine',
      },
    },
  ],
};

if (process.env.CI) {
  config.retries = 3;
}

export default config;
