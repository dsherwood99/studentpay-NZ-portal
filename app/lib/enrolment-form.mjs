const EARLIEST_DOB = "1900-01-01";

export function localIsoDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function ageLabel(iso, todayIso = localIsoDate()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso || ""))) {
    return "";
  }

  if (iso > todayIso || iso < EARLIEST_DOB) {
    return "";
  }

  let age = Number(todayIso.slice(0, 4)) - Number(iso.slice(0, 4));

  if (todayIso.slice(5) < iso.slice(5)) {
    age -= 1;
  }

  if (age < 0 || age > 130) {
    return "";
  }

  return age === 1 ? "1 year" : `${age} years`;
}

function isRealIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function dateOfBirthError(value, label, todayIso) {
  const dob = String(value || "").trim();

  if (!isRealIsoDate(dob) || dob < EARLIEST_DOB) {
    return `Enter a valid ${label.toLowerCase()}.`;
  }

  if (dob > todayIso) {
    return `${label} cannot be in the future.`;
  }

  return "";
}

function addressErrors(form, prefix, label, todayIso) {
  void todayIso;
  const street = String(form[`${prefix}Street`] || "").trim();
  const suburb = String(form[`${prefix}Suburb`] || "").trim();
  const region = String(form[`${prefix}Region`] || "").trim();
  const postcode = String(form[`${prefix}Postcode`] || "").trim();
  const country = String(form[`${prefix}Country`] || "").trim();
  const errors = [];

  if (!street) {
    errors.push(`${label} street address is required.`);
  }

  if (!suburb) {
    errors.push(`${label} suburb or city is required.`);
  }

  if (!region) {
    errors.push(`${label} region is required.`);
  }

  if (!country) {
    errors.push(`${label} country is required.`);
  }

  if (country.toLowerCase() === "new zealand") {
    if (!/^\d{4}$/.test(postcode)) {
      errors.push(`Enter a 4-digit New Zealand postcode for the ${label.toLowerCase()}.`);
    }
  } else if (!postcode) {
    errors.push(`${label} postcode is required.`);
  }

  return errors;
}

export function validateEnrolmentDraft(form, todayIso = localIsoDate()) {
  const errors = [];
  const studentDob = dateOfBirthError(form.dateOfBirth, "Date of birth", todayIso);

  if (studentDob) {
    errors.push(studentDob);
  }

  errors.push(...addressErrors(form, "student", "Student", todayIso));

  if (!form.studentIsPayer) {
    const payerDob = dateOfBirthError(
      form.payerDateOfBirth,
      "Payer date of birth",
      todayIso
    );

    if (payerDob) {
      errors.push(payerDob);
    }

    errors.push(...addressErrors(form, "payer", "Payer", todayIso));
  }

  return errors;
}

function addressPayload(form, prefix) {
  return {
    street_address: form[`${prefix}Street`],
    suburb: form[`${prefix}Suburb`],
    region: form[`${prefix}Region`],
    postcode: form[`${prefix}Postcode`],
    country: form[`${prefix}Country`]
  };
}

/**
 * Student-is-payer sends no copied payer fields. The API inherits them.
 */
export function enrolmentRequestBody(form, { idempotencyKey, needsAgentName }) {
  const body = {
    idempotency_key: idempotencyKey,
    student: {
      first_name: form.firstName,
      last_name: form.lastName,
      date_of_birth: form.dateOfBirth,
      email: form.email,
      mobile: form.mobile,
      address: addressPayload(form, "student")
    },
    course_name: form.courseName,
    plan: {
      amount: String(form.amount || "").trim().replace(/[$,\s]/g, ""),
      upfront_payment: String(form.upfront || "0").trim().replace(/[$,\s]/g, "") || "0",
      first_payment_date: form.firstPaymentDate,
      payment_frequency: form.frequency,
      term_months: Number(form.termMonths)
    },
    payer: form.studentIsPayer
      ? { student_is_payer: true }
      : {
          student_is_payer: false,
          first_name: form.payerFirstName,
          last_name: form.payerLastName,
          date_of_birth: form.payerDateOfBirth,
          email: form.payerEmail,
          mobile: form.payerMobile,
          address: addressPayload(form, "payer")
        },
    verbal_consent: form.verbalConsent
  };

  if (needsAgentName) {
    body.agent_name = form.agentName;
  }

  return body;
}
