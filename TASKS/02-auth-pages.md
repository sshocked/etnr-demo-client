# Task 02 — Auth pages

## Реальные endpoint пути (auth-service HTTP, не bff)
Базовый URL: `import.meta.env.VITE_API_BASE_URL` (например `https://lasamb.tw1.ru`)

- `POST /auth/otp/send` body: `{phone, deviceId, devicePlatform?, appVersion?}` → `{verificationId, expiresIn, resendAfter}`
- `POST /auth/otp/verify` body: `{verificationId, code, deviceId}` → `{accessToken, expiresIn, refreshToken, refreshExpiresIn, user{id, phone}}`
- `POST /auth/token/refresh` body: `{refreshToken, deviceId}` → `{accessToken, expiresIn, refreshToken, refreshExpiresIn}`
- `POST /auth/logout` body: `{refreshToken, deviceId}` → 204

## Хранение в localStorage (STORAGE_KEYS.AUTH = 'etrn_auth')
```json
{
  "access_token": "...",
  "refresh_token": "...",
  "device_id": "...",  
  "user_id": "..."
}
```
`device_id` — генерировать один раз при первом запуске, хранить в STORAGE_KEYS.AUTH.

## Что изменить

### src/pages/AuthPage.tsx (или auth страница)
1. Найти где сейчас вызывается `simulateDelay` и mock-данные для auth
2. Заменить запрос кода: `api.post('/auth/otp/send', {phone, deviceId})`
3. Заменить верификацию: `api.post('/auth/otp/verify', {verificationId: requestId, code, deviceId})`
4. Сохранить токены в localStorage

### src/pages/PinSetupPage.tsx и PinLoginPage.tsx
PIN хранится только в localStorage — серверный эндпоинт НЕ нужен.
После pin-логина — дополнительно вызвать `api.get('/auth/me')` для проверки сессии.

## Примечание про api.ts
В `api.ts` при вызове `/auth/token/refresh` используй:
- body: `{refreshToken: tokens.refresh_token, deviceId: tokens.device_id}`
- Ответ: поля `accessToken` и `refreshToken` (camelCase, не snake_case)

## Проверка
1. `npm run dev`
2. Открыть `http://localhost:5173/#/auth`
3. Ввести телефон → должен уйти POST /auth/otp/send в сеть (DevTools Network)
4. SMS-код виден в логах auth-service: `kubectl logs -n auth-service deploy/authserver | grep "OTP\|code\|SMS"`
5. Ввести код → получить JWT → SPA переходит на /dashboard
