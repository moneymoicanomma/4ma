export const NEWSLETTER_SOURCE = "money-moicano-landing";

export type NewsletterSubscriptionPayload = {
  email: string;
  source: typeof NEWSLETTER_SOURCE;
};

export type PublicMutationResponse = {
  ok: boolean;
  message: string;
};

type NewsletterParseResult =
  | {
      ok: true;
      data: NewsletterSubscriptionPayload;
      honeypotTriggered: boolean;
    }
  | {
      ok: false;
      message: string;
    };

export const MAX_NEWSLETTER_EMAIL_LENGTH = 160;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeNewsletterEmail(input: unknown) {
  return typeof input === "string" ? input.trim().toLowerCase() : "";
}

export function isValidNewsletterEmail(email: string) {
  return (
    email.length > 0 &&
    email.length <= MAX_NEWSLETTER_EMAIL_LENGTH &&
    EMAIL_PATTERN.test(email)
  );
}

export function parseNewsletterSubscription(input: unknown): NewsletterParseResult {
  if (typeof input !== "object" || input === null) {
    return { ok: false, message: "Corpo da requisição inválido." };
  }

  const record = input as Record<string, unknown>;
  const email = normalizeNewsletterEmail(record.email);
  const website = typeof record.website === "string" ? record.website.trim() : "";

  if (website) {
    return {
      ok: true,
      honeypotTriggered: true,
      data: {
        email: "",
        source: NEWSLETTER_SOURCE
      }
    };
  }

  if (!isValidNewsletterEmail(email)) {
    return {
      ok: false,
      message: "Informe um e-mail válido."
    };
  }

  return {
    ok: true,
    honeypotTriggered: false,
    data: {
      email,
      source: NEWSLETTER_SOURCE
    }
  };
}
