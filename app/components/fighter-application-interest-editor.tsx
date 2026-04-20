"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import styles from "./fighter-application-interest-editor.module.css";

const EDITORIAL_INTEREST_OPTIONS = [
  { value: "interessante", label: "Interessante" },
  { value: "talvez_no_futuro", label: "Talvez no futuro" },
  { value: "nao_interessante", label: "Não interessante" },
  { value: "bizarro", label: "Bizarro" },
] as const;
const EDITORIAL_INTEREST_BUTTONS = [
  { value: "", label: "Sem classificação" },
  ...EDITORIAL_INTEREST_OPTIONS,
] as const;
const EDITORIAL_INTEREST_VALUES = new Set<string>(
  EDITORIAL_INTEREST_OPTIONS.map((option) => option.value),
);

type FighterApplicationInterestEditorProps = {
  applicationId: string;
  initialEditorialInterest: string | null | undefined;
};

type SaveResponse = {
  ok?: boolean;
  message?: string;
  editorialInterest?: string | null;
};

function normalizeSelectValue(value: string | null | undefined) {
  if (typeof value !== "string") {
    return "";
  }

  const normalized = value.trim().toLowerCase();
  return EDITORIAL_INTEREST_VALUES.has(normalized) ? normalized : "";
}

export function FighterApplicationInterestEditor({
  applicationId,
  initialEditorialInterest,
}: Readonly<FighterApplicationInterestEditorProps>) {
  const router = useRouter();
  const [currentValue, setCurrentValue] = useState(
    normalizeSelectValue(initialEditorialInterest),
  );
  const [savedValue, setSavedValue] = useState(normalizeSelectValue(initialEditorialInterest));
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const hasChanges = currentValue !== savedValue;

  function saveEditorialInterest() {
    if (isPending || !hasChanges) {
      return;
    }

    setFeedback(null);

    startTransition(async () => {
      try {
        const response = await fetch(
          `/api/admin/fighter-applications/${applicationId}/interest`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              editorialInterest: currentValue || null,
            }),
          },
        );

        const payload = (await response.json().catch(() => null)) as SaveResponse | null;

        if (!response.ok || !payload?.ok) {
          throw new Error(payload?.message ?? "Não foi possível salvar agora.");
        }

        const normalizedSavedValue = normalizeSelectValue(payload.editorialInterest);

        setSavedValue(normalizedSavedValue);
        setCurrentValue(normalizedSavedValue);
        setFeedback({
          tone: "success",
          message: payload.message ?? "Classificação atualizada com sucesso.",
        });
        router.refresh();
      } catch (error) {
        setFeedback({
          tone: "error",
          message: error instanceof Error ? error.message : "Não foi possível salvar agora.",
        });
      }
    });
  }

  return (
    <section className={styles.card}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Classificação editorial</p>
        <h2>Interesse MMMMA</h2>
        <p className={styles.description}>
          Escolha o atributo deste atleta para o pipeline de avaliação de conteúdo.
        </p>
      </header>

      <div className={styles.controls}>
        <div className={styles.field}>
          <span>Atributo</span>
          <div className={styles.optionList} role="radiogroup" aria-label="Classificação editorial">
            {EDITORIAL_INTEREST_BUTTONS.map((option) => {
              const isActive = currentValue === option.value;

              return (
                <button
                  type="button"
                  key={option.value || "sem-classificacao"}
                  className={isActive ? `${styles.optionButton} ${styles.optionButtonActive}` : styles.optionButton}
                  aria-pressed={isActive}
                  disabled={isPending}
                  onClick={() => {
                    setCurrentValue(option.value);
                    setFeedback(null);
                  }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          className={styles.saveButton}
          disabled={isPending || !hasChanges}
          onClick={saveEditorialInterest}
        >
          {isPending ? "Salvando..." : "Salvar classificação"}
        </button>
      </div>

      {feedback ? (
        <p
          className={feedback.tone === "error" ? `${styles.feedback} ${styles.error}` : styles.feedback}
          role="status"
        >
          {feedback.message}
        </p>
      ) : null}
    </section>
  );
}
