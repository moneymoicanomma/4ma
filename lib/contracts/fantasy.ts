import {
  normalizeBrazilianState,
  type BrazilianStateName
} from "@/lib/contracts/brazilian-states";
import {
  isValidNewsletterEmail,
  normalizeNewsletterEmail
} from "@/lib/contracts/newsletter";
import type { PublicMutationResponse } from "@/lib/contracts/public-mutation";

export {
  BRAZILIAN_STATES,
  findBrazilianStateSuggestions,
  type BrazilianStateCode,
  type BrazilianStateName
} from "@/lib/contracts/brazilian-states";

export const FANTASY_ENTRY_SOURCE = "money-moicano-fantasy";
export const FANTASY_VICTORY_METHODS = ["decisao", "finalizacao", "nocaute"] as const;
export const FANTASY_ROUNDS = [1, 2, 3, 4, 5] as const;
export type FantasyVictoryMethod = (typeof FANTASY_VICTORY_METHODS)[number];
export type FantasyRound = (typeof FANTASY_ROUNDS)[number];

export type FantasyPickPayload = {
  fightId: string;
  fighterId: string;
  victoryMethod: FantasyVictoryMethod;
  round: FantasyRound;
};

export type FantasyEntryPayload = {
  eventId: string;
  fullName: string;
  email: string;
  whatsapp: string;
  city: string;
  state: BrazilianStateName;
  marketingConsent: true;
  picks: FantasyPickPayload[];
  source: typeof FANTASY_ENTRY_SOURCE;
};

export type FantasyEntryPublicResponse = PublicMutationResponse & {
  referenceCode?: string;
  submittedAt?: string;
};

export type FantasyEntrantSummary = {
  id: string;
  displayName: string;
  score: number;
  rank: number;
};

export type FantasyFightCardFighter = {
  id: string;
  name: string;
  country: string;
  imageUrl: string;
};

export type FantasyFightCardFight = {
  id: string;
  order: number;
  label: string;
  maxRound: 3 | 5;
  redCorner: FantasyFightCardFighter;
  blueCorner: FantasyFightCardFighter;
};

export type FantasyEventStatus = "draft" | "published" | "locked" | "finished";

export type FantasyEventCard = {
  id: string;
  slug: string;
  name: string;
  startsAt: string;
  lockAt: string;
  status: FantasyEventStatus;
  fights: FantasyFightCardFight[];
};

type FantasyEntryParseResult =
  | {
      ok: true;
      data: FantasyEntryPayload;
      honeypotTriggered: boolean;
    }
  | {
      ok: false;
      message: string;
    };

const MAX_SHORT_TEXT_LENGTH = 160;
const MAX_PHONE_LENGTH = 40;
const MAX_EVENT_ID_LENGTH = 120;
const MAX_FIGHT_ID_LENGTH = 120;
const MAX_FIGHTER_ID_LENGTH = 120;
const MAX_PICKS_PER_ENTRY = 24;
const victoryMethodSet = new Set<string>(FANTASY_VICTORY_METHODS);
const roundSet = new Set<number>(FANTASY_ROUNDS);

function normalizeShortText(input: unknown) {
  return typeof input === "string" ? input.trim().replace(/\s+/g, " ") : "";
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

function emptyPayload(): FantasyEntryPayload {
  return {
    eventId: "",
    fullName: "",
    email: "",
    whatsapp: "",
    city: "",
    state: "São Paulo",
    marketingConsent: true,
    picks: [],
    source: FANTASY_ENTRY_SOURCE
  };
}

export function parseFantasyEntry(input: unknown): FantasyEntryParseResult {
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

  const eventId = normalizeShortText(record.eventId);
  const fullName = normalizeShortText(record.fullName);
  const email = normalizeNewsletterEmail(record.email);
  const whatsapp = normalizeShortText(record.whatsapp);
  const city = normalizeShortText(record.city);
  const state = normalizeBrazilianState(record.state);
  const marketingConsent = record.marketingConsent === true;
  const rawPicks = Array.isArray(record.picks) ? record.picks : [];

  const shortFieldError =
    validateRequiredText(eventId, {
      label: "Evento",
      maxLength: MAX_EVENT_ID_LENGTH
    }) ??
    validateRequiredText(fullName, {
      label: "Nome",
      minLength: 3,
      maxLength: MAX_SHORT_TEXT_LENGTH
    }) ??
    validateRequiredText(whatsapp, {
      label: "WhatsApp",
      minLength: 10,
      maxLength: MAX_PHONE_LENGTH
    }) ??
    validateRequiredText(city, {
      label: "Cidade",
      minLength: 2,
      maxLength: MAX_SHORT_TEXT_LENGTH
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

  if (!state) {
    return {
      ok: false,
      message: "Selecione um estado válido."
    };
  }

  if (!marketingConsent) {
    return {
      ok: false,
      message: "Você precisa autorizar o recebimento de newsletters e ofertas dos parceiros."
    };
  }

  if (!rawPicks.length) {
    return {
      ok: false,
      message: "Faça pelo menos um palpite para participar."
    };
  }

  if (rawPicks.length > MAX_PICKS_PER_ENTRY) {
    return {
      ok: false,
      message: "Quantidade de lutas selecionadas acima do limite suportado."
    };
  }

  const picks: FantasyPickPayload[] = [];
  const seenFightIds = new Set<string>();

  for (const rawPick of rawPicks) {
    if (typeof rawPick !== "object" || rawPick === null) {
      return {
        ok: false,
        message: "Os palpites enviados são inválidos."
      };
    }

    const recordPick = rawPick as Record<string, unknown>;
    const fightId = normalizeShortText(recordPick.fightId);
    const fighterId = normalizeShortText(recordPick.fighterId);
    const victoryMethod = normalizeShortText(recordPick.victoryMethod).toLowerCase();
    const round = Number(recordPick.round);

    const pickError =
      validateRequiredText(fightId, {
        label: "Luta",
        maxLength: MAX_FIGHT_ID_LENGTH
      }) ??
      validateRequiredText(fighterId, {
        label: "Lutador",
        maxLength: MAX_FIGHTER_ID_LENGTH
      });

    if (pickError) {
      return {
        ok: false,
        message: "Cada palpite precisa ter luta e atleta válidos."
      };
    }

    if (seenFightIds.has(fightId)) {
      return {
        ok: false,
        message: "Cada luta pode receber apenas um palpite."
      };
    }

    if (!victoryMethodSet.has(victoryMethod)) {
      return {
        ok: false,
        message: "Selecione um método de vitória válido em todas as lutas."
      };
    }

    if (!roundSet.has(round)) {
      return {
        ok: false,
        message: "Selecione um round válido em todas as lutas."
      };
    }

    seenFightIds.add(fightId);
    picks.push({
      fightId,
      fighterId,
      victoryMethod: victoryMethod as FantasyVictoryMethod,
      round: round as FantasyRound
    });
  }

  return {
    ok: true,
    honeypotTriggered: false,
    data: {
      eventId,
      fullName,
      email,
      whatsapp,
      city,
      state,
      marketingConsent: true,
      picks,
      source: FANTASY_ENTRY_SOURCE
    }
  };
}
