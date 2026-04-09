import type { PublicMutationResponse } from "@/lib/contracts/public-mutation";
import {
  isValidEventFighterEmail,
  normalizeEventFighterEmail
} from "@/lib/event-fighter/shared";

export const EVENT_FIGHTER_INTAKE_SOURCE = "money-moicano-atletas-da-edicao";
export const PIX_KEY_TYPES = ["cpf", "email", "phone", "random"] as const;
export const HEALTH_INSURANCE_OPTIONS = ["yes", "no"] as const;
export const EVENT_FIGHTER_PHOTO_FIELDS = [
  {
    fieldName: "fullBodyPhoto",
    label: "Foto de corpo inteiro"
  },
  {
    fieldName: "facePhoto",
    label: "Foto de rosto"
  },
  {
    fieldName: "frontPhoto",
    label: "Foto de frente"
  },
  {
    fieldName: "profilePhoto",
    label: "Foto de perfil"
  },
  {
    fieldName: "diagonalLeftPhoto",
    label: "Diagonal para a esquerda"
  },
  {
    fieldName: "diagonalRightPhoto",
    label: "Diagonal para a direita"
  }
] as const;

export type PixKeyType = (typeof PIX_KEY_TYPES)[number];
export type HealthInsuranceOption = (typeof HEALTH_INSURANCE_OPTIONS)[number];
export type EventFighterPhotoFieldName =
  (typeof EVENT_FIGHTER_PHOTO_FIELDS)[number]["fieldName"];

export type EventFighterIntakePayload = {
  fullName: string;
  nickname: string;
  cpf: string;
  birthDate: string;
  pixKeyType: PixKeyType;
  pixKey: string;
  hasHealthInsurance: boolean;
  healthInsuranceProvider: string;
  email: string;
  phoneWhatsapp: string;
  record: string;
  primarySpecialty: string;
  additionalSpecialties: string;
  competitionHistory: string;
  titlesWon: string;
  lifeStory: string;
  funnyStory: string;
  curiosities: string;
  hobbies: string;
  source: typeof EVENT_FIGHTER_INTAKE_SOURCE;
  accessEmail: string;
};

export type EventFighterIntakePhoto = {
  fieldName: EventFighterPhotoFieldName;
  label: string;
  file: File;
};

export type EventFighterIntakeSubmission = {
  payload: EventFighterIntakePayload;
  photos: EventFighterIntakePhoto[];
};

type EventFighterIntakeParseResult =
  | {
      ok: true;
      honeypotTriggered: boolean;
      data: EventFighterIntakeSubmission | null;
    }
  | {
      ok: false;
      message: string;
    };

const MAX_SHORT_TEXT_LENGTH = 180;
const MAX_MEDIUM_TEXT_LENGTH = 320;
const MAX_LONG_TEXT_LENGTH = 5000;
const MAX_HOBBY_TEXT_LENGTH = 1200;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const pixKeyTypesSet = new Set<string>(PIX_KEY_TYPES);
const healthInsuranceOptionsSet = new Set<string>(HEALTH_INSURANCE_OPTIONS);
const acceptedImageMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif"
]);
const acceptedImageExtensions = [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"];

function normalizeShortText(input: FormDataEntryValue | null) {
  return typeof input === "string" ? input.trim().replace(/\s+/g, " ") : "";
}

function normalizeLongText(input: FormDataEntryValue | null) {
  return typeof input === "string" ? input.trim().replace(/\r\n/g, "\n") : "";
}

function digitsOnly(value: string) {
  return value.replace(/\D+/g, "");
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
    return `${options.label} precisa de mais detalhes.`;
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

function isValidCpf(value: string) {
  const normalized = digitsOnly(value);

  if (!/^\d{11}$/.test(normalized)) {
    return false;
  }

  if (/^(\d)\1{10}$/.test(normalized)) {
    return false;
  }

  const digits = normalized.split("").map(Number);

  const buildVerifier = (length: number) => {
    let sum = 0;

    for (let index = 0; index < length; index += 1) {
      sum += digits[index] * (length + 1 - index);
    }

    const remainder = (sum * 10) % 11;

    return remainder === 10 ? 0 : remainder;
  };

  return buildVerifier(9) === digits[9] && buildVerifier(10) === digits[10];
}

function normalizeCpf(value: string) {
  const normalized = digitsOnly(value);

  if (normalized.length !== 11) {
    return normalized;
  }

  return `${normalized.slice(0, 3)}.${normalized.slice(3, 6)}.${normalized.slice(6, 9)}-${normalized.slice(9)}`;
}

function isAcceptedImageFile(file: File) {
  if (acceptedImageMimeTypes.has(file.type.toLowerCase())) {
    return true;
  }

  const lowerCaseName = file.name.toLowerCase();

  return acceptedImageExtensions.some((extension) => lowerCaseName.endsWith(extension));
}

function getRequiredImage(formData: FormData, fieldName: EventFighterPhotoFieldName) {
  const entry = formData.get(fieldName);

  if (!(entry instanceof File) || entry.size <= 0) {
    return null;
  }

  return entry;
}

export type EventFighterIntakePublicResponse = PublicMutationResponse;

export function parseEventFighterIntakeFormData(
  formData: FormData,
  authenticatedEmail: string
): EventFighterIntakeParseResult {
  const website = normalizeShortText(formData.get("website"));

  if (website) {
    return {
      ok: true,
      honeypotTriggered: true,
      data: null
    };
  }

  const accessEmail = normalizeEventFighterEmail(authenticatedEmail);
  const fullName = normalizeShortText(formData.get("fullName"));
  const nickname = normalizeShortText(formData.get("nickname"));
  const cpf = normalizeShortText(formData.get("cpf"));
  const birthDate = normalizeShortText(formData.get("birthDate"));
  const pixKeyType = normalizeShortText(formData.get("pixKeyType")).toLowerCase();
  const pixKey = normalizeShortText(formData.get("pixKey"));
  const hasHealthInsurance = normalizeShortText(formData.get("hasHealthInsurance")).toLowerCase();
  const healthInsuranceProvider = normalizeShortText(formData.get("healthInsuranceProvider"));
  const email = normalizeEventFighterEmail(normalizeShortText(formData.get("email")));
  const phoneWhatsapp = normalizeShortText(formData.get("phoneWhatsapp"));
  const record = normalizeShortText(formData.get("record"));
  const primarySpecialty = normalizeShortText(formData.get("primarySpecialty"));
  const additionalSpecialties = normalizeLongText(formData.get("additionalSpecialties"));
  const competitionHistory = normalizeLongText(formData.get("competitionHistory"));
  const titlesWon = normalizeLongText(formData.get("titlesWon"));
  const lifeStory = normalizeLongText(formData.get("lifeStory"));
  const funnyStory = normalizeLongText(formData.get("funnyStory"));
  const curiosities = normalizeLongText(formData.get("curiosities"));
  const hobbies = normalizeLongText(formData.get("hobbies"));

  const shortFieldError =
    validateRequiredText(fullName, {
      label: "Nome completo",
      minLength: 5,
      maxLength: MAX_SHORT_TEXT_LENGTH
    }) ??
    validateRequiredText(nickname, {
      label: "Apelido",
      minLength: 2,
      maxLength: MAX_SHORT_TEXT_LENGTH
    }) ??
    validateRequiredText(cpf, {
      label: "CPF",
      maxLength: 18
    }) ??
    validateRequiredText(birthDate, {
      label: "Data de nascimento",
      maxLength: 10
    }) ??
    validateRequiredText(pixKey, {
      label: "Chave Pix",
      minLength: 3,
      maxLength: MAX_MEDIUM_TEXT_LENGTH
    }) ??
    validateRequiredText(email, {
      label: "Email",
      minLength: 6,
      maxLength: MAX_SHORT_TEXT_LENGTH
    }) ??
    validateRequiredText(phoneWhatsapp, {
      label: "Telefone / Whatsapp",
      minLength: 8,
      maxLength: MAX_SHORT_TEXT_LENGTH
    }) ??
    validateRequiredText(record, {
      label: "Cartel",
      minLength: 3,
      maxLength: MAX_MEDIUM_TEXT_LENGTH
    }) ??
    validateRequiredText(primarySpecialty, {
      label: "Especialidade principal",
      minLength: 2,
      maxLength: MAX_SHORT_TEXT_LENGTH
    });

  if (shortFieldError) {
    return {
      ok: false,
      message: shortFieldError
    };
  }

  if (!isValidCpf(cpf)) {
    return {
      ok: false,
      message: "Informe um CPF válido."
    };
  }

  if (!isValidBirthDate(birthDate)) {
    return {
      ok: false,
      message: "Informe uma data de nascimento válida."
    };
  }

  if (!pixKeyTypesSet.has(pixKeyType)) {
    return {
      ok: false,
      message: "Selecione o tipo da sua chave Pix."
    };
  }

  if (!healthInsuranceOptionsSet.has(hasHealthInsurance)) {
    return {
      ok: false,
      message: "Informe se você possui plano de saúde."
    };
  }

  if (hasHealthInsurance === "yes") {
    const healthInsuranceError = validateRequiredText(healthInsuranceProvider, {
      label: "Plano de saúde",
      minLength: 2,
      maxLength: MAX_SHORT_TEXT_LENGTH
    });

    if (healthInsuranceError) {
      return {
        ok: false,
        message: healthInsuranceError
      };
    }
  }

  if (!isValidEventFighterEmail(email)) {
    return {
      ok: false,
      message: "Informe um email válido."
    };
  }

  if (email !== accessEmail) {
    return {
      ok: false,
      message: "Use no formulário o mesmo email utilizado para acessar a página."
    };
  }

  if (digitsOnly(phoneWhatsapp).length < 10) {
    return {
      ok: false,
      message: "Informe um telefone / Whatsapp válido."
    };
  }

  const longFieldError =
    validateRequiredText(additionalSpecialties, {
      label: "Outras especialidades",
      minLength: 2,
      maxLength: MAX_LONG_TEXT_LENGTH
    }) ??
    validateRequiredText(competitionHistory, {
      label: "Histórico de competição",
      minLength: 40,
      maxLength: MAX_LONG_TEXT_LENGTH
    }) ??
    validateRequiredText(titlesWon, {
      label: "Títulos conquistados",
      minLength: 20,
      maxLength: MAX_LONG_TEXT_LENGTH
    }) ??
    validateRequiredText(lifeStory, {
      label: "História de vida",
      minLength: 60,
      maxLength: MAX_LONG_TEXT_LENGTH
    }) ??
    validateRequiredText(funnyStory, {
      label: "História engraçada",
      minLength: 20,
      maxLength: MAX_LONG_TEXT_LENGTH
    }) ??
    validateRequiredText(curiosities, {
      label: "Curiosidades",
      minLength: 20,
      maxLength: MAX_LONG_TEXT_LENGTH
    }) ??
    validateRequiredText(hobbies, {
      label: "Hobbies",
      minLength: 2,
      maxLength: MAX_HOBBY_TEXT_LENGTH
    });

  if (longFieldError) {
    return {
      ok: false,
      message: longFieldError
    };
  }

  const photos: EventFighterIntakePhoto[] = [];

  for (const photoField of EVENT_FIGHTER_PHOTO_FIELDS) {
    const file = getRequiredImage(formData, photoField.fieldName);

    if (!file) {
      return {
        ok: false,
        message: `${photoField.label} é obrigatória.`
      };
    }

    if (!isAcceptedImageFile(file)) {
      return {
        ok: false,
        message: `${photoField.label} precisa estar em JPG, PNG, WEBP ou HEIC.`
      };
    }

    if (file.size > MAX_IMAGE_BYTES) {
      return {
        ok: false,
        message: `${photoField.label} passou do limite de 10 MB.`
      };
    }

    photos.push({
      fieldName: photoField.fieldName,
      label: photoField.label,
      file
    });
  }

  return {
    ok: true,
    honeypotTriggered: false,
    data: {
      payload: {
        fullName,
        nickname,
        cpf: normalizeCpf(cpf),
        birthDate,
        pixKeyType: pixKeyType as PixKeyType,
        pixKey,
        hasHealthInsurance: hasHealthInsurance === "yes",
        healthInsuranceProvider: hasHealthInsurance === "yes" ? healthInsuranceProvider : "",
        email,
        phoneWhatsapp,
        record,
        primarySpecialty,
        additionalSpecialties,
        competitionHistory,
        titlesWon,
        lifeStory,
        funnyStory,
        curiosities,
        hobbies,
        source: EVENT_FIGHTER_INTAKE_SOURCE,
        accessEmail
      },
      photos
    }
  };
}

export function buildEventFighterIntakeUpstreamFormData(
  submission: EventFighterIntakeSubmission
) {
  const formData = new FormData();
  const { payload, photos } = submission;

  formData.append("fullName", payload.fullName);
  formData.append("nickname", payload.nickname);
  formData.append("cpf", payload.cpf);
  formData.append("birthDate", payload.birthDate);
  formData.append("pixKeyType", payload.pixKeyType);
  formData.append("pixKey", payload.pixKey);
  formData.append("hasHealthInsurance", String(payload.hasHealthInsurance));
  formData.append("healthInsuranceProvider", payload.healthInsuranceProvider);
  formData.append("email", payload.email);
  formData.append("phoneWhatsapp", payload.phoneWhatsapp);
  formData.append("record", payload.record);
  formData.append("primarySpecialty", payload.primarySpecialty);
  formData.append("additionalSpecialties", payload.additionalSpecialties);
  formData.append("competitionHistory", payload.competitionHistory);
  formData.append("titlesWon", payload.titlesWon);
  formData.append("lifeStory", payload.lifeStory);
  formData.append("funnyStory", payload.funnyStory);
  formData.append("curiosities", payload.curiosities);
  formData.append("hobbies", payload.hobbies);
  formData.append("source", payload.source);
  formData.append("accessEmail", payload.accessEmail);

  for (const photo of photos) {
    formData.append(photo.fieldName, photo.file, photo.file.name);
  }

  return formData;
}
