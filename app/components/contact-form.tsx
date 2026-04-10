"use client";

import { type FormEvent, useState } from "react";

import type { ContactMessagePublicResponse } from "@/lib/contracts/contact-message";

import { FormConfirmationPopup } from "./form-confirmation-popup";
import styles from "./public-lead-form.module.css";
import { TurnstileWidget } from "./turnstile-widget";

type FormState = {
  status: "idle" | "submitting" | "success" | "error";
  message: string;
};

const initialState: FormState = {
  status: "idle",
  message: ""
};

export function ContactForm() {
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
        message: "Confirme que você é humano antes de enviar."
      });
      return;
    }

    setState({
      status: "submitting",
      message: "Enviando mensagem..."
    });

    try {
      const response = await fetch("/api/contact-messages", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          fullName: String(formData.get("fullName") ?? ""),
          email: String(formData.get("email") ?? ""),
          subject: String(formData.get("subject") ?? ""),
          message: String(formData.get("message") ?? ""),
          website: String(formData.get("website") ?? ""),
          turnstileToken
        }),
        cache: "no-store"
      });

      const payload = (await response.json().catch(() => null)) as ContactMessagePublicResponse | null;

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
      <div className={styles.grid}>
        <label className={styles.field}>
          <span className={styles.label}>Nome</span>
          <input
            autoComplete="name"
            className={styles.input}
            maxLength={160}
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
            placeholder="voce@email.com"
            required
            type="email"
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Assunto</span>
          <input
            className={styles.input}
            maxLength={160}
            minLength={3}
            name="subject"
            placeholder="Sobre o que você quer falar"
            required
            type="text"
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Mensagem</span>
          <textarea
            className={styles.textarea}
            name="message"
            placeholder="Escreve aqui a mensagem completa para a equipe."
            required
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
          {state.status === "submitting" ? "Enviando..." : "Enviar mensagem"}
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
            A mensagem vai para o canal geral da equipe em contato@moneymoicanomma.com.br.
          </p>
        )}
      </div>

      <FormConfirmationPopup
        message={confirmationMessage}
        onClose={() => {
          setConfirmationMessage("");
        }}
        open={Boolean(confirmationMessage)}
        title="Mensagem enviada"
      />
    </form>
  );
}
