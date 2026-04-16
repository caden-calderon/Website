const DOCUMENT_DESTINATIONS = new Set(['document', 'iframe', 'frame']);

export function shouldInjectHtmlShell(request: Request, contentType: string): boolean {
	if (!contentType.includes('text/html')) return false;

	const destination = request.headers.get('sec-fetch-dest');
	if (!destination) return true;
	return DOCUMENT_DESTINATIONS.has(destination);
}

/**
 * Rewrite <a> href and <form> action attributes so navigation goes through
 * the proxy without relying on client-side JavaScript interception.
 */
export function rewriteLinks(html: string, origin: string, proxyBase: string): string {
	const esc = origin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const proxy = (absUrl: string) => `${proxyBase}/api/proxy?url=${encodeURIComponent(absUrl)}`;

	html = html.replace(
		/(<a\b[^>]*?\b)href="(\/[^"#][^"]*?)"/gi,
		(_, before, path) => `${before}href="${proxy(origin + path.replace(/&amp;/g, '&'))}"`,
	);
	html = html.replace(
		new RegExp(`(<a\\b[^>]*?\\b)href="${esc}(/[^"]*?)"`, 'gi'),
		(_, before, path) => `${before}href="${proxy(origin + path.replace(/&amp;/g, '&'))}"`,
	);
	html = html.replace(
		/(<form\b[^>]*?\b)action="(\/[^"]+)"/gi,
		(_, before, path) => `${before}action="${proxy(origin + path.replace(/&amp;/g, '&'))}"`,
	);
	return html;
}

/**
 * Rewrite src attributes on deferred-loading elements so they go
 * through our proxy. GitHub uses <include-fragment> and <turbo-frame>
 * to lazily load commit info, contributor lists, etc.
 */
export function rewriteDeferredSrc(html: string, origin: string, proxyBase: string): string {
	return html.replace(
		/(<(?:include-fragment|turbo-frame)\b[^>]*?\b)src="(\/[^"]+)"/gi,
		(_, before, path) => {
			const cleanPath = path.replace(/&amp;/g, '&');
			return `${before}src="${proxyBase}/api/proxy?url=${encodeURIComponent(origin + cleanPath)}"`;
		},
	);
}

/**
 * Inject <base>, navigation interceptor, and SPA compatibility shims.
 */
export function injectHead(
	html: string,
	pageUrl: URL,
	proxyBase: string,
	documentCookieHeader = '',
): string {
	const origin = pageUrl.origin;
	const base = pageUrl.href;
	const proto = pageUrl.protocol;
	const href = pageUrl.href;
	const proxiedPrefix = `${proxyBase}/api/proxy?url=`;
	const cookieSyncUrl = `${proxyBase}/api/proxy/cookies`;

	const script = `<base href="${escapeHtmlAttr(base)}">
<script>
(function(){
var P=${serializeJsString(proxiedPrefix)},O=${serializeJsString(origin)},B=${serializeJsString(base)},Pr=${serializeJsString(proto)},L=window.location.origin;
var CU=${serializeJsString(cookieSyncUrl)},DC=${serializeJsString(documentCookieHeader)};
var thisPage=${serializeJsString(href)};
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
function setLoc(u,replace){return replace?_locReplace.call(window.location,u):_locAssign.call(window.location,u)}
function msg(u){if(window.parent!==window)window.parent.postMessage({type:'ie-nav',url:u},'*')}
var _locAssign=window.location.assign.bind(window.location),_locReplace=window.location.replace.bind(window.location);
var cookieState={};
if(DC)DC.split(/;\\s*/).forEach(function(pair){
if(!pair)return;
var i=pair.indexOf('=');
if(i<1)return;
cookieState[pair.slice(0,i)]=pair.slice(i+1);
});
function cookieHeader(){
var pairs=[];
for(var k in cookieState)if(Object.prototype.hasOwnProperty.call(cookieState,k))pairs.push(k+'='+cookieState[k]);
return pairs.join('; ');
}
function storeCookie(raw){
if(typeof raw!=='string'||!raw)return;
var parts=raw.split(';'),first=(parts[0]||'').trim(),i=first.indexOf('=');
if(i<1)return;
var name=first.slice(0,i).trim(),value=first.slice(i+1).trim(),remove=value==='';
for(var j=1;j<parts.length;j++){
var part=parts[j].trim(),eq=part.indexOf('='),attr=(eq>=0?part.slice(0,eq):part).trim().toLowerCase(),attrValue=eq>=0?part.slice(eq+1).trim():'';
if(attr==='max-age'){var maxAge=parseInt(attrValue,10);if(!isNaN(maxAge)&&maxAge<=0)remove=true}
if(attr==='expires'){var expires=Date.parse(attrValue);if(!isNaN(expires)&&expires<=Date.now())remove=true}
}
if(remove)delete cookieState[name];
else cookieState[name]=value;
}
function syncCookie(raw){
storeCookie(raw);
var payload=JSON.stringify({url:thisPage,cookie:raw});
try{
if(navigator.sendBeacon){navigator.sendBeacon(CU,new Blob([payload],{type:'application/json'}));return}
}catch(e){}
try{_f.call(window,CU,{method:'POST',headers:{'content-type':'application/json'},body:payload,keepalive:true})}catch(e){}
}
try{Object.defineProperty(document,'cookie',{configurable:true,get:function(){return cookieHeader()},set:function(raw){syncCookie(String(raw||''))}})}catch(e){}
function proxiedNav(u,replace){
var r=R(String(u));
if(!r)return false;
msg(r);setLoc(px(r),replace);
return true;
}
msg(thisPage);
document.addEventListener('click',function(e){
var a=e.target&&e.target.closest?e.target.closest('a[href]'):null;
if(!a)return;
var h=a.getAttribute('href'),r=R(h);
if(!r)return;
e.preventDefault();e.stopImmediatePropagation();
msg(r);setLoc(px(r),false);
},true);
function submitForm(form,submitter){
if(!form||String(form.target||submitter&&submitter.getAttribute&&submitter.getAttribute('formtarget')||'').toLowerCase()==='_blank')return false;
var method=String(submitter&&submitter.getAttribute&&submitter.getAttribute('formmethod')||form.getAttribute('method')||'GET').toUpperCase();
var action=submitter&&submitter.getAttribute&&submitter.getAttribute('formaction')||form.getAttribute('action')||thisPage;
var r=R(action);
if(!r)return false;
msg(r);
if(method==='GET'){
var next=new URL(r),data=new FormData(form,submitter||undefined),params=new URLSearchParams(next.search);
data.forEach(function(value,key){if(typeof value==='string')params.append(key,value)});
next.search=params.toString();
setLoc(px(next.href),false);
return true;
}
form.action=px(r);
return false;
}
document.addEventListener('submit',function(e){
var form=e.target;
if(!(form instanceof HTMLFormElement))return;
if(submitForm(form,e.submitter||null))e.preventDefault();
},true);
var _submit=HTMLFormElement.prototype.submit;
HTMLFormElement.prototype.submit=function(){if(!submitForm(this,null))return _submit.apply(this,arguments)};
var _p=history.pushState,_r=history.replaceState;
history.pushState=function(s,t,u){
if(u){var r=R(String(u));if(r&&r!==thisPage){msg(r);setLoc(px(r),false);return}}
return _p.apply(this,arguments);
};
history.replaceState=function(s,t,u){
if(u){var r=R(String(u));if(r&&r!==thisPage)msg(r)}
return _r.apply(this,arguments);
};
try{
if(window.Location&&window.Location.prototype){
var _assign=window.Location.prototype.assign,_replace=window.Location.prototype.replace;
if(typeof _assign==='function')window.Location.prototype.assign=function(u){if(!proxiedNav(u,false))return _assign.apply(this,arguments)};
if(typeof _replace==='function')window.Location.prototype.replace=function(u){if(!proxiedNav(u,true))return _replace.apply(this,arguments)};
}
}catch(e){}
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

function escapeHtmlAttr(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/"/g, '&quot;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
}

function serializeJsString(value: string): string {
	return JSON.stringify(value).replace(/</g, '\\u003c');
}
