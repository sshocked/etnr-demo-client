import { STORAGE_KEYS } from './constants'
import { getItem, removeItem, setItem } from './storage'

const DEFAULT_BASE_URL = 'http://localhost:8082'
const BASE = import.meta.env.VITE_API_BASE_URL ?? DEFAULT_BASE_URL
export const API_BASE_URL = BASE

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'
type QueryValue = string | number | boolean | null | undefined
type QueryParams = Record<string, QueryValue | QueryValue[]>

interface AuthTokens {
  access_token: string
  refresh_token: string
  device_id: string
}

// Backend returns camelCase — map to our internal snake_case storage format
interface RefreshApiResponse {
  accessToken: string
  refreshToken: string
  expiresInSec?: number
  refreshExpiresInSec?: number
}

export interface ApiError extends Error {
  status: number
  message: string
}

let refreshPromise: Promise<AuthTokens | null> | null = null

function getTokens(): AuthTokens | null {
  const auth = getItem<Partial<AuthTokens>>(STORAGE_KEYS.AUTH)

  if (!auth?.access_token || !auth?.refresh_token || !auth?.device_id) {
    return null
  }

  return {
    access_token: auth.access_token,
    refresh_token: auth.refresh_token,
    device_id: auth.device_id,
  }
}

function setTokens(tokens: AuthTokens): void {
  const current = getItem<Record<string, unknown>>(STORAGE_KEYS.AUTH) ?? {}
  setItem(STORAGE_KEYS.AUTH, {
    ...current,
    ...tokens,
  })
}

function clearAuth(): void {
  removeItem(STORAGE_KEYS.AUTH)
  window.location.hash = '#/auth'
}

function buildUrl(path: string, params?: QueryParams): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const url = new URL(normalizedPath, BASE)

  if (!params) return url.toString()

  for (const [key, rawValue] of Object.entries(params)) {
    if (rawValue === undefined || rawValue === null) continue

    const values = Array.isArray(rawValue) ? rawValue : [rawValue]
    for (const value of values) {
      if (value === undefined || value === null) continue
      url.searchParams.append(key, String(value))
    }
  }

  return url.toString()
}

async function parseBody<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T
  }

  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    return await response.json() as T
  }

  return await response.text() as T
}

async function createApiError(response: Response): Promise<ApiError> {
  let message = response.statusText || 'Request failed'

  try {
    const contentType = response.headers.get('content-type') ?? ''
    if (contentType.includes('application/json')) {
      const payload = await response.json() as { message?: string; error?: string; detail?: string }
      message = payload.message ?? payload.error ?? payload.detail ?? message
    } else {
      const text = await response.text()
      if (text) message = text
    }
  } catch {
    // Ignore body parsing failures and keep the default message.
  }

  const error = new Error(message) as ApiError
  error.status = response.status
  error.message = message
  return error
}

async function refreshTokens(): Promise<AuthTokens | null> {
  if (refreshPromise) return refreshPromise

  const tokens = getTokens()
  if (!tokens) {
    clearAuth()
    return null
  }

  refreshPromise = (async () => {
    try {
      const response = await fetch(buildUrl('/auth/token/refresh'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refreshToken: tokens.refresh_token,
          deviceId: tokens.device_id,
        }),
      })

      if (!response.ok) {
        throw await createApiError(response)
      }

      const raw = await parseBody<RefreshApiResponse>(response)
      const refreshed: AuthTokens = {
        access_token: raw.accessToken,
        refresh_token: raw.refreshToken,
        device_id: tokens.device_id,
      }
      setTokens(refreshed)
      return refreshed
    } catch {
      clearAuth()
      return null
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

async function send<T>(
  method: HttpMethod,
  path: string,
  body?: unknown,
  params?: QueryParams,
  retryAfterRefresh = true,
): Promise<T> {
  const tokens = getTokens()
  const headers = new Headers()

  if (body !== undefined) {
    headers.set('Content-Type', 'application/json')
  }

  if (tokens?.access_token) {
    headers.set('Authorization', `Bearer ${tokens.access_token}`)
  }

  let response: Response

  try {
    response = await fetch(buildUrl(path, params), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch (cause) {
    const error = new Error('Network request failed') as ApiError
    error.status = 0
    error.message = cause instanceof Error && cause.message ? cause.message : 'Network request failed'
    throw error
  }

  if (response.status === 401 && retryAfterRefresh && path !== '/auth/token/refresh') {
    const refreshed = await refreshTokens()
    if (!refreshed) {
      const error = new Error('Unauthorized') as ApiError
      error.status = 401
      error.message = 'Unauthorized'
      throw error
    }

    return send<T>(method, path, body, params, false)
  }

  if (!response.ok) {
    throw await createApiError(response)
  }

  return parseBody<T>(response)
}

async function request<T>(
  method: HttpMethod,
  path: string,
  body?: unknown,
  params?: QueryParams,
): Promise<T> {
  return send<T>(method, path, body, params)
}

async function requestBlob(
  path: string,
  params?: QueryParams,
  retryAfterRefresh = true,
): Promise<Blob> {
  const tokens = getTokens()
  const headers = new Headers()

  if (tokens?.access_token) {
    headers.set('Authorization', `Bearer ${tokens.access_token}`)
  }

  let response: Response

  try {
    response = await fetch(buildUrl(path, params), {
      method: 'GET',
      headers,
    })
  } catch (cause) {
    const error = new Error('Network request failed') as ApiError
    error.status = 0
    error.message = cause instanceof Error && cause.message ? cause.message : 'Network request failed'
    throw error
  }

  if (response.status === 401 && retryAfterRefresh && path !== '/auth/token/refresh') {
    const refreshed = await refreshTokens()
    if (!refreshed) {
      const error = new Error('Unauthorized') as ApiError
      error.status = 401
      error.message = 'Unauthorized'
      throw error
    }

    return requestBlob(path, params, false)
  }

  if (!response.ok) {
    throw await createApiError(response)
  }

  return response.blob()
}

function get<T>(path: string, params?: QueryParams): Promise<T> {
  return request<T>('GET', path, undefined, params)
}

function post<T>(path: string, body?: unknown): Promise<T> {
  return request<T>('POST', path, body)
}

function put<T>(path: string, body?: unknown): Promise<T> {
  return request<T>('PUT', path, body)
}

function del<T>(path: string): Promise<T> {
  return request<T>('DELETE', path)
}

export const api = {
  get,
  getBlob: requestBlob,
  post,
  put,
  delete: del,
}
