"use client";

import { useEffect, useId, useRef } from "react";

import styles from "./form-confirmation-popup.module.css";

type FormConfirmationPopupProps = {
  message: string;
  open: boolean;
  onClose: () => void;
  title: string;
};

export function FormConfirmationPopup({
  message,
  open,
  onClose,
  title
}: Readonly<FormConfirmationPopupProps>) {
  const titleId = useId();
  const descriptionId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div className={styles.backdrop} onClick={onClose} role="presentation">
      <div
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        className={styles.dialog}
        role="alertdialog"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <span className={styles.kicker}>Envio confirmado</span>
        <h2 className={styles.title} id={titleId}>
          {title}
        </h2>
        <p className={styles.message} id={descriptionId}>
          {message}
        </p>
        <button className={styles.button} onClick={onClose} ref={closeButtonRef} type="button">
          Fechar
        </button>
      </div>
    </div>
  );
}
