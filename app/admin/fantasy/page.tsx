import type { Metadata } from "next";

import { AdminTopbar } from "@/app/components/admin-topbar";
import { FantasyAdminDashboard } from "@/app/components/fantasy-admin-dashboard";
import { LandingMotionController } from "@/app/components/landing-motion-controller";
import { FANTASY_SCORING_RULES, cloneFantasyMockEvents } from "@/lib/fantasy/mock-data";
import { requireAdminSessionIdentity } from "@/lib/server/admin-session";
import { getServerEnv } from "@/lib/server/env";
import { loadFantasyEventsFromDatabase } from "@/lib/server/fantasy";

import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Admin Fantasy | Money Moicano MMA",
  description:
    "Painel administrativo para configurar eventos, lutas, resultados e leaderboard do fantasy do Money Moicano MMA.",
  robots: {
    index: false,
    follow: false
  }
};

export const dynamic = "force-dynamic";

export default async function FantasyAdminPage() {
  const env = getServerEnv();
  await requireAdminSessionIdentity("/admin/fantasy", env);

  const databaseFantasy = await loadFantasyEventsFromDatabase(env);
  const initialEvents =
    databaseFantasy?.events.length ? databaseFantasy.events : cloneFantasyMockEvents();
  const scoringRules = databaseFantasy?.scoringRules ?? FANTASY_SCORING_RULES;

  return (
    <main className={styles.page}>
      <LandingMotionController />
      <AdminTopbar active="fantasy" />

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
          <FantasyAdminDashboard initialEvents={initialEvents} scoringRules={scoringRules} />
        </div>
      </section>
    </main>
  );
}
