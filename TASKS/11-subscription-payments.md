# Task 11 — Subscription & Payments (после бэкенда Task 11)

## Бэкенд endpoints
- `GET /plans` → `[{id, name, documentsLimit, priceRub}]`
- `GET /subscriptions/me` → `{status, plan, validFrom, validTo, autorenew, usedThisPeriod, canSign}`
- `POST /subscriptions/me/cancel`
- `POST /subscriptions/me/change-plan` body: `{planId}`
- `POST /payments/card/init` body: `{planId}` → `{paymentId, redirectUrl}`
- `POST /payments/sbp/init` body: `{planId}` → `{qrCodeSvgUrl, deepLink}`
- `POST /payments/invoice` body: `{planId}` → `{invoiceId, invoiceUrl}`
- `GET /payments` → `{items[], nextCursor}`
- `GET /payments/:paymentId`

## Что изменить

### src/pages/ProfilePaymentPage.tsx (или /profile/payment)
- Загружать тарифы: `api.get('/plans')`
- Текущая подписка: `api.get('/subscriptions/me')`
- Инициировать оплату по карте: `api.post('/payments/card/init', {planId})` → редирект на YooKassa
- История платежей: `api.get('/payments')`

## Проверка
1. /profile/payment → список тарифов + текущая подписка
2. Кнопка Оплатить → открывается YooKassa sandbox checkout
