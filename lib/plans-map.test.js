import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPlansSoql, mapOpportunityToPlan } from './plans-map.js';
import { resolveProviderScope } from './provider-scope.js';

test('/api/plans still maps Opportunity fields the same way', () => {
  const plan = mapOpportunityToPlan({
    Id: '006RE00000EXAMPLE',
    Plan_Number__c: 'PLN-1',
    Payer_Contact__r: { Name: 'Test Student' },
    StageName: 'Payment Plan Active',
    Authorisation_Status__c: 'Authorised',
    Agreement_Date__c: '2026-08-01',
    Amount: 1000,
    Paid_To_Date__c: 100,
    Remaining_Balance__c: 900,
    Overdue_Balance__c: 0,
    Arrears_Category__c: 'No Arrears',
    Course_Name__c: 'Diploma',
    Value_of_Each_Instalment__c: 50,
    Payment_Frequency__c: 'Weekly',
    Oldest_Overdue_Days__c: 0,
  });

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
