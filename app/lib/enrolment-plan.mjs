/**
 * Instalment counts copied from the OCA provider JotForm.
 * 18-month fortnightly is 36. The server recalculates the same table.
 */
export const INSTALMENT_COUNTS = Object.freeze({
  6: Object.freeze({ Weekly: 26, Fortnightly: 13, Monthly: 6 }),
  12: Object.freeze({ Weekly: 52, Fortnightly: 26, Monthly: 12 }),
  18: Object.freeze({ Weekly: 78, Fortnightly: 36, Monthly: 18 }),
  24: Object.freeze({ Weekly: 104, Fortnightly: 52, Monthly: 24 }),
  36: Object.freeze({ Weekly: 156, Fortnightly: 78, Monthly: 36 })
});

export const PAYMENT_FREQUENCIES = Object.freeze([
  "Weekly",
  "Fortnightly",
  "Monthly"
]);

export const TERM_MONTHS = Object.freeze([6, 12, 18, 24, 36]);

const FREQUENCY_ADVERB = Object.freeze({
  Weekly: "weekly",
  Fortnightly: "fortnightly",
  Monthly: "monthly"
});

export function moneyToCents(value) {
  const raw = String(value ?? "").trim().replace(/[$,\s]/g, "");

  if (!raw) {
    return { ok: false };
  }

  if (!/^\d+(\.\d{1,2})?$/.test(raw)) {
    return { ok: false };
  }

  const [dollars, fraction = ""] = raw.split(".");
  const cents = Number(dollars) * 100 + Number(fraction.padEnd(2, "0"));

  if (!Number.isSafeInteger(cents)) {
    return { ok: false };
  }

  return { ok: true, cents };
}

export function centsToMoney(cents) {
  return (Number(cents) / 100).toFixed(2);
}

export function formatNzMoney(cents) {
  return new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency: "NZD",
    minimumFractionDigits: 2
  }).format(Number(cents) / 100);
}

export function formatDisplayDate(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso || ""))) {
    return "";
  }

  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return new Intl.DateTimeFormat("en-NZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  }).format(date);
}

export function calculateInstalments({
  amountCents,
  upfrontCents,
  frequency,
  termMonths
}) {
  const count = INSTALMENT_COUNTS[termMonths]?.[frequency];

  if (!count) {
    return { ok: false, reason: "combination" };
  }

  const financedCents = amountCents - upfrontCents;

  if (financedCents <= 0) {
    return { ok: false, reason: "financed" };
  }

  const regularCents = Math.floor(financedCents / count);

  if (regularCents <= 0) {
    return { ok: false, reason: "instalment" };
  }

  const remainderCents = financedCents - regularCents * count;

  return {
    ok: true,
    count,
    financedCents,
    regularCents,
    remainderCents,
    finalCents: regularCents + remainderCents
  };
}

export function summarisePlan({
  courseName = "",
  amount,
  upfront = "",
  frequency,
  termMonths,
  firstPaymentDate
}) {
  const parsedAmount = moneyToCents(amount);
  const parsedUpfront = String(upfront ?? "").trim()
    ? moneyToCents(upfront)
    : { ok: true, cents: 0 };

  if (!parsedAmount.ok || !parsedUpfront.ok) {
    return null;
  }

  const calculation = calculateInstalments({
    amountCents: parsedAmount.cents,
    upfrontCents: parsedUpfront.cents,
    frequency,
    termMonths: Number(termMonths)
  });

  if (!calculation.ok) {
    return null;
  }

  const adverb = FREQUENCY_ADVERB[frequency] || String(frequency || "").toLowerCase();

  return {
    courseName: courseName.trim(),
    planAmount: formatNzMoney(parsedAmount.cents),
    upfrontPayment: formatNzMoney(parsedUpfront.cents),
    amountFinanced: formatNzMoney(calculation.financedCents),
    paymentsLabel: `${calculation.count} ${adverb} payment${calculation.count === 1 ? "" : "s"}`,
    instalmentAmount: formatNzMoney(calculation.regularCents),
    finalInstalmentAmount: formatNzMoney(calculation.finalCents),
    finalDiffers: calculation.remainderCents > 0,
    firstPayment: formatDisplayDate(firstPaymentDate),
    instalmentCents: centsToMoney(calculation.regularCents),
    count: calculation.count
  };
}
