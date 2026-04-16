"use client";

import { useState } from "react";

import type { AdminDatabaseRecordCopyExport } from "@/lib/server/admin-database";

import styles from "./admin-database-record-copy-actions.module.css";

type AdminDatabaseRecordCopyActionsProps = {
  exports: AdminDatabaseRecordCopyExport[];
};

export function AdminDatabaseRecordCopyActions({
  exports,
}: Readonly<AdminDatabaseRecordCopyActionsProps>) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  async function handleCopy(copyExport: AdminDatabaseRecordCopyExport) {
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
        <h2>Copiar para a planilha</h2>
        <p>
          O admin usa leitura direta do banco. Esses atalhos contornam o export da planilha e
          copiam os dados desta ficha no formato mais prático para colar.
        </p>
      </header>

      <div className={styles.actionList}>
        {exports.map((copyExport) => (
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
