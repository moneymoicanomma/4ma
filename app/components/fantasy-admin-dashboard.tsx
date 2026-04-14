"use client";

import { startTransition, useEffect, useState } from "react";

import type { FantasyRound, FantasyVictoryMethod } from "@/lib/contracts/fantasy";
import {
  FANTASY_SCORING_RULES,
  calculateFantasyLeaderboard,
  countFantasyOfficialResults,
  getFantasyCurrentEvent,
  getFantasyStatusTone,
  type FantasyMockEvent,
  type FantasyMockFight
} from "@/lib/fantasy/mock-data";

import styles from "./fantasy-admin-dashboard.module.css";

type FantasyAdminDashboardProps = {
  initialEvents: FantasyMockEvent[];
};

const statusOptions = [
  { value: "draft", label: "Rascunho" },
  { value: "published", label: "Aberto" },
  { value: "locked", label: "Travado" },
  { value: "finished", label: "Encerrado" }
] as const;

const methodOptions: Array<{
  value: FantasyVictoryMethod;
  label: string;
}> = [
  { value: "decisao", label: "Decisão" },
  { value: "finalizacao", label: "Finalização" },
  { value: "nocaute", label: "Nocaute" }
];

const FANTASY_ADMIN_TIME_ZONE = "America/Sao_Paulo";
const FANTASY_ADMIN_TIME_OFFSET = "-03:00";
const dateDisplayFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: FANTASY_ADMIN_TIME_ZONE
});
const datePartFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: FANTASY_ADMIN_TIME_ZONE
});

function getInitialSelectedEventId(events: FantasyMockEvent[]) {
  return events.length ? getFantasyCurrentEvent(events).id : null;
}

function getDatePartMap(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Map(
    datePartFormatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );
}

function formatDateTimeInput(value: string) {
  const partMap = getDatePartMap(value);

  if (!partMap) {
    return "";
  }

  const year = partMap.get("year");
  const month = partMap.get("month");
  const day = partMap.get("day");
  const hours = partMap.get("hour");
  const minutes = partMap.get("minute");

  if (!year || !month || !day || !hours || !minutes) {
    return "";
  }

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function parseDateTimeInput(value: string) {
  if (!value) {
    return "";
  }

  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}:00${FANTASY_ADMIN_TIME_OFFSET}`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Data indefinida";
  }

  return dateDisplayFormatter.format(date);
}

function createDraftFight(seed: number, order: number): FantasyMockFight {
  return {
    id: `fight-draft-${seed}-${order}`,
    order,
    label: "Peso leve",
    maxRound: 3,
    redCorner: {
      id: `fighter-red-${seed}-${order}`,
      name: "Corner vermelho",
      country: "Brasil",
      imageUrl: ""
    },
    blueCorner: {
      id: `fighter-blue-${seed}-${order}`,
      name: "Corner azul",
      country: "Brasil",
      imageUrl: ""
    },
    result: {
      winnerId: null,
      victoryMethod: null,
      round: null
    }
  };
}

function createDraftEvent(seed: number): FantasyMockEvent {
  return {
    id: `event-draft-${seed}`,
    slug: `novo-fantasy-${seed}`,
    name: "Novo evento fantasy",
    startsAt: "2026-06-27T20:00:00-03:00",
    lockAt: "2026-06-27T19:30:00-03:00",
    status: "draft",
    venue: "Cornerman",
    cityLabel: "São Paulo, SP",
    heroLabel: "Fantasy oficial do card",
    broadcastLabel: "Canal Money Moicano",
    statusText: "Configure o evento, monte o card e publique quando o deadline estiver validado.",
    scoringRules: { ...FANTASY_SCORING_RULES },
    fights: [createDraftFight(seed, 1)],
    entries: []
  };
}

export function FantasyAdminDashboard({
  initialEvents
}: Readonly<FantasyAdminDashboardProps>) {
  const [events, setEvents] = useState(initialEvents);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(
    getInitialSelectedEventId(initialEvents)
  );
  const [notice, setNotice] = useState(
    initialEvents.length
      ? "Leitura do fantasy já está ligada ao estado atual. A persistência do editor admin é o próximo passo."
      : "Nenhum evento real foi encontrado no banco. Você pode criar um rascunho local para montar a estrutura."
  );

  const selectedEvent =
    (selectedEventId ? events.find((event) => event.id === selectedEventId) : null) ?? events[0] ?? null;
  const [dateInputDraft, setDateInputDraft] = useState(() => ({
    startsAt: initialEvents[0] ? formatDateTimeInput(initialEvents[0].startsAt) : "",
    lockAt: initialEvents[0] ? formatDateTimeInput(initialEvents[0].lockAt) : ""
  }));
  const leaderboardRows = selectedEvent ? calculateFantasyLeaderboard(selectedEvent) : [];
  const officialResultCount = selectedEvent ? countFantasyOfficialResults(selectedEvent) : 0;

  useEffect(() => {
    setDateInputDraft({
      startsAt: selectedEvent ? formatDateTimeInput(selectedEvent.startsAt) : "",
      lockAt: selectedEvent ? formatDateTimeInput(selectedEvent.lockAt) : ""
    });
  }, [selectedEvent?.id, selectedEvent?.startsAt, selectedEvent?.lockAt]);

  function updateSelectedEvent(mutator: (event: FantasyMockEvent) => FantasyMockEvent) {
    setEvents((current) =>
      current.map((event) => (event.id === selectedEventId ? mutator(event) : event))
    );
  }

  function addEvent() {
    const seed = Date.now();
    const newEvent = createDraftEvent(seed);

    setEvents((current) => [newEvent, ...current]);
    startTransition(() => {
      setSelectedEventId(newEvent.id);
    });
    setNotice("Novo evento criado como rascunho. Agora é só ajustar o card e publicar.");
  }

  function deleteSelectedEvent() {
    if (!selectedEventId) {
      return;
    }

    if (events.length === 1) {
      setNotice("Mantenha pelo menos um evento no painel antes de excluir o atual.");
      return;
    }

    const remainingEvents = events.filter((event) => event.id !== selectedEventId);
    const fallbackEventId = remainingEvents[0]?.id ?? null;

    setEvents(remainingEvents);
    startTransition(() => {
      setSelectedEventId(fallbackEventId);
    });
    setNotice("Evento removido da interface. Quando a API entrar, esta ação pode virar delete real.");
  }

  function addFight() {
    const seed = Date.now();

    updateSelectedEvent((event) => ({
      ...event,
      fights: [...event.fights, createDraftFight(seed, event.fights.length + 1)]
    }));
    setNotice("Nova luta adicionada ao card do evento selecionado.");
  }

  function removeFight(fightId: string) {
    updateSelectedEvent((event) => ({
      ...event,
      fights: event.fights
        .filter((fight) => fight.id !== fightId)
        .map((fight, index) => ({
          ...fight,
          order: index + 1
        }))
    }));
    setNotice("Luta removida do card.");
  }

  function updateFight(fightId: string, mutator: (fight: FantasyMockFight) => FantasyMockFight) {
    updateSelectedEvent((event) => ({
      ...event,
      fights: event.fights.map((fight) => (fight.id === fightId ? mutator(fight) : fight))
    }));
  }

  function updateFightResult(
    fightId: string,
    patch: Partial<FantasyMockFight["result"]>
  ) {
    updateFight(fightId, (fight) => ({
      ...fight,
      result: {
        ...fight.result,
        ...patch
      }
    }));
  }

  function clearFightResult(fightId: string) {
    updateFightResult(fightId, {
      winnerId: null,
      victoryMethod: null,
      round: null
    });
  }

  return (
    <div className={styles.dashboard}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <div>
            <span className={styles.kicker}>Eventos</span>
            <h2>Card + histórico</h2>
          </div>
          <button className={styles.primaryButton} type="button" onClick={addEvent}>
            Novo evento
          </button>
        </div>

        <div className={styles.eventList}>
          {events.map((event) => {
            const selected = event.id === selectedEventId;

            return (
              <button
                className={selected ? `${styles.eventCard} ${styles.eventCardSelected}` : styles.eventCard}
                key={event.id}
                type="button"
                onClick={() => {
                  startTransition(() => {
                    setSelectedEventId(event.id);
                  });
                }}
              >
                <div className={styles.eventCardHeader}>
                  <span className={styles.eventStatus}>{getFantasyStatusTone(event.status)}</span>
                  <span className={styles.eventCount}>{event.fights.length} lutas</span>
                </div>
                <strong>{event.name}</strong>
                <small>{formatDate(event.startsAt)}</small>
              </button>
            );
          })}
        </div>
      </aside>

      <div className={styles.main}>
        {selectedEvent ? (
          <>
            <section className={styles.commandBar}>
              <div>
                <span className={styles.kicker}>Evento selecionado</span>
                <h2>{selectedEvent.name}</h2>
                <p>{notice}</p>
              </div>

              <div className={styles.commandActions}>
                <button
                  className={styles.secondaryButton}
                  type="button"
                  onClick={() => {
                    setNotice(
                      "Esta tela já ajuda a revisar o estado atual do fantasy. O save persistido do editor admin ainda é o próximo passo."
                    );
                  }}
                >
                  Salvar estrutura
                </button>
                <button className={styles.ghostButton} type="button" onClick={deleteSelectedEvent}>
                  Deletar evento
                </button>
              </div>
            </section>

            <section className={styles.overviewGrid}>
              <div className={styles.overviewCard}>
                <span>Status</span>
                <strong>{getFantasyStatusTone(selectedEvent.status)}</strong>
                <small>{selectedEvent.statusText}</small>
              </div>
              <div className={styles.overviewCard}>
                <span>Inscrições</span>
                <strong>{selectedEvent.entries.length}</strong>
                <small>leads vinculados ao evento</small>
              </div>
              <div className={styles.overviewCard}>
                <span>Lutas</span>
                <strong>{selectedEvent.fights.length}</strong>
                <small>slots ativos no card</small>
              </div>
              <div className={styles.overviewCard}>
                <span>Resultados oficiais</span>
                <strong>{officialResultCount}</strong>
                <small>lançados para o ranking</small>
              </div>
            </section>

            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <div>
                  <span className={styles.kicker}>Configuração</span>
                  <h3>Evento e deadline</h3>
                </div>
              </div>

              <div className={styles.formGrid}>
            <label className={styles.field}>
              <span>Nome do evento</span>
              <input
                type="text"
                value={selectedEvent.name}
                onChange={(event) => {
                  const nextValue = event.currentTarget.value;

                  updateSelectedEvent((current) => ({
                    ...current,
                    name: nextValue
                  }));
                }}
              />
            </label>

            <label className={styles.field}>
              <span>Slug</span>
              <input
                type="text"
                value={selectedEvent.slug}
                onChange={(event) => {
                  const nextValue = event.currentTarget.value;

                  updateSelectedEvent((current) => ({
                    ...current,
                    slug: nextValue
                  }));
                }}
              />
            </label>

            <label className={styles.field}>
              <span>Venue</span>
              <input
                type="text"
                value={selectedEvent.venue}
                onChange={(event) => {
                  const nextValue = event.currentTarget.value;

                  updateSelectedEvent((current) => ({
                    ...current,
                    venue: nextValue
                  }));
                }}
              />
            </label>

            <label className={styles.field}>
              <span>Cidade / Estado</span>
              <input
                type="text"
                value={selectedEvent.cityLabel}
                onChange={(event) => {
                  const nextValue = event.currentTarget.value;

                  updateSelectedEvent((current) => ({
                    ...current,
                    cityLabel: nextValue
                  }));
                }}
              />
            </label>

            <label className={styles.field}>
              <span>Início do evento</span>
              <input
                type="datetime-local"
                value={dateInputDraft.startsAt}
                onChange={(event) => {
                  const nextValue = event.currentTarget.value;
                  const nextStartsAt = parseDateTimeInput(nextValue);

                  setDateInputDraft((current) => ({
                    ...current,
                    startsAt: nextValue
                  }));

                  if (nextStartsAt === null) {
                    return;
                  }

                  updateSelectedEvent((current) => ({
                    ...current,
                    startsAt: nextStartsAt
                  }));
                }}
              />
            </label>

            <label className={styles.field}>
              <span>Lock das picks</span>
              <input
                type="datetime-local"
                value={dateInputDraft.lockAt}
                onChange={(event) => {
                  const nextValue = event.currentTarget.value;
                  const nextLockAt = parseDateTimeInput(nextValue);

                  setDateInputDraft((current) => ({
                    ...current,
                    lockAt: nextValue
                  }));

                  if (nextLockAt === null) {
                    return;
                  }

                  updateSelectedEvent((current) => ({
                    ...current,
                    lockAt: nextLockAt
                  }));
                }}
              />
            </label>

            <label className={`${styles.field} ${styles.fieldWide}`}>
              <span>Status operacional</span>
              <div className={styles.toggleRow}>
                {statusOptions.map((statusOption) => {
                  const selected = selectedEvent.status === statusOption.value;

                  return (
                    <button
                      className={
                        selected ? `${styles.toggleButton} ${styles.toggleButtonSelected}` : styles.toggleButton
                      }
                      key={statusOption.value}
                      type="button"
                      onClick={() => {
                        updateSelectedEvent((current) => ({
                          ...current,
                          status: statusOption.value
                        }));
                      }}
                    >
                      {statusOption.label}
                    </button>
                  );
                })}
              </div>
            </label>

            <label className={`${styles.field} ${styles.fieldWide}`}>
              <span>Mensagem de status</span>
              <textarea
                value={selectedEvent.statusText}
                onChange={(event) => {
                  const nextValue = event.currentTarget.value;

                  updateSelectedEvent((current) => ({
                    ...current,
                    statusText: nextValue
                  }));
                }}
              />
            </label>
              </div>
            </section>

            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <div>
                  <span className={styles.kicker}>Card</span>
                  <h3>Lutas e resultado oficial</h3>
                </div>
                <button className={styles.secondaryButton} type="button" onClick={addFight}>
                  Adicionar luta
                </button>
              </div>

              <div className={styles.fightList}>
            {selectedEvent.fights.map((fight) => (
              <article className={styles.fightEditor} key={fight.id}>
                <div className={styles.fightEditorHeader}>
                  <div>
                    <span className={styles.kicker}>Luta {fight.order}</span>
                    <h4>{fight.label}</h4>
                  </div>
                  <button
                    className={styles.ghostButton}
                    type="button"
                    onClick={() => {
                      removeFight(fight.id);
                    }}
                  >
                    Remover
                  </button>
                </div>

                <div className={styles.formGrid}>
                  <label className={styles.field}>
                    <span>Categoria</span>
                    <input
                      type="text"
                      value={fight.label}
                      onChange={(event) => {
                        const nextValue = event.currentTarget.value;

                        updateFight(fight.id, (currentFight) => ({
                          ...currentFight,
                          label: nextValue
                        }));
                      }}
                    />
                  </label>

                  <label className={styles.field}>
                    <span>Rounds máximos</span>
                    <select
                      value={fight.maxRound}
                      onChange={(event) => {
                        const nextMaxRound = Number(event.currentTarget.value) as 3 | 5;

                        updateFight(fight.id, (currentFight) => ({
                          ...currentFight,
                          maxRound: nextMaxRound,
                          result:
                            currentFight.result.round && currentFight.result.round > nextMaxRound
                              ? {
                                  ...currentFight.result,
                                  round: nextMaxRound
                                }
                              : currentFight.result
                        }));
                      }}
                    >
                      <option value={3}>3</option>
                      <option value={5}>5</option>
                    </select>
                  </label>

                  <label className={styles.field}>
                    <span>Corner vermelho</span>
                    <input
                      type="text"
                      value={fight.redCorner.name}
                      onChange={(event) => {
                        const nextValue = event.currentTarget.value;

                        updateFight(fight.id, (currentFight) => ({
                          ...currentFight,
                          redCorner: {
                            ...currentFight.redCorner,
                            name: nextValue
                          }
                        }));
                      }}
                    />
                  </label>

                  <label className={styles.field}>
                    <span>País vermelho</span>
                    <input
                      type="text"
                      value={fight.redCorner.country}
                      onChange={(event) => {
                        const nextValue = event.currentTarget.value;

                        updateFight(fight.id, (currentFight) => ({
                          ...currentFight,
                          redCorner: {
                            ...currentFight.redCorner,
                            country: nextValue
                          }
                        }));
                      }}
                    />
                  </label>

                  <label className={styles.field}>
                    <span>Corner azul</span>
                    <input
                      type="text"
                      value={fight.blueCorner.name}
                      onChange={(event) => {
                        const nextValue = event.currentTarget.value;

                        updateFight(fight.id, (currentFight) => ({
                          ...currentFight,
                          blueCorner: {
                            ...currentFight.blueCorner,
                            name: nextValue
                          }
                        }));
                      }}
                    />
                  </label>

                  <label className={styles.field}>
                    <span>País azul</span>
                    <input
                      type="text"
                      value={fight.blueCorner.country}
                      onChange={(event) => {
                        const nextValue = event.currentTarget.value;

                        updateFight(fight.id, (currentFight) => ({
                          ...currentFight,
                          blueCorner: {
                            ...currentFight.blueCorner,
                            country: nextValue
                          }
                        }));
                      }}
                    />
                  </label>
                </div>

                <div className={styles.resultBlock}>
                  <div className={styles.resultHeader}>
                    <span className={styles.kicker}>Resultado oficial</span>
                    <button
                      className={styles.inlineButton}
                      type="button"
                      onClick={() => {
                        clearFightResult(fight.id);
                      }}
                    >
                      Limpar resultado
                    </button>
                  </div>

                  <div className={styles.resultRow}>
                    <span className={styles.resultLabel}>Vencedor</span>
                    <div className={styles.toggleRow}>
                      {[fight.redCorner, fight.blueCorner].map((fighter) => {
                        const selected = fight.result.winnerId === fighter.id;

                        return (
                          <button
                            className={
                              selected
                                ? `${styles.toggleButton} ${styles.toggleButtonSelected}`
                                : styles.toggleButton
                            }
                            key={fighter.id}
                            type="button"
                            onClick={() => {
                              updateFightResult(fight.id, {
                                winnerId: fighter.id
                              });
                            }}
                          >
                            {fighter.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className={styles.resultRow}>
                    <span className={styles.resultLabel}>Método</span>
                    <div className={styles.toggleRow}>
                      {methodOptions.map((methodOption) => {
                        const selected = fight.result.victoryMethod === methodOption.value;

                        return (
                          <button
                            className={
                              selected
                                ? `${styles.toggleButton} ${styles.toggleButtonSelected}`
                                : styles.toggleButton
                            }
                            key={methodOption.value}
                            type="button"
                            onClick={() => {
                              updateFightResult(fight.id, {
                                victoryMethod: methodOption.value
                              });
                            }}
                          >
                            {methodOption.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className={styles.resultRow}>
                    <span className={styles.resultLabel}>Round</span>
                    <div className={styles.roundRow}>
                      {Array.from({ length: fight.maxRound }, (_, index) => (index + 1) as FantasyRound).map(
                        (round) => {
                          const selected = fight.result.round === round;

                          return (
                            <button
                              className={
                                selected
                                  ? `${styles.roundButton} ${styles.toggleButtonSelected}`
                                  : styles.roundButton
                              }
                              key={round}
                              type="button"
                              onClick={() => {
                                updateFightResult(fight.id, {
                                  round
                                });
                              }}
                            >
                              R{round}
                            </button>
                          );
                        }
                      )}
                    </div>
                  </div>
                </div>
              </article>
            ))}
              </div>
            </section>

            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <div>
                  <span className={styles.kicker}>Leaderboard</span>
                  <h3>Prévia do ranking público</h3>
                </div>
              </div>

              {leaderboardRows.length ? (
                <div className={styles.leaderboardTable}>
                  {leaderboardRows.map((row) => (
                    <div className={styles.leaderboardRow} key={row.id}>
                      <div className={styles.leaderboardIdentity}>
                        <span className={styles.leaderboardRank}>#{row.rank}</span>
                        <div>
                          <strong>{row.displayName}</strong>
                          <small>
                            {row.picksSubmitted} picks · {row.perfectPicks} perfeitas
                          </small>
                        </div>
                      </div>
                      <span className={styles.leaderboardScore}>{row.score} pts</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={styles.emptyState}>
                  Sem inscrições neste evento ainda. Quando as entradas chegarem, o ranking aparece aqui
                  com base nos resultados oficiais lançados acima.
                </p>
              )}
            </section>
          </>
        ) : (
          <section className={styles.section}>
            <div className={styles.emptyEditorState}>
              <span className={styles.kicker}>Sem evento selecionado</span>
              <h3>Nenhum evento real foi carregado ainda.</h3>
              <p>
                Você pode criar um rascunho local para desenhar a estrutura, mas ele não será salvo no
                banco até a etapa de persistência ser implementada.
              </p>
              <div className={styles.commandActions}>
                <button className={styles.primaryButton} type="button" onClick={addEvent}>
                  Criar rascunho local
                </button>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
