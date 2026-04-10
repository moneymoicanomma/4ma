"use client";

import { type FormEvent, useState } from "react";

import {
  isValidNewsletterEmail,
  normalizeNewsletterEmail
} from "@/lib/contracts/newsletter";
import type { PublicMutationResponse } from "@/lib/contracts/public-mutation";

import { FormConfirmationPopup } from "./form-confirmation-popup";
import { TurnstileWidget } from "./turnstile-widget";

type FormState = {
  invalidEmail: boolean;
  status: "idle" | "submitting" | "success" | "error";
  message: string;
};

const initialState: FormState = {
  invalidEmail: false,
  status: "idle",
  message: ""
};

export function NewsletterSignupForm() {
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
    const email = normalizeNewsletterEmail(formData.get("email"));
    const website = String(formData.get("website") ?? "");

    if (turnstileEnabled && !turnstileToken) {
      setState({
        invalidEmail: false,
        status: "error",
        message: "Confirme que você é humano antes de enviar."
      });
      return;
    }

    if (!isValidNewsletterEmail(email)) {
      setState({
        invalidEmail: true,
        status: "error",
        message: "Informe um e-mail válido."
      });
      return;
    }

    setState({
      invalidEmail: false,
      status: "submitting",
      message: "Enviando..."
    });

    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email,
          website,
          turnstileToken
        }),
        cache: "no-store"
      });

      const payload = (await response.json().catch(() => null)) as PublicMutationResponse | null;

      if (!response.ok || !payload?.ok) {
        setState({
          invalidEmail: false,
          status: "error",
          message: payload?.message ?? "Não foi possível enviar. Tenta novamente."
        });
        return;
      }

      form.reset();
      setTurnstileToken("");
      setTurnstileResetSignal((current) => current + 1);
      setState({
        invalidEmail: false,
        status: "success",
        message: payload.message
      });
      setConfirmationMessage(payload.message);
    } catch {
      setState({
        invalidEmail: false,
        status: "error",
        message: "Não foi possível enviar. Tenta novamente."
      });
    }
  }

  return (
    <form className="newsletter-form" noValidate onSubmit={handleSubmit}>
      <label className="visually-hidden" htmlFor="newsletter-email">
        Seu e-mail
      </label>
      <input
        aria-invalid={state.invalidEmail || undefined}
        className="newsletter-form__input"
        id="newsletter-email"
        name="email"
        placeholder="SEUEMAIL@GMAIL.COM"
        type="email"
        autoComplete="email"
        inputMode="email"
        onInput={() => {
          if (confirmationMessage) {
            setConfirmationMessage("");
          }

          setState((current) => (current.status === "idle" ? current : initialState));
        }}
        required
      />
      <input
        aria-hidden="true"
        autoComplete="off"
        className="visually-hidden"
        name="website"
        tabIndex={-1}
        type="text"
      />
      <button
        className="newsletter-form__button"
        disabled={state.status === "submitting" || (turnstileEnabled && !turnstileToken)}
        type="submit"
      >
        {state.status === "submitting" ? "Enviando..." : "Inscrever-se"}
      </button>
      <TurnstileWidget
        errorMessage={
          state.status === "error" && state.message === "Confirme que você é humano antes de enviar."
            ? state.message
            : undefined
        }
        onTokenChange={setTurnstileToken}
        resetSignal={turnstileResetSignal}
      />
      {state.message ? (
        <p
          aria-live="polite"
          className={
            state.status === "error"
              ? "newsletter-form__status is-error"
              : "newsletter-form__status is-success"
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
        title="Inscrição confirmada"
      />
    </form>
  );
}
