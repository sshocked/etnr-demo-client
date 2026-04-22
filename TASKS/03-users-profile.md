# Task 03 — Users / Profile / DaData (после готовности бэкенда Task 03)

## Бэкенд endpoints
- `GET /users/me` → `{id, phone, email, name, company, inn, kind, ogrn, onboardingCompleted, pinEnabled}`
- `PUT /users/me` body: `{email?, name?, company?}`
- `POST /profile/onboarding/complete`
- `GET /dadata/party?inn=XXXXXXXXXX` → `{kind, inn, ogrn, kpp, name, shortName, management, address, status}`

## Что изменить

### src/pages/OnboardingPage.tsx
- Заменить mock DaData: `const party = await api.get('/dadata/party', { inn })`
- После заполнения: `await api.post('/profile/onboarding/complete')`

### src/pages/ProfilePage.tsx
- Загружать данные: `const user = await api.get('/users/me')`
- Сохранять изменения: `await api.put('/users/me', { email, name })`
- Убрать localStorage mock для профиля

## Проверка
1. /onboarding → ввести ИНН → карточка компании заполняется из DaData
2. /profile → отображаются реальные данные пользователя
