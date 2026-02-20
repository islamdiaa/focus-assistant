export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Generate login URL at runtime so redirect URI reflects the current origin.
// Returns empty string if OAuth env vars are not configured (standalone/Docker mode).
export const getLoginUrl = (returnPath?: string): string => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;

  // Guard: if OAuth is not configured, return empty string
  if (!oauthPortalUrl || !appId) {
    return "";
  }

  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(
    JSON.stringify({
      origin: window.location.origin,
      returnPath: returnPath || "/",
    })
  );

  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
};

// Check if OAuth is configured (Manus-hosted mode)
export const isOAuthConfigured = (): boolean => {
  return Boolean(
    import.meta.env.VITE_OAUTH_PORTAL_URL && import.meta.env.VITE_APP_ID
  );
};
