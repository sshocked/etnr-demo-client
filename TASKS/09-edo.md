# Task 09 — EDO Operators (после бэкенда Task 09)

## Бэкенд endpoints
- `GET /edo/operators` → `[{id, name, description}]`
- `GET /edo/connections` → `[{id, operator, companyInn, connectedAt, lastSyncAt, active}]`
- `POST /edo/connect/init` body: `{operator}` → `{authUrl}`
- `GET /edo/callback?operator=&code=&state=` (OAuth redirect)
- `DELETE /edo/connections/:id`
- `POST /edo/connections/:id/sync` → `{jobId}`

## Что изменить

### src/pages/ProfileEdoPage.tsx (или /profile/edo)
- Загружать операторов: `api.get('/edo/operators')`
- Загружать подключения: `api.get('/edo/connections')`
- Подключить: `api.post('/edo/connect/init', {operator})` → редирект на authUrl
- OAuth callback обрабатывается backend

## Проверка
1. /profile/edo → список операторов
2. Нажать Подключить → редирект на OAuth Контур
