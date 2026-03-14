import { createHmac, createHash } from "crypto";

export const LIQUID_BASE_URL = "https://api-public.liquidmax.xyz";

function generateNonce(length = 16): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

/**
 * Build HMAC-signed headers for authenticated Liquid API requests.
 * Signing payload (each field on its own line):
 *   {timestamp_ms}
 *   {nonce}
 *   {METHOD}
 *   {canonical_path}
 *   {canonical_query}
 *   {body_hash}
 */
export function getAuthHeaders(
  method: string,
  path: string,
  query: string,
  body: string,
  apiKey: string,
  apiSecret: string
): Record<string, string> {
  const timestamp = Date.now().toString();
  const nonce = generateNonce(16);
  const bodyHash = createHash("sha256").update(body).digest("hex");
  // canonical_path must be lowercased per Liquid signing spec
  const payload = [timestamp, nonce, method.toUpperCase(), path.toLowerCase(), query, bodyHash].join("\n");
  const signature = createHmac("sha256", apiSecret).update(payload).digest("hex");

  return {
    "X-Liquid-Key": apiKey,
    "X-Liquid-Timestamp": timestamp,
    "X-Liquid-Nonce": nonce,
    "X-Liquid-Signature": signature,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

/** Unwrap Liquid's { success, data } envelope. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function unwrap(json: any): any {
  return json?.data ?? json;
}
