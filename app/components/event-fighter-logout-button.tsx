"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

import styles from "./event-fighter-logout-button.module.css";

type EventFighterLogoutButtonProps = {
  className?: string;
};

export function EventFighterLogoutButton({
  className = ""
}: Readonly<EventFighterLogoutButtonProps>) {
  const router = useRouter();
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
          startTransition(() => {
            router.replace("/atletas-da-edicao");
            router.refresh();
          });
        }
      }}
    >
      {isSubmitting ? "Saindo..." : "Entrar com outro email"}
    </button>
  );
}
