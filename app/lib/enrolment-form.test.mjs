import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  ageLabel,
  enrolmentRequestBody,
  normaliseNzMobile,
  validateEnrolmentDraft
} from "./enrolment-form.mjs";
import { enrolmentBodyForApi } from "./enrolment-guard.mjs";

const TODAY = "2026-09-28";

function form(overrides = {}) {
  return {
    firstName: "Aroha",
    lastName: "Ngata",
    dateOfBirth: "2001-04-12",
    email: "aroha.ngata@example.test",
    mobile: "0215550199",
    studentStreet: "12 Example Street",
    studentSuburb: "Wellington",
    studentRegion: "Wellington",
    studentPostcode: "6011",
    studentCountry: "New Zealand",
    courseName: "Certificate IV in Beauty",
    amount: "5400.00",
    upfront: "0.00",
    firstPaymentDate: "2026-10-15",
    frequency: "Monthly",
    termMonths: "12",
    studentIsPayer: true,
    payerFirstName: "",
    payerLastName: "",
    payerDateOfBirth: "",
    payerEmail: "",
    payerMobile: "",
    payerStreet: "",
    payerSuburb: "",
    payerRegion: "",
    payerPostcode: "",
    payerCountry: "New Zealand",
    verbalConsent: true,
    ...overrides
  };
}

test("a valid date of birth can show an age without storing one", () => {
  assert.equal(ageLabel("2001-04-12", TODAY), "25 years");
  assert.equal(ageLabel("2027-01-01", TODAY), "");
});

test("student date of birth cannot be in the future or missing an address", () => {
  assert.match(
    validateEnrolmentDraft(form({ dateOfBirth: "2027-01-01" }), TODAY)[0],
    /cannot be in the future/
  );
  assert.match(
    validateEnrolmentDraft(form({ dateOfBirth: "1899-12-31" }), TODAY)[0],
    /valid date of birth/
  );
  assert.match(
    validateEnrolmentDraft(form({ studentStreet: "" }), TODAY).join(" "),
    /street address is required/
  );
  assert.match(
    validateEnrolmentDraft(form({ studentPostcode: "601" }), TODAY).join(" "),
    /4-digit/
  );
});

test("common New Zealand mobile formats normalise and invalid numbers are rejected", () => {
  const accepted = [
    "0210001111",
    "021 000 1111",
    "+64 21 000 1111",
    "64210001111",
    "+64 021 000 1111"
  ];

  for (const value of accepted) {
    assert.deepEqual(normaliseNzMobile(value), {
      ok: true,
      value: "+64210001111",
      error: ""
    });
  }

  assert.equal(normaliseNzMobile("12345").ok, false);
  assert.equal(normaliseNzMobile("09 123 4567").ok, false);
  assert.equal(normaliseNzMobile("").ok, false);
  assert.match(
    validateEnrolmentDraft(form({ mobile: "12345" }), TODAY).join(" "),
    /021 123 4567 or \+64 21 123 4567/
  );
  assert.match(
    validateEnrolmentDraft(
      form({
        studentIsPayer: false,
        payerFirstName: "Mere",
        payerLastName: "Ngata",
        payerDateOfBirth: "1978-09-03",
        payerEmail: "mere.ngata@example.test",
        payerMobile: "12345",
        payerStreet: "4 Harbour View",
        payerSuburb: "Petone",
        payerRegion: "Wellington",
        payerPostcode: "5012"
      }),
      TODAY
    ).join(" "),
    /payer mobile/i
  );

  const forwarded = enrolmentRequestBody(
    form({ mobile: "+64 21 000 1111", payerMobile: "" }),
    {
      idempotencyKey: "11111111-1111-4111-8111-111111111111",
      needsAgentName: false
    }
  );
  assert.equal(forwarded.student.mobile, "+64210001111");
});

test("consent sits beside its text and desktop fields are compact", () => {
  const css = readFileSync(new URL("../preview/preview.css", import.meta.url), "utf8");
  const consent = css.match(
    /\.enrolment-form label\.enrolment-consent \{([^}]+)\}/
  )?.[1];
  const field = css.match(/\.enrolment-field \{([^}]+)\}/)?.[1];
  const mobile = css.match(
    /@media \(max-width: 900px\) \{([\s\S]*?)\n\}/
  )?.[1];

  assert.match(consent, /display:\s*flex/);
  assert.match(consent, /flex-direction:\s*row/);
  assert.match(field, /grid-template-columns:\s*132px/);
  assert.match(mobile, /\.enrolment-field \{[^}]*grid-template-columns:\s*1fr/);
  assert.match(mobile, /min-height:\s*44px/);
});

test("student as payer does not require or send duplicate payer fields", () => {
  assert.deepEqual(validateEnrolmentDraft(form(), TODAY), []);

  const forwarded = enrolmentBodyForApi(
    enrolmentRequestBody(form(), {
      idempotencyKey: "11111111-1111-4111-8111-111111111111",
      needsAgentName: false
    })
  );

  assert.deepEqual(forwarded.payer, { student_is_payer: true });
  assert.equal(forwarded.student.date_of_birth, "2001-04-12");
  assert.equal(forwarded.student.address.street_address, "12 Example Street");
  assert.equal(forwarded.student.address.country, "New Zealand");
});

test("an alternate payer requires date of birth and address", () => {
  const draft = form({
    studentIsPayer: false,
    payerFirstName: "Mere",
    payerLastName: "Ngata",
    payerEmail: "mere.ngata@example.test",
    payerMobile: "0215550100"
  });

  assert.match(validateEnrolmentDraft(draft, TODAY).join(" "), /payer date of birth/i);
  assert.match(validateEnrolmentDraft(draft, TODAY).join(" "), /Payer street address/);

  const complete = form({
    ...draft,
    payerDateOfBirth: "1978-09-03",
    payerStreet: "4 Harbour View",
    payerSuburb: "Petone",
    payerRegion: "Wellington",
    payerPostcode: "5012",
    payerCountry: "New Zealand"
  });

  assert.deepEqual(validateEnrolmentDraft(complete, TODAY), []);

  const forwarded = enrolmentBodyForApi(
    enrolmentRequestBody(complete, {
      idempotencyKey: "11111111-1111-4111-8111-111111111111",
      needsAgentName: false
    })
  );

  assert.equal(forwarded.payer.date_of_birth, "1978-09-03");
  assert.equal(forwarded.payer.address.street_address, "4 Harbour View");
  assert.equal(forwarded.payer.address.postcode, "5012");
  assert.equal(forwarded.student.address.street_address, "12 Example Street");
});
