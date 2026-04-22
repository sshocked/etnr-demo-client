# Task 06 — SSE (после бэкенда Task 06)

## Бэкенд endpoints (SSE streams)
- `GET /documents/events` → events: `document.received`, `document.updated`
- `GET /notifications/events` → events: `notifications.new`, `notifications.counts.updated`
- `GET /signing/jobs/:jobId/events` → events: `signing.progress`, `signing.completed`, `signing.failed`
- `GET /mcd/jobs/:jobId/events` → events: `mcd.progress`, `mcd.completed`, `mcd.failed`

## Что изменить

### src/pages/DocumentsPage.tsx
Добавить `useSse('/documents/events', handleDocumentEvent)`.
`document.received` → prepend в список.
`document.updated` → обновить статус существующего.

### src/pages/NotificationsPage.tsx
Добавить `useSse('/notifications/events', ...)`.
`notifications.new` → добавить в список, обновить счётчик.

### src/pages/DocumentSignPage.tsx
Polling или SSE на `/signing/jobs/:jobId/events`.

## Проверка
1. Открыть /documents в браузере
2. Вставить строку в таблицу documents через psql
3. SPA показывает новый документ без рефреша страницы
