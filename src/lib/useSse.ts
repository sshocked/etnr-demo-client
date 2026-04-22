import { useEffect, useRef } from 'react'

import { STORAGE_KEYS } from './constants'
import { getItem } from './storage'

const DEFAULT_BASE_URL = 'http://localhost:8082'
const BASE = import.meta.env.VITE_API_BASE_URL ?? DEFAULT_BASE_URL
const RECONNECT_DELAY_MS = 3000

interface AuthTokens {
  access_token: string
}

function getAccessToken(): string | null {
  const auth = getItem<Partial<AuthTokens>>(STORAGE_KEYS.AUTH)
  return auth?.access_token ?? null
}

function buildSseUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const url = new URL(normalizedPath, BASE)
  const token = getAccessToken()

  if (token) {
    url.searchParams.set('token', token)
  }

  return url.toString()
}

export function useSse(path: string, onEvent: (event: MessageEvent) => void): void {
  const onEventRef = useRef(onEvent)

  useEffect(() => {
    onEventRef.current = onEvent
  }, [onEvent])

  useEffect(() => {
    let isClosed = false
    let eventSource: EventSource | null = null
    let reconnectTimer: number | null = null

    const cleanupEventSource = () => {
      if (eventSource) {
        eventSource.close()
        eventSource = null
      }
    }

    const scheduleReconnect = () => {
      if (isClosed || reconnectTimer !== null) return

      reconnectTimer = window.setTimeout(() => {
        reconnectTimer = null
        connect()
      }, RECONNECT_DELAY_MS)
    }

    const connect = () => {
      cleanupEventSource()

      eventSource = new EventSource(buildSseUrl(path))
      eventSource.onmessage = (event) => {
        onEventRef.current(event)
      }
      eventSource.onerror = () => {
        cleanupEventSource()
        scheduleReconnect()
      }
    }

    connect()

    return () => {
      isClosed = true

      if (reconnectTimer !== null) {
        window.clearTimeout(reconnectTimer)
      }

      cleanupEventSource()
    }
  }, [path])
}
