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
      {isSubmitting ? "Saindo..." : "Entrar com outro email"}
    </button>
  );
}
