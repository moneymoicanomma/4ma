import type { PublicMutationResponse } from "@/lib/contracts/public-mutation";
import { normalizeBrazilianState, type BrazilianStateName } from "@/lib/contracts/brazilian-states";
import { FIGHTER_WEIGHT_CLASSES, type FighterWeightClass } from "@/lib/contracts/fighter-application";
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
    label: "Corpo inteiro",
    note: "De frente, da cabeça aos pés, com braços e pernas visíveis e sem corte."
  },
  {
    fieldName: "facePhoto",
    label: "Perfil direto",
    note: "Rosto centralizado, olhando para a câmera, do peito para cima e sem acessórios."
  },
  {
    fieldName: "frontPhoto",
    label: "Cintura para cima",
    note: "De frente, da cintura para cima, com ombros e tronco inteiros no enquadramento."
  },
  {
    fieldName: "profilePhoto",
    label: "Perfil esquerdo",
    note: "Virado para a esquerda, pegando rosto e tronco sem corte."
  },
  {
    fieldName: "diagonalLeftPhoto",
    label: "Quadril para cima",
    note: "Do quadril para cima, com boa luz e espaço para usar em arte e transmissão."
  },
  {
    fieldName: "diagonalRightPhoto",
    label: "Perfil direito",
    note: "Virado para a direita, pegando rosto e tronco sem corte."
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
  category: FighterWeightClass;
  height: string;
  reach: string;
  tapologyLink: string;
  instagramLink: string;
  city: string;
  state: BrazilianStateName;
  education: string;
  team: string;
  coachName: string;
  fightGraduations: string;
  coachContact: string;
  managerName: string;
  managerContact: string;
  cornerOne: string;
  cornerTwo: string;
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

export type EventFighterIntakeDraftPhoto = {
  fieldName: EventFighterPhotoFieldName;
  label: string;
  file: File;
};

export type EventFighterIntakeUploadedPhoto = {
  fieldName: EventFighterPhotoFieldName;
  fileName: string;
  bucket: string;
  objectKey: string;
  contentType: string;
  byteSize: number;
  sha256Hex: string;
  storageProvider: string;
};

export type EventFighterIntakeDraftSubmission = {
  payload: EventFighterIntakePayload;
  photos: EventFighterIntakeDraftPhoto[];
};

export type EventFighterIntakeSubmission = {
  payload: EventFighterIntakePayload;
  photos: EventFighterIntakeUploadedPhoto[];
};

export type EventFighterIntakeUploadRequestPhoto = {
  fieldName: EventFighterPhotoFieldName;
  fileName: string;
  contentType: string;
  byteSize: number;
};

export type EventFighterIntakeUploadTarget = EventFighterIntakeUploadRequestPhoto & {
  bucket: string;
  objectKey: string;
  storageProvider: string;
  uploadUrl: string;
};

export type EventFighterIntakeUploadInitResponse =
  | {
      ok: true;
      uploads: EventFighterIntakeUploadTarget[];
    }
  | {
      ok: false;
      message: string;
    };

type EventFighterIntakeParseResult<TSubmission> =
  | {
      ok: true;
      honeypotTriggered: boolean;
      data: TSubmission | null;
    }
  | {
      ok: false;
      message: string;
    };

type UploadRequestParseResult =
  | {
      ok: true;
      files: EventFighterIntakeUploadRequestPhoto[];
    }
  | {
      ok: false;
      message: string;
    };

type NormalizedEventFighterIntakeFields = {
  fullName: string;
  nickname: string;
  cpf: string;
  birthDate: string;
  pixKeyType: string;
  pixKey: string;
  hasHealthInsurance: string;
  healthInsuranceProvider: string;
  email: string;
  phoneWhatsapp: string;
  record: string;
  category: string;
  height: string;
  reach: string;
  tapologyLink: string;
  instagramLink: string;
  city: string;
  state: string;
  education: string;
  team: string;
  coachName: string;
  fightGraduations: string;
  coachContact: string;
  managerName: string;
  managerContact: string;
  cornerOne: string;
  cornerTwo: string;
  primarySpecialty: string;
  additionalSpecialties: string;
  competitionHistory: string;
  titlesWon: string;
  lifeStory: string;
  funnyStory: string;
  curiosities: string;
  hobbies: string;
  source: string;
  accessEmail: string;
};

const MAX_SHORT_TEXT_LENGTH = 180;
const MAX_MEDIUM_TEXT_LENGTH = 320;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_OBJECT_KEY_LENGTH = 1024;
const pixKeyTypesSet = new Set<string>(PIX_KEY_TYPES);
const healthInsuranceOptionsSet = new Set<string>(HEALTH_INSURANCE_OPTIONS);
const weightClassSet = new Set<string>(FIGHTER_WEIGHT_CLASSES);
const photoFieldNameSet = new Set<string>(
  EVENT_FIGHTER_PHOTO_FIELDS.map((photoField) => photoField.fieldName)
);
const photoFieldLabels = new Map(
  EVENT_FIGHTER_PHOTO_FIELDS.map((photoField) => [photoField.fieldName, photoField.label])
);
const acceptedImageMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif"
]);
const acceptedImageExtensions = [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"];
const sha256HexPattern = /^[a-f0-9]{64}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeShortText(input: unknown) {
  return typeof input === "string" ? input.trim().replace(/\s+/g, " ") : "";
}

function normalizeLongText(input: unknown) {
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
    maxLength?: number;
  }
) {
  if (!value) {
    return `${options.label} é obrigatório.`;
  }

  if (value.length < (options.minLength ?? 1)) {
    if ((options.minLength ?? 1) > 1) {
      return `${options.label} precisa ter pelo menos ${options.minLength} caracteres.`;
    }

    return `${options.label} precisa de mais detalhes.`;
  }

  if (options.maxLength && value.length > options.maxLength) {
    return `${options.label} está grande demais.`;
  }

  return null;
}

function validateOptionalText(
  value: string,
  options: {
    label: string;
    minLength?: number;
    maxLength?: number;
  }
) {
  if (!value) {
    return null;
  }

  return validateRequiredText(value, options);
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

function isAcceptedImageFileName(fileName: string) {
  const lowerCaseName = fileName.toLowerCase();

  return acceptedImageExtensions.some((extension) => lowerCaseName.endsWith(extension));
}

function isAcceptedImageContentType(contentType: string) {
  return acceptedImageMimeTypes.has(contentType.toLowerCase());
}

function isAcceptedImage({
  contentType,
  fileName
}: {
  contentType: string;
  fileName: string;
}) {
  return isAcceptedImageContentType(contentType) || isAcceptedImageFileName(fileName);
}

function isAcceptedImageFile(file: File) {
  return isAcceptedImage({
    contentType: file.type,
    fileName: file.name
  });
}

function getOptionalImage(formData: FormData, fieldName: EventFighterPhotoFieldName) {
  const entry = formData.get(fieldName);

  if (!(entry instanceof File) || entry.size <= 0) {
    return null;
  }

  return entry;
}

function getValidatedPayload(
  fields: NormalizedEventFighterIntakeFields
): { ok: true; payload: EventFighterIntakePayload } | { ok: false; message: string } {
  const shortFieldError =
    validateRequiredText(fields.fullName, {
      label: "Nome completo",
      minLength: 5,
      maxLength: MAX_SHORT_TEXT_LENGTH
    }) ??
    validateRequiredText(fields.nickname, {
      label: "Nome de luta",
      minLength: 2,
      maxLength: MAX_SHORT_TEXT_LENGTH
    }) ??
    validateRequiredText(fields.cpf, {
      label: "CPF",
      maxLength: 18
    }) ??
    validateRequiredText(fields.birthDate, {
      label: "Data de nascimento",
      maxLength: 10
    }) ??
    validateRequiredText(fields.pixKey, {
      label: "Chave Pix",
      minLength: 3
    }) ??
    validateRequiredText(fields.email, {
      label: "Email",
      minLength: 6,
      maxLength: 160
    }) ??
    validateRequiredText(fields.phoneWhatsapp, {
      label: "Contato do atleta",
      minLength: 8,
      maxLength: 40
    }) ??
    validateRequiredText(fields.record, {
      label: "Cartel",
      minLength: 3
    }) ??
    validateRequiredText(fields.category, {
      label: "Categoria",
      minLength: 2,
      maxLength: MAX_SHORT_TEXT_LENGTH
    }) ??
    validateRequiredText(fields.height, {
      label: "Altura",
      minLength: 2,
      maxLength: MAX_SHORT_TEXT_LENGTH
    }) ??
    validateRequiredText(fields.reach, {
      label: "Envergadura",
      minLength: 2,
      maxLength: MAX_SHORT_TEXT_LENGTH
    }) ??
    validateRequiredText(fields.tapologyLink, {
      label: "Link Tapology",
      minLength: 6,
      maxLength: MAX_MEDIUM_TEXT_LENGTH
    }) ??
    validateRequiredText(fields.instagramLink, {
      label: "Link Instagram",
      minLength: 6,
      maxLength: MAX_MEDIUM_TEXT_LENGTH
    }) ??
    validateRequiredText(fields.city, {
      label: "Cidade",
      minLength: 2,
      maxLength: MAX_SHORT_TEXT_LENGTH
    }) ??
    validateRequiredText(fields.state, {
      label: "Estado",
      minLength: 2,
      maxLength: 40
    }) ??
    validateRequiredText(fields.education, {
      label: "Escolaridade",
      minLength: 2,
      maxLength: MAX_SHORT_TEXT_LENGTH
    }) ??
    validateRequiredText(fields.team, {
      label: "Equipe",
      minLength: 2,
      maxLength: MAX_SHORT_TEXT_LENGTH
    }) ??
    validateRequiredText(fields.coachName, {
      label: "Nome do treinador",
      minLength: 2,
      maxLength: MAX_SHORT_TEXT_LENGTH
    }) ??
    validateRequiredText(fields.coachContact, {
      label: "Contato do treinador",
      minLength: 8,
      maxLength: MAX_SHORT_TEXT_LENGTH
    }) ??
    validateRequiredText(fields.cornerOne, {
      label: "Corner 1",
      minLength: 2,
      maxLength: MAX_SHORT_TEXT_LENGTH
    }) ??
    validateRequiredText(fields.primarySpecialty, {
      label: "Especialidade principal",
      minLength: 2
    });

  if (shortFieldError) {
    return {
      ok: false,
      message: shortFieldError
    };
  }

  if (!isValidCpf(fields.cpf)) {
    return {
      ok: false,
      message: "Informe um CPF válido."
    };
  }

  if (!isValidBirthDate(fields.birthDate)) {
    return {
      ok: false,
      message: "Informe uma data de nascimento válida."
    };
  }

  if (!pixKeyTypesSet.has(fields.pixKeyType)) {
    return {
      ok: false,
      message: "Selecione o tipo da sua chave Pix."
    };
  }

  if (!healthInsuranceOptionsSet.has(fields.hasHealthInsurance)) {
    return {
      ok: false,
      message: "Informe se você possui plano de saúde."
    };
  }

  if (!weightClassSet.has(fields.category)) {
    return {
      ok: false,
      message: "Selecione uma categoria válida."
    };
  }

  if (fields.hasHealthInsurance === "yes") {
    const healthInsuranceError = validateRequiredText(fields.healthInsuranceProvider, {
      label: "Plano de saúde",
      minLength: 2
    });

    if (healthInsuranceError) {
      return {
        ok: false,
        message: healthInsuranceError
      };
    }
  }

  if (!isValidEventFighterEmail(fields.email)) {
    return {
      ok: false,
      message: "Informe um email válido."
    };
  }

  if (fields.email !== fields.accessEmail) {
    return {
      ok: false,
      message: "Use no formulário o mesmo email utilizado para acessar a página."
    };
  }

  if (digitsOnly(fields.phoneWhatsapp).length < 10) {
    return {
      ok: false,
      message: "Informe um contato do atleta válido."
    };
  }

  if (fields.source !== EVENT_FIGHTER_INTAKE_SOURCE) {
    return {
      ok: false,
      message: "Origem da ficha inválida."
    };
  }

  const longFieldError =
    validateRequiredText(fields.fightGraduations, {
      label: "Graduações na luta",
      minLength: 2,
      maxLength: MAX_MEDIUM_TEXT_LENGTH
    }) ??
    validateRequiredText(fields.additionalSpecialties, {
      label: "Outras especialidades",
      minLength: 2
    }) ??
    validateRequiredText(fields.competitionHistory, {
      label: "Histórico de competição",
      minLength: 40
    }) ??
    validateRequiredText(fields.titlesWon, {
      label: "Títulos conquistados",
      minLength: 20
    }) ??
    validateRequiredText(fields.lifeStory, {
      label: "História de vida",
      minLength: 60
    }) ??
    validateRequiredText(fields.funnyStory, {
      label: "História engraçada",
      minLength: 20
    }) ??
    validateRequiredText(fields.curiosities, {
      label: "Curiosidades",
      minLength: 20
    }) ??
    validateRequiredText(fields.hobbies, {
      label: "Hobbies",
      minLength: 2
    });

  if (longFieldError) {
    return {
      ok: false,
      message: longFieldError
    };
  }

  const optionalFieldError =
    validateOptionalText(fields.managerName, {
      label: "Nome do empresário",
      minLength: 2,
      maxLength: MAX_SHORT_TEXT_LENGTH
    }) ??
    validateOptionalText(fields.managerContact, {
      label: "Contato do empresário",
      minLength: 8,
      maxLength: MAX_SHORT_TEXT_LENGTH
    }) ??
    validateOptionalText(fields.cornerTwo, {
      label: "Corner 2",
      minLength: 2,
      maxLength: MAX_SHORT_TEXT_LENGTH
    });

  if (optionalFieldError) {
    return {
      ok: false,
      message: optionalFieldError
    };
  }

  if (fields.managerName && !fields.managerContact) {
    return {
      ok: false,
      message: "Informe o contato do empresário."
    };
  }

  if (fields.managerContact && !fields.managerName) {
    return {
      ok: false,
      message: "Informe o nome do empresário."
    };
  }

  return {
    ok: true,
    payload: {
      fullName: fields.fullName,
      nickname: fields.nickname,
      cpf: normalizeCpf(fields.cpf),
      birthDate: fields.birthDate,
      pixKeyType: fields.pixKeyType as PixKeyType,
      pixKey: fields.pixKey,
      hasHealthInsurance: fields.hasHealthInsurance === "yes",
      healthInsuranceProvider:
        fields.hasHealthInsurance === "yes" ? fields.healthInsuranceProvider : "",
      email: fields.email,
      phoneWhatsapp: fields.phoneWhatsapp,
      record: fields.record,
      category: fields.category as FighterWeightClass,
      height: fields.height,
      reach: fields.reach,
      tapologyLink: fields.tapologyLink,
      instagramLink: fields.instagramLink,
      city: fields.city,
      state: fields.state as BrazilianStateName,
      education: fields.education,
      team: fields.team,
      coachName: fields.coachName,
      fightGraduations: fields.fightGraduations,
      coachContact: fields.coachContact,
      managerName: fields.managerName,
      managerContact: fields.managerContact,
      cornerOne: fields.cornerOne,
      cornerTwo: fields.cornerTwo,
      primarySpecialty: fields.primarySpecialty,
      additionalSpecialties: fields.additionalSpecialties,
      competitionHistory: fields.competitionHistory,
      titlesWon: fields.titlesWon,
      lifeStory: fields.lifeStory,
      funnyStory: fields.funnyStory,
      curiosities: fields.curiosities,
      hobbies: fields.hobbies,
      source: EVENT_FIGHTER_INTAKE_SOURCE,
      accessEmail: fields.accessEmail
    }
  };
}

function parseUploadedPhotos(
  input: unknown
): { ok: true; photos: EventFighterIntakeUploadedPhoto[] } | { ok: false; message: string } {
  if (!Array.isArray(input)) {
    return {
      ok: false,
      message: "As fotos chegaram incompletas."
    };
  }

  const uploadedPhotos: EventFighterIntakeUploadedPhoto[] = [];
  const seenFields = new Set<EventFighterPhotoFieldName>();

  for (const item of input) {
    if (!isRecord(item)) {
      return {
        ok: false,
        message: "As fotos chegaram em um formato inválido."
      };
    }

    const fieldName = normalizeShortText(item.fieldName);
    const fileName = normalizeShortText(item.fileName);
    const bucket = normalizeShortText(item.bucket);
    const objectKey = normalizeShortText(item.objectKey);
    const contentType = normalizeShortText(item.contentType).toLowerCase();
    const storageProvider = normalizeShortText(item.storageProvider);
    const sha256Hex = normalizeShortText(item.sha256Hex).toLowerCase();
    const byteSize =
      typeof item.byteSize === "number"
        ? item.byteSize
        : typeof item.byteSize === "string"
          ? Number.parseInt(item.byteSize, 10)
          : Number.NaN;

    if (!photoFieldNameSet.has(fieldName)) {
      return {
        ok: false,
        message: "Uma das fotos chegou com identificação inválida."
      };
    }

    const typedFieldName = fieldName as EventFighterPhotoFieldName;
    const label = getEventFighterPhotoLabel(typedFieldName);

    if (seenFields.has(typedFieldName)) {
      return {
        ok: false,
        message: `${label} foi enviada mais de uma vez.`
      };
    }

    const fileNameError = validateRequiredText(fileName, {
      label,
      minLength: 3,
      maxLength: MAX_MEDIUM_TEXT_LENGTH
    });

    if (fileNameError) {
      return {
        ok: false,
        message: fileNameError
      };
    }

    if (!isAcceptedImage({ contentType, fileName })) {
      return {
        ok: false,
        message: `${label} precisa estar em JPG, PNG, WEBP ou HEIC.`
      };
    }

    if (!Number.isFinite(byteSize) || byteSize <= 0) {
      return {
        ok: false,
        message: `${label} chegou com tamanho inválido.`
      };
    }

    if (byteSize > MAX_IMAGE_BYTES) {
      return {
        ok: false,
        message: `${label} passou do limite de 10 MB.`
      };
    }

    if (
      !bucket ||
      bucket.length > MAX_SHORT_TEXT_LENGTH ||
      !objectKey ||
      objectKey.length > MAX_OBJECT_KEY_LENGTH ||
      !objectKey.startsWith("event-fighter-intakes/staging/")
    ) {
      return {
        ok: false,
        message: `${label} chegou com referência inválida de armazenamento.`
      };
    }

    if (!storageProvider || storageProvider.length > MAX_SHORT_TEXT_LENGTH) {
      return {
        ok: false,
        message: `${label} chegou com provedor de armazenamento inválido.`
      };
    }

    if (!sha256HexPattern.test(sha256Hex)) {
      return {
        ok: false,
        message: `${label} chegou com hash inválido.`
      };
    }

    uploadedPhotos.push({
      fieldName: typedFieldName,
      fileName,
      bucket,
      objectKey,
      contentType,
      byteSize,
      sha256Hex,
      storageProvider
    });

    seenFields.add(typedFieldName);
  }

  return {
    ok: true,
    photos: uploadedPhotos
  };
}

export type EventFighterIntakePublicResponse = PublicMutationResponse;

export function getEventFighterPhotoLabel(fieldName: EventFighterPhotoFieldName) {
  return photoFieldLabels.get(fieldName) ?? fieldName;
}

export function parseEventFighterIntakeFormData(
  formData: FormData,
  authenticatedEmail: string
): EventFighterIntakeParseResult<EventFighterIntakeDraftSubmission> {
  const website = normalizeShortText(formData.get("website"));

  if (website) {
    return {
      ok: true,
      honeypotTriggered: true,
      data: null
    };
  }

  const accessEmail = normalizeEventFighterEmail(authenticatedEmail);
  const payloadResult = getValidatedPayload({
    fullName: normalizeShortText(formData.get("fullName")),
    nickname: normalizeShortText(formData.get("nickname")),
    cpf: normalizeShortText(formData.get("cpf")),
    birthDate: normalizeShortText(formData.get("birthDate")),
    pixKeyType: normalizeShortText(formData.get("pixKeyType")).toLowerCase(),
    pixKey: normalizeShortText(formData.get("pixKey")),
    hasHealthInsurance: normalizeShortText(formData.get("hasHealthInsurance")).toLowerCase(),
    healthInsuranceProvider: normalizeShortText(formData.get("healthInsuranceProvider")),
    email: normalizeEventFighterEmail(normalizeShortText(formData.get("email"))),
    phoneWhatsapp: normalizeShortText(formData.get("phoneWhatsapp")),
    record: normalizeShortText(formData.get("record")),
    category: normalizeShortText(formData.get("category")),
    height: normalizeShortText(formData.get("height")),
    reach: normalizeShortText(formData.get("reach")),
    tapologyLink: normalizeShortText(formData.get("tapologyLink")),
    instagramLink: normalizeShortText(formData.get("instagramLink")),
    city: normalizeShortText(formData.get("city")),
    state: normalizeBrazilianState(formData.get("state")),
    education: normalizeShortText(formData.get("education")),
    team: normalizeShortText(formData.get("team")),
    coachName: normalizeShortText(formData.get("coachName")),
    fightGraduations: normalizeLongText(formData.get("fightGraduations")),
    coachContact: normalizeShortText(formData.get("coachContact")),
    managerName: normalizeShortText(formData.get("managerName")),
    managerContact: normalizeShortText(formData.get("managerContact")),
    cornerOne: normalizeShortText(formData.get("cornerOne")),
    cornerTwo: normalizeShortText(formData.get("cornerTwo")),
    primarySpecialty: normalizeShortText(formData.get("primarySpecialty")),
    additionalSpecialties: normalizeLongText(formData.get("additionalSpecialties")),
    competitionHistory: normalizeLongText(formData.get("competitionHistory")),
    titlesWon: normalizeLongText(formData.get("titlesWon")),
    lifeStory: normalizeLongText(formData.get("lifeStory")),
    funnyStory: normalizeLongText(formData.get("funnyStory")),
    curiosities: normalizeLongText(formData.get("curiosities")),
    hobbies: normalizeLongText(formData.get("hobbies")),
    source: EVENT_FIGHTER_INTAKE_SOURCE,
    accessEmail
  });

  if (!payloadResult.ok) {
    return payloadResult;
  }

  const photos: EventFighterIntakeDraftPhoto[] = [];

  for (const photoField of EVENT_FIGHTER_PHOTO_FIELDS) {
    const file = getOptionalImage(formData, photoField.fieldName);

    if (!file) {
      continue;
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
      payload: payloadResult.payload,
      photos
    }
  };
}

export function parseEventFighterIntakeUploadRequest(input: unknown): UploadRequestParseResult {
  if (!isRecord(input) || !Array.isArray(input.files)) {
    return {
      ok: false,
      message: "Os arquivos de foto não chegaram corretamente."
    };
  }

  const files: EventFighterIntakeUploadRequestPhoto[] = [];
  const seenFields = new Set<EventFighterPhotoFieldName>();

  for (const item of input.files) {
    if (!isRecord(item)) {
      return {
        ok: false,
        message: "Os arquivos de foto chegaram em formato inválido."
      };
    }

    const fieldName = normalizeShortText(item.fieldName);
    const fileName = normalizeShortText(item.fileName);
    const contentType = normalizeShortText(item.contentType).toLowerCase();
    const byteSize =
      typeof item.byteSize === "number"
        ? item.byteSize
        : typeof item.byteSize === "string"
          ? Number.parseInt(item.byteSize, 10)
          : Number.NaN;

    if (!photoFieldNameSet.has(fieldName)) {
      return {
        ok: false,
        message: "Uma das fotos não pôde ser identificada."
      };
    }

    const typedFieldName = fieldName as EventFighterPhotoFieldName;
    const label = getEventFighterPhotoLabel(typedFieldName);

    if (seenFields.has(typedFieldName)) {
      return {
        ok: false,
        message: `${label} foi enviada mais de uma vez.`
      };
    }

    const fileNameError = validateRequiredText(fileName, {
      label,
      minLength: 3,
      maxLength: MAX_MEDIUM_TEXT_LENGTH
    });

    if (fileNameError) {
      return {
        ok: false,
        message: fileNameError
      };
    }

    if (!isAcceptedImage({ contentType, fileName })) {
      return {
        ok: false,
        message: `${label} precisa estar em JPG, PNG, WEBP ou HEIC.`
      };
    }

    if (!Number.isFinite(byteSize) || byteSize <= 0) {
      return {
        ok: false,
        message: `${label} chegou com tamanho inválido.`
      };
    }

    if (byteSize > MAX_IMAGE_BYTES) {
      return {
        ok: false,
        message: `${label} passou do limite de 10 MB.`
      };
    }

    files.push({
      fieldName: typedFieldName,
      fileName,
      contentType,
      byteSize
    });

    seenFields.add(typedFieldName);
  }

  return {
    ok: true,
    files
  };
}

export function parseEventFighterIntakeJsonSubmission(
  input: unknown,
  authenticatedEmail: string
): EventFighterIntakeParseResult<EventFighterIntakeSubmission> {
  if (!isRecord(input)) {
    return {
      ok: false,
      message: "Não foi possível ler os dados enviados."
    };
  }

  const website = normalizeShortText(input.website);

  if (website) {
    return {
      ok: true,
      honeypotTriggered: true,
      data: null
    };
  }

  if (!isRecord(input.payload)) {
    return {
      ok: false,
      message: "A ficha chegou incompleta."
    };
  }

  const accessEmail = normalizeEventFighterEmail(authenticatedEmail);
  const hasHealthInsuranceValue =
    typeof input.payload.hasHealthInsurance === "boolean"
      ? input.payload.hasHealthInsurance
        ? "yes"
        : "no"
      : normalizeShortText(input.payload.hasHealthInsurance).toLowerCase();
  const payloadResult = getValidatedPayload({
    fullName: normalizeShortText(input.payload.fullName),
    nickname: normalizeShortText(input.payload.nickname),
    cpf: normalizeShortText(input.payload.cpf),
    birthDate: normalizeShortText(input.payload.birthDate),
    pixKeyType: normalizeShortText(input.payload.pixKeyType).toLowerCase(),
    pixKey: normalizeShortText(input.payload.pixKey),
    hasHealthInsurance: hasHealthInsuranceValue,
    healthInsuranceProvider: normalizeShortText(input.payload.healthInsuranceProvider),
    email: normalizeEventFighterEmail(normalizeShortText(input.payload.email)),
    phoneWhatsapp: normalizeShortText(input.payload.phoneWhatsapp),
    record: normalizeShortText(input.payload.record),
    category: normalizeShortText(input.payload.category),
    height: normalizeShortText(input.payload.height),
    reach: normalizeShortText(input.payload.reach),
    tapologyLink: normalizeShortText(input.payload.tapologyLink),
    instagramLink: normalizeShortText(input.payload.instagramLink),
    city: normalizeShortText(input.payload.city),
    state: normalizeBrazilianState(input.payload.state),
    education: normalizeShortText(input.payload.education),
    team: normalizeShortText(input.payload.team),
    coachName: normalizeShortText(input.payload.coachName),
    fightGraduations: normalizeLongText(input.payload.fightGraduations),
    coachContact: normalizeShortText(input.payload.coachContact),
    managerName: normalizeShortText(input.payload.managerName),
    managerContact: normalizeShortText(input.payload.managerContact),
    cornerOne: normalizeShortText(input.payload.cornerOne),
    cornerTwo: normalizeShortText(input.payload.cornerTwo),
    primarySpecialty: normalizeShortText(input.payload.primarySpecialty),
    additionalSpecialties: normalizeLongText(input.payload.additionalSpecialties),
    competitionHistory: normalizeLongText(input.payload.competitionHistory),
    titlesWon: normalizeLongText(input.payload.titlesWon),
    lifeStory: normalizeLongText(input.payload.lifeStory),
    funnyStory: normalizeLongText(input.payload.funnyStory),
    curiosities: normalizeLongText(input.payload.curiosities),
    hobbies: normalizeLongText(input.payload.hobbies),
    source: normalizeShortText(input.payload.source),
    accessEmail:
      normalizeEventFighterEmail(normalizeShortText(input.payload.accessEmail)) || accessEmail
  });

  if (!payloadResult.ok) {
    return payloadResult;
  }

  const photosResult = parseUploadedPhotos(input.photos);

  if (!photosResult.ok) {
    return photosResult;
  }

  return {
    ok: true,
    honeypotTriggered: false,
    data: {
      payload: payloadResult.payload,
      photos: photosResult.photos
    }
  };
}
