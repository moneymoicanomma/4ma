"use client";

import { startTransition, type FormEvent, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import type { AdminSessionResponse } from "@/lib/contracts/admin-session";

import styles from "./admin-login-form.module.css";

type AdminLoginFormProps = {
  authConfigured: boolean;
};

type LoginState = {
  status: "idle" | "submitting" | "error";
  message: string;
};

const initialState: LoginState = {
  status: "idle",
  message: ""
};

export function AdminLoginForm({ authConfigured }: Readonly<AdminLoginFormProps>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<LoginState>(initialState);

  const helperMessage = useMemo(() => {
    const reason = searchParams.get("reason");

    if (!authConfigured || reason === "setup") {
      return "Configure ADMIN_USERNAME, ADMIN_PASSWORD e ADMIN_SESSION_SECRET para liberar o login do admin.";
    }

    if (searchParams.get("next")) {
      return "Sua sessão expirou ou ainda não existe. Faça login para voltar ao painel.";
    }

    return "Entre com as credenciais do admin para acessar o painel do fantasy.";
  }, [authConfigured, searchParams]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!authConfigured) {
      setState({
        status: "error",
        message: "A autenticação do admin ainda não foi configurada neste ambiente."
      });
      return;
    }

    setState({
      status: "submitting",
      message: "Validando acesso..."
    });

    try {
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username,
          password,
          next: searchParams.get("next")
        }),
        cache: "no-store"
      });

      const payload = (await response.json().catch(() => null)) as AdminSessionResponse | null;

      if (!response.ok || !payload?.ok) {
        setState({
          status: "error",
          message: payload?.message ?? "Não foi possível autenticar agora."
        });
        return;
      }

      startTransition(() => {
        router.replace(payload.redirectTo ?? "/admin/fantasy");
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
          <span className={styles.kicker}>Credenciais</span>
          <h2>Entrar no painel</h2>
          <p>{helperMessage}</p>
        </div>

        <div className={styles.fieldGrid}>
          <label className={styles.field}>
            <span>Usuário ou email</span>
            <input
              autoComplete="username"
              disabled={!authConfigured || state.status === "submitting"}
              name="username"
              placeholder="admin ou admin@empresa.com"
              required
              type="text"
              value={username}
              onChange={(event) => {
                setUsername(event.currentTarget.value);
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
              disabled={!authConfigured || state.status === "submitting"}
              name="password"
              placeholder="Sua senha"
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
          disabled={!authConfigured || state.status === "submitting"}
          type="submit"
        >
          {state.status === "submitting" ? "Entrando..." : "Acessar admin"}
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
