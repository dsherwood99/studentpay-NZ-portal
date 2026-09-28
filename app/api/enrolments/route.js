import { currentUser } from "@clerk/nextjs/server";

import {
  enrolmentBodyForApi,
  portalEnrolmentAllowed
} from "../../lib/enrolment-guard.mjs";

function availability() {
  return portalEnrolmentAllowed({
    studentPayEnv: process.env.STUDENTPAY_ENV || "",
    apiBaseUrl: process.env.STUDENTPAY_API_BASE_URL || "",
    flag: process.env.PROVIDER_ENROLMENT_ENABLED || ""
  });
}

function agentFromUser(user) {
  const first = String(user?.firstName || "").trim();
  const last = String(user?.lastName || "").trim();
  const combined = [first, last].filter(Boolean).join(" ");
  return combined || String(user?.fullName || "").trim();
}

function sessionEmail(user) {
  return String(user?.primaryEmailAddress?.emailAddress || "")
    .trim()
    .toLowerCase();
}

async function authorisedProvider() {
  const user = await currentUser();

  if (!user) {
    return {
      ok: false,
      status: 401,
      error: "You must be signed in."
    };
  }

  const role = String(user.publicMetadata?.role || "").trim();
  const providerName = String(user.publicMetadata?.providerName || "").trim();

  if (role !== "provider" || !providerName) {
    return {
      ok: false,
      status: 403,
      error: "This account is not authorised to create an enrolment."
    };
  }

  const email = sessionEmail(user);

  if (!email) {
    return {
      ok: false,
      status: 403,
      error: "This account is not authorised to create an enrolment."
    };
  }

  return {
    ok: true,
    user,
    providerName,
    agentName: agentFromUser(user),
    email
  };
}

export async function GET() {
  const gate = availability();

  if (!gate.enabled) {
    return Response.json({ success: true, enabled: false });
  }

  const session = await authorisedProvider();

  if (!session.ok) {
    return Response.json(
      { success: false, enabled: false, error: session.error },
      { status: session.status }
    );
  }

  return Response.json({
    success: true,
    enabled: true,
    providerName: session.providerName,
    agentName: session.agentName,
    needsAgentName: !session.agentName
  });
}

export async function POST(request) {
  const gate = availability();

  if (!gate.enabled) {
    return Response.json(
      {
        success: false,
        error:
          "New enrolment is not available in this environment. Use your existing enrolment form."
      },
      { status: 403 }
    );
  }

  const session = await authorisedProvider();

  if (!session.ok) {
    return Response.json(
      { success: false, error: session.error },
      { status: session.status }
    );
  }

  let input;

  try {
    input = await request.json();
  } catch {
    return Response.json(
      { success: false, error: "The enrolment could not be read. Try again." },
      { status: 400 }
    );
  }

  const body = enrolmentBodyForApi(input);
  const sessionName = session.agentName;
  const fallbackName = String(body.agent_name || "").trim();
  const agentName = sessionName || fallbackName;

  if (!agentName) {
    return Response.json(
      {
        success: false,
        error: "Your name is not available on this account. Enter your name.",
        field: "agent_name"
      },
      { status: 400 }
    );
  }

  if (sessionName) {
    delete body.agent_name;
  }

  const apiBase = String(process.env.STUDENTPAY_API_BASE_URL || "").replace(/\/$/, "");
  const apiKey = String(process.env.PORTAL_ENROLMENT_API_KEY || "");

  if (!apiKey) {
    return Response.json(
      {
        success: false,
        error:
          "New enrolment is not available in this environment. Use your existing enrolment form."
      },
      { status: 503 }
    );
  }

  let upstream;

  try {
    upstream = await fetch(`${apiBase}/v1/provider/enrolments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-studentpay-portal-enrolment-key": apiKey,
        "x-studentpay-provider-name": session.providerName,
        "x-studentpay-agent-email": session.email,
        "x-studentpay-agent-name": agentName,
        "x-studentpay-agent-user-id": session.user.id
      },
      body: JSON.stringify(body),
      cache: "no-store"
    });
  } catch {
    return Response.json(
      {
        success: false,
        error:
          "The enrolment could not be created. Try again, or use your existing enrolment form."
      },
      { status: 502 }
    );
  }

  const payload = await upstream.json().catch(() => ({}));

  if (!upstream.ok || !payload.success) {
    const message =
      payload?.error?.message ||
      "The enrolment could not be created. Try again, or use your existing enrolment form.";

    return Response.json(
      {
        success: false,
        error: message,
        field: payload?.error?.field || null
      },
      { status: upstream.status || 502 }
    );
  }

  return Response.json(
    { success: true, enrolment: payload.enrolment },
    { status: upstream.status }
  );
}
