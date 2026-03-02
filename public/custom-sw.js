// GlowPush Custom Service Worker for Push Notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event);
  let data = { title: 'Glow Push ✨', body: 'יש לך עדכון חדש!', icon: '/pwa-192.png', data: {} };
  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
    }
  } catch (e) {
    console.error('[SW] Failed to parse push data:', e);
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/pwa-192.png',
      badge: '/pwa-192.png',
      data: data.data || {},
      vibrate: [200, 100, 200],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification.data);
  event.notification.close();
  const url = event.notification.data?.url || '/client';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(url) && 'focus' in client) return client.focus();
      }
      return clients.openWindow(url);
    })
  );
});
