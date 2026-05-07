# Public Relations Admin Role Design

## Context

The admin backoffice currently supports `admin`, `operator`, and `auditor` roles. Auditors are routed to `/admin/database`, cannot access Fantasy, and see only athlete-facing operational tables.

Money Moicano MMA needs a separate Relações Públicas login with the same read-oriented access as the auditor plus newsletter records. This role should be distinguishable from the auditor in sessions, database accounts, environment fallback credentials, and future audit trails.

## Scope

Add a new `public_relations` backoffice role.

The role can:

- Log in through the normal admin login flow.
- Use `/admin/database` as its default admin destination.
- View `fighter-applications`.
- View `event-fighter-intakes`.
- View `newsletter-subscriptions`.

The role cannot:

- Access `/admin/fantasy`.
- Edit Fantasy events.
- Edit fighter application classifications.
- See unrelated admin database tables such as contact messages, partner inquiries, or fantasy entries.

## Architecture

The implementation should update the shared role definitions in the app, the fallback admin credential parser, and the database enum so that `public_relations` works both for persisted `app.accounts` users and environment-configured fallback users.

Permission logic should be centralized in `lib/server/admin-access.ts`. Relações Públicas should have its own table list rather than borrowing the auditor list, because newsletter access is intentionally different.

## Data Flow

On login, the admin session route accepts `public_relations` as a backoffice role. The resulting session stores that role and redirects to `/admin/database`.

Admin database pages then call the existing access helpers. Those helpers return only the three allowed table IDs for Relações Públicas. The topbar should show only the database navigation item for this role, matching the non-Fantasy behavior of auditor.

## Database

Add a migration that appends `public_relations` to `app.account_role_enum` if it is not already present.

The existing migration history remains intact. New environments that replay migrations should create the role through the new migration, and existing environments should apply the enum alteration safely.

## Error Handling

Unknown fallback credential roles should continue to normalize to `admin`, preserving current behavior for invalid configuration. Existing v1 and v2 admin session tokens should keep working.

Tokens with a `public_relations` role should verify only after the role is added to the v2 token validation allowlist.

## Testing

Run TypeScript typecheck and the Next build through the existing `npm run check` script.

Manual verification should cover:

- `public_relations` fallback credentials can log in.
- The role lands on `/admin/database`.
- The database dashboard shows athlete applications, event fighter intakes, and newsletter subscriptions only.
- Direct navigation to `/admin/fantasy` redirects away.
