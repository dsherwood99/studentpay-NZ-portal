import assert from 'node:assert/strict';
import test from 'node:test';
import {
  accountTransactionProviderPredicate,
  hasForbiddenTenancyQuery,
  opportunityWhereClause,
  resolveProviderScope,
} from './provider-scope.js';

test('signed-out users are denied', () => {
  const scope = resolveProviderScope(null);

  assert.equal(scope.ok, false);
  assert.equal(scope.status, 401);
});

test('provider tenancy is derived from Clerk metadata, not a request value', () => {
  const scope = resolveProviderScope({
    publicMetadata: {
      role: 'provider',
      providerName: "Bela Beauty College",
    },
  });

  assert.equal(scope.empty, false);
  assert.equal(
    scope.educationProviderPredicate,
    "Education_Provider__c = 'Bela Beauty College'"
  );
  assert.equal(
    accountTransactionProviderPredicate(scope.educationProviderPredicate),
    "Opportunity__r.Education_Provider__c = 'Bela Beauty College'"
  );
});

test('provider A predicate cannot be rewritten to provider B', () => {
  const scope = resolveProviderScope({
    publicMetadata: {
      role: 'provider',
      providerName: 'Online Learning Institute',
    },
  });

  assert.match(scope.educationProviderPredicate, /Online Learning Institute/);
  assert.doesNotMatch(scope.educationProviderPredicate, /Bela Beauty College/);
});

test('admin scope matches /api/plans: all named education providers', () => {
  const scope = resolveProviderScope({
    publicMetadata: { role: 'admin' },
  });

  assert.equal(scope.educationProviderPredicate, 'Education_Provider__c != null');
  assert.equal(
    opportunityWhereClause(scope.educationProviderPredicate),
    'WHERE Education_Provider__c != null'
  );
});

test('forged provider query keys are detected and must be rejected', () => {
  const params = new URLSearchParams({
    provider: 'Bela Beauty College',
    providerId: '001RE00000r7vKwYAI',
    providerCode: 'BELA_NZ',
  });

  assert.equal(hasForbiddenTenancyQuery(params), true);
  assert.equal(hasForbiddenTenancyQuery(new URLSearchParams()), false);
});
