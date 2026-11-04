import argon2 from 'argon2';

// OWASP-recommended argon2id parameters (m=19 MiB, t=2, p=1).
const options = { type: argon2.argon2id, memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;

export const hashPassword = (plain: string) => argon2.hash(plain, options);

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
}

let dummyHash: Promise<string> | null = null;
/** Spend the same time as a real check so unknown accounts are not distinguishable by timing. */
export async function burnPasswordCheck(plain: string): Promise<void> {
  dummyHash ??= hashPassword('dummy-password-for-timing-0');
  await verifyPassword(await dummyHash, plain);
}
