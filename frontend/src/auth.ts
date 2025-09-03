// src/auth.ts

// Lightweight client-side auth/tenant context for Yogi integration.
// - Reads JWT and optional org from URL (token/jwt/orgId/etc.)
// - Stores in sessionStorage
// - Exposes headers for API calls: Authorization + x-org-id

const TOKEN_KEYS = ["token", "jwt", "id_token", "access_token", "yogiToken"];
const ORG_KEYS = ["orgId", "organizationId", "tenantId", "org", "tenant"];

const SS_TOKEN_KEY = "yogi_jwt";
const SS_ORG_KEY = "org_id";

export type AuthState = {
  token?: string | null;
  orgId?: string | null;
};

export function getAuthState(): AuthState {
  return {
    token: sessionStorage.getItem(SS_TOKEN_KEY) || null,
    orgId: sessionStorage.getItem(SS_ORG_KEY) || null,
  };
}

export function setAuthState(next: AuthState) {
  if (typeof next.token === "string" && next.token) {
    sessionStorage.setItem(SS_TOKEN_KEY, next.token);
  } else if (next.token === null) {
    sessionStorage.removeItem(SS_TOKEN_KEY);
  }
  if (typeof next.orgId === "string" && next.orgId) {
    sessionStorage.setItem(SS_ORG_KEY, next.orgId);
  } else if (next.orgId === null) {
    sessionStorage.removeItem(SS_ORG_KEY);
  }
}

export function signOut() {
  sessionStorage.removeItem(SS_TOKEN_KEY);
  sessionStorage.removeItem(SS_ORG_KEY);
}

function tryParseJwt(token?: string | null): any | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function deriveOrgId(token?: string | null, explicit?: string | null): string | null {
  if (explicit) return explicit;
  const payload = tryParseJwt(token);
  if (!payload) return null;
  return (
    payload.orgId ||
    payload.organizationId ||
    payload.tenantId ||
    payload.tenant ||
    null
  );
}

/** Initialize auth by reading token/org from URL and storing them. */
export function initAuthFromUrl(): AuthState {
  const url = new URL(window.location.href);

  // Look for token/org in both query and hash fragment
  const qs = url.searchParams;
  const hs = new URLSearchParams(url.hash.startsWith("#") ? url.hash.slice(1) : url.hash);

  const getParam = (key: string): string | null => qs.get(key) || hs.get(key);
  const deleteParam = (key: string) => {
    if (qs.has(key)) qs.delete(key);
    if (hs.has(key)) hs.delete(key);
  };

  // Token from URL
  let token: string | null = null;
  for (const k of TOKEN_KEYS) {
    const v = getParam(k);
    if (v) {
      token = v;
      deleteParam(k);
    }
  }

  // Org from URL if present
  let orgFromUrl: string | null = null;
  for (const k of ORG_KEYS) {
    const v = getParam(k);
    if (v) {
      orgFromUrl = v;
      deleteParam(k);
    }
  }

  // Persist if we received anything
  if (token) sessionStorage.setItem(SS_TOKEN_KEY, token);
  const currentToken = token || sessionStorage.getItem(SS_TOKEN_KEY);

  const orgId = deriveOrgId(currentToken, orgFromUrl) || null;
  if (orgId) sessionStorage.setItem(SS_ORG_KEY, orgId);

  // Clean the URL to avoid leaking tokens in history/address bar
  if (token || orgFromUrl) {
    try {
      const newHash = hs.toString();
      const clean = new URL(url.toString());
      clean.search = qs.toString();
      clean.hash = newHash ? `#${newHash}` : "";
      window.history.replaceState({}, document.title, clean.toString());
    } catch {}
  }

  return { token: currentToken, orgId };
}

/** Headers to attach to backend calls. */
export function getAuthHeaders(): Record<string, string> {
  const { token, orgId } = getAuthState();
  const h: Record<string, string> = {};
  if (token) h["authorization"] = `Bearer ${token}`;
  if (orgId) h["x-org-id"] = String(orgId);
  return h;
}

/** Fetch that automatically attaches Authorization and x-org-id. */
export async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const hdrs = new Headers((init && (init.headers as any)) || undefined);
  const extra = getAuthHeaders();
  for (const [k, v] of Object.entries(extra)) hdrs.set(k, v);
  return fetch(input, { ...(init || {}), headers: hdrs });
}
