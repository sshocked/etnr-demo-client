# Task 11 — Subscription & Payments

## Фактические backend endpoints (через BFF)

- `GET /billing/status` → `{ package: {status, start_at, end_at, signature_limit, signatures_used, signatures_remaining}, latest_invoice: {id, status, amount, currency, payment_url, created_at} }`
- `POST /billing/checkout` body: `{ packageId: string, email?: string }` → `{ invoiceId, paymentUrl, status, amount, currency, periodEnd }`
- `GET /billing/invoices` → `{ invoices: [{id, status, amount, currency, payment_url, created_at}] }`

Статусы подписки: `active`, `expired`, `unpaid`, `none` (если пакета нет)

## Что изменить

### src/pages/PaymentPage.tsx
1. Удалить setTimeout / mock логику
2. При загрузке: `const status = await api.get<BillingStatusResponse>('/billing/status')`
3. Если `status.package.status === 'active'` — показать "Подписка активна"
4. Кнопка "Оплатить": `const resp = await api.post<{paymentUrl: string}>('/billing/checkout', {packageId: 'basic'})`
5. Если resp.paymentUrl: `window.location.href = resp.paymentUrl`
6. Если paymentUrl пустой (demo/sandbox) — показать toast "Оплата оформлена" + navigate('/profile')

### src/pages/ProfilePage.tsx
1. В существующий useEffect добавить запрос billing статуса: `api.get<BillingStatusResponse>('/billing/status')`
2. Заменить `getItem(STORAGE_KEYS.SUBSCRIPTION)` на данные из API
3. Маппинг: `package.status` → subscription status, `signature_limit` → limit, `signatures_used` → used

## Важно
- Не ломать существующий UI профиля
- npm run build должен проходить
- BillingStatusResponse interface:
```typescript
interface BillingStatusResponse {
  package?: {
    status: string
    start_at?: string
    end_at?: string
    signature_limit?: number
    signatures_used?: number
    signatures_remaining?: number
  }
  latest_invoice?: {
    id: string
    status: string
    amount: number
    currency: string
    payment_url?: string
    created_at: string
  }
}
```
