"use client";

import { useEffect, useState, startTransition } from "react";

import { getSiteAssetIntrinsicDimensions } from "@/lib/site-assets";

type NavItem = {
  href: string;
  label: string;
  sectionId: string;
};

type LandingTopbarProps = {
  brandLogo: string;
  // Opcional: reativar quando o link oficial de ingressos estiver disponível.
  ctaHref?: string;
  ctaLabel?: string;
  ctaLogoSrc?: string;
  navItems: readonly NavItem[];
};

export function LandingTopbar({
  brandLogo,
  ctaHref,
  ctaLabel,
  ctaLogoSrc,
  navItems
}: Readonly<LandingTopbarProps>) {
  const [activeSection, setActiveSection] = useState(navItems[0]?.sectionId ?? "");
  const [menuOpen, setMenuOpen] = useState(false);
  const activeItem = navItems.find((item) => item.sectionId === activeSection) ?? navItems[0];
  const hasCta = Boolean(ctaHref && ctaLabel);
  const hasCtaLogo = Boolean(ctaLogoSrc);
  const ctaIsExternal = Boolean(ctaHref?.startsWith("http"));
  const brandLogoDimensions = getSiteAssetIntrinsicDimensions(brandLogo);
  const ctaButtonClassName = [
    "landing-button",
    hasCtaLogo ? "landing-button--rinha" : null
  ]
    .filter(Boolean)
    .join(" ");
  const ctaButtonContent = hasCtaLogo ? (
    <span className="landing-button__logo-mark" aria-hidden="true">
      <img
        className="landing-button__logo"
        src={ctaLogoSrc}
        alt=""
        width={1241}
        height={423}
      />
    </span>
  ) : (
    ctaLabel
  );

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-nav-section]"));

    if (!sections.length || !navItems.length) {
      return;
    }

    let frame = 0;
    let sectionOffsets = sections.map((section) => ({
      sectionId: section.dataset.navSection ?? navItems[0].sectionId,
      top: section.getBoundingClientRect().top + window.scrollY
    }));

    const syncViewportState = () => {
      const sectionThreshold = window.scrollY + Math.max(120, window.innerHeight * 0.34);
      let nextActive = navItems[0].sectionId;

      for (const section of sectionOffsets) {
        if (section.top <= sectionThreshold) {
          nextActive = section.sectionId;
        } else {
          break;
        }
      }

      startTransition(() => {
        setActiveSection((current) => (current === nextActive ? current : nextActive));
      });
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

    let cancelled = false;

    requestRefresh();

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
      window.removeEventListener("scroll", requestSync);
      window.removeEventListener("resize", requestRefresh);
      window.removeEventListener("load", requestRefresh);
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
          <img
            src={brandLogo}
            alt="Money Moicano MMA"
            width={brandLogoDimensions?.width}
            height={brandLogoDimensions?.height}
          />
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
        {hasCta ? (
          <a
            aria-label={hasCtaLogo ? ctaLabel : undefined}
            className={`${ctaButtonClassName} landing-button--nav`}
            href={ctaHref}
            rel={ctaIsExternal ? "noreferrer" : undefined}
            target={ctaIsExternal ? "_blank" : undefined}
          >
            {ctaButtonContent}
          </a>
        ) : null}

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
            <p className="topbar__sheet-copy">23 MAIO 2026 · SÃO PAULO · CANAL MONEY MOICANO</p>
            {hasCta ? (
              <a
                aria-label={hasCtaLogo ? ctaLabel : undefined}
                className={`${ctaButtonClassName} landing-button--primary landing-button--sheet`}
                href={ctaHref}
                rel={ctaIsExternal ? "noreferrer" : undefined}
                target={ctaIsExternal ? "_blank" : undefined}
              >
                {ctaButtonContent}
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
