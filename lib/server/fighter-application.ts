import "server-only";

import { getBrazilianStateCode } from "@/lib/contracts/brazilian-states";
import type { FighterApplicationPayload } from "@/lib/contracts/fighter-application";
import { withDatabaseTransaction } from "@/lib/server/database";
import {
  getPublicWriteUpstreamBearerToken,
  getServerEnv,
  isDatabaseConfigured,
  isPublicUpstreamConfigured,
  type ServerEnv
} from "@/lib/server/env";
import { UpstreamApiError, postJsonToUpstream } from "@/lib/server/http";
import type { RequestAuditContext } from "@/lib/server/request-context";

type FighterApplicationSubmitResult =
  | { ok: true }
  | {
      ok: false;
      reason: "not_configured" | "upstream_error";
      status?: number;
      message?: string;
    };

export async function submitFighterApplication(
  payload: FighterApplicationPayload,
  requestContext: RequestAuditContext,
  env: ServerEnv = getServerEnv()
): Promise<FighterApplicationSubmitResult> {
  const stateCode = payload.state ? getBrazilianStateCode(payload.state) : null;

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
                state_code,
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
                $5::char(2),
                $6,
                $7::app.fighter_weight_class_enum,
                $8,
                $9,
                $10::app.fighter_specialty_enum,
                $11,
                $12,
                $13,
                $14,
                $15,
                $16,
                $17,
                $18,
                $19,
                $20,
                $21::jsonb
              )
              returning id
            `,
            [
              payload.fullName || null,
              payload.nickname || null,
              payload.birthDate || null,
              payload.city || null,
              stateCode,
              payload.team || null,
              payload.weightClass,
              payload.tapology || null,
              payload.instagram || null,
              payload.specialty,
              payload.specialtyOther || null,
              payload.competitionHistory || null,
              payload.martialArtsTitles || null,
              payload.curiosities || null,
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
          const contacts: Array<{
            role: "athlete" | "booking_contact";
            name: string | null;
            phone: string | null;
            metadata: string;
          }> = [];

          if (payload.phoneWhatsapp) {
            contacts.push({
              role: "athlete",
              name: null,
              phone: payload.phoneWhatsapp,
              metadata: JSON.stringify({
                surface: "fighter-application",
                sourceField: "phoneWhatsapp"
              })
            });
          }

          if (payload.bookingContactName || payload.bookingContactPhoneWhatsapp) {
            contacts.push({
              role: "booking_contact",
              name: payload.bookingContactName || null,
              phone: payload.bookingContactPhoneWhatsapp || null,
              metadata: JSON.stringify({
                surface: "fighter-application",
                sourceField: "bookingContact"
              })
            });
          }

          if (contacts.length > 0) {
            const values: Array<string | null> = [fighterApplicationId];
            const rows = contacts.map((contact, index) => {
              const offset = 2 + index * 4;

              values.push(contact.role, contact.name, contact.phone, contact.metadata);

              return `($1, $${offset}::app.fighter_application_contact_role_enum, $${offset + 1}, $${offset + 2}, $${offset + 3}::jsonb)`;
            });

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
                  ${rows.join(",\n                  ")}
              `,
              values
            );
          }
        }
      );

      return { ok: true };
    } catch {
      if (!isPublicUpstreamConfigured(env)) {
        return {
          ok: false,
          reason: "upstream_error"
        };
      }
    }
  }

  if (!isPublicUpstreamConfigured(env)) {
    return {
      ok: false,
      reason: "not_configured"
    };
  }

  try {
    const response = await postJsonToUpstream(
      `${env.upstreamApiBaseUrl}${env.fighterApplicationSubmitPath}`,
      {
        payload,
        requestContext
      },
      {
        bearerToken: getPublicWriteUpstreamBearerToken(env)!,
        timeoutMs: env.upstreamRequestTimeoutMs
      }
    );

    const responsePayload =
      (await response.json().catch(() => null)) as { ok?: boolean; message?: string } | null;

    if (!responsePayload?.ok) {
      return {
        ok: false,
        reason: "upstream_error",
        status: 502,
        message:
          responsePayload?.message ??
          "Serviço temporariamente indisponível. Tenta novamente daqui a pouco."
      };
    }

    return { ok: true };
  } catch (error) {
    const status = error instanceof UpstreamApiError ? error.status : 502;

    return {
      ok: false,
      reason: "upstream_error",
      status,
      message:
        status === 404
          ? "A API da AWS ainda não está com a rota /v1/fighter-applications publicada."
          : "Serviço temporariamente indisponível. Tenta novamente daqui a pouco."
    };
  }
}
