let timer = 0;
export function toast(msg: string): void {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(timer);
  timer = window.setTimeout(() => t.classList.remove('show'), 2800);
}
