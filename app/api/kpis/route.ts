import { NextRequest, NextResponse } from 'next/server'
import { getUser, getOrgId } from '@/lib/auth'
import { getTasks, getCRM, getIdeas } from '@/lib/db'

export async function GET(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const orgId = getOrgId(req)
  if (!orgId) return NextResponse.json({ error: 'No project' }, { status: 400 })
  try {
    const [tasks, crm, ideas] = await Promise.all([getTasks(orgId), getCRM(orgId), getIdeas(orgId)])

    const now = Date.now()
    const h24 = 24 * 60 * 60 * 1000
    const h48 = 48 * 60 * 60 * 1000
    const h168 = 7 * 24 * 60 * 60 * 1000

    const tasksLast24h = tasks.filter(t => now - new Date(t.createdAt).getTime() < h24).length
    const tasksPrev24h = tasks.filter(t => { const age = now - new Date(t.createdAt).getTime(); return age >= h24 && age < h48 }).length
    const tasksDelta = tasksPrev24h === 0 ? (tasksLast24h > 0 ? 100 : 0) : Math.round(((tasksLast24h - tasksPrev24h) / tasksPrev24h) * 100)
    const doneTasks = tasks.filter(t => t.status === 'Done').length
    const todayStr = new Date().toISOString().slice(0, 10)

    return NextResponse.json({
      tasksInProgress: tasks.filter(t => t.status === 'En cours').length,
      activeProspects: crm.filter(c => ['Contacté', 'RDV pris', 'Offre envoyée'].includes(c.status)).length,
      signedClients: crm.filter(c => c.status === 'Client').length,
      validatedIdeas: ideas.filter(i => i.status === 'Validée').length,
      totalTasks: tasks.length,
      totalCRM: crm.length,
      totalIdeas: ideas.length,
      tasksByStatus: { Backlog: tasks.filter(t => t.status === 'Backlog').length, 'À faire': tasks.filter(t => t.status === 'À faire').length, 'En cours': tasks.filter(t => t.status === 'En cours').length, Review: tasks.filter(t => t.status === 'Review').length, Done: doneTasks },
      recentTasks: tasks.slice(0, 6),
      urgentTasks: tasks.filter(t => t.status !== 'Done' && t.dateEnd && t.dateEnd <= todayStr).sort((a, b) => a.dateEnd > b.dateEnd ? 1 : -1).slice(0, 10),
      overdueCount: tasks.filter(t => t.status !== 'Done' && t.dateEnd && t.dateEnd < todayStr).length,
      topIdeas: ideas.slice(0, 5),
      tasksLast24h,
      tasksPrev24h,
      tasksDelta,
      completedLast24h: tasks.filter(t => t.status === 'Done' && now - new Date(t.lastEdited).getTime() < h24).length,
      completionRate: tasks.length > 0 ? Math.round((doneTasks / tasks.length) * 100) : 0,
      crmConversionRate: crm.filter(c => c.status !== 'Refus').length > 0 ? Math.round((crm.filter(c => c.status === 'Client').length / crm.filter(c => c.status !== 'Refus').length) * 100) : 0,
      taskVelocity: Math.round((tasks.filter(t => t.status === 'Done' && now - new Date(t.lastEdited).getTime() < h168).length / 7) * 10) / 10,
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
