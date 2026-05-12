import {
  canAccessAnyDatabase,
  canAccessBlogAdmin,
  canAccessFantasyAdmin,
  getAdminDefaultRedirectPathForRole,
  getVisibleAdminDatabaseTableIds,
  shouldLimitEventFighterIntakesToCurrentEvent,
  type AdminBackofficeRole,
} from "@/lib/admin/role-access";

const publicRelationsRole = "public_relations" satisfies AdminBackofficeRole;
const publicRelationsTableIds = getVisibleAdminDatabaseTableIds(publicRelationsRole);
const editorRole = "editor" satisfies AdminBackofficeRole;

if (getAdminDefaultRedirectPathForRole(publicRelationsRole) !== "/admin/database") {
  throw new Error("public_relations should land on the admin database.");
}

if (canAccessFantasyAdmin(publicRelationsRole)) {
  throw new Error("public_relations should not access Fantasy admin.");
}

if (!canAccessBlogAdmin(publicRelationsRole)) {
  throw new Error("public_relations should access Blog admin.");
}

if (!shouldLimitEventFighterIntakesToCurrentEvent(publicRelationsRole)) {
  throw new Error("public_relations should share auditor event-fighter intake limits.");
}

for (const tableId of [
  "newsletter-subscriptions",
  "press-credentials",
  "fighter-applications",
  "event-fighter-intakes",
] as const) {
  if (!publicRelationsTableIds.includes(tableId)) {
    throw new Error(`public_relations should see ${tableId}.`);
  }
}

for (const tableId of ["contact-messages", "partner-inquiries", "fantasy-entries"] as const) {
  if (publicRelationsTableIds.includes(tableId)) {
    throw new Error(`public_relations should not see ${tableId}.`);
  }
}

if (getAdminDefaultRedirectPathForRole(editorRole) !== "/admin/blog") {
  throw new Error("editor should land on the Blog admin.");
}

if (!canAccessBlogAdmin(editorRole)) {
  throw new Error("editor should access Blog admin.");
}

if (canAccessFantasyAdmin(editorRole)) {
  throw new Error("editor should not access Fantasy admin.");
}

if (canAccessAnyDatabase(editorRole)) {
  throw new Error("editor should not access admin database.");
}

if (getVisibleAdminDatabaseTableIds(editorRole).length > 0) {
  throw new Error("editor should not see database tables.");
}
