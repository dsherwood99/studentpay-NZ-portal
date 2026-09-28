import {
  COLLECTIONS_SETTLEMENT_LAG_BUSINESS_DAYS,
  subtractBusinessDays,
} from './business-days.js';

export const AUCKLAND_TIMEZONE = 'Pacific/Auckland';

function pad2(value) {
  return String(value).padStart(2, '0');
}

export function toIsoDateString(value) {
  if (value instanceof Date) {
    if (!Number.isFinite(value.getTime())) {
      return null;
    }

    return new Intl.DateTimeFormat('en-CA', {
      timeZone: AUCKLAND_TIMEZONE,
    }).format(value);
  }

  const match = String(value || '')
    .trim()
    .match(/^(\d{4}-\d{2}-\d{2})/);

  return match ? match[1] : null;
}

export function parseIsoDate(isoDate) {
  const match = String(isoDate || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    return null;
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

export function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function previousMonth(year, month) {
  if (month === 1) {
    return { year: year - 1, month: 12 };
  }

  return { year, month: month - 1 };
}

export function monthStartIso(year, month) {
  return `${year}-${pad2(month)}-01`;
}

export function monthEndIso(year, month) {
  return `${year}-${pad2(month)}-${pad2(daysInMonth(year, month))}`;
}

export function monthLabel(year, month) {
  const utcDate = new Date(Date.UTC(year, month - 1, 1, 12, 0, 0));

  return new Intl.DateTimeFormat('en-NZ', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(utcDate);
}

export function compareIsoDates(left, right) {
  return String(left || '').localeCompare(String(right || ''));
}

export function getReportingWindow(now = new Date()) {
  const todayIso = toIsoDateString(now);
  const today = parseIsoDate(todayIso);

  if (!today) {
    throw new Error('Unable to resolve Pacific/Auckland reporting date.');
  }

  const reportingCutoffDate = subtractBusinessDays(
    todayIso,
    COLLECTIONS_SETTLEMENT_LAG_BUSINESS_DAYS
  );
  const cutoff = parseIsoDate(reportingCutoffDate);
  const prior = previousMonth(today.year, today.month);
  const previousDays = daysInMonth(prior.year, prior.month);
  const currentStart = monthStartIso(today.year, today.month);
  const cutoffIsInCurrentMonth = compareIsoDates(reportingCutoffDate, currentStart) >= 0;
  const currentThroughDay = cutoffIsInCurrentMonth ? cutoff.day : 0;
  const samePeriodDay = Math.min(cutoff.day, previousDays);

  return {
    timezone: AUCKLAND_TIMEZONE,
    generatedOn: todayIso,
    today,
    reportingCutoffDate,
    settlementLagBusinessDays: COLLECTIONS_SETTLEMENT_LAG_BUSINESS_DAYS,
    currentStart,
    currentEnd: cutoffIsInCurrentMonth ? reportingCutoffDate : null,
    currentThroughDay,
    currentDaysInMonth: daysInMonth(today.year, today.month),
    currentLabel: monthLabel(today.year, today.month),
    previousStart: monthStartIso(prior.year, prior.month),
    previousEnd: monthEndIso(prior.year, prior.month),
    previousDaysInMonth: previousDays,
    previousLabel: monthLabel(prior.year, prior.month),
    samePeriodDay,
  };
}
