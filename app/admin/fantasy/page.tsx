import type { Metadata } from "next";
import Link from "next/link";

import { FantasyAdminDashboard } from "@/app/components/fantasy-admin-dashboard";
import { LandingMotionController } from "@/app/components/landing-motion-controller";
import { FANTASY_SCORING_RULES, cloneFantasyMockEvents } from "@/lib/fantasy/mock-data";

import styles from "./page.module.css";

const r2PublicBase = "https://pub-ecc1c3f0770f4d4ebd9b8cc27c8d8bcf.r2.dev";
const r2Asset = (fileName: string) =>
  `${r2PublicBase}/${fileName
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;

const brandLogoWide = r2Asset("logo money moicano mma extenso.svg");

export const metadata: Metadata = {
  title: "Admin Fantasy | Money Moicano MMA",
  description:
    "Painel administrativo para configurar eventos, lutas, resultados e leaderboard do fantasy do Money Moicano MMA."
};

export default function FantasyAdminPage() {
  const initialEvents = cloneFantasyMockEvents();

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
          <Link className={styles.backLink} href="/fantasy">
            Ver fantasy
          </Link>
          <Link className={styles.anchorLink} href="/">
            Voltar ao site
          </Link>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroGrid}>
          <div className={styles.heroCopy} data-reveal>
            <p className={styles.eyebrow}>Painel operacional</p>
            <h1 className={styles.title}>
              Admin do
              <span className={styles.titleAccent}>Fantasy</span>
            </h1>
            <p className={styles.heroBody}>
              Esta área centraliza criação de evento, gestão de lutas, deadline de picks,
              lançamento de resultados e leitura do ranking que vai para o público.
            </p>
          </div>

          <div className={styles.heroAside} data-reveal>
            <div className={styles.heroAsideCard}>
              <span>Evento atual</span>
              <strong>Configuração + lock</strong>
            </div>
            <div className={styles.heroAsideCard}>
              <span>Lutas</span>
              <strong>Adicionar, editar e remover</strong>
            </div>
            <div className={styles.heroAsideCard}>
              <span>Resultados</span>
              <strong>Leaderboard recalculado ao vivo</strong>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.dashboardSection}>
        <div className={styles.dashboardShell} data-reveal>
          <FantasyAdminDashboard initialEvents={initialEvents} scoringRules={FANTASY_SCORING_RULES} />
        </div>
      </section>
    </main>
  );
}
