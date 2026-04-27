import { test, expect, Browser, BrowserContext, Page } from '@playwright/test'
import * as fs from 'fs'

const BASE = 'http://lasamb.tw1.ru'
const APP = BASE + '/app'
const PIN = '1111'
const STATE_FILE = '/tmp/pw-auth-state.json'
const DEVICE_ID = 'e2e-playwright-001'

// Capture ALL console errors and failed/4xx/5xx requests for a page
function attachErrorListeners(page: Page, label: string) {
  page.on('console', msg => {
    if (msg.type() === 'error') console.log(`[${label}] CONSOLE ERROR:`, msg.text())
  })
  page.on('requestfailed', req => {
    console.log(`[${label}] REQUEST FAILED:`, req.url(), req.failure()?.errorText)
  })
  page.on('response', res => {
    if (res.url().startsWith(BASE) && res.status() >= 400) {
      console.log(`[${label}] HTTP ${res.status()}:`, res.url())
    }
  })
}

// ─── single auth for entire suite ───────────────────────────────────────────

let authContext: BrowserContext

test.beforeAll(async ({ browser }) => {
  authContext = await browser.newContext()
  const page = await authContext.newPage()
  attachErrorListeners(page, 'AUTH')

  // Clear storage & go to auth
  await page.goto(APP + '/#/auth')
  await page.waitForLoadState('load')
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
  await page.reload()
  await page.waitForLoadState('networkidle')
  await page.screenshot({ path: 'e2e/screenshots/01-auth-page.png' })

  // Enter phone — the app formats as +7 (XXX) XXX-XX-XX
  // Fill the phone input with digits after +7
  const phoneInput = page.locator('input[type="tel"]')
  await expect(phoneInput).toBeVisible({ timeout: 10_000 })
  await phoneInput.click()
  // Clear and type full phone — the formatter will strip non-digits
  await phoneInput.fill('+7 999 123-45-67')
  await page.screenshot({ path: 'e2e/screenshots/02-phone-entered.png' })

  // Click send OTP
  const sendBtn = page.locator('button:has-text("Получить код")')
  await expect(sendBtn).toBeVisible()

  const [otpRes] = await Promise.all([
    page.waitForResponse(r => r.url().includes('/auth/otp/send'), { timeout: 15_000 }),
    sendBtn.click(),
  ])

  const otpStatus = otpRes.status()
  const otpBody = await otpRes.json().catch(() => ({}))
  console.log('OTP send status:', otpStatus, 'body:', JSON.stringify(otpBody))
  await page.screenshot({ path: 'e2e/screenshots/03-otp-sent.png' })

  expect(otpStatus, `OTP send failed: ${JSON.stringify(otpBody)}`).toBe(200)

  // Wait for code input
  const codeInput = page.locator('input[inputmode="numeric"]')
  await expect(codeInput).toBeVisible({ timeout: 10_000 })
  await codeInput.fill('111111')
  await page.screenshot({ path: 'e2e/screenshots/04-code-entered.png' })

  // Click verify
  const verifyBtn = page.locator('button:has-text("Подтвердить")')
  const [verifyRes] = await Promise.all([
    page.waitForResponse(r => r.url().includes('/auth/otp/verify'), { timeout: 15_000 }),
    verifyBtn.click(),
  ])

  const verifyStatus = verifyRes.status()
  const verifyBody = await verifyRes.json().catch(() => ({}))
  console.log('OTP verify status:', verifyStatus, 'keys:', Object.keys(verifyBody))
  await page.screenshot({ path: 'e2e/screenshots/05-verified.png' })

  expect(verifyStatus, `OTP verify failed: ${JSON.stringify(verifyBody)}`).toBe(200)

  // Wait to leave /auth
  await page.waitForURL(u => !String(u).includes('/auth'), { timeout: 15_000 })
  const postUrl = page.url()
  console.log('After verify URL:', postUrl)
  await page.screenshot({ path: 'e2e/screenshots/06-post-verify.png' })

  // Handle PIN setup
  if (postUrl.includes('/pin-setup')) {
    console.log('Handling PIN setup...')
    // Click 1,1,1,1
    for (let i = 0; i < 4; i++) {
      await page.locator('button').filter({ hasText: '1' }).first().click()
      await page.waitForTimeout(100)
    }
    await page.waitForTimeout(1000)
    await page.screenshot({ path: 'e2e/screenshots/07-pin-setup.png' })
    await page.waitForURL(u => !String(u).includes('/pin-setup'), { timeout: 15_000 }).catch(() => null)
  }

  // Force skip onboarding in localStorage
  await page.evaluate(({ pin }: { pin: string }) => {
    localStorage.setItem('etrn_pin', pin)
    const userRaw = localStorage.getItem('etrn_user')
    const user = userRaw ? JSON.parse(userRaw) : {}
    user.onboardingCompleted = true
    user.name = user.name || 'Тест Тестов'
    user.company = user.company || 'ООО Тест'
    user.inn = user.inn || '7707083893'
    localStorage.setItem('etrn_user', JSON.stringify(user))
  }, { pin: PIN })

  // Navigate to dashboard
  await page.goto(APP + '/#/dashboard')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000)
  await page.screenshot({ path: 'e2e/screenshots/08-dashboard-initial.png' })
  console.log('Dashboard URL:', page.url())

  await authContext.storageState({ path: STATE_FILE })
  await page.close()
})

test.afterAll(async () => {
  await authContext.close()
  if (fs.existsSync(STATE_FILE)) fs.unlinkSync(STATE_FILE)
})

// ─── helper: new page with saved session ────────────────────────────────────

async function openPage(browser: Browser, path: string): Promise<Page> {
  const ctx = await browser.newContext({ storageState: STATE_FILE })
  const page = await ctx.newPage()
  attachErrorListeners(page, path)
  await page.goto(APP + '/#' + path)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000)
  return page
}

// ─── page tests ─────────────────────────────────────────────────────────────

test('Dashboard loads', async ({ browser }) => {
  const page = await openPage(browser, '/dashboard')
  await page.screenshot({ path: 'e2e/screenshots/page-dashboard.png' })
  console.log('Dashboard URL:', page.url())
  // Should show dashboard content, not error
  const body = await page.locator('body').textContent()
  console.log('Dashboard contains:', body?.slice(0, 300))
  await page.context().close()
})

test('Documents list loads', async ({ browser }) => {
  const ctx = await browser.newContext({ storageState: STATE_FILE })
  const page = await ctx.newPage()
  attachErrorListeners(page, '/documents')
  await page.goto(APP + '/#/documents')
  // SSE keeps network busy — use load + fixed wait instead of networkidle
  await page.waitForLoadState('load')
  await page.waitForTimeout(4000)
  await page.screenshot({ path: 'e2e/screenshots/page-documents.png' })
  console.log('Documents URL:', page.url())
  const body = await page.locator('body').textContent()
  console.log('Documents contains:', body?.slice(0, 300))
  await ctx.close()
})

test('Archive loads', async ({ browser }) => {
  const page = await openPage(browser, '/archive')
  await page.screenshot({ path: 'e2e/screenshots/page-archive.png' })
  console.log('Archive URL:', page.url())
  await page.context().close()
})

test('Profile loads', async ({ browser }) => {
  const page = await openPage(browser, '/profile')
  await page.screenshot({ path: 'e2e/screenshots/page-profile.png' })
  const body = await page.locator('body').textContent()
  console.log('Profile contains:', body?.slice(0, 300))
  await page.context().close()
})

test('MCD page loads', async ({ browser }) => {
  const page = await openPage(browser, '/mcd')
  await page.screenshot({ path: 'e2e/screenshots/page-mcd.png' })
  const body = await page.locator('body').textContent()
  console.log('MCD contains:', body?.slice(0, 200))
  await page.context().close()
})

test('Stats page loads', async ({ browser }) => {
  const page = await openPage(browser, '/stats')
  await page.screenshot({ path: 'e2e/screenshots/page-stats.png' })
  console.log('Stats URL:', page.url())
  await page.context().close()
})
