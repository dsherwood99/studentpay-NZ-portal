import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildPostedPaymentReceivedAggregateSoql,
  mapAggregateCollectionRows,
} from './collections-query.js';
import { containsForbiddenCollectionsData } from './collections-safety.js';
import { buildCollectionsPayload } from './collections-series.js';
import { getReportingWindow } from './auckland-calendar.js';

test('SOQL includes only Posted Payment Received and provider-scoped Opportunities', () => {
  const soql = buildPostedPaymentReceivedAggregateSoql({
    startDate: '2026-08-01',
    endDate: '2026-08-25',
    educationProviderPredicate: "Education_Provider__c = 'Bela Beauty College'",
  });

  assert.match(soql, /Transaction_Type__c = 'Payment Received'/);
  assert.match(soql, /Status__c = 'Posted'/);
  assert.match(soql, /SUM\(Credit_Amount__c\)/);
  assert.match(soql, /GROUP BY Transaction_Date__c/);
  assert.match(
    soql,
    /Opportunity__r\.Education_Provider__c = 'Bela Beauty College'/
  );
  assert.doesNotMatch(soql, /Pending/);
  assert.doesNotMatch(soql, /Reversed/);
  assert.doesNotMatch(soql, /Charge/);
  assert.doesNotMatch(soql, /Adjustment Credit/);
  assert.doesNotMatch(soql, /Write Off/);
  assert.doesNotMatch(soql, /CreatedDate/);
  assert.doesNotMatch(soql, /Paid_To_Date__c/);
});

test('aggregate mapper keeps only date and amount', () => {
  const rows = mapAggregateCollectionRows([
    {
      attributes: { type: 'AggregateResult' },
      Transaction_Date__c: '2026-08-01',
      total: 40,
      Id: 'a0BRE00000FAKEID',
      Opportunity__c: '006RE00000FAKEID',
    },
  ]);

  assert.deepEqual(rows, [{ date: '2026-08-01', amount: 40 }]);
});

test('eligible Posted Payment Received amounts are included in the series', () => {
  const window = getReportingWindow(new Date('2026-08-24T12:00:00.000Z'));
  const payload = buildCollectionsPayload({
    window,
    currentRows: [
      { date: '2026-08-01', amount: 10 },
      { date: '2026-08-02', amount: 5.5 },
    ],
    previousRows: [],
  });

  assert.equal(payload.current_month.month_to_date, 15.5);
});

test('built collections payload contains no Salesforce ids or student data', () => {
  const window = getReportingWindow(new Date('2026-08-24T12:00:00.000Z'));
  const payload = buildCollectionsPayload({
    window,
    currentRows: [{ date: '2026-08-01', amount: 10 }],
    previousRows: [{ date: '2026-07-01', amount: 8 }],
  });

  assert.equal(containsForbiddenCollectionsData(payload), false);
  assert.equal('Id' in payload, false);
});
