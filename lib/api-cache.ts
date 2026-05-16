import { NextResponse } from 'next/server'

/**
 * Wrap a data payload with proper private Cache-Control headers.
 * - `max-age`         : browser serves from cache without network
 * - `stale-while-revalidate` : browser serves stale while fetching fresh
 *
 * "private" ensures CDN never caches user-scoped data.
 */
export function cachedJson(data: unknown, maxAge = 20, swr = 40): NextResponse {
  return NextResponse.json(data, {
    headers: {
      'Cache-Control': `private, max-age=${maxAge}, stale-while-revalidate=${swr}`,
    },
  })
}
