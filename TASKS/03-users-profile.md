# Task 03 — Users / Profile / DaData

## Реальные endpoint пути

### Через auth-service (напрямую через ingress /auth/*)
- `GET /auth/me` → `{id, phone, name, company, inn, role, onboardingCompleted, createdAt}`
- `PUT /auth/profile` body: `{name?, company?, inn?, role?}` → `{status: "ok"}`
- `POST /auth/onboarding/complete` → `{status: "ok"}`

### Через bff (/profile/*)
- `GET /profile` → то же что /auth/me (gRPC к auth-service)
- `PUT /profile` → то же что PUT /auth/profile
- `POST /profile/onboarding/complete` → то же что POST /auth/onboarding/complete

**Рекомендация**: используй `/auth/me` и `/auth/profile` напрямую (они публично доступны через ingress).

### DaData (через bff — нужно добавить, пока может быть не реализован)
- `GET /dadata/party?inn=XXXXXXXXXX` → `{kind, inn, ogrn, kpp, name, shortName, address}`
- Если endpoint ещё не готов — оставь mock и добавь TODO комментарий

## Что изменить

### src/pages/OnboardingPage.tsx
Найти mock-вызов DaData и заменить:
```typescript
const party = await api.get('/dadata/party', { inn })
// Если 404/500 — показать сообщение "Сервис временно недоступен" и дать ввести вручную
```
После заполнения формы: `await api.post('/auth/onboarding/complete')`

### src/pages/ProfilePage.tsx
Загружать: `const user = await api.get('/auth/me')`
Сохранять: `await api.put('/auth/profile', {name, company, inn, role})`

## Проверка
1. /onboarding → ввести ИНН → если DaData работает — карточка заполняется
2. /profile → данные из БД, не localStorage
