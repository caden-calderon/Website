export type FrameLocationState =
	| { kind: 'proxied'; href: string }
	| { kind: 'escaped'; reason: 'cross-origin' | 'same-origin-non-proxy' | 'empty' | 'invalid' };

export function inspectFrameLocation(readHref: () => string, appOrigin: string): FrameLocationState {
	try {
		const href = readHref();
		if (!href) {
			return { kind: 'escaped', reason: 'empty' };
		}

		let parsed: URL;
		try {
			parsed = new URL(href, appOrigin);
		} catch {
			return { kind: 'escaped', reason: 'invalid' };
		}

		if (parsed.origin === appOrigin && parsed.pathname === '/api/proxy') {
			return { kind: 'proxied', href: parsed.href };
		}

		return { kind: 'escaped', reason: 'same-origin-non-proxy' };
	} catch {
		return { kind: 'escaped', reason: 'cross-origin' };
	}
}
