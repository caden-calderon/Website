import { randomUUID } from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';
import { CookieJar } from '$lib/server/cookieJar.js';

const SESSION_COOKIE_NAME = 'chromatic_proxy_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 4;
const MAX_SESSIONS = 256;
const SESSION_ID_RE = /^[a-f0-9-]{36}$/i;

interface SessionEntry {
	jar: CookieJar;
	lastSeenAt: number;
}

const sessions = new Map<string, SessionEntry>();

export function getProxySessionJar(cookies: Cookies): CookieJar {
	const now = Date.now();
	let sessionId = cookies.get(SESSION_COOKIE_NAME);

	if (!sessionId || !SESSION_ID_RE.test(sessionId)) {
		sessionId = randomUUID();
		cookies.set(SESSION_COOKIE_NAME, sessionId, {
			httpOnly: true,
			sameSite: 'lax',
			secure: process.env.NODE_ENV === 'production',
			path: '/api/proxy',
			maxAge: Math.floor(SESSION_TTL_MS / 1000),
		});
	}

	let entry = sessions.get(sessionId);
	if (!entry) {
		entry = { jar: new CookieJar(), lastSeenAt: now };
		sessions.set(sessionId, entry);
	}

	entry.lastSeenAt = now;
	evictOldSessions(now);
	return entry.jar;
}

function evictOldSessions(now: number): void {
	for (const [sessionId, entry] of sessions) {
		if (now - entry.lastSeenAt > SESSION_TTL_MS) {
			sessions.delete(sessionId);
		}
	}

	if (sessions.size <= MAX_SESSIONS) return;

	const ordered = [...sessions.entries()].sort((a, b) => a[1].lastSeenAt - b[1].lastSeenAt);
	for (const [sessionId] of ordered) {
		if (sessions.size <= MAX_SESSIONS) break;
		sessions.delete(sessionId);
	}
}
