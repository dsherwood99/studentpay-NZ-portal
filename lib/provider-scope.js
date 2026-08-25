export const TENANCY_QUERY_KEYS = Object.freeze([
  'provider',
  'providerId',
  'providerCode',
  'providerName',
  'educationProvider',
]);

export function hasForbiddenTenancyQuery(searchParams) {
  if (!searchParams) {
    return false;
  }

  return TENANCY_QUERY_KEYS.some((key) => searchParams.has(key));
}

export function escapeSoqlLiteral(value) {
  return String(value || '').replaceAll("'", "\\'");
}

export function resolveProviderScope(user) {
  if (!user) {
    return {
      ok: false,
      status: 401,
      message: 'You must be signed in.',
    };
  }

  const role = user.publicMetadata?.role;
  const providerName = user.publicMetadata?.providerName;

  if (!role) {
    return {
      ok: true,
      empty: true,
      role: '',
      providerName: '',
      educationProviderPredicate: null,
      message: 'No role configured for this user.',
    };
  }

  if (role === 'provider' && !providerName) {
    return {
      ok: true,
      empty: true,
      role,
      providerName: '',
      educationProviderPredicate: null,
      message: 'No provider configured for this user.',
    };
  }

  const educationProviderPredicate =
    role === 'admin'
      ? 'Education_Provider__c != null'
      : `Education_Provider__c = '${escapeSoqlLiteral(providerName)}'`;

  return {
    ok: true,
    empty: false,
    role,
    providerName: providerName || '',
    educationProviderPredicate,
  };
}

export function opportunityWhereClause(educationProviderPredicate) {
  return `WHERE ${educationProviderPredicate}`;
}

export function accountTransactionProviderPredicate(educationProviderPredicate) {
  return `Opportunity__r.${educationProviderPredicate}`;
}
