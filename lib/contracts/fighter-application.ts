import type { PublicMutationResponse } from "@/lib/contracts/public-mutation";

export const FIGHTER_APPLICATION_SOURCE = "money-moicano-lute-no-mmmma";
export const FIGHTER_SPECIALTIES = ["jiu-jitsu", "mma", "muay-thai"] as const;

export type FighterSpecialty = (typeof FIGHTER_SPECIALTIES)[number];

export type FighterApplicationPayload = {
  name: string;
  birthDate: string;
  city: string;
  team: string;
  tapology: string;
  instagram: string;
  specialty: FighterSpecialty;
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
const MAX_PROFILE_FIELD_LENGTH = 220;
const MAX_LONG_TEXT_LENGTH = 4000;
const specialtySet = new Set<string>(FIGHTER_SPECIALTIES);

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
    name: "",
    birthDate: "",
    city: "",
    team: "",
    tapology: "",
    instagram: "",
    specialty: "mma",
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

  const name = normalizeShortText(record.name);
  const birthDate = normalizeShortText(record.birthDate);
  const city = normalizeShortText(record.city);
  const team = normalizeShortText(record.team);
  const tapology = normalizeShortText(record.tapology);
  const instagram = normalizeShortText(record.instagram);
  const specialty = normalizeShortText(record.specialty).toLowerCase();
  const competitionHistory = normalizeLongText(record.competitionHistory);
  const martialArtsTitles = normalizeLongText(record.martialArtsTitles);
  const curiosities = normalizeLongText(record.curiosities);
  const roastConsent = record.roastConsent === true;

  const shortFieldError =
    validateRequiredText(name, {
      label: "Nome",
      minLength: 5,
      maxLength: MAX_SHORT_TEXT_LENGTH
    }) ??
    validateRequiredText(birthDate, {
      label: "Data de nascimento",
      maxLength: 10
    }) ??
    validateRequiredText(city, {
      label: "Cidade",
      minLength: 3,
      maxLength: MAX_SHORT_TEXT_LENGTH
    }) ??
    validateRequiredText(team, {
      label: "Equipe",
      minLength: 2,
      maxLength: MAX_SHORT_TEXT_LENGTH
    }) ??
    validateRequiredText(tapology, {
      label: "Tapology",
      minLength: 3,
      maxLength: MAX_PROFILE_FIELD_LENGTH
    }) ??
    validateRequiredText(instagram, {
      label: "Instagram",
      minLength: 3,
      maxLength: MAX_PROFILE_FIELD_LENGTH
    });

  if (shortFieldError) {
    return {
      ok: false,
      message: shortFieldError
    };
  }

  if (!isValidBirthDate(birthDate)) {
    return {
      ok: false,
      message: "Informe uma data de nascimento válida."
    };
  }

  if (!specialtySet.has(specialty)) {
    return {
      ok: false,
      message: "Selecione sua especialidade principal."
    };
  }

  const longFieldError =
    validateRequiredText(competitionHistory, {
      label: "Histórico de competição",
      minLength: 40,
      maxLength: MAX_LONG_TEXT_LENGTH
    }) ??
    validateRequiredText(martialArtsTitles, {
      label: "Principais títulos",
      minLength: 20,
      maxLength: MAX_LONG_TEXT_LENGTH
    }) ??
    validateRequiredText(curiosities, {
      label: "Curiosidades",
      minLength: 40,
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
      name,
      birthDate,
      city,
      team,
      tapology,
      instagram,
      specialty: specialty as FighterSpecialty,
      competitionHistory,
      martialArtsTitles,
      curiosities,
      roastConsent: true,
      source: FIGHTER_APPLICATION_SOURCE
    }
  };
}
