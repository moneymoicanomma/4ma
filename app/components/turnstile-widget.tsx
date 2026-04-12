"use client";

import { useEffect, useId, useRef, useState } from "react";
import Script from "next/script";

import styles from "./turnstile-widget.module.css";

declare global {
  interface Window {
    turnstile?: {
      remove: (widgetId: string) => void;
      render: (
        container: HTMLElement,
        options: {
          callback?: (token: string) => void;
          "error-callback"?: (errorCode?: string) => void;
          "expired-callback"?: () => void;
          sitekey: string;
          theme?: "light" | "dark" | "auto";
        }
      ) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

type TurnstileWidgetProps = {
  errorMessage?: string;
  onWidgetError?: (errorCode?: string) => void;
  onTokenChange: (token: string) => void;
  resetSignal?: number;
};

const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? "";

export function TurnstileWidget({
  errorMessage,
  onWidgetError,
  onTokenChange,
  resetSignal = 0
}: Readonly<TurnstileWidgetProps>) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenChangeRef = useRef(onTokenChange);
  const onWidgetErrorRef = useRef(onWidgetError);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const scriptId = useId();

  useEffect(() => {
    onTokenChangeRef.current = onTokenChange;
  }, [onTokenChange]);

  useEffect(() => {
    onWidgetErrorRef.current = onWidgetError;
  }, [onWidgetError]);

  useEffect(() => {
    if (!siteKey || !scriptLoaded || !containerRef.current || widgetIdRef.current || !window.turnstile) {
      return;
    }

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      theme: "dark",
      callback(token) {
        onTokenChangeRef.current(token);
      },
      "expired-callback"() {
        onTokenChangeRef.current("");
      },
      "error-callback"(errorCode) {
        onTokenChangeRef.current("");
        onWidgetErrorRef.current?.(errorCode);
      }
    });

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [scriptLoaded]);

  useEffect(() => {
    if (!widgetIdRef.current || !window.turnstile) {
      return;
    }

    onTokenChangeRef.current("");
    window.turnstile.reset(widgetIdRef.current);
  }, [resetSignal]);

  if (!siteKey) {
    return null;
  }

  return (
    <div className={styles.shell}>
      <Script
        id={`turnstile-${scriptId}`}
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={() => {
          setScriptLoaded(true);
        }}
      />
      <div className={styles.widget} ref={containerRef} />
      <p className={errorMessage ? `${styles.helper} ${styles.helperError}` : styles.helper}>
        {errorMessage || "Confirme que você é humano antes de enviar."}
      </p>
    </div>
  );
}
