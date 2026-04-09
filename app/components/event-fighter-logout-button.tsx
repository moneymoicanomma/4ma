"use client";

import { useState } from "react";

import styles from "./event-fighter-logout-button.module.css";

type EventFighterLogoutButtonProps = {
  className?: string;
};

export function EventFighterLogoutButton({
  className = ""
}: Readonly<EventFighterLogoutButtonProps>) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <button
      className={className ? `${styles.button} ${className}` : styles.button}
      disabled={isSubmitting}
      type="button"
      onClick={async () => {
        setIsSubmitting(true);

        try {
          await fetch("/api/event-fighter-access/session", {
            method: "DELETE",
            headers: {
              Accept: "application/json"
            },
            cache: "no-store"
          });
        } finally {
          window.location.replace("/atletas-da-edicao#acesso");
        }
      }}
    >
      <svg
        aria-hidden="true"
        className={styles.icon}
        fill="none"
        viewBox="0 0 24 24"
      >
        <path
          d="M14 7l5 5-5 5"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
        <path
          d="M19 12H9"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
        <path
          d="M10 5H6.75A1.75 1.75 0 005 6.75v10.5C5 18.216 5.784 19 6.75 19H10"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
      <span>{isSubmitting ? "Saindo..." : "Sair"}</span>
    </button>
  );
}
