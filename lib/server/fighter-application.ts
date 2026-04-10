import "server-only";

import type { FighterApplicationPayload } from "@/lib/contracts/fighter-application";
import { withDatabaseTransaction } from "@/lib/server/database";
import {
  getServerEnv,
  isDatabaseConfigured,
  isUpstreamConfigured,
  type ServerEnv
} from "@/lib/server/env";
import { postJsonToUpstream } from "@/lib/server/http";
import type { RequestAuditContext } from "@/lib/server/request-context";

type FighterApplicationSubmitResult =
  | { ok: true }
  | {
      ok: false;
      reason: "not_configured" | "upstream_error";
    };

export async function submitFighterApplication(
  payload: FighterApplicationPayload,
  requestContext: RequestAuditContext,
  env: ServerEnv = getServerEnv()
): Promise<FighterApplicationSubmitResult> {
  if (isDatabaseConfigured(env)) {
    try {
      await withDatabaseTransaction(
        {
          actorRole: "public",
          requestId: requestContext.requestId,
          clientIp: requestContext.clientIp,
          origin: requestContext.requestOrigin,
          userAgent: requestContext.userAgent
        },
        async (transaction) => {
          const fighterApplicationResult = await transaction.query<{ id: string }>(
            `
              insert into app.fighter_applications (
                full_name,
                nickname,
                birth_date,
                city,
                team,
                weight_class,
                tapology_profile,
                instagram_profile,
                specialty,
                specialty_other,
                competition_history,
                martial_arts_titles,
                curiosities,
                roast_consent,
                source,
                request_id,
                request_origin,
                request_ip_hash,
                user_agent,
                metadata
              )
              values (
                $1,
                $2,
                $3::date,
                $4,
                $5,
                $6::app.fighter_weight_class_enum,
                $7,
                $8,
                $9::app.fighter_specialty_enum,
                $10,
                $11,
                $12,
                $13,
                $14,
                $15,
                $16,
                $17,
                $18,
                $19,
                $20::jsonb
              )
              returning id
            `,
            [
              payload.fullName,
              payload.nickname,
              payload.birthDate,
              payload.city,
              payload.team,
              payload.weightClass,
              payload.tapology,
              payload.instagram,
              payload.specialty,
              payload.specialtyOther || null,
              payload.competitionHistory,
              payload.martialArtsTitles,
              payload.curiosities,
              payload.roastConsent,
              payload.source,
              requestContext.requestId,
              requestContext.requestOrigin,
              requestContext.requestIpHash,
              requestContext.userAgent,
              JSON.stringify({
                surface: "fighter-application"
              })
            ]
          );

          const fighterApplicationId = fighterApplicationResult.rows[0]!.id;

          await transaction.query(
            `
              insert into app.fighter_application_contacts (
                fighter_application_id,
                contact_role,
                contact_name,
                phone_whatsapp,
                metadata
              )
              values
                ($1, $2::app.fighter_application_contact_role_enum, $3, $4, $5::jsonb),
                ($1, $6::app.fighter_application_contact_role_enum, $7, $8, $9::jsonb)
            `,
            [
              fighterApplicationId,
              "athlete",
              null,
              payload.phoneWhatsapp,
              JSON.stringify({
                surface: "fighter-application",
                sourceField: "phoneWhatsapp"
              }),
              "booking_contact",
              payload.bookingContactName,
              payload.bookingContactPhoneWhatsapp,
              JSON.stringify({
                surface: "fighter-application",
                sourceField: "bookingContact"
              })
            ]
          );
        }
      );

      return { ok: true };
    } catch {
      if (!isUpstreamConfigured(env)) {
        return {
          ok: false,
          reason: "upstream_error"
        };
      }
    }
  }

  if (!isUpstreamConfigured(env)) {
    return {
      ok: false,
      reason: "not_configured"
    };
  }

  try {
    await postJsonToUpstream(
      `${env.upstreamApiBaseUrl}${env.fighterApplicationSubmitPath}`,
      payload,
      {
        bearerToken: env.upstreamApiBearerToken!,
        timeoutMs: env.upstreamRequestTimeoutMs
      }
    );

    return { ok: true };
  } catch {
    return {
      ok: false,
      reason: "upstream_error"
    };
  }
}
