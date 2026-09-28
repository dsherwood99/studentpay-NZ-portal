import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildPlansSoql,
  mapCurrentDdaToProviderAuthorisation,
  mapOpportunityToPlan,
} from './plans-map.js';
import { resolveProviderScope } from './provider-scope.js';

function opportunity({ currentDda, extras = {} }) {
  return {
    Id: '006RE00000EXAMPLE',
    Plan_Number__c: 'PLN-1',
    Payer_Contact__r: { Name: 'Test Student' },
    StageName: 'Payment Plan Active',
    Authorisation_Status__c: extras.opportunityAuthorisationStatus ?? 'Customer In Progress',
    Agreement_Date__c: '2026-08-01',
    Amount: 1000,
    Paid_To_Date__c: extras.paidToDate ?? 0,
    Remaining_Balance__c: 900,
    Overdue_Balance__c: 0,
    Arrears_Category__c: 'No Arrears',
    Course_Name__c: 'Diploma',
    Value_of_Each_Instalment__c: 50,
    Payment_Frequency__c: 'Weekly',
    Oldest_Overdue_Days__c: 0,
    Current_Direct_Debit_Authorisation__c: currentDda?.Id || null,
    Current_Direct_Debit_Authorisation__r: currentDda,
    ...extras.record,
  };
}

test('/api/plans still maps Opportunity fields the same way', () => {
  const plan = mapOpportunityToPlan(
    opportunity({
      currentDda: {
        Id: 'a0BA000000CURRENT',
        Direct_Debit_Setup_Complete__c: true,
        Authorisation_Status__c: 'Authorised',
      },
      extras: { paidToDate: 100 },
    })
  );

  assert.equal(plan.plan, 'PLN-1');
  assert.equal(plan.student, 'Test Student');
  assert.equal(plan.collected, 100);
  assert.equal(plan.remaining, 900);
});

test('/api/plans provider and admin SOQL predicates are unchanged', () => {
  const provider = resolveProviderScope({
    publicMetadata: {
      role: 'provider',
      providerName: 'Online Learning Institute',
    },
  });
  const admin = resolveProviderScope({
    publicMetadata: { role: 'admin' },
  });

  assert.match(
    buildPlansSoql(provider.educationProviderPredicate),
    /WHERE Education_Provider__c = 'Online Learning Institute'/
  );
  assert.match(
    buildPlansSoql(admin.educationProviderPredicate),
    /WHERE Education_Provider__c != null/
  );
});

test('plans SOQL resolves the current DDA relationship directly', () => {
  const soql = buildPlansSoql("Education_Provider__c = 'Online Learning Institute'");

  assert.match(
    soql,
    /Current_Direct_Debit_Authorisation__r\.Direct_Debit_Setup_Complete__c/
  );
  assert.match(
    soql,
    /Current_Direct_Debit_Authorisation__r\.Authorisation_Status__c/
  );
  assert.match(
    soql,
    /Current_Direct_Debit_Authorisation__r\.GC_Billing_Request_Status__c/
  );
  assert.match(
    soql,
    /Current_Direct_Debit_Authorisation__r\.GC_Mandate_Status__c/
  );
  assert.doesNotMatch(soql, /Direct_Debit_Authorisations__r/);
  assert.doesNotMatch(soql, /ORDER BY CreatedDate/);
  assert.doesNotMatch(soql, /LIMIT 1/);

  const opportunityFieldLines = soql
    .split('\n')
    .map((line) => line.trim().replace(/,$/, ''))
    .filter(Boolean);
  assert.equal(opportunityFieldLines.includes('Authorisation_Status__c'), false);
});

test('A: Customer In Progress + Direct Debit Setup Complete = Authorised', () => {
  const plan = mapOpportunityToPlan(
    opportunity({
      currentDda: {
        Id: 'a0BA000000CURRENT',
        Direct_Debit_Setup_Complete__c: true,
        Authorisation_Status__c: 'Customer In Progress',
        GC_Billing_Request_Status__c: 'fulfilled',
        GC_Mandate_Status__c: 'pending_submission',
      },
    })
  );

  assert.equal(plan.authorisationStatus, 'Authorised');
});

test('B: current DDA setup complete wins over a newer non-current incomplete DDA', () => {
  const plan = mapOpportunityToPlan(
    opportunity({
      currentDda: {
        Id: 'a0BA000000CURRENT',
        Direct_Debit_Setup_Complete__c: true,
        Authorisation_Status__c: 'Customer In Progress',
        GC_Billing_Request_Status__c: 'fulfilled',
        GC_Mandate_Status__c: 'pending_submission',
      },
      extras: {
        opportunityAuthorisationStatus: 'Customer In Progress',
        record: {
          Direct_Debit_Authorisations__r: {
            records: [
              {
                Id: 'a0BA000000NEWER',
                Direct_Debit_Setup_Complete__c: false,
                Authorisation_Status__c: 'Customer In Progress',
                CreatedDate: '2099-12-31T00:00:00.000+0000',
              },
              {
                Id: 'a0BA000000CURRENT',
                Direct_Debit_Setup_Complete__c: true,
                Authorisation_Status__c: 'Customer In Progress',
                CreatedDate: '2026-01-01T00:00:00.000+0000',
              },
            ],
          },
        },
      },
    })
  );

  assert.equal(plan.authorisationStatus, 'Authorised');
});

test('C: genuine incomplete setup maps to Setup in progress', () => {
  const plan = mapOpportunityToPlan(
    opportunity({
      currentDda: {
        Id: 'a0BA000000CURRENT',
        Direct_Debit_Setup_Complete__c: false,
        Authorisation_Status__c: 'Customer In Progress',
        GC_Billing_Request_Status__c: 'pending',
        GC_Mandate_Status__c: null,
      },
    })
  );

  assert.equal(plan.authorisationStatus, 'Setup in progress');
  assert.equal(
    mapCurrentDdaToProviderAuthorisation(null),
    'Setup in progress'
  );
});

test('D: Cancelled current DDA maps to Cancelled', () => {
  const plan = mapOpportunityToPlan(
    opportunity({
      currentDda: {
        Id: 'a0BA000000CURRENT',
        Direct_Debit_Setup_Complete__c: false,
        Authorisation_Status__c: 'Cancelled',
        GC_Billing_Request_Status__c: 'cancelled',
        GC_Mandate_Status__c: 'cancelled',
      },
    })
  );

  assert.equal(plan.authorisationStatus, 'Cancelled');
});

test('E: failed / expired / blocked / consumed / suspended map to Action required', () => {
  const cases = [
    { Authorisation_Status__c: 'Failed' },
    { Authorisation_Status__c: 'Expired' },
    { GC_Mandate_Status__c: 'failed' },
    { GC_Mandate_Status__c: 'expired' },
    { GC_Mandate_Status__c: 'blocked' },
    { GC_Mandate_Status__c: 'consumed' },
    { GC_Mandate_Status__c: 'suspended_by_payer' },
    { GC_Billing_Request_Status__c: 'failed' },
  ];

  for (const statusFields of cases) {
    const plan = mapOpportunityToPlan(
      opportunity({
        currentDda: {
          Id: 'a0BA000000CURRENT',
          Direct_Debit_Setup_Complete__c: false,
          Authorisation_Status__c: 'Customer In Progress',
          ...statusFields,
        },
      })
    );

    assert.equal(
      plan.authorisationStatus,
      'Action required',
      `expected Action required for ${JSON.stringify(statusFields)}`
    );
  }
});

test('provider status is not derived from payments or Paid To Date', () => {
  const unpaidButComplete = mapOpportunityToPlan(
    opportunity({
      currentDda: {
        Id: 'a0BA000000CURRENT',
        Direct_Debit_Setup_Complete__c: true,
        Authorisation_Status__c: 'Customer In Progress',
      },
      extras: { paidToDate: 0 },
    })
  );
  const paidButIncomplete = mapOpportunityToPlan(
    opportunity({
      currentDda: {
        Id: 'a0BA000000CURRENT',
        Direct_Debit_Setup_Complete__c: false,
        Authorisation_Status__c: 'Customer In Progress',
      },
      extras: { paidToDate: 9999 },
    })
  );

  assert.equal(unpaidButComplete.authorisationStatus, 'Authorised');
  assert.equal(unpaidButComplete.collected, 0);
  assert.equal(paidButIncomplete.authorisationStatus, 'Setup in progress');
  assert.equal(paidButIncomplete.collected, 9999);
});

test('raw Opportunity.Authorisation_Status__c is not the provider-facing state', () => {
  const plan = mapOpportunityToPlan(
    opportunity({
      currentDda: {
        Id: 'a0BA000000CURRENT',
        Direct_Debit_Setup_Complete__c: true,
        Authorisation_Status__c: 'Customer In Progress',
      },
      extras: { opportunityAuthorisationStatus: 'Customer In Progress' },
    })
  );

  assert.equal(plan.authorisationStatus, 'Authorised');
  assert.notEqual(plan.authorisationStatus, 'Customer In Progress');
});
