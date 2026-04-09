"use client";

import { type FormEvent, useState } from "react";

import {
  EVENT_FIGHTER_PHOTO_FIELDS,
  PIX_KEY_TYPES,
  type EventFighterIntakePublicResponse,
  type HealthInsuranceOption,
  type PixKeyType
} from "@/lib/contracts/event-fighter-intake";

import styles from "./event-fighter-intake-form.module.css";

type EventFighterIntakeFormProps = {
  authenticatedEmail: string;
};

type FormState = {
  status: "idle" | "submitting" | "success" | "error";
  message: string;
};

const initialState: FormState = {
  status: "idle",
  message: ""
};

const initialHealthInsuranceOption: HealthInsuranceOption = "no";
const initialPixKeyType: PixKeyType = "cpf";

const pixKeyTypeLabels: Record<PixKeyType, string> = {
  cpf: "CPF",
  email: "Email",
  phone: "Telefone",
  random: "Aleatória"
};

export function EventFighterIntakeForm({
  authenticatedEmail
}: Readonly<EventFighterIntakeFormProps>) {
  const [state, setState] = useState<FormState>(initialState);
  const [hasHealthInsurance, setHasHealthInsurance] = useState<HealthInsuranceOption>(
    initialHealthInsuranceOption
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set("email", authenticatedEmail);

    setState({
      status: "submitting",
      message: "Enviando ficha..."
    });

    try {
      const response = await fetch("/api/event-fighter-intakes", {
        method: "POST",
        headers: {
          Accept: "application/json"
        },
        body: formData,
        cache: "no-store"
      });

      const payload =
        (await response.json().catch(() => null)) as EventFighterIntakePublicResponse | null;

      if (!response.ok || !payload?.ok) {
        setState({
          status: "error",
          message: payload?.message ?? "Não foi possível enviar agora. Tenta novamente."
        });
        return;
      }

      form.reset();
      formData.set("email", authenticatedEmail);
      setHasHealthInsurance(initialHealthInsuranceOption);
      setState({
        status: "success",
        message: payload.message
      });
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
        setState((current) => (current.status === "idle" ? current : initialState));
      }}
      onSubmit={handleSubmit}
    >
      <div className={styles.shell}>
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionKicker}>Dados pessoais</span>
            <h2 className={styles.sectionTitle}>Quem você é nesta edição</h2>
            <p className={styles.sectionCopy}>
              Essa ficha serve para operação, narrativa do evento e organização de
              pagamento e contato. Preenche tudo com calma e sem resumir demais.
            </p>
          </div>

          <div className={styles.grid}>
            <label className={styles.field}>
              <span className={styles.label}>Nome completo</span>
              <input
                autoComplete="name"
                className={styles.input}
                maxLength={180}
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
                maxLength={180}
                minLength={2}
                name="nickname"
                placeholder='Ex.: "The Problem"'
                required
                type="text"
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>CPF</span>
              <input
                autoComplete="off"
                className={styles.input}
                inputMode="numeric"
                maxLength={18}
                name="cpf"
                placeholder="000.000.000-00"
                required
                type="text"
              />
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
              <span className={styles.label}>Email</span>
              <input
                autoComplete="email"
                className={styles.input}
                defaultValue={authenticatedEmail}
                name="email"
                readOnly
                type="email"
              />
              <p className={styles.helper}>
                Esse é o email pessoal usado no acesso, para manter a ficha consistente.
              </p>
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Telefone / Whatsapp</span>
              <input
                autoComplete="tel"
                className={styles.input}
                inputMode="tel"
                maxLength={180}
                minLength={8}
                name="phoneWhatsapp"
                placeholder="DDD + número"
                required
                type="tel"
              />
            </label>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionKicker}>Financeiro e saúde</span>
            <h2 className={styles.sectionTitle}>Dados de pagamento e cobertura</h2>
            <p className={styles.sectionCopy}>
              Aqui é onde a equipe resolve o operacional. Chave Pix certa e plano de saúde
              bem informado evitam retrabalho depois.
            </p>
          </div>

          <div className={styles.grid}>
            <label className={styles.field}>
              <span className={styles.label}>Tipo de chave Pix</span>
              <select
                className={styles.select}
                defaultValue={initialPixKeyType}
                name="pixKeyType"
                required
              >
                {PIX_KEY_TYPES.map((pixKeyType) => (
                  <option key={pixKeyType} value={pixKeyType}>
                    {pixKeyTypeLabels[pixKeyType]}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Chave Pix</span>
              <input
                autoComplete="off"
                className={styles.input}
                maxLength={320}
                minLength={3}
                name="pixKey"
                placeholder="Digite exatamente como recebe"
                required
                type="text"
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Possui plano de saúde?</span>
              <select
                className={styles.select}
                defaultValue={initialHealthInsuranceOption}
                name="hasHealthInsurance"
                required
                onChange={(event) => {
                  const nextValue = event.currentTarget.value as HealthInsuranceOption;
                  setHasHealthInsurance(nextValue);
                }}
              >
                <option value="no">Não</option>
                <option value="yes">Sim</option>
              </select>
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Qual plano?</span>
              <input
                className={styles.input}
                disabled={hasHealthInsurance !== "yes"}
                maxLength={180}
                minLength={2}
                name="healthInsuranceProvider"
                placeholder={hasHealthInsurance === "yes" ? "Nome do plano" : "Preencha apenas se tiver plano"}
                required={hasHealthInsurance === "yes"}
                type="text"
              />
            </label>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionKicker}>Perfil competitivo</span>
            <h2 className={styles.sectionTitle}>Como você luta e o que já fez</h2>
            <p className={styles.sectionCopy}>
              Esse bloco ajuda no matchmaking, no posicionamento da luta no card e no material
              que pode entrar em chamada, transmissão e redes.
            </p>
          </div>

          <div className={styles.grid}>
            <label className={styles.field}>
              <span className={styles.label}>Cartel</span>
              <input
                className={styles.input}
                maxLength={320}
                minLength={3}
                name="record"
                placeholder="Ex.: 5-1 profissional, 8-2 amador"
                required
                type="text"
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Especialidade principal</span>
              <input
                className={styles.input}
                maxLength={180}
                minLength={2}
                name="primarySpecialty"
                placeholder="Ex.: Wrestling, Muay Thai, Jiu-jitsu"
                required
                type="text"
              />
            </label>

            <label className={`${styles.field} ${styles.fullWidth}`}>
              <span className={styles.label}>Outras especialidades</span>
              <textarea
                className={styles.textarea}
                maxLength={5000}
                minLength={2}
                name="additionalSpecialties"
                placeholder="Conte o que também entra no seu jogo e como isso aparece na luta."
                required
              />
            </label>

            <label className={`${styles.field} ${styles.fullWidth}`}>
              <span className={styles.label}>Histórico de competição</span>
              <textarea
                className={styles.textarea}
                maxLength={5000}
                minLength={40}
                name="competitionHistory"
                placeholder="Detalhe eventos, adversários, datas, resultados, experiências no amador/profissional e qualquer contexto importante."
                required
              />
            </label>

            <label className={`${styles.field} ${styles.fullWidth}`}>
              <span className={styles.label}>Títulos conquistados</span>
              <textarea
                className={styles.textarea}
                maxLength={5000}
                minLength={20}
                name="titlesWon"
                placeholder="Liste cinturões, torneios, medalhas e onde foram conquistados."
                required
              />
            </label>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionKicker}>História e conteúdo</span>
            <h2 className={styles.sectionTitle}>O que faz sua luta ter narrativa</h2>
            <p className={styles.sectionCopy}>
              Aqui vale personalidade. A ideia é captar história, carisma e detalhes que
              ajudem a apresentar você melhor para a audiência.
            </p>
          </div>

          <div className={styles.longFields}>
            <label className={`${styles.field} ${styles.longField}`}>
              <span className={styles.label}>História de vida</span>
              <textarea
                className={styles.textarea}
                maxLength={5000}
                minLength={60}
                name="lifeStory"
                placeholder="Conte de onde você veio, o que te trouxe para a luta, desafios vencidos e o que move sua carreira."
                required
              />
            </label>

            <label className={`${styles.field} ${styles.longField}`}>
              <span className={styles.label}>Alguma história engraçada</span>
              <textarea
                className={styles.textarea}
                maxLength={5000}
                minLength={20}
                name="funnyStory"
                placeholder="Bastidor, treino, viagem, corte de peso, algo inusitado que ajude a contar quem você é."
                required
              />
            </label>

            <label className={`${styles.field} ${styles.longField}`}>
              <span className={styles.label}>Curiosidades e etc.</span>
              <textarea
                className={styles.textarea}
                maxLength={5000}
                minLength={20}
                name="curiosities"
                placeholder="Manias, rotina, detalhes fora do comum, qualquer ponto que renda boa apresentação."
                required
              />
            </label>

            <label className={`${styles.field} ${styles.longField}`}>
              <span className={styles.label}>Hobbies</span>
              <textarea
                className={styles.textarea}
                maxLength={1200}
                minLength={2}
                name="hobbies"
                placeholder="O que você curte fazer fora da luta?"
                required
              />
            </label>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionKicker}>Fotos</span>
            <h2 className={styles.sectionTitle}>Material visual do atleta</h2>
            <p className={styles.sectionCopy}>
              Envie fotos com boa iluminação e boa qualidade. Se possível, fundo limpo e
              enquadramento sem corte para facilitar uso em card, thumb e transmissão.
            </p>
          </div>

          <div className={styles.photoGrid}>
            {EVENT_FIGHTER_PHOTO_FIELDS.map((photoField) => (
              <label className={styles.photoCard} key={photoField.fieldName}>
                <span className={styles.photoTitle}>{photoField.label}</span>
                <span className={styles.photoNote}>JPEG, PNG, WEBP ou HEIC, até 10 MB.</span>
                <input
                  accept="image/*,.heic,.heif"
                  className={styles.fileInput}
                  name={photoField.fieldName}
                  required
                  type="file"
                />
              </label>
            ))}
          </div>
        </section>

        <div className={styles.honeypot} aria-hidden="true">
          <label>
            Site
            <input autoComplete="off" name="website" tabIndex={-1} type="text" />
          </label>
        </div>

        <div className={styles.submitRow}>
          <button
            className={styles.submitButton}
            disabled={state.status === "submitting"}
            type="submit"
          >
            {state.status === "submitting" ? "Enviando ficha..." : "Enviar ficha do atleta"}
          </button>

          <p className={styles.submitHint}>
            Se a sessão expirar, entre novamente com o mesmo email antes de reenviar.
          </p>
        </div>
      </div>

      {state.message ? (
        <p
          aria-live="polite"
          className={
            state.status === "error"
              ? `${styles.feedback} ${styles.feedbackError}`
              : `${styles.feedback} ${styles.feedbackSuccess}`
          }
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
