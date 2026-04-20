import type { Metadata } from "next";

import { AdminDatabaseDashboard } from "@/app/components/admin-database-dashboard";
import { AdminTopbar } from "@/app/components/admin-topbar";
import { LandingMotionController } from "@/app/components/landing-motion-controller";
import { loadAdminDatabaseOverview } from "@/lib/server/admin-database";
import {
  getVisibleAdminDatabaseTableIds,
  shouldLimitEventFighterIntakesToCurrentEvent
} from "@/lib/server/admin-access";
import { requireAdminSessionIdentity } from "@/lib/server/admin-session";

import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Admin Banco | Money Moicano MMA",
  description:
    "Painel administrativo com leitura simplificada das principais tabelas operacionais do Money Moicano MMA.",
  robots: {
    index: false,
    follow: false
  }
};

export const dynamic = "force-dynamic";

export default async function AdminDatabasePage() {
  const identity = await requireAdminSessionIdentity("/admin/database");
  const visibleTableIds = getVisibleAdminDatabaseTableIds(identity.role);

  const overview = await loadAdminDatabaseOverview({
    visibleTableIds,
    limitEventFighterIntakesToCurrentEvent: shouldLimitEventFighterIntakesToCurrentEvent(
      identity.role
    )
  });

  return (
    <main className={styles.page}>
      <LandingMotionController />
      <AdminTopbar active="database" role={identity.role} />

      <section className={styles.hero}>
        <div className={styles.heroGrid}>
          <div className={styles.heroCopy} data-reveal>
            <p className={styles.eyebrow}>Visão simplificada</p>
            <h1 className={styles.title}>
              Admin do
              <span className={styles.titleAccent}>Banco</span>
            </h1>
            <p className={styles.heroBody}>
              Esta área reúne as principais tabelas operacionais em leitura rápida com preview das
              últimas linhas, mantendo os detalhes completos dentro do perfil de cada registro.
            </p>
          </div>
        </div>
      </section>

      <section className={styles.dashboardSection}>
        <div className={styles.dashboardShell} data-reveal>
          <AdminDatabaseDashboard overview={overview} />
        </div>
      </section>
    </main>
  );
}
