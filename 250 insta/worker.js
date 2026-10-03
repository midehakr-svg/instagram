// Cloudflare Worker: يبعث إشعارات FCM
// Secrets/Variables المطلوبة (Settings > Variables and Secrets):
//   SERVICE_ACCOUNT : محتوى ملف JSON كامل تاع Firebase (Secret)
//   JSONBIN_KEY     : مفتاح jsonbin (Secret)
//   BIN_ID          : معرّف الـ bin (نص عادي)
//   ALLOWED_ORIGIN  : رابط تطبيقك، مثال https://instgram-22bd0.web.app (نص عادي)

const PROJECT_ID = 'instgram-22bd0';

const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
const b64uStr = (s) => b64u(new TextEncoder().encode(s));

async function accessToken(env) {
  const sa = JSON.parse(env.SERVICE_ACCOUNT);
  const now = Math.floor(Date.now() / 1000);
  const head = b64uStr(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64uStr(JSON.stringify({
    iss: sa.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600
  }));
  const pem = sa.private_key.replace(/-----[A-Z ]+-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(head + '.' + claim));
  const jwt = head + '.' + claim + '.' + b64u(sig);
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=' + jwt
  });
  return (await r.json()).access_token;
}

export default {
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (request.method !== 'POST') return new Response('ok', { headers: cors });

    let p;
    try { p = await request.json(); } catch (e) { return new Response('bad', { status: 400, headers: cors }); }
    const { type, from, to, text } = p;
    if (!from || !to || from === to) return new Response('bad', { status: 400, headers: cors });

    const r = await fetch('https://api.jsonbin.io/v3/b/' + env.BIN_ID + '/latest', { headers: { 'X-Master-Key': env.JSONBIN_KEY } });
    const db = (await r.json()).record || {};

    // نتأكد أن الحدث حقيقي (موجود في قاعدة البيانات) باش ما يتبعثش إزعاج
    let ok = false, title, body, tag, url = './';
    if (type === 'msg') {
      ok = (db.messages || []).slice(-30).some((m) => m.sender === from && m.receiver === to && m.text === text);
      title = 'رسالة جديدة من ' + from; body = String(text || '').slice(0, 120); tag = 'msg-' + from;
    } else if (type === 'follow') {
      ok = !!(db.users && db.users[to] && (db.users[to].followers || []).indexOf(from) > -1);
      title = 'متابع جديد'; body = from + ' بدأ يتابعك'; tag = 'fol-' + from;
    }
    if (!ok) return new Response('rejected', { status: 403, headers: cors });

    const tokens = (db.tokens && db.tokens[to]) || [];
    if (!tokens.length) return new Response('no tokens', { headers: cors });

    const at = await accessToken(env);
    await Promise.all(tokens.map((token) => fetch('https://fcm.googleapis.com/v1/projects/' + PROJECT_ID + '/messages:send', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + at, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: { token, data: { title, body, tag, url }, webpush: { headers: { Urgency: 'high', TTL: '86400' } } } })
    })));
    return new Response('sent', { headers: cors });
  }
};
