import { Notification } from '../types';
import { db, isFirebaseConfigured } from '../firebase/config';
import { collection, doc, setDoc, getDocs, updateDoc, query, where, orderBy, writeBatch } from 'firebase/firestore';

const NOTIFS_STORAGE_KEY = 'vayora_notifications';

export function getStoredNotifications(): Notification[] {
  try {
    const saved = localStorage.getItem(NOTIFS_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error('Error reading notifications', e);
  }
  return [];
}

export function saveStoredNotifications(notifs: Notification[]): void {
  try {
    localStorage.setItem(NOTIFS_STORAGE_KEY, JSON.stringify(notifs));
    window.dispatchEvent(new Event('vayora_notifs_updated'));
  } catch (e) {
    console.error('Error saving notifications', e);
  }
}

export async function getNotificationsByUser(userId: string): Promise<Notification[]> {
  if (isFirebaseConfigured() && db) {
    try {
      const q = query(collection(db, 'notifications'), where('userId', '==', userId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const list: Notification[] = [];
        snap.forEach((d) => list.push(d.data() as Notification));
        return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
    } catch (e) {
      console.error('Firestore notifications query error:', e);
    }
  }
  return getStoredNotifications().filter((n) => n.userId === userId);
}

export async function addNotification(
  userId: string,
  title: string,
  message: string,
  type: Notification['type'],
  link?: string
): Promise<Notification> {
  const notifId = `notif_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;
  const newNotif: Notification = {
    id: notifId,
    userId,
    title,
    message,
    type,
    read: false,
    link,
    createdAt: new Date().toISOString(),
  };

  if (isFirebaseConfigured() && db) {
    try {
      await setDoc(doc(db, 'notifications', notifId), newNotif);
    } catch (e) {
      console.error('Firestore notification write error:', e);
    }
  }

  const current = getStoredNotifications();
  saveStoredNotifications([newNotif, ...current]);
  return newNotif;
}

export async function markAsRead(notificationId: string): Promise<void> {
  if (isFirebaseConfigured() && db) {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), { read: true });
    } catch (e) {
      console.error('Firestore markAsRead error:', e);
    }
  }
  const current = getStoredNotifications();
  const updated = current.map((n) => (n.id === notificationId ? { ...n, read: true } : n));
  saveStoredNotifications(updated);
}

export async function markAllAsRead(userId: string): Promise<void> {
  if (isFirebaseConfigured() && db) {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('read', '==', false)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const batch = writeBatch(db);
        snap.forEach((d) => {
          batch.update(d.ref, { read: true, updatedAt: new Date().toISOString() });
        });
        await batch.commit();
      }
    } catch (e) {
      console.error('Firestore markAllAsRead batch error:', e);
    }
  }

  const current = getStoredNotifications();
  const updated = current.map((n) => (n.userId === userId ? { ...n, read: true } : n));
  saveStoredNotifications(updated);
}
