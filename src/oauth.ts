export interface ShortLivedToken {
  access_token: string;
  user_id: string;
}

export interface LongLivedToken {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface RefreshedToken {
  access_token: string;
  expires_in: number;
}

export function buildAuthUrl(appId: string, workerUrl: string): string {
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: `${workerUrl}/callback`,
    scope: 'instagram_business_basic',
    response_type: 'code',
  });
  return `https://api.instagram.com/oauth/authorize?${params}`;
}

export async function exchangeCodeForShortLived(
  code: string,
  appId: string,
  appSecret: string,
  workerUrl: string
): Promise<ShortLivedToken> {
  const res = await fetch('https://api.instagram.com/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      grant_type: 'authorization_code',
      redirect_uri: `${workerUrl}/callback`,
      code,
    }),
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${await res.text()}`);
  return res.json() as Promise<ShortLivedToken>;
}

export async function exchangeForLongLived(
  shortLivedToken: string,
  appSecret: string
): Promise<LongLivedToken> {
  const res = await fetch(
    `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${appSecret}&access_token=${shortLivedToken}`
  );
  if (!res.ok) throw new Error(`Long-lived token exchange failed: ${await res.text()}`);
  return res.json() as Promise<LongLivedToken>;
}

export async function fetchUsername(accessToken: string): Promise<string | null> {
  const res = await fetch(`https://graph.instagram.com/me?fields=username&access_token=${accessToken}`);
  if (!res.ok) return null;
  const data = (await res.json()) as { username?: string };
  return data.username ?? null;
}

export async function refreshAccessToken(accessToken: string): Promise<RefreshedToken> {
  const res = await fetch(
    `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${accessToken}`
  );
  if (!res.ok) throw new Error(`Refresh failed: ${await res.text()}`);
  return res.json() as Promise<RefreshedToken>;
}
