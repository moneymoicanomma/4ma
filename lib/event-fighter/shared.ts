export function normalizeEventFighterEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isValidEventFighterEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
