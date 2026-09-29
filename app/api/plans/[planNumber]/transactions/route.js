import { currentUser } from '@clerk/nextjs/server';
import { loadRecentTransactions } from '../../../../../lib/plan-detail.js';
import { resolveProviderScope } from '../../../../../lib/provider-scope.js';
import {
  fetchAllSalesforceRecords,
  getSalesforceToken,
} from '../../../../../lib/salesforce.js';

async function queryRecords(soql) {
  const tokenData = await getSalesforceToken();
  return fetchAllSalesforceRecords({
    instanceUrl: tokenData.instance_url,
    accessToken: tokenData.access_token,
    initialQuery: soql,
  });
}

export async function GET(_request, context) {
  try {
    const { planNumber } = await context.params;
    const user = await currentUser();
    const result = await loadRecentTransactions({
      scope: resolveProviderScope(user),
      planNumber: decodeURIComponent(planNumber || ''),
      environment: process.env.STUDENTPAY_ENV || '',
      queryRecords,
    });

    return Response.json(result.body, {
      status: result.status,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('Recent transactions error:', error);
    return Response.json(
      {
        success: false,
        error: 'Recent transactions could not be loaded.',
      },
      {
        status: 500,
        headers: { 'Cache-Control': 'no-store' },
      }
    );
  }
}
