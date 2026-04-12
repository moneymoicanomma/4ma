"use client";

import { type FormEvent, useState } from "react";

import { BRAZILIAN_STATES } from "@/lib/contracts/brazilian-states";
import {
  FIGHTER_SPECIALTIES,
  FIGHTER_WEIGHT_CLASSES,
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
const humanConfirmationMessage = "Confirme que você é humano antes de enviar.";

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

const weightClassLabel: Record<(typeof FIGHTER_WEIGHT_CLASSES)[number], string> = {
  "atomo-feminino": "Peso átomo feminino (até 47,6 kg)",
  "palha-feminino": "Peso palha feminino (até 52,2 kg)",
  "mosca-feminino": "Peso mosca feminino (até 56,7 kg)",
  "galo-feminino": "Peso galo feminino (até 61,2 kg)",
  "pena-feminino": "Peso pena feminino (até 65,8 kg)",
  mosca: "Peso mosca (até 56,7 kg)",
  galo: "Peso galo (até 61,2 kg)",
  pena: "Peso pena (até 65,8 kg)",
  leve: "Peso leve (até 70,3 kg)",
  "meio-medio": "Peso meio-médio (até 77,1 kg)",
  medio: "Peso médio (até 83,9 kg)",
  "meio-pesado": "Peso meio-pesado (até 93,0 kg)",
  pesado: "Peso pesado (até 120,2 kg)"
};

export function FighterApplicationForm() {
  const [state, setState] = useState<FormState>(initialState);
  const [selectedSpecialty, setSelectedSpecialty] = useState<FighterSpecialty>(defaultSpecialty);
  const [confirmationMessage, setConfirmationMessage] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileResetSignal, setTurnstileResetSignal] = useState(0);
  const turnstileEnabled = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim());

  function resetTurnstile() {
    if (!turnstileEnabled) {
      return;
    }

    setTurnstileToken("");
    setTurnstileResetSignal((current) => current + 1);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setConfirmationMessage("");

    const form = event.currentTarget;
    const formData = new FormData(form);

    if (turnstileEnabled && !turnstileToken) {
      setState({
        status: "error",
        message: humanConfirmationMessage
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
          state: String(formData.get("state") ?? ""),
          team: String(formData.get("team") ?? ""),
          weightClass: String(formData.get("weightClass") ?? ""),
          tapology: String(formData.get("tapology") ?? ""),
          instagram: String(formData.get("instagram") ?? ""),
          phoneWhatsapp: String(formData.get("phoneWhatsapp") ?? ""),
          bookingContactName: String(formData.get("bookingContactName") ?? ""),
          bookingContactPhoneWhatsapp: String(formData.get("bookingContactPhoneWhatsapp") ?? ""),
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
        const message = payload?.message ?? "Não foi possível enviar agora. Tenta novamente.";

        if (
          response.status === 429 ||
          response.status >= 500 ||
          message === humanConfirmationMessage
        ) {
          resetTurnstile();
        }

        setState({
          status: "error",
          message
        });
        return;
      }

      form.reset();
      resetTurnstile();
      setSelectedSpecialty(defaultSpecialty);
      setState({
        status: "success",
        message: payload.message
      });
      setConfirmationMessage(payload.message);
    } catch {
      resetTurnstile();
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
      noValidate
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
                name="fullName"
                placeholder="Nome e sobrenome"
                type="text"
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Apelido</span>
              <input
                autoComplete="nickname"
                className={styles.input}
                maxLength={160}
                name="nickname"
                placeholder='Ex.: "The Spider"'
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
                type="date"
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Cidade</span>
              <input
                autoComplete="address-level2"
                className={styles.input}
                maxLength={160}
                name="city"
                placeholder="Sua cidade"
                type="text"
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Estado</span>
              <select
                autoComplete="address-level1"
                className={styles.select}
                defaultValue=""
                name="state"
              >
                <option disabled value="">
                  Selecione seu estado
                </option>
                {BRAZILIAN_STATES.map((state) => (
                  <option key={state.code} value={state.name}>
                    {state.name} ({state.code})
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Equipe</span>
              <input
                autoComplete="organization"
                className={styles.input}
                maxLength={160}
                name="team"
                placeholder="Nome da equipe e treinador principal"
                type="text"
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Categoria</span>
              <select className={styles.select} defaultValue="" name="weightClass">
                <option disabled value="">
                  Selecione sua categoria
                </option>
                {FIGHTER_WEIGHT_CLASSES.map((weightClass) => (
                  <option key={weightClass} value={weightClass}>
                    {weightClassLabel[weightClass]}
                  </option>
                ))}
              </select>
              <p className={styles.helper}>
                Escolhe a divisão em que você realmente compete hoje.
              </p>
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Tapology</span>
              <input
                autoComplete="url"
                className={styles.input}
                maxLength={220}
                name="tapology"
                placeholder="Link do perfil no Tapology"
                type="text"
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Instagram</span>
              <input
                autoComplete="off"
                className={styles.input}
                maxLength={220}
                name="instagram"
                placeholder="@seuusuario ou link do perfil"
                type="text"
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Telefone / WhatsApp do atleta</span>
              <input
                autoComplete="tel"
                className={styles.input}
                inputMode="tel"
                maxLength={40}
                name="phoneWhatsapp"
                placeholder="(11) 99999-0000"
                type="tel"
              />
              <p className={styles.helper}>
                Informa o número que a equipe pode usar para falar com você sem intermediário.
              </p>
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Nome do responsável pelo fechamento</span>
              <input
                autoComplete="off"
                className={styles.input}
                maxLength={160}
                name="bookingContactName"
                placeholder="Empresário, treinador ou responsável comercial"
                type="text"
              />
              <p className={styles.helper}>
                Pode ser quem negocia sua luta e responde pela parte comercial.
              </p>
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Telefone / WhatsApp do responsável</span>
              <input
                autoComplete="tel"
                className={styles.input}
                inputMode="tel"
                maxLength={40}
                name="bookingContactPhoneWhatsapp"
                placeholder="(11) 99999-0000"
                type="tel"
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
                  name="specialtyOther"
                  placeholder="Ex.: wrestling, karate, taekwondo, sambo..."
                  type="text"
                />
              </label>
            ) : null}

            <label className={`${styles.field} ${styles.longField}`}>
              <span className={styles.label}>Histórico de competição</span>
              <textarea
                className={styles.textarea}
                name="competitionHistory"
                placeholder="Conta cartel, eventos em que já competiu, adversários relevantes, resultado das lutas e qualquer contexto que ajude a entender sua trajetória."
              />
              <p className={styles.helper}>
                Quanto mais específico, melhor. Esse campo ajuda na avaliação técnica e no matchmaking.
              </p>
            </label>

            <label className={`${styles.field} ${styles.longField}`}>
              <span className={styles.label}>Principais títulos em artes marciais</span>
              <textarea
                className={styles.textarea}
                name="martialArtsTitles"
                placeholder="Lista campeonatos, graduações, cinturões, medalhas ou conquistas relevantes. Se tiver contexto do peso, faixa ou evento, coloca também."
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
              name="curiosities"
              placeholder="Exemplo: hobby, religião se quiser compartilhar, projeto social, curso/faculdade, instrumento, profissão, competições em outras modalidades e qualquer história boa pra apresentar você."
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
              <input className={styles.checkbox} name="roastConsent" type="checkbox" />
              <span>
                Estou ciente de que as informações deste formulário podem ser usadas na
                análise do card, na minha apresentação e, sim, em alguma zoeira honesta na
                transmissão do MMMMA.
              </span>
            </label>

            <TurnstileWidget
              errorMessage={
                state.status === "error" && state.message === humanConfirmationMessage
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
