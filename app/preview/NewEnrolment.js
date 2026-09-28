"use client";

import { useMemo, useState } from "react";

import {
  ageLabel,
  enrolmentRequestBody,
  localIsoDate,
  validateEnrolmentDraft
} from "../lib/enrolment-form.mjs";
import {
  PAYMENT_FREQUENCIES,
  TERM_MONTHS,
  summarisePlan
} from "../lib/enrolment-plan.mjs";

const EMPTY = {
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  email: "",
  mobile: "",
  studentStreet: "",
  studentSuburb: "",
  studentRegion: "",
  studentPostcode: "",
  studentCountry: "New Zealand",
  courseName: "",
  amount: "",
  upfront: "",
  firstPaymentDate: "",
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
  agentName: "",
  verbalConsent: false
};

function plainMoney(value) {
  return String(value || "").trim().replace(/[$,\s]/g, "");
}

function AddressFields({ prefix, form, update }) {
  return (
    <>
      <label className="enrolment-span">
        Street address
        <input
          required
          autoComplete="street-address"
          value={form[`${prefix}Street`]}
          onChange={(event) => update(`${prefix}Street`, event.target.value)}
        />
      </label>
      <label>
        Suburb / city
        <input
          required
          autoComplete="address-level2"
          value={form[`${prefix}Suburb`]}
          onChange={(event) => update(`${prefix}Suburb`, event.target.value)}
        />
      </label>
      <label>
        Region
        <input
          required
          autoComplete="address-level1"
          value={form[`${prefix}Region`]}
          onChange={(event) => update(`${prefix}Region`, event.target.value)}
        />
      </label>
      <label>
        Postcode
        <input
          required
          inputMode="numeric"
          autoComplete="postal-code"
          value={form[`${prefix}Postcode`]}
          onChange={(event) => update(`${prefix}Postcode`, event.target.value)}
        />
      </label>
      <label>
        Country
        <input
          required
          autoComplete="country-name"
          value={form[`${prefix}Country`]}
          onChange={(event) => update(`${prefix}Country`, event.target.value)}
        />
      </label>
    </>
  );
}

export default function NewEnrolment({
  providerName,
  agentName,
  needsAgentName,
  onCancel,
  onCreated
}) {
  const [form, setForm] = useState(EMPTY);
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const today = localIsoDate();

  const summary = useMemo(
    () =>
      summarisePlan({
        courseName: form.courseName,
        amount: plainMoney(form.amount),
        upfront: plainMoney(form.upfront),
        frequency: form.frequency,
        termMonths: Number(form.termMonths),
        firstPaymentDate: form.firstPaymentDate
      }),
    [form]
  );

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();

    if (submitting || result) {
      return;
    }

    const problems = validateEnrolmentDraft(form, today);

    if (problems.length > 0) {
      setError(problems[0]);
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/enrolments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          enrolmentRequestBody(form, { idempotencyKey, needsAgentName })
        )
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload.success) {
        setError(payload.error || "The enrolment could not be created.");
        return;
      }

      setResult(payload.enrolment);
      onCreated?.(payload.enrolment);
    } catch {
      setError(
        "The enrolment could not be created. Try again, or use your existing enrolment form."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <section className="enrolment-success preview-panel">
        <span className="preview-eyebrow">New enrolment</span>
        <h2>Enrolment created</h2>
        <p>{result.message}</p>
        <dl className="enrolment-success-list">
          <div>
            <dt>Student</dt>
            <dd>{result.student_name}</dd>
          </div>
          <div>
            <dt>Course</dt>
            <dd>{result.course_name}</dd>
          </div>
          <div>
            <dt>Plan amount</dt>
            <dd>
              {new Intl.NumberFormat("en-NZ", {
                style: "currency",
                currency: "NZD"
              }).format(Number(result.plan_amount || 0))}
            </dd>
          </div>
          <div>
            <dt>Plan number</dt>
            <dd>{result.plan_number || "Being assigned"}</dd>
          </div>
        </dl>
        <div className="enrolment-actions">
          {result.plan_number ? (
            <button type="button" className="primary-button" onClick={onCancel}>
              View payment plan
            </button>
          ) : null}
          <button
            type="button"
            className="secondary-button"
            onClick={() => onCreated?.(result, { another: true })}
          >
            Create another enrolment
          </button>
          <button type="button" className="secondary-button" onClick={onCancel}>
            Back to payment plans
          </button>
        </div>
      </section>
    );
  }

  const studentAge = ageLabel(form.dateOfBirth, today);
  const payerAge = ageLabel(form.payerDateOfBirth, today);

  return (
    <section className="preview-panel enrolment-panel">
      <div className="preview-panel-header">
        <div>
          <span className="preview-eyebrow">New enrolment</span>
          <h2>Create enrolment</h2>
          <p>
            Complete this while you are on the phone. {providerName} is already
            selected from your account.
          </p>
        </div>
        <button type="button" className="secondary-button" onClick={onCancel}>
          Back to payment plans
        </button>
      </div>

      <form className="enrolment-form" onSubmit={submit}>
        <fieldset className="enrolment-section">
          <legend>Student details</legend>
          <div className="enrolment-grid">
            <label>
              First name
              <input
                required
                autoComplete="given-name"
                value={form.firstName}
                onChange={(event) => update("firstName", event.target.value)}
              />
            </label>
            <label>
              Last name
              <input
                required
                autoComplete="family-name"
                value={form.lastName}
                onChange={(event) => update("lastName", event.target.value)}
              />
            </label>
            <label>
              Date of birth
              <input
                required
                type="date"
                min="1900-01-01"
                max={today}
                value={form.dateOfBirth}
                onChange={(event) => update("dateOfBirth", event.target.value)}
              />
              {studentAge ? <span className="enrolment-age">{studentAge}</span> : null}
            </label>
            <label>
              Mobile
              <input
                required
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="021…"
                value={form.mobile}
                onChange={(event) => update("mobile", event.target.value)}
              />
            </label>
            <label className="enrolment-span">
              Email
              <input
                required
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(event) => update("email", event.target.value)}
              />
            </label>
          </div>
        </fieldset>

        <fieldset className="enrolment-section">
          <legend>Student address</legend>
          <div className="enrolment-grid">
            <AddressFields prefix="student" form={form} update={update} />
          </div>
        </fieldset>

        <fieldset className="enrolment-section">
          <legend>Course</legend>
          <label>
            Course
            <input
              required
              value={form.courseName}
              onChange={(event) => update("courseName", event.target.value)}
            />
          </label>
        </fieldset>

        <fieldset className="enrolment-section">
          <legend>Payment plan</legend>
          <div className="enrolment-grid">
            <label>
              Plan amount
              <input
                required
                inputMode="decimal"
                value={form.amount}
                onChange={(event) => update("amount", event.target.value)}
              />
            </label>
            <label>
              Upfront payment
              <input
                inputMode="decimal"
                placeholder="0.00"
                value={form.upfront}
                onChange={(event) => update("upfront", event.target.value)}
              />
            </label>
            <label>
              First payment date
              <input
                required
                type="date"
                value={form.firstPaymentDate}
                onChange={(event) =>
                  update("firstPaymentDate", event.target.value)
                }
              />
            </label>
            <label>
              Payment frequency
              <select
                value={form.frequency}
                onChange={(event) => update("frequency", event.target.value)}
              >
                {PAYMENT_FREQUENCIES.map((frequency) => (
                  <option key={frequency} value={frequency}>
                    {frequency}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Term
              <select
                value={form.termMonths}
                onChange={(event) => update("termMonths", event.target.value)}
              >
                {TERM_MONTHS.map((months) => (
                  <option key={months} value={months}>
                    {months} months
                  </option>
                ))}
              </select>
            </label>
          </div>
        </fieldset>

        <fieldset className="enrolment-section">
          <legend>Payer</legend>
          <div className="enrolment-choice">
            <label>
              <input
                type="radio"
                name="payer"
                checked={form.studentIsPayer}
                onChange={() => update("studentIsPayer", true)}
              />
              Student is the payer
            </label>
            <label>
              <input
                type="radio"
                name="payer"
                checked={!form.studentIsPayer}
                onChange={() => update("studentIsPayer", false)}
              />
              Someone else will make the payments
            </label>
          </div>
          {form.studentIsPayer ? (
            <p className="enrolment-note">
              The payer will use the student name, date of birth, email, mobile,
              and residential address.
            </p>
          ) : (
            <>
              <h3 className="enrolment-subhead">Payer details</h3>
              <div className="enrolment-grid">
                <label>
                  First name
                  <input
                    required
                    value={form.payerFirstName}
                    onChange={(event) =>
                      update("payerFirstName", event.target.value)
                    }
                  />
                </label>
                <label>
                  Last name
                  <input
                    required
                    value={form.payerLastName}
                    onChange={(event) =>
                      update("payerLastName", event.target.value)
                    }
                  />
                </label>
                <label>
                  Date of birth
                  <input
                    required
                    type="date"
                    min="1900-01-01"
                    max={today}
                    value={form.payerDateOfBirth}
                    onChange={(event) =>
                      update("payerDateOfBirth", event.target.value)
                    }
                  />
                  {payerAge ? <span className="enrolment-age">{payerAge}</span> : null}
                </label>
                <label>
                  Mobile
                  <input
                    required
                    type="tel"
                    value={form.payerMobile}
                    onChange={(event) =>
                      update("payerMobile", event.target.value)
                    }
                  />
                </label>
                <label className="enrolment-span">
                  Email
                  <input
                    required
                    type="email"
                    value={form.payerEmail}
                    onChange={(event) => update("payerEmail", event.target.value)}
                  />
                </label>
              </div>
              <h3 className="enrolment-subhead">Payer address</h3>
              <div className="enrolment-grid">
                <AddressFields prefix="payer" form={form} update={update} />
              </div>
            </>
          )}
        </fieldset>

        <section className="enrolment-summary" aria-live="polite">
          <h3>Payment plan summary</h3>
          {summary ? (
            <dl>
              <div>
                <dt>Course</dt>
                <dd>{summary.courseName || "—"}</dd>
              </div>
              <div>
                <dt>Plan amount</dt>
                <dd>{summary.planAmount}</dd>
              </div>
              <div>
                <dt>Upfront payment</dt>
                <dd>{summary.upfrontPayment}</dd>
              </div>
              <div>
                <dt>Amount financed</dt>
                <dd>{summary.amountFinanced}</dd>
              </div>
              <div>
                <dt>Payments</dt>
                <dd>{summary.paymentsLabel}</dd>
              </div>
              <div>
                <dt>Instalment amount</dt>
                <dd>{summary.instalmentAmount}</dd>
              </div>
              {summary.finalDiffers ? (
                <div>
                  <dt>Final instalment</dt>
                  <dd>{summary.finalInstalmentAmount}</dd>
                </div>
              ) : null}
              <div>
                <dt>First payment</dt>
                <dd>{summary.firstPayment || "—"}</dd>
              </div>
            </dl>
          ) : (
            <p>Enter the plan amount, term, and frequency to see the payments.</p>
          )}
        </section>

        <fieldset className="enrolment-section">
          <legend>Verbal consent</legend>
          {needsAgentName ? (
            <label>
              Your name
              <input
                required
                value={form.agentName}
                onChange={(event) => update("agentName", event.target.value)}
              />
            </label>
          ) : (
            <p className="enrolment-note">
              {`This enrolment will be recorded for ${agentName}${providerName ? ` at ${providerName}` : ""}.`}
            </p>
          )}
          <label className="enrolment-consent">
            <input
              type="checkbox"
              checked={form.verbalConsent}
              onChange={(event) =>
                update("verbalConsent", event.target.checked)
              }
            />
            <span>
              The payer has agreed, on this call, to receive the payment plan
              email and the direct debit request. This is not the signed
              payment plan agreement.
            </span>
          </label>
        </fieldset>

        {error ? (
          <p className="enrolment-error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="enrolment-actions">
          <button
            type="submit"
            className="primary-button"
            disabled={submitting || !form.verbalConsent}
          >
            {submitting ? "Creating enrolment…" : "Create enrolment"}
          </button>
        </div>
      </form>
    </section>
  );
}
