import type { TokenRow } from './db.js';

export function renderDashboard(token: TokenRow | null): string {
  const now = Math.floor(Date.now() / 1000);
  const statusSection = token ? renderConnected(token, now) : renderDisconnected();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Instagram Token Manager</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0f0f0f;
      color: #e0e0e0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }
    .card {
      background: #1a1a1a;
      border: 1px solid #2a2a2a;
      border-radius: 12px;
      padding: 2rem;
      max-width: 480px;
      width: 100%;
    }
    h1 {
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 1.5rem;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .badge {
      display: inline-block;
      padding: 0.2em 0.6em;
      border-radius: 999px;
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .badge-connected { background: #1a3a1a; color: #4caf50; border: 1px solid #4caf50; }
    .badge-disconnected { background: #3a1a1a; color: #ef5350; border: 1px solid #ef5350; }
    .badge-warning { background: #3a2a0a; color: #ffb74d; border: 1px solid #ffb74d; }
    table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
    td { padding: 0.5rem 0; font-size: 0.875rem; }
    td:first-child { color: #888; width: 45%; }
    td:last-child { color: #e0e0e0; font-weight: 500; }
    .actions { margin-top: 1.5rem; display: flex; gap: 0.75rem; flex-wrap: wrap; }
    .btn {
      display: inline-flex;
      align-items: center;
      padding: 0.5rem 1.25rem;
      border-radius: 6px;
      font-size: 0.875rem;
      font-weight: 500;
      text-decoration: none;
      cursor: pointer;
      border: none;
      transition: opacity 0.15s;
    }
    .btn:hover { opacity: 0.85; }
    .btn-primary { background: #e1306c; color: #fff; }
    .btn-danger { background: #2a1a1a; color: #ef5350; border: 1px solid #ef5350; }
    .token-preview {
      font-family: monospace;
      font-size: 0.75rem;
      background: #111;
      border: 1px solid #222;
      border-radius: 6px;
      padding: 0.75rem;
      word-break: break-all;
      color: #888;
      margin-top: 1rem;
    }
    .divider { border: none; border-top: 1px solid #2a2a2a; margin: 1.25rem 0; }
    .endpoints { font-size: 0.8rem; color: #666; }
    .endpoints code {
      background: #111;
      padding: 0.15em 0.4em;
      border-radius: 4px;
      color: #aaa;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>📷 Instagram Token Manager</h1>
    ${statusSection}
  </div>
</body>
</html>`;
}

function renderConnected(token: TokenRow, now: number): string {
  const expiresAt = new Date(token.expires_at * 1000);
  const daysLeft = Math.round((token.expires_at - now) / 86400);
  const lastRefreshed = token.last_refreshed_at
    ? new Date(token.last_refreshed_at * 1000).toLocaleString()
    : 'Never (initial connect)';
  const createdAt = new Date(token.created_at * 1000).toLocaleString();

  const statusBadge =
    daysLeft <= 7
      ? `<span class="badge badge-warning">Expiring Soon</span>`
      : `<span class="badge badge-connected">Connected</span>`;

  const tokenPreview =
    token.access_token.length > 40
      ? token.access_token.slice(0, 20) + '…' + token.access_token.slice(-10)
      : token.access_token;

  return `
    <div style="margin-bottom:1rem">${statusBadge}</div>
    <table>
      <tr><td>Username</td><td>@${escapeHtml(token.username ?? 'unknown')}</td></tr>
      <tr><td>Expires</td><td>${expiresAt.toLocaleDateString()} (${daysLeft}d)</td></tr>
      <tr><td>Last refreshed</td><td>${lastRefreshed}</td></tr>
      <tr><td>Connected</td><td>${createdAt}</td></tr>
    </table>

    <div class="token-preview">${escapeHtml(tokenPreview)}</div>

    <hr class="divider">

    <div class="endpoints">
      API endpoints:<br>
      <code>/token.json</code> — JSON with token, expiry, username<br>
      <code>/token.js</code> — JS: <code>const InstagramToken = "...";</code>
    </div>

    <div class="actions">
      <a href="/connect" class="btn btn-primary">Reconnect</a>
      <form method="POST" action="/disconnect" style="display:inline">
        <button type="submit" class="btn btn-danger"
          onclick="return confirm('Disconnect and delete stored token?')">
          Disconnect
        </button>
      </form>
    </div>
  `;
}

function renderDisconnected(): string {
  return `
    <div style="margin-bottom:1rem"><span class="badge badge-disconnected">Not Connected</span></div>
    <p style="color:#888; font-size:0.9rem; margin-bottom:1.5rem">
      No Instagram account connected. Click below to authorize via Instagram OAuth.
    </p>
    <div class="actions">
      <a href="/connect" class="btn btn-primary">Connect Instagram</a>
    </div>
  `;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
