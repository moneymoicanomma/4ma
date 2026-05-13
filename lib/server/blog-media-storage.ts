import "server-only";

import { randomUUID } from "node:crypto";
import path from "node:path";

import { HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import {
  getServerEnv,
  isBlogImageStorageConfigured,
  type ServerEnv
} from "@/lib/server/env";

export type BlogMediaUploadTarget = {
  uploadUrl: string;
  bucket: string;
  objectKey: string;
  contentType: string;
  byteSize: number;
  storageProvider: string;
  publicUrl: string | null;
};

export type BlogMediaUploadVerificationTarget = {
  bucket: string;
  objectKey: string;
  contentType: string;
  byteSize: number;
  storageProvider: string;
};

declare global {
  // eslint-disable-next-line no-var
  var __mmmmaBlogMediaS3Client: S3Client | undefined;
}

function getS3Client(env: ServerEnv) {
  if (!globalThis.__mmmmaBlogMediaS3Client) {
    globalThis.__mmmmaBlogMediaS3Client = new S3Client({
      region: env.blogImagesStorageRegion,
      endpoint: env.blogImagesStorageEndpoint ?? undefined,
      forcePathStyle: env.blogImagesStorageForcePathStyle,
      credentials: {
        accessKeyId: env.blogImagesStorageAccessKeyId!,
        secretAccessKey: env.blogImagesStorageSecretAccessKey!
      }
    });
  }

  return globalThis.__mmmmaBlogMediaS3Client;
}

function resolvePublicUrl(objectKey: string, env: ServerEnv) {
  return env.blogImagesPublicBaseUrl ? `${env.blogImagesPublicBaseUrl}/${objectKey}` : null;
}

function resolveBlogObjectKey(fileName: string, scope: string) {
  const extension = path.extname(fileName).toLowerCase() || ".bin";
  const safeScope = scope.replace(/[^a-z0-9_-]+/gi, "-").slice(0, 80) || "draft";

  return `blog/${safeScope}/${randomUUID()}${extension}`;
}

export async function createBlogMediaUploadTarget(options: {
  byteSize: number;
  contentType: string;
  fileName: string;
  scope: string;
  env?: ServerEnv;
}): Promise<BlogMediaUploadTarget> {
  const env = options.env ?? getServerEnv();

  if (!isBlogImageStorageConfigured(env)) {
    throw new Error("Blog media storage is not configured.");
  }

  const bucket = env.blogImagesStorageBucket!;
  const objectKey = resolveBlogObjectKey(options.fileName, options.scope);
  const publicUrl = resolvePublicUrl(objectKey, env);

  if (!publicUrl) {
    throw new Error("Blog media public URL is not configured.");
  }

  const uploadUrl = await getSignedUrl(
    getS3Client(env),
    new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      ContentType: options.contentType,
      ContentLength: options.byteSize
    }),
    { expiresIn: 10 * 60 }
  );

  return {
    uploadUrl,
    bucket,
    objectKey,
    contentType: options.contentType,
    byteSize: options.byteSize,
    storageProvider: env.blogImagesStorageProvider,
    publicUrl
  };
}

export async function verifyBlogMediaUpload(options: BlogMediaUploadVerificationTarget & {
  env?: ServerEnv;
}) {
  const env = options.env ?? getServerEnv();

  if (!isBlogImageStorageConfigured(env)) {
    throw new Error("Blog media storage is not configured.");
  }

  if (
    options.bucket !== env.blogImagesStorageBucket ||
    options.storageProvider !== env.blogImagesStorageProvider ||
    !options.objectKey.startsWith("blog/")
  ) {
    return false;
  }

  try {
    const result = await getS3Client(env).send(
      new HeadObjectCommand({
        Bucket: options.bucket,
        Key: options.objectKey
      })
    );
    const contentLength = result.ContentLength ?? null;
    const contentType = result.ContentType?.split(";")[0]?.trim().toLowerCase() ?? "";

    return contentLength === options.byteSize && contentType === options.contentType.toLowerCase();
  } catch {
    return false;
  }
}
