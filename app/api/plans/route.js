import { currentUser } from '@clerk/nextjs/server';
import { resolveProviderScope } from '../../../lib/provider-scope.js';
import { buildPlansSoql, mapOpportunityToPlan } from '../../../lib/plans-map.js';
import {
  fetchAllSalesforceRecords,
  getSalesforceToken,
} from '../../../lib/salesforce.js';

export async function GET() {
  try {
    const user = await currentUser();
    const scope = resolveProviderScope(user);

    if (!scope.ok) {
      return Response.json(
        {
          success: false,
          count: 0,
          plans: [],
          message: scope.message,
        },
        { status: scope.status }
      );
    }

    if (scope.empty) {
      return Response.json({
        success: true,
        count: 0,
        plans: [],
        message: scope.message,
      });
    }

    const tokenData = await getSalesforceToken();
    const records = await fetchAllSalesforceRecords({
      instanceUrl: tokenData.instance_url,
      accessToken: tokenData.access_token,
      initialQuery: buildPlansSoql(scope.educationProviderPredicate),
    });

    const plans = records.map(mapOpportunityToPlan);

    return Response.json({
      success: true,
      count: plans.length,
      providerName: scope.providerName || '',
      userName:
        user.firstName ||
        user.fullName ||
        user.primaryEmailAddress?.emailAddress ||
        '',
      plans,
    });
  } catch (error) {
    console.error('Plans API error:', error);

    return Response.json(
      {
        success: false,
        count: 0,
        plans: [],
        error:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred.',
      },
      { status: 500 }
    );
  }
}
