import { env } from "~/env";

/**
 * Extract domain from URL
 */
function getDomainFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return '';
  }
}

/**
 * Get favicon URL for a given website URL
 * Uses Google's favicon service as a reliable fallback
 */
export function getFaviconUrl(url: string): string {
  const domain = getDomainFromUrl(url);
  if (!domain) {
    return '';
  }
  
  // Use Google's favicon service which handles most websites reliably
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
}

/**
 * Fetch favicon and return as data URL (for caching/offline use)
 * Falls back to URL if fetch fails
 */
export async function fetchFaviconAsDataUrl(url: string): Promise<string> {
  const faviconUrl = getFaviconUrl(url);
  if (!faviconUrl) {
    return '';
  }

  try {
    const response = await fetch(faviconUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; 411/1.0)',
      },
      // Short timeout since this is for UI enhancement
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) {
      return faviconUrl; // Fallback to URL
    }

    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const contentType = response.headers.get('content-type') || 'image/png';
    
    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    // Fallback to the URL if fetching fails
    return faviconUrl;
  }
}

/**
 * Add favicon URLs to search sources
 */
export function addFaviconsToSources<T extends { url: string }>(sources: T[]): (T & { favicon: string })[] {
  return sources.map(source => ({
    ...source,
    favicon: getFaviconUrl(source.url),
  }));
}