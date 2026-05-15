import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { getClient } from '@/lib/db'

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.name) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const name = session.user.name
  // Use local date to avoid UTC day-boundary issues for european users
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const yesterday = new Date(now.getTime() - 86400000)
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`

  const { data } = await getClient()
    .from('presence')
    .select('current_streak, longest_streak, last_streak_date')
    .eq('username', name)
    .maybeSingle()

  // Already counted today → no change
  if (data?.last_streak_date === today) {
    return NextResponse.json({ streak: data.current_streak, longest: data.longest_streak, isNew: false })
  }

  const newStreak = data?.last_streak_date === yesterdayStr ? (data.current_streak || 0) + 1 : 1
  const newLongest = Math.max(newStreak, data?.longest_streak || 0)

  await getClient()
    .from('presence')
    .upsert({
      username: name,
      last_seen: new Date().toISOString(),
      current_streak: newStreak,
      longest_streak: newLongest,
      last_streak_date: today,
    }, { onConflict: 'username' })

  return NextResponse.json({ streak: newStreak, longest: newLongest, isNew: true })
}
