import { currentUser } from '@clerk/nextjs/server';

async function getSalesforceToken() {
  const params = new URLSearchParams();

  params.append('grant_type', 'client_credentials');
  params.append('client_id', process.env.SALESFORCE_CLIENT_ID);
  params.append('client_secret', process.env.SALESFORCE_CLIENT_SECRET);

  const response = await fetch(
    `${process.env.SALESFORCE_LOGIN_URL}/services/oauth2/token`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
      cache: 'no-store',
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      `Salesforce authentication failed: ${JSON.stringify(data)}`
    );
  }

  return data;
}

async function fetchAllSalesforceRecords({
  instanceUrl,
  accessToken,
  initialQuery,
}) {
  const allRecords = [];

  let nextUrl =
    `${instanceUrl}/services/data/v61.0/query?q=` +
    encodeURIComponent(initialQuery);

  while (nextUrl) {
    const response = await fetch(nextUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: 'no-store',
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        `Salesforce query failed: ${JSON.stringify(data)}`
      );
    }

    allRecords.push(...(data.records || []));

    nextUrl = data.nextRecordsUrl
      ? `${instanceUrl}${data.nextRecordsUrl}`
      : null;
  }

  return allRecords;
}

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

    if (!user) {
      return Response.json(
        {
          success: false,
          count: 0,
          plans: [],
          message: 'You must be signed in.',
        },
        { status: 401 }
      );
    }

    const role = user.publicMetadata?.role;
    const providerName = user.publicMetadata?.providerName;

    if (!role) {
      return Response.json({
        success: true,
        count: 0,
        plans: [],
        message: 'No role configured for this user.',
      });
    }

    if (role === 'provider' && !providerName) {
      return Response.json({
        success: true,
        count: 0,
        plans: [],
        message: 'No provider configured for this user.',
      });
    }

    if (String(process.env.STUDENTPAY_ENV || "").toLowerCase() === "sandbox") {
      return sandboxPlans({ user, providerName });
    }

    const tokenData = await getSalesforceToken();

    const safeProviderName = String(providerName || '').replaceAll(
      "'",
      "\\'"
    );

    const providerWhereClause =
      role === 'admin'
        ? 'WHERE Education_Provider__c != null'
        : `WHERE Education_Provider__c = '${safeProviderName}'`;

    const soql = `
      SELECT
        Id,
        Name,
        Plan_Number__c,
        StageName,
        Amount,
        Agreement_Date__c,
        Education_Provider__c,
        Authorisation_Status__c,
        Payer_Contact__r.Name,
        Course_Name__c,
        Remaining_Balance__c,
        Current_Balance__c,
        Overdue_Balance__c,
        Paid_To_Date__c,
        Arrears_Category__c,
        Value_of_Each_Instalment__c,
        Payment_Frequency__c,
        Oldest_Overdue_Days__c
      FROM Opportunity
      ${providerWhereClause}
      ORDER BY Agreement_Date__c DESC
    `;

    const records = await fetchAllSalesforceRecords({
      instanceUrl: tokenData.instance_url,
      accessToken: tokenData.access_token,
      initialQuery: soql,
    });

    const plans = records.map((record) => ({
      id: record.Id,
      plan: record.Plan_Number__c || '',
      student: record.Payer_Contact__r?.Name || 'Unknown',
      stage: record.StageName || '',
      authorisationStatus: record.Authorisation_Status__c || '',
      agreementDate: record.Agreement_Date__c || '',
      amount: record.Amount ?? 0,
      collected: record.Paid_To_Date__c ?? 0,
      remaining: record.Remaining_Balance__c ?? 0,
      overdue: record.Overdue_Balance__c ?? 0,
      status: record.Arrears_Category__c || 'No Arrears',
      course: record.Course_Name__c || '',
      paymentAmount: record.Value_of_Each_Instalment__c ?? 0,
      frequency: record.Payment_Frequency__c || '',
      daysInArrears: record.Oldest_Overdue_Days__c ?? 0,
    }));

    return Response.json({
      success: true,
      count: plans.length,
      providerName: providerName || '',
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