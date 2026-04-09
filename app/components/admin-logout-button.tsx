"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

import styles from "./admin-logout-button.module.css";

type AdminLogoutButtonProps = {
  className?: string;
};

export function AdminLogoutButton({ className = "" }: Readonly<AdminLogoutButtonProps>) {
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
          await fetch("/api/admin/session", {
            method: "DELETE",
            headers: {
              Accept: "application/json"
            },
            cache: "no-store"
          });
        } finally {
          startTransition(() => {
            router.replace("/admin/login");
            router.refresh();
          });
        }
      }}
    >
      {isSubmitting ? "Saindo..." : "Sair do admin"}
    </button>
  );
}
