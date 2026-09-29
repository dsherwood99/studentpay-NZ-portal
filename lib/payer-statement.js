/**
 * Account statement order used by the Provider Portal recent-transactions view.
 *
 * This matches the in-repo replica of org-owned PayerStatementController in
 * studentpay-nz-api scripts/e13-sandbox-certification.mjs
 * (statementTransactionPriority, sortLikePayerStatement, reconstructStatement).
 *
 * Running balance starts at 0 and walks visible Account_Transaction__c rows.
 * It is not seeded from Opportunity.Amount and is not sorted by CreatedDate.
 */

export function statementTransactionPriority(transactionType) {
  if (transactionType === 'Charge') return 10;
  if (
    transactionType === 'Late Fee' ||
    transactionType === 'Dishonour Fee' ||
    transactionType === 'Adjustment Debit'
  ) {
    return 20;
  }
  if (transactionType === 'Payment Received' || transactionType === 'Manual') {
    return 30;
  }
  if (
    transactionType === 'Reversal' ||
    transactionType === 'Adjustment Credit' ||
    transactionType === 'Write Off'
  ) {
    return 40;
  }
  return 90;
}

export function sortLikePayerStatement(transactions) {
  return [...transactions].sort((left, right) => {
    const leftDate = left.Transaction_Date__c || '';
    const rightDate = right.Transaction_Date__c || '';
    if (leftDate !== rightDate) return leftDate < rightDate ? -1 : 1;
    const priority =
      statementTransactionPriority(left.Transaction_Type__c) -
      statementTransactionPriority(right.Transaction_Type__c);
    if (priority !== 0) return priority;
    const leftCreated = left.CreatedDate || '';
    const rightCreated = right.CreatedDate || '';
    if (leftCreated !== rightCreated) return leftCreated < rightCreated ? -1 : 1;
    return String(left.Id || '').localeCompare(String(right.Id || ''));
  });
}

export function isStatementVisible(row) {
  return (
    row?.Statement_Visible__c !== false &&
    row?.Internal_Only__c !== true &&
    row?.Status__c !== 'Cancelled'
  );
}

function roundMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function statementNet(row) {
  const debit = Number(row.Debit_Amount__c || 0);
  const credit = Number(row.Credit_Amount__c || 0);
  if (row.Net_Amount__c == null || row.Net_Amount__c === '') {
    return roundMoney(debit - credit);
  }
  return roundMoney(row.Net_Amount__c);
}

function presentDetail(row) {
  const description = String(row.Description__c || '').trim();
  const category = String(row.Payment_Category__c || '').trim();
  const text = description || category;
  if (!text || looksInternal(text)) {
    return null;
  }
  return text.slice(0, 160);
}

function looksInternal(value) {
  return (
    /^(CU|MD|PM|BA|AC|006|a0)[A-Za-z0-9]{8,}$/.test(value) ||
    /stack trace|at Object\./i.test(value)
  );
}

export function buildStatementRows(transactions) {
  const visible = sortLikePayerStatement(
    (transactions || []).filter(isStatementVisible)
  );
  let running = 0;

  return visible.map((row) => {
    const net = statementNet(row);
    running = roundMoney(running + net);
    return {
      dateIso: String(row.Transaction_Date__c || '').slice(0, 10),
      type: row.Transaction_Type__c || 'Transaction',
      detail: presentDetail(row),
      net,
      running,
    };
  });
}

export function nzTodayIso(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Pacific/Auckland',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function addIsoDays(isoDate, days) {
  const [year, month, day] = String(isoDate || '')
    .slice(0, 10)
    .split('-')
    .map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  utc.setUTCDate(utc.getUTCDate() + Number(days || 0));
  return utc.toISOString().slice(0, 10);
}

export const RECENT_TRANSACTION_DAYS = 60;

export function recentTransactionWindow(todayIso, days = RECENT_TRANSACTION_DAYS) {
  const safeDays = RECENT_TRANSACTION_DAYS;
  const today = String(todayIso || '').slice(0, 10);
  return {
    days: safeDays,
    from: addIsoDays(today, -safeDays),
    to: today,
    ignoredDays: Number(days) === safeDays ? null : Number(days),
  };
}

export function presentRecentTransactions(transactions, todayIso) {
  const window = recentTransactionWindow(todayIso);
  const statement = buildStatementRows(transactions);
  const recent = statement.filter(
    (row) => row.dateIso >= window.from && row.dateIso <= window.to
  );

  return {
    days: window.days,
    from: window.from,
    to: window.to,
    transactions: recent.map((row) => ({
      date: formatNzDate(row.dateIso),
      label: row.type,
      detail: row.detail,
      amount: row.net,
      balance: row.running,
    })),
  };
}

export function formatNzDate(isoDate) {
  if (!isoDate) {
    return null;
  }
  const [year, month, day] = String(isoDate).slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) {
    return null;
  }
  return formatNzParts(
    new Intl.DateTimeFormat('en-NZ', {
      timeZone: 'Pacific/Auckland',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).formatToParts(new Date(Date.UTC(year, month - 1, day, 12)))
  );
}

export function formatNzDateTime(value) {
  if (value == null || value === '') {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const parts = new Intl.DateTimeFormat('en-NZ', {
    timeZone: 'Pacific/Auckland',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).formatToParts(date);
  const clock = formatNzParts(parts, { withTime: true });
  return clock;
}

function formatNzParts(parts, { withTime = false } = {}) {
  const get = (type) => parts.find((part) => part.type === type)?.value || '';
  const month = get('month').replace(/^Sept$/, 'Sep');
  const date = `${get('day')} ${month} ${get('year')}`;
  if (!withTime) {
    return date;
  }
  const dayPeriod = get('dayPeriod').toLowerCase();
  return `${date}, ${get('hour')}:${get('minute')} ${dayPeriod}`;
}
