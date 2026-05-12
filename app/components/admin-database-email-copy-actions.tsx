"use client";

import { useState } from "react";

import { buildCommaSeparatedEmailList } from "@/lib/admin/email-copy";

import styles from "./admin-database-table-view.module.css";

type AdminDatabaseEmailCopyActionsProps = {
  emails: readonly string[];
};

type AdminDatabaseEmailCopyButtonProps = {
  email: string;
};

async function copyTextToClipboard(text: string) {
  await navigator.clipboard.writeText(text);
}

export function AdminDatabaseEmailCopyActions({
  emails,
}: Readonly<AdminDatabaseEmailCopyActionsProps>) {
  const [feedback, setFeedback] = useState("");
  const emailList = buildCommaSeparatedEmailList(emails);

  async function handleCopyAll() {
    if (!emailList) {
      setFeedback("Nenhum e-mail para copiar.");
      return;
    }

    try {
      await copyTextToClipboard(emailList);
      setFeedback("E-mails copiados para colar no Gmail.");
    } catch {
      setFeedback("Nao foi possivel copiar automaticamente.");
    }
  }

  return (
    <div className={styles.emailToolbar}>
      <button className={styles.copyButton} onClick={handleCopyAll} type="button">
        Copiar todos os e-mails
      </button>
      {feedback ? <span className={styles.copyFeedback}>{feedback}</span> : null}
    </div>
  );
}

export function AdminDatabaseEmailCopyButton({
  email,
}: Readonly<AdminDatabaseEmailCopyButtonProps>) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await copyTextToClipboard(email);
      setCopied(true);
      window.setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      aria-label={`Copiar ${email}`}
      className={styles.inlineCopyButton}
      onClick={handleCopy}
      type="button"
    >
      {copied ? "Copiado" : "Copiar"}
    </button>
  );
}
