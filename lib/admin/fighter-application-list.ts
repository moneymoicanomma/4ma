export const FIGHTER_APPLICATION_EDITORIAL_INTEREST_OPTIONS = [
  { value: "interessante", label: "Interessante" },
  { value: "talvez_no_futuro", label: "Talvez no futuro" },
  { value: "nao_interessante", label: "Não interessante" },
  { value: "bizarro", label: "Bizarro" },
] as const;

export const FIGHTER_APPLICATION_EDITORIAL_INTEREST_BUTTONS = [
  { value: "", label: "Sem classificação" },
  ...FIGHTER_APPLICATION_EDITORIAL_INTEREST_OPTIONS,
] as const;

export type FighterApplicationEditorialInterest =
  (typeof FIGHTER_APPLICATION_EDITORIAL_INTEREST_OPTIONS)[number]["value"];

export type FighterApplicationAdminRowData = {
  fullName: string | null;
  nickname: string | null;
  city: string | null;
  stateCode: string | null;
  competitionHistory: string | null;
  editorialInterest: string | null;
};

export type FighterApplicationAdminListRow = {
  id: string;
  cells: Record<string, string>;
  fighterApplication?: FighterApplicationAdminRowData;
};

export type FighterApplicationFilters = {
  name: string;
  city: string;
  state: string;
  minRecord: string;
  maxRecord: string;
};

export type FighterRecord = {
  wins: number;
  losses: number;
  draws: number;
  totalFights: number;
};

const EDITORIAL_INTEREST_VALUE_SET = new Set<string>(
  FIGHTER_APPLICATION_EDITORIAL_INTEREST_OPTIONS.map((option) => option.value),
);
const EDITORIAL_INTEREST_LABEL_TO_VALUE = new Map(
  FIGHTER_APPLICATION_EDITORIAL_INTEREST_OPTIONS.map((option) => [
    normalizeSearchText(option.label),
    option.value,
  ]),
);
const recordPattern = /(?:^|[^\d])(\d{1,3})\s*[-x]\s*(\d{1,3})(?:\s*[-x]\s*(\d{1,3}))?(?=$|[^\d])/i;

function normalizeWhitespace(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeSearchText(value: string | null | undefined) {
  return normalizeWhitespace(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function getRowText(row: FighterApplicationAdminListRow, key: string) {
  return row.cells[key] ?? "";
}

function getFallbackStateCode(location: string) {
  const match = location.match(/,\s*([A-Z]{2})\s*$/i);

  return match ? match[1].toUpperCase() : "";
}

export function normalizeFighterApplicationEditorialInterest(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = normalizeSearchText(value).replace(/\s+/g, "_").replace(/-+/g, "_");

  if (!normalized) {
    return null;
  }

  if (EDITORIAL_INTEREST_VALUE_SET.has(normalized)) {
    return normalized as FighterApplicationEditorialInterest;
  }

  return EDITORIAL_INTEREST_LABEL_TO_VALUE.get(normalizeSearchText(value));
}

export function formatFighterApplicationEditorialInterest(value: string | null | undefined) {
  const normalized = normalizeFighterApplicationEditorialInterest(value);

  if (!normalized) {
    return "—";
  }

  return (
    FIGHTER_APPLICATION_EDITORIAL_INTEREST_OPTIONS.find((option) => option.value === normalized)
      ?.label ?? "—"
  );
}

export function parseFighterRecordFromText(value: string | null | undefined): FighterRecord | null {
  const normalized = normalizeWhitespace(value ?? "");

  if (!normalized) {
    return null;
  }

  const match = normalized.match(recordPattern);

  if (!match) {
    return null;
  }

  const wins = Number.parseInt(match[1]!, 10);
  const losses = Number.parseInt(match[2]!, 10);
  const draws = match[3] ? Number.parseInt(match[3], 10) : 0;

  if (![wins, losses, draws].every(Number.isFinite)) {
    return null;
  }

  return {
    wins,
    losses,
    draws,
    totalFights: wins + losses + draws,
  };
}

export function isFighterRecordFilterValid(value: string) {
  const normalized = normalizeWhitespace(value);

  return !normalized || parseFighterRecordFromText(normalized) !== null;
}

function compareFighterRecordByExperience(left: FighterRecord, right: FighterRecord) {
  const totalDiff = left.totalFights - right.totalFights;

  if (totalDiff !== 0) {
    return totalDiff;
  }

  const winsDiff = left.wins - right.wins;

  if (winsDiff !== 0) {
    return winsDiff;
  }

  return right.losses - left.losses;
}

function rowMatchesTextFilter(rowValue: string | null | undefined, filterValue: string) {
  const normalizedFilter = normalizeSearchText(filterValue);

  return !normalizedFilter || normalizeSearchText(rowValue).includes(normalizedFilter);
}

function getFighterNameSearchValue(row: FighterApplicationAdminListRow) {
  const rowData = row.fighterApplication;

  return [rowData?.fullName, rowData?.nickname, getRowText(row, "fighter")]
    .filter(Boolean)
    .join(" ");
}

function getFighterCitySearchValue(row: FighterApplicationAdminListRow) {
  return row.fighterApplication?.city ?? getRowText(row, "location").split(",")[0] ?? "";
}

function getFighterStateSearchValue(row: FighterApplicationAdminListRow) {
  return row.fighterApplication?.stateCode ?? getFallbackStateCode(getRowText(row, "location"));
}

function getFighterRecordSearchValue(row: FighterApplicationAdminListRow) {
  return row.fighterApplication?.competitionHistory ?? getRowText(row, "cartel");
}

export function filterFighterApplicationRows<Row extends FighterApplicationAdminListRow>(
  rows: readonly Row[],
  filters: FighterApplicationFilters,
) {
  const stateFilter = filters.state.trim().toUpperCase();
  const minRecord = parseFighterRecordFromText(filters.minRecord);
  const maxRecord = parseFighterRecordFromText(filters.maxRecord);

  return rows.filter((row) => {
    if (!rowMatchesTextFilter(getFighterNameSearchValue(row), filters.name)) {
      return false;
    }

    if (!rowMatchesTextFilter(getFighterCitySearchValue(row), filters.city)) {
      return false;
    }

    if (stateFilter && getFighterStateSearchValue(row).toUpperCase() !== stateFilter) {
      return false;
    }

    if (minRecord || maxRecord) {
      const rowRecord = parseFighterRecordFromText(getFighterRecordSearchValue(row));

      if (!rowRecord) {
        return false;
      }

      if (minRecord && compareFighterRecordByExperience(rowRecord, minRecord) < 0) {
        return false;
      }

      if (maxRecord && compareFighterRecordByExperience(rowRecord, maxRecord) > 0) {
        return false;
      }
    }

    return true;
  });
}
