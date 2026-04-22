# Task 10 — Notifications (после бэкенда Task 10)

## Бэкенд endpoints
- `GET /notifications` → `{items[], nextCursor}`
- `GET /notifications/counts` → `{unread, total}`
- `POST /notifications/:id/read`
- `POST /notifications/read-all`
- `GET /notifications/preferences` → `{enabledTypes[], quietHoursEnabled, ...}`
- `PUT /notifications/preferences` body: preferences object
- `POST /notifications/push/subscribe` body: `{platform: "web", endpoint, keys}` → `{subscriptionId}`
- `DELETE /notifications/push/subscribe/:id`

## Что изменить

### src/pages/NotificationsPage.tsx
Убрать mockNotifications, загружать из `api.get('/notifications')`.
Пометить как прочитанное: `api.post('/notifications/' + id + '/read')`.

### Счётчик в шапке
`api.get('/notifications/counts')` + SSE из Task 06.

## Проверка
1. /notifications → список уведомлений из БД
2. Клик "Прочитать всё" → счётчик обнуляется
