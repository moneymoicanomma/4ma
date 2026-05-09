"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { BRAZILIAN_STATES } from "@/lib/contracts/brazilian-states";
import {
  FIGHTER_APPLICATION_EDITORIAL_INTEREST_FILTER_OPTIONS,
  FIGHTER_APPLICATION_EDITORIAL_INTEREST_BUTTONS,
  filterFighterApplicationRows,
  isFighterRecordFilterValid,
  normalizeFighterApplicationEditorialInterest,
  sortFighterApplicationRows,
  type FighterApplicationAdminListRow,
  type FighterApplicationFilters,
  type FighterApplicationSort,
} from "@/lib/admin/fighter-application-list";

import tableStyles from "./admin-database-table-view.module.css";
import styles from "./fighter-application-admin-controls.module.css";

type AdminTableColumn = {
  key: string;
  label: string;
};

type SaveResponse = {
  ok?: boolean;
  message?: string;
  editorialInterest?: string | null;
};

type DeleteResponse = {
  ok?: boolean;
  message?: string;
  deletedApplicationId?: string;
};

type FighterApplicationInterestInlineEditorProps = {
  applicationId: string;
  initialEditorialInterest: string | null | undefined;
  rowLabel: string;
};

type FighterApplicationDeleteButtonProps = {
  applicationId: string;
  rowLabel: string;
};

type FighterApplicationRowActionsProps = FighterApplicationDeleteButtonProps & {
  detailHref: string;
  detailLabel: string;
  detailLinkClassName?: string;
};

type FighterApplicationsAdminTableProps = {
  columns: AdminTableColumn[];
  rows: FighterApplicationAdminListRow[];
  detailHrefBase: string;
};

function normalizeSelectValue(value: string | null | undefined) {
  return normalizeFighterApplicationEditorialInterest(value) ?? "";
}

function getRowLabel(row: FighterApplicationAdminListRow) {
  return (
    [row.fighterApplication?.fullName, row.fighterApplication?.nickname]
      .filter(Boolean)
      .join(" / ") ||
    row.cells.fighter ||
    "este cadastro"
  );
}

function emptyFilters(): FighterApplicationFilters {
  return {
    name: "",
    city: "",
    state: "",
    weightClass: "",
    editorialInterest: "",
    minRecord: "",
    maxRecord: "",
  };
}

function buildWeightClassOptions(rows: readonly FighterApplicationAdminListRow[]) {
  const options = new Map<string, string>();

  for (const row of rows) {
    const value = row.fighterApplication?.weightClass?.trim();

    if (value) {
      options.set(value, row.cells.weightClass || value);
    }
  }

  return Array.from(options, ([value, label]) => ({ value, label })).sort((left, right) =>
    left.label.localeCompare(right.label, "pt-BR", {
      numeric: true,
      sensitivity: "base",
    }),
  );
}

export function FighterApplicationInterestInlineEditor({
  applicationId,
  initialEditorialInterest,
  rowLabel,
}: Readonly<FighterApplicationInterestInlineEditorProps>) {
  const router = useRouter();
  const [currentValue, setCurrentValue] = useState(normalizeSelectValue(initialEditorialInterest));
  const [savedValue, setSavedValue] = useState(normalizeSelectValue(initialEditorialInterest));
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  function saveEditorialInterest(nextValue: string) {
    if (isPending || nextValue === savedValue) {
      setCurrentValue(nextValue);
      return;
    }

    const previousValue = savedValue;

    setCurrentValue(nextValue);
    setFeedback(null);

    startTransition(async () => {
      try {
        const response = await fetch(
          `/api/admin/fighter-applications/${applicationId}/interest`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              editorialInterest: nextValue || null,
            }),
          },
        );

        const payload = (await response.json().catch(() => null)) as SaveResponse | null;

        if (!response.ok || !payload?.ok) {
          throw new Error(payload?.message ?? "Não foi possível salvar agora.");
        }

        const normalizedSavedValue = normalizeSelectValue(payload.editorialInterest);

        setSavedValue(normalizedSavedValue);
        setCurrentValue(normalizedSavedValue);
        setFeedback({
          tone: "success",
          message: payload.message ?? "Classificação atualizada.",
        });
        router.refresh();
      } catch (error) {
        setCurrentValue(previousValue);
        setFeedback({
          tone: "error",
          message: error instanceof Error ? error.message : "Não foi possível salvar agora.",
        });
      }
    });
  }

  return (
    <div className={styles.interestControl}>
      <select
        aria-label={`Interesse MMMMA de ${rowLabel}`}
        className={styles.interestSelect}
        disabled={isPending}
        value={currentValue}
        onChange={(event) => saveEditorialInterest(event.target.value)}
      >
        {FIGHTER_APPLICATION_EDITORIAL_INTEREST_BUTTONS.map((option) => (
          <option key={option.value || "sem-classificacao"} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {feedback ? (
        <p
          className={
            feedback.tone === "error"
              ? `${styles.feedback} ${styles.feedbackError}`
              : styles.feedback
          }
          role="status"
        >
          {feedback.message}
        </p>
      ) : null}
    </div>
  );
}

export function FighterApplicationDeleteButton({
  applicationId,
  rowLabel,
}: Readonly<FighterApplicationDeleteButtonProps>) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  function deleteApplication() {
    if (isPending) {
      return;
    }

    const confirmed = window.confirm(
      `Excluir o cadastro de ${rowLabel}? Esta ação não pode ser desfeita.`,
    );

    if (!confirmed) {
      return;
    }

    setFeedback(null);

    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/fighter-applications/${applicationId}`, {
          method: "DELETE",
        });
        const payload = (await response.json().catch(() => null)) as DeleteResponse | null;

        if (!response.ok || !payload?.ok) {
          throw new Error(payload?.message ?? "Não foi possível excluir agora.");
        }

        setFeedback({
          tone: "success",
          message: payload.message ?? "Cadastro excluído.",
        });
        router.refresh();
      } catch (error) {
        setFeedback({
          tone: "error",
          message: error instanceof Error ? error.message : "Não foi possível excluir agora.",
        });
      }
    });
  }

  return (
    <div className={styles.deleteControl}>
      <button
        className={styles.deleteButton}
        disabled={isPending}
        type="button"
        onClick={deleteApplication}
      >
        {isPending ? "Excluindo..." : "Excluir"}
      </button>

      {feedback ? (
        <p
          className={
            feedback.tone === "error"
              ? `${styles.feedback} ${styles.feedbackError}`
              : styles.feedback
          }
          role="status"
        >
          {feedback.message}
        </p>
      ) : null}
    </div>
  );
}

export function FighterApplicationRowActions({
  applicationId,
  rowLabel,
  detailHref,
  detailLabel,
  detailLinkClassName,
}: Readonly<FighterApplicationRowActionsProps>) {
  return (
    <div className={styles.rowActions}>
      <Link className={detailLinkClassName} href={detailHref}>
        {detailLabel}
      </Link>
      <FighterApplicationDeleteButton applicationId={applicationId} rowLabel={rowLabel} />
    </div>
  );
}

export function FighterApplicationsAdminTable({
  columns,
  rows,
  detailHrefBase,
}: Readonly<FighterApplicationsAdminTableProps>) {
  const [filters, setFilters] = useState<FighterApplicationFilters>(() => emptyFilters());
  const [sort, setSort] = useState<FighterApplicationSort | null>(null);
  const weightClassOptions = useMemo(() => buildWeightClassOptions(rows), [rows]);
  const filteredRows = useMemo(() => filterFighterApplicationRows(rows, filters), [filters, rows]);
  const sortedRows = useMemo(
    () => sortFighterApplicationRows(filteredRows, sort),
    [filteredRows, sort],
  );
  const hasActiveFilters = Object.values(filters).some((value) => value.trim());
  const hasInvalidRecordFilter =
    !isFighterRecordFilterValid(filters.minRecord) ||
    !isFighterRecordFilterValid(filters.maxRecord);

  function updateFilter(key: keyof FighterApplicationFilters, value: string) {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [key]: value,
    }));
  }

  function toggleSort(columnKey: string) {
    setSort((currentSort) => {
      if (currentSort?.key === columnKey) {
        return {
          key: columnKey,
          direction: currentSort.direction === "asc" ? "desc" : "asc",
        };
      }

      return {
        key: columnKey,
        direction: "asc",
      };
    });
  }

  function getColumnSortDirection(columnKey: string) {
    if (sort?.key !== columnKey) {
      return "none";
    }

    return sort.direction === "asc" ? "ascending" : "descending";
  }

  return (
    <>
      <section className={styles.filters} aria-label="Filtros de cadastro de lutadores">
        <div className={styles.filterGrid}>
          <label className={styles.filterField}>
            <span>Nome</span>
            <input
              className={styles.filterInput}
              placeholder="Nome ou apelido"
              type="search"
              value={filters.name}
              onChange={(event) => updateFilter("name", event.target.value)}
            />
          </label>

          <label className={styles.filterField}>
            <span>Cidade</span>
            <input
              className={styles.filterInput}
              placeholder="Cidade"
              type="search"
              value={filters.city}
              onChange={(event) => updateFilter("city", event.target.value)}
            />
          </label>

          <label className={styles.filterField}>
            <span>Estado</span>
            <select
              className={styles.filterSelect}
              value={filters.state}
              onChange={(event) => updateFilter("state", event.target.value)}
            >
              <option value="">Todos</option>
              {BRAZILIAN_STATES.map((state) => (
                <option key={state.code} value={state.code}>
                  {state.code}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.filterField}>
            <span>Categoria</span>
            <select
              className={styles.filterSelect}
              value={filters.weightClass}
              onChange={(event) => updateFilter("weightClass", event.target.value)}
            >
              <option value="">Todas</option>
              {weightClassOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.filterField}>
            <span>Interesse MMMMA</span>
            <select
              className={styles.filterSelect}
              value={filters.editorialInterest}
              onChange={(event) => updateFilter("editorialInterest", event.target.value)}
            >
              <option value="">Todos</option>
              {FIGHTER_APPLICATION_EDITORIAL_INTEREST_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.filterField}>
            <span>Cartel mínimo</span>
            <input
              className={styles.filterInput}
              inputMode="numeric"
              placeholder="0-3"
              value={filters.minRecord}
              onChange={(event) => updateFilter("minRecord", event.target.value)}
            />
          </label>

          <label className={styles.filterField}>
            <span>Cartel máximo</span>
            <input
              className={styles.filterInput}
              inputMode="numeric"
              placeholder="12-0"
              value={filters.maxRecord}
              onChange={(event) => updateFilter("maxRecord", event.target.value)}
            />
          </label>

          <button
            className={styles.resetButton}
            disabled={!hasActiveFilters}
            type="button"
            onClick={() => setFilters(emptyFilters())}
          >
            Limpar filtros
          </button>
        </div>

        <div className={styles.filterFooter}>
          <span className={styles.filterMeta}>
            {sortedRows.length} de {rows.length} cadastros
          </span>
          {hasInvalidRecordFilter ? (
            <p className={styles.recordHint} role="status">
              Use cartel no formato 0-3 ou 12-0.
            </p>
          ) : null}
        </div>
      </section>

      {sortedRows.length > 0 ? (
        <div className={tableStyles.tableScroller}>
          <table className={tableStyles.table}>
            <thead>
              <tr>
                {columns.map((column) => (
                  <th
                    aria-sort={getColumnSortDirection(column.key)}
                    key={`fighter-applications-${column.key}`}
                    scope="col"
                  >
                    <button
                      className={styles.sortButton}
                      type="button"
                      onClick={() => toggleSort(column.key)}
                    >
                      <span>{column.label}</span>
                      <span aria-hidden="true" className={styles.sortIcon}>
                        {sort?.key === column.key
                          ? sort.direction === "asc"
                            ? "▲"
                            : "▼"
                          : "↕"}
                      </span>
                    </button>
                  </th>
                ))}
                <th scope="col">Ações</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row) => {
                const rowLabel = getRowLabel(row);
                const detailHref = `${detailHrefBase}/${row.id}`;

                return (
                  <tr key={row.id}>
                    {columns.map((column) => {
                      const cellValue = row.cells[column.key] ?? "—";

                      return (
                        <td key={`${row.id}-${column.key}`}>
                          {column.key === "fighter" ? (
                            <Link className={tableStyles.primaryCellLink} href={detailHref}>
                              {cellValue}
                            </Link>
                          ) : column.key === "editorialInterest" ? (
                            <FighterApplicationInterestInlineEditor
                              applicationId={row.id}
                              initialEditorialInterest={
                                row.fighterApplication?.editorialInterest ?? cellValue
                              }
                              rowLabel={rowLabel}
                            />
                          ) : (
                            cellValue
                          )}
                        </td>
                      );
                    })}
                    <td>
                      <FighterApplicationRowActions
                        applicationId={row.id}
                        detailHref={detailHref}
                        detailLabel="Ver perfil"
                        detailLinkClassName={tableStyles.detailLink}
                        rowLabel={rowLabel}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={styles.emptyFilteredState}>
          <strong>Nenhum cadastro encontrado.</strong>
          <span>Ajuste os filtros para ampliar a busca.</span>
        </div>
      )}
    </>
  );
}
