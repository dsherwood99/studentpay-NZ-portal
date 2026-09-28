const FORBIDDEN_KEY_PATTERN =
  /(opportunity|contact|account_transaction|mandate|gocardless|bank|payer|student|email|allocation|reference)/i;

const SALESFORCE_ID_PATTERN = /\b[a-zA-Z0-9]{15}(?:[a-zA-Z0-9]{3})?\b/;

const FORBIDDEN_KEYS = new Set([
  'Id',
  'id',
  'OpportunityId',
  'opportunity_id',
  'ContactId',
  'contact_id',
  'AccountId',
  'student',
  'email',
  'mandate_id',
  'GC_Mandate_ID__c',
  'External_Reference__c',
  'Source_Record_ID__c',
]);

function walk(value, visit) {
  if (Array.isArray(value)) {
    value.forEach((item) => walk(item, visit));
    return;
  }

  if (value && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) {
      visit(key, nested);
      walk(nested, visit);
    }
  }
}

export function containsForbiddenCollectionsData(payload) {
  let forbidden = false;

  walk(payload, (key, nested) => {
    if (FORBIDDEN_KEYS.has(key) || FORBIDDEN_KEY_PATTERN.test(key)) {
      forbidden = true;
    }

    if (typeof nested === 'string' && SALESFORCE_ID_PATTERN.test(nested)) {
      const looksLikeIsoDate = /^\d{4}-\d{2}-\d{2}$/.test(nested);
      const looksLikeMonthLabel = /^[A-Za-z]+ \d{4}$/.test(nested);
      const looksLikeTimezone = nested === 'Pacific/Auckland' || nested === 'NZD';

      if (!looksLikeIsoDate && !looksLikeMonthLabel && !looksLikeTimezone) {
        forbidden = true;
      }
    }
  });

  return forbidden;
}

export function assertAggregateOnly(payload) {
  if (containsForbiddenCollectionsData(payload)) {
    throw new Error('Collections payload contained non-aggregate fields.');
  }

  return payload;
}
