"use client";

import { type FormEvent, useState } from "react";

import type { PressCredentialPublicResponse } from "@/lib/contracts/press-credential";

import { FormConfirmationPopup } from "./form-confirmation-popup";
import styles from "./public-lead-form.module.css";
import { TurnstileWidget } from "./turnstile-widget";

type FormState = {
  status: "idle" | "submitting" | "success" | "error";
  message: string;
};

const initialState: FormState = {
  status: "idle",
  message: "",
};

export function PressCredentialForm() {
  const [state, setState] = useState<FormState>(initialState);
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
        message: "Confirme que você é humano antes de enviar.",
      });
      return;
    }

    setState({
      status: "submitting",
      message: "Enviando credenciamento...",
    });

    try {
      const response = await fetch("/api/press-credentials", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: String(formData.get("fullName") ?? ""),
          email: String(formData.get("email") ?? ""),
          mediaOutlet: String(formData.get("mediaOutlet") ?? ""),
          documentNumber: String(formData.get("documentNumber") ?? ""),
          coverageType: String(formData.get("coverageType") ?? ""),
          coverageNeeds: String(formData.get("coverageNeeds") ?? ""),
          website: String(formData.get("website") ?? ""),
          turnstileToken,
        }),
        cache: "no-store",
      });

      const payload =
        (await response.json().catch(() => null)) as PressCredentialPublicResponse | null;

      if (!response.ok || !payload?.ok) {
        setState({
          status: "error",
          message: payload?.message ?? "Não foi possível enviar agora. Tenta novamente.",
        });
        return;
      }

      form.reset();
      setTurnstileToken("");
      setTurnstileResetSignal((current) => current + 1);
      setState({
        status: "success",
        message: payload.message,
      });
      setConfirmationMessage(payload.message);
    } catch {
      setState({
        status: "error",
        message: "Não foi possível enviar agora. Tenta novamente.",
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
      <div className={styles.grid}>
        <label className={styles.field}>
          <span className={styles.label}>Nome completo</span>
          <input
            autoComplete="name"
            className={styles.input}
            maxLength={180}
            minLength={3}
            name="fullName"
            placeholder="Seu nome completo"
            required
            type="text"
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>E-mail</span>
          <input
            autoComplete="email"
            className={styles.input}
            maxLength={160}
            name="email"
            placeholder="voce@redacao.com"
            required
            type="email"
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Veículo de mídia e links</span>
          <textarea
            className={styles.textarea}
            maxLength={640}
            minLength={3}
            name="mediaOutlet"
            placeholder="Nome do veículo, perfil, site, canal ou links de referência."
            required
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Número do documento</span>
          <input
            autoComplete="off"
            className={styles.input}
            maxLength={180}
            minLength={3}
            name="documentNumber"
            placeholder="RG, CPF, passaporte ou documento profissional"
            required
            type="text"
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Tipo de cobertura</span>
          <select className={styles.select} defaultValue="" name="coverageType" required>
            <option disabled value="">
              Selecione uma opção
            </option>
            <option value="Foto">Foto</option>
            <option value="Video">Vídeo</option>
            <option value="Texto">Texto</option>
            <option value="Redes sociais">Redes sociais</option>
            <option value="Podcast ou entrevista">Podcast ou entrevista</option>
            <option value="Cobertura mista">Cobertura mista</option>
          </select>
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Necessidades para cobertura</span>
          <textarea
            className={styles.textarea}
            maxLength={1600}
            name="coverageNeeds"
            placeholder="Opcional: equipe, equipamentos, horários, acessos ou qualquer necessidade operacional."
          />
        </label>
      </div>

      <input
        aria-hidden="true"
        autoComplete="off"
        className="visually-hidden"
        name="website"
        tabIndex={-1}
        type="text"
      />

      <div className={styles.actions}>
        <TurnstileWidget
          errorMessage={
            state.status === "error" && state.message === "Confirme que você é humano antes de enviar."
              ? state.message
              : undefined
          }
          onTokenChange={setTurnstileToken}
          resetSignal={turnstileResetSignal}
        />

        <button
          className={styles.button}
          disabled={state.status === "submitting" || (turnstileEnabled && !turnstileToken)}
          type="submit"
        >
          {state.status === "submitting" ? "Enviando..." : "Enviar cadastro"}
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
            O envio não garante credencial. A equipe revisa as informações e responde por e-mail.
          </p>
        )}
      </div>

      <FormConfirmationPopup
        message={confirmationMessage}
        onClose={() => {
          setConfirmationMessage("");
        }}
        open={Boolean(confirmationMessage)}
        title="Cadastro recebido"
      />
    </form>
  );
}
