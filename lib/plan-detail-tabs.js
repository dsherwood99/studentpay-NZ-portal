export const PLAN_DETAIL_TABS = Object.freeze([
  { id: 'summary', label: 'Summary' },
  { id: 'direct-debit', label: 'Direct Debit Details' },
  { id: 'transactions', label: 'Recent Transactions' },
]);

export function planDetailTabOnOpen() {
  return 'summary';
}
