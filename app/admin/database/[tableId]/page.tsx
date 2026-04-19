import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminDatabaseTableView } from "@/app/components/admin-database-table-view";
import { AdminTopbar } from "@/app/components/admin-topbar";
import { LandingMotionController } from "@/app/components/landing-motion-controller";
import {
  getAdminDatabaseTableMeta,
  isAdminDatabaseTableId,
  loadAdminDatabaseTableData,
} from "@/lib/server/admin-database";
import {
  canAccessAdminDatabaseTable,
  shouldLimitEventFighterIntakesToCurrentEvent,
} from "@/lib/server/admin-access";
import { requireAdminSessionIdentity } from "@/lib/server/admin-session";

import styles from "./page.module.css";

type AdminDatabaseTablePageProps = {
  params: Promise<{
    tableId: string;
  }>;
};

export async function generateMetadata({
  params,
}: Readonly<AdminDatabaseTablePageProps>): Promise<Metadata> {
  const { tableId } = await params;
  const table = getAdminDatabaseTableMeta(tableId);

  return {
    title: table ? `${table.label} | Admin Banco` : "Tabela | Admin Banco",
    robots: {
      index: false,
      follow: false,
    },
  };
}

export const dynamic = "force-dynamic";

export default async function AdminDatabaseTablePage({
  params,
}: Readonly<AdminDatabaseTablePageProps>) {
  const { tableId } = await params;

  if (!isAdminDatabaseTableId(tableId)) {
    notFound();
  }

  const identity = await requireAdminSessionIdentity(`/admin/database/${tableId}`);

  if (!canAccessAdminDatabaseTable(identity.role, tableId)) {
    notFound();
  }

  const data = await loadAdminDatabaseTableData(tableId, {
    limitEventFighterIntakesToCurrentEvent: shouldLimitEventFighterIntakesToCurrentEvent(
      identity.role,
    ),
  });

  return (
    <main className={styles.page}>
      <LandingMotionController />
      <AdminTopbar active="database" role={identity.role} />

      <section className={styles.content}>
        <div className={styles.shell}>
          <Link className={styles.backLink} href="/admin/database">
            Voltar para visão geral
          </Link>

          <header className={styles.header}>
            <div className={styles.copy}>
              <p className={styles.eyebrow}>Tabela completa</p>
              <h1>{data.table.label}</h1>
              <p>{data.table.description}</p>
            </div>

            <div className={styles.metaCard}>
              <span>Tabela</span>
              <strong>{data.table.tableName}</strong>
            </div>
          </header>

          <AdminDatabaseTableView data={data} />
        </div>
      </section>
    </main>
  );
}
