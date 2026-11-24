// SubGuard — Subscription, Anomaly, Trial-Trap & Habit Leak Detection Engine
import { findPlaybook } from './cancelPlaybook.js';

const NOISE_TOKENS = [
  'pos', 'purchase', 'payment', 'card', 'bill', 'billing', 'www', 'http', 'https',
  'com', 'ru', 'net', 'org', 'ab', 'inc', 'llc', 'ltd', 'gmbh', 'usa', 'rus',
  'moscow', 'moskva', 'spb', 'saint', 'petersburg', 'stockholm', 'dublin', 'london',
  'san', 'francisco', 'amsterdam', 'singapore', 'bot', 'store', 'online'
];

export function normalizeMerchant(raw) {
  let s = raw
    .toLowerCase()
    .replace(/[*#]\s*\d+/g, ' ')         // remove *9821, #114
    .replace(/\b\d{4,}\b/g, ' ')         // remove long transaction/store IDs
    .replace(/[/.\\_-]+/g, ' ')          // punctuation -> space
    .replace(/[^a-zа-яё0-9\s+]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const words = s.split(' ').filter(w => w.length > 1 && !NOISE_TOKENS.includes(w));
  const core = (words.length ? words : s.split(' ')).slice(0, 3).join(' ').trim();

  // Friendly canonical display name
  return core
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ') || raw.trim();
}

function daysBetween(d1, d2) {
  return Math.round(Math.abs(d2 - d1) / (1000 * 60 * 60 * 24));
}

function classifyCycle(medianGap) {
  if (medianGap >= 5 && medianGap <= 9) return { key: 'weekly', multMonthly: 4.33, multYearly: 52, periodDays: 7 };
  if (medianGap >= 12 && medianGap <= 17) return { key: 'biweekly', multMonthly: 2.17, multYearly: 26, periodDays: 14 };
  if (medianGap >= 25 && medianGap <= 35) return { key: 'monthly', multMonthly: 1, multYearly: 12, periodDays: 30 };
  if (medianGap >= 80 && medianGap <= 105) return { key: 'quarterly', multMonthly: 1 / 3, multYearly: 4, periodDays: 90 };
  if (medianGap >= 350 && medianGap <= 380) return { key: 'yearly', multMonthly: 1 / 12, multYearly: 1, periodDays: 365 };
  return null;
}

function median(arr) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function analyzeTransactions(transactions, currency = 'RUB') {
  if (!transactions.length) {
    return {
      subscriptions: [],
      alerts: [],
      habits: [],
      totals: { monthly: 0, yearly: 0 },
      currency,
      latestDate: new Date()
    };
  }

  const latestDate = transactions[transactions.length - 1].date;
  const groups = new Map();

  for (const tx of transactions) {
    const key = normalizeMerchant(tx.rawDesc);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ ...tx, merchant: key });
  }

  const subscriptions = [];
  const alerts = [];
  const habits = [];

  const trialThreshold = currency === 'RUB' ? 15 : 2;

  for (const [merchant, txs] of groups.entries()) {
    txs.sort((a, b) => a.date - b.date);

    // 1. Check for Trial Traps (tiny verification charge <= 15 RUB / $2 in the last 30 days)
    if (txs.length === 1) {
      const only = txs[0];
      const ageDays = daysBetween(only.date, latestDate);
      const isTrialKeyword = /trial|verify|check|test|auth|триал/i.test(only.rawDesc);
      if (only.amount <= trialThreshold && (ageDays <= 30 || isTrialKeyword)) {
        const estimatedTrialEnd = new Date(only.date.getTime() + 7 * 86400000);
        alerts.push({
          id: `trial-${merchant}`,
          type: 'trial',
          severity: 'high',
          merchant,
          amount: only.amount,
          date: only.dateIso,
          nextDate: estimatedTrialEnd,
          detail_ru: `Проверочное списание ${formatPlain(only.amount, currency)} (${only.dateIso}). Часто после этого списывается полная подписка через 7–14 дней.`,
          detail_en: `Micro-verification charge of ${formatPlain(only.amount, currency)} on ${only.dateIso}. Full auto-renewal often hits in 7–14 days.`
        });
      }
      continue;
    }

    // 2. Detect Duplicate Charges (same merchant, identical/very similar amount within <= 3 days)
    const dedupedForCycle = [txs[0]];
    for (let i = 1; i < txs.length; i++) {
      const prev = txs[i - 1];
      const curr = txs[i];
      const gap = daysBetween(prev.date, curr.date);
      const diffRatio = Math.abs(curr.amount - prev.amount) / Math.max(prev.amount, 1);
      if (gap <= 3 && diffRatio <= 0.05) {
        alerts.push({
          id: `dup-${merchant}-${curr.dateIso}`,
          type: 'duplicate',
          severity: 'high',
          merchant,
          amount: curr.amount,
          date: curr.dateIso,
          detail_ru: `Списалось дважды подряд: ${prev.dateIso} и ${curr.dateIso} по ${formatPlain(curr.amount, currency)}.`,
          detail_en: `Billed twice within ${gap} day(s): ${prev.dateIso} and ${curr.dateIso} for ${formatPlain(curr.amount, currency)}.`
        });
      } else {
        dedupedForCycle.push(curr);
      }
    }

    // 3. Cycle & Subscription Detection
    const gaps = [];
    for (let i = 1; i < dedupedForCycle.length; i++) {
      gaps.push(daysBetween(dedupedForCycle[i - 1].date, dedupedForCycle[i].date));
    }

    const medGap = median(gaps);
    const cycle = classifyCycle(medGap);

    // Check amount consistency (subscriptions have stable amounts or step increases, not wild random grocery totals)
    const amounts = dedupedForCycle.map(t => t.amount);
    const avgAmt = amounts.reduce((s, v) => s + v, 0) / amounts.length;
    const minAmt = Math.min(...amounts);
    const maxAmt = Math.max(...amounts);
    const spreadRatio = (maxAmt - minAmt) / Math.max(avgAmt, 1);

    // Check how consistent the intervals are
    const gapDeviations = gaps.map(g => Math.abs(g - medGap));
    const consistentGaps = gapDeviations.filter(d => d <= 5).length / Math.max(1, gaps.length);

    // Distinguish Subscription vs Habit Leak (e.g., Coffee 4x/month with varying gaps & amounts)
    const isSubscription = cycle !== null && consistentGaps >= 0.6 && spreadRatio <= 0.55;

    if (isSubscription) {
      const latestTx = dedupedForCycle[dedupedForCycle.length - 1];
      const firstTx = dedupedForCycle[0];
      const currentAmount = latestTx.amount;
      const nextDate = new Date(latestTx.date.getTime() + cycle.periodDays * 86400000);

      // Price Hike / Creep Detection
      let priceHikePct = 0;
      if (currentAmount > firstTx.amount * 1.04) {
        priceHikePct = Math.round(((currentAmount - firstTx.amount) / firstTx.amount) * 100);
        alerts.push({
          id: `hike-${merchant}`,
          type: 'hike',
          severity: 'medium',
          merchant,
          oldAmount: firstTx.amount,
          newAmount: currentAmount,
          pct: priceHikePct,
          date: latestTx.dateIso,
          detail_ru: `Цена выросла на +${priceHikePct}%: было ${formatPlain(firstTx.amount, currency)} → стало ${formatPlain(currentAmount, currency)}.`,
          detail_en: `Price increased by +${priceHikePct}%: ${formatPlain(firstTx.amount, currency)} → ${formatPlain(currentAmount, currency)}.`
        });
      }

      subscriptions.push({
        id: `sub-${merchant.toLowerCase().replace(/\s+/g, '-')}`,
        merchant,
        currentAmount,
        firstAmount: firstTx.amount,
        priceHikePct,
        cycle: cycle.key,
        periodDays: cycle.periodDays,
        monthlyCost: currentAmount * cycle.multMonthly,
        yearlyCost: currentAmount * cycle.multYearly,
        chargeCount: txs.length,
        lastDate: latestTx.date,
        lastDateIso: latestTx.dateIso,
        nextDate,
        nextDateIso: nextDate.toISOString().slice(0, 10),
        history: dedupedForCycle.map(t => ({ date: t.dateIso, amount: t.amount })),
        playbook: findPlaybook(merchant),
        confidence: Math.round(Math.min(99, 65 + consistentGaps * 25 + Math.min(txs.length, 5) * 2))
      });
    } else if (txs.length >= 4) {
      // Habit Leak (frequent micro-spends like coffee / delivery)
      const spanDays = Math.max(30, daysBetween(txs[0].date, txs[txs.length - 1].date));
      const totalSpent = txs.reduce((s, t) => s + t.amount, 0);
      const monthlyRate = (totalSpent / spanDays) * 30;
      const perMonthCount = (txs.length / spanDays) * 30;
      if (perMonthCount >= 2.5) {
        habits.push({
          merchant,
          count: txs.length,
          perMonthCount: Math.round(perMonthCount * 10) / 10,
          avgTicket: avgAmt,
          monthlyCost: monthlyRate,
          yearlyCost: monthlyRate * 12
        });
      }
    }
  }

  subscriptions.sort((a, b) => b.yearlyCost - a.yearlyCost);
  habits.sort((a, b) => b.yearlyCost - a.yearlyCost);

  const monthly = subscriptions.reduce((s, sub) => s + sub.monthlyCost, 0);
  const yearly = subscriptions.reduce((s, sub) => s + sub.yearlyCost, 0);

  return {
    subscriptions,
    alerts,
    habits,
    totals: { monthly, yearly },
    currency,
    latestDate
  };
}

export function build12MonthForecast(subscriptions, cancelledIds, startDate = new Date()) {
  const months = [];
  const baseYear = startDate.getFullYear();
  const baseMonth = startDate.getMonth();

  for (let i = 0; i < 12; i++) {
    const d = new Date(baseYear, baseMonth + i, 1);
    const monthStart = d.getTime();
    const monthEnd = new Date(baseYear, baseMonth + i + 1, 0, 23, 59, 59).getTime();

    let activeBurn = 0;
    let savedBurn = 0;

    for (const sub of subscriptions) {
      let cur = sub.nextDate.getTime();
      // Step forward through occurrences inside this month
      while (cur < monthStart) {
        cur += sub.periodDays * 86400000;
      }
      while (cur <= monthEnd) {
        if (cancelledIds.has(sub.id)) {
          savedBurn += sub.currentAmount;
        } else {
          activeBurn += sub.currentAmount;
        }
        cur += sub.periodDays * 86400000;
      }
    }

    months.push({
      date: d,
      label: d.toLocaleDateString('en-US', { month: 'short' }),
      labelRu: d.toLocaleDateString('ru-RU', { month: 'short' }),
      activeBurn,
      savedBurn,
      total: activeBurn + savedBurn
    });
  }

  return months;
}

const SYM_MAP = {
  USD: '$', EUR: '€', GBP: '£', RUB: '₽', CAD: 'C$', AUD: 'A$',
  JPY: '¥', CHF: 'CHF ', PLN: 'zł', TRY: '₺', UAH: '₴', KZT: '₸'
};

function formatPlain(val, currency) {
  const rounded = Math.round(val * 100) / 100;
  const sym = SYM_MAP[currency] || `${currency} `;
  if (['RUB', 'PLN', 'TRY', 'UAH', 'KZT'].includes(currency)) {
    return `${Math.round(rounded).toLocaleString('ru-RU')} ${sym}`;
  }
  return `${sym}${rounded}`;
}
