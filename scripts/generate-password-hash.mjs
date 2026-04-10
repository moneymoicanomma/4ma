import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const password = process.argv[2];

if (!password) {
  console.error("Usage: npm run hash-password -- \"your-password\"");
  process.exit(1);
}

const salt = randomBytes(16);
const derivedKey = await scrypt(password, salt, 64);

console.log(`scrypt$${salt.toString("base64url")}$${Buffer.from(derivedKey).toString("base64url")}`);
