import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { getClient } from '@/lib/db'

export async function GET(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({}, { status: 401 })

  const days = parseInt(req.nextUrl.searchParams.get('days') || '7')
  const since = new Date(Date.now() - days * 86400000).toISOString()

  try {
    const { data, error } = await getClient()
      .from('time_sessions')
      .select('utilisateur, duree, categorie, debut')
      .gte('debut', since)
      .not('fin', 'is', null)
      .order('debut', { ascending: false })

    if (error) throw error

    const byUser: Record<string, { totalMinutes: number; sessions: number; byCategory: Record<string, number> }> = {}
    for (const row of data || []) {
      if (!row.utilisateur) continue
      if (!byUser[row.utilisateur]) byUser[row.utilisateur] = { totalMinutes: 0, sessions: 0, byCategory: {} }
      const min = row.duree || 0
      byUser[row.utilisateur].totalMinutes += min
      byUser[row.utilisateur].sessions += 1
      byUser[row.utilisateur].byCategory[row.categorie] = (byUser[row.utilisateur].byCategory[row.categorie] || 0) + min
    }

    const leaderboard = Object.entries(byUser)
      .map(([utilisateur, stats]) => ({
        utilisateur,
        totalMinutes: stats.totalMinutes,
        sessions: stats.sessions,
        byCategory: stats.byCategory,
        avgSession: stats.sessions > 0 ? Math.round(stats.totalMinutes / stats.sessions) : 0,
      }))
      .sort((a, b) => b.totalMinutes - a.totalMinutes)

    return NextResponse.json(leaderboard)
  } catch (err) {
    console.error(err)
    return NextResponse.json([])
  }
}
