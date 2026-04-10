"use client";

import { type FormEvent, useState } from "react";

import {
  FIGHTER_SPECIALTIES,
  type FighterSpecialty,
  type FighterApplicationPublicResponse
} from "@/lib/contracts/fighter-application";

import { FormConfirmationPopup } from "./form-confirmation-popup";
import { TurnstileWidget } from "./turnstile-widget";
import styles from "./fighter-application-form.module.css";

type FormState = {
  status: "idle" | "submitting" | "success" | "error";
  message: string;
};

const initialState: FormState = {
  status: "idle",
  message: ""
};

const defaultSpecialty: FighterSpecialty = "mma";

const specialtyCopy: Record<(typeof FIGHTER_SPECIALTIES)[number], string> = {
  "jiu-jitsu": "Seu jogo gira mais em torno de grappling, finalização e controle.",
  mma: "Sua principal identidade competitiva hoje já é MMA.",
  "muay-thai": "Seu diferencial começa na trocação, pressão e striking.",
  boxe: "Sua mão é o cartão de visita e a leitura de distância pesa a seu favor.",
  kickboxing: "Sua base mistura trocação, volume e variações de chute com ritmo forte.",
  judo: "Seu jogo passa por queda, clinch e controle corporal de alto nível.",
  sanda: "Sua base mistura trocação e projeção com uma leitura pouco comum no card.",
  other: "Se sua modalidade principal não está aqui, explica qual é."
};

const specialtyLabel: Record<(typeof FIGHTER_SPECIALTIES)[number], string> = {
  "jiu-jitsu": "Jiu-jitsu",
  mma: "MMA",
  "muay-thai": "Muay Thai",
  boxe: "Boxe",
  kickboxing: "Kickboxing",
  judo: "Judô",
  sanda: "Sanda",
  other: "Outra"
};

export function FighterApplicationForm() {
  const [state, setState] = useState<FormState>(initialState);
  const [selectedSpecialty, setSelectedSpecialty] = useState<FighterSpecialty>(defaultSpecialty);
  const [confirmationMessage, setConfirmationMessage] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileResetSignal, setTurnstileResetSignal] = useState(0);
  const turnstileEnabled = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim());

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setConfirmationMessage("");

    const form = event.currentTarget;
    const formData = new FormData(form);

    if (turnstileEnabled && !turnstileToken) {
      setState({
        status: "error",
        message: "Confirme que você é humano antes de enviar."
      });
      return;
    }

    setState({
      status: "submitting",
      message: "Enviando inscrição..."
    });

    try {
      const response = await fetch("/api/fighter-applications", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          fullName: String(formData.get("fullName") ?? ""),
          nickname: String(formData.get("nickname") ?? ""),
          birthDate: String(formData.get("birthDate") ?? ""),
          city: String(formData.get("city") ?? ""),
          team: String(formData.get("team") ?? ""),
          tapology: String(formData.get("tapology") ?? ""),
          instagram: String(formData.get("instagram") ?? ""),
          specialty: String(formData.get("specialty") ?? ""),
          specialtyOther: String(formData.get("specialtyOther") ?? ""),
          competitionHistory: String(formData.get("competitionHistory") ?? ""),
          martialArtsTitles: String(formData.get("martialArtsTitles") ?? ""),
          curiosities: String(formData.get("curiosities") ?? ""),
          roastConsent: formData.get("roastConsent") === "on",
          website: String(formData.get("website") ?? ""),
          turnstileToken
        }),
        cache: "no-store"
      });

      const payload = (await response.json().catch(() => null)) as FighterApplicationPublicResponse | null;

      if (!response.ok || !payload?.ok) {
        setState({
          status: "error",
          message: payload?.message ?? "Não foi possível enviar agora. Tenta novamente."
        });
        return;
      }

      form.reset();
      setTurnstileToken("");
      setTurnstileResetSignal((current) => current + 1);
      setSelectedSpecialty(defaultSpecialty);
      setState({
        status: "success",
        message: payload.message
      });
      setConfirmationMessage(payload.message);
    } catch {
      setState({
        status: "error",
        message: "Não foi possível enviar agora. Tenta novamente."
      });
    }
  }

  return (
    <form
      aria-busy={state.status === "submitting"}
      className={styles.form}
      onInput={() => {
        if (confirmationMessage) {
          setConfirmationMessage("");
        }

        setState((current) => (current.status === "idle" ? current : initialState));
      }}
      onSubmit={handleSubmit}
    >
      <div className={styles.shell}>
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionKicker}>Dados básicos</span>
            <h2 className={styles.sectionTitle}>Quem está pedindo vaga no card</h2>
            <p className={styles.sectionCopy}>
              Preenche sem economizar contexto. Nome, equipe e perfil precisam vir do jeito
              que a equipe consegue te identificar rápido.
            </p>
          </div>

          <div className={styles.grid}>
            <label className={styles.field}>
              <span className={styles.label}>Nome completo</span>
              <input
                autoComplete="name"
                className={styles.input}
                maxLength={160}
                minLength={5}
                name="fullName"
                placeholder="Nome e sobrenome"
                required
                type="text"
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Apelido</span>
              <input
                autoComplete="nickname"
                className={styles.input}
                maxLength={160}
                minLength={2}
                name="nickname"
                placeholder='Ex.: "The Spider"'
                required
                type="text"
              />
              <p className={styles.helper}>
                Coloca o nome pelo qual você quer ser anunciado ou lembrado.
              </p>
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Data de nascimento</span>
              <input
                autoComplete="bday"
                className={styles.input}
                name="birthDate"
                required
                type="date"
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Cidade</span>
              <input
                autoComplete="address-level2"
                className={styles.input}
                maxLength={160}
                minLength={3}
                name="city"
                placeholder="Cidade e estado"
                required
                type="text"
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Equipe</span>
              <input
                autoComplete="organization"
                className={styles.input}
                maxLength={160}
                minLength={2}
                name="team"
                placeholder="Nome da equipe e treinador principal"
                required
                type="text"
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Tapology</span>
              <input
                autoComplete="url"
                className={styles.input}
                maxLength={220}
                minLength={3}
                name="tapology"
                placeholder="Link do perfil no Tapology"
                required
                type="text"
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Instagram</span>
              <input
                autoComplete="off"
                className={styles.input}
                maxLength={220}
                minLength={3}
                name="instagram"
                placeholder="@seuusuario ou link do perfil"
                required
                type="text"
              />
            </label>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionKicker}>Carreira</span>
            <h2 className={styles.sectionTitle}>Mostra seu nível com detalhes</h2>
            <p className={styles.sectionCopy}>
              Não vale resposta vaga. Conta o que você já fez, com quem lutou, onde lutou
              e o que te diferencia dentro da sua especialidade.
            </p>
          </div>

          <fieldset className={styles.specialtyGroup}>
            <legend className={styles.label}>Especialidade principal</legend>
            <div className={styles.specialtyGrid}>
              {FIGHTER_SPECIALTIES.map((specialty) => (
                <label className={styles.specialtyOption} key={specialty}>
                  <input
                    checked={selectedSpecialty === specialty}
                    className={styles.specialtyInput}
                    name="specialty"
                    onChange={() => {
                      setSelectedSpecialty(specialty);
                    }}
                    required
                    type="radio"
                    value={specialty}
                  />
                  <span className={styles.specialtyCard}>
                    <span className={styles.specialtyLabel}>{specialtyLabel[specialty]}</span>
                    <span className={styles.specialtyCopy}>{specialtyCopy[specialty]}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className={styles.longFields}>
            {selectedSpecialty === "other" ? (
              <label className={`${styles.field} ${styles.longField}`}>
                <span className={styles.label}>Qual é a outra especialidade?</span>
                <input
                  className={styles.input}
                  maxLength={120}
                  minLength={2}
                  name="specialtyOther"
                  placeholder="Ex.: wrestling, karate, taekwondo, sambo..."
                  required
                  type="text"
                />
              </label>
            ) : null}

            <label className={`${styles.field} ${styles.longField}`}>
              <span className={styles.label}>Histórico de competição</span>
              <textarea
                className={styles.textarea}
                minLength={40}
                name="competitionHistory"
                placeholder="Conta cartel, eventos em que já competiu, adversários relevantes, resultado das lutas e qualquer contexto que ajude a entender sua trajetória."
                required
              />
              <p className={styles.helper}>
                Quanto mais específico, melhor. Esse campo ajuda na avaliação técnica e no matchmaking.
              </p>
            </label>

            <label className={`${styles.field} ${styles.longField}`}>
              <span className={styles.label}>Principais títulos em artes marciais</span>
              <textarea
                className={styles.textarea}
                minLength={20}
                name="martialArtsTitles"
                placeholder="Lista campeonatos, graduações, cinturões, medalhas ou conquistas relevantes. Se tiver contexto do peso, faixa ou evento, coloca também."
                required
              />
            </label>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionKicker}>Narrativa</span>
            <h2 className={styles.sectionTitle}>Agora conta quem você é fora da luta</h2>
            <p className={styles.sectionCopy}>
              A transmissão também vive de história boa. Manda hobby, religião se quiser
              compartilhar, projeto social, faculdade, instrumentos, outras modalidades e
              qualquer detalhe que te torne memorável.
            </p>
          </div>

          <label className={styles.field}>
            <span className={styles.label}>Curiosidades</span>
            <textarea
              className={styles.textarea}
              minLength={40}
              name="curiosities"
              placeholder="Exemplo: hobby, religião se quiser compartilhar, projeto social, curso/faculdade, instrumento, profissão, competições em outras modalidades e qualquer história boa pra apresentar você."
              required
            />
            <p className={styles.helper}>
              Responde com detalhes. Esse campo ajuda a equipe a te apresentar melhor e a
              puxar conversa na transmissão.
            </p>
          </label>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionKicker}>Confirmação</span>
            <h2 className={styles.sectionTitle}>Se não ler, não chora depois</h2>
          </div>

          <div className={styles.consentBox}>
            <label className={styles.consentLabel}>
              <input className={styles.checkbox} name="roastConsent" required type="checkbox" />
              <span>
                Estou ciente de que as informações deste formulário podem ser usadas na
                análise do card, na minha apresentação e, sim, em alguma zoeira honesta na
                transmissão do MMMMA.
              </span>
            </label>

            <TurnstileWidget
              errorMessage={
                state.status === "error" && state.message === "Confirme que você é humano antes de enviar."
                  ? state.message
                  : undefined
              }
              onTokenChange={setTurnstileToken}
              resetSignal={turnstileResetSignal}
            />

            <input
              aria-hidden="true"
              autoComplete="off"
              className="visually-hidden"
              name="website"
              tabIndex={-1}
              type="text"
            />

            <div className={styles.actions}>
              <button
                className={styles.button}
                disabled={state.status === "submitting" || (turnstileEnabled && !turnstileToken)}
                type="submit"
              >
                {state.status === "submitting" ? "Enviando..." : "Enviar inscrição"}
              </button>

              {state.message ? (
                <p
                  aria-live="polite"
                  className={`${styles.status} ${
                    state.status === "error" ? styles.statusError : styles.statusSuccess
                  }`}
                >
                  {state.message}
                </p>
              ) : (
                <p className={styles.finePrint}>
                  Responde tudo com detalhes. Campo genérico ou incompleto joga contra sua inscrição.
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
      <FormConfirmationPopup
        message={confirmationMessage}
        onClose={() => {
          setConfirmationMessage("");
        }}
        open={Boolean(confirmationMessage)}
        title="Inscrição recebida"
      />
    </form>
  );
}
