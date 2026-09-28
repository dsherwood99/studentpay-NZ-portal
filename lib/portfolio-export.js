const COLUMNS = Object.freeze([
  { heading: "Plan Number", value: (plan) => plan.plan },
  { heading: "Student", value: (plan) => plan.student },
  { heading: "Stage", value: (plan) => plan.stage },
  { heading: "Authorisation Status", value: (plan) => plan.authorisationStatus },
  { heading: "Agreement Date", value: (plan) => plan.agreementDate },
  { heading: "Status", value: (plan) => plan.status },
  { heading: "Plan Amount", value: (plan) => plan.amount },
  { heading: "Collected to Date", value: (plan) => plan.collected },
  { heading: "Remaining Balance", value: (plan) => plan.remaining },
  { heading: "Overdue Balance", value: (plan) => plan.overdue },
  { heading: "Days in Arrears", value: (plan) => plan.daysInArrears },
  { heading: "Course", value: (plan) => plan.course },
  { heading: "Payment Amount", value: (plan) => plan.paymentAmount },
  { heading: "Payment Frequency", value: (plan) => plan.frequency }
]);

function escapeCSVValue(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

/**
 * CSV uses the records the caller passes. That is the searched table,
 * including Payment Plan Sent and Cancelled.
 */
export function buildPortfolioCsv(plans) {
  const records = Array.isArray(plans) ? plans : [];

  if (records.length === 0) {
    return "";
  }

  const headerRow = COLUMNS.map((column) => escapeCSVValue(column.heading)).join(",");
  const dataRows = records.map((plan) =>
    COLUMNS.map((column) => escapeCSVValue(column.value(plan))).join(",")
  );

  return [headerRow, ...dataRows].join("\r\n");
}
