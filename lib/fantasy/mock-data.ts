import type {
  BrazilianStateName,
  FantasyEventCard,
  FantasyEventStatus,
  FantasyPickPayload,
  FantasyRound,
  FantasyVictoryMethod
} from "@/lib/contracts/fantasy";

export type FantasyScoringRules = {
  winner: number;
  method: number;
  round: number;
  perfectPickBonus: number;
};

export type FantasyFightResult = {
  winnerId: string | null;
  victoryMethod: FantasyVictoryMethod | null;
  round: FantasyRound | null;
};

export type FantasyMockEntry = {
  id: string;
  displayName: string;
  fullName: string;
  email: string;
  whatsapp: string;
  city: string;
  state: BrazilianStateName;
  marketingConsent: true;
  submittedAt: string;
  picks: FantasyPickPayload[];
};

export type FantasyMockFight = FantasyEventCard["fights"][number] & {
  result: FantasyFightResult;
};

export type FantasyMockEvent = Omit<FantasyEventCard, "fights"> & {
  venue: string;
  cityLabel: string;
  heroLabel: string;
  broadcastLabel: string;
  statusText: string;
  scoringRules: FantasyScoringRules;
  fights: FantasyMockFight[];
  entries: FantasyMockEntry[];
};

export type FantasyLeaderboardRow = {
  id: string;
  displayName: string;
  score: number;
  rank: number;
  perfectPicks: number;
  picksSubmitted: number;
};

export const FANTASY_SCORING_RULES: FantasyScoringRules = {
  winner: 10,
  method: 6,
  round: 4,
  perfectPickBonus: 3
};

function pick(
  fightId: string,
  fighterId: string,
  victoryMethod: FantasyVictoryMethod,
  round: FantasyRound
): FantasyPickPayload {
  return {
    fightId,
    fighterId,
    victoryMethod,
    round
  };
}

const fantasyEventsSeed: FantasyMockEvent[] = [
  {
    id: "event-2026-05-mmmma-01",
    slug: "money-moicano-mma-01",
    name: "Money Moicano MMA 01",
    startsAt: "2026-05-23T20:00:00-03:00",
    lockAt: "2026-05-23T19:30:00-03:00",
    status: "published",
    venue: "Cornerman",
    cityLabel: "São Paulo, SP",
    heroLabel: "Fantasy oficial do card",
    broadcastLabel: "Canal Money Moicano",
    statusText: "Picks liberados até 30 minutos antes do primeiro sino.",
    scoringRules: { ...FANTASY_SCORING_RULES },
    fights: [
      {
        id: "fight-2026-05-01",
        order: 1,
        label: "Peso meio-médio",
        maxRound: 5,
        redCorner: {
          id: "fighter-igor-lira",
          name: "Igor Lira",
          country: "Brasil",
          imageUrl: ""
        },
        blueCorner: {
          id: "fighter-dario-santos",
          name: "Dario Santos",
          country: "Argentina",
          imageUrl: ""
        },
        result: {
          winnerId: null,
          victoryMethod: null,
          round: null
        }
      },
      {
        id: "fight-2026-05-02",
        order: 2,
        label: "Peso leve",
        maxRound: 3,
        redCorner: {
          id: "fighter-matheus-vento",
          name: "Matheus Vento",
          country: "Brasil",
          imageUrl: ""
        },
        blueCorner: {
          id: "fighter-raul-acosta",
          name: "Raul Acosta",
          country: "México",
          imageUrl: ""
        },
        result: {
          winnerId: null,
          victoryMethod: null,
          round: null
        }
      },
      {
        id: "fight-2026-05-03",
        order: 3,
        label: "Peso pena",
        maxRound: 3,
        redCorner: {
          id: "fighter-luca-vale",
          name: "Luca Vale",
          country: "Brasil",
          imageUrl: ""
        },
        blueCorner: {
          id: "fighter-erik-johansen",
          name: "Erik Johansen",
          country: "Noruega",
          imageUrl: ""
        },
        result: {
          winnerId: null,
          victoryMethod: null,
          round: null
        }
      },
      {
        id: "fight-2026-05-04",
        order: 4,
        label: "Peso galo",
        maxRound: 3,
        redCorner: {
          id: "fighter-noel-silva",
          name: "Noel Silva",
          country: "Brasil",
          imageUrl: ""
        },
        blueCorner: {
          id: "fighter-tarik-azzam",
          name: "Tarik Azzam",
          country: "Marrocos",
          imageUrl: ""
        },
        result: {
          winnerId: null,
          victoryMethod: null,
          round: null
        }
      },
      {
        id: "fight-2026-05-05",
        order: 5,
        label: "Peso mosca",
        maxRound: 3,
        redCorner: {
          id: "fighter-julia-bastos",
          name: "Julia Bastos",
          country: "Brasil",
          imageUrl: ""
        },
        blueCorner: {
          id: "fighter-sora-kim",
          name: "Sora Kim",
          country: "Coreia do Sul",
          imageUrl: ""
        },
        result: {
          winnerId: null,
          victoryMethod: null,
          round: null
        }
      }
    ],
    entries: [
      {
        id: "entry-2026-05-01",
        displayName: "Lucas N.",
        fullName: "Lucas Nogueira",
        email: "lucas.nogueira@example.com",
        whatsapp: "(11) 99111-1212",
        city: "São Paulo",
        state: "São Paulo",
        marketingConsent: true,
        submittedAt: "2026-05-15T20:15:00-03:00",
        picks: [
          pick("fight-2026-05-01", "fighter-igor-lira", "nocaute", 4),
          pick("fight-2026-05-02", "fighter-raul-acosta", "decisao", 3),
          pick("fight-2026-05-03", "fighter-luca-vale", "finalizacao", 2),
          pick("fight-2026-05-04", "fighter-tarik-azzam", "decisao", 3),
          pick("fight-2026-05-05", "fighter-julia-bastos", "nocaute", 1)
        ]
      },
      {
        id: "entry-2026-05-02",
        displayName: "Marina R.",
        fullName: "Marina Ribeiro",
        email: "marina.ribeiro@example.com",
        whatsapp: "(21) 98888-0101",
        city: "Rio de Janeiro",
        state: "Rio de Janeiro",
        marketingConsent: true,
        submittedAt: "2026-05-16T11:30:00-03:00",
        picks: [
          pick("fight-2026-05-01", "fighter-dario-santos", "decisao", 5),
          pick("fight-2026-05-02", "fighter-matheus-vento", "nocaute", 2),
          pick("fight-2026-05-03", "fighter-erik-johansen", "decisao", 3),
          pick("fight-2026-05-04", "fighter-noel-silva", "nocaute", 1),
          pick("fight-2026-05-05", "fighter-sora-kim", "decisao", 3)
        ]
      }
    ]
  },
  {
    id: "event-2026-03-mmmma-warmup",
    slug: "money-moicano-mma-warmup",
    name: "Money Moicano MMA Warmup",
    startsAt: "2026-03-14T19:00:00-03:00",
    lockAt: "2026-03-14T18:30:00-03:00",
    status: "finished",
    venue: "Cornerman",
    cityLabel: "São Paulo, SP",
    heroLabel: "Último ranking publicado",
    broadcastLabel: "Canal Money Moicano",
    statusText: "Evento encerrado com ranking consolidado.",
    scoringRules: { ...FANTASY_SCORING_RULES },
    fights: [
      {
        id: "fight-2026-03-01",
        order: 1,
        label: "Peso leve",
        maxRound: 5,
        redCorner: {
          id: "fighter-leo-ferraz",
          name: "Léo Ferraz",
          country: "Brasil",
          imageUrl: ""
        },
        blueCorner: {
          id: "fighter-diego-castro",
          name: "Diego Castro",
          country: "Chile",
          imageUrl: ""
        },
        result: {
          winnerId: "fighter-leo-ferraz",
          victoryMethod: "nocaute",
          round: 2
        }
      },
      {
        id: "fight-2026-03-02",
        order: 2,
        label: "Peso pena",
        maxRound: 3,
        redCorner: {
          id: "fighter-ana-costa",
          name: "Ana Costa",
          country: "Brasil",
          imageUrl: ""
        },
        blueCorner: {
          id: "fighter-emma-frost",
          name: "Emma Frost",
          country: "Inglaterra",
          imageUrl: ""
        },
        result: {
          winnerId: "fighter-emma-frost",
          victoryMethod: "decisao",
          round: 3
        }
      },
      {
        id: "fight-2026-03-03",
        order: 3,
        label: "Peso galo",
        maxRound: 3,
        redCorner: {
          id: "fighter-caue-moraes",
          name: "Cauê Moraes",
          country: "Brasil",
          imageUrl: ""
        },
        blueCorner: {
          id: "fighter-adam-reed",
          name: "Adam Reed",
          country: "Estados Unidos",
          imageUrl: ""
        },
        result: {
          winnerId: "fighter-caue-moraes",
          victoryMethod: "finalizacao",
          round: 1
        }
      },
      {
        id: "fight-2026-03-04",
        order: 4,
        label: "Peso médio",
        maxRound: 3,
        redCorner: {
          id: "fighter-gabriel-diniz",
          name: "Gabriel Diniz",
          country: "Brasil",
          imageUrl: ""
        },
        blueCorner: {
          id: "fighter-milos-petrov",
          name: "Milos Petrov",
          country: "Sérvia",
          imageUrl: ""
        },
        result: {
          winnerId: "fighter-milos-petrov",
          victoryMethod: "decisao",
          round: 3
        }
      }
    ],
    entries: [
      {
        id: "entry-2026-03-01",
        displayName: "Caio M.",
        fullName: "Caio Menezes",
        email: "caio.menezes@example.com",
        whatsapp: "(11) 94444-0001",
        city: "Campinas",
        state: "São Paulo",
        marketingConsent: true,
        submittedAt: "2026-03-10T13:00:00-03:00",
        picks: [
          pick("fight-2026-03-01", "fighter-leo-ferraz", "nocaute", 2),
          pick("fight-2026-03-02", "fighter-emma-frost", "decisao", 3),
          pick("fight-2026-03-03", "fighter-caue-moraes", "finalizacao", 1),
          pick("fight-2026-03-04", "fighter-gabriel-diniz", "decisao", 3)
        ]
      },
      {
        id: "entry-2026-03-02",
        displayName: "Bruna A.",
        fullName: "Bruna Albuquerque",
        email: "bruna.albuquerque@example.com",
        whatsapp: "(85) 97777-0022",
        city: "Fortaleza",
        state: "Ceará",
        marketingConsent: true,
        submittedAt: "2026-03-11T18:10:00-03:00",
        picks: [
          pick("fight-2026-03-01", "fighter-leo-ferraz", "nocaute", 2),
          pick("fight-2026-03-02", "fighter-emma-frost", "decisao", 3),
          pick("fight-2026-03-03", "fighter-caue-moraes", "finalizacao", 2),
          pick("fight-2026-03-04", "fighter-milos-petrov", "decisao", 3)
        ]
      },
      {
        id: "entry-2026-03-03",
        displayName: "Pedro G.",
        fullName: "Pedro Guedes",
        email: "pedro.guedes@example.com",
        whatsapp: "(31) 96666-0044",
        city: "Belo Horizonte",
        state: "Minas Gerais",
        marketingConsent: true,
        submittedAt: "2026-03-12T14:40:00-03:00",
        picks: [
          pick("fight-2026-03-01", "fighter-diego-castro", "decisao", 5),
          pick("fight-2026-03-02", "fighter-emma-frost", "decisao", 3),
          pick("fight-2026-03-03", "fighter-caue-moraes", "finalizacao", 1),
          pick("fight-2026-03-04", "fighter-milos-petrov", "nocaute", 2)
        ]
      },
      {
        id: "entry-2026-03-04",
        displayName: "Thiago P.",
        fullName: "Thiago Prado",
        email: "thiago.prado@example.com",
        whatsapp: "(71) 95555-0033",
        city: "Salvador",
        state: "Bahia",
        marketingConsent: true,
        submittedAt: "2026-03-12T21:15:00-03:00",
        picks: [
          pick("fight-2026-03-01", "fighter-leo-ferraz", "nocaute", 1),
          pick("fight-2026-03-02", "fighter-ana-costa", "decisao", 3),
          pick("fight-2026-03-03", "fighter-caue-moraes", "finalizacao", 1),
          pick("fight-2026-03-04", "fighter-milos-petrov", "decisao", 3)
        ]
      },
      {
        id: "entry-2026-03-05",
        displayName: "Renata S.",
        fullName: "Renata Sousa",
        email: "renata.sousa@example.com",
        whatsapp: "(61) 98811-2200",
        city: "Brasília",
        state: "Distrito Federal",
        marketingConsent: true,
        submittedAt: "2026-03-13T12:45:00-03:00",
        picks: [
          pick("fight-2026-03-01", "fighter-leo-ferraz", "nocaute", 2),
          pick("fight-2026-03-02", "fighter-emma-frost", "decisao", 3),
          pick("fight-2026-03-03", "fighter-adam-reed", "decisao", 3),
          pick("fight-2026-03-04", "fighter-milos-petrov", "decisao", 3)
        ]
      }
    ]
  }
];

function getFightResultScore(
  pickPayload: FantasyPickPayload,
  result: FantasyFightResult,
  scoringRules: FantasyScoringRules
) {
  if (!result.winnerId || !result.victoryMethod || !result.round) {
    return {
      score: 0,
      perfect: false
    };
  }

  let score = 0;

  if (pickPayload.fighterId === result.winnerId) {
    score += scoringRules.winner;
  }

  if (pickPayload.victoryMethod === result.victoryMethod) {
    score += scoringRules.method;
  }

  if (pickPayload.round === result.round) {
    score += scoringRules.round;
  }

  const perfect =
    pickPayload.fighterId === result.winnerId &&
    pickPayload.victoryMethod === result.victoryMethod &&
    pickPayload.round === result.round;

  if (perfect) {
    score += scoringRules.perfectPickBonus;
  }

  return {
    score,
    perfect
  };
}

export function calculateFantasyLeaderboard(
  event: FantasyMockEvent,
  scoringRules: FantasyScoringRules = event.scoringRules
): FantasyLeaderboardRow[] {
  const resultsByFightId = new Map(event.fights.map((fight) => [fight.id, fight.result]));

  return event.entries
    .map((entry) => {
      let score = 0;
      let perfectPicks = 0;

      for (const pickPayload of entry.picks) {
        const result = resultsByFightId.get(pickPayload.fightId);

        if (!result) {
          continue;
        }

        const fightScore = getFightResultScore(pickPayload, result, scoringRules);
        score += fightScore.score;

        if (fightScore.perfect) {
          perfectPicks += 1;
        }
      }

      return {
        id: entry.id,
        displayName: entry.displayName,
        score,
        perfectPicks,
        picksSubmitted: entry.picks.length,
        rank: 0
      };
    })
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      if (right.perfectPicks !== left.perfectPicks) {
        return right.perfectPicks - left.perfectPicks;
      }

      return left.displayName.localeCompare(right.displayName, "pt-BR");
    })
    .map((row, index) => ({
      ...row,
      rank: index + 1
    }));
}

export function getFantasyCurrentEvent(events: FantasyMockEvent[]) {
  return (
    events.find((event) => event.status === "published" || event.status === "locked") ?? events[0]
  );
}

export function getLatestFinishedFantasyEvent(events: FantasyMockEvent[]) {
  return events.find((event) => event.status === "finished") ?? events[0];
}

export function cloneFantasyMockEvents() {
  return fantasyEventsSeed.map((event) => ({
    ...event,
    scoringRules: { ...event.scoringRules },
    fights: event.fights.map((fight) => ({
      ...fight,
      redCorner: { ...fight.redCorner },
      blueCorner: { ...fight.blueCorner },
      result: { ...fight.result }
    })),
    entries: event.entries.map((entry) => ({
      ...entry,
      picks: entry.picks.map((entryPick) => ({ ...entryPick }))
    }))
  }));
}

export function countFantasyOfficialResults(event: FantasyMockEvent) {
  return event.fights.filter((fight) => fight.result.winnerId !== null).length;
}

export function getFantasyStatusTone(status: FantasyEventStatus) {
  switch (status) {
    case "draft":
      return "rascunho";
    case "published":
      return "aberto";
    case "locked":
      return "travado";
    case "finished":
      return "encerrado";
    default:
      return "rascunho";
  }
}
