import "server-only";

import { randomUUID } from "node:crypto";

import { type EventFighterIntakeSubmission } from "@/lib/contracts/event-fighter-intake";
import { queryDatabase, withDatabaseTransaction } from "@/lib/server/database";
import {
  deleteFighterPhotos,
  uploadFighterPhoto,
  uploadStagedFighterPhoto,
  type StoredFighterPhoto
} from "@/lib/server/fighter-photo-storage";
import {
  getServerEnv,
  isDatabaseConfigured,
  isFighterPhotoStorageConfigured,
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

type UpstreamUploadedPhotoReference = StoredFighterPhoto & {
  fieldName: EventFighterIntakeSubmission["photos"][number]["fieldName"];
  fileName: string;
};

export async function submitEventFighterIntake(
  submission: EventFighterIntakeSubmission,
  options: {
    authenticatedAccountId: string | null;
    requestContext: RequestAuditContext;
  },
  env: ServerEnv = getServerEnv()
): Promise<EventFighterIntakeSubmitResult> {
  if (
    isDatabaseConfigured(env) &&
    options.authenticatedAccountId &&
    isFighterPhotoStorageConfigured(env) &&
    env.appEncryptionKey
  ) {
    try {
      const portalTargetResult = await queryDatabase<{
        eventFighterId: string;
        eventSlug: string;
        fighterSlug: string;
        intakeId: string | null;
      }>(
        `
          select
            ef.id as "eventFighterId",
            e.slug as "eventSlug",
            f.slug as "fighterSlug",
            i.id as "intakeId"
          from app.event_fighters ef
          join app.events e
            on e.id = ef.event_id
          join app.fighters f
            on f.id = ef.fighter_id
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
          ? { rows: [] as Array<{ bucket: string; objectKey: string }> }
          : await queryDatabase<{ bucket: string; objectKey: string }>(
              `
                select
                  storage_bucket as bucket,
                  object_key as "objectKey"
                from app.event_fighter_intake_photos
                where intake_id = $1
              `,
              [portalTarget.intakeId]
            );

      const uploadedPhotos = await Promise.all(
        submission.photos.map(async (photo) => {
          const bytes = Buffer.from(await photo.file.arrayBuffer());

          const storedPhoto = await uploadFighterPhoto({
            bytes,
            contentType: photo.file.type || "application/octet-stream",
            eventSlug: portalTarget.eventSlug,
            fieldName: photo.fieldName,
            fileName: photo.file.name,
            fighterSlug: portalTarget.fighterSlug,
            env
          });

          return {
            fieldName: photo.fieldName,
            fileName: photo.file.name,
            storedPhoto
          };
        })
      );

      try {
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

            await transaction.query(
              "delete from app.event_fighter_intake_photos where intake_id = $1",
              [intakeId]
            );

            for (const uploadedPhoto of uploadedPhotos) {
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
                `,
                [
                  intakeId,
                  uploadedPhoto.fieldName,
                  uploadedPhoto.storedPhoto.storageProvider,
                  uploadedPhoto.storedPhoto.bucket,
                  uploadedPhoto.storedPhoto.objectKey,
                  uploadedPhoto.fileName,
                  uploadedPhoto.storedPhoto.contentType,
                  uploadedPhoto.storedPhoto.byteSize,
                  uploadedPhoto.storedPhoto.sha256Hex
                ]
              );
            }
          },
          {
            requiresEncryptionKey: true
          }
        );

        void deleteFighterPhotos(previousPhotosResult.rows, env);

        return { ok: true };
      } catch (error) {
        await deleteFighterPhotos(
          uploadedPhotos.map((photo) => ({
            bucket: photo.storedPhoto.bucket,
            objectKey: photo.storedPhoto.objectKey
          })),
          env
        );

        throw error;
      }
    } catch {
      if (!isUpstreamConfigured(env)) {
        return {
          ok: false,
          reason: "upstream_error"
        };
      }
    }
  }

  if (isUpstreamConfigured(env) && isFighterPhotoStorageConfigured(env)) {
    try {
      const uploadedPhotos: UpstreamUploadedPhotoReference[] = await Promise.all(
        submission.photos.map(async (photo) => {
          const bytes = Buffer.from(await photo.file.arrayBuffer());

          const storedPhoto = await uploadStagedFighterPhoto({
            bytes,
            contentType: photo.file.type || "application/octet-stream",
            fieldName: photo.fieldName,
            fileName: photo.file.name,
            requestId: options.requestContext.requestId,
            env
          });

          return {
            ...storedPhoto,
            fieldName: photo.fieldName,
            fileName: photo.file.name
          };
        })
      );

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), env.upstreamRequestTimeoutMs);

      try {
        const response = await fetch(
          `${env.upstreamApiBaseUrl}${env.eventFighterIntakeSubmitPath}`,
          {
            method: "POST",
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${env.upstreamApiBearerToken!}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              payload: submission.payload,
              photos: uploadedPhotos,
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
          }
        );

        const responsePayload =
          (await response.json().catch(() => null)) as { ok?: boolean; message?: string } | null;

        if (!response.ok || !responsePayload?.ok) {
          await deleteFighterPhotos(
            uploadedPhotos.map((photo) => ({
              bucket: photo.bucket,
              objectKey: photo.objectKey
            })),
            env
          );

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
        await deleteFighterPhotos(
          uploadedPhotos.map((photo) => ({
            bucket: photo.bucket,
            objectKey: photo.objectKey
          })),
          env
        );

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
    } catch {
      return {
        ok: false,
        reason: "upstream_error"
      };
    }
  }

  if (!isUpstreamConfigured(env) || !isFighterPhotoStorageConfigured(env)) {
    return {
      ok: false,
      reason: "not_configured"
    };
  }

  return {
    ok: false,
    reason: "not_configured",
    message: "As credenciais de upload do R2 ainda não foram configuradas para o portal."
  };
}
