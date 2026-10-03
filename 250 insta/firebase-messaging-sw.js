importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCLBrcIar8Ept6qOAxhziWJ7lk2_Q_RrH4",
  authDomain: "instgram-22bd0.firebaseapp.com",
  projectId: "instgram-22bd0",
  storageBucket: "instgram-22bd0.firebasestorage.app",
  messagingSenderId: "566834350316",
  appId: "1:566834350316:web:c19f642462bff922f17dc9"
});

var messaging = firebase.messaging();

// الرسائل نوعها data فقط، نعرضوها نحن (وبنفس الـ tag باش ما تتكررش)
messaging.onBackgroundMessage(function (payload) {
  var d = payload.data || {};
  return self.registration.showNotification(d.title || 'تواصل', {
    body: d.body || '',
    tag: d.tag || 'tawasol',
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    dir: 'rtl',
    lang: 'ar',
    data: { url: d.url || './' }
  });
});

self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var url = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
    for (var i = 0; i < list.length; i++) { if ('focus' in list[i]) return list[i].focus(); }
    return self.clients.openWindow(url);
  }));
});
