// SubGuard — Shareable "Leak Receipt" Card Generator (SVG & PNG, 100% local)

function esc(str) {
  return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const SYM = {
  USD: '$', EUR: '€', GBP: '£', RUB: '₽', CAD: 'C$', AUD: 'A$',
  JPY: '¥', CHF: 'CHF ', PLN: 'zł', TRY: '₺', UAH: '₴', KZT: '₸'
};

function fmtMoney(val, currency, hideAmounts) {
  if (hideAmounts) return '••••';
  const num = Math.round(val * 100) / 100;
  const s = SYM[currency] || `${currency} `;
  if (['RUB', 'PLN', 'TRY', 'UAH', 'KZT'].includes(currency)) {
    return `${Math.round(num).toLocaleString('ru-RU')} ${s}`;
  }
  return `${s}${num.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

export function buildReceiptSvg({ analysis, cancelledIds, lang = 'ru', hideAmounts = false }) {
  const { subscriptions, alerts, totals, currency } = analysis;
  const savedYearly = subscriptions
    .filter(s => cancelledIds.has(s.id))
    .reduce((sum, s) => sum + s.yearlyCost, 0);

  const topSubs = subscriptions.slice(0, 6);
  const height = 430 + topSubs.length * 36;
  const isRu = lang === 'ru';

  const title = isRu ? 'ЧЕК УТЕЧЕК · SUBGUARD' : 'LEAK RECEIPT · SUBGUARD';
  const subTitle = isRu ? '100% локальный аудит · 0 bytes sent' : '100% local audit · 0 bytes sent';
  const lblMonthly = isRu ? 'В МЕСЯЦ' : 'MONTHLY';
  const lblYearly = isRu ? 'ЗА ГОД' : 'YEARLY LEAK';
  const lblSaved = isRu ? 'К ОТМЕНЕ / ГОД' : 'SAVED / YEAR';
  const lblAlerts = isRu ? 'ЛОВУШЕК' : 'TRAPS';
  const footer = isRu
    ? 'Проверено локально в SubGuard · goblin-inc.github.io/SubGuard'
    : 'Audited locally in SubGuard · goblin-inc.github.io/SubGuard';

  const rowsSvg = topSubs.map((s, idx) => {
    const y = 296 + idx * 36;
    const isCut = cancelledIds.has(s.id);
    const name = s.merchant.length > 24 ? `${s.merchant.slice(0, 23)}…` : s.merchant;
    const price = fmtMoney(s.yearlyCost, currency, hideAmounts) + (isRu ? '/г' : '/yr');
    const color = isCut ? '#34d399' : '#e2e8f0';
    const tag = isCut ? (isRu ? ' [ОТМЕНА]' : ' [CUT]') : s.priceHikePct > 0 ? ` [+${s.priceHikePct}%]` : '';
    const tagColor = isCut ? '#34d399' : '#fbbf24';

    return `
      <text x="44" y="${y}" fill="${color}" font-family="JetBrains Mono, Consolas, monospace" font-size="15" font-weight="600">${esc(name)}<tspan fill="${tagColor}" font-size="12">${esc(tag)}</tspan></text>
      <text x="556" y="${y}" text-anchor="end" fill="${color}" font-family="JetBrains Mono, Consolas, monospace" font-size="15" font-weight="700">${esc(price)}</text>
      <line x1="44" y1="${y + 11}" x2="556" y2="${y + 11}" stroke="rgba(148,163,184,0.12)" stroke-dasharray="3 4"/>`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="${height}" viewBox="0 0 600 ${height}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0b0f19"/>
      <stop offset="100%" stop-color="#111827"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#10b981"/>
      <stop offset="100%" stop-color="#38bdf8"/>
    </linearGradient>
  </defs>
  <rect width="600" height="${height}" rx="22" fill="url(#bg)"/>
  <rect x="16" y="16" width="568" height="${height - 32}" rx="16" fill="#0f1422" stroke="rgba(148,163,184,0.22)" stroke-width="1.2"/>

  <!-- Header -->
  <rect x="44" y="42" width="512" height="4" rx="2" fill="url(#accent)"/>
  <text x="44" y="80" fill="#f8fafc" font-family="Inter, Segoe UI, sans-serif" font-size="22" font-weight="800" letter-spacing="0.5">${esc(title)}</text>
  <text x="44" y="102" fill="#6ee7b7" font-family="JetBrains Mono, Consolas, monospace" font-size="12">🔒 ${esc(subTitle)}</text>
  <text x="556" y="80" text-anchor="end" fill="#94a3b8" font-family="JetBrains Mono, Consolas, monospace" font-size="13">${new Date().toISOString().slice(0, 10)}</text>

  <!-- KPI Row -->
  <rect x="44" y="124" width="120" height="76" rx="12" fill="#151c2e" stroke="rgba(148,163,184,0.16)"/>
  <text x="58" y="146" fill="#94a3b8" font-family="Inter, Segoe UI, sans-serif" font-size="10" font-weight="700">${esc(lblMonthly)}</text>
  <text x="58" y="178" fill="#f8fafc" font-family="JetBrains Mono, Consolas, monospace" font-size="16" font-weight="700">${esc(fmtMoney(totals.monthly, currency, hideAmounts))}</text>

  <rect x="174" y="124" width="124" height="76" rx="12" fill="#151c2e" stroke="rgba(244,63,94,0.35)"/>
  <text x="188" y="146" fill="#fda4af" font-family="Inter, Segoe UI, sans-serif" font-size="10" font-weight="700">${esc(lblYearly)}</text>
  <text x="188" y="178" fill="#fb7185" font-family="JetBrains Mono, Consolas, monospace" font-size="16" font-weight="700">${esc(fmtMoney(totals.yearly, currency, hideAmounts))}</text>

  <rect x="308" y="124" width="132" height="76" rx="12" fill="rgba(16,185,129,0.12)" stroke="rgba(16,185,129,0.4)"/>
  <text x="322" y="146" fill="#6ee7b7" font-family="Inter, Segoe UI, sans-serif" font-size="10" font-weight="700">${esc(lblSaved)}</text>
  <text x="322" y="178" fill="#34d399" font-family="JetBrains Mono, Consolas, monospace" font-size="16" font-weight="700">${esc(fmtMoney(savedYearly, currency, hideAmounts))}</text>

  <rect x="450" y="124" width="106" height="76" rx="12" fill="#151c2e" stroke="rgba(245,158,11,0.35)"/>
  <text x="464" y="146" fill="#fcd34d" font-family="Inter, Segoe UI, sans-serif" font-size="10" font-weight="700">${esc(lblAlerts)}</text>
  <text x="464" y="178" fill="#fbbf24" font-family="JetBrains Mono, Consolas, monospace" font-size="20" font-weight="700">${alerts.length}</text>

  <!-- Section Title -->
  <text x="44" y="242" fill="#94a3b8" font-family="JetBrains Mono, Consolas, monospace" font-size="12" font-weight="700">${isRu ? `ТОП ПОДПИСОК (${subscriptions.length} ВСЕГО)` : `TOP SUBSCRIPTIONS (${subscriptions.length} TOTAL)`}</text>
  <line x1="44" y1="256" x2="556" y2="256" stroke="rgba(148,163,184,0.25)"/>

  ${rowsSvg}

  <!-- Footer -->
  <text x="300" y="${height - 42}" text-anchor="middle" fill="#64748b" font-family="JetBrains Mono, Consolas, monospace" font-size="11">${esc(footer)}</text>
</svg>`;
}

export function downloadReceiptSvg(svgString) {
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  triggerDownload(blob, `SubGuard-Receipt-${new Date().toISOString().slice(0, 10)}.svg`);
}

export function downloadReceiptPng(svgString) {
  const img = new Image();
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  img.onload = () => {
    const scale = 2;
    const canvas = document.createElement('canvas');
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);
    canvas.toBlob(blob => {
      if (blob) triggerDownload(blob, `SubGuard-Receipt-${new Date().toISOString().slice(0, 10)}.png`);
    }, 'image/png');
  };
  img.src = url;
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
