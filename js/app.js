// SubGuard — Main Interactive App Controller
import { I18N } from './i18n.js';
import { DEMO_RU_CSV, DEMO_EN_CSV } from './demoData.js';
import { readFileText, parseRawTable, extractTransactions } from './parser.js';
import { analyzeTransactions, build12MonthForecast } from './detector.js';
import { findPlaybook } from './cancelPlaybook.js';
import { downloadIcsReminder } from './icsExport.js';
import { buildReceiptSvg, downloadReceiptSvg, downloadReceiptPng } from './receiptExport.js';

const STORAGE_KEY = 'subguard_manual_subs_v1';

const CYCLE_META = {
  weekly: { multMonthly: 4.33, multYearly: 52, periodDays: 7 },
  biweekly: { multMonthly: 2.17, multYearly: 26, periodDays: 14 },
  monthly: { multMonthly: 1, multYearly: 12, periodDays: 30 },
  quarterly: { multMonthly: 1 / 3, multYearly: 4, periodDays: 90 },
  yearly: { multMonthly: 1 / 12, multYearly: 1, periodDays: 365 }
};

function loadManualSubs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveManualSubs(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch { /* ignore storage quota */ }
}

const state = {
  lang: (navigator.language || 'ru').toLowerCase().startsWith('ru') ? 'ru' : 'en',
  rawTable: null,
  sourceLabel: '',
  transactions: [],
  baseAnalysis: null,
  analysis: null,
  manualSubs: loadManualSubs(),
  cancelledIds: new Set(),
  activeTab: 'subs',
  lastReceiptSvg: ''
};

const $ = id => document.getElementById(id);

function t(key) {
  return I18N[state.lang][key] || key;
}

const CURRENCY_SYM = {
  USD: '$', EUR: '€', GBP: '£', RUB: '₽', CAD: 'C$', AUD: 'A$',
  JPY: '¥', CHF: 'CHF ', PLN: 'zł', TRY: '₺', UAH: '₴', KZT: '₸'
};

function formatMoney(amount, currency = state.analysis?.currency || 'USD') {
  const num = Math.round(amount * 100) / 100;
  const sym = CURRENCY_SYM[currency] || `${currency} `;
  if (['RUB', 'PLN', 'TRY', 'UAH', 'KZT'].includes(currency)) {
    return `${Math.round(num).toLocaleString('ru-RU')} ${sym}`;
  }
  return `${sym}${num.toLocaleString('en-US', { minimumFractionDigits: num % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
}

function applyI18n() {
  document.documentElement.lang = state.lang;
  $('langToggle').textContent = state.lang === 'ru' ? 'EN' : 'RU';
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (I18N[state.lang][key]) el.textContent = I18N[state.lang][key];
  });
  $('pasteInput').placeholder = t('paste_placeholder');
  if (state.analysis) renderDashboard();
}

function loadCsvText(text, label) {
  const table = parseRawTable(text);
  state.rawTable = table;
  state.sourceLabel = label;
  state.cancelledIds.clear();
  populateMapper(table);
  recomputeFromTable();
}

function populateMapper(table) {
  const selects = [$('mapDate'), $('mapDesc'), $('mapAmount')];
  selects.forEach(sel => {
    sel.innerHTML = table.headers.map((h, i) => `<option value="${i}">${escapeHtml(h)}</option>`).join('');
  });
  $('mapDate').value = String(table.mapping.date);
  $('mapDesc').value = String(table.mapping.desc);
  $('mapAmount').value = String(table.mapping.amount);
}

function recomputeFromTable() {
  if (state.rawTable) {
    const { transactions, currency } = extractTransactions(state.rawTable);
    state.transactions = transactions;
    state.baseAnalysis = analyzeTransactions(transactions, currency);
  } else {
    state.transactions = [];
    state.baseAnalysis = {
      subscriptions: [],
      alerts: [],
      habits: [],
      totals: { monthly: 0, yearly: 0 },
      currency: state.lang === 'ru' ? 'RUB' : 'USD',
      latestDate: new Date()
    };
  }
  mergeManualAndRender();
}

function mergeManualAndRender() {
  if (!state.baseAnalysis) return;
  const base = state.baseAnalysis;
  const manualConverted = state.manualSubs.map(m => {
    const meta = CYCLE_META[m.cycle] || CYCLE_META.monthly;
    const nextDate = new Date(m.nextDateIso + 'T00:00:00');
    return {
      id: m.id,
      merchant: m.merchant,
      currentAmount: m.amount,
      firstAmount: m.amount,
      priceHikePct: 0,
      cycle: m.cycle,
      periodDays: meta.periodDays,
      monthlyCost: m.amount * meta.multMonthly,
      yearlyCost: m.amount * meta.multYearly,
      chargeCount: 1,
      lastDate: new Date(),
      lastDateIso: new Date().toISOString().slice(0, 10),
      nextDate: isNaN(nextDate.getTime()) ? new Date(Date.now() + meta.periodDays * 86400000) : nextDate,
      nextDateIso: m.nextDateIso,
      history: [],
      playbook: findPlaybook(m.merchant),
      confidence: 100,
      isManual: true
    };
  });

  const mergedSubs = [...base.subscriptions, ...manualConverted].sort((a, b) => b.yearlyCost - a.yearlyCost);
  const monthly = mergedSubs.reduce((s, sub) => s + sub.monthlyCost, 0);
  const yearly = mergedSubs.reduce((s, sub) => s + sub.yearlyCost, 0);

  state.analysis = {
    ...base,
    subscriptions: mergedSubs,
    totals: { monthly, yearly }
  };

  $('uploadView').classList.add('hidden');
  $('dashboardView').classList.remove('hidden');
  renderDashboard();
}

function renderDashboard() {
  const { subscriptions, alerts, habits, totals, currency, latestDate } = state.analysis;

  $('sourceName').textContent = state.sourceLabel;
  $('parsedCount').textContent = String(state.transactions.length);

  // Calculate simulated savings
  let savedYearly = 0;
  for (const sub of subscriptions) {
    if (state.cancelledIds.has(sub.id)) savedYearly += sub.yearlyCost;
  }

  $('kpiMonthly').textContent = formatMoney(totals.monthly, currency);
  $('kpiYearly').textContent = formatMoney(totals.yearly, currency);
  $('kpiSavings').textContent = formatMoney(savedYearly, currency);
  $('kpiAlerts').textContent = String(alerts.length);

  $('badgeSubs').textContent = String(subscriptions.length);
  $('badgeAlerts').textContent = String(alerts.length);
  $('badgeHabits').textContent = String(habits.length);

  // Simulator Banner
  if (savedYearly > 0) {
    $('simSubtitle').textContent = `${state.cancelledIds.size} × ${t('tab_subs').toLowerCase()} → ${formatMoney(savedYearly, currency)} ${t('per_year')}`;
    const equivs = currency === 'RUB' ? I18N[state.lang].equivs_ru : I18N[state.lang].equivs_en;
    const match = [...equivs].reverse().find(e => savedYearly >= e.min);
    if (match) {
      $('simEquiv').textContent = `${t('sim_equiv_prefix')} ${match.label}`;
      $('simEquiv').classList.remove('hidden');
    } else {
      $('simEquiv').classList.add('hidden');
    }
  } else {
    $('simSubtitle').textContent = t('sim_empty');
    $('simEquiv').classList.add('hidden');
  }

  renderSubsPanel(subscriptions, currency);
  renderAlertsPanel(alerts, currency);
  renderCalendarPanel(subscriptions, currency, latestDate);
  renderHabitsPanel(habits, currency);
  renderRawPanel(state.transactions, currency);
}

function renderSubsPanel(subs, currency) {
  const panel = $('panel-subs');
  if (!subs.length) {
    panel.innerHTML = `<div class="empty-state">${t('subs_empty')}</div>`;
    return;
  }

  panel.innerHTML = `<div class="card-list">${subs.map(sub => {
    const checked = state.cancelledIds.has(sub.id);
    const cycleLabel = t(`cycle_${sub.cycle}`);
    const hikePill = sub.priceHikePct > 0
      ? `<span class="pill pill-hike">▲ +${sub.priceHikePct}%</span>`
      : '';
    const manualPill = sub.isManual
      ? `<span class="pill pill-easy">${t('manual_badge')}</span>`
      : '';
    const cancelBtn = sub.playbook
      ? `<button class="btn-secondary btn-sm" data-playbook="${escapeAttr(sub.id)}">${t('btn_how_cancel')}</button>`
      : '';
    const delBtn = sub.isManual
      ? `<button class="btn-ghost btn-sm btn-del" data-del-sub="${escapeAttr(sub.id)}" title="Delete">✕</button>`
      : '';

    return `
      <div class="sub-row ${checked ? 'cancelled' : ''}">
        <input class="sub-check" type="checkbox" data-sub-id="${escapeAttr(sub.id)}" ${checked ? 'checked' : ''} />
        <div>
          <div class="sub-name">
            <span>${escapeHtml(sub.merchant)}</span>
            <span class="pill">${cycleLabel}</span>
            ${manualPill}
            ${hikePill}
          </div>
          <div class="sub-meta">
            <span>${sub.isManual ? t('manual_badge') : `${sub.chargeCount} ${t('charges_count')}`}</span>
            <span>${t('next_charge')} <strong>${sub.nextDateIso}</strong></span>
            ${sub.isManual ? '' : `<span>${sub.confidence}% match</span>`}
          </div>
        </div>
        <div class="sub-price mono">
          <div class="sub-price-main">${formatMoney(sub.currentAmount, currency)}</div>
          <div class="sub-price-yr">${formatMoney(sub.yearlyCost, currency)} ${t('per_year')}</div>
        </div>
        <div class="sub-actions">
          ${cancelBtn}
          <button class="btn-ghost btn-sm" data-ics-sub="${escapeAttr(sub.id)}">📅 ${t('btn_ics')}</button>
          ${delBtn}
        </div>
      </div>`;
  }).join('')}</div>`;
}

function renderAlertsPanel(alerts, currency) {
  const panel = $('panel-alerts');
  if (!alerts.length) {
    panel.innerHTML = `<div class="empty-state">${t('alerts_empty')}</div>`;
    return;
  }

  panel.innerHTML = `<div class="card-list">${alerts.map(a => {
    const typeLabel = a.type === 'hike' ? t('alert_hike') : a.type === 'duplicate' ? t('alert_dup') : t('alert_trial');
    const pillClass = a.type === 'hike' ? 'pill-hike' : 'pill-danger';
    const detail = state.lang === 'ru' ? a.detail_ru : a.detail_en;
    const icsBtn = a.type === 'trial'
      ? `<button class="btn-primary btn-sm" data-ics-alert="${escapeAttr(a.id)}">📅 ${t('btn_ics')}</button>`
      : '';

    return `
      <div class="alert-card ${a.severity}">
        <div>
          <div class="alert-head">
            <span class="pill ${pillClass}">${typeLabel}</span>
            <span>${escapeHtml(a.merchant)}</span>
          </div>
          <div class="alert-desc">${escapeHtml(detail)}</div>
        </div>
        ${icsBtn}
      </div>`;
  }).join('')}</div>`;
}

function renderCalendarPanel(subs, currency, latestDate) {
  const panel = $('panel-calendar');
  const forecast = build12MonthForecast(subs, state.cancelledIds, latestDate);
  const maxVal = Math.max(...forecast.map(m => m.total), 1);

  panel.innerHTML = `
    <div class="cal-box">
      <div class="cal-head">
        <h3>${t('cal_title')}</h3>
        <p>${t('cal_sub')}</p>
      </div>
      <div class="bar-chart">
        ${forecast.map(m => {
          const activeH = Math.round((m.activeBurn / maxVal) * 165);
          const savedH = Math.round((m.savedBurn / maxVal) * 165);
          const lbl = state.lang === 'ru' ? m.labelRu : m.label;
          return `
            <div class="bar-col" title="${lbl}: ${formatMoney(m.activeBurn, currency)} active / ${formatMoney(m.savedBurn, currency)} saved">
              <div class="bar-val mono">${m.total > 0 ? formatShort(m.total, currency) : ''}</div>
              <div class="bar-stack">
                <div class="bar-active" style="height:${activeH}px"></div>
                <div class="bar-saved" style="height:${savedH}px"></div>
              </div>
              <div class="bar-lbl">${lbl}</div>
            </div>`;
        }).join('')}
      </div>
    </div>`;
}

function renderHabitsPanel(habits, currency) {
  const panel = $('panel-habits');
  if (!habits.length) {
    panel.innerHTML = `<div class="empty-state">${t('habits_empty')}</div>`;
    return;
  }

  panel.innerHTML = `<div class="card-list">${habits.map(h => `
    <div class="sub-row">
      <div>☕</div>
      <div>
        <div class="sub-name">${escapeHtml(h.merchant)} <span class="pill">${h.perMonthCount}× ${t('per_month')}</span></div>
        <div class="sub-meta"><span>${h.count} ${t('charges_count')} · avg ${formatMoney(h.avgTicket, currency)}</span></div>
      </div>
      <div class="sub-price mono">
        <div class="sub-price-main">${formatMoney(h.monthlyCost, currency)} ${t('per_month')}</div>
        <div class="sub-price-yr">${formatMoney(h.yearlyCost, currency)} ${t('per_year')}</div>
      </div>
      <div></div>
    </div>
  `).join('')}</div>`;
}

function renderRawPanel(transactions, currency) {
  const panel = $('panel-raw');
  const recent = [...transactions].reverse().slice(0, 150);
  panel.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>Date</th><th>Description</th><th>Amount</th></tr>
        </thead>
        <tbody>
          ${recent.map(tx => `
            <tr>
              <td class="mono">${tx.dateIso}</td>
              <td>${escapeHtml(tx.rawDesc)}</td>
              <td class="mono">${formatMoney(tx.amount, currency)}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

function openPlaybook(sub) {
  const pb = sub.playbook;
  if (!pb) return;
  const diffKey = pb.difficulty === 'easy' ? 'diff_easy' : pb.difficulty === 'medium' ? 'diff_medium' : 'diff_dark';
  const diffClass = pb.difficulty === 'easy' ? 'pill-easy' : pb.difficulty === 'medium' ? 'pill-hike' : 'pill-danger';
  const tip = state.lang === 'ru' ? pb.tip_ru : pb.tip_en;

  $('pbTitle').textContent = `${t('playbook_title')}: ${pb.name}`;
  $('pbBody').innerHTML = `
    <div><span class="pill ${diffClass}">${t(diffKey)}</span></div>
    <div class="pb-tip">${escapeHtml(tip)}</div>
    ${pb.url ? `<a class="pb-link" href="${escapeAttr(pb.url)}" target="_blank" rel="noopener noreferrer">${t('playbook_open')}</a>` : ''}
  `;
  $('playbookModal').classList.remove('hidden');
}

function formatShort(val, currency) {
  if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
  return String(Math.round(val));
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function escapeAttr(str) { return escapeHtml(str); }

// EVENT WIRING
function init() {
  applyI18n();

  $('langToggle').addEventListener('click', () => {
    state.lang = state.lang === 'ru' ? 'en' : 'ru';
    applyI18n();
  });

  // File Dropzone
  const dz = $('dropzone');
  const fi = $('fileInput');
  dz.addEventListener('click', () => fi.click());
  dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('dragover'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
  dz.addEventListener('drop', async e => {
    e.preventDefault();
    dz.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) {
      const text = await readFileText(file);
      loadCsvText(text, file.name);
    }
  });
  fi.addEventListener('change', async () => {
    const file = fi.files[0];
    if (file) {
      const text = await readFileText(file);
      loadCsvText(text, file.name);
      fi.value = '';
    }
  });

  // Global Ctrl+V shortcut on landing page
  document.addEventListener('paste', e => {
    if (!$('uploadView').classList.contains('hidden') && $('pasteModal').classList.contains('hidden')) {
      const text = e.clipboardData?.getData('text');
      if (text && text.includes('\n')) {
        loadCsvText(text, 'Clipboard (Ctrl+V)');
      }
    }
  });

  // Paste modal
  $('btnOpenPaste').addEventListener('click', () => {
    $('pasteModal').classList.remove('hidden');
    $('pasteInput').focus();
  });
  const closePaste = () => $('pasteModal').classList.add('hidden');
  $('closePaste').addEventListener('click', closePaste);
  $('cancelPaste').addEventListener('click', closePaste);
  $('submitPaste').addEventListener('click', () => {
    const txt = $('pasteInput').value.trim();
    if (txt) {
      closePaste();
      loadCsvText(txt, 'Pasted Table');
    }
  });

  // Demo buttons
  $('btnDemoRu').addEventListener('click', () => {
    state.lang = 'ru';
    applyI18n();
    loadCsvText(DEMO_RU_CSV, 'Demo Statement (RU ₽)');
  });
  $('btnDemoEn').addEventListener('click', () => {
    state.lang = 'en';
    applyI18n();
    loadCsvText(DEMO_EN_CSV, 'Demo Statement (EN $)');
  });
  $('btnStartManual').addEventListener('click', () => {
    state.rawTable = null;
    state.sourceLabel = state.lang === 'ru' ? 'Ручной список' : 'Manual Tracker';
    state.cancelledIds.clear();
    recomputeFromTable();
    openAddSubModal();
  });

  // Add manual subscription modal
  const openAddSubModal = () => {
    const nextMonth = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    $('inSubNext').value = nextMonth;
    $('inSubName').value = '';
    $('inSubPrice').value = '';
    $('addSubModal').classList.remove('hidden');
    $('inSubName').focus();
  };
  const closeAddSub = () => $('addSubModal').classList.add('hidden');
  $('btnOpenAddSub').addEventListener('click', openAddSubModal);
  $('closeAddSub').addEventListener('click', closeAddSub);
  $('cancelAddSub').addEventListener('click', closeAddSub);
  $('addSubForm').addEventListener('submit', e => {
    e.preventDefault();
    const merchant = $('inSubName').value.trim();
    const amount = Number($('inSubPrice').value);
    const cycle = $('inSubCycle').value;
    const nextDateIso = $('inSubNext').value;
    if (!merchant || !amount || amount <= 0) return;

    state.manualSubs.push({
      id: `manual-${Date.now()}`,
      merchant,
      amount,
      cycle,
      nextDateIso
    });
    saveManualSubs(state.manualSubs);
    closeAddSub();
    mergeManualAndRender();
  });

  // Receipt modal
  const refreshReceipt = () => {
    if (!state.analysis) return;
    state.lastReceiptSvg = buildReceiptSvg({
      analysis: state.analysis,
      cancelledIds: state.cancelledIds,
      lang: state.lang,
      hideAmounts: $('receiptHideToggle').checked
    });
    $('receiptPreview').innerHTML = state.lastReceiptSvg;
  };
  $('btnOpenReceipt').addEventListener('click', () => {
    refreshReceipt();
    $('receiptModal').classList.remove('hidden');
  });
  $('receiptHideToggle').addEventListener('change', refreshReceipt);
  $('closeReceipt').addEventListener('click', () => $('receiptModal').classList.add('hidden'));
  $('receiptModal').addEventListener('click', e => {
    if (e.target === $('receiptModal')) $('receiptModal').classList.add('hidden');
  });
  $('btnDownloadSvg').addEventListener('click', () => downloadReceiptSvg(state.lastReceiptSvg));
  $('btnDownloadPng').addEventListener('click', () => downloadReceiptPng(state.lastReceiptSvg));

  // Dashboard controls
  $('btnNewStatement').addEventListener('click', () => {
    $('dashboardView').classList.add('hidden');
    $('uploadView').classList.remove('hidden');
  });
  $('btnMapperToggle').addEventListener('click', () => {
    $('mapperPanel').classList.toggle('hidden');
  });
  $('btnApplyMap').addEventListener('click', () => {
    if (!state.rawTable) return;
    state.rawTable.mapping.date = Number($('mapDate').value);
    state.rawTable.mapping.desc = Number($('mapDesc').value);
    state.rawTable.mapping.amount = Number($('mapAmount').value);
    $('mapperPanel').classList.add('hidden');
    recomputeFromTable();
  });

  // Tabs
  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      state.activeTab = btn.dataset.tab;
      $(`panel-${state.activeTab}`).classList.add('active');
    });
  });

  // Delegated clicks inside dashboard
  $('dashboardView').addEventListener('change', e => {
    const cb = e.target.closest('.sub-check');
    if (cb) {
      const id = cb.dataset.subId;
      if (cb.checked) state.cancelledIds.add(id);
      else state.cancelledIds.delete(id);
      renderDashboard();
    }
  });

  $('dashboardView').addEventListener('click', e => {
    const delBtn = e.target.closest('[data-del-sub]');
    if (delBtn) {
      const id = delBtn.dataset.delSub;
      state.manualSubs = state.manualSubs.filter(m => m.id !== id);
      state.cancelledIds.delete(id);
      saveManualSubs(state.manualSubs);
      mergeManualAndRender();
      return;
    }

    const pbBtn = e.target.closest('[data-playbook]');
    if (pbBtn) {
      const sub = state.analysis.subscriptions.find(s => s.id === pbBtn.dataset.playbook);
      if (sub) openPlaybook(sub);
      return;
    }

    const icsSub = e.target.closest('[data-ics-sub]');
    if (icsSub) {
      const sub = state.analysis.subscriptions.find(s => s.id === icsSub.dataset.icsSub);
      if (sub) {
        downloadIcsReminder({
          title: `Cancel or Review: ${sub.merchant}`,
          description: `SubGuard reminder: ${sub.merchant} (${formatMoney(sub.currentAmount)}) renews around ${sub.nextDateIso}.`,
          targetDate: sub.nextDate,
          daysBefore: 2
        });
      }
      return;
    }

    const icsAlert = e.target.closest('[data-ics-alert]');
    if (icsAlert) {
      const alert = state.analysis.alerts.find(a => a.id === icsAlert.dataset.icsAlert);
      if (alert) {
        downloadIcsReminder({
          title: `Trial Trap Alert: ${alert.merchant}`,
          description: `SubGuard: Check ${alert.merchant} before free trial auto-renews!`,
          targetDate: alert.nextDate || new Date(Date.now() + 7 * 86400000),
          daysBefore: 2
        });
      }
    }
  });

  $('closePlaybook').addEventListener('click', () => $('playbookModal').classList.add('hidden'));
  $('playbookModal').addEventListener('click', e => {
    if (e.target === $('playbookModal')) $('playbookModal').classList.add('hidden');
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

init();
