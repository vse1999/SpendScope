interface SendTeamInvitationEmailParams {
  to: string;
  inviterName: string;
  companyName: string;
  role: "ADMIN" | "MEMBER";
  acceptUrl: string;
  expiresAt: Date;
}

interface ResendEmailRequestBody {
  from: string;
  to: string[];
  subject: string;
  html: string;
  text: string;
}

interface ResendEmailResponse {
  id?: string;
  error?: {
    message?: string;
  };
}

function assertInvitationEmailConfig(): {
  apiKey: string;
  fromEmail: string;
} {
  const apiKey = (process.env.RESEND_API_KEY ?? process.env.RESEND_TOKEN ?? "").trim();
  const fromEmail = (process.env.INVITATION_FROM_EMAIL ?? process.env.RESEND_FROM_EMAIL ?? "").trim();

  const missing: string[] = [];
  if (!apiKey) {
    missing.push("RESEND_API_KEY (or RESEND_TOKEN)");
  }
  if (!fromEmail) {
    missing.push("INVITATION_FROM_EMAIL (or RESEND_FROM_EMAIL)");
  }

  if (missing.length > 0) {
    throw new Error(`Invitation email config missing: ${missing.join(", ")}`);
  }

  if (!apiKey || !fromEmail) {
    throw new Error("Invitation email config is invalid");
  }

  const normalizedFrom = fromEmail.toLowerCase();
  if (apiKey.includes("XXXXXXXX") || apiKey.length < 20) {
    throw new Error("RESEND_API_KEY appears to be a placeholder or invalid value");
  }

  if (normalizedFrom.includes("yourdomain.com")) {
    throw new Error("INVITATION_FROM_EMAIL appears to be a placeholder");
  }

  return { apiKey, fromEmail };
}

function formatInvitationSubject(companyName: string): string {
  return `You're invited to join ${companyName} on SpendScope`;
}

function formatInvitationText(params: SendTeamInvitationEmailParams): string {
  return [
    `You were invited by ${params.inviterName} to join "${params.companyName}" on SpendScope as ${params.role}.`,
    "",
    `Accept invitation: ${params.acceptUrl}`,
    "",
    `This invitation expires on ${params.expiresAt.toUTCString()}.`,
  ].join("\n");
}

function formatInvitationHtml(params: SendTeamInvitationEmailParams): string {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #0f172a;">
      <h2 style="margin-bottom: 8px;">Team Invitation</h2>
      <p style="margin: 0 0 12px 0;">
        <strong>${params.inviterName}</strong> invited you to join
        <strong>${params.companyName}</strong> on SpendScope as <strong>${params.role}</strong>.
      </p>
      <p style="margin: 0 0 16px 0;">
        <a
          href="${params.acceptUrl}"
          style="display: inline-block; background: #0f172a; color: #ffffff; text-decoration: none; padding: 10px 16px; border-radius: 8px;"
        >
          Accept Invitation
        </a>
      </p>
      <p style="margin: 0; color: #475569; font-size: 14px;">
        This invitation expires on ${params.expiresAt.toUTCString()}.
      </p>
    </div>
  `;
}

export async function sendTeamInvitationEmail(
  params: SendTeamInvitationEmailParams
): Promise<void> {
  const { apiKey, fromEmail } = assertInvitationEmailConfig();

  const payload: ResendEmailRequestBody = {
    from: fromEmail,
    to: [params.to],
    subject: formatInvitationSubject(params.companyName),
    html: formatInvitationHtml(params),
    text: formatInvitationText(params),
  };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  const rawBody = await response.text();
  let body: ResendEmailResponse | null = null;
  try {
    body = JSON.parse(rawBody) as ResendEmailResponse;
  } catch {
    body = null;
  }

  if (!response.ok) {
    const parsedErrorMessage = body?.error?.message;
    const rawErrorMessage = rawBody.trim();
    const baseMessage =
      parsedErrorMessage ?? (rawErrorMessage || `Resend request failed with ${response.status}`);
    const hint =
      response.status === 403 && fromEmail.toLowerCase().includes("onboarding@resend.dev")
        ? " (Tip: resend.dev sender is testing-only; send to your own/verified recipient or verify a domain sender)"
        : "";
    const message = `${baseMessage}${hint}`;
    throw new Error(message);
  }

  if (!body?.id) {
    throw new Error("Resend did not return an email ID");
  }
}
