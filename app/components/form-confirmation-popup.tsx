"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

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
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const initialDialog = dialogRef.current;

    if (!initialDialog) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const previousFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const backgroundElements = Array.from(document.body.children).filter(
      (element): element is HTMLElement => element instanceof HTMLElement && !element.contains(initialDialog)
    );
    const previousBackgroundState = backgroundElements.map((element) => ({
      ariaHidden: element.getAttribute("aria-hidden"),
      hadInert: element.hasAttribute("inert"),
      element
    }));

    for (const entry of previousBackgroundState) {
      entry.element.setAttribute("aria-hidden", "true");
      entry.element.setAttribute("inert", "");
    }

    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus() ?? initialDialog.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const dialog = dialogRef.current;

      if (!dialog) {
        return;
      }

      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          [
            "a[href]",
            "area[href]",
            "input:not([disabled]):not([type='hidden'])",
            "select:not([disabled])",
            "textarea:not([disabled])",
            "button:not([disabled])",
            "iframe",
            "object",
            "embed",
            "[contenteditable='true']",
            "[tabindex]:not([tabindex='-1'])"
          ].join(",")
        )
      );

      if (!focusable.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;

      if (event.shiftKey) {
        if (!activeElement || activeElement === first || !dialog.contains(activeElement)) {
          event.preventDefault();
          last.focus();
        }
        return;
      }

      if (activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);

      for (const entry of previousBackgroundState) {
        if (entry.ariaHidden === null) {
          entry.element.removeAttribute("aria-hidden");
        } else {
          entry.element.setAttribute("aria-hidden", entry.ariaHidden);
        }

        if (!entry.hadInert) {
          entry.element.removeAttribute("inert");
        }
      }

      previousFocusedElement?.focus();
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className={styles.backdrop} onClick={onClose} role="presentation">
      <div
        className={styles.dialog}
        ref={dialogRef}
        tabIndex={-1}
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
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
    </div>,
    document.body
  );
}
