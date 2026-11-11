/** Sends an event to Google Analytics, but only when it has been loaded (i.e. the visitor accepted cookies). */
export function track(name: string, params: Record<string, unknown> = {}): void {
  const g = (window as any).gtag;
  if (typeof g === 'function') g('event', name, params);
}

export function loadGA(id: string): void {
  if (!/^G-[A-Z0-9]+$/i.test(id) || (window as any).gtag) return;
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
  document.head.appendChild(s);
  (window as any).dataLayer = (window as any).dataLayer || [];
  (window as any).gtag = function () { (window as any).dataLayer.push(arguments); };
  (window as any).gtag('js', new Date());
  (window as any).gtag('config', id);
}
