/**
 * Summary cards ignore plans that are not yet active or have been cancelled.
 * The payment-plan table, search, and CSV still use the full list.
 */
export const SUMMARY_EXCLUDED_STAGES = Object.freeze([
  "Payment Plan Sent",
  "Cancelled"
]);

export function isSummaryEligible(plan) {
  const stage = String(plan?.stage ?? "").trim();
  return !SUMMARY_EXCLUDED_STAGES.includes(stage);
}

export function summaryEligiblePlans(plans) {
  return (Array.isArray(plans) ? plans : []).filter(isSummaryEligible);
}

export function buildPortfolioSummary(plans) {
  const eligible = summaryEligiblePlans(plans);

  const totalAmount = eligible.reduce(
    (sum, plan) => sum + Number(plan.amount || 0),
    0
  );
  const totalCollected = eligible.reduce(
    (sum, plan) => sum + Number(plan.collected || 0),
    0
  );
  const totalRemaining = eligible.reduce(
    (sum, plan) => sum + Number(plan.remaining || 0),
    0
  );

  const countStatus = (status) =>
    eligible.filter((plan) => plan.status === status).length;

  return {
    activePlans: eligible.length,
    totalAmount,
    totalCollected,
    totalRemaining,
    currentPlans: countStatus("No Arrears"),
    arrears1To15: countStatus("1 - 15 Days"),
    arrears16To30: countStatus("16 - 30 Days"),
    arrears31To60: countStatus("31 - 60 Days"),
    arrears61Plus:
      countStatus("61 - 90 Days") + countStatus("90+ Days")
  };
}
