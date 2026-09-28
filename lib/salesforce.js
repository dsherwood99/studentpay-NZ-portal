import crypto from 'node:crypto';

function restorePem(raw) {
  const value = String(raw || '')
    .trim()
    .replaceAll('\\n', '\n');
  const match = value.match(
    /^-----BEGIN ([A-Z0-9 ]+)-----([\s\S]*?)-----END \1-----$/
  );

  if (!match) {
    return value;
  }

  const label = match[1];
  const body = match[2].replace(/\s+/g, '');
  const wrapped = body.match(/.{1,64}/g)?.join('\n') || body;
  return `-----BEGIN ${label}-----\n${wrapped}\n-----END ${label}-----`;
}

function base64UrlEncode(value) {
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(value);
  return buffer.toString('base64url');
}

function signJwtAssertion({ issuer, subject, audience, privateKey }) {
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: issuer,
    sub: subject,
    aud: audience,
    exp: now + 180,
  };
  const unsigned = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(
    JSON.stringify(payload)
  )}`;
  const signature = crypto.sign(
    'RSA-SHA256',
    Buffer.from(unsigned),
    restorePem(privateKey)
  );

  return `${unsigned}.${base64UrlEncode(signature)}`;
}

export function usesSalesforceJwt() {
  return Boolean(
    process.env.SALESFORCE_PRIVATE_KEY && process.env.SALESFORCE_USERNAME
  );
}

async function getSalesforceJwtToken() {
  const loginUrl = String(process.env.SALESFORCE_LOGIN_URL || '').replace(
    /\/$/,
    ''
  );
  const assertion = signJwtAssertion({
    issuer: process.env.SALESFORCE_CLIENT_ID,
    subject: process.env.SALESFORCE_USERNAME,
    audience: loginUrl,
    privateKey: process.env.SALESFORCE_PRIVATE_KEY,
  });
  const params = new URLSearchParams();
  params.append('grant_type', 'urn:ietf:params:oauth:grant-type:jwt-bearer');
  params.append('assertion', assertion);

  const response = await fetch(`${loginUrl}/services/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
    cache: 'no-store',
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      `Salesforce authentication failed: ${JSON.stringify(data)}`
    );
  }

  return data;
}

async function getSalesforceClientCredentialsToken() {
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

export async function getSalesforceToken() {
  if (usesSalesforceJwt()) {
    return getSalesforceJwtToken();
  }

  return getSalesforceClientCredentialsToken();
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
