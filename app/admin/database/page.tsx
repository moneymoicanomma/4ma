import type { Metadata } from "next";

import { AdminDatabaseDashboard } from "@/app/components/admin-database-dashboard";
import { AdminTopbar } from "@/app/components/admin-topbar";
import { LandingMotionController } from "@/app/components/landing-motion-controller";
import { loadAdminDatabaseOverview } from "@/lib/server/admin-database";
import { requireAdminSessionIdentity } from "@/lib/server/admin-session";
import { getServerEnv } from "@/lib/server/env";

import styles from "./page.module.css";

const numberFormatter = new Intl.NumberFormat("pt-BR");

export const metadata: Metadata = {
  title: "Admin Banco | Money Moicano MMA",
  description:
    "Painel administrativo com leitura simplificada das principais tabelas operacionais do Money Moicano MMA.",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

const env = getServerEnv();

const directDebug = {
  processDatabaseUrl: Boolean(process.env.DATABASE_URL?.trim()),
  envDatabaseUrl: Boolean(env.databaseUrl),
  envDatabaseSslMode: env.databaseSslMode,
  envDatabasePoolMaxConnections: env.databasePoolMaxConnections,
};

console.log("[ADMIN PAGE DEBUG]", directDebug);

export default async function AdminDatabasePage() {
  await requireAdminSessionIdentity("/admin/database");

  const env = getServerEnv();

  const directDebug = {
    processDatabaseUrl: Boolean(process.env.DATABASE_URL?.trim()),
    envDatabaseUrl: Boolean(env.databaseUrl),
    envDatabaseSslMode: env.databaseSslMode,
    envDatabasePoolMaxConnections: env.databasePoolMaxConnections,
  };

  const overview = await loadAdminDatabaseOverview();

  return (
    <main className={styles.page}>
      <div style={{ color: "#fff", padding: 20, fontSize: 20 }}>
        DEBUG BUILD V2
      </div>

      <LandingMotionController />
      <AdminTopbar active="database" />

      <section className={styles.hero}>
        <div className={styles.heroGrid}>
          <div className={styles.heroCopy} data-reveal>
            <p className={styles.eyebrow}>Visão simplificada</p>
            <h1 className={styles.title}>
              Admin do
              <span className={styles.titleAccent}>Banco</span>
            </h1>
            <p className={styles.heroBody}>
              Esta área reúne as principais tabelas operacionais em leitura
              rápida, com contagem de registros, status e preview das últimas
              linhas sem expor os campos mais sensíveis.
            </p>
            <p style={{ color: "#fff" }}>
              dbConfigured: {String(overview.databaseConfigured)} | tables:{" "}
              <p style={{ color: "#fff" }}>
                process.env.DATABASE_URL:{" "}
                {String(directDebug.processDatabaseUrl)}
              </p>
              <p style={{ color: "#fff" }}>
                getServerEnv().databaseUrl: {String(directDebug.envDatabaseUrl)}
              </p>
              <p style={{ color: "#fff" }}>
                sslMode: {directDebug.envDatabaseSslMode} | pool:{" "}
                {directDebug.envDatabasePoolMaxConnections}
              </p>
              {overview.tables.length}
            </p>
          </div>

          <div className={styles.heroAside} data-reveal>
            <div className={styles.heroAsideCard}>
              <span>Banco</span>
              <strong>
                {overview.databaseConfigured ? "Conectado" : "Indisponível"}
              </strong>
            </div>
            <div className={styles.heroAsideCard}>
              <span>Tabelas cobertas</span>
              <strong>
                {overview.databaseConfigured
                  ? `${numberFormatter.format(overview.availableTables)}/${numberFormatter.format(overview.tables.length)}`
                  : "0/0"}
              </strong>
            </div>
            <div className={styles.heroAsideCard}>
              <span>Linhas monitoradas</span>
              <strong>
                {overview.databaseConfigured
                  ? numberFormatter.format(overview.totalRows)
                  : "—"}
              </strong>
            </div>
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
