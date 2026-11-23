// bot/server.js — DUELUM Telegram bot + small API for the website.
// Zero dependencies (Node 18+ built-ins only), so `npm install` is not needed.
//
// What it does:
//   • Telegram bot (webhook): /start with MANDATORY channel subscription —
//     until the user joins the channel they only see "Subscribe" + "Check".
//   • POST /api/verify  — the website sends the Telegram Login data; the server
//     checks its signature (so it can't be faked) and whether the user is
//     subscribed to the channel.
//   • POST /api/notify  — after a sign-up, sends the admin a message with the
//     new player's name, surname, 8-digit ID and Telegram account.
//   • GET  /health      — used by the site to wake the free server early.
//
// Environment variables (set them in Render -> the service -> Environment):
//   BOT_TOKEN      (secret!) token from @BotFather — never put it in code or GitHub
//   ADMIN_CHAT_ID  your Telegram numeric id (receives the sign-up messages)
//   CHANNEL        channel username with @, e.g. @duelum (bot must be its ADMIN)
//   SITE_URL       https://duelum.onrender.com (button in the bot + CORS)
// Render sets PORT and RENDER_EXTERNAL_URL automatically; the webhook is
// registered with Telegram on every start, so nothing else needs configuring.

const http = require('http');
const crypto = require('crypto');

const TOKEN = process.env.BOT_TOKEN || '';
const ADMIN = process.env.ADMIN_CHAT_ID || '';
const CHANNEL = process.env.CHANNEL || '@duelum';
const SITE = (process.env.SITE_URL || 'https://duelum.onrender.com').replace(/\/$/, '');
const PUBLIC_URL = (process.env.RENDER_EXTERNAL_URL || process.env.PUBLIC_URL || '').replace(/\/$/, '');
const PORT = process.env.PORT || 3000;
// webhook path secret derived from the token (no extra setting needed)
const HOOK = TOKEN ? crypto.createHash('sha256').update('hook:' + TOKEN).digest('hex').slice(0, 32) : 'none';
const CHANNEL_URL = 'https://t.me/' + CHANNEL.replace(/^@/, '');
let BOT_NAME = '', WEBHOOK_OK = false;

async function tg(method, body) {
  const r = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {})
  });
  return r.json();
}
const escHtml = s => String(s == null ? '' : s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

// ---- channel membership: true / false, or null if it could not be checked ----
let warnedNotAdmin = false;
async function isSubscribed(userId) {
  try {
    const r = await tg('getChatMember', { chat_id: CHANNEL, user_id: userId });
    if (!r.ok) throw new Error(r.description);
    const st = r.result.status;
    return ['creator', 'administrator', 'member'].includes(st) || (st === 'restricted' && r.result.is_member);
  } catch (e) {
    console.error('getChatMember failed:', e.message);
    if (!warnedNotAdmin && ADMIN) {
      warnedNotAdmin = true;
      tg('sendMessage', { chat_id: ADMIN, text: `Diqqat: bot ${CHANNEL} kanalida obunani tekshira olmayapti (${e.message}). Botni kanalga ADMIN qilib qo'shing.` }).catch(() => {});
    }
    return null;
  }
}

// ---- Telegram Login Widget signature check ----
function checkLogin(auth) {
  if (!auth || !auth.hash || !auth.id) return false;
  const data = Object.keys(auth).filter(k => k !== 'hash' && auth[k] !== undefined && auth[k] !== null)
    .sort().map(k => `${k}=${auth[k]}`).join('\n');
  const secret = crypto.createHash('sha256').update(TOKEN).digest();
  const hash = crypto.createHmac('sha256', secret).update(data).digest('hex');
  const fresh = Date.now() / 1000 - Number(auth.auth_date || 0) < 86400;
  return fresh && crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(String(auth.hash).padEnd(hash.length).slice(0, hash.length)));
}

// ---- bot logic ----
function subscribeKeyboard() {
  return { inline_keyboard: [[{ text: "Kanalga obuna bo'lish", url: CHANNEL_URL }], [{ text: 'Tekshirish', callback_data: 'check_sub' }]] };
}
function siteKeyboard() {
  return { inline_keyboard: [[{ text: 'DUELUM saytini ochish', url: SITE }], [{ text: 'Kanal', url: CHANNEL_URL }]] };
}
async function welcome(chatId, user) {
  const sub = await isSubscribed(user.id);
  if (sub === false) {
    return tg('sendMessage', { chat_id: chatId, parse_mode: 'HTML', reply_markup: subscribeKeyboard(),
      text: `Assalomu alaykum, <b>${escHtml(user.first_name)}</b>!\n\nBotdan foydalanish uchun avval kanalimizga obuna bo'ling: ${CHANNEL}\nObuna bo'lgach, <b>Tekshirish</b> tugmasini bosing.` });
  }
  return tg('sendMessage', { chat_id: chatId, parse_mode: 'HTML', reply_markup: siteKeyboard(),
    text: `Assalomu alaykum, <b>${escHtml(user.first_name)}</b>!\n\n<b>DUELUM</b> — bilimlar dueli. Fanni tanlang, raqib bilan bellashing, reytingda yuqoriga chiqing.\n\nSaytga kirish uchun quyidagi tugmani bosing.` });
}
async function onUpdate(u) {
  if (u.message) {
    const m = u.message, text = (m.text || '').trim();
    if (m.chat.type !== 'private') return;
    if (text.startsWith('/start') || text === '/help') return welcome(m.chat.id, m.from);
    if (text === '/id') return tg('sendMessage', { chat_id: m.chat.id, text: `Sizning Telegram ID: ${m.from.id}` });
    return welcome(m.chat.id, m.from);
  }
  if (u.callback_query) {
    const q = u.callback_query;
    if (q.data === 'check_sub') {
      const sub = await isSubscribed(q.from.id);
      if (sub === false) return tg('answerCallbackQuery', { callback_query_id: q.id, text: "Siz hali kanalga obuna bo'lmagansiz.", show_alert: true });
      await tg('answerCallbackQuery', { callback_query_id: q.id, text: 'Rahmat! Obuna tasdiqlandi.' });
      return welcome(q.message.chat.id, q.from);
    }
    return tg('answerCallbackQuery', { callback_query_id: q.id });
  }
}

// ---- HTTP server ----
function send(res, code, obj, origin) {
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': origin && origin === SITE ? origin : SITE,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin'
  });
  res.end(JSON.stringify(obj));
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''; req.on('data', c => { data += c; if (data.length > 1e5) req.destroy(); });
    req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch (e) { reject(e); } }); req.on('error', reject);
  });
}
const hits = new Map(); // tiny rate limit per IP
function limited(req) {
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0];
  const now = Date.now(), arr = (hits.get(ip) || []).filter(t => now - t < 60000); arr.push(now); hits.set(ip, arr);
  return arr.length > 30;
}

http.createServer(async (req, res) => {
  const origin = req.headers.origin;
  try {
    if (req.method === 'OPTIONS') return send(res, 204, {}, origin);
    if (req.url === '/' || req.url === '/health') return send(res, 200, { ok: true, bot: !!TOKEN, username: BOT_NAME, webhook: WEBHOOK_OK }, origin);

    if (req.method === 'POST' && req.url === '/tg/' + HOOK) {
      if (req.headers['x-telegram-bot-api-secret-token'] !== HOOK) return send(res, 403, { ok: false });
      const update = await readBody(req);
      send(res, 200, { ok: true });                       // answer Telegram fast, work after
      onUpdate(update).catch(e => console.error('update failed', e));
      return;
    }

    if (req.method === 'POST' && req.url === '/api/verify') {
      if (limited(req)) return send(res, 429, { ok: false, error: 'rate' }, origin);
      const { auth } = await readBody(req);
      if (!TOKEN || !checkLogin(auth)) return send(res, 200, { ok: false, error: 'bad_signature' }, origin);
      const sub = await isSubscribed(auth.id);
      // could not check (bot is not a channel admin yet) -> let the user through
      return send(res, 200, { ok: true, subscribed: sub !== false, checked: sub !== null,
        user: { id: auth.id, username: auth.username || '', first_name: auth.first_name || '' } }, origin);
    }

    if (req.method === 'POST' && req.url === '/api/notify') {
      if (limited(req)) return send(res, 429, { ok: false }, origin);
      const b = await readBody(req);
      if (!TOKEN || !checkLogin(b.auth)) return send(res, 200, { ok: false, error: 'bad_signature' }, origin);
      if (ADMIN) {
        const a = b.auth, title = b.event === 'link' ? "Akkaunt Telegram'ga ulandi" : "Yangi ro'yxatdan o'tish";
        const text = `<b>${title}</b>\n\nIsm: ${escHtml(b.name)}\nFamiliya: ${escHtml(b.surname)}\nID raqami: <code>${escHtml(b.publicId)}</code>\n` +
          `Telegram: ${a.username ? '@' + escHtml(a.username) : '(username yo\'q)'} — <a href="tg://user?id=${Number(a.id)}">${escHtml(a.first_name || 'profil')}</a>\n` +
          `Telegram ID: <code>${Number(a.id)}</code>${b.country ? '\nDavlat kodi: ' + escHtml(b.country) : ''}`;
        await tg('sendMessage', { chat_id: ADMIN, text, parse_mode: 'HTML', disable_web_page_preview: true });
      }
      return send(res, 200, { ok: true }, origin);
    }

    send(res, 404, { ok: false }, origin);
  } catch (e) {
    console.error(e);
    send(res, 500, { ok: false }, origin);
  }
}).listen(PORT, async () => {
  console.log('DUELUM bot server on port', PORT);
  if (!TOKEN) { console.warn('BOT_TOKEN is not set — the bot is off until you add it in Render -> Environment.'); return; }
  if (!PUBLIC_URL) { console.warn('RENDER_EXTERNAL_URL/PUBLIC_URL not set — webhook not registered.'); return; }
  const me = await tg('getMe').catch(() => ({}));
  BOT_NAME = me.ok ? me.result.username : '';
  console.log('bot username:', BOT_NAME || '(getMe failed — check BOT_TOKEN)');
  const r = await tg('setWebhook', { url: `${PUBLIC_URL}/tg/${HOOK}`, secret_token: HOOK, allowed_updates: ['message', 'callback_query'], drop_pending_updates: false });
  WEBHOOK_OK = !!r.ok;
  console.log('setWebhook:', r.ok ? 'ok' : r.description);
  tg('setMyCommands', { commands: [{ command: 'start', description: 'Botni ishga tushirish' }, { command: 'id', description: 'Telegram ID ni ko\'rish' }] }).catch(() => {});
});
