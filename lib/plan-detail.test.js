import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPlansSoql } from './plans-map.js';
import {
  buildTransactionsSoql,
  loadDirectDebitDetail,
  loadRecentTransactions,
  presentDirectDebit,
  presentFailureReason,
  safeAuthorisationUrl,
} from './plan-detail.js';

function providerScope(providerName) {
  return {
    ok: true,
    empty: false,
    providerName,
    educationProviderPredicate: `Education_Provider__c = '${providerName}'`,
  };
}

function dda(overrides = {}) {
  return {
    Id: 'a0B000000000001AAA',
    Plan_Number__c: 'PLN-1000000446',
    Current_Direct_Debit_Authorisation__c: 'a0D000000000001AAA',
    Current_Direct_Debit_Authorisation__r: {
      Authorisation_Status__c: 'Authorised',
      Direct_Debit_Setup_Complete__c: true,
      GC_Mandate_Status__c: 'active',
      GC_Billing_Request_Status__c: 'fulfilled',
      Authorised_At__c: '2026-09-28T21:14:00.000Z',
      Cancelled_At__c: null,
      Failed_At__c: null,
      Failure_Reason__c: null,
      Authorisation_Redirect_URL__c:
        'https://pay.gocardless.com/billing/static/flow?id=BRQ123',
      GC_Billing_Request_URL__c:
        'https://pay.gocardless.com/billing/static/flow?id=BRQ123',
      GC_Customer_ID__c: 'CU000SECRET',
      GC_Billing_Request_ID__c: 'BRQ123',
      ...overrides.dda,
    },
    ...overrides.record,
  };
}

test('the payment plan list query does not load direct debit URLs or transactions', () => {
  const soql = buildPlansSoql("Education_Provider__c = 'Provider A'");
  assert.doesNotMatch(soql, /Authorised_At__c|GC_Billing_Request_URL__c|Account_Transaction__c/);
});

test('authorised direct debit presents friendly status, time, and the stored URL', () => {
  const presented = presentDirectDebit(dda());
  assert.equal(presented.directDebit.status, 'Authorised');
  assert.equal(presented.directDebit.authorisedAt, '29 Sep 2026, 10:14 am');
  assert.equal(presented.directDebit.cancelledAt, null);
  assert.equal(presented.directDebit.failedAt, null);
  assert.equal(presented.directDebit.failureReason, null);
  assert.equal(
    presented.directDebit.authorisationUrl,
    'https://pay.gocardless.com/billing/static/flow?id=BRQ123'
  );
  assert.doesNotMatch(JSON.stringify(presented), /CU000SECRET|a0D000000000001|BRQ123SECRET/);
});

test('setup in progress, failed, and cancelled direct debits keep blank timestamps empty', () => {
  const setup = presentDirectDebit(
    dda({
      dda: {
        Authorisation_Status__c: 'Draft',
        Direct_Debit_Setup_Complete__c: false,
        GC_Mandate_Status__c: null,
        GC_Billing_Request_Status__c: 'pending',
        Authorised_At__c: null,
        Authorisation_Redirect_URL__c: null,
        GC_Billing_Request_URL__c: null,
      },
    })
  );
  assert.equal(setup.directDebit.status, 'Setup in progress');
  assert.equal(setup.directDebit.authorisedAt, null);
  assert.equal(setup.directDebit.authorisationUrl, null);

  const failed = presentDirectDebit(
    dda({
      dda: {
        Authorisation_Status__c: 'Failed',
        Direct_Debit_Setup_Complete__c: false,
        Failed_At__c: '2026-09-28T21:14:00.000Z',
        Failure_Reason__c: 'bank_account_closed',
        Authorisation_Redirect_URL__c: null,
        GC_Billing_Request_URL__c: null,
      },
    })
  );
  assert.equal(failed.directDebit.status, 'Action required');
  assert.equal(failed.directDebit.failedAt, '29 Sep 2026, 10:14 am');
  assert.equal(failed.directDebit.failureReason, 'Bank account closed');

  const cancelled = presentDirectDebit(
    dda({
      dda: {
        Authorisation_Status__c: 'Cancelled',
        Direct_Debit_Setup_Complete__c: false,
        Cancelled_At__c: '2026-09-28T21:14:00.000Z',
        Authorisation_Redirect_URL__c: '',
        GC_Billing_Request_URL__c: '',
      },
    })
  );
  assert.equal(cancelled.directDebit.status, 'Cancelled');
  assert.equal(cancelled.directDebit.cancelledAt, '29 Sep 2026, 10:14 am');
  assert.equal(cancelled.directDebit.authorisationUrl, null);
});

test('a missing direct debit authorisation is an empty result, not an error', () => {
  const presented = presentDirectDebit({
    Id: '006000000000001AAA',
    Plan_Number__c: 'PLN-1000000446',
    Current_Direct_Debit_Authorisation__c: null,
    Current_Direct_Debit_Authorisation__r: null,
  });
  assert.equal(presented.directDebit, null);
});

test('blank timestamps and an unavailable redirect URL stay empty', () => {
  assert.equal(presentFailureReason(null), null);
  assert.equal(presentFailureReason('   '), null);
  assert.equal(safeAuthorisationUrl(''), null);
  assert.equal(safeAuthorisationUrl('javascript:alert(1)'), null);
  assert.equal(
    safeAuthorisationUrl('https://pay.gocardless.com/flow'),
    'https://pay.gocardless.com/flow'
  );
});

test('a provider can read their own direct debit and transactions', async () => {
  const directDebit = await loadDirectDebitDetail({
    scope: providerScope('Provider A'),
    planNumber: 'PLN-1000000446',
    queryRecords: async (soql) => {
      assert.match(soql, /Education_Provider__c = 'Provider A'/);
      assert.match(soql, /Plan_Number__c = 'PLN-1000000446'/);
      return [dda()];
    },
  });
  assert.equal(directDebit.status, 200);
  assert.equal(directDebit.body.directDebit.status, 'Authorised');

  const transactions = await loadRecentTransactions({
    scope: providerScope('Provider A'),
    planNumber: 'PLN-1000000446',
    todayIso: '2026-09-29',
    queryRecords: async (soql) => {
      if (soql.includes('FROM Opportunity')) {
        assert.match(soql, /Education_Provider__c = 'Provider A'/);
        return [{ Id: '006000000000001AAA', Plan_Number__c: 'PLN-1000000446' }];
      }
      assert.match(soql, /Opportunity__c = '006000000000001AAA'/);
      assert.doesNotMatch(soql, /Provider A/);
      return [
        {
          Id: 'a0T000000000001',
          Transaction_Date__c: '2026-09-29',
          Transaction_Type__c: 'Charge',
          Status__c: 'Posted',
          Debit_Amount__c: 35,
          Credit_Amount__c: 0,
          Statement_Visible__c: true,
          Internal_Only__c: false,
          CreatedDate: '2026-09-29T00:00:00.000Z',
        },
      ];
    },
  });
  assert.equal(transactions.status, 200);
  assert.equal(transactions.body.transactions.length, 1);
  assert.equal(transactions.body.transactions[0].amount, 35);
  assert.equal(transactions.body.transactions[0].balance, 35);
  assert.doesNotMatch(JSON.stringify(transactions.body), /006000000000001|a0T000000000001/);
});

test('another provider direct debit or transaction history is not returned', async () => {
  const directDebit = await loadDirectDebitDetail({
    scope: providerScope('Provider A'),
    planNumber: 'PLN-1000000999',
    queryRecords: async (soql) => {
      assert.match(soql, /Education_Provider__c = 'Provider A'/);
      assert.doesNotMatch(soql, /Provider B/);
      return [];
    },
  });
  assert.equal(directDebit.status, 404);
  assert.equal(directDebit.body.success, false);

  const transactions = await loadRecentTransactions({
    scope: providerScope('Provider A'),
    planNumber: 'PLN-1000000999',
    queryRecords: async () => [],
  });
  assert.equal(transactions.status, 404);
});

test('a forged plan number or opportunity id is rejected before Salesforce is queried', async () => {
  let calls = 0;
  const queryRecords = async () => {
    calls += 1;
    return [{ Id: '006000000000001AAA' }];
  };

  const forgedPlan = await loadDirectDebitDetail({
    scope: providerScope('Provider A'),
    planNumber: "PLN-1' OR Education_Provider__c != null",
    queryRecords,
  });
  const forgedId = await loadRecentTransactions({
    scope: providerScope('Provider A'),
    planNumber: '006000000000001AAA',
    queryRecords,
  });

  assert.equal(forgedPlan.status, 400);
  assert.equal(forgedId.status, 400);
  assert.equal(calls, 0);
});

test('transaction lookup refuses an opportunity id that did not come from the scoped plan', () => {
  assert.throws(() => buildTransactionsSoql("006000000000001' OR Id != null"));
});

test('unsigned and sandbox reads do not query Salesforce', async () => {
  let calls = 0;
  const queryRecords = async () => {
    calls += 1;
    return [];
  };

  const unsigned = await loadDirectDebitDetail({
    scope: { ok: false, status: 401 },
    planNumber: 'PLN-1000000446',
    queryRecords,
  });
  const sandbox = await loadRecentTransactions({
    scope: providerScope('Provider A'),
    planNumber: 'PLN-1000000446',
    environment: 'sandbox',
    queryRecords,
  });

  assert.equal(unsigned.status, 401);
  assert.equal(sandbox.status, 503);
  assert.equal(calls, 0);
});
