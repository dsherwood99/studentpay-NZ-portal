import { currentUser } from '@clerk/nextjs/server';

async function getSalesforceToken() {
  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');
  params.append('client_id', process.env.SALESFORCE_CLIENT_ID);
  params.append('client_secret', process.env.SALESFORCE_CLIENT_SECRET);

  const response = await fetch(`${process.env.SALESFORCE_LOGIN_URL}/services/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(JSON.stringify(data));
  }

  return data;
}

export async function GET() {
  try {

const user = await currentUser();

const role = user?.publicMetadata?.role;
const providerName = user?.publicMetadata?.providerName;

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

    const tokenData = await getSalesforceToken();

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
        Arrears_Category__c,
        Value_of_Each_Instalment__c,
        Payment_Frequency__c,
        Arrears_Days_Calc__c
      FROM Opportunity
${role === 'admin'
  ? 'WHERE Education_Provider__c != null'
  : `WHERE Education_Provider__c = '${providerName.replaceAll("'", "\\'")}'`
}
      ORDER BY Agreement_Date__c DESC
      LIMIT 20
    `;

    const response = await fetch(
      `${tokenData.instance_url}/services/data/v61.0/query?q=${encodeURIComponent(soql)}`,
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return Response.json(
        {
          success: false,
          error: data,
        },
        { status: response.status }
      );
    }

    const plans = data.records.map((record) => ({
      id: record.Id,
      plan: record.Plan_Number__c,
      student: record.Payer_Contact__r?.Name || 'Unknown',
      stage: record.StageName || '',
      authorisationStatus: record.Authorisation_Status__c || '',
      agreementDate: record.Agreement_Date__c || '',
      amount: record.Amount || 0,
      remaining: record.Remaining_Balance__c || 0,
      overdue: record.Overdue_Balance__c || 0,
      status: record.Arrears_Category__c || 'No Arrears',
      course: record.Course_Name__c || '',
      paymentAmount: record.Value_of_Each_Instalment__c || 0,
      frequency: record.Payment_Frequency__c || '',
      daysInArrears: record.Arrears_Days_Calc__c || 0,
    }));

    return Response.json({
      success: true,
      count: plans.length,
      plans,
    });
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}