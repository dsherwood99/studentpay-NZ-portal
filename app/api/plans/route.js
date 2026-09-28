import { currentUser } from '@clerk/nextjs/server';
import { resolveProviderScope } from '../../../lib/provider-scope.js';
import { buildPlansSoql, mapOpportunityToPlan } from '../../../lib/plans-map.js';
import {
  fetchAllSalesforceRecords,
  getSalesforceToken,
} from '../../../lib/salesforce.js';

async function sandboxPlans({ user, providerName }) {
  const apiBase = String(process.env.STUDENTPAY_API_BASE_URL || "").replace(/\/$/, "");
  const apiKey = String(process.env.PORTAL_ENROLMENT_API_KEY || "");

  if (!apiBase.toLowerCase().includes("sandbox") || !apiKey) {
    return Response.json(
      {
        success: false,
        count: 0,
        plans: [],
        environment: "sandbox",
        error: "Sandbox payment plans are not available in this environment.",
      },
      { status: 503 }
    );
  }

  const agentName = [user.firstName, user.lastName].filter(Boolean).join(" ");
  const email = String(user.primaryEmailAddress?.emailAddress || "")
    .trim()
    .toLowerCase();

  let upstream;

  try {
    upstream = await fetch(`${apiBase}/v1/provider/plans`, {
      headers: {
        "x-studentpay-portal-enrolment-key": apiKey,
        "x-studentpay-provider-name": providerName,
        "x-studentpay-agent-email": email,
        "x-studentpay-agent-name": agentName,
        "x-studentpay-agent-user-id": user.id,
      },
      cache: "no-store",
    });
  } catch {
    return Response.json(
      {
        success: false,
        count: 0,
        plans: [],
        environment: "sandbox",
        error: "Sandbox payment plans could not be loaded.",
      },
      { status: 502 }
    );
  }

  const payload = await upstream.json().catch(() => ({}));

  if (!upstream.ok || !payload.success) {
    return Response.json(
      {
        success: false,
        count: 0,
        plans: [],
        environment: "sandbox",
        error: payload?.error?.message || "Sandbox payment plans could not be loaded.",
      },
      { status: upstream.status || 502 }
    );
  }

  return Response.json({
    success: true,
    environment: "sandbox",
    count: payload.count || 0,
    providerName: payload.providerName || providerName,
    userName:
      user.firstName ||
      user.fullName ||
      user.primaryEmailAddress?.emailAddress ||
      "",
    plans: payload.plans || [],
  });
}

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

    if (String(process.env.STUDENTPAY_ENV || "").toLowerCase() === "sandbox") {
      return sandboxPlans({ user, providerName: scope.providerName });
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
