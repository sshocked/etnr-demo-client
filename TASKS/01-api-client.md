# Task 01 — API Client (src/lib/api.ts + useSse.ts)

## Цель
Создать единый HTTP-клиент для всех запросов к backend. Все последующие задачи будут использовать этот клиент вместо simulateDelay + localStorage.

## Backend base URL
`import.meta.env.VITE_API_BASE_URL` (по умолчанию `http://localhost:8082`)

## Что создать

### src/lib/api.ts
Fetch-обёртка с:
- Автоматическим добавлением заголовка `Authorization: Bearer <token>` из localStorage `etrn_auth` → поле `access_token`
- Перехватом 401: вызвать `POST /auth/refresh` с телом `{refresh_token, device_id}` из `etrn_auth`, обновить токены в localStorage, повторить исходный запрос один раз
- Методы: `api.get(path, params?)`, `api.post(path, body?)`, `api.put(path, body?)`, `api.delete(path)`
- При неудаче refresh → очистить auth, перенаправить на `#/auth`
- Экспортировать тип `ApiError` с полем `status: number` и `message: string`

```typescript
// src/lib/api.ts
const BASE = import.meta.env.VITE_API_BASE_URL ?? ''

function getTokens() { /* читать из localStorage STORAGE_KEYS.AUTH */ }
function setTokens(t) { /* писать в localStorage */ }
function clearAuth() { /* очистить и редиректнуть на #/auth */ }

async function request<T>(method, path, body?, params?): Promise<T> { ... }

export const api = { get, post, put, delete: del }
export type { ApiError }
```

### src/lib/useSse.ts
```typescript
// Хук для Server-Sent Events
export function useSse(path: string, onEvent: (event: MessageEvent) => void) {
  // Создать EventSource с полным URL + Authorization через URL param или отдельный endpoint
  // Cleanup на unmount
  // Reconnect при ошибке через 3 секунды
}
```

## Проверка
- `npm run build` без ошибок
- В DevTools можно вызвать `api.get('/profile')` и увидеть реальный запрос к bff
