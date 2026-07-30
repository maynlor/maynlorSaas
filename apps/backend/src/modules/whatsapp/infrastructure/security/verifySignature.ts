import { createHmac, timingSafeEqual } from "node:crypto";

export function computeMetaSignature(appSecret: string, rawBody: Buffer): string {
  return `sha256=${createHmac("sha256", appSecret).update(rawBody).digest("hex")}`;
}

export function isValidMetaSignature(
  appSecret: string,
  rawBody: Buffer,
  signatureHeader: string,
): boolean {
  const expected = Buffer.from(computeMetaSignature(appSecret, rawBody));
  const actual = Buffer.from(signatureHeader);

  if (expected.length !== actual.length) {
    return false;
  }
  return timingSafeEqual(expected, actual);
}
