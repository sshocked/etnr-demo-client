import type { AppSettings } from './constants'
import { STORAGE_KEYS } from './constants'

/**
 * Type-safe localStorage wrapper with JSON serialization.
 */
export function getItem<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function setItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.error(`[storage] Failed to write key "${key}":`, e)
  }
}

export function removeItem(key: string): void {
  localStorage.removeItem(key)
}

export function clear(): void {
  Object.values(STORAGE_KEYS).forEach((key) => {
    localStorage.removeItem(key)
  })
}

// ── Auth helpers ──────────────────────────────────────────────

export interface AuthState {
  isAuthenticated: boolean
  phone: string | null
}

export function getAuth(): AuthState {
  const auth = getItem<Partial<AuthState> & { access_token?: string }>(STORAGE_KEYS.AUTH) ?? {}

  return {
    isAuthenticated: Boolean(auth.access_token || auth.isAuthenticated),
    phone: auth.phone ?? null,
  }
}

export function setAuth(state: AuthState): void {
  const current = getItem<Record<string, unknown>>(STORAGE_KEYS.AUTH) ?? {}
  setItem(STORAGE_KEYS.AUTH, { ...current, ...state })
}

export function clearAuth(): void {
  removeItem(STORAGE_KEYS.AUTH)
}

// ── Settings helpers ──────────────────────────────────────────

const DEFAULT_SETTINGS: AppSettings = {
  simulateErrors: false,
  simulateDelay: true,
  delayMs: 600,
  darkMode: false,
}

export function getSettings(): AppSettings {
  return getItem<AppSettings>(STORAGE_KEYS.SETTINGS) ?? DEFAULT_SETTINGS
}

export function setSettings(settings: Partial<AppSettings>): void {
  const current = getSettings()
  setItem(STORAGE_KEYS.SETTINGS, { ...current, ...settings })
}

// ── Simulated async delay ─────────────────────────────────────

export function simulateDelay(): Promise<void> {
  const { simulateDelay: enabled, delayMs } = getSettings()
  if (!enabled) return Promise.resolve()
  return new Promise((resolve) => setTimeout(resolve, delayMs))
}

export function shouldSimulateError(): boolean {
  return getSettings().simulateErrors
}
