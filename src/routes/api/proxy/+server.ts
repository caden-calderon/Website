/**
 * Web proxy for the IE4 browser.
 *
 * Fetches external pages server-side, strips security headers that block
 * iframe embedding (CSP frame-ancestors, X-Frame-Options, CORP), injects
 * a <base> tag for correct relative-URL resolution, and injects a script
 * that intercepts link clicks, History API, fetch, and XHR so in-page
 * navigation stays proxied — even for SPAs like GitHub (Turbo).
 */
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { cookieJar } from '$lib/server/cookieJar.js';

const PRIVATE_NET = /^(127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|0\.|169\.254\.)/;
const BLOCKED_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '[::1]']);

export const GET: RequestHandler = async ({ url, request }) => {
	const target = url.searchParams.get('url');
	if (!target) throw error(400, 'Missing url parameter');

	let parsed: URL;
	try {
		parsed = new URL(target);
	} catch {
		throw error(400, 'Invalid URL');
	}

	if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
		throw error(400, 'Only http/https URLs are supported');
	}

	if (BLOCKED_HOSTS.has(parsed.hostname) || parsed.hostname.endsWith('.local') || PRIVATE_NET.test(parsed.hostname)) {
		throw error(403, 'Cannot proxy private network addresses');
	}

	// Forward the client's Accept header so API endpoints return the right
	// content type (e.g., GitHub returns JSON when Accept includes json)
	const clientAccept = request.headers.get('accept') || 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8';

	// Attach stored cookies for this domain
	const storedCookies = cookieJar.getCookieHeader(parsed);

	try {
		const resp = await fetch(target, {
			headers: {
				'User-Agent':
					'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
				Accept: clientAccept,
				'Accept-Language': 'en-US,en;q=0.5',
				...(storedCookies ? { Cookie: storedCookies } : {}),
			},
			redirect: 'follow',
			// NOTE: redirect:'follow' loses Set-Cookie from intermediate 3xx
			// responses. If this becomes a problem, switch to manual redirect
			// loop. For now, most important cookies are set on the final 200.
		});

		// Capture cookies the upstream server set
		const finalUrl = resp.url || target;
		cookieJar.setCookiesFromResponse(resp.headers, new URL(finalUrl));

		const contentType = resp.headers.get('content-type') || '';

		if (!contentType.includes('text/html')) {
			// Non-HTML (CSS, JS, images, JSON): pass through with safe headers
			return new Response(resp.body, {
				status: resp.status,
				headers: safeHeaders(resp.headers, contentType),
			});
		}

		// ── HTML: inject <base> + full navigation interceptor ─────────
		let html = await resp.text();
		const final = new URL(finalUrl);
		html = injectHead(html, final);

		return new Response(html, {
			status: resp.status,
			headers: { 'content-type': 'text/html; charset=utf-8' },
		});
	} catch (e) {
		if ('status' in (e as object)) throw e;
		const msg = e instanceof Error ? e.message : 'Unknown error';
		throw error(502, `Could not load page: ${msg}`);
	}
};

// ─── Helpers ──────────────────────────────────────────────────────────────

function safeHeaders(source: Headers, contentType: string): Record<string, string> {
	const out: Record<string, string> = { 'content-type': contentType };
	const cc = source.get('cache-control');
	if (cc) out['cache-control'] = cc;
	// Allow cross-origin access so the iframe can read these resources
	out['access-control-allow-origin'] = '*';
	return out;
}

/**
 * Inject <base>, navigation interceptor, and SPA compatibility shims.
 *
 * The injected script intercepts:
 * - <a> clicks (capture phase, before SPAs like Turbo)
 * - history.pushState / replaceState
 * - fetch() and XMLHttpRequest.open()
 * - Service worker registration (blocked)
 *
 * All intercepted navigations are redirected through the proxy and
 * postMessage'd to the parent IE shell so the address bar stays in sync.
 */
function injectHead(html: string, pageUrl: URL): string {
	const origin = pageUrl.origin;
	const base = origin + pageUrl.pathname;
	const proto = pageUrl.protocol;
	const href = pageUrl.href;

	// The injection script handles:
	// - Rewriting localhost-origin URLs back to the remote origin (fixes 403s)
	// - Click interception (capture phase, before SPAs like Turbo)
	// - pushState/replaceState wrapping (SPA navigation)
	// - fetch/XHR wrapping (API calls)
	// - Service worker blocking
	// - postMessage to parent for address bar sync
	const script = `<base href="${base}">
<script>
(function(){
var P='/api/proxy?url=',O='${origin}',B='${base}',Pr='${proto}',L=window.location.origin;
var thisPage='${href}';
function R(h){
if(!h||h[0]==='#')return null;
if(h.indexOf('javascript:')===0||h.indexOf('mailto:')===0||h.indexOf('data:')===0||h.indexOf('blob:')===0)return null;
if(h.indexOf(L)===0){h=h.substring(L.length);if(!h||h==='/')return null;if(h.indexOf('/api/proxy')===0)return null;if(h[0]==='/')return O+h;return null}
if(h.indexOf('http://')===0||h.indexOf('https://')===0)return h;
if(h.indexOf('//')===0)return Pr+h;
if(h.indexOf('/api/proxy')===0)return null;
if(h[0]==='/')return O+h;
try{return new URL(h,B).href}catch(e){return null}
}
function px(u){return P+encodeURIComponent(u)}
function msg(u){if(window.parent!==window)window.parent.postMessage({type:'ie-nav',url:u},'*')}
msg(thisPage);
document.addEventListener('click',function(e){
var a=e.target&&e.target.closest?e.target.closest('a[href]'):null;
if(!a)return;
var h=a.getAttribute('href'),r=R(h);
if(!r)return;
e.preventDefault();e.stopImmediatePropagation();
msg(r);window.location.href=px(r);
},true);
var _p=history.pushState,_r=history.replaceState;
history.pushState=function(s,t,u){
if(u){var r=R(String(u));if(r&&r!==thisPage){msg(r);window.location.href=px(r);return}}
return _p.apply(this,arguments);
};
history.replaceState=function(s,t,u){
if(u){var r=R(String(u));if(r&&r!==thisPage)msg(r)}
return _r.apply(this,arguments);
};
var _f=window.fetch;
window.fetch=function(i,o){
if(typeof i==='string'){var r=R(i);if(r)i=px(r)}
else if(i&&i.url){var r=R(i.url);if(r)i=new Request(px(r),i)}
return _f.call(window,i,o);
};
var _x=XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open=function(m,u){
if(typeof u==='string'){var r=R(u);if(r)arguments[1]=px(r)}
return _x.apply(this,arguments);
};
try{Object.defineProperty(navigator,'serviceWorker',{get:function(){
return{register:function(){return Promise.resolve()},ready:Promise.resolve(),controller:null};
}})}catch(e){}
})();
<\/script>`;

	const m = html.match(/<head[^>]*>/i);
	if (m) return html.replace(m[0], m[0] + script);
	return script + html;
}
