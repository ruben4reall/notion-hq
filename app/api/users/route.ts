import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function getAdminClient() {
  return createAdminClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function GET(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json([], { status: 401 })

  try {
    const { data, error } = await getAdminClient().auth.admin.listUsers()
    if (error) throw error

    const users = (data.users || []).map(u => ({
      name: (u.user_metadata?.full_name as string) || u.email || '',
      color: (u.user_metadata?.color as string) || '#7c6af5',
    })).filter(u => u.name)

    return NextResponse.json(users)
  } catch {
    return NextResponse.json([])
  }
}
