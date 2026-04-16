import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminDatabaseRecordView } from "@/app/components/admin-database-record-view";
import { AdminDatabaseRecordCopyActions } from "@/app/components/admin-database-record-copy-actions";
import { AdminTopbar } from "@/app/components/admin-topbar";
import { LandingMotionController } from "@/app/components/landing-motion-controller";
import {
  type AdminDatabaseRecordCopyExport,
  getAdminDatabaseTableMeta,
  isAdminDatabaseTableId,
  loadAdminDatabaseRecordData,
} from "@/lib/server/admin-database";
import { requireAdminSessionIdentity } from "@/lib/server/admin-session";

import styles from "./page.module.css";

type AdminDatabaseRecordPageProps = {
  params: Promise<{
    tableId: string;
    rowId: string;
  }>;
};

function findFieldValue(
  data: Awaited<ReturnType<typeof loadAdminDatabaseRecordData>>,
  sectionTitle: string,
  fieldLabel: string,
) {
  const section = data?.sections.find((entry) => entry.title === sectionTitle);
  const field = section?.fields.find((entry) => entry.label === fieldLabel);

  if (field?.value === null || field?.value === undefined) {
    return "";
  }

  if (typeof field.value === "object") {
    return JSON.stringify(field.value);
  }

  return String(field.value)
    .replace(/\r\n/g, "\n")
    .replace(/[\t\r\n]+/g, " ")
    .trim();
}

function buildFallbackCopyExports(
  data: NonNullable<Awaited<ReturnType<typeof loadAdminDatabaseRecordData>>>,
): AdminDatabaseRecordCopyExport[] {
  if (data.table.id !== "event-fighter-intakes") {
    return [];
  }

  const narratives = [
    findFieldValue(data, "Narrativas", "Histórico competitivo"),
    findFieldValue(data, "Narrativas", "Títulos"),
    findFieldValue(data, "Narrativas", "História de vida"),
    findFieldValue(data, "Narrativas", "História engraçada"),
    findFieldValue(data, "Narrativas", "Curiosidades"),
    findFieldValue(data, "Narrativas", "Hobbies"),
  ];

  return [
    {
      id: "google-sheets-narratives-row-fallback",
      label: "Copiar narrativas",
      description:
        "Fallback baseado no que o admin exibiu na tela. Cole nas 6 colunas de narrativas da planilha.",
      content: narratives.join("\t"),
    },
  ];
}

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

  await requireAdminSessionIdentity(`/admin/database/${tableId}/${rowId}`);

  const data = await loadAdminDatabaseRecordData(tableId, rowId);

  if (!data) {
    notFound();
  }

  const copyExports =
    data.copyExports && data.copyExports.length ? data.copyExports : buildFallbackCopyExports(data);

  return (
    <main className={styles.page}>
      <LandingMotionController />
      <AdminTopbar active="database" />

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

          {data.sections.length ? (
            <AdminDatabaseRecordCopyActions exports={copyExports} sections={data.sections} />
          ) : null}

          <AdminDatabaseRecordView data={data} />
        </div>
      </section>
    </main>
  );
}
