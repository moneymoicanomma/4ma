import "server-only";

import type { AdminDatabaseTableId } from "@/lib/server/admin-database";

export type AdminBackofficeRole = "admin" | "operator" | "auditor";

const AUDITOR_DATABASE_TABLE_IDS: readonly AdminDatabaseTableId[] = [
  "fighter-applications",
  "event-fighter-intakes",
];

const FULL_DATABASE_TABLE_IDS: readonly AdminDatabaseTableId[] = [
  "contact-messages",
  "newsletter-subscriptions",
  "partner-inquiries",
  "fighter-applications",
  "event-fighter-intakes",
  "fantasy-entries",
];

export function getAdminDefaultRedirectPathForRole(role: AdminBackofficeRole) {
  if (role === "auditor") {
    return "/admin/database";
  }

  return "/admin/fantasy";
}

export function canAccessFantasyAdmin(role: AdminBackofficeRole) {
  return role !== "auditor";
}

export function getVisibleAdminDatabaseTableIds(
  role: AdminBackofficeRole,
): readonly AdminDatabaseTableId[] {
  if (role === "auditor") {
    return AUDITOR_DATABASE_TABLE_IDS;
  }

  return FULL_DATABASE_TABLE_IDS;
}

export function canAccessAdminDatabaseTable(
  role: AdminBackofficeRole,
  tableId: AdminDatabaseTableId,
) {
  return getVisibleAdminDatabaseTableIds(role).includes(tableId);
}

export function shouldLimitEventFighterIntakesToCurrentEvent(role: AdminBackofficeRole) {
  return role === "auditor";
}
