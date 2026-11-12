import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

// OWASP scrypt baseline: N=2^17, r=8, p=1; ~128 MiB per operation.
const options = { N: 131072, r: 8, p: 1, maxmem: 160 * 1024 * 1024 };
let active = 0;
export class AuthError extends Error {}

async function derive(password: string, salt: string): Promise<Buffer> {
  if (active >= 2) throw new AuthError("Muitas tentativas. Aguarde e tente novamente.");
  active++;
  try {
    return await new Promise<Buffer>((resolve, reject) => {
      scrypt(password, salt, 64, options, (error, key) => (error ? reject(error) : resolve(key)));
    });
  } finally {
    active--;
  }
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt$131072$8$1$${salt}$${(await derive(password, salt)).toString("hex")}`;
}

export async function verifyPassword(password: string, stored?: string) {
  // Missing accounts also perform the expensive derivation.
  const fallback = `scrypt$131072$8$1$${"0".repeat(32)}$${"0".repeat(128)}`;
  const value = stored ?? fallback;
  if (!/^scrypt\$131072\$8\$1\$[a-f0-9]{32}\$[a-f0-9]{128}$/.test(value)) return false;
  const parts = value.split("$");
  const key = await derive(password, parts[4]!);
  return timingSafeEqual(key, Buffer.from(parts[5]!, "hex")) && stored !== undefined;
}
