import type { AdminDatabaseRecordData } from "@/lib/server/admin-database";

import styles from "./admin-database-record-view.module.css";

type AdminDatabaseRecordViewProps = {
  data: AdminDatabaseRecordData;
};

function renderValue(value: unknown, path: string): React.ReactNode {
  if (
    value === null ||
    value === undefined ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  ) {
    return <span className={styles.emptyValue}>—</span>;
  }

  if (typeof value === "boolean") {
    return value ? "Sim" : "Não";
  }

  if (typeof value === "string" || typeof value === "number") {
    return <span className={styles.scalarValue}>{String(value)}</span>;
  }

  if (Array.isArray(value)) {
    return (
      <div className={styles.arrayList}>
        {value.map((item, index) => (
          <div className={styles.arrayCard} key={`${path}-${index}`}>
            {renderValue(item, `${path}-${index}`)}
          </div>
        ))}
      </div>
    );
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);

    if (entries.length === 0) {
      return <span className={styles.emptyValue}>—</span>;
    }

    return (
      <div className={styles.objectGrid}>
        {entries.map(([entryKey, entryValue]) => (
          <div className={styles.objectField} key={`${path}-${entryKey}`}>
            <span className={styles.objectLabel}>{entryKey}</span>
            <div className={styles.objectValue}>
              {renderValue(entryValue, `${path}-${entryKey}`)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return <span className={styles.scalarValue}>{String(value)}</span>;
}

export function AdminDatabaseRecordView({
  data,
}: Readonly<AdminDatabaseRecordViewProps>) {
  if (!data.databaseConfigured) {
    return (
      <div className={styles.emptyState}>
        <strong>Leitura indisponível</strong>
        <p>{data.errorMessage ?? "Não foi possível carregar este registro neste ambiente."}</p>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      {data.sections.map((section) => (
        <section className={styles.sectionCard} key={`${data.rowId}-${section.title}`}>
          <header className={styles.sectionHeader}>
            <span className={styles.sectionEyebrow}>Detalhe</span>
            <h2>{section.title}</h2>
          </header>

          <div className={styles.fieldList}>
            {section.fields.map((field) => (
              <div className={styles.fieldCard} key={`${section.title}-${field.label}`}>
                <span className={styles.fieldLabel}>{field.label}</span>
                <div className={styles.fieldValue}>
                  {renderValue(field.value, `${section.title}-${field.label}`)}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
