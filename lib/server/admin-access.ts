import "server-only";

import type { AdminDatabaseTableId } from "@/lib/server/admin-database";

export type AdminBackofficeRole = "admin" | "operator" | "auditor" | "public_relations";

const AUDITOR_DATABASE_TABLE_IDS: readonly AdminDatabaseTableId[] = [
  "fighter-applications",
  "event-fighter-intakes",
];

const PUBLIC_RELATIONS_DATABASE_TABLE_IDS: readonly AdminDatabaseTableId[] = [
  "newsletter-subscriptions",
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
  if (role === "auditor" || role === "public_relations") {
    return "/admin/database";
  }

  return "/admin/fantasy";
}

export function canAccessFantasyAdmin(role: AdminBackofficeRole) {
  return role !== "auditor" && role !== "public_relations";
}

export function getVisibleAdminDatabaseTableIds(
  role: AdminBackofficeRole,
): readonly AdminDatabaseTableId[] {
  if (role === "auditor") {
    return AUDITOR_DATABASE_TABLE_IDS;
  }

  if (role === "public_relations") {
    return PUBLIC_RELATIONS_DATABASE_TABLE_IDS;
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
  return role === "auditor" || role === "public_relations";
}
