import assert from 'node:assert/strict';
import test from 'node:test';
import { getReportingWindow } from './auckland-calendar.js';
import {
  buildCollectionsPayload,
  buildMonthSeries,
  comparisonPercent,
  dailyTotalsByIsoDate,
} from './collections-series.js';

test('zero-collection days stay in the series and keep the cumulative line flat', () => {
  const totals = dailyTotalsByIsoDate([
    { date: '2026-08-01', amount: 40 },
    { date: '2026-08-03', amount: 85.96 },
  ]);

  const series = buildMonthSeries({
    year: 2026,
    month: 8,
    throughDay: 4,
    dailyTotals: totals,
  });

  assert.deepEqual(series, [
    { day: 1, daily: 40, cumulative: 40 },
    { day: 2, daily: 0, cumulative: 40 },
    { day: 3, daily: 85.96, cumulative: 125.96 },
    { day: 4, daily: 0, cumulative: 125.96 },
  ]);
});

test('current-month series stops at today and previous month can continue to month end', () => {
  const window = getReportingWindow(new Date('2026-08-24T12:00:00.000Z'));
  const payload = buildCollectionsPayload({
    window,
    currentRows: [
      { date: '2026-08-01', amount: 40 },
      { date: '2026-08-18', amount: 81.95 },
    ],
    previousRows: [
      { date: '2026-07-01', amount: 100 },
      { date: '2026-07-31', amount: 50 },
    ],
  });

  assert.equal(payload.current_month.series.at(-1).day, 25);
  assert.equal(payload.previous_month.series.at(-1).day, 31);
  assert.equal(payload.previous_month.full_month_total, 150);
  assert.equal(payload.previous_month.same_period_total, 100);
});

test('comparison uses the same day number, not the full previous month', () => {
  const window = getReportingWindow(new Date('2026-08-24T12:00:00.000Z'));
  const payload = buildCollectionsPayload({
    window,
    currentRows: [{ date: '2026-08-01', amount: 1000 }],
    previousRows: [
      { date: '2026-07-25', amount: 2000 },
      { date: '2026-07-31', amount: 500 },
    ],
  });

  assert.equal(payload.current_month.month_to_date, 1000);
  assert.equal(payload.previous_month.same_period_total, 2000);
  assert.equal(payload.previous_month.full_month_total, 2500);
  assert.equal(payload.comparison_percent, -50);
});

test('comparison_percent is null when previous same-period total is zero', () => {
  assert.equal(comparisonPercent(150, 0), null);
  assert.equal(comparisonPercent(0, 0), null);
  assert.equal(comparisonPercent(150, 150), 0);
  assert.equal(comparisonPercent(165, 150), 10);
});

test('February and leap-year series do not fabricate calendar days', () => {
  const nonLeap = buildMonthSeries({
    year: 2026,
    month: 2,
    throughDay: 31,
    dailyTotals: new Map([['2026-02-28', 10]]),
  });
  const leap = buildMonthSeries({
    year: 2024,
    month: 2,
    throughDay: 31,
    dailyTotals: new Map([['2024-02-29', 12]]),
  });

  assert.equal(nonLeap.at(-1).day, 28);
  assert.equal(leap.at(-1).day, 29);
  assert.equal(leap.at(-1).cumulative, 12);
});

test('31-day current month does not invent a 31st day in a 30-day previous month', () => {
  const window = getReportingWindow(new Date('2026-03-30T12:00:00.000Z'));
  const payload = buildCollectionsPayload({
    window,
    currentRows: [{ date: '2026-03-31', amount: 20 }],
    previousRows: [{ date: '2026-02-28', amount: 15 }],
  });

  assert.equal(payload.current_month.series.at(-1).day, 31);
  assert.equal(payload.previous_month.series.at(-1).day, 28);
  assert.equal(payload.previous_month.same_period_total, 15);
});
