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
export const FIGHTER_APPLICATION_NO_INTEREST_FILTER_VALUE = "__none";
export const FIGHTER_APPLICATION_EDITORIAL_INTEREST_FILTER_OPTIONS = [
  ...FIGHTER_APPLICATION_EDITORIAL_INTEREST_OPTIONS,
  { value: FIGHTER_APPLICATION_NO_INTEREST_FILTER_VALUE, label: "Sem classificação" },
] as const;

export type FighterApplicationEditorialInterest =
  (typeof FIGHTER_APPLICATION_EDITORIAL_INTEREST_OPTIONS)[number]["value"];

export type FighterApplicationAdminRowData = {
  fullName: string | null;
  nickname: string | null;
  weightClass: string | null;
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
  weightClass: string;
  editorialInterest: string;
  minAge: string;
  maxAge: string;
  minRecord: string;
  maxRecord: string;
};

export type FighterApplicationSort = {
  key: string;
  direction: "asc" | "desc";
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
const collator = new Intl.Collator("pt-BR", {
  numeric: true,
  sensitivity: "base",
});
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

function getFighterWeightClassSearchValue(row: FighterApplicationAdminListRow) {
  return row.fighterApplication?.weightClass ?? getRowText(row, "weightClass");
}

function getFighterStateSearchValue(row: FighterApplicationAdminListRow) {
  return row.fighterApplication?.stateCode ?? getFallbackStateCode(getRowText(row, "location"));
}

function getFighterRecordSearchValue(row: FighterApplicationAdminListRow) {
  return row.fighterApplication?.competitionHistory ?? getRowText(row, "cartel");
}

function getFighterInterestSearchValue(row: FighterApplicationAdminListRow) {
  return normalizeFighterApplicationEditorialInterest(
    row.fighterApplication?.editorialInterest ?? getRowText(row, "editorialInterest"),
  );
}

function getFighterAgeValue(row: FighterApplicationAdminListRow) {
  return parseNumberFromText(getRowText(row, "age"));
}

function parseNumberFromText(value: string | null | undefined) {
  const match = (value ?? "").match(/\d+/);

  return match ? Number.parseInt(match[0], 10) : null;
}

function compareNullableNumbers(left: number | null, right: number | null) {
  if (left === null && right === null) {
    return 0;
  }

  if (left === null) {
    return 1;
  }

  if (right === null) {
    return -1;
  }

  return left - right;
}

function compareNullableRecords(left: FighterRecord | null, right: FighterRecord | null) {
  if (left === null && right === null) {
    return 0;
  }

  if (left === null) {
    return 1;
  }

  if (right === null) {
    return -1;
  }

  return compareFighterRecordByExperience(left, right);
}

function getSortTextValue(row: FighterApplicationAdminListRow, key: string) {
  if (key === "fighter") {
    return getFighterNameSearchValue(row);
  }

  if (key === "weightClass") {
    return getRowText(row, "weightClass") || getFighterWeightClassSearchValue(row);
  }

  if (key === "editorialInterest") {
    return getRowText(row, "editorialInterest") || formatFighterApplicationEditorialInterest(
      row.fighterApplication?.editorialInterest,
    );
  }

  if (key === "location") {
    return getRowText(row, "location");
  }

  return getRowText(row, key);
}

export function filterFighterApplicationRows<Row extends FighterApplicationAdminListRow>(
  rows: readonly Row[],
  filters: FighterApplicationFilters,
) {
  const stateFilter = filters.state.trim().toUpperCase();
  const weightClassFilter = filters.weightClass.trim();
  const interestFilter = filters.editorialInterest.trim();
  const minAge = parseNumberFromText(filters.minAge);
  const maxAge = parseNumberFromText(filters.maxAge);
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

    if (weightClassFilter && getFighterWeightClassSearchValue(row) !== weightClassFilter) {
      return false;
    }

    if (interestFilter) {
      const rowInterest = getFighterInterestSearchValue(row);

      if (interestFilter === FIGHTER_APPLICATION_NO_INTEREST_FILTER_VALUE) {
        if (rowInterest !== null) {
          return false;
        }
      } else if (rowInterest !== interestFilter) {
        return false;
      }
    }

    if (minAge !== null || maxAge !== null) {
      const rowAge = getFighterAgeValue(row);

      if (rowAge === null) {
        return false;
      }

      if (minAge !== null && rowAge < minAge) {
        return false;
      }

      if (maxAge !== null && rowAge > maxAge) {
        return false;
      }
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

export function sortFighterApplicationRows<Row extends FighterApplicationAdminListRow>(
  rows: readonly Row[],
  sort: FighterApplicationSort | null,
) {
  if (!sort) {
    return [...rows];
  }

  const directionMultiplier = sort.direction === "asc" ? 1 : -1;

  return [...rows].sort((left, right) => {
    let comparison = 0;

    if (sort.key === "age") {
      comparison = compareNullableNumbers(
        parseNumberFromText(getRowText(left, "age")),
        parseNumberFromText(getRowText(right, "age")),
      );
    } else if (sort.key === "cartel") {
      comparison = compareNullableRecords(
        parseFighterRecordFromText(getFighterRecordSearchValue(left)),
        parseFighterRecordFromText(getFighterRecordSearchValue(right)),
      );
    } else {
      comparison = collator.compare(
        getSortTextValue(left, sort.key),
        getSortTextValue(right, sort.key),
      );
    }

    if (comparison === 0) {
      comparison = collator.compare(getFighterNameSearchValue(left), getFighterNameSearchValue(right));
    }

    return comparison * directionMultiplier;
  });
}
