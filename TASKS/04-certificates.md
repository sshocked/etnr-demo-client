# Task 04 — Сертификаты КЭП (КриптоКлюч)

## Фактические backend endpoints (через BFF /sign/certificate/*)

- `POST /sign/certificate/start` body: полная форма с паспортом, ИНН, СНИЛС → `{applicationId, status}`
- `GET /sign/certificate/status?applicationId=N` → `{status, message}`
- `GET /sign/certificate/file?applicationId=N&fileType=41` → binary file для подписи
- `POST /sign/certificate/submit` body: FormData с файлом и подписью → `{status}`
- `GET /sign/certificate/qr?applicationId=N` → PNG QR-код

## Что изменить

### src/pages/CertIssuancePage.tsx
Это 7-шаговый wizard выпуска КЭП через КриптоКлюч.
1. Шаг 1: заполнить форму с данными (ФИО, ИНН, СНИЛС, паспорт)
2. POST /sign/certificate/start → сохранить applicationId в state
3. Polling GET /sign/certificate/status?applicationId=N каждые 3 сек до status != 'processing'
4. Если status='awaiting_signature': GET /sign/certificate/file → скачать файл → показать QR для КриптоКлюч
5. Если в demo-режиме без физического КриптоКлюч — показать заглушку "Ожидание подписи через КриптоКлюч"

**Если страница сложная, минимальные изменения:**
- Добавить кнопку "Начать выпуск КЭП" на первом шаге, которая вызывает POST /sign/certificate/start с тестовыми данными из профиля
- Показать applicationId в UI для отладки

## Важно
- Не удалять существующий UI wizard
- npm run build должен проходить
