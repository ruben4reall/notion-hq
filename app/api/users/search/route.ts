import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { getClient } from '@/lib/db'

export async function GET(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json([], { status: 401 })

  const q = req.nextUrl.searchParams.get('q')?.trim() || ''
  if (q.length < 2) return NextResponse.json([])

  const db = getClient()
  const query = q.toLowerCase()

  // Search in presence table (faster than auth.admin.listUsers which fetches ALL users)
  // presence has display_name + username (email); fall back to auth list only if needed
  const { data: presenceRows } = await db
    .from('presence')
    .select('username, display_name')
    .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
    .limit(20)

  if (presenceRows && presenceRows.length > 0) {
    // Enrich with auth data (color, id) in one batch call filtered by emails
    const emails = presenceRows.map((r: { username: string }) => r.username)
    const { data } = await db.auth.admin.listUsers({ perPage: 1000 })
    const userMap = new Map((data?.users || []).map(u => [u.email?.toLowerCase(), u]))

    const results = presenceRows
      .map((r: { username: string; display_name: string | null }) => {
        const authUser = userMap.get(r.username.toLowerCase())
        if (!authUser || authUser.id === user.id) return null
        return {
          id: authUser.id,
          name: (r.display_name || authUser.user_metadata?.full_name as string || authUser.email || ''),
          email: authUser.email || '',
          color: (authUser.user_metadata?.color as string) || '#7c6af5',
        }
      })
      .filter(Boolean)
      .slice(0, 8)

    return NextResponse.json(results)
  }

  // Fallback: search auth users directly (for users who haven't set presence yet)
  const { data } = await db.auth.admin.listUsers({ perPage: 1000 })
  const results = (data?.users || [])
    .filter(u => u.id !== user.id)
    .filter(u => {
      const name = ((u.user_metadata?.full_name as string) || '').toLowerCase()
      const email = (u.email || '').toLowerCase()
      return name.includes(query) || email.includes(query)
    })
    .slice(0, 8)
    .map(u => ({
      id: u.id,
      name: (u.user_metadata?.full_name as string) || u.email || '',
      email: u.email || '',
      color: (u.user_metadata?.color as string) || '#7c6af5',
    }))

  return NextResponse.json(results)
}
