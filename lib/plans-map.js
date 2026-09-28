const PROVIDER_AUTHORISATION = Object.freeze({
  AUTHORISED: 'Authorised',
  SETUP_IN_PROGRESS: 'Setup in progress',
  ACTION_REQUIRED: 'Action required',
  CANCELLED: 'Cancelled',
});

const CANCELLED_TOKENS = new Set(['cancelled', 'canceled']);

const ACTION_REQUIRED_TOKENS = new Set([
  'failed',
  'expired',
  'blocked',
  'consumed',
  'suspended_by_payer',
  'suspended',
]);

function normalizeStatusToken(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

function isDirectDebitSetupComplete(value) {
  return value === true || value === 'true' || value === 'True';
}

export function mapCurrentDdaToProviderAuthorisation(currentDda) {
  if (!currentDda) {
    return PROVIDER_AUTHORISATION.SETUP_IN_PROGRESS;
  }

  const statusTokens = [
    currentDda.Authorisation_Status__c,
    currentDda.GC_Mandate_Status__c,
    currentDda.GC_Billing_Request_Status__c,
  ].map(normalizeStatusToken);

  if (statusTokens.some((token) => CANCELLED_TOKENS.has(token))) {
    return PROVIDER_AUTHORISATION.CANCELLED;
  }

  if (statusTokens.some((token) => ACTION_REQUIRED_TOKENS.has(token))) {
    return PROVIDER_AUTHORISATION.ACTION_REQUIRED;
  }

  if (isDirectDebitSetupComplete(currentDda.Direct_Debit_Setup_Complete__c)) {
    return PROVIDER_AUTHORISATION.AUTHORISED;
  }

  return PROVIDER_AUTHORISATION.SETUP_IN_PROGRESS;
}

export function mapOpportunityToPlan(record) {
  const currentDda = record?.Current_Direct_Debit_Authorisation__r || null;

  return {
    id: record.Id,
    plan: record.Plan_Number__c || '',
    student: record.Payer_Contact__r?.Name || 'Unknown',
    stage: record.StageName || '',
    authorisationStatus: mapCurrentDdaToProviderAuthorisation(currentDda),
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
  };
}

export function buildPlansSoql(educationProviderPredicate) {
  return `
      SELECT
        Id,
        Name,
        Plan_Number__c,
        StageName,
        Amount,
        Agreement_Date__c,
        Education_Provider__c,
        Current_Direct_Debit_Authorisation__r.Direct_Debit_Setup_Complete__c,
        Current_Direct_Debit_Authorisation__r.Authorisation_Status__c,
        Current_Direct_Debit_Authorisation__r.GC_Billing_Request_Status__c,
        Current_Direct_Debit_Authorisation__r.GC_Mandate_Status__c,
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
      WHERE ${educationProviderPredicate}
      ORDER BY Agreement_Date__c DESC
    `;
}

export { PROVIDER_AUTHORISATION };
