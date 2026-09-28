import assert from 'node:assert/strict';
import test from 'node:test';
import {
  COLLECTIONS_SETTLEMENT_LAG_BUSINESS_DAYS,
  subtractBusinessDays,
} from './business-days.js';

test('subtracts 5 business days on a normal weekday', () => {
  assert.equal(COLLECTIONS_SETTLEMENT_LAG_BUSINESS_DAYS, 5);
  assert.equal(subtractBusinessDays('2026-08-25', 5), '2026-08-18');
});

test('weekend crossing skips Saturday and Sunday', () => {
  assert.equal(subtractBusinessDays('2026-08-22', 5), '2026-08-17');
});

test('Monday cutoff crosses the prior weekend', () => {
  assert.equal(subtractBusinessDays('2026-08-24', 5), '2026-08-17');
});

test('month-boundary cutoff can land in the previous calendar month', () => {
  assert.equal(subtractBusinessDays('2026-09-03', 5), '2026-08-27');
});
