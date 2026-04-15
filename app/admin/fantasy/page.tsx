import type { Metadata } from "next";

import { AdminTopbar } from "@/app/components/admin-topbar";
import { FantasyAdminDashboard } from "@/app/components/fantasy-admin-dashboard";
import { LandingMotionController } from "@/app/components/landing-motion-controller";
import { requireAdminSessionIdentity } from "@/lib/server/admin-session";
import {
  getServerEnv,
  isAdminReadUpstreamConfigured,
  isDatabaseConfigured
} from "@/lib/server/env";
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

  const fantasyReadable = isDatabaseConfigured(env) || isAdminReadUpstreamConfigured(env);
  const databaseFantasy = fantasyReadable ? await loadFantasyEventsFromDatabase(env) : null;
  const initialEvents = databaseFantasy?.events ?? [];
  const databaseState = !fantasyReadable ? "unavailable" : databaseFantasy ? "ready" : "error";

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
          {databaseState === "ready" ? (
            <FantasyAdminDashboard initialEvents={initialEvents} />
          ) : (
            <div className={styles.unavailableCard}>
              <span className={styles.unavailableEyebrow}>
                {databaseState === "unavailable" ? "Banco indisponível" : "Falha na leitura"}
              </span>
              <h2>
                {databaseState === "unavailable"
                  ? "O admin do fantasy precisa de conexão com o banco."
                  : "Não foi possível carregar os eventos reais do fantasy."}
              </h2>
              <p>
                {databaseState === "unavailable"
                  ? "Neste ambiente a leitura administrativa do fantasy não está ligada, então o painel não vai mais abrir com dados de exemplo."
                  : "A leitura falhou e a tela foi travada para evitar mostrar eventos mock como se fossem reais. Vale revisar a conexão e tentar novamente."}
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
