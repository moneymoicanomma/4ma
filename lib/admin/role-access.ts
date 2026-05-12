import type { AdminDatabaseTableId } from "@/lib/server/admin-database";

export type AdminBackofficeRole =
  | "admin"
  | "operator"
  | "auditor"
  | "public_relations"
  | "editor";

const AUDITOR_DATABASE_TABLE_IDS: readonly AdminDatabaseTableId[] = [
  "fighter-applications",
  "event-fighter-intakes",
];

const PUBLIC_RELATIONS_DATABASE_TABLE_IDS: readonly AdminDatabaseTableId[] = [
  "newsletter-subscriptions",
  "press-credentials",
  "fighter-applications",
  "event-fighter-intakes",
];

const FULL_DATABASE_TABLE_IDS: readonly AdminDatabaseTableId[] = [
  "contact-messages",
  "newsletter-subscriptions",
  "partner-inquiries",
  "fighter-applications",
  "event-fighter-intakes",
  "press-credentials",
  "fantasy-entries",
];

export function getAdminDefaultRedirectPathForRole(role: AdminBackofficeRole) {
  if (role === "auditor" || role === "public_relations") {
    return "/admin/database";
  }

  if (role === "editor") {
    return "/admin/blog";
  }

  return "/admin/fantasy";
}

export function canAccessFantasyAdmin(role: AdminBackofficeRole) {
  return role === "admin" || role === "operator";
}

export function canAccessBlogAdmin(role: AdminBackofficeRole) {
  return role === "admin" || role === "editor" || role === "public_relations";
}

export function canAccessAnyDatabase(role: AdminBackofficeRole) {
  return role !== "editor";
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

  if (role === "editor") {
    return [];
  }

  return FULL_DATABASE_TABLE_IDS;
}

export function canAccessAdminDatabaseTable(
  role: AdminBackofficeRole,
  tableId: AdminDatabaseTableId,
) {
  return canAccessAnyDatabase(role) && getVisibleAdminDatabaseTableIds(role).includes(tableId);
}

export function shouldLimitEventFighterIntakesToCurrentEvent(role: AdminBackofficeRole) {
  return role === "auditor" || role === "public_relations";
}
