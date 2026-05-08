# Public Relations Admin Role Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a distinct Relações Públicas admin role with auditor-style database access plus newsletter records.

**Architecture:** Treat `public_relations` as a first-class backoffice role in TypeScript auth types, persisted database roles, fallback env credentials, and centralized access helpers. Keep the role read-oriented by routing it to `/admin/database`, hiding Fantasy navigation, and allowing only `fighter-applications`, `event-fighter-intakes`, and `newsletter-subscriptions`.

**Tech Stack:** Next.js App Router, TypeScript, PostgreSQL migrations, existing `npm run check` verification.

---

## File Structure

- Modify `lib/admin/auth.ts`: add `public_relations` to admin auth role parsing, session payload validation, and fallback credential env parsing.
- Modify `lib/server/admin-access.ts`: add the new backoffice role and its allowed database tables/default redirect/Fantasy restrictions.
- Modify `lib/server/admin-session.ts`: allow database-backed `public_relations` sessions.
- Modify `lib/server/auth-store.ts`: allow `public_relations` accounts in app auth role types.
- Modify `app/api/admin/session/route.ts`: accept `public_relations` logins for database auth and fallback redirects.
- Modify `app/admin/login/page.tsx`: recognize existing `public_relations` sessions.
- Modify `app/admin/database/[tableId]/[rowId]/page.tsx`: keep fighter application editorial edits limited to `admin` and `operator`.
- Modify `app/components/admin-topbar.tsx`: show only database navigation for read-only database roles.
- Modify `.env.example`: document fallback env support for the PR login.
- Create `db/migrations/0012_public_relations_admin_role.sql`: add `public_relations` to `app.account_role_enum`.

## Task 1: Add Shared Role Support

**Files:**
- Modify: `lib/admin/auth.ts`
- Modify: `lib/server/auth-store.ts`
- Modify: `lib/server/admin-session.ts`
- Modify: `app/api/admin/session/route.ts`
- Modify: `app/admin/login/page.tsx`

- [ ] **Step 1: Update auth role unions and allowlists**

Add `public_relations` to the admin auth role union, account role union, session token validation allowlist, and all backoffice `acceptedRoles` arrays.

Expected code shape:

```ts
export type AdminAuthRole = "admin" | "operator" | "auditor" | "public_relations";
```

```ts
type AccountRole = "admin" | "operator" | "auditor" | "public_relations" | "fighter";
```

```ts
acceptedRoles: ["admin", "operator", "auditor", "public_relations"],
```

- [ ] **Step 2: Extend fallback role parsing**

Update `normalizeAdminRole` in `lib/admin/auth.ts` so `public_relations` is treated as a valid configured role.

Expected code shape:

```ts
if (
  normalizedValue === "auditor" ||
  normalizedValue === "operator" ||
  normalizedValue === "public_relations"
) {
  return normalizedValue;
}
```

- [ ] **Step 3: Add dedicated fallback env pair**

Add `ADMIN_PUBLIC_RELATIONS_USERNAME` and `ADMIN_PUBLIC_RELATIONS_PASSWORD` parsing to `getAdminAuthConfig()`.

Expected code shape:

```ts
appendAdminCredential(credentials, seenNormalizedIdentifiers, {
  username: normalizeEnvValue(process.env.ADMIN_PUBLIC_RELATIONS_USERNAME),
  password: normalizeEnvValue(process.env.ADMIN_PUBLIC_RELATIONS_PASSWORD),
  role: "public_relations",
});
```

## Task 2: Add Access Rules

**Files:**
- Modify: `lib/server/admin-access.ts`
- Modify: `app/admin/database/[tableId]/[rowId]/page.tsx`
- Modify: `app/components/admin-topbar.tsx`

- [ ] **Step 1: Add role-specific table list**

Create a table list for Relações Públicas that includes exactly newsletter subscriptions, fighter applications, and event fighter intakes.

Expected code shape:

```ts
const PUBLIC_RELATIONS_DATABASE_TABLE_IDS: readonly AdminDatabaseTableId[] = [
  "newsletter-subscriptions",
  "fighter-applications",
  "event-fighter-intakes",
];
```

- [ ] **Step 2: Route and restrict read-only roles**

Update `getAdminDefaultRedirectPathForRole`, `canAccessFantasyAdmin`, `getVisibleAdminDatabaseTableIds`, and `shouldLimitEventFighterIntakesToCurrentEvent` so `public_relations` behaves like auditor except for the expanded table list.

Expected code shape:

```ts
if (role === "auditor" || role === "public_relations") {
  return "/admin/database";
}
```

```ts
return role !== "auditor" && role !== "public_relations";
```

- [ ] **Step 3: Hide Fantasy navigation**

Update `AdminTopbar` to filter Fantasy for both `auditor` and `public_relations`.

Expected code shape:

```ts
const isDatabaseOnlyRole = role === "auditor" || role === "public_relations";
const navigationItems = isDatabaseOnlyRole
  ? adminNavigationItems.filter((item) => item.id === "database")
  : adminNavigationItems;
```

- [ ] **Step 4: Keep fighter application editorial edits write-role only**

Update the admin database record page so the inline fighter application editorial editor appears only for `admin` and `operator`, matching the API write permission.

Expected code shape:

```ts
const canEditFighterApplicationInterest =
  tableId === "fighter-applications" &&
  data.databaseConfigured &&
  (identity.role === "admin" || identity.role === "operator");
```

## Task 3: Add Database Migration and Env Docs

**Files:**
- Create: `db/migrations/0012_public_relations_admin_role.sql`
- Modify: `.env.example`

- [ ] **Step 1: Add migration**

Create a safe migration for existing PostgreSQL environments.

Expected SQL:

```sql
begin;

alter type app.account_role_enum add value if not exists 'public_relations';

commit;
```

- [ ] **Step 2: Document fallback credentials**

Update `.env.example` so both JSON credentials and dedicated role pairs mention `public_relations`.

Expected env example:

```dotenv
# ADMIN_CREDENTIALS_JSON=[{"username":"admin@seudominio.com","password":"senha-admin","role":"admin"},{"username":"auditoria@seudominio.com","password":"senha-auditoria","role":"auditor"},{"username":"rp@seudominio.com","password":"senha-rp","role":"public_relations"}]
# ADMIN_PUBLIC_RELATIONS_USERNAME=rp@seudominio.com
# ADMIN_PUBLIC_RELATIONS_PASSWORD=senha-rp
```

## Task 4: Verify

**Files:**
- Read: all modified files

- [ ] **Step 1: Search for missed allowlists**

Run:

```bash
rg -n 'acceptedRoles|AdminAuthRole|AdminBackofficeRole|auditor|operator|account_role_enum|ADMIN_PUBLIC_RELATIONS|public_relations' lib app db .env.example
```

Expected: every backoffice role allowlist that includes `auditor` also includes `public_relations`, and no type error remains.

- [ ] **Step 2: Run full project check**

Run:

```bash
npm run check
```

Expected: typecheck and build complete successfully.

- [ ] **Step 3: Review git diff**

Run:

```bash
git diff --check
git diff --stat
```

Expected: no whitespace errors; changed files match this plan.

## Self-Review

Spec coverage: the plan covers login, fallback credentials, persisted account role, default redirect, database visibility, Fantasy denial, migration, and verification.

Placeholder scan: no placeholder implementation steps remain.

Type consistency: the role name is consistently `public_relations` across TypeScript, SQL, and env examples.
