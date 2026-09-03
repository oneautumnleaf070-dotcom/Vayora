// Ports notificationService.ts. Notifications are now created exclusively
// server-side, atomically alongside the mutation that triggers them (offer
// accepted, delivery status changed, etc — see the Go backend's
// notifications.Create calls) rather than as a separate client-side write
// after the fact, which closes a race the original design had (a client
// crash between the Firestore write and the notification write would drop
// the notification).
import { Notification } from '../types';
import { api } from '../api/client';

export function getStoredNotifications(): Notification[] {
  // Kept for backward compatibility; notifications are always fetched fresh
  // via getNotificationsByUser now, so this local mirror is unused.
  return [];
}

export function saveStoredNotifications(_notifs: Notification[]): void {
  window.dispatchEvent(new Event('vayora_notifs_updated'));
}

export async function getNotificationsByUser(userId: string): Promise<Notification[]> {
  try {
    return await api.get<Notification[]>('/notifications');
  } catch (e) {
    console.error('Error fetching notifications', e);
    return [];
  }
}

// Notifications are created server-side as part of the triggering mutation
// now (see the package doc above) — this remains exported only so no
// lingering call site breaks; it intentionally does not hit the network.
export async function addNotification(
  userId: string,
  title: string,
  message: string,
  type: Notification['type'],
  link?: string
): Promise<Notification> {
  return {
    id: `local_${Date.now()}`,
    userId,
    title,
    message,
    type,
    read: false,
    link,
    createdAt: new Date().toISOString(),
  };
}

export async function markAsRead(notificationId: string): Promise<void> {
  try {
    await api.patch(`/notifications/${notificationId}/read`, {});
  } catch (e) {
    console.error('Error marking notification read', e);
  }
}

export async function markAllAsRead(_userId: string): Promise<void> {
  try {
    await api.patch('/notifications/read-all', {});
  } catch (e) {
    console.error('Error marking all notifications read', e);
  }
}
