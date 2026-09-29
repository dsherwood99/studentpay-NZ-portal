import assert from 'node:assert/strict';
import test from 'node:test';
import {
  addIsoDays,
  buildStatementRows,
  formatNzDateTime,
  presentRecentTransactions,
  recentTransactionWindow,
  statementTransactionPriority,
} from './payer-statement.js';

function row(overrides) {
  return {
    Id: overrides.id || 'a0T000000000001',
    Transaction_Date__c: overrides.date,
    Transaction_Type__c: overrides.type,
    Status__c: overrides.status || 'Posted',
    Debit_Amount__c: overrides.debit ?? 0,
    Credit_Amount__c: overrides.credit ?? 0,
    Net_Amount__c: overrides.net,
    Statement_Visible__c: overrides.visible ?? true,
    Internal_Only__c: overrides.internal ?? false,
    Description__c: overrides.description || null,
    CreatedDate: overrides.created || '2026-09-01T00:00:00.000Z',
  };
}

test('statement priority matches the payer statement type order', () => {
  assert.equal(statementTransactionPriority('Charge'), 10);
  assert.equal(statementTransactionPriority('Late Fee'), 20);
  assert.equal(statementTransactionPriority('Dishonour Fee'), 20);
  assert.equal(statementTransactionPriority('Adjustment Debit'), 20);
  assert.equal(statementTransactionPriority('Payment Received'), 30);
  assert.equal(statementTransactionPriority('Manual'), 30);
  assert.equal(statementTransactionPriority('Reversal'), 40);
  assert.equal(statementTransactionPriority('Adjustment Credit'), 40);
  assert.equal(statementTransactionPriority('Write Off'), 40);
  assert.ok(statementTransactionPriority('Failed Payment') > 40);
});

test('same-day charge is ordered before payment, then reversal', () => {
  const rows = buildStatementRows([
    row({
      id: 'a0T000000000003',
      date: '2026-09-29',
      type: 'Reversal',
      credit: 0,
      debit: 35,
      created: '2026-09-29T01:00:00.000Z',
    }),
    row({
      id: 'a0T000000000002',
      date: '2026-09-29',
      type: 'Payment Received',
      credit: 35,
      created: '2026-09-29T02:00:00.000Z',
    }),
    row({
      id: 'a0T000000000001',
      date: '2026-09-29',
      type: 'Charge',
      debit: 105,
      created: '2026-09-29T03:00:00.000Z',
    }),
  ]);

  assert.deepEqual(
    rows.map((entry) => entry.type),
    ['Charge', 'Payment Received', 'Reversal']
  );
  assert.deepEqual(
    rows.map((entry) => entry.running),
    [105, 70, 105]
  );
  assert.deepEqual(
    rows.map((entry) => entry.net),
    [105, -35, 35]
  );
});

test('transaction date orders rows ahead of CreatedDate', () => {
  const rows = buildStatementRows([
    row({
      id: 'a0T000000000002',
      date: '2026-09-01',
      type: 'Charge',
      debit: 10,
      created: '2026-09-29T00:00:00.000Z',
    }),
    row({
      id: 'a0T000000000001',
      date: '2026-09-20',
      type: 'Charge',
      debit: 5,
      created: '2026-01-01T00:00:00.000Z',
    }),
  ]);

  assert.deepEqual(
    rows.map((entry) => entry.dateIso),
    ['2026-09-01', '2026-09-20']
  );
});

test('running balance keeps earlier activity outside the 60-day window', () => {
  const today = '2026-09-29';
  const older = addIsoDays(today, -61);
  const inside = addIsoDays(today, -10);
  const presented = presentRecentTransactions(
    [
      row({
        id: 'a0T000000000001',
        date: older,
        type: 'Charge',
        debit: 100,
      }),
      row({
        id: 'a0T000000000002',
        date: inside,
        type: 'Payment Received',
        credit: 35,
      }),
      row({
        id: 'a0T000000000003',
        date: today,
        type: 'Charge',
        debit: 35,
      }),
    ],
    today
  );

  assert.equal(presented.transactions.length, 2);
  assert.equal(presented.transactions[0].label, 'Payment Received');
  assert.equal(presented.transactions[0].amount, -35);
  assert.equal(presented.transactions[0].balance, 65);
  assert.equal(presented.transactions[1].label, 'Charge');
  assert.equal(presented.transactions[1].balance, 100);
  assert.equal(presented.from, addIsoDays(today, -60));
  assert.equal(presented.to, today);
});

test('transactions older than 60 days are excluded and an empty window stays empty', () => {
  const today = '2026-09-29';
  const presented = presentRecentTransactions(
    [
      row({
        date: addIsoDays(today, -61),
        type: 'Charge',
        debit: 20,
      }),
    ],
    today
  );

  assert.deepEqual(presented.transactions, []);
  assert.equal(presented.days, 60);
});

test('a wider requested day count cannot expand the window', () => {
  const window = recentTransactionWindow('2026-09-29', 365);
  assert.equal(window.days, 60);
  assert.equal(window.from, '2026-07-31');
});

test('cancelled and internal rows do not affect the statement balance', () => {
  const rows = buildStatementRows([
    row({ date: '2026-09-01', type: 'Charge', debit: 50, status: 'Cancelled' }),
    row({
      date: '2026-09-01',
      type: 'Charge',
      debit: 80,
      internal: true,
    }),
    row({ date: '2026-09-02', type: 'Charge', debit: 20, visible: false }),
    row({ date: '2026-09-03', type: 'Payment Received', credit: 5 }),
  ]);

  assert.equal(rows.length, 1);
  assert.equal(rows[0].net, -5);
  assert.equal(rows[0].running, -5);
});

test('New Zealand date-time formatting does not return a raw ISO value', () => {
  const formatted = formatNzDateTime('2026-09-28T21:14:00.000Z');
  assert.equal(formatted, '29 Sep 2026, 10:14 am');
});
