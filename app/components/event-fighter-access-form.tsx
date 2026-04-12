"use client";

import { type FormEvent, useState } from "react";

import type { EventFighterSessionResponse } from "@/lib/contracts/event-fighter-session";

import styles from "./event-fighter-access-form.module.css";

type LoginState = {
  status: "idle" | "submitting" | "error";
  message: string;
};

const initialState: LoginState = {
  status: "idle",
  message: ""
};

const LOGIN_TIMEOUT_MS = 12000;

export function EventFighterAccessForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<LoginState>(initialState);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), LOGIN_TIMEOUT_MS);

    setState({
      status: "submitting",
      message: "Validando acesso..."
    });

    try {
      const response = await fetch("/api/event-fighter-access/session", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        signal: controller.signal,
        body: JSON.stringify({
          email,
          password
        }),
        cache: "no-store"
      });

      const payload = (await response.json().catch(() => null)) as EventFighterSessionResponse | null;

      if (!response.ok || !payload?.ok) {
        setState({
          status: "error",
          message: payload?.message ?? "Não foi possível autenticar agora."
        });
        return;
      }

      const redirectUrl = new URL(payload.redirectTo ?? "/atletas-da-edicao", window.location.origin);
      redirectUrl.hash = "formulario";

      // Switching only the hash on the same URL does not re-render the server page
      // with the newly issued cookie. Force a real navigation when we stay on the
      // athlete portal route so the form opens immediately after login.
      if (
        redirectUrl.pathname === window.location.pathname &&
        redirectUrl.search === window.location.search
      ) {
        redirectUrl.searchParams.set("portal", "1");
      }

      window.location.assign(redirectUrl.toString());
    } catch (error) {
      setState({
        status: "error",
        message:
          error instanceof DOMException && error.name === "AbortError"
            ? "O acesso demorou demais para responder. Tenta de novo em alguns segundos."
            : "Não foi possível autenticar agora."
      });
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <span className={styles.kicker}>Acesso restrito</span>
          <h2>Entrar na ficha do atleta</h2>
          <p>
            Use o email pessoal do atleta e a senha compartilhada enviada pela equipe.
            Não precisa de pré-cadastro para liberar a ficha.
          </p>
        </div>

        <div className={styles.infoStrip}>
          <div className={styles.infoItem}>
            <strong>1</strong>
            <span>Valida o acesso</span>
          </div>
          <div className={styles.infoItem}>
            <strong>2</strong>
            <span>Abre direto na ficha</span>
          </div>
          <div className={styles.infoItem}>
            <strong>3</strong>
            <span>Envia tudo de uma vez</span>
          </div>
        </div>

        <div className={styles.fieldGrid}>
          <label className={styles.field}>
            <span>Email</span>
            <input
              autoComplete="email"
              disabled={state.status === "submitting"}
              inputMode="email"
              name="email"
              placeholder="voce@exemplo.com"
              required
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.currentTarget.value);
                if (state.status !== "idle") {
                  setState(initialState);
                }
              }}
            />
          </label>

          <label className={styles.field}>
            <span>Senha</span>
            <input
              autoComplete="current-password"
              disabled={state.status === "submitting"}
              name="password"
              placeholder="Sua senha de acesso"
              required
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.currentTarget.value);
                if (state.status !== "idle") {
                  setState(initialState);
                }
              }}
            />
          </label>
        </div>

        <button
          className={styles.submitButton}
          disabled={state.status === "submitting"}
          type="submit"
        >
          {state.status === "submitting" ? "Validando..." : "Liberar formulário"}
        </button>

        {state.message ? (
          <p
            aria-live="polite"
            className={state.status === "error" ? `${styles.feedback} ${styles.feedbackError}` : styles.feedback}
          >
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
