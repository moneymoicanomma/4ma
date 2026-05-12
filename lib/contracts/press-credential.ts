import {
  isValidNewsletterEmail,
  normalizeNewsletterEmail,
} from "@/lib/contracts/newsletter";
import type { PublicMutationResponse } from "@/lib/contracts/public-mutation";

export const PRESS_CREDENTIAL_SOURCE = "money-moicano-press-credential";

export type PressCredentialPayload = {
  fullName: string;
  email: string;
  mediaOutlet: string;
  documentNumber: string;
  coverageType: string;
  coverageNeeds: string;
  source: typeof PRESS_CREDENTIAL_SOURCE;
};

type PressCredentialParseResult =
  | {
      ok: true;
      data: PressCredentialPayload;
      honeypotTriggered: boolean;
    }
  | {
      ok: false;
      message: string;
    };

const MAX_SHORT_TEXT_LENGTH = 180;
const MAX_MEDIUM_TEXT_LENGTH = 640;
const MAX_LONG_TEXT_LENGTH = 1600;

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
  },
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

function emptyPayload(): PressCredentialPayload {
  return {
    fullName: "",
    email: "",
    mediaOutlet: "",
    documentNumber: "",
    coverageType: "",
    coverageNeeds: "",
    source: PRESS_CREDENTIAL_SOURCE,
  };
}

export type PressCredentialPublicResponse = PublicMutationResponse;

export function parsePressCredentialSubmission(input: unknown): PressCredentialParseResult {
  if (typeof input !== "object" || input === null) {
    return {
      ok: false,
      message: "Corpo da requisição inválido.",
    };
  }

  const record = input as Record<string, unknown>;
  const website = normalizeShortText(record.website);

  if (website) {
    return {
      ok: true,
      honeypotTriggered: true,
      data: emptyPayload(),
    };
  }

  const fullName = normalizeShortText(record.fullName);
  const email = normalizeNewsletterEmail(record.email);
  const mediaOutlet = normalizeLongText(record.mediaOutlet);
  const documentNumber = normalizeShortText(record.documentNumber);
  const coverageType = normalizeShortText(record.coverageType);
  const coverageNeeds = normalizeLongText(record.coverageNeeds);

  const textError =
    validateRequiredText(fullName, {
      label: "Nome completo",
      minLength: 3,
      maxLength: MAX_SHORT_TEXT_LENGTH,
    }) ??
    validateRequiredText(mediaOutlet, {
      label: "Veículo de mídia e links",
      minLength: 3,
      maxLength: MAX_MEDIUM_TEXT_LENGTH,
    }) ??
    validateRequiredText(documentNumber, {
      label: "Número do documento",
      minLength: 3,
      maxLength: MAX_SHORT_TEXT_LENGTH,
    }) ??
    validateRequiredText(coverageType, {
      label: "Tipo de cobertura",
      minLength: 3,
      maxLength: MAX_SHORT_TEXT_LENGTH,
    }) ??
    validateRequiredText(coverageNeeds, {
      label: "Necessidades para cobertura",
      minLength: 10,
      maxLength: MAX_LONG_TEXT_LENGTH,
    });

  if (textError) {
    return {
      ok: false,
      message: textError,
    };
  }

  if (!isValidNewsletterEmail(email)) {
    return {
      ok: false,
      message: "Informe um e-mail válido.",
    };
  }

  return {
    ok: true,
    honeypotTriggered: false,
    data: {
      fullName,
      email,
      mediaOutlet,
      documentNumber,
      coverageType,
      coverageNeeds,
      source: PRESS_CREDENTIAL_SOURCE,
    },
  };
}
