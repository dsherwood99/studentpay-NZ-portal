import assert from 'node:assert/strict';
import test from 'node:test';
import { handleCollectionsRequest } from './collections-handler.js';

function providerUser(providerName) {
  return {
    publicMetadata: {
      role: 'provider',
      providerName,
    },
  };
}

async function read(response) {
  return {
    status: response.status,
    body: await response.json(),
  };
}

test('signed-out collections requests are denied', async () => {
  const result = await read(
    await handleCollectionsRequest({
      user: null,
      requestUrl: 'https://portal.studentpay.co.nz/api/dashboard/collections',
      queryDailyTotals: async () => {
        throw new Error('Salesforce must not be queried when signed out');
      },
    })
  );

  assert.equal(result.status, 401);
  assert.equal(result.body.success, false);
});

test('collections responses are not cached', async () => {
  const response = await handleCollectionsRequest({
    user: providerUser('Bela Beauty College'),
    requestUrl: 'https://portal.studentpay.co.nz/api/dashboard/collections',
    now: new Date('2026-08-24T12:00:00.000Z'),
    queryDailyTotals: async () => [],
  });

  assert.equal(response.headers.get('Cache-Control'), 'no-store');
});

test('forged provider query params are rejected and do not change tenancy', async () => {
  const calls = [];
  const result = await read(
    await handleCollectionsRequest({
      user: providerUser('Online Learning Institute'),
      requestUrl:
        'https://portal.studentpay.co.nz/api/dashboard/collections?provider=Bela%20Beauty%20College&providerCode=BELA_NZ',
      queryDailyTotals: async (args) => {
        calls.push(args);
        return [];
      },
    })
  );

  assert.equal(result.status, 400);
  assert.equal(calls.length, 0);
  assert.match(result.body.error, /Provider cannot be specified/);
});

test('provider A cannot retrieve provider B collections', async () => {
  const result = await read(
    await handleCollectionsRequest({
      user: providerUser('Online Learning Institute'),
      requestUrl: 'https://portal.studentpay.co.nz/api/dashboard/collections',
      now: new Date('2026-08-24T12:00:00.000Z'),
      queryDailyTotals: async ({ educationProviderPredicate }) => {
        if (educationProviderPredicate.includes('Bela Beauty College')) {
          return [{ date: '2026-08-01', amount: 9999 }];
        }

        if (educationProviderPredicate.includes('Online Learning Institute')) {
          return [{ date: '2026-08-01', amount: 40 }];
        }

        return [{ date: '2026-08-01', amount: 12345 }];
      },
    })
  );

  assert.equal(result.status, 200);
  assert.equal(result.body.current_month.month_to_date, 40);
  assert.notEqual(result.body.current_month.month_to_date, 9999);
});

test('admin aggregation uses the same all-named-providers scope as /api/plans', async () => {
  const predicates = [];
  const result = await read(
    await handleCollectionsRequest({
      user: { publicMetadata: { role: 'admin' } },
      requestUrl: 'https://portal.studentpay.co.nz/api/dashboard/collections',
      now: new Date('2026-08-24T12:00:00.000Z'),
      queryDailyTotals: async ({ educationProviderPredicate }) => {
        predicates.push(educationProviderPredicate);
        return [
          { date: '2026-08-01', amount: 10 },
          { date: '2026-07-01', amount: 20 },
        ];
      },
    })
  );

  assert.equal(result.status, 200);
  assert.ok(predicates.every((item) => item === 'Education_Provider__c != null'));
  assert.equal(result.body.current_month.month_to_date, 10);
  assert.equal(result.body.previous_month.full_month_total, 20);
});

test('collections response stays aggregate-only', async () => {
  const result = await read(
    await handleCollectionsRequest({
      user: providerUser('Bela Beauty College'),
      requestUrl: 'https://portal.studentpay.co.nz/api/dashboard/collections',
      now: new Date('2026-08-24T12:00:00.000Z'),
      queryDailyTotals: async () => [
        {
          date: '2026-08-01',
          amount: 2.87,
        },
      ],
    })
  );

  const json = JSON.stringify(result.body);

  assert.equal(result.status, 200);
  assert.doesNotMatch(json, /006|003RE|a0[A-Z0-9]{15}/i);
  assert.doesNotMatch(json, /student@/i);
  assert.doesNotMatch(json, /mandate/i);
  assert.doesNotMatch(json, /MD123/i);
  assert.equal(result.body.currency, 'NZD');
  assert.ok(Array.isArray(result.body.current_month.series));
});
