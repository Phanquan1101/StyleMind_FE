export type NotificationType = 'order' | 'account' | 'system' | 'ai'

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  body: string
  read: boolean
  createdAt: string
  link: string | null
}
