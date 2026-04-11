export const BRAZILIAN_STATES = [
  { code: "AC", name: "Acre" },
  { code: "AL", name: "Alagoas" },
  { code: "AP", name: "Amapá" },
  { code: "AM", name: "Amazonas" },
  { code: "BA", name: "Bahia" },
  { code: "CE", name: "Ceará" },
  { code: "DF", name: "Distrito Federal" },
  { code: "ES", name: "Espírito Santo" },
  { code: "GO", name: "Goiás" },
  { code: "MA", name: "Maranhão" },
  { code: "MT", name: "Mato Grosso" },
  { code: "MS", name: "Mato Grosso do Sul" },
  { code: "MG", name: "Minas Gerais" },
  { code: "PA", name: "Pará" },
  { code: "PB", name: "Paraíba" },
  { code: "PR", name: "Paraná" },
  { code: "PE", name: "Pernambuco" },
  { code: "PI", name: "Piauí" },
  { code: "RJ", name: "Rio de Janeiro" },
  { code: "RN", name: "Rio Grande do Norte" },
  { code: "RS", name: "Rio Grande do Sul" },
  { code: "RO", name: "Rondônia" },
  { code: "RR", name: "Roraima" },
  { code: "SC", name: "Santa Catarina" },
  { code: "SP", name: "São Paulo" },
  { code: "SE", name: "Sergipe" },
  { code: "TO", name: "Tocantins" }
] as const;

export type BrazilianStateCode = (typeof BRAZILIAN_STATES)[number]["code"];
export type BrazilianStateName = (typeof BRAZILIAN_STATES)[number]["name"];

function normalizeShortText(input: unknown) {
  return typeof input === "string" ? input.trim().replace(/\s+/g, " ") : "";
}

function normalizeSearchText(input: string) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function findBrazilianStateMatch(
  input: unknown
): (typeof BRAZILIAN_STATES)[number] | null {
  const normalizedInput = normalizeSearchText(normalizeShortText(input));

  if (!normalizedInput) {
    return null;
  }

  return (
    BRAZILIAN_STATES.find(
      (state) =>
        normalizeSearchText(state.name) === normalizedInput ||
        state.code.toLowerCase() === normalizedInput
    ) ?? null
  );
}

export function normalizeBrazilianState(input: unknown): BrazilianStateName | "" {
  return findBrazilianStateMatch(input)?.name ?? "";
}

export function getBrazilianStateCode(input: unknown): BrazilianStateCode | "" {
  return findBrazilianStateMatch(input)?.code ?? "";
}

export function findBrazilianStateSuggestions(query: string, limit = 6) {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) {
    return BRAZILIAN_STATES.slice(0, limit);
  }

  return BRAZILIAN_STATES.filter((state) => {
    const normalizedName = normalizeSearchText(state.name);
    const normalizedCode = state.code.toLowerCase();

    return (
      normalizedName.includes(normalizedQuery) || normalizedCode.startsWith(normalizedQuery)
    );
  }).slice(0, limit);
}
