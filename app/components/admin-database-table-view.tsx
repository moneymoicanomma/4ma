import Link from "next/link";

import type { AdminDatabaseTableData } from "@/lib/server/admin-database";

import styles from "./admin-database-table-view.module.css";

const numberFormatter = new Intl.NumberFormat("pt-BR");

type AdminDatabaseTableViewProps = {
  data: AdminDatabaseTableData;
};

function getRowDetailColumnKey(tableId: AdminDatabaseTableData["table"]["id"]) {
  switch (tableId) {
    case "contact-messages":
      return "fullName";
    case "newsletter-subscriptions":
      return "email";
    case "partner-inquiries":
      return "fullName";
    case "fighter-applications":
      return "fighter";
    case "event-fighter-intakes":
      return "fighter";
    case "fantasy-entries":
      return "displayName";
  }
}

function getDetailLinkLabel(tableId: AdminDatabaseTableData["table"]["id"]) {
  if (tableId === "fighter-applications" || tableId === "event-fighter-intakes") {
    return "Ver perfil";
  }

  return "Ver emitente";
}

function shouldRenderStatusSummary(tableId: AdminDatabaseTableData["table"]["id"]) {
  return tableId !== "fighter-applications";
}

export function AdminDatabaseTableView({
  data,
}: Readonly<AdminDatabaseTableViewProps>) {
  const detailColumnKey = getRowDetailColumnKey(data.table.id);

  if (!data.databaseConfigured) {
    return (
      <div className={styles.emptyState}>
        <strong>Leitura indisponível</strong>
        <p>{data.errorMessage ?? "Não foi possível carregar esta tabela neste ambiente."}</p>
      </div>
    );
  }

  if (data.rows.length === 0) {
    return (
      <div className={styles.emptyState}>
        <strong>Nenhum registro encontrado.</strong>
        <p>Quando novas linhas entrarem nessa tabela, elas vão aparecer aqui.</p>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.summaryRow}>
        <div className={styles.metricCard}>
          <span>Registros</span>
          <strong>{numberFormatter.format(data.totalRows)}</strong>
        </div>
        <div className={styles.metricCard}>
          <span>Última atividade</span>
          <strong>{data.lastActivityAt ?? "Sem histórico"}</strong>
        </div>
      </div>

      {shouldRenderStatusSummary(data.table.id) && data.statusCounts.length > 0 ? (
        <div className={styles.statusRow}>
          {data.statusCounts.map((statusCount) => (
            <span className={styles.statusChip} key={`${data.table.id}-${statusCount.label}`}>
              {statusCount.label}: {numberFormatter.format(statusCount.value)}
            </span>
          ))}
        </div>
      ) : null}

      <div className={styles.tableScroller}>
        <table className={styles.table}>
          <thead>
            <tr>
              {data.columns.map((column) => (
                <th key={`${data.table.id}-${column.key}`} scope="col">
                  {column.label}
                </th>
              ))}
              <th scope="col">Detalhe</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.id}>
                {data.columns.map((column) => {
                  const cellValue = row.cells[column.key] ?? "—";
                  const detailHref = `/admin/database/${data.table.id}/${row.id}`;

                  return (
                    <td key={`${row.id}-${column.key}`}>
                      {column.key === detailColumnKey ? (
                        <Link className={styles.primaryCellLink} href={detailHref}>
                          {cellValue}
                        </Link>
                      ) : (
                        cellValue
                      )}
                    </td>
                  );
                })}
                <td>
                  <Link className={styles.detailLink} href={`/admin/database/${data.table.id}/${row.id}`}>
                    {getDetailLinkLabel(data.table.id)}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
