import {
  canAccessFantasyAdmin,
  getAdminDefaultRedirectPathForRole,
  getVisibleAdminDatabaseTableIds,
  shouldLimitEventFighterIntakesToCurrentEvent,
  type AdminBackofficeRole,
} from "@/lib/server/admin-access";

const publicRelationsRole = "public_relations" satisfies AdminBackofficeRole;
const publicRelationsTableIds = getVisibleAdminDatabaseTableIds(publicRelationsRole);

if (getAdminDefaultRedirectPathForRole(publicRelationsRole) !== "/admin/database") {
  throw new Error("public_relations should land on the admin database.");
}

if (canAccessFantasyAdmin(publicRelationsRole)) {
  throw new Error("public_relations should not access Fantasy admin.");
}

if (!shouldLimitEventFighterIntakesToCurrentEvent(publicRelationsRole)) {
  throw new Error("public_relations should share auditor event-fighter intake limits.");
}

for (const tableId of [
  "newsletter-subscriptions",
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
