"use client";

import { startTransition, type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

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

export function EventFighterAccessForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<LoginState>(initialState);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

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

      startTransition(() => {
        router.replace(payload.redirectTo ?? "/atletas-da-edicao");
        router.refresh();
      });
    } catch {
      setState({
        status: "error",
        message: "Não foi possível autenticar agora."
      });
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <span className={styles.kicker}>Acesso restrito</span>
          <h2>Entrar na ficha do atleta</h2>
          <p>
            Use o email combinado com a equipe e a senha padrão enviada no briefing
            desta edição.
          </p>
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
