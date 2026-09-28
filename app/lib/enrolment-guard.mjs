/**
 * Portal New Enrolment stays off unless this deployment is sandbox.
 * Hiding the button is the rollback. JotForm is untouched.
 */
export function portalEnrolmentAllowed({
  studentPayEnv = "",
  apiBaseUrl = "",
  flag = ""
} = {}) {
  const env = String(studentPayEnv || "").trim().toLowerCase();

  if (env !== "sandbox") {
    return { enabled: false, reason: "environment" };
  }

  const rawFlag = String(flag || "").trim().toLowerCase();

  if (["false", "0", "no", "off"].includes(rawFlag)) {
    return { enabled: false, reason: "flag" };
  }

  const api = String(apiBaseUrl || "").trim().toLowerCase();

  if (!api.includes("sandbox")) {
    return { enabled: false, reason: "api" };
  }

  return { enabled: true, reason: "sandbox" };
}

const FORWARDED_KEYS = [
  "idempotency_key",
  "course_name",
  "verbal_consent",
  "agent_name"
];

/**
 * The browser cannot choose the provider. Drop any identity fields
 * before the portal server adds the session provider.
 */
export function enrolmentBodyForApi(input) {
  const source = input && typeof input === "object" ? input : {};
  const student = source.student && typeof source.student === "object" ? source.student : {};
  const plan = source.plan && typeof source.plan === "object" ? source.plan : {};
  const payer = source.payer && typeof source.payer === "object" ? source.payer : {};
  const body = {
    idempotency_key: source.idempotency_key,
    student: {
      first_name: student.first_name,
      last_name: student.last_name,
      email: student.email,
      mobile: student.mobile
    },
    course_name: source.course_name,
    plan: {
      amount: plan.amount,
      upfront_payment: plan.upfront_payment,
      first_payment_date: plan.first_payment_date,
      payment_frequency: plan.payment_frequency,
      term_months: plan.term_months
    },
    payer:
      payer.student_is_payer === false
        ? {
            student_is_payer: false,
            first_name: payer.first_name,
            last_name: payer.last_name,
            email: payer.email,
            mobile: payer.mobile
          }
        : { student_is_payer: payer.student_is_payer },
    verbal_consent: source.verbal_consent === true
  };

  if (typeof source.agent_name === "string" && source.agent_name.trim()) {
    body.agent_name = source.agent_name.trim();
  }

  for (const key of Object.keys(body)) {
    if (!FORWARDED_KEYS.includes(key) && !["student", "plan", "payer"].includes(key)) {
      delete body[key];
    }
  }

  return body;
}
