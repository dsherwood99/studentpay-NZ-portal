import { mapCurrentDdaToProviderAuthorisation } from './plans-map.js';
import { escapeSoqlLiteral } from './provider-scope.js';
import {
  formatNzDateTime,
  presentRecentTransactions,
  nzTodayIso,
} from './payer-statement.js';

const PLAN_NUMBER_PATTERN = /^PLN-\d{1,20}$/;
const SALESFORCE_ID_PATTERN = /^[a-zA-Z0-9]{15,18}$/;

export function assertPlanNumber(value) {
  const planNumber = String(value || '').trim();
  if (!PLAN_NUMBER_PATTERN.test(planNumber)) {
    return { ok: false, planNumber };
  }
  return { ok: true, planNumber };
}

export function buildScopedPlanSoql(educationProviderPredicate, planNumber, fields) {
  return `
    SELECT ${fields}
    FROM Opportunity
    WHERE ${educationProviderPredicate}
      AND Plan_Number__c = '${escapeSoqlLiteral(planNumber)}'
    LIMIT 2
  `;
}

const DIRECT_DEBIT_FIELDS = `
  Id,
  Plan_Number__c,
  Current_Direct_Debit_Authorisation__c,
  Current_Direct_Debit_Authorisation__r.Authorisation_Status__c,
  Current_Direct_Debit_Authorisation__r.Authorised_At__c,
  Current_Direct_Debit_Authorisation__r.Cancelled_At__c,
  Current_Direct_Debit_Authorisation__r.Failed_At__c,
  Current_Direct_Debit_Authorisation__r.Failure_Reason__c,
  Current_Direct_Debit_Authorisation__r.Authorisation_Redirect_URL__c,
  Current_Direct_Debit_Authorisation__r.GC_Billing_Request_URL__c,
  Current_Direct_Debit_Authorisation__r.Direct_Debit_Setup_Complete__c,
  Current_Direct_Debit_Authorisation__r.GC_Mandate_Status__c,
  Current_Direct_Debit_Authorisation__r.GC_Billing_Request_Status__c
`;

export function buildDirectDebitSoql(educationProviderPredicate, planNumber) {
  return buildScopedPlanSoql(
    educationProviderPredicate,
    planNumber,
    DIRECT_DEBIT_FIELDS
  );
}

export function buildPlanIdentitySoql(educationProviderPredicate, planNumber) {
  return buildScopedPlanSoql(
    educationProviderPredicate,
    planNumber,
    'Id, Plan_Number__c'
  );
}

export function buildTransactionsSoql(opportunityId) {
  if (!SALESFORCE_ID_PATTERN.test(String(opportunityId || ''))) {
    throw new Error('Opportunity id from the scoped lookup was not usable.');
  }

  return `
    SELECT
      Id,
      Transaction_Date__c,
      Transaction_Type__c,
      Status__c,
      Debit_Amount__c,
      Credit_Amount__c,
      Net_Amount__c,
      Statement_Visible__c,
      Internal_Only__c,
      Description__c,
      Payment_Category__c,
      CreatedDate
    FROM Account_Transaction__c
    WHERE Opportunity__c = '${opportunityId}'
  `;
}

export function safeAuthorisationUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) {
    return null;
  }
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

export function presentFailureReason(value) {
  const text = String(value || '').trim();
  if (!text) {
    return null;
  }
  if (/stack trace|at Object\./i.test(text)) {
    return null;
  }
  if (/^[a-z0-9_]+$/.test(text)) {
    const words = text.replaceAll('_', ' ');
    return `${words.charAt(0).toUpperCase()}${words.slice(1)}`;
  }
  return text.slice(0, 240);
}

export function presentDirectDebit(record) {
  const dda = record?.Current_Direct_Debit_Authorisation__r || null;
  if (!record?.Current_Direct_Debit_Authorisation__c || !dda) {
    return { directDebit: null };
  }

  return {
    directDebit: {
      status: mapCurrentDdaToProviderAuthorisation(dda),
      authorisedAt: formatNzDateTime(dda.Authorised_At__c),
      cancelledAt: formatNzDateTime(dda.Cancelled_At__c),
      failedAt: formatNzDateTime(dda.Failed_At__c),
      failureReason: presentFailureReason(dda.Failure_Reason__c),
      authorisationUrl: safeAuthorisationUrl(
        dda.Authorisation_Redirect_URL__c || dda.GC_Billing_Request_URL__c
      ),
    },
  };
}

function unavailable(scope) {
  if (!scope?.ok) {
    return {
      status: scope?.status || 401,
      body: {
        success: false,
        error: 'You must be signed in.',
      },
    };
  }
  if (scope.empty || !scope.educationProviderPredicate) {
    return {
      status: 404,
      body: {
        success: false,
        error: 'Payment plan was not found.',
      },
    };
  }
  return null;
}

function rejectedPlan() {
  return {
    status: 400,
    body: {
      success: false,
      error: 'Payment plan was not found.',
    },
  };
}

function missingPlan() {
  return {
    status: 404,
    body: {
      success: false,
      error: 'Payment plan was not found.',
    },
  };
}

function sandboxBlocked(message) {
  return {
    status: 503,
    body: {
      success: false,
      error: message,
    },
  };
}

export async function loadDirectDebitDetail({
  scope,
  planNumber,
  environment = '',
  queryRecords,
}) {
  const blocked = unavailable(scope);
  if (blocked) {
    return blocked;
  }

  const plan = assertPlanNumber(planNumber);
  if (!plan.ok) {
    return rejectedPlan();
  }

  if (String(environment).toLowerCase() === 'sandbox') {
    return sandboxBlocked('Direct Debit details could not be loaded.');
  }

  const records = await queryRecords(
    buildDirectDebitSoql(scope.educationProviderPredicate, plan.planNumber)
  );

  if (!Array.isArray(records) || records.length !== 1) {
    return missingPlan();
  }

  return {
    status: 200,
    body: {
      success: true,
      plan: plan.planNumber,
      ...presentDirectDebit(records[0]),
    },
  };
}

export async function loadRecentTransactions({
  scope,
  planNumber,
  environment = '',
  todayIso = nzTodayIso(),
  queryRecords,
}) {
  const blocked = unavailable(scope);
  if (blocked) {
    return blocked;
  }

  const plan = assertPlanNumber(planNumber);
  if (!plan.ok) {
    return rejectedPlan();
  }

  if (String(environment).toLowerCase() === 'sandbox') {
    return sandboxBlocked('Recent transactions could not be loaded.');
  }

  const plans = await queryRecords(
    buildPlanIdentitySoql(scope.educationProviderPredicate, plan.planNumber)
  );

  if (!Array.isArray(plans) || plans.length !== 1) {
    return missingPlan();
  }

  const transactions = await queryRecords(buildTransactionsSoql(plans[0].Id));

  return {
    status: 200,
    body: {
      success: true,
      plan: plan.planNumber,
      ...presentRecentTransactions(transactions, todayIso),
    },
  };
}
