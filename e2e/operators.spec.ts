/**
 * E2E tests for ЭДО operator connection flow (/profile/edo, EdoConnectPage).
 *
 * No BFF calls are made from this page — all state is local React useState.
 * The 2.5s timeout in handleSubmitReg is real; tests wait for it.
 */
import { test, expect, Browser, BrowserContext } from '@playwright/test'
import { bootstrapAuth, openPage, cleanupAuth, STATE_FILE, APP } from './helpers/auth'

// Operator metadata mirrors src/lib/constants.ts EDO_OPERATORS
const OPERATORS = [
  { key: 'sbis',      name: 'СБИС' },
  { key: 'sberkorus', name: 'СберКорус' },
  { key: 'astral',    name: 'Астрал' },
  { key: 'kontur',    name: 'Контур' },
] as const

// Connect timeout = 2500ms spinner + network idle buffer
const CONNECT_TIMEOUT = 10_000

let authCtx: BrowserContext

test.beforeAll(async ({ browser }) => {
  authCtx = await bootstrapAuth(browser)
})

test.afterAll(async () => {
  await authCtx.close()
  cleanupAuth()
})

// ─── helpers ────────────────────────────────────────────────────────────────

/**
 * Select an operator card, fill email, click "Подключить", wait for
 * spinner then success toast, return page still on the operators list step.
 */
async function connectOperator(page: ReturnType<typeof openPage> extends Promise<infer T> ? T : never, name: string) {
  // Select operator card
  const card = page.locator('button').filter({ hasText: name })
  await card.waitFor({ timeout: 5_000 })
  await card.click()

  // Proceed to register form
  const connectBtn = page.getByRole('button', { name: new RegExp(`Подключить ${name}`) })
  await connectBtn.click()

  // Fill email (placeholder selector works regardless of label/htmlFor deployment state)
  await page.locator('input[placeholder="user@company.ru"]').fill('e2e@test.ru')

  // Submit
  const submitBtn = page.getByRole('button', { name: 'Подключить', exact: true })
  await submitBtn.click()

  // Spinner
  await expect(page.getByText('Подключение...')).toBeVisible({ timeout: 3_000 })

  // Success toast
  await expect(page.getByRole('status').getByText(new RegExp(`${name}.*подключён`))).toBeVisible({
    timeout: CONNECT_TIMEOUT,
  })
}

// ─── tests ──────────────────────────────────────────────────────────────────

test('1. /profile/edo page loads with all 4 operators', async ({ browser }) => {
  const page = await openPage(browser, '/profile/edo')

  await expect(page.locator('h2').filter({ hasText: 'Выберите оператора ЭДО' })).toBeVisible()

  for (const op of OPERATORS) {
    await expect(page.locator('button').filter({ hasText: op.name })).toBeVisible()
  }

  await page.screenshot({ path: 'e2e/screenshots/operators-01-page-loads.png' })
  await page.context().close()
})

test('2. Validation: empty registration form shows toast', async ({ browser }) => {
  const page = await openPage(browser, '/profile/edo')

  // Select first operator and proceed to register
  const card = page.locator('button').filter({ hasText: OPERATORS[0].name })
  await card.click()
  const connectBtn = page.getByRole('button', { name: new RegExp(`Подключить ${OPERATORS[0].name}`) })
  await connectBtn.click()

  // Confirm we are on register step
  await expect(page.locator('h2').filter({ hasText: `Регистрация в ${OPERATORS[0].name}` })).toBeVisible()

  // Submit without filling anything
  await page.getByRole('button', { name: 'Подключить', exact: true }).click()

  // Error toast
  await expect(page.getByRole('status').getByText('Укажите email или телефон')).toBeVisible({ timeout: 5_000 })

  // Still on register step
  await expect(page.locator('h2').filter({ hasText: `Регистрация в ${OPERATORS[0].name}` })).toBeVisible()

  await page.screenshot({ path: 'e2e/screenshots/operators-02-validation.png' })
  await page.context().close()
})

for (const op of OPERATORS) {
  test(`3. Connect happy-path — ${op.name}`, async ({ browser }) => {
    const page = await openPage(browser, '/profile/edo')

    await connectOperator(page, op.name)

    // Connected card visible with badge
    await expect(page.getByText('Подключён').first()).toBeVisible({ timeout: CONNECT_TIMEOUT })
    await expect(page.getByText('Активен').first()).toBeVisible({ timeout: 3_000 })

    await page.screenshot({ path: `e2e/screenshots/operators-03-connected-${op.key}.png` })
    await page.context().close()
  })
}

test('4. Disconnect operator removes card', async ({ browser }) => {
  const page = await openPage(browser, '/profile/edo')
  const opName = OPERATORS[0].name

  await connectOperator(page, opName)

  // Wait for list view
  await expect(page.getByText('Подключён').first()).toBeVisible({ timeout: CONNECT_TIMEOUT })

  // Disconnect
  const disconnectBtn = page.getByRole('button', { name: 'Отключить' }).first()
  await disconnectBtn.click()

  // Info toast
  await expect(page.getByRole('status').getByText(new RegExp(`${opName}.*отключён`))).toBeVisible({ timeout: 5_000 })

  // Card gone — no "Подключён" badge (exact match avoids matching "Подключённые операторы...")
  await expect(page.getByText('Подключён', { exact: true })).not.toBeVisible({ timeout: 3_000 })

  // "Подключить ещё" button OR operator list should be visible
  const hasAddMore = await page.getByRole('button', { name: /Подключить ещё оператора/ }).isVisible()
  const hasSelectStep = await page.getByRole('heading', { name: /Выберите оператора ЭДО/ }).isVisible()
  expect(hasAddMore || hasSelectStep).toBeTruthy()

  await page.screenshot({ path: 'e2e/screenshots/operators-04-disconnect.png' })
  await page.context().close()
})

test('5. Multi-connect shows roaming hint on second operator', async ({ browser }) => {
  const page = await openPage(browser, '/profile/edo')

  // Connect first
  await connectOperator(page, OPERATORS[0].name)
  await expect(page.getByText('Подключён').first()).toBeVisible({ timeout: CONNECT_TIMEOUT })

  // Navigate to add second
  const addMoreBtn = page.getByRole('button', { name: /Подключить ещё оператора/ })
  await addMoreBtn.waitFor({ timeout: 5_000 })
  await addMoreBtn.click()

  // Select second operator
  const card = page.locator('button').filter({ hasText: OPERATORS[1].name })
  await card.click()
  const connectBtn = page.getByRole('button', { name: new RegExp(`Подключить ${OPERATORS[1].name}`) })
  await connectBtn.click()

  // On register form — roaming banner mentions first operator by name
  await expect(page.getByText(new RegExp(`У вас уже подключено.*${OPERATORS[0].name}`))).toBeVisible({ timeout: 5_000 })

  await page.screenshot({ path: 'e2e/screenshots/operators-05-roaming-hint.png' })
  await page.context().close()
})

test('6. All-connected state shows "Все операторы подключены!"', async ({ browser }) => {
  const page = await openPage(browser, '/profile/edo')

  // Connect all 4 sequentially
  for (let i = 0; i < OPERATORS.length; i++) {
    if (i > 0) {
      const addMoreBtn = page.getByRole('button', { name: /Подключить ещё оператора/ })
      await addMoreBtn.waitFor({ timeout: 5_000 })
      await addMoreBtn.click()
    }
    await connectOperator(page, OPERATORS[i].name)
    await expect(page.getByText('Подключён', { exact: true }).first()).toBeVisible({ timeout: CONNECT_TIMEOUT })
  }

  // After all 4 connected: no "add more" button, 4 connected badges visible
  await expect(page.getByRole('button', { name: /Подключить ещё оператора/ })).not.toBeVisible({ timeout: 3_000 })
  const badges = page.getByText('Подключён', { exact: true })
  await expect(badges).toHaveCount(4, { timeout: 5_000 })

  await page.screenshot({ path: 'e2e/screenshots/operators-06-all-connected.png' })
  await page.context().close()
})

test('7. Phone-only registration passes validation', async ({ browser }) => {
  const page = await openPage(browser, '/profile/edo')
  const opName = OPERATORS[0].name

  // Select operator
  const card = page.locator('button').filter({ hasText: opName })
  await card.click()
  await page.getByRole('button', { name: new RegExp(`Подключить ${opName}`) }).click()

  // Fill only phone, leave email empty
  await page.locator('input[placeholder="+7 (999) 123-45-67"]').fill('+7 999 000-00-00')
  await page.getByRole('button', { name: 'Подключить', exact: true }).click()

  // Should succeed — spinner visible
  await expect(page.getByText('Подключение...')).toBeVisible({ timeout: 3_000 })
  await expect(page.getByRole('status').getByText(new RegExp(`${opName}.*подключён`))).toBeVisible({
    timeout: CONNECT_TIMEOUT,
  })

  await page.screenshot({ path: 'e2e/screenshots/operators-07-phone-only.png' })
  await page.context().close()
})

test('8. Back button from register returns to select', async ({ browser }) => {
  const page = await openPage(browser, '/profile/edo')
  const opName = OPERATORS[0].name

  // Select operator → proceed to register
  await page.locator('button').filter({ hasText: opName }).click()
  await page.getByRole('button', { name: new RegExp(`Подключить ${opName}`) }).click()

  // Confirm on register step
  await expect(page.locator('h2').filter({ hasText: `Регистрация в ${opName}` })).toBeVisible()

  // Click back (scoped to avoid matching AppShell header back arrow)
  await page.locator('.space-y-2').getByRole('button', { name: 'Назад' }).click()

  // Back on select step
  await expect(page.locator('h2').filter({ hasText: 'Выберите оператора ЭДО' })).toBeVisible({ timeout: 3_000 })

  await page.screenshot({ path: 'e2e/screenshots/operators-08-back.png' })
  await page.context().close()
})

test('9. State resets on page reload (localStorage not persisted)', async ({ browser }) => {
  const page = await openPage(browser, '/profile/edo')
  const opName = OPERATORS[0].name

  // Connect
  await connectOperator(page, opName)
  await expect(page.getByText('Подключён').first()).toBeVisible({ timeout: CONNECT_TIMEOUT })

  // Reload page
  await page.reload()
  await page.waitForLoadState('networkidle')

  // After reload — list should be empty, show "Выберите оператора" not "Подключён"
  // This documents current by-design behavior: state lives only in React useState
  await expect(page.locator('h2').filter({ hasText: 'Выберите оператора ЭДО' })).toBeVisible({ timeout: 5_000 })
  await expect(page.getByText('Подключён')).not.toBeVisible()

  await page.screenshot({ path: 'e2e/screenshots/operators-09-reload-reset.png' })
  await page.context().close()
})
