import { toIsoDateString } from './auckland-calendar.js';
import { roundMoney } from './collections-series.js';
import { accountTransactionProviderPredicate } from './provider-scope.js';
import { fetchAllSalesforceRecords, getSalesforceToken } from './salesforce.js';

export const POSTED_PAYMENT_RECEIVED_FILTER = Object.freeze({
  transactionType: 'Payment Received',
  status: 'Posted',
});

export function mapAggregateCollectionRows(records) {
  const totals = [];

  for (const record of records || []) {
    const date = toIsoDateString(record.Transaction_Date__c ?? record.date ?? '');

    if (!date) {
      continue;
    }

    totals.push({
      date,
      amount: roundMoney(record.total ?? record.expr0 ?? record.amount ?? 0),
    });
  }

  return totals;
}

export function buildPostedPaymentReceivedAggregateSoql({
  startDate,
  endDate,
  educationProviderPredicate,
}) {
  return `
      SELECT
        Transaction_Date__c,
        SUM(Credit_Amount__c) total
      FROM Account_Transaction__c
      WHERE Transaction_Type__c = '${POSTED_PAYMENT_RECEIVED_FILTER.transactionType}'
        AND Status__c = '${POSTED_PAYMENT_RECEIVED_FILTER.status}'
        AND Transaction_Date__c >= ${startDate}
        AND Transaction_Date__c <= ${endDate}
        AND ${accountTransactionProviderPredicate(educationProviderPredicate)}
      GROUP BY Transaction_Date__c
      ORDER BY Transaction_Date__c
    `;
}

export async function queryPostedPaymentReceivedByDay({
  startDate,
  endDate,
  educationProviderPredicate,
  getToken = getSalesforceToken,
  fetchRecords = fetchAllSalesforceRecords,
}) {
  const tokenData = await getToken();
  const soql = buildPostedPaymentReceivedAggregateSoql({
    startDate,
    endDate,
    educationProviderPredicate,
  });

  const records = await fetchRecords({
    instanceUrl: tokenData.instance_url,
    accessToken: tokenData.access_token,
    initialQuery: soql,
  });

  return mapAggregateCollectionRows(records);
}
