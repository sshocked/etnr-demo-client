# Task 08 — МЧД страницы

## Фактические backend endpoints (через BFF /mcd/*)

- `GET /mcd` → `{ items: [{id, status, principalName, principalInn, representativeName, representativeInn, validFrom, validTo, ...}] }`
- `GET /mcd/{mcdId}` → полный объект МЧД
- `DELETE /mcd/{mcdId}` → 204
- `POST /mcd/parse` body: `{ xmlData: "<base64 encoded XML>" }` → `{ draftId, parsed: {...} }`
- `POST /mcd/attach` body: `{ draftId: "..." }` → `{ mcdId, status }`
- `POST /mcd/refresh` body: `{ mcdId: "..." }` → `{ status }`
- `POST /mcd/{mcdId}/refresh` → `{ status }`
- `GET /mcd/find-for-signing?docType=etrn&senderInn=` → `{ mcd: {...}|null, reason: string }`
- `GET /mcd/invite` → `{ items: [{id, recipientName, contact, channel, token, status, createdAt}] }`
- `POST /mcd/invite` body: `{ recipientName, contact, channel }` → `{ inviteUrl, token, id }`
- `DELETE /mcd/invite/{inviteId}` → 204
- `GET /mcd/invite-link` → `{ url }` (ссылка-приглашение текущего пользователя)
- `GET /mcd/invite/{token}/preview` (публичный, без JWT) → `{ valid: bool, inviterName, expiresAt }`

## Что изменить

### src/pages/McdLandingPage.tsx
1. Удалить весь localStorage / mock данные
2. Загружать список: `const data = await api.get<{items: McdItem[]}>('/mcd')`
3. Удалить МЧД: `await api.delete('/mcd/' + id)` (или `api.post` если нет delete метода)
4. Обновить статус: `await api.post('/mcd/' + id + '/refresh')`
5. Загружать invite-ссылку: `api.get<{url: string}>('/mcd/invite-link')`

### src/pages/McdInvitePage.tsx
- Публичная страница (preview инвайта) — вызывать через обычный fetch или api без обязательного JWT
- URL: `/mcd/invite/{token}/preview` — этот endpoint публичный (без auth middleware)
- Показать: имя пригласившего, срок действия, кнопку принять

## Важно
- `api.delete` может не существовать в src/lib/api.ts — если нет, используй `api.post('/mcd/' + id + '/delete')` ИЛИ добавь delete метод в api.ts
- Проверить: в src/lib/api.ts есть ли метод `delete`? Если нет — добавить: `delete: <T>(path: string) => request<T>(path, { method: 'DELETE' })`
- npm run build должен проходить
