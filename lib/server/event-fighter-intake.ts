import "server-only";

import { randomUUID } from "node:crypto";

import { type EventFighterIntakeSubmission } from "@/lib/contracts/event-fighter-intake";
import { queryDatabase, withDatabaseTransaction } from "@/lib/server/database";
import { deleteFighterPhotos } from "@/lib/server/fighter-photo-storage";
import {
  getServerEnv,
  isDatabaseConfigured,
  isUpstreamConfigured,
  type ServerEnv
} from "@/lib/server/env";
import type { RequestAuditContext } from "@/lib/server/request-context";

type EventFighterIntakeSubmitResult =
  | { ok: true }
  | {
      ok: false;
      reason: "not_configured" | "upstream_error";
      status?: number;
      message?: string;
    };

function getUploadedPhotoTargets(submission: EventFighterIntakeSubmission) {
  return submission.photos.map((photo) => ({
    bucket: photo.bucket,
    objectKey: photo.objectKey
  }));
}

async function persistEventFighterIntakeInDatabase(
  submission: EventFighterIntakeSubmission,
  options: {
    authenticatedAccountId: string;
    requestContext: RequestAuditContext;
  },
  env: ServerEnv
) {
  const portalTargetResult = await queryDatabase<{
    eventFighterId: string;
    intakeId: string | null;
  }>(
    `
      select
        ef.id as "eventFighterId",
        i.id as "intakeId"
      from app.event_fighters ef
      join app.events e
        on e.id = ef.event_id
      left join app.event_fighter_intakes i
        on i.event_fighter_id = ef.id
      where ef.portal_account_id = $1
        and e.status in ('draft', 'published', 'locked')
      order by
        case e.status
          when 'published' then 0
          when 'locked' then 1
          else 2
        end,
        e.starts_at asc,
        ef.created_at desc
      limit 1
    `,
    [options.authenticatedAccountId]
  );

  const portalTarget = portalTargetResult.rows[0];

  if (!portalTarget) {
    throw new Error("No active event fighter slot found for this account.");
  }

  const intakeId = portalTarget.intakeId ?? randomUUID();
  const previousPhotosResult =
    portalTarget.intakeId === null
      ? { rows: [] as Array<{ fieldName: string; bucket: string; objectKey: string }> }
      : await queryDatabase<{ fieldName: string; bucket: string; objectKey: string }>(
          `
            select
              field_name as "fieldName",
              storage_bucket as bucket,
              object_key as "objectKey"
            from app.event_fighter_intake_photos
            where intake_id = $1
          `,
          [portalTarget.intakeId]
        );

  await withDatabaseTransaction(
    {
      actorId: options.authenticatedAccountId,
      actorRole: "fighter",
      actorEmail: submission.payload.email,
      requestId: options.requestContext.requestId,
      clientIp: options.requestContext.clientIp,
      origin: options.requestContext.requestOrigin,
      userAgent: options.requestContext.userAgent
    },
    async (transaction) => {
      await transaction.query(
        `
          insert into app.event_fighter_intakes (
            id,
            event_fighter_id,
            submitted_by_account_id,
            full_name,
            nickname,
            email,
            phone_whatsapp,
            birth_date,
            cpf_ciphertext,
            cpf_digest,
            cpf_last4,
            pix_key_type,
            pix_key_ciphertext,
            pix_key_digest,
            pix_key_last4,
            has_health_insurance,
            health_insurance_provider,
            record_summary,
            primary_specialty,
            additional_specialties,
            competition_history,
            titles_won,
            life_story,
            funny_story,
            curiosities,
            hobbies,
            source,
            intake_status,
            request_id,
            request_origin,
            request_ip_hash,
            user_agent,
            metadata,
            submitted_at
          )
          values (
            $1::uuid,
            $2::uuid,
            $3::uuid,
            $4,
            $5,
            $6,
            $7,
            $8::date,
            app.encrypt_secret($9),
            app.secret_digest($10),
            app.last_four_digits($11),
            $12::app.pix_key_type_enum,
            app.encrypt_secret($13),
            app.secret_digest($14),
            app.last_four_digits($15),
            $16,
            $17,
            $18,
            $19,
            $20,
            $21,
            $22,
            $23,
            $24,
            $25,
            $26,
            $27,
            'submitted',
            $28,
            $29,
            $30,
            $31,
            $32::jsonb,
            now()
          )
          on conflict (event_fighter_id) do update
          set
            submitted_by_account_id = excluded.submitted_by_account_id,
            full_name = excluded.full_name,
            nickname = excluded.nickname,
            email = excluded.email,
            phone_whatsapp = excluded.phone_whatsapp,
            birth_date = excluded.birth_date,
            cpf_ciphertext = excluded.cpf_ciphertext,
            cpf_digest = excluded.cpf_digest,
            cpf_last4 = excluded.cpf_last4,
            pix_key_type = excluded.pix_key_type,
            pix_key_ciphertext = excluded.pix_key_ciphertext,
            pix_key_digest = excluded.pix_key_digest,
            pix_key_last4 = excluded.pix_key_last4,
            has_health_insurance = excluded.has_health_insurance,
            health_insurance_provider = excluded.health_insurance_provider,
            record_summary = excluded.record_summary,
            primary_specialty = excluded.primary_specialty,
            additional_specialties = excluded.additional_specialties,
            competition_history = excluded.competition_history,
            titles_won = excluded.titles_won,
            life_story = excluded.life_story,
            funny_story = excluded.funny_story,
            curiosities = excluded.curiosities,
            hobbies = excluded.hobbies,
            source = excluded.source,
            intake_status = 'submitted',
            reviewed_by_account_id = null,
            reviewed_at = null,
            staff_notes = null,
            request_id = excluded.request_id,
            request_origin = excluded.request_origin,
            request_ip_hash = excluded.request_ip_hash,
            user_agent = excluded.user_agent,
            metadata = app.event_fighter_intakes.metadata || excluded.metadata,
            submitted_at = excluded.submitted_at,
            updated_at = now()
        `,
        [
          intakeId,
          portalTarget.eventFighterId,
          options.authenticatedAccountId,
          submission.payload.fullName,
          submission.payload.nickname,
          submission.payload.email,
          submission.payload.phoneWhatsapp,
          submission.payload.birthDate,
          submission.payload.cpf,
          submission.payload.cpf.replace(/\D+/g, ""),
          submission.payload.cpf,
          submission.payload.pixKeyType,
          submission.payload.pixKey,
          submission.payload.pixKey,
          submission.payload.pixKey,
          submission.payload.hasHealthInsurance,
          submission.payload.hasHealthInsurance
            ? submission.payload.healthInsuranceProvider
            : null,
          submission.payload.record,
          submission.payload.primarySpecialty,
          submission.payload.additionalSpecialties,
          submission.payload.competitionHistory,
          submission.payload.titlesWon,
          submission.payload.lifeStory,
          submission.payload.funnyStory,
          submission.payload.curiosities,
          submission.payload.hobbies,
          submission.payload.source,
          options.requestContext.requestId,
          options.requestContext.requestOrigin,
          options.requestContext.requestIpHash,
          options.requestContext.userAgent,
          JSON.stringify({
            surface: "event-fighter-intake",
            accessEmail: submission.payload.accessEmail
          })
        ]
      );

      for (const photo of submission.photos) {
        await transaction.query(
          `
            insert into app.event_fighter_intake_photos (
              intake_id,
              field_name,
              storage_provider,
              storage_bucket,
              object_key,
              original_file_name,
              content_type,
              byte_size,
              sha256_hex
            )
            values (
              $1::uuid,
              $2::app.event_photo_field_enum,
              $3,
              $4,
              $5,
              $6,
              $7,
              $8,
              $9
            )
            on conflict (intake_id, field_name) do update
            set
              storage_provider = excluded.storage_provider,
              storage_bucket = excluded.storage_bucket,
              object_key = excluded.object_key,
              original_file_name = excluded.original_file_name,
              content_type = excluded.content_type,
              byte_size = excluded.byte_size,
              sha256_hex = excluded.sha256_hex,
              updated_at = now()
          `,
          [
            intakeId,
            photo.fieldName,
            photo.storageProvider,
            photo.bucket,
            photo.objectKey,
            photo.fileName,
            photo.contentType,
            photo.byteSize,
            photo.sha256Hex
          ]
        );
      }
    },
    {
      requiresEncryptionKey: true
    }
  );

  const replacedPhotos = previousPhotosResult.rows.filter((previousPhoto) => {
    const nextPhoto = submission.photos.find((photo) => photo.fieldName === previousPhoto.fieldName);

    if (!nextPhoto) {
      return false;
    }

    return (
      nextPhoto.bucket !== previousPhoto.bucket || nextPhoto.objectKey !== previousPhoto.objectKey
    );
  });

  void deleteFighterPhotos(replacedPhotos, env);
}

export async function submitEventFighterIntake(
  submission: EventFighterIntakeSubmission,
  options: {
    authenticatedAccountId: string | null;
    requestContext: RequestAuditContext;
  },
  env: ServerEnv = getServerEnv()
): Promise<EventFighterIntakeSubmitResult> {
  const uploadedPhotoTargets = getUploadedPhotoTargets(submission);

  if (isDatabaseConfigured(env) && options.authenticatedAccountId && env.appEncryptionKey) {
    try {
      await persistEventFighterIntakeInDatabase(
        submission,
        {
          authenticatedAccountId: options.authenticatedAccountId,
          requestContext: options.requestContext
        },
        env
      );

      return { ok: true };
    } catch {
      if (!isUpstreamConfigured(env)) {
        await deleteFighterPhotos(uploadedPhotoTargets, env);

        return {
          ok: false,
          reason: "upstream_error"
        };
      }
    }
  }

  if (isUpstreamConfigured(env)) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), env.upstreamRequestTimeoutMs);

    try {
      const response = await fetch(`${env.upstreamApiBaseUrl}${env.eventFighterIntakeSubmitPath}`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${env.upstreamApiBearerToken!}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          payload: submission.payload,
          photos: submission.photos,
          requestContext: {
            requestId: options.requestContext.requestId,
            requestOrigin: options.requestContext.requestOrigin,
            requestIpHash: options.requestContext.requestIpHash,
            clientIp: options.requestContext.clientIp,
            userAgent: options.requestContext.userAgent
          }
        }),
        cache: "no-store",
        signal: controller.signal
      });

      const responsePayload =
        (await response.json().catch(() => null)) as { ok?: boolean; message?: string } | null;

      if (!response.ok || !responsePayload?.ok) {
        await deleteFighterPhotos(uploadedPhotoTargets, env);

        return {
          ok: false,
          reason: "upstream_error",
          status: response.status || 502,
          message:
            responsePayload?.message ??
            "Serviço temporariamente indisponível. Tenta novamente daqui a pouco."
        };
      }

      return { ok: true };
    } catch (error) {
      await deleteFighterPhotos(uploadedPhotoTargets, env);

      return {
        ok: false,
        reason: "upstream_error",
        status: error instanceof Error && error.name === "AbortError" ? 504 : 502,
        message:
          error instanceof Error && error.name === "AbortError"
            ? "O envio demorou demais para responder. Tenta novamente em alguns segundos."
            : "Serviço temporariamente indisponível. Tenta novamente daqui a pouco."
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return {
    ok: false,
    reason: "not_configured"
  };
}
