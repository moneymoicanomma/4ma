import "server-only";

import { createHash, randomUUID } from "node:crypto";
import path from "node:path";

import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";

import {
  getServerEnv,
  isFighterPhotoStorageConfigured,
  type ServerEnv
} from "@/lib/server/env";

export type StoredFighterPhoto = {
  bucket: string;
  objectKey: string;
  sha256Hex: string;
  byteSize: number;
  contentType: string;
  storageProvider: string;
};

declare global {
  // eslint-disable-next-line no-var
  var __mmmmaFighterPhotoS3Client: S3Client | undefined;
}

function getS3Client(env: ServerEnv) {
  if (!globalThis.__mmmmaFighterPhotoS3Client) {
    globalThis.__mmmmaFighterPhotoS3Client = new S3Client({
      region: env.fighterPhotosStorageRegion,
      endpoint: env.fighterPhotosStorageEndpoint ?? undefined,
      forcePathStyle: env.fighterPhotosStorageForcePathStyle,
      credentials: {
        accessKeyId: env.fighterPhotosStorageAccessKeyId!,
        secretAccessKey: env.fighterPhotosStorageSecretAccessKey!
      }
    });
  }

  return globalThis.__mmmmaFighterPhotoS3Client;
}

function sha256Hex(buffer: Buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function resolveObjectKey(
  fileName: string,
  eventSlug: string,
  fighterSlug: string,
  fieldName: string
) {
  const extension = path.extname(fileName).toLowerCase();
  const normalizedExtension = extension || ".bin";

  return `event-fighter-intakes/${eventSlug}/${fighterSlug}/${fieldName}-${randomUUID()}${normalizedExtension}`;
}

export async function uploadFighterPhoto(options: {
  bytes: Buffer;
  contentType: string;
  eventSlug: string;
  fieldName: string;
  fileName: string;
  fighterSlug: string;
  env?: ServerEnv;
}): Promise<StoredFighterPhoto> {
  const env = options.env ?? getServerEnv();

  if (!isFighterPhotoStorageConfigured(env)) {
    throw new Error("Fighter photo storage is not configured.");
  }

  const bucket = env.fighterPhotosStorageBucket!;
  const objectKey = resolveObjectKey(
    options.fileName,
    options.eventSlug,
    options.fighterSlug,
    options.fieldName
  );

  await getS3Client(env).send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      Body: options.bytes,
      ContentType: options.contentType
    })
  );

  return {
    bucket,
    objectKey,
    sha256Hex: sha256Hex(options.bytes),
    byteSize: options.bytes.byteLength,
    contentType: options.contentType,
    storageProvider: env.fighterPhotosStorageProvider
  };
}

export async function deleteFighterPhotos(
  photos: Array<Pick<StoredFighterPhoto, "bucket" | "objectKey">>,
  env: ServerEnv = getServerEnv()
) {
  if (!photos.length || !isFighterPhotoStorageConfigured(env)) {
    return;
  }

  const client = getS3Client(env);

  await Promise.allSettled(
    photos.map((photo) =>
      client.send(
        new DeleteObjectCommand({
          Bucket: photo.bucket,
          Key: photo.objectKey
        })
      )
    )
  );
}
