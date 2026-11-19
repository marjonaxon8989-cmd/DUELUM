// cloudflare-worker.js
//
// A tiny backend for the "AI Yordamchi" screen. It keeps your Anthropic API
// key secret on the server, and only ever sends the visitor's message and
// Claude's reply back and forth — the key itself never reaches the browser.
//
// WHY YOU NEED THIS FILE:
// A static website (HTML/CSS/JS only, like the rest of this project) has
// nowhere safe to keep a secret: anything in the JS is visible to every
// visitor via "View Source". So the API key must live here instead, on a
// small server that only you control.
//
// COST:
//  - Cloudflare Workers FREE plan: 100 000 requests/day, no credit card.
//    If you outgrow it, the paid Workers plan is a billing switch in the
//    dashboard — this file does not change.
//  - The Anthropic API itself is pay-as-you-go (billed per token by
//    Anthropic, not by Cloudflare). Set a monthly spend limit in
//    https://console.anthropic.com -> Settings -> Limits so a busy day can
//    never surprise you. The cheapest model is used by default (see MODEL).
//
// HOW TO DEPLOY (option A — in the browser, no install):
//   1. Go to https://dash.cloudflare.com -> Workers & Pages -> Create -> Worker.
//   2. Paste this whole file's contents into the editor, replacing the
//      default code, and click Deploy.
//   3. Open the Worker's Settings -> Variables and Secrets -> Add,
//      type: Secret, name: ANTHROPIC_API_KEY, value: your Anthropic key. Save.
//      (Optional) add a plain variable ALLOWED_ORIGIN = https://your-site.netlify.app
//      so only your own site can use the Worker.
//   4. Copy the Worker's URL (https://<name>.<subdomain>.workers.dev).
//   5. In js/app.js set AI_PROXY_URL to that URL, then re-deploy your site.
//
// HOW TO DEPLOY (option B — from a terminal, needs Node.js 18+):
//   cd server
//   npx wrangler login
//   npx wrangler deploy                 # uses server/wrangler.toml
//   npx wrangler secret put ANTHROPIC_API_KEY
//
// Never paste a real key into a chat, a prompt, or any code file — only into
// Cloudflare's own Secret field (or `wrangler secret put`). If a key was ever
// typed anywhere else, delete it at https://console.anthropic.com/settings/keys
// and create a new one.

const MODEL = 'claude-haiku-5-5';   // cheapest; change to 'claude-sonnet-5-5' for smarter answers
const MAX_TOKENS = 800;
const MAX_INPUT_CHARS = 2000;

const SYSTEM_PROMPTS = {
  uz: "Siz O'zbekiston maktab o'quvchilariga yordam beradigan do'stona o'qituvchisiz. Qisqa, aniq va o'zbek tilida javob bering. Javobni to'g'ridan-to'g'ri aytib qo'ymasdan, tushuntirib bering.",
  ru: "Вы дружелюбный учитель, помогающий школьникам Узбекистана. Отвечайте кратко, понятно и по-русски, объясняя ход решения.",
  en: "You are a friendly tutor helping school students in Uzbekistan. Answer briefly and clearly in English, explaining the reasoning.",
};

export default {
  async fetch(request, env) {
    const origin = env.ALLOWED_ORIGIN || '*';
    const cors = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Vary': 'Origin',
    };
    const json = (obj, status = 200) =>
      new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' } });

    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
    if (!env.ANTHROPIC_API_KEY) return json({ error: 'ANTHROPIC_API_KEY secret is not set on the Worker' }, 500);

    let body;
    try { body = await request.json(); } catch { return json({ error: 'invalid JSON' }, 400); }
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    if (!message) return json({ error: 'message is required' }, 400);
    const lang = SYSTEM_PROMPTS[body.lang] ? body.lang : 'uz';

    try {
      const upstream = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY, // read from the Worker secret, never from the request
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: env.MODEL || MODEL,
          max_tokens: MAX_TOKENS,
          system: SYSTEM_PROMPTS[lang],
          messages: [{ role: 'user', content: message.slice(0, MAX_INPUT_CHARS) }],
        }),
      });

      const data = await upstream.json().catch(() => ({}));
      if (!upstream.ok) {
        // Pass a short reason back (e.g. "rate_limit_error", "authentication_error") — never the key.
        const reason = (data.error && (data.error.type || data.error.message)) || ('HTTP ' + upstream.status);
        return json({ error: reason }, 502);
      }
      const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim() || 'Javob topilmadi.';
      return json({ text });
    } catch (err) {
      return json({ error: 'upstream request failed' }, 502);
    }
  },
};
