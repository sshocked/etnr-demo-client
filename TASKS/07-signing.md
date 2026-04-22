# Task 07 — Signing flow

## Бэкенд endpoints (фактические, через BFF)

- `POST /documents/:id/sign/init`
  body: `{ mode: "sign"|"sign_with_reservations"|"refuse", mcdId?: string, certificateId?: string }`
  response: `{ signRequestId, nonce, requiredDigest, mcdId, mcdNumber, certificateId }`

- `POST /documents/:id/sign/submit`
  body: `{ signRequestId, signature, reservations?: string, geoLat?: number, geoLon?: number }`
  response: `{ status: "submitted" }`

- `POST /documents/:id/refuse`
  body: `{ reason: string }`
  response: 204 No Content

## Что изменить

### src/pages/DocumentListPage.tsx или DocumentDetailPage
1. Добавить кнопки "Подписать" и "Отказать" для документов с requiresSign=true
2. При клике "Подписать":
   - Вызвать `api.post('/documents/:id/sign/init', { mode: "sign" })`
   - Получить `{ signRequestId, requiredDigest }`
   - Demo-подпись: `btoa(requiredDigest)` (base64 от requiredDigest)
   - Вызвать `api.post('/documents/:id/sign/submit', { signRequestId, signature: btoa(requiredDigest) })`
   - Показать уведомление "Документ подписан"
3. При клике "Отказать":
   - Показать модальное окно с полем "Причина отказа"
   - Вызвать `api.post('/documents/:id/refuse', { reason })`
   - Показать уведомление "Отказ отправлен"
4. После успеха — обновить список документов

## API helper (src/lib/api.ts)
Использовать `api.post<T>(path, body)` для всех вызовов.

## Важно
- Не менять существующие стили и layout
- Не добавлять новые зависимости
- `npm run build` должен проходить без ошибок
