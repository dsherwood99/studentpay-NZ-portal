import assert from "node:assert/strict";
import test from "node:test";

import { buildPortfolioCsv } from "./portfolio-export.js";
import {
  buildPortfolioSummary,
  isSummaryEligible,
  summaryEligiblePlans
} from "./portfolio-summary.js";

function plan(overrides) {
  return {
    plan: "PLN-1",
    student: "Aroha Ngata",
    course: "Beauty",
    stage: "Payment Plan Signed",
    status: "No Arrears",
    amount: 100,
    collected: 10,
    remaining: 90,
    overdue: 0,
    daysInArrears: 0,
    authorisationStatus: "Authorised",
    agreementDate: "2026-01-01",
    paymentAmount: 10,
    frequency: "Monthly",
    ...overrides
  };
}

test("payment plan sent and cancelled stay out of every summary metric", () => {
  const plans = [
    plan({ plan: "SIGNED", amount: 1000, collected: 100, remaining: 900, status: "No Arrears" }),
    plan({
      plan: "SENT",
      stage: "Payment Plan Sent",
      amount: 500,
      collected: 50,
      remaining: 450,
      status: "1 - 15 Days"
    }),
    plan({
      plan: "CANCELLED",
      stage: "Cancelled",
      amount: 250,
      collected: 25,
      remaining: 225,
      status: "90+ Days"
    }),
    plan({ plan: "ARREARS", status: "61 - 90 Days", amount: 40, collected: 4, remaining: 36 })
  ];

  const summary = buildPortfolioSummary(plans);

  assert.equal(summary.activePlans, 2);
  assert.equal(summary.totalAmount, 1040);
  assert.equal(summary.totalCollected, 104);
  assert.equal(summary.totalRemaining, 936);
  assert.equal(summary.currentPlans, 1);
  assert.equal(summary.arrears1To15, 0);
  assert.equal(summary.arrears16To30, 0);
  assert.equal(summary.arrears31To60, 0);
  assert.equal(summary.arrears61Plus, 1);
  assert.equal(isSummaryEligible(plans[1]), false);
  assert.equal(summaryEligiblePlans(plans).length, 2);
});

test("table export keeps sent and cancelled plans", () => {
  const plans = [
    plan({ plan: "PLN-SIGNED", stage: "Payment Plan Signed" }),
    plan({ plan: "PLN-SENT", stage: "Payment Plan Sent" }),
    plan({ plan: "PLN-CANCELLED", stage: "Cancelled" })
  ];

  const csv = buildPortfolioCsv(plans);

  assert.match(csv, /PLN-SIGNED/);
  assert.match(csv, /PLN-SENT/);
  assert.match(csv, /Payment Plan Sent/);
  assert.match(csv, /PLN-CANCELLED/);
  assert.match(csv, /Cancelled/);
  assert.equal(csv.split("\r\n").length, 4);
});

test("whitespace around an excluded stage still excludes the plan", () => {
  const summary = buildPortfolioSummary([
    plan({ stage: " Payment Plan Sent ", amount: 80, collected: 8, remaining: 72 })
  ]);

  assert.equal(summary.activePlans, 0);
  assert.equal(summary.totalAmount, 0);
});
