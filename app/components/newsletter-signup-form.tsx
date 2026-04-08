"use client";

import { type FormEvent, useState } from "react";

import type { PublicMutationResponse } from "@/lib/contracts/newsletter";

type FormState = {
  status: "idle" | "submitting" | "success" | "error";
  message: string;
};

const initialState: FormState = {
  status: "idle",
  message: ""
};

export function NewsletterSignupForm() {
  const [state, setState] = useState<FormState>(initialState);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const email = String(formData.get("email") ?? "");
    const website = String(formData.get("website") ?? "");

    setState({
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
          website
        }),
        cache: "no-store"
      });

      const payload = (await response.json().catch(() => null)) as PublicMutationResponse | null;

      if (!response.ok || !payload?.ok) {
        setState({
          status: "error",
          message: payload?.message ?? "Não foi possível enviar. Tenta novamente."
        });
        return;
      }

      form.reset();
      setState({
        status: "success",
        message: payload.message
      });
    } catch {
      setState({
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
        className="newsletter-form__input"
        id="newsletter-email"
        name="email"
        placeholder="SEUEMAIL@GMAIL.COM"
        type="email"
        autoComplete="email"
        inputMode="email"
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
        disabled={state.status === "submitting"}
        type="submit"
      >
        {state.status === "submitting" ? "Enviando..." : "Inscrever-se"}
      </button>
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
    </form>
  );
}
