import type { AdminDatabaseOverview } from "@/lib/server/admin-database";

import styles from "./admin-database-dashboard.module.css";

const numberFormatter = new Intl.NumberFormat("pt-BR");

type AdminDatabaseDashboardProps = {
  overview: AdminDatabaseOverview;
};

export function AdminDatabaseDashboard({
  overview
}: Readonly<AdminDatabaseDashboardProps>) {
  if (!overview.databaseConfigured) {
    return (
      <div className={styles.emptyState}>
        <span className={styles.emptyEyebrow}>Banco indisponível</span>
        <h2>Conecta o banco para liberar a leitura simplificada das tabelas.</h2>
        <p>
          O menu foi preparado, mas a aplicação ainda não encontrou um banco configurado neste
          ambiente.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.dashboard}>
      {overview.unavailableTables > 0 ? (
        <div className={styles.warningBanner}>
          {overview.unavailableTables === 1
            ? "Uma tabela não pôde ser lida no ambiente atual."
            : `${numberFormatter.format(overview.unavailableTables)} tabelas não puderam ser lidas no ambiente atual.`}
        </div>
      ) : null}

      <nav aria-label="Atalhos das tabelas" className={styles.anchorMenu}>
        {overview.tables.map((table) => (
          <a
            className={table.errorMessage ? styles.anchorLinkMuted : styles.anchorLink}
            href={`#${table.id}`}
            key={table.id}
          >
            <strong>{table.label}</strong>
            <span>
              {table.totalRows === null
                ? "Sem leitura"
                : `${numberFormatter.format(table.totalRows)} registros`}
            </span>
          </a>
        ))}
      </nav>

      <div className={styles.tableList}>
        {overview.tables.map((table) => (
          <section className={styles.tableCard} id={table.id} key={table.id}>
            <header className={styles.tableHeader}>
              <div className={styles.tableCopy}>
                <span className={styles.tableName}>{table.tableName}</span>
                <h2>{table.label}</h2>
                <p>{table.description}</p>
              </div>

              <div className={styles.tableMetrics}>
                <div className={styles.metricCard}>
                  <span>Registros</span>
                  <strong>{table.totalRows === null ? "—" : numberFormatter.format(table.totalRows)}</strong>
                </div>
                <div className={styles.metricCard}>
                  <span>Última atividade</span>
                  <strong>{table.lastActivityAt ?? "Sem histórico"}</strong>
                </div>
              </div>
            </header>

            {table.statusCounts.length > 0 ? (
              <div className={styles.statusRow}>
                {table.statusCounts.map((statusCount) => (
                  <span className={styles.statusChip} key={`${table.id}-${statusCount.label}`}>
                    {statusCount.label}: {numberFormatter.format(statusCount.value)}
                  </span>
                ))}
              </div>
            ) : null}

            {table.errorMessage ? (
              <div className={styles.errorState}>
                <strong>Leitura indisponível</strong>
                <p>{table.errorMessage}</p>
              </div>
            ) : table.rows.length > 0 ? (
              <>
                <p className={styles.previewLabel}>{table.previewLabel}</p>

                <div className={styles.tableScroller}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        {table.columns.map((column) => (
                          <th key={`${table.id}-${column.key}`} scope="col">
                            {column.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {table.rows.map((row) => (
                        <tr key={row.id}>
                          {table.columns.map((column) => (
                            <td key={`${row.id}-${column.key}`}>{row.cells[column.key] ?? "—"}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className={styles.emptyTableState}>
                <strong>Sem registros por aqui ainda.</strong>
                <p>Quando novas linhas entrarem nessa tabela, o preview aparece automaticamente.</p>
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
