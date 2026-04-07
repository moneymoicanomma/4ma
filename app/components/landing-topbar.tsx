"use client";

import { startTransition, useEffect, useState } from "react";

type NavItem = {
  href: string;
  label: string;
  sectionId: string;
};

type LandingTopbarProps = {
  brandLogo: string;
  ctaHref: string;
  ctaLabel: string;
  navItems: readonly NavItem[];
};

export function LandingTopbar({
  brandLogo,
  ctaHref,
  ctaLabel,
  navItems
}: Readonly<LandingTopbarProps>) {
  const [activeSection, setActiveSection] = useState(navItems[0]?.sectionId ?? "");

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-nav-section]"));

    if (!sections.length || !navItems.length) {
      return;
    }

    let frame = 0;

    const syncActiveSection = () => {
      const threshold = Math.max(120, window.innerHeight * 0.34);
      let nextActive = navItems[0].sectionId;

      for (const section of sections) {
        if (section.getBoundingClientRect().top <= threshold) {
          nextActive = section.dataset.navSection ?? nextActive;
          continue;
        }

        break;
      }

      startTransition(() => {
        setActiveSection((current) => (current === nextActive ? current : nextActive));
      });
    };

    const requestSync = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(syncActiveSection);
    };

    requestSync();

    window.addEventListener("scroll", requestSync, { passive: true });
    window.addEventListener("resize", requestSync);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", requestSync);
      window.removeEventListener("resize", requestSync);
    };
  }, [navItems]);

  return (
    <header className="topbar">
      <div aria-label="Money Moicano MMA" className="brand-mark">
        <img src={brandLogo} alt="Money Moicano MMA" />
      </div>

      <nav className="topbar__nav" aria-label="Primary">
        {navItems.map((item) => (
          <a
            aria-current={activeSection === item.sectionId ? "page" : undefined}
            className={activeSection === item.sectionId ? "topbar__link is-active" : "topbar__link"}
            href={item.href}
            key={item.label}
            onClick={() => {
              startTransition(() => {
                setActiveSection(item.sectionId);
              });
            }}
          >
            {item.label}
          </a>
        ))}
      </nav>

      <a className="landing-button landing-button--nav" href={ctaHref}>
        {ctaLabel}
      </a>
    </header>
  );
}
