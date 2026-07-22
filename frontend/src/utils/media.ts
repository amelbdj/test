/**
 * Resolve a displayable media URI for a Drop.
 *
 * Drops can be stored two ways:
 *  - `media_url`: a remote URL (ImageKit / local /api/media) — the primary path
 *  - `media_data`: a base64 payload (fallback when ImageKit is unavailable)
 *
 * Always prefer the URL, then fall back to base64. Returns `undefined` when
 * neither is available (e.g. an unrevealed drop).
 */
export const resolveMediaUri = (
  mediaUrl?: string | null,
  mediaData?: string | null,
): string | undefined => {
  if (mediaUrl) return mediaUrl;
  if (mediaData) {
    return mediaData.startsWith('data:')
      ? mediaData
      : `data:image/jpeg;base64,${mediaData}`;
  }
  return undefined;
};
