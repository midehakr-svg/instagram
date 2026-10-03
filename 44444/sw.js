/* sw.js: يلزم يكون في نفس مجلد الصفحة (ويشتغل غير على https) */
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener('push', function (e) {
  var d = {}; try { d = e.data ? e.data.json() : {}; } catch (x) {}
  e.waitUntil(self.registration.showNotification(d.title || 'رسالة جديدة', { body: d.body || '', dir: 'rtl', lang: 'ar', tag: d.tag }));
});
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (l) {
    if (l.length) return l[0].focus();
    return self.clients.openWindow('./');
  }));
});
