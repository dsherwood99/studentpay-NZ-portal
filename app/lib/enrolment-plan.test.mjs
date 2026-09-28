import assert from "node:assert/strict";
import test from "node:test";

import { portalEnrolmentAllowed, enrolmentBodyForApi } from "./enrolment-guard.mjs";
import { calculateInstalments, summarisePlan } from "./enrolment-plan.mjs";

const sandbox = {
  studentPayEnv: "sandbox",
  salesforceLoginUrl: "https://studentpaynz--api.sandbox.my.salesforce.com",
  apiBaseUrl: "https://studentpay-nz-api-sandbox.vercel.app",
  flag: "true"
};

test("18-month fortnightly stays at 36 instalments", () => {
  const result = calculateInstalments({
    amountCents: 540000,
    upfrontCents: 0,
    frequency: "Fortnightly",
    termMonths: 18
  });

  assert.equal(result.count, 36);
});

test("summary divides the financed amount and shows a remainder", () => {
  const summary = summarisePlan({
    courseName: "Certificate IV in Beauty",
    amount: "5400.01",
    upfront: "0",
    frequency: "Monthly",
    termMonths: 12,
    firstPaymentDate: "2026-10-15"
  });

  assert.equal(summary.paymentsLabel, "12 monthly payments");
  assert.equal(summary.instalmentAmount, "$450.00");
  assert.equal(summary.finalDiffers, true);
  assert.equal(summary.firstPayment, "15 October 2026");
  assert.equal(summary.amountFinanced, "$5,400.01");
});

test("enrolment stays off for production and for a non-sandbox API", () => {
  assert.equal(
    portalEnrolmentAllowed({ ...sandbox, studentPayEnv: "production" }).enabled,
    false
  );
  assert.equal(portalEnrolmentAllowed({ ...sandbox, studentPayEnv: "" }).enabled, false);
  assert.equal(
    portalEnrolmentAllowed({
      ...sandbox,
      apiBaseUrl: "https://api.studentpay.co.nz"
    }).enabled,
    false
  );
  assert.equal(
    portalEnrolmentAllowed({
      ...sandbox,
      apiBaseUrl: "https://studentpay-nz-api.vercel.app"
    }).enabled,
    false
  );
  assert.equal(portalEnrolmentAllowed({ ...sandbox, flag: "false" }).enabled, false);
  assert.equal(portalEnrolmentAllowed(sandbox).enabled, true);
});

test("a forged provider id is removed before the API call", () => {
  const body = enrolmentBodyForApi({
    idempotency_key: "11111111-1111-4111-8111-111111111111",
    education_provider: "Bela Beauty College",
    provider_id: "001FORGED",
    provider_name: "Someone else",
    checkout_id: "should-not-pass",
    course_name: "Beauty",
    student: {
      first_name: "Ada",
      last_name: "Student",
      email: "ada@example.com",
      mobile: "021000000"
    },
    plan: {
      amount: "100.00",
      upfront_payment: "0",
      first_payment_date: "2026-10-15",
      payment_frequency: "Monthly",
      term_months: 12
    },
    payer: { student_is_payer: true },
    verbal_consent: true
  });

  assert.equal(body.education_provider, undefined);
  assert.equal(body.provider_id, undefined);
  assert.equal(body.provider_name, undefined);
  assert.equal(body.checkout_id, undefined);
  assert.equal(body.course_name, "Beauty");
});
