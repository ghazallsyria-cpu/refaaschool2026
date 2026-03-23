// public/sw.js
// Service Worker لاستقبال إشعارات Push

self.addEventListener(‘push’, function (event) {
if (!event.data) return;

const data = event.data.json();

const options = {
body: data.body || ‘’,
icon: ‘/icon-192.png’,
badge: ‘/icon-72.png’,
dir: ‘rtl’,
lang: ‘ar’,
vibrate: [200, 100, 200],
data: {
url: data.url || ‘/’,
},
actions: [
{ action: ‘open’, title: ‘فتح’ },
{ action: ‘close’, title: ‘إغلاق’ },
],
};

event.waitUntil(
self.registration.showNotification(data.title || ‘مدرسة الرفعة’, options)
);
});

self.addEventListener(‘notificationclick’, function (event) {
event.notification.close();

if (event.action === ‘close’) return;

const url = event.notification.data?.url || ‘/’;

event.waitUntil(
clients.matchAll({ type: ‘window’, includeUncontrolled: true }).then((clientList) => {
// إذا كان التطبيق مفتوحاً بالفعل، انتقل للصفحة المطلوبة
for (const client of clientList) {
if (client.url.includes(self.location.origin) && ‘focus’ in client) {
client.focus();
client.navigate(url);
return;
}
}
// افتح نافذة جديدة
if (clients.openWindow) {
return clients.openWindow(url);
}
})
);
});