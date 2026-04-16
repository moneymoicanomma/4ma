"use client";

import { useState } from "react";

import type {
  AdminDatabaseRecordCopyExport,
  AdminDatabaseRecordSection,
} from "@/lib/server/admin-database";

import styles from "./admin-database-record-copy-actions.module.css";

type AdminDatabaseRecordCopyActionsProps = {
  exports: AdminDatabaseRecordCopyExport[];
  sections: AdminDatabaseRecordSection[];
};

type CopyAction = {
  id: string;
  label: string;
  description: string;
  content: string;
};

function normalizeCopyValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "boolean") {
    return value ? "Sim" : "Nao";
  }

  if (typeof value === "string" || typeof value === "number") {
    return String(value).replace(/\r\n/g, "\n").trim();
  }

  return JSON.stringify(value);
}

function escapeCsvValue(value: string): string {
  if (!/[",\n]/.test(value)) {
    return value;
  }

  return `"${value.replace(/"/g, '""')}"`;
}

function buildSectionCsv(section: AdminDatabaseRecordSection): string {
  const rows = section.fields.map((field) =>
    [field.label, normalizeCopyValue(field.value)].map(escapeCsvValue).join(","),
  );

  return [["campo", "valor"].join(","), ...rows].join("\n");
}

function buildAllCsv(sections: AdminDatabaseRecordSection[]): string {
  const rows = sections.flatMap((section) =>
    section.fields.map((field) =>
      [section.title, field.label, normalizeCopyValue(field.value)].map(escapeCsvValue).join(","),
    ),
  );

  return [["secao", "campo", "valor"].join(","), ...rows].join("\n");
}

function buildSectionActionId(sectionTitle: string): string {
  return sectionTitle
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function AdminDatabaseRecordCopyActions({
  exports,
  sections,
}: Readonly<AdminDatabaseRecordCopyActionsProps>) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const actions: CopyAction[] = [
    {
      id: "copy-all-csv",
      label: "Copiar tudo (CSV)",
      description: "Exporta todas as secoes desta ficha em CSV com colunas secao, campo e valor.",
      content: buildAllCsv(sections),
    },
    ...sections.map((section) => ({
      id: `copy-section-${buildSectionActionId(section.title)}`,
      label: `Copiar ${section.title}`,
      description: `CSV com os campos do setor ${section.title}.`,
      content: buildSectionCsv(section),
    })),
    ...exports,
  ];

  async function handleCopy(copyExport: CopyAction) {
    setActiveId(copyExport.id);

    try {
      await navigator.clipboard.writeText(copyExport.content);
      setFeedback(`${copyExport.label} copiado.`);
    } catch {
      setFeedback("Nao foi possivel copiar automaticamente. Tente novamente.");
    } finally {
      setActiveId(null);
      window.setTimeout(() => {
        setFeedback((currentFeedback) =>
          currentFeedback === `${copyExport.label} copiado.` ? null : currentFeedback,
        );
      }, 2400);
    }
  }

  return (
    <section className={styles.panel}>
      <header className={styles.header}>
        <span className={styles.eyebrow}>Acoes rapidas</span>
        <h2>Copiar dados</h2>
        <p>
          Copie a ficha inteira em CSV, copie cada setor separadamente ou use os atalhos
          específicos para planilha.
        </p>
      </header>

      <div className={styles.actionList}>
        {actions.map((copyExport) => (
          <article className={styles.actionCard} key={copyExport.id}>
            <div className={styles.copy}>
              <strong>{copyExport.label}</strong>
              <p>{copyExport.description}</p>
            </div>

            <button
              className={styles.button}
              onClick={() => handleCopy(copyExport)}
              type="button"
            >
              {activeId === copyExport.id ? "Copiando..." : "Copiar"}
            </button>
          </article>
        ))}
      </div>

      {feedback ? <p className={styles.feedback}>{feedback}</p> : null}
    </section>
  );
}
