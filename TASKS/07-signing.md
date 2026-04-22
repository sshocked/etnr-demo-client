# Task 07 — Signing flow (после бэкенда Task 07)

## Бэкенд endpoints
- `POST /documents/:docId/sign/init` body: `{mode, mcdId?, certificateId}` → `{signRequestId, nonce, requiredDigest, mcd?, certificate}`
- `POST /documents/:docId/sign/submit` body: `{signRequestId, signature, geoLocation?}` → `{jobId}`
- `POST /documents/:docId/refuse` body: `{reason}` → `204`
- `POST /documents/bulk-sign` body: `{documentIds[], mode, mcdId?, certificateId}` → `{batchId, items[], skipped[]}`
- `GET /signing/jobs/:jobId` → `{status, steps[]}`

## Что изменить

### src/pages/DocumentSignPage.tsx
1. init → получить requiredDigest
2. В demo-режиме (без КЭП): подписать = echo signature (base64 nonce)
3. submit с подписью
4. Poll /signing/jobs/:jobId до completed/failed

### src/pages/BulkSignPage.tsx
Аналогично, bulk endpoint.

## МЧД auto-pick
Перед sign/init: вызвать `GET /mcd/find-for-signing?docType=etrn&senderInn=:inn` из Task 08.
Если mcd = null и reason != 'ok' → показать предупреждение.

## Проверка
1. /documents/:id → кнопка Подписать → flow до "Подписан"
2. /documents/bulk-sign → выбрать несколько → подписать массово
