export const NEWSLETTER_SOURCE = "money-moicano-landing";
export const PRESS_NEWSLETTER_SOURCE = "money-moicano-imprensa";
export const NEWSLETTER_SOURCES = [NEWSLETTER_SOURCE, PRESS_NEWSLETTER_SOURCE] as const;

export type NewsletterSource = (typeof NEWSLETTER_SOURCES)[number];

export type NewsletterSubscriptionPayload = {
  email: string;
  name: string;
  source: NewsletterSource;
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
export const MAX_NEWSLETTER_NAME_LENGTH = 160;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeNewsletterEmail(input: unknown) {
  return typeof input === "string" ? input.trim().toLowerCase() : "";
}

export function normalizeNewsletterName(input: unknown) {
  return typeof input === "string" ? input.trim().replace(/\s+/g, " ") : "";
}

export function isValidNewsletterEmail(email: string) {
  return (
    email.length > 0 &&
    email.length <= MAX_NEWSLETTER_EMAIL_LENGTH &&
    EMAIL_PATTERN.test(email)
  );
}

export function isValidNewsletterName(name: string) {
  return name.length >= 2 && name.length <= MAX_NEWSLETTER_NAME_LENGTH;
}

function normalizeNewsletterSource(input: unknown): NewsletterSource {
  return input === PRESS_NEWSLETTER_SOURCE ? PRESS_NEWSLETTER_SOURCE : NEWSLETTER_SOURCE;
}

export function parseNewsletterSubscription(input: unknown): NewsletterParseResult {
  if (typeof input !== "object" || input === null) {
    return { ok: false, message: "Corpo da requisição inválido." };
  }

  const record = input as Record<string, unknown>;
  const email = normalizeNewsletterEmail(record.email);
  const name = normalizeNewsletterName(record.name);
  const source = normalizeNewsletterSource(record.source);
  const website = typeof record.website === "string" ? record.website.trim() : "";

  if (website) {
    return {
      ok: true,
      honeypotTriggered: true,
      data: {
        email: "",
        name: "",
        source
      }
    };
  }

  if (!isValidNewsletterEmail(email)) {
    return {
      ok: false,
      message: "Informe um e-mail válido."
    };
  }

  if (name && !isValidNewsletterName(name)) {
    return {
      ok: false,
      message: "Informe seu nome."
    };
  }

  if (source === PRESS_NEWSLETTER_SOURCE && !isValidNewsletterName(name)) {
    return {
      ok: false,
      message: "Informe seu nome."
    };
  }

  return {
    ok: true,
    honeypotTriggered: false,
    data: {
      email,
      name,
      source
    }
  };
}
