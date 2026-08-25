export async function getSalesforceToken() {
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

export async function fetchAllSalesforceRecords({
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
