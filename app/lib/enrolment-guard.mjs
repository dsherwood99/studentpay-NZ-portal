/**
 * Sandbox shows New Enrolment when the API is a sandbox host and the flag
 * is not explicitly off. Production requires the master flag, the production
 * API host, and either all valid providers or the Clerk canary allowlist.
 * Unset mode stays on the allowlist. An empty allowlist admits nobody.
 * JotForm is untouched.
 */
export function portalEnrolmentAllowed({
  studentPayEnv = "",
  apiBaseUrl = "",
  flag = "",
  userId = "",
  canaryUserIds = "",
  mode = ""
} = {}) {
  const env = String(studentPayEnv || "").trim().toLowerCase();
  const rawFlag = String(flag || "").trim().toLowerCase();
  const flagOff = ["false", "0", "no", "off"].includes(rawFlag);
  const flagOn = ["true", "1", "yes", "on"].includes(rawFlag);
  const api = String(apiBaseUrl || "").trim().toLowerCase();
  const productionApi = api.includes("api.studentpay.co.nz");
  const sandboxApi = api.includes("sandbox");

  if (env === "sandbox") {
    if (flagOff) {
      return { enabled: false, reason: "flag" };
    }

    if (!sandboxApi || productionApi) {
      return { enabled: false, reason: "api" };
    }

    return { enabled: true, reason: "sandbox" };
  }

  if (env === "production") {
    if (!flagOn) {
      return { enabled: false, reason: "flag" };
    }

    if (!productionApi || sandboxApi) {
      return { enabled: false, reason: "api" };
    }

    const rollout = String(mode || "").trim().toLowerCase();

    if (rollout === "all_providers") {
      return { enabled: true, reason: "all_providers" };
    }

    const allowed = new Set(
      String(canaryUserIds || "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
    );
    const currentUserId = String(userId || "").trim();

    if (!currentUserId || !allowed.has(currentUserId)) {
      return { enabled: false, reason: "canary" };
    }

    return { enabled: true, reason: "canary" };
  }

  return { enabled: false, reason: "environment" };
}

function addressForApi(address) {
  const source = address && typeof address === "object" ? address : {};

  return {
    street_address: source.street_address,
    suburb: source.suburb,
    region: source.region,
    postcode: source.postcode,
    country: source.country
  };
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
      date_of_birth: student.date_of_birth,
      email: student.email,
      mobile: student.mobile,
      address: addressForApi(student.address)
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
            date_of_birth: payer.date_of_birth,
            email: payer.email,
            mobile: payer.mobile,
            address: addressForApi(payer.address)
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
