import {
  isValidNewsletterEmail,
  normalizeNewsletterEmail
} from "@/lib/contracts/newsletter";
import type { PublicMutationResponse } from "@/lib/contracts/public-mutation";

export const CONTACT_MESSAGE_SOURCE = "money-moicano-contact-page";
export const CONTACT_RECIPIENT_EMAIL = "contato@moneymoicanomma.com.br";

export type ContactMessagePayload = {
  recipientEmail: typeof CONTACT_RECIPIENT_EMAIL;
  fullName: string;
  email: string;
  subject: string;
  message: string;
  source: typeof CONTACT_MESSAGE_SOURCE;
};

type ContactMessageParseResult =
  | {
      ok: true;
      data: ContactMessagePayload;
      honeypotTriggered: boolean;
    }
  | {
      ok: false;
      message: string;
    };

const MAX_SHORT_TEXT_LENGTH = 160;
const MAX_MESSAGE_LENGTH = 2000;

function normalizeShortText(input: unknown) {
  return typeof input === "string" ? input.trim().replace(/\s+/g, " ") : "";
}

function normalizeLongText(input: unknown) {
  return typeof input === "string" ? input.trim().replace(/\r\n/g, "\n") : "";
}

function validateRequiredText(
  value: string,
  options: {
    label: string;
    minLength?: number;
    maxLength: number;
  }
) {
  if (!value) {
    return `${options.label} é obrigatório.`;
  }

  if (value.length < (options.minLength ?? 1)) {
    return `${options.label} precisa ter mais detalhes.`;
  }

  if (value.length > options.maxLength) {
    return `${options.label} está grande demais.`;
  }

  return null;
}

function emptyPayload(): ContactMessagePayload {
  return {
    recipientEmail: CONTACT_RECIPIENT_EMAIL,
    fullName: "",
    email: "",
    subject: "",
    message: "",
    source: CONTACT_MESSAGE_SOURCE
  };
}

export type ContactMessagePublicResponse = PublicMutationResponse;

export function parseContactMessage(input: unknown): ContactMessageParseResult {
  if (typeof input !== "object" || input === null) {
    return {
      ok: false,
      message: "Corpo da requisição inválido."
    };
  }

  const record = input as Record<string, unknown>;
  const website = normalizeShortText(record.website);

  if (website) {
    return {
      ok: true,
      honeypotTriggered: true,
      data: emptyPayload()
    };
  }

  const fullName = normalizeShortText(record.fullName);
  const email = normalizeNewsletterEmail(record.email);
  const subject = normalizeShortText(record.subject);
  const message = normalizeLongText(record.message);

  const textError =
    validateRequiredText(fullName, {
      label: "Nome",
      minLength: 3,
      maxLength: MAX_SHORT_TEXT_LENGTH
    }) ??
    validateRequiredText(subject, {
      label: "Assunto",
      minLength: 3,
      maxLength: MAX_SHORT_TEXT_LENGTH
    }) ??
    validateRequiredText(message, {
      label: "Mensagem",
      minLength: 10,
      maxLength: MAX_MESSAGE_LENGTH
    });

  if (textError) {
    return {
      ok: false,
      message: textError
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
      recipientEmail: CONTACT_RECIPIENT_EMAIL,
      fullName,
      email,
      subject,
      message,
      source: CONTACT_MESSAGE_SOURCE
    }
  };
}
