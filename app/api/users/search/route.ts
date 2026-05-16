import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { getClient } from '@/lib/db'

export async function GET(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json([], { status: 401 })

  const q = req.nextUrl.searchParams.get('q')?.trim() || ''
  if (!q) return NextResponse.json([])

  const db = getClient()
  const { data } = await db.auth.admin.listUsers()
  const query = q.toLowerCase()

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
