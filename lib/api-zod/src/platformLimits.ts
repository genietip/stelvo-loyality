/**
 * Per-network caption length limits, shared by the API server (validation)
 * and the web app (live character counts). Keep this as the single source
 * of truth — do not duplicate these numbers elsewhere.
 */
export const PLATFORM_CAPTION_LIMITS: Record<string, number> = {
  instagram: 2200,
  facebook: 5000,
  x: 280,
  whatsapp: 1024,
};

export const DEFAULT_CAPTION_LIMIT = 2200;

export function captionLimitFor(platform: string | null | undefined): number {
  return (platform && PLATFORM_CAPTION_LIMITS[platform]) || DEFAULT_CAPTION_LIMIT;
}

/**
 * Returns a human-readable error when the caption exceeds the platform's
 * limit, or null when it fits.
 */
export function captionLengthError(
  caption: string,
  platform: string | null | undefined,
): string | null {
  const limit = captionLimitFor(platform);
  if (caption.length <= limit) return null;
  return `Caption is ${caption.length} characters, but ${platform || "this network"} allows at most ${limit}.`;
}
