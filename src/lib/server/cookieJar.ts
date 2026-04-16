/**
 * In-memory cookie jar for the web proxy.
 *
 * Stores cookies set by upstream servers and sends them back on subsequent
 * requests to the same domain. This lets sites like GitHub maintain session
 * state (CSRF tokens, tracking cookies) across proxied page loads, which
 * is necessary for their API calls (commit info, user data) to work.
 *
 * The jar is shared across all proxy users — acceptable for a portfolio
 * site. Cookies never leave the server; they're not forwarded to the client.
 */

// ─── Types ────────────────────────────────────────────────────────────────

interface StoredCookie {
	name: string;
	value: string;
	domain: string;
	path: string;
	expires: number; // epoch ms, Infinity = session cookie
	secure: boolean;
	httpOnly: boolean;
}

// ─── Cookie jar ───────────────────────────────────────────────────────────

const MAX_COOKIES = 2000;

class CookieJar {
	/** Cookies keyed by effective domain (lowercase). */
	private store = new Map<string, StoredCookie[]>();
	private count = 0;

	/** Capture Set-Cookie headers from an upstream response. */
	setCookiesFromResponse(headers: Headers, requestUrl: URL): void {
		const setCookies = headers.getSetCookie();
		if (!setCookies || setCookies.length === 0) return;

		for (const raw of setCookies) {
			const cookie = parseCookie(raw, requestUrl);
			if (!cookie) continue;
			this.upsert(cookie);
		}
	}

	/** Build a Cookie header value for an upstream request, or null. */
	getCookieHeader(requestUrl: URL): string | null {
		const hostname = requestUrl.hostname.toLowerCase();
		const path = requestUrl.pathname;
		const isSecure = requestUrl.protocol === 'https:';
		const now = Date.now();

		const matches: StoredCookie[] = [];

		for (const [domain, cookies] of this.store) {
			if (!domainMatches(domain, hostname)) continue;

			for (const c of cookies) {
				if (c.expires < now) continue; // expired
				if (c.secure && !isSecure) continue;
				if (!path.startsWith(c.path)) continue;
				matches.push(c);
			}
		}

		if (matches.length === 0) return null;

		// Longer paths first (more specific cookies take priority)
		matches.sort((a, b) => b.path.length - a.path.length);
		return matches.map((c) => `${c.name}=${c.value}`).join('; ');
	}

	// ── Internal ──────────────────────────────────────────────────────

	private upsert(cookie: StoredCookie): void {
		const key = cookie.domain;
		let list = this.store.get(key);
		if (!list) {
			list = [];
			this.store.set(key, list);
		}

		// Replace existing cookie with same name+path
		const idx = list.findIndex((c) => c.name === cookie.name && c.path === cookie.path);
		if (idx >= 0) {
			list[idx] = cookie;
		} else {
			list.push(cookie);
			this.count++;
		}

		// Evict expired cookies lazily when we hit the cap
		if (this.count > MAX_COOKIES) this.evict();
	}

	private evict(): void {
		const now = Date.now();
		for (const [domain, cookies] of this.store) {
			const alive = cookies.filter((c) => c.expires > now);
			if (alive.length === 0) {
				this.store.delete(domain);
			} else {
				this.store.set(domain, alive);
			}
			this.count -= cookies.length - alive.length;
		}
	}
}

// ─── Cookie parsing ───────────────────────────────────────────────────────

function parseCookie(raw: string, requestUrl: URL): StoredCookie | null {
	const parts = raw.split(';').map((s) => s.trim());
	if (parts.length === 0) return null;

	// First part is name=value
	const eqIdx = parts[0].indexOf('=');
	if (eqIdx < 1) return null;
	const name = parts[0].slice(0, eqIdx).trim();
	const value = parts[0].slice(eqIdx + 1).trim();

	let domain = requestUrl.hostname.toLowerCase();
	let path = '/';
	let expires = Infinity;
	let secure = false;
	let httpOnly = false;
	let domainFromAttr = false;

	for (let i = 1; i < parts.length; i++) {
		const part = parts[i];
		const eqPos = part.indexOf('=');
		const attrName = (eqPos >= 0 ? part.slice(0, eqPos) : part).trim().toLowerCase();
		const attrValue = eqPos >= 0 ? part.slice(eqPos + 1).trim() : '';

		switch (attrName) {
			case 'domain':
				domain = attrValue.replace(/^\./, '').toLowerCase();
				domainFromAttr = true;
				break;
			case 'path':
				path = attrValue || '/';
				break;
			case 'max-age': {
				const seconds = parseInt(attrValue, 10);
				if (!isNaN(seconds)) {
					expires = seconds <= 0 ? 0 : Date.now() + seconds * 1000;
				}
				break;
			}
			case 'expires':
				if (expires === Infinity) {
					// Only use Expires if Max-Age wasn't set
					const d = Date.parse(attrValue);
					if (!isNaN(d)) expires = d;
				}
				break;
			case 'secure':
				secure = true;
				break;
			case 'httponly':
				httpOnly = true;
				break;
		}
	}

	// Validate domain: the cookie's domain must be the request host or a parent
	const reqHost = requestUrl.hostname.toLowerCase();
	if (domainFromAttr && domain !== reqHost && !reqHost.endsWith('.' + domain)) {
		return null; // reject cross-domain cookie injection
	}

	return { name, value, domain, path, expires, secure, httpOnly };
}

// ─── Domain matching ──────────────────────────────────────────────────────

/** Check if a cookie domain matches a request hostname. */
function domainMatches(cookieDomain: string, hostname: string): boolean {
	if (cookieDomain === hostname) return true;
	// Subdomain match: hostname "api.github.com" matches cookie domain "github.com"
	if (hostname.endsWith('.' + cookieDomain)) return true;
	return false;
}

// ─── Singleton export ─────────────────────────────────────────────────────

export const cookieJar = new CookieJar();
