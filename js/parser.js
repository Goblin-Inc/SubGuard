// SubGuard — 100% Client-Side Statement Parser (CSV, TSV, Ctrl+V, PDF text)
// Supports UTF-8 & Windows-1251 (T-Bank, Sber, Alfa, Revolut, Monzo, Chase, etc.)

export async function readFileText(file) {
  const buf = await file.arrayBuffer();
  const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
  if (isPdf) {
    return extractPdfTextFallback(buf);
  }
  // Try UTF-8 first; if replacement chars appear, decode as Windows-1251 (common in RU banks)
  const utf8 = new TextDecoder('utf-8', { fatal: false }).decode(buf);
  if (utf8.includes('\uFFFD')) {
    try {
      return new TextDecoder('windows-1251').decode(buf);
    } catch {
      return utf8;
    }
  }
  return utf8;
}

// Lightweight zero-dependency PDF text stream extractor (works on uncompressed & FlateDecode PDFs via DecompressionStream)
async function extractPdfTextFallback(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  const raw = new TextDecoder('latin1').decode(bytes);
  const lines = [];

  // Extract uncompressed text blocks directly
  collectPdfStrings(raw, lines);

  // Decompress FlateDecode streams using native browser DecompressionStream (100% offline)
  if (typeof DecompressionStream !== 'undefined') {
    const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let match;
    while ((match = streamRegex.exec(raw)) !== null) {
      const start = match.index + match[0].indexOf('\n') + 1;
      const end = start + match[1].length;
      const slice = bytes.slice(start, end);
      try {
        const ds = new DecompressionStream('deflate');
        const writer = ds.writable.getWriter();
        writer.write(slice);
        writer.close();
        const out = await new Response(ds.readable).arrayBuffer();
        const decoded = new TextDecoder('latin1').decode(out);
        collectPdfStrings(decoded, lines);
      } catch {
        // Not a valid zlib stream — skip silently
      }
    }
  }

  // Convert extracted PDF lines into tab-separated pseudo-CSV rows matching Date + Desc + Amount
  const txRows = ['Date\tDescription\tAmount'];
  const joined = lines.join(' ');
  const txPattern = /(\d{2}[./-]\d{2}[./-]\d{2,4}|\d{4}-\d{2}-\d{2})\s+(.{3,80}?)\s+([-−]?\d[\d\s\u00A0]*[.,]\d{2})/g;
  let m;
  while ((m = txPattern.exec(joined)) !== null) {
    txRows.push(`${m[1]}\t${m[2].trim()}\t${m[3].replace(/[\s\u00A0]/g, '')}`);
  }
  return txRows.length > 1 ? txRows.join('\n') : lines.join('\n');
}

function collectPdfStrings(text, out) {
  const parenRegex = /\(([^()\\]*(?:\\.[^()\\]*)*)\)\s*Tj/g;
  let m;
  while ((m = parenRegex.exec(text)) !== null) {
    const cleaned = m[1].replace(/\\([()\\])/g, '$1').trim();
    if (cleaned) out.push(cleaned);
  }
  const tjArrayRegex = /\[([^\]]+)\]\s*TJ/g;
  while ((m = tjArrayRegex.exec(text)) !== null) {
    const parts = [];
    const inner = /\(([^()\\]*(?:\\.[^()\\]*)*)\)/g;
    let im;
    while ((im = inner.exec(m[1])) !== null) {
      parts.push(im[1].replace(/\\([()\\])/g, '$1'));
    }
    const combined = parts.join('').trim();
    if (combined) out.push(combined);
  }
}

export function detectDelimiter(text) {
  const sampleLines = text.split(/\r?\n/).filter(l => l.trim()).slice(0, 10);
  const candidates = ['\t', ';', ','];
  let best = ',';
  let bestScore = -1;
  for (const d of candidates) {
    const counts = sampleLines.map(line => splitLine(line, d).length);
    const maxCols = Math.max(...counts, 0);
    const consistent = counts.filter(c => c === maxCols && c >= 2).length;
    const score = consistent * 10 + maxCols;
    if (score > bestScore && maxCols >= 2) {
      bestScore = score;
      best = d;
    }
  }
  return best;
}

function splitLine(line, delim) {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delim && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  result.push(cur.trim());
  return result;
}

export function parseRawTable(text) {
  const clean = text.replace(/^\uFEFF/, '').trim();
  if (!clean) return { headers: [], rows: [], mapping: { date: 0, desc: 1, amount: 2 } };

  const delim = detectDelimiter(clean);
  const rawLines = clean.split(/\r?\n/).filter(l => l.trim().length > 0);
  const matrix = rawLines.map(l => splitLine(l, delim)).filter(r => r.length >= 2);
  if (matrix.length === 0) return { headers: [], rows: [], mapping: { date: 0, desc: 1, amount: 2 } };

  // Detect whether first row is a header
  const firstRow = matrix[0];
  const looksLikeHeader = firstRow.some(cell =>
    /^(date|дата|time|описание|description|merchant|получатель|сумма|amount|value|категория|валюта|currency)/i.test(cell)
  );

  const headers = looksLikeHeader
    ? firstRow.map((h, i) => h || `Col ${i + 1}`)
    : firstRow.map((_, i) => `Col ${i + 1}`);
  const rows = looksLikeHeader ? matrix.slice(1) : matrix;

  const mapping = autoDetectColumns(headers, rows);
  return { headers, rows, mapping };
}

export function autoDetectColumns(headers, rows) {
  let date = -1;
  let desc = -1;
  let amount = -1;
  let debit = -1;
  let currency = -1;

  headers.forEach((h, i) => {
    const low = h.toLowerCase();
    if (date === -1 && /(transaction date|posting date|completed date|started date|дата операции|дата|date|time|posted|buchungstag|valuta|fecha)/i.test(low)) date = i;
    if (desc === -1 && /(description|merchant|payee|memo|narrative|counterparty|details|name|verwendungszweck|empfänger|libellé|concepto|описание|назначение|получатель|мерчант)/i.test(low)) desc = i;
    if (debit === -1 && /^(debit|outflow|withdrawal|money out|paid out|расход|списание)$/i.test(low.trim())) debit = i;
    if (amount === -1 && /(сумма операции|сумма платежа|сумма|amount|total|value|betrag|montant|importe)/i.test(low)) amount = i;
    if (currency === -1 && /(валюта|currency|ccy|währung|devise|moneda)/i.test(low)) currency = i;
  });

  // Prefer explicit Debit/Outflow column if no single Amount column exists (common in US/UK/EU banks)
  if (amount === -1 && debit !== -1) {
    amount = debit;
  }

  // Fallback heuristics on sample data if headers were missing or ambiguous
  const sample = rows.slice(0, 15);
  const colCount = headers.length;
  if (date === -1) {
    for (let c = 0; c < colCount; c++) {
      const hits = sample.filter(r => r[c] && parseDate(r[c]) !== null).length;
      if (hits >= Math.max(1, sample.length * 0.5)) { date = c; break; }
    }
  }
  if (amount === -1) {
    for (let c = 0; c < colCount; c++) {
      if (c === date) continue;
      const hits = sample.filter(r => r[c] && parseAmount(r[c]) !== null && !parseDate(r[c])).length;
      if (hits >= Math.max(1, sample.length * 0.5)) { amount = c; break; }
    }
  }
  if (desc === -1) {
    let bestLen = -1;
    for (let c = 0; c < colCount; c++) {
      if (c === date || c === amount || c === currency) continue;
      const avgLen = sample.reduce((s, r) => s + (r[c] ? r[c].length : 0), 0) / Math.max(1, sample.length);
      if (avgLen > bestLen) { bestLen = avgLen; desc = c; }
    }
  }

  return {
    date: date === -1 ? 0 : date,
    desc: desc === -1 ? Math.min(1, colCount - 1) : desc,
    amount: amount === -1 ? Math.min(2, colCount - 1) : amount,
    currency
  };
}

// Detect whether ambiguous NN/NN/YYYY dates in a column are US (MM/DD/YYYY) or EU/RU (DD/MM/YYYY)
function detectUsDateOrder(rows, dateCol) {
  for (const r of rows.slice(0, 50)) {
    const s = String(r[dateCol] || '').trim().split(' ')[0];
    const m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
    if (!m) continue;
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (a > 12) return false; // Definitely DD/MM
    if (b > 12) return true;  // Definitely MM/DD (US banks like Chase, BofA, Amex)
  }
  return false;
}

export function parseDate(str, preferUsOrder = false) {
  if (!str) return null;
  const s = String(str).trim().split(' ')[0];
  // ISO YYYY-MM-DD
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (m) {
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return isNaN(d.getTime()) ? null : d;
  }
  // DD.MM.YYYY or MM/DD/YYYY
  m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
  if (m) {
    let yr = Number(m[3]);
    if (yr < 100) yr += 2000;
    const first = Number(m[1]);
    const second = Number(m[2]);
    const month = preferUsOrder ? first : second;
    const day = preferUsOrder ? second : first;
    const d = new Date(yr, month - 1, day);
    return isNaN(d.getTime()) ? null : d;
  }
  const fallback = new Date(s);
  return isNaN(fallback.getTime()) ? null : fallback;
}

export function parseAmount(str) {
  if (str === undefined || str === null) return null;
  let s = String(str).trim();
  if (!s) return null;
  // Handle accounting negatives like ($12.99) -> -12.99
  let accountingNeg = false;
  if (s.startsWith('(') && s.endsWith(')')) {
    accountingNeg = true;
    s = s.slice(1, -1);
  }
  // Normalize minus signs, spaces, global currency symbols & ISO codes
  s = s.replace(/[−–—]/g, '-')
       .replace(/[\s\u00A0₽$€£¥₹₺₴₸]|(RUB|RUR|USD|EUR|GBP|CAD|AUD|JPY|CHF|PLN|TRY|UAH|KZT|BRL|zł|R\$)/gi, '');
  // Handle European/Russian comma decimal separator (e.g. -1 299,50)
  if (s.includes(',') && !s.includes('.')) {
    s = s.replace(',', '.');
  } else if (s.includes(',') && s.includes('.')) {
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  }
  const num = Number(s);
  if (!Number.isFinite(num)) return null;
  return accountingNeg ? -Math.abs(num) : num;
}

export function detectCurrency(rows, mapping) {
  const mapCode = val => {
    if (/gbp|£/i.test(val)) return 'GBP';
    if (/eur|€/i.test(val)) return 'EUR';
    if (/usd|\$/i.test(val)) return 'USD';
    if (/rub|rur|₽/i.test(val)) return 'RUB';
    if (/jpy|¥/i.test(val)) return 'JPY';
    if (/pln|zł/i.test(val)) return 'PLN';
    if (/try|₺/i.test(val)) return 'TRY';
    if (/uah|₴/i.test(val)) return 'UAH';
    if (/kzt|₸/i.test(val)) return 'KZT';
    if (/chf/i.test(val)) return 'CHF';
    if (/cad/i.test(val)) return 'CAD';
    if (/aud/i.test(val)) return 'AUD';
    return null;
  };
  if (mapping.currency >= 0) {
    const val = (rows.find(r => r[mapping.currency]) || [])[mapping.currency] || '';
    const found = mapCode(val);
    if (found) return found;
  }
  const sampleText = rows.slice(0, 25).map(r => r.join(' ')).join(' ');
  const detected = mapCode(sampleText);
  if (detected) return detected;
  if (/СБЕР|ЯНДЕКС|YANDEX|Т-БАНК|PYATEROCHKA|OZON/i.test(sampleText)) return 'RUB';
  return 'USD';
}

export function extractTransactions(table) {
  const { rows, mapping } = table;
  const currency = detectCurrency(rows, mapping);
  const preferUsDate = detectUsDateOrder(rows, mapping.date);
  const transactions = [];

  for (const r of rows) {
    const date = parseDate(r[mapping.date], preferUsDate);
    const rawDesc = (r[mapping.desc] || '').trim();
    const rawAmt = parseAmount(r[mapping.amount]);
    if (!date || !rawDesc || rawAmt === null || rawAmt === 0) continue;

    // Treat negative amounts as expenses; if all amounts in file are positive, treat positive as expenses
    transactions.push({
      date,
      dateIso: date.toISOString().slice(0, 10),
      rawDesc,
      rawAmount: rawAmt,
      amount: Math.abs(rawAmt),
      isExpense: rawAmt < 0
    });
  }

  // If statement lists expenses as positive numbers (no negative values at all), treat all as expenses
  const hasNegatives = transactions.some(t => t.isExpense);
  const expenses = hasNegatives ? transactions.filter(t => t.isExpense) : transactions;
  expenses.sort((a, b) => a.date - b.date);

  return { transactions: expenses, currency };
}
