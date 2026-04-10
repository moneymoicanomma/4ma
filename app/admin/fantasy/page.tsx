import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminLogoutButton } from "@/app/components/admin-logout-button";
import { FantasyAdminDashboard } from "@/app/components/fantasy-admin-dashboard";
import { LandingMotionController } from "@/app/components/landing-motion-controller";
import {
  ADMIN_LOGIN_PATH,
  ADMIN_SESSION_COOKIE_NAME
} from "@/lib/admin/auth";
import { FANTASY_SCORING_RULES, cloneFantasyMockEvents } from "@/lib/fantasy/mock-data";
import { getSessionAccountFromToken } from "@/lib/server/auth-store";
import { getServerEnv, isDatabaseConfigured } from "@/lib/server/env";
import { loadFantasyEventsFromDatabase } from "@/lib/server/fantasy";

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
    "Painel administrativo para configurar eventos, lutas, resultados e leaderboard do fantasy do Money Moicano MMA.",
  robots: {
    index: false,
    follow: false
  }
};

export const dynamic = "force-dynamic";

export default async function FantasyAdminPage() {
  const env = getServerEnv();

  if (isDatabaseConfigured(env)) {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value;

    if (!sessionToken) {
      redirect(`${ADMIN_LOGIN_PATH}?next=/admin/fantasy`);
    }

    const session = await getSessionAccountFromToken({
      acceptedRoles: ["admin", "operator"],
      sessionKind: "backoffice",
      sessionToken
    }).catch(() => null);

    if (!session) {
      redirect(`${ADMIN_LOGIN_PATH}?next=/admin/fantasy`);
    }
  }

  const databaseFantasy = await loadFantasyEventsFromDatabase(env);
  const initialEvents =
    databaseFantasy?.events.length ? databaseFantasy.events : cloneFantasyMockEvents();
  const scoringRules = databaseFantasy?.scoringRules ?? FANTASY_SCORING_RULES;

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
          <Link className={styles.backLink} href="/">
            Voltar ao site
          </Link>
          <AdminLogoutButton className={styles.logoutAction} />
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
          <FantasyAdminDashboard initialEvents={initialEvents} scoringRules={scoringRules} />
        </div>
      </section>
    </main>
  );
}
