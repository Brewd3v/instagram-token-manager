import cron from 'node-cron';
import { getAllTokens, updateToken } from './db.js';
import { refreshAccessToken } from './oauth.js';

export async function refreshAllTokens(): Promise<void> {
  const tokens = getAllTokens();
  if (!tokens.length) {
    console.log('[cron] No tokens to refresh');
    return;
  }

  for (const token of tokens) {
    const now = Math.floor(Date.now() / 1000);
    const daysUntilExpiry = (token.expires_at - now) / 86400;

    if (daysUntilExpiry > 30) {
      console.log(`[cron] Token for @${token.username} expires in ${Math.round(daysUntilExpiry)} days — skipping`);
      continue;
    }

    console.log(`[cron] Refreshing token for @${token.username} (${Math.round(daysUntilExpiry)} days remaining)`);

    try {
      const refreshed = await refreshAccessToken(token.access_token);
      const newExpiresAt = now + refreshed.expires_in;
      updateToken(token.id, refreshed.access_token, newExpiresAt, now);
      console.log(`[cron] Refreshed token for @${token.username}, new expiry: ${new Date(newExpiresAt * 1000).toISOString()}`);
    } catch (err) {
      console.error(`[cron] Refresh failed for @${token.username}:`, err);
    }
  }
}

export function startCron(): void {
  // Every Monday at 09:00
  cron.schedule('0 9 * * 1', () => {
    console.log('[cron] Monday refresh check triggered');
    refreshAllTokens().catch((err) => console.error('[cron] Unhandled error:', err));
  });
  console.log('[cron] Scheduled: every Monday at 09:00');
}
