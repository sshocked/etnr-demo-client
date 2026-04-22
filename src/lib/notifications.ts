import type { AppNotification, NotificationType } from './constants'

export interface NotificationApiItem {
  id: string
  kind: NotificationType
  title: string
  body: string
  entityId?: string
  isRead: boolean
  createdAt: string
}

export interface NotificationsResponse {
  notifications: NotificationApiItem[]
  nextCursor: string | null
}

export interface NotificationUnreadCountResponse {
  count: number
}

export const NOTIFICATIONS_UPDATED_EVENT = 'notifications:updated'

export function mapNotification(apiNotification: NotificationApiItem): AppNotification {
  return {
    id: apiNotification.id,
    type: apiNotification.kind,
    title: apiNotification.title,
    message: apiNotification.body,
    timestamp: apiNotification.createdAt,
    read: apiNotification.isRead,
    documentId: apiNotification.entityId,
  }
}

export function emitNotificationsUpdated(): void {
  window.dispatchEvent(new Event(NOTIFICATIONS_UPDATED_EVENT))
}
