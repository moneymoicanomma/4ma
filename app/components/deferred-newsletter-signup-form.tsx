"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const NewsletterSignupForm = dynamic(() =>
  import("./newsletter-signup-form").then((module) => module.NewsletterSignupForm)
);

export function DeferredNewsletterSignupForm() {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const [shouldRenderForm, setShouldRenderForm] = useState(false);

  useEffect(() => {
    if (shouldRenderForm || !shellRef.current) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) {
          return;
        }

        setShouldRenderForm(true);
        observer.disconnect();
      },
      {
        rootMargin: "320px 0px"
      }
    );

    observer.observe(shellRef.current);

    return () => {
      observer.disconnect();
    };
  }, [shouldRenderForm]);

  return (
    <div className="newsletter-form-shell" ref={shellRef}>
      {shouldRenderForm ? (
        <NewsletterSignupForm />
      ) : (
        <div className="newsletter-form newsletter-form--placeholder" aria-hidden="true">
          <div className="newsletter-form__placeholder-field" />
          <div className="newsletter-form__placeholder-button" />
        </div>
      )}
    </div>
  );
}
