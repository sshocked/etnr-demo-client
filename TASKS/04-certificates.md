# Task 04 — Сертификаты КЭП (после бэкенда Task 04)

## Бэкенд endpoints
- `POST /certificates/init` body: `{inn, snils, passport}` → `{sessionId, nextStep}`
- `POST /certificates/:sessionId/identification/start` → `{redirectUrl}` (ЕСИА/видео)
- `GET /certificates/:sessionId/identification/status` → `{status, currentStep, steps[]}`
- `POST /certificates/:sessionId/sms/request` → `{requestId}`
- `POST /certificates/:sessionId/sms/verify` body: `{requestId, code}` → `{jobId}`
- `GET /certificates/:sessionId/job/:jobId` → `{status, steps[], certificate?}`
- `GET /certificates/me` → `[{id,subject,validFrom,validTo,thumbprint,status,keyLocation,daysUntilExpiry}]`
- `POST /certificates/:certId/refresh` → `{jobId}`
- `DELETE /certificates/:certId`

## Что изменить

### src/pages/CertIssuePage.tsx (wizard)
Заменить mock на реальные вызовы по шагам. Polling GET job/:jobId каждые 2 сек до status=done/failed.

### src/pages/SettingsPage.tsx
Загружать список сертификатов через `api.get('/certificates/me')`.

## Проверка
1. /cert-issue → пройти wizard до получения сертификата (mock-провайдер в demo выдаёт сразу)
2. /settings → список сертификатов отображается
