import type { ReactNode } from "react";

import Image from "next/image";
import Link from "next/link";

import { LandingMotionController } from "@/app/components/landing-motion-controller";

import styles from "./site-page-shell.module.css";

const r2PublicBase = "https://pub-ecc1c3f0770f4d4ebd9b8cc27c8d8bcf.r2.dev";
const r2Asset = (fileName: string) =>
  `${r2PublicBase}/${fileName
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;

const brandLogoWide = r2Asset("logo money moicano mma extenso.svg");
const heroImage = r2Asset("hero-main-v3.webp");

type PageAction = {
  href: string;
  label: string;
  variant: "primary" | "secondary";
};

type HeroAside = {
  kicker: string;
  title: string;
  body: string;
  items?: readonly string[];
};

function ActionLink({
  action,
  className
}: Readonly<{
  action: PageAction;
  className: string;
}>) {
  if (action.href.startsWith("/")) {
    return (
      <Link className={className} href={action.href}>
        {action.label}
      </Link>
    );
  }

  return (
    <a className={className} href={action.href}>
      {action.label}
    </a>
  );
}

export function SitePageShell({
  eyebrow,
  title,
  accent,
  description,
  actions,
  heroAside,
  contentId = "conteudo",
  sidebar,
  children
}: Readonly<{
  eyebrow: string;
  title: string;
  accent?: string;
  description: string;
  actions?: readonly PageAction[];
  heroAside?: HeroAside;
  contentId?: string;
  sidebar?: ReactNode;
  children: ReactNode;
}>) {
  const ctaAction =
    actions?.find((action) => action.variant === "primary") ??
    ({
      href: `#${contentId}`,
      label: "Abrir conteúdo",
      variant: "primary"
    } satisfies PageAction);

  const secondaryActions = actions?.filter((action) => action.variant === "secondary") ?? [];

  return (
    <main className={styles.page}>
      <LandingMotionController />

      <header className={styles.topbar}>
        <Link
          aria-label="Voltar para a página principal do Money Moicano MMA"
          className={styles.brand}
          href="/"
        >
          <img alt="Money Moicano MMA" src={brandLogoWide} />
        </Link>

        <div className={styles.topbarActions}>
          <Link className={styles.secondaryLink} href="/">
            Voltar ao evento
          </Link>
          <ActionLink action={ctaAction} className={styles.primaryLink} />
        </div>
      </header>

      <section className={styles.hero}>
        <div aria-hidden="true" className={styles.heroMedia}>
          <Image
            fill
            alt=""
            className={styles.heroImage}
            priority
            sizes="100vw"
            src={heroImage}
          />
        </div>
        <div aria-hidden="true" className={styles.heroOverlay} />

        <div className={styles.heroGrid}>
          <div className={styles.heroCopy} data-reveal>
            <p className={styles.eyebrow}>{eyebrow}</p>
            <h1 className={styles.title}>
              {title}
              {accent ? <span className={styles.titleAccent}>{accent}</span> : null}
            </h1>
            <p className={styles.heroBody}>{description}</p>

            <div className={styles.heroActions}>
              <ActionLink action={ctaAction} className={styles.primaryLink} />
              {secondaryActions.map((action) => (
                <ActionLink action={action} className={styles.secondaryLink} key={`${action.href}-${action.label}`} />
              ))}
            </div>
          </div>

          {heroAside ? (
            <aside className={styles.heroAside} data-reveal>
              <span className={styles.asideKicker}>{heroAside.kicker}</span>
              <h2 className={styles.asideTitle}>{heroAside.title}</h2>
              <p className={styles.asideBody}>{heroAside.body}</p>

              {heroAside.items?.length ? (
                <ul className={styles.asideList}>
                  {heroAside.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </aside>
          ) : null}
        </div>
      </section>

      <section className={styles.contentSection} id={contentId}>
        <div className={styles.contentWrap}>
          <div className={`${styles.contentGrid} ${sidebar ? styles.hasSidebar : ""}`.trim()}>
            <div className={styles.article} data-reveal>
              {children}
            </div>

            {sidebar ? (
              <aside className={styles.sidebar} data-reveal>
                {sidebar}
              </aside>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
