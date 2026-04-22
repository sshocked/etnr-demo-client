# Task 08 — МЧД страницы (после бэкенда Task 08)

## Бэкенд endpoints (уже частично реализованы в bff)
- `GET /mcd` → список МЧД
- `POST /mcd/parse` body: FormData с файлом XML → `{draftId, parsed}`
- `POST /mcd/attach` body: `{draftId}` → `{mcdId, jobId}`
- `GET /mcd/jobs/:jobId` → `{status, steps[]}`
- `POST /mcd/:mcdId/refresh` → `{jobId}`
- `DELETE /mcd/:mcdId`
- `GET /mcd/find-for-signing?docType=etrn&senderInn=` → `{mcd|null, reason}`
- `GET /mcd/invite` → список инвайтов
- `POST /mcd/invite` body: `{recipientName, contact, channel}` → `{inviteUrl, token}`
- `DELETE /mcd/invite/:inviteId`
- `GET /mcd/invite/:token/preview` (публичный, без auth) → `{valid, inviter, expiresAt}`

## Что изменить

### src/pages/McdPage.tsx (если есть)
Список МЧД из `api.get('/mcd')`, upload через `api.post('/mcd/parse', formData)`.

### src/pages/McdInvitePage.tsx
Публичная страница — не добавлять Bearer, вызывать напрямую.

## Проверка
1. Загрузить XML из docs/samples/mcd-real-ul.xml
2. МЧД верифицируется и появляется в списке
