import {
  isValidNewsletterEmail,
  normalizeNewsletterEmail
} from "@/lib/contracts/newsletter";
import type { PublicMutationResponse } from "@/lib/contracts/public-mutation";

export const PARTNER_INQUIRY_SOURCE = "money-moicano-partner-inquiry";

export type PartnerInquiryPayload = {
  fullName: string;
  companyName: string;
  role: string;
  email: string;
  phone: string;
  companyProfile: string;
  partnershipIntent: string;
  source: typeof PARTNER_INQUIRY_SOURCE;
};

type PartnerInquiryParseResult =
  | {
      ok: true;
      data: PartnerInquiryPayload;
      honeypotTriggered: boolean;
    }
  | {
      ok: false;
      message: string;
    };

const MAX_SHORT_TEXT_LENGTH = 160;
const MAX_PHONE_LENGTH = 40;
const MAX_PROFILE_LENGTH = 220;
const MAX_INTENT_LENGTH = 600;

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

function emptyPayload(): PartnerInquiryPayload {
  return {
    fullName: "",
    companyName: "",
    role: "",
    email: "",
    phone: "",
    companyProfile: "",
    partnershipIntent: "",
    source: PARTNER_INQUIRY_SOURCE
  };
}

export type PartnerInquiryPublicResponse = PublicMutationResponse;

export function parsePartnerInquiry(input: unknown): PartnerInquiryParseResult {
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
  const companyName = normalizeShortText(record.companyName);
  const role = normalizeShortText(record.role);
  const email = normalizeNewsletterEmail(record.email);
  const phone = normalizeShortText(record.phone);
  const companyProfile = normalizeShortText(record.companyProfile);
  const partnershipIntent = normalizeLongText(record.partnershipIntent);

  const shortFieldError =
    validateRequiredText(fullName, {
      label: "Nome",
      minLength: 3,
      maxLength: MAX_SHORT_TEXT_LENGTH
    }) ??
    validateRequiredText(companyName, {
      label: "Empresa",
      minLength: 2,
      maxLength: MAX_SHORT_TEXT_LENGTH
    }) ??
    validateRequiredText(role, {
      label: "Cargo",
      minLength: 2,
      maxLength: MAX_SHORT_TEXT_LENGTH
    }) ??
    validateRequiredText(phone, {
      label: "Telefone / WhatsApp",
      minLength: 10,
      maxLength: MAX_PHONE_LENGTH
    });

  if (shortFieldError) {
    return {
      ok: false,
      message: shortFieldError
    };
  }

  if (!isValidNewsletterEmail(email)) {
    return {
      ok: false,
      message: "Informe um e-mail válido."
    };
  }

  if (companyProfile && companyProfile.length > MAX_PROFILE_LENGTH) {
    return {
      ok: false,
      message: "Site ou Instagram da empresa está grande demais."
    };
  }

  if (partnershipIntent.length > MAX_INTENT_LENGTH) {
    return {
      ok: false,
      message: "Mensagem opcional está grande demais."
    };
  }

  return {
    ok: true,
    honeypotTriggered: false,
    data: {
      fullName,
      companyName,
      role,
      email,
      phone,
      companyProfile,
      partnershipIntent,
      source: PARTNER_INQUIRY_SOURCE
    }
  };
}
