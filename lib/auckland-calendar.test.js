import assert from 'node:assert/strict';
import test from 'node:test';
import {
  daysInMonth,
  getReportingWindow,
  previousMonth,
  toIsoDateString,
} from './auckland-calendar.js';

test('Pacific/Auckland date is used instead of UTC calendar day', () => {
  const utcMorningPriorDay = new Date('2026-08-24T12:30:00.000Z');

  assert.equal(toIsoDateString(utcMorningPriorDay), '2026-08-25');

  const window = getReportingWindow(utcMorningPriorDay);

  assert.equal(window.generatedOn, '2026-08-25');
  assert.equal(window.currentStart, '2026-08-01');
  assert.equal(window.currentEnd, '2026-08-25');
  assert.equal(window.previousStart, '2026-07-01');
  assert.equal(window.previousEnd, '2026-07-31');
  assert.equal(window.currentLabel, 'August 2026');
  assert.equal(window.previousLabel, 'July 2026');
  assert.equal(window.timezone, 'Pacific/Auckland');
});

test('does not convert a Salesforce Date string through UTC', () => {
  assert.equal(toIsoDateString('2026-08-01'), '2026-08-01');
  assert.equal(toIsoDateString('2026-08-01T00:00:00.000+0000'), '2026-08-01');
});

test('month length helpers cover February, leap years, and 30/31-day months', () => {
  assert.equal(daysInMonth(2026, 2), 28);
  assert.equal(daysInMonth(2024, 2), 29);
  assert.equal(daysInMonth(2026, 4), 30);
  assert.equal(daysInMonth(2026, 8), 31);
  assert.deepEqual(previousMonth(2026, 3), { year: 2026, month: 2 });
  assert.deepEqual(previousMonth(2026, 1), { year: 2025, month: 12 });
});

test('31 March same-period day clamps to 28 February in a non-leap year', () => {
  const window = getReportingWindow(new Date('2026-03-30T12:00:00.000Z'));

  assert.equal(window.generatedOn, '2026-03-31');
  assert.equal(window.previousDaysInMonth, 28);
  assert.equal(window.samePeriodDay, 28);
  assert.equal(window.previousEnd, '2026-02-28');
});
