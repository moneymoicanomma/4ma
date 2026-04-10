import "server-only";

import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const PASSWORD_HASH_PREFIX = "scrypt";
const PASSWORD_SALT_BYTES = 16;
const PASSWORD_KEY_BYTES = 64;

function toBase64Url(buffer: Buffer) {
  return buffer.toString("base64url");
}

function fromBase64Url(value: string) {
  return Buffer.from(value, "base64url");
}

export async function createPasswordHash(password: string) {
  const salt = randomBytes(PASSWORD_SALT_BYTES);
  const derivedKey = (await scrypt(password, salt, PASSWORD_KEY_BYTES)) as Buffer;

  return `${PASSWORD_HASH_PREFIX}$${toBase64Url(salt)}$${toBase64Url(derivedKey)}`;
}

export async function verifyPasswordHash(password: string, passwordHash: string | null) {
  if (!passwordHash) {
    return false;
  }

  const [prefix, saltValue, keyValue] = passwordHash.split("$");

  if (prefix !== PASSWORD_HASH_PREFIX || !saltValue || !keyValue) {
    return false;
  }

  const salt = fromBase64Url(saltValue);
  const storedKey = fromBase64Url(keyValue);
  const derivedKey = (await scrypt(password, salt, storedKey.length)) as Buffer;

  return timingSafeEqual(storedKey, derivedKey);
}
