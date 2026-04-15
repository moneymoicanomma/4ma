"use client";

import { type FormEvent, startTransition, useDeferredValue, useState } from "react";

import {
  FANTASY_ENTRY_SOURCE,
  FANTASY_VICTORY_METHODS,
  findBrazilianStateSuggestions,
  parseFantasyEntry,
  type FantasyEntryPublicResponse,
  type FantasyPickPayload,
  type FantasyRound
} from "@/lib/contracts/fantasy";
import type {
  FantasyLeaderboardRow,
  FantasyMockEvent,
  FantasyScoringRules
} from "@/lib/fantasy/mock-data";

import { FormConfirmationPopup } from "./form-confirmation-popup";
import styles from "./fantasy-experience.module.css";

type FantasyExperienceProps = {
  currentEvent: Omit<FantasyMockEvent, "entries">;
  leaderboardEvent: Omit<FantasyMockEvent, "entries">;
  leaderboardRows: FantasyLeaderboardRow[];
  scoringRules: FantasyScoringRules;
  initialEntrantCount: number;
};

type SubmissionState = {
  status: "idle" | "submitting" | "success" | "error";
  message: string;
};

type LeadDraft = {
  fullName: string;
  email: string;
  whatsapp: string;
  city: string;
  state: string;
  marketingConsent: boolean;
};

type SubmittedEntry = {
  referenceCode: string;
  submittedAt: string;
  fullName: string;
  email: string;
  whatsapp: string;
  city: string;
  state: string;
  picks: FantasyPickPayload[];
};

const initialLeadDraft: LeadDraft = {
  fullName: "",
  email: "",
  whatsapp: "",
  city: "",
  state: "",
  marketingConsent: false
};

const initialSubmissionState: SubmissionState = {
  status: "idle",
  message: ""
};

const victoryMethodLabel: Record<(typeof FANTASY_VICTORY_METHODS)[number], string> = {
  decisao: "Decisão",
  finalizacao: "Finalização",
  nocaute: "Nocaute"
};

function formatLongDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function createReferenceCode(fullName: string) {
  const prefix = fullName
    .split(" ")
    .map((chunk) => chunk.trim()[0] ?? "")
    .join("")
    .slice(0, 3)
    .toUpperCase();
  const suffix = `${Date.now()}`.slice(-6);

  return `${prefix || "MM"}-${suffix}`;
}

function maskEmail(value: string) {
  const [localPart = "", domain = ""] = value.split("@");
  const visibleLocal = localPart.slice(0, 2);
  const hiddenLocal = Math.max(localPart.length - visibleLocal.length, 1);

  return `${visibleLocal}${"*".repeat(hiddenLocal)}@${domain}`;
}

function maskWhatsapp(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.length < 4) {
    return value;
  }

  return `${digits.slice(0, 2)} ${"*".repeat(Math.max(digits.length - 4, 2))}${digits.slice(-2)}`;
}

function fighterInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((chunk) => chunk[0] ?? "")
    .join("")
    .toUpperCase();
}

function looksLikeUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function FighterPortrait({
  imageUrl,
  name,
  selected
}: Readonly<{
  imageUrl: string;
  name: string;
  selected: boolean;
}>) {
  if (imageUrl) {
    return (
      <span className={selected ? `${styles.portrait} ${styles.portraitSelected}` : styles.portrait}>
        <img alt="" src={imageUrl} />
      </span>
    );
  }

  return (
    <span className={selected ? `${styles.portrait} ${styles.portraitSelected}` : styles.portrait}>
      <span className={styles.portraitFallback}>{fighterInitials(name)}</span>
    </span>
  );
}

export function FantasyExperience({
  currentEvent,
  leaderboardEvent,
  leaderboardRows,
  scoringRules,
  initialEntrantCount
}: Readonly<FantasyExperienceProps>) {
  const [leadDraft, setLeadDraft] = useState(initialLeadDraft);
  const [entrantCount, setEntrantCount] = useState(initialEntrantCount);
  const [submissionState, setSubmissionState] = useState(initialSubmissionState);
  const [submittedEntry, setSubmittedEntry] = useState<SubmittedEntry | null>(null);
  const [pickMap, setPickMap] = useState<Record<string, Partial<FantasyPickPayload>>>({});
  const [statePickerOpen, setStatePickerOpen] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState("");

  const deferredStateQuery = useDeferredValue(leadDraft.state);
  const stateSuggestions = findBrazilianStateSuggestions(deferredStateQuery, 7);

  const completedFightCount = currentEvent.fights.filter((fight) => {
    const pickPayload = pickMap[fight.id];

    return Boolean(pickPayload?.fighterId && pickPayload?.victoryMethod && pickPayload?.round);
  }).length;

  const picksOpen = currentEvent.status === "published";
  const progressPercentage = Math.round(
    (completedFightCount / Math.max(currentEvent.fights.length, 1)) * 100
  );

  function updateLeadDraft<K extends keyof LeadDraft>(field: K, value: LeadDraft[K]) {
    setLeadDraft((current) => ({
      ...current,
      [field]: value
    }));

    if (submissionState.status !== "idle") {
      setSubmissionState(initialSubmissionState);
    }

    if (confirmationMessage) {
      setConfirmationMessage("");
    }
  }

  function updateFightPick(fightId: string, patch: Partial<FantasyPickPayload>) {
    setPickMap((current) => ({
      ...current,
      [fightId]: {
        ...current[fightId],
        ...patch,
        fightId
      }
    }));

    if (submissionState.status !== "idle") {
      setSubmissionState(initialSubmissionState);
    }

    if (confirmationMessage) {
      setConfirmationMessage("");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setConfirmationMessage("");

    if (!picksOpen) {
      setSubmissionState({
        status: "error",
        message: "As picks deste evento já foram travadas."
      });
      return;
    }

    const picks = currentEvent.fights
      .map((fight) => {
        const pickPayload = pickMap[fight.id];

        if (!pickPayload?.fighterId || !pickPayload?.victoryMethod || !pickPayload?.round) {
          return null;
        }

        return {
          fightId: fight.id,
          fighterId: pickPayload.fighterId,
          victoryMethod: pickPayload.victoryMethod,
          round: pickPayload.round
        } satisfies FantasyPickPayload;
      })
      .filter((pickPayload): pickPayload is FantasyPickPayload => pickPayload !== null);

    if (picks.length !== currentEvent.fights.length) {
      setSubmissionState({
        status: "error",
        message: "Complete todas as lutas antes de enviar seu fantasy."
      });
      return;
    }

    const parsed = parseFantasyEntry({
      eventId: currentEvent.id,
      fullName: leadDraft.fullName,
      email: leadDraft.email,
      whatsapp: leadDraft.whatsapp,
      city: leadDraft.city,
      state: leadDraft.state,
      marketingConsent: leadDraft.marketingConsent,
      picks,
      source: FANTASY_ENTRY_SOURCE,
      website: ""
    });

    if (!parsed.ok) {
      setSubmissionState({
        status: "error",
        message: parsed.message
      });
      return;
    }

    const knownEntrant = submittedEntry?.email === parsed.data.email;
    const entrantDelta = knownEntrant ? 0 : 1;

    if (looksLikeUuid(currentEvent.id)) {
      setSubmissionState({
        status: "submitting",
        message: "Enviando picks..."
      });

      try {
        const response = await fetch("/api/fantasy/entries", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json"
          },
          body: JSON.stringify(parsed.data),
          cache: "no-store"
        });

        const payload =
          (await response.json().catch(() => null)) as FantasyEntryPublicResponse | null;

        if (!response.ok || !payload?.ok) {
          setSubmissionState({
            status: "error",
            message: payload?.message ?? "Não foi possível enviar seus picks agora."
          });
          return;
        }

        startTransition(() => {
          if (entrantDelta > 0) {
            setEntrantCount((current) => current + entrantDelta);
          }

          setSubmittedEntry({
            referenceCode: payload.referenceCode ?? createReferenceCode(parsed.data.fullName),
            submittedAt: payload.submittedAt ?? new Date().toISOString(),
            fullName: parsed.data.fullName,
            email: parsed.data.email,
            whatsapp: parsed.data.whatsapp,
            city: parsed.data.city,
            state: parsed.data.state,
            picks: parsed.data.picks
          });
          setSubmissionState({
            status: "success",
            message: payload.message
          });
        });
      } catch {
        setSubmissionState({
          status: "error",
          message: "Não foi possível enviar seus picks agora."
        });
      }

      return;
    }

    const referenceCode = createReferenceCode(parsed.data.fullName);
    const submittedAt = new Date().toISOString();

    startTransition(() => {
      if (entrantDelta > 0) {
        setEntrantCount((current) => current + entrantDelta);
      }

      setSubmittedEntry({
        referenceCode,
        submittedAt,
        fullName: parsed.data.fullName,
        email: parsed.data.email,
        whatsapp: parsed.data.whatsapp,
        city: parsed.data.city,
        state: parsed.data.state,
        picks: parsed.data.picks
      });
      setSubmissionState({
        status: "success",
        message: "Picks enviados. Quando o resultado oficial entrar, o ranking sobe automaticamente."
      });
      setConfirmationMessage(
        "Picks enviados. Quando o resultado oficial entrar, o ranking sobe automaticamente."
      );
    });
  }

  return (
    <form className={styles.shell} noValidate onSubmit={handleSubmit}>
      <section className={styles.boardHeader}>
        <div className={styles.boardHeaderCopy}>
          <span className={styles.sectionKicker}>Draft board</span>
          <h2 className={styles.sectionTitle}>{currentEvent.name}</h2>
          <p className={styles.sectionBody}>
            Evento em {currentEvent.cityLabel}. Seus picks ficam privados e o ranking só mostra o
            nome público e a pontuação final.
          </p>
        </div>

        <div className={styles.boardMeta}>
          <div className={styles.metaCard}>
            <span>Evento</span>
            <strong>{formatLongDate(currentEvent.startsAt)}</strong>
          </div>
          <div className={styles.metaCard}>
            <span>Lock</span>
            <strong>{formatLongDate(currentEvent.lockAt)}</strong>
          </div>
          <div className={styles.metaCard}>
            <span>Participantes</span>
            <strong>{entrantCount}</strong>
          </div>
        </div>
      </section>

      <div className={styles.workspace}>
        <div className={styles.fightRail}>
          {currentEvent.fights.map((fight, index) => {
            const selectedPick = pickMap[fight.id];
            const selectedWinner = selectedPick?.fighterId ?? "";

            return (
              <article
                className={
                  selectedWinner
                    ? `${styles.fightCard} ${styles.fightCardComplete}`
                    : styles.fightCard
                }
                key={fight.id}
              >
                <header className={styles.fightHeader}>
                  <div>
                    <span className={styles.fightCount}>Luta {index + 1}</span>
                    <h3 className={styles.fightLabel}>{fight.label}</h3>
                  </div>
                  <span className={styles.fightRounds}>
                    {fight.maxRound === 5 ? "5 rounds" : "3 rounds"}
                  </span>
                </header>

                <div className={styles.fighterGrid}>
                  {[fight.redCorner, fight.blueCorner].map((fighter, fighterIndex) => {
                    const isSelected = selectedWinner === fighter.id;

                    return (
                      <button
                        aria-pressed={isSelected}
                        className={
                          isSelected
                            ? `${styles.fighterButton} ${styles.fighterButtonSelected}`
                            : styles.fighterButton
                        }
                        key={fighter.id}
                        type="button"
                        onClick={() => {
                          updateFightPick(fight.id, {
                            fighterId: fighter.id
                          });
                        }}
                      >
                        <span className={styles.cornerLabel}>
                          {fighterIndex === 0 ? "Corner vermelho" : "Corner azul"}
                        </span>
                        <FighterPortrait
                          imageUrl={fighter.imageUrl}
                          name={fighter.name}
                          selected={isSelected}
                        />
                        <span className={styles.fighterName}>{fighter.name}</span>
                        <span className={styles.fighterCountry}>{fighter.country}</span>
                      </button>
                    );
                  })}
                </div>

                <div className={styles.selectorBlock}>
                  <span className={styles.selectorLabel}>Método da vitória</span>
                  <div className={styles.selectorRow}>
                    {FANTASY_VICTORY_METHODS.map((victoryMethod) => {
                      const selected = selectedPick?.victoryMethod === victoryMethod;

                      return (
                        <button
                          aria-pressed={selected}
                          className={
                            selected
                              ? `${styles.selectorButton} ${styles.selectorButtonSelected}`
                              : styles.selectorButton
                          }
                          key={victoryMethod}
                          type="button"
                          onClick={() => {
                            updateFightPick(fight.id, {
                              victoryMethod
                            });
                          }}
                        >
                          {victoryMethodLabel[victoryMethod]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className={styles.selectorBlock}>
                  <span className={styles.selectorLabel}>Round</span>
                  <div className={styles.selectorRow}>
                    {Array.from({ length: fight.maxRound }, (_, indexValue) => (indexValue + 1) as FantasyRound).map(
                      (round) => {
                        const selected = selectedPick?.round === round;

                        return (
                          <button
                            aria-pressed={selected}
                            className={
                              selected
                                ? `${styles.roundButton} ${styles.selectorButtonSelected}`
                                : styles.roundButton
                            }
                            key={round}
                            type="button"
                            onClick={() => {
                              updateFightPick(fight.id, {
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
              </article>
            );
          })}
        </div>

        <aside className={styles.sidebar}>
          <section className={styles.panel}>
            <span className={styles.panelKicker}>Seu progresso</span>
            <div className={styles.progressHeader}>
              <strong>{completedFightCount}</strong>
              <span>de {currentEvent.fights.length} lutas preenchidas</span>
            </div>
            <div className={styles.progressTrack} aria-hidden="true">
              <span className={styles.progressFill} style={{ width: `${progressPercentage}%` }} />
            </div>
            <p className={styles.panelCopy}>
              Picks liberados enquanto o evento estiver em status aberto. Depois do lock, só o
              ranking e a consulta privada continuam disponíveis.
            </p>
          </section>

          <section className={styles.panel}>
            <span className={styles.panelKicker}>Lead obrigatório</span>
            <div className={styles.fieldGrid}>
              <label className={styles.field}>
                <span>Nome completo</span>
                <input
                  autoComplete="name"
                  name="fullName"
                  placeholder="Seu nome"
                  required
                  type="text"
                  value={leadDraft.fullName}
                  onChange={(event) => {
                    updateLeadDraft("fullName", event.currentTarget.value);
                  }}
                />
              </label>

              <label className={styles.field}>
                <span>E-mail</span>
                <input
                  autoComplete="email"
                  name="email"
                  placeholder="voce@email.com"
                  required
                  type="email"
                  value={leadDraft.email}
                  onChange={(event) => {
                    updateLeadDraft("email", event.currentTarget.value);
                  }}
                />
              </label>

              <label className={styles.field}>
                <span>WhatsApp</span>
                <input
                  autoComplete="tel"
                  inputMode="tel"
                  name="whatsapp"
                  placeholder="(11) 99999-9999"
                  required
                  type="tel"
                  value={leadDraft.whatsapp}
                  onChange={(event) => {
                    updateLeadDraft("whatsapp", event.currentTarget.value);
                  }}
                />
              </label>

              <label className={styles.field}>
                <span>Cidade</span>
                <input
                  autoComplete="address-level2"
                  name="city"
                  placeholder="Sua cidade"
                  required
                  type="text"
                  value={leadDraft.city}
                  onChange={(event) => {
                    updateLeadDraft("city", event.currentTarget.value);
                  }}
                />
              </label>

              <div className={`${styles.field} ${styles.fieldWide}`}>
                <span>Estado</span>
                <div className={styles.statePicker}>
                  <input
                    autoComplete="address-level1"
                    name="state"
                    placeholder="Digite o estado ou UF"
                    required
                    type="text"
                    value={leadDraft.state}
                    onBlur={() => {
                      setTimeout(() => {
                        setStatePickerOpen(false);
                      }, 120);
                    }}
                    onChange={(event) => {
                      updateLeadDraft("state", event.currentTarget.value);
                    }}
                    onFocus={() => {
                      setStatePickerOpen(true);
                    }}
                  />
                  {statePickerOpen && leadDraft.state ? (
                    <div className={styles.stateSuggestions}>
                      {stateSuggestions.map((state) => (
                        <button
                          className={styles.stateSuggestion}
                          key={state.code}
                          type="button"
                          onClick={() => {
                            updateLeadDraft("state", state.name);
                            setStatePickerOpen(false);
                          }}
                        >
                          <span>{state.name}</span>
                          <small>{state.code}</small>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <label className={styles.checkbox}>
              <input
                checked={leadDraft.marketingConsent}
                name="marketingConsent"
                required
                type="checkbox"
                onChange={(event) => {
                  updateLeadDraft("marketingConsent", event.currentTarget.checked);
                }}
              />
              <span>
                Autorizo receber newsletters e ofertas dos parceiros oficiais do evento.
              </span>
            </label>

            <button
              className={styles.submitButton}
              disabled={!picksOpen || submissionState.status === "submitting"}
              type="submit"
            >
              {submissionState.status === "submitting"
                ? "Enviando..."
                : picksOpen
                  ? "Enviar fantasy"
                  : "Picks travados"}
            </button>

            {submissionState.message ? (
              <p
                aria-live="polite"
                className={
                  submissionState.status === "error"
                    ? `${styles.feedback} ${styles.feedbackError}`
                    : `${styles.feedback} ${styles.feedbackSuccess}`
                }
              >
                {submissionState.message}
              </p>
            ) : (
              <p className={styles.panelCopy}>
                Privacidade: público vê só o nome publicado no ranking. E-mail, WhatsApp, cidade,
                estado e picks detalhadas ficam reservados ao participante e ao admin.
              </p>
            )}
          </section>

          <section className={styles.panel}>
            <span className={styles.panelKicker}>Pontuação base</span>
            <ul className={styles.rulesList}>
              <li>
                <strong>+{scoringRules.winner}</strong>
                <span>vencedor correto</span>
              </li>
              <li>
                <strong>+{scoringRules.method}</strong>
                <span>método correto</span>
              </li>
              <li>
                <strong>+{scoringRules.round}</strong>
                <span>round correto</span>
              </li>
              <li>
                <strong>+{scoringRules.perfectPickBonus}</strong>
                <span>bônus de pick perfeito</span>
              </li>
            </ul>
          </section>
        </aside>
      </div>

      <div className={styles.bottomGrid}>
        <section className={styles.privatePanel}>
          <div className={styles.privateHeader}>
            <div>
              <span className={styles.panelKicker}>Consulta privada</span>
              <h3>Como o usuário vai rever as próprias picks</h3>
            </div>
            <span className={styles.privateBadge}>cookie + link seguro</span>
          </div>

          {submittedEntry ? (
            <div className={styles.privateContent}>
              <div className={styles.privateSummary}>
                <div className={styles.privateMeta}>
                  <span>Referência</span>
                  <strong>{submittedEntry.referenceCode}</strong>
                </div>
                <div className={styles.privateMeta}>
                  <span>Contato</span>
                  <strong>
                    {maskEmail(submittedEntry.email)} · {maskWhatsapp(submittedEntry.whatsapp)}
                  </strong>
                </div>
                <div className={styles.privateMeta}>
                  <span>Local</span>
                  <strong>
                    {submittedEntry.city}, {submittedEntry.state}
                  </strong>
                </div>
                <div className={styles.privateMeta}>
                  <span>Enviado em</span>
                  <strong>{formatShortDate(submittedEntry.submittedAt)}</strong>
                </div>
              </div>

              <div className={styles.privatePickList}>
                {submittedEntry.picks.map((pickPayload) => {
                  const fight = currentEvent.fights.find((fightItem) => fightItem.id === pickPayload.fightId);
                  const pickedFighter =
                    fight?.redCorner.id === pickPayload.fighterId ? fight.redCorner : fight?.blueCorner;

                  if (!fight || !pickedFighter) {
                    return null;
                  }

                  return (
                    <div className={styles.privatePick} key={pickPayload.fightId}>
                      <span>{fight.label}</span>
                      <strong>{pickedFighter.name}</strong>
                      <small>
                        {victoryMethodLabel[pickPayload.victoryMethod]} · R{pickPayload.round}
                      </small>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className={styles.privateEmpty}>
              Depois do envio, esta área mostra o resumo privado das picks do participante sem
              expor nenhum dado sensível no ranking público.
            </p>
          )}
        </section>

        <section className={styles.rankingPanel}>
          <div className={styles.privateHeader}>
            <div>
              <span className={styles.panelKicker}>Ranking publicado</span>
              <h3>{leaderboardEvent.name}</h3>
            </div>
            <span className={styles.privateBadge}>{leaderboardRows.length} players</span>
          </div>

          <p className={styles.rankingCopy}>
            Este bloco representa o ranking público oficial: só nome público e pontuação. A
            pontuação sobe conforme os resultados oficiais entram pelo admin.
          </p>

          <div className={styles.rankingTable}>
            {leaderboardRows.map((row) => (
              <div className={styles.rankingRow} key={row.id}>
                <div className={styles.rankCell}>
                  <span className={styles.rankNumber}>#{row.rank}</span>
                  <div>
                    <strong>{row.displayName}</strong>
                    <small>
                      {row.perfectPicks} pick{row.perfectPicks === 1 ? "" : "s"} perfeita
                      {row.perfectPicks === 1 ? "" : "s"}
                    </small>
                  </div>
                </div>
                <span className={styles.rankScore}>{row.score} pts</span>
              </div>
            ))}
          </div>
        </section>
      </div>
      <FormConfirmationPopup
        message={confirmationMessage}
        onClose={() => {
          setConfirmationMessage("");
        }}
        open={Boolean(confirmationMessage)}
        title="Picks confirmados"
      />
    </form>
  );
}
