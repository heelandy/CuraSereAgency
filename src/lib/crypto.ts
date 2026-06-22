import crypto from "node:crypto";
import { config } from "./config";

// AES-256-GCM field encryption for secrets + select PHI at rest (Phase 22).
// Key comes from ENCRYPTION_KEY (base64-32 or passphrase); falls back to a key
// derived from NEXTAUTH_SECRET so dev works without extra config. Rotate by
// setting ENCRYPTION_KEY in production.
const PREFIX = "enc:v1:";

function key(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (raw && raw.trim()) {
    if (/^[A-Za-z0-9+/]{43}=$/.test(raw.trim())) return Buffer.from(raw.trim(), "base64").subarray(0, 32);
    return crypto.createHash("sha256").update(raw.trim()).digest();
  }
  return crypto.createHash("sha256").update(`cura_sera:${config.nextAuthSecret}`).digest();
}

export function encryptField(plain: string | null | undefined): string | null {
  if (plain == null || plain === "") return plain ?? null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([cipher.update(String(plain), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, ct]).toString("base64");
}

export function decryptField(value: string | null | undefined): string | null {
  if (value == null) return null;
  if (!value.startsWith(PREFIX)) return value; // legacy/plaintext passthrough
  try {
    const raw = Buffer.from(value.slice(PREFIX.length), "base64");
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const ct = raw.subarray(28);
    const decipher = crypto.createDecipheriv("aes-256-gcm", key(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
