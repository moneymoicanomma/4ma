"use client";

import { type FormEvent, useState } from "react";

import {
  EVENT_FIGHTER_PHOTO_FIELDS,
  PIX_KEY_TYPES,
  parseEventFighterIntakeFormData,
  type EventFighterIntakeDraftSubmission,
  type EventFighterIntakePublicResponse,
  type EventFighterIntakeUploadedPhoto,
  type EventFighterIntakeUploadInitResponse,
  type HealthInsuranceOption,
  type PixKeyType
} from "@/lib/contracts/event-fighter-intake";

import { FormConfirmationPopup } from "./form-confirmation-popup";
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

const successMessage =
  "Ficha recebida. Se precisarmos complementar algo, a equipe entra em contato.";
const initialHealthInsuranceOption: HealthInsuranceOption = "no";
const initialPixKeyType: PixKeyType = "cpf";

const pixKeyTypeLabels: Record<PixKeyType, string> = {
  cpf: "CPF",
  email: "Email",
  phone: "Telefone",
  random: "Aleatória"
};

function MinimumCharactersHint({ count }: Readonly<{ count: number }>) {
  return <p className={styles.helper}>Mínimo de {count} caracteres.</p>;
}

function arrayBufferToHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function computeSha256Hex(file: File) {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());

  return arrayBufferToHex(digest);
}

async function createUploadTargets(submission: EventFighterIntakeDraftSubmission) {
  if (!submission.photos.length) {
    return [];
  }

  const response = await fetch("/api/event-fighter-intakes/uploads", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      files: submission.photos.map((photo) => ({
        fieldName: photo.fieldName,
        fileName: photo.file.name,
        contentType: photo.file.type || "application/octet-stream",
        byteSize: photo.file.size
      }))
    }),
    cache: "no-store"
  });

  const payload =
    (await response.json().catch(() => null)) as EventFighterIntakeUploadInitResponse | null;

  if (!response.ok || !payload || payload.ok !== true) {
    throw new Error(
      payload && "message" in payload
        ? payload.message
        : "Não foi possível preparar o upload das fotos agora."
    );
  }

  return payload.uploads;
}

async function uploadPhotosToR2(submission: EventFighterIntakeDraftSubmission) {
  if (!submission.photos.length) {
    return [];
  }

  const uploadTargets = await createUploadTargets(submission);
  const uploadTargetByField = new Map(
    uploadTargets.map((target) => [target.fieldName, target] as const)
  );

  return Promise.all(
    submission.photos.map(async (photo) => {
      const target = uploadTargetByField.get(photo.fieldName);

      if (!target) {
        throw new Error(`Não foi possível preparar o upload de ${photo.label}.`);
      }

      const [sha256Hex, uploadResponse] = await Promise.all([
        computeSha256Hex(photo.file),
        fetch(target.uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": target.contentType
          },
          body: photo.file
        })
      ]);

      if (!uploadResponse.ok) {
        throw new Error(`Não foi possível enviar ${photo.label} agora.`);
      }

      return {
        fieldName: photo.fieldName,
        fileName: target.fileName,
        bucket: target.bucket,
        objectKey: target.objectKey,
        contentType: target.contentType,
        byteSize: target.byteSize,
        sha256Hex,
        storageProvider: target.storageProvider
      };
    })
  );
}

export function EventFighterIntakeForm({
  authenticatedEmail
}: Readonly<EventFighterIntakeFormProps>) {
  const [state, setState] = useState<FormState>(initialState);
  const [confirmationMessage, setConfirmationMessage] = useState("");
  const [hasHealthInsurance, setHasHealthInsurance] = useState<HealthInsuranceOption>(
    initialHealthInsuranceOption
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setConfirmationMessage("");

    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set("email", authenticatedEmail);

    setState({
      status: "submitting",
      message: "Validando ficha..."
    });

    try {
      const parsed = parseEventFighterIntakeFormData(formData, authenticatedEmail);

      if (!parsed.ok) {
        setState({
          status: "error",
          message: parsed.message
        });
        return;
      }

      if (parsed.honeypotTriggered || !parsed.data) {
        form.reset();
        setHasHealthInsurance(initialHealthInsuranceOption);
        setState({
          status: "success",
          message: successMessage
        });
        setConfirmationMessage(successMessage);
        return;
      }

      let uploadedPhotos: EventFighterIntakeUploadedPhoto[] = [];

      if (parsed.data.photos.length > 0) {
        setState({
          status: "submitting",
          message: "Enviando fotos para o portal..."
        });

        uploadedPhotos = await uploadPhotosToR2(parsed.data);
      }

      setState({
        status: "submitting",
        message: "Gravando ficha..."
      });

      const response = await fetch("/api/event-fighter-intakes", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          payload: parsed.data.payload,
          photos: uploadedPhotos
        }),
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
      setHasHealthInsurance(initialHealthInsuranceOption);
      setState({
        status: "success",
        message: payload.message
      });
      setConfirmationMessage(payload.message);
    } catch (error) {
      setState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível enviar agora. Tenta novamente."
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
                minLength={5}
                name="fullName"
                placeholder="Nome e sobrenome"
                required
                type="text"
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Nome de luta</span>
              <input
                autoComplete="nickname"
                className={styles.input}
                minLength={2}
                name="nickname"
                placeholder="Nome como você quer ser apresentado"
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
              <span className={styles.label}>Contato do atleta</span>
              <input
                autoComplete="tel"
                className={styles.input}
                inputMode="tel"
                minLength={8}
                name="phoneWhatsapp"
                placeholder="DDD + número"
                required
                type="tel"
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Cidade</span>
              <input
                className={styles.input}
                minLength={2}
                name="city"
                placeholder="Cidade onde você mora"
                required
                type="text"
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Escolaridade</span>
              <input
                className={styles.input}
                minLength={2}
                name="education"
                placeholder="Ex.: ensino médio completo"
                required
                type="text"
              />
            </label>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionKicker}>Perfil oficial</span>
            <h2 className={styles.sectionTitle}>Como você entra no card</h2>
            <p className={styles.sectionCopy}>
              Esses dados ajudam apresentação, produção, redes e alinhamento de equipe.
              Preenche do jeito que a organização precisa enxergar você nesta edição.
            </p>
          </div>

          <div className={styles.grid}>
            <label className={styles.field}>
              <span className={styles.label}>Cartel</span>
              <input
                className={styles.input}
                minLength={3}
                name="record"
                placeholder="Ex.: 5-1 profissional, 8-2 amador"
                required
                type="text"
              />
              <MinimumCharactersHint count={3} />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Categoria</span>
              <input
                className={styles.input}
                minLength={2}
                name="category"
                placeholder="Ex.: peso galo"
                required
                type="text"
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Altura</span>
              <input
                className={styles.input}
                minLength={2}
                name="height"
                placeholder="Ex.: 1,78 m"
                required
                type="text"
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Envergadura</span>
              <input
                className={styles.input}
                minLength={2}
                name="reach"
                placeholder="Ex.: 1,84 m"
                required
                type="text"
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Equipe</span>
              <input
                className={styles.input}
                minLength={2}
                name="team"
                placeholder="Nome da equipe"
                required
                type="text"
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Especialidade principal</span>
              <input
                className={styles.input}
                minLength={2}
                name="primarySpecialty"
                placeholder="Ex.: Wrestling, Muay Thai, Jiu-jitsu"
                required
                type="text"
              />
              <MinimumCharactersHint count={2} />
            </label>

            <label className={`${styles.field} ${styles.fullWidth}`}>
              <span className={styles.label}>Graduações na luta</span>
              <textarea
                className={styles.textarea}
                minLength={2}
                name="fightGraduations"
                placeholder="Ex.: faixa preta de jiu-jitsu, luva preta de muay thai, graduação de judô."
                required
              />
              <MinimumCharactersHint count={2} />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Link Tapology</span>
              <input
                className={styles.input}
                minLength={6}
                name="tapologyLink"
                placeholder="Cole o link do perfil"
                required
                type="text"
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Link Instagram</span>
              <input
                className={styles.input}
                minLength={6}
                name="instagramLink"
                placeholder="Cole o link do perfil"
                required
                type="text"
              />
            </label>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionKicker}>Operação do evento</span>
            <h2 className={styles.sectionTitle}>Corners e contatos da equipe</h2>
            <p className={styles.sectionCopy}>
              Esse bloco ajuda logística, credenciamento e contato rápido com quem cuida da
              sua operação fora da luta.
            </p>
          </div>

          <div className={styles.grid}>
            <label className={styles.field}>
              <span className={styles.label}>Contato do treinador</span>
              <input
                className={styles.input}
                inputMode="tel"
                minLength={8}
                name="coachContact"
                placeholder="Telefone ou Whatsapp"
                required
                type="text"
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Contato do empresário</span>
              <input
                className={styles.input}
                inputMode="tel"
                minLength={8}
                name="managerContact"
                placeholder="Se for diferente do treinador"
                type="text"
              />
              <p className={styles.helper}>Opcional se o contato do treinador já resolver.</p>
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Corner 1</span>
              <input
                className={styles.input}
                minLength={2}
                name="cornerOne"
                placeholder="Nome do primeiro corner"
                required
                type="text"
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Corner 2</span>
              <input
                className={styles.input}
                minLength={2}
                name="cornerTwo"
                placeholder="Nome do segundo corner"
                type="text"
              />
              <p className={styles.helper}>
                Para atletas fora de São Paulo, o evento arcará com viagem e hospedagem
                somente para um corner.
              </p>
            </label>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionKicker}>Financeiro e saúde</span>
            <h2 className={styles.sectionTitle}>Dados de pagamento e cobertura</h2>
            <p className={styles.sectionCopy}>
              Aqui é onde a equipe resolve o operacional. Chave Pix certa e plano de saúde
              bem informado evitam retrabalho depois. Quando um campo pedir detalhe,
              respeite o mínimo de caracteres para a ficha passar.
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
                minLength={2}
                name="healthInsuranceProvider"
                placeholder={hasHealthInsurance === "yes" ? "Nome do plano" : "Preencha apenas se tiver plano"}
                required={hasHealthInsurance === "yes"}
                type="text"
              />
              {hasHealthInsurance === "yes" ? <MinimumCharactersHint count={2} /> : null}
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
            <label className={`${styles.field} ${styles.fullWidth}`}>
              <span className={styles.label}>Outras especialidades</span>
              <textarea
                className={styles.textarea}
                minLength={2}
                name="additionalSpecialties"
                placeholder="Conte o que também entra no seu jogo e como isso aparece na luta."
                required
              />
              <MinimumCharactersHint count={2} />
            </label>

            <label className={`${styles.field} ${styles.fullWidth}`}>
              <span className={styles.label}>Histórico de competição</span>
              <textarea
                className={styles.textarea}
                minLength={40}
                name="competitionHistory"
                placeholder="Detalhe eventos, adversários, datas, resultados, experiências no amador/profissional e qualquer contexto importante."
                required
              />
              <MinimumCharactersHint count={40} />
            </label>

            <label className={`${styles.field} ${styles.fullWidth}`}>
              <span className={styles.label}>Títulos conquistados</span>
              <textarea
                className={styles.textarea}
                minLength={20}
                name="titlesWon"
                placeholder="Liste cinturões, torneios, medalhas e onde foram conquistados."
                required
              />
              <MinimumCharactersHint count={20} />
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
                minLength={60}
                name="lifeStory"
                placeholder="Conte de onde você veio, o que te trouxe para a luta, desafios vencidos e o que move sua carreira."
                required
              />
              <MinimumCharactersHint count={60} />
            </label>

            <label className={`${styles.field} ${styles.longField}`}>
              <span className={styles.label}>Alguma história engraçada</span>
              <textarea
                className={styles.textarea}
                minLength={20}
                name="funnyStory"
                placeholder="Bastidor, treino, viagem, corte de peso, algo inusitado que ajude a contar quem você é."
                required
              />
              <MinimumCharactersHint count={20} />
            </label>

            <label className={`${styles.field} ${styles.longField}`}>
              <span className={styles.label}>Curiosidades e etc.</span>
              <textarea
                className={styles.textarea}
                minLength={20}
                name="curiosities"
                placeholder="Manias, rotina, detalhes fora do comum, qualquer ponto que renda boa apresentação."
                required
              />
              <MinimumCharactersHint count={20} />
            </label>

            <label className={`${styles.field} ${styles.longField}`}>
              <span className={styles.label}>Hobbies</span>
              <textarea
                className={styles.textarea}
                minLength={2}
                name="hobbies"
                placeholder="O que você curte fazer fora da luta?"
                required
              />
              <MinimumCharactersHint count={2} />
            </label>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionKicker}>Fotos</span>
            <h2 className={styles.sectionTitle}>Material visual do atleta</h2>
            <p className={styles.sectionCopy}>
              Envie fotos com boa iluminação e boa qualidade. Se possível, fundo limpo e
              enquadramento sem corte para facilitar uso em card, thumb e transmissão. Se
              não tiver tudo agora, pode enviar a ficha e complementar as fotos depois.
            </p>
          </div>

          <div className={styles.photoGrid}>
            {EVENT_FIGHTER_PHOTO_FIELDS.map((photoField) => (
              <label className={styles.photoCard} key={photoField.fieldName}>
                <span className={styles.photoTitle}>{photoField.label}</span>
                <span className={styles.photoNote}>{photoField.note}</span>
                <span className={styles.photoNote}>
                  Opcional. JPEG, PNG, WEBP ou HEIC, até 10 MB.
                </span>
                <input
                  accept="image/*,.heic,.heif"
                  className={styles.fileInput}
                  name={photoField.fieldName}
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
      <FormConfirmationPopup
        message={confirmationMessage}
        onClose={() => {
          setConfirmationMessage("");
        }}
        open={Boolean(confirmationMessage)}
        title="Ficha enviada"
      />
    </form>
  );
}
