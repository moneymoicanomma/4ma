"use client";

import { type FormEvent, useState } from "react";

import type { PartnerInquiryPublicResponse } from "@/lib/contracts/partner-inquiry";

import styles from "./partner-inquiry-form.module.css";

type FormState = {
  status: "idle" | "submitting" | "success" | "error";
  message: string;
};

const initialState: FormState = {
  status: "idle",
  message: ""
};

export function PartnerInquiryForm() {
  const [state, setState] = useState<FormState>(initialState);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

    setState({
      status: "submitting",
      message: "Enviando contato..."
    });

    try {
      const response = await fetch("/api/partner-inquiries", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          fullName: String(formData.get("fullName") ?? ""),
          companyName: String(formData.get("companyName") ?? ""),
          role: String(formData.get("role") ?? ""),
          email: String(formData.get("email") ?? ""),
          phone: String(formData.get("phone") ?? ""),
          companyProfile: String(formData.get("companyProfile") ?? ""),
          partnershipIntent: String(formData.get("partnershipIntent") ?? ""),
          website: String(formData.get("website") ?? "")
        }),
        cache: "no-store"
      });

      const payload = (await response.json().catch(() => null)) as PartnerInquiryPublicResponse | null;

      if (!response.ok || !payload?.ok) {
        setState({
          status: "error",
          message: payload?.message ?? "Não foi possível enviar agora. Tenta novamente."
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
            <span className={styles.sectionKicker}>Contato comercial</span>
            <h2 className={styles.sectionTitle}>Quem está puxando essa conversa</h2>
            <p className={styles.sectionCopy}>
              Preencha do jeito que a equipe consegue identificar rápido a empresa e falar
              com a pessoa certa.
            </p>
          </div>

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
              <span className={styles.label}>Empresa</span>
              <input
                autoComplete="organization"
                className={styles.input}
                maxLength={160}
                minLength={2}
                name="companyName"
                placeholder="Nome da empresa ou marca"
                required
                type="text"
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Cargo</span>
              <input
                autoComplete="organization-title"
                className={styles.input}
                maxLength={160}
                minLength={2}
                name="role"
                placeholder="Ex.: marketing, direção, comercial"
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
                placeholder="voce@empresa.com"
                required
                type="email"
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Telefone / WhatsApp</span>
              <input
                autoComplete="tel"
                className={styles.input}
                inputMode="tel"
                maxLength={40}
                minLength={10}
                name="phone"
                placeholder="(11) 99999-9999"
                required
                type="tel"
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Site ou Instagram da empresa</span>
              <input
                autoComplete="url"
                className={styles.input}
                maxLength={220}
                name="companyProfile"
                placeholder="https://empresa.com ou @empresa"
                type="text"
              />
              <p className={styles.helper}>
                Campo opcional, mas ajuda bastante a equipe a entender o posicionamento da marca.
              </p>
            </label>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionKicker}>Objetivo da parceria</span>
            <h2 className={styles.sectionTitle}>Como sua marca quer entrar no evento</h2>
            <p className={styles.sectionCopy}>
              Vale explicar interesse em arena, transmissão, conteúdo, ação de marca,
              experiência VIP ou qualquer outro formato que faça sentido.
            </p>
          </div>

          <label className={`${styles.field} ${styles.fullWidth}`}>
            <span className={styles.label}>Como sua marca quer participar</span>
            <textarea
              className={styles.textarea}
              minLength={24}
              name="partnershipIntent"
              placeholder="Conta o objetivo da marca, o tipo de entrega que você imagina, o público que quer alcançar e qualquer contexto que ajude a equipe a avaliar o encaixe."
              required
            />
            <p className={styles.helper}>
              Quanto mais claro o briefing, mais rápido a equipe consegue avaliar formato e aderência.
            </p>
          </label>
        </section>

        <section className={styles.section}>
          <div className={styles.finalPanel}>
            <input
              aria-hidden="true"
              autoComplete="off"
              className="visually-hidden"
              name="website"
              tabIndex={-1}
              type="text"
            />

            <div className={styles.actions}>
              <button className={styles.button} disabled={state.status === "submitting"} type="submit">
                {state.status === "submitting" ? "Enviando..." : "Enviar contato"}
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
                  Se já tiver ideia de cota, ativação ou entrega, descreva no campo acima para
                  acelerar a conversa.
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
    </form>
  );
}
