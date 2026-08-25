import { daysInMonth, parseIsoDate, toIsoDateString } from './auckland-calendar.js';

export function roundMoney(value) {
  const numeric = Number(value || 0);

  if (!Number.isFinite(numeric)) {
    return 0;
  }

  return Math.round((numeric + Number.EPSILON) * 100) / 100;
}

export function comparisonPercent(currentMtd, previousSamePeriod) {
  const current = roundMoney(currentMtd);
  const previous = roundMoney(previousSamePeriod);

  if (previous === 0) {
    return null;
  }

  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export function calendarDayFromSalesforceDate(value) {
  return toIsoDateString(value);
}

export function dailyTotalsByIsoDate(rows) {
  const totals = new Map();

  for (const row of rows || []) {
    const isoDate = calendarDayFromSalesforceDate(row.date ?? row.Transaction_Date__c);

    if (!isoDate) {
      continue;
    }

    const amount = roundMoney(row.amount ?? row.total ?? row.expr0 ?? 0);
    totals.set(isoDate, roundMoney((totals.get(isoDate) || 0) + amount));
  }

  return totals;
}

export function buildMonthSeries({
  year,
  month,
  throughDay,
  dailyTotals = new Map(),
}) {
  const lastDay = daysInMonth(year, month);
  const endDay = Math.min(throughDay, lastDay);
  const series = [];
  let cumulative = 0;

  for (let day = 1; day <= endDay; day += 1) {
    const isoDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const daily = roundMoney(dailyTotals.get(isoDate) || 0);
    cumulative = roundMoney(cumulative + daily);
    series.push({ day, daily, cumulative });
  }

  return series;
}

export function seriesTotalThrough(series, dayNumber) {
  if (!Array.isArray(series) || series.length === 0) {
    return 0;
  }

  const match = [...series]
    .reverse()
    .find((point) => point.day <= dayNumber);

  return match ? roundMoney(match.cumulative) : 0;
}

export function buildCollectionsPayload({ window, currentRows, previousRows }) {
  const currentTotals = dailyTotalsByIsoDate(currentRows);
  const previousTotals = dailyTotalsByIsoDate(previousRows);

  const currentSeries = buildMonthSeries({
    year: window.today.year,
    month: window.today.month,
    throughDay: window.today.day,
    dailyTotals: currentTotals,
  });

  const previousSeries = buildMonthSeries({
    year: parseIsoDate(window.previousStart).year,
    month: parseIsoDate(window.previousStart).month,
    throughDay: window.previousDaysInMonth,
    dailyTotals: previousTotals,
  });

  const monthToDate = seriesTotalThrough(currentSeries, window.today.day);
  const samePeriodTotal = seriesTotalThrough(previousSeries, window.samePeriodDay);
  const fullMonthTotal = seriesTotalThrough(
    previousSeries,
    window.previousDaysInMonth
  );

  return {
    currency: 'NZD',
    timezone: window.timezone,
    generated_on: window.generatedOn,
    current_month: {
      label: window.currentLabel,
      month_to_date: monthToDate,
      series: currentSeries,
    },
    previous_month: {
      label: window.previousLabel,
      same_period_total: samePeriodTotal,
      full_month_total: fullMonthTotal,
      series: previousSeries,
    },
    comparison_percent: comparisonPercent(monthToDate, samePeriodTotal),
  };
}

export function buildEmptyCollectionsPayload(window) {
  return buildCollectionsPayload({
    window,
    currentRows: [],
    previousRows: [],
  });
}
