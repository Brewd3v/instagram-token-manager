import 'dotenv/config';
import { Hono } from 'hono';
import type { Context } from 'hono';
import { serve } from '@hono/node-server';
import { getStoredToken, upsertToken, deleteAllTokens } from './db.js';
import { renderDashboard } from './dashboard.js';
import { buildAuthUrl, exchangeCodeForShortLived, exchangeForLongLived, fetchUsername } from './oauth.js';
import { startCron } from './cron.js';

const app = new Hono();

function checkReferer(c: Context): boolean {
  const allowedDomains = process.env.ALLOWED_DOMAINS;
  if (!allowedDomains) return true;

  const path = new URL(c.req.url).pathname;
  if (!path.startsWith('/token')) return true;

  const referer = c.req.header('Referer') ?? c.req.header('Origin') ?? '';
  if (!referer) return false;

  const allowed = allowedDomains.split(',').map((d) => d.trim());
  return allowed.some((domain) => referer.includes(domain));
}

app.get('/', (c) => {
  const token = getStoredToken();
  return c.html(renderDashboard(token));
});

app.get('/connect', (c) => {
  const appId = process.env.INSTAGRAM_APP_ID!;
  const workerUrl = process.env.WORKER_URL!;
  return c.redirect(buildAuthUrl(appId, workerUrl), 302);
});

app.get('/callback', async (c) => {
  const code = c.req.query('code');
  const error = c.req.query('error');

  if (error || !code) {
    const desc = c.req.query('error_description') ?? error ?? 'Unknown error';
    return c.text(`OAuth error: ${desc}`, 400);
  }

  try {
    const appId = process.env.INSTAGRAM_APP_ID!;
    const appSecret = process.env.INSTAGRAM_APP_SECRET!;
    const workerUrl = process.env.WORKER_URL!;

    const shortLived = await exchangeCodeForShortLived(code, appId, appSecret, workerUrl);
    const longLived = await exchangeForLongLived(shortLived.access_token, appSecret);
    const username = await fetchUsername(longLived.access_token);

    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + longLived.expires_in;

    upsertToken(shortLived.user_id, username, longLived.access_token, expiresAt, now);

    return c.redirect(`${workerUrl}/`, 302);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.text(msg, 500);
  }
});

app.get('/token.json', (c) => {
  if (!checkReferer(c)) return c.json({ error: 'Forbidden' }, 403);

  const token = getStoredToken();
  if (!token) return c.json({ error: 'No token stored' }, 404);

  return c.json({
    token: token.access_token,
    expires_at: new Date(token.expires_at * 1000).toISOString(),
    username: token.username,
  });
});

app.get('/token.js', (c) => {
  if (!checkReferer(c)) {
    return c.text('const InstagramToken = null; // Forbidden', 403, {
      'Content-Type': 'application/javascript',
    });
  }

  const token = getStoredToken();
  const body = token
    ? `const InstagramToken = "${token.access_token}";`
    : 'const InstagramToken = null;';

  return c.text(body, 200, { 'Content-Type': 'application/javascript' });
});

app.post('/disconnect', (c) => {
  deleteAllTokens();
  const workerUrl = process.env.WORKER_URL!;
  return c.redirect(`${workerUrl}/`, 302);
});

const port = parseInt(process.env.PORT ?? '3000', 10);

startCron();

serve({ fetch: app.fetch, port }, () => {
  console.log(`[server] Instagram Token Manager running on port ${port}`);
});
