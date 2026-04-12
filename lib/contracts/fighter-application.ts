import {
  normalizeBrazilianState,
  type BrazilianStateName
} from "@/lib/contracts/brazilian-states";
import type { PublicMutationResponse } from "@/lib/contracts/public-mutation";

export const FIGHTER_APPLICATION_SOURCE = "money-moicano-lute-no-mmmma";
export const FIGHTER_SPECIALTIES = [
  "jiu-jitsu",
  "mma",
  "muay-thai",
  "boxe",
  "kickboxing",
  "judo",
  "sanda",
  "other"
] as const;
export const FIGHTER_WEIGHT_CLASSES = [
  "atomo-feminino",
  "palha-feminino",
  "mosca-feminino",
  "galo-feminino",
  "pena-feminino",
  "mosca",
  "galo",
  "pena",
  "leve",
  "meio-medio",
  "medio",
  "meio-pesado",
  "pesado"
] as const;

export type FighterSpecialty = (typeof FIGHTER_SPECIALTIES)[number];
export type FighterWeightClass = (typeof FIGHTER_WEIGHT_CLASSES)[number];

export type FighterApplicationPayload = {
  fullName: string;
  nickname: string;
  birthDate: string;
  city: string;
  state: BrazilianStateName | null;
  team: string;
  weightClass: FighterWeightClass | null;
  tapology: string;
  instagram: string;
  phoneWhatsapp: string;
  bookingContactName: string;
  bookingContactPhoneWhatsapp: string;
  specialty: FighterSpecialty;
  specialtyOther: string;
  competitionHistory: string;
  martialArtsTitles: string;
  curiosities: string;
  roastConsent: true;
  source: typeof FIGHTER_APPLICATION_SOURCE;
};

type FighterApplicationParseResult =
  | {
      ok: true;
      data: FighterApplicationPayload;
      honeypotTriggered: boolean;
    }
  | {
      ok: false;
      message: string;
    };

const MAX_SHORT_TEXT_LENGTH = 160;
const MAX_PHONE_LENGTH = 40;
const MAX_PROFILE_FIELD_LENGTH = 220;
const MAX_LONG_TEXT_LENGTH = 4000;
const MAX_SPECIALTY_OTHER_LENGTH = 120;
const specialtySet = new Set<string>(FIGHTER_SPECIALTIES);
const weightClassSet = new Set<string>(FIGHTER_WEIGHT_CLASSES);

function normalizeShortText(input: unknown) {
  return typeof input === "string" ? input.trim().replace(/\s+/g, " ") : "";
}

function normalizeLongText(input: unknown) {
  return typeof input === "string" ? input.trim().replace(/\r\n/g, "\n") : "";
}

function digitsOnly(value: string) {
  return value.replace(/\D+/g, "");
}

function validateTextLength(
  value: string,
  options: {
    label: string;
    maxLength: number;
  }
) {
  if (!value) {
    return null;
  }

  if (value.length > options.maxLength) {
    return `${options.label} está grande demais.`;
  }

  return null;
}

function isValidBirthDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsedDate = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(parsedDate.getTime())) {
    return false;
  }

  const [year, month, day] = value.split("-").map((item) => Number.parseInt(item, 10));

  if (
    parsedDate.getUTCFullYear() !== year ||
    parsedDate.getUTCMonth() + 1 !== month ||
    parsedDate.getUTCDate() !== day
  ) {
    return false;
  }

  const today = new Date();
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const candidateUtc = Date.UTC(year, month - 1, day);

  return year >= 1900 && candidateUtc <= todayUtc;
}

function emptyPayload(): FighterApplicationPayload {
  return {
    fullName: "",
    nickname: "",
    birthDate: "",
    city: "",
    state: null,
    team: "",
    weightClass: null,
    tapology: "",
    instagram: "",
    phoneWhatsapp: "",
    bookingContactName: "",
    bookingContactPhoneWhatsapp: "",
    specialty: "mma",
    specialtyOther: "",
    competitionHistory: "",
    martialArtsTitles: "",
    curiosities: "",
    roastConsent: true,
    source: FIGHTER_APPLICATION_SOURCE
  };
}

export type FighterApplicationPublicResponse = PublicMutationResponse;

export function parseFighterApplication(input: unknown): FighterApplicationParseResult {
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
  const nickname = normalizeShortText(record.nickname);
  const birthDate = normalizeShortText(record.birthDate);
  const city = normalizeShortText(record.city);
  const stateInput = normalizeShortText(record.state);
  const state = stateInput ? normalizeBrazilianState(stateInput) || null : null;
  const team = normalizeShortText(record.team);
  const weightClass = normalizeShortText(record.weightClass).toLowerCase();
  const tapology = normalizeShortText(record.tapology);
  const instagram = normalizeShortText(record.instagram);
  const phoneWhatsapp = normalizeShortText(record.phoneWhatsapp);
  const bookingContactName = normalizeShortText(record.bookingContactName);
  const bookingContactPhoneWhatsapp = normalizeShortText(record.bookingContactPhoneWhatsapp);
  const specialty = normalizeShortText(record.specialty).toLowerCase() || "mma";
  const specialtyOther = normalizeShortText(record.specialtyOther);
  const competitionHistory = normalizeLongText(record.competitionHistory);
  const martialArtsTitles = normalizeLongText(record.martialArtsTitles);
  const curiosities = normalizeLongText(record.curiosities);
  const roastConsent = record.roastConsent === true;

  const shortFieldError =
    validateTextLength(fullName, {
      label: "Nome completo",
      maxLength: MAX_SHORT_TEXT_LENGTH
    }) ??
    validateTextLength(nickname, {
      label: "Apelido",
      maxLength: MAX_SHORT_TEXT_LENGTH
    }) ??
    validateTextLength(birthDate, {
      label: "Data de nascimento",
      maxLength: 10
    }) ??
    validateTextLength(city, {
      label: "Cidade",
      maxLength: MAX_SHORT_TEXT_LENGTH
    }) ??
    validateTextLength(team, {
      label: "Equipe",
      maxLength: MAX_SHORT_TEXT_LENGTH
    }) ??
    validateTextLength(weightClass, {
      label: "Categoria",
      maxLength: MAX_SHORT_TEXT_LENGTH
    }) ??
    validateTextLength(tapology, {
      label: "Tapology",
      maxLength: MAX_PROFILE_FIELD_LENGTH
    }) ??
    validateTextLength(instagram, {
      label: "Instagram",
      maxLength: MAX_PROFILE_FIELD_LENGTH
    }) ??
    validateTextLength(phoneWhatsapp, {
      label: "Telefone / WhatsApp do atleta",
      maxLength: MAX_PHONE_LENGTH
    }) ??
    validateTextLength(bookingContactName, {
      label: "Nome do responsável pelo fechamento",
      maxLength: MAX_SHORT_TEXT_LENGTH
    }) ??
    validateTextLength(bookingContactPhoneWhatsapp, {
      label: "Telefone / WhatsApp do responsável",
      maxLength: MAX_PHONE_LENGTH
    });

  if (shortFieldError) {
    return {
      ok: false,
      message: shortFieldError
    };
  }

  if (stateInput && !state) {
    return {
      ok: false,
      message: "Selecione um estado válido."
    };
  }

  if (birthDate && !isValidBirthDate(birthDate)) {
    return {
      ok: false,
      message: "Informe uma data de nascimento válida."
    };
  }

  if (weightClass && !weightClassSet.has(weightClass)) {
    return {
      ok: false,
      message: "Selecione uma categoria válida."
    };
  }

  if (phoneWhatsapp && digitsOnly(phoneWhatsapp).length < 10) {
    return {
      ok: false,
      message: "Informe um telefone / WhatsApp válido para o atleta."
    };
  }

  if (bookingContactPhoneWhatsapp && digitsOnly(bookingContactPhoneWhatsapp).length < 10) {
    return {
      ok: false,
      message: "Informe um telefone / WhatsApp válido para o responsável."
    };
  }

  if (!specialtySet.has(specialty)) {
    return {
      ok: false,
      message: "Selecione sua especialidade principal."
    };
  }

  const specialtyOtherError = validateTextLength(specialtyOther, {
    label: "Outra especialidade",
    maxLength: MAX_SPECIALTY_OTHER_LENGTH
  });

  if (specialtyOtherError) {
    return {
      ok: false,
      message: specialtyOtherError
    };
  }

  const longFieldError =
    validateTextLength(competitionHistory, {
      label: "Histórico de competição",
      maxLength: MAX_LONG_TEXT_LENGTH
    }) ??
    validateTextLength(martialArtsTitles, {
      label: "Principais títulos",
      maxLength: MAX_LONG_TEXT_LENGTH
    }) ??
    validateTextLength(curiosities, {
      label: "Curiosidades",
      maxLength: MAX_LONG_TEXT_LENGTH
    });

  if (longFieldError) {
    return {
      ok: false,
      message: longFieldError
    };
  }

  if (!roastConsent) {
    return {
      ok: false,
      message: "Confirme o termo de ciência para finalizar a inscrição."
    };
  }

  return {
    ok: true,
    honeypotTriggered: false,
    data: {
      fullName,
      nickname,
      birthDate,
      city,
      state,
      team,
      weightClass: weightClass ? (weightClass as FighterWeightClass) : null,
      tapology,
      instagram,
      phoneWhatsapp,
      bookingContactName,
      bookingContactPhoneWhatsapp,
      specialty: specialty as FighterSpecialty,
      specialtyOther,
      competitionHistory,
      martialArtsTitles,
      curiosities,
      roastConsent: true,
      source: FIGHTER_APPLICATION_SOURCE
    }
  };
}
