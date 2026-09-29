import assert from 'node:assert/strict';
import test from 'node:test';
import { PLAN_DETAIL_TABS, planDetailTabOnOpen } from './plan-detail-tabs.js';

test('summary is the default payment plan detail tab', () => {
  assert.equal(planDetailTabOnOpen(), 'summary');
  assert.equal(PLAN_DETAIL_TABS[0].id, 'summary');
  assert.deepEqual(
    PLAN_DETAIL_TABS.map((tab) => tab.label),
    ['Summary', 'Direct Debit Details', 'Recent Transactions']
  );
});

test('closing and reopening the detail modal returns to Summary', () => {
  let tab = planDetailTabOnOpen();
  tab = 'transactions';
  assert.equal(tab, 'transactions');
  tab = planDetailTabOnOpen();
  assert.equal(tab, 'summary');
});
