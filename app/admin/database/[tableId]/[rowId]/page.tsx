import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminDatabaseRecordView } from "@/app/components/admin-database-record-view";
import { FighterApplicationInterestEditor } from "@/app/components/fighter-application-interest-editor";
import { AdminTopbar } from "@/app/components/admin-topbar";
import { LandingMotionController } from "@/app/components/landing-motion-controller";
import {
  getAdminDatabaseTableMeta,
  isAdminDatabaseTableId,
  loadAdminDatabaseRecordData,
} from "@/lib/server/admin-database";
import {
  canAccessAdminDatabaseTable,
  shouldLimitEventFighterIntakesToCurrentEvent,
} from "@/lib/server/admin-access";
import { requireAdminSessionIdentity } from "@/lib/server/admin-session";

import styles from "./page.module.css";

type AdminDatabaseRecordPageProps = {
  params: Promise<{
    tableId: string;
    rowId: string;
  }>;
};

export async function generateMetadata({
  params,
}: Readonly<AdminDatabaseRecordPageProps>): Promise<Metadata> {
  const { tableId } = await params;
  const table = getAdminDatabaseTableMeta(tableId);

  return {
    title: table ? `Emitente | ${table.label}` : "Emitente | Admin Banco",
    robots: {
      index: false,
      follow: false,
    },
  };
}

export const dynamic = "force-dynamic";

export default async function AdminDatabaseRecordPage({
  params,
}: Readonly<AdminDatabaseRecordPageProps>) {
  const { tableId, rowId } = await params;

  if (!isAdminDatabaseTableId(tableId)) {
    notFound();
  }

  const identity = await requireAdminSessionIdentity(`/admin/database/${tableId}/${rowId}`);

  if (!canAccessAdminDatabaseTable(identity.role, tableId)) {
    notFound();
  }

  const data = await loadAdminDatabaseRecordData(tableId, rowId, {
    limitEventFighterIntakesToCurrentEvent: shouldLimitEventFighterIntakesToCurrentEvent(
      identity.role,
    ),
  });

  if (!data) {
    notFound();
  }

  const canEditFighterApplicationInterest =
    tableId === "fighter-applications" &&
    data.databaseConfigured &&
    identity.role !== "auditor";

  return (
    <main className={styles.page}>
      <LandingMotionController />
      <AdminTopbar active="database" role={identity.role} />

      <section className={styles.content}>
        <div className={styles.shell}>
          <div className={styles.breadcrumbs}>
            <Link className={styles.backLink} href="/admin/database">
              Visão geral
            </Link>
            <Link className={styles.backLink} href={`/admin/database/${tableId}`}>
              {data.table.label}
            </Link>
          </div>

          <header className={styles.header}>
            <div className={styles.copy}>
              <p className={styles.eyebrow}>Registro completo</p>
              <h1>{data.title}</h1>
              <p>{data.subtitle ?? data.table.description}</p>
            </div>

            <div className={styles.metaCard}>
              <span>ID do registro</span>
              <strong>{data.rowId}</strong>
            </div>
          </header>

          {canEditFighterApplicationInterest ? (
            <FighterApplicationInterestEditor
              applicationId={data.rowId}
              initialEditorialInterest={data.fighterApplicationEditorialInterest}
            />
          ) : null}

          <AdminDatabaseRecordView data={data} />
        </div>
      </section>
    </main>
  );
}
