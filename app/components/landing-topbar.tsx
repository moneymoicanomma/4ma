"use client";

import { useEffect, useState } from "react";

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
  const [menuOpen, setMenuOpen] = useState(false);
  const activeItem = navItems.find((item) => item.sectionId === activeSection) ?? navItems[0];

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-nav-section]"));
    const footer = document.querySelector<HTMLElement>(".footer");

    if (!sections.length || !navItems.length) {
      return;
    }

    let frame = 0;
    let footerVisible = false;
    let sectionOffsets = sections.map((section) => ({
      sectionId: section.dataset.navSection ?? navItems[0].sectionId,
      top: section.getBoundingClientRect().top + window.scrollY
    }));

    const syncViewportState = () => {
      const sectionThreshold = window.scrollY + Math.max(120, window.innerHeight * 0.34);
      const ctaThreshold = Math.max(220, window.innerHeight * 0.38);
      let nextActive = navItems[0].sectionId;

      for (const section of sectionOffsets) {
        if (section.top <= sectionThreshold) {
          nextActive = section.sectionId;
        } else {
          break;
        }
      }

      setActiveSection((current) => (current === nextActive ? current : nextActive));
      document.body.dataset.mobileCta =
        window.scrollY > ctaThreshold && !footerVisible ? "visible" : "hidden";
    };

    const requestSync = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(syncViewportState);
    };

    const refreshSectionOffsets = () => {
      sectionOffsets = sections.map((section) => ({
        sectionId: section.dataset.navSection ?? navItems[0].sectionId,
        top: section.getBoundingClientRect().top + window.scrollY
      }));

      syncViewportState();
    };

    const requestRefresh = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(refreshSectionOffsets);
    };

    const footerObserver = footer
      ? new IntersectionObserver(
          ([entry]) => {
            footerVisible = entry?.isIntersecting ?? false;
            requestSync();
          },
          {
            threshold: 0.05,
            rootMargin: "0px 0px -28px 0px"
          }
        )
      : null;

    let cancelled = false;

    requestRefresh();

    if (footer && footerObserver) {
      footerObserver.observe(footer);
    }
    window.addEventListener("scroll", requestSync, { passive: true });
    window.addEventListener("resize", requestRefresh);
    window.addEventListener("load", requestRefresh);

    const fontsReady = document.fonts?.ready;

    if (fontsReady) {
      void fontsReady
        .then(() => {
          if (!cancelled) {
            requestRefresh();
          }
        })
        .catch(() => {});
    }

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      footerObserver?.disconnect();
      window.removeEventListener("scroll", requestSync);
      window.removeEventListener("resize", requestRefresh);
      window.removeEventListener("load", requestRefresh);
      delete document.body.dataset.mobileCta;
    };
  }, [navItems]);

  useEffect(() => {
    document.body.dataset.mobileNavOpen = menuOpen ? "true" : "false";

    return () => {
      delete document.body.dataset.mobileNavOpen;
    };
  }, [menuOpen]);

  useEffect(() => {
    const desktopViewport = window.matchMedia("(min-width: 781px)");

    const closeMenuOnDesktop = (event?: MediaQueryListEvent) => {
      if (event?.matches ?? desktopViewport.matches) {
        setMenuOpen(false);
      }
    };

    closeMenuOnDesktop();
    desktopViewport.addEventListener("change", closeMenuOnDesktop);

    return () => {
      desktopViewport.removeEventListener("change", closeMenuOnDesktop);
    };
  }, []);

  return (
    <header className={menuOpen ? "topbar is-menu-open" : "topbar"}>
      <div className="topbar__brand-rail">
        <div aria-label="Money Moicano MMA" className="brand-mark">
          <img src={brandLogo} alt="Money Moicano MMA" />
        </div>

        <span className="topbar__current">{activeItem?.label}</span>
      </div>

      <nav className="topbar__nav" aria-label="Primary">
        {navItems.map((item) => (
          <a
            aria-current={activeSection === item.sectionId ? "page" : undefined}
            className={activeSection === item.sectionId ? "topbar__link is-active" : "topbar__link"}
            href={item.href}
            key={item.label}
            onClick={() => {
              setActiveSection(item.sectionId);
            }}
          >
            {item.label}
          </a>
        ))}
      </nav>

      <div className="topbar__actions">
        <a className="landing-button landing-button--nav" href={ctaHref}>
          {ctaLabel}
        </a>

        <button
          aria-controls="mobile-nav-sheet"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
          className="topbar__menu-toggle"
          type="button"
          onClick={() => {
            setMenuOpen((current) => !current);
          }}
        >
          <span className="topbar__menu-toggle-bar" />
          <span className="topbar__menu-toggle-bar" />
          <span className="topbar__menu-toggle-bar" />
        </button>
      </div>

      <div className="topbar__sheet" id="mobile-nav-sheet">
        <button
          aria-label="Fechar menu"
          className="topbar__sheet-backdrop"
          type="button"
          onClick={() => {
            setMenuOpen(false);
          }}
        />

        <div className="topbar__sheet-panel" role="dialog" aria-modal="true" aria-label="Navegação">
          <div className="topbar__sheet-header">
            <span className="topbar__sheet-kicker">Money Moicano MMA</span>
            <button
              aria-label="Fechar menu"
              className="topbar__sheet-close"
              type="button"
              onClick={() => {
                setMenuOpen(false);
              }}
            >
              Fechar
            </button>
          </div>

          <nav className="topbar__sheet-nav" aria-label="Primary Mobile">
            {navItems.map((item) => (
              <a
                aria-current={activeSection === item.sectionId ? "page" : undefined}
                className={
                  activeSection === item.sectionId
                    ? "topbar__sheet-link is-active"
                    : "topbar__sheet-link"
                }
                href={item.href}
                key={item.label}
                onClick={() => {
                  setActiveSection(item.sectionId);
                  setMenuOpen(false);
                }}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="topbar__sheet-footer">
            <span className="topbar__sheet-label">Próxima porrada</span>
            <p className="topbar__sheet-copy">30 MAIO 2026 · SÃO PAULO · CANAL MONEY MOICANO</p>
            <a className="landing-button landing-button--primary landing-button--sheet" href={ctaHref}>
              {ctaLabel}
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
