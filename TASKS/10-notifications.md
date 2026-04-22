# Task 10 — Notifications

## Фактические backend endpoints (через BFF)

- `GET /notifications?unread=true&limit=20&cursor=` → `{ notifications: [{id, kind, title, body, entityId, isRead, createdAt}], nextCursor }`
- `GET /notifications/unread-count` → `{ count: number }`
- `POST /notifications/:id/read` → 204
- `POST /notifications/read-all` → 204

## Что изменить

### src/pages/NotificationsPage.tsx
1. Удалить mockNotifications / localStorage
2. Загружать: `const data = await api.get<{notifications, nextCursor}>('/notifications')`
3. "Отметить все прочитанными" → `await api.post('/notifications/read-all')`
4. Клик по уведомлению → `await api.post('/notifications/' + id + '/read')`

### Счётчик непрочитанных (NavBar или Header)
1. Загружать при старте: `api.get('/notifications/unread-count')` → `{ count }`
2. Показывать badge с числом если count > 0

## Важно
- Не добавлять новые зависимости
- `npm run build` должен проходить без ошибок
