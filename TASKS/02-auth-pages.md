# Task 02 — Auth pages (после готовности бэкенда Task 02)

## Бэкенд endpoints (реализованы Claude)
- `POST /auth/sms/request` body: `{phone: "+7XXXXXXXXXX"}` → `{requestId, resendAvailableAt}`
- `POST /auth/sms/verify` body: `{requestId, code: "1234"}` → `{access_token, refresh_token, user}`
- `POST /auth/refresh` body: `{refresh_token, device_id}` → `{access_token, refresh_token}`
- `POST /auth/logout` header: Bearer token
- `POST /auth/pin/enable` body: `{pin: "1234"}` (PIN хранится в localStorage, не отправляется)
- `POST /auth/pin/disable`

## Что изменить

### src/pages/AuthPage.tsx (или Auth.tsx)
Убрать `simulateDelay`, заменить mock на:
```typescript
// Запрос кода:
const { requestId, resendAvailableAt } = await api.post('/auth/sms/request', { phone })
// Верификация:
const { access_token, refresh_token, user } = await api.post('/auth/sms/verify', { requestId, code })
// Сохранить в localStorage STORAGE_KEYS.AUTH: { access_token, refresh_token, user_id: user.id }
```

### src/pages/PinSetupPage.tsx и PinLoginPage.tsx
PIN остаётся в localStorage (`etrn_pin`), логика не меняется — это клиентская защита.
После успешного PIN входа — загрузить профиль через `api.get('/users/me')`.

## Проверка
1. `npm run dev`
2. Открыть `http://localhost:5173/#/auth`
3. Ввести телефон → увидеть в логах bff/auth-service SMS-код (stdout)
4. Ввести код → попасть на /dashboard
