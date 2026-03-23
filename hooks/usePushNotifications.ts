// hooks/usePushNotifications.ts
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  // تسجيل Service Worker عند تحميل الصفحة
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.log('Service Worker registered:', reg.scope);
      })
      .catch((err) => {
        console.error('Service Worker registration failed:', err);
      });

    setPermission(Notification.permission);
  }, []);

  // الاشتراك في الإشعارات
  const subscribe = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert('متصفحك لا يدعم الإشعارات');
      return;
    }

    setLoading(true);
    try {
      // طلب إذن الإشعارات
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== 'granted') {
        alert('يرجى السماح بالإشعارات لاستقبال تنبيهات الغياب');
        setLoading(false);
        return;
      }

      // الحصول على Service Worker المسجل
      const registration = await navigator.serviceWorker.ready;

      // الاشتراك في Push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        ),
      });

      // إرسال الاشتراك للسيرفر
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ subscription }),
      });

      if (response.ok) {
        setSubscribed(true);
        console.log('Push subscription saved successfully');
      }
    } catch (error) {
      console.error('Failed to subscribe to push:', error);
    } finally {
      setLoading(false);
    }
  };

  // إلغاء الاشتراك
  const unsubscribe = async () => {
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) await subscription.unsubscribe();

      const { data: { session } } = await supabase.auth.getSession();
      await fetch('/api/push/subscribe', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session?.access_token}` },
      });

      setSubscribed(false);
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
    } finally {
      setLoading(false);
    }
  };

  return { permission, subscribed, loading, subscribe, unsubscribe };
}

// تحويل VAPID public key من Base64 لـ Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
